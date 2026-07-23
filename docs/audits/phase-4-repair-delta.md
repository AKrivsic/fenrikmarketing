# Phase 4 Audit — Repair Delta Engine

## Summary

Repair no longer replays the full Presentation prompt. Generate and regenerate workflows build a `RepairDelta`, render a focused repair prompt (packs + prior package + required change), then `mergeRepairedPackage` applies only `patchTargets`.

Creative appendix wording (`fidelityRepairAppendix`, `storyIntegrityRepairAppendix`) is preserved inside `requiredChange` so repair instructions stay equivalent.

## Files changed

| File | Change |
| --- | --- |
| `lib/architecture/repairDelta/types.ts` | RepairDelta, RepairContext, PreserveRule, patch targets |
| `lib/architecture/repairDelta/buildRepairDelta.ts` | Fidelity / story / PDI delta builders |
| `lib/architecture/repairDelta/renderers.ts` | Focused repair renderers |
| `lib/architecture/repairDelta/buildRepairPrompt.ts` | Orchestrator |
| `lib/architecture/repairDelta/mergeRepairPatch.ts` | Safe merge |
| `lib/architecture/repairDelta/legacyAdapter.ts` | Temporary Presentation adapter |
| `lib/architecture/repairDelta/index.ts` | Public exports |
| `lib/ai/workflows/generateContentPackage.ts` | Delta repair + merge (fidelity + story) |
| `lib/ai/workflows/regenerateContentPackage.ts` | Same |
| `scripts/check-repair-delta.ts` | Phase 4 checks |
| `scripts/check-creative-candidates.ts` | Expect delta wiring |
| `docs/architecture/repair-delta-engine.md` | Architecture |
| `docs/audits/phase-4-repair-delta.md` | This audit |
| `package.json` | `check:repair-delta` |

## Architectural changes

**Before:** Validator fail → full Presentation prompt + appendix → LLM full regenerate → replace package.

**After:** Validator fail → RepairDelta → slim repair prompt → LLM full-schema document → merge patchTargets onto prior.

## Removed duplication

- Four full Presentation repair call sites (2 generate + 2 regenerate)
- Repair path no longer re-assembles ATTENTION FIRST / PLATFORM STYLES / ASSETS / VISUAL BEATS
- Ownership re-resolution not repeated in Repair (packs read-only)

## Remaining technical debt

- Legacy Presentation adapter still exists for rollback/tests
- Prior package is still embedded as full JSON (smaller than Presentation, but can shrink further)
- PDI LLM repair still unwired (hard-fail only) — delta builder ready
- JSON transport repair (`runWithRepair`) unchanged by design

## Rollback

1. Revert Phase 4 workflow call sites to `buildPackagePrompt(fidelityRepairAppendix(...))` / story equivalent
2. Or call `buildLegacyRepairPromptViaPresentation` temporarily
3. Packs / Presentation / validators unchanged — safe to roll back Repair only

## Metrics (ESTIMATED — see check:repair-delta output)

Reported live by `npm run check:repair-delta` (Math.ceil(chars/4)):

- Fidelity repair prompt vs Presentation: expect material reduction (often ~40–70% depending on prior package size)
- Repair renderers: 9
- Full Presentation replays removed from repair path: 4
- Validators producing structured deltas: 3 (fidelity, story, PDI)
- Remaining legacy repair paths: adapter + JSON schema repair
