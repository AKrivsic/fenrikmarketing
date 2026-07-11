// Phase 8 — controlled PHONE generation (schema, prompt, guardrails, analyzer).
//   npm run check:phone-generation

import assert from "node:assert/strict";
import { buildContentPackageSchema } from "@/lib/ai/schemas/contentPackage";
import {
  buildPresentationGenerationBlock,
  buildPresentationJsonShapeLines,
} from "@/lib/ai/prompts/presentationGeneration";
import {
  generatedVisualSceneEntryValidator,
  isPhoneVisualSceneEntry,
} from "@/lib/content-package/generatedVisualScene";
import { normalizeVisualScenePlan } from "@/lib/content-package/visualScenePlan";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import {
  assetSignalsFromRef,
  deriveProjectPresentationSignals,
  type ProjectAssetSignal,
} from "@/lib/scene-types/presentation/projectSignals";
import { deriveAllowedSceneTypes } from "@/lib/scene-types/presentation/deriveAllowedSceneTypes";
import { derivePromptPresentationTypes } from "@/lib/scene-types/presentation/promptPresentationTypes";
import { applyPresentationFrequencyToPackage } from "@/lib/scene-types/presentation/presentationFrequencyGuardrail";
import { enforcePhoneVideoLimit } from "@/lib/scene-types/presentation/phoneFrequencyGuardrail";
import { applyChecklistFrequencyToPackage } from "@/lib/scene-types/presentation/checklistFrequencyGuardrail";
import { resetChecklistProductionRolloutCacheForTests } from "@/lib/scene-types/checklistProductionRollout";
import { prepareRenderScenesForLanguageVariant } from "@/lib/scene-types/languageVariantScenes";
import { emptyKnowledge } from "@/lib/knowledge/types";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { Project } from "@/lib/supabase/types";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";

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

const ROLLOUT_TEST_PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const MOBILE_ASSET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const restaurantProject = {
  goal_type: "leads",
  product_is: ["Restaurant dining"],
  product_strengths: ["Fresh local ingredients"],
  knowledge: emptyKnowledge("approved", "manual"),
} as unknown as Project;

const mobileSaasProject = {
  goal_type: "leads",
  product_is: ["Mobile SaaS app with chat inbox"],
  product_strengths: ["Native iOS and Android apps"],
  knowledge: emptyKnowledge("approved", "manual"),
} as unknown as Project;

const websiteProject = {
  goal_type: "leads",
  product_is: ["Marketing website for a local plumber"],
  product_strengths: ["Fast response", "Licensed technicians"],
  knowledge: emptyKnowledge("approved", "manual"),
} as unknown as Project;

function mobileAssetRef(): AssetRef {
  return {
    id: MOBILE_ASSET_ID,
    title: "App chat screen",
    asset_class: "static",
    media_type: "image",
    preferred_presentation: "phone_screen",
    preferred_video_usage: "framed_phone",
  };
}

function basePkg(
  visual_scenes: ContentPackageOutput["visual_scenes"],
): ContentPackageOutput {
  return {
    title: "Test",
    funnel_stage: "Awareness",
    hook: "Hook line",
    voiceover_text:
      "Open the app and tap New chat to reply from your phone instantly.",
    subtitles: "Mobile chat",
    cta: { type: "book", text: "Try the app" },
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

function withPhoneEnv<T>(
  fn: () => T,
  opts: {
    sceneTypes?: string;
    checklistMode?: string;
    checklistAllow?: string;
  } = {},
): T {
  const prevScene = process.env.SCENE_TYPES_ENABLED;
  const prevMode = process.env.CHECKLIST_GENERATION_MODE;
  const prevAllow = process.env.CHECKLIST_ENABLED_PROJECT_IDS;
  if (opts.sceneTypes !== undefined) {
    process.env.SCENE_TYPES_ENABLED = opts.sceneTypes;
  }
  if (opts.checklistMode !== undefined) {
    process.env.CHECKLIST_GENERATION_MODE = opts.checklistMode;
  }
  if (opts.checklistAllow !== undefined) {
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = opts.checklistAllow;
  }
  resetChecklistProductionRolloutCacheForTests();
  try {
    return fn();
  } finally {
    if (prevScene === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prevScene;
    if (prevMode === undefined) delete process.env.CHECKLIST_GENERATION_MODE;
    else process.env.CHECKLIST_GENERATION_MODE = prevMode;
    if (prevAllow === undefined) delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    else process.env.CHECKLIST_ENABLED_PROJECT_IDS = prevAllow;
    resetChecklistProductionRolloutCacheForTests();
  }
}

function promptTypesFor(project: Project, assets: AssetRef[] = []) {
  return derivePromptPresentationTypes({
    projectId: ROLLOUT_TEST_PROJECT_ID,
    project,
    assets: assets.map((r) => assetSignalsFromRef(r)),
  });
}

function analyzerCeiling(signals: ProjectPresentationSignals) {
  return deriveAllowedSceneTypes(
    {
      knowledge: null,
      proof: buildProofIndex(null),
      projectSignals: signals,
    },
    { sceneTypesEnabled: true },
  );
}

async function main(): Promise<void> {
  await check("1 non-mobile local business — prompt excludes PHONE", () => {
    withPhoneEnv(() => {
      const types = promptTypesFor(restaurantProject);
      assert.ok(!types.includes("PHONE"));
      assert.deepEqual(types, ["IMAGE"]);
    }, { sceneTypes: "true", checklistMode: "off" });
  });

  await check("2 mobile SaaS with approved asset — prompt includes PHONE", () => {
    withPhoneEnv(() => {
      const types = promptTypesFor(mobileSaasProject, [mobileAssetRef()]);
      assert.ok(types.includes("IMAGE"));
      assert.ok(types.includes("PHONE"));
      const block = buildPresentationGenerationBlock({ allowedTypes: types });
      assert.match(block, /Use PHONE only when/);
    }, { sceneTypes: "true", checklistMode: "off" });
  });

  await check("3 mobile SaaS without asset — AI PHONE allowed with capability", () => {
    withPhoneEnv(() => {
      const types = promptTypesFor(mobileSaasProject, []);
      assert.ok(types.includes("PHONE"));
      const shape = buildPresentationJsonShapeLines({ allowedTypes: types });
      assert.ok(shape.some((l) => l.includes("image_prompt")));
    }, { sceneTypes: "true", checklistMode: "off" });
  });

  await check("4 generic website project — PHONE excluded", () => {
    withPhoneEnv(() => {
      const types = promptTypesFor(websiteProject, []);
      assert.ok(!types.includes("PHONE"));
    }, { sceneTypes: "true", checklistMode: "off" });
  });

  await check("5 one valid PHONE scene survives analyzer", () => {
    withPhoneEnv(() => {
      const assets: ProjectAssetSignal[] = [
        {
          id: MOBILE_ASSET_ID,
          title: "App UI",
          mobileUi: true,
          phonePresentation: true,
        },
      ];
      const signals = deriveProjectPresentationSignals({
        project: mobileSaasProject,
        assets,
      });
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "PHONE",
            payload: { asset_id: MOBILE_ASSET_ID },
          },
        ],
        allowedSceneTypes: analyzerCeiling(signals),
        voiceoverText: basePkg([]).voiceover_text,
        proof: buildProofIndex(null),
        projectSignals: signals,
        projectId: ROLLOUT_TEST_PROJECT_ID,
      });
      assert.equal(r.scenes[0]?.type, "PHONE");
      assert.equal(r.decisions[0]?.rule, "allowed");
    }, { sceneTypes: "true" });
  });

  await check("6 two PHONE scenes — second frequency downgrade", () => {
    const pkg = basePkg([
      { source: "ai", image_prompt: "Intro" },
      { type: "PHONE", payload: { image_prompt: "Chat inbox mobile UI" } },
      { type: "PHONE", payload: { image_prompt: "Settings mobile UI" } },
    ] as ContentPackageOutput["visual_scenes"]);
    const { decisions } = enforcePhoneVideoLimit({
      visualScenes: pkg.visual_scenes as never,
      voiceoverText: pkg.voiceover_text,
    });
    assert.equal(decisions.length, 1);
    assert.equal(decisions[0]?.rule, "phone_video_limit_exceeded");
  });

  await check("7 unknown asset id — analyzer downgrade", () => {
    withPhoneEnv(() => {
      const signals = deriveProjectPresentationSignals({
        project: mobileSaasProject,
        assets: [],
      });
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "PHONE",
            payload: { asset_id: "00000000-0000-4000-8000-000000000099" },
          },
        ],
        allowedSceneTypes: analyzerCeiling(signals),
        voiceoverText: basePkg([]).voiceover_text,
        proof: buildProofIndex(null),
        projectSignals: signals,
      });
      assert.equal(r.scenes[0]?.type, "IMAGE");
      assert.equal(r.decisions[0]?.rule, "phone_asset_not_found");
    }, { sceneTypes: "true" });
  });

  await check("8 PHONE narration unrelated to UI — downgrade", () => {
    withPhoneEnv(() => {
      const signals = deriveProjectPresentationSignals({
        project: mobileSaasProject,
        assets: [
          {
            id: MOBILE_ASSET_ID,
            title: "App UI",
            mobileUi: true,
            phonePresentation: true,
          },
        ],
      });
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "PHONE",
            payload: { asset_id: MOBILE_ASSET_ID },
          },
        ],
        allowedSceneTypes: analyzerCeiling(signals),
        voiceoverText: "We serve fresh pasta in a cozy dining room every evening.",
        proof: buildProofIndex(null),
        projectSignals: signals,
      });
      assert.equal(r.scenes[0]?.type, "IMAGE");
      assert.equal(r.decisions[0]?.rule, "phone_narration_not_supported");
    }, { sceneTypes: "true" });
  });

  await check("9 IMAGE-only package unchanged", () => {
    const pkg = basePkg([
      { source: "ai", image_prompt: "Kitchen" },
      { source: "ai", image_prompt: "Plating" },
    ]);
    const schema = buildContentPackageSchema(["tiktok"], { requireVideo: true });
    assert.equal(schema(pkg, "$").length, 0);
    normalizeVisualScenePlan(pkg);
    assert.equal(pkg.visual_scenes?.length, 2);
  });

  await check("10 CHECKLIST behaviour unchanged with PHONE coexistence", () => {
    const pkg = basePkg([
      { source: "ai", image_prompt: "Intro" },
      {
        type: "CHECKLIST",
        payload: { items: ["Tap new chat", "Pick a template", "Send reply"] },
      },
      { type: "PHONE", payload: { image_prompt: "Chat inbox UI" } },
    ] as ContentPackageOutput["visual_scenes"]);
    pkg.voiceover_text =
      "Three steps in the app: tap new chat, pick a template, send reply. Then open the inbox on your phone.";
    applyPresentationFrequencyToPackage(pkg);
    const checklist = (pkg.visual_scenes ?? []).filter(
      (s) => typeof s === "object" && s !== null && "type" in s && (s as { type: string }).type === "CHECKLIST",
    );
    const phone = (pkg.visual_scenes ?? []).filter((s) => isPhoneVisualSceneEntry(s as never));
    assert.equal(checklist.length, 1);
    assert.equal(phone.length, 1);
  });

  await check("11 scene types disabled — PHONE excluded from prompt and downgraded", () => {
    withPhoneEnv(() => {
      const types = promptTypesFor(mobileSaasProject, [mobileAssetRef()]);
      assert.deepEqual(types, ["IMAGE"]);
      const signals = deriveProjectPresentationSignals({
        project: mobileSaasProject,
        assets: [
          {
            id: MOBILE_ASSET_ID,
            title: "App",
            mobileUi: true,
            phonePresentation: true,
          },
        ],
      });
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "PHONE",
            payload: { asset_id: MOBILE_ASSET_ID },
          },
        ],
        allowedSceneTypes: deriveAllowedSceneTypes(
          {
            knowledge: null,
            proof: buildProofIndex(null),
            projectSignals: signals,
          },
          { sceneTypesEnabled: false },
        ),
        voiceoverText: basePkg([]).voiceover_text,
        proof: buildProofIndex(null),
        projectSignals: signals,
      });
      assert.equal(r.decisions[0]?.rule, "phone_not_permitted");
    }, { sceneTypes: "false" });
  });

  await check("12 language variant cannot reuse PHONE raster", () => {
    const { scenes } = prepareRenderScenesForLanguageVariant({
      scenes: [
        {
          id: "scene-1",
          type: "PHONE",
          payload_snapshot: { asset_id: MOBILE_ASSET_ID },
          renderer_version: "phone@1",
          image_bucket: "b",
          image_path: "p",
          duration_seconds: 4,
        },
      ],
      voiceoverText: "Open the app on your phone.",
    });
    assert.equal(scenes[0]?.type, "IMAGE");
  });

  await check("13 unsupported types remain unavailable at generation", () => {
    const issues = generatedVisualSceneEntryValidator({
      type: "QUOTE",
      payload: { quote: "Great product" },
    });
    assert.ok(issues.length > 0);
    const stat = generatedVisualSceneEntryValidator({
      type: "STATISTIC",
      payload: { value: "90%", label: "growth" },
    });
    assert.ok(stat.length > 0);
    const cta = generatedVisualSceneEntryValidator({
      type: "CTA",
      payload: { headline: "Book now" },
    });
    assert.ok(cta.length > 0);
  });

  await check("14 analyzer never upgrades IMAGE to PHONE", () => {
    withPhoneEnv(() => {
      const signals = deriveProjectPresentationSignals({
        project: mobileSaasProject,
        assets: [],
      });
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "IMAGE",
            payload: {
              media: { source: "ai", image_prompt: "Office team" },
            },
          },
        ],
        allowedSceneTypes: analyzerCeiling(signals),
        voiceoverText: basePkg([]).voiceover_text,
        proof: buildProofIndex(null),
        projectSignals: signals,
      });
      assert.equal(r.scenes[0]?.type, "IMAGE");
      assert.equal(r.decisions[0]?.rule, "allowed");
    }, { sceneTypes: "true" });
  });

  await check("15 prompt and analyzer PHONE permission match", () => {
    withPhoneEnv(() => {
      const assets = [mobileAssetRef()];
      const assetSignals = assets.map((r) => assetSignalsFromRef(r));
      const promptTypes = derivePromptPresentationTypes({
        projectId: ROLLOUT_TEST_PROJECT_ID,
        project: mobileSaasProject,
        assets: assetSignals,
      });
      const signals = deriveProjectPresentationSignals({
        project: mobileSaasProject,
        assets: assetSignals,
      });
      const ceiling = deriveAllowedSceneTypes(
        {
          knowledge: null,
          proof: buildProofIndex(null),
          projectSignals: signals,
        },
        { sceneTypesEnabled: true },
      );
      const phoneInPrompt = promptTypes.includes("PHONE");
      const phoneInCeiling = ceiling.includes("PHONE");
      assert.equal(phoneInPrompt, phoneInCeiling);
    }, { sceneTypes: "true", checklistMode: "off" });
  });

  await check("PHONE payload validates at generation", () => {
    const issues = generatedVisualSceneEntryValidator({
      type: "PHONE",
      payload: { asset_id: MOBILE_ASSET_ID, caption: "Inbox" },
    });
    assert.equal(issues.length, 0);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
