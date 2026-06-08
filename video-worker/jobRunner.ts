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
import { generateVoiceover } from "@/video-worker/services/tts";
import {
  generateSceneImages,
  type SceneImage,
} from "@/video-worker/services/images";
import { writeSrtFile, type SubtitleCue } from "@/video-worker/services/subtitles";
import {
  renderMp4,
  generateThumbnail,
  type RenderBeat,
} from "@/video-worker/services/ffmpeg";
import { uploadVideoArtifact } from "@/video-worker/services/storage";
import { sendVideoCallback } from "@/video-worker/services/callback";
import {
  buildStoryboard,
  SHORT_PROFILE,
  type StoryboardBeat,
} from "@/lib/video-engine/storyboard";

const DEFAULT_SCENE_DURATION_SECONDS = 4;
// Cap the generated/reused still pool so a richer storyboard never inflates
// image-generation cost: many beats cycle through a handful of stills.
const MAX_SCENE_POOL = 8;

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
      refs.push({ bucket, path, title: asString(record["title"]) });
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
function buildRenderSpec(input: Record<string, unknown>): RenderSpec {
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

  const generatedScenes: Scene[] = scenePrompts.map((prompt, index) => ({
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
  }));

  // Generated stills first (the hook usually opens on a branded generated
  // image), assets appended. Pool is capped to control cost.
  const scenes = [...generatedScenes, ...assetScenes].slice(0, MAX_SCENE_POOL);

  return {
    scenes,
    voiceover_text: voiceoverText,
    ...(subtitles ? { subtitles } : {}),
  };
}

// Replicates the renderer's xfade timing so each subtitle cue lines up with the
// beat that is on screen. Returns one cue per beat plus the total timeline
// length (after transition overlaps).
function buildSubtitleTimeline(
  beats: StoryboardBeat[],
  transitionSeconds: number,
): { cues: SubtitleCue[]; totalSeconds: number } {
  if (beats.length === 0) return { cues: [], totalSeconds: 0 };

  const starts: number[] = [0];
  let cumulative = beats[0].durationSeconds;
  for (let i = 1; i < beats.length; i++) {
    const td = Math.min(transitionSeconds, beats[i].durationSeconds / 2);
    starts.push(Math.max(0, cumulative - td));
    cumulative = cumulative - td + beats[i].durationSeconds;
  }

  const cues: SubtitleCue[] = beats.map((beat, i) => ({
    startSeconds: starts[i],
    endSeconds: i + 1 < beats.length ? starts[i + 1] : cumulative,
    text: beat.text,
  }));

  return { cues, totalSeconds: cumulative };
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
}): Promise<RenderSpecOutput> {
  const { spec, images, projectId, videoJobId } = args;
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
    });
  }

  return {
    version: 1,
    scenes,
    ...(spec.duration_seconds ? { duration_seconds: spec.duration_seconds } : {}),
    metadata: { rendered_at: new Date().toISOString() },
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
    const dir = workerTempDir();

    const voiceover = await generateVoiceover({ text: spec.voiceover_text });
    tempFiles.add(voiceover.audioPath);

    const images = await generateSceneImages({
      scenes: spec.scenes,
      projectId: payload.project_id,
      videoJobId: payload.video_job_id,
    });
    for (const image of images) tempFiles.add(image.imagePath);

    // Video Quality V2 — build the beat timeline (8–15 short moving beats) from
    // the narration + the still pool, seeded by the package hook.
    const storyboard = buildStoryboard({
      voiceoverText: spec.voiceover_text,
      sceneIds: spec.scenes.map((scene) => scene.id),
      hook: asString(payload.input["hook"]) ?? null,
    });

    const { cues, totalSeconds } = buildSubtitleTimeline(
      storyboard,
      SHORT_PROFILE.transitionSeconds,
    );

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
    }));

    const mp4OutputPath = join(dir, `output-${payload.video_job_id}.mp4`);
    tempFiles.add(mp4OutputPath);
    const { mp4Path } = await renderMp4({
      images,
      beats,
      audioPath: voiceover.audioPath,
      srtPath,
      outputPath: mp4OutputPath,
      durationSeconds: spec.duration_seconds,
      profile: {
        width: SHORT_PROFILE.width,
        height: SHORT_PROFILE.height,
        fps: SHORT_PROFILE.fps,
        transitionSeconds: SHORT_PROFILE.transitionSeconds,
      },
    });

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
    });

    const callback: WorkerCallback = {
      video_job_id: payload.video_job_id,
      status: "completed",
      mp4_url: mp4Upload.signedUrl,
      thumbnail_url: thumbUpload.signedUrl,
      subtitle_url: srtUpload.signedUrl,
      render_spec: renderSpec,
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
      await sendVideoCallback(
        payload.callback_url,
        {
          video_job_id: payload.video_job_id,
          status: "failed",
          error_message: errorMessage,
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
