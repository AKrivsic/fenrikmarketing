/**
 * Incident d15447f4 — Content Package prompt ↔ schema ↔ repair ↔ n8n ↔ telemetry.
 * Usage: npm run check:content-pipeline-incident-fix
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  buildContentPackagePrompt,
  buildContentPackageSystem,
} from "@/lib/content-pipeline/prompts/contentPackage";
import {
  buildContentPackageExpectedShape,
  buildContentPackageVisualScenesBlock,
} from "@/lib/content-pipeline/prompts/contentPackageVisualScenes";
import { CONTENT_PACKAGE_MAX_ATTEMPTS } from "@/lib/content-pipeline/runContentPackage";
import { generatedVisualSceneEntryValidator } from "@/lib/content-package/generatedVisualScene";
import {
  generateValidatedJson,
  validationIssuesFingerprint,
} from "@/lib/ai/runWithRepair";
import type { TextProvider } from "@/lib/ai/types";
import {
  buildBoundedFailureOutputSnapshot,
  FAILURE_OUTPUT_SNAPSHOT_MAX_BYTES,
  hashOutputRaw,
} from "@/lib/production-runtime/boundedFailureSnapshot";
import type { Project } from "@/lib/supabase/types";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ok  ${name}`);
    })
    .catch((err: unknown) => {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAIL ${name}`);
      console.error(`       ${message.replace(/\n/g, "\n       ")}`);
    });
}

function section(title: string): void {
  console.log(`\n${title}`);
}

const root = process.cwd();

function fakeProject(): Project {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Test",
    type: "saas",
    language: "en",
    market_scope: "local",
    goal_type: "leads",
    target_audience: {},
    tone_of_voice: {},
    product_is: ["chat"],
    product_is_not: [],
    product_strengths: [],
    pain_points: ["lost leads"],
    forbidden_claims: [],
    platforms: ["tiktok"],
    default_cta: "Book a demo",
    website_url: null,
    knowledge: {},
    created_at: new Date().toISOString(),
  } as unknown as Project;
}

function minimalPromptInput(requireVideo = true) {
  return {
    project: fakeProject(),
    funnelStage: "problem_aware" as const,
    topic: "Lost after-hours leads",
    angle: "She answered every email",
    platform: "tiktok",
    format: "reel",
    concept: {
      title: "Test",
      core_idea: "Story",
      narrative_arc: "arc",
      emotional_tone: "tense",
      audience_insight: "insight",
      product_role: "fix",
      why_it_works: "why",
      visual_direction: {
        art_direction: "realism",
        lighting: "natural",
        palette: "warm",
        environment: "office",
        camera_style: "close",
        character_style: "owner",
      },
    },
    openingImpact: {
      emotion: "tension",
      pacing: "fast",
      attention_pattern: "contrast",
      first_spoken_sentence: "She replies within the hour.",
      first_image: "Owner at desk",
    },
    visualIdentity: {
      art_direction: "Understated realism",
      lighting: "natural",
      palette: "warm",
      environment: "office",
      camera_style: "close",
      character_style: "owner",
      opening_emotion: "tension",
      opening_first_image: "Owner at desk",
    },
    availableAssets: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "UI",
        asset_class: "product_ui" as const,
        media_type: "image" as const,
      },
    ],
    targetPlatforms: ["tiktok", "instagram", "facebook"],
    requireVideo,
  };
}

function fakeProvider(responses: string[], name = "fake"): TextProvider {
  let i = 0;
  let calls = 0;
  const provider: TextProvider & { calls: () => number } = {
    name,
    calls: () => calls,
    async complete() {
      calls++;
      const text = responses[Math.min(i, responses.length - 1)] ?? "";
      i++;
      return { text, model: "fake", provider: name };
    },
  };
  return provider;
}

// --- Prompt vs schema ------------------------------------------------------

section("Prompt vs schema");

await check("prompt includes legacy AI IMAGE example", () => {
  const prompt = buildContentPackagePrompt(minimalPromptInput());
  assert.match(prompt, /"source":\s*"ai"/);
  assert.match(prompt, /"image_prompt"/);
  assert.doesNotMatch(prompt, /optional typed scenes/);
});

await check("prompt includes legacy asset IMAGE example", () => {
  const prompt = buildContentPackagePrompt(minimalPromptInput());
  assert.match(prompt, /"source":\s*"asset"/);
  assert.match(prompt, /"asset_id"/);
  assert.match(prompt, /"used_as"/);
});

await check("visual scenes block forbids invented fields and typed IMAGE without payload", () => {
  const block = buildContentPackageVisualScenesBlock({ requireVideo: true });
  assert.match(block, /Do NOT invent field names/);
  assert.match(block, /Do NOT use \{ "type": "IMAGE", "image_prompt"/);
  assert.match(block, /CHECKLIST/);
});

await check("system prompt still requires JSON-only", () => {
  assert.match(buildContentPackageSystem(true), /Return ONLY JSON/);
});

await check("expectedShape documents legacy visual_scenes", () => {
  const shape = buildContentPackageExpectedShape();
  assert.match(shape, /"source": "ai"/);
  assert.match(shape, /platform_outputs/);
  assert.match(shape, /duration_seconds/);
});

await check("prompt + expectedShape require caption = caption_variants[0]", () => {
  const prompt = buildContentPackagePrompt({
    ...minimalPromptInput(),
    variantCounts: { linkedin: 2, x: 5 },
  });
  assert.match(prompt, /caption = caption_variants\[0\]/);
  assert.match(
    buildContentPackageExpectedShape({ goalType: "lead_generation" }),
    /caption_variants\[0\]/,
  );
  assert.match(prompt, /Hard maximum 80/);
  assert.match(prompt, /cta\.type MUST be exactly one of/);
});

await check("runContentPackage wires CTA enum + guardrail repair", () => {
  const src = readFileSync(
    join(root, "lib/content-pipeline/runContentPackage.ts"),
    "utf8",
  );
  assert.match(src, /repairGuardrailFailures:\s*true/);
  assert.match(src, /allowedCtaTypes/);
});

// --- Scene validators ------------------------------------------------------

section("Scene validators");

const validFixtures: Array<{ name: string; entry: unknown }> = [
  {
    name: "legacy AI IMAGE",
    entry: { source: "ai", image_prompt: "Owner at desk in warm light" },
  },
  {
    name: "legacy asset IMAGE",
    entry: {
      source: "asset",
      asset_id: "11111111-1111-4111-8111-111111111111",
      used_as: "framed product insert",
    },
  },
  {
    name: "typed IMAGE with payload",
    entry: {
      type: "IMAGE",
      payload: { source: "ai", image_prompt: "Night laptop contact form" },
    },
  },
  {
    name: "CHECKLIST",
    entry: {
      type: "CHECKLIST",
      payload: { title: "Before publish", items: ["Hook", "CTA"] },
    },
  },
  {
    name: "PHONE",
    entry: {
      type: "PHONE",
      payload: { image_prompt: "Mobile chat UI", caption: "Reply" },
    },
  },
  {
    name: "QUOTE",
    entry: {
      type: "QUOTE",
      payload: {
        quote: "It just works",
        attribution: "Customer",
        proof_id: "proof-1",
      },
    },
  },
  {
    name: "STATISTIC",
    entry: {
      type: "STATISTIC",
      payload: { value: "40%", label: "leads after hours", proof_id: "stat-1" },
    },
  },
  {
    name: "CTA",
    entry: {
      type: "CTA",
      payload: { headline: "Book a demo", button_label: "Book now" },
    },
  },
];

for (const fx of validFixtures) {
  await check(`valid ${fx.name}`, () => {
    const issues = generatedVisualSceneEntryValidator(fx.entry);
    assert.equal(issues.length, 0, JSON.stringify(issues));
  });
}

const invalidFixtures: Array<{ name: string; entry: unknown; expect: RegExp }> = [
  {
    name: "description only",
    entry: { description: "office scene" },
    expect: /unrecognized visual scene entry/,
  },
  {
    name: "prompt only",
    entry: { prompt: "office scene" },
    expect: /unrecognized visual scene entry/,
  },
  {
    name: "typed IMAGE without source/payload source",
    entry: { type: "IMAGE", image_prompt: "office scene" },
    expect: /expected "ai" or "asset"|unrecognized/,
  },
];

for (const fx of invalidFixtures) {
  await check(`invalid ${fx.name}`, () => {
    const issues = generatedVisualSceneEntryValidator(fx.entry);
    assert.ok(issues.length > 0);
    assert.match(issues.map((i) => i.message).join("; "), fx.expect);
  });
}

await check("prompt fixture scene passes validator", () => {
  const issues = generatedVisualSceneEntryValidator({
    source: "ai",
    image_prompt: "Owner at desk answering emails in warm office light",
  });
  assert.equal(issues.length, 0);
});

// --- Repair ----------------------------------------------------------------

section("Repair limits + fingerprint");

await check("fingerprint is order-independent", () => {
  const a = validationIssuesFingerprint([
    { path: "$.b", message: "x" },
    { path: "$.a", message: "y" },
  ]);
  const b = validationIssuesFingerprint([
    { path: "$.a", message: "y" },
    { path: "$.b", message: "x" },
  ]);
  assert.equal(a, b);
});

await check("CONTENT_PACKAGE_MAX_ATTEMPTS is explicit 2", () => {
  assert.equal(CONTENT_PACKAGE_MAX_ATTEMPTS, 2);
});

await check("identical schema errors → at most one schema repair across attempts", async () => {
  const bad = JSON.stringify({
    title: "T",
    funnel_stage: "problem_aware",
    hook: "H",
    voiceover_text: "H rest",
    subtitles: "H rest",
    cta: { type: "link", text: "Go" },
    video: { concept: "c", script: "s", duration_seconds: "20" },
    platform_outputs: {
      tiktok: { caption: "c", cta: "c" },
    },
    visual_scenes: [{ description: "office" }],
  });

  let repairCalls = 0;
  const repair: TextProvider = {
    name: "repair",
    async complete() {
      repairCalls++;
      // Return same invalid shape — fingerprint stays identical.
      return { text: bad, model: "fake-repair", provider: "repair" };
    },
  };

  const primary = fakeProvider([bad, bad]);
  const result = await generateValidatedJson({
    textProvider: primary,
    repairProvider: repair,
    system: "s",
    prompt: "p",
    expectedShape: buildContentPackageExpectedShape(),
    maxAttempts: 2,
    validator: (value, path = "$") => {
      const issues = [];
      const record = value as Record<string, unknown>;
      const scenes = record.visual_scenes;
      if (!Array.isArray(scenes)) {
        issues.push({ path: `${path}.visual_scenes`, message: "expected array" });
        return issues;
      }
      for (let i = 0; i < scenes.length; i++) {
        issues.push(
          ...generatedVisualSceneEntryValidator(
            scenes[i],
            `${path}.visual_scenes[${i}]`,
          ),
        );
      }
      return issues;
    },
  });

  assert.equal(result.ok, false);
  assert.equal(repairCalls, 1, `expected 1 schema repair, got ${repairCalls}`);
});

await check("parse repair still allowed once per attempt", async () => {
  let repairCalls = 0;
  const repair: TextProvider = {
    name: "repair",
    async complete() {
      repairCalls++;
      return {
        text: JSON.stringify({ title: "Hello", count: 2, status: "ok" }),
        model: "fake-repair",
        provider: "repair",
      };
    },
  };
  const { vNonEmptyString, vNumber, vEnum, vObject } = await import(
    "@/lib/ai/validateAiOutput"
  );
  const schema = vObject({
    title: vNonEmptyString(),
    count: vNumber(),
    status: vEnum(["ok", "draft"] as const),
  });
  const result = await generateValidatedJson({
    textProvider: fakeProvider(["not-json"]),
    repairProvider: repair,
    system: "s",
    prompt: "p",
    maxAttempts: 1,
    validator: schema,
  });
  assert.equal(result.ok, true);
  assert.equal(repairCalls, 1);
});

// --- n8n bridge ------------------------------------------------------------

section("n8n N3 retry policy");

await check("N3 retryOnFail is false in bridge JSON", () => {
  const bridge = JSON.parse(
    readFileSync(
      join(root, "n8n/generate-content-package-bridge.json"),
      "utf8",
    ),
  ) as { nodes: Array<Record<string, unknown>> };
  const n3 = bridge.nodes.find((n) => n.name === "N3 — Generate Content Package");
  assert.ok(n3, "N3 node missing");
  assert.equal(n3.retryOnFail, false);
  assert.ok(
    n3.maxTries === 1 || n3.maxTries === undefined,
    `maxTries should be 1, got ${String(n3.maxTries)}`,
  );
});

await check("handler refuses duplicate after settled fail", () => {
  const src = readFileSync(
    join(root, "lib/n8n/handleGenerateContentPackageRequest.ts"),
    "utf8",
  );
  assert.match(src, /isProductionRunItemAlreadyFailed/);
  assert.match(src, /already_settled_failed/);
});

// --- Telemetry snapshot ----------------------------------------------------

section("Failure telemetry snapshot");

await check("hash is sha256 hex", () => {
  const raw = '{"visual_scenes":[]}';
  const hash = hashOutputRaw(raw);
  assert.equal(hash, createHash("sha256").update(raw, "utf8").digest("hex"));
});

await check("bounded snapshot keeps visual_scenes + marks truncation", () => {
  const hugePrompt = "x".repeat(FAILURE_OUTPUT_SNAPSHOT_MAX_BYTES);
  const raw = JSON.stringify({
    visual_scenes: [{ source: "ai", image_prompt: hugePrompt }],
    platform_outputs: { tiktok: { caption: "c", cta: "go" } },
  });
  const snap = buildBoundedFailureOutputSnapshot({
    raw,
    validationErrors: [
      { path: "$.visual_scenes[0]", message: "unrecognized visual scene entry" },
    ],
  });
  assert.ok(snap.validation_errors);
  assert.ok("visual_scenes" in snap);
  assert.ok(snap.truncated === true || typeof snap.candidate === "string");
});

await check("migration 028 adds audit columns", () => {
  const sql = readFileSync(
    join(root, "supabase/migrations/028_failure_telemetry_audit.sql"),
    "utf8",
  );
  assert.match(sql, /generation_telemetry jsonb/);
  assert.match(sql, /output_hash text/);
  assert.match(sql, /output_snapshot jsonb/);
});

await check("runContentPackage passes expectedShape + maxAttempts 2", () => {
  const src = readFileSync(
    join(root, "lib/content-pipeline/runContentPackage.ts"),
    "utf8",
  );
  assert.match(src, /expectedShape:\s*buildContentPackageExpectedShape/);
  assert.match(src, /maxAttempts:\s*CONTENT_PACKAGE_MAX_ATTEMPTS/);
  assert.match(src, /CONTENT_PACKAGE_MAX_ATTEMPTS = 2/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
