# ROOT CAUSE AUDIT — VISUAL STORY COLLAPSE

**Run:** `2f896bec-05f1-4091-82b0-7e384894eef2`  
**Package:** `5adb5e92-e1db-4a7c-b6f1-0ed01aefb370`  
**Video job:** `f29496cb-6234-4a9a-b21b-bd8e33a1b910`  
**Mode:** READ ONLY — evidence only

---

## PRIMARY ROOT CAUSE (ONE ANSWER)

**Visual diversity was lost in: Prompt Builder**

**Component label:** Prompt Builder  
**Code:** `lib/ai/prompts/generateContentPackage.ts` → `buildGenerateContentPackagePrompt` → `visualBeatsLines`  
**Lines:** 662–675  
**Commit that introduced the mandate:** `8f43cdb` — *“Add Product Demonstration Integrity to force visual ask→answer→result (Sprint 4C)”* (2026-07-19)

### The exact decision

The package-generation prompt **mandates** that every still keep the same actor/phone conversation and that the package film a product-demo sequence on the **SAME** phone/thread:

```text
PRIMARY_ACTOR + CONVERSATION CONTINUITY (mandatory for every still):
- Lock one PRIMARY_ACTOR for the package (from Creative DNA / openingSituation).
- Every subsequent still must keep the SAME person OR continue the same phone/
  chat conversation that person started. …
- Prefer: same hands / same phone / same kitchen-or-street environment progressing
  the conversation — not a new lifestyle portrait each beat.

PRODUCT DEMONSTRATION STILLS (required sequence somewhere in the package):
1) Question — visitor typing/sending into website chat
2) Waiting — optional; seen / no reply yet on the SAME thread
3) Visible AI answer — reply appears on the SAME phone/chat
4) Visible useful result — …
```

The LLM Scene Planning stage then **obeyed that text literally**. Image prompts 2–4 (AI stills after scene 1) begin with:

> **“Same hands, same phone, same urban street exterior…”**

That phrase is not invented by the image model. It is execution of the Prompt Builder rule.

---

## SECONDARY EFFECTS (not first cause)

| Secondary | Role | Evidence |
| --- | --- | --- |
| Creative Candidate Selection | Chose hands-close-up world (`c4-direct_product_world-div`) as the locked opening | `selectionDiagnostics.winnerId` |
| Creative DNA | `immutableRules`: “Do not relocate the primary story away from: Handheld urgency: Close on a customer's hands…” | `selectedCandidate.creativeDNA` |
| storyProgression template | Every candidate gets `Hold the opening situation → widen…` | `buildCreativeCandidateFromSituation` |
| Creative Identity | Locks environment/lighting/mood/composition (urban street, overcast, centered) | `creative_identity.option_ids` |
| Divergence camera tweak | Prefixes many raw situations with `Handheld urgency:` | `expandWithVariants` in `generateRawSituations.ts:304` |
| Scene Planning (LLM) | Wrote the collapsed prompts | `visual_scenes` / `image_prompts` |
| Image Generation | Faithfully rendered already-collapsed prompts | stills match prompt subjects |
| Renderer | Composited stills; did not invent subject sameness | `image@1` / `product_demo@1` |

---

## 1. Pipeline reconstruction

### Shared upstream (package-level)

| Stage | Value for this run |
| --- | --- |
| Strategy topic | Owner discovers website turned away strangers |
| Strategy angle | Business-hours visitors leave unanswered (gap: open ≠ available) |
| Creative mode | `story` → beats `setup → conflict → twist → resolution → cta` |
| Selected candidate | `c4-direct_product_world-div` |
| openingSituation | Close on customer’s hands sending urgent question; “seen”, no answer |
| storyProgression | Hold opening → widen to after-hours silence → reveal pain → product answers |
| Creative DNA world | Handheld urgency / customer’s hands |
| Visual Narrative | human / conversation distance; situation-first (walk away / wait for reply) |
| Creative Identity | urban_street_soft + overcast_diffused + centered_headroom + reflective |
| Attention originality (selected) | **“Crossing out post more… say one true thing”** — **not used in scenes** |

### Per-scene chain (IMAGE / DEMO)

#### Scene 1 — IMAGE (`scene-1`)

| Layer | Content |
| --- | --- |
| Narrative beat | HOOK / setup — `anomaly\|open\|handheld_urgency_close_customer` |
| Scene / visual goal | Extreme close-up: hands + phone, message sent, empty reply space |
| Information goal | Something unusual: urgent question unanswered |
| Emotional goal | Urgency / tension |
| Creative candidate world | Hands / phone (selected) |
| Image prompt | Extreme close-up hands + smartphone + urban street + chat UI shapes |
| Generated image | Matches prompt (hands, phone, empty bubble, street) |

#### Scene 2 — IMAGE (`scene-2`)

| Layer | Content |
| --- | --- |
| Narrative beat | SETUP / conflict+twist — `problem_named\|open\|hold_opening_situation_widen` |
| Scene / visual goal | **Same hands, same phone, same street** — waiting, no reply |
| Information goal | Problem named / waiting cost |
| Emotional goal | Resignation / reflective pause |
| Image prompt | Explicitly “Same hands, same phone, same urban street…” |
| Generated image | Same framing family as scene 1 |

#### Scene 3 — IMAGE (`scene-3`)

| Layer | Content |
| --- | --- |
| Narrative beat | ESCALATION — `cost_rising\|open\|reveal_unable_answer_customer` |
| Scene / visual goal | **Same hands, same phone, same street** — thumb leaves chat |
| Information goal | Consequence: visitor leaves |
| Emotional goal | Quiet consequence |
| Image prompt | Explicitly “Same hands, same phone…” |
| Generated image | Same framing family |

#### Scene 4 — PRODUCT_DEMO (`scene-product-demo`)

| Layer | Content |
| --- | --- |
| Narrative beat | RESOLUTION role in creative_mode_beats |
| Scene / visual goal | Deterministic Fenrik.chat ask→answer→result UI |
| Renderer | `product_demo@1` (not AI photographic still) |
| Visual diversity vs 1–3/5 | **YES — different surface** (graphic chat UI) |

#### Scene 5 — IMAGE (`scene-5`)

| Layer | Content |
| --- | --- |
| Narrative beat | cta / solution close |
| Scene / visual goal | **Same hands, same phone, same street** — live reply bubbles |
| Image prompt | Explicitly “Same hands, same phone…” |
| Generated image | Same framing family as 1–3 |

---

## 2. Scene evolution table — where diversity dies

Compare scenes **1 vs 2 vs 3 vs 5** (IMAGE). Scene 4 PRODUCT_DEMO is a different renderer and is excluded from the collapse question except as proof the demo path can look different.

| Stage | Scene 1 | Scene 2 | Scene 3 | Scene 5 | Still different? |
| --- | --- | --- | --- | --- | --- |
| Strategy | shared package strategy | same | same | same | N/A (shared by design) |
| Creative Candidate slate (pre-select) | 6 different metaphors existed | — | — | — | **YES** (across candidates) |
| Selected Candidate / DNA world | hands/phone locked | same lock | same lock | same lock | **NO** (single world) |
| Narrative Beat role | HOOK | SETUP | ESCALATION | RESOLUTION/cta | **YES** |
| Information key | `anomaly\|…handheld…` | `problem_named\|…hold_opening…` | `cost_rising\|…` | `solution_shown\|…` | **YES** |
| Emotional intent | urgency | resignation | consequence | relief | **YES** |
| Attention originality concept | wall-plan “post more” selected package-wide | same unused concept | same | same | YES vs final scenes (unused) |
| Visual Narrative guidance | allows walk-away / two-person tension | same package guidance | same | same | **YES** (still permits diversity) |
| Creative Identity (env/light/mood/comp) | urban street / overcast / reflective / centered | same | same | same | **NO** |
| **Prompt Builder continuity + demo sequence** | mandates same actor/phone + demo steps on SAME thread | same mandate | same | same | **NO — FIRST HARD VISUAL FORBID** |
| Scene Planning / Image Prompt | hands+phone+street | “Same hands, same phone…” | “Same hands, same phone…” | “Same hands, same phone…” | **NO** |
| Image Generation | renders prompt 1 | renders prompt 2 | renders prompt 3 | renders prompt 5 | **NO** (follows prompts) |
| Renderer | image@1 | image@1 | image@1 | image@1 | N/A |

**First stage where scene-to-scene visual diversity is forbidden:** Prompt Builder (continuity + SAME-thread product-demo sequence).  
**First stage where that forbid becomes concrete artifacts:** Scene Planning / Image Prompt text.  
**Narrative / information layers were still different when visuals collapsed.**

Supporting diagnostics stored on the package:

- `visualProgressionDiagnostics.passed: true` (beat-level visual progression considered OK)
- `postLlmInformationProgression.passed: false` with  
  `items_1_and_2_same_information:waiting` and  
  `items_3_and_4_same_information:tokens:photographic_image_frame_same_hands`

Beats still intended progression; **post-LLM stills** did not.

---

## 3. Information progression audit

| Scene | New information (intended beat) | Visual change | Emotional change | Story progress | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | Urgent question sent; silence begins | Hands/phone established | Urgency | Open anomaly | NEW |
| 2 | Waiting / no reply (problem named) | Micro: phone lowered, cursor blinks | Resignation | Hold opening | **DUPLICATE surface** (`waiting` overlap 0.62 vs scene 1) |
| 3 | Visitor leaves / cost rises | Micro: thumb leaves chat | Quiet consequence | Escalation | PARTIAL (action new; subject/env duplicate) |
| 4 PRODUCT_DEMO | AI answers; outcome path | Full surface change (demo UI) | Resolution | Solution shown | NEW |
| 5 | Conversation continues with AI | Micro: reply bubbles on same phone | Relief | Close | **DUPLICATE surface** vs 1–3 (`same_hands` token overlap 0.61 vs scene 3 in post-LLM check) |

---

## 4. Visual progression audit

Required change axes vs IMAGE scenes 1,2,3,5:

| Axis | Changes across IMAGE scenes? | First stage that failed to request change |
| --- | --- | --- |
| Location | NO (urban street locked) | Creative Identity + Prompt Builder “same … street environment” |
| Subject | NO (hands) | Prompt Builder “same hands” |
| Composition | NO (centered 9:16 phone) | Creative Identity `centered_headroom` + Prompt Builder |
| Camera | Micro only (close-up family) | Prompt Builder continuity |
| Emotion | YES (urgency→resignation→consequence→relief) | — (survived) |
| Action | Micro YES (type→wait→leave→re-engage) | Prompt Builder kept action on same phone |
| Conflict | YES in beats; weak in stills | Scene Planning executed continuity over conflict staging |
| Environment | NO | Creative Identity `urban_street_soft` |
| Objects | NO (phone + chat UI) | Prompt Builder + product-demo SAME thread |
| Lighting | NO (overcast diffused) | Creative Identity |
| Perspective | NO (POV hands/phone) | Prompt Builder + selected opening |

**First stage that failed to request visual change:** Prompt Builder (mandatory continuity + SAME-thread demo sequence), after Narrative Beats had already requested information/emotion change.

---

## 5. Image prompt diff

### Common elements (all 4 AI prompts)

- Photorealistic photographic image  
- Portrait 9:16 vertical frame  
- Phone / chat UI (abstract, no readable text)  
- Soft-focus urban street exterior  
- Overcast diffused daylight  
- Warm neutral color feel  
- Hands as primary subject  

### Repeated structures

- Scene 1 establishes hands+phone+street  
- Scenes 2,3,5 open with **“Same hands, same phone…”** (literal continuity formula)

### Unique elements (micro only)

| Scene | Unique delta |
| --- | --- |
| 1 | Extreme close-up; sent bubble + empty waiting space; “No laptop, no desk, no office” |
| 2 | Phone lowered; blinking cursor; reflective pause mood |
| 3 | Thumb taps away; motion blur of chat closing; departure |
| 5 | Live reply bubbles; warm glow; relief mood |

### Similarity (token Jaccard)

| Pair | Jaccard |
| --- | ---: |
| 1 vs 2 | 0.264 |
| 1 vs 3 | 0.285 |
| 1 vs 5 | 0.298 |
| 2 vs 3 | 0.293 |
| 2 vs 5 | 0.297 |
| 3 vs 5 | 0.365 |

Shared token core is phone/street/lighting/chat — structural sameness dominates; deltas are gesture/UI state only.

**Trace backwards:** structural sameness is present in the prompts → therefore not introduced by Image Generation.

---

## 6. Decision trace — origin of repeated concepts

| Repeated concept | Introduced by | Evidence |
| --- | --- | --- |
| “phone” / chat thread | Selected candidate openingSituation + Prompt Builder product-demo sequence | `c4` opening; prompt lines 670–673 |
| “Same hands, same phone” | **Prompt Builder** prefer-line | `generateContentPackage.ts:666`; copied into prompts 2–5 |
| urban street exterior | Creative Identity `environment: urban_street_soft` | `creative_identity` |
| overcast diffused daylight | Creative Identity `lighting` | `creative_identity` |
| warm neutral color feel | Creative Identity `color_feel` | `creative_identity` |
| centered headroom | Creative Identity `composition` | `creative_identity` |
| Hold same situation across beats | Candidate builder storyProgression template | `buildCandidatesFromSituations.ts:77` |
| Do not relocate from hands world | Creative DNA immutableRules | `selectedCandidate.creativeDNA.immutableRules[0]` |
| “Handheld urgency:” prefix on slate | Divergence `expandWithVariants` tweak | `generateRawSituations.ts:304` |
| Wall-plan attention concept | Attention originality | selected then **discarded** by scene prompts |

---

## 7. Creative system audit

### Were multiple different concepts generated?

**YES** — Creative Divergence v2.1 produced 6 survivors with distinct metaphors:

| ID | scrollStopCue / scene gist |
| --- | --- |
| c1 | Competitor already quoted visitor |
| c2 | Absurd boarding-ticket dispenser |
| c3 | Empty front desk / waiting chat |
| **c4 (winner)** | **Close on customer’s hands / seen / no answer** |
| c5 | Dual clocks (shop hours vs reply time) |
| c6 | Departure board: phone caller boarding, website delayed |

### Why were they discarded?

Commercial selection (`commercial-success@1`):

- Winner `c4` final score **266.2** (creative 95.2 + commercial 171)  
- Higher creative score `c2` (100.2) **overturned** for commercial penalties (`requires_readable_text`, low renderability)  
- `c6` departure board penalized: `low_renderability=4`, `low_first_frame_clarity=4`, `low_product_demonstrability=4`

So diverse openings existed; selection preferred the most phone/demo-renderable hands close-up.

### Attention

Selected visual concept was **wall plan “post more”** — a different world. It never appeared in `visual_scenes`. Evidence that later prompt constraints overrode Attention’s visual choice.

---

## 8. Constraint collision

```
Attention originality
  → wall-plan “post more” (diverse)
        ↓ discarded
Visual Narrative
  → allows walk-away / two-person tension (diverse)
        ↓ weakened
Creative Candidate Selection + DNA
  → lock hands/phone world; “Do not relocate…”
        ↓
Creative Identity
  → lock urban street + lighting + composition
        ↓
Prompt Builder (PRIMARY)
  → MANDATORY same hands/phone + SAME-thread demo sequence
        ↓
Scene Planning LLM
  → writes “Same hands, same phone…” into every AI still
        ↓
Image Generation
  → renders identical subject/env family
```

Collision summary: systems that still allowed diversity (Attention, Visual Narrative, Narrative Beats) lost to **Prompt Builder continuity + product-demo SAME-thread mandate**, amplified by DNA/Identity locks.

Also note internal tension inside the same prompt file:

- Lines 646–648: “stills visually distinct… VISUAL PROGRESSION: each scene must change location OR action OR information…”  
- Lines 662–675: “SAME person OR same phone… Prefer: same hands / same phone…”

The continuity/demo block is marked **mandatory** and wins in the output.

---

## 9. Regression analysis

| Evidence | Finding |
| --- | --- |
| Commit `8f43cdb` (2026-07-19) | Introduces PRIMARY_ACTOR + CONVERSATION CONTINUITY + PRODUCT DEMONSTRATION STILLS block |
| Prior failure mode (run `9d9fa60b` audit) | Opposite problem: **multiple actors / broken continuity** |
| Older prompts (`audit-73841d6b`, `audit-9d9fa60b`) | Shared kitchen env (Identity-style lock) but **not** the literal “Same hands, same phone” formula across 4 stills of a phone POV sequence |
| This run date | 2026-07-19 — same day as `8f43cdb` |

**Regression character (evidence-based):** Sprint 4C fixed actor discontinuity by adding a mandatory same-phone continuity + demo sequence. On this run that over-corrects into near-identical IMAGE stills.

Not a guess: git blame on lines 662–675 points only to `8f43cdb`.

---

## 10. Blame matrix

| Stage | Responsible for collapse? | Evidence |
| --- | --- | --- |
| Strategy | NO | One topic; does not force identical stills |
| Story Planner / Creative mode | NO | Mode beats still differ |
| Narrative Beats | NO | Distinct roles + informationKeys; beat visualProgression passed |
| Visual Planner / Visual Narrative | NO | Still permits walk-away / two-person framing |
| Creative Candidates (generation) | NO as first cause | 6 diverse survivors existed |
| Creative Candidate Selection | SECONDARY | Chose hands world; discarded more varied openings |
| Attention | NO | Selected diverse wall-plan concept; unused |
| Visual Narrative | NO | Diversity still allowed |
| Creative Identity | SECONDARY | Locks env/light/comp; not the “Same hands, same phone” formula |
| **Prompt Builder** | **YES — PRIMARY** | Mandatory continuity + SAME-thread demo sequence; wording appears in prompts |
| Scene Planning (LLM) | SECONDARY (executor) | Writes collapsed prompts under mandatory rules |
| Image Generator | NO | Innocent — prompts already collapsed |
| Renderer | NO | PRODUCT_DEMO path even proves alternate surface works |

---

## 11. Root cause answers (required)

### 1. Where was visual diversity FIRST lost?

**Prompt Builder**  
(`buildGenerateContentPackagePrompt` / `visualBeatsLines`, `lib/ai/prompts/generateContentPackage.ts:662-675`)

### 2. Why?

Because the prompt **mandates** (a) same person/phone conversation on every still and (b) a product-demonstration still sequence on the **SAME** phone/thread. That forbids location/subject/env diversity among IMAGE scenes. The Scene Planning LLM complied by writing “Same hands, same phone…”.

### 3. Which code made that decision?

- **File:** `lib/ai/prompts/generateContentPackage.ts`  
- **Function:** `buildGenerateContentPackagePrompt`  
- **Block:** `visualBeatsLines` lines **662–675**  
- **Introduced in:** commit `8f43cdb` (Sprint 4C)

### 4. Which earlier stage still contained correct diversity?

**Narrative Beats** — different roles and informationKeys (`anomaly` / `problem_named` / `cost_rising` / `solution_shown`), with `visualProgressionDiagnostics.passed: true` before post-LLM still collapse.

Also still diverse earlier: **Creative Candidate slate** (departure board, clocks, empty desk, etc.) and **Attention originality** (wall-plan concept).

### 5. Is the image model innocent?

**YES**

Evidence: collapsed sameness is already fully specified in `image_prompts` / `visual_scenes` text (“Same hands, same phone, same urban street…”). The model rendered those instructions.

### 6. Would changing only the image model solve this?

**NO**

Evidence: any model receiving those prompts is instructed to keep the same hands, phone, and street. The decision precedes image generation.

---

## Final statement

**Visual diversity was lost in: Prompt Builder**

Not Strategy. Not Narrative Beats. Not Image Generation. Not Renderer.

The first incorrect decision is the Sprint 4C mandatory **PRIMARY_ACTOR + CONVERSATION CONTINUITY** and **PRODUCT DEMONSTRATION STILLS (SAME thread/phone)** instruction in `buildGenerateContentPackagePrompt`, which forced Scene Planning to emit near-identical IMAGE prompts—while narrative information goals were still distinct.
