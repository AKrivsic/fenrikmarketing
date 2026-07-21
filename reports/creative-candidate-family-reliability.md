# Creative Candidate family reliability — current pipeline

**Scope:** Analysis only. No code changes. No prompt redesign proposals.  
**Question:** Which Creative Candidate families survive the full pipeline and produce understandable, engaging videos?

**Taxonomy:** There are exactly **8** Creative Candidate families in `creative-candidates@2.3` (`lib/creative-candidates/types.ts`). There are not 20+ families — so “Top 10 / Bottom 10” below is a **ranked list of all 8**, with the remaining slots called out as empty.

---

## Evidence boundary (critical)

| Fact | Value |
| --- | --- |
| Packages with Creative Candidates in production | **3** |
| Families ever selected as winner | **1** (`absurd_understandable`) — 3/3 |
| Families generated & scored but never rendered as winner | **7** |
| Older production runs (pre-candidate system) | Not labeled with these families — excluded from family scores |

### End-to-end packages

| Run | Package | Winner | Hook | Script fidelity | Human / audit outcome |
| --- | --- | --- | --- | --- | --- |
| `04911a16…` | `ff367a55…` | absurd_understandable | Mascot suffers, fake typing online. | **PASS** | Originality-loss audit: mascot/parking-lot **not** executed; collapsed to co-working / laptop. Fidelity = **false positive**. |
| `2fbd759b…` | `754109c7…` | absurd_understandable | Departure board for the wrong channel. | **FAIL** (opening situation) + repair | Machine audit: board rendered with phone/globe icons (NO_TEXT). Fidelity likely **false negative**. Continuity better than 36da. |
| `36da8255…` | `bd8f0491…` | absurd_understandable | Departure board for the wrong channel. | **FAIL** (opening + product) + repair | Pipeline quality **4.3/10**. Scene 1 = unlabeled wall panel; metaphor unreadable. Product not implied. |

**Implication:** Selection-time scores and comparative-judge votes are available for all 8 families. **True production survival** is only measured for `absurd_understandable`. Other family scores below combine (a) selection metrics across the 3 packages and (b) fit vs known pipeline failure modes (NO_TEXT, DNA world override, product abstraction, genericity reject).

---

## Score model (0–10 per dimension)

| # | Dimension | What it means here |
| --- | ---: | --- |
| 1 | Hook strength | Scroll-stop potential of typical hooks (selection `stopPower` + judge stop votes) |
| 2 | Image renderability | Can image gen draw the opening without text/labels? (`visualSpecificity` + NO_TEXT risk) |
| 3 | First-frame comprehension | Would a stranger get it in 1s? (`immediateComprehension` + metaphor dependency) |
| 4 | Narrative preservation | Does package/render keep the candidate spine? (E2E only where known; else estimated from conflict with Identity/Attention) |
| 5 | Product integration | Path from situation → Fenrik-like answer (`productRelevance` + judge `bestProductTopicFit`) |
| 6 | Image consistency | Same world across beats under DNA / Identity pressure |
| 7 | Need for Fidelity repair | Inverse of repair/fail rate when this family wins (or expected when openings need labels) |
| 8 | Overall production success | Understood + engaging final video under **current** pipeline |

**Average** = mean of the 8 dimensions.

---

## Per-family evaluation

### 1. Direct Product World — **avg 6.6 · Prefer**

| Dim | Score | Notes |
| --- | ---: | --- |
| Hook strength | 5 | Lowest stop among families (~5.3 avg). Hooks like “Urgent question dies in silence.” / “Heat relief outside, none online.” |
| Image renderability | 8 | Hands + chat thread / “seen” void / queue+phone are image-native |
| First-frame comprehension | 8 | Highest selection comprehension (~7.0). Literal product-world situations |
| Narrative preservation | 6 | Never won E2E; openings align with Visual Narrative “situation first” so expected better than metaphor families |
| Product integration | 9 | Judge **bestProductTopicFit every time** (3/3). Highest productRelevance |
| Image consistency | 7 | Same human/device world easy to hold across beats |
| Need for Fidelity repair | 7 | Low label dependence → less opening_situation false-neg / less opaque metaphor |
| Overall production success | 7 | Best **predicted** survivor; unproven as winner |

**Strengths:** Product clarity, readable first frame, pipeline-native visuals.  
**Weaknesses:** Weakest stop-scroll; can feel “safer” / less memorable.  
**Typical failure mode (predicted):** Selected against by judge for memorability; if forced, VO may still essay-ify.  
**Recommendation: Prefer** (for reliability under current pipeline).

---

### 2. Visual Exaggeration — **avg 6.1 · Prefer (hook) / Use Carefully (full film)**

| Dim | Score | Notes |
| --- | ---: | --- |
| Hook strength | 7 | Strong stop (~7.3); “Lost work as a physical mountain.” |
| Image renderability | 8 | Physical stacks, mountains of folders — image gen likes concrete props |
| First-frame comprehension | 6 | Clear object, meaning sometimes needs one beat of VO |
| Narrative preservation | 5 | Exaggerate opening often abandoned when Identity forces soft office |
| Product integration | 5 | Product scores mid; exaggeration ≠ product moment |
| Image consistency | 6 | Scale props hard to keep consistent beat-to-beat |
| Need for Fidelity repair | 6 | Less label-dependent than boards/clocks |
| Overall production success | 6 | Judge **clearestMentalImage 3/3** — strong concept, unproven E2E |

**Strengths:** Mental image, renderable props, memorability.  
**Weaknesses:** Product bridge weak; DNA/Identity can flatten the exaggeration.  
**Typical failure mode:** Opening mountain → middle generic desk → abstract chat CTA.  
**Recommendation: Prefer** for opening power; **Use Carefully** as sole spine until proven E2E.

---

### 3. Consequence First — **avg 5.8 · Use Carefully**

| Dim | Score | Notes |
| --- | ---: | --- |
| Hook strength | 9 | Highest stop (~8.0). Judge **mostLikelyToStopScrolling** 2/3 |
| Image renderability | 5 | “Competitor wins” / rival quote needs readable stakes — hard under NO_TEXT |
| First-frame comprehension | 5 | Consequence often needs two subjects (you vs rival) |
| Narrative preservation | 5 | Strong hook line; visual payoff easy to dilute |
| Product integration | 6 | Mid product; story can reach product via “who answered first” |
| Image consistency | 5 | Rival vs you worlds tend to split |
| Need for Fidelity repair | 4 | High risk of opening not matching tokens / opaque rivalry |
| Overall production success | 5 | Great on paper; never selected |

**Strengths:** Scroll-stop, escalation energy.  
**Weaknesses:** Rivalry hard to film without text or two clear actors.  
**Typical failure mode:** Hook says “competitor wins”; frame shows one idle tablet.  
**Recommendation: Use Carefully**.

---

### 4. Human Conflict — **avg 5.5 · Use Carefully**

| Dim | Score | Notes |
| --- | ---: | --- |
| Hook strength | 7 | Strong emotionalCharge (~7); stop ~7 |
| Image renderability | 6 | Argument / walk-away is filmable; ticket-dispenser variants bleed into absurd |
| First-frame comprehension | 5 | Conflict readable; product link not |
| Narrative preservation | 5 | Faces/continuity already weak in older runs |
| Product integration | 5 | Often rejected `topic_collapsed_to_generic_business` |
| Image consistency | 4 | Multi-person continuity is a known pipeline weak spot |
| Need for Fidelity repair | 5 | Medium |
| Overall production success | 5 | Selection wt high once (97) but family purity unclear |

**Strengths:** Emotion, human stakes.  
**Weaknesses:** Genericity rejects; cast continuity; product afterthought.  
**Typical failure mode:** Fight/desk chaos → unrelated product still.  
**Recommendation: Use Carefully**.

---

### 5. Unexpected Comparison — **avg 5.4 · Use Carefully**

| Dim | Score | Notes |
| --- | ---: | --- |
| Hook strength | 6 | Mid-high originality; stop ~6.5 |
| Image renderability | 5 | Needs **two** domains (AC waste ↔ web traffic) in one short |
| First-frame comprehension | 4 | Comparison incomplete in a single frame |
| Narrative preservation | 5 | Easy to keep only one half of the comparison |
| Product integration | 5 | Mid |
| Image consistency | 4 | Two visual worlds fight DNA “one world” |
| Need for Fidelity repair | 5 | Medium–high |
| Overall production success | 5 | Never won; structurally fights single-world DNA |

**Strengths:** Memorable when both sides land.  
**Weaknesses:** Dual-domain storytelling vs single DNA world + 4 stills.  
**Typical failure mode:** Only one side filmed; VO explains the other.  
**Recommendation: Use Carefully**.

---

### 6. Absurd Understandable — **avg 4.4 · Needs redesign** (selection winner, production loser)

| Dim | Score | Notes |
| --- | ---: | --- |
| Hook strength | 8 | Won all 3 selections; high originality/stop |
| Image renderability | 3 | Mascot melt / departure board with labels — fights NO_TEXT + image obedience |
| First-frame comprehension | 2 | **Measured:** 36da panel opaque; 04911 mascot vanished; 2fbd icons only partially decode |
| Narrative preservation | 3 | 04911 originality loss; 36da candidate preservation ~4/10 |
| Product integration | 4 | Product often abstract / not implied (36da fidelity) |
| Image consistency | 4 | Opening metaphor rarely matches later beats |
| Need for Fidelity repair | 2 | Repair on 2/3; false PASS on 1/3; shipped broken anyway |
| Overall production success | 3 | Only family with E2E evidence — and it under-delivers |

**Strengths:** Wins the creative contest; memorable hooks; least interchangeable (judge).  
**Weaknesses:** Exactly what selection rewards (clever one-step metaphor) is what render + NO_TEXT + DNA destroy.  
**Typical failure mode:** Clever board/mascot concept → unlabeled panel / co-working montage → VO carries meaning → fidelity lies or fails → ship.  
**Recommendation: Needs redesign** (of how this family is allowed to express itself under current render constraints — not a prompt-change list here).

---

### 7. Role Reversal — **avg 4.6 · Use Carefully / Avoid (stockout subtype)**

| Dim | Score | Notes |
| --- | ---: | --- |
| Hook strength | 5 | Mid stop (~6) |
| Image renderability | 6 | Empty desk + waiting chat is renderable |
| First-frame comprehension | 5 | Empty desk readable; “chat answers alone” needs UI clarity |
| Narrative preservation | 5 | Product *is* the reversal — good if held |
| Product integration | 6 | Conceptually product-forward (“nobody home except the chat”) |
| Image consistency | 5 | Single location helps |
| Need for Fidelity repair | 4 | Often rejected generic; stockout subtype needs labels |
| Overall production success | 4 | High reject rate; never won |

**Strengths:** Natural product role (chat as the one “awake”).  
**Weaknesses:** Genericity filter; stockout/FAQ metaphors need text.  
**Typical failure mode:** Empty lobby still that could be any SaaS; or labeled shelf that NO_TEXT strips.  
**Recommendation: Use Carefully** (empty-desk variants); **Avoid** label/stockout variants under current pipeline.

---

### 8. Social Observation — **avg 4.1 · Avoid**

| Dim | Score | Notes |
| --- | ---: | --- |
| Hook strength | 4 | Lowest stop (~5) |
| Image renderability | 3 | Dual clocks / shameful reply-time needs readable dials or labels |
| First-frame comprehension | 4 | Observation without labels = two blobs |
| Narrative preservation | 4 | Easy to drop into generic lobby |
| Product integration | 6 | Can point at reply latency → chatbot |
| Image consistency | 5 | Single room OK |
| Need for Fidelity repair | 3 | High NO_TEXT / token-match risk |
| Overall production success | 3 | Lowest weighted totals; rare appearance |

**Strengths:** Quiet insight when clocks are readable.  
**Weaknesses:** Current image stack cannot reliably make dual-metric humor without text.  
**Typical failure mode:** Two clock shapes; VO explains shame; no stop.  
**Recommendation: Avoid** under current pipeline.

---

## Ranked reliability (all 8 families)

Only 8 families exist — this is the full ranking by **predicted / measured production reliability** (not by selection win rate).

### Most reliable (Top — fill as many as exist)

| Rank | Family | Avg | Recommendation | Why |
| ---: | --- | ---: | --- | --- |
| 1 | Direct Product World | 6.6 | Prefer | Best product + comprehension; openings match what image gen + NO_TEXT can show; judge always picks it for product fit — pipeline just never selects it as winner |
| 2 | Visual Exaggeration | 6.1 | Prefer / Use Carefully | Clearest mental image; concrete props render; product bridge weak |
| 3 | Consequence First | 5.8 | Use Carefully | Best stop-scroll on paper; rivalry hard to film without text |
| 4 | Human Conflict | 5.5 | Use Carefully | Emotion yes; continuity + genericity no |
| 5 | Unexpected Comparison | 5.4 | Use Carefully | Dual-world vs single DNA world |
| 6 | Role Reversal | 4.6 | Use Carefully | Product-native idea; often rejected / label-dependent subtypes |
| 7 | Absurd Understandable | 4.4 | Needs redesign | **Only E2E-tested family — fails survival** despite winning selection 3/3 |
| 8 | Social Observation | 4.1 | Avoid | Lowest stop; dual-metric visuals die under NO_TEXT |

### Least reliable (Bottom — same list reversed)

| Rank | Family | Avg | Why |
| ---: | --- | ---: | --- |
| 1 (worst) | Social Observation | 4.1 | Unreadable metrics without text |
| 2 | Absurd Understandable | 4.4 | Selection winner; production evidence shows metaphor death + fidelity lies |
| 3 | Role Reversal | 4.6 | Rejected often; weak when label-based |
| 4 | Unexpected Comparison | 5.4 | Two domains, four stills |
| 5 | Human Conflict | 5.5 | Cast/continuity + generic filter |
| 6 | Consequence First | 5.8 | Stop strong; film weak |
| 7 | Visual Exaggeration | 6.1 | Stronger but unproven E2E |
| 8 (best) | Direct Product World | 6.6 | Strongest fit to current constraints |

**Top 10 / Bottom 10:** Not applicable as 10 distinct Creative Candidate families — only 8 exist. Do not invent families to pad the list.

---

## Selection vs production (the core finding)

```
Selection rewards:  originality · stop · “least interchangeable” metaphor
Pipeline delivers:  NO_TEXT stills · DNA/Identity world flattening · abstract product reveal

→ absurd_understandable wins the contest and loses the film.
→ direct_product_world wins the product vote and never gets to film.
```

| Signal | Who wins it | E2E survivor? |
| --- | --- | --- |
| Selected winner | absurd_understandable (3/3) | No |
| bestProductTopicFit | direct_product_world (3/3) | Untested as winner |
| clearestMentalImage | visual_exaggeration (3/3) | Untested as winner |
| mostLikelyToStopScrolling | absurd (1) / consequence_first (2) | Untested / fails when absurd |

---

## What this does *not* claim

- Does not claim Direct Product World will produce great ads — only that it best matches **current** pipeline constraints.
- Does not score pre-candidate runs (4ab75071, 889c80df, etc.) as these families.
- Does not recommend prompt text changes (out of scope).
- Sample size for E2E is **n=3 packages, 1 family** — treat non-absurd scores as **pipeline-fit estimates**, not measured video quality.

---

## Sources

- DB: `content_packages.package_brief.presentation_generation.creative_candidates` for runs `04911a16`, `2fbd759b`, `36da8255`
- Reports: `…-pipeline-quality-audit.md` (36da), `…-originality-loss-report.md` (ff367a55), `…-2fbd759b-…-audit.md`
- Code taxonomy: `lib/creative-candidates/types.ts` → `CREATIVE_CONCEPT_FAMILIES`
