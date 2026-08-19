import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import type { TextToVideoRunwayExecutionPlan } from "@/lib/text-to-video/runwayExecutionPlan";
import type { SceneVideoClipAssignment } from "@/lib/video-reel-assembly/types";
import { STORAGE_BUCKETS } from "@/lib/api/storage";
import { createHash } from "node:crypto";

export const TEXT_TO_VIDEO_TRIM_CONTRACT_VERSION = 1 as const;

export function buildTextToVideoRenderSpecOutput(args: {
  executionPlan: TextToVideoRunwayExecutionPlan;
  voiceoverDurationSeconds: number;
  clipRefs: Array<{ sceneId: string; bucket: string; path: string; attemptId: string }>;
}): RenderSpecOutput {
  return {
    version: 1,
    duration_seconds: args.voiceoverDurationSeconds,
    scenes: args.executionPlan.items.map((item, index) => {
      const ref = args.clipRefs[index]!;
      return {
        id: item.sceneId,
        image_prompt: item.providerPrompt.slice(0, 200),
        image_bucket: ref.bucket,
        image_path: ref.path,
        duration_seconds: item.requiredTrimSeconds,
        transition_in: index === 0 ? "none" : "fade",
        video_clip: {
          bucket: ref.bucket,
          path: ref.path,
          provider: "runway",
          model: item.model,
          duration_seconds: item.requiredTrimSeconds,
          generation_attempt_id: ref.attemptId,
        },
      };
    }),
    metadata: { package_video_mode: "text_to_video" },
  };
}

export function buildTextToVideoClipAssignments(
  clipRefs: Array<{
    sceneId: string;
    bucket: string;
    path: string;
    attemptId: string;
    duration: number;
  }>,
): SceneVideoClipAssignment[] {
  return clipRefs.map((ref) => ({
    sceneId: ref.sceneId,
    generationAttemptId: ref.attemptId,
    clip: {
      bucket: ref.bucket,
      path: ref.path,
      provider: "runway",
      model: "gen4.5",
      duration_seconds: ref.duration,
      generation_attempt_id: ref.attemptId,
    },
  }));
}

export function buildTextToVideoTrimmedClipPath(args: {
  projectId: string;
  videoJobId: string;
  sceneId: string;
  executionFingerprint: string;
  requestFingerprint: string;
  requiredTrimSeconds: number;
}): string {
  const key = createHash("sha256")
    .update(
      [
        args.executionFingerprint,
        args.requestFingerprint,
        String(args.requiredTrimSeconds),
        String(TEXT_TO_VIDEO_TRIM_CONTRACT_VERSION),
      ].join("|"),
      "utf8",
    )
    .digest("hex")
    .slice(0, 20);
  return `${args.projectId}/video/${args.videoJobId}/t2v-trim/v${TEXT_TO_VIDEO_TRIM_CONTRACT_VERSION}/${args.sceneId}/${key}.mp4`;
}

export const TEXT_TO_VIDEO_TRIM_BUCKET = STORAGE_BUCKETS.videoRenders;
