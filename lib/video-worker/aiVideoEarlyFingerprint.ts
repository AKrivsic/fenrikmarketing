import type { RenderSpec } from "@/lib/video-engine/schemas/renderSchema";
import { VIDEO_RENDER_MODE_AI_VIDEO_CLIPS } from "@/lib/video-engine/schemas/videoJobRenderMode";
import { buildSceneVideoGenerationPlanFromRenderScenes } from "@/lib/scene-video-plan";
import {
  computeAiVideoJobInputFingerprint,
  planDefaultsFromPlan,
} from "@/lib/video-worker/aiVideoCheckpointFingerprint";

/** Pre-TTS job input fingerprint from render spec (worker payload / buildRenderSpec). */
export function computeAiVideoJobInputFingerprintFromSpec(args: {
  videoJobId: string;
  spec: RenderSpec;
  subtitlesBurnInRequested: boolean;
}): string {
  const plan = buildSceneVideoGenerationPlanFromRenderScenes(args.spec.scenes);
  return computeAiVideoJobInputFingerprint({
    videoJobId: args.videoJobId,
    renderMode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    voiceoverText: args.spec.voiceover_text,
    subtitlesBurnInRequested: args.subtitlesBurnInRequested,
    spec: args.spec,
    planDefaults: planDefaultsFromPlan(plan),
  });
}
