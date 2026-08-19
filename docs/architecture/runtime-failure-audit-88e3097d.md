# Runtime Failure Audit — Manual Review

**Run:** `88e3097d-9d4c-4c54-ae53-6eb11afcdb59`  
**Project:** `163c1822-ad30-4cee-8826-dfacd9c188b9`  
**Mode:** `manual_review`  
**Continue Generation:** `2026-08-12T13:19:43.791Z`  
**Worker:** `9bf4b1493d25-19-824d77d2`  
**Sources:** Supabase DB + repo code  
**Scope:** Read-only audit — no code or data modified

| Metric | Value |
|---|---|
| Packages approved | 3 |
| Creative rebuilds | 3 |
| Image timeouts | 3 |
| `HTTP_TIMEOUT_MS.ai` | 60s |

## Exact failure point

```
Continue
  → Creative rebuild (all 3)
  → Video job create + dispatch
  → Worker start
  → TTS OK
  → Whisper OK
  → Scene image generation
  → AbortController timeout on POST https://api.openai.com/v1/images/generations (60000 ms)
  → assembly/upload never reached
  → failed callback
  → run item „Renderování videa selhalo.“
```

---

## 1. Timeline (Continue → render fail)

All times UTC. Jobs ran sequentially on one worker (default `MAX_CONCURRENT_VIDEO_JOBS=1`).

| Time | Function | File | Inputs → Outputs | DB / states |
|---|---|---|---|---|
| `2026-08-12T13:19:43.791Z` | `continueCreativeReviewGeneration` | `lib/ai/workflows/continueCreativeReviewGeneration.ts` | `runId=88e3097d…, actor=editor` → claim `waiting_for_creative_review` → `running`; stamp `continued_after_creative_review` | run=`running`; pkg=`approved → rebuild`; job=`—` · `production_runs.status=running`; `config.continued_after_creative_review=true` |
| `2026-08-12T13:19:43.791Z` | `rebuildCreativePackageForVideo` ×3 | `lib/creative-review/rebuildCreativePackage.ts` | approved creative_review + anchors (VI/OI/VC) → `creative_rebuild_completed` on all 3 packages (once each) | run=`running`; pkg=`prompts rebuilt`; job=`—` · `package_brief.creative_review.history += creative_rebuild_completed` |
| `2026-08-12T13:19:43.791Z` | `appendContinueHistory` ×3 | `continueCreativeReviewGeneration.ts` | fresh claim → `continue_generation_started` ×3 | run=`running`; pkg=`continue stamped`; job=`—` · `history += continue_generation_started` |
| `13:19:49–13:19:55Z` | `ensureVideoJobForPackage` ×3 | `continueCreativeReviewGeneration.ts` | rebuilt package briefs → 3 video_jobs created (`render_kind=package`) | run=`running`; pkg=`draft`; job=`created` · `video_jobs` INSERT |
| `13:19:49–13:19:55Z` | `claimAndDispatchVariantVideoJob` ×3 | `lib/ai/workflows/dispatchVariantVideoJob.ts` | `callback_url` from `resolveVideoCallbackUrl()`; input with `continued_after_creative_review=true` → all 3 accepted by worker (same instance) | run=`running`; pkg=`draft`; job=`dispatched` · dispatch keeps queued; worker claim → processing + lease |
| `13:19:58Z` | `runVideoJob` / TTS | `video-worker/jobRunner.ts` | job `0374…` voiceover → TTS OK 9.0s | run=`running`; pkg=`draft`; job=`processing` · telemetry step TTS success |
| `13:20:07Z` | Whisper | `video-worker/jobRunner.ts` | voiceover audio → Whisper OK 4.3s | run=`running`; pkg=`draft`; job=`processing` · telemetry step Whisper success |
| `13:20:11 → 13:24:12Z` | `generateSceneImages` → `OpenAIImageProvider.generateImage` | `video-worker/services/prepareImageSceneRaster.ts` → `lib/ai/openai.ts` | `gpt-image-1`, size `1024x1536`, ~5–6k char prompts → `HttpTimeoutError` after 240848ms | run=`running`; pkg=`draft`; job=`failed` · `video_jobs.status=failed`; error=`images/generations timed out after 60000 ms` |
| `13:24:16Z` | video callback → run item fail | `app/api/n8n/video-callback/route.ts` | failed callback job `0374…` → „Renderování videa selhalo.“ | run=`running`; pkg=`draft`; job=`failed` · `production_run_items.status=failed` |
| `13:24:18 → 13:28:27Z` | Job `1204…` TTS→Whisper→Image | video-worker (sequential queue, max=1) | same worker instance → Image timeout 236779ms | run=`running`; pkg=`draft`; job=`failed` · run item failed `13:28:29Z` |
| `13:28:30 → 13:31:49Z` | Job `5be8…` TTS→Whisper→Image | video-worker (sequential) | same worker instance → Image timeout 181277ms | run=`running→later completed`; pkg=`draft`; job=`failed` · run item failed `13:31:52Z` |
| `14:15:53Z` | reconcile / settle | production runtime | 3/3 packages failed → run `status=completed`; `generated_total=0`; `failed_total=3` | run=`completed`; pkg=`draft`; job=`failed ×3` · `production_runs` updated |

---

## 2. Continue Generation audit

### Verdict

- **Creative Rebuild:** YES for all 3 packages, exactly once each (history event `creative_rebuild_completed` @ Continue timestamp). Not skipped. Not errored.
- **Continue:** `continue_generation_started` once per package. `requested_config.continued_after_creative_review=true`, `continued_after_creative_review_by=editor`.
- **Video jobs:** created for all 3; dispatched (worker accepted; same instance). `production_run_items.video_job_id` stayed null (failure path stores `error_message` only).

### Per package

| # | Package ID | Title | Approved | Creative rebuild | Video job created | Video job ID | Dispatch | Worker start (TTS) |
|---|---|---|---|---|---|---|---|---|
| 0 | `07261aaf-8f91-452f-91df-6b588aaa1f62` | The Call That Never Came | yes @ `13:19:27Z` | yes ×1 @ Continue | yes | `0374e22b-90ca-448a-bfce-cb7896be7254` | yes | `13:19:58Z` |
| 1 | `910da853-4f62-4cad-ab00-071c3a73af45` | The In-House Quarter | yes @ `12:39:53Z` | yes ×1 @ Continue | yes | `12048376-4025-42e5-bda2-cd0f22c7dc74` | yes | `13:24:18Z` |
| 2 | `70e73521-5cee-4771-b39d-e6231c0122f7` | The Founder Who Stopped Being the Content Department | yes @ `00:56:41Z` | yes ×1 @ Continue | yes | `5be8c819-cddf-4a53-9660-995d9b4891ae` | yes | `13:28:30Z` |

---

## 3. Video job audit

| Job | Package | Created | Failed | Input flags | Callback | Queue | Retries (telemetry) | Status |
|---|---|---|---|---|---|---|---|---|
| `0374e22b…` | `07261aaf…` | `13:19:49Z` | `13:24:14Z` | `continued_after_creative_review=true`; 5 scenes; `provider=video_engine` | not stored on input (passed at dispatch HTTP payload) | in-process FIFO; concurrency=1 | `step.retry_count=0` (HTTP layer retries separately, max 3) | failed |
| `12048376…` | `910da853…` | `13:19:52Z` | `13:28:28Z` | same | same | same | same | failed |
| `5be8c819…` | `70e73521…` | `13:19:55Z` | `13:31:50Z` | same | same | same | same | failed |

**Status transitions:** DB only retains final `status=failed`. Evidence of processing: `lease_owner=job id`, `worker_instance_id` set, telemetry steps present. No `completed_at`.

**Error (all 3):**

```
request to https://api.openai.com/v1/images/generations timed out after 60000 ms
```

---

## 4. Worker audit (where each job stopped)

| Job | Worker start | TTS | Whisper | Scenes 1–5 | Assembly | Upload | Callback | Stopped at |
|---|---|---|---|---|---|---|---|---|
| `0374e22b…` | `13:19:58Z` | OK | OK | Image step FAIL (241s) — no per-scene DB log | not reached | not reached | failed callback | Image generation |
| `12048376…` | `13:24:18Z` | OK | OK | Image step FAIL (237s) — no per-scene DB log | not reached | not reached | failed callback | Image generation |
| `5be8c819…` | `13:28:30Z` | OK | OK | Image step FAIL (181s) — no per-scene DB log | not reached | not reached | failed callback | Image generation |

### Scene index precision

Telemetry is step-level only (`Image generation`), not per-scene.

- Job `5be8…` **181277ms ≈ 3×60s** → failure on first `generateImage` call (scene-1).
- Jobs `0374…` / `1204…` **~237–241s ≈ ~60s + 3×60s** → consistent with one slow success then fail on next scene, or equivalent overhead — **not proven** without worker console logs.

---

## 5. OpenAI Image audit

| | |
|---|---|
| Timed-out HTTP attempts | ≥9 (3 jobs × ≥3) |
| Model | `gpt-image-1` |
| Size | `1024x1536` (`VIDEO_SCENE_IMAGE_SIZE`) |
| Endpoint | `https://api.openai.com/v1/images/generations` |

Each `generateImage` uses `fetchWithRetry(label="openai:image")` with `timeoutMs=60000`, `maxAttempts=3`. Error text matches `HttpTimeoutError` exactly — thrown only after `fetch()` was started and `AbortController` fired.

**So:** request was initiated; no HTTP response was accepted before abort. Cannot prove from DB whether OpenAI was still generating vs network stall.

| Job | Image step start | Image step end | Latency | Response | Scenes attempted |
|---|---|---|---|---|---|
| `0374e22b…` | `13:20:11Z` | `13:24:12Z` | 240848 ms | none (`AbortError` → `HttpTimeoutError`) | unknown exact count; ≥1 `generateImage` exhausted retries |
| `12048376…` | `13:24:30Z` | `13:28:27Z` | 236779 ms | none | same |
| `5be8c819…` | `13:28:47Z` | `13:31:49Z` | 181277 ms | none | same |

---

## 6. Timeout audit — exact code site

**Classification:** client-side fetch timeout via `AbortController` — not an OpenAI-documented server timeout string, not a proxy message, not a worker process kill, not a separate provider SDK timeout.

| What | Where | Value |
|---|---|---|
| Constant | `lib/http/fetchWithRetry.ts` — `HTTP_TIMEOUT_MS.ai` | `60_000` |
| AbortController | `fetchWithTimeout` lines 57–63 | `setTimeout` → `controller.abort()` |
| Error class | `HttpTimeoutError` constructor line 42 | `` request to ${url} timed out after ${timeoutMs} ms `` |
| Caller | `lib/ai/openai.ts` `OpenAIImageProvider.generateImage` ~225–243 | `timeoutMs: HTTP_TIMEOUT_MS.ai`, `maxAttempts: HTTP_MAX_ATTEMPTS.ai` (3) |
| URL | `lib/ai/openai.ts` `IMAGE_URL` | `https://api.openai.com/v1/images/generations` |
| Worker HTTP timeout | `HTTP_TIMEOUT_MS.worker` | `30_000` (not this error) |

```ts
// lib/http/fetchWithRetry.ts
export const HTTP_TIMEOUT_MS = { ai: 60_000, worker: 30_000 };
export const HTTP_MAX_ATTEMPTS = { ai: 3, worker: 2 };

// fetchWithTimeout → AbortController.abort() after timeoutMs
// → throw new HttpTimeoutError(url, timeoutMs)
```

---

## 7. Prompt audit (final OpenAI prompt)

Stored `scene.image_prompt` from `video_jobs.input` after creative rebuild.

**Final** = stored + NATURAL profile suffix (~98) + PHOTOGRAPHIC medium suffix (~72) → `sanitizeImagePrompt` (reimplementation of `video-worker/services/imagePrompt.ts`).  
Token estimate = `ceil(chars/4)`.

| Package | Scene | Stored chars | Final chars | ~Tokens | Shape |
|---|---|---|---|---|---|
| `07261…` Call | 1 | 6059 | 6086 | 1522 | OPENING IMPACT + full anchors |
| `07261…` Call | 2–5 | 5462–5571 | 5569–5678 | 1393–1420 | VISUAL IDENTITY block first |
| `910da…` Quarter | 1 | 5668 | 5957 | 1490 | OPENING IMPACT + full anchors |
| `910da…` Quarter | 2–5 | 5157–5360 | 5408–5611 | 1352–1403 | VISUAL IDENTITY block first |
| `70e735…` Founder | 1 | 6721 | 6763 | 1691 | OPENING IMPACT + full anchors |
| `70e735…` Founder | 2–4 | 6070–6208 | 6081–6250 | 1521–1563 | VISUAL IDENTITY block first |
| `70e735…` Founder | 5 | 158 | 574 | 144 | short end-card (asset-style) |
| PROD ref `416be…` | 1–5 | 312–428 | ~300–500 | ~80–125 | short scene description only |

### Extreme length vs production

Manual Review rebuilt prompts: **~5.1k–6.7k chars/scene** (except one 158-char end card).  
Production reference job `416be873-b73a-4991-86ac-849d86373c08`: **312–428 chars/scene**.  
Ratio ≈ **15–16×**.

`composeRebuiltImagePrompt` embeds full Visual Identity + Opening Impact + Video Concept anchors into every AI scene; `maxLength` exists but is **not passed** for IMAGE rebuilds.

---

## 8. Comparison — Production vs this Manual Review run

| Dimension | Production (`416be…`, same project) | This MR run |
|---|---|---|
| Prompt shape | Short scene description | OPENING IMPACT / VISUAL IDENTITY anchors + intent |
| Avg prompt chars | 349 | 5058–5618 |
| Image step duration | 97346 ms SUCCESS (5 scenes) | 181–241s FAIL |
| Image model | `gpt-image-1` | `gpt-image-1` |
| Timeout constant | `HTTP_TIMEOUT_MS.ai=60s` | same |
| Callback mechanism | dispatch payload `callback_url` | same path |
| `continued_after_creative_review` | absent/null | `true` on job input |
| Worker concurrency | same default 1 | same instance sequential |
| TTS/Whisper | OK | OK on all 3 |

---

## 9. Render pipeline (exact stop)

```
Continue Generation
  ↓
Creative Rebuild ×3 (OK, once each)
  ↓
Create video_jobs ×3 (OK)
  ↓
Dispatch → worker enqueue (OK, sequential)
  ↓
Worker claim (processing + lease)
  ↓
TTS (OK) → Whisper (OK)
  ↓
prepareImageSceneRaster / generateImage
  ↓
fetchWithTimeout(AbortController, 60000)
  ↓
TIMEOUT × up to 3 attempts per generateImage
  ↓
Image generation step FAIL
  ↓
NO assembly / NO upload
  ↓
Failed callback → run item "Renderování videa selhalo."
  ↓
Run settled completed with failed_total=3
```

---

## 10. Root cause (facts only)

### A — Direct failure mechanism

**Client AbortController timeout on OpenAI Images API**

- **Evidence:** `video_jobs.error_message` and telemetry identical to `HttpTimeoutError` message; code path `openai.ts` → `fetchWithRetry` → `fetchWithTimeout`; constant `60000`.
- **Confidence:** 99%

### B — Why it hit Manual Review (correlated cause)

**Creative rebuild emitted ~15× larger image prompts than production**

- **Evidence:** DB prompt lengths 5–6k vs production ~300–400; `composeRebuiltImagePrompt` always prepends full VI/OI/VC blocks; production image step finishes 5 scenes in 97s (~19s/scene) under same 60s budget; MR image step never completes a full set.
- **Confidence** that prompt bloat is the differentiating factor vs production: **90%**.
- **Confidence** that OpenAI was specifically “too slow because of prompt length” (vs transient OpenAI/network hang): **75%** — abort does not return provider latency headers.

### C — Ruled out / not evidenced

| Claim | Status |
|---|---|
| Creative rebuild skipped or failed | NO (history shows completed ×3) |
| Dispatch never reached worker | NO (TTS/Whisper ran) |
| Different image model | NO (`gpt-image-1` both) |
| Missing callback URL preventing start | NO (jobs processed) |
| Vercel runtime logs for this window | UNAVAILABLE (API 403) |
| Worker stdout per-scene attempt lines | NOT in DB |

---

## 11. Fix recommendation (no implementation)

### Minimal fix

1. Raise image-specific timeout above 60s (separate from chat), e.g. `HTTP_TIMEOUT_MS.image ≥ 120–180s`, keep retries bounded.
2. Cap rebuilt prompts: pass `maxLength` into `composeRebuiltImagePrompt` for AI scenes, or stop embedding full Visual Identity / Opening Impact verbatim into every scene.
3. Add per-scene telemetry (`scene_id`, attempt, latency) so the next failure names the exact scene.

### Why / blast radius

- **Why:** Images API call aborted locally after 60s; MR prompts are an order of magnitude larger after rebuild.
- **Why only after Manual Review:** production path never runs `composeRebuiltImagePrompt`; prompts stay short and finish under 60s.
- **Can Production be hit?** Yes — same timeout/code. Any still that takes >60s (provider slowness, long prompt, moderation retry) fails the same way. Observed successful production jobs on this project currently stay under budget (~19s/scene).

---

*Audit only. No code or data modified.*
