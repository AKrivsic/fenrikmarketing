# Product Quality Restoration — Validation Evidence

Date: 2026-07-24  
Scope: code changes only (no deploy / no regenerate)

---

## Baseline (last 45 days, Fenrik.chat completed video jobs with image telemetry)

| Metric | Value (n=16) |
| --- | --- |
| Avg AI images generated | **4.25** |
| Avg assets reused | **0.25** |
| Avg total visuals (AI + asset) | **4.50** |
| Avg render scenes | **4.50** |
| Avg video duration | **26.77 s** |
| Avg scene duration | **6.01 s** |
| Avg video-job cost | **$0.1334** |
| Avg video pipeline time | **316.2 s** |

The audited run `fa619bb8` was an outlier at **3 AI + 1 asset**. Under the restored policy it becomes **4 AI + 1 asset**.

---

## Simulated fix for fa619bb8 plan

Input: 3 AI + 1 high-quality asset, ~23.7s  
After `expandSparseVisualPlan`:

| Field | Before | After |
| --- | --- | --- |
| AI stills | 3 | **4** (+1 narrative AI) |
| Assets | 1 | 1 |
| Total visuals | 4 | **5** |

Beat mapping (5 beats → 4 scenes), old vs new:

| Beat | Old (pin last) | New (even distribute) |
| --- | --- | --- |
| 1 | scene-1 | scene-1 |
| 2 | scene-2 | scene-2 |
| 3 | scene-3 | scene-3 |
| 4 | scene-4 | scene-3 |
| 5 | scene-4 | scene-4 |

Overflow no longer stacks exclusively on the ending still.

---

## Confirmations

| Product rule | Enforcement |
| --- | --- |
| Standard packages generate 4–5 AI | Prompt `4–5 image_prompts` + deterministic `minimumAiVisualCount` = 4 (>14s) |
| Assets optional | Prompt + filtered AVAILABLE ASSETS (no low/decorative) |
| Asset enhances, does not force 3 AI | Density expands 3 AI + asset → 4 AI + asset within still cap |
| Hands/prop openings skip Story Repair | `shouldInvokeStoryIntegrityRepair` + SI validator |
| Board writing survives sanitizer | Controlled glyph rewrite; quotes stripped |
| Balanced pacing | `sceneIdForStoryboardBeat` even distribution |
| Failed provider costs | Failed video jobs persist `generation_telemetry` |
| JSON repair diagnostics | `validation_issues` + `repair_reason` on JSON Repair steps |

---

## Checks run

- `check:image-prompt-sanitizer` — 7/7
- `check:story-integrity` — 16/16
- `check:production-runtime` — 26/26
- `check:scene-still-cap` — 11/11
- `check:series-diversity` — 16/16
- `check:semantic-motion` — 34/34

---

## Expected post-deploy averages (directional)

| Metric | Expected direction |
| --- | --- |
| Avg AI generated | Rise toward **4.5–5.0** (fewer 3-AI packages) |
| Avg assets | Stable / slightly lower (low-quality filtered) |
| Avg total visuals | Rise toward **4.5–5.0** |
| Avg cost / time | Story Integrity skip saves ~$0.23 / ~6 min when hands/prop FP would have fired; +1 AI still ≈ +$0.042 when density expands |

Full production averages require a post-deploy sample run (not executed here).
