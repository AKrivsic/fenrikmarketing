# Concept Fidelity + False Completion — Production Fix

**Date:** 2026-07-20  
**Mode:** Implementation + verification  
**Audits:** `reports/concept-fidelity-root-cause.md`, `reports/generate-content-complete-flow-audit.md`

---

## 1. Files changed

| File | Change |
| --- | --- |
| `lib/creative-candidates/fidelityCheck.ts` | Normalize hyphens/aliases; strip style boilerplate; decouple generic-office; diagnostics; material classification |
| `lib/creative-candidates/enforceCandidateHook.ts` | **New** — deterministic hookLine enforcement |
| `lib/creative-candidates/candidateValidation.ts` | **New** — candidate self-check / NO_TEXT / title-as-place repair |
| `lib/creative-candidates/topicSignals.ts` | `deriveShortIndustryCue` — no long strategy titles as place |
| `lib/creative-candidates/divergence/buildCandidatesFromSituations.ts` | Separate `coreIdea`; strip cosmetic prefixes; validate/repair |
| `lib/creative-candidates/divergence/generateRawSituations.ts` | NO_TEXT-friendly board/hands templates |
| `lib/creative-candidates/types.ts` | `FidelityRuleDiagnostic` on fidelity result |
| `lib/creative-candidates/index.ts` | Export new helpers |
| `lib/api/packageReconcileStatus.ts` | **New** — video-required vs text-only reconcile status |
| `lib/api/production-run-admin.ts` | Reconcile uses plan video requirement; persist `activeVideoPlatforms` |
| `app/api/n8n/start-video-job/route.ts` | `missing_video_job` 409 when video required; no false `text_only` |
| `lib/ai/workflows/generateContentPackage.ts` | Hook enforce → material repair only → hard fail; heal missing job; telemetry |
| `lib/ai/workflows/regenerateContentPackage.ts` | Same fidelity policy parity |
| `scripts/check-concept-fidelity-production-fix.ts` | **New** regression suite |
| `scripts/sql/find-completed-without-video.sql` | Historical detection query |
| `package.json` | `check:concept-fidelity-production-fix` script |

**Not changed:** n8n sequential orchestration, batch size, parallel generation.

---

## 2. Root cause → change map

| Evidence root cause | Fix |
| --- | --- |
| Validator FP: hyphen / hands synonym / 220-char style head | Phase 1 fidelity normalization |
| Hook rewrite → full Claude regen | Phase 3 deterministic `enforceCandidateHook` |
| Strategy title as `industryCue` | Phase 2 `deriveShortIndustryCue` |
| `openingSituation === coreIdea` | Phase 2 distinct coreIdea from scroll-stop cue |
| Literal “seen” / “Delayed” / “Phone caller #47” | Phase 2 templates + candidate repair |
| Generic-office coupled to opening FP | Phase 1 affirmative collapse only |
| Fidelity repair on every fail; continue with `passed=false` | Phase 4 material-only repair + hard `generation_failed` |
| `jobs.length===0` ⇒ completed | Phase 5 reconcile + start-video + heal |

---

## 3. Old vs new execution order (one package)

**Old**

```
Claude #1 → alignHook → fidelity check
  → if any fail: Claude #2 full package
  → continue even if still passed=false
→ story / PDI → persist (may miss video job)
→ start-video: no job ⇒ text_only success
→ reconcile: no jobs ⇒ completed
```

**New**

```
Claude #1 → alignHook → candidate validate/repair (CPU)
  → enforceCandidateHook (CPU)
  → fidelity check (+ diagnostics)
  → if material fail only: Claude #2 once
  → if still fail: generation_failed (no persist)
→ story / PDI → persist
→ reuse path: heal missing video job if required
→ start-video: video-required + no job ⇒ 409 incomplete
→ reconcile: video-required + no jobs ⇒ failed
```

---

## 4. Validator normalization changes

- Hyphen ↔ space (`departure-board` ≡ `departure board`)
- Hands aliases: customer / visitor / person + device/form/chat
- Strip cosmetic `Handheld urgency:` before match
- Strip known style boilerplate before subject window (≤400 chars cleaned)
- `storyboard_collapsed_to_generic_office` only with affirmative office/laptop collapse **and** missing candidate-specific subject/action
- Per-rule `diagnostics[]` (rule, candidate/generated snippets, aliases, reason)
- Topic anchors expanded for `product_or_topic_implied`

---

## 5. Candidate generation changes

- `industryCue` from short noun / product slice — never long “The X who…” titles
- `coreIdea` = scroll-stop cue (≠ openingSituation)
- Templates use visual-intent wording (read-receipt, delayed-status indicator, phone-channel row)
- `validateAndRepairCandidate` before prompt use

---

## 6. Hook enforcement behavior

`enforceCandidateHook(hookLine, hook, voiceover)`:

- Sets package `hook` to canonical `hookLine`
- Ensures VO opens with that hook; replaces a different first sentence; avoids tripling duplicates
- No Claude call
- Runs **before** fidelity check (and again after material repair)

---

## 7. Fidelity repair policy

| Class | Action |
| --- | --- |
| Deterministic (hook / alias / style) | Fixed before check; no Claude |
| Material (wrong opening, invent, generic collapse, core/topic/essay) | **One** full Claude repair |
| Still failing after repair | **`generation_failed`** — same terminal pattern as Story Integrity; item settled failed; no silent success |

---

## 8. Video completion invariant

`resolvePackageReconcileStatus`:

| requireVideo | jobs | status |
| --- | --- | --- |
| true | `[]` | **failed** |
| true | processing/queued | running |
| true | all completed | completed |
| false | `[]` | completed (genuine text-only) |

Run plan video requirement from `videoCount` / `platformOutputs.kind` / `activeVideoPlatforms` (now persisted on new runs).

---

## 9. Reuse healing behavior

If existing package + empty `videoJobId` + video required:

1. Rebuild job input from `package_brief`
2. Insert `video_jobs` queued (idempotent re-read on race)
3. Return healed `videoJobId`

If heal impossible → `generation_failed` with path `incomplete_package` (settles; does not return `text_only`).

---

## 10. Telemetry added

Persisted under `package_brief.presentation_generation.generation_telemetry`:

- `full_package_generations`
- `fidelity_first_pass_passed` / `fidelity_first_pass_failure_reasons`
- `fidelity_final_passed`
- `hook_deterministic_enforce_reason`
- `candidate_repair_reasons`
- `phases[]` (`fidelity_repair` / `story_repair` latency_ms, ok)

Also logs structured first-pass fidelity diagnostics (no Product Brain dump).

---

## 11. Tests added

`npm run check:concept-fidelity-production-fix` — 25 cases covering A–F fixtures from the brief.

---

## 12. Test / build results

| Check | Result |
| --- | --- |
| `check:concept-fidelity-production-fix` | **25 passed** |
| `check:creative-candidates` | **48 passed** |
| `check:story-integrity` | **14 passed** |
| `check:production-run` | **32 passed** |
| `check:generation-failed-settlement` | **19 passed** |
| `tsc --noEmit` | **pass** |
| eslint (changed files) | **pass** |
| `npm run build` | **pass** |

Pre-fix behavior reproduced by the new suite’s expected-fail fixtures (unrelated newsletter invent, generic office, zero-job video completed) — after fix those FPs pass and true invents still fail.

---

## 13. Historical broken-row query and count

Query: `scripts/sql/find-completed-without-video.sql`

**Production count (2026-07-20):** **1** video-required run item completed with zero `video_jobs` (of 284 video-required packaged items). Matches known `146b3533` / `b4bce30e` class of failure.

No automatic mutation performed.

---

## 14. Remaining risks

- True Claude invents still cost a second generation (intentional safety)
- Heal depends on usable `package_brief`; corrupt briefs → generation_failed
- Older runs without `videoCount` in plan fail closed toward video-required (safer than false complete)
- First-draft fidelity still not persisted separately (only post-enforce / post-repair)
- Anthropic token usage still not exposed by current provider wrapper (character counts + phase latency only)

---

## 15. Production metrics to monitor

On next Creative-Candidates packages, track via `generation_telemetry`:

1. First-pass fidelity success rate (target: ≫ 10%)
2. Fidelity repair rate (target: ≪ 90%)
3. Final fidelity fail → `generation_failed` rate
4. Average `full_package_generations` (target: materially &lt; 2.1)
5. Hook deterministic enforce reasons distribution
6. Validator failure reason distribution
7. Video-required packages with zero jobs (target: **0** completed)
8. `start-video-job` `missing_video_job` 409 count

Do not declare a fixed percentage success bar until N is larger than the prior N=10 cohort.

---

_End of report._
