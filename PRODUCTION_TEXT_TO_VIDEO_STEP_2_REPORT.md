# Production text-to-video — Step 2 report

Date: 2026-08-19  
Scope: T2V creative plan, Production Run UI mode, revision/fingerprint integrity, repetition guard, binding paid preflight. No Runway/ElevenLabs/provider tasks.

---

## 1. Step 1 Creative Integrity — audit & fix

**Problem (Step 1):** `markVideoCreativeCurrentAfterRebuild` could set `hook_status` / `visual_plan_status` to `current` without proving alignment to approved voiceover, hook, voice direction, or T2V plan.

**Fix:** `syncVideoCreativeIntegrityFromSources` in `lib/content-package/videoCreativeIntegrity.ts` sets `current` only when:

- `voiceover_revision_id` / `hook_fingerprint` match approved text,
- for `text_to_video`: `video_text_to_video_creative_plan` is `approved`, repetition `passed`, and `planMatchesApprovedSources()` + `plan_fingerprint` match integrity bindings,
- for `still`: plan fields N/A; visual/plan sync marked `current` without T2V plan.

**Rebuild path:** `rebuildCreativePackageForVideo` still syncs spoken fields from `final_approved`; Continue then rebuilds T2V plan + integrity bindings (not status-only).

---

## 2. Production Run UI — `package_video_mode`

**Where:** `components/projects/ContentProductionPanel/ContentProductionPanel.tsx`

- Radio: **Současné video** → `still` (default)
- **Generované AI video** → `text_to_video`
- Shown only when `plan.videoCount > 0`
- Hint: future paid variant; no provider/model UI
- Stored in `ProductionConfig.packageVideoMode` → `production_runs.requested_config.config`
- Immutable after run start via existing brief stamp guard

---

## 3. Creative plan schema

**Key:** `package_brief.video_text_to_video_creative_plan`  
**Module:** `lib/content-package/textToVideoCreativePlan.ts`  
**Schema version:** `1`

| Field | Purpose |
|--------|---------|
| `schema_version` | Stable contract version |
| `status` | `draft` \| `approved` \| `stale` \| `repetition_blocked` |
| `voiceover_revision_id` / `voiceover_fingerprint` | Binding to approved VO |
| `approved_hook` / `hook_fingerprint` | Video hook |
| `voice_direction_revision` | Binding to `video_voice_direction.revision` |
| `target_duration_seconds` | Mid 24s (20–28 range) |
| `scenes[]` | 3–7 production scenes |
| `plan_fingerprint` | Hash of plan content |
| `repetition` | `not_run` \| `passed` \| `blocked` + normalized-text reason codes |
| `timing_status` | `estimated` (pre–ElevenLabs) \| `measured` (required before Runway) |
| `measured_audio_revision_id` | Binds measured timing to approved VO revision (Step 3+) |

**Scene fields:** `scene_id`, `order`, `human_meaning`, `voiceover_excerpt`, timing estimates, `visual_intent`, `energy_motion`, optional `sound_intent`, `provider_prompt` (system), `human_visual_edit` (editor).

---

## 4. Plan creation from voiceover

Deterministic `buildTextToVideoCreativePlan()`:

- Splits VO into sentences → groups into 3–7 scenes (typically 5–7 for full VO)
- Opening/closing roles; hook from first line
- Provider prompts via `composeTextToVideoProviderPrompt()` (no dialogue/lip-sync/readable text)
- Attached after package persist (`attachTextToVideoCreativePlanToBrief`) for `text_to_video`
- Automatic production: **no fake auto-revision** (Step 2B); auto-`approved` only when repetition passes; on block, full package persist + Creative Review deferral (Step 2C)
- Manual Review: draft plan + repetition status; scene save re-runs repetition; approved on Continue after rebuild when repetition passes

---

## 5. Editor visual edits (no Runway UI)

**Creative Review** (`CreativeReviewPackagePanel`):

- Hook, plan/repetition status, voice direction (human labels), scene list
- Per scene: edit **Vizuální představa** only → `saveCreativeReviewTextToVideoSceneAction` → re-derives `provider_prompt`, re-runs normalized-text repetition check

---

## 6. Voice direction

Reuses `video_voice_direction` (Step 1). CR UI: style select + optional instruction; `saveCreativeReviewVoiceDirectionAction` bumps `revision` and invalidates audio/timing/plan sync.

---

## 7. Repetition control

**Module:** `checkTextToVideoRepetition()` in `textToVideoCreativePlan.ts`  
**Memory:** `buildAntiRepetitionMemory` hooks + prior plan fingerprints (DB scan) + opening motif vs `memory.atmospheres`

**Hard blocks (deterministic normalized text only):**

- `hook_duplicate_normalized_text`
- `plan_fingerprint_duplicate`
- `opening_visual_motif_normalized_text_duplicate`

**Soft / generative:** Existing Content Package generation already receives anti-repetition memory in prompts (unchanged architecture; no new paid similarity LLM).

**Auto rework:** Removed in Step 2B — blocked automatic runs fail closed; Manual Review or regeneration required.

---

## 8. What similarity does / does not catch

| Catches | Does not guarantee |
|---------|-------------------|
| Exact/near-exact stored hook text (normalized) | Semantic paraphrase across projects |
| Identical plan fingerprint | Same industry topic with different hook |
| Same opening visual motif string in atmospheres | Novel metaphor with similar meaning |

Paid preflight blocks only what this check flags — it does **not** claim creative originality guarantees.

---

## 9. Binding paid preflight (two boundaries after Step 2B)

`evaluateVideoPaidPreflight(..., enforceFuturePaidGates: true, paidPreflightPhase?)` for T2V requires:

- Mode alignment run/brief/job
- Manual Review approved when applicable
- Integrity not stale; plan approved; repetition `passed`; fingerprints aligned
- `confirm_paid_run: true`
- `max_budget_usd` > 0 (brief or input)

**Before ElevenLabs** (`paidPreflightPhase: "elevenlabs"` via `assertTextToVideoElevenLabsPreflight`):

- `timing_status` may remain **`estimated`** (24s target + per-scene approximate times are pre–voice synthesis only)

**Before Runway** (`paidPreflightPhase: "runway"` via `assertTextToVideoRunwayPreflight`):

- `timing_status` must be **`measured`**
- `measured_audio_revision_id` must match `voiceover_revision_id`

Entry: `runTextToVideoPaidEntryPoint` → ElevenLabs preflight → `text_to_video_paid_providers_not_implemented`

Continue still uses `enforceFuturePaidGates: false` for job insert (worker already fails T2V); paid entry is Step 3.

---

## 10. Revision / fingerprint bindings

`lib/content-package/videoCreativeRevision.ts` — SHA256 slices for VO, hook, plan content.

Integrity stores: `voiceover_revision_id`, `hook_fingerprint`, `creative_plan_revision_id`, `creative_plan_fingerprint`, `plan_sync_status`.

---

## 11. Changed files (Step 2 + 2B)

- `lib/content-package/videoCreativeRevision.ts` (new)
- `lib/content-package/textToVideoCreativePlan.ts` (new)
- `lib/content-package/textToVideoProviderPrompt.ts` (new)
- `lib/content-package/attachTextToVideoCreativePlan.ts` (new)
- `lib/content-package/textToVideoPaidEntry.ts` (new)
- `lib/content-package/videoCreativeIntegrity.ts`
- `lib/content-package/videoPaidPreflight.ts`
- `lib/content-package/voiceDirectionContract.ts`
- `lib/ai/workflows/generateContentPackage.ts`
- `lib/ai/workflows/continueCreativeReviewGeneration.ts`
- `lib/api/creative-review-admin.ts`
- `app/projects/[id]/creative-review/actions.ts`
- `components/projects/ContentProductionPanel/ContentProductionPanel.tsx`
- `components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx`
- `scripts/check-production-text-to-video-step-2.ts`
- `scripts/check-production-text-to-video-step-2b.ts` (Step 2B)

(Step 1 files unchanged in behavior for `still`.)

---

## 12. Migration / remote DB

No SQL migration. All state in existing JSON columns (`requested_config`, `package_brief`, `video_jobs.input`).

---

## 13. Test results

| Command | Result |
|---------|--------|
| `npx tsx scripts/check-production-text-to-video-step-2c.ts` | Pass (20 scenarios) |
| `npx tsx scripts/check-production-text-to-video-step-2b.ts` | Pass (17 scenarios) |
| `npx tsx scripts/check-production-text-to-video-step-2.ts` | Pass (22 scenarios) |
| `npx tsx scripts/check-production-text-to-video-step-1.ts` | Pass |
| `npx tsx scripts/check-creative-review-phase5.ts` | Pass |
| `npx tsx scripts/check-manual-review-phase1.ts` | Pass |
| `npx tsx scripts/check-production-run.ts` | Pass |
| `npx tsc --noEmit` | Pass |

---

## 14. Provider calls

None. Paid entry throws after preflight without Runway/ElevenLabs.

---

## 15. Blockers for ElevenLabs v3 + Runway Gen-4.5

1. Implement provider phase inside `runTextToVideoPaidEntryPoint` after preflight.
2. Pass `video_text_to_video_creative_plan.scenes[].provider_prompt` to Runway T2V.
3. Pass `video_voice_direction` to ElevenLabs v3 (native expressive API).
4. Fenrik subtitle burn-in + music/SFX timeline from approved plan timing.
5. Production confirm UI for `confirm_paid_run` + budget on operator path.
6. Step 3: ElevenLabs synthesis → set `timing_status: measured` + `measured_audio_revision_id` from real audio duration.

---

## Kontrola a opravy Step 2B

1. **Příčina chyby `variationSalt`:** `autoReviseTextToVideoPlanOnce` volala `buildTextToVideoCreativePlan` s `variationSalt: 1`, což interně přidalo `#1` do vstupu `voiceoverRevisionId()` bez změny uloženého voiceoveru — stejný obsah dostal jiné `voiceover_revision_id` / fingerprint a mohl obejít repetition.
2. **Stejný obsah → jiná revize/fingerprint:** Ano, před opravou (salt + nezměněný hook/scény). Po 2B ne — identity jsou čistě z obsahu.
3. **Odstranění falešné auto-revision:** Smazána `autoReviseTextToVideoPlanOnce` a celý blok v `attachTextToVideoCreativePlanToBrief`; odstraněn `variationSalt` z `BuildTextToVideoPlanArgs`.
4. **`repetition_blocked` v automatickém režimu:** Plán zůstane v briefu; **všechny `content_items` a social image se uloží**; video job se nevytvoří; run dostane `awaiting_text_to_video_creative_review` a stav `waiting_for_creative_review` (Step 2C).
5. **Manual Review — co změnit:** Hook (přes voiceover/hook edit), hlasová režie, **vizuální představa** scény (min. úvodní); uložená změna přepočítá `provider_prompt` + `plan_fingerprint` a znovu spustí `reevaluateTextToVideoPlanRepetition`.
6. **Pole ve fingerprintech:** `voiceover_revision_id` (z normalizovaného VO textu), `hook_fingerprint`, `voice_direction_revision`, `target_duration_seconds`, scény: `scene_id`, `order`, normalizované `human_meaning`, `provider_prompt`. `voiceover_fingerprint` = hash VO; `plan_fingerprint` = `creativePlanContentFingerprint(...)`.
7. **Metadata mimo fingerprint:** `repetition.*`, `checked_at`, `status`, `approved_at`, `timing_status`, `measured_audio_revision_id`, approximate scene times, retry/persist pořadí.
8. **Co repetition zachytí / negarantuje:** Normalizovaná textová shoda hooku, shoda `plan_fingerprint` s historií balíčků, normalizovaný text úvodní vizuální představy vs. `memory.atmospheres`. Negarantuje sémantickou originalitu ani parafráze.
9. **`estimated` vs `measured`:** Nové pole `timing_status` — default `estimated` při build plánu; `measured` až po budoucí syntéze audia (Step 3). Runway preflight vyžaduje `measured`.
10. **Preflight ElevenLabs vs Runway:** ElevenLabs fáze — schválený plán, shoda fingerprintů, repetition `passed`, confirm + budget; timing může být `estimated`. Runway fáze — navíc `timing_status === measured` a `measured_audio_revision_id === voiceover_revision_id`.
11. **Změněné soubory (2B):** `textToVideoCreativePlan.ts`, `attachTextToVideoCreativePlan.ts`, `videoPaidPreflight.ts`, `textToVideoPaidEntry.ts`, `generateContentPackage.ts`, `creative-review-admin.ts`, `CreativeReviewPackagePanel.tsx`, `check-production-text-to-video-step-2.ts`, `check-production-text-to-video-step-2b.ts`, tento report.
12. **Testy:** step-2b (17), step-2, step-1, manual-review phase1, `tsc` — pass. ESLint: pouze pre-existující `react-hooks/set-state-in-effect` v panelu (neintrodukováno 2B).
13. **Provider request:** Žádný.
14. **Blocker dalšího kroku:** Implementace ElevenLabs v3 + zápis measured timing; poté Runway Gen-4.5 za `assertTextToVideoRunwayPreflight`; operator UI pro paid confirm.

---

## Kontrola a opravy Step 2C

1. **Partial-persist chyba:** `TextToVideoRepetitionBlockedError` po update briefu, **před** `content_items` → orphan balíček; retry vracel `reused` bez dokončení persistu.
2. **Pořadí před/po:** viz sekce 2B bod 4 — nyní items → asset_usage → social image → stamp run flag → OK bez video jobu.
3. **`repetition_blocked`:** plán v briefu; video se nespustí; CR se seeduje (`buildManualReviewCreativeReview`) s `creative_review_reason: text_to_video_repetition_blocked`.
4. **Nevideo výstupy:** persistují se vždy (Step 2C cíl).
5. **Stavy:** package `draft`; run `waiting_for_creative_review` + `config.awaiting_text_to_video_creative_review`.
6. **CR pro automatický Run:** `canAccessCreativeReviewRun` když run čeká; banner v panelu.
7. **Retry:** kompletní balíček = idempotent reuse; 0 items + healovatelný brief = `healMissingContentItemsIfPossible` bez AI.
8. **Kompletnost:** `countExpectedPrimaryContentItems` + run plan fan-out; partial items = explicitní `incomplete_package`.
9. **Legacy orphan (2B):** heal při 0 items; jinak diagnostika v reportu.
10. **Duplicitní items:** heal jen při prázdném stavu.
11. **Video job:** `packageBriefDefersVideoJob`; heal skip.
12. **Continue:** T2V plán approved + repetition passed; job insert idempotent; reason cleared.
13. **Soubory:** `generateContentPackage.ts`, `creativeReviewDeferral.ts`, `packageGenerationCompleteness.ts`, `generationMode.ts`, `production-run-admin.ts`, `creative-review-admin.ts`, `continueCreativeReviewGeneration.ts`, UI panel, `check-production-text-to-video-step-2c.ts`.
14. **Migrace:** žádná.
15. **Testy:** step-2c + regrese — pass.
16. **Provider:** žádný.
17. **Blocker ElevenLabs v3:** syntéza audia + measured timing.

---

## Reference

Step 1: `PRODUCTION_TEXT_TO_VIDEO_STEP_1_REPORT.md`  
Audit: `FENRIK_PACKAGE_RUN_GENERATION_AUDIT.md`
