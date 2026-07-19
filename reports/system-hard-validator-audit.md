# System-Wide Audit — Hard Validators and Generation Gates

**Date:** 2026-07-19  
**Scope:** Audit only — no code changes  
**Goal:** Technically reliable production, no stuck runs, no semantic corruption, strong Product Demonstration, preserved creative freedom, universal client support

---

## 1. Executive verdict

The pipeline has **strong technical fidelity protections** (especially Sprint 5 Render Fidelity: `PRODUCT_DEMO` must never silently become `IMAGE`) and a **correct Sprint 5.2 fix** (CTA wording is a Story Integrity warning, not a hard fail).

The dominant systemic risk is **not** “too few gates.” It is that **Product Demonstration is implemented as a chatbot UI contract** (`visitor_question` → `ai_answer` → lead/booking outcome, Fenrik.chat framing, controlled chat raster) and is **hard-required for every video package** when Creative Candidates run. That is product-truth for Fenrik.chat, but it is **not** the universal semantic definition (input → product performs value → visible outcome). Hotels, cleaning companies, accountants, restaurants, e-commerce, and non-chat SaaS will fail or be force-injected into booking/chat demos.

**Second P0:** Thrown errors after LLM success (`RenderProductDemoFailedError` during normalize / presentation / `buildVideoJobInput`, DB errors mid-persist) return **HTTP 500 `internal_error`** and **do not** call `markProductionRunItemGenerationFailed`. Only soft `generation_failed` envelopes settle run items. That can leave slots **queued forever**.

**Severity posture to keep:** product truth (`forbidden_claims` / `product_is_not`), Render Fidelity, structured PRODUCT_DEMO fidelity *once the demo form is correct for the product*, technical completeness (media, schema, worker preconditions).

**Severity posture to change:** chatbot-specific ask→AI→lead as universal hard Story/Product-Demo integrity; concept fidelity that soft-continues after failed repair; actor/world regex heuristics that over-constrain metaphor and non-UI continuity; force-inject of Fenrik chat defaults as “repair.”

---

## 2. Complete pipeline gate map

```
Weekly Strategy
  → Strategy Item
  → Creative Candidates (+ Selection / DNA / Narrative Beats)
  → Content Package LLM (schema + guardrails + repair loop)
  → Concept Fidelity (1 repair, soft continue)
  → ensureStructuredProductDemo (inject)
  → Story Integrity (1 full regenerate repair → hard fail)
  → Product Demonstration Integrity (force inject → hard fail)
  → Diagnostics (story/visual/information progression — warn only)
  → normalizeVisualScenePlan (+ frequency downgrades)
  → persist package + content_items
  → buildVideoJobInput
       → prepareAnalyzedVisualScenesForVideo
       → analyzePresentation (+ typed→IMAGE downgrades; PRODUCT_DEMO fail-closed)
       → assertRenderFidelity
       → compile scenes
  → insert video_jobs (queued)
  → video worker (images, VO, subtitles, raster, render, callback)
  → reconcile production_run
```

| Stage | Primary files / functions | Hard fail | Retry / repair | Warn | Silent fallback | Stuck risk |
| --- | --- | --- | --- | --- | --- | --- |
| Weekly strategy | `lib/ai/workflows/weeklyStrategy.ts`, `weeklyStrategyGate.ts` | Guardrails → `generation_failed`; missing strategy → `missing_weekly_strategy` | `generateValidatedJson` ≤3 | — | — | Low if settled |
| Strategy item preconditions | `assertGenerateContentPackagePreconditions` | Cross-project / missing item → `WorkflowError` | — | — | Production-run items skip week gate | Medium if cancel race |
| Creative Candidates | `lib/creative-candidates/planForPackage.ts`, `genericity.ts`, `comparativeJudge.ts` | Rejects candidates (selection still picks from pool) | Divergence re-sample (internal) | Soft DNA | Generic rejection | Low |
| Creative DNA | `creativeDNA.ts`, diagnostics in generate | Soft (`console.warn`) | — | Yes | — | None |
| Narrative Beats | narrative beat plan + duration validation | Soft | — | Yes | — | None |
| Package LLM | `generateValidatedJson` / `runWithRepair.ts` | After attempts → `generation_failed` | Parse repair + ≤3 regenerates | — | Loose JSON repair | Settled if `!ok` |
| Package guardrails | `lib/ai/guardrails.ts` `checkContentPackageGuardrails` | Via generation_failed | Same loop | — | — | Settled if `!ok` |
| Concept Fidelity | `fidelityCheck.ts` / generate | **No hard fail after repair** | 1 full regenerate | Diagnostics attached | Package may ship unfaithful | Quality risk |
| PRODUCT_DEMO inject | `ensureStructuredProductDemo.ts` | — | Force replace resolution | — | **Injects chat defaults** | Semantic corruption |
| Story Integrity | `storyIntegrity.ts` | Hard after 1 repair | 1 full regenerate | `cta_mismatch` | — | Settled if `!ok` |
| Product Demo Integrity | `productDemonstrationIntegrity.ts` | Hard after force inject | Deterministic inject | — | Force chat scene | Settled if `!ok` |
| Scene normalize | `visualScenePlan.ts` | `RenderProductDemoFailedError` throw | — | Cap truncate warn | Drop invalid non-demo types | **P0: throw ≠ settle** |
| Frequency guardrails | `*FrequencyGuardrail.ts` | — | — | Decisions logged | Typed → IMAGE | Safe for non-demo |
| Persist | `persistNewPackage` in generate | DB throw | Unique violation → idempotent return | — | — | Partial insert risk |
| Job input / presentation | `packageShared.buildVideoJobInput`, `prepareVisualScenesForVideo`, `analyzePresentation` | PRODUCT_DEMO fail-closed; fidelity assert | — | Typed downgrades | Non-demo → IMAGE | **P0 after persist** |
| Video worker | `video-worker/jobRunner.ts`, prepare*Raster | Failed callback | Transport retries | Cancel skip | — | Callback fail leaves processing |
| Video callback | `lib/n8n/handlers.ts` | Late completed rejected if cancelled | — | — | Package has no `failed` status | Item reconcile |
| Production run settle | `markProductionRunItemGenerationFailed`, `syncRunItemsAndCounters` | Item/run terminal | — | — | Generation fail → no video | Open if unsettle |

**Cancel path:** `isProductionRunCancelledForStrategyItem` skips generation; Stop cancels open video jobs; late `completed` callbacks cannot revive cancelled jobs (`handlers.ts`).

---

## 3. Full validator inventory

Columns: **Name** | **File** | **Function** | **Stage** | **Error code** | **Current severity** | **Retry/repair** | **Consequence** | **Scope**

### A. Generation / schema / guardrails

| Name | File | Function | Stage | Error code | Severity | Retry/repair | Consequence | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| JSON parse + schema | `lib/ai/runWithRepair.ts` | `generateValidatedJson` | LLM output | `generation_failed` | Hard after maxAttempts (3) | 1 JSON repair/attempt + regenerate | No persist | Package |
| Content package guardrails | `lib/ai/guardrails.ts` | `checkContentPackageGuardrails` | Post-schema | paths under `$` / `$.cta` / etc. | Hard (via runner) | Same | No persist | Package |
| Forbidden claims / product_is_not | same | same | Copy | `forbidden_claim` / `product_is_not` | **CRITICAL hard** | Regenerate | No persist | Package |
| Corporate copy ban | same | same | Copy | corporate phrase | Hard | Regenerate | No persist | Package |
| Voiceover hard cap | same | same | VO | `voiceover_text` length | Hard | Regenerate | No persist | Package |
| CTA type vs goal | same | same | CTA | `$.cta.type` | Hard | Regenerate | No persist | Package |
| Funnel stage match | same | same | Meta | `$.funnel_stage` | Hard | Regenerate | No persist | Package |
| Required platforms / video / VO / subs | same | same | Completeness | various | Hard | Regenerate | No persist | Package |
| Scene still count | same | same | Cost | image_prompts count | Hard | Regenerate | No persist | Package |
| Weekly strategy guardrails | `guardrails.ts` + `weeklyStrategy.ts` | strategy checkers | Strategy | `generation_failed` | Hard | ≤3 | No strategy persist | Run/week |
| Missing weekly strategy | `weeklyStrategyGate.ts` | `assertGenerate…` | Precondition | `missing_weekly_strategy` | Hard | — | 422; no settle helper | Package |
| Production run cancelled skip | same | `isProductionRunCancelled…` | Precondition | `skipped` success | Soft skip | — | No gen | Package |

### B. Creative / story gates

| Name | File | Function | Stage | Error code | Severity | Retry/repair | Consequence | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Concept Fidelity | `fidelityCheck.ts` | `checkConceptFidelity` | Post-LLM | fidelity reason strings | **Repair then soft continue** | 1 full regenerate | May ship | Package |
| Story Integrity hard codes | `storyIntegrity.ts` | `validateStoryIntegrity` | Post-LLM | `main_conflict_disappeared`, `product_demonstration_missing`, `primary_actor_changed`, `location_changed_without_reason`, `abstract_metaphor_in_middle`, `world_abandoned` | Hard after 1 repair | 1 full regenerate | `generation_failed` + settle | Package |
| Story Integrity CTA | same | same | Post-LLM | `cta_mismatch` | **Warning (5.2)** | Logged | Package succeeds | Package |
| Product Demo Integrity | `productDemonstrationIntegrity.ts` | `validateProductDemonstrationIntegrity` | Post-LLM | `structured_*`, `product_demo_scene_missing`, `component_capture_not_renderable`, prose codes if no beat, actor identity, floating icon | Hard after force inject | `ensureDemo(true)` | `generation_failed` + settle | Package |
| ensureStructuredProductDemo | `ensureStructuredProductDemo.ts` | same | Pre-integrity | — | Repair inject | Deterministic chat beat | Can rewrite resolution | Package |
| Story / visual / info progression | generate workflow | validators | Diagnostics | summaries | Warning | None | Continue | Package |
| Creative DNA package validation | DNA validators | `validateCreativeDnaAgainstPackage` | Diagnostics | violations | Warning | None | Continue | Package |
| Duration / metaphor clarity | narrative beats | validators | Diagnostics | — | Warning | None | Continue | Package |
| Genericity / candidate reject | `genericity.ts`, scoring | selection | Candidates | reject reasons | Soft (candidate) | Pool selection | Different winner | Package |

### C. Presentation / render

| Name | File | Function | Stage | Error code | Severity | Retry/repair | Consequence | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Normalize PRODUCT_DEMO payload | `visualScenePlan.ts` | `normalizeVisualScenePlan` | Pre-persist | `render_product_demo_failed` | Hard throw | None | **500, may not settle** | Package |
| Frequency: CTA/QUOTE/PHONE/CHECKLIST/STATISTIC | `*FrequencyGuardrail.ts` | apply* | Pre-persist | decisions | Soft downgrade | Downgrade→IMAGE | Continues | Package |
| Presentation eligibility | `analyzePresentation.ts` | `eligibilityCheck` / `analyzePresentation` | Job input | gate reasons | Non-demo: downgrade; PRODUCT_DEMO: throw | None | Fail closed for demo | Package (post-persist risk) |
| Render Fidelity | `renderFidelity.ts` | `assertRenderFidelity` | Job input + prepare | `render_product_demo_failed` / `render_fidelity_failed` | Hard throw | None | Fail | Package |
| Cap preserving PRODUCT_DEMO | `renderFidelity.ts` | `capScenesPreservingProductDemo` | Cap | — | Prefer drop non-demo | — | Continues | Package |
| Asset unrenderable | `assetRendererEligibility.ts` | `downgradeUnrenderableAssetScenes` | Prepare | reasons | Soft downgrade | →IMAGE | Continues | Package |
| Language variant typed scenes | `languageVariantScenes.ts` | — | Localize | warnings | Soft | →IMAGE | Continues | Variant |
| Typed render gates (feature flags) | `cta/phone/quote/statisticRenderGate.ts` | shouldRender* | Worker path | — | Soft disable→IMAGE | — | Continues | Package |
| PRODUCT_DEMO raster | `prepareProductDemoSceneRaster.ts`, `composeProductDemoRaster.ts` | prepare/compose | Worker | `render_product_demo_failed` / throw | Hard | Worker fail callback | `video_jobs.failed` | Package |
| Scene renderer missing | `renderers/types.ts` | registry | Worker | throw | Hard | Fail callback | Video fail | Package |

### D. Production / ops

| Name | File | Function | Stage | Error code | Severity | Retry/repair | Consequence | Scope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| generation_failed settle | `production-run-admin.ts` | `markProductionRunItemGenerationFailed` | After `!ok` | JSON diagnostics | Operational settle | — | Item failed; run may complete | Item / run |
| Video callback cancel guard | `n8n/handlers.ts` | video callback | Callback | cancelled message | Hard reject revive | — | Stay failed | Job |
| Video job failure | `jobRunner.ts` | `runVideoJob` | Render | failed callback | Operational | Transport | Item reconcile failed | Package |
| Package status on video fail | handlers | — | Callback | — | Package has **no** `failed` | — | Draft unchanged | Package |
| Operator stop | `production-run-admin.ts` / cancel | stop | Ops | cancelled | Hard | Cancel jobs | Run cancelled | Run |
| DB unique strategy_item | generate persist | `isUniqueViolation` | Persist | 23505 | Soft idempotent | Return existing | Continues | Package |
| Provider timeout / transport | AI providers | complete | LLM | various | Operational | maxTransportAttempts | → generation_failed or throw | Package |

---

## 4. Current severity matrix (condensed)

| Gate | Current | Stops package? | Stops run? | Notes |
| --- | --- | --- | --- | --- |
| forbidden_claims / product_is_not | CRITICAL hard | Yes | No (other items continue) | Correct |
| Schema / required fields / platforms | Hard | Yes | No | Correct |
| Corporate copy / VO hard cap / CTA×goal / funnel match | Hard | Yes | No | Mostly justified; corporate list can FP |
| Concept Fidelity | Repair then soft | No | No | May ship incoherent story |
| Story Integrity (non-CTA) | Hard after 1 repair | Yes | No | Includes chatbot demo requirement |
| Story Integrity CTA | Warning | No | No | Correct (5.2) |
| Product Demo Integrity | Hard after inject | Yes | No | Chatbot schema |
| Progression / DNA / duration | Warning | No | No | Correct |
| Frequency typed→IMAGE | Soft fallback | No | No | Correct for non-demo |
| PRODUCT_DEMO→IMAGE | Hard fail | Yes (throw) | Risk stuck | Correct semantic; wrong settlement path |
| Render Fidelity type mismatch | Hard | Yes (throw) | Risk stuck | Same |
| Worker render / raster | Hard job fail | Video fail | No | Package may remain non-failed |
| generation_failed envelope | Hard settled | Yes | Settles slot | Correct |
| Thrown internal_error | Unsettled | Often yes | **Can stall run** | P0 |

---

## 5. Recommended severity matrix

| Gate | Current | Recommended | Repair first? | Stops package? | Stops run? | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| forbidden_claims / product_is_not | Hard | **CRITICAL hard** | Yes (regen) | Yes | No | Product truth |
| Wrong project / cross-project | Hard | **CRITICAL hard** | No | Yes | No | Data integrity |
| Schema / missing media fields | Hard | **CRITICAL hard** | Yes | Yes | No | Unusable package |
| Render Fidelity / PRODUCT_DEMO→IMAGE | Hard | **CRITICAL hard** | Targeted repair if pre-persist | Yes | No | Semantic corruption |
| Structured demo missing *for products that use demo* | Hard | **CRITICAL hard** (scoped) | Targeted inject of **correct demo form** | Yes | No | Keep fidelity; widen form |
| Ask→AI→lead as universal demo | Hard | **WARNING or product-role CRITICAL** | Prefer role-based | Only if product role requires chat | No | Over-constraint |
| Story world / conflict / actor heuristics | Hard | **REPAIRABLE → WARNING on soft heuristics**; keep hard only for clear world abandonment | Targeted | Rarely | No | High FP / creative limit |
| `abstract_metaphor_in_middle` | Hard | **WARNING** (or soft unless concept forbids) | Optional | No | No | Forces literalism |
| CTA wording | Warning | **WARNING** | No | No | No | Keep 5.2 |
| Concept Fidelity | Soft after repair | **REPAIRABLE**; after exhaustion **WARNING + diagnostics** (not silent) | Targeted opening/hook | No | No | Don’t burn 2nd full package unless critical |
| Corporate phrase list | Hard | **WARNING** unless claim-like | Optional | No | No | Style ≠ truth |
| VO hard cap | Hard | Keep **Hard** (cost/runtime) | Regen | Yes | No | Operational + UX |
| CTA type vs goal | Hard | Keep **Hard** | Regen | Yes | No | Goal coherence |
| Funnel stage mismatch | Hard | Keep **Hard** | Regen | Yes | No | Strategy integrity |
| Typed scene frequency → IMAGE | Soft | Keep **safe fallback + log** | No | No | No | Graceful |
| Force Fenrik chat inject as repair | Repair | **REPAIRABLE only with product-appropriate beat**; else fail with clear code | Targeted | Yes if cannot demonstrate | No | Prevent fake chat demos |
| Provider timeout / 500 / mid-persist throw | Often unsettle | **OPERATIONAL FAILURE** + always settle item | Retry transport | Mark failed | No | No stuck runs |
| Video worker crash | Job failed | **OPERATIONAL** | Retry policy separate | Item failed via reconcile | No | Keep cancel guards |
| Progression / DNA / duration | Warning | **WARNING** | No | No | No | Correct |

---

## 6. Over-constraint findings

Evidence that creative **guidance became mandatory templates**:

1. **PRODUCT_DEMO required for every video package** with Creative Candidates (`generateContentPackage.ts` integrity block; prompt: “Every video package MUST include…”). No funnel/awareness exemption.

2. **Demo = chat UI** — schema fields `visitor_question`, `ai_answer`, `conversation_id`, outcomes `lead_captured|booking_confirmed|question_resolved|contact_captured`, default brand `Fenrik.chat`, SVG chat composer (`composeProductDemoRaster.ts`, `buildDefaultProductDemoBeat`).

3. **Story Integrity prompt lexicon** steers phone/website/chat/booking/lead (`buildStoryIntegrityPromptBlock`).

4. **Ask / Answer / Result regexes** are chatbot/booking-heavy (`ASK_RE`, `ANSWER_RE`, `ASK_VISUAL_RE`, etc.).

5. **Primary actor continuity** treats phone/chat/website as acceptable substitutes — biases toward UI montages.

6. **Forbidden world patterns** in middle beats (fog, silhouettes, airport, space, analytics montage) hard-fail unless concept mentions them — reduces metaphorical storytelling even when intentional.

7. **ensureStructuredProductDemo(force)** can replace last non-CTA scene with a default “Do you have availability tomorrow?” / Fenrik.chat chat — template ending.

8. **Demo variants** are all chat compositions (`conversation_answer`, `lead_capture`, `booking_confirmation`, `after_hours_response`).

9. **Corporate copy ban** + **CTA type locked to goal** + **action-oriented outcome enums** narrow endings.

10. **Concept fidelity token overlap** can punish valid paraphrases / visual metaphors (mitigated partly by NO_TEXT stripping).

Not found as hard gates: identical CTA wording (soft), identical actor face in UI scenes (explicitly allowed to skip face).

---

## 7. PRODUCT_DEMO universality audit

### Universal (architecture intent)

- Scene type `PRODUCT_DEMO` always allowed when scene types on (`deriveAllowedSceneTypes.ts`).
- Render Fidelity: planned `PRODUCT_DEMO` must survive (`renderFidelity.ts`, prepare + compile asserts).
- Semantic aspiration in comments / product docs: demonstration of value, not landing page alone.
- Cap logic preserves PRODUCT_DEMO over IMAGE.

### Chatbot-specific (current implementation)

| Location | Specificity |
| --- | --- |
| `productDemoBeatSchema` | `ai_answer_visible`, visitor/AI Q&A, chat outcomes |
| `buildDefaultProductDemoBeat` | Default booking Q&A, brand Fenrik.chat |
| `buildProductDemoChatSvg` / compose raster | Controlled **chat** UI |
| `buildProductDemonstrationPromptBlock` | “controlled Fenrik chat UI” |
| Story Integrity `product_demonstration_missing` message | “visitor asks → AI answers → result” |
| Prose detectors | chat/reply/booking/lead language |
| Outcome types | lead/booking/contact/question only — no before/after, service delivery, document transform, physical product use |
| `ensureStructuredProductDemo` repair | Always injects chat beat |
| Variants (5.1) | Chat composition variants only |

### Required when?

- **Every video package** that runs Creative Candidates (`creativeCandidates && requireVideo`).
- **Not** gated by funnel stage, project industry, or `productRole`.
- Text-only packages skip.

### Client-type pass/fail (architecture as-is)

| Client type | Can pass? | Notes |
| --- | --- | --- |
| Fenrik.chat / chatbot SaaS | Yes | Native fit |
| Other chat/booking SaaS | Yes | With adapted copy |
| Non-chat SaaS (analytics, billing) | Weak | Forced into chat demo or fail |
| Hotel / restaurant / consultant | Weak | Booking chat may fake product |
| Cleaning / accountant / physical service | Fail or fake | No process/result demo form |
| E-commerce | Weak | No product-usage/before-after outcome type |

**Universal semantic definition (input → value → outcome) is not encoded in schema.** Only chat execution path is.

---

## 8. Failure-scope and stuck-run audit

### Intended scope (good)

- Package `generation_failed` → mark **one** `production_run_item` failed → bump `failed_total` → run `completed` when open ≤ 0.
- Sibling packages continue.
- Cancelled run: generation skipped; late video `completed` rejected; jobs not revived.

### Broken / risky paths

| Path | Effect |
| --- | --- |
| Throw `RenderProductDemoFailedError` / any Error in normalize or `buildVideoJobInput` | HTTP 500 `internal_error`; **no** `markProductionRunItemGenerationFailed` |
| Persist package + items, then throw in `buildVideoJobInput` | Orphan package/items; no video job; run item may stay queued; no callback forever |
| Video callback transport fail after local failure | Job may stay `processing` (zombie) |
| Video failed | Item reconcile can mark failed; **content_packages.status has no failed** — UI may look “ok draft” without video |
| `markProductionRunItemGenerationFailed` package_index mismatch | Fallback to first queued/running — wrong slot risk under concurrency |
| Failed package still “Start Video” | Settlement was meant to prevent this for generation_failed; throws/orphans bypass |

### Status map

```
package generation_failed (!ok)
  → production_run_item.status = failed, content_package_id = null
  → production_run.failed_total++, status completed|running
  → n8n sees 422, should not start video
  → UI: item failed with JSON diagnostics

throw before persist
  → no package
  → item may remain queued/running  ← STUCK
  → n8n 500

persist then throw in buildVideoJobInput
  → package exists, maybe no video_job
  → item may remain queued/running  ← STUCK / contradictory
  → n8n 500

video_job failed callback
  → video_jobs.failed
  → reconcile item failed (with package retained)
  → package status not set to failed
```

Completed packages from other items are retained (good). One failure does not delete siblings (good).

---

## 9. Retry and repair audit

| Failure | Retries | Targeted vs full | Uses diagnostics? | Repeat mistake risk | Damage correct sections? | Cost | After exhaustion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| JSON/schema/guardrails | ≤3 full LLM | Full regenerate (+ JSON repair) | Issues in repair/retry append | Medium | Yes (whole package) | High | `generation_failed` settled |
| Concept Fidelity | 1 full regenerate | Full | Appendix with reasons | Medium | Yes | High | **Continues anyway** |
| Story Integrity | 1 full regenerate | Full | Repair appendix with codes | Medium-high | Yes | High | `generation_failed` |
| Product Demo Integrity | 0 LLM; force inject | Targeted scene replace | Uses failure to force | Low for chat; high for non-chat | Can overwrite good lifestyle resolution | Low LLM / high semantic | Fail if still invalid |
| Transport timeout | maxTransportAttempts | Same call | Provider | Transient | — | Medium | Fail attempt / throw |
| Typed frequency | 0 | Downgrade scene | Decision log | Low | Local | None | Continue |
| Video worker | callback fail path | Job-level | error_message | Ops | — | High | Job failed |
| Operator cancel | — | — | — | — | — | — | Terminal failed |

**Preference:** keep Story Integrity / product-truth as full regen only when necessary; prefer targeted scene repair for demo payload; never use Fenrik chat inject as universal repair.

---

## 10. Silent fallback audit

| Fallback | Classification |
| --- | --- |
| PRODUCT_DEMO → IMAGE | **Hard fail required** (implemented correctly as throw) |
| Planned PRODUCT_DEMO dropped in normalize (pre-Sprint 5) | Fixed — now fail/preserve |
| QUOTE/PHONE/CHECKLIST/STATISTIC/CTA → IMAGE (frequency / flag / eligibility) | **Safe but should log** (does) |
| Unsupported typed → IMAGE | **Safe but should log** |
| Asset unrenderable → IMAGE | **Safe but should log** |
| Language variant typed → IMAGE | **Safe but should log** |
| CHECKLIST shadow / not allowlisted → IMAGE | **Safe but should log** |
| ensureStructuredProductDemo inject chat defaults | **Unacceptable silent downgrade of product meaning** (repair path, not silent, but semantic corruption) |
| Invalid demo_variant → SAFE variant | **Safe** (still PRODUCT_DEMO) |
| JSON repair provider unavailable → null | **Safe** (validation fails) |
| Concept fidelity fail after repair → continue | **Unacceptable soft ship** of unfaithful concept (should warn loudly / optional fail mode) |
| Failed analysis → default presentation | Partial; IMAGE paths OK; PRODUCT_DEMO fail-closed |
| Missing weekly strategy enrichment / sibling angles | **Safe** empty list |
| Default voice / TTS | Separate; not audited as creative gate |

---

## 11. Observability audit

### Strong

- Story / Product Demo integrity: stable codes, messages, sceneIndex, paths like `story_integrity.*` / `product_demonstration_integrity.*` in `validation_errors`.
- RenderProductDemoFailedError: `code`, `diagnostics` (stage, violations, types).
- Presentation decisions logged on package brief.
- generation_failed settlement stores JSON `{ error, message, validation_errors, attempts }`.

### Weak / collapsed

| Collapse | Problem |
| --- | --- |
| All soft failures → `error: "generation_failed"` | Distinguishes only via validation_errors[0] |
| Thrown errors → `internal_error` | No package/run IDs in body; no settle; no severity class |
| Video fail UI message | Czech generic “Renderování videa selhalo.” — loses provider detail |
| Concept fidelity soft continue | Failures only in brief diagnostics — easy to miss |
| No standard fields | Often missing: production_run_id, retry count, severity enum (hard/repairable/warning/operational), planned vs rendered type on gen path |

### Minimal improvements (recommend only)

1. Catch `RenderProductDemoFailedError` (and persist failures) → settle item with `error: "render_product_demo_failed"` + diagnostics; never leave queued.
2. Always attach `project_id`, `strategy_item_id`, `production_run_id`, `package_id` when known.
3. Keep first validation path as primary human reason (already mostly true).
4. Do not invent a large telemetry platform — settle + stable codes suffice.

---

## 12. Test coverage map

| Gate | Positive | Hard-fail | False-positive protection | Retry/repair | Production-state | Gaps |
| --- | --- | --- | --- | --- | --- | --- |
| Story Integrity | `check:story-integrity` | Yes (codes) | CTA soft (5.2) | Prompt/repair helpers | No | Actor/metaphor FP cases limited |
| Product Demo Integrity | `check:product-demonstration-integrity` | Yes | Some | Inject path | Partial via settlement check | Non-chat product forms absent |
| Structured demo | `check:product-demo-structured` | Yes | — | — | — | Universality |
| Demo variation | `check:product-demo-variation` | Variant mapping | — | — | — | Still chat-only |
| Render Fidelity | `check:render-fidelity` | PRODUCT_DEMO→IMAGE | Cap preserve | assert throws | No | Integration with settle on throw |
| Creative Candidates | `check:creative-candidates` | Genericity/reject | — | — | — | Fidelity soft-continue behavior |
| generation_failed settle | `check:generation-failed-settlement` | Source assertions | — | — | Source-level | **No test that throws skip settle** |
| Guardrails | `check:content-package-guardrails` | Yes | — | — | — | — |
| Weekly strategy | `check:weekly-strategy-guardrails` | Yes | — | — | — | — |
| JSON repair | `check:json-repair-runner` | generation_failed | — | Yes | — | — |
| Production run / stop | `check:production-run`, `check:production-run-stop` | Cancel | Late callback | — | Yes | Orphan package after persist |
| CTA/PHONE/QUOTE/STATISTIC gen | respective check:* | Downgrade | — | — | — | — |
| Component capture | check:component-capture-* | — | — | — | — | Tied to chat UI |

**Validators not covered by the five named scripts alone:** package guardrails, weekly strategy, JSON repair, production-run settlement, frequency downgrades, asset eligibility, language variant downgrade, video cancel guards, concept fidelity soft-continue, thrown-error settlement gap.

---

## 13. Prioritized P0–P3 findings

### P0 — corrupt, wrong output, or permanent stall

1. **Thrown render/normalize errors do not settle production_run_item**  
   - **Evidence:** `app/api/n8n/generate-content-package/route.ts` settles only on `!result.ok`; catch → `errorResponse` 500. `normalizeVisualScenePlan` / `assertRenderFidelity` / `analyzePresentation` throw `RenderProductDemoFailedError`.  
   - **Files:** route, `visualScenePlan.ts`, `renderFidelity.ts`, `analyzePresentation.ts`, `packageShared.ts`, `production-run-admin.ts`  
   - **Impact:** Stuck queued/running items; incomplete runs; possible orphan packages without video jobs.  
   - **Minimal fix:** On catch (and optionally wrap persist/job-input), call settle with stable code; if package inserted without job, mark item failed or complete with explicit error.  
   - **Risk of fix:** Low if settle is idempotent.

2. **PRODUCT_DEMO architecture is chatbot-specific but required universally**  
   - **Evidence:** schema, prompts, integrity, default beat, chat SVG, force inject.  
   - **Impact:** Wrong product demos or hard fails for non-chat clients; semantic lie if force-injected.  
   - **Minimal fix:** Keep hard fidelity for “demo must match planned type”; widen beat/outcome model OR gate requirement by `productRole` / demonstration mode; stop Fenrik defaults as universal repair.  
   - **Risk:** Medium — needs careful schema migration; do not weaken Render Fidelity.

3. **Post-persist `buildVideoJobInput` failure leaves inconsistent state**  
   - **Evidence:** `persistNewPackage` inserts package/items then builds job input.  
   - **Impact:** Package in DB, run item unsettled, no video.  
   - **Minimal fix:** Prepare/analyze scenes **before** insert, or transactional compensate + settle.  
   - **Risk:** Low–medium (ordering change).

### P1 — unjustified hard fail / frequent blocker

4. **Story Integrity `product_demonstration_missing` duplicates chatbot Product Demo Integrity**  
   - Hard-fails with ask→AI→result even after structured path exists.  
   - **Fix:** Rely on structured integrity; soften prose duplicate; CTA already soft.  
   - **Risk:** Low.

5. **`abstract_metaphor_in_middle` / aggressive world-ban list as hard fails**  
   - Forces literal continuity; FP on valid creative.  
   - **Fix:** Warning or only when concept explicitly forbids.  
   - **Risk:** Low quality risk; gains creative freedom.

6. **Force `ensureDemo(true)` as sole Product Demo repair**  
   - Can overwrite correct non-chat resolution with booking chat.  
   - **Fix:** Repair only incomplete structured beats; else fail with clear code without inventing Fenrik Q&A.  
   - **Risk:** Slightly higher fail rate until universal demo forms exist — preferable to fake demos.

7. **Corporate copy phrases as hard regenerate**  
   - Style preference → cost.  
   - **Fix:** Warning.  
   - **Risk:** Low.

### P2 — false positives / unnecessary regen / creative over-constraint

8. **Concept Fidelity soft-continues after failed repair** — unfaithful packages ship with only brief diagnostics.  
9. **Primary actor / location regex heuristics** — chatbot-biased continuity.  
10. **Outcome enum / variant set** — no before/after, service process, physical usage.  
11. **Full-package regen for Story Integrity** — expensive; targeted scene regen preferred when only demo/world scene fails.  
12. **Token-overlap fidelity** — paraphrase FP (partially mitigated).

### P3 — observability / cleanup

13. Collapse to `generation_failed` / `internal_error` without severity class.  
14. Video fail message loses provider detail in run item sync.  
15. Package status cannot express video failure.  
16. Settlement check script is source-only — add behavioral test for throw→settle.  
17. Missing production_run_id in many error envelopes.

---

## 14. Minimal recommended implementation sequence

1. **Settle all terminal generation outcomes** (including throws): map `RenderProductDemoFailedError` → settled item with `render_product_demo_failed`; generic ops → `operational_failure`; never leave queued.  
2. **Move presentation/fidelity preparation before package insert** (or compensate after).  
3. **Stop universal Fenrik chat force-inject** as repair; inject only when repairing an already chat-shaped beat.  
4. **Decouple “demo required” from “chat Q&A required”**: keep Render Fidelity; introduce product-role / demonstration-mode; keep landing-page-is-not-demo.  
5. **Demote Story Integrity metaphor/actor soft heuristics and corporate copy to warnings**; keep conflict/world abandonment as repairable then warn or narrowly hard.  
6. **Make Concept Fidelity exhaustion explicit** (warning flag / optional hard in sample mode).  
7. **Extend PRODUCT_DEMO beat model** (later, small steps): outcome kinds beyond chat — without building all renderers in one sprint; until then, do not hard-require chat for non-chat roles.  
8. **Tests:** throw→settle; persist-order; CTA remains soft; PRODUCT_DEMO→IMAGE still hard; non-chat project does not get default Fenrik booking inject.

---

## Appendix A — Challenge checklist for current hard fails

| Hard fail | Client harm prevented? | Measurable? | False positives? | Local repair? | Stop package? | Stop run? | Could be warning? | Architecture origin | Reduces creative freedom? | Product-specific? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| forbidden_claims / product_is_not | False claims | Yes (phrase) | Low if lists curated | Regen | Yes | No | No | Early | Mild | Per project |
| Schema / missing VO/video | Unusable | Yes | Low | Regen | Yes | No | No | Early | No | No |
| Story: product_demonstration_missing | Weak demo | Regex + structured | **High for non-chat** | Inject/regen | Today yes | No | For non-chat roles | Sprint 4A/4C | **Yes** | **Chat** |
| Story: abstract_metaphor_in_middle | Metaphor essay drift | Regex | **High** | Regen | Today yes | No | **Yes** | Sprint 4A | **Yes** | Mild chat bias |
| Story: primary_actor_changed | Continuity break | Token heuristics | Medium–high | Regen | Today yes | No | Often | Sprint 4A | Yes | Chat/phone bias |
| Story: world_abandoned / conflict | Incoherent story | Token overlap | Medium | Regen | Often yes | No | Borderline | Sprint 4A | Mild | No |
| Story: cta_mismatch | Soft CTA preference | Phrase | High | — | **No (5.2)** | No | Yes | Was hard; fixed | — | — |
| Product Demo structured missing | No demo | Schema | Low if chat product | Inject | Yes for chat products | No | No for chat | Sprint 4C.1 | — | Chat schema |
| component_capture_not_renderable | Broken raster | SVG build | Low | Fix beat | Yes | No | No | 4C/5 | — | Chat renderer |
| Render PRODUCT_DEMO→IMAGE | Semantic lie | Type compare | Low | Re-prepare | Yes | No | No | Sprint 5 | No | Type-level universal |
| Corporate copy | Tone | Phrase list | Medium | Regen | Today yes | No | **Yes** | Content Quality Sprint 2 | Yes | No |
| VO hard cap | Too-long video/cost | Word count | Low | Regen | Yes | No | No | Sprint 2 | Mild | No |
| Concept fidelity (if were hard) | Concept drift | Tokens | Medium | Regen | Soft today | No | Soft OK | Candidates v1 | Mild | No |

---

## Appendix B — Key file index

| Concern | Paths |
| --- | --- |
| Package generation | `lib/ai/workflows/generateContentPackage.ts`, `regenerateContentPackage.ts` |
| Repair runner | `lib/ai/runWithRepair.ts` |
| Guardrails | `lib/ai/guardrails.ts` |
| Story Integrity | `lib/creative-candidates/storyIntegrity.ts` |
| Product Demo Integrity | `lib/creative-candidates/productDemonstrationIntegrity.ts` |
| Fidelity | `lib/creative-candidates/fidelityCheck.ts` |
| Structured demo | `lib/scene-types/product-demo/*` |
| Render Fidelity | `lib/scene-types/presentation/renderFidelity.ts` |
| Presentation | `analyzePresentation.ts`, `prepareVisualScenesForVideo.ts` |
| Job input | `lib/ai/workflows/packageShared.ts` |
| n8n bridge | `app/api/n8n/generate-content-package/route.ts` |
| Settle | `lib/api/production-run-admin.ts` |
| Video callback | `lib/n8n/handlers.ts` |
| Worker | `video-worker/jobRunner.ts`, `prepareProductDemoSceneRaster.ts` |

---

*End of audit. No code was changed.*
