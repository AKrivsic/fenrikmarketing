# Decision Audit — Production Run `4ab75071-2a9d-4134-bfb7-050b395e98b9`

_Read-only. Generated 2026-07-17T06:46:04.791Z._

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
| a557c8d4-f3e6-46aa-a053-9ba8da71dc25 | shimmer | legacy_default_alloy | no | no |

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

### Package: The HVAC company that got slammed with website traffic during a heatwave — and lost every single online lead (`90741dd0-2704-462e-8998-d29a0dfdbd8e`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "attention": {
    "opening": {
      "emotional_effect": "frustration",
      "opening_delivery": "deadpan",
      "opening_structure": "immediate_reaction",
      "first_motion_intent": "ATTENTION",
      "land_within_seconds": [
        1,
        1.8
      ],
      "first_spoken_guidance": "Open with an immediate reaction using Frustration — not context or setup. The first spoken thought should land in ~1.0–1.8 seconds (one short phrase, or two very short phrases). The stored hook MUST be the same thought as the first spoken line — do not dilute a strong hook into a weaker voiceover setup. Open on the felt annoyance — specific, not abstract. Narrative seed: Unexpected but relevant: Open on the felt annoyance — specific, not abstract. Keep the link to Dramatize the moment a small service business is overwhelmed with phone calls while their website silently turns away visitor after visitor who needed answers and moved on to a competitor — exposing the real cost of having no one available to handle online inquiries when demand spikes / Unable to answer customer questions when offline clear by the next beat.",
      "first_visual_guidance": "The first visual is an attention event, not a sentence illustration. Emotional action of frustration with a clear cause — not calm desk staring. Preferred opening visual concept: Same notification stacking: \"nice — now do five more\" after finishing one Fenrik.chat post Do not default to calm desks, empty boards, laptop+coffee, or faceless screen-staring unless that is genuinely the strongest idea. Render coherently via Visual Narrative / Medium / Profile / Identity — attention chooses the idea, those systems choose the look.",
      "first_subtitle_guidance": "First subtitle mirrors the first spoken thought — same words, no softer paraphrase.",
      "align_hook_with_first_spoken": true
    },
    "sfx_gain": 0,
    "sfx_reason": "omitted_optional_no_pressure",
    "sfx_source": "omitted_no_fit",
    "originality": {
      "candidates": [
        {
          "id": "obvious",
          "scores": {
            "novelty": 1,
            "relevance": 7,
            "visual_clarity": 7,
            "recognisability": 8,
            "what_happens_next": 2,
            "emotional_reaction": 3
          },
          "rejected": true,
          "reject_reasons": [
            "office_cliche:\\bcalm\\s+desk\\b",
            "first_obvious_idea",
            "visual_story:office_cliche_backslide"
          ],
          "visual_concept": "Calm desk frustration: someone staring at a laptop surrounded by sticky notes about Unable to answer customer questions when offline"
        },
        {
          "id": "less_obvious",
          "scores": {
            "novelty": 6,
            "relevance": 8,
            "visual_clarity": 7,
            "recognisability": 7,
            "what_happens_next": 7,
            "emotional_reaction": 7
          },
          "rejected": false,
          "reject_reasons": [],
          "visual_concept": "A phone screen filling with \"do it five more times\" after celebrating one finished post about Unable to answer customer questions when offline"
        },
        {
          "id": "unexpected",
          "scores": {
            "novelty": 9,
            "relevance": 7,
            "visual_clarity": 6,
            "recognisability": 6,
            "what_happens_next": 9,
            "emotional_reaction": 9
          },
          "rejected": false,
          "reject_reasons": [],
          "visual_concept": "Same notification stacking: \"nice — now do five more\" after finishing one Fenrik.chat post"
        }
      ],
      "reject_summary": [
        "obvious:office_cliche:\\bcalm\\s+desk\\b",
        "obvious:first_obvious_idea",
        "obvious:visual_story:office_cliche_backslide"
      ],
      "selected_candidate_id": "unexpected",
      "selected_narrative_seed": "Unexpected but relevant: Open on the felt annoyance — specific, not abstract. Keep the link to Dramatize the moment a small service business is overwhelmed with phone calls while their website silently turns away visitor after visitor who needed answers and moved on to a competitor — exposing the real cost of having no one available to handle online inquiries when demand spikes / Unable to answer customer questions when offline clear by the next beat.",
      "selected_visual_concept": "Same notification stacking: \"nice — now do five more\" after finishing one Fenrik.chat post",
      "selected_emotional_effect": "frustration"
    },
    "delivery_arc": {
      "phases": [
        {
          "phase": "opening",
          "delivery": "Opening: dry deadpan; let the line land before lifting."
        },
        {
          "phase": "body",
          "delivery": "Body: conversational, varied rhythm — do not stay at opening energy."
        },
        {
          "phase": "emphasis",
          "delivery": "Emphasis: slight lift on the key turn or insight line."
        },
        {
          "phase": "pause_before_reveal",
          "delivery": "Brief pause before the reveal, punchline, or payoff."
        },
        {
          "phase": "payoff",
          "delivery": "Payoff: Empathetic frustration with the problem, never at the viewer."
        },
        {
          "phase": "close",
          "delivery": "Close: satisfying landing; CTA only if present, never aggressive."
        }
      ],
      "reasons": [
        "opening_style:deadpan",
        "mechanism:FRUSTRATION",
        "full_arc_not_opening_only"
      ],
      "version": "delivery-arc@1",
      "tts_instruction_fragment": "Opening: dry deadpan; let the line land before lifting. Then settle into conversational body delivery. Vary emphasis; pause before the reveal or punchline. Do not read every line at the same energy. Empathetic frustration with the problem, never at the viewer."
    },
    "sfx_category": null,
    "sfx_selected": false,
    "sfx_timing_ms": null,
    "attention_source": "deterministic_v1",
    "attention_reasons": [
      "selected:FRUSTRATION",
      "source:deterministic_v1",
      "funnel_soft_affinity:problem_aware:3",
      "creative_mode_soft_affinity:contrarian:0",
      "topic_signals_frustration",
      "independent_of_funnel_mapping"
    ],
    "attention_version": "attention@1",
    "opening_structure": "immediate_reaction",
    "attention_mechanism": "FRUSTRATION",
    "opening_visual_motif": "same_notification_stacking_nice_five_more",
    "sfx_render_supported": true,
    "opening_emotional_effect": "frustration"
  },
  "tts_voice": "shimmer",
  "package_id": "90741dd0-2704-462e-8998-d29a0dfdbd8e",
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
      "story_prefers_outcome_over_framed:human",
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
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: measured, credible. Opening: dry deadpan; let the line land before lifting. Then settle into conversational body delivery. Vary emphasis;",
  "visual_narrative": {
    "key": "human|a specific role from the audience in a readable emotional moment (waiting, leaving, choosing, reacting)",
    "version": "visual-narrative@1.1",
    "subject_focus": "a specific role from the audience in a readable emotional moment (waiting, leaving, choosing, reacting)",
    "metaphor_policy": "understandable_preferred",
    "director_version": "visual-story-director@1",
    "storytelling_mode": "situation_first",
    "product_world_hints": [
      "Digital assistant world (meaning, not scenery): film unanswered visitors, people waiting for a reply, someone walking away, after-hours silence becoming answered — NOT automatic storefronts, NOT dashboards, NOT abstract boats/notebooks standing in for visitors.",
      "Agency world: client conversations, missed follow-ups, collaborative tension — situations first, workshop props only when they are part of the event.",
      "Product Brain constrains MEANING (who hurts, what changed), not scenery. Do not force browser UI, dashboards, or physical stores unless that situation is truly strongest."
    ],
    "recent_motif_counts": {
      "cafe": 2,
      "desk": 2,
      "group": 4,
      "laptop": 6,
      "close_up": 6,
      "overhead": 1,
      "dashboard": 1,
      "prototype": 4,
      "person_alone": 4,
      "sticky_notes": 1,
      "product_asset": 3
    },
    "supporting_carriers": [
      "place",
      "process",
      "comparison"
    ],
    "primary_meaning_carrier": "human",
    "reject_abstract_riddles": true,
    "preferred_situation_framing": "Situation first: film a person walking away unanswered / waiting for a reply — NOT a paper boat, closed notebook, or abstract prop standing in for the visitor."
  },
  "creative_identity": {
    "key": "a clean, quiet studio-like interior|quiet optimism|cool clear morning light|slightly above table height|foreground framing element (door, shelf, plant)|two people at conversational distance, not posed|warm wood surfaces and amber highlights",
    "mood": "quiet optimism",
    "camera": "slightly above table height",
    "version": "creative-identity@1",
    "lighting": "cool clear morning light",
    "color_feel": "warm wood surfaces and amber highlights",
    "option_ids": {
      "mood": "optimistic",
      "camera": "slightly_above_table",
      "lighting": "cool_morning",
      "color_feel": "warm_wood",
      "composition": "foreground_frame",
      "environment": "quiet_studio",
      "human_presence": "two_at_distance"
    },
    "composition": "foreground framing element (door, shelf, plant)",
    "environment": "a clean, quiet studio-like interior",
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
    "SOFT_3D": 0,
    "PHOTOGRAPHIC": 3,
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
    "PHOTOGRAPHIC:carrier_human(+3)",
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
      "hook": "You can preview your AI assistant live — no sign-up, no setup — and most business owners still haven't done it.",
      "topic": "Try it on your own website before you decide anything",
      "motifs": [
        "person_alone",
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
      "sfx_category": null,
      "creative_mode": null,
      "visual_medium": "TECHNICAL_BLUEPRINT",
      "meaning_carrier": "object",
      "opening_structure": null,
      "cta_composition_id": null,
      "attention_mechanism": null,
      "opening_visual_motif": null,
      "dominant_subject_motif": "person_alone",
      "product_reveal_strategy": "FRAMED_ASSET",
      "opening_emotional_effect": null
    },
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
      "sfx_category": null,
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "place",
      "opening_structure": null,
      "cta_composition_id": null,
      "attention_mechanism": null,
      "opening_visual_motif": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME",
      "opening_emotional_effect": null
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
      "sfx_category": null,
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "object",
      "opening_structure": null,
      "cta_composition_id": null,
      "attention_mechanism": null,
      "opening_visual_motif": null,
      "dominant_subject_motif": "person_alone",
      "product_reveal_strategy": "FRAMED_ASSET",
      "opening_emotional_effect": null
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
      "sfx_category": null,
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "place",
      "opening_structure": null,
      "cta_composition_id": null,
      "attention_mechanism": null,
      "opening_visual_motif": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
      "opening_emotional_effect": null
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
      "sfx_category": null,
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "process",
      "opening_structure": null,
      "cta_composition_id": null,
      "attention_mechanism": null,
      "opening_visual_motif": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "FRAMED_ASSET",
      "opening_emotional_effect": null
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
      "sfx_category": null,
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "object",
      "opening_structure": null,
      "cta_composition_id": null,
      "attention_mechanism": null,
      "opening_visual_motif": null,
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "FRAMED_ASSET",
      "opening_emotional_effect": null
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

### Primary questions — Scene types

- **Did LLM see CHECKLIST/CTA?** Yes (persisted `prompt_presentation_types`).
- **PHONE/QUOTE/STATISTIC in prompt?** No — ceiling excluded them.
- **Schema silently dropping typed scenes?** No evidence — nothing typed in stored output.
- **IMAGE-first conservative?** Yes — explicit in `presentationGeneration.ts`.

## Part 4 — Semantic Motion decision audit

### Job a557c8d4-f3e6-46aa-a053-9ba8da71dc25

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | common_belief | scene-1 | EXPLAIN | drift_down | ATTENTION | zoom_in | partial |
| 2 | common_belief | scene-2 | EXPLAIN | drift_up | EXPLAIN | drift_up | yes |
| 3 | why_wrong | scene-3 | EXPLAIN | drift_down | EXPLAIN | drift_down | yes |
| 4 | why_wrong | scene-4 | EXPLAIN | drift_up | HOLD | static | partial |
| 5 | proof | scene-1 | EMPHASIS | zoom_in | HOLD | static | partial |
| 6 | proof | scene-2 | EMPHASIS | static |  |  | partial |
| 7 | cta | scene-3 | CLOSE | static |  |  | partial |
| 8 | cta | scene-4 | CLOSE | static |  |  | partial |

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
  "image_pass_through_decisions": 4,
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
