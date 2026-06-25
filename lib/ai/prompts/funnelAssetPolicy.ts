import { FUNNEL_STAGE_LABELS, type FunnelStage } from "@/lib/ai/types";

// Prompt-only funnel guidance. Hard requirements live in PACKAGE ASSET COVERAGE
// (sample / production series). Assets stay optional when no quality library exists.
export function buildFunnelAssetPolicyBlock(funnelStage: FunnelStage): string {
  const label = FUNNEL_STAGE_LABELS[funnelStage];
  const stageGuidance: Record<FunnelStage, string> = {
    awareness: [
      "- Mostly AI-generated scenes.",
      "- Product assets optional; at most an occasional product anchor.",
      "- Avoid logo-as-hero; keep the hook visual and story-led.",
    ].join("\n"),
    problem_aware: [
      "- Use product assets occasionally when they clarify the problem.",
      "- Prefer one asset at most when it strengthens context.",
    ].join("\n"),
    solution_aware: [
      "- product_ui / dashboard assets are recommended when they show the solution.",
      "- Still story-first — do not turn every beat into a product screenshot.",
    ].join("\n"),
    conversion: [
      "- Logo + product UI / homepage visuals are recommended near CTA framing.",
      "- Use logo sparingly (often near the CTA, not the opening hook).",
    ].join("\n"),
  };

  return [
    `FUNNEL ASSET POLICY (funnel_stage=${label} — guidance; see PACKAGE ASSET COVERAGE for this package):`,
    stageGuidance[funnelStage],
    "- Never invent asset_usage; empty asset_usage is valid when coverage says optional or avoid.",
  ].join("\n");
}
