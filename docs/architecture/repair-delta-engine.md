# Repair Delta Engine (Phase 4)

## Goal

Repair must **stop reconstructing the entire Presentation context**.

Repair is a **patch generator**: validation failures + Typed Decision Packs + prior package → targeted prompt → LLM → merge.

```text
Generated Package
        ↓
Validators
        ↓
RepairDelta
        ↓
Repair Renderer (focused)
        ↓
LLM
        ↓
Patch (full schema document)
        ↓
mergeRepairedPackage
```

This is **not** a second Presentation engine.

## RepairDelta

```ts
type RepairDelta = {
  version: "repair-delta@1";
  validator: RepairValidatorId;
  severity: RepairSeverity;
  affectedScenes: number[];
  affectedPlatforms: string[];
  problem: string;
  requiredChange: string;
  preserve: PreserveRule[];
  failureCodes: string[];
  patchTargets: RepairPatchTarget[];
};
```

Built from existing validator outputs (no validator redesign):

| Builder | Source |
| --- | --- |
| `buildFidelityRepairDelta` | `ConceptFidelityResult` + legacy `fidelityRepairAppendix` wording |
| `buildStoryIntegrityRepairDelta` | `StoryIntegrityResult` + legacy appendix wording |
| `buildProductDemonstrationRepairDelta` | PDI result (available; workflows still hard-fail today) |

## RepairContext

```ts
type RepairContext = {
  decisionPacks;      // immutable authority
  repairDelta;
  generatedPackage;   // prior failed draft
  validationResults;
  winner;
  funnelStageLabel?;
  requireVideo?;
};
```

No full Presentation inputs.

## Patch rendering

`buildRepairDeltaPrompt(ctx)` selects only needed renderers:

- `renderPreserveBlock` — pack-owned decisions
- `renderDeltaHeader` — problem / requiredChange / patchTargets
- `renderSceneRepair` / `renderVoiceRepair` / `renderCTARepair` / `renderAssetRepair` / `renderPlatformRepair`
- `renderPriorPackageBlock` — complete prior JSON (schema continuity)
- `renderRepairTask` — change only patchTargets

Does **not** inject ATTENTION FIRST, PLATFORM STYLES, AVAILABLE ASSETS, VISUAL BEATS essays, etc.

## Merge strategy

`mergeRepairedPackage({ prior, repaired, delta, decisionPacks, winner })`:

1. Start from prior package clone
2. Copy only `patchTargets` from repaired
3. For `visual_scenes` / `image_prompts`, if `affectedScenes` is non-empty, merge those indices only; empty = take repaired visuals wholesale
4. If `preserve` includes `hook`, force pack/winner `hookLine`
5. If `preserve` includes `ctaType`, keep prior `cta.type` (text may update)
6. Keep `funnel_stage` from prior

Workflows still run `enforceCandidateHook` / validators after merge (unchanged).

## Validator integration

Validators keep their logic. Structured metadata is **derived**:

```ts
{
  validator: "story_integrity",
  failureCodes: ["world_abandoned", ...],
  affectedScenes: [], // hinted in problem when known
  requiredChange: "<legacy appendix prose>",
  preserve: [ "hook", "storyStructure", "characterIdentity", ... ]
}
```

## Backward compatibility

| Path | Status |
| --- | --- |
| Production generate/regenerate repair | Uses `buildRepairDeltaPrompt` + merge |
| `fidelityRepairAppendix` / `storyIntegrityRepairAppendix` | Still produce `requiredChange` text (same wording) |
| `repairDeltaToLegacyAppendix` | Temporary adapter |
| `buildLegacyRepairPromptViaPresentation` | Temporary — full Presentation + appendix |
| `runWithRepair` / JSON schema repair | Untouched (orthogonal transport layer) |
| Content package JSON schema | Unchanged |

## Remaining debt / future removal

1. Remove legacy Presentation repair adapter once telemetry proves delta path stable
2. Wire PDI soft/LLM repair via `buildProductDemonstrationRepairDelta` if product wants it
3. Optionally shrink prior-package JSON to field excerpts once models reliably copy untouched fields
4. Emit RepairDelta directly from validators (instead of deriving) when convenient

## Files

- `lib/architecture/repairDelta/*`
- Workflows: `generateContentPackage.ts`, `regenerateContentPackage.ts`
- Docs: this file + `docs/audits/phase-4-repair-delta.md`
- Test: `npm run check:repair-delta`
