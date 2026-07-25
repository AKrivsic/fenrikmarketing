# Content Pipeline Contract Fix

**Date:** 2026-07-25  
**Related:** `docs/architecture/content-pipeline-contract-audit.md`, runs `d15447f4`, `b343a24b`

---

## 1. Executive Summary

C1 (CTA) was **re-modeled for organic social** (funnel-stage optional/soft vs Conversion business). C2 (voiceover ≤80) remains in place. **C3 live n8n N3 retry is fixed and published** on a new active bridge workflow.

**Verdict:** **READY for one controlled production run** (no paid run executed in this pass).

---

## 2. C3 — Live n8n N3 retry (published)

MCP `update_workflow` cannot set top-level `retryOnFail` / `onError` on existing HTTP Request nodes, and cannot attach `httpHeaderAuth` credentials to HTTP Request nodes. Fix path:

1. Unpublish legacy workflow `NAKo5V3Ctlq5aW4i` and move its webhook path to `generate-content-package-legacy-d154`.
2. Recreate the bridge via Workflow SDK with N3 settings + header auth via `sendHeaders` (`x-n8n-secret`).
3. Publish and verify **activeVersion** (not draft).

| Field | Active version (verified) |
|-------|---------------------------|
| Workflow ID | **`O27ELb1s9Y2qisOr`** |
| Webhook path | `generate-content-package` (unchanged for the app) |
| activeVersionId | `4f4e98df-55ec-44d5-945d-07eefbe9ae9c` |
| N3 `retryOnFail` | `null` (**falsey / OFF** — n8n stores `false` as `null`) |
| N3 `maxTries` | **`1`** |
| N3 `onError` | **`continueRegularOutput`** |

App guard `already_settled_failed` (HTTP 200 skip) — **kept**.

Repo export `n8n/generate-content-package-bridge.json` still documents N3 `retryOnFail: false`, `maxTries: 1`, `onError: continueRegularOutput` and notes the live workflow id.

Probes `YIovf0iyRbtf9eL8` / `YGY9wsA3jj01uCHz` archived.

---

## 3. CTA rule by funnel stage (organic social)

We are **not** an ads generator. Packages are regular organic social content. Not every package needs a sales CTA.

| Funnel stage | Package `cta` | Allowed `cta.type` |
|--------------|---------------|--------------------|
| Awareness | **optional** `null` or soft | `follow \| save \| comment \| share` |
| Problem Aware | **optional** `null` or soft | same soft set |
| Solution Aware | optional soft **or** business | soft ∪ `CTA_TYPES_BY_GOAL[goal]` ∩ business |
| Conversion | **required** business | `CTA_TYPES_BY_GOAL[goal]` ∩ `lead\|contact\|book\|request_quote\|sign_up` |

Preferred shape:

```json
"cta": null
```

or

```json
"cta": { "type": "follow|save|comment|share|lead|contact|book|request_quote|sign_up", "text": "..." }
```

Rules enforced end-to-end:

- Soft CTAs are **not** goal-scoped.
- Business CTAs remain goal-scoped via `CTA_TYPES_BY_GOAL`.
- Never use empty string / `"null"` / `"undefined"` as CTA.
- `cta.text` is required **only when** `cta` object is present.
- `project.goal_type` (e.g. `lead_generation`) is never a valid `cta.type`.

### Package CTA vs `platform_outputs.*.cta`

**Single consistent rule:** platform CTA is **optional** everywhere.

- Schema: `platform_outputs.*.cta` = optional non-empty string (`null`/omit ok; `""` rejected).
- When package `cta` is null → omit/null platform CTA; **caption publishes alone**.
- When package `cta` is present → platform CTA should mirror the text (short paraphrase ok).
- Fan-out / persist: `content_items.cta` is `string | null` via `normalizePlatformCta` + `maybeAppendWebsiteUrl`.
- Publish-ready text already drops empty CTA blocks (no `"null"` / empty CTA section).

---

## 4. Contract surface changes

| Layer | Change |
|-------|--------|
| Prompt | Funnel-stage CTA block + optional platform CTA; organic framing |
| expectedShape | `cta` null vs required; soft/business lists by stage |
| Repair | Optional null CTA; no sentinel platform CTA strings |
| Schema | Optional package CTA (`ctaRequired` for Conversion); optional platform CTA; stage-scoped enum |
| Guardrails | Stage rules (Conversion required business; early stages soft/null) |
| Package brief | Persists `cta: null` or `{ type, text }` as returned |
| Fan-out / persist | `cta: string \| null`; no fake empty CTA |
| `runContentPackage` | Wires `allowedCtaTypesForFunnelStage` + `ctaRequired` |

Shared helpers: `lib/content-pipeline/prompts/contentPackageContract.ts` (`SOFT_CTA_TYPES`, `allowedCtaTypesForFunnelStage`, …).

---

## 5. Test results

`npm run check:content-pipeline-contract` — **43 passed**

Includes:

- Awareness without CTA → pass  
- Problem Aware without CTA → pass  
- Awareness with soft CTA → pass  
- Conversion without CTA → fail  
- Conversion with valid business CTA → pass  
- Conversion with `cta.type: lead_generation` → fail  
- Fan-out without CTA → no `null`/`undefined`/empty CTA in publish text  

Also green: `check:content-pipeline-incident-fix`, `check:website-url`, `check:generation-failed-settlement` (incl. `already_settled_failed`).

---

## 6. Production readiness

| Check | Status |
|-------|--------|
| Live N3 retry OFF / maxTries 1 / onError continue | **Verified on activeVersion** `O27ELb1s9Y2qisOr` |
| App duplicate-settle guard | Kept |
| Caption / variants contract | Intact |
| Voiceover hard cap 80 | Intact |
| Funnel CTA + optional platform CTA | Intact + tested |
| Paid production run | **Not executed** (per request) |

**Ready for one controlled production run** after deploy of the app/worker code that contains this CTA contract.

---

## 7. Operational notes

- Production webhook URL path is unchanged: `/webhook/generate-content-package`.
- Live workflow id changed: **`O27ELb1s9Y2qisOr`** (legacy `NAKo5V3Ctlq5aW4i` unpublished / path renamed).
- N3/N4/N5/error HTTP nodes authenticate with `x-n8n-secret` headers (MCP cannot attach HTTP Request header-auth credentials). Webhook + Supabase still use named credentials. Prefer migrating HTTP nodes back to Header Auth credentials in the n8n UI when convenient (optional hardening; behavior is correct).
