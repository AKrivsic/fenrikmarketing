import type { ImageEditRequest, ImageGenerationResult, ImageProvider } from "@/lib/ai/types";

export class ImageEditNotSupportedError extends Error {
  readonly providerName: string;

  constructor(providerName: string) {
    super(`Image provider "${providerName}" does not support editImage()`);
    this.name = "ImageEditNotSupportedError";
    this.providerName = providerName;
  }
}

export class ImageEditMultiImageNotSupportedError extends Error {
  readonly providerName: string;

  constructor(providerName: string) {
    super(
      `Image provider "${providerName}" does not support multi-image edit (reference logo/asset)`,
    );
    this.name = "ImageEditMultiImageNotSupportedError";
    this.providerName = providerName;
  }
}

export function providerSupportsMultiImageEdit(provider: ImageProvider): boolean {
  return provider.supportsMultiImageEdit === true;
}

export async function editImageWithProvider(
  provider: ImageProvider,
  req: ImageEditRequest,
): Promise<ImageGenerationResult> {
  if (typeof provider.editImage !== "function") {
    throw new ImageEditNotSupportedError(provider.name);
  }
  if ((req.additionalImages?.length ?? 0) > 0 && !providerSupportsMultiImageEdit(provider)) {
    throw new ImageEditMultiImageNotSupportedError(provider.name);
  }
  return provider.editImage(req);
}
