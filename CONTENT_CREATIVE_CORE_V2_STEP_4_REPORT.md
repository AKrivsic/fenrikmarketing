# Content Creative Core v2 — Step 4 Report

**Datum:** 2026-08-22  
**Režim:** finální napojení approved Creative Core → still/T2V renderery + durable derive recovery.  
**Creative Core flagy:** **odstraněny** — nové package vždy v2; routing starých podle uloženého kontraktu; placené video přes existující paid/budget/preflight brány.  
**Žádný deploy, žádná migrace, žádný skutečný provider request.**

Navazuje na Step 1–3 reporty a audit.

---

## 1. Finální datový tok — video package (v2)

```
strategie (v2 memory / originality)
  → jeden Creative Core (scény 4–5)
  → Manual Review (Approve | Vytvořit jiný návrh | Reject)
       nebo Automatic: auto-accept Core
  → content_creative_core_v2_approved_snapshot (immutable)
  → durable enqueue content_derived_outputs_v2 (pending)
  → derive: 1× text AI → platformní texty + content_items
       + FB/LI social image (po Approve; není video médium)
  → pokud chybí confirm_paid_run / budget (T2V) → awaiting_paid_video, 0 video providerů
  → pokud paid gates OK:
       mechanická projekce Core → visual_scenes / VO / hook
       → video_jobs (existující still nebo T2V worker)
       → ElevenLabs / Runway / still image+TTS+FFmpeg (existující)
  → MP4 + thumbnail → hotový Content Package
```

Žádná pozdější fáze nesmí kreativní přepisovat schválený Core.

---

## 2. Finální datový tok — text-only (v2 ON)

```
strategie → Creative Core bez scén → lock/auto-accept
  → derive platform texts (+ FB/LI image pokud platformy vyžadují)
  → content_items
  → hotový package
```

Text-only **nikdy** nevytváří `video_jobs` ani nevolá video-worker.

---

## 3. Oprava async spolehlivosti (Krok 3 gap)

| Vrstva | Role |
|---|---|
| `package_brief.content_derived_outputs_v2` | Durable stav (pending / claim / idempotency) **před** kickem |
| Vercel `after()` | Pouze kick — **není** durable fronta |
| `CONTENT_PACKAGE_WORKER_URL` `/recover-creative-core-v2-derive` | Preferovaný durable worker recovery |
| Fallback `/api/ai/process-creative-core-v2-derive` | Same-deploy kick |
| `reconcileProductionRun` | Volá recover při reconcile konkrétního runu |
| **n8n cron ~2 min** → `/api/internal/production-run-recovery` → `runScheduledProductionRecovery` | **Automatický** recover všech stuck v2 derive (i když run je `waiting_for_creative_review`) |
| Operator „Zopakovat“ | Jen při `error_retry` (auto recovery selhala / stuck timeout 10 min) |
| Operator „Zopakovat“ | Jen při `error_retry` (auto recovery selhala) |

Chování:

1. Approve uloží pending dřív než dispatch.  
2. Worker pozná zbývající práci z briefu + claim.  
3. Ztracený `after()` lze obnovit workerem / reconcile / Zopakovat.  
4. Retry používá claim + idempotency key.  
5–6. Hotové texty / social image se neopakují.  
7. Dva workery: busy claim → druhý skip.  
8. Expirovaný claim = recovery eligible.  
9–10. UI bez technických claimů; jen „Zopakovat“ při chybě.

---

## 4. Napojení still rendereru

- Po derive + media gate: `applyApprovedCoreToPackageBriefForVideo` → `buildVideoJobInput` → existující still pipeline.
- Scény = 1:1 z approved Core (`projectApprovedCoreScenesToVisualScenes`).
- Hook / VO z snapshotu; žádný nový storyboard / Concept / Opening AI.
- Continue Generation pro v2: stejná projekce místo `rebuildCreativePackageForVideo` story invent.
- Flag OFF: legacy still beze změny.

---

## 5. Napojení T2V rendereru

- Stejný approved Core → stejné `visual_scenes` jako still.
- Existující ElevenLabs v3 + Runway Gen-4.5 + assembly + 1080×1920.
- Technický split / alignment: existující kontrakty (timing-only; kreativní scény neměnné).
- `startVideoFromApprovedCreativeCore` **nevolá** ElevenLabs/Runway — pouze queue job; worker běží až při MEDIA_ENABLED.

---

## 6. Editace a invalidace

Jednosměrně: myšlenka → VO → scény → mediální projekce → video.

| Změna | Efekt |
|---|---|
| VO před Approve | Redistribuce excerptů; invalidace derived texts+image |
| Scéna 3 | Jen media projection stale; captions/social beze změny |
| Po Approve | Snapshot immutable; další edit = nová revize |

---

## 7. Timing-only ElevenLabs

Zachováno existující chování: alignment mění timing/plan, ne text, ne počet kreativních scén, ne pořadí. Ověřeno regresí T2V step suites.

---

## 8. Technický split dlouhých scén

Existující `technicalClipSplit`: neviditelné klipy, VO coverage přesně jednou, žádný klip nad provider limit. Kreativní scény beze změny.

---

## 9. Budget pořadí (T2V)

Zachováno existující pořadí:

1. validace Core/scén  
2. dry-run / preflight  
3. budget 1 → ElevenLabs  
4. alignment + technical split  
5. budget 2 → Runway  
6. audio/assembly  

Budget fail po voice → 0 nových Runway POSTů; voice se neopakuje.

---

## 10. Completeness

**Video:** approved Core + derived ready + content items + social (pokud povinný) + video job completed + MP4 + thumbnail + ne media_blocked + žádný placeholder.

**Text-only:** Core locked + derived ready + items + social (pokud povinný) + žádný video job.

Helpers: `isCreativeCoreV2VideoPackageComplete` / `isCreativeCoreV2TextOnlyPackageComplete`.

---

## 11. Automatic vs Manual Review

| | Manual Review | Automatic |
|---|---|---|
| Core | Operátor Approve | `autoAcceptCreativeCoreV2` |
| Derive | Async po Approve | Sync na content-package-worker |
| Video | Auto po derive pokud MEDIA + paid gates | Stejně (`startVideoFromApprovedCreativeCore`) |
| Extra klik | Ne (kromě chyby / paid / budget / config) | Ne |

---

## 12. Flagy

| Flag | Default | Význam |
|---|---|---|
| `CONTENT_CREATIVE_CORE_V2_ENABLED` | `false` | Strategie + Creative Core + MR + derive texts/image |
| `CONTENT_CREATIVE_CORE_V2_MEDIA_ENABLED` | `false` | Povolí video média (ElevenLabs, Runway, still video image gen, FFmpeg video) |

**Media gate scope:** pouze **video média**.  
FB/LinkedIn social image = Step 3 content derivation (po Approve), **není** blokovaná media flagem.

Kombinace pro kvalitativní test: `V2=true`, `MEDIA=false` → Core + texty/image po Approve, 0 placeného videa.

---

## 13. Změněné / nové soubory (hlavní)

**Nové**

- `lib/content-creative-core-v2/projectApprovedCoreForVideo.ts`
- `lib/content-creative-core-v2/videoGates.ts`
- `lib/content-creative-core-v2/recoverDerive.ts`
- `lib/content-creative-core-v2/startVideoFromApprovedCore.ts`
- `lib/content-creative-core-v2/completeness.ts`
- `scripts/check-content-creative-core-v2-step4.ts`
- `CONTENT_CREATIVE_CORE_V2_STEP_4_REPORT.md`

**Upravené**

- `lib/content-creative-core-v2/featureFlag.ts` (+ media flag)
- `lib/content-creative-core-v2/triggerDeriveProcessor.ts` (worker prefer)
- `lib/content-creative-core-v2/index.ts`, `derivedOutputsState.ts`
- `app/api/ai/process-creative-core-v2-derive/route.ts`
- `content-package-worker/server.ts` (`/recover-creative-core-v2-derive`)
- `lib/ai/workflows/generateContentPackage.ts`, `continueCreativeReviewGeneration.ts`
- `lib/api/production-run-admin.ts` (reconcile recovery)
- `lib/api/creative-review-admin.ts`, `actions.ts`, `CreativeReviewPackagePanel.tsx`
- `package.json` (`check:content-creative-core-v2-step4`)
- `scripts/check-content-creative-core-v2-core.ts` (vědomá úprava kontraktu)

---

## 14. Migrace

**Žádná.** Stav v `package_brief` (snapshot, derived, media_blocked).

---

## 15. Výsledky regrese

| Suite | Výsledek |
|---|---|
| `check:content-creative-core-v2-memory` | 12/12 |
| `check:content-creative-core-v2-core` | 10/10 |
| `check:content-creative-core-v2-step2` | 18/18 |
| `check:content-creative-core-v2-step3` | 25/25 |
| `check:content-creative-core-v2-step4` | 25/25 |
| `check:content-strategy-plan` | 13/13 |
| `check:production-run` | 32/32 |
| `check:production-canonical-video-plan` | pass |
| `check:production-t2v-scene-integrity` | pass |
| `check:production-t2v-technical-clip-split` | pass |
| `check:production-t2v-voice-control-plane` | pass |
| `check:production-t2v-simplified-creative-pipeline` | 39/39 |
| `check:dispatch-worker-contract` | 13/13 |
| `check:production-runtime` | 24/24 |
| `check:production-text-to-video-creative-review-fix` | pass |
| `check:social-image` | 15/15 |
| `scripts/check-creative-review-phase6.ts` | pass |
| `tsc --noEmit` | pass |
| ESLint (změněné soubory) | pass |

**Poznámka:** `check:content-package-guardrails` má 2 fail (CTA `learn_more` / `lead`) — preexistující, nesouvisející se Step 4; neupraveno.

Žádný živý Claude / OpenAI / ElevenLabs / Runway / image provider request během implementace ani automatických testů.

---

## 16. Vědomě změněné staré testy

| Test | Proč |
|---|---|
| `check-content-creative-core-v2-core.ts` — „continue stays legacy“ | Step 4 záměrně napojuje Continue na approved Core projekci za flagem. Nový assert: Continue **obsahuje** `briefUsesApprovedCreativeCoreV2` + flag gate; pipeline zůstává bez v2. Legacy při flagu OFF beze změny. |

---

## 17. Nulové skutečné provider requesty

Potvrzeno: offline/fake suites; Step 4 media path při default flazích nevytváří video job; derive/startVideo neobsahují POST na ElevenLabs/Runway.

---

## 18. Deployment kroky (neprovedeno)

1. **Vercel deploy** — ano (Next app: Approve kick, API derive, Continue, UI Zopakovat).  
2. **Rebuild content-package-worker** — ano (`/recover-creative-core-v2-derive` + generate derive→video).  
3. **Rebuild video-worker** — ne nutné pro Step 4 wiring (čte job input); deploy až před prvním placeným runem s MEDIA ON.  
4. **Flagy na prostředí**  
   - Preview/Staging: nejdřív oba OFF; pak V2 ON + MEDIA OFF pro kvalitativní test.  
   - Production: stejný postup; MEDIA ON až po kvalitě Core.  
5. **Migrace** — ne.  
6. **n8n** — volitelně: může volat recover endpoint jako transport; kreativní autorita beze změny.  
7. **Existující ElevenLabs/Runway env** — beze změny (potřeba až při MEDIA ON).

---

## 19. Rollback

- Vypnout `CONTENT_CREATIVE_CORE_V2_ENABLED` (a volitelně MEDIA).  
- Nové package jdou legacy cestou.  
- Již vytvořené v2 package: brief se snapshotem/derived zůstane v DB; bez flagu se v2 cesta neaktivuje. Placené artefakty se nemažou.  
- Operátor: nedokončené v2 package nechat / zrušit; nové runy legacy.

---

## 20. Kvalitativní test po nasazení (nespouštěno automaticky)

1. Deploy s `CONTENT_CREATIVE_CORE_V2_ENABLED=false`, `MEDIA=false`.  
2. Zapnout `CONTENT_CREATIVE_CORE_V2_ENABLED=true`.  
3. Ponechat `CONTENT_CREATIVE_CORE_V2_MEDIA_ENABLED=false`.  
4. Jeden Manual Review video package.  
5. Kontrolovat jen: originalita tématu, síla hooku, VO, 4–5 scén, rozdíl proti posledním tématům.  
6. **Bez Approve** a bez placených médií (nebo Approve jen pro text/image derive — stále 0 video providerů).  
7. Při špatné kvalitě max 1× „Vytvořit úplně jiný návrh“.  
8. Až po kvalitativním OK řešit MEDIA ON + první placený T2V.

Offline testy **neprohlašují** kreativní kvalitu za ověřenou.

---

## 21. Blockery před prvním placeným T2V

1. Úspěšný kvalitativní Core review (sekce 20).  
2. Explicitně zapnout `CONTENT_CREATIVE_CORE_V2_MEDIA_ENABLED=true` na cílovém prostředí.  
3. Ověřit ElevenLabs + Runway env + budget / paid confirmation flow.  
4. Rebuild/deploy video-worker pokud není aktuální.  
5. První paid run s vědomým budgetem a monitorem retry/idempotency.

---

## Krátké odpovědi

| Otázka | Odpověď |
|---|---|
| Existuje při v2 více než jedna kreativní autorita? | **Ne** — pouze approved Creative Core snapshot. |
| Může renderer změnit schválený příběh? | **Ne** — pouze mechanická projekce / timing / technical clips. |
| Používají still a T2V stejné scény? | **Ano** — stejný approved Core. |
| Může ztracený async dispatch nechat package trvale viset? | **Ne** — n8n recovery cron ~2 min + stuck→error_retry ≤10 min + Zopakovat. |
| Vyžaduje MR po Approve další běžné kliknutí? | **Ne** (jen při chybě / paid / budget / config). |
| Vytvoří text-only video job? | **Ne**. |
| Je FB/LinkedIn fotografie zachována? | **Ano** — součást derive po Approve; media flag ji neblokuje. |
| Lze otestovat reálný Creative Core bez placeného videa? | **Ano** — V2 ON + MEDIA OFF. |
| Proběhl při implementaci skutečný provider request? | **Ne**. |
| Co zbývá před prvním placeným T2V? | Kvalitativní OK Core → MEDIA ON → provider env + budget → první vědomý paid run. |

---

## Finální pre-deploy kontrola Step 4B

**Datum kontroly:** 2026-08-22  
**Účel:** ověřit durable recovery, MEDIA=false náklady, CTA guardrails, úplnou regresi, flagy, rollback.  
**Flagy nezapnuté. Deploy neproveden. Žádný skutečný provider request.**

### 1. Skutečný recovery řetězec (z kódu)

```
Approve (creative-review-admin)
  → enqueueDerivedOutputsPending (durable pending v package_brief)  [PŘED kickem]
  → content_creative_core_v2_derive_requested_at
  → after() → triggerCreativeCoreV2DeriveProcessor
       → prefer CONTENT_PACKAGE_WORKER_URL/recover-creative-core-v2-derive
       → fallback /api/ai/process-creative-core-v2-derive
  → recoverCreativeCoreV2DeriveForPackage
       → runDerivePlatformOutputsForPackage (claim + idempotency)
       → completed | busy | failed→error_retry

Automatický transport (bez otevření UI):
  n8n „Production Run Recovery — Every 2 Minutes“
    → POST /api/internal/production-run-recovery
    → runScheduledProductionRecovery
       → markStuckDeriveOutputsForOperatorRetry (≥10 min → failed)
       → recoverPendingCreativeCoreV2DeriveJobs (pending/expired/failed)
```

| Otázka | Odpověď z kódu |
|---|---|
| Kdo volá `/recover-creative-core-v2-derive`? | `triggerCreativeCoreV2DeriveProcessor` (Approve/Zopakovat kick) pokud je `CONTENT_PACKAGE_WORKER_URL`; jinak Vercel API. Cron volá recovery route, ne přímo worker URL. |
| Je to jen jednorázový `after()`? | **Kick ano** — ale **není** jediná cesta. |
| Pravidelný cron? | **Ano** — existující n8n recovery každých ~2 min. |
| Kdo volá `reconcileProductionRun`? | UI production poll, video callbacks, start-video, review cards (queued/running), recovery cron. |
| Obnoví se bez otevření UI? | **Ano**, pokud běží n8n recovery cron (~2 min). |
| Za jak dlouho? | Typicky ≤ ~2 min; stuck pending bez úspěchu → `error_retry` po **10 min**. |
| Navždy pending bez Zopakovat? | **Před 4B: ano riziko** (cron scanoval jen queued/running; MR zůstává waiting_for_creative_review). **Po 4B opravě: ne.** |

### 2–3. Úzká oprava recovery

**Problém:** `runScheduledProductionRecovery` reconciloval jen `queued`/`running`. Manual Review po Approve zůstává `waiting_for_creative_review` → ztracený kick mohl nechat derive navždy `pending` a UI ukazovalo „Tvoří se…“ **bez** „Zopakovat“.

**Oprava (minimální, existující cron):**

- `lib/production-runtime/runRecovery.ts` — po batch reconcile volá `markStuckDeriveOutputsForOperatorRetry` + `recoverPendingCreativeCoreV2DeriveJobs`
- `lib/content-creative-core-v2/stuckDerive.ts` — 10min stuck → error_retry
- Rollback-safe: Continue/video gate na **snapshot presence**, ne jen V2 env flag

### 4. Tabulka requestů při `V2=true`, `MEDIA=false`

| Okamžik | Strategy AI | Creative Core | Překlad (editor lang ≠ EN) | Platform derive AI | FB/LI image | OpenAI TTS | ElevenLabs | Runway | Video scene images | FFmpeg |
|---|---|---|---|---|---|---|---|---|---|---|
| 1. Vytvoření MR package | pokud běží strategy | **ano** | **ano** (seed MR) | ne | **ne** (defer) | ne | ne | ne | ne | ne |
| 2. Otevření review | ne | ne | ne | ne | ne | ne | ne | ne | ne | ne |
| 3. „Vytvořit jiný návrh“ | ne | **ano** | možná | ne | ne | ne | ne | ne | ne | ne |
| 4. Approve | ne | ne | ne | **ano** | **ano** pokud FB/LI | ne | ne | ne | ne | ne |
| 5. Automatic package | pokud strategy | **ano** | dle seed | **ano** (sync) | **ano** pokud FB/LI | ne | ne | ne | ne | ne |
| 6. Text-only | pokud strategy | **ano** (bez scén) | dle seed | **ano** | **ano** pokud FB/LI | ne | ne | ne | ne | ne |

Potvrzení:

- Bez Approve: **0** obrazových/video médií (social deferred).
- Approve: **může** spustit FB/LI social image.
- MEDIA=false: **0** ElevenLabs / Runway / video scene image / video FFmpeg / OpenAI TTS pro video.
- Automatic + FB/LI při MEDIA=false: **placený social image ano**.
- Text-only + FB/LI: **placený social image ano**.

### 5. CTA guardrail vyšetření

| | |
|---|---|
| Failures | fixture `learn_more` na `problem_aware`; `lead` bez `conversion` stage |
| Preexistující? | **Ano** — guardrail od `316ca99` (soft-only CTA); fixture od MVP `caf74e2` neaktualizován. `git diff HEAD` na guardrails/types = žádná v2 změna. |
| Ovlivní v2 derive? | **Ne přímo** — `runDeriveOutputs` nevolá `checkContentPackageGuardrails`; v2 CTA typicky `other` / platform string CTA. |
| Nesprávný CTA / nepublikovatelné itemy? | Legacy generate path guardrails stále platí; v2 derive není stejný gate. Fixture bug ≠ produkční regress v2. |
| Oprava | Fixture opraven: soft `follow` pro problem_aware; `lead` jen na `conversion` + `lead_generation`. Produkční logika CTA **nezměněna**. Suite nyní **29/29**. |

### 6. Úplný seznam spuštěných regresí (4B)

| Suite | Výsledek |
|---|---|
| content-creative-core-v2-memory/core/step2/step3/step4 | pass (step4: 34) |
| content-strategy-plan | 13/13 |
| production-run | 32/32 |
| social-image | 15/15 |
| content-package-guardrails | 29/29 (opraveno) |
| dispatch-worker-contract | 13/13 |
| production-runtime | 24/24 |
| phase-6g-runtime-hardening | 20/20 |
| production-canonical-video-plan | pass |
| production-t2v-scene-integrity | pass |
| production-t2v-technical-clip-split | pass |
| production-t2v-voice-control-plane | pass |
| production-t2v-simplified-creative-pipeline | 39/39 |
| production-text-to-video-creative-review-fix | pass |
| video-sync | 7/7 |
| video-clip-render | pass |
| audio-mix / video-reel-orchestrator / video-reel-assembly | pass (v řetězci) |
| ai-video-worker-integration (+11b/c/d) | pass |
| creative-review-phase6 | pass |
| tsc --noEmit | pass |
| ESLint (změněné 4B soubory) | pass |

### 7. Relevantní vynechané testy a proč

| Suite | Důvod vynechání |
|---|---|
| `check:creative-review-phase5` | Node strip-types crash na `private readonly` v fixture deps (nesouvisí s v2; phase6 pass) |
| `check:runway-scene-test` / live Runway | Live/provider-oriented — zákaz skutečných requestů |
| `check:component-capture-*` | Mimo content Core / video package scope |
| `check:website-*`, funnel/asset admin | Mimo v2 content generation path |
| `check:localize-content-package` | Localization variant path; v2 seed translation covered by step2 #14 |
| `check:openai-tts-voices` | Still TTS; MEDIA=false nevystavuje; covered nepřímo video-clip/audio |
| `check:n8n-routing` | Routing contract; recovery napojení ověřeno source wiring phase-6g + runRecovery |

### 8. Flagy podle procesů

| Proces | V2 flag | MEDIA flag | Chybí-li | Restart |
|---|---|---|---|---|
| **Vercel** (generate, plan, Approve kick, Continue, UI, recovery API) | **ano** — `isContentCreativeCoreV2Enabled` | **ano** — media gate / startVideo | V2 OFF → legacy generate; snapshot package stále gated přes snapshot | Deploy/restart serverless |
| **content-package-worker** | ano (stejný kód generate/derive/recover) | ano (startVideo/media block) | Stejné chování jako Vercel | **Rebuild/restart worker** |
| **video-worker** | **nečte** flagy | **nečte** | Dostane job jen pokud Vercel/worker vytvoří video_jobs (media gate) | Rebuild až před MEDIA ON |
| **n8n** | ne | ne | Jen transport cron → recovery API | Žádná změna workflow nutná |

### 9. Rollback scénář

1. V2 MR package + Core + derived pending.  
2. Admin vypne `CONTENT_CREATIVE_CORE_V2_ENABLED`.  

| | |
|---|---|
| Package bezpečný? | **Ano** — snapshot/derived zůstávají v briefu. |
| Publikovat neúplný? | **Ne** — completeness/publishable helpers; placeholder guard. |
| Pokračovat po zapnutí? | **Ano** — recover/Zopakovat na stejném durable stavu. |
| Legacy přepíše Core? | **Ne** — Continue používá `briefUsesApprovedCreativeCoreV2` (snapshot), ne inventovaný rebuild. |
| Video při flagu OFF? | **Ne** — `creativeCoreV2VideoMediaAllowed()` vyžaduje oba flagy. |
| Ručně zrušit? | **Ne nutně** — lze dokončit po re-enable, nebo cancel. |

### 10. Změněné soubory (4B)

- `lib/production-runtime/runRecovery.ts`
- `lib/content-creative-core-v2/recoverDerive.ts`
- `lib/content-creative-core-v2/stuckDerive.ts` (nový)
- `lib/content-creative-core-v2/derivedOutputsState.ts`
- `lib/content-creative-core-v2/videoGates.ts`
- `lib/ai/workflows/continueCreativeReviewGeneration.ts`
- `app/api/internal/production-run-recovery/route.ts` (komentář)
- `scripts/check-content-package-guardrails.ts`
- `scripts/check-content-creative-core-v2-step4.ts` / `…-core.ts`
- `CONTENT_CREATIVE_CORE_V2_STEP_4_REPORT.md`

### 11. Testy

Step 4 suite rozšířena o 4B.1–4B.8 (recovery cron, stuck, dual claim, media costs wiring, rollback gate, CTA fixture).

### 12. Migrace

**Žádná.**

### 13. Nulové skutečné provider requesty

**Potvrzeno** — pouze offline/fake suites.

### 14. Verdikt

| | |
|---|---|
| Deploynout s oběma flagy OFF? | **Ano — bezpečné.** |
| Zapnout V2 ON + MEDIA OFF? | **Ano — bezpečné pro kvalitativní Core** (po Vercel + content-package-worker deploy). |
| Co může stát peníze i tak? | Strategy AI, Creative Core Claude, editor překlad, po Approve/auto: platform derive AI + **FB/LI social image**. |
| První MR návrh bez Approve? | **Ano** — 0 obrazových/video médií; platí jen text AI + případný překlad. |

---

## Krátké odpovědi (4B)

| Otázka | Odpověď |
|---|---|
| Obnoví se ztracený dispatch bez otevření UI? | **Ano** — n8n recovery cron ~2 min. |
| Může package zůstat navždy pending? | **Ne** (po 4B) — cron recover + 10min → error_retry + Zopakovat. |
| Co přesně může stát peníze při MEDIA=false? | Strategy, Creative Core, překlad, po Approve/auto derive text AI + FB/LI image. **0 video providerů.** |
| Jsou CTA guardrail failures bezpečné? | Byly **stale fixture**; opraveny. Produkční soft-CTA pravidla beze změny; v2 derive je nevolá. |
| Prošla celá relevantní regrese? | **Ano** (viz §6); vynechané relevantní uvedeny v §7. |
| Kde musí být oba flagy? | **Vercel + content-package-worker** (env). Video-worker flagy nečte. |
| Je rollback bezpečný? | **Ano** — snapshot authority; bez legacy přepisu Core; bez unpaid video. |
| Můžeme deploynout? | **Ano** (flagy OFF). |
| Můžeme vytvořit první skutečný návrh bez placených médií? | **Ano** — V2 ON + MEDIA OFF, bez Approve (nebo Approve jen s vědomím social image nákladu). |