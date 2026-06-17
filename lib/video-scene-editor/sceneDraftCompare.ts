export function normalizedSceneInput(scene: Record<string, unknown>) {
  return {
    id: String(scene.id ?? ""),
    image_prompt: String(scene.image_prompt ?? ""),
    image_bucket: String(scene.image_bucket ?? ""),
    image_path: String(scene.image_path ?? ""),
    duration_seconds: Number(scene.duration_seconds ?? 0),
  };
}

export function sceneDraftsEqual(
  left: Array<{
    id: string;
    image_prompt: string;
    image_bucket: string;
    image_path: string;
    duration_seconds: number;
  }>,
  right: Array<{
    id: string;
    image_prompt: string;
    image_bucket: string;
    image_path: string;
    duration_seconds: number;
  }>,
): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    const a = normalizedSceneInput(left[i]!);
    const b = normalizedSceneInput(right[i]!);
    if (JSON.stringify(a) !== JSON.stringify(b)) return false;
  }
  return true;
}

export function sceneInputsEqual(
  left: Record<string, unknown>[],
  right: Record<string, unknown>[],
): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    const a = normalizedSceneInput(left[i]!);
    const b = normalizedSceneInput(right[i]!);
    if (JSON.stringify(a) !== JSON.stringify(b)) return false;
  }
  return true;
}
