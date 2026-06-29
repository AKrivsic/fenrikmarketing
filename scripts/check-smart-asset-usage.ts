// Smart asset usage metadata + video worker inclusion safety.
//   npm run check:smart-asset-usage

import assert from "node:assert/strict";
import {
  computeSmartUsageMetadata,
  shouldIncludeAssetInVideoWorker,
  usedAsIndicatesFramedPresentation,
} from "@/lib/assets/smartUsageMetadata";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import type { Project } from "@/lib/supabase/types";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

check("landscape OG / social preview metadata", () => {
  const meta = computeSmartUsageMetadata({
    width: 1200,
    height: 630,
    productRole: "hero_image",
    ingestKind: "og_image",
    title: "Website social preview image",
    source: "website_ingestion",
  });
  assert.equal(meta.orientation, "landscape");
  assert.equal(meta.safe_vertical_usage, false);
  assert.ok(
    meta.video_suitability === "avoid_fullscreen" ||
      meta.video_suitability === "screen_insert",
  );
});

check("landscape OG may be queued for video worker (usage mode enforced at generation)", () => {
  const meta = computeSmartUsageMetadata({
    width: 1200,
    height: 630,
    ingestKind: "og_image",
    title: "Website social preview image",
    source: "website_ingestion",
  });
  assert.equal(
    shouldIncludeAssetInVideoWorker({ metadata: meta, usedAs: "Hero background" }),
    true,
  );
});

check("landscape OG with laptop framing used_as is allowed in worker queue", () => {
  const meta = computeSmartUsageMetadata({
    width: 1200,
    height: 630,
    ingestKind: "og_image",
    title: "Website social preview image",
    source: "website_ingestion",
  });
  assert.equal(
    shouldIncludeAssetInVideoWorker({
      metadata: meta,
      usedAs:
        "Show this landscape social preview as a framed laptop screen in the CTA beat; do not crop fullscreen.",
    }),
    true,
  );
  assert.ok(
    usedAsIndicatesFramedPresentation(
      "Show this landscape social preview as a framed laptop screen",
    ),
  );
});

check("portrait mobile UI allowed in video worker", () => {
  const meta = computeSmartUsageMetadata({
    width: 390,
    height: 844,
    productRole: "product_ui",
    title: "Mobile app screen",
    detectedContentType: "app screen",
    source: "upload",
  });
  assert.equal(
    shouldIncludeAssetInVideoWorker({ metadata: meta, usedAs: "Phone screen insert" }),
    true,
  );
});

check("logo metadata favors branding / not primary fullscreen", () => {
  const meta = computeSmartUsageMetadata({
    width: 400,
    height: 400,
    productRole: "logo",
    title: "Company logo",
    source: "upload",
  });
  assert.ok(
    meta.preferred_presentation === "branding" ||
      meta.video_suitability === "branding_prop" ||
      meta.video_suitability === "end_card",
  );
  assert.equal(
    shouldIncludeAssetInVideoWorker({
      metadata: { ...meta, safe_vertical_usage: false },
      usedAs: "Full-screen hero scene",
    }),
    true,
  );
});

check("portrait mobile UI metadata", () => {
  const meta = computeSmartUsageMetadata({
    width: 390,
    height: 844,
    productRole: "product_ui",
    title: "Mobile app screen",
    detectedContentType: "app screen",
    source: "upload",
  });
  assert.equal(meta.orientation, "portrait");
  assert.equal(meta.preferred_presentation, "phone_screen");
  assert.equal(meta.safe_vertical_usage, true);
  assert.ok(
    meta.video_suitability === "primary_scene" ||
      meta.video_suitability === "screen_insert",
  );
});

check("prompt includes SMART ASSET USAGE RULES", () => {
  const project = {
    id: "p1",
    name: "Co",
    type: "service",
    language: "cs",
    market_scope: "local",
    goal_type: "awareness",
    target_audience: {},
    product_is: [],
    product_is_not: [],
    product_strengths: [],
    pain_points: [],
    forbidden_claims: [],
    tone_of_voice: {},
    platforms: [],
    publishing_rules: {},
    default_cta: null,
  } as unknown as Project;
  const directives: CreativeDirectives = {
    mode: CREATIVE_MODES[0],
    hook: HOOK_ARCHETYPES[0],
    persona: VOICE_PERSONAS[0],
  };
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "t",
    availableAssets: [
      {
        id: "og-1",
        title: "Website social preview image",
        asset_class: "static",
        media_type: "image",
        orientation: "landscape",
        safe_vertical_usage: false,
        video_suitability: "avoid_fullscreen",
      },
    ],
    directives,
  });
  assert.ok(prompt.includes("SMART ASSET USAGE RULES"));
  assert.ok(prompt.includes("Do not use landscape assets as full-screen vertical scenes"));
  assert.ok(prompt.includes("used_as as a concrete placement instruction"));
});

check("production prompt without assets unchanged aside from smart rules block", () => {
  const project = {
    id: "p-none",
    name: "Co",
    type: "service",
    language: "cs",
    market_scope: "local",
    goal_type: "awareness",
    target_audience: {},
    product_is: [],
    product_is_not: [],
    product_strengths: [],
    pain_points: [],
    forbidden_claims: [],
    tone_of_voice: {},
    platforms: [],
    publishing_rules: {},
    default_cta: null,
  } as unknown as Project;
  const directives: CreativeDirectives = {
    mode: CREATIVE_MODES[0],
    hook: HOOK_ARCHETYPES[0],
    persona: VOICE_PERSONAS[0],
  };
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "t",
    availableAssets: [],
    directives,
  });
  assert.ok(prompt.includes("(none)"));
  assert.ok(!prompt.includes("SAMPLE PACKAGE RULES"));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
