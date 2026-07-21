# Decision Audit — Production Run `7628340e-d785-4383-bd23-7a0e630247e7`

_Read-only. Generated 2026-07-12T18:13:19.149Z._

## Executive summary (one page)

**Voice:** All videos use `alloy` because `knowledge.presentation` is empty (UI “Default (alloy)”): `resolveVoice()` never entered the Automatic/deterministic branch (`preferred_voice === 'auto'`). This is **legacy_default_alloy**, not automatic selection. If Automatic were saved, this project would resolve to **shimmer** per `deterministicOpenAiTtsVoice()`, not alloy.

**Visual profile:** **EDITORIAL** from **AUTO hash** (resolveVisualProfileAuto → source `auto`), not UI override, not DEFAULT NATURAL. Same project always gets the same profile until signals/override change.

**Scene types:** LLM output is legacy IMAGE-only `{source,ai,image_prompt}` for all scenes. **Not** analyzer suppression — typed types were never requested (`requested_*_count: 0`). CHECKLIST/CTA were in **persisted** `prompt_presentation_types`; PHONE/QUOTE/STATISTIC were **not_in_prompt_ceiling** (no mobile signal, no proof candidates). Prompt text explicitly encourages IMAGE-first.

**Semantic motion:** Active but **role labels** (`observation`, `meaning`, …) are **not** mapped in `roleDefaultIntent()` → default **EXPLAIN**. Fifth beat reusing `scene-1` is **working_as_designed** (`sceneIdForStoryboardBeat` with `explicit_scene_order` and 4 scenes / 5 beats).

**History / analyzer:** History loaded (12 prior packages) but **empty special-type history** (prior packages IMAGE-only). Analyzer = **IMAGE pass-through only** — no typed validation exercised.

## Part 1 — Voice decision audit

### Project signals

```json
{
  "knowledge_presentation": {},
  "voice_ui_selection": "",
  "ui_empty_means": "Default (alloy) — preferred_voice deleted on save",
  "project_language": "en",
  "tone_of_voice": {
    "notes": [
      "Conversational and direct",
      "Relatable and empathetic to everyday work frustrations",
      "Concise — short sentences, minimal fluff",
      "Slightly informal with occasional emoji use",
      "Confident without being aggressive",
      "Practical",
      "Results-oriented",
      "Avoids marketing jargon"
    ]
  }
}
```

### Resolver branches (code)

1. `preferred_voice` set and not `auto` → explicit voice (`normalizeOpenAiTtsVoice`)
2. `preferred_voice === 'auto'` OR `voice_selection === 'deterministic'` → `deterministicOpenAiTtsVoice({ projectId, language })`
3. Else → `DEFAULT_OPENAI_TTS_VOICE` (`alloy`)

**Branch executed for Fenrik Studio:** `legacy_default_alloy`
- Code: lib/voice/resolveTtsOptions.ts → resolveVoice(): final return DEFAULT_OPENAI_TTS_VOICE ('alloy')
- No presentation.preferred_voice and no deterministic mode — legacy default, not Automatic resolver.
- Project resolver output: `alloy`
- Hypothetical Automatic output: `shimmer`

### Per-video

| video_job_id | tts_voice (input) | category | automatic executed? | source job inherit? |
| --- | --- | --- | --- | --- |
| 40fb807c-f8f2-4296-bf37-01dfda20886e | alloy | legacy_default_alloy | no | no |
| 6b49235a-5da7-49d1-8a77-b03b6cc2dee9 | alloy | legacy_default_alloy | no | no |
| 50d6bec6-839e-4b47-acbd-fc4066e80123 | alloy | legacy_default_alloy | no | no |

### Primary questions — Voice

- **Was alloy deliberate automatic selection?** No — **legacy_default_alloy** (configuration_missing: no presentation block).
- **Was automatic resolver executed?** No. Would select `shimmer` if UI saved Automatic.
- **Resolver uses funnel/creative mode/topic/emotion/format?** **No** — only `projectId`, `language`, `knowledge.presentation` (`lib/voice/resolveTtsOptions.ts`).
- **Resolved per:** project (+ language for deterministic). Stamped once on `video_jobs.input` via `attachTtsToVideoJobInput` — same for all packages in run.
- **Can two videos differ in voice today?** Only via explicit per-job `tts_voice` on retry/source merge (`mergeTtsIntoJobInput` prefers source job) — **not used in this run**.
- **UI "Automatic":** Persists `preferred_voice: "auto"` → deterministic branch (`presentationSettings.ts`).
- **UI "Default (alloy)" / cleared:** Deletes `preferred_voice` → legacy alloy — **not** the same as Automatic.
- **Stable project voice + per-video delivery instructions:** Would need explicit preferred voice OR deterministic auto **plus** separate instruction channel (already: `tts_instructions` from tone / custom); dynamic per-video voice would need new resolver inputs (funnel, creative_mode, etc.) — **not implemented**.

## Part 2 — Visual Profile decision audit

### Raw & normalized signals
```json
{
  "ui_visual_profile": "auto",
  "knowledge_presentation_visual_profile": null,
  "knowledge_presentation_visual_style": null,
  "goal_type": "lead_generation",
  "auto_hash_seed": "163c1822-ad30-4cee-8826-dfacd9c188b9::lead_generation::conversational and direct relatable and empathetic to everyday work frustrations concise — short sentences, minimal fluff slightly informal with occasional emoji use confident without being aggressive practical results-oriented avoids marketing jargon::SaaS companies and AI tool makers needing social content|Agencies, consultants, and freelancers|Ecommerce brands and local businesses::First content package delivered free with no payment required|Uses client's own website URL as the sole input to create content|Each video includes captions and posts for all major social channels|Scalable packages: 5 videos ($199), 10 videos ($349), 20 videos ($599)::A content production service that turns websites or products into ready-to-post social content|Delivers short-form AI videos for TikTok, Instagram, Facebook, LinkedIn, and YouTube Shorts|Provides platform-ready captions, posts, and hashtags for every channel",
  "auto_hash_candidates": [
    "NATURAL",
    "MINIMAL",
    "BOLD",
    "EDITORIAL",
    "PREMIUM"
  ],
  "auto_hash_selected": "EDITORIAL",
  "resolved": {
    "profile": "EDITORIAL",
    "source": "auto",
    "version": "visual-profile@1"
  }
}
```


### Why EDITORIAL?

- Explicit override: **no** (`visualProfileOverrideFromKnowledge` → auto)
- Brand style override: **no**
- Package snapshot at project resolution: **n/a** (computed at generation via `resolveVisualProfileForPackage({ project })`)
- **AUTO branch:** `stableHash(seed) % 5` → **EDITORIAL** for this seed (not `DEFAULT_VISUAL_PROFILE` NATURAL)
- **Semantic vs hash:** Resolver is **deterministic hash** over projectId + goal + tone + audience + product snippets — not LLM semantic matching.
- **Stable across videos:** Yes — same profile for all packages/jobs in run; frozen in `presentation_generation` / job input.
- **Per-package/video variation:** None in resolver; only override or package snapshot could differ (not this run).

### EDITORIAL effects this run

```json
{
  "image_prompt_block_in_generation": "PROJECT VISUAL PROFILE (EDITORIAL — treatment only, never copy or claims):\n- Editorial photography, controlled composition, refined framing, subtle color treatment.\n- Apply this to lighting, composition and mood only.\n- Do NOT change product facts, features, environments, or messaging.\n- Do NOT add luxury positioning, fake UI, or readable text.\n- Scene meaning and Project Brain truth constraints still override style.",
  "worker_suffix_style": "Editorial photography, controlled composition, refined framing, subtle color treatment.",
  "typed_renderers": "N/A — no CHECKLIST/PHONE/QUOTE/STATISTIC/CTA rendered",
  "motion_modifier": "EDITORIAL remaps EXPLAIN drift_* → pan_left/pan_right (resolveSceneMotion applyProfileMotionTuning)"
}
```

- **Executed:** IMAGE prompts include Editorial photography language (LLM + block); semantic motion primitive tuning applied in worker.

## Part 3 — Scene Type generation decision audit

### Project ceiling (deriveAllowedSceneTypes)
```json
{
  "allowed_ceiling_now": [
    "IMAGE",
    "CHECKLIST",
    "CTA"
  ],
  "prompt_types_recomputed_now": [
    "IMAGE"
  ],
  "checklist_allowlist_status": "not_allowlisted",
  "proof": {
    "hasQuoteCandidates": false,
    "hasStatisticCandidates": false
  },
  "mobileProductCapable": false,
  "note": "Use persisted prompt_presentation_types per package as ground truth for what LLM saw at generation time."
}
```


```json
{
  "presentation_prompt_excerpt_policy": [
    "PRESENTATION (visual beat types — narrative first, presentation second):",
    "",
    "Scene Types are sparse tools across your content calendar — not recurring templates.",
    "IMAGE is the default and may dominate many videos in a row.",
    "Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA merely for variety.",
    "",
    "Order of work:",
    "1. Write the narrative and voiceover.",
    "2. Break it into meaningful visual beats (visual_scenes).",
    "3. Choose the most natural presentation for each beat.",
    "",
    "Allowed presentation types for this project: IMAGE, CHECKLIST, CTA.",
    "",
    "IMAGE is the default presentation type.",
    "Use IMAGE when one strong visual can communicate the beat clearly.",
    "It is valid and often preferable for EVERY scene to be IMAGE.",
    "",
    "Do not alternate scene types for visual variety or pacing.",
    "There is no quota for CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA.",
    ""
  ]
}
```

_(Full block rebuilt from types IMAGE,CHECKLIST,CTA — matches persisted packages.)_

### Package: The Tab They Close Before They Contact You (`f340d775-4d4d-4484-a1a5-e0ea8d77358b`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "project_id": "163c1822-ad30-4cee-8826-dfacd9c188b9",
  "visual_profile": "EDITORIAL",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "downgraded_cta_count": 0,
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "visual_profile_version": "visual-profile@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "checklist_allowlist_status": "allowlisted",
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE RESTRAINT (project content history):\n- Scene Types are sparse presentation tools, not recurring templates.\n- IMAGE is the default and may dominate many videos in a row.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Prefer IMAGE when recent packages already used a special layout.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid and often preferred.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 5× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | N | N | N | partial | N | n/a | N | 0 |
| QUOTE | N | N | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: The Last-Minute Platform Panic (`55ea2ac0-7d35-46a6-ba65-95ad96c9898c`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "project_id": "163c1822-ad30-4cee-8826-dfacd9c188b9",
  "visual_profile": "EDITORIAL",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "downgraded_cta_count": 0,
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "visual_profile_version": "visual-profile@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "checklist_allowlist_status": "allowlisted",
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE RESTRAINT (project content history):\n- Scene Types are sparse presentation tools, not recurring templates.\n- IMAGE is the default and may dominate many videos in a row.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Prefer IMAGE when recent packages already used a special layout.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid and often preferred.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 4× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | N | N | N | partial | N | n/a | N | 0 |
| QUOTE | N | N | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: The Reputation Tax You Pay Every Week You Don't Post (`0bea62e2-e800-4122-9ab8-550180321a4e`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "project_id": "163c1822-ad30-4cee-8826-dfacd9c188b9",
  "visual_profile": "EDITORIAL",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "downgraded_cta_count": 0,
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "visual_profile_version": "visual-profile@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "checklist_allowlist_status": "allowlisted",
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE RESTRAINT (project content history):\n- Scene Types are sparse presentation tools, not recurring templates.\n- IMAGE is the default and may dominate many videos in a row.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Prefer IMAGE when recent packages already used a special layout.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid and often preferred.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 4× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | N | N | N | partial | N | n/a | N | 0 |
| QUOTE | N | N | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Primary questions — Scene types

- **Did LLM see CHECKLIST/CTA?** Yes (persisted `prompt_presentation_types`).
- **PHONE/QUOTE/STATISTIC in prompt?** No — ceiling excluded them.
- **Schema silently dropping typed scenes?** No evidence — nothing typed in stored output.
- **IMAGE-first conservative?** Yes — explicit in `presentationGeneration.ts`.

## Part 4 — Semantic Motion decision audit

### Job 40fb807c-f8f2-4296-bf37-01dfda20886e

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | situation | scene-1 | EXPLAIN | pan_left | EXPLAIN | pan_left | yes |
| 2 | situation | scene-2 | EXPLAIN | drift_down | EXPLAIN | drift_down | yes |
| 3 | situation | scene-3 | EXPLAIN | pan_left | EXPLAIN | pan_left | yes |
| 4 | unexpected_turn | scene-4 | EXPLAIN | drift_up | EXPLAIN | drift_up | yes |
| 5 | unexpected_turn | scene-1 | EXPLAIN | pan_left | CLOSE | static | partial |
| 6 | punchline | scene-2 | EXPLAIN | pan_right |  |  | partial |
| 7 | punchline | scene-3 | EXPLAIN | pan_left |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |
| 9 | cta | scene-1 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job 6b49235a-5da7-49d1-8a77-b03b6cc2dee9

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | mistake | scene-1 | EXPLAIN | pan_left | EXPLAIN | pan_left | yes |
| 2 | mistake | scene-2 | EXPLAIN | drift_down | EXPLAIN | drift_down | yes |
| 3 | mistake | scene-3 | EXPLAIN | pan_left | EXPLAIN | pan_left | yes |
| 4 | why_backfires | scene-4 | EXPLAIN | drift_up | EXPLAIN | drift_up | yes |
| 5 | why_backfires | scene-1 | EXPLAIN | pan_left | CLOSE | static | partial |
| 6 | correct_approach | scene-2 | EXPLAIN | pan_right |  |  | partial |
| 7 | correct_approach | scene-3 | EXPLAIN | pan_left |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |
| 9 | cta | scene-1 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job 50d6bec6-839e-4b47-acbd-fc4066e80123

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | observation | scene-1 | EXPLAIN | pan_left | EXPLAIN | pan_left | yes |
| 2 | observation | scene-2 | EXPLAIN | drift_down | EXPLAIN | drift_down | yes |
| 3 | meaning | scene-3 | EXPLAIN | pan_left | EXPLAIN | pan_left | yes |
| 4 | meaning | scene-4 | EXPLAIN | drift_up | REVEAL | drift_up | partial |
| 5 | reveal | scene-5 | REVEAL | zoom_out | CLOSE | static | partial |
| 6 | reveal | scene-1 | REVEAL | drift_up |  |  | partial |
| 7 | cta | scene-2 | CLOSE | static |  |  | partial |
| 8 | cta | scene-3 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

## Part 5 — History restraint audit

History query loads last 12 packages (`loadSceneTypeProjectHistory`). Special types derived only from **non-IMAGE** in `visual_scenes` or `final_worker_scene_types`.

This project had extensive prior packages but **all IMAGE-only** → `lastPackageSpecialTypes: []`, `weeklyStrategySpecialTypes: []`, `ctaUsedInRecentWindow: false`. Empty `history_decisions` is **correct**, not a query failure.
Packages in the **same run** may be invisible to earlier siblings depending on commit order; even when visible, siblings contribute **no special types**.

## Part 6 — Presentation Analyzer audit

```json
{
  "image_pass_through_decisions": 13,
  "typed_validations": 0,
  "downgrades": 0,
  "proof_checks": 0,
  "asset_eligibility_checks": 0,
  "cta_alignment_checks": 0,
  "history_suppressions": 0,
  "conclusion": "Analyzer only exercised IMAGE allowed/image scene branch. Typed-scene validation **not production-proven** by this run."
}
```


## Part 7 — UI and configuration audit

**Controls** (`updateProjectPresentationVoice` in `knowledge/actions.ts`): voice selection, TTS instructions, visual profile.

| UI selection | Persisted JSON | Resolver behavior |
| --- | --- | --- |
| Default (alloy) | `presentation` absent or no `preferred_voice` | `legacy_default_alloy` |
| Automatic | `{ "preferred_voice": "auto" }` | `deterministic_project_voice` |
| Named voice (e.g. coral) | `{ "preferred_voice": "coral" }` | `explicit_project_voice` |
| Visual Automatic | `visual_profile` key deleted | `resolveVisualProfileAuto` hash |
| Visual EDITORIAL (etc.) | `{ "visual_profile": "EDITORIAL" }` | `override` branch |

**Voice UI options:**
```json
[
  {
    "value": "",
    "label": "Default (alloy)"
  },
  {
    "value": "auto",
    "label": "Automatic"
  },
  {
    "value": "ash",
    "label": "ash"
  },
  {
    "value": "ballad",
    "label": "ballad"
  },
  {
    "value": "coral",
    "label": "coral"
  },
  {
    "value": "echo",
    "label": "echo"
  },
  {
    "value": "fable",
    "label": "fable"
  },
  {
    "value": "onyx",
    "label": "onyx"
  },
  {
    "value": "nova",
    "label": "nova"
  },
  {
    "value": "sage",
    "label": "sage"
  },
  {
    "value": "shimmer",
    "label": "shimmer"
  },
  {
    "value": "verse",
    "label": "verse"
  },
  {
    "value": "marin",
    "label": "marin"
  },
  {
    "value": "cedar",
    "label": "cedar"
  }
]
```

**Visual profile UI options:**
```json
[
  {
    "value": "auto",
    "label": "Automatic"
  },
  {
    "value": "NATURAL",
    "label": "Natural"
  },
  {
    "value": "MINIMAL",
    "label": "Minimal"
  },
  {
    "value": "BOLD",
    "label": "Bold"
  },
  {
    "value": "EDITORIAL",
    "label": "Editorial"
  },
  {
    "value": "PREMIUM",
    "label": "Premium"
  }
]
```


- Voice UI **implemented**. Automatic **does** run deterministic resolver — **not** active for Fenrik (empty presentation).
- User can return to Automatic by selecting Automatic (sets `preferred_voice: auto`).
- Visual Profile UI **implemented**; Automatic uses **hash**, not semantic LLM.

## Part 8 — Evidence classification

| Feature | Implemented | Executed | Non-default decision | Default/pass-through | Production-proven |
| --- | ---: | ---: | ---: | ---: | ---: |
| Voice selection | Y | Y | N | Y | N |
| TTS instructions | Y | Y | Y | N | Y |
| Visual Profile AUTO | Y | Y | Y | N | Y |
| IMAGE renderer | Y | Y | N | Y | Y |
| CHECKLIST | Y | Y | N | Y | N |
| PHONE | Y | N | N | Y | N |
| QUOTE | Y | N | N | Y | N |
| STATISTIC | Y | N | N | Y | N |
| CTA typed | Y | Y | N | Y | N |
| Presentation Analyzer typed | Y | Y | N | Y | N |
| Scene Type history | Y | Y | N | Y | N |
| Semantic Motion | Y | Y | partial | partial | Y |
| Moderation fallback | Y | N | N | — | N |
| Asset reuse in scenes | Y | N | N | Y | N |
| Language variants | Y | N | N | — | N |

## Part 9 — Root-cause conclusions

### Voice
- **Classification:** `configuration_missing` + `default_branch_only`
- Alloy = **legacy default**, not Automatic; aligned with UI “Default (alloy)” only if that was intentional product default.

### Visual Profile
- **Classification:** `working_as_designed` (hash AUTO)
- EDITORIAL = deterministic hash over project signals; stability intentional.

### Scene Types
- **Classification:** `prompt_too_conservative` + `llm_chose_image`; not pipeline_bug
- PHONE/QUOTE/STATISTIC: `missing_project_signal` / `missing_approved_proof`

### Semantic Motion
- **Classification:** `resolver_logic_issue` for role→intent mapping; scene reuse `working_as_designed`

### Overall
- End-to-end render: **working_as_designed**
- Typed scene system: **insufficient_production_evidence**

## Part 10 — Deliverables & code references

- Voice: `lib/voice/resolveTtsOptions.ts`, `lib/voice/presentationSettings.ts`, `lib/voice/videoJobTtsInput.ts`
- Profile: `lib/visual-profile/resolveVisualProfile.ts`
- Scene prompt: `lib/ai/prompts/presentationGeneration.ts`, `derivePromptPresentationTypes`
- Analyzer: `lib/scene-types/presentation/analyzePresentation.ts`, `prepareVisualScenesForVideo.ts`
- History: `lib/scene-types/presentation/sceneTypeProjectHistory.ts`
- Motion: `lib/video-engine/semanticMotion/resolveSceneMotion.ts`, `lib/video-engine/storyboard.ts` (`buildStoryboard`, `sceneIdForStoryboardBeat`)

**Unproven by this run:** typed analyzer branches, PHONE/QUOTE/STATISTIC prompt path, moderation fallback, per-video voice dynamism.
