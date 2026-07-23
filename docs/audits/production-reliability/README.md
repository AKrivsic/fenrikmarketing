# Production Reliability & Cost-Safety Audit

**Date:** 2026-07-23  
**Scope:** Read-only audit of production execution paths (AI Content Manager).  
**Method:** Static call-graph tracing of workflows, API routes, workers, RPCs, triggers, and DB writes. Tests used as supporting evidence only.  
**Constraint:** No production code, prompts, validators, schemas, migrations, workers, or workflows were modified.

## Verdict (summary)

**Safe with specific restrictions** — not safe for unattended multi-package runs without an operator watching cancel/stuck/cost outcomes.

Operator Stop for production runs is substantially hardened (app guards + DB trigger 023). Package identity and video claim/callback terminal guards work. Residual risk is concentrated in: nested paid retry multiplication, hard package fails after expensive Creative Engine work, mid-flight generation continuing after Stop, missing video heartbeats (stale reclaim), upload-success/callback-fail marking jobs failed, and regeneration/translation paths without run-scoped cancel.

## Deliverables

| File | Purpose |
|------|---------|
| [execution-flow.md](./execution-flow.md) | Real production execution-flow map |
| [state-machines.md](./state-machines.md) | Status-bearing entities and transitions |
| [cost-exposure.md](./cost-exposure.md) | Paid/resource-intensive operation map |
| [guard-review.md](./guard-review.md) | Validators and hard-fail guards |
| [retry-loop-review.md](./retry-loop-review.md) | Retries, loops, worst-case multiplication |
| [concurrency-review.md](./concurrency-review.md) | Races, claims, idempotency, transactions |
| [stuck-state-review.md](./stuck-state-review.md) | Stuck states and recovery |
| [findings.csv](./findings.csv) | Ranked findings |
| [failure-propagation.csv](./failure-propagation.csv) | Failure scope matrix |
| [summary.json](./summary.json) | Machine-readable summary |

## How to use

1. Read this README + `summary.json` for the executive picture.
2. Use `findings.csv` for triage (P0 → P3).
3. Drill into area docs for evidence (file, function, lines, reachability).

## Related prior audits (supporting cost evidence)

- `docs/audits/cost-trace-c8dd3caf/` — real run waste estimates (failed packages dominate waste).
- `docs/audits/prompt-cost-c8dd3caf/` — prompt token cost structure.
- Existing checks: `check:production-run-stop`, `check:production-run-settlement`, `check:translation-jobs`, architecture checks listed in verification section of the final report.
