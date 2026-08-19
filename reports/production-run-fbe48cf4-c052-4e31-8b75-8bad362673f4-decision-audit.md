# Decision Audit — Production Run `fbe48cf4-c052-4e31-8b75-8bad362673f4`

_Read-only. Generated 2026-07-25T06:11:09.914Z._

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
| df31e14e-4a31-4e8f-b4ef-8a454d899e26 | shimmer | legacy_default_alloy | no | no |

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

### Package: Good Traffic Is a Lie (`fb9839ea-92fd-461b-a1a5-002058ea4251`)

**Persisted generation log**
```json
{
  "mode": "enabled",
  "pipeline": "content_pipeline",
  "tts_voice": "shimmer",
  "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "cta_selected": false,
  "voice_scores": {
    "primary": 41,
    "secondary": 46
  },
  "voice_source": "package_secondary",
  "creative_mode": "contrarian",
  "video_concept": {
    "title": "Good Traffic Is a Lie",
    "core_idea": "Most small business owners believe that website traffic is proof their marketing is working. This video dismantles that belief by revealing what the analytics screen actually shows when you look closer — real people who arrived, had a question, got silence, and left for whoever answered first. The product is introduced not as a chatbot, but as the thing that makes the website actually present when a human arrives.",
    "product_role": "Fenrik.chat is introduced as the presence the website was always missing — not a technical product, not a chatbot project, but the thing that makes a live website actually behave like a live business. It enters the story as the resolution to a problem the viewer has just been shown they already have.",
    "why_it_works": "The contrarian move is precise: it does not attack the idea of driving traffic, it reframes what traffic actually measures. The audience believes traffic equals traction. The video proves traffic without response is just a record of missed opportunities. The insider voice keeps it from feeling like a lecture — it feels like someone finally telling you what the dashboard was always trying to say. The scenario is fresh, grounded in a specific moment (Tuesday morning, analytics open), and avoids every recently used situation. The hook is a declarative reframe rather than a question or dramatic claim, which fits the unexpected-truth archetype without echoing prior hooks.",
    "narrative_arc": "HOOK — Open on a business owner, coffee in hand, Tuesday morning, genuinely pleased as she opens her analytics dashboard. The numbers look good. Weekend traffic was real. She leans in. WHY WRONG — The camera pushes closer on the screen. Sessions: 34. Leads captured: 0. Bounce rate: 91%. She scrolls. Nothing. No form fills. No emails. No names. The voiceover lands the reframe: good traffic means people showed up. It does not mean anyone was home to meet them. DISMANTLE — A quick visual sequence: a visitor lands on the site at 9 PM Saturday, reads a service page, has a question, finds no way to ask it, opens a competitor tab. Then another visitor. Then another. The site was live. The business was not. PROOF — The voiceover pivots: the fix is not more traffic, not a bigger team, not a redesign. It is a website that can actually respond — one that reads your existing content, builds its own knowledge, and answers the moment someone asks. No training. No code. Ready in about a minute. CTA — Screen holds on the analytics dashboard, but this time the lead count is not zero. Voiceover closes: your traffic was never the problem.",
    "emotional_tone": "Quietly unsettling at first — the creeping recognition of a problem hiding inside something that looked fine. Shifts to calm, insider clarity. Never alarmist. The mood is a trusted colleague leaning over and pointing at something you missed, not a warning siren.",
    "audience_insight": "Small business owners in service industries monitor traffic as a proxy for marketing success. They rarely interrogate the gap between sessions and leads because the dashboard does not make that gap obvious or painful. When it is made visible — concretely, with real numbers — the reaction is not anger but a quiet, sinking recognition. That moment of recognition is the entry point.",
    "visual_direction": {
      "palette": "Warm neutrals for the environment — off-white walls, natural wood desk, muted sage or terracotta accents. The screen is the only source of cooler blue-grey tones. No brand-forward colors until the product moment, where a single clean accent (soft teal or slate blue) enters with the Fenrik interface.",
      "lighting": "Soft morning window light from one side, warm but slightly flat — the kind of light that makes everything look ordinary and fine before you look closer. The screen glow adds a cool secondary source that subtly competes with the warmth, creating a small visual tension between the hopeful morning and the cold data.",
      "environment": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a startup loft, not a corporate office. A framed license or certificate visible but not foregrounded. Plants optional. The space should feel like someone who built something real and is proud of it.",
      "camera_style": "Handheld but composed — slight natural movement that keeps it feeling observational rather than staged. Push-in slowly on the screen during the realization beat. Cut to over-the-shoulder POV for the analytics close-up. The competitor-tab sequence uses a clean screen-capture style insert, brief and precise. Final frame is a static wide shot of the desk with the screen now showing a lead notification.",
      "art_direction": "Clean, realistic small-business aesthetic — not polished corporate, not gritty. The kind of desk that has a half-drunk coffee, a sticky note, and a laptop that is two years old. Screen content is legible and real-looking: a simple analytics dashboard with visible session counts and a lead column showing zero. Motion is slow and deliberate — no fast cuts in the first half. The pacing mirrors the creeping realization.",
      "character_style": "One central character — a woman in her late 30s or early 40s, owner of a local service business (deliberately non-specific industry to stay broadly relatable). Dressed practically, not stylishly. Her expression does the narrative work: pleased, then puzzled, then still — the stillness of someone doing quiet math in their head. No dialogue. No voiceover from her. She is observed, not interviewed."
    }
  },
  "voice_reasons": [
    "funnel_problem→warmth(+2)",
    "mode_contrarian→energy(+3)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+41)",
    "fit_secondary(+46)"
  ],
  "opening_impact": {
    "pacing": "Slow and deliberate, mirroring the woman's growing concern.",
    "emotion": "A creeping sense of unease as realization dawns.",
    "first_image": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen.",
    "attention_pattern": "The viewer is drawn in by the contrast between the initial optimism of good traffic and the unsettling truth revealed by the analytics.",
    "first_spoken_sentence": "You thought traffic meant success."
  },
  "selected_voice": "shimmer",
  "visual_profile": "MINIMAL",
  "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: measured, credible. Language: en.",
  "downgrade_rules": [],
  "visual_identity": {
    "palette": "Warm neutrals for the environment — off-white walls, natural wood desk, muted sage or terracotta accents. The screen is the only source of cooler blue-grey tones. No brand-forward colors until the product moment, where a single clean accent (soft teal or slate blue) enters with the Fenrik interface.",
    "lighting": "Soft morning window light from one side, warm but slightly flat — the kind of light that makes everything look ordinary and fine before you look closer. The screen glow adds a cool secondary source that subtly competes with the warmth, creating a small visual tension between the hopeful morning and the cold data.",
    "environment": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a startup loft, not a corporate office. A framed license or certificate visible but not foregrounded. Plants optional. The space should feel like someone who built something real and is proud of it.",
    "camera_style": "Handheld but composed — slight natural movement that keeps it feeling observational rather than staged. Push-in slowly on the screen during the realization beat. Cut to over-the-shoulder POV for the analytics close-up. The competitor-tab sequence uses a clean screen-capture style insert, brief and precise. Final frame is a static wide shot of the desk with the screen now showing a lead notification.",
    "art_direction": "Clean, realistic small-business aesthetic — not polished corporate, not gritty. The kind of desk that has a half-drunk coffee, a sticky note, and a laptop that is two years old. Screen content is legible and real-looking: a simple analytics dashboard with visible session counts and a lead column showing zero. Motion is slow and deliberate — no fast cuts in the first half. The pacing mirrors the creeping realization.",
    "character_style": "One central character — a woman in her late 30s or early 40s, owner of a local service business (deliberately non-specific industry to stay broadly relatable). Dressed practically, not stylishly. Her expression does the narrative work: pleased, then puzzled, then still — the stillness of someone doing quiet math in their head. No dialogue. No voiceover from her. She is observed, not interviewed.",
    "opening_emotion": "A creeping sense of unease as realization dawns.",
    "opening_first_image": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen."
  },
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: measured, credible. Language: en.",
  "history_decisions": [],
  "visual_beat_count": 5,
  "accepted_cta_count": 0,
  "cta_composition_id": null,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "frequency_decisions": [],
  "requested_cta_count": 0,
  "selected_pain_point": "Visitors leave before contacting you",
  "accepted_phone_count": 0,
  "accepted_quote_count": 0,
  "cta_renderer_version": null,
  "downgraded_cta_count": 0,
  "generation_telemetry": {
    "steps": [
      {
        "model": "claude-sonnet-4-6",
        "repair": false,
        "success": true,
        "provider": "claude",
        "warnings": [],
        "raw_usage": {
          "model": "claude-sonnet-4-6",
          "cached_tokens": 0,
          "prompt_tokens": 3876,
          "completion_tokens": 1282
        },
        "step_name": "Video Concept",
        "max_tokens": null,
        "started_at": "2026-07-25T00:08:13.292Z",
        "duration_ms": 34313,
        "finished_at": "2026-07-25T00:08:47.604Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": 0,
        "error_message": null,
        "input_summary": "Video Concept input:\n- Product Brain\n- Knowledge Base\n- Recent Content Memory\n- Content Strategy item",
        "prompt_tokens": 3876,
        "estimated_cost": 0.030858,
        "output_summary": "Concept: Good Traffic Is a Lie",
        "pricing_source": "list_price_estimate",
        "pricing_version": "list-price@2026-07-23",
        "response_format": "json",
        "input_size_bytes": 17400,
        "completion_tokens": 1282,
        "output_size_bytes": 5714,
        "prompt_characters": 17304,
        "provider_request_id": null,
        "completion_characters": 5674
      },
      {
        "model": "gpt-4o-mini-2024-07-18",
        "repair": false,
        "success": true,
        "provider": "openai",
        "warnings": [],
        "raw_usage": {
          "model": "gpt-4o-mini-2024-07-18",
          "cached_tokens": 0,
          "prompt_tokens": 4212,
          "completion_tokens": 159
        },
        "step_name": "Opening Impact",
        "max_tokens": null,
        "started_at": "2026-07-25T00:08:47.606Z",
        "duration_ms": 3530,
        "finished_at": "2026-07-25T00:08:51.136Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": 0,
        "error_message": null,
        "input_summary": "Opening Impact input:\n- Video Concept\n- Product Brain\n- Recent Content Memory",
        "prompt_tokens": 4212,
        "estimated_cost": 0.000727,
        "output_summary": "Opening: You thought traffic meant success.",
        "pricing_source": "list_price_estimate",
        "pricing_version": "list-price@2026-07-23",
        "response_format": "json",
        "input_size_bytes": 20974,
        "completion_tokens": 159,
        "output_size_bytes": 704,
        "prompt_characters": 20842,
        "provider_request_id": null,
        "completion_characters": 704
      },
      {
        "model": null,
        "repair": false,
        "success": true,
        "provider": "deterministic",
        "warnings": [],
        "raw_usage": null,
        "step_name": "Visual Identity",
        "max_tokens": null,
        "started_at": "2026-07-25T00:08:51.136Z",
        "duration_ms": 1,
        "finished_at": "2026-07-25T00:08:51.137Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": null,
        "error_message": null,
        "input_summary": "Visual Identity input:\n- Video Concept visual_direction\n- Opening Impact",
        "prompt_tokens": null,
        "estimated_cost": null,
        "output_summary": "Art direction: Clean, realistic small-business aesthetic — not polished cor",
        "pricing_source": null,
        "pricing_version": null,
        "response_format": null,
        "input_size_bytes": null,
        "completion_tokens": null,
        "output_size_bytes": 2675,
        "prompt_characters": null,
        "provider_request_id": null,
        "completion_characters": 2659
      },
      {
        "model": "claude-sonnet-4-6",
        "repair": false,
        "success": true,
        "provider": "claude",
        "warnings": [],
        "raw_usage": {
          "model": "claude-sonnet-4-6",
          "cached_tokens": 0,
          "prompt_tokens": 9770,
          "completion_tokens": 3178
        },
        "step_name": "Content Package",
        "max_tokens": null,
        "started_at": "2026-07-25T00:08:51.141Z",
        "duration_ms": 61226,
        "finished_at": "2026-07-25T00:09:52.366Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": 0,
        "error_message": null,
        "input_summary": "Content Package input:\n- Video Concept\n- Opening Impact\n- Visual Identity\n- Product Brain\n- Strategy Item",
        "prompt_tokens": 9770,
        "estimated_cost": 0.07698,
        "output_summary": "Package: Good Traffic Is a Lie",
        "pricing_source": "list_price_estimate",
        "pricing_version": "list-price@2026-07-23",
        "response_format": "json",
        "input_size_bytes": 40385,
        "completion_tokens": 3178,
        "output_size_bytes": 12517,
        "prompt_characters": 40109,
        "provider_request_id": null,
        "completion_characters": 12453
      },
      {
        "model": null,
        "repair": false,
        "success": true,
        "provider": "deterministic",
        "warnings": [],
        "raw_usage": null,
        "step_name": "Platform Outputs",
        "max_tokens": null,
        "started_at": "2026-07-25T00:09:52.368Z",
        "duration_ms": 1,
        "finished_at": "2026-07-25T00:09:52.368Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": null,
        "error_message": null,
        "input_summary": "Platform Outputs input:\n- Content Package\n- Target platforms",
        "prompt_tokens": null,
        "estimated_cost": null,
        "output_summary": "Platforms: tiktok, instagram, youtube, facebook, linkedin, x",
        "pricing_source": null,
        "pricing_version": null,
        "response_format": null,
        "input_size_bytes": null,
        "completion_tokens": null,
        "output_size_bytes": 3987,
        "prompt_characters": null,
        "provider_request_id": null,
        "completion_characters": 3971
      },
      {
        "model": null,
        "repair": false,
        "success": true,
        "provider": "deterministic",
        "warnings": [],
        "raw_usage": null,
        "step_name": "Persist Package",
        "max_tokens": null,
        "started_at": "2026-07-25T00:09:52.369Z",
        "duration_ms": 2950,
        "finished_at": "2026-07-25T00:09:55.319Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": null,
        "error_message": null,
        "input_summary": "Persist Package input:\n- Validated package\n- Content items fan-out plan",
        "prompt_tokens": null,
        "estimated_cost": null,
        "output_summary": "packageId=fb9839ea-92fd-461b-a1a5-002058ea4251; items=11",
        "pricing_source": null,
        "pricing_version": null,
        "response_format": null,
        "input_size_bytes": null,
        "completion_tokens": null,
        "output_size_bytes": 552,
        "prompt_characters": null,
        "provider_request_id": null,
        "completion_characters": 552
      }
    ],
    "phases": [],
    "version": "pipeline-telemetry@1",
    "pipeline": "content_pipeline",
    "pricing_version": "list-price@2026-07-23",
    "strategy_item_id": "51d2f466-2f1b-48e4-8fb7-1734cf469fdc",
    "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4"
  },
  "requested_phone_count": 0,
  "requested_quote_count": 0,
  "visual_profile_scores": {
    "BOLD": 0,
    "MINIMAL": 6,
    "NATURAL": 5,
    "PREMIUM": 0,
    "EDITORIAL": 4
  },
  "visual_profile_source": "auto",
  "downgraded_phone_count": 0,
  "downgraded_quote_count": 0,
  "phone_renderer_version": null,
  "quote_renderer_version": null,
  "resolved_primary_voice": "cedar",
  "sparse_plan_adjustment": false,
  "visual_profile_reasons": [
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
  ],
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
  "target_visual_beat_count": 8,
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
  "content_pipeline_fingerprint": {
    "version": "content-pipeline-fingerprint@1",
    "core_idea": "Most small business owners believe that website traffic is proof their marketing is working. This video dismantles that belief by revealing what the analytics screen actually shows when you look clos…",
    "environment": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a …",
    "product_role": "Fenrik.chat is introduced as the presence the website was always missing — not a technical product, not a chatbot project, but the thing that makes a live webs…",
    "visual_world": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a startup loft, not a corporate office. A …",
    "attention_pattern": "The viewer is drawn in by the contrast between the initial optimism of good traffic and the unsettling truth revealed b…",
    "narrative_mechanism": "contrarian: HOOK — Open on a business owner, coffee in hand, Tuesday morning, genuinely ple…"
  },
  "recent_creative_fingerprints": [
    {
      "hook": "Your clock stopped. Theirs didn't.",
      "topic": "The software company that answered every support ticket within hours — and still lost the enterprise deal because no one was there at 2 AM when it actually mattered",
      "motifs": [
        "phone",
        "group",
        "close_up",
        "product_asset"
      ],
      "closing": "Photorealistic portrait 9:16 vertical frame. The mustard-yellow wall. Both clocks now show the same time — second hands ",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
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
      "attention_mechanism": "PROVOCATIVE_OPINION",
      "opening_visual_motif": "megaphone_pointed_empty_room_volume_without",
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": "PRODUCT_OUTCOME",
      "opening_emotional_effect": "strong_opinion"
    },
    {
      "hook": "You've been defining this number wrong for years.",
      "topic": "The small business owner who sent a campaign, got 50 website visitors in one afternoon, and woke up to zero leads — because no one was there to answer a single question",
      "motifs": [
        "laptop",
        "phone",
        "whiteboard",
        "person_alone",
        "group",
        "close_up"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the resolution beat (seconds 17–22); p",
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
      "attention_mechanism": "FRUSTRATION",
      "opening_visual_motif": "hands_crumpling_content_idea_sticky_that",
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
      "opening_emotional_effect": "frustration"
    },
    {
      "hook": "You track everything. Except the thing that's costing you the most.",
      "topic": "Why the businesses that capture the most leads aren't always the ones with the best product — they're the ones whose websites respond first",
      "motifs": [
        "laptop",
        "dashboard",
        "group",
        "close_up",
        "overhead",
        "product_asset"
      ],
      "closing": "Photorealistic portrait 9:16 vertical frame. A laptop sits open on the same pale eucalyptus wood surface, screen facing ",
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
      "opening_structure": "split_choice",
      "cta_composition_id": null,
      "attention_mechanism": "DILEMMA",
      "opening_visual_motif": "hand_hovering_over_packed_suitcase_while",
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME",
      "opening_emotional_effect": "dilemma"
    },
    {
      "hook": "Every other chatbot integration looks like this.",
      "topic": "The part of setting up an AI assistant for your website that most business owners expect to be hard — and isn't",
      "motifs": [
        "overhead"
      ],
      "closing": "typed_cta",
      "typed_cta": true,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "CTA"
      ],
      "sfx_category": null,
      "creative_mode": null,
      "visual_medium": "PHOTOGRAPHIC",
      "meaning_carrier": "human",
      "opening_structure": "split_choice",
      "cta_composition_id": "minimal_statement",
      "attention_mechanism": "CONTRAST",
      "opening_visual_motif": "split_screen_chaos_posting_calm_scheduled",
      "dominant_subject_motif": "overhead",
      "product_reveal_strategy": "PRODUCT_OUTCOME",
      "opening_emotional_effect": "tension"
    },
    {
      "hook": "You built the whole pipeline. You just forgot to put anything at the end of it.",
      "topic": "What changes when your website can actually answer a visitor's question — the moment they ask it",
      "motifs": [
        "meeting",
        "close_up"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final resolution beat (seconds 18–",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "sfx_category": null,
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "human",
      "opening_structure": "visual_first_question",
      "cta_composition_id": null,
      "attention_mechanism": "SURPRISE",
      "opening_visual_motif": "pull_back_reveal_polished_brand_feed",
      "dominant_subject_motif": "meeting",
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
      "opening_emotional_effect": "surprise"
    },
    {
      "hook": "One tab closed. No email. No missed call. No record. Just gone.",
      "topic": "Why hiring more staff doesn't fix the problem of visitors who leave before they ever make contact",
      "motifs": [
        "phone",
        "person_alone",
        "product_asset",
        "monitor"
      ],
      "closing": "Soft polished 3D render, portrait 9:16 vertical frame. Final close: the corkboard again, now filling the entire frame. T",
      "typed_cta": false,
      "scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "sfx_category": null,
      "creative_mode": null,
      "visual_medium": "SOFT_3D",
      "meaning_carrier": "human",
      "opening_structure": "immediate_reaction",
      "cta_composition_id": null,
      "attention_mechanism": "CURIOSITY_GAP",
      "opening_visual_motif": "door_cracked_open_onto_unfinished_half",
      "dominant_subject_motif": "phone",
      "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
      "opening_emotional_effect": "curiosity"
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
  "ctaUsedInRecentWindow": true,
  "history_prompt_block": "SCENE TYPE MEMORY (project content history — soft signals only):\n- Scene Types are presentation tools chosen per beat, not recurring templates.\n- IMAGE remains common across a monthly series; that is normal.\n- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.\n- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:\n  prefer the less recently used expression (especially within this production run / weekly strategy).\n- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.\n- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft\n  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.\n- Voiceover and subtitles can carry CTAs without a CTA scene.\n- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.\n- There is no minimum or maximum count of typed scenes across the series.\n- Recent packages for this project used these presentation patterns (newest first): IMAGE-only | IMAGE-only | IMAGE-only | CTA | IMAGE-only | IMAGE-only.\n- A dedicated CTA scene appeared in a recent video. Soft signal — use typed CTA again only when a branded end card is clearly the strongest close."
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

### Job df31e14e-4a31-4e8f-b4ef-8a454d899e26

| beat | storyboard role | scene_id | resolver intent | primitive | stored intent | stored primitive | match? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | common_belief | scene-1 | EXPLAIN | static | EXPLAIN | static | yes |
| 2 | common_belief | scene-2 | EXPLAIN | pan_left | EXPLAIN | pan_left | yes |
| 3 | why_wrong | scene-3 | EXPLAIN | static | EXPLAIN | static | yes |
| 4 | why_wrong | scene-4 | EXPLAIN | pan_right | EMPHASIS | zoom_in | partial |
| 5 | proof | scene-5 | EMPHASIS | zoom_in | CLOSE | static | partial |
| 6 | proof | scene-1 | EMPHASIS | static |  |  | partial |
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
