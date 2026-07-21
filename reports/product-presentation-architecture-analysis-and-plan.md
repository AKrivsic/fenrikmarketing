# Product Presentation Pipeline — Architecture Analysis & Implementation Plan

**Date:** 2026-07-21  
**Status:** Analysis + plan only — no implementation  
**Ground truth:** current codebase (not assumed pipeline order)  
**Prior approved design:** `reports/universal-product-presentation-architecture.md` (PPD)  
**Related:** `reports/product-demo-to-ppd-migration-plan.md`, product-demo / hardcoded-visual audits

---

## 0. Executive Summary

Systém dnes **smíchává tři věci**:

1. **Marketingovou strategii** (Weekly Strategy / Production Strategy) — téma, funnel, topic/angle.  
2. **Kreativní spine** (Candidates → DNA → Narrative Beats → Hook/Fidelity → Story) — kvalita příběhu.  
3. **Produktovou prezentaci** (Product Reveal + Asset coverage + PRODUCT_DEMO hard gate + asset layouts) — jak/zda ukázat produkt.

**PRODUCT_DEMO není univerzální prezentace produktu.** Je to historický saturovatelný chat proof, který dnes **hard-failuje video packages**, i když Product Reveal výslovně dovoluje `NO_PRODUCT_VISUAL` a Asset Library umí autentické surfaces.

**Doporučený směr (bez redesignu kreativního spine):**

- Zachovat kreativitu, strategii, VO, tempo.  
- Izolovat změny do **produktové prezentace + validací, které ji vynucují**.  
- Zavést / dokončit **Product Presentation Decision (PPD)** pod stropem Product Reveal.  
- Odstranit povinný fake chat / PRODUCT_DEMO.  
- Asset Analysis **rozšířit** (ne přestavět) — většina metadat už existuje.  
- **Weekly Strategy nemá** znát inventář assetů jako rozhodovací jádro; inventář patří do package-time vrstvy (dnes coverage + Reveal; nově PPD).

---

## 1. Opravy předpokladů (důležité)

Následující předpoklady z diskusí **neodpovídají implementaci**. Neopravujeme je potichu — níže je skutečný stav.

| Předpoklad | Skutečnost | Evidence |
|---|---|---|
| Pipeline pořadí „Brain → Story → VN → Assets → ??? → Scenes“ je přesný popis dneška | **Částečně ne.** Assets se načítají **před** Creative Candidates; Product Reveal běží **až po** Visual Narrative; PRODUCT_DEMO ensure až **po** LLM | `generateContentPackage.ts` |
| Weekly Strategy má (nebo musí) znát assety | **Nezná.** Nenačítá `assets` | `weeklyStrategy.ts`, `loadStrategyPlanningContext.ts` |
| Strategy plánuje, která videa ukážou screenshot | **Ne.** Plán = theme + funnel + topic/angle | `weeklyStrategy` schema |
| Asset inventář se řeší při založení projektu | Inventář **vzniká** při onboarding ingest/upload; **rozhodnutí o použití** je při package generation | `extractKnowledge` → `ingestWebsiteVisualsBestEffort`; `resolvePackageAssetCoverage` |
| Assets se re-analyzují při každém videu | **Ne.** Analysis/smart usage při ingest/upload; generation jen čte metadata | `analyzeAsset.ts` vs `loadAvailableAssets` |
| `packagesWithAssetSupport` nutí assety v generation | **Ne.** Pole existuje, generation coverage ho nepoužívá | `productionRun.ts` comment + unused in gen path |
| Každé video musí ukazovat produkt (screenshot) | **Ne** (Reveal/coverage). Ale každé **video s candidates** dnes musí mít **structured PRODUCT_DEMO beat** (chat proof) | PDI + SI vs Product Reveal |
| Fake dashboard je samostatný typed renderer jako PRODUCT_DEMO | **Ne.** Fake UI je zakázán v Product Reveal promptu / penalizován scoringem; PRODUCT_DEMO je jediný deterministický fake-product typed renderer | Reveal prompt; `composeProductDemoRaster` |

---

## 2. Analýza současné architektury — dvě (ve skutečnosti tři) pipeline

### 2.1 Pipeline A — Project creation / library bootstrap (jednorázová / on-demand)

```text
createProjectOnboarding
  → createProjectForAdmin (projects row + brain defaults)
  → emptyKnowledge + runProjectKnowledgeExtraction
       → fetch URL text → AI knowledge cards → persist projects.knowledge
       → ingestWebsiteVisualsBestEffort (best-effort)
            → HTML image candidates
            → optional component_capture fallback
            → upload into assets + metadata
            → analyzeUploadedAsset / refine after vision
  → redirect Approve Cards / Project Brain edit
  → anytime: manual uploadAsset → analyzeUploadedAsset
  → anytime: refetch website visuals / edit metadata
```

| Vlastnost | |
|---|---|
| Frekvence | Onboarding + refetch + upload |
| Výstup | Product Brain knowledge, Asset Library rows |
| Neobsahuje | Weekly plan, video, PRODUCT_DEMO, Creative Candidates |

### 2.2 Pipeline B — Strategy planning (kalendář / production run)

**B1 — Weekly Strategy**

```text
runWeeklyStrategy
  → ensureScenarioPool
  → project + trends + evergreen + anti-repetition memory
  → Claude weekly plan
  → content_strategies + content_strategy_items
       (funnel_stage, topic, angle — NO visuals/assets)
```

**B2 — Production Run Strategy**

```text
startProductionRun
  → planContentStrategy (or legacy seed)
  → same planning context family (no assets)
  → strategy items tagged production_run
  → then n8n generates N packages
```

| Vlastnost | |
|---|---|
| Frekvence | Per week / per run |
| Zná assety? | **Ne** |
| Účel | Marketingový obsahový plán (Awareness → Conversion) |

### 2.3 Pipeline C — Content package / video generation (opakovaná)

**Skutečné pořadí v `generateContentPackage.ts`:**

```text
Idempotence
→ load project + strategy item
→ loadAvailableAssets + recent asset usage          ← ASSETS HERE
→ memory / scene history / series creative
→ recent PRODUCT_DEMO variants (run only)
→ platforms / requireVideo
→ creative directives + visual profile
→ asset coverage (stance/slots) + prompt presentation types
→ Creative Candidates (+ Judge)                     ← STABLE SPINE
→ Narrative Beats
→ Creative Identity
→ Visual Narrative
→ Visual Medium
→ Product Reveal (uses assets + narrative)          ← REVEAL CEILING
→ Attention
→ LLM Presentation Generation
→ Hook enforce + Concept Fidelity
→ ensureStructuredProductDemo                       ← FAKE CHAT PATH
→ Story Integrity (requires demo present)
→ Product Demonstration Integrity (hard)
→ normalize / persist package + video job
→ worker render (IMAGE/PHONE/CTA/… or PRODUCT_DEMO SVG)
```

### 2.4 One-time vs per-generation

| Work | Cadence |
|---|---|
| Knowledge extract + website visual ingest | Onboarding / refetch |
| Vision analysis + smart usage + quality + role | Ingest / upload |
| Weekly / production strategy | Per plan |
| Load assets + coverage + Reveal + PDI/PRODUCT_DEMO | **Every** package generate |
| Creative Candidates → VO → video | Every package |

---

## 3. Současná práce s Asset Library

### 3.1 Zdroje

| Source | `metadata.source` | Kvalita (typicky) |
|---|---|---|
| Website scrape | `website_ingestion` | Proměnlivá; často medium/low |
| Component capture fallback | `component_capture` | Speciální UI capture |
| Client / admin upload | `upload` / missing → manual | Obvykle vyšší; role může být locked |

### 3.2 Metadata, která už existují (jsonb)

| Oblast | Fields / modules |
|---|---|
| Role | `product_role`, `product_role_locked` (`productRole.ts`) |
| Quality | `asset_quality` high/medium/low (`assetIngestMetadata.ts`) |
| Analysis | `ai_description`, `detected_content_type`, `suggested_usage`, `trust_signal`, `analysis_status` |
| Smart usage | `preferred_presentation`, `video_suitability`, `orientation`, `visual_importance`, `safe_vertical_usage` |
| Render hint | `preferred_video_usage` |
| Provenance | `source`, `ingest_kind`, `source_url`, `ingest_priority`, `content_hash` |
| Class | `asset_class` static/editable/reference |
| Coverage tiers | derived: Tier 1 UI/dashboard/homepage/pricing; Tier 2 hero; Tier 3 logo |

### 3.3 Co chybí / je slabé pro PPD

Architektura Asset Analysis **nemusí vznikat od nuly**. Chybí spíš sjednocení pro rozhodování:

| Gap | Proč vadí |
|---|---|
| Explicitní `authenticity` / trust of surface | Scraped vs client není first-class decision signal (jen `source`) |
| `presentation_eligibility` relative to PPD classes | Smart usage existuje, ale není napojené na „AUTHENTIC claim allowed“ |
| Inventory summary for series | Coverage slots existují (~30%), ale není „máme jen 1 pricing shot“ jako hard inventory constraint |
| Clear demotion of low-quality scraped UI | Quality tier exists; PPD should prefer client high-quality over scraped low |

### 3.4 Doporučení k Asset Analysis (architektura, ne algoritmus)

**Rozšířit stávající ingest/analysis vrstvu**, ne nový paralelní systém.

Logické rozšíření metadat (stále jsonb / derived views):

- `provenance_class`: scraped | client_upload | component_capture  
- `authenticity_for_product_claim`: eligible | weak | ineligible  
- `recommended_presentation_classes`: subset of PPD classes  
- `inventory_scarcity` hints (derived at load time, not stored): count of Tier-1 by role  

Analýza zůstává **library-time** (ingest/upload/edit). Generation jen čte.

---

## 4. Weekly Strategy a assety — doporučení

### Otázka

Má Weekly Strategy znát dostupnost assetů (např. jeden pricing screenshot ⇒ neplánovat 10 pricing videí)?

### Analýza

| Argument pro „ano“ | Argument proti |
|---|---|
| Strategie by neměla slibovat vizuály, které library nemá | Strategy dnes záměrně řeší **marketing** (funnel/topic), ne vizuály |
| | Package-time už má `resolvePackageAssetCoverage` (~30% slots, stance by funnel, preferred roles) + recent asset usage anti-repeat |
| | Product Reveal už dovoluje `NO_PRODUCT_VISUAL` |
| | Strkat inventář do Weekly Strategy míchá Pipeline B a C a zvyšuje riziko regrese strategického LLM |

### Doporučení (evidence-based)

**Ne — Weekly Strategy by neměla vlastnit inventář assetů ani rozhodovat o product appearance.**

| Layer | Responsibility |
|---|---|
| Weekly / Production Strategy | Theme, funnel mix, topics, angles — **marketing** |
| Package generation: coverage + **PPD** | Whether/how to show product given **this** item’s funnel + library |
| Series coverage | Spread authentic asset use across a run without requiring strategy to name screenshots |

**Optional Phase 2 (not required for PPD MVP):** soft `Asset Inventory Brief` only for **production_run** planner (not calendar weekly), as a diversity hint — never as a product-type switch and never as a substitute for PPD.

Tím se řeší pricing-screenshot příklad **bez** přestavby Weekly Strategy: scarcity se uplatní při PPD + coverage (preferovat jiné surfaces / NO_PRODUCT / outcome), ne při plánování témat.

---

## 5. Návrh nové architektury (produktová prezentace)

### 5.1 Pojmenování

| Name | Role |
|---|---|
| **Product Presentation Decision (PPD)** | Schválená rozhodovací vrstva (zachovat) |
| **Product Presentation Capabilities** | Capability catalog vstup do PPD (co pipeline umí věrně doručit) |
| **Product Reveal** | Zachovat jako **strategický strop** |
| **Asset Library + Analysis** | Zachovat / mírně rozšířit metadata |
| **PRODUCT_DEMO** | Odstranit z cílové architektury jako povinný koncept |

PPD **nenahrazuje** marketingovou strategii ani Creative Candidates.

### 5.2 Cílové umístění (opravené vůči skutečnému pořadí)

```text
[Pipeline A] Library bootstrap (unchanged role)
[Pipeline B] Strategy (unchanged role — no assets required)

[Pipeline C] Package generation
  load assets + coverage
  Creative Candidates … Visual Narrative … Visual Medium   ← DO NOT DESTABILIZE
  Product Reveal                                           ← KEEP
  ★ Product Presentation Decision (PPD)                    ← ADD / WIRE
  Attention + LLM package
  Validations: Value Proof + Appearance Claim (replace PDI chat gate)
  Scene planning / compile / existing renderers
  video
```

PPD sedí **hned za Product Reveal** (strop) a **před LLM scene planning**, s tím že LLM i validátory musí PPD respektovat.

### 5.3 Odpovědnosti PPD (beze změny schválené filozofie)

Rozhoduje pouze:

- zda zobrazit product appearance  
- presentation class (AUTHENTIC surface / in-context / outcome / abstract / brand-only / none)  
- asset bindings  
- appearance claim  
- value proof mode  
- forbidden forms (synthetic UI, fake chat, fake dashboard, logo-as-demo, …)  
- rationale  

Nerozhoduje: hook, DNA, VO text, weekly topics, renderer pixels.

### 5.4 Dva kontrakty (schválené)

1. **Value Proof** — srozumitelná hodnota/důsledek *když to strategie/funnel vyžaduje*; ne nutně UI.  
2. **Appearance Claim** — AUTHENTIC jen s ověřeným assetem; jinak NON_PRODUCT / NONE. **Nikdy synthetic product UI.**

### 5.5 Mapování staré → nové

| Staré | Nové |
|---|---|
| PRODUCT_DEMO typed scene + chat SVG | Remove; authentic asset scenes if bound |
| PDI structured chat beat | Value Proof + Appearance Claim validators |
| SI `product_demonstration_missing` tied to chat | Funnel-aware value proof vs PPD |
| `ensureStructuredProductDemo` | Remove; optional align narration to PPD |
| Product Reveal | Keep as ceiling |
| Asset coverage | Keep; feed PPD |
| Fake chat / fake dashboard as proof | Forbidden forms |

---

## 6. Co zachovat beze změny (kvalita)

**Stabilní kreativní spine — izolovat od PPD migrace:**

- Creative Candidates + Judge  
- Creative DNA  
- Narrative Beats  
- Hook generation / Hook Enforcement  
- Concept Fidelity  
- Voiceover generation (kromě úzkého alignmentu vůči PPD claim)  
- Attention / Visual Narrative / Identity / Visual Medium **jako existující bloky** (PPD je čte, nepřepisuje)  
- Weekly Strategy / Production Strategy planning  
- Video tempo / duration / subtitles / motion  
- Typed renderers IMAGE, PHONE, CHECKLIST, QUOTE, STATISTIC, CTA  
- Asset compositing (`assetSceneLayout`)  

**Pravidlo zásahu:** měnit jen komponenty, které dnes **vynucují nebo renderují** PRODUCT_DEMO / fake product UI, plus tenké napojení PPD.

---

## 7. Co upravit / přidat / odstranit

### 7.1 Add

- PPD module + plan persistence on package diagnostics/brief  
- Capability catalog (logical)  
- Validators: Value Proof + Appearance Claim  
- Tests for: no synthetic UI; Awareness without product UI; AUTHENTIC requires binding  

### 7.2 Modify (thin)

- `generateContentPackage` / `regenerateContentPackage` — wire PPD after Reveal; remove ensure/PDI chat hard path  
- `productDemonstrationIntegrity.ts` — retarget or replace  
- `storyIntegrity.ts` — product demonstration clause  
- `deriveAllowedSceneTypes` / prompt presentation types — drop PRODUCT_DEMO  
- Prompt Builder lines that assign demo ownership to PRODUCT_DEMO  
- `alignProductDemoNarration` → PPD-aware alignment  
- Render fidelity / analyzer PRODUCT_DEMO absolutes  
- `generationTerminal` demo-specific error (optional rename)  
- `commercialScore` incentives away from synthetic UI  

### 7.3 Remove (after emit stopped)

- `lib/scene-types/product-demo/**`  
- `prepareProductDemoSceneRaster` + registry entry  
- `component-capture-worker` product-demo chat render  
- demo variant LRU / beat schema / related checks  

---

## 8. Seznam souborů (orientační mapa zásahu)

### High touch (presentation / validation)

- `lib/ai/workflows/generateContentPackage.ts`  
- `lib/ai/workflows/regenerateContentPackage.ts`  
- `lib/creative-candidates/productDemonstrationIntegrity.ts`  
- `lib/creative-candidates/storyIntegrity.ts`  
- `lib/creative-candidates/promptBlocks.ts`  
- `lib/scene-types/product-demo/*` (delete)  
- `lib/scene-types/presentation/{deriveAllowedSceneTypes,promptPresentationTypes,analyzePresentation,renderFidelity,prepareVisualScenesForVideo}.ts`  
- `lib/scene-types/{sceneType,compileScenePlan,languageVariantScenes}.ts`  
- `lib/content-package/{generatedVisualScene,visualScenePlan,alignProductDemoNarration}.ts`  
- `video-worker/services/{prepareProductDemoSceneRaster,sceneRendererRegistry}.ts`  
- `lib/product-reveal/promptBlocks.ts` (alignment wording only)  
- `lib/ai/prompts/generateContentPackage.ts` (PRODUCT_DEMO ownership lines)  

### Medium touch (assets → PPD inputs)

- `lib/assets/assetCoveragePolicy.ts` (feed PPD; keep series logic)  
- `lib/assets/analysis.ts` / `smartUsageMetadata.ts` / `assetIngestMetadata.ts` (optional authenticity fields)  
- `lib/ai/workflows/analyzeAsset.ts` / `ingestWebsiteVisuals.ts` (stamp provenance/authenticity)  
- `lib/ai/workflows/packageShared.ts` (`loadAvailableAssets`)  

### Low / no touch (quality spine)

- `lib/creative-candidates/planForPackage.ts` (candidates core)  
- `lib/creative-candidates/creativeDNA.ts`  
- `lib/narrative-beats/*`  
- `lib/ai/workflows/weeklyStrategy.ts`  
- `lib/ai/workflows/planContentStrategy.ts`  
- Visual Narrative / Identity / Medium planners (read-only consumers)  
- Worker IMAGE/PHONE/CTA/checklist/quote/statistic paths  

### Tests / CI

- Replace `check:product-demo-*` / PDI checks  
- Keep story integrity / candidates / render fidelity tests with updated contracts  

---

## 9. Pořadí implementace (rizikově minimalizované)

1. **PPD behind flag** — compute + persist plan; do not change gates yet. Compare plans vs Reveal in diagnostics.  
2. **Extend asset metadata lightly** — provenance/authenticity eligibility (library-time).  
3. **Retarget validators** to PPD + funnel (allow no product appearance). Keep PRODUCT_DEMO emit temporarily if needed for rollback.  
4. **Stop requiring PRODUCT_DEMO** in SI/PDI/prompt ceiling.  
5. **Stop emitting PRODUCT_DEMO** + disable ensure.  
6. **Unregister/remove chat renderer stack**.  
7. **Align commercial scoring** + cleanup greps / CI.  
8. **Quality bakeoff** (below) before full flag default-on.

**Do not** start by rewriting Weekly Strategy or Creative Candidates.

---

## 10. Migrační strategie

| Phase | Behavior |
|---|---|
| Dual-run | PPD plan written; old PRODUCT_DEMO still allowed only if flag off |
| Soft cutover | New packages: no PRODUCT_DEMO; validators use PPD |
| Hard delete | Remove renderer + dead code |
| Legacy jobs | Old completed videos untouched |

Rollback: feature flag restores previous PDI/PRODUCT_DEMO path until hard delete.

---

## 11. Rizika

| Risk | Mitigation |
|---|---|
| Regression in hooks/story quality | Do not touch candidate/DNA/beats/VO core |
| “Empty” solution videos without proof | Funnel-aware value proof (outcome/abstract), not fake UI |
| Scraped junk used as AUTHENTIC | authenticity eligibility + prefer client uploads |
| Strategy plans “pricing week” with 1 asset | Package-time scarcity via PPD/coverage — not strategy rewrite |
| Dual philosophy Reveal vs PDI during transition | Short dual-run; cutover validators together |
| Language variants reintroducing demo | Remove PRODUCT_DEMO absolute rules with type |

---

## 12. Validační a testovací strategie (zachování kvality)

### 12.1 Automated

- Unit: PPD decision table (many assets / one asset / logo only / none; funnel awareness vs conversion)  
- Invariant: never emit synthetic product UI forms  
- SI/PDI replacement: Awareness package can pass without product appearance  
- AUTHENTIC requires `asset_binding`  
- Regression suite: candidates, story integrity (world), hook enforce, concept fidelity **unchanged fixtures**  

### 12.2 Human / bakeoff (mandatory before default-on)

Compare **same strategy items** old vs new (or flag off/on):

| Check | Pass criteria |
|---|---|
| Hook strength | Subjective parity |
| Story clarity | Parity |
| Tempo / structure | Parity |
| Product fidelity | New ≥ old (no fake chat as product) |
| Funnel fit | Awareness not forced into product UI |

Use existing ablation/audit patterns (`reports/ablation-*`, creative audits) as templates — **do not** change candidate generation for the bakeoff.

### 12.3 Production canaries

- One chatbot project (Fenrik.chat)  
- One SaaS without chat assets  
- One local service / physical-leaning project  
- One asset-rich vs asset-empty project  

---

## 13. Doporučení: jak zachovat současnou kvalitu

1. **Treat creative spine as frozen** during presentation migration.  
2. **Change only gates that force PRODUCT_DEMO** and the demo renderer.  
3. **Keep Product Reveal** — it already encodes “no fake UI” / optional product.  
4. **Keep Asset coverage series logic** — already diversifies asset use without strategy changes.  
5. **Prefer authentic assets or honest non-product visuals** over satisfiability shims.  
6. **Bakeoff before deleting** the old path.  
7. **Do not move inventory intelligence into Weekly Strategy** in v1.

---

## 14. Kritérium úspěchu architektury

- Funguje pro libovolný typ projektu **bez** `if chatbot/CRM`.  
- S assety i bez assetů.  
- Žádný fake chat/dashboard jako „produkt“.  
- Ne každé video ukazuje produkt.  
- Weekly Strategy zůstává marketingovým plánem.  
- Creative quality metrics / subjektivní bakeoff nesmí klesnout.  
- Za 2 roky nový product type = nové Brain + assets, stejné PPD třídy.

---

## 15. Otevřené otázky (politiky, ne architektura)

1. Je nesplněný Value Proof na Conversion hard-fail, nebo soft score penalty?  
2. Počítá component-capture jako AUTHENTIC?  
3. Phase 2 soft inventory brief pro production_run planner — ano/ne?  
4. Jak dlouho držet feature-flag rollback po cutover?

---

*End of analysis & implementation plan. No code changes in this step.*
