/**
 * Focused checks for the shared Facebook + LinkedIn social image feature.
 *
 * Usage: npm run check:social-image
 */

import assert from "node:assert/strict";
import {
  buildContentPackageSchema,
  type ContentPackageOutput,
} from "@/lib/ai/schemas/contentPackage";
import { buildPackageBrief } from "@/lib/ai/workflows/packageShared";
import {
  checkContentPackageGuardrails,
  checkPlatformNativeWriting,
  STATIC_FEED_VIDEO_WATCH_PHRASES,
} from "@/lib/ai/guardrails";
import {
  SOCIAL_IMAGE_SIZE,
  buildSocialImageProviderPrompt,
  normalizeSocialImageCreative,
  packageNeedsSocialImage,
  packageSocialImageHasRenderableFile,
  parsePackageSocialImage,
  socialImagePlatformsPresent,
} from "@/lib/content-package/socialImage";
import {
  buildContentPackagePrompt,
  buildContentPackageSystem,
} from "@/lib/content-pipeline/prompts/contentPackage";
import type { Project } from "@/lib/supabase/types";
import type {
  OpeningImpact,
  VideoConcept,
  VisualIdentity,
} from "@/lib/content-pipeline/types";

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

const basePkg = (): ContentPackageOutput =>
  ({
    title: "Test package",
    funnel_stage: "Awareness",
    hook: "Something important changed this year.",
    voiceover_text:
      "Something important changed this year. Here is why it matters for owners who want clearer weekly content without inventing claims.",
    subtitles:
      "Something important changed this year. Here is why it matters for owners who want clearer weekly content without inventing claims.",
    cta: null,
    video: {
      concept: "A clear explanation of a common business friction.",
      script: "Scene 1. Scene 2. Scene 3.",
      duration_seconds: "24",
    },
    platform_outputs: {
      tiktok: { caption: "Curious opener. Quick payoff." },
      instagram: { caption: "Emotional hook.\n\nSoft CTA." },
      youtube: { caption: "Curious short caption." },
      facebook: { caption: "Friendly community note about the idea." },
      linkedin: { caption: "Professional insight with a clear takeaway." },
      x: { caption: "Sharp observation." },
    },
    image_prompts: ["scene one", "scene two", "scene three"],
    visual_scenes: [
      { source: "ai", image_prompt: "scene one" },
      { source: "ai", image_prompt: "scene two" },
      { source: "ai", image_prompt: "scene three" },
    ],
    social_image: {
      image_prompt:
        "Clean desk with notebook and soft window light, professional and calm",
      text_overlay: null,
    },
  }) as ContentPackageOutput;

section("A–D: when to generate (platform gating)");

check("A. Facebook + LinkedIn → needs social image", () => {
  assert.equal(
    packageNeedsSocialImage(["tiktok", "facebook", "linkedin"]),
    true,
  );
  assert.deepEqual(socialImagePlatformsPresent(["facebook", "linkedin"]), [
    "facebook",
    "linkedin",
  ]);
});

check("B. Facebook only → needs exactly one social image gate", () => {
  assert.equal(packageNeedsSocialImage(["instagram", "facebook"]), true);
  assert.deepEqual(socialImagePlatformsPresent(["facebook"]), ["facebook"]);
});

check("C. LinkedIn only → needs social image", () => {
  assert.equal(packageNeedsSocialImage(["linkedin", "x"]), true);
  assert.deepEqual(socialImagePlatformsPresent(["linkedin"]), ["linkedin"]);
});

check("D. Neither Facebook nor LinkedIn → zero", () => {
  assert.equal(packageNeedsSocialImage(["tiktok", "instagram", "youtube", "x"]), false);
  assert.deepEqual(
    socialImagePlatformsPresent(["tiktok", "instagram", "youtube", "x"]),
    [],
  );
});

section("Schema / brief / historical compatibility");

check("schema requires social_image when requireSocialImage", () => {
  const schema = buildContentPackageSchema(["facebook", "linkedin"], {
    requireVideo: false,
    requireSocialImage: true,
  });
  const issues = schema({
    ...basePkg(),
    social_image: undefined,
  });
  assert.ok(issues.some((i) => i.path.includes("social_image")));
});

check("schema allows omitting social_image when not required", () => {
  const schema = buildContentPackageSchema(["tiktok", "instagram"], {
    requireVideo: true,
    requireSocialImage: false,
  });
  const pkg = { ...basePkg() };
  delete (pkg as { social_image?: unknown }).social_image;
  const issues = schema(pkg);
  assert.equal(
    issues.filter((i) => i.path.includes("social_image")).length,
    0,
  );
});

check("buildPackageBrief preserves social_image and stays optional", () => {
  const withImage = buildPackageBrief(basePkg()) as Record<string, unknown>;
  assert.ok(withImage.social_image);
  const without = { ...basePkg() };
  delete (without as { social_image?: unknown }).social_image;
  const brief = buildPackageBrief(without) as Record<string, unknown>;
  assert.equal(brief.social_image, null);
});

check("F. historical brief without social_image parses as null", () => {
  assert.equal(parsePackageSocialImage({ hook: "old" }), null);
  assert.equal(packageSocialImageHasRenderableFile(null), false);
});

check("G. same asset identity fields on ready social_image", () => {
  const social = parsePackageSocialImage({
    social_image: {
      image_prompt: "desk",
      text_overlay: null,
      status: "ready",
      asset_id: "asset-1",
      ai_visual_id: "vis-1",
      storage_bucket: "generated-visuals",
      storage_path: "p/generated/vis-1/social-image.png",
      size: SOCIAL_IMAGE_SIZE,
      platforms: ["facebook", "linkedin"],
    },
  });
  assert.ok(social);
  assert.equal(social!.asset_id, "asset-1");
  assert.equal(social!.size, "1024x1024");
  assert.deepEqual(social!.platforms, ["facebook", "linkedin"]);
  assert.equal(packageSocialImageHasRenderableFile(social), true);
});

section("I. provider prompt size / composition");

check("provider prompt is square feed, not 9:16 video scene", () => {
  const prompt = buildSocialImageProviderPrompt({
    image_prompt: "Technician checking a control panel",
    text_overlay: null,
  });
  assert.match(prompt, /1:1 square/i);
  assert.match(prompt, /readable text/i);
  assert.equal(prompt.includes("9:16"), false);
  assert.equal(SOCIAL_IMAGE_SIZE, "1024x1024");
});

check("text overlay included only when provided", () => {
  const withText = buildSocialImageProviderPrompt({
    image_prompt: "Calm office",
    text_overlay: "What changed?",
  });
  assert.match(withText, /What changed\?/);
  const creative = normalizeSocialImageCreative({
    image_prompt: "Calm office",
    text_overlay: "  ",
  });
  assert.equal(creative?.text_overlay, null);
});

section("K. FB/LinkedIn copy guardrails");

check("static FB/LI captions reject watch-this-video language", () => {
  const pkg = basePkg();
  pkg.platform_outputs.facebook = {
    caption: "Watch this video to learn the pattern.",
  };
  const issues = checkPlatformNativeWriting(pkg, {
    videoPlatforms: ["tiktok", "instagram", "youtube"],
  });
  assert.ok(
    issues.some((i) => i.path.includes("facebook")),
    "expected facebook watch-video issue",
  );
  assert.ok(STATIC_FEED_VIDEO_WATCH_PHRASES.length > 0);
});

check("FB video platform may keep video language", () => {
  const pkg = basePkg();
  pkg.platform_outputs.facebook = {
    caption: "Watch this video for the full walkthrough.",
  };
  const issues = checkPlatformNativeWriting(pkg, {
    videoPlatforms: ["facebook", "tiktok"],
  });
  assert.equal(
    issues.filter((i) => i.path.includes("facebook")).length,
    0,
  );
});

check("guardrails require social_image when flagged", () => {
  const pkg = basePkg();
  delete (pkg as { social_image?: unknown }).social_image;
  const issues = checkContentPackageGuardrails(pkg, {
    project: {
      goal_type: "lead_generation",
      forbidden_claims: [],
      product_is_not: [],
    },
    weeklyStrategyId: "ws",
    strategyItemId: "si",
    strategyItemFunnelStage: "awareness",
    requiredPlatforms: ["facebook", "linkedin"],
    requireVideo: false,
    requireSocialImage: true,
  });
  assert.ok(issues.some((i) => i.path.includes("social_image")));
});

section("Prompt wiring");

check("prompt includes social_image contract when FB/LI present", () => {
  const project = {
    id: "p1",
    name: "Acme",
    type: "saas",
    language: "en",
    market_scope: "local",
    goal_type: "lead_generation",
    target_audience: {},
    tone_of_voice: {},
    product_is: ["helpful software"],
    product_is_not: [],
    product_strengths: [],
    pain_points: [],
    forbidden_claims: [],
    platforms: ["facebook", "linkedin", "tiktok"],
    default_cta: null,
    knowledge: {},
  } as unknown as Project;
  const concept = {
    title: "Title",
    core_idea: "idea",
    narrative_arc: "arc",
    emotional_tone: "clear",
    audience_insight: "insight",
    product_role: "role",
    why_it_works: "why",
    visual_direction: {
      art_direction: "clean",
      lighting: "soft",
      palette: "warm",
      environment: "office",
      camera_style: "eye level",
      character_style: "natural",
    },
  } as VideoConcept;
  const opening = {
    first_spoken_sentence: "Something important changed this year.",
    first_image: "desk",
    emotion: "clarity",
    pacing: "steady",
    attention_pattern: "curiosity",
  } as OpeningImpact;
  const identity = {
    art_direction: "clean",
    lighting: "soft",
    palette: "warm",
    environment: "office",
    camera_style: "eye level",
    character_style: "natural",
    opening_emotion: "clarity",
    opening_first_image: "desk",
  } as VisualIdentity;

  const prompt = buildContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "topic",
    concept,
    openingImpact: opening,
    visualIdentity: identity,
    availableAssets: [],
    targetPlatforms: ["facebook", "linkedin", "tiktok"],
    requireVideo: true,
    videoPlatforms: ["tiktok"],
  });
  assert.match(prompt, /SOCIAL_IMAGE CONTRACT/);
  assert.match(prompt, /social_image/);
  assert.match(
    buildContentPackageSystem(true, true),
    /social_image creative/i,
  );

  const noFb = buildContentPackagePrompt({
    project: {
      ...project,
      platforms: ["tiktok", "instagram"],
    } as unknown as Project,
    funnelStage: "awareness",
    topic: "topic",
    concept,
    openingImpact: opening,
    visualIdentity: identity,
    availableAssets: [],
    targetPlatforms: ["tiktok", "instagram"],
    requireVideo: true,
    videoPlatforms: ["tiktok", "instagram"],
  });
  assert.equal(noFb.includes("SOCIAL_IMAGE CONTRACT"), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
