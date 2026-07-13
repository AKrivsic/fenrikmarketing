import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import { compactFingerprintSummary } from "@/lib/series/creativeFingerprints";

export function buildSeriesCreativeContextBlock(args: {
  series: SeriesCreativeContext;
}): string {
  const lines = [
    "SERIES CONTEXT (weekly / monthly content series):",
    "You are creating ONE item in a larger content series. Make this package distinct from recent packages while staying consistent with the product and strategy.",
    "Do not repeat the same hook pattern, opening composition, closing device, or typed-scene layout as a recent sibling when a fresh angle still fits the strategy.",
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
    "Closing guidance:",
    "- Awareness / Problem Aware: prefer narrative conclusion, insight, question, product visual, or soft text close — typed CTA card is optional and often unnecessary.",
    "- Solution Aware / Conversion: typed CTA is allowed when it clearly helps the final action and the series is not already saturated with CTA cards.",
    "- Choose scene types per beat (CHECKLIST / PHONE / QUOTE / STATISTIC / CTA) only when materially clearer than IMAGE.",
    "- Plan enough distinct visual beats for the video length (roughly one meaningful visual every 4–6 seconds; avoid long stretches on a single still).",
  );

  return lines.join("\n");
}
