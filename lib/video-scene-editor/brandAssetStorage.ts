function sanitizeFilename(filename: string): string {
  const base = filename.split("/").pop() ?? filename;
  return base.replace(/[^\w.\-]+/g, "_");
}

/** Brand assets uploaded for scene-editor logo insert (project-assets bucket). */
export function buildSceneEditorBrandAssetPath(
  projectId: string,
  videoJobId: string,
  filename: string,
): string {
  return `${projectId}/scene-editor/${videoJobId}/${sanitizeFilename(filename)}`;
}
