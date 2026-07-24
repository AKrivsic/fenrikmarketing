import type { ProductRole } from "@/lib/assets/productRole";
import type {
  PreferredVideoUsage,
  VideoUsageRenderMode,
} from "@/lib/assets/preferredVideoUsage";
import type {
  AuthenticityForProductClaim,
  ProvenanceClass,
  RecommendedPresentationClass,
} from "@/lib/assets/productPresentationMetadata";

export interface AssetRef {
  id: string;
  title: string;
  // static | editable | reference
  asset_class: string;
  media_type: string;
  ai_description?: string | null;
  detected_content_type?: string | null;
  suggested_usage?: string | null;
  trust_signal?: boolean | null;
  product_role?: ProductRole | null;
  /** From assets.metadata.asset_quality when present (ingest / analysis). */
  asset_quality?: "high" | "medium" | "low" | null;
  orientation?: string | null;
  preferred_presentation?: string | null;
  video_suitability?: string | null;
  safe_vertical_usage?: boolean | null;
  aspect_ratio?: string | number | null;
  visual_importance?: string | null;
  capture_viewport?: string | null;
  /** Stamped or computed preferred usage for vertical video. */
  preferred_video_usage?: VideoUsageRenderMode | PreferredVideoUsage | null;
  /** Wave 2 — provenance / authenticity for Product Presentation Decision. */
  provenance_class?: ProvenanceClass | null;
  authenticity_for_product_claim?: AuthenticityForProductClaim | null;
  recommended_presentation_classes?: RecommendedPresentationClass[] | null;
}
