# Production Run Audit — 2f896bec-05f1-4091-82b0-7e384894eef2

_Generated 2026-07-19T21:43:14.859Z by `scripts/audit-production-run.ts` (read-only)._

## A. Executive summary

- **Strategy items:** 1
- **Content packages:** 1
- **Primary video jobs (newest per item):** 1 (1 completed, 0 failed)
- **Content items (all variants):** 11
- **Scene types in worker inputs:** {"IMAGE":4,"PRODUCT_DEMO":1}
- **Visual profile(s) on jobs:** NATURAL (project auto: MINIMAL)
- **Voices used:** shimmer (project default: cedar)
- **Moderation fallback scenes:** 0
- **Run warnings (subtitle/render flags):** 0
- **Major warnings:** None flagged on completed jobs.

## B. Run overview

| Field | Value |
| --- | --- |
| production_run_id | `2f896bec-05f1-4091-82b0-7e384894eef2` |
| project_id | `aabab9ff-9db4-4012-a53c-135e3bfea6cd` |
| project name | Fenrik.chat |
| status | completed |
| created_at | 2026-07-19T20:57:30.650959+00:00 |
| updated_at (terminal) | 2026-07-19T21:01:03.88607+00:00 |
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
    "totalOutputs": 11,
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
        "kind": "text",
        "label": "Facebook",
        "outputs": 1,
        "platform": "facebook",
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
    "textOutputsTotal": 8,
    "videoOutputsTotal": 3
  },
  "config": {
    "platforms": [
      "tiktok",
      "instagram",
      "facebook",
      "youtube",
      "linkedin",
      "x"
    ],
    "multipliers": {
      "x": 5,
      "tiktok": 1,
      "youtube": 1,
      "facebook": 1,
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

- **fb6be81f-0a80-4b8e-9b28-1abf26881e27** — The silent cost of a website that can't answer back
```json
{
  "theme": "The silent cost of a website that can't answer back",
  "source": "production_run",
  "production_run_id": "2f896bec-05f1-4091-82b0-7e384894eef2",
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
    "id": "ac9411d3-ea05-4c53-81d5-16c6bc0ab2a8",
    "production_run_id": "2f896bec-05f1-4091-82b0-7e384894eef2",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "5adb5e92-e1db-4a7c-b6f1-0ed01aefb370",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-19T20:57:30.962386+00:00",
    "updated_at": "2026-07-19T21:01:03.771963+00:00"
  }
]
```

## C. Package-by-package audit

### Package 1 — The small business owner who opened her laptop Friday night and realized her website had been turning away strangers all week

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `5adb5e92-e1db-4a7c-b6f1-0ed01aefb370` |
| strategy_item_id | `40b0deac-aa88-4c31-8c88-6e40e9b3da90` |
| weekly_strategy_id | `fb6be81f-0a80-4b8e-9b28-1abf26881e27` |
| production_run_id | `2f896bec-05f1-4091-82b0-7e384894eef2` |
| status | draft |
| funnel_stage | problem_aware |
| created_at | 2026-07-19T21:01:01.154388+00:00 |
| updated_at | 2026-07-19T21:06:46.260128+00:00 |
| primary content_item_id | `454e6f77-c776-4a0b-b350-03e129d3e6e5` |
| video_job_id | `f29496cb-6234-4a9a-b21b-bd8e33a1b910` |
| video_job status | completed |

#### Strategy input

- **topic:** The small business owner who opened her laptop Friday night and realized her website had been turning away strangers all week
- **angle:** A local service business owner reviews her weekly website traffic and discovers multiple visitors landed on her site during working hours — but still left without a single message, call, or form submission. The angle exposes the gap between 'we were open' and 'we were actually available': being physically present does not mean your website is capable of helping someone who needs a quick answer before they decide to contact you. The pain is not just after-hours silence — it is the everyday invisibility of a website that looks complete but cannot hold a conversation. Visitors do not wait; they move on. And most business owners never see it happening.
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
  "angle": "A local service business owner reviews her weekly website traffic and discovers multiple visitors landed on her site during working hours — but still left without a single message, call, or form submission. The angle exposes the gap between 'we were open' and 'we were actually available': being physically present does not mean your website is capable of helping someone who needs a quick answer before they decide to contact you. The pain is not just after-hours silence — it is the everyday invisibility of a website that looks complete but cannot hold a conversation. Visitors do not wait; they move on. And most business owners never see it happening.",
  "topic": "The small business owner who opened her laptop Friday night and realized her website had been turning away strangers all week",
  "source": "production_run",
  "package_index": 0,
  "production_run_id": "2f896bec-05f1-4091-82b0-7e384894eef2"
}
```

#### Full content (package_brief core)

**hook:**

Urgent question dies in silence


**voiceover_text:**

Urgent question dies in silence. Someone typed into your website — during business hours — and got nothing back. Not after midnight. Not on a holiday. Tuesday afternoon. You were technically open. Your website just couldn't say a word. They waited maybe thirty seconds. Then they moved on. And you never saw it happen. Every day, qualified visitors land, ask nothing, leave everything. Your site looks complete. It just can't hold a conversation. That's the gap nobody talks about.


**subtitles:**

Urgent question dies in silence. | Someone typed into your website — during business hours — and got nothing back. | Not after midnight. Not on a holiday. | Tuesday afternoon. You were technically open. | Your website just couldn't say a word. | They waited maybe thirty seconds. Then they moved on. | And you never saw it happen. | Every day, qualified visitors land, ask nothing, leave everything. | Your site looks complete. It just can't hold a conversation. | That's the gap nobody talks about.


**video concept:**

Handheld urgency opens the film: extreme close on a visitor's hands typing a question into a website chat on a phone, midday light, urban street exterior. The reply thread shows the message as 'seen' — no answer follows. The video widens to reveal the silence is not after-hours; it is a normal Tuesday afternoon. The business was open. The website was not capable. The cost is named: every unanswered visitor walks to a competitor. The resolution shows the AI chatbot answering the next visitor's question in real time — the same thread, now alive.


**video script:**

OPEN — extreme close on hands holding a phone on a sunlit urban street, thumb typing a question into a website chat widget. The message sends. A read receipt appears. Nothing follows.

VO: 'Urgent question dies in silence.'

CUT — the same chat thread, still open. The cursor blinks. No reply bubble. Timestamp: 2:17 PM Tuesday.

VO: 'Someone typed into your website — during business hours — and got nothing back. Not after midnight. Not on a holiday. Tuesday afternoon. You were technically open. Your website just couldn't say a word.'

CUT — the visitor's hand lowers the phone slightly. They tap away from the page. The chat thread disappears.

VO: 'They waited maybe thirty seconds. Then they moved on. And you never saw it happen.'

CUT — product demo: the same website chat thread, now with an AI assistant reply appearing — answering the visitor's question clearly and immediately. The visitor types a follow-up. Another answer arrives.

VO: 'Every day, qualified visitors land, ask nothing, leave everything. Your site looks complete. It just can't hold a conversation. That's the gap nobody talks about.'

FADE — soft urban exterior. Overcast light. The phone screen glows with a live conversation continuing.


**duration_seconds (brief):** 22

**CTA:** Create your AI assistant — let your website hold the conversation you never knew you were missing. (type: sign_up)

**creative_mode:** story

**hashtags:** ["#smallbusiness","#aichatbot","#leadgeneration","#websitetips","#fenrikchat","#customerexperience","#servicebusiness","#onlinepresence","#businessgrowth","#aiforbusiness"]


#### Full platform copy

##### x

```json
{
  "cta": "fenrik.chat",
  "format": "Video Post (9:16)",
  "caption": "Your website was open. It just couldn't answer. Those are not the same thing.",
  "hashtags": [
    "#smallbusiness",
    "#aichatbot"
  ],
  "title_variants": [
    "Being open ≠ being available",
    "The lead you lost at 2pm on a Tuesday",
    "Your website saw the question. Said nothing.",
    "Visitors don't wait. They just leave.",
    "The gap nobody in your analytics report will show you"
  ],
  "caption_variants": [
    "Your website was open. It just couldn't answer. Those are not the same thing.",
    "Someone typed a question into your site on a Tuesday afternoon. Your site saw it. Stayed silent. They left. You never knew. That's not an after-hours problem.",
    "The read receipt with no reply is your website — every single day a visitor asks something and gets nothing back.",
    "Visitors don't wait 30 seconds for a response. They move to the next tab. Your business hours don't fix that. fenrik.chat",
    "Most website traffic reports look fine. They don't show you the questions that went unanswered at 2pm while you were technically open."
  ]
}
```
##### tiktok

```json
{
  "cta": "Link in bio — see what your site says when you're not there.",
  "format": "Vertical Short (9:16)",
  "caption": "Your website was open. It just couldn't answer. That's not the same thing.",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#leadgeneration",
    "#aichatbot",
    "#businessgrowth"
  ]
}
```
##### youtube

```json
{
  "cta": "Subscribe for more on turning website visitors into leads.",
  "format": "YouTube Shorts (9:16)",
  "caption": "Your website was open — but it couldn't answer. Here's what that silence actually costs you.",
  "hashtags": [
    "#smallbusiness",
    "#aichatbot",
    "#websitetips"
  ]
}
```
##### facebook

```json
{
  "cta": "Create your AI assistant at fenrik.chat",
  "format": "Video Post (9:16)",
  "caption": "Here's something most business owners never notice: visitors land on your website during normal working hours, type a question, wait a few seconds — and leave. No form filled. No call made. Nothing. 🤔\n\nYour business was open. Your website just couldn't hold a conversation. Fenrik.chat builds an AI assistant from your existing website in about a minute — so the next visitor actually gets an answer.",
  "hashtags": [
    "#smallbusiness",
    "#aichatbot",
    "#fenrikchat"
  ]
}
```
##### linkedin

```json
{
  "cta": "Create your AI assistant at fenrik.chat",
  "format": "Video Post (9:16)",
  "caption": "Most businesses assume their website is working because it looks professional. It isn't working if it can't answer a visitor's question.\n\nSomeone lands on your site at 2 PM on a Tuesday. They have a real question. Your site has no way to respond. They move on. You never know it happened.\n\nThe gap between 'we were open' and 'we were actually available' is where leads disappear — quietly, every day. Fenrik.chat closes that gap by turning your existing website into an AI assistant that answers visitors in real time, no technical setup required.",
  "hashtags": [
    "#smallbusiness",
    "#leadgeneration",
    "#aichatbot"
  ],
  "title_variants": [
    "The gap between 'we were open' and 'we were actually available'",
    "Why qualified visitors leave your website without a word — even during business hours"
  ],
  "caption_variants": [
    "Most businesses assume their website is working because it looks professional. It isn't working if it can't answer a visitor's question.\n\nSomeone lands on your site at 2 PM on a Tuesday. They have a real question. Your site has no way to respond. They move on. You never know it happened.\n\nThe gap between 'we were open' and 'we were actually available' is where leads disappear — quietly, every day. Fenrik.chat closes that gap by turning your existing website into an AI assistant that answers visitors in real time, no technical setup required.",
    "There's a version of lead loss that analytics won't show you.\n\nA visitor arrives during your working hours. They want a quick answer before they decide to contact you. Your website has no way to give it. They leave — and your traffic report still shows a visit.\n\nThe site looked fine. It just couldn't hold a conversation. That's the overlooked detail that costs service businesses real opportunities every week. Fenrik.chat builds an AI assistant from your existing website content — no coding, no training, no integrations."
  ]
}
```
##### instagram

```json
{
  "cta": "Create your AI assistant — link in bio.",
  "format": "Reels (9:16)",
  "caption": "Being open and being available are not the same thing.\n\nSomeone visited your website on a Tuesday afternoon — not at midnight, not on a holiday — and typed a question. Your site saw it. Said nothing. They left.\n\nThat gap is invisible to you. It's not invisible to them.",
  "hashtags": [
    "#smallbusiness",
    "#websitestrategy",
    "#leadgeneration",
    "#aiforbusiness",
    "#customerexperience",
    "#servicebusiness",
    "#onlinepresence",
    "#chatbot",
    "#businesstips",
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
      "image_prompt": "Photorealistic photographic image. Portrait 9:16 vertical frame. Extreme close-up of a person's hands holding a smartphone on a soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel, centered subject with generous vertical headroom. The phone screen faces the viewer showing a website chat widget interface rendered as abstract UI shapes: a sent message bubble at the bottom, a read receipt indicator visible, and an empty waiting space above where a reply should appear. No readable text anywhere on screen. The hands are relaxed but attentive — thumb resting after typing. Background is softly blurred urban street, muted warm grays and neutrals. No laptop, no desk, no office."
    },
    {
      "source": "ai",
      "image_prompt": "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same urban street exterior — overcast diffused daylight, warm neutral color feel. The phone screen now shows the same chat thread: the sent message bubble visible, a small timestamp indicator in abstract form suggesting mid-afternoon, and a blinking cursor in the reply area — no reply bubble present. The visitor's hand has lowered the phone slightly, the screen still visible to the viewer. The posture suggests waiting, then quiet resignation. No text readable. Background remains softly blurred urban street. Reflective, thoughtful pause mood."
    },
    {
      "source": "ai",
      "image_prompt": "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel. The visitor's thumb is tapping away from the chat page — the screen now shows a blurred browser back gesture or a closing animation rendered as abstract motion blur of the chat widget disappearing. The hand is pulling the phone slightly downward and away. The action communicates departure: the conversation is over before it began. No readable text. Mood: quiet consequence, not drama. Centered composition with generous vertical headroom."
    },
    {
      "id": "scene-product-demo",
      "type": "PRODUCT_DEMO",
      "payload": {
        "type": "product_demo",
        "actor_id": "primary_actor",
        "ai_answer": "Yes — we have availability today. Would you like to book a slot or get more details first?",
        "brand_name": "Fenrik.chat",
        "demo_variant": "after_hours_response",
        "outcome_type": "question_resolved",
        "outcome_label": "Visitor continues the conversation and selects a time",
        "conversation_id": "fenrik-demo-thread-001",
        "outcome_visible": true,
        "question_visible": true,
        "visitor_question": "Do you offer same-day consultations?",
        "ai_answer_visible": true
      }
    },
    {
      "source": "ai",
      "image_prompt": "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel, centered subject with generous vertical headroom. The phone screen now shows a live chat thread with two abstract reply bubbles visible: a visitor message and a clear AI response bubble below it, followed by a second visitor message — the conversation is ongoing. The screen glows warmly. The hand holds the phone with relaxed engagement, thumb hovering ready to type again. No readable text. Mood: quiet resolution, relief, the conversation that should have always been there."
    }
  ],
  "image_prompts": [
    "Photorealistic photographic image. Portrait 9:16 vertical frame. Extreme close-up of a person's hands holding a smartphone on a soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel, centered subject with generous vertical headroom. The phone screen faces the viewer showing a website chat widget interface rendered as abstract UI shapes: a sent message bubble at the bottom, a read receipt indicator visible, and an empty waiting space above where a reply should appear. No readable text anywhere on screen. The hands are relaxed but attentive — thumb resting after typing. Background is softly blurred urban street, muted warm grays and neutrals. No laptop, no desk, no office.",
    "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same urban street exterior — overcast diffused daylight, warm neutral color feel. The phone screen now shows the same chat thread: the sent message bubble visible, a small timestamp indicator in abstract form suggesting mid-afternoon, and a blinking cursor in the reply area — no reply bubble present. The visitor's hand has lowered the phone slightly, the screen still visible to the viewer. The posture suggests waiting, then quiet resignation. No text readable. Background remains softly blurred urban street. Reflective, thoughtful pause mood.",
    "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel. The visitor's thumb is tapping away from the chat page — the screen now shows a blurred browser back gesture or a closing animation rendered as abstract motion blur of the chat widget disappearing. The hand is pulling the phone slightly downward and away. The action communicates departure: the conversation is over before it began. No readable text. Mood: quiet consequence, not drama. Centered composition with generous vertical headroom.",
    "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel, centered subject with generous vertical headroom. The phone screen now shows a live chat thread with two abstract reply bubbles visible: a visitor message and a clear AI response bubble below it, followed by a second visitor message — the conversation is ongoing. The screen glows warmly. The hand holds the phone with relaxed engagement, thumb hovering ready to type again. No readable text. Mood: quiet resolution, relief, the conversation that should have always been there."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "attention": {
      "opening": {
        "emotional_effect": "strong_opinion",
        "opening_delivery": "urgent",
        "opening_structure": "bold_claim",
        "first_motion_intent": "EMPHASIS",
        "land_within_seconds": [
          1,
          1.8
        ],
        "first_spoken_guidance": "Open with an immediate reaction using Provocative Opinion — not context or setup. The first spoken thought should land in ~1.0–1.8 seconds (one short phrase, or two very short phrases). The stored hook MUST be the same thought as the first spoken line — do not dilute a strong hook into a weaker voiceover setup. State the opinion in the first short phrase. Attack the idea, never a person. Narrative seed: Unexpected but relevant: State the opinion in the first short phrase. Attack the idea, never a person. Keep the link to A local service business owner reviews her weekly website traffic and discovers multiple visitors landed on her site during working hours — but still left without a single message, call, or form submission. The angle exposes the gap between 'we were open' and 'we were actually available': being physically present does not mean your website is capable of helping someone who needs a quick answer before they decide to contact you. The pain is not just after-hours silence — it is the everyday invisibility of a website that looks complete but cannot hold a conversation. Visitors do not wait; they move on. And most business owners never see it happening. / Unable to answer customer questions when offline clear by the next beat.",
        "first_visual_guidance": "The first visual is an attention event, not a sentence illustration. Image that dramatizes the contested habit or its consequence. Preferred opening visual concept: Crossing out \"post more\" on a wall plan and writing \"say one true thing\" for Fenrik.chat Do not default to calm desks, empty boards, laptop+coffee, or faceless screen-staring unless that is genuinely the strongest idea. Render coherently via Visual Narrative / Medium / Profile / Identity — attention chooses the idea, those systems choose the look.",
        "first_subtitle_guidance": "First subtitle mirrors the first spoken thought — same words, no softer paraphrase.",
        "align_hook_with_first_spoken": true
      },
      "sfx_gain": 0.18,
      "sfx_reason": "opening_accent:PROVOCATIVE_OPINION:bold_claim",
      "sfx_source": "programmatic_v1",
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
            "visual_concept": "A modern office desk with laptop and coffee illustrating A local service business owner reviews her weekly website traffic and discovers multiple visitors landed on her site during working hours — but still left without a single message, call, or form submission. The angle exposes the gap between 'we were open' and 'we were actually available': being physically present does not mean your website is capable of helping someone who needs a quick answer before they decide to contact you. The pain is not just after-hours silence — it is the everyday invisibility of a website that looks complete but cannot hold a conversation. Visitors do not wait; they move on. And most business owners never see it happening."
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
            "visual_concept": "A bold handwritten sign being taped over a polished corporate slogan about A local service business owner reviews her weekly website traffic and discovers multiple visitors landed on her site during working hours — but still left without a single message, call, or form submission. The angle exposes the gap between 'we were open' and 'we were actually available': being physically present does not mean your website is capable of helping someone who needs a quick answer before they decide to contact you. The pain is not just after-hours silence — it is the everyday invisibility of a website that looks complete but cannot hold a conversation. Visitors do not wait; they move on. And most business owners never see it happening."
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
            "visual_concept": "Crossing out \"post more\" on a wall plan and writing \"say one true thing\" for Fenrik.chat"
          }
        ],
        "reject_summary": [
          "obvious:office_cliche:\\blaptop\\s+and\\s+coffee\\b",
          "obvious:first_obvious_idea",
          "obvious:visual_story:office_cliche_backslide"
        ],
        "selected_candidate_id": "unexpected",
        "selected_narrative_seed": "Unexpected but relevant: State the opinion in the first short phrase. Attack the idea, never a person. Keep the link to A local service business owner reviews her weekly website traffic and discovers multiple visitors landed on her site during working hours — but still left without a single message, call, or form submission. The angle exposes the gap between 'we were open' and 'we were actually available': being physically present does not mean your website is capable of helping someone who needs a quick answer before they decide to contact you. The pain is not just after-hours silence — it is the everyday invisibility of a website that looks complete but cannot hold a conversation. Visitors do not wait; they move on. And most business owners never see it happening. / Unable to answer customer questions when offline clear by the next beat.",
        "selected_visual_concept": "Crossing out \"post more\" on a wall plan and writing \"say one true thing\" for Fenrik.chat",
        "selected_emotional_effect": "strong_opinion"
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
            "delivery": "Payoff: Confident, not aggressive."
          },
          {
            "phase": "close",
            "delivery": "Close: satisfying landing; CTA only if present, never aggressive."
          }
        ],
        "reasons": [
          "opening_style:urgent",
          "mechanism:PROVOCATIVE_OPINION",
          "full_arc_not_opening_only",
          "spoken_rhythm_contrast_pause_emphasis"
        ],
        "version": "delivery-arc@1",
        "tts_instruction_fragment": "Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Use spoken rhythm: short sentences, contrast, and a brief pause before the reveal. Emphasize the turn or punchline — do not read every clause at the same energy. Avoid long equally-paced paragraphs; land one idea per breath. Confident, not aggressive."
      },
      "sfx_category": "impact",
      "sfx_selected": true,
      "sfx_timing_ms": 448,
      "attention_source": "deterministic_v1",
      "attention_reasons": [
        "selected:PROVOCATIVE_OPINION",
        "source:deterministic_v1",
        "funnel_soft_affinity:problem_aware:2",
        "creative_mode_soft_affinity:story:0",
        "topic_signals_opinion",
        "recent_seen_but_still_strongest",
        "independent_of_funnel_mapping"
      ],
      "attention_version": "attention@1",
      "opening_structure": "bold_claim",
      "attention_mechanism": "PROVOCATIVE_OPINION",
      "opening_visual_motif": "crossing_post_more_wall_plan_writing",
      "sfx_render_supported": true,
      "opening_emotional_effect": "strong_opinion"
    },
    "tts_voice": "shimmer",
    "package_id": "5adb5e92-e1db-4a7c-b6f1-0ed01aefb370",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 46,
      "secondary": 68
    },
    "voice_source": "package_secondary",
    "visual_medium": "PHOTOGRAPHIC",
    "voice_reasons": [
      "funnel_problem→warmth(+2)",
      "mode_story→warmth(+3)",
      "profile_NATURAL→warmth(+2)",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+46)",
      "fit_secondary(+68)"
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
    "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: warm, intimate, conversational storytelling pace. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
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
          "viewerLearns": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; r…",
          "comprehension": {
            "viewer_question": "What happens to the person in: Urgent question dies in silence?",
            "viewer_expectation": "The explanation is coming.",
            "viewer_understands": "Something unusual is happening: Handheld urgency"
          },
          "informationKey": "anomaly|open|handheld_urgency_close_customer",
          "modeBeatLabels": [
            "setup"
          ]
        },
        {
          "role": "SETUP",
          "whatChanged": "From cold open to the established problem world (tension).",
          "whyContinue": "Stakes become clear — Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night a…",
          "sourceFields": [
            "storyProgression",
            "coreIdea",
            "emotionalReaction"
          ],
          "viewerLearns": "Hold the opening situation → widen to after-hours silence",
          "comprehension": {
            "viewer_question": "Why is this happening / what does it cost?",
            "viewer_expectation": "Someone should solve this — or stakes will rise.",
            "viewer_understands": "The problem is: Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop…"
          },
          "informationKey": "problem_named|open|hold_opening_situation_widen",
          "modeBeatLabels": [
            "conflict",
            "twist"
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
            "resolution"
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
            "sceneSummary": "Photorealistic photographic image. Portrait 9:16 vertical frame. Extreme close-up of a person's hands holding a smartph…",
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
            "sceneSummary": "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same urban street exterior — o…",
            "comprehension": {
              "viewer_question": "Why is this happening / what does it cost?",
              "viewer_expectation": "Someone should solve this — or stakes will rise.",
              "viewer_understands": "The problem is: Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop…"
            },
            "informationKey": "problem_named|open|hold_opening_situation_widen",
            "durationSeconds": 7.19
          },
          {
            "role": "ESCALATION",
            "index": 2,
            "share": 0.315,
            "sceneSummary": "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same soft-focus urban street e…",
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
            "sceneSummary": "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, soft-focus urban street exteri…",
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
          "text": "Urgent question dies in silence. Someone typed into your website — during business hours — and got nothing back. Not after midnight. Not on a holiday. Tuesday afternoon. You were technically open. Your website just couldn't say a word. They waited maybe thirty seconds. Then they moved on. And you never saw it happen. Every day, qualified visitors land, ask nothing, leave everything. Your site looks complete. It just can't hold a conversation. That's the gap nobody talks about.",
          "wordCount": 79
        },
        "storyboard": {
          "sceneCount": 4,
          "sceneSummaries": [
            "Photorealistic photographic image. Portrait 9:16 vertical frame. Extreme close-up of a person's hands holding a smartph…",
            "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same urban street exterior — o…",
            "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same soft-focus urban street e…",
            "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, soft-focus urban street exteri…"
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
            "viewerLearns": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; r…",
            "informationKey": "anomaly|open|handheld_urgency_close_customer",
            "modeBeatLabels": [
              "setup"
            ]
          },
          {
            "role": "SETUP",
            "whatChanged": "From cold open to the established problem world (tension).",
            "whyContinue": "Stakes become clear — Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night a…",
            "viewerLearns": "Hold the opening situation → widen to after-hours silence",
            "informationKey": "problem_named|open|hold_opening_situation_widen",
            "modeBeatLabels": [
              "conflict",
              "twist"
            ]
          },
          {
            "role": "ESCALATION",
            "whatChanged": "Failure / consequence deepens — not a restatement of the setup.",
            "whyContinue": "Viewer needs the fix: AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "viewerLearns": "reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what hu…",
            "informationKey": "cost_rising|open|reveal_unable_answer_customer",
            "modeBeatLabels": [
              "resolution"
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
          "coreIdea": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; reply thread shows \"seen\" with no answer during after-hours silence.",
          "hookLine": "Urgent question dies in silence.",
          "candidateId": "c4-direct_product_world-div",
          "openingSituation": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; reply thread shows \"seen\" with no answer during after-hours silence.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
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
            "viewer_understands": "The problem is: Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop…"
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
            "items_1_and_2_same_information:same_information:waiting|shared_claims:waiting|overlap=0.62",
            "items_3_and_4_same_information:same_information:tokens:photographic_image_frame_same_hands|overlap=0.61"
          ],
          "version": "information-progression@1",
          "warnings": [
            {
              "indexA": 0,
              "indexB": 1,
              "overlap": 0.6181818181818182,
              "reasons": [
                "same_information:waiting",
                "shared_claims:waiting",
                "overlap=0.62"
              ],
              "informationKeyA": "waiting",
              "informationKeyB": "waiting",
              "sameInformationDifferentSurface": false
            },
            {
              "indexA": 2,
              "indexB": 3,
              "overlap": 0.6071428571428571,
              "reasons": [
                "same_information:tokens:photographic_image_frame_same_hands",
                "overlap=0.61"
              ],
              "informationKeyA": "tokens:photographic_image_frame_same_hands",
              "informationKeyB": "tokens:photographic_image_frame_same_hands",
              "sameInformationDifferentSurface": false
            }
          ],
          "correctiveGuidance": "INFORMATION PROGRESSION CORRECTIVE (deterministic — strengthen storyboard NOW):\nConsecutive beats/scenes must advance INFORMATION, not just change the camera or device.\nphone → laptop with the same claim (e.g. 'unanswered visitors') is STILL a failure.\nRequired advance pattern: anomaly → problem named → cost/failure → solution.\nEach visual_scenes[i] must communicate a NEW fact the previous scene did not.\nDo NOT restate the same problem with a different prop.\n\nDetected issues:\n- beats/scenes 1→2: same_information:waiting; shared_claims:waiting; overlap=0.62\n- beats/scenes 3→4: same_information:tokens:photographic_image_frame_same_hands; overlap=0.61"
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
        "passed": true,
        "summary": [],
        "version": "story-progression@1",
        "warnings": []
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
          "items_1_and_2_same_information:same_information:waiting|shared_claims:waiting|overlap=0.62",
          "items_3_and_4_same_information:same_information:tokens:photographic_image_frame_same_hands|overlap=0.61"
        ],
        "version": "information-progression@1",
        "warnings": [
          {
            "indexA": 0,
            "indexB": 1,
            "overlap": 0.6181818181818182,
            "reasons": [
              "same_information:waiting",
              "shared_claims:waiting",
              "overlap=0.62"
            ],
            "informationKeyA": "waiting",
            "informationKeyB": "waiting",
            "sameInformationDifferentSurface": false
          },
          {
            "indexA": 2,
            "indexB": 3,
            "overlap": 0.6071428571428571,
            "reasons": [
              "same_information:tokens:photographic_image_frame_same_hands",
              "overlap=0.61"
            ],
            "informationKeyA": "tokens:photographic_image_frame_same_hands",
            "informationKeyB": "tokens:photographic_image_frame_same_hands",
            "sameInformationDifferentSurface": false
          }
        ],
        "correctiveGuidance": "INFORMATION PROGRESSION CORRECTIVE (deterministic — strengthen storyboard NOW):\nConsecutive beats/scenes must advance INFORMATION, not just change the camera or device.\nphone → laptop with the same claim (e.g. 'unanswered visitors') is STILL a failure.\nRequired advance pattern: anomaly → problem named → cost/failure → solution.\nEach visual_scenes[i] must communicate a NEW fact the previous scene did not.\nDo NOT restate the same problem with a different prop.\n\nDetected issues:\n- beats/scenes 1→2: same_information:waiting; shared_claims:waiting; overlap=0.62\n- beats/scenes 3→4: same_information:tokens:photographic_image_frame_same_hands; overlap=0.61"
      }
    },
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: warm, intimate, conversational storytelling pace. Delivery: confident, concise, not aggressive. Opening: alert, clipped first phrase — not shouted. Then settle into conversational body deliver",
    "visual_narrative": {
      "key": "human|conversation distance — two people mid-tension or one person reacting to being ignored",
      "version": "visual-narrative@1.1",
      "subject_focus": "conversation distance — two people mid-tension or one person reacting to being ignored",
      "metaphor_policy": "understandable_preferred",
      "director_version": "visual-story-director@1",
      "storytelling_mode": "situation_first",
      "product_world_hints": [
        "Digital assistant world (meaning, not scenery): film unanswered visitors, people waiting for a reply, someone walking away, after-hours silence becoming answered — NOT automatic storefronts, NOT dashboards, NOT abstract boats/notebooks standing in for visitors.",
        "Agency world: client conversations, missed follow-ups, collaborative tension — situations first, workshop props only when they are part of the event.",
        "Product Brain constrains MEANING (who hurts, what changed), not scenery. Do not force browser UI, dashboards, or physical stores unless that situation is truly strongest."
      ],
      "recent_motif_counts": {
        "desk": 2,
        "group": 4,
        "phone": 6,
        "laptop": 6,
        "founder": 1,
        "meeting": 1,
        "close_up": 4,
        "dashboard": 4,
        "person_alone": 4,
        "product_asset": 8
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
      "key": "a soft-focus urban street exterior|reflective, thoughtful pause|overcast diffused daylight|wide environmental framing|centered subject with generous vertical headroom|implied human presence just off-screen|warm neutral color feel",
      "mood": "reflective, thoughtful pause",
      "camera": "wide environmental framing",
      "version": "creative-identity@1",
      "lighting": "overcast diffused daylight",
      "color_feel": "warm neutral color feel",
      "option_ids": {
        "mood": "reflective",
        "camera": "wide_environmental",
        "lighting": "overcast_diffused",
        "color_feel": "warm_neutral",
        "composition": "centered_headroom",
        "environment": "urban_street_soft",
        "human_presence": "implied_offscreen"
      },
      "composition": "centered subject with generous vertical headroom",
      "environment": "a soft-focus urban street exterior",
      "human_presence": "implied human presence just off-screen"
    },
    "history_decisions": [],
    "visual_beat_count": 5,
    "accepted_cta_count": 0,
    "cta_composition_id": null,
    "creative_candidates": {
      "version": "creative-candidates@3.0",
      "storyIntegrity": {
        "passed": true,
        "summary": "story_integrity_passed_with_warnings:cta_mismatch",
        "version": "story-integrity@1",
        "ctaMatch": {
          "evidence": "spoken_cta_missing_for_package_cta:Create your AI assistant — let your website hold the conversation you never knew",
          "packageCta": "Create your AI assistant — let your website hold the conversation you never knew you were missing.",
          "ctaMismatch": true,
          "voiceoverContainsCta": false
        },
        "warnings": [
          {
            "code": "cta_mismatch",
            "message": "Spoken close does not closely match package CTA wording — recorded as warning; package may still succeed",
            "evidence": "spoken_cta_missing_for_package_cta:Create your AI assistant — let your website hold the conversation you never knew"
          }
        ],
        "violations": [],
        "allowedWorldTokens": [
          "after",
          "answer",
          "answers",
          "assistant",
          "booking",
          "business",
          "cannot",
          "chat",
          "chatbot",
          "close",
          "competitor",
          "customer",
          "dies",
          "dramatized",
          "empty",
          "every",
          "film",
          "form",
          "frame",
          "friday",
          "generic",
          "gets",
          "handles",
          "hands",
          "hold",
          "hours",
          "human",
          "humans",
          "laptop",
          "lead",
          "message",
          "moment",
          "montage",
          "needed",
          "night",
          "office",
          "offline",
          "online",
          "opened",
          "opening",
          "owner",
          "phone",
          "platform",
          "question",
          "questions",
          "realized",
          "replacing",
          "reply",
          "reveal",
          "scene",
          "scroll",
          "seen",
          "sending",
          "setting",
          "shown",
          "shows",
          "silence",
          "situation",
          "small",
          "stakes",
          "stay",
          "stop",
          "thread",
          "unable",
          "unanswered",
          "urgent",
          "visitor",
          "waiting",
          "walks",
          "website",
          "websites",
          "what",
          "widen"
        ],
        "productDemonstration": {
          "present": true,
          "evidence": [
            "structured_product_demo_beat",
            "outcome_type:question_resolved"
          ],
          "askPresent": true,
          "answerPresent": true,
          "resultPresent": true,
          "landingPageOnly": false
        }
      },
      "candidateScores": [
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
          "coreIdea": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from after-hours silence.",
          "hookLine": "Competitor wins before you pick up.",
          "rejected": false,
          "candidateId": "c1-consequence_first-div",
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
          "openingSituation": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from after-hours silence.",
          "finalSelectionScore": 202.7
        },
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
          "coreIdea": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The small business owner who opened her laptop Friday night and realized her web; website chat on the counter glows with zero replies.",
          "hookLine": "Airport logic applied to the wrong queue.",
          "rejected": false,
          "candidateId": "c2-absurd_understandable-div",
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
          "openingSituation": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The small business owner who opened her laptop Friday night and realized her web; website chat on the counter glows with zero replies.",
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
          "coreIdea": "Handheld urgency: Empty front desk at The small business owner who opened her laptop Friday night and realized her web during after-hours silence; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
          "hookLine": "Nobody home except the waiting chat.",
          "rejected": false,
          "candidateId": "c3-role_reversal-div",
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
          "openingSituation": "Handheld urgency: Empty front desk at The small business owner who opened her laptop Friday night and realized her web during after-hours silence; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
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
          "coreIdea": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; reply thread shows \"seen\" with no answer during after-hours silence.",
          "hookLine": "Urgent question dies in silence.",
          "rejected": false,
          "candidateId": "c4-direct_product_world-div",
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
          "openingSituation": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; reply thread shows \"seen\" with no answer during after-hours silence.",
          "finalSelectionScore": 266.2
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
          "coreIdea": "Handheld urgency: Two clocks at The small business owner who opened her laptop Friday night and realized her web: shop hours vs \"avg website reply\" spinning into hours during after-hours silence.",
          "hookLine": "Dual clocks, one shameful.",
          "rejected": false,
          "candidateId": "c5-social_observation-div",
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
          "openingSituation": "Handheld urgency: Two clocks at The small business owner who opened her laptop Friday night and realized her web: shop hours vs \"avg website reply\" spinning into hours during after-hours silence.",
          "finalSelectionScore": 120.5
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
          "coreIdea": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The small business owner who opened her laptop Friday night and realized her web.",
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
          "openingSituation": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The small business owner who opened her laptop Friday night and realized her web.",
          "finalSelectionScore": 181.05
        }
      ],
      "comparativeJudge": {
        "winnerId": "c4-direct_product_world-div",
        "winnerReason": "final_selection_score=266.2; creative_score=95.2; commercial_score=171.0; stop=5; comprehension=7; originality=5; renderability=10; first_frame=9; product_demo=9; human_problem=10; family=direct_product_world; core=Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner",
        "mostRenderable": "c4-direct_product_world-div",
        "clearestFirstFrame": "c4-direct_product_world-div",
        "bestProductTopicFit": "c4-direct_product_world-div",
        "clearestMentalImage": "c4-direct_product_world-div",
        "leastInterchangeable": "c2-absurd_understandable-div",
        "strongestHumanProblem": "c4-direct_product_world-div",
        "mostMemorableInOneHour": "c2-absurd_understandable-div",
        "mostLikelyToStopScrolling": "c1-consequence_first-div",
        "bestProductDemonstrability": "c4-direct_product_world-div",
        "bestCommercialSurvivability": "c4-direct_product_world-div"
      },
      "selectedCandidate": {
        "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "family": "direct_product_world",
        "coreIdea": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; reply thread shows \"seen\" with no answer during after-hours silence.",
        "hookLine": "Urgent question dies in silence.",
        "candidateId": "c4-direct_product_world-div",
        "creativeDNA": {
          "world": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and…",
          "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Close on a customer's hands sending an urgent question to The small business…",
          "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "mainCharacter": "A website visitor's hands sending an urgent question",
          "immutableRules": [
            "Do not relocate the primary story away from: Handheld urgency: Close on a customer's hands sending an urgent question to The small bus…",
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
        "openingSituation": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; reply thread shows \"seen\" with no answer during after-hours silence.",
        "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
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
              "raw-13-4966",
              "raw-7-3412"
            ],
            "centroidScene": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from after-hours silence.",
            "representativeId": "raw-13-4966"
          },
          {
            "clusterId": "cl-2",
            "memberIds": [
              "raw-10-4536",
              "raw-5-2676"
            ],
            "centroidScene": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The small business owner who opened her laptop Friday night and realized her web; website chat on the counter glows with zero replies.",
            "representativeId": "raw-10-4536"
          },
          {
            "clusterId": "cl-3",
            "memberIds": [
              "raw-15-4269",
              "raw-3-6352"
            ],
            "centroidScene": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The small business owner who opened her laptop Friday night and realized her web.",
            "representativeId": "raw-15-4269"
          },
          {
            "clusterId": "cl-4",
            "memberIds": [
              "raw-16-4871",
              "raw-2-274"
            ],
            "centroidScene": "Handheld urgency: Empty front desk at The small business owner who opened her laptop Friday night and realized her web during after-hours silence; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
            "representativeId": "raw-16-4871"
          },
          {
            "clusterId": "cl-5",
            "memberIds": [
              "raw-12-945",
              "raw-1-5170",
              "raw-14-5522"
            ],
            "centroidScene": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; reply thread shows \"seen\" with no answer during after-hours silence.",
            "representativeId": "raw-12-945"
          },
          {
            "clusterId": "cl-6",
            "memberIds": [
              "raw-9-7002",
              "raw-4-3100"
            ],
            "centroidScene": "Handheld urgency: Two clocks at The small business owner who opened her laptop Friday night and realized her web: shop hours vs \"avg website reply\" spinning into hours during after-hours silence.",
            "representativeId": "raw-9-7002"
          }
        ],
        "survivors": [
          {
            "id": "raw-13-4966",
            "tags": [
              "consequence",
              "competitor",
              "v1"
            ],
            "scene": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from after-hours silence.",
            "rejected": false,
            "clusterId": "cl-1",
            "rejectReason": null,
            "scrollStopCue": "Competitor wins before you pick up",
            "stopScrollScore": 7,
            "visualDistinctScore": 6.5
          },
          {
            "id": "raw-10-4536",
            "tags": [
              "absurd",
              "queue",
              "lobby",
              "v0"
            ],
            "scene": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The small business owner who opened her laptop Friday night and realized her web; website chat on the counter glows with zero replies.",
            "rejected": false,
            "clusterId": "cl-2",
            "rejectReason": null,
            "scrollStopCue": "Airport logic applied to the wrong queue",
            "stopScrollScore": 7,
            "visualDistinctScore": 5
          },
          {
            "id": "raw-15-4269",
            "tags": [
              "departure",
              "board",
              "delay",
              "v1"
            ],
            "scene": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The small business owner who opened her laptop Friday night and realized her web.",
            "rejected": false,
            "clusterId": "cl-3",
            "rejectReason": null,
            "scrollStopCue": "Departure board for the wrong channel",
            "stopScrollScore": 7,
            "visualDistinctScore": 5
          },
          {
            "id": "raw-16-4871",
            "tags": [
              "role_reversal",
              "empty",
              "chat",
              "v1"
            ],
            "scene": "Handheld urgency: Empty front desk at The small business owner who opened her laptop Friday night and realized her web during after-hours silence; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
            "rejected": false,
            "clusterId": "cl-4",
            "rejectReason": null,
            "scrollStopCue": "Nobody home except the waiting chat",
            "stopScrollScore": 7,
            "visualDistinctScore": 5
          },
          {
            "id": "raw-12-945",
            "tags": [
              "hands",
              "urgent",
              "customer",
              "v0"
            ],
            "scene": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; reply thread shows \"seen\" with no answer during after-hours silence.",
            "rejected": false,
            "clusterId": "cl-5",
            "rejectReason": null,
            "scrollStopCue": "Urgent question dies in silence",
            "stopScrollScore": 7.5,
            "visualDistinctScore": 4
          },
          {
            "id": "raw-9-7002",
            "tags": [
              "clocks",
              "timer",
              "shame",
              "v1"
            ],
            "scene": "Handheld urgency: Two clocks at The small business owner who opened her laptop Friday night and realized her web: shop hours vs \"avg website reply\" spinning into hours during after-hours silence.",
            "rejected": false,
            "clusterId": "cl-6",
            "rejectReason": null,
            "scrollStopCue": "Dual clocks, one shameful",
            "stopScrollScore": 7,
            "visualDistinctScore": 4
          }
        ],
        "rawGeneratedCount": 20,
        "candidateSourceIds": [
          "raw-13-4966",
          "raw-10-4536",
          "raw-16-4871",
          "raw-12-945",
          "raw-9-7002",
          "raw-15-4269"
        ],
        "rawAfterFilterCount": 13,
        "rejectedGenericSamples": [
          {
            "id": "raw-6-7014",
            "scene": "Night: The small business owner who opened her laptop Friday night and realized her web dark; security light on; tablet shows unanswered website chats glowing d",
            "reason": "prop_without_situation"
          },
          {
            "id": "raw-8-8953",
            "scene": "Physical stack of printed missed-web-session logs grows on the The small business owner who opened her laptop Friday night and realized her web counter while st",
            "reason": "prop_without_situation"
          },
          {
            "id": "raw-11-2752",
            "scene": "Handheld urgency: Physical stack of printed missed-web-session logs grows on the The small business owner who opened her laptop Friday night and realized her we",
            "reason": "prop_without_situation"
          },
          {
            "id": "raw-17-7291",
            "scene": "Handheld urgency: Night: The small business owner who opened her laptop Friday night and realized her web dark; security light on; tablet shows unanswered websi",
            "reason": "prop_without_situation"
          },
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
      "regenerationReason": "opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame,hook_not_preserved_in_first_spoken,product_or_topic_not_implied",
      "rejectedCandidates": [],
      "finalScriptFidelity": {
        "passed": false,
        "failureReasons": [
          "opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame",
          "product_or_topic_not_implied",
          "storyboard_collapsed_to_generic_office"
        ],
        "coreIdeaRecognizable": true,
        "productOrTopicImplied": false,
        "voiceoverEssayCadence": false,
        "collapsedToGenericOffice": true,
        "hookPreservedInFirstSpoken": true,
        "openingSituationVisibleInScene1": false
      },
      "generatedCandidates": [
        {
          "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "family": "consequence_first",
          "coreIdea": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from after-hours silence.",
          "hookLine": "Competitor wins before you pick up.",
          "candidateId": "c1-consequence_first-div",
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
          "openingSituation": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from after-hours silence.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "creativeDnaSource": "model",
          "emotionalReaction": "urgency",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Competitor wins before you pick up",
          "expectedViewerQuestion": "What happens to the person in: Competitor wins before you pick up?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "family": "absurd_understandable",
          "coreIdea": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The small business owner who opened her laptop Friday night and realized her web; website chat on the counter glows with zero replies.",
          "hookLine": "Airport logic applied to the wrong queue.",
          "candidateId": "c2-absurd_understandable-div",
          "creativeDNA": {
            "world": "A The small business owner who opened her laptop Friday night and realized her web lobby / service counter",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The small business own…",
            "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
            "mainCharacter": "An absurd boarding-ticket queue for phone callers (website line empty)",
            "immutableRules": [
              "Do not relocate the primary story away from: A The small business owner who opened her laptop Friday night and realized her web lobby…",
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
          "openingSituation": "Handheld urgency: Absurd boarding-ticket dispenser for phone callers at The small business owner who opened her laptop Friday night and realized her web; website chat on the counter glows with zero replies.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "creativeDnaSource": "model",
          "emotionalReaction": "amused recognition",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Airport logic applied to the wrong queue",
          "expectedViewerQuestion": "What happens to the person in: Airport logic applied to the wrong queue?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "family": "role_reversal",
          "coreIdea": "Handheld urgency: Empty front desk at The small business owner who opened her laptop Friday night and realized her web during after-hours silence; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
          "hookLine": "Nobody home except the waiting chat.",
          "candidateId": "c3-role_reversal-div",
          "creativeDNA": {
            "world": "Handheld urgency: Empty front desk at The small business owner who opened her laptop Friday night and realized her web during after-hours s…",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Empty front desk at The small business owner who opened her laptop Friday ni…",
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
          "openingSituation": "Handheld urgency: Empty front desk at The small business owner who opened her laptop Friday night and realized her web during after-hours silence; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "creativeDnaSource": "model",
          "emotionalReaction": "unease",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Nobody home except the waiting chat",
          "expectedViewerQuestion": "What happens to the person in: Nobody home except the waiting chat?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "family": "direct_product_world",
          "coreIdea": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; reply thread shows \"seen\" with no answer during after-hours silence.",
          "hookLine": "Urgent question dies in silence.",
          "candidateId": "c4-direct_product_world-div",
          "creativeDNA": {
            "world": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and…",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Close on a customer's hands sending an urgent question to The small business…",
            "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
            "mainCharacter": "A website visitor's hands sending an urgent question",
            "immutableRules": [
              "Do not relocate the primary story away from: Handheld urgency: Close on a customer's hands sending an urgent question to The small bus…",
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
          "openingSituation": "Handheld urgency: Close on a customer's hands sending an urgent question to The small business owner who opened her laptop Friday night and realized her web; reply thread shows \"seen\" with no answer during after-hours silence.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "creativeDnaSource": "model",
          "emotionalReaction": "tension",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Urgent question dies in silence",
          "expectedViewerQuestion": "What happens to the person in: Urgent question dies in silence?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "family": "social_observation",
          "coreIdea": "Handheld urgency: Two clocks at The small business owner who opened her laptop Friday night and realized her web: shop hours vs \"avg website reply\" spinning into hours during after-hours silence.",
          "hookLine": "Dual clocks, one shameful.",
          "candidateId": "c5-social_observation-div",
          "creativeDNA": {
            "world": "Handheld urgency: Two clocks at The small business owner who opened her laptop Friday night and realized her web: shop hours vs \"avg websit…",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Two clocks at The small business owner who opened her laptop Friday night an…",
            "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
            "mainCharacter": "The recurring subject of: Handheld urgency: Two clocks at The small business owner who opened her laptop Friday night a…",
            "immutableRules": [
              "Do not relocate the primary story away from: Handheld urgency: Two clocks at The small business owner who opened her laptop Friday nig…",
              "Do not replace the main character: The recurring subject of: Handheld urgency: Two clocks at The small business owner who op…",
              "Do not turn the middle into a laptop analytics montage",
              "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Handheld urgen…) with a different marketing problem",
              "Do not resolve the story only with a happy expression; show that visitors receive answers",
              "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
            ],
            "viewerQuestion": "What happens to the person in: Dual clocks, one shameful?"
          },
          "visualPromise": "Film the opening as a scroll-stop frame: Dual clocks, one shameful. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Handheld urgency: Two clocks at The small business owner who opened her laptop Friday night and realized her web: shop hours vs \"avg website reply\" spinning into hours during after-hours silence.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "creativeDnaSource": "model",
          "emotionalReaction": "curiosity",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Dual clocks, one shameful",
          "expectedViewerQuestion": "What happens to the person in: Dual clocks, one shameful?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "family": "human_conflict",
          "coreIdea": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The small business owner who opened her laptop Friday night and realized her web.",
          "hookLine": "Departure board for the wrong channel.",
          "candidateId": "c6-human_conflict-div",
          "creativeDNA": {
            "world": "A The small business owner who opened her laptop Friday night and realized her web lobby / service counter",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding",
            "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
            "mainCharacter": "The recurring subject of: Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding",
            "immutableRules": [
              "Do not relocate the primary story away from: A The small business owner who opened her laptop Friday night and realized her web lobby…",
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
          "openingSituation": "Handheld urgency: Train-station style departure board: \"Phone caller #47\" boarding; \"Website visitor\" stuck on Delayed — at The small business owner who opened her laptop Friday night and realized her web.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "creativeDnaSource": "model",
          "emotionalReaction": "curiosity",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Departure board for the wrong channel",
          "expectedViewerQuestion": "What happens to the person in: Departure board for the wrong channel?"
        }
      ],
      "selectionDiagnostics": {
        "whyWon": "final_selection_score=266.2; creative_score=95.2; commercial_score=171.0; family=direct_product_world; renderability=10; first_frame_clarity=9; product_demo=9; human_problem=10; narrative_survive=9; commercial_survive=10; overturned_higher_creative=c2-absurd_understandable-div(creative=100.2)",
        "version": "commercial-success@1",
        "winnerId": "c4-direct_product_world-div",
        "creativeScore": 95.2,
        "commercialScore": 171,
        "losersPenalized": [
          {
            "family": "role_reversal",
            "lostBy": 60.19999999999999,
            "candidateId": "c3-role_reversal-div",
            "creativeScore": 94,
            "commercialScore": 112,
            "primaryPenalties": [],
            "finalSelectionScore": 206
          },
          {
            "family": "consequence_first",
            "lostBy": 63.5,
            "candidateId": "c1-consequence_first-div",
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
            "family": "absurd_understandable",
            "lostBy": 142.04999999999998,
            "candidateId": "c2-absurd_understandable-div",
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
            "candidateId": "c5-social_observation-div",
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
        "candidateId": "c4-direct_product_world-div",
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
          "opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame",
          "product_or_topic_not_implied",
          "storyboard_collapsed_to_generic_office"
        ],
        "coreIdeaRecognizable": true,
        "productOrTopicImplied": false,
        "voiceoverEssayCadence": false,
        "collapsedToGenericOffice": true,
        "hookPreservedInFirstSpoken": true,
        "openingSituationVisibleInScene1": false
      },
      "productDemonstrationIntegrity": {
        "passed": true,
        "summary": "product_demonstration_integrity_passed",
        "version": "product-demonstration-integrity@2",
        "violations": [],
        "primaryActor": {
          "label": "A website visitor's hands sending an urgent question",
          "lockedAttributes": [
            "female",
            "hands_focus"
          ],
          "continuityAnchors": [
            "hands",
            "hand",
            "visitor",
            "customer",
            "website",
            "owner"
          ]
        },
        "productDemonstration": {
          "present": true,
          "evidence": [
            "structured_product_demo_beat",
            "outcome_type:question_resolved"
          ],
          "askPresent": true,
          "answerPresent": true,
          "askSceneIndex": 3,
          "resultPresent": true,
          "structuredBeat": {
            "type": "product_demo",
            "actor_id": "primary_actor",
            "ai_answer": "Yes — we have availability today. Would you like to book a slot or get more details first?",
            "brand_name": "Fenrik.chat",
            "demo_variant": "after_hours_response",
            "outcome_type": "question_resolved",
            "outcome_label": "Visitor continues the conversation and selects a time",
            "conversation_id": "fenrik-demo-thread-001",
            "outcome_visible": true,
            "question_visible": true,
            "visitor_question": "Do you offer same-day consultations?",
            "ai_answer_visible": true
          },
          "landingPageOnly": false,
          "answerSceneIndex": 3,
          "resultSceneIndex": 3,
          "narrationOnlySignals": [],
          "structuredBeatPresent": true
        }
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
      "SOFT_3D": 0,
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
      "PHOTOGRAPHIC:carrier_human(+3)",
      "CLEAN_ILLUSTRATION:recent_repeat(-2)",
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
      "PRODUCT_DEMO",
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
      "CTA",
      "PRODUCT_DEMO"
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
        "hook": "Good traffic means your website is working. It does not.",
        "topic": "The SaaS founder who watched qualified visitors vanish from the pricing page — and had no idea why they left",
        "motifs": [
          "laptop",
          "phone",
          "desk",
          "dashboard",
          "founder",
          "close_up",
          "product_asset"
        ],
        "closing": "Portrait 9:16 vertical closing still — natural narrative conclusion without on-screen text or buttons. Visual mood suppo",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "PRODUCT_DEMO",
          "IMAGE"
        ],
        "sfx_category": null,
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "human",
        "opening_structure": "confession",
        "cta_composition_id": null,
        "attention_mechanism": "HUMAN_CONFLICT",
        "opening_visual_motif": "partner_showing_calendar_full_life_events",
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
        "opening_emotional_effect": "tension"
      },
      {
        "hook": "Eleven visitors came to her website over the weekend",
        "topic": "The small business owner who checked her website stats on a Monday and found 11 visitors — and zero leads",
        "motifs": [
          "laptop",
          "phone",
          "dashboard",
          "person_alone",
          "close_up",
          "product_asset"
        ],
        "closing": "Portrait 9:16 vertical closing still — natural narrative conclusion without on-screen text or buttons. Visual mood suppo",
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
        "meaning_carrier": "human",
        "opening_structure": "split_choice",
        "cta_composition_id": null,
        "attention_mechanism": "DILEMMA",
        "opening_visual_motif": "parent_school_gate_glancing_content_calendar",
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
        "opening_emotional_effect": "dilemma"
      },
      {
        "hook": "Someone typed an urgent question into your website last night",
        "topic": "The lawyer who woke up to three missed inquiries — and zero contact details to follow up with",
        "motifs": [
          "phone",
          "dashboard",
          "group",
          "product_asset"
        ],
        "closing": "Soft polished 3D render, portrait 9:16 vertical frame. Home kitchen environment, cool clear morning light. Three-quarter",
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
        "meaning_carrier": "human",
        "opening_structure": "immediate_reaction",
        "cta_composition_id": null,
        "attention_mechanism": "IRONY",
        "opening_visual_motif": "productivity_trophy_collecting_dust_next_overflowing",
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
        "opening_emotional_effect": "humor"
      },
      {
        "hook": "Urgent question dies in silence.",
        "topic": "The beauty salon that found five unread visitor questions on Tuesday — and no way to reach any of them",
        "motifs": [
          "phone",
          "meeting",
          "person_alone",
          "close_up",
          "product_asset"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 22–25); pl",
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
        "opening_structure": "sudden_reveal",
        "cta_composition_id": null,
        "attention_mechanism": "CURIOSITY_GAP",
        "opening_visual_motif": "door_cracked_open_onto_unfinished_half",
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
        "opening_emotional_effect": "curiosity"
      },
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
        "reason": "structured product_demo; deterministic chat renderer",
        "scene_id": "scene-product-demo",
        "final_type": "PRODUCT_DEMO",
        "requested_type": "PRODUCT_DEMO"
      },
      {
        "rule": "allowed",
        "reason": "image scene",
        "scene_id": "scene-5",
        "final_type": "IMAGE",
        "requested_type": "IMAGE"
      }
    ],
    "allowed_scene_types": [
      "IMAGE",
      "CHECKLIST",
      "QUOTE",
      "PHONE",
      "CTA",
      "PRODUCT_DEMO"
    ],
    "presentation_generation": {
      "mode": "enabled",
      "package_id": "5adb5e92-e1db-4a7c-b6f1-0ed01aefb370",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "cta_selected": false,
      "visual_profile": "NATURAL",
      "downgrade_rules": [],
      "creative_identity": {
        "key": "a soft-focus urban street exterior|reflective, thoughtful pause|overcast diffused daylight|wide environmental framing|centered subject with generous vertical headroom|implied human presence just off-screen|warm neutral color feel",
        "mood": "reflective, thoughtful pause",
        "camera": "wide environmental framing",
        "version": "creative-identity@1",
        "lighting": "overcast diffused daylight",
        "color_feel": "warm neutral color feel",
        "option_ids": {
          "mood": "reflective",
          "camera": "wide_environmental",
          "lighting": "overcast_diffused",
          "color_feel": "warm_neutral",
          "composition": "centered_headroom",
          "environment": "urban_street_soft",
          "human_presence": "implied_offscreen"
        },
        "composition": "centered subject with generous vertical headroom",
        "environment": "a soft-focus urban street exterior",
        "human_presence": "implied human presence just off-screen"
      },
      "history_decisions": [],
      "visual_beat_count": 5,
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
          "reason": "structured product_demo; deterministic chat renderer",
          "scene_id": "scene-product-demo",
          "final_type": "PRODUCT_DEMO",
          "requested_type": "PRODUCT_DEMO"
        },
        {
          "rule": "allowed",
          "reason": "image scene",
          "scene_id": "scene-5",
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
        "PRODUCT_DEMO",
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
          "hook": "Good traffic means your website is working. It does not.",
          "topic": "The SaaS founder who watched qualified visitors vanish from the pricing page — and had no idea why they left",
          "motifs": [
            "laptop",
            "phone",
            "desk",
            "dashboard",
            "founder",
            "close_up",
            "product_asset"
          ],
          "closing": "Portrait 9:16 vertical closing still — natural narrative conclusion without on-screen text or buttons. Visual mood suppo",
          "typed_cta": false,
          "scene_types": [
            "IMAGE",
            "IMAGE",
            "IMAGE",
            "PRODUCT_DEMO",
            "IMAGE"
          ],
          "sfx_category": null,
          "creative_mode": null,
          "visual_medium": "CLEAN_ILLUSTRATION",
          "meaning_carrier": "human",
          "opening_structure": "confession",
          "cta_composition_id": null,
          "attention_mechanism": "HUMAN_CONFLICT",
          "opening_visual_motif": "partner_showing_calendar_full_life_events",
          "dominant_subject_motif": "laptop",
          "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
          "opening_emotional_effect": "tension"
        },
        {
          "hook": "Eleven visitors came to her website over the weekend",
          "topic": "The small business owner who checked her website stats on a Monday and found 11 visitors — and zero leads",
          "motifs": [
            "laptop",
            "phone",
            "dashboard",
            "person_alone",
            "close_up",
            "product_asset"
          ],
          "closing": "Portrait 9:16 vertical closing still — natural narrative conclusion without on-screen text or buttons. Visual mood suppo",
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
          "meaning_carrier": "human",
          "opening_structure": "split_choice",
          "cta_composition_id": null,
          "attention_mechanism": "DILEMMA",
          "opening_visual_motif": "parent_school_gate_glancing_content_calendar",
          "dominant_subject_motif": "laptop",
          "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
          "opening_emotional_effect": "dilemma"
        },
        {
          "hook": "Someone typed an urgent question into your website last night",
          "topic": "The lawyer who woke up to three missed inquiries — and zero contact details to follow up with",
          "motifs": [
            "phone",
            "dashboard",
            "group",
            "product_asset"
          ],
          "closing": "Soft polished 3D render, portrait 9:16 vertical frame. Home kitchen environment, cool clear morning light. Three-quarter",
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
          "meaning_carrier": "human",
          "opening_structure": "immediate_reaction",
          "cta_composition_id": null,
          "attention_mechanism": "IRONY",
          "opening_visual_motif": "productivity_trophy_collecting_dust_next_overflowing",
          "dominant_subject_motif": "phone",
          "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
          "opening_emotional_effect": "humor"
        },
        {
          "hook": "Urgent question dies in silence.",
          "topic": "The beauty salon that found five unread visitor questions on Tuesday — and no way to reach any of them",
          "motifs": [
            "phone",
            "meeting",
            "person_alone",
            "close_up",
            "product_asset"
          ],
          "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 22–25); pl",
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
          "opening_structure": "sudden_reveal",
          "cta_composition_id": null,
          "attention_mechanism": "CURIOSITY_GAP",
          "opening_visual_motif": "door_cracked_open_onto_unfinished_half",
          "dominant_subject_motif": "phone",
          "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
          "opening_emotional_effect": "curiosity"
        },
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
        }
      ]
    }
  }
}
```

#### Scene-by-scene

| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |
| ---: | --- | --- | --- | --- | --- |
| 1 | scene-1 | IMAGE | image@1 | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f29496cb-6234-4a9a-b21b-bd8e33a1b910/scene-scene-1.png` | — |
| 2 | scene-2 | IMAGE | image@1 | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f29496cb-6234-4a9a-b21b-bd8e33a1b910/scene-scene-2.png` | — |
| 3 | scene-3 | IMAGE | image@1 | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f29496cb-6234-4a9a-b21b-bd8e33a1b910/scene-scene-3.png` | — |
| 4 | scene-product-demo | PRODUCT_DEMO | product_demo@1 | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f29496cb-6234-4a9a-b21b-bd8e33a1b910/scene-scene-product-demo.png` | — |
| 5 | scene-5 | IMAGE | image@1 | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f29496cb-6234-4a9a-b21b-bd8e33a1b910/scene-scene-5.png` | — |

**Scene 1 (scene-1) — image_prompt (job input)**

```
Photorealistic photographic image. Portrait 9:16 vertical frame. Extreme close-up of a person's hands holding a smartphone on a soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel, centered subject with generous vertical headroom. The phone screen faces the viewer showing a website chat widget interface rendered as abstract UI shapes: a sent message bubble at the bottom, a read receipt indicator visible, and an empty waiting space above where a reply should appear. No readable text anywhere on screen. The hands are relaxed but attentive — thumb resting after typing. Background is softly blurred urban street, muted warm grays and neutrals. No laptop, no desk, no office.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Photorealistic photographic image. Portrait 9:16 vertical frame. Extreme close-up of a person's hands holding a smartphone on a soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel, centered subject with generous vertical headroom. The phone screen faces the viewer showing a website chat widget interface rendered as abstract UI shapes: a sent message bubble at the bottom, a read receipt indicator visible, and an empty waiting space above where a reply should appear. No readable text anywhere on screen. The hands are relaxed but attentive — thumb resting after typing. Background is softly blurred urban street, muted warm grays and neutrals. No laptop, no desk, no office."
  }
}
```
**Scene 2 (scene-2) — image_prompt (job input)**

```
Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same urban street exterior — overcast diffused daylight, warm neutral color feel. The phone screen now shows the same chat thread: the sent message bubble visible, a small timestamp indicator in abstract form suggesting mid-afternoon, and a blinking cursor in the reply area — no reply bubble present. The visitor's hand has lowered the phone slightly, the screen still visible to the viewer. The posture suggests waiting, then quiet resignation. No text readable. Background remains softly blurred urban street. Reflective, thoughtful pause mood.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same urban street exterior — overcast diffused daylight, warm neutral color feel. The phone screen now shows the same chat thread: the sent message bubble visible, a small timestamp indicator in abstract form suggesting mid-afternoon, and a blinking cursor in the reply area — no reply bubble present. The visitor's hand has lowered the phone slightly, the screen still visible to the viewer. The posture suggests waiting, then quiet resignation. No text readable. Background remains softly blurred urban street. Reflective, thoughtful pause mood."
  }
}
```
**Scene 3 (scene-3) — image_prompt (job input)**

```
Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel. The visitor's thumb is tapping away from the chat page — the screen now shows a blurred browser back gesture or a closing animation rendered as abstract motion blur of the chat widget disappearing. The hand is pulling the phone slightly downward and away. The action communicates departure: the conversation is over before it began. No readable text. Mood: quiet consequence, not drama. Centered composition with generous vertical headroom.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, same soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel. The visitor's thumb is tapping away from the chat page — the screen now shows a blurred browser back gesture or a closing animation rendered as abstract motion blur of the chat widget disappearing. The hand is pulling the phone slightly downward and away. The action communicates departure: the conversation is over before it began. No readable text. Mood: quiet consequence, not drama. Centered composition with generous vertical headroom."
  }
}
```
**Scene 4 (scene-product-demo) — image_prompt (job input)**

```
presentation:product_demo:scene-product-demo
```

```json
{
  "type": "product_demo",
  "actor_id": "primary_actor",
  "ai_answer": "Yes — we have availability today. Would you like to book a slot or get more details first?",
  "brand_name": "Fenrik.chat",
  "demo_variant": "after_hours_response",
  "outcome_type": "question_resolved",
  "outcome_label": "Visitor continues the conversation and selects a time",
  "conversation_id": "fenrik-demo-thread-001",
  "outcome_visible": true,
  "question_visible": true,
  "visitor_question": "Do you offer same-day consultations?",
  "ai_answer_visible": true
}
```
**Scene 5 (scene-5) — image_prompt (job input)**

```
Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel, centered subject with generous vertical headroom. The phone screen now shows a live chat thread with two abstract reply bubbles visible: a visitor message and a clear AI response bubble below it, followed by a second visitor message — the conversation is ongoing. The screen glows warmly. The hand holds the phone with relaxed engagement, thumb hovering ready to type again. No readable text. Mood: quiet resolution, relief, the conversation that should have always been there.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, soft-focus urban street exterior — overcast diffused daylight, warm neutral color feel, centered subject with generous vertical headroom. The phone screen now shows a live chat thread with two abstract reply bubbles visible: a visitor message and a clear AI response bubble below it, followed by a second visitor message — the conversation is ongoing. The screen glows warmly. The hand holds the phone with relaxed engagement, thumb hovering ready to type again. No readable text. Mood: quiet resolution, relief, the conversation that should have always been there."
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

Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: warm, intimate, conversational storytelling pace. Delivery: confident, concise, not aggressive. Opening: alert, clipped first phrase — not shouted. Then settle into conversational body deliver


- **voiceover characters:** 481
- **estimated words:** 79
- **audio_duration (debug):** 35.556
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
| beat-1 | scene-1 | EMPHASIS | zoom_in | LOW |
| beat-2 | scene-2 | EXPLAIN | drift_up | LOW |
| beat-3 | scene-3 | REVEAL | zoom_out | LOW |
| beat-4 | scene-product-demo | CLOSE | static | LOW |
| beat-5 | scene-5 | CLOSE | static | LOW |
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
    "PRODUCT_DEMO",
    "IMAGE"
  ],
  "prompt_presentation_types": null
}
```

#### Image generation / moderation

No `image_generation_warnings` on render_spec — all scenes used primary provider path.

#### Final video details

- **MP4:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f29496cb-6234-4a9a-b21b-bd8e33a1b910/output.mp4
- **thumbnail:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f29496cb-6234-4a9a-b21b-bd8e33a1b910/thumbnail.png
- **subtitles:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f29496cb-6234-4a9a-b21b-bd8e33a1b910/subtitles.srt
- **video_duration:** 35.566667
- **subtitle_source:** whisper
- **render_warning:** false

#### Admin links (paths, no signed tokens)

- Production: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/production`
- Review: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/review`
- Content packages: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/content-packages`
- Videos / scene editor: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/videos`
- API export JSON: `/api/production-runs/2f896bec-05f1-4091-82b0-7e384894eef2/export`

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
| The small business owner who opened her laptop Friday night and realized her website had been turning away strangers all week | shimmer | NATURAL | 0 | 0 | 0 | 0 | 0 | yes | 0 |

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
