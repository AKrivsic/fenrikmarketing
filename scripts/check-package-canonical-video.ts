// Dependency-free checks for translated-package pipeline fixes.
//   npm run check:package-canonical-video
//   npm run check:translation-variant-guard

import assert from "node:assert/strict";
import {
  buildPackageVideosFromEntries,
  canonicalVideoPriority,
  pickCanonicalVideoForLanguage,
} from "@/lib/api/packageCanonicalVideo";
import type { ProjectContentEntry } from "@/lib/api/project-content-admin";
import { formatCompletedWithoutVariantError } from "@/lib/ai/workflows/translationJobGuards";
import type { GenerateLanguageVariantsForItemSummary } from "@/lib/ai/workflows/generateLanguageVariants";

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

function entry(
  partial: Partial<ProjectContentEntry> &
    Pick<
      ProjectContentEntry,
      "language" | "platform" | "videoJobId" | "videoStatus"
    >,
): ProjectContentEntry {
  return {
    id: partial.id ?? "item",
    packageId: partial.packageId ?? "pkg",
    platform: partial.platform,
    format: "reel",
    status: "draft",
    title: null,
    caption: null,
    hashtags: [],
    cta: null,
    publishReadyText: "",
    publishTitle: null,
    language: partial.language,
    isLanguageVariant: partial.isLanguageVariant ?? true,
    variantLanguage: partial.language,
    canGenerateVariants: false,
    canGenerateItemVariants: false,
    productionRunId: null,
    sourceContentItemId: null,
    createdAt: "",
    videoJobId: partial.videoJobId,
    videoStatus: partial.videoStatus,
    videoUrl: partial.videoUrl ?? null,
    thumbnailUrl: null,
    subtitleUrl: null,
    videoDebug: null,
    videoFailureHeadline: partial.videoFailureHeadline ?? null,
    videoFailureDetail: partial.videoFailureDetail ?? null,
  };
}

section("canonicalVideoPriority");

check("completed TikTok beats completed Instagram", () => {
  assert.ok(
    canonicalVideoPriority("tiktok", "completed") <
      canonicalVideoPriority("instagram", "completed"),
  );
});

check("completed Instagram beats failed TikTok", () => {
  assert.ok(
    canonicalVideoPriority("instagram", "completed") <
      canonicalVideoPriority("tiktok", "failed"),
  );
});

section("pickCanonicalVideoForLanguage");

check("TikTok completed wins over Instagram failed", () => {
  const items = [
    entry({
      language: "de",
      platform: "instagram",
      videoJobId: "ig-fail",
      videoStatus: "failed",
    }),
    entry({
      language: "de",
      platform: "tiktok",
      videoJobId: "tt-ok",
      videoStatus: "completed",
      videoUrl: "https://example.com/v.mp4",
    }),
  ];
  const picked = pickCanonicalVideoForLanguage(items, "de");
  assert.equal(picked?.videoJobId, "tt-ok");
  assert.equal(picked?.videoStatus, "completed");
});

check("only Instagram completed is shown when no TikTok job", () => {
  const items = [
    entry({
      language: "fr",
      platform: "instagram",
      videoJobId: "ig-ok",
      videoStatus: "completed",
    }),
  ];
  const videos = buildPackageVideosFromEntries(items);
  assert.equal(videos.length, 1);
  assert.equal(videos[0]?.status, "completed");
  assert.equal(videos[0]?.jobId, "ig-ok");
});

check("failed TikTok preferred over failed Instagram", () => {
  const items = [
    entry({
      language: "es",
      platform: "instagram",
      videoJobId: "ig-fail",
      videoStatus: "failed",
    }),
    entry({
      language: "es",
      platform: "tiktok",
      videoJobId: "tt-fail",
      videoStatus: "failed",
    }),
  ];
  const videos = buildPackageVideosFromEntries(items);
  assert.equal(videos[0]?.status, "failed");
  assert.equal(videos[0]?.jobId, "tt-fail");
});

section("formatCompletedWithoutVariantError");

check("includes warnings in error_message prefix", () => {
  const summary = {
    warnings: ["language de: localization failed (generation_failed); skipped"],
  } as GenerateLanguageVariantsForItemSummary;
  const msg = formatCompletedWithoutVariantError(summary);
  assert.match(msg, /^completed_without_variant_content_item:/);
  assert.match(msg, /generation_failed/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
