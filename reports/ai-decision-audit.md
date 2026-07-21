# AI Decision Audit — Run `f5a7794e-c1a8-4d6b-82c9-500a8d3e9f88`

_Read-only. Generated 2026-07-20. Sources: Supabase `production_runs`, `content_strategies`, `content_strategy_items`, `content_packages.package_brief` / `presentation_generation`, Product Brain on `projects`. No DB writes, no regenerations, no code changes._

| Field | Value |
| --- | --- |
| Project | Fenrik.chat (`aabab9ff-9db4-4012-a53c-135e3bfea6cd`) |
| Run status | completed (1 package requested / 1 generated) |
| Package | `31878924-d54d-4e17-9834-ed2d9f055116` |
| Title | The car dealer who got 60 weekend visitors and sold nothing — because no one could answer a single question |
| Strategy | `f018b4b8-1b15-49ee-a97a-97defd61abb0` |
| Strategy item | `b8f25415-7b73-4bb3-bc56-3031f4c2684d` (tiktok / reel / problem_aware / priority 1) |
| Selected candidate | `c3-direct_product_world-div` |
| Final scene types | IMAGE × 3 → PRODUCT_DEMO → IMAGE |

---

## 0. Verdict in one page

This package is a **commercial-survivability win**, not a creativity win.

1. Product Brain pain (“unable to answer when offline”) + scenario pool (car dealership holiday weekend) → Weekly Strategy theme “silent cost of a website that can’t answer back” → one Problem Aware strategy item about a dealer who got 60 weekend visitors and sold nothing.
2. Seven creative families were generated. Soft-reject `topic_collapsed_to_generic_business` fired on **all seven** (topic-signal tokens for car dealers are weak), so selection fell back to the full pool.
3. Final Selection Score chose **direct_product_world** (241.5) over the creative leader **absurd_understandable** (93.5) — commercial score 171 vs 18.
4. Downstream packaging kept the candidate’s **hook + hands-on-phone opening**, but **dropped** the candidate’s spoken product ending, **ignored** Attention’s preferred kitchen-counter visual, flipped medium to **CLEAN_ILLUSTRATION** for series diversity, and showed the product as a **structured PRODUCT_DEMO** beat while VO stayed problem-only until a habit close.

---

## 1. Chain reconstruction

```
Product Brain
  ↓
Weekly Strategy  (“The silent cost of a website that can't answer back”)
  ↓
Strategy Item    (car dealer / 60 weekend visitors / silence between question & form)
  ↓
Creative Candidates (7 families, divergence v2.1)
  ↓
Selected Candidate (c3-direct_product_world-div)
  ↓
Narrative Beats  (HOOK → SETUP → ESCALATION → RESOLUTION)
  ↓
Presentation Generation (identity / narrative / medium / profile / attention / reveal)
  ↓
Story (voiceover + 5 visual beats)
  ↓
CTA (package CTA written; typed CTA not requested; not spoken in VO)
```

---

## 2. Product Brain — what entered the run

| Brain field | Content that mattered |
| --- | --- |
| Goal | `lead_generation` |
| Product is | AI chatbot for websites; answers 24/7; captures leads; embed script; ~1 minute setup |
| Pain points | Unable to answer when offline; losing leads without instant support; visitors leave before contact |
| Audience | Includes **car dealers**, beauty salons, lawyers, SMB service companies |
| Tone | Simple, direct, transparent, friendly, concise |
| Default CTA | “Create your AI assistant” |
| Scenario (used) | *A car dealership's website gets a flood of visitors over a holiday weekend while the sales team is off…* |
| Forbidden claims | none |

**Influence map:** Brain did not pick the hook wording. It constrained **problem meaning** (offline silence → lost leads), **audience world** (dealership is an approved segment), **product role** (chat answers the website moment), **tone** (TTS instructions), and **CTA seed** (“Create your AI assistant…” expanded later by Claude).

---

## 3. Weekly Strategy — why this plan

| Field | Value |
| --- | --- |
| Name / theme | The silent cost of a website that can't answer back |
| Objective | lead_generation |
| Funnel distribution | Problem Aware: 1 (only slot; packageCount=1) |
| Source | `production_run` |

**Why this strategy (not another theme)?**

- Deterministic request: 1 package, TikTok-primary video platforms, lead_generation goal.
- Claude strategy planner (`planContentStrategy`) is instructed to derive topic/angle from Product Brain when trends/evergreen are thin; Funnel diversity for n=1 forces a single stage — here **Problem Aware**.
- Theme language (“silent cost… can’t answer back”) is a compression of Brain pain points + proof that silence is unmeasured lead loss.

**Weekly Strategy → Strategy Item influence:** theme + funnel stage + production_run linkage. The concrete dealer story is mostly Claude + Brain scenario, not a stored weekly calendar of topics.

---

## 4. Strategy Item — why this one

| Field | Value |
| --- | --- |
| Topic | The car dealer who got 60 weekend visitors and sold nothing — because no one could answer a single question |
| Angle | Walk the Saturday financing-question moment → wait → nothing → competitor; ×60 visitors / 2 days; cost is a **habit**, not a bad weekend |
| Platform / format | tiktok / reel |
| Funnel | problem_aware |
| Scenario on package | Exact Brain scenario about dealership holiday weekend |

**Why this Strategy Item?**

1. **Brain scenario pool** already contained the dealership holiday-weekend story — highest-affinity concrete world for “offline silence.”
2. **Audience list** explicitly includes car dealers → industry cue is on-brand, not invented.
3. **Problem Aware** funnel (only allowed slot) prefers dramatizing the cost of silence over pitching features.
4. Angle explicitly forbids making the story about cars/price — keeps Product Brain meaning (unanswered website moment).

**Why not Awareness / Conversion?** Funnel distribution was `{Problem Aware: 1}` — deterministic for a one-package run aimed at lead_gen problem framing.

---

## 5. Creative Candidates — why these seven, why not others

Divergence `creative-divergence@2.1` clustered raw situations into families and built one candidate per family:

| ID | Family | Hook | Creative | Commercial | Final | Why it lost / won |
| --- | --- | ---: | ---: | ---: | --- |
| c1 | absurd_understandable | Airport logic applied to the wrong queue. | **75.5** | 18 | 93.5 | Highest creative; crushed by metaphor_risk + requires_readable_text + near-zero commercial |
| c2 | role_reversal | Nobody home except the waiting chat. | 69.3 | 96.5 | 165.8 | Clear empty-desk image; weaker first-frame / product demo than c3 |
| **c3** | **direct_product_world** | **Urgent question dies in silence.** | 70.5 | **171** | **241.5** | **Winner** — max renderability, first-frame, human problem, product demo, commercial survive |
| c4 | social_observation | Dual clocks, one shameful. | 62.8 | 27 | 89.8 | Readable dual-clock UI risk; low commercial |
| c5 | consequence_first | Competitor wins before you pick up. | 69.5 | 108.5 | 178 | Strong stop-power badge; still −63.5 vs c3 commercial |
| c6 | human_conflict | Departure board for the wrong channel. | 68.9 | 87.5 | 156.4 | Low renderability / narrative survive; train-board metaphor |
| c7 | visual_exaggeration | After hours, chats still screaming. | 71.7 | 120.5 | 192.2 | Clearest mental image badge; still −49.3 vs c3 |

**Soft-reject anomaly:** every candidate (including the winner) carries `topic_collapsed_to_generic_business`. Cause: `extractTopicConcreteSignals` barely emits tokens for car-dealer topics (no HVAC/dental/restaurant/vacation pushes; phrase match for “website visitor” / “unanswered” did not fire on this topic/angle blob). With **eligible pool empty**, `runComparativeJudge` falls back to all scored candidates. Soft reject did **not** choose the winner — commercial scoring did.

**Comparative judge badges (diagnostics only):**

- Most memorable / least interchangeable → c1 (absurd)
- Most likely to stop scrolling → c5 (consequence)
- Clearest mental image → c7
- Most renderable / clearest first frame / best product demo / strongest human problem / best commercial survive → **c3**

---

## 6. Selected Candidate — why c3

**Diagnostics (`commercial-success@1`):**

> final=241.5; creative=70.5; commercial=171; family=direct_product_world; renderability=10; first_frame=9; product_demo=9; human_problem=10; narrative_survive=9; commercial_survive=10; **overturned_higher_creative=c1 (75.5)**

**Why this candidate?**

- Opens on a **filmable website moment** (hands + unanswered reply thread) that is the product’s native world.
- Highest commercial dimensions → survives storyboard, product demo integrity, and IMAGE render without readable-text metaphors.
- Matches Strategy Item angle (silence between question and response) without airport/departure-board abstraction.

**Why not the others?** See table above. Pattern: metaphor / readable UI / multi-object boards lose commercial score even when they win originality.

---

## 7. Narrative Beats — why this structure / pacing

Beats (`narrative-beats@1.1`) were derived from candidate fields:

| Role | Source fields | Share | ~Duration | Job |
| --- | --- | ---: | ---: | --- |
| HOOK | openingSituation, hookLine, expectedViewerQuestion | 19.2% | 4.8s | Anomaly: unanswered urgent question |
| SETUP | storyProgression, coreIdea, emotionalReaction | 28.8% | 7.2s | Widen to peak demand overload |
| ESCALATION | storyProgression, visualPromise, productConnection | 31.5% | 7.9s | Cost rising → competitor / offline pain |
| RESOLUTION | productConnection, ending | 20.6% | 5.1s | Solution / close |

**Why this pacing?** Deterministic narrative-beat timeline: longest time on **problem cost** (SETUP+ESCALATION ≈ 60%), short HOOK for scroll-stop, short RESOLUTION. Matches Problem Aware funnel (dwell on pain before payoff).

**Sparse expand:** `sparse_plan_adjustment=false`, `visual_beat_count=5` = `target` — LLM already hit density; no filler beat injected.

---

## 8. Presentation Generation — style, medium, voice, attention

### Visual style / identity

| System | Decision | Why |
| --- | --- | --- |
| Creative identity | co-working daylight, cool neutral, OTS, face not visible, subject left third | Deterministic identity picker + series options; locks look across beats |
| Visual narrative | `situation_first`, carrier=`human`, metaphor=`understandable_preferred` | Prefer human body language over device-hero; Product Brain constrains meaning not scenery |
| Visual profile | **NATURAL** (`package_snapshot`) | Frozen on package from auto profile for SaaS/human carrier |
| Visual medium | **CLEAN_ILLUSTRATION** (`auto`) | PHOTOGRAPHIC scored highest (+carrier_human) but **diversity: PHOTOGRAPHIC→CLEAN_ILLUSTRATION** because recent fingerprints were photographic |

**Why this visual style?** Series-aware anti-repeat beat recent Fenrik runs (PHOTOGRAPHIC + laptop/desk motifs). Illustration + OTS hands differentiates while keeping NATURAL soft lighting language in prompts (“flat illustration… soft gradients”).

**Tension:** Identity environment is “bright co-working,” while story world is a **dealership**. Meaning survived (hands / chat / lot); scenery identity partially overrode industry setting in early beats.

### Attention / opening

Attention plan:

- Mechanism: **surprise** / `immediate_reaction` / land in 1.0–1.8s
- Preferred originality visual (**unexpected**): *“Pull-back reveal: the polished brand feed is run from a kitchen counter at midnight”*
- Also scored **less_obvious**: content team wearing five hats

**What actually shipped:** candidate opening — hands typing a financing question on a dealership site with empty reply thread.

**Why this opening (final)?** Creative candidate + narrative HOOK + fidelity rules (`opening_situation_visible_in_scene1`) outranked Attention’s originality pass. Attention still shaped **delivery** (urgent first phrase, align hook with first spoken) and TTS opening energy.

**Why not kitchen-counter / five-hats?** Those concepts are generic “content ops” metaphors; they fail candidate immutable rules (“do not relocate primary story away from car dealer hands / unanswered thread”) and Strategy Item industry cue.

### Product Demo / reveal

| Layer | Decision | Why |
| --- | --- | --- |
| product_reveal@2 | Prefers `ABSTRACT_PRODUCT_SYSTEM` (`story_prefers_outcome_over_framed:human`) | Human carrier → avoid framed fake UI asset |
| Actual scene 4 | Structured **PRODUCT_DEMO** (`after_hours_response`, financing Q→AI answer→lead_captured) | Package generation chose typed product-demo beat; integrity check passed |
| Asset usage | `[]` | No project asset required/selected |

**Why this Product Demo?**

- Strategy + Brain: after-hours / weekend silence → variant `after_hours_response`.
- Candidate productConnection: chatbot handles the **same website moment** as the opening.
- Deterministic integrity: ask + answer + lead_captured outcome must be visible on one beat.
- Demo copy is Claude: used-car financing question with imperfect credit — concrete to dealer angle.

**Why not FRAMED_ASSET / photographic UI?** No asset usage; reveal policy preferred abstract/outcome; structured PRODUCT_DEMO is the commercial way to show ask→answer without a library screenshot.

### Voice / voiceover

| Field | Value | Why |
| --- | --- | --- |
| Voice | `shimmer` | `voice_source=package_secondary`; scores secondary 62 > primary 49 |
| Score reasons | funnel_problem→warmth; mode_shock→energy; profile_NATURAL→warmth; roles_close/proof→steadiness | Deterministic voice fit |
| TTS instructions | Brain tone list + “direct, empathetic, slightly frustrated” + alert opening | Tone from Brain; delivery from attention + problem funnel |
| First spoken | “Urgent question dies in silence.” | Candidate hook + `align_hook_with_first_spoken` |
| Body VO | Scales to 60 visitors, competitor purchase, invisible loss, habit close | Claude expansion of Strategy Item angle |

**Why this voiceover?** Hook fidelity is deterministic; story body is Claude dramatizing the angle; ending is **habit reframing from the strategy angle**, not the candidate’s “next visitor gets an answer” ending intent.

**Script vs VO inconsistency:** `video.script` HOOK still writes VO as “Sixty people visited…”, but canonical `voiceover_text` / TTS starts with the hook. Fidelity checks passed against `voiceover_text`.

### CTA / ending

| Layer | Decision | Why |
| --- | --- | --- |
| Package CTA | “Create your AI assistant — let your website answer while the lot is full and the team is off.” | Brain default CTA + Claude dealership lot framing |
| Typed CTA scene | **Not requested** (`cta_decision_reason: no typed CTA requested in visual plan`) | Recent fingerprints also had `typed_cta: false`; problem-aware spoken close preferred |
| Spoken ending | “That silence isn't a bad weekend. It's a habit.” | Strategy angle’s mandated cost naming |
| Story integrity | **warning `cta_mismatch`** — package CTA not in VO | Allowed soft warning; package still succeeds |
| Candidate ending | “Next website visitor… gets an answer…” | **Did not survive** into spoken close; product payoff moved to visual PRODUCT_DEMO only |

**Why this CTA?** Copy-level CTA is Brain+Claude for lead_gen; **not** rendered as typed card because presentation plan requested 0 CTA scenes (series + funnel pattern).

**Why this ending?** Weekly/strategy angle explicitly: end by naming the cost as habit. That beat won over candidate `endingIntent` (product success state).

---

## 9. What survived vs what changed

### Survived into final package

| Candidate attribute | Final evidence |
| --- | --- |
| `hookLine` | brief.hook + VO first sentence |
| `openingSituation` (hands + unanswered thread + car dealer) | scene-1 image prompt |
| `family=direct_product_world` | story stays in website chat world |
| `mainCharacter` = visitor’s hands | scenes 1–2 |
| `emotionalReaction=tension` | VO delivery frustrated/empathetic |
| `productConnection` (product handles website moment) | PRODUCT_DEMO ask/answer on same domain |
| Core conflict = offline unanswered questions | full VO + escalation scene (empty contact form) |

### Changed / dropped / overridden

| Original decision | Final outcome | Who won |
| --- | --- | --- |
| Attention preferred visual (kitchen counter midnight) | Dealership hands opening | Creative candidate + fidelity |
| Candidate ending (visitor gets answer) | Habit close in VO | Strategy angle |
| Creative DNA productRole in spoken script | DNA validation **failed**; VO never names chatbot | Claude VO + integrity warning path |
| product_reveal ABSTRACT_PRODUCT_SYSTEM | Structured PRODUCT_DEMO scene | Package visual planner |
| PHOTOGRAPHIC medium lead | CLEAN_ILLUSTRATION | Series diversity deterministic |
| Highest-creative absurd airport queue | Not selected | Commercial Success scoring |
| Package CTA wording | Not spoken | Presentation CTA policy + Claude VO |
| Co-working identity environment | Applied onto dealer story | Creative identity lock |

---

## 10. Source attribution (approx. share of final package)

Estimates of **decision influence**, not token counts:

| Source | Share | What it controlled |
| ---: | ---: | --- |
| **Product Brain** | ~22% | Pain, audience (dealers), product role, tone, default CTA seed, scenario text |
| **Weekly Strategy / Strategy Item** | ~18% | Theme, Problem Aware funnel, topic/angle (60 visitors, habit cost), platform |
| **Creative Candidate** | ~24% | Hook, opening situation, main character, family, immutable world, viewer question |
| **Narrative Beats** | ~8% | Beat roles, comprehension questions, timeline shares / pacing |
| **Deterministic logic** | ~16% | Commercial selection, soft-reject fallback, voice scoring, medium diversity, profile snapshot, no typed CTA, demo variant bias, fidelity gates |
| **Claude creativity** | ~12% | VO body expansion, image prompt staging, PRODUCT_DEMO dialogue, platform captions/hashtags, strategy topic wording |

---

## 11. Decision Q&A (explicit answers)

| Question | Answer |
| --- | --- |
| Why this Strategy Item? | Only Problem Aware slot; Brain dealership scenario + audience; silence-as-habit angle matches lead_gen pain. |
| Why this Creative Candidate? | Highest Final Selection Score via commercial survivability in the product’s native website moment. |
| Why not the other candidates? | Metaphors / readable boards / lower demo clarity lost 49–152 final points; creative leader c1 commercial=18. |
| Why this hook? | Candidate hookLine; Attention required first spoken = hook; fidelity preserved exact string. |
| Why this opening? | Candidate openingSituation + narrative HOOK; Attention’s unexpected visual discarded as off-world. |
| Why this Product Demo? | After-hours variant for weekend silence; structured ask→answer→lead on same dealership financing moment; integrity required visible demo. |
| Why this CTA? | Brain default expanded with lot/team framing; typed CTA omitted (0 requested); not spoken (cta_mismatch warning). |
| Why this ending? | Strategy angle mandate: name the cost as habit — overrode candidate product-success ending. |
| Why this visual style? | NATURAL + CLEAN_ILLUSTRATION + locked creative identity; illustration chosen to avoid repeating recent PHOTOGRAPHIC fingerprints. |
| Why this pacing? | Narrative-beat shares: ~60% problem (setup+escalation), short hook/close; 25s target, 5 beats, no sparse fill. |
| Why this voiceover? | Hook lock + angle dramatization + habit close; shimmer from secondary voice fit (problem funnel + NATURAL + shock energy). |

---

## 12. Most common decision pattern (this run)

**Commercial-direct product world over clever metaphor; Brain scenario anchors industry; strategy angle owns the ending; candidate owns the hook/opening; series diversity owns the look.**

Repeated mechanism: when creative originality and commercial renderability conflict, **Final Selection Score (creative + commercial)** and later **fidelity / series** rules prefer the filmable website-chat story — then Claude writes problem-forward VO that under-names the product while PRODUCT_DEMO carries the commercial proof visually.

---

## 13. Biggest decision change

**Attention originality’s winning visual (“kitchen counter midnight brand feed”) and the candidate’s spoken product ending were both discarded.**

- Opening kept **c3’s hands / unanswered dealership chat** instead of Attention’s unexpected concept.
- Ending kept **strategy “habit” close** instead of candidate “next visitor gets an answer.”
- Product proof moved almost entirely into **silent PRODUCT_DEMO** while VO stayed problem-only — creative DNA even flagged `productRole` missing from voiceover.

That is the largest mid-pipeline rewrite of intent between “selected creative DNA” and “final package story.”

---

## Appendix — IDs

| Entity | ID |
| --- | --- |
| production_run | `f5a7794e-c1a8-4d6b-82c9-500a8d3e9f88` |
| project | `aabab9ff-9db4-4012-a53c-135e3bfea6cd` |
| content_strategy | `f018b4b8-1b15-49ee-a97a-97defd61abb0` |
| strategy_item | `b8f25415-7b73-4bb3-bc56-3031f4c2684d` |
| content_package | `31878924-d54d-4e17-9834-ed2d9f055116` |
| selected_candidate | `c3-direct_product_world-div` |
