# Production text-to-video — Step 3 report

## Summary

Step 3 wires **native ElevenLabs `eleven_v3`** with **`/with-timestamps`**, idempotent synthesis lifecycle, measured scene timing, and Runway preflight — **without** calling Runway (`text_to_video_runway_not_implemented`).

## Delivered (Step 3)

| Area | Implementation |
|------|----------------|
| Config | `ELEVENLABS_TTS_ENABLED` (default off), `ELEVENLABS_API_KEY`, voice ID env map, `.env.example` |
| Adapter | `lib/elevenlabs/adapter.ts` — bounded read, validation, `eleven_v3` + timestamps |
| Voice direction | `lib/elevenlabs/v3VoiceDirection.ts` — whitelist tags, fingerprint |
| Voice pick | `lib/elevenlabs/voiceResolve.ts` — OpenAI → ElevenLabs ID |
| Lifecycle | `voiceSynthesisService.ts` + repository/artifact helpers |
| Timing | alignment-based measured scenes, checkpoint on brief |
| Entry | `runTextToVideoPaidEntryPoint` → voice phase → Runway preflight stub |
| Operator UI | T2V confirm + max budget on `ContentProductionPanel` |

## Still / OpenAI TTS

Unchanged for `package_video_mode: still`. ElevenLabs only on T2V paid path when flag + key + confirm + budget + preflight pass.

## Run tests

```bash
npx tsx scripts/check-production-text-to-video-step-3.ts
npx tsx scripts/check-production-text-to-video-step-3b-behavior.ts
npx tsx scripts/check-production-text-to-video-step-2c-behavior.ts
npx tsx scripts/check-production-text-to-video-step-1.ts
npx tsx scripts/check-production-text-to-video-step-2.ts
npx tsx scripts/check-production-text-to-video-step-2b.ts
npx tsx scripts/check-production-text-to-video-step-2c.ts
```

---

## Kontrola a opravy Step 3B

### 1. Příčiny (potvrzené)

- **5xx / timeout / network** po odeslání POSTu šly do retryable `failed` → riziko druhého placeného POSTu.
- **Post-response chyby** (audio, alignment, storage, DB) markovaly `failed` / `storage_failed` → znovu claim + POST.
- **Claim** bez stale handlingu a bez owner-scoped updates; `failed` znovu claimovatelné.
- **Insert race** na `(project, package, fingerprint)` bez unique recovery / input integrity check.
- **Completed reuse** bez storage/ffprobe ověření.
- **Titulky** — tagy po znacích nešly odstranit; volný voiceover check neblokoval mismatch.
- **Scene timing** — pouze váha znaků, ne alignment.
- **Cena** — default `$0.06/1k` místo `$0.10`; odhad z approved textu místo billing synthesis textu včetně tagů.
- **Brief update** bez kontroly `error` / `rows affected`.
- **Migrace 044** — chyběly stavy, claim CHECK, RLS, trigger.

### 2. Claim lifecycle

- CAS podle scene-video attempts: `claimVoiceSynthesisSubmission`, stale `submitting`/`response_received` → `submission_unknown` (nikdy auto-reclaim pro POST).
- Owner-scoped updates: `markOwnedVoiceSynthesisUpdate` / `markOwnedVoiceSynthesisTerminal`; ztráta lease → `VoiceSynthesisLeaseLostError`.
- DB CHECK: claim fields jen pro `submitting` | `response_received`.

### 3. Klasifikace chyb

| Situace | Stav |
|--------|------|
| Pre-POST (lokální/config) | `failed_pre_submission` (retry bez POSTu jen z created/failed_pre_submission) |
| 4xx provider | `provider_rejected` |
| timeout / network / 5xx | `submission_unknown` |
| Po úspěšné odpovědi — validace/upload/DB | `needs_review` nebo `artifact_recovery_required` |

### 4. Stale claim

- `resolveVoiceSynthesisRowForSubmit` + `VOICE_SYNTHESIS_SUBMISSION_CLAIM_STALE_MS` (5 min) v produkční cestě.
- Stale → `submission_unknown`, claim cleared, **žádný** automatický POST.

### 5. Recovery Storage / DB

- Po POST: `response_received` → validate → upload (retry stejných bytes, max 3) → `completed`.
- Upload fail → `artifact_recovery_required` (bytes v DB metadata, žádný nový ElevenLabs).
- DB complete fail po uploadu → adopt existujícího objektu na deterministické cestě.

### 6. Completed artifact adoption

- Reuse vyžaduje bucket `video-renders`, přesnou cestu, download + ffprobe, revision/fingerprint match; jinak `needs_review`.

### 7. Subtitle / tagy

- `lib/elevenlabs/alignmentVoiceover.ts` — join znaků, skip celých tagů, `alignment_voiceover_mismatch` při neshodě s approved VO.

### 8. Scene timing

- `applyAlignmentMeasuredTimingToPlan` — excerpt → skutečné start/end z alignmentu.
- `timing_measurement_source: alignment`; Runway preflight vyžaduje `alignment` (blok `timing_measurement_not_alignment`).
- `target_duration_seconds` (creative cíl) odděleno od `measured_audio_duration_seconds`.

### 9. Cena / budget

- Default **`$0.10 / 1000 znaků`** (`ELEVENLABS_USD_PER_1K_CHARS` override).
- Odhad z **`synthesis_text`** (včetně tagů).
- `voiceSynthesisBudgetExposureUsd` — `submission_unknown` a post-response stavy počítají jako expozice.

### 10. Migrace (remote)

- **044 aplikována** na remote (`20260819174715_text_to_video_voice_synthesis`).
- RLS + policies (`owns_project`), `service_role` grant, `updated_at` trigger, status/claim CHECK.

### 11. Změněné / nové soubory (3B)

- `supabase/migrations/044_text_to_video_voice_synthesis.sql`
- `lib/text-to-video/voiceSynthesisConstants.ts`
- `lib/text-to-video/voiceSynthesisRepository.ts`
- `lib/text-to-video/voiceSynthesisArtifact.ts`
- `lib/text-to-video/voiceSynthesisService.ts` (refactor)
- `lib/elevenlabs/adapter.ts`, `alignmentVoiceover.ts`, `subtitlesFromAlignment.ts`
- `lib/text-to-video/measuredSceneTiming.ts`
- `lib/elevenlabs/config.ts`, `v3VoiceDirection.ts`
- `lib/content-package/textToVideoCreativePlan.ts`, `videoPaidPreflight.ts`
- `scripts/check-production-text-to-video-step-3b-behavior.ts`
- `scripts/check-production-text-to-video-step-3.ts`, `step-2b.ts` (regrese)

### 12. Behaviorální testy

- `scripts/check-production-text-to-video-step-3b-behavior.ts` — claim, stale, 5xx class, alignment/tags, scene timing, cena, zero POST.
- Step 1–3 + 2B/2C + 2C behavior — prošly offline.

### 13. Provider requesty

- Testy používají fake Supabase/fetch; **nulové** reálné ElevenLabs/Runway volání.

### 14. Blocker pro worker + Runway

- `video-worker/jobRunner.ts` stále `text_to_video_not_implemented`.
- Runway step musí navázat na measured checkpoint + zbývající budget po voice exposure.

## Next (Step 4+)

Runway video generation after `assertTextToVideoRunwayPreflight` with remaining budget.

---

## T2V voice selection parity fix (2026-08-20)

### Shrnutí

Eleven fáze T2V nyní bere hlas **výhradně** z immutable snapshotu jobu/balíčku, ne z projektového resolveru. Mapování zůstává **female / male / default** (max 2 unikátní Eleven identity + volitelný default sdílený s jedním bucketem).

### Checklist (odpovědi)

1. **Autoritativní hlas:** `video_jobs.input.tts_voice` (priorita), pak `package_brief` snapshot (`tts_voice`, `presentation_generation.tts_voice` / `selected_voice`). Implementace: `lib/text-to-video/textToVideoAuthoritativeVoice.ts`, volání z `voiceSynthesisService.buildSynthesisContext`.
2. **Jednorázový výběr:** Ano — při `buildVideoJobInput` / `attachTtsToVideoJobInput`; worker předává `jobInput` do Eleven fáze; retry dědí stejný `tts_voice` z job inputu.
3. **Mapování:** OpenAI gender bucket → `ELEVENLABS_VOICE_ID_FEMALE` / `_MALE` / `_DEFAULT` (`lib/elevenlabs/voiceResolve.ts`, strict fail-closed).
4. **Počet Voice ID:** **2 unikátní identity** (female + male) stačí produktově; env může mít i **default** (třetí klíč), který může **sdílet stejné ID** s female nebo male.
5. **Nezachováváme:** Rozdíly mezi OpenAI hlasy v rámci stejné kategorie; emoce/styl řeší `video_voice_direction`, v3 tagy, beats, schválená custom instruction.
6. **Manual Review:** Kategorie hlasu (ženský / mužský / default) + stávající hlasová režie — bez výběru Voice ID (`CreativeReviewPackagePanel`, `creative-review-admin`).
7. **Změněné soubory:** viz audit appendix + `scripts/check-production-text-to-video-voice-parity.ts`.
8. **Testy:** parity 10/10; Step 3 ✓; Step 5C ✓; Step 5D ✓ — bez provider POST.
9. **Migrace 044–046:** Projekt `syijxdgekowpcboxpeyl`; historie migrací obsahuje 044–046; tabulka **`text_to_video_voice_syntheses` chybí**; **`text_to_video_audio_assets` existuje**; 045 = alter `scene_video_generation_attempts`.
10. **DB změna v tomto kroku:** **Ne.**
11. **Provider requesty:** **Žádné** reálné ani placené.
12. **Bezpečné pokračovat env + první placený běh?** **Ne** dokud (a) chybí tabulka `text_to_video_voice_syntheses` na cílovém Supabase a (b) nejsou nastaveny `ELEVENLABS_VOICE_ID_*` pro použité buckety. Po opravě 044 a env: ano, s potvrzeným `text_to_video_confirm_paid_run` a budgetem.

### Run parity tests

```bash
npx tsx scripts/check-production-text-to-video-voice-parity.ts
npx tsx scripts/check-production-text-to-video-step-3.ts
```

---

## Oprava databázového driftu migrací 047 (2026-08-20)

### Shrnutí

Opraven drift: migrace **044** byla v historii projektu `syijxdgekowpcboxpeyl`, ale tabulka **`text_to_video_voice_syntheses` chyběla**. Nová idempotentní migrace **`047_repair_text_to_video_voice_syntheses.sql`** obnovila plný kontrakt (shodný s 044 a `voiceSynthesisRepository`). Historie 044 **nebyla měněna**; `migration repair` **nepoužit**.

### Checklist (13 bodů)

1. **Supabase projekt:** `syijxdgekowpcboxpeyl` (`https://syijxdgekowpcboxpeyl.supabase.co`).
2. **Příčina driftu:** **NEOVĚŘENO** (044 v `schema_migrations` bez tabulky).
3. **Proč 047:** explicitní repair bez přepisování 044 / bez falešné historie.
4. **Změněné soubory:** `supabase/migrations/047_repair_text_to_video_voice_syntheses.sql`; `PRODUCTION_VOICE_SELECTION_AUDIT.md`; tento report.
5. **Aplikována pouze 047:** **ano** (MCP `apply_migration`, ne `db push`).
6. **Migration history:** `20260819220917` → `047_repair_text_to_video_voice_syntheses`.
7. **Metadata:** tabulka + sloupce + status CHECK (9 stavů) + unique fingerprint + FK + claim/completed CHECK + indexy (`package_idx`, `project_idx`, `status_updated_idx`) + RLS + 4 policies + `service_role` granty + `updated_at` trigger — ověřeno SQL.
8. **Počet řádků:** **0**.
9. **Testy:** parity 10/10; Step 3 ✓; Step 3B ✓; Step 5C ✓; Step 5D ✓; `npx tsc --noEmit` ✓.
10. **Provider requesty:** **žádné**.
11. **Jiná produkční data:** **nezměněna** (pouze DDL CREATE + policies/trigger).
12. **DB blocker pro první placený T2V:** **odstraněn** (tabulka existuje). Zbývá nastavit worker env a flagy.
13. **`.env.worker` (bez úprav v tomto kroku):** worker načítá `.env.worker` (`docker-compose.content-package-worker.yml`) — pro placený T2V typicky `ELEVENLABS_TTS_ENABLED=true`, `ELEVENLABS_API_KEY`, mapování `ELEVENLABS_VOICE_ID_FEMALE|MALE|DEFAULT`, `TEXT_TO_VIDEO_RUNWAY_ENABLED=true`, `RUNWAYML_API_SECRET`, volitelně SFX; music flagy dle produktu; dokud operátor nezapne, zůstávají false dle `.env.example`.
