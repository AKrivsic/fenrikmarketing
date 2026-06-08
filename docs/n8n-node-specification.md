# n8n Node Specification — AI Content Manager MVP

Node-by-node build specification for the **5 n8n workflows**, aligned with the
**QA-verified** code. It complements
[`docs/n8n-workflow-contract.md`](./n8n-workflow-contract.md) (the
payload/contract reference) by describing **how each thin bridge workflow is
wired in n8n**.

> Scope: specification only. No runtime code, no new modules, no new workflows.
> **n8n is pure orchestration** — every node below either triggers, reads a
> minimal guard, calls an existing `/api/n8n/*` endpoint, or reports an error.
> n8n does **no** AI, no scoring, no content/version/job creation, no slot
> planning. The reference export `n8n/generate-content-package-bridge.json`
> matches Workflow 1 below.

---

## Legend

- ✅ **Implemented in Vercel** — call it, do not rebuild.
- 🔧 **Build in n8n** — create this node.
- 🚫 **Out of scope** — do not add (CRM, scheduler, monitoring workflow, DLQ,
  enterprise orchestration, analytics, custom workflows).

Secrets / env (contract §2): the Webhook node authenticates incoming triggers
with `x-n8n-secret = N8N_WEBHOOK_SECRET`; every outbound call to a `/api/n8n/*`
endpoint authenticates with `x-n8n-secret = N8N_CALLBACK_SECRET`. The minimal
Supabase guard reads use `SUPABASE_SERVICE_ROLE_KEY` and **must** be scoped by
`project_id`.

---

## 0. Node-type catalog (only 5 types used)

Bridge workflows are intentionally thin. The whole node vocabulary is:

| # | Node type | Only purpose in this project |
|---|-----------|------------------------------|
| 1 | **Webhook Trigger** | Receive the unified envelope from a Vercel `/api/automation/*` trigger; authenticate. |
| 2 | **Supabase node** | **Minimal read-only guard** only where needed (Generate: pick `strategy_item_id`; Weekly Strategy: existence check; Trend Scan: read a few `projects` fields by `project_id` for the acquisition keyword set). Never writes; never reads `trends`. |
| 3 | **HTTP Request node** | Call one `/api/n8n/*` execution endpoint; optionally `/api/n8n/start-video-job`. |
| 4 | **IF node** | The few unavoidable branches (video needed? input data exists?). |
| 5 | **Error Trigger + HTTP** | POST `/api/n8n/error-callback` with the real error. |

There are deliberately **no** AI nodes, no Merge/Function transformation of
business data, no Wait node and no Video-Worker node in n8n — the backend owns
that work.

### Default retry profile (per node type)

| Node type | Retry on failure | Notes |
|-----------|------------------|-------|
| Webhook Trigger | n/a | Reject `401` immediately if `N8N_WEBHOOK_SECRET` mismatches. |
| Supabase guard read | up to 3 | Retry on network/`5xx` only. |
| HTTP → execution endpoint | up to 3 (~2s) | Retry on network/`5xx`/timeout only. **Never** retry `400`/`404`/`422`; `401` = stop+alert. |
| HTTP → start-video-job | up to 3 (~2s) | As above. |
| IF | 0 | Pure logic; route failures to the error branch. |
| Error HTTP (error-callback) | up to 5 (exp) | Retry on network/`5xx`. |

### Error visibility rule (mandatory — contract §6)

Every HTTP node keeps full response logging on and must expose, for debugging:
**endpoint, payload, HTTP status, response body**. The real upstream error is
forwarded verbatim into `error-callback` — never masked behind a generic
message.

### Global error handling rule

Each workflow has a single **Error Trigger** branch that builds and POSTs
`/api/n8n/error-callback` (contract §5) and then stops. No partial retries past
the per-node policy.

---

## 1. Generate Content Package

**Workflow value:** `generate_content_package`
**Node count:** 1 Webhook, 1 Supabase (guard read), 2 HTTP (execution +
start-video-job), 1 Error Trigger + 1 Error HTTP.
**Reference export:** `n8n/generate-content-package-bridge.json`.

### Node-by-node

#### N1 — Webhook Trigger 🔧
- **Purpose:** Receive the Vercel envelope and authenticate.
- **Input:** POST body `{ workflow, project_id, requested_at, payload:{funnel_stage?} }`; header `x-n8n-secret`.
- **Auth:** header auth = `N8N_WEBHOOK_SECRET`. Mismatch → `401`, stop.
- **Output:** envelope JSON (read as `$json.body.*`).

#### N2 — Supabase node (minimal guard read) 🔧
- **Name:** `Read strategy item`
- **Purpose:** Get **one** `strategy_item_id` to pass to the backend. Read-only.
- **Input:** `getAll` on `content_strategy_items`, `limit 1`, filter
  `project_id=eq.{{project_id}}` (+ optional `funnel_stage=eq.{{payload.funnel_stage}}`).
- **Output:** `{ id }` used as `strategy_item_id`.
- **Retry:** up to 3 on network/5xx.
- **Note:** This is the only Supabase touch; it does **not** decide strategy.

#### N3 — HTTP Request (execution endpoint) 🔧 → ✅
- **Name:** `Generate Content Package`
- **Endpoint:** `POST https://<app>/api/n8n/generate-content-package`
- **Auth:** header `x-n8n-secret = N8N_CALLBACK_SECRET`.
- **Payload:** `{ "project_id": <body.project_id>, "strategy_item_id": <N2.id> }`.
- **Backend does (not n8n):** AI copy + video script, then inserts
  `content_packages` (draft), `content_items`, `video_jobs` (queued),
  `asset_usage`.
- **Output:** `{ ok:true, data:{ packageId, videoJobId, contentItemIds, … } }`.
- **Retry:** up to 3 on network/5xx/timeout. `400`/`404`/`422` → error branch.
- **Error visibility:** log endpoint, payload, status, response body.

#### N4 — HTTP Request (start video job) 🔧 → ✅
- **Name:** `Start Video Job`
- **Endpoint:** `POST https://<app>/api/n8n/start-video-job`
- **Auth:** `x-n8n-secret = N8N_CALLBACK_SECRET`.
- **Payload:** `{ "project_id": <body.project_id>, "content_package_id": <N3.data.packageId>, "video_job_id": <N3.data.videoJobId> }`.
- **Backend does:** hands the existing `video_jobs` row to the external Video
  Worker (DigitalOcean/Docker) and marks it `processing`. The Worker later calls
  `/api/n8n/video-callback` itself — **n8n does not wait for the render**.
- **Retry:** up to 3.

#### Error branch 🔧
- **Error Trigger** → **HTTP** `POST /api/n8n/error-callback` with
  `{ workflow:"generate_content_package", step:<lastNodeExecuted>, error_type:"workflow_error", error_message:<real message>, project_id }`.

**Expected final status:** `content_packages.status = 'draft'`;
`video_jobs.status` `queued → processing → completed` (Worker callback).

---

## 2. Regenerate Content Package

**Workflow value:** `regenerate_content_package`
**Node count:** 1 Webhook, 1 HTTP (execution), 1 IF (videoJobId?), 1 HTTP
(start-video-job), 1 Error Trigger + 1 Error HTTP. **No Supabase guard needed.**

### Node-by-node

#### N1 — Webhook Trigger 🔧
- **Input:** envelope `payload:{ content_package_id, reason? }`. Auth as W1 N1.

#### N2 — HTTP Request (execution endpoint) 🔧 → ✅
- **Name:** `Regenerate Content Package`
- **Endpoint:** `POST https://<app>/api/n8n/regenerate-content-package`
- **Auth:** `x-n8n-secret = N8N_CALLBACK_SECRET`.
- **Payload:** `{ "project_id": <body.project_id>, "content_package_id": <body.payload.content_package_id>, "reason": <body.payload.reason?> }`.
- **Backend does (not n8n):** snapshot into `content_versions`, update
  `content_items` in place, reset package to `draft`, insert a new `video_jobs`
  row (queued).
- **Output:** `{ ok:true, data:{ packageId, videoJobId, versionsCreated, … } }`.
- **Retry / error visibility:** as W1 N3.

#### N3 — IF node (new video?) 🔧
- **Name:** `IF: response has videoJobId?`
- **Condition:** `N2.data.videoJobId` is present/non-empty.
- **Output:** true → N4; false → finish.

#### N4 — HTTP Request (start video job) 🔧 → ✅
- Identical to Workflow 1 N4, using `N2.data.packageId` /
  `N2.data.videoJobId`.

#### Error branch 🔧
- `workflow:"regenerate_content_package"`.

**Expected final status:** `content_packages.status = 'draft'`; prior state in
`content_versions`; new video renders via the Worker when `videoJobId` returned.

---

## 3. Weekly Strategy

**Workflow value:** `weekly_strategy`
**Node count:** 1 Webhook, 1–2 Supabase (input guard read), 1 IF (any input
data?), 1 HTTP (execution), 1 Error Trigger + 1 Error HTTP.

### Node-by-node

#### N1 — Webhook Trigger 🔧
- **Input:** envelope `payload:{ week_start }` (`YYYY-MM-DD`).

#### N2 — Supabase node (input guard read) 🔧
- **Name:** `Guard: input data exists?`
- **Purpose:** Read-only existence check — does the project have **at least**
  `evergreen_topics` **OR** eligible `trends`
  (`metadata->>relevance_score >= 60`)? Can be one node per source.
- **Input:** scoped selects by `project_id`, `limit 1` each.
- **Output:** counts/flags `has_topics`, `has_eligible_trends`.
- **Retry:** up to 3.
- **Note:** This is **not** scoring or strategy — only existence.

#### N3 — IF node (any input data?) 🔧
- **Name:** `IF: has evergreen_topics OR eligible trends?`
- **Output:**
  - **false (nothing exists)** → end the run as **`NO_INPUT_DATA`**: do **not**
    call the backend/AI, do **not** retry/loop. (Optionally POST
    `error-callback` with `error_type:"no_input_data"` for visibility, then
    stop.)
  - **true** → N4.

#### N4 — HTTP Request (execution endpoint) 🔧 → ✅
- **Name:** `Weekly Strategy`
- **Endpoint:** `POST https://<app>/api/n8n/weekly-strategy`
- **Auth:** `x-n8n-secret = N8N_CALLBACK_SECRET`.
- **Payload:** `{ "project_id": <body.project_id>, "week_start": <body.payload.week_start> }`.
- **Backend does (not n8n):** validate `week_start`, derive `week_end`, run the
  AI strategy, persist `content_strategies` + `content_strategy_items`.
- **Retry / error visibility:** as W1 N3 (`400` on bad `week_start`).

#### Error branch 🔧
- `workflow:"weekly_strategy"`.

**Expected final status:** 1 `content_strategies` + N `content_strategy_items`,
**or** a clean `NO_INPUT_DATA` termination with no backend call.

---

## 4. Publishing Planner

**Workflow value:** `publishing_planner`
**Node count:** 1 Webhook, 1 HTTP (execution), 1 Error Trigger + 1 Error HTTP.
**No Supabase, no AI, no IF.**

### Node-by-node

#### N1 — Webhook Trigger 🔧
- **Input:** envelope `payload:{ week_start }`.

#### N2 — HTTP Request (execution endpoint) 🔧 → ✅
- **Name:** `Publishing Planner`
- **Endpoint:** `POST https://<app>/api/n8n/publishing-planner`
- **Auth:** `x-n8n-secret = N8N_CALLBACK_SECRET`.
- **Payload:** `{ "project_id": <body.project_id>, "week_start": <body.payload.week_start> }`.
- **Backend does (not n8n):** read `publishing_rules` + the week's strategies /
  strategy items / packages, compute publish times, write `publishing_schedule`.
- **Retry / error visibility:** as W1 N3.
- **⚠ Known MVP limitation:** the backend **can create duplicate
  `publishing_schedule` rows** on repeated runs for the same week. **n8n must
  not add deduplication.** Operational mitigation only: **do not re-run this
  workflow without a reason**, and never auto-retry it on success/ambiguity.

#### Error branch 🔧
- `workflow:"publishing_planner"`.

**Expected final status:** new `publishing_schedule` rows (status `scheduled`).

---

## 5. Trend Scan

**Workflow value:** `trend_scan`
**Node count:** 1 Webhook, 1 Supabase (read-only acquisition guard read),
(raw candidate acquisition), 1 HTTP (execution), 1 Error Trigger + 1 Error HTTP.
**No scoring node.**

Trend Scan is the **last** workflow. n8n only obtains **raw trend candidates /
input trend data** and forwards them. **All scoring & relevance logic is in the
backend** — n8n contains **no scoring logic**.

### Node-by-node

#### N1 — Webhook Trigger 🔧
- **Input:** envelope `payload:{}` (only `project_id`).

#### N2 — Supabase node (read-only acquisition guard read) 🔧
- **Purpose:** read a few `projects` fields **only** to build better Google News
  RSS keyword queries (acquisition quality). This is **not** scoring and **not**
  the Project Brain the backend uses — the backend re-loads the full Project
  Brain itself for scoring (see N4).
- **Operation:** read-only `getAll` on `projects`, `limit 1`, scoped **only** by
  `project_id` (`id=eq.<body.project_id>`). Auth: `SUPABASE_SERVICE_ROLE_KEY`.
- **Select only:** `language`, `market_scope`, `product_is`, `pain_points`,
  `target_audience`. No other column is read.
- **Must NOT:** write to Supabase, read `trends`, score, rank, filter by
  relevance, or modify the Project Brain.
- **Retry:** up to 3 on network/`5xx` only.

#### N3 — (keyword set + raw candidates) 🔧
- Build a simple keyword set from N2 (`product_is` + `pain_points`, optionally
  `market_scope`/`language`/`target_audience`) using **deterministic rules — no
  AI, no LLM**. Use it to query **Google News RSS** for raw candidates.
- Each candidate is normalized to a plain object `{ source, title, url? }` with
  `source: "news"`. `title` must be non-empty; `url` is optional.
- No scoring, no ranking, no relevance decisions happen here. Keyword generation
  only improves acquisition coverage — it never decides relevance.

#### N4 — HTTP Request (execution endpoint) 🔧 → ✅
- **Name:** `Trend Scan`
- **Endpoint:** `POST https://<app>/api/n8n/trend-scan`
- **Auth:** `x-n8n-secret = N8N_CALLBACK_SECRET`.
- **Payload:** `{ "project_id": <body.project_id>, "candidates": [ { "source", "title", "url?" } ] }`.
  n8n sends **only** `{ project_id, candidates }` — it never sends the Project
  Brain (the backend re-loads it).
- **Backend does (not n8n):** load Project Brain, score each candidate with the
  existing relevance scorer, persist **accepted** trends to `trends` (score in
  `metadata`); rejected trends are returned in the body but **not stored**. The
  execution route persists accepted trends itself, so n8n does **not** call any
  trend-scan callback endpoint.
- **Retry / error visibility:** as W1 N3 (`400` if `candidates` is not an array).

#### Error branch 🔧
- `workflow:"trend_scan"`.

**Expected final status:** new `trends` rows for accepted, scorable candidates.

**Allowed `source` values (existing `trend_source` enum):** `manual`,
`google_trends`, `social`, `news`, `internal`. Google News acquisition uses
`news`.

---

## 6. Bridge orchestration sequence (all workflows)

```
Webhook trigger (auth: N8N_WEBHOOK_SECRET)
  → [minimal Supabase guard/read — Generate, Weekly Strategy & Trend Scan
     (Trend Scan: read-only `projects` lookup for the acquisition keyword set)]
  → [IF guard — only Weekly Strategy (NO_INPUT_DATA) / Regenerate (videoJobId?)]
  → HTTP POST /api/n8n/<workflow>            (auth: N8N_CALLBACK_SECRET)
       → backend runs ALL business logic and persists
  → [HTTP POST /api/n8n/start-video-job]     (Generate always; Regenerate if videoJobId)
  → log status + response body
  → on failure → Error Trigger → POST /api/n8n/error-callback (real error)
```

Key rule: n8n passes `project_id` and ids through; it never generates,
scores, plans, or writes domain rows. A new project changes nothing in n8n.

---

## 7. Video handling (outside n8n)

n8n does **not** render, enqueue-and-wait, or poll video. The only
video-related node is `start-video-job` (Generate always; Regenerate when the
regenerate response contains a `videoJobId`):

```
HTTP POST /api/n8n/start-video-job { project_id, content_package_id, video_job_id }
   → backend hands the existing video_jobs row to the external Video Worker
     (DigitalOcean / Docker) and marks it 'processing'
   → Video Worker renders asynchronously and calls /api/n8n/video-callback ITSELF
   → on 'completed', the callback sets content_packages.status = 'draft'
```

`package_status` has **no** `failed` value, so a failed video does not change
the package status. The video/FFmpeg stack stays off Vercel and must not be
moved back in (see contract §15).

---

## 8. Endpoint reference per workflow

| Workflow | n8n guard read | n8n calls (execution) | Conditional follow-up |
|----------|----------------|------------------------|------------------------|
| generate_content_package | `content_strategy_items` (pick `strategy_item_id`) | `/api/n8n/generate-content-package` | `/api/n8n/start-video-job` (always) |
| regenerate_content_package | — | `/api/n8n/regenerate-content-package` | `/api/n8n/start-video-job` (if `videoJobId`) |
| weekly_strategy | `evergreen_topics` OR eligible `trends` (existence) | `/api/n8n/weekly-strategy` | — |
| publishing_planner | — | `/api/n8n/publishing-planner` | — |
| trend_scan | `projects` (read-only, by `project_id`; acquisition keyword set only — never `trends`) | `/api/n8n/trend-scan` | — |
| _any failure_ | — | `/api/n8n/error-callback` | — |

---

## 9. Retry sequence (decision order)

```
Node fails
  → IF node?                  → no retry → error branch
  → Supabase guard read?      → retry up to 3 (network/5xx) → else error branch
  → HTTP to /api/n8n/*?
        400 / 404 / 422       → no retry → error branch (input/logic bug)
        401                   → stop + alert (secret misconfig)
        5xx / network / timeout → retry up to 3 → else error branch
  → error-callback POST       → retry up to 5 (exp) on network/5xx
```

Backend calls carry `project_id` + row ids and are safe to retry, **except**
the Publishing Planner duplicate-row limitation (contract §11): do not retry it
just to "make sure".

---

## 10. Out of scope (🚫)

Not part of these workflows or this spec: CRM, an extra scheduler /
auto-triggering, a monitoring/health workflow, a dead letter queue, any
enterprise orchestration layer, analytics & performance-tracking execution,
custom/no-code workflow builders, and any new workflow beyond the 5 above. A new
project must run on these exact 5 thin bridge workflows with only `project_id`
changing.
