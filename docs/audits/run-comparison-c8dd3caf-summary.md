# AI Content Manager — Run Comparison Audit

Read-only comparison of creative-engine@3 (Jul 22) vs pre-pipeline baseline (Jun 28). Same project, 14 requested packages each.

- New: 8/14 delivered
- Ref: 14/14 delivered
- Quality +0.89 (completed only)
- Fail waste ~$5.08 est.

## Verdict

New winners look visibly more specific — but the run is not a product win. Completion fell 100%→57%. Prefer simplifying hard validators to repair/advisory while keeping ideation + presentation.

## Key stats

| Metric | Value |
|---|---|
| New success rate | 57% |
| Ref success rate | 100% |
| $ / delivered (known) | $0.76 |
| $ / delivered (+waste est.) | $1.39 |

## Runs

### New run

`c8dd3caf-c407-418c-be49-d4cf0a3b7bf9`

2026-07-22 · wall 271 min · AI text $3.70 · media est. $2.36

Avg AI 7.5 min + video ~5.3 min per completed package. Voices: shimmer / cedar. 8 completed / 6 failed.

### Reference run

`f6c0c74d-1548-44fe-a920-b96b21d3db58`

2026-06-28 · wall 465 min · AI cost unknown · media est. $4.21

No package telemetry / creative-engine metadata. Closest full 14/14 before July quality wave.

## Head-to-head

| Metric | New run | Reference |
|---|---:|---:|
| Completion % | 57 | 100 |
| Quality score | 3.83 | 2.94 |
| Wall min / delivered | 33.9 | 33.2 |
| Media $ / delivered | 0.295 | 0.301 |

Source: Supabase production_runs + telemetry dump · quality from visual rubric (inverted generic/repetition). AI $ for ref unavailable.

## AI cost by step (new completed packages only)

| Step | USD |
|---|---:|
| Ideation | 1.639 |
| Presentation | 1.104 |
| Direction eval | 0.302 |
| Direction gen | 0.292 |
| Critic | 0.229 |
| Integrity repair | 0.133 |

Ideation ≈ 44% of persisted AI $. Hard validators themselves cost $0 but discarded full packages.

## Failed packages (new)

| Idx | Reason | Attempts | Est. waste |
|---:|---|---:|---:|
| 3 | story_integrity primary actor | 1 | ~$0.46 |
| 4 | all_concepts_vetoed_after_re_ideation | 4 | ~$1.85 |
| 5 | storyboard_collapsed_to_generic_office | 1 | ~$0.46 |
| 9 | story_integrity actor drift (middle) | 1 | ~$0.46 |
| 12 | ideation_failed missing concepts d7 | 3 | ~$1.39 |
| 13 | concept_fidelity multi-fail | 1 | ~$0.46 |

Intermediate outputs not persisted — discarded attempts cannot be content-compared. Waste estimated from avg completed AI × attempts.

## What improved vs what did not

### Visible gains (completed)

- Stronger conceptual metaphors (reception window, blank field)
- Higher visual specificity / less bright stock office
- Better subject continuity within a package (pkg0 hand/glass)
- Ideation + presentation generation drive most of the delta

### Product regressions

- 43% packages never delivered
- Hard fidelity/integrity fails burn almost-full AI budget
- Veto loops (4 attempts) with no best-effort fallback
- Client likely notices missing volume more than visual polish

## Recommendation

Simplify — keep direction/ideation/presentation; convert `concept_fidelity`, `story_integrity`, `generic_office`, and veto terminals to repair or advisory. Do not full-rollback to June pipeline.

Full report: [`docs/audits/run-comparison-c8dd3caf.md`](./run-comparison-c8dd3caf.md)

- Report + JSON: `docs/audits/run-comparison-c8dd3caf/`
- All media (videos, stills, screenshots, contact sheets): `exports/run-comparison-c8dd3caf/`
