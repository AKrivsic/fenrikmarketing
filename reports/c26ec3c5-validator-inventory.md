# Validator Inventory — c26ec3c5-da27-4a8e-a80c-f5e527510603

_READ-ONLY. Evidence: run telemetry + package_brief.presentation_generation + code paths._

| Validator | What it checks | Hard/soft | Cost (this run) | Failure action | Caught real problem? |
| --- | --- | --- | --- | --- | --- |
| Creative Direction Evaluation | Scores directions (fit, originality, **production_feasibility**, …) | Soft ranking | ~$0.083 (2 calls) | Rank/select directions | **No** — scored dual-clock feasibility 9 |
| Creative Evaluation (LLM critic) | Comparative concept scores | Soft / ranking | $0.045 (fail path only) | Rank winner | Fail path chose c6 (draft lost). Success path **skipped** (deterministic_fallback) |
| Candidate Judge / commercial-success | Deterministic selection diagnostics | Hard among survivors | $0 | Pick sole survivor | **No** — accepted c4; commercial dims all 0 under fallback |
| Fingerprint / memory filter | Collision with recent packages | Hard veto | $0 | Reject concepts | **Harmful** — removed all non-clock options |
| Hook Enforcement | Align hookLine → hook/first spoken | Deterministic fix | $0 | Rewrite hook/VO | N/A (already_enforced) |
| Concept Fidelity | Token/heuristic fidelity to candidate; generic-office collapse | Material → hard after repair | Fail: $0.238 repair + loop; Success: $0 | Repair then hard-fail | **No** — missed still doom; fail path likely FP |
| Story Integrity | Commercial world continuity tokens/actors | Hard (repair path exists; not used) | $0 (passed) | Would repair/fail | **No** (passed; wrong layer) |
| Product Demonstration Integrity | Product demo / presentation integrity | Deterministic | $0 | Gate | Did not block synthetic phone still |
| Information Progression | Beat info keys progress | Soft/hard per config | $0 | Warn/correct | Passed |
| Visual Progression | Adjacent stills must change meaningfully | Soft warn here | $0 | Warning only | **Partial** — flagged 2↔3 static_repetition; did not stop |
| Duration Validation | Beat duration shares | Soft/hard | $0 | Warn | Passed |
| JSON / schema validation | Package JSON shape | Hard → JSON Repair | ~$0.022 | Repair loop | Schema only |
| Image sanitizer / NO_TEXT policy | Strip readable text requests | Prompt-time | $0 | Alter prompts | Blocked Us/Them readability (intended) but left exact-time asks |
| TTS/Whisper match | Transcript vs script | Soft/retry | $0.008 | Retry TTS | Passed (match 0.968) |
| Render validation | Duration/warnings | Soft | unmetered | Warnings | No warnings; doesn’t check clock meaning |
| Product Presentation Decision | Reveal ceiling / asset stance | Policy | $0 | Shapes prompts | Chose PRODUCT_OUTCOME; still emitted chat UI still |

## Which were useful?

- Strategy + ideation for on-topic after-hours story (copy quality).  
- Visual Progression warning correctly smelled static repetition (insufficient action).  
- TTS/Whisper validation (technical audio OK).

## Which were redundant?

- Multiple flat score dimensions under deterministic_fallback (all 7s).  
- Stacked integrity validators that pass while pixels fail commercially.

## Which generated false positives?

- **Concept Fidelity `storyboard_collapsed_to_generic_office`** on fail path (likely FP; draft not stored). Hard loop cost $0.69.

## Which missed the most important commercial failure?

- Creative Direction Evaluation production_feasibility  
- Candidate Judge / missing still-feasibility gate  
- Concept Fidelity (wrong problem)  
- Story Integrity / Product Demonstration Integrity

## Textual compliance vs final-video viability?

Almost all package validators evaluate **text/schema/heuristic compliance**. None evaluate whether the **rendered slideshow** communicates the concept. **CONFIRMED**.
