/**
 * Small stable taxonomy for cross-run T2V originality.
 * Keyword/heuristic classification — not embeddings.
 */

import { normalizeMemoryText } from "@/lib/ai/workflows/antiRepetitionMemory";

export const T2V_SCENARIO_FAMILIES = [
  "outsider_checks_silent_company_profile",
  "founder_is_the_content_department",
  "empty_content_queue",
  "in_house_content_costs_hours",
  "url_is_enough_input",
  "other",
] as const;
export type T2vScenarioFamily = (typeof T2V_SCENARIO_FAMILIES)[number];

export const T2V_VISUAL_MOTIFS = [
  "phone_laptop_profile_feed",
  "physical_workplace_action",
  "home_night_desk",
  "other",
] as const;
export type T2vVisualMotif = (typeof T2V_VISUAL_MOTIFS)[number];

export const T2V_POV_FAMILIES = [
  "hiring_manager",
  "new_hire",
  "potential_client",
  "founder",
  "other",
] as const;
export type T2vPovFamily = (typeof T2V_POV_FAMILIES)[number];

export const T2V_OPENING_MECHANISMS = [
  "quoted_dialogue",
  "contrast_aphorism",
  "direct_question",
  "other",
] as const;
export type T2vOpeningMechanism = (typeof T2V_OPENING_MECHANISMS)[number];

export const T2V_PROP_FAMILIES = [
  "phone_or_laptop_screen",
  "physical_tool_or_product",
  "paper_or_signage",
  "other",
] as const;
export type T2vPropFamily = (typeof T2V_PROP_FAMILIES)[number];

function haystack(parts: Array<string | null | undefined>): string {
  return normalizeMemoryText(parts.filter(Boolean).join(" "));
}

function hasAny(text: string, needles: readonly string[]): boolean {
  return needles.some((n) => text.includes(n));
}

const SILENT_PROFILE_LOOKUP = [
  "look you up",
  "look me up",
  "looked you up",
  "googles your",
  "google your",
  "search your name",
  "searches your company",
  "searched your company",
  "check your profile",
  "checks your profile",
  "open a tab",
  "opened a tab",
  "tab they opened",
  "before your call",
  "before a call",
  "before their first day",
  "before day one",
  "night before",
  "before their interview",
  "before the interview",
  "cold outreach",
] as const;

const SILENT_FEED_RESULT = [
  "last post",
  "last video",
  "months ago",
  "weeks ago",
  "three months",
  "eight weeks",
  "fourteen weeks",
  "silent feed",
  "quiet feed",
  "inactive feed",
  "nothing posted",
  "no recent",
  "gone quiet",
  "still hiring",
  "still open",
  "quietly closed",
  "profile loads",
  "empty feed",
  "sparse feed",
] as const;

export function classifyScenarioFamily(text: string): T2vScenarioFamily {
  const t = haystack([text]);
  if (!t) return "other";
  const lookup = hasAny(t, SILENT_PROFILE_LOOKUP);
  const silence = hasAny(t, SILENT_FEED_RESULT);
  if (lookup && silence) return "outsider_checks_silent_company_profile";
  if (
    silence &&
    hasAny(t, [
      "candidate",
      "new hire",
      "hiring",
      "client",
      "profile",
      "feed",
      "tab",
    ])
  ) {
    return "outsider_checks_silent_company_profile";
  }
  if (
    hasAny(t, [
      "content department",
      "founder stops owning",
      "outsourced function",
    ])
  ) {
    return "founder_is_the_content_department";
  }
  if (
    hasAny(t, ["content queue", "queue completely empty", "nothing drafted"])
  ) {
    return "empty_content_queue";
  }
  if (
    hasAny(t, [
      "in-house this quarter",
      "handle content in-house",
      "three hours every friday",
    ])
  ) {
    return "in_house_content_costs_hours";
  }
  if (
    hasAny(t, [
      "url is all you need",
      "single url",
      "website already exists",
      "setup was never required",
    ])
  ) {
    return "url_is_enough_input";
  }
  return "other";
}

export function classifyVisualMotif(text: string): T2vVisualMotif {
  const t = haystack([text]);
  if (!t) return "other";
  const device = hasAny(t, [
    "phone",
    "smartphone",
    "laptop",
    "notebook",
    "screen",
    "feed",
    "profile",
    "scroll",
  ]);
  if (device) return "phone_laptop_profile_feed";
  if (hasAny(t, ["bedroom", "night", "desk lamp", "amber lamp"])) {
    return "home_night_desk";
  }
  if (
    hasAny(t, ["warehouse", "workshop", "kitchen", "shop floor", "loading dock"])
  ) {
    return "physical_workplace_action";
  }
  return "other";
}

export function classifyPovFamily(text: string): T2vPovFamily {
  const t = haystack([text]);
  if (hasAny(t, ["hiring manager", "recruiter"])) return "hiring_manager";
  if (hasAny(t, ["new hire", "new employee", "first day", "day one"])) {
    return "new_hire";
  }
  if (hasAny(t, ["potential client", "client", "buyer", "prospect"])) {
    return "potential_client";
  }
  if (hasAny(t, ["founder", "owner"])) return "founder";
  return "other";
}

export function classifyOpeningMechanism(hook: string): T2vOpeningMechanism {
  const t = hook.trim();
  if (!t) return "other";
  if (/^['"„]/.test(t) || t.includes("'I ") || t.includes('"I ')) {
    return "quoted_dialogue";
  }
  if (t.includes("?")) return "direct_question";
  if (/:\s/.test(t) && /reassurance|doubt|silent|active/.test(t.toLowerCase())) {
    return "contrast_aphorism";
  }
  return "other";
}

export function classifyPropFamily(text: string): T2vPropFamily {
  const t = haystack([text]);
  if (hasAny(t, ["phone", "laptop", "notebook", "screen", "feed", "profile"])) {
    return "phone_or_laptop_screen";
  }
  if (hasAny(t, ["paper", "folder", "sign", "whiteboard"])) {
    return "paper_or_signage";
  }
  if (hasAny(t, ["tool", "product", "box", "machine"])) {
    return "physical_tool_or_product";
  }
  return "other";
}

export function sameScenarioFamily(
  a: T2vScenarioFamily,
  b: T2vScenarioFamily,
): boolean {
  if (a === "other" || b === "other") return false;
  return a === b;
}

export function sameVisualMotif(a: T2vVisualMotif, b: T2vVisualMotif): boolean {
  if (a === "other" || b === "other") return false;
  return a === b;
}

export function normalizePainKey(pain: string | null | undefined): string {
  return normalizeMemoryText(pain ?? "");
}
