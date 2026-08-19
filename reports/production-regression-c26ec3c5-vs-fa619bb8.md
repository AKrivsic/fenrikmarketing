# Production Regression Audit

Product Quality Restoration · Fenrik.chat · read-only · 2026-07-24

Previous: `fa619bb8-b9cc-4fc9-818e-28cf6055980a` → New: `c26ec3c5-da27-4a8e-a80c-f5e527510603`

Exported from canvas `production-regression-c26ec3c5.canvas.tsx`.

---

## Executive summary

| Metric | Value |
| --- | --- |
| Restoration succeeded? | **PARTIAL** |
| Previous score | **6.0 / 10** |
| New score | **6.8 / 10** |
| Deliver to customer? | **NEW** (content; video needs edit) |

### Verdict in one line

Structural product fixes landed (5 AI stills, Story Integrity passed with $0 SI repair, assets optional, 1:1 beat→scene map). All-in cost and wall time got worse because Concept Fidelity burned 3 attempts ($0.686 / ~18 min) before the winning package. Deliver the new package for content; do not ship the video as premium without fixing clock-time fidelity.

---

## Final comparison

| Category | Previous | New | Better? |
| --- | --- | --- | --- |
| Content | Bounce-rate redefinition; LinkedIn overclaim | Two-clock after-hours metaphor; cleaner claims | New |
| Voiceover | 56 words · 22.2s speech · match 1.0 | 62 words · 23.9s speech · match 0.968 | Tie / slight prev |
| Video | 23.7s · glyph miss + sub-over-CTA | 25.4s · stronger concept, weak clock fidelity | New (with caveats) |
| Images | 3 AI + 1 asset | 5 AI + 0 assets | New (count) / mixed (quality) |
| Storyboard | 4 beats → 4 scenes (3 AI + asset) | 5 beats → 5 scenes 1:1 | New |
| Pacing | Res 4.14s · ending asset long under subs | Res 4.58s + CLOSE scene-5; ending not shorter | Tie |
| Asset usage | 1 product screenshot (optional path used) | 0 assets; stance=optional quality_count=4 | New (optional rule) |
| Cost (success path) | $0.815 | $0.681 | New −$0.134 |
| Cost (all-in) | $0.815 (+unmetered TTS fail) | $1.367 (incl. CF fails) | Previous |
| Runtime (to video done) | ~18.6 min | ~27.9 min | Previous |
| Reliability | SI repair fail + TTS retry | SI pass + CF ×3 fail then ok; 1 video job | Mixed |
| Overall | Sellable w/ edits | Better creative; cost regression | New (quality) / Prev (efficiency) |

---

## 1. Content quality

### Previous — Bounce-rate silence

- Hook: “You've been defining this number wrong for years.”
- CTA: Create your AI assistant — let your website answer the question that ends the bounce.
- Prior audit: TikTok/IG/X sellable; LinkedIn primary overclaim (“Every session… ended because…”); YT CTA generic Subscribe.

### New — After-hours clocks

- Hook: “Your clock stopped. Theirs didn't.”
- CTA: Create your AI assistant — let your website keep running when you can't.
- Stronger stop-scroll; LinkedIn/X variants avoid absolute causality; YT CTA still generic Subscribe. Topic matches strategy (2 AM enterprise deal).

Quality improved for storytelling, hook, and commercial copy cohesion. Factual accuracy is fine for problem-aware marketing (no invented stats). Platform outputs: 11/11 items both runs.

---

## 2. Video quality

| Question | Evidence | Answer |
| --- | --- | --- |
| Did Scene 1 improve? | Prev: marker + squiggle (BOUNCE RATE miss). New: mustard wall + analog clock + hand — readable hook situation. | Yes |
| Is ending still too long? | Prev Res 4.14s / 23.7s. New Res plan 4.58s + scene-5 CLOSE; video 25.4s; CTA cues 20.1–23.9s. | Not shorter; similar share |
| Stronger visual storytelling? | Concept yes (frozen vs running clocks). Render: scene-2 both clocks ≈10:10; scene-5 clocks not synced (≈10:09 vs 1:52). | Concept ↑ / fidelity ↓ |
| Subtitle placement | Prev: majors covering product CTA. New: centered safe-zone; scene-4 “was there.” covers phone UI. | Improved vs product CTA; still overlaps subject |
| Product presentation | Prev: real asset 7e250d64 screenshot. New: AI phone chat (PRODUCT_OUTCOME); bubble text blurred. | Prev more authentic product |

---

## 3. AI image generation

| Metric | Change |
| --- | --- |
| AI stills generated | 3 → 5 |
| Assets reused | 1 → 0 |
| Total visuals | 4 → 5 |

| Check | Previous | New | Result |
| --- | --- | --- | --- |
| Presentation 4–5 AI? | 3 image_prompts · visual_beat_count 4 | 5 image_prompts · visual_beat_count 5 · sparse_plan_adjustment=false | Pass — produced 5 directly |
| Assets optional? | Used 1 landscape UI screenshot | asset_usage=[] · rationale quality_count=4 · stance=optional | Pass — available, not forced |
| Did assets improve quality? | Yes for product clarity; subtitle covered CTA | N/A — none used; synthetic phone instead | Optional path worked; product clarity traded away |
| Unnecessary reuse? | reused_still_count=1 (asset) | reused_still_count=0 | No unnecessary AI reuse |

Image telemetry: prev generated=3 reused=1 cost $0.126 (87.7s). New generated=5 reused=0 cost $0.210 (110.4s). Scene-3 clock numerals hallucinated (duplicate 11, “16”) — quality risk on AI-only path.

---

## 4. Storyboard

| Metric | Previous | New |
| --- | --- | --- |
| Narrative beats | HOOK/SETUP/ESCALATION/RESOLUTION | Same 4 roles |
| Visual beat count | 4 | 5 |
| Worker scenes | 4 IMAGE | 5 IMAGE |
| Motion map | 4 scenes (no stored semantic_motion rows in prior audit export) | beat-1→s1 … beat-5→s5 (ATTENTION…CLOSE) |
| Overflow pinned to final? | Prior RCA: 5 beats → pin last (old) | No — 5th beat is its own scene-5 CLOSE |

### Overflow fix verified

New `timeline_debug.storyboard.sceneCount=5` with distinct summaries per scene. Motion beats map 1:1. `visualProgressionDiagnostics` flagged `scenes_2_and_3_no_visual_progression` (static_repetition) — still a remaining weakness inside the mustard-wall world.

---

## 5. Story Integrity

### Previous

- Story Integrity: Failed (`primary_actor_changed`)
- Story Integrity Repair: ran · success=false · retry_count=2 · 371.9s · $0.234513
- Soft-continued after repair fail (VO word-cap on repair output). Hands/prop opening (marker) was the FP class the skip policy targets — not deployed on this run.

### New

- Story Integrity: Passed (9 ms)
- Story Integrity Repair: did not execute
- Not a skip-after-fail path: `integrity.passed=true` so `shouldInvokeStoryIntegrityRepair` short-circuits. Opening still includes intentional hand/prop (hand on wall / marker label). SI waste eliminated on success path.

---

## 6. Image sanitizer

| Concept | Brief / DNA | Render evidence | Survived? |
| --- | --- | --- | --- |
| Frozen vs running clocks | Left 6:00 frozen · right running | Scene-2 both ≈10:10; scene-5 not synced | Partial — concept in prompts, weak in pixels |
| Hand + marker labeling | Writes 'Them' label | Scene-3 hand+marker+paper present | Yes (gesture) |
| Readable Us/Them text | Candidate uses 'Us'/'Them' | Prompts: illegible partial letterforms / not readable | Blocked as intended |
| Phone chat product moment | Active AI reply 12:43 AM | Scene-4 phone + chat bubbles; bubble text blurred | Gesture yes · readable UI text blocked |

---

## 7. Execution time

| Phase | Previous | New | Δ |
| --- | --- | --- | --- |
| Strategy | 5.3s | 5.9s | +0.6s |
| Package (success telemetry) | ~13.0 min (incl. SI repair 6.2 min) | ~8.5 min (00:45:45→00:54:13) | Success path faster |
| Failed package attempts | none recorded on item | attempt_count=3 · 1072s · CF repair 433.7s | +17.9 min waste |
| Image generation | 87.7s (×3) | 110.4s (×5) | +22.7s |
| Video job wall | 248.5s (ok job); +24s failed TTS job | 307.4s (single job) | +59s vs ok job |
| Render / FFmpeg | 147.6s | 179.7s | +32.1s |
| Total create→video complete | 22:28:01→22:46:38 ≈ 18.6 min | 00:31:29→00:59:20 ≈ 27.9 min | +9.3 min |

---

## 8. Cost

| Bucket | Previous $ | New $ | Savings |
| --- | ---: | ---: | --- |
| Strategy AI | 0.015462 | 0.015771 | −0.0003 |
| Package AI (persisted success) | 0.666290 (incl SI repair 0.2345) | 0.447304 (no SI repair; JSON×2) | +0.219 |
| Failed package attempts (item.failure_telemetry) | 0.000 | 0.685809 | −0.686 |
| Video AI (TTS+Whisper+Images) | 0.133395 | 0.217861 | −0.084 |
| Images only | 0.126 (×3) | 0.210 (×5) | −0.084 |
| SI / integrity repairs | 0.234513 | 0.000 | +0.235 |
| CF repairs (failed attempts) | 0.000 | 0.238023 (in fail telem) | −0.238 |
| Claude retries (SI/CF) | SI retry_count=2 | CF retry_count=2 on fail path | shifted |
| Success-path total | 0.815147 | 0.680936 | +0.134 |
| All-in recorded | 0.815147 | 1.366745 | −0.552 |

Pricing: `list-price@2026-07-23` stored `estimated_cost` only. FFmpeg / infra unmetered both runs. Prev failed TTS job still unmetered.

---

## 9. Technical health

| Signal | Previous | New | Regression? |
| --- | --- | --- | --- |
| Run status | completed 1/1 | completed 1/1 | No |
| Video jobs | 1 fail TTS + 1 ok | 1 completed | Improved |
| JSON Repair | ×6 openai | ×2 on success; ×6 on fail telem | Success path better |
| JSON diagnostics | legacy (no validation_issues on some steps) | repair_reason + validation_issues present | Improved |
| SI Repair | failed waste | skipped (passed) | Improved |
| Concept Fidelity | passed first pass | fail telem: storyboard_collapsed_to_generic_office × attempts; success passed | New waste class |
| Render warnings | 0 | 0 | No |
| TTS tail | fail then retry ok | passed first try | Improved |
| Visual progression warn | postLlm info progression fail (chaos_planning) | scenes_2_and_3_no_visual_progression | Different residue |

---

## 10. Commercial quality

### Which run would you deliver?

Deliver the new run for content and creative direction. It is the clearer Fenrik problem-aware story (after-hours availability) with punchier hooks across TikTok/IG/X/LinkedIn.

Do not deliver the new video as a premium finished asset without edits: the core metaphor (stopped vs running / then synced clocks) does not read reliably in the renders, and scene-3 clock faces are hallucinated. Previous video remains a usable organic cut with known subtitle/CTA and glyph issues — weaker concept, clearer product screenshot.

- **Content:** NEW
- **Video:** NEW with edit / or PREV organic
- **Overnight cost:** PREV safer until CF waste fixed

---

## Final verdict — Product Quality Restoration

### Did it succeed?

Partially. Every structural target from the restoration plan that this run exercised is confirmed in DB/telemetry/artifacts — except efficiency, which regressed via Concept Fidelity retries.

### Improvements (evidence-backed)

- 5 AI stills (target 4–5); worker IMAGE×5; $0.210 image step.
- Assets optional: unused despite quality_count=4.
- Story Integrity Passed — $0.235 / 6.2 min SI repair eliminated vs previous.
- Beat→scene 1:1; overflow not pinned to final scene.
- Gesture concepts preserved; readable Us/Them blocked via illegible letterforms policy.
- Stronger commercial hook/story; single video job (no TTS fail).
- Success-path AI cost −$0.134 vs previous recorded total.

### Remaining weaknesses

- Concept Fidelity ×3 failure telem $0.686 / 1072s before success — largest new regression.
- Clock-time metaphor not reliable in pixels (contrast + sync).
- Scene-3 numeral hallucination; visualProgression 2↔3 static.
- No authentic product asset — synthetic phone UI vs prev screenshot.
- Ending not shorter; CTA subtitle still covers subject in scene-4.
- YouTube CTA still generic Subscribe.
- All-in cost +$0.55 and wall +9.3 min vs previous.

### Highest ROI next fix

Kill Concept Fidelity false-positive loops (`storyboard_collapsed_to_generic_office` on inventive non-office metaphors). This run spent more on failed CF repair than the entire previous package AI bill. Second: enforce frozen-vs-running clock state in image prompts / QA before render, or prefer an authentic product asset on the resolution beat.

---

## IDs & sources

| Role | ID |
| --- | --- |
| Previous run | `fa619bb8-b9cc-4fc9-818e-28cf6055980a` |
| New run | `c26ec3c5-da27-4a8e-a80c-f5e527510603` |
| Previous package | `2a686bdb-5eae-453b-ba5a-91d0227c14af` |
| New package | `9f6e880b-afc3-4395-ba5a-ee68a34c2086` |
| Previous video job | `68419281-d103-4fda-b46d-835549d0eca7` |
| New video job | `481814b9-64ad-45f9-90a4-a1041030e15d` |

Sources: `production_runs`, `production_run_items.failure_telemetry`, `content_packages.package_brief` (+ `presentation_generation` telemetry), `video_jobs.output.debug` / `render_spec`, extracted MP4 frames + SRT, `lib/production-runtime/repairPolicy.ts`, `reports/product-quality-restoration-validation.md`, `scripts/audit-production-run.ts` export for `c26ec3c5…`.
