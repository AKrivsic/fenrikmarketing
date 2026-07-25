# Content Pipeline Run b343 Forensics

**Run ID:** `b343a24b-e196-4eff-8f30-6ca9d8b6f8bc`  
**Strategy item:** `99ffe284-4a7b-4295-8165-7eea0e8e7443`  
**Project:** `aabab9ff-9db4-4012-a53c-135e3bfea6cd`  
**Analysis date:** 2026-07-24  
**Scope:** Forensics only — no production code changes in this document’s companion work.

Legend used below: **EVIDENCE** (DB / telemetry / code / n8n), **INFERENCE** (supported conclusion), **UNKNOWN** (not recoverable from available data).

---

## 1. Executive Summary

**EVIDENCE.** Run `b343` completed with `generated_total=0`, `failed_total=1`. UI showed `package_generation_failed` / `expected string`. No `content_packages`, no video jobs.

**Where it fell:** Content Package schema validation after Claude primary generation (+ one OpenAI schema repair that did not fix the issue, then a second Claude primary attempt with fingerprint-skipped repair). Paths:

- `$.platform_outputs.linkedin.caption` — **ABSENT** (`undefined`), not a wrong scalar type  
- `$.platform_outputs.x.caption` — **ABSENT** (`undefined`)

Both platforms emitted only `caption_variants` (LinkedIn ×2, X ×5 + `title_variants` ×5) because the run config required variant counts (`linkedin` outputs 2, `x` outputs 5). Schema always requires `caption: string` even when variants exist.

**What was generated:** Full creative Content Package candidate (title, script, 5 valid legacy `visual_scenes`, platform copy, assets). Prior `visual_scenes` incident fix held.

**Cost:** Package-fail telemetry **$0.198174** + Content Strategy **$0.015999** ≈ **$0.214**. One `owner_token` (`82c979bb-…`). No second paid generation.

**Why prior tests missed it:** Incident fix/tests targeted `visual_scenes`, repair fingerprint, n8n retry guard, and snapshot columns. They never ran a model-like package with **variants-only** LinkedIn/X against `buildContentPackageSchema`. Prompt/VARIANT COUNTS tell the model to produce `caption_variants` without an explicit rule that `caption` remains mandatory (`caption = caption_variants[0]`).

**Verdict:** **NOT READY — CONTRACT STILL INCONSISTENT** (plus live n8n still not published with N3 `retryOnFail: false`, mitigated by app guard).

---

## 2. Exact Timeline

| Step | Start (UTC) | End (UTC) | Duration | Provider/model | Attempts | Result | Cost (USD) |
|------|-------------|-----------|----------|----------------|----------|--------|------------|
| Run created | 19:46:13.359 | — | — | — | — | queued | — |
| Content Strategy | 19:46:15.534 | 19:46:22.047 | 6.5s | Claude `claude-sonnet-4-6` | 1 | ok | 0.015999 |
| Strategy Items persist | 19:46:22.048 | 19:46:22.563 | 0.5s | deterministic | 1 | ok | 0 |
| n8n webhook exec **1100** | 19:46:23.164 | 19:50:08.204 | ~225s | n8n `NAKo5V3Ctlq5aW4i` | 1 exec | success (final body skip) | — |
| Claim lease `82c979bb-…` | 19:46:25.566 | 19:50:02.225 | — | app | 1 token | released | — |
| Video Concept | 19:46:27.045 | 19:46:52.782 | 25.7s | Claude `claude-sonnet-4-6` | 1 | ok | 0.026871 |
| Opening Impact | 19:46:52.783 | 19:46:56.114 | 3.3s | OpenAI `gpt-4o-mini` | 1 | ok | 0.000694 |
| Visual Identity | 19:46:56.114 | 19:46:56.114 | 0s | deterministic | 1 | ok | 0 |
| Content Package outer | 19:46:56.118 | 19:50:01.158 | 185.0s | Claude (agg. 2 primaries) | **2** (`retry_count:1`) | fail | 0.168123 |
| — primary attempt 1 (INFERENCE from repair start) | ~19:46:56 | ~19:48:09 | ~73s | Claude | 1 | schema fail captions | (in agg.) |
| — JSON Repair (schema) | 19:48:09.712 | 19:48:44.112 | 34.4s | OpenAI `gpt-4o-mini` | 1 | call ok, still invalid | 0.002486 |
| — primary attempt 2 | ~19:48:44 | 19:50:01 | ~77s | Claude | 1 | same fingerprint → **no 2nd repair** | (in agg.) |
| Fail settle + FT write | 19:50:01.824 | 19:50:02.608 | — | app | — | `generation_failed` | — |
| n8n N3 unpaid retry (EVIDENCE: live `retryOnFail:true` + final body) | ~19:50:02 | ~19:50:08 | ~few s | worker | 1 | `already_settled_failed` | **0** |
| Run `updated_at` / finalize | — | 19:55:11.547 | ~5m after fail | reconcile/UI | — | `completed` failed=1 | — |

**Counts (EVIDENCE):**

| Metric | Value |
|--------|-------|
| Owner tokens | **1** |
| Duplicate paid retry | **No** (guard returned `already_settled_failed`) |
| Claude calls | Strategy 1 + Concept 1 + Package **2** = **4** |
| OpenAI calls | Opening 1 + Repair **1** = **2** |
| Packages / video jobs | **0** / **0** |
| Largest delay | Content Package Claude wall (~185s outer; ~2× ~70–80s primaries) |

---

## 3. Generated Outputs by Stage

### Content Strategy — **ok**

- Theme: “The leads your website is silently turning away”  
- 1 strategy item, funnel `problem_aware` / label Problem Aware  
- Cost **$0.016**, ~6.5s  

### Video Concept — **ok**

- Title summary: “The Promotion That Worked — And Still Failed”  
- Cost **$0.027**, ~25.7s  

### Opening Impact — **ok**

- First sentence used as package hook: “Seventy visitors landed on his site yesterday…”  
- Cost **$0.0007**, ~3.3s  

### Visual Identity — **ok** (deterministic, $0)

### Content Package — **failed validation**

- Full candidate persisted in `output_snapshot.candidate` (~15.5 KB) wrapped in \`\`\`json fences  
- `safeJsonParse` recovers structure; production validator uses the same strip path  
- **visual_scenes:** 5× legacy `{ source: "ai", image_prompt }` — all **valid**  
- `video.duration_seconds`: `"58"` (**string**, OK)  
- Platforms tiktok/instagram/youtube/facebook: `caption`/`cta` strings OK  
- LinkedIn / X: variants only — see §4  

**Candidate before vs after repair:** Post-repair intermediate body is **not** stored separately (**UNKNOWN** exact repair bytes). Telemetry proves **one** repair call; final `lastRaw`/snapshot matches Package step `completion_characters` **15459** (attempt-2 Claude), not repair `13622` bytes. **INFERENCE:** repair did not clear the caption fingerprint; attempt 2 regenerated the same class of error; fingerprint stop skipped a second repair.

---

## 4. Exact Validation Errors

| JSON path | Expected | Actual type | Actual value | Validator | Prompt instruction | Repair instruction |
|-----------|----------|-------------|--------------|-----------|--------------------|--------------------|
| `$.platform_outputs.linkedin.caption` | non-empty string | **absent** (`undefined`) | key missing; `caption_variants[0]` starts with “A local service business ran a paid promotion…” | `platformOutputSchema.caption` → `vNonEmptyString()` → `expected string` | “caption: string”; variants “only when VARIANT COUNTS require them”; skeleton shows both | “caption … must be strings”; skeleton includes `caption`; **no** “set caption from caption_variants[0]” |
| `$.platform_outputs.x.caption` | non-empty string | **absent** | key missing; `caption_variants[0]` = “70 visitors. 0 leads. He blamed the ad…” | same | same + X title_variants | same |

No other schema issues on this candidate (full re-validate locally; see §5).

Note: message `expected string` is produced for **any** non-string including **missing** keys — it does **not** say “missing required field”, which weakens repair (**EVIDENCE** in `vString`).

---

## 5. Full Candidate Schema Audit

Local full `buildContentPackageSchema([...all 6 platforms], { requireVideo: true })` against parsed snapshot:

| # | Path | Problem | Current value | Correct contract | Would fail next run? |
|---|------|---------|---------------|------------------|----------------------|
| 1 | `platform_outputs.linkedin.caption` | required field absent | `undefined` (2 `caption_variants` present) | non-empty string **and** optional variants | **Yes** |
| 2 | `platform_outputs.x.caption` | required field absent | `undefined` (5 `caption_variants` + 5 `title_variants`) | non-empty string **and** optional variants | **Yes** |

Checked and **OK** on this candidate: `title`, `funnel_stage` (`"Problem Aware"`), `hook`, `voiceover_text`, `subtitles`, `cta.{type,text}`, `video.{concept,script,duration_seconds:"58"}`, other platforms’ caption/cta/hashtags/format, `visual_scenes[0..4]`, `image_prompts`, `asset_usage[].{asset_id,used_as}`, `scenario`, hashtags.

**Synthesize fix probe (local only):** set `caption = caption_variants[0]` on linkedin + x → **full schema PASS**.

### Po opravě první chyby by tento stejný candidate stále selhal na:

**`$.platform_outputs.x.caption` (expected string / absent)** — same defect class.

If **both** captions were filled from `caption_variants[0]`, **this same candidate would not fail further schema validation**.

---

## 6. Prompt / ExpectedShape / Schema Parity

| Field | Prompt says | expectedShape says | Validator expects | Current mismatch/risk |
|-------|-------------|--------------------|-------------------|------------------------|
| `platform_outputs.*.caption` | string; never object | must be strings (never objects); skeleton has `caption` | **required** non-empty string | **CONFIRMED:** VARIANT COUNTS can be read as replacing caption; no “caption still required = variants[0]” |
| `caption_variants` | string[] when VARIANT COUNTS require | string[] only when needed; **not** in skeleton | optional string[] | **CONFIRMED:** prompt pushes variants without anchoring primary caption |
| `title_variants` | for x with variant counts | same | optional | Low once caption fixed |
| `cta` / `hashtags` / `format` | strings / string[] | same | cta required; hashtags/format optional | Covered OK this run |
| `video.duration_seconds` | string e.g. `"24"` | string when present | optional string | OK this run (`"58"`) |
| `visual_scenes` | legacy IMAGE preferred | legacy + typed optional | legacy or typed payload | **OK this run** (prior fix) |
| `asset_usage[].used_as` | string | string | string | OK |
| `funnel_stage` | label matching strategy | string | Awareness \| Problem Aware \| … | OK |
| `cta` package | `{type,text}` | same | required | OK |
| Skeleton vs variants | skeleton shows `caption` + optional variants | skeleton **omits** caption_variants keys | caption always required | expectedShape incomplete for variant platforms |

**Confirmed mismatches:** caption vs caption_variants contract under VARIANT COUNTS; validator error wording for absent fields; expectedShape silent on primary caption when variants exist.

**Potential:** repair “Do not invent new content unless required field missing” + “expected string” may not clearly signal “copy variants[0] into caption”.

**Covered OK this run:** visual_scenes, duration_seconds, asset_usage, non-variant platforms.

---

## 7. Repair Behavior

| Observation | Classification |
|-------------|----------------|
| Exactly **1** JSON Repair step; warnings = same two caption paths | EVIDENCE |
| `CONTENT_PACKAGE_MAX_ATTEMPTS = 2` honored (`attempts: 2`, `retry_count: 1`) | EVIDENCE |
| Fingerprint stop: no second schema repair on attempt 2 | EVIDENCE / designed behavior |
| Repair did **not** add missing captions (final candidate still absent) | EVIDENCE |
| Post-repair body not separately persisted | Observability gap (minor) |
| Final candidate still markdown-fenced | EVIDENCE (`parsed_ok: false` in snapshot builder using raw `JSON.parse`) |

Classification: **D + B + C** — repair failed to fix the field; prompt/VARIANT COUNTS incomplete; expectedShape incomplete for this case.

---

## 8. Observability Verification (migration 028)

| Field | Present? | Notes |
|-------|----------|-------|
| `generation_telemetry` | **Yes** | Full steps + costs |
| `output_hash` | **Yes** | `d3d95007…f54d` |
| `output_snapshot` | **Yes** | candidate ~15.5KB |
| Truncated | **No** (`truncated` unset/false) | Under 24KB cap |
| `validation_errors` | **Yes** | Both paths |
| Stage durations / tokens / cost / model | **Yes** | |
| `attempt_count` | **2** | |
| `parsed_ok` | **false** | Fence-wrapped lastRaw; structured `visual_scenes` / `platform_outputs_types` **null** |
| Know exact generated JSON? | **Yes** via `candidate` + `safeJsonParse` | Structured helpers failed due to fences |

**Worker / deploy:**

- Vercel production deploy `dpl_D9Zyf3MocbiV6kE8DBq8MzEodKVC` for commit **`f0c8f00`** READY at **19:40:06Z** (before run 19:46).  
- Package generation hits **`http://content-package-worker:8081`** (not Vercel).  
- **INFERENCE (strong):** worker ran incident-fix code — valid visual_scenes, `expectedShape` repair, maxAttempts 2, fingerprint, snapshot+hash, `already_settled_failed`.  
- **UNKNOWN:** exact worker image digest/commit string in DO logs (not queried).

**Live n8n (separate bug):** `activeVersion` N3 still `retryOnFail: true`, `maxTries: 3`. Draft notes say retry must stay false; **not published**. App guard prevented paid duplicate.

**Do we know what was generated?** Yes — full candidate text. Structured snapshot fields incomplete when model returns fences (**production observability bug**, non-blocking for this autopsy).

---

## 9. Cost Breakdown

| Stage | Model | Calls | Input tok | Output tok | Duration | Cost |
|-------|-------|-------|-----------|------------|----------|------|
| Content Strategy | claude-sonnet-4-6 | 1 | 4103 | 246 | 6.5s | $0.015999 |
| Strategy Items | deterministic | 1 | — | — | 0.5s | $0 |
| Video Concept | claude-sonnet-4-6 | 1 | 3902 | 1011 | 25.7s | $0.026871 |
| Opening Impact | gpt-4o-mini | 1 | 3993 | 159 | 3.3s | $0.000694 |
| Visual Identity | deterministic | 1 | — | — | 0 | $0 |
| Content Package (2 primaries agg.) | claude-sonnet-4-6 | 2 | 16956 | 7817 | 185s | $0.168123 |
| JSON Repair | gpt-4o-mini | 1 | 3790 | 3196 | 34.4s | $0.002486 |
| n8n unpaid retry | — | 1 | — | — | ~s | $0 |

| Rollup | Value |
|--------|-------|
| Confirmed package-fail FT | **$0.198174** |
| + Strategy | **$0.214173** |
| Useful creative work that never shipped | Concept+Opening+Package content (~all of $0.20 package side) |
| Waste specifically | 2nd Claude primary (~half of $0.168) + failed repair ($0.0025) + unpaid n8n retry (time only) |
| Duplicate paid attempt | **No** |

Why ~$0.20: one full package pipeline with **two** large Claude package completions (~7.8k completion tokens aggregated) after strategy/concept already spent.

---

## 10. Duration Breakdown

| Segment | Wall time |
|---------|-----------|
| Run create → strategy done | ~9s |
| n8n start → package fail settle | ~3.8 min |
| Strategy | 6.5s |
| Concept | 25.7s |
| Opening | 3.3s |
| Package primaries + repair | ~185s outer |
| Repair alone | 34.4s |
| After fail → run updated_at | ~5.2 min (reconcile / UI settle) |
| User-visible n8n stop | 19:50:08 (~4 min from webhook) |

**Bottleneck:** Content Package Claude (two full generations).  
**maxAttempts: 2** — yes.  
**Fingerprint stop** — yes (one repair).  
**n8n paid guard** — yes (`already_settled_failed`); live retry still wastes wall clock seconds.

Why user waited: ~4 minutes of AI (not 30 min like d154), then possibly watching until run row finalized ~19:55.

---

## 11. Why Previous Fix and Tests Missed It

| Test | Actually verifies | Does not verify | Why it passed despite b343 |
|------|-------------------|-----------------|----------------------------|
| `check-content-pipeline-incident-fix` prompt legacy scenes | Prompt contains `"source":"ai"` examples | caption vs variants under VARIANT COUNTS | Different field |
| expectedShape has visual_scenes + duration | Substring presence | caption required when variants present | Shape incomplete for this bug |
| Scene validator fixtures | Hand-built valid/invalid scenes | Full package with variants-only platforms | Never exercised platform_outputs |
| Fingerprint repair test | Same visual_scenes error → 1 repair | caption_absent repair success | Different invalid shape; repair returns same bad JSON by design |
| N3 retryOnFail false in **repo JSON** | File on disk | **Live activeVersion** still retryOnFail true | Repo ≠ published |
| Handler `already_settled_failed` | Source contains guard | Live publish of n8n | Guard worked in prod |
| Snapshot hash / truncation | Helpers + migration SQL text | Fence-aware parse; real lastRaw from this run | Columns exist; fence quirk untested |
| Settlement script | Guard strings | caption contract | N/A |

**Předchozí testy tuto chybu nezachytily, protože ověřovaly visual_scenes / retry / telemetry sloupce a substringy v promptu, ale žádný test nevzal reálný VARIANT COUNTS candidate (linkedin/x jen s `caption_variants` bez `caption`) a neprohnal ho přes `buildContentPackageSchema`.**

---

## 12. Root Cause Classification

Selected: **B + C + D + G + I** (not H for app/worker behavior; live n8n publish still stale).

- **B** Prompt incomplete/contradictory under VARIANT COUNTS vs required `caption`  
- **C** expectedShape lacks “caption required; if variants exist set caption = variants[0]”  
- **D** Repair did not add captions despite issues list  
- **G** Tests did not cover production multiplier/variant contract  
- **I** Multiple simultaneous issues (contract + repair ambiguity + unpublished n8n retry + fence snapshot parse)

Not primary: **A** (model followed VARIANT COUNTS literally), **F** (schema requiring caption is intentional for fan-out), **H** (worker behaved like f0c8f00).

**One sentence:**  
`Tento run spadl primárně proto, že Content Package prompt/VARIANT COUNTS donutily model vydat na LinkedIn a X pouze caption_variants bez povinného pole caption, schema i po expectedShape repairu vyžadují caption jako string, a předchozí incident fix/testy tuto variantní větev nekryly.`

---

## 13. Complete Minimal Fix Scope

### Prompt
- Under VARIANT COUNTS / PLATFORM_OUTPUTS FIELD TYPES: **always** emit `caption` (non-empty string). When variants required, set `caption` to `caption_variants[0]` (and keep N distinct variants).  
- Same for X with `title_variants` (title/caption primary still required as today).  
- Remove any wording that can be read as “variants replace caption”.

### expectedShape
- Explicit: `caption` required on every platform; if `caption_variants` present, `caption` must still be a string (typically variants[0]).  
- Include caption_variants/title_variants in skeleton as optional arrays.

### Schema
- **Do not** drop required `caption` (fan-out depends on it).  
- Optional later: clearer issue message `missing required string` when `undefined` vs `expected string` for wrong type — helps repair only.

### Repair
- Instruction: if path ends in `.caption` and `caption_variants[0]` exists, copy it.  
- Prefer deterministic post-validate coerce for this known case (optional, small) so GPT repair is not the only fix.

### Observability
- Build snapshot via `safeJsonParse` (fence-aware) so `parsed_ok` / `platform_outputs_types` / `visual_scenes` populate.

### n8n
- **Publish** active version with N3 `retryOnFail: false`, `maxTries: 1` (draft already intends this).

---

## 14. Required Regression Tests

1. Full Content Package contract fixture (all platforms, with and without variants).  
2. Invalid fixture with **multiple** simultaneous errors (caption absent + bad duration type, etc.) asserting **all** paths collected.  
3. Test that validation returns every path (not stop-after-first if ever changed).  
4. Prompt ↔ expectedShape ↔ schema parity for platform_outputs (caption always required).  
5. Model-like fixture cloned from this run’s linkedin/x blocks.  
6. Regression named `b343` / hash `d3d95007…`.  
7. After fixing only linkedin.caption, assert x.caption still fails; after both, pass.  
8. Observability: fenced lastRaw still yields parsed structured snapshot fields.  
9. Attempt/cost: maxAttempts 2 + fingerprint → ≤1 schema repair; claim count 1 under simulated n8n retry.

---

## 15. Preconditions Before Another Paid Run

- [ ] Prompt + expectedShape caption/variants parity merged  
- [ ] Model-like b343 fixture green  
- [ ] Local preflight: load this candidate → optional repair/coerce → full schema validate → print all issues (no video)  
- [ ] Observability fence parse fixed or accepted with documented workaround  
- [ ] content-package-worker redeployed on that commit (verify digest/log)  
- [ ] Live n8n **Publish** N3 retry off (confirm `activeVersion`)  
- [ ] Confirm `already_settled_failed` still present as belt-and-suspenders  

---

## 16. Final Verdict

**NOT READY — CONTRACT STILL INCONSISTENT**

Also: live n8n active N3 still `retryOnFail: true` (**deployment/publish mismatch** for n8n only; paid duplicate already blocked by app). Prefer fixing caption contract + local regression + publish n8n before any further paid one-package test.

**READY AFTER LISTED FIXES AND LOCAL REGRESSION PASS** is the target state after the minimal scope in §13–15 — not before.
