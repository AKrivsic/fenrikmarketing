# n8n Node Specification — AI Content Manager MVP

Detailed, node-by-node build specification for the **5 required n8n workflows**.
This complements [`docs/n8n-workflow-contract.md`](./n8n-workflow-contract.md)
(the payload/contract reference) by describing **how to wire each workflow in
n8n, node by node**.

> Scope: specification only. No runtime code, **no JSON export**, no new modules,
> no new workflows. Uses only the architecture already defined in the project.

---

## Legend

- ✅ **Implemented in Vercel** — call it, do not rebuild.
- 🔧 **Build in n8n** — create this node.
- 🚫 **Out of scope** — do not add (CRM, scheduler, analytics, custom workflows).

Secrets / env (see contract §2): trigger auth header `x-n8n-secret` =
`N8N_WEBHOOK_SECRET`; callback auth header `x-n8n-secret` = `N8N_CALLBACK_SECRET`;
Supabase nodes use `SUPABASE_SERVICE_ROLE_KEY` and **must** scope every query by
`project_id`.

---

## 0. Node-type catalog (8 types used)

These 8 n8n node types are the building blocks for all 5 workflows. Each workflow
section below instantiates a subset of them.

| # | Node type | Generic purpose in this project |
|---|-----------|---------------------------------|
| 1 | **Trigger node** (Webhook) | Receive the unified envelope from a Vercel `/api/automation/*` endpoint; authenticate. |
| 2 | **HTTP Request node** | Call the AI provider and the Video Worker (and any external source). |
| 3 | **Supabase node** | Read Project Brain / context; insert/update skeleton rows. |
| 4 | **IF node** | Branch on conditions (eligibility, status, empty results, success/failure). |
| 5 | **Merge node** | Combine parallel read branches into one context object. |
| 6 | **Function node** | Pure transformation / assembly of payloads (no business rules hardcoded — only mapping). |
| 7 | **Wait node** | Await async Video Worker completion (resume by webhook). |
| 8 | **Callback node** (HTTP Request → Vercel) | POST results to `/api/n8n/*-callback`; POST `/api/n8n/error-callback` on failure. |

### Default retry profile (per node type)

| Node type | Retry on failure | Backoff | Notes |
|-----------|------------------|---------|-------|
| Trigger | n/a | n/a | Reject `401` immediately if secret mismatches. |
| HTTP (AI) | 3 | 2s → 4s → 8s | Retry on `429`/`5xx`/timeout only. |
| HTTP (Video enqueue) | 2 | 2s → 5s | Rendering itself is awaited via Wait node. |
| Supabase | 2 | 1s → 3s | Retry on network/`5xx` only. |
| IF / Merge / Function | 0 | — | Pure logic; failures are bugs, route to error branch. |
| Wait | n/a | — | Has its own timeout (see each workflow). |
| Callback | 5 | 2s → 4s → 8s → 16s → 32s | Retry on network/`5xx`. **Never** retry `400`/`422`; `401` = stop+alert. |

### Global error handling rule

Every workflow has a single **Error Trigger / error branch** that builds and
POSTs `/api/n8n/error-callback` (see contract §5) and then stops. No partial
retries past the per-node policy. Callbacks are idempotent (carry row ids).

---

## 1. Generate Content Package

**Workflow value:** `generate_content_package`
**Node count:** 1 Trigger, 3 Supabase, 1 Merge, 2 Function, 1 HTTP (AI), 1 HTTP
(Video), 1 Wait, 2 IF, 2 Callback, 1 error branch.

### Node-by-node

#### N1 — Trigger node 🔧
- **Name:** `Trigger: generate_content_package`
- **Purpose:** Receive the Vercel envelope and authenticate.
- **Input:** POST body `{ workflow, project_id, requested_at, payload:{package_count?, funnel_stage?} }`; header `x-n8n-secret`.
- **Output:** Envelope JSON onto the workflow.
- **Retry:** n/a.
- **Error handling:** If `x-n8n-secret !== N8N_WEBHOOK_SECRET` → respond `401`, stop.

#### N2 — Supabase node (Project Brain) 🔧
- **Name:** `Read: projects (brain)`
- **Purpose:** Load tone, audience, goal_type, product_is / product_is_not, forbidden_claims, platforms, default_cta.
- **Input:** `select * from projects where id = {{project_id}}`.
- **Output:** `project` object.
- **Retry:** 2 (1s→3s).
- **Error handling:** 0 rows → route to error branch (`error_type: project_not_found`).

#### N3 — Supabase node (strategy context) 🔧
- **Name:** `Read: content_strategy_items`
- **Purpose:** Pick the strategy item / funnel stage to realize.
- **Input:** `select … from content_strategy_items (join content_strategies) where project_id = {{project_id}}` (optionally filter by `funnel_stage` from payload).
- **Output:** `strategy_items[]`.
- **Retry:** 2.
- **Error handling:** Empty is allowed (generation can proceed brief-only).

#### N4 — Supabase node (assets + topics + trends) 🔧
- **Name:** `Read: reuse context`
- **Purpose:** Load `assets`, `evergreen_topics`, eligible `trends` (`metadata.relevance_score >= 60`) for `project_id`.
- **Input:** three scoped selects (can be one node per table; shown merged for brevity).
- **Output:** `assets[]`, `topics[]`, `trends[]`.
- **Retry:** 2.
- **Error handling:** Empty allowed.

#### N5 — Merge node 🔧
- **Name:** `Merge: generation context`
- **Purpose:** Combine N2–N4 into a single `context` object for the AI prompt.
- **Input:** outputs of N2, N3, N4.
- **Output:** `{ project, strategy_items, assets, topics, trends }`.
- **Retry:** 0.
- **Error handling:** Missing `project` → error branch.

#### N6 — Function node (prompt assembly) 🔧
- **Name:** `Build: AI prompt`
- **Purpose:** Map `context` → AI request (no hardcoded business rules; only mapping the brain into the prompt + target platforms).
- **Input:** merged context + `payload.funnel_stage`, `payload.package_count`.
- **Output:** `ai_request` (system + user prompt, target platforms ⊆ `project.platforms`).
- **Retry:** 0.
- **Error handling:** Throw → error branch (`error_type: prompt_build_failed`).

#### N7 — HTTP Request node (AI) 🔧
- **Name:** `AI: generate package`
- **Purpose:** Call the text model to produce `title`, `platform_outputs`, `voiceover_text`, `subtitles`, `video` concept/script.
- **Input:** `ai_request`.
- **Output:** `ai_package` JSON.
- **Retry:** 3 (2s→4s→8s) on `429`/`5xx`/timeout.
- **Error handling:** Final failure → error branch (`error_type: ai_generation_failed`, `step: ai_generation`).

#### N8 — Supabase node (skeleton insert) 🔧
- **Name:** `Insert: package skeleton`
- **Purpose:** Insert `content_packages` (status `draft`), `content_items` (per platform), `video_jobs` (status `queued`); optional `asset_usage`.
- **Input:** `ai_package` + ids/context.
- **Output:** `content_package_id`, `content_item_ids[]`, `video_job_id`.
- **Retry:** 2.
- **Error handling:** Insert error → error branch (`error_type: db_insert_failed`). Guardrails: platforms ⊆ project platforms; no `forbidden_claims`.

#### N9 — Callback node (content package) ✅ endpoint / 🔧 node
- **Name:** `Callback: content-package`
- **Purpose:** Finalize package copy + status.
- **Input:** `POST /api/n8n/content-package-callback` with `{ project_id, content_package_id, status:"ready", platform_outputs, message }`, header `x-n8n-secret = N8N_CALLBACK_SECRET`.
- **Output:** `200 { ok:true }`.
- **Retry:** 5 (exp). Never retry `400`/`422`.
- **Error handling:** `400`/`422` → error branch; `401` → stop+alert.

#### N10 — HTTP Request node (Video Worker enqueue) 🔧
- **Name:** `Video: enqueue render`
- **Purpose:** Send `video_job_id` + script/voiceover to the Video Worker.
- **Input:** `{ video_job_id, project_id, script, voiceover_text, subtitles }`.
- **Output:** acknowledgement (the render is async).
- **Retry:** 2 (2s→5s).
- **Error handling:** Enqueue failure → mark video failed via N12 + error branch.

#### N11 — Wait node 🔧
- **Name:** `Wait: video render`
- **Purpose:** Suspend until the Video Worker calls back (resume-on-webhook).
- **Input:** resume URL passed to the Worker.
- **Output:** Worker result `{ status, mp4_url, thumbnail_url?, subtitle_url? }`.
- **Retry:** n/a. **Timeout:** e.g. 30 min → on timeout treat as failed.
- **Error handling:** Timeout → N12 with `status:"failed"` + error branch.

#### N12 — IF node (video status) 🔧
- **Name:** `IF: video completed?`
- **Purpose:** Branch on Worker result.
- **Input:** Worker result `status`.
- **Output:** true → N13 (`completed`); false → N13 (`failed`) + error branch.
- **Retry:** 0.

#### N13 — Callback node (video) ✅ endpoint / 🔧 node
- **Name:** `Callback: video`
- **Purpose:** Persist video output + flip package to review-ready.
- **Input:** `POST /api/n8n/video-callback` with `{ project_id, content_package_id, video_job_id, status, mp4_url, thumbnail_url?, subtitle_url? }`.
- **Output:** `200 { ok:true }`. On `status:"completed"` the endpoint sets `content_packages.status = 'draft'`.
- **Retry:** 5 (exp).
- **Error handling:** as N9.

#### Error branch 🔧
`POST /api/n8n/error-callback` with `{ project_id, content_package_id?, workflow:"generate_content_package", step, error_type, error_message }`.

**Expected final status:** `content_packages.status = 'draft'`, `video_jobs.status = 'completed'`.

---

## 2. Regenerate Content Package

**Workflow value:** `regenerate_content_package`
**Node count:** 1 Trigger, 3 Supabase (read), 1 Supabase (versions), 1 Merge, 1 Function, 1 HTTP (AI), 1 Supabase (update), 1 IF (video?), [Video N10–N13 reused], 1 Callback, error branch.

### Node-by-node

#### N1 — Trigger node 🔧
- **Name:** `Trigger: regenerate_content_package`
- **Purpose / Input:** envelope `payload:{ content_package_id, reason? }`.
- **Output / Retry / Errors:** as Workflow 1 N1.

#### N2 — Supabase node (Project Brain) 🔧
- Same as Workflow 1 N2.

#### N3 — Supabase node (current package) 🔧
- **Name:** `Read: content_packages`
- **Purpose:** Load the existing package.
- **Input:** `where id = {{content_package_id}} AND project_id = {{project_id}}`.
- **Output:** `package`.
- **Retry:** 2.
- **Error handling:** 0 rows → error branch (`error_type: package_not_found`). (The Vercel trigger already validates ownership, this is defense-in-depth.)

#### N4 — Supabase node (current items) 🔧
- **Name:** `Read: content_items`
- **Purpose:** Load current items for snapshot + regeneration.
- **Input:** `where package_id = {{content_package_id}} AND project_id`.
- **Output:** `items[]`.
- **Retry:** 2.

#### N5 — Supabase node (history snapshot) 🔧
- **Name:** `Insert: content_versions`
- **Purpose:** Preserve current state before overwrite.
- **Input:** insert `{ project_id, content_package_id, content_item_id?, version_no, snapshot, change_note: reason }`.
- **Output:** version ids.
- **Retry:** 2.
- **Error handling:** Failure → error branch (`step: snapshot`).

#### N6 — Merge node 🔧
- **Name:** `Merge: regen context` — combine brain + package + items.

#### N7 — Function node (prompt assembly) 🔧
- **Name:** `Build: AI regen prompt` — map context + `reason` → `ai_request`.

#### N8 — HTTP Request node (AI) 🔧
- **Name:** `AI: regenerate package` — as Workflow 1 N7 (`error_type: ai_generation_failed`).

#### N9 — Supabase node (update items) 🔧
- **Name:** `Update: content_items`
- **Purpose:** Overwrite item copy in place.
- **Input:** update per `id` scoped by `project_id`.
- **Output:** updated rows.
- **Retry:** 2.
- **Error handling:** → error branch (`step: db_update`).

#### N10 — Callback node (content package) ✅/🔧
- **Name:** `Callback: content-package` — `POST /api/n8n/content-package-callback` `{ project_id, content_package_id, status:"ready", platform_outputs, message:"Regenerated: {reason}" }`. Retry/errors as Workflow 1 N9.

#### N11 — IF node (needs new video?) 🔧
- **Name:** `IF: regenerate video?`
- **Purpose:** Decide whether a new render is needed.
- **Output:** true → reuse Video nodes (enqueue → Wait → IF → video-callback, identical to Workflow 1 N10–N13, inserting a fresh `video_jobs` row first); false → finish.

#### Error branch 🔧
`workflow:"regenerate_content_package"`.

**Expected final status:** `content_packages.status = 'draft'`; prior state in `content_versions`; new `video_jobs.status = 'completed'` if regenerated.

---

## 3. Trend Scan

**Workflow value:** `trend_scan`
**Node count:** 1 Trigger, 2 Supabase (read), 1 HTTP (external/AI), 1 Function (score map), 1 IF (any accepted?), 1 Callback, error branch. No Video, no Wait, no Merge required.

### Node-by-node

#### N1 — Trigger node 🔧
- **Name:** `Trigger: trend_scan`
- **Input:** envelope `payload:{}` (only `project_id`).

#### N2 — Supabase node (Project Brain) 🔧
- **Name:** `Read: projects (brain)` — market, audience, goal for scoring context.

#### N3 — Supabase node (existing trends + topics) 🔧
- **Name:** `Read: trends + evergreen_topics`
- **Purpose:** De-duplicate against existing `trends`; align with `evergreen_topics`.
- **Input:** scoped selects by `project_id`.
- **Output:** `existing_trends[]`, `topics[]`.
- **Retry:** 2.

#### N4 — HTTP Request node (discover + score) 🔧
- **Name:** `AI: discover & score trends`
- **Purpose:** Discover candidate trends and assign `relevance_score` (0–100).
- **Input:** brain + existing trends (for dedup).
- **Output:** `scored_trends[]` with `title`, `relevance_score`, `source`, `source_url?`, `signal_strength?`, `rationale?`, `angle?`.
- **Retry:** 3 (2s→4s→8s).
- **Error handling:** → error branch (`error_type: trend_scoring_failed`).

#### N5 — Function node (split accepted/rejected) 🔧
- **Name:** `Split: accepted vs rejected`
- **Purpose:** Map scored trends into `accepted_trends` (have `relevance_score` ≥ threshold **and** `title`) and `rejected_trends`.
- **Input:** `scored_trends[]`.
- **Output:** `{ accepted_trends[], rejected_trends[] }`.
- **Retry:** 0.
- **Note:** `rejected_trends` are sent in the payload but **not persisted** by Vercel (no log table).

#### N6 — IF node (any accepted?) 🔧
- **Name:** `IF: has accepted trends?`
- **Output:** true → N7; false → finish (no callback needed, or send empty accepted list).

#### N7 — Callback node (trend scan) ✅/🔧
- **Name:** `Callback: trend-scan`
- **Input:** `POST /api/n8n/trend-scan-callback` `{ project_id, accepted_trends[], rejected_trends:[] }`.
- **Output:** `200`. Endpoint inserts only entries with `relevance_score` + `title`; stores score in `trends.metadata`.
- **Retry:** 5 (exp). Errors as standard callback.

#### Error branch 🔧
`workflow:"trend_scan"`.

**Expected final status:** new `trends` rows for accepted, scorable trends.

---

## 4. Weekly Strategy

**Workflow value:** `weekly_strategy`
**Node count:** 1 Trigger, 3 Supabase (read), 1 Merge, 1 Function, 1 HTTP (AI), 1 IF (valid plan?), 1 Callback, error branch. No Video, no Wait.

### Node-by-node

#### N1 — Trigger node 🔧
- **Name:** `Trigger: weekly_strategy`
- **Input:** envelope `payload:{ week_start }` (`YYYY-MM-DD`, already validated by Vercel).

#### N2 — Supabase node (Project Brain) 🔧
- **Name:** `Read: projects (brain)` — `goal_type` → strategy objective fallback.

#### N3 — Supabase node (eligible trends) 🔧
- **Name:** `Read: trends (eligible)`
- **Input:** `where project_id AND metadata->>relevance_score >= 60`.
- **Output:** `eligible_trends[]`.
- **Retry:** 2.

#### N4 — Supabase node (evergreen) 🔧
- **Name:** `Read: evergreen_topics` — pillars for `project_id`.

#### N5 — Merge node 🔧
- **Name:** `Merge: strategy context` — brain + trends + topics.

#### N6 — Function node (prompt assembly) 🔧
- **Name:** `Build: strategy prompt` — map context + `week_start` → `ai_request`.

#### N7 — HTTP Request node (AI) 🔧
- **Name:** `AI: weekly strategy`
- **Output:** `strategy { theme, objective?, week_end?, items:[{platform, format, priority?, topic, …}] }`.
- **Retry:** 3.
- **Error handling:** → error branch (`error_type: strategy_generation_failed`).

#### N8 — IF node (valid items?) 🔧
- **Name:** `IF: has valid plan items?`
- **Purpose:** Ensure at least one item has a valid `platform` + `format` (others are skipped by the endpoint).
- **Output:** true → N9; false → still send header-only strategy or error branch.

#### N9 — Callback node (weekly strategy) ✅/🔧
- **Name:** `Callback: weekly-strategy`
- **Input:** `POST /api/n8n/weekly-strategy-callback` `{ project_id, week_start, strategy:{…} }`.
- **Output:** `200`. Endpoint inserts `content_strategies` (objective falls back to project `goal_type`) + `content_strategy_items`.
- **Retry:** 5 (exp).

#### Error branch 🔧
`workflow:"weekly_strategy"`.

**Expected final status:** 1 `content_strategies` + N `content_strategy_items`.

---

## 5. Publishing Planner

**Workflow value:** `publishing_planner`
**Node count:** 1 Trigger, 3 Supabase (read), 1 Function (slot mapping), 1 IF (any items?), 1 Callback, error branch. No AI required, no Video, no Wait.

### Node-by-node

#### N1 — Trigger node 🔧
- **Name:** `Trigger: publishing_planner`
- **Input:** envelope `payload:{ week_start }`.

#### N2 — Supabase node (rules) 🔧
- **Name:** `Read: projects (rules)`
- **Purpose:** `publishing_rules`, `platforms` for slot calculation.
- **Input:** `where id = project_id`.
- **Output:** `project`.
- **Retry:** 2.

#### N3 — Supabase node (eligible packages) 🔧
- **Name:** `Read: content_packages (schedulable)`
- **Input:** `where project_id AND status in ('ready','approved')`.
- **Output:** `packages[]`.
- **Retry:** 2.

#### N4 — Supabase node (items) 🔧
- **Name:** `Read: content_items`
- **Purpose:** Platform items per package (the endpoint resolves `content_item_id` by package+platform, so the planner should target real platforms).
- **Input:** `where package_id in (…) AND project_id`.
- **Output:** `items[]`.
- **Retry:** 2.

#### N5 — Function node (slot mapping) 🔧
- **Name:** `Build: schedule items`
- **Purpose:** Apply `publishing_rules` to spread items across the week → `items:[{ content_package_id, platform, publish_at }]`. **Rule data comes from Supabase, not hardcoded.**
- **Input:** `project`, `packages[]`, `items[]`, `week_start`.
- **Output:** `schedule_items[]`.
- **Retry:** 0.
- **Error handling:** Throw → error branch (`step: slot_mapping`).

#### N6 — IF node (any items?) 🔧
- **Name:** `IF: has schedule items?`
- **Output:** true → N7; false → finish.

#### N7 — Callback node (publishing plan) ✅/🔧
- **Name:** `Callback: publishing-plan`
- **Input:** `POST /api/n8n/publishing-plan-callback` `{ project_id, week_start, items:[{content_package_id, platform, publish_at}] }`.
- **Output:** `200`. Endpoint resolves `content_item_id` (NOT NULL FK) by package+platform and inserts `publishing_schedule` (status `scheduled`).
- **Retry:** 5 (exp).

#### Error branch 🔧
`workflow:"publishing_planner"`.

**Expected final status:** new `publishing_schedule` rows (status `scheduled`).

---

## 6. AI orchestration sequence

Used by: Generate, Regenerate, Trend Scan, Weekly Strategy (Publishing Planner
needs **no** AI).

```
Read Project Brain (Supabase)
  → Read workflow context (Supabase: strategy/trends/topics/assets)
  → Merge → Function (build prompt from brain, no hardcoded rules)
  → HTTP AI call (retry 3x: 2s/4s/8s on 429/5xx/timeout)
  → Validate output against guardrails (platforms ⊆ project, no forbidden_claims)
  → on success: continue to persistence/callback
  → on final failure: error branch → /api/n8n/error-callback (error_type: ai_*_failed)
```

Key rule: the **prompt is assembled from Supabase data at runtime**, so a new
project changes nothing in n8n.

---

## 7. Video orchestration sequence

Used by: Generate (always), Regenerate (conditional).

```
Insert video_jobs (status='queued', linked via content_item_id)
  → HTTP enqueue to Video Worker (retry 2x) with video_job_id + resume URL
  → Wait node (resume-on-webhook, timeout ~30 min)
  → IF video completed?
       true  → Callback /api/n8n/video-callback (status='completed', mp4_url, …)
               → endpoint sets content_packages.status='draft'
       false → Callback /api/n8n/video-callback (status='failed')
               → error branch (/api/n8n/error-callback, error_type: video_failed)
```

Notes: `video_jobs` has **no** `content_package_id`; it links through
`content_item_id`. The video-callback can resolve the latest job by package when
`video_job_id` is omitted, but passing `video_job_id` is preferred for
idempotency. `package_status` has **no** `failed` value, so a failed video does
not change the package status.

---

## 8. Callback sequence

```
Build callback payload (Function) — include row ids for idempotency
  → HTTP POST /api/n8n/<workflow>-callback
       headers: x-n8n-secret = N8N_CALLBACK_SECRET
  → Inspect response:
       200 ok        → done
       400 / 422     → DO NOT retry → error branch (payload bug)
       401           → STOP + alert (secret misconfig)
       5xx / network → retry (5x exponential) → then error branch
```

Callback endpoints per workflow:

| Workflow | Primary callback | Secondary callback |
|----------|------------------|--------------------|
| generate_content_package | `content-package-callback` | `video-callback` |
| regenerate_content_package | `content-package-callback` | `video-callback` (conditional) |
| trend_scan | `trend-scan-callback` | — |
| weekly_strategy | `weekly-strategy-callback` | — |
| publishing_planner | `publishing-plan-callback` | — |
| _any failure_ | `error-callback` | — |

---

## 9. Retry sequence (decision order)

```
Node fails
  → Is it a logic node (IF/Merge/Function)? → no retry → error branch
  → Is it AI HTTP? → retry 3x (2s/4s/8s) on 429/5xx/timeout → else error branch
  → Is it Supabase? → retry 2x (1s/3s) on network/5xx → else error branch
  → Is it Video enqueue? → retry 2x (2s/5s) → else mark failed + error branch
  → Is it a Callback?
        4xx (400/422) → no retry → error branch
        401           → stop + alert
        5xx/network   → retry 5x (2s/4s/8s/16s/32s) → else error branch
  → Wait node timeout → treat as video failed → video-callback(failed) + error branch
```

All retries are safe because callbacks carry `content_package_id` /
`video_job_id` and Supabase upserts are scoped by `project_id`.

---

## 10. Out of scope (🚫)

Not part of these workflows or this spec: CRM, scheduler / auto-triggering,
analytics & performance-tracking execution, custom/no-code workflow builders, and
any new workflow beyond the 5 above. A new project must run on these exact 5
workflows with only `project_id` changing.
