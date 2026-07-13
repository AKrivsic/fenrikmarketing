import {
  type PresentationTemplate,
  resolvePresentationTemplate,
} from "@/lib/assets/presentationTemplate";
import type { VideoUsageRenderMode } from "@/lib/assets/preferredVideoUsage";
import type { SceneEditorDraftScene } from "@/lib/video-scene-editor/metadata";

export const SCENE_PRESENTATION_OVERRIDE_VALUES = [
  "automatic",
  "UI_HERO",
  "DEVICE_MOCKUP",
  "DESKTOP_FRAME",
  "FLOATING_PROOF",
  "FULLSCREEN_PHOTO",
] as const;

export type ScenePresentationOverride =
  (typeof SCENE_PRESENTATION_OVERRIDE_VALUES)[number];

export const SCENE_PRESENTATION_OVERRIDE_LABELS: Record<
  ScenePresentationOverride,
  string
> = {
  automatic: "Automatic",
  UI_HERO: "UI Hero",
  DEVICE_MOCKUP: "Device Mockup",
  DESKTOP_FRAME: "Desktop Frame",
  FLOATING_PROOF: "Floating Proof",
  FULLSCREEN_PHOTO: "Fullscreen contain",
};

export function isScenePresentationOverride(
  value: string,
): value is ScenePresentationOverride {
  return (SCENE_PRESENTATION_OVERRIDE_VALUES as readonly string[]).includes(value);
}

export function parseScenePresentationOverride(
  value: unknown,
): ScenePresentationOverride {
  if (typeof value === "string" && isScenePresentationOverride(value)) {
    return value;
  }
  return "automatic";
}

export function presentationOverrideToTemplate(
  override: ScenePresentationOverride | string | null | undefined,
): PresentationTemplate | null {
  const parsed = parseScenePresentationOverride(override ?? "automatic");
  if (parsed === "automatic") return null;
  return parsed;
}

export interface ResolvedScenePresentation {
  template: PresentationTemplate;
  videoUsage: VideoUsageRenderMode;
  guardNote?: string;
  userRequestedTemplate: PresentationTemplate | null;
  doubleFramingPrevented: boolean;
}

export function resolveScenePresentation(args: {
  assetMetadata: unknown;
  assetTitle?: string | null;
  scene: Pick<SceneEditorDraftScene, "image_prompt" | "presentation_override">;
}): ResolvedScenePresentation {
  const userRequestedTemplate = presentationOverrideToTemplate(
    args.scene.presentation_override,
  );
  const resolved = resolvePresentationTemplate({
    metadata: args.assetMetadata,
    title: args.assetTitle ?? null,
    scene: { imagePrompt: args.scene.image_prompt },
    requestedTemplate: userRequestedTemplate,
  });
  const doubleFramingPrevented =
    userRequestedTemplate !== null &&
    userRequestedTemplate !== resolved.template &&
    userRequestedTemplate !== "FULLSCREEN_PHOTO";
  return {
    template: resolved.template,
    videoUsage: resolved.videoUsage,
    guardNote: resolved.guardNote,
    userRequestedTemplate,
    doubleFramingPrevented,
  };
}

export function scenePresentationOverrideField(
  override: ScenePresentationOverride,
): Pick<SceneEditorDraftScene, "presentation_override"> | Record<string, never> {
  if (override === "automatic") return {};
  return { presentation_override: override };
}
