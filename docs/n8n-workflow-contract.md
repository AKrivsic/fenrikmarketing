# n8n Workflow Contract — AI Content Manager MVP

This document is the single source of truth for building the **5 required n8n
workflows**. It is written so a workflow can be created in n8n **without guessing**:
every trigger payload, Supabase table, callback URL and payload shape below
matches the code already implemented in the Vercel app.

> Scope of this document: **contract only**. No workflow is implemented in code
> here, no AI API is called, no Video Worker is called, the database is not
> changed.

---

## Legend

- ✅ **Implemented in Vercel** — already exists in this repository, do not rebuild.
- 🔧 **Build in n8n** — must be created manually / by import in n8n.
- 🚫 **Out of MVP scope** — do not build now.

---

## 1. Architecture principles (must hold for every workflow)

1. **n8n orchestrates, it does not hardcode business logic.** All
   project-specific data (tone, audience, goals, forbidden claims, platforms,
   publishing rules) is **read at runtime** from Supabase — the "Project Brain".
2. **Project Brain is not a separate table.** It is the `projects` row plus the
   related `assets`, `evergreen_topics` and `trends` for that `project_id`.
3. **One workflow set for all projects.** There is **no per-project workflow**.
   A new project must work with the existing 5 workflows with **zero n8n
   changes** — the only variable is `project_id`.
4. **Unified webhook envelope** for every trigger (Vercel → n8n):

```json
{
  "workflow": "generate_content_package",
  "project_id": "uuid",
  "requested_at": "2026-06-04T11:00:00.000Z",
  "payload": {}
}
```

5. **Unified callbacks** (n8n → Vercel) use the existing endpoints listed below.
6. **Idempotency:** callbacks carry the row id (`content_package_id`,
   `video_job_id`) so retries never create duplicates.

---

## 2. Authentication & environment

| Direction | Header | Secret (env) | Validated by |
|-----------|--------|--------------|--------------|
| Vercel → n8n (trigger) | `x-n8n-secret` | `N8N_WEBHOOK_SECRET` | 🔧 n8n workflow (first node) |
| n8n → Vercel (callback) | `x-n8n-secret` | `N8N_CALLBACK_SECRET` | ✅ Vercel callback routes |

> The header name is identical in both directions, but the **secret value and
> direction differ**. n8n must send `N8N_CALLBACK_SECRET` on callbacks and must
> require `N8N_WEBHOOK_SECRET` on incoming triggers.

| Variable | Used by | Notes |
|----------|---------|-------|
| `N8N_BASE_URL` | ✅ Vercel trigger endpoints | Outbound webhook target (where n8n listens). |
| `N8N_WEBHOOK_SECRET` | ✅ Vercel → 🔧 n8n | Sent in `x-n8n-secret` on triggers. |
| `N8N_CALLBACK_SECRET` | 🔧 n8n → ✅ Vercel | Sent in `x-n8n-secret` on callbacks. |
| `NEXT_PUBLIC_SUPABASE_URL` | both | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔧 n8n Supabase nodes | Service role for server-side reads/writes (bypasses RLS — scope every query by `project_id`). |

---

## 3. Vercel endpoints already implemented (✅)

### Trigger endpoints (Vercel → n8n)

| Endpoint | Workflow value | Extra `payload` fields |
|----------|----------------|------------------------|
| `POST /api/automation/generate-content-package` | `generate_content_package` | `package_count?`, `funnel_stage?` |
| `POST /api/automation/regenerate-content-package` | `regenerate_content_package` | `content_package_id`, `reason?` |
| `POST /api/automation/trend-scan` | `trend_scan` | — |
| `POST /api/automation/weekly-strategy` | `weekly_strategy` | `week_start` |
| `POST /api/automation/publishing-planner` | `publishing_planner` | `week_start` |

All trigger endpoints: validate the request, verify the project exists, send the
unified envelope to `N8N_BASE_URL`, and return **`202 Accepted`**:

```json
{ "ok": true, "workflow": "generate_content_package", "status": "queued" }
```

Trigger error codes: `400` validation, `404` project/package not found,
`500` n8n communication / missing env.

### Callback endpoints (n8n → Vercel)

| Endpoint | Writes to |
|----------|-----------|
| `POST /api/n8n/content-package-callback` | `content_packages` |
| `POST /api/n8n/video-callback` | `video_jobs` (+ `content_packages.status`) |
| `POST /api/n8n/trend-scan-callback` | `trends` |
| `POST /api/n8n/weekly-strategy-callback` | `content_strategies`, `content_strategy_items` |
| `POST /api/n8n/publishing-plan-callback` | `publishing_schedule` |
| `POST /api/n8n/error-callback` | nothing (structured server log only) |

Callback response codes (✅ implemented): `200` ok, `401` bad/missing secret,
`400` invalid JSON / invalid payload, `500` server/DB error. Success body:

```json
{ "ok": true }
```

> **Important — callbacks are UPDATE-oriented.** `content-package-callback` and
> `video-callback` **update existing rows** (they look the row up by id +
> `project_id`). Therefore n8n must **INSERT the skeleton rows first** (see each
> workflow) using the existing tables. The insert/finalize split is intentional.

---

## 4. Tables in scope (real schema)

Use **only** these tables (confirmed in `supabase/migrations` and the code):

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

On any terminal failure, after retries are exhausted, n8n 🔧 must POST:

`POST /api/n8n/error-callback`

```json
{
  "project_id": "uuid (optional)",
  "content_package_id": "uuid (optional)",
  "workflow": "generate_content_package",
  "step": "ai_generation (optional)",
  "error_type": "ai_timeout",
  "error_message": "Model call timed out after 3 retries"
}
```

Required fields: `workflow`, `error_type`, `error_message`. The endpoint **does
not persist** this (no error table exists); it logs a structured line and returns
`200`. There is **no package "failed" status**, so a failed run does not change
`content_packages.status`.

---

## 6. Generic retry rules (apply unless a workflow overrides)

| Step | Retry policy |
|------|--------------|
| Supabase read/write (n8n node) | 2 retries, 1s → 3s backoff, on network / 5xx only. |
| AI provider call | 3 retries, exponential backoff (2s, 4s, 8s), on `429` / `5xx` / timeout. |
| Video Worker call | 2 retries to enqueue; rendering itself is async (await its own callback). |
| Callback POST → Vercel | up to 5 retries, exponential backoff, on **network / 5xx only**. |
| Callback `400`/`422` | **Do not retry** — payload bug. POST `error-callback` instead. |
| Callback `401` | **Stop** — secret misconfigured. Alert; do not loop. |

Because callbacks are idempotent (row id in payload), retries are safe.

---

## 7. Workflow 1 — Generate Content Package

- **Workflow value:** `generate_content_package`
- **Status:** workflow itself 🔧 (Vercel trigger + callbacks ✅)

**Purpose:** Produce a review-ready content package for a project: a
`content_packages` row, its per-platform `content_items`, and a queued
`video_jobs` row, with AI-generated copy and a video script.

**Trigger payload (Vercel → n8n):**

```json
{
  "workflow": "generate_content_package",
  "project_id": "11111111-1111-1111-1111-111111111111",
  "requested_at": "2026-06-04T11:00:00.000Z",
  "payload": { "package_count": 1, "funnel_stage": "awareness" }
}
```

**Required input fields:** `project_id`. Optional: `payload.package_count`
(default 1), `payload.funnel_stage`.

**Supabase read steps (🔧):**
1. `projects` where `id = project_id` → Project Brain (tone, audience, goal_type,
   product_is / product_is_not, forbidden_claims, platforms, default_cta).
2. `content_strategy_items` (+ parent `content_strategies`) where `project_id` →
   pick the strategy item / funnel stage to realize (optional driver).
3. `evergreen_topics` where `project_id` → reusable angles.
4. `trends` where `project_id` and `metadata.relevance_score >= 60` → topical hooks.
5. `assets` where `project_id` → assets eligible for reuse.

**AI API steps (🔧):** call the text model with the Project Brain context to
produce: package `title`, `platform_outputs` (one entry per target platform with
caption / hashtags / cta), `voiceover_text`, `subtitles`, and a `video` concept +
script. Apply guardrails (no `forbidden_claims`, platforms ⊆ project platforms).

**Skeleton inserts (🔧 Supabase, before callbacks):**
- Insert `content_packages` (`project_id`, `title`, `status='draft'`,
  `strategy_item_id?`, `weekly_strategy_id?`, `funnel_stage?`,
  `package_brief={}`) → capture `content_package_id`.
- Insert `content_items` (one per platform: `project_id`, `package_id`,
  `platform`, `format`, `status='draft'`, `caption`, `hashtags`, `cta`).
- Insert `video_jobs` (`project_id`, `content_item_id` = primary item,
  `provider`, `status='queued'`, `input` = {concept, script, voiceover_text}).
- Optionally insert `asset_usage` for reused assets.

**Video Worker steps (🔧):** send the script/voiceover to the Video Worker
referencing `video_job_id`. The Worker renders asynchronously and triggers the
**video-callback** (Workflow 2's callback) when done.

**Callback endpoint:** `POST /api/n8n/content-package-callback`

**Callback payload:**

```json
{
  "project_id": "11111111-1111-1111-1111-111111111111",
  "content_package_id": "22222222-2222-2222-2222-222222222222",
  "status": "ready",
  "platform_outputs": {
    "instagram": { "caption": "…", "hashtags": ["#…"], "cta": "…" },
    "linkedin":  { "caption": "…", "hashtags": ["#…"], "cta": "…" }
  },
  "message": "Generated 2 platform outputs"
}
```

> Handler behavior (✅): `status` must be a `package_status` value;
> `platform_outputs` is stored inside the existing `package_brief` jsonb (there
> is no `platform_outputs` column and no separate table); `updated_at` is set.

**Error callback payload:** see §5 with `workflow: "generate_content_package"`,
e.g. `error_type: "ai_generation_failed"`.

**Retry rules:** generic (§6). Use the inserted `content_package_id` on every
callback so retries are idempotent.

**Expected final status:**
- `content_packages.status = 'draft'` once the video completes — **the
  video-callback forces the package back to `draft` (review-ready) on
  `completed`**, regardless of the `ready` sent here.
- `video_jobs.status = 'completed'` after the Video Worker callback.

---

## 8. Workflow 2 — Regenerate Content Package

- **Workflow value:** `regenerate_content_package`
- **Status:** workflow itself 🔧 (Vercel trigger + callbacks ✅)

**Purpose:** Re-create the copy (and optionally the video) of an existing
content package, preserving history.

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

**Required input fields:** `project_id`, `payload.content_package_id`. Optional:
`payload.reason`.

> The Vercel trigger verifies the package belongs to the project and **does not**
> change its status: `package_status` has no `regenerate_requested` value.

**Supabase read steps (🔧):**
1. `projects` where `id = project_id` → Project Brain.
2. `content_packages` where `id = content_package_id AND project_id` → current package.
3. `content_items` where `package_id = content_package_id` → current items.
4. `assets` / `asset_usage` where `project_id` → reuse context.

**History (🔧, existing table):** before overwriting, insert a snapshot into
`content_versions` (`project_id`, `content_package_id` and/or `content_item_id`,
`version_no`, `snapshot` = current jsonb, `change_note` = reason).

**AI API steps (🔧):** regenerate `platform_outputs` / item copy using the
Project Brain + `reason`. Same guardrails as Workflow 1.

**Updates (🔧 Supabase):** update the existing `content_items` rows in place
(scoped by `project_id`). If a new video is required, insert a new `video_jobs`
row and run the Video Worker → video-callback.

**Callback endpoint:** `POST /api/n8n/content-package-callback`

**Callback payload:** same shape as Workflow 1 (reuses the existing
`content_package_id`):

```json
{
  "project_id": "11111111-1111-1111-1111-111111111111",
  "content_package_id": "22222222-2222-2222-2222-222222222222",
  "status": "ready",
  "platform_outputs": { "instagram": { "caption": "…" } },
  "message": "Regenerated after: Tone too formal"
}
```

**Error callback payload:** §5 with `workflow: "regenerate_content_package"`.

**Retry rules:** generic (§6).

**Expected final status:** `content_packages.status = 'draft'` (review-ready);
prior state preserved in `content_versions`; new `video_jobs.status = 'completed'`
if a video was regenerated.

---

## 9. Workflow 3 — Trend Scan

- **Workflow value:** `trend_scan`
- **Status:** workflow itself 🔧 (Vercel trigger + callback ✅)

**Purpose:** Discover and score trends for a project and persist the relevant
ones.

**Trigger payload:**

```json
{
  "workflow": "trend_scan",
  "project_id": "11111111-1111-1111-1111-111111111111",
  "requested_at": "2026-06-04T11:10:00.000Z",
  "payload": {}
}
```

**Required input fields:** `project_id` only.

**Supabase read steps (🔧):**
1. `projects` where `id = project_id` → Project Brain (market, audience, goal).
2. `trends` where `project_id` → existing trends for de-duplication.
3. `evergreen_topics` where `project_id` → known pillars to align with.

**AI API steps (🔧):** discover candidate trends (external sources are the
workflow's concern) and **score relevance** (0–100). Trends with
`relevance_score` below threshold go to `rejected_trends`.

**Video Worker steps:** none.

**Callback endpoint:** `POST /api/n8n/trend-scan-callback`

**Callback payload:**

```json
{
  "project_id": "11111111-1111-1111-1111-111111111111",
  "accepted_trends": [
    {
      "title": "AI agents for SMB marketing",
      "relevance_score": 82,
      "source": "news",
      "source_url": "https://…",
      "signal_strength": 7,
      "rationale": "Matches lead_generation goal",
      "angle": "How SMBs cut content cost"
    }
  ],
  "rejected_trends": []
}
```

> Handler behavior (✅): each accepted trend **must** have `relevance_score`
> (number) and `title` (else it is skipped — `title` is NOT NULL).
> `relevance_score` is stored in the `trends.metadata` jsonb (no
> `relevance_score` column). `source` must be a `trend_source` value (defaults to
> `internal`); `signal_strength` is used only if it is 1–10.
> **`rejected_trends` are intentionally NOT stored** (no log table exists).

**Error callback payload:** §5 with `workflow: "trend_scan"`.

**Retry rules:** generic (§6).

**Expected final status:** new rows in `trends` for every accepted, scorable
trend; rejected trends discarded.

---

## 10. Workflow 4 — Weekly Strategy

- **Workflow value:** `weekly_strategy`
- **Status:** workflow itself 🔧 (Vercel trigger + callback ✅)

**Purpose:** Produce a weekly content strategy (a `content_strategies` header
plus `content_strategy_items`) for the requested week.

**Trigger payload:**

```json
{
  "workflow": "weekly_strategy",
  "project_id": "11111111-1111-1111-1111-111111111111",
  "requested_at": "2026-06-04T11:15:00.000Z",
  "payload": { "week_start": "2026-06-08" }
}
```

**Required input fields:** `project_id`, `payload.week_start` (`YYYY-MM-DD`,
validated by the Vercel trigger).

**Supabase read steps (🔧):**
1. `projects` where `id = project_id` → Project Brain (goal_type → strategy objective).
2. `trends` where `project_id` and `metadata.relevance_score >= 60` → eligible trends.
3. `evergreen_topics` where `project_id` → evergreen pillars.

**AI API steps (🔧):** build the weekly theme and a `content_plan` of items
(platform + format + funnel stage + topic/trend reference) within the Project
Brain constraints.

**Video Worker steps:** none.

**Callback endpoint:** `POST /api/n8n/weekly-strategy-callback`

**Callback payload:**

```json
{
  "project_id": "11111111-1111-1111-1111-111111111111",
  "week_start": "2026-06-08",
  "strategy": {
    "theme": "Launch week",
    "objective": "lead_generation",
    "week_end": "2026-06-14",
    "items": [
      { "platform": "instagram", "format": "reel", "priority": 1, "topic": "…" },
      { "platform": "linkedin",  "format": "article", "priority": 2, "topic": "…" }
    ]
  }
}
```

> Handler behavior (✅): inserts `content_strategies` (`name` = `strategy.theme`
> or `Weekly {week_start}`; `objective` = valid `goal_type` from
> `strategy.objective`, else falls back to the project's `goal_type`;
> `period_start` = `week_start`; `period_end` = `strategy.week_end`;
> `strategy_brief` = the whole `strategy`). Then inserts `content_strategy_items`
> for each item that has **both** a valid `platform` and `format` (others are
> skipped); `priority` is used only if 1–5. The full item is stored in `brief`.

**Error callback payload:** §5 with `workflow: "weekly_strategy"`.

**Retry rules:** generic (§6).

**Expected final status:** one new `content_strategies` row + N
`content_strategy_items` rows for the week.

---

## 11. Workflow 5 — Publishing Planner

- **Workflow value:** `publishing_planner`
- **Status:** workflow itself 🔧 (Vercel trigger + callback ✅)

**Purpose:** Turn ready content into scheduled publishing slots
(`publishing_schedule`) for the week.

**Trigger payload:**

```json
{
  "workflow": "publishing_planner",
  "project_id": "11111111-1111-1111-1111-111111111111",
  "requested_at": "2026-06-04T11:20:00.000Z",
  "payload": { "week_start": "2026-06-08" }
}
```

**Required input fields:** `project_id`, `payload.week_start` (`YYYY-MM-DD`).

**Supabase read steps (🔧):**
1. `projects` where `id = project_id` → `publishing_rules`, `platforms`.
2. `content_packages` where `project_id` and `status in ('ready','approved')` →
   packages eligible to schedule.
3. `content_items` where `package_id in (…)` and `project_id` → platform items
   that will be published.

**AI API steps:** none required (scheduling is rule-based from
`projects.publishing_rules`). AI is optional and out of the core contract.

**Video Worker steps:** none.

**Callback endpoint:** `POST /api/n8n/publishing-plan-callback`

**Callback payload:**

```json
{
  "project_id": "11111111-1111-1111-1111-111111111111",
  "week_start": "2026-06-08",
  "items": [
    {
      "content_package_id": "22222222-2222-2222-2222-222222222222",
      "platform": "instagram",
      "publish_at": "2026-06-09T09:00:00.000Z"
    }
  ]
}
```

> Handler behavior (✅): each item is verified to belong to the project, then the
> matching `content_items.id` is resolved by `package_id` + `project_id` +
> `platform` (because `publishing_schedule.content_item_id` is NOT NULL — there
> is **no** `content_package_id` column on `publishing_schedule`). It inserts
> `publishing_schedule` (`scheduled_at` = `publish_at`, `status` defaults to
> `scheduled`, `publishing_metadata` keeps the source `content_package_id`).
> Items with no matching content item for that platform are skipped.

**Error callback payload:** §5 with `workflow: "publishing_planner"`.

**Retry rules:** generic (§6).

**Expected final status:** new `publishing_schedule` rows (status `scheduled`)
for each schedulable item.

---

## 12. What must be built in n8n (🔧 summary)

For each of the 5 workflows:
1. A webhook trigger node that validates `x-n8n-secret == N8N_WEBHOOK_SECRET`.
2. Supabase read nodes (Project Brain + workflow-specific tables), scoped by `project_id`.
3. Skeleton Supabase inserts where required (Workflow 1; Workflow 2 updates).
4. AI provider node(s) where the workflow needs generation/scoring.
5. Video Worker call where the workflow needs video (Workflows 1 & 2).
6. Callback HTTP node(s) to the matching `/api/n8n/*` endpoint with
   `x-n8n-secret == N8N_CALLBACK_SECRET`.
7. An error branch that POSTs `/api/n8n/error-callback`.
8. Retry configuration per §6.

The **Video Worker** itself is an external renderer: this contract defines only
the `video_jobs` row shape and the `video-callback` payload it must trigger; the
Worker's internals are not built here.

---

## 13. Out of MVP scope (🚫 do not build now)

- CRM integration.
- BI / analytics dashboards.
- Scheduler integration (cron/auto-trigger of the trigger endpoints).
- Performance tracking **execution** (`content_performance` exists in schema but
  is not populated by these workflows in MVP).
- Custom workflow builder / no-code editor.
- **Per-project workflow duplication** — a new project must reuse these exact 5
  workflows.

---

## 14. Quick reference — workflow ↔ callback ↔ tables

| Workflow | Trigger endpoint | Callback endpoint | Tables written |
|----------|------------------|-------------------|----------------|
| `generate_content_package` | `/api/automation/generate-content-package` | `/api/n8n/content-package-callback` (+ `/api/n8n/video-callback`) | `content_packages`, `content_items`, `video_jobs`, `asset_usage` |
| `regenerate_content_package` | `/api/automation/regenerate-content-package` | `/api/n8n/content-package-callback` (+ `/api/n8n/video-callback`) | `content_items`, `content_versions`, `video_jobs`, `content_packages` |
| `trend_scan` | `/api/automation/trend-scan` | `/api/n8n/trend-scan-callback` | `trends` |
| `weekly_strategy` | `/api/automation/weekly-strategy` | `/api/n8n/weekly-strategy-callback` | `content_strategies`, `content_strategy_items` |
| `publishing_planner` | `/api/automation/publishing-planner` | `/api/n8n/publishing-plan-callback` | `publishing_schedule` |
| _any failure_ | — | `/api/n8n/error-callback` | _(none — logged)_ |
