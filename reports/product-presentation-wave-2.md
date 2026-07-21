# Wave 2 Report — Asset provenance & authenticity metadata

**Date:** 2026-07-21  
**Status:** Complete  
**Scope:** Architecture plan §9 step 2 / Wave 2 only — extend library-time asset metadata for PPD inputs  
**Prior:** `reports/product-presentation-wave-1.md`

---

## Goal

Extend the existing asset ingest / analysis / smart-usage metadata (jsonb) so Product Presentation Decision can prefer authentic client assets and refuse AUTHENTIC claims without eligible bindings. No new analysis system, no DB migration, no gate / PRODUCT_DEMO changes.

---

## Changed files

| File | Change |
|---|---|
| `lib/assets/productPresentationMetadata.ts` | **New** — provenance / authenticity / recommended classes + fallbacks + stamp helpers |
| `lib/ai/workflows/analyzeAsset.ts` | Stamp presentation metadata after smart usage (upload + reanalysis path) |
| `lib/knowledge/ingestWebsiteVisuals.ts` | Stamp on website ingest insert + SVG fallback persist |
| `lib/knowledge/componentCapture.ts` | Stamp on component capture insert |
| `app/projects/[id]/assets/actions.ts` | Set `source: "upload"` on manual upload metadata |
| `lib/ai/prompts/generateContentPackage.ts` | Extend `AssetRef` with Wave 2 fields |
| `lib/ai/workflows/packageShared.ts` | `loadAvailableAssets` reads fields (with fallback compute) |
| `lib/product-presentation/resolveProductPresentation.ts` | Prefer eligible; AUTHENTIC only with eligible binding |
| `scripts/check-product-presentation-asset-metadata.ts` | **New** unit/invariant checks |
| `scripts/check-product-presentation-decision.ts` | Wave 2 PPD preference / eligibility cases |
| `package.json` | `check:product-presentation-asset-metadata` script |

**Not changed:** Weekly/Production Strategy, Candidates, DNA, Beats, Hook, VO, SI/PDI gates, `ensureStructuredProductDemo`, PRODUCT_DEMO emit/renderer, commercial scoring.

---

## New metadata policy

Stored on `assets.metadata` (no schema migration):

| Field | Values |
|---|---|
| `provenance_class` | `scraped` \| `client_upload` \| `component_capture` \| `unknown` |
| `authenticity_for_product_claim` | `eligible` \| `weak` \| `ineligible` |
| `recommended_presentation_classes` | subset of PPD presentation classes |

### Provenance mapping (from existing `source` / tags)

| Existing signal | `provenance_class` |
|---|---|
| `source: website_ingestion` / tag | `scraped` |
| `source: upload` \| `manual` \| missing (not scrape/capture) | `client_upload` |
| `source: component_capture` / tag | `component_capture` |
| otherwise | `unknown` |

**Naming note:** Plan used `scraped` / `client_upload`; existing code uses `website_ingestion` / `upload`. We keep storage `source` unchanged and add `provenance_class` as the PPD-facing alias. `unknown` added because library UI already has an unknown source path.

### Conservative authenticity rules

- **Logo / decorative / branding_prop / background_only** → `ineligible` (logo never authentic product appearance).
- **Client upload + product surface (Tier 1/2 roles) + high quality** → `eligible`.
- **Client upload + medium / missing quality on surface** → `weak`.
- **Scraped** → never auto-`eligible`; high/medium surface → `weak`; low → `ineligible`.
- **Component capture** → never auto-`eligible`; high + surface + `analysis_status=completed` → `weak`; otherwise `ineligible`.
- **Recommended classes:** eligible → authentic surface/context; weak → outcome/abstract only; logo → `BRAND_SIGNAL_ONLY`; never synthetic UI.

### When stamped (library-time only)

- Website ingest insert (+ SVG analysis fallback)
- Component capture insert
- Manual upload (`source: upload`) then `analyzeUploadedAsset` enrichment
- Explicit reanalysis via `enrichAssetMetadataWithDimensionsAndSmartUsage`

Package generation **only reads** (via `loadAvailableAssets` → `AssetRef`).

---

## Fallback for old assets

`readProductPresentationAssetMetadata` / PPD resolver:

1. Prefer stored Wave 2 fields when present.
2. If missing, derive from `source`, `product_role`, `asset_quality`, `analysis_status`, `video_suitability`.
3. Missing `source` on non-scrape/capture assets → treat as `client_upload` (matches existing library presentation behavior).

No backfill job required for Wave 2; first reanalysis/ingest refresh stamps fields.

---

## Impact on PPD

Only when `PRODUCT_PRESENTATION_DECISION_ENABLED=true`:

- AUTHENTIC binding requires `authenticity_for_product_claim === eligible`.
- Preference order: eligible → client_upload → higher quality.
- Weak/scraped-only pools fall through to honest non-product classes (outcome / abstract / brand).
- Flag **off**: wrapper still no-op; no persistence; no runtime behavior change beyond unused jsonb stamps on new/reanalyzed assets (harmless to gates).

---

## Gates / PRODUCT_DEMO confirmation

Unchanged in this wave:

- Story Integrity gate
- Product Demonstration Integrity gate
- `ensureStructuredProductDemo` / PRODUCT_DEMO emit
- PRODUCT_DEMO renderer / commercial scoring

---

## Verification results

| Check | Result |
|---|---|
| `npm run check:product-presentation-asset-metadata` | 12 passed |
| `npm run check:product-presentation-decision` | 15 passed |
| `npm run check:smart-asset-usage` | 8 passed |
| `npm run check:manual-asset-metadata` | 19 passed |
| `npm run check:product-role` | 4 passed |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass (exit 0) |

---

## Known risks

1. **Legacy scraped high-quality UI** becomes `weak` under fallback → with flag on, PPD will not AUTHENTIC-bind them until a client upload exists (intentional conservatism).
2. **Component capture** stays non-eligible by default; may under-use real captures until a later explicit trust override (not in Wave 2).
3. **Manual uploads without role/quality** stay weak/ineligible until analysis stamps better signals.
4. Stamping on analyze does not require the feature flag — fields are inert until PPD flag is on.

---

## Recommendation for Wave 3

Retarget validators toward PPD (plan §9 step 3): map forbidden forms / appearance claims into validation messages **without** removing PRODUCT_DEMO yet. Keep dual-run (flag) and leave ensure/emit of PRODUCT_DEMO for Waves 4–5.
