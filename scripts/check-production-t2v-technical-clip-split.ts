/**
 * T2V measured timing + technical clip split — offline.
 * No Claude / ElevenLabs / Runway HTTP.
 * Run: npm run check:production-t2v-technical-clip-split
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CreativeReview } from "../lib/creative-review/types";
import { buildTextToVideoRenderPlanFromCanonical } from "../lib/content-package/textToVideoRenderAdapter";
import {
  collectTextToVideoPlanApprovalBlockers,
  T2V_PROMPT_CONTRACT_STALE,
} from "../lib/content-package/textToVideoPlanApprovalGate";
import {
  canRefreshTextToVideoPromptContract,
  refreshTextToVideoPromptContract,
} from "../lib/content-package/restoreCanonicalTextToVideoPlan";
import {
  approveTextToVideoCreativePlan,
  readTextToVideoCreativePlan,
  serializeTextToVideoCreativePlan,
  TEXT_TO_VIDEO_PLAN_SCHEMA_VERSION,
} from "../lib/content-package/textToVideoCreativePlan";
import {
  composeTextToVideoTechnicalPartPrompt,
  T2V_GEN45_PROMPT_MAX_UTF16,
  T2V_TECHNICAL_CONTINUATION_LINE,
  utf16CodeUnits,
} from "../lib/content-package/textToVideoProviderPrompt";
import {
  assertTextToVideoRunwayRequestsReady,
  TextToVideoPackagePaidPreflightError,
} from "../lib/text-to-video/assertTextToVideoPackageReadyForPaidProviders";
import { buildTextToVideoRunwayExecutionPlan } from "../lib/text-to-video/runwayExecutionPlan";
import {
  TEXT_TO_VIDEO_PRE_VOICE_SPLIT_THRESHOLD_SECONDS,
  TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION,
  TEXT_TO_VIDEO_RUNWAY_DURATION_MAX,
} from "../lib/text-to-video/runwayProductionConfig";
import { estimateTextToVideoOperatorBudget } from "../lib/text-to-video/textToVideoOperatorBudget";
import {
  plannedTechnicalPartCountFromEstimate,
  splitEstimatedSceneIntoTechnicalClips,
  splitMeasuredSceneIntoTechnicalClips,
  T2V_SCENE_CANNOT_SPLIT,
  T2V_SCENE_SPLIT_INVALID,
  technicalClipId,
  TextToVideoTechnicalClipSplitError,
} from "../lib/text-to-video/technicalClipSplit";
import { evaluateTextToVideoRunwayBudget } from "../lib/text-to-video/runwayBudget";
import { executeTextToVideoRunwayPlan } from "../lib/text-to-video/textToVideoRunwayExecutor";
import {
  buildTextToVideoClipAssignments,
  buildTextToVideoRenderSpecOutput,
} from "../lib/text-to-video/textToVideoReelBridge";
import { sceneRequestFingerprint } from "../lib/text-to-video/runwayExecutionPlan";
import {
  makeAtomicSceneAttemptSupabase,
  RunwayCreateTracker,
} from "./lib/t2vPrePaidTestHarness";
import type { VoiceSynthesisCheckpoint } from "../lib/text-to-video/voiceSynthesisCheckpoint";
import type { TextToVideoCreativePlan } from "../lib/content-package/textToVideoCreativePlan";

const root = join(import.meta.dirname, "..");
const PROJECT = "11111111-1111-4111-8111-111111111111";
const JOB = "33333333-3333-4333-8333-333333333333";

function check(name: string, fn: () => void | Promise<void>): Promise<void> | void {
  const run = async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ ${name}`);
      throw err;
    }
  };
  return run();
}

const VO = [
  "What does a potential client see before they ever speak to you.",
  "They open a tab and search your name carefully.",
  "The profile loads with proof of real work.",
  "A weak first impression costs the meeting.",
  "Your feed should prove expertise every week.",
].join(" ");

function fiveVisualScenes() {
  return [
    {
      source: "ai" as const,
      id: "scene-1",
      voiceover_excerpt: "What does a potential client see before they ever speak to you.",
      image_prompt: "A consultant at a bright desk reviews a client dashboard.",
      motion_prompt: "Slow push in.",
    },
    {
      source: "ai" as const,
      id: "scene-2",
      voiceover_excerpt: "They open a tab and search your name carefully.",
      image_prompt: "Hands open a laptop on a wooden table.",
      motion_prompt: "Gentle pan.",
    },
    {
      source: "ai" as const,
      id: "scene-3",
      voiceover_excerpt: "The profile loads with proof of real work.",
      image_prompt: "A profile page fills a phone screen in a cafe.",
      motion_prompt: "Hold.",
    },
    {
      source: "ai" as const,
      id: "scene-4",
      voiceover_excerpt: "A weak first impression costs the meeting.",
      image_prompt: "An empty meeting room waits under cool light.",
      motion_prompt: "Drift.",
    },
    {
      source: "ai" as const,
      id: "scene-5",
      voiceover_excerpt: "Your feed should prove expertise every week.",
      image_prompt: "A content calendar on a studio wall.",
      motion_prompt: "Tilt.",
    },
  ];
}

function reviewForFiveScenes(): CreativeReview {
  return {
    version: 1,
    approved: false,
    status: "draft",
    updated_at: "2026-01-01T00:00:00.000Z",
    updated_by: { type: "ai" },
    voiceover: {
      original_ai: VO,
      localized_edit: VO,
      english_preview: VO,
      english_preview_outdated: false,
      english_confirmed: true,
    },
    scenes: fiveVisualScenes().map((scene, index) => ({
      id: scene.id,
      index,
      director_notes: "",
      intent: {
        original: scene.image_prompt,
        localized_edit: scene.image_prompt,
        english_preview: scene.image_prompt,
        english_preview_outdated: false,
        presentation_type: "IMAGE",
        visual_source: "generated",
        asset_id: null,
        used_as: null,
      },
    })),
  };
}

function canonicalBrief(review: CreativeReview): Record<string, unknown> {
  return {
    package_video_mode: "text_to_video",
    voiceover_text: VO,
    hook: "What does a potential client see",
    language: "en",
    visual_scenes: fiveVisualScenes(),
    creative_review: review,
    video_paid_preflight: {
      confirm_paid_run: true,
      max_budget_usd: 20,
    },
  };
}

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

async function makePortraitClip(seconds: number): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "t2v-clip-"));
  const out = join(dir, "c.mp4");
  execSync(
    `${ffmpegBin()} -y -f lavfi -i color=c=green:s=720x1280:d=${seconds} -c:v libx264 -pix_fmt yuv420p "${out}"`,
    { stdio: "ignore" },
  );
  const buf = await readFile(out);
  await rm(dir, { recursive: true, force: true });
  return buf;
}

function voiceCheckpoint(): VoiceSynthesisCheckpoint {
  return {
    phase: "voice_complete",
    synthesis_attempt_id: "syn-1",
    synthesis_fingerprint: "sfp-1",
    voiceover_revision_id: "vr",
    voice_id: "voice",
    model_id: "eleven_v3",
    audio_bucket: "video-renders",
    audio_path: "voice.mp3",
    audio_duration_seconds: 24,
  };
}

function alignmentFor(text: string, durationSeconds: number) {
  const chars = text.split("");
  const step = durationSeconds / Math.max(chars.length, 1);
  return {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => i * step),
    character_end_times_seconds: chars.map((_, i) => (i + 1) * step),
  };
}

function measuredPlan(
  durations: number[],
): TextToVideoCreativePlan {
  const review = reviewForFiveScenes();
  const draft = buildTextToVideoRenderPlanFromCanonical({
    packageId: "pkg",
    brief: canonicalBrief(review),
    review,
    voiceoverText: VO,
    voiceDirection: { style: "auto", revision: 0 },
  });
  let start = 0;
  const scenes = draft.scenes.map((scene, index) => {
    const duration = durations[index] ?? 4;
    const next = {
      ...scene,
      approximate_start_seconds: start,
      approximate_duration_seconds: duration,
    };
    start += duration;
    return next;
  });
  return approveTextToVideoCreativePlan(
    {
      ...draft,
      scenes,
      timing_status: "measured",
      measured_audio_revision_id: draft.voiceover_revision_id,
      timing_measurement_source: "alignment",
      measured_audio_duration_seconds: start,
      status: "approved",
    },
    "2026-01-01T00:00:00.000Z",
  );
}

async function main() {
  console.log("T2V technical clip split");

  await check("1 — estimated scene over safe threshold splits or stops before ElevenLabs", () => {
    assert.equal(TEXT_TO_VIDEO_PRE_VOICE_SPLIT_THRESHOLD_SECONDS, 8);
    const longExcerpt = fiveVisualScenes()[0]!.voiceover_excerpt;
    const spans = splitEstimatedSceneIntoTechnicalClips({
      durationSeconds: 14,
      excerpt: longExcerpt,
    });
    assert.ok(spans.length >= 2);
    assert.throws(
      () =>
        splitEstimatedSceneIntoTechnicalClips({
          durationSeconds: 14,
          excerpt: "Wow",
        }),
      (err: unknown) =>
        err instanceof TextToVideoTechnicalClipSplitError &&
        err.code === T2V_SCENE_CANNOT_SPLIT,
    );
    const review = reviewForFiveScenes();
    const plan = measuredPlan([4, 4, 4, 4, 4]);
    const estimated = {
      ...plan,
      timing_status: "estimated" as const,
      scenes: plan.scenes.map((scene, index) =>
        index === 0
          ? { ...scene, approximate_duration_seconds: 14, voiceover_excerpt: "Wow" }
          : scene,
      ),
    };
    const brief = canonicalBrief(review);
    brief.video_text_to_video_creative_plan = serializeTextToVideoCreativePlan(estimated);
    assert.throws(
      () => assertTextToVideoRunwayRequestsReady({ brief }),
      (err: unknown) =>
        err instanceof TextToVideoPackagePaidPreflightError &&
        err.code === T2V_SCENE_CANNOT_SPLIT,
    );
  });

  await check("2 — measured scene under 10s creates one technical clip", () => {
    const plan = measuredPlan([7.2, 4, 4, 4, 4.8]);
    const execution = buildTextToVideoRunwayExecutionPlan({
      plan,
      voiceCheckpoint: voiceCheckpoint(),
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    const first = execution.items.filter((item) => item.canonicalSceneId === "scene-1");
    assert.equal(first.length, 1);
    assert.equal(first[0]!.sceneId, technicalClipId("scene-1", 0));
    assert.ok(first[0]!.requiredTrimSeconds <= 10);
  });

  await check("3 — measured scene over the limit creates multiple valid clips", () => {
    const plan = measuredPlan([14, 3, 3, 2, 2]);
    const execution = buildTextToVideoRunwayExecutionPlan({
      plan,
      voiceCheckpoint: voiceCheckpoint(),
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    const first = execution.items.filter((item) => item.canonicalSceneId === "scene-1");
    assert.ok(first.length >= 2);
    assert.equal(first[0]!.partCount, first.length);
    assert.equal(plan.scenes.length, 5);
  });

  await check("4 — no technical clip exceeds the provider max", () => {
    const plan = measuredPlan([14, 3, 3, 2, 2]);
    const execution = buildTextToVideoRunwayExecutionPlan({
      plan,
      voiceCheckpoint: voiceCheckpoint(),
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    for (const item of execution.items) {
      assert.ok(item.requiredTrimSeconds <= TEXT_TO_VIDEO_RUNWAY_DURATION_MAX);
      assert.ok(item.providerDurationSeconds <= TEXT_TO_VIDEO_RUNWAY_DURATION_MAX);
    }
  });

  await check("5 — voiceover coverage is exact, no gaps or overlaps", () => {
    const spans = splitMeasuredSceneIntoTechnicalClips({
      startSeconds: 0,
      durationSeconds: 14,
      excerpt: fiveVisualScenes()[0]!.voiceover_excerpt,
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    assert.equal(spans[0]!.startSeconds, 0);
    assert.equal(spans[spans.length - 1]!.endSeconds, 14);
    for (let i = 1; i < spans.length; i++) {
      assert.equal(spans[i]!.startSeconds, spans[i - 1]!.endSeconds);
    }
  });

  await check("6 — canonical scene IDs and order stay unchanged", () => {
    const plan = measuredPlan([14, 3, 3, 2, 2]);
    const execution = buildTextToVideoRunwayExecutionPlan({
      plan,
      voiceCheckpoint: voiceCheckpoint(),
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    assert.deepEqual(
      plan.scenes.map((scene) => scene.scene_id),
      ["scene-1", "scene-2", "scene-3", "scene-4", "scene-5"],
    );
    const canonicalOrder = execution.items.map((item) => item.canonicalSceneOrder);
    for (let i = 1; i < canonicalOrder.length; i++) {
      assert.ok(canonicalOrder[i]! >= canonicalOrder[i - 1]!);
    }
  });

  await check("7 — creative storyboard is unchanged", () => {
    const plan = measuredPlan([14, 3, 3, 2, 2]);
    const before = JSON.stringify(plan.scenes.map((scene) => ({
      id: scene.scene_id,
      excerpt: scene.voiceover_excerpt,
      intent: scene.visual_intent,
    })));
    buildTextToVideoRunwayExecutionPlan({
      plan,
      voiceCheckpoint: voiceCheckpoint(),
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    const after = JSON.stringify(plan.scenes.map((scene) => ({
      id: scene.scene_id,
      excerpt: scene.voiceover_excerpt,
      intent: scene.visual_intent,
    })));
    assert.equal(before, after);
    assert.equal(plan.scenes.length, 5);
  });

  await check("8 — technical-part prompts stay within 1000 UTF-16", () => {
    const plan = measuredPlan([14, 3, 3, 2, 2]);
    const execution = buildTextToVideoRunwayExecutionPlan({
      plan,
      voiceCheckpoint: voiceCheckpoint(),
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    const later = execution.items.find((item) => item.partIndex > 0);
    assert.ok(later);
    assert.ok(later!.providerPrompt.includes(T2V_TECHNICAL_CONTINUATION_LINE));
    for (const item of execution.items) {
      assert.ok(utf16CodeUnits(item.providerPrompt) <= T2V_GEN45_PROMPT_MAX_UTF16);
    }
    const huge = `${"Photoreal vertical 9:16 clip. Action: ".padEnd(980, "x")} constraint`;
    const fitted = composeTextToVideoTechnicalPartPrompt({
      basePrompt: `${huge} No dialogue, lip-sync, subtitles, captions, logos, or readable on-screen text.`,
      partIndex: 1,
      partCount: 2,
    });
    assert.ok(utf16CodeUnits(fitted) <= T2V_GEN45_PROMPT_MAX_UTF16);
    assert.ok(fitted.includes(T2V_TECHNICAL_CONTINUATION_LINE));
  });

  await check("9 — budget after alignment uses the actual clip count", () => {
    const plan = measuredPlan([14, 3, 3, 2, 2]);
    const execution = buildTextToVideoRunwayExecutionPlan({
      plan,
      voiceCheckpoint: voiceCheckpoint(),
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    assert.ok(execution.items.length > plan.scenes.length);
    const estimate = estimateTextToVideoOperatorBudget({
      productionVoiceover: VO,
      plan,
    });
    assert.ok(estimate.technicalClipCount >= execution.items.length - 1);
    assert.equal(estimate.timingStatus, "measured");
  });

  await check("10 — over-budget measured plan means 0 Runway POST", async () => {
    const plan = measuredPlan([14, 3, 3, 2, 2]);
    const execution = buildTextToVideoRunwayExecutionPlan({
      plan,
      voiceCheckpoint: voiceCheckpoint(),
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    const tracker = new RunwayCreateTracker();
    const store = makeAtomicSceneAttemptSupabase();
    const result = await executeTextToVideoRunwayPlan(
      {
        projectId: PROJECT,
        videoJobId: JOB,
        plan: execution,
        packageBudgetUsd: 0.05,
        voiceSynthesisTextLength: VO.length,
        confirmPaidRun: true,
      },
      {
        videoProvider: tracker.buildProvider("https://fake.test/clip.mp4"),
        requireProvider: true,
        supabase: store.supabase,
        fetchImpl: async () => new Response(Buffer.from("mp4"), { status: 200 }),
        validateClipBuffer: async () => ({ ok: true }),
        sleep: async () => undefined,
      },
    );
    assert.equal(result.status, "blocked");
    assert.equal(result.blockedReason, "insufficient_budget");
    assert.equal(result.runwayPostCount, 0);
    assert.equal(tracker.createCalls.length, 0);
  });

  await check("11 — over-budget retry does not create a second ElevenLabs POST", () => {
    const voice = readFileSync(
      join(root, "lib/text-to-video/voiceSynthesisService.ts"),
      "utf8",
    );
    const clips = readFileSync(
      join(root, "lib/text-to-video/runTextToVideoRunwayClipsPhase.ts"),
      "utf8",
    );
    assert.match(voice, /reuseCompletedAttempt/);
    assert.match(voice, /VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY/);
    assert.match(clips, /insufficient_budget|executeTextToVideoRunwayPlan/);
    assert.doesNotMatch(clips, /elevenLabsTextToSpeechWithTimestamps/);
  });

  await check("12 — valid retry reuses voice and completed clips", async () => {
    const plan = measuredPlan([14, 3, 3, 2, 2]);
    const execution = buildTextToVideoRunwayExecutionPlan({
      plan,
      voiceCheckpoint: voiceCheckpoint(),
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    const clip = await makePortraitClip(10);
    const tracker = new RunwayCreateTracker();
    const store = makeAtomicSceneAttemptSupabase();
    const first = await executeTextToVideoRunwayPlan(
      {
        projectId: PROJECT,
        videoJobId: JOB,
        plan: execution,
        packageBudgetUsd: 80,
        voiceSynthesisTextLength: VO.length,
        confirmPaidRun: true,
      },
      {
        videoProvider: tracker.buildProvider("https://fake.test/clip.mp4"),
        requireProvider: true,
        supabase: store.supabase,
        fetchImpl: async () =>
          new Response(clip, {
            status: 200,
            headers: { "content-type": "video/mp4" },
          }),
        validateClipBuffer: async () => ({ ok: true }),
        downloadSceneClip: async () => clip,
        sleep: async () => undefined,
      },
    );
    assert.equal(first.status, "completed");
    const firstPosts = tracker.createCalls.length;
    assert.ok(firstPosts >= 2);
    const second = await executeTextToVideoRunwayPlan(
      {
        projectId: PROJECT,
        videoJobId: JOB,
        plan: execution,
        packageBudgetUsd: 80,
        voiceSynthesisTextLength: VO.length,
        confirmPaidRun: true,
      },
      {
        videoProvider: tracker.buildProvider("https://fake.test/clip.mp4"),
        requireProvider: true,
        supabase: store.supabase,
        fetchImpl: async () =>
          new Response(clip, {
            status: 200,
            headers: { "content-type": "video/mp4" },
          }),
        validateClipBuffer: async () => ({ ok: true }),
        downloadSceneClip: async () => clip,
        sleep: async () => undefined,
      },
    );
    assert.equal(second.status, "completed");
    assert.equal(tracker.createCalls.length, firstPosts);
    assert.ok(second.scenes.every((scene) => scene.outcome === "reused"));
  });

  await check("13 — alignment change invalidates the old execution checkpoint", () => {
    const planA = measuredPlan([14, 3, 3, 2, 2]);
    const planB = {
      ...planA,
      measured_audio_revision_id: "vr-other",
    };
    const a = buildTextToVideoRunwayExecutionPlan({
      plan: planA,
      voiceCheckpoint: voiceCheckpoint(),
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    const b = buildTextToVideoRunwayExecutionPlan({
      plan: planB,
      voiceCheckpoint: { ...voiceCheckpoint(), synthesis_fingerprint: "sfp-2" },
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    assert.notEqual(a.executionFingerprint, b.executionFingerprint);
  });

  await check("14 — invalid split fails closed", () => {
    assert.throws(
      () =>
        splitMeasuredSceneIntoTechnicalClips({
          startSeconds: 0,
          durationSeconds: 14,
          excerpt: "Hi",
          alignment: alignmentFor("Hi", 14),
          approvedVoiceover: "Hi",
        }),
      (err: unknown) =>
        err instanceof TextToVideoTechnicalClipSplitError &&
        (err.code === T2V_SCENE_CANNOT_SPLIT || err.code === T2V_SCENE_SPLIT_INVALID),
    );
  });

  await check("15 — stale prompt contract cannot Approve or Continue", () => {
    const review = reviewForFiveScenes();
    const brief = canonicalBrief(review);
    const plan = buildTextToVideoRenderPlanFromCanonical({
      packageId: "pkg",
      brief,
      review,
      voiceoverText: VO,
      voiceDirection: { style: "auto", revision: 0 },
    });
    const stale = serializeTextToVideoCreativePlan({
      ...plan,
      prompt_contract_version: 0,
    });
    brief.video_text_to_video_creative_plan = stale;
    const blockers = collectTextToVideoPlanApprovalBlockers({
      plan: readTextToVideoCreativePlan(brief),
      brief,
      review,
    });
    assert.ok(blockers.includes(T2V_PROMPT_CONTRACT_STALE));
    assert.equal(canRefreshTextToVideoPromptContract(brief), true);
    const refreshed = refreshTextToVideoPromptContract({
      packageId: "pkg",
      brief,
      review,
    });
    const next = readTextToVideoCreativePlan(refreshed)!;
    assert.equal(next.prompt_contract_version, TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION);
    assert.equal(next.scenes.length, 5);
    assert.deepEqual(
      next.scenes.map((scene) => scene.scene_id),
      plan.scenes.map((scene) => scene.scene_id),
    );
  });

  await check("16 — still / I2V workflow files stay untouched by this split", () => {
    const i2v = readFileSync(join(root, "lib/ai/runwayImageToVideoBody.ts"), "utf8");
    assert.doesNotMatch(i2v, /technicalClipId|__part-/);
    const stillPanel = readFileSync(
      join(root, "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx"),
      "utf8",
    );
    assert.match(stillPanel, /\{!isT2v \? \(/);
  });

  await check("17 — fake E2E from measured alignment through multiple clips to assembly mapping", async () => {
    const plan = measuredPlan([14, 3, 3, 2, 2]);
    const execution = buildTextToVideoRunwayExecutionPlan({
      plan,
      voiceCheckpoint: voiceCheckpoint(),
      alignment: alignmentFor(VO, 24),
      approvedVoiceover: VO,
    });
    assert.ok(execution.items.length > 5);
    const clip = await makePortraitClip(10);
    const tracker = new RunwayCreateTracker();
    const store = makeAtomicSceneAttemptSupabase();
    const result = await executeTextToVideoRunwayPlan(
      {
        projectId: PROJECT,
        videoJobId: JOB,
        plan: execution,
        packageBudgetUsd: 80,
        voiceSynthesisTextLength: VO.length,
        confirmPaidRun: true,
      },
      {
        videoProvider: tracker.buildProvider("https://fake.test/clip.mp4"),
        requireProvider: true,
        supabase: store.supabase,
        fetchImpl: async () =>
          new Response(clip, {
            status: 200,
            headers: { "content-type": "video/mp4" },
          }),
        validateClipBuffer: async () => ({ ok: true }),
        downloadSceneClip: async () => clip,
        sleep: async () => undefined,
      },
    );
    assert.equal(result.status, "completed");
    const clipRefs = execution.items.map((item) => {
      const view = result.attemptsBySceneId.get(item.sceneId);
      assert.ok(view?.outputBucket && view.outputPath);
      return {
        sceneId: item.sceneId,
        bucket: view!.outputBucket!,
        path: view!.outputPath!,
        attemptId: view!.id,
        duration: item.requiredTrimSeconds,
      };
    });
    const spec = buildTextToVideoRenderSpecOutput({
      executionPlan: execution,
      voiceoverDurationSeconds: 24,
      clipRefs,
    });
    assert.equal(spec.scenes.length, execution.items.length);
    const assignments = buildTextToVideoClipAssignments(clipRefs);
    assert.equal(assignments.length, execution.items.length);
    const firstParts = spec.scenes.filter((scene) =>
      String(scene.id).startsWith("scene-1__part-"),
    );
    assert.ok(firstParts.length >= 2);
    assert.equal(firstParts[1]!.transition_in, "none");
  });

  await check("18 — this file never performs a real network request", () => {
    const thisFile = readFileSync(
      join(root, "scripts/check-production-t2v-technical-clip-split.ts"),
      "utf8",
    );
    assert.doesNotMatch(
      thisFile,
      /api\.anthropic\.com|api\.openai\.com|api\.elevenlabs|api\.dev\.runwayml/,
    );
    assert.ok(plannedTechnicalPartCountFromEstimate(14) >= 2);
    void sceneRequestFingerprint;
    void evaluateTextToVideoRunwayBudget;
    void TEXT_TO_VIDEO_PLAN_SCHEMA_VERSION;
  });
}

await main();
