# Phase 1 Prompt Cleanup — Implementation Report

Generated 2026-07-23. **Code changes shipped** — not an audit-only document.

## Executive verdict

Conservative Presentation prompt cleanup is complete. Estimated Presentation prompt size on a full-capability fixture fell from **~9,937 → ~8,374 tokens** (`Math.ceil(chars/4)`), about **15.7%** ESTIMATED reduction, without changing schemas, models, validators, repair behavior, or media pipelines.

## Before metrics (ESTIMATED)

| Metric | Value |
| --- | ---: |
| Presentation prompt tokens (full fixture) | 9,937 |
| Attention Mechanism block tokens | 718 |
| Duplicated instruction families targeted | 6 |
| Hardcoded vertical defaults in cleaned prompt modules | 1 (office-cliché line inside Attention Mechanism) |

Method: `Math.ceil(chars / 4)` — same comparative method as the prompt-cost audit. Before Attention size measured from git HEAD pre-cleanup (`2870` chars). Before full prompt reconstructed as after + removed block delta.

## After metrics (ESTIMATED)

| Metric | Value |
| --- | ---: |
| Presentation prompt tokens (full fixture) | 8,374 |
| Attention Delivery block tokens | 93 |
| Duplicated instruction families targeted | 0 remaining in Presentation injection |
| Hardcoded vertical defaults in cleaned prompt modules | 0 |

**Percentage reduction (fixture):** ~15.7% ESTIMATED.

**Run-level cost effect (ESTIMATED):** On run `c8dd3caf`, Presentation was 234,889 input tokens of the completed-package AI spend (~$3.70 exact telemetry). ~15% of that Presentation slice ≈ **$0.25–$0.40** ESTIMATED savings on completed packages. Repair still full-replays Presentation until Repair V2, so repair calls inherit the same per-prompt savings but are not separately redesigned.

**Latency effect (ESTIMATED):** Modest — shorter input, same model/provider. Expect slightly lower input processing / TTFT, not a step-change.

## Exact removed / changed instruction families

| Family | Action | Retained owner |
| --- | --- | --- |
| Attention Mechanism prose | **Thinned** → `ATTENTION DELIVERY` | Attention Delivery (`delivery_arc` + optional SFX). Originality/opening still persist on the plan for TTS/video jobs. |
| Hook V2 | **Removed** | Winner Candidate `hookLine` + Creative Directive HOOK ARCHETYPE + compact `OPENING HOOK` bridge |
| Funnel Asset Policy echo | **Skipped when Coverage present** | `PACKAGE ASSET COVERAGE`; Funnel remains fallback |
| Visual Style guardrail injection | **Removed from Presentation** | Ideation vetoes/validators; `VERTICAL SCENE COMPOSITION` + `DEVICE & SCREEN REALISM` retained. Module `visualStyleGuardrailBlock()` kept for tests/reuse. |
| Scene Type Memory prose | **No longer injected** | `applySceneTypeHistoryGuardrail` (deterministic). Builder `buildSceneTypeHistoryRestraintBlock` retained. |
| Repeated no-readable-text in PRODUCT DEMONSTRATION | **Removed duplicate line** | Single `PURELY VISUAL` / no-readable-text invariant in VISUAL BEATS |

## Retained / left unchanged due to risk

| Block | Why unchanged |
| --- | --- |
| Opening Priority Resolver | Meta-debt; no single owner migration yet — needs Decision Ownership packs |
| Preferred Story Arc | C1 conflict with MODE BEATS / Narrative Beats — no clear single owner + mode regression tests |
| Narrative Beats | Same C1 risk |
| MODE BEATS | Primary story-structure signal today — keep |
| ATTENTION FIRST | Intent layer; Critic remains intentional counterweight (C2) |
| Anti-repetition memory | Single authoritative Presentation block — not duplicated inside Presentation |
| CREATIVE SAFETY / schema / validators | Non-negotiable |

## Ownership after cleanup

| Concern | Single owner (Phase 1) |
| --- | --- |
| Hook | Winner Candidate `hookLine` (fallback: Creative Directive HOOK ARCHETYPE + `OPENING HOOK`) |
| Story structure | MODE BEATS (C1 still open vs Preferred Arc / Narrative Beats) |
| Voice emotion | Attention Delivery `delivery_arc` (+ Voice Persona) |
| Visual identity | Creative DNA + Creative Identity + composition/device blocks |
| Asset policy | PACKAGE ASSET COVERAGE when present; Funnel Asset Policy otherwise |
| Safety | CREATIVE SAFETY + HARD CONSTRAINTS + no-fake-UI invariant |
| Schema | Presentation JSON shape (`generateContentPackage` / presentationGeneration) |
| Validation | Deterministic validators/guardrails (**thresholds unchanged**) |

Concise `// Owner:` comments added on retained major blocks in `generateContentPackage.ts` and `promptBlocks.ts`.

## Capability preservation evidence

`npm run check:phase-1-prompt-cleanup` asserts:

- Product Brain present
- Candidate `hookLine` transmitted
- Creative DNA transmitted
- Voice persona + EMOTIONAL PERFORMANCE / delivery phases present
- Character/visual consistency instructions present
- Asset policy from one authoritative source when coverage present
- Safety / authenticity / no-fake-UI present
- Output JSON shape contract present
- MODE BEATS + ATTENTION FIRST + CREATIVE DIRECTIVE present

Also green: `check:attention-engagement`, `check:attention-first`, `check:content-quality-sprint2`, `check:visual-style`, `check:visual-narrative`, `check:asset-prompt-backward-compat`, `check:funnel-asset-policy`, `check:scene-type-history`.

## Universality evidence

Five fixtures (software, local physical service, hospitality/food, professional service, physical consumer product) all build through the same Presentation prompt without injecting unrelated vertical defaults. Static regex guard on cleaned prompt modules rejects new hardcoded vertical defaults (targets templates/constants, not Product Brain runtime data).

### Existing hardcoded vertical assumptions found but not changed

- `lib/assets/assetCoveragePolicy.ts` — Tier 1 roles include `dashboard` (product-role enum / coverage guidance; validator-adjacent technical term).
- `lib/attention/cliches.ts` — office/desk/laptop cliché matchers for originality planner (code veto, not Presentation template default).
- Ideation / catalog examples elsewhere outside this Phase 1 patch surface.

## Unresolved conflicts (still open)

- **C1** — MODE BEATS vs Preferred Arc vs Narrative Beats
- **C2** — Attention First vs Critic (intentional; documented)
- **C3–C8** — unchanged (out of Phase 1 scope)

## Risks

1. Thinner Attention Delivery may weaken opening originality pressure that previously lived only in prompt prose (planner originality still runs; Candidate/DNA still own opening).
2. Removing Hook V2 relies on Candidate + `enforceCandidateHook` + OPENING HOOK bridge for legacy paths without a winner.
3. Skipping Funnel when Coverage exists assumes Coverage stance is always complete — Funnel fallback remains when Coverage is absent.
4. Visual Style prose removal assumes vetoes/validators catch dark-cinematic defaults.
5. C1 triple-arc conflict remains and can still confuse the model.

## Rollback

```bash
git checkout HEAD -- \
  lib/ai/prompts/generateContentPackage.ts \
  lib/ai/prompts/funnelAssetPolicy.ts \
  lib/ai/workflows/generateContentPackage.ts \
  lib/ai/workflows/regenerateContentPackage.ts \
  lib/attention/promptBlocks.ts \
  lib/attention/index.ts \
  lib/experiment/contentPackagePromptVariants.ts \
  scripts/check-*.ts \
  scripts/ablate-content-package-prompt-blocks.ts \
  package.json
# optionally remove:
# scripts/check-phase-1-prompt-cleanup.ts
# docs/audits/phase-1-prompt-cleanup.md
# docs/audits/phase-1-prompt-cleanup/
```

Or revert the Phase 1 commit once committed.

## Recommendation

**Ready for the next step: Decision Ownership + Typed Decision Packs.**

Do **not** start Presentation V2, Repair V2, or Ideation redesign in the same change set. Resolve C1 (one story-structure owner) inside Decision Ownership before deleting Preferred Arc / Narrative Beats / Opening Priority Resolver.

## Artifacts

- `docs/audits/phase-1-prompt-cleanup/before-after-sections.csv`
- `docs/audits/phase-1-prompt-cleanup/removed-instructions.csv`
- `docs/audits/phase-1-prompt-cleanup/ownership-map.csv`
- `docs/audits/phase-1-prompt-cleanup/universality-check.csv`
- `docs/audits/phase-1-prompt-cleanup/summary.json`
