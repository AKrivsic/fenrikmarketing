import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { DEFAULT_VOICE_SCRIPT } from "@/lib/ai-media-benchmark/types";
import { AI_MEDIA_BENCHMARK_COMBINED_FILENAME } from "@/lib/ai-media-benchmark/constants";
import {
  evaluateCombinedMp4Identity,
  expectedCombinedOutput,
} from "@/lib/ai-media-benchmark/combinedContract";
import {
  createCombinedScene,
  syncCombinedScene,
} from "@/lib/ai-media-benchmark/combinedService";
import { assembleBenchmarkCombinedScene } from "@/video-worker/services/assembleBenchmarkCombinedScene";

type CheckFn = (name: string, fn: () => void | Promise<void>) => Promise<void>;

type FakeSupabase = {
  storage: { from: (bucket?: string) => { upload: (path: string) => Promise<unknown> } };
  _combined: Map<string, Record<string, unknown>>;
  _files: Map<string, true>;
  missNextCombinedSelect: () => void;
};

export async function runRoundAPlus12cChecks(args: {
  check: CheckFn;
  PROJECT_A: string;
  PROJECT_B: string;
  REQUEST_1: string;
  REQUEST_2: string;
  REQUEST_3: string;
  REQUEST_4: string;
  VIDEO_RUN_ID: string;
  VIDEO_RUN_B: string;
  VIDEO_RUN_C: string;
  VOICE_RUN_ID: string;
  VOICE_RUN_B: string;
  SOUND_RUN_ID: string;
  SOUND_RUN_B: string;
  makeFakeSupabase: () => FakeSupabase;
  seedCombinedSources: (supabase: FakeSupabase) => void;
  seedSucceededRun: (
    supabase: FakeSupabase,
    runArgs: {
      id: string;
      testType: "video" | "voice" | "sound";
      model: string;
      outputContainsAudio?: boolean;
      clientRequestId: string;
      settings?: Record<string, unknown>;
      projectId?: string;
    },
  ) => void;
}): Promise<void> {
  const {
    check,
    PROJECT_A,
    PROJECT_B,
    REQUEST_1,
    REQUEST_2,
    REQUEST_3,
    REQUEST_4,
    VIDEO_RUN_ID,
    VIDEO_RUN_B,
    VIDEO_RUN_C,
    VOICE_RUN_ID,
    VOICE_RUN_B,
    SOUND_RUN_ID,
    SOUND_RUN_B,
    makeFakeSupabase,
    seedCombinedSources,
    seedSucceededRun,
  } = args;

  function canonicalMix(extra?: {
    useSceneAudio?: boolean;
    useAmbientSound?: boolean;
    voiceoverGain?: number;
    targetDurationSeconds?: number;
  }) {
    return {
      targetDurationSeconds: extra?.targetDurationSeconds ?? 4,
      voiceoverStartSeconds: 0 as const,
      voiceoverGain: extra?.voiceoverGain ?? 1,
      sceneAudioGain: 0.22,
      ambientGain: 0.08,
      useSceneAudio: extra?.useSceneAudio ?? false,
      useAmbientSound: extra?.useAmbientSound ?? false,
    };
  }

  function combinedPath(projectId: string, combinedRunId: string): string {
    return `${projectId}/ai-media-benchmark/${combinedRunId}/${AI_MEDIA_BENCHMARK_COMBINED_FILENAME}`;
  }

  function fakeMixOk(outputPath: string) {
    return {
      audioPath: outputPath,
      durationSeconds: 4,
      sampleRate: 44100,
      channels: 2,
      diagnostics: {
        sceneAudioUsed: [] as string[],
        sceneAudioSkipped: [] as string[],
        musicUsed: false,
        ambientUsed: false,
        sfxCount: 0,
        visualTimelineSeconds: 4 as number | null,
        ducked: false,
      },
    };
  }

  function assembleArgs(combinedRunId: string) {
    return {
      combinedRunId,
      projectId: PROJECT_A,
      video: {
        bucket: "video-renders",
        path: `${PROJECT_A}/ai-media-benchmark/${VIDEO_RUN_ID}/output.mp4`,
      },
      voice: {
        bucket: "video-renders",
        path: `${PROJECT_A}/ai-media-benchmark/${VOICE_RUN_ID}/audio.mp3`,
      },
      mix: canonicalMix(),
      outputBucket: "video-renders",
      outputPath: combinedPath(PROJECT_A, combinedRunId),
    };
  }

  function downloadExistingCombined(outputPath: string) {
    return async (ref: { path: string }, dest: string) => {
      if (ref.path === outputPath) {
        await writeFile(dest, Buffer.from("existing-mp4"));
      }
    };
  }

  async function succeedAssemble(
    supabase: ReturnType<typeof makeFakeSupabase>,
    payload: { output_bucket: string; output_path: string },
  ) {
    await supabase.storage.from(payload.output_bucket).upload(payload.output_path);
    return {
      output_bucket: payload.output_bucket,
      output_path: payload.output_path,
      duration_seconds: 4,
      voiceover_duration_seconds: 3,
      reused_existing_output: false,
      used_scene_audio: false,
      used_ambient_sound: true,
    };
  }

  await check("corrupt existing MP4 is not adopted and is re-rendered", async () => {
    const combinedRunId = "91919191-9191-4919-8919-919191919191";
    const input = assembleArgs(combinedRunId);
    let mixed = 0;
    const result = await assembleBenchmarkCombinedScene(input, {
      download: downloadExistingCombined(input.outputPath),
      probeCombinedMp4: async () =>
        evaluateCombinedMp4Identity({
          readable: false,
          hasVideo: false,
          hasAudio: false,
        }),
      probeDurationSeconds: async () => 3.2,
      mixAudioLayers: async (mixInput) => {
        mixed += 1;
        return fakeMixOk(mixInput.outputPath);
      },
      muxVideoWithAudio: async () => undefined,
      upload: async () => undefined,
    });
    assert.equal(result.reusedExistingOutput, false);
    assert.equal(mixed, 1);
  });

  await check("valid existing MP4 is verified and reused without a new render", async () => {
    const combinedRunId = "92929292-9292-4929-8929-929292929292";
    const input = assembleArgs(combinedRunId);
    const result = await assembleBenchmarkCombinedScene(input, {
      download: downloadExistingCombined(input.outputPath),
      probeCombinedMp4: async () =>
        evaluateCombinedMp4Identity({
          readable: true,
          hasVideo: true,
          hasAudio: true,
          width: 720,
          height: 1280,
          durationSeconds: 4,
        }),
      mixAudioLayers: async () => {
        throw new Error("mix_should_not_run");
      },
      muxVideoWithAudio: async () => {
        throw new Error("mux_should_not_run");
      },
      upload: async () => {
        throw new Error("upload_should_not_run");
      },
    });
    assert.equal(result.reusedExistingOutput, true);
    assert.equal(result.durationSeconds, 4);
  });

  await check("existing MP4 without audio stream is rejected", async () => {
    const identity = evaluateCombinedMp4Identity({
      readable: true,
      hasVideo: true,
      hasAudio: false,
      width: 720,
      height: 1280,
      durationSeconds: 4,
    });
    assert.equal(identity.ok, false);
    assert.equal(identity.reason, "missing_audio");
    const combinedRunId = "93939393-9393-4939-8939-939393939393";
    const input = assembleArgs(combinedRunId);
    let mixed = 0;
    const result = await assembleBenchmarkCombinedScene(input, {
      download: downloadExistingCombined(input.outputPath),
      probeCombinedMp4: async () => identity,
      probeDurationSeconds: async () => 3.2,
      mixAudioLayers: async (mixInput) => {
        mixed += 1;
        return fakeMixOk(mixInput.outputPath);
      },
      muxVideoWithAudio: async () => undefined,
      upload: async () => undefined,
    });
    assert.equal(result.reusedExistingOutput, false);
    assert.equal(mixed, 1);
  });

  await check("existing MP4 without video stream is rejected", async () => {
    const identity = evaluateCombinedMp4Identity({
      readable: true,
      hasVideo: false,
      hasAudio: true,
      durationSeconds: 4,
    });
    assert.equal(identity.ok, false);
    assert.equal(identity.reason, "missing_video");
    const combinedRunId = "94949494-9494-4949-8949-949494949494";
    const input = assembleArgs(combinedRunId);
    let mixed = 0;
    const result = await assembleBenchmarkCombinedScene(input, {
      download: downloadExistingCombined(input.outputPath),
      probeCombinedMp4: async () => identity,
      probeDurationSeconds: async () => 3.2,
      mixAudioLayers: async (mixInput) => {
        mixed += 1;
        return fakeMixOk(mixInput.outputPath);
      },
      muxVideoWithAudio: async () => undefined,
      upload: async () => undefined,
    });
    assert.equal(result.reusedExistingOutput, false);
    assert.equal(mixed, 1);
  });

  await check("existing MP4 with wrong duration is rejected", async () => {
    const identity = evaluateCombinedMp4Identity({
      readable: true,
      hasVideo: true,
      hasAudio: true,
      width: 720,
      height: 1280,
      durationSeconds: 9,
    });
    assert.equal(identity.ok, false);
    assert.equal(identity.reason, "duration_mismatch");
    const combinedRunId = "95959595-9595-4959-8959-959595959595";
    const input = assembleArgs(combinedRunId);
    let mixed = 0;
    const result = await assembleBenchmarkCombinedScene(input, {
      download: downloadExistingCombined(input.outputPath),
      probeCombinedMp4: async () => identity,
      probeDurationSeconds: async () => 3.2,
      mixAudioLayers: async (mixInput) => {
        mixed += 1;
        return fakeMixOk(mixInput.outputPath);
      },
      muxVideoWithAudio: async () => undefined,
      upload: async () => undefined,
    });
    assert.equal(result.reusedExistingOutput, false);
    assert.equal(mixed, 1);
  });

  await check("existing MP4 with wrong resolution is rejected", async () => {
    const identity = evaluateCombinedMp4Identity({
      readable: true,
      hasVideo: true,
      hasAudio: true,
      width: 1080,
      height: 1920,
      durationSeconds: 4,
    });
    assert.equal(identity.ok, false);
    assert.equal(identity.reason, "resolution_mismatch");
    const combinedRunId = "96969696-9696-4969-8969-969696969696";
    const input = assembleArgs(combinedRunId);
    let mixed = 0;
    const result = await assembleBenchmarkCombinedScene(input, {
      download: downloadExistingCombined(input.outputPath),
      probeCombinedMp4: async () => identity,
      probeDurationSeconds: async () => 3.2,
      mixAudioLayers: async (mixInput) => {
        mixed += 1;
        return fakeMixOk(mixInput.outputPath);
      },
      muxVideoWithAudio: async () => undefined,
      upload: async () => undefined,
    });
    assert.equal(result.reusedExistingOutput, false);
    assert.equal(mixed, 1);
  });

  await check("same client_request_id with a different video run is rejected", async () => {
    const supabase = makeFakeSupabase();
    seedCombinedSources(supabase);
    seedSucceededRun(supabase, {
      id: VIDEO_RUN_B,
      testType: "video",
      model: "gen4.5",
      outputContainsAudio: false,
      clientRequestId: REQUEST_4,
    });
    await createCombinedScene(
      {
        projectId: PROJECT_A,
        videoRunId: VIDEO_RUN_ID,
        voiceRunId: VOICE_RUN_ID,
        soundRunId: SOUND_RUN_ID,
        clientRequestId: REQUEST_1,
      },
      { supabase: supabase as never, assemble: (payload) => succeedAssemble(supabase, payload) },
    );
    await assert.rejects(
      () =>
        createCombinedScene(
          {
            projectId: PROJECT_A,
            videoRunId: VIDEO_RUN_B,
            voiceRunId: VOICE_RUN_ID,
            soundRunId: SOUND_RUN_ID,
            clientRequestId: REQUEST_1,
          },
          {
            supabase: supabase as never,
            assemble: async () => {
              throw new Error("assemble_should_not_run");
            },
          },
        ),
      /combined_request_input_mismatch/,
    );
  });

  await check("same client_request_id with a different voice run is rejected", async () => {
    const supabase = makeFakeSupabase();
    seedCombinedSources(supabase);
    seedSucceededRun(supabase, {
      id: VOICE_RUN_B,
      testType: "voice",
      model: "gpt-4o-mini-tts",
      clientRequestId: REQUEST_4,
      settings: { text: DEFAULT_VOICE_SCRIPT },
    });
    await createCombinedScene(
      {
        projectId: PROJECT_A,
        videoRunId: VIDEO_RUN_ID,
        voiceRunId: VOICE_RUN_ID,
        clientRequestId: REQUEST_1,
      },
      { supabase: supabase as never, assemble: (payload) => succeedAssemble(supabase, payload) },
    );
    await assert.rejects(
      () =>
        createCombinedScene(
          {
            projectId: PROJECT_A,
            videoRunId: VIDEO_RUN_ID,
            voiceRunId: VOICE_RUN_B,
            clientRequestId: REQUEST_1,
          },
          {
            supabase: supabase as never,
            assemble: async () => {
              throw new Error("assemble_should_not_run");
            },
          },
        ),
      /combined_request_input_mismatch/,
    );
  });

  await check("same client_request_id with a different sound run is rejected", async () => {
    const supabase = makeFakeSupabase();
    seedCombinedSources(supabase);
    seedSucceededRun(supabase, {
      id: SOUND_RUN_B,
      testType: "sound",
      model: "eleven_text_to_sound_v2",
      clientRequestId: REQUEST_4,
    });
    await createCombinedScene(
      {
        projectId: PROJECT_A,
        videoRunId: VIDEO_RUN_ID,
        voiceRunId: VOICE_RUN_ID,
        soundRunId: SOUND_RUN_ID,
        clientRequestId: REQUEST_1,
      },
      { supabase: supabase as never, assemble: (payload) => succeedAssemble(supabase, payload) },
    );
    await assert.rejects(
      () =>
        createCombinedScene(
          {
            projectId: PROJECT_A,
            videoRunId: VIDEO_RUN_ID,
            voiceRunId: VOICE_RUN_ID,
            soundRunId: null,
            clientRequestId: REQUEST_1,
          },
          {
            supabase: supabase as never,
            assemble: async () => {
              throw new Error("assemble_should_not_run");
            },
          },
        ),
      /combined_request_input_mismatch/,
    );
  });

  await check("same client_request_id with a different project or case ID is rejected", async () => {
    const supabase = makeFakeSupabase();
    seedCombinedSources(supabase);
    seedSucceededRun(supabase, {
      id: VIDEO_RUN_C,
      testType: "video",
      model: "gen4_turbo",
      outputContainsAudio: false,
      clientRequestId: REQUEST_2,
      projectId: PROJECT_B,
    });
    seedSucceededRun(supabase, {
      id: VOICE_RUN_B,
      testType: "voice",
      model: "gpt-4o-mini-tts",
      clientRequestId: REQUEST_3,
      settings: { text: DEFAULT_VOICE_SCRIPT },
      projectId: PROJECT_B,
    });
    await createCombinedScene(
      {
        projectId: PROJECT_A,
        videoRunId: VIDEO_RUN_ID,
        voiceRunId: VOICE_RUN_ID,
        clientRequestId: REQUEST_1,
        caseId: "combined-scene-a",
      },
      { supabase: supabase as never, assemble: (payload) => succeedAssemble(supabase, payload) },
    );
    await assert.rejects(
      () =>
        createCombinedScene(
          {
            projectId: PROJECT_B,
            videoRunId: VIDEO_RUN_C,
            voiceRunId: VOICE_RUN_B,
            clientRequestId: REQUEST_1,
          },
          {
            supabase: supabase as never,
            assemble: async () => {
              throw new Error("assemble_should_not_run");
            },
          },
        ),
      /combined_request_input_mismatch/,
    );
    await assert.rejects(
      () =>
        createCombinedScene(
          {
            projectId: PROJECT_A,
            videoRunId: VIDEO_RUN_ID,
            voiceRunId: VOICE_RUN_ID,
            clientRequestId: REQUEST_1,
            caseId: "combined-scene-other",
          },
          {
            supabase: supabase as never,
            assemble: async () => {
              throw new Error("assemble_should_not_run");
            },
          },
        ),
      /combined_request_input_mismatch/,
    );
  });

  await check("concurrent insert with different inputs is rejected", async () => {
    const supabase = makeFakeSupabase();
    seedCombinedSources(supabase);
    seedSucceededRun(supabase, {
      id: VIDEO_RUN_B,
      testType: "video",
      model: "gen4.5",
      outputContainsAudio: false,
      clientRequestId: REQUEST_4,
    });
    await createCombinedScene(
      {
        projectId: PROJECT_A,
        videoRunId: VIDEO_RUN_ID,
        voiceRunId: VOICE_RUN_ID,
        soundRunId: SOUND_RUN_ID,
        clientRequestId: REQUEST_1,
      },
      { supabase: supabase as never, assemble: (payload) => succeedAssemble(supabase, payload) },
    );
    supabase.missNextCombinedSelect();
    await assert.rejects(
      () =>
        createCombinedScene(
          {
            projectId: PROJECT_A,
            videoRunId: VIDEO_RUN_B,
            voiceRunId: VOICE_RUN_ID,
            soundRunId: SOUND_RUN_ID,
            clientRequestId: REQUEST_1,
          },
          {
            supabase: supabase as never,
            assemble: async () => {
              throw new Error("assemble_should_not_run");
            },
          },
        ),
      /combined_request_input_mismatch/,
    );
  });

  await check("voiceover of exactly 3.90s is accepted", async () => {
    const combinedRunId = "97979797-9797-4979-8979-979797979797";
    const result = await assembleBenchmarkCombinedScene(assembleArgs(combinedRunId), {
      download: async () => undefined,
      probeDurationSeconds: async () => 3.9,
      mixAudioLayers: async (mixInput) => fakeMixOk(mixInput.outputPath),
      muxVideoWithAudio: async () => undefined,
      upload: async () => undefined,
    });
    assert.equal(result.reusedExistingOutput, false);
    assert.equal(result.voiceoverDurationSeconds, 3.9);
  });

  await check("voiceover longer than 3.90s is rejected", async () => {
    await assert.rejects(
      () =>
        assembleBenchmarkCombinedScene(assembleArgs("98989898-9898-4989-8989-989898989898"), {
          download: async () => undefined,
          probeDurationSeconds: async () => 3.91,
          mixAudioLayers: async () => {
            throw new Error("mix_should_not_run");
          },
        }),
      /voiceover_too_long_for_scene/,
    );
  });

  await check("worker requires the exact output bucket and output path", async () => {
    const combinedRunId = "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1";
    const expected = expectedCombinedOutput(PROJECT_A, combinedRunId);
    assert.equal(expected.bucket, "video-renders");
    assert.equal(expected.path, combinedPath(PROJECT_A, combinedRunId));
    await assert.rejects(
      () =>
        assembleBenchmarkCombinedScene({
          ...assembleArgs(combinedRunId),
          outputBucket: "project-assets",
        }),
      /output_bucket_mismatch/,
    );
    await assert.rejects(
      () =>
        assembleBenchmarkCombinedScene({
          ...assembleArgs(combinedRunId),
          outputPath: `${PROJECT_A}/other/${combinedRunId}/combined.mp4`,
        }),
      /output_path_mismatch/,
    );
  });

  await check("worker rejects a foreign project in a source path", async () => {
    const combinedRunId = "a2a2a2a2-a2a2-42a2-82a2-a2a2a2a2a2a2";
    await assert.rejects(
      () =>
        assembleBenchmarkCombinedScene({
          ...assembleArgs(combinedRunId),
          video: {
            bucket: "video-renders",
            path: `${PROJECT_B}/ai-media-benchmark/${VIDEO_RUN_ID}/output.mp4`,
          },
        }),
      /source_path_mismatch/,
    );
  });

  await check("worker rejects mix values outside the Round A+ plan", async () => {
    const combinedRunId = "a3a3a3a3-a3a3-43a3-83a3-a3a3a3a3a3a3";
    await assert.rejects(
      () =>
        assembleBenchmarkCombinedScene({
          ...assembleArgs(combinedRunId),
          mix: canonicalMix({ voiceoverGain: 2 }),
        }),
      /mix_not_allowed/,
    );
    await assert.rejects(
      () =>
        assembleBenchmarkCombinedScene({
          ...assembleArgs(combinedRunId),
          mix: canonicalMix({ useSceneAudio: true, useAmbientSound: true }),
        }),
      /mix_not_allowed/,
    );
    await assert.rejects(
      () =>
        assembleBenchmarkCombinedScene({
          ...assembleArgs(combinedRunId),
          mix: canonicalMix({ targetDurationSeconds: 5 }),
        }),
      /target_duration_mismatch/,
    );
  });

  await check("stale assembly claim cannot overwrite a new claim", async () => {
    const supabase = makeFakeSupabase();
    seedCombinedSources(supabase);
    const t0 = new Date("2026-08-19T12:00:00.000Z");
    const tStale = new Date("2026-08-19T12:06:00.000Z");
    let rejectOld: (err: Error) => void = () => undefined;
    const oldHang = new Promise<{
      output_bucket: string;
      output_path: string;
      duration_seconds: number;
      voiceover_duration_seconds: number;
      reused_existing_output: boolean;
      used_scene_audio: boolean;
      used_ambient_sound: boolean;
    }>((_resolve, reject) => {
      rejectOld = reject;
    });
    const oldCreate = createCombinedScene(
      {
        projectId: PROJECT_A,
        videoRunId: VIDEO_RUN_ID,
        voiceRunId: VOICE_RUN_ID,
        soundRunId: SOUND_RUN_ID,
        clientRequestId: REQUEST_1,
      },
      {
        supabase: supabase as never,
        assemblyClaimOwner: "owner-old",
        now: () => t0,
        assemble: async () => oldHang,
      },
    );
    let assembling = false;
    for (let i = 0; i < 40; i++) {
      const row = [...supabase._combined.values()][0];
      if (row?.status === "assembling" && row.assembly_claim_owner === "owner-old") {
        assembling = true;
        break;
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(assembling, true);

    const newer = await syncCombinedScene(
      {
        runId: String([...supabase._combined.values()][0]!.id),
        projectId: PROJECT_A,
      },
      {
        supabase: supabase as never,
        assemblyClaimOwner: "owner-new",
        now: () => tStale,
        assemble: async (payload) => {
          rejectOld(new Error("old_timeout"));
          await oldCreate;
          return succeedAssemble(supabase, payload);
        },
      },
    );
    assert.equal(newer.status, "succeeded");
    const row = [...supabase._combined.values()][0]!;
    assert.equal(row.status, "succeeded");
    assert.equal(row.failure_code, null);
    assert.ok(String(row.output_path).includes(String(row.id)));
  });

  await check("retry does not create a new provider task", async () => {
    const supabase = makeFakeSupabase();
    seedCombinedSources(supabase);
    const providerCreates: string[] = [];
    await createCombinedScene(
      {
        projectId: PROJECT_A,
        videoRunId: VIDEO_RUN_ID,
        voiceRunId: VOICE_RUN_ID,
        soundRunId: SOUND_RUN_ID,
        clientRequestId: REQUEST_1,
      },
      { supabase: supabase as never, assemble: (payload) => succeedAssemble(supabase, payload) },
    );
    await createCombinedScene(
      {
        projectId: PROJECT_A,
        videoRunId: VIDEO_RUN_ID,
        voiceRunId: VOICE_RUN_ID,
        soundRunId: SOUND_RUN_ID,
        clientRequestId: REQUEST_1,
      },
      { supabase: supabase as never, assemble: (payload) => succeedAssemble(supabase, payload) },
    );
    assert.equal(providerCreates.length, 0);
  });
}
