# Production Decision Audit — Run `889c80df-dc50-4583-a51a-9e7d34eb514c`

_Read-only. 2026-07-14. Zdroje: Supabase export (`getReviewRunExport`), `content_packages.package_brief`, `video_jobs.input` / debug, existující reporty z `scripts/audit-production-run.ts`, `decision-audit-production-run.ts`, `creative-audit-production-run.ts`. Žádné zápisy do DB, žádné regenerace._

**Projekt:** 8080.ai (`99a8d1ea-af34-45c2-9f8b-2033b223c348`)  
**Run:** 1 strategie, 1 balíček, 1 video job (completed)  
**Balíček:** *Two Weeks. Zero Code. Here's Why.* (`b30b1fa8-8d80-47f0-9799-96d9c9b9718c`)  
**Video job:** `b72e597b-9053-4025-816f-a33154fc7f7a`  
**generationMode:** `sample` (v `requested_config.config`)

---

## 0. Executive summary (odpovědi na konec)

| Otázka | Odpověď |
| --- | --- |
| **Co se zlepšilo oproti minulým běhům?** | Series-aware kontext (`series_context_considered`, fingerprints, history blok pro CTA), visual profile v2 skórování (MINIMAL), novější presentation prompt (rubrika typed vs IMAGE), `sparse_plan_adjustment` doplnil 5 beatů, asset coverage v sample módu splněn. |
| **Co se zhoršilo?** | Více AI generací než u `d893` (4 vs 2), chybí typed CTA navzdory silnému product UI assetu, **narativní misalignment** (product beat vs scény 3–5), nevalidní `video_usage`, `used_as` slibuje kompozici, kterou `modify: false` nedodá. |
| **Je použití assetu správné?** | **Částečně správné:** tier-1 UI screenshot pro „correct approach“ je věcně správný; **implementačně slabé:** bez `modify: true` / bez `framed_*` usage jen passthrough + layout fallback, ne scéna z konceptu. |
| **Stejně často používat asset?** | V **sample** bězích ano (guardrail `required`). V produkční sérii (~30 % slotů) ne — u 1 balíčku series slot = 0, ale sample override vyžaduje asset. |
| **Co změnit před další produkcí?** | (1) Po LLM: normalizovat `video_usage` z `used_as` / preferred usage. (2) Sladit sparse expand s asset beaty — neplnit mezivrstvu generickým AI před UI assetem. (3) Pro 8080 po `d893` zvážit typed CTA jen když funnel/conversion; tady awareness + history → IMAGE close je OK, ale pak **asset na closing beat**, ne na pseudo-CTA roli. (4) Opravit decision-audit šablonu (EDITORIAL vs MINIMAL). |

---

## 1. Asset audit (hlavní priorita)

### 1.1 Co se stalo

| Metrika | Hodnota |
| --- | ---: |
| Scén ve worker plánu | **5** (všechny renderer `IMAGE` / `image@1`) |
| OpenAI image generations | **4** (scene-1, 2, 3, 5) |
| Project asset (bez image provideru) | **1** (scene-4) |
| Typed CTA raster | **0** |
| `asset_usage` záznamů | **1** |

**Asset:** `d358f9d9-5616-450e-adc7-10e144ef3fbe`  
**Soubor:** `project-assets/.../Sn_mek_obrazovky_2026-07-13_v_23.48.19.png` (screenshot produktového UI, nahraný krátce před runem)

**Scéna 4 (jediný asset beat):**

```json
{
  "modify": "false",
  "source": "asset",
  "used_as": "Show this product UI screenshot framed inside a laptop screen on a clean desk. A developer and a founder sit side by side...",
  "asset_id": "d358f9d9-5616-450e-adc7-10e144ef3fbe",
  "video_usage": "correct_approach_beat"
}
```

### 1.2 Kdo asset vybral a proč

| Vrstva | Kdo rozhodl | Proč (data / pravidla) | Verdikt |
| --- | --- | --- | --- |
| **Asset coverage** | `resolvePackageAssetCoverage()` v `lib/assets/assetCoveragePolicy.ts` | `generationMode === "sample"` + alespoň jeden tier-1–3 asset → **`stance: "required"`**, `qualityAssetCount > 0`. Guardrail v `packageShared.ts`: bez `asset_usage` → chyba validace. | **Správně** — sample run musí ukázat knihovnu assetů. |
| **Series slotting** | `seriesAssetSlotCount(1) === 0` | Jediný balíček v runu → **žádný** percentuální series slot; rozhodnutí není „series-aware slot“, ale **sample required**. | **Správně** — není agresivní series reuse. |
| **Výběr konkrétního asset_id** | **LLM** v kroku `generateContentPackage` (prompt + AVAILABLE ASSETS) | Jediný smysluplný tier-1 UI screenshot v knihovně; koncept explicitně žádá „blueprint on screen“. | **Správně** — ne deterministický „asset scoring“ engine. |
| **Asset scoring** | _Neexistuje samostatný skóre modul v pipeline_ | Tiering: `assetCoverageTier()` (product_ui / dashboard / …), `filterSampleQualityAssets`, `preferredRolesForPackage`. LLM dostane řádky assetů + smart usage metadata. | N/A — **ne bug**, ale očekávání „scoring“ = tier + LLM relevance. |
| **Visual density** | `expandSparseVisualPlan()` (`lib/series/visualDensity.ts`) | LLM vrátil 4 vizuální beaty; target pro ~23 s = **5** → `sparse_plan_adjustment: true`, přidán **scene-3** jako generický AI still z VO chunku. | **Side effect** — +1 AI scéna **mimo** product moment; asset zůstal na pozici 4. |
| **Presentation analyzer** | `prepareVisualScenesForVideo` / analyzer | scene-4: `rule: allowed`, `reason: image scene` — asset beat prochází jako **IMAGE**, `asset_eligibility_checks: 0` (typed větev asset check neběží). | **Pass-through správně**; analyzer nevaliduje sémantiku `used_as`. |
| **Worker render** | `prepareImageSceneRaster` + `assetSceneLayout` | Reuse `project-assets` bytes; `video_usage: "correct_approach_beat"` **není** v `VIDEO_USAGE_RENDER_VALUES` → mapuje se na **`floating_card`** layout (`shouldComposeAssetLayout` true). **Ne** OpenAI edit (`modify: false`, static screenshot). | **Částečný bug / mismatch** — viz níže. |

**Proč nebyla „AI scéna“ místo assetu na beat 4?**  
Protože (a) sample mode **vyžaduje** asset_usage, (b) koncept a VO explicitně chtějí reálné UI blueprintu, (c) LLM zvolil `source: "asset"` pro product reveal. AI scéna 5 je **generický laptop bez textu** — záloha / closing, ne náhrada assetu.

**Series-aware / CTA logika vs asset:**  
- `recent_creative_fingerprints` obsahuje předchozí balíček (stejný projekt, run `d893`): hook/topic jiné, **typed CTA** na konci.  
- History prompt: „previous package used: **CTA** — avoid repeating…“ → LLM **nežádal** typed CTA (`requested_cta_count: 0`, `cta_decision_reason: "no typed CTA requested in visual plan"`).  
- Asset **nesouvisí** s CTA policy přímo; CTA policy ale vysvětluje, proč konec je AI scene-5 místo branded karty.

**Product Brain alignment:**  
VO zmiňuje „product blueprint“, „every agent“ — odpovídá 8080.ai positioning. UI screenshot je **on-brand** (reálný produkt). `used_as` popisuje lidi u laptopu — to **není** v asset souboru (jen UI) → popis je **aspirační** pro modify=true / AI compositing, ne pro static passthrough.

### 1.3 Správné rozhodnutí, bug, nebo agresivní asset?

| Klasifikace | Detail |
| --- | --- |
| **Správně** | Použít tier-1 UI asset v sample běhu; umístit product reveal do „correct approach“ části příběhu; neopakovat typed CTA hned po `d893`. |
| **Příliš agresivní?** | **Ne** v počtu (1/5 scén). **Ano** v **nákladech na kvalitu narativu**: 4× full AI + 1 asset místo efektivnějšího 2 AI + asset + optional CTA jako u `d893`. |
| **Bug / design gap** | (1) **`video_usage: "correct_approach_beat"`** — neplatná hodnota; worker fallback layout ≠ laptop + two people z `used_as`. (2) **`modify: "false"`** + popis scény vyžadující kompozici lidí = **nesplnitelný kontrakt**. (3) **Storyboard mapování**: beat `correct_approach` (VO) sedí na **scene-3** (generický AI filler), asset je na **scene-4** mapované roli blíž **`cta`**, scene-5 je další AI laptop — **misalignment** hook/script vs timeline. (4) Auto decision-audit report tvrdí „Asset reuse … executed: N“ — **nepravda pro tento run** (omezení šablony skriptu). |

### 1.4 Jak by video vypadalo bez assetu

- **Bez assetu by sample run neprošel guardrails** (`asset_usage` required).  
- Hypoteticky při `generationMode: production` a stejném LLM plánu: **5× AI** (včetně generic blueprint laptop scene-5) — konzistentnější vizuálně s `used_as`, ale **méně autentický produkt**, více rizika „fake UI“.  
- **Lepší AI než static passthrough?** Pro beat „ukázat reálný blueprint“ — **asset je lepší** než scene-5 generic layout. Pro beat popsaný v `used_as` (tým u laptopu) — **AI s modify=true nebo framed_screen + asset insert** by bylo lepší než raw screenshot ve floating card.  
- **Snižuje asset počet generací?** Ano — **1 méně** OpenAI call oproti čistě AI plánu; run ale generuje **4** kvůli sparse expand + duplicitní closing AI.

---

## 2. Decision audit — důležitá rozhodnutí

### 2.1 Voice

| | |
| --- | --- |
| **Kdo** | `resolveTtsOptions` → `resolveVoice()` |
| **Výsledek** | `alloy` |
| **Proč** | `knowledge.presentation` prázdné → větev **`legacy_default_alloy`** (ne uložené `preferred_voice: "auto"`). UI může ukazovat Automatic, DB to nemá. |
| **Hypotetické Automatic** | Pro tento projectId + en → také **`alloy`** (deterministic hash). |
| **TTS instructions** | Ano — tone z Project Brain (confident, technical-accessible, action-oriented, concise, empowering). |
| **Verdikt** | **Správně** jako default; **konfigurační mezera** UI vs DB pro Automatic. |

### 2.2 Visual profile

| | |
| --- | --- |
| **Kdo** | `resolveVisualProfileAuto` (visual-profile@**2**, skóre) |
| **Výsledek** | **MINIMAL** (`source: auto`, frozen `package_snapshot`) |
| **Proč** | Skóre: MINIMAL 6 (saas, software, platform), NATURAL 1, ostatní 0 — seed z goal + tone + audience + product snippets. |
| **Efekt** | IMAGE prompty + suffix „Clean composition, limited visual clutter…“ |
| **Verdikt** | **Working as designed** — odpovídá B2B SaaS 8080. Auto-generated decision-audit.md chybně píše EDITORIAL (stará šablona Part 2). |

### 2.3 Scene types (CHECKLIST / PHONE / QUOTE / STATISTIC / CTA)

| Typ | Prompt ceiling | LLM requested | Analyzer | Finální | Proč |
| --- | ---: | ---: | --- | --- | --- |
| IMAGE | ano | 5× | pass-through | 5× | Default + rubrika „typed only when materially clearer“. |
| CHECKLIST | ano | 0 | — | 0 | Narrative nevyžaduje checklist; allowlisted ale LLM zvolil IMAGE. |
| CTA | ano | 0 | — | 0 | History + funnel **awareness** + fingerprint předchozího typed CTA → LLM zvolil spoken close + AI/asset visuals. |
| PHONE/QUOTE/STATISTIC | ne | 0 | — | 0 | Ceiling (no mobile signal / no proof). |

**Kdo rozhodl o CTA absenci:** primárně **LLM** (žádný typed payload); sekundárně **prompt history block** z `loadSceneTypeProjectHistory` (CTA v recent window). `typedCtaPolicy` by potlačila typed CTA i při requestu na awareness — tady request nebyl.

**Verdikt:** **Správně** pro series diverzitu; **produktově debatable** — sample/demo může chtít ukázat typed CTA renderer znovu.

### 2.4 Semantic motion

| Beat | scene_id | Role (creative_mode) | Resolver intent | Uložené | Match |
| --- | --- | --- | --- | --- | --- |
| 1 | scene-1 | mistake | ATTENTION | ATTENTION / zoom_in | ano |
| 2 | scene-2 | why_backfires | EXPLAIN | EXPLAIN / static | ano |
| 3 | scene-3 | correct_approach | EXPLAIN | EXPLAIN / drift_down | ano |
| 4 | scene-4 | cta (mapování) | HOLD | HOLD / static | partial (obsah = asset, ne CTA) |
| 5 | scene-5 | — | CLOSE | CLOSE / static | ano |

**Proč partial:** `roleDefaultIntent` nezná všechny storyboard role; 5 scén × 4 creative beats → explicit scene plan reuse. **Working as designed**, ale kolize s obsahem scene-4.

### 2.5 Series-aware decisions

| Signál | Hodnota | Efekt |
| --- | --- | --- |
| `series_context_considered` | true | Diversity block + fingerprints v promptu/generation logu |
| `recent_creative_fingerprints` | prior: typed CTA, laptop motif | Varování před opakováním CTA |
| `history_decisions` | `[]` | Frequency guardrails nezasáhly (žádný typed request) |
| `sparse_plan_adjustment` | true | +1 AI beat |

**Verdikt:** Series vrstva **fungovala** pro CTA diverzitu; **nepomohla** sladit asset beat s VO.

### 2.6 Storytelling / hook / angle / funnel

| Pole | Hodnota |
| --- | --- |
| **Theme** | The hidden cost of starting without a shared product blueprint |
| **Topic** | Dev teams arguing architecture two weeks, zero code |
| **Angle** | Business owner + whiteboard chaos → reframe: missing blueprint |
| **Hook** | Your dev team isn't slow. They're just starting from a blank page. |
| **creative_mode** | mistake (beats: mistake → why_backfires → correct_approach → cta) |
| **funnel_stage** | awareness |
| **CTA (copy)** | Get your product blueprint before dev starts |

**Verdikt:** Silný, konzistentní script; **vizuální plán** (5 scén) mírně rozbíjí script beats 3–4 (correct approach vs asset placement).

---

## 3. Kompletní audit — obsah balíčku (výtah)

Plné dumpy:  
`reports/production-run-889c80df-dc50-4583-a51a-9e7d34eb514c-audit.md`  
`reports/production-run-889c80df-dc50-4583-a51a-9e7d34eb514c-creative-audit.md`

### 3.1 Strategie → balíček

- **Strategy item:** `a44a3892-3d78-46db-9b2c-532c9ea210d6`, platform tiktok, format reel, priority 1.  
- **package_brief:** hook, voiceover, subtitles (phrase split `/`), video concept, script s beat timingem, duration 23 s, hashtags, platform_outputs (tiktok, instagram, youtube video + facebook, linkedin, x text).

### 3.2 Presentation pipeline

- **presentation_generation:** mode enabled, MINIMAL, `prompt_presentation_types: [IMAGE, CHECKLIST, CTA]`, `final_worker_scene_types: 5× IMAGE`, `visual_beat_count: 5`, `target_visual_beat_count: 5`.  
- **presentation_analyzer:** 5× `allowed` / `image scene`.  
- **render_spec / worker:** semantic motion beats, TTS alloy + instructions, Whisper subtitles, MP4 ~24.57 s, tail validation passed, 0 moderation fallbacks.

### 3.3 Scene prompty (stručně)

1. **scene-1:** Business owner, dev team u whiteboardu (hook).  
2. **scene-2:** Close-up chaotic whiteboard.  
3. **scene-3:** Generic narrative still z VO („Lock down the product blueprint…“) — **sparse expand**.  
4. **scene-4:** Asset UI (`modify: false`).  
5. **scene-5:** Generic laptop s abstraktním UI layoutem (closing).

---

## 4. Porovnání s referenčními runy

| Run | Projekt | Balíčků | Scény (worker) | AI gen | Asset | Typed CTA | Profile | Voice | Poznámka |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- | --- | --- |
| **889c80df** (tento) | 8080.ai | 1 | 5× IMAGE | 4 | 1 | 0 | MINIMAL | alloy | sample, sparse +1 AI, asset beat misaligned |
| **d893d9f7** | 8080.ai | 1 | 3× IMAGE + 1 CTA | 2 | 1 | 1 | MINIMAL | alloy | stejný asset, `screen_insert`, typed CTA close |
| **684a95ef** | rightcard.ai | 1 | IMAGE + asset + CTA | ~2 | 1 | 1 | NATURAL | — | jiný produkt, phone asset + CTA card |
| **5e8465bc** | fenrik | 3 | 13× IMAGE | 13 | 0 | 0 | EDITORIAL | shimmer | žádné assety, IMAGE-only |
| **7628340e** | fenrik | 3 | 13× IMAGE | 13 | 0 | 0 | EDITORIAL | alloy | baseline IMAGE-only |

### 4.1 Rozmanitost a opakování

- **889c vs d893 (stejný projekt):** Jiný hook/topic/angle (whiteboard vs coffee meeting) — **dobrá tematická diverzita**. Sdílený asset ID — **OK** pro stejný produkt, jiný `used_as`. **889c méně eficientní** (více AI, chybí typed CTA variety v rendereru).  
- **889c vs fenrik běhy:** 8080 používá MINIMAL + product assets; fenrik EDITORIAL + čistě generované scény — **vyšší vizuální autenticita produktu u 8080**, nižší typed scene diverzita u 889c.

### 4.2 CTA a storytelling

- **d893 / 684a:** typed CTA raster (`cta@1`) — konzistentní layout, jiný copy.  
- **889c:** spoken CTA v subtitles, vizuálně AI laptop — **organičtější pro awareness**, ale **méně „product demo end card“** než d893.

### 4.3 Image prompty a vizuální kvalita

- 889c: silné hook/mistake prompty (1–2), slabší **scene-3 filler**, asset **bez kompozice dle used_as**, scene-5 **duplicitní** vůči product message.  
- Celkově: **kvalita není poškozena technickou chybou renderu**, spíš **plánováním beatů**.

---

## 5. Evidence matrix (tento run)

| Feature | Implemented | Executed | Non-default | Verdikt |
| --- | ---: | ---: | ---: | --- |
| Voice legacy alloy | Y | Y | N | config gap |
| TTS instructions | Y | Y | Y | OK |
| Visual profile AUTO v2 | Y | Y | Y (MINIMAL) | OK |
| Sample asset coverage required | Y | Y | Y | OK |
| Asset in scene (passthrough) | Y | **Y** | Y | partial quality |
| Typed CTA | Y | N | N | LLM + history |
| Series fingerprints | Y | Y | Y | OK |
| Sparse visual density | Y | Y | Y | side effect |
| Semantic motion | Y | Y | partial | OK |
| Analyzer typed branches | Y | N | N | not exercised |

---

## 6. Code references (kde hledat logiku)

- Asset coverage / sample required: `lib/assets/assetCoveragePolicy.ts`, guardrails `lib/ai/workflows/packageShared.ts`  
- LLM asset rules: `lib/ai/prompts/generateContentPackage.ts`  
- Sparse beats: `lib/series/visualDensity.ts`  
- Series context: `lib/series/loadSeriesCreativeContext.ts`, `seriesDiversityPrompt.ts`  
- Typed CTA policy: `lib/series/typedCtaPolicy.ts`, history `sceneTypeProjectHistory.ts`  
- Asset render: `video-worker/services/prepareImageSceneRaster.ts`, `assetSceneLayout.ts`  
- Visual profile: `lib/visual-profile/resolveVisualProfile.ts`  
- Voice: `lib/voice/resolveTtsOptions.ts`

---

## 7. Závěr pro produkci

**End-to-end run je úspěšný** (completed, artifacts, TTS/subtitles OK). **Hlavní learning:** asset na 889c není „špatná volba assetu“, ale **špatně zabalená exekuce** — nevalidní `video_usage`, static asset vs bohatý `used_as`, a **sparse expand** vytlačil product UI mimo synchronní beat s voiceoverem. Oproti **d893** je tento běh **méně ukázkový** pro typed CTA a **dražší** na generování, ale **lépe series-aware** ohledně neopakování CTA card.

**Doporučení frekvence assetů:** Sample — ponechat **required**. Production series — držet ~30 % slotů; u single-package awareness **optional**, ne required, pokud narrative nepotřebuje UI.

---

_Data: export run `889c80df-dc50-4583-a51a-9e7d34eb514c`, audit scripts spuštěny read-only 2026-07-13T23:34Z._
