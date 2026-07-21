# Package Alignment Fixes

Fixes for the two actionable warnings from `reports/package-alignment-audit.md`.

## 1. Root cause analysis

### Issue 1 — PRODUCT_DEMO voiceover mismatch

**Root cause:** Package generation produced a continuous problem-state voiceover through the close (“contact form… quietly losing…”), while a structured `PRODUCT_DEMO` scene (AI answer → lead captured) was injected later by `ensureStructuredProductDemo`. There was no post-check aligning narration to the demo beat. The video script also assigned problem VO under the PRODUCT DEMO label.

**Not caused by:** Product Brain, Weekly Strategy, Strategy Item, or Story Integrity hard gates (those still passed).

### Issue 2 — CTA contract mismatch

**Root cause:** Two conflicting “truths” existed:

1. Every package has `cta.text` (copy for captions / platform fields).
2. On-screen typed CTA scenes are often **not** requested (`requested_cta_count: 0` for problem-aware / habit closes).

Script generation invented “CTA text on screen” without a typed CTA scene. Story Integrity then warned `cta_mismatch` whenever spoken VO did not mirror `package.cta.text`, even when no on-screen CTA was requested.

**Source of truth (now):** On-screen CTA = typed `CTA` scene in `visual_scenes` (reflected in `requested_cta_count`). Spoken CTA alignment is required only when that typed scene exists.

## 2. Files changed

| File | Role |
|------|------|
| `lib/content-package/alignProductDemoNarration.ts` | **New** — deterministic PRODUCT_DEMO VO/script aligner + on-screen CTA claim scrubber |
| `lib/creative-candidates/storyIntegrity.ts` | Spoken CTA check only when typed CTA scene present (or `requireSpokenCtaAlignment`) |
| `lib/ai/workflows/generateContentPackage.ts` | Wire aligners after `ensureDemo` / PDI repair / frequency downgrades |
| `lib/ai/workflows/regenerateContentPackage.ts` | Same wiring |
| `scripts/check-story-integrity.ts` | Update CTA SoT expectations; add typed-CTA warning case |
| `scripts/check-package-alignment-fixes.ts` | **New** — fixture replay of audited package failure modes |
| `package.json` | `check:package-alignment-fixes` script |
| `reports/package-alignment-fixes.md` | This report |

## 3. Explanation of each fix

### Fix 1 — `alignProductDemoNarration`

When `visual_scenes` includes `PRODUCT_DEMO` and late voiceover still narrates problem-state (contact form / silence / unanswered), the aligner:

- Replaces the strongest late problem sentence with a solution line derived from the demo beat outcome (e.g. lead captured → “Then the website answers — the visitor gets a reply and the lead is captured.”)
- Removes remaining late problem sentences that would still contradict the demo
- Scrubs PRODUCT DEMO script Voiceover lines that still narrate the problem

Runs after `ensureStructuredProductDemo` (and again after forced demo repair) so visuals and narration agree before Story Integrity / PDI.

### Fix 2 — CTA single source of truth

1. **`alignOnScreenCtaContract`** — If no typed CTA scene, strip script phrases like “CTA text on screen.” Re-run after presentation frequency downgrades so script matches final scenes.
2. **Story Integrity** — Soft `cta_mismatch` only when a typed CTA scene exists (or caller forces `requireSpokenCtaAlignment`). Without an on-screen CTA, evidence is `onscreen_cta_not_requested_skip_spoken_cta_check`.

Package `cta.text` remains for platform copy; it is **not** treated as a requirement for spoken close or on-screen CTA.

## 4. Verification

### Automated (passed)

```text
npm run check:package-alignment-fixes   # 6/6
npm run check:story-integrity           # 15/15
npm run check:product-demonstration-integrity  # 12/12
```

Fixture used the audited package VO + PRODUCT_DEMO payload (financing → AI answer → lead_captured) and confirmed:

- ✓ PRODUCT_DEMO narration matches visuals after align
- ✓ No contradictory VO over the demo beat
- ✓ Story Integrity passes
- ✓ Product Demonstration Integrity passes
- ✓ No CTA mismatch warning when `requested_cta_count` / typed CTA is absent
- ✓ Typed CTA scene still warns on spoken CTA mismatch (contract preserved when CTA is requested)

### Live package generation

Not run in this session (LLM cost / wall time). Post-conditions are covered by replaying the exact audited failure fixture through the new align + integrity path, which is what new packages execute after `ensureDemo`.

## 5. Remaining known limitations

- Aligner is heuristic (regex + sentence rewrite), not LLM rewrite — unusual problem phrasings may need pattern expansion.
- Early-half problem setup is intentionally kept; only late / demo-adjacent contradiction is corrected.
- `package.cta.text` can still differ from spoken close when no typed CTA scene exists (by design for habit/problem-aware closes).
- Script scrub targets `Voiceover: '…'` under PRODUCT DEMO labels; atypical script formats may not scrub.
- Does not change Strategy Item / prompt policy for when typed CTAs are requested — only aligns downstream stages to that decision.
