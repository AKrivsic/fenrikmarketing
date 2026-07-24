# Content Pipeline Incident Resolution

**Run:** `d15447f4-889e-4e38-a82e-9250f45d8663`  
**Project:** `aabab9ff-9db4-4012-a53c-135e3bfea6cd`  
**Strategy item:** `37cac772-b58a-4dc6-839e-c5d7aa3a29f2`  
**n8n execution:** `1039` / workflow `NAKo5V3Ctlq5aW4i`  
**Date:** 2026-07-24  
**Status of this doc:** analysis only — no code changes implemented.

Evidence labels used below:

- **evidence** — DB / n8n / code path observed for this run
- **inference** — deduced from code + telemetry patterns
- **unknown** — raw LLM output / per-Claude-attempt tokens not stored

---

## 1. Exact Root Cause

Content Package prompt documents `visual_scenes` only as `"optional typed scenes"` with no JSON examples, while `generatedVisualSceneEntryValidator` rejects any entry that lacks either a legacy `source: "ai"|"asset"` shape or a typed `{ type, payload }` shape — so Claude emitted unrecognized scene objects, validation failed with `unrecognized visual scene entry`, and the package never persisted.

---

## 2. Prompt vs Schema Mismatch

Sources compared:

- Prompt: `lib/content-pipeline/prompts/contentPackage.ts` → `buildContentPackagePrompt`
- Schema: `lib/ai/schemas/contentPackage.ts` → `buildContentPackageSchema`
- Scene validator: `lib/content-package/generatedVisualScene.ts` → `generatedVisualSceneEntryValidator`
- Correct examples (old path): `lib/ai/prompts/presentationGeneration.ts` → `buildPresentationSceneGuidance` / `buildPresentationJsonShapeLines`
- Repair: `lib/ai/runWithRepair.ts` + `lib/ai/prompts/jsonRepair.ts` (Content Package passes **no** `expectedShape`)

| Pole | Co prompt říká | Co schema očekává | Riziko / problém |
|------|----------------|-------------------|------------------|
| `visual_scenes` | `"optional typed scenes"` — žádný příklad | Array 1–5 (`MAX_VIDEO_SCENE_STILLS`); každý prvek musí projít `generatedVisualSceneEntryValidator` | **Kritický mismatch.** Prompt nevysvětluje žádný platný tvar. |
| IMAGE legacy shape | Neuvedeno | `{ "source": "ai", "image_prompt": "..." }` nebo `{ "source": "asset", "asset_id", "used_as", ... }` | Prompt vůbec nevysvětluje — schema i presentation prompt ano. |
| typed IMAGE shape | Neuvedeno | `{ "type": "IMAGE", "payload": { source… } }` (payload nebo flat legacy uvnitř) | Schema akceptuje; prompt nedokumentuje. Preferovat legacy. |
| CHECKLIST | Neuvedeno | `{ "type": "CHECKLIST", "payload": { "items": [2–5 strings], "title"?, … } }` | Schema akceptuje; prompt nevysvětluje. |
| PHONE | Neuvedeno | `{ "type": "PHONE", "payload": { asset_id XOR image_prompt, caption? } }` | Schema akceptuje; prompt nevysvětluje. |
| QUOTE | Neuvedeno | `{ "type": "QUOTE", "payload": { quote, attribution, proof_id, context? } }` | Schema akceptuje; prompt nevysvětluje. |
| STATISTIC | Neuvedeno | `{ "type": "STATISTIC", "payload": { value, label, proof_id, unit?, source_line? } }` | Schema akceptuje; prompt nevysvětluje. |
| CTA (scene) | Neuvedeno | `{ "type": "CTA", "payload": { headline, subline?, button_label?, … } }` | Schema akceptuje; prompt nevysvětluje. |
| `payload` | Neuvedeno | Povinné pro typed non-IMAGE; u typed IMAGE validuje `payload ?? record` | Nejednoznačné / chybějící. |
| `source` | Neuvedeno | `"ai"` \| `"asset"` pro legacy IMAGE | Bez `source` a bez platného `type` → **`unrecognized visual scene entry`**. |
| `image_prompt` | Jen zmínka v Opening Impact / HARD RULES jako string array / scény | U AI scene povinný non-empty string | Prompt podporuje `image_prompts: string[]`, ale neváže to na scene `source`. |
| `asset_id` | Jen v AVAILABLE ASSETS listu | Povinný u `source: "asset"` a u PHONE asset varianty | Field name OK, tvar scény chybí. |
| `used_as` | Neuvedeno | Povinný u `source: "asset"` | Prompt nevysvětluje. |
| `platform_outputs` | `{ caption, cta, hashtags[], format }` per platform | Stejné + optional `caption_variants` / `title_variants` | Prompt dokumentuje méně než schema (variants jsou OK optional). Schema vyžaduje každý `targetPlatforms` klíč. |
| `caption` / `cta` (platform) | string | non-empty string | Repair warnings ukázaly i object místo string (**evidence** na attempt 3). |
| `variants` | `VARIANT COUNTS` blok když multiplier > 1 | `caption_variants` / `title_variants` optional arrays | Prompt říká „caption_variants“; schema to akceptuje. Pro tento run `x:5`, `linkedin:1.5` — varianty relevantní. |
| `asset_usage` | `"optional"` | `[{ asset_id, used_as, modify? }]` | Poddokumentováno; odvoditelné z visual_scenes. |
| package `cta` | `{ type, text }` | stejné | OK |
| `video.duration_seconds` | string v skeletonu | optional string | Repair viděl non-string (**evidence**). |

Shrnutí pokrytí:

| Kategorie | Verdikt |
|-----------|---------|
| Tvary, které prompt **vůbec nevysvětluje** | legacy IMAGE, typed IMAGE, CHECKLIST, PHONE, QUOTE, STATISTIC, CTA scene, `source`, `used_as`, `payload` |
| Tvary vysvětlené **nejednoznačně** | `visual_scenes: optional typed scenes`, `asset_usage: optional` |
| Field names, které se liší | žádný hard rename; chybí dokumentace (`source` vs inventované `prompt`/`description`) |
| Prompt podporuje více než schema | ne — spíš naopak: schema umí typed scenes + legacy, prompt skoro nic |
| Schema akceptuje více než prompt dokumentuje | **ano** — všech 6 generation scene types + legacy IMAGE |

**Primární mismatch je: prompt říká jen „optional typed scenes“, zatímco validator vyžaduje konkrétní legacy `source` nebo typed `{type,payload}` objekty — bez příkladů model inventuje neplatné scény a padá na `unrecognized visual scene entry`.**

---

## 3. Why Repair Failed

### Flow (`generateValidatedJson`, default `maxAttempts = 3`)

```
for attempt 1..3:
  Claude primary complete (Content Package)
  parse JSON
    on parse fail → JSON Repair (issues=[], expectedShape?) → re-parse
  validate schema
    on fail → JSON Repair (issues=validationErrors, expectedShape?) → re-validate
  guardrails (Content Package: no repairGuardrailFailures)
  on fail → next attempt (full Claude regenerate)
```

Content Package call site (`runContentPackageGeneration`):

- `maxAttempts`: default **3** (**evidence** — item error `"attempts":3`)
- `expectedShape`: **not passed** (**evidence** — code)
- `repairGuardrailFailures`: not set
- No identical-error early-stop (**evidence** — code)

### Attempt table — owner `626dc14b` (3rd package attempt; **evidence** from `production_run_items.failure_telemetry`)

| Attempt | Model | Vstup | Instrukce | Validation result | Duration | Cost |
|---------|-------|-------|-----------|-------------------|----------|------|
| Claude CP #1 | claude-sonnet-4-6 | full Content Package prompt | system + prompt; **no** shape examples for scenes | **inference:** invalid JSON and/or bad scenes | ~70s before first repair (**inference** from timestamps) | rolled into CP aggregate |
| JSON Repair #1 | gpt-4o-mini-2024-07-18 | broken output; `validation_issues: []` | syntax repair only | re-parse then schema still bad (**inference**) | 53.4s | $0.002788 |
| JSON Repair #2 | gpt-4o-mini | JSON + issues incl. `unrecognized visual scene entry` ×5 + platform/duration | schema repair **without** expectedShape | still unrecognized (**inference**; next Claude fired) | 179.1s | $0.002501 |
| Claude CP #2 | claude-sonnet-4-6 | same prompt (no `retryPromptAppend`) | identical instructions | again bad (**inference**) | ~78s gap (**inference**) | rolled into CP aggregate |
| JSON Repair #3 | gpt-4o-mini | broken; issues `[]` | parse repair | — | 46.6s | $0.002725 |
| JSON Repair #4 | openai (model null) | broken + issues (**inference**) | schema repair | **timed out** after 60s; repair returns null | 180.9s | unknown / $0 |
| Claude CP #3 | claude-sonnet-4-6 | same prompt | identical | final fail: scenes[0..2] unrecognized (**evidence**) | ~75s gap (**inference**) | rolled into CP aggregate |
| JSON Repair #5 | gpt-4o-mini | broken; issues `[]` | parse repair | — | 44.8s | $0.002836 |
| JSON Repair #6 | gpt-4o-mini | issues: unrecognized ×3 + duration/platform | schema repair; no expectedShape | still unrecognized → terminal | 44.7s | $0.002705 |
| Content Package (outer) | claude-sonnet-4-6 | aggregate usage | `retry_count: 2` | failed | 773.3s wall | **$0.253845** |

Tokens on outer Content Package step (**evidence**, aggregated across 3 Claude calls): prompt 23175, completion 12288.

**Attempts 1 and 2** (owners `f08db84d`, `6a8cb888`): only aggregate rows in `production_run_item_failure_telemetry` — same terminal fingerprint, costs $0.2999 and $0.2916. Per-step repair tables for those attempts: **unknown** (steps overwritten on item; table has no `generation_telemetry` column in prod).

### Answers

| Otázka | Odpověď |
|--------|---------|
| Proč repair nepomohl? | Dostal jen hlášku `unrecognized visual scene entry` **bez** katalogu platných scene shapes (`expectedShape` chybí). Umí „opravit JSON“, ne odvodit legacy/typed kontrakt. |
| Byl repair schopný tuto chybu opravit? | **Ne spolehlivě.** Bez expectedShape je to schema-mismatch, ne syntax. I se shape by 5–6 placených oprav bylo plýtvání — primární fix je prompt. |
| Je 5+ repair pokusů správné chování? | **Chyba konfigurace volajícího + absenci early-stop.** Default 3 Claude × až 2 repair/attempt = až 6 repair calls. Žádný fingerprint stop. |
| Nejmenší bezpečný fix repair flow? | (1) předat `expectedShape` s legacy IMAGE + optional typed examples; (2) max 1 schema-repair per Claude attempt; (3) stop při identickém validation fingerprintu; (4) nesnižovat Claude `maxAttempts` pod 2 dokud není prompt opraven — pak stačí 1–2. |

---

## 4. 16-Minute Timeline

**Korekce času:** wall-clock runu je **~31.3 min** (17:45:11 → 18:16:31 UTC), ne ~16 min. ~13–16 min odpovídá **jednomu** package attemptu (např. Content Package wall 12.9 min na 3. pokusu). Předchozí forenzní odhad „~16 min“ popisoval jeden pokus / CP stage, ne celý run.

### Master timeline (**evidence**)

| Step | Start (UTC) | End (UTC) | Duration | Model / worker | Result |
|------|-------------|-----------|----------|----------------|--------|
| Run created | 17:45:11 | — | — | API | `running` |
| Content Strategy | 17:45:17 | 17:45:24 | 7.0s | claude-sonnet-4-6 | ok |
| Persist strategy items | 17:45:24 | 17:45:25 | 0.5s | deterministic | 1 item |
| Claim #1 (`f08db84d`) | ~17:45:28 | — | — | package claim | claimed |
| Package attempt 1 (full pipeline) | ~17:45:28 | 17:54:39 | ~9.2 min wall | worker | generation_failed; 5 unrecognized scenes |
| Failure telemetry insert #1 | 17:54:39 | — | — | DB | row `27f9aec1…` / $0.2999 |
| Claim release #1 → n8n retry | ~17:54:39 | — | — | n8n `retryOnFail` | **inference:** Axios 422 → retry |
| Package attempt 2 (`6a8cb888`) | ~17:54:41 | 18:03:00 | ~8.4 min wall | worker | generation_failed |
| Failure telemetry insert #2 | 18:03:00 | — | — | DB | row `f4654056…` / $0.2916 |
| Package attempt 3 (`626dc14b`) | ~18:03:02 | 18:16:30 | ~13.5 min wall | worker | generation_failed |
| Video Concept (att. 3) | 18:03:05 | 18:03:34 | 28.4s | claude-sonnet-4-6 | ok |
| Opening Impact | 18:03:34 | 18:03:37 | 2.8s | gpt-4o-mini | ok |
| Visual Identity | 18:03:37 | 18:03:37 | 0s | deterministic | ok |
| Content Package + repairs | 18:03:37 | 18:16:30 | 12.9 min | Claude + 6× JSON Repair | fail |
| Failure telemetry insert #3 | 18:16:30 | — | — | DB | row `1b8f2d8b…` / $0.2956 |
| Item settle + run finalize | 18:16:31 | 18:16:31 | — | settle | run `completed`, failed_total=1 |
| n8n exec 1039 N3 node | 17:45:26 | 18:16:31 | **31.1 min** | content-package-worker | final Axios 422 |

Video / images / TTS / render: **never started** (**evidence** — `content_package_id` null, `video_job_id` null).

### Bottleneck verdict

| Metric | Value |
|--------|-------|
| Největší bottleneck | Content Package Claude ×3 regenerace + JSON Repair (včetně 3 min timeout) **uvnitř každého** package attemptu; navíc **2× full duplicate attempt** z n8n |
| Užitečný čas (strategy + 1× concept/opening/identity + 1× package gen bez repair smyčky) | ~1–2 min (**inference**) |
| Zbytečný čas | ~29+ min z 31 (**inference**) — 2 duplicate attempts + opravné smyčky + 1× OpenAI timeout |
| Co omezit / odstranit | (1) prompt mismatch, (2) n8n `retryOnFail` na 422, (3) unbounded schema repairs bez expectedShape / fingerprint stop |

---

## 5. Cost Breakdown

Pricing version: `list-price@2026-07-23` (**evidence**).

### Confirmed per package attempt (aggregates)

| Stage / attempt | Model | Calls | Input tokens | Output tokens | Cost | Evidence |
|-----------------|-------|-------|--------------|---------------|------|----------|
| Content Strategy | claude-sonnet-4-6 | 1 | 4103 | 278 | **$0.016479** | strategy_brief.generation_telemetry |
| Strategy Items | deterministic | 1 | — | — | $0 | same |
| Package attempt 1 | mixed | unknown steps | 53619 | 35507 | **$0.299900** | failure_telemetry row |
| Package attempt 2 | mixed | unknown steps | 49093 | 30814 | **$0.291594** | failure_telemetry row |
| Package attempt 3 | mixed | see below | 49734 | 31890 | **$0.295595** | failure_telemetry + item JSON |

### Attempt 3 step detail (**evidence**)

| Stage | Model | Calls | Input tokens | Output tokens | Cost per call | Total cost |
|-------|-------|-------|--------------|---------------|---------------|------------|
| Video Concept | claude-sonnet-4-6 | 1 | 3922 | 1059 | $0.027651 | $0.027651 |
| Opening Impact | gpt-4o-mini | 1 | 4072 | 161 | $0.000544 | $0.000544 |
| Visual Identity | deterministic | 1 | — | — | $0 | $0 |
| Content Package (3 Claude tries aggregated) | claude-sonnet-4-6 | 3 | 23175 agg | 12288 agg | — | **$0.253845** |
| JSON Repair #1 | gpt-4o-mini | 1 | 3777 | 3702 | $0.002788 | $0.002788 |
| JSON Repair #2 | gpt-4o-mini | 1 | 3619 | 3696 | $0.002501 | $0.002501 |
| JSON Repair #3 | gpt-4o-mini | 1 | 3717 | 3613 | $0.002725 | $0.002725 |
| JSON Repair #4 | openai timeout | 1 | unknown | unknown | — | **$0 / unknown** |
| JSON Repair #5 | gpt-4o-mini | 1 | 3780 | 3781 | $0.002836 | $0.002836 |
| JSON Repair #6 | gpt-4o-mini | 1 | 3672 | 3590 | $0.002705 | $0.002705 |
| **Attempt 3 subtotal** | | | | | | **$0.295595** |

### Cost summary

| Odhad | Částka | Poznámka |
|-------|--------|----------|
| Potvrzené minimum (sum stored estimates) | **$0.9036** | strategy + 3 package attempts |
| Realistický odhad billingu | **~$0.90–$0.95** | list-price ≈ billing; timeout repair may still have billed partial |
| Nejhorší pravděpodobný | **~$1.00** | if timed-out repair partially billed + rounding |
| Z toho zbytečné (duplicate attempts 2+3) | **~$0.587** | identical failure, no prompt change |
| Zbytečné uvnitř 1 attemptu (repairs + Claude retries) | **~$0.15–$0.20** (**inference**) | majority of $0.25 CP cost is retries; repairs ~$0.014 |

**Co stálo nejvíc:** Content Package Claude regenerace (~$0.25 per attempt × 3 ≈ **$0.76**). JSON Repair je levný ale pomalý. Strategy je zanedbatelná ($0.016).

Předchozí „~$0.32“ = **jeden** package attempt (item.failure_telemetry ukazuje jen poslední).

---

## 6. Duplicate Attempt / Owner Token Analysis

**Evidence:** 3 distinct `owner_token` values in `production_run_item_failure_telemetry`:

| # | owner_token | created_at | estimated_cost_usd | error fingerprint |
|---|-------------|------------|--------------------|-------------------|
| 1 | `f08db84d-ffa9-40e5-84d4-470a60465e93` | 17:54:39 | 0.299900 | unrecognized ×5 |
| 2 | `6a8cb888-997e-4244-8d3a-fa7c7fe0b5d8` | 18:03:00 | 0.291594 | x.cta + unrecognized ×4 |
| 3 | `626dc14b-ac97-43a1-bbbc-8709293447a7` | 18:16:30 | 0.295595 | unrecognized ×3 |

**Proč 3 tokeny (ne 2):** každý `runGenerateContentPackage` volá `newOwnerToken()` před `claimPackageGeneration`. Po faili se claim **release**ne; další HTTP call znovu claimne s novým UUID.

**Proč 3 celé generation pokusy:** n8n node `N3 — Generate Content Package` má:

```json
"retryOnFail": true,
"maxTries": 3,
"waitBetweenTries": 2000,
"onError": "continueRegularOutput"
```

Worker vrací **HTTP 422** na `generation_failed` (`workflowResponse`). Axios považuje 422 za fail → n8n retry → další plný paid run. N3 `executionTime` = **1 864 714 ms** ≈ součet tří pokusů (**evidence** exec 1039).

**Nebylo to:**

- concurrency race dvou workerů současně (pokusy jsou sekvenční podle timestamps)
- lease steal uprostřed běhu (lease 900s; heartbeat existuje; fail→release→reclaim je čistý)
- duplicate package rows (žádný `content_packages` row)

**Byl to:** retry policy na **content validation failure**, ne broken claim lock.

**Náklady $0.32 vs realita:** $0.32 ≈ 1 attempt; skutečný paid waste = 3 attempts ≈ **$0.89** + strategy.

---

## 7. Minimal Fix Plan

### A. Prompt fix

**File:** `lib/content-pipeline/prompts/contentPackage.ts`  
**Function:** `buildContentPackagePrompt` (a/nebo malý helper `buildContentPackageVisualScenesBlock`)

**Přidat blok** (zkopírovat kontrakt z `presentationGeneration.ts`, zjednodušit na IMAGE-first):

1. Preferovat **legacy IMAGE only** pro default video packages:
   - `{ "source": "ai", "image_prompt": "..." }`
   - `{ "source": "asset", "asset_id": "<uuid>", "used_as": "..." }`
2. Explicitně zakázat míchání: buď flat legacy, nebo typed `{type,payload}` — **ne** `{ type: "IMAGE", image_prompt }` bez `source`/`payload`.
3. Optional typed scenes (CHECKLIST / PHONE / QUOTE / STATISTIC / CTA) — stejné JSON examples jako `buildPresentationJsonShapeLines`, ale označit jako optional; pro minimální fix stačí **IMAGE-only examples + „do not invent other shapes“**.
4. `visual_scenes` required when `requireVideo` (3–5), aligned s HARD RULES.
5. `platform_outputs`: caption/cta jako **string**; zmínit optional `caption_variants` / `title_variants` když `variantCounts` > 1.
6. `asset_usage` optional if scenes carry assets.

**Preferovat legacy IMAGE** (ne typed IMAGE) — shodné s presentation examples a jednodušší validátor path (`source` na root).

### B. Repair fix

**File:** `lib/content-pipeline/runContentPackage.ts` → `runContentPackageGeneration`

1. Přidat `expectedShape` string = stejný visual_scenes + platform_outputs skeleton jako v promptu.
2. `maxAttempts: 2` po prompt fixu (nebo 3 do ověření).
3. V `lib/ai/runWithRepair.ts` (minimální): při schema repair, pokud `fingerprint(issues)` === předchozí fingerprint po repairi → `continue` bez dalšího repair / stop attempt.
4. Limit: max **1** schema-repair call per primary attempt (parse-repair může zůstat 1×).
5. Repair smí měnit **formát** (přidat `source`, stringifikovat duration, doplnit chybějící platform object); nemá přepisovat kreativní obsah, pokud expectedShape říká „preserve valid content“.

### C. Retry / concurrency fix

**Nutná oprava:** n8n `N3` — `retryOnFail: false` **nebo** retry jen na síť/5xx/timeout, **nikdy** na 422 `generation_failed`.

Claim lock je v pořádku; **není nutný** rewrite `claim_package_generation`.

Optional hardening (stále malé): po settle `generation_failed` odmítnout další claim pro stejný `production_run_item` ve failed stavu (idempotent short-circuit) — brání i ručnímu double-fire. Není nutné, pokud n8n přestane retryovat 422.

### D. Observability fix

Nechceme dashboard. Chceme audit trail.

**Minimální produkční řešení:**

1. Migrace: přidat na `production_run_item_failure_telemetry` sloupce (nebo jednu `stage_audit jsonb`):
   - už má: run_id, item_id, strategy, owner_token, phase, provider, model, attempt_count, duration_ms, tokens, cost, error, classification
   - **chybí a je potřeba:** `generation_telemetry` (kód už insertuje, sloupec v DB **neexistuje** — proto attempt 1/2 ztratily step detail)
2. Pro každý stage step (už v collector): zajistit persist i při faili (append-only rows, ne overwrite item JSON only).
3. Nové bounded pole na failure row / step:
   - `output_hash` (sha256 truncated raw)
   - `output_snapshot` jsonb — **redacted**: max N KB, strip long prose optional; keep `visual_scenes` structure keys + validation_errors
   - retention: 14–30 dní nebo purge snapshot po success re-run
4. Stage row fields (mapování na existující step + failure table):

| Field | Source |
|-------|--------|
| run_id / item_id / package_id / stage / attempt | session + claim |
| provider / model / started_at / completed_at / duration_ms | withTelemetry |
| input_tokens / output_tokens / cost_usd | usage + estimateTokenCostUsd |
| status / validation_errors | generateValidatedJson result |
| output_json snapshot / output_hash | lastRaw bounded |

**Odpověď „za co 0.32?“:** sum `estimated_cost_usd` z failure_telemetry + strategy_brief steps — po opravě persistance steps i pro pokus 1/2.

---

## 8. Exact Files and Functions to Change

| File | Function | Change | Why |
|------|----------|--------|-----|
| `lib/content-pipeline/prompts/contentPackage.ts` | `buildContentPackagePrompt` | Replace `"visual_scenes": optional typed scenes` with concrete IMAGE examples (+ optional typed) | Primary mismatch |
| `lib/content-pipeline/prompts/contentPackage.ts` | new helper (optional) | `buildContentPackageVisualScenesBlock()` copied/adapted from presentation | Keep prompt DRY vs presentation |
| `lib/content-pipeline/runContentPackage.ts` | `runContentPackageGeneration` | Pass `expectedShape`; optionally lower `maxAttempts` | Repair must see legal shapes |
| `lib/ai/runWithRepair.ts` | `runGenerateValidatedJson` | Fingerprint early-stop; max 1 schema repair / attempt | Stop paid identical loops |
| `lib/ai/prompts/jsonRepair.ts` | (none / reuse) | expectedShape already supported | Wire-up only |
| `n8n/generate-content-package-bridge.json` | N3 node | `retryOnFail: false` or exclude 422 | Stop 3× full paid retries |
| `supabase/migrations/0xx_….sql` | DDL | Add `generation_telemetry` (+ optional snapshot/hash) to failure_telemetry | Persist step audit on fail |
| `lib/production-runtime/failureTelemetry.ts` | `persistPackageGenerationFailureTelemetry` | Write snapshot/hash; stop silent drop when column missing | Observability |
| Tests (new) | see §10 | prompt↔schema fixtures; repair fingerprint; n8n config check | Acceptance |

**Out of scope:** Creative Engine, new pipeline stages, architecture rewrite, typed-IMAGE preference over legacy.

---

## 9. Acceptance Criteria

- [ ] Content Package JSON projde `buildContentPackageSchema` + `generatedVisualSceneEntryValidator`
- [ ] Žádný error `unrecognized visual scene entry` na happy-path IMAGE scenes
- [ ] Max repair attempts definováno (≤1 schema repair / Claude attempt; Claude ≤2 po prompt fix)
- [ ] Identický validation fingerprint nespouští nekonečné / 5× stejné paid repairs
- [ ] Každý stage má duration / cost / bounded output audit (i při faili)
- [ ] Jeden kompletní package doběhne do video jobu (images + voice + subtitles + render)
- [ ] Žádný duplicate package attempt na jednu strategy item při 422
- [ ] Celkový čas a cena runu dohledatelné z DB (strategy + package attempts sum)

---

## 10. Production Verification Procedure

### Local / CI (before prod)

1. **Unit: prompt↔schema** — snapshot `buildContentPackagePrompt` contains legacy IMAGE examples; validator accepts fixture package built from those examples.
2. **Fixtures per scene type** — one valid JSON each: legacy ai, legacy asset, CHECKLIST, PHONE, QUOTE, STATISTIC, CTA; all pass `generatedVisualSceneEntryValidator`.
3. **Repair + invalid shape** — feed `{ visual_scenes: [{ description: "x" }] }` with `expectedShape`; assert repair either fixes to legacy IMAGE or fails in ≤1 schema repair without 5 loops.
4. **Identical fingerprint** — mock validator always returning same unrecognized issues; assert ≤1 schema repair per attempt / early stop.
5. **Stage telemetry** — fail path inserts failure_telemetry **with** steps array (after migration).

### Production — one package test

**Stop conditions (abort immediately):**

- Second `owner_token` for same `strategy_item_id` within the run
- > 4 paid Claude calls for Content Package stage
- > 2 JSON Repair calls total
- Any `unrecognized visual scene entry` after prompt deploy
- Wall clock package generation > 8 minutes
- Estimated package cost > $0.20 before video worker

**Procedure:**

6. Deploy prompt + repair + n8n retry fix; confirm N3 `retryOnFail` false in live workflow.
7. Start production run `packageCount=1` on a non-critical project.
8. SQL: `content_packages` row exists; `production_run_items.content_package_id` set; status progressing.
9. SQL: `video_jobs` queued/processing for package.
10. Worker: images present in job output / storage.
11. Voice/TTS audio path present.
12. Subtitles / SRT present.
13. Render completes (mp4 URL).
14. Cost: sum strategy_brief + package `generation_telemetry` + video debug ≤ budget; duration logged; **exactly one** failure_telemetry owner_token if any fail, else zero failure rows.

**Example checks:**

```sql
-- one claim / one success path
SELECT owner_token, status, created_at, updated_at
FROM content_package_generation_claims
WHERE strategy_item_id = '<item>';

SELECT estimated_cost_usd, owner_token, error_truncated, created_at
FROM production_run_item_failure_telemetry
WHERE production_run_id = '<run>'
ORDER BY created_at;

SELECT status, content_package_id, video_job_id, error_message
FROM production_run_items
WHERE production_run_id = '<run>';
```

---

## 11. Final Recommendation

**FIX PROMPT + REPAIR + RETRY LOCK**

Meaning in this incident:

1. **Prompt** — document legacy IMAGE `visual_scenes` (primary).
2. **Repair** — pass `expectedShape` + stop identical fingerprint loops.
3. **Retry** — disable n8n retry on HTTP 422 content failures (claim lock itself is fine).

Not broader architecture. Safe to run **one** test package after these three land.
