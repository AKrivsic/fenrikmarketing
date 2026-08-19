# AI_MEDIA_BENCHMARK_LAB_STEP_12_REPORT

Datum: 2026-08-18  
Ověření dokumentace: **2026-08-18**  
Placená volání v tomto kroku: **žádná**

## 1. Kde jsme byli nesprávně omezení na Turbo

Cíl nebyl „zapojit Gen-4 Turbo“. Cíl byl najít poměr kvalita / zaujetí / chyby / cena / rychlost. Implementace kroků 1–11 to zúžila na jeden model.

| Místo | Co bylo natvrdo Turbo |
| --- | --- |
| `lib/runway-test/constants.ts` | `RUNWAY_TEST_PRICING.model = "gen4_turbo"`, 5 credits/s, helper `estimateRunwayTestCostUsd` |
| `lib/runway-test/config.ts` | UI/test job vždy `gen4_turbo`, 5 s, `720:1280` |
| `lib/scene-video-plan/buildSceneVideoGenerationPlan.ts` | `SCENE_VIDEO_PLAN_DEFAULT_MODEL` bral Turbo z toho helperu; produkční plán umí jen tento model |
| `lib/ai/runway.ts` (před tímto krokem) | `RUNWAY_GEN4_IMAGE_TO_VIDEO_MODELS = ["gen4.5", "gen4_turbo"]`; jiné modely odmítnuty před fetch |
| `lib/ai/videoGeneration.ts` | kontrakt popsán jako Gen-4.5-shaped only |
| `components/settings/RunwayTestPanel` | nabídka jen Runway Turbo + Turbo cena |
| Attempts/executor testy | fake providery default `gen4_turbo` |

**Skutečně provider-agnostické (beze změny):** lifecycle attempts (claim, idempotence, žádný auto-retry placeného POST, bounded download), executor sequential + budget, poll `GET /v1/tasks`.

**Jen zdánlivě obecné:** plán, preflight a cena předpokládaly Gen-4 + Turbo helper; `createImageToVideo` posílalo jedno Gen-4 tělo (`promptImage` string + `promptText` + `ratio` + `duration`).

**Voiceover dnes:** produkce používá pouze OpenAI `gpt-4o-mini-tts` přes `getSpeechProvider()` / `OpenAISpeechProvider` (`POST https://api.openai.com/v1/audio/speech`). Default hlas `alloy`. Žádný Fenrik ElevenLabs klient, žádný `ELEVENLABS_API_KEY`.

**Zvuk, který už v systému je:**
- TTS voiceover (OpenAI)
- programatický SFX overlay (`video-worker/services/sfx`)
- audio mix ve workeru
- **ne** hudební knihovna a **ne** generované scene audio z video modelu

Produkční routing v tomto kroku **zůstal**: default `still`, `SCENE_VIDEO_GENERATION_ENABLED=false`, plán stále `gen4_turbo`. To je záměr — Benchmark Lab nemá rozhodovat o produkci.

## 2. Aktuálně ověřené video kandidáty

Zdroje (2026-08-18):

- https://docs.dev.runwayml.com/index.md
- https://docs.dev.runwayml.com/guides/models.md
- https://docs.dev.runwayml.com/guides/pricing.md
- https://docs.dev.runwayml.com/api.md
- image-to-video: https://docs.dev.runwayml.com/api#tag/Start-generating/paths/~1v1~1image_to_video/post

1 kredit = **$0.01**. Endpoint pro všechny čtyři testable: `POST /v1/image_to_video`, poll `GET /v1/tasks/:id`.

### Testable (max 4)

| Role | Model | Portrait | Délka | Audio | Cena default testu |
| --- | --- | --- | --- | --- | --- |
| Levný baseline | `gen4_turbo` | `720:1280` | 2–10 s (default 5) | ne | 25 cr = **$0.25** |
| Kvalitnější Runway | `gen4.5` | `720:1280` | 2–10 s (default 5) | ne | 60 cr = **$0.60** |
| S generovaným audiem | `veo3.1_fast` | `720:1280` (i `1080:1920`) | **jen 4 / 6 / 8 s** (default 4) | ano, default true | 15 cr/s × 4 = **$0.60** |
| Jiná hodnota | `seedance2_fast` | `720:1280` | 4–15 s (default 5) | ano, default true | 29 cr/s × 5 = **$1.45** |

### Prověřeno, ale nezařazeno jako testable

| Model | Důvod |
| --- | --- |
| `veo3.1` | Stejný portrait I2V + audio jako Fast, ale 40 cr/s s audiem. Zbytečně dražší duplikát. |
| `seedance2_5` | Portrait I2V + audio je dokumentované, ale 720p 30 cr/s + **minimum 80 kreditů**. Seedance rodinu pokrývá Fast. |
| `gemini_omni_flash` | Portrait I2V (`720:1280`, 3–10 s) je dokumentované. Request **nemá audio pole**. 10 cr/s + 1 kredit za first-frame. Čtvrtý slot obsadil Seedance Fast (audio + jiná rodina). |

Veo **neumí 5 s**. Srovnání 5s Turbo vs 4s Veo není identická délka — UI to ukáže a nenechá poslat 5 s na Veo.

## 3. Voice kandidáti

| ID | Stav | Proč |
| --- | --- | --- |
| OpenAI `gpt-4o-mini-tts` + `alloy` | **testable** | Současný produkční hlas Fenrik. Endpoint ověřen. |
| Runway `eleven_v3` + preset `Maya` | **testable** | Jediná ověřená ElevenLabs cesta bez nového klienta. Cena: 1 kredit / 50 znaků, min 1 kredit. |
| Native ElevenLabs TTS | **unsupported** | Fenrik nemá ElevenLabs SDK ani API klíč. Nepřidávali jsme nový klient. |
| Runway `seed_audio` TTS | nezařazeno | Žádný jasný důvod třetího hlasu. |

OpenAI oficiální cena (https://developers.openai.com/api/docs/models/gpt-4o-mini-tts.md, 2026-08-18): text **$0.60 / 1M input tokenů**, audio **$12 / 1M output tokenů**. Před spuštěním **nelze** spočítat přesné USD (output tokeny neznáme). Neuhádli jsme číslo. UI ukáže ověřené sazby.

Interní Fenrik tabulka `TTS_USD_PER_1K_CHARS = 0.015` se v Benchmark Lab **nepoužívá** — není oficiální Runway/OpenAI formula.

## 4. Sound kandidáti

Rozlišení v datech i UI (`audio_role`):

- `scene_model_audio` — audio, které vrátí video model
- `voiceover` — TTS
- `ambient_sfx` — samostatný SFX
- `music_bed` — hudební podkres (v tomto kroku se negeneruje)
- `none` — video bez scene audio

| Kandidát | Stav |
| --- | --- |
| Runway `eleven_text_to_sound_v2` | **testable**. `POST /v1/sound_effect`, duration 0.5–30 s. S duration: **1 kredit/s**. Default 4 s = **$0.04**. Native ElevenLabs `POST /v1/sound-generation` existuje, ale Fenrik ho nevolá. |
| Runway `seed_audio` SFX | **unsupported**. Request **nemá duration**. Cena 0.25 cr/s, min 5 kreditů. Finite cenu testu nelze ověřit. |

Hudební knihovna se negeneruje.

## 5. Capabilities a ceny

| Položka | Endpoint | I2V | Portrait | Délka | Audio | Jednotka ceny | Min. test |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gen4_turbo | `/v1/image_to_video` | ano | 720:1280 | 2–10 | ne | 5 cr/s | $0.25 / 5 s |
| gen4.5 | totéž | ano | 720:1280 | 2–10 | ne | 12 cr/s | $0.60 / 5 s |
| veo3.1_fast | totéž + `audio` | ano | 720:1280 | 4/6/8 | ano | 15 cr/s s audiem / 10 bez | $0.60 / 4 s s audiem |
| seedance2_fast | totéž + `audio` + array promptImage | ano | 720:1280 | 4–15 | ano | 29 cr/s (480p/720p) | $1.45 / 5 s |
| gpt-4o-mini-tts | OpenAI `/v1/audio/speech` | — | — | z textu | ano | $0.60/1M text + $12/1M audio | USD předem neznámé |
| eleven_v3 Maya | Runway `/v1/text_to_speech` | — | — | z textu | ano | 1 cr / 50 znaků | $0.01 min |
| eleven_text_to_sound_v2 | Runway `/v1/sound_effect` | — | — | 0.5–30 | SFX | 1 cr/s při duration | $0.04 / 4 s |

Cena se **nepočítá** přes `estimateRunwayTestCostUsd`. Každý testable model má vlastní `quoteVideoCost` / `quoteVoiceCost` / `quoteSoundCost`. Neznámý model nebo neznámá cena se nespustí.

## 6. Architektura model catalogu

`lib/ai-media-benchmark/catalog.ts` je jediný zdroj pravdy.

Každá video položka: provider, model ID, uživatelský název, módy, portrait ratio, rozsah délky, audio, credits/s (případně with/without audio), extra/min kredity, `$0.01`/kredit, endpoint/adapter, `testable` | `unsupported`, důvod, datum ověření, odkazy.

Produkční plán **stále** používá Turbo helper — záměrně, protože produkční routing se neměnil. Benchmark Lab ho nepoužívá.

## 7. Adapter rozdíly

Společný minimální kontrakt (`ImageToVideoRequest`): `imageUrl`, `motionPrompt`, `duration`, `ratio`, volitelně `model`, `seed`, `generateAudio`.

Model-specific builder (`lib/ai/runwayImageToVideoBody.ts`):

- **gen4 / gen4_turbo:** `promptImage` string, `promptText`, `duration` 2–10, `ratio` Gen-4 enum, bez `audio`.
- **veo3.1_fast:** `promptImage` string, `audio` boolean, `duration` jen 4/6/8, Veo ratio enum.
- **seedance2_fast:** `promptImage: [{ uri, position: "first" }]`, `audio` boolean, `duration` 4–15, Seedance Fast ratio enum.

Společný async lifecycle: create POST `maxAttempts=1`, poll GET smí retry.

Nepodporovaný / neznámý model padá **před** fetch.

## 8. Benchmark workflow A–D

Systém **nemá** tlačítko ani API „spustit všechny modely“. Žádný kartézský součin.

- **Kolo A – obraz:** jedna scéna, jeden obrázek, jeden motion prompt, ručně jeden video model.
- **Kolo B – hlas:** stejný krátký text, jeden OpenAI nebo jeden ElevenLabs-via-Runway kandidát.
- **Kolo C – zvuk:** jen na vítězném videu; SFX je `ambient_sfx`, oddělené od scene audio. Varianta bez doplňkového zvuku = nespouštět kolo C.
- **Kolo D – celý reel:** typ `final_reel` je v datovém modelu. **Tento krok ho negeneruje.** UI to říká. Až po hvězdičkách.

## 9. Datový model

Migrace **038** `ai_media_benchmark_runs` (remote aplikována 2026-08-18, RLS zapnuto, `service_role` grant, `anon`/`authenticated` revoke).

Pole: `test_type` video/voice/sound/final_reel, `case_id`, `audio_role`, provider, model, voice_id, settings JSON, output bucket/path, credits, USD, duration, latency_ms, output_contains_audio, error, rating 1–5, note ≤ 500, datumy. Unique `client_request_id`.

Existující migrace 001–037 se neměnily.

## 10. Testovací stránka

`/settings/ai-media-benchmark` — jednoduchý interní admin panel (ne Canvas).  
`/settings/runway-test` přesměruje sem.

Umí: vybrat scénu, zdrojový obrázek, motion prompt, právě jeden video model, cenu a audio před spuštěním, explicitní potvrzení jednoho requestu, přehrát video/audio, 1–5 hvězdiček, poznámku, výsledky stejného case vedle sebe.

Stejné pro hlas a zvuk. Žádné „spustit všechny“.

## 11. Nákladové pojistky

Každé spuštění vyžaduje: výběr modelu, zobrazenou cenu (nebo ověřené sazby u OpenAI TTS), `maxCostUsd` tam, kde je USD známé, `confirmPaidGeneration=true`, příslušný flag, API klíč.

Flagy (default **false**, v `.env.example` zakomentované false, nic se nezapínalo):

- `AI_MEDIA_BENCHMARK_VIDEO_ENABLED`
- `AI_MEDIA_BENCHMARK_VOICE_ENABLED`
- `AI_MEDIA_BENCHMARK_SOUND_ENABLED`

`SCENE_VIDEO_GENERATION_ENABLED` zůstává false. Produkce `still`.

Zachováno z kroků 7–11: žádný auto-retry POST, claim/`client_request_id`, bounded download, attempts/executor beze změny.

## 12. Změněné soubory a migrace

Migrace: `supabase/migrations/038_ai_media_benchmark_runs.sql` (aplikována na remote).

Nové:

- `lib/ai-media-benchmark/*` (catalog, flags, service, types, rating, voice/sound wrappers, docs)
- `lib/ai/runwayImageToVideoBody.ts`
- `app/settings/ai-media-benchmark/page.tsx`
- `components/settings/AiMediaBenchmarkPanel/*`
- `app/api/admin/ai-media-benchmark/**`
- `scripts/check-ai-media-benchmark.ts`
- tento report

Úpravy:

- `lib/ai/runway.ts`, `lib/ai/videoGeneration.ts`
- `lib/api/storage.ts` (`buildAiMediaBenchmarkPath`)
- `app/settings/runway-test/page.tsx` (redirect)
- `app/settings/page.tsx`
- `.env.example`
- `package.json`
- `scripts/check-runway-image-to-video.ts`, `scripts/check-runway-scene-test.ts`

## 13. Výsledky testů

| Suite | Výsledek |
| --- | --- |
| `check:ai-media-benchmark` | **19 passed** |
| `check:runway-image-to-video` | **23 passed** |
| `check:runway-scene-test` | **14 passed** |
| `check:scene-video-attempts` | **39 passed** |
| `check:scene-video-executor` | **25 passed** |
| `check:scene-video-plan` | **19 passed** |
| `check:ai-video-worker-integration` (+ 11b/11c/11d) | **26 / 20 / 11 / 17 passed** |
| `check:video-reel-assembly` | **32 passed** |
| `check:openai-tts-voices` | **25 passed** |
| `check:tts-tail-validation` | **13 passed** |
| `tsc --noEmit` | passed |
| eslint změněných souborů | passed |

Offline testy pokrývají: jen dokumentované kandidáty jako testable, každý testable má cenu (OpenAI: sazby, ne vymyšlené USD), unsupported nejde spustit, cost/duration/ratio/audio, jeden model na klik, žádné run-all API, srovnání stejného case, rating 1–5, limity poznámky, flagy false, bez flagu/klíče/confirm žádný provider call, fake video/voice/sound, produkce `still`.

## 14. Potvrzení nulových placených volání

V tomto kroku neproběhl žádný skutečný request na Runway, OpenAI ani ElevenLabs. Testy používají fake providery a mockovaný `fetch`. Feature flagy zůstaly false. AI-video produkční flag se nezapínal.

## 15. Co zbývá před prvním skutečným benchmarkem

1. Mít `RUNWAYML_API_SECRET` a pro OpenAI hlas `OPENAI_API_KEY`.
2. Zapnout **jen jeden** flag (`VIDEO` / `VOICE` / `SOUND`) na dobu testu. Nezapínat všechny najednou.
3. Vybrat jednu reprezentativní portrait scénu a neměnit obrázek/prompt mezi video modely.
4. Spustit Kolo A po jednom modelu: Turbo → Gen-4.5 → Veo Fast (4 s) → Seedance Fast. Po každém dát hvězdičky a poznámku.
5. Kolo B: stejný text, Alloy, pak Maya.
6. Kolo C jen na vítězném klipu: scene audio pokud ho model vrátil, jeden SFX, varianta bez SFX.
7. Kolo D až potom, ručně, jedno celé video. Lab to teď automaticky neudělá.
8. Teprve podle hvězdiček nastavit produkční routing — **ne v tomto kroku**.

Rozpory, které jsme nezakryli: produkce je pořád Turbo-only v plánu; native ElevenLabs neexistuje; OpenAI TTS nemá přesné pre-run USD; `seed_audio` SFX a `seedance2_5` / `gemini_omni_flash` / `veo3.1` nejsou testable, i když jsou v dokumentaci.

## Kontrola a opravy Step 12B

Datum kontroly: **2026-08-18**  
Placená volání: **žádná**. Flagy zůstaly `false`. Produkční default `still` a `SCENE_VIDEO_GENERATION_ENABLED=false` se neměnily.

Oficiální zdroje znovu ověřené 2026-08-18:

- https://docs.dev.runwayml.com/guides/models.md
- https://docs.dev.runwayml.com/guides/pricing.md
- https://docs.dev.runwayml.com/api.md
- https://docs.dev.runwayml.com/ai-context.md
- https://developers.openai.com/api/docs/models/gpt-4o-mini-tts.md
- https://developers.openai.com/api/docs/pricing

1 kredit Runway = **$0.01** (jen z pricing.md).

### Nalezené chyby Step 12

1. **Hlas `eleven_v3`.** Step 12 ho označil jako testable. Aktuální Runway OpenAPI sice `eleven_v3` i `eleven_multilingual_v2` uvádí a preset **Maya** je v enum `runway-preset` u obou, ale Step 12B nesmí používat neověřený `eleven_v3` jako placenou cestu. Adapter navíc defaultoval `eleven_v3` a limit 5000 znaků — u `eleven_multilingual_v2` je `promptText` max **1000**.
2. **UI neříkalo jasně, že ElevenLabs běží přes Runway**, ne přes nativní ElevenLabs API.
3. **Gemini Omni Flash.** Katalog tvrdil, že I2V „nemá audio / scéna audio nevznikne“. To je nesprávné tvrzení o schopnosti modelu. Aktuální Runway OpenAPI pro `POST /v1/image_to_video`, `/v1/text_to_video` i `/v1/video_to_video` model `gemini_omni_flash` **pole `audio` nemá**. Ceník I2V je 10 kreditů/s + 1 kredit first-frame, bez rozdělení audio/silent. Generovaný zvuk tedy nelze bezpečně požádat ani nacenit jako zvlášť volbu. Guide `guides/gemini-omni-flash` vrací 404.
4. **Kolo A nemělo společnou délku.** Default byl 5 s u Turbo / Gen-4.5 / Seedance Fast a 4 s u Veo Fast. Srovnání nebylo férové; UI dovolovalo měnit délku.
5. **Placené spuštění Benchmark Labu nemělo atomic submission claim.** Insert `created` šel rovnou na provider POST. Timeout / síť / 5xx se značily `failed` a druhý klik mohl poslat druhý placený POST. Chyběly stavy `submitting` a `submission_unknown`.

### Přesné opravy

**Runway TTS (ElevenLabs model na Runway, ne native ElevenLabs):**

- Testable kandidát: `eleven_multilingual_v2` + preset `Maya`.
- Request: `{ model: "eleven_multilingual_v2", promptText (max 1000), voice: { type: "runway-preset", presetId: "Maya" } }`.
- Cena: `ceil(znaků / 50)` kreditů × $0.01 (pricing.md: 1 kredit / 50 znaků).
- `createTextToSpeech` v `lib/ai/runway.ts` přijímá jen `eleven_multilingual_v2`. `eleven_v3` se neposílá.
- Maya je v OpenAPI enum `runway-preset` — ID jsme nevymýšleli.
- Native ElevenLabs zůstává unsupported (žádný Fenrik klient / klíč).

**Gemini Omni Flash:**

- Zůstává **unsupported** (není 5. kandidát Kola A).
- Důvod: generated-audio I2V **nelze bezpečně požádat**, protože I2V OpenAPI nemá `audio`. **Neříkáme, že model zvuk neumí.**
- Adapter má dokumentovaný I2V builder bez pole `audio` (`promptImage` URI, `promptText`, `duration` 3–10, `ratio` `1280:720`|`720:1280`). `generateAudio: true` se odmítne jako undocumented request, ne jako „model nemá audio“.
- Paid `createImageToVideo` Gemini pořád odmítne před fetch (katalog `unsupported`).

**Kolo A sjednocené na 4 s:**

| Model | 4 s · `720:1280` | Audio request | Cena |
| --- | --- | --- | --- |
| `gen4_turbo` | 5 cr/s × 4 | ne (pole není) | 20 cr = **$0.20** |
| `gen4.5` | 12 cr/s × 4 | ne (pole není) | 48 cr = **$0.48** |
| `veo3.1_fast` | 15 cr/s × 4, `audio: true` | ano | 60 cr = **$0.60** |
| `seedance2_fast` | 29 cr/s × 4, `audio: true` | ano | 116 cr = **$1.16** |
| **Maximum celého Kola A** | čtyři samostatné běhy | | **244 cr = $2.44** |

UI: délka zamčená na 4 s, portrait `720:1280`, zobrazená maximální cena Kola A. Pořád jeden model na klik. Žádné „spustit vše“. Create s jinou délkou/poměrem selže (`duration_must_be_round_a` / `ratio_must_be_round_a`).

**Submission claim (stejná ochrana jako `scene_video_generation_attempts`):**

- Nová migrace **039** (038 beze změny). Aplikovaná na remote: `039_ai_media_benchmark_submission_claim` (20260818021749).
- Stavy: `submitting`, `submission_unknown`.
- Sloupce: `submission_claim_owner`, `submission_claimed_at`.
- CHECK: `submitting` ⇒ task id null + owner+at; jiný stav ⇒ claim null.
- Unique index `(provider, provider_task_id)` WHERE `provider_task_id IS NOT NULL`.
- Atomický CAS `created` → `submitting` před POSTem. Aktivní claim = žádný druhý POST. Zastaralý claim bez task ID → `submission_unknown`, žádný auto re-POST.
- Timeout / síť / 5xx po možném odeslání → `submission_unknown` (ne obyčejné `failed`). Definitivní 4xx / chyba před POSTem (např. signed URL) → `failed`.
- Stejné pro video, Runway voice i sound.
- OpenAI TTS je synchronní: stejný claim; `client_request_id` po `succeeded` znovu nesyntetizuje; `submission_unknown` se automaticky neopakuje. Nové UUID po úspěchu je vědomý nový test.

### Výsledné kandidáty

**Kolo A (testable, vždy 4 s, `720:1280`, jeden model):** `gen4_turbo`, `gen4.5`, `veo3.1_fast` (audio), `seedance2_fast` (audio). Maximum **$2.44**.

**Unsupported video:** `veo3.1` (dražší duplikát Fast), `seedance2_5` (min. 80 kreditů), `gemini_omni_flash` (generated-audio I2V request není v OpenAPI).

**Kolo B:** OpenAI `gpt-4o-mini-tts` + `alloy` (nativní Speech API; USD předem neznámé: $0.60/1M text in + $12/1M audio out). Runway-hosted ElevenLabs `eleven_multilingual_v2` + Maya. Native ElevenLabs unsupported.

**Kolo C:** `eleven_text_to_sound_v2` testable; `seed_audio` unsupported (I2V sound_effect bez duration).

### Migrace 039

Soubor: `supabase/migrations/039_ai_media_benchmark_submission_claim.sql`.  
038 se nearovnala. Remote ověřeno: status CHECK obsahuje `submitting`/`submission_unknown`, integrity CHECK, unique index `ai_media_benchmark_runs_provider_task_uniq`.

### Testy

`check:ai-media-benchmark` **31 passed** (0 reálných `fetch`). Mimo jiné: souběh stejného `client_request_id`, aktivní claim, zastaralý claim, timeout create, provider 5xx, chyba před POSTem, `submission_unknown` bez auto-retry, Runway TTS model+Maya, Gemini audio metadata, společných 4 s a $2.44, flagy default false, OpenAI energetická instrukce jen v labu.

Regrese: `check:runway-image-to-video` 23, `check:runway-scene-test` 14, `check:scene-video-attempts` 39, `check:scene-video-executor` 25, `check:scene-video-plan` 19. `tsc --noEmit` passed. eslint změněných souborů passed.

### Zbývající blockery před prvním placeným během

1. Mít `RUNWAYML_API_SECRET` a pro OpenAI hlas `OPENAI_API_KEY`.
2. Zapnout **jen jeden** flag (`AI_MEDIA_BENCHMARK_VIDEO_ENABLED` / `VOICE` / `SOUND`). Nezapínat v tomto kroku.
3. Jedna portrait scéna, stejný obrázek i prompt pro všechna čtyři videa Kola A (4 s).
4. Spouštět po jednom modelu. Při `submission_unknown` **neklikat znovu** se stejným requestem — vyžaduje ruční kontrolu.
5. OpenAI TTS: nové `client_request_id` po úspěchu je nový placený výstup; opakování stejného UUID nesyntetizuje podruhé.
6. Gemini generated-audio I2V dál nelze zařadit, dokud Runway OpenAPI nedokumentuje `audio` na I2V.
7. Produkční routing (`still`, plán `gen4_turbo`) se pořád nemění.

## Finální hlasová korekce Step 12B

OpenAI benchmark request teď posílá pevné Speech `instructions` jen v Benchmark Labu:

> Mluv svižně, energicky a přirozeně jako moderátor krátkého videa pro sociální sítě. Nezní uspěchaně ani reklamně.

Platí výhradně pro `createOpenAiBenchmarkVoiceProvider`. Produkční `buildTtsInstructions` / worker TTS se nemění. OpenAI Alloy i Runway-hosted Maya dostanou stejný `DEFAULT_VOICE_SCRIPT`; instrukce se do Maya `promptText` nepřidává (Runway TTS ji jako samostatné pole nemá). UI Kola B říká, že jde o srovnání jednoho reprezentativního energického hlasu od každého poskytovatele a že výsledek je volba poskytovatele/modelu, ne univerzálního produkčního hlasu. Offline test `OpenAI benchmark receives energetic delivery instructions` to ověřuje. Žádné placené volání, flagy false, `still` beze změny.

## Kontrola Vercel timeoutu před placeným během

Datum kontroly: **2026-08-18**  
Placené volání: **žádné** (falešný provider, falešné stažení, falešné Supabase). Flagy zůstaly `false`. Produkční routing (`still`, `SCENE_VIDEO_GENERATION_ENABLED=false`) se neměnil.

### Skutečný tok

| Krok | Kde | Čeká na generování? | Placené? |
| --- | --- | --- | --- |
| Create provider úlohy | `POST /api/admin/ai-media-benchmark/{video,voice,sound}` → `createImageToVideo` / `createTextToSpeech` / `createSoundEffect` | **Ne.** Vrací `provider_task_id` a stav `pending`. `waitForImageToVideo` se v Benchmark Labu nevolá. | Ano, právě jeden POST po atomic claim |
| Kontrola stavu | `GET .../runs/:id/status` → `getImageToVideoTask` / `getAudioTask` (jeden GET, `maxTransportAttempts: 1`) | Ne. Jeden poll, žádná wait smyčka. | Ne |
| Stažení hotového souboru | stejný status request, `downloadBenchmarkOutput` | Ne. Stahuje jen když provider už vrátil URL. | Ne |
| Upload do Supabase | `storage.upload` na `{projectId}/ai-media-benchmark/{runId}/output.mp4` (nebo `audio.mp3`), `upsert: true` | Ne | Ne |
| Opakování po přerušení | další `GET status` | Ne. Nikdy nevolá create. | Ne |

OpenAI TTS je výjimka: syntéza je synchronní v create requestu (typicky sekundy, ne minuty). Idempotence zůstává na `client_request_id`. Riziko 180 s je stažení Runway videa, ne TTS.

### Co bylo nebezpečné

Status endpoint stahoval výstup ve stejném Vercel requestu **bez vlastního timeoutu**. `download_failed` se choval jako konec, takže timeout mohl zaplacenou úlohu uvíznout bez retry stažení. To je opravené.

### Ochrany proti limitu 180 s

- Route `maxDuration = 180` na create video/voice/sound i na status.
- Interní timeout stažení: **`AI_MEDIA_BENCHMARK_DOWNLOAD_TIMEOUT_MS = 120_000` (120 s)**. AbortController ruší fetch i bounded čtení těla. Upload se po abortu nespouští.
- Zbývá ~60 s na upload + zápis DB u 4s klipu.
- Streamovaný strop **80 MB** (`readResponseBodyBounded`). `Content-Length` nad limit se zruší hned. Nic se nenačítá do paměti bez limitu.
- `download_failed` **není definitivní konec**, pokud existuje `provider_task_id`. Další GET status opakuje jen download/upload, nebo převezme soubor už uložený na očekávané cestě.
- UI dál polluje `download_failed` (kromě `download_too_large`) a má tlačítko **„Znovu stáhnout bez nové generace“**. Nové `client_request_id` se při tom nevydává.

### Nasimulované scénáře (offline)

Všechny s falešným providerem. Ve všech zůstal jeden create/POST, `provider_task_id` se nezměnil, jiný run se nepřepsal.

| Scénář | Výsledek |
| --- | --- |
| Pomalé stažení nad interní timeout | `download_failed` / `download_timeout`, žádný upload, žádný druhý POST |
| Timeout před začátkem uploadu | totéž; `_uploads` prázdné |
| Chyba během uploadu | `download_failed` / `upload_failed`; další sync uspěje, stále jeden create |
| Upload OK, pád před zápisem do DB | `finalize_interrupted`; další sync **převezme existující soubor**, bez nového stažení i bez nového POST |
| Opakované GET status po úspěchu | vrací stejnou cestu, žádný další create |
| `download_failed` → sync | jen download/upload |
| Soubor nad 80 MB | `download_too_large`, nic se neukládá, task id zůstává |
| Dva běhy vedle sebe | cesty obsahují `runId`; retry upsertuje jen svou cestu |

### Závěr

- **Je Benchmark Lab bezpečný na Vercelu s limitem 180 s?** Ano pro Kolo A (4 s klipy). Create je krátký. Stažení se musí vejít do 120 s; když ne, request skončí jako `download_failed` a stejný run se dokončí dalším status GET.
- **Interní timeout:** **120 sekund** na stažení. Route budget 180 s. Strop souboru 80 MB.
- **Po přerušení:** `provider_task_id` zůstane. Žádný druhý placený create/POST. Status znovu stáhne, nebo použije soubor už uložený na `{projectId}/ai-media-benchmark/{runId}/…`. Jiný benchmark run se nepřepíše.
- **Je nutný DigitalOcean worker?** **Ne.** Stažení a upload jdou bezpečně dokončit na Vercelu díky 120s abortu a retry. Složité předání workeru se neimplementovalo. Produkční worker se neměnil. Worker by byl namístě jen kdyby placené testy ukázaly, že CDN pravidelně nestihne 120 s — to teď nemáme.
- **Je bezpečné přejít k prvnímu placenému testu?** **Ano.** Zapněte ručně právě jeden flag, jeden model, jednu 4s scénu. Tato kontrola flag nezapnula a nic nezaplatila. Při `download_failed` nespouštějte nový request — použijte status / „Znovu stáhnout bez nové generace“.

### Testy

`check:ai-media-benchmark` **41 passed**, 0 reálných `fetch`. Regrese: `check:scene-video-attempts` 39, `check:runway-scene-test` 14. `tsc --noEmit` passed. eslint změněných souborů passed.

## Kolo A+ – kombinovaná testovací scéna

Datum: **2026-08-19**  
Placené volání: **žádné**. Flagy `false`. Produkční `still`, TTS i AI-video routing beze změny.

### Audit existující architektury

FFmpeg na Vercelu **není** podporovaný render path. Video render + FFmpeg běží na DigitalOcean workeru (`video-worker/services/ffmpeg.ts`). Interní úlohy mimo produkční reel už worker umí (např. `/edit-scene-image`) přes `VIDEO_WORKER_SECRET`, **ne** přes `POST /render` a **ne** přes `video_jobs` callbacky.

Použitý mixér: existující `mixAudioLayers` (`video-worker/services/audioMix`). Umí voiceover + scene audio z videa (zeslabené a duckované pod hlasem) + ambient bed. Není to druhý mixér. Celý reel orchestrátor (`orchestrateVideoClipReel`) se nepoužívá — ten skládá více klipů do reelu. Kolo A+ je jedna 4s scéna.

Odvozený soubor: `{projectId}/ai-media-benchmark/{combinedRunId}/combined.mp4`. Původní video/hlas/sound path (`…/{sourceRunId}/output.mp4` nebo `audio.mp3`) se nemění.

### Kde sestavení běží a proč

**DigitalOcean video worker**, endpoint `POST /assemble-benchmark-combined-scene`.  
Vercel jen zapíše záznam, zavolá worker a uloží pointer. Důvod: FFmpeg + ffprobe na workeru už jsou; na Vercelu nejsou bezpečně podporované. Produkční `POST /render`, `jobRunner` a produkční callbacky se **nepoužívají**.

### Datový tok

1. Admin vybere succeeded video run + succeeded voice run + volitelně sound run.
2. `planCombinedScene` určí vrstvy (žádný provider).
3. Insert do `ai_media_benchmark_combined_runs` (unique `client_request_id`).
4. CAS claim `created|failed` → `assembling`.
5. Worker stáhne zdrojové soubory, `ffprobe` změří hlas, smíchá `mixAudioLayers`, muxuje video+mix na přesně 4 s, upsert na combined path.
6. Vercel zapíše `succeeded` + output pointer.
7. Retry stejného `client_request_id` nesmí volat Runway/OpenAI. Když soubor na expected path už je, záznam se dokončí adoptací.

### Zacházení se zvukem

| Video model | Vlastní audio | Společný sound run |
| --- | --- | --- |
| `gen4_turbo`, `gen4.5` | ne | použije se jako ambient (gain 0.08), duck pod VO |
| `veo3.1_fast`, `seedance2_fast` | ano, scéna (gain 0.22), duck pod VO | **nepřidá se** (`model_audio_kept`) |

Voiceover vždy od t = 0, gain 1.0, priorita. Hlas se nezrychluje. Kratší hlas skončí dřív, ambient může pokračovat. Delší než 4 s + 0.05 → `voiceover_too_long_for_scene`, žádný render.

### Retry a placené požadavky

Sestavení **není** placený provider lifecycle. Žádný nový Runway/OpenAI POST. Pád workeru / ztráta lease / selhání uploadu: stav `failed`, stejný combined run, stejná výstupní cesta, upsert. Jiný run se nepřepíše. Produkční joby nedotčeny.

### Migrace

`040_ai_media_benchmark_combined_runs.sql`. 038 a 039 beze změny. Tabulka `ai_media_benchmark_combined_runs` s RLS, `service_role` grant, tři rating sloupce (`rating_image`, `rating_av_fit`, `rating_overall`). Aplikovaná na remote. Advisors na nové tabulce nehlásí chybějící RLS.

### UI

Tab **Kolo A+** na `/settings/ai-media-benchmark`: výběr hotových runů, náhled vrstev, **„Sestavit kombinovanou scénu“**, přehrání 4s výsledku, tři samostatné 1–5 škály. Žádné „sestavit všechny“. Fairness text: stejný hlas pro čtyři videa, stejný sound pro Gen-4, Veo/Seedance s vlastním ambientem, obraz odděleně od celkového dojmu.

### Testy

`check:ai-media-benchmark` **51 passed**, 0 reálných `fetch`. Mimo jiné: Gen-4 + VO + sound, model audio + duck bez druhého ambientu, přesně 4 s, `voiceover_too_long_for_scene`, chybějící storage, retry bez provider POST, pád po uploadu před DB + adopt, jiný run nepřepsán, tři ratingy, žádné „sestavit všechny“. `tsc --noEmit` passed. eslint změněných souborů passed.

### Co zbývá před registrací a prvním placeným testem

1. Nasadit DigitalOcean worker s novým `/assemble-benchmark-combined-scene`. Bez toho Kolo A+ nesestaví soubor (Vercel FFmpeg nespouští).
2. Mít `RUNWAYML_API_SECRET` / `OPENAI_API_KEY` a zapnout **ručně jeden** generation flag — v tomto kroku se nezapínal.
3. Nejdřív dokončit Kolo A/B/C (čtyři 4s videa, jeden společný hlas, pro Gen-4 jeden sound). Až potom A+.
4. Při `voiceover_too_long_for_scene` zkrátit text a vygenerovat **nový** hlasový run (to už je placené). Sestavení samo hlas nezrychlí.
5. Produkční routing (`still`, plán `gen4_turbo`, TTS) se pořád nemění.

## Kontrola a opravy Kola A+ 12C

Datum: 2026-08-19  
Placená volání: **žádná**. Feature flagy: **beze změny**. Produkční workflow / TTS / `still` / AI-video routing: **beze změny**. Migrace 038, 039, 040: **beze změny**. Nová migrace 041: **není potřeba**.

### Nalezené chyby

1. **Falešná adopce `combined.mp4`.** Vercel dokončil combined run, pokud `storage.list` našel soubor. Worker vracel `reusedExistingOutput: true` ze stejného `list` bez stažení a bez ffprobe. Poškozený, prázdný nebo neúplný soubor mohl skončit jako `succeeded`.
2. **Slabá kontrola cest.** Worker používal `path.includes(combinedRunId)`. Cesta jiného adresáře, která jen obsahovala UUID, by prošla.
3. **Idempotence `client_request_id` bez shody vstupů.** Stejný klíč mohl znovu sestavit jiný video/voice/sound/project/case/mix do existujícího řádku, včetně cesty po `23505`.
4. **Voiceover cap 4,05 s.** Pravidlo `4 s + 0,05` nechávalo hlas delší než scénu. Hrozilo uříznutí na konci 4s muxu.
5. **Claim bez CAS.** `markAssembleFailed` filtroval jen `id` + `output_path IS NULL`. Zastaralý request po timeoutu mohl označit `failed` už nově získaný claim. Dokončení nebylo owner-scoped.
6. **Mix a délka na workeru.** HTTP schema bralo libovolný bucket, kladnou délku a libovolné gainy. Caller mohl přepsat plán Kola A+.

### Provedené opravy

- Vercel už **nesmí** dokončit combined run z `storage.list`. Po pádu po uploadu před zápisem do DB retry **zavolá worker**.
- Worker nejdřív zkontroluje kontrakt, pak se **pokusí stáhnout** expected `combined.mp4` a ověří ho ffprobe. Neplatný soubor stejného runu se znovu vyrenderuje a upsertne na **stejnou** cestu. Cesta jiného runu se nesestavuje.
- Stejný `client_request_id` musí sedět: project ID, video/voice/sound run ID (`null` je hodnota), case ID, mix, cílová délka 4 s. Jinak `combined_request_input_mismatch`. Stejná kontrola po souběžném insertu (`23505`).
- Max voiceover **3,90 s** (`duration > 3.9` → `voiceover_too_long_for_scene`). 3,90 s projde. Hlas se nezrychluje ani neořezává. UI varuje předem.
- Worker vyžaduje UUID, bucket přesně `video-renders`, output path přesně `{projectId}/ai-media-benchmark/{combinedRunId}/combined.mp4`, zdrojové cesty stejného projektu v Benchmark Labu (jiný run UUID než combined run), kanonické gainy, VO od t=0, délku přesně 4 s, zákaz stackovat scene+ambient.
- Stale fail i complete používají CAS na `status=assembling` + `assembly_claim_owner` + `assembly_claimed_at` + `output_path IS NULL`. Starý request nemůže přepsat nový claim.

### Jak worker ověřuje existující MP4

1. Stáhne expected output path (ne `list`).
2. Soubor musí jít stáhnout a mít nenulovou velikost.
3. `ffprobe` musí soubor přečíst.
4. Musí existovat video stream i audio stream.
5. Rozlišení musí být přesně **720×1280**.
6. Délka musí být 4 s ± 0,15 s (jen technická tolerance mux/ffprobe, ne voiceover cap).

Když kterékoliv z toho selže, worker soubor **neoznačí** jako použitelný a vyrenderuje znovu na stejnou cestu. Když vše sedí, vrátí `reusedExistingOutput: true` bez nového mix/mux — žádný Runway/OpenAI request.

### Shoda vstupů při retry

`createCombinedScene` po načtení existujícího řádku (select i race `23505`) porovná uložené `project_id`, `video_run_id`, `voice_run_id`, `sound_run_id` (včetně `null`), `case_id`, `mix_settings` a `targetDurationSeconds` s novým požadavkem. Nesoulad → `combined_request_input_mismatch`, žádné sestavení do cizího záznamu. Retry stejného combined runu smí znovu jen stáhnout / FFmpeg / ověřit / upsert odvozeného `combined.mp4`. Produkční `/render`, `jobRunner` a produkční callbacky se nevolají.

### Maximální povolená délka voiceoveru

**3,90 sekundy** pro 4s scénu. Přesně 3,90 s je platné. Cokoliv delšího je `voiceover_too_long_for_scene`.

### Claim při timeoutu a souběhu

- Čerstvý claim (`assembling`, ne starší než 5 min) druhý request nepřepisuje.
- Zastaralý claim se označí `failed` **jen** CAS na původního ownera a `assembly_claimed_at`. Pokud mezitím claim převzal někdo jiný, CAS nesedí a starý request skončí.
- Complete je stejně owner-scoped. Timeout Vercelu nezakládá nový Runway/OpenAI task; sestavení je odvozené z už hotových runů.
- Paralelní sestavení stejného combined runu používá vstupy z toho řádku a zapisuje jen jeho output path.

### Testy

| Sada | Výsledek |
| --- | --- |
| `check:ai-media-benchmark` | **69 passed**, 0 failed, 0 reálných `fetch` |
| `check:audio-mix` (FFmpeg mix) | **19 passed** |
| `tsc --noEmit` | passed |
| eslint změněných souborů | passed |

12C mimo jiné: poškozený MP4 se neadoptuje; validní se ověří a použije; chybějící audio/video, špatná délka i rozlišení se odmítnou; mismatch video/voice/sound/project/case; souběžný insert s jinými vstupy; VO 3,90 s / 3,91 s; přesný output bucket/path; cizí projekt ve zdroji; nepovolený mix; stale claim nepřepíše nový; retry bez provider tasku; produkce zůstává `still`.

### Nasazení DigitalOcean workeru

**Ano — tento hardened worker je bezpečné nasadit.** Endpoint `/assemble-benchmark-combined-scene` teď odmítá cizí bucket/cestu/mix/délku, neadoptuje soubor podle `list` a ověřuje MP4 před reuse. Bez tohoto deploye Kolo A+ pořád nesestaví soubor (Vercel FFmpeg nespouští). **Nenasazujte** starší worker z 12B, který reuse dělal jen přes `storage.list`.

Tento krok worker nenasazoval, flagy nezapínal a žádné placené volání neprováděl. Produkční režim `still`, `SCENE_VIDEO_GENERATION_ENABLED=false` a produkční TTS zůstávají.

## Kolo T – text-to-video

Datum: **2026-08-19**  
Ověření Runway T2V dokumentace: **2026-08-19**  
Placená volání: **žádná**  
Nové flagy: **vypnuté** (`AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED` default `false`)  
Produkční workflow / TTS / `still` / AI-video routing: **beze změny**  
Migrace 038–040: **beze změny**  
Nová migrace 041: **není potřeba**

Cíl tohoto kola je zjistit, zda text-to-video dává zajímavější a použitelnější 4s scény než současné image-to-video. Produkční režim `still` se nemění.

### Audit současných dat a adaptérů

Bez hádání, z kódu:

| Otázka | Zjištění |
| --- | --- |
| Runway transport k znovupoužití | Ano: `RunwayVideoGenerationProvider` HTTP, `dangerousCreateMaxTransportAttempts: 1`, poll `GET /v1/tasks`, bounded download 120 s / 80 MB, output `{projectId}/ai-media-benchmark/{runId}/output.mp4` |
| Existoval T2V kontrakt? | Ne. Byl jen `ImageToVideoRequest` a `POST /v1/image_to_video`. Nově oddělený `TextToVideoProvider` / `POST /v1/text_to_video`. Není součástí povinného `VideoGenerationProvider` (I2V fakes se nemění). |
| Produkční AI-video routing | `getVideoGenerationProvider()` zůstává I2V. Executor / plán pořád `gen4_turbo`, default render `still`. |
| Tabulka runů | `ai_media_benchmark_runs.test_type='video'` stačí. Režim je v `settings.generationMode = "text_to_video"`, `case_id = text-to-video-scene-t`. Image sloupce zůstávají `null`. |
| Product Brain / storyboard | Stills + `image_prompt` / `motion_prompt`. T2V stills nepoužívá. Prompt skládá služba z projektových polí + scénické myšlenky. Zákaz loga a čitelného textu už pipeline zná; T2V ho opakuje v provider promptu. |
| Kolo A+ | Combined mixer / worker `/assemble-benchmark-combined-scene` beze změny. Succeeded T2V clip je `test_type=video`, takže A+ ho může vybrat. UI teď bere i `text-to-video-scene-t`. |

**Co Fenrik o firmě opravdu ukládá** (profil nevymýšlí identitu):

- `projects`: name, type, language, market_scope, `product_is` / `product_is_not` / `product_strengths`, tone_of_voice
- Knowledge V2 karty Product Brain (`knowledge.cards.product.*`)
- `knowledge.presentation.brand` / `.visual`: hex `accent_color`, `background_color`, `text_color`, volitelně `visual_profile` (NATURAL / MINIMAL / BOLD / EDITORIAL / PREMIUM)
- asset metadata `product_role=logo` — detekuje se, **do promptu se logo negeneruje**
- per-package `VisualIdentity` (art_direction, lighting, palette, environment, camera_style) žije na presentation_generation, ne na projektu → Round T ho nečte, aby se nevymýšlela identita z náhodného balíčku

Chybí-li hex barvy nebo obor, použije se bezpečný oborový fallback, ne falešné firemní barvy.

### BrandVisualProfile

Deterministická služba `buildBrandVisualProfile` / `loadBrandVisualProfile`:

| Pole | Zdroj |
| --- | --- |
| primaryColor / secondaryColor | ověřený hex z presentation brand/visual, jinak `null` + `usedColorFallback` |
| industryHint / productSummary | Product Brain `product_is` / `product_strengths`, jinak `projects.type` |
| environment | věta z oboru, nebo obecný professional workplace |
| wardrobeStyle | firemní barvy v oblečení/prostředí, nebo neutrální paleta bez vymyšlené uniformy |
| lighting / cameraStyle / realismLevel | z visual_profile pokud existuje, jinak documentary 4s move |
| forbiddenVisualElements | generated logos, readable on-screen text, watermarks, website/app UI, brand wordmarks |

Profil se automaticky vloží do stejného promptu všech modelů stejného testu. UI ho ukáže; ruční úprava každé scény se nevyžaduje.

### Oficiální modely Kola T (max 3)

Zdroje (2026-08-19):

- https://docs.dev.runwayml.com/guides/models.md
- https://docs.dev.runwayml.com/guides/pricing.md
- https://docs.dev.runwayml.com/api.md
- `POST /v1/text_to_video`: https://docs.dev.runwayml.com/api#tag/Start-generating/paths/~1v1~1text_to_video/post

1 kredit = **$0.01**. Čtvrtý model se nepřidával. `gen4_turbo` je v models.md **Image input only** — v Kole T není.

| Model | T2V | Portrait `720:1280` | 4 s | Audio | Seed | Image refs v Round T | 4s cena |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `gen4.5` | `promptText` (max 1000 UTF-16), `ratio` povinný, `duration` 2–10 | ano | ano | pole `audio` v T2V schématu **není** | ano (random integer, **není** obraz) | neodesílá se | 12 cr/s × 4 = **48 cr = $0.48** |
| `veo3.1_fast` | `promptText` max 1000, `duration` **4/6/8**, `audio` default true | ano | ano | dokumentované, Round T `audio: true` | není v T2V schématu | ne | 15 cr/s s audiem × 4 = **60 cr = $0.60** |
| `seedance2_fast` | `promptText` max 3500, `duration` 4–15, `audio` default true | ano (`720:1280` v 480p/720p sadě) | ano | dokumentované, Round T `audio: true` | není v T2V schématu | OpenAPI umí `references`; **Round T je neposílá** | 29 cr/s × 4 = **116 cr = $1.16** |

**Maximum celého Kola T (tři samostatné 4s testy):** $0.48 + $0.60 + $1.16 = **$2.24**.

Férový test: stejná myšlenka, stejný automatický prompt (≤ 1000 UTF-16 kvůli Gen-4.5/Veo), stejný BrandVisualProfile, `720:1280`, 4 s, stejný documentary camera move. Jeden model na jedno spuštění. Žádné „spustit všechny“.

Společná scéna: příchod a krátký úkol (default), nebo prohlídka/předání, nebo z venku dovnitř. Viditelný pohyb, profesionální vzhled, firemní barvy v oblečení nebo prostředí, žádné generované logo, žádný čitelný text, žádný konkrétní web/UI.

Gen-4.5 je tichý → v Kole A+ stejný společný voiceover a volitelný sound jako ostatní tiché testy. Veo/Seedance si v Round T nechají dokumentované modelové audio; A+ ho použije jako scene bed a společný sound nestackuje.

### Provider lifecycle a ochrana placených požadavků

Stejné pojistky jako Benchmark Lab I2V:

- flag `AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED` default **false** (nezapíná ho `AI_MEDIA_BENCHMARK_VIDEO_ENABLED`)
- explicitní `confirmPaidGeneration`
- povinný `maxCostUsd`
- atomic submission claim, `submitting`, `submission_unknown`
- žádný automatický druhý placený POST
- `dangerousCreateMaxTransportAttempts: 1`
- create vrátí task ID, Vercel na dokončení **nečeká**
- poll `GET /v1/tasks` (stejný jako I2V)
- bezpečný download retry bez nové generace
- timeout 120 s, max 80 MB
- výstup jen do cesty konkrétního runu

Kolo T+ (`text-video-plus`) je datový + UI návrh. POST je 403 `text_to_video_plus_not_implemented`. Žádný provider request.

V UI je odděleno: **random seed** (číslo), **reference image**, **first-frame image**. Seed se nesmí tvářit jako obrázek. Mezi třemi kandidáty dokumentuje T2V image `references` jen `seedance2_fast`; Gen-4.5 a Veo 3.1 Fast T2V OpenAPI image references nemají. Round T+ se nespustí, dokud nebude ověřený per-model kontrakt.

### Napojení na Kolo A+

Succeeded T2V run (`test_type=video`, `generationMode=text_to_video`) lze vybrat jako video vstup. A+ dál používá:

- stejný vybraný voiceover (max 3,90 s)
- modelové audio u Veo/Seedance, pokud `output_contains_audio`
- společný sound u Gen-4.5 (bez modelového audia)
- stejné 4s sestavení na existujícím DigitalOcean workeru
- stejné tři typy hodnocení (obraz / soulad zvuku a obrazu / celkový dojem)

Nový audio mixer ani combined-scene lifecycle nevznikl.

Samostatný T2V run má hvězdičky a poznámku. Metadata ukazují model, `text_to_video`, cenu, počet generací, prompt, vizuální profil, regeneraci.

### Změněné soubory

- `lib/ai/videoGeneration.ts`, `lib/ai/runway.ts`, `lib/ai/runwayTextToVideoBody.ts`
- `lib/ai-media-benchmark/catalog.ts`, `docs.ts`, `flags.ts`, `types.ts`, `index.ts`, `service.ts`, `combinedPlan.ts`
- `lib/ai-media-benchmark/brandVisualProfile.ts`, `textToVideoPrompt.ts`, `textVideoPlus.ts`
- `app/api/admin/ai-media-benchmark/catalog/route.ts`
- `app/api/admin/ai-media-benchmark/text-video/route.ts`, `text-video/preview/route.ts`, `text-video-plus/route.ts`
- `components/settings/AiMediaBenchmarkPanel/AiMediaBenchmarkPanel.tsx`
- `components/settings/AiMediaBenchmarkPanel/TextVideoRoundSection.tsx`
- `components/settings/AiMediaBenchmarkPanel/CombinedRoundSection.tsx`
- `.env.example`, `package.json`
- `scripts/check-ai-media-benchmark.ts`, `scripts/check-ai-media-benchmark-text-video.ts`, `scripts/check-runway-text-to-video.ts`

### Migrace

Žádná. `settings.generationMode` a `case_id` stačí. 038–040 se neměnily. 041 nevznikla.

### Testy

| Sada | Výsledek |
| --- | --- |
| `check:ai-media-benchmark-text-video` | **20 passed**, 0 reálných `fetch` |
| `check:runway-text-to-video` | **6 passed** (mock HTTP, žádné placené volání) |
| `check:ai-media-benchmark` | **70 passed**, 0 reálných `fetch` |
| `check:runway-image-to-video` | **23 passed** |
| Kolo A+ regrese | součástí `check:ai-media-benchmark` (včetně výběru T2V clipu) |
| `check:audio-mix` | **19 passed** (FFmpeg; jedno SFX měření jednou zafailovalo a při opakování prošlo — bez změny mixeru) |
| `tsc --noEmit` | passed |
| eslint změněných souborů | passed |

### Blockery před prvním placeným text-to-video testem

1. Ručně zapnout **jen** `AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED=true` (teď je false).
2. Mít `RUNWAYML_API_SECRET`.
3. V UI potvrdit jeden placený request a `maxCostUsd`.
4. Vybrat projekt (chybějící barvy/obor = fallback, ne falešná identita).
5. Spouštět **jeden** model. Další až po hodnocení.
6. Kolo T+ nespouštět — kontrakt referencí ještě není implementovaný.
7. Produkční `SCENE_VIDEO_GENERATION_ENABLED` a render `still` nechat jak jsou.

### Jednoznačné potvrzení

- **Neproběhlo žádné placené volání.** Offline checky i adapter testy používají fakes / mock HTTP. Globální `fetch` v benchmark checkách je zakázaný.
- **Všechny nové flagy zůstaly vypnuté.** `AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED` default `false`, v `.env.example` zakomentované `=false`. I2V/voice/sound flagy se nezapínaly.
- **Produkční workflow zůstalo beze změny.** Default render `still`, `SCENE_VIDEO_GENERATION_ENABLED=false`, produkční TTS OpenAI, AI-video plán `gen4_turbo`, žádný T2V v job runneru.

## Kontrola a opravy Kola T 12D

Datum: **2026-08-19**  
Placená volání: **žádná**  
Flagy: **nezapínány**  
Migrace 038–040: **beze změny**  
Nová migrace 041: **není potřeba** (`settings` stačí pro snapshot i kanonický vstup)  
Produkční workflow / TTS / `still` / AI-video routing: **beze změny**

Cíl: Kolo T nesmí při opakovaném `client_request_id` tiše pokračovat s jinými vstupy a tři modely stejného case musí sdílet jeden uzamčený prompt.

### Nalezené chyby

1. **Idempotence bez identity vstupu.** `insertRun` našel řádek podle `client_request_id` a předal ho do `submitPaidCreate`. Stejné ID s jiným projektem, modelem, promptem, rozpočtem nebo zdrojem I2V/voice/sound mohlo pokračovat k provider POST, nebo naopak přeskočit POST pro cizí request. Platilo to i po unique konfliktu `23505`.
2. **Kolo T přepočítávalo prompt.** Druhý model skládal prompt z aktuálního Product Brainu. Změna projektu mezi prvním a druhým modelem by rozbila srovnání. Prompt z prohlížeče se stejně nesměl stát zdrojem pravdy.
3. **Chyběl lock UX.** UI neříkalo, že první model uzamkne prompt a profil, ani který model snapshot vytvořil. Změna scénické myšlenky v existujícím `case_id` by přepsala srovnání.

### Způsob kanonického porovnání vstupů

Jeden sdílený kanonický objekt `CanonicalPaidBenchmarkInput` v `lib/ai-media-benchmark/requestIntegrity.ts`. Používají ho všechny placené Benchmark Lab create cesty (I2V, T2V, voice, sound) přes `insertRun`.

Porovnání je deterministické (`stableSerialize` + numerická rovnost) a bere **request-time** hodnoty z `settings`, ne runtime sloupce po OpenAI TTS (`duration_seconds`, `estimated_cost_usd` po syntéze).

Povinná pole: project ID, test type, generation mode, provider, model, case ID, duration, ratio, generateAudio, promptText, sceneIdeaId, BrandVisualProfile, odhad ceny, max rozpočet, I2V zdroj (job / scene / image), voice candidate + text, sound candidate + prompt + délka.

Neshoda → `benchmark_request_input_mismatch`. **Žádný provider POST.**

### Chování při opakovaném `client_request_id`

| Situace | Chování |
| --- | --- |
| Stejné ID, stejné vstupy | Reuse řádku. `submitPaidCreate` dál: nejvýše jeden POST. Active claim / už odeslaný task se znovu nePOSTuje. |
| Stejné ID, jiné vstupy | `benchmark_request_input_mismatch` před POSTem. |
| Souběžný insert + `23505` | Načte raced řádek a spustí **stejnou** shodu. Neshoda → mismatch, 0 POST navíc. |
| `created` / `submitting` | Shoda může dokončit submit (nebo počkat na claim). Neshoda nikdy nePOSTuje. |
| Po dokončení | Shoda vrátí existující výsledek. Neshoda → mismatch. |
| `submission_unknown` | Po shodě identity **stále** `submission_unknown`. Nikdy automatický druhý POST. |

### Způsob uzamčení společného promptu

Snapshot žije v `ai_media_benchmark_runs.settings` prvního T2V runu daného `project_id` + `case_id`. Nová tabulka ani migrace 041 nejsou potřeba.

`resolveRoundTCaseSnapshot`:

- žádný T2V run → složí prompt a BrandVisualProfile z aktuálních projektových dat;
- existující runy se stejným fingerprintem (prompt, sceneIdeaId, coreIdea, profil, 4 s, `720:1280`) → další model **musí** použít tento snapshot, ne live Product Brain a ne prompt z prohlížeče;
- jiný `sceneIdeaId` ve stejném case → `round_t_scene_idea_locked`;
- více různých fingerprintů → `round_t_case_snapshot_conflict` (nic se nehádá).

Lišit se smí jen model, cena a modelové audio parametry. Nová scénická myšlenka = nové Kolo T s novým `case_id`.

### Chování při změně projektových dat

Po uzamčení snapshotu změna Product Brainu / barev / oboru **nezmění** prompt dalších modelů stejného case. Nový case může složit nový snapshot z aktuálních dat.

### UI

- první model uzamkne prompt a vizuální profil;
- další modely používají tentýž snapshot;
- je vidět, který model snapshot vytvořil;
- je vidět přesný uzamčený prompt;
- scénická myšlenka je po locku disabled;
- tlačítko **Nové Kolo T s novým case_id** existující srovnání nepřepisuje.

Kolo A+ bere succeeded video clipy bez filtru na default `text-to-video-scene-t`, aby šly vybrat i nové case_id.

### Testy

Offline, bez sítě a bez placených volání:

- stejné ID + jiný model / prompt / projekt / rozpočet → mismatch, 0 POST;
- souběžný insert s jinými vstupy → mismatch, nejvýše jeden POST;
- stejné vstupy → nejvýše jeden POST (`created` i po dokončení);
- druhý model dostane přesně prompt prvního;
- změna Product Brainu snapshot nezmění (uzamčený BrandVisualProfile i prompt; live preview nového case už vidí nový profil);
- jiná scene idea ve stejném case se odmítne;
- nový case vytvoří nový snapshot;
- konfliktní snapshoty se odmítnou;
- I2V / voice / sound idempotence zůstává a mismatch na změněných vstupech funguje;
- `submission_unknown` se automaticky neopakuje;
- produkce `still`, `SCENE_VIDEO_GENERATION_ENABLED=false`, plán `gen4_turbo`.

| Sada | Výsledek |
| --- | --- |
| `check:ai-media-benchmark-text-video` | **33 passed**, 0 reálných `fetch` |
| `check:ai-media-benchmark` | **73 passed**, 0 reálných `fetch` |
| `check:runway-text-to-video` | **6 passed** |
| `check:runway-image-to-video` | **23 passed** |
| `check:audio-mix` | **19 passed** |
| `tsc --noEmit` | passed |
| eslint změněných souborů | passed |

### Je Kolo T bezpečné pro první placený běh?

**Pro input integrity a sdílený prompt: ano, po ručním zapnutí flagu.** Opakované `client_request_id` s jinými vstupy už nemůže odeslat provider POST. Tři modely stejného case sdílejí serverový snapshot.

Pořád platí blockery z Kola T: flag default `false`, `RUNWAYML_API_SECRET`, explicitní potvrzení a `maxCostUsd`, jeden model na spuštění, T+ nespouštět, produkci neměnit.

Tento krok **neprováděl** placená volání, **nezapínal** flagy a **neměnil** produkční workflow.

---

## Kontrola a opravy Kola T 12E – atomic case snapshot

### Původní race condition

`resolveRoundTCaseSnapshot` (12D) hledal existující T2V runy v `ai_media_benchmark_runs`.  
Pokud přišly dva první požadavky se stejným `project_id + case_id` souběžně, oba mohly:

1. vidět prázdnou sadu runů,
2. nezávisle zkompilovat snapshot z aktuálních dat projektu,
3. každý vložit vlastní run,
4. každý odeslat placený provider POST.

Konflikt se zjistil až zpětně – nebo vůbec ne. Systém tak mohl odeslat dva různé prompty ke dvěma různým providerům pro jeden a tentýž `case_id`.

### Databázové řešení

Nová tabulka `ai_media_benchmark_round_t_cases` s atomickým unique constraintem:

```sql
constraint ai_media_benchmark_round_t_cases_project_case_key
  unique (project_id, case_id)
```

Tabulka ukládá autoritativní snapshot:
- `prompt_text`, `scene_idea_id`, `core_idea`, `brand_visual_profile`, `duration_seconds`, `ratio`
- `fingerprint` – deterministický hash všech šesti polí (přes `stableSerialize`)
- `locked_by_run_id`, `locked_by_model` – atribuce prvního runu
- `created_at`, `updated_at`, RLS (`owns_project`), full grant pro `service_role`

### Migrace 041 a její aplikování

Soubor: `supabase/migrations/041_ai_media_benchmark_round_t_cases.sql`

- Migrace neupravuje tabulky 038–040.
- Obsahuje RLS politiky totožné s ostatními benchmarkovými tabulkami.
- Aplikována v rámci 12E (dosud nebyla spuštěna žádná placená Kola T).

### Průběh dvou souběžných prvních requestů

1. Oba requesty zavolají `resolveRoundTCaseSnapshot`.
2. Oba načtou `ai_media_benchmark_round_t_cases` a nenajdou nic.
3. Oba zkompilují candidate snapshot ze serverových dat projektu.
4. Oba se pokusí o `INSERT INTO ai_media_benchmark_round_t_cases`.
5. Databáze dovolí právě jeden insert – druhý dostane `error.code === "23505"`.
6. Poražený request načte vítěznou řádku a porovná `scene_idea_id`:
   - Shoduje se → použije vítězný snapshot, pokračuje (idempotentní vytvoření runu).
   - Liší se → vyhodí `round_t_scene_idea_locked`, žádný provider POST.
7. Žádný provider POST nenastane dříve, než je autoritativní case snapshot v DB.

### Fingerprint guard před provider POSTem

`submitPaidCreate` dostane `prepare()` callback, který:

1. Znovu načte autoritativní case snapshot z DB.
2. Porovná `authoritative.fingerprint` s `row.settings.snapshotFingerprint`.
3. Neshoda → vyhazuje `round_t_snapshot_fingerprint_mismatch`, POST se neprovede.

Fingerprint je uložen i v `settings` každého T2V runu (`caseSnapshotId`, `snapshotFingerprint`).

### Existující data (migrační cesta)

- Prázdná tabulka: první přístup vytvoří snapshot z aktuálního projektu.
- Konzistentní staré T2V runy (12D data): jsou agregovány jako `oldCandidate`, atomicky vloženy do nové tabulky.
- Konfliktní staré T2V runy: funkce `migrateFromOldRuns` detekuje více unikátních fingerprintů a vyhodí `round_t_case_snapshot_conflict` – žádný provider POST.

### Výsledky testů

| Sada | Prošlo |
|---|---|
| `check:ai-media-benchmark-text-video` | **44 / 44** |
| `check:ai-media-benchmark` | **73 / 73** |
| `check:runway-text-to-video` | **6 / 6** |
| `check:runway-image-to-video` | **23 / 23** |
| `check:audio-mix` | **19 / 19** |
| `tsc --noEmit` | ✅ bez chyb |
| `eslint` (změněné soubory) | ✅ bez chyb |

12E testy pokrývají: souběžné první requesty (stejná i různá scénická myšlenka), unique conflict, fingerprint guard, Product Brain změna po founded case, nový `case_id`, konfliktní staré runy, idempotence `client_request_id`.

### Stav migrace 041 na remote Supabase

**Migrace nebyla aplikována před krokem 12E — aplikována nyní (v rámci tohoto ověření).**

Verifikace provedena přes Supabase MCP (`list_migrations`, `apply_migration`, `execute_sql`):

| Kontrola | Výsledek |
|---|---|
| Tabulka `public.ai_media_benchmark_round_t_cases` | ✅ existuje |
| Unique constraint `(project_id, case_id)` | ✅ `ai_media_benchmark_round_t_cases_project_case_key` |
| Všechny snapshot sloupce | ✅ `prompt_text`, `scene_idea_id`, `core_idea`, `brand_visual_profile`, `duration_seconds`, `ratio`, `fingerprint` |
| Atribuční sloupce | ✅ `locked_by_run_id`, `locked_by_model` |
| FK → `projects(id) ON DELETE CASCADE` | ✅ |
| FK → `ai_media_benchmark_runs(id) ON DELETE SET NULL` | ✅ |
| RLS zapnuto | ✅ `relrowsecurity = true` |
| Policy SELECT (authenticated) | ✅ `owns_project(project_id)` |
| Policy INSERT (authenticated) | ✅ `owns_project(project_id)` |
| Policy UPDATE (authenticated) | ✅ `owns_project(project_id)` s USING i WITH CHECK |
| Grants `service_role` | ✅ SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE |
| `anon` / `authenticated` grants | ✅ žádné (REVOKE aplikován) |
| Trigger `set_ai_media_benchmark_round_t_cases_updated_at` | ✅ BEFORE UPDATE |
| Duplicitní `(project_id, case_id)` | ✅ 0 řádků, 0 párů (tabulka prázdná, žádný konflikt) |

### Databázové blokery

**Žádné.** Tabulka existuje, je správně zabezpečena a prázdná. Unique constraint zabrání race condition při prvním placeném Kole T.

### Definitivní nasazení Benchmark Labu

**Ano, Benchmark Lab lze nasadit a přejít k placeným testům.**

Zbývající podmínky (databázové blokery odstraněny):
1. ~~Migrace 041~~ – **aplikována** ✅
2. Feature flag `AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED=true` se nastaví v prostředí před prvním placeným testem.
3. API klíče providerů (Runway, Veo, Seedance) musí být v secrets.

Každý `project_id + case_id` má jeden autoritativní snapshot v DB, každý placený POST je chráněn fingerprint guardem a client-request idempotencí.

Tento krok **neprováděl** placená volání, **nezapínal** flagy a **neměnil** produkční workflow.

---

## Jednotný benchmark case před prvním placeným během (Step 12F)

### Původní problém

Kolo A zobrazovalo v dropdownu „Testovací scéna" všechny produkční scény projektu pouze pod názvy `scene-1`, `scene-2` atd. Uživatel neví, co vybírá. Produkční scény se navíc liší mezi projekty a nelze garantovat, že dvě volání se stejným `scene-1` mají stejný vstupní obrázek.

### Skutečná příčina

`createVideoBenchmarkRun` přijímalo `(videoJobId, sceneId, motionPrompt)` a resolvovalo vstupní obrázek přes `listRunwayTestScenesForProject` — tedy přímo z produkčních `video_jobs` dat. Nebyl žádný mechanismus pro uzamčení sdíleného kreativního zadání napříč modely.

Proč nelze použít existující `ai_media_benchmark_round_t_cases` (migrace 041)?  
Tabulka 041 je určena výhradně pro T2V (Round T) snapshoty — má sloupce `prompt_text`, `scene_idea_id`, `brand_visual_profile`. I2V potřebuje zcela jiná pole: `source_image_bucket`, `source_image_path`, `motion_intent`, `core_idea`. Sloučení by narušilo jasné oddělení odpovědností a znemožnilo čisté typové ověření.

### Výsledný datový tok

```
Uživatel → UI (vytvoření case)
  → POST /api/admin/ai-media-benchmark/case/upload  (nahraje obrázek do video-renders bucket)
  → POST /api/admin/ai-media-benchmark/case          (acquireBenchmarkCase → atomic INSERT)
       ↓
  ai_media_benchmark_cases (project_id, case_id, core_idea, motion_intent, source_image_bucket, source_image_path, fingerprint)
  [unique constraint (project_id, case_id) zabrání race condition]

Spuštění modelu (Kolo T) → POST /api/admin/ai-media-benchmark/text-video
  → resolveBenchmarkCase (stejné case_id jako Kolo A)
  → resolveRoundTCaseSnapshot(sharedBenchmarkCoreIdea z case)
  → composeTextToVideoPrompt(core_idea z case + BrandVisualProfile)
  → ai_media_benchmark_round_t_cases (atomic T2V prompt snapshot)
  → prepare(): ověření benchmarkCaseFingerprint + snapshotFingerprint
  → post(): provider.createTextToVideo(promptText) — bez source image
```

### Rozdíl mezi kreativním zadáním, I2V promptem a T2V promptem

| Vrstva | Co obsahuje | Odkud pochází |
|---|---|---|
| Shared benchmark case (`ai_media_benchmark_cases`) | `core_idea`, `motion_intent`, `source_image_*` | Vytvořen v Kole A, autoritativní pro Kolo A i Kolo T (stejné `(project_id, case_id)`) |
| I2V provider prompt | `motion_intent` | Přímo z case snapshotu; stejný obrázek pro všechny I2V modely |
| T2V provider prompt | Text z `composeTextToVideoPrompt` | **Stejná `core_idea` z benchmark case** + `BrandVisualProfile`; scénická šablona (`sceneIdeaId`) upravuje jen technickou formulaci děje, ne myšlenku. **Nepoužívá** I2V obrázek ani `motion_intent` jako provider prompt |

Kolo T navíc ukládá atomic snapshot v `ai_media_benchmark_round_t_cases` (041) včetně finálního `prompt_text` a `fingerprint`. V run `settings` jsou `benchmarkCaseId` a `benchmarkCaseFingerprint` pro vazbu na společný case.

**Provider klíče:** Benchmark Lab volá Runway, Veo i Seedance modely dostupné přes Runway API. Stačí **`RUNWAYML_API_SECRET`** — samostatné Veo/Seedance API klíče nejsou potřeba.

### Oprava Step 12F po kontrole implementace

**Nalezené chyby v první verzi 12F:**

1. **Kolo T nečetlo `core_idea` z `ai_media_benchmark_cases`** — `previewTextToVideoBenchmark` / `createTextToVideoBenchmarkRun` stále stavěly myšlenku ze scene idea / projektu. Test „T2V uses same core idea“ byl falešně pozitivní (kontroloval jen ≠ motion intent).

2. **`acquireBenchmarkCase` při 23505** vracel vítěze bez kontroly fingerprintu — odlišné vstupy se tiše ignorovaly.

**Opravy:**

- T2V nejdřív `resolveBenchmarkCase`, pak `resolveRoundTCaseSnapshot` s `sharedBenchmarkCoreIdea`.
- Default `case_id` pro Kolo T = stejný jako Kolo A (`portrait-scene-a`).
- Před POST: `benchmarkCaseFingerprint` + Round T `snapshotFingerprint`.
- `acquireBenchmarkCase`: při 23505 mismatch → `benchmark_case_input_mismatch`.
- UI Kola T načítá benchmark case z API; bez case zobrazí instrukci (nesdílí case falešně).

**Migrace 043:** nevznikla — vazba přes stejné `(project_id, case_id)` v tabulkách 042 a 041 + sloupce v run `settings` stačí.

### Databázové změny

**Migrace 042** (`supabase/migrations/042_ai_media_benchmark_cases.sql`):

```sql
create table if not exists public.ai_media_benchmark_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  case_id    text not null,
  core_idea    text not null,
  motion_intent text not null,
  source_image_bucket text not null,
  source_image_path   text not null,
  fingerprint text not null,
  locked_by_run_id uuid null references public.ai_media_benchmark_runs(id) on delete set null,
  locked_by_model  text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_media_benchmark_cases_project_case_key
    unique (project_id, case_id)
);
```

RLS zapnuto, policies pro `authenticated` přes `owns_project(project_id)`, `service_role` má plný přístup.

**Stav remote migrace:**

| Kontrola | Výsledek |
|---|---|
| Tabulka `public.ai_media_benchmark_cases` | ✅ existuje |
| Unique constraint `(project_id, case_id)` | ✅ `ai_media_benchmark_cases_project_case_key` |
| Sloupce `core_idea`, `motion_intent`, `source_image_bucket`, `source_image_path`, `fingerprint` | ✅ |
| FK → `projects(id) ON DELETE CASCADE` | ✅ |
| FK → `ai_media_benchmark_runs(id) ON DELETE SET NULL` | ✅ |
| RLS zapnuto | ✅ `relrowsecurity = true` |
| Policies SELECT/INSERT/UPDATE | ✅ |
| `service_role` grants | ✅ |
| `anon` / `authenticated` přímé granty | ✅ žádné (REVOKE aplikován) |
| Trigger `set_ai_media_benchmark_cases_updated_at` | ✅ BEFORE UPDATE |

### Testy

| Suite | Výsledek |
|---|---|
| `check:ai-media-benchmark` | 84 passed |
| `check:ai-media-benchmark-text-video` | 55 passed |
| `check:runway-image-to-video` | 23 passed |
| `check:runway-text-to-video` | 6 passed |
| `tsc --noEmit` | OK |

Klíčové nové/offline scénáře (T2V + case):

1. Kolo T načte `core_idea` přesně z `ai_media_benchmark_cases`.
2. Změna Product Brain po vytvoření case nezmění T2V core idea / prompt snapshot stejného case.
3. T2V prompt obsahuje sdílenou core idea (ne katalogovou default).
4. T2V prompt ≠ I2V motion intent; T2V request nemá source image.
5. Fingerprint společného case + Round T snapshot před POST; corrupt fingerprint zastaví T2V.
6. `benchmark_case_input_mismatch` pro stejné `case_id` + jiná core idea / motion / image path.
7. Identické vstupy → safe reuse; souběžné inserty → jeden vítěz; souběžně různé → mismatch.
8. Kolo A: bez produkčních scén, I2V sdílený obrázek, canonical mismatch, submission_unknown.

### Blockery

**Žádné.**

- Migrace 042 aplikována na remote ✅
- Feature flagy `AI_MEDIA_BENCHMARK_VIDEO_ENABLED` a `AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED` se nastaví před prvním placeným testem
- **`RUNWAYML_API_SECRET`** v prostředí (Veo/Seedance benchmark modely jdou přes Runway API)
- Produkční workflow nezměněno

### Potvrzení

Tento krok **neprováděl** placená volání, **nezapínal** flagy a **neměnil** produkční workflow.

Benchmark Lab je bezpečný pro první placený test.

---

## Step 12F final hardening – immutable source image

**Datum:** 2026-08-19  
**Placená volání:** žádná

### Příčina

Při kontrole kódu před prvním placeným testem byly nalezeny tři kritické problémy:

1. **`newCase()` bylo nefunkční:** Funkce vymazala pouze UI stav, ale `createCase()` vždy používala `DEFAULT_VIDEO_CASE_ID`. Tlačítko „Nové Kolo A s novým case" tedy nikdy nevytvořilo nový case — to by vedlo k záznamu se stejným `case_id` a potenciálnímu `benchmark_case_input_mismatch` erroru.

2. **Fyzický obrázek bylo možné přepsat:** Cesta v Storage byla odvozena pouze z `projectId` + `caseId` (pevná hodnota). Nový upload pro stejné `case_id` tak mohl přepsat fyzický soubor. DB fingerprint přitom obsahoval pouze bucket/path — nikoli obsah. Case pak vypadal nezměněně, ale I2V modely by dostaly jiný obrázek bez jakéhokoli varování.

3. **Tlačítko „Nové Kolo T s jiným case_id" bylo nefunkční:** Nastavilo lokální `caseId` state, ale `useEffect` načítal natvrdo `DEFAULT_VIDEO_CASE_ID` a `caseId` nebyl dependency. Tlačítko tedy fungiovalo jako placebo.

### Přesné řešení

#### A – Cleanup UI (Round A + Round T)

- Odstraněna funkce `newCase()` z `AiMediaBenchmarkPanel.tsx`.
- Odstraněno tlačítko „Nové Kolo A s novým case".
- Odstraněna funkce `newRoundTCaseId()` z `TextVideoRoundSection.tsx`.
- Odstraněno tlačítko „Nové Kolo T s jiným case_id".
- Mutable `caseId` state nahrazen konstantou `DEFAULT_VIDEO_CASE_ID`.
- Lockový text upraven na: „Tento projekt používá jeden uzamčený benchmark case. Slouží ke srovnání všech modelů se stejnými vstupy."

#### B – Fyzická neměnnost obrázku

- **Storage cesta** rozšířena o náhodné UUID: `{projectId}/ai-media-benchmark/cases/{caseId}/{imageUuid}/source.{ext}`. Každý upload má unikátní cestu — přepsání je fyzicky nemožné.
- **`upsert: false`** — Supabase Storage odmítne zápis pokud cesta existuje (nemělo by nastat díky UUID, ale jako druhá vrstva jistoty).
- **Upload route odmítne požadavek před zápisem do Storage** pokud `(projectId, caseId)` již existuje v `ai_media_benchmark_cases`. Implementováno voláním `loadBenchmarkCase` před `storage.upload`, vrácení HTTP 409 při konfliktu.
- **SHA-256 obrázku** počítán serverem (`crypto.subtle.digest`) a uložen v DB (`source_image_sha256`, migrace 043). Zahrnut do fingerprintu.
- **Fingerprint** nyní zahrnuje `sourceImageSha256` — jakákoli změna obsahu obrázku změní fingerprint, i kdyby bucket/path zůstaly stejné.
- **Upload route vrací `{ bucket, path, sha256, imageUuid }`** — UI předává vše do case API.
- **Pre-POST fingerprint guard** pro I2V i T2V nyní počítá `caseFp` s `sourceImageSha256` z načtené case row. Pokud by obsah obrázku nebyl konzistentní s DB, fingerprint nesouhlasí a provider POST je zablokován.

#### C – Migrace 043

Nová migrace `043_benchmark_case_image_sha256.sql` přidává:
- `source_image_sha256 text null` — hex SHA-256 nahraného souboru
- `source_image_uuid text null` — UUID v storage cestě

Aplikovaná na remote Supabase a ověřena přes `information_schema.columns`.

### Změněné soubory

| Soubor | Změna |
|---|---|
| `supabase/migrations/043_benchmark_case_image_sha256.sql` | NOVÝ – přidává SHA-256 a UUID sloupce |
| `lib/api/storage.ts` | `buildBenchmarkCaseImagePath` nyní vyžaduje `imageUuid` parametr |
| `lib/ai-media-benchmark/benchmarkCase.ts` | `BenchmarkCase`, `BenchmarkCaseRow`, `benchmarkCaseFingerprint` rozšířeny o SHA-256 a UUID; `acquireBenchmarkCase` přijímá a ukládá tyto hodnoty |
| `app/api/admin/ai-media-benchmark/case/upload/route.ts` | SHA-256 výpočet, UUID cesta, `upsert: false`, pre-upload rejection pro existující case |
| `app/api/admin/ai-media-benchmark/case/route.ts` | Přijímá a předává `sourceImageSha256`, `sourceImageUuid` |
| `lib/ai-media-benchmark/service.ts` | `CreateBenchmarkCaseInput` + `BenchmarkCasePublicView` rozšířeny o SHA-256; `benchCaseFp` výpočet v I2V a T2V guards zahrnuje SHA-256 |
| `components/settings/AiMediaBenchmarkPanel/AiMediaBenchmarkPanel.tsx` | Odstraněna `newCase()`, odstraněno tlačítko, přidáno `sha256`/`imageUuid` do case API requestu |
| `components/settings/AiMediaBenchmarkPanel/TextVideoRoundSection.tsx` | Odstraněna `newRoundTCaseId()`, odstraněno tlačítko, `caseId` state nahrazen konstantou |
| `scripts/check-ai-media-benchmark.ts` | 7 nových testů pro hardening, aktualizován pre-seed + `seedBenchmarkCase` |
| `scripts/check-ai-media-benchmark-text-video.ts` | 2 nové testy, aktualizován pre-seed + `seedSharedBenchmarkCase` |

### Testy

- `check:ai-media-benchmark`: **92 passed, 0 failed**
- `check:ai-media-benchmark-text-video`: **57 passed, 0 failed**
- `check:runway-image-to-video`: **23 passed, 0 failed**
- `check:runway-text-to-video`: **6 passed, 0 failed**
- `tsc --noEmit`: **clean**
- `eslint` všechny změněné soubory: **0 errors, 0 warnings**

Nové testy (check:ai-media-benchmark):
1. Case snapshot obsahuje `source_image_sha256`
2. Fingerprint se změní při změně SHA-256 (bucket/path stejné)
3. Fingerprint se liší pro null vs non-null SHA-256
4. Druhý insert s jiným SHA-256 → `benchmark_case_input_mismatch`
5. Druhý insert s identickým SHA-256 → bezpečné vrácení existující case
6. I2V pre-POST guard s SHA-256 — tampered fingerprint blokuje provider POST
7. Kolo A i Kolo T používají `DEFAULT_VIDEO_CASE_ID`
8. Migrace 043 existuje se sloupci `source_image_sha256` a `source_image_uuid`

Nové testy (check:ai-media-benchmark-text-video):
1. T2V pre-POST guard se SHA-256 — tampered fingerprint blokuje T2V provider POST
2. Kolo A i T používají stejné pevné case ID

### Remote stav

Migrace 043 aplikována. Ověřeno přes `information_schema.columns`:
- `source_image_sha256 text nullable` ✓
- `source_image_uuid text nullable` ✓

### Potvrzení

Tento krok **neprováděl** placená volání, **nezapínal** flagy a **neměnil** produkční workflow.

**Lze fyzický obrázek existujícího case přepsat?** Ne.
- Upload route odmítne HTTP 409 před zápisem do Storage pokud case existuje.
- Každý upload používá unikátní UUID v cestě — přepsání stávající cesty je tedy fyzicky nemožné i bez DB kontroly.
- `upsert: false` zajišťuje odmítnutí na Storage vrstvě jako třetí záchrana.
- SHA-256 obsahu je v DB a ve fingerprintu — i kdyby se obsah souboru na Storage lišil, pre-POST guard to odhalí.

**Blocker:** žádný. Benchmark Lab je bezpečný pro první placený test.

## Step 12F API integrity closure

Aplikační vrstva nyní uzavírá mezeru, kterou šlo obejít přímým POSTem na `case` API. `createBenchmarkCase` povinně vyžaduje validní `source_image_sha256` (64 hex), validní `source_image_uuid` (UUID), bucket přesně `video-renders` a storage path přesně odpovídající `buildBenchmarkCaseImagePath(projectId, caseId, sourceImageUuid, filename)`. `null`, prázdné a neplatné hodnoty jsou odmítnuty stabilními chybami `source_image_sha256_required`, `source_image_sha256_invalid`, `source_image_uuid_required`, `source_image_uuid_invalid`, `source_image_bucket_invalid` a `source_image_path_invalid`.

Stejná integritní kontrola se používá i při použití existujícího shared benchmark case. I2V `createVideoBenchmarkRun` i T2V `previewTextToVideoBenchmark` / `createTextToVideoBenchmarkRun` odmítnou starý nebo ručně poškozený case s chybou `benchmark_case_image_integrity_invalid` ještě před jakýmkoli provider POSTem. Tím je zajištěno, že case bez SHA/UUID nebo s neplatnou immutable identitou nemůže vzniknout ani spustit placené volání.

## Incident – Seedance 2.0 Fast první placený test

### Přesný run a čas
- `run_id`: `48c2bc11-00e5-4a83-aa52-8b5cc955d060`
- `project`: `fenrik Studio` (`project_id`: `163c1822-ad30-4cee-8826-dfacd9c188b9`)
- `case_id`: `portrait-scene-a`
- `test_type`: `video` (Kolo A, image-to-video)
- `model`: `seedance2_fast`
- `status`: `failed`
- `created_at`: `2026-08-19 12:25:29.402387+00`
- `completed_at`: `2026-08-19 12:25:43.486+00`
- `estimated_credits/cost`: `116` cr / `$1.16` (viz `estimated_credits`, `estimated_cost_usd`)

### Fáze selhání
- **Fáze: provider task vznikl, ale provider ho označil `FAILED` kvůli blocku v input preprocessing moderaci.**
- Konkrétně odpovídá typu: **(4) provider task vznikl, ale provider ho označil FAILED**, s kořenovým důvodem v **(10) provider moderation/ safety pipeline**.

### Provider task ID
- `provider_task_id`: **ano** (`2ae0c72d-ce21-4040-972f-5eab4026f4d7`)

### Přesná (bezpečně očištěná) chyba
- `error_message`: `Your request was blocked by this model provider's content moderation system.`
- `failure_code`: `INPUT_PREPROCESSING.SAFETY.THIRD_PARTY`

### Zda provider POST proběhl
- **Ano, pravděpodobně provider create POST proběhl a vytvořil task**, protože `provider_task_id` byl u runu uložen.
- V lifecycle (`submitPaidCreate`) se `provider_task_id` zapisuje do DB až po úspěšném `createImageToVideo()` provider callu, takže blokace nastala **po vytvoření tasku** (resp. v rámci provider pipeline).

### Spotřeba kreditů – lze potvrdit?
- **Nelze potvrdit skutečně realizovanou spotřebu** (DB ukládá pouze `estimated_credits/estimated_cost_usd`).
- Pro účely fairness porovnání lze uvést pouze očekávaný budget: `116 cr / $1.16`.

### Kořenová příčina
- **Runway `seedance2_fast` content moderation** (input preprocessing) zablokoval požadavek z důvodu `THIRD_PARTY` safety.
- Kontext requestu (uložený v `ai_media_benchmark_runs.settings` pro tento run):
  - `coreIdea`: `Two colleagues review a content plan on a laptop...`
  - `motionIntent` / `motionPrompt`: `Subtle handheld camera push-in...`
  - `durationSeconds = 4`
  - `ratio = 720:1280`
  - `generateAudio = true`
  - `generationMode = image_to_video`
  - `promptImage` pro `seedance2_fast` se skládá jako pole se start frame (`position: "first"`) (adapter `lib/ai/runwayImageToVideoBody.ts`).

### Je chyba v našem kódu, provideru nebo nejasná?
- **Zjevně provider-side (moderation/safety pipeline).**
- Adapter kontrakt pro `seedance2_fast` byl konzistentní s naším verified katalogem a s request builderem:
  - `model: seedance2_fast`
  - `promptImage: [{ uri, position: "first" }]`
  - `promptText: motionPrompt`
  - `duration: 4`
  - `ratio: 720:1280`
  - `audio: true`
- Navíc **stejný case_id** (`portrait-scene-a`) selhal pouze na `seedance2_fast`, zatímco:
  - `gen4_turbo` succeeded
  - `gen4.5` succeeded
  - `veo3.1_fast` succeeded
  Což snižuje pravděpodobnost chyby v našem request kontraktu.

### Provedená oprava
- **Žádná oprava nebyla provedena.** Příčina je moderace providerem (`INPUT_PREPROCESSING.SAFETY.THIRD_PARTY`).

### Testy
- `check:runway-image-to-video`: 23 passed, 0 failed (offline; bez reálných `fetch`)
- `check:ai-media-benchmark`: 102 passed, 0 failed (offline; bez reálných `fetch`)
- `check:ai-media-benchmark-text-video`: 59 passed, 0 failed (offline; bez reálných `fetch`)
- `tsc --noEmit`: passed
- `eslint`: nebylo cílené na změněné soubory; `npm run lint` selhal kvůli existujícím chybám v repu (incident editoval jen tento markdown).

### Bezpečný další krok
- **Nespouštět další `seedance2_fast` na stejném locked image inputu**, protože error je deterministicky “blocked by moderation” pro tento source.
- Další bezpečný pokus je vytvořit **nový `case_id`** se stejným `coreIdea/motionIntent` a stejnými technickými parametry, ale s jiným zdrojovým testovacím obrázkem (aby se odstranil `THIRD_PARTY` trigger v provider moderaci).

### Potvrzení, že vyšetřování neposlalo nový placený POST
- Ano: vyšetřování proběhlo jen přes **read-only dotazy** do Supabase (a read-only čtení lokálního kódu).
- Při vyšetřování nebyl proveden žádný `create` POST do Runway API.
