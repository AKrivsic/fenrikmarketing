# Content Creative Core v2 — Step 2 Report

**Datum:** 2026-08-22  
**Režim:** kontrolované zapojení za flagem `CONTENT_CREATIVE_CORE_V2_ENABLED` (default **false**). Žádná remote migrace. Flag **nezapnutý**. Žádný placený ElevenLabs / Runway / OpenAI TTS / FFmpeg / social-image request v tomto kroku. Celá still/T2V worker regrese odložena do Kroku 4.

Navazuje na:

- `CONTENT_CREATIVE_CORE_V2_STEP_1_REPORT.md`
- `FENRIK_CONTENT_GENERATION_SIMPLIFICATION_AUDIT.md`
- `PRODUCTION_T2V_CREATIVE_QUALITY_ROOT_CAUSE_AUDIT.md`

---

## 1. Přesné produkční body zapojení v2

| Bod | Soubor | Chování při flagu ON |
|---|---|---|
| Strategy originality | `lib/ai/workflows/planContentStrategy.ts` | Použije `buildCreativeMemory` + `evaluateStrategyCandidateOriginality` (v2). Legacy memory zůstává při OFF. |
| Package generate | `lib/ai/workflows/generateContentPackage.ts` | `runCreativeCoreV2Pipeline` místo `runCreativePipeline`. Skip social image. Skip paid video_jobs. Skip T2V planner attach. |
| Persist / CR seed | stejný soubor (`persistNewPackage`) | `buildManualReviewCreativeReviewFromCore` (bez Scene Intent LLM). Core + provenance do `package_brief`. |
| Auto path | `autoAcceptCreativeCoreV2` | Snapshot lock bez placených médií. |
| Manual Review save | `lib/api/creative-review-admin.ts` | VO → `applyCreativeCoreVoiceoverEdit`; scéna → `applyCreativeCoreSceneEdit`; legacy projekce mechanicky. |
| Manual Review Approve | stejný soubor | `buildApprovedCreativeCoreSnapshot` — lock, žádná regenerace. |
| Jiný návrh | `regenerateCreativeCoreV2Concept` | Jediný textový AI Core request; atomická náhrada. |
| UI | `CreativeReviewPackagePanel.tsx` | Zjednodušený operator surface; skryté Runway/UTF-16/technické detaily. |

**Nezapojeno:** `continueCreativeReviewGeneration`, `runCreativePipeline` (legacy stále existuje), content-package-worker / video-worker, n8n.

---

## 2. Flag OFF = původní produkce

`isContentCreativeCoreV2Enabled()` → `process.env.CONTENT_CREATIVE_CORE_V2_ENABLED === "true"` (jinak false).

Při OFF:

- `planContentStrategy` používá stávající `evaluateStrategyPlanOriginality`
- `generateContentPackage` volá `runCreativePipeline` + social image jako dřív
- Manual Review UI/admin path pro packages **bez** `content_creative_core_v2` v briefu je beze změny

---

## 3. Kolik kreativních AI requestů při ON

| Krok | Počet kreativních AI |
|---|---|
| Strategy | 1 (+ max 1 originality repair) — stejný strop jako dřív |
| Creative Core | **1** (`createCreativeCore`) |
| Scene Intent / Concept / Opening / Package storyboard / T2V planner | **0** |
| Manual Review seed localization (CS editor) | překladový request (ne kreativní rewrite) |
| VO / scene edit | **0** Claude |
| Approve | **0** |
| „Úplně jiný návrh“ | **1** nový Creative Core |

---

## 4. Legacy projekce

`projectCreativeCoreToLegacyPackage`:

- mapuje Core → `hook`, `voiceover_text`, `visual_scenes`, `presentation_generation`, `t2v_canonical_creative`
- platform captions = `[pending_step_3:…]` (ne finální copy)
- razítko `content_creative_core_v2_provenance` (`source`, `contract_version`, `fingerprint_version`, `derived_only: true`)
- selhání bez vymýšlení → `creative_core_v2_legacy_projection_failed`

Legacy **nikdy** nepřepisuje Core zpět.

---

## 5. Úprava voiceoveru

`applyCreativeCoreVoiceoverEdit` / `redistributeVoiceoverAcrossScenes`:

1. Nemění core_idea, hook, počet/pořadí scén, vizuál, prostředí, emoci, pohyb  
2. Rozdělí nový VO po větných/slovních hranicích  
3. Zachová `scene_id`  
4. Přepočítá předběžné délky  
5. `media_projections_stale: true`  
6. Coverage: scény dohromady = VO přesně jednou  

Žádný Claude request.

---

## 6. Úprava jedné scény

`applyCreativeCoreSceneEdit`:

- smí: visual_event, motion, emotion, sound, action, subjects, environment, camera, continuity, screen_policy **dané scény**
- nesmí: hook, VO, VO excerpt, order, `scene_id`, ostatní scény  

Žádný Claude. „Úplně jiný návrh“ = jediná akce s novým Core AI.

---

## 7. CS → EN

- Seed: produkční EN = `original_ai` (autoritativní), dokud operátor nezmění CS  
- Save: `translateCreativeReviewEnglishPreviews` s `meaningSafeFromOriginal` při v2  
- Drift typu `still hiring` → `still open` blokuje Approve přes `meaning_review_required`  
- Překlad VO nerodí scény; překlad scény 3 nemění scény 1/2/4/5  

---

## 8. Co zamyká Approve

`content_creative_core_v2_approved_snapshot`:

- Core verze (celý objekt)  
- core_idea, hook, production VO EN  
- voice direction (pokud je)  
- scény  
- translation fingerprints  
- creative_fingerprint  

**Bez** regenerace platform textů / médií.

---

## 9. Co ještě není zapojené (Krok 3+)

- Finální platformní texty, hashtags, YT meta, FB/LI copy  
- FB/LI social image  
- Continue Generation → ElevenLabs / Runway / still render  
- Workers / n8n změny  
- Zapnutí flagu v produkci  

---

## 10. Změněné / nové soubory

**Nové:**

- `lib/content-creative-core-v2/featureFlag.ts`
- `legacyProjection.ts`, `redistributeVoiceover.ts`, `applyCoreEdits.ts`
- `approvedSnapshot.ts`, `autoAccept.ts`, `seedCreativeReview.ts`
- `runPipeline.ts`, `regenerateCore.ts`
- `scripts/check-content-creative-core-v2-step2.ts`
- `CONTENT_CREATIVE_CORE_V2_STEP_2_REPORT.md`

**Upravené:**

- `memory.ts`, `strategyOriginality.ts`, `index.ts`
- `generateContentPackage.ts`, `planContentStrategy.ts`
- `creative-review-admin.ts`, `CreativeReviewPackagePanel.tsx`
- `scripts/check-content-creative-core-v2-memory.ts`, `…-core.ts`
- `package.json` (`check:content-creative-core-v2-step2`)

---

## 11. Migrace

**Žádná.** Core žije ve versioned `package_brief.content_creative_core_v2`.

---

## 12. Výsledky testů

| Suite | Výsledek |
|---|---|
| `npm run check:content-creative-core-v2-memory` | 12 passed |
| `npm run check:content-creative-core-v2-core` | 10 passed |
| `npm run check:content-creative-core-v2-step2` | 18 passed (pokrývá 15 povinných bodů + extras) |
| `tsc --noEmit` | OK |
| ESLint (změněné soubory) | OK |

Celá still/T2V/worker regrese: **odložena na Krok 4**.

---

## 13. Nulové placené provider requesty

Offline testy + Step 2 kód:

- žádný ElevenLabs / Runway / FFmpeg  
- social image skip při v2  
- video_jobs skip při v2  
- Claude pouze pokud by byl flag ON a reálně spuštěn generate/regenerate (v tomto kroku flag OFF → žádný produkční běh)

---

## 14. Blocker před Krokem 3

Krok 3 musí:

1. Z approved Creative Core snapshotu **generovat** platform texts / hashtags / YT / FB-LI copy  
2. Generovat FB/LI image  
3. Napojit Continue / workers **bez** přepsání Core  
4. Timing-only úpravy po ElevenLabs (kreativní scény beze změny)  

Dokud flag zůstane OFF, produkce je bezpečná.

---

## Stručné odpovědi

| Otázka | Odpověď |
|---|---|
| Vzniká při aktivní v2 cestě více než jedna kreativní autorita? | **Ne** — jeden Creative Core; legacy jen projekce. |
| Může změna VO přegenerovat scény? | **Ne** — jen redistribuce excerptů. |
| Může změna scény 3 změnit hook nebo VO? | **Ne**. |
| Je celý voiceover rozdělen přes existující scény přesně jednou? | **Ano** (deterministicky vynuceno). |
| Vidí operátor technické Runway prompty? | **Ne** (v2 UI je skrývá). |
| Generují se už platformní texty a FB/LinkedIn obrázek? | **Ne** (Step 3). |
| Změnila se produkce při flagu OFF? | **Ne**. |
| Proběhl skutečný AI/provider request? | **Ne** (offline Step 2; flag OFF). |
| Je bezpečné pokračovat Krokem 3? | **Ano**, za předpokladu že flag zůstane OFF až do záměrného rolloutu. |
