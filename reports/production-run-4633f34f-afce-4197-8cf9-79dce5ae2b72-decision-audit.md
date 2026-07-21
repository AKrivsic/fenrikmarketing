# Decision Audit — Production Run `4633f34f-afce-4197-8cf9-79dce5ae2b72`

_Read-only. Generated 2026-07-18T20:11:43.922Z._

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
| 47c1e1d9-dbf5-4051-b37b-2e84f879a9fa | shimmer | legacy_default_alloy | no | no |

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

### Package: The beauty salon that found five unread visitor questions on Tuesday — and no way to reach any of them (`ba3d2e09-1023-4f74-9575-7007c8ed07c0`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "attention": {
    "opening": {
      "emotional_effect": "curiosity",
      "opening_delivery": "urgent",
      "opening_structure": "sudden_reveal",
      "first_motion_intent": "REVEAL",
      "land_within_seconds": [
        1,
        1.8
      ],
      "first_spoken_guidance": "Open with an immediate reaction using Curiosity Gap — not context or setup. The first spoken thought should land in ~1.0–1.8 seconds (one short phrase, or two very short phrases). The stored hook MUST be the same thought as the first spoken line — do not dilute a strong hook into a weaker voiceover setup. First line withholds the answer on purpose; body earns the reveal. Narrative seed: Unexpected but relevant: First line withholds the answer on purpose; body earns the reveal. Keep the link to A salon owner opens her website analytics on a Tuesday morning and sees that five people browsed her services page over the weekend, spent time on the booking section, and left without filling out a single form. No names, no emails, no phone numbers — just sessions that ended in silence. The hook dramatizes the specific moment she realizes those weren't just bounces; they were real people ready to book, who had a question she was never there to answer. The content walks through why a static website with a contact form is not the same as being available, and why visitors with an unanswered question almost never come back. / Unable to answer customer questions when offline clear by the next beat.",
      "first_visual_guidance": "The first visual is an attention event, not a sentence illustration. A frame that raises a question — incomplete action, covered result, interrupted moment. Preferred opening visual concept: A door cracked open onto the unfinished half of a Fenrik.chat story Do not default to calm desks, empty boards, laptop+coffee, or faceless screen-staring unless that is genuinely the strongest idea. Render coherently via Visual Narrative / Medium / Profile / Identity — attention chooses the idea, those systems choose the look.",
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
            "office_cliche:\\blaptop\\s+and\\s+coffee\\b",
            "first_obvious_idea",
            "visual_story:office_cliche_backslide"
          ],
          "visual_concept": "A modern office desk with laptop and coffee illustrating A salon owner opens her website analytics on a Tuesday morning and sees that five people browsed her services page over the weekend, spent time on the booking section, and left without filling out a single form. No names, no emails, no phone numbers — just sessions that ended in silence. The hook dramatizes the specific moment she realizes those weren't just bounces; they were real people ready to book, who had a question she was never there to answer. The content walks through why a static website with a contact form is not the same as being available, and why visitors with an unanswered question almost never come back."
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
          "visual_concept": "A concrete human moment from Fenrik.chat that makes Unable to answer customer questions when offline visible in one glance"
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
          "visual_concept": "A door cracked open onto the unfinished half of a Fenrik.chat story"
        }
      ],
      "reject_summary": [
        "obvious:office_cliche:\\blaptop\\s+and\\s+coffee\\b",
        "obvious:first_obvious_idea",
        "obvious:visual_story:office_cliche_backslide"
      ],
      "selected_candidate_id": "unexpected",
      "selected_narrative_seed": "Unexpected but relevant: First line withholds the answer on purpose; body earns the reveal. Keep the link to A salon owner opens her website analytics on a Tuesday morning and sees that five people browsed her services page over the weekend, spent time on the booking section, and left without filling out a single form. No names, no emails, no phone numbers — just sessions that ended in silence. The hook dramatizes the specific moment she realizes those weren't just bounces; they were real people ready to book, who had a question she was never there to answer. The content walks through why a static website with a contact form is not the same as being available, and why visitors with an unanswered question almost never come back. / Unable to answer customer questions when offline clear by the next beat.",
      "selected_visual_concept": "A door cracked open onto the unfinished half of a Fenrik.chat story",
      "selected_emotional_effect": "curiosity"
    },
    "delivery_arc": {
      "phases": [
        {
          "phase": "opening",
          "delivery": "Opening: alert, clipped first phrase — not shouted."
        },
        {
          "phase": "body",
          "delivery": "Body: conversational contrast — short sentences, not one long equally-paced paragraph."
        },
        {
          "phase": "emphasis",
          "delivery": "Emphasis: slight lift on the key turn, contradiction, or insight line."
        },
        {
          "phase": "pause_before_reveal",
          "delivery": "Brief pause before the reveal, punchline, or payoff."
        },
        {
          "phase": "payoff",
          "delivery": "Payoff: Curious, conspiratorial lean-in."
        },
        {
          "phase": "close",
          "delivery": "Close: satisfying landing; CTA only if present, never aggressive."
        }
      ],
      "reasons": [
        "opening_style:urgent",
        "mechanism:CURIOSITY_GAP",
        "full_arc_not_opening_only",
        "spoken_rhythm_contrast_pause_emphasis"
      ],
      "version": "delivery-arc@1",
      "tts_instruction_fragment": "Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Use spoken rhythm: short sentences, contrast, and a brief pause before the reveal. Emphasize the turn or punchline — do not read every clause at the same energy. Avoid long equally-paced paragraphs; land one idea per breath. Curious, conspiratorial lean-in."
    },
    "sfx_category": null,
    "sfx_selected": false,
    "sfx_timing_ms": null,
    "attention_source": "deterministic_v1",
    "attention_reasons": [
      "selected:CURIOSITY_GAP",
      "source:deterministic_v1",
      "funnel_soft_affinity:problem_aware:1",
      "creative_mode_soft_affinity:observation:1",
      "topic_signals_curiosity",
      "independent_of_funnel_mapping"
    ],
    "attention_version": "attention@1",
    "opening_structure": "sudden_reveal",
    "attention_mechanism": "CURIOSITY_GAP",
    "opening_visual_motif": "door_cracked_open_onto_unfinished_half",
    "sfx_render_supported": true,
    "opening_emotional_effect": "curiosity"
  },
  "tts_voice": "shimmer",
  "package_id": "ba3d2e09-1023-4f74-9575-7007c8ed07c0",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 46,
    "secondary": 56
  },
  "voice_source": "package_secondary",
  "visual_medium": "SOFT_3D",
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
      "story_prefers_outcome_over_framed:human",
      "fallback:abstract_system"
    ],
    "version": "product-reveal@2",
    "solution_beat_strategy": "ABSTRACT_PRODUCT_SYSTEM",
    "sample_payoff_visual_required": false
  },
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: thoughtful, reflective, steady pacing. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
  "downgrade_rules": [],
  "narrative_beats": {
    "beats": [
      {
        "role": "HOOK",
        "whatChanged": "",
        "whyContinue": "What happens to the person in: Urgent question dies in silence?",
        "sourceFields": [
          "openingSituation",
          "hookLine",
          "expectedViewerQuestion"
        ],
        "viewerLearns": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; r…",
        "comprehension": {
          "viewer_question": "What happens to the person in: Urgent question dies in silence?",
          "viewer_expectation": "The explanation is coming.",
          "viewer_understands": "Something unusual is happening: Handheld urgency"
        },
        "informationKey": "anomaly|open|handheld_urgency_close_customer",
        "modeBeatLabels": [
          "observation"
        ]
      },
      {
        "role": "SETUP",
        "whatChanged": "From cold open to the established problem world (tension).",
        "whyContinue": "Stakes become clear — Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on…",
        "sourceFields": [
          "storyProgression",
          "coreIdea",
          "emotionalReaction"
        ],
        "viewerLearns": "Hold the opening situation → widen to peak demand overload",
        "comprehension": {
          "viewer_question": "Why is this happening / what does it cost?",
          "viewer_expectation": "Someone should solve this — or stakes will rise.",
          "viewer_understands": "The problem is: Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor…"
        },
        "informationKey": "problem_named|open|hold_opening_situation_widen",
        "modeBeatLabels": [
          "meaning"
        ]
      },
      {
        "role": "ESCALATION",
        "whatChanged": "Failure / consequence deepens — not a restatement of the setup.",
        "whyContinue": "Viewer needs the fix: AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "sourceFields": [
          "storyProgression",
          "visualPromise",
          "productConnection"
        ],
        "viewerLearns": "reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what hu…",
        "comprehension": {
          "viewer_question": "Can this be fixed?",
          "viewer_expectation": "Show the solution.",
          "viewer_understands": "The business is losing opportunities: reveal Unable to answer customer questions when offline (every unanswered online lead walks to a comp…"
        },
        "informationKey": "cost_rising|open|reveal_unable_answer_customer",
        "modeBeatLabels": [
          "reveal"
        ]
      },
      {
        "role": "RESOLUTION",
        "whatChanged": "Problem turns into solution / outcome: Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "whyContinue": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "sourceFields": [
          "productConnection",
          "ending"
        ],
        "viewerLearns": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "comprehension": {
          "viewer_question": "none",
          "viewer_expectation": "Finished.",
          "viewer_understands": "The product solves this: AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's h…"
        },
        "informationKey": "solution_shown|closed|chatbot_platform_websites_handles",
        "modeBeatLabels": [
          "cta"
        ]
      }
    ],
    "version": "narrative-beats@1.1",
    "timeline_debug": {
      "version": "narrative-timeline-debug@1",
      "timeline": [
        {
          "role": "HOOK",
          "index": 0,
          "share": 0.192,
          "sceneSummary": "Soft polished 3D render, portrait 9:16 vertical frame, urban gray-blue ambient palette, overcast diffused daylight, qui…",
          "comprehension": {
            "viewer_question": "What happens to the person in: Urgent question dies in silence?",
            "viewer_expectation": "The explanation is coming.",
            "viewer_understands": "Something unusual is happening: Handheld urgency"
          },
          "informationKey": "anomaly|open|handheld_urgency_close_customer",
          "durationSeconds": 4.79
        },
        {
          "role": "SETUP",
          "index": 1,
          "share": 0.288,
          "sceneSummary": "Soft polished 3D render, portrait 9:16 vertical frame, urban gray-blue ambient palette, overcast diffused daylight, qui…",
          "comprehension": {
            "viewer_question": "Why is this happening / what does it cost?",
            "viewer_expectation": "Someone should solve this — or stakes will rise.",
            "viewer_understands": "The problem is: Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor…"
          },
          "informationKey": "problem_named|open|hold_opening_situation_widen",
          "durationSeconds": 7.19
        },
        {
          "role": "ESCALATION",
          "index": 2,
          "share": 0.315,
          "sceneSummary": "Soft polished 3D render, portrait 9:16 vertical frame, urban gray-blue ambient palette, overcast diffused daylight, qui…",
          "comprehension": {
            "viewer_question": "Can this be fixed?",
            "viewer_expectation": "Show the solution.",
            "viewer_understands": "The business is losing opportunities: reveal Unable to answer customer questions when offline (every unanswered online lead walks to a comp…"
          },
          "informationKey": "cost_rising|open|reveal_unable_answer_customer",
          "durationSeconds": 7.88
        },
        {
          "role": "RESOLUTION",
          "index": 3,
          "share": 0.206,
          "sceneSummary": "Soft polished 3D render, portrait 9:16 vertical frame, urban gray-blue ambient palette, overcast diffused daylight, qui…",
          "comprehension": {
            "viewer_question": "none",
            "viewer_expectation": "Finished.",
            "viewer_understands": "The product solves this: AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's h…"
          },
          "informationKey": "solution_shown|closed|chatbot_platform_websites_handles",
          "durationSeconds": 5.14
        }
      ],
      "voiceover": {
        "text": "Urgent question dies in silence. She typed it Saturday night — which color treatment, how long, can I book tomorrow. Your site said nothing. No chat. No answer. Just a contact form that felt like a locked door. By Tuesday morning you had five sessions, zero leads. Those weren't bounces. They were ready. A static website isn't the same as being available. Your next visitor deserves an answer — even when you're not there.",
        "wordCount": 74
      },
      "storyboard": {
        "sceneCount": 4,
        "sceneSummaries": [
          "Soft polished 3D render, portrait 9:16 vertical frame, urban gray-blue ambient palette, overcast diffused daylight, qui…",
          "Soft polished 3D render, portrait 9:16 vertical frame, urban gray-blue ambient palette, overcast diffused daylight, qui…",
          "Soft polished 3D render, portrait 9:16 vertical frame, urban gray-blue ambient palette, overcast diffused daylight, qui…",
          "Soft polished 3D render, portrait 9:16 vertical frame, urban gray-blue ambient palette, overcast diffused daylight, qui…"
        ]
      },
      "duration_plan": {
        "roles": [
          "HOOK",
          "SETUP",
          "ESCALATION",
          "RESOLUTION"
        ],
        "shares": [
          0.192,
          0.288,
          0.315,
          0.206
        ],
        "validation": {
          "passed": true,
          "shares": [
            0.192,
            0.288,
            0.315,
            0.206
          ],
          "summary": [],
          "version": "duration-validation@1",
          "warnings": []
        },
        "durationsSeconds": [
          4.79,
          7.19,
          7.88,
          5.14
        ],
        "justifiedOverMax": [
          false,
          false,
          false,
          false
        ]
      },
      "narrative_beats": [
        {
          "role": "HOOK",
          "whatChanged": "",
          "whyContinue": "What happens to the person in: Urgent question dies in silence?",
          "viewerLearns": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; r…",
          "informationKey": "anomaly|open|handheld_urgency_close_customer",
          "modeBeatLabels": [
            "observation"
          ]
        },
        {
          "role": "SETUP",
          "whatChanged": "From cold open to the established problem world (tension).",
          "whyContinue": "Stakes become clear — Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on…",
          "viewerLearns": "Hold the opening situation → widen to peak demand overload",
          "informationKey": "problem_named|open|hold_opening_situation_widen",
          "modeBeatLabels": [
            "meaning"
          ]
        },
        {
          "role": "ESCALATION",
          "whatChanged": "Failure / consequence deepens — not a restatement of the setup.",
          "whyContinue": "Viewer needs the fix: AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "viewerLearns": "reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what hu…",
          "informationKey": "cost_rising|open|reveal_unable_answer_customer",
          "modeBeatLabels": [
            "reveal"
          ]
        },
        {
          "role": "RESOLUTION",
          "whatChanged": "Problem turns into solution / outcome: Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "whyContinue": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "viewerLearns": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "informationKey": "solution_shown|closed|chatbot_platform_websites_handles",
          "modeBeatLabels": [
            "cta"
          ]
        }
      ],
      "metaphor_clarity": {
        "reasons": [
          "class:one_mental_step",
          "understandable_within_~10s",
          "understandable_within_first_third"
        ],
        "guidance": null,
        "metaphorClass": "one_mental_step",
        "understandableWithin10s": true,
        "preferEarlyProductProblem": false,
        "understandableWithinFirstThird": true
      },
      "creative_candidate": {
        "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "family": "direct_product_world",
        "coreIdea": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; reply thread shows \"seen\" with no answer during peak demand overload.",
        "hookLine": "Urgent question dies in silence.",
        "candidateId": "c3-direct_product_world-div",
        "openingSituation": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; reply thread shows \"seen\" with no answer during peak demand overload.",
        "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
        "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes."
      },
      "corrective_guidance": null,
      "viewer_comprehension": [
        {
          "viewer_question": "What happens to the person in: Urgent question dies in silence?",
          "viewer_expectation": "The explanation is coming.",
          "viewer_understands": "Something unusual is happening: Handheld urgency"
        },
        {
          "viewer_question": "Why is this happening / what does it cost?",
          "viewer_expectation": "Someone should solve this — or stakes will rise.",
          "viewer_understands": "The problem is: Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor…"
        },
        {
          "viewer_question": "Can this be fixed?",
          "viewer_expectation": "Show the solution.",
          "viewer_understands": "The business is losing opportunities: reveal Unable to answer customer questions when offline (every unanswered online lead walks to a comp…"
        },
        {
          "viewer_question": "none",
          "viewer_expectation": "Finished.",
          "viewer_understands": "The product solves this: AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's h…"
        }
      ],
      "information_progression": {
        "passed": false,
        "summary": [
          "items_3_and_4_same_information:same_information:leaving|shared_claims:leaving|overlap=0.66"
        ],
        "version": "information-progression@1",
        "warnings": [
          {
            "indexA": 2,
            "indexB": 3,
            "overlap": 0.6615384615384615,
            "reasons": [
              "same_information:leaving",
              "shared_claims:leaving",
              "overlap=0.66"
            ],
            "informationKeyA": "leaving",
            "informationKeyB": "leaving",
            "sameInformationDifferentSurface": false
          }
        ],
        "correctiveGuidance": "INFORMATION PROGRESSION CORRECTIVE (deterministic — strengthen storyboard NOW):\nConsecutive beats/scenes must advance INFORMATION, not just change the camera or device.\nphone → laptop with the same claim (e.g. 'unanswered visitors') is STILL a failure.\nRequired advance pattern: anomaly → problem named → cost/failure → solution.\nEach visual_scenes[i] must communicate a NEW fact the previous scene did not.\nDo NOT restate the same problem with a different prop.\n\nDetected issues:\n- beats/scenes 3→4: same_information:leaving; shared_claims:leaving; overlap=0.66"
      }
    },
    "metaphorClarity": {
      "reasons": [
        "class:one_mental_step",
        "understandable_within_~10s",
        "understandable_within_first_third"
      ],
      "guidance": null,
      "metaphorClass": "one_mental_step",
      "understandableWithin10s": true,
      "preferEarlyProductProblem": false,
      "understandableWithinFirstThird": true
    },
    "correctiveGuidance": null,
    "durationValidation": {
      "passed": true,
      "shares": [
        0.192,
        0.288,
        0.315,
        0.206
      ],
      "summary": [],
      "version": "duration-validation@1",
      "warnings": []
    },
    "progressionWarnings": [],
    "informationProgression": {
      "passed": true,
      "summary": [],
      "version": "information-progression@1",
      "warnings": [],
      "correctiveGuidance": null
    },
    "storyProgressionDiagnostics": {
      "passed": false,
      "summary": [
        "scenes_3_and_4_near_duplicate_purpose:same_location:street|same_action:leaving|same_narrative_state:overlap=0.66"
      ],
      "version": "story-progression@1",
      "warnings": [
        {
          "indexA": 2,
          "indexB": 3,
          "reasons": [
            "same_location:street",
            "same_action:leaving",
            "same_narrative_state:overlap=0.66"
          ],
          "sameAction": true,
          "noEscalation": false,
          "sameLocation": true,
          "sameNarrativeState": true
        }
      ]
    },
    "visualProgressionDiagnostics": {
      "passed": true,
      "summary": [],
      "version": "visual-progression@1",
      "warnings": []
    },
    "postLlmInformationProgression": {
      "passed": false,
      "summary": [
        "items_3_and_4_same_information:same_information:leaving|shared_claims:leaving|overlap=0.66"
      ],
      "version": "information-progression@1",
      "warnings": [
        {
          "indexA": 2,
          "indexB": 3,
          "overlap": 0.6615384615384615,
          "reasons": [
            "same_information:leaving",
            "shared_claims:leaving",
            "overlap=0.66"
          ],
          "informationKeyA": "leaving",
          "informationKeyB": "leaving",
          "sameInformationDifferentSurface": false
        }
      ],
      "correctiveGuidance": "INFORMATION PROGRESSION CORRECTIVE (deterministic — strengthen storyboard NOW):\nConsecutive beats/scenes must advance INFORMATION, not just change the camera or device.\nphone → laptop with the same claim (e.g. 'unanswered visitors') is STILL a failure.\nRequired advance pattern: anomaly → problem named → cost/failure → solution.\nEach visual_scenes[i] must communicate a NEW fact the previous scene did not.\nDo NOT restate the same problem with a different prop.\n\nDetected issues:\n- beats/scenes 3→4: same_information:leaving; shared_claims:leaving; overlap=0.66"
    }
  },
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: thoughtful, reflective, steady pacing. Delivery: confident, concise, not aggressive. Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Use spok",
  "visual_narrative": {
    "key": "human|body language that shows the relationship to the idea in one glance — not a device hero frame",
    "version": "visual-narrative@1.1",
    "subject_focus": "body language that shows the relationship to the idea in one glance — not a device hero frame",
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
      "group": 5,
      "phone": 2,
      "laptop": 5,
      "close_up": 6,
      "dashboard": 2,
      "prototype": 2,
      "person_alone": 5,
      "sticky_notes": 1,
      "product_asset": 4
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
    "key": "a soft-focus urban street exterior|quiet optimism|overcast diffused daylight|slightly above table height|symmetrical, calm composition|implied human presence just off-screen|urban gray-blue ambient palette",
    "mood": "quiet optimism",
    "camera": "slightly above table height",
    "version": "creative-identity@1",
    "lighting": "overcast diffused daylight",
    "color_feel": "urban gray-blue ambient palette",
    "option_ids": {
      "mood": "optimistic",
      "camera": "slightly_above_table",
      "lighting": "overcast_diffused",
      "color_feel": "urban_gray_blue",
      "composition": "symmetrical_calm",
      "environment": "urban_street_soft",
      "human_presence": "implied_offscreen"
    },
    "composition": "symmetrical, calm composition",
    "environment": "a soft-focus urban street exterior",
    "human_presence": "implied human presence just off-screen"
  },
  "history_decisions": [],
  "visual_beat_count": 5,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "creative_candidates": {
    "version": "creative-candidates@3.0",
    "candidateScores": [
      {
        "family": "absurd_understandable",
        "scores": {
          "stopPower": 7,
          "originality": 8,
          "memorability": 8,
          "storyPotential": 5,
          "AI_Generic_Risk": 0,
          "emotionalCharge": 5,
          "productRelevance": 7,
          "visualSpecificity": 6,
          "productionFeasibility": 7,
          "immediateComprehension": 5
        },
        "coreIdea": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The beauty salon that found five unread visitor questions on Tuesday — and no wa; website chat on the counter glows with zero replies.",
        "hookLine": "Airport logic applied to the wrong queue.",
        "rejected": false,
        "candidateId": "c1-absurd_understandable-div",
        "rejectReasons": [],
        "weightedTotal": 100.15,
        "commercialTotal": 24,
        "commercialScores": {
          "renderability": 0,
          "firstFrameClarity": 0,
          "humanProblemVisibility": 5,
          "narrativeSurvivability": 0,
          "productDemonstrability": 3,
          "commercialSurvivability": 0
        },
        "openingSituation": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The beauty salon that found five unread visitor questions on Tuesday — and no wa; website chat on the counter glows with zero replies.",
        "finalSelectionScore": 124.15
      },
      {
        "family": "role_reversal",
        "scores": {
          "stopPower": 6,
          "originality": 7,
          "memorability": 8,
          "storyPotential": 5,
          "AI_Generic_Risk": 1,
          "emotionalCharge": 5,
          "productRelevance": 7,
          "visualSpecificity": 6,
          "productionFeasibility": 8,
          "immediateComprehension": 5
        },
        "coreIdea": "Handheld urgency: Empty front desk at The beauty salon that found five unread visitor questions on Tuesday — and no wa during peak demand overload; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
        "hookLine": "Nobody home except the waiting chat.",
        "rejected": false,
        "candidateId": "c2-role_reversal-div",
        "rejectReasons": [],
        "weightedTotal": 94,
        "commercialTotal": 112,
        "commercialScores": {
          "renderability": 7,
          "firstFrameClarity": 6,
          "humanProblemVisibility": 7,
          "narrativeSurvivability": 5,
          "productDemonstrability": 6,
          "commercialSurvivability": 6
        },
        "openingSituation": "Handheld urgency: Empty front desk at The beauty salon that found five unread visitor questions on Tuesday — and no wa during peak demand overload; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
        "finalSelectionScore": 206
      },
      {
        "family": "direct_product_world",
        "scores": {
          "stopPower": 5,
          "originality": 5,
          "memorability": 6,
          "storyPotential": 5,
          "AI_Generic_Risk": 1,
          "emotionalCharge": 5,
          "productRelevance": 10,
          "visualSpecificity": 7,
          "productionFeasibility": 8,
          "immediateComprehension": 7
        },
        "coreIdea": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; reply thread shows \"seen\" with no answer during peak demand overload.",
        "hookLine": "Urgent question dies in silence.",
        "rejected": false,
        "candidateId": "c3-direct_product_world-div",
        "rejectReasons": [],
        "weightedTotal": 95.2,
        "commercialTotal": 171,
        "commercialScores": {
          "renderability": 10,
          "firstFrameClarity": 9,
          "humanProblemVisibility": 10,
          "narrativeSurvivability": 9,
          "productDemonstrability": 9,
          "commercialSurvivability": 10
        },
        "openingSituation": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; reply thread shows \"seen\" with no answer during peak demand overload.",
        "finalSelectionScore": 266.2
      },
      {
        "family": "visual_exaggeration",
        "scores": {
          "stopPower": 7,
          "originality": 5,
          "memorability": 8,
          "storyPotential": 5,
          "AI_Generic_Risk": 1,
          "emotionalCharge": 5,
          "productRelevance": 7,
          "visualSpecificity": 8,
          "productionFeasibility": 7,
          "immediateComprehension": 5
        },
        "coreIdea": "Handheld urgency: Physical stack of printed missed-web-session logs grows on the The beauty salon that found five unread visitor questions on Tuesday — and no wa counter while staff handle only the phone.",
        "hookLine": "Lost work as a physical mountain.",
        "rejected": false,
        "candidateId": "c4-visual_exaggeration-div",
        "rejectReasons": [],
        "weightedTotal": 96.05,
        "commercialTotal": 136,
        "commercialScores": {
          "renderability": 9,
          "firstFrameClarity": 8,
          "humanProblemVisibility": 8,
          "narrativeSurvivability": 7,
          "productDemonstrability": 5,
          "commercialSurvivability": 8
        },
        "openingSituation": "Handheld urgency: Physical stack of printed missed-web-session logs grows on the The beauty salon that found five unread visitor questions on Tuesday — and no wa counter while staff handle only the phone.",
        "finalSelectionScore": 232.05
      },
      {
        "family": "consequence_first",
        "scores": {
          "stopPower": 8,
          "originality": 5,
          "memorability": 6,
          "storyPotential": 6,
          "AI_Generic_Risk": 1,
          "emotionalCharge": 6,
          "productRelevance": 7,
          "visualSpecificity": 6,
          "productionFeasibility": 8,
          "immediateComprehension": 5
        },
        "coreIdea": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from peak demand overload.",
        "hookLine": "Competitor wins before you pick up.",
        "rejected": false,
        "candidateId": "c5-consequence_first-div",
        "rejectReasons": [],
        "weightedTotal": 94.2,
        "commercialTotal": 108.5,
        "commercialScores": {
          "renderability": 6,
          "firstFrameClarity": 6,
          "humanProblemVisibility": 8,
          "narrativeSurvivability": 5,
          "productDemonstrability": 5,
          "commercialSurvivability": 6
        },
        "openingSituation": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from peak demand overload.",
        "finalSelectionScore": 202.7
      },
      {
        "family": "human_conflict",
        "scores": {
          "stopPower": 7,
          "originality": 5,
          "memorability": 7,
          "storyPotential": 5,
          "AI_Generic_Risk": 1,
          "emotionalCharge": 7,
          "productRelevance": 7,
          "visualSpecificity": 6,
          "productionFeasibility": 7,
          "immediateComprehension": 5
        },
        "coreIdea": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The beauty salon that found five unread visitor questions on Tuesday — and no wa.",
        "hookLine": "Departure board for the wrong channel.",
        "rejected": false,
        "candidateId": "c6-human_conflict-div",
        "rejectReasons": [],
        "weightedTotal": 93.55000000000001,
        "commercialTotal": 87.5,
        "commercialScores": {
          "renderability": 4,
          "firstFrameClarity": 4,
          "humanProblemVisibility": 10,
          "narrativeSurvivability": 3,
          "productDemonstrability": 4,
          "commercialSurvivability": 4
        },
        "openingSituation": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The beauty salon that found five unread visitor questions on Tuesday — and no wa.",
        "finalSelectionScore": 181.05
      },
      {
        "family": "social_observation",
        "scores": {
          "stopPower": 5,
          "originality": 5,
          "memorability": 6,
          "storyPotential": 5,
          "AI_Generic_Risk": 1,
          "emotionalCharge": 5,
          "productRelevance": 8,
          "visualSpecificity": 6,
          "productionFeasibility": 8,
          "immediateComprehension": 6
        },
        "coreIdea": "Handheld urgency: Two clocks at The beauty salon that found five unread visitor questions on Tuesday — and no wa: shop hours vs \"avg website reply\" spinning into hours during peak demand overload.",
        "hookLine": "Dual clocks, one shameful.",
        "rejected": false,
        "candidateId": "c7-social_observation-div",
        "rejectReasons": [],
        "weightedTotal": 87.5,
        "commercialTotal": 33,
        "commercialScores": {
          "renderability": 0,
          "firstFrameClarity": 0,
          "humanProblemVisibility": 6,
          "narrativeSurvivability": 0,
          "productDemonstrability": 5,
          "commercialSurvivability": 0
        },
        "openingSituation": "Handheld urgency: Two clocks at The beauty salon that found five unread visitor questions on Tuesday — and no wa: shop hours vs \"avg website reply\" spinning into hours during peak demand overload.",
        "finalSelectionScore": 120.5
      },
      {
        "family": "unexpected_comparison",
        "scores": {
          "stopPower": 6,
          "originality": 7,
          "memorability": 8,
          "storyPotential": 5,
          "AI_Generic_Risk": 1,
          "emotionalCharge": 5,
          "productRelevance": 7,
          "visualSpecificity": 6,
          "productionFeasibility": 8,
          "immediateComprehension": 5
        },
        "coreIdea": "Handheld urgency: Night: The beauty salon that found five unread visitor questions on Tuesday — and no wa dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
        "hookLine": "After hours, chats still screaming.",
        "rejected": false,
        "candidateId": "c8-unexpected_comparison-div",
        "rejectReasons": [],
        "weightedTotal": 94,
        "commercialTotal": 77.5,
        "commercialScores": {
          "renderability": 6,
          "firstFrameClarity": 4,
          "humanProblemVisibility": 6,
          "narrativeSurvivability": 2,
          "productDemonstrability": 4,
          "commercialSurvivability": 3
        },
        "openingSituation": "Handheld urgency: Night: The beauty salon that found five unread visitor questions on Tuesday — and no wa dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
        "finalSelectionScore": 171.5
      }
    ],
    "comparativeJudge": {
      "winnerId": "c3-direct_product_world-div",
      "winnerReason": "final_selection_score=266.2; creative_score=95.2; commercial_score=171.0; stop=5; comprehension=7; originality=5; renderability=10; first_frame=9; product_demo=9; human_problem=10; family=direct_product_world; core=Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that fo",
      "mostRenderable": "c3-direct_product_world-div",
      "clearestFirstFrame": "c3-direct_product_world-div",
      "bestProductTopicFit": "c3-direct_product_world-div",
      "clearestMentalImage": "c4-visual_exaggeration-div",
      "leastInterchangeable": "c1-absurd_understandable-div",
      "strongestHumanProblem": "c3-direct_product_world-div",
      "mostMemorableInOneHour": "c1-absurd_understandable-div",
      "mostLikelyToStopScrolling": "c5-consequence_first-div",
      "bestProductDemonstrability": "c3-direct_product_world-div",
      "bestCommercialSurvivability": "c3-direct_product_world-div"
    },
    "selectedCandidate": {
      "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
      "family": "direct_product_world",
      "coreIdea": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; reply thread shows \"seen\" with no answer during peak demand overload.",
      "hookLine": "Urgent question dies in silence.",
      "candidateId": "c3-direct_product_world-div",
      "creativeDNA": {
        "world": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tu…",
        "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon t…",
        "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "mainCharacter": "A website visitor's hands sending an urgent question",
        "immutableRules": [
          "Do not relocate the primary story away from: Handheld urgency: Close on a customer's hands sending an urgent question to The beauty sa…",
          "Do not replace the main character: A website visitor's hands sending an urgent question",
          "Do not turn the middle into a laptop analytics montage",
          "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Handheld urgen…) with a different marketing problem",
          "Do not resolve the story only with a happy expression; show that visitors receive answers",
          "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
        ],
        "viewerQuestion": "What happens to the person in: Urgent question dies in silence?"
      },
      "visualPromise": "Film the opening as a scroll-stop frame: Urgent question dies in silence. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
      "familiarityRisk": "medium",
      "openingSituation": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; reply thread shows \"seen\" with no answer during peak demand overload.",
      "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
      "creativeDnaSource": "model",
      "emotionalReaction": "tension",
      "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
      "memorabilityReason": "Selected from divergence v2 for scroll-stop: Urgent question dies in silence",
      "expectedViewerQuestion": "What happens to the person in: Urgent question dies in silence?"
    },
    "creativeDivergence": {
      "version": "creative-divergence@2.1",
      "clusters": [
        {
          "clusterId": "cl-1",
          "memberIds": [
            "raw-10-8434",
            "raw-5-1775"
          ],
          "centroidScene": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The beauty salon that found five unread visitor questions on Tuesday — and no wa; website chat on the counter glows with zero replies.",
          "representativeId": "raw-10-8434"
        },
        {
          "clusterId": "cl-2",
          "memberIds": [
            "raw-15-9792",
            "raw-3-6146"
          ],
          "centroidScene": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The beauty salon that found five unread visitor questions on Tuesday — and no wa.",
          "representativeId": "raw-15-9792"
        },
        {
          "clusterId": "cl-3",
          "memberIds": [
            "raw-16-396",
            "raw-2-3678"
          ],
          "centroidScene": "Handheld urgency: Empty front desk at The beauty salon that found five unread visitor questions on Tuesday — and no wa during peak demand overload; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
          "representativeId": "raw-16-396"
        },
        {
          "clusterId": "cl-4",
          "memberIds": [
            "raw-12-5588",
            "raw-1-7106",
            "raw-14-3458"
          ],
          "centroidScene": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; reply thread shows \"seen\" with no answer during peak demand overload.",
          "representativeId": "raw-12-5588"
        },
        {
          "clusterId": "cl-5",
          "memberIds": [
            "raw-9-3095",
            "raw-4-6671"
          ],
          "centroidScene": "Handheld urgency: Two clocks at The beauty salon that found five unread visitor questions on Tuesday — and no wa: shop hours vs \"avg website reply\" spinning into hours during peak demand overload.",
          "representativeId": "raw-9-3095"
        },
        {
          "clusterId": "cl-6",
          "memberIds": [
            "raw-11-5971",
            "raw-8-4977"
          ],
          "centroidScene": "Handheld urgency: Physical stack of printed missed-web-session logs grows on the The beauty salon that found five unread visitor questions on Tuesday — and no wa counter while staff handle only the phone.",
          "representativeId": "raw-11-5971"
        },
        {
          "clusterId": "cl-7",
          "memberIds": [
            "raw-13-4966",
            "raw-7-3474"
          ],
          "centroidScene": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from peak demand overload.",
          "representativeId": "raw-13-4966"
        },
        {
          "clusterId": "cl-8",
          "memberIds": [
            "raw-17-1443",
            "raw-6-4100"
          ],
          "centroidScene": "Handheld urgency: Night: The beauty salon that found five unread visitor questions on Tuesday — and no wa dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
          "representativeId": "raw-17-1443"
        }
      ],
      "survivors": [
        {
          "id": "raw-10-8434",
          "tags": [
            "absurd",
            "queue",
            "lobby",
            "v1"
          ],
          "scene": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The beauty salon that found five unread visitor questions on Tuesday — and no wa; website chat on the counter glows with zero replies.",
          "rejected": false,
          "clusterId": "cl-1",
          "rejectReason": null,
          "scrollStopCue": "Airport logic applied to the wrong queue",
          "stopScrollScore": 7,
          "visualDistinctScore": 8
        },
        {
          "id": "raw-15-9792",
          "tags": [
            "departure",
            "board",
            "delay",
            "v0"
          ],
          "scene": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The beauty salon that found five unread visitor questions on Tuesday — and no wa.",
          "rejected": false,
          "clusterId": "cl-2",
          "rejectReason": null,
          "scrollStopCue": "Departure board for the wrong channel",
          "stopScrollScore": 7,
          "visualDistinctScore": 8
        },
        {
          "id": "raw-16-396",
          "tags": [
            "role_reversal",
            "empty",
            "chat",
            "v0"
          ],
          "scene": "Handheld urgency: Empty front desk at The beauty salon that found five unread visitor questions on Tuesday — and no wa during peak demand overload; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
          "rejected": false,
          "clusterId": "cl-3",
          "rejectReason": null,
          "scrollStopCue": "Nobody home except the waiting chat",
          "stopScrollScore": 7,
          "visualDistinctScore": 8
        },
        {
          "id": "raw-12-5588",
          "tags": [
            "hands",
            "urgent",
            "customer",
            "v1"
          ],
          "scene": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; reply thread shows \"seen\" with no answer during peak demand overload.",
          "rejected": false,
          "clusterId": "cl-4",
          "rejectReason": null,
          "scrollStopCue": "Urgent question dies in silence",
          "stopScrollScore": 7.5,
          "visualDistinctScore": 7
        },
        {
          "id": "raw-9-3095",
          "tags": [
            "clocks",
            "timer",
            "shame",
            "v0"
          ],
          "scene": "Handheld urgency: Two clocks at The beauty salon that found five unread visitor questions on Tuesday — and no wa: shop hours vs \"avg website reply\" spinning into hours during peak demand overload.",
          "rejected": false,
          "clusterId": "cl-5",
          "rejectReason": null,
          "scrollStopCue": "Dual clocks, one shameful",
          "stopScrollScore": 7,
          "visualDistinctScore": 7
        },
        {
          "id": "raw-11-5971",
          "tags": [
            "exaggeration",
            "pile",
            "v0"
          ],
          "scene": "Handheld urgency: Physical stack of printed missed-web-session logs grows on the The beauty salon that found five unread visitor questions on Tuesday — and no wa counter while staff handle only the phone.",
          "rejected": false,
          "clusterId": "cl-6",
          "rejectReason": null,
          "scrollStopCue": "Lost work as a physical mountain",
          "stopScrollScore": 7,
          "visualDistinctScore": 6.5
        },
        {
          "id": "raw-13-4966",
          "tags": [
            "consequence",
            "competitor",
            "v0"
          ],
          "scene": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from peak demand overload.",
          "rejected": false,
          "clusterId": "cl-7",
          "rejectReason": null,
          "scrollStopCue": "Competitor wins before you pick up",
          "stopScrollScore": 7,
          "visualDistinctScore": 6.5
        },
        {
          "id": "raw-17-1443",
          "tags": [
            "night",
            "security",
            "chats",
            "v0"
          ],
          "scene": "Handheld urgency: Night: The beauty salon that found five unread visitor questions on Tuesday — and no wa dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
          "rejected": false,
          "clusterId": "cl-8",
          "rejectReason": null,
          "scrollStopCue": "After hours, chats still screaming",
          "stopScrollScore": 5,
          "visualDistinctScore": 7
        }
      ],
      "rawGeneratedCount": 20,
      "candidateSourceIds": [
        "raw-10-8434",
        "raw-16-396",
        "raw-12-5588",
        "raw-11-5971",
        "raw-13-4966",
        "raw-15-9792",
        "raw-9-3095",
        "raw-17-1443"
      ],
      "rawAfterFilterCount": 17,
      "rejectedGenericSamples": [
        {
          "id": "raw-18-4980",
          "scene": "Person staring at a laptop in a modern office meeting room explaining the product on a dashboard",
          "reason": "raw_generic:\\bmodern\\s+office\\b"
        },
        {
          "id": "raw-19-4204",
          "scene": "A website-led service business worker holds a phone to their ear at a calm desk thinking about workflow efficiency",
          "reason": "raw_generic:\\bcalm\\s+desk\\b"
        },
        {
          "id": "raw-20-1727",
          "scene": "Outside a HVAC / cooling service van in blazing heat, a technician sprints while an accountant topic is ignored",
          "reason": "unrelated_industry:technician"
        }
      ]
    },
    "regenerationReason": "opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame",
    "rejectedCandidates": [],
    "finalScriptFidelity": {
      "passed": false,
      "failureReasons": [
        "opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame"
      ],
      "coreIdeaRecognizable": true,
      "productOrTopicImplied": true,
      "voiceoverEssayCadence": false,
      "collapsedToGenericOffice": false,
      "hookPreservedInFirstSpoken": true,
      "openingSituationVisibleInScene1": false
    },
    "generatedCandidates": [
      {
        "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "family": "absurd_understandable",
        "coreIdea": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The beauty salon that found five unread visitor questions on Tuesday — and no wa; website chat on the counter glows with zero replies.",
        "hookLine": "Airport logic applied to the wrong queue.",
        "candidateId": "c1-absurd_understandable-div",
        "creativeDNA": {
          "world": "A The beauty salon that found five unread visitor questions on Tuesday — and no wa lobby / service counter",
          "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The beauty salon that…",
          "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "mainCharacter": "An absurd boarding-ticket queue for phone callers (website line empty)",
          "immutableRules": [
            "Do not relocate the primary story away from: A The beauty salon that found five unread visitor questions on Tuesday — and no wa lobby…",
            "Do not replace the main character: An absurd boarding-ticket queue for phone callers (website line empty)",
            "Do not turn the middle into a laptop analytics montage",
            "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Handheld urgen…) with a different marketing problem",
            "Do not resolve the story only with a happy expression; show that visitors receive answers",
            "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
          ],
          "viewerQuestion": "What happens to the person in: Airport logic applied to the wrong queue?"
        },
        "visualPromise": "Film the opening as a scroll-stop frame: Airport logic applied to the wrong queue. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
        "familiarityRisk": "low",
        "openingSituation": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The beauty salon that found five unread visitor questions on Tuesday — and no wa; website chat on the counter glows with zero replies.",
        "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
        "creativeDnaSource": "model",
        "emotionalReaction": "amused recognition",
        "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "memorabilityReason": "Selected from divergence v2 for scroll-stop: Airport logic applied to the wrong queue",
        "expectedViewerQuestion": "What happens to the person in: Airport logic applied to the wrong queue?"
      },
      {
        "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "family": "role_reversal",
        "coreIdea": "Handheld urgency: Empty front desk at The beauty salon that found five unread visitor questions on Tuesday — and no wa during peak demand overload; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
        "hookLine": "Nobody home except the waiting chat.",
        "candidateId": "c2-role_reversal-div",
        "creativeDNA": {
          "world": "Handheld urgency: Empty front desk at The beauty salon that found five unread visitor questions on Tuesday — and no wa during peak demand o…",
          "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Empty front desk at The beauty salon that found five unread visitor question…",
          "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "mainCharacter": "An empty desk / wall screen while the digital receptionist works alone",
          "immutableRules": [
            "Do not replace the main character: An empty desk / wall screen while the digital receptionist works alone",
            "Do not turn the middle into a laptop analytics montage",
            "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Handheld urgen…) with a different marketing problem",
            "Do not resolve the story only with a happy expression; show that visitors receive answers",
            "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
          ],
          "viewerQuestion": "What happens to the person in: Nobody home except the waiting chat?"
        },
        "visualPromise": "Film the opening as a scroll-stop frame: Nobody home except the waiting chat. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
        "familiarityRisk": "medium",
        "openingSituation": "Handheld urgency: Empty front desk at The beauty salon that found five unread visitor questions on Tuesday — and no wa during peak demand overload; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
        "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
        "creativeDnaSource": "model",
        "emotionalReaction": "unease",
        "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "memorabilityReason": "Selected from divergence v2 for scroll-stop: Nobody home except the waiting chat",
        "expectedViewerQuestion": "What happens to the person in: Nobody home except the waiting chat?"
      },
      {
        "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "family": "direct_product_world",
        "coreIdea": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; reply thread shows \"seen\" with no answer during peak demand overload.",
        "hookLine": "Urgent question dies in silence.",
        "candidateId": "c3-direct_product_world-div",
        "creativeDNA": {
          "world": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tu…",
          "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon t…",
          "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "mainCharacter": "A website visitor's hands sending an urgent question",
          "immutableRules": [
            "Do not relocate the primary story away from: Handheld urgency: Close on a customer's hands sending an urgent question to The beauty sa…",
            "Do not replace the main character: A website visitor's hands sending an urgent question",
            "Do not turn the middle into a laptop analytics montage",
            "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Handheld urgen…) with a different marketing problem",
            "Do not resolve the story only with a happy expression; show that visitors receive answers",
            "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
          ],
          "viewerQuestion": "What happens to the person in: Urgent question dies in silence?"
        },
        "visualPromise": "Film the opening as a scroll-stop frame: Urgent question dies in silence. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
        "familiarityRisk": "medium",
        "openingSituation": "Handheld urgency: Close on a customer's hands sending an urgent question to The beauty salon that found five unread visitor questions on Tuesday — and no wa; reply thread shows \"seen\" with no answer during peak demand overload.",
        "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
        "creativeDnaSource": "model",
        "emotionalReaction": "tension",
        "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "memorabilityReason": "Selected from divergence v2 for scroll-stop: Urgent question dies in silence",
        "expectedViewerQuestion": "What happens to the person in: Urgent question dies in silence?"
      },
      {
        "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "family": "visual_exaggeration",
        "coreIdea": "Handheld urgency: Physical stack of printed missed-web-session logs grows on the The beauty salon that found five unread visitor questions on Tuesday — and no wa counter while staff handle only the phone.",
        "hookLine": "Lost work as a physical mountain.",
        "candidateId": "c4-visual_exaggeration-div",
        "creativeDNA": {
          "world": "Handheld urgency: Physical stack of printed missed-web-session logs grows on the The beauty salon that found five unread visitor questions…",
          "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Physical stack of printed missed-web-session logs grows on the The beauty sa…",
          "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "mainCharacter": "The recurring subject of: Handheld urgency: Physical stack of printed missed-web-session logs grows on the The beauty s…",
          "immutableRules": [
            "Do not relocate the primary story away from: Handheld urgency: Physical stack of printed missed-web-session logs grows on the The beau…",
            "Do not replace the main character: The recurring subject of: Handheld urgency: Physical stack of printed missed-web-session…",
            "Do not turn the middle into a laptop analytics montage",
            "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Handheld urgen…) with a different marketing problem",
            "Do not resolve the story only with a happy expression; show that visitors receive answers",
            "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
          ],
          "viewerQuestion": "What happens to the person in: Lost work as a physical mountain?"
        },
        "visualPromise": "Film the opening as a scroll-stop frame: Lost work as a physical mountain. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
        "familiarityRisk": "medium",
        "openingSituation": "Handheld urgency: Physical stack of printed missed-web-session logs grows on the The beauty salon that found five unread visitor questions on Tuesday — and no wa counter while staff handle only the phone.",
        "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
        "creativeDnaSource": "model",
        "emotionalReaction": "curiosity",
        "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "memorabilityReason": "Selected from divergence v2 for scroll-stop: Lost work as a physical mountain",
        "expectedViewerQuestion": "What happens to the person in: Lost work as a physical mountain?"
      },
      {
        "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "family": "consequence_first",
        "coreIdea": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from peak demand overload.",
        "hookLine": "Competitor wins before you pick up.",
        "candidateId": "c5-consequence_first-div",
        "creativeDNA": {
          "world": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer",
          "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer",
          "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "mainCharacter": "A competitor already claiming the job on the driveway",
          "immutableRules": [
            "Do not relocate the primary story away from: Handheld urgency: Consequence: rival already quoted the website visitor who needed an ans…",
            "Do not replace the main character: A competitor already claiming the job on the driveway",
            "Do not turn the middle into a laptop analytics montage",
            "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Handheld urgen…) with a different marketing problem",
            "Do not resolve the story only with a happy expression; show that visitors receive answers",
            "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
          ],
          "viewerQuestion": "What happens to the person in: Competitor wins before you pick up?"
        },
        "visualPromise": "Film the opening as a scroll-stop frame: Competitor wins before you pick up. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
        "familiarityRisk": "medium",
        "openingSituation": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from peak demand overload.",
        "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
        "creativeDnaSource": "model",
        "emotionalReaction": "urgency",
        "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "memorabilityReason": "Selected from divergence v2 for scroll-stop: Competitor wins before you pick up",
        "expectedViewerQuestion": "What happens to the person in: Competitor wins before you pick up?"
      },
      {
        "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "family": "human_conflict",
        "coreIdea": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The beauty salon that found five unread visitor questions on Tuesday — and no wa.",
        "hookLine": "Departure board for the wrong channel.",
        "candidateId": "c6-human_conflict-div",
        "creativeDNA": {
          "world": "A The beauty salon that found five unread visitor questions on Tuesday — and no wa lobby / service counter",
          "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding",
          "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "mainCharacter": "The recurring subject of: Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding",
          "immutableRules": [
            "Do not relocate the primary story away from: A The beauty salon that found five unread visitor questions on Tuesday — and no wa lobby…",
            "Do not replace the main character: The recurring subject of: Handheld urgency: Train-station style departure board: \"Phone c…",
            "Do not turn the middle into a laptop analytics montage",
            "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Handheld urgen…) with a different marketing problem",
            "Do not resolve the story only with a happy expression; show that visitors receive answers",
            "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
          ],
          "viewerQuestion": "What happens to the person in: Departure board for the wrong channel?"
        },
        "visualPromise": "Film the opening as a scroll-stop frame: Departure board for the wrong channel. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
        "familiarityRisk": "medium",
        "openingSituation": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The beauty salon that found five unread visitor questions on Tuesday — and no wa.",
        "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
        "creativeDnaSource": "model",
        "emotionalReaction": "curiosity",
        "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "memorabilityReason": "Selected from divergence v2 for scroll-stop: Departure board for the wrong channel",
        "expectedViewerQuestion": "What happens to the person in: Departure board for the wrong channel?"
      },
      {
        "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "family": "social_observation",
        "coreIdea": "Handheld urgency: Two clocks at The beauty salon that found five unread visitor questions on Tuesday — and no wa: shop hours vs \"avg website reply\" spinning into hours during peak demand overload.",
        "hookLine": "Dual clocks, one shameful.",
        "candidateId": "c7-social_observation-div",
        "creativeDNA": {
          "world": "Handheld urgency: Two clocks at The beauty salon that found five unread visitor questions on Tuesday — and no wa: shop hours vs \"avg websit…",
          "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Two clocks at The beauty salon that found five unread visitor questions on T…",
          "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "mainCharacter": "The recurring subject of: Handheld urgency: Two clocks at The beauty salon that found five unread visitor questions on…",
          "immutableRules": [
            "Do not relocate the primary story away from: Handheld urgency: Two clocks at The beauty salon that found five unread visitor questions…",
            "Do not replace the main character: The recurring subject of: Handheld urgency: Two clocks at The beauty salon that found fiv…",
            "Do not turn the middle into a laptop analytics montage",
            "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Handheld urgen…) with a different marketing problem",
            "Do not resolve the story only with a happy expression; show that visitors receive answers",
            "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
          ],
          "viewerQuestion": "What happens to the person in: Dual clocks, one shameful?"
        },
        "visualPromise": "Film the opening as a scroll-stop frame: Dual clocks, one shameful. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
        "familiarityRisk": "medium",
        "openingSituation": "Handheld urgency: Two clocks at The beauty salon that found five unread visitor questions on Tuesday — and no wa: shop hours vs \"avg website reply\" spinning into hours during peak demand overload.",
        "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
        "creativeDnaSource": "model",
        "emotionalReaction": "curiosity",
        "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "memorabilityReason": "Selected from divergence v2 for scroll-stop: Dual clocks, one shameful",
        "expectedViewerQuestion": "What happens to the person in: Dual clocks, one shameful?"
      },
      {
        "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "family": "unexpected_comparison",
        "coreIdea": "Handheld urgency: Night: The beauty salon that found five unread visitor questions on Tuesday — and no wa dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
        "hookLine": "After hours, chats still screaming.",
        "candidateId": "c8-unexpected_comparison-div",
        "creativeDNA": {
          "world": "Handheld urgency: Night: The beauty salon that found five unread visitor questions on Tuesday — and no wa dark",
          "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Night: The beauty salon that found five unread visitor questions on Tuesday…",
          "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "mainCharacter": "The recurring subject of: Handheld urgency: Night: The beauty salon that found five unread visitor questions on Tuesday…",
          "immutableRules": [
            "Do not relocate the primary story away from: Handheld urgency: Night: The beauty salon that found five unread visitor questions on Tue…",
            "Do not replace the main character: The recurring subject of: Handheld urgency: Night: The beauty salon that found five unrea…",
            "Do not turn the middle into a laptop analytics montage",
            "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Handheld urgen…) with a different marketing problem",
            "Do not resolve the story only with a happy expression; show that visitors receive answers",
            "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
          ],
          "viewerQuestion": "What happens to the person in: After hours, chats still screaming?"
        },
        "visualPromise": "Film the opening as a scroll-stop frame: After hours, chats still screaming. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
        "familiarityRisk": "medium",
        "openingSituation": "Handheld urgency: Night: The beauty salon that found five unread visitor questions on Tuesday — and no wa dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
        "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
        "creativeDnaSource": "model",
        "emotionalReaction": "unease",
        "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "memorabilityReason": "Selected from divergence v2 for scroll-stop: After hours, chats still screaming",
        "expectedViewerQuestion": "What happens to the person in: After hours, chats still screaming?"
      }
    ],
    "selectionDiagnostics": {
      "whyWon": "final_selection_score=266.2; creative_score=95.2; commercial_score=171.0; family=direct_product_world; renderability=10; first_frame_clarity=9; product_demo=9; human_problem=10; narrative_survive=9; commercial_survive=10; overturned_higher_creative=c1-absurd_understandable-div(creative=100.2)",
      "version": "commercial-success@1",
      "winnerId": "c3-direct_product_world-div",
      "creativeScore": 95.2,
      "commercialScore": 171,
      "losersPenalized": [
        {
          "family": "visual_exaggeration",
          "lostBy": 34.14999999999998,
          "candidateId": "c4-visual_exaggeration-div",
          "creativeScore": 96.05,
          "commercialScore": 136,
          "primaryPenalties": [],
          "finalSelectionScore": 232.05
        },
        {
          "family": "role_reversal",
          "lostBy": 60.19999999999999,
          "candidateId": "c2-role_reversal-div",
          "creativeScore": 94,
          "commercialScore": 112,
          "primaryPenalties": [],
          "finalSelectionScore": 206
        },
        {
          "family": "consequence_first",
          "lostBy": 63.5,
          "candidateId": "c5-consequence_first-div",
          "creativeScore": 94.2,
          "commercialScore": 108.5,
          "primaryPenalties": [],
          "finalSelectionScore": 202.7
        },
        {
          "family": "human_conflict",
          "lostBy": 85.14999999999998,
          "candidateId": "c6-human_conflict-div",
          "creativeScore": 93.55000000000001,
          "commercialScore": 87.5,
          "primaryPenalties": [
            "low_renderability=4",
            "low_first_frame_clarity=4",
            "low_product_demonstrability=4",
            "low_narrative_survivability=3",
            "low_commercial_survivability=4"
          ],
          "finalSelectionScore": 181.05
        },
        {
          "family": "unexpected_comparison",
          "lostBy": 94.69999999999999,
          "candidateId": "c8-unexpected_comparison-div",
          "creativeScore": 94,
          "commercialScore": 77.5,
          "primaryPenalties": [
            "low_first_frame_clarity=4",
            "low_product_demonstrability=4",
            "low_narrative_survivability=2",
            "low_commercial_survivability=3",
            "high_metaphor_risk=7"
          ],
          "finalSelectionScore": 171.5
        },
        {
          "family": "absurd_understandable",
          "lostBy": 142.04999999999998,
          "candidateId": "c1-absurd_understandable-div",
          "creativeScore": 100.15,
          "commercialScore": 24,
          "primaryPenalties": [
            "low_renderability=0",
            "low_first_frame_clarity=0",
            "low_product_demonstrability=3",
            "low_narrative_survivability=0",
            "low_commercial_survivability=0",
            "high_metaphor_risk=9",
            "requires_readable_text"
          ],
          "finalSelectionScore": 124.15
        },
        {
          "family": "social_observation",
          "lostBy": 145.7,
          "candidateId": "c7-social_observation-div",
          "creativeScore": 87.5,
          "commercialScore": 33,
          "primaryPenalties": [
            "low_renderability=0",
            "low_first_frame_clarity=0",
            "low_narrative_survivability=0",
            "low_commercial_survivability=0",
            "high_metaphor_risk=7",
            "requires_readable_text"
          ],
          "finalSelectionScore": 120.5
        }
      ],
      "finalSelectionScore": 266.2,
      "commercialDimensions": {
        "renderability": 10,
        "firstFrameClarity": 9,
        "humanProblemVisibility": 10,
        "narrativeSurvivability": 9,
        "productDemonstrability": 9,
        "commercialSurvivability": 10
      },
      "creativeScoresSnapshot": {
        "stopPower": 5,
        "originality": 5,
        "memorability": 6,
        "storyPotential": 5,
        "AI_Generic_Risk": 1,
        "emotionalCharge": 5,
        "productRelevance": 10,
        "visualSpecificity": 7,
        "productionFeasibility": 8,
        "immediateComprehension": 7
      },
      "overturnedCreativeLeader": true,
      "commercialDimensionContributions": {
        "renderability": 35,
        "firstFrameClarity": 31.5,
        "humanProblemVisibility": 30,
        "narrativeSurvivability": 22.5,
        "productDemonstrability": 27,
        "commercialSurvivability": 25
      }
    },
    "creativeDnaDiagnostics": {
      "present": true,
      "validation": {
        "passed": true,
        "violations": []
      },
      "candidateId": "c3-direct_product_world-div",
      "fallbackUsed": false,
      "fallbackReason": null,
      "candidateVersion": "creative-candidates@3.0",
      "dnaPromptVersion": "creative-dna@1",
      "creativeDnaSource": "model",
      "modelDnaConsistency": {
        "passed": true,
        "violations": []
      },
      "identityEnvironmentSuppressed": false
    },
    "finalStoryboardFidelity": {
      "passed": false,
      "failureReasons": [
        "opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame"
      ],
      "coreIdeaRecognizable": true,
      "productOrTopicImplied": true,
      "voiceoverEssayCadence": false,
      "collapsedToGenericOffice": false,
      "hookPreservedInFirstSpoken": true,
      "openingSituationVisibleInScene1": false
    }
  },
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
    "CLEAN_ILLUSTRATION:recent_repeat(-2)",
    "PHOTOGRAPHIC:recent_repeat(-2)"
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
      "hook": "Departure board for the wrong channel",
      "topic": "The marketing agency owner who lost a lead mid-pitch — and never knew it happened",
      "motifs": [
        "person_alone",
        "group"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The same d",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "sfx_category": "swipe",
      "creative_mode": null,
      "visual_medium": "CLEAN_ILLUSTRATION",
      "meaning_carrier": "human",
      "opening_structure": "immediate_reaction",
      "cta_composition_id": null,
      "attention_mechanism": "CONTRAST",
      "opening_visual_motif": "left_drowning_drafts_right_clear_system",
      "dominant_subject_motif": "person_alone",
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
      "opening_emotional_effect": "tension"
    },
    {
      "hook": "Departure board for the wrong channel.",
      "topic": "The moment a visitor gives up on your website — and you never even knew they were there",
      "motifs": [
        "phone",
        "close_up"
      ],
      "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The same s",
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
      "meaning_carrier": "human",
      "opening_structure": "immediate_reaction",
      "cta_composition_id": null,
      "attention_mechanism": "DILEMMA",
      "opening_visual_motif": "hand_hovering_over_packed_suitcase_while",
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
      "opening_emotional_effect": "dilemma"
    },
    {
      "hook": "Mascot suffers, fake typing online.",
      "topic": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
      "motifs": [
        "laptop",
        "desk",
        "dashboard",
        "person_alone",
        "group",
        "product_asset"
      ],
      "closing": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-cont",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "sfx_category": "click",
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "human",
      "opening_structure": "bold_claim",
      "cta_composition_id": null,
      "attention_mechanism": "PROVOCATIVE_OPINION",
      "opening_visual_motif": "megaphone_pointed_empty_room_volume_without",
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME",
      "opening_emotional_effect": "strong_opinion"
    },
    {
      "hook": "Most service businesses think being busy means business is good",
      "topic": "The HVAC company that got slammed with website traffic during a heatwave — and lost every single online lead",
      "motifs": [
        "laptop",
        "phone",
        "group",
        "product_asset"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 21–25); pl",
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
      "meaning_carrier": "human",
      "opening_structure": "immediate_reaction",
      "cta_composition_id": null,
      "attention_mechanism": "FRUSTRATION",
      "opening_visual_motif": "same_notification_stacking_nice_five_more",
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME",
      "opening_emotional_effect": "frustration"
    },
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
| IMAGE | Y | Y | Y | partial | Y | pass-through | N | 5× IMAGE |
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

### Job 47c1e1d9-dbf5-4051-b37b-2e84f879a9fa

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | observation | scene-1 | ATTENTION | zoom_in | REVEAL | drift_up | partial |
| 2 | observation | scene-2 | EXPLAIN | drift_up | EXPLAIN | drift_down | partial |
| 3 | observation | scene-3 | EXPLAIN | drift_down | EXPLAIN | pan_right | partial |
| 4 | meaning | scene-4 | EXPLAIN | drift_up | REVEAL | drift_up | partial |
| 5 | meaning | scene-5 | EXPLAIN | drift_down | HOLD | static | partial |
| 6 | reveal | scene-1 | REVEAL | zoom_out |  |  | partial |
| 7 | reveal | scene-2 | REVEAL | drift_up |  |  | partial |
| 8 | cta | scene-3 | CLOSE | static |  |  | partial |
| 9 | cta | scene-4 | CLOSE | static |  |  | partial |

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
  "image_pass_through_decisions": 5,
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
