// Phase 10 — controlled STATISTIC generation.
//   npm run check:statistic-generation

import assert from "node:assert/strict";
import { buildContentPackageSchema } from "@/lib/ai/schemas/contentPackage";
import { buildPresentationGenerationBlock } from "@/lib/ai/prompts/presentationGeneration";
import { buildApprovedStatisticsPromptBlock } from "@/lib/scene-types/presentation/statisticPromptCandidates";
import {
  generatedVisualSceneEntryValidator,
  isStatisticVisualSceneEntry,
} from "@/lib/content-package/generatedVisualScene";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { applyPresentationFrequencyToPackage } from "@/lib/scene-types/presentation/presentationFrequencyGuardrail";
import { enforceStatisticVideoLimit } from "@/lib/scene-types/presentation/statisticFrequencyGuardrail";
import { deriveAllowedSceneTypes } from "@/lib/scene-types/presentation/deriveAllowedSceneTypes";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import { parseStatisticFromStatement } from "@/lib/scene-types/statistic/parseStatisticCandidates";
import { derivePromptPresentationTypes } from "@/lib/scene-types/presentation/promptPresentationTypes";
import { deriveProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { prepareRenderScenesForLanguageVariant } from "@/lib/scene-types/languageVariantScenes";
import { typedPresentationViewFromDraftScene } from "@/lib/ai/workflows/videoSceneEditor";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { Project } from "@/lib/supabase/types";
import { emptyKnowledge } from "@/lib/knowledge/types";
import type { Json } from "@/lib/supabase/types";

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

function knowledgeWithProof(statements: string[]): Json {
  const k = emptyKnowledge("approved", "manual");
  k.cards.proof.statements = statements;
  return k as unknown as Json;
}

const noStatProject = {
  product_is: ["Restaurant dining"],
  product_strengths: ["Fresh ingredients"],
  knowledge: emptyKnowledge("approved", "manual"),
} as unknown as Project;

const statProject = {
  product_is: ["SaaS platform"],
  product_strengths: ["Fast onboarding"],
  knowledge: knowledgeWithProof([
    "42% of inquiries arrive outside business hours.",
    "Call us at 555-123-4567 for support.",
    "Founded in 2019.",
    "https://example.com/case-study",
  ]),
} as unknown as Project;

function basePkg(
  visual_scenes: ContentPackageOutput["visual_scenes"],
  voiceover = "42% of inquiries arrive outside business hours.",
): ContentPackageOutput {
  return {
    title: "Test",
    funnel_stage: "Awareness",
    hook: "Hook",
    voiceover_text: voiceover,
    subtitles: "Subs",
    cta: { type: "book", text: "Try it" },
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

const saasSignals = deriveProjectPresentationSignals({
  project: { product_is: ["SaaS"], product_strengths: [] },
  assets: [],
});

console.log("\nPermissions & prompts");
await check("1 no approved numeric proof → prompt excludes STATISTIC", () => {
  withEnv(() => {
    const types = derivePromptPresentationTypes({
      projectId: PROJECT_ID,
      project: noStatProject,
    });
    assert.ok(!types.includes("STATISTIC"));
  });
});

await check("2 approved numeric proof → prompt includes STATISTIC", () => {
  withEnv(() => {
    const types = derivePromptPresentationTypes({
      projectId: PROJECT_ID,
      project: statProject,
    });
    assert.ok(types.includes("STATISTIC"));
  });
});

await check("3 approved statistics block lists proof_id", () => {
  const proof = buildProofIndex(statProject.knowledge as Json);
  const block = buildApprovedStatisticsPromptBlock(proof);
  assert.ok(block);
  assert.match(block!, /proof_id: proof-statement-0/);
  assert.match(block!, /value: 42/);
});

console.log("\nCandidate extraction");
await check("4 exact percentage becomes candidate", () => {
  const c = parseStatisticFromStatement(
    "42% of inquiries arrive outside business hours.",
    "proof-statement-0",
  );
  assert.ok(c);
  assert.equal(c!.value, "42");
  assert.equal(c!.unit, "%");
});

await check("5 count with comma in statement", () => {
  const c = parseStatisticFromStatement(
    "Used by 1,200 active customers.",
    "p1",
  );
  assert.ok(c);
  assert.equal(c!.value, "1,200");
});

await check("10 phone number not candidate", () => {
  assert.equal(
    parseStatisticFromStatement("Call 555-123-4567 today.", "p"),
    null,
  );
});

await check("11 URL not candidate", () => {
  assert.equal(
    parseStatisticFromStatement("See https://example.com for details.", "p"),
    null,
  );
});

await check("11b bare year not candidate", () => {
  assert.equal(parseStatisticFromStatement("Founded in 2019.", "p"), null);
});

console.log("\nAnalyzer");
await check("6 wrong value downgrades", () => {
  withEnv(() => {
    const proof = buildProofIndex(statProject.knowledge as Json);
    const r = analyzePresentation({
      scenes: [
        {
          id: "s1",
          type: "STATISTIC",
          payload: {
            value: "40",
            unit: "%",
            label: "of inquiries arrive outside business hours",
            proof_id: "proof-statement-0",
          },
        },
      ],
      allowedSceneTypes: deriveAllowedSceneTypes(
        { knowledge: statProject.knowledge as Json, proof, projectSignals: saasSignals },
        { sceneTypesEnabled: true },
      ),
      voiceoverText: "42% of inquiries arrive outside business hours.",
      proof,
      projectSignals: saasSignals,
    });
    assert.equal(r.decisions[0]?.rule, "statistic_value_mismatch");
    assert.equal(r.decisions[0]?.final_type, "IMAGE");
  });
});

await check("7 changed unit downgrades", () => {
  withEnv(() => {
    const proof = buildProofIndex(statProject.knowledge as Json);
    const r = analyzePresentation({
      scenes: [
        {
          id: "s1",
          type: "STATISTIC",
          payload: {
            value: "42",
            unit: "hours",
            label: "of inquiries arrive outside business hours",
            proof_id: "proof-statement-0",
          },
        },
      ],
      allowedSceneTypes: ["IMAGE", "STATISTIC"],
      voiceoverText: "42% of inquiries arrive outside business hours.",
      proof,
      projectSignals: saasSignals,
    });
    assert.equal(r.decisions[0]?.rule, "statistic_value_mismatch");
  });
});

await check("8 wrong proof id downgrades", () => {
  withEnv(() => {
    const proof = buildProofIndex(statProject.knowledge as Json);
    const r = analyzePresentation({
      scenes: [
        {
          id: "s1",
          type: "STATISTIC",
          payload: {
            value: "42",
            unit: "%",
            label: "of inquiries arrive outside business hours",
            proof_id: "missing-id",
          },
        },
      ],
      allowedSceneTypes: ["IMAGE", "STATISTIC"],
      voiceoverText: "42% of inquiries arrive outside business hours.",
      proof,
      projectSignals: saasSignals,
    });
    assert.equal(r.decisions[0]?.rule, "statistic_proof_not_found");
  });
});

await check("9 vague marketing cannot pass without proof", () => {
  withEnv(() => {
    const proof = buildProofIndex(noStatProject.knowledge as Json);
    const r = analyzePresentation({
      scenes: [
        {
          id: "s1",
          type: "STATISTIC",
          payload: {
            value: "90",
            unit: "%",
            label: "faster",
            proof_id: "proof-statement-0",
          },
        },
      ],
      allowedSceneTypes: ["IMAGE"],
      voiceoverText: "We respond quickly.",
      proof,
      projectSignals: saasSignals,
    });
    assert.equal(r.decisions[0]?.rule, "statistic_not_permitted");
  });
});

await check("12 one valid STATISTIC survives", () => {
  withEnv(() => {
    const proof = buildProofIndex(statProject.knowledge as Json);
    const r = analyzePresentation({
      scenes: [
        {
          id: "s1",
          type: "STATISTIC",
          payload: {
            value: "42",
            unit: "%",
            label: "of inquiries arrive outside business hours",
            proof_id: "proof-statement-0",
          },
        },
      ],
      allowedSceneTypes: deriveAllowedSceneTypes(
        { knowledge: statProject.knowledge as Json, proof, projectSignals: saasSignals },
        { sceneTypesEnabled: true },
      ),
      voiceoverText: "42% of inquiries arrive outside business hours.",
      proof,
      projectSignals: saasSignals,
    });
    assert.equal(r.decisions[0]?.final_type, "STATISTIC");
  });
});

await check("13 two STATISTIC scenes → second downgrades", () => {
  const pkg = basePkg([
    { source: "ai", image_prompt: "Intro" },
    {
      type: "STATISTIC",
      payload: {
        value: "42",
        unit: "%",
        label: "of inquiries arrive outside business hours",
        proof_id: "proof-statement-0",
      },
    },
    {
      type: "STATISTIC",
      payload: {
        value: "42",
        unit: "%",
        label: "of inquiries arrive outside business hours",
        proof_id: "proof-statement-0",
      },
    },
  ] as ContentPackageOutput["visual_scenes"]);
  const decisions = applyPresentationFrequencyToPackage(pkg);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0]?.rule, "statistic_video_limit_exceeded");
  assert.ok(!isStatisticVisualSceneEntry(pkg.visual_scenes![2]!));
});

await check("14 narration unrelated downgrades", () => {
  withEnv(() => {
    const proof = buildProofIndex(statProject.knowledge as Json);
    const r = analyzePresentation({
      scenes: [
        {
          id: "s1",
          type: "STATISTIC",
          payload: {
            value: "42",
            unit: "%",
            label: "of inquiries arrive outside business hours",
            proof_id: "proof-statement-0",
          },
        },
      ],
      allowedSceneTypes: ["IMAGE", "STATISTIC"],
      voiceoverText: "Our team loves coffee on Monday mornings.",
      proof,
      projectSignals: saasSignals,
    });
    assert.equal(r.decisions[0]?.rule, "statistic_narration_not_supported");
  });
});

await check("15 scene types disabled → STATISTIC not permitted", () => {
  const proof = buildProofIndex(statProject.knowledge as Json);
  const r = analyzePresentation({
    scenes: [
      {
        id: "s1",
        type: "STATISTIC",
        payload: {
          value: "42",
          unit: "%",
          label: "of inquiries arrive outside business hours",
          proof_id: "proof-statement-0",
        },
      },
    ],
    allowedSceneTypes: ["IMAGE"],
    voiceoverText: "42% of inquiries arrive outside business hours.",
    proof,
    projectSignals: saasSignals,
  });
  assert.equal(r.decisions[0]?.rule, "statistic_not_permitted");
});

await check("16 IMAGE package unchanged", () => {
  const issues = generatedVisualSceneEntryValidator({
    source: "ai",
    image_prompt: "A calm workspace.",
  });
  assert.equal(issues.length, 0);
});

await check("27 unknown scene type rejected at generation", () => {
  assert.ok(
    generatedVisualSceneEntryValidator({ type: "NOT_A_TYPE", payload: {} }).length >
      0,
  );
});

await check("26 analyzer never upgrades IMAGE", () => {
  withEnv(() => {
    const proof = buildProofIndex(statProject.knowledge as Json);
    const r = analyzePresentation({
      scenes: [{ id: "s1", type: "IMAGE", payload: { media: { source: "ai", image_prompt: "x" } } }],
      allowedSceneTypes: ["IMAGE", "STATISTIC"],
      voiceoverText: "42% metric.",
      proof,
      projectSignals: saasSignals,
    });
    assert.equal(r.decisions[0]?.final_type, "IMAGE");
  });
});

await check("24 language variant cannot reuse raster", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    voiceoverText: "Localized.",
    scenes: [
      {
        id: "s1",
        type: "STATISTIC",
        payload_snapshot: {
          value: "42",
          unit: "%",
          label: "metric",
          proof_id: "p",
        },
        image_bucket: "b",
        image_path: "p.png",
      },
    ],
  });
  assert.equal(scenes[0]?.type, "IMAGE");
});

await check("25 scene editor preserves statistic metadata", () => {
  const view = typedPresentationViewFromDraftScene({
    id: "s1",
    type: "STATISTIC",
    payload_snapshot: {
      value: "42",
      unit: "%",
      label: "of inquiries arrive outside business hours",
      proof_id: "proof-statement-0",
      source_line: "Internal",
    },
    image_prompt: "",
    image_bucket: "",
    image_path: "",
    duration_seconds: 4,
  });
  assert.equal(view.statisticValue, "42");
  assert.equal(view.statisticProofId, "proof-statement-0");
});

await check("IMAGE-first statistic instructions in prompt", () => {
  const block = buildPresentationGenerationBlock({
    allowedTypes: ["IMAGE", "STATISTIC"],
  });
  assert.match(block, /IMAGE is the default presentation type/);
  assert.match(block, /At most ONE STATISTIC scene/);
  assert.match(block, /approved numerical fact directly supports/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
