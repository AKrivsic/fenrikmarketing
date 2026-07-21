# Information-flow analysis — production videos

**Scope:** Analysis only. No code changes. No fix proposals.  
**Question:** How does information move through generated videos — scene by scene — not how pretty each frame is.

**Method:** For each primary completed video with reconstructable scenes, score the **audiovisual beat** (still + aligned VO). Tag what is **new relative to prior scenes**. If the image adds nothing but VO does, the scene still gets VO tags — and is flagged **visual-null**.

**Evidence:** stills (`36da`, `4ab`), audits, extractions, SRT. Sample = **11 primary videos** + retention cohort note (`9e697a2f`).

---

## Tag legend

| Tag | Meaning |
| --- | --- |
| New fact | Concrete claim the viewer didn’t have |
| New location | Place/setting change that matters |
| New action | Someone does something new |
| New consequence | Outcome of prior situation |
| New emotion | Feeling shift that changes stakes |
| New conflict | Tension / opposition introduced |
| New product understanding | What the product is / does |
| New decision | Viewer-facing choice / CTA force |
| None | No new information vs prior beats |

**Removable?** = understanding of the *core story* survives without it.  
**Pacing↑?** = cutting it would tighten without loss.

---

## Video 1 — `36da8255` (Fenrik · departure board)

### Information timeline

**Scene 1** → Viewer learns: *almost nothing usable*  
Tags: **None** (visual). VO says “wrong channel” but frame is unlabeled panel → fact not received.  
Exists as: intended hook / metaphor open.  
Removable? No (needs *a* open) — **replaceable**. Pacing↑? Cutting without replacement hurts; current frame is dead time.

**Scene 2** → Viewer learns: *owner is in a live pitch / meeting*  
Tags: **New location**, **New action**, **New fact** (busy offline).  
Removable? No. Pacing↑? No.

**Scene 3** → Viewer learns: *website visitor goes unanswered and leaves* (mostly VO)  
Tags: **New fact**, **New consequence**, **New conflict** (via VO). Visual may add **New location** (screen) but action polarity muddy.  
Removable? No — this is the escalation. Pacing↑? No.

**Scene 4** → Viewer learns: *website should answer when you can’t* (claim)  
Tags: **New decision** (soft). **New product understanding** = weak/absent.  
Removable? Almost — claim already in VO; visual adds little. Pacing↑? **Yes** if CTA lives in VO/subtitle only; **No** if a real product beat is required (currently missing).

### Flow flags
- **Repetition:** Hook “wrong channel” never visually resolved; s4 does not complete s1’s board state.  
- **Missing escalation:** Escalation is VO-heavy; visual flat after s2.  
- **Weak resolution:** No earned product understanding.

| Scene | Gain tags | Visual-null? | Redundant? |
| ---: | --- | --- | --- |
| 1 | 0 | Yes | **Yes** (as information) |
| 2 | 3 | No | No |
| 3 | 3 | Partial | No |
| 4 | 1 | Partial | Borderline |

**Info-gain score:** avg **1.75 tags/scene** · redundant scenes **1–1.5 / 4**

---

## Video 2 — `4ab75071` (Fenrik · busy phones)

### Information timeline

**Scene 1** → *Staff slammed with phone calls*  
Tags: **New fact**, **New action**, **New emotion** (stress), **New location** (reception).  
Removable? No.

**Scene 2** → *Customer leaves unanswered*  
Tags: **New action**, **New consequence**, **New emotion**, **New conflict**.  
Removable? No.

**Scene 3** → *Intended: website chat answering; actual still: blank laptop*  
Tags: VO may restate “it isn’t” / silent website — **little new beyond s1–2**. Visual: **None**.  
Exists as: proof beat that failed to prove.  
Removable? **Yes** for understanding (s2 + VO already carry the point). Pacing↑? **Yes**.

**Scene 4** → *Fenrik UI exists / CTA*  
Tags: **New product understanding**, **New decision**.  
Removable? No (only product beat).  

### Flow flags
- **Repetition:** s3 largely restates “website silent” without new visual fact.  
- **Escalation:** s1→s2 strong; s3 stalls.  
- **Resolution:** Asset CTA recovers product late.

| Scene | Gain tags | Visual-null? | Redundant? |
| ---: | --- | --- | --- |
| 1 | 4 | No | No |
| 2 | 4 | No | No |
| 3 | 0–1 | **Yes** | **Yes** |
| 4 | 2 | No | No |

**Avg ~2.5 tags/scene** · redundant **1 / 4**

---

## Video 3 — `2fbd759b` (Fenrik · departure board, clearer prompts)

### Information timeline

**Scene 1** → *Two channels, unequal status* (if icons land)  
Tags: **New fact**, **New conflict** (phone vs web).  
Removable? No (thesis).  

**Scene 2** → *Visitor tries to ask; no reply surface*  
Tags: **New location** (phone/page), **New action**, **New fact**.  
Removable? No.

**Scene 3** → *Reply zone is empty / site has nothing to say*  
Tags: **New consequence** (emptiness as subject) — **partial repeat** of s2’s “no reply”.  
Removable? **Borderline** — tightens emptiness but same information class as s2. Pacing↑? **Likely yes**.

**Scene 4** → *Same board, web row “answered”*  
Tags: **New consequence** (flip), weak **product understanding**.  
Removable? Soft — metaphor payoff without product name.  

### Flow flags
- **Repetition:** s2↔s3 both “no answer on page”.  
- **Escalation:** OK if s1 icons work; then plateaus.  
- **Weak resolution:** Abstract product.

| Scene | Gain | Redundant? |
| ---: | --- | --- |
| 1 | 2 | No |
| 2 | 3 | No |
| 3 | 1 | **Yes** (same class as s2) |
| 4 | 1–2 | No |

**Avg ~2.0** · redundant **1 / 4**

---

## Video 4 — `04911a16` / `ff367a55` (Fenrik · mascot / vacation)

### Information timeline

**Scene 1** → *Absurd effort outside vs fake online activity*  
Tags: **New fact**, **New action**, **New emotion**, **New conflict**.  
Removable? No (hook).

**Scene 2** → *Returned from travel; many visits, zero contacts*  
Tags: **New fact**, **New location**, **New emotion**, **New consequence**.  
Removable? No.

**Scene 3** → *Site always “open,” still turns people away*  
Tags: **New fact** (always-on leak) — partly **restates** s2’s missed-leads.  
Removable? Borderline. Pacing↑? Possible.

**Scene 4** → *Calm recognition / create assistant while away*  
Tags: **New decision**; **product understanding** weak (no UI in prompts).  
Removable? CTA needed; product proof missing.

### Flow flags
- **Repetition:** s2–s3 both “missed website leads.”  
- **Escalation:** Hook strong → mid becomes essay.  
- **Weak resolution:** Emotional close without product show.

**Avg ~2.5** · redundant **~1 / 4**

---

## Video 5 — `889c80df` (8080 · blank page)

### Information timeline

**Scene 1** → *Team busy arguing, not building*  
Tags: **New fact**, **New conflict**, **New action**, **New emotion**.  

**Scene 2** → *Whiteboard chaos = zero output*  
Tags: **New consequence** — **same conflict intensified** (partial repeat).  
Removable? Borderline. Pacing↑? Possible.

**Scene 3** → *Correct approach (underspecified visual)*  
Tags: often **None / weak** — intended “lock blueprint first.”  
Removable? **Yes** if s4 carries product. Pacing↑? **Yes**.

**Scene 4** → *Product blueprint UI + alignment*  
Tags: **New product understanding**, **New decision**.  

**Scene 5** → *Clean structured desk UI*  
Tags: mostly **repeat** of clarity/product from s4.  
Removable? **Yes**. Pacing↑? **Yes**.

### Flow flags
- **Repetition:** s1–s2 chaos; s4–s5 product calm.  
- **Missing escalation:** Hole at s3.  
- **Resolution:** Strong once asset appears — then overshoots with s5.

**Avg ~1.8** · redundant **~2 / 5**

---

## Video 6 — `7628340e` (fenrik Studio · stale social)

### Information timeline

**Scene 1** → *Prospect checks sparse/old social*  
Tags: **New fact**, **New action**.  

**Scene 2** → *Doubt / hesitation*  
Tags: **New emotion**.  

**Scene 3** → *Closes the tab*  
Tags: **New action**, **New consequence**.  

**Scene 4** → *Website already has the content*  
Tags: **New fact**, **New product understanding** (site-as-source).  

**Scene 5** → *Queued / scheduled presence*  
Tags: **New product understanding**, **New decision**.  

### Flow flags
- **Repetition:** Low.  
- **Escalation:** Clear check → doubt → exit → answer.  
- **Resolution:** Solid.

**Avg ~2.2** · redundant **0 / 5**

---

## Video 7 — `328a9a04` primary (`ac67d2f5`, Fenrik · overnight visitors)

### Information timeline

**Scene 1** → *Something unrecorded / blank log*  
Tags: **New fact** (absence), metaphorical.  

**Scene 2** → *Missed sessions as crossed dots*  
Tags: **New consequence** — same “missed” class as s1.  
Removable? Borderline / **Yes**. Pacing↑? Likely.

**Scene 3** → *Chatbot never started (friction)*  
Tags: **New fact**, **New conflict**.  

**Scene 4** → *Simple fix + Fenrik UI*  
Tags: **New product understanding**, **New decision**.  

### Flow flags
- **Repetition:** s1–s2 both “missed / empty record.”  
- **Escalation:** Improves at s3.  
- **Resolution:** OK with UI insert.

**Avg ~2.0** · redundant **1 / 4**

---

## Video 8 — `d893d9f7` (8080 · wrong developer myth)

### Information timeline

**Scene 1** → *Founder about to pitch developer*  
Tags: **New location**, **New action**, **New fact**.  

**Scene 2** → *Freezes — can’t translate the idea*  
Tags: **New emotion**, **New conflict**, **New consequence**.  

**Scene 3** → *8080 blueprint UI (asset)*  
Tags: **New product understanding**.  

**Scene 4** → *CTA: start building blueprint*  
Tags: **New decision**.  

### Flow flags
- **Repetition:** Low.  
- **Escalation:** Belief → failure → product.  
- **Resolution:** Strong (typed CTA).

**Avg ~2.5** · redundant **0 / 4**

---

## Video 9 — `684a95ef` (RightCard · wrong card)

### Information timeline

**Scene 1** → *Myth: more cards = more rewards*  
Tags: **New fact**.  

**Scene 2** → *Hand hovering — undecided at checkout*  
Tags: **New location**, **New action**, **New conflict**.  

**Scene 3** → *Taps habitual card*  
Tags: **New action**, **New consequence**.  

**Scene 4** → *Other cards left behind = lost rewards*  
Tags: **New consequence**, **New fact**.  

**Scene 5** → *RightCard recommends / CTA*  
Tags: **New product understanding**, **New decision**.  

### Flow flags
- **Repetition:** Low; each beat advances choice cost.  
- **Escalation:** Strong.  
- **Resolution:** Strong.

**Avg ~2.4** · redundant **0 / 5**

---

## Video 10 — `d3ccd69e` (8080 · missing source of truth)

### Information timeline

**Scene 1** → *Sparse unlabeled tickets / chaos*  
Tags: **New fact**, **New conflict**.  

**Scene 2** → *Nothing written down / multi-tab clutter*  
Tags: **New fact**, **New emotion** — **adjacent** to s1.  
Removable? Borderline.

**Scene 3** → *Realization; blank laptop by design*  
Tags: **New emotion**; visual often **None** for product.  
Removable? Possible. Pacing↑? Possible.

**Scene 4** → *Structured blueprint UI*  
Tags: **New product understanding**, **New decision**.  

### Flow flags
- **Repetition:** s1–s3 all “no structure.”  
- **Missing escalation:** Emotional plateau until product.  
- **Resolution:** Product dump at end.

**Avg ~2.0** · redundant **1–1.5 / 4**

---

## Video 11 — `a6e96147` (8080 · three days documenting)

### Information timeline

**Scene 1** → *Blank notebook / idea start*  
Tags: **New fact**, **New location**.  

**Scene 2** → *Half-written doc, stuck*  
Tags: **New action**, **New consequence**, **New emotion**.  

**Scene 3** → *Chaos of notes / whiteboard*  
Tags: **New conflict**, **New fact** — intensifies s2.  
Removable? Borderline.

**Scene 4** → *Clean desk + product UI*  
Tags: **New product understanding**, **New decision**.  

### Flow flags
- **Repetition:** Mild s2–s3 “can’t finish the plan.”  
- **Escalation:** Good overall.  
- **Resolution:** Clear contrast.

**Avg ~2.5** · redundant **0.5 / 4**

---

## Cohort note — `9e697a2f` (21 packages, fenrik Studio)

Not scored as one video. Retention audit pattern:
- Openings often **empty board / blank desk** → Scene 1 **None** for scroll-stop information  
- Product typically **late** (s3–s4)  
- High rate of calm still + soft VO → early drop  

Treat as systemic: **avg redundant openings ≈ 1 per video** before any story starts.

---

## Aggregates (11 primary videos)

### Average information gain per scene

Count = number of distinct **new** tag types per scene (0–8), averaged.

| Video | Scenes | Avg tags/scene | Redundant scenes |
| --- | ---: | ---: | ---: |
| 36da8255 | 4 | 1.75 | 1.5 |
| 4ab75071 | 4 | 2.5 | 1 |
| 2fbd759b | 4 | 2.0 | 1 |
| 04911a16 | 4 | 2.5 | 1 |
| 889c80df | 5 | 1.8 | 2 |
| 7628340e | 5 | 2.2 | 0 |
| 328a9a04 | 4 | 2.0 | 1 |
| d893d9f7 | 4 | 2.5 | 0 |
| 684a95ef | 5 | 2.4 | 0 |
| d3ccd69e | 4 | 2.0 | 1.25 |
| a6e96147 | 4 | 2.5 | 0.5 |
| **Mean** | — | **~2.2** | **~0.84 / video** |

**Average information gain per scene ≈ 2.2 tag-types.**  
**Average redundant scenes per video ≈ 0.8–0.9** (roughly **1 in 5 scenes** is information-dead or pure restatement).

Videos with **zero** redundant scenes in this sample: `7628340e`, `d893d9f7`, `684a95ef`.

---

## Most common information bottlenecks

1. **Opening metaphor / empty prop with no received fact**  
   Scene 1 burns time; viewer learns X only when VO later explains (`36da`, many `9e697a2f`, abstract Fenrik opens).

2. **Proof beat that doesn’t prove**  
   Blank laptop / abstract glow where product or chat was supposed to land (`4ab` s3, `36da` s4, parts of `d3` s3).

3. **Double-statement of the same pain**  
   Two mid scenes both say “missed / no answer / no structure” without a new consequence class (`2fbd` s2–s3, `04911` s2–s3, `d3` s1–s3, `328a` s1–s2).

4. **Product understanding delayed to last frame — or never**  
   Gain tags cluster at the end; middle carries emotion/essay only (`36da`, `04911`, often Fenrik).

5. **Extra calm close after product already landed**  
   Second product/clarity still (`889c` s5).

6. **Visual-null scenes**  
   Information exists only in VO; image repeats prior world or shows blank UI.

---

## Most common narrative failures (information-flow sense)

| Failure | What it means for flow | Where seen |
| --- | --- | --- |
| **Hook without uptake** | Timeline starts with None; real Scene-1 learning happens later | `36da`, retention cohort |
| **Missing escalation step** | Emotion/conflict doesn’t intensify; VO essays instead | `36da`, `04911` mid |
| **False proof** | Slot labeled proof/product adds no New product understanding | `4ab` s3, `36da` s4 |
| **Plateau repetition** | Same information class twice before product | Fenrik metaphor packages, `d3`, `889c` chaos pair |
| **Weak resolution** | Ends on decision language without product fact | `36da`, `04911` |
| **Overshoot ending** | Resolution already earned; extra still adds None | `889c` s5 |
| **Strong flow exceptions** | Each scene new action/consequence/product | `684a`, `d893`, `7628340e` |

---

## Pattern by product type (observational)

| Pattern | Info flow |
| --- | --- |
| **Checkout / pitch failure → asset UI → CTA** (`684a`, `d893`) | Highest; near-zero redundancy |
| **Social/check → leave → website answer** (`7628340e`) | Clean causal chain |
| **Chaos → chaos → underspecified → asset** (`889c`) | Hole in middle |
| **Metaphor / status / blank UI Fenrik** (`36da`, `2fbd`, `4ab` s3) | Lowest early gain; product late or absent |

---

## Bottom line

Information does **not** fail evenly across the timeline.

- **Best videos:** every scene adds a new **action**, **consequence**, or **product fact** (`684a95ef`, `d893d9f7`, `7628340e`).  
- **Typical Fenrik metaphor videos:** Scene 1 often **None**; Scene 2–3 **repeat pain**; Scene 4 **weak product**.  
- **Average:** ~**2.2** new information tags per scene, but **~1 redundant scene per video** — usually a failed proof, a double pain beat, or a decorative close.  
- Bottlenecks concentrate at **open (uptake)** and **proof/product (false gain)**, not at “pretty middle frames.”

No fixes. Measurement only.
