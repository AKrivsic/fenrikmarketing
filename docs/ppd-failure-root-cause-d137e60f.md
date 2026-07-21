# Root Cause Investigation — Failed packages in run `d137e60f`

**Date:** 2026-07-21  
**Scope:** Why the two failed packages failed — not how to fix them.  
**Run:** `d137e60f-b43f-4a11-b77e-b1bfd3410a1a`  
**n8n:** workflow `NAKo5V3Ctlq5aW4i`, execution `153`

| Label in this doc | Strategy slot | Strategy item | Topic |
|---|---|---|---|
| **Package 1** (Claude 529) | `package_index` 1 | `e4956368-9d21-4d09-8b0f-4856ebbcb33c` | SaaS founder answering the same five questions daily |
| **Package 2** (Story Integrity) | `package_index` 3 | `10f9e9f0-5ca9-4019-bc41-6c431ab3e81e` | What happens when the website starts answering on its own |

---

# Package 1 — Operational failure (Claude 529)

## 1. Timeline

```
09:46:40  production_run created (4 slots)
09:47:01  n8n execution 153 starts; reads 4 strategy items
09:47:01  Loop item 0 → Generate Content Package
          → SUCCESS → af5dbd64 (after-hours clone)
09:49:xx  Start Video Job for package 0

~09:49–09:57  Loop item 1 → Generate Content Package
              strategy_item = e4956368 (SaaS founder / five questions)
              wall clock ≈ 444.8s
              → HTTP 422 body:
                 ok: false
                 error: operational_failure
                 attempts: 1
                 message: Claude request failed (529) Overloaded
                          request_id=req_011CdF19wY8Hx8Y2U75ydyUG

              API path: settleProductionRunItemOrThrow intended
              → mark items[package_index=1] failed

~09:57–10:00  Loop continues (N3b false branch → loop)
              Loop item 2 → SUCCESS → 4a08a893

~10:08      Video for 4a08 completes
              → reconcileProductionRunForContentItem
              → syncRunItemsAndCounters maps packages by created order:
                   items[0] ← af5dbd64 (completed)
                   items[1] ← 4a08a893 (completed)   ← overwrites slot 1
                   items[2] ← (nothing) → stays queued
                   items[3] ← later story_integrity failure

Final DB:   2 completed, 1 failed (story), 1 queued (orphan)
            strategy item e4956368 has NO content_package
            run status still "running"
```

### What “the request” was

This was **not** a random background call. It was the normal inline Claude call inside `runGenerateContentPackage` for strategy item `e4956368`, invoked by n8n node **N3 — Generate Content Package**.

Deterministic steps before any Claude call:

1. Idempotence check (no existing package)
2. Load project / strategy / assets / anti-repetition memory
3. Creative Candidates (deterministic templates + scoring)
4. Narrative Beats (deterministic)
5. PPD resolve (deterministic)

First Claude-backed step:

6. **Presentation Generation** (`generateValidatedJson` → `ClaudeProvider.complete`)

Optional later Claude-backed steps (only if Presentation returned a valid package):

7. Concept Fidelity Repair (if fidelity fails)
8. Story Integrity Repair (if story integrity fails)

**Which step threw the 529?**

There is no persisted telemetry for this failure (telemetry is written onto `package_brief` only at Persist). What we know:

- Error classification is `operational_failure` with `attempts: 1`
- That classification is produced only when an exception escapes `runGenerateContentPackage` and is mapped by `classifyGenerationThrow` — **not** when `generateValidatedJson` returns `{ ok: false, error: "generation_failed" }`
- Inside `generateValidatedJson`, `textProvider.complete()` is **not** wrapped in try/catch. A Claude HTTP error throws out of the whole validation loop.
- `GENERATE_CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS = 1` (explicitly: do not stack HTTP retries under the 300s n8n/Vercel budget)
- Wall clock **444s** is longer than a single Presentation on sister packages (~60–70s) and similar to Presentation + a repair cycle

**Most likely:** Claude 529 occurred on a Claude `messages` call during this package’s generation — either a Presentation Generation validation-retry attempt, or (if Presentation had already returned valid JSON) Concept Fidelity Repair / Story Integrity Repair. In all cases the throw aborted the workflow before Persist.

**Least important fact (already known):** Anthropic returned overloaded / 529.

---

## 2. Root cause

### Immediate cause

Anthropic rejected one Claude Messages API call with **529 Overloaded** during package generation for strategy item `e4956368`.

### Why that became a permanent package loss

The permanent loss is **not** “Claude was busy.” It is the combination of:

1. **Transport policy refuses to recover from 529**
   - Per package-generation call: `maxTransportAttempts = 1`
   - Even the shared HTTP retry helper only retries statuses `{429, 500, 502, 503, 504}` — **529 is not in that set**
   - So a 529 is treated as a hard terminal provider response on the first try

2. **Provider throw aborts the validation/repair loop**
   - `generateValidatedJson` can retry up to 3 times on *parse/schema/guardrail* failure
   - It cannot retry when `complete()` throws — the exception leaves the function entirely
   - Outer catch maps that to `operational_failure` with default `attempts: 1`

3. **No model fallback**
   - Copywriting provider is Claude only (`getCopywritingProvider()` / `ClaudeProvider`)
   - There is no secondary model path for Presentation Generation or repairs

4. **n8n does not retry the same strategy item**
   - Loop behavior: on Generate failure → N3b “not ok” → continue to **next** package
   - Observed: after 529, loop proceeded to accountant package (index 2), never re-queued index 1

5. **Bookkeeping then erased the failure slot**
   - Failure settlement targets `production_run_items[package_index]` (index 1)
   - Later, when successful videos finish, `reconcile` → `syncRunItemsAndCounters` assigns completed packages onto run items **by created order**, not by `package_index` / strategy item
   - With two successful packages, `items[1]` is overwritten to the second success (`4a08a893`)
   - Final visible state: one `queued` orphan + one `failed` (the *other* package) — the 529 package looks like it “never happened” on the run board, while strategy item `e4956368` remains packageless

### Real reason the package was permanently lost

**The system had no recovery path after a single Claude overload, and the run’s reconcile model cannot preserve a generation failure once later packages succeed into earlier slots.**

Claude 529 was the trigger. The architecture turned a transient provider blip into a permanently missing strategy item.

---

## 3. Why the system could not recover

| Recovery mechanism | Expected? | What actually happened |
|---|---|---|
| HTTP transport retry on 529 | Reasonable for overload | Disabled (`maxTransportAttempts=1`) and 529 not retryable in helper |
| Validation-loop retry after throw | No — throws abort | Exception → `operational_failure` |
| Alternate model | No | Claude-only |
| n8n re-attempt same strategy item | No | Loop advances |
| Operator auto-regenerate | No | Nothing enqueued |
| Settlement preserves failed slot | Intended | Likely marked, then reconcile overwrote slot 1 with later success |

Could another model have been used? **Not with current wiring.**  
Could the package have been regenerated automatically? **No.** Manual re-trigger of that strategy item would be required — and nothing in this run did that.

---

## 4. Ideal behaviour (understanding only — not a fix proposal)

After a transient provider overload on package generation:

1. Retry the same Claude call with backoff (529 treated as transient)
2. If still failing, optionally fall back to a secondary model **or** re-queue the same strategy item once
3. Mark the **correct** run slot failed in a way reconcile cannot overwrite with an unrelated later package
4. Keep `package_index` ↔ strategy item ↔ run item aligned until terminal success/failure
5. Close the run when every strategy item is terminal (no orphan `queued`)

---

# Package 2 — Story Integrity rejection

## 1. Timeline (Creative Candidate → … → Story Integrity)

Strategy item `10f9e9f0` · funnel **solution_aware** · topic: walkthrough of website answering from the first minute.

No package row was persisted (hard-fail before Persist). Reconstruction uses:

- Full `validation_errors` on the failed run item
- Deterministic creative candidate simulation with the same topic/angle/product strings
- Code path order in `generateContentPackage.ts`

```
Creative Candidate (deterministic)
  topic signals → world: web_service
  industryCue incorrectly becomes product-ish (“AI website assistant”)
  topicAnchors include “chatbot”
  template pool picks WEB_SERVICE night template
  Winner: c7-visual_exaggeration-div
  hookLine: “After hours, chats still screaming.”
  openingSituation ≈ night + security light + unanswered chats
                   (product name jammed into industryCue slot)
  DNA mainCharacter ≈ fallback “recurring subject of: Night: AI website chat assistant…”
        ↓
Narrative Beats (deterministic)
  HOOK → SETUP → ESCALATION → RESOLUTION
  (generic beat machine; does not fix wrong commercial world)
        ↓
PPD (deterministic)
  presentation_class: ABSTRACT_MECHANISM (same pattern as other Fenrik PPD packages)
  forbids synthetic product UI / fake screenshots
  does NOT introduce fog/silhouettes; it constrains how product may appear later
        ↓
Presentation Generation (Claude)
  Writes voiceover + visual_scenes under:
    - selected night after-hours world
    - ABSTRACT_MECHANISM product rules
    - solution_aware “walkthrough” strategy angle (conflicting brief)
  Observed symptoms in final SI errors:
    - opening scene: night service-business interior (no “chatbot” token)
    - middle scene_1: still night-business framing BUT trips fog_silhouettes
      (prompt contained silhouette/ghosted/translucent-figure language)
        ↓
Story Integrity (deterministic) — FIRST HARD FAIL
  Violations (all hard):
  1) abstract_metaphor_in_middle.scene_1
     Middle invents forbidden pattern “fog_silhouettes”
     not authorized by selected concept
  2) primary_actor_changed.scene_0
     Opening missing primary actor tokens — expected one of: chatbot
  3) location_changed_without_reason.scene_1
     Same middle scene treated as unjustified world relocate
     (foreign forbidden pattern ⇒ location violation)
        ↓
Story Integrity Repair (Claude, one shot)
  Prompt appendix: keep selected world, no mid-arc silhouettes,
  keep primary actor continuous, show value proof without fake UI
  Wall clock for whole N3 ≈ 387s (Presentation + repair class duration)
        ↓
Story Integrity re-check
  Still failed (same class of violations returned to client)
        ↓
Terminal: generation_failed, attempts: 1
  settle → production_run_items[3] = failed
  No package persisted
```

Terminal error (abbreviated):

```json
{
  "error": "generation_failure",
  "attempts": 1,
  "validation_errors": [
    {
      "path": "story_integrity.abstract_metaphor_in_middle.scene_1",
      "message": "Middle scene invents forbidden world pattern \"fog_silhouettes\" ..."
    },
    {
      "path": "story_integrity.primary_actor_changed.scene_0",
      "message": "Primary actor from selected concept missing from opening scene (expected one of: chatbot)"
    },
    {
      "path": "story_integrity.location_changed_without_reason.scene_1",
      "message": "Scene relocates to a setting not justified by the selected opening world ..."
    }
  ]
}
```

---

## 2. First moment the story became inconsistent

### The first break is **before** Story Integrity — at Creative Candidate selection.

**What changed**

For a **solution_aware walkthrough** strategy item (“what happens when the site starts answering”), the deterministic creative layer selected the same **after-hours problem metaphor** winner used elsewhere:

- `c7-visual_exaggeration-div`
- hook: **“After hours, chats still screaming.”**

That is a **problem/atmosphere** commercial world, not a solution walkthrough world.

**Why it changed (mechanism)**

1. `extractTopicConcreteSignals` for this topic marks `world: web_service` and puts **“chatbot”** into topic anchors (product language in the topic/product brain).
2. `industryCue` resolves toward the **product label** (“AI website assistant”), not a human industry setting.
3. WEB_SERVICE night template literally does:  
   `Night: ${industryCue} dark; security light… unanswered chats…`  
   → opening situation becomes a corrupted hybrid of product name + night tablet world.
4. Scoring still prefers this `visual_exaggeration` night candidate → it wins again.
5. DNA fallback then describes the main character poorly; Story Integrity’s actor tokenizer keeps tokens matching `/chat/` — which also matches the substring inside **`chatbot`** — so the gate expects actor token **`chatbot`** in scene 0.

So before Claude writes a single scene, the “selected commercial world” is already:

- wrong for the strategy funnel (solution walkthrough → problem night silence)
- lexically messy (product jammed into setting)
- actor-expecting “chatbot” while the visual world is an empty night shop

### Second break — Presentation Generation (first *scene* inconsistency)

Claude then tried to produce a board under that broken brief + PPD abstract constraints.

**What changed in scenes**

- Opening stayed in night service-business framing **without** carrying the actor token `chatbot`.
- A **middle** scene introduced **silhouette / ghosted / translucent-figure** language (`fog_silhouettes` pattern) while still sounding like the night interior — classic mid-arc metaphor escape the integrity rules exist to catch.

**Why**

Presentation Generation is asked to satisfy conflicting pressures:

- Candidate: hold after-hours screaming-chats world
- Strategy angle: solution walkthrough / responsive website proof
- PPD: no fake UI, abstract mechanism only
- Story Integrity prompt text: no mid-video metaphor escape; keep actor continuous

Under that conflict, the model invents atmospheric “absent visitors as silhouettes” instead of staying inside the selected concrete props — exactly the failure mode SI was written for (see `scripts/check-story-integrity.ts` “BEFORE: fog silhouettes mid-arc”).

### PPD’s role

PPD did **not** invent silhouettes.  
PPD **did** remove easy fake-UI product proof, which makes a solution_aware walkthrough harder to stage inside an after-hours problem candidate. That increases pressure on the scene writer; it is a contributing constraint, not the first inconsistency.

### Narrative beats’ role

Narrative beats only supply HOOK/SETUP/ESCALATION/RESOLUTION structure. They did not choose the world. They did not introduce silhouettes.

---

## 3. Root cause

**Primary root cause:**  
Creative Candidate selection assigned a **reused after-hours problem concept** (and a corrupted opening/DNA actor expectation of `chatbot`) to a **solution_aware walkthrough** strategy item. Presentation Generation then produced a board that violated that concept’s own continuity rules (missing actor in opening + silhouette metaphor in the middle). Story Integrity hard-failed after one repair.

**Is Story Integrity correct?**  
Yes. The three violations are consistent with the code:

- middle scene matched `fog_silhouettes`
- opening lacked required actor tokens derived from the selected concept
- same middle scene also fired `location_changed_without_reason` because forbidden-world patterns count as unjustified relocate

**Is SI masking an earlier bug?**  
**Yes — partially.** SI correctly rejected a bad board, but the deeper defect is upstream:

1. Wrong candidate/world for the strategy funnel  
2. Signal/template corruption (`industryCue` ← product name)  
3. Fragile actor-token matching (`chat` matching inside `chatbot`)  

SI is the **alarm**, not the **origin**.

---

## 4. Why the system could not recover

| Layer | Recovery available? | Outcome |
|---|---|---|
| Story Integrity Repair | Exactly **one** Claude regenerate with violation appendix | Ran; still failed SI |
| Second repair / candidate re-pick | No | Hard `generation_failed` |
| Fall back to another candidate winner | No | Winner stays locked from pre-Claude plan |
| Relax SI soft | No for these codes (all hard) | Terminal fail |
| n8n retry same item | No | Loop ends after item 3 failure |

`attempts: 1` here means the **Presentation Generation** validation attempt count on the last held draft was 1 — not “SI never tried.” The repair path is a separate Claude call; when repair returns a package that still fails SI, generation terminates.

---

## 5. Ideal behaviour (understanding only)

For this class of failure, ideal behaviour would have been:

1. Creative selection constrained by funnel/strategy (solution_aware cannot win a pure after-hours problem twin of package 0)
2. Clean world/actor DNA (no product name as `industryCue`; actor tokens that match what scenes can actually show)
3. If SI fails, repair **or** re-draw candidate once — not only rewrite scenes under the same broken winner
4. Persist failure telemetry (selected candidate id, scene prompts, SI evidence) even when Persist Package never runs — so this investigation does not require reconstruction

---

# Side-by-side summary

| | Package 1 (529) | Package 2 (Story Integrity) |
|---|---|---|
| Strategy intent | Diverse problem_aware (SaaS founder / 5 questions) | solution_aware walkthrough |
| Failure class | `operational_failure` | `generation_failed` |
| First broken moment | Provider call during generation | Creative Candidate world choice |
| Could auto-recover? | No (no 529 retry, no model fallback, no item re-queue) | No (one SI repair, then hard fail) |
| Why permanently lost | Transient overload + no retry + reconcile slot overwrite | Upstream concept/DNA mismatch; SI correctly blocked a incoherent board |
| Alarm vs origin | Alarm = 529; origin = recovery architecture | Alarm = SI; origin = candidate/signal pipeline |

---

# Bottom line

**Package 1** was lost because a **transient Claude overload** hit a generation path that is **explicitly configured not to retry**, with **no alternate model** and **no same-item re-queue**, and the run’s **reconcile-by-package-order** bookkeeping then **hid the failed slot**.

**Package 2** was rejected because Story Integrity saw a **real continuity break** (silhouettes mid-arc + missing `chatbot` actor) — but that break was the **symptom** of selecting the **wrong commercial world** (after-hours `c7`) for a **solution walkthrough** item, with **corrupted setting/actor DNA** feeding the gate. SI behaved as designed; the story was already inconsistent at candidate selection.
