# Production Run Audit — 5e8465bc-107c-4d0b-beb9-516ceb5b9812

_Generated 2026-07-13T23:35:04.464Z by `scripts/audit-production-run.ts` (read-only)._

## A. Executive summary

- **Strategy items:** 3
- **Content packages:** 3
- **Primary video jobs (newest per item):** 3 (3 completed, 0 failed)
- **Content items (all variants):** 23
- **Scene types in worker inputs:** {"IMAGE":9}
- **Visual profile(s) on jobs:** EDITORIAL (project auto: EDITORIAL)
- **Voices used:** shimmer (project default: shimmer)
- **Moderation fallback scenes:** 0
- **Run warnings (subtitle/render flags):** 0
- **Major warnings:** None flagged on completed jobs.

## B. Run overview

| Field | Value |
| --- | --- |
| production_run_id | `5e8465bc-107c-4d0b-beb9-516ceb5b9812` |
| project_id | `163c1822-ad30-4cee-8826-dfacd9c188b9` |
| project name | fenrik Studio |
| status | completed |
| created_at | 2026-07-12T19:19:32.058668+00:00 |
| updated_at (terminal) | 2026-07-12T19:34:58.294222+00:00 |
| package_count | 3 |
| requested_total | 3 |
| generated_total | 3 |
| failed_total | 0 |
| error_message |  |
| language | en |
| market_scope | global |

### requested_config

```json
{
  "plan": {
    "videoCount": 3,
    "packageCount": 3,
    "totalOutputs": 23,
    "platformOutputs": [
      {
        "kind": "video",
        "label": "TikTok",
        "outputs": 3,
        "platform": "tiktok",
        "multiplier": 1
      },
      {
        "kind": "video",
        "label": "Instagram",
        "outputs": 3,
        "platform": "instagram",
        "multiplier": 1
      },
      {
        "kind": "text",
        "label": "Facebook",
        "outputs": 2,
        "platform": "facebook",
        "multiplier": 0.67
      },
      {
        "kind": "video",
        "label": "YouTube",
        "outputs": 3,
        "platform": "youtube",
        "multiplier": 1
      },
      {
        "kind": "text",
        "label": "LinkedIn",
        "outputs": 2,
        "platform": "linkedin",
        "multiplier": 0.67
      },
      {
        "kind": "text",
        "label": "X",
        "outputs": 10,
        "platform": "x",
        "multiplier": 3.33
      }
    ],
    "textOutputsTotal": 14,
    "videoOutputsTotal": 9
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
      "x": 3.33,
      "tiktok": 1,
      "youtube": 1,
      "facebook": 0.67,
      "linkedin": 0.67,
      "instagram": 1
    },
    "packageCount": 3,
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

- **f00ef91a-0508-4fbc-a7bc-5c408a5ed4d1** — The hidden cost of inconsistent social content — and the shortest path out
```json
{
  "theme": "The hidden cost of inconsistent social content — and the shortest path out",
  "source": "production_run",
  "production_run_id": "5e8465bc-107c-4d0b-beb9-516ceb5b9812",
  "funnel_distribution": {
    "Awareness": 1,
    "Conversion": 0,
    "Problem Aware": 1,
    "Solution Aware": 1
  }
}
```

### production_run_items

```json
[
  {
    "id": "8bf621b6-f468-4759-b170-d4d14b144fae",
    "production_run_id": "5e8465bc-107c-4d0b-beb9-516ceb5b9812",
    "project_id": "163c1822-ad30-4cee-8826-dfacd9c188b9",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "ef7f50e7-d1f7-464e-903e-f6db52c508b4",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-12T19:19:32.367686+00:00",
    "updated_at": "2026-07-12T19:25:31.424479+00:00"
  },
  {
    "id": "85437771-0b44-4501-a76a-da34411d2410",
    "production_run_id": "5e8465bc-107c-4d0b-beb9-516ceb5b9812",
    "project_id": "163c1822-ad30-4cee-8826-dfacd9c188b9",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "9747ae1a-9be2-4157-94bf-523f2ddd29b3",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-12T19:19:32.367686+00:00",
    "updated_at": "2026-07-12T19:29:33.19613+00:00"
  },
  {
    "id": "62168f6c-cdf2-4b35-bff6-32ef79ea6800",
    "production_run_id": "5e8465bc-107c-4d0b-beb9-516ceb5b9812",
    "project_id": "163c1822-ad30-4cee-8826-dfacd9c188b9",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "35b1c8d8-6511-4079-8ddd-f9f73fd8d73d",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-12T19:19:32.367686+00:00",
    "updated_at": "2026-07-12T19:34:58.172902+00:00"
  }
]
```

## C. Package-by-package audit

### Package 1 — The Tab They Close Without Saying a Word

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `ef7f50e7-d1f7-464e-903e-f6db52c508b4` |
| strategy_item_id | `789111b1-bdbb-4edc-9466-312c22ac6042` |
| weekly_strategy_id | `f00ef91a-0508-4fbc-a7bc-5c408a5ed4d1` |
| production_run_id | `5e8465bc-107c-4d0b-beb9-516ceb5b9812` |
| status | draft |
| funnel_stage | awareness |
| created_at | 2026-07-12T19:20:43.916749+00:00 |
| updated_at | 2026-07-12T20:19:52.958783+00:00 |
| primary content_item_id | `67e4f201-3cfc-4c6a-8782-eacb4b9ebfc4` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** The moment a potential customer checks your social profile and quietly moves on
- **angle:** Walk through what actually happens in the seconds after someone discovers your business — they Google you, find your profile, see a post from four months ago, and close the tab. No dramatic moment. No bad review. Just silence. The pain point is that an inactive account is doing active damage without anyone noticing, and most founders have no idea it is happening to them right now.
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
  "angle": "Walk through what actually happens in the seconds after someone discovers your business — they Google you, find your profile, see a post from four months ago, and close the tab. No dramatic moment. No bad review. Just silence. The pain point is that an inactive account is doing active damage without anyone noticing, and most founders have no idea it is happening to them right now.",
  "topic": "The moment a potential customer checks your social profile and quietly moves on",
  "source": "production_run",
  "package_index": 0,
  "production_run_id": "5e8465bc-107c-4d0b-beb9-516ceb5b9812"
}
```

#### Full content (package_brief core)

**hook:**

You're not losing customers to bad reviews. You're losing them to a four-month-old post.


**voiceover_text:**

Here's the thing nobody tells you: most people don't bounce because your product is bad. They bounce because your last post was four months ago. That silence reads as 'closed for business.' No drama, no complaint — just a closed tab. And it's happening right now, without a single notification. One URL is all it takes to fix it. Your first content package is free.


**subtitles:**

You're not losing customers to bad reviews. You're losing them to a four-month-old post. Most people don't bounce because your product is bad — they bounce because your last post was four months ago. That silence reads as 'closed for business.' No drama, no complaint. Just a closed tab. And it's happening right now, without a single notification. One URL is all it takes to fix it. Your first content package is free.


**video concept:**

A fast vertical short that opens on the specific mistake: assuming bad reviews are the main threat to your business. The twist: the real damage is quiet — an inactive social profile that signals 'we might not exist anymore.' The payoff: one URL fixes it, and the first package is free. Tone is witty, warm, and a little alarming — like a friend who just spotted something you missed.


**video script:**

BEAT 1 — UNEXPECTED FACT (0–4s): Close-up of a person's thumb hovering over a social profile, then swiping away. VO: 'You're not losing customers to bad reviews. You're losing them to a four-month-old post.'

BEAT 2 — IMPLICATION (4–12s): A social feed shown on a phone, the last post visibly old, the account visually dormant. VO: 'Most people don't bounce because your product is bad — they bounce because your last post was four months ago. That silence reads as closed for business. No drama, no complaint. Just a closed tab.'

BEAT 3 — PROOF (12–18s): A calm, confident scene — a person at a desk, a browser tab with a business website open, relaxed and in control. VO: 'And it's happening right now, without a single notification.'

BEAT 4 — CTA (18–22s): Clean end card. VO: 'One URL is all it takes to fix it. Your first content package is free.'


**duration_seconds (brief):** 22

**CTA:** Give us your website URL — your first content package is free, no payment required. (type: sign_up)

**creative_mode:** 

**hashtags:** ["#socialmedia","#contentmarketing","#smallbusiness","#saas","#founderlife","#digitalmarketing","#contentcreation","#brandawareness","#marketingstrategy","#socialmediatips"]


#### Full platform copy

##### x

```json
{
  "cta": "One URL fixes it — first content package is free.",
  "format": "X post (text)",
  "caption": "You're not losing customers to bad reviews. You're losing them to a post from four months ago. That silence is the whole signal someone needs to close the tab.",
  "hashtags": [
    "#socialmedia",
    "#contentmarketing"
  ],
  "title_variants": [
    "The silent thing losing you customers right now",
    "Your inactive social profile is doing active damage",
    "Nobody warns you about this lead killer"
  ],
  "caption_variants": [
    "You're not losing customers to bad reviews. You're losing them to a post from four months ago. That silence is the whole signal someone needs to close the tab.",
    "An inactive social profile doesn't just look bad — it actively tells new visitors you might not exist anymore. No complaint. Just a closed tab and a missed lead.",
    "Imagine someone finds your product, gets excited, clicks your profile — and sees nothing posted since last quarter. That's not a branding issue. That's a closing door."
  ]
}
```
##### tiktok

```json
{
  "cta": "Comment 'URL' and I'll show you what one website link can actually do.",
  "format": "Vertical short-form video (TikTok)",
  "caption": "Nobody tells you this — the thing quietly killing your leads isn't a bad review. It's a post from four months ago. That's the whole signal someone needs to close the tab and move on. 🫠",
  "hashtags": [
    "#socialmedia",
    "#contentcreator",
    "#smallbusiness",
    "#marketingtips"
  ]
}
```
##### youtube

```json
{
  "cta": "Subscribe for more and grab your free first content package at fenrik.studio.",
  "format": "YouTube Short (vertical)",
  "caption": "The silent reason potential customers quietly leave — and how to stop it.\n\nMost founders assume they lose leads to bad reviews or a slow website. The real reason is quieter and more common: an inactive social profile that signals the business might not be around anymore. No complaint, no feedback — just a closed tab. This short breaks down exactly what happens in those first few seconds when someone discovers your business, and what one website URL can do to change it. fenrik Studio turns your URL into ready-to-post content for every major platform — your first package is free at https://fenrik.studio",
  "hashtags": [
    "#contentmarketing",
    "#socialmediatips",
    "#smallbusiness"
  ]
}
```
##### facebook

```json
{
  "cta": "Submit your website and get your first content package free — no payment required. https://fenrik.studio",
  "format": "Facebook video post + caption",
  "caption": "Most businesses assume they're losing customers to bad reviews or slow response times. The real culprit? A social profile that hasn't posted in four months. To a new visitor, that silence says one thing: 'We might not be open.' No drama, no warning — just a closed tab. fenrik Studio turns your website URL into ready-to-post content across every platform, so your profile never goes quiet again. 🙌",
  "hashtags": [
    "#socialmedia",
    "#smallbusiness"
  ]
}
```
##### linkedin

```json
{
  "cta": "What does your most recent post say about your business right now?",
  "format": "LinkedIn text post",
  "caption": "Most founders think they lose potential customers to a bad review or a slow response time. The real culprit is less visible: a social profile with a post from four months ago.\n\nTo someone who just discovered your business, that silence carries a message — and it is not a good one. They do not leave a comment or send a message. They simply close the tab.\n\nConsistent content is not a nice-to-have. It is the first signal that your business is active, credible, and worth contacting. The overlooked detail is that most founders have no idea this is happening to them right now.\n\nfenrik Studio generates ready-to-post social content from your website URL — no content team, no editing required. First package is free.",
  "hashtags": [
    "#contentmarketing",
    "#socialmedia",
    "#b2bmarketing"
  ]
}
```
##### instagram

```json
{
  "cta": "Link in bio to get your first content package free — no payment needed.",
  "format": "Vertical Reel + static feed post",
  "caption": "Here's the detail most founders miss: your potential customers aren't leaving because of a bad review. They're leaving because your last post is four months old — and that silence reads as 'we might not be around anymore.' 👀\n\nNo complaint. No feedback. Just a closed tab and a lost opportunity. The good news? One URL is all it takes to start fixing it.",
  "hashtags": [
    "#contentmarketing",
    "#socialmediamarketing",
    "#smallbusiness",
    "#saas",
    "#founderlife",
    "#digitalmarketing",
    "#contentcreation",
    "#brandawareness",
    "#marketingstrategy",
    "#socialmediatips"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Extreme close-up vertical portrait shot of a person's hand holding a smartphone, thumb mid-swipe across a social media profile screen. The profile screen shows a grid of posts where the most recent one appears visibly old — faded, out of season. The person's expression is neutral, slightly disinterested. Warm ambient indoor light. Clean, editorial composition. 9:16 portrait framing, subject centered, no readable text on the screen."
    },
    {
      "source": "ai",
      "image_prompt": "Vertical portrait shot of a smartphone held in one hand, screen displaying a social media profile with a sparse, dormant-looking post grid — only a few posts visible, large empty space below. The background is a softly lit home office or living room. The mood is quiet and slightly hollow, not dramatic. Editorial photography style, controlled composition. 9:16 portrait framing, no readable text on screen."
    },
    {
      "source": "ai",
      "image_prompt": "Vertical portrait shot of a person sitting calmly at a minimal desk, a laptop open in front of them showing a business website with a recognizable layout — navigation bar, hero image, structured content sections, no readable text. The person looks focused and at ease, one hand resting near the keyboard. Bright, airy natural light from a side window. Clean editorial framing. 9:16 portrait, subject centered."
    },
    {
      "type": "CTA",
      "payload": {
        "subline": "One URL. First content package free.",
        "headline": "Your social profile is losing people right now.",
        "show_logo": true,
        "button_label": "Get started free"
      }
    }
  ],
  "image_prompts": [
    "Extreme close-up vertical portrait shot of a person's hand holding a smartphone, thumb mid-swipe across a social media profile screen. The profile screen shows a grid of posts where the most recent one appears visibly old — faded, out of season. The person's expression is neutral, slightly disinterested. Warm ambient indoor light. Clean, editorial composition. 9:16 portrait framing, subject centered, no readable text on the screen.",
    "Vertical portrait shot of a smartphone held in one hand, screen displaying a social media profile with a sparse, dormant-looking post grid — only a few posts visible, large empty space below. The background is a softly lit home office or living room. The mood is quiet and slightly hollow, not dramatic. Editorial photography style, controlled composition. 9:16 portrait framing, no readable text on screen.",
    "Vertical portrait shot of a person sitting calmly at a minimal desk, a laptop open in front of them showing a business website with a recognizable layout — navigation bar, hero image, structured content sections, no readable text. The person looks focused and at ease, one hand resting near the keyboard. Bright, airy natural light from a side window. Clean editorial framing. 9:16 portrait, subject centered."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "project_id": "163c1822-ad30-4cee-8826-dfacd9c188b9",
    "visual_profile": "EDITORIAL",
    "frequency_decisions": [],
    "requested_cta_count": 1,
    "downgraded_cta_count": 0,
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_profile_scores": {
      "BOLD": 1,
      "MINIMAL": 3,
      "NATURAL": 5,
      "PREMIUM": 0,
      "EDITORIAL": 13
    },
    "visual_profile_source": "auto",
    "downgraded_phone_count": 0,
    "downgraded_quote_count": 0,
    "visual_profile_reasons": [
      "NATURAL:local(+1)",
      "NATURAL:practical(+1)",
      "NATURAL:relatable(+1)",
      "NATURAL:empathetic(+1)",
      "NATURAL:everyday(+1)",
      "MINIMAL:saas(+1)",
      "MINIMAL:platform(+1)",
      "MINIMAL:minimal(+1)"
    ],
    "visual_profile_version": "visual-profile@2",
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
  },
  "presentation_analyzer": null
}
```

#### Scene-by-scene

| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |
| ---: | --- | --- | --- | --- | --- |

#### TTS / voice

- **requested TTS voice (job input):** —
- **resolved at render:** shimmer
- **project voice resolution:** legacy default (no presentation override) → `shimmer`
- **differs from alloy:** yes
- **TTS instructions applied:** yes (project)
- **voiceover characters:** 365
- **estimated words:** 65
- **audio_duration (debug):** —
- **TTS validation attempts:** —
- **tail validation passed:** —
- **tts_tail_retry_used:** —

#### Visual profile

- **package/job profile:** EDITORIAL
- **version:** visual-profile@2
- **project auto-resolved profile:** EDITORIAL (source: auto)
- **EDITORIAL prompt style token:** Editorial photography, controlled composition, refined framing, subtle color treatment.
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
  "final_worker_scene_types": null,
  "prompt_presentation_types": [
    "IMAGE",
    "CHECKLIST",
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

- Production: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/production`
- Review: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/review`
- Content packages: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/content-packages`
- Videos / scene editor: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/videos`
- API export JSON: `/api/production-runs/5e8465bc-107c-4d0b-beb9-516ceb5b9812/export`

### Package 2 — The Last-Minute Panic That Proves Content Always Loses

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `9747ae1a-9be2-4157-94bf-523f2ddd29b3` |
| strategy_item_id | `39f51463-8dd8-4616-a3f0-6dedc2f9cda8` |
| weekly_strategy_id | `f00ef91a-0508-4fbc-a7bc-5c408a5ed4d1` |
| production_run_id | `5e8465bc-107c-4d0b-beb9-516ceb5b9812` |
| status | draft |
| funnel_stage | problem_aware |
| created_at | 2026-07-12T19:21:50.700472+00:00 |
| updated_at | 2026-07-12T19:29:32.545204+00:00 |
| primary content_item_id | `1699609b-3355-42a4-92c4-c0ba9992c707` |
| video_job_id | `05249705-7d2c-4e12-8c70-67fa284a8de0` |
| video_job status | completed |

#### Strategy input

- **topic:** Why 'we'll sort content next week' has been on the list for two months straight
- **angle:** Frame the story around a small marketing team that keeps bumping 'post on social' to the following week — not because they are lazy, but because every hour spent on content is an hour not spent on the actual business. The video exposes the real cost: content production competes directly with revenue-generating work, and for small teams it almost always loses. The pain is the opportunity cost, not the missed post.
- **package_index:** 1
- **platform:** tiktok
- **format:** reel
- **priority:** 2
- **funnel_stage (column):** problem_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "Frame the story around a small marketing team that keeps bumping 'post on social' to the following week — not because they are lazy, but because every hour spent on content is an hour not spent on the actual business. The video exposes the real cost: content production competes directly with revenue-generating work, and for small teams it almost always loses. The pain is the opportunity cost, not the missed post.",
  "topic": "Why 'we'll sort content next week' has been on the list for two months straight",
  "source": "production_run",
  "package_index": 1,
  "production_run_id": "5e8465bc-107c-4d0b-beb9-516ceb5b9812"
}
```

#### Full content (package_brief core)

**hook:**

Every week you say you'll sort content later — and later just became two months ago.


**voiceover_text:**

Every week you say you'll sort content later. But here's the thing: later just became two months ago. When a real deadline hits — a launch, a pitch, a product update — content is always the first thing that gets bumped. Not because it doesn't matter. Because everything else is on fire. And your five platforms have been quiet the whole time.


**subtitles:**

Every week you say you'll sort content later. | But later just became two months ago. | When a real deadline hits — a launch, a pitch, a product update — | content is always the first thing that gets bumped. | Not because it doesn't matter. | Because everything else is on fire. | And your five platforms have been quiet the whole time.


**video concept:**

A fast-paced vertical short that opens on the specific mistake of perpetually deferring content, then reveals the real cost: every high-pressure business moment silently kills your social presence across all platforms. The tone is calm and direct — like a trusted colleague naming the thing nobody says out loud. Visuals escalate from a busy team in crisis mode to a row of dormant social profiles, landing on a quiet but clear CTA.


**video script:**

BEAT 1 — UNEXPECTED FACT (0–4s): Close-up of a stressed small team mid-sprint, phones and laptops everywhere. VO: 'Every week you say you'll sort content later. But here's the thing: later just became two months ago.'

BEAT 2 — IMPLICATION (5–12s): Wide shot of five social platform icons on a phone screen, all showing zero recent activity. VO: 'When a real deadline hits — a launch, a pitch, a product update — content is always the first thing that gets bumped. Not because it doesn't matter.'

BEAT 3 — IMPLICATION CONTINUES (13–18s): Same team, heads down, completely absorbed in work, social media tab visibly ignored in the background. VO: 'Because everything else is on fire. And your five platforms have been quiet the whole time.'

BEAT 4 — CTA (19–22s): Clean, calm end card. VO fades. On-screen text only: 'Drop your website URL — your first content package is free.'


**duration_seconds (brief):** 22

**CTA:** Drop your website URL — your first content package is free, no payment needed. (type: lead)

**creative_mode:** shock

**hashtags:** ["#contentmarketing","#socialmediamarketing","#smallbusiness","#digitalmarketing","#marketingstrategy","#contentcreation","#saasmarketing","#entrepreneurlife"]


#### Full platform copy

##### x

```json
{
  "cta": "First content package is free — just your website URL: https://fenrik.studio",
  "format": "post",
  "caption": "Content keeps losing to real work. Not because it doesn't matter — because a launch, a deadline, or a client call always matters more right now. Two months later, five platforms are quiet.",
  "hashtags": [
    "#contentmarketing",
    "#socialmedia"
  ],
  "title_variants": [
    "The real reason your social accounts go quiet every time business picks up",
    "A bold truth about small teams and content schedules",
    "What actually happens when 'we'll post next week' meets a real deadline",
    "A two-month silence across five platforms — and it wasn't anyone's fault"
  ],
  "caption_variants": [
    "Content keeps losing to real work. Not because it doesn't matter — because a launch, a deadline, or a client call always matters more right now. Two months later, five platforms are quiet.",
    "Hot take: 'post on social this week' is not a task. It's a placeholder for the week when nothing urgent happens. That week never comes.",
    "A product update lands. A client escalates. The week explodes. Content gets pushed — again. Multiply that by five platforms and two months and you have a social presence that looks abandoned.",
    "Nobody on a small team decides to go quiet on social. It just happens — one bumped week at a time — until you check and realise it's been eight weeks across every channel."
  ]
}
```
##### tiktok

```json
{
  "cta": "link in bio — first content package is free, no payment needed",
  "format": "vertical short (TikTok / Reels / Shorts)",
  "caption": "you keep saying you'll sort content next week. it's been two months. every time something real comes up — a launch, a deadline, anything — content gets pushed. and your platforms just sit there, quiet. not a great look when someone checks.",
  "hashtags": [
    "#contentcreator",
    "#smallbusiness",
    "#socialmediatips",
    "#marketingtips"
  ]
}
```
##### youtube

```json
{
  "cta": "Subscribe for more honest takes on content and social media for small teams.",
  "format": "YouTube Short + description",
  "caption": "Why 'we'll sort content next week' silently kills your social presence across every platform.\n\nFor most small teams, content doesn't get skipped out of laziness — it gets skipped because a real business deadline always takes priority. The problem is that every platform goes quiet at the same time, and it happens faster than anyone notices. This video names the actual cost: not a missed post, but a sustained absence across five channels while the business keeps running. If your social accounts are consistently behind, this is the reason — and there's a straightforward fix that doesn't require your team's time.",
  "hashtags": [
    "#contentmarketing",
    "#socialmediatips",
    "#smallbusinessmarketing"
  ]
}
```
##### facebook

```json
{
  "cta": "Submit your website URL and get your first content package free — no payment needed. https://fenrik.studio",
  "format": "video post + caption",
  "caption": "Most small teams don't go quiet on social because they stopped caring. They go quiet because a product launch moved up, a client called, or the week just got away from them — and content was the thing that could wait. Except it's been waiting for two months now, across every platform. If that sounds familiar, there's a simpler way to stay consistent without it competing with your actual work.",
  "hashtags": [
    "#socialmedia",
    "#smallbusiness"
  ]
}
```
##### linkedin

```json
{
  "cta": "Curious how other small teams are handling this — what's the first thing that gets cut when the week gets busy?",
  "format": "text post",
  "caption": "There's a pattern most small marketing teams recognise immediately: content keeps appearing on the weekly to-do list, and it keeps getting moved to the following week.\n\nIt's not laziness. It's prioritisation. When a product update, a client deliverable, or a pipeline conversation needs attention, content creation is the work that can wait — until it's been waiting for two months across every platform simultaneously.\n\nThe real cost isn't a missed post. It's a sustained absence at the exact moment someone is deciding whether your business is active and worth contacting.\n\nFor teams where content consistently loses to revenue-generating work, the answer isn't better time management. It's removing content production from the team's plate entirely.",
  "hashtags": [
    "#contentmarketing",
    "#b2bmarketing",
    "#socialmedia"
  ]
}
```
##### instagram

```json
{
  "cta": "First content package is free — link in bio to get started.",
  "format": "vertical short (Reels) + caption",
  "caption": "Here's the thing nobody says out loud: content doesn't get bumped because it's unimportant. It gets bumped because a launch just moved up, a client needs something urgently, or the week went sideways — again. And while your team is heads-down on the real work, five platforms quietly go dark. 📵 That's not a planning failure. That's just what happens when content competes with everything else that pays.",
  "hashtags": [
    "#socialmediamarketing",
    "#contentmarketing",
    "#smallbusinessowner",
    "#marketingstrategy",
    "#contentcreation",
    "#saasmarketing",
    "#digitalmarketing",
    "#entrepreneurlife"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Vertical 9:16 portrait composition. A small team of two or three people crowded around a cluttered desk covered in open laptops and scattered notes, mid-sprint energy — one person pointing at a screen, another typing urgently. The scene feels genuinely busy and pressured, not staged. Warm overhead office lighting, slightly dishevelled environment. The mood communicates 'everything is on fire right now.' No readable text, no signs, no UI labels visible."
    },
    {
      "source": "ai",
      "image_prompt": "Vertical 9:16 portrait composition. A close-up of a smartphone held in one hand, screen facing the viewer. The screen displays a recognisable grid of five social media app icons — the icons are generic coloured shapes suggesting different platforms, not branded logos. Each icon shows a subtle visual indicator of inactivity: faded colour, a small greyed-out badge, or a dim glow — communicating dormancy without readable text. Clean, slightly cool ambient light. No words, no captions, no readable UI text anywhere in the image."
    },
    {
      "source": "ai",
      "image_prompt": "Vertical 9:16 portrait composition. Same small team environment as the first beat, but now shot from slightly further back. The team members are fully absorbed in their laptops and papers, heads down, completely focused on urgent work. In the soft background, a browser tab or a social media feed is barely visible on a secondary screen — untouched, unlit, ignored. The contrast between the frenetic foreground and the quiet background screen communicates the idea that social content has been silently abandoned. Warm task-lighting on the foreground, cooler dim glow on the background screen. No readable text anywhere."
    },
    {
      "source": "ai",
      "image_prompt": "Vertical 9:16 portrait composition. A calm, minimal end-card scene: a clean light-toned surface — a desk or table — with a single smartphone lying face-up, screen softly glowing with a neutral interface suggesting a content feed coming back to life. The mood shifts from pressure to quiet resolution. Soft, even natural light. No text, no logos, no readable captions in the image itself. Generous headroom and footroom for subtitle and CTA overlay."
    }
  ],
  "image_prompts": [
    "Vertical 9:16 portrait composition. A small team of two or three people crowded around a cluttered desk covered in open laptops and scattered notes, mid-sprint energy — one person pointing at a screen, another typing urgently. The scene feels genuinely busy and pressured, not staged. Warm overhead office lighting, slightly dishevelled environment. The mood communicates 'everything is on fire right now.' No readable text, no signs, no UI labels visible.",
    "Vertical 9:16 portrait composition. A close-up of a smartphone held in one hand, screen facing the viewer. The screen displays a recognisable grid of five social media app icons — the icons are generic coloured shapes suggesting different platforms, not branded logos. Each icon shows a subtle visual indicator of inactivity: faded colour, a small greyed-out badge, or a dim glow — communicating dormancy without readable text. Clean, slightly cool ambient light. No words, no captions, no readable UI text anywhere in the image.",
    "Vertical 9:16 portrait composition. Same small team environment as the first beat, but now shot from slightly further back. The team members are fully absorbed in their laptops and papers, heads down, completely focused on urgent work. In the soft background, a browser tab or a social media feed is barely visible on a secondary screen — untouched, unlit, ignored. The contrast between the frenetic foreground and the quiet background screen communicates the idea that social content has been silently abandoned. Warm task-lighting on the foreground, cooler dim glow on the background screen. No readable text anywhere.",
    "Vertical 9:16 portrait composition. A calm, minimal end-card scene: a clean light-toned surface — a desk or table — with a single smartphone lying face-up, screen softly glowing with a neutral interface suggesting a content feed coming back to life. The mood shifts from pressure to quiet resolution. Soft, even natural light. No text, no logos, no readable captions in the image itself. Generous headroom and footroom for subtitle and CTA overlay."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "project_id": "163c1822-ad30-4cee-8826-dfacd9c188b9",
    "visual_profile": "EDITORIAL",
    "frequency_decisions": [],
    "requested_cta_count": 0,
    "downgraded_cta_count": 0,
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_profile_scores": {
      "BOLD": 1,
      "MINIMAL": 3,
      "NATURAL": 5,
      "PREMIUM": 0,
      "EDITORIAL": 13
    },
    "visual_profile_source": "auto",
    "downgraded_phone_count": 0,
    "downgraded_quote_count": 0,
    "visual_profile_reasons": [
      "NATURAL:local(+1)",
      "NATURAL:practical(+1)",
      "NATURAL:relatable(+1)",
      "NATURAL:empathetic(+1)",
      "NATURAL:everyday(+1)",
      "MINIMAL:saas(+1)",
      "MINIMAL:platform(+1)",
      "MINIMAL:minimal(+1)"
    ],
    "visual_profile_version": "visual-profile@2",
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
      "CTA"
    ],
    "presentation_generation": {
      "mode": "enabled",
      "package_id": "9747ae1a-9be2-4157-94bf-523f2ddd29b3",
      "project_id": "163c1822-ad30-4cee-8826-dfacd9c188b9",
      "visual_profile": "EDITORIAL",
      "downgrade_rules": [],
      "history_decisions": [],
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
      "visual_profile_version": "visual-profile@2",
      "accepted_checklist_count": 0,
      "accepted_statistic_count": 0,
      "final_worker_scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "requested_checklist_count": 0,
      "requested_statistic_count": 0,
      "checklist_allowlist_status": "allowlisted",
      "checklist_renderer_version": null,
      "downgraded_checklist_count": 0,
      "downgraded_statistic_count": 0,
      "statistic_renderer_version": null
    }
  }
}
```

#### Scene-by-scene

| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |
| ---: | --- | --- | --- | --- | --- |
| 1 | scene-1 | IMAGE | image@1 | `video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/05249705-7d2c-4e12-8c70-67fa284a8de0/scene-scene-1.png` | — |
| 2 | scene-2 | IMAGE | image@1 | `video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/05249705-7d2c-4e12-8c70-67fa284a8de0/scene-scene-2.png` | — |
| 3 | scene-3 | IMAGE | image@1 | `video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/05249705-7d2c-4e12-8c70-67fa284a8de0/scene-scene-3.png` | — |
| 4 | scene-4 | IMAGE | image@1 | `video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/05249705-7d2c-4e12-8c70-67fa284a8de0/scene-scene-4.png` | — |

**Scene 1 (scene-1) — image_prompt (job input)**

```
Vertical 9:16 portrait composition. A small team of two or three people crowded around a cluttered desk covered in open laptops and scattered notes, mid-sprint energy — one person pointing at a screen, another typing urgently. The scene feels genuinely busy and pressured, not staged. Warm overhead office lighting, slightly dishevelled environment. The mood communicates 'everything is on fire right now.' No readable text, no signs, no UI labels visible.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Vertical 9:16 portrait composition. A small team of two or three people crowded around a cluttered desk covered in open laptops and scattered notes, mid-sprint energy — one person pointing at a screen, another typing urgently. The scene feels genuinely busy and pressured, not staged. Warm overhead office lighting, slightly dishevelled environment. The mood communicates 'everything is on fire right now.' No readable text, no signs, no UI labels visible."
  }
}
```
**Scene 2 (scene-2) — image_prompt (job input)**

```
Vertical 9:16 portrait composition. A close-up of a smartphone held in one hand, screen facing the viewer. The screen displays a recognisable grid of five social media app icons — the icons are generic coloured shapes suggesting different platforms, not branded logos. Each icon shows a subtle visual indicator of inactivity: faded colour, a small greyed-out badge, or a dim glow — communicating dormancy without readable text. Clean, slightly cool ambient light. No words, no captions, no readable UI text anywhere in the image.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Vertical 9:16 portrait composition. A close-up of a smartphone held in one hand, screen facing the viewer. The screen displays a recognisable grid of five social media app icons — the icons are generic coloured shapes suggesting different platforms, not branded logos. Each icon shows a subtle visual indicator of inactivity: faded colour, a small greyed-out badge, or a dim glow — communicating dormancy without readable text. Clean, slightly cool ambient light. No words, no captions, no readable UI text anywhere in the image."
  }
}
```
**Scene 3 (scene-3) — image_prompt (job input)**

```
Vertical 9:16 portrait composition. Same small team environment as the first beat, but now shot from slightly further back. The team members are fully absorbed in their laptops and papers, heads down, completely focused on urgent work. In the soft background, a browser tab or a social media feed is barely visible on a secondary screen — untouched, unlit, ignored. The contrast between the frenetic foreground and the quiet background screen communicates the idea that social content has been silently abandoned. Warm task-lighting on the foreground, cooler dim glow on the background screen. No readable text anywhere.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Vertical 9:16 portrait composition. Same small team environment as the first beat, but now shot from slightly further back. The team members are fully absorbed in their laptops and papers, heads down, completely focused on urgent work. In the soft background, a browser tab or a social media feed is barely visible on a secondary screen — untouched, unlit, ignored. The contrast between the frenetic foreground and the quiet background screen communicates the idea that social content has been silently abandoned. Warm task-lighting on the foreground, cooler dim glow on the background screen. No readable text anywhere."
  }
}
```
**Scene 4 (scene-4) — image_prompt (job input)**

```
Vertical 9:16 portrait composition. A calm, minimal end-card scene: a clean light-toned surface — a desk or table — with a single smartphone lying face-up, screen softly glowing with a neutral interface suggesting a content feed coming back to life. The mood shifts from pressure to quiet resolution. Soft, even natural light. No text, no logos, no readable captions in the image itself. Generous headroom and footroom for subtitle and CTA overlay.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Vertical 9:16 portrait composition. A calm, minimal end-card scene: a clean light-toned surface — a desk or table — with a single smartphone lying face-up, screen softly glowing with a neutral interface suggesting a content feed coming back to life. The mood shifts from pressure to quiet resolution. Soft, even natural light. No text, no logos, no readable captions in the image itself. Generous headroom and footroom for subtitle and CTA overlay."
  }
}
```
#### TTS / voice

- **requested TTS voice (job input):** shimmer
- **resolved at render:** shimmer
- **project voice resolution:** legacy default (no presentation override) → `shimmer`
- **differs from alloy:** yes
- **TTS instructions applied:** yes

**tts_instructions:**

Speak naturally for a short vertical social video. Language: en. Tone: Conversational and direct; Relatable and empathetic to everyday work frustrations; Concise — short sentences, minimal fluff; Slightly informal with occasional emoji use; Confident without being aggressive; Practical; Results-oriented; Avoids marketing jargon. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: measured, credible. Language: en.


- **voiceover characters:** 342
- **estimated words:** 62
- **audio_duration (debug):** 22.164
- **TTS validation attempts:** 1
- **tail validation passed:** true
- **tts_tail_retry_used:** false

#### Visual profile

- **package/job profile:** EDITORIAL
- **version:** visual-profile@2
- **project auto-resolved profile:** EDITORIAL (source: auto)
- **EDITORIAL prompt style token:** Editorial photography, controlled composition, refined framing, subtle color treatment.
- **prompts include Editorial suffix:** check prompts

#### Semantic motion

| beat_id | scene_id | intent | primitive | intensity |
| --- | --- | --- | --- | --- |
| beat-1 | scene-1 | ATTENTION | zoom_in | MEDIUM |
| beat-2 | scene-2 | EXPLAIN | pan_left | LOW |
| beat-3 | scene-3 | EXPLAIN | pan_right | LOW |
| beat-4 | scene-4 | EMPHASIS | zoom_in | LOW |
| beat-5 | scene-4 | CLOSE | static | LOW |
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

- **MP4:** supabase-storage://video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/05249705-7d2c-4e12-8c70-67fa284a8de0/output.mp4
- **thumbnail:** supabase-storage://video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/05249705-7d2c-4e12-8c70-67fa284a8de0/thumbnail.png
- **subtitles:** supabase-storage://video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/05249705-7d2c-4e12-8c70-67fa284a8de0/subtitles.srt
- **video_duration:** 22.166667
- **subtitle_source:** whisper
- **render_warning:** false

#### Admin links (paths, no signed tokens)

- Production: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/production`
- Review: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/review`
- Content packages: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/content-packages`
- Videos / scene editor: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/videos`
- API export JSON: `/api/production-runs/5e8465bc-107c-4d0b-beb9-516ceb5b9812/export`

### Package 3 — The Reputation Tax of Having No Time for Content

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `35b1c8d8-6511-4079-8ddd-f9f73fd8d73d` |
| strategy_item_id | `64b65143-0e2d-4718-af22-24f290882109` |
| weekly_strategy_id | `f00ef91a-0508-4fbc-a7bc-5c408a5ed4d1` |
| production_run_id | `5e8465bc-107c-4d0b-beb9-516ceb5b9812` |
| status | draft |
| funnel_stage | solution_aware |
| created_at | 2026-07-12T19:23:07.549042+00:00 |
| updated_at | 2026-07-12T19:34:57.432298+00:00 |
| primary content_item_id | `d05b16f0-1e52-4f4a-b187-d9150cdee856` |
| video_job_id | `b18f1e0e-6730-4100-b4cf-5fd802fdea2e` |
| video_job status | completed |

#### Strategy input

- **topic:** What it actually takes to stay active on five platforms when you have no content team
- **angle:** Break down the realistic workload of maintaining consistent presence across TikTok, Instagram, LinkedIn, Facebook, and YouTube Shorts — scripting, filming, editing, captioning, resizing, scheduling — and show how that math does not work for a solo founder or small team doing it themselves. Then reframe the solution: the only way to stay consistent without burning out is to remove yourself from the production process entirely. Introduce done-for-you content as the category answer, grounded in fenrik Studio's model of one URL in, ready-to-post assets out across every channel.
- **package_index:** 2
- **platform:** tiktok
- **format:** reel
- **priority:** 3
- **funnel_stage (column):** solution_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "Break down the realistic workload of maintaining consistent presence across TikTok, Instagram, LinkedIn, Facebook, and YouTube Shorts — scripting, filming, editing, captioning, resizing, scheduling — and show how that math does not work for a solo founder or small team doing it themselves. Then reframe the solution: the only way to stay consistent without burning out is to remove yourself from the production process entirely. Introduce done-for-you content as the category answer, grounded in fenrik Studio's model of one URL in, ready-to-post assets out across every channel.",
  "topic": "What it actually takes to stay active on five platforms when you have no content team",
  "source": "production_run",
  "package_index": 2,
  "production_run_id": "5e8465bc-107c-4d0b-beb9-516ceb5b9812"
}
```

#### Full content (package_brief core)

**hook:**

I'll be honest — I finally counted how many hours it actually takes to stay active on five platforms. I wish I hadn't.


**voiceover_text:**

I finally did the math. Script, film, edit, caption, resize for five platforms, schedule. That's not a content strategy — that's a second job. And the whole time your profile is just sitting there, silently telling every new visitor you're too busy to show up. Here's the fix: one URL, ready-to-post content across every channel. No production required.


**subtitles:**

I finally did the math. / Script, film, edit, caption, resize for five platforms, schedule. / That's not a content strategy — that's a second job. / And the whole time your profile is just sitting there, / silently telling every new visitor you're too busy to show up. / Here's the fix: one URL, ready-to-post content across every channel. / No production required.


**video concept:**

A solo founder sits down to map out what staying active on five social platforms actually requires per week — and the honest math of scripting, filming, editing, captioning, resizing, and scheduling becomes its own punchline. The twist: while they're drowning in the production checklist, their profile is broadcasting exactly that chaos to every new visitor. The payoff reframes the solution: remove yourself from the process entirely. One URL in, ready-to-post content out. The tone is light and self-aware — the founder is laughing at themselves, not being mocked.


**video script:**

BEAT 1 — SITUATION (0–4s): Founder at desk, opens a notebook to map out 'content plan for five platforms.' Looks confident.

VO: 'I finally did the math.'

BEAT 2 — UNEXPECTED TURN (4–12s): The list grows — script, film, edit, caption, resize for TikTok, Instagram, LinkedIn, Facebook, YouTube Shorts, schedule. The notebook fills up fast.

VO: 'Script, film, edit, caption, resize for five platforms, schedule. That's not a content strategy — that's a second job.'

BEAT 3 — PUNCHLINE (12–18s): Cut to the social profile: last post was weeks ago. The math didn't save them — it just proved the problem.

VO: 'And the whole time your profile is just sitting there, silently telling every new visitor you're too busy to show up.'

BEAT 4 — CTA (18–24s): Clean, calm. A browser tab opens with a website URL typed in — one input, multiple platforms of ready content appear.

VO: 'Here's the fix: one URL, ready-to-post content across every channel. No production required.'


**duration_seconds (brief):** 22–25s

**CTA:** Give us your website URL — your first content package is on us, no production work needed. (type: sign_up)

**creative_mode:** humor

**hashtags:** ["#contentmarketing","#socialmediatips","#smallbusiness","#saasmarketing","#founderlife","#contentcreation","#digitalmarketing","#socialmedia","#startuplife","#saas"]


#### Full platform copy

##### x

```json
{
  "cta": "First content package is free — fenrik.studio",
  "format": "X post — single tweet, under 280 chars",
  "caption": "I mapped out what staying active on 5 platforms actually takes per week. Script, film, edit, caption, resize, schedule. That's a second job. And while you're doing it, your profile is already telling visitors you can't keep up. One URL fixes it. #contentmarketing #saas",
  "hashtags": [
    "#contentmarketing",
    "#saas"
  ],
  "title_variants": [
    "The math of staying active on 5 platforms is a second job",
    "Your inactive profile is already making a first impression",
    "The only content plan that survives a real workload"
  ],
  "caption_variants": [
    "I mapped out what staying active on 5 platforms actually takes per week. Script, film, edit, caption, resize, schedule. That's a second job. And while you're doing it, your profile is already telling visitors you can't keep up. One URL fixes it. #contentmarketing #saas",
    "Your social profile isn't just inactive. It's actively signalling something to every new visitor who finds you. The fix isn't a better calendar. It's removing yourself from content production entirely. #founderlife #contentmarketing",
    "What if the reason you can't stay consistent on social isn't discipline — it's that the actual workload was never designed for one person? Script + film + edit + caption + resize × 5 platforms = not happening. There's a simpler model. #saas #socialmedia"
  ]
}
```
##### tiktok

```json
{
  "cta": "Check the link in bio — first content package is free, no filming required.",
  "format": "Vertical Short (9:16) — TikTok native",
  "caption": "I did the math on staying active on 5 platforms. Script, film, edit, caption, resize, schedule — repeat. That's not a content plan, that's a second job 😅 And while you're doing all that, your profile is out there telling visitors you're too busy to show up. There's a simpler way — one URL and the content's done for you.",
  "hashtags": [
    "#contentcreator",
    "#socialmediatips",
    "#smallbusiness",
    "#saas",
    "#contentmarketing"
  ]
}
```
##### youtube

```json
{
  "cta": "Get your first content package free at https://fenrik.studio — subscribe for more.",
  "format": "YouTube Shorts (9:16) + description",
  "caption": "What Staying Active on 5 Social Platforms Actually Costs You\n\nMost founders underestimate what consistent social presence actually requires: scripting, filming, editing, captioning, resizing for every platform format, and scheduling — every single week. That's not a content habit, that's a second job. And while you're stuck in that loop, your profile is quietly signalling to new visitors that you're too stretched to show up consistently. This short breaks down the real workload math and shows why removing yourself from the production process entirely is the only way to stay consistent without burning out. fenrik Studio turns your website URL into ready-to-post content across TikTok, Instagram, LinkedIn, Facebook, and YouTube Shorts — no filming or editing required. First content package is free: https://fenrik.studio",
  "hashtags": [
    "#contentmarketing",
    "#socialmediatips",
    "#saas"
  ]
}
```
##### facebook

```json
{
  "cta": "Submit your website URL and get your first content package free — no payment needed. https://fenrik.studio",
  "format": "Facebook feed post with link",
  "caption": "Honest question: have you ever actually mapped out what staying active on five social platforms takes every week? Script, film, edit, caption, resize for each format, schedule. It's not a content strategy — it's a second job. And while that process is eating your week, your profile is telling every new visitor exactly how stretched you are. There's a cleaner way: give fenrik Studio your website URL and get back ready-to-post content for every channel — no filming, no editing, no weekend lost to it. First package is free. 👇",
  "hashtags": [
    "#socialmediatips",
    "#smallbusiness",
    "#contentmarketing"
  ]
}
```
##### linkedin

```json
{
  "cta": "Curious what your website would produce — drop a comment or connect.",
  "format": "LinkedIn feed post — text-first, one link at close",
  "caption": "I finally mapped out what staying consistently active on five social platforms actually takes each week.\n\nScript. Film. Edit. Caption. Resize for TikTok, Instagram, LinkedIn, Facebook, YouTube Shorts. Schedule. Repeat.\n\nThat is not a content strategy. That is a second job — one most solo founders and small teams are quietly failing to show up for.\n\nThe uncomfortable part: while you are buried in that production loop, your profile is already communicating something to every new visitor who finds you. Inactivity reads as unavailability.\n\nThe only realistic fix is to remove yourself from the production process entirely. One URL in, platform-ready content out — that is the model that actually holds up under real workload pressure.\n\nfenrik Studio does exactly that. First content package is free to try: https://fenrik.studio",
  "hashtags": [
    "#contentmarketing",
    "#founderlife",
    "#saas"
  ]
}
```
##### instagram

```json
{
  "cta": "First content package is free. Link in bio to get started.",
  "format": "Vertical Reel (9:16) + feed caption",
  "caption": "I sat down to plan content for five platforms and accidentally mapped out a second full-time job. 😅 Script, film, edit, caption, resize, schedule — for TikTok, Instagram, LinkedIn, Facebook, and YouTube Shorts. Every week. The kicker? While you're buried in that process, your profile is quietly signalling to new visitors that you can't keep up. The fix is simpler than the spreadsheet: one website URL, and the content comes back ready to post — every platform covered, nothing left to edit.",
  "hashtags": [
    "#contentmarketing",
    "#socialmediatips",
    "#smallbusiness",
    "#founderlife",
    "#saasmarketing",
    "#contentcreation",
    "#marketingtips",
    "#socialmedia",
    "#digitalmarketing",
    "#startuplife"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Vertical 9:16 portrait composition. A solo founder in a casual home office sits at a wooden desk, pen in hand, opening a fresh notebook with a confident expression — the kind of person who genuinely believes they are about to solve a problem. Warm, natural daylight from a side window. Clean, uncluttered environment. Editorial photography style, refined framing, subtle warm color treatment. Subject centered with natural headroom. No text, labels, or readable words anywhere in the image."
    },
    {
      "source": "ai",
      "image_prompt": "Vertical 9:16 portrait composition. Close-up of the same founder's notebook, now covered edge-to-edge in a dense, chaotic web of handwritten tasks and arrows branching out in every direction — the visual sense of a plan that has spiraled into overwhelm. The founder's hand is still writing, adding more. Slightly wide-eyed expression visible at the top of the frame. Warm indoor light. Editorial style with clear, sharp focus on the notebook. No readable text or words in the image — only the visual impression of an overflowing, branching list."
    },
    {
      "source": "ai",
      "image_prompt": "Vertical 9:16 portrait composition. A phone screen held in the founder's hand showing a social media profile grid — most of the grid squares are visibly empty or faded, with only one or two older posts visible, communicating inactivity at a glance. The founder's expression is a wry, self-aware half-smile — the look of someone who has just caught themselves in the exact situation they were trying to avoid. Soft, natural indoor light. Editorial photography style. No readable usernames, captions, text, numbers, or interface labels visible in the image."
    },
    {
      "source": "ai",
      "image_prompt": "Vertical 9:16 portrait composition. The same founder now sits back, relaxed, watching a laptop screen that displays a tidy dashboard-style layout suggesting multiple finished social posts arranged in a neat grid — different platform formats visible as distinct card shapes, all populated with imagery and structure, none blank. The founder's posture is calm and relieved, one hand resting loosely on the desk. Clean, bright natural light. Editorial style, refined composition. No readable text, labels, or interface copy visible in the image."
    },
    {
      "modify": "false",
      "source": "asset",
      "used_as": "Place the Fenrik Studio landscape logo as a small branding element in the lower-right corner of this final CTA beat only; overlay at roughly 15–20% of frame width on top of the generated scene. Do not use fullscreen or as the main visual.",
      "asset_id": "e895c555-e0b4-4628-9ee8-1fd5a65dc742",
      "video_usage": "end_card_branding"
    }
  ],
  "image_prompts": [
    "Vertical 9:16 portrait composition. A solo founder in a casual home office sits at a wooden desk, pen in hand, opening a fresh notebook with a confident expression — the kind of person who genuinely believes they are about to solve a problem. Warm, natural daylight from a side window. Clean, uncluttered environment. Editorial photography style, refined framing, subtle warm color treatment. Subject centered with natural headroom. No text, labels, or readable words anywhere in the image.",
    "Vertical 9:16 portrait composition. Close-up of the same founder's notebook, now covered edge-to-edge in a dense, chaotic web of handwritten tasks and arrows branching out in every direction — the visual sense of a plan that has spiraled into overwhelm. The founder's hand is still writing, adding more. Slightly wide-eyed expression visible at the top of the frame. Warm indoor light. Editorial style with clear, sharp focus on the notebook. No readable text or words in the image — only the visual impression of an overflowing, branching list.",
    "Vertical 9:16 portrait composition. A phone screen held in the founder's hand showing a social media profile grid — most of the grid squares are visibly empty or faded, with only one or two older posts visible, communicating inactivity at a glance. The founder's expression is a wry, self-aware half-smile — the look of someone who has just caught themselves in the exact situation they were trying to avoid. Soft, natural indoor light. Editorial photography style. No readable usernames, captions, text, numbers, or interface labels visible in the image.",
    "Vertical 9:16 portrait composition. The same founder now sits back, relaxed, watching a laptop screen that displays a tidy dashboard-style layout suggesting multiple finished social posts arranged in a neat grid — different platform formats visible as distinct card shapes, all populated with imagery and structure, none blank. The founder's posture is calm and relieved, one hand resting loosely on the desk. Clean, bright natural light. Editorial style, refined composition. No readable text, labels, or interface copy visible in the image."
  ],
  "asset_usage": [
    {
      "modify": "false",
      "used_as": "Place the Fenrik Studio landscape logo as a small branding element in the lower-right corner of this final CTA beat only; overlay at roughly 15–20% of frame width on top of the generated scene. Do not use fullscreen or as the main visual.",
      "asset_id": "e895c555-e0b4-4628-9ee8-1fd5a65dc742"
    }
  ],
  "presentation_generation": {
    "mode": "enabled",
    "project_id": "163c1822-ad30-4cee-8826-dfacd9c188b9",
    "visual_profile": "EDITORIAL",
    "frequency_decisions": [],
    "requested_cta_count": 0,
    "downgraded_cta_count": 0,
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_profile_scores": {
      "BOLD": 1,
      "MINIMAL": 3,
      "NATURAL": 5,
      "PREMIUM": 0,
      "EDITORIAL": 13
    },
    "visual_profile_source": "auto",
    "downgraded_phone_count": 0,
    "downgraded_quote_count": 0,
    "visual_profile_reasons": [
      "NATURAL:local(+1)",
      "NATURAL:practical(+1)",
      "NATURAL:relatable(+1)",
      "NATURAL:empathetic(+1)",
      "NATURAL:everyday(+1)",
      "MINIMAL:saas(+1)",
      "MINIMAL:platform(+1)",
      "MINIMAL:minimal(+1)"
    ],
    "visual_profile_version": "visual-profile@2",
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
      "CTA"
    ],
    "presentation_generation": {
      "mode": "enabled",
      "package_id": "35b1c8d8-6511-4079-8ddd-f9f73fd8d73d",
      "project_id": "163c1822-ad30-4cee-8826-dfacd9c188b9",
      "visual_profile": "EDITORIAL",
      "downgrade_rules": [],
      "history_decisions": [],
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
        },
        {
          "rule": "allowed",
          "reason": "image scene",
          "scene_id": "scene-5",
          "final_type": "IMAGE",
          "requested_type": "IMAGE"
        }
      ],
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
      "visual_profile_version": "visual-profile@2",
      "accepted_checklist_count": 0,
      "accepted_statistic_count": 0,
      "final_worker_scene_types": [
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE",
        "IMAGE"
      ],
      "requested_checklist_count": 0,
      "requested_statistic_count": 0,
      "checklist_allowlist_status": "allowlisted",
      "checklist_renderer_version": null,
      "downgraded_checklist_count": 0,
      "downgraded_statistic_count": 0,
      "statistic_renderer_version": null
    }
  }
}
```

#### Scene-by-scene

| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |
| ---: | --- | --- | --- | --- | --- |
| 1 | scene-1 | IMAGE | image@1 | `video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/b18f1e0e-6730-4100-b4cf-5fd802fdea2e/scene-scene-1.png` | — |
| 2 | scene-2 | IMAGE | image@1 | `video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/b18f1e0e-6730-4100-b4cf-5fd802fdea2e/scene-scene-2.png` | — |
| 3 | scene-3 | IMAGE | image@1 | `video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/b18f1e0e-6730-4100-b4cf-5fd802fdea2e/scene-scene-3.png` | — |
| 4 | scene-4 | IMAGE | image@1 | `video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/b18f1e0e-6730-4100-b4cf-5fd802fdea2e/scene-scene-4.png` | — |
| 5 | scene-5 | IMAGE | image@1 | `project-assets/163c1822-ad30-4cee-8826-dfacd9c188b9/source/e895c555-e0b4-4628-9ee8-1fd5a65dc742/web-img.png` | — |

**Scene 1 (scene-1) — image_prompt (job input)**

```
Vertical 9:16 portrait composition. A solo founder in a casual home office sits at a wooden desk, pen in hand, opening a fresh notebook with a confident expression — the kind of person who genuinely believes they are about to solve a problem. Warm, natural daylight from a side window. Clean, uncluttered environment. Editorial photography style, refined framing, subtle warm color treatment. Subject centered with natural headroom. No text, labels, or readable words anywhere in the image.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Vertical 9:16 portrait composition. A solo founder in a casual home office sits at a wooden desk, pen in hand, opening a fresh notebook with a confident expression — the kind of person who genuinely believes they are about to solve a problem. Warm, natural daylight from a side window. Clean, uncluttered environment. Editorial photography style, refined framing, subtle warm color treatment. Subject centered with natural headroom. No text, labels, or readable words anywhere in the image."
  }
}
```
**Scene 2 (scene-2) — image_prompt (job input)**

```
Vertical 9:16 portrait composition. Close-up of the same founder's notebook, now covered edge-to-edge in a dense, chaotic web of handwritten tasks and arrows branching out in every direction — the visual sense of a plan that has spiraled into overwhelm. The founder's hand is still writing, adding more. Slightly wide-eyed expression visible at the top of the frame. Warm indoor light. Editorial style with clear, sharp focus on the notebook. No readable text or words in the image — only the visual impression of an overflowing, branching list.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Vertical 9:16 portrait composition. Close-up of the same founder's notebook, now covered edge-to-edge in a dense, chaotic web of handwritten tasks and arrows branching out in every direction — the visual sense of a plan that has spiraled into overwhelm. The founder's hand is still writing, adding more. Slightly wide-eyed expression visible at the top of the frame. Warm indoor light. Editorial style with clear, sharp focus on the notebook. No readable text or words in the image — only the visual impression of an overflowing, branching list."
  }
}
```
**Scene 3 (scene-3) — image_prompt (job input)**

```
Vertical 9:16 portrait composition. A phone screen held in the founder's hand showing a social media profile grid — most of the grid squares are visibly empty or faded, with only one or two older posts visible, communicating inactivity at a glance. The founder's expression is a wry, self-aware half-smile — the look of someone who has just caught themselves in the exact situation they were trying to avoid. Soft, natural indoor light. Editorial photography style. No readable usernames, captions, text, numbers, or interface labels visible in the image.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Vertical 9:16 portrait composition. A phone screen held in the founder's hand showing a social media profile grid — most of the grid squares are visibly empty or faded, with only one or two older posts visible, communicating inactivity at a glance. The founder's expression is a wry, self-aware half-smile — the look of someone who has just caught themselves in the exact situation they were trying to avoid. Soft, natural indoor light. Editorial photography style. No readable usernames, captions, text, numbers, or interface labels visible in the image."
  }
}
```
**Scene 4 (scene-4) — image_prompt (job input)**

```
Vertical 9:16 portrait composition. The same founder now sits back, relaxed, watching a laptop screen that displays a tidy dashboard-style layout suggesting multiple finished social posts arranged in a neat grid — different platform formats visible as distinct card shapes, all populated with imagery and structure, none blank. The founder's posture is calm and relieved, one hand resting loosely on the desk. Clean, bright natural light. Editorial style, refined composition. No readable text, labels, or interface copy visible in the image.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Vertical 9:16 portrait composition. The same founder now sits back, relaxed, watching a laptop screen that displays a tidy dashboard-style layout suggesting multiple finished social posts arranged in a neat grid — different platform formats visible as distinct card shapes, all populated with imagery and structure, none blank. The founder's posture is calm and relieved, one hand resting loosely on the desk. Clean, bright natural light. Editorial style, refined composition. No readable text, labels, or interface copy visible in the image."
  }
}
```
**Scene 5 (scene-5) — image_prompt (job input)**

```
Place the Fenrik Studio landscape logo as a small branding element in the lower-right corner of this final CTA beat only; overlay at roughly 15–20% of frame width on top of the generated scene. Do not use fullscreen or as the main visual.
```

```json
{
  "media": {
    "modify": "false",
    "source": "asset",
    "used_as": "Place the Fenrik Studio landscape logo as a small branding element in the lower-right corner of this final CTA beat only; overlay at roughly 15–20% of frame width on top of the generated scene. Do not use fullscreen or as the main visual.",
    "asset_id": "e895c555-e0b4-4628-9ee8-1fd5a65dc742",
    "video_usage": "end_card_branding"
  }
}
```
#### TTS / voice

- **requested TTS voice (job input):** shimmer
- **resolved at render:** shimmer
- **project voice resolution:** legacy default (no presentation override) → `shimmer`
- **differs from alloy:** yes
- **TTS instructions applied:** yes

**tts_instructions:**

Speak naturally for a short vertical social video. Language: en. Tone: Conversational and direct; Relatable and empathetic to everyday work frustrations; Concise — short sentences, minimal fluff; Slightly informal with occasional emoji use; Confident without being aggressive; Practical; Results-oriented; Avoids marketing jargon. Read the script exactly; do not add or skip words. Delivery: clear, confident, practical. Delivery: lightly playful, never exaggerated. Delivery: confident, concise, not


- **voiceover characters:** 353
- **estimated words:** 58
- **audio_duration (debug):** 27.516
- **TTS validation attempts:** 1
- **tail validation passed:** true
- **tts_tail_retry_used:** false

#### Visual profile

- **package/job profile:** EDITORIAL
- **version:** visual-profile@2
- **project auto-resolved profile:** EDITORIAL (source: auto)
- **EDITORIAL prompt style token:** Editorial photography, controlled composition, refined framing, subtle color treatment.
- **prompts include Editorial suffix:** yes (in image prompts)

#### Semantic motion

| beat_id | scene_id | intent | primitive | intensity |
| --- | --- | --- | --- | --- |
| beat-1 | scene-1 | ATTENTION | zoom_in | MEDIUM |
| beat-2 | scene-2 | EXPLAIN | pan_left | LOW |
| beat-3 | scene-3 | REVEAL | drift_up | LOW |
| beat-4 | scene-4 | EMPHASIS | zoom_in | LOW |
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
    "IMAGE",
    "IMAGE"
  ],
  "prompt_presentation_types": null
}
```

#### Image generation / moderation

No `image_generation_warnings` on render_spec — all scenes used primary provider path.

#### Final video details

- **MP4:** supabase-storage://video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/b18f1e0e-6730-4100-b4cf-5fd802fdea2e/output.mp4
- **thumbnail:** supabase-storage://video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/b18f1e0e-6730-4100-b4cf-5fd802fdea2e/thumbnail.png
- **subtitles:** supabase-storage://video-renders/163c1822-ad30-4cee-8826-dfacd9c188b9/video/b18f1e0e-6730-4100-b4cf-5fd802fdea2e/subtitles.srt
- **video_duration:** 27.533333
- **subtitle_source:** whisper
- **render_warning:** false

#### Admin links (paths, no signed tokens)

- Production: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/production`
- Review: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/review`
- Content packages: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/content-packages`
- Videos / scene editor: `/projects/163c1822-ad30-4cee-8826-dfacd9c188b9/videos`
- API export JSON: `/api/production-runs/5e8465bc-107c-4d0b-beb9-516ceb5b9812/export`

## D. Cross-run consistency analysis

- **Distinct hooks:** 3 / 3
- **Distinct CTA texts:** 3 / 3
- **Funnel stages:** awareness, problem_aware, solution_aware
- **All videos used same voice:** yes
- **All packages same visual profile:** yes
- **Typed scenes rendered:** none (all worker scene types were IMAGE in this run)
- **Organic suitability:** Topics differ (dormant profile / weekend batching / URL-to-content); tone is educational not hard-sell; CTAs repeat free-package offer (expected for fenrik Studio).

## E. New-system usage matrix

| Package | Voice | Profile | CHECKLIST | PHONE | QUOTE | STATISTIC | CTA | Semantic Motion | Moderation fallback |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| The Tab They Close Without Saying a Word | — | EDITORIAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| The Last-Minute Panic That Proves Content Always Loses | shimmer | EDITORIAL | 0 | 0 | 0 | 0 | 0 | yes | 0 |
| The Reputation Tax of Having No Time for Content | shimmer | EDITORIAL | 0 | 0 | 0 | 0 | 0 | yes | 0 |

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
