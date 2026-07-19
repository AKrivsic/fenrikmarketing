# Sprint 5.3.2 — Language variants must reuse video assets

**Date:** 2026-07-19  
**Status:** Complete  
**Verdict:** GO — zero automatic visual generation; zero scene downgrade; visual reuse by default

---

## Final acceptance answers

| Question | Answer |
|----------|--------|
| Can any language variant generate a new AI image? | **No** — prepare requires durable refs; worker sets `forbidImageGeneration`; IMAGE/PHONE providers throw; telemetry fails if `generated_image_count > 0` |
| Can any language variant change a scene type? | **No** — soft-downgrade removed; `assertLanguageVariantVisualFidelity` fails on type mismatch |
| Can any language variant remove primary asset references? | **No** — visual clone preserves `image_bucket` / `image_path` / `asset_id`; stripping was deleted |
| Are voiceover, subtitles and platform texts still semantically localized? | **Yes** — `localizeContentPackage` unchanged |
| Is the visual video identical to the primary video? | **Yes** for stills — same storage rasters reused. On-screen typed text may remain primary-language (accepted this sprint) |

Release acceptance: **zero automatic visual generation · zero scene downgrade · zero automatic visual replacement · visual reuse by default · semantic text/voice localization preserved**

---

## 1. Files changed

| File | Change |
|------|--------|
| `lib/scene-types/languageVariantScenes.ts` | Removed soft-downgrade; visual clone + fidelity + missing-asset errors |
| `lib/scene-types/renderers/types.ts` | `forbidImageGeneration` / `isLanguageVariant` on prepare context |
| `video-worker/services/images.ts` | Telemetry + forbid gen; fail if `generated_image_count > 0` |
| `video-worker/services/prepareImageSceneRaster.ts` | Forbid AI gen / fail missing download on LV |
| `video-worker/services/prepare{Checklist,Phone,Quote,Statistic,Cta,ProductDemo}SceneRaster.ts` | Reuse returns `reusedBucket`/`reusedPath`; forbid recompose/AI on LV |
| `video-worker/jobRunner.ts` | Passes LV flags into image batch |
| `lib/ai/workflows/generateLanguageVariants.ts` | Prepare-before-insert; skip on visual fidelity (no orphan) |
| `lib/ai/workflows/regenerateLanguageVariant.ts` | Same prepare; comments updated |
| `scripts/check-language-variant-fidelity.ts` | Expanded 5.3.2 suite |
| `scripts/check-*-scene-renderer.ts` / `check-*-generation.ts` | Expects preserve, not downgrade |
| `reports/sprint-5.3.2-language-variant-visual-reuse.md` | This report |

---

## 2. Removed downgrade paths

Deleted from language-variant prepare:

- `SOFT_DOWNGRADE_TYPES`
- `downgradeSceneToImage` usage
- Narration-derived `image_prompt` invention
- Stripping of `payload_snapshot`, `renderer_version`, `image_bucket`, `image_path`

**Unchanged:** primary-generation downgrades in `analyzePresentation` / frequency guardrails / `downgradeToImage.ts` (outside language-variant pipeline).

---

## 3. Visual fields now preserved

For every scene index:

- `id`, `type`, order, `duration_seconds`
- `payload_snapshot` (PRODUCT_DEMO validated/normalized only)
- `renderer_version`
- `image_bucket`, `image_path`
- `asset_id` (scene-level)
- PHONE/CTA payload asset refs
- All other shallow-cloned visual fields from primary `render_spec.scenes`

Escape hatch (future manual workflow): `language_variant_manual_visual` / `manual_language_visual` allows differing storage refs without failing fidelity.

---

## 4. Proof that image generation is impossible for language variants

Defense in depth:

1. **Prepare:** every scene must have `image_bucket` + `image_path` or fail `language_variant_visual_asset_missing` (before content_item insert / before regenerate mutate).
2. **Fidelity:** type + storage + asset_id + payload must match primary.
3. **Job input:** `generated_from_language_variant` / `regenerated_language_variant` flags.
4. **Worker:** `forbidImageGeneration: true` → missing refs throw before provider; IMAGE path cannot call provider; PHONE cannot call `generateUiScreenPng`; typed paths cannot recompose.
5. **Telemetry invariant:** `generated_image_count` must be `0` or job fails with `language_variant_visual_invariant_violation`.

---

## 5. Worker-level safeguards

- `jobRunner` detects LV flags and sets `forbidImageGeneration` / `isLanguageVariant`.
- `generateSceneImagesWithTelemetry` logs `reused_visual_asset_count`, `manually_assigned_language_asset_count`, `generated_image_count`.
- Prepare rasters return `reusedBucket`/`reusedPath` on storage reuse so telemetry can count correctly.

---

## 6. Missing-asset behavior

| Condition | Error |
|-----------|--------|
| Missing `image_bucket`/`image_path` at prepare | `LanguageVariantVisualAssetMissingError` (`language_variant_visual_asset_missing`) |
| Download failure on LV | `language_variant_visual_asset_missing: … failed to download …` |
| Any generated still on LV | `language_variant_visual_invariant_violation` |

No AI regeneration. No IMAGE substitution.

Generate path: prepare failure → skip language (warning); **no** content_item insert.  
Regenerate path: prepare failure → throw **before** `snapshotVariant` / updates.

---

## 7. Generate and regenerate path verification

| Path | Visual | Text |
|------|--------|------|
| `generateLanguageVariants` | `prepareRenderScenesForLanguageVariant` before insert; scenes cloned into job input | `localizeContentPackage` VO/subtitles/platforms |
| `regenerateLanguageVariant` | Same prepare before mutate; new job with cloned scenes | Re-localize text only |

Both set LV flags so the worker forbids image generation.

---

## 8. Test results

```
npm run check:language-variant-fidelity  → 24 passed, 0 failed
npm run check:checklist-scene-renderer   → pass (preserves CHECKLIST)
npm run check:phone-scene-renderer       → pass
npm run check:quote-scene-renderer       → pass
npm run check:statistic-scene-renderer   → pass
npm run check:cta-scene-renderer         → pass
npm run check:cta-generation             → pass
npm run check:quote-generation           → pass
npm run check:statistic-generation       → pass
```

Coverage includes: type preservation, storage preservation, no invented prompts, missing-asset fail-closed, PRODUCT_DEMO fidelity, prepare-before-insert/mutate, worker forbid markers, primary `downgradeToImage` still present.

---

## 9. Remaining known risks

1. **On-screen typed text stays primary language** until a future localized-payload sprint (by design).
2. **Feature-flag remapping** in `assertSceneRenderable` may route a typed scene through the IMAGE *renderer* when a type is disabled — still reuses the same storage PNG when refs exist; job input type is unchanged.
3. **Manual per-language assets** are hook-only (`language_variant_manual_visual`); no UI/workflow in this sprint.
4. **Duration fitting** for longer VO uses existing audio/subtitle mechanisms only; visuals unchanged.

---

## 10. Final verdict

**GO for Sprint 5.3.2.**

Language variants are visual clones of the primary completed render. Localization remains text/voice/subtitle/platform only. Automatic AI image generation and typed→IMAGE downgrades are removed from the language-variant pipeline with worker-level enforcement.
