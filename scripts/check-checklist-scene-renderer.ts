// CHECKLIST scene renderer — raster composition + pipeline checks (Phase 4).
//   npm run check:checklist-scene-renderer

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import {
  composeChecklistRasterPng,
  buildChecklistSvg,
} from "@/lib/scene-types/checklist/composeChecklistRaster";
import { resolveChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import {
  parseChecklistScenePayload,
  checklistScenePayloadSchema,
} from "@/lib/scene-types/checklist/checklistScenePayload";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { deriveAllowedSceneTypes } from "@/lib/scene-types/presentation/deriveAllowedSceneTypes";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import { deriveProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { resetChecklistProductionRolloutCacheForTests } from "@/lib/scene-types/checklistProductionRollout";
import { prepareRenderScenesForLanguageVariant } from "@/lib/scene-types/languageVariantScenes";
import { CHECKLIST_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/checklistSceneRenderer";
import {
  assertSceneRenderable,
  registerSceneRenderer,
} from "@/lib/scene-types/renderers/types";
import { createChecklistSceneRenderer } from "@/lib/scene-types/renderers/checklistSceneRenderer";
import { ensureSceneRendererRegistry } from "@/video-worker/services/sceneRendererRegistry";
import { compileVisualScenesToWorkerScenes } from "@/lib/scene-types/compileScenePlan";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyKnowledge } from "@/lib/knowledge/types";

const OUT_DIR = join(
  process.cwd(),
  "scripts",
  "output",
  "checklist-scene-fixtures",
);

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

const tokens = resolveChecklistBrandTokens({ knowledge: null });

async function renderFixture(
  name: string,
  payload: unknown,
  logoPng?: Buffer,
): Promise<{ png: Buffer; metadata: ReturnType<typeof buildChecklistSvg>["metadata"] }> {
  const parsed = parseChecklistScenePayload(payload);
  assert.equal(parsed.ok, true);
  const { png, metadata } = await composeChecklistRasterPng({
    payload: parsed.data,
    tokens,
    logoPng: logoPng ?? null,
  });
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, `${name}.png`), png);
  await writeFile(
    join(OUT_DIR, `${name}.meta.json`),
    JSON.stringify(metadata, null, 2),
  );
  return { png, metadata };
}

const mockSupabase = {} as SupabaseClient;

console.log("\nPayload validation");
await check("schema accepts canonical checklist payload", () => {
  const r = checklistScenePayloadSchema.safeParse({
    title: "Before publishing",
    items: ["Check the hook", "Confirm the CTA"],
  });
  assert.equal(r.success, true);
});

await check("schema rejects single-item checklist", () => {
  const r = checklistScenePayloadSchema.safeParse({ items: ["only one"] });
  assert.equal(r.success, false);
});

console.log("\nRaster fixtures");
await check("1 two short items", async () => {
  const { png, metadata } = await renderFixture("01-two-items", {
    title: "Quick checks",
    items: ["Hook clear", "CTA visible"],
  });
  assert.ok(png.length > 500);
  assert.equal(metadata.itemLineCounts.length, 2);
});

await check("2 five short items", async () => {
  const { metadata } = await renderFixture("02-five-items", {
    items: ["One", "Two", "Three", "Four", "Five"],
  });
  assert.equal(metadata.itemLineCounts.length, 5);
});

await check("3 long title wraps", async () => {
  const { metadata } = await renderFixture("03-long-title", {
    title:
      "Verify everything before you publish your first vertical social video",
    items: ["Audio levels", "Subtitle timing"],
  });
  assert.ok(metadata.titleLines >= 2);
});

await check("4 no title", async () => {
  await renderFixture("04-no-title", {
    items: ["First step", "Second step"],
  });
});

await check("5 long translated-style words", async () => {
  await renderFixture("05-long-words", {
    title: "Příprava",
    items: [
      "Nesprávné nastavení doručovací schránky",
      "Chybějící potvrzení rezervace",
    ],
  });
});

await check("6 logo present", async () => {
  const logo = await sharp({
    create: {
      width: 400,
      height: 120,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0.9 },
    },
  })
    .png()
    .toBuffer();
  const { metadata } = await renderFixture(
    "06-logo",
    { title: "Brand", items: ["Item A", "Item B"] },
    logo,
  );
  assert.equal(metadata.logoPresent, true);
});

await check("7 logo absent", async () => {
  const { metadata } = await renderFixture("07-no-logo", {
    items: ["Alpha", "Beta"],
  });
  assert.equal(metadata.logoPresent, false);
});

await check("8 invalid color falls back safely", async () => {
  const bad = resolveChecklistBrandTokens({
    knowledge: {
      presentation: {
        brand: {
          background_color: "not-a-color",
          text_color: "#zzzzzz",
          accent_color: "#22c55e",
        },
      },
    } as unknown as import("@/lib/supabase/types").Json,
  });
  assert.match(bad.backgroundColor, /^#/);
  assert.match(bad.foregroundColor, /^#/);
  await composeChecklistRasterPng({
    payload: { items: ["Safe", "Colors"] },
    tokens: bad,
  });
});

await check("9 maximum allowed text at schema limits", async () => {
  const title = "T".repeat(80);
  const items = ["I".repeat(120), "J".repeat(120), "K".repeat(120)];
  await renderFixture("09-max-text", { title, items });
});

await check("10 subtitle-safe lower region reserved", async () => {
  const { metadata } = await renderFixture("10-subtitle-safe", {
    title: "Launch",
    items: ["Verify offer", "Check link", "Review caption"],
  });
  assert.equal(metadata.height, SHORT_PROFILE.height);
  assert.equal(tokens.contentBottomY, 1500);
  assert.ok(tokens.subtitleSafeBottomPx >= 400);
});

await check("output dimensions match SHORT profile", async () => {
  const { png } = await renderFixture("dimensions", {
    items: ["A", "B"],
  });
  const meta = await sharp(png).metadata();
  assert.equal(meta.width, SHORT_PROFILE.width);
  assert.equal(meta.height, SHORT_PROFILE.height);
});

await check("deterministic layout metadata for same input", async () => {
  const payload = { title: "Same", items: ["One", "Two", "Three"] };
  const a = await composeChecklistRasterPng({ payload, tokens });
  const b = await composeChecklistRasterPng({ payload, tokens });
  assert.deepEqual(a.metadata, b.metadata);
});

console.log("\nAnalyzer + compile pipeline");
await check("eligible CHECKLIST stays CHECKLIST when enabled", () => {
  const prevMode = process.env.CHECKLIST_GENERATION_MODE;
  const prev = process.env.SCENE_TYPES_ENABLED;
  const prevAllow = process.env.CHECKLIST_ENABLED_PROJECT_IDS;
  const ROLLOUT_TEST_PROJECT_ID = "11111111-1111-4111-8111-111111111111";
  process.env.CHECKLIST_GENERATION_MODE = "enabled";
  process.env.SCENE_TYPES_ENABLED = "true";
  process.env.CHECKLIST_ENABLED_PROJECT_IDS = ROLLOUT_TEST_PROJECT_ID;
  resetChecklistProductionRolloutCacheForTests();
  try {
    const vo =
      "Three steps: wash, rinse, and repeat the process every morning.";
    const r = analyzePresentation({
      scenes: [
        {
          id: "scene-1",
          type: "CHECKLIST",
          payload: { items: ["wash", "rinse", "repeat the process"] },
        },
      ],
      allowedSceneTypes: deriveAllowedSceneTypes(
        {
          knowledge: {},
          proof: buildProofIndex(null),
          projectSignals: deriveProjectPresentationSignals({
            project: { product_is: [], product_strengths: [] },
            assets: [],
          }),
        },
        { sceneTypesEnabled: true },
      ),
      voiceoverText: vo,
      proof: buildProofIndex(null),
      projectSignals: deriveProjectPresentationSignals({
        project: { product_is: [], product_strengths: [] },
        assets: [],
      }),
      projectId: ROLLOUT_TEST_PROJECT_ID,
    });
    assert.equal(r.scenes[0]?.type, "CHECKLIST");
    assert.equal(r.decisions[0]?.final_type, "CHECKLIST");
    assert.equal(r.decisions[0]?.rule, "allowed");
  } finally {
    if (prevMode === undefined) delete process.env.CHECKLIST_GENERATION_MODE;
    else process.env.CHECKLIST_GENERATION_MODE = prevMode;
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
    if (prevAllow === undefined) delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    else process.env.CHECKLIST_ENABLED_PROJECT_IDS = prevAllow;
    resetChecklistProductionRolloutCacheForTests();
  }
});

await check("flag off compiles CHECKLIST path as IMAGE after analyzer", () => {
  const r = analyzePresentation({
    scenes: [
      {
        id: "scene-1",
        type: "CHECKLIST",
        payload: { items: ["a", "b"] },
      },
    ],
    allowedSceneTypes: ["IMAGE"],
    voiceoverText: "First, a. Second, b.",
    proof: buildProofIndex(null),
    projectSignals: deriveProjectPresentationSignals({
      project: { product_is: [], product_strengths: [] },
      assets: [],
    }),
  });
  assert.equal(r.scenes[0]?.type, "IMAGE");
  assert.equal(r.decisions[0]?.rule, "type_not_permitted");
});

await check("STATISTIC renders when flag on and proof matches", () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
    const proof = buildProofIndex(
      (() => {
        const k = emptyKnowledge("approved", "manual");
        k.cards.proof.statements = ["40% growth year over year."];
        return k as unknown as import("@/lib/supabase/types").Json;
      })(),
    );
    const r = analyzePresentation({
      scenes: [
        {
          id: "scene-1",
          type: "STATISTIC",
          payload: {
            value: "40",
            unit: "%",
            label: "growth year over year",
            proof_id: "proof-statement-0",
          },
        },
      ],
      allowedSceneTypes: ["IMAGE", "STATISTIC", "CTA", "CHECKLIST"],
      voiceoverText: "We saw 40% growth year over year.",
      proof,
      projectSignals: deriveProjectPresentationSignals({
        project: { product_is: [], product_strengths: [] },
        assets: [],
      }),
    });
    assert.equal(r.scenes[0]?.type, "STATISTIC");
    assert.equal(r.decisions[0]?.rule, "allowed");
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

await check("compiler emits CHECKLIST worker scene with metadata", async () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
    const compiled = await compileVisualScenesToWorkerScenes(mockSupabase, "proj", [
      {
        id: "scene-2",
        type: "CHECKLIST",
        payload: {
          title: "Prep",
          items: ["One", "Two"],
        },
      },
    ]);
    assert.equal(compiled.length, 1);
    assert.equal(compiled[0]?.type, "CHECKLIST");
    assert.equal(compiled[0]?.renderer_version, CHECKLIST_SCENE_RENDERER_VERSION);
    assert.ok(compiled[0]?.payload_snapshot);
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

console.log("\nRegistry");
await check("CHECKLIST registered in worker registry", () => {
  ensureSceneRendererRegistry();
  const prev = process.env.SCENE_TYPES_ENABLED;
  const prevMode = process.env.CHECKLIST_GENERATION_MODE;
  const prevAllow = process.env.CHECKLIST_ENABLED_PROJECT_IDS;
  const pid = "11111111-1111-4111-8111-111111111111";
  process.env.SCENE_TYPES_ENABLED = "true";
  process.env.CHECKLIST_GENERATION_MODE = "enabled";
  process.env.CHECKLIST_ENABLED_PROJECT_IDS = pid;
  resetChecklistProductionRolloutCacheForTests();
  try {
    assert.equal(
      assertSceneRenderable(
        {
          id: "scene-1",
          type: "CHECKLIST",
          image_prompt: "presentation:checklist",
          duration_seconds: 4,
          payload_snapshot: { items: ["A", "B"] },
          renderer_version: CHECKLIST_SCENE_RENDERER_VERSION,
        },
        { projectId: pid, videoJobId: "job-1" },
      ),
      "CHECKLIST",
    );
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
    if (prevMode === undefined) delete process.env.CHECKLIST_GENERATION_MODE;
    else process.env.CHECKLIST_GENERATION_MODE = prevMode;
    if (prevAllow === undefined) delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    else process.env.CHECKLIST_ENABLED_PROJECT_IDS = prevAllow;
    resetChecklistProductionRolloutCacheForTests();
  }
});

await check("CHECKLIST prepareRaster makes no image provider call", async () => {
  registerSceneRenderer(
    createChecklistSceneRenderer({
      prepareRaster: async (scene) => ({
        sceneId: scene.id,
        imagePath: "/tmp/checklist-mock.png",
      }),
    }),
  );
  const renderer = createChecklistSceneRenderer({
    prepareRaster: async (scene) => ({
      sceneId: scene.id,
      imagePath: "/tmp/checklist-mock.png",
    }),
  });
  const result = await renderer.prepareRaster(
    {
      id: "scene-1",
      type: "CHECKLIST",
      image_prompt: "presentation:checklist",
      duration_seconds: 4,
      payload_snapshot: { items: ["A", "B"] },
    },
    { projectId: "p", videoJobId: "j" },
  );
  assert.equal(result.sceneId, "scene-1");
});

console.log("\nLanguage variants");
await check("language variant preserves CHECKLIST and raster refs", () => {
  const { scenes, warnings } = prepareRenderScenesForLanguageVariant({
    scenes: [
      {
        id: "scene-1",
        type: "CHECKLIST",
        image_prompt: "presentation:checklist",
        duration_seconds: 4,
        image_bucket: "bucket",
        image_path: "path.png",
        payload_snapshot: { items: ["English only", "Second"] },
        renderer_version: CHECKLIST_SCENE_RENDERER_VERSION,
      },
    ],
    voiceoverText: "Localized voiceover line.",
  });
  assert.equal(scenes[0]?.type, "CHECKLIST");
  assert.equal(scenes[0]?.image_bucket, "bucket");
  assert.equal(scenes[0]?.image_path, "path.png");
  assert.equal(warnings.length, 0);
});

console.log(`\nFixtures written to ${OUT_DIR}`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
