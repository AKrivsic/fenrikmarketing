/**
 * Creative Core v2 package routing — by stored contract, not env flags.
 *
 * - New packages always create a v2 contract.
 * - Existing packages with v2 core/snapshot continue on v2.
 * - Legacy packages without v2 fields stay on legacy paths.
 */

import { readApprovedCreativeCoreSnapshot } from "@/lib/content-creative-core-v2/approvedSnapshot";
import { readCreativeCoreV2FromBrief } from "@/lib/content-creative-core-v2/legacyProjection";

/** True when brief already carries a Creative Core v2 contract. */
export function packageUsesCreativeCoreV2(
  brief: Record<string, unknown> | null | undefined,
): boolean {
  if (!brief) return false;
  if (readCreativeCoreV2FromBrief(brief) != null) return true;
  if (readApprovedCreativeCoreSnapshot(brief) != null) return true;
  return false;
}

/**
 * All newly generated Content Packages use Creative Core v2.
 * Do not gate this on env flags.
 */
export function shouldGenerateWithCreativeCoreV2(): boolean {
  return true;
}
