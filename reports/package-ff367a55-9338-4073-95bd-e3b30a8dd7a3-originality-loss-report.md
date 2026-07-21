# Originality loss: Creative Divergence → Claude Content Package

Package: `ff367a55-9338-4073-95bd-e3b30a8dd7a3`  
Production run: `04911a16-e551-4b92-ba5e-6ac73ba0ee37`  
Scope: **only** the transition from selected Creative Divergence candidate → Content Package Claude call. No marketing scoring. No redesign.

## Evidence caveat

Full Claude `system` + `user` payloads and the raw model response are **not stored** in the database. What follows is a reconstruction from:

- current `buildGeneratePackageSystem` / `buildGenerateContentPackagePrompt`
- **persisted** `package_brief.presentation_generation` plans (Attention, Creative Candidates winner, Visual Narrative, Creative Identity, Product Reveal, Visual Profile/Medium)
- Creative Directives re-derived from the same funnel/topic/angle seed (`shock` / `confession` / `witty_friend`)

Artifacts:

| File | Contents |
|---|---|
| `reports/package-ff367a55-9338-4073-95bd-e3b30a8dd7a3-claude-system-prompt.txt` | Reconstructed system prompt |
| `reports/package-ff367a55-9338-4073-95bd-e3b30a8dd7a3-claude-user-prompt.txt` | Full assembled user prompt (~53 784 chars) |
| `reports/package-ff367a55-9338-4073-95bd-e3b30a8dd7a3-claude-blocks.json` | All resolved injected blocks |
| `reports/package-ff367a55-9338-4073-95bd-e3b30a8dd7a3-claude-prompt-reconstruction.json` | Variables + conservative-instruction scan |
| `reports/package-ff367a55-9338-4073-95bd-e3b30a8dd7a3-divergence-vs-package.json` | Winner vs package fields |

Note: Creative Candidate block header may show `creative-candidates@2.1` from current code; the run persisted `creative-candidates@2`. Winner field values are from the persisted package.

---

## 1. Exact Content Package Claude prompt

### 1.1 System prompt

```
You are the Creative Engine for an AI Content Manager. You generate a complete content PACKAGE derived from a weekly strategy item. Video is MANDATORY for every package and is a fast-paced vertical SHORT (TikTok / Instagram Reels / YouTube Shorts share ONE video). The first 3 seconds (the hook) decide everything. Produce platform-specific outputs.
```

### 1.2 Injected variables

| Variable | Resolved value |
|---|---|
| topic | The accountant who came back from vacation to a week's worth of missed leads — and zero contact details |
| angle | Gut-punch: website visited dozens of times while away; static site; permanent invisible leak |
| funnelStage | `problem_aware` |
| platform / format | `tiktok` / `reel` |
| requireVideo | `true` |
| targetPlatforms | tiktok, instagram, youtube, linkedin, x |
| videoPlatforms | tiktok, instagram, youtube |
| variantCounts | linkedin: 2, x: 5 |
| creative mode | `shock` (unexpected_fact → implication → proof → cta) |
| hook archetype | `confession` |
| voice persona | `witty_friend` |
| visual_profile | `NATURAL` |
| visual_medium | `PHOTOGRAPHIC` |
| selected candidate | `c5-absurd_understandable-div` |
| creative identity environment | **a bright co-working space in daylight** |

### 1.3 Resolved prompt blocks (injected)

| Block | Source | Role in this package |
|---|---|---|
| Creative Directives | seed from funnel/topic/angle | Mode = shock; hook = confession |
| ATTENTION MECHANISM | persisted | Provocative Opinion; **preferred opening visual = megaphone in empty room** (competes with winner) |
| CREATIVE CANDIDATE SELECTION | persisted winner | **Must execute mascot / parking-lot heat / fake typing** |
| CONTENT QUALITY | static | Short video, not explainer; VO 40–70 words |
| HOOK V2 | static + directives | Hook = first spoken; curiosity loop |
| SCENE MEANING | static | Viewer must understand within one second; prioritize meaning |
| VISUAL NARRATIVE | persisted | Situation-first; immediately understandable metaphors; stay believable |
| PRODUCT REVEAL | persisted | `PRODUCT_OUTCOME` |
| VISUAL MEDIUM | persisted | Photorealistic photographic |
| PROJECT VISUAL PROFILE | persisted NATURAL | Believable / candid / realistic / restrained |
| CREATIVE IDENTITY | persisted | **Forces bright co-working + documentary lighting on ALL stills** |
| Platform styles | static | LinkedIn: professional, expert, B2B (no hype) |

Full texts: `claude-blocks.json`. Assembled prompt: `claude-user-prompt.txt`.

### 1.4 Creative Candidate instructions (what Claude was told to execute)

- Winner: `c5-absurd_understandable-div` (`absurd_understandable`)
- `hookLine`: Mascot suffers, fake typing online.
- `openingSituation`: Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.
- `visualPromise`: Film as scroll-stop; **No generic office/laptop montage.**
- `storyProgression`: Hold opening → after-hours silence → offline pain → product answers
- `expectedViewerQuestion`: What happens to the person in: Mascot suffers, fake typing online?
- Hard rule: do **not** invent a safer B2B montage; do **not** reinterpret into phones/laptops/offices unless the winner requires it.
- Hard rule: Attention / Narrative / Identity must **amplify** the winner, not replace it.

---

## 2. Side-by-side: selected candidate vs generated package

| Field | Creative Divergence winner | Claude package output |
|---|---|---|
| **Hook** | Mascot suffers, fake typing online. | **Same** (preserved verbatim; first spoken matches) |
| **Opening situation** | Mascot **melting in parking lot heat**; employee waves at **traffic**; inside, typing indicator with no message | Concept text still mentions sun-baked parking lot; **script + image_prompts place mascot just inside glass door of bright co-working**, waving toward empty lot — heat/melt/traffic largely gone |
| **Story progression** | Hold absurd opening → widen to after-hours silence → offline pain on website channel → product | Hook → **accountant vacation analytics essay** → “site sat silent / always open” explanation → soft outcome CTA beat |
| **Expected viewer question** | What happens to the **person/mascot** in that moment? | Not answered visually; VO shifts to **accountant missed-leads** narrative from strategy topic |
| **Visual promise** | Scroll-stop; **no generic office/laptop montage** | Beats 2–4 are **desk + laptop + analytics/chat UI + plant + co-working**; opening still includes laptop chat in background |
| **Emotional reaction** | amused recognition | Quiet dread / quiet tension / calm resolution (identity mood) |
| **Ending (winner)** | Next visitor gets an answer while crew stays in the field | Person leans back in chair; laptop closed; calm resolution (PRODUCT_OUTCOME body language) |
| **Voiceover** | (implied by hook + progression; visual-first absurd) | Hook + **expository accountant vacation story** + website-leak explanation |
| **Storyboard / script** | — | BEAT 1 co-working mascot; BEAT 2 desk analytics; BEAT 3 alone with plant; BEAT 4 lean-back CTA |
| **Scenes / image prompts** | Parking-lot heat spectacle | All 4 stills: photoreal, bright co-working, documentary lighting, laptop-heavy after beat 1 |

### Generated hook

`Mascot suffers, fake typing online.`

### Generated voiceover

> Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.

### Generated concept (text) vs script (execution)

- **Concept** still describes parking-lot heat / waving at cars / chat typing never sending — then accountant desk.
- **Script beat 1** executes: “Wide shot, bright co-working daylight… mascot… just outside a glass door… laptop chat typing…”
- So originality is already split **inside** the Claude output: concept retains more of the winner; storyboard/stills obey Creative Identity.

### Generated image prompts (compressed)

1. Co-working / glass door / mascot mid-wave / parking lot **outside** / laptop typing glow  
2. Co-working desk / carry-on / laptop analytics / coffee / notebook  
3. Co-working alone / plant / laptop empty chat threads  
4. Co-working lean-back / laptop closed / calm resolution  

---

## 3. Every place the winner changed (weakened / generalized / replaced)

| # | Change type | Winner had | Claude produced | Where it shows |
|---|---|---|---|---|
| 1 | **Setting replaced** | Parking lot heat (outdoor spectacle) | Bright co-working daylight (indoor glass door) | Script beat 1; all image_prompts; Creative Identity env |
| 2 | **Absurd intensity weakened** | Costume **melting** in heat | “exhausted and absurd” / sweating/wilting in concept only; stills = mild posture | Concept vs image_prompt 1 |
| 3 | **Traffic / public conflict lost** | Employee waves at **traffic** | Waves at “nobody” / empty lot | Script beat 1 |
| 4 | **Visual storytelling → narration** | Hold visual situation; viewer asks about the mascot moment | After hook, VO **explains** accountant vacation + silent website | voiceover_text |
| 5 | **Curiosity → exposition** | expectedViewerQuestion about the mascot person | Strategy-topic lecture: visits, zero contacts, “site just sat there” | VO beats 2–3 |
| 6 | **Metaphor/spectacle → office realism** | Absurd_understandable outdoor mascot | Photoreal co-working + desk montage | image_prompts 2–4 |
| 7 | **Anti-office promise broken** | “No generic office/laptop montage” | Laptop analytics, chat UI, desk, coffee, notebook, plant | image_prompts 2–4; visualPromise violation |
| 8 | **Story progression replaced** | Hold opening → after-hours silence → product in field | Shock template: unexpected_fact → implication → proof → CTA in co-working | script beats; mode `shock` |
| 9 | **Product connection softened** | Chatbot handles the **website moment shown in opening** without replacing human stakes | Closing body-language “recognition”; spoken CTA about AI assistant; no sustained opening world | beat 4 + ending |
| 10 | **Ending replaced** | Crew stays in field; next visitor answered | Quiet chair lean-back / laptop closed | image_prompt 4; PRODUCT_OUTCOME |
| 11 | **Mood replaced** | Amused recognition | Quiet tension before a decision → calm resolution | Creative Identity mood |
| 12 | **Competing opening concept ignored but not deleted** | Mascot winner | Attention block still injects **megaphone / empty room** as preferred opening; Claude chose mascot for hook but identity for set | Attention block vs Candidate block |
| 13 | **Concept/script inconsistency** | Single parking-lot world | Concept = parking lot; script/stills = co-working | video.concept vs video.script |
| 14 | **Fidelity false negative** | — | `openingSituationVisibleInScene1: true`, `collapsedToGenericOffice: false` despite co-working + laptop montage | finalScriptFidelity / finalStoryboardFidelity both **passed**; no repair |

---

## 4. Prompt instructions that push conservatism / suppress originality

Grouped by likely effect on **this** package. (Full hit list in reconstruction JSON.)

### A. Direct environment overwrite (highest impact on visuals)

- **CREATIVE IDENTITY:** `Environment: a bright co-working space in daylight`
- Same block: every image_prompt must express this **SAME** identity
- Lighting: `low-contrast, flat documentary lighting`
- Mood: `quiet tension before a decision`
- Human presence: `a single person, partial body, face not dominant`

These are **harder, more specific staging commands** than the Creative Candidate’s parking-lot situation. Output stills quote Identity almost verbatim.

### B. Clarity / comprehension pressure (weakens absurd hold)

- **SCENE MEANING:** “what a viewer should understand **within one second**”; “Prioritize meaning over visual style”
- **VISUAL STORY DIRECTOR:** if not obvious in one second with **no explanation**, “reject and film a **clearer situation**”
- Metaphor policy: “**immediately understandable** preferred”; anything that “requires the prompt to **explain** is REJECTED”
- “Originality is unexpected-but-**understandable**”
- “Stay **believable** and on-brand”
- Visual style: prefer “clear, **believable** and immediately understandable compositions”

Absurd heat-melting mascot can be read as less “one-second clear” / less “believable” than desk recognition — so the model retreats to readable office pain.

### C. Photoreal / NATURAL treatment (absurd → realistic textures)

- VISUAL MEDIUM: “**Photorealistic** photographic image, **credible** materials and natural light”
- NATURAL profile: “**believable** setting, **candid** composition, **realistic** textures, **restrained** contrast”

### D. Strategy topic / angle weight (curiosity → accountant exposition)

- Topic + long angle about accountant vacation / missed leads are injected as core strategy context
- Attention narrative seed repeatedly re-embeds that full angle and requires the offline pain be “**clear by the next beat**”
- HOOK / VO rules: after hook, run MODE BEATS — which for `shock` are implication/proof, easy to fill with strategy exposition

### E. Competing Attention opening (dilutes winner authority)

- Attention ORIGINALITY still selects “**megaphone pointed at an empty room**” as preferred opening visual
- Candidate block says must execute mascot and that Attention must amplify winner
- Claude compromises: keeps mascot hook/props, drops parking-lot world, ignores megaphone — Identity wins the set

### F. Explicit anti-originality-softening that failed to win the conflict

These **defend** originality but lost the priority fight:

- Candidate: “do not invent a safer B2B montage… do not reinterpret into phones/laptops/offices”
- Attention First: optimize for scroll-stop, not corporate brand-safety; “Never sand it down”
- Attention SAFETY: do not soften exaggerated metaphor into a bland desk scene

They coexist in the same user prompt with Identity co-working + Scene Meaning clarity + NATURAL photoreal.

### G. Secondary / platform-level conservatism

- LinkedIn platform style: “**professional**, expert, **B2B** (no hype)” (platform caption guidance; may bias overall “professional” tone)
- Product Brain tone: “Simple and accessible”
- “not an explainer” / forbid long explanations — yet VO still becomes explanatory because strategy angle + shock implication beats demand “why it matters”

---

# Report sections A–D

## A. What Creative Divergence wanted

An **absurd_understandable** scroll-stop:

- Hook: *Mascot suffers, fake typing online.*
- Opening: mascot **melting in parking-lot heat**, waving at traffic, fake chat typing with no message
- Hold that world → after-hours silence → offline website pain → product answers while humans stay in the field
- Viewer should wonder what happens to **that** person/moment
- Explicitly **not** a generic office/laptop montage
- Emotion: amused recognition

## B. What Claude produced

- Hook preserved
- Concept still *talks about* parking-lot absurdity
- Script + all stills relocate into **bright co-working** Identity world
- VO becomes **accountant vacation + silent website explanation** (strategy topic)
- Beats 2–4 = desk / laptop / analytics / plant / quiet recognition
- Ending = calm chair lean-back, not “crew in the field”
- Fidelity checks **passed**; no regeneration

## C. Every difference

See table in §3 (14 concrete change points). Net pattern:

1. **Hook string preserved**  
2. **Opening world relocated** (parking lot → co-working glass door)  
3. **Absurd heat/traffic intensity dropped**  
4. **Visual hold abandoned** for strategy exposition in VO  
5. **Anti-laptop promise broken** after beat 1  
6. **Ending / mood swapped** to Identity + PRODUCT_OUTCOME  
7. **Post-check did not catch** the drift  

## D. Which prompt instructions most likely caused those differences

| Difference | Most likely prompt cause(s) |
|---|---|
| Parking lot → co-working | **CREATIVE IDENTITY environment** (“bright co-working…”) applied to every image_prompt |
| Melting heat / traffic softened | Identity mood “quiet tension”; NATURAL/photoreal “believable/restrained”; Scene Meaning one-second clarity |
| Visual story → VO explanation | Strategy **topic/angle** + Attention “clear by next beat” + shock **implication/proof** beats + VO must narrate mode beats |
| Curiosity about mascot → accountant essay | Same: topic/angle dominate body copy after preserved hook |
| No office/laptop → desk montage | Identity continuity + allowed “laptops when honest best choice” + PRODUCT_OUTCOME / analytics as implication proof; Candidate anti-office rule **overridden in practice** |
| Field ending → chair recognition | **PRODUCT REVEAL: PRODUCT_OUTCOME** + Identity single partial person |
| Competing megaphone ignored | Candidate block won for subject (mascot); Attention concept lost; Identity still won setting |
| Fidelity passed | Historical token/heuristic check treated mascot+typing as enough; did not require parking-lot / anti-office fidelity |

### Priority conflict (how originality disappears)

Inside one user prompt, Claude received **contradictory hard instructions**:

1. Creative Candidate: execute parking-lot mascot; no office/laptop montage; Identity must amplify  
2. Creative Identity: all stills = bright co-working documentary  
3. Scene Meaning / Visual Narrative: one-second understandable, believable, clearer situation  
4. Strategy + Attention: make accountant/offline-leak meaning clear immediately after hook  

Observed resolution: **preserve hook token + mascot prop**, **obey Identity environment**, **obey strategy exposition in VO**, **abandon sustained Divergence world**.

That is the exact seam where originality is lost between Creative Divergence and Content Package generation.

---

*No prompt rewrites or system redesigns proposed in this document — diagnosis only.*
