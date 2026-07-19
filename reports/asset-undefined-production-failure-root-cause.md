# PRODUCTION FAILURE ROOT CAUSE — `asset undefined not found in project`

**Mode:** Forensic root cause audit · no fix implemented  
**Date:** 2026-07-20  
**Deploy under investigation:** `ffe076b` (PRODUCT_DEMO / Visual Diversity patch)

---

## Executive conclusion

The exact stored error is **`asset undefined not found in project`** (lowercase `asset`, no capital A).

It is emitted by **`validateVisualScenePlanGuardrails`** in `lib/content-package/visualScenePlan.ts` when a structurally valid **`{ type: "IMAGE", payload: { source: "ai", image_prompt } }`** scene is treated as an asset scene because the guardrail only checks **root** `scene.source === "ai"`, not `payload.source`. With no root `asset_id`, JavaScript interpolates **`undefined`** into the error string.

This is a **pre-existing latent guardrail bug**. The latest prompt patch did **not** change that file. It likely **increased the chance** the model emits typed `IMAGE` wrappers (new “IMAGE scenes” wording + existing typed `PRODUCT_DEMO` pattern), which **exposed** the bug.

The failed run **still completed**: package + video job succeeded after repair/retry; a **stale** `production_runs.error_message` was left uncleared.

**Verdict: PATCH EXPOSED LATENT BUG**

---

## 1. Failed run identifiers

| Field | Value |
| --- | --- |
| production_run ID | `3c58a5f3-8324-4e19-8d2c-aeb43cb79a5e` |
| project ID | `aabab9ff-9db4-4012-a53c-135e3bfea6cd` (Fenrik.chat) |
| status | `completed` |
| generated_total / failed_total | `1` / `0` |
| **exact error_message** | **`asset undefined not found in project`** |
| created_at | `2026-07-19 22:55:28.489565+00` |
| updated_at | `2026-07-19 23:07:30.537061+00` |
| content_package ID | `daf295c0-1509-4f98-8cd4-24ed03cbbcb1` |
| strategy item ID | `ef6d2187-b990-4845-a42e-722b85198872` |
| production_run_item ID | `fda47344-ea87-45d7-8415-0665e2ac7363` (status `completed`, `error_message` null) |
| video_job ID | `35b8e7ba-d1bb-4bc8-9f6a-5981a5613620` (status `completed`) |
| content_item (video) | `040130fa-655e-404e-80d4-43fec5c1d6a7` |
| failing endpoint | `POST /api/ai/generate-content-package` (n8n → package generation) |
| deployment | Vercel `dpl_3c1Zet8JkK4DHHDodMatchu6GFS8` |
| commit SHA | `ffe076ba24459dd2eae1b8b60437f608489d88ff` |
| deploy ready at | `2026-07-19T22:51:36.682Z` (~4 min before run start) |

Exact wording confirmation: **`asset undefined not found in project`** — matches template `` `asset ${…} not found in project` `` with JS `undefined` (or string `"undefined"`). Not a different phrasing.

Vercel runtime log search for this string in the window returned no lines (logs may be incomplete); DB + deterministic local reproduction are the primary evidence.

---

## 2. Error origin

### Exact throw / issue site

| | |
| --- | --- |
| File | `lib/content-package/visualScenePlan.ts` |
| Function | `validateVisualScenePlanGuardrails` |
| Lines | **351–356** |
| Message | `` `asset ${scene.asset_id} not found in project` `` |

Parallel path (same message template) in `lib/ai/workflows/packageShared.ts` **266–271** for `pkg.asset_usage` — possible alternate, but reproduction proves the **visual_scenes** path alone is sufficient.

### Call chain

```
n8n production run
→ POST /api/ai/generate-content-package
→ runGenerateContentPackage
→ generateValidatedJson
   → buildContentPackageSchema (structural PASS for typed IMAGE+payload)
   → makePackageGuardrails
      → validateVisualScenePlanGuardrails   ← FIRST hard fail message
→ generation_failed (+ validation_errors[0].message)
→ markProductionRunItemGenerationFailed
→ settleProductionRunAfterItemFailure (stores humanized message on run)
→ later retry / reconcile → package succeeds; run.error_message NOT cleared
```

Secondary identical template:

```
makePackageGuardrails → for (usage of pkg.asset_usage) → classById.get(usage.asset_id)
```

---

## 3. What was undefined

**Undefined value:** `scene.asset_id` on a **non-asset** scene.

Not: project ID, asset row deleted, Product Brain ID, DNA field.

### Deterministic reproduction (local, current main)

Input scene (schema-valid):

```json
{
  "type": "IMAGE",
  "payload": {
    "source": "ai",
    "image_prompt": "hands on phone street"
  }
}
```

| Step | Result |
| --- | --- |
| `generatedVisualSceneEntryValidator` | `[]` (PASS) — validates `payload` via `validateLegacyImageEntry` |
| `isTypedNonImageVisualSceneEntry` | `false` (IMAGE is not CHECKLIST/PHONE/…/PRODUCT_DEMO) |
| `scene.source === "ai"` | `false` (`source` is on **payload**, not root) |
| `classById.get(scene.asset_id)` | `get(undefined)` → miss |
| Issue message | **`asset undefined not found in project`** |

Control cases that **do not** fail:

- `{ "source": "ai", "image_prompt": "…" }` → PASS  
- `{ "type": "IMAGE", "source": "ai", "image_prompt": "…" }` → PASS  
- `{ "type": "PRODUCT_DEMO", "payload": {…} }` → PASS (typed non-image skip)

### First invalid state

**First invalid boundary:** LLM JSON emits typed IMAGE with nested `payload.source` / `payload.image_prompt` (accepted by schema) **before** guardrails correctly interpret it as AI imagery.

The invalid *interpretation* is in the guardrail (treats missing root `source` as asset lookup), not in the asset library.

Final persisted package for this run used **flat** `{ source: "ai", image_prompt }` + one `PRODUCT_DEMO` — so the bad shape was an **earlier attempt**, not the final brief.

Final `package_brief.asset_usage`: **`[]`**.

---

## 4. Database forensics

| Check | Evidence |
| --- | --- |
| Run error | Plain string `asset undefined not found in project` on `production_runs` |
| Item error | `null` (reconcile overwrote after success) |
| Package visual_scenes | 4× AI stills (flat `source:"ai"`) + 1× `PRODUCT_DEMO` |
| Package asset_usage | `[]` |
| Project assets | 5 image assets exist (not required for this failure) |
| Literal `"undefined"` asset id in DB | Not present in final brief |
| Cross-project asset | N/A — no asset reference in final package |
| Video job | `completed`, `error_message` null |

**Stale error on completed run:** `syncRunItemsAndCounters` updates `status` / counters but **does not clear** `production_runs.error_message` after a later successful package. That explains completed + non-null error.

---

## 5. Patch correlation

### Diff of deploy `ffe076b`

Only:

- `lib/ai/prompts/generateContentPackage.ts` (continuity / progression / IMAGE wording)
- `lib/creative-candidates/promptBlocks.ts`
- `scripts/check-product-demo-visual-diversity-patch.ts`
- `package.json`
- implementation report

**Not modified:** `visualScenePlan.ts`, `packageShared.ts`, asset loaders, validators for asset existence, renderer.

### Can the patch affect asset references?

| Mechanism | Assessment |
| --- | --- |
| Directly write `asset_id` | **No** — patch does not touch asset fields |
| Cause missing asset ID in schema | **No** |
| Increase typed **IMAGE** scene emissions | **Yes, plausible** — new text repeatedly says “IMAGE scenes” / “consecutive IMAGE scenes”; model already knows typed shapes (`PRODUCT_DEMO`, PHONE, …) and schema accepts `{ type: "IMAGE", payload }` even though JSON shape examples show flat `{ source: "ai" }` |
| Bypass a previous fallback | **No** evidence of removed fallback |

### Causality classification (primary)

**B. Indirect regression exposed by changed model output**

Evidence:

1. Exact error reproduced from pre-existing guardrail + schema asymmetry (no patch file involved).  
2. Deploy `ffe076b` at `22:51:36Z`; run at `22:55:28Z`.  
3. Final successful package has diverse IMAGE prompts (patch goal) and empty `asset_usage`.  
4. Only one historical run in DB carries this exact `error_message`.

Not A (direct): patch files do not contain the failing lookup.  
Not D (bad project data): assets exist; failure does not require assets.  
Not E (stale worker): failure is in Next.js generate-content-package path, not video worker.

---

## 6. Schema and contract audit

| Stage | Asset field | Required? | Undefined possible? | Validation |
| --- | --- | --- | --- | --- |
| LLM JSON | `visual_scenes[]` | optional plan | typed IMAGE+payload allowed | `generatedVisualSceneEntryValidator` |
| Schema | `asset_usage[].asset_id` | if entry present | no (`vNonEmptyString`) | OK |
| Schema | typed IMAGE | — | payload.source required for ai | OK for nested payload |
| Guardrail | root `source` / `asset_id` | assumed for non-typed | **YES — bug** | looks up `scene.asset_id` without resolving payload |
| Persist | final brief | — | flat ai scenes | OK |
| Renderer | — | — | not reached on gen fail | — |

**Missing guard:** After structural validation of typed IMAGE, guardrails must treat AI imagery the same whether `source` is on the root or under `payload`, and must **not** call `classById.get` unless `source === "asset"` (root or payload).

**Optional Asset Library:** Still required to work with empty `asset_usage`. This bug can fire **with or without** assets (empty `classById` still yields the same message). **Critical contract risk:** no-asset projects are not immune.

---

## 7. Why tests did not catch it

| Suite | Why it missed |
| --- | --- |
| `check:product-demo-visual-diversity-patch` | Asserts **prompt strings only**, not runtime `visual_scenes` shapes |
| `check:product-demo-structured` / PDI | PRODUCT_DEMO path; skips IMAGE typed wrapper |
| `check:narrative-beats` | Prompt includes `VISUAL PROGRESSION`; no guardrail fixture |
| `check:render-fidelity` / language-variant | Post-persist / render; not generate guardrails |
| Asset tests (`check-asset-prompt-backward-compat`, coverage) | Empty library + empty `asset_usage`; never `{ type:"IMAGE", payload:{source:"ai"} }` |

**Missing fixture that would have failed before deploy:**

```ts
validateVisualScenePlanGuardrails({
  pkg: {
    visual_scenes: [
      { type: "IMAGE", payload: { source: "ai", image_prompt: "x" } },
    ],
  },
  classById: new Map(), // even empty library
  requireVideo: true,
});
// EXPECT: no issues
// ACTUAL: [{ message: "asset undefined not found in project" }]
```

---

## 8. Blast radius

| Population | Count / note |
| --- | --- |
| Total projects | 21 |
| Projects with zero assets | 8 — **still at risk** (bug is shape-based) |
| Fenrik assets | 5 |
| Open production runs | 0 |
| Runs with this exact error_message | **1** (`3c58a5f3-…`) |
| Already failed open jobs | 0 |
| Language variants | Not involved in this run |
| PRODUCT_DEMO | Intact on successful package |
| Newly generated packages | Highest risk when model emits typed IMAGE+payload |

**Critical:** Asset Library optional — a no-asset project can still hit this if the model emits typed IMAGE wrappers.

---

## 9. Immediate containment (do not implement)

| Question | Answer |
| --- | --- |
| Workers still retrying? | No open runs |
| Late callbacks overwrite? | Video already completed |
| Run stuck? | No — `completed` |
| Regeneration safe? | Yes for content; expect intermittent gen failures until guardrail fixed |
| Rollback patch? | **Not required** for this error (latent guardrail) |
| Disable path? | Optional: temporarily discourage `type:"IMAGE"` in prompt — weaker than fixing guardrail |

**Containment:** Keep deploy; fix guardrail ASAP; treat run error_message as stale UI noise for this run.

---

## 10. Minimal correct fix (proposal only)

**File:** `lib/content-package/visualScenePlan.ts` → `validateVisualScenePlanGuardrails`

**Contract change:** Only project-lookup assets when the scene is an **asset** scene after resolving root **or** `payload` (same resolution as `generatedVisualSceneEntryValidator` / normalize). For `type === "IMAGE"` (or legacy), if effective `source === "ai"`, skip asset lookup.

**Behavior:**

- Missing optional assets / empty `asset_usage` → continue to pass.  
- Explicit `source:"asset"` with valid project UUID → lookup as today.  
- Explicit asset id not in project → fail early with ``asset <id> not found in project`` (real id, never `undefined`).  
- Typed IMAGE + nested AI payload → **pass**.

**No migration.** No renderer change.

**Also (small, related):** when reconcile marks a run completed with `generated_total > 0`, clear stale `production_runs.error_message` if it came from a superseded generation_failed — separate hygiene bug.

**Tests required:** the fixture in §7; plus assert no-asset `classById` empty + typed IMAGE payload passes; plus asset scene with real missing UUID still fails with that UUID in the message.

---

## 11. Safe retry decision

| | |
| --- | --- |
| Safe to retry | **YES** — this run already produced a package/video; new runs may intermittently hit the latent guardrail until fixed |
| Rollback required | **NO** |

---

## Final verdict

# PATCH EXPOSED LATENT BUG

---

### End card

| | |
| --- | --- |
| failed run ID | `3c58a5f3-8324-4e19-8d2c-aeb43cb79a5e` |
| root cause | Guardrail treats schema-valid `{type:"IMAGE", payload:{source:"ai"}}` as an asset scene and looks up missing `asset_id`, emitting `asset undefined not found in project`. |
| causality | **PATCH EXPOSED LATENT BUG** |
| safe to retry | **YES** |
| rollback required | **NO** |
| report path | `reports/asset-undefined-production-failure-root-cause.md` |
