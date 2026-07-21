# Prompt-block influence architecture

Package: `ff367a55-9338-4073-95bd-e3b30a8dd7a3`  
Source: reconstructed Content Package Claude user prompt (`~53 784` chars) + generated package output.  
Scope: architecture analysis only — no rewrites, no optimizations, no solutions.

---

## Method

1. Slice the reconstructed user prompt at known section headers; measure characters.
2. Trace which instructions appear (or fail to appear) in hook, VO, script, image_prompts, CTA, platforms.
3. Rank by **observed control of final creative choices**, not by block size or stated priority.

Influence scale:

| Level | Meaning |
|---|---|
| **Critical** | Without this block, the package shape or dominant creative choice would be different |
| **High** | Strongly visible in multiple major fields |
| **Medium** | Visible in some fields, or acted as amplifier/constraint |
| **Low** | Mostly unused, overridden, or only formatting/compliance |

---

## Block-by-block analysis

### 1. Product Brain
| | |
|---|---|
| **Purpose** | Product facts, audience, tone, pain points, proof/scenarios, hard claim constraints, default CTA |
| **Size** | ~9 158 chars (17.0% of prompt) — brain + constraints + pain + proof + scenarios + link rules |
| **Depends on** | (upstream of prompt) project DB / Product Brain ingest |
| **Later blocks depend on it** | Strategy Item (topic grounded in pain); Attention (product/topic link); Visual Narrative product-world hints; Creative Candidate productConnection; Product Reveal; Platform Styles (facts); Output Schema CTA allowlist |
| **Conflicts** | Soft: tone “simple/accessible” vs Candidate absurd spectacle; link rules largely unused in video body |
| **Influence** | **High** (facts/constraints/CTA) / creative subject **Medium** |
| **Evidence** | VO/product framing stays on offline chatbot pain; CTA text matches default (“Create your AI assistant”); no `product_is_not` violations; scenario field filled from pool (accountant vacation variant) |

### 2. Strategy Item
| | |
|---|---|
| **Purpose** | Funnel stage, **topic**, **angle** (the creative brief for this package) |
| **Size** | ~764 chars (1.4%) — small but dense |
| **Depends on** | Product Brain (pain/product world); Weekly Strategy / production run |
| **Later blocks depend on it** | Creative Directives seed; Attention narrative seed (embeds full angle); Creative Divergence topic; Hook/VO body; Scene Meaning (“Strategy Item and voiceover beat”) |
| **Conflicts** | Angle’s accountant exposition vs Candidate’s mascot curiosity hold |
| **Influence** | **Critical** for spoken body / title; **High** overall |
| **Evidence** | Title ≈ topic; VO after hook is almost a paraphrase of the angle (vacation, dozens of visits, zero contacts, silent site); Attention block re-injects the same angle verbatim |

### 3. Creative Directives
| | |
|---|---|
| **Purpose** | Mode structure (Shock beats), hook archetype (confession), voice persona (Witty Friend); plus Attention First + Package Diversity in same cluster |
| **Size** | Directives ~1 524; + Package Diversity ~679; + Attention First ~1 042 → cluster ~3 245 (6.0%) |
| **Depends on** | Strategy Item (seed from funnel/topic/angle) |
| **Later blocks depend on it** | Hook V2 references archetype; Content Quality maps preferred arc onto MODE BEATS; Attention plan uses creative mode; script beat labels |
| **Conflicts** | Confession archetype vs Candidate-mandated hook line; Shock structure vs Candidate storyProgression |
| **Influence** | **High** for script skeleton; **Low** for hook wording; Attention First **Low** (did not prevent office sanitization) |
| **Evidence** | Script labeled `UNEXPECTED FACT / IMPLICATION / PROOF / CTA` (Shock); hook is **not** a first-person confession; Witty Friend only weakly visible (snappy phrases like “Zero.”) |

### 4. Attention Mechanism
| | |
|---|---|
| **Purpose** | Attention mechanism, originality pass, opening contract, delivery arc, SFX, anti-sanitization |
| **Size** | ~6 824 chars (12.7%) — **largest single creative block** |
| **Depends on** | Product Brain, Strategy Item, Creative Directives (mode) |
| **Later blocks depend on it** | Hook V2 (align first spoken); Creative Candidate claims Attention must amplify winner; Visual Narrative says film Attention mechanism |
| **Conflicts** | Selected opening visual = megaphone empty room vs Candidate mascot parking lot; anti-desk-sanitization vs Identity co-working |
| **Influence** | **Medium** (mechanism + delivery partially applied; originality opening **overridden**) |
| **Evidence** | Mechanism Provocative Opinion fits clipped hook; delivery “alert/clipped → conversational → lift → pause → confident” matches VO; **megaphone concept absent** from concept/script/stills; SFX timing noted in script; office/desk still used despite anti-sanitization text |

### 5. Creative Candidate Selection
| | |
|---|---|
| **Purpose** | Lock winner concept: hook, openingSituation, visualPromise, progression, ending |
| **Size** | ~2 463 chars (4.6%) |
| **Depends on** | Product Brain, Strategy Item, (Divergence planner upstream); claims Attention/Narrative/Identity amplify it |
| **Later blocks depend on it** | Hook V2 / fidelity (post); Scene Meaning / visuals should start from openingSituation |
| **Conflicts** | vs Creative Identity environment; vs Strategy angle body; vs Attention megaphone; vs Scene Meaning “clearer situation”; vs Visual Narrative preferred framing |
| **Influence** | **Critical** for hook token; **High** for subject (mascot+typing); **Medium** overall (world/progression/ending diluted) |
| **Evidence** | Hook verbatim; scene1 retains mascot + typing indicator; parking-lot heat/traffic/hold/ending **not** executed; visualPromise “no office/laptop montage” violated in beats 2–4 |

### 6. Hook V2
| | |
|---|---|
| **Purpose** | Strengthen first 3s; bind stored hook = first spoken; map VO to mode beats |
| **Size** | ~1 095 chars (2.0%) |
| **Depends on** | Creative Directives (archetype); Attention opening; Creative Candidate hookLine |
| **Later blocks depend on it** | Output schema `hook` + `voiceover_text`; post-process align |
| **Conflicts** | Instructs confession archetype while Candidate supplies non-confession line |
| **Influence** | **High** for hook↔VO alignment; **Low** for archetype |
| **Evidence** | VO opens with exact hook; first thought lands immediately; confession form ignored |

### 7. Content Quality
| | |
|---|---|
| **Purpose** | Duration 15–25s, VO word cap, preferred arc, forbid long corporate explainers |
| **Size** | ~864 chars (1.6%) |
| **Depends on** | Creative Directives (mode beats mapping) |
| **Later blocks depend on it** | Soft constraint on VO length vs Strategy exposition pressure |
| **Conflicts** | “Not an explainer / no long explanations” vs Strategy+Attention demanding clear implication |
| **Influence** | **Medium** (length obeyed; anti-explainer partially lost) |
| **Evidence** | Duration 25s; VO within ~40–70 word band; body still explanatory after hook |

### 8. Scene Meaning
| | |
|---|---|
| **Purpose** | Each still must be understandable in one second; meaning over style; avoid generic offices unless essential |
| **Size** | Scene Meaning ~521 + Visual Beats intro ~897 → ~1 418 (2.6%) |
| **Depends on** | Strategy Item, voiceover beats, Product Brain |
| **Later blocks depend on it** | Visual Narrative amplifies; Creative Identity says meaning overrides staging (in theory) |
| **Conflicts** | “Avoid generic modern offices” vs Identity co-working; one-second clarity vs absurd hold |
| **Influence** | **High** as **amplifier** of conservative readable scenes |
| **Evidence** | Stills are instantly “readable” desk/co-working recognition scenes; absurd heat spectacle reduced; “avoid generic offices” lost to Identity |

### 9. Visual Narrative
| | |
|---|---|
| **Purpose** | How meaning is carried; situation-first; metaphor policy; product world; motif memory |
| **Size** | ~4 200 chars (7.8%) |
| **Depends on** | Product Brain; Creative Identity (look vs meaning split); Attention mechanism |
| **Later blocks depend on it** | Product Reveal solution options; Creative Identity claims Narrative decides WHAT |
| **Conflicts** | Preferred framing “person walking away unanswered” vs Candidate parking-lot mascot; “no corporate desks” vs output desks; “Identity not permission to change world” vs Identity co-working overwrite |
| **Influence** | **Medium** (human carrier, situation-first, anti-riddle reinforced; specific framing only partly used) |
| **Evidence** | Human body language primary; no abstract paper-boat riddles; laptop-at-desk still dominates beats 2–4 despite motif warning (laptop ~7 recent) |

### 10. Product Reveal
| | |
|---|---|
| **Purpose** | How product appears on solution beats — here `PRODUCT_OUTCOME` |
| **Size** | ~1 116 chars (2.1%) |
| **Depends on** | Visual Narrative; assets (none); generation mode |
| **Later blocks depend on it** | Final still / CTA visual strategy |
| **Conflicts** | Candidate ending (“crew in field / visitor answered”) vs outcome-as-body-language |
| **Influence** | **High** for closing beat; **Low** elsewhere |
| **Evidence** | Beat 4 = lean-back recognition, laptop closed — outcome mood, not product UI and not field crew |

### 11. Visual Medium
| | |
|---|---|
| **Purpose** | Representation style for all stills — `PHOTOGRAPHIC` (+ style guardrail) |
| **Size** | Medium ~463 + Style guardrail ~664 → ~1 127 (2.1%) |
| **Depends on** | Visual Profile / Identity planners upstream |
| **Later blocks depend on it** | Image prompt phrasing |
| **Conflicts** | Photoreal/credible vs absurd melting spectacle intensity |
| **Influence** | **High** for medium; overlaps Profile/Identity |
| **Evidence** | Every image_prompt starts “photorealistic photograph…” |

### 12. Project Visual Profile
| | |
|---|---|
| **Purpose** | Treatment only — `NATURAL`: believable, candid, realistic, restrained |
| **Size** | ~430 chars (0.8%) |
| **Depends on** | Product Brain / package signals |
| **Later blocks depend on it** | Creative Identity lighting/mood often aligned with NATURAL |
| **Conflicts** | Claims “Do NOT change … environments” but Identity **does** set environment; NATURAL “restrained” vs Candidate absurd heat |
| **Influence** | **Medium–High** (treatment) — small text, large effect with Medium/Identity |
| **Evidence** | Warm daylight, restrained contrast, candid partial bodies throughout stills |

### 13. Creative Identity
| | |
|---|---|
| **Purpose** | One staging identity for ALL image_prompts (environment, mood, light, camera, composition, human, color) |
| **Size** | ~974 chars (1.8%) — **small but decisive** |
| **Depends on** | Visual Profile, series memory, seed from strategy |
| **Later blocks depend on it** | Claims Narrative decides WHAT — but in practice Identity set WHERE |
| **Conflicts** | **Direct conflict** with Candidate openingSituation / visualPromise; with Profile “don’t change environments”; with Attention anti-desk |
| **Influence** | **Critical** for visual world |
| **Evidence** | All 4 image_prompts and script beat 1 quote “bright co-working… documentary lighting… warm neutral… single person partial body” almost verbatim |

### 14. Presentation Rules
| | |
|---|---|
| **Purpose** | Beat types (IMAGE/PHONE/QUOTE/CHECKLIST/CTA), device rules, assets, visual_scenes plan |
| **Size** | ~15 277 chars (28.4%) — **largest cluster**; PRESENTATION alone ~9 541 (17.7%) |
| **Depends on** | prompt_presentation_types; empty asset library |
| **Later blocks depend on it** | Output schema visual_scenes shapes |
| **Conflicts** | Minimal with creative blocks (mostly orthogonal); device-screen rules encourage non-blank laptops → reinforces laptop beats |
| **Influence** | **Low** for creative choice; **Medium** for compliance/format of stills (9:16, no readable UI text, non-blank screens) |
| **Evidence** | All scenes IMAGE/ai; no phone/quote/checklist/CTA cards; `asset_usage` empty; stills follow portrait + no readable text + glowing screens; vast CHECKLIST/PHONE examples unused |

### 15. Platform Styles
| | |
|---|---|
| **Purpose** | Native captions per platform; LinkedIn B2B professional; multi-variant rules |
| **Size** | ~2 069 chars (3.8%) |
| **Depends on** | Product Brain facts; funnel; Output Schema platforms |
| **Later blocks depend on it** | platform_outputs only |
| **Conflicts** | LinkedIn “professional B2B” vs video absurd tone (local to captions) |
| **Influence** | **Medium** for captions; **Low** for video creative |
| **Evidence** | Distinct platform_outputs exist; LinkedIn/X variants present; video hook/stills not “B2B professional” |

### 16. Output Schema
| | |
|---|---|
| **Purpose** | Exact JSON shape, required fields, platform keys, rules line |
| **Size** | ~2 727 chars (5.1%) |
| **Depends on** | requireVideo, targetPlatforms, presentation types |
| **Later blocks depend on it** | Validator / guardrails (post-prompt) |
| **Conflicts** | None creative — structural |
| **Influence** | **Critical** for package validity / field presence; **Low** for which creative idea wins |
| **Evidence** | Valid package with hook, voiceover_text, video.script/concept, image_prompts[4], visual_scenes, platform_outputs for all targets |

---

## Dependency graph

### A. Upstream planner graph (before Claude)

```
Product Brain
    ↓  (facts, pains, product world)
Strategy Item (topic + angle)
    ↓
    ├─→ Creative Directives (mode/hook/persona seed)
    ├─→ Attention Mechanism plan
    ├─→ Creative Divergence → Creative Candidate Selection
    ├─→ Visual Narrative plan
    ├─→ Creative Identity plan  ← also Visual Profile
    ├─→ Visual Medium / Profile
    └─→ Product Reveal plan
         ↓
    All injected into ONE Claude user prompt
         ↓
    Claude Generation → package JSON
```

**Why each edge**

| Edge | Why |
|---|---|
| Product Brain → Strategy Item | Topic/angle are pain- and product-grounded |
| Strategy Item → Directives | Seed hash from funnel/topic/angle picks Shock/confession/persona |
| Strategy Item → Attention | Opening narrative seed embeds full angle |
| Strategy Item → Creative Candidate | Divergence situations built around topic/pain |
| Product Brain → Visual Narrative | product_world_hints from product type |
| Visual Profile → Creative Identity | Identity options scored/compatible with NATURAL |
| Narrative + assets → Product Reveal | PRODUCT_OUTCOME when no strong asset UI path |
| All plans → Claude | Concatenated blocks; Claude is the merge point |

### B. Inside-prompt claimed hierarchy vs observed

**Claimed (in Candidate / Narrative text):**

```
Creative Candidate (WHAT to execute)
    ↓ amplify
Attention (mechanism) + Visual Narrative (meaning)
    ↓ look only
Creative Identity + Profile + Medium
```

**Observed in this package:**

```
Strategy Item ──────────────► VO body / title
Creative Candidate ─────────► hook token + mascot prop
Creative Identity ──────────► ALL still environments
Scene Meaning + NATURAL ────► readable, restrained scenes
Creative Directives (Shock) ► script beat labels
Attention ──────────────────► delivery arc (opening visual lost)
Product Reveal ─────────────► closing body-language outcome
Presentation / Schema ──────► IMAGE-only JSON compliance
```

```
Product Brain
    ↓
Strategy Item
    ↓
Creative Candidate ──hook──┐
    ↓ (intended world)     │
Attention (partial)        │
    ↓                      ▼
Visual Narrative      Claude Generation
    ↓                      ▲
Creative Identity ──stills─┘  (overrode Candidate world)
    ↓
Scene Meaning / Profile / Medium (reinforced Identity realism)
    ↓
Product Reveal (ending)
    ↓
Presentation + Output Schema (shape)
```

---

## Conflicts

| # | Block A | Block B | Conflicting instructions | Winner | Evidence |
|---|---|---|---|---|---|
| 1 | Creative Candidate | Creative Identity | Opening = parking-lot heat mascot; Identity env = bright co-working for every still | **Identity** | All image_prompts + script beat 1 set in co-working |
| 2 | Creative Candidate | Strategy Item | Hold mascot curiosity vs angle’s accountant vacation exposition | **Strategy Item** (body) | VO after hook is angle paraphrase |
| 3 | Creative Candidate | Attention Mechanism | Mascot opening vs preferred megaphone/empty room | **Candidate** (subject) | Megaphone absent; mascot present |
| 4 | Creative Candidate | Scene Meaning / Visual Narrative clarity | Absurd heat spectacle vs “understand in one second” / “clearer situation” / “believable” | **Clarity cluster** | Melting/traffic intensity dropped |
| 5 | Creative Candidate | Visual Narrative framing | Parking-lot mascot vs “film person walking away unanswered” | **Partial draw** | Neither pure; co-working desk recognition instead |
| 6 | Creative Candidate | Product Reveal | Ending: field crew / answered visitor vs PRODUCT_OUTCOME body language | **Product Reveal** | Beat 4 lean-back, laptop closed |
| 7 | Creative Candidate | Creative Directives | storyProgression vs Shock unexpected→implication→proof→cta | **Directives** (structure) | Script beat labels follow Shock |
| 8 | Hook V2 / Directives | Creative Candidate | Confession archetype vs mandated hookLine | **Candidate** | Hook is not a confession |
| 9 | Attention anti-sanitization | Creative Identity | Do not soften into bland desk vs co-working desk continuity | **Identity** | Beats 2–4 desk/laptop |
| 10 | Scene Meaning “avoid generic offices” | Creative Identity co-working | Avoid offices unless essential vs force co-working | **Identity** | Co-working on all stills |
| 11 | Visual Profile “don’t change environments” | Creative Identity | Treatment only vs Environment axis | **Identity** | Environment changed from Candidate world |
| 12 | Content Quality “not an explainer” | Strategy + Attention clarity | No long explanation vs make offline leak clear next beat | **Strategy/Attention** | Expository VO body |
| 13 | Candidate “no office/laptop montage” | Device Screens + implication proof | Forbid laptop montage vs non-blank screens + analytics proof | **Laptop path** | Beats 2–3 laptop UIs |
| 14 | Attention First / Candidate anti-B2B | Platform Styles LinkedIn | Scroll-stop absurd vs professional B2B captions | **Split** | Video ≠ LinkedIn tone |

---

## Influence ranking (most → least)

Observed control of **this** package’s creative outcome:

1. **Creative Identity** — Critical  
   *Why:* Small block; stills/script environment are near-copies of its seven axes. Overrode Candidate world.

2. **Strategy Item** — Critical  
   *Why:* Tiny block; owns title + entire VO body after hook.

3. **Creative Candidate Selection** — High (narrow Critical on hook)  
   *Why:* Absolute control of hook string and mascot motif; lost setting, progression, ending, promise.

4. **Output Schema** — Critical (structural) / Low (creative)  
   *Why:* Forces valid field set; does not choose the idea. Ranked here for “controls Claude behavior” including compliance — creative rank would be near bottom.

5. **Creative Directives (Shock)** — High  
   *Why:* Script dramaturgy labels and implication/proof pacing.

6. **Scene Meaning (+ Visual Beats)** — High (amplifier)  
   *Why:* Legitimized abandoning hard-to-read absurd hold for readable desk scenes.

7. **Product Brain** — High  
   *Why:* Claim fences, CTA, product truth; did not pick the visual idea.

8. **Visual Medium + Visual Profile (NATURAL)** — High  
   *Why:* Photoreal / believable / restrained locked look; redundant with Identity but mutually reinforcing.

9. **Product Reveal** — Medium–High  
   *Why:* Decisive for beat 4 only.

10. **Attention Mechanism** — Medium  
    *Why:* Largest creative text; delivery/mechanism used; originality opening and anti-desk rules **mostly ignored**. High bytes, medium power.

11. **Visual Narrative** — Medium  
    *Why:* Reinforced human/situation/anti-riddle; specific framing and anti-desk guidance diluted.

12. **Hook V2** — Medium  
    *Why:* Enforced hook=first spoken; archetype instruction overridden.

13. **Content Quality** — Medium  
    *Why:* Length targets hit; anti-explainer diluted.

14. **Platform Styles** — Medium (captions) / Low (video)  
    *Why:* Shapes platform_outputs only.

15. **Presentation Rules cluster** — Low (creative) / Medium (format)  
    *Why:* ~28% of prompt; almost all type examples unused; only portrait/no-text/screen-not-blank matter.

### Compact ranking (creative control of final video)

```
Creative Identity
    ↓
Strategy Item
    ↓
Creative Candidate (hook + motif only)
    ↓
Creative Directives (Shock structure)
    ↓
Scene Meaning / NATURAL / PHOTOGRAPHIC (clarity + realism)
    ↓
Product Reveal (ending)
    ↓
Product Brain (facts/CTA)
    ↓
Attention Mechanism (delivery; opening lost)
    ↓
Visual Narrative (partial)
    ↓
Hook V2 / Content Quality
    ↓
Platform Styles
    ↓
Presentation Rules (bulk unused)
    ↓
Output Schema (shape only)
```

---

## Architecture conclusions (descriptive only)

1. **Size ≠ influence.** Presentation (~28%) and Attention (~13%) are huge; Identity (~2%) and Strategy Item (~1.4%) steered more of the final creative.
2. **Claude is a conflict resolver, not a faithful executor.** When blocks disagree, concrete staging (Identity) and dense brief text (Strategy angle) beat abstract “must execute winner” language.
3. **Creative Candidate is partially authoritative:** lexical hook + iconic prop survive; world continuity does not.
4. **Attention’s originality pass is effectively dead weight** in this run when Candidate + Identity disagree with its selected visual.
5. **Presentation Rules are mostly schema education** for unused beat types given empty assets and IMAGE-only path.
6. **Clarity/realism stack** (Scene Meaning + Narrative understandable + NATURAL + PHOTOGRAPHIC) acts as a **soft veto** on sustained absurd Divergence worlds.

---

*Artifacts: `reports/package-ff367a55-9338-4073-95bd-e3b30a8dd7a3-prompt-block-influence-data.json`, reconstructed prompt files from prior analysis.*
