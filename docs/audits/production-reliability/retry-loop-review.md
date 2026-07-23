# Retry & Loop Review

All numeric caps below are from repository constants (not assumed).

---

## Inventory

| Layer | Max | Persisted? | Restart resets? | Paid each attempt? | File |
|-------|-----|------------|-----------------|--------------------|------|
| `generateValidatedJson` | 3 | No (in-memory) | Yes | Yes (provider) | `lib/ai/runWithRepair.ts:139,183` |
| JSON repair per attempt | ≤2 OpenAI modes | No | Yes | Yes | `runWithRepair.ts` |
| HTTP AI transport | 3 | No | Yes | Yes (retry same call) | `lib/http/fetchWithRetry.ts:24` |
| HTTP worker transport | 2 | No | Yes | Yes | same |
| Presentation Claude transport | **1** | No | Yes | Yes | `generateContentPackage.ts:175` |
| CE directions | 3 × transport 3 | No | Yes | Yes | `runDirections.ts` |
| CE direction eval | 2×2 × transport 3 | No | Yes | Yes | `runDirectionEvaluation.ts` |
| CE ideation | 3 × transport 1; +1 re-ideation round | No | Yes | Yes | `runIdeation.ts`, `planForPackage.ts` |
| CE critic | 2×2 × transport 3 | No | Yes | Yes | `runCritic.ts` |
| DNA repair | 2 × transport 3 | No | Yes | Yes | `dnaRepair.ts` |
| Fidelity LLM repair | 1 round (itself up to 3 attempts) | No | Yes | Yes | `generateContentPackage.ts` |
| Story LLM repair | 1 round | No | Yes | Yes | same |
| Product demo repair | **0** (hard fail) | — | — | — | same :1211 |
| Content-package worker trigger | 1 | No | Yes | Yes | `content-package-worker/client.ts` |
| n8n generate HTTP | maxTries 3 | n8n | Yes | Can re-enter handler | bridge JSON |
| n8n start-video | maxTries 3 | n8n | Yes | Claim usually no-ops | bridge |
| Settle DB | 3 | No | Yes | No AI | `settleProductionRunItem.ts:21` |
| TTS tail validation | 3 | No | Yes | Yes TTS (+Whisper) | `ttsTailValidation.ts:12` |
| Image moderation retry | 1 then local fallback | No | Yes | Yes then free fallback | moderation helper |
| Storage upload | 3 (env ≤5) | No | Yes | Storage ops | storage helper |
| Translation trigger | 3 | No | Yes | Trigger only | `translationJobs.ts:88` |
| Identity collision | 64 | No | Yes | No | `resolveCreativeIdentity.ts` |
| Carrier collision | 32 | No | Yes | No | `resolveVisualNarrative.ts` |
| Video scene stills | ≤5 scenes | Spec | — | Per scene | `storyboard.ts` |

**Unbounded loops:** none found on paid LLM paths. Cost risk is **nested multiplication of capped loops**.

---

## Nested multiplication (worst-case, actual constants)

### Creative Engine (before Presentation)

```
Directions:     3 attempts × 3 transport = 9
Dir eval:       2×2 × 3 transport     = 12
Ideation:       2 rounds × 3 × 1      = 6
Critic:         2×2 × 3               = 12
DNA:            2 × 3                 = 6
CE subtotal Claude completes ≈ 45
```

### Presentation path

```
Presentation:     up to 3 attempts (transport 1)
Fidelity repair:  up to 3 attempts (if material fail)
Story repair:     up to 3 attempts (if hard fail)
Hook uniqueness:  up to 3 × 3 if each success is a duplicate
Presentation-ish Claude ≈ 9 + ≤9 hooks
```

### Per attempt OpenAI JSON repair (theoretical ceiling)

```
≤2 repairs × 3 HTTP transport per repair mode
× number of generateValidatedJson attempts on package path
```

### Video (per package after persist)

```
Images: ≤5 stills × (1 gen + 1 moderation retry) = ≤10 image gens
TTS:    ≤3
Whisper: typically per TTS attempt used
Upload: ≤3
```

### Combined formula (operator-facing)

```
Worst Claude completes / package attempt ≈ CE(45) + Presentation/repairs/hooks(≤18) ≈ ≤63
× concurrent n8n retries that both miss pre-check (up to 3 overlapping) → extreme ceiling
Then + video images≤10 + TTS≤3
```

Practical note: concurrent triple full CE is rare (requires overlapping slow requests); **single-path CE+Presentation+one repair** is the common expensive path. Real-run waste was dominated by **failed packages after paid work**, not infinite loops (`cost-trace-c8dd3caf`).

---

## Dangerous patterns

| Pattern | Reachability | Notes |
|---------|--------------|-------|
| Unbounded recursion | **Not reachable** | All LLM loops capped |
| Nested retry multiplication | **Confirmed** | CE × Presentation × repairs × video |
| Retry after terminal cancel (video completed) | **Blocked** | App + trigger 023 |
| Retry after cancel (in-flight package) | **Confirmed** | Generation continues; no abort |
| Validator → repair → validator unclear limit | **Bounded** | Fidelity/story one repair then hard fail; PDI zero repair |
| JSON repair then full content repair | **Confirmed** | JSON inside each attempt; then separate fidelity/story full regenerations |
| Video retry regenerates images/voice | **Likely** | If render_spec/stills absent on retry |
| In-memory counters only | **Confirmed** | Process restart resets attempt counts (new request) |
| n8n retries × generation attempts | **Confirmed** | Separate layers; package unique prevents double persist, not double AI |

---

## Termination conditions that work

- `generateValidatedJson` returns `generation_failed` after maxAttempts.  
- Hard fidelity/story/PDI returns without persist.  
- Settlement marks run item failed so slot closes.  
- TTS throws after 3.  
- Image moderation falls back locally (stops paid image loop).

---

## Successful result discarded?

| Case | Discard? |
|------|----------|
| Presentation OK → fidelity hard fail | Yes — never persisted |
| Package persisted → video failed | Package kept; video slot failed |
| Upload OK → completed callback fail → failed status | Artifacts exist; DB marks failed (**Confirmed**) |
| Cancel after worker nearly done | If still processing → failed; if already completed → kept |
