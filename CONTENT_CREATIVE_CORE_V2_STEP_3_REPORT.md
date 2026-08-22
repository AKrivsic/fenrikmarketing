# Content Creative Core v2 — Step 3 Report

**Datum:** 2026-08-22  
**Režim:** platformní derivace z approved Creative Core za flagem `CONTENT_CREATIVE_CORE_V2_ENABLED` (default **false**). Flag **nezapnutý**. Žádný ElevenLabs / Runway / OpenAI TTS / FFmpeg / video render. Žádná DB migrace. Offline testy Step 1–3 + `tsc` + ESLint.

Navazuje na Step 1–2 reporty a audit.

---

## 1. Odkud se derived outputs generují

Po **Approve** (Manual Review) nebo **auto-accept** (automatic / text-only):

1. Autorita = `content_creative_core_v2_approved_snapshot`
2. Jeden textový AI request: `derivePlatformOutputsWithProvider` / `buildDerivePlatformOutputsMessages`
3. Persist: `content_derived_outputs_v2` + `platform_outputs` + `content_items`
4. Pokud FB/LI: `generateAndPersistPackageSocialImage` z `social_image_creative_brief`

Orchestrace: `runDerivePlatformOutputsForPackage`  
Async kick (MR Approve): `after()` → `/api/ai/process-creative-core-v2-derive`  
Auto/text-only na workeru: synchronně po `autoAcceptCreativeCoreV2`

---

## 2. Počet textových AI requestů

| Fáze | Počet |
|---|---|
| Platformní texty + social-image brief | **1** |
| Per-platform kreativní requesty | **0** |
| Retry social image | **0** text (jen image provider) |
| Retry text persistence při hotovém obrázku | **0** image |

---

## 3. Placeholdery

- Legacy projekce už **nepíše** `[pending_step_3:…]` — `platform_outputs: {}`
- V2 generate **nevkládá** `content_items` před derivací
- `isPendingStep3Placeholder` / `assertNoPlaceholdersInPersistableCaptions` blokují persist
- `briefHasPersistableContentPayload` odmítne placeholdery i prázdné captions
- AI parse odmítne placeholder captions

---

## 4. Dependency fingerprint

`platform-dependency-fingerprint@1` z:

- core_idea, hook, voiceover, cta_intent, conflict, reveal, payoff  
- language + sorted platforms  

**Neobsahuje:** scény, motion, camera, SFX, timing, voice direction.

VO / idea změna → `invalidateDerivedOutputsForPlatformDependencyChange`  
Scéna 3 → jen `media_projections_stale` (platform texts zůstávají)

---

## 5. Po změně VO

1. Redistribuce excerptů (Step 2)  
2. Invalidace derived outputs + clear `platform_outputs` / `social_image`  
3. Po novém Approve znovu derivace

---

## 6. Po změně scény 3

Platform fingerprint **beze změny** → captions / FB-LI image zůstávají.  
Mediální projekce scény 3 se označí stale pro Krok 4.

---

## 7. Manual Review

1. Core → operátor → Approve (lock snapshot)  
2. Enqueue `content_derived_outputs_v2` status `pending`  
3. Background processor vytvoří texty + social image  
4. Stop před video providery (Krok 4)

---

## 8. Automatic video

Stejná autorita: Core → auto-accept → `runDerivePlatformOutputsForPackage` → stop před placeným videem.

---

## 9. Text-only

`scenes: []`, auto-lock Core, derive jen zvolené platformy, social image pokud FB/LI, **žádný** video job / review wait.

---

## 10. FB/LinkedIn fotografie

Pravidlo beze změny: `packageNeedsSocialImage` = facebook ∨ linkedin.

- Brief z Core (ne video scéna)  
- Raster přes existující `generateAndPersistPackageSocialImage`  
- Sdílený 1:1 asset  
- Package není publishable bez ready image, pokud je povinný  
- Image retry: `imageOnly` / reuse texts  
- Text retry: reuse ready social image

---

## 11. Retry a idempotence

- `idempotency_key` = packageId + source Core FP + dependency FP  
- Claim `owner_token` + lease → concurrent = busy  
- Shodný fingerprint + ready → reuse  
- Změněný fingerprint → stale, žádný reuse  
- Selhání image ponechá `texts_ready: true`

---

## 12. Content items

Vznikají **až** po úspěšné textové derivaci (`persistContentItemsFromDerived`).  
Placeholdery se maže/nahrazují. Metadata: `source: content_creative_core_v2_derived`.

---

## 13. Completeness / Production Run

- `contentPersistComplete: false` dokud v2 items neexistují  
- Operator fáze: Připraveno ke schválení → Tvoří se platformní obsah → Tvoří se FB/LI obrázek → Připraveno pro video → Chyba – zopakovat  
- Video package po Step 3 = content ready, video až Krok 4  
- Text-only nečeká na video

---

## 14. Změněné / nové soubory

**Nové:**  
`derivedOutputsTypes.ts`, `platformDependencyFingerprint.ts`, `placeholderGuard.ts`, `derivePlatformOutputs.ts`, `derivedOutputsState.ts`, `runDeriveOutputs.ts`, `triggerDeriveProcessor.ts`,  
`app/api/ai/process-creative-core-v2-derive/route.ts`,  
`scripts/check-content-creative-core-v2-step3.ts`,  
`CONTENT_CREATIVE_CORE_V2_STEP_3_REPORT.md`

**Upravené:**  
`legacyProjection.ts`, `index.ts`, `generateContentPackage.ts`, `creative-review-admin.ts`, `creative-review/actions.ts`, `CreativeReviewPackagePanel.tsx`, `packageGenerationCompleteness.ts`, `package.json`

---

## 15. Migrace

**Žádná.** Derived outputs v `package_brief`.

---

## 16. Testy

| Suite | Výsledek |
|---|---|
| Step 1 memory | 12 passed |
| Step 1 core | 10 passed |
| Step 2 | 18 passed |
| Step 3 | 25 passed |
| `tsc --noEmit` | OK |
| ESLint (změněné) | OK |

---

## 17. Skutečný AI/image/provider request

**Ne** — offline Step 3; flag OFF; žádný produkční běh.

---

## 18. Blocker před Krokem 4

Krok 4 musí:

1. Napojit Continue / video workers na **approved Core** (bez přepisu)  
2. ElevenLabs timing-only + Runway/still render  
3. Full still/T2V/worker regresi  
4. Flag rollout plán  

---

## Stručné odpovědi

| Otázka | Odpověď |
|---|---|
| Mohou se placeholdery dostat k publikaci? | **Ne** |
| Kolik textových AI requestů vytváří platformní výstupy? | **1** |
| Vznikne FB/LinkedIn fotografie vždy, když je požadovaná? | **Ano** (pokus + completeness gate) |
| Opakuje retry obrázku generaci captions? | **Ne** |
| Změní editace scény 3 platformní texty? | **Ne** |
| Změní editace voiceoveru platformní texty? | **Ano** (invalidace) |
| Čeká text-only package na video? | **Ne** |
| Volá Krok 3 ElevenLabs nebo Runway? | **Ne** |
| Změnila se produkce při flagu OFF? | **Ne** |
| Je bezpečné pokračovat Krokem 4? | **Ano** (flag dál OFF) |
