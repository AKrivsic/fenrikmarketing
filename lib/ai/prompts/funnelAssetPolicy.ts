import { FUNNEL_STAGE_LABELS, type FunnelStage } from "@/lib/ai/types";

// Prompt-only guidance for how product assets may support each funnel stage.
// Assets remain optional; this never forces asset_usage.
export function buildFunnelAssetPolicyBlock(funnelStage: FunnelStage): string {
  const label = FUNNEL_STAGE_LABELS[funnelStage];
  const stageGuidance: Record<FunnelStage, string> = {
    awareness: [
      "- Mostly AI-generated scenes.",
      "- Use product assets only when they strengthen authenticity (never as a default).",
      "- Avoid logo-as-hero; keep the hook visual and story-led.",
    ].join("\n"),
    problem_aware: [
      "- Occasionally use homepage or product UI as a subtle product anchor.",
      "- Prefer one asset at most when it clarifies the problem context.",
    ].join("\n"),
    solution_aware: [
      "- Product UI / dashboard screenshots are encouraged when they show the solution.",
      "- Still optional — the story comes first.",
    ].join("\n"),
    conversion: [
      "- Logo and product visuals are acceptable when they support the CTA.",
      "- Use logo sparingly (often near the CTA framing, not the opening hook).",
    ].join("\n"),
  };

  return [
    `FUNNEL ASSET POLICY (funnel_stage=${label} — guidance only, assets remain OPTIONAL):`,
    stageGuidance[funnelStage],
    "- Never invent asset_usage; empty asset_usage is always valid.",
  ].join("\n");
}
