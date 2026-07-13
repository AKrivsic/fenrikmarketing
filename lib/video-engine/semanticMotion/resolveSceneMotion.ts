import type { SceneType } from "@/lib/scene-types/sceneType";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";
import type { VisualProfile } from "@/lib/visual-profile/visualProfile";
import { parseVisualProfile, DEFAULT_VISUAL_PROFILE } from "@/lib/visual-profile/visualProfile";
import type { MotionType } from "@/lib/video-engine/storyboard";
import type {
  MotionIntent,
  MotionIntensity,
} from "@/lib/video-engine/semanticMotion/motionIntent";
import { SEMANTIC_MOTION_VERSION } from "@/lib/video-engine/semanticMotion/motionIntent";
import { isFramedProductVideoUsage } from "@/lib/assets/preferredVideoUsage";
import { productUiRequiresStaticMotion } from "@/lib/assets/productUiGuards";

export interface SceneMotionContext {
  sceneId: string;
  sceneType: SceneType;
  sceneIndex: number;
  sceneCount: number;
  beatIndex: number;
  beatCount: number;
  narrativeRole: string;
  visualProfile?: VisualProfile | null;
  /** Valid explicit hint from structured metadata only. */
  motionHint?: MotionIntent | null;
  /** Render usage for reused product assets (framed UI stills). */
  videoUsage?: string | null;
  /** Optional asset metadata for Product UI motion guardrails. */
  assetMetadata?: unknown;
}

export interface ResolvedSceneMotion {
  motion_intent: MotionIntent;
  motion_primitive: MotionType;
  motion_intensity: MotionIntensity;
  motion_version: string;
}

const TEXT_HEAVY_TYPES = new Set<SceneType>([
  "CHECKLIST",
  "QUOTE",
  "STATISTIC",
  "CTA",
]);

function roleDefaultIntent(role: string, ctx: SceneMotionContext): MotionIntent {
  const r = role.trim().toLowerCase();
  const isFirstBeat = ctx.beatIndex === 0;
  const isLastBeat = ctx.beatCount > 0 && ctx.beatIndex === ctx.beatCount - 1;

  if (r === "hook" || r.includes("opening") || r.startsWith("hook")) {
    return "ATTENTION";
  }
  if (isFirstBeat && (r === "observation" || r === "situation" || r === "mistake")) {
    return "ATTENTION";
  }
  if (isFirstBeat && r.includes("unexpected") && !r.includes("turn")) {
    return "ATTENTION";
  }

  if (
    r === "cta" ||
    r.includes("close") ||
    r.includes("resolution") ||
    r === "closing" ||
    r === "final"
  ) {
    return "CLOSE";
  }
  if (isLastBeat && (r === "cta" || r.includes("clos"))) {
    return "CLOSE";
  }

  if (
    r.includes("twist") ||
    r.includes("reveal") ||
    r === "unexpected_turn" ||
    r === "correct_approach" ||
    r === "solution" ||
    r.includes("product_reveal") ||
    r === "transformation"
  ) {
    return "REVEAL";
  }

  if (
    r === "punchline" ||
    r.includes("proof") ||
    r.includes("payoff") ||
    r === "key_point" ||
    r === "statistic"
  ) {
    return "EMPHASIS";
  }

  if (
    r === "observation" ||
    r === "meaning" ||
    r.includes("problem") ||
    r.includes("setup") ||
    r === "why_backfires" ||
    r === "body" ||
    r === "context" ||
    r.includes("explanation")
  ) {
    return "EXPLAIN";
  }

  return "EXPLAIN";
}

function sceneTypeDefaultIntent(type: SceneType): MotionIntent | null {
  switch (type) {
    case "CHECKLIST":
    case "QUOTE":
      return "HOLD";
    case "STATISTIC":
      return "EMPHASIS";
    case "CTA":
      return "CLOSE";
    case "PHONE":
      return "REVEAL";
    default:
      return null;
  }
}

function intentFromContext(ctx: SceneMotionContext): MotionIntent {
  if (ctx.motionHint) return ctx.motionHint;

  const fromType = sceneTypeDefaultIntent(ctx.sceneType);
  if (fromType) {
    if (
      ctx.sceneType === "STATISTIC" &&
      (ctx.narrativeRole.toLowerCase().includes("hook") ||
        ctx.narrativeRole.toLowerCase() === "hook")
    ) {
      return "HOLD";
    }
    return fromType;
  }

  const fromRole = roleDefaultIntent(ctx.narrativeRole, ctx);
  if (ctx.sceneIndex === ctx.sceneCount - 1 && ctx.sceneType === DEFAULT_SCENE_TYPE) {
    return fromRole === "ATTENTION" ? "CLOSE" : fromRole;
  }
  return fromRole;
}

function intensityForIntent(args: {
  intent: MotionIntent;
  sceneType: SceneType;
  visualProfile: VisualProfile;
  beatIndex: number;
}): MotionIntensity {
  if (TEXT_HEAVY_TYPES.has(args.sceneType)) return "LOW";
  if (args.intent === "HOLD" || args.intent === "CLOSE") return "LOW";

  if (
    args.intent === "ATTENTION" &&
    args.beatIndex === 0 &&
    args.sceneType === DEFAULT_SCENE_TYPE &&
    args.visualProfile === "BOLD"
  ) {
    return "MEDIUM";
  }

  if (args.intent === "ATTENTION" && args.beatIndex === 0) {
    return args.visualProfile === "MINIMAL" ? "LOW" : "MEDIUM";
  }

  return "LOW";
}

const INTENT_PRIMITIVES: Record<MotionIntent, readonly MotionType[]> = {
  ATTENTION: ["zoom_in", "pan_right"],
  REVEAL: ["zoom_out", "drift_up"],
  EXPLAIN: ["drift_up", "pan_left", "drift_down", "pan_right"],
  EMPHASIS: ["static", "zoom_in"],
  HOLD: ["static"],
  CLOSE: ["static", "zoom_in"],
};

function applyProfileMotionTuning(
  resolved: ResolvedSceneMotion,
  profile: VisualProfile,
  sceneType: SceneType,
): ResolvedSceneMotion {
  if (TEXT_HEAVY_TYPES.has(sceneType)) return resolved;

  if (profile === "MINIMAL") {
    let next = resolved;
    if (
      next.motion_intent === "EXPLAIN" &&
      next.motion_primitive !== "static"
    ) {
      next = { ...next, motion_primitive: "static" };
    }
    if (next.motion_intensity === "MEDIUM") {
      next = { ...next, motion_intensity: "LOW" };
    }
    return next;
  }

  if (profile === "PREMIUM") {
    return { ...resolved, motion_intensity: "LOW" };
  }

  if (
    profile === "EDITORIAL" &&
    sceneType === DEFAULT_SCENE_TYPE &&
    resolved.motion_intent === "EXPLAIN" &&
    resolved.motion_primitive.startsWith("drift")
  ) {
    const editorial: MotionType[] = ["pan_left", "pan_right"];
    const pick =
      editorial[resolved.motion_primitive.length % editorial.length] ??
      "pan_left";
    return { ...resolved, motion_primitive: pick };
  }

  return resolved;
}

function primitiveForIntent(
  intent: MotionIntent,
  selector: number,
): MotionType {
  const options = INTENT_PRIMITIVES[intent];
  return options[selector % options.length] ?? "static";
}

export function resolveSceneMotionIntent(
  ctx: SceneMotionContext,
): ResolvedSceneMotion {
  try {
    if (
      ctx.sceneType === DEFAULT_SCENE_TYPE &&
      (isFramedProductVideoUsage(ctx.videoUsage) ||
        productUiRequiresStaticMotion(ctx.assetMetadata))
    ) {
      return {
        motion_intent: "HOLD",
        motion_primitive: "static",
        motion_intensity: "LOW",
        motion_version: SEMANTIC_MOTION_VERSION,
      };
    }

    const profile =
      ctx.visualProfile && parseVisualProfile(ctx.visualProfile)
        ? ctx.visualProfile
        : DEFAULT_VISUAL_PROFILE;

    const motion_intent = intentFromContext(ctx);
    const motion_intensity = intensityForIntent({
      intent: motion_intent,
      sceneType: ctx.sceneType,
      visualProfile: profile,
      beatIndex: ctx.beatIndex,
    });

    const selector =
      ctx.sceneId.length +
      ctx.beatIndex * 7 +
      ctx.sceneIndex * 3 +
      motion_intent.length;

    let motion_primitive = primitiveForIntent(motion_intent, selector);

    if (motion_intent === "CLOSE" && motion_intensity === "LOW") {
      motion_primitive = "static";
    }
    if (motion_intent === "EMPHASIS" && TEXT_HEAVY_TYPES.has(ctx.sceneType)) {
      motion_primitive = "static";
    }

    return applyProfileMotionTuning(
      {
        motion_intent,
        motion_primitive,
        motion_intensity,
        motion_version: SEMANTIC_MOTION_VERSION,
      },
      profile,
      ctx.sceneType,
    );
  } catch {
    return {
      motion_intent: "EXPLAIN",
      motion_primitive: "drift_up",
      motion_intensity: "LOW",
      motion_version: SEMANTIC_MOTION_VERSION,
    };
  }
}

export interface BeatMotionPlanInput {
  beatIndex: number;
  beatCount: number;
  sceneId: string;
  sceneType: SceneType;
  sceneIndex: number;
  sceneCount: number;
  narrativeRole: string;
  visualProfile?: VisualProfile | null;
  previousPrimitive?: MotionType | null;
  videoUsage?: string | null;
  assetMetadata?: unknown;
}

export function resolveBeatMotionPlan(
  input: BeatMotionPlanInput,
): ResolvedSceneMotion {
  const base = resolveSceneMotionIntent({
    sceneId: input.sceneId,
    sceneType: input.sceneType,
    sceneIndex: input.sceneIndex,
    sceneCount: input.sceneCount,
    beatIndex: input.beatIndex,
    beatCount: input.beatCount,
    narrativeRole: input.narrativeRole,
    visualProfile: input.visualProfile,
    videoUsage: input.videoUsage,
    assetMetadata: input.assetMetadata,
  });

  if (
    input.sceneType !== DEFAULT_SCENE_TYPE ||
    base.motion_intent === "HOLD" ||
    base.motion_intent === "CLOSE"
  ) {
    return base;
  }

  if (
    input.previousPrimitive &&
    input.previousPrimitive === base.motion_primitive
  ) {
    const alts = INTENT_PRIMITIVES[base.motion_intent].filter(
      (p) => p !== input.previousPrimitive,
    );
    if (alts.length > 0) {
      const pick = alts[input.beatIndex % alts.length] ?? alts[0];
      return { ...base, motion_primitive: pick };
    }
  }

  return base;
}

export function legacyMotionForBeatIndex(beatIndex: number): MotionType {
  const cycle: MotionType[] = [
    "zoom_in",
    "pan_right",
    "zoom_out",
    "drift_up",
    "pan_left",
    "drift_down",
  ];
  return beatIndex === 0 ? "zoom_in" : cycle[beatIndex % cycle.length] ?? "drift_up";
}
