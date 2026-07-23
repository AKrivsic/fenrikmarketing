# Comparative Production Run Audit

_Generated 2026-07-22T19:47:33.024Z — READ-ONLY. No code, DB, or job mutations._

## 1. Executive summary

Nový creative/quality pipeline (**creative-engine@3** + integrity validators) produkuje u **úspěšných** packages viditelně specifičtější vizuály a silnější konceptuální metafory než červnový referenční běh. **Nedokazuje však produktovou výhru:** completion rate klesl z **100 % na 57 %**, 6 packages padlo na hard validators, a náklady na failed pokusy **nejsou persistované**.

- **Nový run:** `c8dd3caf-c407-418c-be49-d4cf0a3b7bf9` — 8/14 completed, 6 failed, wall **271.1 min**, AI text (completed only) **$3.6973**, media odhad **$2.3567**, known total **$6.0540** → **$0.7568 / completed**.
- **Referenční run:** `f6c0c74d-1548-44fe-a920-b96b21d3db58` — 14/14 completed, wall **465.3 min**, AI text **Nelze určit z dostupných dat**, media odhad **$4.2118** → **$0.3008 media / completed**.
- **Kvalita (rubrika 1–5, invertované generic/repetition):** new **3.83** vs ref **2.94** (Δ **+0.89**).
- **Verdikt:** zjednodušit quality pipeline — ponechat direction/ideation přínos, hard-fail validátory převést na repair/advisory.

## 2. Vybraný referenční run

### Kandidáti (stejný project_id, requested=14)

| Run ID | created_at | status | generated/failed | video jobs w/ mp4 | Poznámka |
|---|---|---|---:|---:|---|
| `c8dd3caf-…` | 2026-07-22 | completed | 8/6 | 8 | auditovaný nový běh |
| `ae19b9f2-…` | 2026-07-22 | completed | 2/12 | — | nevyhovuje |
| `bb80c606-…` / `328a9a04-…` | Jul 16–18 | cancelled | — | — | nevyhovuje |
| **`f6c0c74d-1548-44fe-a920-b96b21d3db58`** | **2026-06-28** | **completed** | **14/0** | **14** | **vybrán** |
| `6dfbaf83-…` | 2026-06-21 | completed | 14/0 | 14 (+extra jobs) | kompletní, starší |
| `698e278c-…` | 2026-06-14 | completed | 14/0 | 14 exact | nejčistší counts |

### Proč `f6c0c74d`

1. Stejný project `aabab9ff-9db4-4012-a53c-135e3bfea6cd`.
2. Ověřená kompletnost: 14 packages, 14 completed video jobs s `mp4_url`, stills ve `video-renders`.
3. Časově nejbližší plný úspěšný běh **před** July creative/quality vlnou (Attention 07-17, Story Integrity 07-18, creative-engine v3 07-21).
4. Assety dostupné (14 mp4 + 63 stills).
5. Starší brief shape bez `presentation_generation` / telemetry — baseline před složitou pipeline.

## 3. Datové zdroje a omezení

| Artefakt | Zdroj |
|---|---|
| production runs | `production_runs` |
| run items / errors | `production_run_items` |
| strategy | `content_strategy_items.brief` |
| packages / creative | `content_packages.package_brief` (+ `presentation_generation`) |
| platform texts | `content_items` |
| AI telemetry/cost | `presentation_generation.generation_telemetry.steps[]` |
| video / scenes | `video_jobs.output` (`mp4_url`, `render_spec.scenes`) |
| storage | bucket `video-renders` |

### Co nelze určit

- Failed packages: žádný package → **Nelze obsahově porovnat, protože failed intermediate output se nepersistuje.**
- Referenční AI cost/tokeny/repairs: žádná telemetry.
- Ref TTS voice ID: null v brief i job input.
- Render/TTS/Whisper billing truth: worker `estimated_cost` = 0; media ceny jsou list-price odhady.
- Vercel runtime logs: `ExceedsBillingLimitError`.

## 4. Souhrn obou runů

| Metrika | Nový běh | Referenční běh |
|---|---:|---:|
| run ID | `c8dd3caf-c407-418c-be49-d4cf0a3b7bf9` | `f6c0c74d-1548-44fe-a920-b96b21d3db58` |
| created_at | 2026-07-22T10:11:25.953781+00:00 | 2026-06-28T21:02:49.45832+00:00 |
| completed_at | 2026-07-22T14:42:34.911184+00:00 | 2026-06-29T04:48:06.457394+00:00 |
| celková doba | 271.1 min | 465.3 min |
| requested | 14 | 14 |
| completed | 8 | 14 |
| failed | 6 | 0 |
| success rate | 57.1% | 100% |
| AI calls (persisted) | 113 | 0 (nepersistováno) |
| repair flags | 2 | Nelze určit z dostupných dat |
| image gens (est.) | 33 | 59 |
| TTS (est.) | 10 | 14 |
| renders | 8 | 14 |
| AI text cost | $3.6973 | Nelze určit z dostupných dat |
| media estimate | $2.3567 | $4.2118 |
| total known | $6.0540 | Nelze určit z dostupných dat |
| $/completed known | $0.7568 | media-only $0.3008 |
| $/requested known | $0.4324 | media-only $0.3008 |
| avg AI / completed | 7.53 min | Nelze určit z dostupných dat |
| median AI / completed | 7.06 min | Nelze určit z dostupných dat |
| avg video-job wall | 5.35 min | 58.41 min |

### Nákladové rozlišení (nový)

- Known run cost (completed artifacts): $6.0540
- Failed waste estimate: ~$5.0838 (= Σ attempts 1+4+1+1+3+1=11 × avg completed AI $0.4622)
- $/delivered known: $0.7568
- $/delivered known+waste est: $1.3922

## 5. Detail nového runu

Plné texty: `data/new/packages-full-text.json`, `creative-detail.json`. Média (videa, stills, screenshots, contact sheets): `exports/run-comparison-c8dd3caf/`.

### Package index 0 — completed

#### Identita

- package_index: 0
- production_run_item_id: `c0789c47-f2ce-41b3-adee-f7802b4dee1a`
- strategy_item_id: `f275e0ad-8e8d-44c2-a698-13b76833a29a`
- content_package_id: `54cc4206-4377-4bbc-ac48-54f7cc93a08b`
- content_item IDs: `55e468c9-630f-4d20-8c66-a27441686468`, `aea5bc04-c6f1-4de6-b7da-7e94605a755e`, `85b2e136-df7e-4931-86c7-3ead678c0d17`, `577cb86e-b0fc-455b-9fac-0b99d7df1b9d`, `55d902ae-3f96-41b8-803c-e9afb60d3530`, `c8b33801-3336-44ce-b951-da17dc4538fc`, `cd208576-f0d9-4a97-9c7b-321549bdd80d`, `ad1b9413-f105-4782-9b98-aca86f1a2c1b`, `271c6ace-f085-4222-aaf0-43183d777de2`, `153ada8b-91b6-487d-8790-4c82dddb0c59`, `589494c9-ba96-42cf-99ce-dbc24af01312`
- video_job_id: `f69205f6-9a11-4e2d-be42-cbc73cca491e`
- téma: The small business owner who realized her website had a job — and it had never shown up for work
- funnel: awareness
- title: The Window Is Open. No One's Behind It.

#### Strategie a kreativní vstup

- angle: Reframe the website as an employee with a single job: answer visitor questions. Most websites have never done that job once. Open with the uncomfortable question — what did your website actually do for visitors last night? No accusations, just a mirror held up to a silent homepage.
- hook: The window is open. No one's behind it.
- winner concept id: c4
- concept: A professional services reception window — frosted glass, warm backlight, the institutional promise of presence — becomes a mirror for every website that signals help but delivers silence. Visitor hands tap the panel. It slides open. No one. Again. And again. The warm glow behind the glass was never a person — it was just the website, unattended. In the final beat, the AI assistant appears behind the glass: present, responsive, the promise finally kept.
- CTA: {"text":"Create your AI assistant — let your website finally answer when someone knocks.","type":"sign_up"}
- directions: gen 7; selected [object Object], [object Object], [object Object], [object Object]
- concepts: gen 8; rejected 7; ideation_attempts 1; critic_attempts 0
- rejected reasons: převážně `fingerprint_collision_recent_package` — viz `data/new/rejected-sample.json`
- tts_voice: shimmer; visual_profile: NATURAL; visual_medium: PHOTOGRAPHIC

#### Voiceover

```
The window is open. No one's behind it. Every visitor who lands on your site after hours is standing right there — tapping the glass. And your website? It just stares back. Empty desk. Warm light. Zero answers. That warm light was always your website. It just never had anyone inside. Now it can. Your AI assistant answers the moment someone knocks.
```

#### Storyboard / scény

- **Scene 1** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f69205f6-9a11-4e2d-be42-cbc73cca491e/scene-scene-1.png`
  - prompt: Photorealistic photographic portrait 9:16 vertical frame. Extreme close-up on a frosted glass reception panel — the kind with a sliding wooden-framed window and a small brass microphone hole — set inside a professional s
- **Scene 2** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f69205f6-9a11-4e2d-be42-cbc73cca491e/scene-scene-2.png`
  - prompt: Photorealistic photographic portrait 9:16 vertical frame. The frosted glass panel has slid fully open, revealing the desk behind it — a dignified professional services interior with mahogany surfaces, muted gold accents.
- **Scene 3** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f69205f6-9a11-4e2d-be42-cbc73cca491e/scene-scene-3.png`
  - prompt: Photorealistic photographic portrait 9:16 vertical frame. A second visitor's hand taps the same frosted glass reception panel — slightly different angle, fingers more urgent in posture. The warm amber backlight behind th
- **Scene 4** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/f69205f6-9a11-4e2d-be42-cbc73cca491e/scene-scene-4.png`
  - prompt: Photorealistic photographic portrait 9:16 vertical frame. The reception panel slides open one final time — but now behind the frosted glass, instead of an empty desk, there is a soft face-shaped ambient glow: warm, human

- Stills: `exports/run-comparison-c8dd3caf/stills/new/pkg00_scene*.png`
- Frames: `exports/run-comparison-c8dd3caf/screenshots/new/pkg00_video_{first,mid,last}.jpg`
- Contact: `exports/run-comparison-c8dd3caf/contact-sheets/new/pkg00_video_fml.jpg`
- Visual note: Cinematic reception-window metaphor; strong continuity; hand/glass motif repeats but narratively coherent.

#### Platform texts

##### tiktok

- title: The Window Is Open. No One's Behind It.
- caption: Your website has a reception window. It's been open this whole time. Nobody's ever been behind it.
- body: The window is open. No one's behind it. Every visitor who lands on your site after hours is standing right there — tapping the glass. And your website? It just stares back. Empty desk. Warm light. Zero answers. That warm light was always your website. It just never had anyone inside. Now it can. Your AI assistant answers the moment someone knocks.
- cta: Link in bio to finally put someone there.
- hashtags: #SmallBusiness #WebsiteTips #AIAssistant #LeadGeneration

##### instagram

- title: The Window Is Open. No One's Behind It.
- caption: That warm light behind the glass?

That's your website. Open 24/7. Implying someone's there.

But every visitor who shows up after hours taps the panel — and gets nothing back.

Your site can finally answer. The moment someone knocks.
- body: The window is open. No one's behind it. Every visitor who lands on your site after hours is standing right there — tapping the glass. And your website? It just stares back. Empty desk. Warm light. Zero answers. That warm light was always your website. It just never had anyone inside. Now it can. Your AI assistant answers the moment someone knocks.
- cta: Link in bio to create your AI assistant.
- hashtags: #SmallBusiness #WebsiteHelp #AIAssistant #LeadGen #CustomerSupport #BusinessOwner #MarketingTips #ServiceBusiness

##### youtube

- title: The Window Is Open. No One's Behind It.
- caption: Your website looks open. But every after-hours visitor walks away unanswered. Here's what that actually costs.
- body: The window is open. No one's behind it. Every visitor who lands on your site after hours is standing right there — tapping the glass. And your website? It just stares back. Empty desk. Warm light. Zero answers. That warm light was always your website. It just never had anyone inside. Now it can. Your AI assistant answers the moment someone knocks.
- cta: Subscribe for more.
- hashtags: #SmallBusiness #AIAssistant #WebsiteTips

##### linkedin

- title: The gap between what your website promises and what it actually delivers — after hours.
- caption: There's a moment every service business misses: a qualified visitor lands on the site at 10 PM, reads the right page, forms the right question — and finds no way to get an answer. They don't fill out the form. They move on. The website looked staffed. It wasn't. Fenrik.chat builds an AI assistant directly from your website content — no training, no code, no dedicated support hire. The window finally has someone behind it.
- body: The window is open. No one's behind it. Every visitor who lands on your site after hours is standing right there — tapping the glass. And your website? It just stares back. Empty desk. Warm light. Zero answers. That warm light was always your website. It just never had anyone inside. Now it can. Your AI assistant answers the moment someone knocks.
- cta: Create your AI assistant at fenrik.chat
- hashtags: #ProfessionalServices #LeadGeneration #AIAssistant

##### facebook

- title: The Window Is Open. No One's Behind It.
- caption: Here's something most business owners never think about: your website has a reception window. It's been glowing warmly for every visitor — day and night. But tap the glass after hours, and there's nobody behind it. 😶 An AI assistant on your site changes that. It answers the moment someone shows up, even when you're not there. Worth a look — fenrik.chat
- body: The window is open. No one's behind it. Every visitor who lands on your site after hours is standing right there — tapping the glass. And your website? It just stares back. Empty desk. Warm light. Zero answers. That warm light was always your website. It just never had anyone inside. Now it can. Your AI assistant answers the moment someone knocks.
- cta: Visit fenrik.chat to create your AI assistant.
- hashtags: #SmallBusiness #CustomerSupport

##### x

- title: The warm light behind the glass was never a person. It was just your website, unattended.
- caption: Qualified visitor. Right page. Right question. Wrong time. No answer. That's not a traffic problem — it's a presence problem.
- body: The window is open. No one's behind it. Every visitor who lands on your site after hours is standing right there — tapping the glass. And your website? It just stares back. Empty desk. Warm light. Zero answers. That warm light was always your website. It just never had anyone inside. Now it can. Your AI assistant answers the moment someone knocks.
- cta: fenrik.chat
- hashtags: #SmallBusiness #AIAssistant

#### Cena a čas

- AI text: $0.3994
- media est: $0.2852 (images=4)
- steps 13; tokens 32176/20189
- AI 6.56 min; video job 5.44 min
- by_step: `{"Creative Direction Generation":{"count":1,"cost":0.034023,"ms":41402,"retries":0},"Creative Direction Evaluation":{"count":1,"cost":0.035835,"ms":32948,"retries":0},"Creative Ideation":{"count":1,"cost":0.203247,"ms":254598,"retries":0},"Creative Engine":{"count":1,"cost":0,"ms":0,"retries":0},"Candidate Judge":{"count":1,"cost":0,"ms":0,"retries":0},"Narrative Beats":{"count":1,"cost":0,"ms":12,"retries":0},"Presentation Generation":{"count":1,"cost":0.126258,"ms":60944,"retries":0},"Hook Enforcement":{"count":1,"cost":0,"ms":0,"retries":0},"Concept Fidelity":{"count":1,"cost":0,"ms":17,"retries":0},"Story Integrity":{"count":1,"cost":0,"ms":7,"retries":0},"Product Demonstration Integrity":{"count":1,"cost":0,"ms":3,"retries":0},"Platform Outputs":{"count":1,"cost":0,"ms":0,"retries":0},"Persist Package":{"count":1,"cost":0,"ms":3779,"retries":0}}`

### Package index 1 — completed

#### Identita

- package_index: 1
- production_run_item_id: `c1e6ee49-0500-4937-b725-006e3503a3f4`
- strategy_item_id: `45e3b53f-24de-42d5-a2e3-850e92219b55`
- content_package_id: `c3bb03e5-7172-4eb6-a1e5-2c26a67397b1`
- content_item IDs: `2e4581f6-e85a-4d3b-91d6-2cbff4d0f035`, `d0281b87-2239-40c6-96bd-35a4c916a4aa`, `d51d4ced-ca70-4cb2-ae08-de62e62a3510`, `e931f774-c408-46fe-acdf-68503c3283a2`, `cfcf665e-2117-4ee8-8851-c6fd24f7d667`, `9c52a216-a33e-410a-9ad4-24f1a3033763`, `98b5898e-955f-4d51-a2e3-7cb8e89f5a58`, `6815b2f0-2d78-4229-befd-938aa9cdefde`, `17179337-cd31-4bb3-953c-5ca956dec354`, `17093cfa-098c-4ffb-9e56-d2085dd8e583`
- video_job_id: `73474d33-3ec7-4b95-b197-8590dd46107d`
- téma: Every business posts on social media to drive traffic — almost none of them have thought about what happens when that traffic arrives
- funnel: awareness
- title: The consultant who planned every channel — and forgot the landing zone

#### Strategie a kreativní vstup

- angle: Call out the gap between effort and outcome. You spend time on content, ads, and SEO to get people to your site — then the site does nothing. Visitors arrive, look around, get no answers, and leave. The traffic strategy worked. The website strategy doesn't exist.
- hook: You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question.
- winner concept id: c1
- concept: A meticulous, color-coded campaign launch wall fills the frame — every channel scheduled, every asset pinned, a circled launch date in red. The campaign fires. Traffic spikes on a phone screen. Then a slow, uncomfortable hold on the website's static contact page: a form, a business-hours notice, silence. A question mark card is pinned at the end of the timeline past the GO date. Finally, the question mark is replaced: the AI assistant is the last node — the piece the plan always needed.
- CTA: {"text":"Create your AI assistant — make your website as ready as your campaign.","type":"sign_up"}
- directions: gen 7; selected [object Object], [object Object], [object Object]
- concepts: gen 6; rejected 3; ideation_attempts 1; critic_attempts 2
- rejected reasons: převážně `fingerprint_collision_recent_package` — viz `data/new/rejected-sample.json`
- tts_voice: cedar; visual_profile: EDITORIAL; visual_medium: CLEAN_ILLUSTRATION

#### Voiceover

```
You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question. Every channel mapped. Every dollar allocated. The ad goes live — traffic spikes. Then visitors land on your site and hit a contact form with a two-business-day reply promise. All that effort. One dead end. Your website was never part of the plan. It still doesn't have to be complicated — one script, and it's ready before the next campaign goes live.
```

#### Storyboard / scény

- **Scene 1** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/73474d33-3ec7-4b95-b197-8590dd46107d/scene-scene-1.png`
  - prompt: Clean flat illustration, portrait 9:16 vertical frame. Extreme close-up on a printed campaign timeline pinned to a linen-white wall in a bright analog-creative home studio. The timeline is ruler-straight, color-coded in 
- **Scene 2** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/73474d33-3ec7-4b95-b197-8590dd46107d/scene-scene-2.png`
  - prompt: Clean flat illustration, portrait 9:16 vertical frame. Wide pull-back view of the same bright analog-creative home studio — the full campaign wall now visible, dense and deliberate: color-coded printed columns, sticky no
- **Scene 3** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/73474d33-3ec7-4b95-b197-8590dd46107d/scene-scene-3.png`
  - prompt: Clean flat illustration, portrait 9:16 vertical frame. Slow, uncomfortable close view of a laptop open on a surface in the same bright analog-creative home studio. The laptop screen displays a simplified website contact 
- **Scene 4** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/73474d33-3ec7-4b95-b197-8590dd46107d/scene-scene-4.png`
  - prompt: Clean flat illustration, portrait 9:16 vertical frame. Return to the campaign wall in the bright analog-creative home studio. The timeline is fully visible, color-coded and dense. At the far right end of the timeline — p
- **Scene 5** (IMAGE, 4s) `project-assets/aabab9ff-9db4-4012-a53c-135e3bfea6cd/source/7e250d64-ddcf-4649-921f-783d294a2b5b/component-capture.png`
  - prompt: Show this landscape product UI screenshot as a framed laptop screen insert during the final resolution beat (seconds 18–22); place it centered within a clean laptop mockup positioned on a surface in the bright analog-cre

- Stills: `exports/run-comparison-c8dd3caf/stills/new/pkg01_scene*.png`
- Frames: `exports/run-comparison-c8dd3caf/screenshots/new/pkg01_video_{first,mid,last}.jpg`
- Contact: `exports/run-comparison-c8dd3caf/contact-sheets/new/pkg01_video_fml.jpg`
- Visual note: Campaign timeline illustration is specific; clean editorial look.

#### Platform texts

##### tiktok

- title: The consultant who planned every channel — and forgot the landing zone
- caption: You mapped every channel. Then sent traffic to a form that replies in 2 business days. 💀
- body: You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question. Every channel mapped. Every dollar allocated. The ad goes live — traffic spikes. Then visitors land on your site and hit a contact form with a two-business-day reply promise. All that effort. One dead end. Your website was never part of the plan. It still doesn't have to be complicated — one script, and it's ready before the next campaign goes live.
- cta: Link in bio — fix the landing zone before your next campaign.
- hashtags: #marketingtips #smallbusiness #websitetips #digitalmarketing #growthhack

##### instagram

- title: The consultant who planned every channel — and forgot the landing zone
- caption: The campaign was a masterpiece.

Every channel mapped. Every dollar allocated. Traffic spiked.

Then every visitor landed on a contact form that promised a reply in two business days.

All that effort. One dead end.

Your website doesn't have to be the weak link — it can answer visitors the moment they arrive.
- body: You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question. Every channel mapped. Every dollar allocated. The ad goes live — traffic spikes. Then visitors land on your site and hit a contact form with a two-business-day reply promise. All that effort. One dead end. Your website was never part of the plan. It still doesn't have to be complicated — one script, and it's ready before the next campaign goes live.
- cta: Link in bio to see it live — no sign-up needed.
- hashtags: #smallbusiness #marketingstrategy #websitetips #leadgeneration #digitalmarketing #businessgrowth #onlinebusiness #contentmarketing #smb #aitools

##### youtube

- title: The consultant who planned every channel — and forgot the landing zone
- caption: You built the perfect campaign — then sent everyone to a page that can't answer a question. Here's the gap no one talks about.
- body: You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question. Every channel mapped. Every dollar allocated. The ad goes live — traffic spikes. Then visitors land on your site and hit a contact form with a two-business-day reply promise. All that effort. One dead end. Your website was never part of the plan. It still doesn't have to be complicated — one script, and it's ready before the next campaign goes live.
- cta: Subscribe for more.
- hashtags: #websitetips #marketingstrategy #smallbusiness

##### linkedin

- title: The consultant who planned every channel — and forgot the landing zone
- caption: Most marketing plans account for every channel: paid ads, email sequences, SEO, social. Almost none account for what happens when the traffic actually lands.

Visitors arrive. They have questions. The website offers a contact form and a two-business-day reply window. They leave.

The campaign strategy was thorough. The website strategy didn't exist.

The gap is real — and it doesn't require a developer or a custom build to close. One embed script, and your site can answer visitors the moment they arrive.

If your next campaign is already planned, the website should be ready before it goes live.
- body: You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question. Every channel mapped. Every dollar allocated. The ad goes live — traffic spikes. Then visitors land on your site and hit a contact form with a two-business-day reply promise. All that effort. One dead end. Your website was never part of the plan. It still doesn't have to be complicated — one script, and it's ready before the next campaign goes live.
- cta: Create your AI assistant at fenrik.chat
- hashtags: #digitalmarketing #smallbusiness #leadgeneration

##### facebook

- title: The consultant who planned every channel — and forgot the landing zone
- caption: Ever spent hours planning a campaign — ads, emails, social posts, the works — then watched the traffic arrive and... nothing? Visitors hit a contact form and a two-day reply promise and quietly leave. The campaign worked. The website didn't. If that sounds familiar, there's a simple fix that doesn't require a developer or a big budget. Your AI assistant can be ready before your next campaign goes live. 🙌
- body: You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question. Every channel mapped. Every dollar allocated. The ad goes live — traffic spikes. Then visitors land on your site and hit a contact form with a two-business-day reply promise. All that effort. One dead end. Your website was never part of the plan. It still doesn't have to be complicated — one script, and it's ready before the next campaign goes live.
- cta: Create your AI assistant at fenrik.chat
- hashtags: #smallbusiness #marketingtips #websitehelp

##### x

- title: The hardest part of marketing isn't getting traffic.
- caption: Getting traffic to your site is the easy part. Having the site ready to answer when they arrive? That's the gap.
- body: You planned the campaign down to the hour. Then sent everyone to a page that can't answer a single question. Every channel mapped. Every dollar allocated. The ad goes live — traffic spikes. Then visitors land on your site and hit a contact form with a two-business-day reply promise. All that effort. One dead end. Your website was never part of the plan. It still doesn't have to be complicated — one script, and it's ready before the next campaign goes live.
- cta: Fix the landing zone: fenrik.chat
- hashtags: #marketing #smallbusiness

#### Cena a čas

- AI text: $0.4446
- media est: $0.2869 (images=4)
- steps 15; tokens 42582/21122
- AI 7.06 min; video job 6.01 min
- by_step: `{"Creative Direction Generation":{"count":1,"cost":0.036435,"ms":43146,"retries":0},"Creative Direction Evaluation":{"count":1,"cost":0.037581,"ms":35714,"retries":0},"Creative Ideation":{"count":1,"cost":0.161025,"ms":209244,"retries":0},"Creative Evaluation":{"count":1,"cost":0.03888,"ms":32000,"retries":0},"Creative Evaluation Retry":{"count":1,"cost":0.037386,"ms":31198,"retries":0},"Creative Engine":{"count":1,"cost":0,"ms":0,"retries":0},"Candidate Judge":{"count":1,"cost":0,"ms":0,"retries":0},"Narrative Beats":{"count":1,"cost":0,"ms":7,"retries":0},"Presentation Generation":{"count":1,"cost":0.133269,"ms":68911,"retries":0},"Hook Enforcement":{"count":1,"cost":0,"ms":1,"retries":0},"Concept Fidelity":{"count":1,"cost":0,"ms":12,"retries":0},"Story Integrity":{"count":1,"cost":0,"ms":4,"retries":0},"Product Demonstration Integrity":{"count":1,"cost":0,"ms":4,"retries":0},"Platform Outputs":{"count":1,"cost":0,"ms":0,"retries":0},"Persist Package":{"count":1,"cost":0,"ms":3210,"retries":0}}`

### Package index 2 — completed

#### Identita

- package_index: 2
- production_run_item_id: `0a2b6c5e-d244-4b54-accb-7948ebdfa1fc`
- strategy_item_id: `365a5ccc-a1da-4d52-b47d-2951bed3d7e4`
- content_package_id: `822911a7-7511-48b1-96a6-1f9bf1acf6fa`
- content_item IDs: `5e2b2c05-b378-47c6-95d8-8995de91b5ef`, `d702df90-c922-4e87-abdb-a7405f2627e8`, `e053c91e-db07-4486-b731-bedc6bda1e50`, `b9329b55-6ec8-4697-b43f-8e9bdb96bbb7`, `0c101a07-3c88-4cb5-96a6-c512c697a7c7`, `144a95b2-d43d-4b59-90fa-cbbcd6628439`, `56295f3d-5034-41b9-8f99-2e6cc4a8b0fb`, `3dc828ed-a6b1-4de3-9920-ac587a96cece`, `d8c1eb8f-78ea-4d95-9054-ecff92938b39`, `6098f1c2-c885-483e-b1c3-6f1a69f185ce`, `06e1232f-1c9b-4a5a-a440-220b2ef301ce`
- video_job_id: `d3d52d06-3055-48dd-82a9-c16bb883ee4d`
- téma: The local service company that tracked every call — and never once tracked how many people visited the website and left without a word
- funnel: problem_aware
- title: She left a five-star review. Just not for you.

#### Strategie a kreativní vstup

- angle: Walk through the blind spot: a service business owner obsesses over call volume, response time, and reviews — but has zero visibility into website visitors who never made contact. Dramatize the moment they check analytics for the first time and see dozens of sessions, zero conversions, no contact details. The leads were there. The website just couldn't hold them.
- hook: She left a five-star review. Just not for you.
- winner concept id: c2
- concept: A clean white desktop tells the whole story through two printed documents. A competitor's five-star Google review — one sentence highlighted in warm yellow — sits beside a crumpled analytics printout showing dozens of sessions and zero contacts from the same week. The connection is never explained. It's only shown. The viewer is left calculating how many of their own sessions became someone else's five-star review.
- CTA: {"text":"Create your AI assistant — and make sure the next review lands where it should.","type":"sign_up"}
- directions: gen 7; selected [object Object], [object Object], [object Object]
- concepts: gen 6; rejected 4; ideation_attempts 1; critic_attempts 1
- rejected reasons: převážně `fingerprint_collision_recent_package` — viz `data/new/rejected-sample.json`
- tts_voice: shimmer; visual_profile: NATURAL; visual_medium: CLEAN_ILLUSTRATION

#### Voiceover

```
She left a five-star review. Just not for you. She was on your website last Tuesday. Had a question. No one answered. So she found someone who did. And now their Google listing has her name on it. You have the sessions in your analytics. Forty-three visits. Zero contacts. The leads were there. Your website just couldn't hold them.
```

#### Storyboard / scény

- **Scene 1** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/d3d52d06-3055-48dd-82a9-c16bb883ee4d/scene-scene-1.png`
  - prompt: Clean flat illustration, portrait 9:16 vertical frame. Extreme close-up on a printed document resting on a matte white desktop surface. The document shows a five-star review — five bold star shapes rendered in warm yello
- **Scene 2** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/d3d52d06-3055-48dd-82a9-c16bb883ee4d/scene-scene-2.png`
  - prompt: Clean flat illustration, portrait 9:16 vertical frame. The matte white desktop — same world as before. A hand enters from the lower right, sliding a second printed document into frame beside the first review sheet. The n
- **Scene 3** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/d3d52d06-3055-48dd-82a9-c16bb883ee4d/scene-scene-3.png`
  - prompt: Clean flat illustration, portrait 9:16 vertical frame. Wide view of the matte white desktop. Both printed documents are now pinned side by side — the five-star review sheet on the left, the crumpled analytics printout on
- **Scene 4** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/d3d52d06-3055-48dd-82a9-c16bb883ee4d/scene-scene-4.png`
  - prompt: Clean flat illustration, portrait 9:16 vertical frame. Final narrative close. The same matte white desktop — now the two documents remain pinned in place, but the hand has withdrawn. The five-star review sheet on the lef

- Stills: `exports/run-comparison-c8dd3caf/stills/new/pkg02_scene*.png`
- Frames: `exports/run-comparison-c8dd3caf/screenshots/new/pkg02_video_{first,mid,last}.jpg`
- Contact: `exports/run-comparison-c8dd3caf/contact-sheets/new/pkg02_video_fml.jpg`
- Visual note: Strong hook; visuals lean symbolic; costliest completed package (repair).

#### Platform texts

##### tiktok

- title: She left a five-star review. Just not for you.
- caption: She left a 5-star review for your competitor. She was on YOUR website first. 👀
- body: She left a five-star review. Just not for you. She was on your website last Tuesday. Had a question. No one answered. So she found someone who did. And now their Google listing has her name on it. You have the sessions in your analytics. Forty-three visits. Zero contacts. The leads were there. Your website just couldn't hold them.
- cta: Check your analytics. Then fix it — link in bio.
- hashtags: #smallbusiness #websitetips #leadgeneration #businessgrowth

##### instagram

- title: She left a five-star review. Just not for you.
- caption: She was on your website last Tuesday.

Had a question. No one answered. So she found someone who did — and left them a five-star review.

Your analytics show the visit. Your inbox shows nothing.

The lead was there. Your website just couldn't hold the conversation.
- body: She left a five-star review. Just not for you. She was on your website last Tuesday. Had a question. No one answered. So she found someone who did. And now their Google listing has her name on it. You have the sessions in your analytics. Forty-three visits. Zero contacts. The leads were there. Your website just couldn't hold them.
- cta: Create your AI assistant → link in bio.
- hashtags: #smallbusiness #websitestrategy #leadgeneration #businesstips #aitools #customerexperience #servicebusiness #growyourbusiness

##### youtube

- title: She left a five-star review. Just not for you.
- caption: She left a five-star review — for your competitor. She was on your site first.
- body: She left a five-star review. Just not for you. She was on your website last Tuesday. Had a question. No one answered. So she found someone who did. And now their Google listing has her name on it. You have the sessions in your analytics. Forty-three visits. Zero contacts. The leads were there. Your website just couldn't hold them.
- cta: Subscribe for more.
- hashtags: #smallbusiness #websitetips #aiassistant

##### linkedin

- title: Your analytics show the sessions. Your inbox shows the silence. Here's what that gap costs.
- caption: There's a specific moment when a lead becomes someone else's customer: the moment they ask a question your website can't answer.

They don't send an email. They don't call. They move on — and the next business that responds instantly earns the trust, the booking, and eventually the five-star review.

The visitor was there. The session is in your analytics. The contact never arrived.

Fenrik.chat builds an AI assistant from your existing website content — no code, no setup, live in about a minute — so the next visitor gets an answer instead of silence.

Create your AI assistant at fenrik.chat
- body: She left a five-star review. Just not for you. She was on your website last Tuesday. Had a question. No one answered. So she found someone who did. And now their Google listing has her name on it. You have the sessions in your analytics. Forty-three visits. Zero contacts. The leads were there. Your website just couldn't hold them.
- cta: Create your AI assistant at fenrik.chat
- hashtags: #leadgeneration #businessgrowth #customerexperience

##### facebook

- title: She left a five-star review. Just not for you.
- caption: Here's something worth checking today: open your website analytics and look at last week's sessions. Now look at how many of those visitors actually made contact. 📊

For most service businesses, there's a gap — sometimes a big one. Visitors arrive, have a question, get no answer, and leave. Someone else gets the five-star review.

Fenrik.chat gives your website an AI assistant that answers visitor questions instantly, any time of day — no coding, no setup, up and running in about a minute.

Create your AI assistant at fenrik.chat
- body: She left a five-star review. Just not for you. She was on your website last Tuesday. Had a question. No one answered. So she found someone who did. And now their Google listing has her name on it. You have the sessions in your analytics. Forty-three visits. Zero contacts. The leads were there. Your website just couldn't hold them.
- cta: Create your AI assistant at fenrik.chat
- hashtags: #smallbusiness #customerservice

##### x

- title: 43 sessions. Zero contacts. One very avoidable loss.
- caption: Open your analytics. Count last week's sessions. Now count the contacts. That gap has a name: visitors who had a question and found someone else who could answer it.
- body: She left a five-star review. Just not for you. She was on your website last Tuesday. Had a question. No one answered. So she found someone who did. And now their Google listing has her name on it. You have the sessions in your analytics. Forty-three visits. Zero contacts. The leads were there. Your website just couldn't hold them.
- cta: Create your AI assistant at fenrik.chat
- hashtags: #smallbusiness #leadgen

#### Cena a čas

- AI text: $0.6939
- media est: $0.2850 (images=4)
- steps 15; tokens 91024/28057
- AI 8.67 min; video job 5.12 min
- by_step: `{"Creative Direction Generation":{"count":1,"cost":0.035802,"ms":43672,"retries":0},"Creative Direction Evaluation":{"count":1,"cost":0.036837,"ms":33999,"retries":0},"Creative Ideation":{"count":1,"cost":0.149817,"ms":186732,"retries":0},"Creative Evaluation":{"count":1,"cost":0.028152,"ms":24303,"retries":0},"Creative Engine":{"count":1,"cost":0,"ms":0,"retries":0},"Candidate Judge":{"count":1,"cost":0,"ms":0,"retries":0},"Narrative Beats":{"count":1,"cost":0,"ms":2,"retries":0},"Presentation Generation":{"count":1,"cost":0.310422,"ms":161150,"retries":1},"Hook Enforcement":{"count":1,"cost":0,"ms":0,"retries":0},"Concept Fidelity":{"count":1,"cost":0,"ms":6,"retries":0},"Story Integrity":{"count":1,"cost":0,"ms":4,"retries":0},"Story Integrity Repair":{"count":1,"cost":0.132897,"ms":66273,"retries":0},"Product Demonstration Integrity":{"count":1,"cost":0,"ms":2,"retries":0},"Platform Outputs":{"count":1,"cost":0,"ms":0,"retries":0},"Persist Package":{"count":1,"cost":0,"ms":3943,"retries":0}}`

### Package index 3 — failed

#### Identita

- package_index: 3
- production_run_item_id: `011aecad-7f5e-44c0-86ff-f51a0d227080`
- strategy_item_id: `05b9d3d4-0fe5-400d-a86a-6738436104cb`
- content_package_id: null
- content_item IDs: —
- video_job_id: —
- téma: The consulting firm that launched a new website and immediately went back to losing leads the same way they always had
- funnel: problem_aware
- title: —

#### Fail

```json
{
  "error": "generation_failed",
  "message": "Primary actor from selected concept missing from opening scene (expected one of: outcome, strips, identical, objects)",
  "validation_errors": [
    {
      "path": "story_integrity.primary_actor_changed.scene_0",
      "message": "Primary actor from selected concept missing from opening scene (expected one of: outcome, strips, identical, objects)"
    }
  ],
  "attempts": 1
}
```

- **Co vzniklo:** strategy item + AI pokus(y). Package artifacts nezapsány.
- **Zahozeno:** directions/concepts/storyboard — **Nelze obsahově porovnat, protože failed intermediate output se nepersistuje.**
- **Attempts:** 1
- **Odhad AI waste:** ~$0.4622
- **Telemetry/raw:** není v DB; Vercel logy nedostupné.

### Package index 4 — failed

#### Identita

- package_index: 4
- production_run_item_id: `acbbede4-25f2-4af2-8788-f3e398f83776`
- strategy_item_id: `57b10e6b-d451-49a7-ba3e-67a375fbddcc`
- content_package_id: null
- content_item IDs: —
- video_job_id: —
- téma: What your website says to every visitor who arrives after 6 PM
- funnel: problem_aware
- title: —

#### Fail

```json
{
  "error": "generation_failed",
  "message": "all_concepts_vetoed_after_re_ideation",
  "validation_errors": [
    {
      "path": "creative_engine_v3",
      "message": "all_concepts_vetoed_after_re_ideation"
    }
  ],
  "attempts": 4
}
```

- **Co vzniklo:** strategy item + AI pokus(y). Package artifacts nezapsány.
- **Zahozeno:** directions/concepts/storyboard — **Nelze obsahově porovnat, protože failed intermediate output se nepersistuje.**
- **Attempts:** 4
- **Odhad AI waste:** ~$1.8487
- **Telemetry/raw:** není v DB; Vercel logy nedostupné.

### Package index 5 — failed

#### Identita

- package_index: 5
- production_run_item_id: `01202fc0-1c09-4bf9-bc03-085479bcf0c1`
- strategy_item_id: `e2a12e98-461d-4dc0-901f-70054b6ff803`
- content_package_id: null
- content_item IDs: —
- video_job_id: —
- téma: The accountant who answered the same six questions in every client onboarding call — for four years straight
- funnel: problem_aware
- title: —

#### Fail

```json
{
  "error": "generation_failed",
  "message": "storyboard_collapsed_to_generic_office",
  "validation_errors": [
    {
      "path": "concept_fidelity",
      "message": "storyboard_collapsed_to_generic_office"
    }
  ],
  "attempts": 1
}
```

- **Co vzniklo:** strategy item + AI pokus(y). Package artifacts nezapsány.
- **Zahozeno:** directions/concepts/storyboard — **Nelze obsahově porovnat, protože failed intermediate output se nepersistuje.**
- **Attempts:** 1
- **Odhad AI waste:** ~$0.4622
- **Telemetry/raw:** není v DB; Vercel logy nedostupné.

### Package index 6 — completed

#### Identita

- package_index: 6
- production_run_item_id: `dc039fcf-cd08-4ed1-bd28-4c5f7ad12c1c`
- strategy_item_id: `f463e71e-d983-4d28-8aa9-76de6fc4814f`
- content_package_id: `c6427dbf-eb0e-4b35-95b3-0984b431db15`
- content_item IDs: `61341b07-5423-4b38-808c-78431bffd646`, `2b35edd4-5974-4444-acab-3731f06cdf86`, `a3ead97f-de5f-4054-9c61-ae57b4f832df`, `82b3f88d-e867-4bac-b102-7f92c719dbf9`, `125aa5ca-7b60-4a5d-932a-cabb433b4e1d`, `483486d3-b0f3-4892-a1a9-e04b4c35d93c`, `2ba5dbf6-93ba-4709-85da-375164eeef56`, `23641c66-efbb-4add-baf9-1304be862499`, `a0476595-fa0b-45bc-a830-f33309d64874`, `5fa1dafe-0c58-4db6-bf6c-7ec6b9f00d26`, `aac151a0-ccce-4733-a498-7ac28b919251`
- video_job_id: `bdbcf9e3-d0ae-4144-bc07-81ae3b30e334`
- téma: The software company that spent six months building a pricing page — and still couldn't stop visitors from leaving it confused
- funnel: problem_aware
- title: Everything Rehearsed. Except the Questions.

#### Strategie a kreativní vstup

- angle: A SaaS team rewrites their pricing page three times. Adds FAQs, comparison tables, testimonials. Visitors still drop off. The problem was never the page — it was that visitors had specific questions the page couldn't anticipate, and there was nothing interactive to catch them before they left.
- hook: Everything rehearsed. Except what happens when someone asks a question.
- winner concept id: c4
- concept: A theater backstage metaphor grounded in a real SaaS business truth: a team rewrites their pricing page three times, adds every possible static answer, and visitors still drop off. The insight is delivered through a stage manager's clipboard — every production cue checked, every prop placed, every scene rehearsed — except the single line at the bottom: 'Audience Q&A.' That one unchecked box is the cost. The resolution is fast and quiet: a phone placed on the empty Q&A chair, the AI assistant live in under a minute, the final checkbox marked. The viewer leaves understanding that their own web presence has a fully rehearsed performance and an empty chair they haven't prepared for.
- CTA: {"text":"Create your AI assistant — let your website answer the question the page never could.","type":"sign_up"}
- directions: gen 7; selected [object Object], [object Object], [object Object]
- concepts: gen 6; rejected 10; ideation_attempts 2; critic_attempts 1
- rejected reasons: převážně `fingerprint_collision_recent_package` — viz `data/new/rejected-sample.json`
- tts_voice: shimmer; visual_profile: NATURAL; visual_medium: SOFT_3D

#### Voiceover

```
Everything rehearsed. Except what happens when someone asks a question. The pricing page was rewritten three times. FAQs added. Comparison tables. Testimonials. Visitors still left. Because the page couldn't catch the one specific thing they needed to know. There was no one — and nothing — to answer in the moment. That empty chair in your preparation? It costs you every day. Fenrik.chat fills it in about a minute.
```

#### Storyboard / scény

- **Scene 1** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/bdbcf9e3-d0ae-4144-bc07-81ae3b30e334/scene-scene-1.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame, bright even indoor illumination, wide environmental framing with intentional negative space. Extreme close-up on a stage manager's production clipboard — thick sheaf
- **Scene 2** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/bdbcf9e3-d0ae-4144-bc07-81ae3b30e334/scene-scene-2.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame, bright even indoor illumination, wide environmental framing. The backstage wing of a small professional theater space — exposed brick wall in warm red-brown, industr
- **Scene 3** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/bdbcf9e3-d0ae-4144-bc07-81ae3b30e334/scene-scene-3.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame, bright even indoor illumination, wide environmental framing with strong intentional negative space. A single folding chair sits alone in the backstage wing — isolate
- **Scene 4** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/bdbcf9e3-d0ae-4144-bc07-81ae3b30e334/scene-scene-4.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame, bright even indoor illumination, wide environmental framing. A hand holds a smartphone in the backstage wing — the screen faces the viewer, displaying a clean websit
- **Scene 5** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/bdbcf9e3-d0ae-4144-bc07-81ae3b30e334/scene-scene-5.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame, bright even indoor illumination, wide environmental framing. The same folding chair in the backstage wing — but now the phone rests on the seat, screen still gently 

- Stills: `exports/run-comparison-c8dd3caf/stills/new/pkg06_scene*.png`
- Frames: `exports/run-comparison-c8dd3caf/screenshots/new/pkg06_video_{first,mid,last}.jpg`
- Contact: `exports/run-comparison-c8dd3caf/contact-sheets/new/pkg06_video_fml.jpg`
- Visual note: 2 ideation attempts + 10 fingerprint rejects.

#### Platform texts

##### tiktok

- title: Everything Rehearsed. Except the Questions.
- caption: Rewrote the pricing page 3 times. Visitors still left. The page was fine. The problem was the unanswered question.
- body: Everything rehearsed. Except what happens when someone asks a question. The pricing page was rewritten three times. FAQs added. Comparison tables. Testimonials. Visitors still left. Because the page couldn't catch the one specific thing they needed to know. There was no one — and nothing — to answer in the moment. That empty chair in your preparation? It costs you every day. Fenrik.chat fills it in about a minute.
- cta: Link in bio to fix the empty chair on your site.
- hashtags: #saas #websitetips #conversionrate #smallbusiness #aichatbot

##### instagram

- title: Everything Rehearsed. Except the Questions.
- caption: They rewrote the pricing page three times.

Added FAQs. Added testimonials. Added a comparison table.

Visitors still dropped off — because none of it could answer the one specific question each person actually had.

The page was never the problem. The silence was.
- body: Everything rehearsed. Except what happens when someone asks a question. The pricing page was rewritten three times. FAQs added. Comparison tables. Testimonials. Visitors still left. Because the page couldn't catch the one specific thing they needed to know. There was no one — and nothing — to answer in the moment. That empty chair in your preparation? It costs you every day. Fenrik.chat fills it in about a minute.
- cta: If your website can't respond in the moment, the preparation doesn't matter. Link in bio.
- hashtags: #websitestrategy #saasmarketing #leadgeneration #aichatbot #smallbusiness #conversionoptimization #customersupport #digitalmarketing #b2bmarketing #fenrikchat

##### youtube

- title: Everything Rehearsed. Except the Questions.
- caption: You can rewrite the pricing page a hundred times. If visitors have a question the page didn't anticipate, they leave.
- body: Everything rehearsed. Except what happens when someone asks a question. The pricing page was rewritten three times. FAQs added. Comparison tables. Testimonials. Visitors still left. Because the page couldn't catch the one specific thing they needed to know. There was no one — and nothing — to answer in the moment. That empty chair in your preparation? It costs you every day. Fenrik.chat fills it in about a minute.
- cta: Subscribe for more on what actually stops visitors from converting.
- hashtags: #websiteconversion #saas #aichatbot

##### linkedin

- title: Static content prepares for the performance. Not for the response.
- caption: Most website optimization advice focuses on the content — clearer copy, better layout, stronger social proof.

But there's a category of visitor loss that no amount of rewriting addresses: the person who had one specific question, found no way to ask it, and left.

Every day your website can't respond in the moment is a day that question goes unanswered.

The preparation was thorough. The response layer was missing.
- body: Everything rehearsed. Except what happens when someone asks a question. The pricing page was rewritten three times. FAQs added. Comparison tables. Testimonials. Visitors still left. Because the page couldn't catch the one specific thing they needed to know. There was no one — and nothing — to answer in the moment. That empty chair in your preparation? It costs you every day. Fenrik.chat fills it in about a minute.
- cta: What does your website do when a visitor has a question at 11 PM?
- hashtags: #saas #conversionoptimization #b2bmarketing

##### facebook

- title: Everything Rehearsed. Except the Questions.
- caption: Here's something a lot of SaaS teams discover too late: rewriting the pricing page doesn't stop visitors from leaving. FAQs, testimonials, comparison tables — none of it catches the one specific question a visitor had that the page never anticipated. The gap isn't the content. It's that there's nothing interactive to catch them before they go. An AI assistant on your website can answer those in-the-moment questions automatically — built from your existing content, live in about a minute. 💬
- body: Everything rehearsed. Except what happens when someone asks a question. The pricing page was rewritten three times. FAQs added. Comparison tables. Testimonials. Visitors still left. Because the page couldn't catch the one specific thing they needed to know. There was no one — and nothing — to answer in the moment. That empty chair in your preparation? It costs you every day. Fenrik.chat fills it in about a minute.
- cta: Try it free at fenrik.chat — no signup needed to preview.
- hashtags: #smallbusiness #websitetips

##### x

- title: Everything Rehearsed. Except the Questions.
- caption: Rewrote the pricing page 3 times. Added FAQs. Added testimonials. Visitors still left. The page was never the problem.
- body: Everything rehearsed. Except what happens when someone asks a question. The pricing page was rewritten three times. FAQs added. Comparison tables. Testimonials. Visitors still left. Because the page couldn't catch the one specific thing they needed to know. There was no one — and nothing — to answer in the moment. That empty chair in your preparation? It costs you every day. Fenrik.chat fills it in about a minute.
- cta: fenrik.chat
- hashtags: #saas #conversionrate

#### Cena a čas

- AI text: $0.4413
- media est: $0.3563 (images=5)
- steps 15; tokens 45844/33213
- AI 10.46 min; video job 5.96 min
- by_step: `{"Creative Direction Generation":{"count":1,"cost":0.035382,"ms":45137,"retries":0},"Creative Direction Evaluation":{"count":1,"cost":0.038595,"ms":37860,"retries":0},"Creative Ideation":{"count":2,"cost":0.325515,"ms":400521,"retries":0},"Creative Evaluation":{"count":1,"cost":0.032757,"ms":31061,"retries":0},"Creative Engine":{"count":1,"cost":0,"ms":0,"retries":0},"Candidate Judge":{"count":1,"cost":0,"ms":0,"retries":0},"Narrative Beats":{"count":1,"cost":0,"ms":2,"retries":0},"Presentation Generation":{"count":1,"cost":0.009015,"ms":109206,"retries":0},"Hook Enforcement":{"count":1,"cost":0,"ms":1,"retries":0},"Concept Fidelity":{"count":1,"cost":0,"ms":5,"retries":0},"Story Integrity":{"count":1,"cost":0,"ms":4,"retries":0},"Product Demonstration Integrity":{"count":1,"cost":0,"ms":2,"retries":0},"Platform Outputs":{"count":1,"cost":0,"ms":0,"retries":0},"Persist Package":{"count":1,"cost":0,"ms":3785,"retries":0}}`

### Package index 7 — completed

#### Identita

- package_index: 7
- production_run_item_id: `5a40e05c-db54-4441-b404-a4d23046df1a`
- strategy_item_id: `8c5b1ef3-6f08-45d2-aea6-ca4800fcd6e2`
- content_package_id: `d1a670ac-f061-45d7-a8e7-3e27a44447d2`
- content_item IDs: `d8b17137-adde-4334-b6af-c02ba8a21d66`, `6f8b9a14-943d-4a4d-9997-69b8ff0c89ee`, `bda3ea78-818b-4456-bc31-00ebddfe0730`, `9efa382f-bc72-4d06-9848-9150524fa338`, `f411bded-6a03-40a9-92be-7c6a9ce984b9`, `728ec05b-a9d1-4169-ab09-e17fa1ddfd4f`, `c8bd8834-c9fd-4bd7-9878-590abfa899a3`, `24a2f497-cf80-4e2c-b051-499d3335d19d`, `b31d937c-d298-4704-966e-d9a980e9cabe`, `c5b9eaaa-b882-44b1-9419-08f544c60245`
- video_job_id: `d5ab80a8-866f-4df1-b1d6-ed28963c35d5`
- téma: Why hiring more staff doesn't fix the problem of visitors who leave before they ever make contact
- funnel: problem_aware
- title: One tab closed. No record. No email. Just gone.

#### Strategie a kreativní vstup

- angle: Challenge the instinct to solve the 24/7 support problem by adding headcount. More staff helps with calls and emails — it doesn't help the visitor who silently bounced from the services page at midnight. The gap isn't staffing. It's the website itself having no way to respond.
- hook: One tab closed. No email. No missed call. No record. Just gone.
- winner concept id: c2
- concept: A physical corkboard holds a row of card-stock browser tabs — each one a business shortlisted by a late-night researcher. One tab is slowly, deliberately lifted off the board. The gap it leaves is the entire story. We pivot to the business owner opening email the next morning: nothing. The gap remains. The video closes on that empty pin hole — a permanent, invisible record of a decision the business owner will never know happened.
- CTA: {"text":"Create your AI assistant — let your website answer the question that keeps your tab on the board.","type":"sign_up"}
- directions: gen 7; selected [object Object], [object Object], [object Object]
- concepts: gen 7; rejected 6; ideation_attempts 1; critic_attempts 0
- rejected reasons: převážně `fingerprint_collision_recent_package` — viz `data/new/rejected-sample.json`
- tts_voice: shimmer; visual_profile: NATURAL; visual_medium: SOFT_3D

#### Voiceover

```
One tab closed. No email. No missed call. No record. Just gone. Someone was comparing you to three other businesses last night. They had a question. Your website said nothing. So they lifted your tab right off their shortlist. You checked your inbox this morning — quiet night, right? It wasn't quiet. Your website just had no way to answer the one question that would have kept you in the running. It still doesn't.
```

#### Storyboard / scény

- **Scene 1** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/d5ab80a8-866f-4df1-b1d6-ed28963c35d5/scene-scene-1.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame. A mid-toned corkboard fills the frame with layered depth — foreground texture of the board surface, background slightly softened. A neat horizontal row of muted card
- **Scene 2** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/d5ab80a8-866f-4df1-b1d6-ed28963c35d5/scene-scene-2.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame. The same mid-toned corkboard, now showing the aftermath: a clean gap in the row of card-stock tabs where one has been removed. The remaining tabs — sage, slate, crea
- **Scene 3** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/d5ab80a8-866f-4df1-b1d6-ed28963c35d5/scene-scene-3.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame. A person seated at a surface in a quiet interior, three-quarter angle from behind and to the side. They face a monitor showing multiple browser windows — one visibly
- **Scene 4** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/d5ab80a8-866f-4df1-b1d6-ed28963c35d5/scene-scene-4.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame. A business owner in a quiet morning interior, standing at a counter, holding a smartphone with the screen facing the viewer — an email inbox displayed with no new me
- **Scene 5** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/d5ab80a8-866f-4df1-b1d6-ed28963c35d5/scene-scene-5.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame. Final close: the corkboard again, now filling the entire frame. The row of card-stock tabs — sage, slate, cream — is intact except for the one gap. The empty pin cas

- Stills: `exports/run-comparison-c8dd3caf/stills/new/pkg07_scene*.png`
- Frames: `exports/run-comparison-c8dd3caf/screenshots/new/pkg07_video_{first,mid,last}.jpg`
- Contact: `exports/run-comparison-c8dd3caf/contact-sheets/new/pkg07_video_fml.jpg`
- Visual note: Strong hook; opening still feels agency-generic vs concept.

#### Platform texts

##### tiktok

- title: One tab closed. No record. No email. Just gone.
- caption: They had one question. Your site said nothing. Tab closed. You'll never know it happened.
- body: One tab closed. No email. No missed call. No record. Just gone. Someone was comparing you to three other businesses last night. They had a question. Your website said nothing. So they lifted your tab right off their shortlist. You checked your inbox this morning — quiet night, right? It wasn't quiet. Your website just had no way to answer the one question that would have kept you in the running. It still doesn't.
- cta: Link in bio — let your website answer before they close the tab.
- hashtags: #smallbusiness #websitetips #leadgeneration #aichatbot #businessgrowth

##### instagram

- title: One tab closed. No record. No email. Just gone.
- caption: Someone shortlisted you last night.

They had a question. Your website had nothing.

They didn't bounce in frustration — they just quietly moved on. No trace. No email. No missed call.

Your inbox looked calm this morning. It wasn't a calm night.
- body: One tab closed. No email. No missed call. No record. Just gone. Someone was comparing you to three other businesses last night. They had a question. Your website said nothing. So they lifted your tab right off their shortlist. You checked your inbox this morning — quiet night, right? It wasn't quiet. Your website just had no way to answer the one question that would have kept you in the running. It still doesn't.
- cta: Create your AI assistant — link in bio.
- hashtags: #websitegrowth #smallbusiness #leadgeneration #aiforbusiness #onlinebusiness #chatbot #customersupport #businesstips #servicebusiness #digitalmarketing

##### youtube

- title: One tab closed. No record. No email. Just gone.
- caption: They compared you to three businesses last night — and closed your tab when no one answered their question.
- body: One tab closed. No email. No missed call. No record. Just gone. Someone was comparing you to three other businesses last night. They had a question. Your website said nothing. So they lifted your tab right off their shortlist. You checked your inbox this morning — quiet night, right? It wasn't quiet. Your website just had no way to answer the one question that would have kept you in the running. It still doesn't.
- cta: Create your AI assistant at fenrik.chat
- hashtags: #AIchatbot #SmallBusiness #WebsiteTips

##### linkedin

- title: One tab closed. No record. No email. Just gone.
- caption: There's a decision pattern most service businesses never see: a prospect compares three or four providers late at night, has one specific question, gets no response from one website, and quietly moves on.

No email. No missed call. No data point. Just a closed tab.

The business interprets the next morning's empty inbox as a slow night. It wasn't slow — it was invisible.

The gap isn't staffing. It's the website having no way to respond when it matters most.
- body: One tab closed. No email. No missed call. No record. Just gone. Someone was comparing you to three other businesses last night. They had a question. Your website said nothing. So they lifted your tab right off their shortlist. You checked your inbox this morning — quiet night, right? It wasn't quiet. Your website just had no way to answer the one question that would have kept you in the running. It still doesn't.
- cta: Create your AI assistant at fenrik.chat
- hashtags: #LeadGeneration #CustomerExperience #SmallBusiness

##### facebook

- title: One tab closed. No record. No email. Just gone.
- caption: Here's something most business owners don't realize: when a visitor leaves your website without making contact, there's no notification. No missed call. No alert. Just silence — and you interpret it as a quiet night. 🤔

Someone could have been comparing you to three competitors at midnight, had one unanswered question, and moved on. You'd never know.

Fenrik.chat gives your website a way to respond — even when you're not there.
- body: One tab closed. No email. No missed call. No record. Just gone. Someone was comparing you to three other businesses last night. They had a question. Your website said nothing. So they lifted your tab right off their shortlist. You checked your inbox this morning — quiet night, right? It wasn't quiet. Your website just had no way to answer the one question that would have kept you in the running. It still doesn't.
- cta: Create your AI assistant at fenrik.chat
- hashtags: #SmallBusiness #CustomerSupport #AIAssistant

##### x

- title: Hiring more staff won't fix this one
- caption: More staff answers more calls. It doesn't answer the visitor who silently bounced from your services page at 11 PM with one unanswered question.
- body: One tab closed. No email. No missed call. No record. Just gone. Someone was comparing you to three other businesses last night. They had a question. Your website said nothing. So they lifted your tab right off their shortlist. You checked your inbox this morning — quiet night, right? It wasn't quiet. Your website just had no way to answer the one question that would have kept you in the running. It still doesn't.
- cta: Your website can answer. fenrik.chat
- hashtags: #SmallBusiness #AIchatbot

#### Cena a čas

- AI text: $0.3853
- media est: $0.3562 (images=5)
- steps 13; tokens 34784/18730
- AI 6.17 min; video job 6.36 min
- by_step: `{"Creative Direction Generation":{"count":1,"cost":0.035973,"ms":42025,"retries":0},"Creative Direction Evaluation":{"count":1,"cost":0.034092,"ms":29987,"retries":0},"Creative Ideation":{"count":1,"cost":0.185241,"ms":230144,"retries":0},"Creative Engine":{"count":1,"cost":0,"ms":0,"retries":0},"Candidate Judge":{"count":1,"cost":0,"ms":0,"retries":0},"Narrative Beats":{"count":1,"cost":0,"ms":2,"retries":0},"Presentation Generation":{"count":1,"cost":0.129996,"ms":64942,"retries":0},"Hook Enforcement":{"count":1,"cost":0,"ms":0,"retries":0},"Concept Fidelity":{"count":1,"cost":0,"ms":2,"retries":0},"Story Integrity":{"count":1,"cost":0,"ms":2,"retries":0},"Product Demonstration Integrity":{"count":1,"cost":0,"ms":2,"retries":0},"Platform Outputs":{"count":1,"cost":0,"ms":0,"retries":0},"Persist Package":{"count":1,"cost":0,"ms":3368,"retries":0}}`

### Package index 8 — completed

#### Identita

- package_index: 8
- production_run_item_id: `d62ae528-dbdf-456c-b536-9e7411b6dcf5`
- strategy_item_id: `8b5fe7ae-98c0-4171-b398-c446646aee96`
- content_package_id: `baa33649-9a95-47b5-8eb1-1324dbd70514`
- content_item IDs: `e3d584a5-1b9c-445e-a161-2d47734a3eb0`, `a153190e-d8a2-4a98-9c24-a283246eff1a`, `4947de7f-f343-48ff-8455-31d4acf3f4e8`, `8a4fb6db-d014-4ac6-865a-87d9757ce828`, `38599356-58d1-4de9-a57f-da7e8ef3b744`, `1ff93114-c2e8-4e22-805a-948fa7c4a2c9`, `b2f36948-c9fa-4579-9795-e94baf88441c`, `0b623b63-f146-4f13-b8f4-3bdf4c173936`, `7755e575-4561-4596-b37a-fd5a257cd911`, `a73bb1fa-ccb9-450f-bd00-5acae34660a6`, `3af52243-f1b7-44a2-861d-b52a797d53f0`
- video_job_id: `39c3b4a6-94cd-4d1a-b029-3c5efe91b55d`
- téma: What changes when your website can actually answer a visitor's question — the moment they ask it
- funnel: solution_aware
- title: You Built the Whole Pipeline. You Just Forgot to Put Anything at the End of It.

#### Strategie a kreativní vstup

- angle: Contrast the before and after without product jargon. Before: visitor arrives, has a question, finds nothing, leaves. After: visitor arrives, types a question, gets a direct answer, stays engaged, leaves contact details. No staff involved. No waiting. Show the shift from passive page to active conversation.
- hook: You built the whole pipeline. You just forgot to put anything at the end of it.
- winner concept id: c3
- concept: A physical copper pipe system — beautifully assembled, clearly expensive and deliberate — carries water from an elevated source through a series of solid joints and fixtures. The camera slowly traces each connection: this is not a cheap installation. Then the final section of pipe simply ends, open, above a shallow tray of dry sand. Water pours out and disappears immediately. Nothing captured. Nothing redirected. Just gone. A single hand enters the frame and places one small brass fitting at the pipe's open end. The water now flows into a waiting container. The sand stays dry. The pipe system is unchanged. One small addition made the entire investment work.
- CTA: {"text":"Create your AI assistant — let your website finally catch what you spent so much to send its way.","type":"sign_up"}
- directions: gen 7; selected [object Object], [object Object], [object Object]
- concepts: gen 7; rejected 5; ideation_attempts 1; critic_attempts 1
- rejected reasons: převážně `fingerprint_collision_recent_package` — viz `data/new/rejected-sample.json`
- tts_voice: cedar; visual_profile: MINIMAL; visual_medium: SOFT_3D

#### Voiceover

```
You built the whole pipeline. You just forgot to put anything at the end of it. The SEO. The ads. The content. All of it flowing toward your website. And then — nothing. A visitor arrives, types a question, gets silence, and leaves. Every bit of upstream investment pours straight into the ground. One small addition changes that. Your website reads itself, builds its own knowledge, and answers the next visitor before you even know they were there.
```

#### Storyboard / scény

- **Scene 1** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/39c3b4a6-94cd-4d1a-b029-3c5efe91b55d/scene-scene-1.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame. Extreme close-up on a single polished copper elbow joint mounted on a raw wood workshop bench surface. Water is visibly moving through the joint — a faint shimmer of
- **Scene 2** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/39c3b4a6-94cd-4d1a-b029-3c5efe91b55d/scene-scene-2.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame. Wide environmental shot of a complete copper pipe system mounted horizontally along a raw wood workshop bench. Multiple solid elbow joints and straight runs are visi
- **Scene 3** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/39c3b4a6-94cd-4d1a-b029-3c5efe91b55d/scene-scene-3.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame. The final open end of the copper pipe system terminates above a shallow wooden tray filled with pale dry sand. Water pours steadily from the open pipe end and disapp
- **Scene 4** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/39c3b4a6-94cd-4d1a-b029-3c5efe91b55d/scene-scene-4.png`
  - prompt: Soft polished 3D render, portrait 9:16 vertical frame. A single human hand enters the frame from the right and places one small brass fitting onto the open end of the copper pipe. The fitting is compact and purposeful — 
- **Scene 5** (IMAGE, 4s) `project-assets/aabab9ff-9db4-4012-a53c-135e3bfea6cd/source/b1b0d00c-0bfc-4095-954f-4b38a813747f/component-capture.png`
  - prompt: Show this landscape product UI screenshot as a framed laptop screen insert during the final resolution beat (seconds 18–23); place it centered within a clean laptop mockup positioned on the raw wood workshop bench surfac

- Stills: `exports/run-comparison-c8dd3caf/stills/new/pkg08_scene*.png`
- Frames: `exports/run-comparison-c8dd3caf/screenshots/new/pkg08_video_{first,mid,last}.jpg`
- Contact: `exports/run-comparison-c8dd3caf/contact-sheets/new/pkg08_video_fml.jpg`
- Visual note: Pipeline-without-endpoint metaphor lands.

#### Platform texts

##### tiktok

- title: You Built the Whole Pipeline. You Just Forgot to Put Anything at the End of It.
- caption: You spent months building traffic. Your website still can't answer a single question when someone actually shows up.
- body: You built the whole pipeline. You just forgot to put anything at the end of it. The SEO. The ads. The content. All of it flowing toward your website. And then — nothing. A visitor arrives, types a question, gets silence, and leaves. Every bit of upstream investment pours straight into the ground. One small addition changes that. Your website reads itself, builds its own knowledge, and answers the next visitor before you even know they were there.
- cta: Link in bio to fix the last six inches.
- hashtags: #smallbusiness #websitetips #AIchatbot #leadgeneration

##### instagram

- title: You Built the Whole Pipeline. You Just Forgot to Put Anything at the End of It.
- caption: The SEO worked. The ads worked. The content worked.

And then a visitor arrived, typed a question, got silence — and left.

Every bit of upstream investment pours straight into the ground when your website can't answer the moment someone asks.

One embed script changes that. No dev. No training. Just answers.
- body: You built the whole pipeline. You just forgot to put anything at the end of it. The SEO. The ads. The content. All of it flowing toward your website. And then — nothing. A visitor arrives, types a question, gets silence, and leaves. Every bit of upstream investment pours straight into the ground. One small addition changes that. Your website reads itself, builds its own knowledge, and answers the next visitor before you even know they were there.
- cta: Try a live preview — link in bio.
- hashtags: #smallbusiness #websitestrategy #AIassistant #leadgeneration #chatbot #digitalmarketing #businessgrowth #customersupport

##### youtube

- title: You Built the Whole Pipeline. You Just Forgot to Put Anything at the End of It.
- caption: You built the whole pipeline — and the last six inches are losing every lead you paid for.
- body: You built the whole pipeline. You just forgot to put anything at the end of it. The SEO. The ads. The content. All of it flowing toward your website. And then — nothing. A visitor arrives, types a question, gets silence, and leaves. Every bit of upstream investment pours straight into the ground. One small addition changes that. Your website reads itself, builds its own knowledge, and answers the next visitor before you even know they were there.
- cta: See how one embed script fixes it. https://fenrik.chat
- hashtags: #AIchatbot #smallbusiness #websitetips

##### linkedin

- title: Your traffic strategy is working. Your website still isn't.
- caption: There's a specific moment where most website investments quietly fail: the visitor who arrives ready to ask something. The content brought them there. The design held their attention. Then they typed a question — and got silence. Fenrik.chat reads your existing website and builds an AI assistant that answers in real time, captures contact details, and keeps the conversation going. No developer. No manual training. One embed script. The upstream investment finally pays off at the point that actually matters.
- body: You built the whole pipeline. You just forgot to put anything at the end of it. The SEO. The ads. The content. All of it flowing toward your website. And then — nothing. A visitor arrives, types a question, gets silence, and leaves. Every bit of upstream investment pours straight into the ground. One small addition changes that. Your website reads itself, builds its own knowledge, and answers the next visitor before you even know they were there.
- cta: Create your AI assistant at fenrik.chat. https://fenrik.chat
- hashtags: #leadgeneration #AIchatbot #smallbusiness

##### facebook

- title: You Built the Whole Pipeline. You Just Forgot to Put Anything at the End of It.
- caption: Here's something most business owners don't catch until they look at their analytics: the traffic is working. The ads, the SEO, the social posts — all sending real people to the website. But when a visitor arrives and types a question, there's no one there to answer it. They leave. No contact, no lead, no follow-up. Fenrik.chat builds an AI assistant directly from your existing website content — no coding, no training, ready in about a minute. Your pipeline finally has something at the end of it. 👇
- body: You built the whole pipeline. You just forgot to put anything at the end of it. The SEO. The ads. The content. All of it flowing toward your website. And then — nothing. A visitor arrives, types a question, gets silence, and leaves. Every bit of upstream investment pours straight into the ground. One small addition changes that. Your website reads itself, builds its own knowledge, and answers the next visitor before you even know they were there.
- cta: Create your AI assistant at fenrik.chat. https://fenrik.chat
- hashtags: #smallbusiness #AIchatbot

##### x

- title: One small addition. Every upstream investment finally pays off.
- caption: Your ads worked. Your SEO worked. Your content worked. Then someone asked a question and your website poured the whole investment straight into the sand. fenrik.chat
- body: You built the whole pipeline. You just forgot to put anything at the end of it. The SEO. The ads. The content. All of it flowing toward your website. And then — nothing. A visitor arrives, types a question, gets silence, and leaves. Every bit of upstream investment pours straight into the ground. One small addition changes that. Your website reads itself, builds its own knowledge, and answers the next visitor before you even know they were there.
- cta: fenrik.chat
- hashtags: #AIchatbot #smallbusiness

#### Cena a čas

- AI text: $0.4235
- media est: $0.2868 (images=4)
- steps 14; tokens 39012/20431
- AI 6.64 min; video job 5.29 min
- by_step: `{"Creative Direction Generation":{"count":1,"cost":0.036282,"ms":42906,"retries":0},"Creative Direction Evaluation":{"count":1,"cost":0.037581,"ms":35379,"retries":0},"Creative Ideation":{"count":1,"cost":0.182523,"ms":217723,"retries":0},"Creative Evaluation":{"count":1,"cost":0.031569,"ms":29992,"retries":0},"Creative Engine":{"count":1,"cost":0,"ms":0,"retries":0},"Candidate Judge":{"count":1,"cost":0,"ms":0,"retries":0},"Narrative Beats":{"count":1,"cost":0,"ms":3,"retries":0},"Presentation Generation":{"count":1,"cost":0.135546,"ms":69587,"retries":0},"Hook Enforcement":{"count":1,"cost":0,"ms":0,"retries":0},"Concept Fidelity":{"count":1,"cost":0,"ms":5,"retries":0},"Story Integrity":{"count":1,"cost":0,"ms":3,"retries":0},"Product Demonstration Integrity":{"count":1,"cost":0,"ms":2,"retries":0},"Platform Outputs":{"count":1,"cost":0,"ms":0,"retries":0},"Persist Package":{"count":1,"cost":0,"ms":2987,"retries":0}}`

### Package index 9 — failed

#### Identita

- package_index: 9
- production_run_item_id: `71454a85-3c5a-47d3-8ace-546705dfdad4`
- strategy_item_id: `47671e25-52ea-47ff-aa98-578fef1d7370`
- content_package_id: null
- content_item IDs: —
- video_job_id: —
- téma: How a small law firm started capturing after-hours leads without hiring anyone or changing how they work
- funnel: solution_aware
- title: —

#### Fail

```json
{
  "error": "generation_failed",
  "message": "Middle beats abandon the primary actor / product world for unrelated subjects (actor tokens: empty, measurement, system, attorney)",
  "validation_errors": [
    {
      "path": "story_integrity.primary_actor_changed",
      "message": "Middle beats abandon the primary actor / product world for unrelated subjects (actor tokens: empty, measurement, system, attorney)"
    }
  ],
  "attempts": 1
}
```

- **Co vzniklo:** strategy item + AI pokus(y). Package artifacts nezapsány.
- **Zahozeno:** directions/concepts/storyboard — **Nelze obsahově porovnat, protože failed intermediate output se nepersistuje.**
- **Attempts:** 1
- **Odhad AI waste:** ~$0.4622
- **Telemetry/raw:** není v DB; Vercel logy nedostupné.

### Package index 10 — completed

#### Identita

- package_index: 10
- production_run_item_id: `e1049942-c91e-403a-8837-36a22d9a516b`
- strategy_item_id: `3dc35484-d655-4ad2-b71d-a4c4a1950932`
- content_package_id: `fe94adbf-1f6b-4724-916c-4a80f8c4bb57`
- content_item IDs: `b048c536-ee70-470d-bb5a-3c4b8dd1b709`, `8fcf4309-8934-486b-84e9-104366eec21e`, `555ccdeb-3095-4ba8-9297-4d0dca2a148a`, `930efcd3-4b81-48d4-a247-085cb91ffa98`, `e2a5f831-8c70-4088-8e15-59dc7b12cf20`, `dd3e976f-035b-44b2-a018-bc3373d7f973`, `c3b86618-ebd0-42d3-96d8-fa3d7eca7d06`, `a56a0372-aba6-4694-afd5-a97207c14b7e`, `4ec771ca-e8f9-4d14-aa16-9e9c7831c563`, `d8c320af-9a3c-427c-8375-9918120d54a2`, `cb98eac1-9a9d-4246-835c-aa39edb1f71d`
- video_job_id: `a1393ba9-6e0a-4b85-849b-bc1b5f83ad7a`
- téma: The part of setting up an AI assistant for your website that most business owners expect to be hard — and isn't
- funnel: solution_aware
- title: Every other chatbot integration looks like this.

#### Strategie a kreativní vstup

- angle: Address the assumption that adding any kind of chat or AI to a website requires a developer, a budget, and weeks of work. Walk through what actually happens: paste your URL, the assistant reads your existing content, you preview it live, you add one embed line. The friction people imagine doesn't exist.
- hook: Every other chatbot integration looks like this.
- winner concept id: c2
- concept: A long linen-colored paper timeline strip is slowly unrolled across a pale birch table — milestone markers hand-lettered in dark ink, dev phases, QA windows, training periods — the strip keeps going, past the edge of the frame. Then a second strip is placed deliberately beside it. Eight centimeters. Four labeled steps. The camera pulls back overhead to show both strips in full. The long one has left the frame entirely. The short one sits with room to spare. Final card: 'Create your AI assistant.'
- CTA: {"text":"Create your AI assistant — the setup is shorter than you think.","type":"sign_up"}
- directions: gen 7; selected [object Object], [object Object], [object Object], [object Object]
- concepts: gen 9; rejected 7; ideation_attempts 1; critic_attempts 1
- rejected reasons: převážně `fingerprint_collision_recent_package` — viz `data/new/rejected-sample.json`
- tts_voice: cedar; visual_profile: EDITORIAL; visual_medium: PHOTOGRAPHIC

#### Voiceover

```
Every other chatbot integration looks like this. Weeks of planning. Dev sprints. QA cycles. Training phases. Then a launch date that keeps moving. We assumed adding AI to a website worked the same way. It doesn't. Paste your URL. It reads your content. You preview it live. One embed line. That's the whole thing.
```

#### Storyboard / scény

- **Scene 1** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a1393ba9-6e0a-4b85-849b-bc1b5f83ad7a/scene-scene-1.png`
  - prompt: Overhead flat-lay photorealistic photograph, portrait 9:16 vertical frame. Pale birch wood table surface, soft natural window daylight from the left, cool neutral color feel. Two hands — one at each side — are mid-motion
- **Scene 2** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a1393ba9-6e0a-4b85-849b-bc1b5f83ad7a/scene-scene-2.png`
  - prompt: Overhead flat-lay photorealistic photograph, portrait 9:16 vertical frame. Same pale birch table, same soft natural window daylight, cool neutral color feel. The long linen paper strip still runs horizontally across the 
- **Scene 3** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a1393ba9-6e0a-4b85-849b-bc1b5f83ad7a/scene-scene-3.png`
  - prompt: Overhead flat-lay photorealistic photograph, portrait 9:16 vertical frame, pulled back to a wider field of view. Pale birch table, soft natural window daylight, cool neutral color feel. The full comparison is now visible
- **Scene 4** (CTA, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a1393ba9-6e0a-4b85-849b-bc1b5f83ad7a/scene-scene-4.png`
  - prompt: presentation:cta:scene-4

- Stills: `exports/run-comparison-c8dd3caf/stills/new/pkg10_scene*.png`
- Frames: `exports/run-comparison-c8dd3caf/screenshots/new/pkg10_video_{first,mid,last}.jpg`
- Contact: `exports/run-comparison-c8dd3caf/contact-sheets/new/pkg10_video_fml.jpg`
- Visual note: More product-demo oriented; less stop-scroll.

#### Platform texts

##### tiktok

- title: Every other chatbot integration looks like this.
- caption: We thought adding AI to a website meant months of dev work. It's embarrassingly shorter than that.
- body: Every other chatbot integration looks like this. Weeks of planning. Dev sprints. QA cycles. Training phases. Then a launch date that keeps moving. We assumed adding AI to a website worked the same way. It doesn't. Paste your URL. It reads your content. You preview it live. One embed line. That's the whole thing.
- cta: Link in bio to try it yourself.
- hashtags: #AIchatbot #WebsiteTools #SmallBusiness #NoCode #SaaS

##### instagram

- title: Every other chatbot integration looks like this.
- caption: We assumed adding an AI assistant to a website looked like a dev project.

Timeline. Sprints. QA. Training. Launch dates that slip.

It's actually: paste your URL, preview it live, add one line of code.

The friction you're imagining doesn't exist.
- body: Every other chatbot integration looks like this. Weeks of planning. Dev sprints. QA cycles. Training phases. Then a launch date that keeps moving. We assumed adding AI to a website worked the same way. It doesn't. Paste your URL. It reads your content. You preview it live. One embed line. That's the whole thing.
- cta: Try it free — link in bio.
- hashtags: #AIAssistant #WebsiteTips #SmallBusiness #NoCode #ChatbotForWebsite #LeadGeneration #BusinessTools #SaaS #DigitalMarketing #WorkSmarter

##### youtube

- title: Every other chatbot integration looks like this.
- caption: We all assumed this was a dev project. It isn't — watch the comparison.
- body: Every other chatbot integration looks like this. Weeks of planning. Dev sprints. QA cycles. Training phases. Then a launch date that keeps moving. We assumed adding AI to a website worked the same way. It doesn't. Paste your URL. It reads your content. You preview it live. One embed line. That's the whole thing.
- cta: Subscribe for more tools that actually fit small business. https://fenrik.chat
- hashtags: #AIchatbot #WebsiteAI #SmallBusinessTools

##### linkedin

- title: Why business owners keep postponing an AI assistant — and why they shouldn't
- caption: The reason most service businesses still don't have an AI assistant on their website isn't cost — it's the assumption that setup is complicated. Paste your URL. The assistant reads your existing content automatically. Preview it live before committing. Add one embed line. That's the full process. The version of this you've been putting off doesn't exist.
- body: Every other chatbot integration looks like this. Weeks of planning. Dev sprints. QA cycles. Training phases. Then a launch date that keeps moving. We assumed adding AI to a website worked the same way. It doesn't. Paste your URL. It reads your content. You preview it live. One embed line. That's the whole thing.
- cta: Create your AI assistant at fenrik.chat. https://fenrik.chat
- hashtags: #AIAssistant #SmallBusiness #NoCode

##### facebook

- title: Every other chatbot integration looks like this.
- caption: Honest question: how long did you think it would take to add an AI assistant to your website? 🤔 Most business owners assume it means hiring a developer, setting a budget, and waiting weeks. The actual process is: paste your URL, watch it read your content, preview it live, and add one embed line. That's it. Fenrik.chat creates your AI assistant in about a minute — no technical knowledge needed.
- body: Every other chatbot integration looks like this. Weeks of planning. Dev sprints. QA cycles. Training phases. Then a launch date that keeps moving. We assumed adding AI to a website worked the same way. It doesn't. Paste your URL. It reads your content. You preview it live. One embed line. That's the whole thing.
- cta: Visit fenrik.chat to create yours. https://fenrik.chat
- hashtags: #SmallBusiness #AITools #WebsiteTips

##### x

- title: Your assumption about AI chatbot complexity is the only thing making it hard
- caption: The complexity of adding an AI assistant to your website exists almost entirely in your head. Paste URL → reads your content → live preview → one embed. That's it. #NoCode
- body: Every other chatbot integration looks like this. Weeks of planning. Dev sprints. QA cycles. Training phases. Then a launch date that keeps moving. We assumed adding AI to a website worked the same way. It doesn't. Paste your URL. It reads your content. You preview it live. One embed line. That's the whole thing.
- cta: fenrik.chat
- hashtags: #NoCode #AItools

#### Cena a čas

- AI text: $0.4542
- media est: $0.2147 (images=3)
- steps 14; tokens 39439/22390
- AI 7.23 min; video job 3.74 min
- by_step: `{"Creative Direction Generation":{"count":1,"cost":0.036699,"ms":42048,"retries":0},"Creative Direction Evaluation":{"count":1,"cost":0.039711,"ms":38733,"retries":0},"Creative Ideation":{"count":1,"cost":0.218325,"ms":257386,"retries":0},"Creative Evaluation":{"count":1,"cost":0.030783,"ms":29354,"retries":0},"Creative Engine":{"count":1,"cost":0,"ms":0,"retries":0},"Candidate Judge":{"count":1,"cost":0,"ms":0,"retries":0},"Narrative Beats":{"count":1,"cost":0,"ms":2,"retries":0},"Presentation Generation":{"count":1,"cost":0.128649,"ms":62695,"retries":0},"Hook Enforcement":{"count":1,"cost":0,"ms":0,"retries":0},"Concept Fidelity":{"count":1,"cost":0,"ms":4,"retries":0},"Story Integrity":{"count":1,"cost":0,"ms":4,"retries":0},"Product Demonstration Integrity":{"count":1,"cost":0,"ms":1,"retries":0},"Platform Outputs":{"count":1,"cost":0,"ms":0,"retries":0},"Persist Package":{"count":1,"cost":0,"ms":3628,"retries":0}}`

### Package index 11 — completed

#### Identita

- package_index: 11
- production_run_item_id: `a9a448ec-2730-420f-814d-fc66d1dedf86`
- strategy_item_id: `845fcba0-ad98-49f9-ad35-f66fa7cf95f4`
- content_package_id: `df50081f-f028-4ca0-b6c7-24c758d4d578`
- content_item IDs: `9cf6a551-5c03-453f-b273-f390307dbca5`, `b5893e0f-35f1-46ae-9704-929da7383ec9`, `4fe5d63d-8e90-4f78-9a89-625b90b23ae3`, `1bc3a9db-b1c7-467f-8618-9cd9f4afc07b`, `e635bb2c-9c9b-4131-9944-6018292f089d`, `4d50e28c-e991-4bb1-8220-3302cce2320e`, `6a947548-e0dd-47a6-90cf-08b325b6047a`, `9cb45522-d2dc-43ef-9f60-4cff6764e554`, `3f11dba5-9905-4320-8cdc-3094833f62ea`, `35a2db08-bea1-4b84-8f30-d573a04788e3`
- video_job_id: `b056b3d1-ac1b-4df7-8b6c-234d19b436e4`
- téma: Why the businesses that capture the most leads aren't always the ones with the best product — they're the ones whose websites respond first
- funnel: solution_aware
- title: The Blank Field

#### Strategie a kreativní vstup

- angle: Reframe lead capture as a speed and availability game. The prospect who visits three competing websites at 10 PM will contact the one that answers their question. Not the one with the best branding or the longest track record. Availability wins. Connect to the pain of losing leads to competitors simply because the website was silent.
- hook: You track everything. Except the thing that's costing you the most.
- winner concept id: c3
- concept: A printed analytics report on a pale eucalyptus desk reveals every metric a consulting business tracks — except one. The final row is blank. Not zero. Empty. A hand circles the blank field with a pencil. The report is flipped; the back is bare. The realization lands: the loss is invisible because the system has no mechanism to detect it. The AI assistant is introduced as the mechanism that creates the data that was always structurally absent — not by fixing a number, but by capturing conversations that previously left no record at all.
- CTA: {"text":"Create your AI assistant — start capturing what the blank field never could.","type":"sign_up"}
- directions: gen 7; selected [object Object], [object Object], [object Object], [object Object]
- concepts: gen 8; rejected 6; ideation_attempts 1; critic_attempts 1
- rejected reasons: převážně `fingerprint_collision_recent_package` — viz `data/new/rejected-sample.json`
- tts_voice: shimmer; visual_profile: NATURAL; visual_medium: PHOTOGRAPHIC

#### Voiceover

```
You track everything. Except the thing that's costing you the most. Every number has a row. But there's one row your analytics will never fill in on its own — visitors who left with a question you never knew they had. Not a bad number. An absent one. You can't improve what you can't detect. Fenrik.chat gives your website a voice after hours — and starts filling in the blank.
```

#### Storyboard / scény

- **Scene 1** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b056b3d1-ac1b-4df7-8b6c-234d19b436e4/scene-scene-1.png`
  - prompt: Extreme close-up photorealistic portrait 9:16 vertical frame. A printed analytics report — rows of data visible as structured columns, no readable text — is being slid across a pale eucalyptus wood surface. Two fingers h
- **Scene 2** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b056b3d1-ac1b-4df7-8b6c-234d19b436e4/scene-scene-2.png`
  - prompt: Close detail photorealistic portrait 9:16 vertical frame. A hand holds a mechanical pencil, drawing a deliberate circle around the blank bottom row of a printed analytics report resting on a pale eucalyptus wood surface.
- **Scene 3** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b056b3d1-ac1b-4df7-8b6c-234d19b436e4/scene-scene-3.png`
  - prompt: Photorealistic portrait 9:16 vertical frame. The analytics report has been flipped over on the pale eucalyptus surface. The back of the paper faces up — completely blank, no marks, no print, no data. The pencil rests bes
- **Scene 4** (IMAGE, 4s) `video-renders/aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/b056b3d1-ac1b-4df7-8b6c-234d19b436e4/scene-scene-4.png`
  - prompt: Photorealistic portrait 9:16 vertical frame. A laptop sits open on the same pale eucalyptus wood surface, screen facing three-quarter toward the viewer. On the laptop screen: a clean chat interface showing a live convers

- Stills: `exports/run-comparison-c8dd3caf/stills/new/pkg11_scene*.png`
- Frames: `exports/run-comparison-c8dd3caf/screenshots/new/pkg11_video_{first,mid,last}.jpg`
- Contact: `exports/run-comparison-c8dd3caf/contact-sheets/new/pkg11_video_fml.jpg`
- Visual note: Blank field concept concrete and convertible.

#### Platform texts

##### tiktok

- title: The Blank Field
- caption: Your analytics have a blank row you've never noticed. That row is costing you leads every night.
- body: You track everything. Except the thing that's costing you the most. Every number has a row. But there's one row your analytics will never fill in on its own — visitors who left with a question you never knew they had. Not a bad number. An absent one. You can't improve what you can't detect. Fenrik.chat gives your website a voice after hours — and starts filling in the blank.
- cta: Link in bio to fill it in.
- hashtags: #SmallBusiness #LeadGeneration #WebsiteTips #AIAssistant #BusinessGrowth

##### instagram

- title: The Blank Field
- caption: You track sessions. Bounce rate. Time on page.

But there's one row your analytics will never fill in — visitors who left with a question you never knew they had.

Not a bad number. An absent one.

Fenrik.chat gives your website a voice after hours, so that row finally starts to fill.
- body: You track everything. Except the thing that's costing you the most. Every number has a row. But there's one row your analytics will never fill in on its own — visitors who left with a question you never knew they had. Not a bad number. An absent one. You can't improve what you can't detect. Fenrik.chat gives your website a voice after hours — and starts filling in the blank.
- cta: Try it free — link in bio.
- hashtags: #SmallBusiness #LeadGen #WebsiteMarketing #AITools #CustomerSupport #BusinessTips #24x7Support #MarketingStrategy #ServiceBusiness #FenrikChat

##### youtube

- title: The Blank Field
- caption: Your analytics track everything — except the visitors who left with a question unanswered. That blank row is the one costing you leads.
- body: You track everything. Except the thing that's costing you the most. Every number has a row. But there's one row your analytics will never fill in on its own — visitors who left with a question you never knew they had. Not a bad number. An absent one. You can't improve what you can't detect. Fenrik.chat gives your website a voice after hours — and starts filling in the blank.
- cta: Subscribe for more. https://fenrik.chat
- hashtags: #LeadGeneration #SmallBusiness #AIAssistant

##### linkedin

- title: The Blank Field
- caption: Most businesses track sessions, bounce rate, and conversions. Almost none track visitors who left with a question unanswered — because that row doesn't exist in any dashboard.

The loss is invisible, which makes it impossible to improve through analysis alone.

The fix isn't more reporting. It's giving your website the ability to answer the question before the visitor closes the tab.

Fenrik.chat creates an AI assistant from your existing website content — no coding, no training. It starts working in about a minute.

Create yours at fenrik.chat
- body: You track everything. Except the thing that's costing you the most. Every number has a row. But there's one row your analytics will never fill in on its own — visitors who left with a question you never knew they had. Not a bad number. An absent one. You can't improve what you can't detect. Fenrik.chat gives your website a voice after hours — and starts filling in the blank.
- cta: Create your AI assistant at fenrik.chat. https://fenrik.chat
- hashtags: #LeadGeneration #CustomerExperience #SMB

##### facebook

- title: The Blank Field
- caption: Here's something worth checking: open your analytics and look for the row that isn't there. 📊

Sessions, bounce rate, time on page — all tracked. But visitors who left with an unanswered question? That row doesn't exist. Not because nothing happened, but because your website had no way to capture it.

Fenrik.chat gives your website a voice around the clock — so those conversations start leaving a record. No extra staff, no complex setup.
- body: You track everything. Except the thing that's costing you the most. Every number has a row. But there's one row your analytics will never fill in on its own — visitors who left with a question you never knew they had. Not a bad number. An absent one. You can't improve what you can't detect. Fenrik.chat gives your website a voice after hours — and starts filling in the blank.
- cta: Create your AI assistant at fenrik.chat. https://fenrik.chat
- hashtags: #SmallBusiness #WebsiteTips #AIAssistant

##### x

- title: One row your analytics will never fill in on its own
- caption: The metric your dashboard is missing: visitors who needed an answer and didn't get one. Fenrik.chat starts filling that in. fenrik.chat
- body: You track everything. Except the thing that's costing you the most. Every number has a row. But there's one row your analytics will never fill in on its own — visitors who left with a question you never knew they had. Not a bad number. An absent one. You can't improve what you can't detect. Fenrik.chat gives your website a voice after hours — and starts filling in the blank.
- cta: fenrik.chat
- hashtags: #SmallBusiness #LeadGen

#### Cena a čas

- AI text: $0.4552
- media est: $0.2857 (images=4)
- steps 14; tokens 41486/22052
- AI 7.44 min; video job 4.87 min
- by_step: `{"Creative Direction Generation":{"count":1,"cost":0.041217,"ms":48223,"retries":0},"Creative Direction Evaluation":{"count":1,"cost":0.041277,"ms":49447,"retries":0},"Creative Ideation":{"count":1,"cost":0.21315,"ms":253951,"retries":0},"Creative Evaluation":{"count":1,"cost":0.029145,"ms":26581,"retries":0},"Creative Engine":{"count":1,"cost":0,"ms":0,"retries":0},"Candidate Judge":{"count":1,"cost":0,"ms":0,"retries":0},"Narrative Beats":{"count":1,"cost":0,"ms":5,"retries":0},"Presentation Generation":{"count":1,"cost":0.130449,"ms":63952,"retries":0},"Hook Enforcement":{"count":1,"cost":0,"ms":0,"retries":0},"Concept Fidelity":{"count":1,"cost":0,"ms":5,"retries":0},"Story Integrity":{"count":1,"cost":0,"ms":3,"retries":0},"Product Demonstration Integrity":{"count":1,"cost":0,"ms":1,"retries":0},"Platform Outputs":{"count":1,"cost":0,"ms":0,"retries":0},"Persist Package":{"count":1,"cost":0,"ms":4281,"retries":0}}`

### Package index 12 — failed

#### Identita

- package_index: 12
- production_run_item_id: `bd6fdb2d-68d4-4335-9bca-8699c20d5cde`
- strategy_item_id: `df821a60-f348-426a-ba94-c439ea032b64`
- content_package_id: null
- content_item IDs: —
- video_job_id: —
- téma: You can see exactly what your website would say to a visitor — before you commit to anything
- funnel: conversion
- title: —

#### Fail

```json
{
  "error": "generation_failed",
  "message": "ideation_failed: missing concepts for selected direction_id d7",
  "validation_errors": [
    {
      "path": "creative_engine_v3",
      "message": "ideation_failed: missing concepts for selected direction_id d7"
    }
  ],
  "attempts": 3
}
```

- **Co vzniklo:** strategy item + AI pokus(y). Package artifacts nezapsány.
- **Zahozeno:** directions/concepts/storyboard — **Nelze obsahově porovnat, protože failed intermediate output se nepersistuje.**
- **Attempts:** 3
- **Odhad AI waste:** ~$1.3865
- **Telemetry/raw:** není v DB; Vercel logy nedostupné.

### Package index 13 — failed

#### Identita

- package_index: 13
- production_run_item_id: `d54c24e7-4084-48af-8d87-644d80da343e`
- strategy_item_id: `38293a06-9bf6-4bd5-8930-a4e261689230`
- content_package_id: null
- content_item IDs: —
- video_job_id: —
- téma: The website visitor your business will lose tonight — and the one thing that would have kept them
- funnel: conversion
- title: —

#### Fail

```json
{
  "error": "generation_failed",
  "message": "opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame",
  "validation_errors": [
    {
      "path": "concept_fidelity",
      "message": "opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame"
    },
    {
      "path": "concept_fidelity",
      "message": "storyboard_collapsed_to_generic_office"
    },
    {
      "path": "concept_fidelity",
      "message": "opening_event_missing_from_scene1"
    },
    {
      "path": "concept_fidelity",
      "message": "stop_scroll_idea_not_preserved"
    }
  ],
  "attempts": 1
}
```

- **Co vzniklo:** strategy item + AI pokus(y). Package artifacts nezapsány.
- **Zahozeno:** directions/concepts/storyboard — **Nelze obsahově porovnat, protože failed intermediate output se nepersistuje.**
- **Attempts:** 1
- **Odhad AI waste:** ~$0.4622
- **Telemetry/raw:** není v DB; Vercel logy nedostupné.

## 6. Detail referenčního runu

Plné texty: `data/ref/packages-full-text.json`. Stills: `exports/run-comparison-c8dd3caf/stills/ref/` (63).

- Žádná creative-engine@3 / AI telemetry.
- AI cost: Nelze určit z dostupných dat.
- TTS voice: Nelze určit z dostupných dat.
- Vizuály: bright generic office / lifestyle stock + flat illustration; slabší continuity.

### Package index 0 — completed

- title: The Silent Cost of a Website That Can't Talk Back
- funnel: awareness
- strategy topic: The silent cost of a website that can't talk back
- hook: Your website is open right now — and it has absolutely nothing to say.
- concept: A fast vertical short built on the 'overlooked detail' angle: most business owners assume their website is actively helping visitors — the twist is that a static site is just a silent digital brochure. Open on a striking visual of a business website glowing on a screen at night while a visitor's cursor hovers and then vanishes. Cut to the uncomfortable implication — qualified people are leaving without a trace. Land the payoff: one small embed script is the fix. Close on the CTA beat. Tone is witty and warm, not alarming.
- CTA: {"text":"Try the chatbot preview — no sign-up needed at fenrik.chat","type":"sign_up"}
- content_package_id: `0b3da777-1fa6-40a6-a813-ace6d3bba0d5`
- video_job_id: `e7faccb3-5c50-4770-aef0-1815bd2b7c34`

Voiceover:

```
Here's the mistake you're probably making: you think your website is working for you 24/7. It's not. It's just sitting there, looking pretty, while real visitors with real questions quietly leave for someone who actually answered them. Your site is open every hour of every day — and it's completely silent. One embed script changes that. Try the preview at fenrik.chat.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e7faccb3-5c50-4770-aef0-1815bd2b7c34/scene-scene-1.png` — Close-up of a modern laptop screen glowing softly in a bright, clean home office during daytime — a business website is open on the screen, a mouse cursor hover
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e7faccb3-5c50-4770-aef0-1815bd2b7c34/scene-scene-2.png` — A person in casual clothing sitting at a bright kitchen table, reaching forward to close a laptop lid with a neutral, slightly disappointed expression — the ges
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e7faccb3-5c50-4770-aef0-1815bd2b7c34/scene-scene-3.png` — A business owner sitting at a clean modern desk in a sunlit office, looking at an open laptop with a faint frown — analytics data visible only as a vague glow o
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e7faccb3-5c50-4770-aef0-1815bd2b7c34/scene-scene-4.png` — A bright, clean close-up of a laptop screen showing a friendly chat bubble appearing on a website — a visitor's message and an instant reply visible as speech b
- Scene 5 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e7faccb3-5c50-4770-aef0-1815bd2b7c34/scene-scene-5.png` — A confident professional — gender-neutral, casual-smart attire — smiling slightly while glancing at a phone, a laptop open beside them on a bright modern desk. 

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Silent Cost of a Website That Can't Talk Back | Here's the mistake you're probably making: you think your website is working for you 24/7. It's not. It's just sitting there, looking pretty, while real visitors with real questions quietly leave for someone who actually answered them. Your
**instagram:** title=The Silent Cost of a Website That Can't Talk Back | Here's the mistake you're probably making: you think your website is working for you 24/7. It's not. It's just sitting there, looking pretty, while real visitors with real questions quietly leave for someone who actually answered them. Your
**youtube:** title=The Silent Cost of a Website That Can't Talk Back | Here's the mistake you're probably making: you think your website is working for you 24/7. It's not. It's just sitting there, looking pretty, while real visitors with real questions quietly leave for someone who actually answered them. Your
**linkedin:** title=The detail most business owners miss about their own website | Here's the mistake you're probably making: you think your website is working for you 24/7. It's not. It's just sitting there, looking pretty, while real visitors with real questions quietly leave for someone who actually answered them. Your
**x:** title=Your site is open 24/7. It just has nothing to say. | Here's the mistake you're probably making: you think your website is working for you 24/7. It's not. It's just sitting there, looking pretty, while real visitors with real questions quietly leave for someone who actually answered them. Your

Cost: AI=Nelze určit z dostupných dat; media_est=$0.3556; images=5

### Package index 1 — completed

- title: A Contact Form Is Not the Same as Being Available
- funnel: problem_aware
- strategy topic: What actually happens between midnight and 8 AM on your website
- hook: A contact form sitting there vs. an answer arriving in seconds — one of these keeps the lead, and it's not the form.
- concept: A fast vertical short built on sharp contrast. Opens on a split visual: a static contact form on one side, a chatbot reply on the other. The narration names the mistake, shows the consequence — a visitor doing the mental math and leaving — then pivots to the fix. Pacing is quick and conspiratorial, like an insider letting you in on something obvious everyone else is still missing. No product UI insert; all AI-generated visuals carry the story.
- CTA: {"text":"Give your website a real voice — try Fenrik.chat today","type":"sign_up"}
- content_package_id: `84c62b5f-9429-4d14-911f-3886743e25c2`
- video_job_id: `56da4ba6-9f77-4bfa-8f4a-551d1a915db7`

Voiceover:

```
Here's the mistake: thinking a contact form means you're available. It doesn't. A visitor with an urgent question hits that form, does the math — hours until a reply — and clicks over to whoever answered them instantly. The form didn't lose the lead. The wait did. Fix it: give your website a voice that actually responds. That's what a chatbot does. Try it at fenrik.chat.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/56da4ba6-9f77-4bfa-8f4a-551d1a915db7/scene-scene-1.png` — Split-screen composition, bright and clean: on the left, a person sitting at a modern desk staring at an empty contact form on a laptop screen, expression neutr
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/56da4ba6-9f77-4bfa-8f4a-551d1a915db7/scene-scene-2.png` — Close-up of a person's hands hovering over a laptop keyboard at a desk in the evening, a soft warm lamp in the background. The person's posture suggests hesitat
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/56da4ba6-9f77-4bfa-8f4a-551d1a915db7/scene-scene-3.png` — A person at a bright modern desk closing a laptop with a calm but decisive expression, turning slightly away from the screen. Clean, well-lit contemporary works
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/56da4ba6-9f77-4bfa-8f4a-551d1a915db7/scene-scene-4.png` — A clean, bright monitor on a modern desk showing a website with a small glowing chat bubble appearing naturally in the lower corner of the screen — the bubble i

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=A Contact Form Is Not the Same as Being Available | Here's the mistake: thinking a contact form means you're available. It doesn't. A visitor with an urgent question hits that form, does the math — hours until a reply — and clicks over to whoever answered them instantly. The form didn't lose
**instagram:** title=A Contact Form Is Not the Same as Being Available | Here's the mistake: thinking a contact form means you're available. It doesn't. A visitor with an urgent question hits that form, does the math — hours until a reply — and clicks over to whoever answered them instantly. The form didn't lose
**youtube:** title=A Contact Form Is Not the Same as Being Available | Here's the mistake: thinking a contact form means you're available. It doesn't. A visitor with an urgent question hits that form, does the math — hours until a reply — and clicks over to whoever answered them instantly. The form didn't lose
**linkedin:** title=A Contact Form Is Not the Same as Being Available | Here's the mistake: thinking a contact form means you're available. It doesn't. A visitor with an urgent question hits that form, does the math — hours until a reply — and clicks over to whoever answered them instantly. The form didn't lose
**x:** title=The gap between 'reachable' and 'available' | Here's the mistake: thinking a contact form means you're available. It doesn't. A visitor with an urgent question hits that form, does the math — hours until a reply — and clicks over to whoever answered them instantly. The form didn't lose

Cost: AI=Nelze určit z dostupných dat; media_est=$0.2856; images=4

### Package index 2 — completed

- title: The Pitch That Almost Went Sideways
- funnel: solution_aware
- strategy topic: The accountant who came back from vacation to nothing
- hook: You're mid-pitch to your biggest prospect — and someone just abandoned your website because nobody answered them.
- concept: A high-pressure, split-screen moment: a business owner confidently presenting in a meeting on one side, while their website silently loses a visitor on the other. The unexpected turn — the fix isn't a developer, a project, or a team. It's one script, pasted once. Humor comes from the absurd contrast between the polished pitch and the completely avoidable silent fail happening simultaneously. Light, self-aware, punchy.
- CTA: {"text":"See your site answer live — no sign-up needed at fenrik.chat","type":"sign_up"}
- content_package_id: `0240e201-7d3e-4c31-9016-dfe881589dde`
- video_job_id: `0043b8bc-ca36-4d81-b2f1-89fd3d3a63c8`

Voiceover:

```
You're in a client meeting, nailing it. Meanwhile, back on your website — a visitor is asking about your pricing. Waiting. Waiting. Gone. No staff to cover it. No bot to catch it. Just a very quiet contact form doing absolutely nothing. One embed script. Your site answers questions while you're busy being a professional. That's it. That's the whole setup.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0043b8bc-ca36-4d81-b2f1-89fd3d3a63c8/scene-scene-1.png` — Bright, modern conference room, natural daylight streaming through large windows. A confident business professional stands at the front of a clean meeting table
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0043b8bc-ca36-4d81-b2f1-89fd3d3a63c8/scene-scene-2.png` — Close-up of a sleek open laptop on a minimal white desk. The screen glows softly but the chat area is visibly empty — a cursor sits still in a message field wit
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0043b8bc-ca36-4d81-b2f1-89fd3d3a63c8/scene-scene-3.png` — A person's hand moves away from a keyboard and reaches toward a mouse, the body language suggesting they are about to close the laptop or navigate away. The moo
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0043b8bc-ca36-4d81-b2f1-89fd3d3a63c8/scene-scene-4.png` — Extreme close-up of fingers typing a single short line into a simple code editor on a bright laptop screen — the content is visually abstract, not readable text
- Scene 5 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/0043b8bc-ca36-4d81-b2f1-89fd3d3a63c8/scene-scene-5.png` — The same sleek laptop from before, now with a friendly glowing chat bubble visible in the lower corner of the screen — a conversation in progress, warm and resp

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Pitch That Almost Went Sideways | You're in a client meeting, nailing it. Meanwhile, back on your website — a visitor is asking about your pricing. Waiting. Waiting. Gone. No staff to cover it. No bot to catch it. Just a very quiet contact form doing absolutely nothing. One
**instagram:** title=The Pitch That Almost Went Sideways | You're in a client meeting, nailing it. Meanwhile, back on your website — a visitor is asking about your pricing. Waiting. Waiting. Gone. No staff to cover it. No bot to catch it. Just a very quiet contact form doing absolutely nothing. One
**youtube:** title=The Pitch That Almost Went Sideways | You're in a client meeting, nailing it. Meanwhile, back on your website — a visitor is asking about your pricing. Waiting. Waiting. Gone. No staff to cover it. No bot to catch it. Just a very quiet contact form doing absolutely nothing. One
**linkedin:** title=The Pitch That Almost Went Sideways | You're in a client meeting, nailing it. Meanwhile, back on your website — a visitor is asking about your pricing. Waiting. Waiting. Gone. No staff to cover it. No bot to catch it. Just a very quiet contact form doing absolutely nothing. One
**x:** title=You can't staff your website 24/7. You don't have to. | You're in a client meeting, nailing it. Meanwhile, back on your website — a visitor is asking about your pricing. Waiting. Waiting. Gone. No staff to cover it. No bot to catch it. Just a very quiet contact form doing absolutely nothing. One

Cost: AI=Nelze určit z dostupných dat; media_est=$0.3554; images=5

### Package index 3 — completed

- title: The Six-Month Project That Took Six Minutes
- funnel: conversion
- strategy topic: Why your contact form is not the same as being available
- hook: A custom chatbot takes months to build and costs thousands. It does not — and believing that is why your website is still silent tonight.
- concept: A surprising before-vs-after contrast built around the myth that chatbot deployment is a long, expensive technical project. The video opens inside the myth (big boardroom planning session, stacks of paperwork, a developer's screen full of code) — then cuts to the painful reality of a visitor leaving a silent website at night — then delivers the twist: the whole thing can be live in minutes, not months. The visual arc moves from heavy and complex to light and immediate, closing on the relief of a lead already captured.
- CTA: {"text":"Get your chatbot live before tonight — start at fenrik.chat","type":"sign_up"}
- content_package_id: `15cd6c27-7296-4755-9886-c6ff75745ddd`
- video_job_id: `dd86f603-54c6-45ab-a115-f39f38366c0e`

Voiceover:

```
Everyone says chatbots are a big project. Months of dev work, integrations, budget approvals. So businesses wait. Meanwhile, a prospect lands on your site at 9 PM with a real question — and leaves for a competitor who actually answers. Here's what nobody tells you: the version that captures that lead? It reads your website, builds itself, and goes live in about a minute. Tonight's leads don't have to be tomorrow's regret.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/dd86f603-54c6-45ab-a115-f39f38366c0e/scene-scene-1.png` — A bright modern conference room in daylight — a business owner sitting at a large table surrounded by printed project timelines, colorful sticky notes, and a wh
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/dd86f603-54c6-45ab-a115-f39f38366c0e/scene-scene-2.png` — A quiet home office at night — a professional website glowing on a monitor, clean and polished, but with no chat widget visible anywhere on the screen. The room
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/dd86f603-54c6-45ab-a115-f39f38366c0e/scene-scene-3.png` — A close-up of two hands at a bright, minimal desk in daylight — one hand resting near a keyboard, a browser window open in front of them, a URL being navigated 
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/dd86f603-54c6-45ab-a115-f39f38366c0e/scene-scene-4.png` — A business owner sitting at a kitchen table in the morning, holding a coffee mug with both hands, glancing down at their phone with a calm, relieved expression.

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Six-Month Project That Took Six Minutes | Everyone says chatbots are a big project. Months of dev work, integrations, budget approvals. So businesses wait. Meanwhile, a prospect lands on your site at 9 PM with a real question — and leaves for a competitor who actually answers. Here
**instagram:** title=The Six-Month Project That Took Six Minutes | Everyone says chatbots are a big project. Months of dev work, integrations, budget approvals. So businesses wait. Meanwhile, a prospect lands on your site at 9 PM with a real question — and leaves for a competitor who actually answers. Here
**youtube:** title=The Six-Month Project That Took Six Minutes | Everyone says chatbots are a big project. Months of dev work, integrations, budget approvals. So businesses wait. Meanwhile, a prospect lands on your site at 9 PM with a real question — and leaves for a competitor who actually answers. Here
**linkedin:** title=The Six-Month Project That Took Six Minutes | Everyone says chatbots are a big project. Months of dev work, integrations, budget approvals. So businesses wait. Meanwhile, a prospect lands on your site at 9 PM with a real question — and leaves for a competitor who actually answers. Here
**x:** title=The integration complexity you're dreading doesn't exist anymore | Everyone says chatbots are a big project. Months of dev work, integrations, budget approvals. So businesses wait. Meanwhile, a prospect lands on your site at 9 PM with a real question — and leaves for a competitor who actually answers. Here

Cost: AI=Nelze určit z dostupných dat; media_est=$0.2864; images=4

### Package index 4 — completed

- title: The Law Firm That Let Its Reputation Answer for It — At 11 PM
- funnel: solution_aware
- strategy topic: The HVAC company that was everywhere except online when it mattered
- hook: A law firm can be set up in under a minute to answer client questions — and most still aren't.
- concept: A fast-paced vertical short that dramatizes the social-judgment and reputation risk of a silent website. The visual arc moves from a polished, prestigious law firm website glowing on a phone screen at night, to a competitor's chatbot answering instantly, to the punchline: the first firm lost without ever knowing they were in a race. Tone is dry, self-aware humor — the kind that makes a professional wince and laugh at the same time. No dark thriller mood; keep it clean and bright even in the night scenes, using warm ambient light.
- CTA: {"text":"Set up your chatbot in under a minute — try Fenrik.chat now","type":"sign_up"}
- content_package_id: `fab13bf3-ca65-4887-9fc6-978066a322de`
- video_job_id: `a14c81f3-ed51-4a40-b581-e790dc6c6adf`

Voiceover:

```
A potential client landed on a law firm's website at 11 PM with an urgent legal question. The firm had a great reputation. Impressive credentials. A beautiful site. And absolutely nothing to say back. The client Googled the next firm. That one answered instantly. Here's the uncomfortable part: the first firm never even knew they competed. Fenrik.chat reads your site and answers for you — automatically. Set up in under a minute.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a14c81f3-ed51-4a40-b581-e790dc6c6adf/scene-scene-1.png` — Close-up of a modern smartphone held in one hand, screen glowing with a clean, prestigious law firm website — warm ambient indoor light, late evening, soft shad
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a14c81f3-ed51-4a40-b581-e790dc6c6adf/scene-scene-2.png` — The same smartphone screen now showing a blinking text cursor inside an empty chat or contact field — the visitor is waiting, nothing is happening; the backgrou
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a14c81f3-ed51-4a40-b581-e790dc6c6adf/scene-scene-3.png` — A side-by-side visual concept: two smartphones held next to each other — the left one showing a static, silent website; the right one showing a friendly chat bu
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/a14c81f3-ed51-4a40-b581-e790dc6c6adf/scene-scene-4.png` — A professional in business attire sitting at a bright, modern desk the next morning, coffee in hand, looking at a laptop screen with a calm but slightly surpris

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Law Firm That Let Its Reputation Answer for It — At 11 PM | A potential client landed on a law firm's website at 11 PM with an urgent legal question. The firm had a great reputation. Impressive credentials. A beautiful site. And absolutely nothing to say back. The client Googled the next firm. That 
**instagram:** title=The Law Firm That Let Its Reputation Answer for It — At 11 PM | A potential client landed on a law firm's website at 11 PM with an urgent legal question. The firm had a great reputation. Impressive credentials. A beautiful site. And absolutely nothing to say back. The client Googled the next firm. That 
**youtube:** title=The Law Firm That Let Its Reputation Answer for It — At 11 PM | A potential client landed on a law firm's website at 11 PM with an urgent legal question. The firm had a great reputation. Impressive credentials. A beautiful site. And absolutely nothing to say back. The client Googled the next firm. That 
**linkedin:** title=The Reputation Risk No Law Firm Talks About: A Silent Website After Hours | A potential client landed on a law firm's website at 11 PM with an urgent legal question. The firm had a great reputation. Impressive credentials. A beautiful site. And absolutely nothing to say back. The client Googled the next firm. That 
**x:** title=The Race Your Firm Is Losing While It Sleeps | A potential client landed on a law firm's website at 11 PM with an urgent legal question. The firm had a great reputation. Impressive credentials. A beautiful site. And absolutely nothing to say back. The client Googled the next firm. That 

Cost: AI=Nelze určit z dostupných dat; media_est=$0.2865; images=4

### Package index 5 — completed

- title: Your Website Already Knows the Answers — You Just Never Unlocked Them
- funnel: solution_aware
- strategy topic: What a prospect decides in 30 seconds when your website can't answer them
- hook: You spent weeks writing every word on your website — then built a chatbot from scratch as if none of it existed.
- concept: A calm, bright visual journey that opens on the overlooked detail: a beautifully written website sitting completely silent at night. The twist lands mid-video — the content was always there, it just had no voice. The payoff shows the same website now answering questions automatically, using nothing but what was already written. The tone is a steady, reassuring advisor — no drama, just a quiet revelation.
- CTA: {"text":"See your website answer questions live — try the preview at fenrik.chat, no account needed.","type":"sign_up"}
- content_package_id: `7128fb41-2236-48ca-a4c8-942c0f2d9e7c`
- video_job_id: `9146e169-249c-4c98-b4e9-472ce611ffc0`

Voiceover:

```
Here's the part most people miss: everything a visitor would ever ask you — your services, your pricing, your process — it's already on your website. You wrote it. But when someone visits at midnight and types a question, that content just sits there, silent. A chatbot doesn't need to be built from zero. It reads what's already there and answers for you. Your website was always the starting point.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/9146e169-249c-4c98-b4e9-472ce611ffc0/scene-scene-1.png` — Close-up of a modern laptop on a clean bright white desk, screen glowing with a polished professional website — text-heavy service pages clearly visible, bathed
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/9146e169-249c-4c98-b4e9-472ce611ffc0/scene-scene-2.png` — Wide shot of a tidy, well-lit office at night — desk lamp on, laptop open showing a website, an empty chair pulled back slightly; a faint animated cursor blinks
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/9146e169-249c-4c98-b4e9-472ce611ffc0/scene-scene-3.png` — Overhead flat-lay of a bright modern workspace: open laptop, a notepad with handwritten service descriptions, a coffee cup — all the raw material of a business 
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/9146e169-249c-4c98-b4e9-472ce611ffc0/scene-scene-4.png` — A clean, minimal close-up of a laptop screen inside a crisp white laptop mockup, placed centered on a bright desk — the screen shows a chatbot interface activel
- Scene 5 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/source/cd775ffc-9c6d-4d66-b879-8b175c8b1907/component-capture.png` — Frequently Asked Questions

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=Your Website Already Knows the Answers — You Just Never Unlocked Them | Here's the part most people miss: everything a visitor would ever ask you — your services, your pricing, your process — it's already on your website. You wrote it. But when someone visits at midnight and types a question, that content just 
**instagram:** title=Your Website Already Knows the Answers — You Just Never Unlocked Them | Here's the part most people miss: everything a visitor would ever ask you — your services, your pricing, your process — it's already on your website. You wrote it. But when someone visits at midnight and types a question, that content just 
**youtube:** title=Your Website Already Knows the Answers — You Just Never Unlocked Them | Here's the part most people miss: everything a visitor would ever ask you — your services, your pricing, your process — it's already on your website. You wrote it. But when someone visits at midnight and types a question, that content just 
**linkedin:** title=Your Website Already Has the Knowledge Base — You Just Haven't Activated It | Here's the part most people miss: everything a visitor would ever ask you — your services, your pricing, your process — it's already on your website. You wrote it. But when someone visits at midnight and types a question, that content just 
**x:** title=The starting point was always your website | Here's the part most people miss: everything a visitor would ever ask you — your services, your pricing, your process — it's already on your website. You wrote it. But when someone visits at midnight and types a question, that content just 

Cost: AI=Nelze určit z dostupných dat; media_est=$0.2860; images=4

### Package index 6 — completed

- title: The Chatbot Project That Never Launches
- funnel: problem_aware
- strategy topic: The real reason traditional chatbot projects never launch
- hook: Building a chatbot takes a weekend. Everyone knows that. Except it doesn't — and that belief is quietly draining your business every single quarter.
- concept: A fast-paced vertical short built on the contrarian myth-bust structure. Opens with a confident on-screen presenter or bold text beat stating the myth — 'building a chatbot is a quick project.' Immediately cuts to a visual of a calendar flipping quarters, a desk buried in sticky notes and quotes, the project still not done. The twist: every quarter that passes is a visitor walking away unanswered. Closes on a clean, bright moment — a single click, a chatbot live on a website, a lead captured. Tone is blunt, impatient with the problem, energetic. No dark mood — clean, modern, daylight palette throughout.
- CTA: {"text":"Get your chatbot live today — no backlog, no developer, no delay. Try it at fenrik.chat.","type":"sign_up"}
- content_package_id: `e247003a-38da-4f5e-a63f-dd423b347a95`
- video_job_id: `8a64293f-86dd-41b7-be9b-a2e5499d24b9`

Voiceover:

```
Building a chatbot is a quick project. That's the myth. The reality: you get quotes, discover the complexity, push it to next quarter, repeat. Meanwhile, every visitor who lands on your site at 11 PM and gets no answer — just leaves. The delay isn't just a timeline problem. It's a lead problem. Every month the project sits in a backlog is a month of lost conversations. There's a faster way. fenrik.chat — your chatbot, live today.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/8a64293f-86dd-41b7-be9b-a2e5499d24b9/scene-scene-1.png` — A confident professional sitting at a bright, modern desk, leaning back with a relaxed expression and arms crossed, as if certain a task will be simple and fast
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/8a64293f-86dd-41b7-be9b-a2e5499d24b9/scene-scene-2.png` — A wide shot of a cluttered office desk covered in printed documents, sticky notes, and scattered papers — multiple overlapping sheets suggesting rounds of revis
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/8a64293f-86dd-41b7-be9b-a2e5499d24b9/scene-scene-3.png` — A clean, modern website displayed on a laptop screen in a bright home office at night — the screen glows softly, a lone cursor hovering over the page, and a blu
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/8a64293f-86dd-41b7-be9b-a2e5499d24b9/scene-scene-4.png` — A close-up of a laptop screen showing a friendly chat bubble appearing in the corner of a bright, modern website — a small animated pulse indicating a live resp

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Chatbot Project That Never Launches | Building a chatbot is a quick project. That's the myth. The reality: you get quotes, discover the complexity, push it to next quarter, repeat. Meanwhile, every visitor who lands on your site at 11 PM and gets no answer — just leaves. The de
**instagram:** title=The Chatbot Project That Never Launches | Building a chatbot is a quick project. That's the myth. The reality: you get quotes, discover the complexity, push it to next quarter, repeat. Meanwhile, every visitor who lands on your site at 11 PM and gets no answer — just leaves. The de
**youtube:** title=The Chatbot Project That Never Launches | Building a chatbot is a quick project. That's the myth. The reality: you get quotes, discover the complexity, push it to next quarter, repeat. Meanwhile, every visitor who lands on your site at 11 PM and gets no answer — just leaves. The de
**linkedin:** title=Why Most Businesses Are Stuck in a Chatbot Loop — and Losing Leads Every Quarter | Building a chatbot is a quick project. That's the myth. The reality: you get quotes, discover the complexity, push it to next quarter, repeat. Meanwhile, every visitor who lands on your site at 11 PM and gets no answer — just leaves. The de
**x:** title=Three quarters later, still no chatbot | Building a chatbot is a quick project. That's the myth. The reality: you get quotes, discover the complexity, push it to next quarter, repeat. Meanwhile, every visitor who lands on your site at 11 PM and gets no answer — just leaves. The de

Cost: AI=Nelze určit z dostupných dat; media_est=$0.2865; images=4

### Package index 7 — completed

- title: The Before-and-After Nobody Talks About: What Happens When Your Site Finally Answers Back
- funnel: problem_aware
- strategy topic: Small businesses can't afford a 24/7 support person — so what fills the gap?
- hook: Most businesses think a good website is enough. It isn't — and the gap between 'enough' and 'answered' is where every lead quietly disappears.
- concept: A fast-paced vertical short built on a before-vs-after contrast. The video opens on the 'before' — a polished, professional website that looks impressive but sits completely silent when a visitor has a real question. The twist lands midway: the visitor doesn't wait — they leave. The 'after' flips the frame: a site that responds instantly captures that same moment. The payoff is the contrast itself — not the tech, but the outcome. Ends with a light product anchor showing the chatbot live inside a laptop screen.
- CTA: {"text":"See your website answer live — sign up at fenrik.chat","type":"sign_up"}
- content_package_id: `6b1f9a1d-a0ef-4273-bd12-b170d73b1e7c`
- video_job_id: `374a51a8-8d3e-4ced-b3d3-ed6675a954f7`

Voiceover:

```
Here's what most people get wrong: a great website doesn't keep leads. An answer does. A consultant's prospect lands on a polished site, reads every page, has one real question — and leaves because nothing talks back. Before: silence. After: the competitor who had an answer waiting gets the call. Your site looks ready. The question is — is it?
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/374a51a8-8d3e-4ced-b3d3-ed6675a954f7/scene-scene-1.png` — A bright, modern home office desk with a sleek open laptop displaying a clean professional consulting website — polished layout, clear navigation, no chat eleme
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/374a51a8-8d3e-4ced-b3d3-ed6675a954f7/scene-scene-2.png` — A close-up of a person's hand resting on a mouse, cursor hovering over a static webpage on a laptop screen; the visitor's expression is slightly uncertain, mid-
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/374a51a8-8d3e-4ced-b3d3-ed6675a954f7/scene-scene-3.png` — A split visual: on the left, a laptop screen with a static page and a cursor moving toward the browser close button; on the right, an identical laptop with a gl
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/374a51a8-8d3e-4ced-b3d3-ed6675a954f7/scene-scene-4.png` — A confident professional at a bright modern desk, smiling slightly while looking at a laptop screen showing an active chat conversation; clean open-plan office 
- Scene 5 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/source/b1b0d00c-0bfc-4095-954f-4b38a813747f/component-capture.png` — Better customer support

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Before-and-After Nobody Talks About: What Happens When Your Site Finally Answers Back | Here's what most people get wrong: a great website doesn't keep leads. An answer does. A consultant's prospect lands on a polished site, reads every page, has one real question — and leaves because nothing talks back. Before: silence. After
**instagram:** title=The Before-and-After Nobody Talks About: What Happens When Your Site Finally Answers Back | Here's what most people get wrong: a great website doesn't keep leads. An answer does. A consultant's prospect lands on a polished site, reads every page, has one real question — and leaves because nothing talks back. Before: silence. After
**youtube:** title=The Before-and-After Nobody Talks About: What Happens When Your Site Finally Answers Back | Here's what most people get wrong: a great website doesn't keep leads. An answer does. A consultant's prospect lands on a polished site, reads every page, has one real question — and leaves because nothing talks back. Before: silence. After
**linkedin:** title=The Before-and-After Nobody Talks About: What Happens When Your Site Finally Answers Back | Here's what most people get wrong: a great website doesn't keep leads. An answer does. A consultant's prospect lands on a polished site, reads every page, has one real question — and leaves because nothing talks back. Before: silence. After
**x:** title=A polished site is not the same as an available one | Here's what most people get wrong: a great website doesn't keep leads. An answer does. A consultant's prospect lands on a polished site, reads every page, has one real question — and leaves because nothing talks back. Before: silence. After

Cost: AI=Nelze určit z dostupných dat; media_est=$0.2852; images=4

### Package index 8 — completed

- title: The Mistake Small Businesses Make About Being 'Reachable'
- funnel: problem_aware
- strategy topic: What if your website already knew enough to answer visitor questions?
- hook: If a visitor lands on your website right now and has a question — what actually happens?
- concept: A fast vertical short built around the 'mistake' mode: the camera opens on a deceptively normal small business scene — a solo consultant at her desk, phone nearby, contact form visible on her laptop. The voiceover names the mistake immediately. Quick visual cuts escalate tension: an empty inbox, a blinking cursor on an unanswered chat, a visitor count ticking up with zero responses. The twist lands mid-video — the problem isn't her schedule, it's the website. The payoff is clean: a website that answers instantly, leads captured, gap closed. No product UI asset used; all AI-generated scenes carry the story.
- CTA: {"text":"See your website answer questions live — sign up at fenrik.chat","type":"sign_up"}
- content_package_id: `3b738246-ab2c-4563-a13b-1fbaf21c0a81`
- video_job_id: `18bf3126-0e72-4968-9deb-6ba3b0fd6d9a`

Voiceover:

```
Here's a mistake most small businesses don't see they're making: they assume being reachable means having a phone number and a contact form. It doesn't. A visitor who can't get an answer in thirty seconds moves on — and never comes back. The gap isn't your hours. It's your website. Fix the gap, not your schedule.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/18bf3126-0e72-4968-9deb-6ba3b0fd6d9a/scene-scene-1.png` — Bright, modern home office in natural daylight. A focused woman in her early 30s sits at a clean wooden desk, a laptop open in front of her, a smartphone placed
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/18bf3126-0e72-4968-9deb-6ba3b0fd6d9a/scene-scene-2.png` — Close-up of a laptop screen from slightly above, screen glow visible but content completely blurred and unreadable. A single cursor blinks in the center of the 
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/18bf3126-0e72-4968-9deb-6ba3b0fd6d9a/scene-scene-3.png` — Wide shot of the same bright home office, now with a subtle sense of emptiness — the chair is slightly pushed back, the laptop still open. A small notification 
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/18bf3126-0e72-4968-9deb-6ba3b0fd6d9a/scene-scene-4.png` — The same woman, same desk, same bright office — but now her posture is relaxed and slightly leaning back, a quiet half-smile on her face. The laptop screen glow

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Mistake Small Businesses Make About Being 'Reachable' | Here's a mistake most small businesses don't see they're making: they assume being reachable means having a phone number and a contact form. It doesn't. A visitor who can't get an answer in thirty seconds moves on — and never comes back. Th
**instagram:** title=The Mistake Small Businesses Make About Being 'Reachable' | Here's a mistake most small businesses don't see they're making: they assume being reachable means having a phone number and a contact form. It doesn't. A visitor who can't get an answer in thirty seconds moves on — and never comes back. Th
**youtube:** title=The Mistake Small Businesses Make About Being 'Reachable' | Here's a mistake most small businesses don't see they're making: they assume being reachable means having a phone number and a contact form. It doesn't. A visitor who can't get an answer in thirty seconds moves on — and never comes back. Th
**linkedin:** title=The Mistake Small Businesses Make About Being 'Reachable' | Here's a mistake most small businesses don't see they're making: they assume being reachable means having a phone number and a contact form. It doesn't. A visitor who can't get an answer in thirty seconds moves on — and never comes back. Th
**x:** title=The gap between being open and being available | Here's a mistake most small businesses don't see they're making: they assume being reachable means having a phone number and a contact form. It doesn't. A visitor who can't get an answer in thirty seconds moves on — and never comes back. Th

Cost: AI=Nelze určit z dostupných dat; media_est=$0.2847; images=4

### Package index 9 — completed

- title: The Worst Thing That Happens When You Never Build the Chatbot
- funnel: solution_aware
- strategy topic: One embed script — and your website answers questions while you sleep
- hook: You keep saying you'll build a chatbot — and every week you don't, a real visitor leaves your site with nothing.
- concept: A fast-cut vertical short that opens on the brutal consequence of procrastination — a stream of visitors arriving and quietly leaving an unanswered website — then pivots hard on the twist: the chatbot builds itself from your existing site in under a minute. No developer. No project. No delay. The visual arc moves from empty/passive (visitors disappearing) to active/alive (a conversation happening, a lead captured). Tone is witty and warm, not scary. The payoff lands just before the CTA.
- CTA: {"text":"Stop losing visitors — get your chatbot live today at fenrik.chat","type":"sign_up"}
- content_package_id: `0b1c398e-5b4f-4dd6-ac30-02b271cfed9e`
- video_job_id: `99ca97a3-20b2-454d-8ecd-b4ce2e5b7cdc`

Voiceover:

```
Here's the uncomfortable truth: most businesses never build a chatbot because it sounds like a project. Weeks of setup. A developer. A budget. So they skip it — and their website just keeps collecting visitors who vanish. Same traffic. Zero conversations. Here's the twist: Fenrik reads your website and builds itself. One script. Done. Your site stops losing leads tonight.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/99ca97a3-20b2-454d-8ecd-b4ce2e5b7cdc/scene-scene-1.png` — Bright, clean medium shot of a friendly small-business owner — a woman in her 30s — sitting at a modern wooden desk with a laptop open, wearing a slightly guilt
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/99ca97a3-20b2-454d-8ecd-b4ce2e5b7cdc/scene-scene-2.png` — Bright overhead flat-lay of a clean white desk surface with a simple glowing website icon at the center. Dozens of tiny soft golden orbs drift gently toward it 
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/99ca97a3-20b2-454d-8ecd-b4ce2e5b7cdc/scene-scene-3.png` — Close-up of a person's hands confidently typing a single short line into a laptop keyboard, the screen angled slightly away so no text is readable. The gesture 
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/99ca97a3-20b2-454d-8ecd-b4ce2e5b7cdc/scene-scene-4.png` — Bright split-scene still: on the left, a soft-focus laptop screen showing a blank, silent chat widget with no activity; on the right, the same laptop showing an

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Worst Thing That Happens When You Never Build the Chatbot | Here's the uncomfortable truth: most businesses never build a chatbot because it sounds like a project. Weeks of setup. A developer. A budget. So they skip it — and their website just keeps collecting visitors who vanish. Same traffic. Zero
**instagram:** title=The Worst Thing That Happens When You Never Build the Chatbot | Here's the uncomfortable truth: most businesses never build a chatbot because it sounds like a project. Weeks of setup. A developer. A budget. So they skip it — and their website just keeps collecting visitors who vanish. Same traffic. Zero
**youtube:** title=The Worst Thing That Happens When You Never Build the Chatbot | Here's the uncomfortable truth: most businesses never build a chatbot because it sounds like a project. Weeks of setup. A developer. A budget. So they skip it — and their website just keeps collecting visitors who vanish. Same traffic. Zero
**linkedin:** title=The Worst Thing That Happens When You Never Build the Chatbot | Here's the uncomfortable truth: most businesses never build a chatbot because it sounds like a project. Weeks of setup. A developer. A budget. So they skip it — and their website just keeps collecting visitors who vanish. Same traffic. Zero
**x:** title=One script vs. months of procrastination | Here's the uncomfortable truth: most businesses never build a chatbot because it sounds like a project. Weeks of setup. A developer. A budget. So they skip it — and their website just keeps collecting visitors who vanish. Same traffic. Zero

Cost: AI=Nelze určit z dostupných dat; media_est=$0.2856; images=4

### Package index 10 — completed

- title: The Habit That's Quietly Costing You Every Lead
- funnel: conversion
- strategy topic: How a law firm could have kept that 11 PM visitor from leaving empty-handed
- hook: Every morning you check your inbox — but you never check what your website said no to overnight.
- concept: A fast-paced vertical short built around a daily routine reveal. Opens on the familiar morning ritual of checking a phone inbox — then twists: the inbox shows nothing missed, but a quiet counter reveals website visitors who came and left unanswered overnight. The tension builds as the viewer realises the habit they trust (checking messages) is missing the channel that matters most (the website). The payoff is the live preview — paste a URL, watch the chatbot appear, no friction, no account. Closes on a laptop screen insert showing the product live.
- CTA: {"text":"Paste your URL and watch it work — no sign-up needed at fenrik.chat","type":"sign_up"}
- content_package_id: `574d3798-376e-4687-8a44-469b5b235d2d`
- video_job_id: `e98f10a9-8a29-43a5-b62a-663eda2e77b4`

Voiceover:

```
Every morning you check your inbox. Emails, missed calls, notifications. But nobody checks what their website silently turned away overnight. That's the mistake. Visitors arrive, ask something, get nothing — and leave. No trace. No lead. And you never even knew they were there. Here's the fix: paste your URL into Fenrik.chat and watch a live chatbot build itself from your site — no account, no setup, no guessing. See it answer before you commit to anything.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e98f10a9-8a29-43a5-b62a-663eda2e77b4/scene-scene-1.png` — Bright, clean morning scene: a young professional sits at a modern kitchen counter, holding a smartphone, scrolling through an inbox with a calm and satisfied e
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e98f10a9-8a29-43a5-b62a-663eda2e77b4/scene-scene-2.png` — Wide shot of a tidy home-office desk in daylight: a laptop sits open, a coffee cup beside it, a small potted plant in the background. The chair is empty — the o
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e98f10a9-8a29-43a5-b62a-663eda2e77b4/scene-scene-3.png` — Close-up of a person's hands typing a web address into a browser on a clean white laptop keyboard. The background is a bright, minimal desk surface. The hands l
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e98f10a9-8a29-43a5-b62a-663eda2e77b4/scene-scene-4.png` — Clean product reveal moment: a modern open laptop centered on a bright white desk, screen facing the viewer, showing a softly glowing chat interface — represent
- Scene 5 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/source/7e250d64-ddcf-4649-921f-783d294a2b5b/component-capture.png` — Create an AI assistant for your website in 1 minute.

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Habit That's Quietly Costing You Every Lead | Every morning you check your inbox. Emails, missed calls, notifications. But nobody checks what their website silently turned away overnight. That's the mistake. Visitors arrive, ask something, get nothing — and leave. No trace. No lead. An
**instagram:** title=The Habit That's Quietly Costing You Every Lead | Every morning you check your inbox. Emails, missed calls, notifications. But nobody checks what their website silently turned away overnight. That's the mistake. Visitors arrive, ask something, get nothing — and leave. No trace. No lead. An
**youtube:** title=The Habit That's Quietly Costing You Every Lead | Every morning you check your inbox. Emails, missed calls, notifications. But nobody checks what their website silently turned away overnight. That's the mistake. Visitors arrive, ask something, get nothing — and leave. No trace. No lead. An
**linkedin:** title=Your Website Was Open All Night — And It Had Nothing to Say | Every morning you check your inbox. Emails, missed calls, notifications. But nobody checks what their website silently turned away overnight. That's the mistake. Visitors arrive, ask something, get nothing — and leave. No trace. No lead. An
**x:** title=One URL Paste — See Your Chatbot Answer Live Before You Commit | Every morning you check your inbox. Emails, missed calls, notifications. But nobody checks what their website silently turned away overnight. That's the mistake. Visitors arrive, ask something, get nothing — and leave. No trace. No lead. An

Cost: AI=Nelze určit z dostupných dat; media_est=$0.2869; images=4

### Package index 11 — completed

- title: The Last-Minute Lead You Never Knew You Lost
- funnel: awareness
- strategy topic: The difference between a website that collects traffic and one that captures leads
- hook: A qualified prospect on your website at midnight — versus a contact form that just stares back at them.
- concept: A fast-paced vertical short built on a sharp contrast: a prospect arriving at a website late at night with an urgent question versus a business owner waking up, seeing traffic in analytics, and assuming everything went fine. The twist: the traffic was real, the intent was real — but the website had nothing to say. The payoff: Fenrik.chat fills that gap automatically, no build required. Visuals escalate from a quiet nighttime browsing scene to a frustrated exit, then pivot to a clean, confident resolution. One Tier 1 product asset used as a framed laptop screen insert in the final CTA beat.
- CTA: {"text":"Start capturing leads tonight — no developer needed at fenrik.chat","type":"sign_up"}
- content_package_id: `d4fa80d1-2a8e-4913-8c01-faec92bc1882`
- video_job_id: `c50b87f6-6046-4b27-b64a-8ce3e2cabcea`

Voiceover:

```
Most business owners think a website is enough. It isn't. Right now, someone is on your site at midnight with a real question — and your site is silent. No chatbot, no answer, no lead captured. They move on. You wake up, check analytics, see the traffic, and call it a good night. Fenrik.chat answers while you sleep. No build required. No developer needed.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/c50b87f6-6046-4b27-b64a-8ce3e2cabcea/scene-scene-1.png` — A person in their mid-30s sitting at a clean, modern desk at night, leaning forward intently toward an open laptop, warm ambient lamp light, bright screen glow 
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/c50b87f6-6046-4b27-b64a-8ce3e2cabcea/scene-scene-2.png` — Close-up of the same person leaning back in their chair, expression shifting to mild frustration — laptop screen reflected in their eyes showing a static, text-
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/c50b87f6-6046-4b27-b64a-8ce3e2cabcea/scene-scene-3.png` — A business owner asleep in a quiet, modern bedroom, phone face-down on the nightstand, soft natural light beginning to come through curtains suggesting early mo
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/c50b87f6-6046-4b27-b64a-8ce3e2cabcea/scene-scene-4.png` — The same business owner the next morning, sitting at a bright kitchen table, coffee in hand, smiling at an open laptop showing a colorful analytics dashboard wi
- Scene 5 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/c50b87f6-6046-4b27-b64a-8ce3e2cabcea/scene-scene-5.png` — A clean, modern laptop on a bright white desk displaying a chatbot interface actively showing a conversation — a visitor question on one side, an instant AI res
- Scene 6 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/source/7e250d64-ddcf-4649-921f-783d294a2b5b/component-capture.png` — Create an AI assistant for your website in 1 minute.

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Last-Minute Lead You Never Knew You Lost | Most business owners think a website is enough. It isn't. Right now, someone is on your site at midnight with a real question — and your site is silent. No chatbot, no answer, no lead captured. They move on. You wake up, check analytics, se
**instagram:** title=The Last-Minute Lead You Never Knew You Lost | Most business owners think a website is enough. It isn't. Right now, someone is on your site at midnight with a real question — and your site is silent. No chatbot, no answer, no lead captured. They move on. You wake up, check analytics, se
**youtube:** title=The Last-Minute Lead You Never Knew You Lost | Most business owners think a website is enough. It isn't. Right now, someone is on your site at midnight with a real question — and your site is silent. No chatbot, no answer, no lead captured. They move on. You wake up, check analytics, se
**linkedin:** title=The Last-Minute Lead You Never Knew You Lost | Most business owners think a website is enough. It isn't. Right now, someone is on your site at midnight with a real question — and your site is silent. No chatbot, no answer, no lead captured. They move on. You wake up, check analytics, se
**x:** title=The Lead That Left While You Were Asleep | Most business owners think a website is enough. It isn't. Right now, someone is on your site at midnight with a real question — and your site is silent. No chatbot, no answer, no lead captured. They move on. You wake up, check analytics, se

Cost: AI=Nelze určit z dostupných dat; media_est=$0.3554; images=5

### Package index 12 — completed

- title: The Routine That's Costing You Leads Every Single Day
- funnel: problem_aware
- strategy topic: You can see your chatbot working before you sign up for anything
- hook: Phone ringing off the hook — website dead silent. You're handling one, completely ignoring the other.
- concept: A fast-paced vertical short using the contrast archetype: a chaotic, ringing-phone service business vs. a completely silent website. The video opens on the 'mistake' — a busy team that has built its entire support routine around phone calls while the website sits ignored. The twist: all that busyness is a blind spot. The payoff: the website is the leak, and it's fixable. No product UI assets used — all AI-generated scenes.
- CTA: {"text":"Put your website to work 24/7 — try Fenrik.chat today","type":"sign_up"}
- content_package_id: `ab5a46f6-d908-404a-a75c-865da18d56a6`
- video_job_id: `e198028f-0bb1-4cea-84b9-57c895fe11b6`

Voiceover:

```
Phone's ringing, team's slammed — you feel productive. Meanwhile your website is getting visitors right now and saying absolutely nothing back. That's the mistake. You've built your whole support routine around calls and forgot the website exists after hours. Busy phones feel like winning. Silent websites are where leads go to die. Your website needs to answer too — automatically, always. Try Fenrik.chat.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e198028f-0bb1-4cea-84b9-57c895fe11b6/scene-scene-1.png` — A close-up of a ringing office desk phone with a hand reaching to answer it, warm busy office environment in the background, natural daylight through windows, s
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e198028f-0bb1-4cea-84b9-57c895fe11b6/scene-scene-2.png` — A wide shot of a service business front desk — two staff members on calls simultaneously, a whiteboard with job orders behind them, the scene feels productive a
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e198028f-0bb1-4cea-84b9-57c895fe11b6/scene-scene-3.png` — A tight over-the-shoulder shot of a person sitting at a home desk at night, their cursor hovering over a website page with no chat, no response option visible —
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/e198028f-0bb1-4cea-84b9-57c895fe11b6/scene-scene-4.png` — The same laptop screen from a slightly wider angle — now a soft glowing speech bubble icon floats above the screen as a visual metaphor for an active chat, the 

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Routine That's Costing You Leads Every Single Day | Phone's ringing, team's slammed — you feel productive. Meanwhile your website is getting visitors right now and saying absolutely nothing back. That's the mistake. You've built your whole support routine around calls and forgot the website 
**instagram:** title=The Routine That's Costing You Leads Every Single Day | Phone's ringing, team's slammed — you feel productive. Meanwhile your website is getting visitors right now and saying absolutely nothing back. That's the mistake. You've built your whole support routine around calls and forgot the website 
**youtube:** title=The Routine That's Costing You Leads Every Single Day | Phone's ringing, team's slammed — you feel productive. Meanwhile your website is getting visitors right now and saying absolutely nothing back. That's the mistake. You've built your whole support routine around calls and forgot the website 
**linkedin:** title=The support routine most service businesses never question — and what it quietly costs them | Phone's ringing, team's slammed — you feel productive. Meanwhile your website is getting visitors right now and saying absolutely nothing back. That's the mistake. You've built your whole support routine around calls and forgot the website 
**x:** title=You built a support routine around calls. Your website never made the list. | Phone's ringing, team's slammed — you feel productive. Meanwhile your website is getting visitors right now and saying absolutely nothing back. That's the mistake. You've built your whole support routine around calls and forgot the website 

Cost: AI=Nelze určit z dostupných dat; media_est=$0.2861; images=4

### Package index 13 — completed

- title: The Accountant Who Came Back to Nothing
- funnel: problem_aware
- strategy topic: Tonight, your website could already be capturing the leads it's currently losing
- hook: Your website captured zero leads while you were away — and it had every chance to.
- concept: Vertical short. Opens on a sharp visual of a professional returning to their desk after time away — bright, clean, modern office, a bag being set down, a laptop opening. The energy is hopeful. Then the twist: analytics on screen (no readable numbers, just the visual gesture of scrolling through data). The mood shifts — not panic, but quiet, dawning recognition. A third beat shows an empty inbox beside a busy-looking website session graph. The payoff: a calm but pointed close-up of a professional staring at the screen, the implication clear. Final beat is clean and bright — the problem is solvable, and the CTA lands with quiet confidence.
- CTA: {"text":"See your chatbot answer live — no registration needed at fenrik.chat","type":"sign_up"}
- content_package_id: `7331e4ed-67ff-488b-8a8e-5d5b228ef400`
- video_job_id: `cc06605a-09ce-4151-815c-f79622936f6c`

Voiceover:

```
Your website can preview a working AI chatbot before you even sign up. Zero registration. And yet — an accountant returns from two weeks off, opens analytics, sees dozens of visitors, and finds zero names. Zero contacts. Just session data. That is not a traffic problem. That is a reputation problem. Prospects who got silence went somewhere that answered. Your website should not be the reason they left.
```

Scenes:
- Scene 1 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/cc06605a-09ce-4151-815c-f79622936f6c/scene-scene-1.png` — A bright, clean modern office in natural daylight. A professional in business casual attire sets a travel bag down beside a tidy desk and opens a laptop, expres
- Scene 2 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/cc06605a-09ce-4151-815c-f79622936f6c/scene-scene-2.png` — Close-up of hands scrolling through a laptop trackpad, the screen showing abstract colorful graph shapes and bar chart silhouettes — no readable numbers or labe
- Scene 3 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/cc06605a-09ce-4151-815c-f79622936f6c/scene-scene-3.png` — Wide shot of a modern office desk. On one side, a laptop with an abstract analytics dashboard glow — no readable content. On the other side, a phone face-up sho
- Scene 4 (undefined, 4s) `aabab9ff-9db4-4012-a53c-135e3bfea6cd/video/cc06605a-09ce-4151-815c-f79622936f6c/scene-scene-4.png` — Tight close-up of a professional's face — calm, composed, but with a clear moment of quiet realization. Eyes focused slightly downward toward a screen out of fr

Visual note: Stock bright office / mixed subjects; weaker continuity than new winners.

**tiktok:** title=The Accountant Who Came Back to Nothing | Your website can preview a working AI chatbot before you even sign up. Zero registration. And yet — an accountant returns from two weeks off, opens analytics, sees dozens of visitors, and finds zero names. Zero contacts. Just session data. 
**instagram:** title=The Accountant Who Came Back to Nothing | Your website can preview a working AI chatbot before you even sign up. Zero registration. And yet — an accountant returns from two weeks off, opens analytics, sees dozens of visitors, and finds zero names. Zero contacts. Just session data. 
**youtube:** title=The Accountant Who Came Back to Nothing | Your website can preview a working AI chatbot before you even sign up. Zero registration. And yet — an accountant returns from two weeks off, opens analytics, sees dozens of visitors, and finds zero names. Zero contacts. Just session data. 
**linkedin:** title=Zero Leads From Dozens of Visitors — This Is a Reputation Problem, Not a Traffic Problem | Your website can preview a working AI chatbot before you even sign up. Zero registration. And yet — an accountant returns from two weeks off, opens analytics, sees dozens of visitors, and finds zero names. Zero contacts. Just session data. 
**x:** title=Prospects Do Not Wait — They Go to Whoever Answered First | Your website can preview a working AI chatbot before you even sign up. Zero registration. And yet — an accountant returns from two weeks off, opens analytics, sees dozens of visitors, and finds zero names. Zero contacts. Just session data. 

Cost: AI=Nelze určit z dostupných dat; media_est=$0.2861; images=4

## 7. Párové srovnání packages

| Nový package | Starý package | Podobnost | Důvod |
|---|---|---:|---|
| 0 Window Is Open | 0 Silent Cost | 0.85 | Awareness: presence without answers |
| 1 Campaign forgot landing | 8 Reachable mistake | 0.75 | Traffic vs availability gap |
| 2 Five-star not for you | 13 Accountant came back to nothing | 0.55 | Lost opportunity consequence |
| 6 Rehearsed except questions | 2 Pitch went sideways | 0.70 | Live Q&A failure |
| 7 One tab closed / gone | 1 Contact form ≠ available | 0.65 | Ephemeral intent vs slow contact |
| 8 Pipeline forgot the end | 7 Before-and-after answers | 0.60 | Funnel without endpoint |
| 10 Chatbot integration | 6 Chatbot never launches | 0.80 | Setup friction myth |
| 11 The Blank Field | 3 Six-month / six minutes | 0.70 | Complexity vs simplicity |
| 3–5,9,12,13 failed | — | — | bez přímého páru |

## 8. Kvalitativní scoring

Škála 1–5. `generic_office` / `repetition` / `txt_generic`: vyšší = horší. Aggregate invertuje tyto dimenze.

### Nový běh

| pkg | hook | story | visual | cont. | img↔vo | generic↓ | usable | note |
|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 0 | 5 | 4 | 5 | 4 | 5 | 2 | 4 | Cinematic reception-window metaphor; strong continuity; hand/glass mot |
| 1 | 4 | 4 | 4 | 3 | 4 | 2 | 4 | Campaign timeline illustration is specific; clean editorial look. |
| 2 | 5 | 4 | 3 | 3 | 4 | 2 | 3 | Strong hook; visuals lean symbolic; costliest completed package (repai |
| 6 | 4 | 4 | 4 | 3 | 4 | 3 | 3 | 2 ideation attempts + 10 fingerprint rejects. |
| 7 | 5 | 4 | 3 | 3 | 3 | 3 | 3 | Strong hook; opening still feels agency-generic vs concept. |
| 8 | 4 | 4 | 4 | 3 | 4 | 3 | 4 | Pipeline-without-endpoint metaphor lands. |
| 10 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | More product-demo oriented; less stop-scroll. |
| 11 | 4 | 4 | 4 | 3 | 4 | 3 | 4 | Blank field concept concrete and convertible. |

### Referenční běh

| pkg | hook | visual | cont. | generic↓ | usable |
|---:|---:|---:|---:|---:|---:|
| 0 | 3 | 2 | 2 | 4 | 3 |
| 1 | 3 | 2 | 2 | 3 | 3 |
| 2 | 3 | 2 | 2 | 4 | 3 |
| 3 | 3 | 2 | 2 | 4 | 3 |
| 4 | 4 | 3 | 2 | 4 | 3 |
| 5 | 3 | 2 | 2 | 4 | 3 |
| 6 | 3 | 2 | 2 | 4 | 3 |
| 7 | 3 | 2 | 2 | 4 | 3 |
| 8 | 3 | 2 | 2 | 4 | 3 |
| 9 | 3 | 2 | 2 | 4 | 3 |
| 10 | 3 | 2 | 2 | 4 | 3 |
| 11 | 3 | 2 | 2 | 4 | 3 |
| 12 | 3 | 2 | 2 | 4 | 3 |
| 13 | 4 | 3 | 2 | 3 | 3 |

**Aggregate:** new **3.83** vs ref **2.94**.

## 9. Cena a doba generování

### Nový
- total known: $6.0540
- waste est: $5.0838
- $/completed known: $0.7568
- $/requested known: $0.4324
- AI time/completed avg: 7.53 min (+ video ~5.35 min)
- AI calls/completed: 14.1

### Starý
- total AI: Nelze určit z dostupných dat
- media total: $4.2118
- media/completed: $0.3008
- wall/completed: 33.2 min

### Změny
- completion: -42.9%
- wall/delivered: 33.9 min vs 33.2 min → **2.0%**
- quality: +30.4%
- $/quality-point (known new vs media-only ref): $0.5102 — neférové (ref AI chybí)
- Poctivé total $ srovnání: Nelze určit z dostupných dat.

## 10. Zahozené náklady failed packages

| pkg | reason | attempts | est. waste | persisted |
|---:|---|---:|---:|---|
| 3 | Primary actor from selected concept missing from opening scene (expected one of: outcome, strips, identical, objects) | 1 | ~$0.4622 | none |
| 4 | all_concepts_vetoed_after_re_ideation | 4 | ~$1.8487 | none |
| 5 | storyboard_collapsed_to_generic_office | 1 | ~$0.4622 | none |
| 9 | Middle beats abandon the primary actor / product world for unrelated subjects (actor tokens: empty, measurement, system, attorney) | 1 | ~$0.4622 | none |
| 12 | ideation_failed: missing concepts for selected direction_id d7 | 3 | ~$1.3865 | none |
| 13 | opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame | 1 | ~$0.4622 | none |

**Součet odhadu waste:** ~$5.0838

## 11. Přínos komponent

| Komponenta | Cena/čas | Zachytila | Zlepšila | Zablokovala | Přínos |
|---|---|---|---|---|---|
| Product Brain | Nelze oddělit | — | — | — | nedoložený |
| Direction gen | $0.2918 | 7 dirs/pkg | metafory | — | střední |
| Memory filter | v ideation | fingerprint collisions | diverzita | re-ideation cost | střední/negativní náklad |
| Direction eval | $0.3015 | ranking | výběr | — | střední |
| Ideation | $1.6388 / 33.5m | concepts | silnější hooks | — | **vysoký** |
| Veto/re-ideation | attempts | slabé concepts | — | **pkg4 fail** | negativní |
| Critic | $0.2287 | 6 pkgs | drobné | — | nízký–střední |
| Concept fidelity | $0 check | generic office | — | **pkg5,13** | negativní jako hard fail |
| Story integrity | repair $0.1329 | actor drift | repair pkg2 | **pkg3,9** | smíšený |
| Presentation gen | $1.1036 | scény+VO | specificita | — | **vysoký** |
| Image/TTS/Render $ | worker cost=0 | — | — | — | nedoložený billing |
| PDI / Narrative Beats | ~$0 | — | — | — | nedoložený |

## 12. Kandidáti na zjednodušení

1. Hard fail `concept_fidelity` / `story_integrity` / `generic_office` → repair/advisory.
2. Terminální veto loops (pkg4) → best-effort fallback.
3. Fingerprint hard reject → soft penalty.
4. Sloučit overlapping fidelity/integrity/office gates.
5. Critic — slabý doložený vizuální přínos.
6. PDI / Narrative Beats — nedoložené odděleně.
7. Snížit max concepts/attempts u Ideation (nejdražší krok).
8. Persistovat failed intermediate JSON do telemetry.
9. Pipeline je technicky sofistikovanější a u doručených vizuálně lepší, produktově horší kvůli fail rate.

## 13. Finální verdikt

1. **Viditelně kvalitnější?** Ano u completed; ne jako celý run (6/14 nedoručeno).
2. **Dražší?** Known $6.0540; waste est $5.0838. Ref AI Nelze určit.
3. **Pomalejší?** Wall/delivered 33.9 min vs 33.2 min (2%).
4. **$/doručený:** known $0.7568; +waste est $1.3922.
5. **Kvalita vs cena?** Částečně pro ideation+presentation; ne s fail waste.
6. **Kvalita vs completion?** **Ne** — 8≠14.
7. **Prokazatelný přínos:** Ideation, Direction, Presentation; částečně Integrity repair.
8. **Předimenzované:** hard fidelity/integrity/veto, overlapping validators, critic, PDI/beats.
9. **Bez hard fails:** vyšší completion, podobné winners, méně waste; riziko občas generic office.
10. **Doporučení:** **zjednodušit** (ne full rollback) — reliability starší pipeline + creative síla nové.

---

## Appendix — paths

- `docs/audits/run-comparison-c8dd3caf.md`
- `docs/audits/run-comparison-c8dd3caf/data/`
- `exports/run-comparison-c8dd3caf/videos/{new,ref}/`
- `exports/run-comparison-c8dd3caf/stills/{new,ref}/`
- `exports/run-comparison-c8dd3caf/screenshots/{new,ref}/`
- `exports/run-comparison-c8dd3caf/contact-sheets/{new,ref}/`
- `reports/production-run-c8dd3caf-c407-418c-be49-d4cf0a3b7bf9-audit.md`
- `reports/production-run-f6c0c74d-1548-44fe-a920-b96b21d3db58-audit.md`
