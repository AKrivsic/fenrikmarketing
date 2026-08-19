# Runway integrace — krok 1

Datum: 2026-08-15  
Rozsah: pouze technický základ image-to-video providera. Produkční video pipeline, UI, databáze, n8n a FFmpeg se neměnily.

## 1. Co bylo implementováno

- Společné typy a rozhraní pro **image-to-video** (ne t2v, ne v2v).
- `RunwayVideoGenerationProvider` přes `fetch` + existující `fetchWithRetry` (bez SDK).
- Factory `getVideoGenerationProvider()` v `lib/ai/index.ts` — zatím jen Runway, bez tichého fallbacku.
- Validace vstupu, timeout, omezený polling, 429/5xx, failed/cancelled task, redakce API klíče.
- Názvy env proměnných v `.env.example` (bez hodnot).
- Lokální testy s mockovaným `fetch`.

## 2. Změněné a nové soubory

**Nové**

- `lib/ai/videoGeneration.ts`
- `lib/ai/videoGenerationError.ts`
- `lib/ai/runway.ts`
- `scripts/check-runway-image-to-video.ts`
- `RUNWAY_INTEGRATION_STEP_1_REPORT.md`

**Změněné**

- `lib/ai/index.ts` — factory `getVideoGenerationProvider()`
- `.env.example` — názvy Runway proměnných
- `package.json` — skript `check:runway-image-to-video`

## 3. Jak nové rozhraní funguje

Získání providera:

```ts
const provider = getVideoGenerationProvider();
```

Asynchronní Runway kontrakt je zachovaný (task id lze později uložit do DB):

1. `createImageToVideo(req)` → `POST /v1/image_to_video` → snapshot se `providerTaskId` a `status: "pending"`.
2. `getImageToVideoTask(id)` → `GET /v1/tasks/{id}` → `pending` / `throttled` / `running` / `succeeded` / `failed` / `cancelled`.
3. `waitForImageToVideo(id)` — omezený polling, dokud není terminální stav nebo vyprší čas. `THROTTLED` není chyba; dál se čeká.
4. `generateImageToVideo(req)` — create + wait. Pohodlná cesta, neskrývá task id ve výsledku.

Mapování polí:

| Naše rozhraní | Runway JSON |
|---|---|
| `imageUrl` | `promptImage` |
| `motionPrompt` | `promptText` |
| `model` | `model` |
| `duration` | `duration` (sekundy) |
| `ratio` | `ratio` (pixelový pár, např. `720:1280`) |
| `seed` | `seed` (volitelný) |

`ratio` **není** klasický aspect ratio string `9:16` / `16:9`. Oficiální API verze `2024-11-06` u Gen-4 rodiny tyto hodnoty nepřijímá; chce rozlišení jako `720:1280`.

Chybějící `RUNWAYML_API_SECRET` hodí `VideoGenerationError` s kódem `missing_api_key`. Žádný přepínač na OpenAI / FFmpeg.

## 4. Runway endpointy a parametry

Ověřeno z oficiálního OpenAPI 3.1 (`openapi.json`, title **RunwayML API**, version **2024-11-06**) a z dokumentace.

| Položka | Hodnota |
|---|---|
| Base URL | `https://api.dev.runwayml.com` |
| Verze | header `X-Runway-Version: 2024-11-06` |
| Auth | `Authorization: Bearer $RUNWAYML_API_SECRET` |
| Create | `POST /v1/image_to_video` |
| Poll | `GET /v1/tasks/{id}` |
| Výchozí model | `gen4.5` (oficiální getting-started; přepis `model` nebo `RUNWAY_VIDEO_MODEL`) |

Create body (gen4.5, OpenAPI required): `model`, `promptImage`, `promptText`, `ratio`, `duration`. Volitelně `seed` (0–4294967295).

Create 200: `{ id, estimatedCost }` — **bez** statusu. Status se čte až z GET task.

GET statusy: `PENDING`, `THROTTLED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`.

SUCCEEDED `output`: pole URL; bereme první. URL jsou dočasné (24–48 h).

FAILED: `failure` (text) + `failureCode` (např. `SAFETY.INPUT.*`). Moderace je failed task, ne HTTP error.

Vstupní obrázek: HTTPS URL (veřejně dostupná, domain name ne IP, `Content-Type` jpeg/png/webp, HEAD support), nebo `data:image/...;base64,...`, nebo `runway://` ephemeral upload.

HTTP: 400 (špatný vstup), 429 (quota / rate), 401, 503 zmíněné v troubleshooting. Transport 429/5xx jde přes existující `fetchWithRetry`.

## 5. Odkazy na oficiální dokumentaci

- Primer: https://docs.dev.runwayml.com/ai-context.md
- Getting started (cURL image-to-video): https://docs.dev.runwayml.com/guides/using-the-api.md
- Modely: https://docs.dev.runwayml.com/guides/models.md
- Vstupy (URL / data URI / formáty): https://docs.dev.runwayml.com/assets/inputs.md
- OpenAPI: https://docs.dev.runwayml.com/openapi.json
- API reference index: https://docs.dev.runwayml.com/api.md
- Index pro agenty: https://docs.dev.runwayml.com/llms.txt

Rozdíl proti předpokladu v zadání: parametr se nejmenuje `aspectRatio`, ale Runway `ratio` ve tvaru `šířka:výška`. Oficiální env pro klíč je `RUNWAYML_API_SECRET`, ne obecný `RUNWAY_API_KEY`. Dokumentace doporučuje SDK; tento krok záměrně používá `fetch` jako Claude/OpenAI.

## 6. Spuštěné testy

```bash
npm run check:runway-image-to-video
npx tsc --noEmit
npx eslint lib/ai/runway.ts lib/ai/videoGeneration.ts lib/ai/videoGenerationError.ts lib/ai/index.ts
```

`fetch` v testech je mock. Volání mimo `https://api.dev.runwayml.com` test odmítne. Žádný reálný Runway HTTP request.

## 7. Výsledky testů

- `check:runway-image-to-video`: **12 passed, 0 failed**
  - factory jen Runway
  - chybějící API key (bez fetch)
  - neplatný vstup (bez fetch)
  - úspěšné vytvoření tasku
  - task `running`
  - dokončení s video URL
  - failed task (`SAFETY.INPUT.TEXT`)
  - HTTP 429
  - HTTP 503
  - HTTP timeout
  - poll timeout
  - API klíč není v chybové hlášce
- `tsc --noEmit`: úspěch (exit 0), žádné chyby z této změny
- `eslint` na nových/změněných `lib/ai` souborech: úspěch (exit 0)

Lint celého repo se nespouštěl (mohl by hlásit nesouvisející věci; `--fix` se nepoužil).

## 8. Co nebylo implementováno

- Napojení na `video-worker/jobRunner.ts` / FFmpeg pipeline
- UI, tlačítka, Benchmark Lab, Canvas
- Databázová migrace, `video_jobs`, n8n
- text-to-video, video-to-video, audio, hudba, kompletní Reel
- Ephemeral upload (`POST /v1/uploads`)
- Hardcoded katalog všech Runway modelů
- Telemetry / ceník Runway kreditů
- Stažení a uložení výstupního MP4 do Storage
- Zrušení tasku (`DELETE /v1/tasks/{id}`)

## 9. Známá omezení

- Request shape je explicitně **Gen-4.5** (`gen4.5` / `gen4_turbo`). Jiné Runway modely jsou odmítnuté před fetch.
- Fenrik Storage buckety jsou **private**. Runway HTTPS vstup musí být veřejně stažitelný (HTTPS, domain, `Content-Type`, HEAD, bez redirectů). Signed URL / data URI / ephemeral upload je práce dalšího kroku.
- Výstupní video URL vyprší za 24–48 hodin; provider je jen vrací, nestahuje. SUCCEEDED výstup musí být validní HTTPS URL, jinak `unexpected_response`.
- Poll timeout zruší čekání, **ne** Runway task (oficiální docs: timeout SDK task neruší).
- Create POST má výchozí `maxAttempts=1`. I tak může při ztracené HTTP odpovědi po úspěšném vytvoření na straně Runway vzniknout osiřelý placený task — retry create to jen zhoršuje, proto se nepoužívá.
- Oficiální docs (`/errors/errors`) říkají, že 429/502/503/504 **may retry**. To platí bezpečně pro GET poll; pro create POST před task ID to záměrně neděláme.

## 10. Co nebylo možné ověřit

- Živý Runway účet, klíč, billing a skutečná latence generace (záměrně žádný request).
- Zda produkční signed URL ze Supabase Storage projde Runway fetch/HEAD/Content-Type kontrolou.
- Zda `gen4.5` zůstane vhodný default v dalších měsících.
- Chování nedokumentovaných 5xx tvarů nad rámec troubleshooting (503).
- Přesné kreditové ceny (oficiálně jen `/guides/pricing.md`; do kódu se nedávají).

## 11. Potvrzení: žádný skutečný Runway request

Během implementace a testů nebyl odeslán žádný HTTP request na `https://api.dev.runwayml.com` z providera. Testy mockují `globalThis.fetch`. Stahovala se pouze veřejná dokumentace (`docs.dev.runwayml.com`), ne generation API.

## 12. Potvrzení: žádné placené náklady

Nebyla spuštěna žádná generace. Nevznikly Runway kredity ani jiné placené AI náklady z tohoto kroku.

---

## Kontrola a opravy 1B

Datum oprav: 2026-08-15  
Zdroje: OpenAPI `2024-11-06`, https://docs.dev.runwayml.com/errors/errors.md, https://docs.dev.runwayml.com/assets/inputs.md, https://docs.dev.runwayml.com/guides/using-the-api.md, https://docs.dev.runwayml.com/guides/models.md.

### 1. Co bylo opraveno

- Create `POST /v1/image_to_video` už výchozí transportní retry nepoužívá (`maxAttempts=1`).
- Request je označený jako Gen‑4.5 kontrakt; nekompatibilní modely se odmítají před sítí.
- Doplněna validace promptu (UTF-16), duration 2–10, oficiálního ratio enumu.
- SUCCEEDED output URL se validuje jako HTTPS.
- Env timeouty jsou rozlišené (HTTP vs poll wall-clock vs interval).

### 2. Ochrana create POST

- Konstanta `RUNWAY_CREATE_MAX_TRANSPORT_ATTEMPTS = 1`.
- Create **nikdy** nepadá zpět na `HTTP_MAX_ATTEMPTS.ai` (3).
- `generateImageToVideo` stripuje `dangerousCreateMaxTransportAttempts` — pohodlná cesta create nikdy neretryuje.
- Explicitní override `dangerousCreateMaxTransportAttempts` existuje jen pro výjimečné volání `createImageToVideo` a je v JSDoc označený jako nebezpečný (riziko druhého placeného tasku).
- GET `/v1/tasks/{id}` dál smí retryovat (429/5xx jsou dle oficiálních errors docs retryable a GET nevytváří nový task).

### 3. Přidané validace (před fetch)

- `motionPrompt` max **1000 UTF-16 code units** (OpenAPI `maxLength` gen4.5).
- `duration` integer **2–10**.
- `ratio` musí být jedna z: `1280:720`, `720:1280`, `1104:832`, `960:960`, `832:1104`, `1584:672`.
- `model` pouze `gen4.5` | `gen4_turbo` (stejný ratio set / duration rozsah).

### 4. Validace výsledné video URL

Při `SUCCEEDED`: první `output` musí být parsovatelná **HTTPS** URL s hostname. Jiný protokol / neplatný řetězec / prázdný output → `VideoGenerationError` s `code: "unexpected_response"`.

### 5. Význam timeout konfigurace

| Env | Význam |
|---|---|
| `RUNWAY_VIDEO_HTTP_TIMEOUT_MS` | Timeout **jednoho** HTTP requestu (create POST nebo poll GET). Default 60s. |
| `RUNWAY_VIDEO_POLL_TIMEOUT_MS` | Max wall-clock čekání na terminální stav tasku. Default 180s. |
| `RUNWAY_VIDEO_POLL_INTERVAL_MS` | Pauza mezi poll GET. Default 2s. |
| `RUNWAY_VIDEO_TIMEOUT_MS` | Legacy alias ze kroku 1 → mapuje na poll wall-clock, pokud nový název není nastaven. |

### 6. Nové testy a výsledky

`npm run check:runway-image-to-video` → **19 passed, 0 failed** (dříve 12).

Nové / rozšířené:

- oversized motionPrompt před fetch
- unsupported duration před fetch
- unsupported ratio před fetch
- incompatible model před fetch
- non-HTTPS / invalid SUCCEEDED video URL → `unexpected_response`
- create timeout → přesně **jeden** POST
- `generateImageToVideo` ignoruje dangerous create retries → jeden POST
- 429/5xx create → jeden pokus

Také: `npx tsc --noEmit` OK, eslint změněných souborů OK.

### 7. Potvrzení: žádný placený request

Žádný skutečný request na `https://api.dev.runwayml.com`. Testy jen mockují `fetch`. Žádné Runway kredity ani placené náklady z oprav 1B.

