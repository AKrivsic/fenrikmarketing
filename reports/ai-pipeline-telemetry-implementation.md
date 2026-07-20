# AI Pipeline Telemetry Implementation

**Mode:** additive instrumentation only.  
**Constraint:** no prompt changes, no model/output changes, no control-flow changes except non-critical best-effort telemetry patches after successful persist.

---

## 1. Files changed

### New

| Path | Role |
| --- | --- |
| `lib/ai/telemetry/types.ts` | Step + document schema |
| `lib/ai/telemetry/collector.ts` | AsyncLocalStorage session |
| `lib/ai/telemetry/withTelemetry.ts` | `withTelemetry` / `withTelemetrySync` |
| `lib/ai/telemetry/usage.ts` | Token extraction + byte/char sizes |
| `lib/ai/telemetry/cost.ts` | Approximate USD cost estimates |
| `lib/ai/telemetry/summaries.ts` | Compact input/output summaries |
| `lib/ai/telemetry/persist.ts` | Merge steps into `generation_telemetry` |
| `lib/ai/telemetry/formatAudit.ts` | Technical audit markdown tables |
| `lib/ai/telemetry/index.ts` | Public exports |
| `scripts/check-pipeline-telemetry.ts` | Unit checks (no network) |
| `reports/ai-pipeline-telemetry-implementation.md` | This document |

### Modified

| Path | Change |
| --- | --- |
| `lib/ai/types.ts` | Optional `usage` on `TextCompletionResult` |
| `lib/ai/claude.ts` | Forward Anthropic usage into result |
| `lib/ai/openai.ts` | Forward OpenAI chat usage into result |
| `lib/ai/runWithRepair.ts` | Optional `telemetry` on `generateValidatedJson` |
| `lib/ai/workflows/generateContentPackage.ts` | Session + step instrumentation + persist steps |
| `lib/ai/workflows/planContentStrategy.ts` | Weekly Strategy / Strategy Items telemetry |
| `lib/ai/workflows/persistProductionStrategyPlan.ts` | Optional `generationTelemetry` on strategy_brief |
| `video-worker/services/tts.ts` | TTS step |
| `video-worker/services/wordTimestamps.ts` | Whisper step |
| `video-worker/services/images.ts` | Image generation step |
| `video-worker/jobRunner.ts` | Session + Video rendering + debug.generation_telemetry |
| `scripts/audit-production-run.ts` | Nested timing + cost/size/provider tables |
| `package.json` | `check:pipeline-telemetry` |
| `reports/production-run-technical-audit.md` | Documents new nested audit format |

---

## 2. Telemetry schema

Each chronological step (`PipelineTelemetryStep`):

| Field | Type | Notes |
| --- | --- | --- |
| `step_name` | string | e.g. `Presentation Generation` |
| `provider` | string \| null | `claude`, `openai`, `tts`, `whisper`, `image`, `video`, `deterministic`, … |
| `model` | string \| null | When known |
| `started_at` / `finished_at` | ISO string | Wall clock |
| `duration_ms` | number | Inclusive of retries inside the wrapped call |
| `success` | boolean | Soft failures supported via `successFromResult` |
| `retry_count` | number | e.g. `attempts - 1` for LLM JSON |
| `repair` | boolean | Fidelity/story repair regenerates |
| `input_size_bytes` / `output_size_bytes` | number \| null | UTF-8 of measured payloads |
| `prompt_characters` / `completion_characters` | number \| null | |
| `prompt_tokens` / `completion_tokens` / `cached_tokens` | number \| null | From provider usage when present |
| `estimated_cost` | number \| null | USD estimate (list pricing approximation) |
| `temperature` / `max_tokens` / `response_format` | … \| null | Call parameters when applicable |
| `warnings` | string[] | Soft diagnostics |
| `error_message` | string \| null | Truncated |
| `input_summary` / `output_summary` | string \| null | Compact — never full prompts |

Document version: `pipeline-telemetry@1`.

---

## 3. Wrapper architecture

```
runWithTelemetrySession(async () => {
  // AsyncLocalStorage collector active
  await withTelemetry({ stepName, provider, ... }, async () => {
    // AI or deterministic work — return value unchanged
  });
  withTelemetrySync({ stepName }, () => { /* pure */ });
});
```

- **No collector active** → wrappers are passthrough (negligible overhead).
- **Errors** → step recorded with `success: false`, original error rethrown.
- **Soft failures** (e.g. `{ ok: false }`) → `successFromResult` maps without throwing.
- `generateValidatedJson({ telemetry: { stepName, … } })` records one step covering all attempts + JSON repair usage accumulation.

---

## 4. Persisted format

### Package (`content_packages.package_brief.presentation_generation.generation_telemetry`)

Backwards-compatible merge:

```json
{
  "version": "pipeline-telemetry@1",
  "strategy_item_id": "…",
  "production_run_id": "…",
  "full_package_generations": 1,
  "fidelity_first_pass_passed": true,
  "fidelity_first_pass_failure_reasons": [],
  "fidelity_final_passed": true,
  "hook_deterministic_enforce_reason": null,
  "candidate_repair_reasons": [],
  "phases": [
    { "phase": "fidelity_repair", "latency_ms": 12345, "provider": "anthropic", "ok": true }
  ],
  "steps": [ /* PipelineTelemetryStep[] chronological */ ]
}
```

Legacy fields (`phases`, fidelity counters, …) preserved. New field: `steps`.

### Strategy (`content_strategies.strategy_brief.generation_telemetry`)

Same `version` + `steps` shape (optional; additive on jsonb).

### Video job (`video_jobs.output.debug.generation_telemetry`)

Worker session steps: TTS, Whisper, Image generation, Video rendering.

---

## 5. Example telemetry object

```json
{
  "step_name": "Presentation Generation",
  "provider": "claude",
  "model": "claude-sonnet-4-6",
  "started_at": "2026-07-20T18:06:10.000Z",
  "finished_at": "2026-07-20T18:06:34.600Z",
  "duration_ms": 24600,
  "success": true,
  "retry_count": 0,
  "repair": false,
  "input_size_bytes": 48210,
  "output_size_bytes": 19244,
  "prompt_characters": 47102,
  "completion_characters": 18801,
  "prompt_tokens": 11240,
  "completion_tokens": 4280,
  "cached_tokens": 0,
  "estimated_cost": 0.098,
  "temperature": null,
  "max_tokens": null,
  "response_format": "json",
  "warnings": [],
  "error_message": null,
  "input_summary": "Presentation Generation input:\n- Narrative Beats\n- Creative Identity\n- Strategy Item\n- Product Brain",
  "output_summary": "Storyboard\nVoiceover\nScenes\nCTA\nPlatform Outputs"
}
```

Typical package step order:

1. Creative Candidates  
2. Candidate Judge  
3. Narrative Beats  
4. Presentation Generation  
5. Hook Enforcement  
6. Concept Fidelity  
7. (optional) Concept Fidelity Repair  
8. Story Integrity  
9. (optional) Story Integrity Repair  
10. Product Demonstration Integrity  
11. Platform Outputs  
12. Persist Package  

Worker (separate process / job debug):

13. TTS  
14. Whisper  
15. Image generation  
16. Video rendering  

---

## 6. Example production audit

`scripts/audit-production-run.ts` now emits:

```
Package generation
132.6 s

↓

Creative Candidates
11.8 s

↓

Candidate Judge
0.0 s

↓

Narrative Beats
0.0 s

↓

Presentation Generation
24.6 s

↓

…
```

Plus tables:

- **Execution Time** — Step | Duration | %  
- **AI Cost** — Step | Prompt tok | Completion tok | Estimated $  
- **Prompt Sizes** — Step | Prompt KB | Output KB  
- **Providers** — Claude / OpenAI / Whisper / TTS / Image / Video / Deterministic  

Historical run `f5a7794e-…` predates `steps[]`; audit falls back to “No per-step telemetry”.

---

## 7. Backwards compatibility

| Concern | Handling |
| --- | --- |
| Existing packages without `steps` | `readTelemetrySteps` → `[]`; audits show empty-state note |
| Legacy `phases` | Still written for fidelity/story repair |
| `generateValidatedJson` callers | New `telemetry?` optional; omitted → no step |
| TextCompletionResult | Optional `usage` only |
| Strategy brief | Extra jsonb key; readers ignore unknown fields |
| Video job debug | Extra `generation_telemetry` key under existing debug object |
| AI prompts / outputs / validators | Untouched |
| Persist | Best-effort second UPDATE of telemetry only after success; failure ignored |

---

## 8. Verification

| Check | Result |
| --- | --- |
| `npm run check:pipeline-telemetry` | **10 passed** |
| `npm run check:json-repair-runner` | **14 passed** |
| `npx tsc --noEmit` | **pass** |

Manual / next production run:

1. Generate one package.  
2. Confirm `package_brief.presentation_generation.generation_telemetry.steps` is a non-empty chronological array.  
3. Confirm strategy_brief / video_jobs.debug telemetry when those stages run.  
4. Run `npx tsx scripts/audit-production-run.ts <run_id>` and inspect nested timing tables.

---

## 9. Performance overhead

| Layer | Overhead |
| --- | --- |
| No active session | One `AsyncLocalStorage.getStore()` null check per wrap |
| Active session | Date.now ×2, optional `JSON.stringify`/`Buffer.byteLength` for measured payloads, push to in-memory array |
| Cost estimate | Pure arithmetic when tokens present |
| Persist patch | One best-effort SELECT+UPDATE of package_brief telemetry after success (does not alter content fields) |

Expected wall-clock impact on a ~130s package generation: **≪ 50 ms** total (excluding the optional persist patch network RTT).

---

## Instrumented pipeline map

| Step | Where |
| --- | --- |
| Weekly Strategy | `planContentStrategy` → Claude via `generateValidatedJson` |
| Strategy Items | Persist strategy plan (deterministic) |
| Creative Candidates | `planCreativeCandidatesForPackage` |
| Candidate Judge | Selection diagnostics marker |
| Narrative Beats | `deriveNarrativeBeats` |
| Presentation Generation | Main package Claude call |
| Hook Enforcement | `enforceCandidateHook` |
| Concept Fidelity | `checkConceptFidelity` |
| Concept Fidelity Repair | Repair Claude call (`repair: true`) |
| Story Integrity | `validateStoryIntegrity` |
| Story Integrity Repair | Repair Claude call |
| Product Demonstration Integrity | `validateProductDemonstrationIntegrity` |
| Platform Outputs | Marker over `platform_outputs` |
| Persist Package | `persistNewPackage` |
| TTS / Whisper / Image / Video rendering | Video worker |

Translation / localize flows can adopt the same `telemetry:` option on `generateValidatedJson` without further schema changes.
