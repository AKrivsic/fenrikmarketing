export type {
  AssembleVideoReelInput,
  AssembleVideoReelResult,
  ApplyClipAssignmentsInput,
  ApplyExecutorClipResultsInput,
  ApplyClipResultsResult,
  ClipAssignmentFailureReason,
  PrepareVideoReelAssemblyInput,
  PrepareVideoReelAssemblyResult,
  SceneVideoClipAssignment,
  VideoReelArtifactUploadInput,
  VideoReelArtifactUploadResult,
  VideoReelArtifactUploader,
  VideoReelAssemblyBlockReason,
  VideoReelAssemblyDiagnostics,
} from "@/lib/video-reel-assembly/types";

export {
  clipReadyRenderManifestSchema,
  clipReadySceneSchema,
  clipReadyVideoClipSchema,
  parseClipReadyRenderManifest,
  validateClipReadyRenderManifest,
  type ClipReadyRenderManifest,
  type ManifestAudioBed,
} from "@/lib/video-reel-assembly/clipReadyManifestSchema";

export {
  sha256HexFile,
  isSceneVideoGenerationAttemptUuid,
} from "@/lib/video-reel-assembly/voiceoverProvenance";

export { prepareVideoReelAssembly } from "@/lib/video-reel-assembly/prepareVideoReelAssembly";
export {
  assignSceneVideoClips,
  applyExecutorClipResults,
  assignmentsFromExecutorResult,
} from "@/lib/video-reel-assembly/assignSceneVideoClips";
export { buildClipReadyManifest } from "@/lib/video-reel-assembly/buildClipReadyManifest";
export { assembleVideoReel } from "@/lib/video-reel-assembly/assembleVideoReel";
export {
  createDefaultVideoReelArtifactUploader,
  uploadVideoReelArtifacts,
} from "@/lib/video-reel-assembly/uploadReelArtifacts";
