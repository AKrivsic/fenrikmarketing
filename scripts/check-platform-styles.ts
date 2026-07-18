// Dependency-free check for Platform Styles. Runs via Node's built-in type
// stripping + the "@/" alias loader:
//   npm run check:platform-styles
//
// Content Quality Sprint + Sprint 4B — verifies platform-native writing specs,
// Facebook always-on package targets, and native-writing guardrails.

import assert from "node:assert/strict";
import {
  buildGenerateContentPackagePrompt,
  buildPlatformNativeWritingRulesBlock,
  PLATFORM_NATIVE_WRITING_HEADER,
  PLATFORM_STYLE_SPECS,
} from "@/lib/ai/prompts/generateContentPackage";
import {
  checkPlatformNativeWriting,
  YOUTUBE_SHORTS_CAPTION_HARD_CAP_WORDS,
  YOUTUBE_SHORTS_SEO_OPENERS,
} from "@/lib/ai/guardrails";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  ensureFacebookPackagePlatform,
  resolvePackagePlatforms,
} from "@/lib/projects/contentControls";
import { resolveRunGenerationPlan } from "@/lib/projects/productionRun";
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

function section(title: string): void {
  console.log(`\n${title}`);
}

const project = {
  id: "p1",
  name: "Test Co",
  type: "service",
  language: "cs",
  market_scope: "local",
  goal_type: "leads",
  target_audience: {},
  product_is: ["fast cleaning"],
  product_is_not: [],
  product_strengths: ["thorough"],
  pain_points: ["smelly kitchen"],
  forbidden_claims: [],
  tone_of_voice: {},
  platforms: [],
  publishing_rules: {},
  default_cta: null,
} as unknown as Project;

const ALL_PLATFORMS = [
  "tiktok",
  "instagram",
  "youtube",
  "x",
  "google_business",
  "linkedin",
  "facebook",
] as const;

section("style catalogue covers every platform");

check("every production platform has a style spec", () => {
  for (const p of ALL_PLATFORMS) {
    const spec = PLATFORM_STYLE_SPECS[p];
    assert.ok(spec, `missing style spec for ${p}`);
    assert.ok(spec.tone.length > 0, `${p}.tone empty`);
    assert.ok(spec.structure.length > 0, `${p}.structure empty`);
    assert.ok(spec.cta.length > 0, `${p}.cta empty`);
    assert.ok(spec.length.length > 0, `${p}.length empty`);
  }
});

check("Sprint 4B specs include hard rules for core platforms", () => {
  for (const p of ["tiktok", "instagram", "youtube", "linkedin", "facebook", "x"]) {
    const spec = PLATFORM_STYLE_SPECS[p];
    assert.ok(spec.rules && spec.rules.length > 0, `${p} missing rules`);
  }
});

check("YouTube style forbids SEO article energy", () => {
  const yt = PLATFORM_STYLE_SPECS.youtube;
  const blob = yt.tone + yt.length + (yt.rules ?? []).join(" ");
  assert.ok(/NOT.*SEO|Shorts/i.test(blob));
  assert.ok(yt.rules?.some((r) => /This video breaks down/i.test(r)));
});

check("TikTok style emphasizes punch + curiosity + short", () => {
  const tt = PLATFORM_STYLE_SPECS.tiktok;
  assert.ok(/punch|curiosit/i.test(tt.tone + tt.structure));
  assert.ok(/≤25 words|max 2|1 short/i.test(tt.length));
});

section("prompt includes per-platform style guidance");

const prompt = buildGenerateContentPackagePrompt({
  project,
  funnelStage: "awareness" as const,
  topic: "kitchen smell",
  angle: "the sponge is the problem",
  availableAssets: [],
  targetPlatforms: ALL_PLATFORMS,
  requireVideo: true,
  videoPlatforms: ["tiktok", "instagram", "youtube"] as const,
});

check("prompt has a PLATFORM STYLES section", () => {
  assert.ok(prompt.includes("PLATFORM STYLES"));
});

check("prompt has Sprint 4B PLATFORM-NATIVE WRITING header", () => {
  assert.ok(prompt.includes(PLATFORM_NATIVE_WRITING_HEADER));
  assert.ok(
    buildPlatformNativeWritingRulesBlock().includes("Do NOT duplicate voiceover"),
  );
});

check("each target platform appears in the style block with its tone", () => {
  for (const p of ALL_PLATFORMS) {
    const spec = PLATFORM_STYLE_SPECS[p];
    assert.ok(prompt.includes(`- ${p}: tone=${spec.tone}`), `missing ${p} style line`);
  }
});

check("style block carries structure, cta and length per platform", () => {
  assert.ok(prompt.includes("<= 280 characters") || prompt.includes("≤ 280"));
  assert.ok(prompt.includes("no decorative emoji"));
  assert.ok(prompt.includes("NO hashtags"));
});

check("YouTube prompt line rejects SEO descriptions", () => {
  assert.ok(
    prompt.includes("NOT an SEO article") || prompt.includes("NOT a search/SEO"),
  );
});

section("style block scales to the selected platforms");

check("a 2-platform run lists only those platforms", () => {
  const small = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness" as const,
    topic: "kitchen smell",
    availableAssets: [],
    targetPlatforms: ["tiktok", "x"] as const,
    requireVideo: true,
    videoPlatforms: ["tiktok"] as const,
  });
  assert.ok(small.includes("- tiktok: tone="));
  assert.ok(small.includes("- x: tone="));
  assert.ok(!small.includes("- linkedin: tone="));
  assert.ok(!small.includes("- youtube: tone="));
});

section("facebook always generated (Sprint 4B)");

check("facebook has a complete style spec", () => {
  const spec = PLATFORM_STYLE_SPECS.facebook;
  assert.ok(spec, "missing facebook style spec");
  assert.ok(spec.tone.length > 0);
  assert.ok(spec.rules && spec.rules.length > 0);
});

check("facebook style line appears in a facebook run", () => {
  const fb = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "conversion" as const,
    topic: "kitchen smell",
    availableAssets: [],
    targetPlatforms: ["facebook", "linkedin"] as const,
    requireVideo: false,
    videoPlatforms: [] as const,
  });
  assert.ok(fb.includes("- facebook: tone="));
});

check("resolvePackagePlatforms always includes facebook", () => {
  const resolved = resolvePackagePlatforms([
    "tiktok",
    "instagram",
    "youtube",
    "linkedin",
    "x",
  ] as never[]);
  assert.ok(resolved.includes("facebook"));
});

check("ensureFacebookPackagePlatform adds facebook without dropping others", () => {
  const ensured = ensureFacebookPackagePlatform(["tiktok", "x"]);
  assert.deepEqual(ensured, ["tiktok", "facebook", "x"]);
});

check("resolveRunGenerationPlan injects facebook when omitted from config", () => {
  const plan = resolveRunGenerationPlan({
    packageCount: 1,
    platforms: ["tiktok", "instagram", "youtube", "linkedin", "x"],
    multipliers: { tiktok: 1, instagram: 1, youtube: 1, linkedin: 1.5, x: 5 },
    platformContentTypes: {
      tiktok: "video",
      instagram: "video",
      youtube: "video",
      linkedin: "text_only",
      x: "text_only",
      facebook: "text_only",
      google_business: "text_only",
    },
  });
  assert.ok(plan.targetPlatforms.includes("facebook"));
  assert.ok(plan.multipliers.facebook !== undefined);
});

section("platform-native writing guardrails");

function basePkg(
  overrides: Partial<ContentPackageOutput> & {
    platform_outputs: ContentPackageOutput["platform_outputs"];
  },
): ContentPackageOutput {
  return {
    title: "t",
    funnel_stage: "problem_aware",
    hook: "h",
    voiceover_text:
      "Urgent question dies in silence. She typed it Saturday night. Your site said nothing.",
    subtitles: "s",
    cta: { type: "sign_up", text: "Create your AI assistant" },
    video: { concept: "c", script: "s", duration_seconds: "20" },
    hashtags: [],
    ...overrides,
  } as ContentPackageOutput;
}

check("rejects YouTube SEO article opener", () => {
  const issues = checkPlatformNativeWriting(
    basePkg({
      platform_outputs: {
        youtube: {
          caption:
            "This video breaks down exactly why contact forms fail after hours and what changes when your website can answer.",
          cta: "Subscribe",
        },
      },
    }),
  );
  assert.ok(issues.some((i) => i.path.includes("youtube")));
});

check("rejects oversized YouTube Shorts caption", () => {
  const long = Array.from(
    { length: YOUTUBE_SHORTS_CAPTION_HARD_CAP_WORDS + 10 },
    () => "word",
  ).join(" ");
  const issues = checkPlatformNativeWriting(
    basePkg({
      platform_outputs: {
        youtube: { caption: long, cta: "Subscribe" },
      },
    }),
  );
  assert.ok(issues.some((i) => /hard cap/i.test(i.message)));
});

check("rejects caption that duplicates voiceover opening", () => {
  const issues = checkPlatformNativeWriting(
    basePkg({
      platform_outputs: {
        tiktok: {
          caption:
            "Urgent question dies in silence. She typed it Saturday night. Your site said nothing.",
          cta: "Link in bio",
        },
      },
    }),
  );
  assert.ok(issues.some((i) => /duplicates the voiceover/i.test(i.message)));
});

check("rejects X variants with identical opening hooks", () => {
  const issues = checkPlatformNativeWriting(
    basePkg({
      platform_outputs: {
        x: {
          caption: "Five sessions zero leads overlooked reason.",
          cta: "fenrik.chat",
          caption_variants: [
            "Five sessions zero leads overlooked reason today.",
            "Five sessions zero leads overlooked reason again.",
          ],
        },
      },
    }),
  );
  assert.ok(issues.some((i) => i.path.includes("caption_variants")));
});

check("accepts native Shorts-style YouTube caption", () => {
  const issues = checkPlatformNativeWriting(
    basePkg({
      platform_outputs: {
        youtube: {
          caption:
            "Five weekend visitors. Zero names left behind. A contact form is not availability.",
          cta: "Create your AI assistant at fenrik.chat",
        },
        tiktok: {
          caption: "She asked Saturday. Your site ghosted her. 👇",
          cta: "Link in bio",
        },
      },
    }),
  );
  assert.equal(issues.length, 0, JSON.stringify(issues));
});

check("SEO opener catalogue is non-empty", () => {
  assert.ok(YOUTUBE_SHORTS_SEO_OPENERS.length >= 5);
});

section("website / link rules block");

const projectWithUrl = {
  ...project,
  knowledge: { source_url: "https://uklidy-praha.cz" },
} as unknown as Project;

check("prompt omits the WEBSITE / LINK RULES block when no URL exists", () => {
  assert.ok(!prompt.includes("WEBSITE / LINK RULES"));
});

check("prompt includes the WEBSITE / LINK RULES block when a URL exists", () => {
  const withUrl = buildGenerateContentPackagePrompt({
    project: projectWithUrl,
    funnelStage: "conversion" as const,
    topic: "kitchen smell",
    availableAssets: [],
    targetPlatforms: ALL_PLATFORMS,
    requireVideo: true,
    videoPlatforms: ["tiktok", "instagram", "youtube"] as const,
  });
  assert.ok(withUrl.includes("WEBSITE / LINK RULES"));
  assert.ok(withUrl.includes("https://uklidy-praha.cz"));
  assert.ok(/voiceover_text/.test(withUrl));
  assert.ok(/image_prompts/.test(withUrl));
  assert.ok(withUrl.includes("- tiktok: NO raw URL"));
  assert.ok(withUrl.includes("- google_business: NO raw URL"));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
