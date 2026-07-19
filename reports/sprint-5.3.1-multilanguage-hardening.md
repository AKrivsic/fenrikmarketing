# Sprint 5.3.1 — Multi-Language Fidelity & Production Hardening

**Date:** 2026-07-19  
**Scope:** Multi-language PRODUCT_DEMO fidelity, settlement robustness, asset persistence  
**Non-goals:** New validators, prompt expansion, architecture redesign  

---

## 1. Files changed

| File | Change |
| --- | --- |
| `lib/scene-types/languageVariantScenes.ts` | Preserve PRODUCT_DEMO; fail-closed; Render Fidelity assert |
| `lib/ai/workflows/generateLanguageVariants.ts` | Prepare scenes before insert; fidelity failures skip language cleanly |
| `lib/ai/workflows/regenerateLanguageVariant.ts` | Prepare before mutating variants |
| `lib/api/settleProductionRunItem.ts` | **New** — settle with retries; `SettlementFailedError` |
| `app/api/n8n/generate-content-package/route.ts` | No swallowed settlement; surface `operational_failure` |
| `lib/ai/workflows/generateContentPackage.ts` | `recordAssetUsage` failure → rollback; rollback throws on error |
| `scripts/check-language-variant-fidelity.ts` | **New** regression suite |
| `scripts/check-generation-failed-settlement.ts` | Settlement + asset rollback coverage |
| `package.json` | `check:language-variant-fidelity` |

---

## 2. Multi-language audit

Pipeline traced:

```
Primary package (SI / PDI / Render Fidelity)
  → localizeContentPackageForLanguage (text: VO, subs, captions, platform outputs)
  → prepareRenderScenesForLanguageVariant (scenes)
  → variant video job + TTS
  → worker render
  → platform content_items per language
```

| Layer | Before | After |
| --- | --- | --- |
| PRODUCT_DEMO scene | Silent → IMAGE | **Preserved** or **throw** `render_product_demo_failed` |
| CHECKLIST/PHONE/QUOTE/STATISTIC/CTA | Soft → IMAGE | Unchanged (language-bound payloads) |
| Voiceover / subtitles / captions | Localized | Unchanged |
| Platform outputs | Localized | Unchanged |

Localization still does not rewrite PRODUCT_DEMO chat bubble strings (visual payload reused from primary). Type and semantic beat remain PRODUCT_DEMO so Render Fidelity holds; spoken/subtitle language tracks the variant.

---

## 3. PRODUCT_DEMO preservation verification

- `preserveProductDemoForLanguageVariant` keeps `type: PRODUCT_DEMO` + validated `payload_snapshot`.
- Invalid/missing payload → `RenderProductDemoFailedError` (never IMAGE).
- Per-index + list Render Fidelity checks after prepare.
- Generate path prepares **before** content_item insert so fidelity failure leaves no orphan text row.
- Regenerate prepares **before** snapshot/update.

---

## 4. Render Fidelity verification

Canonical path unchanged. Language variants now enforce:

`planned PRODUCT_DEMO → prepared PRODUCT_DEMO`

No language-specific exception for PRODUCT_DEMO.

---

## 5. Story Integrity verification

Primary SI/PDI unchanged. Language variants inherit story meaning via:

- Same world visuals (PRODUCT_DEMO preserved)
- Localized VO/subs/captions that must still describe the demonstration
- Soft CTA wording still allowed on primary; variants adapt CTA text via localize

No new SI validators added (per sprint scope).

---

## 6. Settlement hardening

- `settleProductionRunItemOrThrow` retries up to 3 times.
- Failure → `SettlementFailedError` → HTTP 422 `operational_failure` with `path: "settlement"`.
- No `settleSafely` swallow.
- No false success when settlement fails.
- Idempotent `markProductionRunItemGenerationFailed` retained.

**Remaining residual:** if settlement permanently fails, the item may still be queued in DB — but the API no longer pretends the failure was settled.

---

## 7. Asset persistence hardening

```
persist package + items
  → create video job (on failure: rollback + throw)
  → recordAssetUsage (on failure: rollback + throw)
```

`rollbackPersistedPackage` now **throws** `operational_failure: rollback failed…` if any delete fails (no silent log-only rollback).

---

## 8. Regression tests

```bash
npm run check:language-variant-fidelity
npm run check:generation-failed-settlement
npm run check:render-fidelity
npm run check:story-integrity
npm run check:product-demonstration-integrity
npm run check:product-demo-structured
npm run check:product-demo-variation
npm run check:cta-scene-renderer   # CTA still soft-downgrades for language
npm run check:quote-scene-renderer
npm run check:phone-scene-renderer
```

All passed.

---

## 9. Remaining known risks

| Risk | Severity | Notes |
| --- | --- | --- |
| PRODUCT_DEMO on-screen chat strings stay primary language | P2 | Type preserved; full UI string localization is a future enhancement |
| Permanent settlement DB outage | P2 | Surfaced as `operational_failure`; may need operator Stop |
| Soft typed scenes (QUOTE/CTA/…) still → IMAGE for variants | P2 | Intentional until localized typed payloads exist |
| Failed video callback → processing until stale reclaim | P2 | Unchanged from prior release |

---

## 10. Final production verdict

**GO** for Fenrik primary + multi-language production, given the residual risks above are accepted.

Multi-language is no longer a silent PRODUCT_DEMO downgrade path. Settlement and asset persistence no longer hide failures.

---

*End of Sprint 5.3.1 report.*
