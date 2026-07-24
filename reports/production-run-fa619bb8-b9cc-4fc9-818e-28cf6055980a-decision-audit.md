# Production Run Audit

`fa619bb8-b9cc-4fc9-818e-28cf6055980a` · Fenrik.chat · read-only · 2026-07-23

Exported from canvas `production-audit-fa619bb8.canvas.tsx`.

---

## Executive verdict

| Question | Answer |
| --- | --- |
| Sell content? | YES w/ edits |
| Sell video? | YES w/ issues |
| Pipeline OK? | YES w/ limits |
| Cost credible? | PARTIAL |

### 14-package overnight: GO WITH CONDITIONS

Safe to launch unsupervised only if you accept soft-fail story repair waste (~$0.23 recorded on this package), missing failed-TTS cost on retries, and a morning spot-check of the first 2–3 packages for overclaims + subtitle/CTA overlap. Review reconcile fix is already live on production (commit `128abce`).

### Quality

Commercially usable problem-aware angle for Fenrik. Text package is mostly sellable; LinkedIn primary + Facebook need claim edits. Video is a finished 9:16 deliverable with two major visual issues (hook glyph miss; CTA covered by subs).

- Content: **YES WITH MINOR FIXES**
- Video: **YES WITH MINOR ISSUES**

### Technical + cost

Pipeline recovered from TTS-tail failure via legitimate retry. Run completed at package persist while video still processed — expected settlement, but it triggered the review reconcile race (now fixed + deployed). Recorded cost $0.815147; failed TTS attempts unmetered.

- Pipeline: **YES WITH LIMITATIONS**
- Cost: **PARTIAL**

---

## Run summary

| Metric | Value |
| --- | --- |
| Run status | completed |
| Wall (create→updated) | 33.4 min |
| Packages requested/done | 1 / 1 |
| Video jobs | 2 (1 fail + 1 ok) |

| Field | Value |
| --- | --- |
| created_at | 2026-07-23T22:28:01.979Z |
| run completed (package settle) | 2026-07-23T22:41:09Z |
| video completed | 2026-07-23T22:46:38.559Z |
| updated_at | 2026-07-23T23:01:26.106Z |
| items | 1 completed · 0 failed · 0 cancelled · 0 open |
| content items | 11 (tiktok/ig/yt/fb + 2 linkedin + 5 x) |
| variants / localization | 0 |
| orphans | none |
| export | 1080×1920 · 23.70s · h264+aac · mean −21.5 dB · max −3.5 dB |

**IDs**

- Package: `2a686bdb-5eae-453b-ba5a-91d0227c14af`
- Failed video job: `1a8171e4-1242-4907-b954-53cd0a7f3feb`
- Completed video job: `68419281-d103-4fda-b46d-835549d0eca7`

---

## Cost breakdown

| Metric | Value |
| --- | --- |
| Recorded run total | $0.815 |
| Strategy + package AI | $0.682 |
| Completed video metered | $0.133 |
| Failed story repair (included) | $0.235 |

Source: `loadProductionRunTelemetry` · stored `estimated_cost` only · `pricing_version` `list-price@2026-07-23`

| Category | Provider | Operation | Stored $ | Scope |
| --- | --- | --- | --- | --- |
| strategy | claude | Weekly Strategy | $0.015462 | strategy |
| package | claude | Creative Direction Generation | $0.041901 | package |
| package | claude | Creative Direction Evaluation | $0.042330 | package |
| package | claude | Creative Ideation | $0.172560 | package |
| package | claude | Creative Evaluation | $0.032895 | package |
| package | claude | Presentation Generation | $0.126303 | package |
| package | claude | Story Integrity Repair (FAILED) | $0.234513 | package |
| package | openai | JSON Repair ×6 | $0.015788 | package |
| video | tts | TTS (completed job) | $0.005175 | video |
| video | whisper | Whisper | $0.002220 | video |
| video | image | Image generation ×3 | $0.126000 | video |
| video | video | Video rendering / FFmpeg | unmetered / missing | video |
| retry gap | tts | Failed job TTS ×3 attempts | unmetered / missing | retry gap |

### Arithmetic

```
0.015462 strategy + 0.666290 package + 0.133395 video = 0.815147
```

Package rollup equals `presentation_generation.generation_telemetry` step sum. Video rollup equals completed job `debug.generation_telemetry` only. Failed job contributes $0 to recorded total despite 3 paid TTS attempts (~21–23s each). FFmpeg/worker/DO/storage/Vercel/n8n are unmetered (no documented infra formula applied).

- Avg / finished package = **$0.815147**
- Avg / finished video (metered) = **$0.133395**
- Retry recorded = **$0.133395**
- Failed-attempt recorded = **$0.00**

---

## Platform outputs

| Platform | Verdict | Exact issue / evidence |
| --- | --- | --- |
| TikTok | SELLABLE | “Your bounce rate isn't a traffic problem. It's a silence problem.” — clear, short, product-aligned. |
| Instagram | SELLABLE | Structured caption; CTA “Link in bio → Create your AI assistant.” — commercially usable. |
| YouTube Shorts | SELLABLE WITH MINOR EDIT | Caption fine; CTA “Subscribe for more insights like this.” is generic — swap to fenrik.chat CTA. |
| Facebook | SELLABLE WITH MINOR EDIT | “without any technical setup” is a strong absolute; soften. Otherwise solid problem→solution. |
| LinkedIn (primary) | SELLABLE WITH MINOR EDIT | Overclaim: “Every session that ends without a conversion ended because a question went unanswered.” |
| LinkedIn (variant) | SELLABLE | Silence-problem framing without the absolute causality claim. |
| X (5 variants) | SELLABLE | Punchy reframes; one uses “50 people” from strategy topic as illustration — acceptable. |

---

## Video issues

| Timestamp | Scene | Severity | Issue | Action |
| --- | --- | --- | --- | --- |
| 0:00–0:04 | 1 | MAJOR | Prompt asked for half-written “BOUNCE RATE”; render shows only a squiggle. Hook concept not visible. | Regenerate scene-1 image with legible partial word or change VO to match visual. |
| 0:18–0:23 | 4 | MAJOR | Burned-in subtitles cover URL field + “Create AI assistant” button on product screenshot. | Raise subtitle safe-zone or shorten final cues; re-render only. |
| 0:05–0:16 | 2–3 | MINOR | Whiteboard arrows/boxes are abstract vs VO’s precise redefinition; support is partial. | Accept for organic; tighten prompts if selling as premium creative. |
| full | all | COSMETIC | Flat illustration style is generic “explainer” look; no finger/artifact failures. | None required for sellability. |

### Video classification: SELLABLE WITH MINOR ISSUES

Coherent 23.7s VO, synced SRT (`match_ratio=1`), product screenshot on resolution beat, no clipping. Not a tech demo — but scene-1 prompt miss + subtitle-over-CTA keep it out of clean “sell as-is” for premium delivery.

---

## Technical timeline

| Time (UTC) | Event | Result | ID |
| --- | --- | --- | --- |
| 22:28:01 | Run created | queued→running | `fa619bb8-b9cc-4fc9-818e-28cf6055980a` |
| 22:28:04–10 | Weekly Strategy | ok · $0.015462 | `971cfab0…` |
| 22:28:14–41:05 | Package generation + repairs | shipped despite story-repair fail | `2a686bdb-5eae-453b-ba5a-91d0227c14af` |
| 22:41:08 | Video job #1 created | processing | `1a8171e4-1242-4907-b954-53cd0a7f3feb` |
| 22:41:09 | Run settled completed | package-linked; video still open | item `7fc66db5…` |
| 22:41:23+ | Review reconcile race | 23514 cannot open item under terminal run | review GET |
| 22:41:33 | Job #1 failed | tts_tail_validation_failed after 3 attempts | `1a8171e4-1242-4907-b954-53cd0a7f3feb` |
| 22:42:30 | Job #2 retry claimed | retry_of #1 · legitimate auto-retry | `68419281-d103-4fda-b46d-835549d0eca7` |
| 22:42:30–46:33 | TTS → Whisper → Images → FFmpeg | ok · $0.133395 metered | `68419281-d103-4fda-b46d-835549d0eca7` |
| 22:46:38 | Job #2 completed + callback | artifacts persisted; reconcile ok | `68419281-d103-4fda-b46d-835549d0eca7` |
| post-fix | Review reconcile fix deployed | 128abce on production | `dpl_3xinepUg…` |

---

## Retry / rerender analysis

Job #1 failed because TTS repeatedly omitted the script tail (“and it's fixable”); Whisper tails stayed at “…silence is the real metric”. After 3 validation attempts the worker failed the job. Job #2 was created with `input.retry_of_video_job_id = job #1` — legitimate automatic retry, not a manual post-run rerender. It passed TTS on attempt 1 and rendered successfully.

Classification: **expected retry behavior** plus a **review-only bug** (reconcile tried to reopen a completed item under a terminal run while the retry was processing). DB stayed consistent; review page threw until fix `128abce`. Accounting bug: failed TTS spend not stored. No double-count of package AI; completed job only meters its own media.

---

## Database consistency

| Invariant | Result | Notes |
| --- | --- | --- |
| Terminal run has no illegally open items | PASS | item completed; no queued/running |
| Counters match rows | PASS | requested=1 generated=1 failed=0 |
| Package assignment correct | PASS | strategy_item ↔ package_index 0 |
| Expected package exists | PASS | `2a686bdb…` |
| Video linked to package/item | PASS | both jobs → same content_item |
| No duplicate active jobs | PASS | 1 failed + 1 completed |
| No stale processing jobs | PASS | none open now |
| No hidden failures | PASS | failed job retained with error |
| Invalid terminal transitions blocked | PASS* | DB trigger blocked reopen; app reconcile raced until fix |
| Failed-attempt costs recorded | FAIL | job #1 has 0 telemetry steps |
| Review refresh read-safe after fix | PASS | deployed 128abce + catch fallback |

---

## Telemetry gaps

### Present

provider, model, step_name, success, start/end/duration, tokens, cached=0, raw_usage, estimated_cost, pricing_source/version, package/run/strategy IDs, video job ID on media steps, retry_count on story repair

### Missing / impact

- `provider_request_id` always null — weak provider support debugging
- Failed video job has no `generation_telemetry` — cost accuracy gap for retries
- Video rendering `estimated_cost` null — expected; compute unmetered
- `production_run_items.video_job_id` null — newest job resolved at read time

---

## Logs

| Class | Finding |
| --- | --- |
| Actionable (fixed) | Multiple review GET 23514 “cannot open item … under terminal run” while retry processing |
| Expected | tts_tail_validation_failed → auto retry; run_reconcile after callbacks |
| Harmless | Review listing latency ~6–10s across historical runs |
| Blocker for unsupervised 14? | No — if production stays on 128abce and cost/quality conditions accepted |

---

## Blocking vs non-blocking

### Conditions (not hard blockers)

- Confirm prod deploy = `128abce` (verified READY)
- Budget story-repair waste (~$0.23 this run) ×14 if pattern repeats
- Accept failed-TTS cost blind spot or monitor provider dashboards
- Morning QA of first packages for claim + CTA-cover issues

### Non-blocking

- Flat illustration aesthetic
- Subtitle mid-phrase chunking
- Package status remains draft
- YouTube subscribe CTA weakness
- FFmpeg unmetered compute

---

## Final answers

| Question | Answer |
| --- | --- |
| Sell this exact output? | **YES WITH MINOR CHANGES** |
| 14 packages overnight? | **YES AFTER LISTED FIXES** |
