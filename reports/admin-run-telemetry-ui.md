# Admin Run Telemetry UI

## 1. Files changed

| File | Role |
|---|---|
| `lib/production-runs/aggregateRunTelemetry.ts` | Merge/sort/summarize steps from strategy + package + video job |
| `lib/api/run-telemetry-admin.ts` | Lazy DB loader for one production run |
| `app/projects/[id]/review/actions.ts` | Server action `loadRunTelemetryAction` |
| `components/review/RunTelemetryPanel/RunTelemetryPanel.tsx` | Expandable Telemetry panel UI |
| `components/review/RunTelemetryPanel/RunTelemetryPanel.module.css` | Compact admin styles |
| `components/review/ReviewRunSection/ReviewRunSection.tsx` | Mount panel under each run card |
| `scripts/check-run-telemetry-ui.ts` | Unit verification (no network) |
| `package.json` | Script `check:run-telemetry-ui` |
| `reports/admin-run-telemetry-ui.md` | This report |

No database migration.

## 2. UI placement

Route: `/projects/[projectId]/review`

Inside each expanded production run (`ReviewRunSection`), after `ReviewRunCard` and before `RunInsightsPanel`:

**Telemetry** — same expandable pattern as **Run Insights** (▶ / ▼ toggle).

Opening loads data once via server action; closed by default so initial page load is unchanged.

### Summary (when `steps[]` present)

- Total run duration  
- Total recorded telemetry duration  
- AI duration  
- Video pipeline duration  
- Estimated AI cost  
- Step / failed / retry counts  
- Slowest step  
- Slowest provider  

### Timeline

Chronological rows: step name, duration, provider, ok/fail, cost (if any), retry/repair pills.  
Each row expands to field detail (no full prompts/responses).

## 3. Data loading

Lazy only when the Telemetry section is opened:

1. `loadRunTelemetryAction(projectId, productionRunId)`  
2. Verifies project via `getProjectForAdmin`  
3. `loadProductionRunTelemetry` reads:

| Source | Path |
|---|---|
| Strategy | `content_strategies.strategy_brief.generation_telemetry` where `strategy_brief.production_run_id` matches |
| Package | `content_packages.package_brief.presentation_generation.generation_telemetry` for packages linked via `content_items.generation_metadata.production_run_id` |
| Video job | `video_jobs.output.debug.generation_telemetry` for newest job per primary content item |

Selects only the columns needed (`id` + brief/output JSON), not full review payloads.

## 4. Telemetry aggregation

`mergeRunTelemetrySteps`:

- Collects steps from all three sources  
- Filters by nested `production_run_id` when present  
- Tags each step with `source` (`strategy` \| `package` \| `video_job`) plus `packageId` / `videoJobId` / `strategyId`  
- Sorts by `started_at`  
- Summarizes AI vs video-pipeline duration (worker sources + image/tts/whisper/video providers)  
- Sums `estimated_cost` when any step has it  

## 5. Empty states

If merged `steps.length === 0`:

> No detailed telemetry was recorded for this run.

Not treated as an error (historical runs without `steps[]`).

## 6. Verification

| Scenario | Result |
|---|---|
| Full telemetry (synthetic multi-package + worker) | Pass — chronological order, costs, retries, repairs, slowest step/provider |
| Historical run without `steps[]` | Pass — empty state; live load of `f5a7794e-…` returns `hasDetailedSteps: false` |
| Failed telemetry step | Pass — `failedStepCount` + fail badge |
| Repaired step | Pass — repair pill |
| Multiple packages in one run | Pass — both package IDs retained on steps |
| Worker telemetry included | Pass — TTS / Image / Video rendering from `video_job` |
| Chronological ordering | Pass |
| Total cost / duration calculation | Pass |
| Unit script | `npm run check:run-telemetry-ui` → **6 checks passed** |

## 7. Rendered component description

```
┌─ Run · 20.07.2026 20:05  [completed] ──────────────┐
│  [ReviewRunCard: id, duration, packages, …]         │
│                                                     │
│  ▶ Telemetry                                        │
│  ▶ Run Insights                                     │
│  ▼ Package …                                        │
└─────────────────────────────────────────────────────┘

When Telemetry expanded with data:

┌─ ▼ Telemetry ───────────────────────────────────────┐
│  SUMMARY                                            │
│  Total run … | Recorded … | AI … | Video … | Cost … │
│  Steps … | Failed … | Retries …                     │
│  Slowest step: Video rendering (390.6 s)            │
│  Slowest provider: video (390.6 s)                  │
│                                                     │
│  TIMELINE                                           │
│  ▶ Weekly Strategy          18.2 s   claude   ok    │
│  ▶ Creative Candidates      11.8 s   determ.  ok    │
│  ▶ Presentation Generation  24.6 s   claude   ok $  │
│  ▼ Concept Fidelity Repair   5.0 s   claude   ok    │
│      provider / model / tokens / cost / summaries…  │
│  ▶ TTS                       6.4 s   tts      ok    │
│  ▶ Image generation         71.5 s   image  fail    │
│  ▶ Video rendering         390.6 s   video    ok    │
└─────────────────────────────────────────────────────┘
```
