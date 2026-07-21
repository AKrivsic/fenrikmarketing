# Decision Audit — Production Run `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa`

_Read-only. Generated 2026-07-16T23:35:51.104Z._

## Executive summary (one page)

**Voice:** All videos use `alloy` because `knowledge.presentation` is empty (UI “Default (alloy)”): `resolveVoice()` never entered the Automatic/deterministic branch (`preferred_voice === 'auto'`). This is **legacy_default_alloy**, not automatic selection. If Automatic were saved, this project would resolve to **cedar** per `deterministicOpenAiTtsVoice()`, not alloy.

**Visual profile:** **EDITORIAL** from **AUTO hash** (resolveVisualProfileAuto → source `auto`), not UI override, not DEFAULT NATURAL. Same project always gets the same profile until signals/override change.

**Scene types:** LLM output is legacy IMAGE-only `{source,ai,image_prompt}` for all scenes. **Not** analyzer suppression — typed types were never requested (`requested_*_count: 0`). CHECKLIST/CTA were in **persisted** `prompt_presentation_types`; PHONE/QUOTE/STATISTIC were **not_in_prompt_ceiling** (no mobile signal, no proof candidates). Prompt text explicitly encourages IMAGE-first.

**Semantic motion:** Active but **role labels** (`observation`, `meaning`, …) are **not** mapped in `roleDefaultIntent()` → default **EXPLAIN**. Fifth beat reusing `scene-1` is **working_as_designed** (`sceneIdForStoryboardBeat` with `explicit_scene_order` and 4 scenes / 5 beats).

**History / analyzer:** History loaded (12 prior packages) but **empty special-type history** (prior packages IMAGE-only). Analyzer = **IMAGE pass-through only** — no typed validation exercised.

## Part 1 — Voice decision audit

### Project signals

```json
{
  "knowledge_presentation": {},
  "voice_ui_selection": "auto",
  "ui_empty_means": "Default (alloy) — preferred_voice deleted on save",
  "project_language": "en",
  "tone_of_voice": {
    "notes": [
      "Simple and accessible",
      "Direct and action-oriented",
      "Transparent and honest",
      "Friendly and approachable",
      "Concise and practical"
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
- Project resolver output: `cedar`
- Hypothetical Automatic output: `cedar`

### Per-video

| video_job_id | tts_voice (input) | category | automatic executed? | source job inherit? |
| --- | --- | --- | --- | --- |
| c4257dca-c607-48fd-ad0d-3c1626af24fa | cedar | legacy_default_alloy | no | no |
| 8c668ff5-9b63-4e8a-9640-0157befeafc4 | shimmer | legacy_default_alloy | no | no |
| 43fd4129-a4cc-49fc-879e-b3e64346d3e1 | cedar | legacy_default_alloy | no | no |
| b2561f42-e709-4f8e-bb29-1f76db60af22 | cedar | legacy_default_alloy | no | no |
| 19f5386b-62fd-4cb6-9ed5-dd9f073228ad | cedar | legacy_default_alloy | no | no |
| 58c46521-df88-4a03-92cd-9e2829baf67d | shimmer | legacy_default_alloy | no | no |
| 69df165a-0e05-48d6-9c17-b726a4d51295 | shimmer | legacy_default_alloy | no | no |
| d2c498fc-8e8f-417d-b4d8-6527fd658a4a | shimmer | legacy_default_alloy | no | no |
| 9d4d86a0-7078-4838-b350-4266d21eadfd | shimmer | legacy_default_alloy | no | no |
| bffefd85-2e62-469a-999f-cc846b1d5bcf | shimmer | legacy_default_alloy | no | no |
| 856970e0-3e17-4382-b362-953e7a2acb25 | shimmer | legacy_default_alloy | no | no |
| b072e3a5-06b0-4cc2-9e39-cd6983c8cc27 | shimmer | legacy_default_alloy | no | no |
| 5bb001b0-014d-4ac2-ad04-cf97882f5bef | shimmer | legacy_default_alloy | no | no |
| d53c5755-adba-46f1-987c-2fd296c9b636 | shimmer | legacy_default_alloy | no | no |

### Primary questions — Voice

- **Was alloy deliberate automatic selection?** No — **legacy_default_alloy** (configuration_missing: no presentation block).
- **Was automatic resolver executed?** No. Would select `cedar` if UI saved Automatic.
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
  "auto_hash_seed": "aabab9ff-9db4-4012-a53c-135e3bfea6cd::lead_generation::simple and accessible direct and action-oriented transparent and honest friendly and approachable concise and practical::Local services and consulting firms|Car dealers, beauty salons, and service centers|SaaS and software companies::AI assistant created in as little as 1 minute|No code or technical knowledge required|Fixed monthly pricing starting at $69/month|Try a preview without registration::AI chatbot platform for websites|Automatically analyzes website URL to build a knowledge base|Answers visitor questions 24/7",
  "auto_hash_candidates": [
    "NATURAL",
    "MINIMAL",
    "BOLD",
    "EDITORIAL",
    "PREMIUM"
  ],
  "auto_hash_selected": "MINIMAL",
  "resolved": {
    "profile": "MINIMAL",
    "source": "auto",
    "version": "visual-profile@3",
    "scores": {
      "NATURAL": 5,
      "MINIMAL": 6,
      "BOLD": 0,
      "EDITORIAL": 4,
      "PREMIUM": 0
    },
    "reasons": [
      "NATURAL:brain_approachable(+1)",
      "NATURAL:brain_local(+1)",
      "NATURAL:brain_practical(+1)",
      "NATURAL:brain_friendly(+1)",
      "NATURAL:brain_honest(+1)",
      "MINIMAL:brain_simple(+3)",
      "MINIMAL:brain_saas(+1)",
      "MINIMAL:brain_software(+1)",
      "MINIMAL:brain_platform(+1)",
      "EDITORIAL:brain_professional(+1)",
      "EDITORIAL:brain_consulting(+1)",
      "EDITORIAL:brain_content(+1,capped_from_2)",
      "EDITORIAL:brain_marketing(+1)"
    ]
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
    "QUOTE",
    "PHONE",
    "CTA"
  ],
  "prompt_types_recomputed_now": [
    "IMAGE"
  ],
  "checklist_allowlist_status": "not_allowlisted",
  "proof": {
    "hasQuoteCandidates": true,
    "hasStatisticCandidates": false
  },
  "mobileProductCapable": true,
  "note": "Use persisted prompt_presentation_types per package as ground truth for what LLM saw at generation time."
}
```


```json
{
  "presentation_prompt_excerpt_policy": [
    "PRESENTATION (visual beat types — strongest expression wins):",
    "",
    "For each narrative beat, ask: what is the strongest way to communicate THIS idea?",
    "IMAGE is a common, valid choice when one strong visual carries the beat.",
    "Typed scenes (when allowed) are equal tools — not exceptional backups and not defaults.",
    "Select a typed scene only when it communicates the core idea materially better than a normal IMAGE.",
    "Do not use typed scenes merely for decoration, structure, or artificial variety.",
    "Do not force one typed scene per video.",
    "There is no quota for CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA.",
    "",
    "Decision rubric (apply per beat):",
    "1) What idea does this beat need to land?",
    "2) Compare candidates: IMAGE (including object / process / comparison-style stills),",
    "   then any allowed typed scene (CHECKLIST, PHONE, QUOTE, STATISTIC, CTA for closes).",
    "3) Prefer the typed scene only when it is materially clearer than those IMAGE options.",
    "4) Is the required payload available and supported by the narration / Project Brain?",
    "5) Recent history (if noted) is a soft tie-breaker when two options are similarly strong —",
    "   prefer the less recently used expression. Do not rotate for variety alone.",
    "   If a typed scene is clearly stronger, keep it.",
    "If a typed scene is clearly stronger, use it. Otherwise use IMAGE."
  ]
}
```

_(Full block rebuilt from types IMAGE,CHECKLIST,CTA — matches persisted packages.)_

### Package: One script. One minute. Your website stops going silent after hours. (`b5810803-b571-42b5-bbb4-8f77174b75cf`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "shimmer",
  "package_id": "b5810803-b571-42b5-bbb4-8f77174b75cf",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 62,
    "secondary": 64
  },
  "voice_source": "package_secondary",
  "visual_medium": "SOFT_3D",
  "voice_reasons": [
    "funnel_conversion→steadiness(+2)",
    "mode_observation→steady/warmth",
    "profile_NATURAL→warmth(+2)",
    "topic_warmth_cues(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+62)",
    "fit_secondary(+64)"
  ],
  "product_reveal": {
    "reasons": [
      "story_prefers_outcome_over_framed:place",
      "fallback:abstract_system"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "ABSTRACT_PRODUCT_SYSTEM",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: confident, concise, not aggressive. Delivery: thoughtful, reflective, steady pacing. Delivery: warm and approachable. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: confident, concise, not aggressive. Delivery: thoughtful, reflective, steady pacing. Language: en.",
  "visual_narrative": {
    "key": "place|environmental details that imply the pain before anyone speaks",
    "version": "visual-narrative@1",
    "subject_focus": "environmental details that imply the pain before anyone speaks",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "desk": 8,
      "group": 3,
      "phone": 4,
      "laptop": 7,
      "office": 7,
      "meeting": 1,
      "monitor": 1,
      "close_up": 8,
      "overhead": 3,
      "prototype": 1,
      "whiteboard": 1,
      "home_office": 3,
      "person_alone": 1,
      "sticky_notes": 2,
      "product_asset": 2
    },
    "supporting_carriers": [
      "object",
      "human",
      "metaphor"
    ],
    "primary_meaning_carrier": "place"
  },
  "creative_identity": {
    "key": "a soft-focus urban street exterior|focused calm|overcast diffused daylight|three-quarter angle on the subject|wide frame with intentional negative space|implied human presence just off-screen|soft pastel accents, restrained saturation",
    "mood": "focused calm",
    "camera": "three-quarter angle on the subject",
    "version": "creative-identity@1",
    "lighting": "overcast diffused daylight",
    "color_feel": "soft pastel accents, restrained saturation",
    "option_ids": {
      "mood": "focused_calm",
      "camera": "three_quarter",
      "lighting": "overcast_diffused",
      "color_feel": "soft_pastel",
      "composition": "wide_negative_space",
      "environment": "urban_street_soft",
      "human_presence": "implied_offscreen"
    },
    "composition": "wide frame with intentional negative space",
    "environment": "a soft-focus urban street exterior",
    "human_presence": "implied human presence just off-screen"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 3,
    "PHOTOGRAPHIC": 2,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 1,
    "TECHNICAL_BLUEPRINT": 0
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "PHOTOGRAPHIC:carrier_place(+2)",
    "SOFT_3D:funnel_solution(+1)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 4,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
      "topic": "Tonight, your website could already be capturing the leads it's currently losing",
      "motifs": [
        "phone",
        "desk",
        "office",
        "whiteboard",
        "sticky_notes",
        "close_up",
        "monitor",
        "home_office"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": null
    },
    {
      "hook": "Every morning you check your inbox — but you never check what your website said no to overnight.",
      "topic": "You can see your chatbot working before you sign up for anything",
      "motifs": [
        "laptop",
        "phone",
        "desk",
        "office",
        "close_up",
        "product_asset"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    },
    {
      "hook": "You keep saying you'll build a chatbot — and every week you don't, a real visitor leaves your site with nothing.",
      "topic": "The difference between a website that collects traffic and one that captures leads",
      "motifs": [
        "laptop",
        "desk",
        "office",
        "group",
        "close_up",
        "overhead"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    },
    {
      "hook": "A law firm can be set up in under a minute to answer client questions — and most still aren't.",
      "topic": "How a law firm could have kept that 11 PM visitor from leaving empty-handed",
      "motifs": [
        "laptop",
        "phone",
        "desk",
        "close_up"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    },
    {
      "hook": "You're mid-pitch to your biggest prospect — and someone just abandoned your website because nobody answered them.",
      "topic": "One embed script — and your website answers questions while you sleep",
      "motifs": [
        "laptop",
        "desk",
        "office",
        "meeting",
        "group",
        "close_up"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    },
    {
      "hook": "You spent weeks writing every word on your website — then built a chatbot from scratch as if none of it existed.",
      "topic": "What if your website already knew enough to answer visitor questions?",
      "motifs": [
        "laptop",
        "desk",
        "office",
        "group",
        "close_up",
        "overhead",
        "product_asset",
        "prototype"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 13,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 0× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: Your website has an opinion about every visitor. You just never hear it say 'no.' (`39ed9bb1-f0a1-41c4-9cc8-1f1de8255e5a`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "shimmer",
  "package_id": "39ed9bb1-f0a1-41c4-9cc8-1f1de8255e5a",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 49,
    "secondary": 62
  },
  "voice_source": "package_secondary",
  "visual_medium": "CLEAN_ILLUSTRATION",
  "voice_reasons": [
    "funnel_awareness→warmth/energy(+1)",
    "mode_humor→energy/warmth",
    "profile_NATURAL→warmth(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+49)",
    "fit_secondary(+62)"
  ],
  "product_reveal": {
    "reasons": [
      "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "FRAMED_ASSET",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: natural, curious, conversational. Delivery: lightly playful, never exaggerated. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: natural, curious, conversational. Delivery: lightly playful, never exaggerated. Delivery: confident, concise, not aggressive. Language: en.",
  "visual_narrative": {
    "key": "object|objects that change state across beats to tell the story",
    "version": "visual-narrative@1",
    "subject_focus": "objects that change state across beats to tell the story",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "desk": 7,
      "group": 3,
      "phone": 4,
      "laptop": 6,
      "office": 6,
      "meeting": 1,
      "monitor": 1,
      "close_up": 7,
      "overhead": 2,
      "prototype": 1,
      "whiteboard": 1,
      "home_office": 2,
      "sticky_notes": 1,
      "product_asset": 2
    },
    "supporting_carriers": [
      "place",
      "process",
      "transformation"
    ],
    "primary_meaning_carrier": "object"
  },
  "creative_identity": {
    "key": "a maker workbench with tools and materials|reflective, thoughtful pause|gentle side lighting with soft shadows|slightly above table height|layered depth with foreground and background|person seen from behind or as silhouette|urban gray-blue ambient palette",
    "mood": "reflective, thoughtful pause",
    "camera": "slightly above table height",
    "version": "creative-identity@1",
    "lighting": "gentle side lighting with soft shadows",
    "color_feel": "urban gray-blue ambient palette",
    "option_ids": {
      "mood": "reflective",
      "camera": "slightly_above_table",
      "lighting": "gentle_side_light",
      "color_feel": "urban_gray_blue",
      "composition": "layered_depth",
      "environment": "maker_workbench",
      "human_presence": "silhouette_back"
    },
    "composition": "layered depth with foreground and background",
    "environment": "a maker workbench with tools and materials",
    "human_presence": "person seen from behind or as silhouette"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 2,
    "PHOTOGRAPHIC": 0,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 4,
    "TECHNICAL_BLUEPRINT": 2
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
    "TECHNICAL_BLUEPRINT:carrier_process(+1)",
    "CLEAN_ILLUSTRATION:saas_abstract(+1)",
    "TECHNICAL_BLUEPRINT:saas_system(+1)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 5,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
      "topic": "One script. One minute. Your website stops going silent after hours.",
      "motifs": [],
      "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": null,
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
    },
    {
      "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
      "topic": "Tonight, your website could already be capturing the leads it's currently losing",
      "motifs": [
        "phone",
        "desk",
        "office",
        "whiteboard",
        "sticky_notes",
        "close_up",
        "monitor",
        "home_office"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": null
    },
    {
      "hook": "Every morning you check your inbox — but you never check what your website said no to overnight.",
      "topic": "You can see your chatbot working before you sign up for anything",
      "motifs": [
        "laptop",
        "phone",
        "desk",
        "office",
        "close_up",
        "product_asset"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    },
    {
      "hook": "You keep saying you'll build a chatbot — and every week you don't, a real visitor leaves your site with nothing.",
      "topic": "The difference between a website that collects traffic and one that captures leads",
      "motifs": [
        "laptop",
        "desk",
        "office",
        "group",
        "close_up",
        "overhead"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    },
    {
      "hook": "A law firm can be set up in under a minute to answer client questions — and most still aren't.",
      "topic": "How a law firm could have kept that 11 PM visitor from leaving empty-handed",
      "motifs": [
        "laptop",
        "phone",
        "desk",
        "close_up"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    },
    {
      "hook": "You're mid-pitch to your biggest prospect — and someone just abandoned your website because nobody answered them.",
      "topic": "One embed script — and your website answers questions while you sleep",
      "motifs": [
        "laptop",
        "desk",
        "office",
        "meeting",
        "group",
        "close_up"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 0× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: Your website is open right now — and it has no idea what to say (`ac67d2f5-81f7-4d3f-a291-ac4d60282f17`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "shimmer",
  "package_id": "ac67d2f5-81f7-4d3f-a291-ac4d60282f17",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 47,
    "secondary": 66
  },
  "voice_source": "package_secondary",
  "visual_medium": "CLEAN_ILLUSTRATION",
  "voice_reasons": [
    "funnel_awareness→warmth/energy(+1)",
    "mode_story→warmth(+3)",
    "profile_NATURAL→warmth(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+47)",
    "fit_secondary(+66)"
  ],
  "product_reveal": {
    "reasons": [
      "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "FRAMED_ASSET",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: natural, curious, conversational. Delivery: warm, intimate, conversational storytelling pace. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: natural, curious, conversational. Delivery: warm, intimate, conversational storytelling pace. Delivery: confident, concise, not aggressive. Language: en.",
  "visual_narrative": {
    "key": "object|physical evidence of the problem (empty tray, crossed-out plan, half-finished stack)",
    "version": "visual-narrative@1",
    "subject_focus": "physical evidence of the problem (empty tray, crossed-out plan, half-finished stack)",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "desk": 6,
      "group": 3,
      "phone": 3,
      "laptop": 5,
      "office": 5,
      "meeting": 2,
      "monitor": 1,
      "close_up": 6,
      "overhead": 2,
      "prototype": 1,
      "whiteboard": 1,
      "home_office": 1,
      "person_alone": 1,
      "sticky_notes": 1,
      "product_asset": 2
    },
    "supporting_carriers": [
      "place",
      "process",
      "transformation"
    ],
    "primary_meaning_carrier": "object"
  },
  "creative_identity": {
    "key": "a maker workbench with tools and materials|subtle relief after friction|bright, even indoor illumination|slightly above table height|wide frame with intentional negative space|face intentionally not visible|warm wood surfaces and amber highlights",
    "mood": "subtle relief after friction",
    "camera": "slightly above table height",
    "version": "creative-identity@1",
    "lighting": "bright, even indoor illumination",
    "color_feel": "warm wood surfaces and amber highlights",
    "option_ids": {
      "mood": "relieved",
      "camera": "slightly_above_table",
      "lighting": "bright_even_indoor",
      "color_feel": "warm_wood",
      "composition": "wide_negative_space",
      "environment": "maker_workbench",
      "human_presence": "face_not_visible"
    },
    "composition": "wide frame with intentional negative space",
    "environment": "a maker workbench with tools and materials",
    "human_presence": "face intentionally not visible"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 2,
    "PHOTOGRAPHIC": 0,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 4,
    "TECHNICAL_BLUEPRINT": 2
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
    "TECHNICAL_BLUEPRINT:carrier_process(+1)",
    "CLEAN_ILLUSTRATION:saas_abstract(+1)",
    "TECHNICAL_BLUEPRINT:saas_system(+1)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 5,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
      "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
      "motifs": [
        "meeting",
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "meeting",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
      "topic": "One script. One minute. Your website stops going silent after hours.",
      "motifs": [],
      "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": null,
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
    },
    {
      "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
      "topic": "Tonight, your website could already be capturing the leads it's currently losing",
      "motifs": [
        "phone",
        "desk",
        "office",
        "whiteboard",
        "sticky_notes",
        "close_up",
        "monitor",
        "home_office"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": null
    },
    {
      "hook": "Every morning you check your inbox — but you never check what your website said no to overnight.",
      "topic": "You can see your chatbot working before you sign up for anything",
      "motifs": [
        "laptop",
        "phone",
        "desk",
        "office",
        "close_up",
        "product_asset"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    },
    {
      "hook": "You keep saying you'll build a chatbot — and every week you don't, a real visitor leaves your site with nothing.",
      "topic": "The difference between a website that collects traffic and one that captures leads",
      "motifs": [
        "laptop",
        "desk",
        "office",
        "group",
        "close_up",
        "overhead"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    },
    {
      "hook": "A law firm can be set up in under a minute to answer client questions — and most still aren't.",
      "topic": "How a law firm could have kept that 11 PM visitor from leaving empty-handed",
      "motifs": [
        "laptop",
        "phone",
        "desk",
        "close_up"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 4× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: The car dealership that lost a weekend's worth of buyers and never knew it (`9fe1a31e-0142-477f-907a-6ee079fd8f00`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "shimmer",
  "package_id": "9fe1a31e-0142-477f-907a-6ee079fd8f00",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 49,
    "secondary": 62
  },
  "voice_source": "package_secondary",
  "visual_medium": "PHOTOGRAPHIC",
  "voice_reasons": [
    "funnel_problem→warmth(+2)",
    "mode_contrarian→energy(+3)",
    "profile_NATURAL→warmth(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+49)",
    "fit_secondary(+62)"
  ],
  "product_reveal": {
    "reasons": [
      "story_prefers_outcome_over_framed:place",
      "fallback:product_outcome"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "PRODUCT_OUTCOME",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: warm and approachable. Delivery: measured, credible. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: measured, credible. Language: en.",
  "visual_narrative": {
    "key": "place|a location that belongs to this product's world (not a default tech office)",
    "version": "visual-narrative@1",
    "subject_focus": "a location that belongs to this product's world (not a default tech office)",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "desk": 5,
      "group": 2,
      "phone": 3,
      "laptop": 5,
      "office": 4,
      "founder": 1,
      "meeting": 2,
      "monitor": 1,
      "close_up": 5,
      "overhead": 1,
      "dashboard": 1,
      "prototype": 1,
      "whiteboard": 1,
      "home_office": 1,
      "person_alone": 1,
      "sticky_notes": 1,
      "product_asset": 2
    },
    "supporting_carriers": [
      "object",
      "human",
      "metaphor"
    ],
    "primary_meaning_carrier": "place"
  },
  "creative_identity": {
    "key": "a bright co-working space in daylight|curious, alert attention|overcast diffused daylight|slightly above table height|symmetrical, calm composition|implied human presence just off-screen|warm neutral color feel",
    "mood": "curious, alert attention",
    "camera": "slightly above table height",
    "version": "creative-identity@1",
    "lighting": "overcast diffused daylight",
    "color_feel": "warm neutral color feel",
    "option_ids": {
      "mood": "curious",
      "camera": "slightly_above_table",
      "lighting": "overcast_diffused",
      "color_feel": "warm_neutral",
      "composition": "symmetrical_calm",
      "environment": "co_working_daylight",
      "human_presence": "implied_offscreen"
    },
    "composition": "symmetrical, calm composition",
    "environment": "a bright co-working space in daylight",
    "human_presence": "implied human presence just off-screen"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 2,
    "PHOTOGRAPHIC": 2,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 0,
    "TECHNICAL_BLUEPRINT": 0
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "PHOTOGRAPHIC:carrier_place(+2)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 4,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "The busiest moment for your website is the one you're never around to see.",
      "topic": "Your business is closed — but your website is still getting visitors right now",
      "motifs": [
        "dashboard",
        "founder",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "dashboard",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
      "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
      "motifs": [
        "meeting",
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "meeting",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
      "topic": "One script. One minute. Your website stops going silent after hours.",
      "motifs": [],
      "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": null,
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
    },
    {
      "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
      "topic": "Tonight, your website could already be capturing the leads it's currently losing",
      "motifs": [
        "phone",
        "desk",
        "office",
        "whiteboard",
        "sticky_notes",
        "close_up",
        "monitor",
        "home_office"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": null
    },
    {
      "hook": "Every morning you check your inbox — but you never check what your website said no to overnight.",
      "topic": "You can see your chatbot working before you sign up for anything",
      "motifs": [
        "laptop",
        "phone",
        "desk",
        "office",
        "close_up",
        "product_asset"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    },
    {
      "hook": "You keep saying you'll build a chatbot — and every week you don't, a real visitor leaves your site with nothing.",
      "topic": "The difference between a website that collects traffic and one that captures leads",
      "motifs": [
        "laptop",
        "desk",
        "office",
        "group",
        "close_up",
        "overhead"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 0× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: The Irony of Knowing Everything and Saying Nothing (`c998a760-add3-4d46-a580-69256f7d9826`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "shimmer",
  "package_id": "c998a760-add3-4d46-a580-69256f7d9826",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 46,
    "secondary": 56
  },
  "voice_source": "package_secondary",
  "visual_medium": "TECHNICAL_BLUEPRINT",
  "voice_reasons": [
    "funnel_problem→warmth(+2)",
    "mode_observation→steady/warmth",
    "profile_NATURAL→warmth(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+46)",
    "fit_secondary(+56)"
  ],
  "product_reveal": {
    "reasons": [
      "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "FRAMED_ASSET",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: thoughtful, reflective, steady pacing. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: thoughtful, reflective, steady pacing. Delivery: confident, concise, not aggressive. Language: en.",
  "visual_narrative": {
    "key": "object|workflow artifacts: notes, cards, printouts, boards, inbox piles, tools of the trade",
    "version": "visual-narrative@1",
    "subject_focus": "workflow artifacts: notes, cards, printouts, boards, inbox piles, tools of the trade",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "desk": 6,
      "group": 2,
      "phone": 3,
      "laptop": 6,
      "office": 3,
      "founder": 1,
      "meeting": 1,
      "monitor": 1,
      "close_up": 4,
      "overhead": 1,
      "dashboard": 2,
      "prototype": 1,
      "whiteboard": 1,
      "home_office": 1,
      "person_alone": 1,
      "sticky_notes": 1,
      "product_asset": 3
    },
    "supporting_carriers": [
      "place",
      "process",
      "transformation"
    ],
    "primary_meaning_carrier": "object"
  },
  "creative_identity": {
    "key": "a bright co-working space in daylight|quiet optimism|soft natural window daylight|close detail on hands or objects|centered subject with generous vertical headroom|no people visible — objects and environment tell the story|warm neutral color feel",
    "mood": "quiet optimism",
    "camera": "close detail on hands or objects",
    "version": "creative-identity@1",
    "lighting": "soft natural window daylight",
    "color_feel": "warm neutral color feel",
    "option_ids": {
      "mood": "optimistic",
      "camera": "close_detail",
      "lighting": "soft_window_daylight",
      "color_feel": "warm_neutral",
      "composition": "centered_headroom",
      "environment": "co_working_daylight",
      "human_presence": "no_people"
    },
    "composition": "centered subject with generous vertical headroom",
    "environment": "a bright co-working space in daylight",
    "human_presence": "no people visible — objects and environment tell the story"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 2,
    "PHOTOGRAPHIC": 0,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 5,
    "TECHNICAL_BLUEPRINT": 3
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
    "TECHNICAL_BLUEPRINT:carrier_process(+1)",
    "CLEAN_ILLUSTRATION:identity_no_face(+2)",
    "TECHNICAL_BLUEPRINT:identity_objects(+1)",
    "CLEAN_ILLUSTRATION:saas_abstract(+1)",
    "TECHNICAL_BLUEPRINT:saas_system(+1)",
    "diversity:CLEAN_ILLUSTRATION→TECHNICAL_BLUEPRINT(close_score)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 5,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
      "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
      "motifs": [
        "laptop",
        "desk",
        "dashboard",
        "group",
        "product_asset"
      ],
      "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    },
    {
      "hook": "The busiest moment for your website is the one you're never around to see.",
      "topic": "Your business is closed — but your website is still getting visitors right now",
      "motifs": [
        "dashboard",
        "founder",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "dashboard",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
      "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
      "motifs": [
        "meeting",
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "meeting",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
      "topic": "One script. One minute. Your website stops going silent after hours.",
      "motifs": [],
      "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": null,
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
    },
    {
      "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
      "topic": "Tonight, your website could already be capturing the leads it's currently losing",
      "motifs": [
        "phone",
        "desk",
        "office",
        "whiteboard",
        "sticky_notes",
        "close_up",
        "monitor",
        "home_office"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": null
    },
    {
      "hook": "Every morning you check your inbox — but you never check what your website said no to overnight.",
      "topic": "You can see your chatbot working before you sign up for anything",
      "motifs": [
        "laptop",
        "phone",
        "desk",
        "office",
        "close_up",
        "product_asset"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": null
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 0× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: The Quiet Routine That's Costing You Leads Every Single Day (`f1104eed-664a-4cc9-9d0b-2cdf7bb75926`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "shimmer",
  "package_id": "f1104eed-664a-4cc9-9d0b-2cdf7bb75926",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 46,
    "secondary": 56
  },
  "voice_source": "package_secondary",
  "visual_medium": "PHOTOGRAPHIC",
  "voice_reasons": [
    "funnel_problem→warmth(+2)",
    "mode_observation→steady/warmth",
    "profile_NATURAL→warmth(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+46)",
    "fit_secondary(+56)"
  ],
  "product_reveal": {
    "reasons": [
      "story_prefers_outcome_over_framed:place",
      "fallback:product_outcome"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "PRODUCT_OUTCOME",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: thoughtful, reflective, steady pacing. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: thoughtful, reflective, steady pacing. Delivery: confident, concise, not aggressive. Language: en.",
  "visual_narrative": {
    "key": "place|a room or corner whose order/disorder carries meaning",
    "version": "visual-narrative@1",
    "subject_focus": "a room or corner whose order/disorder carries meaning",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "desk": 5,
      "group": 2,
      "phone": 2,
      "laptop": 5,
      "office": 3,
      "founder": 1,
      "meeting": 1,
      "monitor": 1,
      "close_up": 4,
      "overhead": 1,
      "dashboard": 2,
      "prototype": 3,
      "whiteboard": 1,
      "home_office": 1,
      "person_alone": 1,
      "sticky_notes": 2,
      "product_asset": 3
    },
    "supporting_carriers": [
      "object",
      "human",
      "metaphor"
    ],
    "primary_meaning_carrier": "place"
  },
  "creative_identity": {
    "key": "a soft-focus urban street exterior|determined, forward-leaning energy|gentle side lighting with soft shadows|close detail on hands or objects|foreground framing element (door, shelf, plant)|person seen from behind or as silhouette|natural greens from plants or outdoor context",
    "mood": "determined, forward-leaning energy",
    "camera": "close detail on hands or objects",
    "version": "creative-identity@1",
    "lighting": "gentle side lighting with soft shadows",
    "color_feel": "natural greens from plants or outdoor context",
    "option_ids": {
      "mood": "determined",
      "camera": "close_detail",
      "lighting": "gentle_side_light",
      "color_feel": "natural_greens",
      "composition": "foreground_frame",
      "environment": "urban_street_soft",
      "human_presence": "silhouette_back"
    },
    "composition": "foreground framing element (door, shelf, plant)",
    "environment": "a soft-focus urban street exterior",
    "human_presence": "person seen from behind or as silhouette"
  },
  "history_decisions": [],
  "visual_beat_count": 5,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 2,
    "PHOTOGRAPHIC": 2,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 0,
    "TECHNICAL_BLUEPRINT": 0
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "PHOTOGRAPHIC:carrier_place(+2)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 5,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
      "topic": "Repeating yourself every single day — and still not being available when it counts",
      "motifs": [
        "sticky_notes",
        "close_up",
        "prototype"
      ],
      "closing": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical fr",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "sticky_notes",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
      "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
      "motifs": [
        "laptop",
        "desk",
        "dashboard",
        "group",
        "product_asset"
      ],
      "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    },
    {
      "hook": "The busiest moment for your website is the one you're never around to see.",
      "topic": "Your business is closed — but your website is still getting visitors right now",
      "motifs": [
        "dashboard",
        "founder",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "dashboard",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
      "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
      "motifs": [
        "meeting",
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "meeting",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
      "topic": "One script. One minute. Your website stops going silent after hours.",
      "motifs": [],
      "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": null,
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
    },
    {
      "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
      "topic": "Tonight, your website could already be capturing the leads it's currently losing",
      "motifs": [
        "phone",
        "desk",
        "office",
        "whiteboard",
        "sticky_notes",
        "close_up",
        "monitor",
        "home_office"
      ],
      "closing": null,
      "typed_cta": false,
      "scene_types": [],
      "creative_mode": null,
      "visual_medium": null,
      "meaning_carrier": null,
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": null
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 0× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: The Hidden Cost of 'We'll Get Back to You' (`460c2b90-03a9-497b-8a3d-0d55c04cf635`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "shimmer",
  "package_id": "460c2b90-03a9-497b-8a3d-0d55c04cf635",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 48,
    "secondary": 64
  },
  "voice_source": "package_secondary",
  "visual_medium": "TECHNICAL_BLUEPRINT",
  "voice_reasons": [
    "funnel_problem→warmth(+2)",
    "mode_humor→energy/warmth",
    "profile_NATURAL→warmth(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+48)",
    "fit_secondary(+64)"
  ],
  "product_reveal": {
    "reasons": [
      "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "FRAMED_ASSET",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: lightly playful, never exaggerated. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: lightly playful, never exaggerated. Delivery: confident, concise, not aggressive. Language: en.",
  "visual_narrative": {
    "key": "object|physical evidence of the problem (empty tray, crossed-out plan, half-finished stack)",
    "version": "visual-narrative@1",
    "subject_focus": "physical evidence of the problem (empty tray, crossed-out plan, half-finished stack)",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "desk": 4,
      "group": 1,
      "phone": 4,
      "laptop": 4,
      "office": 2,
      "founder": 1,
      "meeting": 1,
      "monitor": 1,
      "close_up": 5,
      "dashboard": 3,
      "prototype": 3,
      "whiteboard": 1,
      "home_office": 1,
      "person_alone": 3,
      "sticky_notes": 2,
      "product_asset": 3
    },
    "supporting_carriers": [
      "place",
      "process",
      "transformation"
    ],
    "primary_meaning_carrier": "object"
  },
  "creative_identity": {
    "key": "a maker workbench with tools and materials|reflective, thoughtful pause|warm late-afternoon side light|eye-level medium shot|subject placed on the left third with breathing room|hands and workspace only, no face|warm neutral color feel",
    "mood": "reflective, thoughtful pause",
    "camera": "eye-level medium shot",
    "version": "creative-identity@1",
    "lighting": "warm late-afternoon side light",
    "color_feel": "warm neutral color feel",
    "option_ids": {
      "mood": "reflective",
      "camera": "eye_level_medium",
      "lighting": "warm_late_afternoon",
      "color_feel": "warm_neutral",
      "composition": "subject_left_third",
      "environment": "maker_workbench",
      "human_presence": "hands_only"
    },
    "composition": "subject placed on the left third with breathing room",
    "environment": "a maker workbench with tools and materials",
    "human_presence": "hands and workspace only, no face"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 2,
    "PHOTOGRAPHIC": 0,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 5,
    "TECHNICAL_BLUEPRINT": 3
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
    "TECHNICAL_BLUEPRINT:carrier_process(+1)",
    "CLEAN_ILLUSTRATION:identity_no_face(+2)",
    "TECHNICAL_BLUEPRINT:identity_objects(+1)",
    "CLEAN_ILLUSTRATION:saas_abstract(+1)",
    "TECHNICAL_BLUEPRINT:saas_system(+1)",
    "diversity:CLEAN_ILLUSTRATION→TECHNICAL_BLUEPRINT(close_score)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 5,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
      "topic": "What a qualified lead actually does when your website can't answer them",
      "motifs": [
        "phone",
        "dashboard",
        "person_alone",
        "close_up"
      ],
      "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    },
    {
      "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
      "topic": "Repeating yourself every single day — and still not being available when it counts",
      "motifs": [
        "sticky_notes",
        "close_up",
        "prototype"
      ],
      "closing": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical fr",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "sticky_notes",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
      "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
      "motifs": [
        "laptop",
        "desk",
        "dashboard",
        "group",
        "product_asset"
      ],
      "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    },
    {
      "hook": "The busiest moment for your website is the one you're never around to see.",
      "topic": "Your business is closed — but your website is still getting visitors right now",
      "motifs": [
        "dashboard",
        "founder",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "dashboard",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
      "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
      "motifs": [
        "meeting",
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "meeting",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
      "topic": "One script. One minute. Your website stops going silent after hours.",
      "motifs": [],
      "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": null,
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 0× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: The Hidden Time Tax of Answering the Same Questions Every Day (`63730ec0-1c39-4f82-8edf-183a9b64e2d7`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "shimmer",
  "package_id": "63730ec0-1c39-4f82-8edf-183a9b64e2d7",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 48,
    "secondary": 64
  },
  "voice_source": "package_secondary",
  "visual_medium": "CLEAN_ILLUSTRATION",
  "voice_reasons": [
    "funnel_problem→warmth(+2)",
    "mode_humor→energy/warmth",
    "profile_NATURAL→warmth(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+48)",
    "fit_secondary(+64)"
  ],
  "product_reveal": {
    "reasons": [
      "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "FRAMED_ASSET",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: lightly playful, never exaggerated. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: lightly playful, never exaggerated. Delivery: confident, concise, not aggressive. Language: en.",
  "visual_narrative": {
    "key": "object|objects that change state across beats to tell the story",
    "version": "visual-narrative@1",
    "subject_focus": "objects that change state across beats to tell the story",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "desk": 3,
      "group": 2,
      "phone": 3,
      "laptop": 4,
      "office": 1,
      "founder": 1,
      "meeting": 1,
      "monitor": 1,
      "close_up": 4,
      "dashboard": 3,
      "prototype": 5,
      "whiteboard": 1,
      "home_office": 1,
      "person_alone": 3,
      "sticky_notes": 2,
      "product_asset": 3
    },
    "supporting_carriers": [
      "place",
      "process",
      "transformation"
    ],
    "primary_meaning_carrier": "object"
  },
  "creative_identity": {
    "key": "a clean, quiet studio-like interior|quiet tension before a decision|soft natural window daylight|slightly above table height|subject placed on the left third with breathing room|no people visible — objects and environment tell the story|warm neutral color feel",
    "mood": "quiet tension before a decision",
    "camera": "slightly above table height",
    "version": "creative-identity@1",
    "lighting": "soft natural window daylight",
    "color_feel": "warm neutral color feel",
    "option_ids": {
      "mood": "quietly_tense",
      "camera": "slightly_above_table",
      "lighting": "soft_window_daylight",
      "color_feel": "warm_neutral",
      "composition": "subject_left_third",
      "environment": "quiet_studio",
      "human_presence": "no_people"
    },
    "composition": "subject placed on the left third with breathing room",
    "environment": "a clean, quiet studio-like interior",
    "human_presence": "no people visible — objects and environment tell the story"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 2,
    "PHOTOGRAPHIC": 0,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 5,
    "TECHNICAL_BLUEPRINT": 2
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
    "TECHNICAL_BLUEPRINT:carrier_process(+1)",
    "CLEAN_ILLUSTRATION:identity_no_face(+2)",
    "TECHNICAL_BLUEPRINT:identity_objects(+1)",
    "CLEAN_ILLUSTRATION:saas_abstract(+1)",
    "TECHNICAL_BLUEPRINT:saas_system(+1)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 5,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
      "topic": "The hidden cost of 'we'll get back to you' on a contact form",
      "motifs": [
        "group",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "group",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
      "topic": "What a qualified lead actually does when your website can't answer them",
      "motifs": [
        "phone",
        "dashboard",
        "person_alone",
        "close_up"
      ],
      "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    },
    {
      "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
      "topic": "Repeating yourself every single day — and still not being available when it counts",
      "motifs": [
        "sticky_notes",
        "close_up",
        "prototype"
      ],
      "closing": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical fr",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "sticky_notes",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
      "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
      "motifs": [
        "laptop",
        "desk",
        "dashboard",
        "group",
        "product_asset"
      ],
      "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    },
    {
      "hook": "The busiest moment for your website is the one you're never around to see.",
      "topic": "Your business is closed — but your website is still getting visitors right now",
      "motifs": [
        "dashboard",
        "founder",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "dashboard",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
      "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
      "motifs": [
        "meeting",
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "meeting",
      "product_reveal_strategy": "FRAMED_ASSET"
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 0× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: The Redesigned Website That Still Couldn't Answer a Single Question (`555f5b5a-85c4-48b6-aefa-ebba2e85e4cb`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "shimmer",
  "package_id": "555f5b5a-85c4-48b6-aefa-ebba2e85e4cb",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 49,
    "secondary": 62
  },
  "voice_source": "package_secondary",
  "visual_medium": "SOFT_3D",
  "voice_reasons": [
    "funnel_problem→warmth(+2)",
    "mode_shock→energy(+3)",
    "profile_NATURAL→warmth(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+49)",
    "fit_secondary(+62)"
  ],
  "product_reveal": {
    "reasons": [
      "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "FRAMED_ASSET",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: warm and approachable. Delivery: measured, credible. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: measured, credible. Language: en.",
  "visual_narrative": {
    "key": "object|objects that change state across beats to tell the story",
    "version": "visual-narrative@1",
    "subject_focus": "objects that change state across beats to tell the story",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "desk": 2,
      "group": 2,
      "phone": 2,
      "laptop": 4,
      "founder": 1,
      "meeting": 1,
      "close_up": 3,
      "dashboard": 3,
      "prototype": 5,
      "person_alone": 4,
      "sticky_notes": 1,
      "product_asset": 3
    },
    "supporting_carriers": [
      "place",
      "process",
      "transformation"
    ],
    "primary_meaning_carrier": "object"
  },
  "creative_identity": {
    "key": "a clean, quiet studio-like interior|determined, forward-leaning energy|warm late-afternoon side light|over-the-shoulder framing|symmetrical, calm composition|hands and workspace only, no face|natural greens from plants or outdoor context",
    "mood": "determined, forward-leaning energy",
    "camera": "over-the-shoulder framing",
    "version": "creative-identity@1",
    "lighting": "warm late-afternoon side light",
    "color_feel": "natural greens from plants or outdoor context",
    "option_ids": {
      "mood": "determined",
      "camera": "over_shoulder",
      "lighting": "warm_late_afternoon",
      "color_feel": "natural_greens",
      "composition": "symmetrical_calm",
      "environment": "quiet_studio",
      "human_presence": "hands_only"
    },
    "composition": "symmetrical, calm composition",
    "environment": "a clean, quiet studio-like interior",
    "human_presence": "hands and workspace only, no face"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 2,
    "PHOTOGRAPHIC": 0,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 4,
    "TECHNICAL_BLUEPRINT": 2
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
    "TECHNICAL_BLUEPRINT:carrier_process(+1)",
    "CLEAN_ILLUSTRATION:identity_no_face(+2)",
    "TECHNICAL_BLUEPRINT:identity_objects(+1)",
    "CLEAN_ILLUSTRATION:saas_abstract(+1)",
    "TECHNICAL_BLUEPRINT:saas_system(+1)",
    "CLEAN_ILLUSTRATION:recent_repeat(-2)",
    "diversity:CLEAN_ILLUSTRATION→SOFT_3D(close_score)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 4,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
      "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
      "motifs": [
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "person_alone",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
      "topic": "The hidden cost of 'we'll get back to you' on a contact form",
      "motifs": [
        "group",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "group",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
      "topic": "What a qualified lead actually does when your website can't answer them",
      "motifs": [
        "phone",
        "dashboard",
        "person_alone",
        "close_up"
      ],
      "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    },
    {
      "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
      "topic": "Repeating yourself every single day — and still not being available when it counts",
      "motifs": [
        "sticky_notes",
        "close_up",
        "prototype"
      ],
      "closing": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical fr",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "sticky_notes",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
      "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
      "motifs": [
        "laptop",
        "desk",
        "dashboard",
        "group",
        "product_asset"
      ],
      "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    },
    {
      "hook": "The busiest moment for your website is the one you're never around to see.",
      "topic": "Your business is closed — but your website is still getting visitors right now",
      "motifs": [
        "dashboard",
        "founder",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "dashboard",
      "product_reveal_strategy": "FRAMED_ASSET"
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 0× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: The Overlooked Detail That Makes a Custom Chatbot Feel Impossible (`6ff1bcc0-2be8-412b-aec3-550d91aa8cb8`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "cedar",
  "package_id": "6ff1bcc0-2be8-412b-aec3-550d91aa8cb8",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 55,
    "secondary": 46
  },
  "voice_source": "package_primary",
  "visual_medium": "SOFT_3D",
  "voice_reasons": [
    "funnel_solution→steady/energy(+1)",
    "mode_observation→steady/warmth",
    "profile_EDITORIAL→steady/warmth",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+55)",
    "fit_secondary(+46)"
  ],
  "product_reveal": {
    "reasons": [
      "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "FRAMED_ASSET",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "cedar",
  "visual_profile": "EDITORIAL",
  "delivery_reason": "Delivery: clear, confident, practical. Delivery: thoughtful, reflective, steady pacing. Delivery: composed, insightful, measured. Delivery: confident, concise, not aggressive. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: clear, confident, practical. Delivery: thoughtful, reflective, steady pacing. Delivery: confident, concise, not aggressive. Language: en.",
  "visual_narrative": {
    "key": "process|time passing shown through process residue, not clocks with text",
    "version": "visual-narrative@1",
    "subject_focus": "time passing shown through process residue, not clocks with text",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "desk": 3,
      "group": 3,
      "phone": 2,
      "laptop": 5,
      "founder": 1,
      "meeting": 1,
      "close_up": 4,
      "overhead": 1,
      "dashboard": 3,
      "prototype": 5,
      "person_alone": 4,
      "sticky_notes": 1,
      "product_asset": 3
    },
    "supporting_carriers": [
      "object",
      "transformation",
      "place"
    ],
    "primary_meaning_carrier": "process"
  },
  "creative_identity": {
    "key": "a maker workbench with tools and materials|curious, alert attention|gentle side lighting with soft shadows|static documentary framing|subject placed on the left third with breathing room|face intentionally not visible|muted earth tones",
    "mood": "curious, alert attention",
    "camera": "static documentary framing",
    "version": "creative-identity@1",
    "lighting": "gentle side lighting with soft shadows",
    "color_feel": "muted earth tones",
    "option_ids": {
      "mood": "curious",
      "camera": "static_documentary",
      "lighting": "gentle_side_light",
      "color_feel": "muted_earth",
      "composition": "subject_left_third",
      "environment": "maker_workbench",
      "human_presence": "face_not_visible"
    },
    "composition": "subject placed on the left third with breathing room",
    "environment": "a maker workbench with tools and materials",
    "human_presence": "face intentionally not visible"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 3,
    "PHOTOGRAPHIC": 0,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 2,
    "TECHNICAL_BLUEPRINT": 1
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
    "TECHNICAL_BLUEPRINT:carrier_process(+1)",
    "CLEAN_ILLUSTRATION:saas_abstract(+1)",
    "TECHNICAL_BLUEPRINT:saas_system(+1)",
    "SOFT_3D:funnel_solution(+1)",
    "CLEAN_ILLUSTRATION:recent_repeat(-2)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 5,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "I have to admit something — I spent three months redesigning my website and never once asked what happens when a visitor needs help at midnight.",
      "topic": "The consultant whose redesigned website still couldn't answer a single visitor question",
      "motifs": [
        "laptop",
        "desk",
        "group",
        "close_up",
        "overhead"
      ],
      "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Symmetrical calm composition",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
      "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
      "motifs": [
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "person_alone",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
      "topic": "The hidden cost of 'we'll get back to you' on a contact form",
      "motifs": [
        "group",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "group",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
      "topic": "What a qualified lead actually does when your website can't answer them",
      "motifs": [
        "phone",
        "dashboard",
        "person_alone",
        "close_up"
      ],
      "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    },
    {
      "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
      "topic": "Repeating yourself every single day — and still not being available when it counts",
      "motifs": [
        "sticky_notes",
        "close_up",
        "prototype"
      ],
      "closing": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical fr",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "sticky_notes",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
      "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
      "motifs": [
        "laptop",
        "desk",
        "dashboard",
        "group",
        "product_asset"
      ],
      "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 0× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: The 2 AM Board Meeting Question (`992c82dc-d685-4253-8089-444b5d0bfbdd`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "cedar",
  "package_id": "992c82dc-d685-4253-8089-444b5d0bfbdd",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 62,
    "secondary": 48
  },
  "voice_source": "package_primary",
  "visual_medium": "SOFT_3D",
  "voice_reasons": [
    "funnel_solution→steady/energy(+1)",
    "mode_shock→energy(+3)",
    "profile_MINIMAL→steadiness(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+62)",
    "fit_secondary(+48)"
  ],
  "product_reveal": {
    "reasons": [
      "story_prefers_outcome_over_framed:place",
      "fallback:abstract_system"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "ABSTRACT_PRODUCT_SYSTEM",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "cedar",
  "visual_profile": "MINIMAL",
  "delivery_reason": "Delivery: clear, confident, practical. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: calm, uncluttered pacing. Delivery: measured, credible. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: clear, confident, practical. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: measured, credible. Language: en.",
  "visual_narrative": {
    "key": "place|environmental details that imply the pain before anyone speaks",
    "version": "visual-narrative@1",
    "subject_focus": "environmental details that imply the pain before anyone speaks",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "desk": 3,
      "group": 3,
      "phone": 2,
      "laptop": 7,
      "founder": 1,
      "close_up": 4,
      "overhead": 1,
      "dashboard": 3,
      "prototype": 5,
      "person_alone": 3,
      "sticky_notes": 1,
      "product_asset": 4
    },
    "supporting_carriers": [
      "object",
      "human",
      "metaphor"
    ],
    "primary_meaning_carrier": "place"
  },
  "creative_identity": {
    "key": "a quiet neighborhood café corner|quiet tension before a decision|cool clear morning light|close detail on hands or objects|wide frame with intentional negative space|two people at conversational distance, not posed|soft pastel accents, restrained saturation",
    "mood": "quiet tension before a decision",
    "camera": "close detail on hands or objects",
    "version": "creative-identity@1",
    "lighting": "cool clear morning light",
    "color_feel": "soft pastel accents, restrained saturation",
    "option_ids": {
      "mood": "quietly_tense",
      "camera": "close_detail",
      "lighting": "cool_morning",
      "color_feel": "soft_pastel",
      "composition": "wide_negative_space",
      "environment": "neighborhood_cafe",
      "human_presence": "two_at_distance"
    },
    "composition": "wide frame with intentional negative space",
    "environment": "a quiet neighborhood café corner",
    "human_presence": "two people at conversational distance, not posed"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 2,
    "PHOTOGRAPHIC": 1,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 1,
    "TECHNICAL_BLUEPRINT": 0
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "PHOTOGRAPHIC:carrier_place(+2)",
    "CLEAN_ILLUSTRATION:profile_minimal(+1)",
    "SOFT_3D:funnel_solution(+1)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 4,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "You keep waiting until you have the time, the budget, and the right developer — and that wait is exactly why your website answered zero questions last night.",
      "topic": "What it actually looks like when your website answers a visitor question at midnight",
      "motifs": [
        "laptop",
        "product_asset"
      ],
      "closing": "Soft polished 3D render, portrait 9:16 vertical frame. The maker workbench surface in muted earth tones. A clean laptop ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "process",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I have to admit something — I spent three months redesigning my website and never once asked what happens when a visitor needs help at midnight.",
      "topic": "The consultant whose redesigned website still couldn't answer a single visitor question",
      "motifs": [
        "laptop",
        "desk",
        "group",
        "close_up",
        "overhead"
      ],
      "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Symmetrical calm composition",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
      "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
      "motifs": [
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "person_alone",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
      "topic": "The hidden cost of 'we'll get back to you' on a contact form",
      "motifs": [
        "group",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "group",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
      "topic": "What a qualified lead actually does when your website can't answer them",
      "motifs": [
        "phone",
        "dashboard",
        "person_alone",
        "close_up"
      ],
      "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    },
    {
      "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
      "topic": "Repeating yourself every single day — and still not being available when it counts",
      "motifs": [
        "sticky_notes",
        "close_up",
        "prototype"
      ],
      "closing": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical fr",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "sticky_notes",
      "product_reveal_strategy": "FRAMED_ASSET"
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 4× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: The Reputation Tax of Looking Unavailable (`0079320c-f2b8-48ca-acda-8924c7b3c2ab`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "cedar",
  "package_id": "0079320c-f2b8-48ca-acda-8924c7b3c2ab",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 53,
    "secondary": 50
  },
  "voice_source": "package_primary",
  "visual_medium": "CLEAN_ILLUSTRATION",
  "voice_reasons": [
    "funnel_solution→steady/energy(+1)",
    "mode_observation→steady/warmth",
    "profile_NATURAL→warmth(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+51)",
    "fit_secondary(+50)",
    "soft_tie_recent_secondary(4)→primary(+2)"
  ],
  "product_reveal": {
    "reasons": [
      "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "FRAMED_ASSET",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "cedar",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: clear, confident, practical. Delivery: thoughtful, reflective, steady pacing. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: clear, confident, practical. Delivery: thoughtful, reflective, steady pacing. Delivery: confident, concise, not aggressive. Language: en.",
  "visual_narrative": {
    "key": "object|workflow artifacts: notes, cards, printouts, boards, inbox piles, tools of the trade",
    "version": "visual-narrative@1",
    "subject_focus": "workflow artifacts: notes, cards, printouts, boards, inbox piles, tools of the trade",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "cafe": 2,
      "desk": 3,
      "group": 4,
      "phone": 2,
      "laptop": 7,
      "close_up": 6,
      "overhead": 1,
      "dashboard": 2,
      "prototype": 4,
      "person_alone": 3,
      "sticky_notes": 1,
      "product_asset": 3
    },
    "supporting_carriers": [
      "place",
      "process",
      "transformation"
    ],
    "primary_meaning_carrier": "object"
  },
  "creative_identity": {
    "key": "a clean, quiet studio-like interior|curious, alert attention|gentle side lighting with soft shadows|over-the-shoulder framing|wide frame with intentional negative space|person seen from behind or as silhouette|soft pastel accents, restrained saturation",
    "mood": "curious, alert attention",
    "camera": "over-the-shoulder framing",
    "version": "creative-identity@1",
    "lighting": "gentle side lighting with soft shadows",
    "color_feel": "soft pastel accents, restrained saturation",
    "option_ids": {
      "mood": "curious",
      "camera": "over_shoulder",
      "lighting": "gentle_side_light",
      "color_feel": "soft_pastel",
      "composition": "wide_negative_space",
      "environment": "quiet_studio",
      "human_presence": "silhouette_back"
    },
    "composition": "wide frame with intentional negative space",
    "environment": "a clean, quiet studio-like interior",
    "human_presence": "person seen from behind or as silhouette"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 1,
    "PHOTOGRAPHIC": 0,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 4,
    "TECHNICAL_BLUEPRINT": 1
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
    "TECHNICAL_BLUEPRINT:carrier_process(+1)",
    "CLEAN_ILLUSTRATION:saas_abstract(+1)",
    "TECHNICAL_BLUEPRINT:saas_system(+1)",
    "SOFT_3D:funnel_solution(+1)",
    "SOFT_3D:recent_repeat(-2)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 5,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "Your website can already answer visitor questions — it just has no way to say them yet.",
      "topic": "Your website already has the answers — it just has no way to say them",
      "motifs": [
        "laptop",
        "group",
        "close_up",
        "cafe"
      ],
      "closing": "Soft polished 3D render, portrait 9:16 vertical frame. Wide establishing shot of the quiet neighborhood café corner — th",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
    },
    {
      "hook": "You keep waiting until you have the time, the budget, and the right developer — and that wait is exactly why your website answered zero questions last night.",
      "topic": "What it actually looks like when your website answers a visitor question at midnight",
      "motifs": [
        "laptop",
        "product_asset"
      ],
      "closing": "Soft polished 3D render, portrait 9:16 vertical frame. The maker workbench surface in muted earth tones. A clean laptop ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "process",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I have to admit something — I spent three months redesigning my website and never once asked what happens when a visitor needs help at midnight.",
      "topic": "The consultant whose redesigned website still couldn't answer a single visitor question",
      "motifs": [
        "laptop",
        "desk",
        "group",
        "close_up",
        "overhead"
      ],
      "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Symmetrical calm composition",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
      "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
      "motifs": [
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "person_alone",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
      "topic": "The hidden cost of 'we'll get back to you' on a contact form",
      "motifs": [
        "group",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "group",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
      "topic": "What a qualified lead actually does when your website can't answer them",
      "motifs": [
        "phone",
        "dashboard",
        "person_alone",
        "close_up"
      ],
      "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 0× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: What Happens to Your Business When Nobody's There to Answer (`6841d199-8768-4943-8253-2ff30481e61f`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "shimmer",
  "package_id": "6841d199-8768-4943-8253-2ff30481e61f",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 51,
    "secondary": 62
  },
  "voice_source": "package_secondary",
  "visual_medium": "PHOTOGRAPHIC",
  "voice_reasons": [
    "funnel_solution→steady/energy(+1)",
    "mode_story→warmth(+3)",
    "profile_NATURAL→warmth(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+51)",
    "fit_secondary(+62)"
  ],
  "product_reveal": {
    "reasons": [
      "story_prefers_outcome_over_framed:place",
      "fallback:product_outcome"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "PRODUCT_OUTCOME",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: clear, confident, practical. Delivery: warm, intimate, conversational storytelling pace. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: clear, confident, practical. Delivery: warm, intimate, conversational storytelling pace. Delivery: confident, concise, not aggressive. Language: en.",
  "visual_narrative": {
    "key": "place|a location that belongs to this product's world (not a default tech office)",
    "version": "visual-narrative@1",
    "subject_focus": "a location that belongs to this product's world (not a default tech office)",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "cafe": 2,
      "desk": 1,
      "group": 3,
      "phone": 2,
      "laptop": 5,
      "close_up": 6,
      "overhead": 1,
      "dashboard": 1,
      "prototype": 4,
      "person_alone": 4,
      "sticky_notes": 1,
      "product_asset": 2
    },
    "supporting_carriers": [
      "object",
      "human",
      "metaphor"
    ],
    "primary_meaning_carrier": "place"
  },
  "creative_identity": {
    "key": "a bright co-working space in daylight|reflective, thoughtful pause|overcast diffused daylight|close detail on hands or objects|symmetrical, calm composition|implied human presence just off-screen|warm wood surfaces and amber highlights",
    "mood": "reflective, thoughtful pause",
    "camera": "close detail on hands or objects",
    "version": "creative-identity@1",
    "lighting": "overcast diffused daylight",
    "color_feel": "warm wood surfaces and amber highlights",
    "option_ids": {
      "mood": "reflective",
      "camera": "close_detail",
      "lighting": "overcast_diffused",
      "color_feel": "warm_wood",
      "composition": "symmetrical_calm",
      "environment": "co_working_daylight",
      "human_presence": "implied_offscreen"
    },
    "composition": "symmetrical, calm composition",
    "environment": "a bright co-working space in daylight",
    "human_presence": "implied human presence just off-screen"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 1,
    "PHOTOGRAPHIC": 2,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 0,
    "TECHNICAL_BLUEPRINT": 0
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "PHOTOGRAPHIC:carrier_place(+2)",
    "SOFT_3D:funnel_solution(+1)",
    "SOFT_3D:recent_repeat(-2)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 5,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "You spent thousands making your business look professional — and then your website tells every visitor to fill out a form and wait.",
      "topic": "How a service business captures leads while the owner is in back-to-back appointments",
      "motifs": [
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean qu",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "person_alone",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Your website can already answer visitor questions — it just has no way to say them yet.",
      "topic": "Your website already has the answers — it just has no way to say them",
      "motifs": [
        "laptop",
        "group",
        "close_up",
        "cafe"
      ],
      "closing": "Soft polished 3D render, portrait 9:16 vertical frame. Wide establishing shot of the quiet neighborhood café corner — th",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
    },
    {
      "hook": "You keep waiting until you have the time, the budget, and the right developer — and that wait is exactly why your website answered zero questions last night.",
      "topic": "What it actually looks like when your website answers a visitor question at midnight",
      "motifs": [
        "laptop",
        "product_asset"
      ],
      "closing": "Soft polished 3D render, portrait 9:16 vertical frame. The maker workbench surface in muted earth tones. A clean laptop ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "process",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I have to admit something — I spent three months redesigning my website and never once asked what happens when a visitor needs help at midnight.",
      "topic": "The consultant whose redesigned website still couldn't answer a single visitor question",
      "motifs": [
        "laptop",
        "desk",
        "group",
        "close_up",
        "overhead"
      ],
      "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Symmetrical calm composition",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
      "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
      "motifs": [
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "person_alone",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
      "topic": "The hidden cost of 'we'll get back to you' on a contact form",
      "motifs": [
        "group",
        "prototype"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "group",
      "product_reveal_strategy": "FRAMED_ASSET"
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 4× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
| STATISTIC | N | N | N | partial | N | n/a | N | 0 |
| CTA | Y | Y | Y | partial | N | n/a | N | 0 |

**Pipeline trace (persisted evidence):** LLM raw response **not stored**. Stored `visual_scenes` are legacy IMAGE entries only → `normalizeVisualScenePlan` → `requested_*_count: 0` → frequency/history guardrails **not applied** → `prepareAnalyzedVisualScenesForPackage` → analyzer **image scene** pass-through only.

**Non-IMAGE absence reasons**
- CHECKLIST: **llm_chose_image** + **prompt_too_conservative** (IMAGE default instructions)
- CTA: **llm_chose_image** (spoken CTA; no typed CTA requested)
- PHONE: **not_in_prompt_ceiling** + **missing_project_signal** (mobileProductCapable false)
- QUOTE/STATISTIC: **not_in_prompt_ceiling** + **missing_approved_proof**

### Package: Before vs. After: What Your Website Does With the Same Question (`53e8f0d2-e947-4fc2-951c-092cf11a5ae3`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "tts_voice": "cedar",
  "package_id": "53e8f0d2-e947-4fc2-951c-092cf11a5ae3",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 78,
    "secondary": 48
  },
  "voice_source": "package_primary",
  "visual_medium": "TECHNICAL_BLUEPRINT",
  "voice_reasons": [
    "funnel_conversion→steadiness(+2)",
    "mode_observation→steady/warmth",
    "profile_MINIMAL→steadiness(+2)",
    "topic_steadiness_cues(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+78)",
    "fit_secondary(+48)"
  ],
  "product_reveal": {
    "reasons": [
      "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "FRAMED_ASSET",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "cedar",
  "visual_profile": "MINIMAL",
  "delivery_reason": "Delivery: confident, concise, not aggressive. Delivery: thoughtful, reflective, steady pacing. Delivery: calm, uncluttered pacing. Language: en.",
  "downgrade_rules": [],
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: confident, concise, not aggressive. Delivery: thoughtful, reflective, steady pacing. Language: en.",
  "visual_narrative": {
    "key": "object|objects that change state across beats to tell the story",
    "version": "visual-narrative@1",
    "subject_focus": "objects that change state across beats to tell the story",
    "product_world_hints": [
      "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
      "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
    ],
    "recent_motif_counts": {
      "cafe": 2,
      "desk": 2,
      "group": 4,
      "phone": 2,
      "laptop": 6,
      "close_up": 7,
      "overhead": 1,
      "dashboard": 2,
      "prototype": 2,
      "person_alone": 5,
      "sticky_notes": 1,
      "product_asset": 3
    },
    "supporting_carriers": [
      "place",
      "process",
      "transformation"
    ],
    "primary_meaning_carrier": "object"
  },
  "creative_identity": {
    "key": "a clean, quiet studio-like interior|determined, forward-leaning energy|gentle side lighting with soft shadows|over-the-shoulder framing|subject placed on the left third with breathing room|person seen from behind or as silhouette|cool neutral color feel",
    "mood": "determined, forward-leaning energy",
    "camera": "over-the-shoulder framing",
    "version": "creative-identity@1",
    "lighting": "gentle side lighting with soft shadows",
    "color_feel": "cool neutral color feel",
    "option_ids": {
      "mood": "determined",
      "camera": "over_shoulder",
      "lighting": "gentle_side_light",
      "color_feel": "cool_neutral",
      "composition": "subject_left_third",
      "environment": "quiet_studio",
      "human_presence": "silhouette_back"
    },
    "composition": "subject placed on the left third with breathing room",
    "environment": "a clean, quiet studio-like interior",
    "human_presence": "person seen from behind or as silhouette"
  },
  "history_decisions": [],
  "visual_beat_count": 4,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "visual_medium_scores": {
    "SOFT_3D": 1,
    "PHOTOGRAPHIC": 0,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 4,
    "TECHNICAL_BLUEPRINT": 2
  },
  "visual_medium_source": "auto",
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
    "TECHNICAL_BLUEPRINT:carrier_process(+1)",
    "CLEAN_ILLUSTRATION:profile_minimal(+1)",
    "CLEAN_ILLUSTRATION:saas_abstract(+1)",
    "TECHNICAL_BLUEPRINT:saas_system(+1)",
    "SOFT_3D:funnel_solution(+1)",
    "SOFT_3D:recent_repeat(-2)",
    "diversity:CLEAN_ILLUSTRATION→TECHNICAL_BLUEPRINT(close_score)"
  ],
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": null,
  "visual_profile_version": "visual-profile@3",
  "accepted_checklist_count": 0,
  "accepted_statistic_count": 0,
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "resolved_secondary_voice": "shimmer",
  "target_visual_beat_count": 5,
  "creative_identity_version": "creative-identity@1",
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
  ],
  "requested_checklist_count": 0,
  "requested_statistic_count": 0,
  "series_context_considered": true,
  "checklist_allowlist_status": "allowlisted",
  "checklist_renderer_version": null,
  "downgraded_checklist_count": 0,
  "downgraded_statistic_count": 0,
  "scene_type_diversity_notes": [],
  "statistic_renderer_version": null,
  "recent_creative_fingerprints": [
    {
      "hook": "What does your website actually do when a customer needs help and you're not there?",
      "topic": "From URL to working AI assistant — what that actually looks like step by step",
      "motifs": [
        "laptop",
        "desk",
        "sticky_notes",
        "dashboard",
        "person_alone",
        "group",
        "close_up",
        "product_asset"
      ],
      "closing": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Over-the-should",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME"
    },
    {
      "hook": "You spent thousands making your business look professional — and then your website tells every visitor to fill out a form and wait.",
      "topic": "How a service business captures leads while the owner is in back-to-back appointments",
      "motifs": [
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean qu",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "person_alone",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Your website can already answer visitor questions — it just has no way to say them yet.",
      "topic": "Your website already has the answers — it just has no way to say them",
      "motifs": [
        "laptop",
        "group",
        "close_up",
        "cafe"
      ],
      "closing": "Soft polished 3D render, portrait 9:16 vertical frame. Wide establishing shot of the quiet neighborhood café corner — th",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "place",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
    },
    {
      "hook": "You keep waiting until you have the time, the budget, and the right developer — and that wait is exactly why your website answered zero questions last night.",
      "topic": "What it actually looks like when your website answers a visitor question at midnight",
      "motifs": [
        "laptop",
        "product_asset"
      ],
      "closing": "Soft polished 3D render, portrait 9:16 vertical frame. The maker workbench surface in muted earth tones. A clean laptop ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "process",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "I have to admit something — I spent three months redesigning my website and never once asked what happens when a visitor needs help at midnight.",
      "topic": "The consultant whose redesigned website still couldn't answer a single visitor question",
      "motifs": [
        "laptop",
        "desk",
        "group",
        "close_up",
        "overhead"
      ],
      "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Symmetrical calm composition",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "FRAMED_ASSET"
    },
    {
      "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
      "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
      "motifs": [
        "person_alone"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "cta_composition_id": null,
      "dominant_subject_motif": "person_alone",
      "product_reveal_strategy": "FRAMED_ASSET"
    }
  ]
}
```

**History at generation (recomputed now, exclude this package)**
```json
{
  "recentPackageCount": 12,
  "lastPackageSpecialTypes": [],
  "weeklyStrategySpecialTypes": [],
  "ctaUsedInRecentWindow": false,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only | IMAGE-only."
}
```


| Type | Prompt-permitted | Project-permitted | Payload available | Narratively suitable | LLM requested | Analyzer accepted | Guardrail suppressed | Final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 0× IMAGE |
| CHECKLIST | Y | Y | N | partial | N | n/a | N | 0 |
| PHONE | Y | Y | N | partial | N | n/a | N | 0 |
| QUOTE | Y | Y | N | partial | N | n/a | N | 0 |
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

### Job c4257dca-c607-48fd-ad0d-3c1626af24fa

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | observation | scene-1 | ATTENTION | zoom_in |  |  | partial |
| 2 | observation | scene-2 | EXPLAIN | static |  |  | partial |
| 3 | meaning | scene-3 | EXPLAIN | drift_down |  |  | partial |
| 4 | meaning | scene-4 | EXPLAIN | static |  |  | partial |
| 5 | reveal | scene-1 | REVEAL | drift_up |  |  | partial |
| 6 | reveal | scene-2 | REVEAL | zoom_out |  |  | partial |
| 7 | cta | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job 8c668ff5-9b63-4e8a-9640-0157befeafc4

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | setup | scene-1 | EXPLAIN | drift_down |  |  | partial |
| 2 | setup | scene-2 | EXPLAIN | drift_up |  |  | partial |
| 3 | conflict | scene-3 | EXPLAIN | drift_down |  |  | partial |
| 4 | conflict | scene-4 | EXPLAIN | drift_up |  |  | partial |
| 5 | twist | scene-1 | REVEAL | zoom_out |  |  | partial |
| 6 | resolution | scene-2 | CLOSE | static |  |  | partial |
| 7 | resolution | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job 43fd4129-a4cc-49fc-879e-b3e64346d3e1

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | observation | scene-1 | ATTENTION | zoom_in |  |  | partial |
| 2 | observation | scene-2 | EXPLAIN | drift_up |  |  | partial |
| 3 | meaning | scene-3 | EXPLAIN | drift_down |  |  | partial |
| 4 | meaning | scene-4 | EXPLAIN | drift_up |  |  | partial |
| 5 | reveal | scene-1 | REVEAL | zoom_out |  |  | partial |
| 6 | reveal | scene-2 | REVEAL | drift_up |  |  | partial |
| 7 | cta | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job b2561f42-e709-4f8e-bb29-1f76db60af22

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | unexpected_fact | scene-1 | ATTENTION | zoom_in |  |  | partial |
| 2 | unexpected_fact | scene-2 | EXPLAIN | static |  |  | partial |
| 3 | implication | scene-3 | EXPLAIN | drift_down |  |  | partial |
| 4 | implication | scene-4 | EXPLAIN | static |  |  | partial |
| 5 | proof | scene-1 | EMPHASIS | zoom_in |  |  | partial |
| 6 | proof | scene-2 | EMPHASIS | static |  |  | partial |
| 7 | cta | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job 19f5386b-62fd-4cb6-9ed5-dd9f073228ad

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | observation | scene-1 | ATTENTION | zoom_in |  |  | partial |
| 2 | observation | scene-2 | EXPLAIN | pan_left |  |  | partial |
| 3 | meaning | scene-3 | EXPLAIN | pan_right |  |  | partial |
| 4 | meaning | scene-4 | EXPLAIN | pan_left |  |  | partial |
| 5 | reveal | scene-1 | REVEAL | drift_up |  |  | partial |
| 6 | reveal | scene-2 | REVEAL | zoom_out |  |  | partial |
| 7 | cta | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job 58c46521-df88-4a03-92cd-9e2829baf67d

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | unexpected_fact | scene-1 | ATTENTION | zoom_in |  |  | partial |
| 2 | unexpected_fact | scene-2 | EXPLAIN | drift_up |  |  | partial |
| 3 | implication | scene-3 | EXPLAIN | drift_down |  |  | partial |
| 4 | implication | scene-4 | EXPLAIN | drift_up |  |  | partial |
| 5 | proof | scene-1 | EMPHASIS | zoom_in |  |  | partial |
| 6 | proof | scene-2 | EMPHASIS | static |  |  | partial |
| 7 | cta | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job 69df165a-0e05-48d6-9c17-b726a4d51295

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | situation | scene-1 | ATTENTION | zoom_in |  |  | partial |
| 2 | situation | scene-2 | EXPLAIN | drift_up |  |  | partial |
| 3 | unexpected_turn | scene-3 | REVEAL | zoom_out |  |  | partial |
| 4 | unexpected_turn | scene-4 | REVEAL | drift_up |  |  | partial |
| 5 | punchline | scene-1 | EMPHASIS | zoom_in |  |  | partial |
| 6 | punchline | scene-2 | EMPHASIS | static |  |  | partial |
| 7 | cta | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job d2c498fc-8e8f-417d-b4d8-6527fd658a4a

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | situation | scene-1 | ATTENTION | zoom_in |  |  | partial |
| 2 | situation | scene-2 | EXPLAIN | drift_up |  |  | partial |
| 3 | unexpected_turn | scene-3 | REVEAL | zoom_out |  |  | partial |
| 4 | unexpected_turn | scene-4 | REVEAL | drift_up |  |  | partial |
| 5 | punchline | scene-1 | EMPHASIS | zoom_in |  |  | partial |
| 6 | punchline | scene-2 | EMPHASIS | static |  |  | partial |
| 7 | cta | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job 9d4d86a0-7078-4838-b350-4266d21eadfd

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | observation | scene-1 | ATTENTION | zoom_in |  |  | partial |
| 2 | observation | scene-2 | EXPLAIN | drift_up |  |  | partial |
| 3 | meaning | scene-3 | EXPLAIN | drift_down |  |  | partial |
| 4 | meaning | scene-4 | EXPLAIN | drift_up |  |  | partial |
| 5 | reveal | scene-5 | REVEAL | zoom_out |  |  | partial |
| 6 | reveal | scene-1 | REVEAL | drift_up |  |  | partial |
| 7 | cta | scene-2 | CLOSE | static |  |  | partial |
| 8 | cta | scene-3 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job bffefd85-2e62-469a-999f-cc846b1d5bcf

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | observation | scene-1 | ATTENTION | zoom_in | ATTENTION | zoom_in | yes |
| 2 | observation | scene-2 | EXPLAIN | drift_up | EXPLAIN | drift_up | yes |
| 3 | observation | scene-3 | EXPLAIN | drift_down | EXPLAIN | drift_down | yes |
| 4 | meaning | scene-4 | EXPLAIN | drift_up | REVEAL | drift_up | partial |
| 5 | meaning | scene-1 | EXPLAIN | drift_down | CLOSE | static | partial |
| 6 | reveal | scene-2 | REVEAL | drift_up |  |  | partial |
| 7 | reveal | scene-3 | REVEAL | zoom_out |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |
| 9 | cta | scene-1 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job 856970e0-3e17-4382-b362-953e7a2acb25

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | common_belief | scene-1 | EXPLAIN | drift_down | EXPLAIN | drift_down | yes |
| 2 | common_belief | scene-2 | EXPLAIN | drift_up | EXPLAIN | drift_up | yes |
| 3 | why_wrong | scene-3 | EXPLAIN | drift_down | EXPLAIN | drift_down | yes |
| 4 | why_wrong | scene-4 | EXPLAIN | drift_up | EMPHASIS | zoom_in | partial |
| 5 | proof | scene-1 | EMPHASIS | zoom_in | CLOSE | static | partial |
| 6 | proof | scene-2 | EMPHASIS | static |  |  | partial |
| 7 | cta | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job b072e3a5-06b0-4cc2-9e39-cd6983c8cc27

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | setup | scene-1 | EXPLAIN | drift_down | EXPLAIN | drift_down | yes |
| 2 | setup | scene-2 | EXPLAIN | drift_up | EXPLAIN | drift_up | yes |
| 3 | conflict | scene-3 | EXPLAIN | drift_down | REVEAL | zoom_out | partial |
| 4 | conflict | scene-4 | EXPLAIN | drift_up | HOLD | static | partial |
| 5 | twist | scene-1 | REVEAL | zoom_out | HOLD | static | partial |
| 6 | resolution | scene-2 | CLOSE | static |  |  | partial |
| 7 | resolution | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job 5bb001b0-014d-4ac2-ad04-cf97882f5bef

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | situation | scene-1 | ATTENTION | zoom_in | ATTENTION | zoom_in | yes |
| 2 | situation | scene-2 | EXPLAIN | drift_up | EXPLAIN | drift_up | yes |
| 3 | unexpected_turn | scene-3 | REVEAL | zoom_out | REVEAL | zoom_out | yes |
| 4 | unexpected_turn | scene-4 | REVEAL | drift_up | EMPHASIS | zoom_in | partial |
| 5 | punchline | scene-1 | EMPHASIS | zoom_in | CLOSE | static | partial |
| 6 | punchline | scene-2 | EMPHASIS | static |  |  | partial |
| 7 | cta | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

- **Hook / observation → EXPLAIN:** `roleDefaultIntent()` has no case for `observation` → default EXPLAIN (**resolver_logic_issue** vs product intent for ATTENTION).
- **CTA role on last beat:** When mapped to storyboard role `cta`, intent **CLOSE** + primitive **static** (see last beat).
- **scene-1 reuse:** `explicit_scene_plan` + 4 scenes & 5 beats → `beatIndex % n` (**working_as_designed** in `sceneIdForStoryboardBeat`).

### Job d53c5755-adba-46f1-987c-2fd296c9b636

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | observation | scene-1 | ATTENTION | zoom_in | ATTENTION | zoom_in | yes |
| 2 | observation | scene-2 | EXPLAIN | drift_up | EXPLAIN | drift_up | yes |
| 3 | observation | scene-3 | EXPLAIN | drift_down | HOLD | static | partial |
| 4 | meaning | scene-4 | EXPLAIN | drift_up | REVEAL | drift_up | partial |
| 5 | meaning | scene-1 | EXPLAIN | drift_down | CLOSE | static | partial |
| 6 | reveal | scene-2 | REVEAL | drift_up |  |  | partial |
| 7 | reveal | scene-3 | REVEAL | zoom_out |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |
| 9 | cta | scene-1 | CLOSE | static |  |  | partial |

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
  "image_pass_through_decisions": 57,
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
    "value": "auto",
    "label": "Automatic (recommended)"
  },
  {
    "value": "alloy",
    "label": "Alloy"
  },
  {
    "value": "ash",
    "label": "Ash"
  },
  {
    "value": "ballad",
    "label": "Ballad"
  },
  {
    "value": "coral",
    "label": "Coral"
  },
  {
    "value": "echo",
    "label": "Echo"
  },
  {
    "value": "fable",
    "label": "Fable"
  },
  {
    "value": "onyx",
    "label": "Onyx"
  },
  {
    "value": "nova",
    "label": "Nova"
  },
  {
    "value": "sage",
    "label": "Sage"
  },
  {
    "value": "shimmer",
    "label": "Shimmer"
  },
  {
    "value": "verse",
    "label": "Verse"
  },
  {
    "value": "marin",
    "label": "Marin"
  },
  {
    "value": "cedar",
    "label": "Cedar"
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
