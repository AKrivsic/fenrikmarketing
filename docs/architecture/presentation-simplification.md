# Presentation Simplification (Phase 3)

## Goal

Transform Presentation from **decision maker + decision assembler + renderer** into a **renderer only** over Typed Decision Packs.

This is an architectural simplification. It is **not** a Presentation rewrite, prompt redesign, or creative-behavior change.

## Architecture

### Before (Phase 2B)

```text
Workflow → (optional packs) → Presentation
                              ├─ pickCreativeDirectives / buildTypedDecisionPacks (compat)
                              ├─ dual fallbacks (pack ?? raw Candidate/DNA/Attention)
                              └─ monolithic prompt assembly
```

### After (Phase 3)

```text
Product Brain / Strategy / Candidate / DNA / Attention / Assets / Guardrails
        ↓
buildTypedDecisionPacks()          // ownership (workflow)
        ↓
Typed Decision Packs + Fragments   // pre-rendered upstream blocks
        ↓
buildPresentationPrompt()          // orchestrator
        ↓
render* sections                   // text only
        ↓
Prompt string (Repair-compatible)
```

## Responsibilities

| Layer | Owns |
| --- | --- |
| **Typed Decision Packs** | Hook, story structure (MODE BEATS), voice delivery, visual identity/DNA, asset policy, CTA types, safety facts, platform targets, schema refs |
| **Presentation orchestrator** | Order of sections; calls renderers; no ownership questions |
| **Renderers** | Turn packs + fragments into prompt text (same wording as before) |
| **ensureDecisionPacks** | **TEMPORARY COMPAT** — rebuild packs for tests / legacy callers that omit `decisionPacks` |

## Target Presentation input

```ts
PresentationRenderInput {
  decisionPacks,   // required for ownership-sensitive sections
  fragments,       // creativeDirective + candidate/narrative/visual upstream blocks
  project,         // temporary: Product Brain extensions (pain/proof/scenario/website)
  platform runtime fields (funnel, topic, angle, assets, platforms, schema types, …)
}
```

Public API `buildGenerateContentPackagePrompt(GenerateContentPackagePromptInput)` remains for Repair and existing callers. Internally it maps to `PresentationRenderInput` via `toPresentationRenderInput`.

## Remaining compatibility

| Item | Why it remains |
| --- | --- |
| `ensureDecisionPacks` | Tests / legacy callers without packs |
| `project` + `projectBrainBlock` | Pain/proof/scenario/website knowledge cards not fully packed; ProductGroundingPack covers typed grounding fields |
| Upstream fragments (Candidate, Narrative, Visual Narrative/Medium/Reveal/Profile, series) | Pre-rendered by workflows; not ownership re-resolution |
| `directives` → CREATIVE DIRECTIVE block formatting | Pack owns MODE BEATS structure; full directive prose still formatted as a fragment |
| Opening Priority Resolver prose | Meta-order reader retained; still not an owner |
| Repair | Still consumes the same rendered prompt string (Phase 4 will migrate Repair) |

## Dead / removed from Presentation

- Inline `buildTypedDecisionPacks` / `pickCreativeDirectives` in the public prompt module
- Dual fallbacks `pack.field ?? input.rawBlock` for DNA / Identity / Attention when packs exist
- Workflow re-passing of `selectedCandidateForPacks` / `*ForPacks` into Presentation after packs are built
- Monolithic section assembly inside `generateContentPackage.ts` (moved to renderers)

## Future — Phase 4 (complete)

**Repair Simplification (delta-only Repair):** See [repair-delta-engine.md](./repair-delta-engine.md). Repair consumes Typed Decision Packs + RepairDelta + prior package instead of re-playing Presentation.

## Files

- `lib/architecture/presentation/` — types, ensureDecisionPacks, renderers, orchestrator
- `lib/ai/prompts/generateContentPackage.ts` — thin public API
- `lib/ai/prompts/platformStyles.ts` / `sampleModePrompt.ts` — extracted shared helpers
- `docs/architecture/presentation-simplification.md` — this doc
- `npm run check:presentation-simplification`
