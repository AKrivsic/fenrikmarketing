# Full Video Audit Data — Run `b98a3ba8-4e34-4027-82d4-c58a798f7201`

_Extracted 2026-07-20T21:57:09Z. Data dump only — no quality evaluation._

- **Production run:** `b98a3ba8-4e34-4027-82d4-c58a798f7201`
- **Package:** `c8c17f53-3257-4785-8676-0931dac13633`
- **Video job:** `e872b684-a6bc-40a3-aa4a-573bec78c959`
- **Primary content item (rendered):** `086d0a35-43dd-4f5c-8fa2-072ed858b72c` (tiktok reel)

## 1. Základní informace o videu

- **Název package:** After Hours, Chats Still Screaming
- **Projekt:** Fenrik.chat (`aabab9ff-9db4-4012-a53c-135e3bfea6cd`)
- **Creative mode:** observation
- **Funnel stage:** awareness
- **Cílové platformy (content_items v package):** facebook, instagram, linkedin, tiktok, x, youtube
- **Primary render platform:** tiktok
- **Jazyk:** en
- **Plánovaná délka (package_brief.video.duration_seconds):** 25
- **Skutečná video duration (debug.video_duration):** 22.166667 s
- **Skutečná audio duration (debug.audio_duration):** 22.164 s
- **Speech duration (debug.speech_duration):** 20.664 s
- **Počet scén (render_spec.scenes):** 5
- **Render status:** completed
- **Run item status:** completed
- **Production run status:** completed

### URLs / storage

- **Finální MP4 (signed URL v DB — token může expirvat):** viz `video_jobs.output.mp4_url`
- **Finální MP4 storage path:** `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/output.mp4`
- **Lokální MP4 (staženo):** `reports/audit-b98a3ba8/output.mp4`
- **Thumbnail storage path:** `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/thumbnail.png`
- **Lokální thumbnail:** `reports/audit-b98a3ba8/thumbnail.png`
- **Subtitle SRT storage path:** `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/subtitles.srt`
- **Lokální SRT:** `reports/audit-b98a3ba8/subtitles.srt`

### Modely / voice

- **Voice provider:** OpenAI TTS (via video_engine worker)
- **Voice ID / name:** cedar
- **TTS model:** gpt-4o-mini-tts
- **Whisper model (subtitle align):** whisper-1
- **Image model:** gpt-image-1
- **Video provider:** video_engine
- **Video job.model field:** null
- **Visual profile (job input):** NATURAL
- **Visual medium:** CLEAN_ILLUSTRATION
- **Resolved visual profile (presentation_generation):** NATURAL (source=package_snapshot)

## 2. Kompletní voiceover

### 2.1 Finální voiceover (TTS input / package voiceover_text)

Zdroj: `video_jobs.input.voiceover_text` == `package_brief.voiceover_text`

```
After hours, chats still screaming. Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothing. Not a word. They didn't leave a message. They just left. The website wasn't broken. It was silent. Your AI assistant answers the moment someone asks — even when you can't.
```

- **Počet slov (regex word tokens):** 56
- **Whisper word count:** 55
- **Odhadované tempo (words / speech_duration * 60):** 162.6 WPM
- **Hook line (package / job / candidate):** After hours, chats still screaming.
- **První spoken unit (první věta VO):** After hours, chats still screaming.
- **CTA (package_brief.cta.text):** Create your AI assistant — let your website answer while you're closed.
- **CTA type:** sign_up
- **Produktový reveal (spoken — poslední věta VO):** Your AI assistant answers the moment someone asks — even when you can't.
- **On-screen CTA v script BEAT 5:** Create your AI assistant. (script only; spoken CTA not in VO)

### 2.2 Voiceover podle scén (mapování SRT midpoint → render_spec scene windows)

Poznámka: worker neukládá explicitní per-scene VO split. Níže je odvozeno z Whisper SRT cue midpointů vůči `render_spec.scenes[].duration_seconds` (všechny 4.0 s).

| Scéna | Start | Konec | VO (SRT cues v okně) | Words |
|---|---:|---:|---|---:|
| `scene-1` | 0.0s | 4.0s | After hours, chats still screaming. Your website looks great. | 9 |
| `scene-2` | 4.0s | 8.0s | Professional logo. Clean layout. And yet — every visitor who | 9 |
| `scene-3` | 8.0s | 12.0s | needed an answer after 6 PM got nothing. Not a word. | 11 |
| `scene-product-demo` | 12.0s | 16.0s | They didn't leave a message. They just left. The website wasn't broken. | 12 |
| `scene-5` | 16.0s | 20.0s | It was silent. Your AI assistant answers the moment someone asks — | 11 |
| _(tail after scene slots)_ | 20.0s | 22.17s | even when you can't. _(SRT cue #20 midpoint 20.73s — mimo poslední 4s slot; stále ve speech/video)_ | 4 |

- **Speech po poslední scene boundary (20.0s) / tail buffer:** speech_duration=20.664s; debug.srt_last_cue_end=20.664s; actual SRT last cue end=20.980s; tail_buffer_seconds=1.5; video_duration=22.166667s
- **Pauzy mezi větami/scénami (explicitní):** NOT AVAILABLE (neuloženo jako samostatná data; pouze SRT cue gaps)
- **Word-count note:** regex VO/SRT tokens = 56; `debug.whisper_word_count` = 55 (DB field; not recomputed here)

### 2.3 Variantní texty (přesné)

#### A) Candidate hookLine
```
After hours, chats still screaming.
```

#### B) Package / job voiceover_text (TTS input)
```
After hours, chats still screaming. Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothing. Not a word. They didn't leave a message. They just left. The website wasn't broken. It was silent. Your AI assistant answers the moment someone asks — even when you can't.
```

#### C) Package / job subtitles (pipe-separated phrases, pre-Whisper)
```
After hours, chats still screaming. | Your website looks great. | Professional logo. Clean layout. | Every visitor who needed an answer after 6 PM — got nothing. | Not a word. They just left. | The website wasn't broken. It was silent. | Your AI assistant answers the moment someone asks — even when you can't.
```

#### D) Whisper SRT (plain text concatenated)
```
After hours, chats still screaming. Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothing. Not a word. They didn't leave a message. They just left. The website wasn't broken. It was silent. Your AI assistant answers the moment someone asks — even when you can't.
```

#### E) Script VO lines (z package_brief.video.script)
**Script beat VO 1:**
```
After hours, chats still screaming.
```

**Script beat VO 2:**
```
Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothing. Not a word.
```

**Script beat VO 3:**
```
They didn
```

**Script beat VO 4:**
```
Your AI assistant answers the moment someone asks — even when you can
```

#### F) Content item bodies (platform copies — same VO body)
- Distinct body texts among 11 items: 1
- Všechny content_items.body == package voiceover_text
#### Rozdíly mezi variantami

- Hook candidate == first spoken unit: YES (exact)
- VO text vs Whisper SRT plain: MATCH (normalized)
- Pre-Whisper subtitle phrases vs VO: phrases are a segmented paraphrase of VO (see pipe list); not identical sentence boundaries.
- Script BEAT 2 VO includes: `And yet — every visitor who needed an answer after 6 PM got nothing. Not a word.` — matches VO mid-section.
- Script BEAT 5 says Voiceover fades / On-screen CTA; final VO has no fade marker and ends with product line; no separate spoken CTA.
- TTS validation: passed=True; attempts=1; retry_used=False; fallback_used=False

- **Opravený/finalizovaný VO oddělený od originálu:** NOT AVAILABLE (jeden voiceover_text; žádný stored pre-repair VO)
- **Explicit TTS input field oddělený od voiceover_text:** NOT AVAILABLE (TTS používá voiceover_text)

## 3. Časová osa videa

Zdroj scén: `video_jobs.output.render_spec.scenes` + `metadata.semantic_motion.beats`.
Zdroj subtitle timing: Whisper SRT.

| Scéna | Start | Konec | Délka | Voiceover (SRT v okně) | Subtitle cues | Visual purpose (prompt summary) | Beat | Scene type |
|---|---:|---:|---:|---|---|---|---|---|
| `scene-1` | 0.0s | 4.0s | 4.0s | After hours, chats still screaming. Your website looks great. | After hours, / chats still screaming. / Your website looks great. | Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a re… | HOOK | `IMAGE` |
| `scene-2` | 4.0s | 8.0s | 4.0s | Professional logo. Clean layout. And yet — every visitor who | Professional logo. / Clean layout. / And yet — / every visitor who | Clean flat illustration, portrait 9:16 vertical frame. Wide environmental shot of the same small business interior at ni… | SETUP | `IMAGE` |
| `scene-3` | 8.0s | 12.0s | 4.0s | needed an answer after 6 PM got nothing. Not a word. | needed an answer / after 6 PM / got nothing. / Not a word. | Clean flat illustration, portrait 9:16 vertical frame. A person sits alone in a dim room at night — seen from slightly a… | ESCALATION | `IMAGE` |
| `scene-product-demo` | 12.0s | 16.0s | 4.0s | They didn't leave a message. They just left. The website wasn't broken. | They didn't leave / a message. / They just left. / The website wasn't broken. | PRODUCT_DEMO: after_hours_response / lead_captured | PRODUCT_DEMO | `PRODUCT_DEMO` |
| `scene-5` | 16.0s | 20.0s | 4.0s | It was silent. Your AI assistant answers the moment someone asks — | It was silent. / Your AI assistant / answers the moment / someone asks — | Clean flat illustration, portrait 9:16 vertical frame. Night exterior of the same small service business — the storefron… | RESOLUTION/CLOSE | `IMAGE` |

### Motion / transitions / overlaps

| Scéna | Motion intent | Motion primitive | Intensity | Transition in | Transition out | Zoom/pan/crop |
|---|---|---|---|---|---|---|
| `scene-1` | ATTENTION | zoom_in | MEDIUM | NOT AVAILABLE | NOT AVAILABLE | zoom_in |
| `scene-2` | EXPLAIN | drift_up | LOW | NOT AVAILABLE | NOT AVAILABLE | pan/drift |
| `scene-3` | EXPLAIN | drift_down | LOW | NOT AVAILABLE | NOT AVAILABLE | pan/drift |
| `scene-product-demo` | REVEAL | zoom_out | LOW | NOT AVAILABLE | NOT AVAILABLE | zoom_out |
| `scene-5` | CLOSE | static | LOW | NOT AVAILABLE | NOT AVAILABLE | static |

- **Music:** NOT AVAILABLE (sfx_selected=false; sfx_mixed=false)
- **Sound effects:** not_selected (not_selected)
- **Explicit silence markers:** NOT AVAILABLE
- **Scene/VO overlap model:** Scenes are sequential stills with motion Ken-Burns; VO is continuous Whisper timeline. No stored per-scene audio stems. Cues can straddle scene boundaries by midpoint mapping only.
- **SRT cues crossing scene boundaries:**
  - `Your website looks great.` crosses end of `scene-1` @ 4.0s
  - `every visitor who` crosses end of `scene-2` @ 8.0s
  - `Not a word.` crosses end of `scene-3` @ 12.0s
  - `The website wasn't broken.` crosses end of `scene-product-demo` @ 16.0s
  - `someone asks —` crosses end of `scene-5` @ 20.0s

### Narrative duration plan vs rendered scene slots

| Narrative role | Planned duration (timeline_debug) | Share |
|---|---:|---:|
| HOOK | 6.29s | 0.282 |
| SETUP | 4.86s | 0.218 |
| ESCALATION | 6.86s | 0.308 |
| RESOLUTION | 4.29s | 0.192 |

- Planned total (sum narrative): 22.30s
- Rendered scene slots total: 20.0s (+ tail buffer → video 22.166667s)
- Package script planned: 25s (BEAT windows 0–25)

## 4. Vizuální scény


### Scene 1: `scene-1` (IMAGE)

- **Finální image storage:** `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/scene-scene-1.png`
- **Lokální path:** `reports/audit-b98a3ba8/scenes/scene-scene-1.png`
- **Renderer version:** image@1
- **Duration (render_spec):** 4.0s
- **Motion:** ATTENTION / zoom_in / MEDIUM
- **Původní image prompt (package visual_scenes / payload):** viz níže

**Původní (package visual_scenes):**
```
Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a reception counter with a glowing tablet propped upright, its screen showing a stream of stacked chat message bubbles in soft amber and blue, none with replies. A single security light casts a warm cone of light over the counter. The room beyond is dark and empty — chairs tucked in, door closed, branded signage visible but unlit. The tablet screen is the only active light source in the frame. Person is absent — the emptiness is the meaning. Tight crop on the counter and tablet, subject centered in vertical frame. Warm amber highlights from the security light, cool dark surroundings. Clean flat illustration style, soft gradients, simplified shapes, not photorealistic. Quiet unease mood. No readable text on the tablet screen — only recognizable chat bubble shapes.
```

**Finální (render_spec.scenes[].image_prompt):**
```
Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a reception counter with a glowing tablet propped upright, its screen showing a stream of stacked chat message bubbles in soft amber and blue, none with replies. A single security light casts a warm cone of light over the counter. The room beyond is dark and empty — chairs tucked in, door closed, branded signage visible but unlit. The tablet screen is the only active light source in the frame. Person is absent — the emptiness is the meaning. Tight crop on the counter and tablet, subject centered in vertical frame. Warm amber highlights from the security light, cool dark surroundings. Clean flat illustration style, soft gradients, simplified shapes, not photorealistic. Quiet unease mood. No readable text on the tablet screen — only recognizable chat bubble shapes.
```

- Prompt změna package → render_spec: NONE (identical)

- **Negative prompt:** NOT AVAILABLE
- **Narrative beat (timeline_debug):** HOOK
- **Scene summary (timeline_debug):** Clean flat illustration, portrait 9:16 vertical frame. Night scene: a small service business interior in darkness — a r…
- **Comprehension:** {"viewer_question": "What happens to the person in: After hours, chats still screaming?", "viewer_expectation": "The explanation is coming.", "viewer_understands": "Something unusual is happening: Night"}
- **Creative DNA world:** Night: small business dark
- **Creative Identity environment (runtime):** Apply visual treatment inside the canonical Creative DNA world: Night: small business dark
- **Creative Identity treatment (mood/camera/lighting/color):** mood=quiet optimism; camera=wide environmental framing; lighting=open shade outdoor light; color=warm wood surfaces and amber highlights; composition=tight crop on hands and workspace; human_presence=person small in frame within a larger environment
- **Visual Narrative primary_meaning_carrier:** human
- **Visual Narrative storytelling_mode:** situation_first
- **Opening event (candidate):** Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.
- **Opening event verb/cue (fidelity):** unread_message
- **Product placement:** product not in this still; AI assistant spoken later
- **Text-in-image / NO_TEXT:** Prompts include `No readable text` / `no readable letters` / chat bubbles as shapes only (IMAGE scenes). PRODUCT_DEMO renderer shows readable chat UI text by design.
- **Regeneration history:** NOT AVAILABLE
- **Počet pokusů (image step retry_count):** 0
- **Per-scene errors/fallbacks:** NOT AVAILABLE
- **Chosen asset:** none (AI generated; asset_usage=[])
- **Image model:** gpt-image-1
- **Image model parameters (size/quality/seed):** NOT AVAILABLE

### Scene 2: `scene-2` (IMAGE)

- **Finální image storage:** `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/scene-scene-2.png`
- **Lokální path:** `reports/audit-b98a3ba8/scenes/scene-scene-2.png`
- **Renderer version:** image@1
- **Duration (render_spec):** 4.0s
- **Motion:** EXPLAIN / drift_up / LOW
- **Původní image prompt (package visual_scenes / payload):** viz níže

**Původní (package visual_scenes):**
```
Clean flat illustration, portrait 9:16 vertical frame. Wide environmental shot of the same small business interior at night — the full space visible: a tidy, well-branded service counter, clean shelving, a professional logo mark on the wall (no readable letters), everything orderly and polished. But the lights are off, no one is present, and the space is completely still. A faint warm amber glow from the security light near the entrance. The business looks professional and trustworthy — but entirely silent and empty. Person small in frame or absent entirely — the environment carries the meaning. Open shade quality, warm wood surface tones, cool dark ambient. Flat illustration, soft gradients, no photorealism. No readable text anywhere in the scene.
```

**Finální (render_spec.scenes[].image_prompt):**
```
Clean flat illustration, portrait 9:16 vertical frame. Wide environmental shot of the same small business interior at night — the full space visible: a tidy, well-branded service counter, clean shelving, a professional logo mark on the wall (no readable letters), everything orderly and polished. But the lights are off, no one is present, and the space is completely still. A faint warm amber glow from the security light near the entrance. The business looks professional and trustworthy — but entirely silent and empty. Person small in frame or absent entirely — the environment carries the meaning. Open shade quality, warm wood surface tones, cool dark ambient. Flat illustration, soft gradients, no photorealism. No readable text anywhere in the scene.
```

- Prompt změna package → render_spec: NONE (identical)

- **Negative prompt:** NOT AVAILABLE
- **Narrative beat (timeline_debug):** SETUP
- **Scene summary (timeline_debug):** Clean flat illustration, portrait 9:16 vertical frame. Wide environmental shot of the same small business interior at n…
- **Comprehension:** {"viewer_question": "Why is this happening / what does it cost?", "viewer_expectation": "Someone should solve this — or stakes will rise.", "viewer_understands": "The problem is: After hours, chats still screaming"}
- **Creative DNA world:** Night: small business dark
- **Creative Identity environment (runtime):** Apply visual treatment inside the canonical Creative DNA world: Night: small business dark
- **Creative Identity treatment (mood/camera/lighting/color):** mood=quiet optimism; camera=wide environmental framing; lighting=open shade outdoor light; color=warm wood surfaces and amber highlights; composition=tight crop on hands and workspace; human_presence=person small in frame within a larger environment
- **Visual Narrative primary_meaning_carrier:** human
- **Visual Narrative storytelling_mode:** situation_first
- **Product placement:** product not in this still; AI assistant spoken later
- **Text-in-image / NO_TEXT:** Prompts include `No readable text` / `no readable letters` / chat bubbles as shapes only (IMAGE scenes). PRODUCT_DEMO renderer shows readable chat UI text by design.
- **Regeneration history:** NOT AVAILABLE
- **Počet pokusů (image step retry_count):** 0
- **Per-scene errors/fallbacks:** NOT AVAILABLE
- **Chosen asset:** none (AI generated; asset_usage=[])
- **Image model:** gpt-image-1
- **Image model parameters (size/quality/seed):** NOT AVAILABLE

### Scene 3: `scene-3` (IMAGE)

- **Finální image storage:** `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/scene-scene-3.png`
- **Lokální path:** `reports/audit-b98a3ba8/scenes/scene-scene-3.png`
- **Renderer version:** image@1
- **Duration (render_spec):** 4.0s
- **Motion:** EXPLAIN / drift_down / LOW
- **Původní image prompt (package visual_scenes / payload):** viz níže

**Původní (package visual_scenes):**
```
Clean flat illustration, portrait 9:16 vertical frame. A person sits alone in a dim room at night — seen from slightly above and behind, small in the frame within a larger dark environment. They hold a smartphone, screen facing the viewer, showing a website chat interface with a typed question and an empty, unresponsive reply area — a blank waiting state. The person's posture is slightly forward, waiting. After a moment of no response, their thumb reaches to close or navigate away. The mood is quiet frustration and resignation — not anger. Warm amber highlight from a nearby lamp on the left side of the frame, cool dark surroundings. Tight crop on hands and the phone screen area, subject centered vertically. Flat illustration style, simplified shapes, soft gradients. No readable text on the phone screen — only recognizable interface shapes and empty reply bubble.
```

**Finální (render_spec.scenes[].image_prompt):**
```
Clean flat illustration, portrait 9:16 vertical frame. A person sits alone in a dim room at night — seen from slightly above and behind, small in the frame within a larger dark environment. They hold a smartphone, screen facing the viewer, showing a website chat interface with a typed question and an empty, unresponsive reply area — a blank waiting state. The person's posture is slightly forward, waiting. After a moment of no response, their thumb reaches to close or navigate away. The mood is quiet frustration and resignation — not anger. Warm amber highlight from a nearby lamp on the left side of the frame, cool dark surroundings. Tight crop on hands and the phone screen area, subject centered vertically. Flat illustration style, simplified shapes, soft gradients. No readable text on the phone screen — only recognizable interface shapes and empty reply bubble.
```

- Prompt změna package → render_spec: NONE (identical)

- **Negative prompt:** NOT AVAILABLE
- **Narrative beat (timeline_debug):** ESCALATION
- **Scene summary (timeline_debug):** Clean flat illustration, portrait 9:16 vertical frame. A person sits alone in a dim room at night — seen from slightly…
- **Comprehension:** {"viewer_question": "Can this be fixed?", "viewer_expectation": "Show the solution.", "viewer_understands": "The business is losing opportunities: reveal Unable to answer customer questions when offline (every unanswered online lead walks to a comp…"}
- **Creative DNA world:** Night: small business dark
- **Creative Identity environment (runtime):** Apply visual treatment inside the canonical Creative DNA world: Night: small business dark
- **Creative Identity treatment (mood/camera/lighting/color):** mood=quiet optimism; camera=wide environmental framing; lighting=open shade outdoor light; color=warm wood surfaces and amber highlights; composition=tight crop on hands and workspace; human_presence=person small in frame within a larger environment
- **Visual Narrative primary_meaning_carrier:** human
- **Visual Narrative storytelling_mode:** situation_first
- **Product placement:** product not in this still; AI assistant spoken later
- **Text-in-image / NO_TEXT:** Prompts include `No readable text` / `no readable letters` / chat bubbles as shapes only (IMAGE scenes). PRODUCT_DEMO renderer shows readable chat UI text by design.
- **Regeneration history:** NOT AVAILABLE
- **Počet pokusů (image step retry_count):** 0
- **Per-scene errors/fallbacks:** NOT AVAILABLE
- **Chosen asset:** none (AI generated; asset_usage=[])
- **Image model:** gpt-image-1
- **Image model parameters (size/quality/seed):** NOT AVAILABLE

### Scene 4: `scene-product-demo` (PRODUCT_DEMO)

- **Finální image storage:** `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/scene-scene-product-demo.png`
- **Lokální path:** `reports/audit-b98a3ba8/scenes/scene-scene-product-demo.png`
- **Renderer version:** product_demo@1
- **Duration (render_spec):** 4.0s
- **Motion:** REVEAL / zoom_out / LOW
- **Původní image prompt (package visual_scenes / payload):** viz níže

**Původní (package visual_scenes):**
```
PRODUCT_DEMO payload (no AI image prompt): {"type": "product_demo", "actor_id": "primary_actor", "ai_answer": "Yes! We have openings Tuesday and Thursday afternoon. I can collect your details so the team reaches out to confirm — what's your name and best email?", "brand_name": "Fenrik.chat", "demo_variant": "after_hours_response", "outcome_type": "lead_captured", "outcome_label": "Lead captured — contact details collected at 11:42 PM", "conversation_id": "demo-afterhours-001", "outcome_visible": true, "question_visible": true, "visitor_question": "Do you have any availability this week for a consultation?", "ai_answer_visible": true}
```

**Finální (render_spec.scenes[].image_prompt):**
```
presentation:product_demo:scene-product-demo
```

- PRODUCT_DEMO: render_spec image_prompt is stub `presentation:product_demo:scene-product-demo`; raster is typed renderer output.

- **Negative prompt:** NOT AVAILABLE
- **Narrative beat (timeline_debug):** RESOLUTION
- **Scene summary (timeline_debug):** Clean flat illustration, portrait 9:16 vertical frame. Night exterior of the same small service business — the storefro…
- **Comprehension:** {"viewer_question": "none", "viewer_expectation": "Finished.", "viewer_understands": "The product solves this: AI chatbot platform for websites handles the website moment shown in the opening — without replacing the scene's h…"}
- **Creative DNA world:** Night: small business dark
- **Creative Identity environment (runtime):** Apply visual treatment inside the canonical Creative DNA world: Night: small business dark
- **Creative Identity treatment (mood/camera/lighting/color):** mood=quiet optimism; camera=wide environmental framing; lighting=open shade outdoor light; color=warm wood surfaces and amber highlights; composition=tight crop on hands and workspace; human_presence=person small in frame within a larger environment
- **Visual Narrative primary_meaning_carrier:** human
- **Visual Narrative storytelling_mode:** situation_first
- **Product placement:** PRODUCT_DEMO payload

**PRODUCT_DEMO payload_snapshot:**
```json
{
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
```

- **Text-in-image / NO_TEXT:** Prompts include `No readable text` / `no readable letters` / chat bubbles as shapes only (IMAGE scenes). PRODUCT_DEMO renderer shows readable chat UI text by design.
- **Regeneration history:** NOT AVAILABLE
- **Počet pokusů (image step retry_count):** 0
- **Per-scene errors/fallbacks:** NOT AVAILABLE
- **Chosen asset:** none (AI generated; asset_usage=[])
- **Image model:** gpt-image-1
- **Image model parameters (size/quality/seed):** NOT AVAILABLE

### Scene 5: `scene-5` (IMAGE)

- **Finální image storage:** `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/scene-scene-5.png`
- **Lokální path:** `reports/audit-b98a3ba8/scenes/scene-scene-5.png`
- **Renderer version:** image@1
- **Duration (render_spec):** 4.0s
- **Motion:** CLOSE / static / LOW
- **Původní image prompt (package visual_scenes / payload):** viz níže

**Původní (package visual_scenes):**
```
Clean flat illustration, portrait 9:16 vertical frame. Night exterior of the same small service business — the storefront seen from outside, closed and dark. But through the front window, the tablet on the counter glows softly with a warm light, now showing a filled chat conversation — answered bubbles visible as shapes, no readable text. The street outside is quiet. The business is closed, but something inside is still active and responding. A sense of quiet optimism — the problem has shifted. Warm amber glow from inside the window against the cool night blue of the exterior. Wide environmental framing, subject (the building) small and centered in the vertical frame with sky above and pavement below. Flat illustration, soft gradients, simplified shapes. No readable text anywhere.
```

**Finální (render_spec.scenes[].image_prompt):**
```
Clean flat illustration, portrait 9:16 vertical frame. Night exterior of the same small service business — the storefront seen from outside, closed and dark. But through the front window, the tablet on the counter glows softly with a warm light, now showing a filled chat conversation — answered bubbles visible as shapes, no readable text. The street outside is quiet. The business is closed, but something inside is still active and responding. A sense of quiet optimism — the problem has shifted. Warm amber glow from inside the window against the cool night blue of the exterior. Wide environmental framing, subject (the building) small and centered in the vertical frame with sky above and pavement below. Flat illustration, soft gradients, simplified shapes. No readable text anywhere.
```

- Prompt změna package → render_spec: NONE (identical)

- **Negative prompt:** NOT AVAILABLE
- **Narrative beat:** RESOLUTION/CLOSE
- **Note:** 5th visual beat; 4-role narrative plan maps RESOLUTION to exterior — this scene is the close exterior.
- **Creative DNA world:** Night: small business dark
- **Creative Identity environment (runtime):** Apply visual treatment inside the canonical Creative DNA world: Night: small business dark
- **Creative Identity treatment (mood/camera/lighting/color):** mood=quiet optimism; camera=wide environmental framing; lighting=open shade outdoor light; color=warm wood surfaces and amber highlights; composition=tight crop on hands and workspace; human_presence=person small in frame within a larger environment
- **Visual Narrative primary_meaning_carrier:** human
- **Visual Narrative storytelling_mode:** situation_first
- **Product placement:** answered chat glow / outcome
- **Text-in-image / NO_TEXT:** Prompts include `No readable text` / `no readable letters` / chat bubbles as shapes only (IMAGE scenes). PRODUCT_DEMO renderer shows readable chat UI text by design.
- **Regeneration history:** NOT AVAILABLE
- **Počet pokusů (image step retry_count):** 0
- **Per-scene errors/fallbacks:** NOT AVAILABLE
- **Chosen asset:** none (AI generated; asset_usage=[])
- **Image model:** gpt-image-1
- **Image model parameters (size/quality/seed):** NOT AVAILABLE

## 5. Titulky


### Celý subtitle transcript (SRT plain)
```
After hours, chats still screaming. Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothing. Not a word. They didn't leave a message. They just left. The website wasn't broken. It was silent. Your AI assistant answers the moment someone asks — even when you can't.
```

### Segmenty (Whisper SRT)

| # | Start | End | Dur | Words | Chars | Text (raw SRT, vč. highlight tags) |
|---:|---:|---:|---:|---:|---:|---|
| 1 | 0.000 | 1.380 | 1.380 | 2 | 12 | After hours, |
| 2 | 1.380 | 2.720 | 1.340 | 3 | 22 | chats still screaming. |
| 3 | 2.720 | 4.480 | 1.760 | 4 | 25 | Your website looks great. |
| 4 | 4.480 | 5.480 | 1.000 | 2 | 18 | Professional logo. |
| 5 | 5.480 | 6.480 | 1.000 | 2 | 13 | Clean layout. |
| 6 | 6.480 | 7.480 | 1.000 | 2 | 9 | And yet — |
| 7 | 7.480 | 8.480 | 1.000 | 3 | 17 | every visitor who |
| 8 | 8.480 | 9.480 | 1.000 | 3 | 16 | needed an answer |
| 9 | 9.480 | 10.480 | 1.000 | 3 | 10 | after <b>6</b> <b>PM</b> |
| 10 | 10.480 | 11.480 | 1.000 | 2 | 12 | got nothing. |
| 11 | 11.480 | 12.480 | 1.000 | 3 | 11 | Not a word. |
| 12 | 12.480 | 13.480 | 1.000 | 3 | 17 | They didn't leave |
| 13 | 13.480 | 14.480 | 1.000 | 2 | 10 | a message. |
| 14 | 14.480 | 15.480 | 1.000 | 3 | 15 | They just left. |
| 15 | 15.480 | 16.480 | 1.000 | 4 | 26 | The website wasn't broken. |
| 16 | 16.480 | 17.480 | 1.000 | 3 | 14 | It was silent. |
| 17 | 17.480 | 18.480 | 1.000 | 3 | 17 | Your <b>AI</b> assistant |
| 18 | 18.480 | 19.480 | 1.000 | 3 | 18 | answers the moment |
| 19 | 19.480 | 20.480 | 1.000 | 2 | 14 | someone asks — |
| 20 | 20.480 | 20.980 | 0.500 | 4 | 20 | even when you can't. |

- **Počet segmentů:** 20
- **Max slov na segment:** 4
- **Max znaků na segment:** 26
- **Subtitle source:** whisper
- **Language detected:** english
- **Subtitle warning:** False
- **srt_last_cue_end:** 20.664
- **subtitle_timeline_duration:** 20.664
- **Maximální počet znaků na řádek (config):** NOT AVAILABLE
- **Počet řádků layout config:** NOT AVAILABLE
- **Styling config (CSS/ASS):** NOT AVAILABLE
- **Pozice:** NOT AVAILABLE
- **Font:** NOT AVAILABLE
- **Velikost:** NOT AVAILABLE
- **Safe area:** NOT AVAILABLE
- **Highlighting / word emphasis:** YES — SRT obsahuje `<b>…</b>` na `6`, `PM`, `AI`

### Shoda VO ↔ subtitles

- Normalized VO vs SRT plain: MATCH
- match_ratio (debug): 0.9310344827586207
- VO word count: 56; Whisper word count: 55
- Token sequences identical (lowercased alnum).

### Pre-Whisper pipe phrases
1. `After hours, chats still screaming.`
2. `Your website looks great.`
3. `Professional logo. Clean layout.`
4. `Every visitor who needed an answer after 6 PM — got nothing.`
5. `Not a word. They just left.`
6. `The website wasn't broken. It was silent.`
7. `Your AI assistant answers the moment someone asks — even when you can't.`

## 6. Audio

- **Voice provider:** OpenAI TTS
- **Voice:** cedar
- **Model:** gpt-4o-mini-tts
- **Speed:** NOT AVAILABLE
- **Pitch:** NOT AVAILABLE
- **Style / emotion (tts_instructions):** viz níže

**tts_instructions (full):**
```
Speak naturally for a short vertical social video. Language: en. Tone: Simple and accessible; Direct and action-oriented; Transparent and honest; Friendly and approachable; Concise and practical. Read the script exactly; do not add or skip words. Delivery: natural, curious, conversational. Delivery: thoughtful, reflective, steady pacing. Delivery: confident, concise, not aggressive. Opening: lightly playful, never cartoonish. Then settle into conversational body delivery. Use spoken rhythm: shor
```

- **opening_delivery:** playful
- **delivery_arc / delivery_reason:** Delivery: natural, curious, conversational. Delivery: thoughtful, reflective, steady pacing. Delivery: warm and approachable. Delivery: confident, concise, not aggressive. Language: en.
- **Audio duration:** 22.164 s
- **Speech duration:** 20.664 s
- **Audio file path (standalone):** NOT AVAILABLE (voice.wav/mp3 not found in video-renders under common names; audio muxed into MP4)
- **Lokální standalone audio:** NOT AVAILABLE
- **Normalizace hlasitosti:** NOT AVAILABLE
- **Music path:** NOT AVAILABLE
- **Music volume:** NOT AVAILABLE
- **Ducking:** NOT AVAILABLE
- **Fade-in / fade-out:** NOT AVAILABLE
- **Sound effects:** sfx_selected=False; sfx_mixed=False; reason=not_selected
- **Loudness / peak data:** NOT AVAILABLE
- **TTS errors:** none (tts_tail_validation_passed=true; retry_used=false; fallback_used=false)
- **TTS validation log:** [{"pass": true, "attempt": 1, "expected_tail": ["someone", "asks", "even", "when", "you", "cant"], "durationSeconds": 20.664, "transcript_tail": ["the", "moment", "someone", "asks", "even", "when", "you", "cant"]}]

## 7. Creative decision chain


### 7.1 Creative Candidates + scores

| ID | Family | Hook | stopPower | commercial | creative weighted | finalSelection | rejected | reasons |
|---|---|---|---:|---:|---:|---:|---|---|
| `c1-consequence_first-div` | consequence_first | Competitor wins before you pick up. | 9 | 111 | 76.2 | 187.2 | True | topic_collapsed_to_generic_business |
| `c2-absurd_understandable-div` | absurd_understandable | Airport logic applied to the wrong queue. | 7 | 24 | 75.45 | 99.45 | True | topic_collapsed_to_generic_business |
| `c3-role_reversal-div` | role_reversal | Nobody home except the waiting chat. | 6 | 100 | 69.3 | 169.3 | True | topic_collapsed_to_generic_business |
| `c4-direct_product_world-div` | direct_product_world | Urgent question dies in silence. | 5 | 148 | 70.5 | 218.5 | True | topic_collapsed_to_generic_business |
| `c5-social_observation-div` | social_observation | Dual clocks, one shameful. | 5 | 51.5 | 62.8 | 114.3 | True | topic_collapsed_to_generic_business |
| `c6-human_conflict-div` | human_conflict | Departure board for the wrong channel. | 7 | 79 | 68.85000000000001 | 147.85000000000002 | True | topic_collapsed_to_generic_business |
| `c7-visual_exaggeration-div` | visual_exaggeration | After hours, chats still screaming. | 8 | 121.5 | 78.39999999999999 | 199.89999999999998 | True | topic_collapsed_to_generic_business |

- **Shortlist:** c1-consequence_first-div, c7-visual_exaggeration-div
- **Winner:** c7-visual_exaggeration-div
- **Winner reason:** selection=stop_shortlist_then_commercial; stop_shortlist=c1-consequence_first-div,c7-visual_exaggeration-div; final_selection_score=199.9; creative_score=78.4; commercial_score=121.5; stop=8; max_stop_in_pool=9; comprehension=5; originality=5; renderability=9; first_frame=8; product_demo=5; human_problem=8; family=visual_exaggeration; core=After hours, chats still screaming
- **Selected hook:** After hours, chats still screaming.
- **Selected openingSituation:** Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.
- **Selected family:** visual_exaggeration
- **Selected creative mode (job):** observation
- **Selected emotional reaction (candidate):** unease
- **Attention mechanism:** IRONY
- **Attention emotional effect:** humor
- **Attention opening visual motif:** productivity_trophy_collecting_dust_next_overflowing
- **Attention selected visual concept:** A productivity trophy collecting dust next to an overflowing unread ideas pile about A local service business owner reviews her website analytics for the first time in months and discovers dozens of visitors came and left without a trace — no leads, no messages, no contact. The website looked professional, but it was completely silent. The video reframes what a website is actually supposed to do: not just look good, but respond. Pain point anchored to visitors leaving before contacting you and losing leads due to lack of instant website support.
- **Opening structure:** immediate_reaction
- **Opening motion intent:** ATTENTION

### 7.2 Opening Contract (attention.opening)

```json
{
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
}
```

### 7.3 Creative DNA (selectedCandidate.creativeDNA — used at render)

```json
{
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
}
```

### 7.4 Creative Identity (presentation_generation — runtime)

```json
{
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
}
```

### 7.5 Narrative Beats

```json
[
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
]
```

### 7.6 Product Reveal plan

```json
{
  "reasons": [
    "story_prefers_outcome_over_framed:human",
    "fallback:abstract_system"
  ],
  "version": "product-reveal@2",
  "solution_beat_strategy": "ABSTRACT_PRODUCT_SYSTEM",
  "sample_payoff_visual_required": false
}
```

### 7.7 Visual Narrative plan

```json
{
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
}
```

### 7.8 Fidelity results

- **finalScriptFidelity.passed:** True
- **finalStoryboardFidelity.passed:** True
**Script fidelity diagnostics:**
```json
[
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
]
```

**Storyboard fidelity diagnostics:**
```json
[
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
]
```

### 7.9 Story Integrity

```json
{
  "passed": true,
  "summary": "story_integrity_passed",
  "version": "story-integrity@1",
  "warnings": [],
  "violations": [],
  "ctaMatch": {
    "evidence": "onscreen_cta_not_requested_skip_spoken_cta_check",
    "packageCta": "Create your AI assistant — let your website answer while you're closed.",
    "ctaMismatch": false,
    "voiceoverContainsCta": true
  },
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
}
```

### 7.10 Repairs / retries / fallbacks

- **creative_candidates.regenerationReason:** None
- **identityEnvironmentSuppressed:** True
- **DNA fallbackUsed:** False
- **TTS retries:** 1
- **TTS tail retry used:** False
- **Render fallback_used:** False
- **Image generation retry_count:** 0
- **All candidates soft-rejected:** YES — topic_collapsed_to_generic_business (GEN-1 stop-preferred pool used)

## 8. Rozdíly mezi plánem a finálním videem

Bez hodnocení kvality — pouze pozorované rozdíly.

### Candidate → Narrative
- Candidate openingSituation: `Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.`
- Narrative HOOK viewerLearns: `Night: small business dark; security light on; tablet shows unanswered website chats glowing during peak demand overload.`
- Candidate emotionalReaction=`unease` vs Attention opening_emotional_effect=`humor` / Identity mood=`quiet optimism`
- Attention preferred visual (trophy) vs Candidate opening (night chats): Attention concept NOT used as scene 1.

### Narrative → Presentation / Script
- Narrative roles: HOOK, SETUP, ESCALATION, RESOLUTION (4).
- Presentation/script beats: 5 (adds PRODUCT DEMO + RESOLUTION/CTA).
- Narrative planned durations (6.29/4.86/6.86/4.29) ≠ render equal 4.0s × 5 scenes.
- Package script timeboxes sum to 25s; actual video ~22.17s.

### Presentation script VO vs final VO
- Script BEAT 5: Voiceover fades + on-screen CTA `Create your AI assistant.`
- Final VO: no fade; ends with product line; CTA only in package_brief.cta / platform copy, not spoken.
- Script BEAT 1 window `0–3s` vs render scene-1 `0–4s` vs narrative HOOK plan `6.29s`.
- **Scene/VO alignment vs script intent:** Script puts product VO on BEAT 4 (PRODUCT DEMO). With equal 4s render slots + Whisper timing, product line (`Your AI assistant…`) falls mainly on `scene-5` (16–20s+), while `scene-product-demo` (12–16s) carries escalation lines (`They didn't leave… The website wasn't broken.`).

### Scene prompts → Rendered scenes
- IMAGE prompts in package visual_scenes match render_spec image_prompt for scenes 1,2,3,5 (same text).
- Scene product-demo: typed PRODUCT_DEMO renderer; stub prompt `presentation:product_demo:scene-product-demo`.
- Image step: generated=5; reused=0; retry_count=0.

### Visual Narrative vs Scene 1
- VN preferred human meaning carrier / walking-away framing; Scene 1 is empty night + tablet (person absent) — follows Candidate opening, not VN preferred framing.

### Voiceover → Subtitles
- Pipe phrases: 7 segments.
- Whisper SRT: 20 cues with some `<b>` highlights.
- match_ratio=0.9310344827586207; word counts VO=56 Whisper=55.

### Final video packaging
- Planned 25s → actual 22.166667s (speech 20.664s + tail_buffer 1.5s).
- Scene stills + semantic motion primitives muxed with continuous VO + burned/ overlay SRT (subtitle_source=whisper).

## 9. Všechny dostupné soubory / artefakty


| Název | Typ | Path / URL | Exists | Available |
|---|---|---|---|---|
| Final MP4 | video | `reports/audit-b98a3ba8/output.mp4` | yes | yes |
| Final MP4 storage | storage | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/output.mp4` | yes | yes |
| Thumbnail | image | `reports/audit-b98a3ba8/thumbnail.png` | yes | yes |
| Subtitles SRT | subtitles | `reports/audit-b98a3ba8/subtitles.srt` | yes | yes |
| Scene image scene-1 | image | `reports/audit-b98a3ba8/scenes/scene-scene-1.png` | yes | yes |
| Scene storage scene-1 | storage | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/scene-scene-1.png` | yes | yes |
| Scene image scene-2 | image | `reports/audit-b98a3ba8/scenes/scene-scene-2.png` | yes | yes |
| Scene storage scene-2 | storage | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/scene-scene-2.png` | yes | yes |
| Scene image scene-3 | image | `reports/audit-b98a3ba8/scenes/scene-scene-3.png` | yes | yes |
| Scene storage scene-3 | storage | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/scene-scene-3.png` | yes | yes |
| Scene image scene-product-demo | image | `reports/audit-b98a3ba8/scenes/scene-scene-product-demo.png` | yes | yes |
| Scene storage scene-product-demo | storage | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/scene-scene-product-demo.png` | yes | yes |
| Scene image scene-5 | image | `reports/audit-b98a3ba8/scenes/scene-scene-5.png` | yes | yes |
| Scene storage scene-5 | storage | `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e872b684-a6bc-40a3-aa4a-573bec78c959/scene-scene-5.png` | yes | yes |
| Standalone voice audio | audio | `reports/audit-b98a3ba8/voice.wav` | no | no |
| Package JSON (DB dump) | json | `scripts/output/b98a3ba8/package.json` | yes | yes |
| Package brief JSON | json | `scripts/output/b98a3ba8/package-brief.json` | yes | yes |
| Video job JSON | json | `scripts/output/b98a3ba8/video-job.json` | yes | yes |
| Job input JSON | json | `scripts/output/b98a3ba8/job-input.json` | yes | yes |
| Render spec JSON | json | `scripts/output/b98a3ba8/render-spec.json` | yes | yes |
| Debug / render log JSON | json | `scripts/output/b98a3ba8/debug.json` | yes | yes |
| Presentation generation JSON | json | `scripts/output/b98a3ba8/presentation-generation.json` | yes | yes |
| Creative candidates (inside presentation-generation) | json | `scripts/output/b98a3ba8/presentation-generation.json → creative_candidates` | yes | yes |
| Narrative beats (inside presentation-generation) | json | `scripts/output/b98a3ba8/presentation-generation.json → narrative_beats` | yes | yes |
| Creative identity (inside presentation-generation) | json | `scripts/output/b98a3ba8/presentation-generation.json → creative_identity` | yes | yes |
| Creative DNA (selectedCandidate) | json | `scripts/output/b98a3ba8/presentation-generation.json → creative_candidates.selectedCandidate.creativeDNA` | yes | yes |
| Fidelity (script+storyboard) | json | `scripts/output/b98a3ba8/presentation-generation.json → finalScriptFidelity / finalStoryboardFidelity` | yes | yes |
| Story integrity | json | `scripts/output/b98a3ba8/presentation-generation.json → storyIntegrity` | yes | yes |
| Content items | json | `scripts/output/b98a3ba8/content-items.json` | yes | yes |
| Strategy item | json | `scripts/output/b98a3ba8/strategy-item.json` | yes | yes |
| Production run | json | `scripts/output/b98a3ba8/production-run.json` | yes | yes |
| Downloads manifest | json | `scripts/output/b98a3ba8/downloads.json` | yes | yes |
| Prior creative audit (human-readable dump) | md | `reports/production-run-b98a3ba8-4e34-4027-82d4-c58a798f7201-creative-audit.md` | yes | yes |
| StoryboardBeat[] worker persistence | json | `NOT AVAILABLE` | no | no |
| Generation error logs | log | `NOT AVAILABLE` | no | no |
| Music bed | audio | `NOT AVAILABLE` | no | no |

## Appendix A — Generation telemetry steps

```json
{
  "steps": [
    {
      "model": "gpt-4o-mini-tts",
      "repair": false,
      "success": true,
      "provider": "tts",
      "warnings": [],
      "step_name": "TTS",
      "max_tokens": null,
      "started_at": "2026-07-20T20:57:28.037Z",
      "duration_ms": 4216,
      "finished_at": "2026-07-20T20:57:32.253Z",
      "retry_count": 0,
      "temperature": null,
      "cached_tokens": null,
      "error_message": null,
      "input_summary": "TTS input:\n- Voiceover text\n- Voice / instructions",
      "prompt_tokens": null,
      "estimated_cost": null,
      "output_summary": "audio duration=20.664s",
      "response_format": null,
      "input_size_bytes": 339,
      "completion_tokens": null,
      "output_size_bytes": 114,
      "prompt_characters": 335,
      "completion_characters": 114
    },
    {
      "model": "whisper-1",
      "repair": false,
      "success": true,
      "provider": "whisper",
      "warnings": [],
      "step_name": "Whisper",
      "max_tokens": null,
      "started_at": "2026-07-20T20:57:32.254Z",
      "duration_ms": 2040,
      "finished_at": "2026-07-20T20:57:34.294Z",
      "retry_count": 0,
      "temperature": null,
      "cached_tokens": null,
      "error_message": null,
      "input_summary": "Whisper input:\n- Voiceover audio\n- Language hint",
      "prompt_tokens": null,
      "estimated_cost": null,
      "output_summary": "55 words (english)",
      "response_format": null,
      "input_size_bytes": null,
      "completion_tokens": null,
      "output_size_bytes": 37,
      "prompt_characters": null,
      "completion_characters": 37
    },
    {
      "model": "gpt-image-1",
      "repair": false,
      "success": true,
      "provider": "image",
      "warnings": [],
      "step_name": "Image generation",
      "max_tokens": null,
      "started_at": "2026-07-20T20:57:34.589Z",
      "duration_ms": 79309,
      "finished_at": "2026-07-20T20:58:53.898Z",
      "retry_count": 0,
      "temperature": null,
      "cached_tokens": null,
      "error_message": null,
      "input_summary": "Image generation input:\n- 5 scene(s)\n- Visual profile / medium",
      "prompt_tokens": null,
      "estimated_cost": null,
      "output_summary": "generated=5; reused=0",
      "response_format": null,
      "input_size_bytes": null,
      "completion_tokens": null,
      "output_size_bytes": 67,
      "prompt_characters": null,
      "completion_characters": 67
    },
    {
      "model": null,
      "repair": false,
      "success": true,
      "provider": "video",
      "warnings": [],
      "step_name": "Video rendering",
      "max_tokens": null,
      "started_at": "2026-07-20T20:58:54.229Z",
      "duration_ms": 153957,
      "finished_at": "2026-07-20T21:01:28.181Z",
      "retry_count": 0,
      "temperature": null,
      "cached_tokens": null,
      "error_message": null,
      "input_summary": "Video rendering input:\n- Scene stills\n- Voiceover\n- Subtitles\n- Motion beats",
      "prompt_tokens": null,
      "estimated_cost": null,
      "output_summary": "video_duration=22.166667",
      "response_format": null,
      "input_size_bytes": null,
      "completion_tokens": null,
      "output_size_bytes": 50,
      "prompt_characters": null,
      "completion_characters": 50
    }
  ],
  "phases": [],
  "version": "pipeline-telemetry@1"
}
```

## Appendix B — Full package script

```
BEAT 1 — HOOK (0–3s): Night. Small business dark. Security light on. Tablet on the counter glowing — a stream of unanswered website messages stacking up. Voiceover: 'After hours, chats still screaming.'

BEAT 2 — SETUP (3–10s): Wide shot of the empty, professional-looking interior — tidy, branded, silent. Voiceover: 'Your website looks great. Professional logo. Clean layout. And yet — every visitor who needed an answer after 6 PM got nothing. Not a word.'

BEAT 3 — ESCALATION (10–17s): Visitor perspective — someone types a question into the website chat on their phone in the dark. No reply. They close the tab. Voiceover: 'They didn't leave a message. They just left. The website wasn't broken. It was silent.'

BEAT 4 — PRODUCT DEMO (17–22s): The AI assistant activates on the website. A new visitor types a question. The AI responds instantly — question answered, contact captured. Voiceover: 'Your AI assistant answers the moment someone asks — even when you can't.'

BEAT 5 — RESOLUTION / CTA (22–25s): The business exterior at night, now with a subtle glow from the tablet — answered. Soft close. Voiceover fades. On-screen: 'Create your AI assistant.'
```

## Appendix C — Platform outputs (titles/captions)

```json
{
  "x": {
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
  },
  "tiktok": {
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
  },
  "youtube": {
    "cta": "Create your AI assistant at fenrik.chat",
    "format": "YouTube Short (9:16)",
    "caption": "Your website looks professional. But after hours? Total silence — every visitor question goes unanswered.",
    "hashtags": [
      "#SmallBusiness",
      "#AIAssistant",
      "#WebsiteTips"
    ]
  },
  "facebook": {
    "cta": "Create your AI assistant at fenrik.chat",
    "format": "Video Post",
    "caption": "Here's something most service business owners don't realize until they check their analytics: visitors came to the website after hours, typed a question, and left without a word — because there was no one to respond. 🌙\n\nThe website looked great. It just couldn't say anything back.\n\nAn AI assistant on your website changes that — it answers visitor questions automatically, captures their details, and keeps the conversation going even when you're closed.\n\nWorth trying — you can even preview it on your own site before signing up.",
    "hashtags": [
      "#SmallBusiness",
      "#AIAssistant",
      "#CustomerSupport"
    ]
  },
  "linkedin": {
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
  },
  "instagram": {
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
}
```

## Appendix D — Comparative judge badges

```json
{
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
}
```

## Appendix E — Selection diagnostics

```json
{
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
}
```

