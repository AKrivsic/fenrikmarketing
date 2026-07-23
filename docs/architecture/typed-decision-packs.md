# Typed Decision Packs (Phase 2B)

## Architecture

```text
Product Brain / Strategy / Candidate / DNA / Attention / Assets / Guardrails / Platforms / Schema
        ↓
buildTypedDecisionPacks()   // pure, deterministic, no I/O
        ↓
TypedDecisionPacks
        ↓
Presentation renderers (Phase 3) → prompt string
```

This is **not** Presentation V2. Presentation still emits the same JSON contract; packs are the authoritative intermediate ownership boundary. See also [presentation-simplification.md](./presentation-simplification.md).

## Pack list

| Pack | Owner | Source |
| --- | --- | --- |
| `productGrounding` | Product Brain | project fields |
| `hook` | Winner Candidate (+ archetype fallback) | `hookLine` / directives.hook |
| `opening` | Winner Candidate + DNA world | `openingSituation`, `dna.world` |
| `storyStructure` | **MODE BEATS only** | `directives.mode.narrativeBeats` |
| `emotionalArc` | Winner Candidate | `emotionalReaction` |
| `voice` | Persona + Attention delivery_arc | directives.persona + delivery |
| `visualIdentity` | DNA + Identity treatment | DNA + Creative Identity |
| `characterConsistency` | DNA mainCharacter | DNA |
| `cameraStyle` | Creative Identity camera | Identity |
| `assetPolicy` | Coverage or Funnel fallback | `assetCoveragePolicy` / funnel |
| `cta` | CTA_TYPES_BY_GOAL | goal_type |
| `safety` | Guardrails + Product Brain | constraints |
| `platformAdaptation` | PLATFORM styles | target platforms |
| `jsonSchema` | contentPackageSchema | schema module ref |

Deferred (documented): `scene_order`, `scene_diversity` → Presentation V2 / validators.

## Construction flow

1. Workflow resolves Candidate, DNA, Identity, Attention, Coverage.
2. `buildTypedDecisionPacks(input)` assembles packs once.
3. Narrative Beats prompt receives `modeBeatArc` from `StoryStructurePack`.
4. `buildGenerateContentPackagePrompt({ decisionPacks, ... })` reads packs for ownership-sensitive sections.

## Rendering flow

- `renderStoryStructureFollowLine` — ATTENTION FIRST structure line
- `renderHookOpeningBridge` — OPENING HOOK from HookPack
- `renderNonAuthoritativePacingNote` — demoted Preferred Arc (not an owner)
- `renderAssetPolicyPack` — Coverage or Funnel (never both)
- `renderVoiceDeliveryBlock` — Attention Delivery block

## Fallback rules

- No Candidate → HookPack uses Creative Directive hook archetype (`usedFallback: true`)
- No Coverage / empty quality library → AssetPolicyPack uses Funnel (`usedFallback: true`)
- Missing DNA / Identity → packs mark `usedFallback` and leave optional fields null

## C1 resolution

| Before | After |
| --- | --- |
| 3 active structure owners (MODE BEATS, Preferred Arc, Narrative Required arc) | 1 owner: MODE BEATS via `StoryStructurePack` |
| Preferred Arc injected as CONTENT QUALITY structure | Suppressed; pacing note only |
| Narrative Beats claimed “Required arc: HOOK→…” | Labels mapped onto MODE BEATS; no competing owner |

## Compatibility strategy

- Public APIs / schemas / validators / workers unchanged
- Regenerate path extends the same Presentation input (packs pass through)
- Repair still receives the same Presentation prompt context; does not invent a new story grammar
- Opening Priority Resolver remains a reader/meta-order layer

## Remaining debt

- Scene order / diversity packs deferred
- Voice pack still merges persona + delivery (typed fields distinct; separate packs optional later)
- TTS hint layers still Shared with delivery_arc
- Presentation V2 should stop accepting raw ownership-resolving inputs entirely

## Migration path → Presentation V2

1. Make `decisionPacks` required on Presentation input.
2. Delete residual dual prompt blocks that restate pack values.
3. Add SceneOrder / SceneDiversity packs.
4. Thin Presentation to executor-only.
