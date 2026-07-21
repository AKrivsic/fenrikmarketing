# ARCHITECTURE REVIEW — PRE-IMPLEMENTATION SAFETY REVIEW

**Mode:** READ ONLY · evidence only · no implementation · no redesign  
**Patch under review:** `reports/stale-prompt-rules-after-structured-product-demo.md` Part 8 (Changes 1–6; validators/renderer untouched)  
**Code anchors:** `lib/ai/prompts/generateContentPackage.ts:643-682`, `lib/creative-candidates/promptBlocks.ts:51`, `lib/creative-candidates/productDemonstrationIntegrity.ts`, `lib/scene-types/product-demo/*`, `lib/creative-identity/promptBlocks.ts:30-46`, `lib/creative-candidates/storyIntegrity.ts`

---

## Verdict

**APPROVE IMPLEMENTATION — YES WITH SMALL ADJUSTMENTS**

The proposed patch removes stale pre-4C.1 Prompt Builder contracts that duplicate structured `PRODUCT_DEMO`. Ownership of ask→answer→result, conversation thread, floating-icon ban, and actor-identity hard fail already exists outside the blocks being removed. No orphaned hard responsibility appears if the rewrite constraints below are followed.

The only blocking-class wording risks inside the *proposed* rewrite text (not in the removal itself):

1. Continuity rewrite must retain PDI-aligned anti-swap language (must not become an empty delete).  
2. VISUAL PROGRESSION rewrite must not require changing Identity-owned treatment axes (`SAME lighting/camera/composition`) and must remain inside DNA/SI world.

Those are wording constraints on Changes 2 and 4 — not a redesign.

---

## Part 1 — Patch verification

### Change 1 — REMOVE `PRODUCT DEMONSTRATION STILLS` (670–675)

| Responsibility | Owner today (after 4C.1, without Prompt Builder stills) | Complete? |
| --- | --- | --- |
| Question | `ProductDemoBeat.visitor_question` + `question_visible` (`productDemoBeat.ts`); hard-checked in `validateProductDemonstrationIntegrity` (`structured_question_missing`); painted by `composeProductDemoRaster` | **YES** |
| Answer | `ai_answer` + `ai_answer_visible`; `structured_answer_missing`; raster | **YES** |
| Useful result | `outcome_*` + `outcome_visible`; `structured_outcome_missing`; raster | **YES** |
| Same conversation | `conversation_id` on structured beat; PDI prompt requires stable thread; renderer uses one beat | **YES** |
| Presence of demo scene | `ensureStructuredProductDemo` + `product_demo_scene_missing` | **YES** |

**Ownership complete after removal.** Prompt Builder stills were a duplicate writer, not the sole owner.

---

### Change 2 — REWRITE PRIMARY_ACTOR continuity (662–668)

| Guarantee | Hard owner (unchanged by patch) | Prompt role after rewrite |
| --- | --- | --- |
| No unexplained actor swap | PDI `primary_actor_identity_changed` (~514–541) | Soft instruction mirroring PDI |
| No identity jump | Same + `buildProductDemonstrationPromptBlock` lines 689–693 | Soft |
| Valid continuity (person scenes) | PDI + DNA anchors in PDI prompt | Soft |
| Same phone / same hands every IMAGE | **None required after 4C.1** | Must not reassert |

**Does any responsibility disappear?**  
Only responsibilities that 4C.1 already decommissioned for ordinary IMAGE stills (mandatory same-phone / same-hands / same-street). Actor-identity hard guarantee remains in PDI. Soft authoring cue remains if rewrite keeps “Forbidden: different human identity without narrative reason” (same language as PDI prompt 693).

**Gap risk:** If Change 2 is implemented as **delete entire block** instead of rewrite → Prompt Builder loses authoring cue; hard gate still exists in PDI → **not orphaned**, but higher LLM actor-swap rate until repair loop. **Adjustment A:** rewrite must keep PDI-aligned forbid language; do not delete the block wholesale.

---

### Change 3 — REWRITE EXCEPTION (653–657)

| Guarantee | Owner after rewrite | Evidence |
| --- | --- | --- |
| Readable UI restrictions on AI IMAGE | **KEEP** lines 649–651 (unchanged): never readable words in image_prompt | Prompt Builder |
| Product proof (Q→A→R) | PRODUCT_DEMO schema + PDI + renderer | Not IMAGE EXCEPTION |
| Floating icon prohibition | PDI `FLOATING_ICON_RE` / `floating_icon_replaces_interaction` (~544–557); also banned in `buildProductDemonstrationPromptBlock` 685–687 | Hard gate |
| Smile / landing-page fake demo | PDI secondary + repair appendix | Hard gate |

**Ownership complete** if rewrite stops requiring IMAGE to depict full sent→waiting→reply→confirmation sequence. Soft IMAGE guidance may still ban floating icon / smile-as-proof (harmless duplicate of PDI).

---

### Change 4 — REWRITE VISUAL PROGRESSION (646–648)

| System | Could stronger IMAGE diversity violate it? | Circumstances |
| --- | --- | --- |
| Creative DNA | **YES** | If progression forces a new physical setting outside `dna.world` / immutable “Do not relocate…” (`creativeDNA.ts` deriveImmutableRules) |
| Story Integrity | **YES** | If middle scenes relocate to unjustified settings (`storyIntegrity.ts` ~505) or invent forbidden metaphors (~405–421) |
| Narrative Beats | **Unlikely** | Progression already prefers problem→failure→consequence→solution; multi-axis IMAGE change supports beat escalation |
| PRODUCT_DEMO | **NO** | Change 4 targets consecutive **IMAGE** scenes; structured demo owned separately; PDI/renderer untouched |

**Identity conflict in proposed wording:**  
Creative Identity (DNA treatment mode) requires **SAME lighting/camera/composition/color treatment** (`creative-identity/promptBlocks.ts:35`). Proposed Change 4 lists **composition** (and implies camera via “perspective”) as diversity axes → **real contradiction** if implemented literally.

**Adjustment B:** Progression axes for IMAGE must be subject / location-within-world / action / consequence / narrative function (and similar). Must **not** require changing Identity-owned treatment (lighting, camera language, composition treatment, color). Must remain inside DNA world (SI already hard-checks).

---

### Change 5 — REWRITE `promptBlocks.ts:51`

| After rewrite to structured PRODUCT_DEMO | Remaining Prompt Builder inconsistency? |
| --- | --- |
| Candidate hard rule aligns with `buildProductDemonstrationPromptBlock` (already structured, lines 666–683) | **Resolved** once Changes 1–3 land |
| If Change 5 ships **without** Change 1 | **YES — inconsistency remains:** line 51 says structured PRODUCT_DEMO while visualBeats still mandates AI-still sequence 670–675 |

**Adjustment C (ordering):** ship Change 1 (and 2–3) with Change 5 in the same change set — already implied by the patch plan; do not land line 51 alone.

---

## Part 2 — Responsibility graph AFTER patch

```
Actor identity (no unexplained swap)
  → Product Demonstration Integrity (hard)     [OK]
  → Prompt Builder continuity rewrite (soft)   [OK — writer/checker]

Question → Answer → Result (product proof)
  → PRODUCT_DEMO schema + ensureStructuredProductDemo + PDI + renderer   [OK]

Same conversation (demo thread)
  → PRODUCT_DEMO.conversation_id               [OK]

World consistency
  → Creative DNA (author) + Story Integrity (check)   [OK — documented pair]

Visual treatment (lighting/camera/comp/color)
  → Creative Identity                          [OK]

IMAGE visual diversity / progression
  → Prompt Builder (PB-D1 KEEP + PB-D2 rewrite) [OK — soft only]

Scene meaning
  → Prompt Builder SCENE MEANING + Visual Narrative (when present) [OK]

Winner protection (no Attention/VN replace)
  → Creative Candidate promptBlocks CC-1       [OK]

PRODUCT_DEMO type fidelity (no silent IMAGE downgrade)
  → renderFidelity / analyzePresentation       [OK]

Language-variant visual clone
  → languageVariantScenes                      [OK]

Readable glyphs in AI IMAGE prompts
  → Prompt Builder 649–651                     [OK]

Floating icon / smile-as-demo
  → PDI (+ optional soft Prompt Builder)       [OK]
```

| Node | Status |
| --- | --- |
| Actor continuity hard | **OK** |
| Q→A→R | **OK** |
| Demo conversation | **OK** |
| World | **OK** (dual writer/checker) |
| Treatment | **OK** |
| IMAGE diversity | **OK** (prompt-only; pre-existing — no hard diversity validator today or after) |
| Renderer fidelity | **OK** |

No **MISSING** hard owner for product proof, actor-identity fail, or demo thread.

---

## Part 3 — Orphan detection

| Responsibility | Orphaned by patch? | Belongs to |
| --- | --- | --- |
| same actor (identity) | NO | PDI hard + continuity rewrite soft |
| same world | NO | DNA + Story Integrity |
| same conversation | NO | PRODUCT_DEMO `conversation_id` |
| same product / business | NO | DNA productRole + SI / Project Brain (unchanged) |
| same environment (GPS street every still) | Intentionally dropped as Prompt Builder mandate | DNA world ≠ identical street; Identity = treatment |
| same lighting / composition treatment | NO | Creative Identity (unchanged) |
| product proof | NO | PRODUCT_DEMO + PDI + renderer |
| story continuity (world/conflict) | NO | SI + Narrative Beats |
| problem progression | NO | Prompt Builder VISUAL PROGRESSION + Narrative Beats |
| viewer comprehension | NO | SCENE MEANING + VN |
| brand consistency | NO | Identity + Visual Profile (unchanged) |
| chat continuity (demo) | NO | PRODUCT_DEMO |
| question / answer ownership | NO | PRODUCT_DEMO fields |
| same hands / same phone (every IMAGE) | Dropped — not an orphan | Was stale AI-still contract; not required by PDI-V2 |

**No orphaned required responsibility.** Dropped items are intentional decommission of pre-4C.1 AI-still contracts.

---

## Part 4 — Duplicate detection AFTER patch

| Responsibility | Layers | Required / Harmless / Dangerous |
| --- | --- | --- |
| Q→A→R authoring + validation | PDI prompt + schema + ensure* + PDI validate + renderer | **Required** writer/checker/executor |
| Actor identity | PDI prompt + PDI validate + PB continuity rewrite | **Required** soft+hard; dangerous only if PB wording contradicts PDI (broader same-phone) — rewrite must match PDI |
| World lock | DNA + SI + candidate CC-2/3 | **Required** |
| Floating icon ban | PDI hard + optional PB EXCEPTION rewrite | **Harmless** |
| IMAGE readable-text ban | PB 649–651 only | **OK** (PRODUCT_DEMO raster is separate path) |
| AI-still full demo sequence + structured PRODUCT_DEMO | Today: **Dangerous duplicate** | **Removed by Change 1** |
| same-phone every still + lifestyle surround (4C.1) | Today: **Dangerous** | **Removed by Change 2** |
| Candidate line 51 “visuals must show Q→A→R” vs structured PDI block | Today: **Dangerous wording drift** | **Fixed by Change 5** with Changes 1–3 |
| Diversity vs Identity SAME composition | Proposed Change 4 if “composition” is an axis | **Dangerous unless Adjustment B** |

---

## Part 5 — Regression risk

| Regression | Could return / still happen? | Why |
| --- | --- | --- |
| **9d9fa60b** (3 lifestyle actors) | **YES** (soft) if continuity rewrite too weak; **NO** (hard) if PDI untouched and still fails `primary_actor_identity_changed` | Hard gate remains; authoring cue quality matters |
| **2f896bec** (forced “Same hands, same phone…”) | **NO** for prompt-forced collapse if Changes 1–2 remove those strings; **residual soft bias** possible from DNA/candidate hands world | Root forced instruction removed |
| Floating icon | **NO** if PDI untouched | `floating_icon_replaces_interaction` remains |
| 3 actors | Same as 9d9fa60b | PDI hard |
| No visible product proof | **NO** if schema/ensure/PDI/renderer untouched | Patch forbids touching those |
| Identical phone shots | **Much less likely**; not hard-impossible | Soft DNA/hands candidate can still bias; no diversity hard gate (pre-existing) |
| Language variants | **NO** | `languageVariantScenes` clones types/refs; patch does not touch |
| PRODUCT_DEMO downgrade | **NO** | `renderFidelity` unchanged |

---

## Part 6 — Pipeline consistency (one package)

| Stage | Input | Output | Responsibilities | Owner | Lost? | Dup? |
| --- | --- | --- | --- | --- | --- | --- |
| Strategy | Project / strategy item | Intent | Topic | Upstream | — | — |
| Creative Candidate | Strategy | Winner + DNA | Idea, DNA world, product role | Candidate / DNA | No | — |
| Narrative Beats | Winner | Beat arc | Story progression labels | Narrative | No | — |
| Prompt Builder (after patch) | Winner + DNA + Identity + VN + PDI blocks | Package LLM prompt | IMAGE distinctness + progression; soft actor identity; **not** Q→A→R stills | Prompt Builder | No | Was dup; removed |
| Scene Planner / LLM output | Prompt | visual_scenes + image_prompts + PRODUCT_DEMO entry | IMAGE prompts + structured demo payload | Model under prompt+PDI block | No | — |
| ensureStructuredProductDemo | Draft scenes | Guaranteed structured beat when allowed | Demo presence | ensure* | No | — |
| Story Integrity | Scenes + winner | Pass/fail | World / metaphor | SI | No | — |
| Product Demonstration Integrity | Scenes + beat | Pass/fail | Q→A→R fields, actor identity, floating icon | PDI | No | — |
| Renderer | PRODUCT_DEMO + IMAGE assets | Raster / video | Execute demo; fidelity | Renderer + renderFidelity | No | — |

Nothing required is lost. Dangerous Prompt Builder / PRODUCT_DEMO duplicate removed.

---

## Part 7 — Architectural invariants

| Invariant | After patch |
| --- | --- |
| One primary owner per responsibility | **Holds** (writer/checker pairs documented for DNA/SI and PDI) |
| No circular ownership | **Holds** |
| No duplicated contracts for Q→A→R in Prompt Builder IMAGE | **Holds after Change 1** |
| No Prompt Builder guaranteeing what PRODUCT_DEMO owns | **Holds after Changes 1–3** |
| Validator not unnecessarily duplicating Prompt Builder-only soft diversity | **Holds** (diversity remains prompt-only — pre-existing) |
| DNA ↔ Identity ↔ SI ↔ PB ↔ PDI ↔ Renderer | **Compatible** if Adjustment B applied; **contradiction** if Change 4 requires composition/camera change against Identity SAME treatment |

---

## Part 8 — Implementation readiness

**YES WITH SMALL ADJUSTMENTS**

Required adjustments (wording only; same files/functions):

| ID | Adjustment |
| --- | --- |
| **A** | Change 2: rewrite continuity to mirror PDI-P2 / lines 689–693; do **not** delete the whole block; remove only same-phone/hands/street mandates and “mandatory for every still” overclaim |
| **B** | Change 4: IMAGE progression axes must not require changing Identity `SAME lighting/camera/composition/color`; keep diversity in subject/action/consequence/narrative function/location-within-DNA-world; exclude UI-state-only/gesture-only same-device |
| **C** | Land Changes 1–3 and Change 5 together so candidate line 51 never contradicts residual AI-still stills text |

No redesign. No validator/renderer changes.

---

## Part 9 — Final safety checklist

| Item | Status |
| --- | --- |
| PRODUCT DEMONSTRATION STILLS | ✓ Safe to remove |
| Continuity block | ✓ Safe to rewrite (with Adjustment A) |
| same hands | ✓ Safe to remove (as universal IMAGE rule) |
| same phone | ✓ Safe to remove (outside PRODUCT_DEMO) |
| same environment (identical street) | ✓ Safe to remove (as universal IMAGE rule) |
| Forbidden for variety | ✓ Safe to rewrite (keep anti-swap intent; drop variety framing) |
| PRODUCT_DEMO ownership | ✓ Safe to keep |
| Product Demonstration Integrity | ✓ Safe to keep (must not weaken) |
| Story Integrity | ✓ Safe to keep |
| Creative DNA | ✓ Safe to keep |
| Creative Identity | ✓ Safe to keep |
| Visual Progression | ✓ Safe to rewrite (with Adjustment B) |
| Hard diversity validator | ✓ Needs follow-up (optional; not required to approve this patch — pre-existing gap) |
| Soft DNA/hands bias after patch | ✓ Needs follow-up (selection/DNA; out of patch scope) |

---

## Final answers

1. **Is the proposed patch architecturally safe?**  
   **YES — with small wording adjustments A–C.** Removals are safe; rewrites must not contradict Identity SAME treatment or delete anti-swap continuity entirely.

2. **Will every responsibility still have an owner?**  
   **YES.** Q→A→R, conversation_id, actor-identity hard fail, world, treatment, render fidelity remain owned.

3. **Will any responsibility become orphaned?**  
   **NO** for required responsibilities. Mandatory same-hands/phone/street across IMAGE is decommissioned, not orphaned.

4. **Will any responsibility remain duplicated?**  
   **YES — only required/harmless pairs:** DNA↔SI world; PDI prompt↔validate↔renderer for demo; soft PB continuity ↔ PDI hard. **Dangerous** AI-still demo duplicate is removed. Change 4 must avoid a new Identity↔Progression duplicate conflict (Adjustment B).

5. **Could Sprint 4C regressions return?**  
   **Actor-swap / 3-actors: possible via soft authoring if rewrite too weak; hard-blocked by untouched PDI.** Fake proof / missing structured demo: **NO** if validators/renderer untouched. Prompt-forced same-phone collapse: **NO** after Changes 1–2.

6. **Could the visual diversity collapse still happen?**  
   **Prompt-forced SAME-phone collapse: NO after patch.** Residual soft collapse from DNA/candidate hands bias: **YES possible** (pre-existing; not an ownership gap created by this patch).

7. **Can implementation begin immediately?**  
   **YES**, implementing Changes 1–6 exactly as scoped, applying adjustments **A–C** in the rewrite text.

---

## Decision

# APPROVE IMPLEMENTATION

**Evidence basis:** After 4C.1, `validateProductDemonstrationIntegrity` + `ProductDemoBeat` + `ensureStructuredProductDemo` + `composeProductDemoRaster` / `product_demo@1` already own product proof and conversation continuity; PDI already owns hard actor-identity and floating-icon fails; lines 649–651 already own IMAGE readable-text ban; Identity already owns SAME treatment; DNA/SI already own world. Removing Prompt Builder 670–675 and narrowing 662–668 / 653–657 removes a dangerous duplicate writer without creating a missing owner — provided Continuity is rewritten (not deleted) and VISUAL PROGRESSION does not commandeer Identity treatment axes.

_End of review._
