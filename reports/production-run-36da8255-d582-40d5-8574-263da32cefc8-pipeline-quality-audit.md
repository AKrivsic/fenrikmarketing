# Pipeline quality audit — 36da8255

**Run:** `36da8255-d582-40d5-8574-263da32cefc8`  
**Package:** `bd8f0491-6240-4176-a166-514e0e64ee13`  
**Video job:** `f7d1e37d-1acf-4cc0-b559-dddde38457df`  
**Project:** Fenrik.chat  
**Scope:** read-only · no code changes · no architecture proposals beyond naming the failing layer  
**Stills:** `reports/audit-stills-36da8255/`

---

## Verdict

**Overall score: 4.3 / 10**

Concept is strong on paper (wrong-channel departure board → unanswered website lead). Quality collapses at the first frame: the metaphor never becomes readable imagery, product stays abstract, and failed fidelity did not stop delivery. Narrative Beats + duration weights ran; they did not save comprehension.

---

## 1. Dimension scores

| Dimension | Score | Why |
| --- | --- | --- |
| A · Candidate preservation | 4 | Hook words survive; departure-board metaphor does not |
| B · Beat information novelty | 5 | SETUP restates board; ESCALATION carries most new info |
| C · Viewer comprehension | 3 | First-time viewer cannot decode scene 1 without VO |
| D · Metaphor clarity | 2 | Board → wall panel with unlabeled dots; clarity check false-passed |
| E · Voiceover | 7 | Punchy, short lines; not essay; emotional arc OK |
| F · Pacing | 6 | Weights sane (escalation longest); dead time on cryptic open |
| Visual progression | 4 | Scene 2→3 advances; 1 opaque; 4 weak product payoff |
| Retention (est.) | 4 | Stop-scroll weak; idea clear by ~10s via VO only |
| Product clarity | 3 | Fidelity: `product_or_topic_not_implied`; chat abstracted |
| Pipeline honesty | 5 | Narrative Beats + duration plan ran; fidelity fail not blocked |

---

## 2. Package inventory

### Creative Candidate (winner)

- `c2-absurd_understandable-div`
- Hook: “Departure board for the wrong channel.”
- Also listed under `selection.rejected` as `topic_collapsed_to_generic_business`
- Attention motif (“drowning in drafts”) not used — candidate correctly won the opening idea

### Creative DNA

- Present · validation passed · `identityEnvironmentSuppressed`
- World prose contaminated with topic sentence (“A The marketing agency owner who lost a lead mid-pitch…”)
- Soft lobby look fights urgency of a lost lead

### Narrative Beats / Comprehension

- Roles: HOOK → SETUP → ESCALATION → RESOLUTION
- Mode map: `mistake` → `why_backfires` → `correct_approach` → `cta`
- Escalation slot mislabeled (`correct_approach` for pain peak)
- Metaphor clarity auto-pass contradicts stills

### Duration / VO / Render

- Plan: 4.57 / 6.86 / 7.51 / 4.90 s
- Speech ~22.1s · video ~23.6s · tail OK
- VO ~62 words, short sentences, contrast rhythm — not essay-like
- Job placeholders still show `duration_seconds: 4`; real pacing from plan/TTS

---

## 3. A–F evaluation

### A. Did the final video preserve the Creative Candidate? — **4/10**

Spoken hook preserved after repair. Visual candidate (station board comparing phone vs website) is **not** what rendered. Preservation is verbal, not cinematic.

### B. Did every Narrative Beat introduce NEW information?

| Beat | Mode | What changed / intended learn | Duplicate? |
| --- | --- | --- | --- |
| HOOK | mistake | Intended: phone vs website status. Actual visual: none readable. | — |
| SETUP | why_backfires | Agency owner busy pitching (human situation). | SETUP text still holds “wrong channel” — conceptual duplicate of HOOK |
| ESCALATION | correct_approach | Website visitor unanswered; form = waiting room. | No |
| RESOLUTION | cta | Website should answer automatically (abstract). | No |

### C. Viewer comprehension (per beat)

| Beat | Believes now | Question left | Followable? |
| --- | --- | --- | --- |
| HOOK | Something technical has two states. Maybe a smart-home panel. | What product? What channels? Why care? | No — metaphor opaque |
| SETUP | Someone is in a sales meeting. | How does this connect to the panel? | Situation yes; story link weak |
| ESCALATION | Leads die on the website while you're busy. | What fixes this? What is Fenrik? | Yes via VO; visual direction ambiguous |
| RESOLUTION | Some chat/AI thing helps. Unclear what to buy. | Product name, proof, next action? | Partial — CTA clear, product not shown |

### D. Metaphor clarity — **2/10**

**Break point: Scene 1 frame.**

Understanding breaks immediately. Without “Phone / Website” labels (`NO_TEXT`), green vs amber dots do not equal “wrong channel.” VO says “departure board” but the image is a building control panel. Random viewer will not get it.

Deterministic clarity check reported pass (`one_mental_step`, `understandableWithinFirstThird=true`, `correctiveGuidance=null`) — evidence the check is text-biased.

### E. Voiceover — **7/10**

Natural enough: short lines, contrast (“You're in the room… Meanwhile…”), pause-friendly fragments (“No alert. No missed call. No trace.”). Emotional progression: confusion → presence → loss → indictment → demand. Does **not** read as an essay. Spoken quality depends on TTS; script itself is serviceable.

### F. Pacing — **6/10**

Escalation longest (good). Hook ~4.6s burns attention on an unreadable frame = dead cognitive time. Ending ~4.9s does not dominate. No long dead silence; dead time is comprehension lag, not empty audio.

---

## 4. Visual analysis (stills)

| Scene | Dur | Communicates | Δ prior | Advances? | Removable? |
| --- | --- | --- | --- | --- | --- |
| 1 | 4.57s | Two status lights on a wall panel | Cold open | No — cryptic without labels | Cannot remove HOOK; frame fails its job — remake, not cut |
| 2 | 6.86s | Sales pitch / meeting hands | Human situation replaces panel | Yes — busy owner | No — only clear human beat |
| 3 | 7.51s | Person + glowing screen + empty speech bubble | Website/tech enters | Partially — abandonment ambiguous | No — needs clearer leave pose |
| 4 | 4.90s | Tablet UI + chat bubble glow | Abstract “answer” payoff | Weak product CTA | Almost — VO alone states CTA; visual adds little product truth |

---

## 5. Retention estimate

| Window | Assessment |
| --- | --- |
| First 3s | Unlikely to stop scrolling. Abstract panel + cryptic line. No face, no product, no readable conflict. |
| First 10s | Partially understand by ~8–10s once VO hits “closing a deal” + “pricing page.” Visual story still lags VO. |
| Middle | Curiosity increases via VO (“waiting room nobody comes back from”). Scene 3 can undercut that if read as engagement with the screen. |
| Ending | Payoff not fully earned visually — generic chat tablet, no clear before→after on the same board/rows. Idea stated; product proof missing. |

---

## 6. Top 10 weaknesses · root cause · layer

| # | Impact | Weakness | First component | Layer to change |
| --- | --- | --- | --- | --- |
| 1 | Critical | Departure-board metaphor fails on screen | Image Generation | Image gen prompts + metaphor gate must fail when labels are banned |
| 2 | Critical | Metaphor clarity diagnostics false-passed | Viewer Comprehension | Deterministic metaphor check / post-image comprehension |
| 3 | Critical | Product never implied in visuals | Storyboard | Storyboard product beat + fidelity as hard gate |
| 4 | High | Fidelity failures did not block ship | Other | Package acceptance / quality gate policy |
| 5 | High | All 7 candidates rejected as generic — winner still used | Creative Candidate | Candidate filter + selection policy |
| 6 | High | HOOK→SETUP does not advance information visually | Narrative Beats | Beat derivation (SETUP must be new visual fact) |
| 7 | High | Scene 3 action contradicts abandonment story | Image Generation | Scene 3 prompt + pose constraints |
| 8 | Medium | DNA world string contaminated by topic sentence | Creative DNA | DNA sanitization / world builder |
| 9 | Medium | Attention originality motif unused in final cut | Other | Attention→storyboard coupling (or de-scope Attention) |
| 10 | Medium | Mode beat label mismatch on ESCALATION | Narrative Beats | Mode→role mapping for mistake mode |

### Evidence detail

1. **Metaphor fails on screen** — Winner hook: “Departure board for the wrong channel.” Scene 1 still is a recessed wall control panel with unlabeled green/amber dots — not a station board, no phone/web rows. Also: Prompt obedience · Metaphor clarity (false pass).

2. **Clarity false-pass** — `narrative_beats.metaphorClarity.passed=true` while stills prove the opposite. Also: Metaphor clarity · LLM behaviour (text-only judge).

3. **Product not implied** — `finalScriptFidelity.passed=false` → `product_or_topic_not_implied` + `opening_situation_missing_from_scene1`. Scene 4 is a generic chat-ish tablet, not Fenrik answering the website visitor. Also: Image Generation · Prompt obedience.

4. **Fidelity not blocking** — Package regenerated once for `hook_not_preserved_in_first_spoken`, then shipped with opening_situation + product fidelity still failing. Also: LLM behaviour (post-checks advisory).

5. **Reject-all + still select** — `selection.rejected` includes winner `c2-absurd_understandable-div` for `topic_collapsed_to_generic_business`. Also: LLM behaviour.

6. **HOOK→SETUP** — Beat SETUP text: “Hold the opening… wrong channel.” Scene 2 jumps to hands/meeting without carrying board state. Progression rides VO only. Also: Storyboard · Information Progression.

7. **Scene 3** — VO: visitor waits, gets nothing, leaves. Still reads as walking toward a glowing “speaking” screen with empty bubble — can read as engagement, not loss. Also: Prompt obedience · Storyboard.

8. **DNA contamination** — `identityEnvironmentSuppressed=true` but DNA still carries topic sentence as lobby world. Also: LLM behaviour.

9. **Attention unused** — Attention selected “Left: drowning in drafts…”. Package followed departure-board candidate. Good candidate win; Attention spend did not shape opening frame.

10. **Mode map** — Escalation VO is the pain peak; mode label `correct_approach` is semantically wrong for that slot.

---

## 7. Priority order (do not implement yet)

| Priority | Change | Layer |
| --- | --- | --- |
| 1 | Make metaphor fail-closed when `NO_TEXT` removes the labels the metaphor needs | Metaphor clarity + Image Generation |
| 2 | Block ship on `product_or_topic_not_implied` / `opening_situation_missing` | Fidelity gate (package acceptance) |
| 3 | Force SETUP visual to introduce a NEW fact (busy pitch), not restate board | Narrative Beats → Storyboard |
| 4 | Scene 3 must read as LEAVE unanswered, not approach | Storyboard + Image Generation |
| 5 | Scene 4 must show website answering (chat reply on pricing), not generic tablet | Storyboard + Image Generation |
| 6 | Fix candidate reject-all + still-select-winner policy | Creative Candidate selection |
| 7 | Sanitize DNA world strings so topic sentences never become environment prose | Creative DNA |

---

## Related files

- Machine audit: `reports/production-run-36da8255-d582-40d5-8574-263da32cefc8-audit.md`
- Creative audit: `reports/production-run-36da8255-d582-40d5-8574-263da32cefc8-creative-audit.md`
- Decision audit: `reports/production-run-36da8255-d582-40d5-8574-263da32cefc8-decision-audit.md`
- Stills: `reports/audit-stills-36da8255/`
