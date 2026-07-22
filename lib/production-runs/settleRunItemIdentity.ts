/**
 * Pure production-run settlement helpers (no DB).
 * Fail and success paths must resolve the same run-item identity:
 * strategy_item_id (preferred) — never packages[i] → items[i].
 */

export type SettledRunItemStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface RunItemIdentity {
  id: string;
  package_index: number;
  strategy_item_id: string | null;
  status: SettledRunItemStatus;
  content_package_id: string | null;
  error_message: string | null;
}

export interface PackageOutcomeIdentity {
  packageId: string;
  strategyItemId: string | null;
  status: "completed" | "running" | "failed";
}

export interface RunItemSettlementPatch {
  id: string;
  status: SettledRunItemStatus;
  content_package_id: string | null;
  error_message: string | null;
}

/** Find the run item owned by a strategy item (fail + success shared lookup). */
export function findRunItemByStrategyItemId(
  items: readonly RunItemIdentity[],
  strategyItemId: string,
): RunItemIdentity | null {
  return items.find((i) => i.strategy_item_id === strategyItemId) ?? null;
}

/**
 * Apply real package outcomes onto run items by strategy_item_id.
 * Ordinal packages[i] → items[i] is intentionally NOT used.
 * Packages without a matching strategy_item_id are skipped (no wrong-slot write).
 *
 * Also detaches packages that another slot still holds from an old ordinal
 * mis-assignment (same package_id on the wrong run item). Detached wrongly
 * completed slots become failed so the parent can close.
 */
export function applyPackageOutcomesByStrategyItemId(
  items: readonly RunItemIdentity[],
  packages: readonly PackageOutcomeIdentity[],
): RunItemSettlementPatch[] {
  const byStrategy = new Map<string, RunItemIdentity>();
  for (const item of items) {
    if (item.strategy_item_id) {
      byStrategy.set(item.strategy_item_id, item);
    }
  }

  const patches: RunItemSettlementPatch[] = [];
  const ownerByPackageId = new Map<string, string>();

  for (const pkg of packages) {
    if (!pkg.strategyItemId) continue;
    const item = byStrategy.get(pkg.strategyItemId);
    if (!item) continue;
    ownerByPackageId.set(pkg.packageId, item.id);
    const errorMessage =
      pkg.status === "failed" ? "Renderování videa selhalo." : null;
    patches.push({
      id: item.id,
      status: pkg.status,
      content_package_id: pkg.packageId,
      error_message: errorMessage,
    });
  }

  // Clear ordinal leftovers: item holds a package owned by a different slot.
  for (const item of items) {
    if (!item.content_package_id) continue;
    const ownerId = ownerByPackageId.get(item.content_package_id);
    if (!ownerId || ownerId === item.id) continue;
    patches.push({
      id: item.id,
      status: "failed",
      content_package_id: null,
      error_message: JSON.stringify({
        error: "mismatched_package_attachment",
        message:
          "Package belonged to a different strategy item; cleared for identity settlement.",
      }),
    });
  }

  return patches;
}

/**
 * Merge patches onto an in-memory item list (for counter computation / tests).
 * Unpatched items keep their prior status (e.g. generation-failed slots).
 */
export function mergeRunItemPatches(
  items: readonly RunItemIdentity[],
  patches: readonly RunItemSettlementPatch[],
): RunItemIdentity[] {
  const byId = new Map(patches.map((p) => [p.id, p]));
  return items.map((item) => {
    const patch = byId.get(item.id);
    if (!patch) return { ...item };
    return {
      ...item,
      status: patch.status,
      content_package_id: patch.content_package_id,
      error_message: patch.error_message,
    };
  });
}

/** Parent-run open-slot arithmetic used by reconcile + fail settlement. */
export function computeProductionRunOpenSlots(args: {
  requestedTotal: number;
  items: readonly RunItemIdentity[];
}): {
  generated: number;
  failed: number;
  open: number;
  nextStatus: "completed" | "running" | "queued";
} {
  const generated = args.items.filter(
    (i) => i.status === "completed" && i.content_package_id,
  ).length;
  const failed = args.items.filter((i) => i.status === "failed").length;
  const open = args.requestedTotal - generated - failed;
  const nextStatus =
    open <= 0 ? "completed" : generated + failed > 0 ? "running" : "queued";
  return { generated, failed, open, nextStatus };
}

/** True when every requested slot is terminal — no orphan queued/running. */
export function productionRunHasOrphanOpenSlots(args: {
  requestedTotal: number;
  items: readonly RunItemIdentity[];
}): boolean {
  return computeProductionRunOpenSlots(args).open > 0;
}
