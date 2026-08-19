/**
 * Round T+ is a later, single reference-guided follow-up for the winning
 * text-to-video model. This module is data + UI contract only.
 * It must not send a provider request until a model-specific reference
 * contract is implemented and verified.
 */

export const TEXT_TO_VIDEO_PLUS_ROUND_ID = "round-t-plus";

export const TEXT_TO_VIDEO_REFERENCE_KINDS = [
  "none",
  "random_seed",
  "reference_image",
  "first_frame_image",
] as const;

export type TextToVideoReferenceKind = (typeof TEXT_TO_VIDEO_REFERENCE_KINDS)[number];

export const TEXT_TO_VIDEO_PLUS_REFERENCE_USES = [
  "brand_color_style",
  "uniform",
  "product_photo",
  "company_asset",
] as const;

export type TextToVideoPlusReferenceUse =
  (typeof TEXT_TO_VIDEO_PLUS_REFERENCE_USES)[number];

export interface TextToVideoPlusPlan {
  roundId: typeof TEXT_TO_VIDEO_PLUS_ROUND_ID;
  enabled: false;
  maxAdditionalTests: 1;
  winnerModelId: string | null;
  referenceKind: TextToVideoReferenceKind;
  referenceUse: TextToVideoPlusReferenceUse | null;
  canSubmit: false;
  blockedReason: string;
}

export function planTextToVideoPlus(args: {
  winnerModelId?: string | null;
}): TextToVideoPlusPlan {
  const winner = args.winnerModelId?.trim() || null;
  return {
    roundId: TEXT_TO_VIDEO_PLUS_ROUND_ID,
    enabled: false,
    maxAdditionalTests: 1,
    winnerModelId: winner,
    referenceKind: "none",
    referenceUse: null,
    canSubmit: false,
    blockedReason:
      "Kolo T+ is not implemented. seed is a random integer, not an image. reference_image and first_frame_image need a verified per-model contract before any paid POST. Gen-4.5 and Veo 3.1 Fast text-to-video OpenAPI do not document image references; Seedance 2.0 Fast does, but Round T+ is still disabled.",
  };
}

export function assertTextToVideoPlusNotImplemented(): never {
  throw new Error("text_to_video_plus_not_implemented");
}
