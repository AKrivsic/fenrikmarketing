export type TopicWorld =
  | "hvac_field"
  | "professional_return"
  | "dental"
  | "restaurant"
  | "web_service";

export interface TopicConcreteSignals {
  world: TopicWorld;
  /** Concrete industry / practice label used in scenes. */
  industryCue: string;
  stressCue: string;
  customerCue: string;
  consequenceCue: string;
  /** Primary filmable setting for this topic. */
  settingCue: string;
  /** Words/phrases scenes should preserve (topic grounding). */
  topicAnchors: string[];
  /** Props/settings that belong to other industries — reject if present. */
  forbiddenProps: string[];
  rawTokens: string[];
  productHint: string;
}

const HVAC_FORBIDDEN_FOR_OTHERS = [
  "heatwave",
  "blazing heat",
  "technician",
  "hvac",
  "service van",
  "truck hood",
  "thermostat",
  "ac blasting",
  "cooling service",
  "hail damage",
  "bay door",
  "fleet",
  "tool belt",
  "on a truck",
  "roof in heat",
];

const FIELD_SERVICE_PROPS = [
  "van",
  "technician",
  "truck",
  "driveway",
  "bay door",
  "fleet",
  "roof",
  "dispatch desk",
  "job folders",
];

/** Extract concrete topic signals so concepts cannot collapse to generic busy-business. */
export function extractTopicConcreteSignals(
  topic: string,
  angle: string | null | undefined,
  opts?: { productIs?: readonly string[] },
): TopicConcreteSignals {
  const blob = `${topic} ${angle ?? ""}`;
  const lower = blob.toLowerCase();
  const rawTokens: string[] = [];
  const productHint =
    (opts?.productIs ?? []).find((x) => x.trim())?.trim() ||
    "AI website chatbot";

  const push = (t: string) => {
    if (t && !rawTokens.includes(t)) rawTokens.push(t);
  };

  // --- World detection (order matters: specific before generic website) ---
  const isHvac =
    /\bhvac\b|air\s*condition|cooling|heatwave|heat\s*wave|furnace|technician/i.test(
      blob,
    );
  const isDental = /\bdentist|dental|clinic|patient/i.test(blob);
  const isRestaurant = /\brestaurant|kitchen|chef|dining/i.test(blob);
  const isProfessionalReturn =
    /\baccountant|accounting|bookkeep|cpa\b|vacation|holiday|out of office|pto\b|came back|returned from/i.test(
      blob,
    ) ||
    (/\bmissed leads?\b/i.test(blob) &&
      /\b(vacation|away|offline|contact details|contact form)\b/i.test(blob));

  let world: TopicWorld;
  if (isHvac) world = "hvac_field";
  else if (isProfessionalReturn) world = "professional_return";
  else if (isDental) world = "dental";
  else if (isRestaurant) world = "restaurant";
  else world = "web_service";

  if (isHvac) {
    push("HVAC");
    push("heatwave");
    push("cooling");
    push("technician");
  }
  if (isDental) {
    push("dental");
    push("patient");
  }
  if (isRestaurant) {
    push("restaurant");
    push("kitchen");
  }
  if (isProfessionalReturn) {
    push("accountant");
    push("vacation");
    push("missed leads");
    push("contact details");
    push("contact form");
  }
  if (/\bchatbot|website\s+visitor|embed|after.?hours|unanswered/i.test(blob)) {
    push("website visitor");
    push("unanswered");
  }
  if (isHvac && /\bheat|hot|swelter|melt/i.test(blob)) push("heat");
  if (/\bmiss(ed)?\s+(call|job|lead)|phone|ring/i.test(blob)) push("missed calls");
  if (/\bleave|leaving|walk\s*away|competitor/i.test(blob)) push("customers leaving");

  let industryCue: string;
  let stressCue: string;
  let customerCue: string;
  let consequenceCue: string;
  let settingCue: string;
  let topicAnchors: string[];
  let forbiddenProps: string[];

  if (world === "hvac_field") {
    industryCue = "HVAC / cooling service";
    stressCue = "heatwave demand spike";
    customerCue = "website visitor who needed an emergency cool-down";
    consequenceCue = "every unanswered online lead walks to a competitor";
    settingCue = "service yard / van / counter during heat";
    topicAnchors = [
      "HVAC",
      "heatwave",
      "cooling",
      "technician",
      "van",
      "website",
      "visitor",
    ];
    forbiddenProps = ["accountant", "suitcase", "vacation inbox", "dental chair"];
  } else if (world === "professional_return") {
    industryCue = "accounting / bookkeeping practice";
    stressCue = "return-from-vacation silence";
    customerCue = "website visitor who asked while the owner was away";
    consequenceCue =
      "a week of real visits with zero contact details left behind";
    settingCue = "home office / practice desk after vacation";
    topicAnchors = [
      "accountant",
      "accounting",
      "bookkeeping",
      "vacation",
      "suitcase",
      "missed",
      "leads",
      "contact",
      "website",
      "visitor",
      "inbox",
      "form",
      "pto",
      "passport",
    ];
    forbiddenProps = [...HVAC_FORBIDDEN_FOR_OTHERS, ...FIELD_SERVICE_PROPS];
  } else if (world === "dental") {
    industryCue = "dental clinic";
    stressCue = "after-hours patient silence";
    customerCue = "patient waiting for a reply";
    consequenceCue = "the appointment walks to another clinic";
    settingCue = "clinic reception / waiting room";
    topicAnchors = ["dental", "patient", "clinic", "website", "appointment"];
    forbiddenProps = [...HVAC_FORBIDDEN_FOR_OTHERS, "van", "technician", "heatwave"];
  } else if (world === "restaurant") {
    industryCue = "restaurant";
    stressCue = "service rush with a silent site";
    customerCue = "diner trying to book or ask online";
    consequenceCue = "the table goes to a competitor";
    settingCue = "kitchen pass / host stand";
    topicAnchors = ["restaurant", "kitchen", "reservation", "website"];
    forbiddenProps = [...HVAC_FORBIDDEN_FOR_OTHERS, "technician", "heatwave"];
  } else {
    industryCue =
      topic.trim().slice(0, 80) || "this website-led business";
    stressCue = /\bmidnight|after.?hours|offline|away|vacation/i.test(blob)
      ? "after-hours silence"
      : "peak demand overload";
    customerCue = "website visitor who needed an answer";
    consequenceCue = "every unanswered online lead walks to a competitor";
    settingCue = "business website moment / empty reply thread";
    topicAnchors = [
      ...topic
        .split(/\W+/)
        .filter((x) => x.length > 4)
        .slice(0, 6)
        .map((x) => x.toLowerCase()),
      "website",
      "visitor",
    ];
    forbiddenProps = [...HVAC_FORBIDDEN_FOR_OTHERS];
  }

  if (rawTokens.length === 0) {
    for (const w of topic.split(/\W+/).filter((x) => x.length > 4).slice(0, 4)) {
      push(w.toLowerCase());
    }
  }

  // Prefer concrete industry nouns over the vague "website-led service business" trap
  if (world === "web_service" && /\bwebsite\b/i.test(blob) && !/\bhvac|dental|restaurant|accountant/i.test(blob)) {
    // keep topic slice as industryCue already
  }

  return {
    world,
    industryCue,
    stressCue,
    customerCue,
    consequenceCue,
    settingCue,
    topicAnchors,
    forbiddenProps,
    rawTokens,
    productHint,
  };
}
