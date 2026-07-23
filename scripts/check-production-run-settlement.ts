/**
 * Production-run settlement identity — pure checks (no DB).
 *   npm run check:production-run-settlement
 *
 * Guards the fix for dual mapping (fail used package_index ordinal into
 * loadRunItems[]; success used packages[i] → items[i]), which left orphan
 * queued slots when successes were non-prefix (e.g. package_index 8).
 */

import assert from "node:assert/strict";
import {
  applyPackageOutcomesByStrategyItemId,
  clampPatchesForTerminalParent,
  computeProductionRunOpenSlots,
  findRunItemByStrategyItemId,
  isTerminalProductionRunStatus,
  mergeRunItemPatches,
  productionRunHasOrphanOpenSlots,
  type PackageOutcomeIdentity,
  type RunItemIdentity,
} from "@/lib/production-runs/settleRunItemIdentity";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

function makeItems(
  count: number,
  strategyPrefix = "s",
): RunItemIdentity[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    package_index: i,
    strategy_item_id: `${strategyPrefix}${i}`,
    status: "queued" as const,
    content_package_id: null,
    error_message: null,
  }));
}

function shuffle<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function assertNoOrphans(items: RunItemIdentity[], requested: number): void {
  assert.equal(
    productionRunHasOrphanOpenSlots({ requestedTotal: requested, items }),
    false,
  );
  const open = computeProductionRunOpenSlots({
    requestedTotal: requested,
    items,
  });
  assert.equal(open.open, 0);
  assert.equal(open.nextStatus, "completed");
}

section("lookup by strategy_item_id");
check("findRunItemByStrategyItemId ignores array order", () => {
  const items = shuffle(makeItems(14), 42);
  const hit = findRunItemByStrategyItemId(items, "s8");
  assert.ok(hit);
  assert.equal(hit?.package_index, 8);
  assert.equal(hit?.id, "item-8");
});

section("success package_index 0");
check("package 0 lands on strategy s0 item", () => {
  const items = makeItems(14);
  const packages: PackageOutcomeIdentity[] = [
    { packageId: "pkg-0", strategyItemId: "s0", status: "completed" },
  ];
  const patches = applyPackageOutcomesByStrategyItemId(items, packages);
  assert.equal(patches.length, 1);
  assert.equal(patches[0]?.id, "item-0");
  assert.equal(patches[0]?.content_package_id, "pkg-0");
  const merged = mergeRunItemPatches(items, patches);
  assert.equal(merged[0]?.status, "completed");
  assert.equal(merged[8]?.status, "queued");
});

section("success package_index 8");
check("package 8 lands on strategy s8 — never ordinal items[1]", () => {
  // Two successes in creation order 0 then 8 — old bug assigned 2nd package to items[1].
  const items = makeItems(14);
  const packages: PackageOutcomeIdentity[] = [
    { packageId: "pkg-0", strategyItemId: "s0", status: "completed" },
    { packageId: "pkg-8", strategyItemId: "s8", status: "completed" },
  ];
  const patches = applyPackageOutcomesByStrategyItemId(items, packages);
  const byId = new Map(patches.map((p) => [p.id, p]));
  assert.equal(byId.get("item-0")?.content_package_id, "pkg-0");
  assert.equal(byId.get("item-8")?.content_package_id, "pkg-8");
  assert.equal(byId.has("item-1"), false);
  assert.equal(byId.has("item-12"), false);
});

section("success 0 + fail 1 + success 8");
check("interleaved fail does not steal success slots", () => {
  let items = makeItems(14);
  // Fail settlement for strategy s1
  const failTarget = findRunItemByStrategyItemId(items, "s1");
  assert.ok(failTarget);
  items = items.map((i) =>
    i.id === failTarget!.id
      ? {
          ...i,
          status: "failed" as const,
          content_package_id: null,
          error_message: "generation_failed",
        }
      : i,
  );
  const packages: PackageOutcomeIdentity[] = [
    { packageId: "pkg-0", strategyItemId: "s0", status: "completed" },
    { packageId: "pkg-8", strategyItemId: "s8", status: "completed" },
  ];
  const merged = mergeRunItemPatches(
    items,
    applyPackageOutcomesByStrategyItemId(items, packages),
  );
  assert.equal(merged[0]?.status, "completed");
  assert.equal(merged[0]?.content_package_id, "pkg-0");
  assert.equal(merged[1]?.status, "failed");
  assert.equal(merged[1]?.content_package_id, null);
  assert.equal(merged[8]?.status, "completed");
  assert.equal(merged[8]?.content_package_id, "pkg-8");
  const open = computeProductionRunOpenSlots({
    requestedTotal: 14,
    items: merged,
  });
  assert.equal(open.generated, 2);
  assert.equal(open.failed, 1);
  assert.equal(open.open, 11);
  assert.equal(open.nextStatus, "running");
});

section("success only package_index 13");
check("sole late success maps to item-13, not item-0", () => {
  const items = makeItems(14);
  const patches = applyPackageOutcomesByStrategyItemId(items, [
    { packageId: "pkg-13", strategyItemId: "s13", status: "completed" },
  ]);
  assert.equal(patches.length, 1);
  assert.equal(patches[0]?.id, "item-13");
  assert.notEqual(patches[0]?.id, "item-0");
});

section("all failed");
check("parent closes when every slot failed", () => {
  const items = makeItems(5).map((i) => ({
    ...i,
    status: "failed" as const,
    error_message: "generation_failed",
  }));
  assertNoOrphans(items, 5);
  const open = computeProductionRunOpenSlots({
    requestedTotal: 5,
    items,
  });
  assert.equal(open.generated, 0);
  assert.equal(open.failed, 5);
});

section("all completed");
check("parent closes when every slot completed with package", () => {
  const items = makeItems(5);
  const packages: PackageOutcomeIdentity[] = items.map((i) => ({
    packageId: `pkg-${i.package_index}`,
    strategyItemId: i.strategy_item_id,
    status: "completed" as const,
  }));
  const merged = mergeRunItemPatches(
    items,
    applyPackageOutcomesByStrategyItemId(items, packages),
  );
  assertNoOrphans(merged, 5);
  assert.equal(
    computeProductionRunOpenSlots({ requestedTotal: 5, items: merged })
      .generated,
    5,
  );
});

section("random callback order");
check("shuffled package arrival still binds by strategy_item_id", () => {
  const items = makeItems(14);
  const packages: PackageOutcomeIdentity[] = shuffle(
    [
      { packageId: "pkg-8", strategyItemId: "s8", status: "completed" as const },
      { packageId: "pkg-0", strategyItemId: "s0", status: "completed" as const },
      { packageId: "pkg-13", strategyItemId: "s13", status: "completed" as const },
      { packageId: "pkg-3", strategyItemId: "s3", status: "failed" as const },
    ],
    99,
  );
  const merged = mergeRunItemPatches(
    shuffle(items, 7),
    applyPackageOutcomesByStrategyItemId(shuffle(items, 7), packages),
  );
  const byIndex = new Map(merged.map((i) => [i.package_index, i]));
  assert.equal(byIndex.get(0)?.content_package_id, "pkg-0");
  assert.equal(byIndex.get(8)?.content_package_id, "pkg-8");
  assert.equal(byIndex.get(13)?.content_package_id, "pkg-13");
  assert.equal(byIndex.get(3)?.status, "failed");
  assert.equal(byIndex.get(3)?.content_package_id, "pkg-3");
});

section("reconcile after restart (full re-apply)");
check("re-applying same outcomes is idempotent and leaves no orphans when terminal", () => {
  let items = makeItems(4);
  // Fail 1 and 2
  items = items.map((i) =>
    i.package_index === 1 || i.package_index === 2
      ? { ...i, status: "failed" as const, error_message: "x" }
      : i,
  );
  const packages: PackageOutcomeIdentity[] = [
    { packageId: "pkg-0", strategyItemId: "s0", status: "completed" },
    { packageId: "pkg-3", strategyItemId: "s3", status: "completed" },
  ];
  const once = mergeRunItemPatches(
    items,
    applyPackageOutcomesByStrategyItemId(items, packages),
  );
  const twice = mergeRunItemPatches(
    once,
    applyPackageOutcomesByStrategyItemId(once, packages),
  );
  assert.deepEqual(
    twice.map((i) => ({
      id: i.id,
      status: i.status,
      pkg: i.content_package_id,
    })),
    once.map((i) => ({
      id: i.id,
      status: i.status,
      pkg: i.content_package_id,
    })),
  );
  assertNoOrphans(twice, 4);
});

section("ae19 regression: package_index 8 must not orphan item-8");
check("successes at 0 and 8 + fails elsewhere close with item-8 completed", () => {
  let items = makeItems(14);
  for (const idx of [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13]) {
    items = items.map((i) =>
      i.package_index === idx
        ? {
            ...i,
            status: "failed" as const,
            error_message: "all_directions_rejected",
          }
        : i,
    );
  }
  const packages: PackageOutcomeIdentity[] = [
    { packageId: "f475", strategyItemId: "s0", status: "completed" },
    { packageId: "cd22", strategyItemId: "s8", status: "completed" },
  ];
  // Simulate old ordinal bug target: 2nd package would hit items[1] if ordered wrong.
  const shuffledItems = shuffle(items, 123);
  const merged = mergeRunItemPatches(
    shuffledItems,
    applyPackageOutcomesByStrategyItemId(shuffledItems, packages),
  );
  const item8 = merged.find((i) => i.package_index === 8);
  assert.equal(item8?.status, "completed");
  assert.equal(item8?.content_package_id, "cd22");
  assert.notEqual(
    merged.find((i) => i.package_index === 1)?.content_package_id,
    "cd22",
  );
  assertNoOrphans(merged, 14);
});

section("detach ordinal leftover (ae19 slot 12 held slot 8 package)");
check("stolen package moves to owner; thief becomes failed", () => {
  let items = makeItems(14);
  // Historical corruption: package for s8 was written onto item-12.
  items = items.map((i) => {
    if (i.package_index === 12) {
      return {
        ...i,
        status: "completed" as const,
        content_package_id: "cd22",
      };
    }
    if (i.package_index !== 6 && i.package_index !== 8) {
      return {
        ...i,
        status: "failed" as const,
        error_message: "all_directions_rejected",
      };
    }
    return i;
  });
  // Real successes: index 6 and 8.
  items = items.map((i) =>
    i.package_index === 6
      ? {
          ...i,
          status: "completed" as const,
          content_package_id: "pkg-6",
        }
      : i,
  );
  const packages: PackageOutcomeIdentity[] = [
    { packageId: "pkg-6", strategyItemId: "s6", status: "completed" },
    { packageId: "cd22", strategyItemId: "s8", status: "completed" },
  ];
  const merged = mergeRunItemPatches(
    items,
    applyPackageOutcomesByStrategyItemId(items, packages),
  );
  const item8 = merged.find((i) => i.package_index === 8);
  const item12 = merged.find((i) => i.package_index === 12);
  assert.equal(item8?.status, "completed");
  assert.equal(item8?.content_package_id, "cd22");
  assert.equal(item12?.status, "failed");
  assert.equal(item12?.content_package_id, null);
  assertNoOrphans(merged, 14);
});

section("terminal parent — never reopen slots");
check("isTerminalProductionRunStatus covers completed/failed/cancelled", () => {
  assert.equal(isTerminalProductionRunStatus("completed"), true);
  assert.equal(isTerminalProductionRunStatus("failed"), true);
  assert.equal(isTerminalProductionRunStatus("cancelled"), true);
  assert.equal(isTerminalProductionRunStatus("running"), false);
  assert.equal(isTerminalProductionRunStatus("queued"), false);
});

check("running patch under completed item is dropped (post-run video retry)", () => {
  const items: RunItemIdentity[] = [
    {
      id: "item-0",
      package_index: 0,
      strategy_item_id: "s0",
      status: "completed",
      content_package_id: "pkg-0",
      error_message: null,
    },
  ];
  const raw = applyPackageOutcomesByStrategyItemId(items, [
    { packageId: "pkg-0", strategyItemId: "s0", status: "running" },
  ]);
  assert.equal(raw.length, 1);
  assert.equal(raw[0]?.status, "running");
  const clamped = clampPatchesForTerminalParent(items, raw);
  assert.equal(clamped.length, 0);
  const merged = mergeRunItemPatches(items, clamped);
  assert.equal(merged[0]?.status, "completed");
  assert.equal(merged[0]?.content_package_id, "pkg-0");
});

check("orphan open item under terminal parent is forced failed", () => {
  const items: RunItemIdentity[] = [
    {
      id: "item-0",
      package_index: 0,
      strategy_item_id: "s0",
      status: "queued",
      content_package_id: null,
      error_message: null,
    },
  ];
  const clamped = clampPatchesForTerminalParent(items, [
    {
      id: "item-0",
      status: "running",
      content_package_id: "pkg-0",
      error_message: null,
    },
  ]);
  assert.equal(clamped.length, 1);
  assert.equal(clamped[0]?.status, "failed");
  assert.equal(clamped[0]?.content_package_id, "pkg-0");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
