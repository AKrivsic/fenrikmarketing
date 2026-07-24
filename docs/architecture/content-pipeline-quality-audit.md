# Content Pipeline Quality Audit

**Status:** Audit only — no code changes  
**Date:** 2026-07-24  
**Scope:** Production Generate + Regenerate path after Creative Engine removal  
**Sources:** `lib/content-pipeline/**`, `lib/ai/workflows/generateContentPackage.ts`, `lib/ai/workflows/regenerateContentPackage.ts`, `lib/ai/workflows/planContentStrategy.ts`, `lib/ai/prompts/context.ts`, `lib/ai/prompts/contentStrategyPlan.ts`, `lib/ai/workflows/antiRepetitionMemory.ts`, `docs/architecture/content-pipeline.md`

---

## Executive summary

The pipeline is structurally sound: fewer LLM calls, clear stage ownership for hook (Opening Impact) and story idea (Video Concept), and no evaluate/repair loops. Content quality risk is now concentrated in **prompt strength and context wiring**, not architecture.

Highest-impact findings:

1. Creative directives are picked but **never injected into LLM prompts** → structured variety is largely unused.
2. Fingerprint / atmosphere / direction memory is **collected but not prompt-injected**, and new packages no longer write fingerprints → visual/concept anti-repetition is weak.
3. **Pain Point First** exists only at Content Strategy → later stages can drift to minor details.
4. Opening Impact (OpenAI) is **under-grounded** (no proof/scenarios) while owning the hook that Content Package cannot redesign.
5. Regenerate injects full prior JSON into **three** stages and conflicts with anti-repetition that still lists the package’s own hook/CTA as “AVOID.”

---

## Pipeline map (production)

```
Product Brain
  → Knowledge Base
  → Recent Content Memory
  → Content Strategy          (Claude)
  → Video Concept             (Claude)
  → Opening Impact            (OpenAI text)
  → Visual Identity           (deterministic)
  → Content Package           (Claude)  ← also authors platform_outputs
  → Platform Outputs          (deterministic telemetry / persist mapping)
  → Persist
  → Video Pipeline            (TTS / images / subtitles / render)
```

Regenerate reuses the same creative stages; strategy item is not re-planned.

---

## Stage-by-stage review

### 1. Product Brain

**Files:** `lib/ai/prompts/context.ts` (`projectBrainBlock`, `constraintsBlock`); project columns; Knowledge compile → brain in `lib/knowledge/compile.ts`

| # | Answer |
|---|--------|
| **1. Enters** | Project row: name, type, language, market, goal, audience, tone, product_is / is_not, strengths, pain_points, forbidden_claims, platforms, default_cta |
| **2. Leaves** | Deterministic prompt blocks reused by Strategy, Concept, Opening, Package |
| **3. Missing** | Competitive differentiation, ICP “day in the life,” offer/pricing nuance, brand visual canon beyond tone JSON, success metrics / conversion goal depth |
| **4. Better** | Structured audience jobs-to-be-done; ranked pain points; explicit “product moment” (what the product *does* on screen); brand do/don’t visual lines |
| **5. Repetition** | Same brain in every package → safe, but can flatten voice if every stage re-reads the same generic lists |
| **6. Reduce creativity** | Over-long is_not / forbidden lists can push models into bland safe copy |
| **7. Hallucinate** | Low if constraints are respected; empty/weak `product_is` increases invention risk downstream |
| **8. Move responsibility?** | Keep as shared source of truth. Do **not** re-invent product facts in later stages. Enrich brain quality upstream (Knowledge → compile) rather than re-asking LLMs to invent brand |

---

### 2. Knowledge Base

**Files:** `projects.knowledge`; `proofBlock` / `scenarioBlock` / `websiteLinkRulesBlock` in `context.ts`; strategy also loads trends + evergreen via `loadStrategyPlanningContext`

| # | Answer |
|---|--------|
| **1. Enters** | Proof statements (+ asset-derived), scenarios, website URL; Product/Customer/Voice cards primarily via compiled brain |
| **2. Leaves** | Optional proof/scenario blocks (cap 12 each); website link rules (Package only); trends/evergreen (Strategy only) |
| **3. Missing** | Proof ranking by topic relevance; scenario → funnel mapping; which proof is “hero” vs supporting; customer quotes / objections; visual brand refs |
| **4. Better** | Select **top-N relevant** proof/scenarios per strategy item (not the same global 12 every time); mark 1–2 “must-consider” proofs for Solution/Conversion |
| **5. Repetition** | Same 12 proofs/scenarios in Concept + Package every time → models latch onto the first few |
| **6. Reduce creativity** | “Optional” wording is good; if pools are thin, content becomes generic |
| **7. Hallucinate** | Rules say don’t invent/alter numbers — good. Empty pools → fact invention risk moves to Product Brain paraphrase |
| **8. Move responsibility?** | Topic-relevant knowledge selection should happen **after strategy item exists** (Concept/Package), not only as a global dump. Opening should receive a **thin** proof/scenario slice for product-true hooks |

---

### 3. Recent Content Memory

**Files:** `lib/ai/workflows/antiRepetitionMemory.ts`; `antiRepetitionBlock` in `context.ts`; fingerprint helpers in `lib/content-memory/**`

| # | Answer |
|---|--------|
| **1. Enters** | Last ~60 packages → up to 20 hooks, topics, CTAs, scenarios; also fingerprints/atmospheres/directions from legacy `presentation_generation` when present |
| **2. Leaves** | Prompt block with **Hooks / Topics / CTAs / Scenarios only**. Fingerprints/atmospheres/directions are **not** injected |
| **3. Missing** | Concept fingerprints, visual worlds, narrative mechanisms, opening emotion patterns, CTA *intent* (not only verbatim text), sibling-run angles |
| **4. Better** | Persist + inject Content Pipeline fingerprints (core_idea / environment / attention_pattern hashes); exclude current package on regenerate; add “recent visual worlds” |
| **5. Repetition** | **Yes — high risk for concept/visual sameness.** Textual hook/CTA anti-rep still works; mechanism/world anti-rep is largely dead for new packages |
| **6. Reduce creativity** | Strict “do not reuse topics” can force awkward adjacent topics instead of fresh angles on the same pain |
| **7. Hallucinate** | N/A (deterministic). Risk is false confidence that memory covers creative uniqueness |
| **8. Move responsibility?** | Memory should stay shared. Writing new fingerprints belongs at **end of Content Package / persist**. Concept-level avoid-list belongs in **Video Concept**, not only Package |

---

### 4. Content Strategy

**Files:** `lib/ai/workflows/planContentStrategy.ts`; `lib/ai/prompts/contentStrategyPlan.ts`  
**Provider:** Claude (`getStrategyProvider`)

| # | Answer |
|---|--------|
| **1. Enters** | Product Brain, constraints, Pain Point First, proof, scenarios, service mix, anti-rep memory, funnel mix, eligible trends, evergreen topics, packageCount |
| **2. Leaves** | Theme + funnel distribution + `content_plan[]` → strategy items (`topic`, `angle`, `funnel_stage`, run index) |
| **3. Missing** | Explicit per-item pain_point id/mode; desired emotional register; CTA intent; proof hint; “what must be different vs siblings”; educational vs story vs conversion brief |
| **4. Better** | Emit structured item briefs: `pain_point`, `viewer_question`, `desired_emotion`, `cta_intent`, `diversity_lens`. Keep topic/angle short but **decision-complete** |
| **5. Repetition** | Memory + evergreen reuse rules help; without strong diversity lenses, batches still rhyme |
| **6. Reduce creativity** | Heavy ID/source rules can privilege library reuse over invention when lists are dense |
| **7. Hallucinate** | “Never invent UUIDs” is strong. Topic text can still invent product claims if brain is vague |
| **8. Move responsibility?** | Pain-point anchoring should **travel with the item** into Concept/Opening/Package. Do not re-decide funnel at Package (already locked — good) |

**Not re-run on Regenerate** — correct for stability; quality then depends entirely on creative stages + instruction.

---

### 5. Video Concept

**Files:** `lib/content-pipeline/prompts/videoConcept.ts`, `runVideoConcept.ts`  
**Provider:** Claude (`getCopywritingProvider`)

| # | Answer |
|---|--------|
| **1. Enters** | Brain, proof, scenarios, memory, strategy item, optional package slot N of M, optional full regen block |
| **2. Leaves** | `title`, `core_idea`, `narrative_arc`, `emotional_tone`, `audience_insight`, `product_role`, `why_it_works`, `visual_direction{...}` |
| **3. Missing** | Pain Point First; creative directives (mode / hook archetype / voice); fingerprint avoid-list; explicit educational beat; conversion ask timing; “what the viewer learns”; conflict/stakes specificity |
| **4. Better** | Require concrete stakes + product moment in `narrative_arc` / `product_role`; ban generic B2B atmospheres in rules; inject mode/archetype as soft creative constraints; sibling diversity beyond one slot line |
| **5. Repetition** | Medium–high without fingerprint memory; `PACKAGE SLOT` line is weak vs structured sibling summaries |
| **6. Reduce creativity** | “ONE concept, no candidates” is intentional; without directive variety, outputs cluster on safe metaphors |
| **7. Hallucinate** | Grounding in brain/proof helps; `why_it_works` can invent marketing psychology; product_role can overclaim if unconstrained |
| **8. Move responsibility?** | Keep story ownership here. Move **final look polish** only if Visual Identity becomes generative; keep hook ownership out (Opening) |

---

### 6. Opening Impact

**Files:** `lib/content-pipeline/prompts/openingImpact.ts`, `runOpeningImpact.ts`  
**Provider:** OpenAI text (`getJsonRepairProvider`) — intentional split from Claude copywriting

| # | Answer |
|---|--------|
| **1. Enters** | Brain, memory, concept fields (not full visual_direction JSON), topic/angle, regen block. **No proof/scenarios** |
| **2. Leaves** | `first_image`, `first_spoken_sentence`, `emotion`, `pacing`, `attention_pattern` |
| **3. Missing** | Product/proof grounding; funnel stage; default CTA context; language-specific hook craft examples; scroll-stop criteria checklist; concept `visual_direction.environment` (only partial concept fields) |
| **4. Better** | Add thin proof + primary pain; require hook to imply the conflict in `core_idea`; score-style self-check in prompt (curiosity, specificity, product-truth); pass `visual_direction` so first_image matches world |
| **5. Repetition** | Hook text anti-rep works; `attention_pattern` / emotion patterns can still repeat without pattern memory |
| **6. Reduce creativity** | Thin prompt + “never invent product facts” without positive product ammunition → generic shock/curiosity hooks |
| **7. Hallucinate** | Highest relative risk for **non-product** openings (catchy but off-brand). Product fact invention is warned against but under-constrained by examples |
| **8. Move responsibility?** | Keep as **hook owner** (good). Do not let Package redesign openings (align already enforces). Optionally move “first_image must match Visual Identity world” into a deterministic check after Visual Identity |

**Critical coupling:** Content Package **must** use this hook; runner overwrites hook + prefixes voiceover (`runContentPackage.ts`). Weak Opening Impact permanently caps package quality.

---

### 7. Visual Identity

**Files:** `lib/content-pipeline/visualIdentity.ts`  
**Provider:** none (copies Concept `visual_direction` + Opening emotion/first_image)

| # | Answer |
|---|--------|
| **1. Enters** | Concept.visual_direction + Opening emotion/first_image |
| **2. Leaves** | Assembled identity object persisted and JSON-dumped into Package prompt |
| **3. Missing** | Consistency rules vs opening image; brand palette from project; series visual memory; shot grammar for 3–5 scenes |
| **4. Better** | Either (a) keep deterministic but add series avoid + brand palette merge, or (b) make a small dedicated visual pass — only if Concept visual_direction stays too vague |
| **5. Repetition** | High if Concept environments cluster (office/laptop/dashboard defaults) |
| **6. Reduce creativity** | Pure copy — no independent invention; creativity bottleneck is entirely Concept |
| **7. Hallucinate** | Low (no LLM). Can propagate Concept hallucinations into all image prompts |
| **8. Move responsibility?** | Today this stage is a **label**, not a decision. Either enrich Concept visual rules or give this stage real work (series-aware refinement). Avoid a third LLM unless quality evidence demands it |

---

### 8. Content Package

**Files:** `lib/content-pipeline/prompts/contentPackage.ts`, `runContentPackage.ts`  
**Provider:** Claude

| # | Answer |
|---|--------|
| **1. Enters** | Brain, proof, scenarios, memory, website rules, strategy item, full Concept JSON, Opening Impact, Visual Identity JSON, ≤24 assets, variant counts, platform style blocks, constraints, regen block |
| **2. Leaves** | Full package JSON: title, hook, VO, subtitles, CTA, video, platform_outputs, hashtags, image_prompts / visual_scenes, assets, scenario; stamps pipeline artifacts |
| **3. Missing** | Pain Point First; creative directives; storytelling beat contract (hook→escalation→product→CTA); educational takeaway; CTA quality rubric; “do not paste VO into captions” already present via platform styles but easy to miss amid bloat |
| **4. Better** | Slim repeated brain/memory if Concept already used them; add a short **story spine** checklist; require CTA to match funnel; require scenes to progress the Concept arc; inject mode/persona as delivery constraints |
| **5. Repetition** | Can rewrite middle of VO freshly while hook is locked; platform captions can still homogenize |
| **6. Reduce creativity** | Large prompt + “honor opening/identity exactly” + single-pass JSON → competent but template-shaped scripts |
| **7. Hallucinate** | Hard rules + guardrails help; script middle and proof misuse remain risks; assets may be misdescribed |
| **8. Move responsibility?** | Keep packaging + platforms here. Do not re-invent concept/opening. Consider splitting **platform caption rewrite** only if Package quality is overloaded |

---

### 9. Platform Outputs

**Not a separate LLM.** Authored inside Content Package; telemetry step is pass-through; persist maps to `content_items`.

| # | Answer |
|---|--------|
| **1. Enters** | Package prompt platform style + native writing rules + required platform list + variant counts |
| **2. Leaves** | Per-platform caption/CTA/hashtags (+ variants); persisted as content items |
| **3. Missing** | Platform-specific hook diversity beyond X variants; funnel-aware CTA; proof snippet for LinkedIn; native CTA patterns per surface |
| **4. Better** | Explicit “rewrite facts, don’t reformat VO”; per-funnel CTA intents; optional second tiny LLM only for high-multiplier platforms if quality lags |
| **5. Repetition** | High risk of VO paraphrase across TikTok/IG/YT |
| **6. Reduce creativity** | Shared video + many platforms → captions become metadata, not native posts |
| **7. Hallucinate** | URL rules are strong; captions may invent offers not in brain |
| **8. Move responsibility?** | Keep in Package for cost. If native writing fails audits, extract a **Platform Rewrite** stage fed only VO synopsis + funnel + styles (not full brain dump) |

---

## Whole-pipeline evaluation

| Dimension | Assessment | Notes |
|-----------|------------|-------|
| **Variety** | Weak–moderate | Topic/hook text anti-rep works; concept/visual/mechanism variety under-served |
| **Originality** | At risk | Directives unused; no fingerprint write path; single-pass, no exploration |
| **Storytelling** | Moderate | Concept has `narrative_arc` but Package lacks beat contract; modes unused |
| **Product understanding** | Moderate | Brain+proof present; Opening under-grounded; Pain Point First stops at Strategy |
| **Visual consistency** | Good structure, uneven quality | Identity is authoritative once set; quality depends on Concept `visual_direction` concreteness |
| **CTA quality** | Weak–moderate | default_cta + platform styles; no CTA intent from strategy; verbatim CTA anti-rep only |
| **Hook quality** | Make-or-break | Dedicated stage is right; prompt is thin; locks the whole package |
| **Educational value** | Weak | No explicit “viewer learns X” field beyond optional arc wording |
| **Emotional impact** | Moderate | Opening emotion + Concept tone exist; not enforced through script beats |
| **Conversion potential** | Funnel-dependent | Funnel locked from strategy (good); Conversion packages lack dedicated ask/structure |

---

## Cross-cutting issues (with severity)

### ISSUE-01 — Creative directives never enter LLM prompts

- **Severity:** Critical  
- **Why it matters:** `pickCreativeDirectives` still runs and stamps `creative_mode` / narrative beats onto video jobs, but `buildCreativeDirectiveBlock` is not used by Content Pipeline prompts. Modes, hook archetypes, and voice personas no longer steer generation → variety collapses to model defaults.  
- **Recommended solution:** Inject a compact directive block into Video Concept and Content Package (and optionally Opening). Keep deterministic pick; make it prompt-visible.  
- **Estimated impact:** Large gain in batch variety and recognizable creative “shapes” without restoring CE.

### ISSUE-02 — Fingerprint / visual memory collected but inert

- **Severity:** Critical  
- **Why it matters:** Memory still scrapes fingerprints/atmospheres/directions from legacy packages, but `antiRepetitionBlock` only lists hooks/topics/CTAs/scenarios. New pipeline packages do not write fingerprints → anti-rep for *ideas and worlds* decays over time.  
- **Recommended solution:** Define Content Pipeline fingerprint (core_idea + environment + attention_pattern + product_role hash); persist on package; inject “recent concepts/worlds” into Video Concept.  
- **Estimated impact:** Major reduction in lookalike concepts across a project’s history.

### ISSUE-03 — Pain Point First stops at Content Strategy

- **Severity:** High  
- **Why it matters:** Explicit pain-first rules exist only in strategy prompts. Concept/Opening/Package only see pain_points as one brain bullet → drift to minor details returns.  
- **Recommended solution:** Persist `pain_point` (+ mode) on strategy items; reinject Pain Point First (or the item’s pain) into Concept, Opening, and Package.  
- **Estimated impact:** Stronger product-relevant storytelling and conversion relevance.

### ISSUE-04 — Opening Impact under-grounded relative to its power

- **Severity:** High  
- **Why it matters:** Opening owns the hook and first image, but omits proof/scenarios and most visual_direction. Package cannot fix a weak/off-product hook.  
- **Recommended solution:** Pass primary pain, 1–3 relevant proofs/scenarios, and concept visual world into Opening; add hook quality criteria (specific, conflictful, product-true, non-generic).  
- **Estimated impact:** Better hooks and fewer “clever but empty” opens; lifts every downstream asset.

### ISSUE-05 — Regenerate vs anti-repetition self-conflict

- **Severity:** High  
- **Why it matters:** Regen says prior package is context-not-forbidden; memory still lists that package’s hook/CTA under AVOID (no exclusion). Models thrash or over-change.  
- **Recommended solution:** Exclude current `package_id` from memory on regenerate; soften anti-rep rules when regen instruction says “keep hook/wording.”  
- **Estimated impact:** More controllable regenerations; less random drift.

### ISSUE-06 — Triple dump of regeneration prior JSON

- **Severity:** Medium  
- **Why it matters:** Full prior concept/opening/identity JSON is injected into Concept, Opening, and Package → prompt bloat, duplicate reasoning, higher cost/latency, safer paraphrase bias.  
- **Recommended solution:** Stage-scoped prior context (Concept gets prior concept; Opening gets prior opening + concept summary; Package gets summary + remain/change flags only).  
- **Estimated impact:** Cleaner instructions, lower tokens, sharper remain-vs-change behavior.

### ISSUE-07 — Visual Identity is a no-op decision stage

- **Severity:** Medium  
- **Why it matters:** Stage exists in architecture/telemetry but only copies fields. Duplicate representation (Concept visual_direction → Identity → Package JSON) without added value.  
- **Recommended solution:** Either fold into Concept persistence naming, or give Identity real jobs (series avoid, brand palette, opening-image coherence check).  
- **Estimated impact:** Clearer ownership; possible visual diversity if series-aware refinement is added.

### ISSUE-08 — Sibling package diversity is under-specified

- **Severity:** Medium  
- **Why it matters:** Only “PACKAGE SLOT N of M” on Concept (and only when both index/count exist). No previousAngles / diversity lenses from the old presentation stack.  
- **Recommended solution:** Pass compact sibling summaries (topic, hook, core_idea, environment) into Concept for the same run.  
- **Estimated impact:** Noticeably less same-batch sameness.

### ISSUE-09 — Repeated context across Claude stages (prompt bloat)

- **Severity:** Medium  
- **Why it matters:** Brain + constraints + memory (+ proof/scenarios) repeat in Strategy (once) then Concept + Package; Opening repeats brain/memory/constraints. Increases cost and dilutes attention to stage-specific rules.  
- **Recommended solution:** Concept = full grounding; Opening = slim + concept; Package = concept/opening/identity authoritative + **delta** knowledge (assets, platforms, website) rather than full re-teach.  
- **Estimated impact:** Better instruction-following; moderate cost savings.

### ISSUE-10 — Storytelling / education / CTA lack explicit contracts

- **Severity:** Medium  
- **Why it matters:** Package schema accepts a script but prompts don’t require beat progression, viewer takeaway, or funnel-matched CTA. Emotional tone from Concept may not survive VO.  
- **Recommended solution:** Add short HARD RULES: arc must realize `narrative_arc`; include one concrete takeaway; CTA type/text must match funnel_stage; scenes must escalate same conflict.  
- **Estimated impact:** Stronger mid-video retention and conversion clarity.

### ISSUE-11 — Claude vs OpenAI ownership is only partially clear

- **Severity:** Medium  
- **Why it matters:** Routing comment says OpenAI text = JSON repair/helper; Opening Impact uses that provider for a **creative** job. Works, but quality bar and temperature/prompt craft may be tuned for repair, not scroll-stopping hooks.  
- **Recommended solution:** Document Opening Impact as the one creative OpenAI text role; tune system prompt/model settings for attention craft; keep Claude on strategy/concept/package narrative.  
- **Estimated impact:** Better hooks if OpenAI pass is optimized for the job; clearer ops ownership.

### ISSUE-12 — Knowledge relevance is global, not per-item

- **Severity:** Medium  
- **Why it matters:** Same first 12 proofs/scenarios every time → first bullets dominate; later ones ignored; relevance to topic is left to the model.  
- **Recommended solution:** Rank/select knowledge by strategy topic/angle before Concept (deterministic or tiny classifier).  
- **Estimated impact:** More specific product demonstration and less generic proof spam.

### ISSUE-13 — Platform native writing competes with package cognitive load

- **Severity:** Low–Medium  
- **Why it matters:** Platform styles are solid but sit at the end of a large Package prompt after full JSON dumps. Models often under-apply native rules.  
- **Recommended solution:** Move platform rules adjacent to `platform_outputs` schema hint; or post-pass rewrite.  
- **Estimated impact:** More native captions; better distribution performance.

### ISSUE-14 — Attention / delivery for video worker mostly empty

- **Severity:** Low  
- **Why it matters:** Legacy attention plans aren’t produced; `attentionFieldsForVideoJob` often empty. TTS/SFX lose emotional performance hints Opening already invented (`emotion`, `pacing`).  
- **Recommended solution:** Map Opening Impact fields into video job input (deterministic).  
- **Estimated impact:** Better VO performance without a new LLM call.

### ISSUE-15 — Unnecessary LLM work / regenerate always re-runs all creative stages

- **Severity:** Low–Medium (cost/quality tradeoff)  
- **Why it matters:** Opening-only feedback still re-runs Video Concept LLM; visual-only feedback re-runs Concept + Opening. Wastes tokens and invites unintended concept drift.  
- **Recommended solution:** Instruction router: skip Concept LLM when instruction is opening/visual/wording-only and prior artifacts exist; still allow full re-run for “different concept.”  
- **Estimated impact:** Faster, more faithful regenerations; lower cost.

---

## Generate-once, reuse-later opportunities

| Artifact | Generate once | Reuse where |
|----------|---------------|-------------|
| Product Brain serialization | Per request is fine (cheap) | All stages — already |
| Ranked proof/scenarios for **this** strategy item | After strategy item selected | Concept, Opening, Package |
| Pain point assignment | Strategy | All creative stages |
| Creative directives | Already picked once | Inject into Concept + Package (+ Opening) |
| Video Concept | Once per package | Opening, Visual Identity, Package, video job, regen prior |
| Opening Impact | Once | Package align, Visual Identity, video job delivery |
| Visual Identity | Once (or refine once) | All image prompts / scenes |
| Platform style block for target set | Once per run config | Package (and optional platform post-pass) |
| Anti-rep memory | Once per generate/regen | All creative stages |
| Sibling diversity summary | Once per run as packages complete | Later Concept calls in same run |
| Content Pipeline fingerprint | At persist | Future memory builds |

**Do not regenerate:** product facts, funnel_stage, strategy topic (on regenerate), website URL rules, asset metadata.

**Do regenerate carefully:** Concept only when instruction requires it; Opening when hook/visual open changes; Package always when outputs must refresh.

---

## Overlaps / duplicate reasoning (summary)

| Overlap | Stages | Risk |
|---------|--------|------|
| Anti-repetition rules | Strategy, Concept, Opening, Package | Dilution; regen conflict |
| Product Brain + HARD CONSTRAINTS | Concept, Opening, Package | Bloat |
| Proof + scenarios | Strategy, Concept, Package | Same bullets dominate |
| Visual look | Concept → Identity → Package JSON | Triple statement, one decision |
| Hook | Opening invent → Package honor → deterministic overwrite | Correct ownership, redundant prompting |
| Regen prior JSON | Concept, Opening, Package | Bloat + paraphrase bias |

---

## Weak prompt / responsibility clarity (summary)

| Area | Finding |
|------|---------|
| Opening Impact prompt (~80 lines) | Too light for its authority |
| Video Concept rules | Thin on anti-generic-visual and stakes |
| Content Package | Strong honor rules; weak story/CTA/education contracts |
| Visual Identity | Architectural stage without creative responsibility |
| Platform Outputs | Not a real stage — responsibility buried in Package |
| Claude | Strategy + Concept + Package narrative (clear) |
| OpenAI text | Repair **and** Opening Impact creative (needs explicit product definition) |

---

## Recommended quality work order (no code in this audit)

1. **Wire creative directives into Concept + Package prompts** (ISSUE-01)  
2. **Persist + inject concept/visual fingerprints** (ISSUE-02)  
3. **Carry Pain Point First / item pain into creative stages** (ISSUE-03)  
4. **Strengthen Opening Impact grounding + hook criteria** (ISSUE-04)  
5. **Fix regenerate memory exclusion + stage-scoped prior context** (ISSUE-05, ISSUE-06)  
6. **Sibling diversity summaries + Package story/CTA contracts** (ISSUE-08, ISSUE-10)  
7. **Map Opening emotion/pacing into video job; slim repeated context** (ISSUE-14, ISSUE-09)

---

## Out of scope (intentionally not recommended as first moves)

- Restoring Creative Engine, Candidate Judge, or repair loops  
- Adding feature flags / dual pipelines  
- Extra LLM stages without evidence from the above wiring fixes  

The architecture is ready for quality investment. Most gains are **prompt + context plumbing**, not new stages.
