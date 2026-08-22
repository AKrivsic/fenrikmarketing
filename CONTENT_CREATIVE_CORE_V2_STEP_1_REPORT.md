# Content Creative Core v2 — Step 1 Report

**Datum:** 2026-08-22  
**Režim:** offline foundation only. Žádný production run. Žádný Claude / OpenAI / ElevenLabs / Runway request. Žádná remote DB migrace. Žádná změna feature flagů / secrets. Produkční still / T2V / text-only / auto / Manual Review toky **nezměněny**.

Navazuje na:

- `FENRIK_CONTENT_GENERATION_SIMPLIFICATION_AUDIT.md`
- `PRODUCTION_T2V_CREATIVE_QUALITY_ROOT_CAUSE_AUDIT.md`
- `PRODUCTION_T2V_SIMPLIFIED_CREATIVE_PIPELINE_REPORT.md`

---

## 1. Co přesně vzniklo

Nový izolovaný modul `lib/content-creative-core-v2/`:

| Soubor | Účel |
|---|---|
| `config.ts` | Jedna konfigurační konstanta (time decay, attempts, scene/VO bounds) |
| `types.ts` | `content_creative_core_v2` kontrakt + memory/fingerprint typy |
| `fingerprint.ts` | Obecný structured fingerprint (bez embeddings) |
| `memory.ts` | Sestavení paměti z existujících packages + time-decay váhy |
| `strategyOriginality.ts` | Strategy gate: max 1 repair, pak `strategy_originality_exhausted_v2` |
| `createCreativeCore.ts` | Jeden Claude request builder + parse; optional provider API **nepoužité v produkci** |
| `validate.ts` | Deterministická validace (accept / stable error, žádné „vylepšování“) |
| `index.ts` | Veřejné API |

Offline testy:

- `scripts/check-content-creative-core-v2-memory.ts`
- `scripts/check-content-creative-core-v2-core.ts`

npm skripty:

- `check:content-creative-core-v2-memory`
- `check:content-creative-core-v2-core`

---

## 2. Co se zatím nezapojilo

**Záměrně nepropojeno** do:

- `runGenerateContentPackage` / `runCreativePipeline`
- `planContentStrategy` (produkční)
- Creative Review Continue / Approve
- content-package-worker / video-worker
- ElevenLabs / Runway / social-image raster
- operátorského UI
- feature flagů

Stávající T2V zjednodušení (`t2v_canonical_creative`, `projectCreativeMemory@1`) zůstává produkční cestou. Creative Core v2 je **připravovaný nástupce**, ne čtvrtá runtime autorita.

---

## 3. Nový Creative Core kontrakt

Klíč briefu: `content_creative_core_v2`  
`contract_version: 2`

Povinná kreativní autorita (společná pro still i T2V):

- `strategy_item_id`
- `creative_fingerprint`
- `core_idea`, `hook`, `voiceover`
- `main_emotion`, `conflict`, `reveal_or_surprise`, `visible_change`, `payoff`, `cta_intent`
- `scenes[]` (video: 4–5; text-only: `[]`)

Každá scéna: `scene_id`, `order`, `voiceover_excerpt`, `visual_event`, `environment`, `subjects`, `action`, `motion_or_change`, `emotion`, `camera_intent`, `sound_intent`, `screen_policy`, `continuity_hints`.

Screen policy pouze: `no_screen` | `generic_unreadable_ui` | `provided_asset_overlay`.

**Zakázáno uvnitř core:** captions, hashtags, YT meta, social-image prompt, Runway prompt, TTS, render statusy, technical clips.

---

## 4. Obecný memory model

`content-creative-memory@2` — čte existující packages (published / approved / ready / rejected / cancelled / drafts + explicit rejection). **Žádná nová DB tabulka.**

Každý záznam obsahuje strukturovaná pole z požadavku (pain, topic, scenario, POV, opening, narrative, setting, motif, props, emotion, conflict, reveal, payoff, CTA, timestamp, status, rejection reason) + `creative_fingerprint` + `protection_weight`.

Rozpoznávání situace je **obecné** (mechanism keys + token overlap + paraphrase), ne hardcoded názvy Candidate/Pre-Start/Tab/Reply. Tyto názvy slouží jen jako regression fixtures.

---

## 5. Time-decay pravidla

Vše v `CREATIVE_CORE_V2_MEMORY_CONFIG`:

| Parametr | Hodnota | Význam |
|---|---|---|
| `veryRecentCount` + `recentDays` | 3 / 14 dní | Poslední balíky v recent okně: váha **1.0** |
| `recentWeight` | 0.85 | Recent období |
| `mediumDays` / `mediumWeight` | 45 / 0.55 | Střední stáří |
| `oldDays` / `oldWeight` | 90 / 0.30 | Starší |
| `ancientWeight` | 0.12 | Velmi staré — smí se vrátit s jiným scénářem/POV/provedením |
| `rejectedBoostDays` / `rejectedWeightBoost` | 21 / +0.35 | Rejected/cancelled posílené |
| `hardBlockThreshold` | 0.7 | `matchScore × weight` → hard conflict |
| `packageScanLimit` / `promptRecordLimit` | 60 / 16 | Scan vs kompaktní prompt |

---

## 6. Chování `packageCount=1`

Gate **vždy platí** i pro jeden package. Pokud existují nepoužité project pain points a kandidát znovu bere poslední pain při silné váze posledního záznamu → `pain_not_rotated`.

---

## 7. Maximální počet Strategy requestů

**2** (`maxStrategyAttempts`): 1 initial + 1 repair.  
Druhé porušení → `strategy_originality_exhausted_v2` **před** Creative Core.  
Diagnostika: `originalityDiagnosticsForBrief()` (připraveno pro brief/audit).

---

## 8. Maximální počet Creative Core requestů

**1** (`maxCreativeCoreAttempts`).  
Žádný kreativní repair loop. Validace fail = stabilní chyba.

---

## 9. Seznam změněných / nových souborů

**Nové:**

- `lib/content-creative-core-v2/*` (8 souborů)
- `scripts/check-content-creative-core-v2-memory.ts`
- `scripts/check-content-creative-core-v2-core.ts`
- `CONTENT_CREATIVE_CORE_V2_STEP_1_REPORT.md` (tento report)

**Upravené:**

- `package.json` (2 npm skripty)

**Nezměněné produkční orchestrátory:** generate / continue / runCreativePipeline / workers / UI.

---

## 10. Migrace

**Žádná.** Fingerprint/core se v dalších krocích uloží do versioned JSON `package_brief.content_creative_core_v2`.

---

## 11. Výsledky cílených testů

```
npm run check:content-creative-core-v2-memory  → 9 passed, 0 failed
npm run check:content-creative-core-v2-core    → 10 passed, 0 failed
npx tsc --noEmit                               → OK
npx eslint lib/content-creative-core-v2 + scripts → OK
```

Povinné případy pokryty: repeat (jiná postava / parafráze), distinct pass, ancient decay pass, rejected hard block, max 1 strategy repair, video 4–5 scén, text-only bez falešných scén, žádné platform/provider pole v core, single authority messages, žádný production wiring, žádný live provider import v v2 modulu.

---

## 12. Potvrzení nulových provider requestů

Testy a Step 1 kód **nevolají** `getCopywritingProvider` / `getStrategyProvider` / `fetch`.  
`createCreativeCore(textProvider)` existuje jen jako budoucí adapter — produkce ho neimportuje.

---

## 13. Potvrzení beze změny produkčního workflow

Offline assert v core testu: `generateContentPackage.ts`, `continueCreativeReviewGeneration.ts`, `runCreativePipeline.ts` **neobsahují** `content-creative-core-v2`.

---

## 14. Přesný vstup pro Krok 2

Krok 2 by měl:

1. Feature-flagované (default OFF) napojení `planContentStrategy` → `createStrategyCandidateWithOriginality` (v2 memory).  
2. Feature-flagované napojení package generate → `buildCreativeCoreMessages` / `createCreativeCore` místo Concept+Opening+Package (still) a místo T2V single package (T2V).  
3. Persist `package_brief.content_creative_core_v2`.  
4. Derive legacy `presentation_generation` / `visual_scenes` / `t2v_canonical_creative` **z** Creative Core (kompatibilita), ne naopak.  
5. Stále **bez** platform texts / social image / Runway v tomto requestu — to je Krok 3.  
6. Manual Review a auto acceptance zůstanou Krok 3/4.

**Blocker check:** Step 1 nevytváří čtvrtou paralelní runtime autoritu. Je to samostatný kontrakt připravený nahradit Concept+Opening+Package / T2V canonical v dalších krocích za flagem.
