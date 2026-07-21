# PRODUCT_DEMO Architecture Audit

**Date:** 2026-07-21  
**Scope:** Architectural audit of the PRODUCT_DEMO concept vs original philosophy  
**Constraints:** No implementation. No fixes. No redesign. Facts from code, commits, sprint docs, and prior audits.

**Related:** `reports/hardcoded-visual-templates-full-audit.md`

---

## 1. Executive Summary

**What PRODUCT_DEMO is today (implementation):**

It is a **mandatory typed scene** that proves a **semantic contract** — *input → product/service creates value → visible outcome* — by rendering a **deterministic fake conversational UI** (chat bubbles + AI answer + outcome badge). It is **not** a real-product screenshot path, **not** an Identity/DNA-aware visual, and **not** an asset compositor.

Closest accurate labels from the user’s list:

| Label | Fits? | Evidence |
|---|---|---|
| Demonstrace produktu | **Částečně (záměr)** | Sprint 4C goal: visually demonstrate the product working |
| Demonstrace hodnoty | **Ano (sémantika)** | Universal contract: “creates value” |
| Demonstrace výsledku | **Ano (povinný outcome)** | `outcome_visible` + `outcome_type` required |
| Demonstrace workflow | **Částečně** | Fixed 3-beat: ask → answer → outcome |
| Demonstrace UI | **Ano (execution)** | SVG chat layouts |
| Demonstrace konverzace | **Ano (execution)** | Fields `visitor_question` / `ai_answer` |

**Primary implementation identity:** demonstrace **konverzace / controlled chat UI** jako saturovatelný důkaz hodnoty — ne věrný vzhled produktu.

**Philosophical tension (fact):**

- **Product Reveal** explicitly forbids fake UI and allows `NO_PRODUCT_VISUAL`.
- **PRODUCT_DEMO / PDI** hard-requires a structured chat-shaped beat and renders fake chat UI.
- These two subsystems coexist and contradict on “fake UI” and “must show product interface.”

**Architecture verdict (preview):** PRODUCT_DEMO is **not** a universal product-demonstration layer. It is a **historical, Fenrik-chat-shaped solution** to a production failure (VO claimed product; visuals did not show ask→answer→result), later generalized in *wording* (Sprint 5.3) without generalizing the *renderer*.

---

## 2. Hlavní otázka — co má PRODUCT_DEMO představovat?

### Odpověď doložená implementací

**Oficiální sémantika (komentáře / PDI prompt / Sprint 5.3):**

```text
input (initial state) → product/service creates value → visible outcome
```

Zdroje:

- `lib/scene-types/product-demo/productDemoBeat.ts` (header comments)
- `lib/creative-candidates/productDemonstrationIntegrity.ts` → `buildProductDemonstrationPromptBlock`
- `reports/sprint-5.3-production-reliability-universal-product-demo.md` §5

**Skutečná execution forma:**

```ts
visitor_question + ai_answer + outcome_type/label
→ composeProductDemoRaster → chat SVG → PNG
```

Zdroje:

- `productDemoBeatSchema` (`visitor_question`, `ai_answer`, …)
- `composeProductDemoRaster.ts` (“Deterministic Fenrik product-demo chat stills”)
- `prepareProductDemoSceneRaster.ts` (“deterministic Fenrik chat UI (no image model)”)

**Shrnutí jednou větou:**

> PRODUCT_DEMO má představovat **vizuální důkaz, že produkt něco vyřešil** (hodnota + výsledek), ale **provádí to výhradně jako demonstraci konverzace ve falešném chat UI**.

Není to vrstva „ukaž skutečný produkt“. Je to vrstva „ukaž saturovatelný ask→answer→outcome proof“.

---

## 3. Historie vzniku PRODUCT_DEMO

### 3.1 Timeline (git + sprint docs)

| When | Commit / doc | What happened |
|---|---|---|
| Pre-4C | Audits e.g. `9d9fa60b` | Videos narrate Fenrik; visuals fail to show product working (lifestyle, blank screens, smile/floating icon “resolutions”) |
| 2026-07-19 `8f43cdb` | Sprint **4C** | Hard gate: visual **Question → AI answer → Outcome**; ban smile/floating-icon/landing-page; prose regex on IMAGE prompts |
| Same day (regression) | `reports/regression-audit-sprint-4c.md` | Gate unsatisfiable → mass `generation_failed` |
| 2026-07-19 `1f3c37f` | Sprint **4C.1** | **Typed scene PRODUCT_DEMO** + structured beat + deterministic chat SVG (satisfiable) |
| 2026-07-19 `64dfa7a` | Sprint **5 / 5.1** | Render fidelity (never drop to IMAGE) + 4 layout variants |
| 2026-07-19 `5b1c7d1` | Sprint **5.3** | “Universal” semantic wording; **stop fabricating** Fenrik beats from scratch; chat renderer unchanged |

### 3.2 Jaký problém řešil?

Z `reports/sprint-4c-product-demonstration.md`:

> Finished videos describe Fenrik in voiceover but do not visually demonstrate it.

Konkrétní selhání:

- IMAGE prompts → lifestyle / blank UI (readable UI forbidden elsewhere)
- Validators false-PASS on “No reply bubble” / narration-only “lead”
- Smile + floating icon as fake resolution

### 3.3 Co měl nahradit?

| Before | After 4C.1 |
|---|---|
| Hope that AI IMAGE stills show ask→answer→result | One **structured** PRODUCT_DEMO scene whose pixels are **guaranteed** by code |
| Prose regex on image prompts as proof | Structured beat as source of truth |
| Unreliable LLM repair | Deterministic ensure/normalize of an existing beat (+ earlier force-inject; later no-fabricate) |

### 3.4 Původní vize

**4C vize:** Vizualizovat **interakci** (visitor asks → product answers → result), ne nutně pixel-perfect Fenrik screenshot.

**4C.1 vize:** Udělat to **saturovatelné** — controlled chat UI, “not AI lifestyle art”, “readable chat is intentional”.

**5.3 vize (wording only):** Stejný sémantický kontrakt pro všechny produkty; chat field names = “current chat execution”; **do not invent chatbot demos for unrelated products** — but **no alternate renderer** was added.

### 3.5 Bylo cílem zobrazovat skutečný produkt?

| Claim | Verdict | Evidence |
|---|---|---|
| Show real Fenrik product screenshots | **NE** | 4C.1: “branded generic Fenrik chat; no customer URL scrape”; Sharp SVG, not product capture |
| Illustrate the principle of product working | **ANO** | ask → answer → outcome contract |
| Universal product UI fidelity | **NE** (claimed later in comments only) | Renderer still chat-only |

**Qualified:** Original target product in the motivating audit was Fenrik.chat. The mechanism was built around that interaction shape.

---

## 4. Současná role v pipeline

### 4.1 Kdo PRODUCT_DEMO vytváří

| Actor | Role |
|---|---|
| LLM (package generation) | Authors `visual_scenes` entry with `type: PRODUCT_DEMO` + beat (or fails to) |
| `ensureStructuredProductDemo` | Completes/places **existing** beat; assigns `demo_variant`; **does not invent** from scratch (5.3) |
| `buildDefaultProductDemoBeat` | Fixtures / explicit defaults (Fenrik-shaped) — not production invent path |
| PDI prompt | Soft-forces LLM to include structured demo |

### 4.2 Kdo jej používá

| Consumer | Use |
|---|---|
| Story Integrity | Structured beat ⇒ `productDemonstration.present = true` |
| Product Demonstration Integrity | Hard validation of beat + PRODUCT_DEMO scene + renderable SVG |
| Presentation Analyzer | Keep type; fail-closed (no IMAGE downgrade) |
| `compileScenePlan` | Always compilable → `payload_snapshot` + `product_demo@1` |
| Video worker | `prepareProductDemoSceneRaster` → SVG PNG |
| Language variants | Must preserve PRODUCT_DEMO / durable raster |
| Narration aligner | `alignProductDemoNarration` syncs VO with demo |

### 4.3 Kdo na něm závisí (dependency mapa)

```text
                    ┌─────────────────────────────┐
                    │  Sprint 4C problem statement │
                    │  (visual ask→answer→result) │
                    └──────────────┬──────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌─────────────────┐    ┌────────────────────┐    ┌──────────────────────┐
│ Story Integrity │    │ PDI hard gate      │    │ Prompt blocks (PDI,  │
│ product_demo_*  │    │ structured beat    │    │ Product Reveal note) │
└────────┬────────┘    └─────────┬──────────┘    └──────────────────────┘
         │                       │
         │         ┌─────────────┴──────────────┐
         │         ▼                            ▼
         │  ┌──────────────────┐    ┌─────────────────────────┐
         │  │ PRODUCT_DEMO     │◄───│ ensureStructured…       │
         │  │ typed scene+beat │    │ (complete, not invent)  │
         │  └────────┬─────────┘    └─────────────────────────┘
         │           │
         │           ▼
         │  ┌──────────────────┐
         │  │ Render Fidelity  │  never drop → IMAGE
         │  │ Analyzer/compile │
         │  └────────┬─────────┘
         │           ▼
         │  ┌──────────────────┐
         └──│ Chat SVG raster  │  composeProductDemoRaster
            └──────────────────┘

Parallel (orthogonal, often conflicting guidance):
  Product Reveal ──► REAL_ASSET / FRAMED_ASSET / OUTCOME / NO_PRODUCT_VISUAL
  Asset pipeline ──► IMAGE scenes + assetSceneLayout (real screenshots)
```

**Does NOT depend on PRODUCT_DEMO:** Creative Identity, Creative DNA (except actor label in PDI prompt), Visual Narrative layout, Visual Profile colors in demo raster, asset Tier-1 screenshots.

### 4.4 Prefer vs require

| Component | Require PRODUCT_DEMO typed scene? | Prefer / soft? |
|---|---|---|
| PDI `validateProductDemonstrationIntegrity` | **Require** structured beat + PRODUCT_DEMO scene | — |
| Story Integrity | Require *demonstration present*; structured beat auto-satisfies; prose regex is fallback | Soft secondary |
| `deriveAllowedSceneTypes` | Always **allows** PRODUCT_DEMO when scene types on | — |
| Product Reveal | Mentions PRODUCT_DEMO placement only | Soft; separate strategies |
| Asset coverage | Independent | Soft “should use Tier 1–2” |
| CTA / CHECKLIST / PHONE | Independent | — |

---

## 5. Je PRODUCT_DEMO povinný?

### 5.1 Může vzniknout “kvalitní” video bez PRODUCT_DEMO?

**Pod aktuálním generation workflow (`generateContentPackage` / `regenerateContentPackage`) s PDI zapojeným: NE — package generation fail-closed.**

Důkaz:

1. `validateProductDemonstrationIntegrity` bez beatu → `structured_beat_missing`
2. Po jednom `ensureDemo(true)` (stále neumí inventovat) → stále fail → `return { ok: false, error: "generation_failed", … }`
3. n8n / production run: Start Video only when package ok; item settled failed

**Historicky / mimo tuto větev:** Video joby před 4C.1 a některé non-Fenrik packages v DB **nemají** PRODUCT_DEMO a přesto mají completed video_jobs — vznikly před hard gate nebo mimo plný PDI path.

### 5.2 Co přesně selže

| Gate | Without PRODUCT_DEMO / structured beat | Behavior |
|---|---|---|
| PDI | `structured_beat_missing` (+ possibly `product_demo_scene_missing`) | **Hard fail** generation |
| Story Integrity | `product_demonstration_missing` unless prose IMAGE prompts match ASK/ANSWER/RESULT regex | **Hard fail** (SI) — in practice prose path rarely passes (4C regression) |
| Presentation Analyzer | N/A if scene absent | — |
| Render Fidelity | N/A | Only if planned then lost |
| Compile | N/A | — |
| Worker | N/A | Renders other types |

### 5.3 Fail-closed vs soft

| Behavior | Evidence |
|---|---|
| Fail-closed generation | PDI + SI hard violations → `generation_failed` |
| Fail-closed render if planned | `RenderProductDemoFailedError` / `render_product_demo_failed` if PRODUCT_DEMO downgraded or invalid |
| Soft only | CTA spoken alignment; some progression diagnostics |
| Does **not** silently drop one scene | Cap logic prefers dropping IMAGE over PRODUCT_DEMO |

### 5.4 “Jen ztratí jednu scénu?”

**NE** v generation: absence = failed package, not a 4-scene video.  
**ANO** pouze jako hypotetická editace mimo pipeline — pipeline to nepřipustí.

---

## 6. Alternativy, které systém už umí

*(Analýza existujících schopností — ne návrhy.)*

| Mechanism | When used | Real product? | Uses asset? | Universal? | Architectural substitute for PRODUCT_DEMO’s *semantic* role? |
|---|---|---|---|---|---|
| **IMAGE** (AI) | Default scene type | Only if prompt/asset depicts it | Optional | Yes | Can show value/outcome visually; **cannot** currently satisfy PDI without structured beat |
| **PHONE** | Mobile-capable projects + narration | If screen = real asset | Yes (preferred) | Conditional | Shows device UI; not ask→answer→outcome contract |
| **CTA** | CTA-permitted packages | Logo/hero optional | Yes optional | Partial | End card, not demonstration |
| **CHECKLIST / QUOTE / STATISTIC** | Proof/eligibility | No | Logo | Partial | Text cards; not product demo |
| **Asset on IMAGE** (`assetSceneLayout`) | `video_usage` framed_* / ui_hero / floating_card | **Yes** if Tier-1 screenshot | **Yes** | When assets exist | Best fidelity path for “show real product”; **does not** satisfy PDI beat requirement |
| **Product Reveal strategies** | Prompt guidance for solution beats | Depends | Depends | Yes (includes NO_PRODUCT_VISUAL) | Philosophical alternative to fake UI; **orthogonal** to PDI hard gate |
| **Branded fallback** | Moderation last resort | Brand colors only | No | Yes | Decorative; not demo |
| **Component-capture** (page) | Knowledge ingest path | Real page components when configured | Capture | Separate | Not wired as PRODUCT_DEMO substitute in video worker |
| **Playwright chat** (`renderProductDemoChat`) | component-capture-worker | Fake chat | No | Same class as SVG | Duplicate of PRODUCT_DEMO execution, not alternative |

**Závěr části 6:** Systém **už má** infrastrukturu pro věrné zobrazení produktu (Tier-1 assets + framed layouts + Product Reveal REAL/FRAMED_ASSET). Ta infrastruktura **není** napojená jako náhrada za PDI/PRODUCT_DEMO hard requirement.

---

## 7. Asset pipeline

### 7.1 Typy / role

| Concept | How represented |
|---|---|
| Screenshot / dashboard / homepage / pricing | `product_role`: `product_ui`, `dashboard`, `homepage_screenshot`, `pricing_screenshot` → **Tier 1** |
| Hero | `hero_image` → Tier 2 |
| Logo | `logo` → Tier 3 |
| Phone / monitor / browser framing | `video_usage`: `framed_phone`, `framed_laptop`, `framed_monitor`, `framed_screen`, `ui_hero`, `floating_card`, … |
| Static vs editable | `asset_class` + modify path in `assetRendererEligibility` |

### 7.2 Cesta do videa

```text
assets table (+ metadata)
  → AssetRef in package generation prompts / asset_usage
  → IMAGE (or PHONE) worker scene with image_bucket/path + video_usage
  → prepareImageSceneRaster
       → if shouldComposeAssetLayout(video_usage):
            writeComposedAssetSceneFile (assetSceneLayout)
       → else AI generate / reuse fullscreen
```

PHONE: `composePhoneRaster` composites screen image into phone chrome.

PRODUCT_DEMO: **does not read assets**.

### 7.3 Mohou assety nahradit PRODUCT_DEMO dnes?

| Question | Answer |
|---|---|
| Existuje infrastruktura zobrazit skutečný UI? | **ANO** |
| Splní to PDI `structured_beat_missing`? | **NE** |
| Splní to SI bez beatu? | Jen pokud IMAGE prose matchne regex (spolehlivost historicky nízká) |
| Je PRODUCT_DEMO napojen na Tier-1? | **NE** |

**Needed infrastructure for fidelity exists. Needed coupling to the demonstration gate does not.**

---

## 8. Porovnání fidelity

| Varianta | Odpovídá skutečnému produktu? | Riziko zkreslení |
|---|---|---|
| Současný PRODUCT_DEMO (4 SVG layouty) | **Ne** (generic chat chrome; default brand Fenrik.chat) | **Kritické** — vypadá jako product screenshot |
| PHONE + real mobile asset | **Ano** (asset content) | Střední — generic phone bezel |
| PHONE + AI screen | **Ne** | Vysoké — invented UI in device |
| IMAGE (AI, no asset) | Obvykle ne | Vysoké (fake UI) / střední (lifestyle) |
| IMAGE + Tier-1 screenshot + assetSceneLayout | **Ano** (pixel content) | Nízké–střední (device frame only) |
| CTA overlay / product_screenshot_overlay | Ano pokud hero = real | Střední |
| Branded fallback | Ne | Nízké (dekorace, ne UI claim) |
| Product Reveal ABSTRACT / OUTCOME / NO_PRODUCT_VISUAL | N/A (záměrně ne UI) | Nízké vůči fake-product claim |

---

## 9. Kdy je lepší produkt nezobrazit — A vs B

**Otázka:** Architektonicky správnější A) neukázat produkt, nebo B) ukázat generický fake UI?

### Co říká implementace (ne názor)

| Subsystem | Stance |
|---|---|
| **Product Reveal** | Explicit: “No fake UI”; `NO_PRODUCT_VISUAL` is valid; prefer high-quality AI outcome over poor/fake interface; never invent readable product interfaces |
| **Asset policy** | Prefer real Tier-1 when it fits; do not force asset only because it exists |
| **Story Integrity / PDI (semantic)** | Require demonstration of **value creation**, not “show chrome” — but structured path **equals** chat UI |
| **PRODUCT_DEMO renderer** | Chooses **B** whenever a beat exists |
| **PDI hard gate** | Effectively forbids “no demonstration proof”; after 5.3 forbids inventing beat — tension: may fail closed rather than choose A |

**Implementation-backed conclusion:**

> Older Product Reveal / asset architecture treats **A (or abstract/outcome without fake UI)** as acceptable.  
> PRODUCT_DEMO / PDI treats **absence of structured chat proof** as unacceptable.  
> When those conflict, **generation prefers failing or fake chat (B) over “valid package with no PRODUCT_DEMO” (A)**.

So: **Product Reveal answers A; PRODUCT_DEMO answers B.** They are not reconciled in code.

---

## 10. Chování bez assetů

Pokud projekt nemá screenshot / dashboard / UI / phone asset:

| Path | What happens |
|---|---|
| Product Reveal | `no_tier13_asset` → `ABSTRACT_PRODUCT_SYSTEM` / `PRODUCT_OUTCOME` / `NO_PRODUCT_VISUAL` |
| Asset coverage prompts | Soft; may avoid forcing assets |
| IMAGE scenes | AI generation continues |
| PHONE | Blocked if no `mobileProductCapable` and no mobile assets (for AI phone screen) |
| PRODUCT_DEMO | **Still required by PDI** if generation runs modern path — **independent of assets** |
| Branded fallback | Only moderation/last-resort IMAGE path |
| Hard error solely for missing assets? | **Not** for PRODUCT_DEMO; package can fail for **missing structured beat**, not for missing screenshots |

**Fact:** Missing real product assets does **not** disable PRODUCT_DEMO. It increases likelihood that the only “proof” available to satisfy PDI is fake chat UI (if LLM authors a beat) or generation failure (if not).

---

## 11. Budoucí rozšiřitelnost (analýza, bez návrhu)

Je současný PRODUCT_DEMO navržen, aby zvládl:

| Product form | Capable as designed? | Why (implementation) |
|---|---|---|
| Chatbot | **Ano** | Native execution form |
| CRM | **Ne** | No CRM board/card renderer; fields are chat Q&A |
| ERP | **Ne** | Same |
| Dashboard | **Ne** | Chat SVG only; Product Reveal even bans fake dashboards in IMAGE guidance |
| E-shop | **Ne** | No catalog/cart layout |
| Lokální služba | **Ne** as fidelity | Could misuse chat “booking” outcomes; still fake chat |
| Fyzický produkt | **Ne** | No physical product path |
| AI agent | **Částečně** | Only if agent = conversational chat |
| Mobilní aplikace | **Ne** as real app | Phone chrome exists on PHONE/asset paths, not PRODUCT_DEMO variants (except conversation_answer phone frame with fake chat) |
| Desktop aplikace | **Ne** | lead/booking panels are generic, not app chrome |

Sprint 5.3 “universal” renamed the **contract**, not the **capability surface**.

---

## 12. Analýza chování bez PRODUCT_DEMO (souhrn)

| Layer | If PRODUCT_DEMO removed from a package today |
|---|---|
| Generation | PDI fail → no package / item failed |
| SI | Fail unless prose demo detection passes |
| Video render of IMAGE/PHONE/CTA | Would still work if job existed |
| Asset framed inserts | Unaffected |
| Product Reveal | Unaffected |
| Language-variant PRODUCT_DEMO rules | N/A |

| If PRODUCT_DEMO **concept** removed from codebase | Survives | Breaks |
|---|---|---|
| IMAGE / asset / PHONE / CTA / checklist rasters | Survive | — |
| Product Reveal / Visual Narrative / Identity | Survive | — |
| PDI / SI structured-beat branches / ensure / composeProductDemo / render fidelity PRODUCT_DEMO rules | — | Break / need rewrite |
| Current Fenrik packages relying on chat proof | — | Lose satisfiable demo path |

---

## 13. Architektonický závěr — jednoznačné odpovědi

### Je současný PRODUCT_DEMO univerzální?

```text
NE
```

Universal **wording** (5.3); chat-only **execution**.

### Je navržen primárně pro chatbot?

```text
ANO
```

Schema fields, SVG layouts, Fenrik defaults, 4C motivating audit, renderer comments.

### Je zobrazovaný produkt věrný skutečnému produktu?

```text
NE
```

### Má systém dnes lepší alternativy než fake chat UI?

```text
ANO — pro věrnost produktu (Tier-1 assets + assetSceneLayout + Product Reveal REAL/FRAMED/OUTCOME).
NE — jako náhrada splňující současný PDI hard gate.
```

### Je architektonicky přijatelné produkt raději nezobrazit než zobrazit falešný UI?

```text
ANO podle Product Reveal / asset policy.
NE podle PRODUCT_DEMO/PDI enforcement (absence of structured chat proof fails generation).
```

Konflikt je v kódu; audit ho neřeší.

### Je PRODUCT_DEMO samostatná architektonická vrstva, nebo historické řešení?

```text
Historické řešení jednoho problému (nesaturovatelný visual ask→answer→result u Fenrik),
později povýšené na povinnou generickou “vrstvu” bez univerzálního rendereru.
```

Není peer k Product Reveal / Asset pipeline; je to **satisfiability shim** s hard-gate statusem.

### Pokud by PRODUCT_DEMO úplně zmizel?

| Přestalo by fungovat (bez náhrady gate) | Fungovalo by dál |
|---|---|
| PDI as written; SI structured path; ensure/compose/prepare PRODUCT_DEMO; render_fidelity PRODUCT_DEMO rules; Fenrik packages’ current proof scene | IMAGE AI; assets; PHONE; CTA; checklist/quote/statistic; Product Reveal; Identity/DNA/VN; branded fallback |

Generation of “valid” packages under today’s validators would fail until PDI/SI contracts changed — that is a dependency fact, not a recommendation.

---

## 14. Appendix — klíčové důkazy

### Commits

- `8f43cdb` — Sprint 4C PDI (prose/semantic hard gate)
- `1f3c37f` — Sprint 4C.1 structured PRODUCT_DEMO + chat raster
- `64dfa7a` — Sprint 5/5.1 fidelity + variants
- `5b1c7d1` — Sprint 5.3 universal wording + no fabricate

### Docs

- `reports/sprint-4c-product-demonstration.md`
- `reports/sprint-4c1-satisfiable-product-demonstration.md`
- `reports/sprint-5.3-production-reliability-universal-product-demo.md`
- `reports/regression-audit-sprint-4c.md`
- `reports/hardcoded-visual-templates-full-audit.md`

### Code anchors

- Schema: `lib/scene-types/product-demo/productDemoBeat.ts`
- Raster: `lib/scene-types/product-demo/composeProductDemoRaster.ts`
- Ensure: `lib/scene-types/product-demo/ensureStructuredProductDemo.ts`
- PDI: `lib/creative-candidates/productDemonstrationIntegrity.ts`
- SI: `lib/creative-candidates/storyIntegrity.ts` (`detectProductDemonstration`)
- Reveal: `lib/product-reveal/promptBlocks.ts`, `resolveProductReveal.ts`
- Assets: `lib/assets/assetCoveragePolicy.ts`, `video-worker/services/assetSceneLayout.ts`
- Workflow: `lib/ai/workflows/generateContentPackage.ts` (ensure + PDI hard fail)

---

*End of architecture audit. No fixes proposed.*
