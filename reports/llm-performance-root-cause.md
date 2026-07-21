# LLM Performance Root Cause

**Mode:** Deep execution analysis · no fix implemented  
**Date:** 2026-07-20  
**Failed run:** `146b3533-5865-4691-b4af-c147eb642cdd`  
**Package:** `b4bce30e-5fa4-47f8-bf91-9db6486db4b0`  
**N3 wall:** 304.1s (n8n execution 149)

---

## 1. Executive summary

The jump from **~78s → ~196s baseline** is explained by a **second full Claude package generation** when Creative Candidate **concept fidelity** fails and triggers `generateValidatedJson` again.

| Cohort (Fenrik.chat, measured N3) | Fidelity repair? | N3 avg |
| --- | --- | ---: |
| Pre-repair path (`90741dd0`, `ff367a55`) | No | **77.8s** |
| Post-architecture with `regenerationReason` set, no story repair | Yes | **185.1s** |
| Failed run `b4bce30e` | Yes (story repair: no) | **304.1s** |

**Evidence of the second LLM call on the failed package (DB):**

```
creative_candidates.regenerationReason =
  "opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame,
   hook_not_preserved_in_first_spoken,
   storyboard_collapsed_to_generic_office"
finalScriptFidelity.passed = false
storyIntegrity.passed = true
had_story_repair = false  (no "story_integrity:" in regenerationReason)
```

Code only sets `regenerationReason` when `checkConceptFidelity` fails and the **fidelity repair** branch runs (`generateContentPackage.ts` ~554–610). That branch calls a **second** `generateValidatedJson` (full package Claude regenerate).

**Why 304s (this run):** at least **2** sequential full package Claude generations (primary + fidelity repair). Per-call latency / internal `maxAttempts` (1–3) / JSON-repair OpenAI calls are **not instrumented**, so the extra **+119s vs repair-cohort avg (185s)** cannot be attributed further without new telemetry.

**Root cause: H — Combination** (dominant **A — more LLM calls**; residual unallocated latency).

**Confidence:** **HIGH** on the 78→196 mechanism; **MEDIUM** on the 185→304 residual.

---

## 2. Full execution graph

```
POST /api/n8n/generate-content-package
└─ runGenerateContentPackage (lib/ai/workflows/generateContentPackage.ts)
   ├─ [DB] loadExistingPackageData → early return if package exists (idempotence)
   ├─ [DB] loadProjectOrThrow
   ├─ [DB] loadStrategyItemContext
   ├─ [DB] loadAvailableAssets
   ├─ [DB] loadRecentAssetUsageContext + buildRecentAssetUsageBlock
   ├─ [DB] buildAntiRepetitionMemory
   ├─ [DB] loadSceneTypeProjectHistory + restraint block
   ├─ [DB] loadSeriesCreativeContext
   ├─ [DB] loadRunRecentDemoVariants (if production_run_id)
   ├─ [DB] loadRunGenerationPlan (platforms / videoPlatforms / multipliers)
   ├─ parseContentControls / resolve platforms
   ├─ pickCreativeDirectives                          [CPU, no LLM]
   ├─ resolveVisualProfileForPackage                  [CPU]
   ├─ loadRunSiblingAngles (diversity)                [DB]
   ├─ resolvePackageAssetCoverage                     [CPU]
   ├─ derivePromptPresentationTypes                   [CPU]
   ├─ planCreativeCandidatesForPackage                [CPU — Divergence, NO LLM]
   │    └─ generateCreativeCandidatesWithDivergence
   ├─ deriveNarrativeBeats + prompt block             [CPU — NO LLM]
   ├─ planCreativeIdentityForPackage                  [CPU]
   ├─ planVisualNarrativeForPackage                   [CPU]
   ├─ planVisualMediumForPackage                      [CPU]
   ├─ planProductReveal… / planAttention…             [CPU]
   ├─ buildGenerateContentPackagePrompt               [CPU — large string]
   │
   ├─ ★ generateValidatedJson #1 (PRIMARY PACKAGE)    [Claude ×1..3 attempts]
   │    └─ per attempt: Claude complete → parse → [optional OpenAI JSON repair]
   │         → schema validate → [optional repair] → guardrails → [optional repair]
   │
   ├─ ensureUniqueHook                                [Claude only IF duplicate hook]
   ├─ alignHookWithFirstSpoken                        [CPU]
   │
   ├─ if creativeCandidates && requireVideo:
   │    ├─ checkConceptFidelity                       [CPU]
   │    ├─ if !passed:
   │    │    └─ ★ generateValidatedJson #2 (FIDELITY REPAIR — full package again)
   │    │         + ensureUniqueHook + re-check fidelity
   │    ├─ ensureStructuredProductDemo(false)         [CPU]
   │    ├─ validateStoryIntegrity                     [CPU]
   │    ├─ if !passed:
   │    │    └─ ★ generateValidatedJson #3 (STORY INTEGRITY REPAIR — full package)
   │    ├─ validateProductDemonstrationIntegrity      [CPU]
   │    │    └─ ensureDemo(true) if fail               [CPU — no LLM]
   │    └─ progression / duration diagnostics         [CPU — no regenerate]
   │
   ├─ normalizeVisualScenePlan / normalizeImagePrompts [CPU]
   ├─ persistNewPackage
   │    ├─ INSERT content_packages
   │    ├─ INSERT content_items
   │    ├─ buildVideoJobInput → prepareAnalyzedVisualScenes… [CPU/DB — can be multi-second]
   │    └─ INSERT video_jobs
   └─ return { packageId, videoJobId, … }
```

**★ = network LLM.** Everything else before persist is local CPU/DB.

---

## 3. Internal timing breakdown

### Measurable (this run + peers)

| Step | Failed `146b3533` | Successful peers | Source |
| --- | --- | --- | --- |
| N3 total | **304.1s** | clean 73.7–243.5s | n8n `executionTime` |
| Strategy → package insert | **298.6s** | ≈ N3 − few seconds | DB timestamps |
| Package → items | **0.33s** | 0.14–0.34s | DB |
| Items → video_job | **never** | 1.8–3.7s | DB |
| Pre-LLM planners (candidates, beats, identity, …) | **not timed** | — | no spans |
| Claude call #1 latency | **not timed** | — | no spans |
| Claude call #2 (fidelity repair) | **not timed** | — | no spans |
| JSON repair OpenAI | **unknown if any** | — | not logged |
| `generateValidatedJson` attempt count | **not persisted** | — | only in HTTP response, not stored |
| `buildVideoJobInput` | **not completed** (killed ~T+298s) | embedded in ~2–4s persist gap | inference from prior audit |

### What 298s before package insert contains (by construction)

Almost entirely:

1. Prompt build (CPU, expected ≪1s — **not measured**)
2. **Claude package generation #1** (dominant expected)
3. Fidelity check (CPU)
4. **Claude package generation #2** (fidelity repair — **confirmed for this package**)
5. Story/PDI/normalize (CPU)

There is **no** stored split of (2) vs (4).

---

## 4. LLM request inventory

### Structural inventory (code)

| # | Provider | Model (default) | Purpose | When |
| --- | --- | --- | --- | --- |
| 1 | Claude (`getCopywritingProvider`) | `ANTHROPIC_MODEL` or `claude-sonnet-4-6` | Primary content package JSON | Always |
| 2 | Claude | same | Fidelity repair full regenerate | `!checkConceptFidelity.passed` |
| 3 | Claude | same | Story integrity repair full regenerate | `!validateStoryIntegrity.passed` |
| 4 | Claude | same | `ensureUniqueHook` | Only if hook duplicates memory |
| R | OpenAI (`getJsonRepairProvider`) | repair helper | JSON/schema/guardrail repair | On parse/validate/guardrail fail inside each `generateValidatedJson` |

Defaults: `maxAttempts=3` per `generateValidatedJson`, `timeoutMs=180_000`, `maxTransportAttempts=1`, `max_tokens=4096` (Claude).

### This run (`b4bce30e`) — what DB proves

| Request | Occurred? | Evidence |
| --- | --- | --- |
| Claude #1 primary | **YES** (required to produce package) | Package exists |
| Claude #2 fidelity repair | **YES** | `regenerationReason` non-null; `finalScriptFidelity.passed=false` with failureReasons |
| Claude #3 story repair | **NO** | `regenerationReason` lacks `story_integrity:`; `had_story_repair=false` |
| ensureUniqueHook | **UNKNOWN** | not logged |
| OpenAI JSON repair | **UNKNOWN** | not logged |

### Tokens / prompt size / latency for each call

| Field | Status |
| --- | --- |
| input/output/cached tokens | **MISSING** — `ClaudeProvider.complete` discards Anthropic `usage` |
| prompt characters per call | **MISSING** — not logged; only source-file sizes exist |
| response characters per call | **MISSING** — `raw` not persisted |
| per-call latency | **MISSING** |
| attempt index (1..3) | **MISSING** from DB (returned in API `attempts` only on failure path) |

Exported prompt exists only for `ff367a55`: system 349 B + user 54,061 B. **Not** available for the failed run.

---

## 5. Function comparison (77s era → 196s era)

| Function | Added (approx SHA) | Calls LLM? | Loops? | Validates? | Retries via full regenerate? | Measured runtime |
| --- | --- | --- | --- | --- | --- | --- |
| Creative Candidates / Divergence | `58eaff0` | **No** (CPU) | No | Scores CPU | N/A | Unmeasured; prompt-only cost |
| Concept fidelity check | with candidates | **No** | No | Yes | **Triggers Claude #2** | Unmeasured CPU |
| **Fidelity repair `generateValidatedJson`** | with candidates | **YES** | via maxAttempts≤3 | Yes | Is the repair | **Cohort +107s avg vs no-repair** |
| Creative DNA | `7052868` | No | No | CPU warn | No | Unmeasured |
| Narrative Beats | `1a7b425` | No | No | Diagnostics | No | Unmeasured |
| Selection v3 diagnostics | `9ac797c` | No | No | CPU | No | Unmeasured |
| Story Integrity validate | `6295aea` | No | No | Yes | **Triggers Claude #3** | Unmeasured CPU |
| **Story integrity repair** | `6295aea` | **YES** | ≤3 | Yes | Is the repair | Seen on `c0a4cda3` / `e887421a` (N3 568s / 800s†) |
| PDI validate + `ensureDemo` | `8f43cdb` / `1f3c37f` | **No** | No | Yes | Deterministic inject | Unmeasured |
| Attention / Visual Narrative / Medium / Reveal | earlier | No | No | CPU | No | Unmeasured |
| Visual Diversity prompt edit | `ffe076b` | No new call | No | No | No | Prompt source +434 B |
| Asset Guardrail | `a05e070` | No | No | CPU | No | Expected ≪100ms |

† Long N3 may also include n8n HTTP retries; story repair is still evidenced in `regenerationReason`.

### Prompt source growth (bytes of `generateContentPackage.ts` prompt module)

| SHA | Bytes |
| --- | ---: |
| `1bd9fd9` (77s era) | 38,502 |
| `58eaff0` (candidates) | 39,187 |
| `af6bfef` / PDI era | 45,716 |
| `ffe076b` / `a05e070` | 46,150 |

Candidates **without** repair: `ff367a55` N3 **81.9s** vs pre-candidates `90741dd0` **73.7s** → **+8.2s** only.  
Therefore prompt bloat alone does **not** explain +118s baseline.

---

## 6. Validation analysis

### Counts for failed package (from persisted diagnostics)

| Check | Result | LLM consequence |
| --- | --- | --- |
| Concept fidelity (final) | **FAIL** (`passed=false`) | Repair already ran (Claude #2) |
| Failure reasons (final) | opening_situation…, hook_not_preserved…, storyboard_collapsed…, voiceover_essay_or_generic_opener | — |
| Story Integrity | **PASS** (warnings: cta_mismatch) | No Claude #3 |
| PDI | **PASS** | No LLM |
| Schema/guardrail attempt counts | **UNKNOWN** | not stored |
| JSON parse failures | **UNKNOWN** | not stored |
| OpenAI repair invocations | **UNKNOWN** | not stored |

### Cohort: fidelity repair frequency (Fenrik packages examined)

| Package | N3 (s) | Fidelity repair | Story repair |
| --- | ---: | --- | --- |
| `90741dd0` | 73.7 | no | no |
| `ff367a55` | 81.9 | no | no |
| `754109c7` | 151.6 | **yes** | no |
| `bd8f0491` | 141.8 | **yes** | no |
| `ba3d2e09` | 243.5 | **yes** | no |
| `5adb5e92` | 203.5 | **yes** | no |
| `b4bce30e` (failed) | 304.1 | **yes** | no |
| `c0a4cda3` | 568.7† | yes | **yes** |
| `e887421a` | 799.9† | yes | **yes** |

Repair path is the **common** path after candidates shipped — matching the ~196s “late baseline.”

---

## 7. API latency analysis

| System | Evidence |
| --- | --- |
| Claude | **Primary consumer of wall time** by architecture (only multi-second network calls in the pre-persist path). Per-call ms **not recorded**. |
| OpenAI | Possible JSON repair only; occurrence **unknown**. |
| Supabase | Persist stages **<4s** on successes; not the 78→196 cause. |
| n8n | Overhead ~seconds; N3≈generate. |
| Vercel | Logs billing-blocked; cold start **not measured**. `maxDuration=300` relevant to kill after package insert, not to explaining doubled generate time. |

Cannot prove provider-side slowdown (F) without timestamps/tokens. Cannot prove network-wide outage.

---

## 8. Missing telemetry

| Missing metric | File / function | What to capture |
| --- | --- | --- |
| Per Claude call start/end, latency_ms | `lib/ai/claude.ts` `ClaudeProvider.complete` | `Date.now()` delta; model; HTTP status |
| Anthropic usage tokens | same | `usage.input_tokens`, `output_tokens`, `cache_read_input_tokens` if present |
| Prompt/response byte lengths | `complete` or `generateValidatedJson` | `prompt.length`, `completion.text.length` |
| Attempt index + reason for retry | `lib/ai/runWithRepair.ts` `generateValidatedJson` | attempt, parse_fail / schema_fail / guardrail_fail |
| JSON repair invoked + latency | `repairJson` | provider, ms, success |
| Which package LLM phase | `generateContentPackage.ts` | label: `primary` \| `fidelity_repair` \| `story_repair` \| `hook_dedup` |
| Persist stage spans | `persistNewPackage` / `buildVideoJobInput` | package_insert_ms, items_ms, video_input_ms, video_job_ms |
| Persist `attempts` + phase timings onto package | `presentation_generation` or `generation_metadata` | so DB forensics work without Vercel logs |

Without these, **seconds inside each Claude call cannot be proven**.

---

## 9. Evidence table (key)

| Claim | Evidence |
| --- | --- |
| Failed run ran fidelity repair | DB `regenerationReason` non-empty on `b4bce30e` |
| Failed run did **not** run story repair LLM | No `story_integrity:` in reason; `storyIntegrity.passed=true` |
| No-repair N3 ≈ 78s | `90741dd0` 73.7s, `ff367a55` 81.9s |
| Repair N3 ≈ 185s | Mean of 151.6, 141.8, 243.5, 203.5 |
| Prompt-only (candidates, no repair) ≈ +8s | 73.7 → 81.9 |
| Repair path adds ~+107s | 185.1 − 77.8 |
| Failed is +119s above repair mean | 304.1 − 185.1 |
| Second call is full package regenerate | Code: second `generateValidatedJson` with full schema/guardrails/timeout 180s |
| Candidates/Beats/DNA/PDI planners are not LLM | Code comments + sync functions; no `generateValidatedJson` |

---

## 10. Root cause

**H — Combination** (quantified where measured):

| Component | Contribution to 77.8 → 185.1 (+107.3s) | Support |
| --- | ---: | --- |
| **A More LLM calls** (fidelity repair = 2nd full Claude package generate) | **~100% of measured baseline jump** (+107s; ~2.4×) | regenerationReason cohort |
| **B Longer prompts** | **~+8s** when candidates present without repair | 73.7→81.9 |
| **C Longer responses** | **unproven** (no per-call output sizes) | missing telemetry |
| **D Validation loops** (schema/JSON repair inside one generate) | **unproven counts** | missing telemetry |
| **E Retry loops** (`maxAttempts` 2–3 on one generate) | **unproven** | missing telemetry |
| **F Provider latency** | **unproven** as separate factor | missing telemetry |
| **G Architecture complexity** | Enables A (fidelity/story repair gates) | code |

**This run 304s vs repair avg 185s (+119s):**  
Telemetry cannot allocate among slower Claude calls, extra internal attempts, or JSON repairs. **Not** explained by a 3rd story-repair LLM (ruled out by DB).

---

## 11. Confidence level

| Question | Confidence |
| --- | --- |
| What caused ~78s → ~196s baseline? | **HIGH** — second full package Claude call on fidelity failure |
| Exact ms split between Claude #1 and #2 on failed run? | **LOW / impossible** — no spans |
| Why this run 304s vs ~185s repair peers? | **MEDIUM** — known 2 calls; residual unexplained |
| Tokens / prompt size this run? | **NONE measured** |

---

_End of report._
