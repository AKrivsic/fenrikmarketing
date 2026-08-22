# Production T2V — zjednodušená kreativní pipeline

**Projekt:** Fenrik Studio  
**Datum:** 2026-08-21  
**Zdroj auditu:** `PRODUCTION_T2V_CREATIVE_QUALITY_ROOT_CAUSE_AUDIT.md`  
**Režim implementace:** offline. Žádný nový production run. Žádný skutečný Claude / OpenAI / ElevenLabs / Runway request. Žádná změna feature flagů ani secrets. Žádná vzdálená migrace.

Toto není nový produkt. Opravuje se základ stávajícího Text-to-Video workflow. Still a I2V zůstaly na svých původních cestách.

---

## 1. Původní počet kreativních autorit

**7** na T2V cestě:

1. Strategy  
2. Claude Video Concept  
3. GPT Opening Impact  
4. deterministická Visual Identity (přepisovala globální kameru)  
5. Claude Content Package  
6. Claude Scene Intent  
7. T2V / Runway adapter (vymýšlel Action, kameru, příběh)

Hook, voiceover a obraz proto neměly jednoho autora. `packageCount=1` prakticky vypínalo diverzitu. Candidate / Pre-Start / Tab / Reply proto mohly opakovat stejnou scenario family.

---

## 2. Nový počet kreativních autorit

**2** pro T2V:

1. **Strategy** — volí nové téma / pain / situaci napříč běhy (max jeden originality repair).  
2. **Jeden Claude Content Package** — jediná autorita pro core idea, hook, kompletní voiceover a 4–5 canonical video scenes.

Všechno ostatní na T2V cestě je derivační nebo technické:

| Krok | T2V stav |
|---|---|
| Video Concept LLM | přeskočen; odvozen z `t2v_canonical_creative` |
| Opening Impact LLM | přeskočen; hook se z T2V package **nepřepisuje** |
| Visual Identity | odvozená; `camera_style` = scene-specific, nekopíruje se globálně |
| Scene Intent LLM | přeskočen; scény se seedují z canonical `image_prompt` |
| Runway adapter | pouze validuje a serializuje canonical scénu |
| Captions / hashtags / LinkedIn / Facebook / social image text | smí číst canonical výstup, nesmí změnit hook, VO ani storyboard |

Žádný druhý T2V planner, žádný extra AI hodnotitel, žádný paralelní storyboard, žádný embedding / Benchmark Lab.

---

## 3. Které T2V kroky byly odstraněny nebo změněny na čistě derivační

**Odstraněny z T2V cesty (zůstávají ve still):**

- Claude Video Concept request  
- GPT Opening Impact request  
- `alignOpeningVoiceover` přepis hooku  
- Claude Scene Intent request  

**Změněny na derivační:**

- Visual Identity — kopie canonical visual direction; scéna má vlastní kameru  
- Creative Review scene intents — `seedT2vCanonicalSceneIntents` z canonical scény  
- Opening Impact pole v `presentation_generation` — odvozená z hooku a první scény, ne naopak  

**Zúženy na techniku:**

- Runway adapter / `composeTextToVideoProviderPrompt` — Action = konkrétní vizuální událost, Setting před kamerou, scene-specific camera, jedna screen policy, limit 1000 UTF-16, fingerprint = přesný prompt  
- Prompt contract **2 → 3**

---

## 4. Přesný nový tok

```
Strategy
  → načti creative memory projektu (published / approved / ready / rejected / cancelled / operator-seen drafts)
  → 1 Claude strategy request
  → deterministický originality gate
  → pokud repeat: max 1 repair request
  → druhý repeat: STRATEGY_ORIGINALITY_EXHAUSTED, žádný Content Package

T2V Content Package (1 Claude)
  → hook + kompletní VO + t2v_canonical_creative + 4–5 canonical scenes
  → derive concept / opening / identity (bez LLM)
  → persist package_brief včetně t2v_canonical_creative

Creative Review seed
  → CS lokalizace VO + scén (pracovní verze)
  → production EN = original_ai (žádný CS→EN round-trip, pokud operátor CS nezměnil)
  → adapter sestaví Runway prompt z canonical scény

Operátor
  → myšlenka, hook, CS VO, EN VO, emoce, scény (co se děje / pohyb / emoce / zvuk)
  → Approve / Vytvořit úplně jiný návrh / Reject
  → technika ve sbaleném „Technické detaily“

Approve preflight
  → cross-run originalita + rejected scenario fingerprint
  → canonical contract v1
  → významově platné EN (žádný meaning drift)
  → 4–5 platných scén, žádný stale/hybrid
  → konzistentní screen policy, žádný rozporný prompt
  → timing / budget / retry ochrany beze změny
```

Still tok se nemění: Video Concept → Opening Impact → Visual Identity → Package → Scene Intent → `alignOpeningVoiceover`.

---

## 5. Originalita napříč runy

`packageCount=1` už **nevypíná** diverzitu. Gate platí i pro jeden package.

Před novým strategy itemem se načte až 60 Content Packages projektu a sestaví se `project-creative-memory@1`:

- pain point  
- topic / scenario family  
- POV  
- opening mechanism  
- prostředí  
- dominantní rekvizita  
- visual motif  
- emoce / payoff  

Taxonomie je malý enum + fingerprinty, ne embeddings.

Pravidla v kódu:

- Candidate / Pre-Start / Tab / Reply = `outsider_checks_silent_company_profile`  
- telefon / notebook / profil / feed = `phone_laptop_profile_feed`  
- jiná formulace stejného tématu není nové téma  
- jiná postava ve stejné situaci není nový příběh  
- poslední použitý pain se nesmí zopakovat, pokud existují nepoužité pain pointy projektu  
- cancelled / rejected / `t2v_creative_rejected` jde do rejection memory  
- published jde do recent memory  
- max jeden strategy repair; druhý repeat končí **před persist** package  
- důvody odmítnutí se ukládají do `originality_audit` na strategy brief  
- Approve znovu kontroluje `T2V_CREATIVE_MEMORY_REPEAT` (včetně `t2v_previous_concept` po Regeneraci)

---

## 6. Celý Regenerate (`Vytvořit úplně jiný návrh`)

1. UI předem říká, že se zaplatí jen textové AI, ne média.  
2. Aktuální brief se označí `t2v_creative_rejected` a uloží do `t2v_previous_concept`.  
3. Stejný strategy slot; ban na pain + scenario family + visual motif.  
4. Maximálně jeden nový kreativní pokus (`t2v_concept_regenerate_used`).  
5. Volá se jen `runCreativePipeline` (T2V = jeden Claude package) + CR lokalizace.  
6. **Žádný** ElevenLabs, Runway, `video_jobs`, social image render.  
7. Nový návrh se persistuje atomicky (`title` + `package_brief`).  
8. Chyba pipeline nebo persist = původní návrh zůstane.  
9. Scene rebuild zůstává jen při zásadní změně konkrétní scény (`visual_rebuild_required`).

---

## 7. EN / CS editace

Pro projekt s anglickým výstupním jazykem:

1. `original_ai` je produkční angličtina.  
2. Čeština je pracovní verze operátora.  
3. Pokud operátor CS nezměnil, TTS použije přesný `original_ai` — žádný CS→EN round-trip.  
4. Pokud CS změnil, jeden kontextový překlad dostane původní EN, původní CS a upravenou CS.  
5. Překlad má přenést jen skutečnou změnu.  
6. `still hiring` se nesmí změnit na `still open` (deterministická ochrana, ne další AI soudce).  
7. Ukládají se fingerprinty source EN, source CS, current CS, production EN.  
8. Podezřelý posun → `meaning_review_required`.  
9. Approve je v tomto stavu blokovaný (`T2V_MEANING_REVIEW_REQUIRED` + lifecycle Current).  
10. Operátor vidí finální EN a krátké warningy.  
11. `Current` znamená aktuální **a** významově přijatelnou verzi.

Still dál používá `final_approved` jako mluvený text. T2V používá production EN z `original_ai` / meaning-safe preview.

---

## 8. Jak vzniká Runway prompt

Adapter **není režisér**. Pro každou scénu serializuje:

- konkrétní vizuální událost (`image_prompt` / visual event)  
- Setting (nesmí vypadnout kvůli kameře)  
- konkrétní motion  
- scene-specific kameru  
- continuity hints  
- právě jednu screen policy  
- krátká technická omezení  

Pravidla:

- Scene Intent esej **není** Action  
- globální Visual Identity kamera se **nekopíruje** do všech scén  
- žádné extra střihy v jednom krátkém klipu  
- žádný fade to black, pokud není schválené finále  
- max 1000 UTF-16  
- fingerprint = přesný odesílaný prompt  
- `generic_unreadable_ui` nesmí současně žádat legible/readable screen/feed/text  
- skutečný web/text jen přes schválený overlay asset, ne generováním čitelného písma  

Screen policy: `no_screen` | `generic_unreadable_ui` | `provided_asset_overlay`.

---

## 9. Co nyní vidí operátor

Nahoře: hlavní myšlenka, hook, pracovní český VO, finální anglický VO, hlavní emoce, stav, konzervativní cena, meaning-drift upozornění.

Každá scéna standardně: číslo a délka, část VO, co se děje (CS), pohyb (CS, zalamovaný), emoce, případný zvuk, stav.

Sbalené: Runway prompt, UTF-16, fingerprint, provider contract, technické klipy, interní ID.

Hlavní akce package: **Approve**, **Vytvořit úplně jiný návrh**, **Reject**.

Rebuild scény jen když `visualRebuildRequired`. Žádné dominantní rebuild tlačítko na zdravé scéně. CSS řeší přetékání a wrap dlouhého motion textu.

Operátor neřeší technický Runway prompt.

---

## 10. Počet AI requestů pro nový package

Typický Fenrik T2V běh (EN produkce, CS editor, 4–5 scén):

| Request | Počet |
|---|---|
| Strategy (Claude) | 1, nebo 2 při originality repair |
| Content Package (Claude) — kreativní autorita | 1 |
| VO lokalizace EN→CS | 1 |
| Scene lokalizace EN→CS | 4–5 |
| Video Concept | 0 |
| Opening Impact | 0 |
| Scene Intent | 0 |
| CS→EN | 0 |
| ElevenLabs / Runway | 0 do Approve + Continue |

**Celkem textové AI: 6–8** (7–9 s strategy repair).  
JSON repair uvnitř `generateValidatedJson` není druhá kreativní autorita.

Captions/hashtagy vznikají ve stejném Claude package. Social-image raster zůstává persist cestou, ale nemění hook/VO/storyboard.

---

## 11. Počet AI requestů pro Regeneraci

| Request | Počet |
|---|---|
| Strategy | 0 (stejný slot) |
| Content Package (Claude) | 1 |
| VO + scene CS lokalizace | 1 + 4–5 |
| ElevenLabs / Runway / social image / video_jobs | 0 |

**Celkem: 6–7 textových requestů. Nula médií.**

---

## 12. Změněné soubory

**Nové**

- `lib/content-memory/creativeTaxonomy.ts`  
- `lib/content-memory/projectCreativeMemory.ts`  
- `lib/content-memory/strategyOriginality.ts`  
- `lib/content-package/t2vCanonicalCreative.ts`  
- `lib/content-package/t2vConceptRegenerate.ts`  
- `lib/content-package/t2vScreenPolicy.ts`  
- `lib/content-pipeline/prompts/textToVideoAuthoritativePackage.ts`  
- `lib/creative-review/meaningSafeEnglish.ts`  
- `scripts/check-production-t2v-simplified-creative-pipeline.ts`  
- `PRODUCTION_T2V_SIMPLIFIED_CREATIVE_PIPELINE_REPORT.md`

**Upravené (produkce)**

- `lib/ai/planning/loadStrategyPlanningContext.ts`  
- `lib/ai/prompts/contentStrategyPlan.ts`  
- `lib/ai/workflows/planContentStrategy.ts`  
- `lib/ai/schemas/contentPackage.ts`  
- `lib/ai/workflows/generateContentPackage.ts`  
- `lib/ai/workflows/packageShared.ts`  
- `lib/content-pipeline/runCreativePipeline.ts`  
- `lib/content-pipeline/runContentPackage.ts`  
- `lib/content-pipeline/prompts/contentPackage.ts`  
- `lib/content-pipeline/prompts/contentPackageVisualScenes.ts`  
- `lib/content-package/canonicalVideoPlan.ts`  
- `lib/content-package/textToVideoRenderAdapter.ts`  
- `lib/content-package/textToVideoProviderPrompt.ts`  
- `lib/content-package/textToVideoPlanApprovalGate.ts`  
- `lib/content-package/textToVideoManualReview.ts`  
- `lib/text-to-video/runwayProductionConfig.ts`  
- `lib/creative-review/seed.ts`  
- `lib/creative-review/sceneIntent/seedFromPackageScenes.ts`  
- `lib/creative-review/translateVoiceover.ts`  
- `lib/creative-review/types.ts`  
- `lib/creative-review/lifecycle.ts`  
- `lib/creative-review/productionSpokenVoiceover.ts`  
- `lib/api/creative-review-admin.ts`  
- `app/projects/[id]/creative-review/actions.ts`  
- `components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx`  
- `components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.module.css`  
- `package.json`

**Test fixtures (Approve cesta pod contract v3)**

- `scripts/check-production-canonical-video-plan.ts`  
- `scripts/check-production-text-to-video-creative-review-fix.ts`  
- `scripts/check-production-t2v-voice-control-plane.ts`  
- `scripts/check-production-t2v-scene-integrity.ts`  
- `scripts/check-production-t2v-technical-clip-split.ts`

I2V / still worker soubory se neměnily.

---

## 13. Migrace a remote stav

- **Žádná nová SQL migrace.**  
- **Žádný zápis do vzdálené produkční DB.**  
- Canonical creative je JSON na `package_brief` (`t2v_canonical_creative`, contract v1).  
- Staré T2V drafty se automaticky nepřevedou. Approve bez contractu končí `T2V_CANONICAL_CREATIVE_MISSING`. Operátor je může Rejectnout, nebo spustit Regeneraci, která vytvoří nový canonical výstup.  
- Žádný starý paid provider artifact se nepřepisuje.

---

## 14. Výsledky testů

Všechny běhy **offline**, bez sítě.

| Sada | Výsledek |
|---|---|
| `check:production-t2v-simplified-creative-pipeline` (1–37 + still/I2V source) | **39/39** |
| `check:production-t2v-scene-integrity` (38) | passed |
| `check:production-t2v-technical-clip-split` (39–41, still/I2V split) | **18/18** |
| Canonical video plan | **22/22** |
| Creative Review T2V fix | **16/16** |
| T2V voice control-plane | **10/10** |
| Step 1 | passed |
| Step 2 | passed |
| Step 2B | passed |
| Step 2C + behavior | passed |
| Step 3 + 3B | passed |
| Step 4 | **20/20** |
| Step 5 | **17/17** |
| Step 5B | **10/10** |
| Step 5C (fake E2E + retry 0 POST) | **7/7** |
| Step 5D | **8/8** |
| `check-opening-voiceover-align` (still hook align) | **8/8** |
| `check-runway-text-to-video` | **6/6** |
| `check-runway-image-to-video` (I2V) | **23/23** |
| `tsc --noEmit` | passed |
| ESLint změněných souborů | 0 errors |

Povinné body 1–44 jsou pokryté touto sadou (strategie/originalita, canonical autorita, překlad, Runway, UI, Approve, scene integrity, clip split, double budget, retry bez duplicitního POST, Step 1–5D, still/I2V, tsc/eslint).

---

## 15. Nulové skutečné provider requesty

Potvrzeno: implementace i testy nevolaly Claude, OpenAI, ElevenLabs ani Runway. Test harnessy používají fake providery / statické fixture. Žádný nový production run.

---

## 16. Still / I2V beze změny

Potvrzeno:

- `runCreativePipeline` volá Video Concept + Opening Impact **jen když `packageVideoMode !== text_to_video`**.  
- `alignOpeningVoiceover` běží jen na still.  
- Scene Intent LLM běží jen na still.  
- I2V soubory (`check-runway-image-to-video`, image-to-video worker cesta) se v diffu neobjevily.  
- Still příklady v promptech (včetně historického slow push-in) zůstaly — T2V příklady byly odděleny (pekárna / fyzická akce, ne nod-once).

---

## 17. Lze po nasazení vytvořit jeden nový kontrolovaný T2V run?

**Ano — jeden nový kontrolovaný T2V run je správný další krok po nasazení tohoto kódu.**  
Má ověřit, že strategy vybere jiný pain a jinou scenario family než `outsider_checks_silent_company_profile`, že jeden Claude výstup drží hook/VO/storyboard, že EN zůstane `still hiring`, a že adapter neřídí scénu.

Nespouštějte ho proti starému in-flight draftu (Candidate / Pre-Start / Tab). Ty drafty **nejsou** nový canonical contract.

---

## 18. Jediný zbývající blocker

**Staré T2V drafty bez `t2v_canonical_creative` nelze schválit.** Lze je jen Rejectnout, nebo explicitně nahradit Regenerací (nový Claude výstup, stará verze v historii). Automatický významově-bezezměnný převod starého hybridního Candidate promptu (legible screen + `still open`) by zachoval špatný význam, proto se neprovádí.

Po nasazení tedy:

1. existující cancelled T2V vstoupí do rejection memory;  
2. nový run nesmí zopakovat silent-profile + phone/feed rodinu, pokud existují jiné pain pointy;  
3. první placený T2V má jít jen z **nového** package s contract v1 a prompt contract v3.

Žádný další AI hodnotitel, druhý storyboard ani paralelní kreativní plán se nepřidal. Cíl zjednodušení je splněn: jedna strategie originality + jedna Claude autorita + mechanický adapter.
