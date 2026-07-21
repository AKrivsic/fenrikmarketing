# GOLDEN REGRESSION VALIDATION — POST IMPLEMENTATION

**Mode:** READ ONLY · evidence only · no fixes · no suggestions  
**Fixture:** production run `2f896bec-05f1-4091-82b0-7e384894eef2`  
**Artifacts:** `reports/audit-2f896bec/`, `reports/production-run-2f896bec-*-creative-audit.md`, `reports/root-cause-visual-story-collapse-2f896bec.md`  
**Code inspected:** `lib/ai/prompts/generateContentPackage.ts`, `lib/creative-candidates/promptBlocks.ts`

---

## GATE RESULT — IMPLEMENTATION NOT PRESENT

| Check | Evidence | Result |
| --- | --- | --- |
| Approved patch applied to Prompt Builder? | `generateContentPackage.ts:653-675` still contains `EXCEPTION FOR PRODUCT DEMONSTRATION` full Q→A→R sequence, `PRIMARY_ACTOR + CONVERSATION CONTINUITY (mandatory for every still)`, `Prefer: same hands / same phone / same kitchen-or-street`, `Forbidden for variety`, `PRODUCT DEMONSTRATION STILLS` | **NO** |
| Candidate line 51 rewritten? | `promptBlocks.ts:51` still: `visuals must show Question → AI answer → useful result with one PRIMARY_ACTOR` | **NO** |
| Uncommitted patch in working tree? | `git status --short` on those two files: empty | **NO** |
| Commit implementing patch after 4C.1? | Latest touches: `8f43cdb` (4C), `1f3c37f` (4C.1). No subsequent prompt-patch commit | **NO** |
| Post-patch package re-run for `2f896bec`? | No golden / post-patch fixture; only pre-patch audit artifacts | **NO** |

**Therefore:** There is no “after implementation” package to validate. BEFORE PATCH and AFTER PATCH for prompt source are **identical** (pre-patch text still live). Fixture IMAGE prompts remain the collapsed production output.

**Production readiness decision:** **NO**

---

## Part 1 — Prompt diff

### BEFORE PATCH (approved baseline to remove/rewrite)

From audit `stale-prompt-rules-after-structured-product-demo.md` / code at patch approval time — same as current HEAD:

| Block | Text (current HEAD = before) |
| --- | --- |
| VISUAL BEATS | visually distinct + escalate (643–645) |
| VISUAL PROGRESSION | change location OR action OR information OR emotion OR stakes (646–648) |
| EXCEPTION / PRODUCT DEMONSTRATION (AI) | MUST depict sent→waiting→reply→confirmation in IMAGE (653–657) |
| CONTINUITY | mandatory every still; SAME person OR same phone; Prefer same hands/phone/street; Forbidden for variety (662–668) |
| PRODUCT DEMONSTRATION STILLS | Q / waiting / AI answer / result on SAME thread (670–675) |
| Candidate line 51 | visuals must show Q→A→result with one PRIMARY_ACTOR |

### AFTER PATCH (expected from approved plan)

| Block | Expected change |
| --- | --- |
| PRODUCT DEMONSTRATION STILLS | **REMOVED** |
| Continuity | **REWRITTEN** to PDI-aligned anti-swap only |
| EXCEPTION | **REWRITTEN** — no full Q→A→R in IMAGE |
| VISUAL PROGRESSION | **REWRITTEN** — multi-axis IMAGE change; not Identity treatment axes |
| Candidate line 51 | **REWRITTEN** — structured PRODUCT_DEMO |

### Observed AFTER (actual codebase)

| Block | Diff vs before | Diff vs approved after |
| --- | --- | --- |
| VISUAL BEATS | **NONE** | Unchanged (KEEP was expected) |
| CONTINUITY | **NONE** | Still mandatory same-phone/hands |
| VISUAL PROGRESSION | **NONE** | Still soft OR-list only |
| PRODUCT DEMONSTRATION STILLS | **NONE** | Still present |
| EXCEPTION | **NONE** | Still forces AI-still Q→A→R |
| Candidate line 51 | **NONE** | Still pre-4C.1 wording |

### Removed instructions → ownership moved?

| Instruction | Removed in code? | Ownership moved? |
| --- | --- | --- |
| PRODUCT DEMONSTRATION STILLS | **NO** | N/A — still claimed by Prompt Builder; PRODUCT_DEMO also owns (dangerous duplicate remains) |
| Prefer same hands / phone / street | **NO** | N/A |
| Mandatory every-still same person/phone | **NO** | N/A |
| EXCEPTION full AI demo sequence | **NO** | N/A |
| Candidate “visuals must show Q→A→R” | **NO** | N/A |

---

## Part 2 — IMAGE prompts (fixture `2f896bec`)

Source: job input / creative audit. IMAGE scenes: 1, 2, 3, 5. Scene 4 = PRODUCT_DEMO (not AI IMAGE).

### Scene inventory

| # | Type | Narrative beat | Scene meaning | Primary subject | Location | Action | Camera / composition | Narrative function | Device | Actor identity | Environment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | IMAGE | setup | Question sent; waiting for reply | Hands + phone | Urban street | Thumb resting after typing; empty reply space | Extreme CU / centered / headroom | Problem open | Yes — chat UI abstract | Hands only (light skin) | Soft-focus urban street, overcast |
| 2 | IMAGE | conflict | Waiting; no reply | Same hands + phone | Same street | Phone lowered; blinking cursor; resignation | Same CU / centered | Problem hold | Yes — same thread | Same hands | Same street |
| 3 | IMAGE | escalation | Leaving chat / consequence | Same hands + phone | Same street | Thumb away; chat closing blur; phone pulled down | Same CU / centered | Consequence | Yes — phone | Same hands | Same street |
| 4 | PRODUCT_DEMO | resolution | Structured ask→answer→outcome | Deterministic chat UI | N/A (navy demo graphic) | Controlled chat raster | Full-bleed UI graphic | Product proof | Chat UI (renderer) | `actor_id: primary_actor` (no face) | Demo chrome |
| 5 | IMAGE | cta | Ongoing conversation / relief | Same hands + phone | Same street | Thumb ready; abstract reply bubbles | Same CU / centered | Soft resolution (duplicates demo surface in AI still) | Yes — chat bubbles | Same hands | Same street |

Prompt literals (IMAGE 2, 3, 5 open with):

> “Same hands, same phone, same urban street exterior…” / “Same hands, same phone…”

### Adjacent IMAGE pair comparison

| Pair | subject | location | action | stakes | emotion | composition | perspective | information | narrative purpose | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1→2 | same | same | micro (lower phone) | same world | slight (resignation) | same | same | waiting vs sent (overlap) | hold problem | **FAIL** |
| 2→3 | same | same | leave chat | slight up | quiet consequence | same | same | departure gesture | escalate surface-same | **FAIL** |
| 3→5 | same | same | hold phone engaged | relief vs leave | mood flip | same | same | abstract replies (no readable proof) | resolution mimic | **FAIL** |
| 1→3 | same | same | leave vs send | slight | slight | same | same | consequence vs ask | progression weak | **FAIL** |
| 1→5 | same | same | engaged vs send | mood | relief | same | same | abstract “answered” still | duplicate family | **FAIL** |

**IMAGE diversity restored?** **NO** — fixture still collapses to one hands+phone+street family.

Rendered stills (`audit-2f896bec/scenes/scene-scene-{1,2,3,5}.png`): all show light-skinned hand(s), notched black phone, blurred European street, muted warm grade — distinguishable only by micro UI/gesture, not by subject/location/composition family.

---

## Part 3 — PRODUCT_DEMO (fixture)

Payload (creative audit):

```json
{
  "type": "product_demo",
  "actor_id": "primary_actor",
  "conversation_id": "fenrik-demo-thread-001",
  "question_visible": true,
  "ai_answer_visible": true,
  "outcome_visible": true,
  "visitor_question": "Do you offer same-day consultations?",
  "ai_answer": "Yes — we have availability today. Would you like to book a slot or get more details first?",
  "outcome_type": "question_resolved",
  "outcome_label": "Visitor continues the conversation and selects a time",
  "demo_variant": "after_hours_response",
  "brand_name": "Fenrik.chat"
}
```

| Check | Result | Evidence |
| --- | --- | --- |
| visitor_question | Present | payload + still text |
| ai_answer | Present | payload + still text |
| outcome | Present (truncated on still) | payload + still “selects a” cut off |
| conversation_id | Present | `fenrik-demo-thread-001` |
| renderability | Yes | `product_demo@1`; still `scene-scene-product-demo.png` |
| visible proof | Yes | Question + AI answer readable on demo still |
| useful answer | Yes | Availability / book-or-details |

**Is PRODUCT_DEMO now the ONLY owner of question / answer / result / conversation continuity?**

**NO**

Evidence: Prompt Builder still requires `PRODUCT DEMONSTRATION STILLS` SAME-thread sequence and EXCEPTION AI Q→A→R; Scene 5 IMAGE also depicts abstract reply bubbles (“conversation ongoing”). Ownership remains **duplicated** between structured PRODUCT_DEMO and AI IMAGE / Prompt Builder contracts. (4C.1 runtime for this fixture still rendered PRODUCT_DEMO correctly — that is intact 4C.1 behavior, not exclusive ownership after the unapplied patch.)

---

## Part 4 — Continuity

| Check | Result | Evidence |
| --- | --- | --- |
| No unexplained actor swaps | **PASS** (fixture) | Single hands-POV identity; no suited-professional rotation |
| No random professional | **PASS** | No face-swap lifestyle cast |
| No identity jump | **PASS** | Consistent hands |
| No broken story world | **PASS** (world) / note VO vs demo time-of-day contradiction (forensic W2) | DNA phone/chat world held |
| IMAGE not forced same hands | **FAIL** | Prompt text + code still prefer/mandate; IMAGE prompts literal “Same hands…” |
| IMAGE not forced same phone | **FAIL** | Same |
| IMAGE not forced same street | **FAIL** | Same |
| IMAGE not forced same framing / environment | **FAIL** | Same CU + street across 1/2/3/5 |

---

## Part 5 — Visual diversity

| Question | Answer | Evidence |
| --- | --- | --- |
| Can a human immediately distinguish every scene? | **Weakly** — micro gesture/UI only | Stills 1/2/3/5 same family |
| Is every scene visually necessary? | **NO** | 1≈2 waiting overlap; 5 overlaps PRODUCT_DEMO resolution surface |
| Does each scene communicate new information? | **Partial** | 3 adds leave; 2 mostly repeats 1; 5 re-states “answered” without readable proof |
| Any scene redundant? | **YES** | Scene 2 vs 1; Scene 5 vs PRODUCT_DEMO intent |
| Would any two be mistaken as duplicates? | **YES** | **1↔2**, **1↔5**, **2↔5**, **3↔1** (same hands/phone/street/framing) |

---

## Part 6 — Story progression

Expected arc: Problem → Escalation → Consequence → PRODUCT_DEMO → Outcome

| Stage | Scene | Advances story? | Flag |
| --- | --- | --- | --- |
| Problem | 1 | Yes | — |
| Escalation / wait | 2 | Minimal | **static / repeated beat** vs 1 |
| Consequence | 3 | Yes (leave) | surface-same |
| PRODUCT_DEMO | 4 | Yes (proof) | — |
| Outcome | 5 | Weak / duplicate info | **duplicate information** vs demo; AI still “answered” without readable proof |

Flags: static/near-duplicate **1–2**; duplicate resolution surface **5 vs 4**.

---

## Part 7 — Regression check

| Regression | PASS / FAIL | Evidence |
| --- | --- | --- |
| Three different actors | **PASS** | Single hands identity |
| Floating icon | **PASS** | No floating chat icon in IMAGE stills; demo is structured UI |
| Smile replaces proof | **PASS** | No smile resolution |
| PRODUCT_DEMO missing | **PASS** | Scene 4 present, typed, rendered |
| Prompt forces same hands | **FAIL** | Code 666–667 + IMAGE prompts 2/3/5 |
| Prompt forces same phone | **FAIL** | Same |
| Prompt forces same street | **FAIL** | Same |
| Four nearly identical scenes | **FAIL** | IMAGE 1/2/3/5 same family |

Sprint 4C.1 PRODUCT_DEMO path on this fixture: **intact**.  
Sprint 4C continuity over-hardening + diversity collapse: **still present** (patch not applied).

---

## Part 8 — Architecture check (live code + fixture)

| Responsibility | Expected owner | Observed | Mark |
| --- | --- | --- | --- |
| Question | PRODUCT_DEMO | PRODUCT_DEMO **and** Prompt Builder stills/EXCEPTION **and** IMAGE problem beats | **DUPLICATE** |
| Answer | PRODUCT_DEMO | PRODUCT_DEMO **and** PB stills **and** Scene 5 abstract replies | **DUPLICATE** |
| Result | PRODUCT_DEMO | PRODUCT_DEMO **and** PB stills step 4 | **DUPLICATE** |
| Conversation continuity (demo) | PRODUCT_DEMO `conversation_id` | Also PB “SAME thread/phone” for AI stills | **DUPLICATE** |
| Actor identity | PDI | PDI present; PB broader same-person/phone still active | **DUPLICATE** (PB overclaim) |
| World | Creative DNA | DNA + SI present | **OK** |
| Visual treatment | Creative Identity | Identity SAME treatment present | **OK** |
| Visual diversity | Prompt Builder | Defeated by continuity/demo-still blocks still in PB | **MISSING** (effective) |
| Renderer | Renderer | `product_demo@1` + `image@1` | **OK** |

---

## Part 9 — Quality score (fixture + live prompts)

| Dimension | Score | Deductions |
| --- | --- | --- |
| Story progression | **5/10** | −3 scene 2 near-static vs 1; −2 scene 5 duplicates demo resolution |
| Visual diversity | **2/10** | −8 four IMAGE scenes same hands/phone/street/framing family |
| Product proof | **7/10** | −2 truncated outcome on demo still; −1 after-hours chrome vs business-hours VO (forensic W2) — demo still shows Q+A |
| Continuity | **6/10** | + actor lock OK; −4 over-forced phone/hands/street (diversity collapse mechanism) |
| Architecture | **3/10** | −7 unapplied patch; dangerous PB↔PRODUCT_DEMO duplicate contracts still live |
| **Overall** | **4/10** | Weighted by failed diversity + missing implementation gate |

---

## Final decision

1. **Did the implementation successfully eliminate the visual diversity collapse?**  
   **NO** — implementation is absent; fixture IMAGE prompts still collapse; Prompt Builder still forces same hands/phone/street.

2. **Did Sprint 4C protections remain intact?**  
   **YES** (on fixture): no three-actor swap, no floating icon, no smile-as-proof. Those protections were never removed because the patch was never applied.

3. **Did Sprint 4C.1 PRODUCT_DEMO remain intact?**  
   **YES** (on fixture): structured beat present, rendered via `product_demo@1`, Q/A/outcome visible. Unaffected by non-implementation.

4. **Would you approve this implementation for production?**  
   **NO**

---

## Decision stamp

# NO — IMPLEMENTATION NOT VALIDATED (NOT PRESENT)

Golden validation against `2f896bec-05f1-4091-82b0-7e384894eef2` finds the approved patch **not in source**, **no post-patch regeneration**, and the original visual-diversity collapse **unchanged**.

_End of validation._
