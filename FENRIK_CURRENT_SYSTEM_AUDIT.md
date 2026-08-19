# Fenrik Studio — audit současného systému

Datum auditu: 2026-08-14  
Rozsah: kód v `/Users/oleksandrkryvshych/Desktop/Projects/fenrikmarketing`, migrace v `supabase/migrations`, živé tabulky a buckety přes Supabase MCP, n8n workflows přes n8n MCP.  
Žádné změny v systému. Žádné placené AI volání. Hodnoty tajemství se v tomto dokumentu neuvádějí.

Jistota tvrzení: pokud není uvedeno jinak, jde o **potvrzeno** (kód + případně živá data). Položky, které nebylo možné ověřit, jsou označeny `NEOVĚŘENO`.

---

## A. Executive Summary

Fenrik Studio je produkční systém pro dávkovou výrobu short-form marketingového obsahu. Jádro je Next.js 16 aplikace na Vercel (`fenrikmarketing.vercel.app`), Postgres + Storage v Supabase, n8n orchestrace (`n8n.fenrik.chat`), Node worker na generaci Content Package (Docker, port 8081) a samostatný video worker (HTTP na `renderer.fenrik.chat`, FFmpeg).

**Co se dnes skutečně používá.** Produkční cesta není „n8n dělá AI“. n8n je tenký most: vezme `production_run_id`, načte `content_strategy_items`, pro každou položku zavolá content-package-worker a při úspěchu Vercel endpoint `/api/n8n/start-video-job`. Samotná kreativa běží v TypeScriptu:

1. Video Concept — Claude (`getCopywritingProvider` → `ClaudeProvider`, default model `claude-sonnet-4-6` nebo `ANTHROPIC_MODEL`)
2. Opening Impact — OpenAI text (`getJsonRepairProvider` → `OpenAITextProvider`, default `gpt-4o-mini`)
3. Visual Identity — deterministické složení z concept + opening
4. Content Package — Claude, JSON + guardrails + OpenAI JSON repair
5. Persist do `content_packages` / `content_items` / `video_jobs`
6. Video worker: OpenAI TTS (`gpt-4o-mini-tts`) → volitelný programatický SFX → OpenAI Images (`gpt-image-1`, `1024x1536`) → Ken Burns `zoompan` + `xfade` v FFmpeg → Whisper (`whisper-1`) pro timing titulků → upload do bucketu `video-renders`

Živá data to potvrzují: 718 `video_jobs`, všechny s `provider = video_engine`; 615 completed; 433 content packages; 111 production runs (92 completed).

**Jak vzniká video.** Video není AI video. Je to vertikální MP4 1080×1920 / 30 fps složené ze **statických stillů** (generovaných nebo z knihovny assetů), na které FFmpeg aplikuje Ken Burns pohyb (`zoom_in`, `pan_*`, `drift_*`, `static`) a 0,4s `xfade`. Délka je řízená naměřeným voiceoverem + `TAIL_BUFFER_SECONDS = 1.5`. Storyboard má **3–5 beatů**, ne 8–15 (komentáře v `jobRunner.ts` jsou zastaralé). Maximálně 5 generovaných stillů na video.

**Hlavní důvody nízké kvality (doložené implementací, ne názvy promptů).**

- Obraz je still + kamera, ne pohyb subjektu. Render vstupuje jen `imagePath`.
- Pohyb je uzavřená sada 7 Ken Burns primitiv s malou amplitudou (zoom 0,12–0,16).
- Storyboard recykluje malý pool stillů přes 3–5 beatů („cost stays flat“).
- Hudba neexistuje. Ambientní bed neexistuje. SFX je programatický overlay a v živých datech `sfx_selected=true` jen u 9 z 718 jobů.
- Titulky se palí do videa (libass). Voiceover MP3 se do Storage neukládá.
- Typed scene renderery (CHECKLIST/PHONE/QUOTE/STATISTIC/CTA) existují, ale produkční default je IMAGE: `SCENE_TYPES_ENABLED` musí být `"true"`. V `visual_scenes` má type vyplněný zlomek scén.

**Připravenost na AI video.** Runway ani jiný image-to-video / text-to-video provider v kódu není. Datový model nemá tabulku scén ani sloupec pro per-scene video klip. FFmpeg řetězec očekává still + `zoompan`. Přechod na AI video by rozbil storyboard, motion, xfade, délku řízenou TTS a scene editor, který regeneruje **obrázky**.

**Připravenost na Benchmark Lab.** Existuje telemetry (`generation_telemetry` v package brief a `video_jobs.output.debug`), odhadované ceny, časy kroků, retry video jobu, scene editor s historií stillů, regenerate package + `content_versions`, Run Insights / Run Telemetry UI. Neexistuje entita benchmarku, hvězdičkové hodnocení, porovnání variant stejného tématu napříč providery, persistovaný full prompt/request/response, ani export určený pro lab.

**Největší rizika.**

1. Duplicate paid work: n8n N4 `start-video-job` má `retryOnFail: true, maxTries: 3`; package generace má lease, ale transport retry u AI je 3 pokusy (429/5xx). Content Package n8n N3 má `maxTries: 1` (oprava incidentu).
2. Telemetrie není kompletní: `generation_telemetry` má jen 122/433 packages a ~100/615 completed jobs. Starší běhy nelze dopočítat.
3. Ceny jsou list-price odhady zapisované v čase volání, ne billing. Worker render `estimated_cost` pro FFmpeg je 0.
4. Full prompt poslaný providerovi se záměrně neukládá (`input_summary` je kompaktní).
5. n8n produkční most volá `http://content-package-worker:8081` — závislost na Docker síti `n8n_web`. Regenerace stále jde na Vercel (timeout riziko).
6. V n8n nodech je hardcoded header secret v parametrech workflow (hodnota se zde nekopíruje). To je provozní/security nález, ne součást AI pipeline.

---

## B. Mapa systému

```
Admin UI (Next.js / Vercel)
    │ GENERATE CONTENT
    ▼
production_runs + content_strategy_items
    │ sendN8nWebhook(generate_content_package)
    ▼
n8n  https://n8n.fenrik.chat/webhook/generate-content-package
    │ loop strategy items
    ▼
content-package-worker :8081  ──► Claude / OpenAI text
    │ persist packages + queued video_jobs
    ▼
n8n POST /api/n8n/start-video-job (Vercel)
    ▼
video-worker  renderer.fenrik.chat  ──► OpenAI TTS / Images / Whisper + FFmpeg
    │ upload video-renders
    ▼
POST /api/n8n/video-callback
    ▼
Review UI / Scene Editor / Client review
```

### Hlavní aplikace a služby

| Část | Co to je | Důkaz |
|---|---|---|
| Frontend + API | Next.js 16.2.7, React 19, App Router | `package.json`; `app/**/page.tsx`; `app/api/**/route.ts` |
| Admin auth | Cookie session z `ADMIN_DASHBOARD_PASSWORD` | `lib/auth/admin-gate.ts` `getAdminDashboardPassword` |
| Databáze | Supabase Postgres, schema `public`, 29 tabulek | Supabase MCP `list_tables` / `information_schema` |
| Storage | 3 private buckety | `supabase/migrations/006_storage.sql`; živě `project-assets`, `generated-visuals`, `video-renders` |
| n8n | Orchestrace webhooků, ne AI | `lib/n8n/client.ts`; 9 workflows v n8n instanci |
| Content Package worker | Node HTTP, synchronní generace | `content-package-worker/server.ts`; `Dockerfile.content-package-worker`; Caddy path `/content-package/*` |
| Video worker | Node HTTP + in-memory fronta + FFmpeg | `video-worker/server.ts`, `video-worker/queue.ts`, `video-worker/jobRunner.ts`; Caddy default reverse_proxy `:8080` |
| Component capture worker | Screenshot webu (volitelný) | `component-capture-worker/server.ts`; flag `ENABLE_COMPONENT_CAPTURE` |
| Email | Resend pro sample request | `lib/email/sendSampleRequestNotification.ts` |
| Analytics | GA4 + Meta Pixel po consent | `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID` |

### Frontend (admin + veřejné)

Stránky (`app/**/page.tsx`):

- Veřejné: `/` landing, `/content-packages` sample, `/examples/hvac`, `/client-review/[projectId]`, `/admin-login`
- Admin: `/dashboard`, `/projects`, `/projects/new`, `/projects/[id]` (tabs), `/projects/[id]/production`, `/knowledge`, `/weekly-strategy`, `/content-packages`, `/videos`, `/assets`, `/review`, `/review/runs/[runId]`, `/creative-review/[runId]`, `/approved`, `/published`, `/scheduled`, `/publishing-plan`, `/content-controls`, `/actions`
- Globální: `/review-queue`, `/assets`, `/history`, `/settings`, `/admin/clients`, `/admin/client-projects/[projectId]`

Middleware chrání prefixy v `isProtectedAdminPath` (`lib/auth/admin-gate.ts`).

### Backend API (produkční relevantní)

n8n / automation:

- `app/api/n8n/generate-content-package/route.ts` — stejný handler jako worker
- `app/api/n8n/start-video-job/route.ts` — dispatch na video worker
- `app/api/n8n/video-callback/route.ts`
- `app/api/n8n/content-package-callback/route.ts`
- `app/api/n8n/regenerate-content-package/route.ts`
- `app/api/n8n/weekly-strategy/route.ts` + callback
- `app/api/n8n/trend-scan/route.ts` + callback
- `app/api/n8n/publishing-planner/route.ts` + callback
- `app/api/n8n/error-callback/route.ts`
- `app/api/n8n/action-run-status/route.ts`
- `app/api/internal/production-run-recovery/route.ts` — cron z n8n každé 2 minuty, bez AI
- `app/api/automation/*` — tenké triggery n8n z UI

AI přímé (ne video render):

- `app/api/ai/generate-content-package/route.ts`
- `app/api/ai/regenerate-content-package/route.ts`
- `app/api/ai/weekly-strategy/route.ts`
- `app/api/ai/extract-knowledge/route.ts`
- `app/api/ai/generate-evergreen-topics/route.ts`
- `app/api/ai/score-trend/route.ts`
- `app/api/ai/generate-language-variants/route.ts`
- `app/api/ai/process-translation-jobs/route.ts`

### Deployment a hosting

| Služba | Evidence | Jistota |
|---|---|---|
| Next.js na Vercel | n8n nody volají `https://fenrikmarketing.vercel.app/api/...` | potvrzeno |
| n8n | webhook base `https://n8n.fenrik.chat/` | potvrzeno |
| Content-package-worker | n8n N3 URL `http://content-package-worker:8081/generate-content-package`; compose síť `n8n_web`; veřejná HTTPS cesta v Caddy snippetu | potvrzeno v n8n + `docker-compose.content-package-worker.yml` + `Caddyfile.content-package-worker.snippet` |
| Video worker + package worker host | `Caddyfile.content-package-worker.snippet`: DigitalOcean host `renderer.fenrik.chat`; video-worker `:8080`, package worker `:8081` za `/content-package/*` | potvrzeno záměr v repu; Dockerfile video-workeru **není v repu** |
| Video worker URL v kódu | skripty: `VIDEO_WORKER_URL=https://renderer.fenrik.chat/render` | potvrzeno |
| Vercel proxy na package worker | `.env.local.example` komentář: `CONTENT_PACKAGE_WORKER_URL` → `https://renderer.fenrik.chat/content-package/generate-content-package` | silná evidence (komentář v example); živá n8n instance volá Docker hostname, ne tuto HTTPS cestu |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` + service role v admin klientovi | potvrzeno |
| GitHub Actions | žádný `.github/workflows` | potvrzeno absence |
| `vercel.json` | v kořeni není | potvrzeno absence |

`NEOVĚŘENO` — konkrétní Vercel team/project dashboard settings. Živý Caddy config na DigitalOcean hostu (v repu je jen snippet).

### Důležité adresáře

| Cesta | Účel |
|---|---|
| `app/` | Next.js pages + API routes + server actions |
| `components/` | Admin UI (review, production, scene editor, brain) |
| `lib/ai/` | Provider routing, prompty, workflows, telemetry |
| `lib/content-pipeline/` | Produkční kreativní pipeline (concept → opening → package) |
| `lib/video-engine/` | Storyboard, motion, render schema (sdílené s workerem) |
| `lib/production-runtime/` | Leases, heartbeat, recovery, settlement |
| `lib/n8n/` | Webhook client + shared handlers |
| `lib/knowledge/` | Product Brain knowledge jsonb + website ingest |
| `lib/scene-types/` | Typed scene renderery (gated) |
| `video-worker/` | Render runtime |
| `content-package-worker/` | Package generation runtime |
| `component-capture-worker/` | Website screenshots |
| `supabase/migrations/` | Schema |
| `n8n/` | Exportované workflow JSON (mohou se lišit od živé n8n instance) |
| `docs/`, `reports/` | Historické audity — **nezdroj pravdy** |

---

## C. Skutečná produkční pipeline

Toto je cesta **Content Production → GENERATE CONTENT**, doložená kódem a živými `production_runs` (111 řádků). Paralelně existuje weekly-strategy větev ve stejném n8n workflow; tabulka `project_action_runs` má **0 řádků**, takže weekly action-run UI cesta v živé DB není používaná.

### C0. Předpoklady (mimo samotný run)

1. Admin vytvoří `projects` (`app/projects/new`). Product Brain = sloupce projektu (`product_is`, `pain_points`, `tone_of_voice`, …) + `projects.knowledge` jsonb (`lib/knowledge/types.ts`).
2. Volitelně: extract knowledge (`lib/ai/workflows/extractKnowledge.ts`, Claude), website ingest + component capture, asset library (`assets` / `project-assets`).
3. Volitelně: evergreen topics, trend scan, weekly strategy. Production run to nepotřebuje, pokud `PRODUCTION_STRATEGY_PLANNER=ai` (default kódu je `legacy` — viz C1).

### C1. Spuštění runu

**Trigger:** `ContentProductionPanel` → server action `startProductionRun` (`app/projects/[id]/production/actions.ts`).

**Vstup:** `projectId` + production config (počet packages, platformy, multipliery, `generationMode`: `production` \| `sample` \| `manual_review`).

**Co vytvoří:**

- řádek `production_runs` (`createProductionRun` v `lib/api/production-run-admin.ts`)
- `production_run_items` (sloty)
- strategy items: buď `seedProductionStrategyInputs` (`legacy`) nebo `planContentStrategy` (`ai`)

**Model / služba:** při `PRODUCTION_STRATEGY_PLANNER=ai` Claude přes `getStrategyProvider()`, timeout 180 s, 1 transport attempt (`lib/ai/workflows/planContentStrategy.ts`). Default funkce `readProductionStrategyPlannerMode()` vrací `"legacy"`, pokud env není přesně `"ai"`.

`NEOVĚŘENO` — hodnota `PRODUCTION_STRATEGY_PLANNER` v produkčním prostředí. Obě větve jsou v kódu.

**Chyba:** pokud už běží aktivní run, start se odmítne. Planner failure hodí Error a run zůstane; recovery cron se pokouší reconcilovat stuck stavy **bez** nového AI.

**Další krok:** `sendN8nWebhook({ workflow: "generate_content_package", payload: { production_run_id } })`.

### C2. n8n most (živý workflow)

Workflow **Generate Content Package — Bridge (package loop)**  
id `O27ELb1s9Y2qisOr`, **active: true**, webhook `POST /webhook/generate-content-package`.

Tok:

1. N1 webhook
2. N1b: je `production_run_id`? → N2p čte `content_strategy_items` filtrem `brief->>production_run_id`
3. N2b SplitInBatches
4. N3 POST `http://content-package-worker:8081/generate-content-package`, timeout 900000 ms, **maxTries 1**, `onError continueRegularOutput`
5. N3b: `ok === true && data.packageId` → N4 jinak zpět do loopu
6. N4 POST `https://fenrikmarketing.vercel.app/api/n8n/start-video-job`, **retryOnFail true, maxTries 3**

Neaktivní: `Generate Content Package — Bridge (minimal)` a `… (LEGACY — do not use)`.

### C3. Generace jednoho Content Package

**Handler:** `handleGenerateContentPackageRequest` (`lib/n8n/handleGenerateContentPackageRequest.ts`) → `runGenerateContentPackage` (`lib/ai/workflows/generateContentPackage.ts`).

**Vstup:** `{ project_id, strategy_item_id }`.

**Idempotence:** pokud už existuje package pro `(project, strategy_item)`, vrátí ho bez AI. Pokud chybí `video_jobs` u video-required package, pokusí se heal insert jobu.

**Lease:** `claimPackageGeneration` do `content_package_generation_claims` (PK `strategy_item_id`), default lease 900 s (`PACKAGE_GENERATION_LEASE_SECONDS`). Heartbeat. Při `busy` vrací `generation_in_progress`.

**Kreativa:** `runCreativePipeline` — viz sekce D.

**Persist:** `persistNewPackage` zapíše:

- `content_packages` status `draft`, `package_brief` jsonb (hook, voiceover, image_prompts, visual_scenes, presentation_generation, platform_outputs, …)
- `content_items` per platform
- `video_jobs` status `queued`, `provider = video_engine`, `input` jsonb — **pokud** `requireVideo` a mode není `manual_review` (video se odloží)

**Social image:** `generateAndPersistPackageSocialImage` — OpenAI `gpt-image-1`, soft-fail, `ai_visuals` + bucket `generated-visuals`. Živě 41 `ai_visuals`, 41 packages se `social_image` v briefu.

**Telemetry:** `presentation_generation.generation_telemetry` (steps). Živě object u 122 packages.

**Chyba:** `classifyGenerationThrow` → settle `production_run_items` failed + `production_run_item_failure_telemetry` (7 živých řádků). JSON repair / až 2 Claude pokusy u Content Package (`CONTENT_PACKAGE_MAX_ATTEMPTS = 2`).

**Retry:** technický HTTP retry v `fetchWithRetry` (AI: 3 pokusy na 429/5xx/timeout). Kreativní regenerace je jiný workflow (`runRegenerateContentPackage`).

### C4. Start video job

**Trigger:** n8n N4 nebo později Continue Generation / retry / scene editor rerender.

**Handler:** `app/api/n8n/start-video-job/route.ts`.

- ověří package
- `claimVideoJobForDispatch` — job zůstává `queued` až do startu workeru (Variant 1)
- `startVideoWorkerJob` → `VIDEO_WORKER_URL` + `VIDEO_WORKER_SECRET`
- callback ` /api/n8n/video-callback`

Idempotence: `artifacts_ready` / `terminal` / `busy` vrací 202 bez nového renderu.

Manual Review: `shouldDeferVideoUntilCreativeReview` → 202 `no_video_job` / `text_only`.

### C5. Video worker

`video-worker/server.ts` přijme job, 202, zařadí do in-memory FIFO. Default `MAX_CONCURRENT_VIDEO_JOBS = 1`.

`runVideoJob` (`video-worker/jobRunner.ts`):

1. `claimVideoJobForWorker` (lease default 600 s)
2. TTS + Whisper transcription (tail validation)
3. Optional SFX mix (failure → voice-only)
4. Scene rasters (generate or reuse)
5. `buildStoryboard` (audio master clock)
6. Phrase captions; prefer Whisper word timestamps
7. `renderMp4` FFmpeg
8. Thumbnail
9. Upload mp4 / thumbnail.png / subtitles.srt do `video-renders/{project_id}/video/{video_job_id}/`
10. Persist `video_jobs.output` (`mp4_url`, `thumbnail_url`, `subtitle_url`, `render_spec`, `debug`)
11. Callback

Voiceover MP3 se **neuploaduje** (typ `mp3` v `storage.ts` existuje, success path v `jobRunner` ho nevolá). Temp soubory se maže v `finally`.

### C6. Callback a review

`/api/n8n/video-callback` uzavře job, reconciluje `production_run_items` / `production_runs`. Package zůstává `draft` dokud admin neschválí (`package_status`: draft/ready/approved/published/archived).

Review: `app/projects/[id]/review` + `ReviewPackageSection` (přehrávání, status, translations, social image, actions).

### C7. Regenerace a varianty

- **Regenerate package:** n8n `Regenerate Content Package — Bridge (minimal)` (active) → Vercel `/api/n8n/regenerate-content-package` → snapshot `content_versions` → znovu `runCreativePipeline` → nový `video_jobs`. Živě `content_versions` = 4 řádky.
- **Retry video render:** `retryVideoJob.ts` — nový `video_jobs` řádek, stejný input, reuse stills, bez Claude; lineage v `input.retry_of_video_job_id`; failed řádek zůstává.
- **Language variants:** `translation_jobs` (439 řádků), `render_kind=variant` (220 jobů). Variant zakazuje novou image generaci (`forbidImageGeneration`).
- **Scene editor:** ruční edit stillů / VO / pořadí, pak rerender.

### Tok (produkční, zjednodušeně)

```
Product Brain
  → (optional AI strategy planner)
  → content_strategy_items
  → n8n loop
  → Video Concept (Claude)
  → Opening Impact (OpenAI)
  → Visual Identity (deterministic)
  → Content Package JSON (Claude + OpenAI repair)
  → content_packages.package_brief + content_items + video_jobs.queued
  → optional social image (OpenAI Images)
  → video worker: TTS → images → storyboard → FFmpeg → Storage
  → draft package in Review
```

---

## D. Video pipeline

### Video strategy

**Neexistuje** samostatný krok „video strategy“. Strategii tvoří `planContentStrategy` nebo weekly strategy / legacy seed. Výstup jsou `content_strategy_items` (topic, angle, platform, format, funnel_stage, brief jsonb). Video concept je až C3.

### Video concept

`runVideoConcept` → Claude, timeout 120 s, `maxTransportAttempts: 1`.  
Prompt: `lib/content-pipeline/prompts/videoConcept.ts` (`VIDEO_CONCEPT_SYSTEM`, `buildVideoConceptPrompt`).  
Vstup: Product Brain, knowledge proof/scenarios, memory, funnel, topic/angle, creative directives, pain point.  
Výstup: `VideoConcept` (title, core_idea, narrative_arc, emotional_tone, visual_direction, …).  
Uložení: `package_brief.presentation_generation.video_concept`. Živě u 104 packages.

### Opening impact / hook

`runOpeningImpact` → OpenAI text (`gpt-4o-mini`), timeout 90 s.  
Prompt: `lib/content-pipeline/prompts/openingImpact.ts`.  
Výstup: first_image, first_spoken_sentence, emotion, pacing, attention_pattern.  
Hook v package JSON je samostatné pole `hook` (vždy v briefu, 433/433). Opening artifacts jen u novější pipeline (104).

`alignOpeningVoiceover` zarovnává první větu VO na opening.

### Scénář

Pole `script` je na **každém** completed `video_jobs.input` (615/615). Vzniká v Content Package JSON (Claude), ne samostatným modelem. Není tabulka scénářů.

### Voiceover text

Claude v Content Package; guardrail 40–70 slov target, hard cap 80 (`VOICEOVER_HARD_CAP_WORDS` v `lib/ai/guardrails.ts`). Uloženo v `package_brief.voiceover_text` a `video_jobs.input.voiceover_text`.

### Dělení na scény

Claude vrací `visual_scenes` (185 packages) a/nebo `image_prompts`. Worker `buildRenderSpec` preferuje `renderSchema`; fallback řeže `image_prompts` na `MAX_VIDEO_SCENE_STILLS = 5` a sloučí s `asset_images`. Živě visual_scenes délky: 5 (114), 4 (64), 3 (7).

**Neexistuje** samostatná tabulka `scenes`.

### Creative intent

Existuje v Manual Review / Creative Review: `lib/creative-review/sceneIntent/generateSceneIntents.ts` (Claude). Není povinný krok production mode. Živě `package_brief.creative_review` u 6 packages.

### Image prompt

1. Claude vyplní `image_prompt` ve `visual_scenes` / `image_prompts`.
2. `normalizeImagePrompts` + `normalizeVisualScenePlan` (deterministické).
3. Worker `video-worker/services/imagePrompt.ts` sanitizuje (strip readable text) a přidá `NO_TEXT_DIRECTIVE`.
4. Typed scény (PHONE/CHECKLIST/…) skládají raster lokálně, ne vždy nový diffusion prompt.

### Generace obrázků

`OpenAIImageProvider.generateImage` → `https://api.openai.com/v1/images/generations`, model default `gpt-image-1`, size videa `1024x1536` (`VIDEO_SCENE_IMAGE_SIZE`). Timeout 300 s, až 3 transport pokusy.  
Edit: `/v1/images/edits` (`OPENAI_IMAGE_EDIT_MODEL`).  
Moderation fallback: `generateSceneImageWithModerationFallback.ts`.  
Reuse: pokud `image_bucket` + `image_path`, žádný nový call.

### Počet scén

Prompt + cap 5 generovaných stillů. Storyboard beatů 3–5 (`SHORT_PROFILE`). Pool může obsahovat i asset stills (`MAX_SCENE_POOL`). Scene editor má vlastní min/max (`MIN_SCENES_IN_VIDEO` / `MAX_SCENES_IN_VIDEO` v `videoSceneEditor.ts`).

### Délka scén / beatů

`DEFAULT_SCENE_DURATION_SECONDS = 4` je fallback. Produkční délka beatů: `planBeatDurations` z naměřeného TTS + role weights; audio je master clock. Profil: minBeat 2 s, maxBeat 5 s, video 15–25 s + 1,5 s tail.

### Pohyb, zoom, posun, ořez, přechody

`lib/video-engine/motion.ts` + `semanticMotion/resolveSceneMotion.ts`.  
Primitiva: `zoom_in|zoom_out|pan_left|pan_right|drift_up|drift_down|static`.  
Amplituda LOW/MEDIUM (zoom 0.12 / 0.16). Upscale `SCALE_HEADROOM = 1.4` před crop.  
Přechody: `fade` → xfade fade, `slide` → slideleft, `push` → smoothleft, první beat `none`. Duration 0.4 s.  
Opening může mít `opening_motion_intent`; živě jen 28 completed jobů má tento klíč.

Komentář v `jobRunner.ts` ř. 534 stále říká „8–15 short moving beats“ — **zastaralý komentář**, kód používá `SHORT_PROFILE.maxBeats = 5`.

### Voiceover audio

`video-worker/services/tts.ts` → `getSpeechProvider()` → `gpt-4o-mini-tts`, default voice `alloy`, format mp3, optional `instructions` z tone of voice (`lib/voice/buildTtsInstructions.ts`). ffprobe měří duration. Tail validation: `ttsTailValidation.ts`.

### Titulky

Phrase captions 2–5 slov (`phraseCaptions.ts`). Prefer Whisper word timestamps (`whisper-1`, `verbose_json`). Fallback proporcionální odhad. Burn-in libass, style `FontSize=16,Bold=1,...` v `ffmpeg.ts`. SRT se ukládá do Storage. Živě `subtitle_source=whisper` u 598 completed jobů.

### Hudba

**Neexistuje.** Žádný music provider, žádný bed mix, žádné pole soundtrack v job input.

### Ambient / SFX

Programatický WAV overlay (`video-worker/services/sfx/programmaticSfx.ts` + `mixSfx.ts`), kategorie impact/click/whoosh/… Plán z attention promptu (`sfx_selected` na job input). Selhání SFX nespadí render. Živě: 9 true, 20 false, 689 null.

Ambientní bed **neexistuje**.

### FFmpeg render

`video-worker/services/ffmpeg.ts` `renderMp4`:

- stills → zoompan → xfade chain → mux audio (apad tail) → burn subtitles
- video `libx264` + `yuv420p` + fps 30; audio `aac` 192k
- **CRF/preset není nastavené** (ffmpeg default)
- timeout default 10 min (`VIDEO_WORKER_FFMPEG_TIMEOUT_MS`)
- výstup 1080×1920, profil `short` only

### Výstupní formáty a úložiště

- `output.mp4`, `thumbnail.png`, `subtitles.srt` v `video-renders/{projectId}/video/{jobId}/`
- signed URL default TTL 365 dní (`VIDEO_WORKER_SIGNED_URL_TTL_SECONDS`)
- buckety private
- `video_jobs.output`: mp4_url, thumbnail_url, subtitle_url, render_spec (stills + motion), debug

### Regenerace scény

`regenerateVideoSceneImage` → worker `/regenerate-scene-image` (OpenAI image). Historie stillů v editor metadata (`appendSceneImageVersion`). Rerender celého videa: `runSceneEditorRerender`.

### Verze videa

Není tabulka video versions. Historie = více `video_jobs` na stejný `content_item_id` (retry vytvoří nový řádek; newest wins). Scene still versions v JSON metadata editoru. Package-level snapshot jen při regenerate do `content_versions` (4 řádky).

### Finální schválení

`content_packages.status` a `content_items.status` (`approval_status`). UI: Review actions, Creative Review continue/cancel, client review (`client_projects` status draft → approved → paid → delivered). Žádné hvězdičky.

---

## E. AI provideři a modely

Žádný Anthropic/OpenAI SDK v `package.json` — volání přes `fetch` v `lib/ai/claude.ts` a `lib/ai/openai.ts`. Routing v `lib/ai/index.ts`.

| Provider | Model ID v kódu | Účel | Místo volání | Vstupy | Výstupy | Parametry | Timeout | Retry | Fallback | Uložení | Produkce | Env |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Anthropic | `claude-sonnet-4-6` default; override `ANTHROPIC_MODEL` | strategy, copy, scoring, evergreen, video concept, content package, localization, scene intents, scenarios, knowledge | `ClaudeProvider.complete` | system + user prompt | text JSON | max_tokens default 4096; temperature default 0.7; planner až 8192 | per-call (concept 120s, package 180s, strategy 180s) else HTTP 60s | transport 3; Video Concept 1 transport; Package maxAttempts 2 + JSON repair | OpenAI JSON repair při parse/schema fail | telemetry step + `raw` v paměti; persist compact telemetry, ne full raw | ano | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| OpenAI Chat | `gpt-4o-mini` | Opening Impact, JSON repair, helper text | `OpenAITextProvider.complete` | system + prompt | text | temperature default **0.2** (Claude 0.7); json mode dle req | Opening 90s; else 60s | 3 transport | none beyond repair loop | telemetry | ano | `OPENAI_API_KEY` |
| OpenAI Vision | `gpt-4o-mini` | asset analysis | `OpenAIVisionProvider` | image + prompt | text JSON | — | 60s | 3 | — | `analyzeAsset` workflow | ano pokud se analyzují assety | `OPENAI_API_KEY` |
| OpenAI Images | `gpt-image-1` | scene stills, social image, scene edit | `OpenAIImageProvider` | prompt; size 1024x1536 video / 1024x1024 default | b64/url | size | 300s images; edit 60s | 3 | 1) moderation-safe prompt retry 2) **lokální branded PNG** (`writeLocalBrandedSceneFallbackPng`) bez AI; language variant reuse only | Storage + render_spec; social → `ai_visuals` | ano | `OPENAI_API_KEY`, `OPENAI_IMAGE_EDIT_MODEL`, `OPENAI_IMAGE_EDIT_MULTI` |
| OpenAI TTS | `gpt-4o-mini-tts` | voiceover | `OpenAISpeechProvider.synthesize` | text, voice (default alloy), instructions | mp3 bytes | format mp3 | 60s | 3 | — | mux do MP4; MP3 se nepersistuje | ano | `OPENAI_API_KEY` |
| OpenAI Whisper | `whisper-1` | word timestamps pro titulky | `OpenAITranscriptionProvider` | mp3 file, language hint | verbose_json words | timestamp_granularities word | 60s | 3 | proporcionální captions | `debug.subtitle_source` | ano (598 jobů whisper) | `OPENAI_API_KEY` |

### Explicitně neintegrované (hledáno v ts/tsx mimo reports)

| Služba | Stav |
|---|---|
| ElevenLabs | **Neexistuje** volání. Zmínky jen v testech „nesmí obsahovat elevenlabs“ a forensic dump enum |
| Runway | **Neexistuje** |
| Replicate / Stability / Midjourney | Enum `visual_provider` v DB (`ai_visuals.image_provider`), **žádný klient** |
| fal.ai, Luma, Kling, Pika, Minimax, HeyGen | **Neexistuje** |
| MusicGen / Suno | **Neexistuje** |

`NEOVĚŘENO` — zda produkční `ANTHROPIC_MODEL` není přepsaný na jiný než default.

---

## F. Prompty a orchestrace

### Kde jsou prompty

Hardcoded TypeScript, ne DB, ne admin UI.

| Soubor | Krok |
|---|---|
| `lib/content-pipeline/prompts/videoConcept.ts` | Video Concept |
| `lib/content-pipeline/prompts/openingImpact.ts` | Opening Impact |
| `lib/content-pipeline/prompts/contentPackage.ts` | Content Package |
| `lib/content-pipeline/prompts/contentPackageVisualScenes.ts` | expected shape / visual scenes |
| `lib/content-pipeline/prompts/contentPackageContract.ts` | CTA/funnel contract |
| `lib/ai/prompts/contentStrategyPlan.ts` | production strategy planner |
| `lib/ai/prompts/weeklyStrategy.ts` | weekly strategy |
| `lib/ai/prompts/jsonRepair.ts` | OpenAI repair |
| `lib/ai/prompts/context.ts` | `projectBrainBlock` sdílený všemi |
| `lib/ai/prompts/creativeDirectives.ts` | creative mode seed |
| `lib/ai/prompts/analyzeAsset.ts`, `extractKnowledge.ts`, `evergreenTopicGeneration.ts`, `trendRelevanceScoring.ts`, `localizeContentPackage.ts`, `generateScenarios.ts`, … | vedlejší workflow |

`lib/ai/prompts/generateContentPackage.ts` je **legacy stub** (komentář: Presentation prompt removed). `buildGeneratePackageSystem` se jinde nevolá. Produkce používá `lib/content-pipeline/prompts/contentPackage.ts`.

### Verze promptů

Žádná tabulka prompt versions. Identita běhu: `content_pipeline_fingerprint` v presentation_generation; `PIPELINE_TELEMETRY_VERSION = pipeline-telemetry@1`; `PRICING_VERSION = list-price@2026-07-23`.

### Skládání

Prompt = SYSTEM konstanta + `buildXPrompt()` skládá bloky: Product Brain, proof, scenarios, pain point, anti-repetition memory, creative directives, regeneration instruction, platform rules, attention block.

### Product Brain do promptů

`projectBrainBlock(project)` serializuje sloupce `projects`: name, type, language, market_scope, goal_type, target_audience, tone_of_voice, product_is/is_not, strengths, pain_points, forbidden_claims, platforms, default_cta. Plus `proofBlock` / `scenarioBlock` z `projects.knowledge`.

Knowledge karty (product/customer/voice/proof) se při approval kompilují do těchto sloupců (`lib/knowledge/types.ts`).

### Navazující AI kroky (production package)

```
planContentStrategy? (Claude)
  → runVideoConcept (Claude)
  → runOpeningImpact (OpenAI)
  → buildVisualIdentity (no AI)
  → runContentPackageGeneration (Claude)
       ↳ optional OpenAI JSON Repair
  → persist
  → optional gpt-image-1 social
  → worker: TTS → Images ×N → Whisper → FFmpeg
```

Manual Review vsune Creative Review (scene intents Claude) před videem.

### Ukládá se finální prompt / raw request / raw response?

Telemetry krok má `input_summary` a `output_summary` s komentářem **never the full prompt** (`lib/ai/telemetry/types.ts`). `measureInput` se používá na **byte size**, ne na persist celého textu.  
Provider vrací `raw` v paměti (`ClaudeProvider.complete`). Persistuje se compact `raw_usage` (token counts).  
Failure telemetry: `output_hash` sha256 last raw; `output_snapshot` bounded/truncated (`production_run_item_failure_telemetry`).  
**Zpětně nelze z DB rekonstruovat přesný prompt, který model dostal**, jen artefakty výstupu (concept JSON, package_brief, image_prompts, debug).

### Společná vrstva

Ano: `lib/ai/index.ts` + `generateValidatedJson` + `fetchWithRetry` + `withTelemetry`. Image engine nesmí volat OpenAI přímo — `getImageProvider()`. Volání jsou centralizovaná, ne rozptýlená SDK po komponentách. Worker ale volá stejné providery z Node procesu.

---

## G. Databáze a storage

Živé tabulky `public` (29): shoda s migracemi. **Žádné tabulky** `scenes`, `music`, `prompts`, `ratings`, `benchmarks`, `ai_requests`.

### Tabulky relevantní pro obsah/video

| Tabulka | Řádků (živé) | Účel | Důležité sloupce | Zápis | Čtení | Aktivní |
|---|---|---|---|---|---|---|
| `projects` | 26 | Product Brain + projekt | product_*, knowledge jsonb, platforms, tone_of_voice | admin forms | všechny workflow | ano |
| `assets` | 129 | knihovna | storage_bucket/path, metadata, asset_mode | ingest/upload | package generation, scene editor | ano |
| `asset_variants` | 0 | varianty assetů | — | téměř nikde mimo export script | ne | **nepoužívaná** |
| `asset_usage` | 164 | které assety package použil | used_as, metadata | generateContentPackage | memory / policy | ano |
| `evergreen_topics` | 6 | evergreen | title, angle | evergreen workflow | strategy planner | málo |
| `trends` | 2 | trend scan | source, signal_strength | trend workflow | weekly/score | málo |
| `content_strategies` | 112 | týdenní / run strategie | strategy_brief, period | weekly + planner | n8n / packages | ano |
| `content_strategy_items` | 530 | 1 item ≈ 1 package slot | brief jsonb, funnel_stage, platform | planner/seed | generate package | ano |
| `content_packages` | 433 | kanonický package | package_brief jsonb, status | generate/regenerate | review/UI | ano |
| `content_items` | 3520 | per-platform copy | body, caption, language, generation_metadata | persist package / translation | review, publish | ano |
| `video_jobs` | 718 | render job | input/output jsonb, provider, lease_*, render_kind, status | generate, retry, variants, editor | worker, review, editor | ano |
| `ai_visuals` | 41 | image jobs (social) | prompt, image_provider enum, result_path | social image | UI | ano, úzké použití |
| `production_runs` | 111 | dávka | requested_config, counts, status | start/stop/recovery | UI telemetry | ano |
| `production_run_items` | 495 | 1 slot | strategy_item_id, package/video ids, status | settlement | UI | ano |
| `content_package_generation_claims` | 111 | exclusive package gen | lease, owner_token | claim/heartbeat | runtime | ano |
| `production_runtime_recovery_leases` | 1 | global recovery lock | — | recovery endpoint | recovery | ano |
| `production_run_item_failure_telemetry` | 7 | failed attempt metrics | tokens, cost, snapshot, generation_telemetry | classifyGenerationThrow | RunTelemetryPanel | ano, řídké |
| `translation_jobs` | 439 | localization queue | attempts, language, status | variants | drain worker | ano |
| `content_versions` | 4 | snapshot při regenerate | snapshot jsonb | regenerate* | `/history` | **téměř nepoužívaná** |
| `content_performance` | 0 | post metrics | impressions… | žádný produkční writer nalezen | history-admin čte | **nepoužívaná** |
| `publishing_schedule` | 10 | plán publikace | scheduled_at | planner | scheduled tab | málo |
| `project_action_runs` | 0 | weekly action timeline | step enum | n8n action-run-status | actions UI | **kód existuje, živě prázdné** |
| `clients` / `client_projects` / packages / items / comments | 19/16/20/20/1 | klientský delivery | video_url, captions, notes | admin client UI | client-review | ano |
| `sample_requests` | 6 | lead form | UTM | landing | admin | ano |
| `admin_preferences` | 1 | editor language | editor_language | settings | manual_review | ano |

### Nesoulad kód vs DB vs komentáře

- **`production_run_items.status`:** živý CHECK dovoluje jen `queued|running|completed|failed`. TypeScript `ProductionRunItemStatus` i `cancelManualReview` zapisují **`cancelled`** (`lib/ai/workflows/cancelManualReview.ts`). Settlement RPC mapuje otevřené itemy na `failed` při cancel rodiče. Živě 0 itemů se statusem cancelled — Cancel Manual Review by na CHECK mohl spadnout.
- Typy v `lib/supabase/types.ts` jsou ruční, ne generated. Chybí sdílené interface pro řadu tabulek (claims, failure telemetry, evergreen, trends, content_versions, …).
- Migrace `018_video_scene_editor_metadata.sql` je dokumentační (`SELECT 1`) — scene editor metadata žije v `content_items.generation_metadata`.
- Enum `visual_provider` obsahuje replicate/stability/midjourney, klienti chybí.
- `render_kind` check dovoluje `'scene'`, živě jen `package` (498) a `variant` (220).
- Storyboard komentáře 8–15 beatů vs `SHORT_PROFILE` 3–5.
- `jobRunner` komentář „Creative Engine“ v generateContentPackage lease — Creative Engine smyčky jsou odstraněné (`runCreativePipeline` to říká výslovně).
- `.env.local.example` komentář mluví o „voiceover mp3 before upload“; success path v `jobRunner.ts` MP3 neuploaduje.
- `n8n/` JSON exporty se mohou lišit od živé instance; audit bere živé n8n MCP.

### Storage

Buckety (živé, všechny `public=false`):

| Bucket | Cesta | Obsah |
|---|---|---|
| `project-assets` | `{project_id}/source/{asset_id}/{filename}` | upload/ingest |
| `generated-visuals` | `{project_id}/generated/{ai_visual_id}/{filename}` | social + některé edited stills |
| `video-renders` | `{project_id}/video/{video_job_id}/{filename}` | mp4, thumbnail, srt, scene stills v render_spec |

URL expirují: signed, default 365 dní.  
Původní + zpracované: stills se po renderu persistují v `render_spec` (reuse). TTS originál se maže.  
Checksum: sha256 u website ingest (`lib/knowledge/websiteImageDedupe.ts`) a failure `output_hash`. **Ne** u video MP4.  
Mazání: project delete maže storage (`lib/api/projects-admin.ts`); asset delete archive-or-remove (`lib/api/assets.ts` `archived_at` v metadata). Video rendery se při retry nemažou (nový job, nová cesta).  
Benchmark retention: technicky lze nechat objekty v `video-renders` (private, signed TTL). **Není** politika archivace benchmarků.

---

## H. Retry, chyby a stabilita

### Technický retry (stejný request)

| Vrstva | Chování |
|---|---|
| `fetchWithRetry` | AI 3 pokusy, worker HTTP 2; retry jen timeout/network/429/5xx; backoff 300ms×2^n + jitter |
| Claude/OpenAI complete | používá výše; Video Concept/Opening/Package často `maxTransportAttempts: 1` |
| `generateValidatedJson` | default maxAttempts 3; Content Package 2; parse fail → 1× OpenAI repair; pak regenerate s `retryPromptAppend` |
| n8n N3 generate package | **maxTries 1** (incident d154/b343) |
| n8n N4 start-video-job | maxTries 3 — **riziko duplicitního dispatch** pokud worker přijme a n8n považuje HTTP za fail |
| Storage upload | až 3 (max 5) pokusy, upsert true |
| SFX | 1 pokus, při chybě voice-only |
| Whisper align | best-effort, fallback proportional |
| TTS tail validation | až **3** cykly TTS+Whisper (`TTS_TAIL_VALIDATION_MAX_ATTEMPTS`) pokud skriptový ocas není ve audio |
| Image moderation | 1 safe-prompt retry, pak lokální branded PNG bez placeného image call |

### Kreativní regenerace (jiný produktový akt)

- `runRegenerateContentPackage` — nový Claude běh, nový fingerprint, snapshot starého package
- Scene image regenerate / edit — nový image call, historie stillů
- `retryVideoJob` — **není** kreativní: stejný input, nové FFmpeg/TTS pokud stills reuse (komentář: stills reuse, no image gen). TTS se v workeru volá vždy znovu (nový speech call). Nový řádek nese `input.retry_of_video_job_id`. Failed job zůstává jako historie.

### Fallback modely

Žádný Claude↔GPT fallback pro concept/package. JSON repair je OpenAI. Image moderation: safe-prompt retry, pak lokální branded PNG bez AI. Typed scenes padají na IMAGE, pokud feature flag vypnutý.

### Fallback nedokončeného videa

Lease expiry → recovery označí stale (`STUCK_VIDEO_JOB_MESSAGE`). Artifacts-ready promote, pokud upload prošel a callback selhal. Žádný „partial video as product“.

### Ukládání pokusů

Telemetry `retry_count` na stejném step objektu, ne samostatný řádek na každý HTTP attempt. Failure table ukládá failed package attempt. Retry video = nový `video_jobs` řádek (failed zůstává).

### Admin zobrazení chyb

- `VideoJobFailureBlock`, `FailedVideoJobEditor`, `RetryVideoRenderButton`
- `ReviewExceptionsDashboard`
- `RunTelemetryPanel` (failed steps, cost, duration)
- `production_run_items.error_message`, `video_jobs.error_message`
- package status badges v `ReviewPackageSection`

### Duplicitní placený request — rizika (doložená)

1. `fetchWithRetry` opakuje 429/5xx — provider mohl práci dokončit.
2. n8n N4 3× start-video-job vs in-memory queue; mitigace: claim/lease + artifacts_ready.
3. Package idempotence je silná (1 package / strategy item + claim). Duplicate webhook bez existujícího package by claim odchytil jako busy.
4. Language variant + retry: image gen zakázaná; TTS+Whisper znovu.
5. In-memory video queue nepřežije restart workeru — job může zůstat queued/processing dokud recovery.

`NEOVĚŘENO` — zda v produkci `MAX_CONCURRENT_VIDEO_JOBS > 1`.

---

## I. Náklady a měření

Systém **neukládá billing z faktur**. Ukládá `estimated_cost` z list-price tabulek v `lib/ai/telemetry/cost.ts` (`PRICING_SOURCE = list_price_estimate`).

| Veličina | Ukládá se? | Kde | Poznámka |
|---|---|---|---|
| Text tokeny | ano (novější běhy) | telemetry step prompt/completion/cached_tokens | Anthropic + OpenAI usage extract |
| Cena textu | odhad ano | `estimated_cost` | rates claude-sonnet-4-6, gpt-4o-mini, gpt-4o |
| Cena obrázku | odhad | `IMAGE_USD_PER_STILL = 0.042` × count | ne skutečná invoice |
| Cena hlasu | odhad | `TTS_USD_PER_1K_CHARS = 0.015` | |
| Cena Whisper | odhad | `WHISPER_USD_PER_MIN = 0.006` | |
| Cena FFmpeg render | ne (0) | provider `video` step | CPU/hosting neměřen |
| Cena storage | ne | — | chybí |
| Počet pokusů | částečně | retry_count, translation_jobs.attempts, failure attempt_count | HTTP inner retries ne jako řádky |
| Délka audia | ano | `debug.audio_duration`, speech_duration | |
| Délka videa | ano | `debug.video_duration` + ffprobe diagnostics | |
| Cena scény | ne jako sloupec | lze sečíst image steps pokud telemetry existuje | chybí u starých jobů |
| Cena videa | částečně | sum worker debug telemetry | 498 completed jobů **bez** debug telemetry |
| Cena package | částečně | package generation_telemetry 122/433 | |
| Cena runu | UI rollup | `aggregateRunTelemetry.ts` sčítá **uložené** estimated_cost | historicky nekompletní |

Chybí k dopočtu skutečné ceny použitelného výsledku: provider invoice IDs (většinou `provider_request_id` optional), storage GB, render compute, failed-then-succeeded pokusy u starých dat, TTS/Whisper duplicity bez estimated_cost na workeru u starších jobů.

---

## J. Administrační rozhraní

Použitelné později pro Benchmark Lab **bez úprav teď**:

| Obrazovka / komponenta | Co umí | Lab potenciál |
|---|---|---|
| `/projects/[id]/production` `ContentProductionPanel` | počet packages, platformy, start/stop run | spuštění N generací |
| `CurrentRunPanel` | stav běhu | progress |
| `/projects/[id]/review` `ReviewPackageSection` | video play, copy, status, translations | prohlížení výstupů |
| `PackageVideoPanel` `VideoPreview` | přehrávání | porovnání by potřebovalo layout vedle sebe — **není** |
| `RunTelemetryPanel` | duration, est. cost, steps, failed | čas/cena |
| `RunInsightsPanel` | agregace runu | |
| `VideoSceneEditor` | scény, duration, prompt, regenerate still, history stillů, VO edit, rerender | per-scene inspect |
| `RetryVideoRenderButton` / `FailedVideoJobEditor` | technický retry | |
| `/projects/[id]/creative-review/[runId]` | gate před videem, continue generation | ne scoring |
| `/history` | `content_versions` | skoro prázdné |
| `/projects/[id]/videos` | seznam videí, download | |
| Client review | klientské poznámky, ne hvězdy | notes analog |
| Export | `app/api/production-runs/[runId]/export`, client-project export | částečný dump, ne lab schema |
| Settings | editor language, integration configured flags | |

Nezobrazeno jako first-class: full prompt, raw response, hvězdy, side-by-side varianty, provider switcher.

---

## K. Připravenost na AI video

| Otázka | Stav | Důkaz |
|---|---|---|
| Runway integrace | **Neexistuje** | žádný import/call |
| Jiný i2v / t2v | **Neexistuje** | grep image-to-video/text-to-video prázdný |
| Video per scéna v datovém modelu | **Ne.** Scény jsou JSON stills v `video_jobs.input/output.render_spec` | schema `Scene` má image_prompt, image_bucket/path, duration |
| Render přijme video místo obrázku | **Ne.** `RenderMp4Input.images: { imagePath }[]`; zoompan na still | `ffmpeg.ts` |
| Kombinace scén s vlastním audiem | VO je jedna osa pro celé video; SFX pod VO | jobRunner |
| Video generující zvuk | **Neexistuje** | |
| Titulky+VO+hudba vs scene audio | Hudba není; titulky burn; žádný mix scene-audio | |
| Délky řízené VO | **Ano**, audio master + tail 1.5s | storyboard + ffmpeg `-t` |
| Co by se rozbilo | storyboard beat reuse stills; zoompan; xfade offsets; scene editor image history; language variant reuse stills; cost cap 5 stills; semantic motion primitives | |
| Co zachovat | Product Brain, strategy items, package_brief copy, TTS/subtitles, leases, n8n loop, telemetry, review UI, storage buckets, job callback | |

Typed rasters (checklist/phone/…) pořád produkují **PNG**, ne video.

---

## L. Připravenost na Benchmark Lab

| Položka | Hodnocení | Poznámka |
|---|---|---|
| Definice benchmarku | `NEEXISTUJE` | žádná tabulka/entita |
| Více variant stejného tématu | `EXISTUJE, ALE VYŽADUJE ÚPRAVU` | production run = N různých strategy items; ne N modelů téhož briefu. Language variants = stejný vizuál, jiný jazyk |
| Více providerů a modelů | `EXISTUJE, ALE VYŽADUJE ÚPRAVU` | routing hardcoded v `lib/ai/index.ts`; enum image provider širší než kód |
| Spuštění více generací | `EXISTUJE A LZE POUŽÍT` | production run package_count + n8n loop |
| Historie výsledků | `EXISTUJE, ALE VYŽADUJE ÚPRAVU` | video_jobs + packages; content_versions skoro prázdné |
| Ukládání request/response | `EXISTUJE, ALE VYŽADUJE ÚPRAVU` | jen summaries + truncated failure snapshot, ne full prompt/raw |
| Ukládání ceny a času | `EXISTUJE, ALE VYŽADUJE ÚPRAVU` | estimated_cost + duration_ms; nekompletní historicky; render=0 |
| Hodnocení hvězdičkami | `NEEXISTUJE` | grep star_rating/human_rating prázdný |
| Poznámky | `EXISTUJE, ALE VYŽADUJE ÚPRAVU` | client_note/internal_note, creative review history events — ne lab notes na video |
| Porovnávání kompletních videí | `NEEXISTUJE` | jeden player na package |
| Export dat | `EXISTUJE, ALE VYŽADUJE ÚPRAVU` | run export + audit scripts; ne stabilní lab dataset |
| Opětovné otevření starého benchmarku | `NEEXISTUJE` | lze otevřít starý run/review, ale ne jako frozen experiment |

---

## M. Proč jsou současná videa nudná

Pouze příčiny s důkazem v implementaci.

1. **Statické obrázky jako jediný vizuální vstup.** FFmpeg `beatVideoChain` bere still, upscale, `zoompan`, trim. Žádný video input. Subjekt se nehýbe.

2. **Opakující se pohyb kamery.** Uzavřená množina 7 primitiv; legacy `MOTION_CYCLE` rotuje zoom_in → pan_right → zoom_out → … Semantic motion mapuje role na stejná primitiva s LOW/MEDIUM amplitudou 12–16 %.

3. **Podobná struktura scén.** `SHORT_PROFILE` 3–5 beatů, max 5 stillů, recyklace poolu („beats REUSE the existing still pool“). Cost-flat by design.

4. **Opening impact se nemusí projevit v obraze.** Opening je JSON (first_image, first_spoken_sentence). Render ho použije nepřímo přes package/image prompts a volitelný `opening_motion_intent` (jen 28 jobů). Není dedicated cold-open clip.

5. **Jednotvárné tempo.** VO 40–70 slov, 15–25 s, 2–5 s/beat, 0,4 s fade. `MAX_BEAT_SHARE = 0.35` brání extrémním střihům.

6. **Chybějící děj v obraze.** Prompt zakazuje čitelný text/UI (`NO_TEXT_DIRECTIVE`). Checklist/phone/quote scény, které by nesly děj, jsou feature-gated a v datech téměř chybí (834 visual_scenes bez type).

7. **Chybějící pohyb subjektů.** Žádný i2v. Ken Burns simuluje kameru, ne akci.

8. **Chybějící SFX v praxi.** Kód umí overlay; 9/718 jobů `sfx_selected=true`.

9. **Žádný ambient.**

10. **Žádná hudba.**

11. **Monotónní hlas.** Jeden TTS model, default voice `alloy`, krátké `instructions`. Žádný acting pass, žádný ElevenLabs.

12. **Délka scén vázaná na VO, ne na vizuální akci.** Audio master clock.

13. **Návaznost obraz–VO je promptová, ne editační.** Žádný shot-level alignment kromě phrase captions.

14. **Střih = xfade 0.4 s mezi Ken Burns klipy.** Hard cut / match cut / J-cut neexistují.

15. **Zastaralý komentář 8–15 beatů** vs reálných 3–5 snižuje rytmickou variabilitu proti původnímu záměru v komentářích.

---

## N. Co zachovat

- Product Brain + knowledge karty + guardrails (forbidden claims)
- Exclusive leases / idempotence package / video claim Variant 1
- n8n jako tenký orchestrátor (ne AI v n8n)
- `generateValidatedJson` + JSON repair oddělené v telemetrii
- Audio jako master clock + tail buffer + Whisper phrase captions
- Durable `render_spec` (reuse stills, language variants)
- Scene editor + image history + retry-without-regenerate-copy
- `generation_telemetry` schema (steps, tokens, duration, estimated_cost)
- Recovery cron bez placené práce
- Private storage layout `{project_id}/...` + RLS owns_project
- Review UI (play, status, translations, telemetry panel)
- Central `lib/ai/index.ts` provider routing (místo scatter SDK)

---

## O. Co změnit nebo nahradit

Bez implementace — závěry auditu:

- Nahrazení still+zoompan pipeline, pokud cíl je AI video (FFmpeg vstup, storyboard, scene types PNG).
- Doplnit persist full prompt/request/response a per-attempt rows, pokud má jít měřit kvalita vs cena.
- Doplnit hudbu/SFX jako default, pokud má zmizet „tiché slideshow“; dnešní SFX je skoro vypnuté.
- Sjednotit scene-type flags; default IMAGE dělá z typed rendererů mrtvý kód v produkci.
- Opravit n8n N4 retry vs worker accept; hardcoded secrets v n8n nodech.
- Regenerace package by neměla záviset na Vercel 300 s, když generate už běží na workeru.
- Ceny worker media kroků zapisovat vždy (ne 0 u renderu; kompletnost u TTS/Whisper).
- Oddělit technický retry od kreativní regenerace v UI i v cost rollupu.
- Vyčistit legacy: `lib/ai/prompts/generateContentPackage.ts` system string, Creative Engine komentáře, neaktivní n8n bridges, Captioni workflow (cizí produkt v stejné n8n instanci), prázdné tabulky `content_performance` / `asset_variants`.
- Dokumentace v `docs/` často popisuje starou Creative Engine / 8–15 beatů — nepoužívat jako spec.

---

## P. Neověřené otázky

1. `NEOVĚŘENO` — produkční hodnota `SCENE_TYPES_ENABLED`, `CHECKLIST_GENERATION_MODE`, `CHECKLIST_ENABLED_PROJECT_IDS`.
2. `NEOVĚŘENO` — `PRODUCTION_STRATEGY_PLANNER` v produkci (`legacy` vs `ai`).
3. `NEOVĚŘENO` — `MAX_CONCURRENT_VIDEO_JOBS`, `ANTHROPIC_MODEL` override.
4. `NEOVĚŘENO` — živý Caddy config a OS na DigitalOcean (v repu je snippet + Dockerfile jen pro content-package-worker a component-capture; video-worker Dockerfile chybí).
5. `NEOVĚŘENO` — zda n8n v produkci vždy dosáhne `http://content-package-worker:8081` (živé workflow to tak má); HTTPS Caddy cesta je dokumentovaná, ale toto n8n workflow ji nepoužívá.
6. `NEOVĚŘENO` — Vercel team/project dashboard (MCP `list_projects` vyžaduje teamId).
7. `NEOVĚŘENO` — skutečné invoice částky Anthropic/OpenAI/Supabase/hosting.
8. `NEOVĚŘENO` — zda aktivní n8n workflow **Captioni — Subtitles** používá jiný produkt; z Fenrik kódu se nevolá.
9. `NEOVĚŘENO` — zda weekly-strategy / trend-scan / publishing-planner mosty se spouštějí mimo UI (cron v n8n mimo listed workflows). Uvedené mosty jsou active, ale `project_action_runs=0`.
10. `NEOVĚŘENO` — FFmpeg default CRF na hostu workeru (v argumentech není `-crf`).
11. `NEOVĚŘENO` — zda signed URL 365 dní je v produkčním env přepsané.
12. `NEOVĚŘENO` — kompletní shoda živého n8n s JSON v `n8n/` (audit použil živé MCP).
13. `NEOVĚŘENO` — kolikrát Cancel Manual Review v produkci narazilo na CHECK `production_run_items_status_check` (živé cancelled itemy = 0).

---

## Q. Evidence index

| Zjištění | Soubor | Řádek nebo symbol | Typ důkazu | Jistota |
|---|---|---|---|---|
| Produkční kreativní řetězec Concept→Opening→Identity→Package | `lib/content-pipeline/runCreativePipeline.ts` | `runCreativePipeline` | kód | potvrzeno |
| Concept = Claude 120s | `lib/content-pipeline/runVideoConcept.ts` | `TIMEOUT_MS`, `getCopywritingProvider` | kód | potvrzeno |
| Opening = OpenAI json-repair provider 90s | `lib/content-pipeline/runOpeningImpact.ts` | `getJsonRepairProvider` | kód | potvrzeno |
| Package = Claude, maxAttempts 2 | `lib/content-pipeline/runContentPackage.ts` | `CONTENT_PACKAGE_MAX_ATTEMPTS` | kód | potvrzeno |
| Claude default model | `lib/ai/claude.ts` | `DEFAULT_MODEL` | kód | potvrzeno |
| OpenAI image/TTS/Whisper defaulty | `lib/ai/openai.ts` | `DEFAULT_*` | kód | potvrzeno |
| Provider routing | `lib/ai/index.ts` | `getStrategyProvider` atd. | kód | potvrzeno |
| n8n živý package loop | n8n workflow `O27ELb1s9Y2qisOr` | N3 worker:8081, N4 start-video-job | n8n MCP | potvrzeno |
| GENERATE CONTENT trigger | `app/projects/[id]/production/actions.ts` | `startProductionRun` | kód | potvrzeno |
| Video job dispatch | `app/api/n8n/start-video-job/route.ts` | `startVideoWorkerJob` | kód | potvrzeno |
| Worker pipeline TTS→images→storyboard→ffmpeg | `video-worker/jobRunner.ts` | `runVideoJobInner` | kód | potvrzeno |
| Ken Burns + xfade | `lib/video-engine/motion.ts`, `video-worker/services/ffmpeg.ts` | `buildZoompanExpr`, `xfade=` | kód | potvrzeno |
| Profil 1080×1920 3–5 beatů 15–25s | `lib/video-engine/storyboard.ts` | `SHORT_PROFILE` | kód | potvrzeno |
| Max 5 generated stills | `lib/video-engine/storyboard.ts` | `MAX_VIDEO_SCENE_STILLS` | kód | potvrzeno |
| Všechny video_jobs provider video_engine | SQL `GROUP BY provider` | 718 rows | živá DB | potvrzeno |
| Completed 615 / failed 101 | SQL | — | živá DB | potvrzeno |
| Hudba neexistuje | grep music/sfx mix | pouze programmatic SFX | kód | potvrzeno |
| SFX skoro nepoužité | SQL `input->>'sfx_selected'` | 9 true | živá DB | potvrzeno |
| Runway/ElevenLabs klienti chybí | grep | — | kód | potvrzeno |
| Telemetry ne full prompt | `lib/ai/telemetry/types.ts` | komentář + fields | kód | potvrzeno |
| generation_telemetry u 122/433 packages | SQL | — | živá DB | potvrzeno |
| 3 private buckety | SQL storage.buckets + `006_storage.sql` | — | DB+migrace | potvrzeno |
| Voiceover MP3 se neuploaduje | `jobRunner.ts` upload block | jen mp4/png/srt | kód | potvrzeno |
| Scene types gated | `lib/scene-types/config.ts` | `SCENE_TYPES_ENABLED === "true"` | kód | potvrzeno |
| visual_scenes bez type 834 | SQL | — | živá DB | potvrzeno |
| content_versions=4, content_performance=0, asset_variants=0 | SQL list_tables verbose | — | živá DB | potvrzeno |
| Cena = list price estimate | `lib/ai/telemetry/cost.ts` | `PRICING_SOURCE` | kód | potvrzeno |
| Queue default concurrency 1 | `video-worker/queue.ts` | `maxConcurrent` | kód | potvrzeno |
| Recovery cron 2 min bez AI | n8n `0wgLd6QxLiT37iLR` | — | n8n MCP | potvrzeno |
| Caddy host renderer.fenrik.chat | `Caddyfile.content-package-worker.snippet` | DigitalOcean komentář + reverse_proxy | kód | potvrzeno záměr |
| `production_run_items` CHECK vs `cancelled` | živý `pg_constraint` + `cancelManualReview.ts` | update status cancelled | DB+kód | potvrzeno nesoulad |
| TTS tail max 3 | `video-worker/services/ttsTailValidation.ts` | `TTS_TAIL_VALIDATION_MAX_ATTEMPTS` | kód | potvrzeno |
| Image local branded fallback | `generateSceneImageWithModerationFallback.ts` | `writeLocalBrandedSceneFallbackPng` | kód | potvrzeno |
| Retry job lineage | `lib/ai/workflows/retryVideoJob.ts` | `retry_of_video_job_id` | kód | potvrzeno |
| OpenAI chat default temperature 0.2 | `lib/ai/openai.ts` | `OpenAITextProvider.complete` | kód | potvrzeno |
| Video worker host Dockerfile | glob Dockerfile* | jen content-package + capture | repo | potvrzeno absence; host NEOVĚŘENO |
| Hvězdičkové hodnocení | grep | žádný match | kód | potvrzeno neexistence |
| Captioni n8n active, mimo Fenrik | n8n search_workflows | id `SZb1QIDI5Z60Mum9` | n8n | silná evidence (cizí); použití NEOVĚŘENO |
| Produkční env flagy | `.env.example` neúplné vs kód | — | env | NEOVĚŘENO hodnoty |

---

*Konec auditu. Tento soubor je jediný výstup; v systému nebylo nic měněno.*
