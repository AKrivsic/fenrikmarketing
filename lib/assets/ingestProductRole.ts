import type { WebsiteImageCandidateKind } from "@/lib/knowledge/extractWebsiteImageCandidates";
import type { ProductRole } from "@/lib/assets/productRole";
import {
  inferProductRoleFromSignals,
  shouldApplyInferredProductRole,
} from "@/lib/assets/inferProductRoleFromSignals";

// Best-effort product_role for website-ingested assets (only when confident).
export function inferIngestProductRole(
  kind: WebsiteImageCandidateKind,
  url: string,
  alt?: string | null,
  title?: string | null,
): ProductRole | null {
  const inference = inferProductRoleFromSignals({ kind, url, alt, title });
  return shouldApplyInferredProductRole(inference, false) ? inference.role : null;
}
