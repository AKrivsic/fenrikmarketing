// Website ingest runs component capture when HTML has zero image candidates.
//   npm run check:website-ingest-capture-fallback

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeRefetchFromIngest } from "@/lib/api/refetchIngestSummary";
import { extractWebsiteImageCandidates } from "@/lib/knowledge/extractWebsiteImageCandidates";
import { assetLibraryHasTier1ProductVisual } from "@/lib/knowledge/componentCaptureClient";
import {
  isAssetArchivedFromLibrary,
  withAssetArchivedMetadata,
} from "@/lib/assets/libraryArchive";
import { resolveWebsiteVisualIngestReason } from "@/lib/knowledge/websiteVisualIngestReason";
import type { Json } from "@/lib/supabase/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}`, err);
  }
}

async function main(): Promise<void> {
  await check("ingest source calls capture on no_candidates path", () => {
    const src = readFileSync(
      join(root, "lib/knowledge/ingestWebsiteVisuals.ts"),
      "utf8",
    );
    const block = src.slice(src.indexOf("if (prioritized.length === 0)"));
    assert.ok(block.includes("invokeComponentCaptureFallback"));
    assert.equal(block.includes('reason: "no_candidates"'), false);
  });

  await check("refetch does not fake skipped +1", () => {
    const src = readFileSync(
      join(root, "lib/api/refetchProjectWebsiteAssets.ts"),
      "utf8",
    );
    assert.equal(src.includes("skipped + 1"), false);
    assert.ok(src.includes("summarizeRefetchFromIngest"));
  });

  await check("created/added includes component capture saves in summary", () => {
    const summary = summarizeRefetchFromIngest({
      created: 3,
      htmlCreated: 1,
      htmlDuplicates: 2,
      htmlRejected: 0,
      componentCaptureAttempted: true,
      componentCaptureSaved: 2,
      skipped: false,
    });
    assert.equal(summary.added, 3);
    assert.equal(summary.skipped, 2);
    assert.equal(summary.failed, 0);
  });

  await check("0 candidates disabled -> reason and zero skipped in summary", () => {
    const reason = resolveWebsiteVisualIngestReason({
      htmlCreated: 0,
      captureSaved: 0,
      hadPrioritizedCandidates: false,
      captureEnabled: false,
    });
    assert.equal(reason, "no_candidates_component_capture_disabled");
    const summary = summarizeRefetchFromIngest({
      created: 0,
      htmlCreated: 0,
      htmlDuplicates: 0,
      htmlRejected: 0,
      componentCaptureAttempted: false,
      componentCaptureSaved: 0,
      skipped: true,
      reason,
    });
    assert.equal(summary.added, 0);
    assert.equal(summary.skipped, 0);
    assert.equal(summary.failed, 0);
    assert.equal(summary.reason, "no_candidates_component_capture_disabled");
  });

  await check("0 candidates capture empty -> no_candidates_and_no_capture_assets", () => {
    const reason = resolveWebsiteVisualIngestReason({
      htmlCreated: 0,
      captureSaved: 0,
      hadPrioritizedCandidates: false,
      captureEnabled: true,
      captureSkippedReason: "no_screenshots",
    });
    assert.equal(reason, "no_candidates_and_no_capture_assets");
    assert.equal(
      summarizeRefetchFromIngest({
        created: 0,
        htmlCreated: 0,
        htmlDuplicates: 0,
        htmlRejected: 0,
        componentCaptureAttempted: true,
        componentCaptureSaved: 0,
        skipped: true,
        reason,
      }).skipped,
      0,
    );
  });

  await check("tier1_exists reason when no html candidates", () => {
    const reason = resolveWebsiteVisualIngestReason({
      htmlCreated: 0,
      captureSaved: 0,
      hadPrioritizedCandidates: false,
      captureEnabled: true,
      captureSkippedReason: "tier1_exists",
    });
    assert.equal(reason, "no_candidates_tier1_exists");
  });

  await check("archived Tier 1 does not block capture gate (library filter)", () => {
    const rows = [
      {
        metadata: withAssetArchivedMetadata(
          { product_role: "product_ui" } as Json,
          new Date().toISOString(),
        ),
      },
    ];
    const active = rows.filter((row) => !isAssetArchivedFromLibrary(row.metadata));
    const hasTier1 = assetLibraryHasTier1ProductVisual(
      active.map((row) => ({ metadata: row.metadata as Json })),
    );
    assert.equal(hasTier1, false);
  });

  await check("habitoftheday HTML still yields image candidates", async () => {
    const res = await fetch("https://habitoftheday.com", {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; FenrikBot/1.0)",
        accept: "text/html",
      },
    });
    const html = await res.text();
    const candidates = extractWebsiteImageCandidates(html, "https://habitoftheday.com");
    assert.ok(candidates.length >= 2, "expected og/favicon/img candidates");
  });

  await check("fenrik.chat live HTML has 0 image candidates", async () => {
    const res = await fetch("https://fenrik.chat", {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; FenrikBot/1.0)",
        accept: "text/html",
      },
    });
    const html = await res.text();
    const candidates = extractWebsiteImageCandidates(html, "https://fenrik.chat");
    assert.equal(candidates.length, 0);
    assert.ok(
      readFileSync(join(root, "lib/knowledge/ingestWebsiteVisuals.ts"), "utf8").includes(
        "invokeComponentCaptureFallback(projectId, pageUrl, deps)",
      ),
      "ingest must invoke capture fallback after empty prioritized list",
    );
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
