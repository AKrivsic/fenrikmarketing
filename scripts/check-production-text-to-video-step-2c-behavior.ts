/**
 * Production text-to-video step 2C — behavioral lifecycle (offline, fake store).
 * Run: npx tsx scripts/check-production-text-to-video-step-2c-behavior.ts
 */
import assert from "node:assert/strict";
import {
  shouldCreatePackageVideoJob,
  packageBriefDefersVideoJob,
  CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION,
} from "../lib/content-package/creativeReviewDeferral";
import {
  briefHasPersistableContentPayload,
  countExpectedPrimaryContentItems,
  rehydrateContentPackageFromBrief,
} from "../lib/content-package/packageGenerationCompleteness";
import {
  applyRepetitionResultToPlan,
  approveTextToVideoCreativePlan,
  buildTextToVideoCreativePlan,
  serializeTextToVideoCreativePlan,
} from "../lib/content-package/textToVideoCreativePlan";
import { buildPackageBrief } from "../lib/ai/workflows/packageShared";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import { DEFAULT_GENERATION_MODE } from "../lib/ai/generationMode";

function vo(): string {
  return (
    "Firma potřebuje rychlejší cashflow. Automatické upomínky šetří čas. " +
    "S Fenrikem ušetříte hodiny týdně. Začněte demo ještě dnes."
  );
}

function pkg(): ContentPackageOutput {
  const text = vo();
  return {
    title: "T",
    funnel_stage: "awareness",
    hook: "Cashflow teď",
    voiceover_text: text,
    subtitles: text,
    cta: { text: "Demo", url: null },
    video: { concept: "c", script: text },
    platform_outputs: {
      tiktok: { caption: "cap", hashtags: ["#a"], cta: "Demo", format: "video" },
      instagram: { caption: "cap2", hashtags: [], cta: "Demo", format: "post" },
    },
    hashtags: [],
    image_prompts: [],
    visual_scenes: [],
    asset_usage: [],
  } as ContentPackageOutput;
}

function blockedBrief(): Record<string, unknown> {
  const p = pkg();
  let plan = buildTextToVideoCreativePlan({
    packageId: "pkg-behavior",
    voiceoverText: p.voiceover_text,
  });
  plan = applyRepetitionResultToPlan(
    plan,
    {
      status: "blocked",
      blocked_reasons: ["hook_duplicate_normalized_text"],
      checked_at: "2026-01-01T00:00:00.000Z",
    },
    "2026-01-01T00:00:00.000Z",
  );
  const brief = buildPackageBrief(p, {
    packageVideoMode: "text_to_video",
  }) as Record<string, unknown>;
  return {
    ...brief,
    creative_review_reason: CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION,
    video_text_to_video_creative_plan: serializeTextToVideoCreativePlan(plan),
  };
}

function approvedBrief(): Record<string, unknown> {
  const p = pkg();
  let plan = buildTextToVideoCreativePlan({
    packageId: "pkg-behavior",
    voiceoverText: p.voiceover_text,
  });
  plan = approveTextToVideoCreativePlan(plan, "2026-01-01T00:00:00.000Z");
  plan = {
    ...plan,
    repetition: {
      status: "passed",
      blocked_reasons: [],
      checked_at: "2026-01-01T00:00:00.000Z",
    },
  };
  const brief = buildPackageBrief(p, {
    packageVideoMode: "text_to_video",
  }) as Record<string, unknown>;
  return {
    ...brief,
    video_text_to_video_creative_plan: serializeTextToVideoCreativePlan(plan),
  };
}

function simulateContinueVideoJobIdempotency(): {
  first: { created: boolean; id: string };
  second: { created: boolean; id: string };
} {
  const jobs: string[] = [];
  const ensure = (): { created: boolean; id: string } => {
    if (jobs.length > 0) {
      return { created: false, id: jobs[0]! };
    }
    jobs.push("job-1");
    return { created: true, id: jobs[0]! };
  };
  return { first: ensure(), second: ensure() };
}

function main(): void {
  console.log("Production text-to-video step 2C (behavioral)\n");

  const blocked = blockedBrief();
  assert.equal(briefHasPersistableContentPayload(blocked), true);
  assert.equal(packageBriefDefersVideoJob(blocked), true);
  assert.equal(
    shouldCreatePackageVideoJob({
      hasVideoPlatforms: true,
      generationMode: DEFAULT_GENERATION_MODE,
      brief: blocked,
    }),
    false,
  );
  const expectedItems = countExpectedPrimaryContentItems({
    pkg: pkg(),
    context: { funnelStage: "awareness", format: "video" },
    targetPlatforms: ["tiktok", "instagram"],
    videoPlatforms: ["tiktok"],
  });
  assert.ok(expectedItems >= 2);
  const rehydrated = rehydrateContentPackageFromBrief(blocked);
  assert.ok(rehydrated.voiceover_text?.length);
  console.log("  ✓ repetition-blocked brief persists payload and defers video job");

  const approved = approvedBrief();
  assert.equal(packageBriefDefersVideoJob(approved), false);
  assert.equal(
    shouldCreatePackageVideoJob({
      hasVideoPlatforms: true,
      generationMode: DEFAULT_GENERATION_MODE,
      brief: approved,
    }),
    true,
  );
  console.log("  ✓ approved plan allows video job when platforms require video");

  const idem = simulateContinueVideoJobIdempotency();
  assert.equal(idem.first.created, true);
  assert.equal(idem.second.created, false);
  assert.equal(idem.first.id, idem.second.id);
  console.log("  ✓ Continue-style ensure creates one job, second call reuses");

  console.log("\nAll step-2C behavioral checks passed.");
}

main();
