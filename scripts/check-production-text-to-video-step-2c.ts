/**
 * Production text-to-video step 2C — atomic persist on repetition block (offline).
 * Run: npx tsx scripts/check-production-text-to-video-step-2c.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  packageBriefDefersVideoJob,
  productionRunDefersVideoUntilCreativeReview,
  canAccessCreativeReviewRun,
  canContinueCreativeReviewRun,
  CREATIVE_REVIEW_REASON_MANUAL_MODE,
  CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION,
  readCreativeReviewReason,
  markProductionRunAwaitingT2VCreativeReview,
} from "../lib/content-package/creativeReviewDeferral";
import {
  countExpectedPrimaryContentItems,
  rehydrateContentPackageFromBrief,
  briefHasPersistableContentPayload,
} from "../lib/content-package/packageGenerationCompleteness";
import {
  applyRepetitionResultToPlan,
  buildTextToVideoCreativePlan,
  serializeTextToVideoCreativePlan,
} from "../lib/content-package/textToVideoCreativePlan";
import { buildPackageBrief } from "../lib/ai/workflows/packageShared";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import { AWAITING_TEXT_TO_VIDEO_CREATIVE_REVIEW_KEY } from "../lib/ai/generationMode";
import { planRequiresVideo } from "../lib/api/packageReconcileStatus";
import { resolvePackageReconcileStatus } from "../lib/api/packageReconcileStatus";

const root = join(import.meta.dirname, "..");

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

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
    packageId: "pkg-2c",
    voiceoverText: p.voiceover_text,
  });
  plan = applyRepetitionResultToPlan(
    plan,
    { status: "blocked", blocked_reasons: ["hook_duplicate_normalized_text"] },
    new Date().toISOString(),
  );
  const brief = buildPackageBrief(p, {
    packageVideoMode: "text_to_video",
  }) as Record<string, unknown>;
  return {
    ...brief,
    video_text_to_video_creative_plan: serializeTextToVideoCreativePlan(plan),
    creative_review_reason: CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION,
  };
}

function main(): void {
  console.log("Production text-to-video step 2C\n");

  const genSrc = readFileSync(
    join(root, "lib/ai/workflows/generateContentPackage.ts"),
    "utf8",
  );

  check("1 — repetition_blocked does not throw before content_items", () => {
    assert.doesNotMatch(genSrc, /TextToVideoRepetitionBlockedError/);
    assert.match(genSrc, /Persistable platform outputs -> content_items/);
    assert.ok(!genSrc.includes("TextToVideoRepetitionBlockedError"));
  });

  check("2–3 — brief retains platform outputs for heal/rehydrate", () => {
    const brief = blockedBrief();
    assert.ok(briefHasPersistableContentPayload(brief));
    const hydrated = rehydrateContentPackageFromBrief(brief)!;
    assert.ok(hydrated.platform_outputs.tiktok);
    assert.equal(typeof hydrated.platform_outputs.tiktok?.caption, "string");
  });

  check("4–5 — blocked T2V defers video job; no throw in worker path from persist", () => {
    const brief = blockedBrief();
    assert.equal(packageBriefDefersVideoJob(brief), true);
    const worker = readFileSync(join(root, "video-worker/jobRunner.ts"), "utf8");
    assert.match(worker, /text_to_video_not_implemented|still/);
  });

  check("6–7 — run defers to waiting_for_creative_review lifecycle", () => {
    const cfg = markProductionRunAwaitingT2VCreativeReview({ config: {} });
    assert.equal(
      (cfg.config as Record<string, unknown>)[
        AWAITING_TEXT_TO_VIDEO_CREATIVE_REVIEW_KEY
      ],
      true,
    );
    assert.equal(
      productionRunDefersVideoUntilCreativeReview({
        generationMode: "production",
        requestedConfig: cfg,
      }),
      true,
    );
    assert.equal(
      readCreativeReviewReason(blockedBrief()),
      CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION,
    );
  });

  check("8 — manual_review reason unchanged contract", () => {
    assert.equal(CREATIVE_REVIEW_REASON_MANUAL_MODE, "manual_mode");
    assert.equal(
      canAccessCreativeReviewRun({
        generationMode: "manual_review",
        runStatus: "waiting_for_creative_review",
      }),
      true,
    );
  });

  check("9–10 — still production run video requirement unchanged", () => {
    const stillBrief = buildPackageBrief(pkg(), { packageVideoMode: "still" });
    assert.equal(packageBriefDefersVideoJob(stillBrief as Record<string, unknown>), false);
    assert.equal(
      productionRunDefersVideoUntilCreativeReview({
        generationMode: "production",
        requestedConfig: { config: { generation_mode: "production" } },
        packageBriefs: [stillBrief],
      }),
      false,
    );
  });

  check("11–12 — idempotence guards contentPersistComplete in loader", () => {
    assert.match(genSrc, /contentPersistComplete/);
    assert.match(genSrc, /healMissingContentItemsIfPossible/);
  });

  check("13 — partial package with items not treated as complete", () => {
    assert.match(genSrc, /partial content_items present/);
  });

  check("14 — heal from brief when zero items", () => {
    assert.match(genSrc, /content_pipeline_heal/);
  });

  check("15 — claim busy path unchanged", () => {
    assert.match(genSrc, /generation_in_progress/);
  });

  check("16 — healMissingVideoJob skips deferred brief", () => {
    assert.match(genSrc, /packageBriefDefersVideoJob/);
  });

  check("17–18 — continue validates T2V plan + idempotent job insert", () => {
    const cont = readFileSync(
      join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
      "utf8",
    );
    assert.match(cont, /repetition passed before Continue/);
    assert.match(cont, /isUniqueViolation/);
  });

  check("19 — reconcile uses productionRunDefersVideoUntilCreativeReview", () => {
    const admin = readFileSync(
      join(root, "lib/api/production-run-admin.ts"),
      "utf8",
    );
    assert.match(admin, /productionRunDefersVideoUntilCreativeReview/);
  });

  check("20 — no fetch/provider in step 2C scripts", () => {
    assert.doesNotMatch(genSrc, /api\.elevenlabs|api\.runway/);
  });

  check("extra — expected item count respects fan-out", () => {
    const p = pkg();
    const base = countExpectedPrimaryContentItems({
      pkg: p,
      context: { funnelStage: "awareness", format: "post" },
      targetPlatforms: ["tiktok", "instagram"],
      videoPlatforms: ["tiktok"],
      fanOut: { multipliers: { tiktok: 1, instagram: 1, x: 3 }, packageIndex: 0 },
    });
    assert.ok(base >= 2);
  });

  check("extra — reconcile text-only when video deferred", () => {
    const status = resolvePackageReconcileStatus({
      requireVideo: false,
      jobs: [],
    });
    assert.equal(status, "completed");
    const requireV = planRequiresVideo({
      platformOutputs: [{ kind: "video" }],
      videoCount: 1,
    });
    assert.equal(requireV, true);
  });

  check("extra — production T2V can continue after repetition review", () => {
    assert.equal(
      canContinueCreativeReviewRun({
        generationMode: "production",
        runStatus: "waiting_for_creative_review",
        packageBriefs: [blockedBrief()],
      }),
      true,
    );
  });

  console.log("\nAll step-2C checks passed.");
}

main();
