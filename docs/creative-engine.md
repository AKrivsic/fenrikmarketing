# Creative Engine

There is exactly one production creative engine: **Creative Engine v3**.

## Pipeline

```
Product Brain
→ Strategy
→ Creative Brief
→ Creative Direction Generation
→ Direction Selection
→ Concept Generation
→ Concept Evaluation
→ Winner
→ Creative DNA
→ Narrative Beats
→ PPD
→ Presentation
→ Story Integrity
→ Product Demonstration Integrity
→ Render
```

## Principles

- The engine **invents** creative directions and concepts from Product Brain + strategy context.
- There are **no** template banks, world banks, Divergence situations, or `FAMILY_BUILDERS`.
- There is **no** feature flag and **no** fallback to a legacy engine.
- Anti-repetition memory rejects recent hooks, fingerprints, atmospheres, and directions — it does not supply creative inspiration banks.
- Downstream stages (Narrative Beats, fidelity, Story Integrity, Product Demo Integrity, Identity, Attention) execute the selected winner; they do not invent a replacement concept.

## Code

| Area | Location |
|------|----------|
| Orchestrator | `lib/creative-engine-v3/planForPackage.ts` |
| Workflows | `lib/ai/workflows/generateContentPackage.ts`, `regenerateContentPackage.ts` |
| Winner contract / DNA / integrity | `lib/creative-candidates/` (shared gates, not a second engine) |

## Checks

```bash
npm run check:creative-engine-v3
npm run check:creative-candidates
```
