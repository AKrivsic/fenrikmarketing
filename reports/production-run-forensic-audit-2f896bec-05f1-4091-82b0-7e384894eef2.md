# PRODUCTION RUN FORENSIC AUDIT

**Run ID:** `2f896bec-05f1-4091-82b0-7e384894eef2`  
**Mode:** Evidence only (no implementation, no redesign, no speculation beyond classified findings backed by cited evidence)  
**Audited at:** 2026-07-19T21:50:00Z (approx.)  
**Project:** Fenrik.chat (`aabab9ff-9db4-4012-a53c-135e3bfea6cd`)  
**Verdict:** **GO WITH KNOWN RISKS**  
**Confidence:** **High** for lifecycle/DB/video/output facts; **Medium** for cost dollars (no provider invoices in DB); **Medium** for exact reconcile caller (race window evidenced; caller not logged)

---

## 1. Executive summary

This run requested **1 package / 11 platform outputs** and finished with:

| Signal | Evidence |
| --- | --- |
| `production_runs.status` | `completed` |
| `generated_total` / `failed_total` | `1` / `0` |
| Package | `5adb5e92-e1db-4a7c-b6f1-0ed01aefb370` (`draft`) |
| Content items | **11** (all `language IS NULL`, all `draft`) |
| Video jobs | **1** (`f29496cb-6234-4a9a-b21b-bd8e33a1b910`, `completed`) |
| Translation jobs | **0** |
| Language variants | **0** |
| Asset usage rows | **0** |
| n8n execution | `#147` workflow `NAKo5V3Ctlq5aW4i`, `success` |
| Hard failures | **None** (no failed/cancelled/queued leftover jobs) |

The pipeline **did produce a complete English package + rendered video** (MP4 35.57s, Whisper subtitles, PRODUCT_DEMO retained as `product_demo@1`).

It also exhibited **concrete operational and creative defects**:

1. **P1 — Premature run completion:** run marked `completed` at `21:01:03Z`, video job finished at `21:06:45Z` (**+341.9s later**).  
2. **P1 — PRODUCT_DEMO messaging contradiction:** VO insists on **business hours / Tuesday afternoon / not after midnight**; demo still shows **`11:42 PM · After hours`** (`demo_variant: after_hours_response`).  
3. **P1 — Truncated demo outcome text** on the PRODUCT_DEMO still.  
4. **P1 — `production_run_items.content_item_id` and `video_job_id` remain NULL** after success; sync code never writes them.

No P0 (customer-blocking hard failure) is evidenced on this single run: artifacts exist, job terminal state is `completed`, storage objects are present under the project folder.

---

## 2. Timeline

Exact order reconstructed from DB timestamps, n8n execution `#147`, and Supabase storage lifecycle logs.

| t (UTC) | Δ from run create | Event | Evidence |
| --- | ---: | --- | --- |
| 20:57:30.650 | 0.0s | `production_runs` created (`queued`→later completed) | DB `production_runs.created_at` |
| 20:57:30.962 | +0.3s | `production_run_items` created (tiktok/video) | DB `production_run_items.created_at` |
| 20:57:40.183 | +9.5s | Automation webhook requested | n8n body `requested_at` |
| 20:57:40.640 | +10.0s | n8n `#147` started | n8n `startedAt` |
| 20:57:40.871 | +10.2s | N1 Webhook | n8n `startTime` |
| 20:57:40.909 | +10.3s | N1b Production run? | n8n |
| 20:57:40.938 | +10.3s | N2p Read production strategy items (404ms) | n8n |
| 20:57:41.343 | +10.7s | N2b Loop over packages (enter) | n8n |
| 20:57:41.347 | +10.7s | **N3 Generate Content Package START** | n8n |
| 21:01:01.154 | +210.5s | `content_packages` inserted | DB |
| 21:01:01.490 | +210.8s | 11 `content_items` inserted | DB |
| 21:01:03.772 | +213.1s | `production_run_items` → `completed` | DB `updated_at` |
| **21:01:03.886** | **+213.2s** | **`production_runs` → `completed`** | DB |
| 21:01:04.307 | +213.7s | `video_jobs` inserted (`queued`→processing) | DB `created_at` |
| 21:01:04.883 | +214.2s | N3b Package ok? | n8n (N3 took **203536ms**) |
| 21:01:04.895 | +214.2s | N4 Start Video Job (returns `status: processing`) | n8n |
| 21:01:07.781 | +217.1s | N2b loop exit / N5b Action run id? (**0 items**) | n8n |
| 21:01:07.796 | +217.1s | n8n `#147` stopped `success` | n8n `stoppedAt` |
| — | — | **Idle/gap until worker finishes** | — |
| 21:06:39.904 | +549.3s | Storage `ObjectCreated` `output.mp4` | storage logs |
| 21:06:40.707 | +550.1s | `thumbnail.png` uploaded | storage logs |
| 21:06:40.891 | +550.2s | `subtitles.srt` uploaded | storage logs |
| 21:06:41.592–43.374 | +551–553s | Scene stills 1,2,3,product-demo,5 uploaded | storage logs |
| **21:06:45.814** | **+555.2s** | `video_jobs.completed_at` | DB |
| 21:06:46.107 | +555.5s | `video_jobs.updated_at` | DB |
| 21:06:46.260 | +555.6s | `content_packages.updated_at` (draft promotion on callback) | DB + `handleVideoCallback` |

### Idle periods / bottlenecks (measured)

| Segment | Duration | Role |
| --- | ---: | --- |
| Webhook → gen start | ~0.7s | Negligible |
| **Package generation (N3)** | **203.5s** | Dominant LLM bottleneck |
| Items → video_job insert | **2.82s** | Race window (see §3) |
| n8n after package → end | ~3s | Start video + loop exit |
| **Video worker wall** | **341.5s** (job create→complete) | Dominant render bottleneck |
| Run “completed” → video complete | **341.9s** | False-complete window |

**Total wall time to real deliverable:** **555.2s (~9.25 min)** from run create to video `completed_at`.  
**Time until run UI could show completed:** **213.2s (~3.55 min)** — **before video existed as a finished artifact**.

---

## 3. Statistics

| Metric | Value | Evidence |
| --- | --- | --- |
| Package count requested / generated / failed | 1 / 1 / 0 | `production_runs` |
| Strategy items | 1 (`40b0deac-…`) | package `strategy_item_id` |
| Weekly strategy | `fb6be81f-…` theme “The silent cost…” | audit export |
| Content items | 11 | SQL count |
| Platforms | tiktok1, instagram1, youtube1, facebook1, linkedin2, x5 | SQL group by |
| Video jobs | 1 completed | SQL |
| Scenes | 5 (IMAGE×4 + PRODUCT_DEMO×1) | job input + render_spec |
| Image prompts | 4 | `input.image_prompts` length |
| Speech / video duration | 34.056s / 35.567s | `output.debug` + ffprobe |
| Brief `duration_seconds` | 22 | package_brief |
| Match ratio (audio/video) | 0.962 | `output.debug` |
| TTS validation | pass attempt 1, no retry | `output.debug` |
| Subtitle source | whisper, english, 77 words | `output.debug` |
| Render warnings | `[]` / `render_warning: false` | `output.debug` |
| Moderation fallbacks | 0 | audit summary |
| Story integrity | passed **with** `cta_mismatch` | creative audit / package_brief |
| n8n retries | none observed | single successful execution |

---

## 4. Successful operations

Evidence-backed successes:

1. **Strategy → package generation** completed (`N3 ok: true`, package id returned).  
2. **11 platform copies** persisted matching plan multipliers (1+1+1+1+2+5).  
3. **Video job created and started** (`N4 ok: true`, `status: processing`).  
4. **PRODUCT_DEMO not downgraded** — analyzer `final_type: PRODUCT_DEMO`, renderer `product_demo@1`.  
5. **TTS passed tail validation** first attempt (`tts_tail_validation_passed: true`).  
6. **Whisper subtitles generated** and stored; SRT cues match spoken script through closing line.  
7. **Mux A/V alignment** healthy (`duration_delta ≈ 0.011s`, `match_ratio ≈ 0.96`).  
8. **Storage paths tenant-scoped** under `video-renders/{project_id}/video/{job_id}/…`; bucket `public=false`.  
9. **No orphan translation/video jobs** left non-terminal for this package.  
10. **Primary video artifact playable** — local download `reports/audit-2f896bec/output.mp4` = 4,833,041 bytes, ffprobe **35.566667s**.

---

## 5. Warnings

| ID | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| W1 | P1 | Run completed before video finished | DB timestamps §2 |
| W2 | P1 | PRODUCT_DEMO `after_hours_response` vs business-hours VO | still + payload + SRT |
| W3 | P1 | Outcome bubble truncated (“…selects a”) | PRODUCT_DEMO still |
| W4 | P1 | `content_item_id` / `video_job_id` NULL on run item | DB + `syncRunItemsAndCounters` only updates status/package/error |
| W5 | P2 | `story_integrity_passed_with_warnings:cta_mismatch` — spoken close lacks package CTA | package_brief / creative audit |
| W6 | P2 | Attention originality selected visual “Crossing out post more…” but scenes are phone/chat | package_brief `selected_visual_concept` vs `visual_scenes` |
| W7 | P2 | Information-progression warnings (scenes 1→2 waiting overlap; 3→4 same hands tokens) | creative audit correctiveGuidance |
| W8 | P2 | Brief duration 22s vs rendered 35.57s | package_brief vs debug/ffprobe |
| W9 | P2 | Facebook generated though `projects.platforms` omits facebook | project row vs content_items |
| W10 | P2 | Long-lived signed URLs (365d) persisted in `video_jobs.output` | JWT `iat`/`exp` in stored URLs |
| W11 | P3 | Voice `shimmer` / profile `NATURAL` (audit notes project defaults cedar/MINIMAL) | job input + audit summary |
| W12 | P3 | Facebook caption contains emoji `🤔` | package_brief facebook caption |
| W13 | P3 | `video_jobs.model` is null | DB |

---

## 6. Failures

**Hard failures:** none for this run.

| Check | Result |
| --- | --- |
| Failed video jobs | 0 |
| Failed translation jobs | 0 |
| Failed production_run_items | 0 |
| Non-terminal jobs left queued/running/processing/pending | 0 (final state) |
| n8n execution error/crash | 0 (`success`) |
| TTS retries | 0 |
| Subtitle/render warning flags | false / empty |

**Soft failures / incorrect terminal semantics:**

- Run/item marked completed while video still in flight (W1).  
- Creative contradiction in PRODUCT_DEMO framing (W2).  
- Truncated on-screen outcome copy (W3).

---

## 7. Performance

| Operation | Measured | Evidence |
| --- | ---: | --- |
| End-to-end to video complete | 555.2s | DB |
| Package generation (n8n N3) | 203.5s | n8n `executionTime` |
| Strategy read | 0.4s | n8n N2p |
| Start video API | 2.9s | n8n N4 |
| Video job (create→complete) | 341.5s | DB |
| Worker upload burst (mp4→last still) | ~3.5s | storage ObjectCreated span |
| OpenAI image latency (per scene) | **not separately logged** in DB | gap |
| Anthropic/OpenAI token latency split | **not in DB/debug** | gap |
| Voice (TTS) latency | subsumed in 341.5s job; speech 34.056s | debug |
| Whisper | subsumed; 77 words | debug |
| DB write latency | not instrumented per-statement | gap |
| Retry overhead | 0 | debug |

**Bottleneck ranking (this run):** (1) video worker 341.5s (2) package LLM 203.5s (3) everything else <5s.

**Scalability smell (evidence-based):** n8n processes packages **serially** in `N2b Loop`; N3 alone is ~203s/package. At 10/100/1000 packages, wall clock scales roughly linearly unless concurrency changes (not observed here).

---

## 8. Cost observations

No provider invoice rows exist in DB for this run. Observations are **usage-shaped**, not dollar-precise.

| Cost center | What happened | Evidence |
| --- | --- | --- |
| LLM package generation | ~203.5s inline generation | n8n N3 |
| Image generation | **4 AI images** for primary video | `image_prompt_count=4`, scenes source `ai` |
| PRODUCT_DEMO | Deterministic renderer (no extra AI image for demo) | `renderer_version=product_demo@1` |
| Voice | OpenAI TTS voice `shimmer`, 34.056s speech | job input + debug |
| Subtitles | Whisper pass | debug |
| Render/encode | Full Remotion/ffmpeg path (~341s job) | job duration + storage uploads |
| Translation / language variants | **$0 incremental** — none generated | SQL counts; `enabled_languages={}` |
| Asset library reuse | **none** — `asset_usage` empty; `asset_usage: []` in brief | SQL + package_brief |

**Unnecessary / inefficient work (evidence):**

- Attention system scored an “unexpected” wall-plan visual concept that **did not appear** in final scenes (W6) — compute spent without visual realization.  
- Scene stills are large AI PNGs (~2.0–2.3MB each for IMAGE scenes) stored in addition to MP4.  
- Brief targeted 22s; deliverable is 35.6s → more TTS + render time than brief.

---

## 9. Data consistency

### 9.1 Entity map

```
production_runs 2f896bec-…
  └─ production_run_items ac9411d3-… (tiktok/video, completed)
       ├─ content_package_id = 5adb5e92-…  ✅
       ├─ content_item_id = NULL           ❌ never filled
       └─ video_job_id = NULL               ❌ never filled

content_packages 5adb5e92-… (draft)
  └─ content_items ×11 (draft, language null)
       └─ video_jobs f29496cb-… → content_item 454e6f77-… (tiktok) ✅
```

### 9.2 Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Orphan video_jobs for package | None | 1 job linked to tiktok item |
| Orphan translation_jobs | None | 0 rows |
| Duplicate content_items | No (11 distinct platforms/variants as planned) | counts |
| Impossible: run completed, video still processing | **Occurred historically** for 341s | timestamps |
| Missing FKs on run item | **Yes** — null item/job ids | DB |
| Broken FK (dangling UUID) | No dangling package id | package exists |
| Stale statuses | Final states terminal; package/items intentionally `draft` for review | `handleVideoCallback` sets package `draft` on complete |
| Timestamp inconsistency | Package `created_at` **after** run `updated_at` completed | DB |
| Race artifact | Items at T+210.8s; run completed T+213.2s; job at T+213.7s | DB; code treats `jobs.length===0` as completed |
| Retry artifacts | None | single job |

### 9.3 Code evidence for null FKs + premature complete

`syncRunItemsAndCounters` updates only `status`, `content_package_id`, `error_message` — never `content_item_id` / `video_job_id` (`lib/api/production-run-admin.ts`).

`reconcileFromRealContent` marks a package **completed** when `jobs.length === 0` **or** all jobs completed — i.e. a package whose content_items exist but whose video_job is not yet visible is treated as text-only complete (`lib/api/production-run-admin.ts` ~634–647). The **2.82s** items→job gap matches this race.

### 9.4 Language variants (Part 8)

| Requirement | Result |
| --- | --- |
| Variants present | **0** |
| `generated_image_count == 0` on variants | N/A (no variants) |
| Same scene order/types/assets across langs | N/A |
| Project `enabled_languages` | `{}` (empty) |
| Project `language` | `en` |

No language-variant AI image regeneration occurred because **no variants were generated**. This is consistent with project config, not a missing-variant bug for this run.

---

## 10. Output quality

### 10.1 Story / narration

- Hook “Urgent question dies in silence” lands in first ~1.7s (SRT cues 1–2).  
- Body consistently argues **business-hours silence** (SRT cues 5–14).  
- Close: “That’s the gap nobody talks about.” — **no spoken CTA** matching package CTA (W5).  
- Story integrity engine: `passed: true` with warning only.

### 10.2 PRODUCT_DEMO (Part 6)

| Check | Result | Evidence |
| --- | --- | --- |
| Correct type retained | Yes `PRODUCT_DEMO` | render_spec |
| Correct renderer | `product_demo@1` | render_spec |
| Downgrade | No | analyzer `allowed` / creative audit |
| Fake demo (non-renderer fallback image) | No — structured chat UI still | still file |
| Payload fields | visitor_question / ai_answer / outcome present | payload_snapshot |
| Messaging consistency | **FAIL** — after-hours chrome vs business-hours VO | still vs SRT |
| Outcome text | **FAIL** — truncated | still |

Payload (DB):

```json
{
  "type": "product_demo",
  "demo_variant": "after_hours_response",
  "visitor_question": "Do you offer same-day consultations?",
  "ai_answer": "Yes — we have availability today. Would you like to book a slot or get more details first?",
  "outcome_label": "Visitor continues the conversation and selects a time",
  "brand_name": "Fenrik.chat"
}
```

On-still timestamp reads **“11:42 PM · After hours”** while VO says visitors typed **during business hours / Tuesday afternoon / not after midnight**.

### 10.3 IMAGE scenes

AI prompts explicitly require **“No readable text”** abstract UI. Empty bubbles on scenes 1/2/5 are **consistent with prompts**, not accidental blanking. Visual continuity (same hands/phone/street) is strong; information progression warnings still fire (W7).

### 10.4 Platform copy

| Platform | Count | Notes |
| --- | ---: | --- |
| TikTok | 1 | Short caption; CTA “Link in bio…” |
| Instagram | 1 | Longer caption |
| YouTube | 1 | Subscribe CTA |
| Facebook | 1 | Longer caption + emoji (W12); config `text_only` but format column `reel` |
| LinkedIn | 2 | Two title/caption variants |
| X | 5 | Short posts |

Marketing quality: coherent theme; CTA mismatch between video VO and package CTA; Facebook/LinkedIn copy is usable.

### 10.5 Captions / subtitles

SRT is phrase-chunked, English, aligns with VO; last cue ends ~33.8s vs speech 34.056s (debug `srt_last_cue_end`).

---

## 11. Remaining risks

1. **Operators/customers can believe a run is done while video is still rendering** (W1) — especially dangerous at scale if UI gates on `production_runs.status`.  
2. **PRODUCT_DEMO variant selection can contradict the spoken story** (W2) — brand trust risk.  
3. **Truncation in deterministic demo UI** (W3) — looks unfinished on the most important proof beat.  
4. **Run-item FK sparsity** complicates support/audit joins (W4).  
5. **365-day signed URLs in DB** (W10) — anyone with DB/export access gets long-lived downloads; bucket is private but tokens are powerful.  
6. **Serial n8n package loop** — 203s×N packages without observed concurrency.  
7. **Observability gap:** no per-provider latency/cost ledger; Vercel runtime log MCP calls failed in this audit session.

---

## 12. Technical debt (exposed by this run)

| Debt | Evidence |
| --- | --- |
| `jobs.length === 0` ⇒ package completed | premature complete race |
| `syncRunItemsAndCounters` omits item/job FK writes | null columns |
| Attention originality visual unused by scene planner | W6 |
| `demo_variant: after_hours_response` selectable under business-hours narrative | W2 |
| Outcome label layout clipping | W3 |
| CTA required in package but optional in spoken close | W5 |
| `format: reel` on text_only platforms | facebook/linkedin/x rows |
| Package generation ~160–300s on Vercel (`maxDuration=300`) | route comment + 203s N3 |
| n8n ends at “video processing”, not video complete | N4 response + workflow nodes |

---

## 13. Recommended cleanup (optional — not required before release)

Evidence-tied, non-speculative cleanups (listed only because they map 1:1 to findings above):

1. Treat packages with intended video as **running** until a video_job exists and is terminal (fixes W1).  
2. Persist `content_item_id` / `video_job_id` on run items when syncing (fixes W4).  
3. Constrain PRODUCT_DEMO `demo_variant` / chrome copy to narrative time-of-day (fixes W2).  
4. Fix outcome label wrapping/truncation in `product_demo@1` (fixes W3).  
5. Store storage **paths** in DB; mint short-lived signed URLs at read time (mitigates W10).

---

## 14. GO / GO WITH KNOWN RISKS / NO-GO

### **GO WITH KNOWN RISKS**

**Why not NO-GO:** This run produced a complete, playable video; job terminal state is correct; PRODUCT_DEMO renderer engaged; no hard pipeline crash; storage isolation by `project_id` observed; no language-variant visual replacement bugs (no variants).

**Why not clean GO:** Premature run completion (P1), contradictory after-hours demo vs business-hours VO (P1), truncated proof text (P1), and null run-item FKs (P1) are all evidenced on this exact run.

---

## 15. Confidence level

| Area | Confidence |
| --- | --- |
| Lifecycle timeline | **High** (DB + n8n + storage) |
| DB consistency | **High** |
| Video/render internals | **High** (debug + stills + ffprobe) |
| Story/PRODUCT_DEMO quality | **High** (stills + SRT + payload) |
| Language variants | **High** (absent by config) |
| Cost in USD | **Low–Medium** (usage known, prices not in DB) |
| Exact reconcile caller for W1 | **Medium** (race window + code path evidenced; no audit log of which client called reconcile) |
| Worker CPU breakdown | **Low** (no worker stdout captured this session) |

---

## Appendix A — Key IDs

| Entity | ID |
| --- | --- |
| production_run | `2f896bec-05f1-4091-82b0-7e384894eef2` |
| production_run_item | `ac9411d3-ea05-4c53-81d5-16c6bc0ab2a8` |
| content_package | `5adb5e92-e1db-4a7c-b6f1-0ed01aefb370` |
| strategy_item | `40b0deac-aa88-4c31-8c88-6e40e9b3da90` |
| weekly_strategy | `fb6be81f-0a80-4b8e-9b28-1abf26881e27` |
| primary video content_item | `454e6f77-c776-4a0b-b350-03e129d3e6e5` |
| video_job | `f29496cb-6234-4a9a-b21b-bd8e33a1b910` |
| n8n execution | `147` / workflow `NAKo5V3Ctlq5aW4i` |

## Appendix B — Local evidence artifacts

| Path | Contents |
| --- | --- |
| `reports/production-run-2f896bec-05f1-4091-82b0-7e384894eef2-audit.md` | Machine audit export |
| `reports/production-run-2f896bec-05f1-4091-82b0-7e384894eef2-creative-audit.md` | Creative/scene dump |
| `reports/audit-2f896bec/output.mp4` | Final render |
| `reports/audit-2f896bec/subtitles.srt` | Whisper SRT |
| `reports/audit-2f896bec/scenes/*.png` | Scene stills including PRODUCT_DEMO |
| `reports/audit-2f896bec/thumbnail.png` | Thumbnail |

## Appendix C — Job state validation (Part 3)

| Job | Status | Terminal? |
| --- | --- | --- |
| video_jobs `f29496cb-…` | `completed` | Yes |
| translation_jobs | (none) | N/A |
| production_run_items | `completed` | Yes (semantic caveat W1) |
| production_runs | `completed` | Yes (semantic caveat W1) |
| content_packages / content_items | `draft` | Review-terminal, not “failed” |

No row remained `queued` / `running` / `processing` / `pending` at audit time.

## Appendix D — Security notes (Part 14)

| Check | Result | Evidence |
| --- | --- | --- |
| Bucket public flag | `video-renders.public = false` | SQL |
| Path tenancy | All objects under `aabab9ff-…/` | storage logs + render_spec paths |
| Cross-project leakage in this run | Not observed | paths |
| Asset reuse across projects | N/A (no asset_usage) | SQL |
| Signed URL TTL | **365 days** stored in job output | JWT iat/exp |
| RLS on tables | enabled on core tables | `list_tables` |

## Appendix E — Scene table (Part 7)

| # | id | type | duration_s (spec) | renderer | storage path |
| ---: | --- | --- | ---: | --- | --- |
| 1 | scene-1 | IMAGE | 4 | image@1 | `…/scene-scene-1.png` |
| 2 | scene-2 | IMAGE | 4 | image@1 | `…/scene-scene-2.png` |
| 3 | scene-3 | IMAGE | 4 | image@1 | `…/scene-scene-3.png` |
| 4 | scene-product-demo | PRODUCT_DEMO | 4 | product_demo@1 | `…/scene-scene-product-demo.png` |
| 5 | scene-5 | IMAGE | 4 | image@1 | `…/scene-scene-5.png` |

Sum of scene durations in spec = 20s; final video = 35.57s (audio-driven).

---

_End of forensic audit. All findings above cite concrete evidence from this production run’s database rows, n8n execution `#147`, storage lifecycle logs, render outputs, and the cited application code paths._
