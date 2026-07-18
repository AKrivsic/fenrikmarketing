# Sprint 4A — Story Integrity

Preserve the selected commercial concept throughout the entire storyboard.
The selected world may not collapse into unrelated metaphors.

**Run that motivated this:** `4633f34f-afce-4197-8cf9-79dce5ae2b72`  
(Selection v3 correctly chose `direct_product_world` handheld chat urgency, then mid-beats inventing fog silhouettes + mannequin glowing bubbles + landing-page-only “demo”.)

---

## 1. Architecture review

### Pipeline (ordered)

| # | Stage | File(s) | Inputs | Optional / ignored | Where it improvises |
| --- | --- | --- | --- | --- | --- |
| 1 | Creative Divergence | `lib/creative-candidates/divergence/*` | topic, angle, pain, product | — | Invents candidate worlds (intended) |
| 2 | Selection v3 | `scoreCandidates.ts`, `commercialScore.ts`, `comparativeJudge.ts` | candidates | — | Chooses winner; does not invent scenes |
| 3 | Narrative beats | `lib/narrative-beats/deriveBeats.ts` | winner | Mode beat labels | Text splits only — no new setting |
| 4 | Creative Identity | `lib/creative-identity/planForPackage.ts` | project + DNA (neutralize) | Catalog environments | Can propose conflicting environment (mitigated by DNA neutralize) |
| 5 | Visual Narrative | `lib/visual-narrative/planForPackage.ts` | project signals | **Does not receive winner/DNA** | Can invent subject_focus / metaphor carriers |
| 6 | Visual Medium / Profile | `lib/visual-medium/*`, `lib/visual-profile/*` | style | — | Look only |
| 7 | Product Reveal | `lib/product-reveal/planForPackage.ts` | product | — | Payoff framing |
| 8 | Attention originality | `lib/attention/planForPackage.ts` | topic/angle | **Does not receive winner/DNA** | **High risk** — invents opening visual concept injected *before* candidate block |
| 9 | LLM package | `generateContentPackage` prompt + schema | all prompt blocks | Soft DNA text | Invents `visual_scenes[]`, VO, hook |
| 10 | Concept fidelity | `fidelityCheck.ts` | winner + scene1 | Soft after 1 repair | Scene1 only — not full arc |
| 11 | **Story Integrity (new)** | `storyIntegrity.ts` | winner + all scenes + VO + package CTA | — | **Hard gate** — reject / repair / fail |
| 12 | Soft progression / DNA warns | narrative-beats + creativeDNA validators | package | Warnings only | Do not block |
| 13 | Worker storyboard | `lib/video-engine/storyboard.ts` | stills + VO timing | — | Timing/motion only — too late for world |

### Root cause of run `4633f34f`

Selection locked a commercial handheld-chat world. Stages 5/8/9 were still free to invent fog silhouettes and mannequin metaphors mid-arc. Fidelity only checked scene 1. Soft DNA validation warned, then continued.

---

## 2. Story Integrity changes

### Source of truth

`selectedCandidate` (+ `creativeDNA` when present) owns:

- world
- main character
- core conflict
- product role / ending
- allowed lexicon derived from those fields

### Prompt (pre-LLM)

`buildCreativeCandidatePromptBlock` now embeds `STORY INTEGRITY (story-integrity@1)`:

- stay inside selected world
- banned mid-arc metaphors unless selected (fog, silhouettes, airport, space, mannequin, analytics montage, …)
- require product demonstration: ask → AI answers → result
- landing page alone ≠ demo
- spoken close must match package CTA

### Hard validation (post-LLM)

`validateStoryIntegrity` runs after concept fidelity in:

- `lib/ai/workflows/generateContentPackage.ts`
- `lib/ai/workflows/regenerateContentPackage.ts`

Behavior:

1. Validate
2. If fail → one repair regenerate with `storyIntegrityRepairAppendix`
3. Re-validate
4. If still fail → **`generation_failed` with precise diagnostics** (does **not** silently persist)

Persisted on plan: `creative_candidates.storyIntegrity`.

---

## 3. Validation rules

| Code | Trigger |
| --- | --- |
| `abstract_metaphor_in_middle` | Middle scenes match banned patterns not present in selected concept |
| `primary_actor_changed` | Opening loses selected actor, or middle abandons actor/product world |
| `location_changed_without_reason` | Mid-beat relocates to forbidden/foreign setting |
| `main_conflict_disappeared` | Core conflict not recognizable in VO/visuals |
| `world_abandoned` | Selected world tokens missing across scenes |
| `product_demonstration_missing` | Missing ask → AI answer → result; or landing-page-only close |
| `cta_mismatch` | Imperative package CTA not present in spoken close (soft poetic ending fails) |

### Product demonstration (Fenrik)

Required explicit interaction in **non-landing** visuals:

1. Visitor asks / sends question  
2. AI/chatbot **replies/answers** (not merely “Create an AI assistant” hero copy)  
3. Result (stays / books / lead / answered)

Landing page / `yourcompany.com` / pricing hero alone → `landing_page_only` → fail.

---

## 4. Files changed

| File | Change |
| --- | --- |
| `lib/creative-candidates/storyIntegrity.ts` | **New** — lexicon, validation, prompt, repair appendix |
| `lib/creative-candidates/types.ts` | `storyIntegrity` on plan |
| `lib/creative-candidates/promptBlocks.ts` | Embed Story Integrity block; persist field |
| `lib/creative-candidates/planForPackage.ts` | `attachStoryIntegrityToPlan` |
| `lib/creative-candidates/index.ts` | Exports |
| `lib/ai/workflows/generateContentPackage.ts` | Hard gate + repair |
| `lib/ai/workflows/regenerateContentPackage.ts` | Same hard gate |
| `scripts/check-story-integrity.ts` | **New** tests |
| `scripts/check-creative-candidates.ts` | Expect 3 `generateValidatedJson` sites |
| `package.json` | `check:story-integrity` |
| `reports/sprint-4a-story-integrity.md` | This doc |

---

## 5. Examples before / after

### BEFORE (run `4633f34f` — would hard-fail now)

Selected world: visitor hands → urgent website question → seen/no reply.

| Beat | Shipped | Rule |
| --- | --- | --- |
| 1 | Hands + phone | OK |
| 2 | Empty chat bubble | OK (weak) |
| 3 | Fog silhouettes | `abstract_metaphor_in_middle` |
| 4 | Mannequin + glowing bubble | `abstract_metaphor_in_middle` |
| 5 | Fenrik landing page only | `product_demonstration_missing` |
| VO | Soft “deserves an answer…” | `cta_mismatch` vs “Create your AI assistant…” |

### AFTER (required shape)

| Beat | Required |
| --- | --- |
| 1 | Hands send booking question on website chat |
| 2 | Same thread: seen / waiting / no reply |
| 3 | **AI chatbot replies** with availability on that chat |
| 4 | Visitor stays / books / lead captured (same world) |
| 5 | Optional product UI **continuing** the chat world — not a disconnected hero |
| VO close | Speaks package CTA (“Create your AI assistant…”) |

Departure-board concepts remain allowed **only when selected** (pattern allow-list keyed to concept text).

---

## 6. Tests

```bash
npm run check:story-integrity
npm run check:creative-candidates
```

`check:story-integrity` covers:

- prompt embedding
- BEFORE package from `4633f34f` fails (metaphor + demo + CTA)
- AFTER continuous chat world passes
- landing page alone ≠ demo
- airport banned unless selected
- selected departure-board winner may keep airport imagery
- repair appendix diagnostics

---

## Remaining risks (not Sprint 4A scope)

- Attention originality still plans without winner input (prompt order risk). Hard validation catches the damage; wiring Attention to DNA is a follow-up.
- Visual Narrative still independent — same mitigation pattern.
- Worker image generation can still empty chat UI (readability) — Story Integrity checks prompts, not rendered pixels.
