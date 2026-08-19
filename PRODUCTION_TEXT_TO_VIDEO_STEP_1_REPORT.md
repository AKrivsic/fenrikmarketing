# Production text-to-video — Step 1 report

Date: 2026-08-19  
Scope: safe foundation for optional `still` | `text_to_video` inside existing Content Package / Production Run workflow. No Runway, ElevenLabs, LLM, or paid provider calls.

---

## 1. `generation_mode` flow and fix

**Stored:** `production_runs.requested_config.config.generationMode` / `generation_mode` (via `ProductionConfig`, `normalizeProductionConfig`).

**UI → run:** `ContentProductionPanel` → `startProductionRun` → `createProductionRun` persists full config.

**Generate:** n8n → `handleGenerateContentPackageRequest` → `runGenerateContentPackage` → `loadStrategyItemContext` (`production_run_id` on strategy item brief) → `loadRunGenerationPlan` reads run config.

**Resolution (after step 1):** For run-tagged packages, `resolveGenerationModeForProductionRun(runMode, requestMode)` makes the **run authoritative**. Missing `generation_mode` in n8n body (live bridge `n8n/generate-content-package-bridge.json` still omits it) no longer allows a stray body value to override `manual_review`.

**Manual Review defer:** `defersVideoUntilCreativeReview` / `shouldDeferVideoUntilCreativeReview` in `persistNewPackage` — no `video_jobs` insert. `healMissingVideoJobIfRequired` returns early for deferred runs.

**Continue:** `continueCreativeReviewGeneration` → rebuild → `buildVideoJobInput` → insert job → dispatch.

**Automatic production:** unchanged — `generationMode !== manual_review` creates and dispatches video immediately when platforms require video.

---

## 2. Hook → voiceover → scény → video (today)

| Stage | Source |
|--------|--------|
| Initial AI package | Claude pipeline → `hook`, `voiceover_text`, `visual_scenes`, `image_prompts` |
| Manual Review CR | `package_brief.creative_review` — editable VO + scene intent |
| Rebuild (Continue) | `rebuildCreativePackageForVideo` — `final_approved` → `voiceover_text`, `subtitles`, `hook` (first line), `visual_scenes` / prompts |
| Video job | `buildVideoJobInput` → `video_jobs.input` |
| Worker | `parseVideoJobRenderOptions` → default **still** Ken Burns |

**Prior gap:** CR save could change voiceover while package `hook` / subtitles / scenes stayed from Generate until Continue rebuild.

**Step 1:** `video_creative_integrity` on `package_brief` + invalidation on CR save; rebuild marks derivatives **current**; paid preflight blocks stale state before job creation on Continue.

---

## 3. Changes made

- **`package_video_mode`:** `still` \| `text_to_video` on run config, package brief, and `video_jobs.input` (default `still`).
- **Worker:** `text_to_video` → stable error `text_to_video_not_implemented` **before** still / `ai_video_clips` routing.
- **`generation_mode`:** run-authoritative resolution for production-run packages.
- **Creative integrity:** stale flags for hook, subtitles, visual plan, audio/timing on VO / scene / voice-direction edits.
- **Voice direction:** Zod contract (`video_voice_direction`) — styles + optional beats + `custom_instruction`, no provider UI.
- **Paid preflight:** `evaluateVideoPaidPreflight` — creative gates now; future paid gates (`confirm_paid_run`, similarity) via `enforceFuturePaidGates`.
- **Tests:** `scripts/check-production-text-to-video-step-1.ts`.

---

## 4. Authoritative video mode storage

| Layer | Field | Notes |
|-------|--------|--------|
| Production Run | `requested_config.config.packageVideoMode` / `package_video_mode` | Set at run create; not changed by step-1 UI |
| Content Package | `package_brief.package_video_mode` | Stamped at persist; immutable mismatch throws `package_video_mode_immutable_for_run` |
| Video job | `input.package_video_mode` | From brief + run via `buildVideoJobInput`; retry copies prior input |

---

## 5. Backward compatibility

- Missing `package_video_mode` everywhere → **`still`** (same as today).
- `video_render_mode` unchanged; still not set on package jobs.
- No DB migration — JSON-only fields on existing columns.
- Remote DB: not migrated (no schema change).

---

## 6. Voiceover change → no stale hook/scenes for paid path

On CR **save** (`saveCreativeReviewPackage`):

- VO text change → `invalidateVideoDerivativesOnVoiceoverChange` → `hook_status`, `subtitles_status`, `visual_plan_status`, `audio_timing_status` = **stale**; hook **text not auto-rewritten** (no LLM).
- Scene-only edit → `visual_plan_status` stale.

On **Continue** rebuild → spoken fields synced; `video_creative_integrity` marked **current**.

`evaluateVideoPaidPreflight` blocks Continue job creation when stale or CR not approved.

---

## 7. Voice emotion contract

File: `lib/content-package/voiceDirectionContract.ts`

- **Styles:** `auto`, `energetic`, `urgent`, `natural`, `calm_trustworthy`
- **Optional:** `custom_instruction` (max 500 chars, human text)
- **Optional beats:** `{ segment, delivery }[]` (human-readable arc)
- **Revision:** integer bumped on contract change; tied to `video_creative_integrity.voice_direction_revision` and audio/timing stale on change

---

## 8. Future similarity / anti-repetition hook

- **Stage constant:** `VIDEO_PAID_SIMILARITY_CHECK_STAGE = "pre_provider_paid_generation"` in `videoPaidPreflight.ts`
- **State on brief:** `video_paid_preflight.similarity_check_status` (`not_run` \| `passed` \| `failed`)
- **Enforcement:** `evaluateVideoPaidPreflight(..., enforceFuturePaidGates: true)` for `text_to_video` before ElevenLabs / Runway (not enabled in step 1 Continue path)

---

## 9. Changed files

- `lib/content-package/packageVideoProductionMode.ts` (new)
- `lib/content-package/voiceDirectionContract.ts` (new)
- `lib/content-package/videoCreativeIntegrity.ts` (new)
- `lib/content-package/videoPaidPreflight.ts` (new)
- `lib/projects/productionRun.ts`
- `lib/ai/generationMode.ts`
- `lib/ai/workflows/packageShared.ts`
- `lib/ai/workflows/generateContentPackage.ts`
- `lib/ai/workflows/continueCreativeReviewGeneration.ts`
- `lib/api/creative-review-admin.ts`
- `video-worker/jobRunner.ts`
- `scripts/check-production-text-to-video-step-1.ts` (new)

---

## 10. Migration / remote DB

No SQL migration. Existing runs and jobs behave as **`still`**.

---

## 11. Test results

| Command | Result |
|---------|--------|
| `npx tsx scripts/check-production-text-to-video-step-1.ts` | Pass (12 scenarios + voice contract) |
| `npx tsx scripts/check-creative-review-phase5.ts` | Pass |
| `npx tsx scripts/check-manual-review-phase1.ts` | Pass |
| `npx tsc --noEmit -p tsconfig.json` | Pass |
| ESLint on changed files | Pass (warnings only pre-existing in `packageShared`) |

---

## 12. No paid / provider calls

Confirmed: no Runway, ElevenLabs, or other paid AI invocations in this step. Worker throws `text_to_video_not_implemented` without external I/O.

---

## 13. Blockers for next step (ElevenLabs v3 + T2V plan)

1. Implement T2V worker phase (Runway Gen-4.5) behind `package_video_mode === text_to_video` — separate from `ai_video_clips` I2V.
2. Wire ElevenLabs `eleven_v3` using `video_voice_direction` (not legacy TTS fragments).
3. Enable `enforceFuturePaidGates` + real similarity check at `pre_provider_paid_generation`.
4. Optional: production UI to set `packageVideoMode` on run (today only via config JSON / future panel).
5. Fenrik-native subtitles + SFX/music composition for T2V timeline (not in step 1).

---

## Reference

Detailed baseline audit: `FENRIK_PACKAGE_RUN_GENERATION_AUDIT.md`.
