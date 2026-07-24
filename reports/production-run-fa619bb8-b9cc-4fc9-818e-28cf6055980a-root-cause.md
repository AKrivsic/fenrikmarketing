# Production Run Root Cause Analysis

Run: `fa619bb8-b9cc-4fc9-818e-28cf6055980a`  
Package: `2a686bdb-5eae-453b-ba5a-91d0227c14af`  
Method: read-only · DB + export + code path proof · 2026-07-24

---

# Executive Summary

Almost every expensive or visible failure on this run traces to **policy collisions**, not random provider flakiness. Story Integrity burned **$0.234 / ~6.2 minutes** repairing `primary_actor_changed` on a hands-only opening that the selected concept itself required — then soft-continued the **unchanged** original package. Scene 1 lost “BOUNCE RATE” because the worker **sanitizer strips any clause containing “word/letters/text”** and appends a hard no-text directive, so the image model never saw the board text. The last scene feels long because **5 storyboard beats were mapped onto 4 stills**, pinning beats 4+5 (plus a 1.5s silent tail) onto scene 4 (~10s / ~42% of the video). Six JSON Repairs were not a separate presentation problem — they were **nested OpenAI fixes inside three failed Story Integrity Repair Claude attempts**. TTS failed for a real truncated tail, then recovered; failed-attempt spend was never persisted because telemetry is only written on the success path.

---

# Root Cause Analysis

## Issue 1 — Final scene is too long

### Symptom
Last visual (product laptop) stays on screen much longer than scenes 1–3.

### Chain of events
1. TTS speech duration = **22.2s**.
2. `buildStoryboard` sets `numBeats = clamp(round(22.2/3), 3, 5)` → **5 beats**.
3. Package has only **4 stills** (`explicitSceneOrder: true`).
4. `sceneIdForStoryboardBeat` when `numBeats > n` and `beatIndex >= n` returns **the last scene** for overflow beats.
5. Product `framed_laptop` forces `motion=static`, `motion_intent=HOLD` on those beats (feels even longer).
6. `TAIL_BUFFER_SECONDS = 1.5` is added to the **last beat** (already on scene 4).
7. Renderer pads audio by the same 1.5s → final video **23.7s**.

### Reconstructed actual beat timeline (code-replayed)

| Beat | Scene | Role | Duration | Spoken segment |
| --- | --- | --- | --- | --- |
| beat-1 | scene-1 | hook | **6.66s** | Hook + bounce-rate definition sentences |
| beat-2 | scene-2 | hook | **4.83s** | “That's it.” |
| beat-3 | scene-3 | setup | **3.74s** | “Every bounce is a conversation…” |
| beat-4 | scene-4 | escalation | **5.27s** | “Your website was silent…” |
| beat-5 | scene-4 | resolution | **4.80s** (includes +1.5s tail) | “That silence is the real metric…” |

**Per-scene on-screen (approx):**

| Scene | Planned in render_spec | Actual on-screen |
| --- | --- | --- |
| 1 | 4s placeholder | ~6.7s |
| 2 | 4s | ~4.8s |
| 3 | 4s | ~3.7s |
| 4 | 4s (“seconds 17–22” in prompt ≈ 5s intent) | **~10.1s** |

`render_spec.scenes[].duration_seconds = 4` is the **default still placeholder**, not the FFmpeg timeline. Audio-master storyboard overrides it.

### Voiceover / subtitle windows
- Speech: 0.00 → 22.20
- SRT last cue end: 22.10
- Silent tail hold: 22.20 → 23.70 (scene 4 still visible, static)

### Was it intentional?
**Partially intentional, poorly composed:**
- Tail buffer is intentional (CTA hold).
- Mapping overflow beats onto the last still is intentional code, but it **over-extends the product shot** whenever beat count exceeds still count.
- Duration planner did **not** aim for a long resolution; RESOLUTION weight is 0.75 (shortest role). Length comes from **beat duplication + tail**, not from wanting a long CTA.

### Origin component
`lib/video-engine/storyboard.ts` (`numBeats`, `sceneIdForStoryboardBeat`, `TAIL_BUFFER_SECONDS`) + product static HOLD.

### Expected or bug?
**Design smell / pacing bug.** Correct relative to current code; wrong relative to creative intent (“seconds 17–22”).

### Impact
- Quality: **MAJOR** (ending drags; CTA covered longer by subs)
- Time: negligible (no extra provider wait)
- Cost: $0

### Smallest fix
When `numBeats > sceneCount` under `explicitSceneOrder`, **cap beats to sceneCount** (or distribute overflow across earlier scenes) instead of pinning all overflow to the last still. Keep the 1.5s tail.

---

## Issue 2 — First scene visual failure

### Symptom
Narration/storyboard wants half-written “BOUNCE RATE”; image shows a meaningless squiggle.

### Quotes

**Candidate openingSituation (source of truth):**
> A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written when the hand stops.

**Generated image_prompt (Presentation):**
> …the word 'BOUNCE RATE' is half-formed, the final letters unfinished… **No readable text rendered — the partial word is suggested by the marker position and gesture, not legible letters.**

**What the image model actually received** (`sanitizeImagePrompt`):
> Clean flat illustration… tight crop on hands and whiteboard surface, The marker is frozen mid-stroke… **Important: do NOT render any readable text, words, letters, numbers…**

The clause containing “word 'BOUNCE RATE'” and “letters” was **deleted** by `TEXT_REQUEST_PATTERNS` (`/\bwords?\b/`, `/\bletters?\b/`, `/\btext\b/`).

### Chain of events
1. Creative concept intentionally opens on board text.
2. Presentation prompt policy + Claude self-contradiction: request text **and** ban readable text.
3. Worker sanitizer (Subtitle Reliability Part C) strips text-request clauses and appends `NO_TEXT_DIRECTIVE`.
4. Model correctly draws a hand + abstract mark.
5. Regenerating the same prompt path would **not** reliably fix it.

### Origin
`video-worker/services/imagePrompt.ts` sanitizer colliding with text-on-board creative concepts. Reinforced by presentation “never readable text” instructions (`lib/visual-medium/imagePromptMedium.ts`, package VISUAL BEATS).

### Expected or bug?
**Systematic prompt-design / policy collision.** Model did not “ignore” the prompt; the decisive text was removed before the call.

### Impact
- Quality: **MAJOR** (hook visual fails)
- Time: $0 / 0
- Cost: $0 (image still paid once)

### Smallest fix
Allow an allowlist for **partial board glyphs** (e.g. `partial_word_glyph` / `illegible_letterforms`) that sanitizer keeps, **or** rewrite board-text openings into non-text visual metaphors before image gen (marker freeze without naming letters). Do not “just regen.”

---

## Issue 3 — Story Repair cost (~$0.234)

### Exact trigger (persisted + revalidated)
```
code: primary_actor_changed
message: Primary actor from selected concept missing from opening scene
evidence: expected one of: marketing, consultant, teaches, analytics
sceneIndex: 0
```

### Why that fired
- `mainCharacter` = “A **marketing consultant** who **teaches analytics**…”
- Opening scene (by design) = **hand + marker only** (matches `openingSituation` and `hands_focus`)
- Checker looks for consultant/marketing tokens in scene 0 → hard fail

### What entered repair
Full RepairDelta prompt: winner + integrity violations + prior package + immutable packs. Claude full-package regenerate (not “delete 3 words”).

### Attempts / tokens / time
| Metric | Value |
| --- | --- |
| Telemetry step | Story Integrity Repair |
| `retry_count` | 2 → **3 Claude attempts** (`maxAttempts=3`) |
| Duration | **371,851 ms (~6.2 min)** |
| Prompt tokens | 16,731 |
| Completion tokens | 12,288 |
| Stored cost | **$0.234513** |
| Final guardrail error | `voiceover_text is 83 words; hard cap is 80` |
| Outcome | Repair **failed**; package **soft-continued unchanged** |

`primary_actor_changed` is in `STORY_INTEGRITY_SOFT_AFTER_REPAIR_CODES`, so after the failed repair the workflow **ships the original package anyway**.

### Why not prevented earlier?
- Presentation/candidate intentionally chose hands-only open.
- Integrity gate does not honor `openingSituation` / hands-focus as satisfying the actor.
- Word cap (80) is only enforced in guardrails **after** expensive regenerate, not as a deterministic trim.

### Why couldn’t repair just remove 3 words?
Repair path is **full package JSON regenerate** via `generateValidatedJson`, not a surgical VO editor. Claude rewrote content to ~83 words and failed the hard cap.

### Could this be deterministic?
**Yes.** For this violation class:
1. Soft-skip repair when openingSituation is already hand/prop-led, **or**
2. Treat `primary_actor_changed` as soft **before** repair when scene0 contains hand/marker and DNA implies hands-focus, **or**
3. Deterministic VO trim to ≤80 words if that were the only issue (here it was not the original issue).

### Waste
- Money: **$0.234** (≈29% of full run recorded cost) with **zero output change**
- Time: **~6.2 min** on critical path
- Nested JSON repairs (Issue 4) are part of this same window

### Expected or bug?
**Product bug / false-positive hard gate** that then spends real money before soft-continuing.

---

## Issue 4 — Six JSON Repairs

### What they were
Not six independent presentation failures. They are **nested OpenAI `JSON Repair` calls inside Story Integrity Repair’s 3 Claude attempts** (`lib/ai/runWithRepair.ts`: parse repair and/or schema repair and/or guardrail repair per attempt).

Observed pattern (timestamps):

| # | Window (UTC) | Duration | Cost |
| --- | --- | --- | --- |
| 1 | 22:35:58–22:36:28 | 29.6s | $0.002727 |
| 2 | 22:36:28–22:36:53 | 25.6s | $0.002510 |
| 3 | 22:37:59–22:38:29 | 29.9s | $0.002744 |
| 4 | 22:38:29–22:38:57 | 27.3s | $0.002511 |
| 5 | 22:40:01–22:40:30 | 29.0s | $0.002764 |
| 6 | 22:40:30–22:41:05 | 35.1s | $0.002532 |
| **Sum** | | **~176s** | **$0.015788** |

Gaps of ~65s between pairs = Claude regenerate attempts.

### Exact failure types
Telemetry only stores generic “Broken model output / Validation issues”. **Final** known failure on the parent step: **guardrail** `voiceover_text is 83 words` (not invalid JSON). Intermediate attempts almost certainly mix:
- schema/shape mismatches from full-package rewrite, and/or
- guardrail failures (word cap / other)

**Missing evidence:** per-repair `validationErrors` arrays are not persisted on the JSON Repair steps—only on the terminal failed parent in `error_message`/`warnings`.

### Prevention
Fixing Issue 3 (don’t run this repair) removes all six. Secondary: deterministic VO clamp; tighter repair delta (VO-only) so Claude emits less broken full JSON.

### Impact
- Extra latency: **~3.0 min** (subset of the 6.2 min repair)
- Extra cost: **$0.016**
- Quality: none (repair discarded)

---

## Issue 5 — TTS failure

### Why validation failed
Expected tail tokens from last sentence: `["and","its","fixable"]`  
Whisper transcript tails (3 attempts): ended at `… silence is the real metric` — **last sentence not present**.

Durations of failed audio: 21.2s / 23.3s / 21.3s (similar to success 22.2s) → not a catastrophic truncate of the whole file; the **closing clause was missing or unheard**.

### Retry justified?
**Yes.** After 3 failures (`TTS_TAIL_VALIDATION_MAX_ATTEMPTS`), job failed; auto job #2 (`retry_of`) passed on attempt 1.

### Avoidable?
Partially. Options: stronger TTS instruction to always finish the final sentence; treat very short final sentences as attached to previous; or 2 attempts instead of 3 if historical pass@2 is high.

### Time / money
| | |
| --- | --- |
| Job #1 wall | 22:41:08 → 22:41:33 (**~24s**) |
| Gap to job #2 claim | → 22:42:30 (**~57s** queue/dispatch) |
| Failed TTS recorded cost | **$0.00** |
| Offline estimate (same $/char as success) | **3 × $0.005175 = $0.015525** (+ Whisper on each attempt, also unmetered on fail path) |

### Why failed attempts missing from telemetry?
On `TtsTailValidationError`, callback debug stores **only** TTS-tail meta. `generation_telemetry` is assembled **only after successful render** (`jobRunner` success path). Failed `withTelemetry(TTS/Whisper)` steps never get persisted to `video_jobs.output`.

**Bug:** accounting gap on the failure path (expected validation behavior, unexpected cost blindness).

---

## Issue 6 — Total execution time

### Critical path (package create → video done)

| Phase | Start→End (UTC) | Duration | Class |
| --- | --- | --- | --- |
| Weekly Strategy | 22:28:04–10 | 5s | work |
| Direction gen+eval | 22:28:14–29:48 | ~1.5 min | work |
| Creative Ideation | 22:29:48–33:15 | **~3.4 min** | work (large) |
| Creative Evaluation | 22:33:15–33:45 | 30s | work |
| Presentation Generation | 22:33:45–34:53 | ~1.1 min | work |
| **Story Integrity Repair + nested JSON** | 22:34:53–41:05 | **~6.2 min** | **waste** |
| Persist + settle run completed | 22:41:05–09 | 4s | work |
| Video job #1 TTS fail ×3 | 22:41:08–33 | 24s | retry |
| Queue / heal gap | 22:41:33–42:30 | **~57s** | wait |
| Job #2 TTS+Whisper | 22:42:30–37 | ~7s | work |
| Image gen ×3 | 22:42:37–44:05 | **~1.5 min** | work |
| FFmpeg render | 22:44:05–46:33 | **~2.5 min** | work |
| Callback complete | 22:46:38 | — | work |

**Approximate split (to first successful video):**
- Useful AI/package work: ~6–7 min
- **Repair waste: ~6.2 min**
- Video media work: ~4.5 min
- Retry/queue: ~1.4 min

### Biggest single time loss
**Story Integrity Repair false-positive path (~6.2 min).**

### Single optimization that saves the most minutes
**Do not invoke Story Integrity Repair for `primary_actor_changed` when the selected opening is already hand/prop-led (or soft-classify it pre-repair).** Expected save: **~6 minutes + $0.23 per occurrence**, with no quality loss on this run (output identical).

Secondary time win: cap beats to still count (Issue 1) — quality only, not minutes.

---

# Timeline Analysis

Where time was spent (package+video to success):

1. **Story repair waste — ~33%** of create→video wall (~18.6 min)
2. Creative Ideation — ~18%
3. FFmpeg — ~13%
4. Images — ~8%
5. Presentation — ~6%
6. TTS retry + queue — ~7%
7. Everything else — remainder

Idle/wait that mattered: **~57s** between failed job terminal and retry claim (not the dominant loss).

---

# Cost Waste Analysis

| Waste | Recorded $ | Notes |
| --- | --- | --- |
| Story Integrity Repair (failed, no output change) | **$0.234513** | Dominant |
| Nested JSON Repair ×6 | **$0.015788** | Inside story repair |
| Failed TTS ×3 + Whisper ×3 | **$0.00 recorded** (~$0.016 TTS est.) | Telemetry gap |
| Successful media (necessary) | $0.133395 | Not waste |
| Useful package AI | ~$0.43 | Not waste |

**Recorded run $0.815**; **provable wasted recorded ≈ $0.250** (31%).

---

# Quality Impact

| Issue | Reduces customer value? | How |
| --- | --- | --- |
| Last scene too long | **Yes** | Ending drags; product CTA under subs longer |
| Scene 1 squiggle | **Yes** | Hook visual does not communicate the idea |
| Story repair | **No direct** | Money/time only; shipped package unchanged |
| JSON repair | **No** | Nested cost of above |
| TTS fail+retry | **No** (after recovery) | Latency only; final VO OK |

---

# Recommended Fix Order

| Priority | Issue | Reason | Time saved | Cost saved | Quality |
| --- | --- | --- | --- | --- | --- |
| **P0** | Story Integrity false repair on hands-openings | Largest $ and minutes for zero gain; multiplies on 14-pack | ~6 min/pkg when hit | ~$0.23/pkg when hit | None (stops waste) |
| **P0** | Image sanitizer vs board-text concepts | Breaks intentional hooks systematically | 0 | 0 | High |
| **P1** | Beats > stills pins last scene | Systematic long endings | 0 | 0 | High pacing |
| **P1** | Persist TTS/Whisper telemetry on failed jobs | Overnight cost blindness | 0 | visibility of ~$0.02+/fail | Ops |
| **P2** | TTS final-sentence robustness | Cuts retry rate | ~1 min when hit | ~$0.016 when hit | Stability |
| **P3** | Persist JSON Repair validation issue details | Debuggability only | 0 | 0 | Ops |

---

# Biggest Win

**Fix only this next: stop paying for Story Integrity Repair on `primary_actor_changed` when the concept’s opening is already hand/prop-led (soft-classify pre-repair or skip repair).**

Why:
- On this run it consumed **$0.234** and **6.2 minutes**
- Final customer package was **identical** to pre-repair
- Soft-after-repair policy already admits the violation is non-fatal — the bug is spending Claude first
- On a 14-package night, if even ~30–50% hit similar actor/opening mismatches, expect **~$1–1.6 and ~30–45 min** burned for nothing

How (smallest):
In `classifyStoryIntegrityForHardFail` / repair trigger: if `openingSituation` or scene0 is hand/marker/prop close-up matching candidate opening, treat `primary_actor_changed` as **soft before repair** (do not call `generateValidatedJson` for Story Integrity Repair).

ROI: maximum dollars + minutes recovered per line of code; no elegance required.

---

## Evidence gaps (explicit)

| Gap | Impact on certainty |
| --- | --- |
| Per-JSON-Repair issue arrays not stored | Intermediate fail reasons inferred from timing pattern + final 83-word error; pair structure is proven, exact schema messages are not |
| Failed-job Whisper costs | Estimated only; not in DB |
| Exact provider reason TTS omitted last sentence | Cannot prove model vs ASR; only that transcript lacked the tail while duration stayed similar |

Everything else above is proven from persisted artifacts + executable code paths.
