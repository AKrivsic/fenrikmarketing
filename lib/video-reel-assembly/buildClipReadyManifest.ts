import {
  clipReadyRenderManifestSchema,
  type ClipReadyRenderManifest,
  type ManifestAudioBed,
} from "@/lib/video-reel-assembly/clipReadyManifestSchema";
import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import type { SceneVideoClipAssignment } from "@/lib/video-reel-assembly/types";

/**
 * Builds a new clip-ready manifest. Does not mutate `renderSpec`.
 * Output is parsed through strict clip-ready schema (cross-field integrity).
 */
export function buildClipReadyManifest(args: {
  renderSpec: RenderSpecOutput;
  assignments: SceneVideoClipAssignment[];
  voiceoverText: string;
  voiceoverSha256: string;
  subtitlesBurnInRequested: boolean;
  music?: ManifestAudioBed;
  ambient?: ManifestAudioBed;
}): ClipReadyRenderManifest {
  const assignmentByScene = new Map(
    args.assignments.map((a) => [a.sceneId, a]),
  );

  const scenes = args.renderSpec.scenes.map((scene) => {
    const assignment = assignmentByScene.get(scene.id);
    if (!assignment) {
      throw new Error(`internal: missing assignment for ${scene.id}`);
    }
    return {
      ...scene,
      video_clip: {
        ...assignment.clip,
        generation_attempt_id: assignment.generationAttemptId,
      },
    };
  });

  const draft = {
    version: 1 as const,
    scenes,
    duration_seconds: args.renderSpec.duration_seconds,
    subtitle_timing: args.renderSpec.subtitle_timing,
    metadata: args.renderSpec.metadata
      ? structuredClone(args.renderSpec.metadata)
      : undefined,
    assembly: {
      voiceover_text: args.voiceoverText,
      voiceover_sha256: args.voiceoverSha256.toLowerCase(),
      subtitles_burn_in_requested: args.subtitlesBurnInRequested,
      music: args.music ?? null,
      ambient: args.ambient ?? null,
      clipAssignments: args.assignments.map((a) => ({
        sceneId: a.sceneId,
        generationAttemptId: a.generationAttemptId,
        clipBucket: a.clip.bucket,
        clipPath: a.clip.path,
      })),
    },
  };

  return clipReadyRenderManifestSchema.parse(draft);
}
