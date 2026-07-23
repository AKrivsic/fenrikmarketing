# Phase 2B — Typed Decision Packs + C1 Resolution

## Files changed

See final response table. Core: `lib/architecture/typedDecisionPacks/*`, Presentation + workflow wiring, Narrative Beats C1 prompt alignment, ownership registry update, tests/docs.

## Behavior changed

- Presentation reads ownership-sensitive decisions from `TypedDecisionPacks`.
- Preferred Story Arc no longer injected as a structure owner.
- Narrative Beats no longer claims a competing Required arc.
- Registry marks `story_structure` conflict as `none` (C1 resolved).

## Behavior intentionally unchanged

- Output JSON schema, validators/thresholds, repair loop, media pipelines, models, APIs, DB.
- Product Brain / Candidate / DNA / Attention delivery / enforceCandidateHook.
- Opening Priority Resolver (reader/meta-order).
- Preferred-mode picker still uses `PREFERRED_STORY_ARC` constant for mode selection (not Presentation structure).

## C1 before / after

| Before | After |
| --- | --- |
| 3 active structure owners | 1 — MODE BEATS via StoryStructurePack |
| Preferred Arc in CONTENT QUALITY | Pacing note only |
| Narrative “Required arc” | Labels on MODE BEATS |

## Prompt-size comparison (ESTIMATED)

Fixture Presentation ~8098 tokens after Phase 2B (`Math.ceil(chars/4)`). Slightly lower than Phase 1 fixture (~8374) due to Preferred Arc suppression + Narrative Beats rewording — **not** a token-optimization goal.

## Risks

1. Preferred Arc removal may slightly change pacing flavor for some modes.
2. Narrative Beats label wording change may alter how the model maps HOOK/SETUP roles.
3. Packs built inside Presentation when workflow omits them (compat) may miss Candidate fields if callers do not pass `selectedCandidateForPacks`.

## Rollback

```bash
git checkout HEAD -- \
  lib/architecture/typedDecisionPacks \
  lib/architecture/decisionOwnership.ts \
  lib/architecture/index.ts \
  lib/ai/prompts/generateContentPackage.ts \
  lib/ai/workflows/generateContentPackage.ts \
  lib/ai/workflows/regenerateContentPackage.ts \
  lib/narrative-beats/promptBlocks.ts \
  scripts/check-typed-decision-packs.ts \
  scripts/check-decision-ownership.ts \
  scripts/check-content-quality-sprint2.ts \
  scripts/check-narrative-beats.ts \
  docs/architecture \
  docs/audits/phase-2b-typed-decision-packs.md \
  docs/audits/phase-2b-typed-decision-packs \
  package.json
```
