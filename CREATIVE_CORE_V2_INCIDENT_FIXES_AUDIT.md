# Creative Core v2 — audit oprav po produkčních incidentech

**Datum auditu:** 2026-08-22  
**Auditor:** read-only (kód, git, offline testy, read-only Supabase metadata)  
**Repo:** `fenrikmarketing`

---

## Manažerské shrnutí

| Oblast | Stav | Pokračovat na staging/E2E? |
|--------|------|----------------------------|
| **1. Fingerprint + voiceover soft clamp** | **OPRAVA PROKÁZÁNA** na `main` (commit `85c7dd1`) | Ano, s výhradou: úspěšný clamp není viditelný operátorovi v briefu |
| **2. Claude timeout + telemetry** | **OPRAVA PROKÁZÁNA** na `main` (commit `3fbb5d9`, HEAD) | Ano; timeout n8n → worker **NEOVĚŘENO** v repu |
| **3. Strategy Originality history** | **ČÁSTEČNĚ PROKÁZÁNA** — implementace jen ve **working tree**, na `origin/main` stále starý mechanismus (60 balíčků u validátoru) | **Ne** pro originality fix, dokud není commit + deploy; ostatní CCv2 ano |

**Co je správně:** Server přepisuje `creative_fingerprint` deterministicky; soft clamp je omezený (max +5 slov) a udržuje větu; Creative Core v2 volá Claude s 180 s × 1 transport; pipeline telemetry ukládá metadata, ne celý prompt (Creative Core krok); ve working tree je jednotný snapshot 50 pro prompt + validátor + repair.

**Co je špatně / riziko:** Originality oprava **není na produkční větvi** (`git show HEAD:planContentStrategy.ts` stále `.limit(60)`). Failure path `buildCreativeCoreFailureLastRaw` může obsahovat celý voiceover (bounded). Strategie originality bundle **neukládá** explicitně `provider_request_id` ani samostatné pole `weighted_score`. Explicitně creative-rejected balíčky jsou z historie vyřazeny — může znovu povolit opakování nedávno odmítnutého nápadu, pokud není jiný hard signál.

**Neověřeno:** n8n HTTP timeout pro generate-content-package; produkční hodnota `PACKAGE_GENERATION_LEASE_SECONDS` v runtime env; plná velikost production strategy promptu včetně Product Brain (offline měření selhalo na neúplném mock projektu).

---

## A. Git stav

| Položka | Hodnota |
|---------|---------|
| Branch | `main` |
| HEAD | `3fbb5d966f2bf93a88b90ab0fc7018c72ae861a7` |
| Poslední commit | `3fbb5d9` — Align Creative Core v2 Claude timeout… |
| Tracking | `main...origin/main` (bez ahead/behind v okamžiku auditu) |

**Working tree (necommitnuto):** 12 modified + 3 untracked soubory — **Strategy Originality v2** a související UI/telemetry.

**Smysluplné diff rozsahy:**

| Incident | Commit na `main` | Audit kódu |
|----------|------------------|------------|
| Fingerprint + VO | `85c7dd1` … `3fbb5d9` | `git show 85c7dd1` + aktuální `createCreativeCore.ts` |
| Timeout + telemetry | `3fbb5d9` | `git show 3fbb5d9` |
| Originality history | **není commitnuto** | `git diff 3fbb5d9` (working tree vs HEAD) |

**Nesouvisející změny v originality diffu:** ne — diff je soustředěný na strategy originality, production actions, failure telemetry, config/memory, test script.

---

## B. Fingerprint incident

**Tok (kód):** Claude → `createCreativeCore` → JSON parse → `parseCreativeCoreResponse` → `applySoftVoiceoverClamp` (video) → `applyDeterministicCreativeFingerprint` → `validateCreativeCore` → persist přes pipeline.

### Odpovědi z kódu

| # | Otázka | Závěr | Důkaz |
|---|--------|-------|-------|
| 1 | Posílá Claude `creative_fingerprint`? | Ano, v JSON tvaru (volitelné) | Prompt schema v `buildCreativeCoreMessages` (`createCreativeCore.ts` ~174, ~115) |
| 2 | Je LLM hodnota jen diagnostická? | **Ano** — systém říká „server recomputes“ | `createCreativeCore.ts` ~115–116, ~511–525 |
| 3 | Kde autoritativní fingerprint? | `fingerprintFromCreativeCore` / `applyDeterministicCreativeFingerprint` | `createCreativeCore.ts` ~288–298, ~517–525, ~599–602 |
| 4 | Po normalizaci Core? | Ano — parse normalizuje stringy/scény, pak fp | `parseCreativeCoreResponse` ~498–525 |
| 5 | Po soft clamp přepočet? | **Ano** — uvnitř clamp i po clamp s pain | `createCreativeCore.ts` ~357–358, ~594–602 |
| 6 | Sync hook / excerpts / timing / fp? | Hook + scene excerpts + fp **ano**; **estimated timing jako pole se neaktualizuje** (jen prompt pravidla ~20–30 s) | Clamp ~339–354; `redistributeVoiceoverAcrossScenes` — bez duration polí |
| 7 | Persisted Core s fp před poslední úpravou? | **Ne** na success path — dvojitý `applyDeterministicCreativeFingerprint` po clamp | ~357–358, ~599–602 |
| 8 | Může LLM fp způsobit validation fail? | **Ne** jako autorita — validate porovnává server fp s `fingerprintFromCreativeCore(core)`; LLM fp je přepsán dříve | `validate.ts` ~228–243 |
| 9 | Stabilita stejného vstupu? | Testováno (key order, null pain) | `check-content-creative-core-v2-fingerprint-regression.ts` |
| 10 | Kanonická serializace? | `fingerprintFromCreativeCore` + normalizace textu | `fingerprint.ts`, regression test 4–5 |

**LLM fingerprint se nepoužívá pro:** idempotency (`generateContentPackage` claim/owner_token), approved snapshot (server core), platform dependency hash (text fields + snapshot fp z approved core), provider request, retry/reuse (derived outputs používají `platformDependencyFingerprint` / approved hash — ne LLM fp).

**Výjimka / pozor:** `ensureStrategyFingerprint` ponechá existující fp, pokud `version === creative-fingerprint@2` (`createCreativeCore.ts` ~648–649) — v `planContentStrategy` se pro gate vždy volá `computeCreativeFingerprint` na kandidáta (working tree).

**Verdikt incident 1:** **OPRAVA PROKÁZÁNA** (na `main`).

---

## C. Voiceover soft clamp

**Konfigurace:** max 90 slov, min 40, overshoot max **5** (`softClampVoiceover.ts` ~63–91, `config.ts` voiceoverWordMin/Max).

| Scénář | Chování (kód + regression) |
|--------|----------------------------|
| ≤ 90 slov | Beze změny |
| 91 slov (+1) | Trim z head věty, CTA věta zachována — test 7 |
| +5 slov | Stejný mechanismus, pokud lze u větné hranice |
| +6 / extrémně dlouhý | `overshoot_too_large` → clamp fail → validation fail na word count |
| Poslední věta bez tečky | `trimWordsBeforeTerminalPunctuation` vyžaduje interpunkci na posledním tokenu |
| Zkratky / Unicode | Počítání: `trim().split(/\s+/)` — **NEOVĚŘENO** pro všechny Unicode mezery mimo běžné `\s` |

1. **Co se ořízne:** Slova těsně před koncovou interpunkcí v „head“ větách, finální věta (CTA/payoff) preferovaně intact (`softClampVoiceover.ts` ~93–127).  
2. **Význam / CTA:** Design preferuje zachování poslední věty — **obsahové riziko** při trimu head vět.  
3. **Uprostřed věty:** Ne — jen před terminal punctuation tokenem.  
4.–5. **Hook:** Po clamp = první věta VO (`createCreativeCore.ts` ~339–345); důvod: `validateCreativeCore` vyžaduje `hookStartsVoiceover`.  
6. **Nesoulad hook / scéna 1:** Po clamp se redistribuují `voiceover_excerpt` (`~347–354`); pokud redistribute selže, excerpts mohou zůstat staré — **hraniční riziko**.  
7. **Skrytá oprava pro operátora:** Na **úspěchu** se `voiceover_soft_clamp` **nepersistuje** do briefu — jen v `buildCreativeCoreFailureDiagnostics`. Operátor nevidí, že VO bylo zkráceno.  
8. **Diagnostika:** Ano při fail — `diagnostics.voiceover_soft_clamp`; failure `lastRaw` může obsahovat VO až ~800 znaků po slim (`createCreativeCore.ts` ~406–467).

| Verdikt | Hodnocení |
|---------|-----------|
| Technicky bezpečné | Ano pro +1…+5 při větné hranici |
| Obsahově přijatelné | Většinou (CTA preserved) |
| Obsahové riziko | Trim head vět; neviditelný clamp při úspěchu |

---

## D. Claude timeout — tabulka cesty

| Vrstva | Limit (důkaz v repu) | Poznámka |
|--------|----------------------|----------|
| **Creative Core Claude wrapper** | **180 000 ms**, **1** transport | `runContentPackage.ts` ~26–27; `runPipeline.ts` ~148–178 |
| **HTTP default (bez override)** | 60 000 ms × 3 | `HTTP_TIMEOUT_MS.ai` — CCv2 **nepoužívá** pro Creative Core krok |
| **Vercel route** generate-content-package | `maxDuration = 300` | `app/api/n8n/generate-content-package/route.ts` |
| **Vercel route** process-creative-core-v2-derive | `maxDuration = 300` | `app/api/ai/process-creative-core-v2-derive/route.ts` |
| **content-package-worker** | **NEOVĚŘENO** (forward na shared handler, bez vlastního timeoutu) | `content-package-worker/server.ts` |
| **n8n HTTP node** | **NEOVĚŘENO** | Není v repu |
| **Reverse proxy / interní fetch** | **NEOVĚŘENO** | |
| **Package generation claim/lease** | Default **900 s** (env override) | `constants.ts` `PACKAGE_GENERATION_LEASE_SECONDS` |
| **Strategy planner (originality path)** | 180 000 ms × 1 | `planContentStrategy.ts` ~55–56, ~179–180 |

**Call chain Creative Core:** `runCreativeCoreV2Pipeline` → `withTelemetry` → `provider.complete({ timeoutMs: CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS, maxTransportAttempts: 1 })` → `ClaudeProvider.complete` → `fetchWithRetry` s předaným `timeoutMs`/`maxAttempts`.

**Retry:** `maxCreativeCoreAttempts === 1` — žádná vnitřní creative repair smyčka. `generateValidatedJson` s `maxAttempts: 2` se týká **legacy Content Package**, ne CCv2 single-shot creative kroku.

**Po timeoutu:** `generateContentPackage` `finally` volá `releasePackageGenerationClaim` (~415–420); thrown path volá `persistActiveCollectorFailureTelemetry` (~385–410). Idempotence: `existing_package` claim status (~228).

**Circular import:** **NEOVĚŘENO** statickou analýzou; test `check-content-creative-core-v2-timeout-telemetry` importuje konstanty bez chyby.

**Závislost na legacy `runContentPackage.ts`:** CCv2 importuje **pouze konstanty** timeout/attempts z `runContentPackage.ts` (~32–34 v `runPipeline.ts`) — sdílený budget, ne celý legacy generator.

**Verdikt incident 2:** **OPRAVA PROKÁZÁNA** na `main`; slabina = **NEOVĚŘENO** n8n/worker caller timeout.

---

## E. Telemetry a soukromí

### Creative Core v2 krok (`runPipeline.ts`)

| Pole / oblast | Příklad | Jen metadata? | Klientský text? | Persist safe? |
|---------------|---------|---------------|-----------------|---------------|
| `input_summary` | Fixní string „Product Brain (size only)…“ | Ano | Ne | Ano |
| `measureInput` | Model, max_tokens, **celý system+prompt v paměti** | — | **Ano v RAM** | **Neukládá se** do step — jen `input_size_bytes`, `prompt_characters` |
| `measureOutput` | `json_chars=N` / raw length | Ano | Ne v summary | Ano |
| `output_summary` | `json_chars=…` | Ano | Ne | Ano |
| Step fields | `duration_ms`, `timeout_ms`, `transport_attempt`, `max_transport_attempts`, `outcome`, `http_status`, `error_type`, `provider_request_id`, tokens | Ano | Ne | Ano (`withTelemetry.ts` ~120–155) |

**Neukládá (design intent):** celý prompt, Product Brain text, API key (nikdy v telemetry), raw response v step (jen size/chars).

**Výjimka — failure paths:** `buildCreativeCoreFailureLastRaw` ukládá **core fields včetně voiceover** a zkrácené scény do bounded JSON (~20 KB) — **může obsahovat klientský obsah** v failure telemetrii / `lastRaw`.

**Chybové větve:** `classifyProviderTransportError` pokrývá timeout, AbortError, HTTP regex, TypeError (`withTelemetry.ts` ~46–87). Test script simuluje success, timeout, HTTP error, missing request id.

**Strategy planner telemetry:** `strategyPlanSummaries` — metadata o počtu položek (ne celý plán v input_summary).

---

## F. Failure telemetry DB kontrakt (read-only Supabase)

| Otázka | Výsledek |
|--------|----------|
| Sloupec `production_run_items.failure_telemetry` | **Existuje** |
| Typ | `jsonb`, nullable, bez default |
| Size constraint v metadata | **NEOVĚŘENO** (Postgres jsonb prakticky až ~1 GB; aplikace bounduje v kódu) |
| RLS | Policy `production_run_items project access`, cmd `ALL`, role `{public}` — **server admin client** obchází RLS běžně |
| `StrategyOriginalityFailureBundleV2` bez migrace | **Ano** — jsonb přijme libovolný JSON objekt |
| TS typ vs DB | `ProductionRunItemRow.failure_telemetry?: Record<string, unknown>` — odpovídá jsonb |
| Serializace | Bundle je plain JSON z `JSON.stringify` cest — bez circular; `undefined` keys se typicky vynechají; velikost omezena clip limity v `strategyOriginalityFailure.ts` |

**Working tree zápis:** `persistStrategyOriginalityFailureOnRun` → `UPDATE production_run_items SET failure_telemetry = { phase, admin_detail, strategy_originality_failure, … }`.

---

## G. Strategy Originality snapshot (working tree)

**Tok:** `loadStrategyOriginalityHistory` **jednou** v `planContentStrategyUnchecked` (~140–144) → `v2History` → prompt block (~153) → `checkPlanOriginality` používá `v2History.memory` (~262–265) → repair `formatStrategyOriginalityRetryAppend(..., { memory: v2History.memory })` (~306–308) → druhá kontrola stejný `v2History` → failure bundle s `history_package_ids` (~329–356).

| # | Požadavek | Prokázáno |
|---|-----------|-----------|
| 1 | Jedno načtení | Ano — jedno volání loaderu |
| 2 | Immutable snapshot | Objekt `v2History` se neobnovuje; test „immutable history snapshot“ |
| 3 | Stejná ID prompt vs validátor | `packageIds === memory.records.map(r => r.package_id)` — test 1 |
| 4–6 | Stejný snapshot 1./repair/2. validace | Ano — žádné druhé DB load |
| 7 | Telemetry IDs | `history_telemetry.package_ids` |
| 8 | Žádné reload DB | Ano v rámci jednoho `planContentStrategy` |
| 9 | Max 50 | `STRATEGY_ORIGINALITY_HISTORY_LIMIT` / config |
| 10 | Determinismus | Seřazení `created_at` desc + dedupe + filtry |

**Na `main` (HEAD):** stále `buildCreativeMemory` + `.limit(60)` v `planContentStrategy` — **snapshot mechanismus NENÍ nasazen**.

---

## H. Velikost promptu (offline)

**Tokenizer v repu:** **NE** — odhady `chars/4` v `strategyOriginalityHistory.ts` telemetry.

| Records | Originality block (test) |
|---------|--------------------------|
| 50 | `blockChars ≤ 14_000` — test „50-record prompt block stays within token budget“ |

**Repair prompt:** `formatStrategyOriginalityRetryAppend` **neduplikuje** celý history blok — test „repairDoesNotDupHistory“ / grep: repair neobsahuje `STRATEGY ORIGINALITY HISTORY`.

**Celý production strategy prompt (0/10/25/50):** **NEOVĚŘENO** — offline skript s mock `Project` spadl na `projectBrainBlock` (chybějící pole). History block samostatně: viz regression test.

**Nárůst 16 → 50:** Kompaktní summaries + cap 14k znaků na block — **orientačně bezpečné**; plný prompt s Product Brain **NEOVĚŘENO**.

---

## I. Originality pravidla (working tree)

| # | Pravidlo | Stav |
|---|----------|------|
| 1–2 | `pain_not_rotated` soft; `ok = hardIssues.length === 0` | `strategyOriginality.ts` ~291–298, `isHardOriginalityIssue` |
| 3 | Stejný pain, jiná situace | Regression test „same pain with new situation…“ |
| 4 | Blízké opakování | weighted ≥ 0.7 |
| 5–6 | `scenario_key` hard jen s paraphrase **nebo** overlap ≥ **0.42** | `strategyOriginality.ts` ~199–205 |
| 7 | Hard threshold **0.7** | `config.ts` `hardBlockThreshold` |
| 8 | Time decay | Jednou v `computeProtectionWeight` |
| 9 | Staré téma | Test „very old motif“ (memory script) |
| 10 | Obecná fráze | Omezení overlap/prahy — hraniční |
| 11 | Jiná postava, stejná situace | Test „same story with different character“ — block |
| 12 | Repair konkrétní konflikt | `formatStrategyOriginalityRetryAppend` conflict lines |

**Příklady (offline testy):**

- **Blokovat:** paraphrase `SILENT_SOCIAL` vs `PRE_START` (history regression).  
- **Projít:** `WAREHOUSE` vs silent social, stejný pain (history regression).  
- **Hraniční:** `pain_not_rotated` přítomen, ale `ok === true` pokud `hardIssues.length === 0` (history regression).

**Verdikt incident 3 (kód ve working tree):** mechanismus **OPRAVA PROKÁZÁNA**; **nasazení NEPROKÁZÁNO** (není na `main`).

---

## J. Lifecycle filtrace historie

| Stav v DB / modelu | Do originality history? |
|--------------------|-------------------------|
| `published`, `approved`, `ready`, `draft` (PackageStatus) | Ano, pokud projdou filtry |
| `archived` | Ne |
| Explicit creative reject (`t2v_creative_rejected`, reason) | Ne |
| Run `cancelled` (via `production_run_items` join) | Ne |
| Failed generation (bez řádku balíčku) | Automaticky mimo |
| Incomplete (krátký topic < 10 bez pain+conflict) | Ne |

**Omezení (dokumentováno v kódu):** `content_packages.status` nerozlišuje „failed draft“ vs „OK draft“ — oba jsou `draft`. **Technicky failed run** může nechat balíček v DB — **může zůstat v historii**, pokud není cancelled/rejected.

**Creative rejected vs cancelled:** Explicitní reject vyloučen; technický cancelled run vyloučen joinem — **ne zaměněno**.

**Riziko:** Filtrování pouze cancelled **ne** filtruje failed run s existujícím draft balíčkem — může opakovat obsah z neúspěšného běhu.

---

## K. Failure diagnostika originality (working tree)

Bundle (`StrategyOriginalityFailureBundleV2`): oba pokusy, summaries (clipped), issues vč. `match_score`, `protection_weight`, `against_package_id`, threshold, repair feedback, history count/IDs, block size estimate.

**Mezery:** explicitní **`weighted_score`** pole chybí (lze dopočítat); **`provider_request_id`** v bundle **chybí** (strategy step může být v collector steps, ale není součástí bundle).

**Propagace:** `planContentStrategy` → `strategyOriginalityFailure` v result → `prepareProductionStrategyInputs` → `persistStrategyOriginalityFailureOnRun` + `formatStrategyOriginalityOperatorMessage` throw → run failed message.

**UI:** Operator message bez stack trace; admin `admin_detail` + `errorHeadline` z `failure_telemetry` (`production-run-admin.ts`).

---

## L. Testy (spuštěno 2026-08-22)

| Příkaz | Výsledek |
|--------|----------|
| `npm run check:content-creative-core-v2-fingerprint-regression` | **13/13 pass** |
| `npm run check:content-creative-core-v2-strategy-originality-history` | **14/14 pass** |
| `npm run check:content-creative-core-v2-timeout-telemetry` | **24/24 pass** |
| `npm run check:content-creative-core-v2-memory` | **13/13 pass** |
| `npm run check:content-creative-core-v2-core` | **10/10 pass** |
| `npm run check:content-creative-core-v2-step2` | **18/18 pass** |
| `npm run check:content-creative-core-v2-step3` | **25/25 pass** |
| `npm run check:content-creative-core-v2-step4` | **45/45 pass** |
| `npm run check:content-strategy-plan` | **13/13 pass** |
| `npm run check:pipeline-telemetry` | **13/13 pass** |
| `npm run check:production-runtime` | **24/24 pass** |
| `npm run check:generation-failed-settlement` | **22/22 pass** |
| `npx tsc --noEmit` | **pass** |
| `npm run build` | **pass** |

**Nespuštěno (čas/ rozsah):** celá baterie `check:ai-video-worker-integration`, `check:json-repair-runner`, `check:provider-routing`, `check:content-package-guardrails` — **NEOVĚŘENO v tomto běhu**.

Žádný test nevolal live provider.

---

## M. Verdikty incidentů

| Incident | Verdikt |
|----------|---------|
| 1. Fingerprint + voiceover | **OPRAVA PROKÁZÁNA** |
| 2. Timeout + telemetry | **OPRAVA PROKÁZÁNA** (n8n caller **NEOVĚŘENO**) |
| 3. Strategy originality | **ČÁSTEČNĚ PROKÁZÁNA** — kód + testy ve working tree; **NEPROKÁZÁNA na `main`/produkci** |

**Nová regrese:** Na `main` originality incident **přetrvává** (16 vs 60 nesoulad dříve; nyní stále 60 bez unified 50).

---

## N. Odpovědi na finální otázky

1. **Shrnutí vs kód:** Částečně — fingerprint a timeout sedí na `main`; originality shrnutí platí jen pro **uncommitted** diff.  
2. **Stejný history snapshot prompt/validátor:** **Ano** ve working tree; **Ne** na HEAD `main`.  
3. **50 záznamů token budget:** Block ≤14k znaků prokázán; celý prompt **NEOVĚŘENO**.  
4. **Repair duplikuje history?** **Ne** (kód + test).  
5. **Telemetry bezpečná:** Step metadata ano; failure `lastRaw`/core snapshot **může** obsahovat VO/klientský text.  
6. **DB bundle bez migrace:** **Ano** (jsonb).  
7. **Timeout cesta konzistentní:** Vercel 300 s > Claude 180 s > lease 900 s default — **Ano v repu**; n8n **NEOVĚŘENO**.  
8. **`pain_not_rotated` soft:** **Ano** (working tree).  
9. **Lifecycle filtr:** **Částečně** — draft ambiguity, failed run packages.  
10. **Testy + build:** Relevantní sada **prošla** (viz L).  
11. **E2E bezpečné:** **Částečně** — CCv2 generate ano; **strategy originality fix ne** dokud není commit/deploy.  
12. **Blockery:** (a) commit + deploy originality; (b) ověřit n8n timeout ≥ 180 s; (c) zvážit persist clamp flag na success; (d) zvářit failure telemetry VO redakci; (e) lifecycle failed-draft v historii.

---

## Úzké opravy po auditu (2026-08-22, working tree)

**Git (start i konec úprav):** HEAD `3fbb5d966f2bf93a88b90ab0fc7018c72ae861a7` — změny **pouze ve working tree**, **bez commit/push**.

### 1. Změněné / nové soubory

| Soubor | Účel |
|--------|------|
| `lib/content-creative-core-v2/strategyOriginalityHistory.ts` | Lifecycle eligibility + run status z `production_runs` |
| `lib/content-creative-core-v2/packageCreativeSignal.ts` | `briefHasValidCreativeCoreV2` |
| `lib/content-creative-core-v2/memory.ts` | `sourceBrief`; `rejected` jen explicit creative |
| `lib/content-creative-core-v2/creativeCoreFailureRedaction.ts` | Redigovaný `lastRaw` |
| `lib/content-creative-core-v2/createCreativeCore.ts` | Redakce failure; redistribute fail = validation fail; clamp provenance |
| `lib/content-creative-core-v2/legacyProjection.ts` / `runPipeline.ts` | `voiceover_soft_clamp` v provenance |
| `lib/content-creative-core-v2/strategyOriginality.ts` | `weighted_score` na issues |
| `lib/content-creative-core-v2/strategyOriginalityFailure.ts` | Bundle `provider_request_id`, weighted issues |
| `lib/content-creative-core-v2/types.ts` | Typy bundle/issue |
| `lib/ai/workflows/planContentStrategy.ts` | Telemetry → `provider_request_id` v bundle |
| `scripts/check-content-creative-core-v2-strategy-originality-history.ts` | Lifecycle + bundle testy |
| `scripts/check-content-creative-core-v2-fingerprint-regression.ts` | Marker redakce |
| `scripts/measure-strategy-prompt-originality.ts` | Offline měření promptu (read-only DB) |

### 2. Lifecycle chování (konzervativní)

| Stav | Historie | Ochrana |
|------|----------|---------|
| ready / approved / published / draft s usable signálem | Ano | Věk + recency weights |
| Explicit creative reject (`t2v_creative_rejected` / uložený důvod) | **Ano** (v okně 50) | Boost + `rejected_recent_hard_conflict` při blízkém matchi |
| Technicky `cancelled` / `failed` run | Ano, pokud brief má validní Core nebo topic+pain data | **Ne** jako creative reject (`rejected=false`) |
| Incomplete bez Core a bez topic+pain | Ne | — |
| `archived` | Ano jen s usable signálem | Ancient weight (time decay) |
| Vymyšlený reject důvod | **Nikdy** — jen uložená pole | — |

**Omezení:** `production_run_items` bez `content_package_id` nebo balíček bez řádku v DB do historie nespadne (failed run bez persistovaného balíčku zůstává mimo okno).

### 3. Měření promptu — projekt `163c1822-ad30-4cee-8826-dfacd9c188b9` (offline, bez provideru)

Model: `claude-sonnet-4-6`, context **~200k tokenů (orientační)**, `max_tokens` **8192**, eligible balíčků v DB **148**, snapshot **50**.

| History records | System chars | User chars | Originality block | Total chars | ~Tokens | ~Reserve |
|-----------------|-------------|------------|-------------------|-------------|---------|------------|
| 0 | 875 | 29 911 | 0 | 30 786 | ~7 697 | ~192 303 |
| 10 | 875 | 32 814 | 2 901 | 33 689 | ~8 423 | ~191 577 |
| 25 | 875 | 36 284 | 6 371 | 37 159 | ~9 290 | ~190 710 |
| 50 | 875 | 42 105 | 12 192 | 42 980 | ~10 745 | ~189 255 |

Skript: `scripts/measure-strategy-prompt-originality.ts`. Token count = chars/4 (**orientační**, repo bez tokenizeru).

**Ověřeno:** prompt a validátor sdílí stejné package IDs ze snapshotu; repair append **neobsahuje** celý `STRATEGY ORIGINALITY HISTORY` block; summaries jsou zkrácené (field max 120 → adaptivně); block cap `strategyOriginalityPromptMaxChars` (~14k).

### 4. n8n timeout (read-only MCP)

Workflow **`Generate Content Package — Bridge (package loop)`** (`O27ELb1s9Y2qisOr`, active):

| Otázka | Výsledek |
|--------|----------|
| HTTP timeout N3 | **900 000 ms (15 min)** |
| ≥ 300 s? | **Ano** |
| Může ukončit před Claude 180 s? | **Ne** z node timeoutu (900 s ≫ 180 s) |
| Klientský timeout vs server | Webhook `responseMode: onReceived` — odpověď webhooku ihned; N3 běží v execution. Při HTTP timeout node by request skončil chybou u klienta; worker může doběhnout — **operátor: ověřit worker abort policy** |
| Duplicitní generace | N3 **`maxTries: 1`**, **`retryOnFail` off**, popis workflow potvrzuje |

**NEOVĚŘENO v tomto běhu:** globální n8n execution timeout instance, proxy mezi n8n a workerem v produkci.

**Jeden krok pro operátora:** v n8n → workflow výše → node **N3 — Generate Content Package** → Options → Timeout = 900000; Settings → Execution timeout ≥ 900 s.

### 5. Telemetry redakce

`buildCreativeCoreFailureLastRaw` → `creativeCoreFailureRedaction.ts`: žádný celý VO/hook/core text; délky, word count, SHA256, fingerprint keys, validation codes. Test **10b** — unikátní marker ve VO **není** v `lastRaw`.

### 6. Failure bundle

`StrategyOriginalityFailureBundleV2`: `weighted_score` na issues, `provider_request_id` z pipeline telemetry (`Content Strategy` step) nebo `null`. Propagace tvaru do `production_run_items.failure_telemetry` ověřena offline (bez DB zápisu).

### 7. Soft clamp diagnostika

Provenance `voiceover_soft_clamp: { applied, words_before, words_after }` na success path. Redistribute failure → stabilní validation error (`voiceover_excerpt_redistribute_failed:…`), pipeline nepokračuje se starými excerpts.

### 8. Timeout config závislost

Import konstant z `runContentPackage.ts` do `runPipeline.ts`: **bez circular import / runtime problému v testech** — **beze změny** (180 s, 1 transport).

### 9. Testy (vše offline, 0 provider requestů)

| Skript | Výsledek |
|--------|----------|
| fingerprint regression | 14/14 |
| strategy originality history | 22/22 |
| timeout/telemetry | 24/24 |
| memory | 13/13 |
| core + step2–4 | 10 + 18 + 25 + 45 |
| content-strategy-plan | 13/13 |
| pipeline-telemetry | 13/13 |
| content-pipeline-incident-fix | 29/29 |
| content-package-guardrails | 29/29 |
| json-repair + provider-routing | 14 + 10 |
| production-run + settlement + runtime | 32 + 14 + 24 |
| `tsc --noEmit` | OK |
| ESLint (dotčené soubory) | OK |
| `npm run build` | OK |

### 10. Verdikt commit

**Ano — bezpečné commitnout** Strategy Originality + audit mezery (lifecycle, redakce, bundle, clamp provenance, testy, build). **Push/deploy** až po review; n8n globální execution timeout doporučeno ověřit operátorem.

---

## Reference (klíčové soubory)

- Fingerprint / clamp: `lib/content-creative-core-v2/createCreativeCore.ts`, `softClampVoiceover.ts`, `validate.ts`  
- Timeout: `lib/content-pipeline/runContentPackage.ts`, `lib/content-creative-core-v2/runPipeline.ts`, `lib/ai/telemetry/withTelemetry.ts`  
- Originality (WIP): `lib/content-creative-core-v2/strategyOriginalityHistory.ts`, `lib/ai/workflows/planContentStrategy.ts`, `strategyOriginalityFailure.ts`, `failureTelemetry.ts`  
- Commits: `85c7dd1` (fingerprint), `3fbb5d9` (timeout, HEAD)
