import assert from "node:assert/strict";
import { buildRecentAssetUsageBlock } from "@/lib/assets/loadRecentAssetUsage";

assert.equal(buildRecentAssetUsageBlock([]), "");
assert.ok(
  buildRecentAssetUsageBlock([
    {
      assetId: "a1",
      title: "Logo",
      productRole: "logo",
      usedAs: "cta",
      usedAt: "2026-01-01T00:00:00Z",
    },
  ]).includes("RECENT ASSET USAGE"),
);
console.log("ok recent asset usage block");
