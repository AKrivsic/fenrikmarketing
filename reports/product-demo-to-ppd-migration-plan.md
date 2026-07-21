# PRODUCT_DEMO → PPD — Implementation / Migration Plan

**Date:** 2026-07-21  
**Status:** Plan only — no implementation  
**Architecture source of truth:** `reports/universal-product-presentation-architecture.md`  
**Related audits:** `reports/product-demo-architecture-audit.md`, `reports/hardcoded-visual-templates-full-audit.md`

**Scope of this document:** Precise map of what to keep, modify, remove, and add so migration can proceed without missed dependencies or leftover dead code.  
**Out of scope:** Code, prompts, migrations, redesign, new architectural layers beyond approved PPD.

**Content-system framing (binding for migration):**

- AI Content Manager produces a long-term content plan (Awareness → Problem Aware → Solution Aware → Conversion), not ad spots.
- Not every package must show the product.
- Not every package must contain a screenshot, dashboard, or chat.
- Product appearance is allowed only when PPD decides it is faithful and strategically appropriate.
- Value proof and product appearance are separate contracts (approved architecture).

---

## 1. Components to Keep

These remain in place; migration must not redesign them. Wiring may later *consume* their outputs, but their role stays.

| Component | Location (representative) | Why keep |
|---|---|---|
| Product Brain / project fields | `projects` (`product_is`, strengths, pain points, knowledge, …) | Input to PPD; unchanged |
| Clients / client projects | `clients`, `client_projects`, … | Unrelated to presentation decision |
| Weekly Strategy | `content_strategies`, strategy generation | Funnel/content plan upstream |
| Content Strategy Items | `content_strategy_items` | Package seeds; funnel stage lives here |
| Content Packages / Items | `content_packages`, `content_items` | Persistence of briefs/outputs |
| Production Runs | `production_runs`, `production_run_items` | Orchestration; settlement patterns stay |
| Creative Candidates / Selection v3 | `lib/creative-candidates/*` (core selection) | Story selection unchanged in role |
| Creative DNA | `lib/creative-candidates/creativeDNA.ts` | Input soft signals only |
| Narrative Beats | `lib/narrative-beats/*` | Story structure |
| Visual Narrative | `lib/visual-narrative/*` | Meaning carrier input to PPD |
| Visual Profile / Visual Medium | `lib/visual-profile/*`, `lib/visual-medium/*` | Rendering style; not PPD |
| Creative Identity | `lib/creative-identity/*` | Staging for AI IMAGE; not product claim |
| Product Reveal (philosophy + resolver) | `lib/product-reveal/*` | **Ceiling** for PPD; keep strategies as-is |
| Asset Library + metadata | `assets`, `lib/assets/*` | Primary path to AUTHENTIC appearance |
| Asset coverage policy | `lib/assets/assetCoveragePolicy.ts` | Soft series guidance; keep |
| Asset scene layout | `video-worker/services/assetSceneLayout.ts` | Authentic framed inserts |
| Typed scenes IMAGE / CHECKLIST / QUOTE / STATISTIC / PHONE / CTA | `lib/scene-types/*` (non–product-demo) | Execution surface after PPD |
| Presentation Analyzer (non–PRODUCT_DEMO paths) | `lib/scene-types/presentation/analyzePresentation.ts` | Keep; PRODUCT_DEMO branch changes later |
| Scene renderer registry (non–PRODUCT_DEMO) | `video-worker/services/sceneRendererRegistry.ts` | Keep IMAGE/PHONE/CTA/… |
| Video engine / jobs | `video_jobs`, `lib/video-engine/*` | Unchanged role |
| TTS / subtitles / motion | worker services | Unrelated |
| Generation terminal settlement | `lib/ai/workflows/generationTerminal.ts`, production-run settle | Keep pattern; error codes adjust later |
| Language variant visual reuse | `lib/scene-types/languageVariantScenes.ts` (general) | Keep reuse principle; PRODUCT_DEMO-specific rules later |
| Platform writing / package platforms | existing package fan-out | Unrelated |
| n8n bridges / Start Video gating on `ok` | routes + n8n | Keep; still depends on generation `ok` |
| Brand tokens for text cards | checklist/quote/statistic/cta tokens | Keep |

**Explicitly keep as capability, not as mandatory product proof:** PHONE + real mobile assets, IMAGE + Tier-1 assets, CTA with real hero/logo, Product Reveal `NO_PRODUCT_VISUAL` / `PRODUCT_OUTCOME` / `ABSTRACT_PRODUCT_SYSTEM`.

---

## 2. Components to Modify

Each entry: why → what changes (purpose) → new purpose. No implementation detail.

### 2.1 Package generation workflows

| Component | Why | What changes | New purpose |
|---|---|---|---|
| `lib/ai/workflows/generateContentPackage.ts` | Today forces ensure + PDI around PRODUCT_DEMO | Replace PRODUCT_DEMO ensure/PDI hard path with PPD plan consumption + new validation contracts; stop requiring typed PRODUCT_DEMO | Produce packages aligned to content strategy + PPD decisions |
| `lib/ai/workflows/regenerateContentPackage.ts` | Same PRODUCT_DEMO path | Same as generate | Parity with generate |
| `lib/ai/workflows/packageShared.ts` (if holds demo-variant helpers) | Run-level demo variant LRU | Remove/replace demo-variant loading with PPD-irrelevant concerns | No chat-variant rotation |

### 2.2 Decision / integrity / scoring

| Component | Why | What changes | New purpose |
|---|---|---|---|
| `lib/creative-candidates/productDemonstrationIntegrity.ts` | Hard-requires structured chat beat + PRODUCT_DEMO scene | Retarget to **Value Proof + Appearance Claim** validation against PPD plan (not chat schema) | Enforce approved contracts without fake UI |
| `lib/creative-candidates/storyIntegrity.ts` | `product_demonstration_missing` / structured beat short-circuit | Value proof presence per PPD modes; funnel-aware (not every package needs product appearance) | Story world continuity + value proof when required by plan |
| `lib/creative-candidates/promptBlocks.ts` | Injects “must include PRODUCT_DEMO” | Point to PPD plan / contracts (content changes later; plan flags the touchpoint) | Candidate guidance without mandatory chat scene |
| `lib/creative-candidates/planForPackage.ts` | Attaches PDI diagnostics | Attach PPD plan + new integrity diagnostics | Persist decision for audit |
| `lib/creative-candidates/types.ts` | `productDemonstrationIntegrity` field | Extend/replace with PPD + new integrity result types | Typed plan surface |
| `lib/creative-candidates/index.ts` | Exports PDI builders | Export PPD + updated validators | Public module surface |
| `lib/creative-candidates/commercialScore.ts` | `productDemonstrability` rewards/penalties can bias toward demo-like UI | Align scoring with fidelity + strategy (authentic when appropriate; not synthetic UI) | Commercial score without fake-demo incentive |
| `lib/creative-candidates/comparativeJudge.ts` | Surfaces `product_demo=` score label | Rename/reinterpret label to presentation/fidelity language | Judge readability |

### 2.3 Scene typing / planning / compile

| Component | Why | What changes | New purpose |
|---|---|---|---|
| `lib/scene-types/sceneType.ts` | `PRODUCT_DEMO` in `SCENE_TYPES` | Remove or deprecate enum member once unused | Scene types without mandatory demo type |
| `lib/scene-types/presentation/deriveAllowedSceneTypes.ts` | Always adds PRODUCT_DEMO when scene types on | Stop auto-adding PRODUCT_DEMO | Allowed types from real capabilities + strategy |
| `lib/scene-types/presentation/promptPresentationTypes.ts` | Exposes PRODUCT_DEMO to generation prompt ceiling | Drop PRODUCT_DEMO from promptable types | Prompt ceiling matches execution |
| `lib/scene-types/presentation/analyzePresentation.ts` | PRODUCT_DEMO gate + fail-closed | Remove PRODUCT_DEMO case; honor PPD forbidden forms / appearance_claim | Analyzer never upgrades fake UI |
| `lib/scene-types/presentation/prepareVisualScenesForVideo.ts` | PRODUCT_DEMO count / never-drop rules | Replace with claim/fidelity preservation rules for authentic asset scenes | Preserve authentic bindings, not chat type |
| `lib/scene-types/presentation/renderFidelity.ts` | `RenderProductDemoFailedError`, PRODUCT_DEMO-specific fail codes | Generalize to appearance-claim / plan fidelity failures | Fail-closed on claim lies, not on missing chat scene |
| `lib/scene-types/compileScenePlan.ts` | Always-compilable PRODUCT_DEMO branch | Remove special PRODUCT_DEMO compile path | Compile remaining types only |
| `lib/content-package/generatedVisualScene.ts` | `VisualSceneProductDemoStored` | Remove PRODUCT_DEMO stored shape | Package visual scene union without demo type |
| `lib/content-package/visualScenePlan.ts` | Normalize preserves PRODUCT_DEMO; truncation prefers keeping it | Preserve authentic asset scenes / PPD bindings instead | Cap logic without chat priority |
| `lib/scene-types/languageVariantScenes.ts` | Absolute PRODUCT_DEMO render fidelity rules | Drop PRODUCT_DEMO-specific absolute rules; keep durable raster reuse generally | Language variants don’t re-invent product UI |

### 2.4 Narration / prompts / reveal touchpoints

| Component | Why | What changes | New purpose |
|---|---|---|---|
| `lib/content-package/alignProductDemoNarration.ts` | Aligns VO to PRODUCT_DEMO | Retarget to “align VO to PPD appearance/value-proof mode” or fold into generic alignment | VO must not contradict authentic product / outcome |
| `lib/ai/prompts/generateContentPackage.ts` | PRODUCT_DEMO ownership lines in stills/exception | Remove PRODUCT_DEMO-as-owner of demonstration; respect PPD | Prompt Builder matches architecture |
| `lib/product-reveal/promptBlocks.ts` | Mentions structured PRODUCT_DEMO placement | Refer to PPD / forbid synthetic UI consistently | Reveal + PPD single philosophy |
| `lib/narrative-beats/promptBlocks.ts` | RESOLUTION “product solving” language | Align with value proof modes (not chat Q→A) | Resolution without assuming UI |

### 2.5 Worker / terminal errors / APIs

| Component | Why | What changes | New purpose |
|---|---|---|---|
| `video-worker/services/sceneRendererRegistry.ts` | Registers PRODUCT_DEMO renderer | Unregister when type removed | Registry matches live types |
| `lib/ai/workflows/generationTerminal.ts` | `render_product_demo_failed` terminal code | Retire or map to generic `render_failed` / claim-fidelity code | Terminal taxonomy without demo type |
| Production-run / n8n error surfaces | May display demo-specific failures | Accept new codes; stop expecting demo repair | Ops clarity |
| Package brief persistence shape | May store `product_demo` / PRODUCT_DEMO scenes | Persist `product_presentation` / PPD plan instead (JSON in existing brief — **plan note only**, no migration design here) | Auditability of decisions |

### 2.6 Tests / scripts (modify or replace)

| Script | Why |
|---|---|
| `scripts/check-product-demonstration-integrity.ts` | Retarget assertions to PPD contracts |
| `scripts/check-story-integrity.ts` | Remove structured-beat-only pass paths |
| `scripts/check-render-fidelity.ts` | Drop PRODUCT_DEMO absolute cases |
| `scripts/check-generation-failed-settlement.ts` | Remove fabricate/PRODUCT_DEMO assumptions |
| `scripts/check-package-alignment-fixes.ts` | Drop after_hours / demo_variant fixtures |
| `scripts/check-language-variant-fidelity.ts` | Drop PRODUCT_DEMO absolute rules |
| `scripts/check-creative-candidates.ts` | Export/wiring expectations |
| `package.json` check scripts | Point to new check names when old ones deleted |

---

## 3. Components to Remove

Remove only when no remaining caller needs them (after PPD path is live and PRODUCT_DEMO is not required).

### 3.1 PRODUCT_DEMO core (delete as a unit)

| Path | Reason removable |
|---|---|
| `lib/scene-types/product-demo/composeProductDemoRaster.ts` | Fake chat SVG renderer |
| `lib/scene-types/product-demo/demoVariant.ts` | Chat layout variants + after-hours heuristics |
| `lib/scene-types/product-demo/productDemoBeat.ts` | Chat-shaped schema (`visitor_question`, `ai_answer`, …) |
| `lib/scene-types/product-demo/ensureStructuredProductDemo.ts` | Inject/complete PRODUCT_DEMO scene |
| `lib/scene-types/renderers/productDemoSceneRenderer.ts` | `product_demo@1` |
| `video-worker/services/prepareProductDemoSceneRaster.ts` | Worker path for fake chat raster |
| `component-capture-worker/lib/renderProductDemoChat.ts` | Parallel Playwright fake chat |
| PRODUCT_DEMO route branch in `component-capture-worker/lib/app.ts` | Only if unused elsewhere |

### 3.2 Obsolete validations / constants / helpers

| Item | Reason |
|---|---|
| Hard requirement “one structured PRODUCT_DEMO per package” | Conflicts with content strategy + PPD |
| `PRODUCT_DEMO_VARIANTS` / `SAFE_PRODUCT_DEMO_VARIANT` / after-hours regex selection | Renderer-specific |
| `PRODUCT_DEMO_OUTCOME_TYPES` as universal proof enum | Chat/lead/booking-shaped |
| `productDemoPlaceholderImagePrompt` | Demo raster placeholder |
| `loadRunRecentDemoVariants` / `extractDemoVariantsFromPackageBriefs` | Variant LRU |
| `RenderProductDemoFailedError` (once generalized) | Type-specific error |
| Default `brand_name: "Fenrik.chat"` in demo schema | Product-specific default |
| PDI codes tied only to chat beat fields (`structured_question_missing`, …) | Replace with claim/value-proof codes |
| Prompt/header strings mandating PRODUCT_DEMO scene | Obsolete |

### 3.3 Dead tests / scripts (after replacement)

| Script | Action |
|---|---|
| `scripts/check-product-demo-structured.ts` | Remove |
| `scripts/check-product-demo-variation.ts` | Remove |
| `scripts/check-product-demo-visual-diversity-patch.ts` | Remove (or rewrite if it only guards stale PB rules — then keep as non-demo patch check) |
| `component-capture-worker/scripts/check-worker.ts` sections for product-demo-chat | Remove if endpoint gone |
| npm scripts: `check:product-demo-*`, `check:product-demonstration-integrity` | Replace with PPD/value-proof checks |

### 3.4 Do **not** remove (common confusion)

| Item | Why keep |
|---|---|
| Product Reveal | Ceiling for PPD |
| Asset Library / framed layouts | AUTHENTIC path |
| Story Integrity (module) | Re-purpose, don’t delete |
| PHONE / CTA / IMAGE renderers | Execution |
| `commercialScore.productDemonstrability` concept | Re-purpose scoring, don’t delete blindly |

### 3.5 Historical packages / reports

- Existing DB rows with `PRODUCT_DEMO` in `package_brief` / job `payload_snapshot` are **legacy artifacts**.
- Plan: no rewrite required for old completed jobs; new generation must not emit PRODUCT_DEMO.
- Audit markdown under `reports/*` stays as history; not runtime.

---

## 4. Components to Add

Only truly new architectural pieces from the approved design:

| New component | Responsibility |
|---|---|
| **Product Presentation Decision (PPD)** | Decision-only layer: presentation class, fidelity, asset binding, appearance claim, value proof mode, forbidden forms, rationale |
| **PPD plan persistence field** (logical) | Store plan on package brief / presentation diagnostics for audit (uses existing JSON surfaces — not a new DB product) |
| **Capability catalog (logical input to PPD)** | Declarative flags of what pipeline can deliver faithfully (authentic asset composite, AI non-UI, text cards) — not a new renderer layer |
| **Replacement checks** | New test scripts asserting PPD invariants (no synthetic UI path; funnel may omit product appearance) |

**Not added:** new renderers, new scene types for “generic product demo”, new vertical-specific engines, new prompt systems (beyond later touchpoint edits listed under Modify).

---

## 5. Pipeline Changes

### 5.1 Today

```text
Product Brain
  → Weekly Strategy / Strategy Item (funnel stage)
  → Creative Candidates + DNA + Narrative Beats
  → Visual Narrative
  → Product Reveal (strategy; often ignored by demo path)
  → Asset coverage prompts (soft)
  → LLM Content Package (visual_scenes; pressured to emit PRODUCT_DEMO)
  → ensureStructuredProductDemo (complete chat beat / variants)
  → alignProductDemoNarration
  → Story Integrity (demo present via structured beat or prose)
  → Product Demonstration Integrity (HARD: chat beat + PRODUCT_DEMO scene)
  → Presentation Analyzer (PRODUCT_DEMO fail-closed)
  → compileScenePlan (product_demo@1 + payload_snapshot)
  → video_jobs
  → prepareProductDemoSceneRaster → fake chat SVG PNG
  → final video
```

### 5.2 Target (approved architecture)

```text
Product Brain
  → Weekly Strategy / Strategy Item (funnel stage: Awareness … Conversion)
  → Creative Candidates + DNA + Narrative Beats
  → Visual Narrative
  → Product Reveal (ceiling)
  → Asset Library (catalog + suitability)
  → Product Presentation Decision (PPD)     ← NEW decision
        outputs: presentation_class, appearance_claim,
                 asset_binding, value_proof_mode,
                 forbidden_forms, rationale
  → Scene Planning / LLM package generation
        respects PPD + funnel (product appearance optional)
  → Validation:
        Value Proof (per PPD mode / strategy need)
        Appearance Claim (AUTHENTIC only with binding)
        Story Integrity (world + non-contradiction)
  → Presentation Analyzer / compile (IMAGE, PHONE, CTA, … + authentic assets)
  → video_jobs
  → Existing renderers (asset layout / AI IMAGE / PHONE / cards)
  → final video
```

### 5.3 Data-flow notes (no schema design)

| Artifact | Today | Target |
|---|---|---|
| Proof of “demo” | `visual_scenes[]` PRODUCT_DEMO + beat | PPD plan + scenes that honor claim |
| Variant | `demo_variant` | Removed |
| Reveal | `presentation_generation.product_reveal` | Unchanged role; PPD must not exceed it |
| Funnel | On strategy item / package | Informs whether value proof / appearance are expected at all |

---

## 6. Validation Changes

### 6.1 Validators / gates that expect PRODUCT_DEMO today

| Gate | Current expectation | Target meaning |
|---|---|---|
| **PDI** `structured_beat_missing` | Fail without chat beat | Fail only if PPD required value proof is unsatisfied **and** policy says hard-fail — never satisfied by synthetic UI |
| **PDI** `product_demo_scene_missing` | Fail without typed PRODUCT_DEMO | **Remove** |
| **PDI** question/answer/outcome field checks | Chat fields must be true | Replace with checks that scenes match `value_proof_mode` + `appearance_claim` |
| **PDI** `assertProductDemoRenderable` / chat SVG | Raster must build | **Remove** |
| **SI** `product_demonstration_missing` | Need ask→answer→result (or structured beat) | Need value proof consistent with PPD + funnel; Awareness may not require product appearance |
| **SI** structured-beat auto-pass | Any valid PRODUCT_DEMO beat passes | **Remove** auto-pass via chat beat |
| **Presentation Analyzer** PRODUCT_DEMO | Payload parse; fail-closed | **Remove** type; enforce forbidden_forms |
| **Render Fidelity** | PRODUCT_DEMO never → IMAGE | Preserve authentic asset scenes / claim; no chat type |
| **normalize / prepare / language variant** | Never drop PRODUCT_DEMO | Never drop authentic bound asset scenes required by PPD |
| **Generation hard fail after PDI** | Package fails without PRODUCT_DEMO | Package fails on claim violation or unsatisfied required value proof — **not** on absence of product UI |
| **alignProductDemoNarration** | VO must match chat demo | VO must not contradict PPD (e.g. problem-state over authentic solution surface) |

### 6.2 Funnel-aware validation intent (architecture-aligned)

| Funnel posture (examples) | Product appearance | Value proof |
|---|---|---|
| Awareness / Problem Aware | Often `NO_PRODUCT_APPEARANCE` | May be story/problem clarity, not product UI |
| Solution Aware | May be AUTHENTIC if assets exist | Outcome / mechanism / authentic surface |
| Conversion | May show product or CTA without fake UI | Clear next step; still no synthetic screenshot |

Exact funnel→PPD policy mapping is an implementation detail later; this plan only requires validators **stop assuming every package needs PRODUCT_DEMO**.

---

## 7. Dependency Map

### 7.1 PPD (new)

| | |
|---|---|
| **Used by** | `generateContentPackage`, `regenerateContentPackage`, Scene Planning / prompt ceiling, validators, package diagnostics |
| **Depends on** | Product Reveal plan, Asset catalog, Visual Narrative, Story/winner, Product Brain, capability catalog |
| **Blast radius if wrong** | Wrong appearance claims; over/under showing product; generation fails or silent philosophy breach |

### 7.2 PRODUCT_DEMO stack (outgoing)

| Component | Used by | Depends on | Change impact |
|---|---|---|---|
| `productDemoBeat` / schema | ensure, PDI, compose, compile, language variants, tests | — | Removing breaks all listed until callers updated |
| `ensureStructuredProductDemo` | generate + regenerate workflows | beat, compose (renderable check), demoVariant | Must delete call sites first |
| `composeProductDemoRaster` | ensure renderable check, prepareProductDemo, tests | beat, demoVariant | Worker + tests |
| `prepareProductDemoSceneRaster` | sceneRendererRegistry | compose, parse beat | Worker can’t render PRODUCT_DEMO |
| `productDemoSceneRenderer` | registry, compile | prepare fn | Unregister |
| `demoVariant` + run LRU | ensure, generate (load recent), tests | package briefs | Remove rotation |
| PDI module | generate/regenerate, promptBlocks, planForPackage, SI delegate | beat, ensure renderable | Retarget before deleting chat checks |
| SI product demo detection | validateStoryIntegrity | extractProductDemoBeat / semantic regex | Retarget |
| `alignProductDemoNarration` | generate/regenerate | PRODUCT_DEMO scenes | Retarget or replace |
| `renderFidelity` PRODUCT_DEMO | prepareVisualScenes, normalize, language variants, generationTerminal | RenderProductDemoFailedError | Generalize |
| `deriveAllowedSceneTypes` / prompt types | package generation | SCENE_TYPES | Stop advertising PRODUCT_DEMO |
| component-capture chat render | worker app endpoint | beat-like payload | Remove with care if unused externally |
| check scripts / npm scripts | CI / local | all of the above | Update CI or green builds break |

### 7.3 Must stay coherent together

| Cluster | Members | Rule |
|---|---|---|
| Reveal ↔ PPD | `resolveProductReveal`, PPD | PPD ≤ Reveal ceiling always |
| Assets ↔ AUTHENTIC | Asset Library, assetSceneLayout, PHONE asset path, PPD `asset_binding` | No AUTHENTIC without binding |
| Settlement | generationTerminal, production-run-admin, n8n ok gate | Error codes updated in one pass |
| Language variants | languageVariantScenes + durable rasters | Don’t reintroduce synthetic demo on translate |

### 7.4 Hidden / easy-to-miss dependencies

- `commercialScore` / comparativeJudge strings (`product_demo=`) — selection diagnostics, not renderer, still bias behavior.
- Default Fenrik brand on beat schema — can leak into any project that still emits beats during transition.
- Truncation / cap logic preferring PRODUCT_DEMO over IMAGE — must not silently prefer fake UI.
- Prompt Builder lines that still assign demonstration ownership to PRODUCT_DEMO (`generateContentPackage.ts`) — dual contract risk during transition.
- `RenderProductDemoFailedError` caught broadly in terminal classification — renaming affects ops dashboards.
- Golden/regression fixtures and audit zips under `reports/` — not runtime, but tests may import shapes.
- `check-product-demo-visual-diversity-patch.ts` may still be useful for Prompt Builder staleness — evaluate before delete.

---

## 8. Recommended Implementation Order

Safe order: **decide → validate without fake UI → stop emitting → remove render path → delete dead code**.

1. **Introduce PPD** (decision module + plan shape + diagnostics attach) behind a flag; Product Reveal remains ceiling; do not remove PRODUCT_DEMO yet.  
2. **Wire PPD into generate/regenerate** after Reveal + asset load; persist plan on package diagnostics/brief.  
3. **Retarget validators** (PDI → Value Proof + Appearance Claim; SI product-demo clause) to honor PPD + funnel; allow packages with `NO_PRODUCT_APPEARANCE`.  
4. **Stop requiring / advertising PRODUCT_DEMO** in deriveAllowedSceneTypes, promptPresentationTypes, promptBlocks, Prompt Builder ownership lines.  
5. **Stop emitting PRODUCT_DEMO** from LLM contract + ensure path (disable `ensureStructuredProductDemo` call sites; no fabricate).  
6. **Retarget narration alignment** from PRODUCT_DEMO to PPD modes.  
7. **Generalize render fidelity / analyzer / normalize / language-variant** away from PRODUCT_DEMO absolutes.  
8. **Unregister worker PRODUCT_DEMO renderer** + remove compile branch (only when no new jobs emit the type).  
9. **Remove chat SVG / demoVariant / beat / ensure / component-capture chat** + related npm checks.  
10. **Align commercialScore / comparativeJudge** labels and incentives with fidelity (no synthetic UI reward).  
11. **CI cleanup** — replace old check scripts; confirm generation settlement codes; smoke Awareness and Conversion packages (with and without assets).  
12. **Dead-code sweep** — grep for `PRODUCT_DEMO`, `demo_variant`, `visitor_question`, `composeProductDemo`, `after_hours_response`; remove leftovers.

**Transition rule:** Until step 5, legacy PRODUCT_DEMO may still exist for rollback, but must not be the satisfiability path for non-chat products. After step 8, synthetic PRODUCT_DEMO is gone from runtime.

---

## Success criteria for this migration (plan-level)

- New packages can complete for Awareness/Problem Aware **without** product UI.  
- Solution/Conversion packages use AUTHENTIC assets when PPD binds them; otherwise outcome/abstract/none — **never** fake chat.  
- Product Reveal and PPD do not contradict.  
- No runtime dependency on `composeProductDemoRaster` / `demo_variant`.  
- Grep-clean of mandatory PRODUCT_DEMO gates in generation.  
- Long-term content plan posture preserved: strategy first, product appearance optional.

---

*End of Implementation / Migration Plan. No code changes in this step.*
