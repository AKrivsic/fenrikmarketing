import { hashString } from "@/lib/creative-identity/hash";
import type { TopicConcreteSignals } from "@/lib/creative-candidates/topicSignals";
import { rejectRawSituation } from "@/lib/creative-candidates/divergence/rawSituationFilter";
import {
  scoreStopScroll,
  scoreVisualDistinct,
} from "@/lib/creative-candidates/divergence/scoreRawSituation";
import type { RawVisualSituation } from "@/lib/creative-candidates/divergence/types";

type SceneBuilt = { scene: string; scrollStopCue: string; tags: string[] };
type SceneTemplate = (ctx: {
  signals: TopicConcreteSignals;
  variant: number;
}) => SceneBuilt;

/** HVAC / field-service world — vans, heat, technicians OK. */
const HVAC_TEMPLATES: SceneTemplate[] = [
  ({ signals }) => ({
    scene: `Two ${signals.industryCue} workers mid-argument at a service counter during ${signals.stressCue}; phones stack; a customer silhouette turns away through the glass door.`,
    scrollStopCue: "Public fight while demand walks out",
    tags: ["conflict", "counter", "HVAC"],
  }),
  ({ signals }) => ({
    scene: `A ridiculous boarding-ticket dispenser for phone callers in a ${signals.industryCue} lobby during ${signals.stressCue}; numbered paper slips; an open chat widget on a counter tablet glows with zero replies.`,
    scrollStopCue: "Airport logic applied to the wrong queue",
    tags: ["absurd", "queue", "lobby"],
  }),
  ({ signals }) => ({
    scene: `Outside a ${signals.industryCue} van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.`,
    scrollStopCue: "Lost work as a physical mountain",
    tags: ["exaggeration", "van", "heat", "pile"],
  }),
  ({ signals }) => ({
    scene: `Split-second: a rival service van already in the customer's driveway; clipboard signed; your ${signals.industryCue} phone lights unanswered on a bench; website chat idle.`,
    scrollStopCue: "Competitor wins before you pick up",
    tags: ["consequence", "competitor", "driveway"],
  }),
  ({ signals }) => ({
    scene: `Empty front desk at a ${signals.industryCue} during ${signals.stressCue}; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.`,
    scrollStopCue: "Nobody home except the chat",
    tags: ["role_reversal", "empty", "chat"],
  }),
  ({ signals }) => ({
    scene: `Residential street in heat: multiple ${signals.industryCue} vans parked; neighbors point at phones; one homeowner closes a laptop after no reply on the business site.`,
    scrollStopCue: "Famous for vans, infamous for silence online",
    tags: ["social", "street", "neighbor"],
  }),
  ({ signals }) => ({
    scene: `A home in heat: windows wide open, AC blasting uselessly — cut to a ${signals.industryCue} website chat open with nobody typing while demand spikes outside.`,
    scrollStopCue: "Wasted cool air = wasted web traffic",
    tags: ["comparison", "AC", "heat"],
  }),
  ({ signals }) => ({
    scene: `Close on a customer's sweaty hands sending an urgent ${signals.industryCue} question; the business reply thread shows "seen" with no answer; crew visible through window on trucks.`,
    scrollStopCue: "Urgent question dies in silence",
    tags: ["hands", "urgent", "customer"],
  }),
  ({ signals }) => ({
    scene: `Ice cubes melting on a ${signals.industryCue} truck hood in sun; timer implied; inside the cab, missed-call counter ticks up on a dash mount.`,
    scrollStopCue: "Heat eating time and calls",
    tags: ["heat", "truck", "melt"],
  }),
  ({ signals }) => ({
    scene: `Technician on roof in heat; phone vibrates in tool belt unanswered; ground-level tablet shows visitor asking "anyone on site?"`,
    scrollStopCue: "Hero on roof, question on ground",
    tags: ["roof", "technician", "split"],
  }),
  ({ signals }) => ({
    scene: `Train-station style departure board listing "Phone caller #47" boarding; column "Website visitor" stuck on "Delayed indefinitely" at a ${signals.industryCue} shop.`,
    scrollStopCue: "Departure board for the wrong channel",
    tags: ["departure", "board", "delay"],
  }),
  ({ signals }) => ({
    scene: `Waiting room fish tank at a ${signals.industryCue}; one fish labeled "website leads"; bowl nearly empty while phone fish overcrowded.`,
    scrollStopCue: "Absurd aquarium staffing metaphor",
    tags: ["fish", "waiting", "absurd"],
  }),
  ({ signals }) => ({
    scene: `Kids selling lemonade next to a ${signals.industryCue} van; parent jokes "they answer faster than your website"; technician laughs then freezes.`,
    scrollStopCue: "Lemonade stand beats your chat",
    tags: ["humor", "street", "comparison"],
  }),
  ({ signals }) => ({
    scene: `Two clocks side by side in a ${signals.industryCue}: wall clock for shop hours; digital timer for "avg website reply" spinning into hours.`,
    scrollStopCue: "Dual clocks, one shameful",
    tags: ["clocks", "timer", "shame"],
  }),
  ({ signals }) => ({
    scene: `Night shot: ${signals.industryCue} yard empty; security light on; tablet on counter shows 14 unanswered chats glowing.`,
    scrollStopCue: "After hours, chats still screaming",
    tags: ["night", "security", "chats"],
  }),
];

/**
 * Accountant / vacation / missed leads world — no vans, technicians, or heatwave props.
 */
const PROFESSIONAL_RETURN_TEMPLATES: SceneTemplate[] = [
  ({ signals }) => ({
    scene: `An accountant drops a suitcase by the practice desk after vacation; monitor shows a week of website visits and a contact-form column stuck at zero.`,
    scrollStopCue: "Suitcase down, contact details still empty",
    tags: ["suitcase", "accountant", "vacation", "inbox"],
  }),
  ({ signals }) => ({
    scene: `Return day: two partners at an ${signals.industryCue} argue over whose fault the silent website was while a printout of missed vacation-week leads sits between them.`,
    scrollStopCue: "Partners fight over the silent week online",
    tags: ["conflict", "argue", "partners", "leads"],
  }),
  ({ signals }) => ({
    scene: `Close on an empty CRM "new lead" list beside a calendar blocked PTO; sticky note: "back Monday" — website visitors already asked and left.`,
    scrollStopCue: "PTO calendar vs empty lead list",
    tags: ["calendar", "pto", "crm", "leads"],
  }),
  ({ signals }) => ({
    scene: `Split screen: airplane window over clouds / ${signals.industryCue} website chat bubbles stacking with no reply while the owner is mid-flight.`,
    scrollStopCue: "Mid-flight silence, leads stacking",
    tags: ["airplane", "chat", "vacation"],
  }),
  ({ signals }) => ({
    scene: `Home office after vacation: passport and boarding pass on the keyboard; browser history of unanswered "Do you take new clients?" messages.`,
    scrollStopCue: "Passport on the keyboard, questions unanswered",
    tags: ["passport", "keyboard", "clients"],
  }),
  ({ signals }) => ({
    scene: `An accountant opens the practice door with luggage; voicemail light dark; website analytics spike red for "contact form incomplete".`,
    scrollStopCue: "Luggage at the door, form incomplete",
    tags: ["luggage", "door", "form"],
  }),
  ({ signals }) => ({
    scene: `Absurd but readable: a paper boarding pass printer for phone callers at an accounting desk — website visitors get no seat assignment.`,
    scrollStopCue: "Boarding passes for calls, nothing for the site",
    tags: ["absurd", "boarding", "accounting"],
  }),
  ({ signals }) => ({
    scene: `Social observation: clients text "are you back yet?" in a group chat; underneath, the ${signals.industryCue} website still shows a static contact form only.`,
    scrollStopCue: "Group chat asks; website stays static",
    tags: ["social", "group", "static", "social observation"],
  }),
  ({ signals }) => ({
    scene: `Unexpected comparison: leaving the website silent on vacation is like locking the office door while the phone still rings in an empty ${signals.industryCue} room — except online, nobody even hears it.`,
    scrollStopCue: "Locked door online, ring goes nowhere",
    tags: ["comparison", "locked", "phone", "unexpected comparison"],
  }),
  ({ signals }) => ({
    scene: `Neighbor bookkeeper's porch light on at night; your accountant's site shows "we'll get back to you" while a visitor books the neighbor instead — social proof of being unreachable.`,
    scrollStopCue: "Neighbor answers; your site stalls",
    tags: ["neighbor", "night", "social"],
  }),
  ({ signals }) => ({
    scene: `Out-of-office email auto-reply on one screen; on the other, a website visitor closes the tab after the contact form demands a phone number they refuse to leave.`,
    scrollStopCue: "OOO email works; contact form kills the lead",
    tags: ["ooo", "form", "tab"],
  }),
  ({ signals }) => ({
    scene: `Week-of-visits printout taped to a glass door of an ${signals.industryCue}; every row has a timestamp, every "phone/email captured" cell is blank.`,
    scrollStopCue: "Timestamps without contact details",
    tags: ["printout", "glass", "blank"],
  }),
  ({ signals }) => ({
    scene: `Role reversal: empty accounting office during vacation week; only the website chat cursor blinks — and nobody is behind it.`,
    scrollStopCue: "Empty office, blinking cursor, no human",
    tags: ["role_reversal", "empty", "cursor"],
  }),
  ({ signals }) => ({
    scene: `Close on a visitor's hands filling a contact form, then abandoning it; cut to the accountant later scrolling the same incomplete submissions.`,
    scrollStopCue: "Form abandoned now, discovered after vacation",
    tags: ["hands", "form", "abandon"],
  }),
  ({ signals }) => ({
    scene: `Two clocks: wall clock marked "vacation ends"; website timer "avg reply" already days deep before the suitcase is unpacked.`,
    scrollStopCue: "Vacation end vs reply timer",
    tags: ["clocks", "vacation", "timer"],
  }),
  ({ signals }) => ({
    scene: `Waiting-room fish tank metaphor in an accounting lobby: "phone leads" overcrowded; "website leads" bowl nearly empty — labeled missed while away.`,
    scrollStopCue: "Fishbowl staffing while the owner was gone",
    tags: ["fish", "lobby", "missed"],
  }),
  ({ signals }) => ({
    scene: `Consequence first: a competitor CPA already on a Zoom with last week's website visitor; your accountant still unpacking, chat history unread.`,
    scrollStopCue: "Competitor already on the call",
    tags: ["consequence", "zoom", "competitor"],
  }),
  ({ signals }) => ({
    scene: `Exaggeration: a physical pile of printed "session started / no contact" website logs towers beside the suitcase on the accountant's desk.`,
    scrollStopCue: "Paper mountain of anonymous visits",
    tags: ["exaggeration", "pile", "logs"],
  }),
  ({ signals }) => ({
    scene: `Direct product world: a visitor types "Can you file my quarterly this week?" into the site at 11pm on Saturday; "delivered"; the accountant is still abroad.`,
    scrollStopCue: "Urgent tax question, owner still abroad",
    tags: ["direct", "tax", "abroad"],
  }),
  ({ signals }) => ({
    scene: `Airport carousel: suitcase circles alone; parallel shot of website chat bubbles circling with no agent claiming them for an ${signals.industryCue}.`,
    scrollStopCue: "Suitcase circles; chats circle unclaimed",
    tags: ["airport", "carousel", "chats"],
  }),
  ({ signals }) => ({
    scene: `Return-day gut punch: accountant opens analytics — 47 sessions, 0 identifiable contacts — then stares at a contact form that never offered a chat answer.`,
    scrollStopCue: "47 sessions, zero contacts",
    tags: ["analytics", "gut", "form"],
  }),
];

/** Shared web-service templates (topic nouns injected; no HVAC props). */
const WEB_SERVICE_TEMPLATES: SceneTemplate[] = [
  ({ signals }) => ({
    scene: `Close on a customer's hands sending an urgent question to ${signals.industryCue}; reply thread shows "seen" with no answer during ${signals.stressCue}.`,
    scrollStopCue: "Urgent question dies in silence",
    tags: ["hands", "urgent", "customer"],
  }),
  ({ signals }) => ({
    scene: `Empty front desk at ${signals.industryCue} during ${signals.stressCue}; phones blink alone; a wall tablet chat calmly waits with nobody typing.`,
    scrollStopCue: "Nobody home except the waiting chat",
    tags: ["role_reversal", "empty", "chat"],
  }),
  ({ signals }) => ({
    scene: `Train-station style departure board: "Phone caller #47" boarding; "Website visitor" stuck on Delayed — at ${signals.industryCue}.`,
    scrollStopCue: "Departure board for the wrong channel",
    tags: ["departure", "board", "delay"],
  }),
  ({ signals }) => ({
    scene: `Two clocks at ${signals.industryCue}: shop hours vs "avg website reply" spinning into hours during ${signals.stressCue}.`,
    scrollStopCue: "Dual clocks, one shameful",
    tags: ["clocks", "timer", "shame"],
  }),
  ({ signals }) => ({
    scene: `Absurd boarding-ticket dispenser for phone callers at ${signals.industryCue}; website chat on the counter glows with zero replies.`,
    scrollStopCue: "Airport logic applied to the wrong queue",
    tags: ["absurd", "queue", "lobby"],
  }),
  ({ signals }) => ({
    scene: `Night: ${signals.industryCue} dark; security light on; tablet shows unanswered website chats glowing during ${signals.stressCue}.`,
    scrollStopCue: "After hours, chats still screaming",
    tags: ["night", "security", "chats"],
  }),
  ({ signals }) => ({
    scene: `Consequence: rival already quoted the ${signals.customerCue}; your site chat still idle from ${signals.stressCue}.`,
    scrollStopCue: "Competitor wins before you pick up",
    tags: ["consequence", "competitor"],
  }),
  ({ signals }) => ({
    scene: `Physical stack of printed missed-web-session logs grows on the ${signals.industryCue} counter while staff handle only the phone.`,
    scrollStopCue: "Lost work as a physical mountain",
    tags: ["exaggeration", "pile"],
  }),
];

const DENTAL_TEMPLATES: SceneTemplate[] = [
  ({ signals }) => ({
    scene: `Dental clinic waiting room after hours; empty chairs; tablet at reception shows a patient asking about emergency pain — no reply during ${signals.stressCue}.`,
    scrollStopCue: "Empty chairs, unanswered pain question",
    tags: ["dental", "waiting", "patient"],
  }),
  ({ signals }) => ({
    scene: `Patient holds ice pack in parking lot of a ${signals.industryCue}; refreshes the clinic website; still no chat answer.`,
    scrollStopCue: "Ice pack outside, silence online",
    tags: ["patient", "parking", "ice"],
  }),
  ...WEB_SERVICE_TEMPLATES,
];

const RESTAURANT_TEMPLATES: SceneTemplate[] = [
  ({ signals }) => ({
    scene: `Host stand packed; kitchen tickets flying; the ${signals.industryCue} reservation site shows unanswered "any table tonight?" chats.`,
    scrollStopCue: "Tickets flying, reservation chat silent",
    tags: ["restaurant", "host", "reservation"],
  }),
  ...WEB_SERVICE_TEMPLATES,
];

function templatesForWorld(world: TopicConcreteSignals["world"]): SceneTemplate[] {
  switch (world) {
    case "hvac_field":
      return HVAC_TEMPLATES;
    case "professional_return":
      return PROFESSIONAL_RETURN_TEMPLATES;
    case "dental":
      return DENTAL_TEMPLATES;
    case "restaurant":
      return RESTAURANT_TEMPLATES;
    default:
      return WEB_SERVICE_TEMPLATES;
  }
}

function normalizeSceneKey(scene: string): string {
  return scene
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .slice(0, 120);
}

/** Light camera variants — same scrollStopCue so they cluster together. */
function expandWithVariants(
  base: SceneBuilt,
  seed: string,
  count: number,
): SceneBuilt[] {
  const out: SceneBuilt[] = [base];
  const tweaks = [
    (s: string) => `Handheld urgency: ${s}`,
    (s: string) => `${s} Camera holds one beat too long for discomfort.`,
    (s: string) => s.replace(/Close on/g, "Macro on"),
    (s: string) => s.replace(/Split screen/g, "Wide then snap to"),
  ];
  for (let i = 0; i < count && out.length < 8; i++) {
    const tweak = tweaks[hashString(`${seed}-tweak-${i}`) % tweaks.length]!;
    const scene = tweak(base.scene);
    if (normalizeSceneKey(scene) !== normalizeSceneKey(base.scene)) {
      out.push({
        scene,
        scrollStopCue: base.scrollStopCue,
        tags: [...base.tags, `v${i}`],
      });
    }
  }
  return out;
}

export function generateRawVisualSituations(input: {
  topic: string;
  angle?: string | null;
  signals: TopicConcreteSignals;
  targetCount?: number;
}): RawVisualSituation[] {
  const seed = `${input.topic}|${input.angle ?? ""}`;
  const target = input.targetCount ?? 45;
  const seen = new Set<string>();
  const raw: RawVisualSituation[] = [];
  const templates = templatesForWorld(input.signals.world);

  for (let pass = 0; raw.length < target && pass < 4; pass++) {
    for (let ti = 0; ti < templates.length && raw.length < target; ti++) {
      const tpl = templates[(ti + pass * 3) % templates.length]!;
      const variant = hashString(`${seed}-${ti}-${pass}`) % 5;
      const built = tpl({ signals: input.signals, variant });
      const expanded = expandWithVariants(
        built,
        `${seed}-${ti}`,
        pass === 0 ? 0 : 2,
      );
      for (const item of expanded) {
        const key = normalizeSceneKey(item.scene);
        if (seen.has(key)) continue;
        seen.add(key);

        const reject = rejectRawSituation(item.scene, input.signals);
        const stopScrollScore = scoreStopScroll(item.scene, item.scrollStopCue);
        const visualDistinctScore = scoreVisualDistinct(item.scene, item.tags);

        raw.push({
          id: `raw-${raw.length + 1}-${hashString(key) % 10000}`,
          scene: item.scene,
          scrollStopCue: item.scrollStopCue,
          tags: item.tags.map((t) => String(t)),
          stopScrollScore,
          visualDistinctScore,
          rejected: reject !== null,
          rejectReason: reject,
          clusterId: null,
        });
      }
    }
  }

  // Always include known-bad probes so the filter is observable in persistence.
  const PROBE_SCENES: SceneBuilt[] = [
    {
      scene:
        "Person staring at a laptop in a modern office meeting room explaining the product on a dashboard",
      scrollStopCue: "Generic office probe (must reject)",
      tags: ["probe", "generic"],
    },
    {
      scene:
        "A website-led service business worker holds a phone to their ear at a calm desk thinking about workflow efficiency",
      scrollStopCue: "Interchangeable SMB probe (must reject)",
      tags: ["probe", "generic"],
    },
    {
      scene:
        "Outside a HVAC / cooling service van in blazing heat, a technician sprints while an accountant topic is ignored",
      scrollStopCue: "Off-industry HVAC probe (must reject when not HVAC)",
      tags: ["probe", "hvac"],
    },
  ];

  for (const item of PROBE_SCENES) {
    if (raw.length >= target + 3) break;
    const key = normalizeSceneKey(item.scene);
    if (seen.has(key)) continue;
    seen.add(key);
    const reject = rejectRawSituation(item.scene, input.signals);
    raw.push({
      id: `raw-${raw.length + 1}-${hashString(key) % 10000}`,
      scene: item.scene,
      scrollStopCue: item.scrollStopCue,
      tags: item.tags,
      stopScrollScore: scoreStopScroll(item.scene, item.scrollStopCue),
      visualDistinctScore: scoreVisualDistinct(item.scene, item.tags),
      rejected: reject !== null,
      rejectReason: reject,
      clusterId: null,
    });
  }

  return raw;
}
