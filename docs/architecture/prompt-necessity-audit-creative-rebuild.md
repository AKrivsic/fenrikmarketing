# Prompt Necessity Audit — Creative Rebuild Prompt Builder

Read-only architectural audit. No implementation changes. No optimization. No shortening recommendations.

**Sources:**

- `docs/architecture/prompt-composition-forensic-88e3097d.md`
- `docs/architecture/prompt-composition-forensic-88e3097d-full-prompts.md`
- `lib/creative-review/rebuildCreativePackage.ts`
- `lib/content-pipeline/visualIdentity.ts`
- `lib/content-pipeline/types.ts`
- `scripts/check-creative-review-phase6.ts`
- `lib/content-pipeline/runCreativePipeline.ts`
- `lib/creative-review/types.ts` / validate / mutations

Character counts cited below refer to Package 1 Scene 1 of run `88e3097d` (stored prompt **6059** chars) unless noted.

---

## 1. Prompt Builder data flow (`composeRebuiltImagePrompt`)

### Module intent (file header)

```1:11:lib/creative-review/rebuildCreativePackage.ts
/**
 * Creative Review Rebuild Engine (Phase 6).
 *
 * Bridges Manual Review (Scene Creative Intent + Director Notes + final_approved
 * voiceover) into video-only package fields that the EXISTING buildVideoJobInput
 * / worker path already understands.
 *
 * Isolated from UI and Continue orchestration logic. Deterministic — no LLM,
 * no second pipeline, no worker changes. Visual Identity / Opening Impact /
 * Video Concept are frozen anchors, never replaced.
 */
```

### Inputs → origin → storage → why passed

| Input | Origin | Created by | Stored at | Why passed to builder |
|---|---|---|---|---|
| `anchors.visualIdentity` | Content pipeline | `buildVisualIdentity({ concept, openingImpact })` (deterministic) | `package_brief.presentation_generation.visual_identity` | Phase 6: frozen visual treatment; `resolveAnchors` **requires** it; `validateRebuiltAiPrompt` requires `art_direction` substring in result |
| `anchors.openingImpact` | Content pipeline | LLM `runOpeningImpact` | `package_brief.presentation_generation.opening_impact` | Phase 6: frozen cold-open still; required by `resolveAnchors`; opening still must contain `first_image` (`validateRebuiltAiPrompt`) |
| `anchors.videoConcept` | Content pipeline | LLM `runVideoConcept` | `package_brief.presentation_generation.video_concept` | Phase 6: frozen narrative/concept anchor; required by `resolveAnchors`; `videoConceptAnchorBlock` always emitted; Phase 6 check asserts `/VIDEO CONCEPT/` |
| `intentDescription` | Manual Creative Review | Editor edit of Scene Creative Intent (`localized_edit`); seeded/translated earlier | `package_brief.creative_review.scenes[i].intent.localized_edit` | Rebuild refuses empty Intent; this is the scene-specific human instruction that replaces the old AI `image_prompt` |
| `directorNotes` | Manual Creative Review | Editor `director_notes` | `package_brief.creative_review.scenes[i].director_notes` | Optional presentation/framing guidance; included **only if non-empty** |
| `presentationType` | Creative Review scene intent | Seeded from package scene type / editor | `creative_review.scenes[i].intent.presentation_type` | Only used for header label `SCENE N (TYPE)` |
| `isOpeningStill` | Rebuild loop flag | First AI/generated IMAGE still in package (`openingStillAssigned`) | Runtime only | Gates Opening Impact section; only first AI still |
| `sceneIndex` | Loop index | Rebuild over `visual_scenes` | Runtime | Header `SCENE ${index+1}` |
| `maxLength` | Optional | Callers | — | **Not passed** for IMAGE AI rebuilds in this path; truncation path unused for those scenes |

### Call site architecture

```
continueCreativeReviewGeneration
  → rebuildCreativePackageForVideo   (before any video job)
      → resolveAnchors(pkg)          // fail closed if VI/OI/VC missing
      → for each visual_scenes[i] AI:
          composeRebuiltImagePrompt(...)
          validateRebuiltAiPrompt(...)  // art_direction; opening first_image
          write visual_scenes[i].image_prompt
      → syncLegacyFieldsFromVisualScenes / normalizeImagePrompts
  → buildVideoJobInput → worker scenes[].image_prompt (copy)
  → prepareImageSceneRaster → OpenAI Images
```

Worker does **not** re-run Phase 6 composition. It only adds visual profile/medium suffixes + `sanitizeImagePrompt`.

---

## 2. Block-level audits

### Visual Identity

| Question | Answer (implementation) |
|---|---|
| Odkud vzniká | `buildVisualIdentity`: copies `video_concept.visual_direction.*` + echoes Opening Impact emotion/`first_image` |
| Kdo generuje | Deterministic function after Video Concept + Opening Impact (`runCreativePipeline`) — **no LLM** |
| Účel (dokumentovaný) | Types: persisted for Visual Identity → image generation. File comment on VI: assemble from concept + opening without a separate creative LLM. Phase 6: frozen anchor, never replaced; must remain present (`validateRebuiltAiPrompt` checks `art_direction`) |
| Co builder používá | Celý objekt přes `visualIdentityPromptBlock` — všech 8 string polí |
| Co image prompt obsahuje | Header + art_direction, lighting, palette, environment, camera_style, character_style, opening_emotion, opening_first_image |

**Kde jinde se VI používá:** Content Package LLM prompt dostává `JSON.stringify(visualIdentity)` (`contentPackage.ts`) při **původní** generaci balíčku. Po Manual Review rebuild je `visualIdentityPromptBlock` v kódu volán **pouze** z `composeRebuiltImagePrompt` (jediný call site).

### Opening Impact

| Question | Answer |
|---|---|
| Odkud vzniká | LLM step `runOpeningImpact` |
| Účel v pipeline | Cold open: first image, first spoken sentence, emotion, pacing, attention_pattern; drives hook / `alignOpeningVoiceover` |
| Co builder používá | Pouze při `isOpeningStill`: `first_image`, `emotion`, `pacing` |
| Co image prompt obsahuje | Sekce `OPENING IMPACT…` + tři hodnoty výše |
| Co builder **nepoužívá** | `first_spoken_sentence`, `attention_pattern` |

`first_spoken_sentence` se v rebuildu používá mimo image prompt (`alignOpeningVoiceover` / hook).

### Video Concept

| Question | Answer |
|---|---|
| Odkud vzniká | LLM `runVideoConcept` |
| Účel v pipeline | Narrative concept + `visual_direction` hints for VI assembly + Content Package |
| Co builder používá | `videoConceptAnchorBlock`: `title`, `core_idea`, `emotional_tone`, `narrative_arc` |
| Co image prompt obsahuje | Tyto čtyři pole s labely |
| Co builder **nepoužívá** | `audience_insight`, `product_role`, `why_it_works`, `visual_direction` (ten už je ve Visual Identity) |

Phase 6 check asserts prompt obsahuje `/VIDEO CONCEPT/`. Object must exist (`resolveAnchors`).

### Continuity (`continuityGuardBlock`)

| Question | Answer |
|---|---|
| Odkud vzniká | Hard-coded literal in `rebuildCreativePackage.ts` — **not** from package_brief |
| Účel (text bloku) | Mandatory visual consistency; preserve environment/people/lighting; never weaken Visual Identity; no readable on-image text unless UI chrome |
| Kdo ho vyžaduje | Builder always pushes it; Phase 6 check asserts `/VISUAL CONSISTENCY/` |
| Persistovaná data | Žádná — konstanta |

### Creative Intent

| Question | Answer |
|---|---|
| Odkud vzniká | Manual Review `scenes[i].intent.localized_edit` (editor; seeded from package / AI intent conversion) |
| Účel | Human-editable „what this scene should communicate“; UI must not expose `image_prompt` (Phase 6 check) |
| Proč v builderu | Rebuild **fails** if empty; this is the scene-specific content that replaces prior technical `image_prompt` |
| Co prompt obsahuje | Header `SCENE N (TYPE) — CREATIVE INTENT:` + body |

### Director Notes

| Question | Answer |
|---|---|
| Odkud vzniká | `scenes[i].director_notes` |
| Účel (kód) | „presentation / composition / framing only“; for assets → `modify` instead of image_prompt |
| V image promptu | Only if `trim()` non-empty |
| Run `88e3097d` | All director_notes empty → **block absent** for all scenes |

---

## 3. Field-by-field matrix

### Visual Identity fields

| Pole | Použito v image promptu | Proč (implementace) | Kde |
|---|---|---|---|
| `art_direction` | YES | Copied from `video_concept.visual_direction`; **validated** must appear in rebuilt prompt | `visualIdentityPromptBlock` + `validateRebuiltAiPrompt` |
| `lighting` | YES | Same VI assembly; always serialized | `visualIdentityPromptBlock` |
| `palette` | YES | Same | same |
| `environment` | YES | Same | same |
| `camera_style` | YES | Same | same |
| `character_style` | YES | Same | same |
| `opening_emotion` | YES | Echo from Opening Impact (`buildVisualIdentity`); types: „for later image-gen wiring“ | VI block **every** scene |
| `opening_first_image` | YES | Echo from Opening Impact first_image; same type comment | VI block **every** scene |

Žádná pole „brand values / audience / tone“ jako samostatné klíče na `VisualIdentity` **neexistují** v typu.

### Opening Impact fields

| Pole | Použito v image promptu | Proč | Kde jinde |
|---|---|---|---|
| `first_image` | YES (opening still only) + echo in VI | Cold-open still; validated on opening rebuild | Also → VI.opening_first_image |
| `emotion` | YES (opening still) + echo in VI | Opening section + VI.opening_emotion | VI |
| `pacing` | YES (opening still only) | Always appended in `isOpeningStill` branch | Not elsewhere in image path |
| `first_spoken_sentence` | **NO** | — | Hook / `alignOpeningVoiceover` / VO |
| `attention_pattern` | **NO** | — | Persisted artifact; Opening Impact LLM schema; **not** consumed by rebuild image builder |

### Video Concept fields

| Pole | Použito v image promptu | Proč | Kde jinde |
|---|---|---|---|
| `title` | YES | `videoConceptAnchorBlock` | Package title / concept consumers |
| `core_idea` | YES | Same block | Content Package / memory fingerprints |
| `emotional_tone` | YES | Same | Package generation context |
| `narrative_arc` | YES | Same | Package generation context |
| `audience_insight` | **NO** | — | Upstream Opening Impact / Concept prompts; persisted |
| `product_role` | **NO** | — | Concept prompts; persisted (≠ asset `product_role`) |
| `why_it_works` | **NO** | — | Concept prompts; persisted |
| `visual_direction.*` | **NO directly** | Used to **build** Visual Identity earlier | `buildVisualIdentity` → VI fields that **are** in prompt |

### Continuity / Intent / Notes

| Položka | Použito v image promptu | Proč | Kde |
|---|---|---|---|
| Continuity 4 bullet lines | YES always | Hard-coded; Phase 6 asserts present | `continuityGuardBlock` |
| Intent `localized_edit` | YES | Required for rebuild | Creative Review |
| Intent `presentation_type` | Header only | Label in `SCENE N (TYPE)` | Creative Review |
| Director notes body | Conditional | Framing-only; omitted if empty | Creative Review |

---

## 4. Functional dependency audit

| Položka | Image model | Video worker (non-image) | Other pipeline | Historický / pouze persist |
|---|---|---|---|---|
| VI art/lighting/palette/environment/camera/character | YES (via rebuilt prompt) | No direct | Content Package LLM at original gen | — |
| VI opening_emotion / opening_first_image | YES (via prompt) | No | Built for „image-gen wiring“ | Echo of OI |
| OI first_image / emotion / pacing | YES (opening prompt) | No | OI → VI | — |
| OI first_spoken_sentence | No | TTS/VO path via aligned voiceover/hook | alignOpeningVoiceover | — |
| OI attention_pattern | No | No | Stored; Opening Impact generation | Persist only for rebuild image path |
| VC title/core_idea/emotional_tone/narrative_arc | YES (via prompt) | No | Original package gen / regeneration context | — |
| VC audience_insight / product_role / why_it_works | No | No | Concept→Opening prompts; persist | **Unused by image rebuild** |
| VC visual_direction | No as block | No | Input to `buildVisualIdentity` | Consumed earlier |
| Continuity literals | YES (prompt text) | No | — | Implementation-added constant |
| Creative Intent | YES | No | Review UI / approve gate | — |
| Director Notes | YES if set | Asset `modify` path | Review UI | — |

---

## 5. Prompt relevance (implementation-grounded)

Classification rules used here:

- **REQUIRED** — rebuild fails without it, or validator requires it in the prompt string, or builder+Phase 6 tests mandate the block.
- **SUPPORTING** — always included by builder; no separate field validator; exists to steer the image model.
- **OPTIONAL** — included only when present/non-empty.
- **UNUSED** — exists on the artifact but **not** written into the image prompt by this builder.

| Položka | Class | Důvod (implementace) |
|---|---|---|
| Creative Intent `localized_edit` | **REQUIRED** | Empty → rebuild error „Creative Intent is required“ |
| VI `art_direction` | **REQUIRED** | `validateRebuiltAiPrompt` fails if missing from prompt |
| OI `first_image` (opening still) | **REQUIRED** | Same validator for opening scenes; Phase 6 asserts it |
| Anchors VI / OI / VC objects | **REQUIRED** | `resolveAnchors` fail-closed |
| VI lighting/palette/environment/camera/character | **SUPPORTING** | Always serialized; no per-field prompt validator |
| VI opening_emotion / opening_first_image | **SUPPORTING** (duplicative on opening) | Always in VI block; types claim image-gen wiring |
| OI emotion / pacing (opening) | **SUPPORTING** | Always in opening branch; not separately validated |
| VC title/core_idea/emotional_tone/narrative_arc | **SUPPORTING** | Always in `videoConceptAnchorBlock`; Phase 6 asserts block header |
| Continuity block | **SUPPORTING** | Always appended; Phase 6 asserts `/VISUAL CONSISTENCY/` |
| Director Notes | **OPTIONAL** | Only if non-empty |
| OI `first_spoken_sentence` | **UNUSED** (image prompt) | Used for VO/hook, not image builder |
| OI `attention_pattern` | **UNUSED** (image prompt) | Not referenced in rebuild composer |
| VC `audience_insight` / `product_role` / `why_it_works` | **UNUSED** (image prompt) | Not in `videoConceptAnchorBlock` |
| VC `visual_direction` | **UNUSED** as prompt block | Consumed earlier into VI |

---

## 6. Duplication audit

| Information | Sources in same prompt | Why twice (code) | Who inserted |
|---|---|---|---|
| Opening `first_image` text | Opening Impact section **and** `VI.opening_first_image` | `buildVisualIdentity` echoes OI into VI; composer then emits OI section **and** full VI block | `buildVisualIdentity` + `composeRebuiltImagePrompt` + `visualIdentityPromptBlock` |
| Opening `emotion` text | Opening emotion line **and** `VI.opening_emotion` | Same echo pattern | Same |
| Visual treatment (art/light/…) | Only in VI block | Not duplicated as VC.visual_direction in prompt | — |
| Cross-scene VI / VC / Continuity | Same blocks on **every** AI scene | Composer has no „once per package“ path; each scene rebuild is independent | `composeRebuiltImagePrompt` per scene |
| Continuity „never weaken Visual Identity“ vs VI block | Instructional overlap (meta vs content) | Continuity is imperative; VI is content | `continuityGuardBlock` + VI |

---

## 7. Dependency graph

```
Video Concept (LLM)
  ├─ visual_direction ──► buildVisualIdentity ──► Visual Identity
  │                                              │
  ├─ title, core_idea, emotional_tone,          │
  │   narrative_arc ────────────────────────────┼──► videoConceptAnchorBlock ──┐
  │                                              │                              │
  └─ (audience_insight, product_role,            │                              │
       why_it_works) ──► other pipeline only     │                              │
                                                 │                              │
Opening Impact (LLM)                             │                              │
  ├─ first_image, emotion ──► Visual Identity    │                              │
  │   (echo fields)                              │                              │
  ├─ first_image, emotion, pacing ──► Opening    │                              │
  │   section (isOpeningStill only) ─────────────┼──────────────────────────────┤
  ├─ first_spoken_sentence ──► VO / hook         │                              │
  │   (NOT image prompt)                         │                              │
  └─ attention_pattern ──► persist only          │                              │
                                                 ▼                              │
                                        visualIdentityPromptBlock ──────────────┤
                                                 │                              │
Manual Creative Review                           │                              │
  ├─ intent.localized_edit ──────────────────────┼──────────────────────────────┤
  └─ director_notes (optional) ──────────────────┼──────────────────────────────┤
                                                 │                              │
                              continuityGuardBlock (literal) ───────────────────┤
                                                 │                              │
                                                 ▼                              ▼
                                    composeRebuiltImagePrompt ──────────────────┘
                                                 │
                                                 ▼
                                    visual_scenes[].image_prompt
                                                 │
                                                 ▼
                                    buildVideoJobInput → worker → OpenAI Images
```

**Závislosti:**

- Visual Identity **závisí** na Video Concept.visual_direction + Opening Impact (emotion/first_image).
- Opening section **závisí** na Opening Impact + `isOpeningStill`.
- Video Concept block **nezávisí** na Intent; Intent **nezávisí** na anchors (ale rebuild vyžaduje obojí).
- Continuity **nezávisí** na datech balíčku.

---

## 8. Architectural intent (Phase 6)

| Block | Intent classification | Evidence |
|---|---|---|
| Visual Identity in rebuild prompt | **Explicitly required by Phase 6** | File header „frozen anchors, never replaced“; `resolveAnchors` required; `validateRebuiltAiPrompt` art_direction; Phase 6 check „non-opening scenes still preserve Visual Identity“ |
| Opening Impact in opening prompt | **Explicitly required by Phase 6** | Validator for opening `first_image`; Phase 6 asserts opening image text; `isOpeningStill` design |
| Video Concept block | **Explicitly required by Phase 6 tests / implementation** | Always emitted; Phase 6 asserts `/VIDEO CONCEPT/`; anchor required. Field subset (4 of 8) is **implementation choice** inside Phase 6 module |
| Continuity guard | **Implementation-added inside Phase 6 module** | Hard-coded; asserted by Phase 6 check; not a package_brief field |
| Creative Intent | **Explicitly required by Phase 6** | Core bridge purpose of Phase 6; empty Intent fails rebuild; UI must not expose image_prompt |
| Director Notes | **Explicitly supported by Phase 6** | Optional; Phase 6 check „Scene Intent + Director Notes rebuild AI image_prompt“ |
| Echo of OI into VI then both into prompt | **Derived from earlier pipeline + Phase 6 reuse of `visualIdentityPromptBlock`** | `types.ts` „Echoed from Opening Impact for later image-gen wiring“; composer calls full `visualIdentityPromptBlock` without stripping echo fields |
| Including VC `narrative_arc` / `core_idea` prose wholesale | **Implementation of Phase 6 composer** | `videoConceptAnchorBlock` lists those fields; no separate Phase doc found that mandates full narrative_arc in every still. **Nelze doložit** external Phase-6 product brief beyond this module + checks |

---

## 9. Final matrix

Character counts = Package 1 Scene 1 (opening) from forensic audit.

| Block | Characters | Purpose (stated in code) | Actually used (image path) | Required by architecture (Phase 6 evidence) | Required by implementation |
|---|---:|---|---|---|---|
| Opening Impact section | 597 | Authoritative cold open for first still | YES (opening only) | YES — opening first_image validated | YES — `isOpeningStill` branch |
| Visual Identity | 2483 | Frozen visual treatment; never weaken | YES — all 8 fields | YES — frozen anchor + art_direction check | YES — always `visualIdentityPromptBlock` |
| Video Concept | 2385 | Frozen concept — do not invent new concept | YES — 4 fields only | YES as object; field subset = module implementation | YES — always `videoConceptAnchorBlock` |
| Continuity | 327 | Mandatory visual consistency instructions | YES — literal | Asserted by Phase 6 check | YES — always appended |
| Creative Intent | 259 (hdr+body) | Editor scene meaning → replace old prompt | YES | YES — Phase 6 bridge | YES — required non-empty |
| Director Notes | 0 (this run) | Framing-only notes | Conditional | Supported | OPTIONAL |
| Join newlines | 8 | String join | YES | n/a | YES |
| **Total stored** | **6059** | | | | |

---

## 10. Final verdict

### Proč má dnešní Prompt Builder přibližně 6000 znaků?

Protože Phase 6 funkce `composeRebuiltImagePrompt` **nesestavuje** image prompt jen z Creative Intent (~225 znaků v Pkg1 Scene1), ale **povinně slepí** k němu celá frozen-anchor těla:

1. **Visual Identity (~41%)** — existuje, protože Phase 6 deklaruje VI jako frozen anchor, který se nesmí nahradit/zeslabit; implementace to vynucuje vložením celého `visualIdentityPromptBlock` (včetně všech polí z `visual_direction` + echo Opening Impact) do **každé** AI scény a validací přítomnosti `art_direction`.

2. **Video Concept (~39%)** — existuje, protože Phase 6 vyžaduje Video Concept jako frozen anchor a composer vždy vloží `videoConceptAnchorBlock` s dlouhými poli `core_idea` a `narrative_arc` (plus title, emotional_tone). Object musí existovat (`resolveAnchors`); Phase 6 test kontroluje přítomnost bloku.

3. **Opening Impact (~10% na první AI scéně)** — existuje, protože první AI still má nést authoritative cold open (`isOpeningStill`); `first_image` je validovaný. Emotion/pacing jdou se stejnou větví.

4. **Continuity (~5%)** — existuje jako pevná instrukce v Phase 6 builderu („never weaken Visual Identity“ + consistency); Phase 6 check ji assertuje.

5. **Creative Intent (~4%)** — existuje, protože to je lidský vstup Manual Review, kvůli kterému Phase 6 rebuild vůbec je; bez něj rebuild selže.

6. **Director Notes (0% v tomto běhu)** — architektonicky podporované, v `88e3097d` prázdné.

Délka ~6000 tedy **není** samostatný „timeout bug“ ve workeru; je **přímý důsledek** Phase 6 designu „Intent + full frozen anchors (VI + VC [+ OI on open] + continuity)“ bez zkrácení (`maxLength` se u IMAGE AI rebuildů nepředává).

Každé tvrzení výše je doloženo buď:

- module header / validators / Phase 6 checks, nebo  
- forenzním byte-match auditem `composeRebuiltImagePrompt` ≡ `video_jobs.input.scenes[].image_prompt`.

---

*Audit only. No code or data modified.*
