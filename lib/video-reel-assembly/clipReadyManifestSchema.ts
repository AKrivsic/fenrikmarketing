import { z } from "zod";
import {
  persistedSceneSchema,
  renderSpecOutputSchema,
} from "@/lib/video-engine/schemas/renderSchema";
import { sceneVideoClipSchema } from "@/lib/video-engine/schemas/sceneVideoClipSchema";
import { validateDurableStorageIdentity } from "@/lib/video-engine/videoClipReadiness";
import { isSceneVideoGenerationAttemptUuid } from "@/lib/video-reel-assembly/voiceoverProvenance";

export const clipReadyVideoClipSchema = sceneVideoClipSchema.extend({
  generation_attempt_id: z
    .string()
    .min(1)
    .refine(isSceneVideoGenerationAttemptUuid, {
      message: "generation_attempt_id_must_be_uuid",
    }),
});

export type ClipReadyVideoClip = z.infer<typeof clipReadyVideoClipSchema>;

export const clipReadySceneSchema = persistedSceneSchema.extend({
  video_clip: clipReadyVideoClipSchema,
});

export type ClipReadyScene = z.infer<typeof clipReadySceneSchema>;

export const manifestAudioBedSchema = z
  .object({
    bucket: z.string().min(1),
    path: z.string().min(1),
    gain: z.number().finite().optional(),
    loop: z.boolean().optional(),
    fadeInSeconds: z.number().finite().nonnegative().optional(),
    fadeOutSeconds: z.number().finite().nonnegative().optional(),
  })
  .nullable();

export type ManifestAudioBed = z.infer<typeof manifestAudioBedSchema>;

export const clipAssignmentRecordSchema = z.object({
  sceneId: z.string().min(1),
  generationAttemptId: z
    .string()
    .min(1)
    .refine(isSceneVideoGenerationAttemptUuid, {
      message: "generation_attempt_id_must_be_uuid",
    }),
  clipBucket: z.string().min(1),
  clipPath: z.string().min(1),
});

export const clipReadyAssemblyMetaSchema = z.object({
  voiceover_text: z.string().min(1),
  /** SHA-256 hex of the voiceover bytes bound to this manifest (not a file path). */
  voiceover_sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "voiceover_sha256_invalid"),
  /**
   * When true, assembly must burn in subtitles from a valid local SRT.
   * When false, assembly must not pass an SRT to the orchestrator.
   */
  subtitles_burn_in_requested: z.boolean(),
  music: manifestAudioBedSchema.optional().default(null),
  ambient: manifestAudioBedSchema.optional().default(null),
  clipAssignments: z.array(clipAssignmentRecordSchema).min(1),
});

const clipReadyManifestBaseSchema = z.object({
  version: z.literal(1),
  scenes: z.array(clipReadySceneSchema).min(1),
  duration_seconds: z.number().positive().optional(),
  subtitle_timing: renderSpecOutputSchema.shape.subtitle_timing,
  metadata: renderSpecOutputSchema.shape.metadata,
  assembly: clipReadyAssemblyMetaSchema,
});

function refineClipReadyManifestIntegrity(
  manifest: z.infer<typeof clipReadyManifestBaseSchema>,
  ctx: z.RefinementCtx,
): void {
  const sceneIds = manifest.scenes.map((s) => s.id);
  const uniqueSceneIds = new Set(sceneIds);
  if (uniqueSceneIds.size !== sceneIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "duplicate_scene_id",
      path: ["scenes"],
    });
  }

  const assignments = manifest.assembly.clipAssignments;
  const assignmentSceneIds = assignments.map((a) => a.sceneId);
  const uniqueAssignmentIds = new Set(assignmentSceneIds);
  if (uniqueAssignmentIds.size !== assignmentSceneIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "duplicate_assignment_scene_id",
      path: ["assembly", "clipAssignments"],
    });
  }

  if (assignments.length !== manifest.scenes.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "assignment_count_mismatch",
      path: ["assembly", "clipAssignments"],
    });
  }

  const sceneById = new Map(manifest.scenes.map((s) => [s.id, s]));

  for (const [i, assignment] of assignments.entries()) {
    const scene = sceneById.get(assignment.sceneId);
    if (!scene) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "assignment_unknown_scene",
        path: ["assembly", "clipAssignments", i, "sceneId"],
      });
      continue;
    }
    const clip = scene.video_clip;
    if (assignment.clipBucket !== clip.bucket || assignment.clipPath !== clip.path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "assignment_clip_path_mismatch",
        path: ["assembly", "clipAssignments", i],
      });
    }
    if (assignment.generationAttemptId !== clip.generation_attempt_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "assignment_attempt_id_mismatch",
        path: ["assembly", "clipAssignments", i, "generationAttemptId"],
      });
    }
    const storage = validateDurableStorageIdentity(clip.bucket, clip.path);
    if (!storage.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `invalid_storage_identity:${storage.issue}`,
        path: ["scenes"],
      });
    }
  }

  for (const scene of manifest.scenes) {
    if (!sceneById.has(scene.id)) continue;
    if (!assignments.some((a) => a.sceneId === scene.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "missing_assignment_for_scene",
        path: ["assembly", "clipAssignments"],
      });
    }
  }

  for (const bed of [manifest.assembly.music, manifest.assembly.ambient]) {
    if (!bed) continue;
    const id = validateDurableStorageIdentity(bed.bucket, bed.path);
    if (!id.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `invalid_audio_bed_storage:${id.issue}`,
        path: ["assembly"],
      });
    }
  }
}

/** Derived clip-ready render spec + assembly provenance (Step 10B strict). */
export const clipReadyRenderManifestSchema = clipReadyManifestBaseSchema.superRefine(
  refineClipReadyManifestIntegrity,
);

export type ClipReadyRenderManifest = z.infer<
  typeof clipReadyRenderManifestSchema
>;

export function parseClipReadyRenderManifest(
  value: unknown,
): ClipReadyRenderManifest | null {
  const parsed = clipReadyRenderManifestSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function validateClipReadyRenderManifest(
  value: unknown,
): { ok: true; data: ClipReadyRenderManifest } | { ok: false; error: z.ZodError } {
  const parsed = clipReadyRenderManifestSchema.safeParse(value);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, error: parsed.error };
}
