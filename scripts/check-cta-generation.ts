// Phase 11 — controlled CTA generation.
//   npm run check:cta-generation

import assert from "node:assert/strict";
import { buildPresentationGenerationBlock } from "@/lib/ai/prompts/presentationGeneration";
import {
  generatedVisualSceneEntryValidator,
  isCtaVisualSceneEntry,
} from "@/lib/content-package/generatedVisualScene";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { applyPresentationFrequencyToPackage } from "@/lib/scene-types/presentation/presentationFrequencyGuardrail";
import { enforceCtaVideoLimitAndPosition } from "@/lib/scene-types/presentation/ctaFrequencyGuardrail";
import { deriveAllowedSceneTypes } from "@/lib/scene-types/presentation/deriveAllowedSceneTypes";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import { derivePromptPresentationTypes } from "@/lib/scene-types/presentation/promptPresentationTypes";
import { deriveProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { prepareRenderScenesForLanguageVariant } from "@/lib/scene-types/languageVariantScenes";
import { typedPresentationViewFromDraftScene } from "@/lib/ai/workflows/videoSceneEditor";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { Project } from "@/lib/supabase/types";
import { emptyKnowledge } from "@/lib/knowledge/types";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

const ctaProject = {
  product_is: ["SaaS platform"],
  product_strengths: ["Fast onboarding"],
  knowledge: emptyKnowledge("approved", "manual"),
  default_cta: "Book a demo",
  goal_type: "lead_generation",
} as unknown as Project;

function basePkg(
  visual_scenes: ContentPackageOutput["visual_scenes"],
  voiceover = "Ready to book a demo?",
): ContentPackageOutput {
  return {
    title: "Test",
    funnel_stage: "Conversion",
    hook: "Hook",
    voiceover_text: voiceover,
    subtitles: "Subs",
    cta: { type: "book", text: "Book a demo" },
    video: { concept: "c", script: "s", duration_seconds: "20" },
    platform_outputs: {
      tiktok: { caption: "c", cta: "Try", hashtags: [] },
      instagram: { caption: "c", cta: "Try", hashtags: [] },
      youtube: { caption: "c", cta: "Try", hashtags: [] },
      x: { caption: "c", cta: "Try", hashtags: [] },
      google_business: { caption: "c", cta: "Try" },
      linkedin: { caption: "c", cta: "Try", hashtags: [] },
      facebook: { caption: "c", cta: "Try", hashtags: [] },
    },
    visual_scenes,
  };
}

function withEnv<T>(fn: () => T, sceneTypes = "true"): T {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = sceneTypes;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
}

const signals = deriveProjectPresentationSignals({
  project: { product_is: ["SaaS"], product_strengths: [] },
  assets: [],
});

const proof = buildProofIndex(null);

function allowedCeiling() {
  return deriveAllowedSceneTypes(
    {
      knowledge: {},
      proof,
      projectSignals: signals,
      projectDefaultCta: "Book a demo",
      goalType: "lead_generation",
    },
    { sceneTypesEnabled: true },
  );
}

console.log("\nPermissions & prompts");
await check("1 scene types disabled — prompt excludes CTA", () => {
  withEnv(() => {
    const types = derivePromptPresentationTypes({
      projectId: PROJECT_ID,
      project: ctaProject,
    });
    assert.ok(!types.includes("CTA"));
  }, "false");
});

await check("2 valid package/default CTA — prompt includes CTA", () => {
  withEnv(() => {
    const types = derivePromptPresentationTypes({
      projectId: PROJECT_ID,
      project: ctaProject,
    });
    assert.ok(types.includes("CTA"));
  });
});

console.log("\nAnalyzer");
await check("3 matching CTA passes as final scene", () => {
  withEnv(() => {
    const r = analyzePresentation({
      scenes: [
        { id: "s1", type: "IMAGE", payload: { media: { source: "ai", image_prompt: "x" } } },
        {
          id: "s2",
          type: "CTA",
          payload: { headline: "Book a demo", button_label: "Book now" },
        },
      ],
      allowedSceneTypes: allowedCeiling(),
      voiceoverText: "Book a demo today.",
      proof,
      projectSignals: signals,
      packageCtaText: "Book a demo",
      projectDefaultCta: "Book a demo",
    });
    assert.equal(r.decisions[1]?.final_type, "CTA");
    assert.equal(r.decisions[1]?.rule, "allowed");
  });
});

await check("4 different action downgrades", () => {
  withEnv(() => {
    const r = analyzePresentation({
      scenes: [
        {
          id: "s1",
          type: "CTA",
          payload: { headline: "Start your free trial", button_label: "Start trial" },
        },
      ],
      allowedSceneTypes: allowedCeiling(),
      voiceoverText: "Try us.",
      proof,
      projectSignals: signals,
      packageCtaText: "Book a demo",
    });
    assert.ok(
      ["cta_action_mismatch", "cta_unsupported_claim"].includes(
        r.decisions[0]?.rule ?? "",
      ),
    );
  });
});

await check("5 invented discount downgrades", () => {
  withEnv(() => {
    const r = analyzePresentation({
      scenes: [
        {
          id: "s1",
          type: "CTA",
          payload: { headline: "50% off today only", button_label: "Claim" },
        },
      ],
      allowedSceneTypes: allowedCeiling(),
      voiceoverText: "Sale.",
      proof,
      projectSignals: signals,
      packageCtaText: "Book a demo",
    });
    assert.equal(r.decisions[0]?.rule, "cta_unsupported_claim");
  });
});

await check("6 invented urgency downgrades", () => {
  withEnv(() => {
    const r = analyzePresentation({
      scenes: [
        {
          id: "s1",
          type: "CTA",
          payload: { headline: "Act now limited time", button_label: "Hurry" },
        },
      ],
      allowedSceneTypes: allowedCeiling(),
      voiceoverText: "Go.",
      proof,
      projectSignals: signals,
      packageCtaText: "Book a demo",
    });
    assert.equal(r.decisions[0]?.rule, "cta_unsupported_claim");
  });
});

await check("7 invented guarantee downgrades", () => {
  withEnv(() => {
    const r = analyzePresentation({
      scenes: [
        {
          id: "s1",
          type: "CTA",
          payload: { headline: "Money back guarantee", button_label: "Book a demo" },
        },
      ],
      allowedSceneTypes: allowedCeiling(),
      voiceoverText: "Go.",
      proof,
      projectSignals: signals,
      packageCtaText: "Book a demo",
    });
    assert.equal(r.decisions[0]?.rule, "cta_unsupported_claim");
  });
});

await check("8 invented free trial downgrades", () => {
  withEnv(() => {
    const r = analyzePresentation({
      scenes: [
        {
          id: "s1",
          type: "CTA",
          payload: { headline: "Start your free trial", button_label: "Try free" },
        },
      ],
      allowedSceneTypes: allowedCeiling(),
      voiceoverText: "Go.",
      proof,
      projectSignals: signals,
      packageCtaText: "Book a demo",
    });
    assert.ok(
      r.decisions[0]?.rule === "cta_unsupported_claim" ||
        r.decisions[0]?.rule === "cta_action_mismatch",
    );
  });
});

await check("9 CTA in middle scene downgrades", () => {
  const pkg = basePkg([
    {
      type: "CTA",
      payload: { headline: "Book a demo", button_label: "Book now" },
    },
    { source: "ai", image_prompt: "Closing visual" },
  ] as ContentPackageOutput["visual_scenes"]);
  const { decisions } = enforceCtaVideoLimitAndPosition({
    visualScenes: pkg.visual_scenes as ContentPackageOutput["visual_scenes"],
    voiceoverText: pkg.voiceover_text,
  });
  assert.equal(decisions[0]?.rule, "cta_not_final_scene");
});

await check("10 final CTA passes frequency", () => {
  const pkg = basePkg([
    { source: "ai", image_prompt: "Intro" },
    {
      type: "CTA",
      payload: { headline: "Book a demo", button_label: "Book now" },
    },
  ] as ContentPackageOutput["visual_scenes"]);
  const { decisions } = enforceCtaVideoLimitAndPosition({
    visualScenes: pkg.visual_scenes as ContentPackageOutput["visual_scenes"],
    voiceoverText: pkg.voiceover_text,
  });
  assert.equal(decisions.length, 0);
});

await check("11 two CTA scenes — first downgraded", () => {
  const pkg = basePkg([
    { source: "ai", image_prompt: "Intro" },
    {
      type: "CTA",
      payload: { headline: "Book a demo", button_label: "Book now" },
    },
    {
      type: "CTA",
      payload: { headline: "Book a demo", button_label: "Book now" },
    },
  ] as ContentPackageOutput["visual_scenes"]);
  const decisions = applyPresentationFrequencyToPackage(pkg);
  const ctaRules = decisions.filter((d) => d.rule.startsWith("cta_"));
  assert.ok(ctaRules.length >= 1);
  assert.ok(!isCtaVisualSceneEntry(pkg.visual_scenes![1]!));
});

await check("12 scene types disabled — CTA not permitted", () => {
  const r = analyzePresentation({
    scenes: [
      {
        id: "s1",
        type: "CTA",
        payload: { headline: "Book a demo" },
      },
    ],
    allowedSceneTypes: ["IMAGE"],
    voiceoverText: "Book a demo.",
    proof,
    projectSignals: signals,
    packageCtaText: "Book a demo",
  });
  assert.equal(r.decisions[0]?.rule, "cta_not_permitted");
});

await check("13 IMAGE-only package unchanged", () => {
  assert.equal(
    generatedVisualSceneEntryValidator({
      source: "ai",
      image_prompt: "Calm workspace.",
    }).length,
    0,
  );
});

await check("25 analyzer never upgrades IMAGE", () => {
  withEnv(() => {
    const r = analyzePresentation({
      scenes: [{ id: "s1", type: "IMAGE", payload: { media: { source: "ai", image_prompt: "x" } } }],
      allowedSceneTypes: allowedCeiling(),
      voiceoverText: "Book a demo.",
      proof,
      projectSignals: signals,
      packageCtaText: "Book a demo",
    });
    assert.equal(r.decisions[0]?.final_type, "IMAGE");
  });
});

await check("23 language variant cannot reuse CTA raster", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    voiceoverText: "Localized.",
    scenes: [
      {
        id: "s1",
        type: "CTA",
        payload_snapshot: { headline: "Book a demo" },
        image_bucket: "b",
        image_path: "p.png",
      },
    ],
  });
  assert.equal(scenes[0]?.type, "IMAGE");
});

await check("24 scene editor preserves CTA metadata", () => {
  const view = typedPresentationViewFromDraftScene({
    id: "s1",
    type: "CTA",
    payload_snapshot: {
      headline: "Book a demo",
      subline: "Short line",
      button_label: "Book now",
      show_logo: true,
    },
    image_prompt: "",
    image_bucket: "",
    image_path: "",
    duration_seconds: 4,
  });
  assert.equal(view.ctaHeadline, "Book a demo");
  assert.equal(view.ctaButtonLabel, "Book now");
});

await check("CTA optional prompt rules present", () => {
  const block = buildPresentationGenerationBlock({
    allowedTypes: ["IMAGE", "CTA"],
  });
  assert.match(block, /genuinely the strongest/);
  assert.match(block, /Do not add CTA scenes for frequency or habit/);
  assert.match(block, /FINAL visual scene only/);
});

await check("26 unsupported scene type rejected at generation", () => {
  assert.ok(
    generatedVisualSceneEntryValidator({ type: "NOT_A_TYPE", payload: {} }).length >
      0,
  );
});

await check("valid CTA generation schema", () => {
  assert.equal(
    generatedVisualSceneEntryValidator({
      type: "CTA",
      payload: { headline: "Book a demo", button_label: "Book now" },
    }).length,
    0,
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
