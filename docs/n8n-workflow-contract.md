# n8n Workflow Contract — AI Content Manager MVP

This document is the single source of truth for the **5 n8n workflows**. It is
aligned with the **real, QA-verified** state of the code: n8n is **pure
orchestration**. Every piece of business logic (AI generation, strategy
decisions, CTA/hashtags, content_items/content_versions/video_jobs writes,
publishing slots) runs in the **existing Next.js `/api/n8n/*` endpoints**.

> Scope of this document: **contract only**. No workflow is implemented in code
> here. The database, the endpoints and the app architecture are **not changed**
> by this doc — it only describes what already exists after QA.

---

## Legend

- ✅ **Implemented in Vercel** — already exists in this repository, do not rebuild.
- 🔧 **Build in n8n** — the thin bridge workflow created in n8n.
- 🚫 **Out of MVP scope** — do not build now.

---

## 1. Architecture principles (must hold for every workflow)

1. **n8n orchestrates only — it never runs business logic.** All generation,
   strategy, scoring, slot planning and persistence happen inside the existing
   Next.js endpoints under `/api/n8n/*`.
2. **Workflows are thin bridge workflows.** A workflow is at most:
   - a Webhook trigger,
   - a **minimal** Supabase guard/read **only when needed** (e.g. read a
     `strategy_item_id`, check that input data exists),
   - one HTTP call to the matching `/api/n8n/*` endpoint,
   - optionally a second HTTP call to `/api/n8n/start-video-job`,
   - an error callback,
   - logging of the status + response body.
3. **n8n MUST NOT** (the backend owns all of this):
   - generate content,
   - decide strategy,
   - create CTAs,
   - create hashtags,
   - manipulate `content_items`,
   - create `content_versions`,
   - create `video_jobs`,
   - plan publishing slots with business logic,
   - score / rank trends.
4. **One workflow set for all projects.** There is **no per-project workflow**.
   The only variable passed through is `project_id`; a new project must work
   with the existing 5 workflows with **zero n8n changes**.
5. **Unified webhook envelope** for every trigger (Vercel → n8n). The bridge
   reads fields off `body`:

```json
{
  "workflow": "generate_content_package",
  "project_id": "uuid",
  "requested_at": "2026-06-04T11:00:00.000Z",
  "payload": {}
}
```

6. **The backend is synchronous and authoritative.** The `/api/n8n/*`
   execution endpoints do the work and return the created/updated row ids in
   their response body (`data.packageId`, `data.videoJobId`, …). n8n forwards
   those ids to follow-up calls (e.g. `start-video-job`); it does not invent
   them.

---

## 2. Authentication & environment

| Direction | Header | Secret (env) | Validated by |
|-----------|--------|--------------|--------------|
| Vercel → n8n (trigger webhook) | `x-n8n-secret` | `N8N_WEBHOOK_SECRET` | 🔧 n8n Webhook node (header auth) |
| n8n → Vercel (`/api/n8n/*` calls) | `x-n8n-secret` | `N8N_CALLBACK_SECRET` | ✅ Vercel `/api/n8n/*` routes (`verifyN8nSecret`) |

> The header name is identical in both directions, but the **secret value and
> direction differ**. Every outbound call from n8n to a `/api/n8n/*` endpoint
> (execution endpoint, `start-video-job`, or `error-callback`) authenticates
> with `N8N_CALLBACK_SECRET`. The incoming trigger webhook is protected by
> `N8N_WEBHOOK_SECRET`.

| Variable | Used by | Notes |
|----------|---------|-------|
| `N8N_BASE_URL` | ✅ Vercel `/api/automation/*` triggers | Outbound webhook target (where n8n listens). |
| `N8N_WEBHOOK_SECRET` | ✅ Vercel → 🔧 n8n | Sent in `x-n8n-secret` on triggers; required by the webhook node. |
| `N8N_CALLBACK_SECRET` | 🔧 n8n → ✅ Vercel | Sent in `x-n8n-secret` on every `/api/n8n/*` call. |
| `NEXT_PUBLIC_SUPABASE_URL` | both | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔧 n8n Supabase guard nodes + ✅ backend | Service role for server-side reads (bypasses RLS — scope every n8n read by `project_id`). |
| `VIDEO_WORKER_URL` | ✅ `/api/n8n/start-video-job` | External Video Worker (DigitalOcean / Docker). **Not** n8n's concern. |
| `VIDEO_WORKER_SECRET` | ✅ `/api/n8n/start-video-job` | Auth for the Video Worker call. |

---

## 3. Vercel endpoints (✅ already implemented)

### Trigger endpoints (UI/cron → Vercel → n8n)

These validate the request, verify the project exists, and POST the unified
envelope to `N8N_BASE_URL`. They return **`202 Accepted`**.

| Endpoint | Workflow value | Extra `payload` fields |
|----------|----------------|------------------------|
| `POST /api/automation/generate-content-package` | `generate_content_package` | `package_count?`, `funnel_stage?` |
| `POST /api/automation/regenerate-content-package` | `regenerate_content_package` | `content_package_id`, `reason?` |
| `POST /api/automation/trend-scan` | `trend_scan` | — |
| `POST /api/automation/weekly-strategy` | `weekly_strategy` | `week_start` |
| `POST /api/automation/publishing-planner` | `publishing_planner` | `week_start` |

### Execution endpoints (n8n → Vercel) — **this is where the business logic runs**

The bridge workflow calls **one** of these. Each one authenticates with
`N8N_CALLBACK_SECRET`, runs on the service-role admin client (no user session),
executes the existing business logic, and **persists directly**.

| Endpoint | Required body | Backend does / writes |
|----------|---------------|------------------------|
| `POST /api/n8n/weekly-strategy` | `project_id`, `week_start` | AI strategy → `content_strategies`, `content_strategy_items` |
| `POST /api/n8n/generate-content-package` | `project_id`, `strategy_item_id` | AI copy + video script → `content_packages` (draft), `content_items`, `video_jobs` (queued), `asset_usage` |
| `POST /api/n8n/regenerate-content-package` | `project_id`, `content_package_id`, `reason?` | snapshot → `content_versions`; update `content_items`; reset package to `draft`; new `video_jobs` (queued) |
| `POST /api/n8n/publishing-planner` | `project_id`, `week_start` | rule-based slot mapping → `publishing_schedule` |
| `POST /api/n8n/trend-scan` | `project_id`, `candidates[]` | AI relevance scoring → `trends` (accepted only) |
| `POST /api/n8n/start-video-job` | `project_id`, `content_package_id`, `video_job_id?` | hands an existing `video_jobs` row to the external Video Worker; marks it `processing` |

Execution-endpoint responses (✅):
- Success of generate/regenerate/weekly-strategy: `200 { ok: true, data: { … } }`
  where `data` carries `packageId`, `videoJobId`, `contentItemIds`, etc.
- publishing-planner / trend-scan / start-video-job: `202 { ok: true, … }`.
- `400` invalid input / `404` project or package not found / `401` bad secret /
  `422` AI output failed validation / `500` server/DB or Video Worker config.

### Callback endpoints used by the backend / Video Worker (n8n does **not** call these in the bridge flow)

| Endpoint | Caller | Writes to |
|----------|--------|-----------|
| `POST /api/n8n/video-callback` | external **Video Worker** when a render finishes | `video_jobs` (+ `content_packages.status`) |
| `POST /api/n8n/error-callback` | 🔧 n8n error branch | nothing (structured server log only) |
| `content-package-callback`, `trend-scan-callback`, `weekly-strategy-callback`, `publishing-plan-callback` | reused **internally** by the execution endpoints | their respective tables |

> The execution endpoints persist results themselves, so n8n does **not** POST
> the workflow callbacks. The only callbacks in the bridge picture are
> `video-callback` (called by the Video Worker, not n8n) and `error-callback`
> (called by n8n's error branch).

---

## 4. Tables in scope (real schema)

These are the tables the **backend** touches. n8n only reads a tiny subset for
guards (see each workflow) and **never writes** them.

`projects`, `content_packages`, `content_items`, `video_jobs`, `trends`,
`content_strategies`, `content_strategy_items`, `publishing_schedule`, `assets`,
`asset_usage`, `evergreen_topics`, `content_versions`.

**Do NOT use** (these do not exist): `automation_errors`, `generation_logs`,
`callback_failures`, `weekly_strategies`, `publishing_plans`, `videos`,
`project_brain`.

### Enum values (from migration 001 + 008)

| Enum | Allowed values |
|------|----------------|
| `package_status` | `draft`, `ready`, `approved`, `published`, `archived` (no `failed`, no `regenerate_requested`) |
| `job_status` (video_jobs) | `queued`, `processing`, `completed`, `failed` |
| `approval_status` (content_items, publishing_schedule) | `draft`, `in_review`, `approved`, `rejected`, `scheduled`, `published` |
| `platform_type` | `instagram`, `facebook`, `linkedin`, `tiktok`, `youtube`, `blog`, `email`, `google_business` |
| `content_format` | `post`, `story`, `reel`, `short`, `carousel`, `article`, `email` |
| `goal_type` | `lead_generation`, `awareness`, `activation`, `retention` |
| `trend_source` | `manual`, `google_trends`, `social`, `news`, `internal` |
| `funnel_stage` | `awareness`, `problem_aware`, `solution_aware`, `conversion` |

---

## 5. Generic error callback (all workflows)

On any terminal failure, after the per-node retries are exhausted, the n8n 🔧
error branch must POST:

`POST /api/n8n/error-callback`

```json
{
  "project_id": "uuid (optional)",
  "workflow": "generate_content_package",
  "step": "N3 — Generate Content Package (optional)",
  "error_type": "workflow_error",
  "error_message": "real error message — do not mask"
}
```

Required fields: `workflow`, `error_type`, `error_message`. The endpoint **does
not persist** this (no error table exists); it logs a structured line and returns
`200`. There is **no package "failed" status**, so a failed run does not change
`content_packages.status`.

---

## 6. Error visibility (mandatory for every HTTP node)

Each HTTP Request node must be configured so that, while debugging, the
following are always visible and the **real error is never hidden**:

- the **endpoint** called (full URL),
- the **payload** that was sent,
- the **HTTP status** code returned,
- the **response body** returned.

Concretely in n8n: keep "Full Response" / response logging on, do **not**
swallow non-2xx into a generic message, and forward the upstream
`error_message` verbatim into `error-callback`. A bridge that hides the
backend's `422`/`500` body is a defect.

---

## 7. Generic retry rules

| Step | Retry policy |
|------|--------------|
| Supabase guard/read (n8n node) | up to 3 tries, ~1s backoff, on network / 5xx only. |
| HTTP call to `/api/n8n/*` execution endpoint | up to 3 tries, ~2s backoff, on network / 5xx / timeout only. |
| HTTP call to `/api/n8n/start-video-job` | up to 3 tries, ~2s backoff. |
| `400` / `404` / `422` from an endpoint | **Do not retry** — input/logic problem. POST `error-callback`. |
| `401` | **Stop** — secret misconfigured. Alert; do not loop. |
| `error-callback` POST | up to 5 tries, exponential backoff, on network / 5xx only. |

Because the backend uses ids (`content_package_id`, `video_job_id`) and is
scoped by `project_id`, safe retries do not create duplicates — **except** the
known Publishing Planner limitation in §11.

---

## 8. Workflow 1 — Generate Content Package

- **Workflow value:** `generate_content_package`
- **Status:** bridge workflow 🔧 (all logic in ✅ `/api/n8n/*`)

**Verified flow:**

```
Webhook trigger
  → read strategy_item_id (minimal Supabase guard)
  → POST /api/n8n/generate-content-package   (backend creates everything)
  → POST /api/n8n/start-video-job            (using ids from the response)
  → (error branch → /api/n8n/error-callback)
```

**Backend creates** (n8n does none of this): `content_packages` (status
`draft`), `content_items`, `video_jobs` (status `queued`), `asset_usage`.

**Trigger payload (Vercel → n8n):**

```json
{
  "workflow": "generate_content_package",
  "project_id": "11111111-1111-1111-1111-111111111111",
  "requested_at": "2026-06-04T11:00:00.000Z",
  "payload": { "funnel_stage": "awareness" }
}
```

**Step 1 — minimal guard read (🔧):** read **one** `content_strategy_items` row
for `project_id` (optionally filtered by `payload.funnel_stage`) to obtain a
`strategy_item_id`. This is the only Supabase touch and it is **read-only**.

**Step 2 — execution call (🔧 → ✅):**

`POST /api/n8n/generate-content-package`

```json
{
  "project_id": "11111111-1111-1111-1111-111111111111",
  "strategy_item_id": "33333333-3333-3333-3333-333333333333"
}
```

Response (✅) on success:

```json
{
  "ok": true,
  "data": {
    "packageId": "22222222-2222-2222-2222-222222222222",
    "videoJobId": "44444444-4444-4444-4444-444444444444",
    "status": "draft",
    "contentItemIds": ["…"]
  }
}
```

**Step 3 — start video (🔧 → ✅):**

`POST /api/n8n/start-video-job`

```json
{
  "project_id": "11111111-1111-1111-1111-111111111111",
  "content_package_id": "22222222-2222-2222-2222-222222222222",
  "video_job_id": "44444444-4444-4444-4444-444444444444"
}
```

The endpoint hands the existing `video_jobs` row to the external Video Worker
(DigitalOcean/Docker) and marks it `processing`. The Worker renders
asynchronously and later calls `POST /api/n8n/video-callback` itself (n8n is not
involved in the render or its callback).

**Error branch (🔧):** see §5 with `workflow: "generate_content_package"`.

**Expected final status:** `content_packages.status = 'draft'` (review-ready;
the video-callback keeps it `draft` on `completed`); `video_jobs.status` moves
`queued → processing → completed` once the Worker reports back.

---

## 9. Workflow 2 — Regenerate Content Package

- **Workflow value:** `regenerate_content_package`
- **Status:** bridge workflow 🔧 (all logic in ✅ `/api/n8n/*`)

**Verified flow:**

```
Webhook trigger
  → POST /api/n8n/regenerate-content-package   (backend does everything)
  → IF response.data.videoJobId present → POST /api/n8n/start-video-job
  → (error branch → /api/n8n/error-callback)
```

**Backend does** (n8n does none of this): inserts a snapshot into
`content_versions`, updates the existing `content_items` in place, resets the
package to `draft`, and creates a new `video_jobs` row (status `queued`).

**Trigger payload:**

```json
{
  "workflow": "regenerate_content_package",
  "project_id": "11111111-1111-1111-1111-111111111111",
  "requested_at": "2026-06-04T11:05:00.000Z",
  "payload": {
    "content_package_id": "22222222-2222-2222-2222-222222222222",
    "reason": "Tone too formal"
  }
}
```

**Step 1 — execution call (🔧 → ✅):**

`POST /api/n8n/regenerate-content-package`

```json
{
  "project_id": "11111111-1111-1111-1111-111111111111",
  "content_package_id": "22222222-2222-2222-2222-222222222222",
  "reason": "Tone too formal"
}
```

Response (✅) on success includes `data.videoJobId` and `data.versionsCreated`.

**Step 2 — start video, conditionally (🔧 → ✅):** only **if** the response
contains a `videoJobId`, POST `/api/n8n/start-video-job` with
`{ project_id, content_package_id, video_job_id }` (same shape as Workflow 1).

**Error branch (🔧):** §5 with `workflow: "regenerate_content_package"`.

**Expected final status:** `content_packages.status = 'draft'`; prior state
preserved in `content_versions`; new `video_jobs` renders via the Worker.

---

## 10. Workflow 3 — Weekly Strategy

- **Workflow value:** `weekly_strategy`
- **Status:** bridge workflow 🔧 (all logic in ✅ `/api/n8n/weekly-strategy`)

**Verified flow (with input guard):**

```
Webhook trigger
  → input guard: does the project have ANY input data?
        read evergreen_topics  OR  eligible trends (metadata.relevance_score >= 60)
        → if BOTH are empty: end the run as NO_INPUT_DATA (do NOT call AI/backend,
          do NOT loop/retry)
        → else: POST /api/n8n/weekly-strategy
  → (error branch → /api/n8n/error-callback)
```

**Input guard rationale:** the strategy AI is expensive (often **60–90 s**, see §15). If
there is nothing to plan from, the workflow must **end deterministically** as
`NO_INPUT_DATA` rather than repeatedly invoking the AI/backend. The guard is a
read-only existence check — it does **not** score, rank, or decide strategy.

**Trigger payload:**

```json
{
  "workflow": "weekly_strategy",
  "project_id": "11111111-1111-1111-1111-111111111111",
  "requested_at": "2026-06-04T11:15:00.000Z",
  "payload": { "week_start": "2026-06-08" }
}
```

**Execution call (🔧 → ✅):**

`POST /api/n8n/weekly-strategy`

```json
{
  "project_id": "11111111-1111-1111-1111-111111111111",
  "week_start": "2026-06-08"
}
```

The backend validates `week_start` (`YYYY-MM-DD`), derives `week_end`
(`week_start + 6` days), runs the AI strategy, and persists
`content_strategies` + `content_strategy_items`. `week_start` invalid → `400`.

**Error branch (🔧):** §5 with `workflow: "weekly_strategy"`.

**Expected final status:** one new `content_strategies` row + N
`content_strategy_items` rows for the week — **or** a clean `NO_INPUT_DATA`
termination with no backend call.

---

## 11. Workflow 4 — Publishing Planner

- **Workflow value:** `publishing_planner`
- **Status:** bridge workflow 🔧 (all logic in ✅ `/api/n8n/publishing-planner`)

**Verified flow:**

```
Webhook trigger
  → POST /api/n8n/publishing-planner   (backend does the slot mapping + persist)
  → (error branch → /api/n8n/error-callback)
```

**Trigger payload:**

```json
{
  "workflow": "publishing_planner",
  "project_id": "11111111-1111-1111-1111-111111111111",
  "requested_at": "2026-06-04T11:20:00.000Z",
  "payload": { "week_start": "2026-06-08" }
}
```

**Execution call (🔧 → ✅):**

`POST /api/n8n/publishing-planner`

```json
{
  "project_id": "11111111-1111-1111-1111-111111111111",
  "week_start": "2026-06-08"
}
```

The backend reads `publishing_rules` + the week's `content_strategies` /
`content_strategy_items` / `content_packages`, computes publish times, and
writes only to `publishing_schedule`.

> **Known MVP limitation (documented, not fixed here):** the backend can create
> **duplicate `publishing_schedule` rows** when run repeatedly for the same week
> — it does not currently deduplicate. **n8n must not implement deduplication.**
> The only mitigation in scope is operational: **do not re-run the Publishing
> Planner workflow without a reason** (and never put it on an auto-retry loop).

**Error branch (🔧):** §5 with `workflow: "publishing_planner"`.

**Expected final status:** new `publishing_schedule` rows (status `scheduled`)
for each schedulable item.

---

## 12. Workflow 5 — Trend Scan

- **Workflow value:** `trend_scan`
- **Status:** bridge workflow 🔧 (all scoring logic in ✅ `/api/n8n/trend-scan`)

Trend Scan is the **last** workflow. n8n's only job is to obtain **raw trend
candidates / input trend data** and hand them to the backend. **Scoring and
relevance logic live entirely in the backend** — n8n must contain **no scoring
logic**.

**Verified flow:**

```
Webhook trigger
  → read-only `projects` lookup by project_id (acquisition fields only)
  → build deterministic search_query (no AI)
  → query Google News RSS with search_query → raw candidates
  → build candidates [{ source: "news", title, url? }]
  → POST /api/n8n/trend-scan   (backend scores + persists accepted trends)
  → (error branch → /api/n8n/error-callback)
```

**Acquisition keyword lookup (🔧, read-only guard):** before acquisition, n8n
performs a single **read-only** `projects` lookup scoped **only** by
`project_id`, reading just `language`, `market_scope`, `product_is`,
`pain_points`, and `target_audience`, and builds a deterministic `search_query`
from them. Its **sole** purpose is to build better
raw RSS / Google News search queries. This lookup **must not** write to
Supabase, read `trends`, score, rank, filter by relevance, or modify the Project
Brain. The backend still **re-loads the full Project Brain itself** for scoring
(below); n8n does **not** send the Project Brain to the backend — it sends
**only** `{ project_id, candidates }`.

**Trigger payload:**

```json
{
  "workflow": "trend_scan",
  "project_id": "11111111-1111-1111-1111-111111111111",
  "requested_at": "2026-06-04T11:10:00.000Z",
  "payload": {}
}
```

**Execution call (🔧 → ✅):**

`POST /api/n8n/trend-scan`

```json
{
  "project_id": "11111111-1111-1111-1111-111111111111",
  "candidates": [
    { "source": "news", "title": "AI agents for SMB marketing", "url": "https://…" }
  ]
}
```

The backend loads the Project Brain, scores each candidate with the existing AI
relevance scorer (`scoreTrendRelevance`, threshold `MIN_TREND_RELEVANCE = 60`),
persists only accepted trends to `trends` (score in `trends.metadata`), and
returns the rejected list in the response body only (rejected trends are **not**
stored). `candidates` must be an array → otherwise `400`. The execution route
persists accepted trends itself, so n8n does **not** call any trend-scan
callback endpoint.

**Candidate shape:** each candidate is `{ source, title, url? }` — `title` must
be non-empty, `url` is optional. **`source` must be one of the existing
`trend_source` enum values:** `manual`, `google_trends`, `social`, `news`,
`internal`. Google News acquisition uses `news`.

**n8n must not:** score, rank, filter by relevance, write to Supabase, or read
the `trends` table. Acquisition produces raw candidates only; scoring,
thresholding and persistence stay entirely in `/api/n8n/trend-scan`.

**Error branch (🔧):** §5 with `workflow: "trend_scan"`.

**Expected final status:** new `trends` rows for accepted, scorable candidates.

---

## 13. What must be built in n8n (🔧 summary)

For each of the 5 workflows, the bridge is at most:
1. A Webhook trigger node validating `x-n8n-secret == N8N_WEBHOOK_SECRET`.
2. A **minimal** Supabase read **only where the flow needs it** (Generate reads
   a `strategy_item_id`; Weekly Strategy reads an existence guard). No writes.
3. One HTTP Request node to the matching `/api/n8n/*` execution endpoint
   (`x-n8n-secret == N8N_CALLBACK_SECRET`), with full error visibility (§6).
4. For Generate (always) and Regenerate (only if the response has a
   `videoJobId`): an HTTP Request node to `/api/n8n/start-video-job`.
5. An Error Trigger branch that POSTs `/api/n8n/error-callback` with the **real**
   error message.
6. Status + response-body logging on every HTTP node.

The **Video Worker** is external (DigitalOcean/Docker) and calls
`/api/n8n/video-callback` itself; it is not orchestrated step-by-step by n8n.

---

## 14. Out of MVP scope (🚫 do not build now)

- CRM integration.
- An extra scheduler (cron/auto-trigger) layered on top of these workflows.
- A monitoring / health-check workflow.
- A dead letter queue.
- Any enterprise orchestration layer.
- BI / analytics dashboards; performance-tracking execution.
- **Per-project workflow duplication** — a new project reuses these exact 5
  workflows; only `project_id` changes.

---

## 15. Known runtime risk

The AI execution endpoints run as **Next.js / Vercel routes**, so their wall
time counts against the Vercel function timeout:

| Endpoint | Approx. runtime | Notes |
|----------|-----------------|-------|
| `/api/n8n/weekly-strategy` | often **60–90 s** (observed ~57 s); allow up to **~180 s** per Claude call | Route `maxDuration` **300 s**; Claude transport timeout **180 s** (weekly strategy only); HTTP **504** `ai_timeout` on Anthropic timeout |
| `/api/n8n/generate-content-package` | ~160 s | Default Claude transport timeout **60 s** |
| `/api/n8n/regenerate-content-package` | ~60 s | Default Claude transport timeout **60 s** |

On **Vercel Hobby** these can exceed the platform timeout, surfacing to n8n as a
non-2xx / timeout on the execution call.

- **Video / FFmpeg already runs off Vercel** on DigitalOcean / Docker (via
  `/api/n8n/start-video-job` → external Video Worker). It must **not** be moved
  back into Vercel.
- If a timeout occurs, the fix is **not** to add logic or async machinery into
  n8n. The correct resolution is to **move the long-running AI endpoints off
  Vercel** (same direction as the video worker), keeping n8n a thin bridge.

---

## 16. Quick reference — workflow ↔ execution endpoint ↔ tables

| Workflow | Trigger endpoint | n8n calls (execution) | Backend writes |
|----------|------------------|------------------------|----------------|
| `generate_content_package` | `/api/automation/generate-content-package` | `/api/n8n/generate-content-package` → `/api/n8n/start-video-job` | `content_packages`, `content_items`, `video_jobs`, `asset_usage` |
| `regenerate_content_package` | `/api/automation/regenerate-content-package` | `/api/n8n/regenerate-content-package` → (cond.) `/api/n8n/start-video-job` | `content_versions`, `content_items`, `content_packages`, `video_jobs` |
| `weekly_strategy` | `/api/automation/weekly-strategy` | input guard → `/api/n8n/weekly-strategy` | `content_strategies`, `content_strategy_items` |
| `publishing_planner` | `/api/automation/publishing-planner` | `/api/n8n/publishing-planner` | `publishing_schedule` (⚠ may duplicate on re-run) |
| `trend_scan` | `/api/automation/trend-scan` | `/api/n8n/trend-scan` | `trends` (accepted only) |
| _any failure_ | — | `/api/n8n/error-callback` | _(none — logged)_ |
| _video render done_ | — | `/api/n8n/video-callback` (called by Video Worker) | `video_jobs`, `content_packages.status` |
