# Prompt Composition Forensic Audit — Run `88e3097d-9d4c-4c54-ae53-6eb11afcdb59`

Read-only. No fixes. No recommendations. Facts from DB + running implementation only.

**Companion:** full stored + reconstructed OpenAI prompt strings → [`prompt-composition-forensic-88e3097d-full-prompts.md`](./prompt-composition-forensic-88e3097d-full-prompts.md)

---

## Scope IDs

| Package | Package ID | Video job ID | Title |
|---|---|---|---|
| 1 | `07261aaf-8f91-452f-91df-6b588aaa1f62` | `0374e22b-90ca-448a-bfce-cb7896be7254` | The Call That Never Came |
| 2 | `910da853-4f62-4cad-ab00-071c3a73af45` | `12048376-4025-42e5-bda2-cd0f22c7dc74` | The In-House Quarter |
| 3 | `70e73521-5cee-4771-b39d-e6231c0122f7` | `5be8c819-cddf-4a53-9660-995d9b4891ae` | The Founder Who Stopped Being the Content Department |

---

## 1. Actual prompts

### What is persisted vs what is sent

| Layer | Location | Provenance |
|---|---|---|
| **Stored prompt (exact DB)** | `video_jobs.input.scenes[i].image_prompt` | Identical to `content_packages.package_brief.visual_scenes[i].image_prompt` after Creative Rebuild (`brief_match=True` for all 14 AI scenes) |
| **OpenAI request body `prompt`** | Built in worker at call time | `prepareImageSceneRaster` → join profile/medium suffixes → `sanitizeImagePrompt` → `OpenAIImageProvider.generateImage({ prompt })` → `POST .../images/generations` |

**Wire capture / worker stdout with full final prompt:** not in DB. Vercel runtime logs for this window unavailable (API 403).  
**Reconstruction:** deterministic replay of current `prepareImageSceneRaster` + `sanitizeImagePrompt` against the stored DB prompt. Lengths reported below as `final_reconstructed_len`.

### Lengths (all AI scenes)

| Pkg | Scene | `visual_source` | Stored chars (DB) | Final reconstructed chars | `composeRebuiltImagePrompt` ≡ stored |
|---|---|---|---|---|---|
| 1 | 1 | generated | **6059** | 6086 | YES (byte-identical) |
| 1 | 2 | generated | **5465** | 5572 | YES |
| 1 | 3 | generated | **5571** | 5678 | YES |
| 1 | 4 | generated | **5462** | 5569 | YES |
| 1 | 5 | generated | **5532** | 5639 | YES |
| 2 | 1 | generated | **5668** | 5957 | YES |
| 2 | 2 | generated | **5360** | 5611 | YES |
| 2 | 3 | generated | **5311** | 5562 | YES |
| 2 | 4 | generated | **5312** | 5563 | YES |
| 2 | 5 | generated | **5157** | 5408 | YES |
| 3 | 1 | generated | **6721** | 6763 | YES |
| 3 | 2 | generated | **6208** | 6250 | YES |
| 3 | 3 | generated | **6070** | 6112 | YES |
| 3 | 4 | generated | **6131** | 6081 | YES |
| 3 | 5 | **asset** | **158** | 574 | N/A — `composeRebuiltImagePrompt` not used |

Full strings: companion MD.

---

## 2. Reverse trace (AI scenes)

```
POST https://api.openai.com/v1/images/generations
  body.prompt
    ↑
OpenAIImageProvider.generateImage  (lib/ai/openai.ts)
    ↑
generateSceneImageWithModerationFallback.requestImageBytes
    ↑
sanitizeImagePrompt(promptWithProfile)  (video-worker/services/imagePrompt.ts)
    ↑
prepareImageSceneRaster:
  promptWithProfile = join(
    scene.image_prompt.trim(),
    visualProfileImagePromptSuffix(NATURAL),   // +98 chars when present
    visualMediumImagePromptSuffix(PHOTOGRAPHIC) // +72 chars when not already in prompt
  )  (video-worker/services/prepareImageSceneRaster.ts)
    ↑
scene.image_prompt from WorkerPayload / video_jobs.input.scenes[]
    ↑
resolveVisualPlanToRenderScenes: copies plan item.image_prompt → scene.image_prompt
  (lib/content-package/visualScenePlan.ts)
    ↑
compileVisualScenesToWorkerScenes → visualSceneToPlanItem(ai scene)
  (lib/scene-types/compileScenePlan.ts)
    ↑
buildVideoJobInput(pkg) after Creative Rebuild
  (lib/ai/workflows/packageShared.ts)
    ↑
pkg.visual_scenes[i] = { source: "ai", image_prompt: <composed> }
    ↑
rebuildCreativePackageForVideo → for each AI entry:
  composeRebuiltImagePrompt({ intent, directorNotes, anchors, isOpeningStill })
  (lib/creative-review/rebuildCreativePackage.ts)
    ↑
Arguments:
  intentDescription = creative_review.scenes[i].intent.localized_edit
  directorNotes     = creative_review.scenes[i].director_notes
  presentationType  = creative_review.scenes[i].intent.presentation_type
  anchors           = extractPriorPipelineArtifacts(package)
    ↑
extractPriorPipelineArtifacts reads:
  package_brief.presentation_generation.visual_identity
  package_brief.presentation_generation.opening_impact
  package_brief.presentation_generation.video_concept
  (lib/content-pipeline/regeneration.ts)
    ↑
Those objects were written earlier by runCreativePipeline:
  video_concept  ← LLM Video Concept step
  opening_impact ← LLM Opening Impact step
  visual_identity ← buildVisualIdentity({ concept, openingImpact })  [deterministic, no LLM]
  (lib/content-pipeline/runCreativePipeline.ts + visualIdentity.ts)
```

**Trigger for this run:** `continueCreativeReviewGeneration` @ `2026-08-12T13:19:43.791Z` called `rebuildCreativePackageForVideo` once per package (history: `creative_rebuild_completed`).

**`maxLength`:** optional on `composeRebuiltImagePrompt`; **not passed** for IMAGE AI rebuilds in this path. No truncation.

**`normalizeImagePrompts`:** caps array length to max stills; does not rewrite prompt text content.

---

## 3–4. Block breakdown + character accounting

Builder order is exactly `composeRebuiltImagePrompt` (`rebuildCreativePackage.ts` lines 128–151):

1. If `isOpeningStill` (first AI still only): Opening Impact header + `first_image` + emotion line + pacing line  
2. `visualIdentityPromptBlock(identity)`  
3. `videoConceptAnchorBlock(concept)`  
4. `continuityGuardBlock()`  
5. `SCENE N (TYPE) — CREATIVE INTENT:` + `localized_edit`  
6. If notes non-empty: Director Notes header + notes  

Join: `"\n".join(non-empty lines)` then `replace(/\n{3,}/g, "\n\n").trim()`.

### Package 1 · Scene 1 (opening) — stored **6059** ≡ sum **6059**

| Block | Source | Characters | % of prompt |
|---|---|---:|---:|
| B1 OPENING IMPACT header | literal in `composeRebuiltImagePrompt` | 70 | 1.155% |
| B2 `opening_impact.first_image` | `package_brief.presentation_generation.opening_impact.first_image` | 217 | 3.581% |
| B3 `opening_emotion:` line | `opening_impact.emotion` | 161 | 2.657% |
| B4 `pacing:` line | `opening_impact.pacing` | 149 | 2.459% |
| B5 VISUAL IDENTITY (full block) | `visualIdentityPromptBlock(presentation_generation.visual_identity)` | 2483 | 40.980% |
| B6 VIDEO CONCEPT (full block) | `videoConceptAnchorBlock(presentation_generation.video_concept)` | 2385 | 39.363% |
| B7 CONTINUITY GUARD | literal `continuityGuardBlock()` | 327 | 5.397% |
| B8 CREATIVE INTENT header | template `SCENE 1 (IMAGE) — CREATIVE INTENT:` | 34 | 0.561% |
| B9 CREATIVE INTENT body | `creative_review.scenes[0].intent.localized_edit` | 225 | 3.713% |
| JOIN_NEWLINES | `"\n".join` between blocks | 8 | 0.132% |
| **TOTAL** | | **6059** | **100%** |

Director notes: empty → block absent.

#### B5 VISUAL IDENTITY field split (sum 2475 + 8 newlines = 2483)

| Field | Characters |
|---|---:|
| header `VISUAL IDENTITY:` | 16 |
| `- art_direction: …` | 527 |
| `- lighting: …` | 229 |
| `- palette: …` | 234 |
| `- environment: …` | 347 |
| `- camera_style: …` | 380 |
| `- character_style: …` | 339 |
| `- opening_emotion: …` | 163 |
| `- opening_first_image: …` | 240 |
| newlines inside block (8) | 8 |
| **Block total** | **2483** |

#### B6 VIDEO CONCEPT field split (sum 2381 + 4 newlines = 2385)

| Field | Characters |
|---|---:|
| header | 60 |
| `- title: …` | 33 |
| `- core_idea: …` | 833 |
| `- emotional_tone: …` | 351 |
| `- narrative_arc: …` | 1104 |
| newlines inside block (4) | 4 |
| **Block total** | **2385** |

**Together B5+B6 = 4868 / 6059 = 80.34% of the opening prompt.**

### Package 1 · Scene 2 (non-opening) — stored **5465** ≡ sum **5465**

| Block | Source | Characters | % |
|---|---|---:|---:|
| B5 VISUAL IDENTITY | same anchors | 2483 | 45.435% |
| B6 VIDEO CONCEPT | same anchors | 2385 | 43.641% |
| B7 CONTINUITY GUARD | constant | 327 | 5.984% |
| B8 CREATIVE INTENT header | `SCENE 2 (IMAGE)…` | 34 | 0.622% |
| B9 CREATIVE INTENT body | `localized_edit` | 232 | 4.245% |
| JOIN_NEWLINES | | 4 | 0.073% |
| **TOTAL** | | **5465** | **100%** |

No Opening Impact section (only first AI still).

### All AI scenes — block sums verified

For every AI scene in this run: `sum(block_chars including JOIN_NEWLINES) == stored_len` and `composeRebuiltImagePrompt(args from package_brief) == stored` (byte-identical). Confidence on that equality: **100%** (machine-checked).

| Pkg | Scene | Stored | B5 VI | B6 VC | B7 CG | Intent body | Opening section | Join |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 6059 | 2483 | 2385 | 327 | 225 | 597 | 8 |
| 1 | 2 | 5465 | 2483 | 2385 | 327 | 232 | 0 | 4 |
| 1 | 3 | 5571 | 2483 | 2385 | 327 | 338 | 0 | 4 |
| 1 | 4 | 5462 | 2483 | 2385 | 327 | 229 | 0 | 4 |
| 1 | 5 | 5532 | 2483 | 2385 | 327 | 299 | 0 | 4 |
| 2 | 1 | 5668 | 1987 | 2503 | 327 | 265 | 582 | 8 |
| 2 | 2 | 5360 | 1987 | 2503 | 327 | 505 | 0 | 4 |
| 2 | 3 | 5311 | 1987 | 2503 | 327 | 456 | 0 | 4 |
| 2 | 4 | 5312 | 1987 | 2503 | 327 | 457 | 0 | 4 |
| 2 | 5 | 5157 | 1987 | 2503 | 327 | 302 | 0 | 4 |
| 3 | 1 | 6721 | 2728 | 2847 | 327 | 287 | 528 | 8 |
| 3 | 2 | 6208 | 2728 | 2847 | 327 | 268 | 0 | 4 |
| 3 | 3 | 6070 | 2728 | 2847 | 327 | 130 | 0 | 4 |
| 3 | 4 | 6131 | 2728 | 2847 | 327 | 191 | 0 | 4 |

Opening section = B1+B2+B3+B4 (+ their internal newlines already in those lengths).

---

## 5. Duplication audit

### A. Within a single opening prompt (proven string equality)

For every package scene 1:

| Duplicated content | Where (same prompt) | Times | Who appended |
|---|---|---|---|
| `opening_impact.first_image` text | B2 Opening Impact body **and** `VI.opening_first_image` inside B5 | **2** | (1) `composeRebuiltImagePrompt` `isOpeningStill` branch; (2) `visualIdentityPromptBlock` always includes `opening_first_image` |
| `opening_impact.emotion` text | B3 emotion line **and** `VI.opening_emotion` inside B5 | **2** | same pair of functions |

Proven: `opening_impact.first_image.strip() == visual_identity.opening_first_image` and emotions equal for all 3 packages.

Char cost of that double-include (opening scenes only):

| Package | first_image chars ×2 | emotion chars ×2 |
|---|---:|---:|
| 1 | 217 × 2 | 144 × 2 (line wrappers differ; payload text equal) |
| 2 | 248 × 2 | 84 × 2 |
| 3 | 196 × 2 | 93 × 2 |

### B. Cross-scene repetition (same package, every AI scene)

Same B5 / B6 / B7 blocks appended to **every** AI scene by `composeRebuiltImagePrompt` (no caching / once-per-package).

| Package | AI scenes | VI chars × N | VC chars × N | CG chars × N |
|---|---:|---:|---:|---:|
| 1 | 5 | 2483×5 = 12415 | 2385×5 = 11925 | 327×5 = 1635 |
| 2 | 5 | 1987×5 = 9935 | 2503×5 = 12515 | 327×5 = 1635 |
| 3 | 4 | 2728×4 = 10912 | 2847×4 = 11388 | 327×4 = 1308 |

### C. Historical origin overlap (not a second paste of the same block)

`buildVisualIdentity` copies `video_concept.visual_direction.*` into `visual_identity` fields (`art_direction`, `lighting`, `palette`, `environment`, `camera_style`, `character_style`).  

Verified for package 1: those six VI fields **equal** `video_concept.visual_direction` fields.  

`videoConceptAnchorBlock` does **not** emit `visual_direction`; it emits `title`, `core_idea`, `emotional_tone`, `narrative_arc`. So VI and VC blocks are different strings in the prompt, but VI’s prose originated from VC’s `visual_direction` at pipeline time.

### D. Not duplicated

- Creative Intent (`localized_edit`): once per scene  
- Director Notes: empty for all scenes in this run → absent  
- `video_concept.product_role` / `why_it_works` / `audience_insight` / `visual_direction`: **not** in prompt  
- `opening_impact.attention_pattern` / `first_spoken_sentence`: **not** in prompt  

---

## 6. Expansion audit (character growth)

### Proven jump (this run)

Creative Review intent lengths (editor `localized_edit`) → after `composeRebuiltImagePrompt`:

| Pkg | Scene | Intent chars | Stored prompt chars | Ratio |
|---|---|---:|---:|---:|
| 1 | 1 | 225 | 6059 | 26.9× |
| 1 | 2 | 232 | 5465 | 23.6× |
| 2 | 1 | 265 | 5668 | 21.4× |
| 3 | 1 | 287 | 6721 | 23.4× |
| 3 | 3 | 130 | 6070 | 46.7× |

**Single function that creates the ~6000-char string:** `composeRebuiltImagePrompt`.

### Pipeline stages after compose (this run)

```
creative_review.scenes[i].intent.localized_edit     ~130–505 chars
        ↓
composeRebuiltImagePrompt(...)                      → 5157–6721 chars   ← expansion happens HERE
        ↓
written to package_brief.visual_scenes[i].image_prompt
        ↓
normalizeImagePrompts                               (array cap only; text unchanged)
        ↓
buildVideoJobInput → compile → resolveVisualPlan    (copy same string → scenes[].image_prompt)
        ↓
video_jobs.input.scenes[i].image_prompt             identical (proven)
        ↓
prepareImageSceneRaster suffixes                    +98 NATURAL + optionally +72 PHOTOGRAPHIC + spaces
        ↓
sanitizeImagePrompt                                 length change (see § worker deltas)
        ↓
OpenAI body.prompt
```

**Pre-rebuild `image_prompt` lengths for these packages:** overwritten in `package_brief` by rebuild. **Nelze doložit** from current DB alone.

**Worker deltas (reconstruction, not wire log):**

| Example | Stored | After suffixes (combined) | After sanitize (final) |
|---|---:|---:|---:|
| Pkg1 scene1 | 6059 | 6231 | 6086 |
| Pkg1 scene2 | 5465 | 5637 | 5572 |
| Pkg3 scene4 | 6131 | 6303 | 6081 |

---

## 7. Object expansion

| Object | Whole object JSON dumped into prompt? | What is interpolated |
|---|---|---|
| `visual_identity` | **No** `JSON.stringify` | 8 string fields via `visualIdentityPromptBlock` template lines |
| `opening_impact` | **No** | `first_image`, `emotion`, `pacing` (opening still only) |
| `video_concept` | **No** | `title`, `core_idea`, `emotional_tone`, `narrative_arc` only |
| `presentation_generation` | **No** | only via `extractPriorPipelineArtifacts` field picks |
| `package_brief` | **No** | not stringified into image prompt |
| `creative_review` | **No** | only `localized_edit` / `director_notes` / `presentation_type` |

**Large field contribution (Pkg1 scene1):**

| Field path | Chars in prompt (payload line) |
|---|---:|
| `video_concept.narrative_arc` | 1104 (inside `- narrative_arc: …`) |
| `video_concept.core_idea` | 833 |
| `visual_identity.art_direction` | 527 |
| `visual_identity.camera_style` | 380 |
| `visual_identity.environment` | 347 |
| `visual_identity.character_style` | 339 |

These are long prose strings already stored on the package; the builder concatenates them with labels.

---

## 8. Serialization audit

| Pattern | In image-prompt path for this run? | Location |
|---|---|---|
| `JSON.stringify(...)` of anchors into image prompt | **No** | `JSON.stringify` appears in `buildRegenerationInstructionBlock` (regeneration LLM prompts), **not** in `composeRebuiltImagePrompt` |
| Template `` `${object}` `` coercing whole object | **No** | only `` `${concept.title}` `` etc. on string fields |
| Deep merge of objects into prompt string | **No** | |
| `structuredClone` of package | Yes, for package mutation — **does not** serialize into prompt text | `clonePackage` in rebuild |

Image prompt assembly is **string concatenation / `join("\n")` of labeled string fields only**.

---

## 9. Construction compare — Production vs Manual Review

### Production (reference job `416be873-…`, same project; scene prompts 312–428 chars)

```
Content Package LLM
  → visual_scenes[i].image_prompt   (short scene description written by model)
  → normalizeImagePrompts
  → buildVideoJobInput
  → compileVisualScenesToWorkerScenes / resolveVisualPlanToRenderScenes
  → scene.image_prompt (copy)
  → prepareImageSceneRaster (suffix + sanitize)
  → OpenAI
```

**Does not call** `composeRebuiltImagePrompt`.  
**Does not** prepend VISUAL IDENTITY / VIDEO CONCEPT / CONTINUITY / OPENING IMPACT blocks.

### Manual Review (this run)

```
Content Package LLM
  → (earlier short prompts exist, then overwritten)
  → Manual Creative Review edits localized_edit
  → Continue Generation
  → rebuildCreativePackageForVideo
  → composeRebuiltImagePrompt   ← ADDED vs production
       Opening Impact? + Visual Identity + Video Concept + Continuity + Intent (+ Notes)
  → normalizeImagePrompts
  → buildVideoJobInput → compile → scenes
  → prepareImageSceneRaster (suffix + sanitize)
  → OpenAI
```

Structural difference = **one function**: `composeRebuiltImagePrompt`, inserting frozen pipeline anchors into every AI scene prompt.

---

## 10. Final verdict (facts only)

```
Prompt length (example Pkg1 Scene1 stored)
  6059 characters
        ↓
component breakdown (exact)
  VISUAL IDENTITY block     2483  (40.98%)
  VIDEO CONCEPT block       2385  (39.36%)
  CONTINUITY GUARD           327  (5.40%)
  Opening Impact section     597  (9.85%)
  Creative Intent body       225  (3.71%)
  headers + join              42  (0.69%)
  SUM                       6059
        ↓
where every character came from
  package_brief.presentation_generation.{visual_identity,opening_impact,video_concept}
  + creative_review.scenes[i].intent.localized_edit
  + literals in composeRebuiltImagePrompt / continuityGuardBlock / visualIdentityPromptBlock
        ↓
where the expansion happened
  creative_review localized_edit (~225 chars)
    → composeRebuiltImagePrompt
    → 6059 chars
  Later stages copy / lightly modify; they do not create the ~6k body.
        ↓
which function caused it
  composeRebuiltImagePrompt
  (lib/creative-review/rebuildCreativePackage.ts)
  called from rebuildCreativePackageForVideo during Continue Generation
        ↓
confidence
  Stored prompt ≡ composeRebuiltImagePrompt(args from this package_brief): 100%
  Block character sums ≡ stored length: 100%
  Within-prompt Opening Impact / VI opening_* duplication: 100%
  Cross-scene VI/VC/CG repetition: 100%
  Exact final OpenAI wire body string: reconstructed from code, not captured —
    Nelze doložit z wire logu; rekonstrukce je deterministická dle aktuálního worker kódu.
```

### Explicit gaps

| Question | Status |
|---|---|
| Exact stored DB prompt text | Proven (DB) |
| Exact `composeRebuiltImagePrompt` authorship | Proven (byte match) |
| Exact OpenAI HTTP body as transmitted | **Nelze doložit** (no wire/worker full-prompt log); reconstructed only |
| Pre-Continue `image_prompt` lengths | **Nelze doložit** (overwritten in brief) |
| Per-scene which OpenAI attempt used which sanitized variant | **Nelze doložit** (no per-attempt prompt persistence) |

---

*Audit only. No code or data modified.*
