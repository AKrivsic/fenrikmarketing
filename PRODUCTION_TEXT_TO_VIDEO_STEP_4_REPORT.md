# Production text-to-video — Step 4 report

Runway Gen-4.5 scene lifecycle, Step 3C voice hardening, worker integration. Ends at `text_to_video_assembly_not_implemented`. No real paid provider calls in tests; flags default off.

## 1. Voice corrections (Step 3C)

| Item | Implementation |
|------|----------------|
| A1 Original alignment first | `selectAlignmentForApprovedVoiceover` — `alignment` before `normalized_alignment`; normalized only if spoken norm matches approved VO |
| A2 Norm index map | `buildNormIndexToSpokenRawIndex` + `excerptTimeRangeFromAlignment` map normalized excerpt indices → alignment char indices (spaces/newlines) |
| A3 Voice direction | `buildElevenV3SynthesisText` — global style tag, whitelist beat tags from `delivery`, `custom_instruction` keyword map; `beat_diagnostics` when unmapped |
| A4 Checkpoint reuse | `validateVoiceCheckpointForEarlyReuse` before early return (revision, fingerprint, voice/model, storage artifact, alignment, measured plan) |
| A5 Synthesis input integrity | `storedSynthesisInputsMatch` includes `voice_id`, `model_id`, `output_format`; stored on `synthesisInput` |
| A6 Owner-scoped submission_unknown | `markSubmissionUnknownOwned` (CAS on `submission_claim_owner`); provider failure path uses owned update |

## 2. Verified Runway contract

- `POST /v1/text_to_video` via existing `RunwayVideoGenerationProvider.createTextToVideo`
- Model `gen4.5`, ratio `720:1280`, duration integer 2–10, `promptText` validated (motion prompt path, max UTF-16 per existing adapter)
- Header `X-Runway-Version: 2024-11-06` (existing `RUNWAY_API_VERSION`)
- Pricing: **12 credits/s**, USD = credits × `RUNWAY_USD_PER_CREDIT` (default `$0.01`) — `runwayProductionConfig.ts`

## 3. Execution plan and fingerprint

- `buildTextToVideoRunwayExecutionPlan` from measured creative plan + voice checkpoint
- Per-scene `requestFingerprint`; plan-level `executionFingerprint` (creative plan, measured revision, synthesis, scenes, prompt contract v1)
- Approved `provider_prompt` only — no LLM at execution time

## 4. Measured duration → provider duration

- `runwayProviderDurationFromRequiredTrim` — safe `ceil`, clamp 2–10; `>10` → `scene_duration_exceeds_runway_max`
- `required_trimmed_duration_seconds` stored on attempt row

## 5. Budget (voice + video)

- `evaluateTextToVideoRunwayBudget` — ElevenLabs estimate from synthesis length + Runway new/committed/reused; `submission_unknown` committed; blocked if remaining &lt; 0
- Executor skips all Runway POST when blocked upfront

## 6. Attempts lifecycle

- Reuses `scene_video_generation_attempts` with `generation_mode = 'text_to_video'`
- `createTextToVideoSceneVideoAttempt` — same claim/submit/poll/finalize pattern as I2V
- Migration **045** applied remotely (`045_text_to_video_scene_video_attempts`)

## 7. Claim and submission_unknown

- Stale `submitting` without task id → `submission_unknown` (existing sync path)
- 5xx/timeout create → `submission_unknown` via `classifyCreateFailure`
- Task id present → poll only (`syncSceneVideoAttempt` uses `getTextToVideoTask` for T2V rows)

## 8. Sequential executor

- `executeTextToVideoRunwayPlan` — one scene at a time; stop on submission_unknown, failure, lease loss, budget block

## 9. Storage / ffprobe validation

- `validateTextToVideoSceneClipBuffer` — MP4 probe, 720×1280, minimum duration (wired for post-download validation; finalize still uses shared attempt probe)

## 10. Checkpoint / retry

- `VIDEO_SCENE_CLIPS_CHECKPOINT_KEY` / `scene_clips_complete` with execution + voice fingerprints and scene refs
- Reuse when checkpoint matches execution fingerprint; voice phase unchanged on retry

## 11. Worker integration

- `jobRunner`: T2V branch → `runTextToVideoWorkerPipeline` (flags + confirm paid → ElevenLabs → Runway clips) → throws `text_to_video_assembly_not_implemented`
- Heartbeat on poll ticks during Runway wait
- Still / I2V branches unchanged

## 12. Feature flags

- `TEXT_TO_VIDEO_RUNWAY_ENABLED=false` in `.env.example`
- `ELEVENLABS_TTS_ENABLED` unchanged (default false)
- Secret presence does not enable flags

## 13. Migration and remote state

- **044** voice synthesis — already applied
- **045** scene attempts T2V columns + nullable source images — **applied** via Supabase MCP

## 14. Changed / new files (main)

**Voice 3C:** `lib/elevenlabs/alignmentVoiceover.ts`, `lib/elevenlabs/v3VoiceDirection.ts`, `lib/elevenlabs/selectAlignmentForVoiceover.ts`, `lib/text-to-video/voiceSynthesisService.ts`, `lib/text-to-video/voiceSynthesisRepository.ts`, `lib/text-to-video/voiceCheckpointValidation.ts`

**Runway:** `lib/text-to-video/runwayProductionConfig.ts`, `runwayProviderDuration.ts`, `runwayExecutionPlan.ts`, `runwayBudget.ts`, `textToVideoRunwayExecutor.ts`, `runTextToVideoRunwayClipsPhase.ts`, `sceneClipsCheckpoint.ts`, `validateSceneClip.ts`, `textToVideoWorkerPipeline.ts`

**Attempts / worker:** `lib/scene-video-attempts/service.ts`, `types.ts`, `index.ts`, `lib/ai/videoGeneration.ts`, `video-worker/jobRunner.ts`, `lib/content-package/textToVideoPaidEntry.ts`, `.env.example`, `supabase/migrations/045_*.sql`

**Tests:** `scripts/check-production-text-to-video-step-4.ts`, `scripts/check-production-text-to-video-step-1.ts` (worker guard string)

## 15. Behavioral tests

- Step 4 script: **20** offline checks (alignment, beats, budget, fingerprint, flags, worker gate, etc.)
- Step 3B + Step 1–3 regressions re-run and pass
- `npx tsc --noEmit` clean

## 16. Real provider calls

- **None** in automated tests (fake provider / fake Supabase only).

## 17. Remaining blocker (assembly)

- Music, SFX, per-scene trim to `required_trim_seconds`, subtitle burn-in, final FFmpeg assembly — **not in Step 4**; worker intentionally stops at `text_to_video_assembly_not_implemented`.

---

### Summary checklist

| Question | Answer |
|----------|--------|
| Voice beats | Yes — whitelist tags at mapped anchors; diagnostics if unmapped |
| Alignment indices | Yes — norm→raw map for excerpts |
| Runway Gen-4.5 | Yes — production T2V create + poll path |
| Worker T2V path | Yes — `runTextToVideoWorkerPipeline` |
| Duplicate retry second task? | No — idempotent `client_request_id` + claim; task id → poll only |
| Budget voice + video | Yes — preflight rollup |
| Flags off | Yes — defaults false |
| Real provider request in CI/tests | No |
| Still / I2V unchanged | Yes |
| Safe to continue assembly? | Yes after enabling flags + budget in controlled env |
| Blocker | Final assembly, trim, music/SFX |
