// Platform Styles — specs + native-writing guardrails (Content Pipeline still uses these).
//   npm run check:platform-styles

import assert from "node:assert/strict";
import {
  buildPlatformNativeWritingRulesBlock,
  PLATFORM_NATIVE_WRITING_HEADER,
  PLATFORM_STYLE_SPECS,
} from "@/lib/ai/prompts/platformStyles";
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
import type { PlatformType } from "@/lib/projects/contentControls";

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

check("PLATFORM_STYLE_SPECS covers required surfaces", () => {
  for (const key of [
    "tiktok",
    "instagram",
    "youtube",
    "linkedin",
    "facebook",
  ] as const) {
    assert.ok(PLATFORM_STYLE_SPECS[key], key);
  }
});

check("native writing rules header present", () => {
  const block = buildPlatformNativeWritingRulesBlock();
  assert.ok(block.includes(PLATFORM_NATIVE_WRITING_HEADER));
  assert.match(block, /TikTok/);
  assert.match(block, /LinkedIn/);
});

check("Facebook always included in package platforms", () => {
  const resolved = resolvePackagePlatforms([
    "tiktok",
    "linkedin",
  ] as PlatformType[]);
  assert.ok(resolved.includes("facebook"));
  const ensured = ensureFacebookPackagePlatform(["tiktok", "linkedin"]);
  assert.ok(ensured.includes("facebook"));
});

check("YouTube Shorts caption hard cap constant", () => {
  assert.ok(YOUTUBE_SHORTS_CAPTION_HARD_CAP_WORDS > 0);
  assert.ok(YOUTUBE_SHORTS_SEO_OPENERS.length > 0);
});

check("native writing guardrail accepts short caption", () => {
  const pkg = {
    platforms: {
      youtube_shorts: {
        caption: `${YOUTUBE_SHORTS_SEO_OPENERS[0]} short tip`,
        cta: "Learn more",
        hashtags: ["#shorts"],
      },
    },
  } as unknown as ContentPackageOutput;
  const issues = checkPlatformNativeWriting(pkg);
  assert.equal(issues.length, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
