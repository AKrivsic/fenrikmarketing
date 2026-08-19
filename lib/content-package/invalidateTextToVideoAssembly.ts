import { VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY } from "@/lib/text-to-video/runTextToVideoAssemblyPhase";

export function invalidateAssemblyOnSoundPlanChange(
  brief: Record<string, unknown>,
): Record<string, unknown> {
  if (!brief[VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY]) return brief;
  const next = { ...brief };
  delete next[VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY];
  return next;
}
