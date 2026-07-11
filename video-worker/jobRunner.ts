import { join } from "node:path";
import { rm } from "node:fs/promises";
import {
  renderSchema,
  type RenderSpec,
  type RenderSpecOutput,
  type PersistedScene,
} from "@/lib/video-engine/schemas/renderSchema";
import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import {
  workerPayloadSchema,
  type WorkerPayload,
} from "@/lib/video-engine/schemas/workerPayloadSchema";
import type { WorkerCallback } from "@/lib/video-engine/schemas/workerCallbackSchema";
import {
  generateValidatedVoiceover,
  TtsTailValidationError,
} from "@/video-worker/services/ttsTailValidation";
import { resolveTtsOptionsFromJobInput } from "@/lib/voice/resolveTtsOptions";
import {
  generateSceneImages,
  type SceneImage,
} from "@/video-worker/services/images";
import { ensureSceneRendererRegistry } from "@/video-worker/services/sceneRendererRegistry";
import { assertWorkerScenesRenderable } from "@/lib/scene-types/assertWorkerScenes";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";
import { IMAGE_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/imageSceneRenderer";
import { writeSrtFile } from "@/video-worker/services/subtitles";
import {
  buildPhraseCues,
  buildPhraseCuesFromWords,
  computeAlignmentRatio,
} from "@/video-worker/services/phraseCaptions";
import {
  normalizeLanguageHint,
} from "@/video-worker/services/wordTimestamps";
import {
  renderMp4,
  generateThumbnail,
  type RenderBeat,
} from "@/video-worker/services/ffmpeg";
import { uploadVideoArtifact } from "@/video-worker/services/storage";
import { sendVideoCallback } from "@/video-worker/services/callback";
import {
  buildStoryboard,
  MAX_VIDEO_SCENE_STILLS,
  SHORT_PROFILE,
  TAIL_BUFFER_SECONDS,
  type StoredSemanticMotionBeat,
} from "@/lib/video-engine/storyboard";
import { parseStoredSemanticMotionFromJobInput } from "@/lib/video-engine/semanticMotion/storedSemanticMotionJobInput";
import { parseVisualProfile } from "@/lib/visual-profile/visualProfile";
import { effectiveSceneType } from "@/lib/scene-types/sceneType";
import {
  MAX_SCENE_POOL,
  mergeGeneratedAndAssetScenes,
} from "@/lib/video-engine/scenePool";

const DEFAULT_SCENE_DURATION_SECONDS = 4;

function workerTempDir(): string {
  return (
    process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp")
  );
}

// Task 3 — remove a job's temp files (voiceover MP3, scene PNGs, SRT, output
// MP4, thumbnail). Best-effort and never throws: a cleanup failure must not
// turn a successful render into a failure, nor mask the real error of a failed
// one. Missing files are ignored; any other failure is logged as a warning.
async function cleanupTempFiles(
  videoJobId: string,
  paths: Iterable<string>,
): Promise<void> {
  for (const path of new Set(paths)) {
    if (!path) continue;
    try {
      await rm(path, { force: true });
    } catch (err) {
      console.warn(
        "[video-worker] temp cleanup failed",
        JSON.stringify({
          video_job_id: videoJobId,
          path,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

// One reusable still already in Storage (an image-type asset the package used).
interface AssetImageRef {
  bucket: string;
  path: string;
  title?: string;
  video_usage?: string;
}

// Attention First V1 — the creative mode's ordered narrative beats, stamped onto
// the job input by the generation workflow. Used to drive the storyboard role
// arc. Returns undefined when absent so the storyboard falls back to a neutral
// arc (fully backward compatible with older queued jobs).
function parseModeBeats(input: Record<string, unknown>): string[] | undefined {
  const raw = input["creative_mode_beats"];
  if (!Array.isArray(raw)) return undefined;
  const beats = raw.filter(
    (b): b is string => typeof b === "string" && b.trim().length > 0,
  );
  return beats.length > 0 ? beats : undefined;
}

function parseAssetImages(input: Record<string, unknown>): AssetImageRef[] {
  const raw = input["asset_images"];
  if (!Array.isArray(raw)) return [];
  const refs: AssetImageRef[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const bucket = asString(record["bucket"]);
    const path = asString(record["path"]);
    if (bucket && path) {
      refs.push({
        bucket,
        path,
        title: asString(record["title"]),
        video_usage: asString(record["video_usage"]),
      });
    }
  }
  return refs;
}

// Turns a job's free-form `input` into a RenderSpec. Prefers a payload that
// already matches renderSchema; otherwise assembles a fallback spec from the
// known content-package fields (voiceover_text, subtitles, image_prompts,
// asset_images, or concept/script).
//
// Task 6 — relevant image assets the package referenced are added to the still
// pool as REUSED stills (image_bucket/image_path), so the storyboard can show
// real screenshots/dashboards/references without any new image generation.
export function buildRenderSpec(input: Record<string, unknown>): RenderSpec {
  const direct = renderSchema.safeParse(input);
  if (direct.success) return direct.data;

  const voiceoverText =
    asString(input["voiceover_text"]) ??
    asString(input["script"]) ??
    asString(input["concept"]);
  if (!voiceoverText) {
    throw new Error(
      "cannot build render spec: missing voiceover_text/script/concept",
    );
  }

  const subtitles = asString(input["subtitles"]);

  const prompts = Array.isArray(input["image_prompts"])
    ? (input["image_prompts"] as unknown[]).filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0,
      )
    : [];

  const scenePrompts =
    prompts.length > 0
      ? prompts
      : [asString(input["concept"]) ?? asString(input["script"]) ?? voiceoverText];

  // MVP scene/image cost cap — a NEW render generates exactly one image per
  // generated scene, so the generated stills are capped to MAX_VIDEO_SCENE_STILLS
  // BEFORE image generation (1 video = ≤5 image-gen calls). Reused asset stills
  // (below) cost nothing extra and are NOT bound by this cap. The reuse path
  // (renderSchema.safeParse above) returns early with the legacy input scenes,
  // so this never re-truncates a language variant's stored render_spec.scenes.
  const generatedScenes: Scene[] = scenePrompts
    .slice(0, MAX_VIDEO_SCENE_STILLS)
    .map((prompt, index) => ({
      id: `scene-${index + 1}`,
      image_prompt: prompt,
      duration_seconds: DEFAULT_SCENE_DURATION_SECONDS,
    }));

  const assetScenes: Scene[] = parseAssetImages(input).map((ref, index) => ({
    id: `asset-${index + 1}`,
    image_prompt: ref.title && ref.title.length > 0 ? ref.title : "asset image",
    duration_seconds: DEFAULT_SCENE_DURATION_SECONDS,
    image_bucket: ref.bucket,
    image_path: ref.path,
    ...(ref.video_usage ? { video_usage: ref.video_usage } : {}),
  }));

  const scenes = mergeGeneratedAndAssetScenes(
    generatedScenes,
    assetScenes,
    MAX_SCENE_POOL,
  );

  return {
    scenes,
    voiceover_text: voiceoverText,
    ...(subtitles ? { subtitles } : {}),
  };
}

function totalDuration(spec: RenderSpec): number {
  if (spec.duration_seconds && spec.duration_seconds > 0) {
    return spec.duration_seconds;
  }
  return spec.scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);
}

// Persists every scene still to Storage (reused stills already have a durable
// path and are not re-uploaded) and assembles the resolved render_spec that is
// returned in the callback. The result lets a later render reuse the exact same
// visuals by passing these scenes back as input.
async function buildRenderSpecOutput(args: {
  spec: RenderSpec;
  images: SceneImage[];
  projectId: string;
  videoJobId: string;
  semanticMotionBeats?: {
    beat_id: string;
    scene_id: string;
    motion_intent: string;
    motion_primitive: string;
    motion_intensity: string;
    motion_version: string;
  }[];
}): Promise<RenderSpecOutput> {
  const { spec, images, projectId, videoJobId, semanticMotionBeats } = args;
  const imageBySceneId = new Map(images.map((img) => [img.sceneId, img]));

  const scenes: PersistedScene[] = [];
  for (const scene of spec.scenes) {
    const image = imageBySceneId.get(scene.id);
    if (!image) {
      throw new Error(`buildRenderSpecOutput: missing image for scene ${scene.id}`);
    }

    let bucket: string;
    let path: string;
    if (image.reusedBucket && image.reusedPath) {
      // Reused still: keep the durable reference it already had.
      bucket = image.reusedBucket;
      path = image.reusedPath;
    } else {
      // Freshly generated still: upload it so the next render can reuse it.
      const upload = await uploadVideoArtifact({
        projectId,
        videoJobId,
        artifactType: "png",
        localPath: image.imagePath,
        filename: `scene-${scene.id}.png`,
      });
      bucket = upload.bucket;
      path = upload.storagePath;
    }

    scenes.push({
      id: scene.id,
      image_prompt: scene.image_prompt,
      image_bucket: bucket,
      image_path: path,
      duration_seconds: scene.duration_seconds,
      ...(scene.video_usage ? { video_usage: scene.video_usage } : {}),
      ...(scene.asset_id ? { asset_id: scene.asset_id } : {}),
      type: scene.type ?? DEFAULT_SCENE_TYPE,
      ...(scene.payload_snapshot ? { payload_snapshot: scene.payload_snapshot } : {}),
      renderer_version: scene.renderer_version ?? IMAGE_SCENE_RENDERER_VERSION,
    });
  }

  return {
    version: 1,
    scenes,
    ...(spec.duration_seconds ? { duration_seconds: spec.duration_seconds } : {}),
    metadata: {
      rendered_at: new Date().toISOString(),
      ...(semanticMotionBeats && semanticMotionBeats.length > 0
        ? {
            semantic_motion: {
              version: semanticMotionBeats[0]?.motion_version,
              beats: semanticMotionBeats,
            },
          }
        : {}),
    },
  };
}

// Full MVP pipeline for one render job. Any failure is turned into a failed
// callback so the video_jobs row is closed out instead of left "processing".
export async function runVideoJob(rawPayload: WorkerPayload): Promise<void> {
  const payload = workerPayloadSchema.parse(rawPayload);
  const transport = {
    project_id: payload.project_id,
    content_package_id: payload.content_package_id,
  };

  console.log(
    "[video-worker] job started",
    JSON.stringify({ video_job_id: payload.video_job_id, ...transport }),
  );

  // Every temp file this job writes is tracked here as it is produced, so the
  // finally block can delete them on BOTH success and failure (Task 3). The
  // voiceover MP3 and SRT use random names, so tracking the actual paths is the
  // only reliable way to clean them up.
  const tempFiles = new Set<string>();

  try {
    const spec = buildRenderSpec(payload.input);
    ensureSceneRendererRegistry();
    assertWorkerScenesRenderable(spec.scenes, {
      projectId: payload.project_id,
      videoJobId: payload.video_job_id,
    });
    const dir = workerTempDir();

    const ttsOptions = resolveTtsOptionsFromJobInput(
      payload.input as Record<string, unknown>,
    );

    const validatedVoiceover = await generateValidatedVoiceover({
      text: spec.voiceover_text,
      language: payload.input["language"],
      voice: ttsOptions.voice,
      ...(ttsOptions.instructions
        ? { instructions: ttsOptions.instructions }
        : {}),
    });
    const voiceover = validatedVoiceover.voiceover;
    tempFiles.add(voiceover.audioPath);
    const ttsTailDebug = validatedVoiceover.meta;

    const images = await generateSceneImages({
      scenes: spec.scenes,
      projectId: payload.project_id,
      videoJobId: payload.video_job_id,
      visualProfile:
        typeof payload.input["visual_profile"] === "string"
          ? payload.input["visual_profile"]
          : undefined,
      visualProfileVersion:
        typeof payload.input["visual_profile_version"] === "string"
          ? payload.input["visual_profile_version"]
          : undefined,
    });
    for (const image of images) tempFiles.add(image.imagePath);

    // Video Quality V2 — build the beat timeline (8–15 short moving beats) from
    // the narration + the still pool, seeded by the package hook. Content
    // Quality Sprint (Video Sync): pass the REAL measured voiceover duration so
    // the beat + subtitle timeline is audio-driven (audio = master clock), not a
    // words-per-second estimate. When the probe failed, durationSeconds is
    // undefined and the builder falls back to the legacy estimate.
    const explicitScenePlan =
      payload.input["explicit_scene_plan"] === true ||
      (Array.isArray(payload.input["scenes"]) &&
        renderSchema.safeParse({
          scenes: payload.input["scenes"],
          voiceover_text: spec.voiceover_text,
        }).success);

    const visualProfile = parseVisualProfile(
      typeof payload.input["visual_profile"] === "string"
        ? payload.input["visual_profile"]
        : "",
    );

    const storyboard = buildStoryboard({
      voiceoverText: spec.voiceover_text,
      sceneIds: spec.scenes.map((scene) => scene.id),
      hook: asString(payload.input["hook"]) ?? null,
      audioDurationSeconds: voiceover.durationSeconds,
      modeBeats: parseModeBeats(payload.input),
      tailBufferSeconds: TAIL_BUFFER_SECONDS,
      explicitSceneOrder: explicitScenePlan,
      scenes: spec.scenes.map((scene) => ({
        id: scene.id,
        type: effectiveSceneType(scene.type, "IMAGE"),
      })),
      visualProfile,
      semanticMotion: payload.input["semantic_motion"] !== false,
      storedSemanticMotion: parseStoredSemanticMotionFromJobInput(payload.input),
    });

    // Subtitle Quality Sprint — phrase captions. The narration is segmented into
    // 2–5 word phrases and the audio-master timeline is distributed across them
    // proportionally (with a minimum on-screen floor), instead of one
    // full-sentence cue per beat. The storyboard beats / video duration are
    // unchanged; only the burned subtitles change. This proportional result is
    // also the FALLBACK for word-timestamp alignment below.
    // Subtitle Tail Timing Fix V1 — distribute phrases over the SPEECH window
    // (the measured voiceover), NOT the padded video window (speech + tail). The
    // renderer holds the final frame for TAIL_BUFFER_SECONDS of silence; without
    // this separation the proportional distribution slides the last spoken phrase
    // into that silent tail and it reads as "missing".
    const proportional = buildPhraseCues({
      beats: storyboard,
      transitionSeconds: SHORT_PROFILE.transitionSeconds,
      speechDurationSeconds: voiceover.durationSeconds,
      tailBufferSeconds: TAIL_BUFFER_SECONDS,
    });
    let cues = proportional.cues;
    const totalSeconds = proportional.totalSeconds;

    // Subtitle Reliability V1 (Part G) — observability for the subtitle stage.
    const languageHint =
      normalizeLanguageHint(payload.input["language"]) ?? null;
    let subtitleSource: "whisper" | "proportional" = "proportional";
    let matchRatio: number | null = null;
    let whisperWordCount: number | null = null;
    let languageDetected: string | null = null;

    // Word Timestamp Subtitles V1 — re-time the SAME phrase captions to the real
    // spoken audio. We transcribe the voiceover MP3 with whisper-1 (word
    // timestamps), passing the job's language hint when available (CZ/EN/DE/FR/
    // ES/IT). Best-effort: on a timeout, API error, empty timestamps, or a
    // low-confidence alignment we keep the proportional cues. Phrase STYLE is
    // unchanged — only the timing SOURCE changes.
    const transcription = validatedVoiceover.transcription;
    if (transcription) {
      whisperWordCount = transcription.words.length;
      languageDetected = transcription.languageDetected ?? null;
      matchRatio = computeAlignmentRatio(
        spec.voiceover_text,
        transcription.words,
      );
      const aligned = buildPhraseCuesFromWords({
        voiceoverText: spec.voiceover_text,
        words: transcription.words,
        // Subtitle Tail Timing Fix V1 — word timestamps already live in speech
        // time; clamp the track (and any trailing interpolation) to the spoken
        // audio, never into the silent tail. totalSeconds remains as the legacy
        // fallback bound when no measured duration is available.
        speechDurationSeconds: voiceover.durationSeconds,
        totalSeconds,
      });
      if (aligned && aligned.cues.length > 0) {
        cues = aligned.cues;
        subtitleSource = "whisper";
        console.log(
          "[video-worker] subtitles aligned to whisper word timestamps",
          JSON.stringify({
            video_job_id: payload.video_job_id,
            words: transcription.words.length,
            cues: aligned.cues.length,
          }),
        );
      }
    }
    // The subtitles came from the proportional ESTIMATE (whisper failed or could
    // not be aligned), which is less precise — a yellow warning in review.
    const fallbackUsed = subtitleSource === "proportional";
    const srtLastCueEnd =
      cues.length > 0 ? cues[cues.length - 1].endSeconds : null;

    const { srtPath } = await writeSrtFile({
      cues,
      subtitles: spec.subtitles,
      voiceoverText: spec.voiceover_text,
      durationSeconds: totalSeconds || totalDuration(spec),
    });
    tempFiles.add(srtPath);

    const beats: RenderBeat[] = storyboard.map((beat) => ({
      sceneId: beat.sceneId,
      motion: beat.motion,
      transition: beat.transition,
      durationSeconds: beat.durationSeconds,
      ...(beat.motion_intensity ? { motion_intensity: beat.motion_intensity } : {}),
    }));

    const mp4OutputPath = join(dir, `output-${payload.video_job_id}.mp4`);
    tempFiles.add(mp4OutputPath);
    const { mp4Path, diagnostics: renderDiagnostics } = await renderMp4({
      images,
      beats,
      audioPath: voiceover.audioPath,
      srtPath,
      outputPath: mp4OutputPath,
      durationSeconds: spec.duration_seconds,
      // Subtitle Reliability V1 (Part A) — AUDIO is the single source of truth:
      // the renderer forces the final duration to audio + tail with an explicit
      // -t, so the video can never end before the audio.
      audioDurationSeconds: voiceover.durationSeconds,
      // Content Quality Sprint 2 — pad the audio by the tail buffer so the final
      // beat's silent hold (added in the storyboard) survives.
      tailPadSeconds: TAIL_BUFFER_SECONDS,
      profile: {
        width: SHORT_PROFILE.width,
        height: SHORT_PROFILE.height,
        fps: SHORT_PROFILE.fps,
        transitionSeconds: SHORT_PROFILE.transitionSeconds,
      },
    });

    // Subtitle Reliability V1 (Part E + G) — diagnostics persisted under
    // video_jobs.output.debug. Purely observational: assembled AFTER a
    // successful render and never able to fail one.
    const debug = {
      ...ttsTailDebug,
      subtitle_source: subtitleSource,
      match_ratio: matchRatio,
      fallback_used: fallbackUsed,
      language_hint: languageHint,
      language_detected: languageDetected,
      whisper_word_count: whisperWordCount,
      audio_duration:
        renderDiagnostics.audioDuration ?? voiceover.durationSeconds ?? null,
      video_duration: renderDiagnostics.videoDuration,
      srt_last_cue_end: srtLastCueEnd,
      duration_delta: renderDiagnostics.durationDelta,
      // Subtitle Tail Timing Fix V1 — make the speech vs subtitle vs tail windows
      // provable from the debug payload alone (no DB migration; debug JSON only).
      // subtitle_timeline_duration is the last cue end; with the fix it tracks
      // speech_duration (+ a small hold), not speech_duration + tail_buffer.
      speech_duration: voiceover.durationSeconds ?? null,
      subtitle_timeline_duration: srtLastCueEnd,
      tail_buffer_seconds: TAIL_BUFFER_SECONDS,
      // Video Duration Audit V1 — per-stage durations so the exact point any
      // truncation is introduced is provable from the debug payload alone.
      target_duration: renderDiagnostics.targetDuration,
      intermediate_video_duration: renderDiagnostics.intermediateVideoDuration,
      post_mux_duration: renderDiagnostics.postMuxDuration,
      post_subtitle_duration: renderDiagnostics.postSubtitleDuration,
      subtitle_warning: fallbackUsed,
      render_warning: renderDiagnostics.renderWarning,
      render_warnings: renderDiagnostics.renderWarnings,
    };
    console.log(
      "[video-worker] render diagnostics",
      JSON.stringify({ video_job_id: payload.video_job_id, ...debug }),
    );

    const thumbnailOutputPath = join(
      dir,
      `thumbnail-${payload.video_job_id}.png`,
    );
    tempFiles.add(thumbnailOutputPath);
    const { thumbnailPath } = await generateThumbnail({
      mp4Path,
      outputPath: thumbnailOutputPath,
    });

    const mp4Upload = await uploadVideoArtifact({
      projectId: payload.project_id,
      videoJobId: payload.video_job_id,
      artifactType: "mp4",
      localPath: mp4Path,
      filename: "output.mp4",
    });
    const thumbUpload = await uploadVideoArtifact({
      projectId: payload.project_id,
      videoJobId: payload.video_job_id,
      artifactType: "png",
      localPath: thumbnailPath,
      filename: "thumbnail.png",
    });
    const srtUpload = await uploadVideoArtifact({
      projectId: payload.project_id,
      videoJobId: payload.video_job_id,
      artifactType: "srt",
      localPath: srtPath,
      filename: "subtitles.srt",
    });

    // Persist scene stills + assemble the resolved render_spec so a later render
    // can reuse the exact same visuals without any new image generation.
    const renderSpec = await buildRenderSpecOutput({
      spec,
      images,
      projectId: payload.project_id,
      videoJobId: payload.video_job_id,
      semanticMotionBeats: storyboard.map((beat) => ({
        beat_id: beat.id,
        scene_id: beat.sceneId,
        motion_intent: beat.motion_intent ?? "EXPLAIN",
        motion_primitive: beat.motion,
        motion_intensity: beat.motion_intensity ?? "LOW",
        motion_version: beat.motion_version ?? "semantic-motion@1",
      })),
    });

    const callback: WorkerCallback = {
      video_job_id: payload.video_job_id,
      status: "completed",
      mp4_url: mp4Upload.signedUrl,
      thumbnail_url: thumbUpload.signedUrl,
      subtitle_url: srtUpload.signedUrl,
      render_spec: renderSpec,
      debug,
    };
    await sendVideoCallback(payload.callback_url, callback, transport);

    console.log(
      "[video-worker] job completed",
      JSON.stringify({ video_job_id: payload.video_job_id }),
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(
      "[video-worker] job failed",
      JSON.stringify({ video_job_id: payload.video_job_id, error: errorMessage }),
    );

    try {
      const failureDebug =
        err instanceof TtsTailValidationError
          ? {
              ...err.meta,
              tts_tail_validation_passed: false,
            }
          : undefined;
      await sendVideoCallback(
        payload.callback_url,
        {
          video_job_id: payload.video_job_id,
          status: "failed",
          error_message: errorMessage,
          ...(failureDebug ? { debug: failureDebug } : {}),
        },
        transport,
      );
    } catch (callbackErr) {
      console.error(
        "[video-worker] failed callback also failed",
        JSON.stringify({
          video_job_id: payload.video_job_id,
          error:
            callbackErr instanceof Error
              ? callbackErr.message
              : String(callbackErr),
        }),
      );
    }
  } finally {
    // Task 3 — always reclaim the job's temp files (success OR failure). The
    // durable artifacts are already in Storage by this point; these are local
    // scratch files. Cleanup is best-effort and never throws.
    await cleanupTempFiles(payload.video_job_id, tempFiles);
  }
}
