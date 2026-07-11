// QUOTE scene renderer — payload, raster, pipeline (Phase 9).
//   npm run check:quote-scene-renderer

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import {
  parseQuoteScenePayload,
  quoteScenePayloadSchema,
} from "@/lib/scene-types/quote/quoteScenePayload";
import { composeQuoteRasterPng } from "@/lib/scene-types/quote/composeQuoteRaster";
import { resolveChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import { deriveProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { prepareRenderScenesForLanguageVariant } from "@/lib/scene-types/languageVariantScenes";
import { QUOTE_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/quoteSceneRenderer";
import {
  assertSceneRenderable,
  getRegisteredSceneRendererTypes,
} from "@/lib/scene-types/renderers/types";
import { compileVisualScenesToWorkerScenes } from "@/lib/scene-types/compileScenePlan";
import { ensureSceneRendererRegistry } from "@/video-worker/services/sceneRendererRegistry";
import { emptyKnowledge } from "@/lib/knowledge/types";
import type { Json } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

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

const mockSupabase = {} as SupabaseClient;

function knowledgeWithQuote(): Json {
  const k = emptyKnowledge("approved", "manual");
  k.cards.proof.statements = [
    "We cut our response time dramatically. — Jane Smith, Example Co.",
  ];
  return k as unknown as Json;
}

console.log("\nPayload validation");
await check("schema accepts canonical quote payload", () => {
  assert.equal(
    quoteScenePayloadSchema.safeParse({
      quote: "We cut our response time dramatically.",
      attribution: "Jane Smith, Example Co.",
      proof_id: "proof-statement-0",
    }).success,
    true,
  );
});

await check("schema rejects missing proof_id", () => {
  assert.equal(
    quoteScenePayloadSchema.safeParse({
      quote: "Hello",
      attribution: "A",
    }).success,
    false,
  );
});

console.log("\nRaster");
await check("1080x1920 raster with subtitle-safe layout", async () => {
  const tokens = resolveChecklistBrandTokens({ knowledge: null });
  const { png, metadata } = await composeQuoteRasterPng({
    payload: {
      quote:
        "We cut our response time dramatically and our team finally stays ahead of inbound requests.",
      attribution: "Jane Smith, Example Co.",
      proof_id: "proof-statement-0",
    },
    tokens,
    logoPng: null,
  });
  const meta = await sharp(png).metadata();
  assert.equal(meta.width, SHORT_PROFILE.width);
  assert.equal(meta.height, SHORT_PROFILE.height);
  assert.ok(metadata.quoteLines >= 1);
  assert.ok(tokens.subtitleSafeBottomPx >= 400);
});

await check("long quote wraps without throwing", async () => {
  const tokens = resolveChecklistBrandTokens({ knowledge: null });
  const long =
    "This platform changed how we coordinate field teams, share updates, and close jobs faster every single day without extra admin work.";
  const { png } = await composeQuoteRasterPng({
    payload: {
      quote: long,
      attribution: "Operations Director, North Region Services Group",
      proof_id: "proof-statement-0",
    },
    tokens,
  });
  assert.ok(png.length > 1000);
});

console.log("\nAnalyzer + compile");
await check("eligible QUOTE stays QUOTE when enabled", () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
    const proof = buildProofIndex(knowledgeWithQuote());
    const signals = deriveProjectPresentationSignals({
      project: { product_is: ["SaaS"], product_strengths: [] },
      assets: [],
    });
    const r = analyzePresentation({
      scenes: [
        {
          id: "scene-1",
          type: "QUOTE",
          payload: {
            quote: "We cut our response time dramatically.",
            attribution: "Jane Smith, Example Co.",
            proof_id: "proof-statement-0",
          },
        },
      ],
      allowedSceneTypes: ["IMAGE", "QUOTE"],
      voiceoverText: "Hear what one customer said about response time.",
      proof,
      projectSignals: signals,
    });
    assert.equal(r.scenes[0]?.type, "QUOTE");
    assert.equal(r.decisions[0]?.rule, "allowed");
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

await check("fabricated quote downgrades", () => {
  const proof = buildProofIndex(knowledgeWithQuote());
  const r = analyzePresentation({
    scenes: [
      {
        id: "scene-1",
        type: "QUOTE",
        payload: {
          quote: "Totally made up testimonial text here.",
          attribution: "Nobody Real",
          proof_id: "proof-statement-0",
        },
      },
    ],
    allowedSceneTypes: ["IMAGE", "QUOTE"],
    voiceoverText: "Customer feedback matters.",
    proof,
    projectSignals: deriveProjectPresentationSignals({
      project: { product_is: [], product_strengths: [] },
      assets: [],
    }),
  });
  assert.equal(r.scenes[0]?.type, "IMAGE");
  assert.equal(r.decisions[0]?.rule, "quote_text_mismatch");
});

await check("compiler emits QUOTE worker scene", async () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
    const compiled = await compileVisualScenesToWorkerScenes(mockSupabase, "p", [
      {
        id: "scene-1",
        type: "QUOTE",
        payload: {
          quote: "We cut our response time dramatically.",
          attribution: "Jane Smith, Example Co.",
          proof_id: "proof-statement-0",
        },
      },
    ]);
    assert.equal(compiled[0]?.type, "QUOTE");
    assert.equal(compiled[0]?.renderer_version, QUOTE_SCENE_RENDERER_VERSION);
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

console.log("\nRegistry");
await check("QUOTE registered in worker registry", () => {
  ensureSceneRendererRegistry();
  assert.ok(getRegisteredSceneRendererTypes().includes("QUOTE"));
  assertSceneRenderable(
    {
      id: "scene-1",
      type: "QUOTE",
      image_prompt: "presentation:quote:scene-1",
      duration_seconds: 4,
      payload_snapshot: {
        quote: "Test",
        attribution: "A",
        proof_id: "proof-statement-0",
      },
      renderer_version: QUOTE_SCENE_RENDERER_VERSION,
    },
    { projectId: "p", videoJobId: "j" },
  );
});

console.log("\nLanguage variants");
await check("language variant downgrades QUOTE to IMAGE", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: [
      {
        id: "scene-1",
        type: "QUOTE",
        payload_snapshot: {
          quote: "We cut our response time dramatically.",
          attribution: "Jane Smith",
          proof_id: "proof-statement-0",
        },
        renderer_version: QUOTE_SCENE_RENDERER_VERSION,
        image_bucket: "b",
        image_path: "p",
        duration_seconds: 4,
      },
    ],
    voiceoverText: "Customer story.",
  });
  assert.equal(scenes[0]?.type, "IMAGE");
});

const outDir = join(process.cwd(), "scripts/output/quote-scene-fixtures");
await mkdir(outDir, { recursive: true });
await check("write fixture png", async () => {
  const tokens = resolveChecklistBrandTokens({ knowledge: null });
  const { png } = await composeQuoteRasterPng({
    payload: {
      quote: "We cut our response time dramatically.",
      attribution: "Jane Smith, Example Co.",
      proof_id: "proof-statement-0",
    },
    tokens,
  });
  await writeFile(join(outDir, "quote-short.png"), png);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
