# Wave 1 report — Critical (Attention First)

**Date:** 2026-07-20  
**Scope:** HOOK-1, SEL-1, PG-1, SEL-2 (+ Identity prompt prep for ID-1)

---

## Implemented changes

### HOOK-1 — Lock candidate hook
- `alignHookWithFirstSpoken` accepts `lockToHook`.
- When a Creative Candidate is present, VO cannot overwrite the canonical hook; hook is applied onto VO instead.
- Expanded generic setup openers (industry-agnostic essay diluters).
- Wired in `generateContentPackage` + `regenerateContentPackage` (including repair re-align paths).

### SEL-1 — Two-phase selection
- Phase 1: stop-scroll shortlist (`stopPower` within 2 of pool max, top 3).
- Phase 2: commercial / finalSelectionScore only inside that shortlist.
- Winner reason + diagnostics expose `stop_shortlist`.

### SEL-2 — Stop-preserving commercial priors
- Narrowed commercial weight gap between families (absurd/consequence no longer commercial dead ends).
- Removed industry-/location-specific penalties (mascot/parking lot, departure-board name bans).
- Replaced with general heuristics: meaningful opening event boost; readable-text dependence penalty; low-information opening penalty.

### PG-1 — Opening priority resolver
- Prompt Builder: mandatory OPENING PRIORITY RESOLVER (winner openingSituation → Attention → DNA → Identity treatment only → VN/Scene Meaning).
- Scene Meaning reframed to opening event/meaning (not fixed “one second” / theme illustration).
- Candidate prompt: Attention First selection copy; Identity must not relocate; product allowed in open, sales pitch forbidden.
- Creative Identity prompt: treatment-only rule (style/camera/color — never location/event).

---

## Changed files

- `lib/attention/alignHookVoiceover.ts`
- `lib/attention/cliches.ts`
- `lib/attention/openingContract.ts`
- `lib/creative-candidates/comparativeJudge.ts`
- `lib/creative-candidates/commercialScore.ts`
- `lib/creative-candidates/familyMetadata.ts`
- `lib/creative-candidates/promptBlocks.ts`
- `lib/creative-identity/promptBlocks.ts`
- `lib/ai/prompts/generateContentPackage.ts`
- `lib/ai/workflows/generateContentPackage.ts`
- `lib/ai/workflows/regenerateContentPackage.ts`
- `scripts/check-creative-candidates.ts`
- `scripts/check-attention-engagement.ts`

---

## Deviations from plan

| Plan item | Adjustment (per implementation brief) |
| --- | --- |
| Forbid calm desks / empty boards in scene 1 | **Not implemented as motif bans.** Penalize only low-information openings; calm/empty allowed when meaning-bearing. |
| Fixed “first 3 seconds” / 1.0–1.8s | **Replaced** with “opening meaning block” / complete meaning unit language. |
| Ban product in first 2s | **Not in Wave 1.** Product allowed in hook; sales/CTA/pricing forbidden in opening meaning block (prompt). Full PR-1 in Wave 3. |
| Specific audit examples in commercial heuristics | **Generalized** to event / readable-text / low-info principles. |

---

## Side effects

- More high-stop families can win when within shortlist → possible more metaphor / fidelity repair pressure (mitigated by firstFrameClarity tiebreak + readable-text commercial penalty).
- Identity prompt is stricter about location; resolve/catalog filter for ID-1 still pending Wave 2.
- Tests that expected pure commercial overturn of far-weaker stop were rewritten for shortlist policy.

---

## Verification

| Check | Result |
| --- | --- |
| `npm run check:creative-candidates` | 49 passed |
| `npm run check:attention-engagement` | 33 passed |
| `npm run check:attention-first` | 15 passed |
| `npm run check:creative-identity` | 6 passed |
| `npx tsc --noEmit` | pass |
| `npm run build` | pass |

---

## Open issues (deferred to later waves)

- ID-1 resolve/catalog: Identity must not resolve alternate environments (Wave 2).
- ATT-1 motion bias + originality low-info rejection (Wave 2).
- GEN-1 rejected-pool lottery (Wave 2).
- NB-1 / FID-1 (Wave 2).
- PR-1 / FAM-1 / CQ-1 / DNA-1 / VN-1 (Wave 3).
