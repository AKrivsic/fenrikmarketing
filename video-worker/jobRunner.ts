import { join } from "node:path";
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
import { writeSrtFile } from "@/video-worker/services/subtitles";
import { renderMp4, generateThumbnail } from "@/video-worker/services/ffmpeg";
import { uploadVideoArtifact } from "@/video-worker/services/storage";
import { sendVideoCallback } from "@/video-worker/services/callback";

const DEFAULT_SCENE_DURATION_SECONDS = 10;

function workerTempDir(): string {
  return (
    process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp")
  );
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

// Turns a job's free-form `input` into a RenderSpec. Prefers a payload that
// already matches renderSchema; otherwise assembles a fallback spec from the
// known content-package fields (voiceover_text, subtitles, image_prompts, or
// concept/script).
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

  const scenes: Scene[] = scenePrompts.map((prompt, index) => ({
    id: `scene-${index + 1}`,
    image_prompt: prompt,
    duration_seconds: DEFAULT_SCENE_DURATION_SECONDS,
  }));

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

  try {
    const spec = buildRenderSpec(payload.input);
    const dir = workerTempDir();

    const voiceover = await generateVoiceover({ text: spec.voiceover_text });

    const images = await generateSceneImages({
      scenes: spec.scenes,
      projectId: payload.project_id,
      videoJobId: payload.video_job_id,
    });

    const { srtPath } = await writeSrtFile({
      subtitles: spec.subtitles,
      voiceoverText: spec.voiceover_text,
      durationSeconds: totalDuration(spec),
    });

    const mp4OutputPath = join(dir, `output-${payload.video_job_id}.mp4`);
    const { mp4Path } = await renderMp4({
      images,
      audioPath: voiceover.audioPath,
      srtPath,
      outputPath: mp4OutputPath,
      durationSeconds: spec.duration_seconds,
    });

    const thumbnailOutputPath = join(
      dir,
      `thumbnail-${payload.video_job_id}.png`,
    );
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
  }
}
