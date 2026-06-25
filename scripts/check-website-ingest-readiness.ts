import assert from "node:assert/strict";
import { extractWebsiteImageCandidates } from "@/lib/knowledge/extractWebsiteImageCandidates";
import {
  pickLargestFromSrcset,
  resolveImgTagUrl,
} from "@/lib/knowledge/websiteImageParseHelpers";
import { prioritizeWebsiteImageCandidates } from "@/lib/knowledge/websiteImagePrioritize";
import { rejectWebsiteImageCandidate } from "@/lib/knowledge/websiteImageRejectHeuristics";
import { isSvgUrl } from "@/lib/knowledge/websiteImageParseHelpers";

const base = "https://example.com/";

// --- SVG logo in HTML ---
const svgHtml = `<html><body><img src="/brand/logo.svg" alt="Acme logo"/></body></html>`;
const svgCandidates = extractWebsiteImageCandidates(svgHtml, base);
assert.ok(
  svgCandidates.some((c) => c.url.includes("logo.svg")),
  "SVG logo URL extracted",
);
assert.ok(isSvgUrl("https://example.com/brand/logo.svg"));

// --- data-src lazy ---
const lazyHtml = `<img data-src="/lazy-hero.jpg" alt="Hero"/>`;
const lazyUrl = resolveImgTagUrl(lazyHtml.match(/<img[^>]*>/)![0], base);
assert.ok(lazyUrl?.includes("lazy-hero.jpg"));
const lazyExtracted = extractWebsiteImageCandidates(
  `<html><body>${lazyHtml}</body></html>`,
  base,
);
assert.ok(lazyExtracted.some((c) => c.url.includes("lazy-hero.jpg")));

// --- srcset picks largest ---
const srcsetPick = pickLargestFromSrcset(
  "/small.jpg 400w, /large.jpg 1200w",
  base,
);
assert.ok(srcsetPick?.includes("large.jpg"));
const srcsetHtml = `<img srcset="/a.jpg 100w, /b.jpg 800w" alt="Product"/>`;
const srcsetUrl = resolveImgTagUrl(
  srcsetHtml.match(/<img[^>]*>/)![0],
  base,
);
assert.ok(srcsetUrl?.includes("b.jpg"));

// --- picture ---
const pictureHtml = `
<picture>
  <source srcset="/hero-400.jpg 400w, /hero-1600.jpg 1600w" type="image/jpeg"/>
  <img src="/hero-fallback.jpg" alt="Hero banner"/>
</picture>`;
const pictureCandidates = extractWebsiteImageCandidates(
  `<html><body>${pictureHtml}</body></html>`,
  base,
);
assert.ok(
  pictureCandidates.some(
    (c) => c.url.includes("hero-fallback.jpg") || c.url.includes("hero-1600"),
  ),
);

// --- cookie filtering ---
assert.equal(
  rejectWebsiteImageCandidate({
    kind: "img",
    url: "https://cdn.example.com/onetrust-banner.png",
    alt: "Cookie consent",
  }),
  "cookie_consent",
);

// --- payment filtering ---
assert.equal(
  rejectWebsiteImageCandidate({
    kind: "img",
    url: "https://example.com/assets/visa-mastercard.png",
    alt: "Accepted cards",
  }),
  "payment_badge",
);

// --- favicon vs logo priority ---
const mixed = [
  { kind: "favicon" as const, url: "https://example.com/favicon.ico" },
  {
    kind: "img" as const,
    url: "https://example.com/logo.svg",
    alt: "Company logo",
  },
  {
    kind: "og_image" as const,
    url: "https://example.com/og.png",
  },
];
const ordered = prioritizeWebsiteImageCandidates(mixed, 3);
assert.equal(ordered[0]?.url.includes("logo.svg"), true);
const faviconIdx = ordered.findIndex((c) => c.kind === "favicon");
if (faviconIdx >= 0) {
  assert.ok(faviconIdx > 0, "favicon must not outrank real logo");
}

console.log("ok website ingest readiness");
