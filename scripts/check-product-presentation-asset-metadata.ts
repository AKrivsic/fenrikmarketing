// npm run check:product-presentation-asset-metadata
import assert from "node:assert/strict";
import {
  computeAuthenticityForProductClaim,
  computeProductPresentationAssetMetadata,
  computeRecommendedPresentationClasses,
  isEligibleForAuthenticProductClaim,
  readProductPresentationAssetMetadata,
  resolveProvenanceClass,
  stampProductPresentationAssetMetadata,
} from "@/lib/assets/productPresentationMetadata";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log("  ok ", name);
  } catch (err) {
    failed++;
    console.error(" FAIL", name, err);
  }
}

console.log("check:product-presentation-asset-metadata");

check("source website_ingestion → scraped", () => {
  assert.equal(
    resolveProvenanceClass({ metadata: { source: "website_ingestion" } }),
    "scraped",
  );
});

check("source upload → client_upload", () => {
  assert.equal(
    resolveProvenanceClass({ metadata: { source: "upload" } }),
    "client_upload",
  );
});

check("source component_capture → component_capture", () => {
  assert.equal(
    resolveProvenanceClass({ metadata: { source: "component_capture" } }),
    "component_capture",
  );
});

check("missing source (legacy upload) → client_upload", () => {
  assert.equal(resolveProvenanceClass({ metadata: {} }), "client_upload");
});

check("client upload + high quality product_ui → eligible", () => {
  const meta = computeProductPresentationAssetMetadata({
    metadata: {
      source: "upload",
      product_role: "product_ui",
      asset_quality: "high",
    },
  });
  assert.equal(meta.provenance_class, "client_upload");
  assert.equal(meta.authenticity_for_product_claim, "eligible");
  assert.ok(
    meta.recommended_presentation_classes.includes("AUTHENTIC_PRODUCT_SURFACE"),
  );
  assert.equal(isEligibleForAuthenticProductClaim(meta.authenticity_for_product_claim), true);
});

check("scraped + low quality → ineligible", () => {
  const meta = computeProductPresentationAssetMetadata({
    metadata: {
      source: "website_ingestion",
      product_role: "product_ui",
      asset_quality: "low",
    },
  });
  assert.equal(meta.provenance_class, "scraped");
  assert.equal(meta.authenticity_for_product_claim, "ineligible");
});

check("scraped + high quality → weak (never auto eligible)", () => {
  const meta = computeProductPresentationAssetMetadata({
    metadata: {
      source: "website_ingestion",
      product_role: "dashboard",
      asset_quality: "high",
      analysis_status: "completed",
    },
  });
  assert.equal(meta.authenticity_for_product_claim, "weak");
  assert.ok(
    !meta.recommended_presentation_classes.includes("AUTHENTIC_PRODUCT_SURFACE"),
  );
});

check("logo → ineligible for authentic product appearance", () => {
  const auth = computeAuthenticityForProductClaim({
    provenanceClass: "client_upload",
    productRole: "logo",
    assetQuality: "high",
  });
  assert.equal(auth, "ineligible");
  assert.deepEqual(
    computeRecommendedPresentationClasses({
      authenticity: auth,
      productRole: "logo",
    }),
    ["BRAND_SIGNAL_ONLY"],
  );
});

check("missing new metadata → safe fallback from legacy fields", () => {
  const read = readProductPresentationAssetMetadata({
    source: "upload",
    product_role: "product_ui",
    asset_quality: "high",
    // no provenance_class / authenticity_for_product_claim stored
  });
  assert.equal(read.provenance_class, "client_upload");
  assert.equal(read.authenticity_for_product_claim, "eligible");
  assert.ok(read.recommended_presentation_classes.length > 0);
});

check("component capture without evidence → not eligible", () => {
  const weakish = computeProductPresentationAssetMetadata({
    metadata: {
      source: "component_capture",
      product_role: "product_ui",
      asset_quality: "high",
      analysis_status: "completed",
    },
  });
  assert.equal(weakish.authenticity_for_product_claim, "weak");

  const noEvidence = computeProductPresentationAssetMetadata({
    metadata: {
      source: "component_capture",
      product_role: "product_ui",
      // no quality, no completed analysis
    },
  });
  assert.equal(noEvidence.authenticity_for_product_claim, "ineligible");
});

check("stamp writes all three fields", () => {
  const stamped = stampProductPresentationAssetMetadata({
    source: "upload",
    product_role: "hero_image",
    asset_quality: "medium",
  });
  assert.equal(stamped.provenance_class, "client_upload");
  assert.equal(stamped.authenticity_for_product_claim, "weak");
  assert.ok(Array.isArray(stamped.recommended_presentation_classes));
});

check("branding_prop suitability → ineligible", () => {
  const meta = computeProductPresentationAssetMetadata({
    metadata: {
      source: "upload",
      product_role: "product_ui",
      asset_quality: "high",
      video_suitability: "branding_prop",
    },
  });
  assert.equal(meta.authenticity_for_product_claim, "ineligible");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
