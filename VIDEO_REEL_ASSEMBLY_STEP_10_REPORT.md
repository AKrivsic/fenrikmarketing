# VIDEO_REEL_ASSEMBLY_STEP_10_REPORT

Datum: 2026-08-18

## 1. Současný datový tok (render spec → voiceover → titulky → render)

### Still-image produkční cesta (`video-worker/jobRunner.ts`)

1. **Vstup jobu** — `WorkerPayload` / content package: `voiceover_text`, volitelné `subtitles`, scény (`image_prompt`, délky, …).
2. **Render spec (input)** — `buildRenderSpecFromJobInput()` sestaví `RenderSpec` (`renderSchema`: scény + voiceover text + volitelné subtitles string).
3. **TTS** — `generateValidatedVoiceover()` → lokální MP3 + měřená délka řeči.
4. **Volitelný SFX overlay** — `maybeMixVoiceWithSfx()` může upravit audio před renderem (programmatic SFX z job inputu).
5. **Storyboard** — `buildStoryboard()` rozloží scény podle délky voiceoveru (+ tail buffer `TAIL_BUFFER_SECONDS`).
6. **Still render** — scene images → `renderMp4()` (Ken Burns / image path) s voiceover MP3, volitelně burned subtitles (phrase cues / proportional fallback).
7. **Upload** — `uploadVideoArtifact()` → `video-renders/{project}/{job}/output.mp4`, `thumbnail.png`, `subtitles.srt`.
8. **Persist** — `video_jobs.output.render_spec` jako **`RenderSpecOutput`** (verze 1): scény s `image_bucket` + `image_path`, volitelně `motion_prompt`, `transition_in`, metadata; **bez** `voiceover_text` v tomto objektu (voiceover zůstává v job input / samostatných artefaktech).

### Nová clip cesta (Step 6–9, mimo jobRunner)

- **`lib/scene-video-plan`** — dry-run plán z persisted scén (motion, cena, přechody).
- **`lib/scene-video-executor`** — sekvenční executor + attempts (default off, není v jobRunner).
- **`orchestrateVideoClipReel`** — standalone FFmpeg reel z `video_clip` na scénách + lokální VO + mix (`mixAudioLayers`).

Step 10 propojuje **persisted render spec + executor výsledky + existující reel orchestrátor** bez změny jobRunneru.

## 2. Co bylo znovu použito

| Komponenta | Účel |
| --- | --- |
| `renderSpecOutputSchema` / `persistedSceneSchema` | Validace zdrojového render spec |
| `buildSceneVideoGenerationPlanFromRenderScenes` | Fáze A — plán a cena (dry-run) |
| `ExecuteSceneVideoPlanResult` | Fáze B — vstup z executoru |
| `sceneVideoClipSchema` + `validateDurableStorageIdentity` | Clip identita |
| `orchestrateVideoClipReel` | Fáze C — FFmpeg + audio mix + thumbnail |
| `createLocalFixtureDownloader` | Offline testy bez Supabase |
| `buildVideoRenderPath` / `STORAGE_BUCKETS.videoRenders` | Konvence upload helperu (injektovaný) |
| `TAIL_BUFFER_SECONDS`, `resolveClipSceneTransition` | Stejná timeline / přechody jako clip reel |

## 3. Struktura nové služby (`lib/video-reel-assembly/`)

| Modul | Fáze | Popis |
| --- | --- | --- |
| `prepareVideoReelAssembly` | **A** | Parse render spec, scene-video plán, dostupnost VO/SRT/music refs — **žádný Runway, žádné attempts** |
| `assignSceneVideoClips` / `applyExecutorClipResults` | **B** | Přiřazení klipů podle `sceneId`, manifest — **nemutuje** původní render spec |
| `assembleVideoReel` | **C** | Volá `orchestrateVideoClipReel`, rozšířená diagnostika |
| `uploadVideoReelArtifacts` + `createDefaultVideoReelArtifactUploader` | Upload | Oddělený, DI — testy fake storage |
| `clipReadyRenderManifestSchema` | Kontrakt | Serializovatelný manifest (Zod) |

## 4. Pravidla přiřazení klipů

Executor musí mít `status === "completed"`; každá scéna `reused` nebo `completed` s `clip` + `attemptId`.

Pro každý klip:

- shoda **`sceneId`** (mapa, ne pořadí pole),
- povinné **`generationAttemptId`** (z executor `attemptId`, zapsáno do `video_clip.generation_attempt_id`),
- validní **`sceneVideoClipSchema`** + `validateDurableStorageIdentity`,
- přesně **jeden** klip na scénu render spec,
- **žádná** chybějící / přebývající scéna.

Selhání → `ok: false` s důvodem (`missing_clip_for_scene`, `executor_not_completed`, …). **Žádné částečné video.**

## 5. Clip-ready manifest

`ClipReadyRenderManifest` = `renderSpecOutputSchema` + `assembly`:

- `assembly.voiceover_text` — kopie skriptu pro audit,
- `assembly.subtitles_burn_in_requested` — záměr burn-in (Step 10B),
- volitelné `music` / `ambient` durable refs v manifestu (assembly je nebere od callera),
- `assembly.clipAssignments[]` — `{ sceneId, generationAttemptId, clipBucket, clipPath }`,
- `scenes[]` — kopie persisted scén s povinným `video_clip`.

Validace: `clipReadyRenderManifestSchema`. V Step 10 **neukládáme** do DB.

## 6. Voiceover a titulky

- **Voiceover**: caller předá `voiceoverText` (jako job `voiceover_text`) a pro fázi C **`voiceoverLocalPath`** (lokální MP3/WAV). Chybějící text → `voiceover_missing`. Chybějící soubor při assembly → blocked.
- **Titulky**: volitelný lokální **`subtitlesLocalPath`** (SRT) předán do orchestrátoru — stejný model jako Step 6 (burned subtitles). Production still path také dovoluje chybějící subtitles string; assembly titulky nevyžaduje, diagnostika `subtitlesUsed`.
- **Tail buffer**: orchestrátor používá `TAIL_BUFFER_SECONDS` + VO délku (jako stávající clip reel).

## 7. Hudba, ambient a SFX — co systém reálně má

| Zdroj | Stav |
| --- | --- |
| **Asset Library** (`lib/assets/assetLibraryPresentation`) | Klasifikace **vizuálních** assetů (website capture, upload, …) — **ne** kurátorovaná hudební knihovna |
| **Produkční jobRunner** | Voiceover + volitelný **programmatic SFX** (`mixSfx` / `writeProgrammaticSfxWav`) — ne globální music bed |
| **Reel orchestrátor (Step 6)** | Volitelné **`music` / `ambient`** jako `{ bucket, path }` + mixer — testy používají lokální fixture WAV |
| **Globální licencovaná music pipeline** | **Neexistuje** v repu — žádný automatický výběr tracku |

Step 10:

- assembly **funguje bez** music/ambient (voiceover + scene klipy),
- volitelné refs lze předat do manifestu / `assembleVideoReel` (stejný kontrakt jako orchestrátor),
- **SFX** lze předat jako `AudioMixSfxEvent[]` do fáze C (programmatic / před stažené lokální soubory).

Pro bohatší produkční zvuk chybí: kurátorované music/ambient assety v DB/storage s licencí a job-level výběr.

## 8. Oddělení renderu a uploadu

- **`assembleVideoReel`** — pouze lokální MP4 + thumbnail + `cleanupIntermediates` / `cleanupAll`.
- **`uploadVideoReelArtifacts(uploader, …)`** — samostatný krok; selhání uploadu **nere-renderuje** klipy ani nevolá executor (test 19–20).

## 9. Změněné / nové soubory

- `lib/video-reel-assembly/*` *(new)*
- `scripts/check-video-reel-assembly.ts` *(new)*
- `package.json` — `check:video-reel-assembly`
- `VIDEO_REEL_ASSEMBLY_STEP_10_REPORT.md` *(this file)*

**Nezměněno:** `video-worker/jobRunner.ts`, Runway flag, n8n, veřejné API, DB migrace.

## 10. Výsledky testů

| Check | Výsledek |
| --- | --- |
| `check:video-reel-assembly` | **18 passed** (scénáře 1–22 pokryty v kombinovaných case) |
| `check:scene-video-executor` | 25 passed |
| `check:scene-video-attempts` | 39 passed |
| `check:scene-video-plan` | 19 passed |
| `check:video-reel-orchestrator` | passed |
| `check:audio-mix` | passed |
| `check:video-clip-render` | passed |
| `check:video-sync` | 7 passed |
| `tsc --noEmit` | OK |
| eslint (nové soubory) | OK |

## 11. Runway / remote storage

**Neprovedeno.** Testy: mock executor výsledky, `createLocalFixtureDownloader`, fake uploader. Žádný Runway API, žádný Supabase upload v tomto kroku.

## 12. Produkční cesta

**Beze změny.** `jobRunner` neimportuje `video-reel-assembly`. Výchozí render zůstává still-image pipeline.

## 13. Blockery před produkčním zapojením

1. **Orchestrace v jobRunner** — explicitní fáze: still job → scene-video executor (flag + confirm) → assembly → upload (mimo tento step).
2. **Voiceover source of truth** — `RenderSpecOutput` neobsahuje `voiceover_text`; produkce musí předat text + cestu/ storage ref k existujícímu MP3 z TTS kroku.
3. **Music/ambient** — chybí produktová knihovna a výběr; pouze volitelné bucket/path refs.
4. **Per-scene video generation** — executor stále default off a mimo worker.
5. **Manifest persistence** — volitelné budoucí uložení clip-ready manifestu pro audit/re-render idempotenci.

---

## Kontrola a opravy Step 10B

### 1. Původní chyba manifest schema

`clipReadyRenderManifestSchema` dříve rozšiřovalo `renderSpecOutputSchema`, takže `scenes[]` používalo persisted scény s **volitelným** `video_clip`. Manifest mohl projít validací i jako still-only spec. Step 10B zavádí vlastní `scenes: z.array(clipReadySceneSchema)` s povinným `clipReadyVideoClipSchema` a samostatný `assembly` blok; typ `ClipReadyRenderManifest` odpovídá tomuto striktnímu Zod výstupu.

### 2. Nová cross-field pravidla

`superRefine` (`refineClipReadyManifestIntegrity`) kontroluje: unikátní scene ID, unikátní assignment scene ID, shodný počet scén a assignments, žádný assignment pro neznámou scénu, shoda `clipBucket`/`clipPath` a `generationAttemptId` mezi assignment a `scene.video_clip`, validní storage identitu klipů a audio beds. Ručně pozměněný manifest po buildu je odmítnut.

### 3. Validace attempt ID

`scene_video_generation_attempts.id` je UUID — clip-ready kontrakt používá `isSceneVideoGenerationAttemptUuid` (regex v1–v5) na `video_clip.generation_attempt_id` i na `clipAssignments[].generationAttemptId`. Obecné `sceneVideoClipSchema` zůstává mírnější pro starší cesty. Offline testy používají deterministické UUID (`ATTEMPT_A` / `ATTEMPT_B`, …).

### 4. Pravidla titulků

Pole `assembly.subtitles_present` nahrazeno **`subtitles_burn_in_requested`**: `true` ⇒ assembly vyžaduje platný lokální SRT a předá ho orchestrátoru; `false` ⇒ předaný SRT **zablokuje** assembly (`subtitles_policy_mismatch`). Diagnostika: `subtitlesBurnInUsed` (skutečně spálené titulky).

### 5. Source of truth pro music/ambient

`assembleVideoReel` **nepřijímá** `music` / `ambient` od callera — pouze refs z `manifest.assembly.music` / `ambient` (volitelné gain/loop/fade). Manifest bez beds ⇒ orchestrátor nedostane track. Gain/loop/fade se mapují na `DurableAudioBedRef` orchestrátoru.

### 6. Voiceover provenance

Manifest ukládá **`assembly.voiceover_sha256`** (64 hex, SHA-256 bytes souboru — ne cestu). Při assembly se hash lokálního VO porovná s manifestem; nesoulad ⇒ `voiceover_provenance_mismatch`. Clip-ready manifest vyžaduje hash při `assignSceneVideoClips` / `buildClipReadyManifest` (caller musí hash spočítat z reálného TTS souboru).

### 7. Diagnostika

`VideoReelAssemblyDiagnostics` rozšířeno o `musicRef`, `ambientRef` (skutečné bucket/path předané orchestrátoru nebo `null`), `subtitlesBurnInUsed`, plus stávající orchestrátor pole (`musicUsed`, `sceneAudioUsed`, `sfxCount`, …).

### 8. Výsledky testů

| Check | Výsledek |
| --- | --- |
| `check:video-reel-assembly` | **32 passed** (Step 10 + 10B scénáře 1–20) |
| `check:scene-video-executor` | 25 passed |
| `check:scene-video-attempts` | 39 passed |
| `check:scene-video-plan` | 19 passed |
| `check:video-reel-orchestrator` | passed |
| `check:audio-mix` | passed |
| `check:video-clip-render` | passed |
| `check:video-sync` | passed |
| `tsc --noEmit` | OK |
| eslint (změněné soubory) | OK |

*(Sekce 10 výše uvádí původní Step 10 baseline 18 passed; po 10B je 32 passed.)*

### 9. Produkční cesta

**Beze změny.** `video-worker/jobRunner.ts` neimportuje `video-reel-assembly`. Still-image pipeline beze změny.

### 10. Nulová síťová a placená volání

**Potvrzeno:** žádný Runway request, žádný remote Supabase v `check:video-reel-assembly` ani v nových modulech Step 10B; executor/attempts testy zůstávají offline/mock dle předchozích kroků.
