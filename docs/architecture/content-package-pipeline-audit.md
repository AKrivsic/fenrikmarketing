# Content Package Generation Pipeline — Current System Audit

**Status:** Read-only description of the system as implemented. No recommendations.  
**Sources:** production actions, content-pipeline, n8n live workflow `O27ELb1s9Y2qisOr`, content-package-worker, video-worker, production-runtime, Supabase tables.

| Signal | Value |
|--------|--------|
| Production model | 1 package = 1 video |
| Strategy + Concept + Package | Claude (`ANTHROPIC_MODEL` default `claude-sonnet-4-6`) |
| Opening + Repair + Images + TTS | OpenAI |
| n8n package loop | `batchSize = 1` |
| Live generate bridge | n8n `O27ELb1s9Y2qisOr` |
| Package AI host | `content-package-worker:8081` |
| Video dispatch | Vercel `/api/n8n/start-video-job` → DigitalOcean video-worker |
| Runtime | Phase 6G |

**Product Brain is not generated inside the Production Run.** It already exists on the project (from website extraction + card approval). The run consumes it; it does not regenerate Product Brain per package.

---

## 1. Entry point

UI: `components/projects/ContentProductionPanel` → server action `startProductionRun` in `app/projects/[id]/production/actions.ts`.

### Start Production Run (chronological)

| Order | Actor | What happens |
|------:|-------|--------------|
| 1 | UI / server action | Validate config; `computeProductionPlan`; reject if active run exists |
| 2 | `createProductionRun` | Insert `production_runs` (queued) + `production_run_items` slots |
| 3 | `prepareProductionStrategyInputs` | Mode `ai` (default): `planContentStrategy`; mode `legacy`: `seedProductionStrategyInputs` |
| 4 | `planContentStrategy` | `ensureScenarioPool` → Claude Content Strategy → `persistProductionStrategyPlan` → `linkStrategyItemIdsByOrder` |
| 5 | `sendN8nWebhook` | workflow `generate_content_package` → `https://n8n.fenrik.chat/webhook/generate-content-package` |
| 6 | `setProductionRunStatus` | `running` (or `failed` if planner/n8n trigger fails) |
| 7 | n8n N1→N1b→N2p | Read `content_strategy_items` for `production_run_id` |
| 8 | n8n N2b loop | `SplitInBatches` size 1 over strategy items |
| 9 | n8n N3 | `POST http://content-package-worker:8081/generate-content-package` (`retryOnFail` OFF, timeout 900s) |
| 10 | Worker handler | `handleGenerateContentPackageRequest` → `runGenerateContentPackage` (admin Supabase) |
| 11 | n8n N3b/N4 | If ok → `POST` Vercel `/api/n8n/start-video-job`; else continue loop |
| 12 | `start-video-job` | `claim_video_job_for_dispatch`; `startVideoWorkerJob`; job stays `queued` until worker claims |
| 13 | video-worker | In-memory queue; `claim_video_job_for_worker`; render; callback `/api/n8n/video-callback` |
| 14 | Recovery cron | n8n `0wgLd6QxLiT37iLR` every 2 min → `/api/internal/production-run-recovery` (no paid AI) |

### Also present (not the main production button path)

- `/api/automation/generate-content-package` — webhook trigger helper
- `/api/ai/generate-content-package` — direct
- Vercel `/api/n8n/generate-content-package` — proxies to `CONTENT_PACKAGE_WORKER_URL` when set, else runs inline
- Weekly path: same n8n bridge via `week_start` → `content_strategies.period_start`
- Regenerate: separate n8n workflow `z7zfuAYoH5vuLX6R` → `/api/n8n/regenerate-content-package` (Vercel)
- Stop: `cancelProductionRun`
- `content-package-callback` route exists for package status CAS but is **not** a node in the live generate bridge (persist happens inside generation)

**Queues:** No BullMQ, no Inngest. Orchestration is n8n webhooks + HTTP workers + Supabase RPCs/leases + in-process video FIFO.

---

## 2. Complete execution timeline

| # | Title | Detail |
|---|-------|--------|
| 0 | Project lifetime (before any Production Run) | Website URL → Extract Knowledge → Approve cards → compile Product Brain columns; scenario pool; optional trends/evergreen |
| 1 | Operator starts Production Run | ContentProductionPanel → `startProductionRun` server action |
| 2 | Create `production_runs` + `production_run_items` | status=`queued`; one item slot per `package_index` |
| 3 | Content Strategy (AI planner mode) | `ensureScenarioPool` → `planContentStrategy` (Claude) → persist `content_strategies` + `content_strategy_items` → `linkStrategyItemIdsByOrder` |
| 4 | Trigger n8n | `sendN8nWebhook(generate_content_package)` with `production_run_id` + `package_count` → run status=`running` |
| 5 | n8n reads strategy items | N2p filter `brief->>production_run_id`; SplitInBatches `batchSize=1` |
| 6 | Per strategy item: package generation | `POST content-package-worker:8081/generate-content-package` |
| 7 | Claim + Creative Pipeline | `claim_package_generation` → Video Concept → Opening Impact → Visual Identity → Content Package → align VO → normalize scenes |
| 8 | Persist Package | `content_packages` (draft) + `content_items` + `video_jobs` (queued) + `asset_usage`; then social image soft-fail |
| 9 | n8n Start Video Job | `POST /api/n8n/start-video-job` → `claim_video_job_for_dispatch` → enqueue DigitalOcean video-worker |
| 10 | Video worker render | `claim_video_job_for_worker` → TTS → scene images → storyboard → SRT → FFmpeg → Storage upload → persist artifacts |
| 11 | Video callback | `POST /api/n8n/video-callback` → `video_jobs` terminal + package status draft → `reconcileProductionRun` |
| 12 | Run settlement / Review | `production_run_items` completed/failed; scheduled recovery every 2 min; Review UI |

**Flow shape:**

```
Start Production Run
↓
Create run
↓
Content Strategy
↓
n8n loop
↓
Creative Pipeline
↓
Persist Package
↓
Social image
↓
Start Video Job
↓
Worker (TTS → scenes → render)
↓
Callback
↓
Reconcile / Review
```

---

## 3. Every AI generation step

| Step | Purpose | Input | Output | Module | Model | Schema | Persist | Consumers |
|------|---------|-------|--------|--------|-------|--------|---------|-----------|
| Extract Knowledge (upstream) | Propose Product/Customer/Voice/Proof cards from website text | Fetched website text + project | `projects.knowledge` (proposed cards) | `lib/ai/workflows/extractKnowledge.ts` | Claude · default `claude-sonnet-4-6` | `lib/ai/schemas/extractKnowledge.ts` | `projects.knowledge` jsonb | Approve cards → `compileCardToBrain` → Product Brain columns |
| Analyze Asset (upstream) | Describe uploads / classify usage / extract text / trust signal | Uploaded asset bytes/metadata + project | Asset analysis fields | `lib/ai/workflows/analyzeAsset.ts` | OpenAI vision `gpt-4o-mini` (images) or Claude (text) | `lib/ai/schemas/analyzeAsset.ts` | `assets.metadata` | Content Package available-assets block; may trigger Extract Proof |
| Extract Proof Statements (upstream) | Pull 0–5 proof lines from a trust asset after analysis | Trust asset analysis + project | proof statement strings | `lib/ai/workflows/extractProofStatements.ts` | Claude | `lib/ai/schemas/extractProofStatements.ts` | `projects.knowledge.cards.proof.asset_statements` | `proofBlock` in Strategy / Video Concept / Opening / Package |
| Generate Scenarios (upstream / pool refill) | Keep scenario pool ≥ MIN_SCENARIOS | Product Brain fields + proof + existing scenarios | Scenario list | `lib/ai/workflows/generateScenarios.ts` | Claude | `lib/ai/schemas/generateScenarios.ts` | `projects.knowledge.scenarios` | Video Concept / Content Package `scenarioBlock` |
| Evergreen Topics / Score Trends (upstream) | Topic bank + trend eligibility scores | Product Brain; trend candidates | `evergreen_topics` rows; `trends.metadata` relevance_score | `evergreenTopics.ts` · `scoreTrend.ts` | Claude | evergreenTopic / trendRelevanceScore schemas | `evergreen_topics`; `trends.metadata` | Content Strategy / Weekly Strategy planning context |
| Content Strategy | Plan N package slots (topic, angle, funnel_stage, source) | Product Brain, trends, evergreen, anti-rep memory, packageCount, platform | `content_plan[]` | `lib/ai/workflows/planContentStrategy.ts` | Claude (`getStrategyProvider`) | `lib/ai/schemas/contentStrategyPlan.ts` | `content_strategies` + `content_strategy_items` | n8n loop; `loadStrategyItemContext` |
| Video Concept | Invent one video concept + visual_direction | Product Brain, proof, scenarios, memory, strategy item, creative directives | VideoConcept JSON | `lib/content-pipeline/runVideoConcept.ts` | Claude | `videoConceptSchema` | `package_brief.presentation_generation.video_concept` | Opening Impact, Visual Identity, Content Package |
| Opening Impact | Own hook + first spoken sentence + first image emotion | Video Concept, Product Brain, memory, directives | OpeningImpact JSON | `lib/content-pipeline/runOpeningImpact.ts` | OpenAI text (`gpt-4o-mini`) | `openingImpactSchema` | `package_brief.presentation_generation.opening_impact` | Visual Identity; Content Package; `alignOpeningVoiceover` |
| Visual Identity | Assemble art direction from concept + opening | VideoConcept.visual_direction + OpeningImpact | VisualIdentity object | `lib/content-pipeline/visualIdentity.ts` | deterministic | ContentPipelineArtifacts types | `package_brief.presentation_generation.visual_identity` | Content Package image/scene guidance |
| Content Package | Single-pass full package | Concept + Opening + Identity + Product Brain + strategy + assets + platform rules | ContentPackageOutput | `lib/content-pipeline/runContentPackage.ts` | Claude; nested OpenAI JSON repair | `buildContentPackageSchema` | `content_packages.package_brief` + columns; `content_items`; `video_jobs.input` | Persist, social image raster, video worker, review |
| JSON Repair (nested) | Fix invalid JSON / guardrail failures | Broken output + validation issues + expected shape | Repaired JSON | `lib/ai/runWithRepair.ts` + `jsonRepair.ts` | OpenAI `gpt-4o-mini` | Same validator as parent | Folded into parent step | Strategy / Package / Concept / Opening |
| Social Image raster | Turn LLM social_image creative into 1024×1024 PNG | `social_image.image_prompt` (+ text_overlay) | PNG bytes | `lib/content-package/generateSocialImage.ts` | OpenAI Images `gpt-image-1` | SocialImageCreative / PackageSocialImage | assets + ai_visuals + `generated-visuals`; `package_brief.social_image` | Review / client download |
| Scene still generation (video worker) | Rasterize each scene prompt (or reuse assets) | `video_jobs.input` scenes / image_prompts | Scene PNGs | `video-worker/services/images.ts` | OpenAI Images | RenderSpec / WorkerPayload | bucket `video-renders` scene-* paths | FFmpeg storyboard render |
| TTS voiceover (video worker) | Speak `voiceover_text` | voiceover_text + TTS voice/instructions | MP3 + measured duration | `tts.ts` + `ttsTailValidation.ts` | OpenAI Speech `gpt-4o-mini-tts` | WorkerPayload | Temp; timing in output metadata | SFX, storyboard, Whisper, FFmpeg |
| Whisper word timestamps (video worker) | Align phrase captions to spoken audio (best-effort) | TTS MP3 + voiceover_text | Word timestamps / alignment ratio | `wordTimestamps.ts` + `phraseCaptions.ts` | OpenAI `whisper-1` | Transcription word list | Subtitle timing in render debug / SRT | SRT cues; proportional fallback |

**Notes:**

- Platform Outputs are **not** a separate LLM call: they are fields inside Content Package, then a deterministic telemetry step.
- Presentation analyzer / visual profile / compile to worker scenes during `buildVideoJobInput` are deterministic (no LLM in `lib/scene-types/presentation`).
- Product Brain itself is **not** an LLM step — compiled project columns + `projectBrainBlock`.

---

## 4. Human-readable package evolution

```
website URL (projects.knowledge.source_url)
↓
Extract Knowledge → Approve cards → Product Brain (projects.* + knowledge)
↓
content_strategy_items row (topic, angle, funnel_stage, brief.production_run_id, package_index)
↓
VideoConcept → OpeningImpact → VisualIdentity
↓
ContentPackageOutput (title, hook, voiceover_text, visual_scenes, platform_outputs, social_image, cta, …)
↓
content_packages.package_brief (= buildPackageBrief)
↓
content_items (per platform / multiplier variants)
↓
video_jobs.input (buildVideoJobInput: scenes, VO, TTS, creative_mode_beats, …)
↓
scene-*.png stills + voiceover MP3 + subtitles.srt
↓
output.mp4 (+ thumbnail) in Storage; video_jobs.output
↓
package_brief.social_image storage refs (when FB/LI selected)
↓
Review / client review surfaces
```

---

## 5. Persistence points

| Stage | What is saved | Where |
|-------|---------------|-------|
| Product Brain | product_is, pain_points, tone, forbidden_claims, knowledge cards | `projects` columns + `projects.knowledge` jsonb |
| Scenarios / proof assets | scenario pool; asset_statements | `projects.knowledge` |
| Assets (uploads) | project media + analysis metadata | `assets` table; bucket `project-assets` |
| Evergreen / trends | topic bank; relevance scores | `evergreen_topics`; `trends.metadata` |
| Production Run | config, plan, counters, status | `production_runs` |
| Run slots | per-package progress | `production_run_items` |
| Strategy | plan + items | `content_strategies`, `content_strategy_items` |
| Package claim | generation lease | `claim_package_generation` RPC / claim rows |
| Content Package | title, funnel_stage, package_brief JSON | `content_packages` (status draft) |
| Platform copy | caption, body, hashtags, cta, metadata | `content_items` |
| Video job | input, status, output | `video_jobs` (queued→processing→completed/failed) |
| Asset usage | referenced assets incl. social_image | `asset_usage` (+ `assets`) |
| Social image | PNG + refs | `assets`, `ai_visuals`, bucket `generated-visuals` (`{project}/generated/{ai_visual_id}/social-image.png`), `package_brief.social_image` |
| Video artifacts | mp4, thumbnail, srt, scene PNGs | bucket `video-renders` (`{project}/video/{video_job_id}/…`); `video_jobs.output` |
| Regenerate snapshot | prior package/items version | `content_versions` (via `snapshotPackage`) |
| Failure telemetry | bounded failure fields | `production_run_item_failure_telemetry` |
| Telemetry | step costs/summaries | `package_brief.presentation_generation.generation_telemetry` |

**Storage buckets (`STORAGE_BUCKETS`):** `project-assets` (uploads), `generated-visuals` (social image + some stills), `video-renders` (output.mp4, thumbnail, srt, scene PNGs).

`video_jobs` link via `content_item_id` + `package_id` / `render_kind`. Package generation inserts the queued job but does **not** dispatch the worker — n8n N4 `start-video-job` does.

---

## 6. Regeneration paths

### Regenerate package

Review `regeneratePackage` → n8n `regenerate_content_package` → `/api/n8n/regenerate-content-package` → `runRegenerateContentPackage`.

- Reuses `strategy_item_id` and Product Brain
- Snapshots prior package/items into `content_versions`
- Re-runs Creative Pipeline (with regeneration instruction + prior artifacts/keep flags)
- Updates same `content_packages` row in place; rebuilds `content_items`
- Creates new `video_jobs` row when video required; re-runs social image
- Then n8n `start-video-job` if `videoJobId` present
- Asserts no active package render first

### Regenerate / retry video

`retryVideoRender` → `runRetryVideoJob`: creates a new `video_jobs` row for the same `content_item`, reusing durable scene stills from failed input/output (no package LLM). Dispatches worker. Operator-cancel blocks retry. Failed-job editor may override `voiceover_text` only.

### Scene editor rerender

`VideoSceneEditor` → `rerenderVideoFromSceneEditor` → `sceneEditorRerender`: builds new job input from draft scenes/voiceover, flags `scene_editor_rerender`, may regenerate individual scene images via video-worker `regenerateSceneImage`, then new render job. Reuses `package_brief.asset_usage` when asset modes selected. Does **not** re-run Content Package LLM.

### Regenerate social image

No dedicated standalone “regenerate social image” API/action exists. Social image is generated only inside `generateAndPersistPackageSocialImage` during package generate or package regenerate. Review `PackageSocialImagePanel` displays/downloads via `/api/projects/[id]/social-image` and client routes; it does not trigger a separate raster job.

### Connections

- Package regenerate ⇒ new creative + new video job + new social raster
- Video retry / scene rerender ⇒ reuse package copy and usually reuse stills unless scene image regen was requested
- Production run loop is generate-only; regenerate is a separate review-triggered workflow

---

## 7. Prompt chain

| Filename | Purpose | Output | Next consumer |
|----------|---------|--------|---------------|
| `lib/ai/prompts/extractKnowledge.ts` | Website → knowledge cards | ExtractKnowledgeOutput | `projects.knowledge` → approve → Product Brain |
| `lib/ai/prompts/generateScenarios.ts` | Scenario pool refill | scenarios[] | `scenarioBlock` in creative prompts |
| `lib/ai/prompts/contentStrategyPlan.ts` | Production-run content plan | content_plan | `content_strategy_items` → package generation |
| `lib/ai/prompts/context.ts` | Shared blocks: PROJECT BRAIN, proof, scenarios, anti-rep, constraints, website rules | Prompt text blocks | Embedded by strategy + pipeline prompts |
| `lib/ai/prompts/creativeDirectives.ts` | Deterministic creative mode/persona pick from seed | CreativeDirectives | Soft directive blocks in Video Concept / Opening / Package |
| `lib/content-pipeline/prompts/videoConcept.ts` | One video concept | VideoConcept | Opening Impact |
| `lib/content-pipeline/prompts/openingImpact.ts` | Hook + first spoken + first image | OpeningImpact | Visual Identity + Content Package |
| `lib/content-pipeline/prompts/contentPackage.ts` | Full package system+user prompt | ContentPackageOutput | Persist + video + social |
| `lib/content-pipeline/prompts/contentPackageVisualScenes.ts` | Visual scenes contract + expected shape | Prompt blocks / shape | Content Package validator |
| `lib/content-pipeline/prompts/contentPackageContract.ts` | CTA + voiceover contracts by funnel | Prompt blocks | Content Package |
| `lib/ai/prompts/platformStyles.ts` | Per-platform caption/CTA writing rules | Prompt blocks | Content Package `platform_outputs` |
| `lib/ai/prompts/jsonRepair.ts` | Repair invalid JSON | Corrected JSON | Parent `generateValidatedJson` retry |
| `lib/content-package/socialImage.ts` (`buildSocialImageProviderPrompt`) | Image provider prompt for FB/LI 1:1 | Image prompt string | `gpt-image-1` raster |
| `video-worker/services/imagePrompt.ts` | Compose final scene image prompts for worker | Provider prompt | Scene image generation |
| `video-worker/services/imageModerationFallbackPrompt.ts` | Moderation-safe retry prompt | Safer image prompt | Second image attempt |
| `lib/ai/prompts/weeklyStrategy.ts` | Weekly strategy path (non-production-run trigger) | Weekly plan items | Same package loop via `week_start` branch |
| `lib/ai/prompts/localizeContentPackage.ts` | Language variant localization | Localized fields | Variant `content_items` + variant `video_jobs` |
| `lib/ai/prompts/analyzeAsset.ts` | Analyze uploaded assets | Asset analysis JSON | `assets.metadata`; optional Extract Proof |
| `lib/ai/prompts/extractProofStatements.ts` | Proof lines from trust assets | proof statements | `projects.knowledge` proof; `proofBlock` |
| `lib/ai/prompts/trendRelevanceScoring.ts` | Score trends for eligibility | Scores | Strategy planning context |
| `lib/ai/prompts/evergreenTopicGeneration.ts` | Evergreen topics | Topics | Strategy planning context |
| `lib/ai/prompts/regenerateHook.ts` | Unique hook rewrite helper | New hook | **Not wired** into live generate/regenerate pipeline (code present, no callers) |

**Production creative order of prompts:**

```
context blocks + creativeDirectives
↓
videoConcept
↓
openingImpact
↓
contentPackage (+ visualScenes / contract / platformStyles)
↓
jsonRepair as needed
↓
socialImage provider prompt
↓
video-worker imagePrompt (+ moderation fallback) during render
```

---

## 8. Creative ownership

| Artifact | Who creates it | Stage of origin |
|----------|----------------|-----------------|
| Product facts / product_is / forbidden_claims | Product Brain (`projects` columns + knowledge) | Onboarding / approve cards |
| Proof / scenarios | `projects.knowledge` | Extract Knowledge + Generate Scenarios |
| Topic / angle / funnel_stage | `content_strategy_items` | Content Strategy |
| Creative Mode / narrative beats seed | `pickCreativeDirectives` (deterministic) | Before Video Concept |
| Video concept / visual_direction | Video Concept LLM | Creative Pipeline |
| Hook / first spoken sentence | Opening Impact (+ `alignOpeningVoiceover`) | Opening Impact → Package |
| Visual Identity treatment | `buildVisualIdentity` deterministic | After Opening Impact |
| Voiceover_text / subtitles / visual_scenes / image_prompts | Content Package LLM | Content Package |
| CTA (package + platform) | Content Package + CTA contracts/guardrails | Content Package |
| platform_outputs captions / hashtags / variants | Content Package LLM | Content Package → `content_items` |
| social_image creative (`image_prompt`) | Content Package LLM | Content Package |
| social_image PNG | `generateAndPersistPackageSocialImage` | After Persist Package |
| worker scenes / presentation analyzer decisions | `prepareAnalyzedVisualScenesForPackage` (deterministic) | `buildVideoJobInput` |
| TTS audio / scene stills / output.mp4 | video-worker | Video pipeline |
| Storyboard motion / SRT timing | video-worker storyboard + phrase captions | Video pipeline |

---

## 9. Video pipeline

```
Content Package
↓
buildVideoJobInput
↓
video_jobs (queued)
↓
n8n start-video-job
↓
claim_video_job_for_dispatch
↓
video-worker queue
↓
claim_video_job_for_worker
↓
TTS
↓
scene images
↓
storyboard
↓
SRT
↓
FFmpeg
↓
upload
↓
persist_video_job_artifacts
↓
video-callback
↓
output.mp4
```

| Module | Role |
|--------|------|
| `lib/ai/workflows/packageShared.ts` · `buildVideoJobInput` | Assemble job input; prepareAnalyzedVisualScenes; compile worker scenes; TTS fields |
| `app/api/n8n/start-video-job/route.ts` | Auth, cancel checks, dispatch claim, enqueue worker |
| `lib/video-worker/client.ts` | HTTP to DigitalOcean video-worker |
| `video-worker/server.ts` + `queue.ts` | Accept `/render`; concurrency-limited queue |
| `video-worker/jobRunner.ts` | Full render orchestration |
| `video-worker/services/tts.ts` / `ttsTailValidation.ts` | Voiceover generation + validation |
| `video-worker/services/images.ts` | Scene still generation / reuse |
| `lib/video-engine/storyboard.ts` | Beat timeline from audio + scenes |
| `video-worker/services/subtitles.ts` / `phraseCaptions.ts` | SRT cues |
| `video-worker/services/ffmpeg.ts` | MP4 + thumbnail |
| `video-worker/services/storage.ts` | Upload artifacts |
| `video-worker/services/callback.ts` | `POST /api/n8n/video-callback` |
| `lib/n8n/handlers.ts` · `handleVideoCallback` | Terminal job status; package draft; reconcile |
| `lib/production-runtime/*` | Leases, promote artifacts, active render guards |

---

## 10. Social Image pipeline

**Condition:** `packageNeedsSocialImage` when target platforms include `facebook` and/or `linkedin`.

```
Content Package LLM social_image creative
↓
persist in package_brief
↓
generateAndPersistPackageSocialImage
↓
gpt-image-1 1024×1024
↓
assets + ai_visuals + generated-visuals bucket
↓
stamp package_brief.social_image (status ready|failed)
↓
Review PackageSocialImagePanel
↓
/api/projects/.../social-image and client-projects social-image download
```

- Soft-fail: errors are logged and stamped `failed`; package/video/copy continue
- Moderation block triggers one safe-retry prompt
- Failure handling does not settle the production run by itself
- No separate regenerate-social-image path

---

## 11. Dependency graph

```
Website / Knowledge extraction
↓
Product Brain (+ scenarios, proof)
↓
Content Strategy → content_strategy_items
↓
Video Concept → Opening Impact → Visual Identity
↓
Content Package (includes platform_outputs + social_image creative + visual_scenes)
↓
Persist (content_packages / content_items / video_jobs)
↓ ↓
Social image raster    Video job → worker render → callback
↓
Reconcile production_run_items → Review / client delivery
```

**Parallelism:** social image runs after persist and does not block video dispatch (n8n starts video from generate response). Within a run, packages are sequential (n8n `batchSize` 1). Video workers may process multiple jobs subject to worker concurrency.

---

## 12. Mutable vs immutable stages

### Treated as stable source-of-truth once set

- Approved Product Brain columns (until re-edited/recompiled)
- `content_strategy_items` for a given run slot (generate binds 1:1 via `strategy_item_id` unique package)
- Successful `content_packages.strategy_item_id` uniqueness (idempotent reuse)
- Durable `video_jobs.output` artifacts once completed
- Completed scene still storage paths reused by retry/rerender

### Regenerable / overwritten later

- Package creative fields via `regenerateContentPackage` (in-place + version snapshot)
- `content_items` bodies/captions on regenerate
- `video_jobs` (new rows for regenerate / retry / scene rerender)
- `social_image` on package regenerate
- Scene editor drafts on `content_items.generation_metadata`
- `production_run` counters/status via reconcile/settlement
- Language variants (separate items/jobs; primary untouched)

---

## 13. Boundaries where generation finishes and another stage begins

- Knowledge extraction completed → human approve cards / Product Brain compile
- Product Brain ready → Production Run can start
- Production Run created (queued) → Content Strategy begins
- Content Strategy persisted + items linked → n8n webhook fired
- n8n selected `strategy_item` → package generation request begins
- Package generation claim acquired → Creative Pipeline begins
- Video Concept completed → Opening Impact begins
- Opening Impact completed → Visual Identity assembled
- Visual Identity ready → Content Package LLM begins
- Content Package validated + aligned → Persist Package begins
- Package/items/video_job persisted → Social image raster attempted
- Package generation response returned to n8n → Start Video Job (if ok)
- Video job dispatched (queued, no lease) → video-worker claims and renders
- Artifacts uploaded + durable output → video-callback / promote
- Video terminal + reconcile → `production_run_item` completed/failed
- All run items terminal → `production_runs` settled
- Package draft with assets → Review / client delivery surfaces
- Regenerate package trigger → version snapshot → Creative Pipeline → in-place persist → new `video_job`
- Retry video / scene-editor rerender → new or updated `video_job` without full package LLM

---

## 14. Document map / key modules

| Area | Primary modules |
|------|-----------------|
| Start run | `app/projects/[id]/production/actions.ts` · `lib/api/production-run-admin.ts` · `lib/projects/productionRun.ts` |
| Strategy | `lib/ai/workflows/planContentStrategy.ts` · `persistProductionStrategyPlan.ts` · `prompts/contentStrategyPlan.ts` |
| Orchestration | `lib/n8n/client.ts` · n8n `O27ELb1s9Y2qisOr` · `content-package-worker/server.ts` · `handleGenerateContentPackageRequest.ts` |
| Creative pipeline | `lib/content-pipeline/runCreativePipeline.ts` · `runVideoConcept` · `runOpeningImpact` · `visualIdentity` · `runContentPackage` |
| Generate/persist | `lib/ai/workflows/generateContentPackage.ts` · `packageShared.ts` |
| Social image | `lib/content-package/socialImage.ts` · `generateSocialImage.ts` |
| Video | `app/api/n8n/start-video-job` · `video-worker/*` · `lib/production-runtime/*` |
| Regenerate | `lib/ai/workflows/regenerateContentPackage.ts` · n8n `z7zfuAYoH5vuLX6R` |
| Retry / editor | `lib/ai/workflows/retryVideoJob.ts` · `lib/video-scene-editor/sceneEditorRerender.ts` |
| Runtime recovery | `app/api/internal/production-run-recovery` · n8n `0wgLd6QxLiT37iLR` |
| Architecture notes | `docs/architecture/content-pipeline.md` · `production-runtime.md` |

Official creative pipeline doc states:

```
Product Brain → Knowledge Base → Recent Content Memory
  → Content Strategy → Video Concept → Opening Impact → Visual Identity
  → Content Package → Platform Outputs → Persist
  → Video worker
```

There is no feature-flagged dual pipeline; Creative Engine evaluation loops are not part of this path.
