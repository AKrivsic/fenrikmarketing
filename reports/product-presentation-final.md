# Product Presentation — Final Cleanup (Wave 4+)

PPD is the **only** active product-presentation runtime. Legacy `PRODUCT_DEMO` emit, worker renderer, component-capture chat endpoint, and feature flag rollback were removed.

## Changed / removed (high level)

### Removed modules
- `lib/scene-types/product-demo/*` (`ensureStructuredProductDemo`, `productDemoBeat`, `demoVariant`, `composeProductDemoRaster`)
- `lib/scene-types/renderers/productDemoSceneRenderer.ts`
- `video-worker/services/prepareProductDemoSceneRaster.ts`
- `lib/content-package/alignProductDemoNarration.ts`
- `component-capture-worker/lib/renderProductDemoChat.ts` + `/render-product-demo-chat` route
- npm scripts: `check:product-demo-structured`, `check:product-demo-variation`, `check:product-demo-visual-diversity-patch`, `check:product-presentation-wave4`

### Added / replaced
- `lib/content-package/alignOnScreenCtaContract.ts` — on-screen CTA SoT (extracted from demo align)
- `lib/content-package/legacyProductDemoDowngrade.ts` — stored `PRODUCT_DEMO` → AI still at normalize

### Core behavior
- `lib/product-presentation/config.ts` — PPD always enabled; removed `shouldEmitProductDemo` / `shouldRequireProductDemo`
- `lib/product-presentation/planForPackage.ts` — always resolves and persists PPD
- `lib/scene-types/sceneType.ts` — `PRODUCT_DEMO` removed from `SCENE_TYPES`
- `video-worker/services/sceneRendererRegistry.ts` — no product-demo renderer registration
- `generateContentPackage` / `regenerateContentPackage` — no `ensureStructuredProductDemo`, no demo narration align; hard gate = `validateProductPresentationPackage` + slim presentation integrity
- `productDemonstrationIntegrity.ts` v3 — PRIMARY_ACTOR + floating-icon bans only (no structured chat beat)
- `storyIntegrity.ts` — no `product_demonstration_missing` hard gate
- Legacy packages: normalize + analyzer downgrade typed `PRODUCT_DEMO` to `IMAGE`; worker treats unknown `PRODUCT_DEMO` string as `IMAGE` via `effectiveSceneType`

## What was removed
- Structured `PRODUCT_DEMO` ensure / repair / variant rotation
- PRODUCT_DEMO worker raster + Fenrik chat PNG endpoint
- Feature flag `PRODUCT_PRESENTATION_DECISION_ENABLED`
- Generation schema support for new `PRODUCT_DEMO` scenes (validator rejects type)
- SI/PDI requirements for chat-beat / `PRODUCT_DEMO` scene presence

## What stayed (intentionally)
| Area | Why |
|------|-----|
| `lib/product-presentation/*` | Sole presentation runtime |
| `productDemonstrationIntegrity` (renamed header, v3) | Actor continuity + floating-icon bans |
| `productDemonstration` / `productDemonstrationIntegrity` on candidate plan | Persistence / telemetry field names (backward compatible JSON) |
| `productDemonstrability` in commercial scoring | Creative Candidates metric name (not scene type) |
| `render_product_demo_failed` terminal code | Historical API / n8n contract (`generationTerminal.ts`) |
| `RenderProductDemoFailedError` class name | Used for all render fidelity failures (alias) |
| `value_proof_without_product_demo` validation field | Semantic flag in PPD validation result |
| `forbidden_form: brand_logo_as_product_demo` | PPD forbidden form id (not scene type) |
| `reports/audit-*` JSON | Frozen audit artifacts |

## Controls (results)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| `check:product-presentation-decision` | 14 passed |
| `check:product-presentation-validation` | 7 passed |
| `check:product-presentation-asset-metadata` | 12 passed |
| `check:story-integrity` | 15 passed |
| `check:product-demonstration-integrity` | 6 passed |
| `check:package-alignment-fixes` | 2 passed |
| `check:render-fidelity` | 6 passed |
| `check:language-variant-fidelity` | 3 passed |
| `check:generation-failed-settlement` | 19 passed |

No AI generations or video renders were run.

## Remaining `PRODUCT_DEMO` / `productDemo` / `product_demo` references

### Runtime — legacy compatibility only (no active emit/renderer)
- `legacyProductDemoDowngrade.ts`, `visualScenePlan.ts`, `analyzePresentation.ts` — downgrade stored scenes
- `generatedVisualScene.ts` — reject new `PRODUCT_DEMO` in generation validator
- `languageVariantScenes.sceneTypeFromWorkerScene` — map legacy worker type string → `IMAGE`
- Prompts / integrity copy — instruct model **not** to emit legacy type

### Persistence / API names (not scene runtime)
- `productDemonstrationIntegrity`, `product_demonstration_integrity` paths, `productDemonstration` on SI result
- `productDemonstrability` commercial score dimension
- `generationTerminal`: `render_product_demo_failed` error code (legacy label for render failures)

### Documentation / tests
- Check scripts and comments describing legacy downgrade behavior
- `reports/audit-*` historical JSON

### Removed from active runtime
- No `ensureStructuredProductDemo`, no product-demo renderer, no `PRODUCT_DEMO` in `SCENE_TYPES`, no flag rollback, no `/render-product-demo-chat`

## Confirmation

**PPD is the sole supported product-presentation architecture for new packages.** Value proof, appearance claims, and forbidden forms are enforced by `validateProductPresentationPackage`. Legacy `PRODUCT_DEMO` payloads in stored data are downgraded at normalize/analyze/worker type resolution and are not emitted or rendered as chat demos.
