# Runtime Prompt & Response Persistence

**Status:** Architecture proposal only — not implemented  
**Date:** 2026-07-25  
**Trigger:** Forensic exports (e.g. `fbe48cf4`) cannot recover exact prompts/raw responses; telemetry deliberately stores summaries only (`lib/ai/telemetry/types.ts`: *“never the full prompt”*).

---

## 1. Goal

After every AI (and media) provider call in the production content pipeline, an operator must be able to display **exact runtime bytes** for that call:

| Field | Required |
| --- | --- |
| `system` prompt | yes (chat/text) |
| `user` prompt | yes (chat/text) |
| `response_format` / JSON schema / validator id | yes when used |
| `expectedShape` | yes when forwarded to repair |
| `tools` | yes (empty array if none) |
| `model` | yes |
| `temperature` | yes (including provider default if request omitted null) |
| `max_tokens` | yes (including provider default if request omitted null) |
| `stop` / stop sequences | yes (null or `[]` if unused) |
| `provider_request_id` | yes when provider returns one; else explicit `null` |
| `raw_response` | **exact** provider return body/text as received |
| `parsed_response` | first successful parse (or null) |
| `repaired_response` | output after JSON-repair call (or null) |
| `validated_response` | object that passed schema (+ guardrails if applied) |
| `final_persisted_object` | object written to durable product tables (or null if never persisted) |

**Hard rules**

- No reconstruction from prompt builders.
- No “best effort” rebuild from stored package fields.
- No use of current code to invent what was sent historically.
- If a field was not sent, store explicit `null` / absent flag — never invent defaults after the fact without recording that the *request* used the provider default.

---

## 2. Non-goals

- Replacing `generation_telemetry` cost/timing rollups.
- Storing binary media (TTS audio, still PNGs, MP4) inside this system — those remain in existing buckets; this system stores **request metadata + text/JSON payloads** and **pointers** to media.
- Real-time streaming of tokens to the UI.
- Cross-cloud log shipping (Datadog, etc.) as the source of truth (optional mirror later).

---

## 3. Current state (baseline)

| Layer | What exists today | Gap |
| --- | --- | --- |
| `PipelineTelemetryStep` | summaries, tokens, cost, sizes, optional `provider_request_id` | No prompts, no raw text |
| `package_brief.presentation_generation.generation_telemetry` | successful package steps | Nested in product JSON; no payloads |
| `video_jobs.output.debug.generation_telemetry` | TTS/Whisper/Image/Render steps | No request bodies |
| `production_run_item_failure_telemetry.output_snapshot` | truncated failure forensics | Not full; success path empty |
| Providers (`ClaudeProvider`, `OpenAITextProvider`, …) | return `text` + usage | Request id often not captured (`provider_request_id: null` on live runs) |

Evidence: `docs/architecture/production-run-evidence-fbe48cf4.md` — prompts labeled RECONSTRUCTED; char match vs telemetry `false`.

---

## 4. Design principles

1. **Capture at the wire boundary** — persist what was *about to be sent* and what *came back*, inside the same process tick as the provider call.
2. **One row (or object) per provider attempt** — primary Claude attempt, OpenAI repair, retry attempt = separate records.
3. **Telemetry stays slim** — telemetry references artifact ids; artifacts hold heavy bytes.
4. **Write-ahead of product persist** — artifacts must survive even when package insert fails.
5. **Immutability** — artifacts are append-only; never update prompt/response bodies after insert.
6. **Compress at rest** — large text always compressed; optional offload to Storage beyond inline threshold.
7. **Least privilege** — service-role write; admin/operator read via RLS or server-only API.

---

## 5. Conceptual model

```
TelemetryCollector (session)
        │
        │  step_name, tokens, cost, duration…
        ▼
generation_telemetry.steps[]  ──artifact_ref──►  ai_call_artifacts
                                                      │
                                                      ├─ request (system/user/params)
                                                      ├─ raw_response
                                                      ├─ parse / repair / validate stages
                                                      └─ final_persisted_ref (optional FK/path)

production_run_id ─┐
project_id ────────┼── correlation on every artifact
strategy_item_id ──┤
content_package_id ┤  (nullable until known)
video_job_id ──────┘
```

### Call kinds

| `call_kind` | Examples |
| --- | --- |
| `chat_completion` | Strategy, Video Concept, Opening Impact, Content Package, JSON Repair |
| `tts` | OpenAI speech |
| `transcription` | Whisper |
| `image_generation` | gpt-image-1 stills |
| `image_edit` | future |
| `deterministic` | optional: Visual Identity / Platform Outputs (no provider) — **out of scope for v1** unless needed for chain continuity |

v1 **must** cover all paid provider calls in `generateValidatedJson` + video worker media steps.

### Artifact stages (columns / JSON stages)

For one `chat_completion` attempt:

```
request
  → raw_response          (exact provider text or full HTTP JSON body)
  → parsed_response       (JSON value after safeJsonParse; null if parse fail)
  → repaired_response     (after repairJson; null if no repair)
  → validated_response    (passed validator + guardrails; null if never)
  → final_persisted       (pointer or snapshot of what landed in package_brief / strategy_brief / …)
```

Repair is itself a **separate** `ai_call_artifacts` row (`call_kind=chat_completion`, `role=json_repair`) linked via `parent_artifact_id`.

---

## 6. Capture points (implementation hooks — design only)

### 6.1 Single choke point: `generateValidatedJson`

Today (`lib/ai/runWithRepair.ts`):

1. Builds `effectivePrompt` (may append retry text).
2. Calls `textProvider.complete({ system, prompt, json, temperature, maxTokens, model, … })`.
3. Optionally `repairJson(...)`.
4. Validates schema + guardrails.
5. Aggregates usage onto outer telemetry step.

**Proposed capture**

| Moment | Persist |
| --- | --- |
| Immediately before `complete` | request snapshot: system, user=`effectivePrompt`, model, temperature **as passed**, max_tokens **as passed**, json flag, expectedShape, tools=`[]`, stop=`null` |
| Immediately after `complete` | raw `completion.text`; provider model string; usage; `provider_request_id` if available |
| After `safeJsonParse` | `parsed_response` |
| After successful `repairJson` | spawn child artifact for repair request/response; set parent `repaired_response` |
| After schema+guardrail pass | `validated_response` |
| On workflow persist | patch `final_persisted_object_ref` (not mutate bodies) |

**Important:** Outer telemetry step today aggregates multiple primary attempts. Artifact model stays **1:1 with provider HTTP calls**; telemetry step gains `artifact_ids: uuid[]` (ordered).

### 6.2 Provider layer enrichment

`ClaudeProvider.complete` / `OpenAITextProvider.complete` must return:

```ts
{
  text: string;
  model?: string;
  usage?: …;
  provider_request_id?: string | null;
  // Optional: raw_http_body for full fidelity (Anthropic content array, OpenAI choices, …)
  raw_provider_payload?: unknown;
}
```

Store:

- `raw_response_text` = `completion.text` (what parsers consume today)
- `raw_provider_payload` = full JSON body when available (exact wire response)

If only text is available, set `raw_provider_payload = null` and `raw_response_text` still exact.

**Defaults:** If request omits `temperature` / `maxTokens`, persist:

```json
{
  "temperature": null,
  "temperature_resolved": 0.7,
  "temperature_source": "provider_default",
  "max_tokens": null,
  "max_tokens_resolved": 4096,
  "max_tokens_source": "provider_default"
}
```

Resolved values come from the same constants the provider applies at send time (captured in-process, not re-read later from a different code revision).

### 6.3 Video worker

| Step | Request to store | Raw response |
| --- | --- | --- |
| TTS | voice, model, instructions, input text, format | provider audio metadata + hash of audio bytes; audio stays in storage |
| Whisper | model, language hint, audio hash/path | transcript text **exact**; word timestamps if returned |
| Image | model, size, quality, prompt, reference asset ids | image URL/b64 hash; still path in `video-renders` |
| Render | N/A (local) | optional `deterministic` artifact later |

### 6.4 Failure path

On `generation_failed`, flush all in-memory artifacts for the session **before** claim release, keyed by `production_run_id` + `strategy_item_id` even when `content_package_id` is null.

---

## 7. Database schema (proposed)

### 7.1 Table `ai_call_artifacts`

```sql
create table ai_call_artifacts (
  id uuid primary key default gen_random_uuid(),

  -- correlation
  project_id uuid not null references projects(id),
  production_run_id uuid references production_runs(id),
  production_run_item_id uuid references production_run_items(id),
  strategy_item_id uuid references content_strategy_items(id),
  content_package_id uuid references content_packages(id),
  content_item_id uuid references content_items(id),
  video_job_id uuid references video_jobs(id),
  weekly_strategy_id uuid references content_strategies(id),

  -- identity within pipeline
  telemetry_session_id uuid,              -- from runWithTelemetrySession
  step_name text not null,                -- "Video Concept", "JSON Repair", "TTS", …
  call_kind text not null,                -- chat_completion | tts | transcription | image_generation
  role text not null default 'primary',   -- primary | json_repair | retry
  attempt_index int not null default 1,   -- primary attempt number
  parent_artifact_id uuid references ai_call_artifacts(id),

  -- provider request
  provider text not null,                 -- claude | openai | …
  model text,
  temperature numeric,
  temperature_resolved numeric,
  temperature_source text,                -- request | provider_default
  max_tokens int,
  max_tokens_resolved int,
  max_tokens_source text,
  stop_sequences jsonb,                   -- null or json array
  tools jsonb,                            -- null or []
  response_format text,                   -- e.g. "json"
  schema_name text,                       -- e.g. "videoConceptSchema"
  schema_snapshot jsonb,                  -- optional frozen schema description
  expected_shape text,                    -- exact string passed to repair

  -- prompts (inline or storage pointer)
  system_prompt_storage text not null,    -- 'inline' | 'object'
  system_prompt_inline text,              -- when small
  system_prompt_path text,                -- storage path when large
  system_prompt_sha256 text not null,
  system_prompt_bytes int not null,
  system_prompt_encoding text not null default 'utf8',  -- utf8 | gzip+base64 | gzip+storage

  user_prompt_storage text not null,
  user_prompt_inline text,
  user_prompt_path text,
  user_prompt_sha256 text not null,
  user_prompt_bytes int not null,
  user_prompt_encoding text not null default 'utf8',

  -- responses
  raw_response_text_storage text,
  raw_response_text_inline text,
  raw_response_text_path text,
  raw_response_text_sha256 text,
  raw_response_text_bytes int,
  raw_response_text_encoding text,

  raw_provider_payload jsonb,             -- small; or path if huge
  raw_provider_payload_path text,
  raw_provider_payload_sha256 text,

  parsed_response jsonb,
  repaired_response jsonb,
  validated_response jsonb,

  -- link to product state
  final_persisted_kind text,              -- strategy_brief | package_brief | video_job_output | none
  final_persisted_ref jsonb,              -- { table, id, json_path } or inline small snapshot
  final_persisted_sha256 text,

  -- provider / outcome
  provider_request_id text,
  success boolean not null,
  error_message text,
  validation_errors jsonb,
  duration_ms int,
  prompt_tokens int,
  completion_tokens int,
  cached_tokens int,
  estimated_cost_usd numeric,

  -- lifecycle
  created_at timestamptz not null default now(),
  expires_at timestamptz,                 -- retention
  redaction_level text not null default 'none',  -- none | urls | strict

  constraint ai_call_artifacts_kind_check
    check (call_kind in ('chat_completion','tts','transcription','image_generation','image_edit')),
  constraint ai_call_artifacts_role_check
    check (role in ('primary','json_repair','retry','media'))
);

create index ai_call_artifacts_run_idx
  on ai_call_artifacts (production_run_id, created_at);
create index ai_call_artifacts_package_idx
  on ai_call_artifacts (content_package_id, step_name);
create index ai_call_artifacts_session_idx
  on ai_call_artifacts (telemetry_session_id, created_at);
create index ai_call_artifacts_expires_idx
  on ai_call_artifacts (expires_at)
  where expires_at is not null;
create index ai_call_artifacts_project_created_idx
  on ai_call_artifacts (project_id, created_at desc);
```

### 7.2 Telemetry document extension (additive)

```ts
interface PipelineTelemetryStep {
  // …existing fields…
  /** Ordered artifact ids for provider calls belonging to this step. */
  artifact_ids?: string[];
  /** Convenience: first / primary artifact. */
  primary_artifact_id?: string | null;
}
```

Version bump: `pipeline-telemetry@2` (readers must tolerate missing fields on old docs).

### 7.3 Optional link table (if jsonb on steps is undesirable)

```sql
create table ai_call_artifact_links (
  telemetry_doc_kind text not null,  -- strategy_brief | package_presentation | video_debug
  telemetry_owner_id uuid not null,  -- strategy id / package id / video_job id
  step_name text not null,
  step_started_at timestamptz,
  artifact_id uuid not null references ai_call_artifacts(id),
  primary key (telemetry_owner_id, artifact_id)
);
```

Prefer **embedding `artifact_ids` on the step** for colocated review UX; link table is fallback for failed-before-persist sessions.

### 7.4 Storage bucket

```
bucket: ai-call-artifacts (private)
path:   {project_id}/{yyyy}/{mm}/{artifact_id}/{field}.gz
fields: system_prompt.gz | user_prompt.gz | raw_response_text.gz | raw_provider_payload.json.gz
```

Reuse RLS patterns from `006_storage.sql` (service role write; authenticated admin read via signed URL API).

---

## 8. Inline vs object storage (size policy)

| Payload size (UTF-8 bytes before compress) | Storage |
| --- | --- |
| ≤ 8 KiB | inline `text` / `jsonb` uncompressed |
| 8 KiB – 256 KiB | inline **gzip** as `bytea` **or** `encoding=gzip+base64` in text (prefer `bytea` column variant in migration) |
| > 256 KiB | Storage object gzip; DB keeps path + sha256 + byte lengths |

**Recommended column tweak:** use `bytea` for gzip payloads instead of base64-in-text to save ~33%:

```sql
system_prompt_gzip bytea,
user_prompt_gzip bytea,
raw_response_text_gzip bytea,
```

Keep `*_inline` for tiny uncompressed debug convenience in SQL.

### Compression

- Algorithm: **gzip** level 6 (default) — text prompts compress ~3–5×.
- Always store `sha256` of **uncompressed UTF-8** for integrity and forensic equality checks.
- Never recompress with a different algorithm without a new artifact version.

---

## 9. Size estimates (from live run `fbe48cf4`)

Observed telemetry prompt/completion characters (one successful package):

| Step | Prompt chars | Completion chars |
| --- | ---: | ---: |
| Content Strategy | 18 133 | 778 |
| Video Concept | 17 304 | 5 674 |
| Opening Impact | 20 842 | 704 |
| Content Package | 40 109 | 12 453 |
| **Text subtotal** | **~96 k** | **~20 k** |

Plus systems (~0.5–2 k), expectedShape (~1–3 k), schema snapshot (optional 2–10 k), repair (0 on this run).

| Scope | Uncompressed | gzip (~3.5×) |
| --- | ---: | ---: |
| 1 green package (4 chat calls) | ~120–180 KiB | ~35–55 KiB |
| +1 repair +1 retry (worst text) | ~250–350 KiB | ~70–100 KiB |
| + TTS/Whisper metadata | ~1–5 KiB | ~1 KiB |
| + 5 image prompts (already in package call) | — | — |
| Media binaries | **not** in this budget | existing buckets |

### Monthly projections (assumptions)

| Volume | Uncompressed / mo | gzip / mo |
| --- | ---: | ---: |
| 100 packages | ~15–25 MiB | ~5–8 MiB |
| 500 packages | ~75–120 MiB | ~20–40 MiB |
| 2 000 packages | ~300–500 MiB | ~80–150 MiB |
| + 20% failure attempts retained | ×1.2 | ×1.2 |

JSON jsonb indexes and correlation columns: add ~10–20% Postgres overhead beyond payload.

---

## 10. Storage cost estimate (order of magnitude)

Using public Supabase-class pricing bands as **planning figures** (verify against current plan):

| Component | Rate (illustrative) | 500 pkg/mo gzip ~30 MiB retained 90d |
| --- | --- | --- |
| Postgres row data | included / plan DB disk | negligible at this volume |
| Storage bucket | ~$0.021 / GB-mo | ≪ $0.01 |
| Egress on admin view | ~$0.09 / GB | depends on views; cache signed URLs |
| Extra DB if fully inline uncompressed | DB disk growth | prefer gzip + offload |

**Conclusion:** At Fenrik’s current production volumes, **artifact storage cost is dominated by engineering/ops value, not dollars** — even retaining 180 days of gzip text for 2 000 packages/mo stays well under a few dollars/month in object storage. Cost risk is **Postgres bloat** if large uncompressed texts are inlined without gzip/offload.

---

## 11. Retention policy

| Tier | What | Default TTL | Notes |
| --- | --- | --- | --- |
| **Hot** | All artifacts for runs `created_at` < 30 days | 30 days | Full admin UI |
| **Warm** | Successful production runs | 90 days | Default `expires_at` |
| **Cold** | Failed attempts / validation errors | 180 days | Highest forensic value |
| **Pin** | Manual `pinned=true` (add column) | until unpinned | Client disputes / incidents |
| **Legal hold** | Optional project flag | indefinite | Blocks sweeper |

### Sweeper

- Cron (n8n or `/api/internal/ai-artifact-retention`): delete rows with `expires_at < now()` and `pinned is not true`.
- Delete Storage objects by `*_path` before row delete.
- Never delete telemetry steps — only clear `artifact_ids` refs or leave dangling ids with UI “expired”.

### Sampling (optional cost control)

Feature flag `AI_ARTIFACT_PERSIST_MODE`:

| Mode | Behavior |
| --- | --- |
| `off` | no persistence (status quo) |
| `failures_only` | persist only unsuccessful attempts + their repair children |
| `sample_10` | persist 10% of successful packages + 100% failures |
| `all` | persist everything (recommended until volume forces otherwise) |

---

## 12. Privacy & security

### 12.1 Data classification

Prompts contain: Product Brain, customer website copy, pain points, CTAs, anti-repetition memory of prior content, asset descriptions. Treat as **confidential customer data**.

### 12.2 Access control

- **Write:** service role only (Vercel API routes, content-package worker, video worker).
- **Read:** server-side admin API (`getAiCallArtifact`, `listAiCallArtifactsForRun`) using the same auth gate as run telemetry admin.
- **RLS:** enable RLS; no `anon` policies; `authenticated` only if admin claim exists (match existing admin patterns).
- **Signed URLs:** short TTL (e.g. 60–300s) for Storage objects; never embed long-lived URLs in exports committed to git.

### 12.3 Redaction

Apply on **read/export**, keep raw stored for forensics (or store dual: raw + redacted export view).

Redact:

- Supabase signed URLs
- `Bearer` / JWT / `sk-` keys if ever echoed
- Optional: email/phone if project requests `redaction_level=strict`

Record `redaction_level` on export jobs, not by mutating artifacts.

### 12.4 Encryption

- At rest: Supabase disk encryption (platform default).
- No application-level encryption in v1 (key management cost); revisit if multi-tenant hard isolation required beyond RLS.

### 12.5 PII / training leakage

- Artifacts must **not** be sent back into prompts automatically.
- Retention sweeper is the primary minimization control.
- Document in privacy policy / DPA that generation logs may retain prompts for N days.

---

## 13. Linkage to generation telemetry

```
runWithTelemetrySession()
  → TelemetryCollector.sessionId = uuid
  → each withTelemetry / generateValidatedJson call
       → insert ai_call_artifacts (sessionId, step_name, …)
       → step.artifact_ids.push(id)
  → buildGenerationTelemetryDocument({ steps })
  → persist into strategy_brief / presentation_generation / video debug
```

**Failed sessions:** persist telemetry document onto `production_run_item_failure_telemetry.generation_telemetry` (already planned) **and** ensure artifacts were flushed with `production_run_item_id`.

**Regenerate:** new session id; prior artifacts remain; new rows reference same `content_package_id` with new `telemetry_session_id`.

**Idempotent reuse** (existing package returned, no AI): no new artifacts.

---

## 14. Admin UI

### 14.1 Entry points

1. **Production run → Telemetry panel**  
   Each step row: tokens / $ / duration (existing) + button **“View call”** when `artifact_ids.length > 0`.

2. **Package review → Presentation / pipeline**  
   Per stage (Concept / Opening / Package): open artifact viewer.

3. **Failed run item**  
   Direct list of artifacts by `production_run_item_id` even without package.

### 14.2 Artifact viewer (layout)

```
Header: step_name · provider · model · attempt · success · duration · cost · request_id

Tabs:
  [Request]  system | user | params (temp, max_tokens, stop, tools, schema, expectedShape)
  [Raw]      exact raw_response_text (+ toggle raw_provider_payload)
  [Parsed]   parsed_response
  [Repaired] repaired_response (or “no repair”)
  [Validated] validated_response
  [Persisted] final_persisted ref + deep link to package_brief path
  [Children]  linked repair/retry artifacts
```

Diff tab (optional v2): validated vs final_persisted (hook align, URL append, normalize).

### 14.3 Permissions

Same as existing run telemetry admin (`lib/api/run-telemetry-admin.ts` pattern). No client-side direct Storage list.

---

## 15. Production run export

Extend forensic export (successor to `scripts/export-production-run-audit.ts` / evidence dump):

```
GET /api/admin/production-runs/:id/evidence
  ?include=artifacts
  &mode=redacted|raw
```

Output bundle:

```
evidence/
  run.json
  telemetry/
    strategy_steps.json
    package_steps.json
    video_steps.json
  artifacts/
    {artifact_id}/
      meta.json          # all columns except large bodies
      system_prompt.txt  # decompressed
      user_prompt.txt
      raw_response.txt
      parsed.json
      repaired.json
      validated.json
      raw_provider_payload.json
  MANIFEST.json          # sha256 of each file
```

Export must state: **`source: runtime_artifacts`** (never `reconstructed`).

Zip size estimate: ~50–150 KiB gzipped text per green package; pin retention before export if near TTL.

---

## 16. Consistency with final persisted objects

Product pipeline mutates after validation:

| Transform | Where | Artifact field |
| --- | --- | --- |
| Hook align to Opening Impact | `runContentPackage.ts` | validated ≠ final |
| `normalizeVisualScenePlan` / `normalizeImagePrompts` | creative pipeline | validated ≠ final |
| URL append on X variants | `generateContentPackage` persist | package_brief vs content_items |
| Voice / profile stamps | presentation_generation | added after AI |

**Rule:**  
- `validated_response` = model output that passed validators.  
- `final_persisted_object_ref` points at post-transform product JSON (or stores sha256 + json_path).  
- Do **not** overwrite `validated_response` with post-transform data.

Optional v2: store `postprocess_delta` JSON-patch for exact morph.

---

## 17. Media calls (TTS / Whisper / Image)

| Field mapping | TTS | Whisper | Image |
| --- | --- | --- | --- |
| system | null | null | null |
| user / input | voiceover text + instructions | audio path/hash | image_prompt |
| raw_response_text | null or transcript of request echo | transcript | null |
| raw_provider_payload | provider JSON metadata | full whisper JSON | provider JSON (no b64 if large — store hash) |
| validated_response | { duration_s, voice } | { words?, text } | { path, bytes_sha256 } |

Exact audio/image bytes remain in `video-renders` / temp; artifact stores **content hash** so forensic equality is provable.

---

## 18. Rollout plan (phases — still design)

| Phase | Scope |
| --- | --- |
| **P0** | Schema + Storage bucket + write path in `generateValidatedJson` + provider request ids |
| **P1** | Flush on failure; link `artifact_ids` into telemetry; admin viewer read API |
| **P2** | Video worker TTS/Whisper/Image |
| **P3** | Export bundle; retention sweeper; pin |
| **P4** | Diff validated→persisted; sampling modes |

Feature flag default: `failures_only` in first production week, then `all` for Fenrik project, then global `all` or `sample` by cost.

---

## 19. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Write latency on critical path | Async insert after provider returns, but **await** before claim release / process exit; queue buffer in-memory per session |
| Double cost of large jsonb | gzip + 256 KiB offload threshold |
| Prompt builder drift vs history | Eliminated by this design — runtime bytes only |
| Missing request id | Fix providers to parse Anthropic/OpenAI response headers/body ids |
| PII retention | TTL + pin + export redaction |
| Incomplete capture if code throws pre-insert | `try/finally` flush of session buffer |
| Schema snapshot huge | Store `schema_name` + version hash; full snapshot optional |

---

## 20. Success criteria

A production run evidence export can state for every AI call:

1. Exact system + user prompts with sha256 matching the bytes sent.  
2. Exact raw response text with sha256.  
3. Parsed / repaired / validated stages without reconstruction.  
4. Pointer to final persisted product object.  
5. Telemetry step ↔ artifact id join works for success **and** failure.  
6. Zero reliance on `build*Prompt()` at audit time.

---

## 21. Open decisions (to resolve before implementation)

1. Inline `bytea` gzip vs Storage-first for all prompts > 8 KiB?  
2. Persist full Anthropic/OpenAI HTTP JSON (`raw_provider_payload`) always, or text-only + id?  
3. Default mode `all` vs `failures_only` for first ship?  
4. Should deterministic steps (Visual Identity) get lightweight artifacts for chain continuity?  
5. Cross-region retention / EU-only storage requirements?

---

## 22. Related documents

- `docs/architecture/production-run-evidence-fbe48cf4.md` — demonstrates reconstruction gap  
- `docs/architecture/post-run-review-fbe48cf4.md` — operational findings  
- `docs/audits/observability.md` — correlation model  
- `lib/ai/telemetry/types.ts` — current slim telemetry contract  
- `lib/ai/runWithRepair.ts` — primary capture choke point  
- `supabase/migrations/028_failure_telemetry_audit.sql` — existing truncated failure snapshots  

---

**End of proposal. No code or schema migrations were applied.**
