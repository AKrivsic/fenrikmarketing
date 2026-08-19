// Storage path conventions. The FIRST path segment is always project_id
// because Storage RLS checks owns_project((storage.foldername(name))[1]::uuid).
// The bucket already identifies where the file lives, so it is NOT repeated
// in the path.

export const STORAGE_BUCKETS = {
  projectAssets: "project-assets",
  generatedVisuals: "generated-visuals",
  videoRenders: "video-renders",
} as const;

function sanitizeFilename(filename: string): string {
  const base = filename.split("/").pop() ?? filename;
  return base.replace(/[^\w.\-]+/g, "_");
}

// project-assets: {project_id}/source/{asset_id}/{filename}
export function buildAssetPath(
  projectId: string,
  assetId: string,
  filename: string,
): string {
  return `${projectId}/source/${assetId}/${sanitizeFilename(filename)}`;
}

// generated-visuals: {project_id}/generated/{ai_visual_id}/{filename}
export function buildGeneratedVisualPath(
  projectId: string,
  aiVisualId: string,
  filename: string,
): string {
  return `${projectId}/generated/${aiVisualId}/${sanitizeFilename(filename)}`;
}

// video-renders: {project_id}/video/{video_job_id}/{filename}
export function buildVideoRenderPath(
  projectId: string,
  videoJobId: string,
  filename: string,
): string {
  return `${projectId}/video/${videoJobId}/${sanitizeFilename(filename)}`;
}

// video-renders: {project_id}/runway-tests/{test_job_id}/{filename}
export function buildRunwayTestPath(
  projectId: string,
  testJobId: string,
  filename: string,
): string {
  return `${projectId}/runway-tests/${testJobId}/${sanitizeFilename(filename)}`;
}

// video-renders: {project_id}/scene-video-attempts/{attempt_id}/{filename}
export function buildSceneVideoAttemptPath(
  projectId: string,
  attemptId: string,
  filename: string,
): string {
  return `${projectId}/scene-video-attempts/${attemptId}/${sanitizeFilename(filename)}`;
}

// video-renders: {project_id}/ai-media-benchmark/cases/{case_id}/{imageUuid}/{filename}
// imageUuid is a random UUID that makes the path unique and immutable per upload.
export function buildBenchmarkCaseImagePath(
  projectId: string,
  caseId: string,
  imageUuid: string,
  filename: string,
): string {
  return `${projectId}/ai-media-benchmark/cases/${caseId}/${imageUuid}/${sanitizeFilename(filename)}`;
}

// video-renders: {project_id}/ai-media-benchmark/{run_id}/{filename}
export function buildAiMediaBenchmarkPath(
  projectId: string,
  runId: string,
  filename: string,
): string {
  return `${projectId}/ai-media-benchmark/${runId}/${sanitizeFilename(filename)}`;
}

// video-renders: {project_id}/text-to-video-voice/{package_id}/{fingerprint}/{filename}
export function buildTextToVideoVoiceSynthesisPath(
  projectId: string,
  packageId: string,
  synthesisFingerprint: string,
  filename: string,
): string {
  return `${projectId}/text-to-video-voice/${packageId}/${synthesisFingerprint}/${sanitizeFilename(filename)}`;
}
