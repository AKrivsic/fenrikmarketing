// npm run check:visual-medium-product-reveal
import assert from "node:assert/strict";
import type { Project } from "@/lib/supabase/types";
import { resolveVisualMedium } from "@/lib/visual-medium/resolveVisualMedium";
import { scoreVisualMediumAuto } from "@/lib/visual-medium/scoreVisualMedium";
import {
  DEFAULT_VISUAL_MEDIUM,
  parseVisualMedium,
} from "@/lib/visual-medium/visualMedium";
import {
  mergeVisualMediumIntoKnowledge,
  validateVisualMediumSave,
  VISUAL_MEDIUM_UI_OPTIONS,
} from "@/lib/visual-medium/presentationVisualMedium";
import {
  visualMediumFieldsForJobInput,
  parseVisualMediumFromJobInput,
} from "@/lib/visual-medium/packageVisualMedium";
import {
  promptAlreadyContainsMediumSuffix,
  visualMediumImagePromptBlock,
  visualMediumImagePromptSuffix,
  VISUAL_MEDIUM_PROMPT_HEADER,
} from "@/lib/visual-medium/imagePromptMedium";
import {
  framedAssetExpectedToSurviveSafety,
  resolveProductRevealPlan,
  safeUsedAsForVideoUsage,
  UNSAFE_FRAMED_COMPOSITION_EXAMPLE,
} from "@/lib/product-reveal/resolveProductReveal";
import {
  buildProductRevealPromptBlock,
  PRODUCT_REVEAL_PROMPT_HEADER,
} from "@/lib/product-reveal/promptBlocks";
import {
  downgradeUnrenderableAssetScenes,
  isAssetSceneRenderableByCurrentPipeline,
} from "@/lib/assets/assetRendererEligibility";
import { fingerprintFromPackageBrief } from "@/lib/series/creativeFingerprints";
import type { VisualNarrativePlan } from "@/lib/visual-narrative/types";
import type { VisualProfile } from "@/lib/visual-profile/visualProfile";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log("  ok ", name);
  } catch (err) {
    failed++;
    console.error(" FAIL", name, err);
  }
}

function mockProject(partial: Partial<Project>): Project {
  return {
    id: "proj-medium-test",
    type: "saas",
    product_is: [],
    product_strengths: [],
    ...partial,
  } as Project;
}

function minimalNarrative(
  carrier: VisualNarrativePlan["primary_meaning_carrier"],
): VisualNarrativePlan {
  return {
    version: "visual-narrative@1",
    primary_meaning_carrier: carrier,
    subject_focus: "test subject",
    supporting_carriers: [],
    product_world_hints: [],
    recent_motif_counts: {},
    key: `test-${carrier}`,
  };
}

const narrativeProcess = minimalNarrative("process");
const narrativeHuman = minimalNarrative("human");
const narrativeComparison = minimalNarrative("comparison");

check("1 legacy package without medium → PHOTOGRAPHIC job input", () => {
  const fields = visualMediumFieldsForJobInput({ presentation_generation: null });
  assert.equal(fields.visual_medium, "PHOTOGRAPHIC");
  assert.equal(parseVisualMediumFromJobInput({}), "PHOTOGRAPHIC");
});

check("2 explicit project medium override wins", () => {
  const r = resolveVisualMedium({
    projectId: "p1",
    knowledge: { presentation: { visual_medium: "SOFT_3D" } },
    project: mockProject({}),
    funnelStage: "awareness",
    visualProfile: "MINIMAL",
    primaryCarrier: null,
    identity: null,
    recentMediumCounts: {},
  });
  assert.equal(r.medium, "SOFT_3D");
  assert.equal(r.source, "override");
});

check("3 AUTO uses semantic scoring not projectId hash", () => {
  const src = scoreVisualMediumAuto.toString();
  assert.ok(!src.includes("projectId"));
  const ctx = {
    project: mockProject({
      product_is: ["SaaS workflow automation platform"],
      product_strengths: ["pipeline modules"],
    }),
    funnelStage: "solution_aware" as const,
    visualProfile: "MINIMAL" as VisualProfile,
    primaryCarrier: "process" as const,
    identity: null,
    recentMediumCounts: {},
  };
  const scored = scoreVisualMediumAuto(ctx);
  assert.ok(scored.scores.CLEAN_ILLUSTRATION > 0 || scored.scores.SOFT_3D > 0);
  assert.notEqual(scored.medium, "PHOTOGRAPHIC");
});

check("4 same inputs resolve deterministically", () => {
  const ctx = {
    projectId: "stable",
    knowledge: null,
    project: mockProject({
      product_is: ["dental clinic for anxious patients"],
    }),
    funnelStage: "awareness" as const,
    visualProfile: "NATURAL" as VisualProfile,
    primaryCarrier: "human" as const,
    identity: null,
    recentMediumCounts: {},
  };
  const a = resolveVisualMedium(ctx);
  const b = resolveVisualMedium(ctx);
  assert.equal(a.medium, b.medium);
  assert.deepEqual(a.scores, b.scores);
});

check("5 recent medium repetition influences close scores", () => {
  const base = {
    project: mockProject({
      product_is: ["mobile app modules and automation pipeline"],
    }),
    funnelStage: "solution_aware" as const,
    visualProfile: "MINIMAL" as VisualProfile,
    primaryCarrier: "process" as const,
    identity: null,
    recentMediumCounts: {},
  };
  const without = scoreVisualMediumAuto(base);
  const withRepeat = scoreVisualMediumAuto({
    ...base,
    recentMediumCounts: { [without.medium]: 3 },
  });
  assert.notEqual(without.medium, withRepeat.medium);
});

check("6 unsuitable medium not chosen for service human content", () => {
  const scored = scoreVisualMediumAuto({
    project: mockProject({
      product_is: ["dental clinic patient care"],
    }),
    funnelStage: "awareness",
    visualProfile: "NATURAL",
    primaryCarrier: "human",
    identity: null,
    recentMediumCounts: {},
  });
  assert.equal(scored.medium, "PHOTOGRAPHIC");
  assert.ok(scored.scores.GRAPHIC_COLLAGE < scored.scores.PHOTOGRAPHIC);
});

check("7 SaaS abstract workflow not locked to PHOTOGRAPHIC", () => {
  const scored = scoreVisualMediumAuto({
    project: mockProject({
      product_is: ["B2B SaaS software platform"],
      product_strengths: ["workflow automation"],
    }),
    funnelStage: "solution_aware",
    visualProfile: "MINIMAL",
    primaryCarrier: "process",
    identity: null,
    recentMediumCounts: {},
  });
  assert.notEqual(scored.medium, "PHOTOGRAPHIC");
});

check("8 dentist/service can prefer PHOTOGRAPHIC", () => {
  const scored = scoreVisualMediumAuto({
    project: mockProject({
      product_is: ["family dental clinic"],
    }),
    funnelStage: "awareness",
    visualProfile: "NATURAL",
    primaryCarrier: "place",
    identity: null,
    recentMediumCounts: {},
  });
  assert.equal(scored.medium, "PHOTOGRAPHIC");
});

check("9 blueprint/process content can prefer TECHNICAL_BLUEPRINT", () => {
  const scored = scoreVisualMediumAuto({
    project: mockProject({
      product_is: ["architecture planning blueprint specification flow"],
    }),
    funnelStage: "awareness",
    visualProfile: "EDITORIAL",
    primaryCarrier: "process",
    identity: null,
    recentMediumCounts: {},
  });
  assert.equal(scored.medium, "TECHNICAL_BLUEPRINT");
});

check("10 abstract workflow prefers illustration or soft 3D", () => {
  const scored = scoreVisualMediumAuto({
    project: mockProject({
      product_is: ["abstract workflow automation mobile app modules"],
    }),
    funnelStage: "solution_aware",
    visualProfile: "MINIMAL",
    primaryCarrier: "transformation",
    identity: null,
    recentMediumCounts: {},
  });
  assert.ok(
    scored.medium === "CLEAN_ILLUSTRATION" || scored.medium === "SOFT_3D",
  );
});

check("11 GRAPHIC_COLLAGE only when comparison/fragment concept fits", () => {
  const weak = scoreVisualMediumAuto({
    project: mockProject({ product_is: ["dental clinic"] }),
    funnelStage: "awareness",
    visualProfile: "NATURAL",
    primaryCarrier: "human",
    identity: null,
    recentMediumCounts: {},
  });
  assert.notEqual(weak.medium, "GRAPHIC_COLLAGE");
  const strong = scoreVisualMediumAuto({
    project: mockProject({
      product_is: ["compare competitor reviews fragment overload"],
    }),
    funnelStage: "awareness",
    visualProfile: "BOLD",
    primaryCarrier: "comparison",
    identity: null,
    recentMediumCounts: {},
  });
  assert.equal(strong.medium, "GRAPHIC_COLLAGE");
});

check("12 worker gets one medium suffix line", () => {
  const suffix = visualMediumImagePromptSuffix("CLEAN_ILLUSTRATION");
  assert.ok(suffix.length > 0);
  assert.ok(!suffix.includes("\n"));
  const dupPrompt = `Scene ${suffix}`;
  assert.ok(
    promptAlreadyContainsMediumSuffix(dupPrompt, "CLEAN_ILLUSTRATION"),
  );
  assert.ok(
    !promptAlreadyContainsMediumSuffix("plain scene", "CLEAN_ILLUSTRATION"),
  );
});

check("13 package prompt block declares single VISUAL MEDIUM header", () => {
  const block = visualMediumImagePromptBlock("SOFT_3D");
  const count = block.split(VISUAL_MEDIUM_PROMPT_HEADER).length - 1;
  assert.equal(count, 1);
});

check("14 product reveal never forces asset without tier asset", () => {
  const plan = resolveProductRevealPlan({
    project: mockProject({}),
    generationMode: "production",
    assets: [],
    narrative: narrativeProcess,
    visualMedium: "CLEAN_ILLUSTRATION",
  });
  assert.ok(
    plan.solution_beat_strategy !== "REAL_ASSET" &&
      plan.solution_beat_strategy !== "FRAMED_ASSET",
  );
});

check("15 unsupported asset composition falls back safely", () => {
  const plan = resolveProductRevealPlan({
    project: mockProject({}),
    generationMode: "production",
    assets: [
      {
        id: "a1",
        title: "Low tier",
        asset_class: "static",
        media_type: "image",
        preferred_video_usage: "fullscreen",
      },
    ],
    narrative: narrativeHuman,
    visualMedium: "PHOTOGRAPHIC",
  });
  assert.ok(
    ["ABSTRACT_PRODUCT_SYSTEM", "PRODUCT_OUTCOME", "NO_PRODUCT_VISUAL"].includes(
      plan.solution_beat_strategy,
    ),
  );
});

check("16 sample mode requires final-third payoff direction", () => {
  const plan = resolveProductRevealPlan({
    project: mockProject({}),
    generationMode: "sample",
    assets: [],
    narrative: narrativeProcess,
    visualMedium: "TECHNICAL_BLUEPRINT",
  });
  assert.equal(plan.sample_payoff_visual_required, true);
  const block = buildProductRevealPromptBlock(plan);
  assert.ok(block.includes("SAMPLE PAYOFF"));
});

check("17 product reveal prompt forbids readable fake UI", () => {
  const block = buildProductRevealPromptBlock(
    resolveProductRevealPlan({
      project: mockProject({}),
      generationMode: "production",
      assets: [],
      narrative: narrativeProcess,
      visualMedium: "CLEAN_ILLUSTRATION",
    }),
  );
  assert.ok(block.includes("No fake UI"));
  assert.ok(block.includes("Do NOT generate readable"));
  assert.equal(block.split(PRODUCT_REVEAL_PROMPT_HEADER).length - 1, 1);
});

check("18 series fingerprints include medium and reveal strategy", () => {
  const fp = fingerprintFromPackageBrief({
    brief: {
      presentation_generation: {
        visual_medium: "SOFT_3D",
        product_reveal: { solution_beat_strategy: "ABSTRACT_PRODUCT_SYSTEM" },
        visual_narrative: { primary_meaning_carrier: "process" },
      },
      visual_scenes: [],
    },
  });
  assert.equal(fp.visual_medium, "SOFT_3D");
  assert.equal(fp.product_reveal_strategy, "ABSTRACT_PRODUCT_SYSTEM");
  assert.equal(fp.meaning_carrier, "process");
});

check("19 UI saves Automatic and explicit media correctly", () => {
  const v = validateVisualMediumSave({ visualMediumSelection: "auto" });
  assert.equal(v.ok, true);
  if (v.ok) {
    const k = mergeVisualMediumIntoKnowledge(
      { presentation: { visual_profile: "MINIMAL" } },
      v.choice,
    ) as Record<string, Record<string, unknown>>;
    assert.equal(k.presentation?.visual_medium, undefined);
    assert.equal(k.presentation?.visual_profile, "MINIMAL");
  }
  const explicit = validateVisualMediumSave({
    visualMediumSelection: "TECHNICAL_BLUEPRINT",
  });
  assert.equal(explicit.ok, true);
  if (explicit.ok) {
    const k2 = mergeVisualMediumIntoKnowledge({}, explicit.choice) as Record<
      string,
      Record<string, unknown>
    >;
    assert.equal(k2.presentation?.visual_medium, "TECHNICAL_BLUEPRINT");
  }
  assert.equal(VISUAL_MEDIUM_UI_OPTIONS[0]?.value, "auto");
});

check("20 DEFAULT_VISUAL_MEDIUM is PHOTOGRAPHIC", () => {
  assert.equal(DEFAULT_VISUAL_MEDIUM, "PHOTOGRAPHIC");
  assert.equal(parseVisualMedium(undefined), null);
});

// --- Product Reveal v2 ---

const tier1UiAsset = {
  id: "ui-tier1",
  title: "Product dashboard",
  asset_class: "static",
  media_type: "image",
  product_role: "product_ui" as const,
  preferred_video_usage: "framed_phone" as const,
};

check("21 PR v2: unsafe people composition is not planned as FRAMED_ASSET", () => {
  const fit = isAssetSceneRenderableByCurrentPipeline({
    assetClass: "static",
    usedAs: UNSAFE_FRAMED_COMPOSITION_EXAMPLE,
    videoUsage: "framed_phone",
    modify: "false",
  });
  assert.equal(fit.renderable, false);
  assert.equal(fit.reason, "needs_full_scene");

  // Even with a tier-1 framed asset, human-carrier stories skip FRAMED
  // (people/hands compositions would be repaired by Asset Safety later).
  const plan = resolveProductRevealPlan({
    project: mockProject({}),
    generationMode: "production",
    assets: [tier1UiAsset],
    narrative: narrativeHuman,
    visualMedium: "PHOTOGRAPHIC",
  });
  assert.notEqual(plan.solution_beat_strategy, "FRAMED_ASSET");
  assert.notEqual(plan.solution_beat_strategy, "REAL_ASSET");
  assert.equal(plan.solution_beat_strategy, "PRODUCT_OUTCOME");
  assert.ok(
    !framedAssetExpectedToSurviveSafety({
      asset: tier1UiAsset,
      usedAs: UNSAFE_FRAMED_COMPOSITION_EXAMPLE,
      videoUsage: "framed_phone",
    }),
  );
});

check("22 PR v2: high-confidence framed insert still selects FRAMED_ASSET", () => {
  const safeUsedAs = safeUsedAsForVideoUsage("framed_phone");
  assert.ok(safeUsedAs);
  assert.ok(
    framedAssetExpectedToSurviveSafety({
      asset: tier1UiAsset,
      usedAs: safeUsedAs!,
      videoUsage: "framed_phone",
    }),
  );
  const plan = resolveProductRevealPlan({
    project: mockProject({}),
    generationMode: "production",
    assets: [tier1UiAsset],
    narrative: narrativeProcess,
    visualMedium: "CLEAN_ILLUSTRATION",
  });
  assert.equal(plan.solution_beat_strategy, "FRAMED_ASSET");
  assert.ok(plan.reasons.some((r) => r.startsWith("asset_framed_safe:")));
});

check("23 PR v2: PRODUCT_OUTCOME when renderer cannot deliver framed insert", () => {
  const plan = resolveProductRevealPlan({
    project: mockProject({}),
    generationMode: "production",
    assets: [
      {
        ...tier1UiAsset,
        id: "ui-fullscreen",
        preferred_video_usage: "fullscreen",
      },
    ],
    narrative: narrativeHuman,
    visualMedium: "PHOTOGRAPHIC",
  });
  assert.equal(plan.solution_beat_strategy, "PRODUCT_OUTCOME");
});

check("24 PR v2: ABSTRACT_PRODUCT_SYSTEM when it is the stronger reveal", () => {
  const plan = resolveProductRevealPlan({
    project: mockProject({}),
    generationMode: "production",
    assets: [
      {
        ...tier1UiAsset,
        id: "ui-bg",
        preferred_video_usage: "background",
        video_suitability: "background_only",
      },
    ],
    narrative: narrativeProcess,
    visualMedium: "TECHNICAL_BLUEPRINT",
  });
  assert.equal(plan.solution_beat_strategy, "ABSTRACT_PRODUCT_SYSTEM");
});

check("25 PR v2: Asset Safety downgrade behaviour unchanged", () => {
  const result = downgradeUnrenderableAssetScenes({
    scenes: [
      {
        source: "asset",
        asset_id: "ui-tier1",
        used_as: UNSAFE_FRAMED_COMPOSITION_EXAMPLE,
        video_usage: "framed_phone",
      },
    ],
    classById: new Map([["ui-tier1", "static"]]),
  });
  assert.equal(result.downgradedCount, 1);
  assert.equal((result.scenes[0] as { source: string }).source, "ai");
  assert.equal(result.reasons[0], "needs_full_scene");

  const ok = downgradeUnrenderableAssetScenes({
    scenes: [
      {
        source: "asset",
        asset_id: "ui-tier1",
        used_as: safeUsedAsForVideoUsage("framed_phone")!,
        video_usage: "framed_phone",
      },
    ],
    classById: new Map([["ui-tier1", "static"]]),
  });
  assert.equal(ok.downgradedCount, 0);
  assert.equal((ok.scenes[0] as { source: string }).source, "asset");
});

check("26 PR v2: REAL_ASSET for floating_card / ui_hero when safe", () => {
  const plan = resolveProductRevealPlan({
    project: mockProject({}),
    generationMode: "production",
    assets: [
      {
        ...tier1UiAsset,
        id: "ui-hero",
        preferred_video_usage: "ui_hero",
      },
    ],
    narrative: narrativeProcess,
    visualMedium: "CLEAN_ILLUSTRATION",
  });
  assert.equal(plan.solution_beat_strategy, "REAL_ASSET");
});

console.log("");
console.log(`check:visual-medium-product-reveal — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
