# Image Generation Count — Root Cause Audit

Run: `fa619bb8-b9cc-4fc9-818e-28cf6055980a`  
Package: `2a686bdb-5eae-453b-ba5a-91d0227c14af`  
Completed video job: `68419281-d103-4fda-b46d-835549d0eca7`  
Method: read-only · DB + export + worker telemetry + code · 2026-07-24

---

## 1. Executive Summary

Only **three** AI images were generated because Presentation planned **four visual scenes of which one is an existing project asset** (product UI screenshot `7e250d64-…`). The worker telemetry records this explicitly:

```text
Image generation → generated=3; reused=1
```

There is **no missing fourth generation**. The fourth on-screen still is a **reused** library asset (`source: "asset"`), not an AI still. A fifth AI image was **never planned** for this package (`visual_beat_count: 4`, `image_prompts.length: 3`).

This is **expected behaviour** under the current `visual_scenes` model (AI | asset), not a regression and not a hidden drop of a fourth prompt. Historical Fenrik jobs show the same pattern whenever an asset is inserted: AI gens fall to ~3–4; all-AI packages still generate 4–5.

---

## 2. Complete visual pipeline reconstruction

| Stage | Count | What it is | Evidence |
| --- | --- | --- | --- |
| Creative / Narrative Beats | **4** roles | HOOK → SETUP → ESCALATION → RESOLUTION | `presentation_generation.narrative_beats.beats` |
| Duration plan | **4** slots | Shares 0.282 / 0.218 / 0.308 / 0.192 | `timeline_debug.duration_plan` |
| Presentation `visual_scenes` | **4** | 3× `source:"ai"` + 1× `source:"asset"` | package brief |
| `visual_beat_count` | **4** | Persisted | `presentation_generation.visual_beat_count` |
| `sparse_plan_adjustment` | **false** | No sparse downshift | same |
| Derived `image_prompts` | **3** | Only AI scenes → prompts | `syncLegacyFieldsFromVisualScenes` |
| `asset_usage` | **1** | Asset `7e250d64-…` | package brief + `asset_usage` row |
| Render spec scenes | **4** | scene-1..3 AI paths; scene-4 asset path | `video_jobs.output.render_spec` |
| Worker storyboard beats | **5** | From audio 22.2s → `round(22.2/3)` clamped to max 5 | `buildStoryboard` + semantic_motion beats |
| Image generation jobs | **1 step, 3 gens** | `generated=3; reused=1`; cost $0.126 = 3 × $0.042 | telemetry |
| Final video stills | **4 unique rasters** | 3 generated PNGs under job folder + 1 project asset PNG | storage paths |

### Where the numbers change

```text
4 narrative beats
    ↓  Presentation LLM emits visual_scenes (allowed: ai | asset)
4 visual_scenes  (3 ai + 1 asset)     ← fourth still chosen as ASSET, not AI
    ↓  syncLegacyFieldsFromVisualScenes()
3 image_prompts                       ← asset scenes excluded from prompts
    ↓  video worker generateSceneImages
3 AI generations + 1 asset reuse      ← telemetry: generated=3; reused=1
    ↓  buildStoryboard(audio=22.2s)
5 beats mapped onto 4 scenes          ← last scene reused for overflow beat
                                          (does NOT create a 5th image)
```

**Nothing “deleted” a fourth AI prompt after it existed.** The package never had four AI prompts.

---

## 3. Complete scene mapping

| Scene ID | Role (narrative) | Storyboard beat(s) | Image / asset | Generated? | Reused? | Kind |
| --- | --- | --- | --- | --- | --- | --- |
| scene-1 | HOOK | beat-1 (~6.7s) | `…/68419281…/scene-scene-1.png` | **Yes** | No | AI still |
| scene-2 | SETUP | beat-2 (~4.8s) | `…/scene-scene-2.png` | **Yes** | No | AI still |
| scene-3 | ESCALATION | beat-3 (~3.7s) | `…/scene-scene-3.png` | **Yes** | No | AI still |
| scene-4 | RESOLUTION (+ overflow) | beat-4 + beat-5 (~10.1s incl. 1.5s tail) | Asset `7e250d64-ddcf-4649-921f-783d294a2b5b` → `…/source/7e250d64…/component-capture.png` | **No** | **Yes** | Existing product UI screenshot (`component_capture`, class `static`, product_role `product_ui`) |

### Why scene-4 is reused (not generated)

Persisted `visual_scenes[3]`:

```json
{
  "source": "asset",
  "asset_id": "7e250d64-ddcf-4649-921f-783d294a2b5b",
  "modify": "false",
  "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the resolution beat (seconds 17–22); …",
  "video_usage": "framed_laptop"
}
```

Code path:

1. Presentation schema allows `{ "source": "asset", "asset_id": "… from AVAILABLE ASSETS", … }` (`lib/ai/prompts/presentationGeneration.ts`).
2. `syncLegacyFieldsFromVisualScenes` copies **only** `source === "ai"` into `image_prompts` (`lib/content-package/visualScenePlan.ts:146–151`).
3. Worker `generateSceneImages` reuses scenes that already have durable `image_bucket`/`image_path`/`asset_id`; telemetry counts them as `reused` (`video-worker/services/images.ts`).

Asset created **2026-06-28** (project library), used_at **2026-07-23T22:41:09** when the package was persisted — not generated during this video job.

---

## 4. Image generation mapping

There is **one** Image generation telemetry step on the successful job (not three separate job rows):

| Field | Value |
| --- | --- |
| Step | `Image generation` |
| Model | `gpt-image-1` |
| Output summary | `generated=3; reused=1` |
| Duration | 87,654 ms |
| Stored cost | **$0.126** (= 3 × list still price) |
| Input | 4 scenes (3 to generate, 1 reuse) |

### Generated stills → scenes

| Generated file | Used by |
| --- | --- |
| `scene-scene-1.png` | scene-1 / beat-1 |
| `scene-scene-2.png` | scene-2 / beat-2 |
| `scene-scene-3.png` | scene-3 / beat-3 |

### Reused still → scenes

| Asset | Used by |
| --- | --- |
| `7e250d64-…/component-capture.png` | scene-4 / beat-4 + beat-5 |

Every generated image is used. No AI scene lacks a generation. No orphan generation.

---

## 5. Root cause

**Primary cause:** Presentation output chose a **4-scene plan with one `source:"asset"` resolution beat**. Downstream correctly generates only AI scenes.

**Secondary (not a generation count bug):** Worker storyboard expands to **5 beats** from audio length and **reuses scene-4 for the 5th beat**. That affects pacing, not image-generation count.

**Not the cause:**
- `sparse_plan_adjustment` (false)
- Cap truncation (`MAX_VIDEO_SCENE_STILLS = 5`; plan had 4)
- Failed TTS job (failed before images; successful retry generated 3)
- Accidental drop of a fourth `image_prompts` entry (never present)

---

## 6. Is this expected?

### **A) Expected behaviour**

Supported by:

| Proof | Detail |
| --- | --- |
| Package data | `visual_scenes.length === 4`, `image_prompts.length === 3`, one asset entry |
| Worker telemetry | `generated=3; reused=1` |
| Code | `syncLegacyFieldsFromVisualScenes` filters AI-only into prompts |
| History | On this project, jobs **with** an asset average **~3.4 AI gens**; jobs **without** average **~4.4**. Multiple prior jobs also show exactly `ai=3, asset=1` |

### Not B (regression) / Not C (hidden bug) for “only 3 gens”

The historical “4–5 images” intuition matches **all-AI packages**. Packages that bind a library screenshot intentionally pay for **one fewer** image generation. That design has been in production for weeks (asset inserts appear repeatedly from mid-July back).

Introducing mechanism (not a new break on this run):

- Typed / ordered `visual_scenes` with `source: "ai" | "asset"` — `lib/content-package/visualScenePlan.ts` (landed with video-quality work, e.g. `df803f4` era and later PPD refactors).
- Worker still-pool reuse of package-referenced assets — `buildRenderSpec` / `generateSceneImages` comments: reused stills “without any new image generation”.

---

## 7. Why the system was designed this way

1. **Cost cap:** ≤5 AI stills per video (`MAX_VIDEO_SCENE_STILLS`); assets are free extras relative to that gen budget.
2. **Product proof:** Real `component_capture` UI beats invented screenshots (PPD also forbids synthetic product UI).
3. **Single still pool:** Storyboard may have more beats than stills; beats **cycle/reuse** stills rather than spawning more gens.

Note: PPD on this package set `should_show_product_appearance: false` / `ABSTRACT_PRODUCT_SYSTEM`, while Presentation still emitted a real UI asset for RESOLUTION. That is a **separate product-presentation consistency question**; it does **not** change the arithmetic of why only three AI gens ran (asset still replaces an AI slot).

---

## 8. Quality impact

| Dimension | Effect of 3 AI + 1 asset |
| --- | --- |
| Visual diversity (AI looks) | Lower than a 4–5 all-AI package — three illustration looks only |
| Product clarity | **Higher** — real Fenrik UI on resolution |
| Pacing / storytelling | Weakness is **beat→scene mapping** (scene-4 held ~10s), not the missing AI gen |
| Perceived production quality | Mixed: real product shot helps credibility; long static hold + three similar flat illustrations can feel thin |

**Would one additional AI image improve the video?**

- **If it replaces the asset:** usually **no** (lose real product proof).
- **If it adds a 5th scene** (4 AI + 1 asset): **maybe** for mid-story variety, at +~$0.042 and more gen latency; does not fix the long last-scene hold unless beat mapping also changes.
- **Highest ROI for “feels thin”** on this run is fixing **5 beats → 4 scenes overflow** (pacing), not forcing a 4th AI gen.

---

## 9. Smallest possible fix

**If the goal is “always 4–5 AI gens”:** change Presentation policy so RESOLUTION cannot consume an asset slot when you still want N AI stills — e.g. require `min(image_prompts) = 4` even when an asset is attached (asset becomes a 5th scene). That is a **product/cost policy** change, not a bugfix.

**If the goal is “this run should look fuller” without extra spend:** fix storyboard mapping so overflow beats are not pinned to the last still (separate RCA). Generation count of 3 would remain correct.

**If the goal is PPD consistency:** prevent Presentation from inserting `source:"asset"` product UI when `should_show_product_appearance === false` — that would likely **increase** AI gens to 4 on packages like this (asset replaced by AI), which is the opposite of “why only 3” being a bug.

---

## Verdict

| Question | Answer |
| --- | --- |
| Why only three images generated? | Because only three scenes were `source:"ai"`; the fourth was a reused library asset. |
| Where did the fourth/fifth image disappear? | It didn’t. Fourth still = asset. Fifth image was never in the plan. |
| Expected? | **Yes.** |
| Bug? | **No** (for generation count). |
| Smallest fix for count? | None required unless product policy demands a higher minimum AI still count. |
