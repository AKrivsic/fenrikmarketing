import type { CreativeFingerprint } from "@/lib/series/creativeFingerprints";

/** Detectable visual motifs for series memory (prompt guidance only — not bans). */
export const VISUAL_MOTIF_IDS = [
  "laptop",
  "phone",
  "desk",
  "office",
  "meeting",
  "whiteboard",
  "sticky_notes",
  "dashboard",
  "founder",
  "person_alone",
  "group",
  "close_up",
  "overhead",
  "product_asset",
  "monitor",
  "home_office",
  "cafe",
  "prototype",
  "planning_wall",
  "customer_interview",
] as const;

export type VisualMotifId = (typeof VISUAL_MOTIF_IDS)[number];

const MOTIF_PATTERNS: { id: VisualMotifId; re: RegExp }[] = [
  { id: "laptop", re: /\b(laptop|macbook|notebook computer)\b/i },
  { id: "phone", re: /\b(phone|smartphone|mobile|iphone|android)\b/i },
  { id: "desk", re: /\b(desk|desktop|workspace|work desk)\b/i },
  { id: "office", re: /\b(office|meeting room|conference room|boardroom)\b/i },
  { id: "meeting", re: /\b(meeting|standup|whiteboard session|workshop)\b/i },
  { id: "whiteboard", re: /\b(whiteboard|dry.?erase board|marker board)\b/i },
  { id: "sticky_notes", re: /\b(sticky notes?|post-its?|stickies)\b/i },
  { id: "dashboard", re: /\b(dashboard|analytics|chart|metrics)\b/i },
  { id: "founder", re: /\b(founder|entrepreneur|ceo|startup founder)\b/i },
  { id: "person_alone", re: /\b(alone|solitary|single person|by themselves|from behind|silhouette)\b/i },
  { id: "group", re: /\b(two people|team|colleagues|group|side by side|conversation)\b/i },
  { id: "close_up", re: /\b(close detail|close-up|tight crop|macro|hands only)\b/i },
  { id: "overhead", re: /\b(overhead|top.?down|bird.?s eye|flat lay)\b/i },
  { id: "product_asset", re: /\b(screenshot|ui asset|product ui|app screen|interface)\b/i },
  { id: "monitor", re: /\b(monitor|display screen|dual monitor|second monitor)\b/i },
  { id: "home_office", re: /\b(home office|office nook|remote desk)\b/i },
  { id: "cafe", re: /\b(caf[eé]|coffee shop|neighborhood caf)\b/i },
  { id: "prototype", re: /\b(prototype|mockup|wireframe|blueprint)\b/i },
  { id: "planning_wall", re: /\b(planning wall|roadmap wall|pinned cards|wall of notes)\b/i },
  { id: "customer_interview", re: /\b(interview|customer call|user research|listening)\b/i },
];

export function motifsFromVisualText(text: string): VisualMotifId[] {
  const out = new Set<VisualMotifId>();
  for (const { id, re } of MOTIF_PATTERNS) {
    if (re.test(text)) out.add(id);
  }
  return [...out];
}

/** Aggregate motif frequency from recent package fingerprints. */
export function aggregateRecentMotifCounts(
  fingerprints: readonly CreativeFingerprint[],
  window = 8,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const fp of fingerprints.slice(0, window)) {
    for (const motif of fp.image_motifs ?? []) {
      counts[motif] = (counts[motif] ?? 0) + 1;
    }
    const blob = [fp.opening_hint ?? "", fp.closing_hint ?? ""].join(" ");
    for (const id of motifsFromVisualText(blob)) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}

export function dominantMotifs(
  counts: Record<string, number>,
  minCount = 3,
): string[] {
  return Object.entries(counts)
    .filter(([, n]) => n >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
