// Project assets refetch + delete (library archive) integration checks.
//   npm run check:project-assets-refetch-delete

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isAssetArchivedFromLibrary,
  withAssetArchivedMetadata,
} from "@/lib/assets/libraryArchive";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}`, err);
  }
}

check("refetchProjectWebsiteAssets does not import knowledge extraction", () => {
  const refetchSrc = readFileSync(
    join(root, "lib/api/refetchProjectWebsiteAssets.ts"),
    "utf8",
  );
  assert.equal(refetchSrc.includes("runProjectKnowledgeExtraction"), false);
  assert.equal(refetchSrc.includes("runExtractKnowledge"), false);
  assert.equal(refetchSrc.includes("extractKnowledge"), false);
  assert.ok(refetchSrc.includes("ingestWebsiteVisualsBestEffort"));
  assert.ok(refetchSrc.includes("canonicalWebsiteUrl"));
});

check("refetch action wires ingest-only API", () => {
  const actionSrc = readFileSync(
    join(root, "app/projects/[id]/assets/actions.ts"),
    "utf8",
  );
  assert.ok(actionSrc.includes("refetchProjectWebsiteAssets"));
  assert.equal(actionSrc.includes("runProjectKnowledgeExtraction"), false);
});

check("website visual ingest still runs component capture fallback", () => {
  const ingestSrc = readFileSync(
    join(root, "lib/knowledge/ingestWebsiteVisuals.ts"),
    "utf8",
  );
  assert.ok(ingestSrc.includes("maybeRunComponentCaptureFallback"));
});

check("archived metadata excluded from available asset refs (library filter)", () => {
  const rows = [
    { id: "a1", metadata: {} },
    { id: "a2", metadata: withAssetArchivedMetadata({}, new Date().toISOString()) },
  ];
  const available = rows.filter((row) => !isAssetArchivedFromLibrary(row.metadata));
  assert.deepEqual(
    available.map((r) => r.id),
    ["a1"],
  );
});

check("loadAvailableAssets filters archived rows in packageShared", () => {
  const src = readFileSync(
    join(root, "lib/ai/workflows/packageShared.ts"),
    "utf8",
  );
  assert.ok(src.includes("isAssetArchivedFromLibrary"));
});

check("deleteProjectAsset preserves row when historical usage detected", () => {
  const src = readFileSync(join(root, "lib/api/assets.ts"), "utf8");
  assert.ok(src.includes("assetHasHistoricalReferences"));
  assert.ok(src.includes("withAssetArchivedMetadata"));
  assert.ok(src.includes('mode: "archived"'));
  assert.ok(src.includes("content_packages"));
  assert.ok(src.includes("asset_usage"));
});

check("deleteProjectAsset does not mutate content_packages", () => {
  const src = readFileSync(join(root, "lib/api/assets.ts"), "utf8");
  assert.equal(src.includes('.from("content_packages").update'), false);
});

check("package brief asset resolution still loads by explicit id", () => {
  const src = readFileSync(
    join(root, "lib/ai/workflows/packageShared.ts"),
    "utf8",
  );
  const fn = src.slice(src.indexOf("async function loadAssetImages"));
  assert.ok(fn.includes('.in("id", usageIds)'));
  assert.equal(fn.includes("isAssetArchivedFromLibrary"), false);
});

check("tier1 component capture ignores archived assets", () => {
  const src = readFileSync(
    join(root, "lib/knowledge/componentCapture.ts"),
    "utf8",
  );
  assert.ok(src.includes("isAssetArchivedFromLibrary"));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
