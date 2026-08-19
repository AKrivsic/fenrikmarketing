# Production Run Evidence — `fbe48cf4-c052-4e31-8b75-8bad362673f4`

**Exported:** 2026-07-25T06:43:10.499Z
**Project:** Fenrik.chat (`aabab9ff-9db4-4012-a53c-135e3bfea6cd`)

## Storage status (facts)

- Exact assembled system/user prompts at run time: **NOT PERSISTED** in telemetry or DB.
- Exact raw model completion bytes: **NOT PERSISTED** (only validated/parsed JSON fields and post-process package_brief).
- Telemetry stores: input_summary, output_summary, tokens, cost, duration, temperature, max_tokens, sizes.
- Sections labeled **RECONSTRUCTED** were rebuilt at audit time from current prompt builders + stored stage outputs + current project/assets/memory (with snapshotted `recent_creative_fingerprints` overlaid when present).
- Character-count match vs telemetry is reported; mismatch ⇒ reconstruction inputs differ from run-time.
- Companion JSON: `reports/fbe48cf4-evidence/evidence-bundle.json`

# 1. EXECUTION TIMELINE

| time_start (UTC) | time_end | workflow/phase | step/node | provider | model | duration_ms | prompt_tok | completion_tok | cost_usd | retry | repair | success |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 2026-07-25T00:08:03.643Z | 2026-07-25T00:08:08.839Z | strategy | Content Strategy | claude | claude-sonnet-4-6 | 5197 | 4103 | 221 | 0.015624 | 0 | false | true |
| 2026-07-25T00:08:08.840Z | 2026-07-25T00:08:09.290Z | strategy | Strategy Items | deterministic | — | 450 | — | — | — | 0 | false | true |
| 2026-07-25T00:08:13.292Z | 2026-07-25T00:08:47.604Z | package | Video Concept | claude | claude-sonnet-4-6 | 34313 | 3876 | 1282 | 0.030858 | 0 | false | true |
| 2026-07-25T00:08:47.606Z | 2026-07-25T00:08:51.136Z | package | Opening Impact | openai | gpt-4o-mini-2024-07-18 | 3530 | 4212 | 159 | 0.000727 | 0 | false | true |
| 2026-07-25T00:08:51.136Z | 2026-07-25T00:08:51.137Z | package | Visual Identity | deterministic | — | 1 | — | — | — | 0 | false | true |
| 2026-07-25T00:08:51.141Z | 2026-07-25T00:09:52.366Z | package | Content Package | claude | claude-sonnet-4-6 | 61226 | 9770 | 3178 | 0.07698 | 0 | false | true |
| 2026-07-25T00:09:52.368Z | 2026-07-25T00:09:52.368Z | package | Platform Outputs | deterministic | — | 1 | — | — | — | 0 | false | true |
| 2026-07-25T00:09:52.369Z | 2026-07-25T00:09:55.319Z | package | Persist Package | deterministic | — | 2950 | — | — | — | 0 | false | true |
| 2026-07-25T00:09:56.951Z | 2026-07-25T00:10:03.334Z | video | TTS | tts | gpt-4o-mini-tts | 6384 | — | — | 0.005145 | 0 | false | true |
| 2026-07-25T00:10:03.336Z | 2026-07-25T00:10:05.974Z | video | Whisper | whisper | whisper-1 | 2638 | — | — | 0.002525 | 0 | false | true |
| 2026-07-25T00:10:06.154Z | 2026-07-25T00:11:58.607Z | video | Image generation | image | gpt-image-1 | 112454 | — | — | 0.21 | 0 | false | true |
| 2026-07-25T00:11:58.750Z | 2026-07-25T00:14:38.562Z | video | Video rendering | video | — | 159815 | — | — | — | 0 | false | true |

### Timeline — input_summary / output_summary (persisted)

#### Content Strategy (`2026-07-25T00:08:03.643Z`)

**input_summary:**
```text
Content Strategy input:
- Product Brain
- Trends
- Evergreen Topics
- Anti-repetition Memory
```

**output_summary:**
```text
Theme + funnel plan
↓
1 strategy item (requested 1)
```

**telemetry step (full):**
```json
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
  "completion_characters": 778,
  "_phase": "strategy"
}
```

#### Strategy Items (`2026-07-25T00:08:08.840Z`)

**input_summary:**
```text
Strategy Items input:
- Content Strategy plan
- Funnel distribution
- Tone / diversity balance
```

**output_summary:**
```text
1 strategy item(s) persisted
```

**telemetry step (full):**
```json
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
  "completion_characters": 104,
  "_phase": "strategy"
}
```

#### Video Concept (`2026-07-25T00:08:13.292Z`)

**input_summary:**
```text
Video Concept input:
- Product Brain
- Knowledge Base
- Recent Content Memory
- Content Strategy item
```

**output_summary:**
```text
Concept: Good Traffic Is a Lie
```

**telemetry step (full):**
```json
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
  "completion_characters": 5674,
  "_phase": "package"
}
```

#### Opening Impact (`2026-07-25T00:08:47.606Z`)

**input_summary:**
```text
Opening Impact input:
- Video Concept
- Product Brain
- Recent Content Memory
```

**output_summary:**
```text
Opening: You thought traffic meant success.
```

**telemetry step (full):**
```json
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
  "completion_characters": 704,
  "_phase": "package"
}
```

#### Visual Identity (`2026-07-25T00:08:51.136Z`)

**input_summary:**
```text
Visual Identity input:
- Video Concept visual_direction
- Opening Impact
```

**output_summary:**
```text
Art direction: Clean, realistic small-business aesthetic — not polished cor
```

**telemetry step (full):**
```json
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
  "completion_characters": 2659,
  "_phase": "package"
}
```

#### Content Package (`2026-07-25T00:08:51.141Z`)

**input_summary:**
```text
Content Package input:
- Video Concept
- Opening Impact
- Visual Identity
- Product Brain
- Strategy Item
```

**output_summary:**
```text
Package: Good Traffic Is a Lie
```

**telemetry step (full):**
```json
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
  "completion_characters": 12453,
  "_phase": "package"
}
```

#### Platform Outputs (`2026-07-25T00:09:52.368Z`)

**input_summary:**
```text
Platform Outputs input:
- Content Package
- Target platforms
```

**output_summary:**
```text
Platforms: tiktok, instagram, youtube, facebook, linkedin, x
```

**telemetry step (full):**
```json
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
  "completion_characters": 3971,
  "_phase": "package"
}
```

#### Persist Package (`2026-07-25T00:09:52.369Z`)

**input_summary:**
```text
Persist Package input:
- Validated package
- Content items fan-out plan
```

**output_summary:**
```text
packageId=fb9839ea-92fd-461b-a1a5-002058ea4251; items=11
```

**telemetry step (full):**
```json
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
  "completion_characters": 552,
  "_phase": "package"
}
```

#### TTS (`2026-07-25T00:09:56.951Z`)

**input_summary:**
```text
TTS input:
- Voiceover text
- Voice / instructions
```

**output_summary:**
```text
audio duration=25.248s
```

**telemetry step (full):**
```json
{
  "model": "gpt-4o-mini-tts",
  "repair": false,
  "success": true,
  "provider": "tts",
  "warnings": [],
  "raw_usage": {
    "character_count": 343,
    "duration_seconds": 25.248,
    "usd_per_1k_chars": 0.015
  },
  "step_name": "TTS",
  "max_tokens": null,
  "started_at": "2026-07-25T00:09:56.951Z",
  "duration_ms": 6384,
  "finished_at": "2026-07-25T00:10:03.334Z",
  "retry_count": 0,
  "temperature": null,
  "cached_tokens": null,
  "error_message": null,
  "input_summary": "TTS input:\n- Voiceover text\n- Voice / instructions",
  "prompt_tokens": null,
  "estimated_cost": 0.005145,
  "output_summary": "audio duration=25.248s",
  "pricing_source": "list_price_estimate",
  "pricing_version": "list-price@2026-07-23",
  "response_format": null,
  "input_size_bytes": 345,
  "completion_tokens": null,
  "output_size_bytes": 114,
  "prompt_characters": 343,
  "provider_request_id": null,
  "completion_characters": 114,
  "_phase": "video"
}
```

#### Whisper (`2026-07-25T00:10:03.336Z`)

**input_summary:**
```text
Whisper input:
- Voiceover audio
- Language hint
```

**output_summary:**
```text
57 words (english)
```

**telemetry step (full):**
```json
{
  "model": "whisper-1",
  "repair": false,
  "success": true,
  "provider": "whisper",
  "warnings": [],
  "raw_usage": {
    "word_count": 57,
    "usd_per_min": 0.006,
    "fallback_used": false,
    "duration_seconds": 25.248
  },
  "step_name": "Whisper",
  "max_tokens": null,
  "started_at": "2026-07-25T00:10:03.336Z",
  "duration_ms": 2638,
  "finished_at": "2026-07-25T00:10:05.974Z",
  "retry_count": 0,
  "temperature": null,
  "cached_tokens": null,
  "error_message": null,
  "input_summary": "Whisper input:\n- Voiceover audio\n- Language hint",
  "prompt_tokens": null,
  "estimated_cost": 0.002525,
  "output_summary": "57 words (english)",
  "pricing_source": "list_price_estimate",
  "pricing_version": "list-price@2026-07-23",
  "response_format": null,
  "input_size_bytes": null,
  "completion_tokens": null,
  "output_size_bytes": 37,
  "prompt_characters": null,
  "provider_request_id": null,
  "completion_characters": 37,
  "_phase": "video"
}
```

#### Image generation (`2026-07-25T00:10:06.154Z`)

**input_summary:**
```text
Image generation input:
- 5 scene(s)
- Visual profile / medium
```

**output_summary:**
```text
generated=5; reused=0
```

**telemetry step (full):**
```json
{
  "model": "gpt-image-1",
  "repair": false,
  "success": true,
  "provider": "image",
  "warnings": [],
  "raw_usage": {
    "usd_per_still": 0.042,
    "reused_still_count": 0,
    "generated_still_count": 5
  },
  "step_name": "Image generation",
  "max_tokens": null,
  "started_at": "2026-07-25T00:10:06.154Z",
  "duration_ms": 112454,
  "finished_at": "2026-07-25T00:11:58.607Z",
  "retry_count": 0,
  "temperature": null,
  "cached_tokens": null,
  "error_message": null,
  "input_summary": "Image generation input:\n- 5 scene(s)\n- Visual profile / medium",
  "prompt_tokens": null,
  "estimated_cost": 0.21,
  "output_summary": "generated=5; reused=0",
  "pricing_source": "list_price_estimate",
  "pricing_version": "list-price@2026-07-23",
  "response_format": null,
  "input_size_bytes": null,
  "completion_tokens": null,
  "output_size_bytes": 67,
  "prompt_characters": null,
  "provider_request_id": null,
  "completion_characters": 67,
  "_phase": "video"
}
```

#### Video rendering (`2026-07-25T00:11:58.750Z`)

**input_summary:**
```text
Video rendering input:
- Scene stills
- Voiceover
- Subtitles
- Motion beats
```

**output_summary:**
```text
video_duration=26.733333
```

**telemetry step (full):**
```json
{
  "model": null,
  "repair": false,
  "success": true,
  "provider": "video",
  "warnings": [],
  "raw_usage": null,
  "step_name": "Video rendering",
  "max_tokens": null,
  "started_at": "2026-07-25T00:11:58.750Z",
  "duration_ms": 159815,
  "finished_at": "2026-07-25T00:14:38.562Z",
  "retry_count": 0,
  "temperature": null,
  "cached_tokens": null,
  "error_message": null,
  "input_summary": "Video rendering input:\n- Scene stills\n- Voiceover\n- Subtitles\n- Motion beats",
  "prompt_tokens": null,
  "estimated_cost": null,
  "output_summary": "video_duration=26.733333",
  "pricing_source": null,
  "pricing_version": null,
  "response_format": null,
  "input_size_bytes": null,
  "completion_tokens": null,
  "output_size_bytes": 50,
  "prompt_characters": null,
  "provider_request_id": null,
  "completion_characters": 50,
  "_phase": "video"
}
```

# 2. COMPLETE PIPELINE — INPUT / OUTPUT

## 2.1 Product Brain

**SOURCE:** `projects` row fields (persisted). Not an AI step in this run.

**OUTPUT (project brain fields):**
```json
{
  "name": "Fenrik.chat",
  "type": "saas",
  "language": "en",
  "market_scope": "global",
  "goal_type": "lead_generation",
  "target_audience": {
    "segments": [
      "Local services and consulting firms",
      "Car dealers, beauty salons, and service centers",
      "SaaS and software companies",
      "Lawyers, accountants, and agencies",
      "Marketing agencies",
      "Consultants",
      "Professional services",
      "Small businesses",
      "SMB service companies"
    ]
  },
  "tone_of_voice": {
    "notes": [
      "Simple and accessible",
      "Direct and action-oriented",
      "Transparent and honest",
      "Friendly and approachable",
      "Concise and practical"
    ]
  },
  "product_is": [
    "AI chatbot platform for websites",
    "Automatically analyzes website URL to build a knowledge base",
    "Answers visitor questions 24/7",
    "Guides visitors to the right service or information",
    "Captures leads automatically",
    "Deployed via a simple embed script",
    "Creates an AI assistant in about one minute",
    "Uses existing website content automatically",
    "Preview before signup",
    "No training required"
  ],
  "product_is_not": [
    "Not a product requiring developer skills or coding",
    "Not a complex integration requiring technical knowledge",
    "Not limited to tech companies only",
    "Not a custom AI project",
    "Not a live human chat service",
    "Not a chatbot that requires manual training"
  ],
  "product_strengths": [
    "AI assistant created in as little as 1 minute",
    "No code or technical knowledge required",
    "Fixed monthly pricing starting at $69/month",
    "Try a preview without registration",
    "Works across many industries and business types",
    "Simple single embed script deployment",
    "Answers instantly",
    "Captures leads outside business hours",
    "Uses your website content automatically",
    "No training required",
    "No coding required",
    "Preview before registration",
    "Transparent pricing",
    "Starts working from existing website immediately"
  ],
  "pain_points": [
    "Unable to answer customer questions when offline",
    "No resources to build or maintain a custom chatbot",
    "Losing leads due to lack of instant website support",
    "Complexity and cost of traditional chatbot integrations",
    "Need for 24/7 customer support without extra staff",
    "Visitors leave before contacting you",
    "Repeating the same customer questions every day"
  ],
  "forbidden_claims": [],
  "platforms": [
    "instagram",
    "linkedin",
    "tiktok",
    "youtube",
    "x"
  ],
  "default_cta": "Create your AI assistant"
}
```

## 2.2 Knowledge

**SOURCE:** `projects.knowledge` jsonb (persisted).

**OUTPUT:**
```json
{
  "cards": {
    "proof": {
      "source": "url",
      "status": "approved",
      "statements": [
        "Starting at $69/month with transparent monthly subscription",
        "No hidden fees stated explicitly",
        "Try the preview without registration required",
        "Simple embed script — no integrations or technical knowledge required",
        "Works on existing websites",
        "Uses website content automatically",
        "Can be installed with one script",
        "Preview available before signup",
        "AI generated directly from your website",
        "Live preview before activation",
        "Website can be activated with one embed script"
      ],
      "asset_statements": []
    },
    "voice": {
      "tone": [
        "Simple and accessible",
        "Direct and action-oriented",
        "Transparent and honest",
        "Friendly and approachable",
        "Concise and practical"
      ],
      "source": "url",
      "status": "approved",
      "forbidden_claims": []
    },
    "product": {
      "source": "url",
      "status": "approved",
      "product_is": [
        "AI chatbot platform for websites",
        "Automatically analyzes website URL to build a knowledge base",
        "Answers visitor questions 24/7",
        "Guides visitors to the right service or information",
        "Captures leads automatically",
        "Deployed via a simple embed script",
        "Creates an AI assistant in about one minute",
        "Uses existing website content automatically",
        "Preview before signup",
        "No training required"
      ],
      "product_is_not": [
        "Not a product requiring developer skills or coding",
        "Not a complex integration requiring technical knowledge",
        "Not limited to tech companies only",
        "Not a custom AI project",
        "Not a live human chat service",
        "Not a chatbot that requires manual training"
      ],
      "product_strengths": [
        "AI assistant created in as little as 1 minute",
        "No code or technical knowledge required",
        "Fixed monthly pricing starting at $69/month",
        "Try a preview without registration",
        "Works across many industries and business types",
        "Simple single embed script deployment",
        "Answers instantly",
        "Captures leads outside business hours",
        "Uses your website content automatically",
        "No training required",
        "No coding required",
        "Preview before registration",
        "Transparent pricing",
        "Starts working from existing website immediately"
      ]
    },
    "customer": {
      "source": "url",
      "status": "approved",
      "pain_points": [
        "Unable to answer customer questions when offline",
        "No resources to build or maintain a custom chatbot",
        "Losing leads due to lack of instant website support",
        "Complexity and cost of traditional chatbot integrations",
        "Need for 24/7 customer support without extra staff",
        "Visitors leave before contacting you",
        "Repeating the same customer questions every day"
      ],
      "target_audience": [
        "Local services and consulting firms",
        "Car dealers, beauty salons, and service centers",
        "SaaS and software companies",
        "Lawyers, accountants, and agencies",
        "Marketing agencies",
        "Consultants",
        "Professional services",
        "Small businesses",
        "SMB service companies"
      ]
    }
  },
  "scenarios": [
    {
      "text": "A potential client lands on a law firm's website at 11 PM to ask about a contract dispute, but there's no one available to respond and they leave without leaving any contact details.",
      "source": "generated",
      "created_at": "2026-06-11T18:26:16.814Z"
    },
    {
      "text": "A car dealership's website gets a flood of visitors over a holiday weekend while the sales team is off, and interested buyers can't get answers about financing options or vehicle availability.",
      "source": "generated",
      "created_at": "2026-06-11T18:26:16.814Z"
    },
    {
      "text": "A marketing agency owner is presenting a proposal to a new client when a website visitor tries to inquire about pricing packages but abandons the page after waiting with no response.",
      "source": "generated",
      "created_at": "2026-06-11T18:26:16.814Z"
    },
    {
      "text": "A beauty salon owner realizes on Monday morning that several people visited the website over the weekend asking about appointment availability, but left no way to follow up with them.",
      "source": "generated",
      "created_at": "2026-06-11T18:26:16.814Z"
    },
    {
      "text": "A SaaS founder notices in their analytics that dozens of free trial visitors dropped off the pricing page overnight without converting, having had no one to answer their questions in real time.",
      "source": "generated",
      "created_at": "2026-06-11T18:26:16.814Z"
    },
    {
      "text": "An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.",
      "source": "generated",
      "created_at": "2026-06-11T18:26:16.814Z"
    },
    {
      "text": "A consultant's website attracts a qualified prospect who wants to understand which service package fits their needs, but the site only has static text and the prospect moves on to a competitor.",
      "source": "generated",
      "created_at": "2026-06-11T18:26:16.814Z"
    },
    {
      "text": "A local HVAC service center gets a spike in website traffic during a summer heatwave, but the front desk is overwhelmed with calls and no one is available to handle the simultaneous online inquiries.",
      "source": "generated",
      "created_at": "2026-06-11T18:26:16.814Z"
    },
    {
      "text": "A software company's support page is visited by a prospective enterprise customer at 2 AM who needs a specific integration question answered before a morning board meeting, and the page offers no interactive help.",
      "source": "generated",
      "created_at": "2026-06-11T18:26:16.814Z"
    },
    {
      "text": "A boutique consulting firm just launched a redesigned website but has no budget to hire a dedicated support person, leaving visitors with complex service questions completely unanswered during off-hours.",
      "source": "generated",
      "created_at": "2026-06-11T18:26:16.814Z"
    }
  ],
  "source_url": "https://fenrik.chat",
  "extracted_at": "2026-06-10T20:10:28.978Z",
  "last_extraction_at": null,
  "last_extraction_error": null,
  "last_extraction_reason": null
}
```

## 2.3 Recent Memory

**PERSISTED SNAPSHOT on this run:** `package_brief.presentation_generation.recent_creative_fingerprints`

```json
[
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
```


**ALSO PERSISTED:** `series_context_considered` = true

**RECONSTRUCTED AT AUDIT (live `buildAntiRepetitionMemory`, may include this package):**
```json
{
  "hooks": [
    "You thought traffic meant success.",
    "Your clock stopped. Theirs didn't.",
    "You've been defining this number wrong for years.",
    "You track everything. Except the thing that's costing you the most.",
    "Every other chatbot integration looks like this.",
    "You built the whole pipeline. You just forgot to put anything at the end of it.",
    "One tab closed. No email. No missed call. No record. Just gone.",
    "Everything rehearsed. Except what happens when someone asks a question.",
    "She left a five-star review. Just not for you.",
    "You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question.",
    "The window is open. No one's behind it.",
    "Three years of answers. Zero conversations.",
    "You've hired for everything. Except this.",
    "They were on your pricing page for 94 seconds. They left with their question still unanswered.",
    "Paper mountain of anonymous visits.",
    "After hours, chats still screaming.",
    "Urgent question dies in silence.",
    "She sent the newsletter. Forty people clicked. And every single one left without a word.",
    "Form abandoned now, discovered after vacation.",
    "Good traffic means your website is working. It does not."
  ],
  "topics": [
    "The small business owner who checked her website analytics on Tuesday and realized every single weekend visitor had left without a trace",
    "The software company that answered every support ticket within hours — and still lost the enterprise deal because no one was there at 2 AM when it actually mattered",
    "The small business owner who sent a campaign, got 50 website visitors in one afternoon, and woke up to zero leads — because no one was there to answer a single question",
    "Why the businesses that capture the most leads aren't always the ones with the best product — they're the ones whose websites respond first",
    "The part of setting up an AI assistant for your website that most business owners expect to be hard — and isn't",
    "What changes when your website can actually answer a visitor's question — the moment they ask it",
    "Why hiring more staff doesn't fix the problem of visitors who leave before they ever make contact",
    "The software company that spent six months building a pricing page — and still couldn't stop visitors from leaving it confused",
    "The local service company that tracked every call — and never once tracked how many people visited the website and left without a word",
    "Every business posts on social media to drive traffic — almost none of them have thought about what happens when that traffic arrives",
    "The small business owner who realized her website had a job — and it had never shown up for work",
    "What it looks like when your website actually answers a visitor question — in real time",
    "The silent cost of a website that can't talk back",
    "The software founder who read every exit on his pricing page — and finally understood what visitors were actually asking for",
    "The accountant who came back from a long weekend to find three qualified leads had visited — and left nothing behind",
    "The small business owner who discovered her website had been silently turning away visitors every single night",
    "The small business owner who watched three qualified visitors leave her website in one night — and only found out the next morning",
    "The small business owner who realized her website had never once answered a single visitor question",
    "The car dealer who got 60 weekend visitors and sold nothing — because no one could answer a single question",
    "The small accounting firm that sent a newsletter, got 40 website visitors in one evening, and woke up to zero leads"
  ],
  "ctas": [
    "Save this if you've ever checked your analytics and felt that quiet sinking feeling.",
    "Create your AI assistant — let your website keep running when you can't.",
    "Create your AI assistant — let your website answer the question that ends the bounce.",
    "Create your AI assistant — start capturing what the blank field never could.",
    "Create your AI assistant — the setup is shorter than you think.",
    "Create your AI assistant — let your website finally catch what you spent so much to send its way.",
    "Create your AI assistant — let your website answer the question that keeps your tab on the board.",
    "Create your AI assistant — let your website answer the question the page never could.",
    "Create your AI assistant — and make sure the next review lands where it should.",
    "Create your AI assistant — make your website as ready as your campaign.",
    "Create your AI assistant — let your website finally answer when someone knocks.",
    "Create your AI assistant — your content is already ready.",
    "Create your AI assistant — write the job description your website has always needed.",
    "Create your AI assistant — let your pricing page hold the conversation.",
    "Create your AI assistant — let your website answer while the office is dark.",
    "Create your AI assistant — let your website keep talking when you can't.",
    "Create your AI assistant — let your website answer while you're reviewing session recordings.",
    "Create your AI assistant — let your website answer while you're closed.",
    "Create your AI assistant — let your website answer while the lot is full and the team is off.",
    "Create your AI assistant — let your website answer while the analytics pile up."
  ],
  "scenarios": [
    "A small business owner opens her analytics dashboard on Tuesday morning, pleased to see 34 weekend sessions. The satisfaction dissolves when she looks at the leads column — zero. No names, no emails, no form fills. Visitors arrived over the weekend, had questions, found a static page with no way to ask them, and moved on to competitors who could respond. She had no idea any of it was happening.",
    "A marketing agency owner is presenting a proposal to a new client when a website visitor tries to inquire about pricing packages but abandons the page after waiting with no response.",
    "A SaaS founder notices in their analytics that dozens of free trial visitors dropped off the pricing page overnight without converting, having had no one to answer their questions in real time.",
    "An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.",
    "A boutique consulting firm just launched a redesigned website but has no budget to hire a dedicated support person, leaving visitors with complex service questions completely unanswered during off-hours.",
    "A car dealership's website gets a flood of visitors over a holiday weekend while the sales team is off, and interested buyers can't get answers about financing options or vehicle availability.",
    "A beauty salon owner realizes on Monday morning that several people visited the website over the weekend asking about appointment availability, but left no way to follow up with them.",
    "A potential client lands on a law firm's website at 11 PM to ask about a contract dispute, but there's no one available to respond and they leave without leaving any contact details.",
    "A consultant's website attracts a qualified prospect who wants to understand which service package fits their needs, but the site only has static text and the prospect moves on to a competitor.",
    "A local HVAC service center gets a spike in website traffic during a summer heatwave, but the front desk is overwhelmed with calls and no one is available to handle the simultaneous online inquiries.",
    "A software company's support page is visited by a prospective enterprise customer at 2 AM who needs a specific integration question answered before a morning board meeting, and the page offers no interactive help."
  ],
  "fingerprints": [
    {
      "metaphor": null,
      "hero_object": "The running clock next to the frozen one — specifically the second hand passing midnight",
      "core_premise": "Two clocks on one wall — the business clock frozen at 6 PM, the prospect's clock still running. The entire message lives in the gap between them.",
      "visual_world": "Mustard-yellow back office wall, two identical white analog clocks, flat overhead light, no other elements",
      "emotional_arc": "Recognition → temporal dissonance → mounting dread as the running clock advances → resolution through synchronization",
      "ending_mechanism": "Both clocks running simultaneously — the gap closed, the synchronization complete",
      "opening_mechanism": "Clock hand snapping to 6:00 PM and freezing — mechanical stillness as the scroll-stopper",
      "product_mechanism": "AI chat widget active at 12:43 AM — the frozen clock's second hand begins moving, both clocks synchronized",
      "creative_direction": "Introduces a second clock that the audience has never been watching — not their business clock, but the prospect's research clock. The mechanism works by revealing that two timelines coexist: the business's operational timeline (business hours, response windows, staffed moments) and the prospect's decision timeline (late night, weekend, off-hour). The message lives entirely in the gap between those two clocks running simultaneously and never intersecting.",
      "palette_atmosphere": "Mustard yellow, white, black — warm but stark, institutional but not corporate"
    },
    {
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
    {
      "metaphor": null,
      "hero_object": "The blank data field — not zero, not a dash, genuinely empty",
      "core_premise": "The loss cannot be measured because no system exists to detect it — the blank field in the analytics report is the structural proof that the business is flying blind on its most significant recurring loss.",
      "visual_world": "Pale eucalyptus surface, printed analytics report, mechanical pencil, single pendant light",
      "emotional_arc": "Recognition → Epistemic discomfort → The impossibility of correction without detection → Resolution through the product",
      "ending_mechanism": "The blank field remains on screen — the product is introduced as the correction to the structural absence, not as a celebration",
      "opening_mechanism": "Extreme close-up on a printed analytics report being slid across a surface — the camera tilts to reveal a blank row at the bottom.",
      "product_mechanism": "The AI assistant is the mechanism that begins to fill in the blank — by capturing conversations that the website previously could not have, it creates data where none existed",
      "creative_direction": "Focuses on the structural invisibility of the loss — not that the lead left, but that the business will never know it happened, cannot measure it, cannot learn from it, and cannot correct it. The worst-case consequence is an invisible failure that produces no signal, no data, and no opportunity for correction.",
      "palette_atmosphere": "Eucalyptus green, cream paper, graphite — cool and analytical, no warmth"
    },
    {
      "metaphor": null,
      "hero_object": "The two timeline strips side by side on the birch table",
      "core_premise": "The physical length of a traditional chatbot project timeline placed against a four-step strip communicates the entire message through proportion alone.",
      "visual_world": "Long pale birch table, linen paper strips, hand-lettered labels, flat lay, no screens",
      "emotional_arc": "Recognition of familiar complexity → proportion shock → dry relief",
      "ending_mechanism": "Pull-back overhead reveals full scale of both strips simultaneously — no commentary needed",
      "opening_mechanism": "Hands unrolling a timeline that keeps going — duration of the unrolling is the hook",
      "product_mechanism": "The short strip's four steps are the product's actual setup — the brevity is the argument",
      "creative_direction": "Presents two parallel tracks side by side — the effort, time, and cost the audience imagines versus the actual effort the solution requires — and holds them against each other without commentary. The mechanism works through stark proportion mismatch: the imagined version is enormous, the actual version is trivial, and the gap between them is the entire message.",
      "palette_atmosphere": "Pale birch, natural linen, dark ink — honest, material, no digital interference"
    },
    {
      "metaphor": null,
      "hero_object": "The open pipe end above dry sand, water disappearing into the ground",
      "core_premise": "A beautifully built copper pipe system ends open above dry sand — every upstream investment was made with care, the final connection was never addressed, and the resource pours into nothing.",
      "visual_world": "Workshop bench, warm raw wood, real copper plumbing props, shallow sand tray, raking natural light",
      "emotional_arc": "Admiration of the upstream craft → slow dread as the open end is revealed → relief at the single small addition that completes the system",
      "ending_mechanism": "Water flowing into the container while the sand stays dry — the entire system unchanged except for one final connection",
      "opening_mechanism": "Extreme close-up on a polished copper elbow joint with water moving through it — craft and investment read before any context",
      "product_mechanism": "A single brass fitting at the pipe's end — not a rebuild, a completion — that makes the entire upstream investment productive",
      "creative_direction": "Traces how a significant resource was correctly allocated to one part of a system and then stopped just before the part that needed it most. The investment traveled most of the distance and halted one step short of where it would have produced return.",
      "palette_atmosphere": "Warm copper, raw wood, pale sand, clear water — rich warm metals against natural earth tones"
    },
    {
      "metaphor": null,
      "hero_object": "The gap in the tab row where the removed tab was",
      "core_premise": "A prospective client researches providers through multiple open tabs late at night — one tab closes because a question went unanswered, and it leaves no record the business can ever find.",
      "visual_world": "Analog corkboard with physical card-stock browser tabs — a tactile rendering of digital research behavior",
      "emotional_arc": "Curiosity at the strange visual → recognition of the familiar behavior it represents → quiet dread at the gap → understanding that this happens with no trace",
      "ending_mechanism": "The gap in the row — absence made permanent and visible",
      "opening_mechanism": "A card-stock browser tab physically lifted and removed from a row — making an invisible digital act tangible and visible",
      "product_mechanism": "The answer that would have prevented the tab from closing — the website's missing capacity to respond",
      "creative_direction": "A mechanism that relocates the moment of decision from where the business owner imagines it happens — a call, a consultation, a meeting — to where it actually happens for a significant portion of leads: alone, at an off-hour, on the website, with no one available to respond. Decision-site displacement logic.",
      "palette_atmosphere": "Corkboard brown, muted sage and slate, cream — quiet, methodical, unglamorous"
    },
    {
      "metaphor": null,
      "hero_object": "The empty Q&A chair with the placard and no preparation around it",
      "core_premise": "A professional services team rehearsed every element of their presentation and prepared nothing for the moment a visitor had a question — the production was complete, the response mechanism was empty.",
      "visual_world": "Theater backstage with stage wing curtains, gaffer tape marks, exposed brick, practical amber stage lighting",
      "emotional_arc": "Respect for thoroughness → specific pre-show anxiety about the one unchecked item → quiet competent resolution",
      "ending_mechanism": "The last checkbox is marked. The clipboard is complete. The preparation asymmetry is closed.",
      "opening_mechanism": "Clipboard with every line checked except the last one — 'Q&A Response' — the pen hovering over the only unchecked preparation",
      "product_mechanism": "AI assistant fills the empty Q&A chair — the last unchecked preparation item becomes checked in 60 seconds",
      "creative_direction": "Surfaces a specific asymmetry: the business prepared extensively for the moment a visitor arrives but prepared nothing for what happens when the visitor has a question the prepared content cannot answer. The mechanism works through preparation-gap logic — readiness for arrival versus readiness for interaction are two entirely different states of preparation, and only one was addressed.",
      "palette_atmosphere": "Warm amber, deep charcoal, exposed brick red — working production space, honest and unglamorous"
    },
    {
      "metaphor": null,
      "hero_object": "The printed five-star review with the highlighted sentence about instant answers",
      "core_premise": "A five-star review the business owner wanted was earned by a competitor who simply answered a question the owner's website couldn't.",
      "visual_world": "Matte white desktop, printed paper props, yellow highlighter — no screens, no digital interfaces",
      "emotional_arc": "Desire (that review is beautiful) → Recognition (it's for a competitor) → Connection (the sessions page explains why) → Urgency (this is fixable)",
      "ending_mechanism": "Two documents pinned side by side — the review earned elsewhere and the sessions that explain the loss",
      "opening_mechanism": "Extreme close-up on a printed review with a highlighted sentence — desire triggered before the competitor reveal",
      "product_mechanism": "The AI assistant is what would have held the conversation that earned the review — named only at the end",
      "creative_direction": "Uses the logic of competitive comparison from the visitor's perspective — the lead did not disappear, it transferred. The business did not lose a visitor; a competitor gained a client.",
      "palette_atmosphere": "Matte white, warm yellow, black ink — clean and precise with a single accent color that carries emotional weight"
    },
    {
      "metaphor": null,
      "hero_object": "The printed campaign timeline and the question mark pinned at its end",
      "core_premise": "A consultant's campaign is a monument of preparation. The website it feeds traffic into has no preparation at all.",
      "visual_world": "Sun-flooded linen-and-sienna creative studio with wide-format prints, rattan, and analog planning artifacts.",
      "emotional_arc": "Pride in craft → false resolution at the traffic spike → quiet devastation at the empty contact page → reorientation at the question mark",
      "ending_mechanism": "The question mark card is physically replaced by a new card that names the fix, completing the timeline visually.",
      "opening_mechanism": "Extreme close-up on a physical campaign timeline — the density of it signals genuine effort before any conflict is named.",
      "product_mechanism": "Completes the timeline — the AI assistant is the missing final node that makes both sides of the equation balanced.",
      "creative_direction": "Exposes that two connected systems were prepared with radically different levels of care — one was built with deliberate strategy, the other was left entirely unprepared to handle the result of the first system's success.",
      "palette_atmosphere": "Linen white, burnt sienna, soft ochre, forest ink — warm analog creative energy"
    },
    {
      "metaphor": null,
      "hero_object": "The frosted glass reception window and the empty desk behind it",
      "core_premise": "A law firm's website is a reception window that has always been lit and open — and has always been empty behind the glass.",
      "visual_world": "Professional services reception — mahogany, muted gold, frosted glass, institutional weight",
      "emotional_arc": "Expectation of presence → quiet betrayal at the emptiness → compounding recognition across multiple visitor taps → relief as the window finally has someone behind it",
      "ending_mechanism": "The panel opens and an answer comes back immediately through the microphone hole — the institutional promise of the window is kept for the first time",
      "opening_mechanism": "Extreme close-up on a frosted glass reception panel, warm light behind it, sliding open to reveal an empty desk",
      "product_mechanism": "The AI assistant appears as the warm presence the backlit glass always implied — the window now tells the truth",
      "creative_direction": "A mechanism that frames the website as a threshold — a place visitors cross with intent — and reveals that crossing it leads nowhere because nothing is on the other side. The communication works through spatial and threshold logic: the visitor arrived, stepped in, and found an empty room.",
      "palette_atmosphere": "Mahogany, muted gold, frosted white — serious, dignified, never corporate-cold"
    },
    {
      "metaphor": null,
      "hero_object": "The spiral-bound 'Your Website' manual on the workbench",
      "core_premise": "A mechanic's service website has functioned as an unread instruction manual for three years — the AI assistant is not a new document but the act of finally making that manual respond to questions.",
      "visual_world": "Clean, proud auto service bay — steel, concrete, industrial sage green, task lighting",
      "emotional_arc": "The weight of wasted potential → recognition of the gap → the ease of the fix → quiet satisfaction at the manual now answering questions without anyone touching it",
      "ending_mechanism": "The manual unchanged on the workbench — but now live and responding 24 hours a day",
      "opening_mechanism": "A spiral-bound manual labeled 'Your Website' dropped flat onto a steel workbench — the physical weight of ignored content made literal",
      "product_mechanism": "Appears as the connector between the existing manual (website content) and the visitor's question — never as a content creator",
      "creative_direction": "Reveals that a familiar, working system already contains everything needed to solve the problem — the solution was always present inside the thing the audience already built, just never activated. The communication mechanism centers on the idea that the missing piece was not absent but dormant, embedded in plain sight within existing infrastructure.",
      "palette_atmosphere": "Polished steel, industrial sage green, concrete grey, chrome — honest craft palette"
    },
    {
      "metaphor": null,
      "hero_object": "The blank index card",
      "core_premise": "There is a role in every service business that was never posted, never filled — the one that answers visitor questions at all hours.",
      "visual_world": "Warm small-business office, natural wood, aged paper cork board — years of deliberate staffing decisions, one gap",
      "emotional_arc": "Quiet recognition → purposeful clarity → satisfying completion",
      "ending_mechanism": "The completed job description card is pinned back; the role is filled and the visitor gets an answer",
      "opening_mechanism": "A blank index card at the center of a full cork board — the gap made visible before a word is spoken.",
      "product_mechanism": "Framed as a hire — the product fills the written role, $69/month becomes the salary line",
      "creative_direction": "Reframes the absence of a response mechanism as a staffing gap — the business has coverage for every other function except the one that handles incoming interest at all hours. The mechanism works through role-based logic: every other customer-facing function has a person or process behind it, except this one.",
      "palette_atmosphere": "Natural wood, aged paper cream, terracotta — warm, lived-in, real"
    },
    {
      "metaphor": null,
      "hero_object": "The ticking timestamp in the corner of the pricing page",
      "core_premise": "A qualified visitor waited 94 seconds on a pricing page for an answer that never came — the founder discovers this the next morning and understands the lead was never lost to disinterest, only to silence.",
      "visual_world": "Analog-digital hybrid: browser tabs and pricing pages rendered as physical card-stock props on a warm corkboard.",
      "emotional_arc": "Curiosity about the timer → quiet tension as the visitor's patience is measured → small devastation at the tab close → recognition and resolve in the founder",
      "ending_mechanism": "Side-by-side contrast: the tab that closed at 01:14 versus the conversation that resolved at 00:31.",
      "opening_mechanism": "A real-time ticking counter beside a perfectly still cursor — the viewer must know what the timer means before they scroll away.",
      "product_mechanism": "The same scene replays with the AI assistant present — the ghost question is answered, the timer stops early, the lead stays.",
      "creative_direction": "Proximity Without Contact — the visitor was right there, on the page, for 94 seconds, and nothing happened. The mechanism makes physical-digital proximity visceral through the ticking timer and the ghost question, then exposes the structural gap that prevented connection.",
      "palette_atmosphere": "Warm amber and cream — tactile, human, unhurried"
    }
  ],
  "atmospheres": [
    "Mustard yellow, white, black — warm but stark, institutional but not corporate",
    "Pale sage, white, black marker, warm daylight with horizontal blind shadows — clean, professional, quietly alive",
    "Eucalyptus green, cream paper, graphite — cool and analytical, no warmth",
    "Pale birch, natural linen, dark ink — honest, material, no digital interference",
    "Warm copper, raw wood, pale sand, clear water — rich warm metals against natural earth tones",
    "Corkboard brown, muted sage and slate, cream — quiet, methodical, unglamorous",
    "Warm amber, deep charcoal, exposed brick red — working production space, honest and unglamorous",
    "Matte white, warm yellow, black ink — clean and precise with a single accent color that carries emotional weight",
    "Linen white, burnt sienna, soft ochre, forest ink — warm analog creative energy",
    "Mahogany, muted gold, frosted white — serious, dignified, never corporate-cold",
    "Polished steel, industrial sage green, concrete grey, chrome — honest craft palette",
    "Natural wood, aged paper cream, terracotta — warm, lived-in, real",
    "Warm amber and cream — tactile, human, unhurried"
  ],
  "directions": [
    "Introduces a second clock that the audience has never been watching — not their business clock, but the prospect's research clock. The mechanism works by revealing that two timelines coexist: the business's operational timeline (business hours, response windows, staffed moments) and the prospect's decision timeline (late night, weekend, off-hour). The message lives entirely in the gap between those two clocks running simultaneously and never intersecting.",
    "Works by surfacing evidence that already exists in data the audience already has — traffic numbers, session counts, bounce rates — and reframes that existing data as a record of unanswered questions rather than a record of visitors.",
    "Focuses on the structural invisibility of the loss — not that the lead left, but that the business will never know it happened, cannot measure it, cannot learn from it, and cannot correct it. The worst-case consequence is an invisible failure that produces no signal, no data, and no opportunity for correction.",
    "Presents two parallel tracks side by side — the effort, time, and cost the audience imagines versus the actual effort the solution requires — and holds them against each other without commentary. The mechanism works through stark proportion mismatch: the imagined version is enormous, the actual version is trivial, and the gap between them is the entire message.",
    "Traces how a significant resource was correctly allocated to one part of a system and then stopped just before the part that needed it most. The investment traveled most of the distance and halted one step short of where it would have produced return.",
    "A mechanism that relocates the moment of decision from where the business owner imagines it happens — a call, a consultation, a meeting — to where it actually happens for a significant portion of leads: alone, at an off-hour, on the website, with no one available to respond. Decision-site displacement logic.",
    "Surfaces a specific asymmetry: the business prepared extensively for the moment a visitor arrives but prepared nothing for what happens when the visitor has a question the prepared content cannot answer. The mechanism works through preparation-gap logic — readiness for arrival versus readiness for interaction are two entirely different states of preparation, and only one was addressed.",
    "Uses the logic of competitive comparison from the visitor's perspective — the lead did not disappear, it transferred. The business did not lose a visitor; a competitor gained a client.",
    "Exposes that two connected systems were prepared with radically different levels of care — one was built with deliberate strategy, the other was left entirely unprepared to handle the result of the first system's success.",
    "A mechanism that frames the website as a threshold — a place visitors cross with intent — and reveals that crossing it leads nowhere because nothing is on the other side. The communication works through spatial and threshold logic: the visitor arrived, stepped in, and found an empty room.",
    "Reveals that a familiar, working system already contains everything needed to solve the problem — the solution was always present inside the thing the audience already built, just never activated. The communication mechanism centers on the idea that the missing piece was not absent but dormant, embedded in plain sight within existing infrastructure.",
    "Reframes the absence of a response mechanism as a staffing gap — the business has coverage for every other function except the one that handles incoming interest at all hours. The mechanism works through role-based logic: every other customer-facing function has a person or process behind it, except this one.",
    "Proximity Without Contact — the visitor was right there, on the page, for 94 seconds, and nothing happened. The mechanism makes physical-digital proximity visceral through the ticking timer and the ghost question, then exposes the structural gap that prevented connection."
  ],
  "pipelineFingerprints": [
    {
      "version": "content-pipeline-fingerprint@1",
      "core_idea": "Most small business owners believe that website traffic is proof their marketing is working. This video dismantles that belief by revealing what the analytics screen actually shows when you look clos…",
      "environment": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a …",
      "product_role": "Fenrik.chat is introduced as the presence the website was always missing — not a technical product, not a chatbot project, but the thing that makes a live webs…",
      "visual_world": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a startup loft, not a corporate office. A …",
      "attention_pattern": "The viewer is drawn in by the contrast between the initial optimism of good traffic and the unsettling truth revealed b…",
      "narrative_mechanism": "contrarian: HOOK — Open on a business owner, coffee in hand, Tuesday morning, genuinely ple…"
    }
  ]
}
```

## 2.4 Strategy

**PERSISTED parent strategy_brief:**
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

**PERSISTED strategy item:**
```json
{
  "id": "51d2f466-2f1b-48e4-8fb7-1734cf469fdc",
  "strategy_id": "dfb8f999-6a88-402e-87a7-bddedf65fbc5",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "platform": "tiktok",
  "format": "reel",
  "topic_id": null,
  "trend_id": null,
  "brief": {
    "angle": "Walk through the quiet horror of seeing real traffic with zero leads — visitors who had questions, found silence, and moved on to whoever answered first. The website was live. The business was not.",
    "topic": "The small business owner who checked her website analytics on Tuesday and realized every single weekend visitor had left without a trace",
    "source": "production_run",
    "pain_point": "Visitors leave before contacting you",
    "package_index": 0,
    "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4"
  },
  "priority": 1,
  "created_at": "2026-07-25T00:08:09.23629+00:00",
  "funnel_stage": "problem_aware"
}
```

## 2.5 Video Concept

**PERSISTED OUTPUT:** `presentation_generation.video_concept`
```json
{
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
}
```

## 2.6 Opening Impact

**PERSISTED OUTPUT:** `presentation_generation.opening_impact`
```json
{
  "pacing": "Slow and deliberate, mirroring the woman's growing concern.",
  "emotion": "A creeping sense of unease as realization dawns.",
  "first_image": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen.",
  "attention_pattern": "The viewer is drawn in by the contrast between the initial optimism of good traffic and the unsettling truth revealed by the analytics.",
  "first_spoken_sentence": "You thought traffic meant success."
}
```

## 2.7 Visual Identity

**PERSISTED OUTPUT:** `presentation_generation.visual_identity`
```json
{
  "palette": "Warm neutrals for the environment — off-white walls, natural wood desk, muted sage or terracotta accents. The screen is the only source of cooler blue-grey tones. No brand-forward colors until the product moment, where a single clean accent (soft teal or slate blue) enters with the Fenrik interface.",
  "lighting": "Soft morning window light from one side, warm but slightly flat — the kind of light that makes everything look ordinary and fine before you look closer. The screen glow adds a cool secondary source that subtly competes with the warmth, creating a small visual tension between the hopeful morning and the cold data.",
  "environment": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a startup loft, not a corporate office. A framed license or certificate visible but not foregrounded. Plants optional. The space should feel like someone who built something real and is proud of it.",
  "camera_style": "Handheld but composed — slight natural movement that keeps it feeling observational rather than staged. Push-in slowly on the screen during the realization beat. Cut to over-the-shoulder POV for the analytics close-up. The competitor-tab sequence uses a clean screen-capture style insert, brief and precise. Final frame is a static wide shot of the desk with the screen now showing a lead notification.",
  "art_direction": "Clean, realistic small-business aesthetic — not polished corporate, not gritty. The kind of desk that has a half-drunk coffee, a sticky note, and a laptop that is two years old. Screen content is legible and real-looking: a simple analytics dashboard with visible session counts and a lead column showing zero. Motion is slow and deliberate — no fast cuts in the first half. The pacing mirrors the creeping realization.",
  "character_style": "One central character — a woman in her late 30s or early 40s, owner of a local service business (deliberately non-specific industry to stay broadly relatable). Dressed practically, not stylishly. Her expression does the narrative work: pleased, then puzzled, then still — the stillness of someone doing quiet math in their head. No dialogue. No voiceover from her. She is observed, not interviewed.",
  "opening_emotion": "A creeping sense of unease as realization dawns.",
  "opening_first_image": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen."
}
```

**REBUILT from concept+opening at audit (deterministic):**
```json
{
  "art_direction": "Clean, realistic small-business aesthetic — not polished corporate, not gritty. The kind of desk that has a half-drunk coffee, a sticky note, and a laptop that is two years old. Screen content is legible and real-looking: a simple analytics dashboard with visible session counts and a lead column showing zero. Motion is slow and deliberate — no fast cuts in the first half. The pacing mirrors the creeping realization.",
  "lighting": "Soft morning window light from one side, warm but slightly flat — the kind of light that makes everything look ordinary and fine before you look closer. The screen glow adds a cool secondary source that subtly competes with the warmth, creating a small visual tension between the hopeful morning and the cold data.",
  "palette": "Warm neutrals for the environment — off-white walls, natural wood desk, muted sage or terracotta accents. The screen is the only source of cooler blue-grey tones. No brand-forward colors until the product moment, where a single clean accent (soft teal or slate blue) enters with the Fenrik interface.",
  "environment": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a startup loft, not a corporate office. A framed license or certificate visible but not foregrounded. Plants optional. The space should feel like someone who built something real and is proud of it.",
  "camera_style": "Handheld but composed — slight natural movement that keeps it feeling observational rather than staged. Push-in slowly on the screen during the realization beat. Cut to over-the-shoulder POV for the analytics close-up. The competitor-tab sequence uses a clean screen-capture style insert, brief and precise. Final frame is a static wide shot of the desk with the screen now showing a lead notification.",
  "character_style": "One central character — a woman in her late 30s or early 40s, owner of a local service business (deliberately non-specific industry to stay broadly relatable). Dressed practically, not stylishly. Her expression does the narrative work: pleased, then puzzled, then still — the stillness of someone doing quiet math in their head. No dialogue. No voiceover from her. She is observed, not interviewed.",
  "opening_emotion": "A creeping sense of unease as realization dawns.",
  "opening_first_image": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen."
}
```

**Byte-equal to persisted visual_identity:** false
## 2.8 Content Package

**PERSISTED OUTPUT:** full `package_brief` (post hook-align + normalize + presentation stamp)
```json
{
  "cta": {
    "text": "Save this if you've ever checked your analytics and felt that quiet sinking feeling.",
    "type": "save"
  },
  "hook": "You thought traffic meant success.",
  "video": {
    "script": "SCENE 1 — OPEN: Warm morning light. A woman in her late 30s sits at a lived-in desk, coffee in hand. She opens her laptop. Analytics dashboard fills the screen. Sessions: 34. She leans back, satisfied. The camera holds on her face — pleased.\n\nVO: 'You thought traffic meant success.'\n\nSCENE 2 — REALIZATION: Slow push-in on the screen. The lead column comes into focus. Zero. She leans closer. Scrolls. Nothing. No form fills. No emails. No names. Her expression changes — not panic, just stillness. Quiet math.\n\nVO: 'She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone.'\n\nSCENE 3 — VISITOR SEQUENCE: Screen-capture style inserts. A visitor lands on a service page at 9 PM Saturday. Reads. Has a question. Finds nothing to ask it. Opens a new tab — a competitor. Then another visitor. Then another. Each one gone.\n\nVO: 'They came. They had questions. They found silence. And they went to whoever answered first.'\n\nSCENE 4 — PRODUCT MOMENT: The same desk. Same woman. But now a soft teal chat interface sits in the corner of her website screen. A visitor question appears. An answer follows — instant. A lead notification pops. She didn't do anything. The website did.\n\nVO: 'The website was live. The business was not.'\n\nSCENE 5 — FINAL FRAME: Static wide shot. Desk, warm light, laptop. The analytics screen is visible — lead count no longer zero. Camera holds. No dialogue. The image does the work.",
    "concept": "A small business owner opens her analytics dashboard on a Tuesday morning, pleased by the weekend traffic numbers. The camera pushes in slowly as she sees the leads column: zero. The video then cuts through a sequence of silent visitor moments — people who arrived, had questions, got no response, and left for a competitor. The story closes with the reframe: traffic was never the problem. The silence was.",
    "duration_seconds": "42"
  },
  "hashtags": [
    "#smallbusiness",
    "#websitetraffic",
    "#leadgeneration",
    "#businessowner",
    "#servicebusiness",
    "#growyourbusiness",
    "#businesstips"
  ],
  "scenario": "A small business owner opens her analytics dashboard on Tuesday morning, pleased to see 34 weekend sessions. The satisfaction dissolves when she looks at the leads column — zero. No names, no emails, no form fills. Visitors arrived over the weekend, had questions, found a static page with no way to ask them, and moved on to competitors who could respond. She had no idea any of it was happening.",
  "subtitles": "You thought traffic meant success. / She opened her analytics on Tuesday morning — 34 sessions over the weekend. / She smiled. / Then she looked at the leads column. / Zero. / No names. No emails. No record of anyone. / They came. They had questions. They found silence. / And they went to whoever answered first. / The website was live. / The business was not.",
  "asset_usage": [],
  "image_prompts": [
    "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement.",
    "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness.",
    "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left.",
    "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised.",
    "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
  ],
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
  "voiceover_text": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
  "platform_outputs": {
    "x": {
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
    },
    "tiktok": {
      "cta": null,
      "format": "reel",
      "caption": "34 visitors. 0 leads. Her website was live. Her business wasn't. 👀",
      "hashtags": [
        "#smallbusiness",
        "#websitetips",
        "#leadgeneration",
        "#businessowner"
      ]
    },
    "youtube": {
      "cta": "Save this one.",
      "format": "short",
      "caption": "34 weekend visitors. Zero leads. She thought traffic meant success — until she looked closer. Save this one.",
      "hashtags": [
        "#smallbusiness",
        "#websitetips"
      ]
    },
    "facebook": {
      "cta": "Save this if it sounds familiar.",
      "format": "reel",
      "caption": "Ever opened your analytics and felt quietly proud of the traffic — then noticed zero leads came from it? 😶 That's the gap most business owners don't see until it's been happening for months. Your visitors had questions. Your website had nothing to say. Save this if it sounds familiar, and share it with a business owner who needs to hear it.",
      "hashtags": [
        "#smallbusiness",
        "#businesstips"
      ]
    },
    "linkedin": {
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
    },
    "instagram": {
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
  },
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
  }
}
```

## 2.9 Images

**INPUT prompts (from video_job.input.scenes):**
```json
[
  {
    "id": "scene-1",
    "type": "IMAGE",
    "image_prompt": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement.",
    "duration_seconds": 4,
    "payload_snapshot": {
      "media": {
        "source": "ai",
        "image_prompt": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement."
      }
    },
    "renderer_version": "image@1"
  },
  {
    "id": "scene-2",
    "type": "IMAGE",
    "image_prompt": "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness.",
    "duration_seconds": 4,
    "payload_snapshot": {
      "media": {
        "source": "ai",
        "image_prompt": "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness."
      }
    },
    "renderer_version": "image@1"
  },
  {
    "id": "scene-3",
    "type": "IMAGE",
    "image_prompt": "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left.",
    "duration_seconds": 4,
    "payload_snapshot": {
      "media": {
        "source": "ai",
        "image_prompt": "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left."
      }
    },
    "renderer_version": "image@1"
  },
  {
    "id": "scene-4",
    "type": "IMAGE",
    "image_prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised.",
    "duration_seconds": 4,
    "payload_snapshot": {
      "media": {
        "source": "ai",
        "image_prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised."
      }
    },
    "renderer_version": "image@1"
  },
  {
    "id": "scene-5",
    "type": "IMAGE",
    "image_prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution.",
    "duration_seconds": 4,
    "payload_snapshot": {
      "media": {
        "source": "ai",
        "image_prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
      }
    },
    "renderer_version": "image@1"
  }
]
```

**OUTPUT still paths (from render_spec.scenes):**
```json
[
  {
    "id": "scene-1",
    "type": "IMAGE",
    "image_bucket": "video-renders",
    "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-1.png",
    "duration_seconds": 4,
    "image_prompt": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement."
  },
  {
    "id": "scene-2",
    "type": "IMAGE",
    "image_bucket": "video-renders",
    "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-2.png",
    "duration_seconds": 4,
    "image_prompt": "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness."
  },
  {
    "id": "scene-3",
    "type": "IMAGE",
    "image_bucket": "video-renders",
    "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-3.png",
    "duration_seconds": 4,
    "image_prompt": "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left."
  },
  {
    "id": "scene-4",
    "type": "IMAGE",
    "image_bucket": "video-renders",
    "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-4.png",
    "duration_seconds": 4,
    "image_prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised."
  },
  {
    "id": "scene-5",
    "type": "IMAGE",
    "image_bucket": "video-renders",
    "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-5.png",
    "duration_seconds": 4,
    "image_prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
  }
]
```

**Image generation telemetry step:**
```json
{
  "model": "gpt-image-1",
  "repair": false,
  "success": true,
  "provider": "image",
  "warnings": [],
  "raw_usage": {
    "usd_per_still": 0.042,
    "reused_still_count": 0,
    "generated_still_count": 5
  },
  "step_name": "Image generation",
  "max_tokens": null,
  "started_at": "2026-07-25T00:10:06.154Z",
  "duration_ms": 112454,
  "finished_at": "2026-07-25T00:11:58.607Z",
  "retry_count": 0,
  "temperature": null,
  "cached_tokens": null,
  "error_message": null,
  "input_summary": "Image generation input:\n- 5 scene(s)\n- Visual profile / medium",
  "prompt_tokens": null,
  "estimated_cost": 0.21,
  "output_summary": "generated=5; reused=0",
  "pricing_source": "list_price_estimate",
  "pricing_version": "list-price@2026-07-23",
  "response_format": null,
  "input_size_bytes": null,
  "completion_tokens": null,
  "output_size_bytes": 67,
  "prompt_characters": null,
  "provider_request_id": null,
  "completion_characters": 67
}
```

## 2.10 Voice (TTS)

**INPUT:**
```json
{
  "voiceover_text": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
  "tts_voice": "shimmer",
  "selected_voice": "shimmer",
  "voice_source": "package_secondary",
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: measured, credible. Language: en."
}
```

**OUTPUT telemetry:**
```json
{
  "model": "gpt-4o-mini-tts",
  "repair": false,
  "success": true,
  "provider": "tts",
  "warnings": [],
  "raw_usage": {
    "character_count": 343,
    "duration_seconds": 25.248,
    "usd_per_1k_chars": 0.015
  },
  "step_name": "TTS",
  "max_tokens": null,
  "started_at": "2026-07-25T00:09:56.951Z",
  "duration_ms": 6384,
  "finished_at": "2026-07-25T00:10:03.334Z",
  "retry_count": 0,
  "temperature": null,
  "cached_tokens": null,
  "error_message": null,
  "input_summary": "TTS input:\n- Voiceover text\n- Voice / instructions",
  "prompt_tokens": null,
  "estimated_cost": 0.005145,
  "output_summary": "audio duration=25.248s",
  "pricing_source": "list_price_estimate",
  "pricing_version": "list-price@2026-07-23",
  "response_format": null,
  "input_size_bytes": 345,
  "completion_tokens": null,
  "output_size_bytes": 114,
  "prompt_characters": 343,
  "provider_request_id": null,
  "completion_characters": 114
}
```

**TTS validation debug:**
```json
{
  "speech_duration": 25.248,
  "audio_duration": 26.748,
  "tts_tail_expected": [
    "the",
    "business",
    "was",
    "not"
  ],
  "tts_tail_transcript": [
    "the",
    "website",
    "was",
    "live",
    "the",
    "business",
    "was",
    "not"
  ],
  "tts_tail_validation_passed": true,
  "tts_validation_log": [
    {
      "pass": true,
      "attempt": 1,
      "expected_tail": [
        "the",
        "business",
        "was",
        "not"
      ],
      "durationSeconds": 25.248,
      "transcript_tail": [
        "the",
        "website",
        "was",
        "live",
        "the",
        "business",
        "was",
        "not"
      ]
    }
  ],
  "tts_validation_attempts": 1,
  "tts_tail_retry_used": false
}
```

## 2.11 Whisper

```json
{
  "model": "whisper-1",
  "repair": false,
  "success": true,
  "provider": "whisper",
  "warnings": [],
  "raw_usage": {
    "word_count": 57,
    "usd_per_min": 0.006,
    "fallback_used": false,
    "duration_seconds": 25.248
  },
  "step_name": "Whisper",
  "max_tokens": null,
  "started_at": "2026-07-25T00:10:03.336Z",
  "duration_ms": 2638,
  "finished_at": "2026-07-25T00:10:05.974Z",
  "retry_count": 0,
  "temperature": null,
  "cached_tokens": null,
  "error_message": null,
  "input_summary": "Whisper input:\n- Voiceover audio\n- Language hint",
  "prompt_tokens": null,
  "estimated_cost": 0.002525,
  "output_summary": "57 words (english)",
  "pricing_source": "list_price_estimate",
  "pricing_version": "list-price@2026-07-23",
  "response_format": null,
  "input_size_bytes": null,
  "completion_tokens": null,
  "output_size_bytes": 37,
  "prompt_characters": null,
  "provider_request_id": null,
  "completion_characters": 37
}
```

```json
{
  "language_detected": "english",
  "whisper_word_count": 57,
  "fallback_used": false,
  "subtitle_source": "whisper",
  "match_ratio": 0.9661016949152542
}
```

**Full word-level Whisper transcript: NOT PERSISTED.**
## 2.12 Subtitles

**Package phrase subtitles (pre-whisper plan):**
```text
You thought traffic meant success. / She opened her analytics on Tuesday morning — 34 sessions over the weekend. / She smiled. / Then she looked at the leads column. / Zero. / No names. No emails. No record of anyone. / They came. They had questions. They found silence. / And they went to whoever answered first. / The website was live. / The business was not.
```

**Job input subtitles:**
```text
You thought traffic meant success. / She opened her analytics on Tuesday morning — 34 sessions over the weekend. / She smiled. / Then she looked at the leads column. / Zero. / No names. No emails. No record of anyone. / They came. They had questions. They found silence. / And they went to whoever answered first. / The website was live. / The business was not.
```

```json
{
  "srt_last_cue_end": 25.059999465942383,
  "subtitle_timeline_duration": 25.059999465942383,
  "subtitle_warning": false,
  "subtitle_url": "[REDACTED_SIGNED_URL — see video_job.output.subtitle_url]"
}
```

**SRT file body: NOT INLINE in DB; stored in storage at subtitle_url.**
## 2.13 Render

```json
{
  "model": null,
  "repair": false,
  "success": true,
  "provider": "video",
  "warnings": [],
  "raw_usage": null,
  "step_name": "Video rendering",
  "max_tokens": null,
  "started_at": "2026-07-25T00:11:58.750Z",
  "duration_ms": 159815,
  "finished_at": "2026-07-25T00:14:38.562Z",
  "retry_count": 0,
  "temperature": null,
  "cached_tokens": null,
  "error_message": null,
  "input_summary": "Video rendering input:\n- Scene stills\n- Voiceover\n- Subtitles\n- Motion beats",
  "prompt_tokens": null,
  "estimated_cost": null,
  "output_summary": "video_duration=26.733333",
  "pricing_source": null,
  "pricing_version": null,
  "response_format": null,
  "input_size_bytes": null,
  "completion_tokens": null,
  "output_size_bytes": 50,
  "prompt_characters": null,
  "provider_request_id": null,
  "completion_characters": 50
}
```

**render_spec:**
```json
{
  "scenes": [
    {
      "id": "scene-1",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-1.png",
      "image_bucket": "video-renders",
      "image_prompt": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-2",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-2.png",
      "image_bucket": "video-renders",
      "image_prompt": "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-3",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-3.png",
      "image_bucket": "video-renders",
      "image_prompt": "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-4",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-4.png",
      "image_bucket": "video-renders",
      "image_prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-5",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-5.png",
      "image_bucket": "video-renders",
      "image_prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
        }
      },
      "renderer_version": "image@1"
    }
  ],
  "version": 1,
  "metadata": {
    "rendered_at": "2026-07-25T00:14:44.680Z",
    "semantic_motion": {
      "beats": [
        {
          "beat_id": "beat-1",
          "scene_id": "scene-1",
          "motion_intent": "EXPLAIN",
          "motion_version": "semantic-motion@2",
          "motion_intensity": "LOW",
          "motion_primitive": "static"
        },
        {
          "beat_id": "beat-2",
          "scene_id": "scene-2",
          "motion_intent": "EXPLAIN",
          "motion_version": "semantic-motion@2",
          "motion_intensity": "LOW",
          "motion_primitive": "pan_left"
        },
        {
          "beat_id": "beat-3",
          "scene_id": "scene-3",
          "motion_intent": "EXPLAIN",
          "motion_version": "semantic-motion@2",
          "motion_intensity": "LOW",
          "motion_primitive": "static"
        },
        {
          "beat_id": "beat-4",
          "scene_id": "scene-4",
          "motion_intent": "EMPHASIS",
          "motion_version": "semantic-motion@2",
          "motion_intensity": "LOW",
          "motion_primitive": "zoom_in"
        },
        {
          "beat_id": "beat-5",
          "scene_id": "scene-5",
          "motion_intent": "CLOSE",
          "motion_version": "semantic-motion@2",
          "motion_intensity": "LOW",
          "motion_primitive": "static"
        }
      ],
      "version": "semantic-motion@2"
    }
  }
}
```

**render debug (selected):**
```json
{
  "video_duration": 26.733333,
  "post_mux_duration": 26.748,
  "intermediate_video_duration": 26.733333,
  "post_subtitle_duration": 26.733333,
  "target_duration": 26.748,
  "duration_delta": 0.014667000000002872,
  "render_warning": false,
  "render_warnings": [],
  "sfx_mixed": false,
  "sfx_reason": "not_selected",
  "mp4_url": "[REDACTED_SIGNED_URL]",
  "thumbnail_url": "[REDACTED_SIGNED_URL]",
  "artifacts_persisted_at": "2026-07-25T00:14:44.797Z"
}
```

# 3. EXACT AI PROMPTS

## Storage note

Raw prompts were not stored. Below = **RECONSTRUCTED** unless marked otherwise.

## 3.1 Content Strategy

- MODEL (telemetry): `claude-sonnet-4-6`
- PROVIDER: `claude`
- TEMPERATURE (telemetry): null
- MAX_TOKENS (telemetry): 8192
- MAX_TOKENS (config at audit): null
- RESPONSE_FORMAT: "json"
- STOP: not set in ClaudeProvider (Anthropic Messages API — no stop_sequences in code path)
- TOOLS: none
- prompt_characters telemetry: 18133
- reconstructed user prompt chars: 17746
- char match: false

### SYSTEM PROMPT (RECONSTRUCTED = PRODUCTION_STRATEGY_SYSTEM)
```text
You are the Content Strategy Layer for an AI Content Manager. You design a coherent batch of content PACKAGE concepts for a production run (each item is one video package concept — NOT a calendar week plan). Your only jobs: distribute generated videos across the batch, maintain variety, maintain funnel balance, maintain tone balance, and maintain content diversity. Funnel stages are exactly: Awareness, Problem Aware, Solution Aware, Conversion. Balance the funnel across these stages; it must never be Conversion-only. Every content_plan item MUST have a funnel_stage. Prefer evergreen_topic_id or trend_id when those lists provide IDs; eligible trends are optional bonus context only. When both lists are empty, derive topics from the Product Brain and omit trend_id and evergreen_topic_id. Never invent UUIDs.
```

### USER PROMPT (RECONSTRUCTED)
```text
PROJECT BRAIN:
- name: Fenrik.chat
- type: saas
- language: en
- market_scope: global
- goal_type: lead_generation
- target_audience: {"segments":["Local services and consulting firms","Car dealers, beauty salons, and service centers","SaaS and software companies","Lawyers, accountants, and agencies","Marketing agencies","Consultants","Professional services","Small businesses","SMB service companies"]}
- tone_of_voice: {"notes":["Simple and accessible","Direct and action-oriented","Transparent and honest","Friendly and approachable","Concise and practical"]}
- product_is: AI chatbot platform for websites; Automatically analyzes website URL to build a knowledge base; Answers visitor questions 24/7; Guides visitors to the right service or information; Captures leads automatically; Deployed via a simple embed script; Creates an AI assistant in about one minute; Uses existing website content automatically; Preview before signup; No training required
- product_is_not (NEVER claim these): Not a product requiring developer skills or coding; Not a complex integration requiring technical knowledge; Not limited to tech companies only; Not a custom AI project; Not a live human chat service; Not a chatbot that requires manual training
- product_strengths: AI assistant created in as little as 1 minute; No code or technical knowledge required; Fixed monthly pricing starting at $69/month; Try a preview without registration; Works across many industries and business types; Simple single embed script deployment; Answers instantly; Captures leads outside business hours; Uses your website content automatically; No training required; No coding required; Preview before registration; Transparent pricing; Starts working from existing website immediately
- pain_points: Unable to answer customer questions when offline; No resources to build or maintain a custom chatbot; Losing leads due to lack of instant website support; Complexity and cost of traditional chatbot integrations; Need for 24/7 customer support without extra staff; Visitors leave before contacting you; Repeating the same customer questions every day
- forbidden_claims (NEVER use): (none)
- platforms: instagram; linkedin; tiktok; youtube; x
- default_cta: Create your AI assistant

HARD CONSTRAINTS:
- Write in the project language (en) and tone of voice.
- Never produce any forbidden_claims.
- Never describe the product as anything in product_is_not.
- Output must be a single valid JSON document, no prose, no code fences.

PAIN POINT FIRST (the PRIMARY content source — the central topic of EVERY content item MUST be anchored to a real customer pain point):
PROJECT PAIN POINTS (anchor topics to these):
- Unable to answer customer questions when offline
- No resources to build or maintain a custom chatbot
- Losing leads due to lack of instant website support
- Complexity and cost of traditional chatbot integrations
- Need for 24/7 customer support without extra staff
- Visitors leave before contacting you
- Repeating the same customer questions every day
PAIN POINT RULES:
- The central topic MUST solve, expose, amplify, or dramatize one of the pain points above. The pain point is the STORY.
- Details may SUPPORT the story; details must NOT become the story. Do NOT make a minor detail (a dirty switch, a dusty handle, a trash-can smell, a single forgotten object) the PRIMARY topic — it can only appear as supporting evidence inside a larger pain point.
- 80/20 RULE: about 80% of items must be tied DIRECTLY to one explicit pain point above; the other ~20% may be a supporting insight, mistake, observation or detail — but each of those MUST still connect back to a pain point.
- TREND + PAIN POINT: trend topics are allowed, but a trend MUST connect to a pain point. GOOD: trend "summer tourism boom" -> pain point "more guest turnover". BAD: trend "summer tourism boom" -> "clean trash can lid".
- GOOD primary topics (examples): guest complaint, bad review, late checkout, stress before guest arrival, no time to clean.
- BAD primary topics (examples): trash can smell, dusty switch, a single forgotten object — unless used as supporting evidence inside a larger pain point.

PROOF POOL (available marketing ammunition — NOT mandatory):
- Starting at $69/month with transparent monthly subscription
- No hidden fees stated explicitly
- Try the preview without registration required
- Simple embed script — no integrations or technical knowledge required
- Works on existing websites
- Uses website content automatically
- Can be installed with one script
- Preview available before signup
- AI generated directly from your website
- Live preview before activation
- Website can be activated with one embed script
PROOF RULES:
- Use a proof point ONLY when it is genuinely relevant to the topic/angle.
- Proof is optional; do not force it into every piece of content.
- Never repeat the same proof point across items; vary or omit it.
- Never invent proof or alter the numbers/claims in the pool.

SCENARIO POOL (concrete customer situations — inspiration, NOT mandatory):
- A potential client lands on a law firm's website at 11 PM to ask about a contract dispute, but there's no one available to respond and they leave without leaving any contact details.
- A car dealership's website gets a flood of visitors over a holiday weekend while the sales team is off, and interested buyers can't get answers about financing options or vehicle availability.
- A marketing agency owner is presenting a proposal to a new client when a website visitor tries to inquire about pricing packages but abandons the page after waiting with no response.
- A beauty salon owner realizes on Monday morning that several people visited the website over the weekend asking about appointment availability, but left no way to follow up with them.
- A SaaS founder notices in their analytics that dozens of free trial visitors dropped off the pricing page overnight without converting, having had no one to answer their questions in real time.
- An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.
- A consultant's website attracts a qualified prospect who wants to understand which service package fits their needs, but the site only has static text and the prospect moves on to a competitor.
- A local HVAC service center gets a spike in website traffic during a summer heatwave, but the front desk is overwhelmed with calls and no one is available to handle the simultaneous online inquiries.
- A software company's support page is visited by a prospective enterprise customer at 2 AM who needs a specific integration question answered before a morning board meeting, and the page offers no interactive help.
- A boutique consulting firm just launched a redesigned website but has no budget to hire a dedicated support person, leaving visitors with complex service questions completely unanswered during off-hours.
SCENARIO RULES:
- Scenarios are inspiration to make content specific; they are optional.
- ROTATE scenarios across content; do not reuse the same one every time.
- Adapt a scenario to the topic/angle; never copy it verbatim as a claim.
- Never invent facts; a scenario is a situation, not a proof or guarantee.

ANTI-REPETITION MEMORY (recently used — AVOID REPEATING these unless the regeneration instruction says to keep them):
Hooks:
- You thought traffic meant success.
- Your clock stopped. Theirs didn't.
- You've been defining this number wrong for years.
- You track everything. Except the thing that's costing you the most.
- Every other chatbot integration looks like this.
- You built the whole pipeline. You just forgot to put anything at the end of it.
- One tab closed. No email. No missed call. No record. Just gone.
- Everything rehearsed. Except what happens when someone asks a question.
- She left a five-star review. Just not for you.
- You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question.
- The window is open. No one's behind it.
- Three years of answers. Zero conversations.
- You've hired for everything. Except this.
- They were on your pricing page for 94 seconds. They left with their question still unanswered.
- Paper mountain of anonymous visits.
- After hours, chats still screaming.
- Urgent question dies in silence.
- She sent the newsletter. Forty people clicked. And every single one left without a word.
- Form abandoned now, discovered after vacation.
- Good traffic means your website is working. It does not.
Topics:
- The small business owner who checked her website analytics on Tuesday and realized every single weekend visitor had left without a trace
- The software company that answered every support ticket within hours — and still lost the enterprise deal because no one was there at 2 AM when it actually mattered
- The small business owner who sent a campaign, got 50 website visitors in one afternoon, and woke up to zero leads — because no one was there to answer a single question
- Why the businesses that capture the most leads aren't always the ones with the best product — they're the ones whose websites respond first
- The part of setting up an AI assistant for your website that most business owners expect to be hard — and isn't
- What changes when your website can actually answer a visitor's question — the moment they ask it
- Why hiring more staff doesn't fix the problem of visitors who leave before they ever make contact
- The software company that spent six months building a pricing page — and still couldn't stop visitors from leaving it confused
- The local service company that tracked every call — and never once tracked how many people visited the website and left without a word
- Every business posts on social media to drive traffic — almost none of them have thought about what happens when that traffic arrives
- The small business owner who realized her website had a job — and it had never shown up for work
- What it looks like when your website actually answers a visitor question — in real time
- The silent cost of a website that can't talk back
- The software founder who read every exit on his pricing page — and finally understood what visitors were actually asking for
- The accountant who came back from a long weekend to find three qualified leads had visited — and left nothing behind
- The small business owner who discovered her website had been silently turning away visitors every single night
- The small business owner who watched three qualified visitors leave her website in one night — and only found out the next morning
- The small business owner who realized her website had never once answered a single visitor question
- The car dealer who got 60 weekend visitors and sold nothing — because no one could answer a single question
- The small accounting firm that sent a newsletter, got 40 website visitors in one evening, and woke up to zero leads
CTAs:
- Save this if you've ever checked your analytics and felt that quiet sinking feeling.
- Create your AI assistant — let your website keep running when you can't.
- Create your AI assistant — let your website answer the question that ends the bounce.
- Create your AI assistant — start capturing what the blank field never could.
- Create your AI assistant — the setup is shorter than you think.
- Create your AI assistant — let your website finally catch what you spent so much to send its way.
- Create your AI assistant — let your website answer the question that keeps your tab on the board.
- Create your AI assistant — let your website answer the question the page never could.
- Create your AI assistant — and make sure the next review lands where it should.
- Create your AI assistant — make your website as ready as your campaign.
- Create your AI assistant — let your website finally answer when someone knocks.
- Create your AI assistant — your content is already ready.
- Create your AI assistant — write the job description your website has always needed.
- Create your AI assistant — let your pricing page hold the conversation.
- Create your AI assistant — let your website answer while the office is dark.
- Create your AI assistant — let your website keep talking when you can't.
- Create your AI assistant — let your website answer while you're reviewing session recordings.
- Create your AI assistant — let your website answer while you're closed.
- Create your AI assistant — let your website answer while the lot is full and the team is off.
- Create your AI assistant — let your website answer while the analytics pile up.
Scenarios:
- A small business owner opens her analytics dashboard on Tuesday morning, pleased to see 34 weekend sessions. The satisfaction dissolves when she looks at the leads column — zero. No names, no emails, no form fills. Visitors arrived over the weekend, had questions, found a static page with no way to ask them, and moved on to competitors who could respond. She had no idea any of it was happening.
- A marketing agency owner is presenting a proposal to a new client when a website visitor tries to inquire about pricing packages but abandons the page after waiting with no response.
- A SaaS founder notices in their analytics that dozens of free trial visitors dropped off the pricing page overnight without converting, having had no one to answer their questions in real time.
- An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.
- A boutique consulting firm just launched a redesigned website but has no budget to hire a dedicated support person, leaving visitors with complex service questions completely unanswered during off-hours.
- A car dealership's website gets a flood of visitors over a holiday weekend while the sales team is off, and interested buyers can't get answers about financing options or vehicle availability.
- A beauty salon owner realizes on Monday morning that several people visited the website over the weekend asking about appointment availability, but left no way to follow up with them.
- A potential client lands on a law firm's website at 11 PM to ask about a contract dispute, but there's no one available to respond and they leave without leaving any contact details.
- A consultant's website attracts a qualified prospect who wants to understand which service package fits their needs, but the site only has static text and the prospect moves on to a competitor.
- A local HVAC service center gets a spike in website traffic during a summer heatwave, but the front desk is overwhelmed with calls and no one is available to handle the simultaneous online inquiries.
- A software company's support page is visited by a prospective enterprise customer at 2 AM who needs a specific integration question answered before a morning board meeting, and the page offers no interactive help.
ANTI-REPETITION RULES:
- Do NOT reuse any hook above; write a clearly different opening.
- Do NOT reuse any CTA above verbatim; vary the wording and angle.
- Do NOT repeat the topics/angles above.
- Do NOT reuse the scenarios above; choose a different situation (unless the instruction says to keep the scenario).
- Only repeat something if there is a strong, specific reason to.

CONTENT CONTROLS (funnel mix for this production run):
- TARGET FUNNEL MIX (approximate %): Awareness 15, Problem Aware 40, Solution Aware 30, Conversion 15.
- Distribute funnel_stage across content_plan items to approximate this mix.

PRODUCTION RUN CONTENT STRATEGY: plan exactly 1 content_plan items.
Responsibilities ONLY: distribute videos, maintain variety, funnel balance, tone balance, content diversity.
This is NOT a weekly calendar strategy.
Each item is ONE package concept (= one shared video theme). Platform outputs for multiple surfaces are generated later from the run config — do not create duplicate items per platform.

ELIGIBLE TRENDS (optional bonus; relevance_score >= 60; only use these trend_id values when relevant):
(none)

EVERGREEN TOPICS (reference by evergreen_topic_id):
(none)

TOPIC SOURCE: Eligible trends and evergreen topics are (none). Trends are optional — do NOT wait for trends. Derive each content_plan item topic and angle from the Product Brain (product_is, pain_points, strengths, audience, recent content memory). Omit trend_id and evergreen_topic_id on every item.

TASK: Produce a production strategy plan as JSON with this exact shape:
{
  "theme": "string",
  "funnel_distribution": { "Awareness": number, "Problem Aware": number, "Solution Aware": number, "Conversion": number },
  "content_plan": [
    {
      "platform": "tiktok",
      "format": "reel|post|short",
      "funnel_stage": "Awareness|Problem Aware|Solution Aware|Conversion",
      "topic": "string",
      "angle": "string",
      "pain_point": "string — copy one PROJECT PAIN POINT (or closest) this item anchors to",
      "priority": 1,
      "trend_id": "uuid from ELIGIBLE TRENDS when used",
      "evergreen_topic_id": "uuid from EVERGREEN TOPICS when used"
    }
  ]
}
Rules: content_plan MUST contain exactly 1 items (not fewer, not more). funnel_distribution must not be Conversion-only. Set platform to "tiktok" on every item. Every content_plan item must have topic + angle from Product Brain; omit trend_id and evergreen_topic_id. Every item MUST set pain_point to one real project pain point (verbatim or close paraphrase) and the topic MUST anchor to it (see PAIN POINT FIRST): ~80% directly tied to one explicit pain point, ~20% supporting details that still connect to a pain point.
```

### EXPECTED SHAPE (RECONSTRUCTED)
```text
(none)
```

### SCHEMA
```text
contentStrategyPlanSchema (lib/ai/schemas/contentStrategyPlan.ts)
```

### PARAMS
```json
{
  "timeoutMs": 180000,
  "maxTransportAttempts": 1,
  "json": true,
  "planning_meta": {
    "error": "Cannot read properties of undefined (reading 'length')"
  }
}
```

## 3.2 Video Concept

- MODEL: `claude-sonnet-4-6`
- PROVIDER: `claude`
- TEMPERATURE telemetry: null
- MAX_TOKENS telemetry: null
- ClaudeProvider default temperature when null: 0.7
- ClaudeProvider default max_tokens when null: 4096
- RESPONSE_FORMAT: "json"
- STOP: none
- TOOLS: none
- prompt_characters telemetry: 17304
- reconstructed user prompt chars: 17029
- char match: false

### SYSTEM PROMPT (RECONSTRUCTED)
```text
You are a senior creative director. Invent or revise ONE video concept for a short-form marketing video. Do not invent multiple candidates. Do not score or rank. The concept must already be strong enough to produce without later evaluation or repair. Return ONLY valid JSON.
```

### USER PROMPT (RECONSTRUCTED)
```text
TASK: Invent exactly ONE video concept.
PROJECT BRAIN:
- name: Fenrik.chat
- type: saas
- language: en
- market_scope: global
- goal_type: lead_generation
- target_audience: {"segments":["Local services and consulting firms","Car dealers, beauty salons, and service centers","SaaS and software companies","Lawyers, accountants, and agencies","Marketing agencies","Consultants","Professional services","Small businesses","SMB service companies"]}
- tone_of_voice: {"notes":["Simple and accessible","Direct and action-oriented","Transparent and honest","Friendly and approachable","Concise and practical"]}
- product_is: AI chatbot platform for websites; Automatically analyzes website URL to build a knowledge base; Answers visitor questions 24/7; Guides visitors to the right service or information; Captures leads automatically; Deployed via a simple embed script; Creates an AI assistant in about one minute; Uses existing website content automatically; Preview before signup; No training required
- product_is_not (NEVER claim these): Not a product requiring developer skills or coding; Not a complex integration requiring technical knowledge; Not limited to tech companies only; Not a custom AI project; Not a live human chat service; Not a chatbot that requires manual training
- product_strengths: AI assistant created in as little as 1 minute; No code or technical knowledge required; Fixed monthly pricing starting at $69/month; Try a preview without registration; Works across many industries and business types; Simple single embed script deployment; Answers instantly; Captures leads outside business hours; Uses your website content automatically; No training required; No coding required; Preview before registration; Transparent pricing; Starts working from existing website immediately
- pain_points: Unable to answer customer questions when offline; No resources to build or maintain a custom chatbot; Losing leads due to lack of instant website support; Complexity and cost of traditional chatbot integrations; Need for 24/7 customer support without extra staff; Visitors leave before contacting you; Repeating the same customer questions every day
- forbidden_claims (NEVER use): (none)
- platforms: instagram; linkedin; tiktok; youtube; x
- default_cta: Create your AI assistant
PROOF POOL (available marketing ammunition — NOT mandatory):
- Starting at $69/month with transparent monthly subscription
- No hidden fees stated explicitly
- Try the preview without registration required
- Simple embed script — no integrations or technical knowledge required
- Works on existing websites
- Uses website content automatically
- Can be installed with one script
- Preview available before signup
- AI generated directly from your website
- Live preview before activation
- Website can be activated with one embed script
PROOF RULES:
- Use a proof point ONLY when it is genuinely relevant to the topic/angle.
- Proof is optional; do not force it into every piece of content.
- Never repeat the same proof point across items; vary or omit it.
- Never invent proof or alter the numbers/claims in the pool.
SCENARIO POOL (concrete customer situations — inspiration, NOT mandatory):
- A potential client lands on a law firm's website at 11 PM to ask about a contract dispute, but there's no one available to respond and they leave without leaving any contact details.
- A car dealership's website gets a flood of visitors over a holiday weekend while the sales team is off, and interested buyers can't get answers about financing options or vehicle availability.
- A marketing agency owner is presenting a proposal to a new client when a website visitor tries to inquire about pricing packages but abandons the page after waiting with no response.
- A beauty salon owner realizes on Monday morning that several people visited the website over the weekend asking about appointment availability, but left no way to follow up with them.
- A SaaS founder notices in their analytics that dozens of free trial visitors dropped off the pricing page overnight without converting, having had no one to answer their questions in real time.
- An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.
- A consultant's website attracts a qualified prospect who wants to understand which service package fits their needs, but the site only has static text and the prospect moves on to a competitor.
- A local HVAC service center gets a spike in website traffic during a summer heatwave, but the front desk is overwhelmed with calls and no one is available to handle the simultaneous online inquiries.
- A software company's support page is visited by a prospective enterprise customer at 2 AM who needs a specific integration question answered before a morning board meeting, and the page offers no interactive help.
- A boutique consulting firm just launched a redesigned website but has no budget to hire a dedicated support person, leaving visitors with complex service questions completely unanswered during off-hours.
SCENARIO RULES:
- Scenarios are inspiration to make content specific; they are optional.
- ROTATE scenarios across content; do not reuse the same one every time.
- Adapt a scenario to the topic/angle; never copy it verbatim as a claim.
- Never invent facts; a scenario is a situation, not a proof or guarantee.
SELECTED PAIN POINT (dominant problem for THIS package — stay anchored here):
- Visitors leave before contacting you
PAIN POINT RULES:
- This pain point is the STORY. Details may support it; details must NOT replace it.
- Hook, concept, script, and CTA must dramatize, expose, or solve THIS problem.
- Do not drift onto a minor detail as the primary topic.
ANTI-REPETITION MEMORY (recently used — AVOID REPEATING these unless the regeneration instruction says to keep them):
Hooks:
- Your clock stopped. Theirs didn't.
- You've been defining this number wrong for years.
- You track everything. Except the thing that's costing you the most.
- Every other chatbot integration looks like this.
- You built the whole pipeline. You just forgot to put anything at the end of it.
- One tab closed. No email. No missed call. No record. Just gone.
- Everything rehearsed. Except what happens when someone asks a question.
- She left a five-star review. Just not for you.
- You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question.
- The window is open. No one's behind it.
- Three years of answers. Zero conversations.
- You've hired for everything. Except this.
- They were on your pricing page for 94 seconds. They left with their question still unanswered.
- Paper mountain of anonymous visits.
- After hours, chats still screaming.
- Urgent question dies in silence.
- She sent the newsletter. Forty people clicked. And every single one left without a word.
- Form abandoned now, discovered after vacation.
- Good traffic means your website is working. It does not.
- Eleven visitors came to her website over the weekend
Topics:
- The software company that answered every support ticket within hours — and still lost the enterprise deal because no one was there at 2 AM when it actually mattered
- The small business owner who sent a campaign, got 50 website visitors in one afternoon, and woke up to zero leads — because no one was there to answer a single question
- Why the businesses that capture the most leads aren't always the ones with the best product — they're the ones whose websites respond first
- The part of setting up an AI assistant for your website that most business owners expect to be hard — and isn't
- What changes when your website can actually answer a visitor's question — the moment they ask it
- Why hiring more staff doesn't fix the problem of visitors who leave before they ever make contact
- The software company that spent six months building a pricing page — and still couldn't stop visitors from leaving it confused
- The local service company that tracked every call — and never once tracked how many people visited the website and left without a word
- Every business posts on social media to drive traffic — almost none of them have thought about what happens when that traffic arrives
- The small business owner who realized her website had a job — and it had never shown up for work
- What it looks like when your website actually answers a visitor question — in real time
- The silent cost of a website that can't talk back
- The software founder who read every exit on his pricing page — and finally understood what visitors were actually asking for
- The accountant who came back from a long weekend to find three qualified leads had visited — and left nothing behind
- The small business owner who discovered her website had been silently turning away visitors every single night
- The small business owner who watched three qualified visitors leave her website in one night — and only found out the next morning
- The small business owner who realized her website had never once answered a single visitor question
- The car dealer who got 60 weekend visitors and sold nothing — because no one could answer a single question
- The small accounting firm that sent a newsletter, got 40 website visitors in one evening, and woke up to zero leads
- The service business owner who found out her website had been saying nothing to every visitor for months
CTAs:
- Create your AI assistant — let your website keep running when you can't.
- Create your AI assistant — let your website answer the question that ends the bounce.
- Create your AI assistant — start capturing what the blank field never could.
- Create your AI assistant — the setup is shorter than you think.
- Create your AI assistant — let your website finally catch what you spent so much to send its way.
- Create your AI assistant — let your website answer the question that keeps your tab on the board.
- Create your AI assistant — let your website answer the question the page never could.
- Create your AI assistant — and make sure the next review lands where it should.
- Create your AI assistant — make your website as ready as your campaign.
- Create your AI assistant — let your website finally answer when someone knocks.
- Create your AI assistant — your content is already ready.
- Create your AI assistant — write the job description your website has always needed.
- Create your AI assistant — let your pricing page hold the conversation.
- Create your AI assistant — let your website answer while the office is dark.
- Create your AI assistant — let your website keep talking when you can't.
- Create your AI assistant — let your website answer while you're reviewing session recordings.
- Create your AI assistant — let your website answer while you're closed.
- Create your AI assistant — let your website answer while the lot is full and the team is off.
- Create your AI assistant — let your website answer while the analytics pile up.
- Create your AI assistant — let your website answer while you're away.
Scenarios:
- A marketing agency owner is presenting a proposal to a new client when a website visitor tries to inquire about pricing packages but abandons the page after waiting with no response.
- A SaaS founder notices in their analytics that dozens of free trial visitors dropped off the pricing page overnight without converting, having had no one to answer their questions in real time.
- An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.
- A boutique consulting firm just launched a redesigned website but has no budget to hire a dedicated support person, leaving visitors with complex service questions completely unanswered during off-hours.
- A car dealership's website gets a flood of visitors over a holiday weekend while the sales team is off, and interested buyers can't get answers about financing options or vehicle availability.
- A beauty salon owner realizes on Monday morning that several people visited the website over the weekend asking about appointment availability, but left no way to follow up with them.
- A potential client lands on a law firm's website at 11 PM to ask about a contract dispute, but there's no one available to respond and they leave without leaving any contact details.
- A consultant's website attracts a qualified prospect who wants to understand which service package fits their needs, but the site only has static text and the prospect moves on to a competitor.
- A local HVAC service center gets a spike in website traffic during a summer heatwave, but the front desk is overwhelmed with calls and no one is available to handle the simultaneous online inquiries.
- A software company's support page is visited by a prospective enterprise customer at 2 AM who needs a specific integration question answered before a morning board meeting, and the page offers no interactive help.
ANTI-REPETITION RULES:
- Do NOT reuse any hook above; write a clearly different opening.
- Do NOT reuse any CTA above verbatim; vary the wording and angle.
- Do NOT repeat the topics/angles above.
- Do NOT reuse the scenarios above; choose a different situation (unless the instruction says to keep the scenario).
- Only repeat something if there is a strong, specific reason to.
CREATIVE DIRECTIVE (soft guidance for this piece — shapes tone & structure, NEVER facts):
- These are optional creative preferences. Follow them when they help originality;
  do not force them if they fight Product Brain, the selected pain point, or Opening Impact.
- MODE (prefer): Contrarian — Challenges a common belief the audience holds. STRUCTURE: Common belief -> why it is wrong (dismantle with reasoning) -> proof of the better take -> CTA. NEVER: Attack the idea or habit, never a person or group.
- MODE BEATS (prefer this story shape): common_belief -> why_wrong -> proof -> cta
- HOOK ARCHETYPE (prefer): unexpected_truth — Open with a true but counter-intuitive statement that reframes the topic. FORM (do not copy verbatim): "The cleanest flats are usually the dirtiest where it counts." Do not open with "Did you know..." or a topic label.
- VOICE PERSONA (prefer): Insider — vocabulary: behind-the-scenes, trade specifics; rhythm: conspiratorial, lets-you-in pacing; energy: engaged, slightly exclusive; exaggeration: light, for intrigue only.
CREATIVE SAFETY (these ALWAYS override the directive on any conflict):
- Never lie; never invent numbers, names, results, quotes or testimonials.
- Never produce a forbidden_claim and never describe the product as anything in product_is_not.
- No shock without genuine relevance to the topic; no clickbait the content does not pay off.
- Humor must never mock the customer or devalue the product; the actual fix stays serious.
- Contrarian/controversial takes attack ideas or habits only — never a person or a protected group.
- The voice persona changes wording, rhythm and energy ONLY; it must not alter any fact or proof.
CONTENT STRATEGY ITEM:
- funnel_stage: Problem Aware
- topic: The small business owner who checked her website analytics on Tuesday and realized every single weekend visitor had left without a trace
- angle: Walk through the quiet horror of seeing real traffic with zero leads — visitors who had questions, found silence, and moved on to whoever answered first. The website was live. The business was not.
- platform: tiktok
- format: reel

PACKAGE SLOT: 1 of 1 in this production run — make this concept distinct from siblings.
HARD CONSTRAINTS:
- Write in the project language (en) and tone of voice.
- Never produce any forbidden_claims.
- Never describe the product as anything in product_is_not.
- Output must be a single valid JSON document, no prose, no code fences.
RULES:
- Produce ONE concept only — no alternatives, no voting, no critique.
- Ground the idea in Product Brain, Knowledge Base (proof/scenarios), Recent Memory, and this strategy item.
- Keep the SELECTED PAIN POINT as the dominant problem when provided.
- Creative Directive is soft guidance — prefer it for originality; never override product truth.
- Avoid repeating recent hooks/topics/CTAs from memory (unless the instruction explicitly asks to keep wording).
- Avoid repeating recent fingerprint ideas, visual worlds, and narrative mechanisms.
- visual_direction must be concrete enough to later drive image generation.
- character_style may be "none" when no recurring character is needed.
Return JSON with keys:
{
  "title": string,
  "core_idea": string,
  "narrative_arc": string,
  "emotional_tone": string,
  "audience_insight": string,
  "product_role": string,
  "why_it_works": string,
  "visual_direction": {
    "art_direction": string,
    "lighting": string,
    "palette": string,
    "environment": string,
    "camera_style": string,
    "character_style": string
  }
}
```

### EXPECTED SHAPE / SCHEMA
```text
videoConceptSchema (lib/content-pipeline/schemas.ts)
```

### PARAMS
```json
{
  "timeoutMs": 120000,
  "maxTransportAttempts": 1,
  "maxAttempts": 3,
  "json": true,
  "directives_mode_id": "contrarian",
  "directives_hook_id": "unexpected_truth",
  "directives_persona_id": "insider"
}
```

## 3.3 Opening Impact

- MODEL: `gpt-4o-mini-2024-07-18`
- PROVIDER: `openai`
- TEMPERATURE telemetry: null
- MAX_TOKENS telemetry: null
- OpenAITextProvider default temperature when null: 0.2
- OpenAITextProvider default max_tokens when null: 4096
- RESPONSE_FORMAT: "json"
- STOP: none in code path
- TOOLS: none
- prompt_characters telemetry: 20842
- reconstructed user prompt chars: 20636
- char match: false

### SYSTEM PROMPT (RECONSTRUCTED)
```text
You design the opening 1–2 seconds of a short marketing video. Optimize for immediate attention with specificity, curiosity, conflict, and product truth. Return ONLY valid JSON. Never invent product facts.
```

### USER PROMPT (RECONSTRUCTED)
```text
TASK: Design Opening Impact for this single video concept.
PROJECT BRAIN:
- name: Fenrik.chat
- type: saas
- language: en
- market_scope: global
- goal_type: lead_generation
- target_audience: {"segments":["Local services and consulting firms","Car dealers, beauty salons, and service centers","SaaS and software companies","Lawyers, accountants, and agencies","Marketing agencies","Consultants","Professional services","Small businesses","SMB service companies"]}
- tone_of_voice: {"notes":["Simple and accessible","Direct and action-oriented","Transparent and honest","Friendly and approachable","Concise and practical"]}
- product_is: AI chatbot platform for websites; Automatically analyzes website URL to build a knowledge base; Answers visitor questions 24/7; Guides visitors to the right service or information; Captures leads automatically; Deployed via a simple embed script; Creates an AI assistant in about one minute; Uses existing website content automatically; Preview before signup; No training required
- product_is_not (NEVER claim these): Not a product requiring developer skills or coding; Not a complex integration requiring technical knowledge; Not limited to tech companies only; Not a custom AI project; Not a live human chat service; Not a chatbot that requires manual training
- product_strengths: AI assistant created in as little as 1 minute; No code or technical knowledge required; Fixed monthly pricing starting at $69/month; Try a preview without registration; Works across many industries and business types; Simple single embed script deployment; Answers instantly; Captures leads outside business hours; Uses your website content automatically; No training required; No coding required; Preview before registration; Transparent pricing; Starts working from existing website immediately
- pain_points: Unable to answer customer questions when offline; No resources to build or maintain a custom chatbot; Losing leads due to lack of instant website support; Complexity and cost of traditional chatbot integrations; Need for 24/7 customer support without extra staff; Visitors leave before contacting you; Repeating the same customer questions every day
- forbidden_claims (NEVER use): (none)
- platforms: instagram; linkedin; tiktok; youtube; x
- default_cta: Create your AI assistant
PROOF POOL (available marketing ammunition — NOT mandatory):
- Starting at $69/month with transparent monthly subscription
- No hidden fees stated explicitly
- Try the preview without registration required
- Simple embed script — no integrations or technical knowledge required
- Works on existing websites
- Uses website content automatically
- Can be installed with one script
- Preview available before signup
- AI generated directly from your website
- Live preview before activation
- Website can be activated with one embed script
PROOF RULES:
- Use a proof point ONLY when it is genuinely relevant to the topic/angle.
- Proof is optional; do not force it into every piece of content.
- Never repeat the same proof point across items; vary or omit it.
- Never invent proof or alter the numbers/claims in the pool.
SCENARIO POOL (concrete customer situations — inspiration, NOT mandatory):
- A potential client lands on a law firm's website at 11 PM to ask about a contract dispute, but there's no one available to respond and they leave without leaving any contact details.
- A car dealership's website gets a flood of visitors over a holiday weekend while the sales team is off, and interested buyers can't get answers about financing options or vehicle availability.
- A marketing agency owner is presenting a proposal to a new client when a website visitor tries to inquire about pricing packages but abandons the page after waiting with no response.
- A beauty salon owner realizes on Monday morning that several people visited the website over the weekend asking about appointment availability, but left no way to follow up with them.
- A SaaS founder notices in their analytics that dozens of free trial visitors dropped off the pricing page overnight without converting, having had no one to answer their questions in real time.
- An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.
- A consultant's website attracts a qualified prospect who wants to understand which service package fits their needs, but the site only has static text and the prospect moves on to a competitor.
- A local HVAC service center gets a spike in website traffic during a summer heatwave, but the front desk is overwhelmed with calls and no one is available to handle the simultaneous online inquiries.
- A software company's support page is visited by a prospective enterprise customer at 2 AM who needs a specific integration question answered before a morning board meeting, and the page offers no interactive help.
- A boutique consulting firm just launched a redesigned website but has no budget to hire a dedicated support person, leaving visitors with complex service questions completely unanswered during off-hours.
SCENARIO RULES:
- Scenarios are inspiration to make content specific; they are optional.
- ROTATE scenarios across content; do not reuse the same one every time.
- Adapt a scenario to the topic/angle; never copy it verbatim as a claim.
- Never invent facts; a scenario is a situation, not a proof or guarantee.
SELECTED PAIN POINT (dominant problem for THIS package — stay anchored here):
- Visitors leave before contacting you
PAIN POINT RULES:
- This pain point is the STORY. Details may support it; details must NOT replace it.
- Hook, concept, script, and CTA must dramatize, expose, or solve THIS problem.
- Do not drift onto a minor detail as the primary topic.
ANTI-REPETITION MEMORY (recently used — AVOID REPEATING these unless the regeneration instruction says to keep them):
Hooks:
- Your clock stopped. Theirs didn't.
- You've been defining this number wrong for years.
- You track everything. Except the thing that's costing you the most.
- Every other chatbot integration looks like this.
- You built the whole pipeline. You just forgot to put anything at the end of it.
- One tab closed. No email. No missed call. No record. Just gone.
- Everything rehearsed. Except what happens when someone asks a question.
- She left a five-star review. Just not for you.
- You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question.
- The window is open. No one's behind it.
- Three years of answers. Zero conversations.
- You've hired for everything. Except this.
- They were on your pricing page for 94 seconds. They left with their question still unanswered.
- Paper mountain of anonymous visits.
- After hours, chats still screaming.
- Urgent question dies in silence.
- She sent the newsletter. Forty people clicked. And every single one left without a word.
- Form abandoned now, discovered after vacation.
- Good traffic means your website is working. It does not.
- Eleven visitors came to her website over the weekend
Topics:
- The software company that answered every support ticket within hours — and still lost the enterprise deal because no one was there at 2 AM when it actually mattered
- The small business owner who sent a campaign, got 50 website visitors in one afternoon, and woke up to zero leads — because no one was there to answer a single question
- Why the businesses that capture the most leads aren't always the ones with the best product — they're the ones whose websites respond first
- The part of setting up an AI assistant for your website that most business owners expect to be hard — and isn't
- What changes when your website can actually answer a visitor's question — the moment they ask it
- Why hiring more staff doesn't fix the problem of visitors who leave before they ever make contact
- The software company that spent six months building a pricing page — and still couldn't stop visitors from leaving it confused
- The local service company that tracked every call — and never once tracked how many people visited the website and left without a word
- Every business posts on social media to drive traffic — almost none of them have thought about what happens when that traffic arrives
- The small business owner who realized her website had a job — and it had never shown up for work
- What it looks like when your website actually answers a visitor question — in real time
- The silent cost of a website that can't talk back
- The software founder who read every exit on his pricing page — and finally understood what visitors were actually asking for
- The accountant who came back from a long weekend to find three qualified leads had visited — and left nothing behind
- The small business owner who discovered her website had been silently turning away visitors every single night
- The small business owner who watched three qualified visitors leave her website in one night — and only found out the next morning
- The small business owner who realized her website had never once answered a single visitor question
- The car dealer who got 60 weekend visitors and sold nothing — because no one could answer a single question
- The small accounting firm that sent a newsletter, got 40 website visitors in one evening, and woke up to zero leads
- The service business owner who found out her website had been saying nothing to every visitor for months
CTAs:
- Create your AI assistant — let your website keep running when you can't.
- Create your AI assistant — let your website answer the question that ends the bounce.
- Create your AI assistant — start capturing what the blank field never could.
- Create your AI assistant — the setup is shorter than you think.
- Create your AI assistant — let your website finally catch what you spent so much to send its way.
- Create your AI assistant — let your website answer the question that keeps your tab on the board.
- Create your AI assistant — let your website answer the question the page never could.
- Create your AI assistant — and make sure the next review lands where it should.
- Create your AI assistant — make your website as ready as your campaign.
- Create your AI assistant — let your website finally answer when someone knocks.
- Create your AI assistant — your content is already ready.
- Create your AI assistant — write the job description your website has always needed.
- Create your AI assistant — let your pricing page hold the conversation.
- Create your AI assistant — let your website answer while the office is dark.
- Create your AI assistant — let your website keep talking when you can't.
- Create your AI assistant — let your website answer while you're reviewing session recordings.
- Create your AI assistant — let your website answer while you're closed.
- Create your AI assistant — let your website answer while the lot is full and the team is off.
- Create your AI assistant — let your website answer while the analytics pile up.
- Create your AI assistant — let your website answer while you're away.
Scenarios:
- A marketing agency owner is presenting a proposal to a new client when a website visitor tries to inquire about pricing packages but abandons the page after waiting with no response.
- A SaaS founder notices in their analytics that dozens of free trial visitors dropped off the pricing page overnight without converting, having had no one to answer their questions in real time.
- An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.
- A boutique consulting firm just launched a redesigned website but has no budget to hire a dedicated support person, leaving visitors with complex service questions completely unanswered during off-hours.
- A car dealership's website gets a flood of visitors over a holiday weekend while the sales team is off, and interested buyers can't get answers about financing options or vehicle availability.
- A beauty salon owner realizes on Monday morning that several people visited the website over the weekend asking about appointment availability, but left no way to follow up with them.
- A potential client lands on a law firm's website at 11 PM to ask about a contract dispute, but there's no one available to respond and they leave without leaving any contact details.
- A consultant's website attracts a qualified prospect who wants to understand which service package fits their needs, but the site only has static text and the prospect moves on to a competitor.
- A local HVAC service center gets a spike in website traffic during a summer heatwave, but the front desk is overwhelmed with calls and no one is available to handle the simultaneous online inquiries.
- A software company's support page is visited by a prospective enterprise customer at 2 AM who needs a specific integration question answered before a morning board meeting, and the page offers no interactive help.
ANTI-REPETITION RULES:
- Do NOT reuse any hook above; write a clearly different opening.
- Do NOT reuse any CTA above verbatim; vary the wording and angle.
- Do NOT repeat the topics/angles above.
- Do NOT reuse the scenarios above; choose a different situation (unless the instruction says to keep the scenario).
- Only repeat something if there is a strong, specific reason to.
OPENING DIRECTIVE (soft — optional preference for the cold open):
- Prefer hook archetype unexpected_truth: Open with a true but counter-intuitive statement that reframes the topic.
- FORM (do not copy): "The cleanest flats are usually the dirtiest where it counts."
- Avoid: Do not open with "Did you know..." or a topic label.
- Ignore this preference if it conflicts with product truth or the selected pain point.
VIDEO CONCEPT:
- title: Good Traffic Is a Lie
- core_idea: Most small business owners believe that website traffic is proof their marketing is working. This video dismantles that belief by revealing what the analytics screen actually shows when you look closer — real people who arrived, had a question, got silence, and left for whoever answered first. The product is introduced not as a chatbot, but as the thing that makes the website actually present when a human arrives.
- narrative_arc: HOOK — Open on a business owner, coffee in hand, Tuesday morning, genuinely pleased as she opens her analytics dashboard. The numbers look good. Weekend traffic was real. She leans in. WHY WRONG — The camera pushes closer on the screen. Sessions: 34. Leads captured: 0. Bounce rate: 91%. She scrolls. Nothing. No form fills. No emails. No names. The voiceover lands the reframe: good traffic means people showed up. It does not mean anyone was home to meet them. DISMANTLE — A quick visual sequence: a visitor lands on the site at 9 PM Saturday, reads a service page, has a question, finds no way to ask it, opens a competitor tab. Then another visitor. Then another. The site was live. The business was not. PROOF — The voiceover pivots: the fix is not more traffic, not a bigger team, not a redesign. It is a website that can actually respond — one that reads your existing content, builds its own knowledge, and answers the moment someone asks. No training. No code. Ready in about a minute. CTA — Screen holds on the analytics dashboard, but this time the lead count is not zero. Voiceover closes: your traffic was never the problem.
- emotional_tone: Quietly unsettling at first — the creeping recognition of a problem hiding inside something that looked fine. Shifts to calm, insider clarity. Never alarmist. The mood is a trusted colleague leaning over and pointing at something you missed, not a warning siren.
- audience_insight: Small business owners in service industries monitor traffic as a proxy for marketing success. They rarely interrogate the gap between sessions and leads because the dashboard does not make that gap obvious or painful. When it is made visible — concretely, with real numbers — the reaction is not anger but a quiet, sinking recognition. That moment of recognition is the entry point.
- product_role: Fenrik.chat is introduced as the presence the website was always missing — not a technical product, not a chatbot project, but the thing that makes a live website actually behave like a live business. It enters the story as the resolution to a problem the viewer has just been shown they already have.
VISUAL WORLD (stay inside this world for first_image):
- art_direction: Clean, realistic small-business aesthetic — not polished corporate, not gritty. The kind of desk that has a half-drunk coffee, a sticky note, and a laptop that is two years old. Screen content is legible and real-looking: a simple analytics dashboard with visible session counts and a lead column showing zero. Motion is slow and deliberate — no fast cuts in the first half. The pacing mirrors the creeping realization.
- lighting: Soft morning window light from one side, warm but slightly flat — the kind of light that makes everything look ordinary and fine before you look closer. The screen glow adds a cool secondary source that subtly competes with the warmth, creating a small visual tension between the hopeful morning and the cold data.
- palette: Warm neutrals for the environment — off-white walls, natural wood desk, muted sage or terracotta accents. The screen is the only source of cooler blue-grey tones. No brand-forward colors until the product moment, where a single clean accent (soft teal or slate blue) enters with the Fenrik interface.
- environment: A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a startup loft, not a corporate office. A framed license or certificate visible but not foregrounded. Plants optional. The space should feel like someone who built something real and is proud of it.
- camera_style: Handheld but composed — slight natural movement that keeps it feeling observational rather than staged. Push-in slowly on the screen during the realization beat. Cut to over-the-shoulder POV for the analytics close-up. The competitor-tab sequence uses a clean screen-capture style insert, brief and precise. Final frame is a static wide shot of the desk with the screen now showing a lead notification.
- character_style: One central character — a woman in her late 30s or early 40s, owner of a local service business (deliberately non-specific industry to stay broadly relatable). Dressed practically, not stylishly. Her expression does the narrative work: pleased, then puzzled, then still — the stillness of someone doing quiet math in their head. No dialogue. No voiceover from her. She is observed, not interviewed.
TOPIC: The small business owner who checked her website analytics on Tuesday and realized every single weekend visitor had left without a trace
ANGLE: Walk through the quiet horror of seeing real traffic with zero leads — visitors who had questions, found silence, and moved on to whoever answered first. The website was live. The business was not.
HARD CONSTRAINTS:
- Write in the project language (en) and tone of voice.
- Never produce any forbidden_claims.
- Never describe the product as anything in product_is_not.
- Output must be a single valid JSON document, no prose, no code fences.
OPENING QUALITY (optimize for all four):
- SPECIFICITY: concrete person/object/moment — not abstract business talk.
- CURIOSITY: make the viewer need the next second; leave a gap the video pays off.
- CONFLICT: imply stakes tied to the selected pain point / core_idea.
- PRODUCT TRUTH: opening must be honest to Product Brain / proof; never invent claims.
AVOID:
- Generic curiosity hooks ("What if I told you…", "Nobody talks about…", "The secret is…").
- Generic business language (synergy, leverage, optimize, unlock growth).
- Clickbait that the concept cannot pay off.
RULES:
- first_spoken_sentence MUST be in the project language and must NOT match recent hooks in memory (unless instruction says keep the hook).
- first_image is a concrete visual description inside the Visual World (no on-image text/URLs).
- emotion / pacing / attention_pattern describe how the opening grabs attention.
- Do not write the full script — only the opening impact.
- Prefer relevant proof/scenarios when they sharpen specificity; do not force them.
Return JSON with keys:
{
  "first_image": string,
  "first_spoken_sentence": string,
  "emotion": string,
  "pacing": string,
  "attention_pattern": string
}
```

### SCHEMA
```text
openingImpactSchema (lib/content-pipeline/schemas.ts)
```

### PARAMS
```json
{
  "timeoutMs": 90000,
  "maxTransportAttempts": 1,
  "json": true
}
```

## 3.4 Content Package

- MODEL: `claude-sonnet-4-6`
- PROVIDER: `claude`
- TEMPERATURE telemetry: null
- MAX_TOKENS telemetry: null
- Claude defaults when null: temperature 0.7, max_tokens 4096
- RESPONSE_FORMAT: "json"
- STOP: none
- TOOLS: none
- prompt_characters telemetry: 40109
- reconstructed user prompt chars: 39681
- char match: false
- system chars: 427

### SYSTEM PROMPT (RECONSTRUCTED)
```text
You are the Content Package generator for the production content pipeline. Generate ONE complete content package as valid JSON in a single pass. Do not propose alternatives. Do not leave fields for later repair. This package REQUIRES a full video block, voiceover, and visual scenes/image prompts. Honor Opening Impact exactly for the hook and opening spoken line. Honor Visual Identity for all image prompts. Return ONLY JSON.
```

### USER PROMPT (RECONSTRUCTED)
```text
TASK: Produce ONE complete content package JSON.
PROJECT BRAIN:
- name: Fenrik.chat
- type: saas
- language: en
- market_scope: global
- goal_type: lead_generation
- target_audience: {"segments":["Local services and consulting firms","Car dealers, beauty salons, and service centers","SaaS and software companies","Lawyers, accountants, and agencies","Marketing agencies","Consultants","Professional services","Small businesses","SMB service companies"]}
- tone_of_voice: {"notes":["Simple and accessible","Direct and action-oriented","Transparent and honest","Friendly and approachable","Concise and practical"]}
- product_is: AI chatbot platform for websites; Automatically analyzes website URL to build a knowledge base; Answers visitor questions 24/7; Guides visitors to the right service or information; Captures leads automatically; Deployed via a simple embed script; Creates an AI assistant in about one minute; Uses existing website content automatically; Preview before signup; No training required
- product_is_not (NEVER claim these): Not a product requiring developer skills or coding; Not a complex integration requiring technical knowledge; Not limited to tech companies only; Not a custom AI project; Not a live human chat service; Not a chatbot that requires manual training
- product_strengths: AI assistant created in as little as 1 minute; No code or technical knowledge required; Fixed monthly pricing starting at $69/month; Try a preview without registration; Works across many industries and business types; Simple single embed script deployment; Answers instantly; Captures leads outside business hours; Uses your website content automatically; No training required; No coding required; Preview before registration; Transparent pricing; Starts working from existing website immediately
- pain_points: Unable to answer customer questions when offline; No resources to build or maintain a custom chatbot; Losing leads due to lack of instant website support; Complexity and cost of traditional chatbot integrations; Need for 24/7 customer support without extra staff; Visitors leave before contacting you; Repeating the same customer questions every day
- forbidden_claims (NEVER use): (none)
- platforms: instagram; linkedin; tiktok; youtube; x
- default_cta: Create your AI assistant
PROOF POOL (available marketing ammunition — NOT mandatory):
- Starting at $69/month with transparent monthly subscription
- No hidden fees stated explicitly
- Try the preview without registration required
- Simple embed script — no integrations or technical knowledge required
- Works on existing websites
- Uses website content automatically
- Can be installed with one script
- Preview available before signup
- AI generated directly from your website
- Live preview before activation
- Website can be activated with one embed script
PROOF RULES:
- Use a proof point ONLY when it is genuinely relevant to the topic/angle.
- Proof is optional; do not force it into every piece of content.
- Never repeat the same proof point across items; vary or omit it.
- Never invent proof or alter the numbers/claims in the pool.
SCENARIO POOL (concrete customer situations — inspiration, NOT mandatory):
- A potential client lands on a law firm's website at 11 PM to ask about a contract dispute, but there's no one available to respond and they leave without leaving any contact details.
- A car dealership's website gets a flood of visitors over a holiday weekend while the sales team is off, and interested buyers can't get answers about financing options or vehicle availability.
- A marketing agency owner is presenting a proposal to a new client when a website visitor tries to inquire about pricing packages but abandons the page after waiting with no response.
- A beauty salon owner realizes on Monday morning that several people visited the website over the weekend asking about appointment availability, but left no way to follow up with them.
- A SaaS founder notices in their analytics that dozens of free trial visitors dropped off the pricing page overnight without converting, having had no one to answer their questions in real time.
- An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.
- A consultant's website attracts a qualified prospect who wants to understand which service package fits their needs, but the site only has static text and the prospect moves on to a competitor.
- A local HVAC service center gets a spike in website traffic during a summer heatwave, but the front desk is overwhelmed with calls and no one is available to handle the simultaneous online inquiries.
- A software company's support page is visited by a prospective enterprise customer at 2 AM who needs a specific integration question answered before a morning board meeting, and the page offers no interactive help.
- A boutique consulting firm just launched a redesigned website but has no budget to hire a dedicated support person, leaving visitors with complex service questions completely unanswered during off-hours.
SCENARIO RULES:
- Scenarios are inspiration to make content specific; they are optional.
- ROTATE scenarios across content; do not reuse the same one every time.
- Adapt a scenario to the topic/angle; never copy it verbatim as a claim.
- Never invent facts; a scenario is a situation, not a proof or guarantee.
SELECTED PAIN POINT (dominant problem for THIS package — stay anchored here):
- Visitors leave before contacting you
PAIN POINT RULES:
- This pain point is the STORY. Details may support it; details must NOT replace it.
- Hook, concept, script, and CTA must dramatize, expose, or solve THIS problem.
- Do not drift onto a minor detail as the primary topic.
ANTI-REPETITION MEMORY (recently used — AVOID REPEATING these unless the regeneration instruction says to keep them):
Hooks:
- Your clock stopped. Theirs didn't.
- You've been defining this number wrong for years.
- You track everything. Except the thing that's costing you the most.
- Every other chatbot integration looks like this.
- You built the whole pipeline. You just forgot to put anything at the end of it.
- One tab closed. No email. No missed call. No record. Just gone.
- Everything rehearsed. Except what happens when someone asks a question.
- She left a five-star review. Just not for you.
- You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question.
- The window is open. No one's behind it.
- Three years of answers. Zero conversations.
- You've hired for everything. Except this.
- They were on your pricing page for 94 seconds. They left with their question still unanswered.
- Paper mountain of anonymous visits.
- After hours, chats still screaming.
- Urgent question dies in silence.
- She sent the newsletter. Forty people clicked. And every single one left without a word.
- Form abandoned now, discovered after vacation.
- Good traffic means your website is working. It does not.
- Eleven visitors came to her website over the weekend
Topics:
- The software company that answered every support ticket within hours — and still lost the enterprise deal because no one was there at 2 AM when it actually mattered
- The small business owner who sent a campaign, got 50 website visitors in one afternoon, and woke up to zero leads — because no one was there to answer a single question
- Why the businesses that capture the most leads aren't always the ones with the best product — they're the ones whose websites respond first
- The part of setting up an AI assistant for your website that most business owners expect to be hard — and isn't
- What changes when your website can actually answer a visitor's question — the moment they ask it
- Why hiring more staff doesn't fix the problem of visitors who leave before they ever make contact
- The software company that spent six months building a pricing page — and still couldn't stop visitors from leaving it confused
- The local service company that tracked every call — and never once tracked how many people visited the website and left without a word
- Every business posts on social media to drive traffic — almost none of them have thought about what happens when that traffic arrives
- The small business owner who realized her website had a job — and it had never shown up for work
- What it looks like when your website actually answers a visitor question — in real time
- The silent cost of a website that can't talk back
- The software founder who read every exit on his pricing page — and finally understood what visitors were actually asking for
- The accountant who came back from a long weekend to find three qualified leads had visited — and left nothing behind
- The small business owner who discovered her website had been silently turning away visitors every single night
- The small business owner who watched three qualified visitors leave her website in one night — and only found out the next morning
- The small business owner who realized her website had never once answered a single visitor question
- The car dealer who got 60 weekend visitors and sold nothing — because no one could answer a single question
- The small accounting firm that sent a newsletter, got 40 website visitors in one evening, and woke up to zero leads
- The service business owner who found out her website had been saying nothing to every visitor for months
CTAs:
- Create your AI assistant — let your website keep running when you can't.
- Create your AI assistant — let your website answer the question that ends the bounce.
- Create your AI assistant — start capturing what the blank field never could.
- Create your AI assistant — the setup is shorter than you think.
- Create your AI assistant — let your website finally catch what you spent so much to send its way.
- Create your AI assistant — let your website answer the question that keeps your tab on the board.
- Create your AI assistant — let your website answer the question the page never could.
- Create your AI assistant — and make sure the next review lands where it should.
- Create your AI assistant — make your website as ready as your campaign.
- Create your AI assistant — let your website finally answer when someone knocks.
- Create your AI assistant — your content is already ready.
- Create your AI assistant — write the job description your website has always needed.
- Create your AI assistant — let your pricing page hold the conversation.
- Create your AI assistant — let your website answer while the office is dark.
- Create your AI assistant — let your website keep talking when you can't.
- Create your AI assistant — let your website answer while you're reviewing session recordings.
- Create your AI assistant — let your website answer while you're closed.
- Create your AI assistant — let your website answer while the lot is full and the team is off.
- Create your AI assistant — let your website answer while the analytics pile up.
- Create your AI assistant — let your website answer while you're away.
Scenarios:
- A marketing agency owner is presenting a proposal to a new client when a website visitor tries to inquire about pricing packages but abandons the page after waiting with no response.
- A SaaS founder notices in their analytics that dozens of free trial visitors dropped off the pricing page overnight without converting, having had no one to answer their questions in real time.
- An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.
- A boutique consulting firm just launched a redesigned website but has no budget to hire a dedicated support person, leaving visitors with complex service questions completely unanswered during off-hours.
- A car dealership's website gets a flood of visitors over a holiday weekend while the sales team is off, and interested buyers can't get answers about financing options or vehicle availability.
- A beauty salon owner realizes on Monday morning that several people visited the website over the weekend asking about appointment availability, but left no way to follow up with them.
- A potential client lands on a law firm's website at 11 PM to ask about a contract dispute, but there's no one available to respond and they leave without leaving any contact details.
- A consultant's website attracts a qualified prospect who wants to understand which service package fits their needs, but the site only has static text and the prospect moves on to a competitor.
- A local HVAC service center gets a spike in website traffic during a summer heatwave, but the front desk is overwhelmed with calls and no one is available to handle the simultaneous online inquiries.
- A software company's support page is visited by a prospective enterprise customer at 2 AM who needs a specific integration question answered before a morning board meeting, and the page offers no interactive help.
ANTI-REPETITION RULES:
- Do NOT reuse any hook above; write a clearly different opening.
- Do NOT reuse any CTA above verbatim; vary the wording and angle.
- Do NOT repeat the topics/angles above.
- Do NOT reuse the scenarios above; choose a different situation (unless the instruction says to keep the scenario).
- Only repeat something if there is a strong, specific reason to.
WEBSITE / LINK RULES (canonical project website: https://fenrik.chat):
- A real canonical website URL exists (above). Use it ONLY where the per-platform rules below allow, and only when it genuinely helps the viewer act.
- NEVER invent, guess or shorten a URL. Use the canonical URL verbatim, or no URL at all.
- NEVER translate or alter the URL (host or path) — it is the same in every language.
- NEVER put a URL into voiceover_text or the video script — links are not spoken.
- NEVER put a URL into image_prompts, and NEVER request visible URL / website / link / QR-code text rendered inside a generated image.
- A link must never turn the piece into an ad: earn attention first, then the link is a quiet next step — not the message.
PER-PLATFORM LINK RULES:
- tiktok: NO raw URL in the caption. Use DM / comment / "link in bio" only when it fits naturally.
- instagram: NO raw URL by default. The CTA may point to "link in bio" or DM.
- youtube: you MAY include the canonical URL in the description/caption when the CTA is lead / conversion oriented.
- linkedin: awareness / problem-aware -> usually NO URL. solution-aware / conversion -> at most ONE canonical URL, placed at the end.
- facebook: you MAY include ONE canonical URL in the caption / CTA for lead / conversion content.
- google_business: NO raw URL in the text. The CTA may say visit website / call / book; never invent a booking URL.
- x: include a URL ONLY for conversion-style output, at most ONE, and not necessarily in every variant.
CREATIVE DIRECTIVE (soft guidance for this piece — shapes tone & structure, NEVER facts):
- These are optional creative preferences. Follow them when they help originality;
  do not force them if they fight Product Brain, the selected pain point, or Opening Impact.
- MODE (prefer): Contrarian — Challenges a common belief the audience holds. STRUCTURE: Common belief -> why it is wrong (dismantle with reasoning) -> proof of the better take -> CTA. NEVER: Attack the idea or habit, never a person or group.
- MODE BEATS (prefer this story shape): common_belief -> why_wrong -> proof -> cta
- HOOK ARCHETYPE (prefer): unexpected_truth — Open with a true but counter-intuitive statement that reframes the topic. FORM (do not copy verbatim): "The cleanest flats are usually the dirtiest where it counts." Do not open with "Did you know..." or a topic label.
- VOICE PERSONA (prefer): Insider — vocabulary: behind-the-scenes, trade specifics; rhythm: conspiratorial, lets-you-in pacing; energy: engaged, slightly exclusive; exaggeration: light, for intrigue only.
CREATIVE SAFETY (these ALWAYS override the directive on any conflict):
- Never lie; never invent numbers, names, results, quotes or testimonials.
- Never produce a forbidden_claim and never describe the product as anything in product_is_not.
- No shock without genuine relevance to the topic; no clickbait the content does not pay off.
- Humor must never mock the customer or devalue the product; the actual fix stays serious.
- Contrarian/controversial takes attack ideas or habits only — never a person or a protected group.
- The voice persona changes wording, rhythm and energy ONLY; it must not alter any fact or proof.
CONTENT STRATEGY ITEM:
- funnel_stage: Problem Aware
- topic: The small business owner who checked her website analytics on Tuesday and realized every single weekend visitor had left without a trace
- angle: Walk through the quiet horror of seeing real traffic with zero leads — visitors who had questions, found silence, and moved on to whoever answered first. The website was live. The business was not.
- platform: tiktok
- format: reel
VIDEO CONCEPT (authoritative story idea):
{
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
}
OPENING IMPACT (authoritative cold open — MUST use):
- first_image → scene 1 / first image_prompt
- first_spoken_sentence → hook AND first spoken line of voiceover_text
- emotion: A creeping sense of unease as realization dawns.
- pacing: Slow and deliberate, mirroring the woman's growing concern.
- attention_pattern: The viewer is drawn in by the contrast between the initial optimism of good traffic and the unsettling truth revealed by the analytics.
- first_spoken_sentence: You thought traffic meant success.
- first_image: A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen.
VISUAL IDENTITY (authoritative look — apply to ALL image prompts):
{
  "palette": "Warm neutrals for the environment — off-white walls, natural wood desk, muted sage or terracotta accents. The screen is the only source of cooler blue-grey tones. No brand-forward colors until the product moment, where a single clean accent (soft teal or slate blue) enters with the Fenrik interface.",
  "lighting": "Soft morning window light from one side, warm but slightly flat — the kind of light that makes everything look ordinary and fine before you look closer. The screen glow adds a cool secondary source that subtly competes with the warmth, creating a small visual tension between the hopeful morning and the cold data.",
  "environment": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a startup loft, not a corporate office. A framed license or certificate visible but not foregrounded. Plants optional. The space should feel like someone who built something real and is proud of it.",
  "camera_style": "Handheld but composed — slight natural movement that keeps it feeling observational rather than staged. Push-in slowly on the screen during the realization beat. Cut to over-the-shoulder POV for the analytics close-up. The competitor-tab sequence uses a clean screen-capture style insert, brief and precise. Final frame is a static wide shot of the desk with the screen now showing a lead notification.",
  "art_direction": "Clean, realistic small-business aesthetic — not polished corporate, not gritty. The kind of desk that has a half-drunk coffee, a sticky note, and a laptop that is two years old. Screen content is legible and real-looking: a simple analytics dashboard with visible session counts and a lead column showing zero. Motion is slow and deliberate — no fast cuts in the first half. The pacing mirrors the creeping realization.",
  "character_style": "One central character — a woman in her late 30s or early 40s, owner of a local service business (deliberately non-specific industry to stay broadly relatable). Dressed practically, not stylishly. Her expression does the narrative work: pleased, then puzzled, then still — the stillness of someone doing quiet math in their head. No dialogue. No voiceover from her. She is observed, not interviewed.",
  "opening_emotion": "A creeping sense of unease as realization dawns.",
  "opening_first_image": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen."
}
AVAILABLE ASSETS:
- id=b1b0d00c-0bfc-4095-954f-4b38a813747f; title=Better customer support; class=static; media=image; desc=The image presents a promotional layout highlighting features of an AI customer support assistant, including 24/7 availa
- id=7e250d64-ddcf-4649-921f-783d294a2b5b; title=Create an AI assistant for your website in 1 minute.; class=static; media=image; desc=The image promotes a service that creates an AI assistant for websites in just one minute, highlighting its features and
- id=cd775ffc-9c6d-4d66-b879-8b175c8b1907; title=Frequently Asked Questions; class=static; media=image; desc=The image displays a list of frequently asked questions related to a chat service called Fenrik.chat.
- id=5c11b59c-f6fa-4652-9c4b-ead145418898; title=AI Assistant; class=static; media=image; desc=The image features a promotional graphic for an AI Assistant service, highlighting its monthly price and key functionali
- id=d0577ae7-6599-44f1-84af-c6ee18512312; title=Feature card; class=static; media=image; desc=The image displays a grid of categories related to various services and industries, including e-shops, consulting firms,
VARIANT COUNTS (produce this many distinct variants):
- x: 5 distinct caption_variants AND 5 title_variants; ALSO set caption = caption_variants[0]
- linkedin: 2 distinct caption_variants; ALSO set caption = caption_variants[0]
CRITICAL: caption_variants never replace caption. Every platform still needs caption (use caption_variants[0]).
LinkedIn with variants → caption + caption_variants. X with variants → caption + caption_variants + title_variants.
PLATFORM-NATIVE WRITING (Sprint 4B):
- Do NOT duplicate voiceover_text into any platform caption.
- Every platform must feel native to that feed — rewrite facts, do not lightly reformat one master text.
- TikTok = shorter + stronger first line + curiosity + punch.
- Instagram = emotional + short scannable paragraphs.
- YouTube Shorts = short direct curiosity metadata — NOT an SEO article.
- LinkedIn = keep current professional style; avoid unnecessary expansion.
- Facebook = always generate a friendly community post.
- X = concise; maximize hook diversity across variants.
PLATFORM-NATIVE WRITING (Sprint 4B):
- Do NOT duplicate voiceover_text into any platform caption.
- Every platform must feel native to that feed — rewrite facts, do not lightly reformat one master text.
- TikTok = shorter + stronger first line + curiosity + punch.
- Instagram = emotional + short scannable paragraphs.
- YouTube Shorts = short direct curiosity metadata — NOT an SEO article.
- LinkedIn = keep current professional style; avoid unnecessary expansion.
- Facebook = always generate a friendly community post.
- X = concise; maximize hook diversity across variants.

PLATFORM STYLES (make each platform's output genuinely native — NOT one text lightly reformatted; same facts, funnel stage and CTA type, but a platform-specific voice, structure and length):
- tiktok: tone=raw, fast, punchy, curiosity-first — like a native TikTok comment caption; structure=strongest curiosity hook in line 1 → one punch payoff → stop. Minimal storytelling.; cta=implicit and casual (link in bio / watch again) — never essay CTAs; length=1 short sentence preferred, max 2. Roughly ≤25 words before hashtags. 3–5 trend hashtags. rules=["Do NOT retell or paraphrase the full voiceover"; "First line must create curiosity or tension — not setup/context"; "Forbidden: long story arcs, SEO phrases, 'This video…'"]
- instagram: tone=emotional, human, scannable — Reels-native, not brochure; structure=emotional hook → 1–2 SHORT paragraphs with line breaks → soft CTA; cta=save / share / "link in bio"; length=2–4 short sentences total. Short paragraphs. Easy scanning. 5–10 hashtags. rules=["Prefer line breaks between thoughts for mobile scanning"; "Do NOT paste the voiceover as the caption"; "Keep emotion; cut corporate padding"]
- facebook: tone=friendly, community-oriented, approachable local / SMB; structure=relatable hook → clear value → one next step; cta=message / book / one clean link for lead or conversion content; length=2–4 sentences, light emoji ok, 0–3 hashtags rules=["Always produce a Facebook-native post — never omit this platform"; "Warmer and more conversational than LinkedIn; less punchy than TikTok"; "Do not paste the voiceover"]
- youtube: tone=native YouTube Shorts — direct curiosity, NOT a search/SEO article; structure=first line = curiosity hook the viewer would tap; optional second line = stakes; optional third = soft CTA; cta=subscribe / watch next — one short line max; length=caption ≤ 2 short sentences (≈ ≤40 words). NEVER a 4–6 sentence SEO description. rules=["FORBIDDEN openers: 'This video breaks down', 'In this video', 'Watch to learn', 'If you've ever wondered', 'This Short explains'"; "Do NOT write blog/SEO description energy — write like a Shorts caption"; "Do NOT duplicate the voiceover essay into the description"]
- linkedin: tone=professional, expert, B2B (no hype) — keep the current LinkedIn style; structure=insight → context → takeaway (tight — do not expand unnecessarily); cta=invite a comment / connect / clear product CTA when conversion; length=3–6 sentences, 0–3 hashtags, no decorative emoji rules=["Avoid unnecessary expansion and fluff paragraphs"; "Do not turn a sharp insight into a long LinkedIn essay"; "Do not duplicate the voiceover verbatim"]
- x: tone=terse, opinionated, hook-diverse; structure=one strong claim or sharp observation — no filler, no VO retell; cta=spark a reply or repost; URL only when conversion CTA requires it; length=≤ 280 characters, 0–2 hashtags rules=["When caption_variants exist, each MUST open with a DIFFERENT hook angle"; "Do NOT reuse the same first five words across variants"; "Never paste voiceover sentences"]
HARD CONSTRAINTS:
- Write in the project language (en) and tone of voice.
- Never produce any forbidden_claims.
- Never describe the product as anything in product_is_not.
- Output must be a single valid JSON document, no prose, no code fences.
HARD RULES:
- funnel_stage must be exactly "Problem Aware" (or the canonical label matching the strategy item).
- hook MUST equal Opening Impact first_spoken_sentence (same language).
- voiceover_text MUST begin with that same first spoken sentence.
- Keep the SELECTED PAIN POINT as the dominant problem throughout the script when provided.
- Prefer Creative Directive mode beats / voice when they improve storytelling — soft guidance only.
- Do not invent product claims outside Product Brain / proof.
- Require video.concept, video.script, voiceover_text, subtitles, and 3–5 visual_scenes (legacy IMAGE preferred).
- platform_outputs must include every required platform listed below.
- Required platforms: tiktok, instagram, facebook, youtube, linkedin, x
- Video platforms (shared video): tiktok, instagram, youtube
VOICEOVER_TEXT LENGTH (strict — guardrails hard-fail over the maximum):
- voiceover_text is the spoken narration used for TTS.
- Target 40–70 words.
- Hard maximum 80 words — never exceed 80.
- The hook (first spoken sentence) counts toward this limit.
- A short soft close is optional; do not force a sales CTA into the narration when package cta is null.
- Do not pad with repeated explanations of the same point.
- subtitles should track the same spoken words (not a second long essay).
- video.script may include scene directions, but spoken VO lines inside it must stay consistent with voiceover_text and must not invent a much longer spoken script.
CTA CONTRACT (organic social content — NOT ads; not every package needs a sales CTA):
- Strategy funnel_stage: "problem_aware". project.goal_type is "lead_generation" (NOT a valid cta.type).
- Problem Aware: cta MAY be null.
- Or soft CTA only: { "type": one of [follow | save | comment | share], "text": "..." }.
- Do NOT use business/sales CTAs.
- When cta is present, cta.type MUST be exactly one of: follow | save | comment | share
- Shape: cta is null OR { "type": string, "text": non-empty string }.
- Never emit an empty string as cta, and never use the strings "null" or "undefined".
- Do NOT use lead_generation, conversion, sales, demo_request, learn_more, or goal_type as cta.type.
- Omitting cta (null) is valid for this package when no soft/business CTA is needed.
PLATFORM CTA:
- platform_outputs.<platform>.cta is OPTIONAL (string or null/omit).
- When package cta is null, omit platform cta or set it null — captions must stand alone.
- When package cta is present, platform cta SHOULD be the same call-to-action text (or a short platform-native paraphrase), never an empty string.
- Never invent a sales CTA on a platform when the package has no CTA.
PLATFORM_OUTPUTS FIELD TYPES (strict):
- caption: REQUIRED non-empty string on EVERY platform (never an object, never omitted).
- cta: OPTIONAL string or null/omit (never an object, never empty string, never the literals "null"/"undefined").
- When package cta is null, omit platform cta or set null — captions must publish standalone.
- When package cta is present, platform cta SHOULD mirror that text (short platform-native paraphrase ok).
- hashtags: string[] when present.
- format: string when present.
- caption_variants: string[] ONLY when VARIANT COUNTS require them — they are IN ADDITION to caption, never a replacement.
- title_variants: string[] ONLY for x when VARIANT COUNTS require them — IN ADDITION to caption.
- When caption_variants is present, you MUST also set caption = caption_variants[0] (same string).
- LinkedIn with variants: must include caption AND caption_variants.
- X with variants: must include caption AND caption_variants AND title_variants.
- Never put an object where a string is required.
OTHER FIELD TYPES:
- video.duration_seconds must be a string when present (e.g. "24").
- asset_usage is optional; when present each entry is { asset_id: string, used_as: string, modify?: string }.
- asset_usage[].used_as must be a string.
- youtube caption: Shorts-native — hard maximum 55 words (guardrails reject longer).
- x caption: hard maximum 280 characters (guardrails reject longer).
VISUAL_SCENES CONTRACT (strict — validator rejects unrecognized shapes):
- For video packages, visual_scenes is REQUIRED with 3–5 entries.
- Prefer flat legacy IMAGE scenes for ordinary video beats:
  { "source": "ai", "image_prompt": "A concrete visual description for one scene" }
  { "source": "asset", "asset_id": "existing-asset-uuid", "used_as": "background, product reference, screen content, or other clear usage" }
- Do NOT invent field names like description, prompt, visual, scene_prompt, scene, or content.
- Do NOT mix legacy and typed formats in one object.
- Do NOT use { "type": "IMAGE", "image_prompt": "..." } — that shape is invalid.
- Typed IMAGE (discouraged) would need { "type": "IMAGE", "payload": { "source": "ai", "image_prompt": "..." } }; prefer flat legacy instead.
- Every AI scene needs a non-empty image_prompt.
- Every asset scene needs a valid asset_id from AVAILABLE ASSETS and a non-empty used_as string.
- Do not reference an asset_id that is not listed in AVAILABLE ASSETS.

Optional typed non-image scenes (use only when truly needed; otherwise stay legacy IMAGE):
  { "type": "CHECKLIST", "payload": { "title": "optional", "items": ["item one", "item two"] } }
  { "type": "PHONE", "payload": { "asset_id": "uuid from AVAILABLE ASSETS", "caption": "optional" } }
  { "type": "PHONE", "payload": { "image_prompt": "tight mobile UI only", "caption": "optional" } }
  { "type": "QUOTE", "payload": { "quote": "string", "attribution": "string", "proof_id": "string", "context": "optional" } }
  { "type": "STATISTIC", "payload": { "value": "string", "label": "string", "proof_id": "string", "unit": "optional", "source_line": "optional" } }
  { "type": "CTA", "payload": { "headline": "string", "subline": "optional", "button_label": "optional", "show_logo": true } }
- Typed scenes MUST be exactly { "type": "...", "payload": { ... } } with the fields above.

EXAMPLE — valid IMAGE-only visual_scenes:
  "visual_scenes": [
    { "source": "ai", "image_prompt": "Owner at desk answering emails in warm office light" },
    { "source": "ai", "image_prompt": "Empty website contact form at night on a laptop screen" },
    { "source": "asset", "asset_id": "<uuid from AVAILABLE ASSETS>", "used_as": "product UI shown as framed insert" }
  ]
Return a single JSON object matching the content package schema:
{
  "title": string,
  "funnel_stage": string,
  "hook": string,
  "voiceover_text": string (40–70 words preferred; max 80),
  "subtitles": string,
  "cta": null OR { "type": one of [follow, save, comment, share], "text": string },
  "video": { "concept": string, "script": string, "duration_seconds": string },
  "platform_outputs": { "<platform>": { "caption": string, "cta"?: string|null, "hashtags": string[], "format": string, "caption_variants"?: string[], "title_variants"?: string[] } },
  "hashtags": string[],
  "image_prompts": string[],
  "visual_scenes": [ { "source": "ai", "image_prompt": "string" }, ... ],
  "asset_usage": [ { "asset_id": "string", "used_as": "string" } ],
  "scenario": optional string
}
Remember: if caption_variants is present, caption MUST equal caption_variants[0].
```

### EXPECTED SHAPE (RECONSTRUCTED — forwarded to JSON repair if used; repair_count=0 this run)
```text
Return a single JSON object. Preserve valid creative content; fix structure/types only.
Use ONLY these visual_scenes shapes (prefer legacy IMAGE):
{ "source": "ai", "image_prompt": "string" }
{ "source": "asset", "asset_id": "uuid", "used_as": "string" }
Optional typed: { "type": "CHECKLIST"|"PHONE"|"QUOTE"|"STATISTIC"|"CTA", "payload": { ... } }
Do NOT use { "type": "IMAGE", "image_prompt": "..." } or invented fields (description, prompt, visual).
video.duration_seconds must be a string when present.
PLATFORM_OUTPUTS FIELD TYPES (strict):
- caption: REQUIRED non-empty string on EVERY platform (never an object, never omitted).
- cta: OPTIONAL string or null/omit (never an object, never empty string, never the literals "null"/"undefined").
- When package cta is null, omit platform cta or set null — captions must publish standalone.
- When package cta is present, platform cta SHOULD mirror that text (short platform-native paraphrase ok).
- hashtags: string[] when present.
- format: string when present.
- caption_variants: string[] ONLY when VARIANT COUNTS require them — they are IN ADDITION to caption, never a replacement.
- title_variants: string[] ONLY for x when VARIANT COUNTS require them — IN ADDITION to caption.
- When caption_variants is present, you MUST also set caption = caption_variants[0] (same string).
- LinkedIn with variants: must include caption AND caption_variants.
- X with variants: must include caption AND caption_variants AND title_variants.
- Never put an object where a string is required.
If $.platform_outputs.<platform>.caption is missing/invalid and caption_variants[0] is a non-empty string, set caption = caption_variants[0].
cta may be null OR { type: one of [follow | save | comment | share], text: non-empty string }. Do not use empty string. Never use project.goal_type as type.
If cta is invalid for this funnel stage, set cta to null OR change cta.type to a soft CTA (e.g. "follow"). Never use project.goal_type as cta.type. Never use empty string.
voiceover_text: 40–70 words preferred; maximum 80 words (TTS source of truth).
If voiceover_text exceeds the hard maximum, shorten it to at most 80 words (prefer 40–70): keep the hook and main argument; remove repetition; keep the same language; sync subtitles to the shortened spoken words; keep video.script scene directions but align spoken VO lines with voiceover_text. Do not blindly truncate mid-sentence.
asset_usage[].used_as must be a string when asset_usage is present.

Minimal skeleton:
{
  "title": "string",
  "funnel_stage": "string",
  "hook": "string",
  "voiceover_text": "40–70 words preferred; maximum 80 words",
  "subtitles": "string matching spoken voiceover",
  "cta": null,
  "video": {
    "concept": "string",
    "script": "string",
    "duration_seconds": "string"
  },
  "platform_outputs": {
    "<platform>": {
      "caption": "string (REQUIRED; if caption_variants exist use caption_variants[0])",
      "cta": "optional string or null",
      "hashtags": [
        "string"
      ],
      "format": "string",
      "caption_variants": [
        "optional string[] — never omit caption"
      ],
      "title_variants": [
        "optional string[] — x only when required"
      ]
    }
  },
  "hashtags": [
    "string"
  ],
  "image_prompts": [
    "string"
  ],
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "string"
    },
    {
      "source": "asset",
      "asset_id": "uuid",
      "used_as": "string"
    }
  ],
  "asset_usage": [
    {
      "asset_id": "uuid",
      "used_as": "string"
    }
  ],
  "scenario": "optional string"
}
```

### SCHEMA ARGS
```json
{
  "builder": "buildContentPackageSchema",
  "targetPlatforms": [
    "tiktok",
    "instagram",
    "facebook",
    "youtube",
    "linkedin",
    "x"
  ],
  "requireVideo": true,
  "allowedCtaTypes": [
    "follow",
    "save",
    "comment",
    "share"
  ],
  "ctaRequired": false
}
```

### PARAMS
```json
{
  "timeoutMs": 180000,
  "maxTransportAttempts": 1,
  "maxAttempts": 2,
  "repairGuardrailFailures": true,
  "json": true,
  "variantCounts": {
    "x": 5,
    "linkedin": 2
  }
}
```

## 3.5 TTS

TTS is not a chat completion. Input text = voiceover_text; voice = tts_voice; instructions = tts_instructions.
```json
{
  "model": "gpt-4o-mini-tts",
  "repair": false,
  "success": true,
  "provider": "tts",
  "warnings": [],
  "raw_usage": {
    "character_count": 343,
    "duration_seconds": 25.248,
    "usd_per_1k_chars": 0.015
  },
  "step_name": "TTS",
  "max_tokens": null,
  "started_at": "2026-07-25T00:09:56.951Z",
  "duration_ms": 6384,
  "finished_at": "2026-07-25T00:10:03.334Z",
  "retry_count": 0,
  "temperature": null,
  "cached_tokens": null,
  "error_message": null,
  "input_summary": "TTS input:\n- Voiceover text\n- Voice / instructions",
  "prompt_tokens": null,
  "estimated_cost": 0.005145,
  "output_summary": "audio duration=25.248s",
  "pricing_source": "list_price_estimate",
  "pricing_version": "list-price@2026-07-23",
  "response_format": null,
  "input_size_bytes": 345,
  "completion_tokens": null,
  "output_size_bytes": 114,
  "prompt_characters": 343,
  "provider_request_id": null,
  "completion_characters": 114
}
```

```json
{
  "model": "gpt-4o-mini-tts",
  "voice": "shimmer",
  "input_text": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
  "instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: measured, credible. Language: en."
}
```

## 3.6 Whisper

```json
{
  "model": "whisper-1",
  "repair": false,
  "success": true,
  "provider": "whisper",
  "warnings": [],
  "raw_usage": {
    "word_count": 57,
    "usd_per_min": 0.006,
    "fallback_used": false,
    "duration_seconds": 25.248
  },
  "step_name": "Whisper",
  "max_tokens": null,
  "started_at": "2026-07-25T00:10:03.336Z",
  "duration_ms": 2638,
  "finished_at": "2026-07-25T00:10:05.974Z",
  "retry_count": 0,
  "temperature": null,
  "cached_tokens": null,
  "error_message": null,
  "input_summary": "Whisper input:\n- Voiceover audio\n- Language hint",
  "prompt_tokens": null,
  "estimated_cost": 0.002525,
  "output_summary": "57 words (english)",
  "pricing_source": "list_price_estimate",
  "pricing_version": "list-price@2026-07-23",
  "response_format": null,
  "input_size_bytes": null,
  "completion_tokens": null,
  "output_size_bytes": 37,
  "prompt_characters": null,
  "provider_request_id": null,
  "completion_characters": 37
}
```

Exact Whisper request body: NOT PERSISTED. Model whisper-1. Input = TTS audio bytes.
## 3.7 Image generation (×5 stills)

```json
{
  "model": "gpt-image-1",
  "repair": false,
  "success": true,
  "provider": "image",
  "warnings": [],
  "raw_usage": {
    "usd_per_still": 0.042,
    "reused_still_count": 0,
    "generated_still_count": 5
  },
  "step_name": "Image generation",
  "max_tokens": null,
  "started_at": "2026-07-25T00:10:06.154Z",
  "duration_ms": 112454,
  "finished_at": "2026-07-25T00:11:58.607Z",
  "retry_count": 0,
  "temperature": null,
  "cached_tokens": null,
  "error_message": null,
  "input_summary": "Image generation input:\n- 5 scene(s)\n- Visual profile / medium",
  "prompt_tokens": null,
  "estimated_cost": 0.21,
  "output_summary": "generated=5; reused=0",
  "pricing_source": "list_price_estimate",
  "pricing_version": "list-price@2026-07-23",
  "response_format": null,
  "input_size_bytes": null,
  "completion_tokens": null,
  "output_size_bytes": 67,
  "prompt_characters": null,
  "provider_request_id": null,
  "completion_characters": 67
}
```

Exact OpenAI Images API request bodies: NOT PERSISTED.
Per-scene prompts sent (from job input):
```json
[
  {
    "index": 0,
    "id": "scene-1",
    "prompt": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement."
  },
  {
    "index": 1,
    "id": "scene-2",
    "prompt": "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness."
  },
  {
    "index": 2,
    "id": "scene-3",
    "prompt": "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left."
  },
  {
    "index": 3,
    "id": "scene-4",
    "prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised."
  },
  {
    "index": 4,
    "id": "scene-5",
    "prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
  }
]
```

# 4. EXACT AI RESPONSES

Raw provider completion strings: **NOT PERSISTED**.
Below = closest persisted artifacts (validated JSON / post-processed fields).

## 4.1 Content Strategy — persisted plan
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

## 4.2 Video Concept — persisted validated object
```json
{
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
}
```

completion_characters telemetry: 5674
persisted JSON char length: 5590
## 4.3 Opening Impact — persisted validated object
```json
{
  "pacing": "Slow and deliberate, mirroring the woman's growing concern.",
  "emotion": "A creeping sense of unease as realization dawns.",
  "first_image": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen.",
  "attention_pattern": "The viewer is drawn in by the contrast between the initial optimism of good traffic and the unsettling truth revealed by the analytics.",
  "first_spoken_sentence": "You thought traffic meant success."
}
```

completion_characters telemetry: 704
persisted JSON char length: 683
## 4.4 Content Package — persisted package_brief (NOT raw model bytes)

Post-model transforms applied before/during persist (from code):
1. Deterministic hook align to Opening Impact first_spoken_sentence
2. normalizeVisualScenePlan + syncLegacyFieldsFromVisualScenes
3. normalizeImagePrompts
4. presentation_generation stamp (concept/opening/identity/fingerprint/voice/…)
5. On content_items persist: appendUrlToText for selected X variant indices

```json
{
  "cta": {
    "text": "Save this if you've ever checked your analytics and felt that quiet sinking feeling.",
    "type": "save"
  },
  "hook": "You thought traffic meant success.",
  "video": {
    "script": "SCENE 1 — OPEN: Warm morning light. A woman in her late 30s sits at a lived-in desk, coffee in hand. She opens her laptop. Analytics dashboard fills the screen. Sessions: 34. She leans back, satisfied. The camera holds on her face — pleased.\n\nVO: 'You thought traffic meant success.'\n\nSCENE 2 — REALIZATION: Slow push-in on the screen. The lead column comes into focus. Zero. She leans closer. Scrolls. Nothing. No form fills. No emails. No names. Her expression changes — not panic, just stillness. Quiet math.\n\nVO: 'She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone.'\n\nSCENE 3 — VISITOR SEQUENCE: Screen-capture style inserts. A visitor lands on a service page at 9 PM Saturday. Reads. Has a question. Finds nothing to ask it. Opens a new tab — a competitor. Then another visitor. Then another. Each one gone.\n\nVO: 'They came. They had questions. They found silence. And they went to whoever answered first.'\n\nSCENE 4 — PRODUCT MOMENT: The same desk. Same woman. But now a soft teal chat interface sits in the corner of her website screen. A visitor question appears. An answer follows — instant. A lead notification pops. She didn't do anything. The website did.\n\nVO: 'The website was live. The business was not.'\n\nSCENE 5 — FINAL FRAME: Static wide shot. Desk, warm light, laptop. The analytics screen is visible — lead count no longer zero. Camera holds. No dialogue. The image does the work.",
    "concept": "A small business owner opens her analytics dashboard on a Tuesday morning, pleased by the weekend traffic numbers. The camera pushes in slowly as she sees the leads column: zero. The video then cuts through a sequence of silent visitor moments — people who arrived, had questions, got no response, and left for a competitor. The story closes with the reframe: traffic was never the problem. The silence was.",
    "duration_seconds": "42"
  },
  "hashtags": [
    "#smallbusiness",
    "#websitetraffic",
    "#leadgeneration",
    "#businessowner",
    "#servicebusiness",
    "#growyourbusiness",
    "#businesstips"
  ],
  "scenario": "A small business owner opens her analytics dashboard on Tuesday morning, pleased to see 34 weekend sessions. The satisfaction dissolves when she looks at the leads column — zero. No names, no emails, no form fills. Visitors arrived over the weekend, had questions, found a static page with no way to ask them, and moved on to competitors who could respond. She had no idea any of it was happening.",
  "subtitles": "You thought traffic meant success. / She opened her analytics on Tuesday morning — 34 sessions over the weekend. / She smiled. / Then she looked at the leads column. / Zero. / No names. No emails. No record of anyone. / They came. They had questions. They found silence. / And they went to whoever answered first. / The website was live. / The business was not.",
  "asset_usage": [],
  "image_prompts": [
    "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement.",
    "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness.",
    "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left.",
    "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised.",
    "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
  ],
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
  "voiceover_text": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
  "platform_outputs": {
    "x": {
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
    },
    "tiktok": {
      "cta": null,
      "format": "reel",
      "caption": "34 visitors. 0 leads. Her website was live. Her business wasn't. 👀",
      "hashtags": [
        "#smallbusiness",
        "#websitetips",
        "#leadgeneration",
        "#businessowner"
      ]
    },
    "youtube": {
      "cta": "Save this one.",
      "format": "short",
      "caption": "34 weekend visitors. Zero leads. She thought traffic meant success — until she looked closer. Save this one.",
      "hashtags": [
        "#smallbusiness",
        "#websitetips"
      ]
    },
    "facebook": {
      "cta": "Save this if it sounds familiar.",
      "format": "reel",
      "caption": "Ever opened your analytics and felt quietly proud of the traffic — then noticed zero leads came from it? 😶 That's the gap most business owners don't see until it's been happening for months. Your visitors had questions. Your website had nothing to say. Save this if it sounds familiar, and share it with a business owner who needs to hear it.",
      "hashtags": [
        "#smallbusiness",
        "#businesstips"
      ]
    },
    "linkedin": {
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
    },
    "instagram": {
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
  },
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
  }
}
```

completion_characters telemetry: 12453
## 4.5 Visual Identity — deterministic (not AI)
```json
{
  "palette": "Warm neutrals for the environment — off-white walls, natural wood desk, muted sage or terracotta accents. The screen is the only source of cooler blue-grey tones. No brand-forward colors until the product moment, where a single clean accent (soft teal or slate blue) enters with the Fenrik interface.",
  "lighting": "Soft morning window light from one side, warm but slightly flat — the kind of light that makes everything look ordinary and fine before you look closer. The screen glow adds a cool secondary source that subtly competes with the warmth, creating a small visual tension between the hopeful morning and the cold data.",
  "environment": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a startup loft, not a corporate office. A framed license or certificate visible but not foregrounded. Plants optional. The space should feel like someone who built something real and is proud of it.",
  "camera_style": "Handheld but composed — slight natural movement that keeps it feeling observational rather than staged. Push-in slowly on the screen during the realization beat. Cut to over-the-shoulder POV for the analytics close-up. The competitor-tab sequence uses a clean screen-capture style insert, brief and precise. Final frame is a static wide shot of the desk with the screen now showing a lead notification.",
  "art_direction": "Clean, realistic small-business aesthetic — not polished corporate, not gritty. The kind of desk that has a half-drunk coffee, a sticky note, and a laptop that is two years old. Screen content is legible and real-looking: a simple analytics dashboard with visible session counts and a lead column showing zero. Motion is slow and deliberate — no fast cuts in the first half. The pacing mirrors the creeping realization.",
  "character_style": "One central character — a woman in her late 30s or early 40s, owner of a local service business (deliberately non-specific industry to stay broadly relatable). Dressed practically, not stylishly. Her expression does the narrative work: pleased, then puzzled, then still — the stillness of someone doing quiet math in their head. No dialogue. No voiceover from her. She is observed, not interviewed.",
  "opening_emotion": "A creeping sense of unease as realization dawns.",
  "opening_first_image": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen."
}
```

## 4.6 TTS / Whisper / Images / Render
Binary audio/images/mp4 not embedded. Telemetry + paths above in §2.
# 5. DATA EVOLUTION (DIFF)

## Strategy → Concept
```json
{
  "from": {
    "topic": "The small business owner who checked her website analytics on Tuesday and realized every single weekend visitor had left without a trace",
    "angle": "Walk through the quiet horror of seeing real traffic with zero leads — visitors who had questions, found silence, and moved on to whoever answered first. The website was live. The business was not.",
    "pain_point": "Visitors leave before contacting you",
    "funnel_stage": "problem_aware",
    "platform": "tiktok",
    "format": "reel"
  },
  "to_keys": [
    "title",
    "core_idea",
    "product_role",
    "why_it_works",
    "narrative_arc",
    "emotional_tone",
    "audience_insight",
    "visual_direction"
  ],
  "diff_vs_strategy_item": {
    "added": [
      "audience_insight",
      "core_idea",
      "emotional_tone",
      "narrative_arc",
      "product_role",
      "title",
      "visual_direction",
      "why_it_works"
    ],
    "removed": [
      "angle",
      "format",
      "funnel_stage",
      "pain_point",
      "platform",
      "topic"
    ],
    "changed": []
  }
}
```

**Fields present on Concept not on Strategy item brief:** title, core_idea, product_role, why_it_works, narrative_arc, emotional_tone, audience_insight, visual_direction

## Concept → Opening Impact
```json
{
  "concept_keys": [
    "title",
    "core_idea",
    "product_role",
    "why_it_works",
    "narrative_arc",
    "emotional_tone",
    "audience_insight",
    "visual_direction"
  ],
  "opening_keys": [
    "pacing",
    "emotion",
    "first_image",
    "attention_pattern",
    "first_spoken_sentence"
  ],
  "diff": {
    "added": [
      "attention_pattern",
      "emotion",
      "first_image",
      "first_spoken_sentence",
      "pacing"
    ],
    "removed": [
      "audience_insight",
      "core_idea",
      "emotional_tone",
      "narrative_arc",
      "product_role",
      "title",
      "visual_direction",
      "why_it_works"
    ],
    "changed": []
  }
}
```


## Concept + Opening → Visual Identity
```json
{
  "visual_identity_keys": [
    "palette",
    "lighting",
    "environment",
    "camera_style",
    "art_direction",
    "character_style",
    "opening_emotion",
    "opening_first_image"
  ],
  "equals_rebuilt": false
}
```


## Concept/Opening/Identity → Package core
```json
{
  "package_core_keys": [
    "title",
    "hook",
    "voiceover_text",
    "subtitles",
    "cta",
    "scenario",
    "video",
    "visual_scenes",
    "image_prompts",
    "platform_outputs",
    "asset_usage",
    "hashtags"
  ],
  "concept_title": "Good Traffic Is a Lie",
  "package_title": "Good Traffic Is a Lie",
  "concept_narrative_arc_present": true,
  "package_has_narrative_arc_field": false,
  "opening_first_spoken": "You thought traffic meant success.",
  "package_hook": "You thought traffic meant success.",
  "package_voiceover_starts_with_hook": true,
  "concept_product_role": "Fenrik.chat is introduced as the presence the website was always missing — not a technical product, not a chatbot project, but the thing that makes a live website actually behave like a live business. It enters the story as the resolution to a problem the viewer has just been shown they already have.",
  "voiceover_text": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
  "asset_usage": [],
  "visual_scenes_count": 5,
  "image_prompts_count": 5,
  "platform_output_keys": [
    "x",
    "tiktok",
    "youtube",
    "facebook",
    "linkedin",
    "instagram"
  ]
}
```

## Package → Video job input
```json
{
  "added_on_job_input": [
    "scenes",
    "tts_voice",
    "tts_instructions",
    "selected_voice",
    "voice_scores",
    "voice_source",
    "visual_profile",
    "production_run_id",
    "package_id",
    "presentation_analyzer",
    "explicit_scene_plan",
    "creative_mode_beats",
    "asset_images"
  ],
  "voiceover_text_equal": true,
  "hook_equal": true,
  "scenes_count": 5
}
```

## Package → Content items (platform persist)
```json
[
  {
    "id": "6f2fef02-ee2c-4d7c-8c97-3d78c84bec01",
    "platform": "youtube",
    "format": "short",
    "title": "Good Traffic Is a Lie",
    "caption": "34 weekend visitors. Zero leads. She thought traffic meant success — until she looked closer. Save this one.",
    "cta": "Save this one.",
    "hashtags": [
      "#smallbusiness",
      "#websitetips"
    ],
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    }
  },
  {
    "id": "4a2606f1-df1b-4eb1-8b9a-a1954d976f0f",
    "platform": "tiktok",
    "format": "reel",
    "title": "Good Traffic Is a Lie",
    "caption": "34 visitors. 0 leads. Her website was live. Her business wasn't. 👀",
    "cta": null,
    "hashtags": [
      "#smallbusiness",
      "#websitetips",
      "#leadgeneration",
      "#businessowner"
    ],
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    }
  },
  {
    "id": "fba46d88-9c65-4345-ac57-44b13f2ad901",
    "platform": "instagram",
    "format": "reel",
    "title": "Good Traffic Is a Lie",
    "caption": "She checked her analytics on Tuesday morning and felt it.\n\n34 sessions. Zero leads. No names. No emails. Just a quiet record of people who came, had questions, and left.\n\nThe website was live. The business wasn't.\n\nSave this if that number has ever looked familiar.",
    "cta": "Save this if that number has ever looked familiar.",
    "hashtags": [
      "#smallbusiness",
      "#websitetraffic",
      "#leadgeneration",
      "#businesstips",
      "#servicebusiness",
      "#onlinepresence",
      "#growyourbusiness"
    ],
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    }
  },
  {
    "id": "5072f7d2-14e7-4182-af52-169e266ba93e",
    "platform": "facebook",
    "format": "reel",
    "title": "Good Traffic Is a Lie",
    "caption": "Ever opened your analytics and felt quietly proud of the traffic — then noticed zero leads came from it? 😶 That's the gap most business owners don't see until it's been happening for months. Your visitors had questions. Your website had nothing to say. Save this if it sounds familiar, and share it with a business owner who needs to hear it.",
    "cta": "Save this if it sounds familiar.",
    "hashtags": [
      "#smallbusiness",
      "#businesstips"
    ],
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    }
  },
  {
    "id": "f73f9da4-aae3-49f8-a263-4fa4fe1519f2",
    "platform": "linkedin",
    "format": "reel",
    "title": "Good Traffic Is a Lie",
    "caption": "Most small business owners use traffic as a proxy for marketing success. It is not.\n\nTraffic tells you people arrived. It says nothing about what happened next — whether they had a question, whether anything answered it, or whether they left for a competitor who did.\n\nThe gap between sessions and leads is where the real story lives. And most dashboards make it very easy not to look at it.\n\nIf your analytics show sessions but the leads column stays quiet, the problem is rarely the traffic.",
    "cta": null,
    "hashtags": [
      "#smallbusiness",
      "#leadgeneration"
    ],
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    }
  },
  {
    "id": "ddb5db5e-e06b-420e-8849-a215716a4612",
    "platform": "linkedin",
    "format": "reel",
    "title": "Good Traffic Is a Lie",
    "caption": "A business owner checked her analytics on Tuesday. Thirty-four sessions over the weekend. She was pleased — until she looked at the leads column.\n\nZero.\n\nNo names. No emails. No form fills. Just a clean record of people who came, had a question, found silence, and moved on.\n\nThe site was live. The business was not.\n\nThis is the gap that most service businesses are not measuring — and it compounds quietly, weekend after weekend.",
    "cta": null,
    "hashtags": [
      "#smallbusiness",
      "#leadgeneration"
    ],
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 1
    }
  },
  {
    "id": "bbb4a1cf-daf2-4e7b-89e7-48c2651c2c9f",
    "platform": "x",
    "format": "reel",
    "title": "Good Traffic Is a Lie",
    "caption": "34 weekend visitors. 0 leads. The website was live. The business wasn't. That's the gap most analytics dashboards don't make obvious.",
    "cta": null,
    "hashtags": [
      "#smallbusiness"
    ],
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    }
  },
  {
    "id": "35d39178-66e9-464a-a6db-6ef25b11d974",
    "platform": "x",
    "format": "reel",
    "title": "34 Sessions. 0 Leads.",
    "caption": "Traffic is not traction. It's just a record of people who showed up and found no one home.",
    "cta": null,
    "hashtags": [
      "#smallbusiness"
    ],
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 1
    }
  },
  {
    "id": "8759ef8f-eafd-43e9-9eb1-df633ddd8e64",
    "platform": "x",
    "format": "reel",
    "title": "The Website Was Live. The Business Was Not.",
    "caption": "The leads column said zero. The sessions column said 34. That difference has a name: silence. https://fenrik.chat",
    "cta": null,
    "hashtags": [
      "#smallbusiness"
    ],
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 2
    }
  },
  {
    "id": "2c053a45-ce40-429b-9e7d-e70e51d74b17",
    "platform": "x",
    "format": "reel",
    "title": "What Your Analytics Aren't Telling You",
    "caption": "She spent the weekend away from the desk. Her visitors spent it looking for answers somewhere else.",
    "cta": null,
    "hashtags": [
      "#smallbusiness"
    ],
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 3
    }
  },
  {
    "id": "715d0a39-db65-4c96-b769-01c16e549d63",
    "platform": "x",
    "format": "reel",
    "title": "Traffic Without Response Is Just a Record of Missed Chances",
    "caption": "Good bounce rate is a myth your analytics let you believe. The real number is how many left with their question still unanswered.",
    "cta": null,
    "hashtags": [
      "#smallbusiness"
    ],
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 4
    }
  }
]
```

## X caption variants: package_brief vs content_items
```json
{
  "package_caption_variants": [
    "34 weekend visitors. 0 leads. The website was live. The business wasn't. That's the gap most analytics dashboards don't make obvious.",
    "Traffic is not traction. It's just a record of people who showed up and found no one home.",
    "The leads column said zero. The sessions column said 34. That difference has a name: silence.",
    "She spent the weekend away from the desk. Her visitors spent it looking for answers somewhere else.",
    "Good bounce rate is a myth your analytics let you believe. The real number is how many left with their question still unanswered."
  ],
  "content_item_captions": [
    {
      "variant": 0,
      "caption": "34 weekend visitors. 0 leads. The website was live. The business wasn't. That's the gap most analytics dashboards don't make obvious."
    },
    {
      "variant": 1,
      "caption": "Traffic is not traction. It's just a record of people who showed up and found no one home."
    },
    {
      "variant": 2,
      "caption": "The leads column said zero. The sessions column said 34. That difference has a name: silence. https://fenrik.chat"
    },
    {
      "variant": 3,
      "caption": "She spent the weekend away from the desk. Her visitors spent it looking for answers somewhere else."
    },
    {
      "variant": 4,
      "caption": "Good bounce rate is a myth your analytics let you believe. The real number is how many left with their question still unanswered."
    }
  ]
}
```

## Images → Render
```json
{
  "stills": [
    "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-1.png",
    "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-2.png",
    "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-3.png",
    "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-4.png",
    "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-5.png"
  ],
  "motion": {
    "beats": [
      {
        "beat_id": "beat-1",
        "scene_id": "scene-1",
        "motion_intent": "EXPLAIN",
        "motion_version": "semantic-motion@2",
        "motion_intensity": "LOW",
        "motion_primitive": "static"
      },
      {
        "beat_id": "beat-2",
        "scene_id": "scene-2",
        "motion_intent": "EXPLAIN",
        "motion_version": "semantic-motion@2",
        "motion_intensity": "LOW",
        "motion_primitive": "pan_left"
      },
      {
        "beat_id": "beat-3",
        "scene_id": "scene-3",
        "motion_intent": "EXPLAIN",
        "motion_version": "semantic-motion@2",
        "motion_intensity": "LOW",
        "motion_primitive": "static"
      },
      {
        "beat_id": "beat-4",
        "scene_id": "scene-4",
        "motion_intent": "EMPHASIS",
        "motion_version": "semantic-motion@2",
        "motion_intensity": "LOW",
        "motion_primitive": "zoom_in"
      },
      {
        "beat_id": "beat-5",
        "scene_id": "scene-5",
        "motion_intent": "CLOSE",
        "motion_version": "semantic-motion@2",
        "motion_intensity": "LOW",
        "motion_primitive": "static"
      }
    ],
    "version": "semantic-motion@2"
  },
  "video_duration": 26.733333
}
```

# 6. PROMPT CONTEXT (what each AI step received)

Full reconstructed user prompts are in §3. Context blocks embedded therein include Product Brain, proof, scenarios, pain point, anti-repetition, directives, concept, opening, visual identity, assets, platform rules, variant counts.

## 6.1 Product Brain block content (from project at audit)
```json
{
  "product_is": [
    "AI chatbot platform for websites",
    "Automatically analyzes website URL to build a knowledge base",
    "Answers visitor questions 24/7",
    "Guides visitors to the right service or information",
    "Captures leads automatically",
    "Deployed via a simple embed script",
    "Creates an AI assistant in about one minute",
    "Uses existing website content automatically",
    "Preview before signup",
    "No training required"
  ],
  "product_is_not": [
    "Not a product requiring developer skills or coding",
    "Not a complex integration requiring technical knowledge",
    "Not limited to tech companies only",
    "Not a custom AI project",
    "Not a live human chat service",
    "Not a chatbot that requires manual training"
  ],
  "product_strengths": [
    "AI assistant created in as little as 1 minute",
    "No code or technical knowledge required",
    "Fixed monthly pricing starting at $69/month",
    "Try a preview without registration",
    "Works across many industries and business types",
    "Simple single embed script deployment",
    "Answers instantly",
    "Captures leads outside business hours",
    "Uses your website content automatically",
    "No training required",
    "No coding required",
    "Preview before registration",
    "Transparent pricing",
    "Starts working from existing website immediately"
  ],
  "pain_points": [
    "Unable to answer customer questions when offline",
    "No resources to build or maintain a custom chatbot",
    "Losing leads due to lack of instant website support",
    "Complexity and cost of traditional chatbot integrations",
    "Need for 24/7 customer support without extra staff",
    "Visitors leave before contacting you",
    "Repeating the same customer questions every day"
  ],
  "forbidden_claims": [],
  "target_audience": {
    "segments": [
      "Local services and consulting firms",
      "Car dealers, beauty salons, and service centers",
      "SaaS and software companies",
      "Lawyers, accountants, and agencies",
      "Marketing agencies",
      "Consultants",
      "Professional services",
      "Small businesses",
      "SMB service companies"
    ]
  },
  "tone_of_voice": {
    "notes": [
      "Simple and accessible",
      "Direct and action-oriented",
      "Transparent and honest",
      "Friendly and approachable",
      "Concise and practical"
    ]
  },
  "goal_type": "lead_generation",
  "default_cta": "Create your AI assistant"
}
```

## 6.2 Knowledge cards
```json
{
  "proof": {
    "source": "url",
    "status": "approved",
    "statements": [
      "Starting at $69/month with transparent monthly subscription",
      "No hidden fees stated explicitly",
      "Try the preview without registration required",
      "Simple embed script — no integrations or technical knowledge required",
      "Works on existing websites",
      "Uses website content automatically",
      "Can be installed with one script",
      "Preview available before signup",
      "AI generated directly from your website",
      "Live preview before activation",
      "Website can be activated with one embed script"
    ],
    "asset_statements": []
  },
  "voice": {
    "tone": [
      "Simple and accessible",
      "Direct and action-oriented",
      "Transparent and honest",
      "Friendly and approachable",
      "Concise and practical"
    ],
    "source": "url",
    "status": "approved",
    "forbidden_claims": []
  },
  "product": {
    "source": "url",
    "status": "approved",
    "product_is": [
      "AI chatbot platform for websites",
      "Automatically analyzes website URL to build a knowledge base",
      "Answers visitor questions 24/7",
      "Guides visitors to the right service or information",
      "Captures leads automatically",
      "Deployed via a simple embed script",
      "Creates an AI assistant in about one minute",
      "Uses existing website content automatically",
      "Preview before signup",
      "No training required"
    ],
    "product_is_not": [
      "Not a product requiring developer skills or coding",
      "Not a complex integration requiring technical knowledge",
      "Not limited to tech companies only",
      "Not a custom AI project",
      "Not a live human chat service",
      "Not a chatbot that requires manual training"
    ],
    "product_strengths": [
      "AI assistant created in as little as 1 minute",
      "No code or technical knowledge required",
      "Fixed monthly pricing starting at $69/month",
      "Try a preview without registration",
      "Works across many industries and business types",
      "Simple single embed script deployment",
      "Answers instantly",
      "Captures leads outside business hours",
      "Uses your website content automatically",
      "No training required",
      "No coding required",
      "Preview before registration",
      "Transparent pricing",
      "Starts working from existing website immediately"
    ]
  },
  "customer": {
    "source": "url",
    "status": "approved",
    "pain_points": [
      "Unable to answer customer questions when offline",
      "No resources to build or maintain a custom chatbot",
      "Losing leads due to lack of instant website support",
      "Complexity and cost of traditional chatbot integrations",
      "Need for 24/7 customer support without extra staff",
      "Visitors leave before contacting you",
      "Repeating the same customer questions every day"
    ],
    "target_audience": [
      "Local services and consulting firms",
      "Car dealers, beauty salons, and service centers",
      "SaaS and software companies",
      "Lawyers, accountants, and agencies",
      "Marketing agencies",
      "Consultants",
      "Professional services",
      "Small businesses",
      "SMB service companies"
    ]
  }
}
```

## 6.3 Selected pain point used in pipeline
```text
Visitors leave before contacting you
```

## 6.4 Creative directives (RECONSTRUCTED from seed)
```json
{
  "mode": {
    "id": "contrarian",
    "name": "Contrarian",
    "description": "Challenges a common belief the audience holds.",
    "structure": "Common belief -> why it is wrong (dismantle with reasoning) -> proof of the better take -> CTA.",
    "avoid": "Attack the idea or habit, never a person or group.",
    "narrativeBeats": [
      "common_belief",
      "why_wrong",
      "proof",
      "cta"
    ],
    "preferred": true
  },
  "hook": {
    "id": "unexpected_truth",
    "instruction": "Open with a true but counter-intuitive statement that reframes the topic.",
    "exampleForm": "\"The cleanest flats are usually the dirtiest where it counts.\"",
    "forbidGeneric": "Do not open with \"Did you know...\" or a topic label."
  },
  "persona": {
    "id": "insider",
    "name": "Insider",
    "vocabulary": "behind-the-scenes, trade specifics",
    "rhythm": "conspiratorial, lets-you-in pacing",
    "energy": "engaged, slightly exclusive",
    "exaggeration": "light, for intrigue only"
  }
}
```

## 6.5 Assets offered to Content Package prompt
```json
[
  {
    "id": "b1b0d00c-0bfc-4095-954f-4b38a813747f",
    "title": "Better customer support",
    "media_type": "image",
    "asset_class": "static",
    "ai_description": "The image presents a promotional layout highlighting features of an AI customer support assistant, including 24/7 availability, easy deployment, no coding required, and predictable pricing.",
    "detected_content_type": "screenshot",
    "suggested_usage": "This asset could be used in marketing materials to promote AI customer support solutions.",
    "trust_signal": null,
    "product_role": "product_ui",
    "asset_quality": null,
    "orientation": "landscape",
    "preferred_presentation": "laptop_screen",
    "video_suitability": "screen_insert",
    "safe_vertical_usage": false,
    "aspect_ratio": "100:41",
    "visual_importance": "primary",
    "capture_viewport": "desktop",
    "preferred_video_usage": "framed_screen",
    "provenance_class": "component_capture",
    "authenticity_for_product_claim": "ineligible",
    "recommended_presentation_classes": [
      "PRODUCT_OUTCOME_WORLD",
      "ABSTRACT_MECHANISM",
      "NO_PRODUCT_APPEARANCE"
    ]
  },
  {
    "id": "7e250d64-ddcf-4649-921f-783d294a2b5b",
    "title": "Create an AI assistant for your website in 1 minute.",
    "media_type": "image",
    "asset_class": "static",
    "ai_description": "The image promotes a service that creates an AI assistant for websites in just one minute, highlighting its features and pricing.",
    "detected_content_type": "screenshot",
    "suggested_usage": "Use in digital marketing campaigns to attract website owners.",
    "trust_signal": null,
    "product_role": "product_ui",
    "asset_quality": null,
    "orientation": "landscape",
    "preferred_presentation": "laptop_screen",
    "video_suitability": "screen_insert",
    "safe_vertical_usage": false,
    "aspect_ratio": "900:463",
    "visual_importance": "primary",
    "capture_viewport": "desktop",
    "preferred_video_usage": "framed_screen",
    "provenance_class": "component_capture",
    "authenticity_for_product_claim": "ineligible",
    "recommended_presentation_classes": [
      "PRODUCT_OUTCOME_WORLD",
      "ABSTRACT_MECHANISM",
      "NO_PRODUCT_APPEARANCE"
    ]
  },
  {
    "id": "cd775ffc-9c6d-4d66-b879-8b175c8b1907",
    "title": "Frequently Asked Questions",
    "media_type": "image",
    "asset_class": "static",
    "ai_description": "The image displays a list of frequently asked questions related to a chat service called Fenrik.chat.",
    "detected_content_type": "document",
    "suggested_usage": "This asset can be used to address common inquiries from potential users.",
    "trust_signal": null,
    "product_role": "product_ui",
    "asset_quality": null,
    "orientation": "landscape",
    "preferred_presentation": "laptop_screen",
    "video_suitability": "screen_insert",
    "safe_vertical_usage": false,
    "aspect_ratio": "400:321",
    "visual_importance": "primary",
    "capture_viewport": "desktop",
    "preferred_video_usage": "framed_screen",
    "provenance_class": "component_capture",
    "authenticity_for_product_claim": "ineligible",
    "recommended_presentation_classes": [
      "PRODUCT_OUTCOME_WORLD",
      "ABSTRACT_MECHANISM",
      "NO_PRODUCT_APPEARANCE"
    ]
  },
  {
    "id": "5c11b59c-f6fa-4652-9c4b-ead145418898",
    "title": "AI Assistant",
    "media_type": "image",
    "asset_class": "static",
    "ai_description": "The image features a promotional graphic for an AI Assistant service, highlighting its monthly price and key functionalities.",
    "detected_content_type": "price list",
    "suggested_usage": "This asset could be used to inform potential customers about pricing and features.",
    "trust_signal": null,
    "product_role": "pricing_screenshot",
    "asset_quality": null,
    "orientation": "landscape",
    "preferred_presentation": "laptop_screen",
    "video_suitability": "screen_insert",
    "safe_vertical_usage": false,
    "aspect_ratio": "40:33",
    "visual_importance": "primary",
    "capture_viewport": "desktop",
    "preferred_video_usage": "floating_card",
    "provenance_class": "component_capture",
    "authenticity_for_product_claim": "ineligible",
    "recommended_presentation_classes": [
      "PRODUCT_OUTCOME_WORLD",
      "ABSTRACT_MECHANISM",
      "NO_PRODUCT_APPEARANCE"
    ]
  },
  {
    "id": "d0577ae7-6599-44f1-84af-c6ee18512312",
    "title": "Feature card",
    "media_type": "image",
    "asset_class": "static",
    "ai_description": "The image displays a grid of categories related to various services and industries, including e-shops, consulting firms, and beauty salons.",
    "detected_content_type": "static",
    "suggested_usage": "This asset could be used to categorize services on a website or marketing material.",
    "trust_signal": null,
    "product_role": null,
    "asset_quality": null,
    "orientation": "landscape",
    "preferred_presentation": "laptop_screen",
    "video_suitability": "avoid_fullscreen",
    "safe_vertical_usage": false,
    "aspect_ratio": "225:59",
    "visual_importance": "supporting",
    "capture_viewport": "desktop",
    "preferred_video_usage": "framed_screen",
    "provenance_class": "component_capture",
    "authenticity_for_product_claim": "ineligible",
    "recommended_presentation_classes": [
      "PRODUCT_OUTCOME_WORLD",
      "ABSTRACT_MECHANISM",
      "NO_PRODUCT_APPEARANCE"
    ]
  }
]
```

## 6.6 Snapshotted recent fingerprints in prompt memory overlay
```json
[
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
```

# 7. ASSETS

## Existing project assets (loaded for package generation)
```json
[
  {
    "id": "b1b0d00c-0bfc-4095-954f-4b38a813747f",
    "title": "Better customer support",
    "media_type": "image",
    "asset_class": "static",
    "ai_description": "The image presents a promotional layout highlighting features of an AI customer support assistant, including 24/7 availability, easy deployment, no coding required, and predictable pricing.",
    "detected_content_type": "screenshot",
    "suggested_usage": "This asset could be used in marketing materials to promote AI customer support solutions.",
    "trust_signal": null,
    "product_role": "product_ui",
    "asset_quality": null,
    "orientation": "landscape",
    "preferred_presentation": "laptop_screen",
    "video_suitability": "screen_insert",
    "safe_vertical_usage": false,
    "aspect_ratio": "100:41",
    "visual_importance": "primary",
    "capture_viewport": "desktop",
    "preferred_video_usage": "framed_screen",
    "provenance_class": "component_capture",
    "authenticity_for_product_claim": "ineligible",
    "recommended_presentation_classes": [
      "PRODUCT_OUTCOME_WORLD",
      "ABSTRACT_MECHANISM",
      "NO_PRODUCT_APPEARANCE"
    ]
  },
  {
    "id": "7e250d64-ddcf-4649-921f-783d294a2b5b",
    "title": "Create an AI assistant for your website in 1 minute.",
    "media_type": "image",
    "asset_class": "static",
    "ai_description": "The image promotes a service that creates an AI assistant for websites in just one minute, highlighting its features and pricing.",
    "detected_content_type": "screenshot",
    "suggested_usage": "Use in digital marketing campaigns to attract website owners.",
    "trust_signal": null,
    "product_role": "product_ui",
    "asset_quality": null,
    "orientation": "landscape",
    "preferred_presentation": "laptop_screen",
    "video_suitability": "screen_insert",
    "safe_vertical_usage": false,
    "aspect_ratio": "900:463",
    "visual_importance": "primary",
    "capture_viewport": "desktop",
    "preferred_video_usage": "framed_screen",
    "provenance_class": "component_capture",
    "authenticity_for_product_claim": "ineligible",
    "recommended_presentation_classes": [
      "PRODUCT_OUTCOME_WORLD",
      "ABSTRACT_MECHANISM",
      "NO_PRODUCT_APPEARANCE"
    ]
  },
  {
    "id": "cd775ffc-9c6d-4d66-b879-8b175c8b1907",
    "title": "Frequently Asked Questions",
    "media_type": "image",
    "asset_class": "static",
    "ai_description": "The image displays a list of frequently asked questions related to a chat service called Fenrik.chat.",
    "detected_content_type": "document",
    "suggested_usage": "This asset can be used to address common inquiries from potential users.",
    "trust_signal": null,
    "product_role": "product_ui",
    "asset_quality": null,
    "orientation": "landscape",
    "preferred_presentation": "laptop_screen",
    "video_suitability": "screen_insert",
    "safe_vertical_usage": false,
    "aspect_ratio": "400:321",
    "visual_importance": "primary",
    "capture_viewport": "desktop",
    "preferred_video_usage": "framed_screen",
    "provenance_class": "component_capture",
    "authenticity_for_product_claim": "ineligible",
    "recommended_presentation_classes": [
      "PRODUCT_OUTCOME_WORLD",
      "ABSTRACT_MECHANISM",
      "NO_PRODUCT_APPEARANCE"
    ]
  },
  {
    "id": "5c11b59c-f6fa-4652-9c4b-ead145418898",
    "title": "AI Assistant",
    "media_type": "image",
    "asset_class": "static",
    "ai_description": "The image features a promotional graphic for an AI Assistant service, highlighting its monthly price and key functionalities.",
    "detected_content_type": "price list",
    "suggested_usage": "This asset could be used to inform potential customers about pricing and features.",
    "trust_signal": null,
    "product_role": "pricing_screenshot",
    "asset_quality": null,
    "orientation": "landscape",
    "preferred_presentation": "laptop_screen",
    "video_suitability": "screen_insert",
    "safe_vertical_usage": false,
    "aspect_ratio": "40:33",
    "visual_importance": "primary",
    "capture_viewport": "desktop",
    "preferred_video_usage": "floating_card",
    "provenance_class": "component_capture",
    "authenticity_for_product_claim": "ineligible",
    "recommended_presentation_classes": [
      "PRODUCT_OUTCOME_WORLD",
      "ABSTRACT_MECHANISM",
      "NO_PRODUCT_APPEARANCE"
    ]
  },
  {
    "id": "d0577ae7-6599-44f1-84af-c6ee18512312",
    "title": "Feature card",
    "media_type": "image",
    "asset_class": "static",
    "ai_description": "The image displays a grid of categories related to various services and industries, including e-shops, consulting firms, and beauty salons.",
    "detected_content_type": "static",
    "suggested_usage": "This asset could be used to categorize services on a website or marketing material.",
    "trust_signal": null,
    "product_role": null,
    "asset_quality": null,
    "orientation": "landscape",
    "preferred_presentation": "laptop_screen",
    "video_suitability": "avoid_fullscreen",
    "safe_vertical_usage": false,
    "aspect_ratio": "225:59",
    "visual_importance": "supporting",
    "capture_viewport": "desktop",
    "preferred_video_usage": "framed_screen",
    "provenance_class": "component_capture",
    "authenticity_for_product_claim": "ineligible",
    "recommended_presentation_classes": [
      "PRODUCT_OUTCOME_WORLD",
      "ABSTRACT_MECHANISM",
      "NO_PRODUCT_APPEARANCE"
    ]
  }
]
```

## asset_usage on package
```json
[]
```

## video_job.input.asset_images
```json
[]
```

## AI-selected asset ids
```json
[]
```

## AI-not-selected (all offered ids when asset_usage empty)
```json
[
  "b1b0d00c-0bfc-4095-954f-4b38a813747f",
  "7e250d64-ddcf-4649-921f-783d294a2b5b",
  "cd775ffc-9c6d-4d66-b879-8b175c8b1907",
  "5c11b59c-f6fa-4652-9c4b-ead145418898",
  "d0577ae7-6599-44f1-84af-c6ee18512312"
]
```

# 8. CTA FLOW

## Project CTA
```json
{
  "default_cta": "Create your AI assistant"
}
```

## Strategy CTA
```json
{
  "strategy_item_brief_cta": null,
  "note": "no cta field on strategy item brief"
}
```

## Concept CTA
```json
{
  "narrative_arc_cta_segment": "CTA — Screen holds on the analytics dashboard, but this time the lead count is not zero. Voiceover closes: your traffic was never the problem."
}
```

## Package CTA
```json
{
  "text": "Save this if you've ever checked your analytics and felt that quiet sinking feeling.",
  "type": "save"
}
```

## Platform CTAs (package_brief.platform_outputs)
```json
{
  "x": null,
  "tiktok": null,
  "youtube": "Save this one.",
  "facebook": "Save this if it sounds familiar.",
  "linkedin": null,
  "instagram": "Save this if that number has ever looked familiar."
}
```

## Final content_items CTA
```json
[
  {
    "platform": "youtube",
    "variant": 0,
    "cta": "Save this one."
  },
  {
    "platform": "tiktok",
    "variant": 0,
    "cta": null
  },
  {
    "platform": "instagram",
    "variant": 0,
    "cta": "Save this if that number has ever looked familiar."
  },
  {
    "platform": "facebook",
    "variant": 0,
    "cta": "Save this if it sounds familiar."
  },
  {
    "platform": "linkedin",
    "variant": 0,
    "cta": null
  },
  {
    "platform": "linkedin",
    "variant": 1,
    "cta": null
  },
  {
    "platform": "x",
    "variant": 0,
    "cta": null
  },
  {
    "platform": "x",
    "variant": 1,
    "cta": null
  },
  {
    "platform": "x",
    "variant": 2,
    "cta": null
  },
  {
    "platform": "x",
    "variant": 3,
    "cta": null
  },
  {
    "platform": "x",
    "variant": 4,
    "cta": null
  }
]
```

## presentation_generation CTA counters
```json
{
  "cta_selected": false,
  "requested_cta_count": 0,
  "accepted_cta_count": 0,
  "downgraded_cta_count": 0,
  "cta_decision_reason": "no typed CTA requested in visual plan",
  "cta_composition_id": null
}
```

# 9. FUNNEL FLOW

```json
{
  "project_goal_type": "lead_generation",
  "strategy_funnel_distribution": {
    "Awareness": 0,
    "Conversion": 0,
    "Problem Aware": 1,
    "Solution Aware": 0
  },
  "strategy_item_funnel_stage": "problem_aware",
  "package_funnel_stage": "problem_aware",
  "content_items_funnel": [
    {
      "platform": "youtube",
      "funnel_stage": "problem_aware"
    },
    {
      "platform": "tiktok",
      "funnel_stage": "problem_aware"
    },
    {
      "platform": "instagram",
      "funnel_stage": "problem_aware"
    },
    {
      "platform": "facebook",
      "funnel_stage": "problem_aware"
    },
    {
      "platform": "linkedin",
      "funnel_stage": "problem_aware"
    },
    {
      "platform": "linkedin",
      "funnel_stage": "problem_aware"
    },
    {
      "platform": "x",
      "funnel_stage": "problem_aware"
    },
    {
      "platform": "x",
      "funnel_stage": "problem_aware"
    },
    {
      "platform": "x",
      "funnel_stage": "problem_aware"
    },
    {
      "platform": "x",
      "funnel_stage": "problem_aware"
    },
    {
      "platform": "x",
      "funnel_stage": "problem_aware"
    }
  ]
}
```

# 10. PRODUCT FLOW

## Product Brain product_is / strengths
```json
{
  "product_is": [
    "AI chatbot platform for websites",
    "Automatically analyzes website URL to build a knowledge base",
    "Answers visitor questions 24/7",
    "Guides visitors to the right service or information",
    "Captures leads automatically",
    "Deployed via a simple embed script",
    "Creates an AI assistant in about one minute",
    "Uses existing website content automatically",
    "Preview before signup",
    "No training required"
  ],
  "product_strengths": [
    "AI assistant created in as little as 1 minute",
    "No code or technical knowledge required",
    "Fixed monthly pricing starting at $69/month",
    "Try a preview without registration",
    "Works across many industries and business types",
    "Simple single embed script deployment",
    "Answers instantly",
    "Captures leads outside business hours",
    "Uses your website content automatically",
    "No training required",
    "No coding required",
    "Preview before registration",
    "Transparent pricing",
    "Starts working from existing website immediately"
  ]
}
```

## Strategy item text (topic/angle/pain)
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

## Concept product_role / core_idea
```json
{
  "product_role": "Fenrik.chat is introduced as the presence the website was always missing — not a technical product, not a chatbot project, but the thing that makes a live website actually behave like a live business. It enters the story as the resolution to a problem the viewer has just been shown they already have.",
  "core_idea": "Most small business owners believe that website traffic is proof their marketing is working. This video dismantles that belief by revealing what the analytics screen actually shows when you look closer — real people who arrived, had a question, got silence, and left for whoever answered first. The product is introduced not as a chatbot, but as the thing that makes the website actually present when a human arrives.",
  "narrative_arc": "HOOK — Open on a business owner, coffee in hand, Tuesday morning, genuinely pleased as she opens her analytics dashboard. The numbers look good. Weekend traffic was real. She leans in. WHY WRONG — The camera pushes closer on the screen. Sessions: 34. Leads captured: 0. Bounce rate: 91%. She scrolls. Nothing. No form fills. No emails. No names. The voiceover lands the reframe: good traffic means people showed up. It does not mean anyone was home to meet them. DISMANTLE — A quick visual sequence: a visitor lands on the site at 9 PM Saturday, reads a service page, has a question, finds no way to ask it, opens a competitor tab. Then another visitor. Then another. The site was live. The business was not. PROOF — The voiceover pivots: the fix is not more traffic, not a bigger team, not a redesign. It is a website that can actually respond — one that reads your existing content, builds its own knowledge, and answers the moment someone asks. No training. No code. Ready in about a minute. CTA — Screen holds on the analytics dashboard, but this time the lead count is not zero. Voiceover closes: your traffic was never the problem."
}
```

## Voiceover
```text
You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.
```

## Platform outputs (full)
```json
{
  "x": {
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
  },
  "tiktok": {
    "cta": null,
    "format": "reel",
    "caption": "34 visitors. 0 leads. Her website was live. Her business wasn't. 👀",
    "hashtags": [
      "#smallbusiness",
      "#websitetips",
      "#leadgeneration",
      "#businessowner"
    ]
  },
  "youtube": {
    "cta": "Save this one.",
    "format": "short",
    "caption": "34 weekend visitors. Zero leads. She thought traffic meant success — until she looked closer. Save this one.",
    "hashtags": [
      "#smallbusiness",
      "#websitetips"
    ]
  },
  "facebook": {
    "cta": "Save this if it sounds familiar.",
    "format": "reel",
    "caption": "Ever opened your analytics and felt quietly proud of the traffic — then noticed zero leads came from it? 😶 That's the gap most business owners don't see until it's been happening for months. Your visitors had questions. Your website had nothing to say. Save this if it sounds familiar, and share it with a business owner who needs to hear it.",
    "hashtags": [
      "#smallbusiness",
      "#businesstips"
    ]
  },
  "linkedin": {
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
  },
  "instagram": {
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
}
```

## Final video — product mentions in VO / scenes
```json
{
  "voiceover_text": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
  "scene_4_prompt": {
    "source": "ai",
    "image_prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised."
  },
  "scene_5_prompt": {
    "source": "ai",
    "image_prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
  }
}
```

# 11. VISUAL FLOW

## Concept visual_direction
```json
{
  "palette": "Warm neutrals for the environment — off-white walls, natural wood desk, muted sage or terracotta accents. The screen is the only source of cooler blue-grey tones. No brand-forward colors until the product moment, where a single clean accent (soft teal or slate blue) enters with the Fenrik interface.",
  "lighting": "Soft morning window light from one side, warm but slightly flat — the kind of light that makes everything look ordinary and fine before you look closer. The screen glow adds a cool secondary source that subtly competes with the warmth, creating a small visual tension between the hopeful morning and the cold data.",
  "environment": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a startup loft, not a corporate office. A framed license or certificate visible but not foregrounded. Plants optional. The space should feel like someone who built something real and is proud of it.",
  "camera_style": "Handheld but composed — slight natural movement that keeps it feeling observational rather than staged. Push-in slowly on the screen during the realization beat. Cut to over-the-shoulder POV for the analytics close-up. The competitor-tab sequence uses a clean screen-capture style insert, brief and precise. Final frame is a static wide shot of the desk with the screen now showing a lead notification.",
  "art_direction": "Clean, realistic small-business aesthetic — not polished corporate, not gritty. The kind of desk that has a half-drunk coffee, a sticky note, and a laptop that is two years old. Screen content is legible and real-looking: a simple analytics dashboard with visible session counts and a lead column showing zero. Motion is slow and deliberate — no fast cuts in the first half. The pacing mirrors the creeping realization.",
  "character_style": "One central character — a woman in her late 30s or early 40s, owner of a local service business (deliberately non-specific industry to stay broadly relatable). Dressed practically, not stylishly. Her expression does the narrative work: pleased, then puzzled, then still — the stillness of someone doing quiet math in their head. No dialogue. No voiceover from her. She is observed, not interviewed."
}
```

## Visual identity
```json
{
  "palette": "Warm neutrals for the environment — off-white walls, natural wood desk, muted sage or terracotta accents. The screen is the only source of cooler blue-grey tones. No brand-forward colors until the product moment, where a single clean accent (soft teal or slate blue) enters with the Fenrik interface.",
  "lighting": "Soft morning window light from one side, warm but slightly flat — the kind of light that makes everything look ordinary and fine before you look closer. The screen glow adds a cool secondary source that subtly competes with the warmth, creating a small visual tension between the hopeful morning and the cold data.",
  "environment": "A small home office or back-room desk setup. Lived-in but organized. A service business owner's real workspace — not a startup loft, not a corporate office. A framed license or certificate visible but not foregrounded. Plants optional. The space should feel like someone who built something real and is proud of it.",
  "camera_style": "Handheld but composed — slight natural movement that keeps it feeling observational rather than staged. Push-in slowly on the screen during the realization beat. Cut to over-the-shoulder POV for the analytics close-up. The competitor-tab sequence uses a clean screen-capture style insert, brief and precise. Final frame is a static wide shot of the desk with the screen now showing a lead notification.",
  "art_direction": "Clean, realistic small-business aesthetic — not polished corporate, not gritty. The kind of desk that has a half-drunk coffee, a sticky note, and a laptop that is two years old. Screen content is legible and real-looking: a simple analytics dashboard with visible session counts and a lead column showing zero. Motion is slow and deliberate — no fast cuts in the first half. The pacing mirrors the creeping realization.",
  "character_style": "One central character — a woman in her late 30s or early 40s, owner of a local service business (deliberately non-specific industry to stay broadly relatable). Dressed practically, not stylishly. Her expression does the narrative work: pleased, then puzzled, then still — the stillness of someone doing quiet math in their head. No dialogue. No voiceover from her. She is observed, not interviewed.",
  "opening_emotion": "A creeping sense of unease as realization dawns.",
  "opening_first_image": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen."
}
```

## visual_scenes
```json
[
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
]
```

## image_prompts
```json
[
  "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement.",
  "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness.",
  "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left.",
  "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised.",
  "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
]
```

## Generated image paths
```json
[
  {
    "id": "scene-1",
    "path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-1.png"
  },
  {
    "id": "scene-2",
    "path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-2.png"
  },
  {
    "id": "scene-3",
    "path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-3.png"
  },
  {
    "id": "scene-4",
    "path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-4.png"
  },
  {
    "id": "scene-5",
    "path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-5.png"
  }
]
```

## Render motion + durations
```json
{
  "semantic_motion": {
    "beats": [
      {
        "beat_id": "beat-1",
        "scene_id": "scene-1",
        "motion_intent": "EXPLAIN",
        "motion_version": "semantic-motion@2",
        "motion_intensity": "LOW",
        "motion_primitive": "static"
      },
      {
        "beat_id": "beat-2",
        "scene_id": "scene-2",
        "motion_intent": "EXPLAIN",
        "motion_version": "semantic-motion@2",
        "motion_intensity": "LOW",
        "motion_primitive": "pan_left"
      },
      {
        "beat_id": "beat-3",
        "scene_id": "scene-3",
        "motion_intent": "EXPLAIN",
        "motion_version": "semantic-motion@2",
        "motion_intensity": "LOW",
        "motion_primitive": "static"
      },
      {
        "beat_id": "beat-4",
        "scene_id": "scene-4",
        "motion_intent": "EMPHASIS",
        "motion_version": "semantic-motion@2",
        "motion_intensity": "LOW",
        "motion_primitive": "zoom_in"
      },
      {
        "beat_id": "beat-5",
        "scene_id": "scene-5",
        "motion_intent": "CLOSE",
        "motion_version": "semantic-motion@2",
        "motion_intensity": "LOW",
        "motion_primitive": "static"
      }
    ],
    "version": "semantic-motion@2"
  },
  "scenes": [
    {
      "id": "scene-1",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-1.png",
      "image_bucket": "video-renders",
      "image_prompt": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-2",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-2.png",
      "image_bucket": "video-renders",
      "image_prompt": "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-3",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-3.png",
      "image_bucket": "video-renders",
      "image_prompt": "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-4",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-4.png",
      "image_bucket": "video-renders",
      "image_prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-5",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-5.png",
      "image_bucket": "video-renders",
      "image_prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
        }
      },
      "renderer_version": "image@1"
    }
  ]
}
```

# 12. VOICE FLOW

## Concept narration (narrative_arc)
```text
HOOK — Open on a business owner, coffee in hand, Tuesday morning, genuinely pleased as she opens her analytics dashboard. The numbers look good. Weekend traffic was real. She leans in. WHY WRONG — The camera pushes closer on the screen. Sessions: 34. Leads captured: 0. Bounce rate: 91%. She scrolls. Nothing. No form fills. No emails. No names. The voiceover lands the reframe: good traffic means people showed up. It does not mean anyone was home to meet them. DISMANTLE — A quick visual sequence: a visitor lands on the site at 9 PM Saturday, reads a service page, has a question, finds no way to ask it, opens a competitor tab. Then another visitor. Then another. The site was live. The business was not. PROOF — The voiceover pivots: the fix is not more traffic, not a bigger team, not a redesign. It is a website that can actually respond — one that reads your existing content, builds its own knowledge, and answers the moment someone asks. No training. No code. Ready in about a minute. CTA — Screen holds on the analytics dashboard, but this time the lead count is not zero. Voiceover closes: your traffic was never the problem.
```

## Opening first_spoken_sentence + first_image
```json
{
  "pacing": "Slow and deliberate, mirroring the woman's growing concern.",
  "emotion": "A creeping sense of unease as realization dawns.",
  "first_image": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen.",
  "attention_pattern": "The viewer is drawn in by the contrast between the initial optimism of good traffic and the unsettling truth revealed by the analytics.",
  "first_spoken_sentence": "You thought traffic meant success."
}
```

## Package voiceover_text
```text
You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.
```

## TTS input
```json
{
  "text": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
  "voice": "shimmer",
  "instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: measured, credible. Language: en."
}
```

## Whisper output (persisted fields only)
```json
{
  "word_count": 57,
  "language": "english",
  "match_ratio": 0.9661016949152542,
  "tail_transcript": [
    "the",
    "website",
    "was",
    "live",
    "the",
    "business",
    "was",
    "not"
  ]
}
```

## Final subtitles (package phrases)
```text
You thought traffic meant success. / She opened her analytics on Tuesday morning — 34 sessions over the weekend. / She smiled. / Then she looked at the leads column. / Zero. / No names. No emails. No record of anyone. / They came. They had questions. They found silence. / And they went to whoever answered first. / The website was live. / The business was not.
```

# 13. PLATFORM OUTPUTS (complete)

## x
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

## tiktok
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

## youtube
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

## facebook
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

## linkedin
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

## instagram
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

## content_items rows (complete captions)
```json
[
  {
    "id": "6f2fef02-ee2c-4d7c-8c97-3d78c84bec01",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "platform": "youtube",
    "format": "short",
    "status": "draft",
    "title": "Good Traffic Is a Lie",
    "body": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "caption": "34 weekend visitors. Zero leads. She thought traffic meant success — until she looked closer. Save this one.",
    "hashtags": [
      "#smallbusiness",
      "#websitetips"
    ],
    "cta": "Save this one.",
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    },
    "created_at": "2026-07-25T00:09:52.953766+00:00",
    "updated_at": "2026-07-25T00:09:52.953766+00:00",
    "language": null
  },
  {
    "id": "4a2606f1-df1b-4eb1-8b9a-a1954d976f0f",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "platform": "tiktok",
    "format": "reel",
    "status": "draft",
    "title": "Good Traffic Is a Lie",
    "body": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "caption": "34 visitors. 0 leads. Her website was live. Her business wasn't. 👀",
    "hashtags": [
      "#smallbusiness",
      "#websitetips",
      "#leadgeneration",
      "#businessowner"
    ],
    "cta": null,
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    },
    "created_at": "2026-07-25T00:09:52.953766+00:00",
    "updated_at": "2026-07-25T00:09:52.953766+00:00",
    "language": null
  },
  {
    "id": "fba46d88-9c65-4345-ac57-44b13f2ad901",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "platform": "instagram",
    "format": "reel",
    "status": "draft",
    "title": "Good Traffic Is a Lie",
    "body": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "caption": "She checked her analytics on Tuesday morning and felt it.\n\n34 sessions. Zero leads. No names. No emails. Just a quiet record of people who came, had questions, and left.\n\nThe website was live. The business wasn't.\n\nSave this if that number has ever looked familiar.",
    "hashtags": [
      "#smallbusiness",
      "#websitetraffic",
      "#leadgeneration",
      "#businesstips",
      "#servicebusiness",
      "#onlinepresence",
      "#growyourbusiness"
    ],
    "cta": "Save this if that number has ever looked familiar.",
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    },
    "created_at": "2026-07-25T00:09:52.953766+00:00",
    "updated_at": "2026-07-25T00:09:52.953766+00:00",
    "language": null
  },
  {
    "id": "5072f7d2-14e7-4182-af52-169e266ba93e",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "platform": "facebook",
    "format": "reel",
    "status": "draft",
    "title": "Good Traffic Is a Lie",
    "body": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "caption": "Ever opened your analytics and felt quietly proud of the traffic — then noticed zero leads came from it? 😶 That's the gap most business owners don't see until it's been happening for months. Your visitors had questions. Your website had nothing to say. Save this if it sounds familiar, and share it with a business owner who needs to hear it.",
    "hashtags": [
      "#smallbusiness",
      "#businesstips"
    ],
    "cta": "Save this if it sounds familiar.",
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    },
    "created_at": "2026-07-25T00:09:52.953766+00:00",
    "updated_at": "2026-07-25T00:09:52.953766+00:00",
    "language": null
  },
  {
    "id": "f73f9da4-aae3-49f8-a263-4fa4fe1519f2",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "platform": "linkedin",
    "format": "reel",
    "status": "draft",
    "title": "Good Traffic Is a Lie",
    "body": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "caption": "Most small business owners use traffic as a proxy for marketing success. It is not.\n\nTraffic tells you people arrived. It says nothing about what happened next — whether they had a question, whether anything answered it, or whether they left for a competitor who did.\n\nThe gap between sessions and leads is where the real story lives. And most dashboards make it very easy not to look at it.\n\nIf your analytics show sessions but the leads column stays quiet, the problem is rarely the traffic.",
    "hashtags": [
      "#smallbusiness",
      "#leadgeneration"
    ],
    "cta": null,
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    },
    "created_at": "2026-07-25T00:09:52.953766+00:00",
    "updated_at": "2026-07-25T00:09:52.953766+00:00",
    "language": null
  },
  {
    "id": "ddb5db5e-e06b-420e-8849-a215716a4612",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "platform": "linkedin",
    "format": "reel",
    "status": "draft",
    "title": "Good Traffic Is a Lie",
    "body": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "caption": "A business owner checked her analytics on Tuesday. Thirty-four sessions over the weekend. She was pleased — until she looked at the leads column.\n\nZero.\n\nNo names. No emails. No form fills. Just a clean record of people who came, had a question, found silence, and moved on.\n\nThe site was live. The business was not.\n\nThis is the gap that most service businesses are not measuring — and it compounds quietly, weekend after weekend.",
    "hashtags": [
      "#smallbusiness",
      "#leadgeneration"
    ],
    "cta": null,
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 1
    },
    "created_at": "2026-07-25T00:09:52.953766+00:00",
    "updated_at": "2026-07-25T00:09:52.953766+00:00",
    "language": null
  },
  {
    "id": "bbb4a1cf-daf2-4e7b-89e7-48c2651c2c9f",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "platform": "x",
    "format": "reel",
    "status": "draft",
    "title": "Good Traffic Is a Lie",
    "body": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "caption": "34 weekend visitors. 0 leads. The website was live. The business wasn't. That's the gap most analytics dashboards don't make obvious.",
    "hashtags": [
      "#smallbusiness"
    ],
    "cta": null,
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 0
    },
    "created_at": "2026-07-25T00:09:52.953766+00:00",
    "updated_at": "2026-07-25T00:09:52.953766+00:00",
    "language": null
  },
  {
    "id": "35d39178-66e9-464a-a6db-6ef25b11d974",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "platform": "x",
    "format": "reel",
    "status": "draft",
    "title": "34 Sessions. 0 Leads.",
    "body": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "caption": "Traffic is not traction. It's just a record of people who showed up and found no one home.",
    "hashtags": [
      "#smallbusiness"
    ],
    "cta": null,
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 1
    },
    "created_at": "2026-07-25T00:09:52.953766+00:00",
    "updated_at": "2026-07-25T00:09:52.953766+00:00",
    "language": null
  },
  {
    "id": "8759ef8f-eafd-43e9-9eb1-df633ddd8e64",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "platform": "x",
    "format": "reel",
    "status": "draft",
    "title": "The Website Was Live. The Business Was Not.",
    "body": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "caption": "The leads column said zero. The sessions column said 34. That difference has a name: silence. https://fenrik.chat",
    "hashtags": [
      "#smallbusiness"
    ],
    "cta": null,
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 2
    },
    "created_at": "2026-07-25T00:09:52.953766+00:00",
    "updated_at": "2026-07-25T00:09:52.953766+00:00",
    "language": null
  },
  {
    "id": "2c053a45-ce40-429b-9e7d-e70e51d74b17",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "platform": "x",
    "format": "reel",
    "status": "draft",
    "title": "What Your Analytics Aren't Telling You",
    "body": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "caption": "She spent the weekend away from the desk. Her visitors spent it looking for answers somewhere else.",
    "hashtags": [
      "#smallbusiness"
    ],
    "cta": null,
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 3
    },
    "created_at": "2026-07-25T00:09:52.953766+00:00",
    "updated_at": "2026-07-25T00:09:52.953766+00:00",
    "language": null
  },
  {
    "id": "715d0a39-db65-4c96-b769-01c16e549d63",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
    "platform": "x",
    "format": "reel",
    "status": "draft",
    "title": "Traffic Without Response Is Just a Record of Missed Chances",
    "body": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "caption": "Good bounce rate is a myth your analytics let you believe. The real number is how many left with their question still unanswered.",
    "hashtags": [
      "#smallbusiness"
    ],
    "cta": null,
    "generation_metadata": {
      "source": "content_pipeline",
      "funnel_stage": "problem_aware",
      "package_index": 0,
      "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
      "platform_variant_index": 4
    },
    "created_at": "2026-07-25T00:09:52.953766+00:00",
    "updated_at": "2026-07-25T00:09:52.953766+00:00",
    "language": null
  }
]
```

# 14. COMPLETE PACKAGE

## content_packages row
```json
{
  "id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "strategy_item_id": "51d2f466-2f1b-48e4-8fb7-1734cf469fdc",
  "title": "Good Traffic Is a Lie",
  "status": "draft",
  "package_brief": {
    "cta": {
      "text": "Save this if you've ever checked your analytics and felt that quiet sinking feeling.",
      "type": "save"
    },
    "hook": "You thought traffic meant success.",
    "video": {
      "script": "SCENE 1 — OPEN: Warm morning light. A woman in her late 30s sits at a lived-in desk, coffee in hand. She opens her laptop. Analytics dashboard fills the screen. Sessions: 34. She leans back, satisfied. The camera holds on her face — pleased.\n\nVO: 'You thought traffic meant success.'\n\nSCENE 2 — REALIZATION: Slow push-in on the screen. The lead column comes into focus. Zero. She leans closer. Scrolls. Nothing. No form fills. No emails. No names. Her expression changes — not panic, just stillness. Quiet math.\n\nVO: 'She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone.'\n\nSCENE 3 — VISITOR SEQUENCE: Screen-capture style inserts. A visitor lands on a service page at 9 PM Saturday. Reads. Has a question. Finds nothing to ask it. Opens a new tab — a competitor. Then another visitor. Then another. Each one gone.\n\nVO: 'They came. They had questions. They found silence. And they went to whoever answered first.'\n\nSCENE 4 — PRODUCT MOMENT: The same desk. Same woman. But now a soft teal chat interface sits in the corner of her website screen. A visitor question appears. An answer follows — instant. A lead notification pops. She didn't do anything. The website did.\n\nVO: 'The website was live. The business was not.'\n\nSCENE 5 — FINAL FRAME: Static wide shot. Desk, warm light, laptop. The analytics screen is visible — lead count no longer zero. Camera holds. No dialogue. The image does the work.",
      "concept": "A small business owner opens her analytics dashboard on a Tuesday morning, pleased by the weekend traffic numbers. The camera pushes in slowly as she sees the leads column: zero. The video then cuts through a sequence of silent visitor moments — people who arrived, had questions, got no response, and left for a competitor. The story closes with the reframe: traffic was never the problem. The silence was.",
      "duration_seconds": "42"
    },
    "hashtags": [
      "#smallbusiness",
      "#websitetraffic",
      "#leadgeneration",
      "#businessowner",
      "#servicebusiness",
      "#growyourbusiness",
      "#businesstips"
    ],
    "scenario": "A small business owner opens her analytics dashboard on Tuesday morning, pleased to see 34 weekend sessions. The satisfaction dissolves when she looks at the leads column — zero. No names, no emails, no form fills. Visitors arrived over the weekend, had questions, found a static page with no way to ask them, and moved on to competitors who could respond. She had no idea any of it was happening.",
    "subtitles": "You thought traffic meant success. / She opened her analytics on Tuesday morning — 34 sessions over the weekend. / She smiled. / Then she looked at the leads column. / Zero. / No names. No emails. No record of anyone. / They came. They had questions. They found silence. / And they went to whoever answered first. / The website was live. / The business was not.",
    "asset_usage": [],
    "image_prompts": [
      "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement.",
      "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness.",
      "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left.",
      "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised.",
      "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
    ],
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
    "voiceover_text": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
    "platform_outputs": {
      "x": {
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
      },
      "tiktok": {
        "cta": null,
        "format": "reel",
        "caption": "34 visitors. 0 leads. Her website was live. Her business wasn't. 👀",
        "hashtags": [
          "#smallbusiness",
          "#websitetips",
          "#leadgeneration",
          "#businessowner"
        ]
      },
      "youtube": {
        "cta": "Save this one.",
        "format": "short",
        "caption": "34 weekend visitors. Zero leads. She thought traffic meant success — until she looked closer. Save this one.",
        "hashtags": [
          "#smallbusiness",
          "#websitetips"
        ]
      },
      "facebook": {
        "cta": "Save this if it sounds familiar.",
        "format": "reel",
        "caption": "Ever opened your analytics and felt quietly proud of the traffic — then noticed zero leads came from it? 😶 That's the gap most business owners don't see until it's been happening for months. Your visitors had questions. Your website had nothing to say. Save this if it sounds familiar, and share it with a business owner who needs to hear it.",
        "hashtags": [
          "#smallbusiness",
          "#businesstips"
        ]
      },
      "linkedin": {
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
      },
      "instagram": {
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
    },
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
    }
  },
  "created_at": "2026-07-25T00:09:52.65708+00:00",
  "updated_at": "2026-07-25T00:14:45.897074+00:00",
  "weekly_strategy_id": "dfb8f999-6a88-402e-87a7-bddedf65fbc5",
  "funnel_stage": "problem_aware"
}
```

## package_brief only
```json
{
  "cta": {
    "text": "Save this if you've ever checked your analytics and felt that quiet sinking feeling.",
    "type": "save"
  },
  "hook": "You thought traffic meant success.",
  "video": {
    "script": "SCENE 1 — OPEN: Warm morning light. A woman in her late 30s sits at a lived-in desk, coffee in hand. She opens her laptop. Analytics dashboard fills the screen. Sessions: 34. She leans back, satisfied. The camera holds on her face — pleased.\n\nVO: 'You thought traffic meant success.'\n\nSCENE 2 — REALIZATION: Slow push-in on the screen. The lead column comes into focus. Zero. She leans closer. Scrolls. Nothing. No form fills. No emails. No names. Her expression changes — not panic, just stillness. Quiet math.\n\nVO: 'She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone.'\n\nSCENE 3 — VISITOR SEQUENCE: Screen-capture style inserts. A visitor lands on a service page at 9 PM Saturday. Reads. Has a question. Finds nothing to ask it. Opens a new tab — a competitor. Then another visitor. Then another. Each one gone.\n\nVO: 'They came. They had questions. They found silence. And they went to whoever answered first.'\n\nSCENE 4 — PRODUCT MOMENT: The same desk. Same woman. But now a soft teal chat interface sits in the corner of her website screen. A visitor question appears. An answer follows — instant. A lead notification pops. She didn't do anything. The website did.\n\nVO: 'The website was live. The business was not.'\n\nSCENE 5 — FINAL FRAME: Static wide shot. Desk, warm light, laptop. The analytics screen is visible — lead count no longer zero. Camera holds. No dialogue. The image does the work.",
    "concept": "A small business owner opens her analytics dashboard on a Tuesday morning, pleased by the weekend traffic numbers. The camera pushes in slowly as she sees the leads column: zero. The video then cuts through a sequence of silent visitor moments — people who arrived, had questions, got no response, and left for a competitor. The story closes with the reframe: traffic was never the problem. The silence was.",
    "duration_seconds": "42"
  },
  "hashtags": [
    "#smallbusiness",
    "#websitetraffic",
    "#leadgeneration",
    "#businessowner",
    "#servicebusiness",
    "#growyourbusiness",
    "#businesstips"
  ],
  "scenario": "A small business owner opens her analytics dashboard on Tuesday morning, pleased to see 34 weekend sessions. The satisfaction dissolves when she looks at the leads column — zero. No names, no emails, no form fills. Visitors arrived over the weekend, had questions, found a static page with no way to ask them, and moved on to competitors who could respond. She had no idea any of it was happening.",
  "subtitles": "You thought traffic meant success. / She opened her analytics on Tuesday morning — 34 sessions over the weekend. / She smiled. / Then she looked at the leads column. / Zero. / No names. No emails. No record of anyone. / They came. They had questions. They found silence. / And they went to whoever answered first. / The website was live. / The business was not.",
  "asset_usage": [],
  "image_prompts": [
    "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement.",
    "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness.",
    "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left.",
    "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised.",
    "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
  ],
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
  "voiceover_text": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
  "platform_outputs": {
    "x": {
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
    },
    "tiktok": {
      "cta": null,
      "format": "reel",
      "caption": "34 visitors. 0 leads. Her website was live. Her business wasn't. 👀",
      "hashtags": [
        "#smallbusiness",
        "#websitetips",
        "#leadgeneration",
        "#businessowner"
      ]
    },
    "youtube": {
      "cta": "Save this one.",
      "format": "short",
      "caption": "34 weekend visitors. Zero leads. She thought traffic meant success — until she looked closer. Save this one.",
      "hashtags": [
        "#smallbusiness",
        "#websitetips"
      ]
    },
    "facebook": {
      "cta": "Save this if it sounds familiar.",
      "format": "reel",
      "caption": "Ever opened your analytics and felt quietly proud of the traffic — then noticed zero leads came from it? 😶 That's the gap most business owners don't see until it's been happening for months. Your visitors had questions. Your website had nothing to say. Save this if it sounds familiar, and share it with a business owner who needs to hear it.",
      "hashtags": [
        "#smallbusiness",
        "#businesstips"
      ]
    },
    "linkedin": {
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
    },
    "instagram": {
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
  },
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
  }
}
```

# 15. FINAL VIDEO

```json
{
  "video_job_id": "df31e14e-4a31-4e8f-b4ef-8a454d899e26",
  "status": "completed",
  "provider": "video_engine",
  "created_at": "2026-07-25T00:09:54.987526+00:00",
  "completed_at": "2026-07-25T00:14:45.694+00:00",
  "content_item_id": "4a2606f1-df1b-4eb1-8b9a-a1954d976f0f",
  "tts_voice": "shimmer",
  "visual_profile": "MINIMAL",
  "speech_duration": 25.248,
  "video_duration": 26.733333,
  "audio_duration": 26.748,
  "post_mux_duration": 26.748,
  "resolution": "NOT_PERSISTED_AS_FIELD",
  "scene_count": 5,
  "scene_types": [
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE",
    "IMAGE"
  ],
  "image_paths": [
    "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-1.png",
    "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-2.png",
    "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-3.png",
    "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-4.png",
    "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/df31e14e-4a31-4e8f-b4ef-8a454d899e26/scene-scene-5.png"
  ],
  "subtitle_source": "whisper",
  "match_ratio": 0.9661016949152542,
  "sfx_mixed": false,
  "render_warnings": [],
  "mp4_storage": "video-renders bucket (signed URL redacted)",
  "thumbnail_storage": "signed URL redacted",
  "subtitle_storage": "signed URL redacted",
  "render_spec_version": 1,
  "semantic_motion_version": "semantic-motion@2"
}
```

## Full video_job.input
```json
{
  "cta": "Save this if you've ever checked your analytics and felt that quiet sinking feeling.",
  "hook": "You thought traffic meant success.",
  "angle": "Walk through the quiet horror of seeing real traffic with zero leads — visitors who had questions, found silence, and moved on to whoever answered first. The website was live. The business was not.",
  "topic": "The small business owner who checked her website analytics on Tuesday and realized every single weekend visitor had left without a trace",
  "scenes": [
    {
      "id": "scene-1",
      "type": "IMAGE",
      "image_prompt": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-2",
      "type": "IMAGE",
      "image_prompt": "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-3",
      "type": "IMAGE",
      "image_prompt": "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-4",
      "type": "IMAGE",
      "image_prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-5",
      "type": "IMAGE",
      "image_prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
        }
      },
      "renderer_version": "image@1"
    }
  ],
  "script": "SCENE 1 — OPEN: Warm morning light. A woman in her late 30s sits at a lived-in desk, coffee in hand. She opens her laptop. Analytics dashboard fills the screen. Sessions: 34. She leans back, satisfied. The camera holds on her face — pleased.\n\nVO: 'You thought traffic meant success.'\n\nSCENE 2 — REALIZATION: Slow push-in on the screen. The lead column comes into focus. Zero. She leans closer. Scrolls. Nothing. No form fills. No emails. No names. Her expression changes — not panic, just stillness. Quiet math.\n\nVO: 'She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone.'\n\nSCENE 3 — VISITOR SEQUENCE: Screen-capture style inserts. A visitor lands on a service page at 9 PM Saturday. Reads. Has a question. Finds nothing to ask it. Opens a new tab — a competitor. Then another visitor. Then another. Each one gone.\n\nVO: 'They came. They had questions. They found silence. And they went to whoever answered first.'\n\nSCENE 4 — PRODUCT MOMENT: The same desk. Same woman. But now a soft teal chat interface sits in the corner of her website screen. A visitor question appears. An answer follows — instant. A lead notification pops. She didn't do anything. The website did.\n\nVO: 'The website was live. The business was not.'\n\nSCENE 5 — FINAL FRAME: Static wide shot. Desk, warm light, laptop. The analytics screen is visible — lead count no longer zero. Camera holds. No dialogue. The image does the work.",
  "concept": "A small business owner opens her analytics dashboard on a Tuesday morning, pleased by the weekend traffic numbers. The camera pushes in slowly as she sees the leads column: zero. The video then cuts through a sequence of silent visitor moments — people who arrived, had questions, got no response, and left for a competitor. The story closes with the reframe: traffic was never the problem. The silence was.",
  "scenario": "A small business owner opens her analytics dashboard on Tuesday morning, pleased to see 34 weekend sessions. The satisfaction dissolves when she looks at the leads column — zero. No names, no emails, no form fills. Visitors arrived over the weekend, had questions, found a static page with no way to ask them, and moved on to competitors who could respond. She had no idea any of it was happening.",
  "subtitles": "You thought traffic meant success. / She opened her analytics on Tuesday morning — 34 sessions over the weekend. / She smiled. / Then she looked at the leads column. / Zero. / No names. No emails. No record of anyone. / They came. They had questions. They found silence. / And they went to whoever answered first. / The website was live. / The business was not.",
  "tts_voice": "shimmer",
  "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
  "asset_images": [],
  "voice_scores": {
    "primary": 41,
    "secondary": 46
  },
  "voice_source": "package_secondary",
  "creative_mode": "contrarian",
  "image_prompts": [
    "A woman in her late 30s, coffee cup in hand, sits at a cluttered desk in her small home office. The screen glows with an analytics dashboard showing 34 sessions and 0 leads. Her brow furrows as she leans in closer, the morning light casting a warm glow over the scene, contrasting with the cold data on the screen. Warm neutrals, natural wood desk, off-white walls, soft window light from one side. Handheld but composed camera feel, slight natural movement.",
    "Extreme close-up push-in on a laptop screen showing a simple analytics dashboard. Sessions column: 34. Leads column: 0. The screen glow is cool blue-grey. A woman's hand rests motionless beside the keyboard. Warm ambient room light competes with the cold screen tone, creating quiet visual tension. No faces — just data and stillness.",
    "Screen-capture style insert showing a browser window open on a local service business website at night. Static service page with a contact form and no interactive elements. A cursor hovers, then drifts toward a new tab opening — a competitor's website beginning to load. Only screen light illuminates the dark environment. The image conveys a visitor who arrived, had a question, found silence, and left.",
    "The same woman at her lived-in desk in warm morning light. Her laptop screen now shows the same website but with a soft teal AI chat interface in the bottom corner. A visitor question is visible on screen and an answer is populating beneath it — automatically. The woman is not at the keyboard. A small lead notification appears at the top of the screen. Her expression is calm and quietly surprised.",
    "Wide static shot of a small home office desk. Laptop open, warm window light from one side, a half-drunk coffee cup, a sticky note on the monitor edge. The analytics dashboard on screen now shows a non-zero number in the leads column. A framed license or certificate is softly out of focus on the off-white wall behind. No person in frame — just the space, the light, and the changed data. Final frame energy: quiet resolution."
  ],
  "visual_medium": "PHOTOGRAPHIC",
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
  "voice_reasons": [
    "funnel_problem→warmth(+2)",
    "mode_contrarian→energy(+3)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+41)",
    "fit_secondary(+46)"
  ],
  "selected_voice": "shimmer",
  "visual_profile": "MINIMAL",
  "voiceover_text": "You thought traffic meant success. She opened her analytics on Tuesday morning — 34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero. No names. No emails. No record of anyone. They came. They had questions. They found silence. And they went to whoever answered first. The website was live. The business was not.",
  "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: measured, credible. Language: en.",
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: confident challenge, measured not combative. Delivery: measured, credible. Language: en.",
  "production_run_id": "fbe48cf4-c052-4e31-8b75-8bad362673f4",
  "weekly_strategy_id": "dfb8f999-6a88-402e-87a7-bddedf65fbc5",
  "creative_mode_beats": [
    "common_belief",
    "why_wrong",
    "proof",
    "cta"
  ],
  "explicit_scene_plan": true,
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
      "QUOTE",
      "PHONE",
      "CTA"
    ],
    "presentation_generation": {
      "mode": "enabled",
      "package_id": "fb9839ea-92fd-461b-a1a5-002058ea4251",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
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
      "target_visual_beat_count": 8,
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
  },
  "visual_medium_version": "visual-medium@1",
  "visual_profile_scores": {
    "BOLD": 0,
    "MINIMAL": 6,
    "NATURAL": 5,
    "PREMIUM": 0,
    "EDITORIAL": 4
  },
  "visual_profile_source": "auto",
  "resolved_primary_voice": "cedar",
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
  "resolved_secondary_voice": "shimmer"
}
```

## Full video_job.output.debug (URLs redacted upstream where needed)
```json
{
  "sfx_mixed": false,
  "sfx_reason": "not_selected",
  "match_ratio": 0.9661016949152542,
  "fallback_used": false,
  "language_hint": null,
  "audio_duration": 26.748,
  "duration_delta": 0.014667000000002872,
  "render_warning": false,
  "video_duration": 26.733333,
  "render_warnings": [],
  "speech_duration": 25.248,
  "subtitle_source": "whisper",
  "target_duration": 26.748,
  "srt_last_cue_end": 25.059999465942383,
  "subtitle_warning": false,
  "language_detected": "english",
  "post_mux_duration": 26.748,
  "tts_tail_expected": [
    "the",
    "business",
    "was",
    "not"
  ],
  "tts_validation_log": [
    {
      "pass": true,
      "attempt": 1,
      "expected_tail": [
        "the",
        "business",
        "was",
        "not"
      ],
      "durationSeconds": 25.248,
      "transcript_tail": [
        "the",
        "website",
        "was",
        "live",
        "the",
        "business",
        "was",
        "not"
      ]
    }
  ],
  "whisper_word_count": 57,
  "tail_buffer_seconds": 1.5,
  "tts_tail_retry_used": false,
  "tts_tail_transcript": [
    "the",
    "website",
    "was",
    "live",
    "the",
    "business",
    "was",
    "not"
  ],
  "generation_telemetry": {
    "steps": [
      {
        "model": "gpt-4o-mini-tts",
        "repair": false,
        "success": true,
        "provider": "tts",
        "warnings": [],
        "raw_usage": {
          "character_count": 343,
          "duration_seconds": 25.248,
          "usd_per_1k_chars": 0.015
        },
        "step_name": "TTS",
        "max_tokens": null,
        "started_at": "2026-07-25T00:09:56.951Z",
        "duration_ms": 6384,
        "finished_at": "2026-07-25T00:10:03.334Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": null,
        "error_message": null,
        "input_summary": "TTS input:\n- Voiceover text\n- Voice / instructions",
        "prompt_tokens": null,
        "estimated_cost": 0.005145,
        "output_summary": "audio duration=25.248s",
        "pricing_source": "list_price_estimate",
        "pricing_version": "list-price@2026-07-23",
        "response_format": null,
        "input_size_bytes": 345,
        "completion_tokens": null,
        "output_size_bytes": 114,
        "prompt_characters": 343,
        "provider_request_id": null,
        "completion_characters": 114
      },
      {
        "model": "whisper-1",
        "repair": false,
        "success": true,
        "provider": "whisper",
        "warnings": [],
        "raw_usage": {
          "word_count": 57,
          "usd_per_min": 0.006,
          "fallback_used": false,
          "duration_seconds": 25.248
        },
        "step_name": "Whisper",
        "max_tokens": null,
        "started_at": "2026-07-25T00:10:03.336Z",
        "duration_ms": 2638,
        "finished_at": "2026-07-25T00:10:05.974Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": null,
        "error_message": null,
        "input_summary": "Whisper input:\n- Voiceover audio\n- Language hint",
        "prompt_tokens": null,
        "estimated_cost": 0.002525,
        "output_summary": "57 words (english)",
        "pricing_source": "list_price_estimate",
        "pricing_version": "list-price@2026-07-23",
        "response_format": null,
        "input_size_bytes": null,
        "completion_tokens": null,
        "output_size_bytes": 37,
        "prompt_characters": null,
        "provider_request_id": null,
        "completion_characters": 37
      },
      {
        "model": "gpt-image-1",
        "repair": false,
        "success": true,
        "provider": "image",
        "warnings": [],
        "raw_usage": {
          "usd_per_still": 0.042,
          "reused_still_count": 0,
          "generated_still_count": 5
        },
        "step_name": "Image generation",
        "max_tokens": null,
        "started_at": "2026-07-25T00:10:06.154Z",
        "duration_ms": 112454,
        "finished_at": "2026-07-25T00:11:58.607Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": null,
        "error_message": null,
        "input_summary": "Image generation input:\n- 5 scene(s)\n- Visual profile / medium",
        "prompt_tokens": null,
        "estimated_cost": 0.21,
        "output_summary": "generated=5; reused=0",
        "pricing_source": "list_price_estimate",
        "pricing_version": "list-price@2026-07-23",
        "response_format": null,
        "input_size_bytes": null,
        "completion_tokens": null,
        "output_size_bytes": 67,
        "prompt_characters": null,
        "provider_request_id": null,
        "completion_characters": 67
      },
      {
        "model": null,
        "repair": false,
        "success": true,
        "provider": "video",
        "warnings": [],
        "raw_usage": null,
        "step_name": "Video rendering",
        "max_tokens": null,
        "started_at": "2026-07-25T00:11:58.750Z",
        "duration_ms": 159815,
        "finished_at": "2026-07-25T00:14:38.562Z",
        "retry_count": 0,
        "temperature": null,
        "cached_tokens": null,
        "error_message": null,
        "input_summary": "Video rendering input:\n- Scene stills\n- Voiceover\n- Subtitles\n- Motion beats",
        "prompt_tokens": null,
        "estimated_cost": null,
        "output_summary": "video_duration=26.733333",
        "pricing_source": null,
        "pricing_version": null,
        "response_format": null,
        "input_size_bytes": null,
        "completion_tokens": null,
        "output_size_bytes": 50,
        "prompt_characters": null,
        "provider_request_id": null,
        "completion_characters": 50
      }
    ],
    "phases": [],
    "version": "pipeline-telemetry@1",
    "pricing_version": "list-price@2026-07-23"
  },
  "post_subtitle_duration": 26.733333,
  "tts_validation_attempts": 1,
  "subtitle_timeline_duration": 25.059999465942383,
  "tts_tail_validation_passed": true,
  "intermediate_video_duration": 26.733333
}
```

# 16. OBSERVATIONS (technical facts only)

- production_run.status = `completed`; generated_total=1; failed_total=0
- productive window: run.created_at=2026-07-25T00:08:00.919353+00:00 → run_item.updated_at=2026-07-25T00:14:47.160212+00:00; parent run.updated_at=2026-07-25T05:58:00.551003+00:00
- production_run_items.content_item_id = null; video_job_id = null
- AI text steps: Content Strategy, Video Concept, Opening Impact, Content Package; repair steps count = 0
- retry_count sum across steps = 0
- selected_voice / tts_voice on job = "shimmer" / "shimmer"; voice_source = "package_secondary"
- resolved_primary_voice = "cedar"; resolved_secondary_voice = "shimmer"
- creative_mode = "contrarian"
- visual_profile = "MINIMAL"; visual_beat_count = 5; target_visual_beat_count = 8
- final_worker_scene_types = [
  "IMAGE",
  "IMAGE",
  "IMAGE",
  "IMAGE",
  "IMAGE"
]
- prompt_presentation_types = [
  "IMAGE",
  "CHECKLIST",
  "PHONE",
  "QUOTE",
  "CTA"
]
- requested_cta_count = 0; accepted_cta_count = 0
- asset_usage length = 0
- offered assets count = 5
- package video.duration_seconds = "42"; speech_duration = 25.248; video_duration = 26.733333
- scene duration_seconds sum on job input = 20
- hook field equals opening.first_spoken_sentence: true
- platform_outputs keys: x, tiktok, youtube, facebook, linkedin, instagram
- content_items count = 11
- X content_item variant index 2 caption contains URL: true
- package_brief.x.caption_variants[2] contains URL: false
- narrative_arc string length = 1137; voiceover_text length = 343
- product_role present on concept: true
- voiceover_text includes substring "Fenrik": false
- voiceover_text includes substring "assistant": false
- image_prompts and visual_scenes prompts equal: true
- reconstructed Concept prompt char match telemetry: false
- reconstructed Opening prompt char match telemetry: false
- reconstructed Package prompt char match telemetry: false
- reconstructed Strategy prompt char match telemetry: false
- cached_tokens on all AI steps: [
  {
    "step": "Content Strategy",
    "cached": 0
  },
  {
    "step": "Strategy Items",
    "cached": null
  },
  {
    "step": "Video Concept",
    "cached": 0
  },
  {
    "step": "Opening Impact",
    "cached": 0
  },
  {
    "step": "Visual Identity",
    "cached": null
  },
  {
    "step": "Content Package",
    "cached": 0
  },
  {
    "step": "Platform Outputs",
    "cached": null
  },
  {
    "step": "Persist Package",
    "cached": null
  },
  {
    "step": "TTS",
    "cached": null
  },
  {
    "step": "Whisper",
    "cached": null
  },
  {
    "step": "Image generation",
    "cached": null
  },
  {
    "step": "Video rendering",
    "cached": null
  }
]
- n8n package bridge (from prior lookup): workflow O27ELb1s9Y2qisOr execution 1232 ~ 2026-07-25T00:08:09Z → 00:09:56Z

---

End of evidence export.