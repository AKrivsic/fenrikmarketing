import assert from "node:assert/strict";
import { inferProductRoleFromSignals } from "@/lib/assets/inferProductRoleFromSignals";
import { computeAssetQualityTier, ingestPriorityRank } from "@/lib/assets/assetIngestMetadata";
import { sortAvailableAssetEntries } from "@/lib/assets/sortAvailableAssetRefs";
import { extractWebsiteImageCandidates } from "@/lib/knowledge/extractWebsiteImageCandidates";
import { dedupeWebsiteImageCandidates } from "@/lib/knowledge/websiteImageDedupe";
import {
  MAX_WEBSITE_INGEST_ASSETS,
  prioritizeWebsiteImageCandidates,
} from "@/lib/knowledge/websiteImagePrioritize";
import {
  readImageDimensions,
  rejectDownloadedImage,
  rejectWebsiteImageCandidate,
} from "@/lib/knowledge/websiteImageRejectHeuristics";

const html = `
<html><head>
<link rel="icon" href="/favicon.ico"/>
<meta property="og:image" content="https://example.com/og.png"/>
</head>
<body>
<img src="/logo.svg" alt="Company logo"/>
<img src="/og.png" alt="Hero"/>
<img src="/dashboard.png" alt="Dashboard"/>
<img src="/pixel.gif" alt=""/>
<img src="/tiny.png" width="1" height="1"/>
</body></html>`;

const candidates = extractWebsiteImageCandidates(html, "https://example.com/");
const filtered = candidates.filter((c) => !rejectWebsiteImageCandidate(c));
const { kept, duplicates } = dedupeWebsiteImageCandidates(filtered);
const prioritized = prioritizeWebsiteImageCandidates(kept, MAX_WEBSITE_INGEST_ASSETS);

assert.ok(prioritized.length <= MAX_WEBSITE_INGEST_ASSETS);
const dupTest = dedupeWebsiteImageCandidates([
  { kind: "og_image", url: "https://example.com/shared.png" },
  { kind: "img", url: "https://example.com/shared.png", alt: "Hero" },
]);
assert.ok(dupTest.duplicates >= 1);
assert.equal(dupTest.kept.length, 1);
assert.equal(
  rejectWebsiteImageCandidate({
    kind: "img",
    url: "https://example.com/pixel.gif",
  }),
  "tracking_url",
);

const role = inferProductRoleFromSignals({
  kind: "img",
  url: "https://example.com/dashboard.png",
  alt: "Main dashboard",
});
assert.equal(role.role, "dashboard");
assert.equal(role.confidence, "high");

const logoFile = inferProductRoleFromSignals({
  kind: "img",
  url: "https://example.com/assets/logo.svg",
});
assert.equal(logoFile.role, "logo");

const png1x1 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
const dims = readImageDimensions(png1x1, "image/png");
assert.deepEqual(dims, { width: 1, height: 1 });
const reject1x1 = rejectDownloadedImage({
  bytes: png1x1,
  mimeType: "image/png",
  candidate: { kind: "img", url: "https://example.com/t.png" },
});
assert.ok(reject1x1 === "post_1x1" || reject1x1 === "post_too_small");

const quality = computeAssetQualityTier({
  productRole: "product_ui",
  ingestPriority: ingestPriorityRank({ kind: "img", productRole: "product_ui" }),
  byteLength: 80_000,
  width: 1200,
  height: 800,
  source: "website_ingestion",
});
assert.equal(quality, "high");

const sorted = sortAvailableAssetEntries([
  {
    metadata: { asset_quality: "low", ingest_priority: 8 },
    ref: {
      id: "b",
      title: "Decorative",
      media_type: "image",
      asset_class: "static",
      product_role: "decorative",
    },
  },
  {
    metadata: { asset_quality: "high", ingest_priority: 1 },
    ref: {
      id: "a",
      title: "Logo",
      media_type: "image",
      asset_class: "static",
      product_role: "logo",
    },
  },
]);
assert.equal(sorted[0]?.id, "a");

console.log("ok website asset intelligence");
