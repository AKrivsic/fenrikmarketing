# Wave 2 report — High (Attention First)

**Date:** 2026-07-20  
**Scope:** ID-1, ATT-1, GEN-1, NB-1, FID-1

---

## Implemented changes

### ID-1 — Identity never relocates opening world
- `neutralizeIdentityEnvironmentForDna` always locks environment to DNA world (treatment only), not only on keyword conflict.
- New `neutralizeIdentityEnvironmentForOpening` when candidate openingSituation exists without DNA.
- `planCreativeIdentityForPackage` accepts `openingSituation`; workflows pass winner opening.
- Identity prompt already states treatment-only (Wave 1).

### ATT-1 — Opening motion + low-information rejection
- Opening structures bias `first_motion_intent` toward ATTENTION/REVEAL (HOLD reserved for confession / whispered intimate).
- Originality pass rejects low-information openings (weak next-beat + emotion + novelty).

### GEN-1 — Rejected-pool stop preference
- When all candidates soft-rejected, pool is ranked by stopPower (then memorability / firstFrameClarity ≥ 5), not unordered commercial lottery.
- Still uses stop shortlist + commercial phase 2.

### NB-1 — Opening meaning block before SETUP
- Duration weights: HOOK (1.1) ≥ SETUP (0.85); ESCALATION 1.2.
- `MAX_HOOK_SHARE` raised to 0.32 (complete meaning unit, not lecture).
- Narrative prompt: OPENING MEANING BLOCK rules; SETUP must not speak first.
- deriveBeats: HOOK whyContinue as open loop; SETUP after hook lands.

### FID-1 — Event + stop-scroll + anti-sales-pitch
- New fidelity rules: `opening_event_preserved_in_scene1`, `stop_scroll_idea_preserved`, `sales_pitch_opening`.
- Repair appendix validates event/meaning, not token overlap alone.
- Product allowed in open; sales/CTA/pricing in first spoken fails.

---

## Changed files

- `lib/creative-candidates/creativeDNA.ts`
- `lib/creative-candidates/index.ts`
- `lib/creative-candidates/comparativeJudge.ts`
- `lib/creative-candidates/fidelityCheck.ts`
- `lib/creative-candidates/types.ts`
- `lib/creative-identity/planForPackage.ts`
- `lib/attention/openingContract.ts`
- `lib/attention/originalityPass.ts`
- `lib/narrative-beats/durationWeights.ts`
- `lib/narrative-beats/durationValidation.ts`
- `lib/narrative-beats/promptBlocks.ts`
- `lib/narrative-beats/deriveBeats.ts`
- `lib/ai/workflows/generateContentPackage.ts`
- `lib/ai/workflows/regenerateContentPackage.ts`
- `scripts/check-creative-candidates.ts`
- `scripts/check-narrative-beats.ts`

---

## Deviations from plan

| Plan | Adjustment |
| --- | --- |
| NB-1 “first 3 seconds” | Opening **meaning block** language (per brief). |
| ATT-1 kill calm concepts | Reject **low-information** opens only; calm/HOLD still allowed for confession. |
| ID-1 catalog filter of café/co-working options | Not removed from catalog (series variety without candidates). Locked whenever DNA/openingSituation present. |

---

## Side effects

- Longer hooks may approach 32% share — still capped under 35% beat max.
- More fidelity material failures → more repair loops when scene drops the event.
- Identity environment in persisted packages with DNA always reads as treatment-inside-world.

---

## Verification

| Check | Result |
| --- | --- |
| `check:creative-candidates` | 49 passed |
| `check:narrative-beats` | 29 passed |
| `check:concept-fidelity-production-fix` | 25 passed |
| `check:attention-engagement` | 33 passed |
| `check:creative-identity` | 6 passed |
| `check:story-integrity` | 15 passed |
| `npx tsc --noEmit` | pass |
| `npm run build` | pass |

---

## Open issues → Wave 3

PR-1, FAM-1, CQ-1, DNA-1, VN-1
