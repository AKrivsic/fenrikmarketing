// Phase 9 — controlled QUOTE generation.
//   npm run check:quote-generation

import assert from "node:assert/strict";
import { buildContentPackageSchema } from "@/lib/ai/schemas/contentPackage";
import { buildPresentationGenerationBlock } from "@/lib/ai/prompts/presentationGeneration";
import { buildApprovedQuotesPromptBlock } from "@/lib/scene-types/presentation/quotePromptCandidates";
import {
  generatedVisualSceneEntryValidator,
  isQuoteVisualSceneEntry,
} from "@/lib/content-package/generatedVisualScene";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { applyPresentationFrequencyToPackage } from "@/lib/scene-types/presentation/presentationFrequencyGuardrail";
import { enforceQuoteVideoLimit } from "@/lib/scene-types/presentation/quoteFrequencyGuardrail";
import { deriveAllowedSceneTypes } from "@/lib/scene-types/presentation/deriveAllowedSceneTypes";
import { buildProofIndex, quoteTextMatchesApproved } from "@/lib/scene-types/presentation/proofIndex";
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

function knowledgeWithQuote(statements: string[]): Json {
  const k = emptyKnowledge("approved", "manual");
  k.cards.proof.statements = statements;
  return k as unknown as Json;
}

const noQuoteProject = {
  product_is: ["Restaurant dining"],
  product_strengths: ["Fresh ingredients"],
  knowledge: emptyKnowledge("approved", "manual"),
} as unknown as Project;

const quoteProject = {
  product_is: ["SaaS platform"],
  product_strengths: ["Fast onboarding"],
  knowledge: knowledgeWithQuote([
    "We cut our response time dramatically. — Jane Smith, Example Co.",
  ]),
} as unknown as Project;

const APPROVED_QUOTE = "We cut our response time dramatically.";
const APPROVED_ATTR = "Jane Smith, Example Co.";
const PROOF_ID = "proof-statement-0";

function basePkg(
  visual_scenes: ContentPackageOutput["visual_scenes"],
  voiceover = "Hear what this customer said about response time.",
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

async function main(): Promise<void> {
  await check("1 no approved quotes — prompt excludes QUOTE", () => {
    withEnv(() => {
      const types = derivePromptPresentationTypes({
        projectId: PROJECT_ID,
        project: noQuoteProject,
      });
      assert.ok(!types.includes("QUOTE"));
    });
  });

  await check("2 project with approved quote — prompt includes QUOTE", () => {
    withEnv(() => {
      const types = derivePromptPresentationTypes({
        projectId: PROJECT_ID,
        project: quoteProject,
      });
      assert.ok(types.includes("QUOTE"));
      const block = buildApprovedQuotesPromptBlock(
        buildProofIndex(quoteProject.knowledge as Json),
      );
      assert.ok(block?.includes(PROOF_ID));
    });
  });

  await check("3 exact approved quote passes analyzer", () => {
    withEnv(() => {
      const proof = buildProofIndex(quoteProject.knowledge as Json);
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "QUOTE",
            payload: {
              quote: APPROVED_QUOTE,
              attribution: APPROVED_ATTR,
              proof_id: PROOF_ID,
            },
          },
        ],
        allowedSceneTypes: deriveAllowedSceneTypes(
          { knowledge: quoteProject.knowledge as Json, proof, projectSignals: deriveProjectPresentationSignals({ project: quoteProject, assets: [] }) },
          { sceneTypesEnabled: true },
        ),
        voiceoverText: "One customer shared how we improved response time.",
        proof,
        projectSignals: deriveProjectPresentationSignals({ project: quoteProject, assets: [] }),
      });
      assert.equal(r.decisions[0]?.rule, "allowed");
    });
  });

  await check("4 punctuation-only quote difference passes", () => {
    assert.ok(
      quoteTextMatchesApproved(
        APPROVED_QUOTE,
        `"${APPROVED_QUOTE}"`,
      ),
    );
  });

  await check("5 fabricated quote downgrades", () => {
    withEnv(() => {
      const proof = buildProofIndex(quoteProject.knowledge as Json);
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "QUOTE",
            payload: {
              quote: "Customers love how easy it is forever.",
              attribution: APPROVED_ATTR,
              proof_id: PROOF_ID,
            },
          },
        ],
        allowedSceneTypes: ["IMAGE", "QUOTE"],
        voiceoverText: "Customer feedback.",
        proof,
        projectSignals: deriveProjectPresentationSignals({ project: quoteProject, assets: [] }),
      });
      assert.equal(r.decisions[0]?.rule, "quote_text_mismatch");
    });
  });

  await check("6 wrong proof id downgrades", () => {
    withEnv(() => {
      const proof = buildProofIndex(quoteProject.knowledge as Json);
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "QUOTE",
            payload: {
              quote: APPROVED_QUOTE,
              attribution: APPROVED_ATTR,
              proof_id: "proof-statement-99",
            },
          },
        ],
        allowedSceneTypes: ["IMAGE", "QUOTE"],
        voiceoverText: "Customer feedback.",
        proof,
        projectSignals: deriveProjectPresentationSignals({ project: quoteProject, assets: [] }),
      });
      assert.equal(r.decisions[0]?.rule, "quote_proof_not_found");
    });
  });

  await check("7 wrong attribution downgrades", () => {
    withEnv(() => {
      const proof = buildProofIndex(quoteProject.knowledge as Json);
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "QUOTE",
            payload: {
              quote: APPROVED_QUOTE,
              attribution: "Wrong Person, Other Co.",
              proof_id: PROOF_ID,
            },
          },
        ],
        allowedSceneTypes: ["IMAGE", "QUOTE"],
        voiceoverText: "Customer feedback.",
        proof,
        projectSignals: deriveProjectPresentationSignals({ project: quoteProject, assets: [] }),
      });
      assert.equal(r.decisions[0]?.rule, "quote_attribution_mismatch");
    });
  });

  await check("8 changed numeric claim downgrades", () => {
    withEnv(() => {
      const proof = buildProofIndex(
        knowledgeWithQuote(["This product saves us hours every week. — Alex, Ops"]),
      );
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "QUOTE",
            payload: {
              quote: "This product saves us 99 hours every week.",
              attribution: "Alex, Ops",
              proof_id: "proof-statement-0",
            },
          },
        ],
        allowedSceneTypes: ["IMAGE", "QUOTE"],
        voiceoverText: "Customer results.",
        proof,
        projectSignals: deriveProjectPresentationSignals({ project: quoteProject, assets: [] }),
      });
      assert.equal(r.decisions[0]?.rule, "quote_text_mismatch");
    });
  });

  await check("9 product brain sentence is not a quote candidate", () => {
    const proof = buildProofIndex(
      knowledgeWithQuote(["We help teams work faster and stay organized."]),
    );
    assert.equal(proof.quoteCandidates.length, 0);
  });

  await check("10 one QUOTE survives frequency guard", () => {
    const pkg = basePkg([
      { source: "ai", image_prompt: "Intro" },
      {
        type: "QUOTE",
        payload: {
          quote: APPROVED_QUOTE,
          attribution: APPROVED_ATTR,
          proof_id: PROOF_ID,
        },
      },
    ] as ContentPackageOutput["visual_scenes"]);
    applyPresentationFrequencyToPackage(pkg);
    assert.equal(
      (pkg.visual_scenes ?? []).filter((s) => isQuoteVisualSceneEntry(s as never)).length,
      1,
    );
  });

  await check("11 two QUOTE scenes — second downgrades", () => {
    const pkg = basePkg([
      {
        type: "QUOTE",
        payload: {
          quote: APPROVED_QUOTE,
          attribution: APPROVED_ATTR,
          proof_id: PROOF_ID,
        },
      },
      {
        type: "QUOTE",
        payload: {
          quote: APPROVED_QUOTE,
          attribution: APPROVED_ATTR,
          proof_id: PROOF_ID,
        },
      },
    ] as ContentPackageOutput["visual_scenes"]);
    const { decisions } = enforceQuoteVideoLimit({
      visualScenes: pkg.visual_scenes as never,
      voiceoverText: pkg.voiceover_text,
    });
    assert.equal(decisions[0]?.rule, "quote_video_limit_exceeded");
  });

  await check("12 scene types disabled — prompt and ceiling exclude QUOTE", () => {
    withEnv(() => {
      const types = derivePromptPresentationTypes({
        projectId: PROJECT_ID,
        project: quoteProject,
      });
      assert.deepEqual(types, ["IMAGE"]);
    }, "false");
  });

  await check("13 IMAGE-only package unchanged", () => {
    const pkg = basePkg([
      { source: "ai", image_prompt: "Kitchen" },
      { source: "ai", image_prompt: "Dining" },
    ]);
    assert.equal(buildContentPackageSchema(["tiktok"], { requireVideo: true })(pkg, "$").length, 0);
  });

  await check("14 CHECKLIST generation still validates", () => {
    const issues = generatedVisualSceneEntryValidator({
      type: "CHECKLIST",
      payload: { items: ["One", "Two"] },
    });
    assert.equal(issues.length, 0);
  });

  await check("15 PHONE generation still validates", () => {
    const issues = generatedVisualSceneEntryValidator({
      type: "PHONE",
      payload: { image_prompt: "Mobile inbox UI" },
    });
    assert.equal(issues.length, 0);
  });

  await check("16 CTA accepted with canonical payload", () => {
    assert.equal(
      generatedVisualSceneEntryValidator({
        type: "CTA",
        payload: { headline: "Book a demo", button_label: "Book now" },
      }).length,
      0,
    );
  });

  await check("16b STATISTIC accepted with canonical payload", () => {
    assert.equal(
      generatedVisualSceneEntryValidator({
        type: "STATISTIC",
        payload: {
          value: "42",
          unit: "%",
          label: "of inquiries arrive outside business hours",
          proof_id: "proof-statement-0",
        },
      }).length,
      0,
    );
  });

  await check("17 language variant reuses quote raster", () => {
    const { scenes } = prepareRenderScenesForLanguageVariant({
      scenes: [
        {
          id: "scene-1",
          type: "QUOTE",
          payload_snapshot: {
            quote: APPROVED_QUOTE,
            attribution: APPROVED_ATTR,
            proof_id: PROOF_ID,
          },
          renderer_version: "quote@1",
          image_bucket: "b",
          image_path: "p",
          duration_seconds: 4,
        },
      ],
      voiceoverText: "Customer story.",
    });
    assert.equal(scenes[0]?.type, "QUOTE");
    assert.equal(scenes[0]?.image_bucket, "b");
    assert.equal(scenes[0]?.image_path, "p");
  });

  await check("18 scene editor preserves QUOTE metadata", () => {
    const view = typedPresentationViewFromDraftScene({
      id: "scene-1",
      image_prompt: "presentation:quote:scene-1",
      image_bucket: "b",
      image_path: "p",
      duration_seconds: 4,
      type: "QUOTE",
      payload_snapshot: {
        quote: APPROVED_QUOTE,
        attribution: APPROVED_ATTR,
        proof_id: PROOF_ID,
      },
    });
    assert.equal(view.sceneType, "QUOTE");
    assert.equal(view.quoteText, APPROVED_QUOTE);
    assert.equal(view.quoteAttribution, APPROVED_ATTR);
  });

  await check("19 analyzer never upgrades IMAGE to QUOTE", () => {
    withEnv(() => {
      const proof = buildProofIndex(quoteProject.knowledge as Json);
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "IMAGE",
            payload: { media: { source: "ai", image_prompt: "Office" } },
          },
        ],
        allowedSceneTypes: ["IMAGE", "QUOTE"],
        voiceoverText: "Welcome.",
        proof,
        projectSignals: deriveProjectPresentationSignals({ project: quoteProject, assets: [] }),
      });
      assert.equal(r.scenes[0]?.type, "IMAGE");
    });
  });

  await check("20 prompt includes anti-invention QUOTE rules", () => {
    const block = buildPresentationGenerationBlock({
      allowedTypes: ["IMAGE", "QUOTE"],
    });
    assert.match(block, /Do not invent, merge, or paraphrase testimonials/);
  });

  await check("21 prompt and analyzer QUOTE permission aligned", () => {
    withEnv(() => {
      const proof = buildProofIndex(quoteProject.knowledge as Json);
      const types = derivePromptPresentationTypes({
        projectId: PROJECT_ID,
        project: quoteProject,
      });
      const ceiling = deriveAllowedSceneTypes(
        {
          knowledge: quoteProject.knowledge as Json,
          proof,
          projectSignals: deriveProjectPresentationSignals({ project: quoteProject, assets: [] }),
        },
        { sceneTypesEnabled: true },
      );
      assert.equal(types.includes("QUOTE"), ceiling.includes("QUOTE"));
    });
  });

  await check("22 valid QUOTE payload at generation schema", () => {
    assert.equal(
      generatedVisualSceneEntryValidator({
        type: "QUOTE",
        payload: {
          quote: APPROVED_QUOTE,
          attribution: APPROVED_ATTR,
          proof_id: PROOF_ID,
        },
      }).length,
      0,
    );
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
