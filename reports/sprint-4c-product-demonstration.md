# Sprint 4C — Product Demonstration Integrity

Solve the remaining production bottleneck from audit `9d9fa60b`: finished videos describe Fenrik in voiceover but do not visually demonstrate it.

**Out of scope (unchanged):** Selection v3 · Story Integrity architecture · Platform Writing (4B)

---

## 1. Architecture review

```
Selection v3 (unchanged)
    ↓
Creative DNA + Narrative Beats (RESOLUTION strengthened)
    ↓
Story Integrity 4A (world continuity; product-demo detection now semantic)
    ↓
Product Demonstration Integrity 4C  ← NEW hard gate
    ↓
Image prompts / visual_scenes
    ↓
Render
```

Sprint 4C adds a **separate hard gate** after Story Integrity:

1. Lock `PRIMARY_ACTOR` from Creative DNA / opening
2. Require visual sequence: **Question → Visible AI answer → Visible outcome**
3. Reject smile-only / floating-icon / landing-page “resolutions”
4. Reject narration-only answer/result
5. One repair regenerate, then `generation_failed`

Story Integrity is **not redesigned**. Its `detectProductDemonstration` now delegates to the Sprint 4C semantic detector so the known keyword false positives cannot soft-pass SI either.

---

## 2. Problem analysis

| Failure (run `9d9fa60b`) | Root cause |
| --- | --- |
| Question → concerned owner → phone → happy owner | Image prompts generated lifestyle variety, not conversation progression |
| No visual AI answer | Prompts forbade readable UI; models emitted blank screens / empty bubbles |
| “Product demo PASS” in validator | `ANSWER_RE` matched **“No reply bubble”**; `RESULT_RE` matched problem VO **“lead”** |
| Three different actors | No PRIMARY_ACTOR lock; SI actor check satisfied by any phone/chat keyword |
| Smile + floating icon as resolution | DNA said “don’t resolve with happy expression” but no hard validator |

---

## 3. Files changed

| File | Change |
| --- | --- |
| `lib/creative-candidates/productDemonstrationIntegrity.ts` | **New** — semantic demo detection, PRIMARY_ACTOR, resolution rules, prompt + repair |
| `lib/creative-candidates/storyIntegrity.ts` | `detectProductDemonstration` → semantic delegate (false-positive fix) |
| `lib/creative-candidates/types.ts` | `productDemonstrationIntegrity` on plan |
| `lib/creative-candidates/planForPackage.ts` | `attachProductDemonstrationIntegrityToPlan` |
| `lib/creative-candidates/promptBlocks.ts` | Embed 4C prompt; persist diagnostics |
| `lib/creative-candidates/index.ts` | Exports |
| `lib/ai/workflows/generateContentPackage.ts` | Hard gate + one repair |
| `lib/ai/workflows/regenerateContentPackage.ts` | Same hard gate |
| `lib/ai/prompts/generateContentPackage.ts` | Continuity + product-demo still contract; structured chat UI exception |
| `lib/narrative-beats/promptBlocks.ts` | RESOLUTION must show product solving |
| `scripts/check-product-demonstration-integrity.ts` | **New** tests |
| `scripts/check-story-integrity.ts` | AFTER scenes use explicit “AI reply appears” |
| `scripts/check-creative-candidates.ts` | Expect 4 `generateValidatedJson` sites |
| `package.json` | `check:product-demonstration-integrity` |
| `reports/sprint-4c-product-demonstration.md` | This doc |

---

## 4. Before / after examples

### Product demonstration detection

**Before (keyword, false PASS):**
```
Scene 1: "… No reply bubble. The screen is quiet."
→ ANSWER_RE matched "reply bubble" → answer_signal
VO: "Every unanswered visitor is a lead you can't chase"
→ RESULT_RE matched "lead" → result_signal
→ present: true  ❌
```

**After (semantic):**
```
"No reply bubble" → negation window → answerPresent: false
Problem VO "lead" without capture language → resultPresent: false
Narration "Fenrik.chat answers for you" alone → answer_narration_only
→ present: false  ✓
```

### Resolution scene

**Before:**
> Professional figure… quietly pleased… small smile… soft notification indicator, abstract shape…

**After (required):**
> Same visitor's hands on the same phone as the answered chat confirms a booking lead is captured — conversation continues  
> / AI reply appears instantly on the same chat thread…

### Actor continuity

**Before:** visitor → glasses/blazer owner → empty bubbles → different suited man  

**After:** `PRIMARY_ACTOR` locked; identity change without continuity language → hard fail (`primary_actor_identity_changed`)

### Image prompt guidance

**Before:** “NEVER request … UI …” → blank screens  

**After:** Exception — show structured chat state (sent → waiting → reply → confirmation) as blurred/abstract shapes; forbid floating icon / smile-only resolution; keep same actor/phone/conversation.

---

## 5. Tests

```bash
npm run check:product-demonstration-integrity   # 12 passed
npm run check:story-integrity                   # 9 passed
npm run check:creative-candidates               # includes 4C wiring
```

Coverage includes:
- `No reply bubble` is not an answer
- Bare problem “lead” is not a result
- Exact `9d9fa60b` prompt shape fails
- Continuous ask→answer→result + same actor passes
- Smile-only and floating-icon resolutions fail
- Narration-only product claim fails

---

## 6. Expected production improvements

| Metric | Expected change |
| --- | --- |
| Validator false PASS on product demo | Eliminated for keyword traps above |
| Packages shipping without visual AI reply | Blocked (hard fail after one repair) |
| Mid-package actor identity swaps | Blocked |
| Smile / floating-icon endings | Blocked |
| Finished video product demo score | Should rise from ~2/10 toward ≥6/10 when prompts obey |
| Selection / platform writing quality | Unchanged |

**Remaining risk:** image models may still ignore structured-chat instructions. 4C forces the **prompt contract + textual validation**; pixel/vision QA is a later sprint if stills drift from prompts again.

**Recommended next production step:** regenerate one Fenrik package after deploy and re-audit against `reports/production-audit-9d9fa60b.md` checklist (inspect actual stills, not only JSON).
