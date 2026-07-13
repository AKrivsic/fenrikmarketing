import type { PackageVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import {
  isCtaVisualSceneEntry,
} from "@/lib/content-package/generatedVisualScene";
import { normalizeFunnelStage, type FunnelStage } from "@/lib/ai/types";
import type { SceneTypeProjectHistory } from "@/lib/scene-types/presentation/sceneTypeProjectHistory";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import { enforceCtaVideoLimitAndPosition } from "@/lib/scene-types/presentation/ctaFrequencyGuardrail";
import { narrationForScene } from "@/lib/scene-types/presentation/downgradeToImage";

export interface TypedCtaPolicyDecision {
  allow_typed_cta: boolean;
  reason: string;
}

export interface TypedCtaGuardrailDecision {
  scene_id: string;
  rule: "typed_cta_series_suppressed" | "typed_cta_funnel_unlikely";
  reason: string;
}

function funnelTypedCtaStance(
  stage: FunnelStage | null,
): "unlikely" | "optional" | "likely" {
  switch (stage) {
    case "conversion":
      return "likely";
    case "solution_aware":
      return "optional";
    case "problem_aware":
    case "awareness":
    default:
      return "unlikely";
  }
}

export function evaluateTypedCtaPolicy(args: {
  funnelStage: unknown;
  history: SceneTypeProjectHistory;
  series: SeriesCreativeContext;
  requestedTypedCta: boolean;
}): TypedCtaPolicyDecision {
  if (!args.requestedTypedCta) {
    return {
      allow_typed_cta: false,
      reason: "no typed CTA requested in visual plan",
    };
  }

  const stage = normalizeFunnelStage(args.funnelStage);
  const stance = funnelTypedCtaStance(stage);

  if (args.history.ctaUsedInRecentWindow) {
    return {
      allow_typed_cta: false,
      reason:
        "recent package already used a typed CTA; prefer narrative close or spoken CTA",
    };
  }

  if (args.series.typedCtaInCurrentRun >= 1 && stance !== "likely") {
    return {
      allow_typed_cta: false,
      reason:
        "another package in this production run already ends with typed CTA",
    };
  }

  if (args.series.typedCtaInWeeklyStrategy >= 2 && stance !== "likely") {
    return {
      allow_typed_cta: false,
      reason:
        "weekly strategy already has multiple typed CTA endings; prefer variety",
    };
  }

  if (stance === "unlikely") {
    return {
      allow_typed_cta: false,
      reason: `funnel stage ${stage ?? "unknown"} usually closes without typed CTA card`,
    };
  }

  if (stance === "optional") {
    if (args.series.typedCtaInCurrentRun >= 2) {
      return {
        allow_typed_cta: false,
        reason: "run already has two typed CTAs; use insight or product visual close",
      };
    }
    return {
      allow_typed_cta: true,
      reason: "solution-aware stage allows optional typed CTA when not overused",
    };
  }

  // likely (conversion) — still not mandatory
  if (args.series.typedCtaInCurrentRun >= 3) {
    return {
      allow_typed_cta: false,
      reason: "conversion run already saturated with typed CTA endings",
    };
  }

  return {
    allow_typed_cta: true,
    reason: "conversion stage may use typed CTA when copy is explicit",
  };
}

export function applyTypedCtaSeriesPolicyToVisualScenes(args: {
  visualScenes: PackageVisualSceneEntry[];
  voiceoverText: string;
  funnelStage: unknown;
  history: SceneTypeProjectHistory;
  series: SeriesCreativeContext;
}): {
  scenes: PackageVisualSceneEntry[];
  policy: TypedCtaPolicyDecision;
  guardrailDecisions: TypedCtaGuardrailDecision[];
} {
  const requested = args.visualScenes.some((e) => isCtaVisualSceneEntry(e));
  const policy = evaluateTypedCtaPolicy({
    funnelStage: args.funnelStage,
    history: args.history,
    series: args.series,
    requestedTypedCta: requested,
  });

  if (policy.allow_typed_cta || !requested) {
    return {
      scenes: args.visualScenes,
      policy,
      guardrailDecisions: [],
    };
  }

  const scenes = [...args.visualScenes];
  const guardrailDecisions: TypedCtaGuardrailDecision[] = [];
  const count = scenes.length;
  const lastIndex = count - 1;
  const last = scenes[lastIndex];
  if (!last || !isCtaVisualSceneEntry(last)) {
    return { scenes, policy, guardrailDecisions };
  }

  const narration = narrationForScene({
    voiceoverText: args.voiceoverText,
    sceneIndex: lastIndex,
    sceneCount: count,
  });
  const closingLine = narration.trim() || "Calm narrative conclusion for the final beat.";
  scenes[lastIndex] = {
    source: "ai",
    image_prompt:
      `Portrait 9:16 vertical closing still — natural narrative conclusion without on-screen text or buttons. ` +
      `Visual mood supports this spoken closing thought: ${closingLine.slice(0, 160)}. ` +
      `Believable environment, soft lighting, no readable text, no UI mockups.`,
  };

  guardrailDecisions.push({
    scene_id: `scene-${lastIndex + 1}`,
    rule:
      policy.reason.includes("funnel")
        ? "typed_cta_funnel_unlikely"
        : "typed_cta_series_suppressed",
    reason: policy.reason,
  });

  return {
    scenes: enforceCtaVideoLimitAndPosition({
      visualScenes: scenes,
      voiceoverText: args.voiceoverText,
    }).scenes,
    policy,
    guardrailDecisions,
  };
}
