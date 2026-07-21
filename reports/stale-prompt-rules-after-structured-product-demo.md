# AUDIT — STALE PROMPT RULES AFTER STRUCTURED PRODUCT_DEMO

**Mode:** READ ONLY · evidence only · no implementation  
**Anchors:** Sprint 4C (`8f43cdb`), Sprint 4C.1 (`1f3c37f`), run `2f896bec…`  
**Does not repeat:** prior “Prompt Builder caused collapse” root-cause narrative — this report classifies what is stale after 4C.1 and the minimal safe change set.

---

## Part 1 — Architecture before / after 4C.1

### A. Before Sprint 4C

| Concern | Representation |
| --- | --- |
| Product demonstration | Expected in ordinary AI `IMAGE` stills / prose image prompts |
| Ask → answer → result | Soft Story Integrity keyword heuristics (false POSSes documented on `9d9fa60b`) |
| Actor continuity | Weak / absent → 3 different humans across beats (`reports/production-audit-9d9fa60b.md`) |
| Resolution | Often smile / floating chat icon |
| Renderer | No `PRODUCT_DEMO` scene type |

### B. Sprint 4C (`8f43cdb`)

**Problem fixed:** lifestyle variety instead of conversation progression; no visual AI answer; keyword false-PASS; mid-package actor swaps (`reports/sprint-4c-product-demonstration.md`).

**Prompt rules added** (`lib/ai/prompts/generateContentPackage.ts` visualBeatsLines):

- `PRIMARY_ACTOR + CONVERSATION CONTINUITY (mandatory for every still)`
- Prefer same hands / same phone / same kitchen-or-street
- Forbidden for variety (suited professional swaps)
- `PRODUCT DEMONSTRATION STILLS` 1–4 on SAME thread/phone
- EXCEPTION FOR PRODUCT DEMONSTRATION (structured chat shapes in AI stills)

**Also added:** `productDemonstrationIntegrity@1` hard gate + prose regex; candidate prompt line for PRIMARY_ACTOR; integrity repair appendix with `IMAGE PROMPT CONTINUITY (mandatory)`.

### C. Sprint 4C.1 (`1f3c37f`)

**What changed:**

| Moved to structured PRODUCT_DEMO | Evidence |
| --- | --- |
| Source of truth for ask→answer→result | `productDemonstrationIntegrity.ts` header: “Structured product_demo beat is the source of truth” |
| Deterministic chat raster | `composeProductDemoRaster.ts`, `product_demo@1` renderer |
| Inject / ensure beat before SI | `ensureStructuredProductDemo` in `generateContentPackage.ts` workflow |
| Integrity failures on structured fields | codes `structured_*`, `product_demo_scene_missing`, `component_capture_not_renderable` |
| Prompt block rewrite | `buildProductDemonstrationPromptBlock` requires `{ type: PRODUCT_DEMO, payload }` |
| Actor rule narrowed | Fail only on conflicting human identity; UI-only / PRODUCT_DEMO exempt (`sprint-4c1` §Actor continuity; code ~514–541) |
| Lifestyle IMAGE may surround demo | `sprint-4c1` §5: “Lifestyle AI IMAGE scenes may surround the controlled UI scene” |

**What stayed duplicated / stale:**

| Still in Prompt Builder (`generateContentPackage.ts` 662–675) | Status vs 4C.1 |
| --- | --- |
| Mandatory SAME person OR same phone on every still | Broader than 4C.1 validator |
| Prefer same hands / phone / street | Pre-PRODUCT_DEMO AI-still contract |
| PRODUCT DEMONSTRATION STILLS 1–4 SAME thread | Owned by structured beat + renderer |
| EXCEPTION FOR PRODUCT DEMONSTRATION AI chat shapes | Partial overlap with PRODUCT_DEMO ownership |

`generateContentPackage.ts` was **not** modified in `1f3c37f` (diff empty for that file). Continuity/demo-still block from 4C remains verbatim.

### Responsibility matrix (before → after 4C.1)

| Responsibility | Before 4C | 4C | After 4C.1 (correct) | Still duplicated in Prompt Builder? |
| --- | --- | --- | --- | --- |
| Visible ask | AI IMAGE prose | AI IMAGE prose + regex | **PRODUCT_DEMO payload** `visitor_question` + raster | YES (stills sequence) |
| Visible AI answer | AI IMAGE prose | AI IMAGE prose + regex | **PRODUCT_DEMO** `ai_answer` + raster | YES |
| Visible useful result | AI IMAGE / smile | AI IMAGE SAME phone | **PRODUCT_DEMO** `outcome_*` + raster | YES |
| Same chat thread (demo) | Implied in prompts | SAME thread in AI stills | **PRODUCT_DEMO** `conversation_id` | YES (stills) |
| No unexplained actor swap | Unenforced | Mandatory every still same person/phone | **Integrity:** no conflicting identity; UI/PRODUCT_DEMO exempt | YES (broader “every still”) |
| Lifestyle IMAGE variety | Default | Forbidden by continuity prefer-same | **Documented allowed** around demo | Blocked by stale prefer-same |
| Floating icon / smile ban | Soft | Hard in integrity + prompt | Integrity secondary bans + PRODUCT_DEMO renderer | YES (prompt EXCEPTION + stills) |

---

## Part 2 — Inventory of relevant rules

### Prompt Builder — `buildGenerateContentPackagePrompt` / `visualBeatsLines`

| ID | Exact text (abbrev.) | File:lines | Introduced | Original purpose | Current purpose | Enforcement |
| --- | --- | --- | --- | --- | --- | --- |
| PB-D1 | Make stills **visually distinct** | `generateContentPackage.ts:643-645` | pre-4C (`59c767c` era) | Anti interchangeable beats | Still needed | Prompt only |
| PB-D2 | **VISUAL PROGRESSION** must change location OR action OR information OR emotion OR stakes | `:646-648` | `1a7b425` / related | Beat-to-beat progression | Still needed; defeated by PB-C* | Prompt only |
| PB-X1 | EXCEPTION FOR PRODUCT DEMONSTRATION: structured UI shapes in AI stills | `:653-657` | `8f43cdb` | Force ask→answer in AI images | Partially obsolete | Prompt only |
| PB-C1 | PRIMARY_ACTOR + CONVERSATION CONTINUITY **(mandatory for every still)** | `:662` | `8f43cdb` | Lock actor across AI demo stills | Over-broad vs 4C.1 | Prompt only |
| PB-C2 | Every subsequent still MUST SAME person OR same phone/chat | `:664-665` | `8f43cdb` | Continuity | Over-broad | Prompt only |
| PB-C3 | Prefer same hands / same phone / same kitchen-or-street | `:666-667` | `8f43cdb` | Anti lifestyle portraits | Causes diversity collapse | Prompt only |
| PB-C4 | Forbidden for variety: different suited professional | `:668` | `8f43cdb` | Anti actor-swap bug | Still needed (narrow) | Prompt only |
| PB-S1 | PRODUCT DEMONSTRATION STILLS 1–4 SAME thread/phone | `:670-675` | `8f43cdb` | AI-still demo sequence | **Obsolete** — PRODUCT_DEMO owns | Prompt only |
| PB-M1 | SCENE MEANING (priority over look) | `:677-682` | pre-4C | Meaning > style | Keep | Prompt only |

### Creative Candidate / DNA / Integrity prompts

| ID | Exact text (abbrev.) | File:lines | Introduced | Purpose | Enforcement |
| --- | --- | --- | --- | --- | --- |
| CC-1 | Attention/VN/Identity must AMPLIFY winner, not replace | `promptBlocks.ts:48` | `58eaff0` | Protect winner | Prompt |
| CC-2 | DNA overrides conflicting staging from Identity/Narrative/Product Reveal | `:49` | `7052868` | World lock | Prompt |
| CC-3 | STORY INTEGRITY: stay inside selected world | `:50` | `6295aea` | No metaphor escape | Prompt + SI validator |
| CC-4 | PRODUCT DEMONSTRATION INTEGRITY: Q→A→result with one PRIMARY_ACTOR | `:51` | `8f43cdb` | Demo + actor | Prompt (wording pre-4C.1) |
| PDI-P1 | Every video package MUST include structured product demonstration + PRODUCT_DEMO entry | `productDemonstrationIntegrity.ts:658-697` | rewritten `1f3c37f` | Structured beat | Prompt + validator |
| PDI-P2 | PRIMARY_ACTOR locked for person scenes; UI/PRODUCT_DEMO exempt; forbid different identity without reason | same block | `1f3c37f` | Narrow continuity | Prompt + validator |
| DNA-* | immutableRules e.g. Do not relocate… | Creative DNA block | `7052868` | World consistency | Prompt + DNA checks |
| CI-* | SAME lighting/camera/composition; DNA world mandatory location (treatment mode) | `creative-identity/promptBlocks.ts` | Identity sprint | Staging continuity | Prompt |
| VN-* | Beats may shift; motif variety guidance | `visual-narrative/promptBlocks.ts` | VN sprint | Meaning carriers | Prompt |

### Validators / schema / renderer

| ID | Rule | File | Introduced | Enforcement |
| --- | --- | --- | --- | --- |
| PDI-V1 | Structured beat required; field visibility; renderable | `validateProductDemonstrationIntegrity` | `1f3c37f` @2 | Hard gate |
| PDI-V2 | `primary_actor_identity_changed` only on conflicting identity; skip UI/PRODUCT_DEMO | same ~514–541 | `1f3c37f` | Hard gate |
| PDI-V3 | Floating icon ban on non-demo scenes | same ~544–557 | `8f43cdb`/`1f3c37f` | Hard gate |
| SCHEMA-1 | `ProductDemoBeat` zod: conversation_id, question/answer/outcome | `productDemoBeat.ts` | `1f3c37f` | Schema |
| ENSURE-1 | `ensureStructuredProductDemo` | `ensureStructuredProductDemo.ts` | `1f3c37f` (+5.3 no fabricate) | Workflow inject |
| RENDER-1 | `product_demo@1` + no silent IMAGE downgrade | renderer + `renderFidelity.ts` | `1f3c37f`/5.x | Compile/render |
| SI-1 | product_demonstration_missing honors structured beat | `storyIntegrity.ts` | `1f3c37f` | Soft/hard via SI |
| LV-1 | Language variants clone types/paths; never downgrade PRODUCT_DEMO | `languageVariantScenes.ts` | 5.3.2 | Variant path |

---

## Part 3 — Classification

| ID | Classification | Evidence |
| --- | --- | --- |
| PB-S1 PRODUCT DEMONSTRATION STILLS | **REMOVE** | 4C.1: structured beat is source of truth; renderer owns Q→A→R; sprint §5 lifestyle IMAGE may surround |
| PB-C3 same hands/phone/street prefer | **REMOVE** | Causes identical IMAGE stills; contradicts 4C.1 “lifestyle IMAGE may surround”; not in PDI-V2 |
| PB-C1 “mandatory for every still” header | **REWRITE** | Continuity still needed; “every still / same phone” is pre-4C.1 |
| PB-C2 SAME person OR same phone every still | **REWRITE** | Align with PDI-V2: no unexplained identity swap; phone not required outside PRODUCT_DEMO |
| PB-C4 Forbidden suited-professional swap | **REWRITE** (narrow) | Keep anti-9d9fa60b intent; remove blanket “Forbidden for variety” brand |
| PB-X1 EXCEPTION AI chat shapes | **REWRITE** or **REMOVE** | If IMAGE still shows chat problem-state OK; full Q→A→R must not be required in IMAGE |
| PB-D1 visually distinct | **KEEP** | Needed; currently overridden |
| PB-D2 VISUAL PROGRESSION | **REWRITE** | Keep; clarify OR axes must produce real visual change (not gesture-only on same device) |
| PB-M1 SCENE MEANING | **KEEP** | Still valid |
| CC-4 Q→A→R with PRIMARY_ACTOR | **REWRITE** | Point to structured PRODUCT_DEMO scene, not AI stills |
| PDI-P1 / PDI-V1 structured beat | **KEEP** | Correct owner |
| PDI-P2 / PDI-V2 actor identity | **KEEP** | Correct narrowed continuity |
| PDI-V3 floating icon | **KEEP** | Prevents original fake resolution |
| SCHEMA-1 / ENSURE-1 / RENDER-1 | **KEEP** | Core 4C.1 path |
| CC-2 DNA overrides | **KEEP** | World lock (not phone lock) |
| CC-3 Story Integrity world | **KEEP** | Compatible with location change inside world |
| CI SAME treatment | **KEEP** (scope staging) | Lighting/comp reuse ≠ same subject |
| VN variety | **KEEP** | Compatible once PB-C* narrowed |
| Integrity `IMAGE PROMPT CONTINUITY` (4C) | **DEAD** | Removed in `1f3c37f` from PDI prompt |

---

## Part 4 — Ownership matrix

| Responsibility | Current owners | Correct single owner | Duplicated? | Conflict? | Action |
| --- | --- | --- | --- | --- | --- |
| Product ask visible | PB-S1 + PB-X1 + PDI + SCHEMA | **PRODUCT_DEMO schema + PDI-V1 + renderer** | YES | YES vs IMAGE diversity | Remove PB-S1; rewrite PB-X1 |
| Product answer visible | same | **PRODUCT_DEMO + PDI + renderer** | YES | YES | same |
| Useful result visible | same | **PRODUCT_DEMO + PDI + renderer** | YES | YES | same |
| Same chat thread (demo) | PB-S1 + SCHEMA `conversation_id` | **PRODUCT_DEMO schema** | YES | — | Remove PB-S1 |
| PRIMARY_ACTOR lock (no unexplained swap) | PB-C1/C2 + PDI-V2 + DNA | **Product Demonstration Integrity (PDI-V2)** | YES (prompt broader) | YES vs diversity | Rewrite PB to match PDI-V2 |
| Actor must appear in every IMAGE | PB-C1/C2 | **None** (4C.1 exempts UI; lifestyle surround allowed) | Over-owned | YES | Remove over-claim |
| Same phone outside PRODUCT_DEMO | PB-C2/C3/S1 | **None required** | Stale | YES | Remove |
| World consistency | DNA + SI + CC-2/3 | **Creative DNA + Story Integrity** | OK dual (DNA write / SI check) | Mild vs Attention | KEEP; document DNA>Attention for world |
| Environment reuse (lighting/comp) | Creative Identity | **Creative Identity** | — | Mild vs location change | KEEP treatment-only |
| Scene-to-scene visual progression | PB-D1/D2 (defeated) | **Prompt Builder (IMAGE scenes)** | — | vs stale PB-C* | Restore by removing stale rules |
| Image prompt diversity | PB-D1 | **Prompt Builder** | — | vs PB-C3 | Restore |
| Smile / floating-icon ban | PDI-V3 + PB-X1/S1 | **PDI-V3 + PRODUCT_DEMO renderer** | Mild | — | KEEP validator; drop still-sequence |
| No silent PRODUCT_DEMO→IMAGE | renderFidelity / analyzePresentation | **Renderer fidelity** | — | — | KEEP |
| Language-variant visual clone | languageVariantScenes | **languageVariantScenes** | — | — | KEEP (clone PRODUCT_DEMO refs) |

Documented dual ownership exception: **DNA (authoring) + Story Integrity (validation)** for world lock — writer/checker pair, not competing writers.

---

## Part 5 — Stale pre-4C.1 contracts

| Rule | Does PRODUCT_DEMO fully own it? | IMAGE scenes still need |
| --- | --- | --- |
| PRODUCT DEMONSTRATION STILLS 1–4 | **YES** | Nothing for Q→A→R |
| SAME phone/thread across ordinary stills | **YES** (demo thread) | **NO** requirement |
| same hands / same phone / same environment | **NO** (never owned by PRODUCT_DEMO) | **REWRITE:** optional problem setup may show phone; not mandatory |
| AI still question/waiting/answer/result | **YES** owned by PRODUCT_DEMO | May show **problem** (unanswered) only; must not recreate full demo |
| EXCEPTION structured chat shapes in AI | **PARTIAL** | If IMAGE shows chat UI for problem beat, no readable text / no floating icon — not full Q→A→R |

---

## Part 6 — Continuity scope (from existing docs/code only)

Answers grounded in `sprint-4c1` Actor continuity (D), PDI-V2, and sprint §5 lifestyle surround:

| # | Question | Answer | Evidence |
| --- | --- | --- | --- |
| 1 | Same actor in every IMAGE scene? | **NO** | PDI skips UI-only; 4C.1 allows lifestyle IMAGE around demo |
| 2 | Must every scene show the actor? | **NO** | “Phone close-ups and UI-only PRODUCT_DEMO do not need the actor’s face” |
| 3 | Customer / owner / environment / consequence / metaphor / product UI in different scenes? | **YES within selected world** | SI world lock + VN situation shifts; metaphor limited by SI/DNA |
| 4 | Same phone outside PRODUCT_DEMO? | **NO** | Not required by PDI-V2 after 4C.1 |
| 5 | Same environment across all stills? | **NO as hard rule** | Identity locks treatment; DNA locks world — not identical street every frame |
| 6 | Invalid actor swap? | Different human identity (gender/age/face/profession) **without narrative continuity** | `primary_actor_identity_changed` |
| 7 | Valid multi-subject progression? | Consequence / environment / UI-only / PRODUCT_DEMO without new conflicting face | PDI-V2 loop + 4C.1 surround language |

---

## Part 7 — Conflict analysis

| Pair | Real conflict? | Winner | Why | Where to encode |
| --- | --- | --- | --- | --- |
| Continuity vs Visual Progression | **YES** today | Progression for IMAGE; Continuity = no unexplained identity swap | 4C.1 narrowed continuity | Rewrite PB-C*; keep PB-D2 |
| DNA vs Attention | Compatible if Attention amplifies world | DNA world | CC-1/CC-2 | Already in candidate block |
| DNA vs Visual Narrative | Compatible (VN inside world) | DNA for world | CC-2 | Keep |
| Identity vs scene diversity | Mild | Identity = treatment; subjects may change | Identity rules | Keep CI; remove PB-C3 |
| PDI vs PRODUCT_DEMO schema | Compatible | Schema truth; PDI validates | 4C.1 | Keep |
| SI vs subject changes | Compatible if same world | SI world | CC-3 | Keep |
| Same-world vs location changes | Compatible | Same world ≠ same GPS street | DNA/SI | Clarify in REWRITE of PB-D2 |
| Same-actor vs consequence shots | Compatible under PDI-V2 | Consequence OK without face | PDI-V2 | Align PB |

---

## Part 8 — Minimal safe change set

No new systems. Touch only prompt wording (+ optional test file). Validators already correct for 4C.1.

### Change 1 — REMOVE stale AI-still demo sequence

| | |
| --- | --- |
| File | `lib/ai/prompts/generateContentPackage.ts` |
| Function | `buildGenerateContentPackagePrompt` |
| Block | lines **670–675** (`PRODUCT DEMONSTRATION STILLS…`) |
| Action | **REMOVE** entire block |
| Old responsibility | Force Q→A→R across AI IMAGE stills |
| New | None — owned by PRODUCT_DEMO / PDI / renderer |
| Regression risk | Low if PDI-V1 + ENSURE-1 remain |
| Test | TEST 3, TEST 4 |

### Change 2 — REWRITE continuity block (662–668)

| | |
| --- | --- |
| File | same |
| Block | lines **662–668** |
| Action | **REWRITE** to match PDI-V2 / 4C.1 |
| Required meaning (evidence-aligned, not new philosophy) | Lock PRIMARY_ACTOR from DNA/opening; **forbid unexplained identity swaps** (different face/profession mid-package without narrative reason); phone close-ups / UI-only / PRODUCT_DEMO need not show the face; **do not** require same phone/hands/street on every IMAGE; lifestyle/consequence/environment IMAGE scenes around PRODUCT_DEMO are allowed if world-consistent |
| Remove from this block | “mandatory for every still” same-phone OR; Prefer same hands/phone/street; “Forbidden for variety” blanket |
| Keep intent | Anti-9d9fa60b multi-actor lifestyle swaps |
| Regression risk | Medium if wording too loose → reintroduce 3 actors |
| Test | TEST 1, TEST 6 |

### Change 3 — REWRITE or REMOVE AI chat EXCEPTION (653–657)

| | |
| --- | --- |
| Action | **REWRITE** |
| New responsibility | If an IMAGE scene depicts a chat/phone **problem** state, use abstract UI (no readable text); **do not** use floating icon / smile as product proof; **do not** recreate full ask→answer→result in IMAGE — that belongs in PRODUCT_DEMO |
| Regression risk | Low |
| Test | TEST 3, TEST 4, TEST 6 |

### Change 4 — REWRITE VISUAL PROGRESSION (646–648) slightly

| | |
| --- | --- |
| Action | **REWRITE** |
| Add constraint consistent with prior audits | Among consecutive **IMAGE** scenes, progression must change at least two of: subject, location, action, consequence, perspective, composition, narrative function — **UI-state-only / gesture-only on the same device is not enough** |
| Keep | OR-list spirit; problem→failure→consequence→solution |
| Regression risk | Low–medium (stricter than today) |
| Test | TEST 2, TEST 5, TEST 7 |

### Change 5 — KEEP visually distinct (643–645)

No edit required once Change 2/1 remove overrides.

### Change 6 — REWRITE candidate hard rule CC-4

| | |
| --- | --- |
| File | `lib/creative-candidates/promptBlocks.ts` |
| Line | **51** |
| Action | **REWRITE** |
| New text intent | Product demonstration via **one structured PRODUCT_DEMO** scene (ask→answer→result); PRIMARY_ACTOR identity rules per Product Demonstration Integrity — not via multi-IMAGE phone sequence |
| Test | Existing `check:product-demonstration-integrity` + TEST 3 |

### Change 7 — DO NOT CHANGE (KEEP)

- `buildProductDemonstrationPromptBlock` (PDI-P1/P2)
- `validateProductDemonstrationIntegrity` / ensureStructuredProductDemo / renderer / renderFidelity
- DNA override / SI world lock
- Creative Identity treatment rules
- languageVariantScenes PRODUCT_DEMO clone behavior

### Out of scope (not required for minimal patch)

- Redesigning Selection v3, Attention, or Visual Narrative
- New pipeline stages
- Changing PRODUCT_DEMO renderer

---

## Part 9 — Required regression tests

| Test | Fail before fix | Pass after fix | Suggested harness |
| --- | --- | --- | --- |
| **TEST 1 — ACTOR CONTINUITY** | Fixture with 3 suited humans unexplained → must still **fail** PDI | Same; rewrite must not weaken PDI-V2 | `check-product-demonstration-integrity` + new fixture |
| **TEST 2 — VISUAL DIVERSITY** | Prompt snapshot / golden: IMAGE prompts must not all share same subject+device+env+composition | Assert ≥2 axes change between adjacent IMAGE prompts | New unit test on assembled prompt + optional fixture package |
| **TEST 3 — PRODUCT_DEMO OWNERSHIP** | Structured beat missing → fail; complete beat → pass | Unchanged | `check-product-demo-structured` |
| **TEST 4 — NO DUPLICATE DEMO SEQUENCE** | Assembled prompt must **not** contain `PRODUCT DEMONSTRATION STILLS` or “SAME thread” AI sequence | String absent from `buildGenerateContentPackagePrompt` output | New prompt snapshot test |
| **TEST 5 — STORY PROGRESSION** | IMAGE-only progression policy in prompt requires ≥2 axes | Present after REWRITE of PB-D2 | Prompt snapshot |
| **TEST 6 — ORIGINAL BUG** | Smile/floating-icon / 3 actors still fail integrity | Unchanged hard fails | Existing integrity tests |
| **TEST 7 — RUN 2f896bec** | Deterministic: prompt must not instruct “Same hands, same phone, same urban street” for subsequent IMAGE stills | Assert prompt text; optional offline regenerations are out of band | Prompt unit test using same directive injections as production |

**Before/after on prompt assembly (no live LLM required for gate):**

```text
BEFORE: visualBeatsLines includes PRODUCT DEMONSTRATION STILLS + Prefer same hands/phone
AFTER:  those strings gone; continuity wording matches “person scenes / no unexplained identity change”
```

---

## Part 10 — Final decision table

| Rule / block | File + lines | Action | Reason | New owner | Risk |
| --- | --- | --- | --- | --- | --- |
| PRIMARY_ACTOR + CONVERSATION CONTINUITY (mandatory every still) | `generateContentPackage.ts:662-665` | **REWRITE** | Broader than 4C.1 PDI-V2 | PDI-V2 (prompt mirrors validator) | Actor-swap return if too loose |
| Prefer same hands / same phone / same environment | `:666-667` | **REMOVE** | Stale AI-still demo contract; kills diversity | — | None if PDI-V2 kept |
| Forbidden for variety (suited pro) | `:668` | **REWRITE** | Keep anti-swap; drop “variety” framing | PDI-V2 | Low |
| PRODUCT DEMONSTRATION STILLS + SAME thread | `:670-675` | **REMOVE** | Owned by structured PRODUCT_DEMO | PRODUCT_DEMO schema + PDI-V1 + renderer | Low |
| EXCEPTION FOR PRODUCT DEMONSTRATION (AI shapes) | `:653-657` | **REWRITE** | No full Q→A→R in IMAGE | PRODUCT_DEMO for proof; IMAGE may show problem UI | Low |
| VISUAL PROGRESSION | `:646-648` | **REWRITE** | Strengthen real visual change for IMAGE | Prompt Builder | Low–med |
| visually distinct | `:643-645` | **KEEP** | Needed once continuity narrowed | Prompt Builder | — |
| Creative DNA override | `promptBlocks.ts:49` | **KEEP** | World lock | Creative DNA | — |
| Story Integrity world lock | `:50` + SI | **KEEP** | No metaphor escape | Story Integrity | — |
| PRODUCT DEMONSTRATION INTEGRITY candidate line | `:51` | **REWRITE** | Point to structured PRODUCT_DEMO | PDI + PRODUCT_DEMO | Low |
| `buildProductDemonstrationPromptBlock` | `productDemonstrationIntegrity.ts:658-697` | **KEEP** | Correct 4C.1 contract | PDI | — |
| PDI structured validation | validate* @2 | **KEEP** | Source of truth | PDI | — |
| PRIMARY_ACTOR identity validator | PDI ~514–541 | **KEEP** | Prevents 9d9fa60b | PDI | — |
| Floating-icon ban | PDI ~544–557 | **KEEP** | Fake resolution ban | PDI | — |
| Structured PRODUCT_DEMO schema/renderer | product-demo/* | **KEEP** | Demo ownership | PRODUCT_DEMO | — |
| ensureStructuredProductDemo | ensure* | **KEEP** | Satisfiable demo | Workflow | — |
| Creative Identity SAME treatment | identity promptBlocks | **KEEP** | Staging only | Creative Identity | — |
| Attention / VN amplify winner | promptBlocks 48 | **KEEP** | Winner protection | Creative Candidate | — |

---

## Final answers

### 1. Which rules became obsolete after Sprint 4C.1?

- **`PRODUCT DEMONSTRATION STILLS` (PB-S1)** — full AI-still ask→waiting→answer→result on SAME thread  
- **Prefer same hands / same phone / same kitchen-or-street on every still (PB-C3)**  
- **“Every subsequent still must keep SAME person OR same phone” as a universal IMAGE rule (PB-C2 as written)**  
- **4C `IMAGE PROMPT CONTINUITY` inside PDI prompt** — already **DEAD** (removed in `1f3c37f`)  
- **Requiring IMAGE stills to carry product proof** when structured PRODUCT_DEMO exists  

### 2. Which continuity rules must remain?

- **PDI-V2 / PDI-P2:** no unexplained human identity swap; UI-only / PRODUCT_DEMO exempt  
- **DNA + Story Integrity world lock**  
- **Creative Identity treatment continuity** (lighting/camera/comp — not subject)  
- **PRODUCT_DEMO `conversation_id` + visible Q/A/outcome** inside the demo scene  
- **Floating-icon / smile-as-resolution bans** (PDI-V3 + renderer)  

### 3. Which rules must be narrowed rather than removed?

- Continuity header/block (**PB-C1/C2/C4**) → match PDI-V2  
- **PB-X1** EXCEPTION → problem-state UI only; not full demo  
- **PB-D2** VISUAL PROGRESSION → require real multi-axis IMAGE change  
- **CC-4** → structured PRODUCT_DEMO wording  

### 4. Which component must exclusively own ask→answer→result?

**Structured PRODUCT_DEMO** (`ProductDemoBeat` schema) **validated by Product Demonstration Integrity** and **executed by `product_demo@1` renderer** (plus `ensureStructuredProductDemo` for presence).  

Prompt Builder must not re-own this via AI IMAGE sequences.

### 5. What is the minimal safe patch?

In `buildGenerateContentPackagePrompt` `visualBeatsLines`: **REMOVE** 670–675; **REWRITE** 662–668 and 653–657; **REWRITE** 646–648 for IMAGE progression; **KEEP** 643–645.  
In `promptBlocks.ts:51`: **REWRITE** to structured PRODUCT_DEMO.  
**Do not** weaken PDI validators, schema, ensure*, or renderer.

### 6. What regression could the patch reintroduce?

- **9d9fa60b-class multi-actor lifestyle swaps** if continuity rewrite is too weak  
- **Missing visual product proof** if PRODUCT_DEMO injection/validation were accidentally weakened (must not touch those)  
- **Smile / floating-icon resolutions** if PDI-V3 or renderer constraints were removed (must not)  

### 7. Which tests prevent that regression?

TEST 1 + TEST 6 (actor / fake resolution) — existing integrity suite must stay green.  
TEST 3 (PRODUCT_DEMO ownership) — structured suite.  
TEST 2 + TEST 4 + TEST 5 + TEST 7 — new prompt-assembly assertions proving stale SAME-phone/demo-still instructions are gone and IMAGE progression requirements remain.

---

_End of audit. Classifications and patch bounds are derived from commits `8f43cdb` / `1f3c37f`, sprint reports 4C/4C.1, current PDI@2 + PRODUCT_DEMO code paths, and the observed Prompt Builder residue at `generateContentPackage.ts:653-675`._
