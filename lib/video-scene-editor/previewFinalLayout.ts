import type { Json } from "@/lib/supabase/types";
import { readDeviceFrameMetadata } from "@/lib/assets/deviceFrameMetadata";
import {
  type PresentationTemplate,
  userFacingPresentationLabel,
} from "@/lib/assets/presentationTemplate";
import { isFramedProductVideoUsage } from "@/lib/assets/preferredVideoUsage";
import { productUiRequiresStaticMotion } from "@/lib/assets/productUiGuards";
import {
  composeAssetSceneStill,
  estimateComposedUiHeightRatio,
  shouldComposeAssetLayout,
} from "@/video-worker/services/assetSceneLayout";
import {
  resolveScenePresentation,
  type ResolvedScenePresentation,
} from "@/lib/video-scene-editor/scenePresentationOverride";
import type { SceneEditorDraftScene } from "@/lib/video-scene-editor/metadata";

export interface FinalLayoutPreviewInfo {
  presentationLabel: string;
  template: PresentationTemplate;
  videoUsage: string;
  effectiveUiAreaPercent: number | null;
  motionLabel: string;
  backgroundLabel: string;
  deviceFrameDetected: boolean;
  doubleFramingPrevented: boolean;
  guardNote: string | null;
}

export interface BuildFinalLayoutPreviewInput {
  assetBytes: Buffer;
  assetMetadata: Json;
  assetTitle?: string | null;
  scene: Pick<SceneEditorDraftScene, "image_prompt" | "presentation_override">;
}

function backgroundLabelForTemplate(template: PresentationTemplate): string {
  if (template === "FULLSCREEN_PHOTO") return "Letterbox (contain)";
  return "Gradient";
}

function motionLabelForVideoUsage(
  videoUsage: string,
  assetMetadata: unknown,
): string {
  if (productUiRequiresStaticMotion(assetMetadata, videoUsage)) return "Static";
  if (videoUsage === "fullscreen") {
    return "Ken-Burns in video (preview shows raw still)";
  }
  if (isFramedProductVideoUsage(videoUsage)) return "Static";
  return "Static";
}

export function buildFinalLayoutPreviewInfo(args: {
  assetMetadata: Json;
  assetWidth: number | null;
  assetHeight: number | null;
  presentation: ResolvedScenePresentation;
}): FinalLayoutPreviewInfo {
  const frame = readDeviceFrameMetadata(args.assetMetadata);
  const effectiveUiAreaPercent =
    args.assetWidth && args.assetHeight
      ? Math.round(
          estimateComposedUiHeightRatio({
            assetWidth: args.assetWidth,
            assetHeight: args.assetHeight,
            videoUsage: args.presentation.videoUsage,
          }) * 100,
        )
      : null;

  return {
    presentationLabel: userFacingPresentationLabel({
      template: args.presentation.template,
      videoUsage: args.presentation.videoUsage,
    }),
    template: args.presentation.template,
    videoUsage: args.presentation.videoUsage,
    effectiveUiAreaPercent,
    motionLabel: motionLabelForVideoUsage(
      args.presentation.videoUsage,
      args.assetMetadata,
    ),
    backgroundLabel: backgroundLabelForTemplate(args.presentation.template),
    deviceFrameDetected: frame.contains_device_frame,
    doubleFramingPrevented: args.presentation.doubleFramingPrevented,
    guardNote: args.presentation.guardNote ?? null,
  };
}

/** Same compositor path as video-worker prepareImageSceneRaster (no FFmpeg/motion). */
export async function buildFinalLayoutPreviewPng(
  input: BuildFinalLayoutPreviewInput,
): Promise<{ png: Buffer; info: FinalLayoutPreviewInfo; presentation: ResolvedScenePresentation }> {
  const presentation = resolveScenePresentation({
    assetMetadata: input.assetMetadata,
    assetTitle: input.assetTitle ?? null,
    scene: input.scene,
  });

  const sharp = (await import("sharp")).default;
  const meta = await sharp(input.assetBytes).metadata();
  const assetW = meta.width ?? null;
  const assetH = meta.height ?? null;

  let png: Buffer;
  if (shouldComposeAssetLayout(presentation.videoUsage)) {
    png = await composeAssetSceneStill({
      assetBytes: input.assetBytes,
      videoUsage: presentation.videoUsage,
      assetMetadata: input.assetMetadata,
    });
  } else {
    png = input.assetBytes;
  }

  const info = buildFinalLayoutPreviewInfo({
    assetMetadata: input.assetMetadata,
    assetWidth: assetW,
    assetHeight: assetH,
    presentation,
  });

  return { png, info, presentation };
}
