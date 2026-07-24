# Content Pipeline Incident Fix

**Incident run:** `d15447f4-889e-4e38-a82e-9250f45d8663`  
**Date:** 2026-07-24  
**Scope:** Prompt + repair + n8n retry guard + failure telemetry audit (no architecture change).

---

## 1. Files Changed

| File | Change |
|------|--------|
| `lib/content-pipeline/prompts/contentPackageVisualScenes.ts` | **New** — shared visual_scenes prompt block + expectedShape |
| `lib/content-pipeline/prompts/contentPackage.ts` | Wire visual_scenes contract + platform/duration field types |
| `lib/content-pipeline/runContentPackage.ts` | `expectedShape`, `maxAttempts: 2`, pass `lastRaw` on fail |
| `lib/content-pipeline/runCreativePipeline.ts` | Forward `lastRaw` on package fail |
| `lib/ai/runWithRepair.ts` | Schema-repair fingerprint stop; max 1 schema repair / attempt |
| `lib/ai/prompts/jsonRepair.ts` | Preserve content; honor EXPECTED SHAPE |
| `lib/ai/workflows/shared.ts` | Optional `lastRaw` on fail `WorkflowResult` |
| `lib/ai/workflows/generateContentPackage.ts` | Persist snapshot/hash via failure telemetry |
| `lib/ai/workflows/weeklyStrategyGate.ts` | `isProductionRunItemAlreadyFailed` |
| `lib/n8n/handleGenerateContentPackageRequest.ts` | HTTP 200 skip when item already failed |
| `lib/production-runtime/boundedFailureSnapshot.ts` | **New** — hash + 24KB snapshot |
| `lib/production-runtime/failureTelemetry.ts` | Persist `generation_telemetry`, `output_hash`, `output_snapshot` |
| `n8n/generate-content-package-bridge.json` | N3 `retryOnFail: false`, `maxTries: 1` |
| `supabase/migrations/028_failure_telemetry_audit.sql` | Audit columns |
| `scripts/check-content-pipeline-incident-fix.ts` | **New** check suite |
| `scripts/check-generation-failed-settlement.ts` | Assert N3 retry + handler guard |
| `package.json` | `check:content-pipeline-incident-fix` |
| `docs/architecture/content-pipeline-incident-fix.md` | This report |

---

## 2. Prompt Fix

Supported `visual_scenes` (prefer legacy IMAGE):

```json
{ "source": "ai", "image_prompt": "A concrete visual description for one scene" }
```

```json
{
  "source": "asset",
  "asset_id": "existing-asset-uuid",
  "used_as": "background, product reference, screen content, or other clear usage"
}
```

Optional typed (only when needed): `CHECKLIST` / `PHONE` / `QUOTE` / `STATISTIC` / `CTA` as `{ "type", "payload" }` per `generatedVisualSceneEntryValidator`.

Explicitly forbidden: invented fields (`description`, `prompt`, …) and `{ "type": "IMAGE", "image_prompt": "..." }`.

Platform outputs: `caption`/`cta` strings; `hashtags` string[]; optional variants; `video.duration_seconds` string; `asset_usage[].used_as` string.

---

## 3. Repair Fix

- **expectedShape:** `buildContentPackageExpectedShape()` (legacy scenes + platform types + typed note).
- **maxAttempts:** `CONTENT_PACKAGE_MAX_ATTEMPTS = 2` (explicit; was implicit 3).
- **fingerprint stop:** `validationIssuesFingerprint` — sorted `path\\0message`; identical fingerprint skips further schema repairs.
- **Max repair calls per primary attempt:** 1 parse-repair + 1 schema-repair (schema skipped if fingerprint matches prior).

---

## 4. Retry Fix

**Repo bridge JSON (N3):**

| | Before | After |
|--|--------|-------|
| `retryOnFail` | `true` | `false` |
| `maxTries` | `3` | `1` |

**Live n8n:** MCP cannot set `retryOnFail` on HTTP nodes. Active published version may still show `retryOnFail: true`.

**App-level guard (effective even if live n8n retries):** if `production_run_items.status === 'failed'`, handler returns **HTTP 200** `{ ok: false, skipped: true, error: "already_settled_failed" }` **before** claim/AI — no second `owner_token`, no paid re-run.

Claim lock unchanged.

---

## 5. Observability Fix

**Table:** `production_run_item_failure_telemetry`

| Field | Purpose |
|-------|---------|
| existing aggregates | run/item/strategy, owner_token, phase, provider, model, tokens, cost, duration, error |
| `generation_telemetry` | full step document (was missing in prod) |
| `output_hash` | sha256 of last raw |
| `output_snapshot` | bounded JSON ≤ 24 576 bytes: validation_errors, visual_scenes, platform_outputs types, truncated candidate; `truncated: true` when cut |

Also mirrored onto `production_run_items.failure_telemetry` jsonb.

No binaries/secrets. Fail path always persists when collector has steps or errors/raw.

---

## 6. Database Migration

| Item | Detail |
|------|--------|
| Name | `028_failure_telemetry_audit` |
| Columns | `generation_telemetry jsonb`, `output_hash text`, `output_snapshot jsonb` (`IF NOT EXISTS`) |
| Applied to production | **Yes** — via Supabase MCP `apply_migration` on 2026-07-24 (verified with `information_schema`) |
| Repo file | `supabase/migrations/028_failure_telemetry_audit.sql` |

Note: repo `027_business_cost_accounting.sql` also adds `generation_telemetry` but was **not** previously applied on this project; 028 covers that gap idempotently.

---

## 7. Tests

| Command | Result |
|---------|--------|
| `npm run check:content-pipeline-incident-fix` | **27 passed** |
| `npm run check:json-repair-runner` | **14 passed** |
| `npm run check:generation-failed-settlement` | **22 passed** |
| `npm run check:business-cost-accounting` | **11 passed** |
| `npm run check:production-runtime` | **21 passed** |
| `npm run check:phase-6g-runtime-hardening` | **20 passed** |
| `npm run check:visual-scene-plan` | **20 passed** |
| `npm run check:pipeline-telemetry` | **13 passed** |
| `npm run check:content-pipeline-quality` | **11 passed** |
| `npx tsc --noEmit` | **exit 0** |
| `npm run build` | **exit 0** |

Production generation run: **not executed** (per instructions).

---

## 8. Remaining Risks

1. **Live n8n active version** may still have N3 `retryOnFail: true` until an operator publishes a draft with retry off + credentials + `onError: continueRegularOutput`. Mitigated by `already_settled_failed` HTTP 200 guard.
2. **Content-package-worker** must be redeployed with this code for the guard + prompt/repair fixes to apply on the path n8n actually calls.
3. Prompt fix strongly biases legacy IMAGE; typed scenes remain allowed but less prompted — rare mistype of typed payload still possible (repair + expectedShape should help).
4. Bounded snapshot truncates large voiceovers/scenes — hash still identifies full raw.

---

## 9. Production Test Procedure

1. Deploy app + **content-package-worker** with this commit.
2. In n8n UI (recommended): open workflow `NAKo5V3Ctlq5aW4i`, set N3 **Retry On Fail = off**, ensure Header Auth credential + `onError = Continue`, **Publish**.
3. Start one production run with `packageCount: 1`.
4. Watch SQL:

```sql
SELECT owner_token, estimated_cost_usd, error_truncated, output_hash IS NOT NULL AS has_hash,
       generation_telemetry IS NOT NULL AS has_steps, created_at
FROM production_run_item_failure_telemetry
WHERE production_run_id = '<run>'
ORDER BY created_at;

SELECT status, content_package_id, video_job_id, error_message
FROM production_run_items WHERE production_run_id = '<run>';
```

5. Confirm package → video job → images → voice → subtitles → render.

**Stop immediately if:**

- second `owner_token` for the same strategy item,
- new `unrecognized visual scene entry`,
- more than 2 primary Content Package Claude calls,
- more than 2 JSON Repair calls total,
- package generation wall > 8 minutes,
- package AI cost > $0.20 before video worker.

---

## 10. Final Verdict

**READY FOR ONE CONTROLLED PRODUCTION TEST**

(After worker deploy; prefer also publishing n8n N3 with retry off. App guard already blocks paid duplicate retries.)
