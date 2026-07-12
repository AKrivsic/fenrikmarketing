const MAX_TTS_INSTRUCTIONS_LENGTH = 500;

function normalizeFunnelStageLabel(stage: string | null | undefined): string {
  if (!stage?.trim()) return "";
  return stage.trim().toLowerCase();
}

function deliveryForFunnelStage(stage: string): string | null {
  const s = normalizeFunnelStageLabel(stage);
  if (!s) return null;
  if (s.includes("awareness")) {
    return "Delivery: natural, curious, conversational.";
  }
  if (s.includes("problem")) {
    return "Delivery: direct, empathetic, slightly frustrated.";
  }
  if (s.includes("solution")) {
    return "Delivery: clear, confident, practical.";
  }
  if (s.includes("conversion")) {
    return "Delivery: confident, concise, not aggressive.";
  }
  return null;
}

function deliveryForCreativeMode(mode: string | null | undefined): string | null {
  if (!mode?.trim()) return null;
  const m = mode.trim().toLowerCase();
  if (m === "humor") {
    return "Delivery: lightly playful, never exaggerated.";
  }
  if (m === "proof" || m.includes("statistic")) {
    return "Delivery: measured, credible.";
  }
  if (m === "cta" || m.includes("conversion")) {
    return "Delivery: confident, concise closing energy.";
  }
  return null;
}

function deliveryForNarrativeRoles(
  roles: readonly string[] | null | undefined,
): string | null {
  if (!roles?.length) return null;
  const normalized = roles.map((r) => r.trim().toLowerCase()).filter(Boolean);
  if (normalized.some((r) => r.includes("proof") || r === "statistic")) {
    return "Delivery: measured, credible.";
  }
  if (normalized.some((r) => r === "cta" || r.includes("close"))) {
    return "Delivery: confident, concise, not aggressive.";
  }
  if (
    normalized.some((r) =>
      ["observation", "situation", "hook", "opening"].includes(r),
    )
  ) {
    return "Delivery: natural, curious, conversational.";
  }
  if (normalized.some((r) => ["mistake", "why_backfires", "problem"].includes(r))) {
    return "Delivery: direct, empathetic, slightly frustrated.";
  }
  return null;
}

export interface VideoTtsDeliveryContext {
  funnelStage?: string | null;
  creativeMode?: string | null;
  narrativeRoles?: readonly string[] | null;
  language?: string;
}

export function buildVideoTtsDeliveryHints(
  ctx: VideoTtsDeliveryContext,
): string[] {
  const hints: string[] = [];
  const funnel = deliveryForFunnelStage(ctx.funnelStage ?? "");
  if (funnel) hints.push(funnel);
  const mode = deliveryForCreativeMode(ctx.creativeMode);
  if (mode && !hints.includes(mode)) hints.push(mode);
  const roles = deliveryForNarrativeRoles(ctx.narrativeRoles);
  if (roles && !hints.some((h) => h === roles)) hints.push(roles);
  if (ctx.language?.trim()) {
    hints.push(`Language: ${ctx.language.trim()}.`);
  }
  return hints;
}

export function mergeTtsInstructionText(args: {
  projectInstructions?: string | null;
  toneDerived?: string | null;
  videoHints?: string[];
}): string | undefined {
  const parts: string[] = [];
  const project = args.projectInstructions?.trim();
  if (project) parts.push(project);

  const tone = args.toneDerived?.trim();
  if (tone && tone !== project) parts.push(tone);

  const video = (args.videoHints ?? []).filter(Boolean).join(" ");
  if (video) parts.push(video);

  if (parts.length === 0) return undefined;
  const merged = parts.join(" ");
  return merged.slice(0, MAX_TTS_INSTRUCTIONS_LENGTH);
}
