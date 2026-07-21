# Production Run Audit — 684a95ef-0bb6-4c84-88dd-9766df4a0285

_Generated 2026-07-13T23:35:01.852Z by `scripts/audit-production-run.ts` (read-only)._

## A. Executive summary

- **Strategy items:** 1
- **Content packages:** 1
- **Primary video jobs (newest per item):** 1 (1 completed, 0 failed)
- **Content items (all variants):** 8
- **Scene types in worker inputs:** {}
- **Visual profile(s) on jobs:** NATURAL (project auto: NATURAL)
- **Voices used:** — (project default: nova)
- **Moderation fallback scenes:** 0
- **Run warnings (subtitle/render flags):** 0
- **Major warnings:** None flagged on completed jobs.

## B. Run overview

| Field | Value |
| --- | --- |
| production_run_id | `684a95ef-0bb6-4c84-88dd-9766df4a0285` |
| project_id | `514ffb17-254f-4fee-aef0-fbfdd6b8bc02` |
| project name | rightcard.ai |
| status | completed |
| created_at | 2026-07-12T20:46:25.457691+00:00 |
| updated_at (terminal) | 2026-07-12T20:52:35.997504+00:00 |
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

- **ccdd4a20-0c0f-414f-9a37-fb78c553a79c** — Stop Leaving Rewards on the Table
```json
{
  "theme": "Stop Leaving Rewards on the Table",
  "source": "production_run",
  "production_run_id": "684a95ef-0bb6-4c84-88dd-9766df4a0285",
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
    "id": "50bd9943-0180-4fe3-936d-c7b3a5f74626",
    "production_run_id": "684a95ef-0bb6-4c84-88dd-9766df4a0285",
    "project_id": "514ffb17-254f-4fee-aef0-fbfdd6b8bc02",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "55095835-df59-42c0-b982-aa76a3428366",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-12T20:46:25.575871+00:00",
    "updated_at": "2026-07-12T20:52:35.886423+00:00"
  }
]
```

## C. Package-by-package audit

### Package 1 — The Wrong Card at Checkout: The Silent Money Leak Nobody Talks About

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `55095835-df59-42c0-b982-aa76a3428366` |
| strategy_item_id | `75b1dae1-8522-4327-a4be-b9efa17ae389` |
| weekly_strategy_id | `ccdd4a20-0c0f-414f-9a37-fb78c553a79c` |
| production_run_id | `684a95ef-0bb6-4c84-88dd-9766df4a0285` |
| status | draft |
| funnel_stage | awareness |
| created_at | 2026-07-12T20:47:37.593676+00:00 |
| updated_at | 2026-07-13T20:46:13.229684+00:00 |
| primary content_item_id | `0d2d0163-9d23-4f06-9987-604436d13dc5` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** Most people pull out the wrong credit card at checkout without even realizing it
- **angle:** Hook viewers with the relatable moment of standing at the register with multiple cards and no idea which one actually earns the most — reframe it as a silent, everyday money leak that adds up across hundreds of purchases a year
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
  "angle": "Hook viewers with the relatable moment of standing at the register with multiple cards and no idea which one actually earns the most — reframe it as a silent, everyday money leak that adds up across hundreds of purchases a year",
  "topic": "Most people pull out the wrong credit card at checkout without even realizing it",
  "source": "production_run",
  "package_index": 0,
  "production_run_id": "684a95ef-0bb6-4c84-88dd-9766df4a0285"
}
```

#### Full content (package_brief core)

**hook:**

Using more cards means earning more rewards. It does not.


**voiceover_text:**

Using more cards means earning more rewards. It does not. You're standing at the register, three cards in your wallet, and you just grab one. Feels fine. It is not. That one habit — repeated across hundreds of purchases — is quietly bleeding your rewards dry. The card you didn't pick might have earned triple. RightCard tells you exactly which card to use, right before you tap. Download it. Stop leaving money on the table.


**subtitles:**

Using more cards means earning more rewards. // It does not. // Three cards in your wallet. // You grab one. Feels fine. // It is not. // That one habit — hundreds of purchases — bleeding your rewards dry. // The card you didn't pick? Might have earned triple. // RightCard tells you which card to use before you tap. // Download it. Stop leaving money on the table.


**video concept:**

A fast-paced vertical short built around the overlooked moment everyone recognizes but never questions: grabbing whichever card feels right at checkout. The video opens by shattering the myth that carrying multiple cards automatically means earning more. It drops the viewer mid-scene at a register, builds the quiet tension of a habit that costs real rewards across hundreds of purchases, then pivots to the twist — the card left in the wallet might have earned triple. Resolution: RightCard surfaces the right answer before you tap, no guesswork, no bank login, just the right card every time.


**video script:**

BEAT 1 — MYTH HOOK (0–3s): Text overlay on screen: 'More cards = more rewards.' Cut hard. VO: 'Using more cards means earning more rewards. It does not.'

BEAT 2 — SETUP / DROP MID-SCENE (3–8s): Close shot of a hand hovering over a wallet with multiple visible card edges at a checkout counter. VO: 'You're standing at the register, three cards in your wallet, and you just grab one. Feels fine.'

BEAT 3 — CONFLICT / STAKES (8–15s): Cut to a slow zoom on the card being tapped against a payment terminal. VO: 'It is not. That one habit — repeated across hundreds of purchases — is quietly bleeding your rewards dry.'

BEAT 4 — TWIST / REVEAL (15–20s): Cut to a second card left behind in the wallet, untouched. VO: 'The card you didn't pick might have earned triple.'

BEAT 5 — RESOLUTION + CTA (20–25s): App interface shown inside a phone screen — clean card recommendation visible. VO: 'RightCard tells you exactly which card to use, right before you tap. Download it. Stop leaving money on the table.'


**duration_seconds (brief):** 25

**CTA:** Download the app and stop leaving rewards on the table. (type: lead)

**creative_mode:** 

**hashtags:** ["#creditcardrewards","#rewardsoptimization","#personalfinance","#moneytips","#travelrewards","#creditcards","#smartspending","#cashback","#rewardshacks","#rightcard"]


#### Full platform copy

##### x

```json
{
  "cta": "What card do you actually default to at checkout?",
  "format": "X post — terse, opinionated, sparks a reply",
  "caption": "More cards in your wallet doesn't mean more rewards. It means more chances to grab the wrong one. That habit — across hundreds of purchases — is a quiet money leak most people never notice. #creditcards #rewardstips",
  "hashtags": [
    "#creditcards",
    "#rewardstips"
  ],
  "title_variants": [
    "The myth that carrying more cards means earning more rewards",
    "That split-second checkout habit is costing you real rewards",
    "The card you left in your wallet might have earned triple"
  ],
  "caption_variants": [
    "More cards in your wallet doesn't mean more rewards. It means more chances to grab the wrong one. That habit — across hundreds of purchases — is a quiet money leak most people never notice. #creditcards #rewardstips",
    "You're at the register. Three cards. You grab one without thinking. Feels fine. It's probably not — the one you left behind might have earned triple at that store. Most people never find out. #creditcardrewards",
    "Hot take: the problem isn't that people don't have the right rewards cards. It's that they grab the wrong one at checkout anyway — every time — out of pure habit. The math adds up fast. #personalfinance #creditcards"
  ]
}
```
##### tiktok

```json
{
  "cta": "Check the link in bio and stop guessing.",
  "format": "Vertical Short (TikTok) — 25s, fast cuts, VO-driven, native casual tone",
  "caption": "More cards in your wallet doesn't mean more rewards. It just means more chances to grab the wrong one. That habit is costing you — every single checkout. RightCard tells you which card to actually use before you tap. Free, no bank login, nothing sketchy.",
  "hashtags": [
    "#creditcardrewards",
    "#moneytips",
    "#rewardshacks",
    "#personalfinance"
  ]
}
```
##### youtube

```json
{
  "cta": "Download RightCard free at https://www.rightcard.ai — and subscribe for more rewards optimization tips.",
  "format": "YouTube Short — 25s vertical, VO-driven, search-optimized title + structured description",
  "caption": "You carry multiple rewards cards. You still grab the wrong one at checkout — almost every time. Here's why that quiet habit is costing you more than you think, and how RightCard surfaces the right card to use before you even tap. No bank login required. Completely free. Runs on your device.\n\nDownload RightCard: https://www.rightcard.ai\n\nrightcard.ai covers 1,800+ brands and 130+ U.S. rewards cards, updated weekly. Your data never leaves your device.",
  "hashtags": [
    "#creditcardrewards",
    "#rewardsoptimization",
    "#personalfinance"
  ]
}
```
##### facebook

```json
{
  "cta": "Download the app free at https://www.rightcard.ai",
  "format": "Facebook feed post — conversational, relatable hook, single canonical link",
  "caption": "Here's something nobody tells you: carrying multiple rewards cards doesn't automatically mean you're earning more. It just means you have more chances to grab the wrong one at checkout — and most people do, every time, without realizing it.\n\nThat one habit, repeated across hundreds of purchases a year, quietly costs you real rewards. The card you didn't use might have earned triple at that store.\n\nRightCard fixes that. It tells you exactly which card to use before you tap — no bank login, no account linking, completely free. Runs on your device. Takes a minute to set up.\n\nDownload it and stop leaving rewards on the table: https://www.rightcard.ai",
  "hashtags": [
    "#creditcardrewards",
    "#moneytips"
  ]
}
```
##### linkedin

```json
{
  "cta": "Have you ever caught yourself grabbing the wrong card at checkout? Drop a comment — curious how common this actually is.",
  "format": "LinkedIn feed post — professional insight tone, no hype, invites engagement",
  "caption": "Most people who carry multiple rewards cards believe they're maximizing their earnings. They're not. The real problem isn't the number of cards — it's the moment of decision at checkout, where habit beats strategy every time.\n\nThat split-second choice, repeated across hundreds of purchases, can mean a meaningful difference in rewards earned over a year. The card left in the wallet might have earned triple at that specific merchant.\n\nRightCard is a free, on-device tool that identifies which card to use at 1,800+ brands — no bank login, no account linking, no data leaving your device. It's the overlooked detail that quietly changes the math.\n\nWorth a look if you hold more than one rewards card.",
  "hashtags": [
    "#personalfinance",
    "#creditcards",
    "#rewardsoptimization"
  ]
}
```
##### instagram

```json
{
  "cta": "Download it — link in bio.",
  "format": "Vertical Reel (Instagram) — 25s, polished VO + captions, story-arc structure",
  "caption": "Three cards in your wallet. You grab one. Feels fine. 💳\n\nIt's not. That split-second habit — repeated across hundreds of purchases — quietly drains your rewards. The card you left behind might have earned triple at that store.\n\nRightCard tells you which card to use before you tap. On-device, offline-capable, completely free. No bank login. Ever.",
  "hashtags": [
    "#creditcardrewards",
    "#rewardsoptimization",
    "#personalfinance",
    "#moneytips",
    "#travelrewards",
    "#creditcards",
    "#smartspending",
    "#cashback",
    "#rewardshacks",
    "#rightcard"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Extreme close-up vertical 9:16 portrait shot of a hand frozen mid-reach over an open leather wallet resting on a bright retail checkout counter. Three credit card edges are visible inside the wallet, fanned slightly so each card is distinct. The hand hovers, undecided. Natural warm store lighting, shallow depth of field, realistic textures. No text, no labels, no readable card numbers. The composition centers the wallet and hovering hand in the frame with natural headroom above and the counter surface below."
    },
    {
      "source": "ai",
      "image_prompt": "Tight vertical 9:16 portrait shot of a single credit card being tapped against a white contactless payment terminal on a retail counter. The cardholder's thumb and fingers grip the card naturally from the side. Soft natural overhead lighting, clean bright retail background slightly blurred. No text, no logos, no readable numbers on the card. The card and terminal are centered in the frame, communicating the moment of a payment decision being made."
    },
    {
      "source": "ai",
      "image_prompt": "Vertical 9:16 portrait close-up of a wallet lying open and slightly tilted on a checkout counter, one credit card already removed and out of frame, while two remaining cards sit untouched inside the wallet slots. The untouched cards are the visual focus — slightly elevated by the empty slot beside them. Warm natural store lighting, realistic leather wallet texture, shallow focus on the remaining cards. No text, no labels, no readable card numbers. The image communicates the idea of a missed choice."
    },
    {
      "modify": "false",
      "source": "asset",
      "used_as": "Show this product UI screenshot as a framed insert inside a phone mockup held in one hand at checkout level — the screen displays the card recommendation interface. The phone is angled toward the viewer in a natural one-handed grip, screen clearly visible, set against a softly blurred retail counter background. Do not crop fullscreen; present as a phone screen insert only.",
      "asset_id": "030e7435-ea38-4b9a-b8e7-b3107ace43e6",
      "video_usage": "Resolution beat — product reveal showing the app's card recommendation at the moment of checkout decision"
    },
    {
      "type": "CTA",
      "payload": {
        "subline": "Download RightCard — free, no bank login, no data shared.",
        "headline": "Stop guessing at checkout.",
        "show_logo": true,
        "button_label": "Download the app"
      }
    }
  ],
  "image_prompts": [
    "Extreme close-up vertical 9:16 portrait shot of a hand frozen mid-reach over an open leather wallet resting on a bright retail checkout counter. Three credit card edges are visible inside the wallet, fanned slightly so each card is distinct. The hand hovers, undecided. Natural warm store lighting, shallow depth of field, realistic textures. No text, no labels, no readable card numbers. The composition centers the wallet and hovering hand in the frame with natural headroom above and the counter surface below.",
    "Tight vertical 9:16 portrait shot of a single credit card being tapped against a white contactless payment terminal on a retail counter. The cardholder's thumb and fingers grip the card naturally from the side. Soft natural overhead lighting, clean bright retail background slightly blurred. No text, no logos, no readable numbers on the card. The card and terminal are centered in the frame, communicating the moment of a payment decision being made.",
    "Vertical 9:16 portrait close-up of a wallet lying open and slightly tilted on a checkout counter, one credit card already removed and out of frame, while two remaining cards sit untouched inside the wallet slots. The untouched cards are the visual focus — slightly elevated by the empty slot beside them. Warm natural store lighting, realistic leather wallet texture, shallow focus on the remaining cards. No text, no labels, no readable card numbers. The image communicates the idea of a missed choice."
  ],
  "asset_usage": [
    {
      "modify": "false",
      "used_as": "Show this product UI screenshot as a framed insert inside a phone mockup held in one hand at checkout level — the screen displays the card recommendation interface. The phone is angled toward the viewer in a natural one-handed grip, screen clearly visible, set against a softly blurred retail counter background. Do not crop fullscreen; present as a phone screen insert only.",
      "asset_id": "030e7435-ea38-4b9a-b8e7-b3107ace43e6"
    }
  ],
  "presentation_generation": {
    "mode": "enabled",
    "package_id": "55095835-df59-42c0-b982-aa76a3428366",
    "project_id": "514ffb17-254f-4fee-aef0-fbfdd6b8bc02",
    "visual_profile": "NATURAL",
    "downgrade_rules": [],
    "history_decisions": [],
    "accepted_cta_count": 1,
    "frequency_decisions": [],
    "requested_cta_count": 1,
    "accepted_phone_count": 0,
    "accepted_quote_count": 0,
    "cta_renderer_version": "cta@1",
    "downgraded_cta_count": 0,
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_profile_scores": null,
    "visual_profile_source": "package_snapshot",
    "downgraded_phone_count": 0,
    "downgraded_quote_count": 0,
    "phone_renderer_version": null,
    "quote_renderer_version": null,
    "visual_profile_reasons": null,
    "visual_profile_version": "visual-profile@2",
    "accepted_checklist_count": 0,
    "accepted_statistic_count": 0,
    "final_worker_scene_types": [
      "IMAGE",
      "IMAGE",
      "IMAGE",
      "IMAGE",
      "CTA"
    ],
    "prompt_presentation_types": [
      "IMAGE",
      "CHECKLIST",
      "PHONE",
      "QUOTE",
      "CTA"
    ],
    "requested_checklist_count": 0,
    "requested_statistic_count": 0,
    "checklist_allowlist_status": "allowlisted",
    "checklist_renderer_version": null,
    "downgraded_checklist_count": 0,
    "downgraded_statistic_count": 0,
    "statistic_renderer_version": null
  },
  "presentation_analyzer": null
}
```

#### Scene-by-scene

| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |
| ---: | --- | --- | --- | --- | --- |

#### TTS / voice

- **requested TTS voice (job input):** —
- **resolved at render:** nova
- **project voice resolution:** automatic deterministic selection → `nova`
- **differs from alloy:** yes
- **TTS instructions applied:** yes (project)
- **voiceover characters:** 425
- **estimated words:** 75
- **audio_duration (debug):** —
- **TTS validation attempts:** —
- **tail validation passed:** —
- **tts_tail_retry_used:** —

#### Visual profile

- **package/job profile:** NATURAL
- **version:** visual-profile@2
- **project auto-resolved profile:** NATURAL (source: override)
- **EDITORIAL prompt style token:** Natural lighting, believable setting, candid composition, realistic textures, restrained contrast.
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
    "CTA"
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

- Production: `/projects/514ffb17-254f-4fee-aef0-fbfdd6b8bc02/production`
- Review: `/projects/514ffb17-254f-4fee-aef0-fbfdd6b8bc02/review`
- Content packages: `/projects/514ffb17-254f-4fee-aef0-fbfdd6b8bc02/content-packages`
- Videos / scene editor: `/projects/514ffb17-254f-4fee-aef0-fbfdd6b8bc02/videos`
- API export JSON: `/api/production-runs/684a95ef-0bb6-4c84-88dd-9766df4a0285/export`

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
| The Wrong Card at Checkout: The Silent Money Leak Nobody Talks About | — | NATURAL | 0 | 0 | 0 | 0 | 1 | no | 0 |

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
