# Production Runtime Audit — Phase 6F: Observability

**Date:** 2026-07-23  
**Scope:** Traceability of production objects (Run → Worker → Provider → Storage → Callback).  
**Method:** Static schema, call-graph, log, telemetry, and UI inspection.  
**Constraint:** No workflows executed. No production code modified.

## Verdict

**Partially traceable.** Every durable object has a UUID primary key, and a successful package path can be walked from `production_runs.id` through strategy items, packages, content items, video jobs, and storage paths. There is **no single distributed correlation / trace ID** spanning Vercel ↔ n8n ↔ content-package worker ↔ video worker ↔ providers.

Operators can see run-level status and Review-tab telemetry for **completed** packages. Failed package AI spend, silent callback CAS no-ops, worker host identity, and provider request IDs are blind or weak. Most terminal failures are diagnosable in **minutes** with DB + Review UI; some require worker host logs (**10–30+ min**); a few leave spend/state gaps that need reconstruction scripts (**hours**).

## Correlation model (as built)

```
production_runs.id  ──FK──► production_run_items
        │                         │
        │                         ├── strategy_item_id ──► content_strategy_items
        │                         │         brief.production_run_id (JSON stamp)
        │                         ├── content_package_id ──► content_packages
        │                         ├── content_item_id ──► content_items
        │                         │         generation_metadata.production_run_id
        │                         └── video_job_id ──► video_jobs
        │                                   content_item_id (no package_id column)
        │                                   lease_owner / lease_expires_at
        │
        └── (no n8n_execution_id on production_runs)
```

**De facto correlation hub:** `production_run_id` stamped into:

| Location | When present |
|----------|--------------|
| `content_strategy_items.brief.production_run_id` | Strategy seed for the run |
| `content_items.generation_metadata.production_run_id` | Persist / heal / variant stamp |
| `generation_telemetry` legacy fields on package + strategy docs | Successful AI persist |
| `video_jobs.output.debug.generation_telemetry` | Successful worker finish |
| `production_run_items` FK columns | Reconcile / settle |

**Not stamped:**

- Worker HTTP payload (`video_job_id`, `project_id`, `content_package_id`, `content_item_id` only — no `production_run_id`)
- `video_jobs` table columns (no `production_run_id`, no `content_package_id`)
- `content_packages` columns (join via strategy item / items / run_items)
- Outbound provider calls (no `provider_request_id`)
- n8n execution IDs for content-production webhooks

---

## Object inventory

### 1. Run — `production_runs`

| Dimension | Finding |
|-----------|---------|
| **Unique ID** | `id` uuid PK (`015_production_runs.sql`) |
| **Correlation IDs** | `project_id`; children via `production_run_items.production_run_id` |
| **Status / error** | `status` (`queued\|running\|completed\|failed` + cancelled via later migration); `error_message` text |
| **Logs** | Sparse. Create/status paths do not emit structured run-scoped console logs. Failures surface mainly as DB writes + UI. |
| **Telemetry** | Aggregated lazily via `loadProductionRunTelemetry` (`lib/api/run-telemetry-admin.ts`) from strategy / package / video-job JSON docs — not a run-row column. |
| **Operator visibility** | Production tab (`ContentProductionPanel`): run id implicit in poll, status badge, package/output counters, **run-level** `errorMessage`. **No per-item error list.** Review tab: `RunTelemetryPanel` when a run is selected. |
| **Diagnosable?** | Yes for trigger/stale/stop messages. Partial when run is `completed` with mixed failed slots (run-level message may be first fail only / cleared). |

**Diagnosis time:** 1–5 min (UI) · 5–15 min if SQL needed for item rows.

---

### 2. Run Item — `production_run_items`

| Dimension | Finding |
|-----------|---------|
| **Unique ID** | `id` uuid PK |
| **Correlation IDs** | `production_run_id`, `project_id`, `package_index` (unique per run), `strategy_item_id` (unique when set — `024`), optional `content_package_id`, `content_item_id`, `video_job_id` |
| **Status / error** | `status`; `error_message` often JSON diagnostics from `markProductionRunItemGenerationFailed` (`error`, `message`, `validation_errors`, `attempts`, truncated to 4k) |
| **Logs** | No dedicated item-scoped logging on settle. |
| **Operator visibility** | **Gap:** Production UI aggregates only (`packagesFailed` count). Item `error_message` / FKs are **not** rendered. Operators need SQL, export scripts (`scripts/audit-production-run.ts`, `export-production-run-audit.ts`), or Review content cards after a package exists. |
| **Diagnosable?** | Yes in DB. Weak in product UI for generation-failed slots with **no package row**. |

**Diagnosis time:** 5–15 min with SQL/scripts · **15–45 min** if operator only has the Production tab.

---

### 3. Package — `content_packages`

| Dimension | Finding |
|-----------|---------|
| **Unique ID** | `id` uuid PK |
| **Correlation IDs** | `project_id`, `strategy_item_id` (identity / uniqueness for generation claims); **no** `production_run_id` column — resolve via strategy brief, run_items, or stamped content items |
| **Status / error** | `status` package enum (`draft|ready|…`); **no** `failed` status. Failures that abort before persist leave **no package row**. Callback can set `package_brief.last_callback_message`. |
| **Logs** | Workflow `console.info/warn/error` in `generateContentPackage.ts` (heal paths, soft-continues) — not consistently keyed with `production_run_id`. |
| **Telemetry** | `package_brief.presentation_generation.generation_telemetry` (`steps[]`, tokens, cost estimates) on **successful** persist. **Confirmed gap (PR-019):** failed packages typically persist **no** telemetry → cost forensics use medians (`docs/audits/cost-trace-c8dd3caf.md`). |
| **Operator visibility** | Review / content tabs once draft exists. Generation claim row (`content_package_generation_claims`) is service-role only — not in UI. |
| **Diagnosable?** | Strong when package exists. Weak when generation fails before insert (only run_item JSON + ephemeral process logs). |

**Diagnosis time:** 5–20 min (success path) · **30–90+ min** for failed-before-persist (logs + medians).

---

### 4. Content Item — `content_items`

| Dimension | Finding |
|-----------|---------|
| **Unique ID** | `id` uuid PK |
| **Correlation IDs** | `package_id`, `project_id`; `generation_metadata.production_run_id`; variants: `source_content_item_id`, language fields |
| **Status / error** | Approval `status` (draft → …); generation failures usually fail the **run item / video job**, not a dedicated content-item error column |
| **Logs** | Indirect via package workflow / reconcile |
| **Operator visibility** | Project content admin views (`lib/api/project-content-admin.ts`): surfaces `productionRunId`, source item, video job status / failure headlines (`describeVideoJobFailure`) |
| **Diagnosable?** | Yes once the item exists. Orphan / rolled-back persists leave gaps. |

**Diagnosis time:** 2–10 min from Review UI.

---

### 5. Video Job — `video_jobs`

| Dimension | Finding |
|-----------|---------|
| **Unique ID** | `id` uuid PK |
| **Correlation IDs** | `project_id`, `content_item_id`; worker payload also carries `content_package_id` (transport only). `input.production_run_id` / `input.package_id` when stamped at insert. `lease_owner`, `lease_expires_at` (`025`; **omitted from** `VideoJob` in `lib/supabase/types.ts`). Schema has `provider`, `model`, `provider_job_id` — local worker path rarely fills `provider_job_id`. |
| **Status / error** | `status` (`queued\|processing\|completed\|failed`); `error_message`; `output` jsonb (`mp4_url`, `debug`, `render_spec`, nested `error_message`) |
| **Logs** | **Strongest surface.** Worker logs consistently include `video_job_id` (+ often `project_id` / `content_package_id`): queue accept/start/finish, job start/fail, lease heartbeat, storage retries, callback failures (`video-worker/jobRunner.ts`, `queue.ts`, `services/storage.ts`, `services/callback.ts`). App callback handler logs only on unexpected persist errors (`[n8n callback] handler failed`). |
| **Telemetry** | `output.debug.generation_telemetry` after successful render; render diagnostics (durations, subtitle warnings) in `output.debug`. |
| **Operator visibility** | Review UI failure headline/detail; retry controls. Lease/heartbeat fields not shown. Export/audit scripts read jobs by content item. |
| **Diagnosable?** | Yes for terminal failed with message. Partial when stuck `processing` (need lease expiry + worker logs). Hard when completed callback rejected silently (CAS `status=processing` → 0 rows) with no audit row. |

**Diagnosis time:** 5–15 min · **20–40 min** if host logs required · **45–90 min** for upload-ok / callback-fail / promote races.

---

### 6. Worker — video-worker process

| Dimension | Finding |
|-----------|---------|
| **Unique ID** | **None durable.** Process listens on `VIDEO_WORKER_PORT`; auth via `VIDEO_WORKER_SECRET`. Lease owner token is typically **`video_jobs.id`**, not a host/instance id (`lib/production-runtime/videoJobLease.ts`, `jobRunner.ts`). |
| **Correlation IDs** | In-memory queue keyed by `video_job_id`; cancel API takes `video_job_ids[]` (`lib/video-worker/client.ts`). |
| **Logs** | stdout/stderr on the worker host (structured JSON blobs after a tag). No central log shipper assumed in code. |
| **Operator visibility** | Settings status only shows URL/secret configured (`lib/config/settingsStatus.ts`). No live worker dashboard in-app. |
| **Diagnosable?** | Only if operator has host/SSH or platform logs for the renderer. Multi-instance ambiguity: cannot tell which host held a lease from DB alone. |

**Diagnosis time:** 15–45 min with host access · **hours / blocked** without.

---

### 7. Provider — Claude / OpenAI / TTS / Whisper / image

| Dimension | Finding |
|-----------|---------|
| **Unique ID** | **Not captured.** Pipeline telemetry records `provider`, `model`, tokens, `estimated_cost`, durations, truncated `error_message` (`lib/ai/telemetry/*`, `withTelemetry`). No `provider_request_id` / response id fields in code paths. |
| **Correlation IDs** | Implicit via enclosing package/video telemetry document (+ optional `production_run_id` in package telemetry legacy). HTTP retry logs use labels like `openai:chat` without entity UUIDs (`lib/http/fetchWithRetry.ts`). |
| **Logs** | Provider errors may appear in step telemetry (if persisted) or process stderr. |
| **Operator visibility** | `RunTelemetryPanel` shows step provider/model/cost/errors for persisted steps. Worker media costs often null → list-price estimates in audits. |
| **Diagnosable?** | Local “which step failed” yes. Provider-side ticket / dashboard join **no** — cannot hand Anthropic/OpenAI a request id from our DB. |

**Diagnosis time:** 5–20 min for step attribution · **provider disputes: not correlatable**.

---

### 8. Storage — Supabase Storage

| Dimension | Finding |
|-----------|---------|
| **Unique ID** | Object path is the durable key. Conventions (`lib/api/storage.ts`): `video-renders` → `{project_id}/video/{video_job_id}/{filename}`; `generated-visuals` → `{project_id}/generated/{ai_visual_id}/{filename}`; `project-assets` → `{project_id}/source/{asset_id}/{filename}`. |
| **Correlation IDs** | Path embeds `project_id` + `video_job_id` (or visual/asset id). Signed URLs stored on `video_jobs.output`. |
| **Logs** | Upload attempt failures / retries log `bucket`, `storage_path`, size, HTTP status (`video-worker/services/storage.ts`). Success after retry logged; first-try success quiet. |
| **Operator visibility** | Download via signed URLs on content cards. No orphan-object browser. |
| **Diagnosable?** | Yes from `video_job_id`. Orphans after false-failed jobs (upload then failed callback — reliability PR-002) are findable by path convention but not linked to a “good” completed job. |

**Diagnosis time:** 5–15 min · **30–60 min** for orphan reconciliation.

---

### 9. Callback — n8n / worker → app

| Dimension | Finding |
|-----------|---------|
| **Unique ID** | No callback event id. Identity = payload keys: video → `project_id` + `content_package_id` + `video_job_id`; package → `project_id` + `content_package_id`. |
| **Correlation IDs** | `n8n_execution_id` stored only on **`project_action_runs`** (`handleActionRunStatusCallback`) — **not** on production runs / video callbacks. Worker callbacks authenticate with `x-n8n-secret` (`lib/n8n/callback.ts`). |
| **Logs** | Success: **no** structured log. Failure: `console.error("[n8n callback] handler failed:", err)` without payload ids. Transport retries labeled `video-worker:callback`. |
| **Error propagation** | Video: CAS update only if `status=processing`; cancel reject forces failed message; then `reconcileProductionRunForContentItem`. Package callback: unconditional status update (known residual in production-runtime docs). Failed callback after durable artifacts: promote path / avoid failed send (`jobRunner` + `uploadDurability`). |
| **Operator visibility** | Indirect via job/package/run status. No callback audit table. |
| **Diagnosable?** | Outcome visible in DB. **Missing:** proof a callback arrived, was rejected, or no-op’d. |

**Diagnosis time:** 10–30 min inferring from status transitions · **30–90 min** when logs lack ids.

---

## Error propagation (observability view)

| Failure class | Where error lands | Operator sees | Trace gap |
|---------------|-------------------|---------------|-----------|
| n8n trigger fail | `production_runs.error_message` | Production tab | No n8n execution id |
| Package generation_failed | `production_run_items.error_message` JSON | Aggregate fail count only | No package telemetry (PR-019) |
| Package operational / kill mid-AI | Often open run_item; claim lease may expire | Stuck / stale messaging | Ephemeral collector lost |
| Video render fail | `video_jobs.error_message` (+ optional debug) | Review failure headline | Need worker logs for stage |
| Operator Stop | Canonical cancel string on jobs + run | Stop UX + blocked retry | In-flight AI may finish without stamp |
| Late completed after cancel | Rejected / no-op CAS | Job stays failed | No “rejected callback” audit |
| Callback HTTP fail after upload | Promote / stuck processing | Confusing status | Host callback logs |
| Storage upload exhaust | Job failed + storage warn logs | Generic render fail | Path in worker logs only |
| Provider 5xx | Telemetry step fail if persisted | Step error in Review telemetry | No provider request id |

Supporting matrix: `docs/audits/production-reliability/failure-propagation.csv`.

---

## Can every failure be diagnosed?

| Outcome | Answer |
|---------|--------|
| Terminal run/item/job with `error_message` | **Yes** — DB + Review (or SQL for item JSON). |
| Completed package with bad quality | **Yes** — package brief + telemetry + render debug. |
| Failed package before persist | **Partially** — run_item diagnostics; **spend unknown** without process logs. |
| Stuck `processing` video job | **Partially** — leases help; need worker host for why heartbeat stopped. |
| Silent callback no-op / reject | **Weak** — infer from status; no event log. |
| Which worker host / which provider request | **No** with current identifiers. |
| Exact failed-package $ | **No** exact — median estimates only (cost-trace audit). |

**Overall:** Failures that write a terminal DB row are diagnosable. Failures that only exist in process memory, or that CAS-ignore callbacks, are not fully diagnosable from product data alone.

---

## Diagnosis time estimates

Assumes an operator with Production + Review UI access; “+SQL” means admin client / scripts; “+host” means video-worker logs.

| Scenario | Typical | Worst |
|----------|---------|-------|
| Run failed to start (n8n/config) | 2–5 min | 15 min |
| One package generation_failed (UI only) | 15–30 min | 45 min (find item JSON) |
| Same with SQL / audit script | 5–10 min | 20 min |
| Video TTS / render fail with message | 5–15 min | 30 min |
| Stuck processing / lease expiry | 15–30 min | 60 min (+host) |
| Upload OK, callback lost / promote | 30–60 min | 2 h |
| Cost of failed packages | 30–90 min (scripts) | Multi-hour (reconstruct) |
| Provider billing dispute | Not feasible | — |
| Multi-worker “who rendered?” | Not in DB | Host forensics only |

---

## Missing identifiers

| Missing | Impact |
|---------|--------|
| Pipeline-wide `trace_id` / `correlation_id` | Cannot join Vercel ↔ n8n ↔ workers ↔ providers in one grep |
| `production_run_id` on worker payload / `video_jobs` | Worker logs require join via package/item |
| `content_package_id` column on `video_jobs` | Always resolve via `content_item_id` → item |
| `n8n_execution_id` on production runs | Cannot open n8n execution from run id |
| Worker `instance_id` / hostname in lease or logs metadata | Multi-host ambiguity |
| `provider_request_id` on telemetry steps | No provider-side join |
| Callback `event_id` + accept/reject reason table | Silent no-ops invisible |
| Durable failure telemetry blob without package row | Blind failed-package cost (PR-019) |
| `lease_owner` / `lease_expires_at` on `VideoJob` TS type | DB has columns (`025`); `lib/supabase/types.ts` omits them → scripts/UI typed against stale shape |
| Durable automation-error rows | `handleAutomationErrorCallback` is console-only unless `action_run_id` |

---

## Missing logs

| Gap | Location |
|-----|----------|
| Success path for n8n/video callbacks (no id-bearing info/warn) | `lib/n8n/callback.ts` |
| Callback handler errors without entity ids in the log line | `lib/n8n/callback.ts` (`[n8n callback] handler failed`) |
| Callback reject / CAS no-op (cancel, already terminal) | `handleVideoCallback` |
| Claim acquire / busy | `lib/production-runtime/packageGenerationClaim.ts` |
| Automation errors (unless `action_run_id`) | `handleAutomationErrorCallback` — console only |
| Production run create / status transitions | `production-run-admin.ts` |
| Package generation start/end with `{production_run_id, strategy_item_id, package_id}` | `generateContentPackage` / n8n handler |
| HTTP retry logs without entity UUIDs | `fetchWithRetry` |
| First-try storage upload success (only retries logged) | `storage.ts` |

Worker **failure** logging is comparatively good (`video_job_id` always present).

---

## Missing relationships

| Gap | Detail |
|-----|--------|
| Run → n8n execution | Not stored for content production |
| Run item errors → UI | Stored but not shown on Production tab |
| Package → run | JSON/strategy/item stamps only; no FK |
| Video job → run | Via content item metadata or run_item.video_job_id after reconcile |
| Claim / lease rows → operator UI | Service-role tables/columns only |
| Translation jobs → production run | Separate queue; Stop coverage residual (reliability audit) |
| Storage object → run | Only via `video_job_id` path segment |

---

## Operator visibility map

| Surface | Shows | Hides |
|---------|-------|-------|
| Production tab | Run status, counters, run `errorMessage`, Stop | Per-item errors, FKs, leases, telemetry, n8n ids |
| Review + `RunTelemetryPanel` | Merged steps, costs, failed steps for **persisted** docs | Failed-package AI steps; provider request ids |
| Content / video cards | Job status, failure headline, artifacts, `productionRunId` | Lease owner/expiry, callback history |
| Audit scripts | Full graph for a run id | Requires engineering access |
| Worker host stdout | Job lifecycle | Not in product |

---

## Recommendations (observability-only; not implemented)

Priority order for closing diagnosis gaps:

1. **Persist generation telemetry on failure settle** (even without a package row) — attach to `production_run_items` or a side table keyed by `strategy_item_id` + `production_run_id` (closes PR-019).
2. **Surface run-item `error_message` in Production UI** (or export link) — cuts diagnosis from ~30 min to ~5 min.
3. **Stamp `production_run_id` on worker payload + log lines**; optionally denormalize onto `video_jobs`.
4. **Log callback outcomes** with `{video_job_id, accepted, effective_status, reason}` including CAS no-ops and cancel rejects.
5. **Add `provider_request_id` (nullable) to telemetry steps** where SDKs expose it.
6. **Record worker `instance_id`** (hostname/env) on claim/heartbeat renew.
7. **Store outbound n8n execution / webhook response id** on the production run when available.

---

## Evidence index

| Area | Primary evidence |
|------|------------------|
| Schema | `supabase/migrations/015_production_runs.sql`, `024_production_run_item_identity.sql`, `025_production_runtime.sql`, `002_core_tables.sql`, `003_ai_video_planner_history_performance.sql` |
| Runtime model | `docs/architecture/production-runtime.md`, `lib/production-runtime/*` |
| Settle / errors | `lib/api/production-run-admin.ts`, `lib/api/production-run-cancel.ts` |
| Telemetry | `lib/ai/telemetry/*`, `lib/api/run-telemetry-admin.ts`, `lib/production-runs/aggregateRunTelemetry.ts` |
| Worker / storage / callback | `video-worker/jobRunner.ts`, `queue.ts`, `services/storage.ts`, `services/callback.ts`, `lib/n8n/handlers.ts`, `lib/n8n/callback.ts` |
| Paths | `lib/api/storage.ts` |
| UI | `components/projects/ContentProductionPanel/*`, `components/review/RunTelemetryPanel/*` |
| Prior finding | `docs/audits/production-reliability/findings.csv` PR-019; `docs/audits/cost-trace-c8dd3caf.md` |

---

## Summary answers

| Question | Answer |
|----------|--------|
| Can every production object be traced? | **IDs yes; end-to-end correlation partial.** |
| Unique IDs? | **Yes** for Run, Run Item, Package, Content Item, Video Job, Storage path. **No** for Worker instance, Provider request, Callback event. |
| Correlation IDs? | **`production_run_id` hub** via JSON stamps + run_item FKs. **No** global trace id. |
| Logs? | **Strong** on video worker job path; **weak** on app callbacks, run lifecycle, entity-scoped HTTP. |
| Error propagation? | Terminal writers generally set `error_message`; package has no failed status; some paths lose in-memory telemetry. |
| Operator visibility? | **Run aggregates + Review telemetry for successes**; item-level generation failures and leases under-exposed. |
| Can every failure be diagnosed? | **Most terminal failures yes; spend-on-fail, silent callbacks, host/provider joins no.** |
| How long? | **Minutes** for typical terminal fail with UI+SQL; **tens of minutes to hours** for stuck/callback/cost-blind cases. |
