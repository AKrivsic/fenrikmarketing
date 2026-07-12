// Asset admin metadata update + manual override checks.
//   npm run check:asset-admin-metadata

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeAssetAnalysis } from "@/lib/assets/analysis";
import {
  applyAssetMetadataUpdate,
  mergeAssetMetadataForSave,
} from "@/lib/assets/applyAssetMetadataUpdate";
import { isManualOverride } from "@/lib/assets/manualOverrides";
import { isVideoUsageRenderValue } from "@/lib/assets/assetAdminOptions";
import {
  VIDEO_USAGE_RENDER_VALUES,
  resolvePreferredVideoUsageFromMetadata,
} from "@/lib/assets/preferredVideoUsage";

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

check("single field update preserves other metadata keys", () => {
  const existing = {
    asset_class: "static",
    ai_description: "old ai",
    suggested_usage: "keep me",
    width: 800,
    orientation: "landscape",
  };
  const { metadata } = applyAssetMetadataUpdate(existing, {
    aiDescription: { mode: "manual", value: "new ai" },
  });
  assert.equal(metadata.ai_description, "new ai");
  assert.equal(metadata.suggested_usage, "keep me");
  assert.equal(metadata.width, 800);
  assert.equal(metadata.orientation, "landscape");
  assert.equal(isManualOverride(metadata, "ai_description"), true);
});

check("manual empty string is stored with override", () => {
  const { metadata } = applyAssetMetadataUpdate(
    { ai_description: "prior" },
    { aiDescription: { mode: "manual", value: "" } },
  );
  assert.equal(metadata.ai_description, "");
  assert.equal(isManualOverride(metadata, "ai_description"), true);
});

check("automatic text field clears override but keeps value", () => {
  const { metadata } = applyAssetMetadataUpdate(
    {
      ai_description: "from ai",
      manual_overrides: { ai_description: true },
    },
    { aiDescription: { mode: "automatic" } },
  );
  assert.equal(metadata.ai_description, "from ai");
  assert.equal(isManualOverride(metadata, "ai_description"), false);
});

check("automatic preferred_video_usage removes stamp and override", () => {
  const base = {
    product_role: "product_ui",
    capture_viewport: "mobile",
    preferred_video_usage: "background",
    manual_overrides: { preferred_video_usage: true },
  };
  const { metadata } = applyAssetMetadataUpdate(base, {
    preferredVideoUsage: { mode: "automatic" },
  });
  assert.equal(metadata.preferred_video_usage, undefined);
  assert.equal(isManualOverride(metadata, "preferred_video_usage"), false);
  assert.equal(resolvePreferredVideoUsageFromMetadata(metadata), "framed_phone");
});

check("invalid preferred_video_usage is rejected", () => {
  const { error } = applyAssetMetadataUpdate({}, {
    preferredVideoUsage: { mode: "manual", value: "not_a_real_mode" },
  });
  assert.ok(error);
});

check("render usage values are accepted for manual preferred_video_usage", () => {
  for (const value of VIDEO_USAGE_RENDER_VALUES) {
    assert.ok(isVideoUsageRenderValue(value));
    const { metadata, error } = applyAssetMetadataUpdate({}, {
      preferredVideoUsage: { mode: "manual", value },
    });
    assert.equal(error, null);
    assert.equal(metadata.preferred_video_usage, value);
  }
});

check("AI reanalysis respects manual_overrides", () => {
  const merged = mergeAssetAnalysis(
    {
      ai_description: "user text",
      suggested_usage: "user usage",
      manual_overrides: {
        ai_description: true,
        suggested_usage: true,
      },
    },
    {
      ai_description: "ai rewrite",
      detected_content_type: "dashboard",
      suggested_usage: "ai usage",
      suggested_asset_class: "static",
      extracted_text: null,
      trust_signal: false,
      analyzed_at: new Date().toISOString(),
      analysis_status: "completed",
    },
  );
  assert.equal(merged.ai_description, "user text");
  assert.equal(merged.suggested_usage, "user usage");
  assert.equal(merged.detected_content_type, "dashboard");
});

check("legacy asset without overrides still merges analysis", () => {
  const merged = mergeAssetAnalysis(
    { asset_class: "static" },
    {
      ai_description: "fresh",
      detected_content_type: null,
      suggested_usage: "use it",
      suggested_asset_class: null,
      extracted_text: null,
      trust_signal: false,
      analyzed_at: new Date().toISOString(),
      analysis_status: "completed",
    },
  );
  assert.equal(merged.ai_description, "fresh");
});

check("mergeAssetMetadataForSave returns json-safe metadata", () => {
  const { metadata, error } = mergeAssetMetadataForSave(
    { capture_viewport: "desktop" },
    { captureViewport: { mode: "manual", value: "tablet" } },
  );
  assert.equal(error, null);
  assert.equal((metadata as Record<string, unknown>).capture_viewport, "tablet");
});

check("updateProjectAsset merges metadata via apply helper", () => {
  const src = readFileSync(join(root, "lib/api/assets.ts"), "utf8");
  assert.ok(src.includes("mergeAssetMetadataForSave"));
  assert.ok(src.includes("metadata?: ApplyAssetMetadataUpdateInput"));
});

check("AssetEditForm wires metadata modes to server action", () => {
  const formSrc = readFileSync(
    join(root, "components/assets/AssetEditForm/AssetEditForm.tsx"),
    "utf8",
  );
  assert.ok(formSrc.includes("aiDescriptionMode"));
  assert.ok(formSrc.includes("preferredVideoUsageMode"));
  assert.ok(formSrc.includes("VIDEO_USAGE_RENDER_VALUES"));
});

check("AssetCard hides stale usage metrics", () => {
  const cardSrc = readFileSync(
    join(root, "components/assets/AssetCard/AssetCard.tsx"),
    "utf8",
  );
  assert.equal(cardSrc.includes("usageCount"), false);
  assert.equal(cardSrc.includes("reuseScore"), false);
  assert.equal(cardSrc.includes("lastUsedAt"), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
