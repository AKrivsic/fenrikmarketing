# Production Run Audit — fa619bb8-b9cc-4fc9-818e-28cf6055980a

_Generated 2026-07-23T23:09:49.457Z by `scripts/audit-production-run.ts` (read-only)._

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
| production_run_id | `fa619bb8-b9cc-4fc9-818e-28cf6055980a` |
| project_id | `aabab9ff-9db4-4012-a53c-135e3bfea6cd` |
| project name | Fenrik.chat |
| status | completed |
| created_at | 2026-07-23T22:28:01.979699+00:00 |
| updated_at (terminal) | 2026-07-23T23:01:26.106718+00:00 |
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

- **971cfab0-dd04-4f57-b5f2-ac5c8a25b5cf** — The silent gap between website visitors and captured leads
```json
{
  "theme": "The silent gap between website visitors and captured leads",
  "source": "production_run",
  "production_run_id": "fa619bb8-b9cc-4fc9-818e-28cf6055980a",
  "funnel_distribution": {
    "Awareness": 0,
    "Conversion": 0,
    "Problem Aware": 1,
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
        "raw_usage": {
          "model": "claude-sonnet-4-6",
          "cached_tokens": 0,
          "prompt_tokens": 3949,
          "completion_tokens": 241
        },
        "step_name": "Weekly Strategy",
        "max_tokens": 8192,
        "started_at": "2026-07-23T22:28:04.923Z",
        "duration_ms": 5277,
        "finished_at": "2026-07-23T22:28:10.200Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": 0,
        "error_message": null,
        "input_summary": "Weekly Strategy input:\n- Product Brain\n- Trends\n- Evergreen Topics\n- Anti-repetition Memory",
        "prompt_tokens": 3949,
        "estimated_cost": 0.015462,
        "output_summary": "Theme + funnel plan\n↓\n1 strategy item (requested 1)",
        "pricing_source": "list_price_estimate",
        "pricing_version": "list-price@2026-07-23",
        "response_format": "json",
        "input_size_bytes": 17549,
        "completion_tokens": 241,
        "output_size_bytes": 896,
        "prompt_characters": 17463,
        "provider_request_id": null,
        "completion_characters": 892
      },
      {
        "model": null,
        "repair": false,
        "success": true,
        "provider": "deterministic",
        "warnings": [],
        "raw_usage": null,
        "step_name": "Strategy Items",
        "max_tokens": null,
        "started_at": "2026-07-23T22:28:10.200Z",
        "duration_ms": 262,
        "finished_at": "2026-07-23T22:28:10.462Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": null,
        "error_message": null,
        "input_summary": "Strategy Items input:\n- Weekly Strategy plan\n- Funnel distribution",
        "prompt_tokens": null,
        "estimated_cost": null,
        "output_summary": "1 strategy item(s) persisted",
        "pricing_source": null,
        "pricing_version": null,
        "response_format": null,
        "input_size_bytes": null,
        "completion_tokens": null,
        "output_size_bytes": 104,
        "prompt_characters": null,
        "provider_request_id": null,
        "completion_characters": 104
      }
    ],
    "phases": [],
    "version": "pipeline-telemetry@1",
    "pricing_version": "list-price@2026-07-23",
    "production_run_id": "fa619bb8-b9cc-4fc9-818e-28cf6055980a"
  }
}
```

### production_run_items

```json
[
  {
    "id": "7fc66db5-c286-41db-aecb-06a512eb8083",
    "production_run_id": "fa619bb8-b9cc-4fc9-818e-28cf6055980a",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "2a686bdb-5eae-453b-ba5a-91d0227c14af",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-23T22:28:02.291979+00:00",
    "updated_at": "2026-07-23T22:46:40.205973+00:00",
    "package_index": 0,
    "strategy_item_id": "c5af3498-f796-4deb-9594-94a4edd0d89c",
    "failure_telemetry": null
  }
]
```

## C. Package-by-package audit

### Package 1 — You've Been Defining Bounce Rate Wrong for Years

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `2a686bdb-5eae-453b-ba5a-91d0227c14af` |
| strategy_item_id | `c5af3498-f796-4deb-9594-94a4edd0d89c` |
| weekly_strategy_id | `971cfab0-dd04-4f57-b5f2-ac5c8a25b5cf` |
| production_run_id | `fa619bb8-b9cc-4fc9-818e-28cf6055980a` |
| status | draft |
| funnel_stage | problem_aware |
| created_at | 2026-07-23T22:41:05.846677+00:00 |
| updated_at | 2026-07-23T22:46:38.762209+00:00 |
| primary content_item_id | `c6acaa7f-961e-4372-aa43-08b1e2ef0fe2` |
| video_job_id | `` |
| video_job status | — |

#### Phase timings (pipeline telemetry)

```
Package generation

951.3 s

↓

Creative Direction Generation
52.7 s

↓

Creative Direction Evaluation
40.6 s

↓

Creative Ideation
206.9 s

↓

Creative Evaluation
30.2 s

↓

Creative Engine
1 ms

↓

Candidate Judge
0 ms

↓

Narrative Beats
12 ms

↓

Presentation Generation
68.3 s

↓

Hook Enforcement
1 ms

↓

Concept Fidelity
17 ms

↓

Story Integrity
9 ms

↓

JSON Repair
29.6 s

↓

JSON Repair
25.6 s

↓

JSON Repair
29.9 s

↓

JSON Repair
27.3 s

↓

JSON Repair
29 s

↓

JSON Repair
35.1 s

↓

Story Integrity Repair
371.9 s

↓

Product Demonstration Integrity
5 ms

↓

Platform Outputs
0 ms

↓

Persist Package
4.2 s
```

##### Execution Time

| Step | Duration | % |
| --- | ---: | ---: |
| Creative Direction Generation | 52.7 s | 5.5% |
| Creative Direction Evaluation | 40.6 s | 4.3% |
| Creative Ideation | 206.9 s | 21.7% |
| Creative Evaluation | 30.2 s | 3.2% |
| Creative Engine | 1 ms | 0.0% |
| Candidate Judge | 0 ms | 0.0% |
| Narrative Beats | 12 ms | 0.0% |
| Presentation Generation | 68.3 s | 7.2% |
| Hook Enforcement | 1 ms | 0.0% |
| Concept Fidelity | 17 ms | 0.0% |
| Story Integrity | 9 ms | 0.0% |
| JSON Repair | 29.6 s | 3.1% |
| JSON Repair | 25.6 s | 2.7% |
| JSON Repair | 29.9 s | 3.1% |
| JSON Repair | 27.3 s | 2.9% |
| JSON Repair | 29 s | 3.0% |
| JSON Repair | 35.1 s | 3.7% |
| Story Integrity Repair | 371.9 s | 39.1% |
| Product Demonstration Integrity | 5 ms | 0.0% |
| Platform Outputs | 0 ms | 0.0% |
| Persist Package | 4.2 s | 0.4% |
| **Total** | **951.3 s** | **100%** |

##### AI Cost

| Step | Prompt tok | Completion tok | Estimated $ |
| --- | ---: | ---: | ---: |
| Creative Direction Generation | 2932 | 2207 | $0.0419 |
| Creative Direction Evaluation | 3225 | 2177 | $0.0423 |
| Creative Ideation | 5340 | 10436 | $0.1726 |
| Creative Evaluation | 3905 | 1412 | $0.0329 |
| Presentation Generation | 23456 | 3729 | $0.1263 |
| JSON Repair | 3721 | 3614 | $0.0027 |
| JSON Repair | 3431 | 3326 | $0.0025 |
| JSON Repair | 3703 | 3647 | $0.0027 |
| JSON Repair | 3431 | 3327 | $0.0025 |
| JSON Repair | 3708 | 3680 | $0.0028 |
| JSON Repair | 3470 | 3353 | $0.0025 |
| Story Integrity Repair | 16731 | 12288 | $0.2345 |
| **Total (est.)** |  |  | **$0.6663** |

##### Prompt Sizes

| Step | Prompt KB | Output KB |
| --- | ---: | ---: |
| Creative Direction Generation | 13.7 KB | 10.0 KB |
| Creative Direction Evaluation | 14.8 KB | 8.6 KB |
| Creative Ideation | 23.5 KB | 43.9 KB |
| Creative Evaluation | 16.7 KB | 5.9 KB |
| Creative Engine | — | 0.0 KB |
| Candidate Judge | — | 2.3 KB |
| Narrative Beats | — | 0.0 KB |
| Presentation Generation | 95.1 KB | 14.9 KB |
| Hook Enforcement | — | 0.1 KB |
| Concept Fidelity | — | 0.0 KB |
| Story Integrity | — | 0.1 KB |
| JSON Repair | 16.7 KB | 16.6 KB |
| JSON Repair | 15.7 KB | 15.7 KB |
| JSON Repair | 16.5 KB | 16.7 KB |
| JSON Repair | 15.7 KB | 15.7 KB |
| JSON Repair | 16.6 KB | 16.9 KB |
| JSON Repair | 15.9 KB | 15.9 KB |
| Story Integrity Repair | 22.3 KB | 15.9 KB |
| Product Demonstration Integrity | — | 0.1 KB |
| Platform Outputs | — | 4.0 KB |
| Persist Package | — | 0.5 KB |

##### Providers

| Provider | Steps | Duration |
| --- | ---: | ---: |
| Claude | 7 | 770.5 s |
| OpenAI | 6 | 176.5 s |
| Deterministic | 8 | 4.3 s |

#### Strategy input

- **topic:** The small business owner who sent a campaign, got 50 website visitors in one afternoon, and woke up to zero leads — because no one was there to answer a single question
- **angle:** Walk through the exact moment a business owner realizes their website is receiving real, qualified traffic but has no way to respond to visitor questions in real time — every visitor who needed an answer simply left. The story centers on the invisible cost of a website that stays silent while people are actively looking to buy.
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
  "angle": "Walk through the exact moment a business owner realizes their website is receiving real, qualified traffic but has no way to respond to visitor questions in real time — every visitor who needed an answer simply left. The story centers on the invisible cost of a website that stays silent while people are actively looking to buy.",
  "topic": "The small business owner who sent a campaign, got 50 website visitors in one afternoon, and woke up to zero leads — because no one was there to answer a single question",
  "source": "production_run",
  "package_index": 0,
  "production_run_id": "fa619bb8-b9cc-4fc9-818e-28cf6055980a"
}
```

#### Full content (package_brief core)

**hook:**

You've been defining this number wrong for years.


**voiceover_text:**

You've been defining this number wrong for years. Bounce rate doesn't mean 'visitor left without converting.' It means: visitor had a question, no one answered, visitor left. That's it. Every bounce is a conversation that never happened. Your website was silent while someone was ready to talk. That silence is the real metric. And it's fixable.


**subtitles:**

You've been defining this number wrong for years. // Bounce rate doesn't mean 'visitor left without converting.' // It means: visitor had a question — no one answered — visitor left. // Every bounce is a conversation that never happened. // Your website was silent while someone was ready to talk. // That silence is the real metric. // And it's fixable.


**video concept:**

A marketing consultant is mid-explanation in a small consulting room, marker in hand at a whiteboard. He writes 'BOUNCE RATE =' and stops. The hand holds. He tilts his head, draws an arrow chain — 'Had a question → No answer → Left' — then crosses out his original definition and rewrites it: 'Unanswered question, counted.' He steps back. A quiet admission in voiceover: 'I've been reporting this number to clients for three years.' The crossed-out definition stays on the board. His laptop is open beside him — an AI assistant already mid-conversation with a site visitor. The board is the payoff. The product is the quiet answer.


**video script:**

OPEN on a hand pressing a marker to a whiteboard, mid-word — 'BOUNCE RATE' half-written. The marker stops. Holds.

VO: 'You've been defining this number wrong for years.'

CUT TO: The consultant — seen from behind, standing at the whiteboard in a pale sage consulting room, horizontal blind light striping the wall. He finishes the definition: 'BOUNCE RATE = Visitor left without converting.' Underlines it.

VO: 'Bounce rate doesn't mean visitor left without converting.'

He tilts his head. Draws an arrow. Writes: 'Had a question.' Another arrow: 'No answer available.' Final arrow: 'Left.'

VO: 'It means: visitor had a question — no one answered — visitor left.'

He steps back. Looks at what he's written. Draws a single line through the original definition. Writes beneath it: 'Unanswered question, counted.'

VO (quieter): 'Every bounce is a conversation that never happened. I've been reporting this number to clients for three years.'

CUT TO: His open laptop on the low table — the AI assistant interface mid-conversation, a visitor's question visible on screen, a reply already appearing.

VO: 'Your website was silent while someone was ready to talk. That silence is the real metric. And it's fixable.'

HOLD on the whiteboard — crossed-out definition still visible. Board stays. Marker cap clicks shut.


**duration_seconds (brief):** 22

**CTA:** Create your AI assistant — let your website answer the question that ends the bounce. (type: sign_up)

**creative_mode:** 

**hashtags:** ["#bounceRate","#leadGeneration","#AIchatbot","#websitetips","#smallbusiness","#digitalmarketing","#customerexperience","#fenrikchat"]


#### Full platform copy

##### x

```json
{
  "cta": "fenrik.chat",
  "format": "X Video Post",
  "caption": "Bounce rate = unanswered question, counted. That's it. The rest is a definition we inherited and never questioned.",
  "hashtags": [
    "#marketing",
    "#leadgen"
  ],
  "title_variants": [
    "The bounce rate redefinition nobody talks about",
    "What your analytics have been quietly telling you for years",
    "A metric you trust — and a definition that's missing half the story",
    "Your website isn't losing visitors. It's losing conversations.",
    "The number every marketer reads — and almost everyone misdefines"
  ],
  "caption_variants": [
    "Bounce rate = unanswered question, counted. That's it. The rest is a definition we inherited and never questioned.",
    "You sent 50 people to your website. They had questions. Your site had nothing to say. Analytics called it a bounce. You called it a traffic problem. It wasn't.",
    "The metric isn't broken. The definition is. Bounce rate was always a response signal — not a reach signal.",
    "Every bounce is a visitor who was ready to engage and found silence instead. That's not a campaign problem. That's a website problem.",
    "Most marketers optimize for traffic. Almost none optimize for what happens when that traffic arrives and asks a question. That gap is where leads disappear."
  ]
}
```
##### tiktok

```json
{
  "cta": "Link in bio to fix it in under a minute.",
  "format": "Vertical Short (9:16)",
  "caption": "Your bounce rate isn't a traffic problem. It's a silence problem. 👇",
  "hashtags": [
    "#bounceRate",
    "#websitetips",
    "#smallbusiness",
    "#AIchatbot",
    "#leadgeneration"
  ]
}
```
##### youtube

```json
{
  "cta": "Subscribe for more insights like this.",
  "format": "YouTube Shorts (9:16)",
  "caption": "Your bounce rate has been telling you something you weren't trained to hear. Every number is an unanswered question.",
  "hashtags": [
    "#BounceRate",
    "#AIchatbot",
    "#SmallBusiness"
  ]
}
```
##### facebook

```json
{
  "cta": "Create your AI assistant at fenrik.chat",
  "format": "Facebook Video Post",
  "caption": "Here's something most analytics dashboards don't tell you: a bounce isn't just a visitor who left — it's a visitor who had a question and got silence in return. 😶\n\nIf your website can't respond when someone's ready to ask, you're not losing traffic. You're losing conversations.\n\nThe good news? Your website can start answering — automatically, 24/7, without any technical setup.",
  "hashtags": [
    "#SmallBusiness",
    "#WebsiteTips",
    "#AIchatbot"
  ]
}
```
##### linkedin

```json
{
  "cta": "Create your AI assistant at fenrik.chat",
  "format": "LinkedIn Video Post",
  "caption": "Most businesses track bounce rate as a traffic metric. It isn't. It's a response metric. Every session that ends without a conversion ended because a question went unanswered — not because the visitor wasn't interested. The data was always telling you this. The definition just wasn't quite right.",
  "hashtags": [
    "#LeadGeneration",
    "#CustomerExperience",
    "#AIchatbot"
  ],
  "title_variants": [
    "Your bounce rate is a response metric — not a traffic metric",
    "The definition of bounce rate most marketers are still using is incomplete"
  ],
  "caption_variants": [
    "Most businesses track bounce rate as a traffic metric. It isn't. It's a response metric. Every session that ends without a conversion ended because a question went unanswered — not because the visitor wasn't interested. The data was always telling you this. The definition just wasn't quite right.",
    "A visitor lands on your website. They have a question. No one answers. They leave. Your analytics logs it as a bounce. That's not a traffic problem — that's a silence problem. And it's one of the most consistently misread signals in digital marketing."
  ]
}
```
##### instagram

```json
{
  "cta": "Link in bio → Create your AI assistant.",
  "format": "Reels (9:16)",
  "caption": "Every bounce on your analytics isn't a lost visitor.\n\nIt's an unanswered question.\n\nSomeone landed on your website ready to talk — and your site said nothing back. That's the number you've been reading wrong.\n\nYour website can answer. It just needs to be set up to do it.",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#leadgeneration",
    "#AIchatbot",
    "#digitalmarketing",
    "#bounceRate",
    "#customerexperience",
    "#businessgrowth",
    "#marketingtips",
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
      "image_prompt": "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, tight crop on hands and whiteboard surface. A hand presses a thick black marker against a pale whiteboard — the word 'BOUNCE RATE' is half-formed, the final letters unfinished. The marker is frozen mid-stroke. The hand holds without moving. Gentle side lighting from the left casts a soft shadow across the board. Warm neutral color feel — pale sage wall behind, a sliver of horizontal blind light striping the background. The whiteboard occupies most of the frame; the hand is centered with natural headroom. No readable text rendered — the partial word is suggested by the marker position and gesture, not legible letters. The atmosphere is quiet tension before a decision. Human presence: hand and forearm only, seen close. No faces. No additional objects. Vertical mobile-first composition."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot. The marketing consultant is seen from behind, standing at a rolling whiteboard in a small bright consulting room. Pale sage walls. Horizontal blind light stripes fall diagonally across the wall to his left — warm, directional, natural afternoon light. One medium fiddle-leaf fig plant in the far corner. A low table with an open laptop and scattered printed reports sits to his right. He holds the marker at his side. On the whiteboard, a chain of three arrows is drawn — each arrow pointing to the next, suggesting a sequence of events. No legible text. The board shows a crossed-out line at the top and a rewritten line beneath it — conveyed through the visual structure of strikethrough and underline shapes, not readable words. The consultant's posture is still, slightly tilted — the body language of someone who has just realized something. Warm neutral color feel. Vertical mobile-first composition."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, tight crop on the whiteboard surface. The whiteboard now shows a clearly crossed-out block at the top — a bold horizontal line through the first definition — and a rewritten block beneath it with an underline. No readable text. The crossing-out is the visual subject: a correction made in place, not erased. The marker rests in the tray at the bottom of the board. Gentle side lighting from the left. Warm neutral color feel — pale sage wall visible at the edges. The horizontal blind light stripe is present across the upper portion of the frame. The crossed-out definition stays. The rewritten one sits below it. The board is the entire frame. Quiet, still, consequential. Vertical mobile-first composition."
    },
    {
      "modify": "false",
      "source": "asset",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the resolution beat (seconds 17–22); place it centered within a clean laptop mockup positioned on the low consulting room table beside the scattered printed reports — the whiteboard with its crossed-out definition is softly visible in the background. Gentle side lighting from the left, warm amber highlights on the laptop lid, pale sage wall behind. Three-quarter angle, subject centered with breathing room. Do not crop fullscreen. The laptop screen displays the product UI as the structural answer to the redefined metric — the thing that would have answered the visitor's question before the bounce.",
      "asset_id": "7e250d64-ddcf-4649-921f-783d294a2b5b",
      "video_usage": "framed_laptop"
    }
  ],
  "image_prompts": [
    "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, tight crop on hands and whiteboard surface. A hand presses a thick black marker against a pale whiteboard — the word 'BOUNCE RATE' is half-formed, the final letters unfinished. The marker is frozen mid-stroke. The hand holds without moving. Gentle side lighting from the left casts a soft shadow across the board. Warm neutral color feel — pale sage wall behind, a sliver of horizontal blind light striping the background. The whiteboard occupies most of the frame; the hand is centered with natural headroom. No readable text rendered — the partial word is suggested by the marker position and gesture, not legible letters. The atmosphere is quiet tension before a decision. Human presence: hand and forearm only, seen close. No faces. No additional objects. Vertical mobile-first composition.",
    "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot. The marketing consultant is seen from behind, standing at a rolling whiteboard in a small bright consulting room. Pale sage walls. Horizontal blind light stripes fall diagonally across the wall to his left — warm, directional, natural afternoon light. One medium fiddle-leaf fig plant in the far corner. A low table with an open laptop and scattered printed reports sits to his right. He holds the marker at his side. On the whiteboard, a chain of three arrows is drawn — each arrow pointing to the next, suggesting a sequence of events. No legible text. The board shows a crossed-out line at the top and a rewritten line beneath it — conveyed through the visual structure of strikethrough and underline shapes, not readable words. The consultant's posture is still, slightly tilted — the body language of someone who has just realized something. Warm neutral color feel. Vertical mobile-first composition.",
    "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, tight crop on the whiteboard surface. The whiteboard now shows a clearly crossed-out block at the top — a bold horizontal line through the first definition — and a rewritten block beneath it with an underline. No readable text. The crossing-out is the visual subject: a correction made in place, not erased. The marker rests in the tray at the bottom of the board. Gentle side lighting from the left. Warm neutral color feel — pale sage wall visible at the edges. The horizontal blind light stripe is present across the upper portion of the frame. The crossed-out definition stays. The rewritten one sits below it. The board is the entire frame. Quiet, still, consequential. Vertical mobile-first composition."
  ],
  "asset_usage": [
    {
      "modify": "false",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the resolution beat (seconds 17–22); place it centered within a clean laptop mockup positioned on the low consulting room table beside the scattered printed reports — the whiteboard with its crossed-out definition is softly visible in the background. Gentle side lighting from the left, warm amber highlights on the laptop lid, pale sage wall behind. Three-quarter angle, subject centered with breathing room. Do not crop fullscreen. The laptop screen displays the product UI as the structural answer to the redefined metric — the thing that would have answered the visitor's question before the bounce.",
      "asset_id": "7e250d64-ddcf-4649-921f-783d294a2b5b"
    }
  ],
  "presentation_generation": {
    "mode": "enabled",
    "attention": {
      "opening": {
        "emotional_effect": "frustration",
        "opening_delivery": "urgent",
        "opening_structure": "immediate_reaction",
        "first_motion_intent": "ATTENTION",
        "land_within_seconds": [
          1,
          1.8
        ],
        "first_spoken_guidance": "Open with an immediate reaction using Frustration — not context or setup. The opening spoken thought must be one complete meaning unit (one short phrase, or two ultra-short phrases) — not an unfinished setup. The stored hook MUST be the same thought as the first spoken line — do not dilute a strong hook into a weaker voiceover setup. Open on the felt annoyance — specific, not abstract. Narrative seed: Unexpected but relevant: Open on the felt annoyance — specific, not abstract. Keep the link to Walk through the exact moment a business owner realizes their website is receiving real, qualified traffic but has no way to respond to visitor questions in real time — every visitor who needed an answer simply left. The story centers on the invisible cost of a website that stays silent while people are actively looking to buy. / Unable to answer customer questions when offline clear by the next beat.",
        "first_visual_guidance": "The first visual is an attention event with clear meaning — not a decorative sentence illustration. Emotional action of frustration with a clear cause — not calm desk staring. Preferred opening visual concept: Hands crumpling a \"content idea\" sticky that says only \"post something\" Reject low-information openings: frames that add no stakes, curiosity, contrast, or situation meaning. Calm or empty frames are fine when absence/stakes ARE the meaning; interchangeable stock staging with no situation is not. Render coherently via Visual Narrative / Medium / Profile / Identity — attention chooses the idea; Identity is treatment only (never relocate the event).",
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
              "low_information_opening",
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
            "visual_concept": "Hands crumpling a \"content idea\" sticky that says only \"post something\""
          }
        ],
        "reject_summary": [
          "obvious:office_cliche:\\bcalm\\s+desk\\b",
          "obvious:first_obvious_idea",
          "obvious:low_information_opening",
          "obvious:visual_story:office_cliche_backslide"
        ],
        "selected_candidate_id": "unexpected",
        "selected_narrative_seed": "Unexpected but relevant: Open on the felt annoyance — specific, not abstract. Keep the link to Walk through the exact moment a business owner realizes their website is receiving real, qualified traffic but has no way to respond to visitor questions in real time — every visitor who needed an answer simply left. The story centers on the invisible cost of a website that stays silent while people are actively looking to buy. / Unable to answer customer questions when offline clear by the next beat.",
        "selected_visual_concept": "Hands crumpling a \"content idea\" sticky that says only \"post something\"",
        "selected_emotional_effect": "frustration"
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
            "delivery": "Payoff: Empathetic frustration with the problem, never at the viewer."
          },
          {
            "phase": "close",
            "delivery": "Close: satisfying landing; CTA only if present, never aggressive."
          }
        ],
        "reasons": [
          "opening_style:urgent",
          "mechanism:FRUSTRATION",
          "full_arc_not_opening_only",
          "spoken_rhythm_contrast_pause_emphasis"
        ],
        "version": "delivery-arc@1",
        "tts_instruction_fragment": "Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Use spoken rhythm: short sentences, contrast, and a brief pause before the reveal. Emphasize the turn or punchline — do not read every clause at the same energy. Avoid long equally-paced paragraphs; land one idea per breath. Empathetic frustration with the problem, never at the viewer."
      },
      "sfx_category": null,
      "sfx_selected": false,
      "sfx_timing_ms": null,
      "attention_source": "deterministic_v1",
      "attention_reasons": [
        "selected:FRUSTRATION",
        "source:deterministic_v1",
        "funnel_soft_affinity:problem_aware:3",
        "creative_mode_soft_affinity:shock:0",
        "independent_of_funnel_mapping"
      ],
      "attention_version": "attention@1",
      "opening_structure": "immediate_reaction",
      "attention_mechanism": "FRUSTRATION",
      "opening_visual_motif": "hands_crumpling_content_idea_sticky_that",
      "sfx_render_supported": true,
      "opening_emotional_effect": "frustration"
    },
    "tts_voice": "shimmer",
    "package_id": "2a686bdb-5eae-453b-ba5a-91d0227c14af",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 49,
      "secondary": 62
    },
    "voice_source": "package_secondary",
    "visual_medium": "CLEAN_ILLUSTRATION",
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
        "story_prefers_outcome_over_framed:human",
        "fallback:abstract_system"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "ABSTRACT_PRODUCT_SYSTEM",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "shimmer",
    "visual_profile": "NATURAL",
    "creative_engine": {
      "errors": [
        "dna_soft_warnings:dna_immutableRules:immutableRules lack concept-specific nouns from the candidate"
      ],
      "models": {
        "critic": "claude-sonnet-4-6",
        "ideation": "claude-sonnet-4-6",
        "directions": "claude-sonnet-4-6",
        "dna_repair": null
      },
      "version": "creative-engine@3",
      "rejected": [
        {
          "reasons": [
            "fingerprint_collision_recent_package"
          ],
          "concept_id": "c1"
        },
        {
          "reasons": [
            "fingerprint_collision_recent_package"
          ],
          "concept_id": "c3"
        },
        {
          "reasons": [
            "fingerprint_collision_recent_package"
          ],
          "concept_id": "c5"
        },
        {
          "reasons": [
            "fingerprint_collision_recent_package"
          ],
          "concept_id": "c6"
        }
      ],
      "evaluation": {
        "source": "critic",
        "ranking": [
          "c2",
          "c4"
        ],
        "version": "creative-evaluation@1",
        "winner_id": "c2",
        "evaluations": [
          {
            "scores": {
              "funnel_fit": 9,
              "originality": 8,
              "stop_scroll": 8,
              "memorability": 8,
              "strategy_fit": 9,
              "anti_repetition": 8,
              "product_relevance": 8,
              "emotional_strength": 8,
              "narrative_coherence": 9,
              "visual_distinctness": 7,
              "atmosphere_freshness": 7,
              "production_feasibility": 8,
              "natural_product_integration": 7
            },
            "vetoes": [],
            "concept_id": "c2",
            "critic_notes": "The reframe of bounce rate as 'unanswered question, counted' is genuinely sharp — it takes a metric the target audience already owns and reinterprets it without inventing new data. The expert-humility mechanism is well-calibrated: a consultant who teaches this metric discovering he has been teaching an incomplete definition is more credible and more emotionally resonant than a naive business owner discovering a problem. The marker stopping mid-word is a strong opening interrupt — it signals that something broke inside a confident act, which is a reliable scroll-stopper. The whiteboard-as-hero-object works because the crossed-out definition stays visible; the correction doesn't erase the error, it annotates it, which is more honest and more memorable. The pale sage / horizontal blind light / fiddle-leaf fig atmosphere is clean and differentiated from the fingerprint palette bank — no overlap with eucalyptus green, birch, copper, corkboard, amber stage, matte white, or mahogany. The product integration is structurally sound but slightly mechanical — the laptop appearing as 'the answer' at the end is the weakest beat; it would benefit from the AI assistant being visible mid-conversation rather than just 'open.' Narrative coherence is high: setup, pause, realization, rewrite, product. The emotional arc lands because the consultant's quiet 'I've been reporting this number to clients for three years' is a genuinely human moment of professional reckoning. Production risk is manageable — the main vulnerability is the marker-stop feeling staged, which is a timing and performance issue, not a structural one."
          },
          {
            "scores": {
              "funnel_fit": 8,
              "originality": 7,
              "stop_scroll": 7,
              "memorability": 7,
              "strategy_fit": 8,
              "anti_repetition": 7,
              "product_relevance": 7,
              "emotional_strength": 7,
              "narrative_coherence": 8,
              "visual_distinctness": 6,
              "atmosphere_freshness": 6,
              "production_feasibility": 7,
              "natural_product_integration": 7
            },
            "vetoes": [],
            "concept_id": "c4",
            "critic_notes": "The CPL formula with the missing denominator is a clever structural idea — applying familiar marketing math to a unit the audience has never calculated is a legitimate reframe. The 'blank denominator' as hero object is conceptually strong. However, the mechanism is slightly more abstract than c2: bounce rate is a single, universally recognized metric with an emotional charge; CPL with a missing denominator requires the viewer to follow a two-step logical argument (the formula is incomplete, therefore the cost is invisible) rather than a single reframe. The client-asking-the-question device is effective as a viewer surrogate but introduces a second character whose spontaneity is harder to produce convincingly than a solo consultant's internal monologue. The visual world — white walls, pale ash table, flip chart — is clean but less atmospherically distinctive than c2's horizontal blind light and sage walls; it risks reading as a generic meeting room. The opening (division symbol being drawn) is a slightly weaker interrupt than a hand stopping mid-word, because a division symbol completing itself does not signal interruption — it signals continuation. The product integration at the table edge is parallel in quality to c2's laptop moment: structurally sound, slightly mechanical. The emotional tone of 'collegial surprise tipping into professional humility' is well-described but the group dynamic diffuses the intimacy that makes c2's solo reckoning more affecting. Narrative coherence is solid. Production feasibility is slightly lower than c2 because coordinating a group scene with a spontaneous-feeling question is harder to execute than a solo performance."
          }
        ],
        "winner_reason": "c2 wins on the strength of its reframe precision, emotional intimacy, and opening interrupt quality. The bounce rate redefinition — 'unanswered question, counted' — is a single, clean, emotionally loaded reframe of a metric the target audience already uses and already trusts, which means the concept does not need to teach a new framework before delivering its payload. The marker stopping mid-word is a stronger scroll-stopper than a division symbol completing itself, because interruption inside a confident act creates more immediate tension than a formula being drawn correctly. The solo consultant's internal monologue and quiet admission — 'I've been reporting this number to clients for three years' — delivers a more intimate and affecting moment of expert humility than the group dynamic in c4, where the emotional weight is distributed across multiple characters. The crossed-out definition staying on the board is a more memorable ending artifact than the blank denominator, because it is visually permanent and emotionally honest — the error is not erased, it is corrected in place. The pale sage / horizontal blind atmosphere is more atmospherically specific and differentiated from the fingerprint palette bank than c4's white-and-ash meeting room. Both concepts share a similar product integration weakness (laptop appearing as structural answer), but c2's overall superiority across originality, emotional strength, visual distinctness, and stop-scroll quality is sufficient to determine the ranking without that weakness being decisive."
      },
      "fingerprint": {
        "metaphor": null,
        "hero_object": "The whiteboard with the crossed-out definition and the rewritten one beneath it",
        "core_premise": "Bounce rate has always been a count of unanswered questions — the consultant has been reporting the metric correctly and interpreting it catastrophically wrong.",
        "visual_world": "Small bright consulting room — pale sage walls, horizontal blind light, whiteboard on a rolling stand, fiddle-leaf fig, scattered printed reports.",
        "emotional_arc": "Confident instruction → pause → realization → expert humility → structural correction",
        "ending_mechanism": "The crossed-out definition stays on the board — permanent, visible proof of the reframe.",
        "opening_mechanism": "A hand writing on a whiteboard that stops mid-word — the interruption signals that something in the confident act has broken.",
        "product_mechanism": "Appears as the answer to the correct definition — the thing that removes bounce events caused by unanswered questions.",
        "creative_direction": "Works by surfacing evidence that already exists in data the audience already has — traffic numbers, session counts, bounce rates — and reframes that existing data as a record of unanswered questions rather than a record of visitors.",
        "palette_atmosphere": "Pale sage, white, black marker, warm daylight with horizontal blind shadows — clean, professional, quietly alive"
      },
      "brief_digest": {
        "topic": "The small business owner who sent a campaign, got 50 website visitors in one afternoon, and woke up to zero leads — because no one was there to answer a single question",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "hook_memory_count": 20,
        "fingerprint_memory_count": 11
      },
      "critic_attempts": 1,
      "ideation_attempts": 1,
      "winner_concept_id": "c2",
      "concepts_generated": [
        {
          "title": "The Number That Was Never Zero",
          "pacing": "Slow open, deliberate middle, single sharp landing. No rush. The reread is the story.",
          "hook_line": "You already had the proof. You just didn't know what it was counting.",
          "viewpoint": "First-person empathy — the viewer is inside the owner's head as she processes the reframe.",
          "atmosphere": {
            "time_of_day": "Early morning, first light",
            "palette_intent": "Bleached oak, cream linen, black ink, red ballpoint — warm neutrals with a single sharp accent color that carries all the emotional weight",
            "lighting_intent": "Soft diffused window light from camera left — no artificial warmth, no golden hour, just clear honest morning"
          },
          "concept_id": "c1",
          "fingerprint": {
            "metaphor": null,
            "hero_object": "The circled number 50 on the analytics printout",
            "core_premise": "The analytics data the owner already has is retrospective proof of 50 unanswered questions — the number was always evidence of the loss, never a neutral traffic count.",
            "visual_world": "Bleached oak kitchen table, printed analytics sheet, red ballpoint, ceramic mug — morning domestic setting, no screens until the final frame.",
            "emotional_arc": "Neutral data → reread as loss → retrospective grief → structural answer",
            "ending_mechanism": "The same number, now permanently reframed — the viewer cannot unsee what 50 was counting.",
            "opening_mechanism": "Extreme close-up on a wet-ink circle around the number 50 — the smeared edge signals something just changed in understanding.",
            "product_mechanism": "Appears at the final beat as the thing that would have converted the 50 into conversations instead of silence.",
            "creative_direction": "Works by surfacing evidence that already exists in data the audience already has — traffic numbers, session counts, bounce rates — and reframes that existing data as a record of unanswered questions rather than a record of visitors.",
            "palette_atmosphere": "Bleached oak, cream linen, black ink, red ballpoint accent — warm neutrals with a single sharp signal color"
          },
          "central_idea": "A business owner stares at a printed analytics summary showing 50 sessions and zero leads — and in real time, the viewer watches her reread the 50 and understand for the first time that it is not a traffic number. It is a count of unanswered questions. The 50 was always there. She was reading it wrong.",
          "creative_dna": {
            "world": "A specific, domestic morning kitchen — not an office, not a studio. The analytics report is a physical object, not a screen. The setting signals that this realization happened at home, before work, alone.",
            "productRole": "The structural correction to a structural misreading — not a feature, but the thing that makes the 50 mean something different going forward.",
            "coreConflict": "She has been reading her data correctly by the standard definition and catastrophically wrong by the definition that matters.",
            "endingIntent": "The viewer walks away unable to look at a session count the same way again.",
            "mainCharacter": "A small business owner who sent a campaign, got traffic, and is only now — coffee in hand — understanding what the zero actually means.",
            "immutableRules": [
              "The number 50 must be visible in the opening frame — no reveal later",
              "No voice must explain what the product does — the structural observation does the work",
              "The kitchen must be real and specific, never generic or staged-looking"
            ],
            "viewerQuestion": "Wait — is my own analytics report a record of unanswered questions too?"
          },
          "direction_id": "d3",
          "product_role": "Enters at the final beat as the structural answer to the structural question — not a feature demo, but the thing that would have made the 50 mean something different.",
          "visual_world": "Bright morning kitchen — bleached oak table, cream linen placemat, single printed analytics sheet, red ballpoint pen, ceramic mug with black coffee, soft diffused window light. No screens except one laptop edge entering at the final frame. Tactile, domestic, specific.",
          "ending_payoff": "The same sheet, same number, but now the viewer cannot unsee what 50 actually means. The chat window beside it is already answering someone. The number is no longer neutral.",
          "emotional_tone": "Quiet alarm. The tone of someone who just realized a small mistake has been repeating for months.",
          "direction_label": "Retroactive Evidence",
          "funnel_fit_note": "Problem-aware: the owner knows something went wrong (zero leads from real traffic) but is only now diagnosing that her data was always evidence of the loss, not just a performance metric.",
          "production_risks": [
            "The wet-ink smear must read clearly on camera — ballpoint on matte paper, not glossy",
            "The kitchen must feel domestic and real without looking staged or stock",
            "The analytics sheet must show recognizable but non-branded data fields"
          ],
          "why_stops_scroll": "The extreme close-up on a wet-ink circle around a single number creates immediate pattern-recognition for anyone who has ever printed or stared at an analytics report. The smeared ink signals recency and human error — something just happened, someone just realized something.",
          "story_progression": "The camera pulls back slowly to reveal a small, bright kitchen table — morning light, coffee mug, a one-page analytics printout. The owner has circled '50 sessions' and written a question mark next to '0 leads.' She taps the page. The voiceover begins: not explaining, but thinking aloud — 'Fifty people came. Not one left a way to reach them.' Cut to a tight shot of her finger moving across the row of data: sessions, bounce rate, avg. time on page, zero conversions. Each column reread as a column of questions that were never answered. The reframe is spoken plainly: 'Every one of these sessions was someone who needed something. The page couldn't respond.' The product is introduced not as a solution pitch but as a structural observation: 'Your website already has the answers. It just never learned to give them.' Final frame: the same analytics sheet, same 50 — but now a small embedded chat window appears on a laptop beside it, already mid-conversation with a visitor. The number 50 no longer feels like a performance metric. It feels like a list of people.",
          "emotional_mechanism": "The viewer is made to reread a number they already know — their own analytics — and feel it shift meaning in real time. The emotional move is recognition followed by retrospective grief: the data was always there, the interpretation was wrong, and the loss was accumulating silently.",
          "opening_two_seconds": "Extreme close-up on a single printed number — '50' — circled in red ballpoint on a white sheet. The circle is fresh; the ink is still slightly wet. A thumb smears the edge of it. No context yet.",
          "characters_or_hero_objects": [
            "The printed analytics sheet",
            "The circled number 50",
            "The red ballpoint pen",
            "The ceramic coffee mug",
            "The bleached oak kitchen table"
          ]
        },
        {
          "title": "The Bounce Rate Was Always a Question Mark",
          "pacing": "Deliberate and unhurried. The marker stopping is the pivot — everything before is setup, everything after is reckoning.",
          "hook_line": "You've been defining this number wrong for years.",
          "viewpoint": "Observer-adjacent — we are close enough to feel like we are in the room, not watching from a distance.",
          "atmosphere": {
            "time_of_day": "Midday, bright natural light",
            "palette_intent": "Pale sage walls, white board, black marker, warm daylight — clean and professional with a single living-green accent from the plant",
            "lighting_intent": "Horizontal blind stripes across the wall — natural, directional, specific. No ring lights, no artificial warmth."
          },
          "concept_id": "c2",
          "fingerprint": {
            "metaphor": null,
            "hero_object": "The whiteboard with the crossed-out definition and the rewritten one beneath it",
            "core_premise": "Bounce rate has always been a count of unanswered questions — the consultant has been reporting the metric correctly and interpreting it catastrophically wrong.",
            "visual_world": "Small bright consulting room — pale sage walls, horizontal blind light, whiteboard on a rolling stand, fiddle-leaf fig, scattered printed reports.",
            "emotional_arc": "Confident instruction → pause → realization → expert humility → structural correction",
            "ending_mechanism": "The crossed-out definition stays on the board — permanent, visible proof of the reframe.",
            "opening_mechanism": "A hand writing on a whiteboard that stops mid-word — the interruption signals that something in the confident act has broken.",
            "product_mechanism": "Appears as the answer to the correct definition — the thing that removes bounce events caused by unanswered questions.",
            "creative_direction": "Works by surfacing evidence that already exists in data the audience already has — traffic numbers, session counts, bounce rates — and reframes that existing data as a record of unanswered questions rather than a record of visitors.",
            "palette_atmosphere": "Pale sage, white, black marker, warm daylight with horizontal blind shadows — clean, professional, quietly alive"
          },
          "central_idea": "A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the definition he just wrote is not 'visitor left without converting.' It is 'visitor had a question, no one answered, visitor left.' He rewrites the definition on the board. The data was always telling him this. He was teaching the wrong meaning.",
          "creative_dna": {
            "world": "A real, small consulting room — not a stage, not a studio. The whiteboard is a working tool, not a prop. The plant is alive.",
            "productRole": "The structural answer to the correctly defined metric — not a feature, but the thing that stops bounce events caused by silence.",
            "coreConflict": "The metric he has been using correctly — by the standard definition — has always contained information he was trained to ignore.",
            "endingIntent": "The viewer cannot look at a bounce rate number again without hearing 'unanswered question' instead.",
            "mainCharacter": "A marketing consultant who teaches analytics to clients and has just discovered a gap in his own foundational definition.",
            "immutableRules": [
              "The crossed-out definition must stay on the board at the end — never erased",
              "The consultant must not pitch the product — the board does the work",
              "The horizontal blind light must be present in every frame — it is the visual signature of this world"
            ],
            "viewerQuestion": "Have I been misdefining this metric too?"
          },
          "direction_id": "d3",
          "product_role": "Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean something different for every client, every campaign.",
          "visual_world": "Small bright consulting room — pale sage walls, horizontal blinds filtering afternoon light, one medium fiddle-leaf fig in the corner, whiteboard on a rolling stand, single low table with a laptop and scattered printed reports. Warm daylight. Analog and professional without being corporate.",
          "ending_payoff": "The crossed-out definition stays on the board. The viewer has just been taught that a metric they use every week has been carrying evidence of unanswered questions the whole time.",
          "emotional_tone": "Slow-dawning recognition. The quiet of a professional who just found a gap in their own expertise.",
          "direction_label": "Retroactive Evidence",
          "funnel_fit_note": "Problem-aware: the consultant knows his campaigns are delivering traffic without leads — the mechanism reframes the metric he already uses as the evidence he has been misreading.",
          "production_risks": [
            "The whiteboard writing must be legible at mobile viewing size — large block letters, high contrast marker",
            "The room must feel genuinely professional without looking like a stock set",
            "The marker-stop must feel spontaneous, not staged — timing is everything"
          ],
          "why_stops_scroll": "A hand stopping mid-word on a whiteboard is a scroll-stopper because it signals interruption — something went wrong in the middle of a confident act. The viewer needs to know what stopped the hand.",
          "story_progression": "The consultant is mid-explanation, marker in hand, facing a small whiteboard in a bright consulting room — daylight through horizontal blinds, pale walls, one plant. He has written 'Bounce Rate = Visitor left without converting.' He underlines it. Then pauses. Tilts his head. The voiceover is his internal monologue: 'But why did they leave?' He draws an arrow. Writes: 'Had a question.' Another arrow: 'No answer available.' Final arrow: 'Left.' He steps back. Looks at what he's written. The original definition is still there. He draws a single line through it. Rewrites beneath: 'Bounce Rate = Unanswered question, counted.' The camera holds on the board. He doesn't say anything for a moment. Then, quietly: 'I've been reporting this number to clients for three years.' Cut to his laptop — the product is already open, the AI assistant mid-conversation with a visitor. He closes the cap on his marker. The board stays in frame.",
          "emotional_mechanism": "The viewer watches someone who teaches this data for a living realize they have been teaching an incomplete definition. The mechanism is expert humility — if someone who instructs others on this metric missed this, the viewer certainly did too.",
          "opening_two_seconds": "A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written when the hand stops. Holds. The marker stays pressed to the board.",
          "characters_or_hero_objects": [
            "The whiteboard with the crossed-out definition",
            "The marker paused mid-stroke",
            "The rewritten definition",
            "The laptop with the AI assistant open"
          ]
        },
        {
          "title": "The Line Item That's Been Missing from Every Invoice",
          "pacing": "Steady and deliberate — the pacing of someone doing math. No rush. The pause at the blank line is the pivot.",
          "hook_line": "You calculated every cost. Except the one that's probably the biggest.",
          "viewpoint": "Close third-person — we watch her hands and her face in profile. We are beside her, not above her.",
          "atmosphere": {
            "time_of_day": "Late afternoon, clear natural light",
            "palette_intent": "Pale oak, pale yellow receipt pad, silver calculator, black ballpoint — warm neutrals with the yellow as the accent that carries the cost theme",
            "lighting_intent": "Clear, neutral afternoon window light — honest and precise, no atmosphere added"
          },
          "concept_id": "c3",
          "fingerprint": {
            "metaphor": null,
            "hero_object": "The blank line below the campaign total, labeled 'Unanswered visitor — cost per'",
            "core_premise": "The business owner has calculated every line item in her campaign budget except the cost of each visitor who arrived with a question and received no response — that line has always been blank, and the blank is not zero.",
            "visual_world": "Standing pale oak counter, pale yellow receipt pad, ballpoint pen, silver calculator, cold brew bottle — domestic bookkeeping, no office furniture.",
            "emotional_arc": "Methodical confidence → pause → blank → retrospective dread → structural correction",
            "ending_mechanism": "She writes a number in the blank. The viewer has never written theirs.",
            "opening_mechanism": "A hand writing confident numbers on a receipt pad that stops above a blank line — rhythm break as scroll-stopper.",
            "product_mechanism": "Appears beside the receipt pad as the thing that makes the blank line calculable — and the cost addressable for $69/month.",
            "creative_direction": "Applies familiar marketing math — cost per click, cost per lead — to a unit the audience has never calculated: the cost per unanswered question, revealing that every unanswered question has a calculable cost the business is currently treating as zero.",
            "palette_atmosphere": "Pale oak, pale yellow, silver, black ballpoint — warm neutral with yellow as the cost-logic accent"
          },
          "central_idea": "A business owner is itemizing her campaign spend at a standing desk — writing each cost on a receipt pad. Clicks: $180. Ad design: $95. Email platform: $40. She totals it. Then pauses, pen in hand, and adds one more line below the total: 'Cost per visitor who had a question and got no answer.' She stares at the blank space where the number should go. She has never calculated it. She does not know the formula. That is the problem.",
          "creative_dna": {
            "world": "A standing kitchen counter used as a bookkeeping surface — domestic, real, self-managed. The owner does her own campaign math. She is good at it. That is what makes the blank line devastating.",
            "productRole": "The line item that fills the blank — the thing that makes the cost per non-answer drop to a known, fixed, manageable number.",
            "coreConflict": "She has been rigorous with every other cost metric and has been treating the cost of silence as zero by default.",
            "endingIntent": "The viewer pulls up their own campaign spend and does the math for the first time.",
            "mainCharacter": "A self-managed small business owner who is meticulous about campaign ROI and has never once calculated what she paid per visitor who got no response.",
            "immutableRules": [
              "The blank line must be visible and labeled — it cannot be ambiguous",
              "The calculator must be used on camera — not a prop, a working tool",
              "The product must not be introduced until the blank is established and felt"
            ],
            "viewerQuestion": "What is my cost per unanswered visitor right now?"
          },
          "direction_id": "d6",
          "product_role": "Appears beside the receipt pad as the thing that would have made the blank line calculable — and much smaller. The AI assistant is already mid-conversation, proof that the cost is now addressable.",
          "visual_world": "Standing kitchen counter repurposed as a home office surface — pale oak, pale yellow receipt pad, ballpoint pen, small silver calculator, cold brew in a glass bottle, one stack of printed invoices. Afternoon light. No desk, no chair. Everything about the setting says 'I do my own books.'",
          "ending_payoff": "She writes a number in the blank. The viewer realizes they have never written that number either.",
          "emotional_tone": "Methodical dread. The tone of someone who is good with numbers realizing they have been calculating with an incomplete equation.",
          "direction_label": "Cost Per Non-Answer",
          "funnel_fit_note": "Problem-aware: the owner ran a paid campaign, knows her standard metrics, and has never applied campaign math to the cost of silence. The mechanism uses her own analytical vocabulary to reveal a gap she didn't know existed.",
          "production_risks": [
            "The receipt pad lines and numbers must be legible at mobile size",
            "The calculator must be practical and recognizable — not decorative",
            "The lighting must be afternoon-real, not golden or stylized"
          ],
          "why_stops_scroll": "A hand writing numbers fast and then stopping cold above a blank line — the visual rhythm break is the hook. Something in the confident act has failed. The viewer needs to know what the blank is.",
          "story_progression": "The owner stands at a high oak counter — receipt pad, pen, a small calculator, a cold brew in a glass bottle. She is methodical. She writes each campaign expense line by line, narrating quietly: 'Clicks, design, platform fee.' She draws a line, writes the total, circles it. Then she pauses. Looks at the pad. Picks up the pen again and writes, slowly, below the total line: 'Unanswered visitor — cost per.' Then she stares at the blank. The voiceover: 'I know my cost per click. I know my cost per lead. I have never once calculated what I paid to send someone to a page that couldn't respond to them.' She reaches for the calculator. Types in total spend. Types in total visitors. Stares at the result. Types in zero leads. The math does not work. The voiceover, quieter: 'I've been running this campaign for eight weeks.' Cut to the product — a laptop beside the receipt pad, the AI assistant answering a visitor question in real time. She picks up the pen and writes a number next to the blank line. Caps the pen. Tears off the sheet.",
          "emotional_mechanism": "The viewer watches someone apply a formula they know — campaign math — to a variable they have never included. The blank space where the cost-per-non-answer should go is the emotional center. It is not zero. It is unknown. That is worse.",
          "opening_two_seconds": "A hand writing dollar amounts on a pale yellow receipt pad — the pen moves fast, confident. The numbers stack. Then the pen slows. Stops above a blank line.",
          "characters_or_hero_objects": [
            "The pale yellow receipt pad",
            "The blank line below the total",
            "The silver calculator",
            "The pen hovering above the blank"
          ]
        },
        {
          "title": "The Fraction He's Never Divided",
          "pacing": "Confident opening, deliberate middle pause, quiet landing. The pace of a lesson that just changed direction.",
          "hook_line": "The formula everyone uses has always been missing a denominator.",
          "viewpoint": "Observer — we are in the room, watching from the client's side of the table.",
          "atmosphere": {
            "time_of_day": "Midday to early afternoon, bright natural light",
            "palette_intent": "White walls, pale ash table, black marker, ceramic coffee cups — clean and unadorned with no atmospheric styling",
            "lighting_intent": "One large window, natural and direct — the lesson is lit by available light, nothing added"
          },
          "concept_id": "c4",
          "fingerprint": {
            "metaphor": null,
            "hero_object": "The flip chart formula with the new blank denominator line below it",
            "core_premise": "The CPL formula every marketer uses has always been missing a denominator — the visitors who arrived, had a question, got no answer, and left with no record in the formula at all.",
            "visual_world": "Small bright un-corporate meeting room — white walls, pale ash table, flip chart on easel, ceramic coffee cups, printed handouts, one large window.",
            "emotional_arc": "Confident instruction → unexpected question → formula gap exposed → expert recalibration → structural correction",
            "ending_mechanism": "The formula now has a new line. The blank is filled. The viewer has never run this calculation.",
            "opening_mechanism": "A confident hand drawing a division symbol on a flip chart — the formula begins with authority before it is exposed as incomplete.",
            "product_mechanism": "Appears at the table edge filling the blank — the thing that makes the missing denominator calculable and the cost addressable.",
            "creative_direction": "Applies familiar marketing math — cost per click, cost per lead — to a unit the audience has never calculated: the cost per unanswered question, revealing that every unanswered question has a calculable cost the business is currently treating as zero.",
            "palette_atmosphere": "White, pale ash, black marker, ceramic warm tones — clean and unadorned, naturally lit"
          },
          "central_idea": "A consultant is teaching a small group of clients how to calculate campaign efficiency — he is at a flip chart, confident, drawing the CPL formula. He writes it large: Total Spend ÷ Leads = CPL. Then a client raises her hand and asks: 'What about the people who visited and left with a question you couldn't answer — where do they go in the formula?' The consultant stares at the formula. She is right. They are not in the formula. They have never been in the formula.",
          "creative_dna": {
            "world": "A genuine small meeting room — rented co-working space, not a boardroom. The lesson is real; the formula is one the audience uses. The room has coffee cups with lipstick marks and handouts with pen notes.",
            "productRole": "The answer to the blank denominator — the thing that makes the missing variable visible and the cost of silence fixed and known.",
            "coreConflict": "A formula the consultant has used and taught for years has always been incomplete — it accounts for every outcome except the most common one.",
            "endingIntent": "The viewer opens their own campaign spreadsheet and tries to add the missing line.",
            "mainCharacter": "A marketing consultant mid-lesson and a client who asks the one question that breaks the formula.",
            "immutableRules": [
              "The flip chart formula must be hand-written, not printed — it must feel like a live working document",
              "The client's question must come from off-frame initially — heard before seen",
              "The blank in the formula must stay blank until the product appears — never filled artificially early"
            ],
            "viewerQuestion": "Have I been dividing by the wrong number this whole time?"
          },
          "direction_id": "d6",
          "product_role": "Appears at the table edge as the thing that fills the blank — the answer to the formula the consultant just admitted was incomplete.",
          "visual_world": "Small bright meeting room — white walls, pale ash table, four mismatched chairs, flip chart on a black easel, coffee cups in ceramic, printed handouts, afternoon window light from one large window. Deliberately un-corporate — a rented co-working meeting room, not a boardroom.",
          "ending_payoff": "The formula on the flip chart now has a new line. The viewer has never run that calculation either.",
          "emotional_tone": "Collegial surprise that tips into professional humility. Not embarrassment — recalibration.",
          "direction_label": "Cost Per Non-Answer",
          "funnel_fit_note": "Problem-aware: the audience uses CPL and ROAS daily — the mechanism exposes that their own analytical framework has always had a missing variable, and the cost of that variable has been invisible.",
          "production_risks": [
            "The formula on the flip chart must be legible at mobile size — large letters, high contrast",
            "The meeting room must feel genuine and un-staged — no branded whiteboards or corporate signage",
            "The client asking the question must feel spontaneous, not scripted"
          ],
          "why_stops_scroll": "A confident hand drawing a formula that stops — then a question from off-camera that the expert cannot immediately answer. The authority-gap creates immediate tension.",
          "story_progression": "The consultant is at the front of a small, bright meeting room — four clients seated at a low table, flip chart on an easel, coffee cups, printed handouts. He is mid-lesson, writing 'Total Spend ÷ Leads Generated = CPL.' He underlines it, circles it, looks pleased. He is about to move on. One client — a woman with a printed handout, pen in hand — raises her hand. She asks, simply: 'What about the fifty people who came and left without a lead? Where do they go?' The consultant looks at the formula. Long pause. He writes above the formula: 'Visitors who left without an answer.' He draws an arrow to the CPL formula. He cannot make them fit. He tries. He crosses out one version. Tries again. The formula does not account for them — they are not leads, not conversions, not bounces in his framework. They are just gone from the math. He says, quietly: 'They've never been in the formula.' He writes a new line below: 'Cost per visitor who got no answer = Total Spend ÷ [blank].' He turns to the group. 'We've been dividing by the wrong denominator.' The product appears on a laptop at the edge of the table — the AI assistant is capturing a lead at that exact moment. He writes a number in the blank.",
          "emotional_mechanism": "The viewer watches an expert discover a gap in a formula they have trusted — the mechanism is expert-credibility collapse, followed by a clean structural correction. The client asking the question is the viewer's surrogate.",
          "opening_two_seconds": "A black marker drawing a large division symbol on a pale flip chart — the symbol is half-drawn when the frame cuts to the formula taking shape. The marker is confident. The sound of paper and marker is loud.",
          "characters_or_hero_objects": [
            "The flip chart formula with the blank denominator",
            "The client who asked the question",
            "The black marker pausing mid-calculation",
            "The laptop at the table edge showing a captured lead"
          ]
        },
        {
          "title": "The If Without a Then",
          "pacing": "Measured. The checklist moves at a satisfying rhythm until it stops. The stop is the story.",
          "hook_line": "You mapped every step. Except what happens when someone asks.",
          "viewpoint": "Close observer — we are at the desk beside them, reading the list as they read it.",
          "atmosphere": {
            "time_of_day": "Afternoon, skylight natural light",
            "palette_intent": "White painted brick, yellow legal pad, warm concrete, deep monstera green — bright and alive, high contrast between the white walls and the yellow paper",
            "lighting_intent": "Skylight daylight — directional, bright, no atmosphere added. The studio earns its light."
          },
          "concept_id": "c5",
          "fingerprint": {
            "metaphor": null,
            "hero_object": "The blank THEN after the arrow on the final conditional line",
            "core_premise": "The campaign logic was written as a complete IF/THEN chain — but the chain has always had a missing conditional for the visitor who arrives with a question, and that gap has been voiding the investment at the moment it matters most.",
            "visual_world": "Bright creative studio, white painted exposed brick, monstera, warm concrete floor, standing desk with yellow legal pad and two ceramic mugs.",
            "emotional_arc": "Satisfied checklist → colleague's question → logical gap exposed → structural incompleteness → conditional completed",
            "ending_mechanism": "She writes the THEN. The list is complete. The workflow now accounts for the visitor who asks.",
            "opening_mechanism": "A finger tracing down a hand-written IF/THEN list on a yellow legal pad and stopping — the stop creates immediate logical tension.",
            "product_mechanism": "Appears as the THEN that completes the conditional — the structural answer to the missing line in the workflow.",
            "creative_direction": "Frames the entire problem as a logical conditional — IF a visitor has a question, THEN something must respond — and exposes that the second half of the conditional was never written. The business built the IF and left the THEN blank.",
            "palette_atmosphere": "White painted brick, yellow legal pad, monstera green, warm concrete — bright, energetic, alive"
          },
          "central_idea": "A developer is reviewing a piece of pseudo-logic written on a notepad — not code, but plain English business logic. The list reads like a workflow: 'If someone clicks the ad → they land on the page. If they land on the page → they see the offer. If they see the offer → they convert.' She reads it aloud, satisfied. Then her colleague leans over and points to the bottom of the list: 'What happens if they have a question?' She looks at the list. There is no line for that. The IF exists. The THEN is blank. The workflow assumed a visitor who never asks anything.",
          "creative_dna": {
            "world": "A working creative studio — not a startup aesthetic, not a lifestyle set. Two people who are good at their jobs discovering a gap neither of them thought to write.",
            "productRole": "The THEN that was never written — the line that makes the conditional fire instead of returning nothing.",
            "coreConflict": "The workflow is logically complete for a frictionless visitor and structurally silent for any visitor who hesitates or asks.",
            "endingIntent": "The viewer maps their own campaign workflow and finds the missing conditional.",
            "mainCharacter": "A campaign planner who mapped every logical step of a visitor journey and never wrote the line for a visitor who needs an answer.",
            "immutableRules": [
              "The IF/THEN format must be hand-written, not typed or printed",
              "The blank THEN must stay blank until the product appears",
              "The colleague must ask the question — the planner cannot discover the gap alone"
            ],
            "viewerQuestion": "Did I ever write a THEN for the visitor who has a question?"
          },
          "direction_id": "d4",
          "product_role": "Appears as the THEN that was always missing — the line that completes the conditional and makes the workflow structurally whole.",
          "visual_world": "Bright creative studio with white-painted exposed brick, large potted monstera, warm concrete floor, standing desk surface with yellow legal pad, two ceramic coffee mugs, afternoon light from skylights. Energetic but not trendy — a working studio, not a lifestyle set.",
          "ending_payoff": "She writes the THEN. The list is now complete. The viewer looks at their own campaign workflow and wonders if they ever wrote that line.",
          "emotional_tone": "Calm recognition with an undercurrent of 'how did we miss this.' Not panic — architectural clarity.",
          "direction_label": "The Conditional That Never Fired",
          "funnel_fit_note": "Problem-aware: the audience recognises the campaign workflow format — the mechanism exposes that a logical gap in the workflow has been silently voiding the investment at the moment of visitor hesitation.",
          "production_risks": [
            "The handwriting on the legal pad must be legible at mobile viewing size",
            "The two-person dynamic must feel collaborative, not scripted — the colleague's question should feel spontaneous",
            "Skylights must be practical and real-looking — no artificial ceiling light standing in for skylights"
          ],
          "why_stops_scroll": "A finger tracing down a checklist and stopping — the viewer's brain immediately wants to know which line caused the stop. The IF/THEN format is instantly legible and creates immediate logical tension.",
          "story_progression": "Two colleagues at a standing desk — bright, plant-filled studio, exposed brick painted white, afternoon light. One is reviewing a hand-written campaign logic map on a yellow legal pad. She reads each line aloud, satisfied: 'If they click → landing page. If they land → see the offer. If they see the offer → contact form.' She draws a checkmark beside each line. She is almost done. Her colleague, leaning over her shoulder, reads the list and then asks quietly: 'What if they have a question before they fill out the form?' She looks at the pad. Reads the list again. There is no IF for that scenario. She picks up the pen. Writes: 'If visitor has a question →' and then stops. Stares at the blank after the arrow. She has no THEN. The page has no THEN. The entire campaign workflow assumed a visitor who needed no clarification, had no hesitation, required no response. She looks at the colleague. He shrugs: 'We never wrote that line.' Cut to the product — a laptop open beside the legal pad, the AI assistant mid-answer to a visitor question. She writes the THEN on the pad. The IF finally has a THEN.",
          "emotional_mechanism": "The viewer watches a logical system they recognise — a campaign workflow — exposed as structurally incomplete. The incompleteness is not a mistake in execution; it is a missing line in the logic itself. The IF was written. The THEN was never considered.",
          "opening_two_seconds": "A hand-written list of IF/THEN statements on a yellow legal pad — the handwriting is clean and deliberate. The camera is tight on the paper. A finger traces down the list and stops.",
          "characters_or_hero_objects": [
            "The yellow legal pad with the IF/THEN list",
            "The blank after the arrow on the final line",
            "The two colleagues at the standing desk",
            "The pen that wrote the incomplete conditional"
          ]
        },
        {
          "title": "The Instruction That Assumed Too Much",
          "pacing": "Warm and unhurried. The instruction sheet is read at a real pace. The new hire's question is casual — not dramatic.",
          "hook_line": "Every scenario was covered. Except the one that happens most.",
          "viewpoint": "Close third-person — we are behind the counter with them, reading the sheet as they read it.",
          "atmosphere": {
            "time_of_day": "Morning, soft front-window light",
            "palette_intent": "Pale terrazzo, warm blush walls, eucalyptus green, white laminated sheet — soft and professional with a single living-green accent",
            "lighting_intent": "Natural front window light — soft, diffused, clean. The salon earns its brightness from the street."
          },
          "concept_id": "c6",
          "fingerprint": {
            "metaphor": null,
            "hero_object": "The laminated instruction sheet with the blank reverse side — and the website URL visible on the window behind it",
            "core_premise": "A thorough salon owner built an IF/THEN process for every customer touchpoint and never wrote a line for the website — the most visible channel, printed on her own front window, was assumed to handle itself.",
            "visual_world": "Bright beauty salon — pale terrazzo, warm blush walls, eucalyptus in ceramic, large window with URL vinyl, laminated sheet, one laptop.",
            "emotional_arc": "Thorough preparation → new hire's simple question → omission discovered → structural incompleteness → conditional written and completed",
            "ending_mechanism": "A new line written at the bottom of the instruction sheet. The website is now in the process.",
            "opening_mechanism": "A laminated instruction sheet slid across a pale terrazzo counter — the crinkle of plastic and the institutional format create immediate recognition.",
            "product_mechanism": "Appears as the THEN written at the bottom of the instruction sheet — the line that makes the website conditional fire instead of returning nothing.",
            "creative_direction": "Frames the entire problem as a logical conditional — IF a visitor has a question, THEN something must respond — and exposes that the second half of the conditional was never written. The business built the IF and left the THEN blank.",
            "palette_atmosphere": "Pale terrazzo, warm blush, eucalyptus green, white laminated paper — soft and professional, naturally lit"
          },
          "central_idea": "A salon owner is training a new front-desk hire using a laminated instruction sheet — every scenario is covered in IF/THEN format, printed neatly. 'If a client calls → answer and book.' 'If a client walks in → greet and seat.' 'If a client emails → reply within two hours.' The new hire reads it carefully, nods, then looks up: 'What do I do if someone asks a question on the website at 11pm?' The owner takes the sheet. Reads it. The website is not in the list. The IF was never written. The website was assumed to handle itself.",
          "creative_dna": {
            "world": "A real beauty salon on a bright morning — the owner is training her first hire and discovering a gap through the hire's eyes. The laminated sheet is a real document, not a prop.",
            "productRole": "The THEN that completes the website conditional — the line that was missing from the instruction sheet.",
            "coreConflict": "Her process is comprehensive and her website is her most visible asset — and she never connected them.",
            "endingIntent": "The viewer pulls out their own operations process — written or mental — and checks whether the website has a conditional.",
            "mainCharacter": "A careful, thorough salon owner who built a complete operations process and unknowingly excluded the channel that handles the most after-hours traffic.",
            "immutableRules": [
              "The instruction sheet must be laminated — not a notebook, not a notepad. The lamination signals an established, finished document being exposed as incomplete.",
              "The new hire must ask the question innocently — not as a gotcha, not with drama",
              "The website URL on the window must be visible in the frame where the omission is discovered"
            ],
            "viewerQuestion": "Is my website in my process? Did I ever write a THEN for it?"
          },
          "direction_id": "d4",
          "product_role": "Appears as the line that was missing from the instruction sheet — the THEN that makes the website conditional fire instead of returning silence.",
          "visual_world": "Bright beauty salon — pale terrazzo counter, ceramic vase with eucalyptus stems, warm blush walls, large front window with URL vinyl lettering, laminated instruction sheet, one laptop. Morning light, clean and professional without being clinical.",
          "ending_payoff": "A new line is written at the bottom of the instruction sheet. The website is finally in the process. The viewer checks their own process.",
          "emotional_tone": "Warm recognition with a quiet sting. The owner is not careless — she is careful. That is what makes the gap hurt.",
          "direction_label": "The Conditional That Never Fired",
          "funnel_fit_note": "Problem-aware: the salon owner has built a thorough operations process and has unknowingly excluded the website from it — the mechanism exposes the structural omission through the eyes of someone who is seeing the instruction sheet for the first time.",
          "production_risks": [
            "The laminated sheet must be legible at mobile size — large printed text, high contrast",
            "The terrazzo counter must be practical and real, not a stock-set version",
            "The URL vinyl on the window must be visible but not distracting from the instruction sheet in the foreground"
          ],
          "why_stops_scroll": "A laminated instruction sheet being slid across a counter — the lamination sound and the institutional format of the document create immediate recognition for any small business owner who has ever written a training sheet.",
          "story_progression": "A beauty salon — pale terrazzo counter, eucalyptus in a ceramic vase, natural light from a large front window. The owner is training her first front-desk hire. She slides a laminated instruction sheet across the counter — it is thorough, organized, formatted in clean IF/THEN pairs. The new hire reads it top to bottom, nodding. Then she looks up: 'What about the website? Like, if someone messages or asks something there at night?' The owner reaches across and takes the sheet. Reads it. Phone: covered. Walk-ins: covered. Email: covered. Instagram DMs: covered. Website: not on the list. She turns the sheet over. Blank. She looks at the front window — her website URL is printed in vinyl on the glass. The website is the first thing anyone sees. And it has no line on the instruction sheet. The voiceover: 'I built a process for everything I could see. The website was invisible to me — even though it was right there on the window.' Cut to a laptop on the terrazzo counter — the AI assistant is answering a visitor question in real time, a question that arrived at 11:47pm. The owner picks up a pen and writes a new line at the bottom of the instruction sheet. 'If a visitor has a question on the website →' She looks at the laptop. Writes the THEN.",
          "emotional_mechanism": "The viewer watches a thorough, careful business owner discover that the most visible channel — the website printed on her own window — was the only one without a process. The thoroughness of the list makes the omission more devastating, not less.",
          "opening_two_seconds": "A laminated instruction sheet slid across a pale counter — the plastic crinkles. The camera is tight on the printed text. A finger begins at the top of the list.",
          "characters_or_hero_objects": [
            "The laminated instruction sheet",
            "The blank reverse side",
            "The website URL in vinyl on the front window",
            "The new hire who asked the question",
            "The laptop on the terrazzo counter"
          ]
        }
      ],
      "direction_attempts": 1,
      "directions_selected": [
        {
          "label": "Retroactive Evidence",
          "why_fits": "The small business owner who woke up to zero leads already has analytics showing 50 visitors. The mechanism reframes those 50 as 50 moments of silence — questions asked to a website that could not respond. Directly addresses offline unavailability and the invisible nature of the loss without introducing new data.",
          "mechanism": "Works by surfacing evidence that already exists in data the audience already has — traffic numbers, session counts, bounce rates — and reframes that existing data as a record of unanswered questions rather than a record of visitors. The mechanism converts familiar, ignored numbers into retrospective proof of a recurring loss the audience has been looking at without recognizing.",
          "direction_id": "d3",
          "diversity_note": "Unlike the invisible-loss direction, this does not focus on the absence of signal or the inability to measure. It works in the opposite direction — the signal was always there, it was simply misread. The mechanism is about reinterpretation of existing evidence, not the absence of evidence.",
          "anti_repetition_note": "Recent directions include invisible-failure-without-signal and dormant-solution-in-existing-infrastructure. This is neither — it is about data that was visible and present but categorically misunderstood. The mechanism is epistemic reframing of existing knowledge, not detection failure or dormant activation."
        },
        {
          "label": "Cost Per Non-Answer",
          "why_fits": "The audience ran a paid campaign — they know CPL, CPC, ROAS. They have never calculated the cost of each visitor who left without an answer. The mechanism uses their own analytical vocabulary to expose a gap in their measurement framework. Fits the overlooked-detail angle precisely — the cost was always there, the formula was never applied.",
          "mechanism": "Applies familiar marketing math — cost per click, cost per lead — to a unit the audience has never calculated: the cost per unanswered question. The mechanism works by extending existing analytical frameworks the audience already uses into a blind spot they have never measured, revealing that every unanswered question has a calculable cost that the business is currently treating as zero.",
          "direction_id": "d6",
          "diversity_note": "Unlike the retroactive-evidence direction, this is not about reinterpreting existing data — it is about applying a known formula to a unit that was never entered into the formula. The mechanism is mathematical extension rather than categorical reframing.",
          "anti_repetition_note": "No recent direction uses cost-per-unit or marketing-math extension logic. Invisible-loss direction focuses on the absence of signal, not the calculable cost of each instance. This mechanism introduces a new analytical frame that has not appeared in recent directions."
        },
        {
          "label": "The Conditional That Never Fired",
          "why_fits": "Service businesses and consultants often assume their website handles visitor questions because it contains information — but information is not a response mechanism. The conditional-logic framing makes the structural gap feel precise and correctable rather than vague. Fits problem-aware stage where the audience knows something went wrong but hasn't diagnosed the exact structural failure.",
          "mechanism": "Frames the entire problem as a logical conditional — IF a visitor has a question, THEN something must respond — and exposes that the second half of the conditional was never written. The mechanism works through logical incompleteness: a rule was assumed to exist, the rule was never actually created, and the system behaved accordingly. The business built the IF and left the THEN blank.",
          "direction_id": "d4",
          "diversity_note": "Unlike preparation-gap logic, this is not about two types of readiness — it is about a logical rule that was assumed complete but was structurally unfinished. The mechanism is architectural and conditional rather than comparative.",
          "anti_repetition_note": "No recent direction uses logical/conditional framing. This avoids threshold logic, staffing logic, chain logic, and measurement logic. The IF/THEN incompleteness mechanism is a distinct structural frame not present in any listed recent direction."
        }
      ],
      "dna_repair_attempts": 0,
      "direction_evaluation": {
        "source": "critic",
        "ranking": [
          "d3",
          "d6",
          "d4",
          "d1",
          "d2",
          "d7",
          "d5"
        ],
        "version": "creative-direction-eval@1",
        "evaluations": [
          {
            "scores": {
              "funnel_fit": 8,
              "originality": 7,
              "strategy_fit": 8,
              "anti_repetition": 7,
              "emotional_range": 7,
              "concept_potential": 8,
              "diversity_vs_peers": 7,
              "production_feasibility": 9
            },
            "vetoes": [],
            "critic_notes": "Strong mechanism — the effort-ratio inversion is visceral and relatable for anyone who has run a paid campaign. The asymmetry between campaign effort and retention effort is genuinely compelling. However, it edges close to the 'parallel tracks' recent direction (imagined vs. actual effort) and the 'investment stopping short' direction, even though the framing is backward-looking rather than forward-looking. The distinction holds but is subtle. High production feasibility — the contrast can be rendered visually or numerically in seconds. Emotional register is frustration-plus-relief, which is appropriate for problem-aware stage.",
            "direction_id": "d1"
          },
          {
            "scores": {
              "funnel_fit": 8,
              "originality": 7,
              "strategy_fit": 8,
              "anti_repetition": 7,
              "emotional_range": 6,
              "concept_potential": 7,
              "diversity_vs_peers": 6,
              "production_feasibility": 8
            },
            "vetoes": [],
            "critic_notes": "The chain-completion logic is clean and universally legible — audiences immediately understand that a broken final link nullifies the chain. The mechanism is procedural and satisfying. However, it is conceptually adjacent to 'investment stopping short' (resource traveling most of the distance) and 'preparation gap' (readiness for arrival vs. readiness for interaction). The distinction is real but the emotional and visual territory overlaps. Lower diversity score against peers as a result. Works well for the problem-aware funnel stage but may not produce the most distinctive creative output given the crowded adjacent space.",
            "direction_id": "d2"
          },
          {
            "scores": {
              "funnel_fit": 9,
              "originality": 9,
              "strategy_fit": 9,
              "anti_repetition": 9,
              "emotional_range": 8,
              "concept_potential": 9,
              "diversity_vs_peers": 9,
              "production_feasibility": 8
            },
            "vetoes": [],
            "critic_notes": "Exceptionally strong. The epistemic reframe — data the audience already owns, already stares at, already considers normal, suddenly reread as a ledger of unanswered questions — is genuinely novel among the directions listed and among recent directions. It does not require a story, a character, or a hypothetical. It works directly on the audience's existing reality. The emotional register is quiet dread followed by recognition, which is highly effective for problem-aware audiences who haven't yet named the problem. High production feasibility: the mechanism works in a single screen of analytics data with a reframe caption. Distinct from invisible-loss (which is about absence of signal) and dormant-solution (which is about activation). This is categorical misreading of present data — a genuinely different epistemic mechanism.",
            "direction_id": "d3"
          },
          {
            "scores": {
              "funnel_fit": 8,
              "originality": 8,
              "strategy_fit": 8,
              "anti_repetition": 9,
              "emotional_range": 6,
              "concept_potential": 8,
              "diversity_vs_peers": 8,
              "production_feasibility": 7
            },
            "vetoes": [],
            "critic_notes": "The IF/THEN conditional framing is intellectually precise and genuinely distinct from every recent direction. It will land strongly with SaaS, software, and technically-minded consulting audiences who think in logical structures. The mechanism makes the gap feel architectural and correctable rather than emotional or narrative — which is a useful register for problem-aware audiences who are in diagnostic mode. Slightly lower emotional range because the conditional frame is cool and analytical rather than visceral. Production feasibility is moderate — the IF/THEN structure needs careful visual execution to avoid feeling abstract or dry. Strong anti-repetition score: no recent direction uses this frame.",
            "direction_id": "d4"
          },
          {
            "scores": {
              "funnel_fit": 7,
              "originality": 7,
              "strategy_fit": 8,
              "anti_repetition": 8,
              "emotional_range": 7,
              "concept_potential": 7,
              "diversity_vs_peers": 7,
              "production_feasibility": 8
            },
            "vetoes": [],
            "critic_notes": "Temporal displacement is a legitimate and distinct mechanism — the distinction from decision-site displacement (spatial/locational) holds clearly. The 'borrowed clock' metaphor is evocative. However, the mechanism is somewhat expected for this pain point — 24/7 availability is a well-worn framing in the chatbot/live chat category, and the temporal mismatch angle risks feeling familiar even if the specific metaphor is fresh. The scenario (afternoon traffic, owner offline, morning with zero leads) maps perfectly, which is a strength, but the concept potential is capped by category familiarity. Solid but not the strongest differentiator in this set.",
            "direction_id": "d5"
          },
          {
            "scores": {
              "funnel_fit": 8,
              "originality": 9,
              "strategy_fit": 9,
              "anti_repetition": 9,
              "emotional_range": 7,
              "concept_potential": 9,
              "diversity_vs_peers": 9,
              "production_feasibility": 8
            },
            "vetoes": [],
            "critic_notes": "Highly distinctive and strategically sharp. The cost-per-non-answer mechanism extends the audience's own analytical vocabulary — CPL, CPC, ROAS — into a blind spot they have never entered into their spreadsheet. This is a powerful move for an audience that already thinks in marketing math. The emotional register is less visceral than some directions but the intellectual punch is high: the audience will feel the gap between what they measure and what they've been ignoring. No recent direction uses this frame. Strong anti-repetition. Production feasibility is good — a simple formula visual with a blank cell where the cost-per-non-answer should be is immediately legible. Particularly strong for the marketing agency, SaaS, and consultant segments who live in performance metrics.",
            "direction_id": "d6"
          },
          {
            "scores": {
              "funnel_fit": 7,
              "originality": 7,
              "strategy_fit": 7,
              "anti_repetition": 8,
              "emotional_range": 8,
              "concept_potential": 7,
              "diversity_vs_peers": 7,
              "production_feasibility": 8
            },
            "vetoes": [],
            "critic_notes": "The asymmetric handshake is relational and emotionally resonant — the social-contract logic makes the loss feel interpersonal rather than systemic, which is a useful register for local service businesses and consultants who think in relationship terms. However, it is conceptually adjacent to the threshold/empty-room direction (visitor arrived, nothing was there) and the competitive-transfer direction (visitor extended intent, it went elsewhere). The distinction is real but the emotional territory overlaps with multiple recent directions. Lower concept potential as a result — the mechanism is sound but the creative ceiling is lower than d3 or d6.",
            "direction_id": "d7"
          }
        ],
        "selection_reason": "d3 (Retroactive Evidence) is the strongest single direction: it operates on data the audience already owns, reframes it categorically without introducing new information, and produces quiet dread followed by recognition — a powerful problem-aware register. It is maximally distinct from all recent directions. d6 (Cost Per Non-Answer) is the strongest complement: it uses the audience's own analytical vocabulary to expose a measurement blind spot, works through mathematical extension rather than narrative or spatial logic, and targets the analytically-minded segments (SaaS, agencies, consultants, marketers) with precision. It is mechanistically orthogonal to d3. d4 (The Conditional That Never Fired) rounds out the set with a third distinct mechanism — logical/architectural incompleteness — that reaches the technically-minded and diagnostically-oriented segments of the audience who are actively trying to name what went wrong. Together, the three directions cover epistemic reframing, analytical extension, and logical diagnosis — three genuinely different communication mechanisms with no meaningful overlap between them or with recent directions.",
        "selected_direction_ids": [
          "d3",
          "d6",
          "d4"
        ]
      },
      "directions_generated": [
        {
          "label": "Effort Mismatch Inversion",
          "why_fits": "The audience ran a campaign — a deliberate, costly, effortful act — and lost visitors to a gap that costs $69/month to close. The effort inversion makes the loss feel preventable and the fix feel proportionally small. Targets the pain of wasted campaign spend and offline unavailability.",
          "mechanism": "Exposes a radical imbalance between the effort required to generate a visitor and the effort required to retain one — revealing that the harder, more expensive action was completed successfully while the trivially easy action was never taken. The mechanism works through effort-ratio logic: the hard part was done, the easy part was skipped, and the outcome is determined entirely by the skipped part.",
          "direction_id": "d1",
          "diversity_note": "Unlike the parallel-tracks mechanism, this is not about imagined vs. actual complexity of the solution — it is about the asymmetric effort already expended on acquisition versus the near-zero effort required for retention. The comparison is backward-looking at what was already done, not forward-looking at what would be required.",
          "anti_repetition_note": "Recent directions cover preparation gaps, staffing gaps, threshold logic, and investment-stopping-short. This mechanism is distinctly about effort-ratio between two already-completed or never-attempted actions, not about what was built vs. what was left empty."
        },
        {
          "label": "Sequence Completion Failure",
          "why_fits": "The business owner ran a campaign, drove traffic, got visitors to the site — every step of the acquisition chain worked. The conversion step had no mechanism. The chain-failure framing makes the single missing link feel urgent and fixable without invalidating the work already done.",
          "mechanism": "Presents a multi-step sequence in which every step was executed correctly and in order — and the final step, the one that converts the sequence into an outcome, was structurally absent. The mechanism communicates through chain logic: each link held, the last link was missing, and a complete chain with one missing link produces the same result as no chain at all.",
          "direction_id": "d2",
          "diversity_note": "Unlike the investment-stopping-short direction, this is not about resource allocation halting before the final destination — it is about a correctly sequenced process that fails at the final logical step. The emphasis is on sequence integrity and completion, not resource flow.",
          "anti_repetition_note": "Does not use spatial/threshold logic, staffing-role logic, or invisible-loss logic. The mechanism is procedural and sequential — the chain metaphor is distinct from pipe/flow, room/threshold, or role/vacancy framings used in recent directions."
        },
        {
          "label": "Retroactive Evidence",
          "why_fits": "The small business owner who woke up to zero leads already has analytics showing 50 visitors. The mechanism reframes those 50 as 50 moments of silence — questions asked to a website that could not respond. Directly addresses offline unavailability and the invisible nature of the loss without introducing new data.",
          "mechanism": "Works by surfacing evidence that already exists in data the audience already has — traffic numbers, session counts, bounce rates — and reframes that existing data as a record of unanswered questions rather than a record of visitors. The mechanism converts familiar, ignored numbers into retrospective proof of a recurring loss the audience has been looking at without recognizing.",
          "direction_id": "d3",
          "diversity_note": "Unlike the invisible-loss direction, this does not focus on the absence of signal or the inability to measure. It works in the opposite direction — the signal was always there, it was simply misread. The mechanism is about reinterpretation of existing evidence, not the absence of evidence.",
          "anti_repetition_note": "Recent directions include invisible-failure-without-signal and dormant-solution-in-existing-infrastructure. This is neither — it is about data that was visible and present but categorically misunderstood. The mechanism is epistemic reframing of existing knowledge, not detection failure or dormant activation."
        },
        {
          "label": "The Conditional That Never Fired",
          "why_fits": "Service businesses and consultants often assume their website handles visitor questions because it contains information — but information is not a response mechanism. The conditional-logic framing makes the structural gap feel precise and correctable rather than vague. Fits problem-aware stage where the audience knows something went wrong but hasn't diagnosed the exact structural failure.",
          "mechanism": "Frames the entire problem as a logical conditional — IF a visitor has a question, THEN something must respond — and exposes that the second half of the conditional was never written. The mechanism works through logical incompleteness: a rule was assumed to exist, the rule was never actually created, and the system behaved accordingly. The business built the IF and left the THEN blank.",
          "direction_id": "d4",
          "diversity_note": "Unlike preparation-gap logic, this is not about two types of readiness — it is about a logical rule that was assumed complete but was structurally unfinished. The mechanism is architectural and conditional rather than comparative.",
          "anti_repetition_note": "No recent direction uses logical/conditional framing. This avoids threshold logic, staffing logic, chain logic, and measurement logic. The IF/THEN incompleteness mechanism is a distinct structural frame not present in any listed recent direction."
        },
        {
          "label": "Borrowed Clock",
          "why_fits": "The scenario is explicit — the campaign ran during the day, visitors arrived in the afternoon, the owner was offline, zero leads by morning. The time-displacement mechanism makes the pain visceral without requiring a story: the mismatch between business hours and visitor intent is the entire failure. Directly targets the 24/7 support pain point.",
          "mechanism": "Exposes the mismatch between when the business owner is available and when visitors arrive — framing the entire problem as a time-ownership conflict in which the business is operating on its own schedule while visitor intent operates on a completely different one. The mechanism works through temporal displacement: the business borrowed its own hours from the visitor's clock and left the visitor's clock unattended.",
          "direction_id": "d5",
          "diversity_note": "Unlike the decision-site displacement direction, this is not about where the visitor makes their decision — it is about when the business is present versus when the visitor arrives. The mechanism is temporal rather than spatial or locational.",
          "anti_repetition_note": "Decision-site displacement in recent directions focuses on location of the decision (the website, late at night, alone). This mechanism focuses on time ownership and schedule conflict rather than where the decision happens. Temporal mismatch as a mechanism has not appeared in recent directions."
        },
        {
          "label": "Cost Per Non-Answer",
          "why_fits": "The audience ran a paid campaign — they know CPL, CPC, ROAS. They have never calculated the cost of each visitor who left without an answer. The mechanism uses their own analytical vocabulary to expose a gap in their measurement framework. Fits the overlooked-detail angle precisely — the cost was always there, the formula was never applied.",
          "mechanism": "Applies familiar marketing math — cost per click, cost per lead — to a unit the audience has never calculated: the cost per unanswered question. The mechanism works by extending existing analytical frameworks the audience already uses into a blind spot they have never measured, revealing that every unanswered question has a calculable cost that the business is currently treating as zero.",
          "direction_id": "d6",
          "diversity_note": "Unlike the retroactive-evidence direction, this is not about reinterpreting existing data — it is about applying a known formula to a unit that was never entered into the formula. The mechanism is mathematical extension rather than categorical reframing.",
          "anti_repetition_note": "No recent direction uses cost-per-unit or marketing-math extension logic. Invisible-loss direction focuses on the absence of signal, not the calculable cost of each instance. This mechanism introduces a new analytical frame that has not appeared in recent directions."
        },
        {
          "label": "The Asymmetric Handshake",
          "why_fits": "Visitors who arrived from the campaign were actively interested — they clicked, they came, they looked. They extended intent. The website had no mechanism to meet that intent. The asymmetric-handshake framing makes the loss feel relational and concrete rather than abstract, without requiring a narrative or character.",
          "mechanism": "Frames the visitor-website interaction as a handshake in which one party extended their hand — the visitor arrived with a question, with intent, with readiness to engage — and the other party's hand was simply not there. The mechanism works through social-contract logic: the visitor fulfilled their part of the exchange, the business structurally could not fulfill its part, and the interaction ended before it could begin.",
          "direction_id": "d7",
          "diversity_note": "Unlike the threshold/empty-room direction, this is not about spatial arrival and finding nothing — it is about a transactional exchange that required two parties and only one showed up. The mechanism is relational and contractual rather than spatial.",
          "anti_repetition_note": "No recent direction uses social-contract or asymmetric-exchange logic. Threshold logic, staffing logic, chain logic, and conditional logic are all distinct from the handshake/mutual-participation frame introduced here."
        }
      ],
      "direction_eval_attempts": 1,
      "direction_memory_filter_passes": [
        {
          "pass": 1,
          "rejected": [],
          "fallback_used": false,
          "rejected_count": 0,
          "survivor_count": 7,
          "generated_count": 7
        }
      ],
      "memory_filter_fallback_all_rejected": false
    },
    "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: warm and approachable. Delivery: measured, credible. Language: en.",
    "downgrade_rules": [],
    "narrative_beats": {
      "beats": [
        {
          "role": "HOOK",
          "whatChanged": "",
          "whyContinue": "Have I been misdefining this metric too?",
          "sourceFields": [
            "openingSituation",
            "hookLine",
            "expectedViewerQuestion"
          ],
          "viewerLearns": "A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written when the hand stops. Holds. The marker…",
          "comprehension": {
            "viewer_question": "Have I been misdefining this metric too?",
            "viewer_expectation": "The explanation is coming.",
            "viewer_understands": "Something unusual is happening: A hand writing 'BOUNCE RATE' in large block letters on a whiteboard"
          },
          "informationKey": "anomaly|open|hand_writing_bounce_rate",
          "modeBeatLabels": [
            "unexpected_fact"
          ]
        },
        {
          "role": "SETUP",
          "whatChanged": "After the hook meaning unit lands: name the problem world (Slow-dawning recognition. The quiet of a professional who just found a gap in their own expertise. v…",
          "whyContinue": "Stakes become clear — A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the definition he j…",
          "sourceFields": [
            "storyProgression",
            "coreIdea",
            "emotionalReaction"
          ],
          "viewerLearns": "The consultant is mid-explanation, marker in hand, facing a small whiteboard in a bright consulting room — daylight through horizontal blinds, pale walls, one…",
          "comprehension": {
            "viewer_question": "Why is this happening / what does it cost?",
            "viewer_expectation": "Someone should solve this — or stakes will rise.",
            "viewer_understands": "The problem is: A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the d…"
          },
          "informationKey": "problem_named|open|consultant_explanation_marker_hand",
          "modeBeatLabels": [
            "implication"
          ]
        },
        {
          "role": "ESCALATION",
          "whatChanged": "Failure / consequence deepens — not a restatement of the setup.",
          "whyContinue": "Viewer needs the fix: Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean something different fo…",
          "sourceFields": [
            "storyProgression",
            "visualPromise",
            "productConnection"
          ],
          "viewerLearns": ", quietly: 'I've been reporting this number to clients for three years.' Cut to his laptop — the product is already open, the AI assistant mid-conversation wit…",
          "comprehension": {
            "viewer_question": "Can this be fixed?",
            "viewer_expectation": "Show the solution.",
            "viewer_understands": "The business is losing opportunities: , quietly"
          },
          "informationKey": "cost_rising|open|quietly_been_reporting_number",
          "modeBeatLabels": [
            "proof"
          ]
        },
        {
          "role": "RESOLUTION",
          "whatChanged": "Problem turns into solution / outcome: The crossed-out definition stays on the board. The viewer has just been taught that a metric they use every week has bee…",
          "whyContinue": "The crossed-out definition stays on the board. The viewer has just been taught that a metric they use every week has been carrying evidence of unanswered quest…",
          "sourceFields": [
            "productConnection",
            "ending"
          ],
          "viewerLearns": "Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean something different for every client, every…",
          "comprehension": {
            "viewer_question": "none",
            "viewer_expectation": "Finished.",
            "viewer_understands": "The product solves this: Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean…"
          },
          "informationKey": "solution_shown|closed|appears_structural_answer_newly",
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
            "sceneSummary": "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, tight crop on hands and whiteboard surfac…",
            "comprehension": {
              "viewer_question": "Have I been misdefining this metric too?",
              "viewer_expectation": "The explanation is coming.",
              "viewer_understands": "Something unusual is happening: A hand writing 'BOUNCE RATE' in large block letters on a whiteboard"
            },
            "informationKey": "anomaly|open|hand_writing_bounce_rate",
            "durationSeconds": 6.07
          },
          {
            "role": "SETUP",
            "index": 1,
            "share": 0.218,
            "sceneSummary": "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot. The marketing consultant is seen from beh…",
            "comprehension": {
              "viewer_question": "Why is this happening / what does it cost?",
              "viewer_expectation": "Someone should solve this — or stakes will rise.",
              "viewer_understands": "The problem is: A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the d…"
            },
            "informationKey": "problem_named|open|consultant_explanation_marker_hand",
            "durationSeconds": 4.69
          },
          {
            "role": "ESCALATION",
            "index": 2,
            "share": 0.308,
            "sceneSummary": "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, tight crop on the whiteboard surface. The…",
            "comprehension": {
              "viewer_question": "Can this be fixed?",
              "viewer_expectation": "Show the solution.",
              "viewer_understands": "The business is losing opportunities: , quietly"
            },
            "informationKey": "cost_rising|open|quietly_been_reporting_number",
            "durationSeconds": 6.63
          },
          {
            "role": "RESOLUTION",
            "index": 3,
            "share": 0.192,
            "sceneSummary": null,
            "comprehension": {
              "viewer_question": "none",
              "viewer_expectation": "Finished.",
              "viewer_understands": "The product solves this: Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean…"
            },
            "informationKey": "solution_shown|closed|appears_structural_answer_newly",
            "durationSeconds": 4.14
          }
        ],
        "voiceover": {
          "text": "You've been defining this number wrong for years. Bounce rate doesn't mean 'visitor left without converting.' It means: visitor had a question, no one answered, visitor left. That's it. Every bounce is a conversation that never happened. Your website was silent while someone was ready to talk. That silence is the real metric. And it's fixable.",
          "wordCount": 56
        },
        "storyboard": {
          "sceneCount": 3,
          "sceneSummaries": [
            "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, tight crop on hands and whiteboard surfac…",
            "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot. The marketing consultant is seen from beh…",
            "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, tight crop on the whiteboard surface. The…"
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
            6.07,
            4.69,
            6.63,
            4.14
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
            "whyContinue": "Have I been misdefining this metric too?",
            "viewerLearns": "A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written when the hand stops. Holds. The marker…",
            "informationKey": "anomaly|open|hand_writing_bounce_rate",
            "modeBeatLabels": [
              "unexpected_fact"
            ]
          },
          {
            "role": "SETUP",
            "whatChanged": "After the hook meaning unit lands: name the problem world (Slow-dawning recognition. The quiet of a professional who just found a gap in their own expertise. v…",
            "whyContinue": "Stakes become clear — A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the definition he j…",
            "viewerLearns": "The consultant is mid-explanation, marker in hand, facing a small whiteboard in a bright consulting room — daylight through horizontal blinds, pale walls, one…",
            "informationKey": "problem_named|open|consultant_explanation_marker_hand",
            "modeBeatLabels": [
              "implication"
            ]
          },
          {
            "role": "ESCALATION",
            "whatChanged": "Failure / consequence deepens — not a restatement of the setup.",
            "whyContinue": "Viewer needs the fix: Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean something different fo…",
            "viewerLearns": ", quietly: 'I've been reporting this number to clients for three years.' Cut to his laptop — the product is already open, the AI assistant mid-conversation wit…",
            "informationKey": "cost_rising|open|quietly_been_reporting_number",
            "modeBeatLabels": [
              "proof"
            ]
          },
          {
            "role": "RESOLUTION",
            "whatChanged": "Problem turns into solution / outcome: The crossed-out definition stays on the board. The viewer has just been taught that a metric they use every week has bee…",
            "whyContinue": "The crossed-out definition stays on the board. The viewer has just been taught that a metric they use every week has been carrying evidence of unanswered quest…",
            "viewerLearns": "Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean something different for every client, every…",
            "informationKey": "solution_shown|closed|appears_structural_answer_newly",
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
          "ending": "The crossed-out definition stays on the board. The viewer has just been taught that a metric they use every week has been carrying evidence of unanswered questions the whole time.",
          "family": "invented",
          "coreIdea": "A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the definition he just wrote is not 'visitor left without converting.' It is 'visitor had a question, no one answered, visitor left.' He rewrites the definition on the board. The data was always telling him this. He was teaching the wrong meaning.",
          "hookLine": "You've been defining this number wrong for years.",
          "candidateId": "c2",
          "openingSituation": "A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written when the hand stops. Holds. The marker stays pressed to the board.",
          "storyProgression": "The consultant is mid-explanation, marker in hand, facing a small whiteboard in a bright consulting room — daylight through horizontal blinds, pale walls, one plant. He has written 'Bounce Rate = Visitor left without converting.' He underlines it. Then pauses. Tilts his head. The voiceover is his internal monologue: 'But why did they leave?' He draws an arrow. Writes: 'Had a question.' Another arrow: 'No answer available.' Final arrow: 'Left.' He steps back. Looks at what he's written. The original definition is still there. He draws a single line through it. Rewrites beneath: 'Bounce Rate = Unanswered question, counted.' The camera holds on the board. He doesn't say anything for a moment. Then, quietly: 'I've been reporting this number to clients for three years.' Cut to his laptop — the product is already open, the AI assistant mid-conversation with a visitor. He closes the cap on his marker. The board stays in frame.",
          "productConnection": "Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean something different for every client, every campaign."
        },
        "corrective_guidance": null,
        "viewer_comprehension": [
          {
            "viewer_question": "Have I been misdefining this metric too?",
            "viewer_expectation": "The explanation is coming.",
            "viewer_understands": "Something unusual is happening: A hand writing 'BOUNCE RATE' in large block letters on a whiteboard"
          },
          {
            "viewer_question": "Why is this happening / what does it cost?",
            "viewer_expectation": "Someone should solve this — or stakes will rise.",
            "viewer_understands": "The problem is: A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the d…"
          },
          {
            "viewer_question": "Can this be fixed?",
            "viewer_expectation": "Show the solution.",
            "viewer_understands": "The business is losing opportunities: , quietly"
          },
          {
            "viewer_question": "none",
            "viewer_expectation": "Finished.",
            "viewer_understands": "The product solves this: Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean…"
          }
        ],
        "information_progression": {
          "passed": false,
          "summary": [
            "items_1_and_2_same_information:same_information:chaos_planning|shared_claims:chaos_planning|overlap=0.44",
            "items_2_and_3_same_information:same_information:chaos_planning|shared_claims:chaos_planning|overlap=0.69"
          ],
          "version": "information-progression@1",
          "warnings": [
            {
              "indexA": 0,
              "indexB": 1,
              "overlap": 0.44047619047619047,
              "reasons": [
                "same_information:chaos_planning",
                "shared_claims:chaos_planning",
                "overlap=0.44"
              ],
              "informationKeyA": "chaos_planning",
              "informationKeyB": "chaos_planning",
              "sameInformationDifferentSurface": false
            },
            {
              "indexA": 1,
              "indexB": 2,
              "overlap": 0.6865671641791045,
              "reasons": [
                "same_information:chaos_planning",
                "shared_claims:chaos_planning",
                "overlap=0.69"
              ],
              "informationKeyA": "chaos_planning",
              "informationKeyB": "chaos_planning",
              "sameInformationDifferentSurface": false
            }
          ],
          "correctiveGuidance": "INFORMATION PROGRESSION CORRECTIVE (deterministic — strengthen storyboard NOW):\nConsecutive beats/scenes must advance INFORMATION, not just change the camera or device.\nphone → laptop with the same claim (e.g. 'unanswered visitors') is STILL a failure.\nRequired advance pattern: anomaly → problem named → cost/failure → solution.\nEach visual_scenes[i] must communicate a NEW fact the previous scene did not.\nDo NOT restate the same problem with a different prop.\n\nDetected issues:\n- beats/scenes 1→2: same_information:chaos_planning; shared_claims:chaos_planning; overlap=0.44\n- beats/scenes 2→3: same_information:chaos_planning; shared_claims:chaos_planning; overlap=0.69"
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
        "passed": false,
        "summary": [
          "items_1_and_2_same_information:same_information:chaos_planning|shared_claims:chaos_planning|overlap=0.44",
          "items_2_and_3_same_information:same_information:chaos_planning|shared_claims:chaos_planning|overlap=0.69"
        ],
        "version": "information-progression@1",
        "warnings": [
          {
            "indexA": 0,
            "indexB": 1,
            "overlap": 0.44047619047619047,
            "reasons": [
              "same_information:chaos_planning",
              "shared_claims:chaos_planning",
              "overlap=0.44"
            ],
            "informationKeyA": "chaos_planning",
            "informationKeyB": "chaos_planning",
            "sameInformationDifferentSurface": false
          },
          {
            "indexA": 1,
            "indexB": 2,
            "overlap": 0.6865671641791045,
            "reasons": [
              "same_information:chaos_planning",
              "shared_claims:chaos_planning",
              "overlap=0.69"
            ],
            "informationKeyA": "chaos_planning",
            "informationKeyB": "chaos_planning",
            "sameInformationDifferentSurface": false
          }
        ],
        "correctiveGuidance": "INFORMATION PROGRESSION CORRECTIVE (deterministic — strengthen storyboard NOW):\nConsecutive beats/scenes must advance INFORMATION, not just change the camera or device.\nphone → laptop with the same claim (e.g. 'unanswered visitors') is STILL a failure.\nRequired advance pattern: anomaly → problem named → cost/failure → solution.\nEach visual_scenes[i] must communicate a NEW fact the previous scene did not.\nDo NOT restate the same problem with a different prop.\n\nDetected issues:\n- beats/scenes 1→2: same_information:chaos_planning; shared_claims:chaos_planning; overlap=0.44\n- beats/scenes 2→3: same_information:chaos_planning; shared_claims:chaos_planning; overlap=0.69"
      }
    },
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: measured, credible. Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Use spoken",
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
        "desk": 3,
        "group": 2,
        "phone": 3,
        "laptop": 5,
        "meeting": 1,
        "monitor": 1,
        "close_up": 11,
        "overhead": 4,
        "dashboard": 4,
        "person_alone": 4,
        "sticky_notes": 1,
        "product_asset": 5
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
      "key": "a bright co-working space in daylight|quiet tension before a decision|gentle side lighting with soft shadows|eye-level medium shot|tight crop on hands and workspace|person seen from behind or as silhouette|warm neutral color feel",
      "mood": "quiet tension before a decision",
      "camera": "eye-level medium shot",
      "version": "creative-identity@1",
      "lighting": "gentle side lighting with soft shadows",
      "color_feel": "warm neutral color feel",
      "option_ids": {
        "mood": "quietly_tense",
        "camera": "eye_level_medium",
        "lighting": "gentle_side_light",
        "color_feel": "warm_neutral",
        "composition": "tight_crop_hands",
        "environment": "co_working_daylight",
        "human_presence": "silhouette_back"
      },
      "composition": "tight crop on hands and workspace",
      "environment": "Apply visual treatment inside the canonical Creative DNA world: A real, small consulting room — not a stage, not a studio. The whiteboard is a working tool, not a prop. The plant is alive.",
      "human_presence": "person seen from behind or as silhouette"
    },
    "history_decisions": [],
    "visual_beat_count": 4,
    "accepted_cta_count": 0,
    "cta_composition_id": null,
    "creative_candidates": {
      "version": "creative-candidates@3.0",
      "storyIntegrity": {
        "passed": false,
        "summary": "primary_actor_changed",
        "version": "story-integrity@1",
        "ctaMatch": {
          "evidence": "onscreen_cta_not_requested_skip_spoken_cta_check",
          "packageCta": "Create your AI assistant — let your website answer the question that ends the bounce.",
          "ctaMismatch": false,
          "voiceoverContainsCta": true
        },
        "warnings": [],
        "violations": [
          {
            "code": "primary_actor_changed",
            "message": "Primary actor from selected concept missing from opening scene",
            "evidence": "expected one of: marketing, consultant, teaches, analytics",
            "sceneIndex": 0
          }
        ],
        "allowedWorldTokens": [
          "accent",
          "across",
          "adjacent",
          "after",
          "afternoon",
          "again",
          "alive",
          "already",
          "always",
          "analog",
          "analytics",
          "another",
          "answer",
          "answered",
          "anything",
          "appears",
          "arrow",
          "artificial",
          "assistant",
          "atmosphere",
          "available",
          "back",
          "been",
          "before",
          "beneath",
          "black",
          "blind",
          "blinds",
          "block",
          "board",
          "booking",
          "bounce",
          "bright",
          "camera",
          "campaign",
          "cannot",
          "carrying",
          "caused",
          "chat",
          "chatbot",
          "clean",
          "client",
          "clients",
          "close",
          "closes",
          "consultant",
          "consulting",
          "contained",
          "conversation",
          "converting",
          "corner",
          "corporate",
          "correct",
          "correctly",
          "counted",
          "crossed",
          "customer",
          "data",
          "daylight",
          "defined",
          "definition",
          "deliberate",
          "different",
          "directional",
          "discovered",
          "distance",
          "doesn",
          "draws",
          "enough",
          "events",
          "every",
          "everything",
          "evidence",
          "explains",
          "explanation",
          "facing",
          "feature",
          "feel",
          "fiddle",
          "filtering",
          "final",
          "form",
          "foundational",
          "frame",
          "green",
          "half",
          "hand",
          "head",
          "hearing",
          "holds",
          "horizontal",
          "ignore",
          "information",
          "instead",
          "internal",
          "laptop",
          "large",
          "lead",
          "leaf",
          "leave",
          "left",
          "letters",
          "light",
          "lights",
          "like",
          "line",
          "living",
          "look",
          "looks",
          "made",
          "marker",
          "marketing",
          "mean",
          "meaning",
          "medium",
          "message",
          "metric",
          "midday",
          "moment",
          "monologue",
          "natural",
          "newly",
          "number",
          "observer",
          "open",
          "original",
          "pacing",
          "pale",
          "pauses",
          "phone",
          "pivot",
          "plant",
          "pressed",
          "printed",
          "product",
          "professional",
          "prop",
          "question",
          "questions",
          "quietly",
          "rate",
          "real",
          "realizes",
          "reckoning",
          "reply",
          "reporting",
          "reports",
          "rewrites",
          "ring",
          "rolling",
          "room",
          "sage",
          "scattered",
          "seen",
          "sentence",
          "setup",
          "silence",
          "single",
          "small",
          "something",
          "specific",
          "squeaks",
          "stage",
          "stand",
          "standard",
          "stays",
          "steps",
          "still",
          "stopping",
          "stops",
          "stripes",
          "structural",
          "studio",
          "table",
          "taught",
          "teaches",
          "teaching",
          "telling",
          "there",
          "thing",
          "three",
          "tilts",
          "time",
          "tool",
          "trained",
          "unanswered",
          "underlines",
          "unhurried",
          "using",
          "viewer",
          "viewpoint",
          "visitor",
          "voiceover",
          "waiting",
          "wall",
          "walls",
          "warm",
          "warmth",
          "watching",
          "website",
          "week",
          "what",
          "white",
          "whiteboard",
          "whole",
          "word",
          "working",
          "would",
          "writes",
          "writing",
          "written",
          "wrong",
          "wrote",
          "years"
        ],
        "productDemonstration": {
          "present": false,
          "evidence": [],
          "askPresent": false,
          "answerPresent": false,
          "resultPresent": false,
          "landingPageOnly": false
        }
      },
      "candidateScores": [
        {
          "family": "invented",
          "scores": {
            "stopPower": 8,
            "originality": 8,
            "memorability": 8,
            "storyPotential": 9,
            "AI_Generic_Risk": 2,
            "emotionalCharge": 8,
            "productRelevance": 8,
            "visualSpecificity": 7,
            "productionFeasibility": 8,
            "immediateComprehension": 9
          },
          "coreIdea": "A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the definition he just wrote is not 'visitor left without converting.' It is 'visitor had a question, no one answered, visitor left.' He rewrites the definition on the board. The data was always telling him this. He was teaching the wrong meaning.",
          "hookLine": "You've been defining this number wrong for years.",
          "rejected": false,
          "candidateId": "c2",
          "rejectReasons": [],
          "weightedTotal": 8,
          "commercialTotal": 9,
          "commercialScores": {
            "renderability": 8,
            "firstFrameClarity": 8,
            "humanProblemVisibility": 8,
            "narrativeSurvivability": 9,
            "productDemonstrability": 7,
            "commercialSurvivability": 9
          },
          "openingSituation": "A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written when the hand stops. Holds. The marker stays pressed to the board.",
          "finalSelectionScore": 104
        },
        {
          "family": "invented",
          "scores": {
            "stopPower": 7,
            "originality": 7,
            "memorability": 7,
            "storyPotential": 8,
            "AI_Generic_Risk": 3,
            "emotionalCharge": 7,
            "productRelevance": 7,
            "visualSpecificity": 6,
            "productionFeasibility": 7,
            "immediateComprehension": 8
          },
          "coreIdea": "A consultant is teaching a small group of clients how to calculate campaign efficiency — he is at a flip chart, confident, drawing the CPL formula. He writes it large: Total Spend ÷ Leads = CPL. Then a client raises her hand and asks: 'What about the people who visited and left with a question you couldn't answer — where do they go in the formula?' The consultant stares at the formula. She is right. They are not in the formula. They have never been in the formula.",
          "hookLine": "The formula everyone uses has always been missing a denominator.",
          "rejected": false,
          "candidateId": "c4",
          "rejectReasons": [],
          "weightedTotal": 7,
          "commercialTotal": 8,
          "commercialScores": {
            "renderability": 7,
            "firstFrameClarity": 7,
            "humanProblemVisibility": 7,
            "narrativeSurvivability": 8,
            "productDemonstrability": 7,
            "commercialSurvivability": 8
          },
          "openingSituation": "A black marker drawing a large division symbol on a pale flip chart — the symbol is half-drawn when the frame cuts to the formula taking shape. The marker is confident. The sound of paper and marker is loud.",
          "finalSelectionScore": 92
        }
      ],
      "comparativeJudge": {
        "winnerId": "c2",
        "winnerReason": "c2 wins on the strength of its reframe precision, emotional intimacy, and opening interrupt quality. The bounce rate redefinition — 'unanswered question, counted' — is a single, clean, emotionally loaded reframe of a metric the target audience already uses and already trusts, which means the concept does not need to teach a new framework before delivering its payload. The marker stopping mid-word is a stronger scroll-stopper than a division symbol completing itself, because interruption inside a confident act creates more immediate tension than a formula being drawn correctly. The solo consultant's internal monologue and quiet admission — 'I've been reporting this number to clients for three years' — delivers a more intimate and affecting moment of expert humility than the group dynamic in c4, where the emotional weight is distributed across multiple characters. The crossed-out definition staying on the board is a more memorable ending artifact than the blank denominator, because it is visually permanent and emotionally honest — the error is not erased, it is corrected in place. The pale sage / horizontal blind atmosphere is more atmospherically specific and differentiated from the fingerprint palette bank than c4's white-and-ash meeting room. Both concepts share a similar product integration weakness (laptop appearing as structural answer), but c2's overall superiority across originality, emotional strength, visual distinctness, and stop-scroll quality is sufficient to determine the ranking without that weakness being decisive.",
        "bestProductTopicFit": "c2",
        "clearestMentalImage": "c2",
        "leastInterchangeable": "c2",
        "mostMemorableInOneHour": "c2",
        "mostLikelyToStopScrolling": "c2"
      },
      "selectedCandidate": {
        "ending": "The crossed-out definition stays on the board. The viewer has just been taught that a metric they use every week has been carrying evidence of unanswered questions the whole time.",
        "family": "invented",
        "coreIdea": "A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the definition he just wrote is not 'visitor left without converting.' It is 'visitor had a question, no one answered, visitor left.' He rewrites the definition on the board. The data was always telling him this. He was teaching the wrong meaning.",
        "hookLine": "You've been defining this number wrong for years.",
        "candidateId": "c2",
        "creativeDNA": {
          "world": "A real, small consulting room — not a stage, not a studio. The whiteboard is a working tool, not a prop. The plant is alive.",
          "productRole": "The structural answer to the correctly defined metric — not a feature, but the thing that stops bounce events caused by silence.",
          "coreConflict": "The metric he has been using correctly — by the standard definition — has always contained information he was trained to ignore.",
          "endingIntent": "The viewer cannot look at a bounce rate number again without hearing 'unanswered question' instead.",
          "mainCharacter": "A marketing consultant who teaches analytics to clients and has just discovered a gap in his own foundational definition.",
          "immutableRules": [
            "The crossed-out definition must stay on the board at the end — never erased",
            "The consultant must not pitch the product — the board does the work",
            "The horizontal blind light must be present in every frame — it is the visual signature of this world"
          ],
          "viewerQuestion": "Have I been misdefining this metric too?"
        },
        "visualPromise": "Small bright consulting room — pale sage walls, horizontal blinds filtering afternoon light, one medium fiddle-leaf fig in the corner, whiteboard on a rolling stand, single low table with a laptop and scattered printed reports. Warm daylight. Analog and professional without being corporate. Atmosphere: Midday, bright natural light, Pale sage walls, white board, black marker, warm daylight — clean and professional with a single living-green accent from the plant, Horizontal blind stripes across the wall — natural, directional, specific. No ring lights, no artificial warmth.. Viewpoint: Observer-adjacent — we are close enough to feel like we are in the room, not watching from a distance.. Pacing: Deliberate and unhurried. The marker stopping is the pivot — everything before is setup, everything after is reckoning..",
        "familiarityRisk": "low",
        "openingSituation": "A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written when the hand stops. Holds. The marker stays pressed to the board.",
        "storyProgression": "The consultant is mid-explanation, marker in hand, facing a small whiteboard in a bright consulting room — daylight through horizontal blinds, pale walls, one plant. He has written 'Bounce Rate = Visitor left without converting.' He underlines it. Then pauses. Tilts his head. The voiceover is his internal monologue: 'But why did they leave?' He draws an arrow. Writes: 'Had a question.' Another arrow: 'No answer available.' Final arrow: 'Left.' He steps back. Looks at what he's written. The original definition is still there. He draws a single line through it. Rewrites beneath: 'Bounce Rate = Unanswered question, counted.' The camera holds on the board. He doesn't say anything for a moment. Then, quietly: 'I've been reporting this number to clients for three years.' Cut to his laptop — the product is already open, the AI assistant mid-conversation with a visitor. He closes the cap on his marker. The board stays in frame.",
        "creativeDnaSource": "model",
        "emotionalReaction": "Slow-dawning recognition. The quiet of a professional who just found a gap in their own expertise. via The viewer watches someone who teaches this data for a living realize they have been teaching an incomplete definition. The mechanism is expert humility — if someone who instructs others on this metric missed this, the viewer certainly did too.",
        "productConnection": "Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean something different for every client, every campaign.",
        "conceptFingerprint": {
          "metaphor": null,
          "hero_object": "The whiteboard with the crossed-out definition and the rewritten one beneath it",
          "core_premise": "Bounce rate has always been a count of unanswered questions — the consultant has been reporting the metric correctly and interpreting it catastrophically wrong.",
          "visual_world": "Small bright consulting room — pale sage walls, horizontal blind light, whiteboard on a rolling stand, fiddle-leaf fig, scattered printed reports.",
          "emotional_arc": "Confident instruction → pause → realization → expert humility → structural correction",
          "ending_mechanism": "The crossed-out definition stays on the board — permanent, visible proof of the reframe.",
          "opening_mechanism": "A hand writing on a whiteboard that stops mid-word — the interruption signals that something in the confident act has broken.",
          "product_mechanism": "Appears as the answer to the correct definition — the thing that removes bounce events caused by unanswered questions.",
          "creative_direction": "Works by surfacing evidence that already exists in data the audience already has — traffic numbers, session counts, bounce rates — and reframes that existing data as a record of unanswered questions rather than a record of visitors.",
          "palette_atmosphere": "Pale sage, white, black marker, warm daylight with horizontal blind shadows — clean, professional, quietly alive"
        },
        "memorabilityReason": "A hand stopping mid-word on a whiteboard is a scroll-stopper because it signals interruption — something went wrong in the middle of a confident act. The viewer needs to know what stopped the hand.",
        "expectedViewerQuestion": "Have I been misdefining this metric too?"
      },
      "regenerationReason": "story_integrity:primary_actor_changed",
      "rejectedCandidates": [],
      "finalScriptFidelity": {
        "passed": true,
        "diagnostics": [
          {
            "rule": "opening_situation_visible_in_scene1",
            "passed": true,
            "reason": null,
            "candidateValue": "A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written when the hand stops. Holds. The marker stays pressed to the board.",
            "generatedValue": "Eye-level medium shot, tight crop on hands and whiteboard surface. A hand presses a thick black marker against a pale whiteboard — the word 'BOUNCE RATE' is half-formed, the final letters unfinished. The marker is frozen",
            "matchedAliases": []
          },
          {
            "rule": "hook_preserved_in_first_spoken",
            "passed": true,
            "reason": null,
            "candidateValue": "You've been defining this number wrong for years.",
            "generatedValue": "You've been defining this number wrong for years.",
            "matchedAliases": []
          },
          {
            "rule": "core_idea_recognizable",
            "passed": true,
            "reason": null,
            "candidateValue": "A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the definition he just wrote is not 'visit",
            "generatedValue": "You've been defining this number wrong for years. Bounce rate doesn't mean 'visitor left without converting.' It means: visitor had a question, no one answered,",
            "matchedAliases": []
          },
          {
            "rule": "product_or_topic_implied",
            "passed": true,
            "reason": null,
            "candidateValue": "Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean somet",
            "generatedValue": "You've been defining this number wrong for years. Bounce rate doesn't mean 'visitor left without converting.' It means: ",
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
            "candidateValue": "A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written ",
            "generatedValue": "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, tight crop on hands and whiteboard surface. A hand presses a thick black marker ag",
            "matchedAliases": []
          },
          {
            "rule": "opening_event_preserved_in_scene1",
            "passed": true,
            "reason": null,
            "candidateValue": "(no_action_axis)",
            "generatedValue": "board_failure",
            "matchedAliases": []
          },
          {
            "rule": "stop_scroll_idea_preserved",
            "passed": true,
            "reason": null,
            "candidateValue": "You've been defining this number wrong for years.",
            "generatedValue": "You've been defining this number wrong for years. | Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, ti",
            "matchedAliases": []
          },
          {
            "rule": "sales_pitch_opening",
            "passed": true,
            "reason": null,
            "candidateValue": "You've been defining this number wrong for years.",
            "generatedValue": "You've been defining this number wrong for years.",
            "matchedAliases": []
          },
          {
            "rule": "voiceover_essay_or_generic_opener",
            "passed": true,
            "reason": null,
            "candidateValue": "You've been defining this number wrong for years.",
            "generatedValue": "You've been defining this number wrong for years.",
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
          "ending": "The crossed-out definition stays on the board. The viewer has just been taught that a metric they use every week has been carrying evidence of unanswered questions the whole time.",
          "family": "invented",
          "coreIdea": "A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the definition he just wrote is not 'visitor left without converting.' It is 'visitor had a question, no one answered, visitor left.' He rewrites the definition on the board. The data was always telling him this. He was teaching the wrong meaning.",
          "hookLine": "You've been defining this number wrong for years.",
          "candidateId": "c2",
          "creativeDNA": {
            "world": "A real, small consulting room — not a stage, not a studio. The whiteboard is a working tool, not a prop. The plant is alive.",
            "productRole": "The structural answer to the correctly defined metric — not a feature, but the thing that stops bounce events caused by silence.",
            "coreConflict": "The metric he has been using correctly — by the standard definition — has always contained information he was trained to ignore.",
            "endingIntent": "The viewer cannot look at a bounce rate number again without hearing 'unanswered question' instead.",
            "mainCharacter": "A marketing consultant who teaches analytics to clients and has just discovered a gap in his own foundational definition.",
            "immutableRules": [
              "The crossed-out definition must stay on the board at the end — never erased",
              "The consultant must not pitch the product — the board does the work",
              "The horizontal blind light must be present in every frame — it is the visual signature of this world"
            ],
            "viewerQuestion": "Have I been misdefining this metric too?"
          },
          "visualPromise": "Small bright consulting room — pale sage walls, horizontal blinds filtering afternoon light, one medium fiddle-leaf fig in the corner, whiteboard on a rolling stand, single low table with a laptop and scattered printed reports. Warm daylight. Analog and professional without being corporate. Atmosphere: Midday, bright natural light, Pale sage walls, white board, black marker, warm daylight — clean and professional with a single living-green accent from the plant, Horizontal blind stripes across the wall — natural, directional, specific. No ring lights, no artificial warmth.. Viewpoint: Observer-adjacent — we are close enough to feel like we are in the room, not watching from a distance.. Pacing: Deliberate and unhurried. The marker stopping is the pivot — everything before is setup, everything after is reckoning..",
          "familiarityRisk": "low",
          "openingSituation": "A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written when the hand stops. Holds. The marker stays pressed to the board.",
          "storyProgression": "The consultant is mid-explanation, marker in hand, facing a small whiteboard in a bright consulting room — daylight through horizontal blinds, pale walls, one plant. He has written 'Bounce Rate = Visitor left without converting.' He underlines it. Then pauses. Tilts his head. The voiceover is his internal monologue: 'But why did they leave?' He draws an arrow. Writes: 'Had a question.' Another arrow: 'No answer available.' Final arrow: 'Left.' He steps back. Looks at what he's written. The original definition is still there. He draws a single line through it. Rewrites beneath: 'Bounce Rate = Unanswered question, counted.' The camera holds on the board. He doesn't say anything for a moment. Then, quietly: 'I've been reporting this number to clients for three years.' Cut to his laptop — the product is already open, the AI assistant mid-conversation with a visitor. He closes the cap on his marker. The board stays in frame.",
          "creativeDnaSource": "model",
          "emotionalReaction": "Slow-dawning recognition. The quiet of a professional who just found a gap in their own expertise. via The viewer watches someone who teaches this data for a living realize they have been teaching an incomplete definition. The mechanism is expert humility — if someone who instructs others on this metric missed this, the viewer certainly did too.",
          "productConnection": "Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean something different for every client, every campaign.",
          "conceptFingerprint": {
            "metaphor": null,
            "hero_object": "The whiteboard with the crossed-out definition and the rewritten one beneath it",
            "core_premise": "Bounce rate has always been a count of unanswered questions — the consultant has been reporting the metric correctly and interpreting it catastrophically wrong.",
            "visual_world": "Small bright consulting room — pale sage walls, horizontal blind light, whiteboard on a rolling stand, fiddle-leaf fig, scattered printed reports.",
            "emotional_arc": "Confident instruction → pause → realization → expert humility → structural correction",
            "ending_mechanism": "The crossed-out definition stays on the board — permanent, visible proof of the reframe.",
            "opening_mechanism": "A hand writing on a whiteboard that stops mid-word — the interruption signals that something in the confident act has broken.",
            "product_mechanism": "Appears as the answer to the correct definition — the thing that removes bounce events caused by unanswered questions.",
            "creative_direction": "Works by surfacing evidence that already exists in data the audience already has — traffic numbers, session counts, bounce rates — and reframes that existing data as a record of unanswered questions rather than a record of visitors.",
            "palette_atmosphere": "Pale sage, white, black marker, warm daylight with horizontal blind shadows — clean, professional, quietly alive"
          },
          "memorabilityReason": "A hand stopping mid-word on a whiteboard is a scroll-stopper because it signals interruption — something went wrong in the middle of a confident act. The viewer needs to know what stopped the hand.",
          "expectedViewerQuestion": "Have I been misdefining this metric too?"
        },
        {
          "ending": "The formula on the flip chart now has a new line. The viewer has never run that calculation either.",
          "family": "invented",
          "coreIdea": "A consultant is teaching a small group of clients how to calculate campaign efficiency — he is at a flip chart, confident, drawing the CPL formula. He writes it large: Total Spend ÷ Leads = CPL. Then a client raises her hand and asks: 'What about the people who visited and left with a question you couldn't answer — where do they go in the formula?' The consultant stares at the formula. She is right. They are not in the formula. They have never been in the formula.",
          "hookLine": "The formula everyone uses has always been missing a denominator.",
          "candidateId": "c4",
          "creativeDNA": {
            "world": "A genuine small meeting room — rented co-working space, not a boardroom. The lesson is real; the formula is one the audience uses. The room has coffee cups with lipstick marks and handouts with pen notes.",
            "productRole": "The answer to the blank denominator — the thing that makes the missing variable visible and the cost of silence fixed and known.",
            "coreConflict": "A formula the consultant has used and taught for years has always been incomplete — it accounts for every outcome except the most common one.",
            "endingIntent": "The viewer opens their own campaign spreadsheet and tries to add the missing line.",
            "mainCharacter": "A marketing consultant mid-lesson and a client who asks the one question that breaks the formula.",
            "immutableRules": [
              "The flip chart formula must be hand-written, not printed — it must feel like a live working document",
              "The client's question must come from off-frame initially — heard before seen",
              "The blank in the formula must stay blank until the product appears — never filled artificially early"
            ],
            "viewerQuestion": "Have I been dividing by the wrong number this whole time?"
          },
          "visualPromise": "Small bright meeting room — white walls, pale ash table, four mismatched chairs, flip chart on a black easel, coffee cups in ceramic, printed handouts, afternoon window light from one large window. Deliberately un-corporate — a rented co-working meeting room, not a boardroom. Atmosphere: Midday to early afternoon, bright natural light, White walls, pale ash table, black marker, ceramic coffee cups — clean and unadorned with no atmospheric styling, One large window, natural and direct — the lesson is lit by available light, nothing added. Viewpoint: Observer — we are in the room, watching from the client's side of the table.. Pacing: Confident opening, deliberate middle pause, quiet landing. The pace of a lesson that just changed direction..",
          "familiarityRisk": "low",
          "openingSituation": "A black marker drawing a large division symbol on a pale flip chart — the symbol is half-drawn when the frame cuts to the formula taking shape. The marker is confident. The sound of paper and marker is loud.",
          "storyProgression": "The consultant is at the front of a small, bright meeting room — four clients seated at a low table, flip chart on an easel, coffee cups, printed handouts. He is mid-lesson, writing 'Total Spend ÷ Leads Generated = CPL.' He underlines it, circles it, looks pleased. He is about to move on. One client — a woman with a printed handout, pen in hand — raises her hand. She asks, simply: 'What about the fifty people who came and left without a lead? Where do they go?' The consultant looks at the formula. Long pause. He writes above the formula: 'Visitors who left without an answer.' He draws an arrow to the CPL formula. He cannot make them fit. He tries. He crosses out one version. Tries again. The formula does not account for them — they are not leads, not conversions, not bounces in his framework. They are just gone from the math. He says, quietly: 'They've never been in the formula.' He writes a new line below: 'Cost per visitor who got no answer = Total Spend ÷ [blank].' He turns to the group. 'We've been dividing by the wrong denominator.' The product appears on a laptop at the edge of the table — the AI assistant is capturing a lead at that exact moment. He writes a number in the blank.",
          "creativeDnaSource": "model",
          "emotionalReaction": "Collegial surprise that tips into professional humility. Not embarrassment — recalibration. via The viewer watches an expert discover a gap in a formula they have trusted — the mechanism is expert-credibility collapse, followed by a clean structural correction. The client asking the question is the viewer's surrogate.",
          "productConnection": "Appears at the table edge as the thing that fills the blank — the answer to the formula the consultant just admitted was incomplete.",
          "conceptFingerprint": {
            "metaphor": null,
            "hero_object": "The flip chart formula with the new blank denominator line below it",
            "core_premise": "The CPL formula every marketer uses has always been missing a denominator — the visitors who arrived, had a question, got no answer, and left with no record in the formula at all.",
            "visual_world": "Small bright un-corporate meeting room — white walls, pale ash table, flip chart on easel, ceramic coffee cups, printed handouts, one large window.",
            "emotional_arc": "Confident instruction → unexpected question → formula gap exposed → expert recalibration → structural correction",
            "ending_mechanism": "The formula now has a new line. The blank is filled. The viewer has never run this calculation.",
            "opening_mechanism": "A confident hand drawing a division symbol on a flip chart — the formula begins with authority before it is exposed as incomplete.",
            "product_mechanism": "Appears at the table edge filling the blank — the thing that makes the missing denominator calculable and the cost addressable.",
            "creative_direction": "Applies familiar marketing math — cost per click, cost per lead — to a unit the audience has never calculated: the cost per unanswered question, revealing that every unanswered question has a calculable cost the business is currently treating as zero.",
            "palette_atmosphere": "White, pale ash, black marker, ceramic warm tones — clean and unadorned, naturally lit"
          },
          "memorabilityReason": "A confident hand drawing a formula that stops — then a question from off-camera that the expert cannot immediately answer. The authority-gap creates immediate tension.",
          "expectedViewerQuestion": "Have I been dividing by the wrong number this whole time?"
        }
      ],
      "selectionDiagnostics": {
        "whyWon": "critic: c2 wins on the strength of its reframe precision, emotional intimacy, and opening interrupt quality. The bounce rate redefinition — 'unanswered question, counted' — is a single, clean, emotionally loaded reframe of a metric the target audience already uses and already trusts, which means the concept does not need to teach a new framework before delivering its payload. The marker stopping mid-word is a stronger scroll-stopper than a division symbol completing itself, because interruption inside a confident act creates more immediate tension than a formula being drawn correctly. The solo consultant's internal monologue and quiet admission — 'I've been reporting this number to clients for three years' — delivers a more intimate and affecting moment of expert humility than the group dynamic in c4, where the emotional weight is distributed across multiple characters. The crossed-out definition staying on the board is a more memorable ending artifact than the blank denominator, because it is visually permanent and emotionally honest — the error is not erased, it is corrected in place. The pale sage / horizontal blind atmosphere is more atmospherically specific and differentiated from the fingerprint palette bank than c4's white-and-ash meeting room. Both concepts share a similar product integration weakness (laptop appearing as structural answer), but c2's overall superiority across originality, emotional strength, visual distinctness, and stop-scroll quality is sufficient to determine the ranking without that weakness being decisive.",
        "version": "commercial-success@1",
        "winnerId": "c2",
        "creativeScore": 0,
        "commercialScore": 0,
        "losersPenalized": [],
        "finalSelectionScore": 0,
        "commercialDimensions": {
          "renderability": 0,
          "firstFrameClarity": 0,
          "humanProblemVisibility": 0,
          "narrativeSurvivability": 0,
          "productDemonstrability": 0,
          "commercialSurvivability": 0
        },
        "creativeScoresSnapshot": {
          "stopPower": 0,
          "originality": 0,
          "memorability": 0,
          "storyPotential": 0,
          "AI_Generic_Risk": 0,
          "emotionalCharge": 0,
          "productRelevance": 0,
          "visualSpecificity": 0,
          "productionFeasibility": 0,
          "immediateComprehension": 0
        },
        "overturnedCreativeLeader": false,
        "commercialDimensionContributions": {
          "renderability": 0,
          "firstFrameClarity": 0,
          "humanProblemVisibility": 0,
          "narrativeSurvivability": 0,
          "productDemonstrability": 0,
          "commercialSurvivability": 0
        }
      },
      "creativeDnaDiagnostics": {
        "present": true,
        "validation": {
          "passed": true,
          "violations": []
        },
        "candidateId": "c2",
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
            "candidateValue": "A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written when the hand stops. Holds. The marker stays pressed to the board.",
            "generatedValue": "Eye-level medium shot, tight crop on hands and whiteboard surface. A hand presses a thick black marker against a pale whiteboard — the word 'BOUNCE RATE' is half-formed, the final letters unfinished. The marker is frozen",
            "matchedAliases": []
          },
          {
            "rule": "hook_preserved_in_first_spoken",
            "passed": true,
            "reason": null,
            "candidateValue": "You've been defining this number wrong for years.",
            "generatedValue": "You've been defining this number wrong for years.",
            "matchedAliases": []
          },
          {
            "rule": "core_idea_recognizable",
            "passed": true,
            "reason": null,
            "candidateValue": "A marketing consultant explains bounce rate to a client using a whiteboard — then stops mid-sentence when he realizes the definition he just wrote is not 'visit",
            "generatedValue": "You've been defining this number wrong for years. Bounce rate doesn't mean 'visitor left without converting.' It means: visitor had a question, no one answered,",
            "matchedAliases": []
          },
          {
            "rule": "product_or_topic_implied",
            "passed": true,
            "reason": null,
            "candidateValue": "Appears as the structural answer to the newly correct definition — the thing that would have made bounce rate mean somet",
            "generatedValue": "You've been defining this number wrong for years. Bounce rate doesn't mean 'visitor left without converting.' It means: ",
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
            "candidateValue": "A hand writing 'BOUNCE RATE' in large block letters on a whiteboard — the marker squeaks. The word is only half-written ",
            "generatedValue": "Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, tight crop on hands and whiteboard surface. A hand presses a thick black marker ag",
            "matchedAliases": []
          },
          {
            "rule": "opening_event_preserved_in_scene1",
            "passed": true,
            "reason": null,
            "candidateValue": "(no_action_axis)",
            "generatedValue": "board_failure",
            "matchedAliases": []
          },
          {
            "rule": "stop_scroll_idea_preserved",
            "passed": true,
            "reason": null,
            "candidateValue": "You've been defining this number wrong for years.",
            "generatedValue": "You've been defining this number wrong for years. | Clean flat illustration, portrait 9:16 vertical frame. Eye-level medium shot, ti",
            "matchedAliases": []
          },
          {
            "rule": "sales_pitch_opening",
            "passed": true,
            "reason": null,
            "candidateValue": "You've been defining this number wrong for years.",
            "generatedValue": "You've been defining this number wrong for years.",
            "matchedAliases": []
          },
          {
            "rule": "voiceover_essay_or_generic_opener",
            "passed": true,
            "reason": null,
            "candidateValue": "You've been defining this number wrong for years.",
            "generatedValue": "You've been defining this number wrong for years.",
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
        "version": "product-demonstration-integrity@3",
        "violations": [],
        "primaryActor": {
          "label": "A marketing consultant who teaches analytics to clients and has just discovered a gap in his own foundational definition.",
          "lockedAttributes": [
            "male",
            "hands_focus"
          ],
          "continuityAnchors": [
            "hand",
            "visitor"
          ]
        },
        "productDemonstration": {
          "present": false,
          "evidence": [],
          "askPresent": false,
          "answerPresent": false,
          "askSceneIndex": null,
          "resultPresent": false,
          "structuredBeat": null,
          "landingPageOnly": false,
          "answerSceneIndex": null,
          "resultSceneIndex": null,
          "narrationOnlySignals": [],
          "structuredBeatPresent": false
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
          "model": "claude-sonnet-4-6",
          "repair": false,
          "success": true,
          "provider": "claude",
          "warnings": [],
          "raw_usage": {
            "model": "claude-sonnet-4-6",
            "cached_tokens": 0,
            "prompt_tokens": 2932,
            "completion_tokens": 2207
          },
          "step_name": "Creative Direction Generation",
          "max_tokens": 4096,
          "started_at": "2026-07-23T22:28:14.717Z",
          "duration_ms": 52673,
          "finished_at": "2026-07-23T22:29:07.389Z",
          "retry_count": 0,
          "temperature": 0.85,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "topic=The small business owner who sent a campaign, got 50 website visitors in one afternoon, and woke up to zero leads — because no one was there to answer a single question",
          "prompt_tokens": 2932,
          "estimated_cost": 0.041901,
          "output_summary": "directions=7",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 13997,
          "completion_tokens": 2207,
          "output_size_bytes": 10209,
          "prompt_characters": 13887,
          "provider_request_id": null,
          "completion_characters": 10151
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
            "prompt_tokens": 3225,
            "completion_tokens": 2177
          },
          "step_name": "Creative Direction Evaluation",
          "max_tokens": 3072,
          "started_at": "2026-07-23T22:29:07.416Z",
          "duration_ms": 40602,
          "finished_at": "2026-07-23T22:29:48.018Z",
          "retry_count": 0,
          "temperature": 0.3,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "directions=7",
          "prompt_tokens": 3225,
          "estimated_cost": 0.04233,
          "output_summary": "ok after 1 attempt(s)",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 15149,
          "completion_tokens": 2177,
          "output_size_bytes": 8770,
          "prompt_characters": 15055,
          "provider_request_id": null,
          "completion_characters": 8732
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
            "prompt_tokens": 5340,
            "completion_tokens": 10436
          },
          "step_name": "Creative Ideation",
          "max_tokens": 16000,
          "started_at": "2026-07-23T22:29:48.019Z",
          "duration_ms": 206858,
          "finished_at": "2026-07-23T22:33:14.877Z",
          "retry_count": 0,
          "temperature": 0.9,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "topic=The small business owner who sent a campaign, got 50 website visitors in one afternoon, and woke up to zero leads — because no one was there to answer a single question; directions=3",
          "prompt_tokens": 5340,
          "estimated_cost": 0.17256,
          "output_summary": "concepts=6",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 24024,
          "completion_tokens": 10436,
          "output_size_bytes": 44969,
          "prompt_characters": 23832,
          "provider_request_id": null,
          "completion_characters": 44542
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
            "prompt_tokens": 3905,
            "completion_tokens": 1412
          },
          "step_name": "Creative Evaluation",
          "max_tokens": 4096,
          "started_at": "2026-07-23T22:33:14.901Z",
          "duration_ms": 30166,
          "finished_at": "2026-07-23T22:33:45.067Z",
          "retry_count": 0,
          "temperature": 0.3,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "concepts=2",
          "prompt_tokens": 3905,
          "estimated_cost": 0.032895,
          "output_summary": "ok after 1 attempt(s)",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 17097,
          "completion_tokens": 1412,
          "output_size_bytes": 6067,
          "prompt_characters": 16938,
          "provider_request_id": null,
          "completion_characters": 6039
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "claude",
          "warnings": [],
          "raw_usage": null,
          "step_name": "Creative Engine",
          "max_tokens": null,
          "started_at": "2026-07-23T22:33:45.077Z",
          "duration_ms": 1,
          "finished_at": "2026-07-23T22:33:45.078Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Creative Candidates input:\n- Product Brain\n- Strategy Item\n- Scenario\n- Audience\n- Pain Points",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "7 raw ideas\n↓\n3 filtered\n↓\n6 candidates\nWinner: c2",
          "pricing_source": null,
          "pricing_version": null,
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 43,
          "prompt_characters": null,
          "provider_request_id": null,
          "completion_characters": 43
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "raw_usage": null,
          "step_name": "Candidate Judge",
          "max_tokens": null,
          "started_at": "2026-07-23T22:33:45.078Z",
          "duration_ms": 0,
          "finished_at": "2026-07-23T22:33:45.078Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Creative Engine\n- Direction selection\n- Concept evaluation",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "Winner: c2 (invented)",
          "pricing_source": null,
          "pricing_version": null,
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 2339,
          "prompt_characters": null,
          "provider_request_id": null,
          "completion_characters": 2329
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "raw_usage": null,
          "step_name": "Narrative Beats",
          "max_tokens": null,
          "started_at": "2026-07-23T22:33:45.078Z",
          "duration_ms": 12,
          "finished_at": "2026-07-23T22:33:45.090Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Narrative Beats input:\n- Selected Candidate",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "HOOK\nSETUP\nESCALATION\nRESOLUTION",
          "pricing_source": null,
          "pricing_version": null,
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 42,
          "prompt_characters": null,
          "provider_request_id": null,
          "completion_characters": 42
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
            "prompt_tokens": 23456,
            "completion_tokens": 3729
          },
          "step_name": "Presentation Generation",
          "max_tokens": null,
          "started_at": "2026-07-23T22:33:45.124Z",
          "duration_ms": 68349,
          "finished_at": "2026-07-23T22:34:53.472Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "Presentation Generation input:\n- Narrative Beats\n- Creative Identity\n- Strategy Item\n- Product Brain",
          "prompt_tokens": 23456,
          "estimated_cost": 0.126303,
          "output_summary": "Storyboard\nVoiceover\nScenes\nCTA\nPlatform Outputs",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 97411,
          "completion_tokens": 3729,
          "output_size_bytes": 15208,
          "prompt_characters": 96771,
          "provider_request_id": null,
          "completion_characters": 15102
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "raw_usage": null,
          "step_name": "Hook Enforcement",
          "max_tokens": null,
          "started_at": "2026-07-23T22:34:53.475Z",
          "duration_ms": 1,
          "finished_at": "2026-07-23T22:34:53.476Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Hook Enforcement input:\n- Candidate hookLine\n- Generated hook\n- Voiceover",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "reason: already_enforced",
          "pricing_source": null,
          "pricing_version": null,
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 88,
          "prompt_characters": null,
          "provider_request_id": null,
          "completion_characters": 88
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "raw_usage": null,
          "step_name": "Concept Fidelity",
          "max_tokens": null,
          "started_at": "2026-07-23T22:34:53.476Z",
          "duration_ms": 17,
          "finished_at": "2026-07-23T22:34:53.493Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Concept Fidelity input:\n- Package\n- Selected Candidate",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "Passed first pass",
          "pricing_source": null,
          "pricing_version": null,
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 28,
          "prompt_characters": null,
          "provider_request_id": null,
          "completion_characters": 28
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "raw_usage": null,
          "step_name": "Story Integrity",
          "max_tokens": null,
          "started_at": "2026-07-23T22:34:53.501Z",
          "duration_ms": 9,
          "finished_at": "2026-07-23T22:34:53.510Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Story Integrity input:\n- Generated package",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "Failed",
          "pricing_source": null,
          "pricing_version": null,
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 63,
          "prompt_characters": null,
          "provider_request_id": null,
          "completion_characters": 63
        },
        {
          "model": "gpt-4o-mini-2024-07-18",
          "repair": true,
          "success": true,
          "provider": "openai",
          "warnings": [],
          "raw_usage": {
            "model": "gpt-4o-mini-2024-07-18",
            "cached_tokens": 0,
            "prompt_tokens": 3721,
            "completion_tokens": 3614
          },
          "step_name": "JSON Repair",
          "max_tokens": null,
          "started_at": "2026-07-23T22:35:58.616Z",
          "duration_ms": 29624,
          "finished_at": "2026-07-23T22:36:28.240Z",
          "retry_count": 0,
          "temperature": 0,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "JSON Repair input:\n- Broken model output\n- Validation issues",
          "prompt_tokens": 3721,
          "estimated_cost": 0.002727,
          "output_summary": "repaired JSON",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 17062,
          "completion_tokens": 3614,
          "output_size_bytes": 17023,
          "prompt_characters": 16938,
          "provider_request_id": null,
          "completion_characters": 16899
        },
        {
          "model": "gpt-4o-mini-2024-07-18",
          "repair": true,
          "success": true,
          "provider": "openai",
          "warnings": [],
          "raw_usage": {
            "model": "gpt-4o-mini-2024-07-18",
            "cached_tokens": 0,
            "prompt_tokens": 3431,
            "completion_tokens": 3326
          },
          "step_name": "JSON Repair",
          "max_tokens": null,
          "started_at": "2026-07-23T22:36:28.241Z",
          "duration_ms": 25571,
          "finished_at": "2026-07-23T22:36:53.812Z",
          "retry_count": 0,
          "temperature": 0,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "JSON Repair input:\n- Broken model output\n- Validation issues",
          "prompt_tokens": 3431,
          "estimated_cost": 0.00251,
          "output_summary": "repaired JSON",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 16083,
          "completion_tokens": 3326,
          "output_size_bytes": 16085,
          "prompt_characters": 15959,
          "provider_request_id": null,
          "completion_characters": 15961
        },
        {
          "model": "gpt-4o-mini-2024-07-18",
          "repair": true,
          "success": true,
          "provider": "openai",
          "warnings": [],
          "raw_usage": {
            "model": "gpt-4o-mini-2024-07-18",
            "cached_tokens": 0,
            "prompt_tokens": 3703,
            "completion_tokens": 3647
          },
          "step_name": "JSON Repair",
          "max_tokens": null,
          "started_at": "2026-07-23T22:37:59.850Z",
          "duration_ms": 29935,
          "finished_at": "2026-07-23T22:38:29.784Z",
          "retry_count": 0,
          "temperature": 0,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "JSON Repair input:\n- Broken model output\n- Validation issues",
          "prompt_tokens": 3703,
          "estimated_cost": 0.002744,
          "output_summary": "repaired JSON",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 16867,
          "completion_tokens": 3647,
          "output_size_bytes": 17123,
          "prompt_characters": 16737,
          "provider_request_id": null,
          "completion_characters": 16987
        },
        {
          "model": "gpt-4o-mini-2024-07-18",
          "repair": true,
          "success": true,
          "provider": "openai",
          "warnings": [],
          "raw_usage": {
            "model": "gpt-4o-mini-2024-07-18",
            "cached_tokens": 0,
            "prompt_tokens": 3431,
            "completion_tokens": 3327
          },
          "step_name": "JSON Repair",
          "max_tokens": null,
          "started_at": "2026-07-23T22:38:29.785Z",
          "duration_ms": 27342,
          "finished_at": "2026-07-23T22:38:57.126Z",
          "retry_count": 0,
          "temperature": 0,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "JSON Repair input:\n- Broken model output\n- Validation issues",
          "prompt_tokens": 3431,
          "estimated_cost": 0.002511,
          "output_summary": "repaired JSON",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 16094,
          "completion_tokens": 3327,
          "output_size_bytes": 16098,
          "prompt_characters": 15958,
          "provider_request_id": null,
          "completion_characters": 15962
        },
        {
          "model": "gpt-4o-mini-2024-07-18",
          "repair": true,
          "success": true,
          "provider": "openai",
          "warnings": [],
          "raw_usage": {
            "model": "gpt-4o-mini-2024-07-18",
            "cached_tokens": 0,
            "prompt_tokens": 3708,
            "completion_tokens": 3680
          },
          "step_name": "JSON Repair",
          "max_tokens": null,
          "started_at": "2026-07-23T22:40:01.305Z",
          "duration_ms": 28955,
          "finished_at": "2026-07-23T22:40:30.260Z",
          "retry_count": 0,
          "temperature": 0,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "JSON Repair input:\n- Broken model output\n- Validation issues",
          "prompt_tokens": 3708,
          "estimated_cost": 0.002764,
          "output_summary": "repaired JSON",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 16976,
          "completion_tokens": 3680,
          "output_size_bytes": 17346,
          "prompt_characters": 16844,
          "provider_request_id": null,
          "completion_characters": 17212
        },
        {
          "model": "gpt-4o-mini-2024-07-18",
          "repair": true,
          "success": true,
          "provider": "openai",
          "warnings": [],
          "raw_usage": {
            "model": "gpt-4o-mini-2024-07-18",
            "cached_tokens": 0,
            "prompt_tokens": 3470,
            "completion_tokens": 3353
          },
          "step_name": "JSON Repair",
          "max_tokens": null,
          "started_at": "2026-07-23T22:40:30.270Z",
          "duration_ms": 35090,
          "finished_at": "2026-07-23T22:41:05.359Z",
          "retry_count": 0,
          "temperature": 0,
          "cached_tokens": 0,
          "error_message": null,
          "input_summary": "JSON Repair input:\n- Broken model output\n- Validation issues",
          "prompt_tokens": 3470,
          "estimated_cost": 0.002532,
          "output_summary": "repaired JSON",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 16301,
          "completion_tokens": 3353,
          "output_size_bytes": 16307,
          "prompt_characters": 16167,
          "provider_request_id": null,
          "completion_characters": 16173
        },
        {
          "model": "claude-sonnet-4-6",
          "repair": true,
          "success": false,
          "provider": "claude",
          "warnings": [
            "$.voiceover_text: voiceover_text is 83 words; hard cap is 80 (target 40–70)"
          ],
          "raw_usage": {
            "model": "claude-sonnet-4-6",
            "cached_tokens": 0,
            "prompt_tokens": 16731,
            "completion_tokens": 12288
          },
          "step_name": "Story Integrity Repair",
          "max_tokens": null,
          "started_at": "2026-07-23T22:34:53.512Z",
          "duration_ms": 371851,
          "finished_at": "2026-07-23T22:41:05.363Z",
          "retry_count": 2,
          "temperature": null,
          "cached_tokens": 0,
          "error_message": "$.voiceover_text: voiceover_text is 83 words; hard cap is 80 (target 40–70)",
          "input_summary": "Story Integrity Repair input:\n- Selected Candidate\n- Integrity violations\n- Prior package draft\n- RepairDelta (packs immutable)",
          "prompt_tokens": 16731,
          "estimated_cost": 0.234513,
          "output_summary": "Repair failed",
          "pricing_source": "list_price_estimate",
          "pricing_version": "list-price@2026-07-23",
          "response_format": "json",
          "input_size_bytes": 22803,
          "completion_tokens": 12288,
          "output_size_bytes": 16307,
          "prompt_characters": 22657,
          "provider_request_id": null,
          "completion_characters": 16173
        },
        {
          "model": null,
          "repair": false,
          "success": true,
          "provider": "deterministic",
          "warnings": [],
          "raw_usage": null,
          "step_name": "Product Demonstration Integrity",
          "max_tokens": null,
          "started_at": "2026-07-23T22:41:05.364Z",
          "duration_ms": 5,
          "finished_at": "2026-07-23T22:41:05.369Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Product Demonstration Integrity input:\n- Selected Candidate\n- Visual scenes\n- Voiceover",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "Passed",
          "pricing_source": null,
          "pricing_version": null,
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 66,
          "prompt_characters": null,
          "provider_request_id": null,
          "completion_characters": 66
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
          "started_at": "2026-07-23T22:41:05.390Z",
          "duration_ms": 0,
          "finished_at": "2026-07-23T22:41:05.390Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Platform Outputs input:\n- Presentation Generation package\n- Target platforms",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "Platforms: tiktok, instagram, youtube, facebook, linkedin, x",
          "pricing_source": null,
          "pricing_version": null,
          "response_format": null,
          "input_size_bytes": null,
          "completion_tokens": null,
          "output_size_bytes": 4126,
          "prompt_characters": null,
          "provider_request_id": null,
          "completion_characters": 4100
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
          "started_at": "2026-07-23T22:41:05.390Z",
          "duration_ms": 4239,
          "finished_at": "2026-07-23T22:41:09.629Z",
          "retry_count": 0,
          "temperature": null,
          "cached_tokens": null,
          "error_message": null,
          "input_summary": "Persist Package input:\n- Validated package\n- Content items fan-out plan",
          "prompt_tokens": null,
          "estimated_cost": null,
          "output_summary": "packageId=2a686bdb-5eae-453b-ba5a-91d0227c14af; items=11",
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
      "phases": [
        {
          "ok": false,
          "phase": "story_repair",
          "provider": "anthropic",
          "latency_ms": 371853
        }
      ],
      "version": "pipeline-telemetry@1",
      "pricing_version": "list-price@2026-07-23",
      "strategy_item_id": "c5af3498-f796-4deb-9594-94a4edd0d89c",
      "production_run_id": "fa619bb8-b9cc-4fc9-818e-28cf6055980a",
      "fidelity_final_passed": true,
      "candidate_repair_reasons": [],
      "full_package_generations": 1,
      "fidelity_first_pass_passed": true,
      "hook_deterministic_enforce_reason": "already_enforced",
      "fidelity_first_pass_failure_reasons": []
    },
    "product_presentation": {
      "version": "product-presentation@1",
      "rationale": [
        "story_prefers_outcome_over_framed:human",
        "fallback:abstract_system",
        "funnel_stage=problem_aware",
        "asset_coverage stance=optional quality_count=4",
        "Reveal ceiling ABSTRACT_PRODUCT_SYSTEM → abstract mechanism, not fake UI"
      ],
      "asset_binding": [],
      "fidelity_tier": "non_product_visual",
      "reveal_ceiling": "ABSTRACT_PRODUCT_SYSTEM",
      "forbidden_forms": [
        "synthetic_product_ui",
        "invented_screenshot",
        "generic_chat_as_product",
        "generic_dashboard_as_product",
        "brand_logo_as_product_demo",
        "landing_page_alone_as_value_proof"
      ],
      "appearance_claim": "NON_PRODUCT",
      "value_proof_mode": "via_abstract_mechanism",
      "presentation_class": "ABSTRACT_MECHANISM",
      "compatible_with_reveal": true,
      "should_show_product_appearance": false
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
      },
      {
        "hook": "Everything rehearsed. Except what happens when someone asks a question.",
        "topic": "The software company that spent six months building a pricing page — and still couldn't stop visitors from leaving it confused",
        "motifs": [
          "phone",
          "person_alone",
          "close_up",
          "product_asset"
        ],
        "closing": "Soft polished 3D render, portrait 9:16 vertical frame, bright even indoor illumination, wide environmental framing. The ",
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
        "attention_mechanism": "HUMAN_CONFLICT",
        "opening_visual_motif": "client_pointing_phone_while_owner_mouths",
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
        "opening_emotional_effect": "tension"
      },
      {
        "hook": "She left a five-star review. Just not for you.",
        "topic": "The local service company that tracked every call — and never once tracked how many people visited the website and left without a word",
        "motifs": [
          "desk",
          "dashboard",
          "person_alone",
          "group",
          "close_up",
          "overhead"
        ],
        "closing": "Clean flat illustration, portrait 9:16 vertical frame. Final narrative close. The same matte white desktop — now the two",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "sfx_category": "impact",
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "human",
        "opening_structure": "immediate_reaction",
        "cta_composition_id": null,
        "attention_mechanism": "PROVOCATIVE_OPINION",
        "opening_visual_motif": "crossing_post_more_wall_plan_writing",
        "dominant_subject_motif": "desk",
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM",
        "opening_emotional_effect": "strong_opinion"
      }
    ],
    "product_presentation_validation": {
      "passed": true,
      "summary": "product_presentation_validation_passed",
      "version": "product-presentation-validation@1",
      "violations": [],
      "appearance_claim": "NON_PRODUCT",
      "value_proof_without_product_demo": true
    }
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
- **voiceover characters:** 345
- **estimated words:** 56
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
    "IMAGE"
  ],
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
    "PHONE",
    "QUOTE",
    "CTA"
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
- API export JSON: `/api/production-runs/fa619bb8-b9cc-4fc9-818e-28cf6055980a/export`

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
| You've Been Defining Bounce Rate Wrong for Years | — | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |

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
