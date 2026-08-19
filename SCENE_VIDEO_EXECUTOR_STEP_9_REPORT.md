# SCENE_VIDEO_EXECUTOR_STEP_9_REPORT

Datum: 2026-08-17

## 1. Jak executor používá existující attempts

Executor (`lib/scene-video-executor`) **není** druhý lifecycle. Pro každou scénu volá existující službu:

1. `getSceneVideoAttemptByClientRequestId` — jen čtení (nová malá operace)
2. `createSceneVideoAttempt` — insert + jediný provider POST (idempotentní přes `client_request_id`)
3. `syncSceneVideoAttempt` — poll + claim + bounded download + upload + finalize
4. `sceneVideoClipFromAttemptView` — pure převod na `SceneVideoClip`

Doplněno do attempts služby:

- lookup podle `client_request_id` bez create/POST
- pokud existuje řádek bez `provider_task_id` ve stavu `created` / `submitting`, dokončení POST proběhne **jen** po atomickém submission claimu (Step 9B)

Poll smyčka (čekání na terminal) žije v executorovi; jednotlivý poll/finalize zůstává v attempts.

## Kontrola a opravy Step 9B

### 1. Původní riziko dvojího POSTu

Step 9 považoval `status = created` a `provider_task_id = null` za bezpečný signál pro nový Runway POST. To neplatí při pádu před/during/after POSTu ani při dvou workerech na stejném řádku — hrozí **druhý placený** create task.

### 2. Submission claim lifecycle

Migrace **`036_scene_video_submission_claim.sql`** (034/035 beze změny):

- sloupce `submission_claim_owner`, `submission_claimed_at`
- nový status **`submitting`** = exclusive claim před POSTem

Tok:

1. `created` + žádný claim → CAS update na `submitting` + owner + timestamp (jen jeden worker)
2. jen vlastník claimu volá signed URL + provider POST
3. úspěch → `submitted` + `provider_task_id`, claim se vymaže
4. chyba **před** POSTem (signed URL, validace) → `failed`, claim uvolněn (owner-scoped CAS)
5. nejasný POST → `submission_unknown` (owner-scoped)
6. jiný worker bez claimu → vrátí aktuální řádek, **bez POST**

Lease: `SCENE_VIDEO_SUBMISSION_CLAIM_STALE_MS` (5 min). **Bez** automatického reclaimu pro nový POST.

### 3. Chování při pádu

| Fáze | Chování |
| --- | --- |
| Před POSTem (validace, signed URL) | `failed`, provider nekontaktován |
| Během POSTu / po POSTu bez uloženého task id | expirovaný claim → `submission_unknown`, **žádný** auto POST |
| Po uloženém `provider_task_id` | jen poll/sync, žádný druhý POST |

### 4. Pravidla expirace

`submitting` + stale claim + `provider_task_id IS NULL` → atomicky `submission_unknown` (`failure_code: submission_claim_stale`). Další běh executoru na scéně zastaví (`needs_review`), neposílá create.

### 5. Nové rozdělení nákladů

Executor (`lib/scene-video-executor/budget.ts`):

| Bucket | Význam |
| --- | --- |
| `reusedCompleted` | hotový klip |
| `alreadyCommitted` | task id, in-flight, nebo `submission_unknown` |
| `newCreateCandidate` | jediné scény pro `maxNewCostUsd` |
| `failedOrBlocked` | terminální selhání |

Výsledek běhu:

- `theoreticalTotalCostUsd` — celé video
- `existingCompletedCostUsd` — reused
- `alreadyCommittedCostUsd` — odeslané / nejisté (ne nové POST kandidáty)
- `maxNewCostUsd` — jen `newCreateCandidate`
- `newlyInitiatedProviderCostUsd` *(nahrazuje `newlyReservedCostUsd`)* — jen potvrzený task nebo `submission_unknown` z tohoto běhu; **ne** chyby před POSTem

### 6. Pořadí reuse a paid pojistek

1. Strukturální preflight (bez provideru)
2. Lookup existujících attemptů
3. Pokud **všechny** scény jsou reuse-only → běh **bez** `confirmPaidRun`, flagu a API klíče
4. Jinak paid pojistky (confirm + flag + klíč)
5. Budget jen z `newCreateCandidate`
6. Per scéna: reuse → committed poll → create s claimem

Nový POST vždy za všemi pojistkami; polling aktivního tasku může vyžadovat klíč.

### 7. Změněné soubory a migrace

- `supabase/migrations/036_scene_video_submission_claim.sql` *(new, aplikováno na remote)*
- `lib/scene-video-attempts/constants.ts` — `submitting`, `SCENE_VIDEO_SUBMISSION_CLAIM_STALE_MS`
- `lib/scene-video-attempts/types.ts` — submission claim sloupce
- `lib/scene-video-attempts/service.ts` — claim, stale → unknown, owner-only POST
- `lib/scene-video-executor/budget.ts` *(new)*
- `lib/scene-video-executor/execute.ts` — guard order, náklady, timeout unresolved
- `lib/scene-video-executor/types.ts` — `alreadyCommittedCostUsd`, `newlyInitiatedProviderCostUsd`
- `scripts/check-scene-video-attempts.ts` — 9B-1…9B-4
- `scripts/check-scene-video-executor.ts` — 9B exec + reuse bez paid guards

**Remote DB (po 036):** constraint `scene_video_generation_attempts_status_check` obsahuje `submitting`; sloupce `submission_claim_owner`, `submission_claimed_at` (text / timestamptz, nullable).

### 8. Výsledky testů (po 9B)

| Check | Výsledek |
| --- | --- |
| `check:scene-video-executor` | **23 passed** |
| `check:scene-video-attempts` | **33 passed** |
| `check:scene-video-plan` | **19 passed** |
| `check:runway-image-to-video` | **19 passed** |
| `check:video-reel-orchestrator` | passed |
| `check:video-clip-render` | passed |
| `tsc --noEmit` | OK |
| eslint změněných souborů | OK |

Pokrytí 9B: concurrent claim (1 POST), non-owner bez POST, stale → `submission_unknown`, signed URL bez provider spend, budget buckets, `newlyInitiatedProviderCostUsd`, reuse bez klíče/flagu, timeout pending → unresolved + skip další scény.

### 9. Skutečný provider request

**Neproveden.** Testy používají mock provider / fake gateway. `SCENE_VIDEO_GENERATION_ENABLED` zůstává výchozí `false`; executor není v `jobRunner`.

### 10. Zbývající riziko

Bez provider idempotency klíče nelze po pádu **během** POSTu s jistotou vědět, zda Runway task vznikl — proto stale claim → `submission_unknown` a ruční rozhodnutí místo druhého POSTu. Pokud provider task existuje, ale DB update selže, zůstane `submitting` do expirace → stejný bezpečný výsledek.

## Kontrola a opravy Step 9C

### 1. Původní příčina zaseknutého `submitting`

Executor posílal existující `submitting` (bez `provider_task_id`) do `syncSceneVideoAttempt`. Sync u řádků bez task id dříve jen vrátil stejný stav — **expirace claimu běžela jen na create cestě**, takže stale `submitting` mohl viset navěky.

### 2. Expirace ve sync

`syncSceneVideoAttempt` volá stejnou logiku jako create (`resolveSubmittingRowForSync` → `isSubmissionClaimStale` + `markStaleSubmissionUnknown`):

- aktivní claim → vrátí `submitting`, **bez** provider POST/poll,
- stale claim → atomicky `submission_unknown` (CAS včetně claim polí),
- řádek s `provider_task_id` → sync pokračuje normálním pollem (bez zásahu do „hotového“ odeslání).

### 3. Polling interval a ochranný limit

- Výchozí interval: `RUNWAY_VIDEO_DEFAULT_POLL_INTERVAL_MS` (2000 ms, sdíleno s Runway adapterem).
- `normalizeSceneVideoPollIntervalMs` — hodnoty `≤ 0` / nefinite → bezpečný default (žádný busy loop).
- `maxSceneVideoPollIterations(timeout, interval)` — druhá hranice kromě deadline.
- Opraveno dvojí `settleAttempt` pro existující in-progress scénu (`alreadySettled`).

### 4. Migrace 037

`037_scene_video_submission_claim_integrity.sql` — CHECK:

- `submitting` ⇒ claim owner + claimed_at povinné, `provider_task_id` null,
- jiný status ⇒ claim sloupce null.

### 5. Ověření remote DB

Před 037: 0 konfliktních řádků (prázdná tabulka). Po aplikaci: constraint `scene_video_generation_attempts_submission_claim_integrity` ověřen v `pg_constraint`.

### 6. Výsledky testů (po 9C)

| Check | Výsledek |
| --- | --- |
| `check:scene-video-executor` | **25 passed** |
| `check:scene-video-attempts` | **39 passed** |
| `check:scene-video-plan` | 19 passed |
| `check:runway-image-to-video` | 19 passed |
| `check:video-reel-orchestrator` | passed |
| `check:video-clip-render` | passed |
| `tsc` / eslint | OK |

Nově: 9C-1…6 (sync + executor stale path), executor polling default / frozen clock / bounded sync count.

### 7. Nulové provider requesty

Ano — mock provider / fake gateway, žádná síť.

### 8. Produkce

Executor stále **není** v `jobRunner`; `SCENE_VIDEO_GENERATION_ENABLED` default **false**.

---

## 2. Bezpečnostní pojistka (Step 9 + 9B)

Skutečné provider volání (executor vůbec pokračuje za blocked) jen když **vše** platí:

| Podmínka | Zdroj |
| --- | --- |
| `confirmPaidRun === true` | explicitní parametr volání *(vynecháno při čistém reuse-only běhu — 9B)* |
| `SCENE_VIDEO_GENERATION_ENABLED=true` | serverový flag, výchozí **false** |
| `RUNWAYML_API_SECRET` neprázdný | nebo injektované `hasApiKey` v testech |
| plán projde preflight (všechny scény `preparable`) | |
| `maxNewCostUsd <= maxBudgetUsd` | zbývající (nereused) odhad |

Samotný API klíč **nestačí**. Chybějící potvrzení / vypnutý flag / chybějící klíč → `status: "blocked"`, **žádný** create.

## 3. Preflight pravidla

Před prvním create/POST:

- alespoň jedna scéna
- všechny `preparable`
- `preparableSceneCount === sceneCount`
- provider `runway`, model `gen4_turbo`, ratio v Runway Gen-4 sadě a konzistentní
- každá scéna má `sourceImageBucket` + `sourceImagePath`
- `maxBudgetUsd` je konečné kladné číslo
- žádné duplicitní `sceneId`

Selhání → `blocked`, žádný attempt, žádný provider call.

Výchozí chování **nespouští** část videa: preflight vyžaduje všechny scény připravené.

## 4. Průběh jedné scény

Postupně, max. jedna současně:

1. Stabilní UUID v5 `client_request_id` (job + scéna + still + prompt hash materiál + provider/model/délka/ratio)
2. Lookup existujícího attemptu
3. `succeeded` + durable output → reuse `SceneVideoClip`, bez POST
4. `submission_unknown` → unresolved, stop celého běhu
5. `failed` / `cancelled` / `download_failed` → failed, stop (žádný auto-retry)
6. `submitting` / `submitted` / `pending` / `running` / `downloading` → sync (žádný nový POST)
7. Jinak `create` (claim → POST jednou) → sync → clip

Signed URL, bounded download, claim CAS a storage path řeší attempts služba.

## 5. Opakované spuštění

Stejný plán → stejné `client_request_id`.

- dokončený attempt se znovu použije, bez provider create
- rozpracovaný attempt se jen polluje
- změna promptu nebo source path změní UUID → nový attempt

## 6. `submission_unknown`

Timeout / síť / nejasný POST: attempts označí `submission_unknown` a hodí `Error("submission_unknown")`.

Executor:

- scéna `unresolved`
- běh `needs_review`
- další scény `skipped`
- žádný druhý POST

Definitivní 4xx z create → `failed` + `stopped`.

## 7. Pravidla rozpočtu

- `theoreticalTotalCostUsd` — teoretická cena celého videa
- `existingCompletedCostUsd` — odhad scén už `succeeded` (reused)
- `maxNewCostUsd` — odhad scén v bucketu **newCreateCandidate** (porovnání s `maxBudgetUsd`)
- `alreadyCommittedCostUsd` — in-flight / `submission_unknown` / existující task id
- `newlyInitiatedProviderCostUsd` — potvrzený nový task nebo `submission_unknown` z tohoto běhu (ne chyby před POSTem)

Odhad ≠ provider invoice. Cost helper zůstává `estimateRunwayTestCostUsd` z plánu.

## 8. Změněné soubory

- `lib/scene-video-executor/*` *(new)*
- `lib/scene-video-attempts/service.ts` — lookup + continue `created` without task
- `lib/scene-video-attempts/sceneVideoClipFromAttempt.ts` — view helper
- `lib/scene-video-attempts/index.ts`
- `scripts/check-scene-video-executor.ts` *(new)*
- `package.json` — `check:scene-video-executor`
- `.env.example` — `SCENE_VIDEO_GENERATION_ENABLED=false`
- `SCENE_VIDEO_EXECUTOR_STEP_9_REPORT.md` *(this file)*

## 9. Výsledky testů (Step 9 baseline)

Po Step 9B viz **§ Kontrola a opravy Step 9B → výsledky testů** (executor 23, attempts 33).

| Check | Výsledek (Step 9) |
| --- | --- |
| `check:scene-video-executor` | 17 passed → **23** po 9B |
| `check:scene-video-attempts` | 29 passed → **33** po 9B |
| `check:runway-image-to-video` | **19 passed** |
| `check:video-reel-orchestrator` | passed |
| `check:video-clip-render` | passed |
| `tsc --noEmit` | OK |
| eslint změněných souborů | OK |

Povinné scénáře 1–19 pokryty (včetně flag default, confirm, API key, budget, preflight, sequential, reuse, in-progress bez POST, UUID stabilita/změna, 4xx, `submission_unknown` + stop, first-fail stop, `SceneVideoClip`, rerun budget, nula sítě).

## 10. Produkční zapojení

**Nezapojeno.** `video-worker/jobRunner.ts` executor neimportuje. Žádné n8n, UI, veřejné API, změna still-image renderu.

## 11. Síť / placené AI

**Nulová** skutečná síťová a placená volání v testech (fake gateway, žádný Runway/Supabase client).

## 12. Blockery / rozpory

- `createSceneVideoAttempt` stále vyžaduje, aby still v `video_jobs.output` odpovídal plánu (`source_image_mismatch`). Executor plánu věří po preflightu; produkční zapojení musí mít dokončený render spec se stills. To je existující kontrakt attempts, ne nový.
- `syncSceneVideoAttempt` dělá jeden poll; executor smyčkuje. Žádný duplicitní download lifecycle.
- Cost model je stále `gen4_turbo` test pricing z Step 8 — jediný lokální Runway cost helper.
- UUID v5 je hash materiálů; prompt je ve vstupu hashe, ne v DB identifikátoru jako plaintext klíč.
