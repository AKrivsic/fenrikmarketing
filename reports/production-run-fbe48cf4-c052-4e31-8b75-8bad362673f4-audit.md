# Production Run Audit — fbe48cf4-c052-4e31-8b75-8bad362673f4

_Generated 2026-07-25T06:11:04.054Z by `scripts/audit-production-run.ts` (read-only)._

## A. Executive summary

- **Strategy items:** 1
- **Content packages:** 1
- **Primary video jobs (newest per item):** 1 (1 completed, 0 failed)
- **Content items (all variants):** 11
- **Scene types in worker inputs:** {}
- **Visual profile(s) on jobs:** MINIMAL (project auto: MINIMAL)
- **Voices used:** — (project default: cedar)
- **Moderation fallback scenes:** 0
- **Run warnings (subtitle/render flags):** 0
- **Major warnings:** None flagged on completed jobs.

## B. Run overview

| Field | Value |
| --- | --- |
| production_run_id | `fbe48cf4-c052-4e31-8b75-8bad362673f4` |
| project_id | `aabab9ff-9db4-4012-a53c-135e3bfea6cd` |
| project name | Fenrik.chat |
| status | completed |
| created_at | 2026-07-25T00:08:00.919353+00:00 |
| updated_at (terminal) | 2026-07-25T05:58:00.551003+00:00 |
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

- **dfb8f999-6a88-402e-87a7-bddedf65fbc5** — The leads your website is losing while you sleep
```json
{
  "theme": "The leads your website is losing while you sleep",
  "source": "production_run",
  "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
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
          "prompt_tokens": 4103,
          "completion_tokens": 221
        },
        "step_name": "Content Strategy",
        "max_tokens": 8192,
        "started_at": "2026-07-25T00:08:03.643Z",
        "duration_ms": 5197,
        "finished_at": "2026-07-25T00:08:08.839Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": 0,
        "error_message": null,
        "input_summary": "Content Strategy input:\n- Product Brain\n- Trends\n- Evergreen Topics\n- Anti-repetition Memory",
        "prompt_tokens": 4103,
        "estimated_cost": 0.015624,
        "output_summary": "Theme + funnel plan\n↓\n1 strategy item (requested 1)",
        "pricing_source": "list_price_estimate",
        "pricing_version": "list-price@2026-07-23",
        "response_format": "json",
        "input_size_bytes": 18225,
        "completion_tokens": 221,
        "output_size_bytes": 780,
        "prompt_characters": 18133,
        "provider_request_id": null,
        "completion_characters": 778
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
        "started_at": "2026-07-25T00:08:08.840Z",
        "duration_ms": 450,
        "finished_at": "2026-07-25T00:08:09.290Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": null,
        "error_message": null,
        "input_summary": "Strategy Items input:\n- Content Strategy plan\n- Funnel distribution\n- Tone / diversity balance",
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
    "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4"
  }
}
```

### production_run_items

```json
[
  {
    "id": "1c34a3ba-0913-40e5-8598-8ef5a44c122c",
    "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-25T00:08:01.238316+00:00",
    "updated_at": "2026-07-25T00:14:47.160212+00:00",
    "package_index": 0,
    "strategy_item_id": "51d2f466-2f1b-48e4-8fb7-1734cf469fdc",
    "failure_telemetry": null
  }
]
```

## C. Package-by-package audit

### Package 1 — Good Traffic Is a Lie

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `fb9839ea-92fd-461b-a1a5-002058ea4251` |
| strategy_item_id | `51d2f466-2f1b-48e4-8fb7-1734cf469fdc` |
| weekly_strategy_id | `dfb8f999-6a88-402e-87a7-bddedf65fbc5` |
| production_run_id | `fbe48cf4-c052-4e31-8b75-8bad362673f4` |
| status | draft |
| funnel_stage | problem_aware |
| created_at | 2026-07-25T00:09:52.65708+00:00 |
| updated_at | 2026-07-25T00:14:45.897074+00:00 |
| primary content_item_id | `6f2fef02-ee2c-4d7c-8c97-3d78c84bec01` |
| video_job_id | `` |
| video_job status | — |

#### Phase timings (pipeline telemetry)

```
Package generation

102 s

↓

Video Concept
34.3 s

↓

Opening Impact
3.5 s

↓

Visual Identity
1 ms

↓

Content Package
61.2 s

↓

Platform Outputs
1 ms

↓

Persist Package
3 s
```

##### Execution Time

| Step | Duration | % |
| --- | ---: | ---: |
| Video Concept | 34.3 s | 33.6% |
| Opening Impact | 3.5 s | 3.5% |
| Visual Identity | 1 ms | 0.0% |
| Content Package | 61.2 s | 60.0% |
| Platform Outputs | 1 ms | 0.0% |
| Persist Package | 3 s | 2.9% |
| **Total** | **102 s** | **100%** |

##### AI Cost

| Step | Prompt tok | Completion tok | Estimated $ |
| --- | ---: | ---: | ---: |
| Video Concept | 3876 | 1282 | $0.0309 |
| Opening Impact | 4212 | 159 | $0.0007 |
| Content Package | 9770 | 3178 | $0.0770 |
| **Total (est.)** |  |  | **$0.1086** |

##### Prompt Sizes

| Step | Prompt KB | Output KB |
| --- | ---: | ---: |
| Video Concept | 17.0 KB | 5.6 KB |
| Opening Impact | 20.5 KB | 0.7 KB |
| Visual Identity | — | 2.6 KB |
| Content Package | 39.4 KB | 12.2 KB |
| Platform Outputs | — | 3.9 KB |
| Persist Package | — | 0.5 KB |

##### Providers

| Provider | Steps | Duration |
| --- | ---: | ---: |
| Claude | 2 | 95.5 s |
| OpenAI | 1 | 3.5 s |
| Deterministic | 3 | 3 s |

#### Strategy input

- **topic:** The small business owner who checked her website analytics on Tuesday and realized every single weekend visitor had left without a trace
- **angle:** Walk through the quiet horror of seeing real traffic with zero leads — visitors who had questions, found silence, and moved on to whoever answered first. The website was live. The business was not.
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
  "angle": "Walk through the quiet horror of seeing real traffic with zero leads — visitors who had questions, found silence, and moved on to whoever answered first. The website was live. The business was not.",
  "topic": "The small business owner who checked her website analytics on Tuesday and realized every single weekend visitor had left without a trace",
  "source": "production_run",
  "pain_point": "Visitors leave before contacting you",
  "package_index": 0,
  "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4"
}
```

#### Full content (package_brief core)

**hook:**

You thought traffic meant success.


**voiceover_text:**

You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.


**subtitles:**

You thought traffic meant success. / She opened her analytics on Tuesday morning — 34 sessions over the weekend. / She smiled. / Then she looked at the leads column. / Zero. / No names. No emails. No record of anyone. / They came. They had questions. They found silence. / And they went to whoever answered first. / The website was live. / The business was not.


**video concept:**

A small business owner opens her analytics dashboard on a Tuesday morning, pleased by the weekend traffic numbers. The camera pushes in slowly as she sees the leads column: zero. The video then cuts through a sequence of silent visitor moments — people who arrived, had questions, got no response, and left for a competitor. The story closes with the reframe: traffic was never the problem. The silence was.


**video script:**

SCENE 1 — OPEN: Warm morning light. A woman in her late 30s sits at a lived-in desk, coffee in hand. She opens her laptop. Analytics dashboard fills the screen. Sessions: 34. She leans back, satisfied. The camera holds on her face — pleased.

VO: 'You thought traffic meant success.'

SCENE 2 — REALIZATION: Slow push-in on the screen. The lead column comes into focus. Zero. She leans closer. Scrolls. Nothing. No form fills. No emails. No names. Her expression changes — not panic, just stillness. Quiet math.

VO: 'She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone.'

SCENE 3 — VISITOR SEQUENCE: Screen-capture style inserts. A visitor lands on a service page at 9 PM Saturday. Reads. Has a question. Finds nothing to ask it. Opens a new tab — a competitor. Then another visitor. Then another. Each one gone.

VO: 'They came. They had questions. They found silence. And they went to whoever answered first.'

SCENE 4 — PRODUCT MOMENT: The same desk. Same woman. But now a soft teal chat interface sits in the corner of her website screen. A visitor question appears. An answer follows — instant. A lead notification pops. She didn't do anything. The website did.

VO: 'The website was live. The business was not.'

SCENE 5 — FINAL FRAME: Static wide shot. Desk, warm light, laptop. The analytics screen is visible — lead count no longer zero. Camera holds. No dialogue. The image does the work.


**duration_seconds (brief):** 42

**CTA:** Save this if you've ever checked your analytics and felt that quiet sinking feeling. (type: save)

**creative_mode:** 

**hashtags:** ["#smallbusiness","#websitetraffic","#leadgeneration","#businessowner","#servicebusiness","#growyourbusiness","#businesstips"]


#### Full platform copy

##### x

```json
{
  "cta": null,
  "format": "reel",
  "caption": "34 weekend visitors. 0 leads. The website was live. The business wasn't. That's the gap most analytics dashboards don't make obvious.",
  "hashtags": [
    "#smallbusiness"
  ],
  "title_variants": [
    "Good Traffic Is a Lie",
    "34 Sessions. 0 Leads.",
    "The Website Was Live. The Business Was Not.",
    "What Your Analytics Aren't Telling You",
    "Traffic Without Response Is Just a Record of Missed Chances"
  ],
  "caption_variants": [
    "34 weekend visitors. 0 leads. The website was live. The business wasn't. That's the gap most analytics dashboards don't make obvious.",
    "Traffic is not traction. It's just a record of people who showed up and found no one home.",
    "The leads column said zero. The sessions column said 34. That difference has a name: silence.",
    "She spent the weekend away from the desk. Her visitors spent it looking for answers somewhere else.",
    "Good bounce rate is a myth your analytics let you believe. The real number is how many left with their question still unanswered."
  ]
}
```
##### tiktok

```json
{
  "cta": null,
  "format": "reel",
  "caption": "34 visitors. 0 leads. Her website was live. Her business wasn't. 👀",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#leadgeneration",
    "#businessowner"
  ]
}
```
##### youtube

```json
{
  "cta": "Save this one.",
  "format": "short",
  "caption": "34 weekend visitors. Zero leads. She thought traffic meant success — until she looked closer. Save this one.",
  "hashtags": [
    "#smallbusiness",
    "#websitetips"
  ]
}
```
##### facebook

```json
{
  "cta": "Save this if it sounds familiar.",
  "format": "reel",
  "caption": "Ever opened your analytics and felt quietly proud of the traffic — then noticed zero leads came from it? 😶 That's the gap most business owners don't see until it's been happening for months. Your visitors had questions. Your website had nothing to say. Save this if it sounds familiar, and share it with a business owner who needs to hear it.",
  "hashtags": [
    "#smallbusiness",
    "#businesstips"
  ]
}
```
##### linkedin

```json
{
  "cta": null,
  "format": "reel",
  "caption": "Most small business owners use traffic as a proxy for marketing success. It is not.\n\nTraffic tells you people arrived. It says nothing about what happened next — whether they had a question, whether anything answered it, or whether they left for a competitor who did.\n\nThe gap between sessions and leads is where the real story lives. And most dashboards make it very easy not to look at it.\n\nIf your analytics show sessions but the leads column stays quiet, the problem is rarely the traffic.",
  "hashtags": [
    "#smallbusiness",
    "#leadgeneration"
  ],
  "caption_variants": [
    "Most small business owners use traffic as a proxy for marketing success. It is not.\n\nTraffic tells you people arrived. It says nothing about what happened next — whether they had a question, whether anything answered it, or whether they left for a competitor who did.\n\nThe gap between sessions and leads is where the real story lives. And most dashboards make it very easy not to look at it.\n\nIf your analytics show sessions but the leads column stays quiet, the problem is rarely the traffic.",
    "A business owner checked her analytics on Tuesday. Thirty-four sessions over the weekend. She was pleased — until she looked at the leads column.\n\nZero.\n\nNo names. No emails. No form fills. Just a clean record of people who came, had a question, found silence, and moved on.\n\nThe site was live. The business was not.\n\nThis is the gap that most service businesses are not measuring — and it compounds quietly, weekend after weekend."
  ]
}
```
##### instagram

```json
{
  "cta": "Save this if that number has ever looked familiar.",
  "format": "reel",
  "caption": "She checked her analytics on Tuesday morning and felt it.\n\n34 sessions. Zero leads. No names. No emails. Just a quiet record of people who came, had questions, and left.\n\nThe website was live. The business wasn't.\n\nSave this if that number has ever looked familiar.",
  "hashtags": [
    "#smallbusiness",
    "#websitetraffic",
    "#leadgeneration",
    "#businesstips",
    "#servicebusiness",
    "#onlinepresence",
    "#growyourbusiness"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement."
    },
    {
      "source": "ai",
      "image_prompt": "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness."
    },
    {
      "source": "ai",
      "image_prompt": "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left."
    },
    {
      "source": "ai",
      "image_prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised."
    },
    {
      "source": "ai",
      "image_prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
    }
  ],
  "image_prompts": [
    "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement.",
    "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness.",
    "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left.",
    "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised.",
    "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
  ],
  "asset_usage": [],
  "presentation_generation": {
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
- **voiceover characters:** 343
- **estimated words:** 59
- **audio_duration (debug):** —
- **TTS validation attempts:** —
- **tail validation passed:** —
- **tts_tail_retry_used:** —

#### Visual profile

- **package/job profile:** MINIMAL
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
- API export JSON: `/api/production-runs/fbe48cf4-c052-4e31-8b75-8bad362673f4/export`

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
| Good Traffic Is a Lie | — | MINIMAL | 0 | 0 | 0 | 0 | 0 | no | 0 |

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
