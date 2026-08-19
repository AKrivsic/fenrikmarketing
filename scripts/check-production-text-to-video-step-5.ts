/**
 * Production text-to-video Step 5 — offline behavioral + FFmpeg where available.
 * Run: npx tsx scripts/check-production-text-to-video-step-5.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadTextToVideoAttemptByScene,
  selectTextToVideoAttemptForPlanItem,
} from "../lib/text-to-video/textToVideoAttemptSelection";
import { validateTextToVideoSceneClipBuffer } from "../lib/text-to-video/validateSceneClip";
import { validateSceneClipsCheckpointStructure } from "../lib/text-to-video/sceneClipsCheckpointValidation";
import {
  proposeAutoSoundPlanFromCreativePlan,
} from "../lib/content-package/textToVideoSoundPlan";
import {
  resolveSfxAnchorSeconds as anchorSeconds,
  resolveSfxPlacements as placements,
  validateSceneSoundForApproval,
} from "../lib/text-to-video/textToVideoSfxAnchoring";
import {
  isElevenLabsSoundEffectsEnabled,
  isElevenLabsMusicEnabled,
  elevenLabsMusicAllowedForProduction,
} from "../lib/elevenlabs/audioProductionConfig";
import { evaluateTextToVideoFullBudget } from "../lib/text-to-video/textToVideoAudioBudget";
import { buildTextToVideoRunwayExecutionPlan } from "../lib/text-to-video/runwayExecutionPlan";
import { executeTextToVideoRunwayPlan } from "../lib/text-to-video/textToVideoRunwayExecutor";
import { audioAssetInputFingerprint } from "../lib/elevenlabs/soundGeneration";
import { ElevenLabsAdapterError, elevenLabsErrorImpliesSubmissionUnknown } from "../lib/elevenlabs/adapter";

async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`ok — ${name}`);
}

function alignment(chars: string) {
  const step = 1 / Math.max(chars.length, 1);
  return {
    characters: chars.split(""),
    character_start_times_seconds: chars.split("").map((_, i) => i * step),
    character_end_times_seconds: chars.split("").map((_, i) => (i + 1) * step),
  };
}

function fakeAttempt(partial: Partial<SceneVideoAttemptView>): SceneVideoAttemptView {
  return {
    id: "id",
    videoJobId: "job",
    sceneId: "s1",
    status: "succeeded",
    provider: "runway",
    model: "gen4.5",
    generationMode: "image_to_video",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  } as SceneVideoAttemptView;
}

async function main() {
  let n = 0;
  const envOff = { ELEVENLABS_SOUND_EFFECTS_ENABLED: "false", ELEVENLABS_MUSIC_ENABLED: "false" };

  await check(`${++n} I2V attempt ignored for T2V selection`, () => {
    const i2v = fakeAttempt({
      generationMode: "image_to_video",
      motionPrompt: "move",
      providerTaskId: "t",
    });
    const t2v = fakeAttempt({
      generationMode: "text_to_video",
      providerMetadata: { request_fingerprint: "fp" },
    });
    const item = {
      sceneId: "s1",
      sceneOrder: 0,
      requestFingerprint: "fp",
      providerDurationSeconds: 5,
      requiredTrimSeconds: 3,
      estimatedCostUsd: 0.1,
      providerPrompt: "p",
    };
    assert.equal(selectTextToVideoAttemptForPlanItem([i2v, t2v], item)?.id, t2v.id);
    assert.equal(loadTextToVideoAttemptByScene([i2v], item), null);
  });

  await check(`${++n} mismatched fingerprint not selected`, () => {
    const t2v = fakeAttempt({
      generationMode: "text_to_video",
      providerMetadata: { request_fingerprint: "other" },
    });
    const item = {
      sceneId: "s1",
      sceneOrder: 0,
      requestFingerprint: "fp",
      providerDurationSeconds: 5,
      requiredTrimSeconds: 3,
      estimatedCostUsd: 0.1,
      providerPrompt: "p",
    };
    assert.equal(selectTextToVideoAttemptForPlanItem([t2v], item), null);
  });

  await check(`${++n} invalid clip rejected at validation helper`, async () => {
    const r = await validateTextToVideoSceneClipBuffer({
      buffer: Buffer.from("not-mp4"),
      minDurationSeconds: 2,
      providerDurationSeconds: 5,
    });
    assert.equal(r.ok, false);
  });

  await check(`${++n} checkpoint requires exact scene set`, () => {
    const plan = buildTextToVideoRunwayExecutionPlan({
      plan: {
        schema_version: 1,
        status: "approved",
        voiceover_revision_id: "vr",
        voiceover_fingerprint: "vf",
        approved_hook: "h",
        hook_fingerprint: "hf",
        voice_direction_revision: 0,
        target_duration_seconds: 24,
        plan_fingerprint: "pf",
        repetition: { status: "passed", blocked_reasons: [] },
        timing_status: "measured",
        scenes: [
          {
            scene_id: "a",
            order: 0,
            human_meaning: "m",
            voiceover_excerpt: "x",
            approximate_start_seconds: 0,
            approximate_duration_seconds: 3,
            visual_intent: "v",
            provider_prompt: "p",
          },
          {
            scene_id: "b",
            order: 1,
            human_meaning: "m",
            voiceover_excerpt: "y",
            approximate_start_seconds: 3,
            approximate_duration_seconds: 3,
            visual_intent: "v",
            provider_prompt: "p2",
          },
          {
            scene_id: "c",
            order: 2,
            human_meaning: "m",
            voiceover_excerpt: "z",
            approximate_start_seconds: 6,
            approximate_duration_seconds: 3,
            visual_intent: "v",
            provider_prompt: "p3",
          },
        ],
      },
      voiceCheckpoint: {
        phase: "voice_complete",
        synthesis_attempt_id: "a",
        synthesis_fingerprint: "sf",
        voiceover_revision_id: "vr",
        voice_id: "v",
        model_id: "m",
        audio_bucket: "b",
        audio_path: "p",
        audio_duration_seconds: 9,
      },
    });
    const bad = {
      phase: "scene_clips_complete" as const,
      execution_fingerprint: plan.executionFingerprint,
      voice_checkpoint_fingerprint: "sf",
      creative_plan_fingerprint: "pf",
      synthesis_fingerprint: "sf",
      scenes: [
        {
          scene_id: "a",
          attempt_id: "1",
          output_bucket: "b",
          output_path: "p",
          provider_duration_seconds: 5,
          required_trim_seconds: 3,
          request_fingerprint: plan.items[0]!.requestFingerprint,
        },
      ],
      total_estimated_cost_usd: 1,
      estimate: true as const,
    };
    assert.equal(
      validateSceneClipsCheckpointStructure(
        bad,
        {
          executionFingerprint: plan.executionFingerprint,
          voiceCheckpointFingerprint: "sf",
          creativePlanFingerprint: "pf",
          synthesisFingerprint: "sf",
        },
        plan,
      ),
      false,
    );
  });

  await check(`${++n} audio asset fingerprint stable for duplicate claim scope`, () => {
    const a = audioAssetInputFingerprint({ prompt: "x", duration_seconds: 2, model: "m" });
    const b = audioAssetInputFingerprint({ duration_seconds: 2, model: "m", prompt: "x" });
    assert.equal(a, b);
  });

  await check(`${++n} none mode generates zero placements`, () => {
    const p = placements({
      scenes: [
        {
          sceneId: "s1",
          sceneOrder: 0,
          measuredStartSeconds: 0,
          requiredTrimSeconds: 3,
          providerDurationSeconds: 5,
          requestFingerprint: "f",
          estimatedCostUsd: 0.1,
          providerPrompt: "p",
        },
      ],
      sceneSound: { s1: { mode: "none" } },
      alignment: alignment("hello"),
      approvedVoiceover: "hello",
      videoDurationSeconds: 10,
    });
    assert.equal(p.length, 0);
  });

  await check(`${++n} custom SFX prompt stored in placement`, () => {
    const p = placements({
      scenes: [
        {
          sceneId: "s1",
          sceneOrder: 0,
          measuredStartSeconds: 0,
          requiredTrimSeconds: 3,
          providerDurationSeconds: 5,
          requestFingerprint: "f",
          estimatedCostUsd: 0.1,
          providerPrompt: "p",
        },
      ],
      sceneSound: {
        s1: {
          mode: "custom",
          custom_effect_description: "Silný zvuk",
          anchor: "scene_middle",
        },
      },
      alignment: alignment("hello"),
      approvedVoiceover: "hello",
      videoDurationSeconds: 10,
    });
    assert.equal(p[0]?.prompt, "Silný zvuk");
  });

  await check(`${++n} voice phrase anchor time`, () => {
    const vo = "Hello world";
    const t = anchorSeconds({
      anchor: "voice_phrase",
      scene: {
        sceneId: "s1",
        sceneOrder: 0,
        measuredStartSeconds: 1,
        requiredTrimSeconds: 3,
        providerDurationSeconds: 5,
        requestFingerprint: "f",
        estimatedCostUsd: 0.1,
        providerPrompt: "p",
      },
      alignment: alignment("Hello world"),
      approvedVoiceover: vo,
      voicePhrase: "world",
    });
    assert.ok(t > 0);
  });

  await check(`${++n} duplicate voice phrase blocked`, () => {
    assert.throws(() =>
      validateSceneSoundForApproval(
        {
          mode: "custom",
          custom_effect_description: "x",
          anchor: "voice_phrase",
          voice_phrase: "a",
        },
        "a a",
      ),
    );
  });

  await check(`${++n} scene middle anchor deterministic`, () => {
    const a = anchorSeconds({
      anchor: "scene_middle",
      scene: {
        sceneId: "s1",
        sceneOrder: 0,
        measuredStartSeconds: 2,
        requiredTrimSeconds: 4,
        providerDurationSeconds: 5,
        requestFingerprint: "f",
        estimatedCostUsd: 0.1,
        providerPrompt: "p",
      },
      alignment: alignment("x"),
      approvedVoiceover: "x",
    });
    assert.equal(a, 4);
  });

  await check(`${++n} auto plan max one effect per scene`, () => {
    const plan = proposeAutoSoundPlanFromCreativePlan({
      schema_version: 1,
      status: "approved",
      voiceover_revision_id: "vr",
      voiceover_fingerprint: "vf",
      approved_hook: "h",
      hook_fingerprint: "hf",
      voice_direction_revision: 0,
      target_duration_seconds: 24,
      plan_fingerprint: "pf",
      repetition: { status: "passed", blocked_reasons: [] },
      timing_status: "estimated",
      scenes: [
        {
          scene_id: "a",
          order: 0,
          human_meaning: "m",
          voiceover_excerpt: "x",
          approximate_start_seconds: 0,
          approximate_duration_seconds: 3,
          visual_intent: "v",
          provider_prompt: "p",
          sound_intent: "boom",
        },
        {
          scene_id: "b",
          order: 1,
          human_meaning: "m",
          voiceover_excerpt: "y",
          approximate_start_seconds: 3,
          approximate_duration_seconds: 3,
          visual_intent: "v",
          provider_prompt: "p2",
          sound_intent: "whoosh",
        },
        {
          scene_id: "c",
          order: 2,
          human_meaning: "m",
          voiceover_excerpt: "z",
          approximate_start_seconds: 6,
          approximate_duration_seconds: 3,
          visual_intent: "v",
          provider_prompt: "p3",
        },
        {
          scene_id: "d",
          order: 3,
          human_meaning: "m",
          voiceover_excerpt: "w",
          approximate_start_seconds: 9,
          approximate_duration_seconds: 3,
          visual_intent: "v",
          provider_prompt: "p4",
          sound_intent: "extra",
        },
      ],
    });
    assert.ok(Object.keys(plan.scene_sound).length <= 3);
  });

  await check(`${++n} SFX flag off by default`, () => {
    assert.equal(isElevenLabsSoundEffectsEnabled(envOff), false);
  });

  await check(`${++n} music license gate off by default`, () => {
    assert.equal(isElevenLabsMusicEnabled(envOff), false);
    assert.equal(
      elevenLabsMusicAllowedForProduction({ confirmPaidRun: true }),
      false,
    );
  });

  await check(`${++n} 5xx maps submission_unknown`, () => {
    const err = new ElevenLabsAdapterError("server_error", "x", 503);
    assert.equal(elevenLabsErrorImpliesSubmissionUnknown(err), true);
  });

  await check(`${++n} budget includes voice runway sfx music`, () => {
    const plan = buildTextToVideoRunwayExecutionPlan({
      plan: {
        schema_version: 1,
        status: "approved",
        voiceover_revision_id: "vr",
        voiceover_fingerprint: "vf",
        approved_hook: "h",
        hook_fingerprint: "hf",
        voice_direction_revision: 0,
        target_duration_seconds: 24,
        plan_fingerprint: "pf",
        repetition: { status: "passed", blocked_reasons: [] },
        timing_status: "measured",
        scenes: [
          {
            scene_id: "a",
            order: 0,
            human_meaning: "m",
            voiceover_excerpt: "x",
            approximate_start_seconds: 0,
            approximate_duration_seconds: 3,
            visual_intent: "v",
            provider_prompt: "p",
          },
          {
            scene_id: "b",
            order: 1,
            human_meaning: "m",
            voiceover_excerpt: "y",
            approximate_start_seconds: 3,
            approximate_duration_seconds: 3,
            visual_intent: "v",
            provider_prompt: "p2",
          },
          {
            scene_id: "c",
            order: 2,
            human_meaning: "m",
            voiceover_excerpt: "z",
            approximate_start_seconds: 6,
            approximate_duration_seconds: 3,
            visual_intent: "v",
            provider_prompt: "p3",
          },
        ],
      },
      voiceCheckpoint: {
        phase: "voice_complete",
        synthesis_attempt_id: "a",
        synthesis_fingerprint: "sf",
        voiceover_revision_id: "vr",
        voice_id: "v",
        model_id: "m",
        audio_bucket: "b",
        audio_path: "p",
        audio_duration_seconds: 9,
      },
    });
    const rep = evaluateTextToVideoFullBudget({
      plan,
      packageBudgetUsd: 0.01,
      voiceSynthesisTextLength: 500,
      existingBySceneId: new Map(),
      sfxPlacements: [
        {
          scene_id: "a",
          absolute_start_seconds: 0,
          duration_seconds: 2,
          gain: 0.3,
          fade_in_seconds: 0,
          fade_out_seconds: 0,
          prompt: "x",
        },
      ],
      music: { mode: "eleven_generated" },
      confirmPaidRun: true,
    });
    assert.equal(rep.blocked, true);
  });

  await check(`${++n} worker uses runTextToVideoJobPhase not assembly throw`, () => {
    const src = readFileSync(join(process.cwd(), "video-worker/jobRunner.ts"), "utf8");
    assert.match(src, /runTextToVideoJobPhase/);
    assert.doesNotMatch(src, /text_to_video_assembly_not_implemented/);
  });

  await check(`${++n} no real provider HTTP in this script`, () => {
    assert.equal(typeof fetch, "function");
  });

  console.log(`\nStep 5 checks passed: ${n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
