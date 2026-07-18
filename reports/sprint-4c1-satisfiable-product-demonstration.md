# Sprint 4C.1 — Satisfiable Product Demonstration

## 1. Root-cause confirmation

Sprint 4C made product demonstration a hard gate that depended on **prose regex** matching AI image prompts (`ANSWER_VISUAL_RE`, etc.). Production LLM output rarely hit those phrases → `generation_failed` (HTTP 422) → **no package row** → n8n still called Start Video with null `content_package_id` → items stayed `queued` → after 12 minutes UI showed the stale Czech “pipeline neprodukuje balíčky” message.

4C.1 fixes both sides: **structured, injectible product demo** (reliably producible) and **failure settlement** (no queued hang, no Start Video).

## 2. Files changed

| Area | Files |
| --- | --- |
| Failure handling | `lib/api/production-run-admin.ts`, `app/api/n8n/generate-content-package/route.ts`, `app/api/ai/generate-content-package/route.ts`, `n8n/generate-content-package-bridge.json`, live n8n `NAKo5V3Ctlq5aW4i` |
| Structured beat | `lib/scene-types/product-demo/productDemoBeat.ts`, `ensureStructuredProductDemo.ts` |
| Integrity | `lib/creative-candidates/productDemonstrationIntegrity.ts` (`@2`), `storyIntegrity.ts` |
| Generation | `lib/ai/workflows/generateContentPackage.ts`, `regenerateContentPackage.ts` |
| Scene type + raster | `sceneType.ts`, `compileScenePlan.ts`, `analyzePresentation.ts`, `generatedVisualScene.ts`, `composeProductDemoRaster.ts`, `prepareProductDemoSceneRaster.ts`, `sceneRendererRegistry.ts`, `productDemoSceneRenderer.ts`, `languageVariantScenes.ts`, `promptPresentationTypes.ts`, `deriveAllowedSceneTypes.ts` |
| Component-capture | `component-capture-worker/lib/app.ts`, `renderProductDemoChat.ts` |
| Tests | `scripts/check-generation-failed-settlement.ts`, `check-product-demo-structured.ts`, updated integrity checks; `package.json` scripts |

## 3. New structured schema

```ts
{
  type: "product_demo",
  actor_id: "primary_actor",
  conversation_id: string,
  question_visible: true,
  ai_answer_visible: true,
  outcome_visible: true,
  outcome_type: "lead_captured" | "booking_confirmed" | "question_resolved" | "contact_captured",
  visitor_question: string,
  ai_answer: string,
  outcome_label: string,
  brand_name: string // default Fenrik.chat
}
```

Stored as `visual_scenes[]` entry `{ type: "PRODUCT_DEMO", payload: beat }`.

**Source of truth:** structured fields. Prose regex is secondary diagnostics only when the beat is absent.

## 4. Workflow failure-handling changes

On `generation_failed` from generate routes:

1. `markProductionRunItemGenerationFailed` → item `status: failed`, `content_package_id: null`, diagnostics JSON in `error_message`
2. Run `generated_total` / `failed_total` updated; run settles to `completed` when every slot is terminal
3. HTTP **422** still returns real `validation_errors` to the caller immediately
4. n8n **N3b — Package ok?** → Start Video only when `ok === true && data.packageId`; else loop to next package (no Start Video)

Reconcile also counts generation-failed slots (failed items without packages) so runs do not stay “running” forever.

## 5. Component-capture integration

- Video worker: deterministic Sharp SVG chat raster (`composeProductDemoRaster`) for `PRODUCT_DEMO` scenes — question bubble, AI answer, outcome (no empty bubbles / floating icon / smile-only).
- Component-capture worker: `POST /render-product-demo-chat` renders the same controlled HTML via Playwright (branded generic Fenrik chat; no customer URL scrape).
- Lifestyle AI `IMAGE` scenes may surround the controlled UI scene.

## 6. Tests

```bash
npm run check:generation-failed-settlement   # 7
npm run check:product-demo-structured        # 9
npm run check:product-demonstration-integrity # 12
npm run check:story-integrity                # 9
```

Coverage: 422 → item failed → no Start Video branch in bridge → run settlement; structured beat pass/fail; force repair; compile + raster.

## 7. Before / after trace

| Step | Before (4C regression) | After (4C.1) |
| --- | --- | --- |
| LLM package | Prose prompts only | Same + **injected** `PRODUCT_DEMO` beat |
| Product demo gate | Regex on image prompts | Structured fields + renderable chat |
| Repair | One LLM rewrite (often still fails) | One **deterministic** force-inject of PRODUCT_DEMO |
| On fail | 422, item stays `queued` | 422 + item `failed` + diagnostics + run counters |
| n8n | Always Start Video | Start Video **only if** package ok |
| UI after hang | Stale “neprodukuje balíčky” (12 min) | Immediate validation error / failed item |

## Actor continuity (D)

PRIMARY_ACTOR still required for person scenes. Phone close-ups / UI-only / `PRODUCT_DEMO` do not need the actor’s face. Fail only when a **different human identity** appears without narrative continuity.

## Not modified

- Selection v3
- Platform Writing
- General Story Integrity architecture (only product-demo detection now honors structured beats)
