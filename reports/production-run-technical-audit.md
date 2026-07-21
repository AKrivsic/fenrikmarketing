# Production Run Technical Execution Audit

**Mode:** read-only facts from database, n8n execution, and Vercel runtime logs.  
**No code changes. No recommendations.**

| Field | Value |
|---|---|
| Production run ID | `f5a7794e-c1a8-4d6b-82c9-500a8d3e9f88` |
| Project | Fenrik.chat (`aabab9ff-9db4-4012-a53c-135e3bfea6cd`) |
| Deployment (live during run) | `dpl_33gCT9mmAtu8ArXcNkF5tPmUTtcw` (READY @ 2026-07-20T18:01:52.939Z) |
| Run status | `completed` |
| Package count | 1 |
| Requested / generated / failed | 1 / 1 / 0 |
| Total wall duration | **536.203 s** (8m 56.203s) |
| Run created_at | 2026-07-20 18:05:36.426255+00 |
| Run updated_at (terminal) | 2026-07-20 18:14:32.628915+00 |
| error_message | null |

---

## 1. production_run

| Field | Value |
|---|---|
| id | `f5a7794e-c1a8-4d6b-82c9-500a8d3e9f88` |
| status | completed |
| package_count | 1 |
| requested_total | 1 |
| generated_total | 1 |
| failed_total | 0 |
| requested_config.plan.packageCount | 1 |
| requested_config.plan.videoCount | 1 |
| requested_config.plan.videoOutputsTotal | 3 |
| requested_config.plan.textOutputsTotal | 8 |
| requested_config.plan.totalOutputs | 11 |
| requested_config.plan.activeVideoPlatforms | tiktok, instagram, youtube |
| platforms | tiktok, instagram, facebook, youtube, linkedin, x |
| multipliers | x:5, linkedin:1.5, others:1 |

---

## 2. production_run_items

| Field | Value |
|---|---|
| id | `d075fcdb-736d-4d03-8552-d2b8f3b3abec` |
| platform | tiktok |
| content_type | video |
| status | completed |
| content_package_id | `31878924-d54d-4e17-9834-ed2d9f055116` |
| content_item_id | null |
| video_job_id | null |
| error_message | null |
| created_at | 2026-07-20 18:05:36.763781+00 |
| updated_at | 2026-07-20 18:14:32.506814+00 |
| item wall duration | 535.743 s |

Fact: `video_job_id` on the run item remained null while video job `edcc904a-2458-4b96-a1db-dfd0f11b4b3c` exists and completed for TikTok content item `acb083af-1a4e-4da2-a7ee-04a4a17cef09`.

---

## 3. Strategy generation

| Field | Value |
|---|---|
| Mode | AI planner (`planContentStrategy`, production_run) |
| Strategy ID | `f018b4b8-1b15-49ee-a97a-97defd61abb0` |
| Strategy created_at | 2026-07-20 18:05:46.436524+00 |
| Strategy name | The silent cost of a website that can't answer back |
| objective | lead_generation |
| strategy_brief.source | production_run |
| strategy_brief.production_run_id | `f5a7794e-c1a8-4d6b-82c9-500a8d3e9f88` |
| funnel_distribution | Problem Aware: 1; Awareness/Conversion/Solution Aware: 0 |
| Strategy item ID | `b8f25415-7b73-4bb3-bc56-3031f4c2684d` |
| Strategy item created_at | 2026-07-20 18:05:46.765681+00 |
| Strategy item platform/format | tiktok / reel |
| funnel_stage | problem_aware |
| brief.topic | The car dealer who got 60 weekend visitors and sold nothing — because no one could answer a single question |
| brief.package_index | 0 |
| Wall time: run create → strategy row | **10.010 s** |

Vercel log: `POST /projects/.../production` 200 at 18:05:35; `[n8n] workflow=generate_content_package ... status=200 accepted`.

Provider for strategy text: Claude (`getStrategyProvider`). Attempt count for this strategy call is **not persisted**.

---

## 4. Package generation (n8n + API)

### 4.1 n8n execution

| Field | Value |
|---|---|
| Execution ID | 150 |
| Workflow | `NAKo5V3Ctlq5aW4i` — Generate Content Package — Bridge (package loop) |
| status | success |
| mode | webhook |
| startedAt | 2026-07-20T18:05:47.380Z |
| stoppedAt | 2026-07-20T18:08:02.720Z |
| n8n wall duration | 135.340 s |

| Node | executionTime |
|---|---|
| N1 — Webhook Trigger | 34 ms |
| N1b — Production run? | 24 ms |
| N2p — Read production strategy items | 560 ms |
| N2b — Loop over packages (enter) | 3 ms |
| N3 — Generate Content Package | **132578 ms** |
| N3b — Package ok? | 12 ms |
| N4 — Start Video Job | 1900 ms |
| N5b — Action run id? | 5 ms |
| N2b — Loop over packages (exit) | 4 ms |

N3 response: `ok: true`, `packageId: 31878924-d54d-4e17-9834-ed2d9f055116`, `videoJobId: edcc904a-2458-4b96-a1db-dfd0f11b4b3c`, 11 `contentItemIds`.  
N4 response: `ok: true`, `video_job_id: edcc904a-2458-4b96-a1db-dfd0f11b4b3c`, `status: processing`.

### 4.2 Vercel API (package)

| Time (UTC) | Route | Status |
|---|---|---|
| 18:05:48 | POST `/api/n8n/generate-content-package` | 200 |
| 18:08:00 | POST `/api/n8n/start-video-job` | 202 |
| 18:14:27 | POST `/api/n8n/video-callback` | 200 |

---

## 5. Package record

| Field | Value |
|---|---|
| package id | `31878924-d54d-4e17-9834-ed2d9f055116` |
| strategy item | `b8f25415-7b73-4bb3-bc56-3031f4c2684d` |
| title | The car dealer who got 60 weekend visitors and sold nothing — because no one could answer a single question |
| status | draft |
| funnel_stage | problem_aware |
| weekly_strategy_id | `f018b4b8-1b15-49ee-a97a-97defd61abb0` |
| created_at | 2026-07-20 18:07:56.582580+00 |
| updated_at | 2026-07-20 18:14:31.348875+00 |
| package wall (create→update) | 394.766 s |
| content_items | 11 (tiktok1, instagram1, youtube1, facebook1, linkedin2, x5) |
| package_brief top-level keys | asset_usage, cta, hashtags, hook, image_prompts, platform_outputs, presentation_generation, scenario, subtitles, video, visual_scenes, voiceover_text |

Creative-candidate plan, fidelity, story integrity, PDI, and generation_telemetry are stored under `package_brief.presentation_generation` (not at package_brief root).

---

## 6. Per-package execution sheet

### Package `31878924-d54d-4e17-9834-ed2d9f055116`

| Metric | Value |
|---|---|
| strategy item | `b8f25415-7b73-4bb3-bc56-3031f4c2684d` |
| total execution time (run item) | 535.743 s |
| final status | production_run_item `completed`; package status `draft`; video_job `completed` |

#### Phase timings (wall-clock from timestamps / n8n)

| Phase | Start (UTC) | End (UTC) | Duration |
|---|---|---|---|
| strategy_planning | 18:05:36.426 | 18:05:46.436 | 10.010 s |
| n8n_to_N3_start | 18:05:47.380 | 18:05:48.211 | 0.831 s |
| package_generation (N3) | 18:05:48.211 | 18:08:00.790 | **132.578 s** |
| start_video_job (N4) | 18:08:00.803 | 18:08:02.703 | 1.900 s |
| video_render (job created→completed) | 18:08:00.381 | 18:14:30.941 | **390.559 s** |
| callback→run terminal | 18:14:27 (callback log) → 18:14:32.629 | ~5.6 s |

`generation_telemetry.phases` (persisted): **[]** (empty array).

> **Pipeline telemetry note (post-implementation):** Future runs persist chronological `generation_telemetry.steps` (`pipeline-telemetry@1`). Technical audits then render nested package-generation breakdowns, e.g.:
>
> ```
> Package generation
> 132.6 s
>
> ↓
>
> Creative Candidates
> 11.8 s
>
> ↓
>
> Candidate Judge
> 2.1 s
>
> ↓
>
> Narrative Beats
> 3.8 s
>
> ↓
>
> Presentation Generation
> 24.6 s
>
> ↓
>
> … (+ Hook Enforcement, Concept Fidelity, Story Integrity, Platform Outputs, Persist Package, TTS, Whisper, Image generation, Video rendering)
> ```
>
> Plus summary tables: Execution Time | AI Cost | Prompt Sizes | Providers. See `reports/ai-pipeline-telemetry-implementation.md`. This historical run predates `steps[]` instrumentation.

#### Claude calls

| Source | Recorded count |
|---|---|
| `generation_telemetry.phases` | 0 entries (no `fidelity_repair` / `story_repair` phases) |
| `full_package_generations` | 1 |
| Strategy `planContentStrategy` attempt count | **not persisted** |
| Main `generateValidatedJson` attempt count | **not persisted** |
| Total Claude calls (exact) | **not recorded** in persisted telemetry |

#### OpenAI calls

| Source | Recorded evidence |
|---|---|
| JSON repair (OpenAI text) during package gen | **not recorded** |
| TTS | 1 attempt, `pass: true` (`tts_validation_attempts: 1`, `tts_tail_retry_used: false`) |
| Whisper subtitles | `subtitle_source: "whisper"`, `whisper_word_count: 68` |
| Image scenes rendered | 4 × `IMAGE` (`scene-1`…`scene-3`, `scene-5`); exact image API call count **not recorded** in job debug |
| Total OpenAI calls (exact) | **not recorded** as a single counter |

#### Repairs / retries

| Kind | Value |
|---|---|
| full_package_generations | 1 |
| regenerationReason | null |
| fidelity_repair phase | not present (`phases: []`) |
| story_repair phase | not present (`phases: []`) |
| TTS retries | 0 (`tts_tail_retry_used: false`) |
| n8n execution retryOf | null |

#### Candidate validation / repairs

| Field | Value |
|---|---|
| candidate_repair_reasons | [] |
| generatedCandidates | 7 |
| rejectedCandidates | 7 (all tagged `topic_collapsed_to_generic_business`) |
| All candidateScores.rejected | true (including winner) |
| Winner still selected | `c3-direct_product_world-div` |

#### Hook enforcement

| Field | Value |
|---|---|
| hook_deterministic_enforce_reason | `hook_enforced_on_voiceover` |
| Selected hookLine | Urgent question dies in silence. |
| Stored package hook | Urgent question dies in silence. |
| Voiceover first sentence | Urgent question dies in silence. |
| fidelity rule hook_preserved_in_first_spoken | passed |

#### Concept Fidelity

| Field | Value |
|---|---|
| fidelity_first_pass_passed | true |
| fidelity_first_pass_failure_reasons | [] |
| fidelity_final_passed | true |
| finalScriptFidelity.passed | true |
| finalStoryboardFidelity.passed | true |
| failureReasons (both) | [] |

First-pass diagnostics (Vercel log + persisted): all 6 rules passed  
(`opening_situation_visible_in_scene1`, `hook_preserved_in_first_spoken`, `core_idea_recognizable`, `product_or_topic_implied`, `storyboard_collapsed_to_generic_office`, `voiceover_essay_or_generic_opener`).

#### Story Integrity

| Field | Value |
|---|---|
| passed | true |
| summary | `story_integrity_passed_with_warnings:cta_mismatch` |
| violations | [] |
| warnings | 1 × `cta_mismatch` |
| voiceoverContainsCta | false |
| ctaMismatch | true |
| package CTA | Create your AI assistant — let your website answer while the lot is full and the team is off. |
| productDemonstration.present (within SI) | true |

#### Product Demo Integrity (PDI)

| Field | Value |
|---|---|
| passed | true |
| summary | `product_demonstration_integrity_passed` |
| violations | [] |
| structuredBeatPresent | true |
| ask / answer / result | true / true / true |
| askSceneIndex / answerSceneIndex / resultSceneIndex | 3 / 3 / 3 |
| outcome_type | lead_captured |
| demo_variant | after_hours_response |
| brand_name | Fenrik.chat |
| Worker scene types | IMAGE, IMAGE, IMAGE, PRODUCT_DEMO, IMAGE |
| presentation_analyzer PRODUCT_DEMO decision | allowed — `structured product_demo; deterministic chat renderer` |

#### Creative Candidates (selection)

| Field | Value |
|---|---|
| version | creative-candidates@3.0 |
| selected | `c3-direct_product_world-div` / family `direct_product_world` |
| finalSelectionScore | 241.5 |
| creativeScore | 70.5 |
| commercialScore | 171.0 |
| overturnedCreativeLeader | true (vs `c1-absurd_understandable-div` creative 75.45) |
| whyWon (selectionDiagnostics) | final_selection_score=241.5; commercial dimensions renderability=10, first_frame_clarity=9, product_demo=9, human_problem=10, narrative_survive=9, commercial_survive=10 |

#### Story progression (post-LLM diagnostic)

| Field | Value |
|---|---|
| storyProgressionDiagnostics.passed | false |
| warning | scenes_1_and_2_near_duplicate_purpose (overlap=0.61) |
| visualProgressionDiagnostics.passed | true |
| informationProgression.passed | true |
| durationValidation.passed | true |

#### Creative DNA (log)

| Field | Value |
|---|---|
| Log | `[creative-dna] validation warnings` on `productRole` — “Product role not represented in voiceover/script/ending” |

#### Render

| Field | Value |
|---|---|
| video_job_id | `edcc904a-2458-4b96-a1db-dfd0f11b4b3c` |
| provider | video_engine |
| status | completed |
| render duration | **390.559 s** |
| video_duration | 33.566667 s |
| speech_duration | 32.064 s |
| match_ratio | 0.9710144927536232 |
| render_warning | false |
| render_warnings | [] |
| sfx_mixed | false |
| sfx_reason | not_selected |
| outputs | mp4_url, thumbnail_url, subtitle_url, render_spec, debug present |

#### Package persistence

| Artifact | Fact |
|---|---|
| content_packages row | inserted at 18:07:56.582580+00 |
| content_items | 11 rows, all `generation_metadata.production_run_id` = run id |
| package_brief | whitelist via `buildPackageBrief`; extended fields live under `presentation_generation` |
| generation_telemetry location | `package_brief.presentation_generation.generation_telemetry` |
| creative_candidates location | `package_brief.presentation_generation.creative_candidates` |
| asset_usage | 0 |
| image_prompts length | 4 |
| visual_scenes length | 5 (index 3 = structured PRODUCT_DEMO) |

---

## 7. video_jobs / rendering / callbacks

| Event | Timestamp (UTC) |
|---|---|
| video_job created_at | 2026-07-20 18:08:00.381827+00 |
| start-video-job API | 2026-07-20 18:08:00 |
| video-callback API | 2026-07-20 18:14:27 |
| video_job completed_at | 2026-07-20 18:14:30.941+00 |
| package updated_at | 2026-07-20 18:14:31.348875+00 |
| run item updated_at | 2026-07-20 18:14:32.506814+00 |
| run updated_at | 2026-07-20 18:14:32.628915+00 |

Callback count for this window: **1** (`/api/n8n/video-callback`).  
Start-video-job count: **1**.  
Generate-content-package count: **1**.

---

## 8. Reconciliation

| Field | Value |
|---|---|
| Final run status | completed |
| generated_total | 1 |
| failed_total | 0 |
| Reconcile path | `reconcileProductionRun` / `resolvePackageReconcileStatus` (requireVideo=true from plan.videoCount=1) |
| Package reconcile basis | video job status `completed` |
| production_run_items.video_job_id after reconcile | still null |

---

## 9. Telemetry

Persisted `generation_telemetry`:

```json
{
  "phases": [],
  "strategy_item_id": "b8f25415-7b73-4bb3-bc56-3031f4c2684d",
  "production_run_id": "f5a7794e-c1a8-4d6b-82c9-500a8d3e9f88",
  "fidelity_final_passed": true,
  "candidate_repair_reasons": [],
  "full_package_generations": 1,
  "fidelity_first_pass_passed": true,
  "hook_deterministic_enforce_reason": "hook_enforced_on_voiceover",
  "fidelity_first_pass_failure_reasons": []
}
```

Token usage / USD cost: **not present** in production_run, package_brief, video_jobs, or n8n execution metadata for this run.

---

## 10. Identified timings (facts)

| Finding | Value |
|---|---|
| Package count | 1 |
| Total duration | 536.203 s |
| Slowest package | `31878924-d54d-4e17-9834-ed2d9f055116` (only package; 535.743 s run-item wall) |
| Slowest phase | **video_render** — 390.559 s (72.8% of run wall) |
| Second-largest phase | package_generation (N3) — 132.578 s (24.7% of run wall) |
| Strategy planning | 10.010 s (1.9% of run wall) |
| Highest cost package | **not measurable** (no cost/token telemetry); sole package is the only cost bearer |

### Bottlenecks (by measured duration share)

1. Video render / worker: 390.559 s  
2. Content package Claude generation (N3): 132.578 s  
3. Strategy planning: 10.010 s  

### Unnecessary waits / idle gaps (observed)

| Gap | Duration | Observation |
|---|---|---|
| n8n stopped → video completed | 18:08:02.720 → 18:14:30.941 = 388.221 s | n8n workflow finished after queuing video; run remained open until callback |
| video_job_id unset on production_run_item | entire run | job existed and completed; item column stayed null |
| UI poll storm after completion | ~18:14:48–18:14:55 | dozens of GET page routes (dashboard/production/videos/…) after terminal update |

---

## 11. End-to-end timeline

```
18:05:36.426  production_runs created (queued→running after trigger)
18:05:36.764  production_run_items created
18:05:46.436  content_strategies created (AI plan)
18:05:46.766  content_strategy_items created
18:05:47.380  n8n execution 150 start
18:05:48      POST /api/n8n/generate-content-package 200
18:07:56.583  content_packages created
18:07:56.923  content_items created (×11)
18:08:00.382  video_jobs created
18:08:00      POST /api/n8n/start-video-job 202
18:08:02.720  n8n execution 150 stop (success)
18:14:27      POST /api/n8n/video-callback 200
18:14:30.941  video_jobs.completed_at
18:14:31.349  content_packages.updated_at
18:14:32.507  production_run_items.status=completed
18:14:32.629  production_runs.status=completed
```

---

## Sources

- Supabase: `production_runs`, `production_run_items`, `content_strategies`, `content_strategy_items`, `content_packages`, `content_items`, `video_jobs`
- n8n MCP: execution `150` / workflow `NAKo5V3Ctlq5aW4i`
- Vercel runtime logs: deployment `dpl_33gCT9mmAtu8ArXcNkF5tPmUTtcw`, 2026-07-20T18:05:00Z–18:15:00Z
