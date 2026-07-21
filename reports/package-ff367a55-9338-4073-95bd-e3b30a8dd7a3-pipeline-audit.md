# Pipeline audit — Content Package `ff367a55-9338-4073-95bd-e3b30a8dd7a3`

Extrahováno: 2026-07-17T21:55:19.779Z
Production run: `04911a16-e551-4b92-ba5e-6ac73ba0ee37`
Project: Fenrik.chat (`aabab9ff-9db4-4012-a53c-135e3bfea6cd`)


# Obsah (skutečné pořadí)

1. Product Brain
2. Weekly Strategy
3. Strategy Item
4a–4f. Deterministické plány (Directives, Visual Profile, Identity, Narrative, Medium, Product Reveal, Attention)
7. Creative Divergence + Candidate Selection *(před LLM; číslování dle vašeho seznamu)*
4. Content Package LLM *(jeden Claude call)*
5. Hook *(výstup z package LLM + post-process)*
6. Storyboard *(výstup z package LLM)*
8. Scene generation *(výstup z package LLM + worker)*
9. Image prompt generation *(výstup z package LLM)*
10. Voiceover *(výstup z package LLM + TTS)*
11. Subtitle generation
12. Render metadata
13–18. Platform outputs

Kompletní data každého kroku jsou v sekcích níže a v `reports/package-ff367a55-9338-4073-95bd-e3b30a8dd7a3-pipeline-audit-raw.json`.

## Důležitá poznámka o AI promptech a raw odpovědích

V databázi **nejsou uloženy** kompletní LLM requesty (system+user prompt po resolvu proměnných) ani raw text odpovědi modelu před validací.
Persistované jsou: vstupy/plány decision enginů, finální `package_brief`, `content_items`, `video_jobs.input/output`.
Kde je možné z persistovaných dat přesně zrekonstruovat injektovaný blok, je to označeno jako **REKONSTRUKCE Z PERSISTOVANÝCH DAT**.
Kde to možné není: **Prompt: Není persistováno v databázi** / **Odpověď modelu (raw): Není persistováno v databázi**.

Copywriting provider v kódu: Claude (`ANTHROPIC_MODEL` nebo default `claude-sonnet-4-6`).
Image provider v kódu: OpenAI `gpt-image-1`.
TTS v kódu: OpenAI `gpt-4o-mini-tts` (voice z job input).

---
# Mapa skutečného pořadí kroků (shrnutí na konci zopakováno)

1. Product Brain (project knowledge + product fields) — dříve / vstup
2. Weekly Strategy (content_strategies řádek pro run)
3. Strategy Item (content_strategy_items)
4. Deterministické plány před LLM: Creative Directives, Visual Profile, Creative Identity, Visual Narrative, Visual Medium, Product Reveal, Attention, Creative Divergence + Candidate Selection
5. Content Package LLM (jeden Claude call → hook, VO, storyboard, scenes, image prompts, platform_outputs, subtitles string, …)
6. Post-LLM: hook unique + align hook/VO + fidelity check (repair NEspuštěn)
7. Persist package + fan-out content_items
8. Video worker: TTS → scene images → render → SRT

---
# 1. Product Brain

## Název kroku
Product Brain / Project Knowledge (persistovaný project + knowledge cards)

## Vstup
```json
{
  "source_url": "https://fenrik.chat",
  "note": "Product Brain je dlouhodobý stav projektu; pro tento package slouží jako kontext, nebyl znovu volán během generateContentPackage."
}
```

## Výstup
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
  "tone_of_voice": {
    "notes": [
      "Simple and accessible",
      "Direct and action-oriented",
      "Transparent and honest",
      "Friendly and approachable",
      "Concise and practical"
    ]
  },
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
  "goal_type": "lead_generation",
  "knowledge_cards": {
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
  "knowledge_scenarios": [
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
  "knowledge_extracted_at": "2026-06-10T20:10:28.978Z"
}
```

## Použitý AI model
Historická extrakce knowledge: Claude (getCopywritingProvider). Pro tento content package nebyl Product Brain znovu generován.

## Použitý prompt (celý)
```
Není persistováno v databázi (původní extraction prompt z 2026-06-10 není uložen u tohoto package).
```

## Odpověď modelu (celá)
```
Není persistováno jako raw LLM response. Persistovaný výsledek je project.knowledge + product_* pole výše.
```

---
# 2. Weekly Strategy

## Název kroku
Weekly / Run Strategy (content_strategies)

## Vstup
```json
{
  "production_run": {
    "id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
    "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
    "status": "completed",
    "requested_config": {
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
    },
    "package_count": 1,
    "requested_total": 1,
    "generated_total": 1,
    "failed_total": 0,
    "error_message": null,
    "created_at": "2026-07-17T16:16:30.571079+00:00",
    "updated_at": "2026-07-17T16:23:34.047125+00:00"
  },
  "note": "Strategie vznikla ze source=production_run při startu runu."
}
```

## Výstup
```json
{
  "id": "7ab632a1-c780-4fc3-bf22-468b22825c8d",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "name": "The silent cost of a website that can't answer back",
  "objective": "lead_generation",
  "period_start": "2026-07-17",
  "period_end": null,
  "strategy_brief": {
    "theme": "The silent cost of a website that can't answer back",
    "source": "production_run",
    "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
    "funnel_distribution": {
      "Awareness": 0,
      "Conversion": 0,
      "Problem Aware": 1,
      "Solution Aware": 0
    }
  },
  "created_at": "2026-07-17T16:16:40.839617+00:00"
}
```

## Použitý AI model
Není součástí pipeline jako samostatné AI volání pro tento package — záznam vytvořen production run plannerem (source: production_run).

## Použitý prompt (celý)
```
Není součástí pipeline
```

## Odpověď modelu (celá)
```
Není součástí pipeline
```

---
# 3. Strategy Item

## Název kroku
Strategy Item (content_strategy_items)

## Vstup
```json
{
  "strategy_id": "7ab632a1-c780-4fc3-bf22-468b22825c8d",
  "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
  "package_index": 0
}
```

## Výstup
```json
{
  "id": "3691f268-ba5d-4fbe-897d-7cf7c95e53c8",
  "strategy_id": "7ab632a1-c780-4fc3-bf22-468b22825c8d",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
  "platform": "tiktok",
  "format": "reel",
  "topic_id": null,
  "trend_id": null,
  "brief": {
    "angle": "Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not.",
    "topic": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
    "source": "production_run",
    "package_index": 0,
    "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37"
  },
  "priority": 1,
  "created_at": "2026-07-17T16:16:40.989973+00:00",
  "funnel_stage": "problem_aware"
}
```

## Použitý AI model
Není součástí pipeline jako samostatné AI volání — topic/angle byly seeded z production run / scenario bank (topic odpovídá knowledge scenario o accountant vacation).

## Použitý prompt (celý)
```
Není součástí pipeline
```

## Odpověď modelu (celá)
```
Není součástí pipeline
```

---
# 4a. Creative Directives + Visual Profile (deterministické)

## Název kroku
pickCreativeDirectives + resolveVisualProfileForPackage

## Vstup
```json
{
  "funnel_stage": "problem_aware",
  "topic": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
  "angle": "Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not."
}
```

## Výstup
```json
{
  "visual_profile": "NATURAL",
  "visual_profile_version": "visual-profile@3",
  "visual_profile_scores": null,
  "visual_profile_source": "package_snapshot",
  "visual_profile_reasons": null,
  "creative_mode_from_video_job": "shock",
  "creative_mode_beats": [
    "unexpected_fact",
    "implication",
    "proof",
    "cta"
  ]
}
```

## Použitý AI model
Žádný (deterministický kód)

## Použitý prompt (celý)
```
Není součástí pipeline (žádný LLM prompt)
```

## Odpověď modelu (celá)
```
Není součástí pipeline (žádná LLM odpověď)
```

---
# 4b. Creative Identity (deterministické)

## Název kroku
planCreativeIdentityForPackage

## Vstup
```json
{
  "topic": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
  "angle": "Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not.",
  "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd"
}
```

## Výstup
```json
{
  "creative_identity": {
    "key": "a bright co-working space in daylight|quiet tension before a decision|low-contrast, flat documentary lighting|wide environmental framing|layered depth with foreground and background|a single person, partial body, face not dominant|warm neutral color feel",
    "mood": "quiet tension before a decision",
    "camera": "wide environmental framing",
    "version": "creative-identity@1",
    "lighting": "low-contrast, flat documentary lighting",
    "color_feel": "warm neutral color feel",
    "option_ids": {
      "mood": "quietly_tense",
      "camera": "wide_environmental",
      "lighting": "low_contrast_flat",
      "color_feel": "warm_neutral",
      "composition": "layered_depth",
      "environment": "co_working_daylight",
      "human_presence": "single_partial"
    },
    "composition": "layered depth with foreground and background",
    "environment": "a bright co-working space in daylight",
    "human_presence": "a single person, partial body, face not dominant"
  },
  "creative_identity_version": "creative-identity@1",
  "recent_creative_fingerprints": [
    {
      "hook": "Most service businesses think being busy means business is good",
      "topic": "The HVAC company that got slammed with website traffic during a heatwave — and lost every single online lead",
      "motifs": [
        "laptop",
        "phone",
        "group",
        "product_asset"
      ],
      "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 21–25); pl",
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
      "opening_structure": "immediate_reaction",
      "cta_composition_id": null,
      "attention_mechanism": "FRUSTRATION",
      "opening_visual_motif": "same_notification_stacking_nice_five_more",
      "dominant_subject_motif": "laptop",
      "product_reveal_strategy": "PRODUCT_OUTCOME",
      "opening_emotional_effect": "frustration"
    },
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
    }
  ]
}
```

## Použitý AI model
Žádný (deterministický kód)

## Použitý prompt (celý)
```
Není součástí pipeline
```

## Odpověď modelu (celá)
```
Není součástí pipeline
```

---
# 4c. Visual Narrative + Story Director (deterministické)

## Název kroku
planVisualNarrativeForPackage

## Vstup
```json
{
  "topic": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
  "angle": "Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not.",
  "funnel_stage": "problem_aware"
}
```

## Výstup
```json
{
  "key": "human|body language that shows the relationship to the idea in one glance — not a device hero frame",
  "version": "visual-narrative@1.1",
  "subject_focus": "body language that shows the relationship to the idea in one glance — not a device hero frame",
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
    "phone": 1,
    "laptop": 7,
    "close_up": 6,
    "overhead": 1,
    "dashboard": 1,
    "prototype": 2,
    "person_alone": 4,
    "sticky_notes": 1,
    "product_asset": 4
  },
  "supporting_carriers": [
    "place",
    "process",
    "comparison"
  ],
  "primary_meaning_carrier": "human",
  "reject_abstract_riddles": true,
  "preferred_situation_framing": "Situation first: film a person walking away unanswered / waiting for a reply — NOT a paper boat, closed notebook, or abstract prop standing in for the visitor."
}
```

## Použitý AI model
Žádný (deterministický kód)

## Použitý prompt (celý)
```
Není součástí pipeline
```

## Odpověď modelu (celá)
```
Není součástí pipeline
```

---
# 4d. Visual Medium (deterministické)

## Název kroku
planVisualMediumForPackage

## Vstup
```json
{
  "visual_profile": "NATURAL",
  "narrative": {
    "key": "human|body language that shows the relationship to the idea in one glance — not a device hero frame",
    "version": "visual-narrative@1.1",
    "subject_focus": "body language that shows the relationship to the idea in one glance — not a device hero frame",
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
      "phone": 1,
      "laptop": 7,
      "close_up": 6,
      "overhead": 1,
      "dashboard": 1,
      "prototype": 2,
      "person_alone": 4,
      "sticky_notes": 1,
      "product_asset": 4
    },
    "supporting_carriers": [
      "place",
      "process",
      "comparison"
    ],
    "primary_meaning_carrier": "human",
    "reject_abstract_riddles": true,
    "preferred_situation_framing": "Situation first: film a person walking away unanswered / waiting for a reply — NOT a paper boat, closed notebook, or abstract prop standing in for the visitor."
  }
}
```

## Výstup
```json
{
  "visual_medium": "PHOTOGRAPHIC",
  "visual_medium_version": "visual-medium@1",
  "visual_medium_scores": {
    "SOFT_3D": 0,
    "PHOTOGRAPHIC": 2,
    "GRAPHIC_COLLAGE": 0,
    "CLEAN_ILLUSTRATION": 0,
    "TECHNICAL_BLUEPRINT": 0
  },
  "visual_medium_source": "auto",
  "visual_medium_reasons": [
    "SOFT_3D:digital_product(+2)",
    "CLEAN_ILLUSTRATION:abstract_workflow(+1)",
    "PHOTOGRAPHIC:carrier_human(+3)",
    "SOFT_3D:recent_repeat(-2)"
  ]
}
```

## Použitý AI model
Žádný (deterministický kód)

## Použitý prompt (celý)
```
Není součástí pipeline
```

## Odpověď modelu (celá)
```
Není součástí pipeline
```

---
# 4e. Product Reveal (deterministické)

## Název kroku
planProductRevealForPackage

## Vstup
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
  "narrative": {
    "key": "human|body language that shows the relationship to the idea in one glance — not a device hero frame",
    "version": "visual-narrative@1.1",
    "subject_focus": "body language that shows the relationship to the idea in one glance — not a device hero frame",
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
      "phone": 1,
      "laptop": 7,
      "close_up": 6,
      "overhead": 1,
      "dashboard": 1,
      "prototype": 2,
      "person_alone": 4,
      "sticky_notes": 1,
      "product_asset": 4
    },
    "supporting_carriers": [
      "place",
      "process",
      "comparison"
    ],
    "primary_meaning_carrier": "human",
    "reject_abstract_riddles": true,
    "preferred_situation_framing": "Situation first: film a person walking away unanswered / waiting for a reply — NOT a paper boat, closed notebook, or abstract prop standing in for the visitor."
  }
}
```

## Výstup
```json
{
  "reasons": [
    "story_prefers_outcome_over_framed:human",
    "fallback:product_outcome"
  ],
  "version": "product-reveal@2",
  "solution_beat_strategy": "PRODUCT_OUTCOME",
  "sample_payoff_visual_required": false
}
```

## Použitý AI model
Žádný (deterministický kód)

## Použitý prompt (celý)
```
Není součástí pipeline
```

## Odpověď modelu (celá)
```
Není součástí pipeline
```

---
# 4f. Attention & Engagement (deterministické)

## Název kroku
planAttentionForPackage

## Vstup
```json
{
  "topic": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
  "angle": "Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not.",
  "funnel_stage": "problem_aware"
}
```

## Výstup
```json
{
  "opening": {
    "emotional_effect": "strong_opinion",
    "opening_delivery": "urgent",
    "opening_structure": "bold_claim",
    "first_motion_intent": "EMPHASIS",
    "land_within_seconds": [
      1,
      1.8
    ],
    "first_spoken_guidance": "Open with an immediate reaction using Provocative Opinion — not context or setup. The first spoken thought should land in ~1.0–1.8 seconds (one short phrase, or two very short phrases). The stored hook MUST be the same thought as the first spoken line — do not dilute a strong hook into a weaker voiceover setup. State the opinion in the first short phrase. Attack the idea, never a person. Narrative seed: Unexpected but relevant: State the opinion in the first short phrase. Attack the idea, never a person. Keep the link to Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not. / Unable to answer customer questions when offline clear by the next beat.",
    "first_visual_guidance": "The first visual is an attention event, not a sentence illustration. Image that dramatizes the contested habit or its consequence. Preferred opening visual concept: A megaphone pointed at an empty room — volume without substance about Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not. Do not default to calm desks, empty boards, laptop+coffee, or faceless screen-staring unless that is genuinely the strongest idea. Render coherently via Visual Narrative / Medium / Profile / Identity — attention chooses the idea, those systems choose the look.",
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
        "visual_concept": "A modern office desk with laptop and coffee illustrating Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not."
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
        "visual_concept": "A bold handwritten sign being taped over a polished corporate slogan about Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not."
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
        "visual_concept": "A megaphone pointed at an empty room — volume without substance about Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not."
      }
    ],
    "reject_summary": [
      "obvious:office_cliche:\\blaptop\\s+and\\s+coffee\\b",
      "obvious:first_obvious_idea",
      "obvious:visual_story:office_cliche_backslide"
    ],
    "selected_candidate_id": "unexpected",
    "selected_narrative_seed": "Unexpected but relevant: State the opinion in the first short phrase. Attack the idea, never a person. Keep the link to Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not. / Unable to answer customer questions when offline clear by the next beat.",
    "selected_visual_concept": "A megaphone pointed at an empty room — volume without substance about Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not.",
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
      "full_arc_not_opening_only"
    ],
    "version": "delivery-arc@1",
    "tts_instruction_fragment": "Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Vary emphasis; pause before the reveal or punchline. Do not read every line at the same energy. Confident, not aggressive."
  },
  "sfx_category": "click",
  "sfx_selected": true,
  "sfx_timing_ms": 335,
  "attention_source": "deterministic_v1",
  "attention_reasons": [
    "selected:PROVOCATIVE_OPINION",
    "source:deterministic_v1",
    "funnel_soft_affinity:problem_aware:2",
    "creative_mode_soft_affinity:shock:1",
    "topic_signals_opinion",
    "independent_of_funnel_mapping"
  ],
  "attention_version": "attention@1",
  "opening_structure": "bold_claim",
  "attention_mechanism": "PROVOCATIVE_OPINION",
  "opening_visual_motif": "megaphone_pointed_empty_room_volume_without",
  "sfx_render_supported": true,
  "opening_emotional_effect": "strong_opinion"
}
```

## Použitý AI model
Žádný (deterministický kód)

## Použitý prompt (celý)
```
Není součástí pipeline
```

## Odpověď modelu (celá)
```
Není součástí pipeline
```

---
# 7. Creative Divergence + Candidate Selection (deterministické, před LLM)

## Název kroku
planCreativeCandidatesForPackage / runCreativeDivergence (creative-candidates@2 / creative-divergence@2)

## Vstup
```json
{
  "topic": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
  "angle": "Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not.",
  "pain_points": [
    "Unable to answer customer questions when offline",
    "No resources to build or maintain a custom chatbot",
    "Losing leads due to lack of instant website support",
    "Complexity and cost of traditional chatbot integrations",
    "Need for 24/7 customer support without extra staff",
    "Visitors leave before contacting you",
    "Repeating the same customer questions every day"
  ],
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
  "requireVideo": true
}
```

## Výstup
```json
{
  "version": "creative-candidates@2",
  "creativeDivergence": {
    "version": "creative-divergence@2",
    "clusters": [
      {
        "clusterId": "cl-1",
        "memberIds": [
          "raw-31-8156"
        ],
        "centroidScene": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone.",
        "representativeId": "raw-31-8156"
      },
      {
        "clusterId": "cl-2",
        "memberIds": [
          "raw-9-7988"
        ],
        "centroidScene": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet.",
        "representativeId": "raw-9-7988"
      },
      {
        "clusterId": "cl-3",
        "memberIds": [
          "raw-3-994"
        ],
        "centroidScene": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.",
        "representativeId": "raw-3-994"
      },
      {
        "clusterId": "cl-4",
        "memberIds": [
          "raw-4-2739"
        ],
        "centroidScene": "Split-second: a rival service van already in the customer's driveway; clipboard signed; your website-led service business phone lights unanswered on a bench; website chat idle.",
        "representativeId": "raw-4-2739"
      },
      {
        "clusterId": "cl-5",
        "memberIds": [
          "raw-7-2523"
        ],
        "centroidScene": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside.",
        "representativeId": "raw-7-2523"
      },
      {
        "clusterId": "cl-6",
        "memberIds": [
          "raw-26-4396"
        ],
        "centroidScene": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
        "representativeId": "raw-26-4396"
      },
      {
        "clusterId": "cl-7",
        "memberIds": [
          "raw-1-4511"
        ],
        "centroidScene": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door.",
        "representativeId": "raw-1-4511"
      },
      {
        "clusterId": "cl-8",
        "memberIds": [
          "raw-2-8339"
        ],
        "centroidScene": "A ridiculous boarding-ticket dispenser for phone callers in a website-led service business lobby during after-hours silence; numbered paper slips; an open chat widget on a counter tablet glows with zero replies.",
        "representativeId": "raw-2-8339"
      },
      {
        "clusterId": "cl-9",
        "memberIds": [
          "raw-5-2245"
        ],
        "centroidScene": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.",
        "representativeId": "raw-5-2245"
      },
      {
        "clusterId": "cl-10",
        "memberIds": [
          "raw-12-1939"
        ],
        "centroidScene": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence.",
        "representativeId": "raw-12-1939"
      },
      {
        "clusterId": "cl-11",
        "memberIds": [
          "raw-13-3915"
        ],
        "centroidScene": "Kids selling lemonade next to a website-led service business van; parent jokes \"they answer faster than your website\"; technician laughs then freezes.",
        "representativeId": "raw-13-3915"
      },
      {
        "clusterId": "cl-12",
        "memberIds": [
          "raw-16-3883"
        ],
        "centroidScene": "Dog barking at a website-led service business truck leaving; owner on porch scrolls competitor site and books instantly.",
        "representativeId": "raw-16-3883"
      },
      {
        "clusterId": "cl-13",
        "memberIds": [
          "raw-20-6775"
        ],
        "centroidScene": "Waiting room fish tank; one fish labeled \"website leads\"; bowl nearly empty while phone fish overcrowded.",
        "representativeId": "raw-20-6775"
      },
      {
        "clusterId": "cl-14",
        "memberIds": [
          "raw-23-5234"
        ],
        "centroidScene": "Customer holds broken thermostat in one hand, phone in other; competitor van honks; website tab still on \"message sent\".",
        "representativeId": "raw-23-5234"
      },
      {
        "clusterId": "cl-15",
        "memberIds": [
          "raw-24-4726"
        ],
        "centroidScene": "Train-station style departure board listing \"Phone caller #47\" boarding; column \"Website visitor\" stuck on \"Delayed indefinitely\".",
        "representativeId": "raw-24-4726"
      },
      {
        "clusterId": "cl-16",
        "memberIds": [
          "raw-27-4001"
        ],
        "centroidScene": "Time-lapse: sun arc over website-led service business yard; shadow of unanswered chat window grows across empty dispatch desk.",
        "representativeId": "raw-27-4001"
      },
      {
        "clusterId": "cl-17",
        "memberIds": [
          "raw-28-8944"
        ],
        "centroidScene": "Customer knocks on rolling bay door; no answer; peers through crack at idle tablets; types on phone into competitor booking link.",
        "representativeId": "raw-28-8944"
      },
      {
        "clusterId": "cl-18",
        "memberIds": [
          "raw-38-271"
        ],
        "centroidScene": "Parade float of giant phone passes shop; crowd cheers; shop window reflection shows empty chat overlay on glass.",
        "representativeId": "raw-38-271"
      },
      {
        "clusterId": "cl-19",
        "memberIds": [
          "raw-44-7287"
        ],
        "centroidScene": "Tire tracks in mud leading to website-led service business; parallel browser history shows competitor thank-you page on same phone.",
        "representativeId": "raw-44-7287"
      },
      {
        "clusterId": "cl-20",
        "memberIds": [
          "raw-45-3314"
        ],
        "centroidScene": "Barber pole spins next door; barber chats with waiting client; website-led service business queue stares at dead website kiosk.",
        "representativeId": "raw-45-3314"
      },
      {
        "clusterId": "cl-21",
        "memberIds": [
          "raw-8-5539"
        ],
        "centroidScene": "Close on a customer's sweaty hands sending an urgent website-led service business question; the business reply thread shows \"seen\" with no answer; crew visible through window on trucks.",
        "representativeId": "raw-8-5539"
      },
      {
        "clusterId": "cl-22",
        "memberIds": [
          "raw-10-1712"
        ],
        "centroidScene": "Ice cubes melting on a website-led service business truck hood in sun; timer implied; inside the cab, missed-call counter ticks up on a dash mount.",
        "representativeId": "raw-10-1712"
      },
      {
        "clusterId": "cl-23",
        "memberIds": [
          "raw-15-5555"
        ],
        "centroidScene": "Thermometer on a shop window cracks past red; inside, staff high-five for \"busy day\"; outside, visitor refreshes contact page endlessly.",
        "representativeId": "raw-15-5555"
      },
      {
        "clusterId": "cl-24",
        "memberIds": [
          "raw-18-3793"
        ],
        "centroidScene": "Inflatable tube-man waving outside website-led service business shop; real customers walk past it into rival parking lot.",
        "representativeId": "raw-18-3793"
      },
      {
        "clusterId": "cl-25",
        "memberIds": [
          "raw-39-4568"
        ],
        "centroidScene": "Hail bounces off website-led service business sign; technician under awning answers hail damage call; website \"emergency\" form untouched in split screen.",
        "representativeId": "raw-39-4568"
      },
      {
        "clusterId": "cl-26",
        "memberIds": [
          "raw-41-9642"
        ],
        "centroidScene": "Parking meter expires on customer car outside website-led service business; they leave ticket on windshield and drive to rival lot.",
        "representativeId": "raw-41-9642"
      },
      {
        "clusterId": "cl-27",
        "memberIds": [
          "raw-11-2571"
        ],
        "centroidScene": "A customer tries three doors of a website-led service business building — all locked for field crews — then sits on the curb typing into the business website.",
        "representativeId": "raw-11-2571"
      },
      {
        "clusterId": "cl-28",
        "memberIds": [
          "raw-29-8011"
        ],
        "centroidScene": "Two clocks side by side: wall clock for shop hours; digital timer for \"avg website reply\" spinning into hours.",
        "representativeId": "raw-29-8011"
      },
      {
        "clusterId": "cl-29",
        "memberIds": [
          "raw-35-3942"
        ],
        "centroidScene": "Customer tries voice-to-text question in car AC; sends; steering wheel grip tightens as \"delivered\" sits with no reply.",
        "representativeId": "raw-35-3942"
      },
      {
        "clusterId": "cl-30",
        "memberIds": [
          "raw-40-2474"
        ],
        "centroidScene": "Kid's science fair volcano erupts foam; parent texts website-led service business for cleanup; message sits next to kid's blue ribbon.",
        "representativeId": "raw-40-2474"
      },
      {
        "clusterId": "cl-31",
        "memberIds": [
          "raw-6-843"
        ],
        "centroidScene": "Residential street in heat: multiple website-led service business vans parked; neighbors point at phones; one homeowner closes a laptop after no reply on the business site.",
        "representativeId": "raw-6-843"
      },
      {
        "clusterId": "cl-32",
        "memberIds": [
          "raw-17-1896"
        ],
        "centroidScene": "Night shot: website-led service business yard empty; security light on; laptop left on counter shows 14 unanswered chats glowing.",
        "representativeId": "raw-17-1896"
      },
      {
        "clusterId": "cl-33",
        "memberIds": [
          "raw-19-5623"
        ],
        "centroidScene": "Technician on roof in heat; phone vibrates in tool belt unanswered; ground-level tablet shows visitor asking \"anyone on site?\"",
        "representativeId": "raw-19-5623"
      },
      {
        "clusterId": "cl-34",
        "memberIds": [
          "raw-30-950"
        ],
        "centroidScene": "Volunteer fire siren in small town; everyone looks; cut to silent website notification badge maxed out with no staff.",
        "representativeId": "raw-30-950"
      },
      {
        "clusterId": "cl-35",
        "memberIds": [
          "raw-37-8934"
        ],
        "centroidScene": "Solar panels on website-led service business roof; inverter hum; inside, power strip of dead chargers and one live chat cable unplugged.",
        "representativeId": "raw-37-8934"
      },
      {
        "clusterId": "cl-36",
        "memberIds": [
          "raw-14-1861"
        ],
        "centroidScene": "Radio dispatch voiceover chaos; dispatcher puts caller on hold; website visitor bubble pops \"still here?\" with no agent.",
        "representativeId": "raw-14-1861"
      },
      {
        "clusterId": "cl-37",
        "memberIds": [
          "raw-21-7253"
        ],
        "centroidScene": "Graffiti-style chalk on sidewalk: \"CALL US\" with arrow to website-led service business; chalk washed away by sprinkler; QR code to site smudged unreadable.",
        "representativeId": "raw-21-7253"
      },
      {
        "clusterId": "cl-38",
        "memberIds": [
          "raw-22-2255"
        ],
        "centroidScene": "Power flicker during after-hours silence; phones reboot; website chat keeps replying on UPS battery glow.",
        "representativeId": "raw-22-2255"
      },
      {
        "clusterId": "cl-39",
        "memberIds": [
          "raw-25-6835"
        ],
        "centroidScene": "Flash flood of sticky notes on a website-led service business door: \"call back\"; camera pulls back to reveal zero notes for web chats on a kiosk.",
        "representativeId": "raw-25-6835"
      },
      {
        "clusterId": "cl-40",
        "memberIds": [
          "raw-32-5275"
        ],
        "centroidScene": "Lost cat poster on pole next to website-led service business flyer; someone calls number on cat poster immediately; website number on flyer faded.",
        "representativeId": "raw-32-5275"
      },
      {
        "clusterId": "cl-41",
        "memberIds": [
          "raw-33-5919"
        ],
        "centroidScene": "Drone shot: website-led service business trucks radiating from hub; single pixel ping on map for abandoned web session far from routes.",
        "representativeId": "raw-33-5919"
      },
      {
        "clusterId": "cl-42",
        "memberIds": [
          "raw-34-5712"
        ],
        "centroidScene": "Break room pizza celebration for \"record calls\"; wall TV shows website bounce rate climbing in red.",
        "representativeId": "raw-34-5712"
      },
      {
        "clusterId": "cl-43",
        "memberIds": [
          "raw-36-8601"
        ],
        "centroidScene": "Janitor mops around ringing desk phone; steps over tablet showing visitor \"hello?\" for minutes.",
        "representativeId": "raw-36-8601"
      },
      {
        "clusterId": "cl-44",
        "memberIds": [
          "raw-42-7650"
        ],
        "centroidScene": "Beehive buzzing near website-led service business sign; customers swerve away; online chat asks about \"stinging smell from unit\" — no answer.",
        "representativeId": "raw-42-7650"
      },
      {
        "clusterId": "cl-45",
        "memberIds": [
          "raw-43-3345"
        ],
        "centroidScene": "Flashlight tour of dark website-led service business showroom after hours; beam lands on glowing chat requests like eyes in dark.",
        "representativeId": "raw-43-3345"
      }
    ],
    "survivors": [
      {
        "id": "raw-31-8156",
        "tags": [
          "fan",
          "queue",
          "refresh"
        ],
        "scene": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone.",
        "rejected": false,
        "clusterId": "cl-1",
        "rejectReason": null,
        "scrollStopCue": "Heat relief outside, none online",
        "stopScrollScore": 8.5,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-9-7988",
        "tags": [
          "queue",
          "storefront",
          "wrap"
        ],
        "scene": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet.",
        "rejected": false,
        "clusterId": "cl-2",
        "rejectReason": null,
        "scrollStopCue": "Real queue outside, ghost queue online",
        "stopScrollScore": 8.5,
        "visualDistinctScore": 6.5
      },
      {
        "id": "raw-3-994",
        "tags": [
          "exaggeration",
          "van",
          "heat",
          "pile"
        ],
        "scene": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.",
        "rejected": false,
        "clusterId": "cl-3",
        "rejectReason": null,
        "scrollStopCue": "Lost work as a physical mountain",
        "stopScrollScore": 7.5,
        "visualDistinctScore": 8
      },
      {
        "id": "raw-4-2739",
        "tags": [
          "consequence",
          "competitor",
          "driveway"
        ],
        "scene": "Split-second: a rival service van already in the customer's driveway; clipboard signed; your website-led service business phone lights unanswered on a bench; website chat idle.",
        "rejected": false,
        "clusterId": "cl-4",
        "rejectReason": null,
        "scrollStopCue": "Competitor wins before you pick up",
        "stopScrollScore": 7.5,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-7-2523",
        "tags": [
          "comparison",
          "AC",
          "heat"
        ],
        "scene": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside.",
        "rejected": false,
        "clusterId": "cl-5",
        "rejectReason": null,
        "scrollStopCue": "Wasted cool air = wasted web traffic",
        "stopScrollScore": 7.5,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-26-4396",
        "tags": [
          "mascot",
          "parking",
          "fake"
        ],
        "scene": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
        "rejected": false,
        "clusterId": "cl-6",
        "rejectReason": null,
        "scrollStopCue": "Mascot suffers, fake typing online",
        "stopScrollScore": 7.5,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-1-4511",
        "tags": [
          "conflict",
          "counter",
          "heat",
          "website-led service business"
        ],
        "scene": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door.",
        "rejected": false,
        "clusterId": "cl-7",
        "rejectReason": null,
        "scrollStopCue": "Public fight while demand walks out",
        "stopScrollScore": 7.5,
        "visualDistinctScore": 7
      },
      {
        "id": "raw-2-8339",
        "tags": [
          "absurd",
          "queue",
          "lobby"
        ],
        "scene": "A ridiculous boarding-ticket dispenser for phone callers in a website-led service business lobby during after-hours silence; numbered paper slips; an open chat widget on a counter tablet glows with zero replies.",
        "rejected": false,
        "clusterId": "cl-8",
        "rejectReason": null,
        "scrollStopCue": "Airport logic applied to the wrong queue",
        "stopScrollScore": 7,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-5-2245",
        "tags": [
          "role_reversal",
          "empty",
          "chat"
        ],
        "scene": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.",
        "rejected": false,
        "clusterId": "cl-9",
        "rejectReason": null,
        "scrollStopCue": "Nobody home except the chat",
        "stopScrollScore": 7,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-12-1939",
        "tags": [
          "warehouse",
          "emergency",
          "parallel"
        ],
        "scene": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence.",
        "rejected": false,
        "clusterId": "cl-10",
        "rejectReason": null,
        "scrollStopCue": "Stockout metaphor for answers",
        "stopScrollScore": 7,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-13-3915",
        "tags": [
          "humor",
          "street",
          "comparison"
        ],
        "scene": "Kids selling lemonade next to a website-led service business van; parent jokes \"they answer faster than your website\"; technician laughs then freezes.",
        "rejected": false,
        "clusterId": "cl-11",
        "rejectReason": null,
        "scrollStopCue": "Lemonade stand beats your chat",
        "stopScrollScore": 7,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-16-3883",
        "tags": [
          "dog",
          "porch",
          "competitor"
        ],
        "scene": "Dog barking at a website-led service business truck leaving; owner on porch scrolls competitor site and books instantly.",
        "rejected": false,
        "clusterId": "cl-12",
        "rejectReason": null,
        "scrollStopCue": "Pet notices you left; customer books rival",
        "stopScrollScore": 7,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-20-6775",
        "tags": [
          "fish",
          "waiting",
          "absurd"
        ],
        "scene": "Waiting room fish tank; one fish labeled \"website leads\"; bowl nearly empty while phone fish overcrowded.",
        "rejected": false,
        "clusterId": "cl-13",
        "rejectReason": null,
        "scrollStopCue": "Absurd aquarium staffing metaphor",
        "stopScrollScore": 7,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-23-5234",
        "tags": [
          "thermostat",
          "honk",
          "tab"
        ],
        "scene": "Customer holds broken thermostat in one hand, phone in other; competitor van honks; website tab still on \"message sent\".",
        "rejected": false,
        "clusterId": "cl-14",
        "rejectReason": null,
        "scrollStopCue": "Two hands, zero answers",
        "stopScrollScore": 7,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-24-4726",
        "tags": [
          "departure",
          "board",
          "delay"
        ],
        "scene": "Train-station style departure board listing \"Phone caller #47\" boarding; column \"Website visitor\" stuck on \"Delayed indefinitely\".",
        "rejected": false,
        "clusterId": "cl-15",
        "rejectReason": null,
        "scrollStopCue": "Departure board for the wrong channel",
        "stopScrollScore": 7,
        "visualDistinctScore": 7.5
      },
      {
        "id": "raw-27-4001",
        "tags": [
          "timelapse",
          "shadow",
          "dispatch"
        ],
        "scene": "Time-lapse: sun arc over website-led service business yard; shadow of unanswered chat window grows across empty dispatch desk.",
        "rejected": false,
        "clusterId": "cl-16",
        "rejectReason": null,
        "scrollStopCue": "Shadow of silence all day",
        "stopScrollScore": 7,
        "visualDistinctScore": 7.5
      }
    ],
    "rawGeneratedCount": 45,
    "candidateSourceIds": [
      "raw-31-8156",
      "raw-9-7988",
      "raw-3-994",
      "raw-7-2523",
      "raw-26-4396",
      "raw-1-4511",
      "raw-5-2245",
      "raw-12-1939"
    ],
    "rawAfterFilterCount": 45,
    "rejectedGenericSamples": []
  },
  "generatedCandidates": [
    {
      "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
      "family": "direct_product_world",
      "coreIdea": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone.",
      "hookLine": "Heat relief outside, none online.",
      "candidateId": "c1-direct_product_world-div",
      "visualPromise": "Film the opening as a scroll-stop frame: Heat relief outside, none online. No generic office/laptop montage.",
      "familiarityRisk": "medium",
      "openingSituation": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone.",
      "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
      "emotionalReaction": "curiosity",
      "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
      "memorabilityReason": "Selected from divergence v2 for scroll-stop: Heat relief outside, none online",
      "expectedViewerQuestion": "What happens to the person in: Heat relief outside, none online?"
    },
    {
      "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
      "family": "consequence_first",
      "coreIdea": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet.",
      "hookLine": "Real queue outside, ghost queue online.",
      "candidateId": "c2-consequence_first-div",
      "visualPromise": "Film the opening as a scroll-stop frame: Real queue outside, ghost queue online. No generic office/laptop montage.",
      "familiarityRisk": "medium",
      "openingSituation": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet.",
      "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
      "emotionalReaction": "curiosity",
      "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
      "memorabilityReason": "Selected from divergence v2 for scroll-stop: Real queue outside, ghost queue online",
      "expectedViewerQuestion": "What happens to the person in: Real queue outside, ghost queue online?"
    },
    {
      "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
      "family": "visual_exaggeration",
      "coreIdea": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.",
      "hookLine": "Lost work as a physical mountain.",
      "candidateId": "c3-visual_exaggeration-div",
      "visualPromise": "Film the opening as a scroll-stop frame: Lost work as a physical mountain. No generic office/laptop montage.",
      "familiarityRisk": "medium",
      "openingSituation": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.",
      "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
      "emotionalReaction": "tension",
      "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
      "memorabilityReason": "Selected from divergence v2 for scroll-stop: Lost work as a physical mountain",
      "expectedViewerQuestion": "What happens to the person in: Lost work as a physical mountain?"
    },
    {
      "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
      "family": "unexpected_comparison",
      "coreIdea": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside.",
      "hookLine": "Wasted cool air = wasted web traffic.",
      "candidateId": "c4-unexpected_comparison-div",
      "visualPromise": "Film the opening as a scroll-stop frame: Wasted cool air = wasted web traffic. No generic office/laptop montage.",
      "familiarityRisk": "medium",
      "openingSituation": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside.",
      "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
      "emotionalReaction": "tension",
      "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
      "memorabilityReason": "Selected from divergence v2 for scroll-stop: Wasted cool air = wasted web traffic",
      "expectedViewerQuestion": "What happens to the person in: Wasted cool air = wasted web traffic?"
    },
    {
      "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
      "family": "absurd_understandable",
      "coreIdea": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
      "hookLine": "Mascot suffers, fake typing online.",
      "candidateId": "c5-absurd_understandable-div",
      "visualPromise": "Film the opening as a scroll-stop frame: Mascot suffers, fake typing online. No generic office/laptop montage.",
      "familiarityRisk": "low",
      "openingSituation": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
      "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
      "emotionalReaction": "amused recognition",
      "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
      "memorabilityReason": "Selected from divergence v2 for scroll-stop: Mascot suffers, fake typing online",
      "expectedViewerQuestion": "What happens to the person in: Mascot suffers, fake typing online?"
    },
    {
      "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
      "family": "human_conflict",
      "coreIdea": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door.",
      "hookLine": "Public fight while demand walks out.",
      "candidateId": "c6-human_conflict-div",
      "visualPromise": "Film the opening as a scroll-stop frame: Public fight while demand walks out. No generic office/laptop montage.",
      "familiarityRisk": "medium",
      "openingSituation": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door.",
      "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
      "emotionalReaction": "tension",
      "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
      "memorabilityReason": "Selected from divergence v2 for scroll-stop: Public fight while demand walks out",
      "expectedViewerQuestion": "What happens to the person in: Public fight while demand walks out?"
    },
    {
      "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
      "family": "role_reversal",
      "coreIdea": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.",
      "hookLine": "Nobody home except the chat.",
      "candidateId": "c7-role_reversal-div",
      "visualPromise": "Film the opening as a scroll-stop frame: Nobody home except the chat. No generic office/laptop montage.",
      "familiarityRisk": "medium",
      "openingSituation": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.",
      "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
      "emotionalReaction": "unease",
      "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
      "memorabilityReason": "Selected from divergence v2 for scroll-stop: Nobody home except the chat",
      "expectedViewerQuestion": "What happens to the person in: Nobody home except the chat?"
    },
    {
      "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
      "family": "role_reversal",
      "coreIdea": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence.",
      "hookLine": "Stockout metaphor for answers.",
      "candidateId": "c8-role_reversal-div",
      "visualPromise": "Film the opening as a scroll-stop frame: Stockout metaphor for answers. No generic office/laptop montage.",
      "familiarityRisk": "medium",
      "openingSituation": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence.",
      "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
      "emotionalReaction": "curiosity",
      "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
      "memorabilityReason": "Selected from divergence v2 for scroll-stop: Stockout metaphor for answers",
      "expectedViewerQuestion": "What happens to the person in: Stockout metaphor for answers?"
    }
  ],
  "candidateScores": [
    {
      "family": "direct_product_world",
      "scores": {
        "stopPower": 6,
        "originality": 5,
        "memorability": 3,
        "storyPotential": 5,
        "AI_Generic_Risk": 6,
        "emotionalCharge": 5,
        "productRelevance": 7,
        "visualSpecificity": 7,
        "productionFeasibility": 8,
        "immediateComprehension": 7
      },
      "coreIdea": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone.",
      "hookLine": "Heat relief outside, none online.",
      "rejected": false,
      "candidateId": "c1-direct_product_world-div",
      "rejectReasons": [],
      "weightedTotal": 74.7,
      "openingSituation": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone."
    },
    {
      "family": "consequence_first",
      "scores": {
        "stopPower": 8,
        "originality": 5,
        "memorability": 3,
        "storyPotential": 6,
        "AI_Generic_Risk": 6,
        "emotionalCharge": 6,
        "productRelevance": 4,
        "visualSpecificity": 5,
        "productionFeasibility": 8,
        "immediateComprehension": 5
      },
      "coreIdea": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet.",
      "hookLine": "Real queue outside, ghost queue online.",
      "rejected": true,
      "candidateId": "c2-consequence_first-div",
      "rejectReasons": [
        "topic_collapsed_to_generic_business"
      ],
      "weightedTotal": 69.5,
      "openingSituation": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet."
    },
    {
      "family": "visual_exaggeration",
      "scores": {
        "stopPower": 8,
        "originality": 5,
        "memorability": 5,
        "storyPotential": 5,
        "AI_Generic_Risk": 6,
        "emotionalCharge": 5,
        "productRelevance": 4,
        "visualSpecificity": 8,
        "productionFeasibility": 7,
        "immediateComprehension": 5
      },
      "coreIdea": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.",
      "hookLine": "Lost work as a physical mountain.",
      "rejected": false,
      "candidateId": "c3-visual_exaggeration-div",
      "rejectReasons": [],
      "weightedTotal": 75.55,
      "openingSituation": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck."
    },
    {
      "family": "unexpected_comparison",
      "scores": {
        "stopPower": 7,
        "originality": 7,
        "memorability": 5,
        "storyPotential": 5,
        "AI_Generic_Risk": 6,
        "emotionalCharge": 5,
        "productRelevance": 4,
        "visualSpecificity": 6,
        "productionFeasibility": 8,
        "immediateComprehension": 5
      },
      "coreIdea": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside.",
      "hookLine": "Wasted cool air = wasted web traffic.",
      "rejected": false,
      "candidateId": "c4-unexpected_comparison-div",
      "rejectReasons": [],
      "weightedTotal": 73.5,
      "openingSituation": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside."
    },
    {
      "family": "absurd_understandable",
      "scores": {
        "stopPower": 8,
        "originality": 8,
        "memorability": 5,
        "storyPotential": 5,
        "AI_Generic_Risk": 5,
        "emotionalCharge": 5,
        "productRelevance": 4,
        "visualSpecificity": 6,
        "productionFeasibility": 8,
        "immediateComprehension": 5
      },
      "coreIdea": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
      "hookLine": "Mascot suffers, fake typing online.",
      "rejected": false,
      "candidateId": "c5-absurd_understandable-div",
      "rejectReasons": [],
      "weightedTotal": 80,
      "openingSituation": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent."
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
      "coreIdea": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door.",
      "hookLine": "Public fight while demand walks out.",
      "rejected": true,
      "candidateId": "c6-human_conflict-div",
      "rejectReasons": [
        "topic_collapsed_to_generic_business"
      ],
      "weightedTotal": 68.85000000000001,
      "openingSituation": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door."
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
      "coreIdea": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.",
      "hookLine": "Nobody home except the chat.",
      "rejected": true,
      "candidateId": "c7-role_reversal-div",
      "rejectReasons": [
        "topic_collapsed_to_generic_business"
      ],
      "weightedTotal": 69.3,
      "openingSituation": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned."
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
      "coreIdea": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence.",
      "hookLine": "Stockout metaphor for answers.",
      "rejected": true,
      "candidateId": "c8-role_reversal-div",
      "rejectReasons": [
        "topic_collapsed_to_generic_business"
      ],
      "weightedTotal": 69.3,
      "openingSituation": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence."
    }
  ],
  "rejectedCandidates": [
    {
      "reasons": [
        "topic_collapsed_to_generic_business"
      ],
      "candidateId": "c2-consequence_first-div"
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
      "candidateId": "c7-role_reversal-div"
    },
    {
      "reasons": [
        "topic_collapsed_to_generic_business"
      ],
      "candidateId": "c8-role_reversal-div"
    }
  ],
  "selectedCandidate": {
    "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
    "family": "absurd_understandable",
    "coreIdea": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
    "hookLine": "Mascot suffers, fake typing online.",
    "candidateId": "c5-absurd_understandable-div",
    "visualPromise": "Film the opening as a scroll-stop frame: Mascot suffers, fake typing online. No generic office/laptop montage.",
    "familiarityRisk": "low",
    "openingSituation": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
    "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
    "emotionalReaction": "amused recognition",
    "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
    "memorabilityReason": "Selected from divergence v2 for scroll-stop: Mascot suffers, fake typing online",
    "expectedViewerQuestion": "What happens to the person in: Mascot suffers, fake typing online?"
  },
  "comparativeJudge": {
    "winnerId": "c5-absurd_understandable-div",
    "winnerReason": "weighted_total=80.0; comparative_votes=3; stop=8; comprehension=5; memorability=5; product=4; family=absurd_understandable; core=Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with n",
    "bestProductTopicFit": "c1-direct_product_world-div",
    "clearestMentalImage": "c3-visual_exaggeration-div",
    "leastInterchangeable": "c5-absurd_understandable-div",
    "mostMemorableInOneHour": "c5-absurd_understandable-div",
    "mostLikelyToStopScrolling": "c5-absurd_understandable-div"
  },
  "finalScriptFidelity": {
    "passed": true,
    "failureReasons": [],
    "coreIdeaRecognizable": true,
    "productOrTopicImplied": true,
    "voiceoverEssayCadence": false,
    "collapsedToGenericOffice": false,
    "hookPreservedInFirstSpoken": true,
    "openingSituationVisibleInScene1": true
  },
  "finalStoryboardFidelity": {
    "passed": true,
    "failureReasons": [],
    "coreIdeaRecognizable": true,
    "productOrTopicImplied": true,
    "voiceoverEssayCadence": false,
    "collapsedToGenericOffice": false,
    "hookPreservedInFirstSpoken": true,
    "openingSituationVisibleInScene1": true
  },
  "regenerationReason": null
}
```

## Použitý AI model
Žádný (deterministický kód — žádné LLM volání)

## Použitý prompt (celý)
```
Není součástí pipeline jako LLM prompt. Injektovaný prompt blok do Content Package LLM (REKONSTRUKCE Z PERSISTOVANÉHO WINNERA):

CREATIVE CANDIDATE SELECTION (creative-candidates@2.1):
Raw visual situations were clustered for scroll-stop (Creative Divergence v2); a winner was selected from 8 complete concepts. You MUST execute THIS winner —
do not invent a safer B2B montage, do not reinterpret into phones/laptops/offices unless the winner requires it.

Winner id: c5-absurd_understandable-div (absurd_understandable)
Why it won: weighted_total=80.0; comparative_votes=3; stop=8; comprehension=5; memorability=5; product=4; family=absurd_understandable; core=Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with n

coreIdea: Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.
emotionalReaction: amused recognition
hookLine (MUST be the stored hook AND the first spoken line): Mascot suffers, fake typing online.
openingSituation (MUST be visual_scenes[0] / first image_prompt): Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.
visualPromise: Film the opening as a scroll-stop frame: Mascot suffers, fake typing online. No generic office/laptop montage.
storyProgression: Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.
productConnection: AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.
ending: Next website visitor who needed an answer gets an answer while the crew stays in the field.
expectedViewerQuestion: What happens to the person in: Mascot suffers, fake typing online?
memorabilityReason: Selected from divergence v2 for scroll-stop: Mascot suffers, fake typing online

Hard rules:
- First spoken line creates tension, contradiction, curiosity, surprise, consequence, or emotional recognition.
- Forbidden openers: Let's be honest / Most businesses / In today's world / generic belief essays.
- Keep topic-specific concrete signals from the winner (do not collapse to 'businesses are busy').
- Downstream beats follow storyProgression; product enters via productConnection; close via ending.
- Attention / Visual Narrative / Identity control LOOK and MECHANISM — they must AMPLIFY this winner, not replace it.
```

## Odpověď modelu (celá)
```
Není LLM odpověď. Výstup = celý objekt creative_candidates výše.
```

---
# 4. Content Package (hlavní LLM generace)

## Název kroku
generateValidatedJson → Claude (hook + VO + storyboard + scenes + image_prompts + platform_outputs + subtitles + … v jednom JSON)

## Vstup
```json
{
  "topic": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
  "angle": "Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not.",
  "funnel_stage": "problem_aware",
  "platform": "tiktok",
  "format": "reel",
  "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
  "package_index": 0,
  "injected_plan_keys_in_presentation_generation": [
    "mode",
    "attention",
    "tts_voice",
    "package_id",
    "project_id",
    "cta_selected",
    "voice_scores",
    "voice_source",
    "visual_medium",
    "voice_reasons",
    "product_reveal",
    "selected_voice",
    "visual_profile",
    "delivery_reason",
    "downgrade_rules",
    "tts_instructions",
    "visual_narrative",
    "creative_identity",
    "history_decisions",
    "visual_beat_count",
    "accepted_cta_count",
    "cta_composition_id",
    "creative_candidates",
    "cta_decision_reason",
    "frequency_decisions",
    "requested_cta_count",
    "accepted_phone_count",
    "accepted_quote_count",
    "cta_renderer_version",
    "downgraded_cta_count",
    "visual_medium_scores",
    "visual_medium_source",
    "requested_phone_count",
    "requested_quote_count",
    "visual_medium_reasons",
    "visual_medium_version",
    "visual_profile_scores",
    "visual_profile_source",
    "downgraded_phone_count",
    "downgraded_quote_count",
    "phone_renderer_version",
    "quote_renderer_version",
    "resolved_primary_voice",
    "sparse_plan_adjustment",
    "visual_profile_reasons",
    "visual_profile_version",
    "accepted_checklist_count",
    "accepted_statistic_count",
    "final_worker_scene_types",
    "resolved_secondary_voice",
    "target_visual_beat_count",
    "creative_identity_version",
    "prompt_presentation_types",
    "requested_checklist_count",
    "requested_statistic_count",
    "series_context_considered",
    "checklist_allowlist_status",
    "checklist_renderer_version",
    "downgraded_checklist_count",
    "downgraded_statistic_count",
    "scene_type_diversity_notes",
    "statistic_renderer_version",
    "recent_creative_fingerprints"
  ],
  "note": "Jeden Claude call generuje celý content package JSON; hook/storyboard/VO/scenes/image prompts/captions nejsou oddělená AI volání."
}
```

## Výstup
```json
{
  "package_brief_without_presentation_generation": {
    "hook": "Mascot suffers, fake typing online.",
    "voiceover_text": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
    "scenario": "An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.",
    "cta": {
      "text": "Create your AI assistant — let your website answer while you're gone.",
      "type": "sign_up"
    },
    "hashtags": [
      "#smallbusiness",
      "#leadgeneration",
      "#aichatbot",
      "#websitetips",
      "#businessgrowth",
      "#customersupport",
      "#servicebusiness",
      "#digitalmarketing"
    ],
    "video": {
      "script": "BEAT 1 — UNEXPECTED FACT (0–4s): Wide shot, bright co-working daylight. A person in a full mascot costume — oversized head, full suit — stands just outside a glass door waving at nobody in particular. Inside, visible through the glass, a laptop screen shows a chat widget with a blinking 'typing...' indicator that never resolves. First spoken line lands immediately: 'Mascot suffers, fake typing online.' Clipped, alert delivery. SFX: one short click accent at ~335ms.\n\nBEAT 2 — IMPLICATION (5–13s): Cut inside the bright co-working space. A single person, partial body, sits back down at a desk after being away — a carry-on bag still visible in the background. They scroll through a website analytics view on a laptop (screen faces viewer, no readable text, just visible scroll behavior and a face registering quiet dread). Voiceover: 'An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero.' Conversational, varied rhythm.\n\nBEAT 3 — PROOF / REVEAL (14–20s): Wide environmental frame of the same co-working space, now quieter. The person sits alone, the laptop open, foreground plant framing the left edge. The screen glows with an interface suggesting unanswered sessions (no readable text). Voiceover: 'Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.' Slight lift on 'every single night.' Brief pause before the payoff line.\n\nBEAT 4 — CTA (21–25s): Same warm neutral world, same person, now leaning back with a small exhale — the quiet tension of recognition. Voiceover: 'Create your AI assistant — let your website answer while you're gone.' Confident, not aggressive. Satisfying landing.",
      "concept": "Open on an absurd, immediately readable scene: a person in a full mascot costume — sweating, wilting — waving enthusiastically at passing cars in a sun-baked parking lot, while inside the office a chat widget blinks a 'typing...' indicator that never sends a message. The absurdity lands the provocative opinion fast: all the effort is outside, but the website is performing nothing. The video then cuts to the gut-punch moment — an accountant sitting back down at their desk after two weeks away, scrolling through analytics showing dozens of visits and zero form submissions. The final beat reframes the pain: your website is never truly closed — it's always open, always receiving visitors, and always silently sending them away. The close is a quiet, confident invitation to fix the permanent leak.",
      "duration_seconds": "25"
    },
    "subtitles": "Mascot suffers, fake typing online. | I used to think 'be right back' was a business strategy. | An accountant came back from vacation — dozens of visits. Zero leads. | The site just sat there, silent. | Your website isn't offline when you're away. | It's open. And it's turning people away — every single night.",
    "image_prompts": [
      "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image.",
      "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image.",
      "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image.",
      "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
    ],
    "visual_scenes": [
      {
        "source": "ai",
        "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image."
      },
      {
        "source": "ai",
        "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image."
      },
      {
        "source": "ai",
        "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image."
      },
      {
        "source": "ai",
        "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
      }
    ],
    "platform_outputs": {
      "x": {
        "cta": "Fix the default at fenrik.chat",
        "format": "Post (X / Twitter)",
        "caption": "Your website is open right now. It just isn't answering anyone. An accountant came back from vacation to dozens of visits and zero leads. The site had nothing to say. That's not bad luck. That's the default.",
        "hashtags": [
          "#smallbusiness",
          "#leadgeneration"
        ],
        "title_variants": [
          "Your website is open 24/7. It just isn't answering.",
          "Two weeks off. Dozens of visits. Zero leads.",
          "The contact form isn't a support channel. It's a polite rejection.",
          "Being offline isn't a gap. It's a permanent feature of your website.",
          "What your website does when you're not watching — and why it costs you."
        ],
        "caption_variants": [
          "Your website is open right now. It just isn't answering anyone. An accountant came back from vacation to dozens of visits and zero leads. The site had nothing to say. That's not bad luck. That's the default.",
          "Two weeks off. Dozens of website visits. Real questions from real prospects. Zero contact details left behind. Not because the leads weren't there — because the site offered nothing but a form nobody filled out. That's the quiet version of losing business.",
          "Hot take: a contact form is not customer support. It's a way of telling visitors to try again later. Most of them won't. Your website is open every night. The question is whether it's actually doing anything.",
          "Being offline isn't a temporary gap in your availability. It's a permanent feature of your website's behavior — every night, every weekend, every vacation. The visitors are there. The silence is yours.",
          "An accountant I know checked their analytics after two weeks away. Dozens of visits. Zero leads. The site had static text and a contact form. The visitors had questions. Nobody was home. That's not a vacation problem. That's the business model."
        ]
      },
      "tiktok": {
        "cta": "Check what your website does when you're not watching. Link in bio.",
        "format": "Vertical short (TikTok / Reels / Shorts)",
        "caption": "Mascot suffers outside. Fake typing inside. Nobody answers. That's basically most business websites right now — including yours when you're on vacation. An accountant came back from 2 weeks off to dozens of site visits. Zero leads. Zero contact details. The site just... sat there.",
        "hashtags": [
          "#smallbusiness",
          "#websitetips",
          "#leadgeneration",
          "#businessgrowth"
        ]
      },
      "youtube": {
        "cta": "Create your AI assistant at fenrik.chat — see it working before you sign up.",
        "format": "Vertical short (YouTube Shorts)",
        "caption": "An accountant returned from a two-week vacation to find dozens of website visits, real questions from real prospects — and zero contact details left behind. Not because the leads weren't there. Because the website had nothing to offer them. This video walks through the moment that gut-punch hits, and why being offline isn't a temporary gap — it's a permanent, invisible leak that drains your pipeline every single night, every weekend, and every time you step away. If your website is just static text and a contact form, this is what that silence actually costs you.",
        "hashtags": [
          "#smallbusiness",
          "#leadgeneration",
          "#aichatbot",
          "#websitetips",
          "#businessgrowth"
        ]
      },
      "linkedin": {
        "cta": "What does your website actually say to a visitor at 11 PM? Worth thinking about.",
        "format": "Text post (LinkedIn)",
        "caption": "An accountant I know returned from a two-week vacation and opened their analytics. Dozens of website visits. Real business owners, asking real questions about tax deadlines and filing services. Not one contact detail left behind. No form submissions. No callbacks requested. Just traffic that arrived, found silence, and left. This is not a vacation problem. It is a structural one. Most professional services websites are open 24 hours a day and available for approximately zero of them. The contact form is not a support channel. It is a polite way of telling visitors to come back later — and most of them never do.",
        "hashtags": [
          "#smallbusiness",
          "#leadgeneration",
          "#professionaldevelopment"
        ],
        "title_variants": [
          "The accountant who came back from vacation to a week of missed leads",
          "Your website is open 24 hours. It just isn't available for any of them."
        ],
        "caption_variants": [
          "An accountant I know returned from a two-week vacation and opened their analytics. Dozens of website visits. Real business owners, asking real questions about tax deadlines and filing services. Not one contact detail left behind. No form submissions. No callbacks requested. Just traffic that arrived, found silence, and left. This is not a vacation problem. It is a structural one. Most professional services websites are open 24 hours a day and available for approximately zero of them. The contact form is not a support channel. It is a polite way of telling visitors to come back later — and most of them never do.",
          "Here is a detail most business owners overlook: being offline is not a temporary gap in your availability. It is a permanent feature of your website's behavior. Every night, every weekend, every vacation — your site receives visitors, offers them static text, and watches them leave. An accountant discovered this the hard way after two weeks away: dozens of visits, zero leads, zero contact details. The visitors were there. The opportunity was there. The website simply had nothing to say. If your site cannot answer a question at 11 PM, you are not losing leads occasionally. You are losing them on a schedule."
        ]
      },
      "instagram": {
        "cta": "Ready to fix the leak? Create your AI assistant — link in bio.",
        "format": "Vertical short (TikTok / Reels / Shorts)",
        "caption": "Here's the part nobody talks about: your website doesn't go offline when you do. 🪑 An accountant I know came back from a two-week vacation to find dozens of real visitors — people with real questions — who left without a single contact detail. The site offered nothing but static text and a form nobody filled out. That's not a vacation problem. That's a permanent, invisible leak that happens every night, every weekend, every time you step away. Your website is always open. The question is whether it's actually answering anyone.",
        "hashtags": [
          "#smallbusiness",
          "#websitetips",
          "#leadgeneration",
          "#aichatbot",
          "#businessgrowth",
          "#servicebusiness",
          "#onlinemarketing",
          "#customersupport",
          "#entrepreneurlife",
          "#digitalmarketing"
        ]
      }
    },
    "asset_usage": []
  },
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
        "first_spoken_guidance": "Open with an immediate reaction using Provocative Opinion — not context or setup. The first spoken thought should land in ~1.0–1.8 seconds (one short phrase, or two very short phrases). The stored hook MUST be the same thought as the first spoken line — do not dilute a strong hook into a weaker voiceover setup. State the opinion in the first short phrase. Attack the idea, never a person. Narrative seed: Unexpected but relevant: State the opinion in the first short phrase. Attack the idea, never a person. Keep the link to Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not. / Unable to answer customer questions when offline clear by the next beat.",
        "first_visual_guidance": "The first visual is an attention event, not a sentence illustration. Image that dramatizes the contested habit or its consequence. Preferred opening visual concept: A megaphone pointed at an empty room — volume without substance about Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not. Do not default to calm desks, empty boards, laptop+coffee, or faceless screen-staring unless that is genuinely the strongest idea. Render coherently via Visual Narrative / Medium / Profile / Identity — attention chooses the idea, those systems choose the look.",
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
            "visual_concept": "A modern office desk with laptop and coffee illustrating Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not."
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
            "visual_concept": "A bold handwritten sign being taped over a polished corporate slogan about Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not."
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
            "visual_concept": "A megaphone pointed at an empty room — volume without substance about Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not."
          }
        ],
        "reject_summary": [
          "obvious:office_cliche:\\blaptop\\s+and\\s+coffee\\b",
          "obvious:first_obvious_idea",
          "obvious:visual_story:office_cliche_backslide"
        ],
        "selected_candidate_id": "unexpected",
        "selected_narrative_seed": "Unexpected but relevant: State the opinion in the first short phrase. Attack the idea, never a person. Keep the link to Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not. / Unable to answer customer questions when offline clear by the next beat.",
        "selected_visual_concept": "A megaphone pointed at an empty room — volume without substance about Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not.",
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
          "full_arc_not_opening_only"
        ],
        "version": "delivery-arc@1",
        "tts_instruction_fragment": "Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Vary emphasis; pause before the reveal or punchline. Do not read every line at the same energy. Confident, not aggressive."
      },
      "sfx_category": "click",
      "sfx_selected": true,
      "sfx_timing_ms": 335,
      "attention_source": "deterministic_v1",
      "attention_reasons": [
        "selected:PROVOCATIVE_OPINION",
        "source:deterministic_v1",
        "funnel_soft_affinity:problem_aware:2",
        "creative_mode_soft_affinity:shock:1",
        "topic_signals_opinion",
        "independent_of_funnel_mapping"
      ],
      "attention_version": "attention@1",
      "opening_structure": "bold_claim",
      "attention_mechanism": "PROVOCATIVE_OPINION",
      "opening_visual_motif": "megaphone_pointed_empty_room_volume_without",
      "sfx_render_supported": true,
      "opening_emotional_effect": "strong_opinion"
    },
    "tts_voice": "shimmer",
    "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
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
      "mode_shock→energy(+3)",
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
    "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: warm and approachable. Delivery: measured, credible. Language: en.",
    "downgrade_rules": [],
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: measured, credible. Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Vary empha",
    "visual_narrative": {
      "key": "human|body language that shows the relationship to the idea in one glance — not a device hero frame",
      "version": "visual-narrative@1.1",
      "subject_focus": "body language that shows the relationship to the idea in one glance — not a device hero frame",
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
        "phone": 1,
        "laptop": 7,
        "close_up": 6,
        "overhead": 1,
        "dashboard": 1,
        "prototype": 2,
        "person_alone": 4,
        "sticky_notes": 1,
        "product_asset": 4
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
      "key": "a bright co-working space in daylight|quiet tension before a decision|low-contrast, flat documentary lighting|wide environmental framing|layered depth with foreground and background|a single person, partial body, face not dominant|warm neutral color feel",
      "mood": "quiet tension before a decision",
      "camera": "wide environmental framing",
      "version": "creative-identity@1",
      "lighting": "low-contrast, flat documentary lighting",
      "color_feel": "warm neutral color feel",
      "option_ids": {
        "mood": "quietly_tense",
        "camera": "wide_environmental",
        "lighting": "low_contrast_flat",
        "color_feel": "warm_neutral",
        "composition": "layered_depth",
        "environment": "co_working_daylight",
        "human_presence": "single_partial"
      },
      "composition": "layered depth with foreground and background",
      "environment": "a bright co-working space in daylight",
      "human_presence": "a single person, partial body, face not dominant"
    },
    "history_decisions": [],
    "visual_beat_count": 4,
    "accepted_cta_count": 0,
    "cta_composition_id": null,
    "creative_candidates": {
      "version": "creative-candidates@2",
      "candidateScores": [
        {
          "family": "direct_product_world",
          "scores": {
            "stopPower": 6,
            "originality": 5,
            "memorability": 3,
            "storyPotential": 5,
            "AI_Generic_Risk": 6,
            "emotionalCharge": 5,
            "productRelevance": 7,
            "visualSpecificity": 7,
            "productionFeasibility": 8,
            "immediateComprehension": 7
          },
          "coreIdea": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone.",
          "hookLine": "Heat relief outside, none online.",
          "rejected": false,
          "candidateId": "c1-direct_product_world-div",
          "rejectReasons": [],
          "weightedTotal": 74.7,
          "openingSituation": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone."
        },
        {
          "family": "consequence_first",
          "scores": {
            "stopPower": 8,
            "originality": 5,
            "memorability": 3,
            "storyPotential": 6,
            "AI_Generic_Risk": 6,
            "emotionalCharge": 6,
            "productRelevance": 4,
            "visualSpecificity": 5,
            "productionFeasibility": 8,
            "immediateComprehension": 5
          },
          "coreIdea": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet.",
          "hookLine": "Real queue outside, ghost queue online.",
          "rejected": true,
          "candidateId": "c2-consequence_first-div",
          "rejectReasons": [
            "topic_collapsed_to_generic_business"
          ],
          "weightedTotal": 69.5,
          "openingSituation": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet."
        },
        {
          "family": "visual_exaggeration",
          "scores": {
            "stopPower": 8,
            "originality": 5,
            "memorability": 5,
            "storyPotential": 5,
            "AI_Generic_Risk": 6,
            "emotionalCharge": 5,
            "productRelevance": 4,
            "visualSpecificity": 8,
            "productionFeasibility": 7,
            "immediateComprehension": 5
          },
          "coreIdea": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.",
          "hookLine": "Lost work as a physical mountain.",
          "rejected": false,
          "candidateId": "c3-visual_exaggeration-div",
          "rejectReasons": [],
          "weightedTotal": 75.55,
          "openingSituation": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck."
        },
        {
          "family": "unexpected_comparison",
          "scores": {
            "stopPower": 7,
            "originality": 7,
            "memorability": 5,
            "storyPotential": 5,
            "AI_Generic_Risk": 6,
            "emotionalCharge": 5,
            "productRelevance": 4,
            "visualSpecificity": 6,
            "productionFeasibility": 8,
            "immediateComprehension": 5
          },
          "coreIdea": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside.",
          "hookLine": "Wasted cool air = wasted web traffic.",
          "rejected": false,
          "candidateId": "c4-unexpected_comparison-div",
          "rejectReasons": [],
          "weightedTotal": 73.5,
          "openingSituation": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside."
        },
        {
          "family": "absurd_understandable",
          "scores": {
            "stopPower": 8,
            "originality": 8,
            "memorability": 5,
            "storyPotential": 5,
            "AI_Generic_Risk": 5,
            "emotionalCharge": 5,
            "productRelevance": 4,
            "visualSpecificity": 6,
            "productionFeasibility": 8,
            "immediateComprehension": 5
          },
          "coreIdea": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
          "hookLine": "Mascot suffers, fake typing online.",
          "rejected": false,
          "candidateId": "c5-absurd_understandable-div",
          "rejectReasons": [],
          "weightedTotal": 80,
          "openingSituation": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent."
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
          "coreIdea": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door.",
          "hookLine": "Public fight while demand walks out.",
          "rejected": true,
          "candidateId": "c6-human_conflict-div",
          "rejectReasons": [
            "topic_collapsed_to_generic_business"
          ],
          "weightedTotal": 68.85000000000001,
          "openingSituation": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door."
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
          "coreIdea": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.",
          "hookLine": "Nobody home except the chat.",
          "rejected": true,
          "candidateId": "c7-role_reversal-div",
          "rejectReasons": [
            "topic_collapsed_to_generic_business"
          ],
          "weightedTotal": 69.3,
          "openingSituation": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned."
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
          "coreIdea": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence.",
          "hookLine": "Stockout metaphor for answers.",
          "rejected": true,
          "candidateId": "c8-role_reversal-div",
          "rejectReasons": [
            "topic_collapsed_to_generic_business"
          ],
          "weightedTotal": 69.3,
          "openingSituation": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence."
        }
      ],
      "comparativeJudge": {
        "winnerId": "c5-absurd_understandable-div",
        "winnerReason": "weighted_total=80.0; comparative_votes=3; stop=8; comprehension=5; memorability=5; product=4; family=absurd_understandable; core=Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with n",
        "bestProductTopicFit": "c1-direct_product_world-div",
        "clearestMentalImage": "c3-visual_exaggeration-div",
        "leastInterchangeable": "c5-absurd_understandable-div",
        "mostMemorableInOneHour": "c5-absurd_understandable-div",
        "mostLikelyToStopScrolling": "c5-absurd_understandable-div"
      },
      "selectedCandidate": {
        "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
        "family": "absurd_understandable",
        "coreIdea": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
        "hookLine": "Mascot suffers, fake typing online.",
        "candidateId": "c5-absurd_understandable-div",
        "visualPromise": "Film the opening as a scroll-stop frame: Mascot suffers, fake typing online. No generic office/laptop montage.",
        "familiarityRisk": "low",
        "openingSituation": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
        "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
        "emotionalReaction": "amused recognition",
        "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
        "memorabilityReason": "Selected from divergence v2 for scroll-stop: Mascot suffers, fake typing online",
        "expectedViewerQuestion": "What happens to the person in: Mascot suffers, fake typing online?"
      },
      "creativeDivergence": {
        "version": "creative-divergence@2",
        "clusters": [
          {
            "clusterId": "cl-1",
            "memberIds": [
              "raw-31-8156"
            ],
            "centroidScene": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone.",
            "representativeId": "raw-31-8156"
          },
          {
            "clusterId": "cl-2",
            "memberIds": [
              "raw-9-7988"
            ],
            "centroidScene": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet.",
            "representativeId": "raw-9-7988"
          },
          {
            "clusterId": "cl-3",
            "memberIds": [
              "raw-3-994"
            ],
            "centroidScene": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.",
            "representativeId": "raw-3-994"
          },
          {
            "clusterId": "cl-4",
            "memberIds": [
              "raw-4-2739"
            ],
            "centroidScene": "Split-second: a rival service van already in the customer's driveway; clipboard signed; your website-led service business phone lights unanswered on a bench; website chat idle.",
            "representativeId": "raw-4-2739"
          },
          {
            "clusterId": "cl-5",
            "memberIds": [
              "raw-7-2523"
            ],
            "centroidScene": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside.",
            "representativeId": "raw-7-2523"
          },
          {
            "clusterId": "cl-6",
            "memberIds": [
              "raw-26-4396"
            ],
            "centroidScene": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
            "representativeId": "raw-26-4396"
          },
          {
            "clusterId": "cl-7",
            "memberIds": [
              "raw-1-4511"
            ],
            "centroidScene": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door.",
            "representativeId": "raw-1-4511"
          },
          {
            "clusterId": "cl-8",
            "memberIds": [
              "raw-2-8339"
            ],
            "centroidScene": "A ridiculous boarding-ticket dispenser for phone callers in a website-led service business lobby during after-hours silence; numbered paper slips; an open chat widget on a counter tablet glows with zero replies.",
            "representativeId": "raw-2-8339"
          },
          {
            "clusterId": "cl-9",
            "memberIds": [
              "raw-5-2245"
            ],
            "centroidScene": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.",
            "representativeId": "raw-5-2245"
          },
          {
            "clusterId": "cl-10",
            "memberIds": [
              "raw-12-1939"
            ],
            "centroidScene": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence.",
            "representativeId": "raw-12-1939"
          },
          {
            "clusterId": "cl-11",
            "memberIds": [
              "raw-13-3915"
            ],
            "centroidScene": "Kids selling lemonade next to a website-led service business van; parent jokes \"they answer faster than your website\"; technician laughs then freezes.",
            "representativeId": "raw-13-3915"
          },
          {
            "clusterId": "cl-12",
            "memberIds": [
              "raw-16-3883"
            ],
            "centroidScene": "Dog barking at a website-led service business truck leaving; owner on porch scrolls competitor site and books instantly.",
            "representativeId": "raw-16-3883"
          },
          {
            "clusterId": "cl-13",
            "memberIds": [
              "raw-20-6775"
            ],
            "centroidScene": "Waiting room fish tank; one fish labeled \"website leads\"; bowl nearly empty while phone fish overcrowded.",
            "representativeId": "raw-20-6775"
          },
          {
            "clusterId": "cl-14",
            "memberIds": [
              "raw-23-5234"
            ],
            "centroidScene": "Customer holds broken thermostat in one hand, phone in other; competitor van honks; website tab still on \"message sent\".",
            "representativeId": "raw-23-5234"
          },
          {
            "clusterId": "cl-15",
            "memberIds": [
              "raw-24-4726"
            ],
            "centroidScene": "Train-station style departure board listing \"Phone caller #47\" boarding; column \"Website visitor\" stuck on \"Delayed indefinitely\".",
            "representativeId": "raw-24-4726"
          },
          {
            "clusterId": "cl-16",
            "memberIds": [
              "raw-27-4001"
            ],
            "centroidScene": "Time-lapse: sun arc over website-led service business yard; shadow of unanswered chat window grows across empty dispatch desk.",
            "representativeId": "raw-27-4001"
          },
          {
            "clusterId": "cl-17",
            "memberIds": [
              "raw-28-8944"
            ],
            "centroidScene": "Customer knocks on rolling bay door; no answer; peers through crack at idle tablets; types on phone into competitor booking link.",
            "representativeId": "raw-28-8944"
          },
          {
            "clusterId": "cl-18",
            "memberIds": [
              "raw-38-271"
            ],
            "centroidScene": "Parade float of giant phone passes shop; crowd cheers; shop window reflection shows empty chat overlay on glass.",
            "representativeId": "raw-38-271"
          },
          {
            "clusterId": "cl-19",
            "memberIds": [
              "raw-44-7287"
            ],
            "centroidScene": "Tire tracks in mud leading to website-led service business; parallel browser history shows competitor thank-you page on same phone.",
            "representativeId": "raw-44-7287"
          },
          {
            "clusterId": "cl-20",
            "memberIds": [
              "raw-45-3314"
            ],
            "centroidScene": "Barber pole spins next door; barber chats with waiting client; website-led service business queue stares at dead website kiosk.",
            "representativeId": "raw-45-3314"
          },
          {
            "clusterId": "cl-21",
            "memberIds": [
              "raw-8-5539"
            ],
            "centroidScene": "Close on a customer's sweaty hands sending an urgent website-led service business question; the business reply thread shows \"seen\" with no answer; crew visible through window on trucks.",
            "representativeId": "raw-8-5539"
          },
          {
            "clusterId": "cl-22",
            "memberIds": [
              "raw-10-1712"
            ],
            "centroidScene": "Ice cubes melting on a website-led service business truck hood in sun; timer implied; inside the cab, missed-call counter ticks up on a dash mount.",
            "representativeId": "raw-10-1712"
          },
          {
            "clusterId": "cl-23",
            "memberIds": [
              "raw-15-5555"
            ],
            "centroidScene": "Thermometer on a shop window cracks past red; inside, staff high-five for \"busy day\"; outside, visitor refreshes contact page endlessly.",
            "representativeId": "raw-15-5555"
          },
          {
            "clusterId": "cl-24",
            "memberIds": [
              "raw-18-3793"
            ],
            "centroidScene": "Inflatable tube-man waving outside website-led service business shop; real customers walk past it into rival parking lot.",
            "representativeId": "raw-18-3793"
          },
          {
            "clusterId": "cl-25",
            "memberIds": [
              "raw-39-4568"
            ],
            "centroidScene": "Hail bounces off website-led service business sign; technician under awning answers hail damage call; website \"emergency\" form untouched in split screen.",
            "representativeId": "raw-39-4568"
          },
          {
            "clusterId": "cl-26",
            "memberIds": [
              "raw-41-9642"
            ],
            "centroidScene": "Parking meter expires on customer car outside website-led service business; they leave ticket on windshield and drive to rival lot.",
            "representativeId": "raw-41-9642"
          },
          {
            "clusterId": "cl-27",
            "memberIds": [
              "raw-11-2571"
            ],
            "centroidScene": "A customer tries three doors of a website-led service business building — all locked for field crews — then sits on the curb typing into the business website.",
            "representativeId": "raw-11-2571"
          },
          {
            "clusterId": "cl-28",
            "memberIds": [
              "raw-29-8011"
            ],
            "centroidScene": "Two clocks side by side: wall clock for shop hours; digital timer for \"avg website reply\" spinning into hours.",
            "representativeId": "raw-29-8011"
          },
          {
            "clusterId": "cl-29",
            "memberIds": [
              "raw-35-3942"
            ],
            "centroidScene": "Customer tries voice-to-text question in car AC; sends; steering wheel grip tightens as \"delivered\" sits with no reply.",
            "representativeId": "raw-35-3942"
          },
          {
            "clusterId": "cl-30",
            "memberIds": [
              "raw-40-2474"
            ],
            "centroidScene": "Kid's science fair volcano erupts foam; parent texts website-led service business for cleanup; message sits next to kid's blue ribbon.",
            "representativeId": "raw-40-2474"
          },
          {
            "clusterId": "cl-31",
            "memberIds": [
              "raw-6-843"
            ],
            "centroidScene": "Residential street in heat: multiple website-led service business vans parked; neighbors point at phones; one homeowner closes a laptop after no reply on the business site.",
            "representativeId": "raw-6-843"
          },
          {
            "clusterId": "cl-32",
            "memberIds": [
              "raw-17-1896"
            ],
            "centroidScene": "Night shot: website-led service business yard empty; security light on; laptop left on counter shows 14 unanswered chats glowing.",
            "representativeId": "raw-17-1896"
          },
          {
            "clusterId": "cl-33",
            "memberIds": [
              "raw-19-5623"
            ],
            "centroidScene": "Technician on roof in heat; phone vibrates in tool belt unanswered; ground-level tablet shows visitor asking \"anyone on site?\"",
            "representativeId": "raw-19-5623"
          },
          {
            "clusterId": "cl-34",
            "memberIds": [
              "raw-30-950"
            ],
            "centroidScene": "Volunteer fire siren in small town; everyone looks; cut to silent website notification badge maxed out with no staff.",
            "representativeId": "raw-30-950"
          },
          {
            "clusterId": "cl-35",
            "memberIds": [
              "raw-37-8934"
            ],
            "centroidScene": "Solar panels on website-led service business roof; inverter hum; inside, power strip of dead chargers and one live chat cable unplugged.",
            "representativeId": "raw-37-8934"
          },
          {
            "clusterId": "cl-36",
            "memberIds": [
              "raw-14-1861"
            ],
            "centroidScene": "Radio dispatch voiceover chaos; dispatcher puts caller on hold; website visitor bubble pops \"still here?\" with no agent.",
            "representativeId": "raw-14-1861"
          },
          {
            "clusterId": "cl-37",
            "memberIds": [
              "raw-21-7253"
            ],
            "centroidScene": "Graffiti-style chalk on sidewalk: \"CALL US\" with arrow to website-led service business; chalk washed away by sprinkler; QR code to site smudged unreadable.",
            "representativeId": "raw-21-7253"
          },
          {
            "clusterId": "cl-38",
            "memberIds": [
              "raw-22-2255"
            ],
            "centroidScene": "Power flicker during after-hours silence; phones reboot; website chat keeps replying on UPS battery glow.",
            "representativeId": "raw-22-2255"
          },
          {
            "clusterId": "cl-39",
            "memberIds": [
              "raw-25-6835"
            ],
            "centroidScene": "Flash flood of sticky notes on a website-led service business door: \"call back\"; camera pulls back to reveal zero notes for web chats on a kiosk.",
            "representativeId": "raw-25-6835"
          },
          {
            "clusterId": "cl-40",
            "memberIds": [
              "raw-32-5275"
            ],
            "centroidScene": "Lost cat poster on pole next to website-led service business flyer; someone calls number on cat poster immediately; website number on flyer faded.",
            "representativeId": "raw-32-5275"
          },
          {
            "clusterId": "cl-41",
            "memberIds": [
              "raw-33-5919"
            ],
            "centroidScene": "Drone shot: website-led service business trucks radiating from hub; single pixel ping on map for abandoned web session far from routes.",
            "representativeId": "raw-33-5919"
          },
          {
            "clusterId": "cl-42",
            "memberIds": [
              "raw-34-5712"
            ],
            "centroidScene": "Break room pizza celebration for \"record calls\"; wall TV shows website bounce rate climbing in red.",
            "representativeId": "raw-34-5712"
          },
          {
            "clusterId": "cl-43",
            "memberIds": [
              "raw-36-8601"
            ],
            "centroidScene": "Janitor mops around ringing desk phone; steps over tablet showing visitor \"hello?\" for minutes.",
            "representativeId": "raw-36-8601"
          },
          {
            "clusterId": "cl-44",
            "memberIds": [
              "raw-42-7650"
            ],
            "centroidScene": "Beehive buzzing near website-led service business sign; customers swerve away; online chat asks about \"stinging smell from unit\" — no answer.",
            "representativeId": "raw-42-7650"
          },
          {
            "clusterId": "cl-45",
            "memberIds": [
              "raw-43-3345"
            ],
            "centroidScene": "Flashlight tour of dark website-led service business showroom after hours; beam lands on glowing chat requests like eyes in dark.",
            "representativeId": "raw-43-3345"
          }
        ],
        "survivors": [
          {
            "id": "raw-31-8156",
            "tags": [
              "fan",
              "queue",
              "refresh"
            ],
            "scene": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone.",
            "rejected": false,
            "clusterId": "cl-1",
            "rejectReason": null,
            "scrollStopCue": "Heat relief outside, none online",
            "stopScrollScore": 8.5,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-9-7988",
            "tags": [
              "queue",
              "storefront",
              "wrap"
            ],
            "scene": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet.",
            "rejected": false,
            "clusterId": "cl-2",
            "rejectReason": null,
            "scrollStopCue": "Real queue outside, ghost queue online",
            "stopScrollScore": 8.5,
            "visualDistinctScore": 6.5
          },
          {
            "id": "raw-3-994",
            "tags": [
              "exaggeration",
              "van",
              "heat",
              "pile"
            ],
            "scene": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.",
            "rejected": false,
            "clusterId": "cl-3",
            "rejectReason": null,
            "scrollStopCue": "Lost work as a physical mountain",
            "stopScrollScore": 7.5,
            "visualDistinctScore": 8
          },
          {
            "id": "raw-4-2739",
            "tags": [
              "consequence",
              "competitor",
              "driveway"
            ],
            "scene": "Split-second: a rival service van already in the customer's driveway; clipboard signed; your website-led service business phone lights unanswered on a bench; website chat idle.",
            "rejected": false,
            "clusterId": "cl-4",
            "rejectReason": null,
            "scrollStopCue": "Competitor wins before you pick up",
            "stopScrollScore": 7.5,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-7-2523",
            "tags": [
              "comparison",
              "AC",
              "heat"
            ],
            "scene": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside.",
            "rejected": false,
            "clusterId": "cl-5",
            "rejectReason": null,
            "scrollStopCue": "Wasted cool air = wasted web traffic",
            "stopScrollScore": 7.5,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-26-4396",
            "tags": [
              "mascot",
              "parking",
              "fake"
            ],
            "scene": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
            "rejected": false,
            "clusterId": "cl-6",
            "rejectReason": null,
            "scrollStopCue": "Mascot suffers, fake typing online",
            "stopScrollScore": 7.5,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-1-4511",
            "tags": [
              "conflict",
              "counter",
              "heat",
              "website-led service business"
            ],
            "scene": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door.",
            "rejected": false,
            "clusterId": "cl-7",
            "rejectReason": null,
            "scrollStopCue": "Public fight while demand walks out",
            "stopScrollScore": 7.5,
            "visualDistinctScore": 7
          },
          {
            "id": "raw-2-8339",
            "tags": [
              "absurd",
              "queue",
              "lobby"
            ],
            "scene": "A ridiculous boarding-ticket dispenser for phone callers in a website-led service business lobby during after-hours silence; numbered paper slips; an open chat widget on a counter tablet glows with zero replies.",
            "rejected": false,
            "clusterId": "cl-8",
            "rejectReason": null,
            "scrollStopCue": "Airport logic applied to the wrong queue",
            "stopScrollScore": 7,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-5-2245",
            "tags": [
              "role_reversal",
              "empty",
              "chat"
            ],
            "scene": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.",
            "rejected": false,
            "clusterId": "cl-9",
            "rejectReason": null,
            "scrollStopCue": "Nobody home except the chat",
            "stopScrollScore": 7,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-12-1939",
            "tags": [
              "warehouse",
              "emergency",
              "parallel"
            ],
            "scene": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence.",
            "rejected": false,
            "clusterId": "cl-10",
            "rejectReason": null,
            "scrollStopCue": "Stockout metaphor for answers",
            "stopScrollScore": 7,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-13-3915",
            "tags": [
              "humor",
              "street",
              "comparison"
            ],
            "scene": "Kids selling lemonade next to a website-led service business van; parent jokes \"they answer faster than your website\"; technician laughs then freezes.",
            "rejected": false,
            "clusterId": "cl-11",
            "rejectReason": null,
            "scrollStopCue": "Lemonade stand beats your chat",
            "stopScrollScore": 7,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-16-3883",
            "tags": [
              "dog",
              "porch",
              "competitor"
            ],
            "scene": "Dog barking at a website-led service business truck leaving; owner on porch scrolls competitor site and books instantly.",
            "rejected": false,
            "clusterId": "cl-12",
            "rejectReason": null,
            "scrollStopCue": "Pet notices you left; customer books rival",
            "stopScrollScore": 7,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-20-6775",
            "tags": [
              "fish",
              "waiting",
              "absurd"
            ],
            "scene": "Waiting room fish tank; one fish labeled \"website leads\"; bowl nearly empty while phone fish overcrowded.",
            "rejected": false,
            "clusterId": "cl-13",
            "rejectReason": null,
            "scrollStopCue": "Absurd aquarium staffing metaphor",
            "stopScrollScore": 7,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-23-5234",
            "tags": [
              "thermostat",
              "honk",
              "tab"
            ],
            "scene": "Customer holds broken thermostat in one hand, phone in other; competitor van honks; website tab still on \"message sent\".",
            "rejected": false,
            "clusterId": "cl-14",
            "rejectReason": null,
            "scrollStopCue": "Two hands, zero answers",
            "stopScrollScore": 7,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-24-4726",
            "tags": [
              "departure",
              "board",
              "delay"
            ],
            "scene": "Train-station style departure board listing \"Phone caller #47\" boarding; column \"Website visitor\" stuck on \"Delayed indefinitely\".",
            "rejected": false,
            "clusterId": "cl-15",
            "rejectReason": null,
            "scrollStopCue": "Departure board for the wrong channel",
            "stopScrollScore": 7,
            "visualDistinctScore": 7.5
          },
          {
            "id": "raw-27-4001",
            "tags": [
              "timelapse",
              "shadow",
              "dispatch"
            ],
            "scene": "Time-lapse: sun arc over website-led service business yard; shadow of unanswered chat window grows across empty dispatch desk.",
            "rejected": false,
            "clusterId": "cl-16",
            "rejectReason": null,
            "scrollStopCue": "Shadow of silence all day",
            "stopScrollScore": 7,
            "visualDistinctScore": 7.5
          }
        ],
        "rawGeneratedCount": 45,
        "candidateSourceIds": [
          "raw-31-8156",
          "raw-9-7988",
          "raw-3-994",
          "raw-7-2523",
          "raw-26-4396",
          "raw-1-4511",
          "raw-5-2245",
          "raw-12-1939"
        ],
        "rawAfterFilterCount": 45,
        "rejectedGenericSamples": []
      },
      "regenerationReason": null,
      "rejectedCandidates": [
        {
          "reasons": [
            "topic_collapsed_to_generic_business"
          ],
          "candidateId": "c2-consequence_first-div"
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
          "candidateId": "c7-role_reversal-div"
        },
        {
          "reasons": [
            "topic_collapsed_to_generic_business"
          ],
          "candidateId": "c8-role_reversal-div"
        }
      ],
      "finalScriptFidelity": {
        "passed": true,
        "failureReasons": [],
        "coreIdeaRecognizable": true,
        "productOrTopicImplied": true,
        "voiceoverEssayCadence": false,
        "collapsedToGenericOffice": false,
        "hookPreservedInFirstSpoken": true,
        "openingSituationVisibleInScene1": true
      },
      "generatedCandidates": [
        {
          "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
          "family": "direct_product_world",
          "coreIdea": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone.",
          "hookLine": "Heat relief outside, none online.",
          "candidateId": "c1-direct_product_world-div",
          "visualPromise": "Film the opening as a scroll-stop frame: Heat relief outside, none online. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Paper fan handed to queue outside website-led service business; person fans themselves while refreshing dead chat on phone.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
          "emotionalReaction": "curiosity",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Heat relief outside, none online",
          "expectedViewerQuestion": "What happens to the person in: Heat relief outside, none online?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
          "family": "consequence_first",
          "coreIdea": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet.",
          "hookLine": "Real queue outside, ghost queue online.",
          "candidateId": "c2-consequence_first-div",
          "visualPromise": "Film the opening as a scroll-stop frame: Real queue outside, ghost queue online. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Mid-after-hours silence: a line of people with clipboards wraps around a website-led service business storefront; inside, a single employee waves off the website tablet.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
          "emotionalReaction": "curiosity",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Real queue outside, ghost queue online",
          "expectedViewerQuestion": "What happens to the person in: Real queue outside, ghost queue online?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
          "family": "visual_exaggeration",
          "coreIdea": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.",
          "hookLine": "Lost work as a physical mountain.",
          "candidateId": "c3-visual_exaggeration-div",
          "visualPromise": "Film the opening as a scroll-stop frame: Lost work as a physical mountain. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Outside a website-led service business van in blazing heat, a growing stack of unmarked job folders towers beside the door while a technician sprints to another truck.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
          "emotionalReaction": "tension",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Lost work as a physical mountain",
          "expectedViewerQuestion": "What happens to the person in: Lost work as a physical mountain?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
          "family": "unexpected_comparison",
          "coreIdea": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside.",
          "hookLine": "Wasted cool air = wasted web traffic.",
          "candidateId": "c4-unexpected_comparison-div",
          "visualPromise": "Film the opening as a scroll-stop frame: Wasted cool air = wasted web traffic. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "A home in heat: windows wide open, AC blasting uselessly — cut to a website-led service business website chat open with nobody typing while demand spikes outside.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
          "emotionalReaction": "tension",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Wasted cool air = wasted web traffic",
          "expectedViewerQuestion": "What happens to the person in: Wasted cool air = wasted web traffic?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
          "family": "absurd_understandable",
          "coreIdea": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
          "hookLine": "Mascot suffers, fake typing online.",
          "candidateId": "c5-absurd_understandable-div",
          "visualPromise": "Film the opening as a scroll-stop frame: Mascot suffers, fake typing online. No generic office/laptop montage.",
          "familiarityRisk": "low",
          "openingSituation": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
          "emotionalReaction": "amused recognition",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Mascot suffers, fake typing online",
          "expectedViewerQuestion": "What happens to the person in: Mascot suffers, fake typing online?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
          "family": "human_conflict",
          "coreIdea": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door.",
          "hookLine": "Public fight while demand walks out.",
          "candidateId": "c6-human_conflict-div",
          "visualPromise": "Film the opening as a scroll-stop frame: Public fight while demand walks out. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Two website-led service business workers mid-argument at a service counter during after-hours silence; phones stack; a customer silhouette turns away through the glass door.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
          "emotionalReaction": "tension",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Public fight while demand walks out",
          "expectedViewerQuestion": "What happens to the person in: Public fight while demand walks out?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
          "family": "role_reversal",
          "coreIdea": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.",
          "hookLine": "Nobody home except the chat.",
          "candidateId": "c7-role_reversal-div",
          "visualPromise": "Film the opening as a scroll-stop frame: Nobody home except the chat. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Empty front desk at a website-led service business during after-hours silence; phones blink alone; a wall-mounted tablet chat calmly auto-replies while the building is half-abandoned.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
          "emotionalReaction": "unease",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Nobody home except the chat",
          "expectedViewerQuestion": "What happens to the person in: Nobody home except the chat?"
        },
        {
          "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
          "family": "role_reversal",
          "coreIdea": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence.",
          "hookLine": "Stockout metaphor for answers.",
          "candidateId": "c8-role_reversal-div",
          "visualPromise": "Film the opening as a scroll-stop frame: Stockout metaphor for answers. No generic office/laptop montage.",
          "familiarityRisk": "medium",
          "openingSituation": "Warehouse shelf of spare parts labeled \"emergency\"; empty slot flashing; parallel shot of website FAQ unanswered during after-hours silence.",
          "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
          "emotionalReaction": "curiosity",
          "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
          "memorabilityReason": "Selected from divergence v2 for scroll-stop: Stockout metaphor for answers",
          "expectedViewerQuestion": "What happens to the person in: Stockout metaphor for answers?"
        }
      ],
      "finalStoryboardFidelity": {
        "passed": true,
        "failureReasons": [],
        "coreIdeaRecognizable": true,
        "productOrTopicImplied": true,
        "voiceoverEssayCadence": false,
        "collapsedToGenericOffice": false,
        "hookPreservedInFirstSpoken": true,
        "openingSituationVisibleInScene1": true
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
        "hook": "Most service businesses think being busy means business is good",
        "topic": "The HVAC company that got slammed with website traffic during a heatwave — and lost every single online lead",
        "motifs": [
          "laptop",
          "phone",
          "group",
          "product_asset"
        ],
        "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 21–25); pl",
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
        "opening_structure": "immediate_reaction",
        "cta_composition_id": null,
        "attention_mechanism": "FRUSTRATION",
        "opening_visual_motif": "same_notification_stacking_nice_five_more",
        "dominant_subject_motif": "laptop",
        "product_reveal_strategy": "PRODUCT_OUTCOME",
        "opening_emotional_effect": "frustration"
      },
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
      }
    ]
  }
}
```

## Použitý AI model
Claude / claude-sonnet-4-6 (getCopywritingProvider). Přesný model string z API response není persistován.

## Použitý prompt (celý)
```
Není persistováno v databázi.

System prompt (aktuální kód buildGeneratePackageSystem(true) — může se lišit od verze v okamžiku runu):

You are the Creative Engine for an AI Content Manager. You generate a complete content PACKAGE derived from a weekly strategy item. Video is MANDATORY for every package and is a fast-paced vertical SHORT (TikTok / Instagram Reels / YouTube Shorts share ONE video). The first 3 seconds (the hook) decide everything. Produce platform-specific outputs.

User prompt: Není persistováno. Byl sestaven buildGenerateContentPackagePrompt(...) včetně bloků Attention, Creative Candidate, Visual Narrative, Product Reveal, Creative Identity, Visual Medium, Visual Profile.

Rekonstrukce Creative Candidate bloku (z persistovaného winnera):

CREATIVE CANDIDATE SELECTION (creative-candidates@2.1):
Raw visual situations were clustered for scroll-stop (Creative Divergence v2); a winner was selected from 8 complete concepts. You MUST execute THIS winner —
do not invent a safer B2B montage, do not reinterpret into phones/laptops/offices unless the winner requires it.

Winner id: c5-absurd_understandable-div (absurd_understandable)
Why it won: weighted_total=80.0; comparative_votes=3; stop=8; comprehension=5; memorability=5; product=4; family=absurd_understandable; core=Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with n

coreIdea: Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.
emotionalReaction: amused recognition
hookLine (MUST be the stored hook AND the first spoken line): Mascot suffers, fake typing online.
openingSituation (MUST be visual_scenes[0] / first image_prompt): Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.
visualPromise: Film the opening as a scroll-stop frame: Mascot suffers, fake typing online. No generic office/laptop montage.
storyProgression: Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.
productConnection: AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.
ending: Next website visitor who needed an answer gets an answer while the crew stays in the field.
expectedViewerQuestion: What happens to the person in: Mascot suffers, fake typing online?
memorabilityReason: Selected from divergence v2 for scroll-stop: Mascot suffers, fake typing online

Hard rules:
- First spoken line creates tension, contradiction, curiosity, surprise, consequence, or emotional recognition.
- Forbidden openers: Let's be honest / Most businesses / In today's world / generic belief essays.
- Keep topic-specific concrete signals from the winner (do not collapse to 'businesses are busy').
- Downstream beats follow storyProgression; product enters via productConnection; close via ending.
- Attention / Visual Narrative / Identity control LOOK and MECHANISM — they must AMPLIFY this winner, not replace it.
```

## Odpověď modelu (celá)
```
Raw LLM text/JSON response není persistován.
Nejbližší dostupný výstup = finální package_brief (viz Výstup výše) po validaci, hook-align a (neprovedeném) fidelity repair.
regenerationReason=null
```

---
# 5. Hook generation

## Název kroku
Součást Content Package LLM + ensureUniqueHook + alignHookWithFirstSpoken

## Vstup
```json
{
  "topic": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
  "angle": "Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not.",
  "selectedCandidate_hookLine": "Mascot suffers, fake typing online."
}
```

## Výstup
```json
{
  "hook": "Mascot suffers, fake typing online.",
  "first_spoken_from_voiceover": "Mascot suffers, fake typing online"
}
```

## Použitý AI model
Claude (součást package call); ensureUniqueHook může volat Claude znovu — pro tento package není samostatný záznam o regeneraci hooku.

## Použitý prompt (celý)
```
Není persistováno (odděleně). Cílový hook ze Creative Divergence winner: Mascot suffers, fake typing online.
```

## Odpověď modelu (celá)
```
Mascot suffers, fake typing online.
```

---
# 6. Storyboard generation

## Název kroku
Součást Content Package LLM → package_brief.video

## Vstup
```json
{
  "selected_openingSituation": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
  "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot."
}
```

## Výstup
```json
{
  "script": "BEAT 1 — UNEXPECTED FACT (0–4s): Wide shot, bright co-working daylight. A person in a full mascot costume — oversized head, full suit — stands just outside a glass door waving at nobody in particular. Inside, visible through the glass, a laptop screen shows a chat widget with a blinking 'typing...' indicator that never resolves. First spoken line lands immediately: 'Mascot suffers, fake typing online.' Clipped, alert delivery. SFX: one short click accent at ~335ms.\n\nBEAT 2 — IMPLICATION (5–13s): Cut inside the bright co-working space. A single person, partial body, sits back down at a desk after being away — a carry-on bag still visible in the background. They scroll through a website analytics view on a laptop (screen faces viewer, no readable text, just visible scroll behavior and a face registering quiet dread). Voiceover: 'An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero.' Conversational, varied rhythm.\n\nBEAT 3 — PROOF / REVEAL (14–20s): Wide environmental frame of the same co-working space, now quieter. The person sits alone, the laptop open, foreground plant framing the left edge. The screen glows with an interface suggesting unanswered sessions (no readable text). Voiceover: 'Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.' Slight lift on 'every single night.' Brief pause before the payoff line.\n\nBEAT 4 — CTA (21–25s): Same warm neutral world, same person, now leaning back with a small exhale — the quiet tension of recognition. Voiceover: 'Create your AI assistant — let your website answer while you're gone.' Confident, not aggressive. Satisfying landing.",
  "concept": "Open on an absurd, immediately readable scene: a person in a full mascot costume — sweating, wilting — waving enthusiastically at passing cars in a sun-baked parking lot, while inside the office a chat widget blinks a 'typing...' indicator that never sends a message. The absurdity lands the provocative opinion fast: all the effort is outside, but the website is performing nothing. The video then cuts to the gut-punch moment — an accountant sitting back down at their desk after two weeks away, scrolling through analytics showing dozens of visits and zero form submissions. The final beat reframes the pain: your website is never truly closed — it's always open, always receiving visitors, and always silently sending them away. The close is a quiet, confident invitation to fix the permanent leak.",
  "duration_seconds": "25"
}
```

## Použitý AI model
Claude (součást package call)

## Použitý prompt (celý)
```
Není persistováno odděleně
```

## Odpověď modelu (celá)
```json
{
  "script": "BEAT 1 — UNEXPECTED FACT (0–4s): Wide shot, bright co-working daylight. A person in a full mascot costume — oversized head, full suit — stands just outside a glass door waving at nobody in particular. Inside, visible through the glass, a laptop screen shows a chat widget with a blinking 'typing...' indicator that never resolves. First spoken line lands immediately: 'Mascot suffers, fake typing online.' Clipped, alert delivery. SFX: one short click accent at ~335ms.\n\nBEAT 2 — IMPLICATION (5–13s): Cut inside the bright co-working space. A single person, partial body, sits back down at a desk after being away — a carry-on bag still visible in the background. They scroll through a website analytics view on a laptop (screen faces viewer, no readable text, just visible scroll behavior and a face registering quiet dread). Voiceover: 'An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero.' Conversational, varied rhythm.\n\nBEAT 3 — PROOF / REVEAL (14–20s): Wide environmental frame of the same co-working space, now quieter. The person sits alone, the laptop open, foreground plant framing the left edge. The screen glows with an interface suggesting unanswered sessions (no readable text). Voiceover: 'Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.' Slight lift on 'every single night.' Brief pause before the payoff line.\n\nBEAT 4 — CTA (21–25s): Same warm neutral world, same person, now leaning back with a small exhale — the quiet tension of recognition. Voiceover: 'Create your AI assistant — let your website answer while you're gone.' Confident, not aggressive. Satisfying landing.",
  "concept": "Open on an absurd, immediately readable scene: a person in a full mascot costume — sweating, wilting — waving enthusiastically at passing cars in a sun-baked parking lot, while inside the office a chat widget blinks a 'typing...' indicator that never sends a message. The absurdity lands the provocative opinion fast: all the effort is outside, but the website is performing nothing. The video then cuts to the gut-punch moment — an accountant sitting back down at their desk after two weeks away, scrolling through analytics showing dozens of visits and zero form submissions. The final beat reframes the pain: your website is never truly closed — it's always open, always receiving visitors, and always silently sending them away. The close is a quiet, confident invitation to fix the permanent leak.",
  "duration_seconds": "25"
}
```

---
# 8. Scene generation

## Název kroku
Součást Content Package LLM → visual_scenes (+ worker scenes)

## Vstup
```json
{
  "winner_openingSituation": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent."
}
```

## Výstup
```json
{
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
    }
  ],
  "video_job_input_scenes": [
    {
      "id": "scene-1",
      "type": "IMAGE",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-2",
      "type": "IMAGE",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-3",
      "type": "IMAGE",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-4",
      "type": "IMAGE",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    }
  ],
  "render_spec_scenes": [
    {
      "id": "scene-1",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-1.png",
      "image_bucket": "video-renders",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-2",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-2.png",
      "image_bucket": "video-renders",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-3",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-3.png",
      "image_bucket": "video-renders",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-4",
      "type": "IMAGE",
      "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-4.png",
      "image_bucket": "video-renders",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    }
  ]
}
```

## Použitý AI model
Claude (package call) pro popisy; následně image model pro raster

## Použitý prompt (celý)
```
Není persistováno odděleně
```

## Odpověď modelu (celá)
```json
[
  {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image."
  },
  {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image."
  },
  {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image."
  },
  {
    "source": "ai",
    "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
  }
]
```

---
# 9. Image prompt generation

## Název kroku
Součást Content Package LLM → image_prompts

## Vstup
```json
{
  "visual_profile": "NATURAL",
  "winner": {
    "ending": "Next website visitor who needed an answer gets an answer while the crew stays in the field.",
    "family": "absurd_understandable",
    "coreIdea": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
    "hookLine": "Mascot suffers, fake typing online.",
    "candidateId": "c5-absurd_understandable-div",
    "visualPromise": "Film the opening as a scroll-stop frame: Mascot suffers, fake typing online. No generic office/laptop montage.",
    "familiarityRisk": "low",
    "openingSituation": "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
    "storyProgression": "Hold the opening situation → widen to after-hours silence → reveal Unable to answer customer questions when offline on the website channel → AI chatbot platform for websites answers what humans cannot.",
    "emotionalReaction": "amused recognition",
    "productConnection": "AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's human stakes.",
    "memorabilityReason": "Selected from divergence v2 for scroll-stop: Mascot suffers, fake typing online",
    "expectedViewerQuestion": "What happens to the person in: Mascot suffers, fake typing online?"
  }
}
```

## Výstup
```json
[
  "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image.",
  "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image.",
  "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image.",
  "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
]
```

## Použitý AI model
Claude (součást package call)

## Použitý prompt (celý)
```
Není persistováno odděleně
```

## Odpověď modelu (celá)
```json
[
  "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image.",
  "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image.",
  "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image.",
  "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
]
```

---
# 10. Voiceover generation

## Název kroku
Součást Content Package LLM → voiceover_text; TTS ve video workeru

## Vstup
```json
{
  "hook": "Mascot suffers, fake typing online.",
  "tts_voice": "shimmer",
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: measured, credible. Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Vary empha"
}
```

## Výstup
```json
{
  "voiceover_text": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
  "video_job_input_voiceover_text": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word."
}
```

## Použitý AI model
Text: Claude (package call). TTS audio: OpenAI gpt-4o-mini-tts, voice=shimmer

## Použitý prompt (celý)
```
LLM prompt: Není persistováno.
TTS instructions (persistováno na video_jobs.input):
Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: measured, credible. Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Vary empha
```

## Odpověď modelu (celá)
```
Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.
```

---
# 11. Subtitle generation

## Název kroku
package_brief.subtitles (LLM string) + video worker Whisper/SRT z TTS audia

## Vstup
```json
{
  "package_subtitles_string": "Mascot suffers, fake typing online. | I used to think 'be right back' was a business strategy. | An accountant came back from vacation — dozens of visits. Zero leads. | The site just sat there, silent. | Your website isn't offline when you're away. | It's open. And it's turning people away — every single night.",
  "video_job_input_subtitles": "Mascot suffers, fake typing online. | I used to think 'be right back' was a business strategy. | An accountant came back from vacation — dozens of visits. Zero leads. | The site just sat there, silent. | Your website isn't offline when you're away. | It's open. And it's turning people away — every single night.",
  "debug_subtitle_source": "whisper"
}
```

## Výstup
```json
{
  "package_brief_subtitles": "Mascot suffers, fake typing online. | I used to think 'be right back' was a business strategy. | An accountant came back from vacation — dozens of visits. Zero leads. | The site just sat there, silent. | Your website isn't offline when you're away. | It's open. And it's turning people away — every single night.",
  "rendered_srt": "1\n00:00:00,000 --> 00:00:01,520\nMascot suffers,\n\n2\n00:00:01,520 --> 00:00:03,300\nfake typing online.\n\n3\n00:00:03,300 --> 00:00:04,460\nAn accountant I\n\n4\n00:00:04,460 --> 00:00:05,460\nknow returned from\n\n5\n00:00:05,460 --> 00:00:06,460\ntwo weeks off\n\n6\n00:00:06,460 --> 00:00:07,460\nto find dozens\n\n7\n00:00:07,460 --> 00:00:08,700\nof website visits\n\n8\n00:00:08,700 --> 00:00:09,780\n— real people,\n\n9\n00:00:09,780 --> 00:00:10,780\nreal questions —\n\n10\n00:00:10,780 --> 00:00:11,780\nand not one\n\n11\n00:00:11,780 --> 00:00:13,020\ncontact detail left behind.\n\n12\n00:00:13,020 --> 00:00:14,020\nZero.\n\n13\n00:00:14,020 --> 00:00:15,020\nBecause the site\n\n14\n00:00:15,020 --> 00:00:16,540\njust sat there, silent.\n\n15\n00:00:16,540 --> 00:00:17,960\nYour website isn't\n\n16\n00:00:17,960 --> 00:00:19,000\noffline when you're away.\n\n17\n00:00:19,000 --> 00:00:20,000\nIt's open.\n\n18\n00:00:20,000 --> 00:00:21,000\nAnd it's turning\n\n19\n00:00:21,000 --> 00:00:22,000\npeople away for\n\n20\n00:00:22,000 --> 00:00:23,000\nyou, every single\n\n21\n00:00:23,000 --> 00:00:24,000\nnight, without saying\n\n22\n00:00:24,000 --> 00:00:24,500\na word.\n",
  "subtitle_storage": "https://syijxdgekowpcboxpeyl.supabase.co/storage/v1/object/sign/video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/subtitles.srt",
  "debug": {
    "subtitle_source": "whisper",
    "subtitle_warning": false,
    "whisper_word_count": 62,
    "language_detected": "english",
    "speech_duration": 24.216,
    "srt_last_cue_end": 24.216
  }
}
```

## Použitý AI model
LLM subtitle string: Claude (package). Timed SRT: Whisper/transcribe ve video workeru (typicky OpenAI transcribe model — přesný model string není v video_jobs.model).

## Použitý prompt (celý)
```
Není persistováno
```

## Odpověď modelu (celá)
```
1
00:00:00,000 --> 00:00:01,520
Mascot suffers,

2
00:00:01,520 --> 00:00:03,300
fake typing online.

3
00:00:03,300 --> 00:00:04,460
An accountant I

4
00:00:04,460 --> 00:00:05,460
know returned from

5
00:00:05,460 --> 00:00:06,460
two weeks off

6
00:00:06,460 --> 00:00:07,460
to find dozens

7
00:00:07,460 --> 00:00:08,700
of website visits

8
00:00:08,700 --> 00:00:09,780
— real people,

9
00:00:09,780 --> 00:00:10,780
real questions —

10
00:00:10,780 --> 00:00:11,780
and not one

11
00:00:11,780 --> 00:00:13,020
contact detail left behind.

12
00:00:13,020 --> 00:00:14,020
Zero.

13
00:00:14,020 --> 00:00:15,020
Because the site

14
00:00:15,020 --> 00:00:16,540
just sat there, silent.

15
00:00:16,540 --> 00:00:17,960
Your website isn't

16
00:00:17,960 --> 00:00:19,000
offline when you're away.

17
00:00:19,000 --> 00:00:20,000
It's open.

18
00:00:20,000 --> 00:00:21,000
And it's turning

19
00:00:21,000 --> 00:00:22,000
people away for

20
00:00:22,000 --> 00:00:23,000
you, every single

21
00:00:23,000 --> 00:00:24,000
night, without saying

22
00:00:24,000 --> 00:00:24,500
a word.

```

---
# 12. Render metadata

## Název kroku
video_jobs output + presentation_generation render-related fields

## Vstup
```json
{
  "cta": "Create your AI assistant — let your website answer while you're gone.",
  "hook": "Mascot suffers, fake typing online.",
  "angle": "Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out. The story exposes how 'being offline' isn't a temporary gap; it's a permanent, invisible leak in your pipeline that happens every single night, every weekend, and every vacation — whether you notice it or not.",
  "topic": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
  "scenes": [
    {
      "id": "scene-1",
      "type": "IMAGE",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-2",
      "type": "IMAGE",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-3",
      "type": "IMAGE",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    },
    {
      "id": "scene-4",
      "type": "IMAGE",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image.",
      "duration_seconds": 4,
      "payload_snapshot": {
        "media": {
          "source": "ai",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
        }
      },
      "renderer_version": "image@1"
    }
  ],
  "script": "BEAT 1 — UNEXPECTED FACT (0–4s): Wide shot, bright co-working daylight. A person in a full mascot costume — oversized head, full suit — stands just outside a glass door waving at nobody in particular. Inside, visible through the glass, a laptop screen shows a chat widget with a blinking 'typing...' indicator that never resolves. First spoken line lands immediately: 'Mascot suffers, fake typing online.' Clipped, alert delivery. SFX: one short click accent at ~335ms.\n\nBEAT 2 — IMPLICATION (5–13s): Cut inside the bright co-working space. A single person, partial body, sits back down at a desk after being away — a carry-on bag still visible in the background. They scroll through a website analytics view on a laptop (screen faces viewer, no readable text, just visible scroll behavior and a face registering quiet dread). Voiceover: 'An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero.' Conversational, varied rhythm.\n\nBEAT 3 — PROOF / REVEAL (14–20s): Wide environmental frame of the same co-working space, now quieter. The person sits alone, the laptop open, foreground plant framing the left edge. The screen glows with an interface suggesting unanswered sessions (no readable text). Voiceover: 'Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.' Slight lift on 'every single night.' Brief pause before the payoff line.\n\nBEAT 4 — CTA (21–25s): Same warm neutral world, same person, now leaning back with a small exhale — the quiet tension of recognition. Voiceover: 'Create your AI assistant — let your website answer while you're gone.' Confident, not aggressive. Satisfying landing.",
  "concept": "Open on an absurd, immediately readable scene: a person in a full mascot costume — sweating, wilting — waving enthusiastically at passing cars in a sun-baked parking lot, while inside the office a chat widget blinks a 'typing...' indicator that never sends a message. The absurdity lands the provocative opinion fast: all the effort is outside, but the website is performing nothing. The video then cuts to the gut-punch moment — an accountant sitting back down at their desk after two weeks away, scrolling through analytics showing dozens of visits and zero form submissions. The final beat reframes the pain: your website is never truly closed — it's always open, always receiving visitors, and always silently sending them away. The close is a quiet, confident invitation to fix the permanent leak.",
  "scenario": "An accountant returns from a two-week vacation to find that multiple small business owners visited the website asking about tax filing deadlines but never filled out the contact form.",
  "sfx_gain": 0.18,
  "subtitles": "Mascot suffers, fake typing online. | I used to think 'be right back' was a business strategy. | An accountant came back from vacation — dozens of visits. Zero leads. | The site just sat there, silent. | Your website isn't offline when you're away. | It's open. And it's turning people away — every single night.",
  "tts_voice": "shimmer",
  "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
  "sfx_reason": "opening_accent:PROVOCATIVE_OPINION:bold_claim",
  "sfx_source": "programmatic_v1",
  "asset_images": [],
  "delivery_arc": {
    "phases": [
      {
        "phase": "opening",
        "delivery": "Opening: alert, clipped first phrase — not shouted."
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
      "full_arc_not_opening_only"
    ],
    "version": "delivery-arc@1",
    "tts_instruction_fragment": "Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Vary emphasis; pause before the reveal or punchline. Do not read every line at the same energy. Confident, not aggressive."
  },
  "sfx_category": "click",
  "sfx_selected": true,
  "voice_scores": {
    "primary": 49,
    "secondary": 62
  },
  "voice_source": "package_secondary",
  "creative_mode": "shock",
  "image_prompts": [
    "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image.",
    "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image.",
    "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image.",
    "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
  ],
  "sfx_timing_ms": 335,
  "visual_medium": "PHOTOGRAPHIC",
  "visual_scenes": [
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image."
    },
    {
      "source": "ai",
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
    }
  ],
  "voice_reasons": [
    "funnel_problem→warmth(+2)",
    "mode_shock→energy(+3)",
    "profile_NATURAL→warmth(+2)",
    "roles_close/proof→steadiness(+1)",
    "fit_primary(+49)",
    "fit_secondary(+62)"
  ],
  "selected_voice": "shimmer",
  "visual_profile": "NATURAL",
  "voiceover_text": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
  "delivery_reason": "Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: warm and approachable. Delivery: measured, credible. Language: en.",
  "opening_delivery": "urgent",
  "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: measured, credible. Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Vary empha",
  "attention_version": "attention@1",
  "creative_identity": {
    "key": "a bright co-working space in daylight|quiet tension before a decision|low-contrast, flat documentary lighting|wide environmental framing|layered depth with foreground and background|a single person, partial body, face not dominant|warm neutral color feel",
    "mood": "quiet tension before a decision",
    "camera": "wide environmental framing",
    "version": "creative-identity@1",
    "lighting": "low-contrast, flat documentary lighting",
    "color_feel": "warm neutral color feel",
    "option_ids": {
      "mood": "quietly_tense",
      "camera": "wide_environmental",
      "lighting": "low_contrast_flat",
      "color_feel": "warm_neutral",
      "composition": "layered_depth",
      "environment": "co_working_daylight",
      "human_presence": "single_partial"
    },
    "composition": "layered depth with foreground and background",
    "environment": "a bright co-working space in daylight",
    "human_presence": "a single person, partial body, face not dominant"
  },
  "opening_structure": "bold_claim",
  "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
  "weekly_strategy_id": "7ab632a1-c780-4fc3-bf22-468b22825c8d",
  "attention_mechanism": "PROVOCATIVE_OPINION",
  "creative_mode_beats": [
    "unexpected_fact",
    "implication",
    "proof",
    "cta"
  ],
  "explicit_scene_plan": true,
  "visual_medium_source": "auto",
  "opening_motion_intent": "EMPHASIS",
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
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "cta_selected": false,
      "visual_profile": "NATURAL",
      "downgrade_rules": [],
      "creative_identity": {
        "key": "a bright co-working space in daylight|quiet tension before a decision|low-contrast, flat documentary lighting|wide environmental framing|layered depth with foreground and background|a single person, partial body, face not dominant|warm neutral color feel",
        "mood": "quiet tension before a decision",
        "camera": "wide environmental framing",
        "version": "creative-identity@1",
        "lighting": "low-contrast, flat documentary lighting",
        "color_feel": "warm neutral color feel",
        "option_ids": {
          "mood": "quietly_tense",
          "camera": "wide_environmental",
          "lighting": "low_contrast_flat",
          "color_feel": "warm_neutral",
          "composition": "layered_depth",
          "environment": "co_working_daylight",
          "human_presence": "single_partial"
        },
        "composition": "layered depth with foreground and background",
        "environment": "a bright co-working space in daylight",
        "human_presence": "a single person, partial body, face not dominant"
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
          "hook": "Most service businesses think being busy means business is good",
          "topic": "The HVAC company that got slammed with website traffic during a heatwave — and lost every single online lead",
          "motifs": [
            "laptop",
            "phone",
            "group",
            "product_asset"
          ],
          "closing": "Show this landscape product UI screenshot as a framed laptop screen insert during the final CTA beat (seconds 21–25); pl",
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
          "opening_structure": "immediate_reaction",
          "cta_composition_id": null,
          "attention_mechanism": "FRUSTRATION",
          "opening_visual_motif": "same_notification_stacking_nice_five_more",
          "dominant_subject_motif": "laptop",
          "product_reveal_strategy": "PRODUCT_OUTCOME",
          "opening_emotional_effect": "frustration"
        },
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
        }
      ]
    }
  },
  "visual_medium_version": "visual-medium@1",
  "visual_profile_source": "package_snapshot",
  "resolved_primary_voice": "cedar",
  "visual_profile_version": "visual-profile@3",
  "resolved_secondary_voice": "shimmer"
}
```

## Výstup
```json
{
  "video_job": {
    "id": "0fff98a4-346a-4896-ac7c-69e609cf1787",
    "status": "completed",
    "provider": "video_engine",
    "model": null,
    "content_item_id": "93c301dc-0d14-4e44-9ff6-4c82df0111c6",
    "created_at": "2026-07-17T16:18:03.518134+00:00",
    "completed_at": "2026-07-17T16:23:31.822+00:00",
    "output_urls_path_only": {
      "mp4": "https://syijxdgekowpcboxpeyl.supabase.co/storage/v1/object/sign/video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/output.mp4",
      "thumbnail": "https://syijxdgekowpcboxpeyl.supabase.co/storage/v1/object/sign/video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/thumbnail.png",
      "subtitle": "https://syijxdgekowpcboxpeyl.supabase.co/storage/v1/object/sign/video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/subtitles.srt"
    },
    "render_spec": {
      "scenes": [
        {
          "id": "scene-1",
          "type": "IMAGE",
          "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-1.png",
          "image_bucket": "video-renders",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image.",
          "duration_seconds": 4,
          "payload_snapshot": {
            "media": {
              "source": "ai",
              "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image."
            }
          },
          "renderer_version": "image@1"
        },
        {
          "id": "scene-2",
          "type": "IMAGE",
          "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-2.png",
          "image_bucket": "video-renders",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image.",
          "duration_seconds": 4,
          "payload_snapshot": {
            "media": {
              "source": "ai",
              "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image."
            }
          },
          "renderer_version": "image@1"
        },
        {
          "id": "scene-3",
          "type": "IMAGE",
          "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-3.png",
          "image_bucket": "video-renders",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image.",
          "duration_seconds": 4,
          "payload_snapshot": {
            "media": {
              "source": "ai",
              "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image."
            }
          },
          "renderer_version": "image@1"
        },
        {
          "id": "scene-4",
          "type": "IMAGE",
          "image_path": "aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-4.png",
          "image_bucket": "video-renders",
          "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image.",
          "duration_seconds": 4,
          "payload_snapshot": {
            "media": {
              "source": "ai",
              "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image."
            }
          },
          "renderer_version": "image@1"
        }
      ],
      "version": 1,
      "metadata": {
        "rendered_at": "2026-07-17T16:23:29.827Z",
        "semantic_motion": {
          "beats": [
            {
              "beat_id": "beat-1",
              "scene_id": "scene-1",
              "motion_intent": "EMPHASIS",
              "motion_version": "semantic-motion@2",
              "motion_intensity": "LOW",
              "motion_primitive": "zoom_in"
            },
            {
              "beat_id": "beat-2",
              "scene_id": "scene-2",
              "motion_intent": "EXPLAIN",
              "motion_version": "semantic-motion@2",
              "motion_intensity": "LOW",
              "motion_primitive": "drift_up"
            },
            {
              "beat_id": "beat-3",
              "scene_id": "scene-3",
              "motion_intent": "EXPLAIN",
              "motion_version": "semantic-motion@2",
              "motion_intensity": "LOW",
              "motion_primitive": "drift_down"
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
              "scene_id": "scene-4",
              "motion_intent": "CLOSE",
              "motion_version": "semantic-motion@2",
              "motion_intensity": "LOW",
              "motion_primitive": "static"
            }
          ],
          "version": "semantic-motion@2"
        }
      }
    },
    "debug": {
      "sfx_gain": 0.18,
      "sfx_mixed": true,
      "sfx_reason": "opening_accent:PROVOCATIVE_OPINION:bold_claim",
      "sfx_source": "programmatic_v1",
      "match_ratio": 0.96875,
      "sfx_category": "click",
      "fallback_used": false,
      "language_hint": null,
      "sfx_timing_ms": 335,
      "audio_duration": 25.716,
      "duration_delta": 0.017332999999997156,
      "render_warning": false,
      "video_duration": 25.733333,
      "render_warnings": [],
      "sfx_duration_ms": 40,
      "speech_duration": 24.216,
      "subtitle_source": "whisper",
      "target_duration": 25.716,
      "srt_last_cue_end": 24.216,
      "subtitle_warning": false,
      "language_detected": "english",
      "post_mux_duration": 25.716,
      "tts_tail_expected": [
        "single",
        "night",
        "without",
        "saying",
        "a",
        "word"
      ],
      "tts_validation_log": [
        {
          "pass": true,
          "attempt": 1,
          "expected_tail": [
            "single",
            "night",
            "without",
            "saying",
            "a",
            "word"
          ],
          "durationSeconds": 24.216,
          "transcript_tail": [
            "you",
            "every",
            "single",
            "night",
            "without",
            "saying",
            "a",
            "word"
          ]
        }
      ],
      "whisper_word_count": 62,
      "tail_buffer_seconds": 1.5,
      "tts_tail_retry_used": false,
      "tts_tail_transcript": [
        "you",
        "every",
        "single",
        "night",
        "without",
        "saying",
        "a",
        "word"
      ],
      "post_subtitle_duration": 25.733333,
      "tts_validation_attempts": 1,
      "subtitle_timeline_duration": 24.216,
      "tts_tail_validation_passed": true,
      "intermediate_video_duration": 25.733333
    }
  },
  "presentation_generation_render_fields": {
    "tts_voice": "shimmer",
    "selected_voice": "shimmer",
    "tts_instructions": "Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: direct, empathetic, slightly frustrated. Delivery: alert energy, crisp emphasis on the unexpected fact. Delivery: measured, credible. Opening: alert, clipped first phrase — not shouted. Then settle into conversational body delivery. Vary empha",
    "final_worker_scene_types": [
      "IMAGE",
      "IMAGE",
      "IMAGE",
      "IMAGE"
    ],
    "visual_beat_count": 4,
    "target_visual_beat_count": 5,
    "frequency_decisions": [],
    "sparse_plan_adjustment": false
  },
  "scene_images": [
    {
      "id": "scene-1",
      "duration_seconds": 4,
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth — foreground and background both visible. A person in a full mascot costume (oversized colorful character head, full body suit) stands just inside a glass door, one arm raised mid-wave toward the empty parking lot outside. Through the glass, the daylight floods in. In the background, slightly out of focus, a laptop on a desk shows a glowing screen with a chat-style interface — a blinking ellipsis 'typing...' indicator visible as a soft glow, no readable text. The mascot's posture reads as exhausted and absurd. Single person, partial body, face not dominant. No readable text, signs, labels, or UI text anywhere in the image.",
      "rendered": "supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-1.png",
      "image_model_expected": "gpt-image-1 (OpenAI ImageProvider default)",
      "rewritten_normalized_prompt": "Není persistováno jako oddělené pole",
      "post_processing": "Není persistováno jako oddělené pole"
    },
    {
      "id": "scene-2",
      "duration_seconds": 4,
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body visible — torso and hands — sits back down at a clean desk, a small rolling carry-on bag visible just behind them in the background, suggesting a recent return from travel. Their hands rest on an open laptop keyboard; the screen faces the viewer at a three-quarter angle, showing a website analytics-style interface with visible scroll behavior — blocks of color suggesting data, no readable text or numbers. The person's posture communicates quiet dread and recognition. Foreground desk surface with a coffee cup and a notebook as natural props. No readable text, signs, labels, or UI text anywhere in the image.",
      "rendered": "supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-2.png",
      "image_model_expected": "gpt-image-1 (OpenAI ImageProvider default)",
      "rewritten_normalized_prompt": "Není persistováno jako oddělené pole",
      "post_processing": "Není persistováno jako oddělené pole"
    },
    {
      "id": "scene-3",
      "duration_seconds": 4,
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing with layered depth. A single person sits alone at a desk in the middle distance — partial body, face not dominant, slightly turned away. A large green plant in the left foreground frames the scene, creating natural depth. The laptop screen glows softly in the warm ambient light, screen facing the viewer at a three-quarter angle showing a chat interface with empty conversation threads — no readable text. The overall mood is quiet tension before a decision. The space around the subject has intentional negative space. No readable text, signs, labels, or UI text anywhere in the image.",
      "rendered": "supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-3.png",
      "image_model_expected": "gpt-image-1 (OpenAI ImageProvider default)",
      "rewritten_normalized_prompt": "Není persistováno jako oddělené pole",
      "post_processing": "Není persistováno jako oddělené pole"
    },
    {
      "id": "scene-4",
      "duration_seconds": 4,
      "image_prompt": "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel, low-contrast flat documentary lighting. Wide environmental framing. A single person, partial body, leans back slightly in their chair with a small exhale — the body language of quiet recognition and decision. The desk in front of them is clean, laptop closed now, hands resting in their lap. A plant in the left foreground and a window with soft daylight in the background create layered depth. The mood is calm resolution — tension released. No readable text, signs, labels, or UI text anywhere in the image.",
      "rendered": "supabase-storage://video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0fff98a4-346a-4896-ac7c-69e609cf1787/scene-scene-4.png",
      "image_model_expected": "gpt-image-1 (OpenAI ImageProvider default)",
      "rewritten_normalized_prompt": "Není persistováno jako oddělené pole",
      "post_processing": "Není persistováno jako oddělené pole"
    }
  ]
}
```

## Použitý AI model
Render: video_engine. Images: gpt-image-1. TTS: gpt-4o-mini-tts.

## Použitý prompt (celý)
```
Image prompts = scény výše (stejný string jako model input). Oddělený API request payload není persistován.
```

## Odpověď modelu (celá)
```
Viz output.render_spec + debug paths + debug.debug
```

---
# 13. TikTok output

## Název kroku
13. TikTok output — package_brief.platform_outputs.tiktok + content_items

## Vstup
```json
{
  "note": "Text platformy vznikl v Content Package LLM jako součást platform_outputs; content_items jsou fan-out persistence."
}
```

## Výstup
```json
{
  "platform_outputs": {
    "cta": "Check what your website does when you're not watching. Link in bio.",
    "format": "Vertical short (TikTok / Reels / Shorts)",
    "caption": "Mascot suffers outside. Fake typing inside. Nobody answers. That's basically most business websites right now — including yours when you're on vacation. An accountant came back from 2 weeks off to dozens of site visits. Zero leads. Zero contact details. The site just... sat there.",
    "hashtags": [
      "#smallbusiness",
      "#websitetips",
      "#leadgeneration",
      "#businessgrowth"
    ]
  },
  "content_items": [
    {
      "id": "93c301dc-0d14-4e44-9ff6-4c82df0111c6",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "tiktok",
      "format": "reel",
      "status": "draft",
      "title": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Mascot suffers outside. Fake typing inside. Nobody answers. That's basically most business websites right now — including yours when you're on vacation. An accountant came back from 2 weeks off to dozens of site visits. Zero leads. Zero contact details. The site just... sat there.",
      "hashtags": [
        "#smallbusiness",
        "#websitetips",
        "#leadgeneration",
        "#businessgrowth"
      ],
      "cta": "Check what your website does when you're not watching. Link in bio.",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 0
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    }
  ]
}
```

## Použitý AI model
Claude (součást Content Package LLM call)

## Použitý prompt (celý)
```
Není persistováno odděleně
```

## Odpověď modelu (celá)
```json
{
  "platform_outputs": {
    "cta": "Check what your website does when you're not watching. Link in bio.",
    "format": "Vertical short (TikTok / Reels / Shorts)",
    "caption": "Mascot suffers outside. Fake typing inside. Nobody answers. That's basically most business websites right now — including yours when you're on vacation. An accountant came back from 2 weeks off to dozens of site visits. Zero leads. Zero contact details. The site just... sat there.",
    "hashtags": [
      "#smallbusiness",
      "#websitetips",
      "#leadgeneration",
      "#businessgrowth"
    ]
  },
  "content_items": [
    {
      "id": "93c301dc-0d14-4e44-9ff6-4c82df0111c6",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "tiktok",
      "format": "reel",
      "status": "draft",
      "title": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Mascot suffers outside. Fake typing inside. Nobody answers. That's basically most business websites right now — including yours when you're on vacation. An accountant came back from 2 weeks off to dozens of site visits. Zero leads. Zero contact details. The site just... sat there.",
      "hashtags": [
        "#smallbusiness",
        "#websitetips",
        "#leadgeneration",
        "#businessgrowth"
      ],
      "cta": "Check what your website does when you're not watching. Link in bio.",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 0
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    }
  ]
}
```

---
# 14. Instagram output

## Název kroku
14. Instagram output — package_brief.platform_outputs.instagram + content_items

## Vstup
```json
{
  "note": "Text platformy vznikl v Content Package LLM jako součást platform_outputs; content_items jsou fan-out persistence."
}
```

## Výstup
```json
{
  "platform_outputs": {
    "cta": "Ready to fix the leak? Create your AI assistant — link in bio.",
    "format": "Vertical short (TikTok / Reels / Shorts)",
    "caption": "Here's the part nobody talks about: your website doesn't go offline when you do. 🪑 An accountant I know came back from a two-week vacation to find dozens of real visitors — people with real questions — who left without a single contact detail. The site offered nothing but static text and a form nobody filled out. That's not a vacation problem. That's a permanent, invisible leak that happens every night, every weekend, every time you step away. Your website is always open. The question is whether it's actually answering anyone.",
    "hashtags": [
      "#smallbusiness",
      "#websitetips",
      "#leadgeneration",
      "#aichatbot",
      "#businessgrowth",
      "#servicebusiness",
      "#onlinemarketing",
      "#customersupport",
      "#entrepreneurlife",
      "#digitalmarketing"
    ]
  },
  "content_items": [
    {
      "id": "7f580693-0e89-4d87-a291-dacfc664204f",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "instagram",
      "format": "reel",
      "status": "draft",
      "title": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Here's the part nobody talks about: your website doesn't go offline when you do. 🪑 An accountant I know came back from a two-week vacation to find dozens of real visitors — people with real questions — who left without a single contact detail. The site offered nothing but static text and a form nobody filled out. That's not a vacation problem. That's a permanent, invisible leak that happens every night, every weekend, every time you step away. Your website is always open. The question is whether it's actually answering anyone.",
      "hashtags": [
        "#smallbusiness",
        "#websitetips",
        "#leadgeneration",
        "#aichatbot",
        "#businessgrowth",
        "#servicebusiness",
        "#onlinemarketing",
        "#customersupport",
        "#entrepreneurlife",
        "#digitalmarketing"
      ],
      "cta": "Ready to fix the leak? Create your AI assistant — link in bio.",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 0
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    }
  ]
}
```

## Použitý AI model
Claude (součást Content Package LLM call)

## Použitý prompt (celý)
```
Není persistováno odděleně
```

## Odpověď modelu (celá)
```json
{
  "platform_outputs": {
    "cta": "Ready to fix the leak? Create your AI assistant — link in bio.",
    "format": "Vertical short (TikTok / Reels / Shorts)",
    "caption": "Here's the part nobody talks about: your website doesn't go offline when you do. 🪑 An accountant I know came back from a two-week vacation to find dozens of real visitors — people with real questions — who left without a single contact detail. The site offered nothing but static text and a form nobody filled out. That's not a vacation problem. That's a permanent, invisible leak that happens every night, every weekend, every time you step away. Your website is always open. The question is whether it's actually answering anyone.",
    "hashtags": [
      "#smallbusiness",
      "#websitetips",
      "#leadgeneration",
      "#aichatbot",
      "#businessgrowth",
      "#servicebusiness",
      "#onlinemarketing",
      "#customersupport",
      "#entrepreneurlife",
      "#digitalmarketing"
    ]
  },
  "content_items": [
    {
      "id": "7f580693-0e89-4d87-a291-dacfc664204f",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "instagram",
      "format": "reel",
      "status": "draft",
      "title": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Here's the part nobody talks about: your website doesn't go offline when you do. 🪑 An accountant I know came back from a two-week vacation to find dozens of real visitors — people with real questions — who left without a single contact detail. The site offered nothing but static text and a form nobody filled out. That's not a vacation problem. That's a permanent, invisible leak that happens every night, every weekend, every time you step away. Your website is always open. The question is whether it's actually answering anyone.",
      "hashtags": [
        "#smallbusiness",
        "#websitetips",
        "#leadgeneration",
        "#aichatbot",
        "#businessgrowth",
        "#servicebusiness",
        "#onlinemarketing",
        "#customersupport",
        "#entrepreneurlife",
        "#digitalmarketing"
      ],
      "cta": "Ready to fix the leak? Create your AI assistant — link in bio.",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 0
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    }
  ]
}
```

---
# 15. YouTube output

## Název kroku
15. YouTube output — package_brief.platform_outputs.youtube + content_items

## Vstup
```json
{
  "note": "Text platformy vznikl v Content Package LLM jako součást platform_outputs; content_items jsou fan-out persistence."
}
```

## Výstup
```json
{
  "platform_outputs": {
    "cta": "Create your AI assistant at fenrik.chat — see it working before you sign up.",
    "format": "Vertical short (YouTube Shorts)",
    "caption": "An accountant returned from a two-week vacation to find dozens of website visits, real questions from real prospects — and zero contact details left behind. Not because the leads weren't there. Because the website had nothing to offer them. This video walks through the moment that gut-punch hits, and why being offline isn't a temporary gap — it's a permanent, invisible leak that drains your pipeline every single night, every weekend, and every time you step away. If your website is just static text and a contact form, this is what that silence actually costs you.",
    "hashtags": [
      "#smallbusiness",
      "#leadgeneration",
      "#aichatbot",
      "#websitetips",
      "#businessgrowth"
    ]
  },
  "content_items": [
    {
      "id": "b0bed3ef-c210-4c7b-aabf-774f59721668",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "youtube",
      "format": "reel",
      "status": "draft",
      "title": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "An accountant returned from a two-week vacation to find dozens of website visits, real questions from real prospects — and zero contact details left behind. Not because the leads weren't there. Because the website had nothing to offer them. This video walks through the moment that gut-punch hits, and why being offline isn't a temporary gap — it's a permanent, invisible leak that drains your pipeline every single night, every weekend, and every time you step away. If your website is just static text and a contact form, this is what that silence actually costs you.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration",
        "#aichatbot",
        "#websitetips",
        "#businessgrowth"
      ],
      "cta": "Create your AI assistant at fenrik.chat — see it working before you sign up.",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 0
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    }
  ]
}
```

## Použitý AI model
Claude (součást Content Package LLM call)

## Použitý prompt (celý)
```
Není persistováno odděleně
```

## Odpověď modelu (celá)
```json
{
  "platform_outputs": {
    "cta": "Create your AI assistant at fenrik.chat — see it working before you sign up.",
    "format": "Vertical short (YouTube Shorts)",
    "caption": "An accountant returned from a two-week vacation to find dozens of website visits, real questions from real prospects — and zero contact details left behind. Not because the leads weren't there. Because the website had nothing to offer them. This video walks through the moment that gut-punch hits, and why being offline isn't a temporary gap — it's a permanent, invisible leak that drains your pipeline every single night, every weekend, and every time you step away. If your website is just static text and a contact form, this is what that silence actually costs you.",
    "hashtags": [
      "#smallbusiness",
      "#leadgeneration",
      "#aichatbot",
      "#websitetips",
      "#businessgrowth"
    ]
  },
  "content_items": [
    {
      "id": "b0bed3ef-c210-4c7b-aabf-774f59721668",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "youtube",
      "format": "reel",
      "status": "draft",
      "title": "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "An accountant returned from a two-week vacation to find dozens of website visits, real questions from real prospects — and zero contact details left behind. Not because the leads weren't there. Because the website had nothing to offer them. This video walks through the moment that gut-punch hits, and why being offline isn't a temporary gap — it's a permanent, invisible leak that drains your pipeline every single night, every weekend, and every time you step away. If your website is just static text and a contact form, this is what that silence actually costs you.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration",
        "#aichatbot",
        "#websitetips",
        "#businessgrowth"
      ],
      "cta": "Create your AI assistant at fenrik.chat — see it working before you sign up.",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 0
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    }
  ]
}
```

---
# 16. LinkedIn output

## Název kroku
16. LinkedIn output — package_brief.platform_outputs.linkedin + content_items

## Vstup
```json
{
  "note": "Text platformy vznikl v Content Package LLM jako součást platform_outputs; content_items jsou fan-out persistence."
}
```

## Výstup
```json
{
  "platform_outputs": {
    "cta": "What does your website actually say to a visitor at 11 PM? Worth thinking about.",
    "format": "Text post (LinkedIn)",
    "caption": "An accountant I know returned from a two-week vacation and opened their analytics. Dozens of website visits. Real business owners, asking real questions about tax deadlines and filing services. Not one contact detail left behind. No form submissions. No callbacks requested. Just traffic that arrived, found silence, and left. This is not a vacation problem. It is a structural one. Most professional services websites are open 24 hours a day and available for approximately zero of them. The contact form is not a support channel. It is a polite way of telling visitors to come back later — and most of them never do.",
    "hashtags": [
      "#smallbusiness",
      "#leadgeneration",
      "#professionaldevelopment"
    ],
    "title_variants": [
      "The accountant who came back from vacation to a week of missed leads",
      "Your website is open 24 hours. It just isn't available for any of them."
    ],
    "caption_variants": [
      "An accountant I know returned from a two-week vacation and opened their analytics. Dozens of website visits. Real business owners, asking real questions about tax deadlines and filing services. Not one contact detail left behind. No form submissions. No callbacks requested. Just traffic that arrived, found silence, and left. This is not a vacation problem. It is a structural one. Most professional services websites are open 24 hours a day and available for approximately zero of them. The contact form is not a support channel. It is a polite way of telling visitors to come back later — and most of them never do.",
      "Here is a detail most business owners overlook: being offline is not a temporary gap in your availability. It is a permanent feature of your website's behavior. Every night, every weekend, every vacation — your site receives visitors, offers them static text, and watches them leave. An accountant discovered this the hard way after two weeks away: dozens of visits, zero leads, zero contact details. The visitors were there. The opportunity was there. The website simply had nothing to say. If your site cannot answer a question at 11 PM, you are not losing leads occasionally. You are losing them on a schedule."
    ]
  },
  "content_items": [
    {
      "id": "35fcfa46-be8f-4ba0-b490-5ad39be14c5e",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "linkedin",
      "format": "reel",
      "status": "draft",
      "title": "The accountant who came back from vacation to a week of missed leads",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "An accountant I know returned from a two-week vacation and opened their analytics. Dozens of website visits. Real business owners, asking real questions about tax deadlines and filing services. Not one contact detail left behind. No form submissions. No callbacks requested. Just traffic that arrived, found silence, and left. This is not a vacation problem. It is a structural one. Most professional services websites are open 24 hours a day and available for approximately zero of them. The contact form is not a support channel. It is a polite way of telling visitors to come back later — and most of them never do.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration",
        "#professionaldevelopment"
      ],
      "cta": "What does your website actually say to a visitor at 11 PM? Worth thinking about.",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 0
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    },
    {
      "id": "7b6fe299-d0aa-40e9-b18c-a611a4559842",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "linkedin",
      "format": "reel",
      "status": "draft",
      "title": "Your website is open 24 hours. It just isn't available for any of them.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Here is a detail most business owners overlook: being offline is not a temporary gap in your availability. It is a permanent feature of your website's behavior. Every night, every weekend, every vacation — your site receives visitors, offers them static text, and watches them leave. An accountant discovered this the hard way after two weeks away: dozens of visits, zero leads, zero contact details. The visitors were there. The opportunity was there. The website simply had nothing to say. If your site cannot answer a question at 11 PM, you are not losing leads occasionally. You are losing them on a schedule.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration",
        "#professionaldevelopment"
      ],
      "cta": "What does your website actually say to a visitor at 11 PM? Worth thinking about.",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 1
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    }
  ]
}
```

## Použitý AI model
Claude (součást Content Package LLM call)

## Použitý prompt (celý)
```
Není persistováno odděleně
```

## Odpověď modelu (celá)
```json
{
  "platform_outputs": {
    "cta": "What does your website actually say to a visitor at 11 PM? Worth thinking about.",
    "format": "Text post (LinkedIn)",
    "caption": "An accountant I know returned from a two-week vacation and opened their analytics. Dozens of website visits. Real business owners, asking real questions about tax deadlines and filing services. Not one contact detail left behind. No form submissions. No callbacks requested. Just traffic that arrived, found silence, and left. This is not a vacation problem. It is a structural one. Most professional services websites are open 24 hours a day and available for approximately zero of them. The contact form is not a support channel. It is a polite way of telling visitors to come back later — and most of them never do.",
    "hashtags": [
      "#smallbusiness",
      "#leadgeneration",
      "#professionaldevelopment"
    ],
    "title_variants": [
      "The accountant who came back from vacation to a week of missed leads",
      "Your website is open 24 hours. It just isn't available for any of them."
    ],
    "caption_variants": [
      "An accountant I know returned from a two-week vacation and opened their analytics. Dozens of website visits. Real business owners, asking real questions about tax deadlines and filing services. Not one contact detail left behind. No form submissions. No callbacks requested. Just traffic that arrived, found silence, and left. This is not a vacation problem. It is a structural one. Most professional services websites are open 24 hours a day and available for approximately zero of them. The contact form is not a support channel. It is a polite way of telling visitors to come back later — and most of them never do.",
      "Here is a detail most business owners overlook: being offline is not a temporary gap in your availability. It is a permanent feature of your website's behavior. Every night, every weekend, every vacation — your site receives visitors, offers them static text, and watches them leave. An accountant discovered this the hard way after two weeks away: dozens of visits, zero leads, zero contact details. The visitors were there. The opportunity was there. The website simply had nothing to say. If your site cannot answer a question at 11 PM, you are not losing leads occasionally. You are losing them on a schedule."
    ]
  },
  "content_items": [
    {
      "id": "35fcfa46-be8f-4ba0-b490-5ad39be14c5e",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "linkedin",
      "format": "reel",
      "status": "draft",
      "title": "The accountant who came back from vacation to a week of missed leads",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "An accountant I know returned from a two-week vacation and opened their analytics. Dozens of website visits. Real business owners, asking real questions about tax deadlines and filing services. Not one contact detail left behind. No form submissions. No callbacks requested. Just traffic that arrived, found silence, and left. This is not a vacation problem. It is a structural one. Most professional services websites are open 24 hours a day and available for approximately zero of them. The contact form is not a support channel. It is a polite way of telling visitors to come back later — and most of them never do.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration",
        "#professionaldevelopment"
      ],
      "cta": "What does your website actually say to a visitor at 11 PM? Worth thinking about.",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 0
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    },
    {
      "id": "7b6fe299-d0aa-40e9-b18c-a611a4559842",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "linkedin",
      "format": "reel",
      "status": "draft",
      "title": "Your website is open 24 hours. It just isn't available for any of them.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Here is a detail most business owners overlook: being offline is not a temporary gap in your availability. It is a permanent feature of your website's behavior. Every night, every weekend, every vacation — your site receives visitors, offers them static text, and watches them leave. An accountant discovered this the hard way after two weeks away: dozens of visits, zero leads, zero contact details. The visitors were there. The opportunity was there. The website simply had nothing to say. If your site cannot answer a question at 11 PM, you are not losing leads occasionally. You are losing them on a schedule.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration",
        "#professionaldevelopment"
      ],
      "cta": "What does your website actually say to a visitor at 11 PM? Worth thinking about.",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 1
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    }
  ]
}
```

---
# 17. Facebook output

## Název kroku
17. Facebook output

## Vstup
```
Není součástí pipeline
```

## Výstup
```
Není součástí pipeline
```

## Použitý AI model
Není součástí pipeline

## Použitý prompt (celý)
```
Není součástí pipeline
```

## Odpověď modelu (celá)
```
Není součástí pipeline
```

---
# 18. X output

## Název kroku
18. X output — package_brief.platform_outputs.x + content_items

## Vstup
```json
{
  "note": "Text platformy vznikl v Content Package LLM jako součást platform_outputs; content_items jsou fan-out persistence."
}
```

## Výstup
```json
{
  "platform_outputs": {
    "cta": "Fix the default at fenrik.chat",
    "format": "Post (X / Twitter)",
    "caption": "Your website is open right now. It just isn't answering anyone. An accountant came back from vacation to dozens of visits and zero leads. The site had nothing to say. That's not bad luck. That's the default.",
    "hashtags": [
      "#smallbusiness",
      "#leadgeneration"
    ],
    "title_variants": [
      "Your website is open 24/7. It just isn't answering.",
      "Two weeks off. Dozens of visits. Zero leads.",
      "The contact form isn't a support channel. It's a polite rejection.",
      "Being offline isn't a gap. It's a permanent feature of your website.",
      "What your website does when you're not watching — and why it costs you."
    ],
    "caption_variants": [
      "Your website is open right now. It just isn't answering anyone. An accountant came back from vacation to dozens of visits and zero leads. The site had nothing to say. That's not bad luck. That's the default.",
      "Two weeks off. Dozens of website visits. Real questions from real prospects. Zero contact details left behind. Not because the leads weren't there — because the site offered nothing but a form nobody filled out. That's the quiet version of losing business.",
      "Hot take: a contact form is not customer support. It's a way of telling visitors to try again later. Most of them won't. Your website is open every night. The question is whether it's actually doing anything.",
      "Being offline isn't a temporary gap in your availability. It's a permanent feature of your website's behavior — every night, every weekend, every vacation. The visitors are there. The silence is yours.",
      "An accountant I know checked their analytics after two weeks away. Dozens of visits. Zero leads. The site had static text and a contact form. The visitors had questions. Nobody was home. That's not a vacation problem. That's the business model."
    ]
  },
  "content_items": [
    {
      "id": "4b59e794-b491-4bb2-af3c-671bae81afc7",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "x",
      "format": "reel",
      "status": "draft",
      "title": "Your website is open 24/7. It just isn't answering.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Your website is open right now. It just isn't answering anyone. An accountant came back from vacation to dozens of visits and zero leads. The site had nothing to say. That's not bad luck. That's the default.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration"
      ],
      "cta": "Fix the default at fenrik.chat",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 0
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    },
    {
      "id": "f8c0af34-486e-4ed5-b1c6-3fe9f4f69440",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "x",
      "format": "reel",
      "status": "draft",
      "title": "Two weeks off. Dozens of visits. Zero leads.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Two weeks off. Dozens of website visits. Real questions from real prospects. Zero contact details left behind. Not because the leads weren't there — because the site offered nothing but a form nobody filled out. That's the quiet version of losing business.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration"
      ],
      "cta": "Fix the default at fenrik.chat",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 1
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    },
    {
      "id": "6d07d8f0-1844-4ab1-8dd7-d56e0a39e103",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "x",
      "format": "reel",
      "status": "draft",
      "title": "The contact form isn't a support channel. It's a polite rejection.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Hot take: a contact form is not customer support. It's a way of telling visitors to try again later. Most of them won't. Your website is open every night. The question is whether it's actually doing anything. https://fenrik.chat",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration"
      ],
      "cta": "Fix the default at fenrik.chat",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 2
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    },
    {
      "id": "7af3d873-7182-46f3-9715-3552d4b6cb2d",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "x",
      "format": "reel",
      "status": "draft",
      "title": "Being offline isn't a gap. It's a permanent feature of your website.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Being offline isn't a temporary gap in your availability. It's a permanent feature of your website's behavior — every night, every weekend, every vacation. The visitors are there. The silence is yours.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration"
      ],
      "cta": "Fix the default at fenrik.chat",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 3
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    },
    {
      "id": "ad9e4cc7-a847-4a96-bbe4-20c14a371401",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "x",
      "format": "reel",
      "status": "draft",
      "title": "What your website does when you're not watching — and why it costs you.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "An accountant I know checked their analytics after two weeks away. Dozens of visits. Zero leads. The site had static text and a contact form. The visitors had questions. Nobody was home. That's not a vacation problem. That's the business model.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration"
      ],
      "cta": "Fix the default at fenrik.chat",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 4
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    }
  ]
}
```

## Použitý AI model
Claude (součást Content Package LLM call)

## Použitý prompt (celý)
```
Není persistováno odděleně
```

## Odpověď modelu (celá)
```json
{
  "platform_outputs": {
    "cta": "Fix the default at fenrik.chat",
    "format": "Post (X / Twitter)",
    "caption": "Your website is open right now. It just isn't answering anyone. An accountant came back from vacation to dozens of visits and zero leads. The site had nothing to say. That's not bad luck. That's the default.",
    "hashtags": [
      "#smallbusiness",
      "#leadgeneration"
    ],
    "title_variants": [
      "Your website is open 24/7. It just isn't answering.",
      "Two weeks off. Dozens of visits. Zero leads.",
      "The contact form isn't a support channel. It's a polite rejection.",
      "Being offline isn't a gap. It's a permanent feature of your website.",
      "What your website does when you're not watching — and why it costs you."
    ],
    "caption_variants": [
      "Your website is open right now. It just isn't answering anyone. An accountant came back from vacation to dozens of visits and zero leads. The site had nothing to say. That's not bad luck. That's the default.",
      "Two weeks off. Dozens of website visits. Real questions from real prospects. Zero contact details left behind. Not because the leads weren't there — because the site offered nothing but a form nobody filled out. That's the quiet version of losing business.",
      "Hot take: a contact form is not customer support. It's a way of telling visitors to try again later. Most of them won't. Your website is open every night. The question is whether it's actually doing anything.",
      "Being offline isn't a temporary gap in your availability. It's a permanent feature of your website's behavior — every night, every weekend, every vacation. The visitors are there. The silence is yours.",
      "An accountant I know checked their analytics after two weeks away. Dozens of visits. Zero leads. The site had static text and a contact form. The visitors had questions. Nobody was home. That's not a vacation problem. That's the business model."
    ]
  },
  "content_items": [
    {
      "id": "4b59e794-b491-4bb2-af3c-671bae81afc7",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "x",
      "format": "reel",
      "status": "draft",
      "title": "Your website is open 24/7. It just isn't answering.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Your website is open right now. It just isn't answering anyone. An accountant came back from vacation to dozens of visits and zero leads. The site had nothing to say. That's not bad luck. That's the default.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration"
      ],
      "cta": "Fix the default at fenrik.chat",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 0
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    },
    {
      "id": "f8c0af34-486e-4ed5-b1c6-3fe9f4f69440",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "x",
      "format": "reel",
      "status": "draft",
      "title": "Two weeks off. Dozens of visits. Zero leads.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Two weeks off. Dozens of website visits. Real questions from real prospects. Zero contact details left behind. Not because the leads weren't there — because the site offered nothing but a form nobody filled out. That's the quiet version of losing business.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration"
      ],
      "cta": "Fix the default at fenrik.chat",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 1
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    },
    {
      "id": "6d07d8f0-1844-4ab1-8dd7-d56e0a39e103",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "x",
      "format": "reel",
      "status": "draft",
      "title": "The contact form isn't a support channel. It's a polite rejection.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Hot take: a contact form is not customer support. It's a way of telling visitors to try again later. Most of them won't. Your website is open every night. The question is whether it's actually doing anything. https://fenrik.chat",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration"
      ],
      "cta": "Fix the default at fenrik.chat",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 2
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    },
    {
      "id": "7af3d873-7182-46f3-9715-3552d4b6cb2d",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "x",
      "format": "reel",
      "status": "draft",
      "title": "Being offline isn't a gap. It's a permanent feature of your website.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "Being offline isn't a temporary gap in your availability. It's a permanent feature of your website's behavior — every night, every weekend, every vacation. The visitors are there. The silence is yours.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration"
      ],
      "cta": "Fix the default at fenrik.chat",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 3
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    },
    {
      "id": "ad9e4cc7-a847-4a96-bbe4-20c14a371401",
      "project_id": "aabab9ff-9db4-4012-a53c-135e3bfea6cd",
      "package_id": "ff367a55-9338-4073-95bd-e3b30a8dd7a3",
      "platform": "x",
      "format": "reel",
      "status": "draft",
      "title": "What your website does when you're not watching — and why it costs you.",
      "body": "Mascot suffers, fake typing online. An accountant I know returned from two weeks off to find dozens of website visits — real people, real questions — and not one contact detail left behind. Zero. Because the site just sat there, silent. Your website isn't offline when you're away. It's open. And it's turning people away for you, every single night, without saying a word.",
      "caption": "An accountant I know checked their analytics after two weeks away. Dozens of visits. Zero leads. The site had static text and a contact form. The visitors had questions. Nobody was home. That's not a vacation problem. That's the business model.",
      "hashtags": [
        "#smallbusiness",
        "#leadgeneration"
      ],
      "cta": "Fix the default at fenrik.chat",
      "generation_metadata": {
        "source": "creative_engine",
        "funnel_stage": "problem_aware",
        "package_index": 0,
        "production_run_id": "04911a16-e551-4b92-ba5e-6ac73ba0ee37",
        "platform_variant_index": 4
      },
      "created_at": "2026-07-17T16:18:02.035179+00:00",
      "updated_at": "2026-07-17T16:18:02.035179+00:00",
      "language": null
    }
  ]
}
```

---
# Finální mapa pipeline (skutečné pořadí)

```
Product Brain (project.knowledge + product_* ) [už existovalo]
  → Production Run start
  → Weekly Strategy row (content_strategies, source=production_run)
  → Strategy Item (topic/angle/funnel)
  → generateContentPackage:
      Creative Directives (deterministic)
      Visual Profile (deterministic)
      Creative Identity (deterministic)
      Visual Narrative / Story Director (deterministic)
      Visual Medium (deterministic)
      Product Reveal (deterministic)
      Attention (deterministic)
      Creative Divergence v2 + Candidate Scoring/Judge (deterministic)
      ★ Claude Content Package LLM (ONE call)
          → hook, voiceover, video.script/concept, visual_scenes,
            image_prompts, platform_outputs, subtitles string, cta, hashtags…
      ensureUniqueHook / alignHookWithFirstSpoken
      Concept fidelity check (passed; no repair regenerate)
      Persist content_packages.package_brief
      Fan-out content_items (tiktok, ig, youtube, linkedin×2, x×5)
  → video_jobs (tiktok only):
      TTS (gpt-4o-mini-tts)
      Scene images (gpt-image-1) ×4
      Mux / render
      Subtitle SRT (whisper/transcribe from audio)
```

## Facebook
Není součástí pipeline pro tento run (není v requested platforms / výstupech).

## Kompletní raw dump
`reports/package-ff367a55-9338-4073-95bd-e3b30a8dd7a3-pipeline-audit-raw.json`