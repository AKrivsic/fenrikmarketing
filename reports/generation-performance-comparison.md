# Generation Performance Comparison

**Mode:** Root-cause comparison · no fix implemented  
**Date:** 2026-07-20  
**Failed run:** `146b3533-5865-4691-b4af-c147eb642cdd`  
**Metric primary:** n8n node `N3 — Generate Content Package` `executionTime` (ms)  
**Cohort:** last 10 Fenrik.chat (`aabab9ff-…`) single-package VIDEO production runs with a completed package + (except failed) a `video_jobs` row

---

## 1. Executive summary

Generation duration **did rise** over 17–19 Jul as architecture landed (clean N3 mean **77.8s → 196.3s**). The failed run’s N3 was **304.1s** — **+100.6s vs the prior clean same-day peer** (`2f896bec`, 203.5s) and **+154.8s vs the clean-cohort average (149.3s)**.

The time is spent **before** package insert (LLM + validation loop). DB persist and `start-video-job` are ~1–4s on successes. Package/output size for the failed run is **within ~5%** of recent peers. The Visual Diversity / Asset Guardrail prompt deltas are **tiny** (~+434 bytes of prompt source) and cannot explain +100s.

**Conclusion: F — Combination**  
~**52%** architecture-driven baseline shift (Jul 17 early → Jul 18–19), ~**48%** this-run excess over the late baseline (LLM/generate-call variance; no per-token telemetry to split further).

---

## 2. Comparison table

| # | production_run_id | n8n | N3 (s) | Deploy SHA | Deploy label | Package | Strategy item | Run created (UTC) | Package created | Video job | Worker done |
| ---: | --- | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| F | `146b3533-…` | 149 | **304.1** | `a05e070` | Asset Guardrail | `b4bce30e-…` | `f95e8636-…` | 23:27:52 | 23:32:59 | **none** | — |
| 1 | `3c58a5f3-…` | 148 | 426.4† | `ffe076b` | Visual Diversity | `daf295c0-…` | `ef6d2187-…` | 22:55:28 | 23:02:40 | `35b8e7ba-…` | 23:07:29 |
| 2 | `2f896bec-…` | 147 | **203.5** | `af6bfef` | settlement/typecheck | `5adb5e92-…` | `40b0deac-…` | 20:57:30 | 21:01:01 | `f29496cb-…` | 21:06:45 |
| 3 | `a44c1c9f-…` | 146 | 799.9† | `e9bd118` | PRODUCT_DEMO typing | `e887421a-…` | `3d4be996-…` | 00:36:15 | 00:49:45 | `ef5ca0dd-…` | 00:54:11 |
| 4 | `73841d6b-…` | 145 | 568.7† | `b8b9937` | PRODUCT_DEMO fix | `c0a4cda3-…` | `e26844dd-…` | 23:38:05 | 23:47:39 | `f0fa16c5-…` | 23:52:53 |
| 5 | `9d9fa60b-…` | 141 | 449.8† | `6295aea` | Story Integrity | `3ceab6ba-…` | `a3dd4832-…` | 21:31:33 | 21:39:11 | `d792dbd8-…` | 21:44:02 |
| 6 | `4633f34f-…` | 140 | **243.5** | `9ac797c` | Selection v3 | `ba3d2e09-…` | `a471f235-…` | 19:57:54 | 20:02:04 | `47c1e1d9-…` | 20:06:58 |
| 7 | `36da8255-…` | 139 | **141.8** | `1a7b425` | Narrative Beats | `bd8f0491-…` | `ccd0a1c4-…` | 07:33:19 | 07:35:46 | `f7d1e37d-…` | 07:40:24 |
| 8 | `2fbd759b-…` | 138 | **151.6** | `af7dab4` | DNA path fix | `754109c7-…` | `afcad1c8-…` | 23:54:45 | 23:57:23 | `13887b51-…` | 00:02:54 |
| 9 | `04911a16-…` | 137 | **81.9** | `58eaff0` | Creative Candidates | `ff367a55-…` | `3691f268-…` | 16:16:30 | 16:18:01 | `0fff98a4-…` | 16:23:31 |
| 10 | `4ab75071-…` | 136 | **73.7** | `1bd9fd9` | Visual Story Director | `90741dd0-…` | `5f0d667f-…` | 00:17:09 | 00:18:29 | `a557c8d4-…` | 00:22:27 |

All rows: project **Fenrik.chat**.  
† N3 > 300s with eventual success — consistent with **n8n `retryOnFail` / maxTries=3** summing attempts (e.g. `3c58a5f3` known generation_failed then success). **Clean cohort** = bold single-attempt-like N3 ≤ 300s with `reused=false` and a video job.

---

## 3. Timeline comparison

### Failed `146b3533` (n8n 149)

| Stage | UTC | Δ from N3 start |
| --- | --- | --- |
| n8n start | 23:28:01.464 | 0 |
| N3 start | ~23:28:01.950 | ~0.5s |
| Package insert | 23:32:59.804 | **+298.3s** |
| Content items insert | 23:33:00.137 | +298.7s |
| video_jobs insert | — | **never** |
| N3 end | ~23:33:05.5 | **+304.1s** (`reused:true`, `videoJobId:""`) |
| N4 start-video-job | ~23:33:06 | +1.96s → `no_video_job` |
| Worker | — | not reached |

### Prior clean peer `2f896bec` (n8n 147)

| Stage | Δ |
| --- | --- |
| N3 | **203.5s** |
| Package | +201.0s from strategy |
| Items → video_job | **3.15s** |
| N4 | 2.88s → `processing` |
| Worker | **341.5s** to complete |

### Pattern (all successes with jobs)

| Stage | Typical duration |
| --- | --- |
| N3 (generate+validate+persist) | 74–244s clean; up to ~800s with retries |
| Package → items | **0.14–0.34s** |
| Items → video_job | **1.8–3.7s** |
| N4 start-video-job | **1.6–2.9s** |
| Worker pickup → complete | **234–342s** |

---

## 4. Stage timing comparison

### Clean cohort N3 (s): 73.7, 81.9, 151.6, 141.8, 243.5, 203.5

| Stat | Clean cohort | Failed | Delta |
| --- | ---: | ---: | ---: |
| Average | **149.3** | **304.1** | **+154.8s (+103.6%)** |
| Median | **146.7** | 304.1 | **+157.4s** |
| Min | 73.7 | 304.1 | +230.4s |
| Max | 243.5 | 304.1 | **+60.6s** |
| Same-day peer (147) | 203.5 | 304.1 | **+100.6s (+49.4%)** |

### Early vs late architecture (clean)

| Window | N3 avg (s) |
| --- | ---: |
| Jul 17 early (136, 137) | **77.8** |
| Jul 18–19 late clean (139, 140, 147) | **196.3** |
| Baseline shift | **+118.5s** |

### Where the seconds go (measurable)

| Stage | Clean avg / range | Failed | Meaningful increase? |
| --- | --- | --- | --- |
| **Pre-persist generate (N3 until package)** | ~71–240s | **~298s** | **YES — entire excess** |
| Package → items | 0.1–0.3s | 0.33s | No |
| Items → video_job | 1.8–3.7s | **n/a (missing)** | Failure consequence, not duration cause |
| N4 | 1.6–2.9s | 2.0s (`no_video_job`) | No |
| Worker | 234–342s | not reached | N/A |

**Slowest stage on failed run:** pre-persist generation (LLM + validation retries inside `runGenerateContentPackage`), **~98% of N3 wall** before first DB write.

No per-provider span telemetry exists in DB/n8n for Anthropic/OpenAI call boundaries, so LLM vs JSON-validation-repair loops cannot be split further with measurements.

---

## 5. Prompt comparison

### Stored live prompts

Only `ff367a55` (run `04911a16`, N3 **81.9s**) has exported prompts:

| Artifact | Bytes |
| --- | ---: |
| System prompt | 349 |
| User prompt | 54,061 |
| Combined | 54,410 |

**No stored prompt dump for `146b3533` or `2f896bec`.** Token counts for the failed call are **not available**.

### Prompt source file size (`lib/ai/prompts/generateContentPackage.ts`)

| SHA | Bytes | Notes |
| --- | ---: | --- |
| `1bd9fd9` | 38,502 | Visual Story Director |
| `58eaff0` | 39,187 | Creative Candidates |
| `af6bfef` / `8f43cdb` | 45,716 | PDI era |
| `ffe076b` / `a05e070` | **46,150** | Visual Diversity (+434 B / +30/−22 lines) |

Asset Guardrail (`a05e070`) **does not change** the prompt file (same 46,150 as `ffe076b`).

**Prompt complexity increase from the two latest patches:** **~+0.9%** source bytes vs prior deploy — **not** “significantly larger.”

---

## 6. Package comparison

| Package | Brief chars | Presentation chars | Scenes | PRODUCT_DEMO | VO chars | Script chars | Items | Platform outputs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Failed `b4bce30e`** | **99,303** | **84,018** | 5 | 1 | 442 | 1,659 | 11 | 5,577 |
| Peer `daf295c0` (success) | 102,295 | 88,314 | 5 | 1 | 468 | 1,513 | 11 | 5,023 |
| Peer `5adb5e92` (203s) | 91,029 | 76,819 | 5 | 1 | 481 | 1,220 | 11 | 4,834 |
| Peer avg (6 recent) | ~94,516 | ~80k–88k | 4–5 | 0–1 | ~400–480 | — | 10–11 | ~5k |

Failed brief vs peer avg: **+5.1%**.  
Failed presentation vs successful same-day Visual Diversity package: **−4.9%**.

**This package was not unusually large** relative to immediate successful peers.

Language variants: **0** on all compared Fenrik runs (project config).  
Asset usage: empty `[]` on failed and most peers.

---

## 7. Deployment comparison

| Transition | What changed | Expected runtime cost (measurable) | Actual N3 impact |
| --- | --- | --- | --- |
| `af6bfef` → `ffe076b` | Visual Diversity prompt wording (~+434 B) | Sub-second prompt build; LLM may change slightly | Peer after patch: **426s†** (retry-heavy). No clean single-attempt sample on `ffe076b` alone |
| `ffe076b` → `a05e070` | Guardrail resolution in `visualScenePlan.ts` (CPU validation only) | **≪100ms** expected | Failed run on this SHA: **304s** — not explained by guardrail CPU |
| `1bd9fd9` → `af6bfef` (multi-day) | Creative Candidates, DNA, Narrative Beats, Selection v3, Story Integrity, PDI, etc. | Large prompt + multi-pass generation | Clean N3 **77.8s → ~196s** (**+118s measured**) |

---

## 8. Infrastructure findings

| Check | Result |
| --- | --- |
| Supabase persist latency | Package→items **<0.4s**; items→job **~2–4s** on successes — **not** the bottleneck |
| n8n overhead | Wall ≈ N3 + ~3–5s; N4 ~2s — **healthy** |
| Vercel runtime logs | **Unavailable** (`ExceedsBillingLimitError`) — no cold-start or provider latency samples |
| OpenAI / Anthropic latency | **No per-call metrics stored** for these runs |
| `maxDuration=300` | Declared on generate route. Several **successful** N3 totals exceed 300s via **retries**; failed attempt landed package at **T+298s**, leaving **~1.7s** before a 300s ceiling for `buildVideoJobInput` |

No measured evidence of a global Supabase/n8n outage. Worker times on peers remain ~4–5.5 minutes and were never started on the failed run.

---

## 9. Root cause (performance)

1. **Baseline generation cost rose ~+118s** from early Jul 17 to Jul 18–19 clean runs, tracking the accumulation of creative-pipeline architecture (candidates/DNA/beats/selection/story/PDI), with package `presentation_generation` growing **16k → 70k+** chars as persisted diagnostics.
2. **This run’s generate call was an additional ~+100s slower** than the prior clean same-day peer, while producing a **normal-sized** package — pointing to **LLM/generate-loop variance**, not a larger brief or the Asset Guardrail CPU path.
3. Hitting ~300s with package commit at T+298s left **insufficient budget** to finish video-job input build — the performance failure mode that produced “no video.”

---

## 10. Quantified conclusion

**Choose: F — Combination**

| Component | Seconds | Share of rise from early baseline (77.8 → 304.1 = **+226.3s**) |
| --- | ---: | ---: |
| Architecture baseline shift (early → late clean avg) | **+118.5** | **52%** |
| This-run excess over late clean avg (196.3 → 304.1) | **+107.8** | **48%** |
| Latest two patches (prompt +434 B; guardrail CPU) | **not measurable as +100s** | **≈0% of the spike** (output size peer-matched) |

Not pure A (architecture alone does not explain +100s over same-day peer).  
Not pure B without noting the multi-day baseline rise.  
Not C (prompt/package not significantly larger for this run).  
Not D (no infra latency evidence).  
Not E (304s is above clean max 243.5s and killed video-job creation).

---

## 11. Recommendation

1. Treat **~200s median / ~250s p95** as the current clean generate budget; the **300s** Vercel cap is too tight for LLM tail latency + `buildVideoJobInput`.
2. Move generate off the 300s serverless ceiling **or** raise `maxDuration` **and** ensure video-job insert cannot be skipped when the package is video-required.
3. Add **per-stage timings** (prompt build, each LLM attempt, validation, persist, video-job input) to the generate response/logs — currently impossible to attribute the +100s inside N3 without guessing.
4. Do **not** roll back Visual Diversity / Asset Guardrail for performance — measurements do not support them as the +100s cause.

---

_End of report._
