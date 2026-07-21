# Production Run Audit — 889c80df-dc50-4583-a51a-9e7d34eb514c

_Generated 2026-07-13T23:34:52.393Z by `scripts/audit-production-run.ts` (read-only)._

## A. Executive summary

- **Strategy items:** 1
- **Content packages:** 1
- **Primary video jobs (newest per item):** 1 (1 completed, 0 failed)
- **Content items (all variants):** 8
- **Scene types in worker inputs:** {"IMAGE":5}
- **Visual profile(s) on jobs:** MINIMAL (project auto: MINIMAL)
- **Voices used:** alloy (project default: alloy)
- **Moderation fallback scenes:** 0
- **Run warnings (subtitle/render flags):** 0
- **Major warnings:** None flagged on completed jobs.

## B. Run overview

| Field | Value |
| --- | --- |
| production_run_id | `889c80df-dc50-4583-a51a-9e7d34eb514c` |
| project_id | `99a8d1ea-af34-45c2-9f8b-2033b223c348` |
| project name | 8080.ai |
| status | completed |
| created_at | 2026-07-13T23:22:49.309951+00:00 |
| updated_at (terminal) | 2026-07-13T23:28:13.627243+00:00 |
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
    "totalOutputs": 8,
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
        "outputs": 1,
        "platform": "linkedin",
        "multiplier": 1
      },
      {
        "kind": "text",
        "label": "X",
        "outputs": 3,
        "platform": "x",
        "multiplier": 3
      }
    ],
    "textOutputsTotal": 5,
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
      "x": 3,
      "tiktok": 1,
      "youtube": 1,
      "facebook": 1,
      "linkedin": 1,
      "instagram": 1
    },
    "packageCount": 1,
    "generationMode": "sample",
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

- **48d082fa-dd58-4ad6-b085-df960caf7baa** — The hidden cost of starting without a shared product blueprint
```json
{
  "theme": "The hidden cost of starting without a shared product blueprint",
  "source": "production_run",
  "production_run_id": "889c80df-dc50-4583-a51a-9e7d34eb514c",
  "funnel_distribution": {
    "Awareness": 1,
    "Conversion": 0,
    "Problem Aware": 0,
    "Solution Aware": 0
  }
}
```

### production_run_items

```json
[
  {
    "id": "410daf9b-9fad-4e9e-91f4-c6a5df354314",
    "production_run_id": "889c80df-dc50-4583-a51a-9e7d34eb514c",
    "project_id": "99a8d1ea-af34-45c2-9f8b-2033b223c348",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "b30b1fa8-8d80-47f0-9799-96d9c9b9718c",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-13T23:22:49.630982+00:00",
    "updated_at": "2026-07-13T23:28:13.501652+00:00"
  }
]
```

## C. Package-by-package audit

### Package 1 — Two Weeks. Zero Code. Here's Why.

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `b30b1fa8-8d80-47f0-9799-96d9c9b9718c` |
| strategy_item_id | `a44a3892-3d78-46db-9b2c-532c9ea210d6` |
| weekly_strategy_id | `48d082fa-dd58-4ad6-b085-df960caf7baa` |
| production_run_id | `889c80df-dc50-4583-a51a-9e7d34eb514c` |
| status | draft |
| funnel_stage | awareness |
| created_at | 2026-07-13T23:24:02.844155+00:00 |
| updated_at | 2026-07-13T23:28:12.475646+00:00 |
| primary content_item_id | `10c7c66b-3cf7-47c0-b973-5b1e7c992646` |
| video_job_id | `b72e597b-9053-4025-816f-a33154fc7f7a` |
| video_job status | completed |

#### Strategy input

- **topic:** Why dev teams spend the first two weeks arguing about architecture instead of building anything
- **angle:** Open on a business owner watching his dev team whiteboard system diagrams for days with zero code written — dramatize the pain of misaligned starting points, then reframe: the real problem isn't the team, it's the absence of a shared product blueprint before anyone opens a code editor.
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
  "angle": "Open on a business owner watching his dev team whiteboard system diagrams for days with zero code written — dramatize the pain of misaligned starting points, then reframe: the real problem isn't the team, it's the absence of a shared product blueprint before anyone opens a code editor.",
  "topic": "Why dev teams spend the first two weeks arguing about architecture instead of building anything",
  "source": "production_run",
  "package_index": 0,
  "production_run_id": "889c80df-dc50-4583-a51a-9e7d34eb514c"
}
```

#### Full content (package_brief core)

**hook:**

Your dev team isn't slow. They're just starting from a blank page.


**voiceover_text:**

Your dev team isn't slow. They're starting from a blank page. No shared blueprint, no agreed architecture — so they whiteboard for two weeks instead of building. That's the real mistake: opening a code editor before anyone agrees on what to build. Lock down the product blueprint first. Every agent, every decision, every structure — before a single line of code.


**subtitles:**

Your dev team isn't slow. / They're starting from a blank page. / No shared blueprint. No agreed architecture. / So they whiteboard for two weeks / instead of building. / That's the real mistake — / opening a code editor / before anyone agrees on what to build. / Lock down the product blueprint first. / Every agent, every decision, every structure — / before a single line of code.


**video concept:**

Open on a business owner standing at the edge of a conference room, watching his dev team cover a whiteboard with system diagrams — markers flying, Post-its stacking, zero code written. The hook lands as a counter-intuitive truth: the team isn't the problem, the blank starting point is. Cut to the whiteboard filling up with chaos — the 'why it backfires' beat. Then a hard visual shift: the same team, now calm, gathered around a laptop showing a structured product blueprint on screen. Final beat: the blueprint asset framed inside a laptop, signalling the correct approach. The tone is blunt and impatient with the problem — never with the viewer.


**video script:**

HOOK (0–3s): Wide shot — business owner arms-crossed, watching dev team argue at a whiteboard covered in system diagrams. VO: 'Your dev team isn't slow. They're starting from a blank page.'

MISTAKE / WHY IT BACKFIRES (3–12s): Close on the whiteboard — markers, arrows, conflicting boxes, no code. VO: 'No shared blueprint, no agreed architecture — so they whiteboard for two weeks instead of building. That's the real mistake: opening a code editor before anyone agrees on what to build.'

CORRECT APPROACH (12–20s): Cut to the same team, now settled, focused on a laptop screen showing a structured product blueprint interface. VO: 'Lock down the product blueprint first. Every agent, every decision, every structure — before a single line of code.'

CTA (20–23s): Product asset framed in laptop screen. VO fades. Subtitle: 'Get your product blueprint before dev starts.'


**duration_seconds (brief):** 23

**CTA:** Get your product blueprint before dev starts (type: sign_up)

**creative_mode:** mistake

**hashtags:** ["#productdevelopment","#startupfounder","#buildinpublic","#saas","#softwaredevelopment","#productblueprint","#techstartup","#productmanagement","#shipfaster","#nontechnicalfounder"]


#### Full platform copy

##### x

```json
{
  "cta": "What's the longest you've seen a team argue architecture before shipping anything?",
  "format": "Vertical Short (9:16) — 23s",
  "caption": "Your dev team isn't slow. They're starting from a blank page. No blueprint = two weeks of whiteboard debates before a single line of code. Fix the start, not the team. #productdevelopment #startups",
  "hashtags": [
    "#productdevelopment",
    "#startups"
  ],
  "title_variants": [
    "Dev teams don't waste time. Blank starting points do.",
    "The first two weeks of every project are optional — if you do this first.",
    "Nobody warns you that 'let's start building' is the most expensive sentence in a sprint."
  ],
  "caption_variants": [
    "Your dev team isn't slow. They're starting from a blank page. No blueprint = two weeks of whiteboard debates before a single line of code. Fix the start, not the team. #productdevelopment #startups",
    "The first two weeks of a project shouldn't be architecture debates. They are when nobody locks down the product blueprint before dev starts. That's the overlooked mistake killing your velocity. #buildinpublic",
    "Nobody warns founders: 'let's start building' is often the most expensive sentence you'll say. No shared blueprint → no shared direction → two weeks of whiteboard chaos. Start differently. #startupfounder #saas"
  ]
}
```
##### tiktok

```json
{
  "cta": "drop a 🏗️ if your team has done this",
  "format": "Vertical Short (9:16) — 23s",
  "caption": "your dev team isn't slow. they're just arguing about architecture because nobody handed them a blueprint first. two weeks. zero code. classic. fix the start, not the team.",
  "hashtags": [
    "#startuplife",
    "#productdevelopment",
    "#techfounder",
    "#buildinpublic"
  ]
}
```
##### youtube

```json
{
  "cta": "Subscribe for weekly breakdowns on shipping products faster → and visit https://8080.ai to generate your blueprint",
  "format": "Vertical Short (9:16) — 23s",
  "caption": "Why Dev Teams Spend Two Weeks on Architecture Instead of Code — and How to Fix It\n\nIf your development team is arguing about system architecture before writing a single line of product code, the problem isn't the team — it's the missing blueprint. This video breaks down the overlooked mistake that kills sprint velocity before it starts.\n\nWhen there's no shared product blueprint before development begins, every decision gets relitigated in real time. Requirements shift. Architecture debates replace output. Weeks disappear.\n\nThe fix: lock down the product blueprint — requirements, architecture, user flows — before anyone opens a code editor. 8080.ai generates that blueprint automatically, so your team starts aligned, not arguing.\n\nGet your product blueprint at https://8080.ai",
  "hashtags": [
    "#productdevelopment",
    "#startupfounder",
    "#softwaredevelopment",
    "#saas"
  ]
}
```
##### facebook

```json
{
  "cta": "See how 8080.ai generates your product blueprint before development begins → https://8080.ai",
  "format": "Vertical Short (9:16) — 23s",
  "caption": "A business owner watches his dev team spend two full weeks drawing system diagrams — and writes zero lines of code. Sound familiar?\n\nThe mistake isn't the team. It's starting development without a shared product blueprint. When there's no agreed structure before anyone opens a code editor, the debate becomes the deliverable.\n\nGet the blueprint locked before dev starts — and watch the whiteboards clear. 👇",
  "hashtags": [
    "#productdevelopment",
    "#startupfounder"
  ]
}
```
##### linkedin

```json
{
  "cta": "Share your experience in the comments — and see how 8080.ai generates product blueprints before development starts at https://8080.ai",
  "format": "Vertical Short (9:16) — 23s",
  "caption": "A business owner watches his team spend the first two weeks of a project debating system architecture. No code. No output. Just markers and whiteboards.\n\nThe instinct is to blame the team. The real culprit is subtler: development started before anyone agreed on what to build.\n\nWhen there is no shared product blueprint — no agreed requirements, no architecture, no user flows — every decision gets made twice: once in planning, once in conflict.\n\nThe fix is not a faster team. It is a clearer starting point. Lock down the blueprint before anyone opens a code editor, and the first two weeks look very different.\n\nWhat is the most expensive misalignment you have seen at the start of a project?",
  "hashtags": [
    "#productmanagement",
    "#softwaredevelopment",
    "#startups"
  ]
}
```
##### instagram

```json
{
  "cta": "Save this if you've watched a sprint disappear into a whiteboard. Blueprint link in bio.",
  "format": "Vertical Short (9:16) — 23s",
  "caption": "Two weeks in. Whiteboard full. Zero code written. 🫠\n\nHere's the overlooked detail: your dev team isn't the bottleneck — the missing product blueprint is. When nobody agrees on what to build before opening a code editor, the architecture debate becomes the product.\n\nLock down the blueprint first. Every decision, every structure, before a single line of code. That's how you actually ship.",
  "hashtags": [
    "#productblueprint",
    "#startupfounder",
    "#saas",
    "#techstartup",
    "#buildinpublic",
    "#productmanagement",
    "#softwaredevelopment",
    "#nontechnicalfounder",
    "#agiledev",
    "#shipfaster"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical composition. A business owner — mid-30s, business casual — stands with arms crossed at the edge of a bright, modern conference room, watching three developers crowd a large whiteboard covered in chaotic system architecture diagrams: boxes, arrows, sticky notes, competing lines. The developers gesture at the board mid-argument. The business owner's expression is flat and tired, not angry. Natural daylight from large windows. Clean composition, generous negative space above and below the figures. Subject separation is clear. No readable text, labels, or numbers on the whiteboard — only abstract diagram shapes and marks."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical composition. Extreme close-up of a whiteboard surface filled edge to edge with overlapping system diagram marks — competing arrows, crossed-out boxes, clustered sticky notes, tangled lines. A marker rests uncapped on the whiteboard ledge. No code, no laptop, no product. The visual communicates productive-looking chaos with zero output. Clean, bright office lighting. No readable text, letters, numbers, or labels anywhere on the board — only abstract shapes and marks."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical narrative still for beat 4. Illustrate this moment clearly: Lock down the product blueprint first. Every agent, every decision, every structure — before a single line of code.. Natural lighting, believable setting, subject centered with vertical headroom, no readable text or logos."
    },
    {
      "modify": "false",
      "source": "asset",
      "used_as": "Show this product UI screenshot framed inside a laptop screen on a clean desk. A developer and a founder sit side by side, both looking at the open laptop screen — the product blueprint interface visible on the display. The team is calm and aligned. Three-quarter front angle so both the screen and the people are visible. Natural office lighting. No fullscreen crop — keep the laptop frame visible.",
      "asset_id": "d358f9d9-5616-450e-adc7-10e144ef3fbe",
      "video_usage": "correct_approach_beat"
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical composition. A clean, uncluttered desk with an open laptop, screen facing the viewer at a slight angle. The laptop screen displays a structured, organised interface with clear visual sections — suggesting a product blueprint or planning tool — using recognisable layout structure without any readable text. The desk surface is minimal: one notebook, one coffee cup. Warm, soft natural light from the side. Generous negative space. No text, labels, or numbers anywhere in the scene."
    }
  ],
  "image_prompts": [
    "Portrait 9:16 vertical composition. A business owner — mid-30s, business casual — stands with arms crossed at the edge of a bright, modern conference room, watching three developers crowd a large whiteboard covered in chaotic system architecture diagrams: boxes, arrows, sticky notes, competing lines. The developers gesture at the board mid-argument. The business owner's expression is flat and tired, not angry. Natural daylight from large windows. Clean composition, generous negative space above and below the figures. Subject separation is clear. No readable text, labels, or numbers on the whiteboard — only abstract diagram shapes and marks.",
    "Portrait 9:16 vertical composition. Extreme close-up of a whiteboard surface filled edge to edge with overlapping system diagram marks — competing arrows, crossed-out boxes, clustered sticky notes, tangled lines. A marker rests uncapped on the whiteboard ledge. No code, no laptop, no product. The visual communicates productive-looking chaos with zero output. Clean, bright office lighting. No readable text, letters, numbers, or labels anywhere on the board — only abstract shapes and marks.",
    "Portrait 9:16 vertical composition. A clean, uncluttered desk with an open laptop, screen facing the viewer at a slight angle. The laptop screen displays a structured, organised interface with clear visual sections — suggesting a product blueprint or planning tool — using recognisable layout structure without any readable text. The desk surface is minimal: one notebook, one coffee cup. Warm, soft natural light from the side. Generous negative space. No text, labels, or numbers anywhere in the scene."
  ],
  "asset_usage": [
    {
      "modify": "false",
      "used_as": "Show this product UI screenshot framed inside a laptop screen on a clean desk. A developer and a founder sit side by side, both looking at the open laptop screen — the product blueprint interface visible on the display. The team is calm and aligned. Three-quarter front angle so both the screen and the people are visible. Natural office lighting. No fullscreen crop — keep the laptop frame visible.",
      "asset_id": "d358f9d9-5616-450e-adc7-10e144ef3fbe"
    }
  ],
  "presentation_generation": {
    "mode": "enabled",
    "package_id": "b30b1fa8-8d80-47f0-9799-96d9c9b9718c",
    "project_id": "99a8d1ea-af34-45c2-9f8b-2033b223c348",
    "cta_selected": false,
    "visual_profile": "MINIMAL",
    "downgrade_rules": [],
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
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_profile_scores": null,
    "visual_profile_source": "package_snapshot",
    "downgraded_phone_count": 0,
    "downgraded_quote_count": 0,
    "phone_renderer_version": null,
    "quote_renderer_version": null,
    "sparse_plan_adjustment": true,
    "visual_profile_reasons": null,
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
    "target_visual_beat_count": 5,
    "prompt_presentation_types": [
      "IMAGE",
      "CHECKLIST",
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
        "hook": "You think the problem is finding the right developer. It's not.",
        "topic": "The moment a non-technical founder realizes she can't explain her own app to a developer",
        "motifs": [
          "laptop"
        ],
        "closing": "typed_cta",
        "typed_cta": true,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "CTA"
        ],
        "creative_mode": null,
        "cta_composition_id": null
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
      "package_id": "b30b1fa8-8d80-47f0-9799-96d9c9b9718c",
      "project_id": "99a8d1ea-af34-45c2-9f8b-2033b223c348",
      "cta_selected": false,
      "visual_profile": "MINIMAL",
      "downgrade_rules": [],
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
      "sparse_plan_adjustment": true,
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
      "target_visual_beat_count": 5,
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
          "hook": "You think the problem is finding the right developer. It's not.",
          "topic": "The moment a non-technical founder realizes she can't explain her own app to a developer",
          "motifs": [
            "laptop"
          ],
          "closing": "typed_cta",
          "typed_cta": true,
          "scene_types": [
            "IMAGE",
            "IMAGE",
            "IMAGE",
            "CTA"
          ],
          "creative_mode": null,
          "cta_composition_id": null
        }
      ]
    }
  }
}
```

#### Scene-by-scene

| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |
| ---: | --- | --- | --- | --- | --- |
| 1 | scene-1 | IMAGE | image@1 | `video-renders/99a8d1ea-af34-45c2-9f8b-2033b223c348/video/b72e597b-9053-4025-816f-a33154fc7f7a/scene-scene-1.png` | — |
| 2 | scene-2 | IMAGE | image@1 | `video-renders/99a8d1ea-af34-45c2-9f8b-2033b223c348/video/b72e597b-9053-4025-816f-a33154fc7f7a/scene-scene-2.png` | — |
| 3 | scene-3 | IMAGE | image@1 | `video-renders/99a8d1ea-af34-45c2-9f8b-2033b223c348/video/b72e597b-9053-4025-816f-a33154fc7f7a/scene-scene-3.png` | — |
| 4 | scene-4 | IMAGE | image@1 | `project-assets/99a8d1ea-af34-45c2-9f8b-2033b223c348/source/d358f9d9-5616-450e-adc7-10e144ef3fbe/Sn_mek_obrazovky_2026-07-13_v_23.48.19.png` | — |
| 5 | scene-5 | IMAGE | image@1 | `video-renders/99a8d1ea-af34-45c2-9f8b-2033b223c348/video/b72e597b-9053-4025-816f-a33154fc7f7a/scene-scene-5.png` | — |

**Scene 1 (scene-1) — image_prompt (job input)**

```
Portrait 9:16 vertical composition. A business owner — mid-30s, business casual — stands with arms crossed at the edge of a bright, modern conference room, watching three developers crowd a large whiteboard covered in chaotic system architecture diagrams: boxes, arrows, sticky notes, competing lines. The developers gesture at the board mid-argument. The business owner's expression is flat and tired, not angry. Natural daylight from large windows. Clean composition, generous negative space above and below the figures. Subject separation is clear. No readable text, labels, or numbers on the whiteboard — only abstract diagram shapes and marks.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical composition. A business owner — mid-30s, business casual — stands with arms crossed at the edge of a bright, modern conference room, watching three developers crowd a large whiteboard covered in chaotic system architecture diagrams: boxes, arrows, sticky notes, competing lines. The developers gesture at the board mid-argument. The business owner's expression is flat and tired, not angry. Natural daylight from large windows. Clean composition, generous negative space above and below the figures. Subject separation is clear. No readable text, labels, or numbers on the whiteboard — only abstract diagram shapes and marks."
  }
}
```
**Scene 2 (scene-2) — image_prompt (job input)**

```
Portrait 9:16 vertical composition. Extreme close-up of a whiteboard surface filled edge to edge with overlapping system diagram marks — competing arrows, crossed-out boxes, clustered sticky notes, tangled lines. A marker rests uncapped on the whiteboard ledge. No code, no laptop, no product. The visual communicates productive-looking chaos with zero output. Clean, bright office lighting. No readable text, letters, numbers, or labels anywhere on the board — only abstract shapes and marks.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical composition. Extreme close-up of a whiteboard surface filled edge to edge with overlapping system diagram marks — competing arrows, crossed-out boxes, clustered sticky notes, tangled lines. A marker rests uncapped on the whiteboard ledge. No code, no laptop, no product. The visual communicates productive-looking chaos with zero output. Clean, bright office lighting. No readable text, letters, numbers, or labels anywhere on the board — only abstract shapes and marks."
  }
}
```
**Scene 3 (scene-3) — image_prompt (job input)**

```
Portrait 9:16 vertical narrative still for beat 4. Illustrate this moment clearly: Lock down the product blueprint first. Every agent, every decision, every structure — before a single line of code.. Natural lighting, believable setting, subject centered with vertical headroom, no readable text or logos.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical narrative still for beat 4. Illustrate this moment clearly: Lock down the product blueprint first. Every agent, every decision, every structure — before a single line of code.. Natural lighting, believable setting, subject centered with vertical headroom, no readable text or logos."
  }
}
```
**Scene 4 (scene-4) — image_prompt (job input)**

```
Show this product UI screenshot framed inside a laptop screen on a clean desk. A developer and a founder sit side by side, both looking at the open laptop screen — the product blueprint interface visible on the display. The team is calm and aligned. Three-quarter front angle so both the screen and the people are visible. Natural office lighting. No fullscreen crop — keep the laptop frame visible.
```

```json
{
  "media": {
    "modify": "false",
    "source": "asset",
    "used_as": "Show this product UI screenshot framed inside a laptop screen on a clean desk. A developer and a founder sit side by side, both looking at the open laptop screen — the product blueprint interface visible on the display. The team is calm and aligned. Three-quarter front angle so both the screen and the people are visible. Natural office lighting. No fullscreen crop — keep the laptop frame visible.",
    "asset_id": "d358f9d9-5616-450e-adc7-10e144ef3fbe",
    "video_usage": "correct_approach_beat"
  }
}
```
**Scene 5 (scene-5) — image_prompt (job input)**

```
Portrait 9:16 vertical composition. A clean, uncluttered desk with an open laptop, screen facing the viewer at a slight angle. The laptop screen displays a structured, organised interface with clear visual sections — suggesting a product blueprint or planning tool — using recognisable layout structure without any readable text. The desk surface is minimal: one notebook, one coffee cup. Warm, soft natural light from the side. Generous negative space. No text, labels, or numbers anywhere in the scene.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical composition. A clean, uncluttered desk with an open laptop, screen facing the viewer at a slight angle. The laptop screen displays a structured, organised interface with clear visual sections — suggesting a product blueprint or planning tool — using recognisable layout structure without any readable text. The desk surface is minimal: one notebook, one coffee cup. Warm, soft natural light from the side. Generous negative space. No text, labels, or numbers anywhere in the scene."
  }
}
```
#### TTS / voice

- **requested TTS voice (job input):** alloy
- **resolved at render:** alloy
- **project voice resolution:** legacy default (no presentation override) → `alloy`
- **differs from alloy:** no
- **TTS instructions applied:** yes

**tts_instructions:**

Speak naturally for a short vertical social video. Language: en. Tone: Confident and direct; Technical yet accessible to non-technical audiences; Action-oriented with imperative language; Concise — short punchy phrases over long explanations; Empowering — positions the user as in control. Read the script exactly; do not add or skip words. Delivery: natural, curious, conversational. Delivery: confident, concise, not aggressive. Language: en.


- **voiceover characters:** 363
- **estimated words:** 61
- **audio_duration (debug):** 24.564
- **TTS validation attempts:** 1
- **tail validation passed:** true
- **tts_tail_retry_used:** false

#### Visual profile

- **package/job profile:** MINIMAL
- **version:** visual-profile@2
- **project auto-resolved profile:** MINIMAL (source: auto)
- **EDITORIAL prompt style token:** Clean composition, limited visual clutter, clear subject separation, generous negative space.
- **prompts include Editorial suffix:** check prompts

#### Semantic motion

| beat_id | scene_id | intent | primitive | intensity |
| --- | --- | --- | --- | --- |
| beat-1 | scene-1 | ATTENTION | zoom_in | LOW |
| beat-2 | scene-2 | EXPLAIN | static | LOW |
| beat-3 | scene-3 | EXPLAIN | drift_down | LOW |
| beat-4 | scene-4 | HOLD | static | LOW |
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

- **MP4:** supabase-storage://video-renders/99a8d1ea-af34-45c2-9f8b-2033b223c348/video/b72e597b-9053-4025-816f-a33154fc7f7a/output.mp4
- **thumbnail:** supabase-storage://video-renders/99a8d1ea-af34-45c2-9f8b-2033b223c348/video/b72e597b-9053-4025-816f-a33154fc7f7a/thumbnail.png
- **subtitles:** supabase-storage://video-renders/99a8d1ea-af34-45c2-9f8b-2033b223c348/video/b72e597b-9053-4025-816f-a33154fc7f7a/subtitles.srt
- **video_duration:** 24.566667
- **subtitle_source:** whisper
- **render_warning:** false

#### Admin links (paths, no signed tokens)

- Production: `/projects/99a8d1ea-af34-45c2-9f8b-2033b223c348/production`
- Review: `/projects/99a8d1ea-af34-45c2-9f8b-2033b223c348/review`
- Content packages: `/projects/99a8d1ea-af34-45c2-9f8b-2033b223c348/content-packages`
- Videos / scene editor: `/projects/99a8d1ea-af34-45c2-9f8b-2033b223c348/videos`
- API export JSON: `/api/production-runs/889c80df-dc50-4583-a51a-9e7d34eb514c/export`

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
| Two Weeks. Zero Code. Here's Why. | alloy | MINIMAL | 0 | 0 | 0 | 0 | 0 | yes | 0 |

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
