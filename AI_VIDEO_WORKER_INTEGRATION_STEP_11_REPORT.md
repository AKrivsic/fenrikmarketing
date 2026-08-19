# AI_VIDEO_WORKER_INTEGRATION_STEP_11_REPORT

Datum: 2026-08-18

## 1. Skutečný současný worker lifecycle

1. **Dispatch** — `claim_video_job_for_dispatch` ponechá job `queued` bez lease (`029_video_lease_on_worker_start.sql`).
2. **Worker start** — `runVideoJob` → `claimVideoJobForWorker` (`queued` → `processing` + lease).
3. **Heartbeat** — `setInterval` → `renewVideoJobLease` každých `VIDEO_JOB_HEARTBEAT_INTERVAL_MS`.
4. **Pipeline** — parse payload → `buildRenderSpec` → TTS (+ volitelný SFX) → scene images → storyboard + SRT → **render** → thumbnail → **upload** → `buildRenderSpecOutput` → `persistVideoJobArtifacts` + `sendVideoCallback` completed.
5. **Failure** — failed callback (pokud nejsou durable artifacts); `promoteVideoJobIfArtifactsReady` když upload proběhl.
6. **Retry** — fronta znovu enqueue stejný job; worker může reclaimnout `processing` s expirovaným lease. **Žádný** automatický Runway retry v runneru.
7. **Completed** — callback + volitelně `promote`; review čte `output.mp4_url` / `thumbnail_url` / `subtitle_url`.

## 2. Render-mode kontrakt

Soubor: `lib/video-engine/schemas/videoJobRenderMode.ts`

| Pole (job `input`) | Význam |
| --- | --- |
| `video_render_mode` | Volitelné: `still` (default) \| `ai_video_clips` |
| `ai_scene_video_max_budget_usd` | Povinné pro AI režim — kladné finite USD |
| `ai_scene_video_confirm_paid_run` | Povinné `true` pro AI režim — **explicitní** potvrzení, ne odvozené od API klíče |

Parser: `parseVideoJobRenderOptions()`. Chybějící mode ⇒ `still`. Neznámá hodnota ⇒ validační chyba.

**UI / dispatch zatím nemění joby** — kontrakt je připraven na budoucí opt-in.

## 3. Bod rozdělení still / AI větve

`video-worker/jobRunner.ts` — po společné fázi **TTS, images, storyboard, SRT** (~řádky storyboard + `writeSrtFile`), **před** `renderMp4`:

- `still` → beze změny: `renderMp4` → thumbnail → upload → `buildRenderSpecOutput` → persist + callback.
- `ai_video_clips` → `runAiVideoClipJobPhase` → `finalizeAiVideoClipJob` (staging promotion + persist + callback) → `return` (bez `renderMp4`).

Pro AI job s už hotovým durable outputem: **early idempotent complete** před TTS (`resolveAlreadyCompletedAiVideoJob`).

Validace render options hned po `buildRenderSpec` — špatný mode selže před TTS placenou prací jen pokud by mode byl nevalidní (parsování je levné).

## 4. Checkpoint před provider POSTem

- `buildPersistedRenderSpec` (= exportovaný `buildRenderSpecOutput`) nahraje still PNG refs do Storage a sestaví `RenderSpecOutput` včetně `motion_prompt` / `transition_in`.
- `persistVideoJobArtifacts` uloží merge do `video_jobs.output`:
  - `render_spec` — požadavek attempts služby (`findUsableSceneStill`),
  - `ai_video.phase` = `checkpoint_stills`,
  - **bez** `mp4_url` / `artifacts_persisted_at` — job zůstává `processing`, **nepublikovatelný** jako hotové video (`promote` vyžaduje `mp4_url`).

Žádná nová DB migrace — využití existujícího RPC merge.

## 5. Retry a idempotence (Step 11 + 11B)

| Krok | Chování |
| --- | --- |
| Checkpoint | Pokud `output.render_spec` existuje, **ne** znovu uploadovat stills |
| Fingerprint | SHA-256 kanonického vstupu; mismatch ⇒ `checkpoint_input_mismatch` |
| Executor | Přeskočen, pokud existuje `clip_ready_manifest` (`scene_clips_complete`) |
| Assembly | Přeskočeno, pokud `phase=assembly_complete` + durable staging refs |
| Finální commit | `finalizeAiVideoClipJob`: promotion ze stagingu, **persist musí být true**, teprve pak completed callback |
| Upload / promotion fail | `assembly_complete` zůstává; retry jen promotion + persist |
| Still path | Beze změny |

**Upřesnění (11B):** Samostatný upload helper v assembly testech **nezaručuje** retry celého workeru bez executoru/FFmpeg. Důkaz je v `runAiVideoClipJobPhase` + `check-ai-video-worker-integration-11b.ts` (retry z `scene_clips_complete` / `assembly_complete`).

TTS/images při worker retry se zatím znovu spouštějí (stejně jako dříve u still jobů), kromě early complete s durable AI outputem.

## 6. Lease / heartbeat

- Worker interval heartbeat beze změny.
- Executor: `SceneVideoExecutorDeps.onPollTick` + lease renew před checkpoint persist.
- Každý checkpoint přechod je owner-gated (`persistVideoJobArtifacts` false ⇒ `lease_lost`, žádná další práce).
- Ztráta lease v AI fázi ⇒ `AiVideoClipJobError(lease_lost)`; **catch neposílá failed callback** (`isAiVideoLeaseLostError`).
- `finalizeAiVideoClipJob` při `persist === false` vrací `lease_lost` **bez** completed callbacku.

## 7. Failure bez still fallbacku

- AI větev **nikdy** nevolá `renderMp4` po selhání executoru/assembly.
- `AiVideoClipJobError` → failed callback (kromě lease-lost).
- Blocked executor (`generation_disabled`, …) → failed job, ne still video.
- Durable AI output už hotový ⇒ idempotentní completed, **ne** failed kvůli `already_complete`.

## 8. Finální output kontrakt

Zachováno pro review/publish:

- `mp4_url`, `thumbnail_url`, `subtitle_url`, `render_spec`, `debug`, `artifacts_persisted_at`

Navíc v `output.ai_video`:

- `phase`: `checkpoint_stills` → `scene_clips_complete` → `assembly_complete` → `final`
- `input_fingerprint` + `input_fingerprint_version`
- `clip_ready_manifest`, `staging` (bucket/path), `generation` summary

## 9. Upload staging a commit (11B)

1. `runAiVideoClipJobPhase` — executor → assembly → upload do **staging** (`…/ai-staging/…` v `video-renders`).
2. Persist `phase=assembly_complete` až po úspěšném staging uploadu (bez `mp4_url` v job outputu).
3. `finalizeAiVideoClipJob` — copy staging → finální cesty, persist durable output, **pak** completed callback, best-effort cleanup stagingu.

## 10. Změněné soubory a migrace

| Soubor | Role |
| --- | --- |
| `lib/video-engine/schemas/videoJobRenderMode.ts` | Render mode kontrakt |
| `lib/video-worker/aiVideoCheckpointFingerprint.ts` | SHA-256 fingerprint vstupu |
| `lib/video-worker/aiVideoJobOutput.ts` | Fáze, manifest, already-completed |
| `lib/video-worker/aiVideoStaging.ts` | Staging path helpers |
| `video-worker/aiVideoArtifactStorage.ts` | Staging upload, promotion, cleanup |
| `video-worker/aiVideoClipJobPhase.ts` | Durable fáze + DI |
| `video-worker/finalizeAiVideoClipJob.ts` | Finální commit gating |
| `video-worker/jobRunner.ts` | Early complete + finalize |
| `scripts/check-ai-video-worker-integration.ts` | Step 11 testy |
| `scripts/check-ai-video-worker-integration-11b.ts` | Step 11B testy |
| `package.json` | `check:ai-video-worker-integration` (+ 11b chain) |

**Migrace:** žádná.

## 11. Výsledky testů

| Check | Výsledek |
| --- | --- |
| `check:ai-video-worker-integration` | **26 passed** |
| `check:ai-video-worker-integration-11b` | **20 passed** |
| `check:ai-video-worker-integration-11c` | **11 passed** |
| `check:ai-video-worker-integration-11d` | **17 passed** |
| `check:video-reel-assembly` | 32 passed |
| `check:scene-video-executor` | 25 passed |
| `check:scene-video-attempts` | 39 passed |
| `check:scene-video-plan` | 19 passed |
| `check:production-runtime` | 24 passed |
| `check:dispatch-worker-contract` | 13 passed |
| `tsc --noEmit` | OK |
| eslint (změněné soubory) | OK |

## 12. Nulová Runway / placená / remote test volání

Obě integrační sady používají fake executor, lokální FFmpeg, mock persist/lease/storage. **Žádný** Runway POST, **žádný** remote Supabase.

## 13. Výchozí produkce zůstává `still`

- Existující joby bez `video_render_mode` → beze změny.
- `SCENE_VIDEO_GENERATION_ENABLED` **nezapnuto**.
- Žádný existující job nebyl přepnut na `ai_video_clips`.

---

## Kontrola a opravy Step 11B

### 1. Původní problém finálního commitu

Step 11 volal `persistVideoJobArtifacts` a bez kontroly výsledku posílal completed callback. **Oprava:** `finalizeAiVideoClipJob` volá callback až když `persist === true`; jinak `lease_lost` bez callbacku.

### 2. Chování při lease loss

- Checkpoint / finalize persist false ⇒ okamžité zastavení, žádný completed callback.
- `jobRunner` catch: `isAiVideoLeaseLostError` ⇒ **žádný** failed callback (nepřepisovat stav nového vlastníka).

### 3. Checkpoint fingerprint

`computeAiVideoInputFingerprint` (verze 1): job ID, mode, scény (prompts, motion, duration, transition, still refs, asset identity), voiceover, subtitles policy, plan provider/model/ratio. Retry jen při shodě; jinak `checkpoint_input_mismatch`.

### 4. Durable fáze `scene_clips_complete`

Po úspěšném executoru: persist `clip_ready_manifest`, attempt/generation summary, fingerprint. Retry načte manifest a **nevolá** `executePlan` (žádný nový provider POST v testu 12).

### 5. Durable fáze `assembly_complete`

Po FFmpeg assembly: staging upload (MP4, thumbnail, volitelně SRT), persist `phase=assembly_complete` se **bucket/path** refs. Retry vrací `needs_final_promotion` bez executoru a bez `assembleReel`.

### 6. Staging storage lifecycle

Deterministické cesty `{project}/video/{job}/ai-staging/…`. Staging není publikovatelný output; `mp4_url` až po promotion + finálním persistu. Cleanup stagingu best-effort až po úspěšném commitu; selhání cleanupu nemění completed.

### 7. Retry po upload/promotion failure

Job zůstává na `assembly_complete` se staging objekty. Další běh workeru: fáze přeskočí render, `finalizeAiVideoClipJob` znovu promotion + persist.

### 8. Already-completed chování

`resolveAlreadyCompletedAiVideoJob` vyžaduje durable MP4 + AI meta; vrací artefakty pro idempotentní callback. `assembly_complete` bez finálního MP4 **není** completed. Fáze může vrátit `already_completed` bez výjimky `already_complete`.

### 9. Změněné soubory (11B)

Viz tabulka v §10; klíčové nové moduly: fingerprint, staging, `aiVideoArtifactStorage`, `finalizeAiVideoClipJob`, přepsaná `aiVideoClipJobPhase`.

### 10. Výsledky testů

26 + 20 integračních testů (viz §11); pokrývají persist gating, fingerprint mismatch, obě retry fáze, staging identity, cleanup, early complete.

### 11. Potvrzení nulových skutečných provider requestů

Všechny testy injektují executor/storage; flag zůstává off; žádný Runway HTTP v suite.

### 12. Potvrzení výchozí produkce `still`

Beze změny defaultu; AI větev pouze explicitní opt-in na job inputu.

### Přesnost reportu — executor vs reuse

| Situace | Chování |
| --- | --- |
| Executor nebyl vůbec zavolán | `clip_ready_manifest` / `assembly_complete` early return |
| Executor volán jen pro reuse | N/A v aktuálním kódu — při manifestu se `executePlan` vůbec nevolá |
| Nový provider POST | Pouze když chybí manifest a executor běží s paid guards |

---

## Kontrola a opravy Step 11C

### 1. Fingerprint při resume

Před jakýmkoli reuse (`checkpoint_stills`, `scene_clips_complete`, `assembly_complete`, `final`) se ověří **job input fingerprint** (`computeAiVideoJobInputFingerprint` — reprodukovatelný před TTS). `assembly_complete` se už nenačítá před kontrolou. Early complete v `jobRunner` používá stejný fingerprint z `buildRenderSpec(payload.input)`.

### 2. Checkpoint bez fingerprintu

AI meta s fází, ale bez platného `input_fingerprint` → `checkpoint_fingerprint_missing` (žádný executor, žádná promotion).

### 3. Validace staging checkpointu

`validateAssemblyCompleteCheckpoint` (Zod + pravidla): render mode, fáze, fingerprint verze, bucket/path, povinný MP4+thumbnail, SRT když manifest vyžaduje burn-in, clip-ready manifest vs render spec, staging prefix `{project}/video/{job}/ai-staging/`, staging ≠ finální cesta.

### 4. Finální metadata

`buildAiVideoFinalDurableOutput`: `ai_video.phase=final`, `final_at`, fingerprint, generation/assembly summary, `final_artifacts` (bucket/path). `resolveAlreadyCompletedAiVideoJob` vyžaduje `phase=final` + shodu fingerprintu.

### 5. Idempotentní promotion

`promoteStorageRefIdempotent`: odstraní **pouze** známý cílový objekt, pak copy; `storageObjectExists` umožní přeskočit existující cíl. Test storage: copy na existující cíl = chyba. **11D:** skip-if-exists v promotion se nepoužívá — vždy remove přesného cíle + copy.

### 6. Lease guard kolem storage

`finalizeAiVideoClipJob` volá `renewLease` před promotion, mezi kroky copy a před DB persist. Ztráta lease → `lease_lost`, žádný callback, žádné další zápisy.

### 7. Partial promotion retry

Selhání mezi soubory ponechá `assembly_complete` + staging; další běh dokončí promotion idempotentně bez executoru/assembly.

### 8. Callback failure po final commitu

Po úspěšném persistu `phase=final` selhání callbacku nevrátí job do failed; další běh → `already_completed` + pouze opakovaný callback (`callbackSent: false` v prvním finalize).

### 9. Změněné soubory (11C)

| Soubor | Role |
| --- | --- |
| `lib/video-worker/aiVideoCheckpointFingerprint.ts` | Job input vs artifact fingerprint |
| `lib/video-worker/aiVideoCheckpointValidation.ts` | Resume + staging validace |
| `lib/video-worker/aiVideoEarlyFingerprint.ts` | Pre-TTS fingerprint pro runner |
| `lib/video-worker/aiVideoJobOutput.ts` | Final output, already-completed pravidla |
| `video-worker/aiVideoClipJobPhase.ts` | Fingerprint-first resume |
| `video-worker/finalizeAiVideoClipJob.ts` | Lease, final meta, callback tolerance |
| `video-worker/aiVideoArtifactStorage.ts` | Idempotent promotion |
| `video-worker/jobRunner.ts` | Early fingerprint + callbackSent |
| `scripts/check-ai-video-worker-integration-11c.ts` | Step 11C testy |

### 10. Výsledky testů

26 + 20 + 11 integračních testů; `check:production-runtime`, `check:dispatch-worker-contract`, `tsc`, eslint — OK.

### 11. Nulové skutečné provider requesty

Beze změny — injektovaný executor, flag off.

### 12. Default zůstává `still`

Beze změny.

---

## Kontrola a opravy Step 11D

### 1. Staging bucket integrita

`validateAssemblyCompleteCheckpoint` vyžaduje `AI_VIDEO_RENDER_BUCKET` (`video-renders`) u MP4, thumbnailu i volitelného SRT. Všechny refs musí sdílet tentýž bucket, identický s bucketem, do kterého `promoteStagingToFinalArtifacts` kopíruje. Jiný bucket → `checkpoint_invalid` před jakoukoli storage operací.

### 2. Přesná shoda manifest / render spec

`assertManifestMatchesPersistedRenderSpec` porovnává kanonickou identitu každé scény: pořadí, ID, image bucket/path, clip bucket/path, `generation_attempt_id`, duration, motion prompt, transition, renderer/source metadata (`type`, `renderer_version`, `video_usage`, `asset_id`). Neshoda → `checkpoint_invalid`, žádná promotion / executor / assembly.

### 3. Early fingerprint rejection

`jobRunner` volá stejnou `assertJobInputFingerprintForResume` jako pozdější resume, **před** TTS a image generation. Chybějící nebo neshodný fingerprint → `AiVideoClipJobError`, žádný completed callback, žádné TTS/images/executor/assembly/promotion.

### 4. Strict final output

`resolveAlreadyCompletedAiVideoJob` nyní vyžaduje `projectId` + `phase=final` + fingerprint + MP4 URL + thumbnail URL + validní `final_artifacts` bucket/path vlastněné daným project/jobem. Samotné `mp4_url` nestačí. Titulky deklarované v assembly (`subtitlesBurnInUsed`) bez subtitle artifactu → není already-completed.

### 5. Skutečné chování promotion

`promoteStorageRefIdempotent` **vždy**:

1. smaže pouze přesnou cílovou cestu (nikdy prefix),
2. zkopíruje staging → cíl.

Neexistující cíl po remove je v pořádku; existující cíl se nepřeskakuje, přepisuje se. Test 16 dokládá, že soubor jiného jobu zůstane.

### 6. Výsledky testů

| Check | Výsledek |
| --- | --- |
| `check:ai-video-worker-integration` | 26 passed |
| `check:ai-video-worker-integration-11b` | 20 passed |
| `check:ai-video-worker-integration-11c` | 11 passed |
| `check:ai-video-worker-integration-11d` | 17 passed |
| `check:video-reel-assembly` | 32 passed |
| `check:scene-video-executor` | 25 passed |
| `check:scene-video-attempts` | 39 passed |
| `check:production-runtime` | 24 passed |
| `check:dispatch-worker-contract` | 13 passed |
| `tsc --noEmit` | OK |
| eslint (změněné soubory) | OK |

### 7. Nulové provider requesty

Žádný test nevolá Runway ani remote Supabase. Flag zůstává `false`.

### 8. Default `still`

Beze změny. Žádný existující job se nepřepíná na `ai_video_clips`.

### 9. Blocker před registrací

**Žádný zbývající neplacený technický blocker v checkpoint integritě workeru.** Pipeline umí bezpečně odmítnout cizí bucket, neshodný manifest, fingerprint mismatch před TTS a nekompletní final output.

Před prvním placeným během zůstávají jen **aktivační** kroky (ne integrity vady): zapnout `SCENE_VIDEO_GENERATION_ENABLED` v kontrolovaném prostředí, explicitní job input (`video_render_mode`, budget, confirm), Runway secret ve worker env. Volitelné pozdější zpevnění: přeskočit TTS/images i u ne-final checkpoint retry (stále mimo tento krok).
