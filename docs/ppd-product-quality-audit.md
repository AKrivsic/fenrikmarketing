# PPD Product Quality Audit

**Date:** 2026-07-21  
**Type:** Product quality review (not a code review)  
**Verdict:** Would not renew

Runs reviewed:

| Run | Role | ID |
|---|---|---|
| Old reference (before PPD) | Comparison baseline | `b98a3ba8-4e34-4027-82d4-c58a798f7201` |
| First PPD | Paper-stack investigation | `9aa3193e-dcf4-4b34-a0a7-96f141654b36` |
| Monthly strategy | Diversity + reliability | `d137e60f-b43f-4a11-b77e-b1bfd3410a1a` |

---

## Verdict in one line

PPD made product presentation more honest (no fake UI), but the content got less publishable: longer, more generic, metaphor-stuck, and the monthly run mostly reprinted two prior winners. A paying customer would not buy another month.

| Metric | Value |
|---|---|
| Buy another month? | **NO** |
| Monthly packages delivered | 2 / 4 |
| Distinct creative ideas across 4 videos | 2 |
| New voice vs old reference | Worse |

---

## Package scorecard

Scores = “would a real company confidently publish this on TikTok/Reels?” — not technical correctness.

| Package | Hook | Attention | Interest | Creativity | Candidate / PPD | Voice |
|---|---|---|---|---|---|---|
| **Old reference** `c8c17f53` — After Hours, Chats Still Screaming | 7 | 7 | 6 | 5 | `c7-visual_exaggeration-div` · PRODUCT_DEMO (pre-PPD) | cedar · 20.7s |
| **First PPD** `f0a2df21` — Paper mountain of anonymous visits | 6 | 4 | 4 | 4 | `c5-visual_exaggeration-div` · ABSTRACT_MECHANISM | cedar · 22.2s |
| **Monthly #0** `af5dbd64` — Website open 24/7… silent | 6 | 5 | 4 | 3 | `c7-visual_exaggeration-div` · ABSTRACT_MECHANISM | shimmer · 29.4s |
| **Monthly #2** `4a08a893` — Accountant long weekend | 5 | 4 | 3 | 3 | `c5-visual_exaggeration-div` · ABSTRACT_MECHANISM | shimmer · 29.0s |

### Old reference · b98a3ba8 — best of the set

Night business + unanswered chats is a clear, feelable problem. Fake PRODUCT_DEMO is dishonest as product UI, but as marketing it lands the payoff: question → instant answer → lead captured.

**Why it still wins:** Short (~22s). Punchy lines. Emotional arc: silence → loss → relief. Hook is specific. Product moment is concrete. Cedar voice feels steadier and less “AI presenter.”

### First PPD · f0a2df21 — paper stack mystery

**Paper in almost every scene is intentional — not an image bug.**

Hardcoded creative template **c5 · “Paper mountain of anonymous visits”** literally specifies a tower of session logs beside a suitcase. Story integrity repair then forces every middle scene to stay in that world — so image gen correctly repeats paper + suitcase.

**Diagnosis:** prompt/scene-planner fidelity to a sticky metaphor, amplified by story-integrity. Not random generation noise.

---

## Similarity checks — not coincidence

### af5dbd64 ≈ b98a3ba8 — systemic clone

Same winner candidate **`c7-visual_exaggeration-div`**, same forced hook **“After hours, chats still screaming.”**

Same night interior, security light, glowing tablet, unanswered chat metaphor. Monthly package is a longer, softer remake with abstract bubbles instead of a real product demo. Strategy topic was different; creative layer collapsed it back to the template.

### 4a08a893 ≈ f0a2df21 — systemic clone

Same winner **`c5-visual_exaggeration-div`**, same hook **“Paper mountain of anonymous visits.”**

Same suitcase + absurd paper tower + empty desk → abstract chat laptop ending. Warmth/prop details change; structure does not. This is template replay, not creative coincidence.

### Root cause of repetition

Creative ideas live in a small hardcoded template pool (`generateRawSituations.ts`). Scoring prefers `visual_exaggeration`. Hook enforcement stamps the candidate `scrollStopCue` onto the voiceover. Anti-repetition memory is textual and weak against deterministic winners. Angle lenses / strategy topics cannot overpower this.

---

## Quality dimensions (all completed packages)

| Dimension | Finding |
|---|---|
| **Hook (2s)** | Old night tablet: decent stop. Paper mountain: curious once, dead on repeat. Hook text itself is poetic but not scroll-stopping as a spoken first line. |
| **Attention** | Old holds via escalation + product demo. PPD packages flatten after beat 2 — same room, same prop, abstract payoff. Monthly cuts are ~30s of restating one idea. |
| **Interest** | Recognizable B2B SaaS AI cadence: problem metaphor → silence → “AI answers while you’re away.” Feels generated, not authored. |
| **Creativity** | Safe marketing zone. Exaggeration family dominates. No risky humor, no founder POV, no specific vertical craft beyond accountant props. |
| **Voice** | Old cedar is tighter and more trustworthy. Monthly shimmer + longer scripts feel smoother but flatter — less rhythm, less bite. Instructions are generic brand-tone soup. |
| **Product presentation** | PPD succeeded at honesty (no fake UI) and failed at persuasion. Abstract chat bubbles do not prove Fenrik. Old fake demo was more commercially effective. |
| **Memorability** | After 10 minutes: “paper mountain” sticks as a phrase; the company does not. Night tablet is forgettable once seen twice. |
| **Shareability** | Unlikely. Colleague-forward content needs a sharp insight or laugh. These are polite problem restatements. |
| **Trust** | Abstract product ending slightly lowers trust vs a concrete demo. Pretty AI stock rooms also read as synthetic. |
| **Want another?** | Not from this set. Seeing the second paper mountain ends curiosity about the channel. |

---

## Per-package evaluation detail

### Old reference — `c8c17f53` (run b98a3ba8)

| Dimension | Score | Notes |
|---|---|---|
| Hook | 7 | Night + unanswered chats — feelable in 2s |
| Attention | 7 | Escalation + concrete product demo payoff |
| Interest | 6 | Strong problem framing; still familiar SaaS arc |
| Creativity | 5 | Solid exaggeration; not wild, but coherent |
| Voice | — | cedar, ~20.7s speech — best emotion/rhythm in set |
| Product | — | Fake PRODUCT_DEMO, but commercially clear |
| Memorability | — | Yes — after-hours silence |
| Shareability | — | Possible to a service-business owner peer |
| Trust | — | Demo helps; fake UI hurts honesty |
| Want another | — | Yes, if variety continues |

**Voiceover:**
> After hours, chats still screaming. Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothing. Not a word. They didn't leave a message. They just left. The website wasn't broken. It was silent. Your AI assistant answers the moment someone asks — even when you can't.

---

### First PPD — `f0a2df21` (run 9aa3193e)

| Dimension | Score | Notes |
|---|---|---|
| Hook | 6 | “Paper mountain” is vivid once |
| Attention | 4 | Same prop for 4 scenes; payoff weak |
| Interest | 4 | Generic AI marketing once metaphor is decoded |
| Creativity | 4 | Template exaggeration, not a leap |
| Voice | — | cedar, ~22.2s — OK, less punch than old |
| Product | — | ABSTRACT_MECHANISM — forced/abstract |
| Memorability | — | Phrase sticks; product does not |
| Shareability | — | Low |
| Trust | — | Pretty but synthetic |
| Want another | — | Weak |

**Voiceover:**
> Paper mountain of anonymous visits. Three people spent real minutes on your services page last night. Typed into the contact form. Then left — without sending it. You found out this morning. That is not a missing feature. That is your website going silent the exact moment someone needed it to speak. Every night without an answer is a visitor quietly choosing someone else.

**Paper stacks conclusion:** intentional repeated visual metaphor from candidate `c5` + story integrity world lock. Not image-generation hallucination.

---

### Monthly #0 — `af5dbd64` (run d137e60f)

| Dimension | Score | Notes |
|---|---|---|
| Hook | 6 | Same as old — familiarity kills novelty |
| Attention | 5 | Longer remake of a known idea |
| Interest | 4 | Soft essay version of old video |
| Creativity | 3 | Clone |
| Voice | — | shimmer, ~29.4s — smoother, flatter, worse |
| Product | — | Abstract bubbles; weaker than old demo |
| Memorability | — | Low (already seen) |
| Shareability | — | No |
| Trust | — | Neutral/low |
| Want another | — | No |

**Voiceover:**
> After hours, chats still screaming. It just never answers. Every night, visitors land, type a question, wait — and leave. No reply. No lead. No record they were ever there. That's not a traffic problem. That's a response problem. Your website already has the answers. It just has no way to say them. Fenrik.chat reads your site and builds an AI assistant in about a minute. Create yours — let your website keep talking when you can't.

---

### Monthly #2 — `4a08a893` (run d137e60f)

| Dimension | Score | Notes |
|---|---|---|
| Hook | 5 | Second paper mountain in a day |
| Attention | 4 | Same carousel of paper/suitcase |
| Interest | 3 | Obvious remake |
| Creativity | 3 | Clone |
| Voice | — | shimmer, ~29.0s — same flat essay energy |
| Product | — | Abstract chat laptop ending |
| Memorability | — | Paper motif only |
| Shareability | — | No |
| Trust | — | Low |
| Want another | — | Actively reduces desire |

**Voiceover:**
> Paper mountain of anonymous visits. Your website was open. Nobody answered. They browsed your services page. Read your bio. And left. No form. No email. No name. Just a row of anonymous sessions in your analytics — a paper mountain of invisible demand. Here's the part that stings: they were ready. Your website just had nothing to say. An AI assistant answers while you're away — and captures the lead before they move on.

---

## Monthly strategy audit · d137e60f

Strategy brief planned four distinct stories. Generation delivered two remakes of prior hits. This does **not** feel like a month of content — it feels like one idea printed twice with different wardrobe.

| Slot | Strategy intent | What shipped | Outcome |
|---|---|---|---|
| #0 Awareness | Owner discovers silent website at night | Clone of old after-hours video (`c7`) | Completed |
| #1 Problem | SaaS founder answering same 5 questions | Never produced (Claude 529) | Stuck queued |
| #2 Problem | Accountant returns from long weekend | Clone of first PPD paper mountain (`c5`) | Completed |
| #3 Solution | Website starts answering on its own | Story integrity fail (`fog_silhouettes` / chatbot) | Failed |

### Diversity score (monthly pair only)

| Axis | Score | Note |
|---|---|---|
| Hook diversity | 1/10 | Only 2 hooks; both reused from prior runs |
| Visual diversity | 2/10 | Night tablet vs paper/suitcase — then locked |
| Story diversity | 2/10 | Identical beat grammar |
| Emotional diversity | 2/10 | Quiet regret → soft hope, twice |
| Metaphor diversity | 1/10 | Screaming chats / paper mountain only |
| Pacing diversity | 2/10 | Both ~30s essay VO |
| CTA diversity | 3/10 | Same sign-up family, minor wording |
| Funnel diversity | 2/10 | Awareness + problem; solution never shipped |

### Repeated motifs observed

- Stacks of paper (`c5` packages, every scene)
- Suitcase / briefcase return-from-away prop
- Identical openings via hook enforcement
- Endings: empty room + abstract chat bubbles
- Camera: wide desk still → closer still → clean laptop
- Narrative: silence problem → response problem → AI
- Soft polished 3D / lifestyle stock look

---

## Technical audit · why 4 became 2

**Bug: run never terminates.**

n8n loop continued after failures (good). But Claude 529 on slot #1 did not mark the `production_run_item` failed — it stayed queued. Slot #3 failed story_integrity and was marked. Run status remains **`running`** with `generated=2`, `failed=1`, `requested=4`. One package failure did not block others; incomplete failure settling blocked the run from closing.

| Event | Detail |
|---|---|
| Orchestrator | n8n `NAKo5V3Ctlq5aW4i` execution `153` · Loop over 4 strategy items |
| #0 | Generate OK → Start Video · `af5dbd64` |
| #1 | HTTP 422 `operational_failure` · Claude 529 Overloaded · item never failed |
| #2 | Generate OK → Start Video · `4a08a893` |
| #3 | HTTP 422 `generation_failed` · story_integrity (`fog_silhouettes`, chatbot actor) |
| Loop end | Workflow status success · `production_runs.status` still running |
| Failure isolation | Worked — later packages still attempted |
| Failure settlement | Broken for `operational_failure`; run left non-terminal |

Strategy items in loop order:

0. `dfbd054f` · awareness · silent website at night  
1. `e4956368` · problem_aware · SaaS founder / same five questions  
2. `178b180a` · problem_aware · accountant long weekend  
3. `10f9e9f0` · solution_aware · website answering on its own  

---

## Biggest strengths

1. Old reference proves the pipeline can produce a watchable, emotionally coherent short when candidate + length + product payoff align.
2. PPD correctly refuses fake product UI — appearance honesty improved.
3. Visual craft is consistently “premium stock” — lighting, depth, 9:16 framing are production-ready even when the idea is not.
4. Monthly strategy LLM itself proposed diverse topics; the collapse happens downstream in creative candidates, not in strategy text.
5. Loop continues after package errors — partial delivery is possible.

## Biggest weaknesses

1. Creative system is a template jukebox with ~2 preferred songs for this product — monthly content cannot diversify.
2. PPD removed the only commercially sharp product moment and replaced it with abstract bubbles that do not sell.
3. Scripts got longer and flatter (22s → 30s); voice lost urgency.
4. Metaphor fidelity overkill: one prop dominates every frame until the video feels like a still-image carousel.
5. Reliability: a 4-pack month delivered half a month and hung “running.”

---

## Top 10 improvements · by expected impact

| # | Improvement | Why it matters |
|---|---|---|
| 1 | Hard block duplicate hooks/candidates inside a run and across recent packages | Stops shipping remakes as a “month of content” |
| 2 | Replace sticky template winners with a larger, freshness-weighted idea pool (or real ideation) | Creativity is capped by ~15–20 hardcoded scenes today |
| 3 | Invent a PPD “proof beat” that is honest AND concrete (real UI asset, recorded demo, or outcome without fake chrome) | Abstract bubbles do not convert; fake demo did |
| 4 | Enforce metaphor budget: hero prop in hook only, not every scene | Kills paper-mountain fatigue without killing the idea |
| 5 | Cap VO length / restore old punchy beat density (~20–23s) | Attention dies in the essay middle |
| 6 | Voice direction as performance, not brand adjectives — emotion map per beat | Current TTS instructions are interchangeable mush |
| 7 | Settle `operational_failure` like `generation_failed`; never leave items queued | Fixes hung runs and missing packages |
| 8 | Retry/backoff on Claude 529 inside the package loop | Slot #1 was a good diverse strategy topic that vanished to overload |
| 9 | Make strategy funnel diversity survive generation (solution-aware must not collapse to awareness metaphor) | Month needs different jobs, not different costumes |
| 10 | Anti-repetition must cover visual motifs (paper, suitcase, night tablet), not just hook strings | Textual memory cannot see the clones |

---

## Final answer

### If you were a paying customer, would you buy another month of content after seeing these outputs?

# NO

I paid for a month of content and received two near-duplicates of videos I already had, with weaker product proof, longer weaker voiceovers, and two slots missing. The strategy promised variety; the factory reprinted its favorite metaphors. Pretty frames are not enough — I would not confidently publish these as the face of the company, and I would not renew for more of the same.
