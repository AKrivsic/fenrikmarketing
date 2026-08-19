# Creative Failure RCA — c26ec3c5-da27-4a8e-a80c-f5e527510603

_READ-ONLY forensic investigation. No code changes. Evidence labels: **CONFIRMED** / **RECONSTRUCTED** / **INFERRED** / **NOT AVAILABLE**._

Companion files:
- `reports/c26ec3c5-full-execution-trace.md`
- `reports/c26ec3c5-call-ledger.csv`
- `reports/c26ec3c5-cost-time-waterfall.csv`
- `reports/c26ec3c5-validator-inventory.md`
- `reports/c26ec3c5-image-forensics.md`
- `reports/c26ec3c5-artifacts/`

---

# PART 1 — EXECUTIVE VERDICT

1. **At which exact step did the run become likely to produce a bad video?**  
   **Creative Direction Evaluation** of direction `d2` (“The Overlooked Clock”), when `production_feasibility` was scored **9** with critic notes that the dual-clock mechanism “can be rendered in almost any format.” **CONFIRMED** in `direction_evaluation`.  
   On the **successful** package path, the commercial doom was locked when deterministic fingerprint vetoes left **only** `c4` (“Two Clocks, One Wall”) and Candidate Judge accepted it via `deterministic_fallback` (critic_attempts=0). **CONFIRMED**.

2. **Was the selected creative concept fundamentally compatible with a still-image slideshow video?**  
   **No.** The concept’s meaning depends on real temporal state changes (frozen vs running second hands; time advancing on one clock; later synchronization). The pipeline only generates **independent stills** + Ken Burns zoom/pan. **CONFIRMED** (concept DNA + worker IMAGE×5 + ffmpeg zoompan).

3. **Could the core meaning be understood from static images without relying on real clock movement?**  
   **No, not reliably.** Scene stills do not communicate stopped vs moving; clock times do not match the requested 6:00→11:47→12:43→synced progression; scene-3 numerals are hallucinated. **CONFIRMED** via image inspection.

4. **Which validator should have rejected this concept before expensive package generation?**  
   A **still-pipeline / renderability feasibility validator** at Candidate Judge or Creative Evaluation (checking: requires continuous object motion? requires exact analog clock times? requires cross-scene object identity?). **No such validator exists** in this run. **CONFIRMED** from validator inventory / code paths exercised.

5. **Why did the existing validators allow it?**  
   - Direction/concept critics score `production_feasibility` as abstract filmmaking, not “independent AI stills.” **CONFIRMED** (critic notes; no still-pipeline language in `criticPrompt.ts`).  
   - Success path skipped LLM critic entirely (`source=deterministic_fallback`). **CONFIRMED**.  
   - Concept Fidelity checks token/heuristic wording, not motion/renderability. **CONFIRMED** (`fidelityCheck.ts`).  
   - Visual Progression soft-warned `scenes_2_and_3_no_visual_progression` but did not hard-fail. **CONFIRMED**.

6. **How much money and time was spent after the concept was already commercially non-viable?**  
   After success-path selection of `c4` (≈`2026-07-24T00:51:43Z`): Presentation + JSON repairs + persist ≈ **$0.138** + Images **$0.210** + TTS/Whisper **$0.008** + render wall **~180s** (unmetered).  
   Separately, the **failed** path (winner `c6`, then CF loop) burned **$0.685809 / 1,072,261 ms** before the outer retry. **CONFIRMED**.  
   All-in recorded AI cost for the run: **$1.366745**. Create→video-complete wall ≈ **27.9 minutes**.

7. **Did any repair step meaningfully improve customer-visible quality?**  
   **No** on the success path (no CF repair; Story Integrity passed). On the fail path, CF Repair regenerated package JSON for heuristic compliance, then the **entire path was discarded** — no customer-visible benefit. **CONFIRMED**.

8. **Which steps only improved internal schema or rule compliance?**  
   JSON Repair (×8 across paths), Concept Fidelity Repair (fail path), Hook Enforcement, Concept Fidelity pass/fail gating, Story Integrity / Product Demonstration Integrity on success path. **CONFIRMED**.

_Numeric quality score deferred until after full forensic sections (see Part 16)._

---

# PART 2 — CREATIVE CONCEPT FAILURE RCA

## Strategy item (CONFIRMED)

- **Topic:** The software company that answered every support ticket within hours — and still lost the enterprise deal because no one was there at 2 AM when it actually mattered  
- **Angle:** Fast response times during business hours feel like a win until midnight researchers aren’t on your schedule…  
- **Funnel:** Problem Aware  
- Artifact: `reports/c26ec3c5-artifacts/strategy_item_brief.json`

## Creative directions (success path, CONFIRMED)

Seven directions generated; selected top set includes **“The Overlooked Clock”** (d2) and **“The Audit That Runs Without You”** (d5).  
Direction eval for d2: `production_feasibility: 9` — “can be rendered in almost any format.”  
Artifacts: `directions_generated.json`, `directions_selected.json`, `direction_evaluation.json`

## Concepts generated (success path, CONFIRMED)

Eight concepts (`c1`–`c8`). Titles include clipboard/rubric audits, **Two Clocks, One Wall (c4)**, chalkboard schedule, etc.  
**Rejected:** c1,c2,c3,c5,c6,c7,c8 for `fingerprint_collision_recent_package`.  
**Surviving / selected:** c4 only.

## Evaluation (CONFIRMED)

```json
{
  "source": "deterministic_fallback",
  "winner_id": "c4",
  "winner_reason": "Only surviving concept after deterministic vetoes.",
  "critic_attempts": 0,
  "scores_for_c4": "flat 7s with critic_notes: sole survivor after vetoes"
}
```

## Deterministic vetoes (CONFIRMED)

All non-c4 concepts: `fingerprint_collision_recent_package`.

## Selected concept — Two Clocks, One Wall (CONFIRMED)

| Field | Value |
| --- | --- |
| candidateId | c4 |
| hookLine | Your clock stopped. Theirs didn't. |
| openingSituation | Analog clock hand snaps to 6:00 PM and stops; second hand freezes mid-sweep |
| coreIdea | Two analog clocks on one wall; business clock stops at 6 PM; prospect clock keeps running |
| storyProgression | Left labeled Us frozen; right running → Them label → past midnight → AI chat → both sync |
| immutableRules | 1) Identical clock models, only frozen vs running differ 2) **No voiceover during clock sequence — second hands carry the argument** 3) Mustard wall only color until product reveal |
| production_risks | Matching clocks required; frozen second hand needs battery-pull **or careful editing**; mustard wall must not look kitschy |
| expected motion | Second-hand snap/stop; one frozen while other runs; sync at end |
| expected comprehension | Temporal mismatch between business hours and prospect research hours |

**Critical contradiction (CONFIRMED):** immutable rule forbids VO during clock sequence, but final package has continuous voiceover over all five stills.

### Candidate comparison table (success path)

| Candidate | Core idea | Required visible action | Compatible with static stills? | Product clarity | Rejected/selected reason |
| --- | --- | --- | --- | --- | --- |
| c1 Clipboard | Private rubric scoring vendors | Legible checklist ticks / blank column | Weak (needs readable text) | Medium | fingerprint_collision |
| c2 Kitchen audit | Night kitchen table evaluation | Writing “?” on legal pad | Partial | Medium | fingerprint_collision |
| c3 Rubric dinner | Formal rubric blank cell fills | Prop swap / readable grid | Weak | Medium | fingerprint_collision |
| **c4 Two Clocks** | Frozen vs running clocks | **Real temporal hand motion + exact times + continuity** | **No** | Low without authentic product | **SELECTED (sole survivor)** |
| c5 Chalkboard | Schedule stops after 5 | Chalk writing / blank half | Partial | Medium | fingerprint_collision |
| c6–c8 | (see concepts_generated.json) | varies | varies | varies | fingerprint_collision |

Failure-path Candidate Judge winner was **c6** (different concept; draft **NOT AVAILABLE**). **CONFIRMED** from failure_telemetry output_summary.

### A–E answers

**A. Did the winning concept require real temporal motion?**  
**Yes.** Explicitly: second hand snap/stop; left frozen while right runs; time from 6 PM→11:47→12:43; final synchronization; DNA says second hands carry the argument. **CONFIRMED**.

**B. Can those states be reliably communicated using separately generated stills?**  
**No.** Evidence: scenes show wrong times, no readable freeze, scene-3 numeral garbage, scene-5 sync without prior contrast, clock models change across scenes. **CONFIRMED**.

**C. Dependent on exact clock-face rendering?**  
**Yes.** Prompts demand exact times (6:00, 11:47, 12:43) and frozen vs mid-sweep hands. **CONFIRMED**.

**D. Is exact analog-clock time a known weak task for the selected image system?**  
**Do not assert from general knowledge alone.** **Run evidence:** gpt-image-1 outputs fail exact times and produce impossible numerals (13, 16, duplicate 11) on scene-3. **CONFIRMED** by pixels. Whether the org previously documented this weakness: **NOT AVAILABLE** in this run’s telemetry.

**E. Why was production feasibility scored highly?**  
- Direction critic (Claude) assigned d2 `production_feasibility: 9` with filmmaking language (“almost any format”). **CONFIRMED**.  
- Success-path concept critic **did not run**; flat 7s from fallback. **CONFIRMED**.  
- Critic prompt (`lib/creative-engine-v3/criticPrompt.ts`) has **no** instruction about independent still generation, Ken Burns-only motion, or analog-clock fragility. **CONFIRMED** (code).  
- Concept’s own `production_risks` already warned about battery-pull/editing for frozen hands — treated as film production risk, not pipeline incompatibility. **CONFIRMED**.  
**Conclusion:** evaluation used abstract filmmaking assumptions, not real pipeline capabilities. **CONFIRMED**.

---

# PART 3 — FIRST FATAL DECISION

| Stage | Input available | What it checked | What it missed | Could have stopped waste? |
| --- | --- | --- | --- | --- |
| Strategy | Product brain / topics | Theme fit | Not responsible for visual form | No |
| Creative direction selection | 7 mechanisms | Fit/originality/feasibility (abstract) | Still-pipeline incompatibility of dual-clock | **Yes — earliest high-leverage miss** |
| Candidate generation | Directions | Invent concepts | Generated motion-dependent DNA | Partially |
| Candidate evaluation | Concepts | Scores (fail path only) | Still feasibility | Yes |
| Deterministic filtering | Fingerprints | Collision only | Left only the worst-feasible survivor | **Worsened** selection |
| Candidate judge | Survivors | Fallback sole survivor | Renderability dimensions all 0 / unused | Yes |
| Narrative beats | Selected DNA | Beat mapping | Motion requirements | Partially |
| Presentation generation | DNA + still rules | Wrote still prompts simulating motion | Prompted mutually incompatible asks | Too late commercially |
| Concept Fidelity | Tokens/heuristics | Generic-office wording | Still incompatibility; clock risk | No (wrong problem) |
| Image generation | Independent stills | Moderation | Continuity / exact time | Too late |
| Render | Zoompan | Mux | Does not animate hands | Too late |

### PRIMARY ROOT CAUSE

**Selection (and feasibility scoring) of a concept whose meaning requires continuous temporal motion and exact analog-clock continuity, in a pipeline that only produces independent still images.**

### SECONDARY ROOT CAUSES

1. Direction critic `production_feasibility` not grounded in still-pipeline constraints.  
2. Fingerprint vetoes forced sole survivor `c4` without feasibility re-check.  
3. No hard still-feasibility / clock-renderability gate before Presentation Generation.

### CONTRIBUTING FACTORS

- Immutable DNA forbids VO while package always speaks VO.  
- Presentation prompt simultaneously forbids readable numbers/labels and demands exact clock times + Us/Them labels as illegible letterforms.  
- Independent image generation with no reference locking.  
- Concept Fidelity false-positive / wording loop on fail path burned $0.69 without addressing doom.  
- Product path used synthetic phone UI despite `forbidden_forms` including `synthetic_product_ui` (presentation decision chose PRODUCT_OUTCOME). **CONFIRMED**.

---

# PART 5 — FAILED PACKAGE ATTEMPTS

| Attempt | Package draft | Failure reason | Repair performed | Cost | Time | Commercially usable? |
| --- | --- | --- | --- | --- | --- | --- |
| Fail-path gen (winner **c6**) | **NOT AVAILABLE** (not persisted) | After CF Repair loop: `concept_fidelity: storyboard_collapsed_to_generic_office` | CF Repair `retry_count=2` (3 LLM attempts) + JSON Repair ×6 | **$0.685809** | **1,072,261 ms** | **NOT PROVABLE** — draft missing |
| Nested CF repair attempts (1–3) | **NOT AVAILABLE** | Heuristic `storyboard_collapsed_to_generic_office` | Full package regenerate under RepairDelta | included above ($0.238023 CF Repair step) | 433,745 ms CF Repair step | **NOT PROVABLE** |
| Success attempt (winner **c4**) | Persisted package `9f6e880b-…` | None (CF passed) | JSON Repair ×2 only | $0.447304 package AI + $0.217861 video | ~8.5 min package + ~5.1 min video | Conceptually strong copy; **video commercially weak** |

**Key question:** Were rejected drafts better than final?  
**NOT AVAILABLE** — discarded raw drafts are not stored. **Storage deficiency CONFIRMED:** only step telemetry + terminal error string survive on `production_run_items.failure_telemetry`.

**attempt_count=3 (CONFIRMED):** mapped from `result.attempts` on generation failure — aligns with Concept Fidelity Repair `retry_count=2` (3 transport/generation attempts), not three separately stored package drafts.

---

# PART 6 — CONCEPT FIDELITY FORENSICS

| Item | Evidence |
| --- | --- |
| Implementation | `lib/creative-candidates/fidelityCheck.ts` → `checkConceptFidelity` |
| Invoked from | `lib/ai/workflows/generateContentPackage.ts` |
| Rules | opening_situation_visible_in_scene1; hook_preserved_in_first_spoken; core_idea_recognizable; product_or_topic_implied; **storyboard_collapsed_to_generic_office**; opening_event_preserved_in_scene1; stop_scroll_idea_preserved; sales_pitch_opening; voiceover_essay_or_generic_opener |
| Generic-office logic | `isAffirmativeGenericOfficeCollapse` — scene matches generic patterns OR officey tokens (laptop/desk/office/…) without exempt subjects, AND no subject/action axis overlap with opening |
| Repair policy | Material reasons → one Claude RepairDelta regenerate; then hard-fail if material residues remain (`shouldHardFailFidelityAfterRepair`) |
| Fail path | CF warning `storyboard_collapsed_to_generic_office` → CF Repair (retry_count=2) → still terminal `concept_fidelity: storyboard_collapsed_to_generic_office` |
| Success path | All diagnostics passed (`finalScriptFidelity.passed=true`) |

**Why `storyboard_collapsed_to_generic_office` on fail path:**  
Exact failed draft scene1: **NOT AVAILABLE**. Rule fires when scene1 looks “office/generic” without preserving candidate subject/action axes. Clock concepts are **not** in SUBJECT_AXIS aliases (no `clock` axis) — so a mustard-wall clock scene can still be classified as collapse if officey/generic patterns hit and axes don’t overlap. **INFERRED** from code + fail warning; **CONFIRMED** that rule does not understand clocks.

**Was it a false positive?**  
**Likely yes relative to commercial intent** if the draft was already a clock wall (cannot prove without draft). **CONFIRMED** the rule does not detect still-incompatibility.

**Did final package “fix” the same rule?**  
Success path scene1 is mustard wall + clock (not laptop/desk office); diagnostics show rule passed. **CONFIRMED**.

**Did CF improve the visual idea?**  
Success path: CF did not repair. Fail path: repair discarded. **No customer-visible improvement.**

**Did CF detect still-image incompatibility / clock risk / stopped-vs-moving?**  
**No.** **CONFIRMED**.

**Was the full retry loop justified?**  
**No** for commercial quality — it optimized a wording heuristic, then outer-retried the whole engine (~$0.69 + ~18 min fail path). Soft-continuing the first fail-path draft: **INFERRED** would have saved CF Repair $0.238 + nested JSON repairs + wall time; commercial outcome unknown without draft.

### CF cost (fail path, CONFIRMED)

| Metric | Value |
| --- | --- |
| Concept Fidelity Repair direct | $0.238023 · 433,745 ms · 17,901+12,288 tokens |
| Nested JSON Repair on fail path | 6 × ≈$0.0027 ≈ **$0.0165** · ~235s |
| Entire fail-path package | $0.685809 · 1,072,261 ms |
| CF Repair ÷ fail-path cost | ≈35% |
| Fail-path ÷ full-run recorded cost | ≈50% of $1.367 |
| Fail-path ÷ ~27.9 min wall | ≈64% of create→video wall |

---

# PART 7 — JSON REPAIR FORENSICS

| Path | Calls | Noted validation issues (CONFIRMED warnings) |
| --- | --- | --- |
| Fail | 6 | `$.video.duration_seconds: expected string`; `$.platform_outputs.x: expected object`; `$.platform_outputs.x.cta: expected non-empty string` |
| Success | 2 | (see call metas; success path also repaired) |

Broken raw responses / repair prompts / repaired bodies: **NOT AVAILABLE**.

Classification:
- **A. Genuine malformed JSON:** possible but unprovable without raw bodies.  
- **B. Schema mismatch:** **CONFIRMED** pattern — model emits number for `duration_seconds` while schema expects string; X platform shape/CTA emptiness.  
- **C. Downstream repair malformed:** possible (repairs recur).  
- **D. Unnecessary due to CF loop:** **CONFIRMED** that fail-path JSON repairs nested under CF Repair regenerations — would not exist without CF hard regenerate loop.

Schemas vs prompts: **INFERRED** disagreement on `duration_seconds` type and X CTA emptiness requirements; exact prompt text **RECONSTRUCTED** from code, not raw stored prompt.

---

# PART 8 — PRESENTATION GENERATION

Exact assembled prompt: **NOT AVAILABLE**.

**RECONSTRUCTED conflicting instructions** (from persisted DNA + `lib/architecture/presentation/renderers.ts` + final `image_prompts`):

| Instruction A | Instruction B |
| --- | --- |
| Pipeline = GENERATED **still** IMAGE scenes (4–5) | Concept requires second-hand **motion**, snap/stop, sync |
| NEVER readable numbers/labels/typography | Exact clock times 6:00 / 11:47 / 12:43 (numbers on faces) |
| Labels only as illegible letterforms | DNA story needs Us / Them labels for comprehension |
| Do not require same location/phone/hands across IMAGE scenes | DNA requires identical clocks + same mustard wall continuity |
| Avoid synthetic product UI as proof | Scene 4 prompt asks active chat interface on phone |
| DNA: no VO during clock sequence | Package always generates VO + subtitles |
| Photographic NATURAL profile | Motion blur on second hand “to convey running” |

**Verdict:** Presentation asked the image system to do mutually incompatible things. **CONFIRMED** by comparing DNA + renderer rules + emitted prompts.

---

# PART 10 — VISUAL CONTINUITY

Pipeline mechanisms for cross-scene consistency: **none exercised**.  
No shared seed, reference image, character ref, previous-scene conditioning, inpainting, or object identity lock in telemetry. **CONFIRMED**.

Yet concept expected identical clocks, identical wall, exact time progression, synchronized finale.

Observed inconsistencies (**CONFIRMED** via images):
- Clock frame color/material changes (black → black → black → silver → white)
- Numeral style changes (Arabic → hallucinated → tick-only)
- Times never match requested schedule; scene1 single clock vs later pairs
- Hand/person presence inconsistent
- Wall tone similar (mustard) but not locked identity

---

# PART 11 — STORYBOARD AND MOTION

Narrative roles: HOOK / SETUP / ESCALATION / RESOLUTION + beat_5 CLOSE. **CONFIRMED**.  
Semantic motion: zoom_in, drift_up, drift_down, zoom_in, static. **CONFIRMED**.  
Actual render motion: **Ken Burns zoom/pan on stills only** (`video-worker/services/ffmpeg.ts` zoompan). **CONFIRMED**.

**Did any scene animate clock hands?** **No.**  
**Why approved?** Feasibility scored as abstract film; no still-motion validator. **CONFIRMED**.

---

# PART 12 — VIDEO RENDER TRACE

| Item | Value | Evidence |
| --- | --- | --- |
| TTS | gpt-4o-mini-tts · shimmer · 23.856s speech · $0.005475 | video telemetry |
| Whisper | whisper-1 · 60 words · match_ratio 0.968 · $0.002386 | debug |
| Video duration | 25.366667s | debug |
| Scenes | 5 IMAGE · planned durations in render_spec ≈4s each (timeline shares map VO) | render_spec |
| FFmpeg exact argv | **NOT AVAILABLE** in job output | — |
| Motion | zoompan primitives per beat | audit + code |
| Subtitles | `images/subtitles.srt` | local artifact |
| Phone obstruction | Scene-4 CTA subs overlap subject region | prior regression audit + srt timing 20–24s on scene4 |

---

# PART 13 — COST ACCOUNTING

| Step | Calls | Tokens in/out | Direct cost | Duration ms | Output used? | Visible value |
| --- | --- | --- | --- | --- | --- | --- |
| Weekly Strategy | 1 | 3967/258 | $0.015771 | 5925 | yes | topic |
| Creative Direction Gen | 2 | 5982/4385 | $0.083721 | 95428 | fail discarded / success used | mechanism |
| Creative Direction Eval | 2 | 6549/4247 | $0.083352 | 79050 | mixed | feasibility miss |
| Creative Ideation | 2 | 11243/24093 | $0.395124 | 473249 | mixed | concepts |
| Creative Evaluation | 1 | 5179/1974 | $0.045147 | 41052 | fail path only | chose c6 |
| Presentation Generation | 2 | 47708/8192 | $0.266004 | 217788 | mixed | storyboard |
| Concept Fidelity Repair | 1 | 17901/12288 | $0.238023 | 433745 | discarded | none |
| JSON Repair | 8 | 29107/28960 | $0.021742 | 310617 | schema only | none |
| Images | 1 | — | $0.210 | 110405 | yes | weak visuals |
| TTS+Whisper | 2 | — | $0.007861 | 7337 | yes | audio/subs |
| Render | 1 | — | unmetered | 179742 | yes | slideshow |
| **Total recorded** | | | **$1.366745** | | | |

Counterfactuals (**INFERRED** savings vs recorded $1.367 / ~27.9 min):
- **A. Stop after first acceptable package draft:** N/A on success path (first success draft persisted); fail drafts unknown.  
- **B. Disable CF repair:** save ≈$0.238 + nested JSON + ~7+ min on fail path; may soft-continue c6 draft.  
- **C. Reject clock concept before Presentation:** save Presentation+images+render on success (~$0.35 + 5 min) and avoid motion-doomed video; plus avoid choosing clock direction.  
- **D. Choose still-compatible candidate:** requires not fingerprint-vetoing all alternatives / regenerating ideation — largest quality win.

---

# PART 14 — TIME ACCOUNTING

| Start (UTC) | End | Step | Notes |
| --- | --- | --- | --- |
| 00:31:29 | | Run created | |
| 00:31:31 | 00:31:38 | Strategy | |
| 00:31:41 | 00:45:39 | Fail package path | CF doom loop |
| 00:45:45 | 00:54:09 | Success package path | c4 sole survivor |
| 00:54:13 | 00:59:20 | Video job complete | |
| 00:59:22 | | Run item updated_at | |
| **05:43:22** | | `production_runs.updated_at` | **Later than video complete** |

**Why ~27.9 min create→video:** serial creative LLM calls twice (fail+success), CF Repair 7.2 min, ideation ~3–4 min each, images 110s, render 180s, JSON repairs ~5 min fail + ~1 min success. **CONFIRMED**.

**Why updated_at 05:43:22:** **NOT AVAILABLE** exact cause in artifacts; item completed 00:59:22. **INFERRED** later admin/sync/heartbeat/UI touch — not part of generate→render critical path.

---

# PART 16 — COMMERCIAL VIABILITY CHECK (viewer)

| Question | Answer |
| --- | --- |
| Understand two-clock idea in &lt;3s? | Weak — scene1 is one clock; pair appears later without clear Us/Them |
| Tell which clock is stopped? | **No** |
| Tell which is running? | **No** |
| Perceive time passing? | **No** (Ken Burns only) |
| Perceive synchronization? | **No** meaningful payoff |
| Phone establishes Fenrik? | **No** — blank/synthetic chat bubble |
| Visually alive? | Low — static wall + gentle zoom |
| Each scene adds information? | Weak; scenes 2–3 flagged static_repetition |
| Paying customer accept as premium video? | **No** |

_Deferred numeric score: commercially **non-shippable** as premium finished video; copy/hook stronger than pixels._

---

# PART 17 — ROOT-CAUSE TREE

```
Bad final video
├── Concept incompatible with still-image pipeline  [PRIMARY]
│   ├── depends on real second-hand motion
│   ├── depends on exact analog times
│   └── depends on cross-scene clock identity
├── Creative direction feasibility assumed cinematic production
├── Fingerprint vetoes left only the clock concept (no critic re-rank)
├── No still-video feasibility validator
├── Concept Fidelity checked semantic wording, not renderability
│   └── fail-path CF×3 burned $0.69 on false commercial problem
├── Image generation independent per scene (no continuity)
├── Presentation prompt contradictions (no text vs exact times; stills vs motion)
└── Product reveal used synthetic phone UI, not authentic asset
```

---

# PART 18 — FINAL ANSWERS

1. **Where first wrong?** Direction evaluation / dual-clock feasibility=9; locked on success path when c4 became sole survivor.  
2. **Why selected?** Fail path: critic chose c6 (draft lost). Success path: only non-colliding fingerprint survivor — not because it won a real comparative critic.  
3. **Why validators missed?** They check text/schema/heuristics, not still-pipeline physics.  
4. **Why CF×3?** Material `storyboard_collapsed_to_generic_office` → RepairDelta regenerate with retry_count=2.  
5. **Justified?** No for customer quality.  
6. **Earlier drafts usable?** Unknown — **not stored**.  
7. **Can this concept work in current pipeline?** **Not as specified.** Needs true video/animation or reference-locked image editing + abandoning exact-time dependence.  
8. **Why pictures weak?** Wrong task for still diffusion + no continuity + contradictory prompts.  
9. **Waste?** ≈**$0.69 / ~18 min** fail path + conceptually doomed success video spend ≈**$0.35+** after c4 selection; all-in **$1.37 / ~28 min**.  
10. **Smallest architectural correction?** Hard reject concepts requiring continuous object motion / exact analog clocks / cross-still identity **before** Presentation Generation (Candidate Judge gate).  
11. **Repair/validation changes?** Move feasibility earlier; soften/remove CF generic-office hard-fail loop; persist failed drafts; ground critic feasibility in still-pipeline facts.

---

## Evidence index

| Claim class | Primary sources |
| --- | --- |
| Telemetry/costs/times | `failure_telemetry.json`, `presentation_generation.generation_telemetry`, `video_jobs.output.debug` |
| Concept/DNA | `creative_engine`, `creative_candidates` |
| Pixels | `reports/c26ec3c5-artifacts/images/*.png` |
| Code behavior | `fidelityCheck.ts`, `criticPrompt.ts`, `presentation/renderers.ts`, `ffmpeg.ts` |
