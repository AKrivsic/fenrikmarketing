# SCENE_VIDEO_ATTEMPTS_STEP_7_REPORT

Datum: 2026-08-15

## 1. Databázové schema

Tabulka: `public.scene_video_generation_attempts`  
Migrace: `supabase/migrations/034_scene_video_generation_attempts.sql`

Klíčová pole:

- identita: `id`, `project_id`, `video_job_id`, `scene_id`, `client_request_id` (UNIQUE), `parent_attempt_id`
- vstup: `source_image_bucket/path`, `motion_prompt`, `provider`, `model`, `duration_seconds`, `ratio`, `seed`
- provider task: `provider_task_id`, `status`, `failure_code`, `error_message`
- cena/čas: `estimated_credits/cost_usd`, `created/submitted/started/completed/updated_at`, `generation_duration_ms`
- výstup: `output_bucket/path`, `output_duration_seconds`, `output_has_audio`, `provider_metadata`
- finalize claim: `download_claimed_at`, `download_claim_owner`

RLS: enabled; `service_role` full access; `authenticated` přes `owns_project(project_id)`.

Neukládá: signed URL, API klíče, Authorization, lokální cesty.

## 2. Statusy

TypeScript `SCENE_VIDEO_ATTEMPT_STATUSES` ≡ DB CHECK:

| Status | Význam |
| --- | --- |
| `created` | Řádek vložen; create ještě nepotvrzen |
| `submitted` | Provider přijal create; task id uložen |
| `pending` | Task ve frontě |
| `running` | Generování běží |
| `downloading` | Exkluzivní finalize claim (download/upload) |
| `succeeded` | Durable MP4 uložen |
| `failed` | Selhání |
| `cancelled` | Zrušeno providerem |
| `download_failed` | Provider OK, durable store selhal |
| `submission_unknown` | Create bez spolehlivého task id — **neauto-retry** |

## 3. Idempotence create

1. insert attempt row  
2. UNIQUE `client_request_id`  
3. pouze vítěz insertu volá provider create (1 POST)  
4. duplicate / 23505 → existující attempt  
5. task id se ukládá hned (`submitted`)  
6. concurrent create test: 1 provider call, 1 row  

## 4. `submission_unknown`

Timeout / síťová chyba create bez task id → `submission_unknown`.  
`sync` nevolá provider.  
`createRetrySceneVideoAttempt` z parenta v tomto stavu **odmítne**.

## 5. Provider abstraction

Služba `lib/scene-video-attempts/service.ts` přijímá injektovaný `VideoGenerationProvider`.  
Není pevně vázaná na Runway SDK — současná produkční implementace provideru je Runway.  
**Není** importována v `jobRunner.ts`.

## 6. Synchronizace tasku

- pracuje jen s uloženým `provider_task_id`  
- mapuje pending/running/failed/cancelled  
- při succeeded stáhne výstup, ověří video stream (ffprobe), změří délku/audio, uploadne durable MP4  

## 7. Souběžná finalizace

Claim: `UPDATE … SET status='downloading' … WHERE status IN (submitted,pending,running) AND output_path IS NULL`.  
Stale reclaim po 10 min.  
Test: 2 concurrent poll → právě 1 download/upload.

## 8. Retry lineage

`createRetrySceneVideoAttempt`: nový řádek, nový `client_request_id`, `parent_attempt_id`, kopie vstupu.  
Původní attempt se nemění. Zakázáno z `submission_unknown`.

## 9. Storage cesta

```text
video-renders/{projectId}/scene-video-attempts/{attemptId}/output.mp4
```

Helper: `buildSceneVideoAttemptPath`.

## 10. Metadata výstupu

Ukládá se `output_duration_seconds`, `output_has_audio`, volitelně `provider_metadata` (bez secretů).

## 11. Převod na `SceneVideoClip`

`sceneVideoClipFromAttempt` — pure; pouze `succeeded` + durable output.  
Do `video_jobs.output` se v tomto kroku **nezapisuje**.

## 12. Vztah k `runway_test_jobs`

| | `runway_test_jobs` | `scene_video_generation_attempts` |
| --- | --- | --- |
| Účel | interní admin single-scene test UI | produkční provider-agnostic evidence |
| Scope | Runway test page | budoucí worker / více scén |
| Statusy | bez `submission_unknown` / `downloading` | plná sada |

Testovací stránku lze později přepojit na novou tabulku; dočasně existuje duplicita účelu (test vs produkční evidence). Stará tabulka **nebyla** smazána ani migrována.

## 13. Výsledky testů

- `check:scene-video-attempts` — 19 passed  
- `check:runway-image-to-video` — 19 passed  
- `check:video-reel-orchestrator` / `check:audio-mix` / `check:video-clip-render` — viz chat  
- `tsc --noEmit` / eslint — viz chat  

## 14. Migrace aplikovaná?

**Ano** — remote DB přes Supabase MCP `apply_migration` (`scene_video_generation_attempts`).  
Ověřeno: sloupce v `information_schema` existují.

## 15. Napojení do produkce

Služba **není** v `jobRunner.ts`. Default render / n8n / UI nezměněny. Žádný feature flag.

## 16. Síť / placené AI

Nulová skutečná síťová a placená volání v testech (mock provider + fake storage + lokální FFmpeg fixtures).

## Kontrola a opravy 7B

Datum: 2026-08-15

### 1. Nová migrace

`supabase/migrations/035_scene_video_attempts_integrity.sql`

- `seed` → `bigint`
- unique partial index `(provider, provider_task_id) WHERE provider_task_id IS NOT NULL`
- CHECK `parent_attempt_id IS NULL OR parent_attempt_id <> id`
- trigger `validate_scene_video_attempt_parent` (stejný `project_id` / `video_job_id` / `scene_id`)

Historická migrace `034` nebyla přepisována.

### 2. Stav aplikace

**Aplikováno** na remote DB přes Supabase MCP `apply_migration` (`scene_video_attempts_integrity`).

Ověřeno:

- `seed` data_type = `bigint`
- index `scene_video_generation_attempts_provider_task_uidx` existuje
- před migrací: **žádné** duplicity `(provider, provider_task_id)` → index bezpečně aplikován

### 3. Seed rozsah

- validace před DB: `0…4294967295` (`validateSceneVideoSeed`)
- záporný / vyšší seed → reject před insertem / provider create
- testy: `0`, `4294967295`, reject mimo rozsah

### 4. Stale claim compare-and-swap

Převzetí starého `downloading` claimu vyžaduje současně:

- `status = downloading`
- `output_path IS NULL`
- původní `download_claim_owner`
- původní `download_claimed_at`

Druhý worker při prohraném CAS vrací aktuální řádek bez download/upload.

### 5. Pravidla `submission_unknown`

| Případ | Status |
| --- | --- |
| timeout / network / ECONNRESET / přerušené spojení | `submission_unknown` |
| HTTP 400 / 401 / 403 / jiné 4xx (kromě nejednoznačných) | `failed` |
| HTTP **429** | `failed` — Runway vrátil definitivní odmítnutí create bez task id; vědomý retry s novým `client_request_id` je OK |
| HTTP 5xx (např. 503) | `submission_unknown` (nelze spolehlivě říct, zda create proběhl) |

### 6. Parent lineage

Servisní vrstva před provider create ověří, že parent:

- existuje
- má stejný project / video job / scene
- není retry z `submission_unknown`

DB: CHECK + trigger lineage. Testy: parent jiné scény / jobu / projektu odmítnut; platný parent stejné scény OK.

### 7. Unikátní provider task index

Přidán (viz migrace 035). Duplicity na remote před aplikací: **0**.

### 8. Bounded streaming download

`readResponseBodyBounded`:

- kontroluje `Content-Length` pokud je
- počítá streamované byty a canceluje reader po překročení limitu
- chybějící `Content-Length` **není** považován za bezpečný
- po překročení → `download_failed`, bez uploadu

### 9. Claim cleanup

Po terminálu (`succeeded`, `download_failed`, `failed`, `cancelled` přes `markTerminal` / sync) se `download_claimed_at` a `download_claim_owner` **vyčistí**.

Stale recovery + `upsert: true` na stejnou durable path: opakovaný finalize po pádu mezi download/upload/DB update nevytváří nový placený provider task (používá uložené `provider_task_id`).

### 10. Testy a výsledky

- `check:scene-video-attempts` — **26 passed**, 0 failed (včetně 7B seed / classify / 4xx→failed / 503→unknown / parent / concurrent stale CAS / bounded stream)
- `check:runway-image-to-video` — **19 passed**
- `check:video-reel-orchestrator` — passed
- `tsc --noEmit` — OK
- eslint změněných souborů — OK

### 11. Skutečná / placená volání

**Nulová** — mock provider, fake Supabase/storage, lokální FFmpeg fixtures; žádný reálný Runway request.

## Kontrola a opravy 7C

Datum: 2026-08-15

### Ownership vynucení

- `markTerminal()` už **nezasahuje** status `downloading` (jen `created` / `submitted` / `pending` / `running`).
- Finalize chyby používají `markOwnedDownloadFailure()` / `failOwnedDownloadOrReturnCurrent()` s podmínkou:
  - `id` match
  - `status = downloading`
  - `download_claim_owner =` vlastník claimu workera
- Success DB update po uploadu zůstává stejně ownership-gated (`downloading` + owner + `output_path IS NULL`).

### Opravené failure větve po získání claimu

- fetch exception
- HTTP download error
- neplatný Content-Type
- bounded download překročení limitu
- chybějící video stream
- upload failure
- (success) DB update po uploadu — už chráněný; při 0 rows → load current

### Chování po ztrátě claimu

Worker, který claim ztratil:

- nedostane řádek z owned update (`claim_lost`)
- **ne** nastaví `download_failed`
- **ne** vyčistí claim nového vlastníka
- **ne** přepíše error
- vrátí aktuální řádek (typicky `succeeded` / stále `downloading` nového workera)
- sync nehází stav-mutující follow-up chybu kvůli lost claimu

### Nové souběžné testy

1. Starý worker download error po reclaimu B → finále `succeeded`, 1 upload, žádný nový provider task  
2. Starý worker upload failure po reclaimu B → finále `succeeded`, claim B nedotčen  
3. Starý worker upload OK, ale lost claim → finální DB update přeskočen; jedna output path; `succeeded`

### Výsledky

- `check:scene-video-attempts` — **29 passed**
- `check:runway-image-to-video` — **19 passed**
- `tsc --noEmit` — OK
- eslint změněných souborů — OK

### Síť / placené AI

**Nulová** skutečná síťová a placená volání.
