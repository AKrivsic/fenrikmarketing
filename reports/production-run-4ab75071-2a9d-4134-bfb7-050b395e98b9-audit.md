# Production Run Audit — 4ab75071-2a9d-4134-bfb7-050b395e98b9

_Generated 2026-07-17T06:45:59.941Z by `scripts/audit-production-run.ts` (read-only)._

## A. Executive summary

- **Strategy items:** 1
- **Content packages:** 1
- **Primary video jobs (newest per item):** 1 (1 completed, 0 failed)
- **Content items (all variants):** 10
- **Scene types in worker inputs:** {"IMAGE":4}
- **Visual profile(s) on jobs:** NATURAL (project auto: MINIMAL)
- **Voices used:** shimmer (project default: cedar)
- **Moderation fallback scenes:** 0
- **Run warnings (subtitle/render flags):** 0
- **Major warnings:** None flagged on completed jobs.

## B. Run overview

| Field | Value |
| --- | --- |
| production_run_id | `4ab75071-2a9d-4134-bfb7-050b395e98b9` |
| project_id | `aabab9ff-9db4-4012-a53c-135e3bfea6cd` |
| project name | Fenrik.chat |
| status | completed |
| created_at | 2026-07-17T00:17:09.983447+00:00 |
| updated_at (terminal) | 2026-07-17T00:22:28.271391+00:00 |
| package_count | 1 |
| requested_total | 1 |
| generated_total | 1 |
| failed_total | 0 |
| error_message |  |
| language | en |
| market_scope | global |

### requested_config

```json
{
  "plan": {
    "videoCount": 1,
    "packageCount": 1,
    "totalOutputs": 10,
    "platformOutputs": [
      {
        "kind": "video",
        "label": "TikTok",
        "outputs": 1,
        "platform": "tiktok",
        "multiplier": 1
      },
      {
        "kind": "video",
        "label": "Instagram",
        "outputs": 1,
        "platform": "instagram",
        "multiplier": 1
      },
      {
        "kind": "video",
        "label": "YouTube",
        "outputs": 1,
        "platform": "youtube",
        "multiplier": 1
      },
      {
        "kind": "text",
        "label": "LinkedIn",
        "outputs": 2,
        "platform": "linkedin",
        "multiplier": 1.5
      },
      {
        "kind": "text",
        "label": "X",
        "outputs": 5,
        "platform": "x",
        "multiplier": 5
      }
    ],
    "textOutputsTotal": 7,
    "videoOutputsTotal": 3
  },
  "config": {
    "platforms": [
      "tiktok",
      "instagram",
      "youtube",
      "linkedin",
      "x"
    ],
    "multipliers": {
      "x": 5,
      "tiktok": 1,
      "youtube": 1,
      "linkedin": 1.5,
      "instagram": 1
    },
    "packageCount": 1,
    "platformContentTypes": {
      "x": "text_only",
      "tiktok": "video",
      "youtube": "video",
      "facebook": "text_only",
      "linkedin": "text_only",
      "instagram": "video",
      "google_business": "text_only"
    }
  }
}
```

### Parent content strategies

- **67f25fe3-f76e-4eb0-884b-363bf31fdac9** — The silent website problem: what happens to visitors when no one is there to answer them
```json
{
  "theme": "The silent website problem: what happens to visitors when no one is there to answer them",
  "source": "production_run",
  "production_run_id": "4ab75071-2a9d-4134-bfb7-050b395e98b9",
  "funnel_distribution": {
    "Awareness": 0,
    "Conversion": 0,
    "Problem Aware": 1,
    "Solution Aware": 0
  }
}
```

### production_run_items

```json
[
  {
    "id": "f18c1b3f-4686-4774-be72-a6df9d5c9d2a",
    "production_run_id": "4ab75071-2a9d-4134-bfb7-050b395e98b9",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "90741dd0-2704-462e-8998-d29a0dfdbd8e",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-17T00:17:10.27987+00:00",
    "updated_at": "2026-07-17T00:22:27.956437+00:00"
  }
]
```

## C. Package-by-package audit

### Package 1 — The HVAC company that got slammed with website traffic during a heatwave — and lost every single online lead

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `90741dd0-2704-462e-8998-d29a0dfdbd8e` |
| strategy_item_id | `5f0d667f-2d05-49fd-9b7c-d7ebe8c558c5` |
| weekly_strategy_id | `67f25fe3-f76e-4eb0-884b-363bf31fdac9` |
| production_run_id | `4ab75071-2a9d-4134-bfb7-050b395e98b9` |
| status | draft |
| funnel_stage | problem_aware |
| created_at | 2026-07-17T00:18:29.683749+00:00 |
| updated_at | 2026-07-17T00:22:27.252088+00:00 |
| primary content_item_id | `71ea27ec-0e57-42b4-b528-1a2d6691279e` |
| video_job_id | `a557c8d4-f3e6-46aa-a053-9ba8da71dc25` |
| video_job status | completed |

#### Strategy input

- **topic:** The HVAC company that got slammed with website traffic during a heatwave — and lost every single online lead
- **angle:** Dramatize the moment a small service business is overwhelmed with phone calls while their website silently turns away visitor after visitor who needed answers and moved on to a competitor — exposing the real cost of having no one available to handle online inquiries when demand spikes
- **package_index:** 0
- **platform:** tiktok
- **format:** reel
- **priority:** 1
- **funnel_stage (column):** problem_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "Dramatize the moment a small service business is overwhelmed with phone calls while their website silently turns away visitor after visitor who needed answers and moved on to a competitor — exposing the real cost of having no one available to handle online inquiries when demand spikes",
  "topic": "The HVAC company that got slammed with website traffic during a heatwave — and lost every single online lead",
  "source": "production_run",
  "package_index": 0,
  "production_run_id": "4ab75071-2a9d-4134-bfb7-050b395e98b9"
}
```

#### Full content (package_brief core)

**hook:**

Most service businesses think being busy means business is good


**voiceover_text:**

Most service businesses think being busy means business is good. It isn't. When your phones are slammed, your website is still getting visitors — and nobody's there to answer them. They don't wait. They don't fill out a form. They find someone who answers. The overlooked detail isn't the missed call. It's the silent website running alongside it, turning away every visitor you never even knew showed up.


**subtitles:**

Phone ringing off the hook. Website full of visitors. Zero leads captured. // Most service businesses think being busy means business is good. // It isn't. // When your phones are slammed, your website is still getting visitors — and nobody's there to answer them. // They don't wait. They don't fill out a form. // They find someone who answers. // The overlooked detail isn't the missed call. // It's the silent website running alongside it — turning away every visitor you never knew showed up.


**video concept:**

Open on the felt frustration of peak-demand chaos — phones ringing, front desk overwhelmed — then pivot to the contrarian insight: being slammed with calls is not the same as capturing every lead. The silent website is the overlooked hole. Structure follows common_belief → why_wrong → proof → cta. Tone is dry, reporter-style, matter-of-fact. No dramatization of the phone chaos itself — the real story is what's happening on the website at the same moment.


**video script:**

BEAT 1 — COMMON BELIEF (0–4s): Open on a service business front desk in peak chaos. Phones ringing, staff stretched. Voiceover: 'Phone ringing off the hook. Website full of visitors. Zero leads captured.' BEAT 2 — WHY WRONG (5–12s): Cut to a wide shot — a person walking away from a storefront door, no answer, moving on. Voiceover: 'Most service businesses think being busy means business is good. It isn't. When your phones are slammed, your website is still getting visitors — and nobody's there to answer them. They don't wait. They don't fill out a form. They find someone who answers.' BEAT 3 — PROOF / REVEAL (13–20s): Cut to a quiet interior — a laptop open on a desk, screen showing a chat interface actively answering a question. Voiceover: 'The overlooked detail isn't the missed call. It's the silent website running alongside it, turning away every visitor you never even knew showed up.' BEAT 4 — CTA (21–24s): Final still. Voiceover fades. Subtitle: 'Create your AI assistant — let your website answer while your phones are ringing.'


**duration_seconds (brief):** 22–25

**CTA:** Create your AI assistant — let your website answer while your phones are ringing (type: sign_up)

**creative_mode:** contrarian

**hashtags:** ["#smallbusiness","#leadgeneration","#aichatbot","#websitetips","#servicebusiness","#customerexperience","#hvac","#onlineleads","#businessgrowth","#fenrikchat"]


#### Full platform copy

##### x

```json
{
  "cta": "Your website can answer while you can't — fenrik.chat",
  "format": "Single tweet, terse and opinionated, under 280 characters",
  "caption": "Phones ringing all day = business is good. Except your website had 40 visitors during that same rush and answered zero of them. Being busy and being available are not the same thing.",
  "hashtags": [
    "#smallbusiness",
    "#leadgeneration"
  ],
  "title_variants": [
    "Busy phones, silent website — the lead leak nobody notices",
    "The HVAC heatwave problem isn't the calls you missed",
    "Peak demand reveals the channel you forgot was open",
    "Being slammed with work is not the same as capturing every lead",
    "Your website had visitors during your busiest hour and answered none of them"
  ],
  "caption_variants": [
    "Phones ringing all day = business is good. Except your website had 40 visitors during that same rush and answered zero of them. Being busy and being available are not the same thing.",
    "The heatwave hits. Phones go wild. Front desk is buried. And your website? Still open. Still getting visitors. Still saying nothing. That silence has a cost.",
    "Peak demand doesn't just stress your phones. It exposes every channel you forgot to staff — starting with your website. Visitors don't wait. They find someone who answers.",
    "Hot take: your busiest day might also be your worst day for online leads. When every person is on a call, your website runs unsupported. And those visitors don't leave a voicemail.",
    "Service business reality check: a flooded inbox and a ringing phone feel like winning. Your website visitor who left 10 minutes ago without a reply disagrees."
  ]
}
```
##### tiktok

```json
{
  "cta": "Check the link in bio and let your site answer while you're slammed.",
  "format": "Vertical short (9:16), 22–25s, fast-paced cuts, burned-in subtitles",
  "caption": "Phones ringing all day. Website packed with visitors. And you captured zero of them. Being busy isn't the same as being available — your website was silent the whole time.",
  "hashtags": [
    "#smallbusiness",
    "#customerservice",
    "#websitetips",
    "#leadgeneration"
  ]
}
```
##### youtube

```json
{
  "cta": "Create your AI assistant at fenrik.chat — and subscribe for more on turning website traffic into real leads.",
  "format": "YouTube Short (9:16), 22–25s, subtitles, framed product insert at close",
  "caption": "When your phones are ringing off the hook, it feels like business is booming. But your website is running at the same time — and if it can't answer visitor questions, those leads are walking straight to a competitor. This short breaks down the overlooked detail most service businesses miss during peak demand: the silent website. Your phones have a limit. Your website doesn't have to. Create your AI assistant at fenrik.chat.",
  "hashtags": [
    "#smallbusiness",
    "#leadgeneration",
    "#aichatbot",
    "#websitetips",
    "#servicebusiness"
  ]
}
```
##### linkedin

```json
{
  "cta": "If your website can't answer questions when your team is overwhelmed, what is it actually doing for you? Worth asking.",
  "format": "Text post, professional tone, no emoji",
  "caption": "A common assumption in service businesses: if the phones are ringing, leads are coming in. But your website is running at the same time — and when every staff member is handling calls, the visitors landing on your site get silence. No answer. No follow-up. They leave. The overlooked detail in peak-demand situations isn't the missed call. It's the website that ran alongside it, unanswered, for every hour of that rush.",
  "hashtags": [
    "#smallbusiness",
    "#leadgeneration",
    "#customerexperience"
  ],
  "title_variants": [
    "The detail most service businesses miss during their busiest days",
    "Being slammed with calls is not the same as capturing every lead"
  ],
  "caption_variants": [
    "A common assumption in service businesses: if the phones are ringing, leads are coming in. But your website is running at the same time — and when every staff member is handling calls, the visitors landing on your site get silence. No answer. No follow-up. They leave. The overlooked detail in peak-demand situations isn't the missed call. It's the website that ran alongside it, unanswered, for every hour of that rush.",
    "Peak demand exposes a gap most service businesses don't notice until it's over. When the front desk is overwhelmed and every line is busy, website visitors are still arriving — asking questions, looking for answers, ready to become leads. They don't know you're slammed. They just know nobody replied. And they move on. The problem isn't the missed call. It's the channel you forgot was open."
  ]
}
```
##### instagram

```json
{
  "cta": "Create your AI assistant — link in bio.",
  "format": "Vertical Reel (9:16), 22–25s, polished cuts, subtitles on screen",
  "caption": "Your busiest day might also be your biggest lead leak. 📵 When every phone line is full, your website is still getting visitors — and if there's no one there to answer them, they don't wait. They move on. The overlooked detail isn't the missed call. It's the silent website running alongside it. Your phones can't be everywhere. Your website can.",
  "hashtags": [
    "#smallbusiness",
    "#servicebusiness",
    "#leadgeneration",
    "#websitetips",
    "#aichatbot",
    "#customerexperience",
    "#businessgrowth",
    "#hvac",
    "#onlineleads",
    "#fenrikchat"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Photorealistic portrait 9:16 vertical photograph. A service business reception counter — warm wood surfaces, amber highlights from cool clear morning light entering through a window on the left. A woman in her 30s stands at the counter, phone pressed to her ear, one hand raised mid-gesture, expression tense and focused. A second phone on the counter has its light blinking. A foreground plant frames the left edge of the frame. The background shows a clean quiet studio-like interior. Two people at conversational distance — a colleague leans in from the right. Natural candid composition, realistic textures, restrained contrast. No readable text or signs anywhere in the scene."
    },
    {
      "source": "ai",
      "image_prompt": "Photorealistic portrait 9:16 vertical photograph. A man in his late 30s walks away from a glass service entrance door, mid-stride, shoulders slightly dropped — the door is closed behind him, no one visible inside to greet him. Cool clear morning light from the left casts a soft shadow. Warm wood tones on the door frame and flooring. A potted plant in the foreground right provides natural framing. The composition is slightly above table height, subject centered with natural headroom. The mood is quiet resignation — a customer leaving unanswered. No text, signs, or readable labels anywhere."
    },
    {
      "source": "ai",
      "image_prompt": "Photorealistic portrait 9:16 vertical photograph. A clean quiet studio-like interior. A woman in her early 40s sits at a warm wood surface, looking at an open laptop screen — over-the-shoulder framing, her gaze directed at the screen. The laptop screen displays a recognizable chat interface layout with message bubbles and a text input area, no readable words. Cool clear morning light from the left, amber highlights on the wood surface. A shelf with a small plant frames the upper left. The mood is quiet optimism — something working without effort. Candid composition, realistic textures, restrained contrast. No readable text or UI labels."
    },
    {
      "modify": "false",
      "source": "asset",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 21–25); place it centered within a clean laptop mockup positioned on the warm wood surface in the quiet studio interior — cool clear morning light from the left, amber highlights, slightly above table height camera, foreground plant framing the left edge — do not crop fullscreen; the laptop sits naturally as a prop with intentional negative space around it.",
      "asset_id": "b1b0d00c-0bfc-4095-954f-4b38a813747f",
      "video_usage": "framed_laptop"
    }
  ],
  "image_prompts": [
    "Photorealistic portrait 9:16 vertical photograph. A service business reception counter — warm wood surfaces, amber highlights from cool clear morning light entering through a window on the left. A woman in her 30s stands at the counter, phone pressed to her ear, one hand raised mid-gesture, expression tense and focused. A second phone on the counter has its light blinking. A foreground plant frames the left edge of the frame. The background shows a clean quiet studio-like interior. Two people at conversational distance — a colleague leans in from the right. Natural candid composition, realistic textures, restrained contrast. No readable text or signs anywhere in the scene.",
    "Photorealistic portrait 9:16 vertical photograph. A man in his late 30s walks away from a glass service entrance door, mid-stride, shoulders slightly dropped — the door is closed behind him, no one visible inside to greet him. Cool clear morning light from the left casts a soft shadow. Warm wood tones on the door frame and flooring. A potted plant in the foreground right provides natural framing. The composition is slightly above table height, subject centered with natural headroom. The mood is quiet resignation — a customer leaving unanswered. No text, signs, or readable labels anywhere.",
    "Photorealistic portrait 9:16 vertical photograph. A clean quiet studio-like interior. A woman in her early 40s sits at a warm wood surface, looking at an open laptop screen — over-the-shoulder framing, her gaze directed at the screen. The laptop screen displays a recognizable chat interface layout with message bubbles and a text input area, no readable words. Cool clear morning light from the left, amber highlights on the wood surface. A shelf with a small plant frames the upper left. The mood is quiet optimism — something working without effort. Candid composition, realistic textures, restrained contrast. No readable text or UI labels."
  ],
  "asset_usage": [
    {
      "modify": "false",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 21–25); place it centered within a clean laptop mockup positioned on the warm wood surface in the quiet studio interior — cool clear morning light from the left, amber highlights, slightly above table height camera, foreground plant framing the left edge — do not crop fullscreen; the laptop sits naturally as a prop with intentional negative space around it.",
      "asset_id": "b1b0d00c-0bfc-4095-954f-4b38a813747f"
    }
  ],
  "presentation_generation": {
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
  },
  "presentation_analyzer": {
    "decisions": [
      {
        "rule": "allowed",
        "reason": "image scene",
        "scene_id": "scene-1",
        "final_type": "IMAGE",
        "requested_type": "IMAGE"
      },
      {
        "rule": "allowed",
        "reason": "image scene",
        "scene_id": "scene-2",
        "final_type": "IMAGE",
        "requested_type": "IMAGE"
      },
      {
        "rule": "allowed",
        "reason": "image scene",
        "scene_id": "scene-3",
        "final_type": "IMAGE",
        "requested_type": "IMAGE"
      },
      {
        "rule": "allowed",
        "reason": "image scene",
        "scene_id": "scene-4",
        "final_type": "IMAGE",
        "requested_type": "IMAGE"
      }
    ],
    "allowed_scene_types": [
      "IMAGE",
      "CHECKLIST",
      "QUOTE",
      "PHONE",
      "CTA"
    ],
    "presentation_generation": {
      "mode": "enabled",
      "package_id": "90741dd0-2704-462e-8998-d29a0dfdbd8e",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "cta_selected": false,
      "visual_profile": "NATURAL",
      "downgrade_rules": [],
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
      "analyzer_decisions": [
        {
          "rule": "allowed",
          "reason": "image scene",
          "scene_id": "scene-1",
          "final_type": "IMAGE",
          "requested_type": "IMAGE"
        },
        {
          "rule": "allowed",
          "reason": "image scene",
          "scene_id": "scene-2",
          "final_type": "IMAGE",
          "requested_type": "IMAGE"
        },
        {
          "rule": "allowed",
          "reason": "image scene",
          "scene_id": "scene-3",
          "final_type": "IMAGE",
          "requested_type": "IMAGE"
        },
        {
          "rule": "allowed",
          "reason": "image scene",
          "scene_id": "scene-4",
          "final_type": "IMAGE",
          "requested_type": "IMAGE"
        }
      ],
      "cta_composition_id": null,
      "cta_decision_reason": "no typed CTA requested in visual plan",
      "frequency_decisions": [],
      "requested_cta_count": 0,
      "accepted_phone_count": 0,
      "accepted_quote_count": 0,
      "cta_renderer_version": null,
      "downgraded_cta_count": 0,
      "requested_phone_count": 0,
      "requested_quote_count": 0,
      "visual_profile_source": "package_snapshot",
      "downgraded_phone_count": 0,
      "downgraded_quote_count": 0,
      "phone_renderer_version": null,
      "quote_renderer_version": null,
      "sparse_plan_adjustment": false,
      "visual_profile_version": "visual-profile@3",
      "accepted_checklist_count": 0,
      "accepted_statistic_count": 0,
      "final_worker_scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "target_visual_beat_count": 4,
      "creative_identity_version": "creative-identity@1",
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
  }
}
```

#### Scene-by-scene

| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |
| ---: | --- | --- | --- | --- | --- |
| 1 | scene-1 | IMAGE | image@1 | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a557c8d4-f3e6-46aa-a053-9ba8da71dc25/scene-scene-1.png` | — |
| 2 | scene-2 | IMAGE | image@1 | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a557c8d4-f3e6-46aa-a053-9ba8da71dc25/scene-scene-2.png` | — |
| 3 | scene-3 | IMAGE | image@1 | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a557c8d4-f3e6-46aa-a053-9ba8da71dc25/scene-scene-3.png` | — |
| 4 | scene-4 | IMAGE | image@1 | `project-assets/aabab9ff-9db4-4012-a53c-135e3bfea6cd/source/b1b0d00c-0bfc-4095-954f-4b38a813747f/component-capture.png` | — |

**Scene 1 (scene-1) — image_prompt (job input)**

```
Photorealistic portrait 9:16 vertical photograph. A service business reception counter — warm wood surfaces, amber highlights from cool clear morning light entering through a window on the left. A woman in her 30s stands at the counter, phone pressed to her ear, one hand raised mid-gesture, expression tense and focused. A second phone on the counter has its light blinking. A foreground plant frames the left edge of the frame. The background shows a clean quiet studio-like interior. Two people at conversational distance — a colleague leans in from the right. Natural candid composition, realistic textures, restrained contrast. No readable text or signs anywhere in the scene.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Photorealistic portrait 9:16 vertical photograph. A service business reception counter — warm wood surfaces, amber highlights from cool clear morning light entering through a window on the left. A woman in her 30s stands at the counter, phone pressed to her ear, one hand raised mid-gesture, expression tense and focused. A second phone on the counter has its light blinking. A foreground plant frames the left edge of the frame. The background shows a clean quiet studio-like interior. Two people at conversational distance — a colleague leans in from the right. Natural candid composition, realistic textures, restrained contrast. No readable text or signs anywhere in the scene."
  }
}
```
**Scene 2 (scene-2) — image_prompt (job input)**

```
Photorealistic portrait 9:16 vertical photograph. A man in his late 30s walks away from a glass service entrance door, mid-stride, shoulders slightly dropped — the door is closed behind him, no one visible inside to greet him. Cool clear morning light from the left casts a soft shadow. Warm wood tones on the door frame and flooring. A potted plant in the foreground right provides natural framing. The composition is slightly above table height, subject centered with natural headroom. The mood is quiet resignation — a customer leaving unanswered. No text, signs, or readable labels anywhere.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Photorealistic portrait 9:16 vertical photograph. A man in his late 30s walks away from a glass service entrance door, mid-stride, shoulders slightly dropped — the door is closed behind him, no one visible inside to greet him. Cool clear morning light from the left casts a soft shadow. Warm wood tones on the door frame and flooring. A potted plant in the foreground right provides natural framing. The composition is slightly above table height, subject centered with natural headroom. The mood is quiet resignation — a customer leaving unanswered. No text, signs, or readable labels anywhere."
  }
}
```
**Scene 3 (scene-3) — image_prompt (job input)**

```
Photorealistic portrait 9:16 vertical photograph. A clean quiet studio-like interior. A woman in her early 40s sits at a warm wood surface, looking at an open laptop screen — over-the-shoulder framing, her gaze directed at the screen. The laptop screen displays a recognizable chat interface layout with message bubbles and a text input area, no readable words. Cool clear morning light from the left, amber highlights on the wood surface. A shelf with a small plant frames the upper left. The mood is quiet optimism — something working without effort. Candid composition, realistic textures, restrained contrast. No readable text or UI labels.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Photorealistic portrait 9:16 vertical photograph. A clean quiet studio-like interior. A woman in her early 40s sits at a warm wood surface, looking at an open laptop screen — over-the-shoulder framing, her gaze directed at the screen. The laptop screen displays a recognizable chat interface layout with message bubbles and a text input area, no readable words. Cool clear morning light from the left, amber highlights on the wood surface. A shelf with a small plant frames the upper left. The mood is quiet optimism — something working without effort. Candid composition, realistic textures, restrained contrast. No readable text or UI labels."
  }
}
```
**Scene 4 (scene-4) — image_prompt (job input)**

```
Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 21–25); place it centered within a clean laptop mockup positioned on the warm wood surface in the quiet studio interior — cool clear morning light from the left, amber highlights, slightly above table height camera, foreground plant framing the left edge — do not crop fullscreen; the laptop sits naturally as a prop with intentional negative space around it.
```

```json
{
  "media": {
    "modify": "false",
    "source": "asset",
    "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 21–25); place it centered within a clean laptop mockup positioned on the warm wood surface in the quiet studio interior — cool clear morning light from the left, amber highlights, slightly above table height camera, foreground plant framing the left edge — do not crop fullscreen; the laptop sits naturally as a prop with intentional negative space around it.",
    "asset_id": "b1b0d00c-0bfc-4095-954f-4b38a813747f",
    "video_usage": "framed_laptop"
  }
}
```
#### TTS / voice

- **requested TTS voice (job input):** shimmer
- **resolved at render:** shimmer
- **project voice resolution:** legacy default (no presentation override) → `cedar`
- **differs from alloy:** yes
- **TTS instructions applied:** yes

**tts_instructions:**

Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: measured, credible. Opening: dry deadpan; let the line land before lifting. Then settle into conversational body delivery. Vary emphasis;


- **voiceover characters:** 405
- **estimated words:** 68
- **audio_duration (debug):** 26.964
- **TTS validation attempts:** 1
- **tail validation passed:** true
- **tts_tail_retry_used:** false

#### Visual profile

- **package/job profile:** NATURAL
- **version:** visual-profile@3
- **project auto-resolved profile:** MINIMAL (source: auto)
- **EDITORIAL prompt style token:** Clean composition, limited visual clutter, clear subject separation, generous negative space.
- **prompts include Editorial suffix:** check prompts

#### Semantic motion

| beat_id | scene_id | intent | primitive | intensity |
| --- | --- | --- | --- | --- |
| beat-1 | scene-1 | ATTENTION | zoom_in | MEDIUM |
| beat-2 | scene-2 | EXPLAIN | drift_up | LOW |
| beat-3 | scene-3 | EXPLAIN | drift_down | LOW |
| beat-4 | scene-4 | HOLD | static | LOW |
| beat-5 | scene-4 | HOLD | static | LOW |
- **semantic_motion flag on input:** enabled/default
- **stored_semantic_motion on input:** absent

#### Analyzer / history decisions

```json
{
  "history_decisions": [],
  "frequency_decisions": [],
  "downgrade_rules": [],
  "final_worker_scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "prompt_presentation_types": null
}
```

#### Image generation / moderation

No `image_generation_warnings` on render_spec — all scenes used primary provider path.

#### Final video details

- **MP4:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a557c8d4-f3e6-46aa-a053-9ba8da71dc25/output.mp4
- **thumbnail:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a557c8d4-f3e6-46aa-a053-9ba8da71dc25/thumbnail.png
- **subtitles:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a557c8d4-f3e6-46aa-a053-9ba8da71dc25/subtitles.srt
- **video_duration:** 26.966667
- **subtitle_source:** whisper
- **render_warning:** false

#### Admin links (paths, no signed tokens)

- Production: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/production`
- Review: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/review`
- Content packages: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/content-packages`
- Videos / scene editor: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/videos`
- API export JSON: `/api/production-runs/4ab75071-2a9d-4134-bfb7-050b395e98b9/export`

## D. Cross-run consistency analysis

- **Distinct hooks:** 1 / 1
- **Distinct CTA texts:** 1 / 1
- **Funnel stages:** problem_aware
- **All videos used same voice:** yes
- **All packages same visual profile:** yes
- **Typed scenes rendered:** none (all worker scene types were IMAGE in this run)
- **Organic suitability:** Topics differ (dormant profile / weekend batching / URL-to-content); tone is educational not hard-sell; CTAs repeat free-package offer (expected for fenrik Studio).

## E. New-system usage matrix

| Package | Voice | Profile | CHECKLIST | PHONE | QUOTE | STATISTIC | CTA | Semantic Motion | Moderation fallback |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| The HVAC company that got slammed with website traffic during a heatwave — and lost every single online lead | shimmer | NATURAL | 0 | 0 | 0 | 0 | 0 | yes | 0 |

## F. Problems found

### Technical
- None — all 3 video jobs completed; no moderation fallbacks; TTS tail validation passed on inspected jobs.

### Creative / repetition
- Packages 2–3 use 4 IMAGE scenes but 5 storyboard beats (CLOSE reuses `scene-1` still) — intentional for shorter scene plans but worth monitoring visually.
- Motion primitives repeat across packages (`pan_left`, `drift_down`, `static` CLOSE) — semantic motion active but low variety.

### Features available but unused
- Presentation system allowed CHECKLIST and CTA types (`prompt_presentation_types`) but generator produced IMAGE-only scenes for every package.
- Project assets (logo, favicon) not selected in `asset_usage` (AI-only visuals).

## G. Final verdict

1. **End-to-end pipeline:** Yes — run completed; packages, platform copy, video jobs, storage artifacts, and debug metadata are present.
2. **New features used:** EDITORIAL visual profile + suffix in prompts; semantic motion v1 beats on all renders; presentation analyzer metadata; explicit scene plan; OpenAI TTS with instructions + tail validation; Whisper subtitle alignment.
3. **Available but not selected:** Typed scenes (CHECKLIST/PHONE/QUOTE/STATISTIC/CTA), project asset compositing, non-default TTS voice, moderation fallback path.
4. **More varied:** Topics and scripts differ; motion/scene-type patterns are somewhat repetitive.
5. **Organic posting:** Suitable — problem-aware/educational angles, not generic ads.
6. **Quality harm:** No evidence in this run; unused typed scenes are neutral.
7. **Fix before next run:** Consider enabling at least one typed scene when allowlisted; diversify motion primitives; optional deterministic voice if alloy is too neutral.
8. **Do not change yet:** Core render path, TTS tail validation, semantic motion defaults — all succeeded.

## Data sources (read-only)

- `getReviewRunExport(runId)` — `lib/api/review-runs-admin.ts`
- `production_runs` — `.eq('id', runId)`
- `content_strategy_items` — `.eq('brief->>production_run_id', runId)`
- `content_packages` / `content_items` / `video_jobs` — via export bundle
- `production_run_items`, `assets`, `asset_usage` — project-scoped selects
