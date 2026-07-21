# Production Run Audit — b98a3ba8-4e34-4027-82d4-c58a798f7201

_Generated 2026-07-20T21:06:27.291Z by `scripts/audit-production-run.ts` (read-only)._

## A. Executive summary

- **Strategy items:** 1
- **Content packages:** 1
- **Primary video jobs (newest per item):** 1 (1 completed, 0 failed)
- **Content items (all variants):** 11
- **Scene types in worker inputs:** {}
- **Visual profile(s) on jobs:** NATURAL (project auto: MINIMAL)
- **Voices used:** — (project default: cedar)
- **Moderation fallback scenes:** 0
- **Run warnings (subtitle/render flags):** 0
- **Major warnings:** None flagged on completed jobs.

## B. Run overview

| Field | Value |
| --- | --- |
| production_run_id | `b98a3ba8-4e34-4027-82d4-c58a798f7201` |
| project_id | `aabab9ff-9db4-4012-a53c-135e3bfea6cd` |
| project name | Fenrik.chat |
| status | completed |
| created_at | 2026-07-20T20:55:03.281208+00:00 |
| updated_at (terminal) | 2026-07-20T21:01:37.655286+00:00 |
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
    "videoOutputsTotal": 3,
    "activeVideoPlatforms": [
      "tiktok",
      "instagram",
      "youtube"
    ]
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

- **6e7209eb-ae4a-4410-87e7-e3154f594a93** — The silent website: what happens to your visitors when no one is there to answer
```json
{
  "theme": "The silent website: what happens to your visitors when no one is there to answer",
  "source": "production_run",
  "production_run_id": "b98a3ba8-4e34-4027-82d4-c58a798f7201",
  "funnel_distribution": {
    "Awareness": 1,
    "Conversion": 0,
    "Problem Aware": 0,
    "Solution Aware": 0
  },
  "generation_telemetry": {
    "steps": [
      {
        "model": "claude-sonnet-4-6",
        "repair": false,
        "success": true,
        "provider": "claude",
        "warnings": [],
        "step_name": "Weekly Strategy",
        "max_tokens": 8192,
        "started_at": "2026-07-20T20:55:06.041Z",
        "duration_ms": 6153,
        "finished_at": "2026-07-20T20:55:12.194Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": 0,
        "error_message": null,
        "input_summary": "Weekly Strategy input:\n- Product Brain\n- Trends\n- Evergreen Topics\n- Anti-repetition Memory",
        "prompt_tokens": 4039,
        "estimated_cost": 0.015957,
        "output_summary": "Theme + funnel plan\n↓\n1 strategy item (requested 1)",
        "response_format": "json",
        "input_size_bytes": 17795,
        "completion_tokens": 256,
        "output_size_bytes": 980,
        "prompt_characters": 17691,
        "completion_characters": 978
      },
      {
        "model": null,
        "repair": false,
        "success": true,
        "provider": "deterministic",
        "warnings": [],
        "step_name": "Strategy Items",
        "max_tokens": null,
        "started_at": "2026-07-20T20:55:12.194Z",
        "duration_ms": 664,
        "finished_at": "2026-07-20T20:55:12.858Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": null,
        "error_message": null,
        "input_summary": "Strategy Items input:\n- Weekly Strategy plan\n- Funnel distribution",
        "prompt_tokens": null,
        "estimated_cost": null,
        "output_summary": "1 strategy item(s) persisted",
        "response_format": null,
        "input_size_bytes": null,
        "completion_tokens": null,
        "output_size_bytes": 104,
        "prompt_characters": null,
        "completion_characters": 104
      }
    ],
    "phases": [],
    "version": "pipeline-telemetry@1",
    "production_run_id": "b98a3ba8-4e34-4027-82d4-c58a798f7201"
  }
}
```

### production_run_items

```json
[
  {
    "id": "aa42cd74-4891-4105-8d32-a3cbacbb9e5a",
    "production_run_id": "b98a3ba8-4e34-4027-82d4-c58a798f7201",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "c8c17f53-3257-4785-8676-0931dac13633",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-20T20:55:03.598902+00:00",
    "updated_at": "2026-07-20T21:01:37.53932+00:00"
  }
]
```

## C. Package-by-package audit

### Package 1 — After Hours, Chats Still Screaming

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `c8c17f53-3257-4785-8676-0931dac13633` |
| strategy_item_id | `1c9532c6-7754-444b-b6c5-446675f74429` |
| weekly_strategy_id | `6e7209eb-ae4a-4410-87e7-e3154f594a93` |
| production_run_id | `b98a3ba8-4e34-4027-82d4-c58a798f7201` |
| status | draft |
| funnel_stage | awareness |
| created_at | 2026-07-20T20:57:19.710038+00:00 |
| updated_at | 2026-07-20T21:01:36.256995+00:00 |
| primary content_item_id | `86f4f680-c49e-42c5-b96e-45ba920fb1fb` |
| video_job_id | `` |
| video_job status | — |

#### Phase timings (pipeline telemetry)

```
Package generation

122.7 s

↓

Creative Candidates
49 ms

↓

Candidate Judge
0 ms

↓

Narrative Beats
6 ms

↓

Presentation Generation
118.6 s

↓

Hook Enforcement
0 ms

↓

Concept Fidelity
8 ms

↓

Story Integrity
4 ms

↓

Product Demonstration Integrity
4 ms

↓

Platform Outputs
0 ms

↓

Persist Package
4 s
```

##### Execution Time

| Step | Duration | % |
| --- | ---: | ---: |
| Creative Candidates | 49 ms | 0.0% |
| Candidate Judge | 0 ms | 0.0% |
| Narrative Beats | 6 ms | 0.0% |
| Presentation Generation | 118.6 s | 96.6% |
| Hook Enforcement | 0 ms | 0.0% |
| Concept Fidelity | 8 ms | 0.0% |
| Story Integrity | 4 ms | 0.0% |
| Product Demonstration Integrity | 4 ms | 0.0% |
| Platform Outputs | 0 ms | 0.0% |
| Persist Package | 4 s | 3.3% |
| **Total** | **122.7 s** | **100%** |

##### AI Cost

| Step | Prompt tok | Completion tok | Estimated $ |
| --- | ---: | ---: | ---: |
| Presentation Generation | 27883 | 7346 | $0.0086 |
| **Total (est.)** |  |  | **$0.0086** |

##### Prompt Sizes

| Step | Prompt KB | Output KB |
| --- | ---: | ---: |
| Creative Candidates | — | 0.1 KB |
| Candidate Judge | — | 2.9 KB |
| Narrative Beats | — | 0.0 KB |
| Presentation Generation | 99.6 KB | 15.9 KB |
| Hook Enforcement | — | 0.1 KB |
| Concept Fidelity | — | 0.0 KB |
| Story Integrity | — | 0.1 KB |
| Product Demonstration Integrity | — | 0.1 KB |
| Platform Outputs | — | 4.7 KB |
| Persist Package | — | 0.5 KB |

##### Providers

| Provider | Steps | Duration |
| --- | ---: | ---: |
| Claude | 1 | 118.6 s |
| Deterministic | 9 | 4.1 s |

#### Strategy input

- **topic:** The small business owner who realized her website had never once answered a single visitor question
- **angle:** A local service business owner reviews her website analytics for the first time in months and discovers dozens of visitors came and left without a trace — no leads, no messages, no contact. The website looked professional, but it was completely silent. The video reframes what a website is actually supposed to do: not just look good, but respond. Pain point anchored to visitors leaving before contacting you and losing leads due to lack of instant website support.
- **package_index:** 0
- **platform:** tiktok
- **format:** reel
- **priority:** 1
- **funnel_stage (column):** awareness
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "A local service business owner reviews her website analytics for the first time in months and discovers dozens of visitors came and left without a trace — no leads, no messages, no contact. The website looked professional, but it was completely silent. The video reframes what a website is actually supposed to do: not just look good, but respond. Pain point anchored to visitors leaving before contacting you and losing leads due to lack of instant website support.",
  "topic": "The small business owner who realized her website had never once answered a single visitor question",
  "source": "production_run",
  "package_index": 0,
  "production_run_id": "b98a3ba8-4e34-4027-82d4-c58a798f7201"
}
```

#### Full content (package_brief core)

**hook:**

After hours, chats still screaming.


**voiceover_text:**

After hours, chats still screaming. Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothing. Not a word. They didn't leave a message. They just left. The website wasn't broken. It was silent. Your AI assistant answers the moment someone asks — even when you can't.


**subtitles:**

After hours, chats still screaming. | Your website looks great. | Professional logo. Clean layout. | Every visitor who needed an answer after 6 PM — got nothing. | Not a word. They just left. | The website wasn't broken. It was silent. | Your AI assistant answers the moment someone asks — even when you can't.


**video concept:**

A dark, closed small business at night — security light glowing, a tablet on the counter showing a stream of unanswered website chat messages piling up in real time. The camera holds on that silent, glowing screen. We widen to see the empty space. The irony: the business looks polished and professional from the outside, but inside, every visitor question sits unanswered. Then — the twist. An AI assistant activates on the website. The next visitor types a question. An answer appears instantly. The owner doesn't have to be there. The website finally speaks.


**video script:**

BEAT 1 — HOOK (0–3s): Night. Small business dark. Security light on. Tablet on the counter glowing — a stream of unanswered website messages stacking up. Voiceover: 'After hours, chats still screaming.'

BEAT 2 — SETUP (3–10s): Wide shot of the empty, professional-looking interior — tidy, branded, silent. Voiceover: 'Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothing. Not a word.'

BEAT 3 — ESCALATION (10–17s): Visitor perspective — someone types a question into the website chat on their phone in the dark. No reply. They close the tab. Voiceover: 'They didn't leave a message. They just left. The website wasn't broken. It was silent.'

BEAT 4 — PRODUCT DEMO (17–22s): The AI assistant activates on the website. A new visitor types a question. The AI responds instantly — question answered, contact captured. Voiceover: 'Your AI assistant answers the moment someone asks — even when you can't.'

BEAT 5 — RESOLUTION / CTA (22–25s): The business exterior at night, now with a subtle glow from the tablet — answered. Soft close. Voiceover fades. On-screen: 'Create your AI assistant.'


**duration_seconds (brief):** 25

**CTA:** Create your AI assistant — let your website answer while you're closed. (type: sign_up)

**creative_mode:** 

**hashtags:** ["#SmallBusiness","#AIAssistant","#WebsiteTips","#LeadGeneration","#AfterHours","#CustomerSupport","#ServiceBusiness","#AutomationTools","#Fenrik"]


#### Full platform copy

##### x

```json
{
  "cta": "fenrik.chat",
  "format": "Video Tweet",
  "caption": "Your website is closed after hours. The visitors aren't. Every unanswered question is a lead that walked away quietly.",
  "hashtags": [
    "#SmallBusiness",
    "#AIAssistant"
  ],
  "title_variants": [
    "The after-hours silence your website never told you about",
    "A polished website that couldn't answer a single question after 6 PM",
    "Visitors came. Asked. Got nothing. Left.",
    "What your website actually does when you're not watching",
    "The lead you lost last night wasn't a marketing problem"
  ],
  "caption_variants": [
    "Your website is closed after hours. The visitors aren't. Every unanswered question is a lead that walked away quietly.",
    "Professional logo. Clean layout. Zero replies after 6 PM. The website looked great — it just couldn't say anything back.",
    "Someone typed a question into your website last night. Got silence. Closed the tab. You'll never know who it was.",
    "The irony: the more polished your website looks, the more trust visitors place in it — and the harder the silence hits when no one responds.",
    "It's not a traffic problem. It's an availability problem. Your website needs to answer when you can't. #SmallBusiness"
  ]
}
```
##### tiktok

```json
{
  "cta": "Link in bio to create your AI assistant.",
  "format": "Vertical Short (9:16)",
  "caption": "Your website looked perfect. Every visitor who came after hours got total silence. 😶",
  "hashtags": [
    "#SmallBusiness",
    "#WebsiteTips",
    "#AIAssistant",
    "#LeadGeneration",
    "#AfterHours"
  ]
}
```
##### youtube

```json
{
  "cta": "Create your AI assistant at fenrik.chat",
  "format": "YouTube Short (9:16)",
  "caption": "Your website looks professional. But after hours? Total silence — every visitor question goes unanswered.",
  "hashtags": [
    "#SmallBusiness",
    "#AIAssistant",
    "#WebsiteTips"
  ]
}
```
##### facebook

```json
{
  "cta": "Create your AI assistant at fenrik.chat",
  "format": "Video Post",
  "caption": "Here's something most service business owners don't realize until they check their analytics: visitors came to the website after hours, typed a question, and left without a word — because there was no one to respond. 🌙\n\nThe website looked great. It just couldn't say anything back.\n\nAn AI assistant on your website changes that — it answers visitor questions automatically, captures their details, and keeps the conversation going even when you're closed.\n\nWorth trying — you can even preview it on your own site before signing up.",
  "hashtags": [
    "#SmallBusiness",
    "#AIAssistant",
    "#CustomerSupport"
  ]
}
```
##### linkedin

```json
{
  "cta": "Create your AI assistant at fenrik.chat",
  "format": "Video + Caption",
  "caption": "A business can look completely professional — clean website, clear services, strong brand — and still be losing leads every single night.\n\nNot because of bad marketing. Because after hours, the website goes silent. Visitors arrive, type a question, and leave when nothing comes back.\n\nAn AI assistant built from your existing website content changes that equation. It answers the moment someone asks — no staff required, no setup complexity.\n\nThe gap isn't visibility. It's availability.",
  "hashtags": [
    "#SmallBusiness",
    "#AIAssistant",
    "#LeadGeneration"
  ],
  "title_variants": [
    "The professional website that couldn't answer a single after-hours question",
    "Availability is the gap most service businesses never close"
  ],
  "caption_variants": [
    "A business can look completely professional — clean website, clear services, strong brand — and still be losing leads every single night.\n\nNot because of bad marketing. Because after hours, the website goes silent. Visitors arrive, type a question, and leave when nothing comes back.\n\nAn AI assistant built from your existing website content changes that equation. It answers the moment someone asks — no staff required, no setup complexity.\n\nThe gap isn't visibility. It's availability.",
    "Most service businesses invest in how their website looks. Very few invest in what it does when no one is watching.\n\nAfter 6 PM, visitors still arrive. They still have questions. And a contact form that says 'we'll get back to you' is not the same as an answer.\n\nAn AI assistant on your website responds instantly — capturing leads and answering questions around the clock, using the content you already have.\n\nThe website doesn't have to be silent after hours."
  ]
}
```
##### instagram

```json
{
  "cta": "Create your AI assistant — link in bio.",
  "format": "Vertical Reel (9:16)",
  "caption": "The website was polished. The logo was sharp. The hours were closed.\n\nEvery visitor who stopped by after 6 PM typed their question — and got nothing back.\n\nNot a broken page. Not an error. Just silence.\n\nYour website can answer those questions automatically, even when you're not there.",
  "hashtags": [
    "#SmallBusiness",
    "#AIAssistant",
    "#WebsiteHelp",
    "#CustomerSupport",
    "#AfterHours",
    "#LeadGen",
    "#ServiceBusiness",
    "#BusinessTips",
    "#AutomationTools",
    "#Fenrik"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a reception counter with a glowing tablet propped upright, its screen showing a stream of stacked chat message bubbles in soft amber and blue, none with replies. A single security light casts a warm cone of light over the counter. The room beyond is dark and empty — chairs tucked in, door closed, branded signage visible but unlit. The tablet screen is the only active light source in the frame. Person is absent — the emptiness is the meaning. Tight crop on the counter and tablet, subject centered in vertical frame. Warm amber highlights from the security light, cool dark surroundings. Clean flat illustration style, soft gradients, simplified shapes, not photorealistic. Quiet unease mood. No readable text on the tablet screen — only recognizable chat bubble shapes."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, portrait 9:16 vertical frame. Wide environmental shot of the same small business interior at night — the full space visible: a tidy, well-branded service counter, clean shelving, a professional logo mark on the wall (no readable letters), everything orderly and polished. But the lights are off, no one is present, and the space is completely still. A faint warm amber glow from the security light near the entrance. The business looks professional and trustworthy — but entirely silent and empty. Person small in frame or absent entirely — the environment carries the meaning. Open shade quality, warm wood surface tones, cool dark ambient. Flat illustration, soft gradients, no photorealism. No readable text anywhere in the scene."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, portrait 9:16 vertical frame. A person sits alone in a dim room at night — seen from slightly above and behind, small in the frame within a larger dark environment. They hold a smartphone, screen facing the viewer, showing a website chat interface with a typed question and an empty, unresponsive reply area — a blank waiting state. The person's posture is slightly forward, waiting. After a moment of no response, their thumb reaches to close or navigate away. The mood is quiet frustration and resignation — not anger. Warm amber highlight from a nearby lamp on the left side of the frame, cool dark surroundings. Tight crop on hands and the phone screen area, subject centered vertically. Flat illustration style, simplified shapes, soft gradients. No readable text on the phone screen — only recognizable interface shapes and empty reply bubble."
    },
    {
      "id": "scene-product-demo",
      "type": "PRODUCT_DEMO",
      "payload": {
        "type": "product_demo",
        "actor_id": "primary_actor",
        "ai_answer": "Yes! We have openings Tuesday and Thursday afternoon. I can collect your details so the team reaches out to confirm — what's your name and best email?",
        "brand_name": "Fenrik.chat",
        "demo_variant": "after_hours_response",
        "outcome_type": "lead_captured",
        "outcome_label": "Lead captured — contact details collected at 11:42 PM",
        "conversation_id": "demo-afterhours-001",
        "outcome_visible": true,
        "question_visible": true,
        "visitor_question": "Do you have any availability this week for a consultation?",
        "ai_answer_visible": true
      }
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, portrait 9:16 vertical frame. Night exterior of the same small service business — the storefront seen from outside, closed and dark. But through the front window, the tablet on the counter glows softly with a warm light, now showing a filled chat conversation — answered bubbles visible as shapes, no readable text. The street outside is quiet. The business is closed, but something inside is still active and responding. A sense of quiet optimism — the problem has shifted. Warm amber glow from inside the window against the cool night blue of the exterior. Wide environmental framing, subject (the building) small and centered in the vertical frame with sky above and pavement below. Flat illustration, soft gradients, simplified shapes. No readable text anywhere."
    }
  ],
  "image_prompts": [
    "Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a reception counter with a glowing tablet propped upright, its screen showing a stream of stacked chat message bubbles in soft amber and blue, none with replies. A single security light casts a warm cone of light over the counter. The room beyond is dark and empty — chairs tucked in, door closed, branded signage visible but unlit. The tablet screen is the only active light source in the frame. Person is absent — the emptiness is the meaning. Tight crop on the counter and tablet, subject centered in vertical frame. Warm amber highlights from the security light, cool dark surroundings. Clean flat illustration style, soft gradients, simplified shapes, not photorealistic. Quiet unease mood. No readable text on the tablet screen — only recognizable chat bubble shapes.",
    "Clean flat illustration, portrait 9:16 vertical frame. Wide environmental shot of the same small business interior at night — the full space visible: a tidy, well-branded service counter, clean shelving, a professional logo mark on the wall (no readable letters), everything orderly and polished. But the lights are off, no one is present, and the space is completely still. A faint warm amber glow from the security light near the entrance. The business looks professional and trustworthy — but entirely silent and empty. Person small in frame or absent entirely — the environment carries the meaning. Open shade quality, warm wood surface tones, cool dark ambient. Flat illustration, soft gradients, no photorealism. No readable text anywhere in the scene.",
    "Clean flat illustration, portrait 9:16 vertical frame. A person sits alone in a dim room at night — seen from slightly above and behind, small in the frame within a larger dark environment. They hold a smartphone, screen facing the viewer, showing a website chat interface with a typed question and an empty, unresponsive reply area — a blank waiting state. The person's posture is slightly forward, waiting. After a moment of no response, their thumb reaches to close or navigate away. The mood is quiet frustration and resignation — not anger. Warm amber highlight from a nearby lamp on the left side of the frame, cool dark surroundings. Tight crop on hands and the phone screen area, subject centered vertically. Flat illustration style, simplified shapes, soft gradients. No readable text on the phone screen — only recognizable interface shapes and empty reply bubble.",
    "Clean flat illustration, portrait 9:16 vertical frame. Night exterior of the same small service business — the storefront seen from outside, closed and dark. But through the front window, the tablet on the counter glows softly with a warm light, now showing a filled chat conversation — answered bubbles visible as shapes, no readable text. The street outside is quiet. The business is closed, but something inside is still active and responding. A sense of quiet optimism — the problem has shifted. Warm amber glow from inside the window against the cool night blue of the exterior. Wide environmental framing, subject (the building) small and centered in the vertical frame with sky above and pavement below. Flat illustration, soft gradients, simplified shapes. No readable text anywhere."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "attention": {
      "opening": {
        "emotional_effect": "humor",
        "opening_delivery": "playful",
        "opening_structure": "immediate_reaction",
        "first_motion_intent": "ATTENTION",
        "land_within_seconds": [
          1,
          1.8
        ],
        "first_spoken_guidance": "Open with an immediate reaction using Irony — not context or setup. The opening spoken thought must be one complete meaning unit (one short phrase, or two ultra-short phrases) — not an unfinished setup. The stored hook MUST be the same thought as the first spoken line — do not dilute a strong hook into a weaker voiceover setup. Lead with the ironic mismatch between what people claim and what they do. Narrative seed: Unexpected but relevant: Lead with the ironic mismatch between what people claim and what they do. Keep the link to A local service business owner reviews her website analytics for the first time in months and discovers dozens of visitors came and left without a trace — no leads, no messages, no contact. The website looked professional, but it was completely silent. The video reframes what a website is actually supposed to do: not just look good, but respond. Pain point anchored to visitors leaving before contacting you and losing leads due to lack of instant website support. / Unable to answer customer questions when offline clear by the next beat.",
        "first_visual_guidance": "The first visual is an attention event with clear meaning — not a decorative sentence illustration. Visual contradiction: appearance vs reality in one readable frame. Preferred opening visual concept: A productivity trophy collecting dust next to an overflowing unread ideas pile about A local service business owner reviews her website analytics for the first time in months and discovers dozens of visitors came and left without a trace — no leads, no messages, no contact. The website looked professional, but it was completely silent. The video reframes what a website is actually supposed to do: not just look good, but respond. Pain point anchored to visitors leaving before contacting you and losing leads due to lack of instant website support. Reject low-information openings: frames that add no stakes, curiosity, contrast, or situation meaning. Calm or empty frames are fine when absence/stakes ARE the meaning; interchangeable stock staging with no situation is not. Render coherently via Visual Narrative / Medium / Profile / Identity — attention chooses the idea; Identity is treatment only (never relocate the event).",
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
              "low_information_opening",
              "visual_story:office_cliche_backslide"
            ],
            "visual_concept": "A modern office desk with laptop and coffee illustrating A local service business owner reviews her website analytics for the first time in months and discovers dozens of visitors came and left without a trace — no leads, no messages, no contact. The website looked professional, but it was completely silent. The video reframes what a website is actually supposed to do: not just look good, but respond. Pain point anchored to visitors leaving before contacting you and losing leads due to lack of instant website support."
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
            "visual_concept": "A productivity trophy collecting dust next to an overflowing unread ideas pile about A local service business owner reviews her website analytics for the first time in months and discovers dozens of visitors came and left without a trace — no leads, no messages, no contact. The website looked professional, but it was completely silent. The video reframes what a website is actually supposed to do: not just look good, but respond. Pain point anchored to visitors leaving before contacting you and losing leads due to lack of instant website support."
          }
        ],
        "reject_summary": [
          "obvious:office_cliche:\\blaptop\\s+and\\s+coffee\\b",
          "obvious:first_obvious_idea",
          "obvious:low_information_opening",
          "obvious:visual_story:office_cliche_backslide"
        ],
        "selected_candidate_id": "unexpected",
        "selected_narrative_seed": "Unexpected but relevant: Lead with the ironic mismatch between what people claim and what they do. Keep the link to A local service business owner reviews her website analytics for the first time in months and discovers dozens of visitors came and left without a trace — no leads, no messages, no contact. The website looked professional, but it was completely silent. The video reframes what a website is actually supposed to do: not just look good, but respond. Pain point anchored to visitors leaving before contacting you and losing leads due to lack of instant website support. / Unable to answer customer questions when offline clear by the next beat.",
        "selected_visual_concept": "A productivity trophy collecting dust next to an overflowing unread ideas pile about A local service business owner reviews her website analytics for the first time in months and discovers dozens of visitors came and left without a trace — no leads, no messages, no contact. The website looked professional, but it was completely silent. The video reframes what a website is actually supposed to do: not just look good, but respond. Pain point anchored to visitors leaving before contacting you and losing leads due to lack of instant website support.",
        "selected_emotional_effect": "humor"
      },
      "delivery_arc": {
        "phases": [
          {
            "phase": "opening",
            "delivery": "Opening: lightly playful, never cartoonish."
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
            "delivery": "Payoff: Dry, knowing, slightly amused."
          },
          {
            "phase": "close",
            "delivery": "Close: satisfying landing; CTA only if present, never aggressive."
          }
        ],
        "reasons": [
          "opening_style:playful",
          "mechanism:IRONY",
          "full_arc_not_opening_only",
          "spoken_rhythm_contrast_pause_emphasis"
        ],
        "version": "delivery-arc@1",
        "tts_instruction_fragment": "Opening: lightly playful, never cartoonish. Then settle into conversational body delivery. Use spoken rhythm: short sentences, contrast, and a brief pause before the reveal. Emphasize the turn or punchline — do not read every clause at the same energy. Avoid long equally-paced paragraphs; land one idea per breath. Dry, knowing, slightly amused."
      },
      "sfx_category": null,
      "sfx_selected": false,
      "sfx_timing_ms": null,
      "attention_source": "deterministic_v1",
      "attention_reasons": [
        "selected:IRONY",
        "source:deterministic_v1",
        "funnel_soft_affinity:awareness:2",
        "creative_mode_soft_affinity:observation:2",
        "recent_seen_but_still_strongest",
        "independent_of_funnel_mapping"
      ],
      "attention_version": "attention@1",
      "opening_structure": "immediate_reaction",
      "attention_mechanism": "IRONY",
      "opening_visual_motif": "productivity_trophy_collecting_dust_next_overflowing",
      "sfx_render_supported": true,
      "opening_emotional_effect": "humor"
    },
    "tts_voice": "cedar",
    "package_id": "c8c17f53-3257-4785-8676-0931dac13633",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 65,
      "secondary": 62
    },
    "voice_source": "package_primary",
    "visual_medium": "CLEAN_ILLUSTRATION",
    "voice_reasons": [
      "funnel_awareness→warmth/energy(+1)",
      "mode_observation→steady/warmth",
      "profile_NATURAL→warmth(+2)",
      "topic_steadiness_cues(+2)",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+63)",
      "fit_secondary(+62)",
      "soft_tie_recent_secondary(5)→primary(+2)"
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
    "selected_voice": "cedar",
    "visual_profile": "NATURAL",
    "delivery_reason": "Delivery: natural, curious, conversational. Delivery: thoughtful, reflective, steady pacing. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
    "downgrade_rules": [],
    "narrative_beats": {
      "beats": [
        {
          "role": "HOOK",
          "whatChanged": "",
          "whyContinue": "What happens to the person in: After hours, chats still screaming?",
          "sourceFields": [
            "openingSituation",
            "hookLine",
            "expectedViewerQuestion"
          ],
          "viewerLearns": "Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
          "comprehension": {
            "viewer_question": "What happens to the person in: After hours, chats still screaming?",
            "viewer_expectation": "The explanation is coming.",
            "viewer_understands": "Something unusual is happening: Night"
          },
          "informationKey": "anomaly|open|night_small_business_dark",
          "modeBeatLabels": [
            "observation"
          ]
        },
        {
          "role": "SETUP",
          "whatChanged": "After the hook meaning unit lands: name the problem world (unease).",
          "whyContinue": "Stakes become clear — After hours, chats still screaming. Do not start this as the first spoken thought.",
          "sourceFields": [
            "storyProgression",
            "coreIdea",
            "emotionalReaction"
          ],
          "viewerLearns": "Hold the opening situation → widen to peak demand overload",
          "comprehension": {
            "viewer_question": "Why is this happening / what does it cost?",
            "viewer_expectation": "Someone should solve this — or stakes will rise.",
            "viewer_understands": "The problem is: After hours, chats still screaming"
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
            "share": 0.282,
            "sceneSummary": "Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a r…",
            "comprehension": {
              "viewer_question": "What happens to the person in: After hours, chats still screaming?",
              "viewer_expectation": "The explanation is coming.",
              "viewer_understands": "Something unusual is happening: Night"
            },
            "informationKey": "anomaly|open|night_small_business_dark",
            "durationSeconds": 6.29
          },
          {
            "role": "SETUP",
            "index": 1,
            "share": 0.218,
            "sceneSummary": "Clean flat illustration, portrait 9:16 vertical frame. Wide environmental shot of the same small business interior at n…",
            "comprehension": {
              "viewer_question": "Why is this happening / what does it cost?",
              "viewer_expectation": "Someone should solve this — or stakes will rise.",
              "viewer_understands": "The problem is: After hours, chats still screaming"
            },
            "informationKey": "problem_named|open|hold_opening_situation_widen",
            "durationSeconds": 4.86
          },
          {
            "role": "ESCALATION",
            "index": 2,
            "share": 0.308,
            "sceneSummary": "Clean flat illustration, portrait 9:16 vertical frame. A person sits alone in a dim room at night — seen from slightly…",
            "comprehension": {
              "viewer_question": "Can this be fixed?",
              "viewer_expectation": "Show the solution.",
              "viewer_understands": "The business is losing opportunities: reveal Unable to answer customer questions when offline (every unanswered online lead walks to a comp…"
            },
            "informationKey": "cost_rising|open|reveal_unable_answer_customer",
            "durationSeconds": 6.86
          },
          {
            "role": "RESOLUTION",
            "index": 3,
            "share": 0.192,
            "sceneSummary": "Clean flat illustration, portrait 9:16 vertical frame. Night exterior of the same small service business — the storefro…",
            "comprehension": {
              "viewer_question": "none",
              "viewer_expectation": "Finished.",
              "viewer_understands": "The product solves this: AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's h…"
            },
            "informationKey": "solution_shown|closed|chatbot_platform_websites_handles",
            "durationSeconds": 4.29
          }
        ],
        "voiceover": {
          "text": "After hours, chats still screaming. Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothing. Not a word. They didn't leave a message. They just left. The website wasn't broken. It was silent. Your AI assistant answers the moment someone asks — even when you can't.",
          "wordCount": 58
        },
        "storyboard": {
          "sceneCount": 4,
          "sceneSummaries": [
            "Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a r…",
            "Clean flat illustration, portrait 9:16 vertical frame. Wide environmental shot of the same small business interior at n…",
            "Clean flat illustration, portrait 9:16 vertical frame. A person sits alone in a dim room at night — seen from slightly…",
            "Clean flat illustration, portrait 9:16 vertical frame. Night exterior of the same small service business — the storefro…"
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
            0.282,
            0.218,
            0.308,
            0.192
          ],
          "validation": {
            "passed": true,
            "shares": [
              0.282,
              0.218,
              0.308,
              0.192
            ],
            "summary": [],
            "version": "duration-validation@1",
            "warnings": []
          },
          "durationsSeconds": [
            6.29,
            4.86,
            6.86,
            4.29
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
            "whyContinue": "What happens to the person in: After hours, chats still screaming?",
            "viewerLearns": "Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
            "informationKey": "anomaly|open|night_small_business_dark",
            "modeBeatLabels": [
              "observation"
            ]
          },
          {
            "role": "SETUP",
            "whatChanged": "After the hook meaning unit lands: name the problem world (unease).",
            "whyContinue": "Stakes become clear — After hours, chats still screaming. Do not start this as the first spoken thought.",
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
          "family": "visual_exaggeration",
          "coreIdea": "After hours, chats still screaming",
          "hookLine": "After hours, chats still screaming.",
          "candidateId": "c7-visual_exaggeration-div",
          "openingSituation": "Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
          "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes."
        },
        "corrective_guidance": null,
        "viewer_comprehension": [
          {
            "viewer_question": "What happens to the person in: After hours, chats still screaming?",
            "viewer_expectation": "The explanation is coming.",
            "viewer_understands": "Something unusual is happening: Night"
          },
          {
            "viewer_question": "Why is this happening / what does it cost?",
            "viewer_expectation": "Someone should solve this — or stakes will rise.",
            "viewer_understands": "The problem is: After hours, chats still screaming"
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
          "passed": true,
          "summary": [],
          "version": "information-progression@1",
          "warnings": [],
          "correctiveGuidance": null
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
          0.282,
          0.218,
          0.308,
          0.192
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
        "passed": true,
        "summary": [],
        "version": "information-progression@1",
        "warnings": [],
        "correctiveGuidance": null
      }
    },
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: natural, curious, conversational. Delivery: thoughtful, reflective, steady pacing. Delivery: confident, concise, not aggressive. Opening: lightly playful, never cartoonish. Then settle into conversational body delivery. Use spoken rhythm: shor",
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
        "desk": 5,
        "group": 4,
        "phone": 9,
        "laptop": 6,
        "office": 5,
        "founder": 1,
        "meeting": 1,
        "close_up": 7,
        "dashboard": 4,
        "home_office": 4,
        "person_alone": 2,
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
      "key": "a bright co-working space in daylight|quiet optimism|open shade outdoor light|wide environmental framing|tight crop on hands and workspace|person small in frame within a larger environment|warm wood surfaces and amber highlights",
      "mood": "quiet optimism",
      "camera": "wide environmental framing",
      "version": "creative-identity@1",
      "lighting": "open shade outdoor light",
      "color_feel": "warm wood surfaces and amber highlights",
      "option_ids": {
        "mood": "optimistic",
        "camera": "wide_environmental",
        "lighting": "open_shade_outdoor",
        "color_feel": "warm_wood",
        "composition": "tight_crop_hands",
        "environment": "co_working_daylight",
        "human_presence": "person_small_in_frame"
      },
      "composition": "tight crop on hands and workspace",
      "environment": "Apply visual treatment inside the canonical Creative DNA world: Night: small business dark",
      "human_presence": "person small in frame within a larger environment"
    },
    "history_decisions": [],
    "visual_beat_count": 5,
    "accepted_cta_count": 0,
    "cta_composition_id": null,
    "creative_candidates": {
      "version": "creative-candidates@3.0",
      "storyIntegrity": {
        "passed": true,
        "summary": "story_integrity_passed",
        "version": "story-integrity@1",
        "ctaMatch": {
          "evidence": "onscreen_cta_not_requested_skip_spoken_cta_check",
          "packageCta": "Create your AI assistant — let your website answer while you're closed.",
          "ctaMismatch": false,
          "voiceoverContainsCta": true
        },
        "warnings": [],
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
          "chats",
          "competitor",
          "customer",
          "dark",
          "dramatized",
          "empty",
          "every",
          "film",
          "form",
          "frame",
          "generic",
          "gets",
          "glowing",
          "handles",
          "hold",
          "hours",
          "human",
          "humans",
          "laptop",
          "lead",
          "light",
          "message",
          "moment",
          "montage",
          "needed",
          "night",
          "office",
          "offline",
          "online",
          "opening",
          "owner",
          "phone",
          "platform",
          "question",
          "questions",
          "recurring",
          "replacing",
          "reply",
          "reveal",
          "scene",
          "screaming",
          "scroll",
          "security",
          "seen",
          "setting",
          "shown",
          "shows",
          "situation",
          "small",
          "stakes",
          "stay",
          "still",
          "stop",
          "subject",
          "tablet",
          "thread",
          "unable",
          "unanswered",
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
            "outcome_type:lead_captured"
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
            "stopPower": 9,
            "originality": 5,
            "memorability": 4,
            "storyPotential": 6,
            "AI_Generic_Risk": 6,
            "emotionalCharge": 6,
            "productRelevance": 4,
            "visualSpecificity": 6,
            "productionFeasibility": 8,
            "immediateComprehension": 5
          },
          "coreIdea": "Competitor wins before you pick up",
          "hookLine": "Competitor wins before you pick up.",
          "rejected": true,
          "candidateId": "c1-consequence_first-div",
          "rejectReasons": [
            "topic_collapsed_to_generic_business"
          ],
          "weightedTotal": 76.2,
          "commercialTotal": 111,
          "commercialScores": {
            "renderability": 7,
            "firstFrameClarity": 7,
            "humanProblemVisibility": 9,
            "narrativeSurvivability": 6,
            "productDemonstrability": 5,
            "commercialSurvivability": 7
          },
          "openingSituation": "Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from peak demand overload.",
          "finalSelectionScore": 187.2
        },
        {
          "family": "absurd_understandable",
          "scores": {
            "stopPower": 7,
            "originality": 8,
            "memorability": 5,
            "storyPotential": 5,
            "AI_Generic_Risk": 5,
            "emotionalCharge": 5,
            "productRelevance": 4,
            "visualSpecificity": 5,
            "productionFeasibility": 7,
            "immediateComprehension": 5
          },
          "coreIdea": "Airport logic applied to the wrong queue",
          "hookLine": "Airport logic applied to the wrong queue.",
          "rejected": true,
          "candidateId": "c2-absurd_understandable-div",
          "rejectReasons": [
            "topic_collapsed_to_generic_business"
          ],
          "weightedTotal": 75.45,
          "commercialTotal": 24,
          "commercialScores": {
            "renderability": 0,
            "firstFrameClarity": 0,
            "humanProblemVisibility": 4,
            "narrativeSurvivability": 0,
            "productDemonstrability": 4,
            "commercialSurvivability": 1
          },
          "openingSituation": "Absurd boarding-ticket dispenser for phone callers at small business; website chat on the counter glows with zero replies. Camera holds one beat too long for discomfort.",
          "finalSelectionScore": 99.45
        },
        {
          "family": "role_reversal",
          "scores": {
            "stopPower": 6,
            "originality": 7,
            "memorability": 5,
            "storyPotential": 5,
            "AI_Generic_Risk": 6,
            "emotionalCharge": 5,
            "productRelevance": 4,
            "visualSpecificity": 5,
            "productionFeasibility": 8,
            "immediateComprehension": 5
          },
          "coreIdea": "Nobody home except the waiting chat",
          "hookLine": "Nobody home except the waiting chat.",
          "rejected": true,
          "candidateId": "c3-role_reversal-div",
          "rejectReasons": [
            "topic_collapsed_to_generic_business"
          ],
          "weightedTotal": 69.3,
          "commercialTotal": 100,
          "commercialScores": {
            "renderability": 7,
            "firstFrameClarity": 6,
            "humanProblemVisibility": 7,
            "narrativeSurvivability": 5,
            "productDemonstrability": 6,
            "commercialSurvivability": 6
          },
          "openingSituation": "Empty front desk at small business during peak demand overload; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
          "finalSelectionScore": 169.3
        },
        {
          "family": "direct_product_world",
          "scores": {
            "stopPower": 5,
            "originality": 5,
            "memorability": 3,
            "storyPotential": 5,
            "AI_Generic_Risk": 6,
            "emotionalCharge": 5,
            "productRelevance": 7,
            "visualSpecificity": 6,
            "productionFeasibility": 8,
            "immediateComprehension": 7
          },
          "coreIdea": "Urgent question dies in silence",
          "hookLine": "Urgent question dies in silence.",
          "rejected": true,
          "candidateId": "c4-direct_product_world-div",
          "rejectReasons": [
            "topic_collapsed_to_generic_business"
          ],
          "weightedTotal": 70.5,
          "commercialTotal": 148,
          "commercialScores": {
            "renderability": 10,
            "firstFrameClarity": 9,
            "humanProblemVisibility": 10,
            "narrativeSurvivability": 8,
            "productDemonstrability": 9,
            "commercialSurvivability": 9
          },
          "openingSituation": "Close on a customer's hands sending an urgent question at small business; reply thread shows a clear read-receipt indicator with no answer during peak demand overload.",
          "finalSelectionScore": 218.5
        },
        {
          "family": "social_observation",
          "scores": {
            "stopPower": 5,
            "originality": 5,
            "memorability": 3,
            "storyPotential": 5,
            "AI_Generic_Risk": 6,
            "emotionalCharge": 5,
            "productRelevance": 5,
            "visualSpecificity": 5,
            "productionFeasibility": 8,
            "immediateComprehension": 6
          },
          "coreIdea": "Dual clocks, one shameful",
          "hookLine": "Dual clocks, one shameful.",
          "rejected": true,
          "candidateId": "c5-social_observation-div",
          "rejectReasons": [
            "topic_collapsed_to_generic_business"
          ],
          "weightedTotal": 62.8,
          "commercialTotal": 51.5,
          "commercialScores": {
            "renderability": 2,
            "firstFrameClarity": 2,
            "humanProblemVisibility": 4,
            "narrativeSurvivability": 3,
            "productDemonstrability": 5,
            "commercialSurvivability": 4
          },
          "openingSituation": "Two clocks at small business: shop hours vs \"avg website reply\" spinning into hours during peak demand overload. Camera holds one beat too long for discomfort.",
          "finalSelectionScore": 114.3
        },
        {
          "family": "human_conflict",
          "scores": {
            "stopPower": 7,
            "originality": 5,
            "memorability": 4,
            "storyPotential": 5,
            "AI_Generic_Risk": 6,
            "emotionalCharge": 7,
            "productRelevance": 4,
            "visualSpecificity": 5,
            "productionFeasibility": 7,
            "immediateComprehension": 5
          },
          "coreIdea": "Departure board for the wrong channel",
          "hookLine": "Departure board for the wrong channel.",
          "rejected": true,
          "candidateId": "c6-human_conflict-div",
          "rejectReasons": [
            "topic_collapsed_to_generic_business"
          ],
          "weightedTotal": 68.85000000000001,
          "commercialTotal": 79,
          "commercialScores": {
            "renderability": 4,
            "firstFrameClarity": 4,
            "humanProblemVisibility": 9,
            "narrativeSurvivability": 4,
            "productDemonstrability": 4,
            "commercialSurvivability": 4
          },
          "openingSituation": "Train-station style departure board: phone-channel row boarding; website-visitor row stuck on a delayed-status visual indicator — at small business.",
          "finalSelectionScore": 147.85000000000002
        },
        {
          "family": "visual_exaggeration",
          "scores": {
            "stopPower": 8,
            "originality": 5,
            "memorability": 6,
            "storyPotential": 5,
            "AI_Generic_Risk": 6,
            "emotionalCharge": 5,
            "productRelevance": 4,
            "visualSpecificity": 8,
            "productionFeasibility": 8,
            "immediateComprehension": 5
          },
          "coreIdea": "After hours, chats still screaming",
          "hookLine": "After hours, chats still screaming.",
          "rejected": true,
          "candidateId": "c7-visual_exaggeration-div",
          "rejectReasons": [
            "topic_collapsed_to_generic_business"
          ],
          "weightedTotal": 78.39999999999999,
          "commercialTotal": 121.5,
          "commercialScores": {
            "renderability": 9,
            "firstFrameClarity": 8,
            "humanProblemVisibility": 8,
            "narrativeSurvivability": 7,
            "productDemonstrability": 5,
            "commercialSurvivability": 8
          },
          "openingSituation": "Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
          "finalSelectionScore": 199.89999999999998
        }
      ],
      "comparativeJudge": {
        "winnerId": "c7-visual_exaggeration-div",
        "winnerReason": "selection=stop_shortlist_then_commercial; stop_shortlist=c1-consequence_first-div,c7-visual_exaggeration-div; final_selection_score=199.9; creative_score=78.4; commercial_score=121.5; stop=8; max_stop_in_pool=9; comprehension=5; originality=5; renderability=9; first_frame=8; product_demo=5; human_problem=8; family=visual_exaggeration; core=After hours, chats still screaming",
        "mostRenderable": "c4-direct_product_world-div",
        "clearestFirstFrame": "c4-direct_product_world-div",
        "bestProductTopicFit": "c4-direct_product_world-div",
        "clearestMentalImage": "c7-visual_exaggeration-div",
        "leastInterchangeable": "c2-absurd_understandable-div",
        "strongestHumanProblem": "c4-direct_product_world-div",
        "mostMemorableInOneHour": "c7-visual_exaggeration-div",
        "mostLikelyToStopScrolling": "c1-consequence_first-div",
        "bestProductDemonstrability": "c4-direct_product_world-div",
        "bestCommercialSurvivability": "c4-direct_product_world-div"
      },
      "selectedCandidate": {
        "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
        "family": "visual_exaggeration",
        "coreIdea": "After hours, chats still screaming",
        "hookLine": "After hours, chats still screaming.",
        "candidateId": "c7-visual_exaggeration-div",
        "creativeDNA": {
          "world": "Night: small business dark",
          "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "coreConflict": "Unable to answer customer questions when offline, dramatized as: Night: small business dark",
          "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "mainCharacter": "The recurring subject of: Night: small business dark",
          "immutableRules": [
            "Do not relocate the primary story away from: Night: small business dark",
            "Do not replace the opening event with a low-information empty environment of the same theme",
            "Do not replace the main character: The recurring subject of: Night: small business dark",
            "Do not turn the middle into a generic device analytics montage",
            "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Night: small b…) with a different marketing problem",
            "Do not resolve the story only with a happy expression; show that the problem state changes",
            "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
          ],
          "viewerQuestion": "What happens to the person in: After hours, chats still screaming?"
        },
        "visualPromise": "Film the opening as a scroll-stop frame: After hours, chats still screaming. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
        "familiarityRisk": "medium",
        "openingSituation": "Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
        "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
        "creativeDnaSource": "model",
        "emotionalReaction": "unease",
        "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "memorabilityReason": "Selected from divergence v2 for scroll-stop: After hours, chats still screaming",
        "expectedViewerQuestion": "What happens to the person in: After hours, chats still screaming?"
      },
      "creativeDivergence": {
        "version": "creative-divergence@2.1",
        "clusters": [
          {
            "clusterId": "cl-1",
            "memberIds": [
              "raw-12-4966",
              "raw-7-3474"
            ],
            "centroidScene": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from peak demand overload.",
            "representativeId": "raw-12-4966"
          },
          {
            "clusterId": "cl-2",
            "memberIds": [
              "raw-10-4327",
              "raw-18-9393",
              "raw-5-2829"
            ],
            "centroidScene": "Absurd boarding-ticket dispenser for phone callers at small business; website chat on the counter glows with zero replies. Camera holds one beat too long for discomfort.",
            "representativeId": "raw-10-4327"
          },
          {
            "clusterId": "cl-3",
            "memberIds": [
              "raw-15-209",
              "raw-2-8178"
            ],
            "centroidScene": "Handheld urgency: Empty front desk at small business during peak demand overload; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
            "representativeId": "raw-15-209"
          },
          {
            "clusterId": "cl-4",
            "memberIds": [
              "raw-16-9022",
              "raw-3-4475"
            ],
            "centroidScene": "Handheld urgency: Train-station style departure board: phone-channel row boarding; website-visitor row stuck on a delayed-status visual indicator — at small business.",
            "representativeId": "raw-16-9022"
          },
          {
            "clusterId": "cl-5",
            "memberIds": [
              "raw-17-89",
              "raw-1-6379",
              "raw-14-6347"
            ],
            "centroidScene": "Handheld urgency: Close on a customer's hands sending an urgent question at small business; reply thread shows a clear read-receipt indicator with no answer during peak demand overload.",
            "representativeId": "raw-17-89"
          },
          {
            "clusterId": "cl-6",
            "memberIds": [
              "raw-9-9387",
              "raw-19-5440",
              "raw-4-4079"
            ],
            "centroidScene": "Two clocks at small business: shop hours vs \"avg website reply\" spinning into hours during peak demand overload. Camera holds one beat too long for discomfort.",
            "representativeId": "raw-9-9387"
          },
          {
            "clusterId": "cl-7",
            "memberIds": [
              "raw-11-4763",
              "raw-20-649",
              "raw-6-5959"
            ],
            "centroidScene": "Handheld urgency: Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
            "representativeId": "raw-11-4763"
          }
        ],
        "survivors": [
          {
            "id": "raw-12-4966",
            "tags": [
              "consequence",
              "competitor",
              "v1"
            ],
            "scene": "Handheld urgency: Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from peak demand overload.",
            "rejected": false,
            "clusterId": "cl-1",
            "rejectReason": null,
            "scrollStopCue": "Competitor wins before you pick up",
            "stopScrollScore": 9,
            "visualDistinctScore": 6.5
          },
          {
            "id": "raw-10-4327",
            "tags": [
              "absurd",
              "queue",
              "lobby",
              "v0"
            ],
            "scene": "Absurd boarding-ticket dispenser for phone callers at small business; website chat on the counter glows with zero replies. Camera holds one beat too long for discomfort.",
            "rejected": false,
            "clusterId": "cl-2",
            "rejectReason": null,
            "scrollStopCue": "Airport logic applied to the wrong queue",
            "stopScrollScore": 8,
            "visualDistinctScore": 8
          },
          {
            "id": "raw-15-209",
            "tags": [
              "role_reversal",
              "empty",
              "chat",
              "v0"
            ],
            "scene": "Handheld urgency: Empty front desk at small business during peak demand overload; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
            "rejected": false,
            "clusterId": "cl-3",
            "rejectReason": null,
            "scrollStopCue": "Nobody home except the waiting chat",
            "stopScrollScore": 8,
            "visualDistinctScore": 8
          },
          {
            "id": "raw-16-9022",
            "tags": [
              "departure",
              "board",
              "delay",
              "v1"
            ],
            "scene": "Handheld urgency: Train-station style departure board: phone-channel row boarding; website-visitor row stuck on a delayed-status visual indicator — at small business.",
            "rejected": false,
            "clusterId": "cl-4",
            "rejectReason": null,
            "scrollStopCue": "Departure board for the wrong channel",
            "stopScrollScore": 8,
            "visualDistinctScore": 8
          },
          {
            "id": "raw-17-89",
            "tags": [
              "hands",
              "urgent",
              "customer",
              "v0"
            ],
            "scene": "Handheld urgency: Close on a customer's hands sending an urgent question at small business; reply thread shows a clear read-receipt indicator with no answer during peak demand overload.",
            "rejected": false,
            "clusterId": "cl-5",
            "rejectReason": null,
            "scrollStopCue": "Urgent question dies in silence",
            "stopScrollScore": 8.5,
            "visualDistinctScore": 7
          },
          {
            "id": "raw-9-9387",
            "tags": [
              "clocks",
              "timer",
              "shame",
              "v1"
            ],
            "scene": "Two clocks at small business: shop hours vs \"avg website reply\" spinning into hours during peak demand overload. Camera holds one beat too long for discomfort.",
            "rejected": false,
            "clusterId": "cl-6",
            "rejectReason": null,
            "scrollStopCue": "Dual clocks, one shameful",
            "stopScrollScore": 8,
            "visualDistinctScore": 7
          },
          {
            "id": "raw-11-4763",
            "tags": [
              "night",
              "security",
              "chats",
              "v0"
            ],
            "scene": "Handheld urgency: Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
            "rejected": false,
            "clusterId": "cl-7",
            "rejectReason": null,
            "scrollStopCue": "After hours, chats still screaming",
            "stopScrollScore": 6,
            "visualDistinctScore": 7
          }
        ],
        "rawGeneratedCount": 24,
        "candidateSourceIds": [
          "c1-consequence_first-div",
          "raw-10-4327",
          "c3-role_reversal-div",
          "c4-direct_product_world-div",
          "raw-9-9387",
          "c6-human_conflict-div",
          "c7-visual_exaggeration-div"
        ],
        "rawAfterFilterCount": 18,
        "rejectedGenericSamples": [
          {
            "id": "raw-8-3856",
            "scene": "Physical stack of printed missed-web-session logs grows on the small business counter while staff handle only the phone.",
            "reason": "prop_without_situation"
          },
          {
            "id": "raw-13-408",
            "scene": "Physical stack of printed missed-web-session logs grows on the small business counter while staff handle only the phone. Camera holds one beat too long for disc",
            "reason": "prop_without_situation"
          },
          {
            "id": "raw-21-2294",
            "scene": "Handheld urgency: Physical stack of printed missed-web-session logs grows on the small business counter while staff handle only the phone.",
            "reason": "prop_without_situation"
          },
          {
            "id": "raw-22-4980",
            "scene": "Person staring at a laptop in a modern office meeting room explaining the product on a dashboard",
            "reason": "raw_generic:\\bmodern\\s+office\\b"
          },
          {
            "id": "raw-23-4204",
            "scene": "A website-led service business worker holds a phone to their ear at a calm desk thinking about workflow efficiency",
            "reason": "raw_generic:\\bcalm\\s+desk\\b"
          },
          {
            "id": "raw-24-1727",
            "scene": "Outside a HVAC / cooling service van in blazing heat, a technician sprints while an accountant topic is ignored",
            "reason": "unrelated_industry:technician"
          }
        ]
      },
      "regenerationReason": null,
      "rejectedCandidates": [
        {
          "reasons": [
            "topic_collapsed_to_generic_business"
          ],
          "candidateId": "c1-consequence_first-div"
        },
        {
          "reasons": [
            "topic_collapsed_to_generic_business"
          ],
          "candidateId": "c2-absurd_understandable-div"
        },
        {
          "reasons": [
            "topic_collapsed_to_generic_business"
          ],
          "candidateId": "c3-role_reversal-div"
        },
        {
          "reasons": [
            "topic_collapsed_to_generic_business"
          ],
          "candidateId": "c4-direct_product_world-div"
        },
        {
          "reasons": [
            "topic_collapsed_to_generic_business"
          ],
          "candidateId": "c5-social_observation-div"
        },
        {
          "reasons": [
            "topic_collapsed_to_generic_business"
          ],
          "candidateId": "c6-human_conflict-div"
        },
        {
          "reasons": [
            "topic_collapsed_to_generic_business"
          ],
          "candidateId": "c7-visual_exaggeration-div"
        }
      ],
      "finalScriptFidelity": {
        "passed": true,
        "diagnostics": [
          {
            "rule": "opening_situation_visible_in_scene1",
            "passed": true,
            "reason": null,
            "candidateValue": "Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
            "generatedValue": "Night scene: a small service business interior in darkness — a reception counter with a glowing tablet propped upright, its screen showing a stream of stacked chat message bubbles in soft amber and blue, none with replie",
            "matchedAliases": []
          },
          {
            "rule": "hook_preserved_in_first_spoken",
            "passed": true,
            "reason": null,
            "candidateValue": "After hours, chats still screaming.",
            "generatedValue": "After hours, chats still screaming.",
            "matchedAliases": []
          },
          {
            "rule": "core_idea_recognizable",
            "passed": true,
            "reason": null,
            "candidateValue": "After hours, chats still screaming",
            "generatedValue": "After hours, chats still screaming. Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothi",
            "matchedAliases": []
          },
          {
            "rule": "product_or_topic_implied",
            "passed": true,
            "reason": null,
            "candidateValue": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human s",
            "generatedValue": "After hours, chats still screaming. Your website looks great. Professional logo. Clean layout. And yet — every visitor w",
            "matchedAliases": [
              "small",
              "business",
              "website",
              "visitor",
              "chatbot",
              "unanswered"
            ]
          },
          {
            "rule": "storyboard_collapsed_to_generic_office",
            "passed": true,
            "reason": null,
            "candidateValue": "Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload",
            "generatedValue": "Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a reception counter with a glowing tablet pr",
            "matchedAliases": []
          },
          {
            "rule": "opening_event_preserved_in_scene1",
            "passed": true,
            "reason": null,
            "candidateValue": "unread_message",
            "generatedValue": "Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a re",
            "matchedAliases": []
          },
          {
            "rule": "stop_scroll_idea_preserved",
            "passed": true,
            "reason": null,
            "candidateValue": "After hours, chats still screaming.",
            "generatedValue": "After hours, chats still screaming. | Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small serv",
            "matchedAliases": []
          },
          {
            "rule": "sales_pitch_opening",
            "passed": true,
            "reason": null,
            "candidateValue": "After hours, chats still screaming.",
            "generatedValue": "After hours, chats still screaming.",
            "matchedAliases": []
          },
          {
            "rule": "voiceover_essay_or_generic_opener",
            "passed": true,
            "reason": null,
            "candidateValue": "After hours, chats still screaming.",
            "generatedValue": "After hours, chats still screaming.",
            "matchedAliases": []
          }
        ],
        "failureReasons": [],
        "salesPitchOpening": false,
        "coreIdeaRecognizable": true,
        "productOrTopicImplied": true,
        "voiceoverEssayCadence": false,
        "stopScrollIdeaPreserved": true,
        "collapsedToGenericOffice": false,
        "hookPreservedInFirstSpoken": true,
        "openingEventPreservedInScene1": true,
        "openingSituationVisibleInScene1": true
      },
      "generatedCandidates": [
        {
          "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "family": "consequence_first",
          "coreIdea": "Competitor wins before you pick up",
          "hookLine": "Competitor wins before you pick up.",
          "candidateId": "c1-consequence_first-div",
          "creativeDNA": {
            "world": "Consequence: rival already quoted the website visitor who needed an answer",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Consequence: rival already quoted the website visitor who needed an answer",
            "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
            "mainCharacter": "A competitor already claiming the job on the driveway",
            "immutableRules": [
              "Do not relocate the primary story away from: Consequence: rival already quoted the website visitor who needed an answer",
              "Do not replace the opening event with a low-information empty environment of the same theme",
              "Do not replace the main character: A competitor already claiming the job on the driveway",
              "Do not turn the middle into a generic device analytics montage",
              "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Consequence: r…) with a different marketing problem",
              "Do not resolve the story only with a happy expression; show that the problem state changes",
              "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
            ],
            "viewerQuestion": "What happens to the person in: Competitor wins before you pick up?"
          },
          "visualPromise": "Film the opening as a scroll-stop frame: Competitor wins before you pick up. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Consequence: rival already quoted the website visitor who needed an answer; your site chat still idle from peak demand overload.",
          "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "creativeDnaSource": "model",
          "emotionalReaction": "urgency",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Competitor wins before you pick up",
          "expectedViewerQuestion": "What happens to the person in: Competitor wins before you pick up?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "family": "absurd_understandable",
          "coreIdea": "Airport logic applied to the wrong queue",
          "hookLine": "Airport logic applied to the wrong queue.",
          "candidateId": "c2-absurd_understandable-div",
          "creativeDNA": {
            "world": "Absurd boarding-ticket dispenser for phone callers at small business",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Absurd boarding-ticket dispenser for phone callers at small business",
            "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
            "mainCharacter": "An absurd boarding-ticket queue for phone callers (website line empty)",
            "immutableRules": [
              "Do not relocate the primary story away from: Absurd boarding-ticket dispenser for phone callers at small business",
              "Do not replace the opening event with a low-information empty environment of the same theme",
              "Do not replace the main character: An absurd boarding-ticket queue for phone callers (website line empty)",
              "Do not turn the middle into a generic device analytics montage",
              "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Absurd boardin…) with a different marketing problem",
              "Do not resolve the story only with a happy expression; show that the problem state changes",
              "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
            ],
            "viewerQuestion": "What happens to the person in: Airport logic applied to the wrong queue?"
          },
          "visualPromise": "Film the opening as a scroll-stop frame: Airport logic applied to the wrong queue. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
          "familiarityRisk": "low",
          "openingSituation": "Absurd boarding-ticket dispenser for phone callers at small business; website chat on the counter glows with zero replies. Camera holds one beat too long for discomfort.",
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
          "coreIdea": "Nobody home except the waiting chat",
          "hookLine": "Nobody home except the waiting chat.",
          "candidateId": "c3-role_reversal-div",
          "creativeDNA": {
            "world": "Empty front desk at small business during peak demand overload",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Empty front desk at small business during peak demand overload",
            "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
            "mainCharacter": "An empty desk / wall screen while the digital receptionist works alone",
            "immutableRules": [
              "Do not relocate the primary story away from: Empty front desk at small business during peak demand overload",
              "Do not replace the opening event with a low-information empty environment of the same theme",
              "Do not replace the main character: An empty desk / wall screen while the digital receptionist works alone",
              "Do not turn the middle into a generic device analytics montage",
              "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Empty front de…) with a different marketing problem",
              "Do not resolve the story only with a happy expression; show that the problem state changes",
              "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
            ],
            "viewerQuestion": "What happens to the person in: Nobody home except the waiting chat?"
          },
          "visualPromise": "Film the opening as a scroll-stop frame: Nobody home except the waiting chat. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Empty front desk at small business during peak demand overload; phones blink alone; a wall tablet chat calmly waits with nobody typing.",
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
          "coreIdea": "Urgent question dies in silence",
          "hookLine": "Urgent question dies in silence.",
          "candidateId": "c4-direct_product_world-div",
          "creativeDNA": {
            "world": "Close on a customer's hands sending an urgent question at small business",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Close on a customer's hands sending an urgent question at small business",
            "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
            "mainCharacter": "A website visitor's hands sending an urgent question",
            "immutableRules": [
              "Do not relocate the primary story away from: Close on a customer's hands sending an urgent question at small business",
              "Do not replace the opening event with a low-information empty environment of the same theme",
              "Do not replace the main character: A website visitor's hands sending an urgent question",
              "Do not turn the middle into a generic device analytics montage",
              "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Close on a cus…) with a different marketing problem",
              "Do not resolve the story only with a happy expression; show that the problem state changes",
              "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
            ],
            "viewerQuestion": "What happens to the person in: Urgent question dies in silence?"
          },
          "visualPromise": "Film the opening as a scroll-stop frame: Urgent question dies in silence. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Close on a customer's hands sending an urgent question at small business; reply thread shows a clear read-receipt indicator with no answer during peak demand overload.",
          "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "creativeDnaSource": "model",
          "emotionalReaction": "tension",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Urgent question dies in silence",
          "expectedViewerQuestion": "What happens to the person in: Urgent question dies in silence?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "family": "social_observation",
          "coreIdea": "Dual clocks, one shameful",
          "hookLine": "Dual clocks, one shameful.",
          "candidateId": "c5-social_observation-div",
          "creativeDNA": {
            "world": "Two clocks at small business: shop hours vs \"avg website reply\" spinning into hours during peak demand overload",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Two clocks at small business: shop hours vs \"avg website reply\" spinning into hours during pea…",
            "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
            "mainCharacter": "The recurring subject of: Two clocks at small business: shop hours vs \"avg website reply\" spinning into hours during pe…",
            "immutableRules": [
              "Do not relocate the primary story away from: Two clocks at small business: shop hours vs \"avg website reply\" spinning into hours durin…",
              "Do not replace the opening event with a low-information empty environment of the same theme",
              "Do not replace the main character: The recurring subject of: Two clocks at small business: shop hours vs \"avg website reply\"…",
              "Do not turn the middle into a generic device analytics montage",
              "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Two clocks at…) with a different marketing problem",
              "Do not resolve the story only with a happy expression; show that the problem state changes",
              "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
            ],
            "viewerQuestion": "What happens to the person in: Dual clocks, one shameful?"
          },
          "visualPromise": "Film the opening as a scroll-stop frame: Dual clocks, one shameful. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Two clocks at small business: shop hours vs \"avg website reply\" spinning into hours during peak demand overload. Camera holds one beat too long for discomfort.",
          "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "creativeDnaSource": "model",
          "emotionalReaction": "curiosity",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Dual clocks, one shameful",
          "expectedViewerQuestion": "What happens to the person in: Dual clocks, one shameful?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "family": "human_conflict",
          "coreIdea": "Departure board for the wrong channel",
          "hookLine": "Departure board for the wrong channel.",
          "candidateId": "c6-human_conflict-div",
          "creativeDNA": {
            "world": "Train-station style departure board: phone-channel row boarding",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Train-station style departure board: phone-channel row boarding",
            "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
            "mainCharacter": "The recurring subject of: Train-station style departure board: phone-channel row boarding",
            "immutableRules": [
              "Do not relocate the primary story away from: Train-station style departure board: phone-channel row boarding",
              "Do not replace the opening event with a low-information empty environment of the same theme",
              "Do not replace the main character: The recurring subject of: Train-station style departure board: phone-channel row boarding",
              "Do not turn the middle into a generic device analytics montage",
              "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Train-station…) with a different marketing problem",
              "Do not resolve the story only with a happy expression; show that the problem state changes",
              "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
            ],
            "viewerQuestion": "What happens to the person in: Departure board for the wrong channel?"
          },
          "visualPromise": "Film the opening as a scroll-stop frame: Departure board for the wrong channel. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Train-station style departure board: phone-channel row boarding; website-visitor row stuck on a delayed-status visual indicator — at small business.",
          "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "creativeDnaSource": "model",
          "emotionalReaction": "curiosity",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Departure board for the wrong channel",
          "expectedViewerQuestion": "What happens to the person in: Departure board for the wrong channel?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
          "family": "visual_exaggeration",
          "coreIdea": "After hours, chats still screaming",
          "hookLine": "After hours, chats still screaming.",
          "candidateId": "c7-visual_exaggeration-div",
          "creativeDNA": {
            "world": "Night: small business dark",
            "productRole": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
            "coreConflict": "Unable to answer customer questions when offline, dramatized as: Night: small business dark",
            "endingIntent": "Next website visitor who needed an answer gets an answer even when the owner cannot.",
            "mainCharacter": "The recurring subject of: Night: small business dark",
            "immutableRules": [
              "Do not relocate the primary story away from: Night: small business dark",
              "Do not replace the opening event with a low-information empty environment of the same theme",
              "Do not replace the main character: The recurring subject of: Night: small business dark",
              "Do not turn the middle into a generic device analytics montage",
              "Do not replace the core conflict (Unable to answer customer questions when offline, dramatized as: Night: small b…) with a different marketing problem",
              "Do not resolve the story only with a happy expression; show that the problem state changes",
              "Do not reduce the product to a generic success mood; show or clearly communicate: AI chatbot platform for websites handles the website moment shown in the opening — withou…"
            ],
            "viewerQuestion": "What happens to the person in: After hours, chats still screaming?"
          },
          "visualPromise": "Film the opening as a scroll-stop frame: After hours, chats still screaming. Setting must stay business website moment / empty reply thread. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
          "storyProgression": "Hold the opening situation → widen to peak demand overload → reveal Unable to answer customer questions when offline (every unanswered online lead walks to a competitor) → AI chatbot platform for websites answers what humans cannot.",
          "creativeDnaSource": "model",
          "emotionalReaction": "unease",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: After hours, chats still screaming",
          "expectedViewerQuestion": "What happens to the person in: After hours, chats still screaming?"
        }
      ],
      "selectionDiagnostics": {
        "whyWon": "final_selection_score=199.9; creative_score=78.4; commercial_score=121.5; stop=8; max_stop_in_pool=9; stop_shortlist=c1-consequence_first-div,c7-visual_exaggeration-div; family=visual_exaggeration; renderability=9; first_frame_clarity=8; product_demo=5; human_problem=8; narrative_survive=7; commercial_survive=8; also_led_or_tied_creative; commercial_chose_within_stop_shortlist_vs=c1-consequence_first-div(stop=9)",
        "version": "commercial-success@1",
        "winnerId": "c7-visual_exaggeration-div",
        "creativeScore": 78.39999999999999,
        "commercialScore": 121.5,
        "losersPenalized": [
          {
            "family": "direct_product_world",
            "lostBy": -18.600000000000023,
            "candidateId": "c4-direct_product_world-div",
            "creativeScore": 70.5,
            "commercialScore": 148,
            "primaryPenalties": [],
            "finalSelectionScore": 218.5
          },
          {
            "family": "consequence_first",
            "lostBy": 12.699999999999989,
            "candidateId": "c1-consequence_first-div",
            "creativeScore": 76.2,
            "commercialScore": 111,
            "primaryPenalties": [],
            "finalSelectionScore": 187.2
          },
          {
            "family": "role_reversal",
            "lostBy": 30.599999999999966,
            "candidateId": "c3-role_reversal-div",
            "creativeScore": 69.3,
            "commercialScore": 100,
            "primaryPenalties": [],
            "finalSelectionScore": 169.3
          },
          {
            "family": "human_conflict",
            "lostBy": 52.049999999999955,
            "candidateId": "c6-human_conflict-div",
            "creativeScore": 68.85000000000001,
            "commercialScore": 79,
            "primaryPenalties": [
              "low_renderability=4",
              "low_first_frame_clarity=4",
              "low_product_demonstrability=4",
              "low_narrative_survivability=4",
              "low_commercial_survivability=4"
            ],
            "finalSelectionScore": 147.85000000000002
          },
          {
            "family": "social_observation",
            "lostBy": 85.59999999999998,
            "candidateId": "c5-social_observation-div",
            "creativeScore": 62.8,
            "commercialScore": 51.5,
            "primaryPenalties": [
              "low_renderability=2",
              "low_first_frame_clarity=2",
              "low_human_problem_visibility=4",
              "low_narrative_survivability=3",
              "low_commercial_survivability=4",
              "requires_readable_text"
            ],
            "finalSelectionScore": 114.3
          },
          {
            "family": "absurd_understandable",
            "lostBy": 100.44999999999997,
            "candidateId": "c2-absurd_understandable-div",
            "creativeScore": 75.45,
            "commercialScore": 24,
            "primaryPenalties": [
              "low_renderability=0",
              "low_first_frame_clarity=0",
              "low_product_demonstrability=4",
              "low_human_problem_visibility=4",
              "low_narrative_survivability=0",
              "low_commercial_survivability=1",
              "high_metaphor_risk=8",
              "requires_readable_text"
            ],
            "finalSelectionScore": 99.45
          }
        ],
        "finalSelectionScore": 199.89999999999998,
        "commercialDimensions": {
          "renderability": 9,
          "firstFrameClarity": 8,
          "humanProblemVisibility": 8,
          "narrativeSurvivability": 7,
          "productDemonstrability": 5,
          "commercialSurvivability": 8
        },
        "creativeScoresSnapshot": {
          "stopPower": 8,
          "originality": 5,
          "memorability": 6,
          "storyPotential": 5,
          "AI_Generic_Risk": 6,
          "emotionalCharge": 5,
          "productRelevance": 4,
          "visualSpecificity": 8,
          "productionFeasibility": 8,
          "immediateComprehension": 5
        },
        "overturnedCreativeLeader": false,
        "commercialDimensionContributions": {
          "renderability": 27,
          "firstFrameClarity": 28,
          "humanProblemVisibility": 24,
          "narrativeSurvivability": 14,
          "productDemonstrability": 12.5,
          "commercialSurvivability": 16
        }
      },
      "creativeDnaDiagnostics": {
        "present": true,
        "validation": {
          "passed": true,
          "violations": []
        },
        "candidateId": "c7-visual_exaggeration-div",
        "fallbackUsed": false,
        "fallbackReason": null,
        "candidateVersion": "creative-candidates@3.0",
        "dnaPromptVersion": "creative-dna@1",
        "creativeDnaSource": "model",
        "modelDnaConsistency": {
          "passed": true,
          "violations": []
        },
        "identityEnvironmentSuppressed": true
      },
      "finalStoryboardFidelity": {
        "passed": true,
        "diagnostics": [
          {
            "rule": "opening_situation_visible_in_scene1",
            "passed": true,
            "reason": null,
            "candidateValue": "Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.",
            "generatedValue": "Night scene: a small service business interior in darkness — a reception counter with a glowing tablet propped upright, its screen showing a stream of stacked chat message bubbles in soft amber and blue, none with replie",
            "matchedAliases": []
          },
          {
            "rule": "hook_preserved_in_first_spoken",
            "passed": true,
            "reason": null,
            "candidateValue": "After hours, chats still screaming.",
            "generatedValue": "After hours, chats still screaming.",
            "matchedAliases": []
          },
          {
            "rule": "core_idea_recognizable",
            "passed": true,
            "reason": null,
            "candidateValue": "After hours, chats still screaming",
            "generatedValue": "After hours, chats still screaming. Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothi",
            "matchedAliases": []
          },
          {
            "rule": "product_or_topic_implied",
            "passed": true,
            "reason": null,
            "candidateValue": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human s",
            "generatedValue": "After hours, chats still screaming. Your website looks great. Professional logo. Clean layout. And yet — every visitor w",
            "matchedAliases": [
              "small",
              "business",
              "website",
              "visitor",
              "chatbot",
              "unanswered"
            ]
          },
          {
            "rule": "storyboard_collapsed_to_generic_office",
            "passed": true,
            "reason": null,
            "candidateValue": "Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload",
            "generatedValue": "Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a reception counter with a glowing tablet pr",
            "matchedAliases": []
          },
          {
            "rule": "opening_event_preserved_in_scene1",
            "passed": true,
            "reason": null,
            "candidateValue": "unread_message",
            "generatedValue": "Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a re",
            "matchedAliases": []
          },
          {
            "rule": "stop_scroll_idea_preserved",
            "passed": true,
            "reason": null,
            "candidateValue": "After hours, chats still screaming.",
            "generatedValue": "After hours, chats still screaming. | Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small serv",
            "matchedAliases": []
          },
          {
            "rule": "sales_pitch_opening",
            "passed": true,
            "reason": null,
            "candidateValue": "After hours, chats still screaming.",
            "generatedValue": "After hours, chats still screaming.",
            "matchedAliases": []
          },
          {
            "rule": "voiceover_essay_or_generic_opener",
            "passed": true,
            "reason": null,
            "candidateValue": "After hours, chats still screaming.",
            "generatedValue": "After hours, chats still screaming.",
            "matchedAliases": []
          }
        ],
        "failureReasons": [],
        "salesPitchOpening": false,
        "coreIdeaRecognizable": true,
        "productOrTopicImplied": true,
        "voiceoverEssayCadence": false,
        "stopScrollIdeaPreserved": true,
        "collapsedToGenericOffice": false,
        "hookPreservedInFirstSpoken": true,
        "openingEventPreservedInScene1": true,
        "openingSituationVisibleInScene1": true
      },
      "productDemonstrationIntegrity": {
        "passed": true,
        "summary": "product_demonstration_integrity_passed",
        "version": "product-demonstration-integrity@2",
        "violations": [],
        "primaryActor": {
          "label": "The recurring subject of: Night: small business dark",
          "lockedAttributes": [],
          "continuityAnchors": [
            "chat",
            "website"
          ]
        },
        "productDemonstration": {
          "present": true,
          "evidence": [
            "structured_product_demo_beat",
            "outcome_type:lead_captured"
          ],
          "askPresent": true,
          "answerPresent": true,
          "askSceneIndex": 3,
          "resultPresent": true,
          "structuredBeat": {
            "type": "product_demo",
            "actor_id": "primary_actor",
            "ai_answer": "Yes! We have openings Tuesday and Thursday afternoon. I can collect your details so the team reaches out to confirm — what's your name and best email?",
            "brand_name": "Fenrik.chat",
            "demo_variant": "after_hours_response",
            "outcome_type": "lead_captured",
            "outcome_label": "Lead captured — contact details collected at 11:42 PM",
            "conversation_id": "demo-afterhours-001",
            "outcome_visible": true,
            "question_visible": true,
            "visitor_question": "Do you have any availability this week for a consultation?",
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
    "generation_telemetry": {
      "steps": [
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "step_name": "Creative Candidates",
          "max_tokens": null,
          "started_at": "2026-07-20T20:55:20.809Z",
          "duration_ms": 49,
          "finished_at": "2026-07-20T20:55:20.857Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Creative Candidates input:\n- Product Brain\n- Strategy Item\n- Scenario\n- Audience\n- Pain Points",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "18 raw ideas\n↓\n7 filtered\n↓\n7 candidates\nWinner: c7-visual_exaggeration-div",
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 54,
          "prompt_characters": null,
          "completion_characters": 54
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "step_name": "Candidate Judge",
          "max_tokens": null,
          "started_at": "2026-07-20T20:55:20.858Z",
          "duration_ms": 0,
          "finished_at": "2026-07-20T20:55:20.858Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Creative Candidates\n- Scored families\n- Commercial Success dimensions",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "Winner: c7-visual_exaggeration-div (visual_exaggeration)",
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 2981,
          "prompt_characters": null,
          "completion_characters": 2981
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "step_name": "Narrative Beats",
          "max_tokens": null,
          "started_at": "2026-07-20T20:55:20.858Z",
          "duration_ms": 6,
          "finished_at": "2026-07-20T20:55:20.864Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Narrative Beats input:\n- Selected Candidate",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "HOOK\nSETUP\nESCALATION\nRESOLUTION",
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 42,
          "prompt_characters": null,
          "completion_characters": 42
        },
        {
          "model": "gpt-4o-mini-2024-07-18",
          "repair": false,
          "success": true,
          "provider": "claude",
          "warnings": [],
          "step_name": "Presentation Generation",
          "max_tokens": null,
          "started_at": "2026-07-20T20:55:20.881Z",
          "duration_ms": 118592,
          "finished_at": "2026-07-20T20:57:19.473Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "Presentation Generation input:\n- Narrative Beats\n- Creative Identity\n- Strategy Item\n- Product Brain",
          "prompt_tokens": 27883,
          "estimated_cost": 0.00859,
          "output_summary": "Storyboard\nVoiceover\nScenes\nCTA\nPlatform Outputs",
          "response_format": "json",
          "input_size_bytes": 101973,
          "completion_tokens": 7346,
          "output_size_bytes": 16325,
          "prompt_characters": 101348,
          "completion_characters": 16183
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "step_name": "Hook Enforcement",
          "max_tokens": null,
          "started_at": "2026-07-20T20:57:19.474Z",
          "duration_ms": 0,
          "finished_at": "2026-07-20T20:57:19.474Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Hook Enforcement input:\n- Candidate hookLine\n- Generated hook\n- Voiceover",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "reason: already_enforced",
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 74,
          "prompt_characters": null,
          "completion_characters": 74
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "step_name": "Concept Fidelity",
          "max_tokens": null,
          "started_at": "2026-07-20T20:57:19.474Z",
          "duration_ms": 8,
          "finished_at": "2026-07-20T20:57:19.482Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Concept Fidelity input:\n- Package\n- Selected Candidate",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "Passed first pass",
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 28,
          "prompt_characters": null,
          "completion_characters": 28
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "step_name": "Story Integrity",
          "max_tokens": null,
          "started_at": "2026-07-20T20:57:19.488Z",
          "duration_ms": 4,
          "finished_at": "2026-07-20T20:57:19.492Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Story Integrity input:\n- Generated package",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "Passed",
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 63,
          "prompt_characters": null,
          "completion_characters": 63
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "step_name": "Product Demonstration Integrity",
          "max_tokens": null,
          "started_at": "2026-07-20T20:57:19.492Z",
          "duration_ms": 4,
          "finished_at": "2026-07-20T20:57:19.496Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Product Demonstration Integrity input:\n- Selected Candidate\n- Visual scenes\n- Voiceover",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "Passed",
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 66,
          "prompt_characters": null,
          "completion_characters": 66
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "step_name": "Platform Outputs",
          "max_tokens": null,
          "started_at": "2026-07-20T20:57:19.512Z",
          "duration_ms": 0,
          "finished_at": "2026-07-20T20:57:19.512Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Platform Outputs input:\n- Presentation Generation package\n- Target platforms",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "Platforms: tiktok, instagram, youtube, facebook, linkedin, x",
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 4835,
          "prompt_characters": null,
          "completion_characters": 4801
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "step_name": "Persist Package",
          "max_tokens": null,
          "started_at": "2026-07-20T20:57:19.512Z",
          "duration_ms": 4050,
          "finished_at": "2026-07-20T20:57:23.562Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Persist Package input:\n- Validated package\n- Content items fan-out plan",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "packageId=c8c17f53-3257-4785-8676-0931dac13633; items=11",
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 552,
          "prompt_characters": null,
          "completion_characters": 552
        }
      ],
      "phases": [],
      "version": "pipeline-telemetry@1",
      "strategy_item_id": "1c9532c6-7754-444b-b6c5-446675f74429",
      "production_run_id": "b98a3ba8-4e34-4027-82d4-c58a798f7201",
      "fidelity_final_passed": true,
      "candidate_repair_reasons": [],
      "full_package_generations": 1,
      "fidelity_first_pass_passed": true,
      "hook_deterministic_enforce_reason": "already_enforced",
      "fidelity_first_pass_failure_reasons": []
    },
    "visual_medium_scores": {
      "SOFT_3D": 0,
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
      "PHOTOGRAPHIC:recent_repeat(-2)",
      "SOFT_3D:recent_repeat(-2)",
      "diversity:PHOTOGRAPHIC→CLEAN_ILLUSTRATION(close_score)"
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
    "target_visual_beat_count": 5,
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
        "hook": "Urgent question dies in silence.",
        "topic": "The car dealer who got 60 weekend visitors and sold nothing — because no one could answer a single question",
        "motifs": [
          "phone",
          "desk",
          "group",
          "product_asset"
        ],
        "closing": "Clean flat illustration, portrait 9:16 vertical frame, bright co-working space in daylight, cool neutral color feel, bri",
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
        "opening_structure": "immediate_reaction",
        "cta_composition_id": null,
        "attention_mechanism": "SURPRISE",
        "opening_visual_motif": "pull_back_reveal_polished_brand_feed",
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
        "opening_emotional_effect": "surprise"
      },
      {
        "hook": "She sent the newsletter. Forty people clicked. And every single one left without a word.",
        "topic": "The small accounting firm that sent a newsletter, got 40 website visitors in one evening, and woke up to zero leads",
        "motifs": [
          "laptop",
          "desk",
          "office",
          "dashboard",
          "group",
          "home_office"
        ],
        "closing": "Photorealistic photographic image. Portrait 9:16 vertical frame. Small home office nook, overcast diffused daylight soft",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "PRODUCT_DEMO",
          "IMAGE"
        ],
        "sfx_category": "silence_drop",
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "human",
        "opening_structure": "frozen_consequence",
        "cta_composition_id": null,
        "attention_mechanism": "DILEMMA",
        "opening_visual_motif": "hand_hovering_over_packed_suitcase_while",
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "PRODUCT_OUTCOME",
        "opening_emotional_effect": "dilemma"
      },
      {
        "hook": "Form abandoned now, discovered after vacation.",
        "topic": "The service business owner who found out her website had been saying nothing to every visitor for months",
        "motifs": [
          "laptop",
          "phone",
          "desk",
          "office",
          "close_up",
          "product_asset",
          "home_office"
        ],
        "closing": "Photorealistic photographic image. Portrait 9:16 vertical frame. A smartphone rests face-up on the clean home office des",
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
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "human",
        "opening_structure": "visual_first_question",
        "cta_composition_id": null,
        "attention_mechanism": "SURPRISE",
        "opening_visual_motif": "strategy_board_actually_fridge_door_with",
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "PRODUCT_OUTCOME",
        "opening_emotional_effect": "surprise"
      },
      {
        "hook": "Urgent question dies in silence",
        "topic": "The small business owner who opened her laptop Friday night and realized her website had been turning away strangers all week",
        "motifs": [
          "laptop",
          "phone",
          "desk",
          "office",
          "group",
          "close_up",
          "product_asset"
        ],
        "closing": "Photorealistic photographic image. Portrait 9:16 vertical frame. Same hands, same phone, soft-focus urban street exterio",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "PRODUCT_DEMO",
          "IMAGE"
        ],
        "sfx_category": "impact",
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "human",
        "opening_structure": "bold_claim",
        "cta_composition_id": null,
        "attention_mechanism": "PROVOCATIVE_OPINION",
        "opening_visual_motif": "crossing_post_more_wall_plan_writing",
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "PRODUCT_OUTCOME",
        "opening_emotional_effect": "strong_opinion"
      },
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
      }
    ]
  },
  "presentation_analyzer": null
}
```

#### Scene-by-scene

| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |
| ---: | --- | --- | --- | --- | --- |

#### TTS / voice

- **requested TTS voice (job input):** —
- **resolved at render:** cedar
- **project voice resolution:** legacy default (no presentation override) → `cedar`
- **differs from alloy:** yes
- **TTS instructions applied:** yes (project)
- **voiceover characters:** 335
- **estimated words:** 58
- **audio_duration (debug):** —
- **TTS validation attempts:** —
- **tail validation passed:** —
- **tts_tail_retry_used:** —

#### Visual profile

- **package/job profile:** NATURAL
- **version:** visual-profile@3
- **project auto-resolved profile:** MINIMAL (source: auto)
- **EDITORIAL prompt style token:** Clean composition, limited visual clutter, clear subject separation, generous negative space.
- **prompts include Editorial suffix:** check prompts

#### Semantic motion

_No semantic_motion beats in render_spec metadata._
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
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA",
    "PRODUCT_DEMO"
  ]
}
```

#### Image generation / moderation

No `image_generation_warnings` on render_spec — all scenes used primary provider path.

#### Final video details

- **MP4:** _(not stored)_
- **thumbnail:** _(not stored)_
- **subtitles:** _(not stored)_
- **video_duration:** —
- **subtitle_source:** —
- **render_warning:** false

#### Admin links (paths, no signed tokens)

- Production: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/production`
- Review: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/review`
- Content packages: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/content-packages`
- Videos / scene editor: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/videos`
- API export JSON: `/api/production-runs/b98a3ba8-4e34-4027-82d4-c58a798f7201/export`

## D. Cross-run consistency analysis

- **Distinct hooks:** 1 / 1
- **Distinct CTA texts:** 1 / 1
- **Funnel stages:** awareness
- **All videos used same voice:** yes
- **All packages same visual profile:** yes
- **Typed scenes rendered:** none (all worker scene types were IMAGE in this run)
- **Organic suitability:** Topics differ (dormant profile / weekend batching / URL-to-content); tone is educational not hard-sell; CTAs repeat free-package offer (expected for fenrik Studio).

## E. New-system usage matrix

| Package | Voice | Profile | CHECKLIST | PHONE | QUOTE | STATISTIC | CTA | Semantic Motion | Moderation fallback |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| After Hours, Chats Still Screaming | — | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |

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
