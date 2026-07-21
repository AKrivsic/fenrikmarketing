# Hardcoded Visual Templates & Typed Scenes — Full Audit

**Date:** 2026-07-21  
**Scope:** Read-only audit of repository code, git history, and production database.  
**No implementation. No redesign. No fix proposals.**

---

## 1. Executive Summary

`after_hours_response` is a **code-defined PRODUCT_DEMO layout variant**, introduced 2026-07-19 in Sprint 5.1 (`64dfa7a`). It is **not** Fenrik.chat-project-scoped, **not** stored as a project/Product Brain config, and **not** gated by product type.

All four PRODUCT_DEMO variants draw **fake conversational chat UI** via SVG → PNG (`composeProductDemoRaster.ts`). The production video worker never uses an image model for PRODUCT_DEMO.

**Empirical production data (as of audit):** structured `PRODUCT_DEMO` + `demo_variant` appear **only on Fenrik.chat** packages/jobs since Sprint 4C.1/5.1. Other projects in the last ~45 days have IMAGE/PHONE/CTA but **zero** PRODUCT_DEMO scenes. That does **not** mean the mechanism is Fenrik-only — the code path is global.

**System scope verdict:** **KRITICKÝ** for architecture (global chatbot UI templates + PDI pressure to invent chat beats), with **OMEZENÝ** observed blast radius so far (only Fenrik.chat has executed the path).

---

## 2. Původ `after_hours_response`

### 2.1 Definice

| Item | Value |
|---|---|
| Enum / const | `PRODUCT_DEMO_VARIANTS` in `lib/scene-types/product-demo/demoVariant.ts` |
| Type | `ProductDemoVariant` |
| Schema field | `productDemoBeatSchema.demo_variant` (optional) in `productDemoBeat.ts` |
| Default / safe fallback | `SAFE_PRODUCT_DEMO_VARIANT = "conversation_answer"` (not after_hours) |
| Layout function | `layoutAfterHoursResponse()` in `composeProductDemoRaster.ts` |
| Selection | `narrativeSuggestsAfterHours()` + `listCompatibleDemoVariants()` + `selectDemoVariant()` |

### 2.2 Historie (git)

| Fact | Evidence |
|---|---|
| First commit | `64dfa7ab1f5791ba038fbd14bbb37c631348088c` |
| Date | 2026-07-19 02:28:23 +0200 |
| Author | Alexandr Krivsic (Co-authored-by: Cursor) |
| Message | “Preserve PRODUCT_DEMO through render and add visual variants (Sprint 5 / 5.1).” |
| Purpose (from commit + `reports/sprint-5.1-product-demo-variation.md`) | Reduce repetition of a single phone-chat composition within a multi-package run; keep Q→A→outcome contract; **no LLM**; deterministic mapping + run-level LRU rotation |
| Fenrik.chat-specific in commit? | **NE** — no project ID, client ID, or product-type check |
| Temporary / fallback flag? | **NOT VERIFIED** as temporary. Documented as intentional Sprint 5.1 variation. Safe fallback for unknown variants is `conversation_answer`, not `after_hours_response` |
| Predecessor | Sprint 4C.1 (`1f3c37f`, same night) added single chat raster; 5.1 split into 4 layouts |

**Motivace z historie:** explicitně “vary demo compositions across packages in a run”. Mentions Fenrik in renderer comments (“Fenrik product-demo chat stills”) as the **execution model**, not as a project allowlist.

### 2.3 Scope

| Dimension | Verdict |
|---|---|
| Global code path | **ANO** |
| Project-specific | **NE** |
| Product-type-specific (enforced) | **NE** |
| Market / client-specific | **NE** |
| Renderer-specific | **ANO** — only PRODUCT_DEMO SVG layouts |

### 2.4 Persistence

`demo_variant` is **not** a DB column. It is embedded in JSON:

| Store | Role |
|---|---|
| `content_packages.package_brief.visual_scenes[].payload.demo_variant` | Written at generation / ensure |
| `content_packages.package_brief.product_demo` | Optional beat mirror via `packageBriefPatch` |
| `video_jobs.input.scenes[].payload_snapshot` | Compiled scene payload for worker |
| `video_jobs.output.render_spec.scenes[]` | Post-render resolved spec |
| `projects.knowledge` | **No** `demo_variant` catalog found; only one project had `presentation` keys (`visual_profile`), no `allowed_scene_types` override with PRODUCT_DEMO variants |
| Product Brain / strategy tables | **No** dedicated demo-variant field |

**Data flow:** code selects → payload JSON → DB jsonb stores → worker reads `payload_snapshot` → SVG raster. DB does not configure allowed variants.

### 2.5 Bezpečnostní guardy pro `after_hours_response`

Searched for checks of the form: conversational / chatbot / messaging / real chat UI.

| Guard | Exists? |
|---|---|
| Product-type / chatbot capability gate on variant select | **NE** |
| Project allowlist | **NE** |
| Asset / real UI requirement | **NE** |
| Soft prompt text (“do not fabricate chatbot for unrelated products”) | **ANO** — prompt only; not enforced at selection/render |
| `ensureStructuredProductDemo` refuse to invent beat from scratch | **ANO** — Sprint 5.3; does **not** block rendering if LLM already authored a beat |

> **`after_hours_response` může být zvolen i pro nesouvisející produkt**, pokud package obsahuje validní `product_demo` beat a narrative text matchne after-hours regex (nebo LRU rotace ho vybere z compatible listu).

---

## 3. Kompletní decision trace

```text
Product Brain / project product_is
        ↓ (soft context to LLM only)
Creative Candidate (LLM)
        ↓
Package generation (LLM visual_scenes)
        ↓  may emit { type: PRODUCT_DEMO, payload: product_demo beat }
PDI prompt block (must include structured PRODUCT_DEMO)
        ↓
ensureStructuredProductDemo(force=false|true)
        ↓  if no beat → reason product_demonstration_not_fabricated (no invent)
        ↓  if beat exists → completeExistingProductDemoBeat → assignVariant
resolveEffectiveDemoVariant / selectDemoVariant
        ↓  heuristic: outcome_type + AFTER_HOURS_HINT regex + run LRU
payload on visual_scenes + package_brief.product_demo
        ↓
validateProductDemonstrationIntegrity (hard fail if no structured beat)
        ↓
Presentation Analyzer (PRODUCT_DEMO: parse payload only; fail-closed, no IMAGE downgrade)
        ↓
compileScenePlan → payload_snapshot + renderer_version product_demo@1
        ↓
video_jobs.input / output.render_spec
        ↓
prepareProductDemoSceneRaster → composeProductDemoRaster → sharp(svg)
```

### Step detail

| Step | Input | Output | Conditions / defaults / fallbacks |
|---|---|---|---|
| Product Brain | `projects.product_is`, strengths | Prompt context | **No** demo_variant field |
| Candidate | Divergence / DNA | Winner concept | May bias toward after-hours *narrative* (topicSignals / raw situations); **not** variant enum |
| Presentation types | `deriveAllowedSceneTypes` | Includes `PRODUCT_DEMO` whenever `SCENE_TYPES_ENABLED=true` | Always added; no product-type filter (unlike PHONE) |
| LLM package | Prompt + PDI block | `visual_scenes` possibly with PRODUCT_DEMO | Soft: “do not invent chatbot for non-conversational products”; Hard pressure: “MUST include structured product demonstration” with chat field names |
| `ensureStructuredProductDemo` | scenes, narrativeText, recentVariants | Normalized beat + scene | No existing beat → **no fabrication**. Existing beat → `resolveEffectiveDemoVariant` |
| `narrativeSuggestsAfterHours` | hook+VO+concept+scenario string | boolean | Regex: `after-hours\|weekend\|monday morning\|overnight\|while you're away\|11 pm\|10 pm\|offline\|at night\|late night` |
| `selectDemoVariant` | outcomeType, narrative, recent | one of 4 variants | If afterHours → prefer `after_hours_response` first; then LRU among compatible |
| Explicit `demo_variant` on beat | LLM or prior | kept if valid | Unknown → strip → `primaryVariantForOutcome` safe fallback |
| PDI | package | pass/fail | Missing beat → `structured_beat_missing` → hard fail after one `ensureDemo(true)` repair (repair still cannot invent) |
| Analyzer | scene | keep PRODUCT_DEMO or throw | Gate = payload parse only |
| Renderer | beat | PNG | Switch on `demo_variant`; missing → `conversation_answer` layout |

**LLM vs heuristic:** Beat *content* (question/answer/outcome) is LLM-authored (or fixture). Variant *layout* is **heuristic-selected** (no LLM). Rendering is **code-defined**.

---

## 4. Kompletní katalog PRODUCT_DEMO variant

| Variant | Definition | Renderer | Selection rule | Default/fallback | Intended product type | Global? | Uses real product assets? |
|---|---|---|---|---|---|---|---|
| `conversation_answer` | `demoVariant.ts` + `layoutConversationAnswer` | `composeProductDemoRaster` / `product_demo@1` | Primary for `question_resolved`; always in compatible sets; **SAFE fallback** | Yes — safe default | Chatbot / conversational (implicit) | Yes | No |
| `lead_capture` | + `layoutLeadCapture` | same | Primary for `lead_captured` / `contact_captured` | Primary for those outcomes | Lead-gen chatbot | Yes | No |
| `booking_confirmation` | + `layoutBookingConfirmation` | same | Primary for `booking_confirmed` | Primary for that outcome | Booking / scheduling chatbot | Yes | No |
| `after_hours_response` | + `layoutAfterHoursResponse` | same | Compatible with all outcomes; **preferred** when after-hours narrative regex hits; LRU otherwise | Not default | After-hours chatbot narrative | Yes | No |

### Per-variant visual facts

| Property | conversation_answer | lead_capture | booking_confirmation | after_hours_response |
|---|---|---|---|---|
| Draws | Centered phone chrome + chat bubbles + green outcome | Desktop “Website chat” panel + “New lead captured” card | Desktop “booking assistant” widget + “Appointment confirmed” | Night split: “11:42 PM · After hours” / “No reply” → brand “answers instantly” |
| Fixní texty | “Conversation resolved”; bubble chrome | “Website chat”; “New lead captured”; “Contact details saved automatically”; “Lead capture demonstration” | “booking assistant”; “Appointment confirmed”; “Slot held · visitor notified” | **“11:42 PM · After hours”**; **“No reply”**; “Visitor waits…”; “answers instantly” |
| Fixní layout | Phone frame | Full panel | Centered widget | Horizontal split at 48% height |
| Fixní zařízení | Phone mockup | Desktop panel (no phone) | Desktop widget | No device chrome |
| Acts like product screenshot? | **ANO** (generic chat) | **ANO** | **ANO** | **ANO** (before/after chat story) |
| Client assets | Ne | Ne | Ne | Ne |
| Project colors / identity | Only `brand_name` string in header | Only `brand_name` | Only `brand_name` | Only `brand_name` |
| Creative Identity / DNA / Scene Meaning / Visual Narrative | **Ne** — ignored by raster | Ne | Ne | Ne |

**Outcome types (schema, not layouts):** `lead_captured` | `booking_confirmed` | `question_resolved` | `contact_captured`

**Default brand_name:** `"Fenrik.chat"` (`productDemoBeatSchema` / `buildDefaultProductDemoBeat`).

### Product-form classification

| Variant | Classification |
|---|---|
| All four | **chatbot-specific** (chat bubbles + AI answer fields) |
| `lead_capture` | also **lead-generation-specific** |
| `booking_confirmation` | also **booking-specific** |
| `after_hours_response` | chatbot + after-hours narrative template |
| None | truly universal / SaaS dashboard / CRM native / non-chat |

---

## 5. Kompletní katalog typed scenes

Source of truth: `SCENE_TYPES` in `lib/scene-types/sceneType.ts`.

| Scene type | Renderer | AI image used? | Hardcoded visual structure? | Real assets used? | Can resemble fake product UI? | Global scope? |
|---|---|---:|---:|---:|---:|---:|
| `IMAGE` | `image@1` → image model (+ optional asset layout) | **Yes** | Prompt-driven; not fixed SVG UI | Optional client assets | Yes (AI can invent UI) | Yes |
| `CHECKLIST` | `checklist@1` → `composeChecklistRaster` | No | Yes (list SVG) | Optional logo | No (text card) | Yes* |
| `STATISTIC` | `statistic@1` → `composeStatisticRaster` | No | Yes (big number SVG) | Optional logo | No | Yes* (needs proof candidates) |
| `QUOTE` | `quote@1` → `composeQuoteRaster` | No | Yes (quote SVG) | Optional logo | No | Yes* (needs proof) |
| `PHONE` | `phone@1` → `composePhoneRaster` | Sometimes (AI screen) / No (asset screen) | Yes (phone frame) | **Yes** when `asset_id` | **Yes** (phone UI chrome) | Conditional (`mobileProductCapable` / mobile assets) |
| `CTA` | `cta@2` → `composeCtaRaster` | No (optional hero asset) | Yes (8 compositions) | Logo / hero optional | Partial (`product_screenshot_overlay` uses real asset) | CTA-permitted projects |
| `PRODUCT_DEMO` | `product_demo@1` → `composeProductDemoRaster` | **No** | Yes (4 chat layouts) | **No** | **Yes** | **Always** when scene types on |

\*Subject to `SCENE_TYPES_ENABLED`, proof/frequency gates, checklist project allowlist.

### Activation / selection / guards

| Type | Who selects | Product-type guard | Ignores Identity/DNA/VN/SM? |
|---|---|---|---|
| IMAGE | LLM + default | N/A | AI prompts may include Identity/VN; not SVG |
| CHECKLIST | LLM + analyzer eligibility | No product-type; project checklist rollout | Uses brand tokens; not DNA/VN for layout |
| STATISTIC / QUOTE | LLM + proof index | Knowledge/proof based | Brand tokens |
| PHONE | LLM + `mobileProductCapable` / mobile assets + narration pattern | **Partial** (mobile/chat/app keywords or mobile assets) | Frame hardcoded; screen can be real asset |
| CTA | LLM + CTA source-of-truth | Goal/CTA text based | Composition picker hardcoded |
| PRODUCT_DEMO | LLM must author beat; PDI requires it; ensure normalizes variant | **None** | **Yes** — full ignore of Identity/DNA/VN/SM |

---

## 6. Kompletní katalog deterministických rendererů

### 6.1 Typed scene SVG rasters (production video-worker)

| # | File | Input | Visual | Fixed layout? | Global? | Real product? | Client assets? | Fake screenshot risk? | Who activates | Guards |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `lib/scene-types/product-demo/composeProductDemoRaster.ts` | `ProductDemoBeat` | Chat / lead / booking / after-hours UI | Yes | Yes | No | No | **CRITICAL** | PRODUCT_DEMO scene | Payload schema only |
| 2 | `lib/scene-types/checklist/composeChecklistRaster.ts` | checklist payload + brand tokens | Checklist card | Yes | Yes* | No | Logo optional | LOW | CHECKLIST | Eligibility + rollout |
| 3 | `lib/scene-types/quote/composeQuoteRaster.ts` | quote payload + tokens | Quote card | Yes | Yes* | No | Logo optional | LOW | QUOTE | Proof + eligibility |
| 4 | `lib/scene-types/statistic/composeStatisticRaster.ts` | statistic payload + tokens | Big stat | Yes | Yes* | No | Logo optional | LOW | STATISTIC | Proof + eligibility |
| 5 | `lib/scene-types/cta/composeCtaRaster.ts` | CTA payload + tokens + optional hero | CTA compositions | Yes (8 IDs) | CTA-allowed | Only if hero is real screenshot | Logo/hero | MEDIUM if overlay implies product UI | CTA | CTA gates |
| 6 | `lib/scene-types/phone/composePhoneRaster.ts` | phone payload + screen image | Phone frame + caption | Frame fixed | Capability-gated | If asset is real UI | Yes (preferred) | HIGH if AI invents screen; MEDIUM with real asset | PHONE | `mobileProductCapable` / asset / narration |

### 6.2 Related deterministic compositors (not typed PRODUCT_DEMO)

| File | Role | Fake product UI risk |
|---|---|---|
| `video-worker/services/assetSceneLayout.ts` | Frames real/AI assets in phone/laptop/monitor/floating card | MEDIUM–HIGH: device chrome around content; **uses real assets when available** |
| `video-worker/services/localBrandedSceneFallback.ts` | Gradient branded fallback still (no text) | LOW |
| `component-capture-worker/lib/renderProductDemoChat.ts` | Playwright HTML chat PNG (Sprint 4C.1 parallel path) | CRITICAL same class; **not** used by `prepareProductDemoSceneRaster` (worker uses Sharp SVG). Still in repo. |
| `component-capture-worker/lib/capturePageComponents.ts` | Playwright page capture for knowledge assets | Different purpose (real page components when configured) |

### 6.3 CTA composition IDs (hardcoded)

`classic_card`, `text_only`, `logo_message`, `headline_action_line`, `minimal_statement`, `split_asset_text`, `asset_overlay`, `product_screenshot_overlay` — in `ctaComposition.ts`.

---

## 7. Hardcoded pravidla v promptech a schématech

| Rule / pattern | Where | Kind | Product origin (qualified) | Can leak to other projects? |
|---|---|---|---|---|
| Structured beat fields `visitor_question`, `ai_answer`, chat visibility flags | `productDemoBeat.ts`, PDI prompt | Schema + prompt | Chatbot execution of “universal” contract | **ANO** — schema is global |
| Outcome enums lead/booking/question/contact | schema | Enum | Lead-gen / booking chatbot | **ANO** |
| “Current production renderer executes conversational products as controlled chat UI” | `buildProductDemonstrationPromptBlock` | Prompt | Fenrik-like chat | Soft warning + opposite MUST include demo |
| “Do not fabricate chatbot demonstration for products that do not operate as conversational interfaces” | PDI prompt / repair | Prompt only | Soft anti-leak | **Not enforced in code** |
| After-hours keyword regex | `demoVariant.ts` | Heuristic | Fenrik after-hours narrative | **ANO** if beat exists |
| Fixed SVG strings “Website chat”, “booking assistant”, “11:42 PM · After hours” | `composeProductDemoRaster.ts` | Renderer | Chatbot demos | **ANO** when variant renders |
| `brand_name` default `Fenrik.chat` | schema / defaults | Default | Fenrik.chat | **ANO** if LLM omits brand_name |
| PHONE mobile/chat/app regex | `projectSignals.ts` | Heuristic gate | Mobile/SaaS/chat | Limits PHONE, **not** PRODUCT_DEMO |
| Product Reveal “phone mockup” placement copy | `resolveProductReveal.ts` | Prompt helper | Product UI assets | When assets exist |
| Asset policy Tier 1 dashboard/product_ui | `assetCoveragePolicy.ts` | Policy | SaaS screenshots | Prefers real assets |
| Divergence after-hours / chat bubble situations | `generateRawSituations.ts`, `topicSignals.ts` | Candidate seed | Chatbot-leaning | Can bias any industry cue string |
| Story Integrity bans generic analytics dashboard unless concept has it | `storyIntegrity.ts` | Soft ban | Anti-fake-dashboard | Reduces some fake UI in IMAGE path |
| Visual Narrative “not a dashboard default” | `resolveVisualNarrative.ts` | Prompt | Anti-cliché | Soft |

---

## 8. Databázový audit

### 8.1 Schema

- **No** columns named `demo_variant`, `scene_type`, `renderer_version` on core tables.
- Persistence is JSONB: `content_packages.package_brief`, `video_jobs.input` / `output` (`render_spec`, `payload_snapshot` inside scene objects).
- `projects.knowledge.presentation.allowed_scene_types` **can** override scene-type ceiling — **observed:** only `rightcard.ai` had `presentation` (`visual_profile`); **no** variant catalog; **no** product-type restriction table for demos.

### 8.2 Who configures vs stores

| Layer | Configures variants? | Stores chosen variant? |
|---|---|---|
| Code (`PRODUCT_DEMO_VARIANTS`) | **Yes** (source of truth) | — |
| DB | **No** | **Yes** (in package_brief / job JSON) |
| Project knowledge | Scene-type allowlist possible; variants **not** | — |
| Old DB values | Can reappear if package reused / language variant reuses durable raster | Do not redefine code enum |

### 8.3 Cross-project empirical sample

**Packages with structured PRODUCT_DEMO `demo_variant` (all time, visual_scenes):**

| Project | Variants seen | Notes |
|---|---|---|
| **Fenrik.chat** | `after_hours_response` (4), `lead_capture` (2) | Only project with real PRODUCT_DEMO scenes |
| All other projects | **0** structured PRODUCT_DEMO scenes | fenrik Studio, 8080.ai, unfussy, greedyinsider, parsemyapp, rightcard, Úklidy Praha, etc. |

**Last 45 days scene-type mix (packages with visual_scenes):** Fenrik.chat = 6 PRODUCT_DEMO; fenrik Studio = 0 PRODUCT_DEMO but has PHONE/CTA; several SaaS demos = IMAGE-only (+ occasional CTA).

**habitoftheday.com:** one package matched `PRODUCT_DEMO` text search without a typed scene (`visual_scenes` null) — **false-positive / unrelated string**; not a rendered demo.

**Production run item errors** containing product_demo / structured_beat in last 14 days: **none** found.

**Interpretation:** Blast radius **observed** = Fenrik.chat only. Mechanism **available** = all projects when scene types + PDI path active.

---

## 9. Cross-project analýza

| Project type (examples in DB) | Had PRODUCT_DEMO? | Variant | Why | Visual match? |
|---|---|---|---|---|
| Chatbot — Fenrik.chat | **Yes** | mostly `after_hours_response`, some `lead_capture` | LLM beat + after-hours narrative keywords / outcome mapping | Plausible for website chat product; still **not** real Fenrik UI screenshots |
| Content service — fenrik Studio | **No** (recent) | — | Packages predate or avoid structured demo path | N/A |
| SaaS analytics — greedyinsider / 8080 / baarely | **No** structured demo | — | No PRODUCT_DEMO in package_brief | N/A |
| Local service — Úklidy Praha Demo | **No** | — | Older packages; no visual_scenes PRODUCT_DEMO | N/A |
| Flashcards / habits / other apps | **No** structured demo | — | — | N/A |

**NOT VERIFIED:** whether non-Fenrik projects have run full Sprint 4C.1+ generation with `SCENE_TYPES_ENABLED=true` and hard PDI since 2026-07-19. Absence of demos may mean pipeline not exercised, soft LLM avoidance, or generation failure modes not stored as the searched error strings.

---

## 10. Riziková klasifikace

| Mechanism | Level | Reason |
|---|---|---|
| PRODUCT_DEMO all 4 variants (esp. after_hours / lead_capture / booking) | **CRITICAL** | Hardcoded fake chat/product UI; global; no product-type guard; can look like real product screenshot |
| Default `brand_name: Fenrik.chat` | **CRITICAL** | Wrong brand can appear if omitted |
| PDI hard-require structured chat-shaped beat + soft “don’t invent chatbot” | **HIGH** | Forces demo shape globally; soft guard unreliable |
| `component-capture-worker` chat HTML renderer | **CRITICAL** (dormant in video path) | Same fake-chat class; still in codebase |
| PHONE frame + AI-generated screen | **HIGH** | Device chrome + invented UI |
| PHONE + real mobile asset | **MEDIUM** | Real asset, still generic phone chrome |
| `assetSceneLayout` framed_phone/laptop | **MEDIUM** | Device mockup; prefers real assets |
| CTA `product_screenshot_overlay` | **MEDIUM** | Can look product-like; uses hero asset when present |
| CHECKLIST / QUOTE / STATISTIC / branded fallback | **LOW** | Text/decorative cards; not product screenshots |
| IMAGE model inventing chat/dashboard | **HIGH** (prompt-dependent) | Not deterministic template, but can fake UI |

---

## 11. Trace simulace pro 10 typů produktů

Rules used: current code only. Assumes `SCENE_TYPES_ENABLED=true` and video package generation with PDI.

| # | Product | Can get PRODUCT_DEMO? | Can get `after_hours_response`? | Can get chat UI? | Guard? |
|---|---|---|---|---|---|
| 1 | Chatbot | **ANO** (intended) | **ANO** if narrative matches / LRU | **ANO** | None needed; soft prompts align |
| 2 | Účetní software | **ANO** if LLM emits beat | **ANO** same | **ANO** (all variants are chat) | **Žádný hard guard** |
| 3 | CRM | **ANO** | **ANO** | **ANO** | **Žádný hard guard** |
| 4 | E-shop | **ANO** | **ANO** | **ANO** | **Žádný hard guard** |
| 5 | Úklidová firma | **ANO** | **ANO** | **ANO** | **Žádný hard guard**; empiricky zatím 0 demos |
| 6 | Restaurace | **ANO** | **ANO** | **ANO** | **Žádný hard guard** |
| 7 | Architektonické studio | **ANO** | **ANO** | **ANO** | **Žádný hard guard** |
| 8 | Rezervační systém | **ANO**; `booking_confirmation` likely | **ANO** | **ANO** | **Žádný hard guard** |
| 9 | Analytický dashboard | **ANO** | **ANO** | **ANO** (wrong form) | Soft prompt only; Story Integrity may block *IMAGE* dashboard clichés, **not** PRODUCT_DEMO |
| 10 | Fyzický produkt | **ANO** | **ANO** | **ANO** | **Žádný hard guard** |

**Shared caveats:**

- If LLM **refuses** to invent a beat, `ensureStructuredProductDemo` will **not** fabricate one → PDI fails → generation fails (`structured_beat_missing`). That is a fail-closed path, **not** a product-type guard against wrong UI.
- If LLM **does** invent a chatbot beat for a non-chat product, render path will draw chat UI and may select `after_hours_response`.

---

## 12. Jednoznačné odpovědi na 8 závěrečných otázek

### 1. Je `after_hours_response` specifický pro Fenrik.chat?

```text
NE
```

Vznikl v globálním Sprint 5.1 kódu pro vizuální variaci PRODUCT_DEMO. Komentáře/docs zmiňují Fenrik jako referenční chat execution; **není** project-bound. Empiricky zatím renderován jen na Fenrik.chat.

### 2. Může se dostat do jiných projektů?

```text
ANO
```

**Cesta:** LLM (nebo existující beat) → `ensureStructuredProductDemo` / `resolveEffectiveDemoVariant` → `demo_variant: after_hours_response` v `package_brief` → `payload_snapshot` → `composeProductDemoRaster` → `layoutAfterHoursResponse`. Stačí validní beat + after-hours narrative regex (nebo compatible LRU pick).

### 3. Existují další podobné hardcoded produktové vizuály?

```text
ANO
```

Kompletní seznam stejné třídy (deterministická falešná product/chat UI):

1. `conversation_answer`
2. `lead_capture`
3. `booking_confirmation`
4. `after_hours_response`
5. `component-capture-worker` Playwright chat HTML (`renderProductDemoChat.ts`) — parallel implementation
6. PHONE scene phone chrome (AI screen path)
7. `assetSceneLayout` device frames (when content is not a real screenshot)
8. CTA compositions that present UI-like cards / `product_screenshot_overlay` without verifying authenticity

### 4. Existují guardy proti použití na nesprávném produktu?

```text
NEDOSTATEČNÉ
```

Existují: soft prompt lines; refuse-to-fabricate-from-scratch (5.3); PHONE capability gate (does not cover PRODUCT_DEMO). **Neexistuje** hard product-type / conversational-capability guard na variant select nebo raster.

### 5. Kolik globálních typed rendererů existuje?

```text
7
```

Registered in `video-worker/services/sceneRendererRegistry.ts`: IMAGE, CHECKLIST, PHONE, QUOTE, STATISTIC, CTA, PRODUCT_DEMO.

### 6. Kolik z nich se může tvářit jako skutečné UI produktu?

```text
3
```

Strict count of typed scene renderers whose primary job can look like product UI:

1. **PRODUCT_DEMO** (always fake chat UI)  
2. **PHONE** (device UI chrome)  
3. **CTA** (especially `product_screenshot_overlay` / asset overlays)

(IMAGE can also invent UI via model — counted separately as AI path, not typed deterministic renderer.)

### 7. Jak velký je systémový rozsah problému?

```text
KRITICKÝ
```

Globální chatbot SVG šablony + PDI nátlak na structured demo + absence product-type guardů. Empirický zásah zatím omezený na Fenrik.chat.

### 8. Co přesně je zdrojem pravdy?

| Concern | Source of truth |
|---|---|
| Variant enum & layouts | **code-defined** |
| Variant pick | **heuristic-selected** (outcome + regex + LRU); explicit beat field if LLM set valid enum |
| Beat copy (Q/A/outcome) | **LLM-selected** (when authored) |
| Whether PRODUCT_DEMO allowed | **code-defined** (+ env `SCENE_TYPES_ENABLED`; optional project `allowed_scene_types`) |
| Persistence of chosen variant | **database-stored** JSON only (does not define catalog) |
| Project/Product Brain config of variants | **not present** |
| Raster pixels | **code-defined** SVG (not image model, not real product assets) |

---

## 13. Appendix — relevantní soubory, funkce, enumy, JSON pole

### Soubory

- `lib/scene-types/product-demo/demoVariant.ts`
- `lib/scene-types/product-demo/productDemoBeat.ts`
- `lib/scene-types/product-demo/composeProductDemoRaster.ts`
- `lib/scene-types/product-demo/ensureStructuredProductDemo.ts`
- `lib/scene-types/renderers/productDemoSceneRenderer.ts`
- `lib/scene-types/sceneType.ts`
- `lib/scene-types/config.ts`
- `lib/scene-types/presentation/deriveAllowedSceneTypes.ts`
- `lib/scene-types/presentation/analyzePresentation.ts`
- `lib/scene-types/presentation/projectSignals.ts`
- `lib/scene-types/presentation/renderFidelity.ts`
- `lib/scene-types/compileScenePlan.ts`
- `lib/creative-candidates/productDemonstrationIntegrity.ts`
- `lib/creative-candidates/promptBlocks.ts`
- `lib/ai/workflows/generateContentPackage.ts`
- `lib/content-package/alignProductDemoNarration.ts`
- `video-worker/services/prepareProductDemoSceneRaster.ts`
- `video-worker/services/sceneRendererRegistry.ts`
- `video-worker/services/assetSceneLayout.ts`
- `video-worker/services/localBrandedSceneFallback.ts`
- `component-capture-worker/lib/renderProductDemoChat.ts`
- `lib/scene-types/checklist|quote|statistic|cta|phone/compose*Raster.ts`
- `lib/scene-types/cta/ctaComposition.ts`
- `reports/sprint-5.1-product-demo-variation.md`
- `docs/video-production-activation.md`

### Enumy / konstanty

- `PRODUCT_DEMO_VARIANTS`
- `PRODUCT_DEMO_OUTCOME_TYPES`
- `SAFE_PRODUCT_DEMO_VARIANT`
- `SCENE_TYPES`
- `PRODUCT_DEMO_SCENE_RENDERER_VERSION = "product_demo@1"`
- `CTA_COMPOSITION_IDS`
- `PRODUCT_DEMO_NOT_FABRICATED`

### Funkce

- `narrativeSuggestsAfterHours`, `listCompatibleDemoVariants`, `selectDemoVariant`, `resolveEffectiveDemoVariant`
- `ensureStructuredProductDemo`, `completeExistingProductDemoBeat`, `buildDefaultProductDemoBeat`
- `buildProductDemoChatSvg`, `composeProductDemoRaster`, `layoutAfterHoursResponse`, …
- `validateProductDemonstrationIntegrity`, `buildProductDemonstrationPromptBlock`
- `deriveAllowedSceneTypes`, `analyzePresentation`, `prepareProductDemoSceneRaster`

### JSON pole

- `package_brief.visual_scenes[].type = "PRODUCT_DEMO"`
- `package_brief.visual_scenes[].payload.demo_variant`
- `package_brief.product_demo`
- `video_jobs.input.scenes[].payload_snapshot`
- `video_jobs.input/output.render_spec.scenes[].renderer_version`
- `projects.knowledge.presentation.allowed_scene_types` (optional ceiling)

### Git commits

- `1f3c37f` — 2026-07-19 — Sprint 4C.1 structured PRODUCT_DEMO + first chat SVG
- `64dfa7a` — 2026-07-19 — Sprint 5/5.1 variants including `after_hours_response`
- `5b1c7d1` — 2026-07-19 — Sprint 5.3 harden / no fabricate

### DB observation snapshot (audit query)

- Structured PRODUCT_DEMO with variants: **Fenrik.chat only**
- `after_hours_response` jobs: Fenrik.chat, brand_name Fenrik.chat

---

## Odpovědi na 10 hlavních otázek auditu (shrnutí)

1. **Kde se vzal?** Code enum + SVG layout, Sprint 5.1 / `64dfa7a`.  
2. **Kdy / účel?** 2026-07-19; vizuální variace Q→A→outcome dema v rámci runu.  
3. **Fenrik-only?** **NE** (kód); empiricky zatím ano.  
4. **Kde uložen?** Pouze v JSON payloadu / package_brief / job snapshot — ne v Product Brain katalogu.  
5. **Jak se vybírá?** Heuristika outcome + after-hours regex + LRU; nebo explicitní validní `demo_variant`.  
6. **Jakýkoliv projekt?** **ANO** (kód).  
7. **Guardy non-chatbot?** **NEDOSTATEČNÉ** / prakticky žádný hard guard.  
8. **Další varianty?** Ano — 3 další chat layouty.  
9. **Další non-image renderery?** Ano — checklist/quote/statistic/cta/phone + asset layout + fallback + unused Playwright chat.  
10. **Další fake-product surfaces?** Ano — viz sekce 6–7 a riziková klasifikace.

---

*End of audit. Fakta oddělena od kvalifikovaných odhadů; kde data chybí, označeno NOT VERIFIED.*
