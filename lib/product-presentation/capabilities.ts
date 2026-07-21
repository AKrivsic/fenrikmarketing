import type { ProductPresentationCapabilities } from "./types";

/**
 * Logical capability catalog — what the render stack may do.
 * Not a product-type taxonomy. Synthetic product UI is never allowed.
 */
export function defaultProductPresentationCapabilities(): ProductPresentationCapabilities {
  return {
    can_composite_authentic_asset: true,
    can_ai_scene_non_ui: true,
    can_text_card: true,
    cannot_synthesize_product_ui: true,
  };
}
