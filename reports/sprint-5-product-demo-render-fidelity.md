# Sprint 5 — Product Demo Render Fidelity

## 1. Root cause

`ensureStructuredProductDemo` correctly injected `{ type: "PRODUCT_DEMO", payload }` into `visual_scenes`.

`normalizeVisualScenePlan` had branches for CHECKLIST / PHONE / QUOTE / STATISTIC / CTA, but **no PRODUCT_DEMO branch**. Typed PRODUCT_DEMO entries have no `source: "ai"|"asset"`, so they fell through and were **silently dropped**.

Integrity validators ran **before** normalize, so they passed on the structured beat. Persisted packages were IMAGE-only. The worker never received PRODUCT_DEMO.

Secondary risk (now fail-closed): presentation analyzer previously could downgrade failed PRODUCT_DEMO eligibility to IMAGE. That path now throws `render_product_demo_failed`.

---

## 2. Files changed

| File | Change |
|---|---|
| `lib/content-package/visualScenePlan.ts` | Preserve PRODUCT_DEMO in normalize; cap without dropping demos |
| `lib/scene-types/presentation/renderFidelity.ts` | **New** — Render Fidelity + `RenderProductDemoFailedError` |
| `lib/scene-types/presentation/analyzePresentation.ts` | Fail-closed: never PRODUCT_DEMO → IMAGE |
| `lib/scene-types/presentation/prepareVisualScenesForVideo.ts` | Assert fidelity after analyzer |
| `lib/ai/workflows/packageShared.ts` | Assert fidelity after worker compile |
| `video-worker/services/prepareProductDemoSceneRaster.ts` | Throw `render_product_demo_failed` on compose/payload failure |
| `scripts/check-render-fidelity.ts` | **New** — Sprint 5 tests |
| `package.json` | `check:render-fidelity` script |

Not redesigned: Selection v3, Story Integrity, Product Demonstration Integrity, Platform Writing.

---

## 3. Where PRODUCT_DEMO was lost

```
ensureStructuredProductDemo()     ← creates PRODUCT_DEMO
validateProductDemonstrationIntegrity()  ← passes (scene still present)
normalizeVisualScenePlan()        ← ★ BUG: silent drop (no branch)
persist package                   ← IMAGE-only
prepareAnalyzed / compile / worker ← never saw PRODUCT_DEMO
```

Also: naive `slice(0, MAX_VIDEO_SCENE_STILLS)` could truncate a trailing PRODUCT_DEMO after append inject. Cap now prefers dropping IMAGE first.

---

## 4. Render Fidelity implementation

`validateRenderFidelity` / `assertRenderFidelity`:

- For every scene index: `planned.type === rendered.type`
- PRODUCT_DEMO → IMAGE or missing → `code: "render_product_demo_failed"`
- Wired at:
  1. After presentation prepare (`prepareAnalyzedVisualScenesForPackage`)
  2. After `compileVisualScenesToWorkerScenes` (`packageShared`)
- Analyzer: invalid / ineligible PRODUCT_DEMO throws `RenderProductDemoFailedError` (no silent IMAGE substitute)
- Worker raster: compose/payload failure throws same code with diagnostics

---

## 5. Tests

```bash
npm run check:render-fidelity
```

| Case | Result |
|---|---|
| Planner PRODUCT_DEMO → Renderer PRODUCT_DEMO | PASS |
| Planner PRODUCT_DEMO → Renderer IMAGE | FAIL (`render_product_demo_failed`) |
| Planner IMAGE → Renderer IMAGE | PASS |
| Planner PRODUCT_DEMO → Missing render | FAIL |
| PRODUCT_DEMO survives `normalizeVisualScenePlan` | PASS |
| Cap preserves PRODUCT_DEMO over IMAGE | PASS |
| Analyzer keeps eligible PRODUCT_DEMO | PASS |
| Analyzer fails instead of downgrading invalid PRODUCT_DEMO | PASS |

Also green: `check:product-demo-structured`, `check:visual-scene-plan`, `check:presentation-analyzer`.

---

## 6. Expected production improvements

- Planned PRODUCT_DEMO scenes persist into the package and reach the worker as `type: PRODUCT_DEMO`
- Closing still becomes the deterministic Fenrik chat UI (Question → AI answer → Outcome), not a mood IMAGE
- Silent PRODUCT_DEMO → IMAGE downgrade is impossible; failures surface as `render_product_demo_failed` with diagnostics
- Validators can no longer pass on a structured beat that was stripped before render
