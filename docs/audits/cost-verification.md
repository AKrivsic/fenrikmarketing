# Production Runtime Audit — Phase 6E: Cost Verification

**Method:** code-trace only (no AI execution).  
**Date:** 2026-07-23  
**Scope:** paid / intensive call sites on the production-run path and adjacent regenerate / variant / retry flows.  
**Prior evidence:** `docs/audits/cost-trace-c8dd3caf/` (empirical), `docs/audits/production-reliability/` (Phase 5 reliability), `docs/architecture/production-runtime.md` (Phase 5A invariants).

---

## Verdict

Expected production cost is **bounded**. There are **no unbounded paid loops**. Cost risk is **nested multiplication of capped retries** plus **discard of Creative Engine + Presentation spend on hard-fail after paid work**.

Sample mode changes **prompts only** — it does **not** reduce Claude / image / TTS / FFmpeg call counts.

---

## Provider routing (single source of truth)

| Capability | Provider | Entry |
|------------|----------|-------|
| Copy / strategy / CE / presentation / localize / hook | **Claude** (Anthropic Messages) | `getCopywritingProvider()` → `lib/ai/index.ts` |
| JSON parse/schema repair | **OpenAI** chat | `getJsonRepairProvider()` |
| Scene stills | **OpenAI** Images (`gpt-image-1`) | `getImageProvider()` |
| Voiceover | **OpenAI** TTS (`gpt-4o-mini-tts`) | `getSpeechProvider()` |
| Word timestamps | **OpenAI** Whisper (`whisper-1`) | `getTranscriptionProvider()` |
| Video encode | **FFmpeg** (worker CPU) | `video-worker/services/ffmpeg.ts` |

No fal / Replicate / ElevenLabs / embeddings on these paths.

**Call accounting convention**

| Label | Meaning |
|-------|---------|
| Claude | `textProvider.complete()` HTTP attempts (validation attempts × transport attempts) |
| OpenAI | JSON-repair chat completions only (images / TTS / Whisper counted separately) |
| Image | `generateImage` paid requests |
| TTS | `generateVoiceover` paid requests |
| FFmpeg | `spawn(ffmpeg)` processes |
| Whisper | noted under video; tied 1:1 to TTS attempts that run |

---

## Symbols

| Symbol | Meaning | Bound |
|--------|---------|-------|
| **P** | Packages in run (`packageCount`) | UI clamp **0–100**; seed insert cap **50** (`SEED_ITEM_CAP`) |
| **S** | AI scene stills needing generation | ≤ **`MAX_VIDEO_SCENE_STILLS` = 5** |
| **L** | Pending localization languages per approved package | drain ≤ **`DRAIN_MAX_UNITS`** (env / 100) |
| **A** | `generateValidatedJson` validation attempts | default **3** |
| **T** | HTTP transport attempts per complete | AI default **3**; presentation / ideation / strategy force **1** |
| **J** | OpenAI JSON-repair modes per Claude attempt | ≤ **2** (parse + schema); +1 if `repairGuardrailFailures` |

---

## 1. Workflow call matrix

### 1.1 Strategy plan (`planContentStrategy` + `ensureScenarioPool`)

| | Claude | OpenAI (JSON) | Image | TTS | FFmpeg |
|-|--------|---------------|-------|-----|--------|
| **Happy** | `0` if planner ≠ `ai`; else **1** | **0** | 0 | 0 | 0 |
| **Expected avg** | **0–1** + rare scenario refill | **0–1** | 0 | 0 | 0 |
| **Worst** | planner `A≤3×T=1` + scenarios `A≤3×T_default` | ≤`2×` Claude attempts | 0 | 0 | 0 |

- Run-scoped (**×1**, not ×P).
- Scenario Claude skipped when pool ≥ `MIN_SCENARIOS` (5).

### 1.2 Generate content package (`runGenerateContentPackage`)

**Gate:** `claimPackageGeneration` before Creative Engine. `busy` / `existing_package` → **0 AI**.

#### Creative Engine (`planCreativeEngineV3ForPackage`)

| Stage | Happy Claude | Worst Claude (HTTP completes) | Bound |
|-------|--------------|-------------------------------|-------|
| Directions | **1** × (T=3) | **2 rounds** × 3 × 3 = **18** | `runDirections` + memory re-gen |
| Direction eval | **1** (pool ≥ `DIRECTION_GEN_MIN`=4) | **2×2×3 = 12** | ≤2 dirs → deterministic **0** |
| Ideation | **1** × (T=1) | **2 rounds** × 3 × 1 = **6** | veto → one re-ideation |
| Critic | **0–1** | **2×2×3 = 12** | 1 concept → deterministic **0** |
| DNA repair | **0** | **2×3 = 6** | only when DNA incomplete |
| **CE subtotal** | **≈3–4** | **≤54** | |

#### Presentation + repairs

| Stage | Happy Claude | Worst Claude | Bound |
|-------|--------------|--------------|-------|
| Presentation | **1** × (T=1) | **3** | `A` default 3, transport forced 1 |
| Fidelity repair | **0** | **3** | **1 round** then hard/soft policy |
| Story repair | **0** | **3** | **1 round** then hard/soft policy |
| PDI repair | **0** | **3** | **1 round** then hard-fail residues |
| Hook uniqueness | **0** | ≤**3 sites** × 3 × T=3 = **27** | only if duplicate; never blocks persist |

| | Claude | OpenAI (JSON) | Image | TTS | FFmpeg |
|-|--------|---------------|-------|-----|--------|
| **Happy / package** | **≈4–5** | **0** | 0 | 0 | 0 |
| **Expected avg / package** | **≈5–6** (see §2) | **≪1** | 0 | 0 | 0 |
| **Worst / package** | CE≤54 + Pres/repair≤12 + hooks≤27 → **≤93** | ≤`2×` Claude attempts | 0 | 0 | 0 |

Practical expensive path (all CE stages once + presentation + one repair, first-try transport): **≈6–8** Claude completes — not the theoretical 93.

### 1.3 Video render (`runVideoJob`)

| | Claude | OpenAI (JSON) | Image | TTS | Whisper | FFmpeg |
|-|--------|---------------|-------|-----|---------|--------|
| **Happy** | 0 | 0 | **S ≤5** | **1** | **1** | **3** (pass1 + pass2/copy + faststart) |
| **Expected avg** | 0 | 0 | **≈4** (trace) | **≈1.1** | **≈1.1** | **3–4** (+1 if SFX mix) |
| **Worst** | 0 | 0 | **S×2 ≤10** | **3** | **≤3** | **≈4–5** |

- Language-variant jobs: **`forbidImageGeneration`** → images **0** (fail if stills missing).
- Image moderation: **1** paid safe-retry, then **local free** fallback.
- TTS bound: `TTS_TAIL_VALIDATION_MAX_ATTEMPTS = 3`.

### 1.4 Regenerate package (`runRegenerateContentPackage`)

Same CE + Presentation + repair matrix as §1.2.

| Difference vs generate | Effect on cost |
|------------------------|----------------|
| **No** `claimPackageGeneration` | Operator can re-spend deliberately |
| `assertNoActivePackageRender` before AI and before new video insert | Blocks overlap with in-flight render |
| Always new video job when video required | Full video path unless later retry reuses stills |

### 1.5 Retry video (`runRetryVideoJob`)

| Path | Claude | Image | TTS | FFmpeg |
|------|--------|-------|-----|--------|
| Active job exists | 0 | 0 | 0 | 0 |
| Reusable `render_spec` stills | 0 | **0** | ≤3 | ≈3–4 |
| No stills | 0 | ≤10 | ≤3 | ≈3–4 |

### 1.6 Language variants (`localizeContentPackage` + variant video)

Per pending language **L**:

| | Claude | OpenAI (JSON) | Image | TTS | FFmpeg |
|-|--------|---------------|-------|-----|--------|
| **Happy** | **1** localize | 0 | **0** (reuse stills) | **1** | **3** |
| **Worst** | **A≤3 × T=3 = 9** | ≤`2×` attempts | 0 (or fail) | **3** | ≈4–5 |

### 1.7 Manual scene editor (off main run; residual)

OpenAI image regen/edit per scene + optional full re-render (TTS + FFmpeg). **No idempotency key** → concurrent clicks can double image spend.

---

## 2. Expected average vs worst case

### Per completed package (code happy path)

| Resource | Expected (happy) | Empirical avg (`c8dd3caf` completed) | Theoretical worst |
|----------|------------------|--------------------------------------|-------------------|
| Claude | 4–5 | ~5–6 completes; rare story repair | ≤93 HTTP completes |
| OpenAI JSON | 0 | ~0 | ≤2 × Claude attempts |
| Images | 4–5 | ~4 (`$0.168` @ $0.042) | ≤10 |
| TTS | 1 | ~1.1 (2 pkgs had duplicate TTS) | 3 |
| Whisper | 1 | ~1.1 | 3 |
| FFmpeg | 3 | 3 (+SFX rare) | ~5 |

### Primary production run (no variants)

```
Strategy_Claude ≈ 1_{ai_planner} × A≤3

Per_package_Claude_avg ≈ 5–6
Per_package_Claude_worst ≈ ≤93   (nested caps; rare)

Per_package_images_avg ≈ 4
Per_package_images_worst ≈ 10

Per_package_TTS_avg ≈ 1
Per_package_TTS_worst ≈ 3

Per_package_FFmpeg_avg ≈ 3
Per_package_FFmpeg_worst ≈ 5

Run ≈ Strategy + P × (package AI + video)
```

### With language variants

```
+ L × (1 Claude localize avg | ≤9 worst)
+ L × (TTS≤3 + Whisper≤3 + FFmpeg≈3; images = 0)
```

### Empirical run check (`c8dd3caf`, P=14)

| Outcome | Packages | Implication |
|---------|----------|-------------|
| Completed | 8 | Full CE + Presentation + media paid |
| Failed after AI | 6 | **Largest waste bucket** (~$3.34 estimated) — CE±Presentation discarded |
| Unbounded loops | none | Aligns with code caps |

Approx completed-package API cost (telemetry + list-price media): **~$0.58–$0.87**.  
Failed packages often paid **~$0.43–$0.97** with **no video**.

---

## 3. Where duplication can still occur

| Pattern | Can duplicate? | Mitigation | Residual |
|---------|----------------|------------|----------|
| Same strategy item package AI | Concurrent n8n `maxTries:3` | **`claimPackageGeneration`** lease (900s) | Lease expiry / crash before release → reclaim; in-flight Claude after Stop still spends |
| Same package after persist | No (unique + claim `existing_package`) | Unique index + claim | — |
| Same video job dispatch | No while lease live | `claimVideoJobForDispatch` + heartbeat (120s) | Expired lease reclaim; promote if `artifacts_ready` |
| Regenerate while render active | Blocked | `assertNoActivePackageRender` | Race if two regen requests assert before either inserts |
| Retry video while active | Blocked | Active-job idempotent skip | — |
| Retry / variant images | Avoided when stills pinned | `render_spec` / `image_bucket`+`path` | Early fail before persist → full image regen |
| Heal missing video job | Possible dual insert | None (no unique on `video_jobs`) | Operator-triggered |
| Scene editor concurrent regen | Yes | None | Manual only |
| TTS same script | Yes on tail fail | Cap 3 | Paid ×3 |
| Hard-fail after CE+Presentation | Logical “duplicate waste” | Soft-continue heuristics + one RepairDelta | Material residues still discard upstream spend |

**Mitigated vs Phase 5 reliability audit:** concurrent double package AI (prior C-CRIT-1) is largely addressed by package generation claims. Prior “no video heartbeat” and “regenerate without active-job guard” are outdated.

---

## 4. Where retries exist

| Layer | What retries | Paid? |
|-------|--------------|-------|
| `generateValidatedJson` | Schema / guardrail failures | Yes — new Claude complete |
| `repairJson` | Parse / schema failure | Yes — OpenAI chat |
| HTTP `fetchWithRetry` | 429 / 5xx / transport | Yes — re-issues same provider call |
| CE direction / ideation | Memory filter / veto empty survivors | Yes — full stage re-run (≤1 extra round) |
| CE critic / direction eval | Invalid LLM output | Yes — second outer round; else deterministic |
| DNA repair | Incomplete DNA | Yes — ≤2 attempts |
| Fidelity / story / PDI | Material validation fail | Yes — **one** RepairDelta Claude pass each |
| Hook uniqueness | Exact textual duplicate | Yes — one `generateValidatedJson` |
| n8n generate / start-video | HTTP failure | Can re-enter handler (claim should no-op AI) |
| TTS tail validation | Tail / duration checks | Yes TTS (+Whisper) |
| Image moderation | Content policy block | Yes 1× then local free |
| Storage upload | Transient storage errors | Storage only (same object path) |
| Translation trigger | Trigger HTTP | Trigger only |

---

## 5. Where retries are bounded

| Layer | Max | File |
|-------|-----|------|
| `generateValidatedJson` | **3** (default) | `lib/ai/runWithRepair.ts` |
| JSON repair modes / Claude attempt | **≤2** (+ optional guardrail) | same |
| HTTP AI transport | **3** | `lib/http/fetchWithRetry.ts` |
| Presentation / ideation / strategy transport | **1** | generate / ideation / plan workflows |
| CE direction rounds | **2** | `planForPackage.ts` |
| CE ideation rounds | **2** | same |
| Critic / dir-eval outer rounds | **2** × `maxAttempts:2` | `runCritic.ts`, `runDirectionEvaluation.ts` |
| DNA repair | **2** | `dnaRepair.ts` |
| Fidelity / story / PDI LLM repair | **1 round each** | `generateContentPackage.ts` |
| n8n generate HTTP | **maxTries: 3** | `n8n/generate-content-package-bridge.json` |
| Content-package worker trigger | **1** | `lib/content-package-worker/client.ts` |
| TTS tail | **3** | `ttsTailValidation.ts` |
| Image moderation paid retry | **1** then local | `generateSceneImageWithModerationFallback.ts` |
| Upload | **3** (env ≤5) | `video-worker/services/storage.ts` |
| Concurrent video renders | env / **1** | `video-worker/queue.ts` |
| Package claim lease | env / **900s** | `lib/production-runtime/constants.ts` |
| Video lease / heartbeat | **600s** / **120s** | same |

**Unbounded paid loops:** none found.

---

## 6. Where costs are reused

| Mechanism | Reuses | Avoids |
|-----------|--------|--------|
| `claimPackageGeneration` + lease | Single owner for strategy item | Concurrent CE+Presentation |
| Existing package / unique `strategy_item_id` | Persisted package | Re-running AI after success |
| `claimVideoJobForDispatch` + heartbeat | One worker | Dual render while lease live |
| `persist_video_job_artifacts` / promote | Durable MP4 URL | Re-render after callback loss |
| `render_spec` stills + storage paths | Scene images | Image regen on retry / language variant |
| Variant video slot RPC | One video per package×language | Duplicate variant jobs |
| Scenario pool ≥5 | Existing scenarios | Scenario Claude |
| Deterministic CE fallbacks | Critic / dir-eval when LLM fails | Extra critic rounds after fallback |
| RepairDelta + soft-continue | Prior Presentation draft | Full CE restart on heuristic fails |
| `retryVideoJob` active-job check | Existing job | Duplicate retry rows |
| `assertNoActivePackageRender` | In-flight render | Overlapping regen spend |

**Not reused:** failed package CE/Presentation (no package row); mid-Stop in-flight Claude; TTS audio across TTS retries; images if stills never persisted.

---

## 7. Operator-facing cost formula (primary run)

Assume **P** packages, AI strategy planner on, no language variants, happy-path averages:

| Resource | Expected | Worst (single path, no concurrent reclaim) |
|----------|----------|--------------------------------------------|
| Claude | ≈ `1 + 5.5×P` | ≈ `3 + 93×P` (theoretical; unrealistic) |
| OpenAI JSON | ≈ 0 | ≈ `2 × Claude_attempts` |
| Images | ≈ `4×P` | ≈ `10×P` |
| TTS | ≈ `1.1×P` | ≈ `3×P` |
| Whisper | ≈ `1.1×P` | ≈ `3×P` |
| FFmpeg | ≈ `3×P` | ≈ `5×P` |

**Practical planning ceiling** (all CE stages + presentation + one repair + full video, first-try transport):

```
Claude ≈ 1 + 8×P
Images ≈ 5×P … 10×P
TTS/Whisper ≈ 1×P … 3×P
FFmpeg ≈ 3×P
```

Add **failed-package factor**: if ~40% of packages hard-fail after CE (as in `c8dd3caf`), expect ~**0.4×P** extra CE/Presentation spends with **no** media — largest controllable waste lever is **repair soft-continue / fewer hard fails**, not retry caps.

---

## 8. Deltas vs prior audits

| Prior claim | Phase 6E status |
|-------------|-----------------|
| Concurrent n8n retries can both run full package AI | **Mitigated** by `claimPackageGeneration` |
| PDI repair = 0 (hard fail only) | **Updated:** **1** RepairDelta Claude pass, then hard-fail |
| Hook uniqueness up to 3×3 nested uniqueness loops | **Overstated:** single `ensureUniqueHook` call (≤3 validation attempts); up to 3 call sites after repairs |
| No video heartbeat / stale dual workers | **Mitigated:** lease + heartbeat renew |
| Regenerate without active-job guard | **Mitigated:** `assertNoActivePackageRender` |
| Sample mode cheaper | **False** for call counts — prompt appendix only |
| Failed-package waste dominates | **Still true** (empirical + code order: pay CE before persist) |

---

## 9. Key constants (reference)

| Constant | Value | Location |
|----------|-------|----------|
| `PACKAGE_COUNT_MIN/MAX` | 0 / 100 | `lib/projects/productionRun.ts` |
| `SEED_ITEM_CAP` | 50 | `lib/api/production-run-admin.ts` |
| `DIRECTION_GEN_MIN/MAX` | 4 / 10 | `lib/creative-engine-v3/types.ts` |
| `MAX_VIDEO_SCENE_STILLS` | 5 | `lib/video-engine/storyboard.ts` |
| `TTS_TAIL_VALIDATION_MAX_ATTEMPTS` | 3 | `video-worker/services/ttsTailValidation.ts` |
| `HTTP_MAX_ATTEMPTS.ai` | 3 | `lib/http/fetchWithRetry.ts` |
| Presentation transport | 1 | `lib/ai/workflows/generateContentPackage.ts` |
| Ideation transport | 1 | `lib/creative-engine-v3/runIdeation.ts` |
| `PACKAGE_GENERATION_LEASE_SECONDS` | 900 | `lib/production-runtime/constants.ts` |
| `VIDEO_JOB_LEASE_SECONDS` | 600 | same |
| `VIDEO_JOB_HEARTBEAT_INTERVAL_MS` | 120000 | same |
| `MAX_CONCURRENT_VIDEO_JOBS` | env / 1 | `video-worker/queue.ts` |
| `MIN_SCENARIOS` | 5 | `lib/ai/workflows/generateScenarios.ts` |

---

## 10. Summary table (all workflows)

| Workflow | Max Claude | Max OpenAI (JSON) | Max Image | Max TTS | Max FFmpeg | Expected avg | Worst case notes |
|----------|------------|-------------------|-----------|---------|------------|--------------|------------------|
| Strategy | 3+3 | ≤12 | 0 | 0 | 0 | 0–1 Claude | AI planner + scenario refill |
| Generate package | ≤93 | ≤2×Claude | 0 | 0 | 0 | ~5–6 Claude | Claim prevents concurrent dup |
| Video (primary) | 0 | 0 | 10 | 3 | ~5 | ~4 img, 1 TTS, 3 ff | Stills reuse on retry |
| Regenerate | ≤93 | ≤2×Claude | +video | +video | +video | Same as generate+video | Active-render guard |
| Retry video | 0 | 0 | 0 or 10 | 3 | ~5 | TTS+ff if stills | Idempotent if active |
| Localize + variant video | 9 | ≤18 | 0 | 3 | ~5 | 1 Claude + 1 TTS | Slot RPC dedupes video |
| Scene editor | 0 | 0 | unbounded×clicks | optional | optional | manual | No claim |

**Bottom line:** Expected production cost scales as **~5–6 Claude + ~4 images + 1 TTS + 3 FFmpeg per completed package**, plus optional strategy Claude. Worst case is capped nested retries, not infinite spend; the dominant residual cost risk remains **paid CE/Presentation discarded on hard-fail**.
