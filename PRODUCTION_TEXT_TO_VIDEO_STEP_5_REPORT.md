# Production Text-to-Video — Step 5 Report

Step 5 hardens Runway T2V (4B), adds sound plan + ElevenLabs SFX/music lifecycle, trim + FFmpeg assembly, assembly checkpoint, and full worker finalize. **No real paid provider calls** in tests; feature flags default **off**.

## 1. Step 4B fixes

- **A1 I2V/T2V separation:** `textToVideoAttemptSelection.ts` — only `generation_mode === text_to_video` with matching `request_fingerprint`, provider, model, scene ID.
- **A2 Clip validation:** `validateSucceededSceneClip` downloads and runs `validateTextToVideoSceneClipBuffer` (720×1280, duration, MP4) before reuse/completion; invalid → `needs_review` via `markTextToVideoClipValidationFailed`.
- **A3 Strict checkpoint:** `sceneClipsCheckpointValidation.ts` — 1:1 scenes, fingerprints, trim/provider metadata; reuse probes storage artifacts via `assertSceneClipsCheckpointArtifacts`.
- **A4 Concurrency:** CAS on scene attempts (Step 4) + audio asset unique fingerprint scope (046); Step 5B runs parallel Runway executor harness (bounded POST count).

## 2. Sound plan & Manual Review

- Schema: `lib/content-package/textToVideoSoundPlan.ts` — per-scene `auto|none|custom`, anchors, voice phrase; music `auto|none|existing_asset|eleven_generated`.
- Auto proposal from `sound_intent` on creative plan scenes (max 3 effects, 1/scene) in package attach.
- Manual Review UI: scene sound mode, effect sentence, anchor, voice phrase; music summary + **USD estimate**; note when **auto music** needs licensed Eleven generation.
- Save: `saveCreativeReviewTextToVideoSoundPlan` invalidates assembly checkpoint only.

## 3. SFX / music provider contracts

- SFX: `POST /v1/sound-generation`, model `eleven_text_to_sound_v2`, `duration_seconds` 0.5–30 — `lib/elevenlabs/soundGeneration.ts`.
- Music: `POST /v1/music`, instrumental, length from video — `lib/elevenlabs/musicGeneration.ts`.
- Injectable `fetchImpl` for tests (never called in Step 5/5B scripts).

## 4. Music license gate

- `ELEVENLABS_MUSIC_ENABLED`, `ELEVENLABS_MUSIC_COMMERCIAL_LICENSE_CONFIRMED`, `confirmPaidRun`, budget — `elevenLabsMusicAllowedForProduction`.
- **`music.mode = auto`:** `resolveTextToVideoMusicForProduction` → `eleven_generated` only when licensed + paid confirm; else **`music_auto_unavailable`** (never silent `none`).

## 5. Audio lifecycle / idempotence

- Migration **046** `text_to_video_audio_assets` — full statuses, claim CHECK, completed artifact CHECK, unique fingerprint scope, RLS, service role, `updated_at` trigger, indexes.
- `audioAssetRepository.ts`, `audioAssetArtifact.ts`, `runTextToVideoAudioPhase.ts` — parity with voice: atomic insert, input match, owner CAS, stale/5xx → `submission_unknown`, `response_received`, post-response upload → `artifact_recovery_required`, ffprobe on reuse, `upsert: false` storage.

## 6. Budget

- `textToVideoPackageBudget.ts` — **fail-closed** (no `?? 999`); budget only from job input / production run.
- `textToVideoAudioBudget.ts` — voice, Runway committed/new/reuse, SFX, music, Runway + **audio** `submission_unknown` exposure; block before new audio POSTs.

## 7. SFX anchoring

- `textToVideoSfxAnchoring.ts` — scene_start/beginning/middle/end, voice_phrase via Eleven alignment; gain/fade/duration computed (not user-editable).

## 8. Trim

- Fingerprinted paths: execution + request fingerprint + trim seconds + contract version — `textToVideoReelBridge.ts`, `textToVideoTrimClipStorage.ts` (`upsert: false`, probe reuse).
- `trimTextToVideoSceneClip.ts` — exact `required_trim_seconds`, lease checks in assembly loop.

## 9. FFmpeg assembly

- `runTextToVideoAssemblyPhase.ts` — returns local paths for worker staging only; validates MP4/thumb/SRT before return.
- `textToVideoAssemblyFingerprint.ts`, `textToVideoFinalArtifactValidation.ts`.

## 10. Subtitles

- Uses brief `subtitles` (Eleven cues / SRT from voice phase); no Whisper; burn-in via existing subtitle renderer.

## 11. Assembly checkpoint

- Durable `video_text_to_video_assembly_checkpoint` — **Storage bucket/path only** (no `/tmp`); persisted **after** staging upload via `persistTextToVideoAssemblyCheckpoint`.
- Worker retry with valid checkpoint skips providers → `needs_final_promotion` (`textToVideoJobPhase.ts`).

## 12. Finalize / callback / lease

- `video-worker/textToVideoJobPhase.ts` → voice → Runway clips → assembly → staging upload → checkpoint → `finalizeAiVideoClipJob`.
- Callback failure does not revert persisted completed job (same as still/I2V).

## 13. Worker flow

- DigitalOcean worker: `runTextToVideoJobPhase` with lease renewals; assembly/audio on worker, not Vercel.

## 14. Feature flags (default off)

- `.env.example`: `ELEVENLABS_SOUND_EFFECTS_ENABLED`, `ELEVENLABS_MUSIC_ENABLED`, `ELEVENLABS_MUSIC_COMMERCIAL_LICENSE_CONFIRMED`, Runway T2V, Eleven TTS (existing).

## 15. Migration & remote

- **046** `046_text_to_video_audio_assets` — **applied on remote** (`20260819182743`).

## 16. Changed / new files (Step 5 + 5B)

- Audio: `audioAssetArtifact.ts`, `textToVideoMusicResolve.ts`, `textToVideoPackageBudget.ts`, `textToVideoAssemblyCheckpoint.ts`, `textToVideoAssemblyFingerprint.ts`, `textToVideoFinalArtifactValidation.ts`, `textToVideoTrimClipStorage.ts`
- Tests: `scripts/check-production-text-to-video-step-5b.ts`

## 17. Tests

- `npx tsx scripts/check-production-text-to-video-step-5.ts` — 17 checks.
- `npx tsx scripts/check-production-text-to-video-step-5b.ts` — budget, music auto, trim fingerprint, audio budget exposure, dual executor, checkpoint reuse + finalize callback, FFmpeg trim/validate golden.
- Step 1–4 regressions re-run after 5B.

## 18. Zero provider calls in tests

Step 5 / 5B use fake providers, injected storage, or local FFmpeg only — **no Eleven/Runway HTTP**.

---

## Kontrola a opravy Step 5B

### 1. Nalezené příčiny

- SFX/music lifecycle was lighter than voice (missing artifact helpers, post-response misclassified as pre-submission retry).
- Budget used implicit defaults in some paths; assembly checkpoint could carry local paths conceptually.
- `music.mode = auto` could fail ambiguously; trim storage keys were scene-only.
- Migration 046 needed full parity with 044 (status/claim/completed CHECK, RLS, indexes).
- Worker always required provider flags even when durable assembly checkpoint existed.

### 2. Opravený audio lifecycle

- Shared patterns from voice: `audioAssetArtifact.ts`, repository CAS/`submission_unknown`/`response_received`/`artifact_recovery_required`, no re-POST after response bytes, ffprobe on completed reuse.

### 3. Migrace a remote metadata

- **046 applied** on production Supabase; table `text_to_video_audio_assets` columns verified (status, claim, synthesis_input, audio_bucket/path, estimated_cost_usd, etc.).

### 4. Fail-closed budget

- Removed `packageBudgetUsd ?? 999`; `assertAuthoritativeTextToVideoPackageBudget` + `assertAssemblyPhasePackageBudget`; job input mismatch guard in worker.

### 5. Finální music auto pravidlo

- `textToVideoMusicResolve.ts`: auto → `eleven_generated` only with flags + commercial license + paid confirm; else `music_auto_unavailable` for Manual Review.

### 6. Artifact validace

- `verifyAudioAssetBuffer`, bucket/path fingerprint, duration/size/kind; final MP4/thumb/SRT in `textToVideoFinalArtifactValidation.ts`.

### 7. Fingerprintované trim cesty

- Execution + request fingerprint + trim duration + contract version; `upsert: false`; reuse after download + probe.

### 8. Durable staging checkpoint

- Assembly phase does not write `/tmp` into `package_brief`; worker uploads staging then `persistTextToVideoAssemblyCheckpoint`.

### 9. Assembly fingerprint

- `computeTextToVideoAssemblyFingerprint` includes execution, voice, measured audio, trims, sound plan, audio assets, SFX anchors, music, subtitles, transitions, contract version (no retry timestamp).

### 10. Cleanup

- Audio temp dirs via `cleanupTextToVideoAudioTempDirs`; assembly work dir in phase cleanup; failures best-effort.

### 11. Dual-executor Runway test

- `check-production-text-to-video-step-5b.ts` — two parallel `executeTextToVideoRunwayPlan` with lock; POST count bounded (≤ one per scene in harness).

### 12. FFmpeg golden test

- Real local `ffmpeg`/`ffprobe`: generate 720×1280 clip, trim to 1s, `validateTextToVideoSceneClipBuffer` passes.

### 13. Worker E2E fake smoke

- `runTextToVideoJobPhase` with durable checkpoint + fake storage → `needs_final_promotion` without Eleven/Runway flags; `finalizeAiVideoClipJob` with failing callback → `completed`, `artifactsPersisted`, `callbackSent: false`.

### 14. Regrese

- Step 4 (20), Step 5 (17), Step 5B (10), Step 1 guard updated for `runTextToVideoJobPhase`; Step 3 script tail OK.

### 15. Nulové reálné provider requesty

- Tests: flags off; fake fetch/storage only; FFmpeg local.

### 16. Deployment kroky

| Target | Action |
|--------|--------|
| **Vercel** | Deploy app with T2V UI + API changes; no new worker secrets on Vercel for Runway/Eleven execution. |
| **Supabase** | Migration **046** already applied; verify RLS for service role in staging if needed. |
| **DO video-worker** | Deploy worker bundle; ensure `ffmpeg`/`ffprobe` on PATH; set env below. |
| **DO content-package-worker** | Deploy if package generation changes touch that worker; same Supabase + AI keys as today. |

### 17. Environment variables (names only, no secrets)

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `ELEVENLABS_API_KEY`, `ELEVENLABS_TTS_ENABLED`
- `ELEVENLABS_SOUND_EFFECTS_ENABLED`, `ELEVENLABS_MUSIC_ENABLED`, `ELEVENLABS_MUSIC_COMMERCIAL_LICENSE_CONFIRMED`
- `RUNWAYML_API_SECRET`, `TEXT_TO_VIDEO_RUNWAY_ENABLED`
- `VIDEO_WORKER_*` lease/callback URLs as existing
- Optional: `FFMPEG_PATH`, `FFPROBE_PATH`

### 18. Před jedním placeným testem

- Enable TTS + Runway T2V + (optional) SFX/music flags and commercial music confirmation deliberately.
- Set **`text_to_video_max_budget_usd`** and **`text_to_video_confirm_paid_run`** on production run / video job input.
- Resolve **`music.mode = auto`** in Creative Review (or use explicit `none` / vetted `existing_asset`).
- Run one worker job with monitoring; confirm budget ledger and no duplicate POST on retry.
- Full **full-pipeline** worker E2E with fakes for all phases (voice+Runway+audio+assembly) still recommended once before paid — 5B covers checkpoint/finalize path and unit behaviors.

---

### Checklist (post–Step 5B)

| Question | Answer |
|----------|--------|
| Migration 046 applied? | **Yes** (remote `046_text_to_video_audio_assets`) |
| Audio second POST after response? | **Blocked** — `submission_unknown` / `artifact_recovery_required` |
| Budget can be missing? | **No** — fail-closed |
| `music:auto`? | **`eleven_generated`** if licensed + paid; else **`music_auto_unavailable`** |
| Checkpoint durable refs only? | **Yes** |
| Dual-executor test? | **Yes** (Step 5B harness) |
| Real FFmpeg test? | **Yes** (trim + validate) |
| Worker fake E2E? | **Yes** (checkpoint reuse + finalize) |
| Flags off in tests? | **Yes** |
| Real provider in tests? | **No** |
| Safe to deploy? | **Yes** for code + 046; enable flags only for controlled paid test |
| Blocker before first paid run? | Explicit budget + confirm, flag/license enablement, optional full fake upstream E2E |

---

## Kontrola před prvním placeným během – Step 5C

Step 5C dokončuje testovací bránu před prvním kontrolovaným placeným T2V package během. **Žádné reálné provider volání**; skript `scripts/check-production-text-to-video-step-5c.ts` + harness `scripts/lib/t2vPrePaidTestHarness.ts`.

### Co se testovalo

1. **Strict Runway concurrency** — dva souběžné executory, plán **3 scény**, atomický CAS fake repo (`makeAtomicSceneAttemptSupabase`); tracker `RunwayCreateTracker` počítá každý `createTextToVideo` POST.
2. **Full fake E2E** — `runTextToVideoJobPhase` od nuly (inject `elevenLabsCall`, fake Runway, SFX POST, `music: none`, FFmpeg assembly, durable checkpoint, `needs_final_promotion`, `finalizeAiVideoClipJob`).
3. **Retry** — druhý běh nad checkpointem: `assembly_checkpoint_reuse`, 0 Runway/Eleven POSTů.
4. **Budget** — blok při nedostatku (0 Runway POST); `submission_unknown` v `evaluateTextToVideoFullBudget`.
5. **Env** — autoritativní Runway secret v `lib/ai/runway.ts`.

### Produční opravy z Step 5C (příčiny)

| Problém | Příčina | Oprava |
|---------|---------|--------|
| Druhý executor neviděl peer completion | Po ztrátě claimu chybělo čekání/reload attemptu | `waitForPeerSubmissionOutcome`, reload `submitting` + `getSceneVideoAttemptByClientRequestId`; per-scene refresh v `textToVideoRunwayExecutor.ts` |
| Finální MP4 1080×1920 vs T2V spec 720×1280 | Clip reel používal `SHORT_PROFILE` (1080×1920) | Step **5D**: explicitní delivery profil 1080×1920; Runway zdroj zůstává 720×1280 |
| Step 5B dual test neprokazoval 1 POST/scénu | Počítal jen délku pole POSTů, ne `Promise.allSettled` ani `scene_id` | Nahrazeno Step 5C strict testem (3 scény, 3 POSTy, 1 task/scéna) |

### Změněné / nové soubory (Step 5C)

- `scripts/check-production-text-to-video-step-5c.ts` (nový)
- `scripts/lib/t2vPrePaidTestHarness.ts` (nový)
- `lib/scene-video-attempts/service.ts` (peer wait, reload)
- `lib/text-to-video/textToVideoRunwayExecutor.ts` (per-scene attempt refresh)
- `lib/video-reel-assembly/assembleVideoReel.ts`, `video-worker/services/reel/orchestrateVideoClipReel.ts` (T2V delivery 1080×1920 — viz Step 5D)
- `lib/text-to-video/runwayProductionConfig.ts` (source vs delivery profily)
- `video-worker/textToVideoJobPhase.ts` (inject downloader / voice deps pro testy)

### Checklist (Step 5C — odpovědi)

| # | Otázka | Výsledek |
|---|--------|----------|
| 1 | Příčina nalezených chyb | Viz tabulka výše (concurrency sync, rozlišení reel canvasu) |
| 2 | Změněné soubory | Viz seznam Step 5C |
| 3 | Concurrency: přesně 1 Runway create / scénu (3 scény → 3 POST)? | **Ano** (tracker + mapování task/scéna) |
| 4 | Full fake E2E voice → finalize? | **Ano** (test 5 + ffprobe staging MP4) |
| 5 | Retry: 0 nových provider POSTů? | **Ano** (test 6, checkpoint reuse) |
| 6 | MP4: video + audio, 1080×1920 delivery? | **Ano** (Step 5D; ffprobe + `validateTextToVideoFinalMp4`) |
| 7 | Autoritativní Runway secret | **`RUNWAYML_API_SECRET`** (`lib/ai/runway.ts`; `.env.example` už shodně) |
| 8 | Výsledky testů | `npx tsx scripts/check-production-text-to-video-step-5c.ts` → **7/7 OK**; Step 5B regrese **10/10 OK** |
| 9 | Placené volání v testech? | **Ne** — fake provider, inject voice, lokální FFmpeg |
| 10 | Bezpečné zapnout jeden kontrolovaný placený package? | **Ano**, pokud: migrace 046, explicitní budget + `confirm_paid_run`, zapnuté flagy dle checklistu, monitoring prvního běhu, `music` ne `auto` bez licence |
| 11 | Deployment checklist | Níže |

### Deployment checklist (Vercel + oba DO workery)

**Supabase (všechny runtime)**

- Migrace **045**, **046** aplikované; service role pro workery.

**Vercel (Next.js app)**

- Deploy aktuální větve (T2V UI, creative review sound plan, production run budget fields).
- **Nepovinné** pro samotné renderování videa: Runway/Eleven **se na Vercel nevolají** pro T2V worker path.
- Env (názvy, bez hodnot): `SUPABASE_*`, případně stejné Eleven/Runway jen pokud app volá preview API — jinak dle stávajícího deployu.

**DigitalOcean `video-worker` (T2V execution)**

- Deploy bundle včetně `video-worker/textToVideoJobPhase.ts`, `lib/text-to-video/*`, FFmpeg služby.
- Binárky: `ffmpeg`, `ffprobe` na PATH nebo `FFMPEG_PATH` / `FFPROBE_PATH`.
- Env (názvy only):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `ELEVENLABS_API_KEY`, `ELEVENLABS_TTS_ENABLED=true` (až pro placený test)
  - `ELEVENLABS_VOICE_ID_DEFAULT` (nebo projektový voice map)
  - `ELEVENLABS_SOUND_EFFECTS_ENABLED` (volitelně pro SFX)
  - `ELEVENLABS_MUSIC_*` pouze pokud `music` ≠ `none`
  - **`RUNWAYML_API_SECRET`**, `TEXT_TO_VIDEO_RUNWAY_ENABLED=true` (až pro placený test)
  - `RUNWAY_USD_PER_CREDIT` (volitelně pro odhad)
  - Stávající `VIDEO_WORKER_*` / callback / lease proměnné

**DigitalOcean content-package / package worker (pokud generuje T2V brief)**

- Deploy pokud se měnil package generation / deferral (Step 1–5 soubory v `lib/ai/workflows`, `lib/content-package`).
- Stejné Supabase; **Runway/Eleven nejsou nutné** na tomto workeru pro samotný clip render — jen pokud by se spouštěla paid pipeline odtud.

**První placený běh (operátor)**

1. Creative Review: schválený plán, sound plan (`music: none` nebo licencovaná volba), similarity passed.
2. Production run / video job: `text_to_video_confirm_paid_run=true`, `text_to_video_max_budget_usd` > odhad.
3. Zapnout flagy na **video-worker** only; sledovat Runway tasky a audio asset řádky.
4. Po `completed` spustit retry job — očekávat **0** nových provider POSTů (reuse checkpoint).

---

## 1080×1920 delivery export – Step 5D

Runway Gen‑4.5 nadále generuje scény v **`720×1280`** (`ratio 720:1280`). Finální T2V reel pro Reels / TikTok / Shorts se exportuje v **`1080×1920`** pouze lokálním FFmpeg scale v assembly — bez Runway upscale, bez nových provider requestů.

### Kde probíhá převod 720p → 1080p

1. **Stažený Runway klip** — validace `validateTextToVideoSceneClipBuffer` / trim: **`720×1280`** (`TEXT_TO_VIDEO_SOURCE_CLIP_PROFILE`, `trimTextToVideoSceneClip` scale 720:1280).
2. **Finální reel** — `assembleVideoReel` pro `metadata.package_video_mode === "text_to_video"` předá `TEXT_TO_VIDEO_DELIVERY_PROFILE` (1080×1920) do `orchestrateVideoClipReel` → `renderVideoClipsMp4` → `buildVideoClipNormalizeChain` (`scale=1080:1920` + `crop=1080:1920`, bez `pad` letterboxu při stejném 9:16).

### Titulky

Ověřené pořadí (`renderVideoClipsMp4`):

1. **Pass 1** — klipy normalizované na **1080×1920**, xfade, mux voiceover → intermediate MP4.
2. **Pass 2** — `buildSubtitleBurnArgs` — libass **subtitles** filtr na intermediate (1080p plátno), audio copy, faststart.

Titulky se tedy nepálí v 720p a neupscalují — styl zůstává schválený SRT; mění se jen plátno pass 1.

### Runway / ceny

- Request: **`gen4.5`**, **`720:1280`**, beze změny fingerprintů provider vstupu.
- **12 kreditů/s**, žádný upscale endpoint, žádný nový AI request.

### Checkpoint invalidace (720p → 1080p delivery)

- Assembly contract **`v2`**; fingerprint obsahuje `delivery_width` / `delivery_height` (1080×1920).
- Checkpoint pole: `assembly_contract_version`, `delivery_width`, `delivery_height`.
- `readDurableTextToVideoAssemblyCheckpoint` **odmítne** checkpointy bez 1080×1920 (včetně starých 720p assembly z Step 5C) → worker **znovu spustí pouze assembly** (voice + Runway + audio checkpointy zůstávají) → **0** nových Runway/Eleven/SFX/music POSTů při nezměněných provider artefaktech.
- Platný 1080p checkpoint → retry jako dříve (`assembly_checkpoint_reuse`).

### Změněné soubory (Step 5D)

- `lib/text-to-video/runwayProductionConfig.ts` — `TEXT_TO_VIDEO_SOURCE_CLIP_PROFILE`, `TEXT_TO_VIDEO_DELIVERY_PROFILE`
- `lib/text-to-video/textToVideoAssemblyConstants.ts` — contract v2, delivery rozměry
- `lib/text-to-video/textToVideoAssemblyFingerprint.ts`
- `lib/text-to-video/textToVideoAssemblyCheckpoint.ts`
- `lib/text-to-video/textToVideoFinalArtifactValidation.ts`
- `lib/video-reel-assembly/assembleVideoReel.ts`
- `video-worker/textToVideoJobPhase.ts`
- `scripts/check-production-text-to-video-step-5d.ts` (nový)
- `scripts/check-production-text-to-video-step-5b.ts`, `scripts/check-production-text-to-video-step-5c.ts` (ffprobe 1080×1920, checkpoint fields)

### Checklist (Step 5D)

| # | Otázka | Výsledek |
|---|--------|----------|
| 1 | Kde 720→1080 | `buildVideoClipNormalizeChain` v pass 1 clip reel (T2V delivery profile) |
| 2 | Titulky na 1080p plátně? | **Ano** — pass 2 burn na intermediate z pass 1 @ 1080×1920 |
| 3 | Runway `720:1280`? | **Ano** — beze změny |
| 4 | Provider cena? | **Beze změny** |
| 5 | Invalidace starého 720p assembly CP | **Ano** — `readDurable…` vrací null; re-assembly only |
| 6 | Soubory | Viz seznam Step 5D |
| 7 | Testy | `step-5d` **8/8**, `step-5c` **7/7**, `step-5b` **10/10**, `tsc --noEmit` OK |
| 8 | Placená volání? | **Ne** |
| 9 | Připraveno k publikaci? | **Ano** — 1080×1920, H.264+AAC, faststart (stávající pipeline) |
| 10 | Deploy | **DigitalOcean `video-worker`** (FFmpeg assembly); Vercel app (brief/checkpoint fields); Supabase bez nové migrace |

---
