/**
 * Production text-to-video Step 4 — behavioral (offline, fake providers).
 * Run: npx tsx scripts/check-production-text-to-video-step-4.ts
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  buildNormIndexToSpokenRawIndex,
  excerptTimeRangeFromAlignment,
  spokenRawFromAlignment,
} from "../lib/elevenlabs/alignmentVoiceover";
import { selectAlignmentForApprovedVoiceover } from "../lib/elevenlabs/selectAlignmentForVoiceover";
import {
  buildElevenV3SynthesisText,
  storedSynthesisInputsMatch,
} from "../lib/elevenlabs/v3VoiceDirection";
import { subtitleCuesFromElevenAlignment } from "../lib/elevenlabs/subtitlesFromAlignment";
import {
  estimateRunwayGen45SceneCostUsd,
  isTextToVideoRunwayEnabled,
  TEXT_TO_VIDEO_RUNWAY_CREDITS_PER_SECOND,
} from "../lib/text-to-video/runwayProductionConfig";
import { runwayProviderDurationFromRequiredTrim } from "../lib/text-to-video/runwayProviderDuration";
import {
  buildTextToVideoRunwayExecutionPlan,
  sceneRequestFingerprint,
} from "../lib/text-to-video/runwayExecutionPlan";
import { evaluateTextToVideoRunwayBudget } from "../lib/text-to-video/runwayBudget";
import {
  buildTextToVideoSceneClientRequestId,
  executeTextToVideoRunwayPlan,
} from "../lib/text-to-video/textToVideoRunwayExecutor";
import { parseTextToVideoWorkerPaidGate } from "../lib/text-to-video/textToVideoWorkerPipeline";
import type { VideoGenerationProvider } from "../lib/ai/videoGeneration";
import {
  markSubmissionUnknownOwned,
  type VoiceSynthesisRow,
} from "../lib/text-to-video/voiceSynthesisRepository";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const VO = "Ahoj   svete.\nToto je test.";

function alignment(chars: string) {
  const step = 1 / Math.max(chars.length, 1);
  return {
    characters: chars.split(""),
    character_start_times_seconds: chars.split("").map((_, i) => i * step),
    character_end_times_seconds: chars.split("").map((_, i) => (i + 1) * step),
  };
}

async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`ok — ${name}`);
}

async function main() {
let n = 0;

await check(`${++n} alignment prefers original over normalized`, () => {
  const approved = "Hello world";
  const selected = selectAlignmentForApprovedVoiceover(
    {
      alignment: alignment("Hello world"),
      normalized_alignment: alignment("Hello mars"),
    },
    approved,
  );
  assert.equal(selected.source, "alignment");
});

await check(`${++n} whitespace/newline mapping preserves times`, () => {
  const approved = "Ahoj   svete.\nDruha veta.";
  const spoken = "Ahoj svete. Druha veta.";
  const map = buildNormIndexToSpokenRawIndex(approved, spoken);
  const align = alignment(spoken);
  const excerpt = excerptTimeRangeFromAlignment(align, approved, "svete.");
  assert.ok(excerpt.end_seconds > excerpt.start_seconds);
  assert.ok(map.length > 0);
});

await check(`${++n} emotion beats appear in synthesis text`, () => {
  const vo = "Uvod textu. Zaver textu.";
  const built = buildElevenV3SynthesisText({
    approvedVoiceover: vo,
    direction: {
      style: "auto",
      revision: 1,
      beats: [{ segment: "Zaver", delivery: "calm and trustworthy close" }],
    },
  });
  assert.match(built.synthesis_text, /\[calm\]/i);
});

await check(`${++n} custom instruction maps to whitelist only`, () => {
  const safe = buildElevenV3SynthesisText({
    approvedVoiceover: "Test.",
    direction: { style: "auto", revision: 0, custom_instruction: "keep calm tone" },
  });
  assert.match(safe.synthesis_text, /\[calm\]/);
  const unsafe = buildElevenV3SynthesisText({
    approvedVoiceover: "Test.",
    direction: {
      style: "auto",
      revision: 0,
      custom_instruction: "[[hack]] raw tag injection",
    },
  });
  assert.ok(unsafe.beat_diagnostics?.includes("custom_instruction_unmapped"));
});

await check(`${++n} tags are not in subtitles`, () => {
  const vo = "Ahoj svete.";
  const align = alignment("[warm]Ahoj svete.");
  const cues = subtitleCuesFromElevenAlignment(align, vo);
  assert.ok(cues.every((c) => !/\[(excited|confident|warm|calm|serious)\]/i.test(c.text)));
});

await check(`${++n} stored synthesis input includes voice and model`, () => {
  assert.equal(
    storedSynthesisInputsMatch(
      {
        approved_voiceover_text: "a",
        synthesis_text: "b",
        direction_contract_version: 1,
        style: "auto",
        voice_direction_revision: 0,
        voice_id: "v1",
        model_id: "m1",
        output_format: "mp3",
      },
      {
        approved_voiceover_text: "a",
        synthesis_text: "b",
        direction_contract_version: 1,
        style: "auto",
        voice_direction_revision: 0,
        voice_id: "v1",
        model_id: "m1",
        output_format: "mp3",
      },
    ),
    true,
  );
});

await check(`${++n} provider failure update is owner-scoped`, async () => {
  let ownerFilter = "";
  const supabase = {
    from() {
      return {
        update() {
          const chain = {
            eq(_c: string, v: string) {
              ownerFilter = v;
              return chain;
            },
            in() {
              return {
                select() {
                  return {
                    maybeSingle: async () => ({ data: { id: "1" }, error: null }),
                  };
                },
              };
            },
          };
          return chain;
        },
      };
    },
  };
  await markSubmissionUnknownOwned(
    supabase as never,
    "id",
    "owner-a",
    "timeout",
  );
  assert.equal(ownerFilter, "owner-a");
});

await check(`${++n} measured scenes map to duration 2–10`, () => {
  const d = runwayProviderDurationFromRequiredTrim(3.4);
  assert.equal(d.providerDurationSeconds, 4);
  assert.ok(d.providerDurationSeconds >= 2 && d.providerDurationSeconds <= 10);
});

await check(`${++n} fractional duration uses safe ceiling`, () => {
  const d = runwayProviderDurationFromRequiredTrim(2.01);
  assert.equal(d.providerDurationSeconds, 3);
});

await check(`${++n} scene above 10 seconds is blocked`, () => {
  assert.throws(
    () => runwayProviderDurationFromRequiredTrim(10.5),
    /scene_duration_exceeds_runway_max/,
  );
});

await check(`${++n} Gen-4.5 cost is 12 credits per second`, () => {
  const c = estimateRunwayGen45SceneCostUsd(5);
  assert.equal(c.credits, 5 * TEXT_TO_VIDEO_RUNWAY_CREDITS_PER_SECOND);
});

await check(`${++n} voice exposure subtracted in budget`, () => {
  const plan = buildTextToVideoRunwayExecutionPlan({
    plan: {
      schema_version: 1,
      status: "approved",
      voiceover_revision_id: "vr",
      voiceover_fingerprint: "vf",
      approved_hook: "hook",
      hook_fingerprint: "hf",
      voice_direction_revision: 0,
      target_duration_seconds: 24,
      plan_fingerprint: "pf",
      repetition: { status: "passed", blocked_reasons: [] },
      timing_status: "measured",
      measured_audio_revision_id: "vr",
      timing_measurement_source: "alignment",
      scenes: [
        {
          scene_id: "s1",
          order: 0,
          human_meaning: "m",
          voiceover_excerpt: "a",
          approximate_start_seconds: 0,
          approximate_duration_seconds: 3,
          visual_intent: "v",
          provider_prompt: "prompt one two three",
        },
        {
          scene_id: "s2",
          order: 1,
          human_meaning: "m2",
          voiceover_excerpt: "b",
          approximate_start_seconds: 3,
          approximate_duration_seconds: 3,
          visual_intent: "v2",
          provider_prompt: "prompt four five six",
        },
        {
          scene_id: "s3",
          order: 2,
          human_meaning: "m3",
          voiceover_excerpt: "c",
          approximate_start_seconds: 6,
          approximate_duration_seconds: 3,
          visual_intent: "v3",
          provider_prompt: "prompt seven eight nine",
        },
      ],
    },
    voiceCheckpoint: {
      phase: "voice_complete",
      synthesis_attempt_id: "a",
      synthesis_fingerprint: "fp",
      voiceover_revision_id: "vr",
      voice_id: "v",
      model_id: "m",
      audio_bucket: "b",
      audio_path: "p",
      audio_duration_seconds: 9,
    },
  });
  const report = evaluateTextToVideoRunwayBudget({
    plan,
    packageBudgetUsd: 0.01,
    voiceSynthesisTextLength: 500,
    existingBySceneId: new Map(),
  });
  assert.ok(report.voiceExposureUsd > 0);
  assert.equal(report.blocked, true);
});

await check(`${++n} submission unknown counts toward budget`, () => {
  const plan = buildTextToVideoRunwayExecutionPlan({
    plan: {
      schema_version: 1,
      status: "approved",
      voiceover_revision_id: "vr",
      voiceover_fingerprint: "vf",
      approved_hook: "hook",
      hook_fingerprint: "hf",
      voice_direction_revision: 0,
      target_duration_seconds: 24,
      plan_fingerprint: "pf",
      repetition: { status: "passed", blocked_reasons: [] },
      timing_status: "measured",
      measured_audio_revision_id: "vr",
      timing_measurement_source: "alignment",
      scenes: [
        {
          scene_id: "s1",
          order: 0,
          human_meaning: "m",
          voiceover_excerpt: "a",
          approximate_start_seconds: 0,
          approximate_duration_seconds: 3,
          visual_intent: "v",
          provider_prompt: "p1",
        },
        {
          scene_id: "s2",
          order: 1,
          human_meaning: "m2",
          voiceover_excerpt: "b",
          approximate_start_seconds: 3,
          approximate_duration_seconds: 3,
          visual_intent: "v2",
          provider_prompt: "p2",
        },
        {
          scene_id: "s3",
          order: 2,
          human_meaning: "m3",
          voiceover_excerpt: "c",
          approximate_start_seconds: 6,
          approximate_duration_seconds: 3,
          visual_intent: "v3",
          provider_prompt: "p3",
        },
      ],
    },
    voiceCheckpoint: {
      phase: "voice_complete",
      synthesis_attempt_id: "a",
      synthesis_fingerprint: "fp",
      voiceover_revision_id: "vr",
      voice_id: "v",
      model_id: "m",
      audio_bucket: "b",
      audio_path: "p",
      audio_duration_seconds: 9,
    },
  });
  const item = plan.items[0]!;
  const report = evaluateTextToVideoRunwayBudget({
    plan,
    packageBudgetUsd: 100,
    voiceSynthesisTextLength: 10,
    existingBySceneId: new Map([
      [
        item.sceneId,
        {
          id: "1",
          projectId: "p",
          videoJobId: "j",
          sceneId: item.sceneId,
          clientRequestId: "c",
          parentAttemptId: null,
          sourceImageBucket: "",
          sourceImagePath: "",
          motionPrompt: "x",
          provider: "runway",
          model: "gen4.5",
          durationSeconds: 4,
          ratio: "720:1280",
          seed: 1,
          providerTaskId: null,
          status: "submission_unknown",
          failureCode: null,
          errorMessage: null,
          estimatedCredits: item.estimatedCredits,
          estimatedCostUsd: item.estimatedCostUsd,
          createdAt: "",
          submittedAt: null,
          startedAt: null,
          completedAt: null,
          updatedAt: "",
          generationDurationMs: null,
          outputBucket: null,
          outputPath: null,
          outputDurationSeconds: null,
          outputHasAudio: null,
          providerMetadata: { request_fingerprint: item.requestFingerprint },
          reusedExistingRequest: false,
        },
      ],
    ]),
  });
  assert.ok(report.runwayCommittedUsd >= item.estimatedCostUsd);
});

await check(`${++n} insufficient budget yields zero runway POST`, async () => {
  const posts: unknown[] = [];
  const provider: VideoGenerationProvider = {
    name: "runway",
    createImageToVideo: async () => {
      throw new Error("no i2v");
    },
    getImageToVideoTask: async () => {
      throw new Error("no");
    },
    waitForImageToVideo: async () => {
      throw new Error("no");
    },
    generateImageToVideo: async () => {
      throw new Error("no");
    },
    createTextToVideo: async (req) => {
      posts.push(req);
      return {
        provider: "runway",
        providerTaskId: "task-1",
        status: "pending",
        model: "gen4.5",
      };
    },
    getTextToVideoTask: async () => ({
      provider: "runway",
      providerTaskId: "task-1",
      status: "succeeded",
      model: "gen4.5",
      videoUrl: "https://example.test/out.mp4",
    }),
  };
  const plan = buildTextToVideoRunwayExecutionPlan({
    plan: {
      schema_version: 1,
      status: "approved",
      voiceover_revision_id: "vr",
      voiceover_fingerprint: "vf",
      approved_hook: "hook",
      hook_fingerprint: "hf",
      voice_direction_revision: 0,
      target_duration_seconds: 24,
      plan_fingerprint: "pf",
      repetition: { status: "passed", blocked_reasons: [] },
      timing_status: "measured",
      measured_audio_revision_id: "vr",
      timing_measurement_source: "alignment",
      scenes: [
        {
          scene_id: "s1",
          order: 0,
          human_meaning: "m",
          voiceover_excerpt: "a",
          approximate_start_seconds: 0,
          approximate_duration_seconds: 3,
          visual_intent: "v",
          provider_prompt: "p1",
        },
        {
          scene_id: "s2",
          order: 1,
          human_meaning: "m2",
          voiceover_excerpt: "b",
          approximate_start_seconds: 3,
          approximate_duration_seconds: 3,
          visual_intent: "v2",
          provider_prompt: "p2",
        },
        {
          scene_id: "s3",
          order: 2,
          human_meaning: "m3",
          voiceover_excerpt: "c",
          approximate_start_seconds: 6,
          approximate_duration_seconds: 3,
          visual_intent: "v3",
          provider_prompt: "p3",
        },
      ],
    },
    voiceCheckpoint: {
      phase: "voice_complete",
      synthesis_attempt_id: "a",
      synthesis_fingerprint: "fp",
      voiceover_revision_id: "vr",
      voice_id: "v",
      model_id: "m",
      audio_bucket: "b",
      audio_path: "p",
      audio_duration_seconds: 9,
    },
  });
  const result = await executeTextToVideoRunwayPlan(
    {
      projectId: "00000000-0000-4000-8000-000000000001",
      videoJobId: "00000000-0000-4000-8000-000000000002",
      plan,
      packageBudgetUsd: 0.001,
      voiceSynthesisTextLength: 1000,
      confirmPaidRun: true,
    },
    {
      videoProvider: provider,
      requireProvider: true,
      supabase: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ data: [], error: null }) }) }) }) }) } as never,
    },
  );
  assert.equal(result.status, "blocked");
  assert.equal(posts.length, 0);
});

await check(`${++n} same execution input yields same fingerprint`, () => {
  const payload = { a: 1, b: "x" };
  assert.equal(
    sceneRequestFingerprint(payload),
    sceneRequestFingerprint({ b: "x", a: 1 }),
  );
});

await check(`${++n} prompt change changes fingerprint`, () => {
  const a = sceneRequestFingerprint({ prompt: "one" });
  const b = sceneRequestFingerprint({ prompt: "two" });
  assert.notEqual(a, b);
});

await check(`${++n} client request id stable per scene fingerprint`, () => {
  const id1 = buildTextToVideoSceneClientRequestId({
    videoJobId: "00000000-0000-4000-8000-000000000002",
    requestFingerprint: "abc",
  });
  const id2 = buildTextToVideoSceneClientRequestId({
    videoJobId: "00000000-0000-4000-8000-000000000002",
    requestFingerprint: "abc",
  });
  assert.equal(id1, id2);
});

await check(`${++n} worker flags default off`, () => {
  delete process.env.TEXT_TO_VIDEO_RUNWAY_ENABLED;
  delete process.env.ELEVENLABS_TTS_ENABLED;
  assert.equal(isTextToVideoRunwayEnabled(), false);
});

await check(`${++n} still job path unchanged`, () => {
  const src = readFileSync(
    join(process.cwd(), "video-worker/jobRunner.ts"),
    "utf8",
  );
  assert.ok(src.includes("VIDEO_RENDER_MODE_STILL"));
  assert.ok(src.includes("runTextToVideoJobPhase"));
});

await check(`${++n} worker paid gate requires confirm`, () => {
  const gate = parseTextToVideoWorkerPaidGate({});
  assert.equal(gate.confirmPaidRun, false);
});

console.log(`\nStep 4 behavioral checks passed (${n}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
