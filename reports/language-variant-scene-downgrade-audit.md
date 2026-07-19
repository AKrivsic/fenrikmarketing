# Language Variant Scene Downgrade Audit

**Date:** 2026-07-19  
**Scope:** Soft downgrade of CHECKLIST / PHONE / QUOTE / STATISTIC / CTA → IMAGE on language-variant video jobs  
**Mode:** Evidence-only. No renderer redesign. No code changes.

---

## Final verdict

**OPTION C — Downgrade is unnecessary. Remove it completely.**

The soft downgrade is **not** required by any renderer limitation. It exists because localization never rebuilds typed payloads (`localizeContentPackage` only localizes VO / subtitles / captions / platform text), and an earlier shortcut converted typed scenes to IMAGE “until payloads are localized.”

That shortcut is worse than preserving typed scenes: it **strips durable `image_bucket` / `image_path`**, invents an AI `image_prompt`, and forces the worker down the IMAGE generation path — contradicting the language-variant contract that visuals are reused.

Preserve typed scenes the same way Sprint 5.3.1 preserves PRODUCT_DEMO (type + payload + storage refs). On-screen copy may remain primary-language until a future payload-localization step; that is a product fidelity gap, not a technical blocker for rendering.

---

## 1. Scene pipeline trace

Shared path for generate and regenerate:

```
Primary completed video_jobs.output.render_spec.scenes[]
  (extractRenderSpecScenes — requires every scene to have image_path)
        ↓
localizeContentPackage
  (voiceover / subtitles / package CTA / platform_outputs ONLY —
   visual / render_spec / scene payloads NOT in schema)
        ↓
prepareRenderScenesForLanguageVariant  ← DOWNGRADE HERE
  lib/scene-types/languageVariantScenes.ts
        ↓
video_jobs.input.scenes (variant job)
        ↓
video-worker jobRunner → generateSceneImages → prepareSceneRaster(type)
        ↓
encode / final MP4
```

| Stage | File | Behavior for soft-downgrade types |
|-------|------|-----------------------------------|
| Extract primary scenes | `lib/ai/workflows/languageVariantsHelpers.ts` `extractRenderSpecScenes` (~L82–101) | Returns scenes **verbatim** only if every scene has `image_path` |
| Localize text | `lib/ai/schemas/localizeContentPackage.ts` (~L10–13, L31–37) | Explicit: visual / render_spec **not** localized |
| Prepare for variant | `lib/scene-types/languageVariantScenes.ts` `prepareRenderScenesForLanguageVariant` (~L105–177) | PRODUCT_DEMO preserved; CHECKLIST/PHONE/QUOTE/STATISTIC/CTA soft-downgraded |
| Call sites | `generateLanguageVariants.ts` (~L366), `regenerateLanguageVariant.ts` (~L231) | Both call prepare before insert/mutate |
| Worker raster | `video-worker/services/images.ts` → typed `prepare*SceneRaster` or `prepareImageSceneRaster` | After downgrade: **IMAGE** path |
| Final video | jobRunner encode | Uses rasters produced above |

Comment at generate path (`generateLanguageVariants.ts` ~L262):

> “Video platforms reuse the package primary render_spec scenes (no image gen).”

This is true only for scenes that keep `image_bucket` + `image_path`. Soft downgrade breaks that.

---

## 2. Exact downgrade locations

### Primary (language variants)

| What | Where |
|------|--------|
| Soft-downgrade allowlist | `lib/scene-types/languageVariantScenes.ts` L26–32 `SOFT_DOWNGRADE_TYPES` |
| Decision + warning | L117–123 — if type ∈ set → warn “payload not localized” |
| Call to shared helper | L146–149 `downgradeSceneToImage({ scene, narration })` |
| Strip typed state + storage | L159–177 — drops `payload_snapshot`, `renderer_version`, `image_bucket`, `image_path`, `type`; sets `type: IMAGE` (`DEFAULT_SCENE_TYPE`) + new `image_prompt` |
| File header rationale | L3–5 — “until per-language payloads exist” |

`downgradeSceneToImage` itself: `lib/scene-types/presentation/downgradeToImage.ts` L132–165. For typed payloads without embedded `media` / `image_prompt` / `asset_id`, it builds an AI prompt from narration (or a CTA-specific still prompt).

Language-variant prepare **does not** pass `requestedType` into `downgradeSceneToImage`, so CTA uses the narration-based prompt path unless `extractExistingImagePayload` finds media (usually it does not for pure typed payloads).

### Not language-variant (out of scope but related)

Primary package presentation analysis also downgrades typed scenes via `analyzePresentation.ts` / frequency guardrails. Those are **primary** pipeline gates, not language-variant prepare. This audit concerns language variants only.

---

## 3. Root cause for every scene type

Stated reason in code (all five): *“payload not localized.”*

| Scene type | Category | Evidence |
|------------|----------|----------|
| **CHECKLIST** | **C** Localization does not rebuild payload + **E** Historical shortcut | `localizeContentPackageSchema` has no scene payloads. Soft path always fires for CHECKLIST regardless of whether renderer can draw `items[]`. No check that renderer failed. |
| **PHONE** | **C** + **E** | Same. Caption / screen refs never localized. Downgrade not gated on `parsePhoneScenePayload` failure. |
| **QUOTE** | **C** + **E** | Same for `quote` / `attribution` / `context`. |
| **STATISTIC** | **C** + **E** | Same for `value` / `label` / `source_line`. |
| **CTA** | **C** + **E** | Same for `headline` / `subline` / `button_label`. |

**Ruled out by evidence:**

| Category | Why not |
|----------|---------|
| **A** Renderer cannot render localized payload | Typed prepare functions accept arbitrary strings within Zod limits and compose SVG/Sharp. No language-variant-specific reject. |
| **B** Payload schema cannot be translated safely | Schemas are plain strings (plus optional enums/ids). Translation of string fields does not break Zod shape. Length limits exist but that is overflow policy, not “cannot translate.” |
| **D** Layout engine cannot adapt translated text | Composers already `wrapLines` / overflow-check (e.g. checklist throws on vertical overflow). Longer translations may fail **recompose**, but that is independent of IMAGE downgrade; reuse of primary raster does not re-layout. |
| **F** No technical reason | Partially: there is a **product** reason (on-screen text stays primary language), but that does not require converting to IMAGE. PRODUCT_DEMO already accepts primary-language on-screen UI on variants. |

---

## 4. Renderer capability analysis

Question: if payload string fields were translated, would rendering still work?

| Type | Payload fields (canonical) | Renderer | Image provider? | Accepts arbitrary strings? |
|------|----------------------------|----------|-----------------|------------------------------|
| CHECKLIST | `title?`, `items[]`, `background_style?`, `item_marker?` | `prepareChecklistSceneRaster.ts` → `composeChecklistRaster` | **No** | Yes within Zod max lengths; wraps + may throw on layout overflow |
| PHONE | `asset_id` **or** `image_prompt`, `caption?` | `preparePhoneSceneRaster.ts` → `composePhoneRaster` | **Only if** recomposing **and** payload uses `image_prompt` (no asset) | Caption is a string; screen is asset or generated UI still |
| QUOTE | `quote`, `attribution`, `proof_id`, `context?` | `prepareQuoteSceneRaster.ts` → `composeQuoteRaster` | **No** | Yes within Zod limits; wrapLines |
| STATISTIC | `value`, `label`, `proof_id`, `unit?`, `source_line?` | `prepareStatisticSceneRaster.ts` → `composeStatisticRaster` | **No** | Yes within Zod limits |
| CTA | `headline`, `subline?`, `button_label?`, composition / assets | `prepareCtaSceneRaster.ts` → `composeCtaRaster` | **No** | Yes within Zod limits; button width scales with label length |

Reuse path (all five): if `scene.image_bucket && scene.image_path`, download storage PNG and **return** — no recompose, no provider.

**Answer:** Translated string fields are renderable by existing composers. There is **no** renderer limitation that forces IMAGE. PHONE is the only typed renderer that can call `getImageProvider()` — and only when storage refs are missing **and** payload uses `image_prompt` rather than `asset_id`. Primary completed jobs that pass `extractRenderSpecScenes` already have storage refs, so PHONE on a preserved scene would **reuse**, not regenerate.

---

## 5. Image generation verification (P0)

### Intended contract

- `generateLanguageVariants.ts` ~L102, ~L262: scenes reused; no image gen.
- `extractRenderSpecScenes`: every scene must have `image_path` so reuse is possible.

### What soft downgrade actually does

In `prepareRenderScenesForLanguageVariant` (L159–177):

1. Removes `image_bucket` and `image_path`.
2. Removes `payload_snapshot`.
3. Sets `type` to IMAGE.
4. Sets a new narration-derived (or fallback) `image_prompt`.

### Worker consequence

`prepareImageSceneRaster.ts` L49–52: reuse only if `image_bucket && image_path`.  
L95–120+: otherwise logs **“Generating scene image”** and calls the image provider.

### Paths that can generate images on language variants

| Path | Generates? | Severity |
|------|------------|----------|
| Soft-downgraded CHECKLIST/PHONE/QUOTE/STATISTIC/CTA → IMAGE without storage refs | **Yes — AI still generation** | **P0** |
| Preserved PRODUCT_DEMO with storage refs | No (reuse / compose only if refs absent) | OK post-5.3.1 |
| Unchanged IMAGE scenes that keep storage refs | No (reuse) | OK |
| Preserved PHONE without refs + `image_prompt` | Yes (UI screen) | Only if refs stripped or missing — soft downgrade causes the strip |

### Conclusion on Part 4

Language variants **must** reuse visual assets. Soft downgrade of typed scenes **violates** that by design: it is the mechanism that **creates** new image generation for those scenes.

**Report as P0:** soft downgrade → IMAGE without durable refs → `prepareImageSceneRaster` generation.

Typed SVG/Sharp renderers themselves do not call image gen (PHONE exception only when recomposing from `image_prompt`).

---

## 6. Can localized payloads be rendered directly?

**Yes**, for CHECKLIST / QUOTE / STATISTIC / CTA:

- Pass translated strings in `payload_snapshot`.
- Keep `type`.
- Either:
  - **Reuse:** keep `image_bucket` / `image_path` → primary-language raster on screen (VO localized) — same tradeoff as PRODUCT_DEMO today; **or**
  - **Recompose:** clear storage refs → Sharp/SVG rebuilds with translated text → **no** diffusion image gen.

**PHONE:**

- Translated `caption` works with reuse or recompose.
- Screen should remain the **same asset** (`asset_id`) or the **same stored raster**; do not re-run `image_prompt` generation on language variants.

**If downgrade were simply removed** (preserve type + payload + refs, no payload translation yet):

| Concern | Outcome |
|---------|---------|
| Layout | Unchanged (reuse primary raster) |
| Overflow | N/A on reuse; on future recompose, existing wrap/overflow rules apply |
| Text wrapping | Already in composers |
| Icons / markers | Payload-driven; unchanged on reuse |
| Animations | These scene types are still rasters in the worker; no type-specific animation dependency on IMAGE |
| Worker compatibility | Typed registry paths already registered |
| Render Fidelity | PRODUCT_DEMO already gated; soft types are not in Render Fidelity fail-closed set |

---

## 7. Risks

| Risk | If downgrade kept | If downgrade removed (preserve typed + refs) |
|------|-------------------|-----------------------------------------------|
| New AI images on variants | **Active (P0)** | Eliminated for these types |
| On-screen text ≠ VO language | Downgrade replaces typed UI with unrelated still | Typed UI stays **primary** language (known gap) |
| Longer translations overflow | N/A (IMAGE) | Only if later recomposing without layout care |
| Silent quality drop | Typed scene → generic still | Avoided |
| Inconsistency with PRODUCT_DEMO | Soft types downgrade; PRODUCT_DEMO preserved | Aligned behavior |

---

## 8. Recommended implementation (do not implement in this audit)

Minimal removal (align with PRODUCT_DEMO):

1. Delete or empty `SOFT_DOWNGRADE_TYPES` handling in `prepareRenderScenesForLanguageVariant`.
2. For CHECKLIST / PHONE / QUOTE / STATISTIC / CTA: return `{ ...scene }` (preserve `type`, `payload_snapshot`, `image_bucket`, `image_path`, `renderer_version`).
3. Keep PRODUCT_DEMO preserve + fail-closed as-is.
4. Add regression: language-variant prepare must not strip storage refs or change these types to IMAGE; worker must log reuse, not “Generating scene image,” for those scenes.
5. Optionally later (separate sprint): extend localization to typed string fields + clear storage refs to force SVG recompose (still **no** IMAGE provider).

Do **not** redesign renderers.

---

## 9. Verdict summary

| Option | Meaning | Selected? |
|--------|---------|-----------|
| **A** Downgrade fundamentally required | Renderer / schema cannot handle typed scenes on variants | **No** |
| **B** Downgrade temporary; remove after payload localization | Framing of the comment, but the IMAGE conversion is the wrong temporary fix | **No** (wrong mechanism) |
| **C** Downgrade unnecessary; remove completely | Preserve typed scenes + assets; localize on-screen copy later if desired | **Yes** |

### One-line verdict

**Downgrade unnecessary** — it is a localization incompleteness shortcut that strips reusable assets and triggers **new image generation**; existing typed renderers already accept string payloads and reuse storage rasters.