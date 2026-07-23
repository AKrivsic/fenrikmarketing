# Business Cost Accounting Audit

**Method:** code-trace only  
**Date:** 2026-07-23  
**Scope:** production cost accounting accuracy  
**Constraint:** no schema/behavior changes (audit only)

**Verdict:** PARTIALLY IMPLEMENTED · Package cost: PARTIAL · Not billing truth

> **Update (2026-07-23 implementation):** P0/P1 gaps from this audit were addressed in-repo (telemetry extensions, media `estimated_cost`, failed-attempt persistence, regen history, localization, run rollups). See `supabase/migrations/027_business_cost_accounting.sql` and `npm run check:business-cost-accounting`. Remaining limitations: list-price estimates (not invoices), render/infra still unmetered, no customer margin.

---

## Executive Summary

The system can estimate Claude/OpenAI-chat spend for completed primary packages and roll that into a run-level “Est. AI cost”. It cannot accurately answer full production cost (images, TTS, Whisper, render, failed attempts, regenerations, translations, infra) without offline reconstruction and approximations.

| Unit | Status |
|------|--------|
| Provider request | PARTIAL |
| Package total | PARTIAL |
| Video total | NO |
| Customer / margin | NO |

Provider = step-aggregated (not per HTTP). Package = AI text yes, media null. Video/customer = not metered in product.

---

## 1. Provider Coverage

Source: `lib/ai/telemetry/cost.ts`, `withTelemetry.ts`, `openai.ts`, `claude.ts`, video-worker services.

| Provider | Tracked? | Price source | Storage | Confidence |
|----------|----------|--------------|---------|------------|
| Claude (Anthropic Messages) | Yes — tokens + est. $ | Hardcoded list rates /1M tok | `generation_telemetry.steps` on strategy + package | Medium (list ≠ invoice) |
| OpenAI Chat (JSON repair) | Partial — tokens merged into step | Same table (gpt-4o / mini) | Folded into parent step usage | Low (model overwrite risk) |
| OpenAI Images (gpt-image-1) | Step only; cost = null | Offline scripts $0.042–$0.07/still | `video_jobs.output.debug.generation_telemetry` | Low |
| OpenAI TTS (gpt-4o-mini-tts) | Step only; cost = null | Offline ~$0.015/1k chars | Same worker telemetry | Low |
| OpenAI Whisper (whisper-1) | Step only; cost = null | Offline ~$0.006/min | Same worker telemetry | Low |
| FFmpeg / worker CPU | Duration only; cost = null | None metered | Worker step “Video rendering” | None |
| ElevenLabs / fal / Replicate | N/A — not on path | — | — | — |
| Supabase storage / DO droplet | No | None | None | None |

### Provider collection detail

| Question | Claude / chat | Image / TTS / Whisper | Render |
|----------|---------------|------------------------|--------|
| Where executed? | `lib/ai/claude.ts`, `openai.ts` via workflows | video-worker images/tts/wordTimestamps | video-worker ffmpeg via jobRunner |
| Usage collected? | Yes from provider usage JSON | No usage → tokens null | Duration diagnostics only |
| Price calculated? | `estimateTokenCostUsd` at step write | Never in prod path | Never |
| Stored? | `steps[].estimated_cost` | steps exist; `estimated_cost` null | `estimated_cost` null |
| Estimated or exact? | Estimated list price | Unmetered in product | Unmetered |
| Retry duplicate records? | No — retries summed into one step | New job = new telemetry doc | Same |
| Failed requests recorded? | Throw → step `success=false`, cost null; package fail often not persisted | Failed job may lack final debug blob | Cancel/fail may omit cost-bearing steps |

---

## 2. Cost Model Accuracy

### What pricing is based on

Hardcoded approximate public list rates in `lib/ai/telemetry/cost.ts`. File header: “Estimates only — not billing truth.”

- Claude Sonnet $3 / $15 / $0.30
- gpt-4o $2.5 / $10 / $1.25
- gpt-4o-mini $0.15 / $0.60 / $0.075

Per 1M tokens. Image/TTS/Whisper entries exist but are unused by the worker path (no tokens passed).

### Accuracy risks in the model

- Rates drift silently when providers change prices
- Anthropic `cache_creation` treated like `cache_read` (underprices writes)
- JSON-repair tokens merged; last model wins → mispriced mix
- `gpt-image-1` token rate in table is not real image billing
- Whisper “per minute” rate wrongly shaped as /1M tokens if used
- Transport retries that fail before response leave no usage

---

## 3. Workflow Coverage

| Workflow | Tracked | Package | Video | Run | Visible |
|----------|---------|---------|-------|-----|---------|
| Weekly / production strategy | Yes | — | — | Yes (`strategy_brief`) | Review RunTelemetry |
| Creative Engine (directions/ideation/critic/DNA) | Yes (under generate) | Yes | — | Via package | Step timeline + $ |
| Presentation Generation | Yes | Yes | — | Via package | Yes |
| Repair Delta (fidelity/story/PDI) | Yes (`repair=true` steps) | Yes | — | Via package | Repair pill + $ |
| Hook uniqueness / enforcement | Partial (deterministic or AI) | Yes if AI | — | Via package | If metered |
| Regenerate package | No session / no steps | Overwrites; no new $ | New job only | Lost from current brief | No regen cost UI |
| Localization / language variants | No telemetry option | No | Variant jobs excluded from run loader | No | No |
| Storyboard | Deterministic (no AI $) | N/A | N/A | N/A | Duration only if wrapped |
| Image generation | Step, $ null | Via video job | Yes | Newest job only | Step; no $ |
| TTS + Whisper + FFmpeg | Step, $ null | Via video job | Yes | Newest job only | Step; no $ |
| Scene editor image regen | No accounting | No | No | No | No |
| Subtitles | Whisper step only | Via video | Yes | Partial | No $ |

---

## 4–6. Cost Attribution Matrix

| Unit | Can calculate? | Notes |
|------|----------------|-------|
| Provider request | PARTIAL | One step = N validation + repair completes; not 1:1 HTTP |
| Workflow step | YES (AI text) | `steps[].estimated_cost` when tokens present |
| Video | NO (product) | Offline list-price approx possible from counts/chars |
| Package | PARTIAL | Completed primary: AI $ yes; media + fails + regen missing |
| Production run | PARTIAL | Sum of stored AI $; undercounts media/variants/fails |
| Customer / order | NO | No order cost entity; sample revenue is intake form only |
| Historical (price change) | PARTIAL | Stored est. $ stable; token reprice / script media rates drift |

### Package breakdown

- By step: YES (AI)
- By provider: PARTIAL (label + model)
- By retry: PARTIAL (`retry_count`; no per-attempt $)
- By language: NO
- By regeneration: NO

### Video breakdown

- AI: N/A on worker
- Images/voice/render: unmetered $
- Repair: N/A
- Retries: separate jobs; UI keeps newest
- Variants: not in run aggregate

### Run breakdown

- Total AI est.: YES in Review UI
- Avg/package: computable offline
- Avg/video: incomplete
- Provider/workflow: from steps
- Failed spend: mostly invisible

---

## 7–10. Retries, Regeneration, Translation, Rendering

### Retry accounting

Validation retries accumulate tokens into one step and set `retry_count`. Cost increases correctly for that step total; original attempts are not separately stored. Soft-fail steps keep combined usage when `ok=false` after attempts. Hard throws: cost null. Transport retries that never return JSON leave no usage.

Does not double-count as separate rows; does hide per-attempt economics.

### Regeneration accounting

`regenerateContentPackage` does not open a telemetry session and rebuilds `presentation_generation` without `generation_telemetry`. Prior brief (with costs) is snapshotted into `content_versions` incidentally — not queried by cost UI. Lifetime / published / regen-delta costs are not first-class.

### Translation accounting

`localizeContentPackage` calls `generateValidatedJson` without telemetry. Variant video jobs omit `production_run_id` linkage used by run loader (`language IS NULL` filter). Extra language costs are not separately visible.

### Rendering accounting

Worker records duration and debug duration fields. No CPU-seconds pricing, no droplet hourly rate, no storage byte-cost. Offline audits set render stage cost = 0. Estimation methodology for media $ lives only in audit scripts, not production.

---

## 11. Storage Model

| Location | What | Role |
|----------|------|------|
| `content_strategies.strategy_brief.generation_telemetry` | Strategy AI steps + est. $ | Source for run strategy cost |
| `content_packages.package_brief.presentation_generation.generation_telemetry` | Package AI pipeline steps + est. $ | Primary package AI SoT |
| `video_jobs.output.debug.generation_telemetry` | Image/TTS/Whisper/Render steps ($ null) | Video activity SoT (not $) |
| `production_run_item_failure_telemetry` | Bounded failure row; `estimated_cost_usd` column | Rarely populated with $ today |
| `production_run_items.failure_telemetry` | Bounded JSON (no $ fields copied) | Operator hint, not ledger |
| `content_versions.snapshot` | Pre-regen package row | Incidental historical AI $ only |
| Dedicated cost ledger / run.cost columns | Absent | No single financial SoT |

**Aggregation strategy:** On-demand merge in `loadProductionRunTelemetry` → sum `estimated_cost` where present. No materialized run total. Duplication risk low for completed packages; gap risk high for failed/regenerated/variant paths.

---

## 12–14. Historical Accuracy, Missing Sources, Reporting

### Historical accuracy

Yesterday’s package AI $ stored in JSON remains the same if Claude doubles rates next month — UI reads `estimated_cost`, does not reprice.

Recomputing from tokens with updated `RATES`, or re-running cost-trace scripts with new `IMAGE_USD` / TTS constants, would silently change reconstructed reports. No provider invoice IDs stored.

### Missing paid sources

- Image / TTS / Whisper dollar metering
- FFmpeg / DO worker compute
- Supabase/Vercel storage & egress
- Failed package AI (no steps persist)
- Localization Claude calls
- Regenerate package AI
- Scene-editor image edits
- Variant video jobs in run rollup
- Transport-failed HTTP attempts
- n8n / callback / background infra

### Business questions the system can answer today

| Question | Answer |
|----------|--------|
| Package #123 cost? | PARTIAL — AI est. if completed & not regenerated |
| Video #456 cost? | NO — activity yes, $ no |
| Run #789 cost? | PARTIAL — AI sum only |
| Avg package last month | PARTIAL offline from telemetry |
| Avg image / CE / repair / regen | CE/repair AI yes; image/regen no |
| Cost per provider / project / customer | Provider partial; customer no |
| Gross margin | NO — no revenue COGS join |

---

## 15. Existing UI

| Surface | Cost visibility |
|---------|-----------------|
| Review → RunTelemetryPanel | Est. AI cost summary + per-step $ when non-null |
| Content production panel | No cost fields |
| Admin / finance dashboard | None dedicated |
| Database JSON / failure table | Primary ledger; operator-facing only via Review |
| Audit scripts (cost-trace, compare-runs) | Offline reconstructed totals incl. media estimates |
| Worker / app logs | Durations; not a cost ledger |

---

## Recommendations (do not implement)

### P0 — Required

1. Persist `generation_telemetry` (with costs) on failed package attempts
2. Set `estimated_cost` for Image/TTS/Whisper from usage or list formulas at write time
3. Open telemetry session for regenerate + localize; don’t erase prior costs without versioned ledger
4. Fix JSON-repair cost mix (separate steps or per-provider pricing)

### P1 — Useful

1. Include language-variant jobs in run cost rollup
2. Keep all `video_jobs` (retries), not only newest
3. Snapshot `rates_version` + raw usage + request IDs
4. Populate `failure_telemetry.estimated_cost_usd`
5. Package / video cost rollup fields or views

### P2 — Nice to have

1. Meter DO worker CPU-seconds + storage bytes
2. Customer order / margin reporting
3. Finance UI (avg CE, repair, regen, image)
4. Per-attempt cost rows inside retries
5. Invoice reconciliation import

---

## Final Verdict

**PARTIALLY** — “What did this package actually cost to produce?”

For a completed, never-regenerated primary package you can get a credible AI-text estimate from persisted telemetry. You cannot get an accurate all-in production cost (media + compute + failed attempts + regenerations + translations) from the product today without manual reconstruction and assumptions.

**Evidence anchors:** `lib/ai/telemetry/cost.ts` (“not billing truth”); worker `withTelemetry` without `estimatedCostFromResult`; run loader `language IS NULL` + newest video job; regenerate without `runWithTelemetrySession`; localize without telemetry; cost-trace `c8dd3caf` gaps (failed packages, media `$` null, render = 0).
