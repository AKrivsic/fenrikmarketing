# Production Run Audit — 328a9a04-f73b-4f1e-a85e-de2a3b7bdffa

_Generated 2026-07-16T23:35:51.207Z by `scripts/audit-production-run.ts` (read-only)._

## A. Executive summary

- **Strategy items:** 14
- **Content packages:** 14
- **Primary video jobs (newest per item):** 14 (5 completed, 0 failed)
- **Content items (all variants):** 133
- **Scene types in worker inputs:** {"IMAGE":12}
- **Visual profile(s) on jobs:** NATURAL, EDITORIAL, MINIMAL (project auto: MINIMAL)
- **Voices used:** shimmer, cedar (project default: cedar)
- **Moderation fallback scenes:** 0
- **Run warnings (subtitle/render flags):** 0
- **Major warnings:** None flagged on completed jobs.

## B. Run overview

| Field | Value |
| --- | --- |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| project_id | `aabab9ff-9db4-4012-a53c-135e3bfea6cd` |
| project name | Fenrik.chat |
| status | cancelled |
| created_at | 2026-07-16T23:07:06.651697+00:00 |
| updated_at (terminal) | 2026-07-16T23:32:10.211456+00:00 |
| package_count | 14 |
| requested_total | 14 |
| generated_total | 5 |
| failed_total | 0 |
| error_message | Zastaveno operátorem. |
| language | en |
| market_scope | global |

### requested_config

```json
{
  "plan": {
    "videoCount": 14,
    "packageCount": 14,
    "totalOutputs": 133,
    "platformOutputs": [
      {
        "kind": "video",
        "label": "TikTok",
        "outputs": 14,
        "platform": "tiktok",
        "multiplier": 1
      },
      {
        "kind": "video",
        "label": "Instagram",
        "outputs": 14,
        "platform": "instagram",
        "multiplier": 1
      },
      {
        "kind": "video",
        "label": "YouTube",
        "outputs": 14,
        "platform": "youtube",
        "multiplier": 1
      },
      {
        "kind": "text",
        "label": "LinkedIn",
        "outputs": 21,
        "platform": "linkedin",
        "multiplier": 1.5
      },
      {
        "kind": "text",
        "label": "X",
        "outputs": 70,
        "platform": "x",
        "multiplier": 5
      }
    ],
    "textOutputsTotal": 91,
    "videoOutputsTotal": 42
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
    "packageCount": 14,
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

- **b47abd0f-09fb-46a5-809d-70002d3291a9** — Your website is open 24/7 — but is it actually working?
```json
{
  "theme": "Your website is open 24/7 — but is it actually working?",
  "source": "production_run",
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
  "funnel_distribution": {
    "Awareness": 2,
    "Conversion": 2,
    "Problem Aware": 6,
    "Solution Aware": 4
  }
}
```

### production_run_items

```json
[
  {
    "id": "c6934429-563a-4e41-8d40-5311059051e1",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "b5810803-b571-42b5-bbb4-8f77174b75cf",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:13:33.537904+00:00"
  },
  {
    "id": "9d4aa72b-4a14-46e9-b744-bc050ec867d3",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "39ed9bb1-f0a1-41c4-9cc8-1f1de8255e5a",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:18:37.726587+00:00"
  },
  {
    "id": "5e1767b4-2147-4a11-b61c-2c2dcb41153c",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "ac67d2f5-81f7-4d3f-a291-ac4d60282f17",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:22:32.801226+00:00"
  },
  {
    "id": "647c82b7-4dfc-43dd-86d1-0a755c159718",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "9fe1a31e-0142-477f-907a-6ee079fd8f00",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:27:07.950868+00:00"
  },
  {
    "id": "137eecb9-da79-4716-8c00-75928c240217",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "completed",
    "content_package_id": "c998a760-add3-4d46-a580-69256f7d9826",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:32:10.095649+00:00"
  },
  {
    "id": "bdc38ee4-aef1-49b8-bba0-be5ffd23f4a1",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "running",
    "content_package_id": "f1104eed-664a-4cc9-9d0b-2cdf7bb75926",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:15:13.313144+00:00"
  },
  {
    "id": "283db9a8-a568-4adc-9848-96020955df14",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "running",
    "content_package_id": "460c2b90-03a9-497b-8a3d-0d55c04cf635",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:16:19.120485+00:00"
  },
  {
    "id": "4e80e4b7-784e-4932-b0f8-bf5a4562c37b",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "running",
    "content_package_id": "63730ec0-1c39-4f82-8edf-183a9b64e2d7",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:17:28.975484+00:00"
  },
  {
    "id": "c67246b2-02f8-4e45-b0cd-af80b08b1c16",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "running",
    "content_package_id": "555f5b5a-85c4-48b6-aefa-ebba2e85e4cb",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:18:29.493111+00:00"
  },
  {
    "id": "0502a4b2-206a-463b-9e60-39cf8b93a1ab",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "running",
    "content_package_id": "6ff1bcc0-2be8-412b-aec3-550d91aa8cb8",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:19:43.470969+00:00"
  },
  {
    "id": "b464c1a4-5161-41a9-be73-48ec89330840",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "running",
    "content_package_id": "992c82dc-d685-4253-8089-444b5d0bfbdd",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:20:44.318558+00:00"
  },
  {
    "id": "56e79a1e-e0e6-4571-95df-e3927f23f3c2",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "running",
    "content_package_id": "0079320c-f2b8-48ca-acda-8924c7b3c2ab",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:21:53.603056+00:00"
  },
  {
    "id": "8289515f-b636-489b-8033-b58729c0baef",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "running",
    "content_package_id": "6841d199-8768-4943-8253-2ff30481e61f",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:27:08.076264+00:00"
  },
  {
    "id": "3561bf40-5c28-4b90-9aa7-28bf97c67bd8",
    "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "platform": "tiktok",
    "content_type": "video",
    "status": "running",
    "content_package_id": "53e8f0d2-e947-4fc2-951c-092cf11a5ae3",
    "content_item_id": null,
    "video_job_id": null,
    "error_message": null,
    "created_at": "2026-07-16T23:07:06.961023+00:00",
    "updated_at": "2026-07-16T23:27:08.191889+00:00"
  }
]
```

## C. Package-by-package audit

### Package 1 — One script. One minute. Your website stops going silent after hours.

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `b5810803-b571-42b5-bbb4-8f77174b75cf` |
| strategy_item_id | `f31dcabb-1b6e-48d4-85fd-1ae715aabba0` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | conversion |
| created_at | 2026-07-16T23:09:19.252602+00:00 |
| updated_at | 2026-07-16T23:13:33.336863+00:00 |
| primary content_item_id | `a53f0a63-d10a-4644-985f-79ea8aca2de7` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** One script. One minute. Your website stops going silent after hours.
- **angle:** Direct, specific, and honest: here's what Fenrik.chat does, what it costs to start, and how fast it works. No technical knowledge, no developer, no training. The only question left is whether tonight's visitors will get an answer or leave.
- **package_index:** 12
- **platform:** tiktok
- **format:** reel
- **priority:** 5
- **funnel_stage (column):** conversion
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "Direct, specific, and honest: here's what Fenrik.chat does, what it costs to start, and how fast it works. No technical knowledge, no developer, no training. The only question left is whether tonight's visitors will get an answer or leave.",
  "topic": "One script. One minute. Your website stops going silent after hours.",
  "source": "production_run",
  "package_index": 12,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.


**voiceover_text:**

I'll be honest — refreshing my inbox every morning felt productive. Turns out I was just cataloguing the visitors who already left. Same question, every day: why didn't they reach out? Because nobody answered them. One script in your website. One minute to set up. Your site answers questions, captures leads, works after hours — starting at $69 a month. Tonight's visitors don't have to leave empty-handed.


**subtitles:**

I'll be honest — refreshing my inbox every morning felt productive. // Turns out I was just cataloguing the visitors who already left. // Same question, every day: why didn't they reach out? // Because nobody answered them. // One script in your website. One minute to set up. // Your site answers questions, captures leads, works after hours — // starting at $69 a month. // Tonight's visitors don't have to leave empty-handed.


**video concept:**

A fast-paced vertical short anchored to a recurring daily habit — the morning inbox refresh — reframed as evidence of a nightly lead leak. The hook is a candid confession that earns a laugh of recognition, then the twist reframes the habit as a symptom of a silent website. The payoff is simple and direct: one script, one minute, $69/month, and tonight looks different. Visual world: soft-focus urban street exterior, overcast daylight, focused calm. The product appears as a framed laptop insert during the payoff beat. Pacing is snappy — four distinct visual beats across 20 seconds.


**video script:**

[BEAT 1 — OBSERVATION / CONFESSION] Close on a storefront window from outside at dawn. Soft overcast light. A hand reaches to flip an 'Open' sign — but the scene lingers on the empty street, not the sign. VO: 'I'll be honest — refreshing my inbox every morning felt productive.'

[BEAT 2 — MEANING / TWIST] Wide three-quarter angle on a quiet urban shopfront, pastel morning light, a single chair visible through the glass — no customers, no movement. VO: 'Turns out I was just cataloguing the visitors who already left. Same question, every day: why didn't they reach out?'

[BEAT 3 — REVEAL / PRODUCT] Framed laptop screen insert showing the Fenrik.chat product UI — 'Create an AI assistant for your website in 1 minute' — centered in a clean laptop mockup against a soft bright background, placed within the urban exterior world. VO: 'Because nobody answered them. One script in your website. One minute to set up. Your site answers questions, captures leads, works after hours — starting at $69 a month.'

[BEAT 4 — PAYOFF / CTA] Wide shot of the same storefront exterior, now with warm diffused light suggesting evening — the street still quiet, but the window now glows faintly from within. VO: 'Tonight's visitors don't have to leave empty-handed.' Subtitle CTA burns in: 'Create your AI assistant — fenrik.chat'


**duration_seconds (brief):** 20–23

**CTA:** Create your AI assistant — see it live before you commit (type: sign_up)

**creative_mode:** 

**hashtags:** ["#AIchatbot","#LeadGeneration","#SmallBusiness","#WebsiteTips","#AIAssistant","#BusinessGrowth","#Fenrik"]


#### Full platform copy

##### x

```json
{
  "cta": "Try the live preview — no sign-up needed: fenrik.chat",
  "format": "X post (single tweet)",
  "caption": "Refreshing your inbox every morning isn't productivity. It's a recap of the leads your website lost overnight. One script. One minute. Your site answers questions 24/7. fenrik.chat",
  "hashtags": [
    "#LeadGeneration",
    "#AIchatbot"
  ],
  "title_variants": [
    "Your morning inbox refresh is just a delayed loss report",
    "The daily habit that proves your website is costing you leads",
    "What if tonight's visitors actually got an answer?",
    "One script. One minute. Your website stops going silent.",
    "The gap between 'closed for the night' and 'losing leads' is smaller than you think"
  ],
  "caption_variants": [
    "Refreshing your inbox every morning isn't productivity. It's a recap of the leads your website lost overnight. One script. One minute. Your site answers questions 24/7. fenrik.chat",
    "You check your inbox every morning. But the visitors who came at midnight didn't fill out your contact form — they just left. Your website needed something to say. Now it can. fenrik.chat — AI assistant, one minute, $69/month.",
    "What does a qualified prospect do when they land on your site after hours and nobody answers? They leave. That's it. One embed script on your site changes that tonight. fenrik.chat",
    "One script in your website. One minute to set up. Your site answers questions, captures leads, and works while you sleep. Starting at $69/month — no developer needed. fenrik.chat #LeadGeneration",
    "The visitors leaving your site without contacting you aren't uninterested. They just didn't get an answer. Fix that in about a minute. fenrik.chat #AIchatbot"
  ]
}
```
##### tiktok

```json
{
  "cta": "Try the preview before you sign up — link in bio",
  "format": "Vertical Short (TikTok native)",
  "caption": "Every morning I'd refresh my inbox like it was a ritual. Took me way too long to realize I was just counting the people who already left my site without a single reply. One script. One minute. $69/month. Your website talks back now — even at 2am.",
  "hashtags": [
    "#SmallBusiness",
    "#AIchatbot",
    "#LeadGeneration",
    "#WebsiteTips"
  ]
}
```
##### youtube

```json
{
  "cta": "Try the free preview at fenrik.chat — no sign-up required",
  "format": "YouTube Short (vertical)",
  "caption": "Your morning inbox refresh isn't a productivity habit — it's a highlight reel of the leads your website already lost overnight. Fenrik.chat adds an AI assistant to your website in about one minute using your existing content. No developer, no training, no complex setup — just a single embed script and your site starts answering visitor questions 24/7. Plans start at $69/month. Try the live preview at fenrik.chat before you sign up — no account needed.",
  "hashtags": [
    "#AIchatbot",
    "#LeadGeneration",
    "#SmallBusiness",
    "#WebsiteTools",
    "#Fenrik"
  ]
}
```
##### linkedin

```json
{
  "cta": "See how it works before committing — try the live preview at fenrik.chat",
  "format": "LinkedIn text post",
  "caption": "Every morning, many business owners open their inbox first thing. It feels productive. But it's actually a delayed report on what their website failed to do overnight — answer a question, keep a visitor engaged, capture a lead. The visitors who left at 11 PM didn't fill out a contact form. They just left. Fenrik.chat puts an AI assistant on your website in about one minute, using your existing content. No developer. No training. Starting at $69/month. The inbox habit stays — but what it reports back changes.",
  "hashtags": [
    "#LeadGeneration",
    "#AIAssistant",
    "#SmallBusiness"
  ],
  "title_variants": [
    "Your morning inbox refresh is a report on last night's missed leads",
    "The habit that reveals what your website cost you overnight"
  ],
  "caption_variants": [
    "Every morning, many business owners open their inbox first thing. It feels productive. But it's actually a delayed report on what their website failed to do overnight — answer a question, keep a visitor engaged, capture a lead. The visitors who left at 11 PM didn't fill out a contact form. They just left. Fenrik.chat puts an AI assistant on your website in about one minute, using your existing content. No developer. No training. Starting at $69/month. The inbox habit stays — but what it reports back changes.",
    "There's a gap between when your business closes and when your website visitors arrive. It happens every night. A prospect lands on your site, has a question, finds silence, and moves on. The morning inbox tells you nothing about them — because they never made it to the contact form. One embed script changes that. Fenrik.chat builds an AI assistant from your existing website content in about one minute. It answers questions, guides visitors, and captures leads — around the clock. No technical setup. No training required. From $69/month."
  ]
}
```
##### instagram

```json
{
  "cta": "See it live before you sign up — link in bio 👆",
  "format": "Vertical Reel (Instagram native)",
  "caption": "Confession: I used to think refreshing my inbox every morning was a power move. 😅 Turns out I was just reviewing the visitors who'd already moved on — because my website had nothing to say to them. The fix? One embed script. One minute. An AI assistant that answers questions, captures leads, and works while you sleep. Starting at $69/month — no developer, no training, no drama.",
  "hashtags": [
    "#SmallBusiness",
    "#AIAssistant",
    "#WebsiteTips",
    "#LeadGeneration",
    "#ChatBot",
    "#BusinessGrowth",
    "#MarketingTips",
    "#SaaS",
    "#DigitalMarketing",
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
      "image_prompt": "Soft polished 3D render. Portrait 9:16 vertical frame. A quiet urban storefront exterior at dawn, three-quarter angle, overcast diffused daylight casting soft even shadows. A hand reaches toward a door-mounted sign just inside the glass — the street beyond is empty, pastel-toned, no pedestrians. The composition is wide with intentional negative space above and to the right. Implied human presence just off-screen. Restrained saturation, soft pastel accents — warm amber door frame against cool grey pavement. Natural textures on brick and glass. No readable text, no signs with legible words, no UI elements."
    },
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of a small urban shopfront — a single chair visible through the glass window, interior softly lit but empty. The street outside is calm, overcast daylight, no foot traffic. A coffee cup sits on the windowsill ledge, untouched. The mood is focused calm — not abandoned, just quietly waiting. Soft pastel storefront facade, restrained saturation, intentional negative space in the upper portion of the frame. Implied human presence just off-screen to the left. No readable signage, no text, no UI."
    },
    {
      "modify": "false",
      "source": "asset",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the reveal/product beat; place it centered within a clean laptop mockup positioned on a surface within the soft urban exterior world — overcast light, pastel tones, three-quarter angle — do not crop fullscreen; the laptop sits naturally in the scene as a prop, not a hero.",
      "asset_id": "7e250d64-ddcf-4649-921f-783d294a2b5b",
      "video_usage": "framed_laptop"
    },
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at dusk — the street still quiet, but the shopfront window now emits a faint warm glow from within, suggesting something active inside while the world outside settles. Overcast sky transitioning to soft evening. Pastel accents — warm amber light from the window contrasting against cool blue-grey street. Intentional negative space above the roofline. Focused calm mood. Implied human presence just off-screen. No readable text, no signage with legible words, no UI elements."
    }
  ],
  "image_prompts": [
    "Soft polished 3D render. Portrait 9:16 vertical frame. A quiet urban storefront exterior at dawn, three-quarter angle, overcast diffused daylight casting soft even shadows. A hand reaches toward a door-mounted sign just inside the glass — the street beyond is empty, pastel-toned, no pedestrians. The composition is wide with intentional negative space above and to the right. Implied human presence just off-screen. Restrained saturation, soft pastel accents — warm amber door frame against cool grey pavement. Natural textures on brick and glass. No readable text, no signs with legible words, no UI elements.",
    "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of a small urban shopfront — a single chair visible through the glass window, interior softly lit but empty. The street outside is calm, overcast daylight, no foot traffic. A coffee cup sits on the windowsill ledge, untouched. The mood is focused calm — not abandoned, just quietly waiting. Soft pastel storefront facade, restrained saturation, intentional negative space in the upper portion of the frame. Implied human presence just off-screen to the left. No readable signage, no text, no UI.",
    "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at dusk — the street still quiet, but the shopfront window now emits a faint warm glow from within, suggesting something active inside while the world outside settles. Overcast sky transitioning to soft evening. Pastel accents — warm amber light from the window contrasting against cool blue-grey street. Intentional negative space above the roofline. Focused calm mood. Implied human presence just off-screen. No readable text, no signage with legible words, no UI elements."
  ],
  "asset_usage": [
    {
      "modify": "false",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the reveal/product beat; place it centered within a clean laptop mockup positioned on a surface within the soft urban exterior world — overcast light, pastel tones, three-quarter angle — do not crop fullscreen; the laptop sits naturally in the scene as a prop, not a hero.",
      "asset_id": "7e250d64-ddcf-4649-921f-783d294a2b5b"
    }
  ],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "shimmer",
    "package_id": "b5810803-b571-42b5-bbb4-8f77174b75cf",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 62,
      "secondary": 64
    },
    "voice_source": "package_secondary",
    "visual_medium": "SOFT_3D",
    "voice_reasons": [
      "funnel_conversion→steadiness(+2)",
      "mode_observation→steady/warmth",
      "profile_NATURAL→warmth(+2)",
      "topic_warmth_cues(+2)",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+62)",
      "fit_secondary(+64)"
    ],
    "product_reveal": {
      "reasons": [
        "story_prefers_outcome_over_framed:place",
        "fallback:abstract_system"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "ABSTRACT_PRODUCT_SYSTEM",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "shimmer",
    "visual_profile": "NATURAL",
    "delivery_reason": "Delivery: confident, concise, not aggressive. Delivery: thoughtful, reflective, steady pacing. Delivery: warm and approachable. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: confident, concise, not aggressive. Delivery: thoughtful, reflective, steady pacing. Language: en.",
    "visual_narrative": {
      "key": "place|environmental details that imply the pain before anyone speaks",
      "version": "visual-narrative@1",
      "subject_focus": "environmental details that imply the pain before anyone speaks",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "desk": 8,
        "group": 3,
        "phone": 4,
        "laptop": 7,
        "office": 7,
        "meeting": 1,
        "monitor": 1,
        "close_up": 8,
        "overhead": 3,
        "prototype": 1,
        "whiteboard": 1,
        "home_office": 3,
        "person_alone": 1,
        "sticky_notes": 2,
        "product_asset": 2
      },
      "supporting_carriers": [
        "object",
        "human",
        "metaphor"
      ],
      "primary_meaning_carrier": "place"
    },
    "creative_identity": {
      "key": "a soft-focus urban street exterior|focused calm|overcast diffused daylight|three-quarter angle on the subject|wide frame with intentional negative space|implied human presence just off-screen|soft pastel accents, restrained saturation",
      "mood": "focused calm",
      "camera": "three-quarter angle on the subject",
      "version": "creative-identity@1",
      "lighting": "overcast diffused daylight",
      "color_feel": "soft pastel accents, restrained saturation",
      "option_ids": {
        "mood": "focused_calm",
        "camera": "three_quarter",
        "lighting": "overcast_diffused",
        "color_feel": "soft_pastel",
        "composition": "wide_negative_space",
        "environment": "urban_street_soft",
        "human_presence": "implied_offscreen"
      },
      "composition": "wide frame with intentional negative space",
      "environment": "a soft-focus urban street exterior",
      "human_presence": "implied human presence just off-screen"
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
      "SOFT_3D": 3,
      "PHOTOGRAPHIC": 2,
      "GRAPHIC_COLLAGE": 0,
      "CLEAN_ILLUSTRATION": 1,
      "TECHNICAL_BLUEPRINT": 0
    },
    "visual_medium_source": "auto",
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_medium_reasons": [
      "SOFT_3D:digital_product(+2)",
      "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
      "PHOTOGRAPHIC:carrier_place(+2)",
      "SOFT_3D:funnel_solution(+1)"
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
        "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
        "topic": "Tonight, your website could already be capturing the leads it's currently losing",
        "motifs": [
          "phone",
          "desk",
          "office",
          "whiteboard",
          "sticky_notes",
          "close_up",
          "monitor",
          "home_office"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": null
      },
      {
        "hook": "Every morning you check your inbox — but you never check what your website said no to overnight.",
        "topic": "You can see your chatbot working before you sign up for anything",
        "motifs": [
          "laptop",
          "phone",
          "desk",
          "office",
          "close_up",
          "product_asset"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
      },
      {
        "hook": "You keep saying you'll build a chatbot — and every week you don't, a real visitor leaves your site with nothing.",
        "topic": "The difference between a website that collects traffic and one that captures leads",
        "motifs": [
          "laptop",
          "desk",
          "office",
          "group",
          "close_up",
          "overhead"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
      },
      {
        "hook": "A law firm can be set up in under a minute to answer client questions — and most still aren't.",
        "topic": "How a law firm could have kept that 11 PM visitor from leaving empty-handed",
        "motifs": [
          "laptop",
          "phone",
          "desk",
          "close_up"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
      },
      {
        "hook": "You're mid-pitch to your biggest prospect — and someone just abandoned your website because nobody answered them.",
        "topic": "One embed script — and your website answers questions while you sleep",
        "motifs": [
          "laptop",
          "desk",
          "office",
          "meeting",
          "group",
          "close_up"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
      },
      {
        "hook": "You spent weeks writing every word on your website — then built a chatbot from scratch as if none of it existed.",
        "topic": "What if your website already knew enough to answer visitor questions?",
        "motifs": [
          "laptop",
          "desk",
          "office",
          "group",
          "close_up",
          "overhead",
          "product_asset",
          "prototype"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
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
- **voiceover characters:** 407
- **estimated words:** 67
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
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 2 — Your website has an opinion about every visitor. You just never hear it say 'no.'

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `39ed9bb1-f0a1-41c4-9cc8-1f1de8255e5a` |
| strategy_item_id | `bcebd43e-5907-43ad-8ba0-c35b196ac212` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | awareness |
| created_at | 2026-07-16T23:10:29.816677+00:00 |
| updated_at | 2026-07-16T23:18:37.023184+00:00 |
| primary content_item_id | `2ec74b84-3d6b-47c1-b163-2d293a20c597` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** The moment a visitor decides to stay or leave your website — and you have no say in it
- **angle:** Most business owners think their website's job is to look good. It isn't. The real job is to answer the question a visitor has right now — and most websites fail that test silently, every single day.
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
  "angle": "Most business owners think their website's job is to look good. It isn't. The real job is to answer the question a visitor has right now — and most websites fail that test silently, every single day.",
  "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
  "source": "production_run",
  "package_index": 0,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.


**voiceover_text:**

You can preview your AI assistant before you even sign up. No account. No commitment. Just paste your URL and watch it answer questions live. Meanwhile, your actual website right now? Silent. A visitor lands, has a question, gets nothing back, and leaves. The funniest part — your website already had all the answers. It just never knew it was supposed to talk.


**subtitles:**

Preview your AI assistant — no sign-up needed. / Your website right now? Silent. / Visitor lands. Has a question. Gets nothing. Leaves. / Funniest part — your site already had all the answers. / It just never knew it was supposed to talk.


**video concept:**

A light, self-aware short that exposes the absurd overlooked detail: your website already contains every answer a visitor needs — it just silently refuses to share them. The humor lands on the gap between 'the information exists' and 'nobody ever told your website to use it.' Opens on a striking proof point (free preview, no registration), pivots to the quiet tragedy of a visitor leaving unanswered, then delivers the punchline — your site was always ready, it just needed permission to speak. Ends with a soft, direct CTA.


**video script:**

BEAT 1 — SITUATION (0–5s): Open on a lone object on a maker workbench: a closed notebook, full of answers, sitting untouched. Voiceover: 'You can preview your AI assistant before you even sign up. No account. No commitment.'

BEAT 2 — UNEXPECTED TURN (5–12s): Cut to the same workbench — now a small paper boat floats away across the surface, unnoticed, toward the edge. Voiceover: 'Meanwhile, your actual website right now? Silent. A visitor lands, has a question, gets nothing back, and leaves.'

BEAT 3 — PUNCHLINE (12–19s): Back to the notebook — it falls open by itself, pages full of neat notes, perfectly organized, completely unused. Voiceover: 'The funniest part — your website already had all the answers. It just never knew it was supposed to talk.'

BEAT 4 — CTA (19–23s): Workbench clears. A single embed script card rests on the surface, simple and clean. Voiceover: 'Paste your URL and watch it work. No sign-up needed.'


**duration_seconds (brief):** 23

**CTA:** Paste your URL and watch your website answer live — no account needed at fenrik.chat (type: sign_up)

**creative_mode:** 

**hashtags:** ["#aichatbot","#smallbusiness","#leadgeneration","#websitetips","#chatbot","#businessgrowth","#digitalmarketing","#customerexperience","#saas","#fenrikchat"]


#### Full platform copy

##### x

```json
{
  "cta": "See it answer live — no sign-up: fenrik.chat",
  "format": "X Post",
  "caption": "Your website has every answer a visitor needs. It just never tells them. That's the whole problem.",
  "hashtags": [
    "#smallbusiness",
    "#aichatbot"
  ],
  "title_variants": [
    "The overlooked detail costing you leads every night",
    "Your website already knows the answer — it just won't say it",
    "Most business owners miss this completely",
    "The funniest part about your silent website",
    "What your website does when a visitor has a question at midnight"
  ],
  "caption_variants": [
    "Your website has every answer a visitor needs. It just never tells them. That's the whole problem.",
    "Visitor lands on your site. Has a question. Your website: *silence*. The answer was right there the whole time. It just didn't know it was supposed to talk.",
    "Most business owners obsess over how their website looks. Almost none of them ask what it says when a visitor has a question at 11 PM. (Usually: nothing.)",
    "You wrote every word on that website. FAQs, services, pricing. A visitor showed up last night and asked about it. Your website stared back at them and said nothing.",
    "Hot take: your website isn't broken. It's just mute. There's a one-minute fix for that. fenrik.chat"
  ]
}
```
##### tiktok

```json
{
  "cta": "Check the link in bio — paste your URL and watch it go live",
  "format": "Vertical Short (TikTok)",
  "caption": "Your website already has every answer. It's just never been told to share them. That's the whole problem — and the fix takes about a minute.",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#aichatbot",
    "#leadgeneration"
  ]
}
```
##### youtube

```json
{
  "cta": "Try the free preview at fenrik.chat — no sign-up needed",
  "format": "YouTube Short (Vertical)",
  "caption": "Your website already has all the answers — it just doesn't know it's supposed to talk. Most business owners overlook this one detail, and it quietly costs them leads every single night. In this short, we show exactly what happens when a visitor lands on a silent website — and how a 60-second setup changes that permanently. Try the live preview at fenrik.chat — no account required.",
  "hashtags": [
    "#aichatbot",
    "#smallbusiness",
    "#leadgeneration",
    "#websitetips",
    "#fenrikchat"
  ]
}
```
##### linkedin

```json
{
  "cta": "Have you noticed this gap on your own website? Worth a look.",
  "format": "LinkedIn Post",
  "caption": "There is a detail most business owners never notice — and it is quietly costing them leads every week.\n\nYour website already contains every answer a visitor could need. Your services, your process, your pricing, your FAQs. All of it is there.\n\nBut when a qualified prospect visits outside business hours and has a real question, the website does nothing. They leave. No contact. No lead. No record they were ever there.\n\nThe information was always ready. The website just never knew it was supposed to use it.\n\nFenrik.chat builds an AI assistant directly from your existing website content — no training, no developer, no setup complexity. You can see it answer questions live before you even create an account.\n\nhttps://fenrik.chat",
  "hashtags": [
    "#LeadGeneration",
    "#SmallBusiness",
    "#AIChatbot"
  ],
  "title_variants": [
    "The overlooked detail that costs business owners leads every single night",
    "Your website already has all the answers — it just refuses to share them"
  ],
  "caption_variants": [
    "There is a detail most business owners never notice — and it is quietly costing them leads every week.\n\nYour website already contains every answer a visitor could need. Your services, your process, your pricing, your FAQs. All of it is there.\n\nBut when a qualified prospect visits outside business hours and has a real question, the website does nothing. They leave. No contact. No lead. No record they were ever there.\n\nThe information was always ready. The website just never knew it was supposed to use it.\n\nFenrik.chat builds an AI assistant directly from your existing website content — no training, no developer, no setup complexity. You can see it answer questions live before you even create an account.\n\nhttps://fenrik.chat",
    "Most websites are full of useful information.\n\nService pages. Pricing. FAQs. Case studies. Carefully written, carefully structured.\n\nAnd then a potential client visits at 10 PM with a specific question — and the website just sits there.\n\nNo response. No guidance. No lead captured.\n\nThe content was always capable of answering. The website just had no mechanism to deliver it.\n\nThat gap is what Fenrik.chat closes — an AI assistant built automatically from your existing website, live in about a minute, no developer required.\n\nSee it working on your own site before you sign up: https://fenrik.chat"
  ]
}
```
##### instagram

```json
{
  "cta": "See it work before you sign up — link in bio",
  "format": "Vertical Reel (Instagram)",
  "caption": "Here's the detail most business owners completely miss 👇\n\nYour website already contains every answer a visitor could need. Your services, your pricing, your FAQs — it's all there.\n\nBut when someone lands at 11 PM with a real question? The website just stares back at them. They leave. You never knew they came.\n\nThe information was always ready. Your website just didn't know it was supposed to use it.",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#aichatbot",
    "#leadgeneration",
    "#chatbot",
    "#businessgrowth",
    "#digitalmarketing",
    "#customerexperience",
    "#saas",
    "#startups"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A maker workbench seen slightly above table height with gentle side lighting and soft shadows, urban gray-blue ambient palette. On the workbench surface sits a single closed notebook, thick with pages, centered in the frame. The notebook is the clear subject — full, organized, untouched. Layered depth: a blurred background of workshop tools and shelves. A silhouette of a person is faintly visible in the background, turned away. No readable text, no labels, no UI elements anywhere in the image. Natural, restrained color palette."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The same maker workbench, gentle side lighting, urban gray-blue ambient palette. A tiny paper boat drifts slowly across the flat wooden surface toward the far edge, unnoticed and unattended. The workbench is otherwise still and quiet. The paper boat is the sole moving subject — small, fragile, heading off the edge. Layered depth with background tools softly blurred. No readable text, no labels, no UI elements. Reflective, slightly melancholy mood within a warm maker-space environment."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker workbench, gentle side lighting, urban gray-blue ambient palette. The same notebook from beat one now lies open at the center of the workbench — pages spread wide, filled with neat organized marks and structured content (no readable words, just visible order and density). The notebook is clearly full of useful information that has never been used. A faint silhouette of a person stands behind the workbench, looking down at the open notebook with a pause of recognition. Layered depth. No readable text, no labels, no UI elements."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker workbench, cleared and clean, gentle side lighting, urban gray-blue ambient palette. A single small card rests at the center of the surface — simple, minimal, undecorated, representing a code snippet or embed instruction as an abstract object (a folded card or small tag, no readable text). The card sits alone with intentional negative space around it. The composition feels like a resolution — a simple tool that solves everything. No readable text, no labels, no UI elements. Calm, purposeful mood."
    }
  ],
  "image_prompts": [
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A maker workbench seen slightly above table height with gentle side lighting and soft shadows, urban gray-blue ambient palette. On the workbench surface sits a single closed notebook, thick with pages, centered in the frame. The notebook is the clear subject — full, organized, untouched. Layered depth: a blurred background of workshop tools and shelves. A silhouette of a person is faintly visible in the background, turned away. No readable text, no labels, no UI elements anywhere in the image. Natural, restrained color palette.",
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The same maker workbench, gentle side lighting, urban gray-blue ambient palette. A tiny paper boat drifts slowly across the flat wooden surface toward the far edge, unnoticed and unattended. The workbench is otherwise still and quiet. The paper boat is the sole moving subject — small, fragile, heading off the edge. Layered depth with background tools softly blurred. No readable text, no labels, no UI elements. Reflective, slightly melancholy mood within a warm maker-space environment.",
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker workbench, gentle side lighting, urban gray-blue ambient palette. The same notebook from beat one now lies open at the center of the workbench — pages spread wide, filled with neat organized marks and structured content (no readable words, just visible order and density). The notebook is clearly full of useful information that has never been used. A faint silhouette of a person stands behind the workbench, looking down at the open notebook with a pause of recognition. Layered depth. No readable text, no labels, no UI elements.",
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker workbench, cleared and clean, gentle side lighting, urban gray-blue ambient palette. A single small card rests at the center of the surface — simple, minimal, undecorated, representing a code snippet or embed instruction as an abstract object (a folded card or small tag, no readable text). The card sits alone with intentional negative space around it. The composition feels like a resolution — a simple tool that solves everything. No readable text, no labels, no UI elements. Calm, purposeful mood."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "shimmer",
    "package_id": "39ed9bb1-f0a1-41c4-9cc8-1f1de8255e5a",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 49,
      "secondary": 62
    },
    "voice_source": "package_secondary",
    "visual_medium": "CLEAN_ILLUSTRATION",
    "voice_reasons": [
      "funnel_awareness→warmth/energy(+1)",
      "mode_humor→energy/warmth",
      "profile_NATURAL→warmth(+2)",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+49)",
      "fit_secondary(+62)"
    ],
    "product_reveal": {
      "reasons": [
        "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "FRAMED_ASSET",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "shimmer",
    "visual_profile": "NATURAL",
    "delivery_reason": "Delivery: natural, curious, conversational. Delivery: lightly playful, never exaggerated. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: natural, curious, conversational. Delivery: lightly playful, never exaggerated. Delivery: confident, concise, not aggressive. Language: en.",
    "visual_narrative": {
      "key": "object|objects that change state across beats to tell the story",
      "version": "visual-narrative@1",
      "subject_focus": "objects that change state across beats to tell the story",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "desk": 7,
        "group": 3,
        "phone": 4,
        "laptop": 6,
        "office": 6,
        "meeting": 1,
        "monitor": 1,
        "close_up": 7,
        "overhead": 2,
        "prototype": 1,
        "whiteboard": 1,
        "home_office": 2,
        "sticky_notes": 1,
        "product_asset": 2
      },
      "supporting_carriers": [
        "place",
        "process",
        "transformation"
      ],
      "primary_meaning_carrier": "object"
    },
    "creative_identity": {
      "key": "a maker workbench with tools and materials|reflective, thoughtful pause|gentle side lighting with soft shadows|slightly above table height|layered depth with foreground and background|person seen from behind or as silhouette|urban gray-blue ambient palette",
      "mood": "reflective, thoughtful pause",
      "camera": "slightly above table height",
      "version": "creative-identity@1",
      "lighting": "gentle side lighting with soft shadows",
      "color_feel": "urban gray-blue ambient palette",
      "option_ids": {
        "mood": "reflective",
        "camera": "slightly_above_table",
        "lighting": "gentle_side_light",
        "color_feel": "urban_gray_blue",
        "composition": "layered_depth",
        "environment": "maker_workbench",
        "human_presence": "silhouette_back"
      },
      "composition": "layered depth with foreground and background",
      "environment": "a maker workbench with tools and materials",
      "human_presence": "person seen from behind or as silhouette"
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
      "SOFT_3D": 2,
      "PHOTOGRAPHIC": 0,
      "GRAPHIC_COLLAGE": 0,
      "CLEAN_ILLUSTRATION": 4,
      "TECHNICAL_BLUEPRINT": 2
    },
    "visual_medium_source": "auto",
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_medium_reasons": [
      "SOFT_3D:digital_product(+2)",
      "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
      "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
      "TECHNICAL_BLUEPRINT:carrier_process(+1)",
      "CLEAN_ILLUSTRATION:saas_abstract(+1)",
      "TECHNICAL_BLUEPRINT:saas_system(+1)"
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
        "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
        "topic": "One script. One minute. Your website stops going silent after hours.",
        "motifs": [],
        "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": null,
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
      },
      {
        "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
        "topic": "Tonight, your website could already be capturing the leads it's currently losing",
        "motifs": [
          "phone",
          "desk",
          "office",
          "whiteboard",
          "sticky_notes",
          "close_up",
          "monitor",
          "home_office"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": null
      },
      {
        "hook": "Every morning you check your inbox — but you never check what your website said no to overnight.",
        "topic": "You can see your chatbot working before you sign up for anything",
        "motifs": [
          "laptop",
          "phone",
          "desk",
          "office",
          "close_up",
          "product_asset"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
      },
      {
        "hook": "You keep saying you'll build a chatbot — and every week you don't, a real visitor leaves your site with nothing.",
        "topic": "The difference between a website that collects traffic and one that captures leads",
        "motifs": [
          "laptop",
          "desk",
          "office",
          "group",
          "close_up",
          "overhead"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
      },
      {
        "hook": "A law firm can be set up in under a minute to answer client questions — and most still aren't.",
        "topic": "How a law firm could have kept that 11 PM visitor from leaving empty-handed",
        "motifs": [
          "laptop",
          "phone",
          "desk",
          "close_up"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
      },
      {
        "hook": "You're mid-pitch to your biggest prospect — and someone just abandoned your website because nobody answered them.",
        "topic": "One embed script — and your website answers questions while you sleep",
        "motifs": [
          "laptop",
          "desk",
          "office",
          "meeting",
          "group",
          "close_up"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
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
- **voiceover characters:** 361
- **estimated words:** 63
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
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 3 — Your website is open right now — and it has no idea what to say

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `ac67d2f5-81f7-4d3f-a291-ac4d60282f17` |
| strategy_item_id | `4d71b0da-7b9c-407c-bfef-ff7cc52bf23e` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | awareness |
| created_at | 2026-07-16T23:11:43.71282+00:00 |
| updated_at | 2026-07-16T23:22:32.088907+00:00 |
| primary content_item_id | `29709c6b-968b-4073-af26-02b959d37043` |
| video_job_id | `b072e3a5-06b0-4cc2-9e39-cd6983c8cc27` |
| video_job status | completed |

#### Strategy input

- **topic:** Your business is closed — but your website is still getting visitors right now
- **angle:** Walk through what actually happens to a small business website after hours: traffic comes in, questions go unanswered, and potential customers quietly disappear. No drama — just the reality most owners never see.
- **package_index:** 1
- **platform:** tiktok
- **format:** reel
- **priority:** 2
- **funnel_stage (column):** awareness
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "Walk through what actually happens to a small business website after hours: traffic comes in, questions go unanswered, and potential customers quietly disappear. No drama — just the reality most owners never see.",
  "topic": "Your business is closed — but your website is still getting visitors right now",
  "source": "production_run",
  "package_index": 1,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

The busiest moment for your website is the one you're never around to see.


**voiceover_text:**

A software founder checks analytics at 8 AM. Forty visitors hit the pricing page overnight. Zero converted. No one was there to answer a single question. Here's what stings: building a chatbot felt like a six-month project, so it never started. It didn't have to be. Fenrik reads your website and has your AI assistant ready in about a minute. Create yours before tonight.


**subtitles:**

The busiest moment for your website is the one you're never around to see. | A software founder checks analytics at 8 AM. | Forty visitors hit the pricing page overnight. Zero converted. | No one was there to answer a single question. | Here's what stings — building a chatbot felt like a six-month project, so it never started. | It didn't have to be. | Fenrik reads your website and has your AI assistant ready in about a minute. | Create yours before tonight.


**video concept:**

A high-pressure, last-minute moment: a SaaS founder opens their analytics dashboard first thing in the morning and sees dozens of overnight visitors who dropped off the pricing page without a single conversion. The story pivots on the twist — they'd been avoiding a chatbot because they assumed it was a months-long build. The resolution reframes the whole belief: Fenrik reads your existing website and stands up an AI assistant in about a minute. No build. No backlog. No developer. The visual world is a maker workbench — warm wood surfaces, tools, materials — lit brightly and framed wide, with objects carrying the narrative weight rather than people at desks.


**video script:**

HOOK (0–3s): Wide flat-illustration still — an open logbook on a warm workbench, pages filled with tally marks, the last column conspicuously empty. Voiceover: 'The busiest moment for your website is the one you're never around to see.'

SETUP (3–9s): A clean analytics-style object — a ruled sheet with rows of small dots representing visitor sessions, most crossed out, none circled. Voiceover: 'A software founder checks analytics at 8 AM. Forty visitors hit the pricing page overnight. Zero converted.'

CONFLICT (9–14s): A half-assembled blueprint pinned to the workbench, tools laid out but untouched, a crossed-out timeline in the corner. Voiceover: 'Here's what stings: building a chatbot felt like a six-month project, so it never started.'

TWIST / RESOLUTION (14–20s): The same workbench, now with a single small embed card placed cleanly at the center — everything else cleared away — warm amber light. Framed laptop insert with Fenrik product UI visible on screen. Voiceover: 'It didn't have to be. Fenrik reads your website and has your AI assistant ready in about a minute.'

CTA (20–23s): Workbench, clear surface, one object — a small illuminated card. Voiceover: 'Create yours before tonight.'


**duration_seconds (brief):** 23

**CTA:** Create your AI assistant (type: sign_up)

**creative_mode:** story

**hashtags:** ["#aichatbot","#leadgeneration","#smallbusiness","#websitetips","#saas","#digitalmarketing","#businessgrowth","#marketingtools","#customerexperience"]


#### Full platform copy

##### x

```json
{
  "cta": "fenrik.chat",
  "format": "Single post — terse, opinionated, conversion-oriented",
  "caption": "40 visitors hit the pricing page overnight. Zero converted. The chatbot had been 'on the list' for months — because it felt like a big build. It's not. Fenrik reads your site and sets up your AI assistant in ~1 minute.",
  "hashtags": [
    "#aichatbot",
    "#leadgeneration"
  ],
  "title_variants": [
    "40 overnight visitors. Zero conversions. One avoidable reason.",
    "The chatbot you kept delaying is a one-minute setup.",
    "Your pricing page had visitors last night. Did any of them get an answer?",
    "Believing a chatbot takes months to build is costing you leads every night.",
    "Your website is open 24/7. Your answers aren't."
  ],
  "caption_variants": [
    "40 visitors hit the pricing page overnight. Zero converted. The chatbot had been 'on the list' for months — because it felt like a big build. It's not. Fenrik reads your site and sets up your AI assistant in ~1 minute. fenrik.chat",
    "The chatbot you've been putting off? Turns out it's not a developer project. Fenrik reads your existing website and has it live in about a minute. No code. No backlog. No excuse left. fenrik.chat #aichatbot",
    "Your pricing page had 40 visitors last night. How many got an answer? If the number is zero, the problem isn't traffic — it's that your site can't talk back. fenrik.chat #leadgeneration",
    "Biggest silent lead killer: assuming a chatbot takes months. Fenrik scans your website and builds your AI assistant in ~1 minute. The belief was the bottleneck — not the build. fenrik.chat",
    "Your website is open right now. Visitors are landing, asking nothing, and leaving — because there's nothing to ask. One embed script changes that. fenrik.chat #aichatbot"
  ]
}
```
##### tiktok

```json
{
  "cta": "Drop a 👋 if your website goes silent after hours — there's a fix.",
  "format": "Vertical short (TikTok / Reels / Shorts) — raw, conversational, story-first",
  "caption": "40 people visited the pricing page overnight. Zero left their info. The founder had been meaning to set up a chatbot for months — just assumed it'd take forever to build. Turns out it takes about a minute. 🤯",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#aichatbot",
    "#leadgeneration"
  ]
}
```
##### youtube

```json
{
  "cta": "Create your AI assistant at https://fenrik.chat — see it live before you commit.",
  "format": "Vertical short (YouTube Shorts) — informative, watch-time oriented, search-friendly",
  "caption": "Your Website Is Open Right Now — And It Has Nothing to Say\n\nEvery night, visitors land on your website, hit the pricing page, and leave without converting — because no one is there to answer their questions. Most business owners assume fixing this means months of chatbot development. It doesn't. Fenrik reads your existing website and creates an AI assistant in about a minute, with no code and no technical setup required. This video walks through what actually happens to a small business website after hours — and why the belief that a chatbot is a big project is the exact thing quietly costing you leads.",
  "hashtags": [
    "#aichatbot",
    "#websiteoptimization",
    "#leadgeneration",
    "#smallbusiness",
    "#saas"
  ]
}
```
##### linkedin

```json
{
  "cta": "What's stopping most businesses from setting this up — is it time, trust, or just the assumption that it's hard?",
  "format": "Text post — professional, insight-led, B2B tone",
  "caption": "A SaaS founder opened their analytics on Monday morning. Forty visitors had hit the pricing page overnight. None converted — and not a single question had been answered.\n\nThey'd been planning to set up a chatbot for months. But it felt like a developer project, a long backlog, a resource they didn't have. So it stayed on the list.\n\nThat assumption is the real cost. Not the missed visitors — the belief that fixing it is complicated.\n\nFenrik reads your existing website and builds an AI assistant in about a minute. No code. No integration work. No waiting.\n\nYour website is open tonight. The question is whether it has anything to say.",
  "hashtags": [
    "#AIchatbot",
    "#leadgeneration",
    "#SaaS"
  ]
}
```
##### instagram

```json
{
  "cta": "Try the preview — link in bio.",
  "format": "Vertical short (TikTok / Reels / Shorts) — polished, story-led, aspirational",
  "caption": "Your website had 40 visitors last night. None of them converted — because no one was there to answer a single question. 💭\n\nThe fix felt like a six-month project, so it never happened. Except it's not. Fenrik reads your existing website and sets up an AI assistant in about a minute — no code, no developer, no backlog.\n\nYour site is open right now. It should have something to say.",
  "hashtags": [
    "#aichatbot",
    "#smallbusiness",
    "#websitetips",
    "#leadgeneration",
    "#saas",
    "#marketingtools",
    "#digitalmarketing",
    "#businessgrowth",
    "#customerexperience"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. A wide maker workbench shot from slightly above table height, warm wood surface under bright even indoor light, amber highlights on the grain. An open logbook lies at center — its pages filled with neat tally rows, the final column conspicuously blank and empty. Ruler, pencil, and a small cup of tools sit at the edges of the wide frame with intentional negative space on either side. No readable text, no labels, no UI elements. Mood: quiet, slightly unsettling absence. Color feel: warm amber and natural wood tones."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. Wide maker workbench, slightly above table height, bright even indoor light, warm wood surface. A large ruled sheet of paper lies flat at center — rows of small filled dots representing visitor sessions, the vast majority crossed out with a single diagonal stroke, none circled or highlighted. A pencil rests beside it. Wide frame, intentional negative space around the sheet. No readable text, no numbers, no labels. Mood: the visual weight of missed opportunity. Color feel: warm amber and cream paper tones."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. Wide maker workbench from slightly above table height, bright even indoor light, amber highlights on warm wood. A blueprint or project plan is pinned flat to the surface — its timeline bar crossed out with a bold X, tools (a ruler, compass, folded measuring tape) laid out around it but clearly untouched and unused. Wide frame with intentional negative space on either side. No readable text, no labels, no UI. Mood: a plan that never launched — friction and stall. Color feel: warm amber, cream blueprint tones, muted blue-grey for the crossed-out timeline."
    },
    {
      "modify": "false",
      "source": "asset",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–20); place it centered within a clean laptop mockup positioned on the warm wood workbench surface — bright even indoor light, wide frame, amber highlights — do not crop fullscreen; the laptop sits naturally as a prop on the workbench with intentional negative space around it.",
      "asset_id": "7e250d64-ddcf-4649-921f-783d294a2b5b",
      "video_usage": "framed_laptop"
    }
  ],
  "image_prompts": [
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. A wide maker workbench shot from slightly above table height, warm wood surface under bright even indoor light, amber highlights on the grain. An open logbook lies at center — its pages filled with neat tally rows, the final column conspicuously blank and empty. Ruler, pencil, and a small cup of tools sit at the edges of the wide frame with intentional negative space on either side. No readable text, no labels, no UI elements. Mood: quiet, slightly unsettling absence. Color feel: warm amber and natural wood tones.",
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. Wide maker workbench, slightly above table height, bright even indoor light, warm wood surface. A large ruled sheet of paper lies flat at center — rows of small filled dots representing visitor sessions, the vast majority crossed out with a single diagonal stroke, none circled or highlighted. A pencil rests beside it. Wide frame, intentional negative space around the sheet. No readable text, no numbers, no labels. Mood: the visual weight of missed opportunity. Color feel: warm amber and cream paper tones.",
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. Wide maker workbench from slightly above table height, bright even indoor light, amber highlights on warm wood. A blueprint or project plan is pinned flat to the surface — its timeline bar crossed out with a bold X, tools (a ruler, compass, folded measuring tape) laid out around it but clearly untouched and unused. Wide frame with intentional negative space on either side. No readable text, no labels, no UI. Mood: a plan that never launched — friction and stall. Color feel: warm amber, cream blueprint tones, muted blue-grey for the crossed-out timeline."
  ],
  "asset_usage": [
    {
      "modify": "false",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–20); place it centered within a clean laptop mockup positioned on the warm wood workbench surface — bright even indoor light, wide frame, amber highlights — do not crop fullscreen; the laptop sits naturally as a prop on the workbench with intentional negative space around it.",
      "asset_id": "7e250d64-ddcf-4649-921f-783d294a2b5b"
    }
  ],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "shimmer",
    "package_id": "ac67d2f5-81f7-4d3f-a291-ac4d60282f17",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 47,
      "secondary": 66
    },
    "voice_source": "package_secondary",
    "visual_medium": "CLEAN_ILLUSTRATION",
    "voice_reasons": [
      "funnel_awareness→warmth/energy(+1)",
      "mode_story→warmth(+3)",
      "profile_NATURAL→warmth(+2)",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+47)",
      "fit_secondary(+66)"
    ],
    "product_reveal": {
      "reasons": [
        "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "FRAMED_ASSET",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "shimmer",
    "visual_profile": "NATURAL",
    "delivery_reason": "Delivery: natural, curious, conversational. Delivery: warm, intimate, conversational storytelling pace. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: natural, curious, conversational. Delivery: warm, intimate, conversational storytelling pace. Delivery: confident, concise, not aggressive. Language: en.",
    "visual_narrative": {
      "key": "object|physical evidence of the problem (empty tray, crossed-out plan, half-finished stack)",
      "version": "visual-narrative@1",
      "subject_focus": "physical evidence of the problem (empty tray, crossed-out plan, half-finished stack)",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "desk": 6,
        "group": 3,
        "phone": 3,
        "laptop": 5,
        "office": 5,
        "meeting": 2,
        "monitor": 1,
        "close_up": 6,
        "overhead": 2,
        "prototype": 1,
        "whiteboard": 1,
        "home_office": 1,
        "person_alone": 1,
        "sticky_notes": 1,
        "product_asset": 2
      },
      "supporting_carriers": [
        "place",
        "process",
        "transformation"
      ],
      "primary_meaning_carrier": "object"
    },
    "creative_identity": {
      "key": "a maker workbench with tools and materials|subtle relief after friction|bright, even indoor illumination|slightly above table height|wide frame with intentional negative space|face intentionally not visible|warm wood surfaces and amber highlights",
      "mood": "subtle relief after friction",
      "camera": "slightly above table height",
      "version": "creative-identity@1",
      "lighting": "bright, even indoor illumination",
      "color_feel": "warm wood surfaces and amber highlights",
      "option_ids": {
        "mood": "relieved",
        "camera": "slightly_above_table",
        "lighting": "bright_even_indoor",
        "color_feel": "warm_wood",
        "composition": "wide_negative_space",
        "environment": "maker_workbench",
        "human_presence": "face_not_visible"
      },
      "composition": "wide frame with intentional negative space",
      "environment": "a maker workbench with tools and materials",
      "human_presence": "face intentionally not visible"
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
      "SOFT_3D": 2,
      "PHOTOGRAPHIC": 0,
      "GRAPHIC_COLLAGE": 0,
      "CLEAN_ILLUSTRATION": 4,
      "TECHNICAL_BLUEPRINT": 2
    },
    "visual_medium_source": "auto",
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_medium_reasons": [
      "SOFT_3D:digital_product(+2)",
      "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
      "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
      "TECHNICAL_BLUEPRINT:carrier_process(+1)",
      "CLEAN_ILLUSTRATION:saas_abstract(+1)",
      "TECHNICAL_BLUEPRINT:saas_system(+1)"
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
        "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
        "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
        "motifs": [
          "meeting",
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "meeting",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
        "topic": "One script. One minute. Your website stops going silent after hours.",
        "motifs": [],
        "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": null,
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
      },
      {
        "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
        "topic": "Tonight, your website could already be capturing the leads it's currently losing",
        "motifs": [
          "phone",
          "desk",
          "office",
          "whiteboard",
          "sticky_notes",
          "close_up",
          "monitor",
          "home_office"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": null
      },
      {
        "hook": "Every morning you check your inbox — but you never check what your website said no to overnight.",
        "topic": "You can see your chatbot working before you sign up for anything",
        "motifs": [
          "laptop",
          "phone",
          "desk",
          "office",
          "close_up",
          "product_asset"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
      },
      {
        "hook": "You keep saying you'll build a chatbot — and every week you don't, a real visitor leaves your site with nothing.",
        "topic": "The difference between a website that collects traffic and one that captures leads",
        "motifs": [
          "laptop",
          "desk",
          "office",
          "group",
          "close_up",
          "overhead"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
      },
      {
        "hook": "A law firm can be set up in under a minute to answer client questions — and most still aren't.",
        "topic": "How a law firm could have kept that 11 PM visitor from leaving empty-handed",
        "motifs": [
          "laptop",
          "phone",
          "desk",
          "close_up"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
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
      "package_id": "ac67d2f5-81f7-4d3f-a291-ac4d60282f17",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "cta_selected": false,
      "visual_profile": "NATURAL",
      "downgrade_rules": [],
      "creative_identity": {
        "key": "a maker workbench with tools and materials|subtle relief after friction|bright, even indoor illumination|slightly above table height|wide frame with intentional negative space|face intentionally not visible|warm wood surfaces and amber highlights",
        "mood": "subtle relief after friction",
        "camera": "slightly above table height",
        "version": "creative-identity@1",
        "lighting": "bright, even indoor illumination",
        "color_feel": "warm wood surfaces and amber highlights",
        "option_ids": {
          "mood": "relieved",
          "camera": "slightly_above_table",
          "lighting": "bright_even_indoor",
          "color_feel": "warm_wood",
          "composition": "wide_negative_space",
          "environment": "maker_workbench",
          "human_presence": "face_not_visible"
        },
        "composition": "wide frame with intentional negative space",
        "environment": "a maker workbench with tools and materials",
        "human_presence": "face intentionally not visible"
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
      "target_visual_beat_count": 5,
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
          "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
          "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
          "motifs": [
            "meeting",
            "person_alone"
          ],
          "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
          "typed_cta": false,
          "scene_types": [
            "IMAGE",
            "IMAGE",
            "IMAGE",
            "IMAGE"
          ],
          "creative_mode": null,
          "visual_medium": "CLEAN_ILLUSTRATION",
          "meaning_carrier": "object",
          "cta_composition_id": null,
          "dominant_subject_motif": "meeting",
          "product_reveal_strategy": "FRAMED_ASSET"
        },
        {
          "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
          "topic": "One script. One minute. Your website stops going silent after hours.",
          "motifs": [],
          "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
          "typed_cta": false,
          "scene_types": [
            "IMAGE",
            "IMAGE",
            "IMAGE",
            "IMAGE"
          ],
          "creative_mode": null,
          "visual_medium": "SOFT_3D",
          "meaning_carrier": "place",
          "cta_composition_id": null,
          "dominant_subject_motif": null,
          "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
        },
        {
          "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
          "topic": "Tonight, your website could already be capturing the leads it's currently losing",
          "motifs": [
            "phone",
            "desk",
            "office",
            "whiteboard",
            "sticky_notes",
            "close_up",
            "monitor",
            "home_office"
          ],
          "closing": null,
          "typed_cta": false,
          "scene_types": [],
          "creative_mode": null,
          "visual_medium": null,
          "meaning_carrier": null,
          "cta_composition_id": null,
          "dominant_subject_motif": "phone",
          "product_reveal_strategy": null
        },
        {
          "hook": "Every morning you check your inbox — but you never check what your website said no to overnight.",
          "topic": "You can see your chatbot working before you sign up for anything",
          "motifs": [
            "laptop",
            "phone",
            "desk",
            "office",
            "close_up",
            "product_asset"
          ],
          "closing": null,
          "typed_cta": false,
          "scene_types": [],
          "creative_mode": null,
          "visual_medium": null,
          "meaning_carrier": null,
          "cta_composition_id": null,
          "dominant_subject_motif": "laptop",
          "product_reveal_strategy": null
        },
        {
          "hook": "You keep saying you'll build a chatbot — and every week you don't, a real visitor leaves your site with nothing.",
          "topic": "The difference between a website that collects traffic and one that captures leads",
          "motifs": [
            "laptop",
            "desk",
            "office",
            "group",
            "close_up",
            "overhead"
          ],
          "closing": null,
          "typed_cta": false,
          "scene_types": [],
          "creative_mode": null,
          "visual_medium": null,
          "meaning_carrier": null,
          "cta_composition_id": null,
          "dominant_subject_motif": "laptop",
          "product_reveal_strategy": null
        },
        {
          "hook": "A law firm can be set up in under a minute to answer client questions — and most still aren't.",
          "topic": "How a law firm could have kept that 11 PM visitor from leaving empty-handed",
          "motifs": [
            "laptop",
            "phone",
            "desk",
            "close_up"
          ],
          "closing": null,
          "typed_cta": false,
          "scene_types": [],
          "creative_mode": null,
          "visual_medium": null,
          "meaning_carrier": null,
          "cta_composition_id": null,
          "dominant_subject_motif": "laptop",
          "product_reveal_strategy": null
        }
      ]
    }
  }
}
```

#### Scene-by-scene

| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |
| ---: | --- | --- | --- | --- | --- |
| 1 | scene-1 | IMAGE | image@1 | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b072e3a5-06b0-4cc2-9e39-cd6983c8cc27/scene-scene-1.png` | — |
| 2 | scene-2 | IMAGE | image@1 | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b072e3a5-06b0-4cc2-9e39-cd6983c8cc27/scene-scene-2.png` | — |
| 3 | scene-3 | IMAGE | image@1 | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b072e3a5-06b0-4cc2-9e39-cd6983c8cc27/scene-scene-3.png` | — |
| 4 | scene-4 | IMAGE | image@1 | `project-assets/aabab9ff-9db4-4012-a53c-135e3bfea6cd/source/7e250d64-ddcf-4649-921f-783d294a2b5b/component-capture.png` | — |

**Scene 1 (scene-1) — image_prompt (job input)**

```
Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. A wide maker workbench shot from slightly above table height, warm wood surface under bright even indoor light, amber highlights on the grain. An open logbook lies at center — its pages filled with neat tally rows, the final column conspicuously blank and empty. Ruler, pencil, and a small cup of tools sit at the edges of the wide frame with intentional negative space on either side. No readable text, no labels, no UI elements. Mood: quiet, slightly unsettling absence. Color feel: warm amber and natural wood tones.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. A wide maker workbench shot from slightly above table height, warm wood surface under bright even indoor light, amber highlights on the grain. An open logbook lies at center — its pages filled with neat tally rows, the final column conspicuously blank and empty. Ruler, pencil, and a small cup of tools sit at the edges of the wide frame with intentional negative space on either side. No readable text, no labels, no UI elements. Mood: quiet, slightly unsettling absence. Color feel: warm amber and natural wood tones."
  }
}
```
**Scene 2 (scene-2) — image_prompt (job input)**

```
Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. Wide maker workbench, slightly above table height, bright even indoor light, warm wood surface. A large ruled sheet of paper lies flat at center — rows of small filled dots representing visitor sessions, the vast majority crossed out with a single diagonal stroke, none circled or highlighted. A pencil rests beside it. Wide frame, intentional negative space around the sheet. No readable text, no numbers, no labels. Mood: the visual weight of missed opportunity. Color feel: warm amber and cream paper tones.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. Wide maker workbench, slightly above table height, bright even indoor light, warm wood surface. A large ruled sheet of paper lies flat at center — rows of small filled dots representing visitor sessions, the vast majority crossed out with a single diagonal stroke, none circled or highlighted. A pencil rests beside it. Wide frame, intentional negative space around the sheet. No readable text, no numbers, no labels. Mood: the visual weight of missed opportunity. Color feel: warm amber and cream paper tones."
  }
}
```
**Scene 3 (scene-3) — image_prompt (job input)**

```
Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. Wide maker workbench from slightly above table height, bright even indoor light, amber highlights on warm wood. A blueprint or project plan is pinned flat to the surface — its timeline bar crossed out with a bold X, tools (a ruler, compass, folded measuring tape) laid out around it but clearly untouched and unused. Wide frame with intentional negative space on either side. No readable text, no labels, no UI. Mood: a plan that never launched — friction and stall. Color feel: warm amber, cream blueprint tones, muted blue-grey for the crossed-out timeline.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame, subject centered with natural headroom and footroom. Wide maker workbench from slightly above table height, bright even indoor light, amber highlights on warm wood. A blueprint or project plan is pinned flat to the surface — its timeline bar crossed out with a bold X, tools (a ruler, compass, folded measuring tape) laid out around it but clearly untouched and unused. Wide frame with intentional negative space on either side. No readable text, no labels, no UI. Mood: a plan that never launched — friction and stall. Color feel: warm amber, cream blueprint tones, muted blue-grey for the crossed-out timeline."
  }
}
```
**Scene 4 (scene-4) — image_prompt (job input)**

```
Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–20); place it centered within a clean laptop mockup positioned on the warm wood workbench surface — bright even indoor light, wide frame, amber highlights — do not crop fullscreen; the laptop sits naturally as a prop on the workbench with intentional negative space around it.
```

```json
{
  "media": {
    "modify": "false",
    "source": "asset",
    "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–20); place it centered within a clean laptop mockup positioned on the warm wood workbench surface — bright even indoor light, wide frame, amber highlights — do not crop fullscreen; the laptop sits naturally as a prop on the workbench with intentional negative space around it.",
    "asset_id": "7e250d64-ddcf-4649-921f-783d294a2b5b",
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

Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: natural, curious, conversational. Delivery: warm, intimate, conversational storytelling pace. Delivery: confident, concise, not aggressive. Language: en.


- **voiceover characters:** 372
- **estimated words:** 64
- **audio_duration (debug):** 24.564
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
| beat-1 | scene-1 | EXPLAIN | drift_down | LOW |
| beat-2 | scene-2 | EXPLAIN | drift_up | LOW |
| beat-3 | scene-3 | REVEAL | zoom_out | LOW |
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

- **MP4:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b072e3a5-06b0-4cc2-9e39-cd6983c8cc27/output.mp4
- **thumbnail:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b072e3a5-06b0-4cc2-9e39-cd6983c8cc27/thumbnail.png
- **subtitles:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b072e3a5-06b0-4cc2-9e39-cd6983c8cc27/subtitles.srt
- **video_duration:** 24.566667
- **subtitle_source:** whisper
- **render_warning:** false

#### Admin links (paths, no signed tokens)

- Production: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/production`
- Review: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/review`
- Content packages: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/content-packages`
- Videos / scene editor: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/videos`
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 4 — The car dealership that lost a weekend's worth of buyers and never knew it

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `9fe1a31e-0142-477f-907a-6ee079fd8f00` |
| strategy_item_id | `fb7dd0cc-466d-4640-a370-14cfa992fa16` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | problem_aware |
| created_at | 2026-07-16T23:12:56.568317+00:00 |
| updated_at | 2026-07-16T23:27:07.260427+00:00 |
| primary content_item_id | `4b551ab1-99a7-4c74-af0d-243afcb3faf4` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** The car dealership that lost a weekend's worth of buyers and never knew it
- **angle:** Dramatize a holiday weekend scenario: the lot is closed, the sales team is off, and a wave of online visitors with real purchase intent can't get answers about availability or financing — and move on to a competitor who could respond.
- **package_index:** 2
- **platform:** tiktok
- **format:** reel
- **priority:** 3
- **funnel_stage (column):** problem_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "Dramatize a holiday weekend scenario: the lot is closed, the sales team is off, and a wave of online visitors with real purchase intent can't get answers about availability or financing — and move on to a competitor who could respond.",
  "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
  "source": "production_run",
  "package_index": 2,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.


**voiceover_text:**

Most dealers assume a holiday weekend is a win — traffic spikes, interest is high. But here's what actually happened: buyers landed on the site, asked about financing and availability, got silence, and went to the competitor who answered. The lot didn't lose a sale. The website did. One chatbot. Answers every question, captures every lead — even when the team is off. Create your AI assistant.


**subtitles:**

Lot full of cars. Sales team off. Website flooded with buyers — every one left without a word. // Most dealers think a holiday weekend is a win. // Here's what actually happened: // buyers asked about financing, got silence, moved on. // The lot didn't lose the sale. The website did. // One chatbot. Answers questions. Captures leads. Even when you're off. // Create your AI assistant.


**video concept:**

Contrarian beat structure. Open on a sharp contrast — the assumption that a busy holiday weekend is good for business vs the reality that every unanswered website visitor walked straight to a competitor. The story is told through the lens of social-judgment and reputation risk: not just lost revenue, but the silent, invisible damage of being the dealership that couldn't respond. The twist lands when we reveal it wasn't the lot or the team that failed — it was the website. The payoff is the fix: one AI assistant that captures leads around the clock, no staff required.


**video script:**

BEAT 1 — COMMON BELIEF (0–5s): Wide shot of a car dealership lot on a sunny holiday weekend. Rows of vehicles, flags in the breeze, empty of staff. Voiceover: 'Most dealers assume a holiday weekend is a win — traffic spikes, interest is high.' // BEAT 2 — WHY WRONG / TWIST (5–13s): Cut to a quiet co-working space, a laptop open showing a website analytics dashboard with a spike in visitors and zero conversions. Voiceover: 'But here's what actually happened: buyers landed on the site, asked about financing and availability, got silence, and went to the competitor who answered.' // BEAT 3 — PROOF / PAYOFF (13–20s): Cut to a calm, bright interior — a single laptop on a clean desk with a visible chatbot conversation on screen, warm daylight. Voiceover: 'The lot didn't lose a sale. The website did. One chatbot. Answers every question, captures every lead — even when the team is off.' // BEAT 4 — CTA (20–24s): Clean branded close. Voiceover: 'Create your AI assistant.'


**duration_seconds (brief):** 22–25

**CTA:** Create your AI assistant (type: sign_up)

**creative_mode:** 

**hashtags:** ["#AIchatbot","#leadgeneration","#cardealership","#smallbusiness","#websiteconversion","#24x7support","#fenrikchat"]


#### Full platform copy

##### x

```json
{
  "cta": "Create your AI assistant at https://fenrik.chat",
  "format": "X post",
  "caption": "Holiday weekend. Lot full of cars. Sales team off. Website flooded with buyers asking about financing — and every one left without a reply. The lot was fine. The website cost them the sale.",
  "hashtags": [
    "#leadgeneration",
    "#AIchatbot"
  ],
  "title_variants": [
    "The dealership lost a weekend of buyers — and the lot had nothing to do with it",
    "Holiday weekend = traffic spike. For most dealers, it's also a silent lead graveyard.",
    "Buyers asked. Website said nothing. Competitor answered. That's the whole story.",
    "The assumption that kills holiday weekend leads at car dealerships",
    "Your website's silence over a long weekend isn't a minor gap — it's a reputation event"
  ],
  "caption_variants": [
    "Holiday weekend. Lot full of cars. Sales team off. Website flooded with buyers asking about financing — and every one left without a reply. The lot was fine. The website cost them the sale.",
    "Most dealers assume a holiday traffic spike is good news. It is — for the competitor whose website actually answered the questions yours couldn't. One AI assistant. Captures every lead. Works when you don't. fenrik.chat #leadgeneration #AIchatbot",
    "Buyers don't wait. They ask a question, get silence, and move on in under 60 seconds. A holiday weekend with no one on the website isn't a break — it's an open door for whoever can respond. fenrik.chat",
    "The car dealership didn't lose buyers because the lot was wrong or the price was off. It lost them because the website had nothing to say at 2 PM on a Saturday. That's a fixable problem. fenrik.chat #smallbusiness",
    "Hot take: the most dangerous moment for a dealership isn't a slow sales month. It's a busy holiday weekend where the website can't answer a single question. Silence at scale is a reputation risk. fenrik.chat"
  ]
}
```
##### tiktok

```json
{
  "cta": "Don't let your website go silent when it matters most — link in bio to create your AI assistant.",
  "format": "Vertical short (TikTok / Reels / Shorts)",
  "caption": "Holiday weekend. Lot full of cars. Sales team off. Website got flooded with buyers asking about financing — and every single one left without a reply. That's not a slow weekend. That's a reputation problem you didn't see coming.",
  "hashtags": [
    "#cardealership",
    "#leadgeneration",
    "#smallbusiness",
    "#AIchatbot"
  ]
}
```
##### youtube

```json
{
  "cta": "Create your AI assistant at https://fenrik.chat — no coding required, preview before you sign up.",
  "format": "YouTube Shorts (vertical)",
  "caption": "A car dealership lot full of vehicles, a holiday weekend, and a sales team that's off — sounds like a good problem to have. But while the team rested, buyers flooded the website asking about financing and availability. No one answered. Every one of them moved on to a competitor who could. This video breaks down why a busy weekend can quietly become your worst lead-generation day — and what one AI assistant changes about that equation. No developer needed, no training required. Your website starts answering the moment you add one embed script.",
  "hashtags": [
    "#AIchatbot",
    "#leadgeneration",
    "#cardealership",
    "#websiteconversion",
    "#smallbusiness"
  ]
}
```
##### linkedin

```json
{
  "cta": "If this sounds familiar, it's worth asking what your website does when no one's watching. Fenrik.chat — create your AI assistant: https://fenrik.chat",
  "format": "LinkedIn post",
  "caption": "A car dealership with a full lot, a holiday weekend, and a wave of online buyers — sounds like an opportunity. It was. Just not for them. While the sales team was off, visitors landed on the website asking about financing options and vehicle availability. No one responded. They moved on to a competitor who had an answer ready. The lot didn't lose those buyers. The website did. If your site can't respond when your team can't, you're not just losing leads — you're quietly handing them to whoever can.",
  "hashtags": [
    "#leadgeneration",
    "#AIchatbot",
    "#smallbusiness"
  ],
  "title_variants": [
    "The car dealership that lost a weekend's worth of buyers — and never saw it coming",
    "Your website's silence over a holiday weekend is a reputation problem, not just a revenue one"
  ],
  "caption_variants": [
    "A car dealership with a full lot, a holiday weekend, and a wave of online buyers — sounds like an opportunity. It was. Just not for them. While the sales team was off, visitors landed on the website asking about financing options and vehicle availability. No one responded. They moved on to a competitor who had an answer ready. The lot didn't lose those buyers. The website did. If your site can't respond when your team can't, you're not just losing leads — you're quietly handing them to whoever can.",
    "Most business owners think a holiday weekend is a good sign — traffic up, interest high. Here's the part the analytics don't show: every visitor who asked a question and got silence. Every buyer who compared you to a competitor and chose the one who answered. A car dealership doesn't lose a sale at the lot. It loses it on the website, hours before anyone checks the inbox. One AI assistant changes that. It answers questions, captures leads, and keeps working when your team doesn't. That's not a technical project — it takes about a minute to set up."
  ]
}
```
##### instagram

```json
{
  "cta": "Create your AI assistant — link in bio.",
  "format": "Vertical short (Instagram Reels)",
  "caption": "A holiday weekend looks like a win on paper — traffic up, interest high, lot full of inventory. But here's what your analytics don't show: every visitor who asked a question and got nothing back. Every buyer who moved on to the dealer who could actually respond. 🚗 Your website doesn't have to go silent when your team does.",
  "hashtags": [
    "#cardealership",
    "#automotivebusiness",
    "#leadgeneration",
    "#AIchatbot",
    "#smallbusiness",
    "#websiteconversion",
    "#24x7support",
    "#businessgrowth",
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
      "image_prompt": "Portrait 9:16 vertical frame. A wide, symmetrical view of a car dealership outdoor lot on a bright holiday weekend afternoon — rows of vehicles stretching back, colorful promotional flags catching a light breeze, no staff visible anywhere on the lot. The scene is bathed in overcast diffused daylight with warm neutral tones. The lot feels full of inventory and completely unattended. Slightly above ground-level camera angle, calm and observational composition. No readable signage, no text, no people. Photorealistic photographic style."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical frame. A bright co-working space in daylight. A laptop sits open on a clean desk, screen facing the viewer at a three-quarter angle — the display shows a website analytics graph with a sharp spike in visitor traffic but a flat, near-zero conversion line. The contrast between the high traffic and the empty result is the visual story. Overcast diffused daylight, warm neutral color feel, symmetrical calm composition. No readable text or labels on the screen — only the shape and color contrast of the graph lines. Implied human presence just off-screen. Photorealistic photographic style."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical frame. A bright co-working space interior in daylight. A competitor's storefront or workspace visible through a large window in the background — warm light, active and open. In the foreground, a person's hand rests on a keyboard at a desk, a laptop open in front of them showing a chat interface with active conversation bubbles — the screen is visually active with a back-and-forth exchange, no readable words, just the structure of a live dialogue. The mood is alert and engaged. Overcast diffused daylight, warm neutral palette, symmetrical composition. Photorealistic photographic style."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled toward the viewer showing a clean chat interface with a chatbot conversation in progress — structured bubbles, no readable text, visually active. A small notepad with a pen rests beside the laptop, suggesting captured information. The scene communicates: leads being collected automatically, no person required. Overcast diffused daylight, warm neutral tones, symmetrical composition, slightly above table height. Photorealistic photographic style."
    }
  ],
  "image_prompts": [
    "Portrait 9:16 vertical frame. A wide, symmetrical view of a car dealership outdoor lot on a bright holiday weekend afternoon — rows of vehicles stretching back, colorful promotional flags catching a light breeze, no staff visible anywhere on the lot. The scene is bathed in overcast diffused daylight with warm neutral tones. The lot feels full of inventory and completely unattended. Slightly above ground-level camera angle, calm and observational composition. No readable signage, no text, no people. Photorealistic photographic style.",
    "Portrait 9:16 vertical frame. A bright co-working space in daylight. A laptop sits open on a clean desk, screen facing the viewer at a three-quarter angle — the display shows a website analytics graph with a sharp spike in visitor traffic but a flat, near-zero conversion line. The contrast between the high traffic and the empty result is the visual story. Overcast diffused daylight, warm neutral color feel, symmetrical calm composition. No readable text or labels on the screen — only the shape and color contrast of the graph lines. Implied human presence just off-screen. Photorealistic photographic style.",
    "Portrait 9:16 vertical frame. A bright co-working space interior in daylight. A competitor's storefront or workspace visible through a large window in the background — warm light, active and open. In the foreground, a person's hand rests on a keyboard at a desk, a laptop open in front of them showing a chat interface with active conversation bubbles — the screen is visually active with a back-and-forth exchange, no readable words, just the structure of a live dialogue. The mood is alert and engaged. Overcast diffused daylight, warm neutral palette, symmetrical composition. Photorealistic photographic style.",
    "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled toward the viewer showing a clean chat interface with a chatbot conversation in progress — structured bubbles, no readable text, visually active. A small notepad with a pen rests beside the laptop, suggesting captured information. The scene communicates: leads being collected automatically, no person required. Overcast diffused daylight, warm neutral tones, symmetrical composition, slightly above table height. Photorealistic photographic style."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "shimmer",
    "package_id": "9fe1a31e-0142-477f-907a-6ee079fd8f00",
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
        "story_prefers_outcome_over_framed:place",
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
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: measured, credible. Language: en.",
    "visual_narrative": {
      "key": "place|a location that belongs to this product's world (not a default tech office)",
      "version": "visual-narrative@1",
      "subject_focus": "a location that belongs to this product's world (not a default tech office)",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "desk": 5,
        "group": 2,
        "phone": 3,
        "laptop": 5,
        "office": 4,
        "founder": 1,
        "meeting": 2,
        "monitor": 1,
        "close_up": 5,
        "overhead": 1,
        "dashboard": 1,
        "prototype": 1,
        "whiteboard": 1,
        "home_office": 1,
        "person_alone": 1,
        "sticky_notes": 1,
        "product_asset": 2
      },
      "supporting_carriers": [
        "object",
        "human",
        "metaphor"
      ],
      "primary_meaning_carrier": "place"
    },
    "creative_identity": {
      "key": "a bright co-working space in daylight|curious, alert attention|overcast diffused daylight|slightly above table height|symmetrical, calm composition|implied human presence just off-screen|warm neutral color feel",
      "mood": "curious, alert attention",
      "camera": "slightly above table height",
      "version": "creative-identity@1",
      "lighting": "overcast diffused daylight",
      "color_feel": "warm neutral color feel",
      "option_ids": {
        "mood": "curious",
        "camera": "slightly_above_table",
        "lighting": "overcast_diffused",
        "color_feel": "warm_neutral",
        "composition": "symmetrical_calm",
        "environment": "co_working_daylight",
        "human_presence": "implied_offscreen"
      },
      "composition": "symmetrical, calm composition",
      "environment": "a bright co-working space in daylight",
      "human_presence": "implied human presence just off-screen"
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
      "SOFT_3D": 2,
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
      "PHOTOGRAPHIC:carrier_place(+2)"
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
        "hook": "The busiest moment for your website is the one you're never around to see.",
        "topic": "Your business is closed — but your website is still getting visitors right now",
        "motifs": [
          "dashboard",
          "founder",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "dashboard",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
        "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
        "motifs": [
          "meeting",
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "meeting",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
        "topic": "One script. One minute. Your website stops going silent after hours.",
        "motifs": [],
        "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": null,
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
      },
      {
        "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
        "topic": "Tonight, your website could already be capturing the leads it's currently losing",
        "motifs": [
          "phone",
          "desk",
          "office",
          "whiteboard",
          "sticky_notes",
          "close_up",
          "monitor",
          "home_office"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": null
      },
      {
        "hook": "Every morning you check your inbox — but you never check what your website said no to overnight.",
        "topic": "You can see your chatbot working before you sign up for anything",
        "motifs": [
          "laptop",
          "phone",
          "desk",
          "office",
          "close_up",
          "product_asset"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
      },
      {
        "hook": "You keep saying you'll build a chatbot — and every week you don't, a real visitor leaves your site with nothing.",
        "topic": "The difference between a website that collects traffic and one that captures leads",
        "motifs": [
          "laptop",
          "desk",
          "office",
          "group",
          "close_up",
          "overhead"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
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
- **voiceover characters:** 395
- **estimated words:** 67
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
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 5 — The Irony of Knowing Everything and Saying Nothing

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `c998a760-add3-4d46-a580-69256f7d9826` |
| strategy_item_id | `0456f8f4-fa43-40af-8b6c-17f1851071fd` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | problem_aware |
| created_at | 2026-07-16T23:14:00.592819+00:00 |
| updated_at | 2026-07-16T23:32:09.304693+00:00 |
| primary content_item_id | `a673c624-8dce-4622-9d8c-c3a5f5dcc227` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** Repeating yourself every single day — and still not being available when it counts
- **angle:** If you answer the same five questions over and over by phone and email, your website already knows the answers. But it says nothing. Expose the irony: the information exists, the visitors arrive, and zero connection is made.
- **package_index:** 3
- **platform:** tiktok
- **format:** reel
- **priority:** 4
- **funnel_stage (column):** problem_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "If you answer the same five questions over and over by phone and email, your website already knows the answers. But it says nothing. Expose the irony: the information exists, the visitors arrive, and zero connection is made.",
  "topic": "Repeating yourself every single day — and still not being available when it counts",
  "source": "production_run",
  "package_index": 3,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.


**voiceover_text:**

I've answered the same five questions so many times I could recite them in my sleep. Pricing. Availability. How it works. Same five. Every day. But here's what nobody talks about: your website already has every single answer. It just refuses to say them. Visitors arrive, read nothing useful, and leave. The information exists. The connection never happens. That's not a content problem. That's a setup problem.


**subtitles:**

I've answered the same five questions so many times I could recite them in my sleep. | Pricing. Availability. How it works. Same five. Every day. | But your website already has every single answer. | It just refuses to say them. | Visitors arrive, read nothing useful, and leave. | The information exists. The connection never happens. | That's not a content problem. That's a setup problem.


**video concept:**

A fast-paced vertical short built around the painful irony of a business owner who answers the same questions daily by phone and email — while their website, which contains every answer, says nothing to the visitors who need them most. The visual world uses blueprint-schematic aesthetics and workflow artifacts: stacked notes, printed FAQs, annotated cards — objects that hold information but are never activated. The twist: the knowledge already exists. The failure is in the setup, not the content. The payoff reframes the entire pain as a solvable structure problem, not a resource problem.


**video script:**

BEAT 1 — OBSERVATION (0–5s): Open on a dense stack of handwritten sticky notes and printed FAQ sheets arranged on a bright co-working surface — every common question documented, annotated, answered. Voiceover: 'I've answered the same five questions so many times I could recite them in my sleep.' BEAT 2 — MEANING (5–12s): Cut to a blueprint-style schematic diagram of a website structure — pages, links, content blocks — all drawn out but with a gap where the visitor interaction should be. Voiceover: 'But your website already has every single answer. It just refuses to say them.' BEAT 3 — REVEAL / TWIST (12–19s): Cut to a close detail of a single printed FAQ card sitting alone on the surface — pristine, complete, untouched — beside an empty visitor inquiry slip with no name on it. Voiceover: 'Visitors arrive, read nothing useful, and leave. The information exists. The connection never happens.' BEAT 4 — PAYOFF / CTA (19–24s): Wide vertical frame of the same co-working surface, now with the FAQ card visually connected by a drawn schematic line to a response card — a simple, resolved diagram. Voiceover: 'That's not a content problem. That's a setup problem. Create your AI assistant at fenrik.chat.'


**duration_seconds (brief):** 24

**CTA:** Create your AI assistant (type: sign_up)

**creative_mode:** 

**hashtags:** ["#aichatbot","#smallbusiness","#leadgeneration","#websitetips","#businessautomation","#customerservice","#digitalmarketing","#fenrikchat"]


#### Full platform copy

##### x

```json
{
  "cta": "Create your AI assistant at https://fenrik.chat",
  "format": "Short-form post with video",
  "caption": "You answer the same 5 questions every day. Your website has every answer. Visitors arrive, find nothing, leave. That's not a content problem. That's a setup problem.",
  "hashtags": [
    "#aichatbot",
    "#smallbusiness"
  ],
  "title_variants": [
    "The Irony of Knowing Everything and Saying Nothing",
    "Your Website Has the Answers. It Just Won't Give Them.",
    "Why Repeating Yourself Every Day Still Isn't Enough",
    "The Setup Problem Nobody Talks About",
    "All the Right Answers, Zero Connections Made"
  ],
  "caption_variants": [
    "You answer the same 5 questions every day. Your website has every answer. Visitors arrive, find nothing, leave. That's not a content problem. That's a setup problem.",
    "Your website isn't missing information. It's missing a voice. Every answer is there — pricing, availability, how it works. And every visitor who needs them leaves in silence.",
    "Imagine writing out every FAQ, publishing it on your site, and still losing every after-hours visitor who had that exact question. That's not a content gap. That's a connection gap.",
    "The questions don't change. You answer them daily. Your website never does. At some point that stops being a workload issue and starts being a structural one.",
    "Hot take: most websites don't have a content problem. They have a response problem. The answers are already there — they just never reach the person asking."
  ]
}
```
##### tiktok

```json
{
  "cta": "Create your AI assistant — link in bio",
  "format": "Vertical Short (9:16) — 24s",
  "caption": "You've answered the same five questions a thousand times. Your website has answered zero of them. That's not a content problem. That's a setup problem.",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#chatbot",
    "#leadgeneration"
  ]
}
```
##### youtube

```json
{
  "cta": "Create your AI assistant at https://fenrik.chat — preview it live, no registration needed.",
  "format": "YouTube Short (9:16) — 24s",
  "caption": "You answer the same five questions every single day — by phone, by email, in person. Your website has every answer written on it. And yet it says nothing to the visitors who need them most. This video exposes the real reason businesses lose leads: not missing content, but a missing connection between what they know and what their site actually does. Fenrik.chat creates an AI assistant from your existing website in about one minute — no developer, no training, no complexity. See it work before you sign up at https://fenrik.chat.",
  "hashtags": [
    "#aichatbot",
    "#websiteoptimization",
    "#leadgeneration",
    "#smallbusiness",
    "#fenrikchat"
  ]
}
```
##### linkedin

```json
{
  "cta": "What question does your website get asked most — and does it actually answer it? Drop it in the comments.",
  "format": "Text post with video attachment",
  "caption": "There is a specific kind of inefficiency that most businesses never name: you answer the same five questions every day by phone and email, your website contains every answer, and yet visitors arrive after hours, find nothing interactive, and leave without a trace. The information exists. The connection does not. This is not a content problem — it is a structural one. The setup is missing. If your website already holds the answers, the only remaining question is whether it is allowed to say them.",
  "hashtags": [
    "#websitestrategy",
    "#leadgeneration",
    "#aiforbusiness"
  ]
}
```
##### instagram

```json
{
  "cta": "Create your AI assistant → link in bio",
  "format": "Vertical Reel (9:16) — 24s",
  "caption": "You know your most common questions by heart. You've written the answers on your website. And still — every visitor who arrives after hours leaves without a reply. 🤔 The information is there. The connection isn't. That gap is where leads disappear. Your website can do more than hold the answers — it can actually say them.",
  "hashtags": [
    "#websitegrowth",
    "#smallbusinesstips",
    "#aichatbot",
    "#leadgeneration",
    "#businessautomation",
    "#customerservice",
    "#digitalmarketing",
    "#smbtips",
    "#websitetips",
    "#onlinebusiness"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame, centered subject with generous vertical headroom. A bright co-working space in daylight, soft natural window light, warm neutral color feel, quiet optimism. No people visible. Close detail on a dense stack of handwritten sticky notes and printed FAQ sheets arranged on a clean pale surface — every note covered in structured annotations and recurring question marks, overlapping layers suggesting the same questions answered repeatedly. Objects fill the lower two-thirds of the frame with open space above. Blueprint overlay lines trace faint structural grids across the surface. No readable text, no legible words or letters, no UI elements."
    },
    {
      "source": "ai",
      "image_prompt": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame, centered subject with generous vertical headroom. A bright co-working space in daylight, soft natural window light, warm neutral color feel, quiet optimism. No people visible. A schematic diagram of a website architecture drawn in blueprint style — rectangular content blocks connected by lines representing pages and navigation paths, rendered as a structural floor plan or technical drawing on a pale surface. One section of the diagram shows a clear gap or break in the connection path where visitor interaction should occur — visually suggesting a missing link in an otherwise complete system. No readable text, no legible labels, no UI."
    },
    {
      "source": "ai",
      "image_prompt": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame, centered subject with generous vertical headroom. A bright co-working space in daylight, soft natural window light, warm neutral color feel, quiet optimism. No people visible. Extreme close detail on a single printed FAQ card lying flat on a clean pale surface — pristine, complete, untouched — beside a blank inquiry slip with no writing on it, the two objects physically separate with a visible gap between them. Blueprint schematic lines trace the surface around both objects, highlighting the physical distance. The contrast between the complete card and the empty slip is the visual tension. No readable text, no legible words, no UI."
    },
    {
      "source": "ai",
      "image_prompt": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame, centered subject with generous vertical headroom. A bright co-working space in daylight, soft natural window light, warm neutral color feel, quiet optimism. No people visible. Wide vertical view of a clean co-working surface in daylight — the same FAQ card and response card from the previous beat now visually connected by a single bold schematic line drawn between them, resolving the gap. The diagram feels complete and intentional, a structural problem solved. Blueprint grid lines frame the composition with calm precision. Objects centered in the lower half of the frame, generous open space above. No readable text, no legible labels, no UI."
    }
  ],
  "image_prompts": [
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame, centered subject with generous vertical headroom. A bright co-working space in daylight, soft natural window light, warm neutral color feel, quiet optimism. No people visible. Close detail on a dense stack of handwritten sticky notes and printed FAQ sheets arranged on a clean pale surface — every note covered in structured annotations and recurring question marks, overlapping layers suggesting the same questions answered repeatedly. Objects fill the lower two-thirds of the frame with open space above. Blueprint overlay lines trace faint structural grids across the surface. No readable text, no legible words or letters, no UI elements.",
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame, centered subject with generous vertical headroom. A bright co-working space in daylight, soft natural window light, warm neutral color feel, quiet optimism. No people visible. A schematic diagram of a website architecture drawn in blueprint style — rectangular content blocks connected by lines representing pages and navigation paths, rendered as a structural floor plan or technical drawing on a pale surface. One section of the diagram shows a clear gap or break in the connection path where visitor interaction should occur — visually suggesting a missing link in an otherwise complete system. No readable text, no legible labels, no UI.",
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame, centered subject with generous vertical headroom. A bright co-working space in daylight, soft natural window light, warm neutral color feel, quiet optimism. No people visible. Extreme close detail on a single printed FAQ card lying flat on a clean pale surface — pristine, complete, untouched — beside a blank inquiry slip with no writing on it, the two objects physically separate with a visible gap between them. Blueprint schematic lines trace the surface around both objects, highlighting the physical distance. The contrast between the complete card and the empty slip is the visual tension. No readable text, no legible words, no UI.",
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame, centered subject with generous vertical headroom. A bright co-working space in daylight, soft natural window light, warm neutral color feel, quiet optimism. No people visible. Wide vertical view of a clean co-working surface in daylight — the same FAQ card and response card from the previous beat now visually connected by a single bold schematic line drawn between them, resolving the gap. The diagram feels complete and intentional, a structural problem solved. Blueprint grid lines frame the composition with calm precision. Objects centered in the lower half of the frame, generous open space above. No readable text, no legible labels, no UI."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "shimmer",
    "package_id": "c998a760-add3-4d46-a580-69256f7d9826",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 46,
      "secondary": 56
    },
    "voice_source": "package_secondary",
    "visual_medium": "TECHNICAL_BLUEPRINT",
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
        "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "FRAMED_ASSET",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "shimmer",
    "visual_profile": "NATURAL",
    "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: thoughtful, reflective, steady pacing. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: thoughtful, reflective, steady pacing. Delivery: confident, concise, not aggressive. Language: en.",
    "visual_narrative": {
      "key": "object|workflow artifacts: notes, cards, printouts, boards, inbox piles, tools of the trade",
      "version": "visual-narrative@1",
      "subject_focus": "workflow artifacts: notes, cards, printouts, boards, inbox piles, tools of the trade",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "desk": 6,
        "group": 2,
        "phone": 3,
        "laptop": 6,
        "office": 3,
        "founder": 1,
        "meeting": 1,
        "monitor": 1,
        "close_up": 4,
        "overhead": 1,
        "dashboard": 2,
        "prototype": 1,
        "whiteboard": 1,
        "home_office": 1,
        "person_alone": 1,
        "sticky_notes": 1,
        "product_asset": 3
      },
      "supporting_carriers": [
        "place",
        "process",
        "transformation"
      ],
      "primary_meaning_carrier": "object"
    },
    "creative_identity": {
      "key": "a bright co-working space in daylight|quiet optimism|soft natural window daylight|close detail on hands or objects|centered subject with generous vertical headroom|no people visible — objects and environment tell the story|warm neutral color feel",
      "mood": "quiet optimism",
      "camera": "close detail on hands or objects",
      "version": "creative-identity@1",
      "lighting": "soft natural window daylight",
      "color_feel": "warm neutral color feel",
      "option_ids": {
        "mood": "optimistic",
        "camera": "close_detail",
        "lighting": "soft_window_daylight",
        "color_feel": "warm_neutral",
        "composition": "centered_headroom",
        "environment": "co_working_daylight",
        "human_presence": "no_people"
      },
      "composition": "centered subject with generous vertical headroom",
      "environment": "a bright co-working space in daylight",
      "human_presence": "no people visible — objects and environment tell the story"
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
      "SOFT_3D": 2,
      "PHOTOGRAPHIC": 0,
      "GRAPHIC_COLLAGE": 0,
      "CLEAN_ILLUSTRATION": 5,
      "TECHNICAL_BLUEPRINT": 3
    },
    "visual_medium_source": "auto",
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_medium_reasons": [
      "SOFT_3D:digital_product(+2)",
      "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
      "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
      "TECHNICAL_BLUEPRINT:carrier_process(+1)",
      "CLEAN_ILLUSTRATION:identity_no_face(+2)",
      "TECHNICAL_BLUEPRINT:identity_objects(+1)",
      "CLEAN_ILLUSTRATION:saas_abstract(+1)",
      "TECHNICAL_BLUEPRINT:saas_system(+1)",
      "diversity:CLEAN_ILLUSTRATION→TECHNICAL_BLUEPRINT(close_score)"
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
        "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
        "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
        "motifs": [
          "laptop",
          "desk",
          "dashboard",
          "group",
          "product_asset"
        ],
        "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
      },
      {
        "hook": "The busiest moment for your website is the one you're never around to see.",
        "topic": "Your business is closed — but your website is still getting visitors right now",
        "motifs": [
          "dashboard",
          "founder",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "dashboard",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
        "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
        "motifs": [
          "meeting",
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "meeting",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
        "topic": "One script. One minute. Your website stops going silent after hours.",
        "motifs": [],
        "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": null,
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
      },
      {
        "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
        "topic": "Tonight, your website could already be capturing the leads it's currently losing",
        "motifs": [
          "phone",
          "desk",
          "office",
          "whiteboard",
          "sticky_notes",
          "close_up",
          "monitor",
          "home_office"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": null
      },
      {
        "hook": "Every morning you check your inbox — but you never check what your website said no to overnight.",
        "topic": "You can see your chatbot working before you sign up for anything",
        "motifs": [
          "laptop",
          "phone",
          "desk",
          "office",
          "close_up",
          "product_asset"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": null
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
- **voiceover characters:** 411
- **estimated words:** 67
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
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 6 — The Quiet Routine That's Costing You Leads Every Single Day

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `f1104eed-664a-4cc9-9d0b-2cdf7bb75926` |
| strategy_item_id | `d6635165-96f4-4736-8f59-f4aacffb1102` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | problem_aware |
| created_at | 2026-07-16T23:15:09.572151+00:00 |
| updated_at | 2026-07-16T23:15:11.675779+00:00 |
| primary content_item_id | `b1b2862c-9e5a-4430-a6c6-63c44e7c7b23` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** What a qualified lead actually does when your website can't answer them
- **angle:** Walk through the exact decision a prospect makes in real time: they arrive, they have a question, they find static text, they click back, and they find a competitor. No rage — just a quiet, irreversible exit that you never see in your inbox.
- **package_index:** 4
- **platform:** tiktok
- **format:** reel
- **priority:** 5
- **funnel_stage (column):** problem_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "Walk through the exact decision a prospect makes in real time: they arrive, they have a question, they find static text, they click back, and they find a competitor. No rage — just a quiet, irreversible exit that you never see in your inbox.",
  "topic": "What a qualified lead actually does when your website can't answer them",
  "source": "production_run",
  "package_index": 4,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.


**voiceover_text:**

Every morning, same routine. Open analytics. See the overnight traffic. Close the tab. What I never noticed? Those visitors had questions. Real ones. And my website just stared back at them. No answer. No capture. Nothing. They didn't rage-quit — they just quietly moved on. To someone who was ready. Your website is running that same routine right now.


**subtitles:**

Every morning, same routine. / Open analytics. See the overnight traffic. Close the tab. / Those visitors had questions. Real ones. / My website just stared back. No answer. No capture. Nothing. / They didn't rage-quit — they quietly moved on. / To someone who was ready. / Your website is running that same routine right now.


**video concept:**

A confession about a daily habit — checking analytics every morning — that turns into a slow reveal: the traffic was always there, the questions were always being asked, and the website was always silent. The twist is that the routine felt productive but was actually just documenting losses. The payoff reframes the habit: your website can be the one that answers, so the morning check finally shows something different.


**video script:**

HOOK (0–4s): Close-up of a hand reaching for a phone on a bedside table in soft morning light. Voiceover: 'I'll be honest — I check my analytics every morning like it's going to say something different.'

OBSERVATION (4–10s): A person seen from behind, standing at a window, scrolling on a phone. The street outside is quiet, early morning. Voiceover: 'Open analytics. See the overnight traffic. Close the tab. Same routine. Every day.'

MEANING (10–16s): An exterior shot of a closed storefront on an urban street — lights off, door shut, but a few pedestrians passing by and pausing to look at the window. Voiceover: 'Those visitors had questions. Real ones. And my website just stared back. No answer. No capture. Nothing.'

REVEAL (16–21s): The same street, now with one shop window lit warmly from inside — a contrast to the dark ones beside it. Voiceover: 'They didn't rage-quit — they quietly moved on. To someone who was ready.'

CTA (21–25s): Person seen from behind, phone in hand, now looking at a screen showing a calm chat interface — a soft glow on their face. Voiceover: 'Your website is running that same routine right now. Create your AI assistant — and let it answer while you sleep.'


**duration_seconds (brief):** 25

**CTA:** Create your AI assistant — and let your website answer while you sleep. (type: sign_up)

**creative_mode:** 

**hashtags:** ["#smallbusiness","#leadgeneration","#aichatbot","#websitetips","#24x7support","#digitalmarketing","#businessgrowth"]


#### Full platform copy

##### x

```json
{
  "cta": "Does your site answer questions after hours?",
  "format": "X post — terse, opinionated",
  "caption": "I checked my analytics every morning for months. Traffic overnight. No conversions. I thought it was a traffic problem. It was a silence problem. My website had nothing to say back.",
  "hashtags": [
    "#leadgeneration",
    "#smallbusiness"
  ],
  "title_variants": [
    "The Morning Analytics Habit That Hides a Bigger Problem",
    "Your Overnight Visitors Had Questions. Your Website Said Nothing.",
    "It's Not a Traffic Problem. It's a Silence Problem.",
    "Qualified Leads Don't Rage-Quit. They Just Quietly Leave.",
    "Checking Analytics Every Morning Feels Productive. It Isn't."
  ],
  "caption_variants": [
    "I checked my analytics every morning for months. Traffic overnight. No conversions. I thought it was a traffic problem. It was a silence problem. My website had nothing to say back.",
    "Your overnight visitors didn't bounce in frustration. They just found someone who answered. That's the part the analytics dashboard never shows you.",
    "The routine: open dashboard → see overnight traffic → wonder why no one converted → close tab → repeat. The missing step: your website had no answer ready for any of them.",
    "Qualified leads don't send angry emails when your site can't help them. They just click back and try the next result. You never know they were there.",
    "Checking analytics every morning feels like staying on top of things. It's actually just documenting what you already lost. The fix is upstream — before they leave."
  ]
}
```
##### tiktok

```json
{
  "cta": "Drop 'chatbot' in the comments if your site goes quiet after hours 👇",
  "format": "Vertical Short (9:16) — TikTok native",
  "caption": "I check my analytics every morning. Same traffic. Same drop-offs. Took me way too long to realize my website wasn't answering anyone overnight. It was just there. Silent. That's the whole problem.",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#leadgeneration",
    "#aitools"
  ]
}
```
##### youtube

```json
{
  "cta": "Subscribe for more on turning your website into a lead machine — and try Fenrik.chat to create your AI assistant in about a minute: https://fenrik.chat",
  "format": "Vertical Short (9:16) — YouTube Shorts",
  "caption": "You check your analytics every morning — but do you know what happened to those overnight visitors? They had questions. Your website had nothing to say. This video walks through the exact quiet exit a qualified lead makes when your site can't answer them — no drama, no rage, just a calm click to a competitor who was ready. If your business needs 24/7 support but you can't staff it, there's a simpler fix than you think. Watch to the end.",
  "hashtags": [
    "#websitechatbot",
    "#leadgeneration",
    "#smallbusiness",
    "#aichatbot",
    "#24x7support"
  ]
}
```
##### linkedin

```json
{
  "cta": "How does your website handle questions after hours? Worth a look.",
  "format": "LinkedIn text post — B2B professional tone",
  "caption": "Every morning, I opened my analytics dashboard. Traffic overnight. Drop-offs. Zero conversions. I told myself it was a traffic quality issue.\n\nIt wasn't. It was a response issue.\n\nVisitors were landing, forming real questions, finding static text — and leaving. Not frustrated. Just done. They moved to whoever answered first.\n\nThe habit of checking analytics every morning is useful. But it only shows you what already happened. The gap is what your website does while you're not watching.\n\nFor businesses that can't staff 24/7 support, that gap is where leads quietly disappear.",
  "hashtags": [
    "#LeadGeneration",
    "#CustomerExperience",
    "#SmallBusiness"
  ],
  "title_variants": [
    "The Morning Analytics Habit That Hides a Bigger Problem",
    "Your Website Is Losing Leads While You Check Your Dashboard"
  ],
  "caption_variants": [
    "Every morning, I opened my analytics dashboard. Traffic overnight. Drop-offs. Zero conversions. I told myself it was a traffic quality issue.\n\nIt wasn't. It was a response issue.\n\nVisitors were landing, forming real questions, finding static text — and leaving. Not frustrated. Just done. They moved to whoever answered first.\n\nThe habit of checking analytics every morning is useful. But it only shows you what already happened. The gap is what your website does while you're not watching.\n\nFor businesses that can't staff 24/7 support, that gap is where leads quietly disappear.",
    "There's a routine most business owners don't question: check the overnight analytics, note the visitors, move on.\n\nBut those visitors weren't just numbers. They were people with specific questions — about pricing, availability, fit. They found a page that couldn't respond. So they left.\n\nNo complaint. No abandoned cart email. Just a quiet exit you'll never trace back to a lost deal.\n\nThe businesses winning on this aren't necessarily getting more traffic. They're just ready when the traffic arrives — even at 2 AM."
  ]
}
```
##### instagram

```json
{
  "cta": "Save this if your site could use a voice after hours → link in bio to see how it works",
  "format": "Vertical Short (9:16) — Instagram Reels",
  "caption": "Every morning, same ritual. Open analytics. See the overnight visitors. Wonder why none of them converted. 🌅\n\nHere's what I kept missing: they had questions. My website had nothing to say back. No chat. No capture. Just static text and a contact form they never touched.\n\nThey didn't leave angry — they just left. Quietly. To a competitor who was ready for them.\n\nIf your website goes silent after hours, that's not a traffic problem. That's a conversation problem.",
  "hashtags": [
    "#websitetips",
    "#smallbusinessowner",
    "#leadgeneration",
    "#aichatbot",
    "#digitalmarketing",
    "#businessgrowth",
    "#customerexperience",
    "#onlinebusiness"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. Close detail on a hand reaching for a smartphone resting on a wooden surface near a window, early morning light filtering through sheer curtains, natural greens from a small plant on the windowsill visible in the foreground. The phone screen glows faintly but no readable text is visible. Gentle side lighting, natural warm tones, candid composition. Photorealistic photographic style."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing near a tall window overlooking a quiet early-morning street, scrolling on a phone held at waist height. A potted plant in the foreground frames the left edge. Overcast diffused morning light, natural greens, muted urban palette, soft shadows. The street below shows a few blurred pedestrians. Photorealistic photographic style, candid and still."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A closed shopfront at dawn — dark interior, door shut, a handwritten note on the glass door suggesting closed hours. Two or three blurred pedestrians pause briefly outside, one looking toward the window. A leafy plant in a planter beside the door frames the lower foreground. Gentle side lighting, natural greens, muted urban tones, soft shadows. Photorealistic photographic style, believable and grounded."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. The same street, but now one shop window glows warmly from within — warm amber light spilling onto the pavement — while the adjacent storefronts remain dark. A pedestrian silhouette is drawn toward the lit window. A foreground plant or door frame edges the composition. Determined, forward-leaning energy. Natural greens, gentle side lighting, soft shadows. Photorealistic photographic style."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pavement, holding a smartphone with the screen facing them — a soft warm glow illuminating their hands and the back of their jacket. A leafy plant in a pot beside a doorway frames the left foreground. The street stretches softly out of focus behind them. Gentle side lighting, natural greens, calm and resolved mood. Photorealistic photographic style."
    }
  ],
  "image_prompts": [
    "Portrait 9:16 vertical frame. Soft-focus urban street exterior. Close detail on a hand reaching for a smartphone resting on a wooden surface near a window, early morning light filtering through sheer curtains, natural greens from a small plant on the windowsill visible in the foreground. The phone screen glows faintly but no readable text is visible. Gentle side lighting, natural warm tones, candid composition. Photorealistic photographic style.",
    "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing near a tall window overlooking a quiet early-morning street, scrolling on a phone held at waist height. A potted plant in the foreground frames the left edge. Overcast diffused morning light, natural greens, muted urban palette, soft shadows. The street below shows a few blurred pedestrians. Photorealistic photographic style, candid and still.",
    "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A closed shopfront at dawn — dark interior, door shut, a handwritten note on the glass door suggesting closed hours. Two or three blurred pedestrians pause briefly outside, one looking toward the window. A leafy plant in a planter beside the door frames the lower foreground. Gentle side lighting, natural greens, muted urban tones, soft shadows. Photorealistic photographic style, believable and grounded.",
    "Portrait 9:16 vertical frame. Soft-focus urban street exterior. The same street, but now one shop window glows warmly from within — warm amber light spilling onto the pavement — while the adjacent storefronts remain dark. A pedestrian silhouette is drawn toward the lit window. A foreground plant or door frame edges the composition. Determined, forward-leaning energy. Natural greens, gentle side lighting, soft shadows. Photorealistic photographic style.",
    "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pavement, holding a smartphone with the screen facing them — a soft warm glow illuminating their hands and the back of their jacket. A leafy plant in a pot beside a doorway frames the left foreground. The street stretches softly out of focus behind them. Gentle side lighting, natural greens, calm and resolved mood. Photorealistic photographic style."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "shimmer",
    "package_id": "f1104eed-664a-4cc9-9d0b-2cdf7bb75926",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 46,
      "secondary": 56
    },
    "voice_source": "package_secondary",
    "visual_medium": "PHOTOGRAPHIC",
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
        "story_prefers_outcome_over_framed:place",
        "fallback:product_outcome"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "PRODUCT_OUTCOME",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "shimmer",
    "visual_profile": "NATURAL",
    "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: thoughtful, reflective, steady pacing. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: thoughtful, reflective, steady pacing. Delivery: confident, concise, not aggressive. Language: en.",
    "visual_narrative": {
      "key": "place|a room or corner whose order/disorder carries meaning",
      "version": "visual-narrative@1",
      "subject_focus": "a room or corner whose order/disorder carries meaning",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "desk": 5,
        "group": 2,
        "phone": 2,
        "laptop": 5,
        "office": 3,
        "founder": 1,
        "meeting": 1,
        "monitor": 1,
        "close_up": 4,
        "overhead": 1,
        "dashboard": 2,
        "prototype": 3,
        "whiteboard": 1,
        "home_office": 1,
        "person_alone": 1,
        "sticky_notes": 2,
        "product_asset": 3
      },
      "supporting_carriers": [
        "object",
        "human",
        "metaphor"
      ],
      "primary_meaning_carrier": "place"
    },
    "creative_identity": {
      "key": "a soft-focus urban street exterior|determined, forward-leaning energy|gentle side lighting with soft shadows|close detail on hands or objects|foreground framing element (door, shelf, plant)|person seen from behind or as silhouette|natural greens from plants or outdoor context",
      "mood": "determined, forward-leaning energy",
      "camera": "close detail on hands or objects",
      "version": "creative-identity@1",
      "lighting": "gentle side lighting with soft shadows",
      "color_feel": "natural greens from plants or outdoor context",
      "option_ids": {
        "mood": "determined",
        "camera": "close_detail",
        "lighting": "gentle_side_light",
        "color_feel": "natural_greens",
        "composition": "foreground_frame",
        "environment": "urban_street_soft",
        "human_presence": "silhouette_back"
      },
      "composition": "foreground framing element (door, shelf, plant)",
      "environment": "a soft-focus urban street exterior",
      "human_presence": "person seen from behind or as silhouette"
    },
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
    "visual_medium_scores": {
      "SOFT_3D": 2,
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
      "PHOTOGRAPHIC:carrier_place(+2)"
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
        "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
        "topic": "Repeating yourself every single day — and still not being available when it counts",
        "motifs": [
          "sticky_notes",
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
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "sticky_notes",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
        "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
        "motifs": [
          "laptop",
          "desk",
          "dashboard",
          "group",
          "product_asset"
        ],
        "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
      },
      {
        "hook": "The busiest moment for your website is the one you're never around to see.",
        "topic": "Your business is closed — but your website is still getting visitors right now",
        "motifs": [
          "dashboard",
          "founder",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "dashboard",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
        "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
        "motifs": [
          "meeting",
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "meeting",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
        "topic": "One script. One minute. Your website stops going silent after hours.",
        "motifs": [],
        "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": null,
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
      },
      {
        "hook": "A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.",
        "topic": "Tonight, your website could already be capturing the leads it's currently losing",
        "motifs": [
          "phone",
          "desk",
          "office",
          "whiteboard",
          "sticky_notes",
          "close_up",
          "monitor",
          "home_office"
        ],
        "closing": null,
        "typed_cta": false,
        "scene_types": [],
        "creative_mode": null,
        "visual_medium": null,
        "meaning_carrier": null,
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": null
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
- **voiceover characters:** 353
- **estimated words:** 59
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
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 7 — The Hidden Cost of 'We'll Get Back to You'

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `460c2b90-03a9-497b-8a3d-0d55c04cf635` |
| strategy_item_id | `7b9b3f85-e43e-40d7-9cb3-8daaa7efc706` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | problem_aware |
| created_at | 2026-07-16T23:16:13.50136+00:00 |
| updated_at | 2026-07-16T23:16:15.761086+00:00 |
| primary content_item_id | `8813ac35-ea9a-4248-9371-a87244af5378` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** The hidden cost of 'we'll get back to you' on a contact form
- **angle:** A contact form feels like availability — it isn't. Contrast the experience of submitting a form and waiting versus getting an instant answer. Focus on what the visitor feels and decides in that gap, especially outside business hours.
- **package_index:** 5
- **platform:** tiktok
- **format:** reel
- **priority:** 5
- **funnel_stage (column):** problem_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "A contact form feels like availability — it isn't. Contrast the experience of submitting a form and waiting versus getting an instant answer. Focus on what the visitor feels and decides in that gap, especially outside business hours.",
  "topic": "The hidden cost of 'we'll get back to you' on a contact form",
  "source": "production_run",
  "package_index": 5,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

I'll be honest — I used to think a contact form was the same as being available. It isn't even close.


**voiceover_text:**

I used to think a contact form was the same as being available. It isn't even close. A visitor lands at 11 PM, types out their question, hits submit — and then waits. Except they don't wait. They're gone in thirty seconds, on a competitor's site. The form felt like a door. It was actually a wall. Your website can answer instantly — and it should.


**subtitles:**

I used to think a contact form was the same as being available. // It isn't even close. // A visitor lands at 11 PM — types their question — hits submit. // Then waits. // Except they don't wait. // They're gone in thirty seconds. // On a competitor's site. // The form felt like a door. // It was actually a wall. // Your website can answer instantly — and it should.


**video concept:**

A surprising before-vs-after contrast between the feeling of submitting a contact form and receiving an instant answer. The video opens with a confession that reframes the contact form — not as a solution, but as a polite dead end. The twist is the gap between submission and silence. The payoff is the realization that visitors don't wait — they leave. The CTA offers the alternative: a website that actually answers.


**video script:**

BEAT 1 — SITUATION (0–5s): Open on a maker workbench. A hand slides a paper form across the surface toward an empty outbox tray. The form lands. Nothing happens. Voiceover: 'I used to think a contact form was the same as being available. It isn't even close.'

BEAT 2 — UNEXPECTED TURN (5–13s): Cut to a blueprint diagram of two paths — one labeled with a slow winding road (form → wait → silence), one labeled with a direct line (question → instant answer). The winding path has a gap in it — an open break where the visitor falls off. Voiceover: 'A visitor lands at 11 PM, types out their question, hits submit — and then waits. Except they don't wait. They're gone in thirty seconds, on a competitor's site.'

BEAT 3 — PUNCHLINE (13–19s): Cut to the same paper form, now shown beside a door that has been bricked up. The contrast is stark — what looked like access was always a wall. Voiceover: 'The form felt like a door. It was actually a wall.'

BEAT 4 — CTA (19–23s): Product asset framed in a laptop insert on the workbench surface, warm side light. Voiceover: 'Your website can answer instantly — and it should.'


**duration_seconds (brief):** 23

**CTA:** Create your AI assistant — let your website answer before they leave. (type: sign_up)

**creative_mode:** 

**hashtags:** ["#leadgeneration","#websitetips","#smallbusiness","#aichatbot","#customerexperience","#digitalmarketing","#contactform","#businessgrowth"]


#### Full platform copy

##### x

```json
{
  "cta": "What does your site actually do at 11 PM?",
  "format": "X post (≤280 chars)",
  "caption": "A contact form isn't availability. It's a polite way to watch leads leave. Visitors don't wait — they move on in 30 seconds. #leadgeneration #websitetips",
  "hashtags": [
    "#leadgeneration",
    "#websitetips"
  ],
  "title_variants": [
    "The contact form lie",
    "Before vs after: what a form actually does to your leads",
    "Your website's most expensive feature might be the contact form",
    "11 PM. Visitor. Form submitted. Then what?",
    "A door that was always a wall"
  ],
  "caption_variants": [
    "A contact form isn't availability. It's a polite way to watch leads leave. Visitors don't wait — they move on in 30 seconds. #leadgeneration #websitetips",
    "Before: visitor submits form at 11 PM, waits, leaves. After: visitor gets an instant answer, stays, converts. That gap is costing you more than you think.",
    "Hot take: the contact form is the most expensive thing on your website. Not in money. In leads that never came back. #smallbusiness",
    "Someone landed on your site last night with a real question. They filled out the form. Hit submit. And then found a competitor who answered them immediately.",
    "The form felt like a door. It was always a wall. Your website can answer people right now — it just doesn't yet. fenrik.chat"
  ]
}
```
##### tiktok

```json
{
  "cta": "Check the link in bio — your website can actually answer people tonight.",
  "format": "Vertical Short (9:16) — TikTok native",
  "caption": "I genuinely thought a contact form meant we were available. Turns out it just meant visitors had somewhere polite to disappear from. The before vs after on this one is kind of embarrassing.",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#leadgeneration",
    "#contactform"
  ]
}
```
##### youtube

```json
{
  "cta": "Subscribe for more on what quietly costs small businesses leads — and what to do about it.",
  "format": "YouTube Short (9:16)",
  "caption": "Your contact form isn't the same as being available — and most business owners find out the hard way. This short breaks down the before-vs-after contrast between a visitor who submits a form at 11 PM and one who gets an instant answer. The gap between those two experiences is exactly where leads disappear. If your website still relies on a form as its only response, this is worth 23 seconds.",
  "hashtags": [
    "#websitetips",
    "#leadgeneration",
    "#aichatbot",
    "#smallbusiness",
    "#customerexperience"
  ]
}
```
##### linkedin

```json
{
  "cta": "Worth thinking about: what does your website actually do when you're not there?",
  "format": "LinkedIn text post",
  "caption": "A contact form is not the same as being available. It feels like one — but the visitor experience tells a different story. Someone lands on your site at 11 PM with a real question. They fill out the form. They hit submit. And then they wait. Except they don't wait. They move on to whoever answers first. The form was a wall dressed up as a door. If your website can't respond in the moment, the moment is gone.",
  "hashtags": [
    "#LeadGeneration",
    "#CustomerExperience",
    "#SmallBusiness"
  ]
}
```
##### instagram

```json
{
  "cta": "See what instant looks like — link in bio.",
  "format": "Vertical Reel (9:16) — Instagram native",
  "caption": "Confession: I used to think a contact form was the same as being available. 🙋 It isn't. A visitor lands at 11 PM, fills it out, hits submit — and leaves. Not because they weren't interested. Because waiting isn't something people do anymore. The form felt like a door. It was actually a wall. Your website can do better than 'we'll get back to you.'",
  "hashtags": [
    "#websitestrategy",
    "#leadgeneration",
    "#smallbusinesstips",
    "#aichatbot",
    "#businessgrowth",
    "#customerexperience",
    "#digitalmarketing",
    "#onlinebusiness",
    "#saas"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. A maker workbench viewed at eye level, subject placed on the left third with breathing room. Warm late-afternoon side light casts amber highlights across the surface. A single hand — no face visible — slides a paper form toward an empty wire outbox tray. The tray is empty; the form lands with no response implied. Warm neutral color feel, natural textures, believable composition. No readable text, no labels, no UI."
    },
    {
      "source": "ai",
      "image_prompt": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. A maker workbench surface at eye level, left-third composition with breathing room. Warm late-afternoon side light. A large schematic diagram is laid flat on the workbench — two paths drawn in blueprint line style. The left path winds slowly with a visible gap or break where the line stops abruptly, implying a dead end. The right path is a clean direct line from one point to another. No text labels, no words — the contrast is purely visual through line weight and path shape. Hands rest near the diagram edges. Warm neutral color feel."
    },
    {
      "source": "ai",
      "image_prompt": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. A maker workbench at eye level, left-third subject placement. Warm late-afternoon side light with amber tone. Two objects side by side on the workbench surface: on the left, a paper form in an outbox tray; on the right, a doorway blueprint schematic where the door opening is filled in with solid brick-pattern cross-hatching — the door is sealed. The contrast between the form (implying communication) and the bricked doorway (implying no passage) is the visual punchline. No readable text, no labels, no UI. Warm neutral color feel, restrained contrast."
    },
    {
      "modify": "false",
      "source": "asset",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); place it centered within a clean laptop mockup positioned on the warm wood workbench surface — warm late-afternoon side light, amber highlights, eye-level medium shot, left-third composition — do not crop fullscreen; the laptop sits naturally as a prop on the workbench with intentional negative space around it.",
      "asset_id": "b1b0d00c-0bfc-4095-954f-4b38a813747f",
      "video_usage": "framed_laptop"
    }
  ],
  "image_prompts": [
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. A maker workbench viewed at eye level, subject placed on the left third with breathing room. Warm late-afternoon side light casts amber highlights across the surface. A single hand — no face visible — slides a paper form toward an empty wire outbox tray. The tray is empty; the form lands with no response implied. Warm neutral color feel, natural textures, believable composition. No readable text, no labels, no UI.",
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. A maker workbench surface at eye level, left-third composition with breathing room. Warm late-afternoon side light. A large schematic diagram is laid flat on the workbench — two paths drawn in blueprint line style. The left path winds slowly with a visible gap or break where the line stops abruptly, implying a dead end. The right path is a clean direct line from one point to another. No text labels, no words — the contrast is purely visual through line weight and path shape. Hands rest near the diagram edges. Warm neutral color feel.",
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. A maker workbench at eye level, left-third subject placement. Warm late-afternoon side light with amber tone. Two objects side by side on the workbench surface: on the left, a paper form in an outbox tray; on the right, a doorway blueprint schematic where the door opening is filled in with solid brick-pattern cross-hatching — the door is sealed. The contrast between the form (implying communication) and the bricked doorway (implying no passage) is the visual punchline. No readable text, no labels, no UI. Warm neutral color feel, restrained contrast."
  ],
  "asset_usage": [
    {
      "modify": "false",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); place it centered within a clean laptop mockup positioned on the warm wood workbench surface — warm late-afternoon side light, amber highlights, eye-level medium shot, left-third composition — do not crop fullscreen; the laptop sits naturally as a prop on the workbench with intentional negative space around it.",
      "asset_id": "b1b0d00c-0bfc-4095-954f-4b38a813747f"
    }
  ],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "shimmer",
    "package_id": "460c2b90-03a9-497b-8a3d-0d55c04cf635",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 48,
      "secondary": 64
    },
    "voice_source": "package_secondary",
    "visual_medium": "TECHNICAL_BLUEPRINT",
    "voice_reasons": [
      "funnel_problem→warmth(+2)",
      "mode_humor→energy/warmth",
      "profile_NATURAL→warmth(+2)",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+48)",
      "fit_secondary(+64)"
    ],
    "product_reveal": {
      "reasons": [
        "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "FRAMED_ASSET",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "shimmer",
    "visual_profile": "NATURAL",
    "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: lightly playful, never exaggerated. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: lightly playful, never exaggerated. Delivery: confident, concise, not aggressive. Language: en.",
    "visual_narrative": {
      "key": "object|physical evidence of the problem (empty tray, crossed-out plan, half-finished stack)",
      "version": "visual-narrative@1",
      "subject_focus": "physical evidence of the problem (empty tray, crossed-out plan, half-finished stack)",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "desk": 4,
        "group": 1,
        "phone": 4,
        "laptop": 4,
        "office": 2,
        "founder": 1,
        "meeting": 1,
        "monitor": 1,
        "close_up": 5,
        "dashboard": 3,
        "prototype": 3,
        "whiteboard": 1,
        "home_office": 1,
        "person_alone": 3,
        "sticky_notes": 2,
        "product_asset": 3
      },
      "supporting_carriers": [
        "place",
        "process",
        "transformation"
      ],
      "primary_meaning_carrier": "object"
    },
    "creative_identity": {
      "key": "a maker workbench with tools and materials|reflective, thoughtful pause|warm late-afternoon side light|eye-level medium shot|subject placed on the left third with breathing room|hands and workspace only, no face|warm neutral color feel",
      "mood": "reflective, thoughtful pause",
      "camera": "eye-level medium shot",
      "version": "creative-identity@1",
      "lighting": "warm late-afternoon side light",
      "color_feel": "warm neutral color feel",
      "option_ids": {
        "mood": "reflective",
        "camera": "eye_level_medium",
        "lighting": "warm_late_afternoon",
        "color_feel": "warm_neutral",
        "composition": "subject_left_third",
        "environment": "maker_workbench",
        "human_presence": "hands_only"
      },
      "composition": "subject placed on the left third with breathing room",
      "environment": "a maker workbench with tools and materials",
      "human_presence": "hands and workspace only, no face"
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
      "SOFT_3D": 2,
      "PHOTOGRAPHIC": 0,
      "GRAPHIC_COLLAGE": 0,
      "CLEAN_ILLUSTRATION": 5,
      "TECHNICAL_BLUEPRINT": 3
    },
    "visual_medium_source": "auto",
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_medium_reasons": [
      "SOFT_3D:digital_product(+2)",
      "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
      "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
      "TECHNICAL_BLUEPRINT:carrier_process(+1)",
      "CLEAN_ILLUSTRATION:identity_no_face(+2)",
      "TECHNICAL_BLUEPRINT:identity_objects(+1)",
      "CLEAN_ILLUSTRATION:saas_abstract(+1)",
      "TECHNICAL_BLUEPRINT:saas_system(+1)",
      "diversity:CLEAN_ILLUSTRATION→TECHNICAL_BLUEPRINT(close_score)"
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
        "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
        "topic": "What a qualified lead actually does when your website can't answer them",
        "motifs": [
          "phone",
          "dashboard",
          "person_alone",
          "close_up"
        ],
        "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
      },
      {
        "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
        "topic": "Repeating yourself every single day — and still not being available when it counts",
        "motifs": [
          "sticky_notes",
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
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "sticky_notes",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
        "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
        "motifs": [
          "laptop",
          "desk",
          "dashboard",
          "group",
          "product_asset"
        ],
        "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
      },
      {
        "hook": "The busiest moment for your website is the one you're never around to see.",
        "topic": "Your business is closed — but your website is still getting visitors right now",
        "motifs": [
          "dashboard",
          "founder",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "dashboard",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
        "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
        "motifs": [
          "meeting",
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "meeting",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I used to think refreshing my inbox every morning was a productive habit. Turns out I was just checking what I'd already missed.",
        "topic": "One script. One minute. Your website stops going silent after hours.",
        "motifs": [],
        "closing": "Soft polished 3D render. Portrait 9:16 vertical frame. Wide three-quarter exterior view of the same urban storefront at ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": null,
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
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
- **voiceover characters:** 348
- **estimated words:** 66
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
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 8 — The Hidden Time Tax of Answering the Same Questions Every Day

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `63730ec0-1c39-4f82-8edf-183a9b64e2d7` |
| strategy_item_id | `5a606961-373d-4c7c-8b8d-3d15d6fb6fac` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | problem_aware |
| created_at | 2026-07-16T23:17:21.911812+00:00 |
| updated_at | 2026-07-16T23:17:23.802218+00:00 |
| primary content_item_id | `8e32ebb8-9188-4730-95e4-635ad225ea99` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** Why most small businesses never build a chatbot — and what that silence costs them
- **angle:** The assumption that chatbots are expensive, technical, and time-consuming keeps most SMBs from ever starting. Expose that belief as the real lead-killer — not the lack of budget, but the false story about what it takes.
- **package_index:** 6
- **platform:** tiktok
- **format:** reel
- **priority:** 5
- **funnel_stage (column):** problem_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "The assumption that chatbots are expensive, technical, and time-consuming keeps most SMBs from ever starting. Expose that belief as the real lead-killer — not the lack of budget, but the false story about what it takes.",
  "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
  "source": "production_run",
  "package_index": 6,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.


**voiceover_text:**

Confession: I calculated how many hours I spent last month answering the exact same questions from website visitors. Pricing. Hours. How it works. Same questions. Every. Single. Day. Turns out I built a full-time job for myself — one I never applied for. The wild part? My website already had every answer. It just never said a word. There's a fix for that.


**subtitles:**

Confession: I calculated how many hours I spent last month answering the exact same questions from website visitors. / Pricing. Hours. How it works. Same questions. Every. Single. Day. / Turns out I built a full-time job for myself — one I never applied for. / The wild part? My website already had every answer. It just never said a word. / There's a fix for that.


**video concept:**

A light, self-aware confession video built around the hidden time cost of answering repetitive customer questions manually — every single day. The hook is a candid admission about wasted hours. The unexpected turn reveals that the website already holds all the answers but stays completely silent. The punchline lands on the absurdity of doing a job your website could handle automatically. The CTA is a quiet, practical invitation to fix it. Visual world: clean studio-like interior, objects that change state across beats — a growing stack of identical notes representing repeated questions — soft natural window daylight, warm neutral palette, no people, objects tell the story.


**video script:**

BEAT 1 — SITUATION (0–5s): A single sticky note sits on a clean studio surface in warm morning light. It reads nothing — but its presence implies a question waiting to be answered. One note. Manageable.

BEAT 2 — UNEXPECTED TURN (5–13s): The camera pulls back slightly to reveal the same surface now covered in an overwhelming stack of identical sticky notes — dozens, all the same. The pile is almost comedic in scale. This is the moment: same question, asked again and again, answered again and again.

BEAT 3 — PUNCHLINE (13–19s): A single blank sheet of paper sits next to the pile — clean, empty, untouched. It represents the website: it had every answer all along and said absolutely nothing. The contrast is the joke and the point.

BEAT 4 — CTA (19–23s): The surface clears. A calm, minimal close on the clean studio environment. Voiceover delivers the soft CTA. Subtitles carry the action.


**duration_seconds (brief):** 23

**CTA:** Let your website answer those questions for you — create your AI assistant at fenrik.chat (type: sign_up)

**creative_mode:** 

**hashtags:** ["#smallbusiness","#chatbot","#websitetips","#leadgeneration","#aichatbot","#smb","#businessowner","#marketingtips"]


#### Full platform copy

##### x

```json
{
  "cta": "fenrik.chat — let your website answer them instead",
  "format": "X post",
  "caption": "Confession: I counted the hours I spent last month answering the same five website questions. The number was embarrassing. My website had every answer. It just never said a word. That silence has a real cost.",
  "hashtags": [
    "#smallbusiness",
    "#chatbot"
  ],
  "title_variants": [
    "The hidden time cost of answering the same questions every day",
    "Your website holds every answer and says absolutely nothing",
    "Most SMBs think chatbots are expensive — that belief is the real problem",
    "I calculated the hours I wasted answering repeat visitor questions",
    "The question your website should be answering instead of you"
  ],
  "caption_variants": [
    "Confession: I counted the hours I spent last month answering the same five website questions. The number was embarrassing. My website had every answer. It just never said a word. That silence has a real cost.",
    "Your website already contains every answer a visitor could ask for. Pricing. Hours. How it works. It just never delivers them. That's not a content problem. It's a setup problem — and it costs you time and leads every single day.",
    "Most small businesses never build a chatbot because they assume it's expensive, technical, and takes months. That assumption is wrong. And while they're assuming, visitors are leaving with unanswered questions. Every day.",
    "The real tax on a small business isn't software costs. It's the hours spent answering the same five customer questions manually — over and over — when your website could handle it automatically.",
    "A visitor lands on your site at noon and wants to know your pricing. You're on a call. They leave. This happens more than you think — and your website already had the answer. It just wasn't set up to give it."
  ]
}
```
##### tiktok

```json
{
  "cta": "Check the link in bio — your website can answer those for you",
  "format": "Vertical short (TikTok / Reels / Shorts)",
  "caption": "I added up how many hours I spent last month answering the same five questions from website visitors. Pricing. Hours. How it works. Over and over. Turns out my website had every single answer — and just never said anything 💀 there's a fix for that",
  "hashtags": [
    "#smallbusiness",
    "#chatbot",
    "#websitetips",
    "#businessowner"
  ]
}
```
##### youtube

```json
{
  "cta": "Subscribe for more no-fluff business tips, and try a live preview at fenrik.chat — no sign-up needed.",
  "format": "Vertical short (YouTube Shorts)",
  "caption": "You've answered the same customer questions so many times you could recite them in your sleep — pricing, hours, how it works, repeat. But here's the thing: your website already has every single one of those answers. It's just never been set up to say them. This video exposes the hidden time cost of manual repetition and shows why most small businesses never fix it. Watch to the end — the solution is simpler than you think.",
  "hashtags": [
    "#smallbusiness",
    "#chatbot",
    "#websitetips",
    "#leadgeneration",
    "#aichatbot"
  ]
}
```
##### linkedin

```json
{
  "cta": "What's the one question your website gets asked most often? Drop it in the comments.",
  "format": "LinkedIn post",
  "caption": "Most business owners don't realize how much time they spend answering the same customer questions — pricing, availability, how the service works — manually, every single day. That repetition is a real cost. And the uncomfortable truth is that most websites already contain every answer a visitor could need. They just aren't set up to deliver it. That gap — between information sitting on a page and a visitor actually getting an answer — is where leads quietly disappear. The fix doesn't require a developer or a custom build. It starts with recognizing that the problem isn't budget. It's assumption.",
  "hashtags": [
    "#SmallBusiness",
    "#LeadGeneration",
    "#AIchatbot"
  ],
  "title_variants": [
    "The hidden time cost of answering the same customer questions every day",
    "Your website already has every answer — it just never says anything"
  ],
  "caption_variants": [
    "Most business owners don't realize how much time they spend answering the same customer questions — pricing, availability, how the service works — manually, every single day. That repetition is a real cost. And the uncomfortable truth is that most websites already contain every answer a visitor could need. They just aren't set up to deliver it. That gap — between information sitting on a page and a visitor actually getting an answer — is where leads quietly disappear. The fix doesn't require a developer or a custom build. It starts with recognizing that the problem isn't budget. It's assumption.",
    "Here's a thought experiment: count how many times last month you answered the same question from a website visitor. Pricing. Hours. What's included. Now multiply that by twelve. That's the annual time cost of a website that holds all the answers and says none of them. Most SMBs assume building a chatbot is expensive, technical, and time-consuming. That assumption is the actual lead-killer — not the lack of budget. The information is already there. It just needs a voice."
  ]
}
```
##### instagram

```json
{
  "cta": "Link in bio to let your website answer those questions for you — before you have to.",
  "format": "Vertical short (TikTok / Reels / Shorts)",
  "caption": "Confession: I once calculated how many hours I spent last month answering the exact same questions from website visitors. Pricing. Hours. How it works. Same questions, different day, every day. 🙃 Turns out I'd accidentally created a full-time job for myself — one I never asked for. The wild part? My website already had every answer. It just never said a word to anyone. There's a smarter way to handle this.",
  "hashtags": [
    "#smallbusiness",
    "#businesstips",
    "#websitestrategy",
    "#leadgeneration",
    "#chatbot",
    "#smb",
    "#onlinebusiness",
    "#entrepreneurlife",
    "#marketingtips",
    "#aichatbot"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean quiet studio-like interior surface — warm neutral tones, soft natural window daylight from the left. A single small square note sits alone on the left third of a pale wooden surface, slightly above center. The note is a flat illustrated shape with no readable text. Breathing room surrounds it. The scene communicates: one question, manageable, the start of something ordinary. Warm neutral color feel. No people, no devices, no typography."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean quiet studio-like interior surface — warm neutral tones, soft natural window daylight from the left. Now the same surface is covered in a large illustrated stack of identical small square notes, piled and fanned out across the left two-thirds of the frame. The pile is slightly comedic in scale — dozens of flat illustrated shapes, all the same color and size, overlapping. No readable text on any note. The scene communicates: the same question asked over and over, a mounting repetitive burden. Warm neutral color feel. No people, no typography."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean quiet studio-like interior surface — warm neutral tones, soft natural window daylight from the left. The large pile of identical notes sits on the right side of the frame. On the left third, a single clean blank rectangular sheet of paper rests flat and untouched on the surface — completely empty, calm, unhurried. The contrast between the chaotic pile and the pristine blank sheet is the visual punchline. The blank sheet represents a website that held every answer and said nothing. No readable text, no people, no devices. Warm neutral color feel."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean quiet studio-like interior surface — warm neutral tones, soft natural window daylight from the left. The surface is now clear and calm — the notes and paper are gone. Only a single small illustrated chat bubble shape sits quietly on the left third of the surface, softly glowing with a warm amber highlight. The scene communicates: relief, resolution, the website now ready to speak. Minimal, breathing, resolved. No readable text, no people, no devices. Warm neutral color feel."
    }
  ],
  "image_prompts": [
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean quiet studio-like interior surface — warm neutral tones, soft natural window daylight from the left. A single small square note sits alone on the left third of a pale wooden surface, slightly above center. The note is a flat illustrated shape with no readable text. Breathing room surrounds it. The scene communicates: one question, manageable, the start of something ordinary. Warm neutral color feel. No people, no devices, no typography.",
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean quiet studio-like interior surface — warm neutral tones, soft natural window daylight from the left. Now the same surface is covered in a large illustrated stack of identical small square notes, piled and fanned out across the left two-thirds of the frame. The pile is slightly comedic in scale — dozens of flat illustrated shapes, all the same color and size, overlapping. No readable text on any note. The scene communicates: the same question asked over and over, a mounting repetitive burden. Warm neutral color feel. No people, no typography.",
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean quiet studio-like interior surface — warm neutral tones, soft natural window daylight from the left. The large pile of identical notes sits on the right side of the frame. On the left third, a single clean blank rectangular sheet of paper rests flat and untouched on the surface — completely empty, calm, unhurried. The contrast between the chaotic pile and the pristine blank sheet is the visual punchline. The blank sheet represents a website that held every answer and said nothing. No readable text, no people, no devices. Warm neutral color feel.",
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean quiet studio-like interior surface — warm neutral tones, soft natural window daylight from the left. The surface is now clear and calm — the notes and paper are gone. Only a single small illustrated chat bubble shape sits quietly on the left third of the surface, softly glowing with a warm amber highlight. The scene communicates: relief, resolution, the website now ready to speak. Minimal, breathing, resolved. No readable text, no people, no devices. Warm neutral color feel."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "shimmer",
    "package_id": "63730ec0-1c39-4f82-8edf-183a9b64e2d7",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 48,
      "secondary": 64
    },
    "voice_source": "package_secondary",
    "visual_medium": "CLEAN_ILLUSTRATION",
    "voice_reasons": [
      "funnel_problem→warmth(+2)",
      "mode_humor→energy/warmth",
      "profile_NATURAL→warmth(+2)",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+48)",
      "fit_secondary(+64)"
    ],
    "product_reveal": {
      "reasons": [
        "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "FRAMED_ASSET",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "shimmer",
    "visual_profile": "NATURAL",
    "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: lightly playful, never exaggerated. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: lightly playful, never exaggerated. Delivery: confident, concise, not aggressive. Language: en.",
    "visual_narrative": {
      "key": "object|objects that change state across beats to tell the story",
      "version": "visual-narrative@1",
      "subject_focus": "objects that change state across beats to tell the story",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "desk": 3,
        "group": 2,
        "phone": 3,
        "laptop": 4,
        "office": 1,
        "founder": 1,
        "meeting": 1,
        "monitor": 1,
        "close_up": 4,
        "dashboard": 3,
        "prototype": 5,
        "whiteboard": 1,
        "home_office": 1,
        "person_alone": 3,
        "sticky_notes": 2,
        "product_asset": 3
      },
      "supporting_carriers": [
        "place",
        "process",
        "transformation"
      ],
      "primary_meaning_carrier": "object"
    },
    "creative_identity": {
      "key": "a clean, quiet studio-like interior|quiet tension before a decision|soft natural window daylight|slightly above table height|subject placed on the left third with breathing room|no people visible — objects and environment tell the story|warm neutral color feel",
      "mood": "quiet tension before a decision",
      "camera": "slightly above table height",
      "version": "creative-identity@1",
      "lighting": "soft natural window daylight",
      "color_feel": "warm neutral color feel",
      "option_ids": {
        "mood": "quietly_tense",
        "camera": "slightly_above_table",
        "lighting": "soft_window_daylight",
        "color_feel": "warm_neutral",
        "composition": "subject_left_third",
        "environment": "quiet_studio",
        "human_presence": "no_people"
      },
      "composition": "subject placed on the left third with breathing room",
      "environment": "a clean, quiet studio-like interior",
      "human_presence": "no people visible — objects and environment tell the story"
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
      "SOFT_3D": 2,
      "PHOTOGRAPHIC": 0,
      "GRAPHIC_COLLAGE": 0,
      "CLEAN_ILLUSTRATION": 5,
      "TECHNICAL_BLUEPRINT": 2
    },
    "visual_medium_source": "auto",
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_medium_reasons": [
      "SOFT_3D:digital_product(+2)",
      "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
      "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
      "TECHNICAL_BLUEPRINT:carrier_process(+1)",
      "CLEAN_ILLUSTRATION:identity_no_face(+2)",
      "TECHNICAL_BLUEPRINT:identity_objects(+1)",
      "CLEAN_ILLUSTRATION:saas_abstract(+1)",
      "TECHNICAL_BLUEPRINT:saas_system(+1)"
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
        "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
        "topic": "The hidden cost of 'we'll get back to you' on a contact form",
        "motifs": [
          "group",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "group",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
        "topic": "What a qualified lead actually does when your website can't answer them",
        "motifs": [
          "phone",
          "dashboard",
          "person_alone",
          "close_up"
        ],
        "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
      },
      {
        "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
        "topic": "Repeating yourself every single day — and still not being available when it counts",
        "motifs": [
          "sticky_notes",
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
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "sticky_notes",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
        "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
        "motifs": [
          "laptop",
          "desk",
          "dashboard",
          "group",
          "product_asset"
        ],
        "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
      },
      {
        "hook": "The busiest moment for your website is the one you're never around to see.",
        "topic": "Your business is closed — but your website is still getting visitors right now",
        "motifs": [
          "dashboard",
          "founder",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "dashboard",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Try a live preview of your AI assistant — no registration required. Most business owners never do. Here's the overlooked reason that costs them.",
        "topic": "The moment a visitor decides to stay or leave your website — and you have no say in it",
        "motifs": [
          "meeting",
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. The maker ",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "meeting",
        "product_reveal_strategy": "FRAMED_ASSET"
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
- **voiceover characters:** 357
- **estimated words:** 63
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
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 9 — The Redesigned Website That Still Couldn't Answer a Single Question

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `555f5b5a-85c4-48b6-aefa-ebba2e85e4cb` |
| strategy_item_id | `1e750901-bd6f-447e-b195-292fc4db0c84` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | problem_aware |
| created_at | 2026-07-16T23:18:26.720602+00:00 |
| updated_at | 2026-07-16T23:18:28.648975+00:00 |
| primary content_item_id | `ab591615-727e-4ff6-834d-5f5340fc48d6` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** The consultant whose redesigned website still couldn't answer a single visitor question
- **angle:** A fresh website launch feels like progress. But if visitors with real service questions arrive after hours and find only polished copy with no way to get help, the redesign solved the wrong problem. Tie to the pain of losing leads despite investing in the site.
- **package_index:** 7
- **platform:** tiktok
- **format:** reel
- **priority:** 5
- **funnel_stage (column):** problem_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "A fresh website launch feels like progress. But if visitors with real service questions arrive after hours and find only polished copy with no way to get help, the redesign solved the wrong problem. Tie to the pain of losing leads despite investing in the site.",
  "topic": "The consultant whose redesigned website still couldn't answer a single visitor question",
  "source": "production_run",
  "package_index": 7,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

I have to admit something — I spent three months redesigning my website and never once asked what happens when a visitor needs help at midnight.


**voiceover_text:**

Here's what most consultants never realize: a redesigned website is still a silent website. A boutique firm just relaunched — new copy, new layout, new everything. A qualified prospect landed after hours, had a real question about which package fit their needs, and left. The site looked great. It said nothing. Your website isn't a brochure problem. It's an availability problem. Fix that first.


**subtitles:**

Spent months on the redesign. Still silent after hours. A prospect landed, had a real question — and left. Your website isn't a brochure problem. It's an availability problem.


**video concept:**

An insider expert POV reveal: the redesign solved the wrong problem. Opens on the surprising fact that a polished new website is still functionally silent after hours. Cuts through the implication — a real prospect arrives, can't get help, moves on. Lands on the truth that availability is the gap no redesign fills. Closes with a quiet, direct call to fix the actual problem.


**video script:**

BEAT 1 — UNEXPECTED FACT (0–5s): Open on a pristine consultant's website mockup glowing on a monitor in an empty studio after dark. VO: 'Here's what most consultants never realize: a redesigned website is still a silent website.' BEAT 2 — IMPLICATION (5–13s): Cut to a close-up of a hand hovering over a keyboard, hesitating — the visitor who arrived and found nothing. VO: 'A boutique firm just relaunched — new copy, new layout, new everything. A qualified prospect landed after hours, had a real question about which package fit their needs, and left.' BEAT 3 — PROOF / TWIST (13–20s): Cut to a clean studio surface showing two objects side by side — a polished printed brochure and a small glowing indicator light. The brochure is beautiful; the light is off. VO: 'The site looked great. It said nothing.' BEAT 4 — CTA (20–25s): Cut to a calm, symmetrical studio scene — a single plant, warm side light, a workspace at rest. VO: 'Your website isn't a brochure problem. It's an availability problem. Fix that first.'


**duration_seconds (brief):** 22–25

**CTA:** Create your AI assistant — let your website answer after hours (type: sign_up)

**creative_mode:** 

**hashtags:** ["#websitetips","#consultingbusiness","#leadgeneration","#smallbusiness","#digitalmarketing","#AIchatbot","#websitedesign","#clientacquisition","#servicebusiness","#businessgrowth"]


#### Full platform copy

##### x

```json
{
  "cta": "What does your site say after midnight?",
  "format": "Single post with optional video",
  "caption": "A redesigned website is still a silent website. Your prospect arrived after hours, had a real question, found only polished copy — and left. The redesign solved the wrong problem.",
  "hashtags": [
    "#websitetips",
    "#consulting"
  ],
  "title_variants": [
    "The redesign looked great. The website still said nothing.",
    "What your new website still can't do after hours",
    "Spent months on the redesign. One prospect still left without an answer.",
    "The gap no website redesign actually fixes",
    "Your site is polished. It's also silent. Those are different problems."
  ],
  "caption_variants": [
    "A redesigned website is still a silent website. Your prospect arrived after hours, had a real question, found only polished copy — and left. The redesign solved the wrong problem.",
    "New layout. Better copy. Sharper branding. Still no answer when a prospect lands at 10 PM and asks which package fits their needs. Availability isn't a design problem.",
    "Spent three months on the website redesign. A qualified prospect arrived after hours, had a genuine service question, and moved on to a competitor. The site looked great. It said nothing.",
    "Most service businesses think a website problem is a design problem. It isn't. It's an availability problem. No redesign fixes that — and the leads you lose to silence never show up in analytics.",
    "Polished copy doesn't answer questions after midnight. A beautiful layout doesn't capture a lead while you sleep. The redesign was worth it. But it solved the wrong gap."
  ]
}
```
##### tiktok

```json
{
  "cta": "what does YOUR website say after midnight? drop it below",
  "format": "Vertical short (9:16), 22–25s",
  "caption": "spent months redesigning the website. prospect showed up after hours with a real question. left without a word. the redesign solved the wrong problem 👀",
  "hashtags": [
    "#websitetips",
    "#smallbusiness",
    "#consultinglife",
    "#leadgeneration"
  ]
}
```
##### youtube

```json
{
  "cta": "Subscribe for more insights on turning your website into a 24/7 lead tool — and watch the next video on what visitors actually do when your site can't answer them.",
  "format": "YouTube Short (9:16), 22–25s",
  "caption": "Your redesigned website looks great — but if visitors arrive after hours with real questions and find only polished copy, the redesign solved the wrong problem. A consultant's website can be beautifully built and still completely silent when a qualified prospect needs help. The gap isn't design. It's availability. This video breaks down why a fresh launch doesn't fix the lead problem — and what actually does. Watch to the end for the fix most service businesses overlook entirely.",
  "hashtags": [
    "#websitetips",
    "#consultingbusiness",
    "#leadgeneration",
    "#AIchatbot",
    "#smallbusinessgrowth"
  ]
}
```
##### linkedin

```json
{
  "cta": "Have you audited what your website actually does when you're not there? Worth thinking about.",
  "format": "Text post with video attachment",
  "caption": "Most consultants launch a redesigned website and assume the hard work is done. It isn't. A new layout solves a visibility problem. It does nothing about an availability problem. A prospect who lands on your site at 10 PM with a genuine question about your service packages doesn't care how good the copy is — they need an answer. Static websites, no matter how well designed, say nothing after hours. The leads lost to silence don't show up in your analytics as a design failure. They just don't show up at all.",
  "hashtags": [
    "#consulting",
    "#leadgeneration",
    "#websitestrategy"
  ]
}
```
##### instagram

```json
{
  "cta": "Save this if you've ever invested in a website and still wondered why visitors don't convert. Link in bio to fix the availability gap.",
  "format": "Vertical Reel (9:16), 22–25s",
  "caption": "A fresh website redesign feels like real progress. New layout, better copy, sharper branding. ✨ But here's the part no one talks about: a polished website is still a silent website after hours. A qualified prospect lands, has a genuine question about your services — and finds nothing but static text. They move on. The redesign solved the look. It didn't solve the availability. That gap is where leads disappear.",
  "hashtags": [
    "#websitedesign",
    "#consultingtips",
    "#leadgeneration",
    "#smallbusiness",
    "#digitalmarketing",
    "#businessgrowth",
    "#onlinebusiness",
    "#websitetips",
    "#clientacquisition",
    "#servicebusiness"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Over-the-shoulder framing, symmetrical calm composition. Warm late-afternoon side light with amber highlights and natural greens from a small plant in the background. A sleek open laptop sits centered on a minimal desk surface, screen angled toward the viewer, displaying a beautifully designed but static website — elegant layout, no chat, no interactive element, no readable text. The screen glows softly in the otherwise still room. Hands and workspace only, no face. The scene communicates: polished design, total silence."
    },
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Over-the-shoulder framing, warm late-afternoon side light. Close-up of a single hand resting motionless above a keyboard, not typing — suspended mid-decision. The keyboard sits on a minimal desk. A small potted green plant is visible in the soft background. The scene communicates: a visitor who arrived, waited, and found nothing to engage with. No face, no clutter, no readable text on any surface."
    },
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Symmetrical calm composition, warm late-afternoon side light with amber tones. Top-down or slight three-quarter view of a minimal studio desk surface. Two objects placed side by side in deliberate contrast: a beautifully printed brochure or folded document — crisp, polished, clearly high-quality — and a small rounded indicator light that is visibly off, dark, unlit. Natural green from a plant at the edge of the frame. No readable text on any surface. The scene communicates: the redesign was beautiful; the availability was zero."
    },
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Symmetrical calm composition, warm late-afternoon side light. A minimal workspace at rest — a desk surface with a small thriving green plant, a single notebook closed, and soft ambient light pooling from the side. The space feels calm but ready, not abandoned. Hands resting lightly on the desk edge, no face. The scene communicates: the problem is identified, the fix is within reach — quiet resolution energy."
    }
  ],
  "image_prompts": [
    "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Over-the-shoulder framing, symmetrical calm composition. Warm late-afternoon side light with amber highlights and natural greens from a small plant in the background. A sleek open laptop sits centered on a minimal desk surface, screen angled toward the viewer, displaying a beautifully designed but static website — elegant layout, no chat, no interactive element, no readable text. The screen glows softly in the otherwise still room. Hands and workspace only, no face. The scene communicates: polished design, total silence.",
    "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Over-the-shoulder framing, warm late-afternoon side light. Close-up of a single hand resting motionless above a keyboard, not typing — suspended mid-decision. The keyboard sits on a minimal desk. A small potted green plant is visible in the soft background. The scene communicates: a visitor who arrived, waited, and found nothing to engage with. No face, no clutter, no readable text on any surface.",
    "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Symmetrical calm composition, warm late-afternoon side light with amber tones. Top-down or slight three-quarter view of a minimal studio desk surface. Two objects placed side by side in deliberate contrast: a beautifully printed brochure or folded document — crisp, polished, clearly high-quality — and a small rounded indicator light that is visibly off, dark, unlit. Natural green from a plant at the edge of the frame. No readable text on any surface. The scene communicates: the redesign was beautiful; the availability was zero.",
    "Soft polished 3D render. Portrait 9:16 vertical frame. A clean, quiet studio-like interior. Symmetrical calm composition, warm late-afternoon side light. A minimal workspace at rest — a desk surface with a small thriving green plant, a single notebook closed, and soft ambient light pooling from the side. The space feels calm but ready, not abandoned. Hands resting lightly on the desk edge, no face. The scene communicates: the problem is identified, the fix is within reach — quiet resolution energy."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "shimmer",
    "package_id": "555f5b5a-85c4-48b6-aefa-ebba2e85e4cb",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 49,
      "secondary": 62
    },
    "voice_source": "package_secondary",
    "visual_medium": "SOFT_3D",
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
        "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "FRAMED_ASSET",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "shimmer",
    "visual_profile": "NATURAL",
    "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: warm and approachable. Delivery: measured, credible. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: measured, credible. Language: en.",
    "visual_narrative": {
      "key": "object|objects that change state across beats to tell the story",
      "version": "visual-narrative@1",
      "subject_focus": "objects that change state across beats to tell the story",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "desk": 2,
        "group": 2,
        "phone": 2,
        "laptop": 4,
        "founder": 1,
        "meeting": 1,
        "close_up": 3,
        "dashboard": 3,
        "prototype": 5,
        "person_alone": 4,
        "sticky_notes": 1,
        "product_asset": 3
      },
      "supporting_carriers": [
        "place",
        "process",
        "transformation"
      ],
      "primary_meaning_carrier": "object"
    },
    "creative_identity": {
      "key": "a clean, quiet studio-like interior|determined, forward-leaning energy|warm late-afternoon side light|over-the-shoulder framing|symmetrical, calm composition|hands and workspace only, no face|natural greens from plants or outdoor context",
      "mood": "determined, forward-leaning energy",
      "camera": "over-the-shoulder framing",
      "version": "creative-identity@1",
      "lighting": "warm late-afternoon side light",
      "color_feel": "natural greens from plants or outdoor context",
      "option_ids": {
        "mood": "determined",
        "camera": "over_shoulder",
        "lighting": "warm_late_afternoon",
        "color_feel": "natural_greens",
        "composition": "symmetrical_calm",
        "environment": "quiet_studio",
        "human_presence": "hands_only"
      },
      "composition": "symmetrical, calm composition",
      "environment": "a clean, quiet studio-like interior",
      "human_presence": "hands and workspace only, no face"
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
      "SOFT_3D": 2,
      "PHOTOGRAPHIC": 0,
      "GRAPHIC_COLLAGE": 0,
      "CLEAN_ILLUSTRATION": 4,
      "TECHNICAL_BLUEPRINT": 2
    },
    "visual_medium_source": "auto",
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_medium_reasons": [
      "SOFT_3D:digital_product(+2)",
      "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
      "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
      "TECHNICAL_BLUEPRINT:carrier_process(+1)",
      "CLEAN_ILLUSTRATION:identity_no_face(+2)",
      "TECHNICAL_BLUEPRINT:identity_objects(+1)",
      "CLEAN_ILLUSTRATION:saas_abstract(+1)",
      "TECHNICAL_BLUEPRINT:saas_system(+1)",
      "CLEAN_ILLUSTRATION:recent_repeat(-2)",
      "diversity:CLEAN_ILLUSTRATION→SOFT_3D(close_score)"
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
        "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
        "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
        "motifs": [
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "person_alone",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
        "topic": "The hidden cost of 'we'll get back to you' on a contact form",
        "motifs": [
          "group",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "group",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
        "topic": "What a qualified lead actually does when your website can't answer them",
        "motifs": [
          "phone",
          "dashboard",
          "person_alone",
          "close_up"
        ],
        "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
      },
      {
        "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
        "topic": "Repeating yourself every single day — and still not being available when it counts",
        "motifs": [
          "sticky_notes",
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
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "sticky_notes",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
        "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
        "motifs": [
          "laptop",
          "desk",
          "dashboard",
          "group",
          "product_asset"
        ],
        "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
      },
      {
        "hook": "The busiest moment for your website is the one you're never around to see.",
        "topic": "Your business is closed — but your website is still getting visitors right now",
        "motifs": [
          "dashboard",
          "founder",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the twist/resolution beat (seconds 14–",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "dashboard",
        "product_reveal_strategy": "FRAMED_ASSET"
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
- **voiceover characters:** 396
- **estimated words:** 64
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
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 10 — The Overlooked Detail That Makes a Custom Chatbot Feel Impossible

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `6ff1bcc0-2be8-412b-aec3-550d91aa8cb8` |
| strategy_item_id | `bebde6e7-bf5a-47d3-819f-6763e0fa8342` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | solution_aware |
| created_at | 2026-07-16T23:19:38.098366+00:00 |
| updated_at | 2026-07-16T23:19:40.04925+00:00 |
| primary content_item_id | `0f9d42eb-2cfc-4bad-a3c0-8fe83c87da37` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** What it actually looks like when your website answers a visitor question at midnight
- **angle:** Show — concretely and without hype — how an AI assistant built from existing website content handles a real visitor question after hours, captures the lead, and lets the business owner wake up to a warm contact instead of a missed opportunity.
- **package_index:** 8
- **platform:** tiktok
- **format:** reel
- **priority:** 5
- **funnel_stage (column):** solution_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "Show — concretely and without hype — how an AI assistant built from existing website content handles a real visitor question after hours, captures the lead, and lets the business owner wake up to a warm contact instead of a missed opportunity.",
  "topic": "What it actually looks like when your website answers a visitor question at midnight",
  "source": "production_run",
  "package_index": 8,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

You keep waiting until you have the time, the budget, and the right developer — and that wait is exactly why your website answered zero questions last night.


**voiceover_text:**

Most business owners think building a chatbot means a project. A developer. Weeks of setup. So they wait. Meanwhile, every midnight visitor lands on a silent website and leaves. Here's the detail they missed: the knowledge base already exists — it's your website. Fenrik reads it, builds the assistant, and it's live in about a minute. No project. No developer. Just your website, finally answering.


**subtitles:**

Most business owners think building a chatbot means a project. A developer. Weeks of setup. So they wait. Meanwhile — every midnight visitor lands on a silent website and leaves. Here's the detail they missed: the knowledge base already exists. It's your website. Fenrik reads it, builds the assistant, live in about a minute. No project. No developer. Just your website, finally answering.


**video concept:**

A calm, observational short that names the specific mistake — waiting for a 'chatbot project' to begin — then reframes it: the raw material was always sitting there on the website itself. The twist is quiet and precise: you don't build a knowledge base, you already have one. Visual world: a maker workbench, tools and materials in process, gentle side light, muted earth tones. The product enters as a framed screen insert at the reveal beat, anchoring the resolution without overselling.


**video script:**

BEAT 1 — OBSERVATION (0–5s)
Visual: A workbench surface. An open notebook with a blank page, a pen resting across it, untouched. Tools laid out but unused. The project that never started.
VO: Most business owners think building a chatbot means a project. A developer. Weeks of setup.

BEAT 2 — MEANING (5–11s)
Visual: Same workbench. A small paper calendar pinned to a board behind it — pages suggesting time passing. The notebook still blank. Nothing has moved.
VO: So they wait. Meanwhile, every midnight visitor lands on a silent website and leaves.

BEAT 3 — REVEAL / TWIST (11–18s)
Visual: FRAMED ASSET — the Fenrik.chat product UI shown as a clean laptop screen insert on the workbench surface. Gentle side light. The screen shows the assistant being created from a URL. The notebook is now beside the laptop — the raw material was already there all along.
VO: Here's the detail they missed: the knowledge base already exists — it's your website. Fenrik reads it, builds the assistant, and it's live in about a minute.

BEAT 4 — CTA (18–23s)
Visual: The laptop remains on the workbench, screen glowing softly. The notebook is closed — the project is done. Breathing room around the scene.
VO: No project. No developer. Just your website, finally answering.


**duration_seconds (brief):** 23

**CTA:** Paste your URL and watch your website come alive — try Fenrik.chat free (type: sign_up)

**creative_mode:** 

**hashtags:** ["#AIchatbot","#SmallBusiness","#WebsiteTools","#LeadGeneration","#NoCode","#AIAssistant","#Fenrik"]


#### Full platform copy

##### x

```json
{
  "cta": "Try it at fenrik.chat",
  "format": "X post with video",
  "caption": "Most businesses don't have a chatbot because they think it's a project. It isn't. Your website is already the knowledge base. Fenrik reads it and goes live in ~1 min. The wait was the only real blocker.",
  "hashtags": [
    "#AIchatbot",
    "#SmallBusiness"
  ],
  "title_variants": [
    "The chatbot project that never starts",
    "Your website already knows the answers",
    "The belief that costs you leads every night",
    "You don't need to build the knowledge base",
    "The wait itself is the most expensive part"
  ],
  "caption_variants": [
    "Most businesses don't have a chatbot because they think it's a project. It isn't. Your website is already the knowledge base. Fenrik reads it and goes live in ~1 min. The wait was the only real blocker.",
    "Your website already contains everything a chatbot needs to answer visitors. Most owners just never realized it. Fenrik reads your existing content and builds the assistant automatically. No developer. No training. About a minute.",
    "The reason your website is silent at midnight isn't budget or tech. It's the belief that fixing it requires a project. That belief is wrong — and it's costing you leads every single night.",
    "You don't need to build a knowledge base for your chatbot. You already have one. It's called your website. Fenrik reads it, builds the assistant, and it's live. That's the detail most people miss. fenrik.chat",
    "Every day the chatbot project stays on the backlog, qualified visitors arrive after hours and leave with nothing. The project was never the blocker. The assumption that one was needed — that was. fenrik.chat"
  ]
}
```
##### tiktok

```json
{
  "cta": "Try it — paste your URL and see it work",
  "format": "Vertical short-form video, 9:16, 23s",
  "caption": "The reason most websites never get a chatbot isn't budget or tech — it's that people think it's a whole project. It isn't. Your website is already the knowledge base. Fenrik just reads it and goes live.",
  "hashtags": [
    "#chatbot",
    "#smallbusiness",
    "#websitetips",
    "#aitools"
  ]
}
```
##### youtube

```json
{
  "cta": "Try the live preview at fenrik.chat — no sign-up needed",
  "format": "YouTube Short, vertical 9:16, 23s",
  "caption": "Most business owners never build a chatbot because they're waiting for the right moment to start a development project. But the knowledge base they think they need to build? It already exists — it's their website. Fenrik.chat reads your existing website content automatically and creates an AI assistant in about a minute, with no developer and no technical setup. This short shows exactly what that looks like — and why the wait itself is the most expensive mistake. Try a live preview at https://fenrik.chat — no registration required.",
  "hashtags": [
    "#AIchatbot",
    "#SmallBusiness",
    "#WebsiteTools",
    "#LeadGeneration",
    "#Fenrik"
  ]
}
```
##### linkedin

```json
{
  "cta": "What's keeping your website silent after hours? Worth a conversation.",
  "format": "LinkedIn text post with video",
  "caption": "Most small businesses never deploy a chatbot — not because they can't afford one, but because they believe it requires a development project. A developer. A training phase. Weeks of setup. So the project stays on the backlog, and every website visitor who arrives after hours leaves without an answer. The overlooked detail: the knowledge base already exists. It's the website itself. Fenrik reads your existing content and builds an AI assistant in about a minute — no integrations, no technical knowledge required. The project was never the blocker. The belief that there had to be one was.",
  "hashtags": [
    "#AIchatbot",
    "#SmallBusiness",
    "#LeadGeneration"
  ],
  "title_variants": [
    "The belief that a chatbot requires a project is quietly draining your business",
    "Your website already has everything a chatbot needs — most owners never realize it"
  ],
  "caption_variants": [
    "Most small businesses never deploy a chatbot — not because they can't afford one, but because they believe it requires a development project. A developer. A training phase. Weeks of setup. So the project stays on the backlog, and every website visitor who arrives after hours leaves without an answer. The overlooked detail: the knowledge base already exists. It's the website itself. Fenrik reads your existing content and builds an AI assistant in about a minute — no integrations, no technical knowledge required. The project was never the blocker. The belief that there had to be one was.",
    "There's a specific moment when a qualified visitor decides to leave your website: the moment they realize no one is going to answer them. For most small businesses, that happens every night. The reason isn't budget — it's a belief that fixing it requires a chatbot project. A developer. A knowledge base built from scratch. None of that is true. Fenrik reads your existing website and creates an AI assistant in about a minute. The raw material was already there. It just needed something to read it."
  ]
}
```
##### instagram

```json
{
  "cta": "Try the live preview — link in bio",
  "format": "Vertical Reel, 9:16, 23s",
  "caption": "Here's the detail most business owners miss: you don't need to build a knowledge base for your chatbot. You already have one — it's your website. 🌐 Fenrik reads your existing content, builds the assistant, and it's live in about a minute. No developer. No setup project. No waiting. Just your website, finally answering visitors at midnight.",
  "hashtags": [
    "#aichatbot",
    "#smallbusiness",
    "#websitetools",
    "#leadgeneration",
    "#businessgrowth",
    "#aiassistant",
    "#nocode",
    "#smb",
    "#digitalmarketing",
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
      "image_prompt": "Soft polished 3D render, portrait 9:16 vertical frame. A maker workbench surface in muted earth tones — warm ochre and tan. On the left third of the frame, an open notebook with a completely blank page, a pen resting diagonally across it, untouched. Beside it, a few small hand tools arranged neatly but unused. Gentle side lighting from the left casts soft shadows across the surface texture. Static documentary framing, eye-level medium shot. No readable text, no labels, no screens. The mood is curious and alert — a project that has not yet started. Face not visible. Generous vertical headroom and footroom."
    },
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render, portrait 9:16 vertical frame. The same maker workbench surface in muted earth tones. The open notebook is still blank — nothing written, nothing changed. Behind the workbench, a small paper calendar is pinned to a textured wall, its pages suggesting the passage of time without any readable numbers or text. The pen remains resting on the notebook. Gentle side lighting, soft shadows. Static documentary framing, subject on the left third with breathing room to the right. No readable text, no labels, no screens. The mood conveys quiet time passing — the project still waiting. No face visible."
    },
    {
      "modify": "false",
      "source": "asset",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the reveal/twist beat (seconds 11–18); place it centered within a clean laptop mockup positioned on the maker workbench surface — the notebook rests beside the laptop as a prop, gentle side lighting from the left, muted earth tones, static documentary framing, subject on the left third with breathing room. Do not crop fullscreen. The laptop screen displays the product UI showing an AI assistant being created from a website URL.",
      "asset_id": "7e250d64-ddcf-4649-921f-783d294a2b5b",
      "video_usage": "framed_laptop"
    },
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render, portrait 9:16 vertical frame. The maker workbench surface in muted earth tones. A clean laptop sits open on the left third of the frame, its screen glowing softly with a warm ambient light — the screen content is a soft abstract interface glow, no readable text. The notebook from the earlier scene is now closed and set to one side, its work complete. Gentle side lighting from the left, soft shadows, static documentary framing, eye-level medium shot. Generous breathing room around the scene. The mood is calm resolution — the project is done. No face visible, no labels, no readable text."
    }
  ],
  "image_prompts": [
    "Soft polished 3D render, portrait 9:16 vertical frame. A maker workbench surface in muted earth tones — warm ochre and tan. On the left third of the frame, an open notebook with a completely blank page, a pen resting diagonally across it, untouched. Beside it, a few small hand tools arranged neatly but unused. Gentle side lighting from the left casts soft shadows across the surface texture. Static documentary framing, eye-level medium shot. No readable text, no labels, no screens. The mood is curious and alert — a project that has not yet started. Face not visible. Generous vertical headroom and footroom.",
    "Soft polished 3D render, portrait 9:16 vertical frame. The same maker workbench surface in muted earth tones. The open notebook is still blank — nothing written, nothing changed. Behind the workbench, a small paper calendar is pinned to a textured wall, its pages suggesting the passage of time without any readable numbers or text. The pen remains resting on the notebook. Gentle side lighting, soft shadows. Static documentary framing, subject on the left third with breathing room to the right. No readable text, no labels, no screens. The mood conveys quiet time passing — the project still waiting. No face visible.",
    "Soft polished 3D render, portrait 9:16 vertical frame. The maker workbench surface in muted earth tones. A clean laptop sits open on the left third of the frame, its screen glowing softly with a warm ambient light — the screen content is a soft abstract interface glow, no readable text. The notebook from the earlier scene is now closed and set to one side, its work complete. Gentle side lighting from the left, soft shadows, static documentary framing, eye-level medium shot. Generous breathing room around the scene. The mood is calm resolution — the project is done. No face visible, no labels, no readable text."
  ],
  "asset_usage": [
    {
      "modify": "false",
      "used_as": "Show this landscape product UI screenshot as a framed laptop screen insert during the reveal/twist beat (seconds 11–18); place it centered within a clean laptop mockup positioned on the maker workbench surface — the notebook rests beside the laptop as a prop, gentle side lighting from the left, muted earth tones, static documentary framing, subject on the left third with breathing room. Do not crop fullscreen. The laptop screen displays the product UI showing an AI assistant being created from a website URL.",
      "asset_id": "7e250d64-ddcf-4649-921f-783d294a2b5b"
    }
  ],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "cedar",
    "package_id": "6ff1bcc0-2be8-412b-aec3-550d91aa8cb8",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 55,
      "secondary": 46
    },
    "voice_source": "package_primary",
    "visual_medium": "SOFT_3D",
    "voice_reasons": [
      "funnel_solution→steady/energy(+1)",
      "mode_observation→steady/warmth",
      "profile_EDITORIAL→steady/warmth",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+55)",
      "fit_secondary(+46)"
    ],
    "product_reveal": {
      "reasons": [
        "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "FRAMED_ASSET",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "cedar",
    "visual_profile": "EDITORIAL",
    "delivery_reason": "Delivery: clear, confident, practical. Delivery: thoughtful, reflective, steady pacing. Delivery: composed, insightful, measured. Delivery: confident, concise, not aggressive. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: clear, confident, practical. Delivery: thoughtful, reflective, steady pacing. Delivery: confident, concise, not aggressive. Language: en.",
    "visual_narrative": {
      "key": "process|time passing shown through process residue, not clocks with text",
      "version": "visual-narrative@1",
      "subject_focus": "time passing shown through process residue, not clocks with text",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "desk": 3,
        "group": 3,
        "phone": 2,
        "laptop": 5,
        "founder": 1,
        "meeting": 1,
        "close_up": 4,
        "overhead": 1,
        "dashboard": 3,
        "prototype": 5,
        "person_alone": 4,
        "sticky_notes": 1,
        "product_asset": 3
      },
      "supporting_carriers": [
        "object",
        "transformation",
        "place"
      ],
      "primary_meaning_carrier": "process"
    },
    "creative_identity": {
      "key": "a maker workbench with tools and materials|curious, alert attention|gentle side lighting with soft shadows|static documentary framing|subject placed on the left third with breathing room|face intentionally not visible|muted earth tones",
      "mood": "curious, alert attention",
      "camera": "static documentary framing",
      "version": "creative-identity@1",
      "lighting": "gentle side lighting with soft shadows",
      "color_feel": "muted earth tones",
      "option_ids": {
        "mood": "curious",
        "camera": "static_documentary",
        "lighting": "gentle_side_light",
        "color_feel": "muted_earth",
        "composition": "subject_left_third",
        "environment": "maker_workbench",
        "human_presence": "face_not_visible"
      },
      "composition": "subject placed on the left third with breathing room",
      "environment": "a maker workbench with tools and materials",
      "human_presence": "face intentionally not visible"
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
      "SOFT_3D": 3,
      "PHOTOGRAPHIC": 0,
      "GRAPHIC_COLLAGE": 0,
      "CLEAN_ILLUSTRATION": 2,
      "TECHNICAL_BLUEPRINT": 1
    },
    "visual_medium_source": "auto",
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_medium_reasons": [
      "SOFT_3D:digital_product(+2)",
      "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
      "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
      "TECHNICAL_BLUEPRINT:carrier_process(+1)",
      "CLEAN_ILLUSTRATION:saas_abstract(+1)",
      "TECHNICAL_BLUEPRINT:saas_system(+1)",
      "SOFT_3D:funnel_solution(+1)",
      "CLEAN_ILLUSTRATION:recent_repeat(-2)"
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
        "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
        "motifs": [
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "person_alone",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
        "topic": "The hidden cost of 'we'll get back to you' on a contact form",
        "motifs": [
          "group",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "group",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
        "topic": "What a qualified lead actually does when your website can't answer them",
        "motifs": [
          "phone",
          "dashboard",
          "person_alone",
          "close_up"
        ],
        "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
      },
      {
        "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
        "topic": "Repeating yourself every single day — and still not being available when it counts",
        "motifs": [
          "sticky_notes",
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
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "sticky_notes",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Lot full of cars. Sales team off for the holiday. Website flooded with buyers — and every single one left without a word.",
        "topic": "The car dealership that lost a weekend's worth of buyers and never knew it",
        "motifs": [
          "laptop",
          "desk",
          "dashboard",
          "group",
          "product_asset"
        ],
        "closing": "Portrait 9:16 vertical frame. A calm, bright co-working desk surface in daylight. A laptop sits open, screen angled towa",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
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
- **voiceover characters:** 399
- **estimated words:** 65
- **audio_duration (debug):** —
- **TTS validation attempts:** —
- **tail validation passed:** —
- **tts_tail_retry_used:** —

#### Visual profile

- **package/job profile:** EDITORIAL
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
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 11 — The 2 AM Board Meeting Question

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `992c82dc-d685-4253-8089-444b5d0bfbdd` |
| strategy_item_id | `baef7e09-b925-4537-ab72-ef2d786033d3` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | solution_aware |
| created_at | 2026-07-16T23:20:40.826993+00:00 |
| updated_at | 2026-07-16T23:20:42.816655+00:00 |
| primary content_item_id | `c3b157e8-5035-428c-ae77-1fe8fe8d7df9` |
| video_job_id | `b2561f42-e709-4f8e-bb29-1f76db60af22` |
| video_job status | processing |

#### Strategy input

- **topic:** Your website already has the answers — it just has no way to say them
- **angle:** Reframe the chatbot setup process: you don't write scripts or train anything. The AI reads what's already on your site and starts answering from that. The content exists — the only missing piece was a voice to deliver it.
- **package_index:** 9
- **platform:** tiktok
- **format:** reel
- **priority:** 5
- **funnel_stage (column):** solution_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "Reframe the chatbot setup process: you don't write scripts or train anything. The AI reads what's already on your site and starts answering from that. The content exists — the only missing piece was a voice to deliver it.",
  "topic": "Your website already has the answers — it just has no way to say them",
  "source": "production_run",
  "package_index": 9,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

Your website can already answer visitor questions — it just has no way to say them yet.


**voiceover_text:**

Your website already has the answers. Every service page, every FAQ, every detail you wrote — it's all there. But when a prospect lands at 2 AM with a critical question, your site says nothing. The content exists. The only missing piece is a voice. Fenrik reads your site and starts answering — no training, no setup. Create your AI assistant today.


**subtitles:**

Your website already has the answers. / It just has no way to say them. / Every page you wrote — it's all there. / But when a prospect lands at 2 AM? / Your site says nothing. / The content exists. / The only missing piece is a voice. / Fenrik reads your site and starts answering. / No training. No setup. / Create your AI assistant today.


**video concept:**

A high-pressure, last-minute moment: a prospective enterprise customer arrives on a software company's support page at 2 AM, needing one specific answer before a morning board meeting. The site is full of information — but completely silent. The video reframes the chatbot setup process as a revelation: the content already exists on the website; Fenrik simply gives it a voice. No training, no scripts, no coding. The visual world is a quiet neighborhood café corner at early morning — cool light, two people at a table, objects that imply urgency and decision. The structure follows: unexpected fact (your site already has the answers) → implication (but silence costs you the lead) → proof (Fenrik reads your site automatically) → CTA.


**video script:**

BEAT 1 — UNEXPECTED FACT (0–5s): Cool morning café corner. A single open notebook on a table, handwritten questions visible but not readable. Voiceover: 'Your website already has the answers.' BEAT 2 — IMPLICATION (5–13s): Two people at conversational distance — one leans forward urgently, the other is absent, seat empty. Objects on the table: a coffee cup, a closed laptop. Voiceover: 'Every service page, every FAQ, every detail you wrote — it's all there. But when a prospect lands at 2 AM with a critical question, your site says nothing.' BEAT 3 — PROOF/TWIST (13–20s): The same café table, now the laptop is open, screen glowing softly — abstract light suggesting activity, not a blank. Voiceover: 'The content exists. The only missing piece is a voice. Fenrik reads your site and starts answering — no training, no setup.' BEAT 4 — CTA (20–24s): Wide frame of the café corner, cool morning light, intentional negative space. Voiceover: 'Create your AI assistant today.'


**duration_seconds (brief):** 22–25

**CTA:** Create your AI assistant — your content is already ready (type: sign_up)

**creative_mode:** shock

**hashtags:** ["#AIchatbot","#LeadGeneration","#WebsiteAutomation","#SmallBusiness","#FenrikChat","#CustomerSupport","#AIAssistant","#ChatbotMarketing","#B2BGrowth","#NoCode"]


#### Full platform copy

##### x

```json
{
  "cta": "fenrik.chat",
  "format": "Single tweet, ≤280 characters",
  "caption": "Your website already has every answer a visitor needs. It just has no way to say them. That's the entire problem — and it's fixable in about a minute.",
  "hashtags": [
    "#AI",
    "#LeadGen"
  ],
  "title_variants": [
    "Your website already knows the answer",
    "The 2 AM question your site can't answer",
    "The content exists — the voice doesn't",
    "What your website says when a lead needs help at midnight",
    "You wrote the answers. Your site just won't say them."
  ],
  "caption_variants": [
    "Your website already has every answer a visitor needs. It just has no way to say them. That's the entire problem — and it's fixable in about a minute.",
    "A prospect lands on your site at 2 AM with one question before a board meeting. Your site is full of information. It says nothing. That silence is a lost lead.",
    "The content on your website is already enough to answer most visitor questions. The only missing piece: something to actually deliver it in real time. That's it.",
    "What does your website say when someone needs help right now and you're not there? If the answer is 'nothing' — that's where leads go quiet. fenrik.chat",
    "You spent hours writing every page on your site. Then left it completely silent when a visitor needed it most. The answers are there. Give them a voice. fenrik.chat"
  ]
}
```
##### tiktok

```json
{
  "cta": "Try it — link in bio",
  "format": "Vertical Short (9:16), 22–25s, fast cuts, burned-in subtitles",
  "caption": "Your website already has every answer a visitor could need. It just has no voice to say them. That's the only thing missing — and it takes about a minute to fix.",
  "hashtags": [
    "#smallbusiness",
    "#aitools",
    "#websitetips",
    "#leadgeneration"
  ]
}
```
##### youtube

```json
{
  "cta": "Create your AI assistant at https://fenrik.chat",
  "format": "YouTube Short (9:16), 22–25s, optimized for Shorts feed",
  "caption": "Your website already contains every answer a visitor could need — but without a way to deliver those answers in real time, qualified leads leave at 2 AM without a word. Fenrik reads your existing website content and turns it into a live AI assistant automatically. No training, no scripts, no technical setup required. Your content was always ready. Now it has a voice. Try Fenrik.chat — create your AI assistant today: https://fenrik.chat",
  "hashtags": [
    "#AIchatbot",
    "#WebsiteAutomation",
    "#LeadGeneration",
    "#FenrikChat",
    "#SmallBusiness"
  ]
}
```
##### linkedin

```json
{
  "cta": "What question did your website fail to answer last night? Worth thinking about.",
  "format": "LinkedIn text post, no video embed required",
  "caption": "Here is something worth sitting with: your website already contains the answers your visitors are looking for. Every service description, every FAQ, every detail you wrote is there — ready. But when a prospective client arrives at 2 AM needing one specific answer before a morning decision, your site offers nothing. The content has never been the problem. The missing piece is a way to deliver it in real time. Fenrik reads your existing website and builds an AI assistant from it automatically — no training, no scripts, no developer required. The gap between a website that collects traffic and one that captures leads is smaller than most businesses think.",
  "hashtags": [
    "#LeadGeneration",
    "#AIAssistant",
    "#B2BGrowth"
  ]
}
```
##### instagram

```json
{
  "cta": "Try the live preview — link in bio",
  "format": "Vertical Short (9:16), 22–25s, with burned-in subtitles",
  "caption": "Every answer a visitor needs is already on your website. Your service pages, your FAQs, your pricing — it's all there. ✍️ But when someone lands at 2 AM with a question before a big decision, your site stays silent. Fenrik reads what's already on your site and starts answering automatically. No training. No scripts. No setup. Your content was always ready — it just needed a voice.",
  "hashtags": [
    "#aiassistant",
    "#websitechat",
    "#smallbusiness",
    "#leadgeneration",
    "#saas",
    "#digitalmarketing",
    "#chatbot",
    "#businessgrowth",
    "#customerexperience",
    "#automation"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render, portrait 9:16 vertical frame. A quiet neighborhood café corner at early morning. Close detail on a single open notebook resting on a small round café table — the pages are filled with handwritten marks and underlines, no readable words. Cool clear morning light from a window to the left casts soft shadows. Pastel accents in the background — pale blue walls, a ceramic cup. No people visible. Generous negative space above the notebook. Minimal visual clutter, clean subject separation. The scene communicates: there is already information here, waiting."
    },
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render, portrait 9:16 vertical frame. A quiet neighborhood café corner at early morning. Two people at conversational distance across a small table — one person leans forward with urgency, hands flat on the table; the opposite chair is empty, slightly pushed back as if someone just left. A closed laptop sits on the table between them, a coffee cup beside it. Cool clear morning light from the left. Soft pastel tones — muted blues and warm cream. Wide frame with intentional negative space above. The scene communicates: someone needed an answer and found no one there."
    },
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render, portrait 9:16 vertical frame. The same quiet neighborhood café corner. Now the laptop on the table is open, screen facing the viewer at a three-quarter angle — the screen glows with a soft abstract light suggesting structured content and activity, no readable text or UI labels. One person's hands rest near the keyboard in a natural position. Cool clear morning light from the left. Restrained saturation, soft pastel accents. Generous negative space above and to the right. The scene communicates: the information is already there — now it has a way to speak."
    },
    {
      "source": "ai",
      "image_prompt": "Soft polished 3D render, portrait 9:16 vertical frame. Wide establishing shot of the quiet neighborhood café corner — the full table visible, open laptop glowing softly, a ceramic cup, the notebook closed beside it. No people in frame. Cool clear morning light fills the space evenly. Pale blue and cream tones, minimal clutter, generous negative space in the upper two-thirds of the frame. The scene communicates: calm resolution — the website is now ready to answer, even when no one is around."
    }
  ],
  "image_prompts": [
    "Soft polished 3D render, portrait 9:16 vertical frame. A quiet neighborhood café corner at early morning. Close detail on a single open notebook resting on a small round café table — the pages are filled with handwritten marks and underlines, no readable words. Cool clear morning light from a window to the left casts soft shadows. Pastel accents in the background — pale blue walls, a ceramic cup. No people visible. Generous negative space above the notebook. Minimal visual clutter, clean subject separation. The scene communicates: there is already information here, waiting.",
    "Soft polished 3D render, portrait 9:16 vertical frame. A quiet neighborhood café corner at early morning. Two people at conversational distance across a small table — one person leans forward with urgency, hands flat on the table; the opposite chair is empty, slightly pushed back as if someone just left. A closed laptop sits on the table between them, a coffee cup beside it. Cool clear morning light from the left. Soft pastel tones — muted blues and warm cream. Wide frame with intentional negative space above. The scene communicates: someone needed an answer and found no one there.",
    "Soft polished 3D render, portrait 9:16 vertical frame. The same quiet neighborhood café corner. Now the laptop on the table is open, screen facing the viewer at a three-quarter angle — the screen glows with a soft abstract light suggesting structured content and activity, no readable text or UI labels. One person's hands rest near the keyboard in a natural position. Cool clear morning light from the left. Restrained saturation, soft pastel accents. Generous negative space above and to the right. The scene communicates: the information is already there — now it has a way to speak.",
    "Soft polished 3D render, portrait 9:16 vertical frame. Wide establishing shot of the quiet neighborhood café corner — the full table visible, open laptop glowing softly, a ceramic cup, the notebook closed beside it. No people in frame. Cool clear morning light fills the space evenly. Pale blue and cream tones, minimal clutter, generous negative space in the upper two-thirds of the frame. The scene communicates: calm resolution — the website is now ready to answer, even when no one is around."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "cedar",
    "package_id": "992c82dc-d685-4253-8089-444b5d0bfbdd",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 62,
      "secondary": 48
    },
    "voice_source": "package_primary",
    "visual_medium": "SOFT_3D",
    "voice_reasons": [
      "funnel_solution→steady/energy(+1)",
      "mode_shock→energy(+3)",
      "profile_MINIMAL→steadiness(+2)",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+62)",
      "fit_secondary(+48)"
    ],
    "product_reveal": {
      "reasons": [
        "story_prefers_outcome_over_framed:place",
        "fallback:abstract_system"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "ABSTRACT_PRODUCT_SYSTEM",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "cedar",
    "visual_profile": "MINIMAL",
    "delivery_reason": "Delivery: clear, confident, practical. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: calm, uncluttered pacing. Delivery: measured, credible. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: clear, confident, practical. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: measured, credible. Language: en.",
    "visual_narrative": {
      "key": "place|environmental details that imply the pain before anyone speaks",
      "version": "visual-narrative@1",
      "subject_focus": "environmental details that imply the pain before anyone speaks",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "desk": 3,
        "group": 3,
        "phone": 2,
        "laptop": 7,
        "founder": 1,
        "close_up": 4,
        "overhead": 1,
        "dashboard": 3,
        "prototype": 5,
        "person_alone": 3,
        "sticky_notes": 1,
        "product_asset": 4
      },
      "supporting_carriers": [
        "object",
        "human",
        "metaphor"
      ],
      "primary_meaning_carrier": "place"
    },
    "creative_identity": {
      "key": "a quiet neighborhood café corner|quiet tension before a decision|cool clear morning light|close detail on hands or objects|wide frame with intentional negative space|two people at conversational distance, not posed|soft pastel accents, restrained saturation",
      "mood": "quiet tension before a decision",
      "camera": "close detail on hands or objects",
      "version": "creative-identity@1",
      "lighting": "cool clear morning light",
      "color_feel": "soft pastel accents, restrained saturation",
      "option_ids": {
        "mood": "quietly_tense",
        "camera": "close_detail",
        "lighting": "cool_morning",
        "color_feel": "soft_pastel",
        "composition": "wide_negative_space",
        "environment": "neighborhood_cafe",
        "human_presence": "two_at_distance"
      },
      "composition": "wide frame with intentional negative space",
      "environment": "a quiet neighborhood café corner",
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
      "SOFT_3D": 2,
      "PHOTOGRAPHIC": 1,
      "GRAPHIC_COLLAGE": 0,
      "CLEAN_ILLUSTRATION": 1,
      "TECHNICAL_BLUEPRINT": 0
    },
    "visual_medium_source": "auto",
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_medium_reasons": [
      "SOFT_3D:digital_product(+2)",
      "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
      "PHOTOGRAPHIC:carrier_place(+2)",
      "CLEAN_ILLUSTRATION:profile_minimal(+1)",
      "SOFT_3D:funnel_solution(+1)"
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "process",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "FRAMED_ASSET"
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
        "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
        "motifs": [
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "person_alone",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
        "topic": "The hidden cost of 'we'll get back to you' on a contact form",
        "motifs": [
          "group",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "group",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
        "topic": "What a qualified lead actually does when your website can't answer them",
        "motifs": [
          "phone",
          "dashboard",
          "person_alone",
          "close_up"
        ],
        "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
      },
      {
        "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
        "topic": "Repeating yourself every single day — and still not being available when it counts",
        "motifs": [
          "sticky_notes",
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
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "sticky_notes",
        "product_reveal_strategy": "FRAMED_ASSET"
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
      "package_id": "992c82dc-d685-4253-8089-444b5d0bfbdd",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "cta_selected": false,
      "visual_profile": "MINIMAL",
      "downgrade_rules": [],
      "creative_identity": {
        "key": "a quiet neighborhood café corner|quiet tension before a decision|cool clear morning light|close detail on hands or objects|wide frame with intentional negative space|two people at conversational distance, not posed|soft pastel accents, restrained saturation",
        "mood": "quiet tension before a decision",
        "camera": "close detail on hands or objects",
        "version": "creative-identity@1",
        "lighting": "cool clear morning light",
        "color_feel": "soft pastel accents, restrained saturation",
        "option_ids": {
          "mood": "quietly_tense",
          "camera": "close_detail",
          "lighting": "cool_morning",
          "color_feel": "soft_pastel",
          "composition": "wide_negative_space",
          "environment": "neighborhood_cafe",
          "human_presence": "two_at_distance"
        },
        "composition": "wide frame with intentional negative space",
        "environment": "a quiet neighborhood café corner",
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
          "creative_mode": null,
          "visual_medium": "SOFT_3D",
          "meaning_carrier": "process",
          "cta_composition_id": null,
          "dominant_subject_motif": "laptop",
          "product_reveal_strategy": "FRAMED_ASSET"
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
          "creative_mode": null,
          "visual_medium": "SOFT_3D",
          "meaning_carrier": "object",
          "cta_composition_id": null,
          "dominant_subject_motif": "laptop",
          "product_reveal_strategy": "FRAMED_ASSET"
        },
        {
          "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
          "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
          "motifs": [
            "person_alone"
          ],
          "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
          "typed_cta": false,
          "scene_types": [
            "IMAGE",
            "IMAGE",
            "IMAGE",
            "IMAGE"
          ],
          "creative_mode": null,
          "visual_medium": "CLEAN_ILLUSTRATION",
          "meaning_carrier": "object",
          "cta_composition_id": null,
          "dominant_subject_motif": "person_alone",
          "product_reveal_strategy": "FRAMED_ASSET"
        },
        {
          "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
          "topic": "The hidden cost of 'we'll get back to you' on a contact form",
          "motifs": [
            "group",
            "prototype"
          ],
          "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
          "typed_cta": false,
          "scene_types": [
            "IMAGE",
            "IMAGE",
            "IMAGE",
            "IMAGE"
          ],
          "creative_mode": null,
          "visual_medium": "TECHNICAL_BLUEPRINT",
          "meaning_carrier": "object",
          "cta_composition_id": null,
          "dominant_subject_motif": "group",
          "product_reveal_strategy": "FRAMED_ASSET"
        },
        {
          "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
          "topic": "What a qualified lead actually does when your website can't answer them",
          "motifs": [
            "phone",
            "dashboard",
            "person_alone",
            "close_up"
          ],
          "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
          "typed_cta": false,
          "scene_types": [
            "IMAGE",
            "IMAGE",
            "IMAGE",
            "IMAGE",
            "IMAGE"
          ],
          "creative_mode": null,
          "visual_medium": "PHOTOGRAPHIC",
          "meaning_carrier": "place",
          "cta_composition_id": null,
          "dominant_subject_motif": "phone",
          "product_reveal_strategy": "PRODUCT_OUTCOME"
        },
        {
          "hook": "I'll be straight with you — I've answered the same five questions so many times I could recite them in my sleep. And yet my website sat there, silent, saying absolutely nothing.",
          "topic": "Repeating yourself every single day — and still not being available when it counts",
          "motifs": [
            "sticky_notes",
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
          "creative_mode": null,
          "visual_medium": "TECHNICAL_BLUEPRINT",
          "meaning_carrier": "object",
          "cta_composition_id": null,
          "dominant_subject_motif": "sticky_notes",
          "product_reveal_strategy": "FRAMED_ASSET"
        }
      ]
    }
  }
}
```

#### Scene-by-scene

| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |
| ---: | --- | --- | --- | --- | --- |
| 1 | scene-1 | IMAGE | image@1 | `/` | — |
| 2 | scene-2 | IMAGE | image@1 | `/` | — |
| 3 | scene-3 | IMAGE | image@1 | `/` | — |
| 4 | scene-4 | IMAGE | image@1 | `/` | — |

**Scene 1 (scene-1) — image_prompt (job input)**

```
Soft polished 3D render, portrait 9:16 vertical frame. A quiet neighborhood café corner at early morning. Close detail on a single open notebook resting on a small round café table — the pages are filled with handwritten marks and underlines, no readable words. Cool clear morning light from a window to the left casts soft shadows. Pastel accents in the background — pale blue walls, a ceramic cup. No people visible. Generous negative space above the notebook. Minimal visual clutter, clean subject separation. The scene communicates: there is already information here, waiting.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Soft polished 3D render, portrait 9:16 vertical frame. A quiet neighborhood café corner at early morning. Close detail on a single open notebook resting on a small round café table — the pages are filled with handwritten marks and underlines, no readable words. Cool clear morning light from a window to the left casts soft shadows. Pastel accents in the background — pale blue walls, a ceramic cup. No people visible. Generous negative space above the notebook. Minimal visual clutter, clean subject separation. The scene communicates: there is already information here, waiting."
  }
}
```
**Scene 2 (scene-2) — image_prompt (job input)**

```
Soft polished 3D render, portrait 9:16 vertical frame. A quiet neighborhood café corner at early morning. Two people at conversational distance across a small table — one person leans forward with urgency, hands flat on the table; the opposite chair is empty, slightly pushed back as if someone just left. A closed laptop sits on the table between them, a coffee cup beside it. Cool clear morning light from the left. Soft pastel tones — muted blues and warm cream. Wide frame with intentional negative space above. The scene communicates: someone needed an answer and found no one there.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Soft polished 3D render, portrait 9:16 vertical frame. A quiet neighborhood café corner at early morning. Two people at conversational distance across a small table — one person leans forward with urgency, hands flat on the table; the opposite chair is empty, slightly pushed back as if someone just left. A closed laptop sits on the table between them, a coffee cup beside it. Cool clear morning light from the left. Soft pastel tones — muted blues and warm cream. Wide frame with intentional negative space above. The scene communicates: someone needed an answer and found no one there."
  }
}
```
**Scene 3 (scene-3) — image_prompt (job input)**

```
Soft polished 3D render, portrait 9:16 vertical frame. The same quiet neighborhood café corner. Now the laptop on the table is open, screen facing the viewer at a three-quarter angle — the screen glows with a soft abstract light suggesting structured content and activity, no readable text or UI labels. One person's hands rest near the keyboard in a natural position. Cool clear morning light from the left. Restrained saturation, soft pastel accents. Generous negative space above and to the right. The scene communicates: the information is already there — now it has a way to speak.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Soft polished 3D render, portrait 9:16 vertical frame. The same quiet neighborhood café corner. Now the laptop on the table is open, screen facing the viewer at a three-quarter angle — the screen glows with a soft abstract light suggesting structured content and activity, no readable text or UI labels. One person's hands rest near the keyboard in a natural position. Cool clear morning light from the left. Restrained saturation, soft pastel accents. Generous negative space above and to the right. The scene communicates: the information is already there — now it has a way to speak."
  }
}
```
**Scene 4 (scene-4) — image_prompt (job input)**

```
Soft polished 3D render, portrait 9:16 vertical frame. Wide establishing shot of the quiet neighborhood café corner — the full table visible, open laptop glowing softly, a ceramic cup, the notebook closed beside it. No people in frame. Cool clear morning light fills the space evenly. Pale blue and cream tones, minimal clutter, generous negative space in the upper two-thirds of the frame. The scene communicates: calm resolution — the website is now ready to answer, even when no one is around.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Soft polished 3D render, portrait 9:16 vertical frame. Wide establishing shot of the quiet neighborhood café corner — the full table visible, open laptop glowing softly, a ceramic cup, the notebook closed beside it. No people in frame. Cool clear morning light fills the space evenly. Pale blue and cream tones, minimal clutter, generous negative space in the upper two-thirds of the frame. The scene communicates: calm resolution — the website is now ready to answer, even when no one is around."
  }
}
```
#### TTS / voice

- **requested TTS voice (job input):** cedar
- **resolved at render:** cedar
- **project voice resolution:** legacy default (no presentation override) → `cedar`
- **differs from alloy:** yes
- **TTS instructions applied:** yes

**tts_instructions:**

Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: clear, confident, practical. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: measured, credible. Language: en.


- **voiceover characters:** 349
- **estimated words:** 62
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
    "IMAGE"
  ],
  "prompt_presentation_types": null
}
```

#### Image generation / moderation

No `image_generation_warnings` on render_spec — all scenes used primary provider path.

#### Final video details

- **MP4:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b2561f42-e709-4f8e-bb29-1f76db60af22/output.mp4
- **thumbnail:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b2561f42-e709-4f8e-bb29-1f76db60af22/thumbnail.png
- **subtitles:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b2561f42-e709-4f8e-bb29-1f76db60af22/subtitles.srt
- **video_duration:** —
- **subtitle_source:** —
- **render_warning:** false

#### Admin links (paths, no signed tokens)

- Production: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/production`
- Review: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/review`
- Content packages: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/content-packages`
- Videos / scene editor: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/videos`
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 12 — The Reputation Tax of Looking Unavailable

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `0079320c-f2b8-48ca-acda-8924c7b3c2ab` |
| strategy_item_id | `6b8b6921-1ab4-4f23-9bc3-9326e5f59fe6` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | solution_aware |
| created_at | 2026-07-16T23:21:51.205774+00:00 |
| updated_at | 2026-07-16T23:21:53.183479+00:00 |
| primary content_item_id | `d4dc77dc-9b37-4700-9a75-4ed6a172a7f0` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** How a service business captures leads while the owner is in back-to-back appointments
- **angle:** For beauty salons, HVAC companies, and local service businesses: when the phone is ringing and the front desk is slammed, the website can be handling online inquiries simultaneously — no extra staff, no missed contacts.
- **package_index:** 10
- **platform:** tiktok
- **format:** reel
- **priority:** 5
- **funnel_stage (column):** solution_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "For beauty salons, HVAC companies, and local service businesses: when the phone is ringing and the front desk is slammed, the website can be handling online inquiries simultaneously — no extra staff, no missed contacts.",
  "topic": "How a service business captures leads while the owner is in back-to-back appointments",
  "source": "production_run",
  "package_index": 10,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

You spent thousands making your business look professional — and then your website tells every visitor to fill out a form and wait.


**voiceover_text:**

You spent thousands making your business look professional. The logo, the photos, the website copy — all of it. And then a real customer shows up at 9 PM with a real question, and your site says: fill out this form. We'll get back to you. That's not a website problem. That's a reputation problem. Fenrik reads your existing site and answers visitors instantly — no developer, no setup headache. Create your AI assistant today.


**subtitles:**

You spent thousands looking professional. / Then a visitor shows up at 9 PM with a real question. / And your site says: fill out this form. / We'll get back to you. / That's not a website problem. / That's a reputation problem. / Fenrik reads your site and answers instantly. / No developer. No setup headache. / Create your AI assistant today.


**video concept:**

A fast-paced vertical short built around the social-judgment angle: the gap between a polished brand and a silent website is a reputation risk. Open on the observation — money spent on looking professional. Twist: the website's response to a real visitor undermines all of it. Payoff: the reveal that fixing this requires no developer and no integration complexity. CTA closes the loop. Visual world is clean flat illustration with workflow artifacts — a glossy brand card, a printed invoice, an empty contact form — escalating toward the product resolution. No laptop-at-desk default. Tone is witty, warm, slightly stinging — like a friend calling out an obvious blind spot.


**video script:**

BEAT 1 — OBSERVATION (0–4s): Flat illustration of polished brand artifacts on a studio surface — a crisp business card, a printed brochure, a framed logo — all immaculate. Voiceover: 'You spent thousands making your business look professional.' 

BEAT 2 — MEANING (4–10s): Flat illustration of a contact form printout pinned to a board, alone under a soft light, surrounded by empty space — the only reply the website offers. Voiceover: 'Then a real customer shows up at 9 PM with a real question — and your site says: fill out this form. We'll get back to you.' 

BEAT 3 — TWIST / REVEAL (10–17s): Flat illustration of a split-panel — left side: the polished brand artifacts; right side: the lonely contact form with a small clock icon beside it. The contrast is immediate. Voiceover: 'That's not a website problem. That's a reputation problem. And fixing it doesn't take a developer or a six-month integration.' 

BEAT 4 — PAYOFF / CTA (17–23s): Flat illustration of the same studio surface — the brand artifacts now joined by a softly glowing chat bubble rising from a printed web page, calm and instant. Voiceover: 'Fenrik reads your existing site and answers visitors instantly. Create your AI assistant today.'


**duration_seconds (brief):** 23

**CTA:** Create your AI assistant — let your site look as good as your brand (type: sign_up)

**creative_mode:** 

**hashtags:** ["#smallbusiness","#aichatbot","#leadgeneration","#websitetips","#customerexperience","#digitalmarketing","#servicebusiness","#beautysalon","#marketingagency","#businessgrowth"]


#### Full platform copy

##### x

```json
{
  "cta": "Try Fenrik free: https://fenrik.chat",
  "format": "Single post, opinionated, terse",
  "caption": "You spent real money on your brand. Your website's after-hours reply is still a contact form. That's a reputation gap, not a tech gap — and it doesn't take a developer to close it.",
  "hashtags": [
    "#smallbusiness",
    "#aichatbot"
  ],
  "title_variants": [
    "Your brand looks polished. Your website's after-hours response does not.",
    "The quiet reputation tax of a contact form",
    "Polished logo. Lonely contact form. Real reputation problem.",
    "Every service business has this gap — most don't notice it until a lead is gone",
    "Your website is the one team member that never clocks out — is it actually helpful?"
  ],
  "caption_variants": [
    "You spent real money on your brand. Your website's after-hours reply is still a contact form. That's a reputation gap, not a tech gap — and it doesn't take a developer to close it.",
    "A visitor lands on your site at 9 PM. Real question. Real intent. Your site hands them a form and a wait. That's not a website problem. That's a brand problem. Fenrik fixes it without a developer.",
    "Polished logo. Professional photos. Thoughtful copy. Contact form that says 'we'll get back to you.' One of these is doing serious damage to the others.",
    "Most service businesses never connect the dots: the leads they're losing after hours aren't a traffic problem — they're an availability problem. And availability doesn't require hiring anyone.",
    "Your website is open right now. Someone might be on it. What does it say when they ask a question? If the answer is 'nothing,' that's worth fixing before tomorrow morning."
  ]
}
```
##### tiktok

```json
{
  "cta": "Try it free — link in bio",
  "format": "Vertical short (9:16), 23s, fast cuts, flat illustration style",
  "caption": "You paid for the logo, the photos, the whole website. Then someone shows up after hours and gets a contact form. That's not a tech problem — that's a reputation problem. Fenrik fixes it in about a minute, no developer needed.",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#leadgeneration",
    "#aichatbot"
  ]
}
```
##### youtube

```json
{
  "cta": "Try the free preview at https://fenrik.chat",
  "format": "Vertical Short (9:16), 23s, flat illustration style",
  "caption": "Your brand looks professional — but does your website act like it? When a visitor shows up after hours with a real question and gets a contact form, that polished reputation takes a quiet hit. Fenrik.chat reads your existing website content and builds an AI assistant that answers visitors instantly — no developer, no complex integration, no manual training required. See how service businesses are closing the gap between looking good and actually being available. Try a live preview at fenrik.chat — no account needed.",
  "hashtags": [
    "#AIchatbot",
    "#smallbusiness",
    "#websiteoptimization",
    "#leadgeneration",
    "#customerservice"
  ]
}
```
##### linkedin

```json
{
  "cta": "Create your AI assistant at fenrik.chat",
  "format": "Text post, professional tone, B2B",
  "caption": "A service business can spend thousands on brand identity — logo, website copy, professional photography. Then a prospective client visits at 9 PM, has a genuine question about pricing or availability, and the site responds with a contact form. The brand signal that took months to build gets quietly undermined in seconds. The fix does not require a developer or a custom integration project. Fenrik reads your existing website and creates an AI assistant that answers visitors immediately. The gap between looking professional and being available is smaller than most businesses think.",
  "hashtags": [
    "#SmallBusiness",
    "#CustomerExperience",
    "#AIchatbot"
  ],
  "title_variants": [
    "Your brand looks polished. Your website's after-hours response does not.",
    "The reputation cost most service businesses never calculate"
  ],
  "caption_variants": [
    "A service business can spend thousands on brand identity — logo, website copy, professional photography. Then a prospective client visits at 9 PM, has a genuine question about pricing or availability, and the site responds with a contact form. The brand signal that took months to build gets quietly undermined in seconds. The fix does not require a developer or a custom integration project. Fenrik reads your existing website and creates an AI assistant that answers visitors immediately. The gap between looking professional and being available is smaller than most businesses think.",
    "There is a version of your business that looks polished and a version that responds when it matters. For most service businesses, those two versions are not the same. A visitor with a real question at an inconvenient hour gets a contact form — and moves on. No complex integration required to close that gap. Fenrik builds an AI assistant directly from your website content, instantly, without a developer. Your brand already did the hard work. The assistant just needs to show up."
  ]
}
```
##### instagram

```json
{
  "cta": "Create your AI assistant — link in bio",
  "format": "Vertical Reel (9:16), 23s, flat illustration style",
  "caption": "You invested in your brand — the logo, the copy, the photos. But when a real client lands on your site at 9 PM and asks a real question, your website hands them a contact form and a prayer. 🙃 That gap between polished and responsive? That's where leads disappear. Fenrik reads your existing website and starts answering visitors instantly — no developer, no complex setup, no waiting. Your brand deserves a website that actually talks back.",
  "hashtags": [
    "#smallbusiness",
    "#digitalmarketing",
    "#websitetips",
    "#aichatbot",
    "#leadgeneration",
    "#customerexperience",
    "#businessgrowth",
    "#servicebusiness",
    "#beautysalon",
    "#marketingagency"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean quiet studio-like interior surface viewed over-the-shoulder. Wide frame with intentional negative space. Gentle side lighting with soft shadows. Soft pastel accents, restrained saturation. On the surface: a crisp business card, a neatly folded printed brochure, and a framed logo card — all arranged with care, suggesting deliberate investment in brand presentation. A human silhouette is barely visible at the edge of the frame, seen from behind, looking at the objects. No readable text, no labels, no UI."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean quiet studio-like interior. Over-the-shoulder framing, wide frame with intentional negative space. Gentle side lighting with soft shadows. Soft pastel accents. A single printed contact form sheet is pinned to a plain board — isolated, surrounded by empty space. Beside it, a small illustrated clock icon floats quietly. The form looks clinical and lonely against the warm studio backdrop. No readable text, no labels, no UI elements."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean quiet studio-like interior. Over-the-shoulder framing, wide frame with intentional negative space. Gentle side lighting with soft shadows. Soft pastel accents, restrained saturation. A split-panel composition: left half shows the polished brand artifacts — business card, brochure, logo card — arranged neatly; right half shows the same lonely contact form printout with a small clock icon beside it. A thin soft dividing line separates the two halves. The contrast between investment and response is the central visual tension. No readable text, no labels, no UI."
    },
    {
      "source": "ai",
      "image_prompt": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean quiet studio-like interior surface. Over-the-shoulder framing, wide frame with intentional negative space. Gentle side lighting with soft shadows. Soft pastel accents, restrained saturation. The same studio surface from the first beat — the polished brand artifacts are still present, but now a softly glowing illustrated chat bubble rises gently from a printed web page lying flat on the surface. The chat bubble is calm, rounded, and warm — suggesting instant response. The overall mood is resolved and quietly confident. No readable text, no labels, no UI."
    }
  ],
  "image_prompts": [
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean quiet studio-like interior surface viewed over-the-shoulder. Wide frame with intentional negative space. Gentle side lighting with soft shadows. Soft pastel accents, restrained saturation. On the surface: a crisp business card, a neatly folded printed brochure, and a framed logo card — all arranged with care, suggesting deliberate investment in brand presentation. A human silhouette is barely visible at the edge of the frame, seen from behind, looking at the objects. No readable text, no labels, no UI.",
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean quiet studio-like interior. Over-the-shoulder framing, wide frame with intentional negative space. Gentle side lighting with soft shadows. Soft pastel accents. A single printed contact form sheet is pinned to a plain board — isolated, surrounded by empty space. Beside it, a small illustrated clock icon floats quietly. The form looks clinical and lonely against the warm studio backdrop. No readable text, no labels, no UI elements.",
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean quiet studio-like interior. Over-the-shoulder framing, wide frame with intentional negative space. Gentle side lighting with soft shadows. Soft pastel accents, restrained saturation. A split-panel composition: left half shows the polished brand artifacts — business card, brochure, logo card — arranged neatly; right half shows the same lonely contact form printout with a small clock icon beside it. A thin soft dividing line separates the two halves. The contrast between investment and response is the central visual tension. No readable text, no labels, no UI.",
    "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. A clean quiet studio-like interior surface. Over-the-shoulder framing, wide frame with intentional negative space. Gentle side lighting with soft shadows. Soft pastel accents, restrained saturation. The same studio surface from the first beat — the polished brand artifacts are still present, but now a softly glowing illustrated chat bubble rises gently from a printed web page lying flat on the surface. The chat bubble is calm, rounded, and warm — suggesting instant response. The overall mood is resolved and quietly confident. No readable text, no labels, no UI."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "cedar",
    "package_id": "0079320c-f2b8-48ca-acda-8924c7b3c2ab",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 53,
      "secondary": 50
    },
    "voice_source": "package_primary",
    "visual_medium": "CLEAN_ILLUSTRATION",
    "voice_reasons": [
      "funnel_solution→steady/energy(+1)",
      "mode_observation→steady/warmth",
      "profile_NATURAL→warmth(+2)",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+51)",
      "fit_secondary(+50)",
      "soft_tie_recent_secondary(4)→primary(+2)"
    ],
    "product_reveal": {
      "reasons": [
        "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "FRAMED_ASSET",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "cedar",
    "visual_profile": "NATURAL",
    "delivery_reason": "Delivery: clear, confident, practical. Delivery: thoughtful, reflective, steady pacing. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: clear, confident, practical. Delivery: thoughtful, reflective, steady pacing. Delivery: confident, concise, not aggressive. Language: en.",
    "visual_narrative": {
      "key": "object|workflow artifacts: notes, cards, printouts, boards, inbox piles, tools of the trade",
      "version": "visual-narrative@1",
      "subject_focus": "workflow artifacts: notes, cards, printouts, boards, inbox piles, tools of the trade",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "cafe": 2,
        "desk": 3,
        "group": 4,
        "phone": 2,
        "laptop": 7,
        "close_up": 6,
        "overhead": 1,
        "dashboard": 2,
        "prototype": 4,
        "person_alone": 3,
        "sticky_notes": 1,
        "product_asset": 3
      },
      "supporting_carriers": [
        "place",
        "process",
        "transformation"
      ],
      "primary_meaning_carrier": "object"
    },
    "creative_identity": {
      "key": "a clean, quiet studio-like interior|curious, alert attention|gentle side lighting with soft shadows|over-the-shoulder framing|wide frame with intentional negative space|person seen from behind or as silhouette|soft pastel accents, restrained saturation",
      "mood": "curious, alert attention",
      "camera": "over-the-shoulder framing",
      "version": "creative-identity@1",
      "lighting": "gentle side lighting with soft shadows",
      "color_feel": "soft pastel accents, restrained saturation",
      "option_ids": {
        "mood": "curious",
        "camera": "over_shoulder",
        "lighting": "gentle_side_light",
        "color_feel": "soft_pastel",
        "composition": "wide_negative_space",
        "environment": "quiet_studio",
        "human_presence": "silhouette_back"
      },
      "composition": "wide frame with intentional negative space",
      "environment": "a clean, quiet studio-like interior",
      "human_presence": "person seen from behind or as silhouette"
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
      "SOFT_3D": 1,
      "PHOTOGRAPHIC": 0,
      "GRAPHIC_COLLAGE": 0,
      "CLEAN_ILLUSTRATION": 4,
      "TECHNICAL_BLUEPRINT": 1
    },
    "visual_medium_source": "auto",
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_medium_reasons": [
      "SOFT_3D:digital_product(+2)",
      "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
      "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
      "TECHNICAL_BLUEPRINT:carrier_process(+1)",
      "CLEAN_ILLUSTRATION:saas_abstract(+1)",
      "TECHNICAL_BLUEPRINT:saas_system(+1)",
      "SOFT_3D:funnel_solution(+1)",
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "process",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "FRAMED_ASSET"
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
        "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
        "motifs": [
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "person_alone",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
        "topic": "The hidden cost of 'we'll get back to you' on a contact form",
        "motifs": [
          "group",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "group",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I check my analytics every morning like it's going to say something different. It never does. And I finally figured out why.",
        "topic": "What a qualified lead actually does when your website can't answer them",
        "motifs": [
          "phone",
          "dashboard",
          "person_alone",
          "close_up"
        ],
        "closing": "Portrait 9:16 vertical frame. Soft-focus urban street exterior. A person seen from behind, standing on a quiet urban pav",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "phone",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
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
- **voiceover characters:** 427
- **estimated words:** 75
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
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 13 — What Happens to Your Business When Nobody's There to Answer

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `6841d199-8768-4943-8253-2ff30481e61f` |
| strategy_item_id | `ea68d862-d29b-4865-b621-3520854e6817` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | solution_aware |
| created_at | 2026-07-16T23:23:01.930294+00:00 |
| updated_at | 2026-07-16T23:23:03.925714+00:00 |
| primary content_item_id | `97b67019-caaf-425c-9d7d-4d62b0bad690` |
| video_job_id | `8c668ff5-9b63-4e8a-9640-0157befeafc4` |
| video_job status | processing |

#### Strategy input

- **topic:** From URL to working AI assistant — what that actually looks like step by step
- **angle:** Demystify the setup without overselling. Walk through what happens when you paste a website URL: the AI reads the content, builds a knowledge base, and you can preview it answering real questions — before committing to anything.
- **package_index:** 11
- **platform:** tiktok
- **format:** reel
- **priority:** 5
- **funnel_stage (column):** solution_aware
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "Demystify the setup without overselling. Walk through what happens when you paste a website URL: the AI reads the content, builds a knowledge base, and you can preview it answering real questions — before committing to anything.",
  "topic": "From URL to working AI assistant — what that actually looks like step by step",
  "source": "production_run",
  "package_index": 11,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

What does your website actually do when a customer needs help and you're not there?


**voiceover_text:**

An accountant comes back from two weeks off. Analytics show dozens of visits. Not one contact form filled out. Those weren't random clicks — those were real people with real questions who hit silence and left. No staff. No budget for a support team. Just a website that had no way to answer. Paste your URL. In about a minute, it does. Start free at fenrik.chat.


**subtitles:**

What does your website do when you're not there?

An accountant. Two weeks off.
Dozens of visits. Zero inquiries.

Real people. Real questions.
They hit silence — and left.

No staff. No support budget.
Just a website that couldn't answer.

Paste your URL.
In about a minute — it can.

Start free at fenrik.chat


**video concept:**

A photorealistic, close-detail short anchored in the worst-case consequence of having no 24/7 support: a business owner returns to discover a trail of missed opportunities — real visitors who needed answers and got nothing. The story moves from the quiet evidence of absence (an untouched inbox, empty contact submissions) to the revelation that the website itself could have answered every one of them, automatically, from its own content. The visual world is a bright co-working space in overcast daylight — warm wood surfaces, amber highlights, implied human presence just off-screen. No laptops as the default hero; instead, environmental and object-driven storytelling carries the meaning. The twist lands when the solution is revealed to be already within reach — not a big project, just a URL paste.


**video script:**

HOOK (0–3s): Close-detail shot — an open planner on a warm wood desk, pages showing two weeks blocked off, a single sticky note reading 'back Monday'. Voiceover: 'What does your website actually do when a customer needs help and you're not there?'

SETUP / CONFLICT (3–10s): Cut to a tight symmetrical shot of a tidy co-working desk — a chair pushed in, a coffee mug left from before the trip, a small stack of unopened mail. The space is still, overcast light through the window. Voiceover: 'An accountant comes back from two weeks off. Analytics show dozens of visits. Not one contact form filled out. Those weren't random clicks — those were real people with real questions who hit silence and left.'

TWIST (10–16s): Close detail on two hands resting on the warm wood surface — palms down, still, the posture of someone who just realized what they missed. Voiceover: 'No staff. No budget for a support team. Just a website that had no way to answer.'

RESOLUTION / CTA (16–23s): A clean over-the-shoulder shot — a person seated at a bright co-working desk, typing a single URL into a browser on an open laptop, screen angled toward camera showing a structured interface with recognizable chat and input elements (no readable text). Warm amber highlights, calm symmetrical framing. Voiceover: 'Paste your URL. In about a minute, it does. Start free at fenrik.chat.'


**duration_seconds (brief):** 23

**CTA:** Paste your URL and let your website answer — start free at fenrik.chat (type: sign_up)

**creative_mode:** story

**hashtags:** ["#smallbusiness","#aiassistant","#websitetips","#leadgeneration","#chatbot","#businessautomation","#aitools","#servicebusiness","#fenrikchat","#24x7support"]


#### Full platform copy

##### x

```json
{
  "cta": "Try the free preview — no account needed",
  "format": "Single tweet, under 280 characters, link included",
  "caption": "Came back from two weeks off. Analytics: dozens of visits. Contact form: empty. Those weren't bots — they were real people with questions. My website just had nothing to say. Paste a URL, it answers in about a minute. fenrik.chat",
  "hashtags": [
    "#smallbusiness",
    "#aitools"
  ],
  "title_variants": [
    "The Worst Part of Coming Back From Vacation",
    "Your Website's Silence Has a Real Cost",
    "What Two Weeks Away Reveals About Your Website",
    "No Staff. No Budget. Still 24/7 Support.",
    "The Question Your Website Couldn't Answer While You Were Gone"
  ],
  "caption_variants": [
    "Came back from two weeks off. Analytics: dozens of visits. Contact form: empty. Those weren't bots — they were real people with questions. My website just had nothing to say. Paste a URL, it answers in about a minute. fenrik.chat",
    "Every visitor your website can't answer is a lead you'll never know you lost. No staff required. No code. Paste your URL — Fenrik reads your content and builds an AI assistant from it automatically. Preview it free before you commit. fenrik.chat",
    "Two weeks. Dozens of visitors. Zero inquiries. The website was up the whole time — it just had nothing to say. That's not a traffic problem. That's a response problem. fenrik.chat fixes it in about a minute.",
    "You don't need a support team to answer questions 24/7. You need a website that can do it from your existing content. No training. No developer. No waiting. fenrik.chat",
    "What does your website say to a visitor at 11pm when you're asleep? If the answer is nothing — that's the problem. Fenrik.chat turns your existing website into an AI assistant that answers, captures leads, and never clocks out. Try the preview free."
  ]
}
```
##### tiktok

```json
{
  "cta": "try it yourself — link in bio",
  "format": "Vertical short-form video (9:16), 15–25s, fast cuts, subtitles on-screen",
  "caption": "came back from vacation and checked my analytics. dozens of visits. zero messages. those people had questions — my website just had nothing to say. now it answers while i'm gone. took about a minute to set up.",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#aitools",
    "#leadgeneration"
  ]
}
```
##### youtube

```json
{
  "cta": "Try the free preview at fenrik.chat — no account required",
  "format": "Vertical YouTube Short (9:16), 15–25s, subtitles, product preview in final beat",
  "caption": "What Your Website Does to Visitors When You're Away — and How to Fix It in 60 Seconds\n\nEvery business has a version of this story: you step away for a few days, check your analytics when you're back, and realize people visited — but nobody reached out. They had questions. Your website had nothing to say.\n\nThis video walks through what actually happens when you paste your website URL into Fenrik.chat: the AI reads your existing content, builds a knowledge base automatically, and you can preview it answering real visitor questions before you commit to anything.\n\nNo developer. No training. No guesswork. Try the live preview at https://fenrik.chat",
  "hashtags": [
    "#AIchatbot",
    "#websiteautomation",
    "#smallbusinesstools",
    "#leadgeneration",
    "#fenrikchat"
  ]
}
```
##### linkedin

```json
{
  "cta": "Has your website ever gone quiet while you were away? Curious what others have seen.",
  "format": "Text post with optional video attach, professional tone, no decorative emoji",
  "caption": "A business owner returns from two weeks off. Analytics show dozens of website visits during that time. The contact form: empty.\n\nThose weren't random sessions. They were prospective clients with questions — who found a website that couldn't answer them and moved on.\n\nThe gap isn't headcount. It's the website itself having no way to respond. Fenrik.chat reads your existing website content and builds an AI assistant from it automatically — no developer, no training, no custom project. You can preview it answering real questions before you sign up for anything.\n\nFor any service business that can't staff a 24/7 support function, that's a meaningful difference. Worth a look: https://fenrik.chat",
  "hashtags": [
    "#SmallBusiness",
    "#AItools",
    "#LeadGeneration"
  ]
}
```
##### instagram

```json
{
  "cta": "See how it works — link in bio",
  "format": "Vertical Reel (9:16), 15–25s, subtitles on-screen, product preview in final beat",
  "caption": "Two weeks away. Dozens of website visitors. Not one inquiry waiting when I got back. 📭\n\nThose weren't bots — they were real people with real questions. They found silence and moved on.\n\nThe fix wasn't hiring someone. It was pasting a URL and letting the website answer for itself. Setup took about a minute. No code, no configuration, no waiting.",
  "hashtags": [
    "#smallbusiness",
    "#websitetips",
    "#aiassistant",
    "#leadgeneration",
    "#businessautomation",
    "#chatbot",
    "#servicebusiness",
    "#worksmarter",
    "#digitaltools",
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
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Close detail on an open paper planner resting on a warm wood surface — two weeks of dates are blocked off with a diagonal line, a small sticky note sits at the edge of the open page. Amber highlights on the wood grain. Implied human presence just off-screen — a jacket draped over a chair back visible at the far edge of frame. Symmetrical, calm composition. No readable text on the planner or sticky note. Natural lighting, believable setting, restrained contrast."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. A tidy desk seen from slightly above table height — a chair pushed neatly in, a ceramic coffee mug left from before a trip, a small stack of unopened envelopes. The surface is warm wood with amber highlights. The space is still and quiet. No person visible but a coat hook with a bag on the wall implies someone is about to return. Symmetrical framing, calm composition, overcast window light from behind. No text, labels, or screens visible."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Extreme close detail on two adult hands resting palms-down on a warm wood desk surface — fingers relaxed, still, the posture of someone who has just absorbed difficult news. Amber highlights catch the edge of the hands and the wood grain. A coffee mug is softly out of focus in the upper background. Symmetrical, calm composition. No text, devices, or screens in frame. Natural light, restrained contrast."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Over-the-shoulder view of a person seated at a warm wood desk, typing a single URL into a browser on an open laptop — the laptop screen faces partially toward camera, displaying a structured chat interface with recognizable input fields and message bubbles rendered as abstract visual shapes without readable text. Warm amber highlights on the desk surface. Hands on the keyboard in a natural typing position. Symmetrical, calm composition. Implied resolution energy — the person's posture is relaxed and forward-leaning. No readable text anywhere."
    }
  ],
  "image_prompts": [
    "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Close detail on an open paper planner resting on a warm wood surface — two weeks of dates are blocked off with a diagonal line, a small sticky note sits at the edge of the open page. Amber highlights on the wood grain. Implied human presence just off-screen — a jacket draped over a chair back visible at the far edge of frame. Symmetrical, calm composition. No readable text on the planner or sticky note. Natural lighting, believable setting, restrained contrast.",
    "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. A tidy desk seen from slightly above table height — a chair pushed neatly in, a ceramic coffee mug left from before a trip, a small stack of unopened envelopes. The surface is warm wood with amber highlights. The space is still and quiet. No person visible but a coat hook with a bag on the wall implies someone is about to return. Symmetrical framing, calm composition, overcast window light from behind. No text, labels, or screens visible.",
    "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Extreme close detail on two adult hands resting palms-down on a warm wood desk surface — fingers relaxed, still, the posture of someone who has just absorbed difficult news. Amber highlights catch the edge of the hands and the wood grain. A coffee mug is softly out of focus in the upper background. Symmetrical, calm composition. No text, devices, or screens in frame. Natural light, restrained contrast.",
    "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Over-the-shoulder view of a person seated at a warm wood desk, typing a single URL into a browser on an open laptop — the laptop screen faces partially toward camera, displaying a structured chat interface with recognizable input fields and message bubbles rendered as abstract visual shapes without readable text. Warm amber highlights on the desk surface. Hands on the keyboard in a natural typing position. Symmetrical, calm composition. Implied resolution energy — the person's posture is relaxed and forward-leaning. No readable text anywhere."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "shimmer",
    "package_id": "6841d199-8768-4943-8253-2ff30481e61f",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 51,
      "secondary": 62
    },
    "voice_source": "package_secondary",
    "visual_medium": "PHOTOGRAPHIC",
    "voice_reasons": [
      "funnel_solution→steady/energy(+1)",
      "mode_story→warmth(+3)",
      "profile_NATURAL→warmth(+2)",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+51)",
      "fit_secondary(+62)"
    ],
    "product_reveal": {
      "reasons": [
        "story_prefers_outcome_over_framed:place",
        "fallback:product_outcome"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "PRODUCT_OUTCOME",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "shimmer",
    "visual_profile": "NATURAL",
    "delivery_reason": "Delivery: clear, confident, practical. Delivery: warm, intimate, conversational storytelling pace. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: clear, confident, practical. Delivery: warm, intimate, conversational storytelling pace. Delivery: confident, concise, not aggressive. Language: en.",
    "visual_narrative": {
      "key": "place|a location that belongs to this product's world (not a default tech office)",
      "version": "visual-narrative@1",
      "subject_focus": "a location that belongs to this product's world (not a default tech office)",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "cafe": 2,
        "desk": 1,
        "group": 3,
        "phone": 2,
        "laptop": 5,
        "close_up": 6,
        "overhead": 1,
        "dashboard": 1,
        "prototype": 4,
        "person_alone": 4,
        "sticky_notes": 1,
        "product_asset": 2
      },
      "supporting_carriers": [
        "object",
        "human",
        "metaphor"
      ],
      "primary_meaning_carrier": "place"
    },
    "creative_identity": {
      "key": "a bright co-working space in daylight|reflective, thoughtful pause|overcast diffused daylight|close detail on hands or objects|symmetrical, calm composition|implied human presence just off-screen|warm wood surfaces and amber highlights",
      "mood": "reflective, thoughtful pause",
      "camera": "close detail on hands or objects",
      "version": "creative-identity@1",
      "lighting": "overcast diffused daylight",
      "color_feel": "warm wood surfaces and amber highlights",
      "option_ids": {
        "mood": "reflective",
        "camera": "close_detail",
        "lighting": "overcast_diffused",
        "color_feel": "warm_wood",
        "composition": "symmetrical_calm",
        "environment": "co_working_daylight",
        "human_presence": "implied_offscreen"
      },
      "composition": "symmetrical, calm composition",
      "environment": "a bright co-working space in daylight",
      "human_presence": "implied human presence just off-screen"
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
      "SOFT_3D": 1,
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
      "PHOTOGRAPHIC:carrier_place(+2)",
      "SOFT_3D:funnel_solution(+1)",
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
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "person_alone",
        "product_reveal_strategy": "FRAMED_ASSET"
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "process",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "FRAMED_ASSET"
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
        "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
        "motifs": [
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "person_alone",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
        "topic": "The hidden cost of 'we'll get back to you' on a contact form",
        "motifs": [
          "group",
          "prototype"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "TECHNICAL_BLUEPRINT",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "group",
        "product_reveal_strategy": "FRAMED_ASSET"
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
      "package_id": "6841d199-8768-4943-8253-2ff30481e61f",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "cta_selected": false,
      "visual_profile": "NATURAL",
      "downgrade_rules": [],
      "creative_identity": {
        "key": "a bright co-working space in daylight|reflective, thoughtful pause|overcast diffused daylight|close detail on hands or objects|symmetrical, calm composition|implied human presence just off-screen|warm wood surfaces and amber highlights",
        "mood": "reflective, thoughtful pause",
        "camera": "close detail on hands or objects",
        "version": "creative-identity@1",
        "lighting": "overcast diffused daylight",
        "color_feel": "warm wood surfaces and amber highlights",
        "option_ids": {
          "mood": "reflective",
          "camera": "close_detail",
          "lighting": "overcast_diffused",
          "color_feel": "warm_wood",
          "composition": "symmetrical_calm",
          "environment": "co_working_daylight",
          "human_presence": "implied_offscreen"
        },
        "composition": "symmetrical, calm composition",
        "environment": "a bright co-working space in daylight",
        "human_presence": "implied human presence just off-screen"
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
      "target_visual_beat_count": 5,
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
          "creative_mode": null,
          "visual_medium": "CLEAN_ILLUSTRATION",
          "meaning_carrier": "object",
          "cta_composition_id": null,
          "dominant_subject_motif": "person_alone",
          "product_reveal_strategy": "FRAMED_ASSET"
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
          "creative_mode": null,
          "visual_medium": "SOFT_3D",
          "meaning_carrier": "place",
          "cta_composition_id": null,
          "dominant_subject_motif": "laptop",
          "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
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
          "creative_mode": null,
          "visual_medium": "SOFT_3D",
          "meaning_carrier": "process",
          "cta_composition_id": null,
          "dominant_subject_motif": "laptop",
          "product_reveal_strategy": "FRAMED_ASSET"
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
          "creative_mode": null,
          "visual_medium": "SOFT_3D",
          "meaning_carrier": "object",
          "cta_composition_id": null,
          "dominant_subject_motif": "laptop",
          "product_reveal_strategy": "FRAMED_ASSET"
        },
        {
          "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
          "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
          "motifs": [
            "person_alone"
          ],
          "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
          "typed_cta": false,
          "scene_types": [
            "IMAGE",
            "IMAGE",
            "IMAGE",
            "IMAGE"
          ],
          "creative_mode": null,
          "visual_medium": "CLEAN_ILLUSTRATION",
          "meaning_carrier": "object",
          "cta_composition_id": null,
          "dominant_subject_motif": "person_alone",
          "product_reveal_strategy": "FRAMED_ASSET"
        },
        {
          "hook": "I'll be honest — I used to think a contact form was the same as being available. It isn't even close.",
          "topic": "The hidden cost of 'we'll get back to you' on a contact form",
          "motifs": [
            "group",
            "prototype"
          ],
          "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 19–23); pl",
          "typed_cta": false,
          "scene_types": [
            "IMAGE",
            "IMAGE",
            "IMAGE",
            "IMAGE"
          ],
          "creative_mode": null,
          "visual_medium": "TECHNICAL_BLUEPRINT",
          "meaning_carrier": "object",
          "cta_composition_id": null,
          "dominant_subject_motif": "group",
          "product_reveal_strategy": "FRAMED_ASSET"
        }
      ]
    }
  }
}
```

#### Scene-by-scene

| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |
| ---: | --- | --- | --- | --- | --- |
| 1 | scene-1 | IMAGE | image@1 | `/` | — |
| 2 | scene-2 | IMAGE | image@1 | `/` | — |
| 3 | scene-3 | IMAGE | image@1 | `/` | — |
| 4 | scene-4 | IMAGE | image@1 | `/` | — |

**Scene 1 (scene-1) — image_prompt (job input)**

```
Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Close detail on an open paper planner resting on a warm wood surface — two weeks of dates are blocked off with a diagonal line, a small sticky note sits at the edge of the open page. Amber highlights on the wood grain. Implied human presence just off-screen — a jacket draped over a chair back visible at the far edge of frame. Symmetrical, calm composition. No readable text on the planner or sticky note. Natural lighting, believable setting, restrained contrast.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Close detail on an open paper planner resting on a warm wood surface — two weeks of dates are blocked off with a diagonal line, a small sticky note sits at the edge of the open page. Amber highlights on the wood grain. Implied human presence just off-screen — a jacket draped over a chair back visible at the far edge of frame. Symmetrical, calm composition. No readable text on the planner or sticky note. Natural lighting, believable setting, restrained contrast."
  }
}
```
**Scene 2 (scene-2) — image_prompt (job input)**

```
Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. A tidy desk seen from slightly above table height — a chair pushed neatly in, a ceramic coffee mug left from before a trip, a small stack of unopened envelopes. The surface is warm wood with amber highlights. The space is still and quiet. No person visible but a coat hook with a bag on the wall implies someone is about to return. Symmetrical framing, calm composition, overcast window light from behind. No text, labels, or screens visible.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. A tidy desk seen from slightly above table height — a chair pushed neatly in, a ceramic coffee mug left from before a trip, a small stack of unopened envelopes. The surface is warm wood with amber highlights. The space is still and quiet. No person visible but a coat hook with a bag on the wall implies someone is about to return. Symmetrical framing, calm composition, overcast window light from behind. No text, labels, or screens visible."
  }
}
```
**Scene 3 (scene-3) — image_prompt (job input)**

```
Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Extreme close detail on two adult hands resting palms-down on a warm wood desk surface — fingers relaxed, still, the posture of someone who has just absorbed difficult news. Amber highlights catch the edge of the hands and the wood grain. A coffee mug is softly out of focus in the upper background. Symmetrical, calm composition. No text, devices, or screens in frame. Natural light, restrained contrast.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Extreme close detail on two adult hands resting palms-down on a warm wood desk surface — fingers relaxed, still, the posture of someone who has just absorbed difficult news. Amber highlights catch the edge of the hands and the wood grain. A coffee mug is softly out of focus in the upper background. Symmetrical, calm composition. No text, devices, or screens in frame. Natural light, restrained contrast."
  }
}
```
**Scene 4 (scene-4) — image_prompt (job input)**

```
Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Over-the-shoulder view of a person seated at a warm wood desk, typing a single URL into a browser on an open laptop — the laptop screen faces partially toward camera, displaying a structured chat interface with recognizable input fields and message bubbles rendered as abstract visual shapes without readable text. Warm amber highlights on the desk surface. Hands on the keyboard in a natural typing position. Symmetrical, calm composition. Implied resolution energy — the person's posture is relaxed and forward-leaning. No readable text anywhere.
```

```json
{
  "media": {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in overcast diffused daylight. Over-the-shoulder view of a person seated at a warm wood desk, typing a single URL into a browser on an open laptop — the laptop screen faces partially toward camera, displaying a structured chat interface with recognizable input fields and message bubbles rendered as abstract visual shapes without readable text. Warm amber highlights on the desk surface. Hands on the keyboard in a natural typing position. Symmetrical, calm composition. Implied resolution energy — the person's posture is relaxed and forward-leaning. No readable text anywhere."
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

Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: clear, confident, practical. Delivery: warm, intimate, conversational storytelling pace. Delivery: confident, concise, not aggressive. Language: en.


- **voiceover characters:** 362
- **estimated words:** 66
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
  "prompt_presentation_types": null
}
```

#### Image generation / moderation

No `image_generation_warnings` on render_spec — all scenes used primary provider path.

#### Final video details

- **MP4:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/8c668ff5-9b63-4e8a-9640-0157befeafc4/output.mp4
- **thumbnail:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/8c668ff5-9b63-4e8a-9640-0157befeafc4/thumbnail.png
- **subtitles:** supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/8c668ff5-9b63-4e8a-9640-0157befeafc4/subtitles.srt
- **video_duration:** —
- **subtitle_source:** —
- **render_warning:** false

#### Admin links (paths, no signed tokens)

- Production: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/production`
- Review: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/review`
- Content packages: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/content-packages`
- Videos / scene editor: `/projects/aabab9ff-9db4-4012-a53c-135e3bfea6cd/videos`
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

### Package 14 — Before vs. After: What Your Website Does With the Same Question

#### Package identity

| Field | Value |
| --- | --- |
| package_id | `53e8f0d2-e947-4fc2-951c-092cf11a5ae3` |
| strategy_item_id | `fd3a7d24-730d-42d8-8af4-a0ac997aabb5` |
| weekly_strategy_id | `b47abd0f-09fb-46a5-809d-70002d3291a9` |
| production_run_id | `328a9a04-f73b-4f1e-a85e-de2a3b7bdffa` |
| status | draft |
| funnel_stage | conversion |
| created_at | 2026-07-16T23:24:07.168254+00:00 |
| updated_at | 2026-07-16T23:24:09.145231+00:00 |
| primary content_item_id | `ba8bdb9a-6bae-4651-b116-4e641e19ffb2` |
| video_job_id | `` |
| video_job status | — |

#### Strategy input

- **topic:** Try it on your own website before you decide anything
- **angle:** The preview removes every excuse to wait. You don't need to sign up, build anything, or trust a demo video. Paste your URL, watch the AI answer questions from your actual content, and decide from there. Lead with the zero-risk entry point.
- **package_index:** 13
- **platform:** tiktok
- **format:** reel
- **priority:** 5
- **funnel_stage (column):** conversion
- **trend_id:** 
- **topic_id:** 

**strategy item brief (full JSON)**

```json
{
  "angle": "The preview removes every excuse to wait. You don't need to sign up, build anything, or trust a demo video. Paste your URL, watch the AI answer questions from your actual content, and decide from there. Lead with the zero-risk entry point.",
  "topic": "Try it on your own website before you decide anything",
  "source": "production_run",
  "package_index": 13,
  "production_run_id": "328a9a04-f73b-4f1e-a85e-de2a3b7bdffa"
}
```

#### Full content (package_brief core)

**hook:**

You can preview your AI assistant live — no sign-up, no setup — and most business owners still haven't done it.


**voiceover_text:**

You paste your URL. In about a minute, your website is answering the exact questions you've been answering manually for months. Same questions. Completely different outcome. Before: you answer them yourself, every single day. After: your website handles them while you're doing something else. Paste your URL and see the before-and-after live — no account needed.


**subtitles:**

You paste your URL. / In about a minute, your website answers / the exact questions you've been answering manually for months. / Same questions. Completely different outcome. / Before: you answer them yourself, every single day. / After: your website handles them while you're doing something else. / Paste your URL and see it live — no account needed.


**video concept:**

A sharp before-vs-after contrast built around a single object: a worn notepad filled with the same five recurring customer questions. The video opens on the notepad as a striking proof point — this is the physical residue of answering the same questions every day. The twist: the notepad doesn't have to exist. The payoff: paste your URL and watch your website take over that job before you decide anything. Blueprint schematic aesthetic throughout — structural lines, muted tones, cool neutral world — communicating the systematic transformation from manual repetition to automated response.


**video script:**

BEAT 1 — OBSERVATION (0–4s): Open on a close-up of a worn notepad, blueprint-style schematic rendering, filled with the same five questions written over and over in fading ink. Over-the-shoulder framing. Cool neutral tones. Voiceover: 'You paste your URL.'

BEAT 2 — MEANING (5–10s): Pull back to reveal the same questions mapped as a repeating loop diagram — a schematic cycle of manual effort. Voiceover: 'In about a minute, your website is answering the exact questions you've been answering manually for months. Same questions. Completely different outcome.'

BEAT 3 — TWIST/REVEAL (11–17s): The schematic splits into two columns — left side shows the manual loop continuing; right side shows the loop broken, replaced by a clean automated flow diagram. Voiceover: 'Before: you answer them yourself, every single day. After: your website handles them while you're doing something else.'

BEAT 4 — CTA (18–23s): The right-side automated flow diagram holds the frame, clean and resolved. Voiceover: 'Paste your URL and see the before-and-after live — no account needed.'


**duration_seconds (brief):** 23

**CTA:** Paste your URL and see the difference live — no account needed at fenrik.chat (type: sign_up)

**creative_mode:** 

**hashtags:** ["#AIchatbot","#SmallBusiness","#WebsiteTools","#LeadGeneration","#NoCode","#CustomerService","#AIassistant","#ChatbotMarketing","#BusinessAutomation","#SaaS"]


#### Full platform copy

##### x

```json
{
  "cta": "Try the live preview at fenrik.chat",
  "format": "X native post (≤280 characters)",
  "caption": "You've answered the same 5 customer questions every day for months. Your website could have been doing that the whole time. Paste your URL, watch it work live — no sign-up needed. fenrik.chat",
  "hashtags": [
    "#AIchatbot",
    "#SmallBusiness"
  ],
  "title_variants": [
    "The same five questions. Every single day. There's a fix.",
    "Before vs. after: what changes when your website answers for you",
    "Most business owners have never seen this comparison",
    "Your website could already be handling your most repeated questions",
    "One URL paste. One minute. The before-and-after is striking."
  ],
  "caption_variants": [
    "You've answered the same 5 customer questions every day for months. Your website could have been doing that the whole time. Paste your URL, watch it work live — no sign-up needed. fenrik.chat",
    "Before: you answer the same questions manually, every day. After: your website handles them automatically from your existing content. The gap between those two states? About one minute. fenrik.chat",
    "Most business owners have never compared what they do manually vs. what their website could do automatically. The preview is free, takes 60 seconds, and requires no account. fenrik.chat",
    "Your website already has the answers to your most repeated customer questions. It just has no way to say them yet. Paste your URL and watch that change. fenrik.chat",
    "No sign-up. No setup. No developer. Paste your URL and see your AI assistant answer your most common questions live — before you decide anything. fenrik.chat"
  ]
}
```
##### tiktok

```json
{
  "cta": "try the live preview — link in bio",
  "format": "Vertical short (TikTok native, 15–23s)",
  "caption": "you're answering the same 5 questions every single day. your website could be doing that instead. paste your URL, watch it work live — no sign-up required. the before-and-after will actually surprise you.",
  "hashtags": [
    "#smallbusiness",
    "#aitools",
    "#websitetips",
    "#chatbot"
  ]
}
```
##### youtube

```json
{
  "cta": "Try the live preview at fenrik.chat — no account needed",
  "format": "YouTube Short (vertical 9:16, 15–23s)",
  "caption": "Before: you answer the same customer questions manually, every single day. After: your website handles them automatically — built from your existing content in about a minute, no coding required. This video shows the before-and-after contrast that most business owners never think to compare. You can try a live preview of your own AI assistant at fenrik.chat — no account needed, no setup, no commitment. Paste your URL and see the difference yourself.",
  "hashtags": [
    "#AIchatbot",
    "#SmallBusiness",
    "#WebsiteTools",
    "#LeadGeneration",
    "#NoCode"
  ]
}
```
##### linkedin

```json
{
  "cta": "Try the live preview at fenrik.chat — no account required",
  "format": "LinkedIn native post (text-only, B2B tone)",
  "caption": "There is a before and an after that most service businesses never compare side by side.\n\nBefore: the same five customer questions arrive daily — by email, by phone, through the contact form — and someone answers them manually, every time.\n\nAfter: those questions are handled by an AI assistant built directly from the website's existing content, available around the clock, without additional staff or technical setup.\n\nThe gap between those two states is smaller than most people expect. A live preview — no registration required — makes the contrast concrete before any decision is made.\n\nIf your team is still answering the same questions on repeat, it is worth seeing what the after actually looks like.",
  "hashtags": [
    "#AIassistant",
    "#SmallBusiness",
    "#CustomerSupport"
  ]
}
```
##### instagram

```json
{
  "cta": "Try the live preview — link in bio",
  "format": "Vertical Reel (Instagram native, 15–23s)",
  "caption": "Same questions. Every day. For months. 📋 There's a before and an after — and the gap between them is about one minute. Paste your website URL, watch an AI assistant build itself from your existing content, and see it answer those exact questions live. No sign-up. No setup. Just the result. The before-and-after is worth seeing for yourself.",
  "hashtags": [
    "#smallbusiness",
    "#aiassistant",
    "#websitetips",
    "#chatbot",
    "#leadgeneration",
    "#businesstools",
    "#saas",
    "#nocode",
    "#customerservice",
    "#worksmarter"
  ]
}
```

#### package_brief (presentation / scenes / assets)

```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. Clean quiet studio-like interior. Over-the-shoulder framing, subject silhouette on the left third with breathing room. Gentle side lighting with soft shadows, cool neutral color feel. Close-up of a worn notepad rendered as a blueprint schematic object — its pages filled with the same five question entries repeated in fading schematic notation, the paper surface showing physical wear from repeated use. The notepad sits on a clean drafting surface. No readable text, no legible words, no labels — only schematic line-work suggesting repeated written entries. Generous negative space above and around the object. The image communicates: this is what daily manual repetition looks like as a physical artifact."
    },
    {
      "source": "ai",
      "image_prompt": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. Clean quiet studio-like interior. Over-the-shoulder framing, silhouette figure on the left third. Gentle side lighting with soft shadows, cool neutral color feel. Wide schematic diagram showing the same five questions mapped as a circular loop — arrows returning to the same nodes repeatedly, a closed cycle of manual effort rendered in blueprint line-work. The loop diagram fills the center of the frame with intentional negative space around it. No readable text, no labels, no legible notation — only structural schematic shapes suggesting cyclical repetition. The image communicates: answering the same questions every day is a system trap, not a one-off task."
    },
    {
      "source": "ai",
      "image_prompt": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. Clean quiet studio-like interior. Over-the-shoulder framing, silhouette on the left third with breathing room. Gentle side lighting with soft shadows, cool neutral color feel. The frame is divided into two vertical schematic columns — left column shows the closed manual loop diagram continuing, arrows cycling back on themselves, dense and repetitive; right column shows the same question nodes now connected to a clean linear automated flow, the loop broken and resolved into a single direct path. A clear schematic dividing line separates the two states. No readable text, no legible labels — only structural blueprint line-work contrasting two system states. The image communicates: before versus after — the same questions, two completely different outcomes."
    },
    {
      "source": "ai",
      "image_prompt": "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. Clean quiet studio-like interior. Over-the-shoulder framing, silhouette figure on the left third with generous breathing room. Gentle side lighting with soft shadows, cool neutral color feel. The right-side automated flow diagram from the previous beat now fills the full frame — a clean resolved schematic showing question nodes flowing directly to a single automated output node, the loop permanently broken. The diagram is calm, uncluttered, structurally complete. No readable text, no legible labels, no UI — only clean blueprint line-work showing a resolved system. Generous negative space above and below the diagram. The image communicates: the manual repetition is over — the system now handles it."
    }
  ],
  "image_prompts": [
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. Clean quiet studio-like interior. Over-the-shoulder framing, subject silhouette on the left third with breathing room. Gentle side lighting with soft shadows, cool neutral color feel. Close-up of a worn notepad rendered as a blueprint schematic object — its pages filled with the same five question entries repeated in fading schematic notation, the paper surface showing physical wear from repeated use. The notepad sits on a clean drafting surface. No readable text, no legible words, no labels — only schematic line-work suggesting repeated written entries. Generous negative space above and around the object. The image communicates: this is what daily manual repetition looks like as a physical artifact.",
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. Clean quiet studio-like interior. Over-the-shoulder framing, silhouette figure on the left third. Gentle side lighting with soft shadows, cool neutral color feel. Wide schematic diagram showing the same five questions mapped as a circular loop — arrows returning to the same nodes repeatedly, a closed cycle of manual effort rendered in blueprint line-work. The loop diagram fills the center of the frame with intentional negative space around it. No readable text, no labels, no legible notation — only structural schematic shapes suggesting cyclical repetition. The image communicates: answering the same questions every day is a system trap, not a one-off task.",
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. Clean quiet studio-like interior. Over-the-shoulder framing, silhouette on the left third with breathing room. Gentle side lighting with soft shadows, cool neutral color feel. The frame is divided into two vertical schematic columns — left column shows the closed manual loop diagram continuing, arrows cycling back on themselves, dense and repetitive; right column shows the same question nodes now connected to a clean linear automated flow, the loop broken and resolved into a single direct path. A clear schematic dividing line separates the two states. No readable text, no legible labels — only structural blueprint line-work contrasting two system states. The image communicates: before versus after — the same questions, two completely different outcomes.",
    "Technical blueprint schematic aesthetic, structural lines and diagrams, muted blueprint tones. Portrait 9:16 vertical frame. Clean quiet studio-like interior. Over-the-shoulder framing, silhouette figure on the left third with generous breathing room. Gentle side lighting with soft shadows, cool neutral color feel. The right-side automated flow diagram from the previous beat now fills the full frame — a clean resolved schematic showing question nodes flowing directly to a single automated output node, the loop permanently broken. The diagram is calm, uncluttered, structurally complete. No readable text, no legible labels, no UI — only clean blueprint line-work showing a resolved system. Generous negative space above and below the diagram. The image communicates: the manual repetition is over — the system now handles it."
  ],
  "asset_usage": [],
  "presentation_generation": {
    "mode": "enabled",
    "tts_voice": "cedar",
    "package_id": "53e8f0d2-e947-4fc2-951c-092cf11a5ae3",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "cta_selected": false,
    "voice_scores": {
      "primary": 78,
      "secondary": 48
    },
    "voice_source": "package_primary",
    "visual_medium": "TECHNICAL_BLUEPRINT",
    "voice_reasons": [
      "funnel_conversion→steadiness(+2)",
      "mode_observation→steady/warmth",
      "profile_MINIMAL→steadiness(+2)",
      "topic_steadiness_cues(+2)",
      "roles_close/proof→steadiness(+1)",
      "fit_primary(+78)",
      "fit_secondary(+48)"
    ],
    "product_reveal": {
      "reasons": [
        "asset_framed_safe:b1b0d00c-0bfc-4095-954f-4b38a813747f:framed_screen"
      ],
      "version": "product-reveal@2",
      "solution_beat_strategy": "FRAMED_ASSET",
      "sample_payoff_visual_required": false
    },
    "selected_voice": "cedar",
    "visual_profile": "MINIMAL",
    "delivery_reason": "Delivery: confident, concise, not aggressive. Delivery: thoughtful, reflective, steady pacing. Delivery: calm, uncluttered pacing. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: confident, concise, not aggressive. Delivery: thoughtful, reflective, steady pacing. Language: en.",
    "visual_narrative": {
      "key": "object|objects that change state across beats to tell the story",
      "version": "visual-narrative@1",
      "subject_focus": "objects that change state across beats to tell the story",
      "product_world_hints": [
        "Builder world: whiteboards, planning walls, sticky-note clusters, printed plans, standups, workflow objects, prototypes — not only a solo founder typing on a laptop.",
        "Agency world: client workshops, walls of ideas, presentations as objects, collaborative tables."
      ],
      "recent_motif_counts": {
        "cafe": 2,
        "desk": 2,
        "group": 4,
        "phone": 2,
        "laptop": 6,
        "close_up": 7,
        "overhead": 1,
        "dashboard": 2,
        "prototype": 2,
        "person_alone": 5,
        "sticky_notes": 1,
        "product_asset": 3
      },
      "supporting_carriers": [
        "place",
        "process",
        "transformation"
      ],
      "primary_meaning_carrier": "object"
    },
    "creative_identity": {
      "key": "a clean, quiet studio-like interior|determined, forward-leaning energy|gentle side lighting with soft shadows|over-the-shoulder framing|subject placed on the left third with breathing room|person seen from behind or as silhouette|cool neutral color feel",
      "mood": "determined, forward-leaning energy",
      "camera": "over-the-shoulder framing",
      "version": "creative-identity@1",
      "lighting": "gentle side lighting with soft shadows",
      "color_feel": "cool neutral color feel",
      "option_ids": {
        "mood": "determined",
        "camera": "over_shoulder",
        "lighting": "gentle_side_light",
        "color_feel": "cool_neutral",
        "composition": "subject_left_third",
        "environment": "quiet_studio",
        "human_presence": "silhouette_back"
      },
      "composition": "subject placed on the left third with breathing room",
      "environment": "a clean, quiet studio-like interior",
      "human_presence": "person seen from behind or as silhouette"
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
      "SOFT_3D": 1,
      "PHOTOGRAPHIC": 0,
      "GRAPHIC_COLLAGE": 0,
      "CLEAN_ILLUSTRATION": 4,
      "TECHNICAL_BLUEPRINT": 2
    },
    "visual_medium_source": "auto",
    "requested_phone_count": 0,
    "requested_quote_count": 0,
    "visual_medium_reasons": [
      "SOFT_3D:digital_product(+2)",
      "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
      "CLEAN_ILLUSTRATION:carrier_object_process(+2)",
      "TECHNICAL_BLUEPRINT:carrier_process(+1)",
      "CLEAN_ILLUSTRATION:profile_minimal(+1)",
      "CLEAN_ILLUSTRATION:saas_abstract(+1)",
      "TECHNICAL_BLUEPRINT:saas_system(+1)",
      "SOFT_3D:funnel_solution(+1)",
      "SOFT_3D:recent_repeat(-2)",
      "diversity:CLEAN_ILLUSTRATION→TECHNICAL_BLUEPRINT(close_score)"
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
        "creative_mode": null,
        "visual_medium": "PHOTOGRAPHIC",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "PRODUCT_OUTCOME"
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
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "person_alone",
        "product_reveal_strategy": "FRAMED_ASSET"
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "place",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "ABSTRACT_PRODUCT_SYSTEM"
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "process",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "FRAMED_ASSET"
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
        "creative_mode": null,
        "visual_medium": "SOFT_3D",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "FRAMED_ASSET"
      },
      {
        "hook": "Confession: I calculated how many hours I spent answering the same five website questions last month. I'm not going to tell you the number — it's embarrassing.",
        "topic": "Why most small businesses never build a chatbot — and what that silence costs them",
        "motifs": [
          "person_alone"
        ],
        "closing": "Clean flat illustration, simplified shapes, soft gradients, not photorealistic. Portrait 9:16 vertical frame. Same clean",
        "typed_cta": false,
        "scene_types": [
          "IMAGE",
          "IMAGE",
          "IMAGE",
          "IMAGE"
        ],
        "creative_mode": null,
        "visual_medium": "CLEAN_ILLUSTRATION",
        "meaning_carrier": "object",
        "cta_composition_id": null,
        "dominant_subject_motif": "person_alone",
        "product_reveal_strategy": "FRAMED_ASSET"
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
- **voiceover characters:** 363
- **estimated words:** 56
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
- API export JSON: `/api/production-runs/328a9a04-f73b-4f1e-a85e-de2a3b7bdffa/export`

## D. Cross-run consistency analysis

- **Distinct hooks:** 14 / 14
- **Distinct CTA texts:** 12 / 14
- **Funnel stages:** conversion, awareness, awareness, problem_aware, problem_aware, problem_aware, problem_aware, problem_aware, problem_aware, solution_aware, solution_aware, solution_aware, solution_aware, conversion
- **All videos used same voice:** no
- **All packages same visual profile:** no
- **Typed scenes rendered:** none (all worker scene types were IMAGE in this run)
- **Organic suitability:** Topics differ (dormant profile / weekend batching / URL-to-content); tone is educational not hard-sell; CTAs repeat free-package offer (expected for fenrik Studio).

## E. New-system usage matrix

| Package | Voice | Profile | CHECKLIST | PHONE | QUOTE | STATISTIC | CTA | Semantic Motion | Moderation fallback |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| One script. One minute. Your website stops going silent after hours. | — | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| Your website has an opinion about every visitor. You just never hear it say 'no.' | — | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| Your website is open right now — and it has no idea what to say | shimmer | NATURAL | 0 | 0 | 0 | 0 | 0 | yes | 0 |
| The car dealership that lost a weekend's worth of buyers and never knew it | — | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| The Irony of Knowing Everything and Saying Nothing | — | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| The Quiet Routine That's Costing You Leads Every Single Day | — | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| The Hidden Cost of 'We'll Get Back to You' | — | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| The Hidden Time Tax of Answering the Same Questions Every Day | — | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| The Redesigned Website That Still Couldn't Answer a Single Question | — | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| The Overlooked Detail That Makes a Custom Chatbot Feel Impossible | — | EDITORIAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| The 2 AM Board Meeting Question | cedar | MINIMAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| The Reputation Tax of Looking Unavailable | — | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| What Happens to Your Business When Nobody's There to Answer | shimmer | NATURAL | 0 | 0 | 0 | 0 | 0 | no | 0 |
| Before vs. After: What Your Website Does With the Same Question | — | MINIMAL | 0 | 0 | 0 | 0 | 0 | no | 0 |

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
