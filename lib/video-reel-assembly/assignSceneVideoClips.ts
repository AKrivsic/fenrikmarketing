import type { ExecuteSceneVideoPlanResult } from "@/lib/scene-video-executor/types";
import {
  normalizeSceneVideoClip,
  sceneVideoClipSchema,
} from "@/lib/video-engine/schemas/sceneVideoClipSchema";
import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import { validateDurableStorageIdentity } from "@/lib/video-engine/videoClipReadiness";
import { isSceneVideoGenerationAttemptUuid } from "@/lib/video-reel-assembly/voiceoverProvenance";
import type {
  ApplyClipResultsErr,
  ApplyClipResultsOk,
  ApplyClipResultsResult,
  SceneVideoClipAssignment,
} from "@/lib/video-reel-assembly/types";
import { buildClipReadyManifest } from "@/lib/video-reel-assembly/buildClipReadyManifest";

export function assignmentsFromExecutorResult(
  executorResult: ExecuteSceneVideoPlanResult,
): SceneVideoClipAssignment[] | ApplyClipResultsErr {
  if (executorResult.status !== "completed") {
    return {
      ok: false,
      reason: "executor_not_completed",
      detail: executorResult.status,
    };
  }
  const expectedIds = new Set(
    executorResult.scenes.map((s) => s.sceneId),
  );
  const assignments: SceneVideoClipAssignment[] = [];

  for (const scene of executorResult.scenes) {
    if (scene.outcome !== "completed" && scene.outcome !== "reused") {
      return {
        ok: false,
        reason: "executor_not_completed",
        detail: `scene ${scene.sceneId} outcome ${scene.outcome}`,
        sceneId: scene.sceneId,
      };
    }
    if (!scene.clip) {
      return {
        ok: false,
        reason: "missing_clip_for_scene",
        sceneId: scene.sceneId,
      };
    }
    if (!scene.attemptId?.trim()) {
      return {
        ok: false,
        reason: "missing_generation_attempt_id",
        sceneId: scene.sceneId,
      };
    }
    if (!isSceneVideoGenerationAttemptUuid(scene.attemptId)) {
      return {
        ok: false,
        reason: "invalid_generation_attempt_uuid",
        sceneId: scene.sceneId,
      };
    }
    const parsed = sceneVideoClipSchema.safeParse(scene.clip);
    if (!parsed.success) {
      return {
        ok: false,
        reason: "invalid_clip",
        sceneId: scene.sceneId,
      };
    }
    const clip = parsed.data;
    if (
      clip.generation_attempt_id &&
      clip.generation_attempt_id !== scene.attemptId
    ) {
      return {
        ok: false,
        reason: "generation_attempt_id_mismatch",
        sceneId: scene.sceneId,
      };
    }
    assignments.push({
      sceneId: scene.sceneId,
      generationAttemptId: scene.attemptId,
      clip: {
        ...clip,
        generation_attempt_id: scene.attemptId,
      },
    });
  }

  if (assignments.length !== expectedIds.size) {
    return {
      ok: false,
      reason: "scene_count_mismatch",
      detail: `assignments ${assignments.length} scenes ${expectedIds.size}`,
    };
  }

  return assignments;
}

export function assignSceneVideoClips(args: {
  renderSpec: RenderSpecOutput;
  assignments: SceneVideoClipAssignment[];
  voiceoverText: string;
  voiceoverSha256: string;
  subtitlesBurnInRequested: boolean;
  music?: import("@/lib/video-reel-assembly/clipReadyManifestSchema").ManifestAudioBed;
  ambient?: import("@/lib/video-reel-assembly/clipReadyManifestSchema").ManifestAudioBed;
}): ApplyClipResultsResult {
  const sceneIds = args.renderSpec.scenes.map((s) => s.id);
  const uniqueSceneIds = new Set(sceneIds);
  if (uniqueSceneIds.size !== sceneIds.length) {
    return {
      ok: false,
      reason: "duplicate_scene_id",
      detail: "render_spec contains duplicate scene ids",
    };
  }

  const byScene = new Map<string, SceneVideoClipAssignment>();
  for (const assignment of args.assignments) {
    if (byScene.has(assignment.sceneId)) {
      return {
        ok: false,
        reason: "duplicate_scene_id",
        sceneId: assignment.sceneId,
      };
    }
    if (!uniqueSceneIds.has(assignment.sceneId)) {
      return {
        ok: false,
        reason: "extra_clip_for_unknown_scene",
        sceneId: assignment.sceneId,
      };
    }
    if (!assignment.generationAttemptId?.trim()) {
      return {
        ok: false,
        reason: "missing_generation_attempt_id",
        sceneId: assignment.sceneId,
      };
    }
    if (!isSceneVideoGenerationAttemptUuid(assignment.generationAttemptId)) {
      return {
        ok: false,
        reason: "invalid_generation_attempt_uuid",
        sceneId: assignment.sceneId,
      };
    }
    const clip = normalizeSceneVideoClip(assignment.clip);
    if (!clip) {
      return {
        ok: false,
        reason: "invalid_clip",
        sceneId: assignment.sceneId,
      };
    }
    const identity = validateDurableStorageIdentity(clip.bucket, clip.path);
    if (!identity.ok) {
      return {
        ok: false,
        reason: "invalid_storage_identity",
        sceneId: assignment.sceneId,
        detail: identity.issue,
      };
    }
    if (
      clip.generation_attempt_id &&
      clip.generation_attempt_id !== assignment.generationAttemptId
    ) {
      return {
        ok: false,
        reason: "generation_attempt_id_mismatch",
        sceneId: assignment.sceneId,
      };
    }
    byScene.set(assignment.sceneId, {
      sceneId: assignment.sceneId,
      generationAttemptId: assignment.generationAttemptId,
      clip: {
        ...clip,
        generation_attempt_id: assignment.generationAttemptId,
      },
    });
  }

  for (const id of sceneIds) {
    if (!byScene.has(id)) {
      return {
        ok: false,
        reason: "missing_clip_for_scene",
        sceneId: id,
      };
    }
  }

  if (byScene.size !== sceneIds.length) {
    return {
      ok: false,
      reason: "scene_count_mismatch",
    };
  }

  const orderedAssignments = sceneIds.map((id) => byScene.get(id)!);
  try {
    const manifest = buildClipReadyManifest({
      renderSpec: args.renderSpec,
      assignments: orderedAssignments,
      voiceoverText: args.voiceoverText,
      voiceoverSha256: args.voiceoverSha256,
      subtitlesBurnInRequested: args.subtitlesBurnInRequested,
      music: args.music ?? null,
      ambient: args.ambient ?? null,
    });
    return {
      ok: true,
      manifest,
      assignments: orderedAssignments,
    };
  } catch (err) {
    return {
      ok: false,
      reason: "manifest_invalid",
      detail: err instanceof Error ? err.message.slice(0, 500) : String(err),
    };
  }
}

export function applyExecutorClipResults(args: {
  renderSpec: RenderSpecOutput;
  executorResult: ExecuteSceneVideoPlanResult;
  voiceoverText: string;
  voiceoverSha256: string;
  subtitlesBurnInRequested: boolean;
  music?: import("@/lib/video-reel-assembly/clipReadyManifestSchema").ManifestAudioBed;
  ambient?: import("@/lib/video-reel-assembly/clipReadyManifestSchema").ManifestAudioBed;
}): ApplyClipResultsResult {
  const extracted = assignmentsFromExecutorResult(args.executorResult);
  if (!Array.isArray(extracted)) {
    return extracted;
  }
  return assignSceneVideoClips({
    renderSpec: args.renderSpec,
    assignments: extracted,
    voiceoverText: args.voiceoverText,
    voiceoverSha256: args.voiceoverSha256,
    subtitlesBurnInRequested: args.subtitlesBurnInRequested,
    music: args.music,
    ambient: args.ambient,
  });
}

export type { ApplyClipResultsOk };
