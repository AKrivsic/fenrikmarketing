# Fenrik Studio — audit Production Run a generace Content Package

**Datum auditu:** 2026-08-19  
**Rozsah:** read-only — kód, migrace `supabase/migrations`, remote Postgres metadata (Supabase MCP), live n8n workflow metadata (n8n MCP).  
**Zákaz splněn:** žádné změny kódu, DB, migrací, n8n, feature flagů; žádné AI/placené/produkční joby; žádná tajemství v textu.

**Jistota:** tvrzení s důkazem níže. **`NEOVĚŘENO`** = nelze určit z repozitáře ani z read-only remote metadat.

---

## 1. Executive summary

Fenrik Studio vyrábí **Content Package** jako jednotku: jedno téma → jeden balíček (copy + volitelně video + platformní výstupy + volitelný FB/LI čtvercový obrázek). **Production Run** je dávkový kontejner: uživatel zadá **`packageCount`**; systém vytvoří **`package_count` run slotů** (`production_run_items`, `package_index` 0…N−1), naplní **`content_strategy_items`**, n8n iteruje položky **sekvenčně** (batch size 1) a pro každou volá generaci + při úspěchu start videa.

**Produkční video dnes:** FFmpeg **still-image Ken Burns** (`video_render_mode` chybí → default **`still`**). V remote DB: **498/498** package `video_jobs` bez `video_render_mode`; **`provider = video_engine`** (718 jobů). **AI video klipy** (`ai_video_clips`) jsou implementované ve workeru, ale **neaktivní** z Content Package pipeline (žádné nastavení v `buildVideoJobInput`). **`scene_video_generation_attempts`:** 0 řádků v produkci.

**Automatická vs ruční varianta:** `generationMode: production | sample` — video job hned po persist balíčku (pokud plán vyžaduje video). **`manual_review`** — video job **odložen** (`defersVideoUntilCreativeReview`); run může skončit ve stavu **`waiting_for_creative_review`**; po schválení všech balíčků **Continue Generation** → rebuild copy z Creative Review → nový video job.

**Orientační náklady (uložená telemetrie, ne faktura):** package LLM kroky **p50 ≈ 0,12 USD** (121 balíčků s telemetrií); video worker kroky u completed package jobů **p50 ≈ 0,22 USD** (85/422 s cost). Teoretický still balíček s videem: **≈ 0,35–0,55 USD** (LLM + 1 social image + ~5 stillů + TTS + whisper) dle `lib/ai/telemetry/cost.ts`.

**Budoucí T2V větev (faktické místo, ne návrh):** nejčistší existující hook je **`buildVideoJobInput` / vytvoření `video_jobs`** + **`parseVideoJobRenderOptions`** v `video-worker/jobRunner.ts` — dnes default `still`; AI clip cesta vyžaduje explicitní job input + env. Pro **`manual_review`** je schválený voiceover hotový **před** Continue → video job až po rebuild.

**Kritické rozpory:** 7 doložených (sekce 17). **Blocker pro T2V:** produkční pipeline nikde neposílá `video_render_mode` ani T2V plán; existující scene-video executor je **I2V + gen4_turbo**, ne T2V end-to-end.

---

## 2. Terminologie a hlavní entity

| Pojem | DB / storage | Klíčové sloupce / pole | Služba / kód | API / UI | Vazby |
|--------|----------------|-------------------------|--------------|----------|--------|
| **Project** | `projects` | `product_is`, `product_is_not`, `pain_points`, `platforms`, `knowledge` jsonb, … | `getProjectForAdmin`, workflows | `/projects/[id]/*` | rodič strategií, balíčků, runů, assetů |
| **Product Brain / Knowledge Base** | sloupce `projects.*` + **`projects.knowledge`** (`ProjectKnowledge`) | karty product/customer/voice/proof, `scenarios[]` | `lib/knowledge/types.ts`, prompty `lib/ai/prompts/context.ts` | `/projects/[id]/knowledge` | vstup do LLM; ne samostatná run entita |
| **Weekly Strategy** | **`content_strategies`** (ne tabulka `weekly_strategies`) | `period_start`, `strategy_brief` | weekly n8n, `weeklyStrategy.ts` | `/projects/[id]/weekly-strategy` | 1 strategy → N items |
| **Strategy Item** | **`content_strategy_items`** | `brief` jsonb (`production_run_id`, `package_index`), `platform`, `format`, `funnel_stage` | seed / `planContentStrategy`, n8n filter | — | **1 item → typicky 1 package** (unique index na `strategy_item_id`) |
| **Content Package** | **`content_packages`** | `package_brief` jsonb, `status` (`package_status`), `strategy_item_id`, `weekly_strategy_id` | `runGenerateContentPackage`, `runRegenerateContentPackage` | review, content-packages list | 1 → N `content_items`; 0–1 primary `video_jobs` |
| **Production Run** | **`production_runs`** | `status`, `requested_config`, `package_count`, `requested_total`, counters | `lib/api/production-run-admin.ts` | `/projects/[id]/production`, `startProductionRun` | 1 → N **`production_run_items`** |
| **Production Run Item** | **`production_run_items`** | `package_index`, `strategy_item_id`, `content_package_id`, `video_job_id`, `status` | reconcile v `production-run-admin.ts` | progress panel | settlement klíč = **`strategy_item_id`** |
| **Video Job** | **`video_jobs`** | `input`/`output` jsonb, `lease_*`, `package_id`, `render_kind` | `startVideoWorkerJob`, `video-worker/jobRunner.ts` | `/projects/[id]/videos` | 1 package video (`render_kind=package`) |
| **Render Spec** | odvozen v workeru | `buildRenderSpec(input)` — není samostatná DB tabulka | `lib/video-engine/*`, `jobRunner.ts` | — | z `video_jobs.input` |
| **Content Package Worker** | HTTP proces | `CONTENT_PACKAGE_WORKER_URL`, timeout 900s | `content-package-worker/server.ts`, `forwardGenerateContentPackageToWorker` | n8n → worker URL | stejný handler jako Vercel |
| **Video Worker** | HTTP + in-process queue | `MAX_CONCURRENT_VIDEO_JOBS` default 1 | `video-worker/queue.ts`, `jobRunner.ts` | `/api/n8n/start-video-job` | callback `/api/n8n/video-callback` |
| **Review / approval** | `content_items.status` (`approval_status`), `content_packages.status` | draft → approved/published | `lib/review/actions.ts` | `/projects/[id]/review` | oddělené od run statusu |
| **Client Preview** | `client_projects`, `client_project_items` | delivery copy fields | admin + public preview | `/client-review/[projectId]` | mapuje na interní package |
| **Asset Library** | **`assets`**, `asset_usage`, `asset_variants` | storage paths, `metadata` | ingest, analyze, worker reuse | `/projects/[id]/assets` | do scén / social image |

**Run → Packages (ověřeno):**

- **Ano:** jeden Run = **`package_count`** slotů = cílový počet **Content Packages** (model V3 v `lib/projects/productionRun.ts`: 1 package = 1 video koncept).
- **Kdo Run vytváří:** admin — `startProductionRun` v `app/projects/[id]/production/actions.ts`.
- **Kdo volí počet:** UI **`packageCount`** (`PACKAGE_COUNT_MIN=0`, `MAX=100`).
- **Propojení:** `production_run_items.strategy_item_id` ↔ `content_packages.strategy_item_id`; reconcile **nikdy** `packages[i] → items[i]` — pouze match podle `strategy_item_id` (`production-run-admin.ts`).
- **Pořadí:** `package_index ASC`; strategy items `order=created_at.asc` v n8n.
- **Package mimo Run:** **ano** — `content_packages` nemá FK na run; 433 packages, 406 linked to run item, 27 mimo (`NEOVĚŘENO` důvod každého mimo run).
- **Regenerace jednoho Package:** **ano** — `regeneratePackage` → n8n `regenerate_content_package` → Vercel route (ne worker URL v live regenerate workflow).

**Statusy (remote CHECK + enums):**

| Entita | Hodnoty |
|--------|---------|
| `production_runs.status` | `queued`, `running`, `completed`, `failed`, **`cancelled`**, **`waiting_for_creative_review`** |
| `production_run_items.status` | `queued`, `running`, `completed`, **`failed` only** (CHECK) — cancel → item **`failed`** + message |
| `content_packages.status` | `draft`, `ready`, `approved`, `published`, `archived` |
| `video_jobs.status` | `queued`, `processing`, `completed`, `failed` |
| `content_package_generation_claims.status` | `generating`, `completed`, `failed`, `released` |

**Dokončený / částečný / neúspěšný Run:** žádný status `partial`. **`open = requestedTotal − generated − failed`**; parent `completed` nebo `waiting_for_creative_review` i při mixu success/fail. Remote: 92 completed, 11 cancelled, 8 failed runs; **0** runs ve stavu `waiting_for_creative_review` v době auditu (2 runů mělo `manual_review` v config).

**TypScript vs DB:** `ProductionRunItemStatus` v `lib/supabase/types.ts` obsahuje **`cancelled`**, DB CHECK u items **ne** — nesoulad.

---

## 3. Aktuální architektura (ASCII)

```
[UI Production Panel]
  → startProductionRun (actions.ts)
    → createProductionRun + production_run_items[0..N-1]
    → prepareProductionStrategyInputs (legacy seed | AI planContentStrategy)
    → sendN8nWebhook(generate_content_package, { production_run_id, package_count })
    → production_runs.status = running

[n8n O27ELb1s9Y2qisOr — sekvenční loop]
  → read content_strategy_items (production_run_id v brief)
  → POST content-package-worker/generate-content-package  (per item)
       → [optional Vercel proxy if CONTENT_PACKAGE_WORKER_URL]
       → handleGenerateContentPackageRequest
         → claim_package_generation (RPC)
         → runGenerateContentPackage (AI + persist)
         → generateAndPersistPackageSocialImage (soft-fail)
  → if ok && videoJobId → POST /api/n8n/start-video-job
       → claim_video_job_for_dispatch
       → VIDEO_WORKER_URL (202)
         → queue → runVideoJob (still path)
         → POST /api/n8n/video-callback

[UI poll] getProductionRunStatus → reconcileProductionRun
  → attach packages by strategy_item_id, counters, terminal status
```

**Paralelní vs sekvenční:** n8n **`splitInBatches` batch size 1** = packages **sekvenčně**. Uvnitř jednoho package: creative LLM kroky sekvenčně; po dispatch video worker může běžet paralelně s dalším package až po dokončení n8n iterace (n8n čeká na HTTP generate, ne na video dokončení).

---

## 4. Production Run lifecycle (krok za krokem)

| Krok | Co se děje | Důkaz |
|------|------------|--------|
| 1 | Uživatel nastaví platforms, multipliers, `packageCount`, volí **GENERATE CONTENT** / **Manual Review** / **Sample** | `ContentProductionPanel.tsx`, `generationMode.ts` |
| 2 | Normalizace plánu `computeProductionPlan` — **video count = packageCount** | `productionRun.ts` komentář L32–38 |
| 3 | Gate: jen jeden active run (`queued\|running`) | `getActiveProductionRun` |
| 4 | Insert run + items s `package_index` | `createProductionRun` |
| 5 | Strategie: **`PRODUCTION_STRATEGY_PLANNER=ai`** → Claude `planContentStrategy` + link IDs; else **`seedProductionStrategyInputs`** (deterministické, **bez LLM**) | `strategyPlannerConfig.ts`, `production/actions.ts` L99–103 |
| 6 | Webhook n8n | `AUTOMATION_WORKFLOWS.generateContentPackage` |
| 7 | n8n načte strategy items, loop | workflow `O27ELb1s9Y2qisOr` |
| 8 | Per item: generate package (paid AI) | `handleGenerateContentPackageRequest.ts` |
| 9 | Settlement on failure | `settleProductionRunItemOrThrow` |
| 10 | Start video (pokud response obsahuje `videoJobId`) | n8n N4; manual_review: **bez** jobu v generate response |
| 11 | Reconcile: video jobs, promote artifacts, stale fail | `reconcileProductionRun`, `runRecovery.ts` |
| 12 | Run terminal: `completed`, `failed`, `cancelled`, nebo **`waiting_for_creative_review`** | `production-run-admin.ts` L409–447, L1092–1110 |

**Obnovení přerušeného Run:** `POST /api/internal/production-run-recovery` + n8n cron **Production Run Recovery — Every 2 Minutes** — **reconcile only**, bez paid AI (`runRecovery.ts`).

**Lease:** package claim `content_package_generation_claims` (default lease 900s); video `video_jobs.lease_*` (default 600s) — `lib/production-runtime/constants.ts`.

**Callbacky:** `content-package-callback` (CAS status), `video-callback`, `error-callback`.

**Chyba jednoho Package:** item → `failed` (settlement); ostatní sloty pokračují; run může být `completed` s `failed_total > 0`.

---

## 5. Content Package lifecycle a obsah balíčku

### 5.1 Pipeline pořadí

`runCreativePipeline` (`lib/content-pipeline/runCreativePipeline.ts`):

1. **Video Concept** — Claude  
2. **Opening Impact** — OpenAI `gpt-4o-mini`  
3. **Visual Identity** — deterministické  
4. **Content Package JSON** — Claude (+ nested **JSON Repair** OpenAI)  
5. Normalizace scén (pokud `requireVideo`)  
6. **persistNewPackage** — DB  
7. **generateAndPersistPackageSocialImage** — soft-fail  
8. Telemetry patch na `package_brief.presentation_generation.generation_telemetry`

### 5.2 Inventář výstupů

#### A. Společný obsah

| Výstup | Generator | Storage | Edit / regen |
|--------|-----------|---------|--------------|
| title, funnel_stage | Claude + normalize | columns + brief | full regen |
| hook | Claude (+ Opening first sentence) | `package_brief.hook` | Creative Review / full regen |
| voiceover_text, subtitles | Claude | brief + `content_items.body` | CR, scene editor, regen |
| cta, scenario, hashtags | Claude | brief / items | regen |
| video.concept, script | Claude | brief | rebuild po CR |
| presentation_generation (concept, opening, identity, fingerprint, TTS audit) | pipeline stamp | brief | regen |

#### B. Video (when required)

| Výstup | Kde | Poznámka |
|--------|-----|----------|
| visual_scenes, image_prompts, motion (v plánu scén) | Claude + normalize | vstup workeru |
| voiceover audio | OpenAI TTS ve workeru | v MP4, ne durable standalone file |
| SRT / burned subs | whisper + phrase captions | `subtitles.srt` v output optional |
| render spec | worker `buildRenderSpec` | ephemeral |
| MP4, thumbnail | FFmpeg + upload | `video_jobs.output` |
| **Hudba / ambient** | — | **negenerováno** na still path; AI clip phase `music: null` (`aiVideoClipJobPhase.ts` L441) |

#### C. Video platformy

TikTok, Instagram, YouTube, Facebook (video default) — `platform_outputs` → `content_items` (`buildPersistableItems`). Hashtagy, CTA v caption/item sloupcích.

#### D. Textové platformy

LinkedIn, X, Google Business (default text_only dle `DEFAULT_PLATFORM_CONTENT_TYPES`); multipliers fan-out (X default 3).

#### E. Obrázky pro sociální sítě

| | |
|--|--|
| **Kdy** | FB a/nebo LI v target platforms |
| **Prompt** | LLM `social_image.image_prompt` (+ optional overlay) |
| **Model** | **`gpt-image-1`**, **1024×1024** | `generateSocialImage.ts`, `socialImage.ts` |
| **Oddělené od videa** | **ano**, soft-fail |
| **Storage** | `assets` / `ai_visuals`, pointer v `package_brief.social_image` |

### 5.3 Dokončení bez videa

- Text-only plán (`requireVideo` false) — validní.  
- **`manual_review`** — package + CR persist, **bez** `video_jobs` until Continue.  
- Social image failure neblokuje.

---

## 6. Plně automatický tok (`production` / `sample`)

| Otázka | Odpověď |
|--------|---------|
| Odkud se zapíná | Tlačítko **GENERATE CONTENT** → `generationMode: "production"`; Sample → `"sample"` |
| Lidské schválení před video | **Ne** u production/sample |
| Quality gates | JSON schema + guardrails + `generateValidatedJson` max attempts; **žádné** LLM „quality judge“ |
| Slabý validní výstup | Projde pokud projde guardrails; **žádná** automatická re-kreativa kromě retry parse |
| Fallback modely | Claude default `claude-sonnet-4-6` (env `ANTHROPIC_MODEL`); image moderation → safe prompt → local PNG |
| Finální package | `content_packages.status = draft` po insert |
| Video render | n8n volá start-video-job **ihned** po úspěšné generaci pokud `videoJobId` returned |
| **`sample` vs `production`** | Stejný LLM pipeline; liší se **`resolvePackageAssetCoverage`** (asset policy), ne jiný prompt engine v content-pipeline |

**Je 100% bez člověka?** **Ano** pro production run path až do review tab (pokud operator neschválí obsah). **Sample** stejně. **Poznámka:** review/approve je samostatný produktový krok, ne gate generace.

---

## 7. Ručně kontrolovaný tok (`manual_review`)

| Fáze | Co člověk mění | Co existuje | Invalidace | Regenerace | Náklad | Riziko |
|------|----------------|-------------|------------|------------|--------|--------|
| Creative Review — VO localized | text | AI VO + scenes intents | EN preview, approval | Save → translate Claude | LLM translate | špatný VO → špatné video po Continue |
| Scene intent / director notes | text | scene list (no reorder) | approval | Save | translate | downstream rebuild |
| Approve package | flag | drafts | — | — | $0 | blokuje Continue |
| Continue Generation | — | all approved | rebuild package fields | **new video job** + full worker | TTS+images+ffmpeg | paid video before human seen final MP4 |
| Review tab | caption/hashtags/cta | items | — | edit only | $0 | — |
| Video Scene Editor | VO, scenes, stills | completed/failed job | rerender | new job / image AI | partial–full worker | duplicate spend |
| Regenerate package | — | snapshot `content_versions` | nový creative pipeline | full package + video | **≈ full package cost** | high |

**Verze:** `content_versions` on regenerate; `creative_review.history` append-only; scene editor image history.

**Pause/resume:** CR workspace lze opustit while `waiting_for_creative_review`; Cancel Manual Review terminální.

**Manual Review seed:** `buildManualReviewCreativeReview` → scene intents (Claude batch) + translate — `lib/creative-review/seed.ts`.

---

## 8. Video pipeline

### 8.1 Produkčně aktivní: still path

Pořadí v `runVideoJob` (`video-worker/jobRunner.ts` — ověřeno subagentem + schema):

1. `parseVideoJobRenderOptions` → **still** (default)  
2. `buildRenderSpec`  
3. **TTS first** (`gpt-4o-mini-tts`)  
4. Optional programmatic SFX  
5. **Scene images** (`gpt-image-1`, **1024×1536**)  
6. **`buildStoryboard`** (3–5 beatů, audio-driven)  
7. Captions + **whisper-1** align  
8. **`renderMp4`** Ken Burns + burn-in  
9. Thumbnail, upload, callback  

Scény: max **5** generovaných stillů (`MAX_VIDEO_SCENE_STILLS`); reused assets mimo cap. Typed scény (CHECKLIST, PHONE, …) jen pokud **`SCENE_TYPES_ENABLED=true`** (`lib/scene-types/config.ts`); default v `.env.example` commented false.

### 8.2 Implementované, ne produkční default: `ai_video_clips`

| Požadavek | Zdroj |
|-----------|--------|
| `video_render_mode: ai_video_clips` | `videoJobRenderMode.ts` |
| budget > 0 + `ai_scene_video_confirm_paid_run: true` | same |
| `SCENE_VIDEO_GENERATION_ENABLED=true` | `scene-video-executor/constants.ts` |
| Runway secret | `RUNWAYML_API_SECRET` |

Plan: **I2V** `gen4_turbo`, ratio `720:1280` — `buildSceneVideoGenerationPlan.ts`. **T2V** existuje v `runwayTextToVideoBody.ts` / Benchmark Lab, **ne** v package jobRunner branch.

### 8.3 Benchmark Lab / Runway test

Admin `/settings/ai-media-benchmark`, flags default **false** (`lib/ai-media-benchmark/flags.ts`). Tabulky `ai_media_benchmark_runs`, `runway_test_jobs` — **experimentální**, oddělené od production run.

### 8.4 Klasifikace

| Cesta | Stav |
|-------|------|
| Still FFmpeg | **PRODUKCE** |
| Typed scene renderers | **opt-in env** |
| `ai_video_clips` + scene attempts | **kód hotový, produkce off** |
| Benchmark T2V/I2V | **admin lab only** |
| Hudba na still reel | **neimplementováno v toku** |

---

## 9. Textové a obrázkové výstupy (souhrn)

- **Platformní texty:** jeden Claude krok „Content Package“ — všechny `REQUIRED_PACKAGE_PLATFORMS` (`lib/ai/types.ts`).  
- **Social images:** oddělený krok po persist; **nezávislé** na video scénách (explicitní prompt contract `buildContentPackageSocialImageBlock`).  
- **Změna video workflow na T2V** by **neměla** přímo rozbít social image generaci (jiná větev po persist), pokud se nemění shared Content Package LLM schema — **riziko:** jeden LLM stále generuje `social_image` + `visual_scenes` společně.

---

## 10. Mapa LLM a AI provider volání (Run + Package + Video)

**Routing:** `lib/ai/index.ts` — Claude = strategy/copy; OpenAI = repair, opening, images, TTS, whisper.

**Počet zmapovaných distinct AI/provider volání v produkční cestě Run→Package→Video:** **18** (tabulka; nested repair počítáno jako 1 typ).

| # | Fáze | Účel | Provider | Model (kód default) | Soubor / funkce | Retry | Povinné | Selhání | Cena |
|---|------|------|----------|---------------------|-----------------|-------|---------|---------|------|
| 1 | Run (AI planner) | Scenario pool | Claude | `ANTHROPIC_MODEL` \|\| `claude-sonnet-4-6` | `ensureScenarioPool` | soft | ne (planner) | swallow | token |
| 2 | Run (AI planner) | Production strategy plan | Claude | same | `planContentStrategy` | 3 + repair | if env ai | run fail | token |
| 3 | Package | Video Concept | Claude | same | `runVideoConcept` | 3 + repair | ano | package fail | token |
| 4 | Package | Opening Impact | OpenAI | **`gpt-4o-mini`** | `runOpeningImpact` | 3 + repair | ano | fail | token |
| 5 | Package | Visual Identity | — | deterministic | `buildVisualIdentity` | — | — | — | $0 |
| 6 | Package | Content Package JSON | Claude | sonnet default | `runContentPackageGeneration` | **2** + repair | ano | fail | token |
| 7 | Package | JSON repair | OpenAI | `gpt-4o-mini` | `runWithRepair.repairJson` | nested | soft | fail gen | token |
| 8 | Package | Social image | OpenAI Images | **`gpt-image-1`** | `generateAndPersistPackageSocialImage` | mod retry | soft | skip | **$0.042/still** |
| 9 | MR seed | Scene creative intents | Claude | sonnet | `generateSceneCreativeIntents` | repair | if manual_review | **NEOVĚŘENO** hard/soft | token |
| 10 | MR seed | Localize CR | Claude | sonnet | `translateCreativeReviewForEditor` | per field | if manual_review | — | token |
| 11 | Video | TTS | OpenAI | **`gpt-4o-mini-tts`** | `video-worker/services/tts.ts` | transport 3 | ano | job fail | **$0.015/1k chars** |
| 12 | Video | Whisper align | OpenAI | **`whisper-1`** | `wordTimestamps.ts` | best-effort | ne | fallback timing | **$0.006/min** |
| 13 | Video | Scene still | OpenAI Images | **`gpt-image-1`** | `images.ts` | mod+fallback PNG | per scene | job fail | $0.042 × N |
| 14 | Video | Scene image edit | OpenAI | edit model env | editor workflows | — | on demand | — | $0.042 est |
| 15 | Video | FFmpeg render | local | — | `ffmpeg.ts` | — | ano | fail | infra |
| 16 | Video | SFX overlay | local | — | `programmaticSfx.ts` | — | opt | — | $0 |
| 17 | Regen | Full pipeline | mix | — | `regenerateContentPackage` | same | — | — | ≈ #3–8 |
| 18 | AI clips (dormant) | Runway I2V | Runway | **`gen4_turbo`** plan | `executeSceneVideoPlan` | claim | gated | fail job | **5 credits/s × $0.01** (Runway doc) |

**Deployovaný `ANTHROPIC_MODEL`:** **NEOVĚŘENO** (jen code default).

**n8n AI nodes:** **žádné** v bridge — pouze HTTP + Supabase (`generate-content-package-bridge.json`, live workflow).

---

## 11. Prompt / dependency mapa (kdo rozhoduje o kvalitě)

```
Strategy item (topic/angle) ──► Video Concept (Claude) ──► Opening Impact (OpenAI)
                                      │                           │
                                      └──────────► Visual Identity (det.)
                                                          │
                                                          ▼
                                            Content Package (Claude)
                                            ├─ hook = Opening sentence (guardrail)
                                            ├─ voiceover, scenes, platform_outputs
                                            ├─ social_image (if FB/LI)
                                            └─ visual_scenes / image_prompts
                                                          │
                    ┌─────────────────────────────────────┼──────────────────────┐
                    ▼                                     ▼                      ▼
            social_image raster                  video_jobs.input          content_items
                    (gpt-image-1)                      │
                                                       ▼
                                              TTS → stills → storyboard → MP4
```

**Ripple rizika:** špatný **Video Concept** poisonuje celý package JSON. **Opening Impact** oddělen — hook musí matchovat. **Platform outputs** v jednom Claude kroku — jedna chyba = více platforem najednou. **Drahý krok před schválením (production):** celý package LLM + social image + všechny stills **bez** human gate. **Manual review** gate před **video job**, ne před package LLM.

**Duplicita:** hook/myšlenka v Concept, Opening, Package. Scene intent v MR přepisuje technické prompty pro rebuild.

---

## 12. Product Brain, strategie, assety

| Zdroj | Uložení | Načítání | Prompty | Video | Obrázky | Texty | Kdy chybí |
|-------|---------|----------|---------|-------|---------|-------|----------|
| product_is / is_not / strengths / pain | `projects` columns | `loadProjectOrThrow` | `context.ts` blocks | TTS tone | scene prompts | captions | prázdné pole v promptu |
| knowledge cards | `projects.knowledge` | workflows | extract blocks | assets/scenes | social | yes | `{}` default |
| scenarios | knowledge.scenarios | `ensureScenarioPool` | scenario block | — | — | — | pool seed |
| weekly strategy | `content_strategies` | gate + n8n | item brief | — | — | — | MissingWeeklyStrategyError |
| strategy item brief | `content_strategy_items.brief` | `loadStrategyItemContext` | topic/angle | — | — | — | — |
| assets | `assets` + usage | `loadAvailableAssets` | asset_usage v LLM | reuse/generate | — | — | fewer scenes reuse |
| brand colors/logo | assets + tokens | worker `loadRenderBrandTokensForWorker` | visual identity | insert brand | social optional | — | fallback tokens |

---

## 13. Nákladový model

**Pricing table (write-time):** `lib/ai/telemetry/cost.ts`, `PRICING_VERSION=list-price@2026-07-23`.

### A. Jeden Content Package (typické video package, odhad)

| Složka | Typ ceny | USD (orientačně) |
|--------|----------|------------------|
| LLM package path (Claude+OpenAI) | **stored p50** remote | **~0.12** |
| Social image 1× | přesná sazba | **0.042** |
| Video stills ~5× | přesná sazba | **~0.21** |
| TTS + whisper | odhad chars/min | **~0.03–0.08** |
| FFmpeg/storage | infra | variabilní nízké |
| **Celkem typické** | mix | **~0.35–0.55** |

### B. Production Run

`Cost_run ≈ packageCount × Cost_package` (+ **volitelně** 1× `planContentStrategy` pokud `PRODUCTION_STRATEGY_PLANNER=ai`).

Remote nejčastější `package_count`: **1** (58 runů), také 14, 21 pro větší dávky.

### C. Klient / měsíc (model)

**20 packages s videem/měsíc:** **≈ 7–11 USD** AI/media (předpoklad stejný mix jako p50 telemetrie, bez Runway).

### D. Regenerace

| Akce | Náklad |
|------|--------|
| Nový hook only (`ensureUniqueHook`) | **nepoužito v main path** |
| Full package regen | ≈ A |
| Jedna scene still | ~0.042 |
| Full rerender video | TTS + stills + ffmpeg |
| AI clip path (hypotetický) | Runway per sec × scény |

---

## 14. Timing a výkon

| Metrika | Zdroj |
|---------|--------|
| Completed package video job duration | remote **p50 ≈ 912 s**, p90 ≈ 3798 s |
| Vercel generate route | `maxDuration = 300` |
| Content package worker timeout | **900 s** |
| n8n N3 timeout | **900000 ms** |
| Package generation lease | **900 s** default |
| Video job lease | **600 s** default |
| Production UI poll | **3 s** (UI agent) |
| LLM timeouts | Concept 120s, Opening 90s, Package 180s |

Run `avg_duration_sec` z SQL zahrnuje long-stuck historické runy — **nepoužívat** jako SLA.

---

## 15. Retry, fallback, idempotence

| Mechanismus | Opakuje placený call? |
|-------------|------------------------|
| HTTP transport retry OpenAI (3×) | **ano**, pokud request nebyl idempotentní |
| `generateValidatedJson` attempts | **ano** (nový LLM) |
| Package claim `strategy_item_id` | **ne** duplicate package (23505 → load existing) |
| n8n N3 **retryOnFail OFF** | záměrně (incident d154/b343) |
| n8n failed item guard `already_settled_failed` | **ne** |
| Video dispatch claim RPC | stale reclaim možný → **riziko** double render if misconfigured |
| Runway create | **transport 1** — no auto-retry on create |
| Image moderation fallback | safe prompt → **ano** 2nd image; pak local PNG **ne** |

**Idempotence keys:** unique package per `strategy_item_id` (migration 013); video active render unique indexes (026).

---

## 16. UI workflow (routes)

| Scénář | Route |
|--------|-------|
| Auto run | `/projects/[id]/production` → GENERATE CONTENT |
| Manual run | same → Generate with Manual Review → `/projects/[id]/creative-review/[runId]` |
| Weekly packages | `/projects/[id]/actions` step 3 |
| Package list | `/projects/[id]/content-packages` |
| Review | `/projects/[id]/review` |
| Video edit | `/projects/[id]/videos` |
| Client preview | `/client-review/[projectId]` |

---

## 17. Připravenost na T2V Content Package (jen fakta)

### A. Lze použít beze změny (kód potvrzuje)

- Product Brain / knowledge injection  
- Strategy items + run settlement by `strategy_item_id`  
- Platformní texty + `content_items` persist  
- Social image pipeline (`generateAndPersistPackageSocialImage`)  
- TTS + whisper + subtitle burn-in na still i clip assembly paths  
- `mixAudioLayers` / reel orchestrator ** jako kód** (production still nevolá hudbu)  
- Review / CR / `content_versions`  
- Storage + video callback + lease model  
- Runway **T2V client** (`runwayTextToVideoBody.ts`) — **knihovna**, ne produkční package

### B. Vyžaduje rozšíření

- Package/workflow volba render mode (dnes **absent** in `buildVideoJobInput`)  
- T2V scene plan (dnes plan = **I2V** still source)  
- Prompt builder pro text-to-video clips (≠ image prompts)  
- Budget + confirm paid (existuje schema pro clips, ne pro T2V-specific)  
- UI volba režimu videa  
- Telemetry/cost pro Runway T2V v package telemetrii

### C. Pevně still/I2V — nelze přímo pro T2V

- `buildStoryboard` + Ken Burns `renderMp4` jako primární produkce  
- `compileVisualScenesToWorkerScenes` zaměření na still/scene types  
- Scene video executor **requires source_image_** fields (`scene_video_generation_attempts`)

### D. Experimentální — ne produkční závislost

- AI Media Benchmark Lab, Runway test jobs  
- `ai_video_clips` bez production flagů

### Místo větvení (fakta, ne rozhodnutí)

| Místo | Pro | Proti |
|-------|-----|-------|
| Před storyboardem (render mode early) | jedna video architektura | package LLM stále generuje still scény |
| Po schválení VO (`manual_review` Continue) | **schválený audio** existuje | production mode stále bez gate |
| Při `video_jobs` insert + `input.video_render_mode` | **minimální diff** k dnešnímu worker parseru | T2V potřebuje jiný plan než visual_scenes |
| Render Spec only | — | spec se skládá až ve workeru |

**Nejblíže existujícímu kódu:** **`buildVideoJobInput` + `parseVideoJobRenderOptions`**; pro manual path navíc **`continueCreativeReviewGeneration` → rebuild → job**.

---

## 18. Rozpory, rizika, technický dluh (doložené)

| # | Problém | Důkaz | Dopad | Závažnost | Blokuje T2V? |
|---|---------|-------|-------|-----------|--------------|
| 1 | `FENRIK_CURRENT_SYSTEM_AUDIT.md` tvrdí „Runway v kódu není“ | `lib/ai/runway.ts`, scene executor, 0 production attempts | zavádějící docs | střední | ne (spíš matoucí) |
| 2 | TS `ProductionRunItemStatus` má `cancelled`, DB CHECK ne | `types.ts` L227–232 vs migration 015 | type lies | nízká | ne |
| 3 | n8n generate **neposílá `generation_mode`** | workflow JSON body jen project_id + strategy_item_id | manual_review přes run **NEOVĚŘENO** při čistě n8n worker path | vysoká if true | ne |
| 4 | 498/498 jobs bez `video_render_mode` | remote SQL | AI clips nikdy neběžely v prod | info | ano pro clip path |
| 5 | Hudba/ambient chybí na produkční still | jobRunner vs aiVideoClipJobPhase null | produkt bez bed | střední | nutný mix layer pro T2V reel |
| 6 | `ensureUniqueHook` nepoužit v generate | grep orphan | duplicitní hooks | nízká | ne |
| 7 | Live n8n workflow export ukazuje placeholder secret v node headers | get_workflow_details (hodnoty v MCP — **ne citovat**) | konfigurace mimo repo | **NEOVĚŘENO** prod vs export | ne |

**Kritické rozpory pro audit:** **7** (včetně 1× NEOVĚŘENO runtime generation_mode přes n8n).

---

## 19. Neověřené body

1. Hodnota **`ANTHROPIC_MODEL`** / **`PRODUCTION_STRATEGY_PLANNER`** / **`CONTENT_PACKAGE_WORKER_URL`** v produkčním Vercel/DO env.  
2. Zda **`generation_mode: manual_review`** dorazí do workeru při **čistě** n8n→DO worker volání (není v n8n JSON body).  
3. Podíl balíčků s **`SCENE_TYPES_ENABLED=true`** v produkčním worker env.  
4. Přesný live n8n credential mapping (repo bridge vs MCP export).  
5. Runway **T2V** oficiální cena pro `gen4.5` / `veo3.1_fast` v produkčním billing (Benchmark catalog only).  
6. Důvod 27 packages bez run item link.

---

## 20. Zdroje a důkazy

| Kategorie | Soubory / metadata |
|-----------|---------------------|
| Run model | `lib/projects/productionRun.ts`, `lib/api/production-run-admin.ts`, `app/projects/[id]/production/actions.ts` |
| Generate | `lib/n8n/handleGenerateContentPackageRequest.ts`, `lib/ai/workflows/generateContentPackage.ts`, `lib/content-pipeline/runCreativePipeline.ts` |
| Modes | `lib/ai/generationMode.ts` |
| Video | `lib/video-engine/schemas/videoJobRenderMode.ts`, `video-worker/jobRunner.ts`, `lib/ai/workflows/packageShared.ts` `buildVideoJobInput` |
| Social | `lib/content-package/generateSocialImage.ts`, `lib/content-package/socialImage.ts` |
| CR | `lib/creative-review/*`, `lib/ai/workflows/continueCreativeReviewGeneration.ts` |
| Costs | `lib/ai/telemetry/cost.ts`, `costRollup.ts` |
| Migrations | `015_production_runs.sql`, `025_production_runtime.sql`, `031_waiting_for_creative_review.sql`, `034_scene_video_generation_attempts.sql` |
| Remote DB | Supabase MCP `list_tables`, `execute_sql` (2026-08-19) |
| n8n | Workflow IDs **`O27ELb1s9Y2qisOr`** (generate), **`z7zfuAYoH5vuLX6R`** (regenerate), MCP `get_workflow_details` |
| Legacy doc | `FENRIK_CURRENT_SYSTEM_AUDIT.md` (částečně zastaralé — viz rozpory) |

---

## 21. Závěr

Produkční Fenrik Studio dnes vyrábí **Content Package** přes **fixní čtyřkrokovou creative pipeline (Claude/OpenAI)**, persistuje multi-platform **`content_items`**, generuje **volitelný FB/LI still** a pro video plán spouští **`video_jobs`** rendered **`video_engine` still FFmpeg** cestou. **Production Run** agreguje **N balíčků** přes **strategy items** a n8n **sekvenční smyčku**; partial failure je numerický, ne samostatný status. **Manual Review** je jediná vestavěná gates před **placeným video renderem**, ne před package LLM. Cesta **`ai_video_clips` / Runway I2V** je implementovaná ve workeru ale **v produkční datech neaktivní**; **T2V** existuje primárně v Benchmark/adaptérech, ne v package end-to-end toku.

**Implementační návrh T2V varianty zde záměrně není** — audit slouží jako podklad pro následné rozhodnutí o větvení.

---

*Audit dokončen bez změn systému, databáze a provider konfigurace.*
