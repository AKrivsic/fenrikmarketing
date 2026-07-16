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
  if (m === "story") {
    return "Delivery: warm, intimate, conversational storytelling pace.";
  }
  if (m === "shock") {
    return "Delivery: alert energy, crisp emphasis on the unexpected fact.";
  }
  if (m === "contrarian") {
    return "Delivery: confident challenge, measured not combative.";
  }
  if (m === "observation") {
    return "Delivery: thoughtful, reflective, steady pacing.";
  }
  if (m === "mistake") {
    return "Delivery: empathetic, corrective, never shaming.";
  }
  if (m === "myth_buster") {
    return "Delivery: clear, authoritative correction without arrogance.";
  }
  if (m === "comparison") {
    return "Delivery: even, analytical, balanced emphasis.";
  }
  if (m === "micro_case") {
    return "Delivery: concrete, calm before/after clarity.";
  }
  if (m === "standard") {
    return "Delivery: clean, direct, practical.";
  }
  if (m === "proof" || m.includes("statistic")) {
    return "Delivery: measured, credible.";
  }
  if (m === "cta" || m.includes("conversion")) {
    return "Delivery: confident, concise closing energy.";
  }
  return null;
}

function deliveryForVisualProfile(
  profile: string | null | undefined,
): string | null {
  if (!profile?.trim()) return null;
  const p = profile.trim().toUpperCase();
  if (p === "NATURAL") {
    return "Delivery: warm and approachable.";
  }
  if (p === "MINIMAL") {
    return "Delivery: calm, uncluttered pacing.";
  }
  if (p === "BOLD") {
    return "Delivery: slightly higher energy, clear emphasis.";
  }
  if (p === "EDITORIAL") {
    return "Delivery: composed, insightful, measured.";
  }
  if (p === "PREMIUM") {
    return "Delivery: polished, restrained confidence.";
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
      ["observation", "situation", "hook", "opening", "setup"].includes(r),
    )
  ) {
    return "Delivery: natural, curious, conversational.";
  }
  if (
    normalized.some((r) =>
      ["mistake", "why_backfires", "problem", "conflict"].includes(r),
    )
  ) {
    return "Delivery: direct, empathetic, slightly frustrated.";
  }
  if (normalized.some((r) => ["twist", "unexpected_turn", "punchline"].includes(r))) {
    return "Delivery: slight lift in energy on the turn.";
  }
  return null;
}

export interface VideoTtsDeliveryContext {
  funnelStage?: string | null;
  creativeMode?: string | null;
  narrativeRoles?: readonly string[] | null;
  language?: string;
  topic?: string | null;
  angle?: string | null;
  visualProfile?: string | null;
  recentSelectedVoices?: readonly string[] | null;
  /** Attention & Engagement v1 — full-arc delivery fragment. */
  deliveryArcFragment?: string | null;
  openingDeliveryStyle?: string | null;
}

export function buildVideoTtsDeliveryHints(
  ctx: VideoTtsDeliveryContext,
): string[] {
  const hints: string[] = [];
  const funnel = deliveryForFunnelStage(ctx.funnelStage ?? "");
  if (funnel) hints.push(funnel);
  const mode = deliveryForCreativeMode(ctx.creativeMode);
  if (mode && !hints.includes(mode)) hints.push(mode);
  const profile = deliveryForVisualProfile(ctx.visualProfile);
  if (profile && !hints.includes(profile)) hints.push(profile);
  const roles = deliveryForNarrativeRoles(ctx.narrativeRoles);
  if (roles && !hints.some((h) => h === roles)) hints.push(roles);

  // Attention & Engagement v1 — prefer the planned delivery arc over a flat read.
  const arc = ctx.deliveryArcFragment?.trim();
  if (arc) {
    hints.push(arc);
  } else if (ctx.openingDeliveryStyle?.trim()) {
    const style = ctx.openingDeliveryStyle.trim().toLowerCase();
    if (style === "whispered") {
      hints.push("Opening: quieter intimate delivery; body stays conversational.");
    } else if (style === "deadpan") {
      hints.push("Opening: dry deadpan; then conversational body with a later lift.");
    } else if (style === "playful") {
      hints.push("Opening: lightly playful; do not stay energetic on every line.");
    }
  }

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
