# Prompt Debt Audit — Instruction ROI & Historical Accretion

Generated 2026-07-22T22:07:54.972Z. **Debt audit only** — no production prompts were rewritten or optimized.

## Executive verdict

**Highest prompt debt: Presentation Generation** (debt score 88/100; ~29,361 avg input tokens; 234,889 input tokens across 8 completed packages on run `c8dd3caf`).

**Estimated unnecessary prompt text today:** 8–15% removable with near-zero quality risk; **25–35%** after moving overlaps to validators/planners; **50–65%** only via first-principles Presentation rewrite (high risk until validator migration is proven).

Inventory: **56** instruction families — Critical 25, Important 14, Useful 4, Legacy 3, Redundant 3, Conflicting 7.

## Answers (required)

1. **If built today from scratch, which instructions would you never add?** Opening Priority Resolver (meta-debt), Hook V2 beside Candidate+enforceCandidateHook, ATTENTION MECHANISM restating Attention First, Preferred Story Arc beside MODE BEATS, Funnel Asset Policy beside Coverage, Visual Style dark-office bans already in vetoes, Scene Type Memory prose beside the soft guardrail, and full-prompt repair replay.

2. **Which only exist because of historical evolution?** Hook V2, Content Quality Preferred Arc, Attention Mechanism, Opening Priority Resolver, Story Integrity repair’s legacy PRODUCT_DEMO wording (C6), and repeated no-fake-UI / anti-repetition restatements added after each visual failure.

3. **Which belong in code instead of prompts?** Schema conformance, no-fake-UI/blank-screen detection, asset eligibility + coverage stance, presentation frequency, quote/statistic invent bans, VO hard cap, platform caption caps, genericness/dark-office vetoes, repair field closure, DNA neutralize transforms.

4. **Which prompts should be completely rewritten?** Presentation Generation first; Story Integrity / Fidelity Repair second (delta-only). Ideation hard-requirements should be thinned, not fully rewritten.

5. **Highest prompt debt workflow?** Presentation (88). Repair (86) is a symptom because it resends Presentation.

6. **% unnecessary today?** ~8–15% conservative; ~25–35% with ownership cleanup; ~50–65% aggressive rewrite.

7. **Lead-engineer redesign?** Versioned typed packs (Product Brain, Strategy, Winner Candidate/DNA, Safety decisions, Schema). One owner per concern. Deterministic planners emit decisions, not essays. Validators own invariants. Presentation becomes a thin executor. Repair becomes structured delta. Gate changes with quality evals.

## Methodology

Instruction families were curated from production builders (`context.ts`, strategy prompts, creative-engine-v3, `generateContentPackage.ts`, presentation/attention/visual/DNA/candidate blocks, repair appendices) and cross-mapped to validators/guardrails/vetoes. Token estimates are comparative family sizes, not silent provider invoices. Cost projections use ESTIMATED $3/MTok input.

Measured telemetry baseline (exact): run `c8dd3caf` — 372,236 input tokens / $3.700624 AI cost on completed packages; Presentation 234,889 input tokens.

## What counts as prompt debt

1. Duplicate ownership with validators/planners. 2. Historical patch layering. 3. Cross-stage restatement without a stage-specific decision. 4. Repair replay of the full Presentation prompt. 5. Conflicting authorities (C1–C8).

## Conflict analysis

- **C1 (high)** — pkg-creative-directive (MODE BEATS) vs pkg-content-quality (PREFERRED ARC) + pkg-narrative-beats: Three competing story structures: MODE BEATS vs hook→twist→payoff→CTA vs HOOK→SETUP→ESCALATION→RESOLUTION. → Pick one structure owner (MODE BEATS or Narrative Beats); delete Preferred Arc.
- **C2 (high)** — pkg-attention-first vs critic-system: Attention First prioritizes scroll-stop; Critic forbids stop-scroll from auto-overriding originality/funnel/product. → Document as intentional tension; encode tradeoff in Critic scoring weights, not contradictory prose in Presentation.
- **C3 (medium)** — pkg-visual-scene-plan / AVAILABLE ASSETS optional vs pkg-asset-coverage required/should_use: Assets never mandatory vs coverage required stance. → Single typed stance from assetCoveragePolicy; prompts receive decision only.
- **C4 (medium)** — ctx-scenario-rules (never copy verbatim as claim) vs pkg-rules-line (scenario field verbatim): Scenario inspiration-only vs scenario field must be pool line verbatim. → Split fields: scenario_inspiration vs scenario_id; one contract.
- **C5 (medium)** — ideate-hard-requirements (not sales in scene 1) vs pkg-creative-candidate / Opening Priority (product OK if situational): Ideation bans early product sales; Presentation allows product in opening when part of situation. → Unify opening product policy in Candidate/DNA; ideation inherits same rule.
- **C6 (high)** — repair-story-integrity (explicit product demo input→value→outcome) vs PPD / productDemonstrationIntegrity (no synthetic UI; story-without-pixels OK): Repair asks for demonstration that PPD forbids as fake UI / landing-page proof. → Rewrite repair appendix to PPD language; delete legacy PRODUCT_DEMO wording.
- **C7 (medium)** — pkg-visual-progression (problem→failure→consequence→solution) vs pkg-creative-directive MODE BEATS / winner storyProgression: Fixed visual progression can fight humor/shock/contrarian mode beats. → Progression follows winner DNA storyProgression, not a second default arc.
- **C8 (medium)** — pkg-creative-identity Environment line vs Identity NEVER location/environment rules: Identity block still emits Environment while rules forbid location/environment. → Stop emitting Environment when DNA world exists (neutralize already tries — remove dual signal).

## Historical / legacy debt

- **pkg-attention-mechanism**: Added to patch a failure after newer structured controls already existed or later appeared. Hypothesis: hooks / generic. Still needed? No — overlaps Attention First + Candidate + Hook V2. → Delete after Candidate+Hook coverage proven
- **pkg-content-quality**: Added to patch a failure after newer structured controls already existed or later appeared. Hypothesis: hooks / validation. Still needed? Keep VO length; Preferred Arc is legacy vs MODE BEATS. → Keep VO hard-cap reminder once; delete Preferred Arc
- **pkg-hook-v2**: Added to patch a failure after newer structured controls already existed or later appeared. Hypothesis: hooks / consistency. Still needed? Mostly superseded by Candidate hookLine + enforceCandidateHook. → Delete after hook enforcement coverage proven
- **pkg-opening-priority-resolver**: Added to patch a failure after newer structured controls already existed or later appeared. Hypothesis: consistency / repair. Still needed? Yes as symptom of debt — remove layers instead. → Delete after collapsing opening owners to Candidate+DNA

## Deletion simulation

| Version | Est. size cut | Quality risk | What changes |
| --- | --- | --- | --- |
| Conservative | 8–15% | Low | Remove Redundant + validator-backed repeats (Attention Mechanism, Hook V2, Funnel echo, Visual Style, Scene Type Memory prose). |
| Moderate | 25–35% | Medium | Also resolve C1 (one arc), thin Story/PPD prose, delete Opening Priority, shrink Visual Narrative. |
| Aggressive | 50–65% | High | Rebuild Presentation from Product Brain + Strategy + Candidate/DNA + safety + schema; delta Repair; migrate arcs to code. |

## Workflow debt scores

| Workflow | Complexity | Debt | Maintainability | Stability | Drivers |
| --- | ---: | ---: | ---: | ---: | --- |
| Weekly Strategy | 28 | 22 | 78 | 82 | Minor triple restatement of source/ID rules |
| Direction | 38 | 30 | 74 | 78 | System vs WHAT A DIRECTION IS duplication |
| Direction Evaluation | 40 | 35 | 72 | 76 | Overlap with Critic diversity logic |
| Ideation | 65 | 55 | 48 | 60 | Hard requirements accretion; veto-overlapped bans; C5 opening product tension |
| Creative Critic | 52 | 45 | 58 | 70 | C2 tension with Attention First |
| Presentation | 92 | 88 | 22 | 38 | C1 triple arcs; Attention/Hook/Candidate stack; Opening Priority meta-debt; asset policy echoes |
| Repair | 94 | 86 | 20 | 34 | Full prompt replay; C6 PPD wording conflict |

## Architectural recommendations

Move to code/validators: invent bans, coverage stance, scene frequency, blank screens, VO/platform caps, dark-office/generic vetoes, repair field closure.

Keep in prompts: Product Brain facts, pain-point intent, selected Candidate/DNA (structured), MODE BEATS (single structure), compact CREATIVE SAFETY, platform-native rewrite intent.

Belong in Product Brain / config: service mix weights, per-platform style tables, funnel mix targets.

Belong in Repair API: violation codes + permitted field closure + prior package JSON — never the full Presentation essay.

## Redesign roadmap

- **P1**: Collapse Presentation to typed contract: Product Brain + Strategy + Winner Candidate/DNA + compact safety + schema → Presentation; pkg-* (Very High debt ↓, 25–40% Presentation input ESTIMATED, risk Medium, home: prompt+product_brain)
- **P2**: Resolve C1: one story structure owner; delete Preferred Arc and/or Narrative Beats prose → pkg-creative-directive; pkg-content-quality; pkg-narrative-beats (High debt ↓, 5–10% Presentation ESTIMATED, risk Medium, home: prompt)
- **P3**: Make Repair delta-only (violations + prior JSON + candidate); align C6 with PPD → repair-*; Story Integrity Repair (High debt ↓, ~70% of repair input ESTIMATED, risk Medium, home: repair)
- **P4**: Delete redundant Attention Mechanism + Hook V2 after Candidate+enforceCandidateHook coverage tests → pkg-attention-mechanism; pkg-hook-v2 (High debt ↓, ~600 tok/call ESTIMATED, risk Low–Medium, home: validator)
- **P5**: Single asset stance from code; delete Funnel Asset Policy echo; fix C3 → pkg-funnel-asset-policy; pkg-asset-coverage (Medium debt ↓, Moderate, risk Low, home: code)
- **P6**: One no-fake-UI / no-readable-text invariant at final boundary; remove repeats → ideate-hard-requirements; pkg-visual-beats; pkg-product-reveal; visual medium (Medium debt ↓, Small–moderate, risk Low, home: validator)
- **P7**: Thin Ideation hard requirements; move dark-office/B2B bans to veto-only; fix C5 → ideate-hard-requirements (Medium debt ↓, Modest input; larger if output schema shrinks, risk Medium, home: prompt+code)
- **P8**: Version instruction packs with owner, test, metric, sunset criterion → all workflows (Medium (process) debt ↓, Indirect, risk Low, home: config)

## Final recommendation

Stop adding Presentation instructions for each new failure mode. The Opening Priority Resolver exists because too many layers fight — that is the debt signal. Prove conservative deletions with validator tests, resolve C1/C2/C6, then rewrite Presentation and delta Repair behind quality gates.

## Artifacts

`instruction-inventory.csv`, `instruction-roi.csv`, `duplicate-responsibilities.csv`, `conflicting-instructions.csv`, `legacy-instructions.csv`, `prompt-complexity.csv`, `workflow-debt-score.csv`, `redesign-roadmap.csv`, `summary.json`.

