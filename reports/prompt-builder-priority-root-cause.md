# ROOT CAUSE AUDIT — WHY CONTINUITY OVERRIDDEN VISUAL DIVERSITY

**Mode:** READ ONLY · evidence only  
**Scope:** Decision hierarchy inside / feeding `buildGenerateContentPackagePrompt()`  
**Does not re-litigate:** that Prompt Builder lines 662–675 are the collapse site (prior audit). This report explains **who overrode whom, why, and whether that was intentional**.

**Package under study (behavior evidence):** run `2f896bec…` / package `5adb5e92…`

---

## Executive answer

**Who overrode whom**

| Winner | Loser |
| --- | --- |
| Continuity + Product-Demo SAME-thread contract | Visual diversity / VISUAL PROGRESSION / Attention / Visual Narrative variety |

**Why (prompt text, not guess)**

1. Continuity is labeled **`(mandatory for every still)`**.  
2. Diversity is **not** labeled mandatory; it uses softer imperatives (`Make the stills visually distinct…`, `Prefer: problem world → …`).  
3. Continuity section also contains **`Forbidden for variety`** — an explicit anti-diversity rule.  
4. Product-demo stills require **SAME thread / SAME phone** for multiple beats.  
5. Earlier injected blocks already say DNA / winner **override** Identity / Narrative / Attention.  
6. There is **no** prompt line that says “when continuity conflicts with visual progression, prefer visual progression.”

**Intentional or bug?**

| Layer | Verdict | Evidence |
| --- | --- | --- |
| Continuity defeating **lifestyle actor swaps** | **Intentional** | Sprint 4C commit + `reports/sprint-4c-product-demonstration.md` — previous bug was 3 actors + smile/floating-icon resolution (`9d9fa60b`) |
| Continuity defeating **VISUAL PROGRESSION / location diversity** without reconciliation | **Unintended side effect** | Diversity lines were left in place; no priority resolver added; 4C.1 later moved demo to structured `PRODUCT_DEMO` but **left** the AI-still continuity block in `generateContentPackage.ts` |

---

## 1. Every instruction class inside `buildGenerateContentPackagePrompt()`

Assembly order is the `return [` list at lines **819–929**. Categories below follow that order.

### A. Project / strategy / constraints

| Source | Category |
| --- | --- |
| `projectBrainBlock` | Product truth |
| `constraintsBlock` | Safety / forbidden claims |
| `painPointFirstBlock` / `proofBlock` / `scenarioBlock` | Story fuel |
| `websiteLinkRulesBlock` | CTA/link rules |
| `antiRepetitionBlock` / recent asset usage | Anti-repetition |
| Funnel asset policy / asset coverage | Asset policy |
| `STRATEGY ITEM` + CTA types | Strategy |

### B. Creative mode / attention / quality / hook

| Block | Category |
| --- | --- |
| `buildCreativeDirectiveBlock` | Creative mode / voice / hook archetype |
| Package diversity lines | Run-level package distinctness |
| `ATTENTION FIRST` (535–551) | Attention / retention priority |
| `attentionPromptBlock` (injected) | Attention mechanism + originality |
| `CONTENT QUALITY` (581–604) | Length / pacing / forbidden copy |
| `HOOK V2` (607–630) | Hook / first seconds |

### C. Winner / narrative / DNA (injected before VISUAL BEATS)

| Block | Category |
| --- | --- |
| `creativeCandidatePromptBlock` | Creative Candidate Selection + hard rules |
| `narrativeBeatPromptBlock` | Narrative Beats |
| `creativeDnaPromptBlock` | Creative DNA / world lock |
| `creativeCandidateFidelityRepair` | Repair (conditional) |

### D. VISUAL BEATS (`visualBeatsLines`, 635–712) — video only

| Lines / block | Category |
| --- | --- |
| 638–645 | Scene count + **visual diversity** (“visually distinct”) |
| 646–648 | **Visual Progression** (must change location OR action OR information OR emotion OR stakes) |
| 649–652 | No readable text in AI images |
| 653–657 | Product-demo UI exception (structured chat shapes) |
| 658–660 | Metaphor → visual state, not text |
| **662–668** | **Continuity (mandatory)** — same actor / same phone |
| **670–675** | **Product Demo still sequence** — SAME thread/phone |
| 677–682 | Scene Meaning (**priority over look**) |
| `visualNarrativePromptBlock` | Visual Narrative / meaning carrier |
| `productRevealPromptBlock` | Product reveal strategy |
| `visualMediumPromptBlock` | Medium |
| `visualStyleGuardrailBlock` | Style (anti dark/cinematic) |
| `visualProfileImagePromptBlock` | Visual profile |
| `creativeIdentityPromptBlock` | Creative Identity (env/light/mood/comp) |
| `videoSceneCompositionBlock` | Composition |
| `deviceScreenInteractionBlock` + DEVICE SCREENS | Device/UI still rules |

### E. Assets / presentation / platforms / JSON task

| Block | Category |
| --- | --- |
| AVAILABLE ASSETS + phone/quote/statistic helpers | Assets |
| Smart asset usage / scene-type history / series context | Series / history |
| `buildPresentationGenerationBlock` | Allowed scene types |
| VISUAL SCENE PLAN (900–910) | Scene Planning dramaturgy |
| Platform style + TASK JSON shape | Output schema |

---

## 2. Diversity-related instructions (inventory)

| # | Text (abbrev.) | Location | Strength markers |
| --- | --- | --- | --- |
| D1 | “Make the stills **visually distinct** from each other” | `visualBeatsLines` ~643–644 | Imperative; **not** “mandatory” |
| D2 | “**VISUAL PROGRESSION**: each scene **must** change location OR action OR information OR emotion OR stakes — never website→website … with the same narrative state” | ~646–648 | “must”; OR-list allows action/info-only change |
| D3 | “Prefer: problem world → failure → consequence → solution” | ~648 | “Prefer” |
| D4 | “Do not default to generic … empty environments” | SCENE MEANING ~682 | Soft ban |
| D5 | Visual Narrative: prefer variety over repeating motifs; “beats may shift when the story requires it” | injected VN block | Guidance |
| D6 | Creative Identity (non-DNA mode): “depicting each beat's **narrative subject**” | Identity rules | Implies subject can change per beat |
| D7 | Identity recent-keys: “**vary scene subjects and props**” | Identity avoid block | Explicit variety |
| D8 | Attention originality / mechanism (injected) | `attentionPromptBlock` | Mechanism/visual concept — not still-diversity contract |
| D9 | Package diversity (production runs) | package diversity lines | Package-to-package, not scene-to-scene |

---

## 3. Continuity / product-demo instructions (inventory)

| # | Text (abbrev.) | Location | Strength markers |
| --- | --- | --- | --- |
| C1 | “PRIMARY_ACTOR + CONVERSATION CONTINUITY **(mandatory for every still)**” | `visualBeatsLines` **662** | **mandatory** |
| C2 | “Every subsequent still must keep the **SAME person OR** continue the **same phone/chat conversation**” | **664–665** | must / SAME |
| C3 | “**Prefer:** same hands / same phone / same kitchen-or-street environment progressing the conversation — **not a new lifestyle portrait each beat**” | **666–667** | Prefer inside mandatory section |
| C4 | “**Forbidden for variety:** swapping to a different suited professional mid-package” | **668** | Explicit anti-variety |
| C5 | PRODUCT DEMONSTRATION STILLS **required sequence** on **SAME thread** / **SAME phone/chat** | **670–675** | required / SAME / MUST |
| C6 | Creative Candidate hard rule: “PRODUCT DEMONSTRATION INTEGRITY: … with **one PRIMARY_ACTOR**” | `promptBlocks.ts:51` | must |
| C7 | “Attention / Visual Narrative / Identity … must **AMPLIFY this winner, not replace it**” | `promptBlocks.ts:48` | Explicit demotion |
| C8 | “When CANONICAL CREATIVE DNA is present below, it **overrides conflicting staging** from Identity / Narrative / Product Reveal” | `promptBlocks.ts:49` | Explicit override |
| C9 | “STORY INTEGRITY: every visual beat must stay inside the **selected world** — no mid-video metaphor escape” | `promptBlocks.ts:50` | World lock |
| C10 | DNA immutableRules e.g. “Do not relocate the primary story away from…” | DNA block | Hard world lock |
| C11 | Identity DNA-treatment: “Creative DNA.world is the **mandatory location**” | `creative-identity/promptBlocks.ts:34` | mandatory location |
| C12 | Product Demonstration Integrity block: lock PRIMARY_ACTOR; structured `PRODUCT_DEMO` | injected via candidate block | Hard gate / structured beat |
| C13 | storyProgression: “**Hold the opening situation** → …” | candidate fields in candidate block | Hold-opening |

---

## 4. Contradiction table

| Instruction A | Instruction B | Conflict? | Reason |
| --- | --- | --- | --- |
| D1 visually distinct | C1–C3 same hands/phone/env | **YES** | Distinct stills vs same subject/env family |
| D2 must change **location** (as one OR option) | C3 same kitchen-or-street environment | **YES** when location is the intended progression axis |
| D2 must change action/info/emotion/stakes | C1–C5 same phone thread progressing conversation | **PARTIAL** | Action/info *can* change on same phone; location/subject cannot |
| D5 VN beats may shift / motif variety | C7–C9 amplify winner / DNA overrides Narrative / stay in world | **YES** | VN variety subordinated to winner/DNA |
| D7 Identity “vary scene subjects and props” | C3–C4 same hands; forbidden variety swaps | **YES** | Direct opposite on subject variety |
| D8 Attention selected wall-plan concept (this run) | C7 amplify winner / C10 DNA hands world | **YES** | Attention concept unused in stills |
| SCENE MEANING “priority over look” | C1 continuity mandatory | **NO direct** | Meaning≠diversity; both can bind |
| C5 SAME-thread demo sequence | D2 location change | **YES** | Multi-beat demo on one phone blocks location hopping |
| C12 structured PRODUCT_DEMO (4C.1) | C5 AI still demo sequence in `visualBeatsLines` | **YES (stale dual contract)** | 4C.1 moved demo to structured scene; AI-still SAME-phone sequence still in Prompt Builder |

---

## 5. Is the contradiction only inside Prompt Builder?

**No — but the fatal local contradiction is inside Prompt Builder.**

| Layer | Continuity / lock rules | Diversity rules | Injected later? |
| --- | --- | --- | --- |
| Creative Candidate block (before VISUAL BEATS) | C6–C9, C12, C13 | Amplify-not-replace demotes Attention/VN | Injected into Prompt Builder input |
| Creative DNA block | C10 | — | Injected |
| **visualBeatsLines** | **C1–C5** | **D1–D4** | **Authored in same array — contradiction co-located** |
| Visual Narrative / Identity | C11; Identity SAME treatment | D5–D7 | Injected inside VISUAL BEATS section |
| Post-prompt validators (workflow) | Product Demonstration Integrity hard fail / repair | Information-progression warnings (soft) | **After** LLM — enforce continuity/demo, not diversity |

Trace: nothing *after* Prompt Builder rewrites the prompt to prefer continuity. Continuity wins **inside the composed user prompt** before the LLM runs. Validators later reinforce demo/actor rules (`productDemonstrationIntegrity` / Story Integrity), not visual diversity.

---

## 6. Why the LLM followed continuity (prompt-text evidence only)

| Mechanism | Evidence in prompt text |
| --- | --- |
| **Mandatory wording** | Section title: `PRIMARY_ACTOR + CONVERSATION CONTINUITY (mandatory for every still)` (line 662). Diversity lacks “mandatory”. |
| **Explicit anti-diversity** | `Forbidden for variety: swapping to a different suited professional mid-package` (668). |
| **Repeated SAME language** | SAME person / same phone / SAME thread / SAME phone/chat (664–673) — repeated in consecutive bullets. |
| **Required sequence consuming still budget** | Required demo steps 1–4 on SAME thread (670–675) with only 3–`MAX_VIDEO_SCENE_STILLS` AI stills. |
| **Stronger earlier override clauses** | Candidate block: DNA **overrides** Identity/Narrative; Attention/VN/Identity must **AMPLIFY** winner, not replace (promptBlocks 48–49). |
| **Instruction order (local)** | D1–D2 appear **first** (~643–648); C1–C5 appear **immediately after** (~662–675) as a new titled mandatory section — later, harder-labeled constraint in the same VISUAL BEATS chapter. |
| **No resolver** | No line states priority when D2 conflicts with C1/C5. |
| **Behavioral proof (this run)** | Output prompts use literal “Same hands, same phone…” — language from C3, not from D1. |

Not used as evidence: model psychology, temperature, provider defaults.

---

## 7. Does Prompt Builder define instruction priority?

| Kind | Present? | Where |
| --- | --- | --- |
| Explicit priority: Scene Meaning over look | YES | `SCENE MEANING (priority over look)` (677) |
| Explicit priority: Attention First (scroll-stop > CTA) | YES | `ATTENTION FIRST` priority order (538–540) — about attention metrics, not still diversity |
| Explicit priority: DNA overrides Identity/Narrative/Product Reveal | YES | Creative Candidate hard rules (`promptBlocks.ts:49`) |
| Explicit priority: Continuity > Visual Progression | **NO** | Absent |
| Explicit priority: Visual Progression > Continuity | **NO** | Absent |
| Implicit priority via “mandatory” + “Forbidden for variety” | **YES** | Lines 662–668 |

**Conclusion:** Priority of continuity over diversity is **implicit** (wording force + anti-variety forbid + SAME-thread demo), amplified by **explicit** DNA/winner overrides over Narrative/Attention. It is **not** declared as a formal Continuity > Diversity hierarchy.

---

## 8. Continuity instruction provenance

### A. `visualBeatsLines` CONTINUITY + DEMO STILLS (662–675)

| Field | Value |
| --- | --- |
| Commit | `8f43cdb0c75e979dee41ab6fbcdfaaf719cd063e` |
| Author | Alexandr Krivsic `<o.kryvshych@gmail.com>` |
| Date | 2026-07-19 00:36:30 +0200 |
| Sprint | **Sprint 4C — Product Demonstration Integrity** |
| Message | “Add Product Demonstration Integrity to force visual ask→answer→result (Sprint 4C). Block packages that only claim the product in voiceover or resolve with smiles/floating icons; **lock PRIMARY_ACTOR continuity**…” |
| Doc | `reports/sprint-4c-product-demonstration.md` |
| Previous bug | Audit `9d9fa60b`: 3 actors; smile/floating icon resolution; keyword false-PASS; lifestyle variety instead of conversation progression |
| Expected fix | Same actor/phone conversation; Question→AI answer→result; example resolution: “**Same visitor's hands on the same phone**…” (sprint doc §4) |

### B. Candidate-block PRODUCT DEMONSTRATION INTEGRITY line

| Field | Value |
| --- | --- |
| Commit | same `8f43cdb` |
| File | `lib/creative-candidates/promptBlocks.ts:51` |

### C. DNA overrides Identity/Narrative (pre-4C)

| Field | Value |
| --- | --- |
| Commit | `70528682` — “Add Creative DNA to preserve Divergence winners through packaging” |
| Date | 2026-07-18 |
| Effect | Winner/DNA already outranked Narrative/Identity staging |

### D. Amplify winner, don’t replace (pre-4C)

| Field | Value |
| --- | --- |
| Commit | `58eaff0a` — Creative Candidate Selection / Divergence v2 |
| Line | `promptBlocks.ts:48` |

### E. 4C.1 change (important)

| Field | Value |
| --- | --- |
| Commit | `1f3c37f` — “Make product demonstration satisfiable… (Sprint 4C.1)” |
| Effect | Removed `IMAGE PROMPT CONTINUITY (mandatory)` from `productDemonstrationIntegrity.ts` prompt block; moved demo to structured `PRODUCT_DEMO` |
| **Not removed** | Continuity + SAME-thread AI still sequence in `generateContentPackage.ts` **662–675** |

---

## 9. Did Sprint 4C intentionally sacrifice diversity?

### Intentional (documented)

From `reports/sprint-4c-product-demonstration.md`:

- Problem: “Image prompts generated **lifestyle variety**, not conversation progression”
- After example: “**Same visitor's hands on the same phone** as the answered chat…”
- Actor continuity: lock PRIMARY_ACTOR; identity change → hard fail

Commit body: explicitly “**lock PRIMARY_ACTOR continuity**”.

So sacrificing **mid-package lifestyle / actor variety** for conversation continuity was **intentional**.

### Unintended side effect (evidenced)

1. Pre-4C text **D1/D2 remained** (“visually distinct”, “must change location OR …”) with **no** reconciliation clause.  
2. Sprint doc does **not** say “drop location diversity” or “demote VISUAL PROGRESSION”.  
3. 4C.1 moved proof to structured `PRODUCT_DEMO` (satisfiable demo) but left AI-still SAME-phone sequence in Prompt Builder — dual contract.  
4. This run’s Attention originality (wall-plan) and VN walk-away framing were produced then ignored — not listed as a 4C goal.

**Verdict:** Continuity > actor-variety was intentional. Continuity silently defeating unreconciled VISUAL PROGRESSION / Attention / VN outputs is an **unintended priority collapse**.

---

## 10. Components whose useful output became unreachable

| Component | Produced useful output on this run? | Later ignored? | Exactly where |
| --- | --- | --- | --- |
| Attention originality | YES — selected “Crossing out post more…” | YES | Never appears in `visual_scenes`; overridden by winner/DNA + continuity stills |
| Creative Candidates (losers) | YES — departure board, clocks, empty desk, etc. | YES at selection | Commercial selection chose `c4` hands; not Prompt Builder |
| Visual Narrative | YES — walk-away / two-person tension allowed | YES partially | Still prompts stay on one phone POV; VN “beats may shift” loses to C1–C5 + C7–C9 |
| Creative Identity “vary subjects” | YES as text | YES | Conflicts with C3–C4; stills keep same hands |
| VISUAL PROGRESSION (D2) | YES as text in Prompt Builder | YES for location/subject | OR-clause satisfied only via micro action/info on same phone |
| Scene Planning (LLM) | YES — wrote prompts | N/A (executor) | Followed C1–C5 literally (“Same hands, same phone…”) |
| Narrative Beats | YES — distinct informationKeys | NO (survived as intent) | Lost only at visual still layer |
| Structured PRODUCT_DEMO (4C.1) | YES — scene 4 different surface | NO | Works; does not stop AI stills 1–3/5 from SAME-phone lock |

---

## 11. Real instruction priority graph (observed)

Derived from **wording force + explicit overrides + this run’s outputs** — not the intended architecture diagram.

```
PRODUCT DEMONSTRATION (required SAME-thread / structured PRODUCT_DEMO)
        ↓
CONTINUITY (mandatory for every still; Forbidden for variety)
        ↓
CREATIVE DNA / SELECTED WINNER (overrides Identity / Narrative / Product Reveal;
                                  Attention/VN/Identity must AMPLIFY, not replace)
        ↓
STORY INTEGRITY (stay inside selected world)
        ↓
CREATIVE IDENTITY (SAME lighting/camera/composition/env treatment)
        ↓
SCENE MEANING (priority over look)
        ↓
VISUAL PROGRESSION / “visually distinct”   ← present but weaker / unreconciled
        ↓
VISUAL NARRATIVE variety / motif shift
        ↓
ATTENTION originality visual concept
        ↓
Narrative beat information goals (still distinct in metadata; weak in stills)
```

Intended hierarchy in comments (`generateContentPackage.ts` 847–851) places Narrative Beats between winner and DNA/visuals; **observed still behavior** follows the graph above.

---

## 12. FINAL QUESTION

### What is the FIRST decision that caused Visual Diversity to become LOWER PRIORITY than Continuity?

**Decision:** Insert the section titled  
`PRIMARY_ACTOR + CONVERSATION CONTINUITY (mandatory for every still)`  
**immediately after** unreconciled VISUAL PROGRESSION / “visually distinct” instructions, including the line **`Forbidden for variety`**, without adding a conflict resolver.

| Field | Value |
| --- | --- |
| **File** | `lib/ai/prompts/generateContentPackage.ts` |
| **Function** | `buildGenerateContentPackagePrompt` |
| **Lines** | **662–668** (header + continuity bullets; demo SAME-thread **670–675** reinforces) |
| **Commit** | `8f43cdb0c75e979dee41ab6fbcdfaaf719cd063e` |
| **Reason** | Sprint 4C response to `9d9fa60b` (actor swaps + lifestyle variety + missing visual ask→answer→result). Continuity was marked **mandatory** and variety was **forbidden**; diversity lines were left intact without a priority statement. |
| **Evidence** | (1) git diff of `8f43cdb` adds only the continuity/demo block after D1/D2; (2) sprint doc’s “After” example is “Same visitor's hands on the same phone…”; (3) section title contains the only “mandatory for every still” label in this conflict; (4) this run’s prompts quote “Same hands, same phone…”. |

**Pre-conditions (not the first Continuity>Diversity decision):** DNA/winner overrides over Narrative/Attention (`7052868` / `58eaff0`) already demoted staging variety relative to the winner world — but did not yet introduce the **mandatory same-phone / Forbidden for variety** still contract.

---

## Closing

Continuity defeated diversity because Prompt Builder (Sprint 4C) **labeled continuity mandatory and forbade variety** while leaving VISUAL PROGRESSION / visually-distinct instructions **unreconciled and weaker**. That was intentional for actor/demo failures from `9d9fa60b`, and an unintended silent priority collapse for scene-to-scene visual diversity — later made worse by 4C.1 removing continuity from the product-demo integrity prompt block but **not** from `visualBeatsLines`.
