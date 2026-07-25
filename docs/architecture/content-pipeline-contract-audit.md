# Content Pipeline Contract Audit

**Date:** 2026-07-25  
**Related:** `docs/architecture/content-pipeline-run-b343-forensics.md`  
**Scope:** Implement confirmed b343 caption/variants fix; audit full Content Package + upstream pipeline contracts. **No silent fixes** for newly found CRITICAL issues.

---

## 1. Potvrzený fix (implemented)

| Area | Change |
|------|--------|
| Prompt (`contentPackage.ts`) | Shared `PLATFORM_OUTPUTS FIELD TYPES` block; VARIANT COUNTS require `caption = caption_variants[0]`; LinkedIn = caption + caption_variants; X = caption + caption_variants + title_variants |
| expectedShape (`contentPackageVisualScenes.ts`) | Same contract + repair rule: missing caption → set from `caption_variants[0]`; skeleton includes variants |
| Repair (`jsonRepair.ts`) | System + prompt instruct `caption = caption_variants[0]`; LinkedIn/X field sets |
| Schema / validator | **Unchanged** (caption remains required) |

**Regression:** `scripts/fixtures/b343-content-package-candidate.*.json` + `npm run check:content-pipeline-contract`

**Result:** Raw b343 candidate fails only on linkedin/x caption; after `caption = caption_variants[0]` schema **passes**.

---

## 2. Všechny nalezené nekonzistence

### CRITICAL (blockers — not implemented)

| ID | Issue | Evidence |
|----|-------|----------|
| **C1** | Prompt/schema allow any `cta.type` string; **guardrails** require goal-scoped enums. b343 used `"lead_generation"` but project `goal_type=lead_generation` only allows `lead, contact, book, request_quote, sign_up`. | Fixed fixture + `checkContentPackageGuardrails` → `$.cta.type` fail. Prompt never lists allowed types. |
| **C2** | Prompt does **not** state voiceover hard cap; guardrails enforce **80 words** (target 40–70). b343 voiceover ≈ **179 words**. | Same guardrail run → `$.voiceover_text` fail. After caption-only fix, **same candidate still cannot settle**. |
| **C3** | Live n8n **activeVersion** N3 still `retryOnFail: true` / `maxTries: 3` while repo/draft intend `false`. Paid duplicate blocked by app guard, but unpaid retry + wall time remain. | Forensics b343 + `get_workflow_details` activeVersion. |

### HIGH

| ID | Issue |
|----|-------|
| **H1** | `visual_scenes`: prompt says required 3–5 for video; **schema** keeps `visual_scenes` optional. Runtime falls back to `image_prompts` / worker path. Risk of empty scenes if model omits them and only thin image_prompts pass. |
| **H2** | `image_prompts`: schema optional; guardrails require 1–`MAX_VIDEO_SCENE_STILLS` when `requireVideo`. Prompt lists field but not the hard count vs guardrail. |
| **H3** | Failure snapshot uses raw `JSON.parse` → fenced `lastRaw` yields `parsed_ok: false`, null `visual_scenes` / `platform_outputs_types` even when candidate text is complete (`safeJsonParse` would work). |

### MEDIUM

| ID | Issue |
|----|-------|
| **M1** | Validator message `expected string` for **absent** required fields (not “missing required”) — weakens repair without expectedShape rules. |
| **M2** | `cta.type` enum lives only in guardrails (`CTA_TYPES_BY_GOAL`), not in schema or Content Package prompt/expectedShape. |
| **M3** | Voiceover word budget lives only in guardrails / video-engine comments, not Content Package prompt HARD RULES. |
| **M4** | X caption char cap (280) and YouTube Shorts caption word cap enforced in guardrails; prompt platform styles mention length loosely, not as hard fail conditions. |
| **M5** | `REQUIRED_PACKAGE_PLATFORMS` includes `google_business`; production runs often omit it — OK when `targetPlatforms` drives schema, confusing if someone validates against full REQUIRED set. |

### LOW

| ID | Issue |
|----|-------|
| **L1** | Funnel accepts label or snake_case; prompt asks for label — covered, low risk. |
| **L2** | Concept / Opening prompt keys match schemas (audited; no mismatch found). |
| **L3** | `asset_usage.modify` optional string; STATIC modify checks in guardrails — intentional. |
| **L4** | Fan-out correctly falls back to base `caption` / package `title` when variant slots missing — aligned with schema requiring caption. |

---

## 3. Rozdělení podle závažnosti

| Severity | Count | Action |
|----------|-------|--------|
| CRITICAL | 3 | **Blockers** — document only; do not ship another paid run until addressed (or explicitly accepted) |
| HIGH | 3 | Fix next; not silent in this change set |
| MEDIUM | 5 | Plan into prompt/expectedShape parity |
| LOW | 4 | Monitor |

---

## 4. Field parity table

| Field | Prompt | ExpectedShape | Schema | Runtime / persist / fan-out | Validator / guardrails | Status |
|-------|--------|---------------|--------|----------------------------|------------------------|--------|
| `title` | required string | string | required string | `content_packages.title`; X fan-out may use `title_variants[i]` | schema | OK |
| `funnel_stage` | label (e.g. Problem Aware) | string | `vFunnelStage` (label or snake) | normalized to DB snake | schema + guardrail match strategy | OK |
| `hook` | = opening first sentence | string | required | package_brief; runtime may overwrite from Opening | schema | OK |
| `voiceover_text` | required; starts with hook | string | required | body + TTS | schema OK; **guardrail ≤80 words** | **CRITICAL C2** |
| `subtitles` | required | string | required | brief / video input | schema | OK |
| `cta.type` | string | string | non-empty string | brief | **guardrail enum by goal** | **CRITICAL C1** |
| `cta.text` | string | string | required | brief / video cta text | schema | OK |
| `video.concept` | required if video | string | required if requireVideo | video job input | schema | OK |
| `video.script` | required if video | string | required if requireVideo | video job | schema | OK |
| `video.duration_seconds` | **string** e.g. `"24"` | string | optional **string** | brief | schema rejects number | OK (aligned) |
| `platform_outputs.*.caption` | **REQUIRED**; if variants → `= variants[0]` | same | **required** string | content_items.caption; fan-out prefers variants[i] | schema + guardrail “caption required” | **FIXED** (b343) |
| `caption_variants` | when VARIANT COUNTS; never replace caption | optional arrays in skeleton | optional string[] | fan-out index | schema | **FIXED** wording |
| `title_variants` | X when VARIANT COUNTS | optional | optional string[] | fan-out titles | schema | **FIXED** wording |
| `cta` (platform) | required string | string | required | items.cta (+ URL append) | schema | OK |
| `hashtags` (platform) | string[] | string[] | optional | items | schema | OK |
| `format` | string | string | optional | coerceFormat | schema | OK |
| `hashtags` (package) | optional | optional | optional | brief fallback | schema | OK |
| `image_prompts` | listed | listed | optional | video stills | **guardrail 1–N if video** | HIGH H2 |
| `visual_scenes` | required 3–5 video | legacy shapes | **optional** array | brief → worker compile | scene validator if present | HIGH H1 |
| `asset_usage[]` | optional `{asset_id,used_as}` | same | optional | brief; coverage guardrails | schema + asset guards | OK |
| `scenario` | optional | optional | optional | brief / anti-rep | schema | OK |

**Upstream**

| Stage | Prompt ↔ schema | Status |
|-------|-----------------|--------|
| Video Concept | keys match `videoConceptSchema` | OK |
| Opening Impact | keys match `openingImpactSchema` | OK |
| Visual Identity | deterministic from concept+opening | OK |

---

## 5. Regression testy

| Test | Command / artifact |
|------|--------------------|
| b343 raw fails only linkedin+x caption | `scripts/fixtures/b343-content-package-candidate.raw.json` |
| half-fix still fails x | contract check |
| caption=variants[0] → schema pass | contract check |
| schema OK + guardrails still fail (C1/C2 documented) | contract check |
| model-like validate + brief + fan-out | `content-package-model-like-complete.json` |
| incident-fix caption wording | `check:content-pipeline-incident-fix` |

```bash
npm run check:content-pipeline-contract
npm run check:content-pipeline-incident-fix
```

---

## 6. Parity test

**Implemented** in `scripts/check-content-pipeline-contract.ts` (no AI):

1. Prompt skeleton contains every required top-level schema key + `duration_seconds` string + variants contract.  
2. expectedShape contains same keys + caption repair rule.  
3. Shared `buildContentPackagePlatformOutputsContractBlock()` embedded in prompt and expectedShape.  
4. Schema rejects wrong types (number duration, object caption).  
5. Repair system/prompt mention `caption_variants[0]`.  
6. Upstream concept/opening key parity.  
7. Persist shape (`buildPackageBrief`) + fan-out indices for variants.

**Recommended release gate:** run `check:content-pipeline-contract` in CI before production deploys of content-package-worker.

---

## 7. Je bezpečný další placený production run?

### Verdict: **NOT READY — CONTRACT STILL INCONSISTENT**

Caption/variants (b343 schema fail) is fixed in prompt/expectedShape/repair.

**Remaining CRITICAL blockers for another paid one-package test:**

1. **C1 — `cta.type`:** prompt/schema vs guardrail enum mismatch; real b343 output would fail next.  
2. **C2 — voiceover length:** prompt silent; guardrail hard-fails >80 words; real b343 output would fail next.  
3. **C3 — live n8n N3 retry** still on in active version (cost/time hygiene).

Also complete before paid run:

- Publish n8n with N3 `retryOnFail: false`  
- Redeploy content-package-worker with this commit  
- Prefer fixing C1/C2 in prompt + expectedShape (+ optional schema enum for cta.type) and a shortened model-like fixture that **passes guardrails**, not only schema  
- Local preflight: fixed candidate → schema → **guardrails** → fan-out (extend contract check once C1/C2 fixed)

**Do not** recommend READY solely because TypeScript/schema tests pass.

---

## Appendix — files touched this change

- `lib/content-pipeline/prompts/contentPackage.ts`  
- `lib/content-pipeline/prompts/contentPackageVisualScenes.ts`  
- `lib/ai/prompts/jsonRepair.ts`  
- `scripts/check-content-pipeline-contract.ts` (new)  
- `scripts/check-content-pipeline-incident-fix.ts`  
- `scripts/fixtures/b343-content-package-candidate.raw.json`  
- `scripts/fixtures/b343-content-package-candidate.fixed.json`  
- `scripts/fixtures/content-package-model-like-complete.json`  
- `package.json` → `check:content-pipeline-contract`
