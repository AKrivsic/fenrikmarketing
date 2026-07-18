# Regression Audit — Sprint 4C Pipeline Stop

_Audit only. No code changes. Evidence from production DB, Vercel runtime logs, n8n execution `142`, commit `8f43cdb`._

**UI message:** `Generování se nezdařilo spustit (pipeline neprodukuje balíčky).`  
**Source of UI text:** `lib/api/production-run-admin.ts` → `failStaleProductionRunIfNeeded` (stale after 12 minutes with strategy items but **zero packages**).

---

## 1. Root cause

Sprint 4C made **visual product demonstration a hard fail** after LLM generation (and after one repair). Production packages still do not emit prompts that match the new semantic `ANSWER_VISUAL_RE` / full ask→answer→result contract.

`runGenerateContentPackage` therefore returns:

```json
{ "ok": false, "error": "generation_failed", "validation_errors": [...] }
```

→ HTTP **422** from `/api/n8n/generate-content-package`  
→ **no `content_packages` row inserted**  
→ `production_run_items` stay `queued` with `content_package_id = null`  
→ after ~12 minutes, reconcile marks the run `failed` with the Czech “pipeline neprodukuje balíčky” message.

**Primary failing gate (most attempts):** Story Integrity’s `product_demonstration_missing`, now powered by Sprint 4C **semantic** `detectProductDemonstration` (stricter than pre-4C keywords).

**Secondary failing gate:** Product Demonstration Integrity hard fail (`answer_not_visual`) when SI somehow passes or after SI repair.

This is **not** a missing export, broken wiring, or crash before LLM. Generation runs; validators reject **after LLM (+ repair)**; DB never gets a package.

---

## 2. Exact failing file / function

| Layer | Detail |
| --- | --- |
| API | `app/api/n8n/generate-content-package/route.ts` → `runGenerateContentPackage` |
| Workflow | `lib/ai/workflows/generateContentPackage.ts` |
| SI fail return | ~L670–686 — `if (!storyIntegrity.passed) return { ok:false, error:"generation_failed", ... }` |
| SI product check | `lib/creative-candidates/storyIntegrity.ts` ~L501–560 — `detectProductDemonstration` → Sprint 4C semantic |
| Semantic detector | `lib/creative-candidates/productDemonstrationIntegrity.ts` — `detectSemanticProductDemonstration` / `ANSWER_VISUAL_RE` (~L137–138) |
| 4C hard gate | `generateContentPackage.ts` ~L691–784 — `validateProductDemonstrationIntegrity` → fail after repair |
| Stale UI | `lib/api/production-run-admin.ts` ~L353–380 — `STALE_PRODUCTION_RUN_MESSAGE` |

**Condition that stops the pipeline:**

```ts
!storyIntegrity.passed   // after one integrity repair
// and/or
!productDemoIntegrity.passed  // after one 4C repair
→ generation_failed → 422 → no package persist
```

---

## 3. Why previous Sprint worked

| Run | When (UTC) | Result |
| --- | --- | --- |
| `9d9fa60b` | 21:31–21:44 | **completed** (pre-4C deploy) |
| `4633f34f` | earlier | completed |

Pre-4C (`6295aea` Story Integrity):

- `ANSWER_RE` matched phrases like **“No reply bubble”** (false positive).
- `RESULT_RE` matched problem VO **“lead”**.
- Packages with weak visuals still **PASSed** product demo and shipped.

Sprint 4C (`8f43cdb`, pushed ~22:36 UTC Jul 18):

- Semantic detector requires explicit visual answer phrases (`AI reply appears`, `chatbot replies`, …).
- Narration-only / negated “no reply” no longer counts.
- Additional hard gate after SI.
- Same LLM output class that used to ship now **hard-fails**.

---

## 4. Which Sprint introduced the regression

**Sprint 4C** — commit `8f43cdb` (“Add Product Demonstration Integrity…”).

Timeline:

| Time (UTC) | Event |
| --- | --- |
| 21:44 | Last successful Fenrik run `9d9fa60b` |
| ~22:36 | 4C on `main` / deploy `dpl_22Zu2TprZnSURfEJuAkGx7wYchRa` |
| 22:40 | Failed run `05f64fc8` starts |
| 22:53 | Failed run `67beba94` starts |

---

## 5. Minimal fix (recommendation only — not applied)

1. **Do not dual-hard-fail with identical severity without a passable prompt contract.** Either:
   - soften `ANSWER_VISUAL_RE` to accept common LLM wording (`reply bubble`, `AI response on screen`, `chat answers`) while keeping negation guards, **or**
   - inject a deterministic resolution-scene template that already matches the regex.
2. **Decouple:** keep SI world checks as hard; treat first-pass product-demo miss as repair-only with a longer / structured repair appendix (exact required prompt phrases).
3. **n8n:** on `generation_failed`, mark run item `failed` with the validation path instead of continuing to “Start Video Job” without `content_package_id` (secondary bug masking root cause).
4. Watch **300s `maxDuration`**: generate + SI repair + 4C repair can 504 (`22:45:36`).

---

## 6. Risk assessment

| Risk | Level | Notes |
| --- | --- | --- |
| Pipeline produces zero packages | **Critical** | Confirmed on 2/2 post-4C Fenrik runs |
| Validator “impossible” | **High** | Not literally always-false; LLM often omits exact answer phrases; one attempt had ask+result but **no answer** |
| PRIMARY_ACTOR uninitialized | Low | `derivePrimaryActor` always returns a label |
| Missing export / schema | **Ruled out** | Functions run; logs show validator results |
| Repair ignored | **Ruled out** | Logs say “hard fail **after repair**” |
| Expected vs bug | **Both** | Strict demo gate was intended; making SI + 4C hard-fail without a reliably satisfiable prompt contract is a **production regression bug** |

---

## Failing stage map

```
Selection                          ✅ (candidates chosen: c3/c6 direct_product_world)
Creative DNA                       ✅
Narrative Beats                    ✅
LLM package generation             ✅ (visual_scenes produced)
Story Integrity validate           ❌ product_demonstration_missing (most runs)
  └─ 1× SI repair LLM              ✅ runs
Story Integrity re-validate        ❌ still fail
Product Demonstration Integrity    ❌ answer_not_visual (when reached)
  └─ 1× 4C repair LLM              ✅ runs (when SI passed)
DB insert content_packages         ❌ never (before persist)
Video job                          ❌ n8n still calls Start Video → 400 missing content_package_id
UI stale fail (12 min)             ❌ surface error users see
```

**When relative to LLM:** **after LLM**, **after repair**, **before DB**.

---

## Trace — run `05f64fc8-45f4-4db3-972a-5289a8e2f13a`

### Inventory

| Entity | Value |
| --- | --- |
| Status | `failed` |
| generated_total | **0** |
| failed_total | 0 (no package-level fail recorded) |
| Run item | `5826dfaa-…` status **`queued`**, `content_package_id` **null** |
| Strategy item | `a7f19ea9-…` (created; topic SaaS pricing drop-offs) |
| Packages | **none** |
| Video jobs | **none** |
| n8n | workflow `NAKo5V3Ctlq5aW4i` execution **142** (~22:40–22:54) |

### Stage-by-stage

```
Webhook generate_content_package
  → Read strategy item a7f19ea9 ✅
  → N3 Generate Content Package
       POST /api/n8n/generate-content-package
       Selection → DNA → Beats → LLM ✅
       Story Integrity ❌ product_demonstration_missing
         evidence: missing_ai_answer, missing_result
       SI repair (1×) ✅
       Story Integrity ❌ still fail
       return generation_failed → HTTP 422
  → N4 Start Video Job (continue-on-error path)
       400 content_package_id is required
  → Loop ends “success” with no package
  → ~12 min later: failStaleProductionRunIfNeeded → UI Czech message
```

### Validator results (Vercel logs)

**22:40:41** — `[story-integrity] hard fail after repair` `c3-direct_product_world-div`

```json
[{
  "code": "product_demonstration_missing",
  "message": "Package lacks an explicit product interaction (visitor asks → AI answers → result). Landing page alone is not a product demonstration.",
  "evidence": "missing_ai_answer,missing_result"
}]
```

**22:45:36** — `504` Vercel Runtime Timeout (300s) on same endpoint.

**22:50:38** — again `[story-integrity] hard fail after repair` `c3-direct_product_world-div`, same `product_demonstration_missing` / `missing_ai_answer,missing_result`.

### n8n N3 response body (execution 142)

```json
{
  "ok": false,
  "error": "generation_failed",
  "attempts": 1,
  "validation_errors": [{
    "path": "story_integrity.product_demonstration_missing",
    "message": "Package lacks an explicit product interaction (visitor asks → AI answers → result). Landing page alone is not a product demonstration. (missing_ai_answer,missing_result)"
  }]
}
```

---

## Trace — run `67beba94-5068-4f00-a985-7a51728fcad9`

| Entity | Value |
| --- | --- |
| Status | `failed` |
| generated_total | **0** |
| Run item | `8d3e2d43-…` **queued**, no package |
| Strategy item | `bbc0af87-…` |
| n8n | execution **143** (still `running` at query time / long hang) |

**22:53:41** — `[product-demonstration-integrity] hard fail after repair` `c6-direct_product_world-div`

```json
[{
  "code": "answer_not_visual",
  "message": "Missing visual AI answer beat (reply appearing on the same chat/phone)",
  "evidence": "ask_visual:scene_2,result_visual:scene_3"
}]
```

Interpretation: ask + result detected; **answer phrase never matched** `ANSWER_VISUAL_RE` — detector gap / LLM omission of required wording.

**22:58:21 / 23:02:37** — `[story-integrity] hard fail after repair` with:

- `abstract_metaphor_in_middle` (`analytics_montage`)
- `location_changed_without_reason`
- `product_demonstration_missing` (`missing_ask,missing_ai_answer,missing_result` or `missing_ai_answer,missing_result`)

---

## Checklist: “Did 4C make the validator impossible?”

| Hypothesis | Finding |
| --- | --- |
| PRIMARY_ACTOR never initialized | **No** |
| answer detector impossible | **Nearly** — requires narrow phrase list; common prompts miss it |
| required fields never generated | LLM generates scenes; they fail **semantic** match |
| repair prompt impossible | Repair runs; still fails match |
| validator always false | **No** — unit tests pass with crafted prompts |
| repair result ignored | **No** — “after repair” logs |
| repair loop broken | One repair then hard fail (by design) |
| generation_failed too early | **After** LLM+repair, **before** DB — correct for gate, catastrophic for ops |
| missing export / wiring / schema | **No** — validators execute in production |
| undefined field crash | **No** — structured 422, not 500 |

---

## Verdict summary

1. **Root cause:** Sprint 4C semantic product-demo hard fail (via Story Integrity + dedicated 4C gate) rejects all post-deploy Fenrik package generations; nothing is persisted; UI stale-timeout fires.  
2. **Failing function:** `validateStoryIntegrity` → semantic `detectProductDemonstration` (`product_demonstration_missing`), and/or `validateProductDemonstrationIntegrity` (`answer_not_visual`) in `generateContentPackage.ts`.  
3. **Why before worked:** Keyword false positives let weak demos pass.  
4. **Introduced by:** Sprint 4C / `8f43cdb`.  
5. **Minimal fix:** Make answer detection / repair prompts match what the LLM actually emits (or template the resolution scene), and surface `generation_failed` on the run item instead of silent “no packages”.  
6. **Risk:** Critical production stop until fixed or temporarily relaxed.

**Expected?** Partially — 4C intended to block bad demos.  
**Bug?** Yes — as a regression: the gate blocks **all** packages without a reliably passable generation path, which stops the production pipeline entirely.
