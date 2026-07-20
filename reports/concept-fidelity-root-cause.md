# Concept Fidelity Failure — Root Cause Forensics

**Mode:** Root cause analysis · no code/prompt changes  
**Date:** 2026-07-20  
**Scope:** Every production package that persisted Creative Candidate diagnostics  
**Question:** Why does the **first** Claude package generation fail Concept Fidelity so often?

---

## 1. Executive summary

In the Creative Candidates era (2026-07-17 → 2026-07-19), **9 of 10** packages required a fidelity repair (second full Claude generation). That is a **90%** first-pass failure rate on the only production cohort that stores fidelity evidence.

The dominant first-fail reason is not “CTA missing” or “wrong product demo.” It is:

1. **`opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame`** (7/9 repair packages)  
2. **`hook_not_preserved_in_first_spoken`** (7/9)

**Root cause: F — Combination**, quantified from this cohort:

| Driver | Approx. contribution | Evidence |
| --- | ---: | --- |
| **C — Validator too strict / brittle** | **~40–50%** of first fails | Style-boilerplate + 220-char head window; `departure-board` vs `departure board`; `person's hands` ≠ `customer's hands` regex — several scenes are human-acceptable but fail |
| **D — Claude invents a different story** | **~30–40%** | Clear hook/VO rewrite away from winner (e.g. newsletter-40-clicks vs form-abandon) |
| **B — Creative Candidate quality** | **~20–30%** | `topic` = long strategy title baked into `industryCue`; `openingSituation === coreIdea`; candidates demand readable UI text forbidden by NO_TEXT |
| **E — Conflicting requirements** | **~15–25%** (overlaps C/B) | Image style prefixes vs subject-in-head; NO_TEXT vs “seen” / “Phone caller #47”; many prompt blocks vs “MUST execute THIS winner” |
| **A — Prompt unclear** | **Low as sole cause** | Prompt already says MUST for hook/opening; failures persist anyway |

**Claude call impact:** mean **2.1** full package generations per package in this cohort. Eliminating first-pass fidelity failures would remove **~0.9 Claude package calls per package** (~**43%** of package-generation Claude calls).

---

## 2. Dataset

### Coverage reality (no sampling)

Creative Candidate + fidelity fields are stored under:

`package_brief.presentation_generation.creative_candidates`

| Metric | Value |
| --- | ---: |
| All `content_packages` (60d) | 311 |
| With `creative_candidates` | **10** |
| Window | 2026-07-17 16:18 → 2026-07-19 23:32 UTC |
| Projects | **Fenrik.chat only** (`aabab9ff-…`) |
| Markets / languages | Single product, English, global SaaS |

**There are not 100 packages with fidelity diagnostics.** This report uses **the entire production population** of that instrumentation (N=10), not a sample. Pre–Creative-Candidates packages cannot answer this question (no `regenerationReason` / `finalScriptFidelity`).

### Per-package fields collected

For each of the 10: package id, run id, created_at, selected candidate (family, hook, opening, core, product, ending), stored hook/VO/CTA/scene1/scene count, `regenerationReason`, `finalScriptFidelity`, `storyIntegrity`, `productDemonstrationIntegrity`, Claude generation count inferred from repair flags.

| package_id | run_id | created | family | regen? | fidelity final | story | Claude gens (inferred) |
| --- | --- | --- | --- | --- | --- | ---: |
| `ff367a55-…` | `04911a16-…` | 07-17 | absurd | **no** | pass | — | **1** |
| `754109c7-…` | `2fbd759b-…` | 07-17 | absurd | yes | fail | — | 2 |
| `bd8f0491-…` | `36da8255-…` | 07-18 | absurd | yes | fail | — | 2 |
| `ba3d2e09-…` | `4633f34f-…` | 07-18 | direct | yes | fail | — | 2 |
| `3ceab6ba-…` | `9d9fa60b-…` | 07-18 | direct | yes | fail | — | 2 |
| `c0a4cda3-…` | `73841d6b-…` | 07-18 | direct | yes+story | fail | pass* | **3** |
| `e887421a-…` | `a44c1c9f-…` | 07-19 | direct | yes+story | fail | pass* | **3** |
| `5adb5e92-…` | `2f896bec-…` | 07-19 | direct | yes | fail | pass | 2 |
| `daf295c0-…` | `3c58a5f3-…` | 07-19 | direct | yes | **pass** | pass | 2 |
| `b4bce30e-…` | `146b3533-…` | 07-19 | direct | yes | fail | pass | 2 |

\*Story integrity repair ran; final `storyIntegrity.passed=true`.

---

## 3. Classification counts

| Group | Definition | Count | % of 10 |
| --- | --- | ---: | ---: |
| **A** | Passed Concept Fidelity first time (`regenerationReason` null) | **1** | 10% |
| **B** | Failed Concept Fidelity only (repair, no `story_integrity:`) | **7** | 70% |
| **C** | Failed Story Integrity only | **0** | 0% |
| **D** | Both fidelity + story repair | **2** | 20% |

**Packages requiring fidelity repair (B+D): 9/10 = 90%.**

---

## 4. Failure reason frequency

Parsed from the **fidelity segment** of `regenerationReason` (text before `;story_integrity:`). This reflects the **first** failed check (what triggered the second Claude call).

| Rank | Normalized reason | Count | % of 9 repair pkgs |
| ---: | --- | ---: | ---: |
| 1 | `opening_situation_missing_from_scene1` → **`main_subject_missing_from_scene1_opening_frame`** | 7 | **77.8%** |
| 2 | `hook_not_preserved_in_first_spoken` | 7 | **77.8%** |
| 3 | `storyboard_collapsed_to_generic_office` | 2 | 22.2% |
| 4 | `product_or_topic_not_implied` | 2 | 22.2% |
| — | `core_idea_not_recognizable` | 0 in regenReason | — |
| — | `voiceover_essay_or_generic_opener` | 0 in first regen* | — |

\*Appears in **final** `failureReasons` for `b4bce30e` after repair still failed.

**Sole first-fail reasons (exactly one reason):**

| Package | Sole reason |
| --- | --- |
| `754109c7` | opening / main_subject |
| `ba3d2e09` | opening / main_subject |
| `bd8f0491` | hook_not_preserved |
| `daf295c0` | hook_not_preserved |

**Trend (N=10, chronological):** first-pass pass only once (earliest mascot package). From 07-17 evening onward, every package repaired. No recovery trend inside the window.

---

## 5. Failure examples (≥20 comparisons requested; 9 failed available — all opened)

Below: Creative Candidate → stored package → validator. All 9 first-fail packages.

### 5.1 `ba3d2e09` — **validator false positive (style head + synonym)**

- **Candidate opening:** customer’s hands sending urgent question; reply “seen”  
- **Generated scene1:** long style prefix (“Soft polished 3D render… quiet optimism…”) then **person’s hands + smartphone + messaging UI**  
- **Hook:** preserved (“Urgent question dies in silence.”)  
- **Validator:** `main_subject_missing_from_scene1_opening_frame`  
- **Why:** subject must appear in **first 220 chars**; “hands” starts after ~230 chars of boilerplate. Also `visitor_hands` regex wants `customer's hands` or `hands`…`(typ|send|form)` — “person’s hands” / “sent” ≠ `send`.  
- **Human judgment:** opening matches the candidate.

### 5.2 `5adb5e92` — **FP opening + product token brittleness**

- **Candidate:** customer’s hands / urgent question / “seen”  
- **Generated:** person’s hands + smartphone + chat widget + read receipt (hook preserved after repair)  
- **First regen:** opening + hook + product_or_topic  
- **Final still fails:** opening + product + generic_office  
- **Why opening fails:** `person's hands` not `customer's hands`; head window partially includes “hands” but regex still misses.  
- **Human judgment:** visually on-concept.

### 5.3 `754109c7` — **FP / code drift (board present)**

- **Candidate:** train-station departure board, phone vs website visitor  
- **Generated scene1:** stylized **departure board** with phone icon vs browser icon (NO_TEXT compliant)  
- **Hook:** preserved  
- **Stored failure:** main_subject missing  
- **Re-check with current `fidelityCheck.ts`:** **passes** on the stored scene1  
- Prior audit already flagged this as false negative after NO_TEXT. Human-acceptable.

### 5.4 `bd8f0491` — **hyphen false positive**

- **Candidate:** departure board…  
- **Generated:** “stylized **departure-board** panel” (hyphen)  
- **Current validator:** still **`main_subject_missing`** because axis regex is `\bdeparture\s+board` (space only)  
- **Human judgment:** same subject.

### 5.5 `3ceab6ba` — **mixed (near-match opening, rewritten hook)**

- **Candidate hook:** “Urgent question dies in silence.”  
- **Package hook:** “Someone typed an urgent question into your website last night”  
- **Scene1:** hands + smartphone (kitchen 3D)  
- **Fail:** opening main_subject + hook tokens  
- Semantic overlap high; token/subject rules fail.

### 5.6 `c0a4cda3` — **true Claude invent (+ story repair)**

- **Candidate hook:** “Urgent question dies in silence.”  
- **Package:** “Eleven visitors came to her website over the weekend”  
- **Opening candidate:** customer hands / seen  
- **Scene1:** hands + phone (partial visual fidelity) but **spoken story replaced**  
- Clear instruction ignore on hook/story.

### 5.7 `e887421a` — **true invent + generic collapse**

- **Candidate:** urgent question / hands  
- **Package hook:** “Good traffic means your website is working. It does not.”  
- **Scene1:** clean flat illustration, quiet studio interior (not hands)  
- Fail: opening + hook (+ story CTA later)

### 5.8 `b4bce30e` — **true invent (newsletter story)**

- **Candidate:** “Form abandoned now, discovered after vacation.” / visitor hands on contact form  
- **Package:** “She sent the newsletter. Forty people clicked…”  
- **Scene1:** home office, hands above laptop keyboard (generic office collapse)  
- Fail: opening + hook + generic_office; final also essay opener

### 5.9 `daf295c0` — **hook-only first fail; repair succeeded**

- **Sole first reason:** `hook_not_preserved_in_first_spoken`  
- **After repair:** hook exact match; scene1 has **visitor’s hands** + contact form; `finalScriptFidelity.passed=true`  
- Shows repair can work when Claude finally copies the winner.

### 5.10 Contrast — only Group A: `ff367a55`

- **Candidate:** mascot melting in parking lot + fake typing  
- **Scene1:** mascot costume at glass door / parking lot visible — subject+setting present early enough  
- Hook preserved; **no repair**

---

## 6. Pattern analysis

Statistically meaningful patterns **within N=10** (single project — treat as descriptive, not multi-market proof):

| Factor | Observation |
| --- | --- |
| Market / language / product | **No variance** — all Fenrik.chat EN |
| Family `direct_product_world` | 7 packages, **7/7** repaired |
| Family `absurd_understandable` | 3 packages, **2/3** repaired (only mascot passed first) |
| Scene count 4 vs 5 | No separation (fails in both) |
| `openingSituation === coreIdea` | **10/10** — candidate builder copies `situation.scene` into both |
| Opening starts with `Handheld urgency:` | 9/10 (variant expander); only mascot (no prefix) passed first |
| Corrupted `industryCue` = strategy title | All “question to The {long title}…” openings — direct_product winners |
| PRODUCT_DEMO / presentation | Failures concentrate on **scene1 + hook**, not demo block |
| Hook types | Short punchy winner hooks often rewritten into narrative essays |

**No multi-market correlation available** in production evidence.

---

## 7. Prompt compliance (failed first-pass packages, N=9)

Judged on **stored final package** vs winner (post-repair content; first draft not retained).

| Behavior | Count | % of 9 |
| --- | ---: | ---: |
| Invented a **different spoken story** (hook ≠ winner, different premise) | 4–5 | **~44–56%** |
| Preserved hook text (exact / near) | 4–5 | ~44–56% |
| Scene1 **semantically** matches opening (hands/board) | 6–7 | **~67–78%** |
| Scene1 fails **validator** subject-in-head anyway | 7 | 78% |
| Preserved CTA family (product assistant CTA) | ~9 | high |
| Preserved Product Demo structure | where PDI present: passed | — |
| Collapsed to generic office/laptop | 2 | 22% |

**Interpretation:** Claude often **partially** follows (visual near-match) while **failing token/subject rules**, and in a large minority **fully replaces** the spoken concept. This is not “prompt has no MUST” — the prompt does; compliance is incomplete under competing instructions and broken candidate text.

---

## 8. Validator analysis

File: `lib/creative-candidates/fidelityCheck.ts`

### Rules (hard fail if any reason)

| Rule | Mechanism | Strictness |
| --- | --- | --- |
| Opening → scene1 | Subject/setting/action **axis regexes** + **first 220 chars** for main subject + token overlap | **Very high** / brittle |
| Hook → first spoken / hook field | ≥3 shared significant tokens OR prefix include | Medium |
| Core idea | ≥3 tokens vs VO+visuals **OR** opening faithful | Medium (often rescued by opening) |
| Product/topic | `rawTokens` substring **or** ≥2 tokens from `productConnection` vs VO | Medium–high (sparse tokens: e.g. `website visitor`, `unanswered`) |
| Generic office | `matchesGenericConcept(scene1)` **or** (laptop/desk/office **and** opening unfaithful) | Coupled to opening fail → **double-counts** |
| Essay/generic opener | Essay cadence / “Most businesses…” on first spoken | Medium |

Matching is **heuristic regex + token overlap**, not embeddings. No confidence threshold — binary.

### Trigger frequency (first fail, N=9)

| Rule | Triggers | Sole trigger | If removed, would avoid 2nd gen? |
| --- | ---: | ---: | --- |
| main_subject / opening | 7 | 2 (`754109c7`, `ba3d2e09`) | **Yes for those 2 alone**; also would drop opening from multi-reason packs |
| hook_not_preserved | 7 | 2 (`bd8f0491`, `daf295c0`) | **Yes for those 2** |
| generic_office | 2 | 0 | Rarely alone (follows opening) |
| product_or_topic | 2 | 0 | Rarely alone |

**Estimated share of repairs avoidable by validator softening alone (opening head/synonym/hyphen): ~3–5 of 9 (~33–55%)**, without changing Claude.

---

## 9. False positives

Packages where validator failed but a human would likely accept the **visual** concept:

| Package | Why rejected | Why human OK |
| --- | --- | --- |
| `ba3d2e09` | subject after 220-char style prefix; person’s≠customer’s hands | Hands + phone question visible |
| `5adb5e92` | person’s hands / regex | Hands + chat + “seen” equivalent |
| `754109c7` | main_subject (historical); current code passes | Departure board icons match intent |
| `bd8f0491` | `departure-board` hyphen | Same board |

**False positive rate (opening rule among first fails):** of 7 opening fails, **≥4 (~57%)** are plausible FPs.  
**Overall first-fail FP rate (any reason):** roughly **~40–50%** of the 9 repairs are “unnecessary” relative to human concept match (not counting true invents).

Caveat: first draft is not stored — some FPs are assessed on post-repair stills.

---

## 10. False negatives

Packages where validator **passed** but package clearly violates the candidate:

| Package | Issue |
| --- | --- |
| `ff367a55` | Only first-pass pass. Opening says mascot **melting in parking lot**; scene shows mascot **inside at glass door waving** — related but not literal melt. Still scored pass. Mild FN risk. |

No clear “passed while totally different story” in this cohort. **False negative rate: low / sparse (≤1 mild).** The system is biased toward **false positives**, not false negatives.

---

## 11. Prompt quality vs failures

| Prompt property | Role in failures |
| --- | --- |
| Ambiguous wording | **Not primary** — candidate block uses MUST |
| Too many requirements | **Yes (contributing)** — Candidate + DNA + Narrative Beats + Attention + Identity + Quality + NO_TEXT + PDI |
| Candidate complexity | High visual specificity + UI text + long title as place |
| Prompt/response length | Not telemetried; no length correlation proven |
| Successful vs failed | Only success lacks `Handheld urgency` + uses mascot axes the regex knows well |

---

## 12. Candidate quality

From `buildCreativeCandidateFromSituation` + `generateRawSituations` + `topicSignals`:

| Issue | Evidence |
| --- | --- |
| `coreIdea` duplicated from `openingSituation` | 10/10 DB rows `opening_eq_core=true` |
| `industryCue = topic.slice(0,80)` for web_service | Strategy **titles** injected as locations (“question to The beauty salon that found…”) |
| Readable text in openings | “seen”, “Phone caller #47”, “Delayed” — conflict with image NO_TEXT; fidelity tries to map board_failure but hyphen/icons still break |
| `Handheld urgency:` variant prefix | Cosmetics; increases string noise |
| Internally inconsistent | Title-as-place is grammatically broken → encourages Claude to invent cleaner VO |
| Conflict with Story Integrity | Metaphor boards vs “stay in world”; story repair added on 2 packs |

Candidates are **not** “too creative” so much as **poorly grounded strings** that the validator then enforces literally via brittle axes.

---

## 13. Deterministic repair opportunities (no full regen)

| Failure class | Deterministic fix? | Frequency in cohort |
| --- | --- | --- |
| Hook not preserved but VO start wrong | **Yes** — already have `alignHookWithFirstSpoken`; could force `hook = winner.hookLine` and prepend VO | ~2 sole-hook + part of 7 |
| Opening FP (synonym/hyphen/head) | **Yes** — validator soften / strip style prefix before check | ~3–4 |
| True story invent | **No** — needs regen or structured rewrite | ~3–4 |
| Generic office collapse | Partial scene1 rewrite possible; usually needs regen | 2 |
| Product token miss | Inject topic anchors into VO | 2 |

**Estimate:** **~40–60%** of current second generations could be avoided by validator softening + deterministic hook alignment **without** a second full Claude package call. Remaining **~40–60%** need real content regen (true invent / collapse).

---

## 14. Cost analysis (Claude package calls only)

| Metric | Value |
| --- | ---: |
| Packages in cohort | 10 |
| First-pass fidelity fail rate | **90%** |
| Story repair rate | **20%** |
| Mean Claude **package** generations | **(1×1 + 2×7 + 3×2) / 10 = 2.1** |
| If first-pass fidelity always passed (story still 20%) | mean ≈ **1.2** |
| **Calls saved if fidelity failures disappeared** | **0.9 per package** ≈ **43%** of package-generation Claude calls |
| On 20-package run at current rate | ~18 second gens → **~18 Claude calls saved** if fidelity fixed |

Money not estimated (no token telemetry).

---

## 15. Root cause

### Verdict: **F — Combination**

| Code | Label | Quantified share of first-pass fidelity fails |
| --- | --- | ---: |
| C | Validator too strict | **~40–50%** |
| D | Claude ignores / invents | **~30–40%** |
| B | Creative Candidate quality | **~20–30%** |
| E | Conflicting requirements | overlaps C/B (**~15–25%**) |
| A | Prompt quality alone | **low** |

Primary **content-quality** answer: first Claude drafts often **nearly** match the visual candidate but fail a **brittle subject-in-opening-frame checker**, while a substantial minority **rewrite the hook/story** because candidates embed broken title-as-place strings and fight NO_TEXT / multi-block prompts.

---

## 16. Top 10 opportunities (do not implement — ranked by expected fidelity-repair reduction)

| Rank | Opportunity | Expected impact |
| ---: | --- | --- |
| 1 | Soften / fix opening fidelity: ignore style boilerplate, accept hyphen `departure-board`, synonymize person’s/visitor’s/customer’s hands, widen head window or subject search | **Very High** |
| 2 | Stop using strategy **title** as `industryCue` / place name; use short industry noun | **Very High** |
| 3 | Deterministic hook enforcement before fidelity check (`hook` + first spoken = `hookLine`) | **High** |
| 4 | Decouple `collapsedToGenericOffice` from opening failure (stop double-penalty) | **High** |
| 5 | Align candidate openings with NO_TEXT (no “seen” / literal board labels; visual-intent wording) | **High** |
| 6 | Stop duplicating `coreIdea = openingSituation`; give distinct preserve targets | **Medium** |
| 7 | Reduce competing prompt blocks when candidate is selected (DNA/Identity must amplify, not restage) | **Medium** |
| 8 | Expand topic `rawTokens` beyond sparse phrases so `product_or_topic` doesn’t false-fail | **Medium** |
| 9 | Persist **pre-repair** package snapshot for true FP/FN measurement | **Medium** (measurement) |
| 10 | Family-specific axis coverage (more web-service subjects than HVAC/airport leftovers) | **Low–Medium** |

---

## 17. Confidence & missing evidence

| Claim | Confidence |
| --- | --- |
| 90% repair rate in Creative Candidates cohort | **HIGH** (complete N=10) |
| Dominant reasons opening+hook | **HIGH** |
| Validator FP on hyphen / 220-char / synonym | **HIGH** (reproduced in current code) |
| True Claude invent on ~⅓–½ of fails | **HIGH** on clear cases; **MEDIUM** on boundary cases |
| Multi-market / 100-package generalization | **LOW** — instrumentation only exists for Fenrik, N=10 |
| Exact first-draft vs post-repair content | **LOW** — first draft discarded |
| Prompt length / token correlation | **NONE** — no telemetry |

---

_End of report._
