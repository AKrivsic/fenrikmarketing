# Knowledge Flow Audit

**Mode:** READ ONLY — no code or data modified.  
**Run:** `f5a7794e-c1a8-4d6b-82c9-500a8d3e9f88`  
**Package:** `31878924-d54d-4e17-9834-ed2d9f055116`  
**Project:** Fenrik.chat (`aabab9ff-9db4-4012-a53c-135e3bfea6cd`)  
**Evidence:** Product Brain columns + `projects.knowledge` + `content_strategies` + strategy item + package brief / presentation_generation / video job / platform outputs (export `scripts/output/production-run-f5a7794e-c1a8-4d6b-82c9-500a8d3e9f88-audit-export.json`).

This audit tracks **knowledge**, not creative quality or decision correctness.

---

## 1. Executive Summary

Product Brain entered the run as a dense fact sheet (product definition, 7 pains, 14 strengths, 9 audience segments, tone, CTA, language, market). The pipeline **collapsed that sheet into one scenario-drama** (car dealership weekend silence), then **carried the drama harder than the product**.

| Metric | Value |
| --- | --- |
| **Product Brain coverage (depth-weighted avg)** | **43%** |
| **Fields with any final visibility** | 11 / 14 countable fields (79% “touched”) |
| **Pain points used in final story cluster** | 4 / 7 |
| **Strengths with clear final visibility** | ~4 / 14 |
| **Audience segments used** | 1 / 9 (car dealers) |
| **Product name in voiceover** | Absent |
| **Canonical product role in voiceover** | Absent |
| **Invented knowledge items** | **15** |
| **Knowledge drift** | **YES** (product label + claim surface) |

**One-line verdict:** Scenario knowledge survived and grew; product-definition knowledge mostly stalled after Creative Candidate / CTA surfaces and **disappeared from the spoken package**.

---

## 2. Product Brain Coverage

### What entered Product Brain

| Block | Contents |
| --- | --- |
| **Product Name** | Fenrik.chat |
| **Product is** (10) | AI chatbot platform for websites; URL→knowledge base; 24/7 answers; guides to service; captures leads; embed script; AI assistant in ~1 minute; uses website content; preview before signup; no training |
| **Product is not** (6) | Not DIY/dev-heavy; not complex integration; not tech-only; not custom AI project; not live human chat; not manually trained bot |
| **Strengths** (14) | 1-minute setup; no-code; **$69/mo**; preview; multi-industry; embed; instant answers; after-hours lead capture; auto website content; no training; no coding; preview; transparent pricing; works from existing site |
| **Pain points** (7) | Offline unanswered; no resources for custom bot; losing leads without instant support; complexity/cost of integrations; need 24/7 without staff; visitors leave; repeating same questions |
| **Audience** (9 segments) | Local services; **car dealers / salons / service centers**; SaaS; lawyers/accountants/agencies; marketing agencies; consultants; professional services; small businesses; SMB service companies |
| **Tone** (5) | Simple; direct; transparent; friendly; concise |
| **CTA** | Create your AI assistant |
| **Language** | en |
| **Market / type** | global · saas |
| **Goal** | lead_generation |
| **Forbidden claims** | `[]` (empty) |
| **Visual identity** | **Not present** in Product Brain |
| **Scenarios (knowledge card, not brain columns)** | 10 generated scenarios including the exact car-dealership holiday-weekend scenario used by the package |

### Coverage verdict (depth-weighted)

Average of per-field coverage scores in §8 ≈ **43%**.

Interpretation: the package **uses** Product Brain as a permission structure (offline-answer pain + chatbot role + CTA stem), but **does not transmit** most strengths, most audience, market, tone notes, pricing, or setup differentiators into the final spoken/visual story.

---

## 3. Knowledge Flow

### Master flow (selected package)

```
Product Brain
  product_is / pains / strengths / audience / tone / CTA / language / market
       ↓
Knowledge scenarios
  car dealership holiday weekend (exact text later reused)
       ↓
Weekly Strategy (`content_strategies`)
  theme: "The silent cost of a website that can't answer back"
  funnel: Problem Aware ×1
  objective: lead_generation   ← goal PRESERVED
       ↓
Strategy Item
  topic + angle: car dealer / 60 visitors / financing / contact-form silence / habit
  platform: tiktok
  Product Brain facts: mostly ABSENT as explicit text
       ↓
Creative Candidate (`c3-direct_product_world-div`)
  resurrects: pain "Unable to answer customer questions when offline"
  resurrects: product role "AI chatbot platform for websites"
  dramatizes: hands / empty reply / dealership world
       ↓
Narrative Beats
  same candidate knowledge compressed into HOOK→SETUP→ESCALATION→RESOLUTION
       ↓
Presentation / Scenes
  scenario stills + PRODUCT_DEMO (Fenrik.chat brand returns)
  creative identity INVENTS co-working daylight look
  product label drifts toward "AI assistant" / chat UI
       ↓
Voiceover
  story facts STRONGER; product facts WEAKER → mostly GONE
       ↓
Platform Outputs
  Fenrik.chat + AI assistant + preview/24/7 PARTIALLY restored
  story numbers (60) EXPANDED across captions
```

### Field-by-field flow (classification)

| Knowledge | Product Brain | Weekly Strategy | Strategy Item | Creative Candidate | Narrative Beats | Presentation | Voiceover | Platform Outputs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Product Name | Present | Ignored | Ignored | Ignored | Ignored | Preserved (demo brand) | **Lost** | Preserved / Expanded (URLs) |
| Product Role (canonical chatbot platform) | Present | Ignored | Ignored | **Preserved** | Preserved | Modified → assistant/chat | **Lost** | Modified (assistant/chatbot mix) |
| Core promise (answer when humans can’t) | Present | Preserved (theme) | Expanded (drama) | Preserved | Preserved | Preserved | Preserved (implied) | Expanded |
| Pain: offline unanswered | Present | Preserved | Expanded | **Preserved (exact)** | Preserved | Preserved | Preserved (weekend/off) | Preserved |
| Pain: lose leads / visitors leave | Present | Implied | Expanded | Preserved | Preserved | Preserved | **Strengthened** | Strengthened |
| Pain: custom-bot cost / repeating Qs | Present | Ignored | Ignored | Ignored | Ignored | Ignored | **Lost** | **Lost** |
| Strengths ($69, 1 min, embed, no-code…) | Present | Ignored | Ignored | Ignored | Ignored | Mostly ignored | **Lost** | Weak (preview/24/7 only) |
| Audience (9 segments) | Present | Ignored | **Collapsed → dealers** | Collapsed | Collapsed | Collapsed | Collapsed | Collapsed (+ #SmallBusiness) |
| Scenario (dealership weekend) | In knowledge scenarios | Selected via theme | **Expanded** (+60, form, competitor) | Preserved as world | Preserved | Preserved | Strengthened | Strengthened |
| CTA | Present | Ignored as text | Ignored | Ignored | Ignored | **Expanded** (lot metaphor) | **Lost** | Preserved / Expanded |
| Tone notes | Present | Ignored | Ignored | Ignored | Ignored | Overridden (shock/urgent) | Overridden | Mixed |
| Language en | Present | Preserved | Preserved | Preserved | Preserved | Preserved | Preserved | Preserved |
| Market global / saas type | Present | Ignored | Ignored | Ignored | Ignored | Ignored | **Lost** | **Lost** |
| Forbidden claims | Empty | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Visual identity | Absent | — | — | — | — | **Invented** (creative identity) | n/a | n/a |

### Compression by stage (approximate)

| Stage | Knowledge in | Knowledge out | Retained | Expanded | Lost |
| --- | --- | --- | --- | --- | --- |
| Product Brain → Weekly Strategy | Full brain (~50+ atoms) | Theme + goal + funnel | Goal, problem theme | Theme wording | Most atoms not cited |
| Weekly → Strategy Item | Theme | Topic/angle story | Offline-answer problem | 60 visitors, form, competitor, habit | Product specs |
| Strategy Item → Candidate | Story angle | DNA + exact pain + product role | Pain + role + dealer world | Opening situation detail | Still no pricing/setup |
| Candidate → Beats | DNA | 4-role beat knowledge | Same | Comprehension framing | Little new product fact |
| Beats → Presentation | Beats + scenario | 5 scenes + demo payload | World + demo capability | Demo financing dialogue; co-working identity | Explicit “chatbot platform” phrasing |
| Presentation → Voiceover | Script + scenes | Spoken essay | Silence/habit drama | “sixty”, “no alert/record” | **Product name, role, CTA, strengths** |
| Voiceover → Platforms | VO + package CTA | Captions/CTAs | Drama + CTA stem | Free preview, 24/7, Fenrik URLs, hashtags | Consistency of product label |

---

## 4. Knowledge Transformations

### Strengthened

| Item | Where strengthened | How |
| --- | --- | --- |
| Silence / unanswered questions | Strategy → VO → Platforms | Becomes the entire meaning of the package |
| Lead loss to competitors | Strategy angle → VO | “clicked over… bought there” |
| After-hours / weekend stakes | Knowledge scenario → all stages | Timing becomes the plot |
| Unmeasurable loss (“no record”) | Strategy → VO → Facebook/LinkedIn | New observability frame layered on |
| Numeric scale (“60”) | Strategy invention → VO → every platform | Invented number becomes “fact” |

### Weakened

| Item | Where weakened | How |
| --- | --- | --- |
| Product Name | Candidate→VO | Never spoken; only returns in demo brand + platform CTAs |
| Canonical Product Role | Candidate→Presentation→VO | “AI chatbot platform for websites” → “AI assistant” / chat UI → silence |
| Strengths / proof ($69, 1 minute, embed) | Brain→Strategy onward | Dropped before strategy item |
| Multi-audience knowledge | Brain→Strategy Item | 9 segments → 1 vertical |
| Tone “friendly / transparent” | Brain→Attention/Delivery | Replaced by shock / urgent / SURPRISE |
| CTA | Package→Voiceover | Expanded on package, then omitted from speech |

### Modified

| Item | Transformation |
| --- | --- |
| CTA | `Create your AI assistant` → `Create your AI assistant — let your website answer while the lot is full and the team is off.` |
| Product role label | chatbot platform ↔ AI assistant ↔ chatbot hashtag ↔ chat widget |
| Pain wording | Exact brain pain in candidate DNA; VO uses dramatized paraphrase only |
| Scenario | Knowledge scenario text preserved on package; angle adds 60 / form / competitor / habit |

### Expanded

| Item | Expansion |
| --- | --- |
| Dealership scenario | Financing specifics; imperfect credit; lenders; trade-ins (LinkedIn) |
| Platform CTAs | Link-in-bio, free preview, fenrik.chat URL append |
| Visual world | Creative identity invents co-working daylight OTS look around a dealership story |

---

## 5. Knowledge Drift

### Drift chain A — Product label (YES)

```
Product Brain
  "AI chatbot platform for websites"
        ↓
Weekly Strategy / Strategy Item
  (product label absent — only website silence theme)
        ↓
Creative Candidate
  "AI chatbot platform for websites"  (restored)
        ↓
Presentation
  "AI assistant" in stills / chat widget / Fenrik.chat demo
        ↓
Voiceover
  NOTHING (no product noun)
        ↓
Platform Outputs
  "AI assistant" + "chatbot" hashtags + fenrik.chat
```

**Knowledge drift: YES** — same product, unstable noun; **spoken layer has no product noun at all**.

### Drift chain B — Pain → story object

```
Product Brain pain
  "Unable to answer customer questions when offline"
        ↓
Scenario
  dealership weekend, no answers on financing/availability
        ↓
Strategy Item
  contact form that "just sits there" + 60 visitors
        ↓
Voiceover
  contact form quietly losing every one / habit
        ↓
Platforms
  "Your contact form isn't the same as being available"
```

Pain **survives**, but the **knowledge object** drifts from “offline support gap” to “contact form as villain” (not a Product Brain entity).

### Drift chain C — Preview strength → “free”

```
Product Brain
  "Try a preview without registration" / "Preview before signup"
        ↓
… absent through VO …
        ↓
Facebook / Instagram CTAs
  "free live preview" / "try it free"
```

Preview knowledge **reappears late** with **freeness wording** not stated as “free” in Product Brain (preview-without-registration ≠ free plan claim, but drifts toward it).

---

## 6. Knowledge Loss

### Pain points

| # | Product Brain pain | Final package |
| --- | --- | --- |
| 1 | Unable to answer customer questions when offline | **Survived** (candidate exact; story weekend/off) |
| 2 | No resources to build/maintain custom chatbot | **Lost** |
| 3 | Losing leads due to lack of instant website support | **Survived** (competitor purchase drama) |
| 4 | Complexity and cost of traditional chatbot integrations | **Lost** |
| 5 | Need for 24/7 support without extra staff | **Partial** (implied + some platform “24/7”) |
| 6 | Visitors leave before contacting you | **Survived** |
| 7 | Repeating the same customer questions every day | **Lost** |

**Entered: 7 → clearly active in final cluster: 4 → lost: 3**

### Strengths

| Survived (weak/partial) | Lost |
| --- | --- |
| After-hours lead capture (story + CTA + demo) | **$69 / transparent pricing** |
| Instant answer (demo/script, not VO noun) | **1-minute setup** |
| Preview without registration (Facebook CTA only) | **Embed script deployment** |
| Answers when team off (core drama) | **No training / no coding** (as claims) |
| | Multi-industry positioning |
| | Auto website-content knowledge base story |

**Biggest strength loss:** commercial differentiators (**price, speed-to-value, no-code, embed**) never enter strategy or speech.

### CTA

| Stage | Status |
| --- | --- |
| Product Brain | Create your AI assistant |
| Package CTA | Expanded — **survived** |
| Voiceover | **Lost** (story integrity warning: `cta_mismatch`) |
| Platforms | **Survived** (often with fenrik.chat) |

### Audience

| Entered | Final |
| --- | --- |
| 9 segments | **1 dramatized** (car dealers) |
| | `#SmallBusiness` appears on X without using other segments |

### Product role / name

| | Candidate | Scenes | Voiceover | Platforms |
| --- | --- | --- | --- | --- |
| Fenrik.chat | No | Yes (demo) | **No** | Yes |
| AI chatbot platform for websites | Yes | No | **No** | No |
| AI assistant | No | Yes | **No** | Yes |

### Product is_not

All six constraints **ignored** as explicit knowledge (no “not a live human chat / not custom AI project” transmission). Harmless if unused, but **not used as guardrails in visible outputs**.

---

## 7. Knowledge Invention

Invented = not present in Product Brain (and not a faithful restatement of an existing atom).

| # | Invented knowledge | First introduced | Still present at end? |
| --- | --- | --- | --- |
| 1 | **60** weekend visitors / sixty in two days | Strategy Item angle | Yes (VO + platforms) |
| 2 | Sold nothing / bought at competitor | Strategy Item | Yes |
| 3 | Contact form as silent lead-loss system | Strategy Item | Yes (VO + platforms) |
| 4 | No alert / no record / never measured | Strategy Item / VO | Yes |
| 5 | Saturday afternoon beat | Strategy Item | Softened to weekend |
| 6 | Financing as the urgent question | Strategy Item / scenario expansion | Yes |
| 7 | Used cars + less-than-perfect credit | Product demo ask | Yes (demo) |
| 8 | “Several lenders” / credit-profile options | Product demo AI answer | Yes (demo) — **dealership capability fiction** |
| 9 | Financing-team handoff + contact capture script | Product demo | Yes |
| 10 | Trade-ins (LinkedIn) | Platform outputs | Yes (LinkedIn only) |
| 11 | “Free” / “try it free” / “free live preview” | Platform CTAs | Yes |
| 12 | Link-in-bio CTA convention | TikTok/Instagram | Yes |
| 13 | “Habit” moral close | Strategy Item | Yes (VO + platforms) |
| 14 | “0 answered” / zero leads numeric slogans | Platforms | Yes |
| 15 | Co-working daylight creative identity | Presentation | Yes (IMAGE prompts) |

**Invented knowledge count: 15**

### Claude / story unsupported assumptions

- Treats **60** as a real count (not marked as hypothetical).  
- Asserts dealership financing policies via demo answer (**not Fenrik product knowledge**).  
- Asserts measurement gap (“no alert/record”) as general business truth.  
- Platforms push **freeness** beyond Brain’s “preview without registration”.

### What was *not* invented (faithful reuse)

- Exact knowledge **scenario** text on `package_brief.scenario`.  
- Exact pain string in candidate `coreConflict`.  
- Canonical product role string in candidate `productRole` / `productConnection`.  
- CTA stem “Create your AI assistant”.

---

## 8. Knowledge Coverage Table

Coverage % = rough survival depth to **final consumer surfaces** (scenes + voiceover + platform outputs). Internal-only presence caps at ~40.

| Product Brain Field | Coverage % | First Used | Last Used | Final Visibility |
| --- | --- | --- | --- | --- |
| Product Name | 40 | Presentation (demo brand) | Platform CTAs/captions | Visible on demo + platforms; **absent in VO** |
| Audience | 20 | Knowledge scenario / Strategy Item | Platforms (#SmallBusiness, dealer story) | **1/9 segments** |
| Market (global/saas) | 0 | — | — | **Not visible** |
| Pain Points | 55 | Candidate (exact) + Strategy drama | VO + platforms | Primary cluster visible; 3 pains unused |
| Strengths | 25 | Package CTA / demo / late platforms | Facebook preview CTA | After-hours + preview only; pricing/setup lost |
| CTA | 70 | Package brief | Platforms | Strong on package/platforms; **lost in VO** |
| Tone | 0 | — | Overridden by shock/urgent | Notes unused |
| Visual Identity | N/A | — | Invented identity used | Not a Brain field |
| Language | 100 | Project `en` | All outputs | English throughout |
| Forbidden Topics | N/A | Empty list | — | Nothing to enforce |
| Scenario | 95 | Knowledge scenarios | Package scenario + all story layers | **Preserved + expanded** |
| Product Role | 45 | Creative Candidate | Platforms (synonyms) | Canonical in candidate; **missing in VO** |
| Core Promise | 65 | Weekly theme | VO/platforms/demo | Answer-when-absent dramatized |
| Competitive Advantage | 10 | — | Weak platform echoes | **$69 / 1 min / embed largely gone** |
| Customer Type | 25 | Scenario selection | Dealer story | Single vertical |
| Industry | 40 | Scenario | Dealership world | Auto retail dramatized |

**Depth-weighted Product Brain coverage ≈ 43%.**

---

## 9. Sankey-style Flow

```
Product Brain
├─ Pain: offline unanswered ───────────────┐
├─ Pain: losing leads / visitors leave ────┤
├─ Pain: 24/7 without staff ───────────────┤──► Weekly theme
├─ CTA stem ────────────────────────────────┤      "website that can't answer back"
├─ Product role (chatbot platform) ─────────┤
├─ Strengths ($69, 1min, embed, no-code…) ──╳ (drop)
├─ Audience ×8 non-dealer ──────────────────╳ (drop)
├─ Tone notes ──────────────────────────────╳ (drop)
└─ Market/saas ─────────────────────────────╳ (drop)

Knowledge scenarios
└─ Car dealership holiday weekend ──────────► Strategy Item world (PRESERVED)

Strategy Item
├─ Invent: 60 visitors ─────────────────────► VO + Platforms (STRENGTHEN)
├─ Invent: contact form villain ────────────► VO + Platforms
├─ Invent: competitor purchase ─────────────► VO + Platforms
└─ Invent: habit / unmeasured loss ─────────► VO + Platforms

Creative Candidate
├─ Restore: exact offline pain ─────────────► Beats / DNA
└─ Restore: "AI chatbot platform…" ─────────► Beats
                                              └─╳ fails to reach Voiceover

Presentation
├─ Demo: Fenrik.chat + lead capture ────────► Scenes (product returns visually)
├─ Invent: financing lender dialogue ───────► Demo only
└─ Invent: co-working visual identity ──────► IMAGE prompts

Voiceover
├─ Keep: silence / sixty / form / habit ────► Platforms
└─ Drop: product name, role, CTA, strengths

Platform Outputs
├─ Restore: Fenrik.chat + AI assistant CTA
├─ Partial restore: preview / 24/7
└─ Expand: free wording, link-in-bio, hashtags
```

---

## 10. Critical Findings

1. **Biggest knowledge loss — Product identity in the spoken layer**  
   Voiceover carries invented story density (60, competitor, form, habit) but **zero** Product Brain product name, product role, or CTA. The package’s highest-attention channel is product-empty.

2. **Biggest knowledge drift — Product noun instability**  
   `AI chatbot platform for websites` → (gap) → restored in candidate → `AI assistant` / chat UI in presentation → **nothing** in VO → `AI assistant`/`chatbot`/Fenrik.chat on platforms.

3. **Important knowledge never used**  
   Pricing ($69), 1-minute creation, embed script, no-training, most `product_is_not`, most audience segments, tone notes, market/saas.

4. **Knowledge used only once / internal-only**  
   Canonical product role string appears in Creative Candidate / Narrative Beats storage, then fails consumer surfaces (especially VO).

5. **Knowledge disappeared too early**  
   Strengths & multi-audience die between Product Brain and Strategy Item (before creative work).

6. **Knowledge introduced too late**  
   Fenrik.chat brand and preview/24/7 claims largely re-enter at Presentation demo / Platform outputs — after the spoken story is already product-less.

7. **Information invention concentrated in Strategy Item + Product Demo**  
   Strategy invents the numeric/moral frame; demo invents **dealership financing facts** (lenders, credit profiles) unsupported by Product Brain.

8. **Contradiction / duplication**  
   - Package CTA expanded, but VO omits it (`cta_mismatch`).  
   - Subtitles open with “Sixty people visited…” while VO opens with hook (parallel text systems diverge).  
   - Analytics heuristic marks more pains/strengths “used” than strict text transmission supports — treat analytics as thematic, not knowledge fidelity.

9. **Knowledge loop**  
   Offline-answer pain → scenario → strategy drama → candidate restores exact pain → beats → scenes → VO paraphrases pain → platforms restate drama. **Pain loops; product does not.**

10. **Scenario knowledge is the true backbone**  
    The approved knowledge scenario—not the full Product Brain—dominates what “survives.” Brain mostly authorizes the scenario rather than filling the script.

---

## 11. Confidence

| Claim area | Confidence |
| --- | --- |
| Stage artifacts for this run/package | **High** (DB + audit export) |
| Exact Product Brain / scenario strings | **High** |
| Presence/absence in VO / platforms / candidate | **High** |
| Depth-weighted coverage % (43%) | **Medium** (scoring rubric) |
| Analytics “usedCount” as fidelity | **Low** (thematic matcher; over-counts) |
| Intent of authors vs text transmission | **N/A** — audit is textual knowledge flow only |
| Other packages in other runs | **Out of scope** (this run has 1 package) |

---

## Appendix — Stage inventory (IDs)

| Stage | ID / pointer |
| --- | --- |
| Project / Brain | `aabab9ff-9db4-4012-a53c-135e3bfea6cd` |
| Weekly strategy | `f018b4b8-1b15-49ee-a97a-97defd61abb0` |
| Strategy item | `b8f25415-7b73-4bb3-bc56-3031f4c2684d` |
| Package | `31878924-d54d-4e17-9834-ed2d9f055116` |
| Selected candidate | `c3-direct_product_world-div` |
| Video job | `edcc904a-2458-4b96-a1db-dfd0f11b4b3c` |
| Prior content audit | `reports/generated-content-audit.md` |
