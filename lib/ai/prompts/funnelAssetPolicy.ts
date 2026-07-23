import { FUNNEL_STAGE_LABELS, type FunnelStage } from "@/lib/ai/types";

// Owner: Funnel Asset Policy (fallback only)
// Responsibility: stage-level asset guidance when PACKAGE ASSET COVERAGE is absent.
// When coverage is present, Presentation injects coverage only — do not echo both.
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
      "- Product surface / interface assets are recommended when they show the solution.",
      "- Still story-first — do not turn every beat into a product screenshot.",
    ].join("\n"),
    conversion: [
      "- Logo + product surface / homepage visuals are recommended near CTA framing.",
      "- Use logo sparingly (often near the CTA, not the opening hook).",
    ].join("\n"),
  };

  return [
    `FUNNEL ASSET POLICY (funnel_stage=${label} — guidance; see PACKAGE ASSET COVERAGE for this package):`,
    stageGuidance[funnelStage],
    "- Never invent asset_usage; empty asset_usage is valid when coverage says optional or avoid.",
  ].join("\n");
}
