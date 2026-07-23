# Cost Exposure

Paid and resource-intensive operations on the production path. Amounts are **not** invented; relative ranking uses repository cost-trace evidence where available (`docs/audits/cost-trace-c8dd3caf/summary.json`: failed-package waste dominated a real run).

---

## Paid / intensive operation inventory

| Operation | Provider / resource | Call site | Idempotency | Persist before next risk? | Cancel after start? | Result discardable later? |
|-----------|---------------------|-----------|-------------|---------------------------|---------------------|---------------------------|
| Strategy plan (AI mode) | Anthropic | `planContentStrategy` | One plan per start | Strategy items before n8n | Run can cancel after; plan already paid | Unused if run fails/cancels |
| Creative directions | Anthropic | `runDirections.ts` | None per attempt | In-memory until package persist | No mid-call cancel | Entire CE discarded on later hard fail |
| Direction eval | Anthropic | `runDirectionEvaluation.ts` | None | In-memory | No | Same |
| Ideation (+ re-ideation) | Anthropic | `runIdeation.ts` / `planForPackage.ts` | Cap 1 re-ideation | In-memory | No | Same |
| Critic | Anthropic | `runCritic.ts` | Deterministic fallback if LLM fails | In-memory | No | Same |
| DNA repair | Anthropic | `dnaRepair.ts` | maxAttempts 2 | In-memory | No | Same |
| Presentation JSON | Anthropic | `generateContentPackage.ts` | Package unique after persist only | Persist after all guards | Cancel check only at request start | Fidelity/story/PDI can discard after Presentation paid |
| Fidelity / story repair | Anthropic | same workflow | ≤1 each | Before persist | No | Can still hard-fail after |
| Hook uniqueness | Anthropic | `ensureUniqueHook` | If duplicate only | Before persist | No | Rare |
| JSON repair | OpenAI | `runWithRepair.ts` / `getJsonRepairProvider` | None | N/A | No | Intermediate only |
| Scene stills | OpenAI Images | video-worker images | Path reuse via render_spec; moderation ≤1 retry then local fallback | Uploaded during job | Checkpoint between phases | Cancel/fail can abandon; retry may regen if no stills |
| TTS | OpenAI | `tts.ts` / tail validation ≤3 | None | Audio on disk then upload | Between checkpoints | Same |
| Whisper | OpenAI | transcription for captions | Tied to TTS attempts | Local | Same | Same |
| FFmpeg render | DO worker CPU | `ffmpeg.ts` | Abort signal | Local mp4 then upload | AbortController on cancel notify | Upload-then-failed-callback wastes render |
| Storage upload | Supabase/storage | `uploadVideoArtifact` | Path keyed by video_job_id | Before completed callback | After upload assert | Orphan objects if DB fails |
| Translation / localization | AI + queue | `translationJobs.ts` | Unique source×lang unit | Variant rows | **No** run cancel | May re-run on stale reclaim |
| Variant video | Worker | slot RPC + dispatch | Slot blocks active jobs | Job row | Not run-stamped → Stop may miss | New job after failed frees slot |
| ElevenLabs | — | **Not present** | — | — | — | — |

---

## Ranked financial findings

### Critical

| ID | Finding | Evidence | Why Critical |
|----|---------|----------|--------------|
| C-CRIT-1 | Concurrent n8n retries can both pass pre-check and both run full Creative Engine + Presentation before unique insert | `generateContentPackage.ts:243` TOCTOU; bridge `maxTries: 3`; unique index only at insert (`013`) | Duplicate full package LLM spend for one strategy item |
| C-CRIT-2 | Hard package fail **after** CE + Presentation (fidelity / story / PDI / guardrails) discards all upstream paid work | `generateContentPackage.ts:859–1264`; cost-trace failed packages ~6/14 with estimated waste | Highest observed waste category in real run telemetry |

### High

| ID | Finding | Evidence |
|----|---------|----------|
| C-HIGH-1 | Upload succeeds then completed callback throws → catch sends **failed** → operator likely retries full render | `video-worker/jobRunner.ts:682–771` |
| C-HIGH-2 | Stale reclaim (default 30m) with **no heartbeat** can re-dispatch while original worker still rendering | `start-video-job/route.ts:142–175`; `updated_at` only on status UPDATE |
| C-HIGH-3 | Operator Stop does not abort in-flight package generation past cancel check | `handleGenerateContentPackageRequest.ts:62–76` then long Claude work |
| C-HIGH-4 | Nested attempt multiplication (CE × Presentation×3 × repairs × video TTS×3 × images×2) | See `retry-loop-review.md` |
| C-HIGH-5 | Regenerate always inserts a new video job without active-job guard | `regenerateContentPackage.ts:1110–1121` |

### Medium

| ID | Finding | Evidence |
|----|---------|----------|
| C-MED-1 | Language-variant / translation video jobs not cancelled by Stop | `production-run-cancel.ts:117–121` filter; variants omit `production_run_id` |
| C-MED-2 | Heal missing video job can race-insert two jobs (no unique on video_jobs) | `healMissingVideoJobIfRequired` |
| C-MED-3 | Scene image regen: no idempotency key; concurrent calls duplicate image spend | `videoSceneEditor.ts` |
| C-MED-4 | Mid-checkpoint cancel: TTS/image may finish before next `assertVideoJobStillActive` | `jobRunner.ts` checkpoints |

### Low

| ID | Finding |
|----|---------|
| C-LOW-1 | Storage upload retries (≤3–5) — bounded, same object path |
| C-LOW-2 | HTTP transport retries on AI (≤3) — bounded |
| C-LOW-3 | Deterministic CE fallbacks reduce some LLM spend on critic/eval failure |

---

## Duplication patterns (same logical output)

| Pattern | Can call twice? | Mitigation | Residual |
|---------|-----------------|------------|----------|
| Same strategy_item package AI | Yes before insert | Unique + pre-check | Concurrent double AI |
| Same video_job dispatch | Claimed once | Status claim | Stale dual worker |
| Same video after cancel completed callback | Completed rejected | App + trigger 023 | Worker may still finish paid work |
| Retry video after failed | Explicit new job | Operator/manual | Expected cost |
| Regenerate package | Always new AI + new job | None for active job | Overlap with in-flight render |
| TTS for same script | Yes on retry/tail | Cap 3 | Paid ×3 |
| Images for same scene | Yes without pinned stills | render_spec reuse when present | Retry without stills regenerates |

---

## Persistence vs risk order

**Good:** Package unique identity after insert; video claim before worker start; render_spec persisted on success for reuse; cancel fails jobs before marking run cancelled.

**Weak:** All CE/Presentation paid **before** any package row; video artifacts uploaded **before** DB completed; settlement of run counters not in same transaction as item fail.

---

## Relative impact note

From `cost-trace-c8dd3caf/summary.json` (supporting evidence, one run): ideation + presentation + images dominated stage cost; **failed-package estimated waste** was the largest waste bucket. That aligns with C-CRIT-2 (hard fail after expensive upstream work), not with unbounded loops.
