# Content Package → DigitalOcean migration audit

Read-only assessment from the current fenrikmarketing codebase. No redesign. Scope: move complete Content Package generation (same business logic) off Vercel onto the existing DigitalOcean server.

| | |
|---|---|
| **Estimate** | Medium |
| **Video** | Already on DO |
| **Package AI** | Still on Vercel |

**Verdict:** The existing DO server already runs the video half of a Content Package. It does not run Creative Engine, Presentation Generation, or package persistence today. Those live only in Next.js `/api/n8n/*` on Vercel. The workflow code itself (`runGenerateContentPackage`) is shared Node/TS and already injectable with an admin Supabase client — relocatable without rewriting business logic.

---

## 1. Current execution map

Browser / automation → Vercel trigger → n8n.fenrik.chat → Vercel AI execution → (optional) DO video-worker → Vercel callback

```
Browser / admin UI / automation API
  ↓
Vercel — trigger (sendN8nWebhook) + later callbacks
  ↓
n8n (n8n.fenrik.chat) — select strategy items, loop, HTTP only
  ↓
Vercel — /api/n8n/generate-content-package (Creative Engine + Presentation + DB)
  ↓
Vercel — /api/n8n/start-video-job (claim + dispatch)
  ↓
DigitalOcean — renderer.fenrik.chat video-worker (TTS, images, FFmpeg)
  ↓
Vercel — /api/n8n/video-callback (status / URLs)
```

| Stage | Runs on | Implementation |
|-------|---------|----------------|
| Strategy generation | Vercel | `runWeeklyStrategy` → `/api/n8n/weekly-strategy` (Claude) |
| Creative Engine v3 | Vercel | `planCreativeEngineV3ForPackage` inside `generateContentPackage` |
| Package / Presentation Generation | Vercel | `generateValidatedJson` + guardrails/repairs (~160s documented) |
| Persistence + `video_jobs` insert | Vercel | `persistNewPackage` → `content_packages`, `content_items`, `video_jobs` |
| Image generation | DigitalOcean | `video-worker/services/images.ts` (OpenAI) |
| Voice / TTS | DigitalOcean | `video-worker/services/tts.ts` (OpenAI) |
| Video rendering + FFmpeg | DigitalOcean | `video-worker/services/ffmpeg.ts` |
| Callbacks (video / status) | Vercel | `/api/n8n/video-callback`, `error-callback`, `action-run-status` |

---

## 2. What already runs on DigitalOcean

| Component | Purpose | How started | Inputs | Outputs |
|-----------|---------|-------------|--------|---------|
| video-worker HTTP server | Accept render/cancel/scene-image jobs; queue; run pipeline | `npm run video-worker` → `video-worker/server.ts` (port `VIDEO_WORKER_PORT`, default 8080). Live host referenced as `renderer.fenrik.chat` | `POST /render` WorkerPayload (job ids, `callback_url`, input); secret `x-video-worker-secret` | 202 accept; later MP4/thumbnail in Supabase Storage + POST `callback_url` |
| In-process job queue | Serialize concurrent renders | Loaded by `server.ts` (`queue.ts`) | `enqueueVideoJob` payloads; `MAX_CONCURRENT_VIDEO_JOBS` (default 1) | Ordered execution of `runVideoJob` |
| jobRunner pipeline | TTS → optional SFX → scene images → storyboard/subs → FFmpeg → upload → callback | Invoked from queue | WorkerPayload from `/render` | Local temp files; Storage URLs; success/fail callback body |
| TTS service | Voiceover audio | Inside jobRunner | Script / TTS fields from job input | MP3 + duration (ffprobe) |
| Image / raster services | Generate or prepare scene stills | Inside jobRunner; also `/regenerate-scene-image`, `/edit-scene-image`, `/insert-scene-asset` | Scene plan + assets | PNGs (OpenAI or reused assets) |
| FFmpeg render | Compose MP4 + thumbnail | Inside jobRunner | Stills + audio + SRT; `FFMPEG_PATH` / `FFPROBE_PATH` | MP4 + thumbnail files |
| Worker storage + callback | Upload artifacts; notify app | End of jobRunner | Local files; `callback_url`; `N8N_CALLBACK_SECRET` | Buckets `video-renders` / `generated-visuals`; POST `/api/n8n/video-callback` on Vercel |
| component-capture-worker | Website/component screenshots (Playwright) — not package AI | `component-capture-worker/server.ts` (port 8090); has Dockerfile | Capture requests | Screenshots for asset ingest — outside Creative Engine path |

In-repo: no video-worker Dockerfile / systemd / PM2. Docs label worker as DigitalOcean / Docker; start script is `npm run video-worker`. Creative Engine / package AI: not present on DO.

---

## 3. What still runs on Vercel (long-running AI)

| Operation | Purpose | Complexity | Why still there |
|-----------|---------|------------|-----------------|
| Generate content package | Creative Engine + Presentation + persist + queue `video_jobs` | Long (~160s inline AI; `maxDuration` 300). Multiple Claude calls (directions, eval, ideation, critic, presentation, optional repairs) | n8n bridge posts to `fenrikmarketing.vercel.app/api/n8n/generate-content-package`; no DO host for this workflow exists |
| Regenerate content package | Re-run package AI + version snapshot | Same class as generate (`maxDuration` 300) | Same Vercel `/api/n8n` and `/api/ai` routes |
| Weekly strategy | Strategy items for packages | Claude; docs note ~60–90s observed; `maxDuration` 300 | Upstream of package gen; still on Vercel |
| Trend scan | Score trend candidates | Claude; `maxDuration` 300 | Separate workflow; not required mid-package but still Vercel AI |
| start-video-job dispatch | Claim `video_jobs` → call DO worker | Short HTTP/DB; not generative AI | Lives on Vercel; worker callback returns to Vercel |

---

## 4. Content Package generation — logical steps

| Step | What happens |
|------|--------------|
| 1. Trigger | UI/automation → `sendN8nWebhook(generate_content_package)` |
| 2. n8n | Webhook → read `content_strategy_items` → loop `batchSize` 1 |
| 3. HTTP generate | `POST` Vercel `/api/n8n/generate-content-package` (secret) |
| 4. Preconditions | `assertGenerateContentPackagePreconditions`; cancel skip |
| 5. Idempotence | `loadExistingPackageData` by `strategy_item_id`; heal missing video job |
| 6. Context load | project, strategy item, assets, anti-repetition, series, run plan |
| 7. Creative Engine v3 | Brief → directions → eval → ideation → vetoes → critic → DNA |
| 8. Deterministic plans | Identity, visual narrative/medium, product reveal, PPD, attention, beats |
| 9. Presentation Generation | Claude JSON + schema/guardrails + fidelity/SI/PPD repairs |
| 10. Persist | `content_packages` draft → `content_items` → `video_jobs` queued → `asset_usage` (rollback on fail) |
| 11. n8n start video | `POST /api/n8n/start-video-job` with `packageId` / `videoJobId` |
| 12. DO render | Worker TTS/images/FFmpeg/upload → video-callback on Vercel |

Source of truth: `n8n/generate-content-package-bridge.json`, `app/api/n8n/generate-content-package/route.ts`, `lib/ai/workflows/generateContentPackage.ts`, `docs/n8n-workflow-contract.md`.

---

## 5. Server dependencies (for package gen on DO)

| Category | Fact from codebase |
|----------|-------------------|
| Already on DO (video-worker) | Node runtime + `@/` aliases; OpenAI; Supabase Storage client; FFmpeg; `VIDEO_WORKER_*` / `N8N_CALLBACK_SECRET`; `SCENE_TYPES_*` parity |
| Needed for package AI on DO | `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`; `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL`; same shared `lib/` tree |
| Auth pattern to reuse | Secret header (video-worker uses `x-video-worker-secret`; n8n uses `x-n8n-secret` / `N8N_CALLBACK_SECRET`) |
| Not on DO today | HTTP entry that calls `runGenerateContentPackage`; Claude creative/presentation path |
| Can stay on Vercel | video-callback, start-video-job claim, UI, weekly-strategy (unless also moved) |

---

## 6. Migration requirements (no code written)

| Must change | Why |
|-------------|-----|
| New DO endpoint / process | Host that invokes `runGenerateContentPackage(..., createSupabaseAdminClient())` — no such process today |
| Environment on DO | Anthropic + Supabase admin (and any `SCENE_TYPES` / checklist flags used at generation time) |
| n8n routing | Bridge URLs hardcode `fenrikmarketing.vercel.app` for generate + start-video-job |
| Timeouts | n8n HTTP + DO reverse proxy must allow ~300s class requests (same as Vercel `maxDuration`) |
| Callbacks / origin | `start-video-job` builds callback from `request.origin` → must remain a reachable Vercel (or moved) callback URL |
| Process isolation | Same box already runs FFmpeg; concurrent package AI + render needs operational awareness (queue already concurrency-limited for video) |
| Optional: start-video-job location | Can remain on Vercel after package gen moves; only generate URL must change for smallest path |

**Smallest path (current architecture only):** Keep `start-video-job` + video-callback on Vercel. Add a DO HTTP process that authenticates like other workers and calls the existing `runGenerateContentPackage` with `createSupabaseAdminClient`. Retarget only the n8n N3 generate URL. Do not rewrite Creative Engine or Presentation.

---

## 7. Risks

| Risk | Current code behavior |
|------|----------------------|
| Duplicate package generation | Pre-check `loadExistingPackageData` + unique index `uniq_content_packages_strategy_item`; 23505 → return winner. Concurrent AI can still both spend Claude cost before insert. |
| n8n retry (`maxTries` 3) | Idempotent return of existing package after first successful persist. Retry during in-flight AI (before insert) can run parallel Claude work. |
| Partial persistence | `persistNewPackage` rolls back package/items/jobs on `video_job` or `asset_usage` failure. Crash mid-rollback is residual operational risk. |
| Worker / host crash mid-AI | No package row until persist; settlement path on Vercel route today. DO host must preserve `settleProductionRunItemOrThrow` semantics or runs stick. |
| Video double-dispatch | `start-video-job` skips completed/failed; stale processing reclaim via `VIDEO_JOB_STALE_MINUTES`. Moving only package gen leaves this on Vercel. |
| Status / settlement drift | Generate route settles terminal failures after `generationBegan`. Must keep that behavior on the new host. |

---

## 8. Estimate

**Classification: Medium**

Not Small: there is no package-generation process on DO today; n8n URLs, env, long-request hosting, and settlement semantics must be wired. Not Large/Very Large: business logic already exists as one injectable workflow; video/TTS/images/FFmpeg already on DO; no redesign required.

Route comment already names an off-Vercel worker migration for runs beyond the 300s ceiling — confirming intent matches this split.

---

## 9. Final recommendation

### Can existing DO server execute complete package generation?

**NO — as deployed today**

Blocking: DO only exposes video-worker endpoints (render / cancel / scene image). It never calls `runGenerateContentPackage` or Claude Creative Engine / Presentation.

**YES — after smallest relocation**

Same monorepo already runs on DO via Node + alias registration. Inject admin Supabase client and host the existing workflow.

### Smallest migration path

1. New DO HTTP entry → `runGenerateContentPackage` + admin client + settlement
2. Env: Anthropic + Supabase service role (+ generation rollout flags)
3. Point n8n N3 URL at that host; keep N4 `start-video-job` on Vercel
4. Ensure ~300s request budget on DO proxy / n8n
5. Leave video-worker + callbacks unchanged

### Key file anchors

- `lib/ai/workflows/generateContentPackage.ts` — business logic
- `app/api/n8n/generate-content-package/route.ts` — Vercel entry
- `video-worker/server.ts` — DO pattern for long jobs
- `n8n/generate-content-package-bridge.json` — hardcoded Vercel URLs
- `docs/n8n-workflow-contract.md` — n8n orchestrates only
