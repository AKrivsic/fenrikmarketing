/**
 * Content Package contract: b343 caption/variants regression, parity checks,
 * and model-like validate → repair instruction → fan-out → brief persist shape.
 *
 * Usage: npm run check:content-pipeline-contract
 */

import {
  buildContentPackagePrompt,
  buildContentPackageSystem,
} from "@/lib/content-pipeline/prompts/contentPackage";
import {
  buildContentPackageExpectedShape,
  buildContentPackagePlatformOutputsContractBlock,
  buildContentPackageVisualScenesBlock,
} from "@/lib/content-pipeline/prompts/contentPackageVisualScenes";
import {
  allowedCtaTypesForFunnelStage,
  allowedCtaTypesForGoal,
  SOFT_CTA_TYPES,
  VOICEOVER_HARD_CAP_WORDS,
  VOICEOVER_TARGET_MAX_WORDS,
  VOICEOVER_TARGET_MIN_WORDS,
} from "@/lib/content-pipeline/prompts/contentPackageContract";
import {
  buildJsonRepairPrompt,
  JSON_REPAIR_SYSTEM,
} from "@/lib/ai/prompts/jsonRepair";
import {
  buildContentPackageSchema,
  type ContentPackageOutput,
} from "@/lib/ai/schemas/contentPackage";
import { generatedVisualSceneEntryValidator } from "@/lib/content-package/generatedVisualScene";
import {
  safeJsonParse,
  validate,
} from "@/lib/ai/validateAiOutput";
import {
  checkContentPackageGuardrails,
  X_CAPTION_HARD_CAP_CHARS,
  YOUTUBE_SHORTS_CAPTION_HARD_CAP_WORDS,
} from "@/lib/ai/guardrails";
import { CTA_TYPES_BY_GOAL } from "@/lib/ai/types";
import {
  buildPackageBrief,
  buildPersistableItems,
  normalizePlatformCta,
} from "@/lib/ai/workflows/packageShared";
import { buildPublishReadyText } from "@/lib/publishing/publishReadyText";
import { outputsForPackageIndex } from "@/lib/projects/productionRun";
import type { Project } from "@/lib/supabase/types";
import { CONTENT_PACKAGE_MAX_ATTEMPTS } from "@/lib/content-pipeline/runContentPackage";
import {
  videoConceptSchema,
  openingImpactSchema,
} from "@/lib/content-pipeline/schemas";
import { buildVideoConceptPrompt } from "@/lib/content-pipeline/prompts/videoConcept";
import { buildOpeningImpactPrompt } from "@/lib/content-pipeline/prompts/openingImpact";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err: unknown) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

const root = process.cwd();
const PLATFORMS = [
  "tiktok",
  "instagram",
  "facebook",
  "youtube",
  "linkedin",
  "x",
] as const;

function loadFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(join(root, "scripts/fixtures", name), "utf8"),
  );
}

const LEAD_GEN_CTA = CTA_TYPES_BY_GOAL.lead_generation;
const B343_PROJECT_ID = "aabab9ff-9db4-4012-a53c-135e3bfea6cd";
const B343_STRATEGY = "114dc174-758f-4604-b991-c23c571650a5";
const B343_ITEM = "99ffe284-4a7b-4295-8165-7eea0e8e7443";

function fakeProject(): Project {
  return {
    id: B343_PROJECT_ID,
    name: "Test",
    type: "saas",
    language: "en",
    market_scope: "local",
    goal_type: "lead_generation",
    target_audience: {},
    tone_of_voice: {},
    product_is: ["chat"],
    product_is_not: [],
    product_strengths: [],
    pain_points: ["lost leads"],
    forbidden_claims: [],
    platforms: [...PLATFORMS],
    default_cta: "Book a demo",
    website_url: null,
    knowledge: {},
    created_at: new Date().toISOString(),
  } as unknown as Project;
}

function packageSchema(
  opts: {
    withCtaEnum?: boolean;
    funnelStage?: string;
    ctaRequired?: boolean;
  } = {},
) {
  const funnelStage = opts.funnelStage ?? "problem_aware";
  const allowedCtaTypes =
    opts.withCtaEnum === false
      ? undefined
      : allowedCtaTypesForFunnelStage({
          funnelStage,
          goalType: "lead_generation",
        });
  const ctaRequired =
    opts.ctaRequired ?? (funnelStage === "conversion");
  return buildContentPackageSchema(PLATFORMS, {
    requireVideo: true,
    allowedCtaTypes,
    ctaRequired,
  });
}

function b343GuardrailCtx() {
  return {
    project: fakeProject(),
    weeklyStrategyId: B343_STRATEGY,
    strategyItemId: B343_ITEM,
    strategyItemFunnelStage: "problem_aware" as const,
    requiredPlatforms: [...PLATFORMS],
    requireVideo: true,
  };
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function synthesizeCaptionFromVariants(
  pkg: Record<string, unknown>,
): Record<string, unknown> {
  const next = structuredClone(pkg);
  const po = next.platform_outputs as Record<string, Record<string, unknown>>;
  for (const entry of Object.values(po)) {
    const variants = entry.caption_variants;
    if (
      (entry.caption === undefined || typeof entry.caption !== "string") &&
      Array.isArray(variants) &&
      typeof variants[0] === "string" &&
      variants[0].trim()
    ) {
      entry.caption = variants[0];
    }
  }
  return next;
}

function fanOutCaptions(
  pkg: ContentPackageOutput,
  multipliers: Record<string, number>,
  packageIndex: number,
): Array<{ platform: string; variantIndex: number; caption: string; title: string }> {
  const context = {
    strategyItemId: "00000000-0000-4000-8000-000000000099",
    weeklyStrategyId: "00000000-0000-4000-8000-000000000098",
    funnelStage: "problem_aware" as const,
    topic: "Traffic without voice",
    angle: null,
    painPoint: null,
    platform: "tiktok",
    format: "reel" as const,
    productionRunId: "b343a24b-e196-4eff-8f30-6ca9d8b6f8bc",
    packageIndex: 0,
  };
  const rows: Array<{
    platform: string;
    variantIndex: number;
    caption: string;
    title: string;
  }> = [];
  const videoPlatforms = new Set(["tiktok", "instagram", "youtube"]);
  for (const item of buildPersistableItems(pkg, context, PLATFORMS)) {
    const kind = videoPlatforms.has(item.platform) ? "video" : "text";
    const count = outputsForPackageIndex(
      kind,
      multipliers[item.platform] ?? 1,
      packageIndex,
    );
    const variants = pkg.platform_outputs?.[item.platform]?.caption_variants;
    const titleVariants = pkg.platform_outputs?.[item.platform]?.title_variants;
    for (let i = 0; i < count; i++) {
      const caption =
        Array.isArray(variants) &&
        typeof variants[i] === "string" &&
        variants[i]!.trim()
          ? variants[i]!.trim()
          : item.caption;
      const title =
        Array.isArray(titleVariants) &&
        typeof titleVariants[i] === "string" &&
        titleVariants[i]!.trim()
          ? titleVariants[i]!.trim()
          : pkg.title;
      rows.push({ platform: item.platform, variantIndex: i, caption, title });
    }
  }
  return rows;
}

// --- Part 1: b343 regression ------------------------------------------------

section("b343 caption/variants regression");

check("raw b343 candidate fails schema on captions (+ cta.type with goal enum)", () => {
  const raw = loadFixture("b343-content-package-candidate.raw.json");
  const result = validate(packageSchema(), raw);
  assert.equal(result.ok, false);
  const paths = result.ok ? [] : result.issues.map((i) => i.path);
  assert.ok(paths.includes("$.platform_outputs.linkedin.caption"));
  assert.ok(paths.includes("$.platform_outputs.x.caption"));
  assert.ok(paths.includes("$.cta.type"));
});

check("fixing only linkedin.caption still fails on x.caption", () => {
  const raw = loadFixture(
    "b343-content-package-candidate.raw.json",
  ) as Record<string, unknown>;
  const half = structuredClone(raw);
  const po = half.platform_outputs as Record<string, Record<string, unknown>>;
  const li = po.linkedin;
  assert.ok(Array.isArray(li.caption_variants));
  li.caption = (li.caption_variants as string[])[0];
  // Also fix cta so we isolate x.caption
  (half.cta as { type: string }).type = "contact";
  const result = validate(packageSchema(), half);
  assert.equal(result.ok, false);
  assert.ok(
    !result.ok &&
      result.issues.some((i) => i.path === "$.platform_outputs.x.caption"),
  );
  assert.ok(
    !result.ok &&
      !result.issues.some(
        (i) => i.path === "$.platform_outputs.linkedin.caption",
      ),
  );
});

check("caption = caption_variants[0] on linkedin+x → captions pass (cta still invalid)", () => {
  const raw = loadFixture(
    "b343-content-package-candidate.raw.json",
  ) as Record<string, unknown>;
  const fixed = synthesizeCaptionFromVariants(raw);
  const result = validate(packageSchema(), fixed);
  assert.equal(result.ok, false);
  const paths = result.ok ? [] : result.issues.map((i) => i.path);
  assert.ok(!paths.some((p) => p.includes(".caption")));
  assert.ok(paths.includes("$.cta.type"));
});

check("b343 caption-fixed fixture: schema fails cta.type; guardrails fail voiceover", () => {
  const pkg = loadFixture(
    "b343-content-package-candidate.fixed.json",
  ) as ContentPackageOutput;
  const schemaResult = validate(packageSchema(), pkg);
  assert.equal(schemaResult.ok, false);
  assert.ok(
    !schemaResult.ok &&
      schemaResult.issues.some((i) => i.path === "$.cta.type"),
  );
  // Without CTA enum, schema may pass; guardrails still catch voiceover + cta
  const loose = validate(packageSchema({ withCtaEnum: false }), pkg);
  assert.equal(loose.ok, true);
  const issues = checkContentPackageGuardrails(pkg, b343GuardrailCtx());
  assert.ok(issues.some((i) => i.path === "$.cta.type"));
  assert.ok(issues.some((i) => i.path === "$.voiceover_text"));
});

check("b343 visual_scenes remain valid", () => {
  const raw = loadFixture(
    "b343-content-package-candidate.raw.json",
  ) as ContentPackageOutput;
  assert.ok(Array.isArray(raw.visual_scenes));
  for (let i = 0; i < raw.visual_scenes!.length; i++) {
    const issues = generatedVisualSceneEntryValidator(
      raw.visual_scenes![i],
      `$.visual_scenes[${i}]`,
    );
    assert.equal(issues.length, 0, JSON.stringify(issues));
  }
});

// --- Prompt / expectedShape / repair contract text --------------------------

section("Caption/variants contract wording");

check("prompt requires caption = caption_variants[0]", () => {
  const prompt = buildContentPackagePrompt({
    project: fakeProject(),
    funnelStage: "problem_aware",
    topic: "Lost leads",
    angle: "Traffic without voice",
    platform: "tiktok",
    format: "reel",
    concept: {
      title: "T",
      core_idea: "C",
      narrative_arc: "A",
      emotional_tone: "tense",
      audience_insight: "I",
      product_role: "fix",
      why_it_works: "W",
      visual_direction: {
        art_direction: "r",
        lighting: "n",
        palette: "w",
        environment: "o",
        camera_style: "c",
        character_style: "owner",
      },
    },
    openingImpact: {
      emotion: "tension",
      pacing: "fast",
      attention_pattern: "contrast",
      first_spoken_sentence: "Seventy visitors landed.",
      first_image: "Laptop page",
    },
    visualIdentity: {
      art_direction: "r",
      lighting: "n",
      palette: "w",
      environment: "o",
      camera_style: "c",
      character_style: "owner",
      opening_emotion: "tension",
      opening_first_image: "Laptop page",
    },
    availableAssets: [],
    targetPlatforms: [...PLATFORMS],
    requireVideo: true,
    variantCounts: { linkedin: 2, x: 5 },
  });
  assert.match(prompt, /caption = caption_variants\[0\]/);
  assert.match(prompt, /never replace caption/i);
  assert.match(prompt, /LinkedIn with variants/);
  assert.match(prompt, /X with variants/);
  assert.match(prompt, /VARIANT COUNTS/);
});

check("expectedShape documents caption_variants[0] repair rule", () => {
  const shape = buildContentPackageExpectedShape();
  assert.match(shape, /caption_variants\[0\]/);
  assert.match(shape, /REQUIRED/);
  assert.match(shape, /caption_variants/);
});

check("repair prompt + system document caption_variants[0]", () => {
  assert.match(JSON_REPAIR_SYSTEM, /caption_variants\[0\]/);
  const prompt = buildJsonRepairPrompt({
    brokenOutput: "{}",
    issues: [
      {
        path: "$.platform_outputs.linkedin.caption",
        message: "expected string",
      },
    ],
    expectedShape: buildContentPackageExpectedShape(),
  });
  assert.match(prompt, /caption = caption_variants\[0\]/);
  assert.match(prompt, /LinkedIn with variants/);
});

check("platform outputs contract block is shared", () => {
  const block = buildContentPackagePlatformOutputsContractBlock();
  assert.match(block, /IN ADDITION to caption/);
  assert.ok(buildContentPackageExpectedShape().includes(block));
  assert.ok(
    buildContentPackagePrompt({
      project: fakeProject(),
      funnelStage: "problem_aware",
      topic: "t",
      concept: {
        title: "T",
        core_idea: "C",
        narrative_arc: "A",
        emotional_tone: "e",
        audience_insight: "i",
        product_role: "p",
        why_it_works: "w",
        visual_direction: {
          art_direction: "a",
          lighting: "l",
          palette: "p",
          environment: "e",
          camera_style: "c",
          character_style: "none",
        },
      },
      openingImpact: {
        emotion: "e",
        pacing: "p",
        attention_pattern: "a",
        first_spoken_sentence: "Hook.",
        first_image: "Img",
      },
      visualIdentity: {
        art_direction: "a",
        lighting: "l",
        palette: "p",
        environment: "e",
        camera_style: "c",
        character_style: "none",
        opening_emotion: "e",
        opening_first_image: "Img",
      },
      availableAssets: [],
      targetPlatforms: [...PLATFORMS],
      requireVideo: true,
    }).includes(block),
  );
});

// --- Parity (deterministic, no AI) ------------------------------------------

section("Prompt ↔ expectedShape ↔ schema parity");

const REQUIRED_TOP_LEVEL = [
  "title",
  "funnel_stage",
  "hook",
  "voiceover_text",
  "subtitles",
  "cta",
  "video",
  "platform_outputs",
] as const;

check("prompt skeleton lists every required top-level schema key", () => {
  const prompt = buildContentPackagePrompt({
    project: fakeProject(),
    funnelStage: "problem_aware",
    topic: "t",
    concept: {
      title: "T",
      core_idea: "C",
      narrative_arc: "A",
      emotional_tone: "e",
      audience_insight: "i",
      product_role: "p",
      why_it_works: "w",
      visual_direction: {
        art_direction: "a",
        lighting: "l",
        palette: "p",
        environment: "e",
        camera_style: "c",
        character_style: "none",
      },
    },
    openingImpact: {
      emotion: "e",
      pacing: "p",
      attention_pattern: "a",
      first_spoken_sentence: "Hook line.",
      first_image: "Image",
    },
    visualIdentity: {
      art_direction: "a",
      lighting: "l",
      palette: "p",
      environment: "e",
      camera_style: "c",
      character_style: "none",
      opening_emotion: "e",
      opening_first_image: "Image",
    },
    availableAssets: [],
    targetPlatforms: [...PLATFORMS],
    requireVideo: true,
  });
  for (const key of REQUIRED_TOP_LEVEL) {
    assert.match(prompt, new RegExp(`"${key}"`));
  }
  assert.match(prompt, /"duration_seconds": string/);
  assert.match(prompt, /caption_variants/);
});

check("expectedShape skeleton lists required keys + duration string", () => {
  const shape = buildContentPackageExpectedShape();
  for (const key of REQUIRED_TOP_LEVEL) {
    assert.match(shape, new RegExp(`"${key}"`));
  }
  assert.match(shape, /duration_seconds must be a string/);
});

check("schema rejects number duration_seconds", () => {
  const fixed = loadFixture(
    "b343-content-package-candidate.fixed.json",
  ) as ContentPackageOutput;
  const bad = structuredClone(fixed);
  (bad.video as { duration_seconds: unknown }).duration_seconds = 58;
  const result = validate(
    packageSchema(),
    bad,
  );
  assert.equal(result.ok, false);
  assert.ok(
    !result.ok &&
      result.issues.some((i) => i.path.includes("duration_seconds")),
  );
});

check("schema rejects object caption", () => {
  const fixed = loadFixture(
    "b343-content-package-candidate.fixed.json",
  ) as ContentPackageOutput;
  const bad = structuredClone(fixed);
  (
    bad.platform_outputs.tiktok as { caption: unknown }
  ).caption = { text: "nope" };
  const result = validate(
    packageSchema(),
    bad,
  );
  assert.equal(result.ok, false);
  assert.ok(
    !result.ok &&
      result.issues.some(
        (i) => i.path === "$.platform_outputs.tiktok.caption",
      ),
  );
});

check("CONTENT_PACKAGE_MAX_ATTEMPTS remains 2", () => {
  assert.equal(CONTENT_PACKAGE_MAX_ATTEMPTS, 2);
});

check("system prompt JSON-only", () => {
  assert.match(buildContentPackageSystem(true), /Return ONLY JSON/);
});

check("visual scenes block still present", () => {
  assert.match(
    buildContentPackageVisualScenesBlock({ requireVideo: true }),
    /VISUAL_SCENES CONTRACT/,
  );
});

// --- Model-like: validate → brief → fan-out ---------------------------------

section("Model-like package → schema → persist brief → fan-out");

check("model-like complete package validates", () => {
  const pkg = loadFixture(
    "content-package-model-like-complete.json",
  ) as ContentPackageOutput;
  const result = validate(
    packageSchema(),
    pkg,
  );
  assert.equal(result.ok, true, JSON.stringify(!result.ok ? result.issues : []));
});

check("buildPackageBrief preserves platform_outputs + visual_scenes + variants", () => {
  const pkg = loadFixture(
    "content-package-model-like-complete.json",
  ) as ContentPackageOutput;
  const brief = buildPackageBrief(pkg) as Record<string, unknown>;
  assert.ok(brief.platform_outputs);
  assert.ok(brief.visual_scenes);
  assert.ok(brief.video);
  assert.ok(brief.cta);
  const po = brief.platform_outputs as Record<string, Record<string, unknown>>;
  assert.ok(Array.isArray(po.linkedin.caption_variants));
  assert.ok(Array.isArray(po.x.title_variants));
  assert.equal(typeof po.linkedin.caption, "string");
  assert.equal(typeof po.x.caption, "string");
});

check("fan-out uses caption_variants / title_variants indices", () => {
  const pkg = loadFixture(
    "content-package-model-like-complete.json",
  ) as ContentPackageOutput;
  // Match b343 run: linkedin outputs 2, x outputs 5 (from multipliers)
  const rows = fanOutCaptions(
    pkg,
    { linkedin: 1.5, x: 5, tiktok: 1, instagram: 1, youtube: 1, facebook: 1 },
    0,
  );
  const linkedin = rows.filter((r) => r.platform === "linkedin");
  const x = rows.filter((r) => r.platform === "x");
  assert.equal(linkedin.length, 2);
  assert.equal(x.length, 5);
  assert.equal(linkedin[0]!.caption, pkg.platform_outputs.linkedin.caption_variants![0]);
  assert.equal(linkedin[1]!.caption, pkg.platform_outputs.linkedin.caption_variants![1]);
  assert.equal(x[0]!.title, pkg.platform_outputs.x.title_variants![0]);
  assert.equal(x[4]!.title, pkg.platform_outputs.x.title_variants![4]);
  // Base caption still equals variants[0] for primary slot
  assert.equal(pkg.platform_outputs.linkedin.caption, linkedin[0]!.caption);
});

check("fenced lastRaw still safeJsonParse-able for model-like", () => {
  const pkg = loadFixture("content-package-model-like-complete.json");
  const fenced = "```json\n" + JSON.stringify(pkg) + "\n```";
  const parsed = safeJsonParse(fenced);
  assert.equal(parsed.ok, true);
  assert.equal(
    validate(
      packageSchema(),
      parsed.value,
    ).ok,
    true,
  );
});

// --- Upstream pipeline stages (concept / opening) ---------------------------

section("Upstream Content Pipeline stage parity");

check("video concept prompt keys match schema", () => {
  const prompt = buildVideoConceptPrompt({
    project: fakeProject(),
    funnelStage: "problem_aware",
    topic: "t",
  });
  for (const key of [
    "title",
    "core_idea",
    "narrative_arc",
    "emotional_tone",
    "audience_insight",
    "product_role",
    "why_it_works",
    "visual_direction",
    "art_direction",
    "lighting",
    "palette",
    "environment",
    "camera_style",
    "character_style",
  ]) {
    assert.match(prompt, new RegExp(`"${key}"`));
  }
  const sample = {
    title: "T",
    core_idea: "C",
    narrative_arc: "A",
    emotional_tone: "e",
    audience_insight: "i",
    product_role: "p",
    why_it_works: "w",
    visual_direction: {
      art_direction: "a",
      lighting: "l",
      palette: "p",
      environment: "e",
      camera_style: "c",
      character_style: "none",
    },
  };
  assert.equal(validate(videoConceptSchema, sample).ok, true);
});

check("opening impact prompt keys match schema", () => {
  const prompt = buildOpeningImpactPrompt({
    project: fakeProject(),
    concept: {
      title: "T",
      core_idea: "C",
      narrative_arc: "A",
      emotional_tone: "e",
      audience_insight: "i",
      product_role: "p",
      why_it_works: "w",
      visual_direction: {
        art_direction: "a",
        lighting: "l",
        palette: "p",
        environment: "e",
        camera_style: "c",
        character_style: "none",
      },
    },
  });
  for (const key of [
    "first_image",
    "first_spoken_sentence",
    "emotion",
    "pacing",
    "attention_pattern",
  ]) {
    assert.match(prompt, new RegExp(`"${key}"`));
  }
  assert.equal(
    validate(openingImpactSchema, {
      first_image: "img",
      first_spoken_sentence: "line",
      emotion: "e",
      pacing: "p",
      attention_pattern: "a",
    }).ok,
    true,
  );
});

// --- C1 CTA / C2 voiceover / full preflight --------------------------------

section("C1 CTA funnel-stage contract (organic social)");

check("allowedCtaTypesForGoal still mirrors CTA_TYPES_BY_GOAL for business", () => {
  assert.deepEqual(
    [...allowedCtaTypesForGoal("lead_generation")],
    [...CTA_TYPES_BY_GOAL.lead_generation],
  );
});

check("Awareness without CTA passes schema + guardrails", () => {
  const pkg = structuredClone(
    loadFixture(
      "b343-content-package-candidate.guardrails-fixed.json",
    ) as ContentPackageOutput,
  );
  pkg.funnel_stage = "Awareness";
  pkg.cta = null as unknown as ContentPackageOutput["cta"];
  for (const out of Object.values(pkg.platform_outputs)) {
    (out as { cta?: string | null }).cta = null;
  }
  const schema = packageSchema({ funnelStage: "awareness" });
  assert.equal(validate(schema, pkg).ok, true);
  const ctx = { ...b343GuardrailCtx(), strategyItemFunnelStage: "awareness" as const };
  assert.equal(checkContentPackageGuardrails(pkg, ctx).length, 0);
});

check("Problem Aware without CTA passes schema + guardrails", () => {
  const pkg = structuredClone(
    loadFixture(
      "b343-content-package-candidate.guardrails-fixed.json",
    ) as ContentPackageOutput,
  );
  pkg.funnel_stage = "Problem Aware";
  pkg.cta = null as unknown as ContentPackageOutput["cta"];
  for (const out of Object.values(pkg.platform_outputs)) {
    delete (out as { cta?: string }).cta;
  }
  assert.equal(validate(packageSchema({ funnelStage: "problem_aware" }), pkg).ok, true);
  assert.equal(
    checkContentPackageGuardrails(pkg, b343GuardrailCtx()).length,
    0,
  );
});

check("Awareness with soft CTA passes", () => {
  const pkg = structuredClone(
    loadFixture(
      "b343-content-package-candidate.guardrails-fixed.json",
    ) as ContentPackageOutput,
  );
  pkg.funnel_stage = "Awareness";
  pkg.cta = { type: "follow", text: "Follow for the next tip." };
  const ctx = { ...b343GuardrailCtx(), strategyItemFunnelStage: "awareness" as const };
  assert.equal(validate(packageSchema({ funnelStage: "awareness" }), pkg).ok, true);
  assert.equal(checkContentPackageGuardrails(pkg, ctx).length, 0);
});

check("Conversion without CTA fails", () => {
  const pkg = structuredClone(
    loadFixture(
      "b343-content-package-candidate.guardrails-fixed.json",
    ) as ContentPackageOutput,
  );
  pkg.funnel_stage = "Conversion";
  pkg.cta = null as unknown as ContentPackageOutput["cta"];
  const schema = packageSchema({ funnelStage: "conversion", ctaRequired: true });
  assert.equal(validate(schema, pkg).ok, false);
  const ctx = {
    ...b343GuardrailCtx(),
    strategyItemFunnelStage: "conversion" as const,
  };
  assert.ok(
    checkContentPackageGuardrails(pkg, ctx).some((i) => i.path === "$.cta"),
  );
});

check("Conversion with valid business CTA passes", () => {
  const pkg = structuredClone(
    loadFixture(
      "b343-content-package-candidate.guardrails-fixed.json",
    ) as ContentPackageOutput,
  );
  pkg.funnel_stage = "Conversion";
  pkg.cta = { type: "contact", text: "Book a short consultation." };
  for (const out of Object.values(pkg.platform_outputs)) {
    (out as { cta?: string }).cta = "Book a short consultation.";
  }
  const schema = packageSchema({ funnelStage: "conversion", ctaRequired: true });
  assert.equal(validate(schema, pkg).ok, true);
  const ctx = {
    ...b343GuardrailCtx(),
    strategyItemFunnelStage: "conversion" as const,
  };
  assert.equal(checkContentPackageGuardrails(pkg, ctx).length, 0);
});

check("Conversion with lead_generation as cta.type fails", () => {
  const pkg = structuredClone(
    loadFixture(
      "b343-content-package-candidate.guardrails-fixed.json",
    ) as ContentPackageOutput,
  );
  pkg.funnel_stage = "Conversion";
  pkg.cta = {
    type: "lead_generation",
    text: "Get a demo",
  } as ContentPackageOutput["cta"];
  const schema = packageSchema({ funnelStage: "conversion", ctaRequired: true });
  const result = validate(schema, pkg);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.issues.some((i) => i.path === "$.cta.type"));
});

check("fan-out without CTA never emits null/undefined/empty CTA text", () => {
  const pkg = structuredClone(
    loadFixture(
      "b343-content-package-candidate.guardrails-fixed.json",
    ) as ContentPackageOutput,
  );
  pkg.cta = null as unknown as ContentPackageOutput["cta"];
  for (const out of Object.values(pkg.platform_outputs)) {
    (out as { cta?: string | null }).cta = null;
  }
  const context = {
    strategyItemId: "00000000-0000-4000-8000-000000000099",
    weeklyStrategyId: "00000000-0000-4000-8000-000000000098",
    funnelStage: "problem_aware" as const,
    topic: "Traffic without voice",
    angle: null,
    painPoint: null,
    platform: "tiktok",
    format: "reel" as const,
    productionRunId: "b343a24b-e196-4eff-8f30-6ca9d8b6f8bc",
    packageIndex: 0,
  };
  const items = buildPersistableItems(pkg, context, PLATFORMS);
  assert.ok(items.length > 0);
  for (const item of items) {
    assert.equal(item.cta, null);
    assert.notEqual(item.cta, "");
    const ready = buildPublishReadyText({
      platform: item.platform as never,
      title: pkg.title,
      caption: item.caption,
      cta: item.cta,
      hashtags: item.hashtags,
    });
    assert.ok(!/\bnull\b/i.test(ready));
    assert.ok(!/\bundefined\b/i.test(ready));
    assert.ok(item.caption.length > 0);
    assert.ok(ready.includes(item.caption.trim().slice(0, 20)));
  }
  assert.equal(normalizePlatformCta(""), null);
  assert.equal(normalizePlatformCta("null"), null);
  assert.equal(normalizePlatformCta("undefined"), null);
});

check("schema rejects lead_generation cta.type on problem_aware soft set", () => {
  const pkg = loadFixture(
    "b343-content-package-candidate.guardrails-fixed.json",
  ) as ContentPackageOutput;
  const bad = structuredClone(pkg);
  bad.cta = { type: "lead_generation", text: "x" } as ContentPackageOutput["cta"];
  const result = validate(packageSchema({ funnelStage: "problem_aware" }), bad);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.issues.some((i) => i.path === "$.cta.type"));
});

check("schema accepts soft save cta.type on problem_aware", () => {
  const pkg = loadFixture(
    "b343-content-package-candidate.guardrails-fixed.json",
  ) as ContentPackageOutput;
  assert.equal(pkg.cta?.type, "save");
  assert.equal(validate(packageSchema({ funnelStage: "problem_aware" }), pkg).ok, true);
});

check("prompt lists soft CTA for problem_aware and forbids goal-as-type", () => {
  const prompt = buildContentPackagePrompt({
    project: fakeProject(),
    funnelStage: "problem_aware",
    topic: "t",
    concept: {
      title: "T",
      core_idea: "C",
      narrative_arc: "A",
      emotional_tone: "e",
      audience_insight: "i",
      product_role: "p",
      why_it_works: "w",
      visual_direction: {
        art_direction: "a",
        lighting: "l",
        palette: "p",
        environment: "e",
        camera_style: "c",
        character_style: "none",
      },
    },
    openingImpact: {
      emotion: "e",
      pacing: "p",
      attention_pattern: "a",
      first_spoken_sentence: "Hook.",
      first_image: "Img",
    },
    visualIdentity: {
      art_direction: "a",
      lighting: "l",
      palette: "p",
      environment: "e",
      camera_style: "c",
      character_style: "none",
      opening_emotion: "e",
      opening_first_image: "Img",
    },
    availableAssets: [],
    targetPlatforms: [...PLATFORMS],
    requireVideo: true,
  });
  for (const t of SOFT_CTA_TYPES) {
    assert.match(prompt, new RegExp(t));
  }
  assert.match(prompt, /MAY be null/i);
  assert.match(prompt, /organic social/i);
});

check("expectedShape + repair include optional CTA + soft list for problem_aware", () => {
  const shape = buildContentPackageExpectedShape({
    goalType: "lead_generation",
    funnelStage: "problem_aware",
    allowedCtaTypes: [...SOFT_CTA_TYPES],
    ctaRequired: false,
  });
  assert.match(shape, /follow \| save \| comment \| share/);
  assert.match(shape, /may be null/i);
  assert.match(JSON_REPAIR_SYSTEM, /cta may be null/i);
  const repair = buildJsonRepairPrompt({
    brokenOutput: "{}",
    issues: [{ path: "$.cta.type", message: "expected one of: follow" }],
    expectedShape: shape,
  });
  assert.match(repair, /change only cta\.type|prefer cta: null/i);
});

check("conversion expectedShape requires business CTA from goal", () => {
  const shape = buildContentPackageExpectedShape({
    goalType: "lead_generation",
    funnelStage: "conversion",
    allowedCtaTypes: LEAD_GEN_CTA,
    ctaRequired: true,
  });
  assert.match(shape, /REQUIRED/i);
  assert.match(shape, /lead \| contact \| book/);
});

section("C2 voiceover word limit");

check("prompt + expectedShape document hard max 80", () => {
  const prompt = buildContentPackagePrompt({
    project: fakeProject(),
    funnelStage: "problem_aware",
    topic: "t",
    concept: {
      title: "T",
      core_idea: "C",
      narrative_arc: "A",
      emotional_tone: "e",
      audience_insight: "i",
      product_role: "p",
      why_it_works: "w",
      visual_direction: {
        art_direction: "a",
        lighting: "l",
        palette: "p",
        environment: "e",
        camera_style: "c",
        character_style: "none",
      },
    },
    openingImpact: {
      emotion: "e",
      pacing: "p",
      attention_pattern: "a",
      first_spoken_sentence: "Hook line for opening.",
      first_image: "Img",
    },
    visualIdentity: {
      art_direction: "a",
      lighting: "l",
      palette: "p",
      environment: "e",
      camera_style: "c",
      character_style: "none",
      opening_emotion: "e",
      opening_first_image: "Img",
    },
    availableAssets: [],
    targetPlatforms: [...PLATFORMS],
    requireVideo: true,
  });
  assert.match(
    prompt,
    new RegExp(`Hard maximum ${VOICEOVER_HARD_CAP_WORDS}`),
  );
  assert.match(
    prompt,
    new RegExp(
      `${VOICEOVER_TARGET_MIN_WORDS}–${VOICEOVER_TARGET_MAX_WORDS}`,
    ),
  );
  const shape = buildContentPackageExpectedShape({
    goalType: "lead_generation",
    allowedCtaTypes: LEAD_GEN_CTA,
  });
  assert.match(shape, /maximum 80 words/);
  assert.match(JSON_REPAIR_SYSTEM, /at most 80 words/);
});

check("guardrails reject 179 and 81 words; accept 80 and 55", () => {
  const base = loadFixture(
    "b343-content-package-candidate.guardrails-fixed.json",
  ) as ContentPackageOutput;
  const mk = (n: number) => {
    const pkg = structuredClone(base);
    pkg.voiceover_text = Array.from({ length: n }, () => "word").join(" ");
    return pkg;
  };
  assert.ok(
    checkContentPackageGuardrails(mk(179), b343GuardrailCtx()).some(
      (i) => i.path === "$.voiceover_text",
    ),
  );
  assert.ok(
    checkContentPackageGuardrails(mk(81), b343GuardrailCtx()).some(
      (i) => i.path === "$.voiceover_text",
    ),
  );
  assert.ok(
    !checkContentPackageGuardrails(mk(80), b343GuardrailCtx()).some(
      (i) => i.path === "$.voiceover_text",
    ),
  );
  assert.ok(
    !checkContentPackageGuardrails(mk(55), b343GuardrailCtx()).some(
      (i) => i.path === "$.voiceover_text",
    ),
  );
});

check("runContentPackage enables repairGuardrailFailures + CTA enum wiring", () => {
  const src = readFileSync(
    join(root, "lib/content-pipeline/runContentPackage.ts"),
    "utf8",
  );
  assert.match(src, /repairGuardrailFailures:\s*true/);
  assert.match(src, /allowedCtaTypes/);
  assert.match(src, /buildContentPackageExpectedShape\(\{/);
});

section("Full local preflight (schema → guardrails → brief → fan-out)");

check("guardrails-fixed b343 passes schema + guardrails + brief + fan-out", () => {
  const pkg = loadFixture(
    "b343-content-package-candidate.guardrails-fixed.json",
  ) as ContentPackageOutput;
  assert.equal(validate(packageSchema(), pkg).ok, true);
  const gIssues = checkContentPackageGuardrails(pkg, b343GuardrailCtx());
  assert.equal(gIssues.length, 0, JSON.stringify(gIssues));
  assert.ok(wordCount(pkg.voiceover_text) <= VOICEOVER_HARD_CAP_WORDS);
  assert.ok(wordCount(pkg.voiceover_text) >= 40);
  assert.ok(
    SOFT_CTA_TYPES.includes(
      pkg.cta?.type as (typeof SOFT_CTA_TYPES)[number],
    ),
  );
  assert.equal(
    pkg.platform_outputs.linkedin.caption,
    pkg.platform_outputs.linkedin.caption_variants![0],
  );
  assert.equal(
    pkg.platform_outputs.x.caption,
    pkg.platform_outputs.x.caption_variants![0],
  );
  assert.equal(pkg.platform_outputs.x.title_variants!.length, 5);
  assert.equal(pkg.visual_scenes!.length, 5);
  assert.ok(
    (pkg.image_prompts?.length ?? 0) >= 1 &&
      (pkg.image_prompts?.length ?? 0) <= 5,
  );

  const brief = buildPackageBrief(pkg) as Record<string, unknown>;
  assert.ok(brief.platform_outputs);
  assert.ok(brief.visual_scenes);
  assert.equal(typeof (brief.cta as { type: string }).type, "string");

  const rows = fanOutCaptions(
    pkg,
    { linkedin: 1.5, x: 5, tiktok: 1, instagram: 1, youtube: 1, facebook: 1 },
    0,
  );
  assert.equal(rows.filter((r) => r.platform === "linkedin").length, 2);
  assert.equal(rows.filter((r) => r.platform === "x").length, 5);
  for (const p of PLATFORMS) {
    assert.ok(rows.some((r) => r.platform === p));
  }
});

check("model-like complete passes full preflight with CTA enum", () => {
  const pkg = loadFixture(
    "content-package-model-like-complete.json",
  ) as ContentPackageOutput;
  assert.equal(validate(packageSchema(), pkg).ok, true);
  assert.equal(
    checkContentPackageGuardrails(pkg, b343GuardrailCtx()).length,
    0,
  );
});

check("n8n repo JSON keeps N3 retryOnFail false", () => {
  const bridge = JSON.parse(
    readFileSync(
      join(root, "n8n/generate-content-package-bridge.json"),
      "utf8",
    ),
  ) as { nodes: Array<Record<string, unknown>> };
  const n3 = bridge.nodes.find(
    (n) => n.name === "N3 — Generate Content Package",
  );
  assert.ok(n3);
  assert.equal(n3!.retryOnFail, false);
  assert.ok(n3!.maxTries === 1 || n3!.maxTries === undefined);
  assert.equal(n3!.onError, "continueRegularOutput");
});

check("app guard already_settled_failed still present", () => {
  const src = readFileSync(
    join(root, "lib/n8n/handleGenerateContentPackageRequest.ts"),
    "utf8",
  );
  assert.match(src, /already_settled_failed/);
});

check("platform style docs still mention X 280 and Shorts length", () => {
  assert.ok(X_CAPTION_HARD_CAP_CHARS === 280);
  assert.ok(YOUTUBE_SHORTS_CAPTION_HARD_CAP_WORDS === 55);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
