import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import { compactFingerprintSummary } from "@/lib/series/creativeFingerprints";

export function buildSeriesCreativeContextBlock(args: {
  series: SeriesCreativeContext;
}): string {
  const lines = [
    "SERIES CONTEXT (weekly / monthly content series):",
    "You are creating ONE item in a larger content series. Make this package distinct from recent packages while staying consistent with the product and strategy.",
    "Do not repeat the same hook pattern, opening composition, closing device, or typed-scene layout as a recent sibling when a fresh angle still fits the strategy.",
    "Attention mechanism, opening visual motif, opening emotional effect, SFX category, and opening structure on recent fingerprints are soft negative signals — prefer fresh combinations when equally strong. Do not rotate mechanisms mechanically or force absurdity/controversy/dilemma quotas.",
    "Do not force variety that weakens the narrative — clarity beats artificial difference.",
    "",
    "Recent series fingerprints (most recent first):",
  ];

  if (args.series.fingerprints.length === 0) {
    lines.push("- (no prior packages in context yet)");
  } else {
    for (const fp of args.series.fingerprints.slice(0, 6)) {
      const summary = compactFingerprintSummary(fp);
      lines.push(`- ${JSON.stringify(summary)}`);
    }
  }

  if (args.series.recentHooks.length > 0) {
    lines.push("", "Recent hooks to differentiate from:");
    for (const h of args.series.recentHooks.slice(0, 4)) {
      lines.push(`- ${h.slice(0, 120)}`);
    }
  }

  lines.push(
    "",
    "Visual motif memory:",
    "- Fingerprints include image_motifs (laptop, whiteboard, sticky_notes, person_alone, etc.).",
    "- Prefer fresh subjects and meaning carriers when the narrative allows — do not treat recent motifs as mandatory repeats.",
    "",
    "Closing guidance:",
    "- Awareness / Problem Aware: often strongest as narrative conclusion, insight, question, product visual, or soft text close — typed CTA only when a branded card is clearly best.",
    "- Solution Aware / Conversion: typed CTA when it is the strongest final action expression; skip when insight or product visual closes better.",
    "- For each beat, choose the strongest allowed presentation (IMAGE or typed). Recent typed-scene use is a soft tie-breaker, not a ban.",
    "- A list-like topic does not require CHECKLIST; prefer IMAGE / process / comparison when similarly strong, especially if CHECKLIST appeared recently.",
    "- Plan enough distinct visual beats for the video length (roughly one meaningful visual every 4–6 seconds; avoid long stretches on a single still).",
  );

  return lines.join("\n");
}
