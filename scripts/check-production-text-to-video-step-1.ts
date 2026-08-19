/**
 * Production text-to-video step 1 — offline safety checks.
 *
 * Run: npx tsx scripts/check-production-text-to-video-step-1.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  defersVideoUntilCreativeReview,
  resolveGenerationModeForProductionRun,
  shouldDeferVideoUntilCreativeReview,
} from "../lib/ai/generationMode";
import { buildPackageBrief } from "../lib/ai/workflows/packageShared";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import {
  DEFAULT_PACKAGE_VIDEO_PRODUCTION_MODE,
  PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
  parsePackageVideoProductionModeFromJobInput,
} from "../lib/content-package/packageVideoProductionMode";
import {
  invalidateAudioTimingOnVoiceDirectionChange,
  invalidateVideoDerivativesOnVoiceoverChange,
  readVideoCreativeIntegrity,
} from "../lib/content-package/videoCreativeIntegrity";
import {
  defaultVoiceDirectionContract,
  voiceDirectionContractSchema,
} from "../lib/content-package/voiceDirectionContract";
import { evaluateVideoPaidPreflight } from "../lib/content-package/videoPaidPreflight";
import { normalizeProductionConfig } from "../lib/projects/productionRun";
import { parseVideoJobRenderOptions } from "../lib/video-engine/schemas/videoJobRenderMode";

const root = join(import.meta.dirname, "..");

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`  ✓ ${name}`))
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      throw err;
    });
}

function minimalVideoPackage(): ContentPackageOutput {
  return {
    title: "Test",
    funnel_stage: "awareness",
    hook: "Old hook line",
    voiceover_text: "Voiceover body.",
    subtitles: "Voiceover body.",
    cta: { text: "CTA", url: null },
    video: { concept: "c", script: "Voiceover body." },
    platform_outputs: {
      tiktok: { caption: "cap", hashtags: ["#a"], cta: "CTA" },
    },
    hashtags: ["#a"],
    image_prompts: ["scene one"],
    visual_scenes: [{ source: "ai", image_prompt: "scene one" }],
    asset_usage: [],
    scenario: null,
  } as ContentPackageOutput;
}

async function main(): Promise<void> {
  console.log("Production text-to-video step 1\n");

  await check("1 — job input without package_video_mode defaults to still", async () => {
    const parsed = parsePackageVideoProductionModeFromJobInput({});
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.mode, "still");
  });

  await check("2 — explicit still keeps render mode still path", async () => {
    const render = parseVideoJobRenderOptions({
      package_video_mode: "still",
      voiceover_text: "x",
    });
    assert.equal(render.ok, true);
    if (render.ok) assert.equal(render.mode, "still");
  });

  await check("3 — text_to_video propagates Run → package_brief", () => {
    const brief = buildPackageBrief(minimalVideoPackage(), {
      packageVideoMode: PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
    }) as Record<string, unknown>;
    assert.equal(brief.package_video_mode, PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO);
  });

  await check("4 — text_to_video worker guard is before still/I2V branch", () => {
    const src = readFileSync(join(root, "video-worker/jobRunner.ts"), "utf8");
    const t2v = src.indexOf("runTextToVideoJobPhase");
    const render = src.indexOf(
      "const renderOptions = parseVideoJobRenderOptions(jobInputRecord)",
    );
    assert.ok(t2v > 0 && render > 0);
    assert.ok(t2v < render);
  });

  await check("5 — manual_review defers video at persist boundary", () => {
    assert.equal(defersVideoUntilCreativeReview("manual_review"), true);
    assert.equal(
      shouldDeferVideoUntilCreativeReview("manual_review", { config: {} }),
      true,
    );
    assert.equal(defersVideoUntilCreativeReview("production"), false);
  });

  await check("6 — run generation_mode wins over webhook body", () => {
    assert.equal(
      resolveGenerationModeForProductionRun("manual_review", "production"),
      "manual_review",
    );
  });

  await check("7 — voiceover edit marks hook, subtitles, visual plan stale", () => {
    const brief = buildPackageBrief(minimalVideoPackage(), {
      packageVideoMode: "still",
    }) as Record<string, unknown>;
    const next = invalidateVideoDerivativesOnVoiceoverChange(
      brief,
      "New voiceover text.",
    );
    const integrity = readVideoCreativeIntegrity(next);
    assert.equal(integrity.hook_status, "stale");
    assert.equal(integrity.subtitles_status, "stale");
    assert.equal(integrity.visual_plan_status, "stale");
    assert.equal(integrity.approved_voiceover_text, "New voiceover text.");
  });

  await check("8 — voice direction change invalidates audio timing", () => {
    const brief = buildPackageBrief(minimalVideoPackage()) as Record<
      string,
      unknown
    >;
    const direction = voiceDirectionContractSchema.parse({
      style: "urgent",
      revision: 2,
      beats: [{ segment: "opening", delivery: "urgent" }],
    });
    const next = invalidateAudioTimingOnVoiceDirectionChange(brief, direction);
    const integrity = readVideoCreativeIntegrity(next);
    assert.equal(integrity.audio_timing_status, "stale");
    assert.equal(integrity.voice_direction_revision, 2);
  });

  await check("9 — platform outputs and social_image untouched on VO invalidation", () => {
    const pkg = minimalVideoPackage();
    (pkg as Record<string, unknown>).social_image = { path: "social.png" };
    const brief = buildPackageBrief(pkg) as Record<string, unknown>;
    const outputsBefore = JSON.stringify(brief.platform_outputs);
    const socialBefore = JSON.stringify(brief.social_image);
    const next = invalidateVideoDerivativesOnVoiceoverChange(brief, "Changed.");
    assert.equal(JSON.stringify(next.platform_outputs), outputsBefore);
    assert.equal(JSON.stringify(next.social_image), socialBefore);
  });

  await check("10 — stale creative fails paid preflight", () => {
    const brief = invalidateVideoDerivativesOnVoiceoverChange(
      buildPackageBrief(minimalVideoPackage()) as Record<string, unknown>,
      "Changed VO",
    );
    const result = evaluateVideoPaidPreflight({
      packageVideoMode: "still",
      runPackageVideoMode: "still",
      generationMode: "manual_review",
      creativeReview: null,
      brief,
      enforceFuturePaidGates: false,
    });
    assert.equal(result.ok, false);
    assert.ok(result.blockers.includes("hook_stale"));
  });

  await check("11 — production still mode remains non-deferred", () => {
    const cfg = normalizeProductionConfig({
      packageCount: 1,
      platforms: ["tiktok"],
      generationMode: "production",
    });
    assert.equal(cfg.generationMode ?? "production", "production");
    assert.equal(
      cfg.packageVideoMode ?? DEFAULT_PACKAGE_VIDEO_PRODUCTION_MODE,
      "still",
    );
    assert.equal(defersVideoUntilCreativeReview(cfg.generationMode ?? "production"), false);
  });

  await check("12 — retry preserves package_video_mode from failed job input", () => {
    const src = readFileSync(
      join(root, "lib/ai/workflows/retryVideoJob.ts"),
      "utf8",
    );
    assert.match(src, /\.\.\.baseInput/);
    const base = {
      package_video_mode: PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
      voiceover_text: "x",
    };
    const retryInput = { ...base, retry_of_video_job_id: "job-1" };
    const parsed = parsePackageVideoProductionModeFromJobInput(retryInput);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.mode, PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO);
    }
  });

  await check("voice direction contract accepts human-readable beats", () => {
    const parsed = defaultVoiceDirectionContract();
    assert.equal(parsed.style, "auto");
    assert.equal(voiceDirectionContractSchema.safeParse(parsed).success, true);
  });

  console.log("\nAll step-1 checks passed.");
}

main().catch(() => process.exit(1));
