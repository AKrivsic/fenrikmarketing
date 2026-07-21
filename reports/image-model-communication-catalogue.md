# Image-model communication catalogue

**Scope:** Analysis only. No code changes.  
**Question:** What can the current production image stack reliably communicate — and what fails?

**Stack constraints (always on in production):**
- AI still generation for most beats
- Worker `sanitizeImagePrompt` + **NO_TEXT** directive (no readable text, labels, logos, **UI elements**, notifications, typography)
- Creative Identity / DNA world often forces soft office / co-working continuity
- Product UI is only reliably shown when a **project asset** is framed (not AI-invented)

---

## Evidence base

| Source | What was inspected |
| --- | --- |
| `reports/audit-stills-36da8255/` | 4 AI stills (departure-board package) — **visually reviewed** |
| `reports/audit-stills-4ab75071/` | 3 AI stills + thumbnail — **visually reviewed** |
| `reports/production-run-2fbd759b-…-audit.md` | Prompt + render notes for icon-based departure board (same concept family as 36da) |
| `reports/package-ff367a55-…-originality-loss-report.md` | Mascot / parking-lot → co-working stills (prompt-level outcome) |
| Creative / pipeline audits (`4ab75071`, `36da8255`, retention `9e697a2f`) | Recurring blank-laptop, walk-away, continuity patterns |

**n is small but failure modes repeat.** Rates below are **observed failure among documented attempts of that concept**, not population statistics.

---

## Recurring failure patterns (cross-run)

1. **Meaning that lived in labels dies under NO_TEXT** → panel of colored dots, blank laptop, empty bubble.
2. **Symbolic / diagrammatic interfaces** collapse into generic “tech object” (control panel, glowing tablet).
3. **Product chat UI asked of the model** → blank or abstract bars; meaning rides VO.
4. **Pose ambiguity** (walk *toward* vs *away*) flips story polarity.
5. **Absurd / outdoor spectacle** gets relocated into Identity’s soft interior.
6. **Cast continuity** across stills is weak (different people each beat) even when situations are clear.
7. Worker NO_TEXT text also forbids **UI elements** — so “show chat bubbles without words” is fighting the sanitizer.

---

## Catalogue

Legend: **Reliability** = how often a stranger understands the intended fact from the image alone (without VO).  
**Failure rate** = failed-to-communicate / attempts in evidence.  
**Recommendation:** `SAFE` | `LIMITED` | `AVOID`

---

### SAFE — consistently understandable

#### 1. Human emotion on faces (stress, concern, calm focus)

| | |
| --- | --- |
| **Reliability** | High |
| **Failure rate** | ~0/2 clear face beats (`4ab` s1 stress; `4ab` s3 calm smile) |
| **Root cause of success** | Photoreal faces + lighting; meaning does not need text |
| **Evidence** | `4ab` scene-1: furrowed brow, phone-to-ear, tense gesture reads as overload |
| **Recommendation** | **SAFE** |

#### 2. Phone-call / busy-reception situation

| | |
| --- | --- |
| **Reliability** | High |
| **Failure rate** | ~0/1 (`4ab` s1) |
| **Root cause of success** | Phone-to-ear is a universal gesture; second person leaning in = shared problem |
| **Evidence** | Desk phone + mobile + stressed staff — “phones slammed” readable without HVAC specifics |
| **Recommendation** | **SAFE** (situation). Topic specifics (HVAC heatwave) still often missing — that is specificity loss, not incomprehension of “busy phones.” |

#### 3. Person leaving / walking out (consequence as body language)

| | |
| --- | --- |
| **Reliability** | High **when** face/posture = exit + downcast |
| **Failure rate** | ~0/1 clear leave (`4ab` s2); contrast `36da` s3 (see LIMITED) |
| **Root cause of success** | Doorway + mid-stride + somber face = unanswered customer without UI |
| **Evidence** | `4ab75071` creative audit + canvas: “Customer walk-away is immediately readable” |
| **Recommendation** | **SAFE** if directed as leave/exit, not approach |

#### 4. Business meeting / pitch as hands + table

| | |
| --- | --- |
| **Reliability** | High for “meeting in progress” |
| **Failure rate** | ~0/1 (`36da` s2) |
| **Root cause of success** | Open palm vs clasped hands + blank paper = negotiation; no labels needed |
| **Evidence** | `36da` scene-2 still |
| **Recommendation** | **SAFE** for human stakes; **not** for product identity |

#### 5. Soft interior atmosphere (wood, plant, window light, co-working)

| | |
| --- | --- |
| **Reliability** | High for mood/place; low for story specificity |
| **Failure rate** | Atmosphere almost always lands; story world often wrong |
| **Root cause** | Model + Identity strongly prefer candid interiors |
| **Evidence** | Nearly every Fenrik still set; `04911` forced co-working |
| **Recommendation** | **SAFE** for look; do not treat as story carrier |

#### 6. Framed **project asset** product UI (not AI-invented)

| | |
| --- | --- |
| **Reliability** | High when asset path used |
| **Failure rate** | ~0 when `source: asset` / framed laptop (`4ab` CTA beat) |
| **Root cause of success** | Real pixels, not invented UI under NO_TEXT |
| **Evidence** | `4ab` scene-4 asset insert vs AI blank laptop in scene-3 |
| **Recommendation** | **SAFE** — only reliable product-proof path observed |

---

### LIMITED — sometimes works; fragile or VO-dependent

#### 7. Hands-only / no-face framing

| | |
| --- | --- |
| **Reliability** | Medium |
| **Failure rate** | Anatomy glitches common; meaning OK for “working / pitching” |
| **Root cause** | AI hand artifacts (`4ab` s1 merged fingers); Identity likes hands-only |
| **Evidence** | `4ab` s1 hand distortion; `36da` s2 hands meeting works narratively |
| **Recommendation** | **LIMITED** |

#### 8. Walk toward a glowing screen + empty speech bubble

| | |
| --- | --- |
| **Reliability** | Low–medium (polarity flips) |
| **Failure rate** | 1/1 documented (`36da` s3) misreadable vs “leaves unanswered” |
| **Root cause** | Approach + glow + bubble ≈ engagement; abandonment needs exit/back-to-camera / empty desk |
| **Evidence** | `36da` pipeline audit: VO = leave; still ≈ approach |
| **Recommendation** | **LIMITED** → prefer explicit leave pose (SAFE #3) |

#### 9. Icon-coded status board (phone icon vs globe icon, color dots)

| | |
| --- | --- |
| **Reliability** | Low–medium |
| **Failure rate** | Partial: `2fbd` prompt/render notes claim icons present; `36da` same concept → **wall control panel**, no channel icons |
| **Root cause** | Model may drop icons; even with icons, channel contrast is one mental step; NO_TEXT blocks “Phone caller / Delayed” |
| **Evidence** | `2fbd` audit scene-1 prompt vs `36da` still scene-1 |
| **Recommendation** | **LIMITED** (do not bet the hook on it) |

#### 10. Before / after callback on same symbolic object

| | |
| --- | --- |
| **Reliability** | Low in practice |
| **Failure rate** | High when object already failed in beat 1 (`36da` s1→s4: panel → generic tablet, not same board rows flipping) |
| **Root cause** | Consistency across generations weak; payoff needs shared readable state |
| **Evidence** | `36da` s4 ≠ resolved departure board |
| **Recommendation** | **LIMITED** |

#### 11. Abstract “chat answering” as bubble/glow without asset

| | |
| --- | --- |
| **Reliability** | Low |
| **Failure rate** | ~2/2 AI product beats (`36da` s4; `4ab` s3 blank laptop vs requested bubbles) |
| **Root cause** | NO_TEXT + “no UI elements” → empty glow / blank screen; product not implied |
| **Evidence** | `4ab` audit: “Product beat fails visually”; `36da` fidelity `product_or_topic_not_implied` |
| **Recommendation** | **LIMITED** leaning **AVOID** unless asset |

#### 12. Simplified page layout as gray blocks (services page void)

| | |
| --- | --- |
| **Reliability** | Medium for “screen with empty reply zone” **if** composition holds |
| **Failure rate** | Untested as still file here; prompted in `2fbd` s2–s3 |
| **Root cause** | Structural void can work without words; easy to over-abstract |
| **Recommendation** | **LIMITED** |

#### 13. Costume / mascot character (absurd spectacle)

| | |
| --- | --- |
| **Reliability** | Low for *intended* outdoor heat spectacle |
| **Failure rate** | 1/1 E2E: parking-lot melt → co-working glass-door wave (`04911` / ff367a55) |
| **Root cause** | Identity world + “believable” pressure override absurd setting; model can draw a mascot prop but not sustain the Divergence world |
| **Evidence** | Originality-loss report |
| **Recommendation** | **LIMITED** as prop; **AVOID** as world/hook carrier under current Identity stack |

---

### AVOID — consistently confusing or text-dependent

#### 14. Departure board / status board whose meaning needs labels

| | |
| --- | --- |
| **Reliability** | Very low |
| **Failure rate** | 2/2 winner packages using this hook family: `36da` opaque panel; `2fbd` fidelity fail + comprehension depends on icons |
| **Root cause** | **NO_TEXT removes essential meaning** (“Phone caller #47”, “Website visitor”, “Delayed”) |
| **Evidence** | `36da` stills + pipeline audit; candidate openingSituation quotes labeled rows |
| **Recommendation** | **AVOID** |

#### 15. Dual clocks / metric comparison / “shameful reply time”

| | |
| --- | --- |
| **Reliability** | Very low |
| **Failure rate** | Not rendered as winner; concept appears in candidates only |
| **Root cause** | Comparison needs readable dials/numbers → NO_TEXT |
| **Recommendation** | **AVOID** |

#### 16. Notification stacking with readable copy

| | |
| --- | --- |
| **Reliability** | Very low |
| **Failure rate** | Attention selected “nice — now do five more”; **never appeared** in `4ab` opening |
| **Root cause** | Notifications are text; sanitizer bans phone notifications |
| **Evidence** | `4ab` creative audit / canvas |
| **Recommendation** | **AVOID** |

#### 17. Dashboards / analytics screens invented by the model

| | |
| --- | --- |
| **Reliability** | Very low |
| **Failure rate** | High whenever AI must invent screen content (`4ab` blank laptop; abstract bars) |
| **Root cause** | NO_TEXT + no UI → blank or unreadable chrome |
| **Recommendation** | **AVOID** (use asset) |

#### 18. Labeled queues, ticket numbers, boarding passes, “#47”

| | |
| --- | --- |
| **Reliability** | Very low |
| **Failure rate** | Structural — any concept whose punchline is a numeral/label |
| **Root cause** | NO_TEXT |
| **Recommendation** | **AVOID** |

#### 19. Abstract metaphors standing in for people (boats, notebooks, floating cards — historically rejected by narrative policy; still relevant)

| | |
| --- | --- |
| **Reliability** | Very low for first-frame comprehension |
| **Failure rate** | Policy + past audits treat as riddles |
| **Root cause** | One-mental-step+ metaphors without human situation |
| **Recommendation** | **AVOID** |

#### 20. Generic glowing tablet / control panel as “the product”

| | |
| --- | --- |
| **Reliability** | Very low |
| **Failure rate** | `36da` s1 + s4 |
| **Root cause** | Looks like smart-home / décor tech; no Fenrik / website-answer meaning |
| **Recommendation** | **AVOID** |

#### 21. Rival / competitor “already won the lead” as a single still

| | |
| --- | --- |
| **Reliability** | Very low without text or two clear opposing actors |
| **Failure rate** | Untested as winner; selection stop-power high on paper |
| **Root cause** | Consequence needs readable stakes the model cannot letter |
| **Recommendation** | **AVOID** as sole image (film as human leave + busy you instead)

---

## Concepts that depend on readable text

These **cannot** survive the current NO_TEXT stack as the carrier of meaning:

| Concept | Why text is load-bearing |
| --- | --- |
| Departure / status boards | Row identity + Delayed/Boarding |
| Notification copy | The joke *is* the words |
| Dual clocks / KPIs | Numbers and labels |
| “Seen” / unread counts | Status words |
| Competitor quote / price | Claim text |
| FAQ empty slot labels | “emergency” shelf labels |
| Checklist / quote / statistic typed scenes | By design need glyphs (separate renderers — not this AI image path) |

If the concept’s punchline is a word, **the AI image path will not carry it.**

---

## Failures specifically caused by NO_TEXT (not “model can’t draw”)

| Asked for | Without text | Observed |
| --- | --- | --- |
| Phone vs Website departure rows | Colored dots / wrong object | `36da` control panel |
| Chat UI answering | Blank laptop / abstract bars | `4ab` s3 |
| Fake typing indicator meaning | Glow / empty bubble | ambiguous |
| “Delayed” status | Amber light only | not “channel” |
| Notification stack | Never filmed | Attention concept dropped |

The model can draw boards and laptops. **NO_TEXT removes the semantic payload**, and the sanitizer also discourages UI chrome that could salvage meaning with shapes alone.

---

## Never ask the current AI image path to generate

(Evidence-backed “do not rely on this as the meaning carrier”)

1. Labeled departure / airport / queue boards  
2. Readable notifications or chat transcripts  
3. Dashboards / analytics with invented UI  
4. Product proof as AI-drawn Fenrik UI (use **asset**)  
5. Dual-metric / clock comparisons  
6. Hook metaphors that need one label to decode  
7. Before/after status flips on symbolic boards  
8. Competitor-win scenes that need names/prices  
9. Outdoor absurd spectacle as sustained world (Identity will relocate it)  
10. Empty speech bubble as “no answer” (reads as speech)

---

## Things the model does exceptionally well

1. **Facial emotion** — stress, concern, calm satisfaction  
2. **Phone-to-ear busy work** — instant “overwhelmed staff”  
3. **Doorway walk-out / leave** — consequence without UI  
4. **Meeting hands / pitch energy** — human conflict without faces  
5. **Believable warm interiors** — wood, plants, window light (even when too generic)  
6. **Candid photographic look** under NATURAL / documentary Identity  
7. **Framing product screenshots as laptop inserts** when given a real asset  

---

## Summary matrix

| Visual concept | Rec | Failure rate (obs.) | Primary root cause |
| --- | --- | --- | --- |
| Face emotion | SAFE | Low | — |
| Busy phone / reception | SAFE | Low | — |
| Customer walk-away (exit) | SAFE | Low | — |
| Meeting / pitch hands | SAFE | Low | — |
| Interior atmosphere | SAFE | Low (for mood) | Over-generic world |
| Product via **asset** | SAFE | Low | — |
| Hands-only crops | LIMITED | Medium | Anatomy |
| Approach + empty bubble | LIMITED | High | Pose polarity |
| Icon status board | LIMITED | High | Icon drop + NO_TEXT |
| Before/after symbol flip | LIMITED | High | Consistency |
| AI “chat answering” | LIMITED→AVOID | High | NO_TEXT / no UI |
| Mascot absurd world | LIMITED→AVOID | High | Identity relocate |
| Labeled departure board | AVOID | ~100% | **NO_TEXT** |
| Notifications with copy | AVOID | ~100% | **NO_TEXT** |
| Dual clocks / KPIs | AVOID | — | **NO_TEXT** |
| AI dashboards | AVOID | High | **NO_TEXT** |
| Glowing panel as product | AVOID | High | Abstract tech |
| Abstract person-metaphors | AVOID | High | Riddle |

---

## Bottom line

Under the **current** image stack, the model is a **situation camera**, not a **diagram printer**.

- It reliably films **people in events** (busy, leaving, pitching, calm at desk).  
- It unreliable films **systems of meaning** (boards, dashboards, notifications, channel contrast, product UI).  
- Anything whose comprehension requires **words** fails — not because the pixels are ugly, but because **NO_TEXT strips the payload**.  
- Product clarity in AI stills is systematically weak; **assets** are the only proven fix in evidence.

No implementation. Catalogue only.
