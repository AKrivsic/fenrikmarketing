# Production Audit — Compare New Runs vs Prior Audited Runs

_Read-only. Generated 2026-07-14. Data: Supabase (`production_runs`, `content_packages`, `video_jobs`, `content_strategy_items`), existing reports for `7628340e` / `5e8465bc`, code paths for CTA/voice/visual profile._

**New runs**

| Run ID | Project | Packages | Video jobs | Created (UTC) |
| --- | --- | ---: | ---: | --- |
| `d893d9f7-2153-47c2-954e-1934f872c162` | 8080.ai | 1 | 1 completed | 2026-07-13 21:54 |
| `684a95ef-0bb6-4c84-88dd-9766df4a0285` | rightcard.ai | 1 | 1 completed | 2026-07-12 20:46 |

**Prior audited runs (fenrik Studio, 3 packages each)**

| Run ID | Scene types (worker input) | Visual profile | Voice on jobs |
| --- | --- | --- | --- |
| `7628340e-d785-4383-bd23-7a0e630247e7` | 13× IMAGE only | EDITORIAL (auto hash v1) | alloy |
| `5e8465bc-107c-4d0b-beb9-516ceb5b9812` | 13× IMAGE only | EDITORIAL (auto hash v1, scored) | shimmer stamped (presentation empty → legacy path in audit) |

---

## Otázka 1 — Proč je konec obou nových videí téměř identický (text + CTA + tlačítko)?

### Pozorování

Oba finální záběry jsou **typed CTA scény** (`renderer_version: cta@1`), ne AI obrázky. Stejná struktura:

1. Volitelné logo nahoře (`show_logo: true`)
2. **Headline** (tučný text vlevo)
3. **Subline** (menší text pod headline)
4. **Jedno tlačítko** (accent bar + label uprostřed)

Liší se pouze **copy** v `payload_snapshot` (headline / subline / `button_label`), barvy/tokeny z visual profilu projektu a logo asset.

| Run | scene_id | Headline | Subline | Button |
| --- | --- | --- | --- | --- |
| d893 / 8080.ai | scene-4 | Start building your product blueprint | Turn your idea into a clear spec — before you talk to a single developer. | Get started at 8080.ai |
| 684a / RightCard | scene-5 | Stop guessing at checkout. | Download RightCard — free, no bank login, no data shared. | Download the app |

### Root cause (kde je „source of truth“)

| Vrstva | Role | Verdikt |
| --- | --- | --- |
| **CTA renderer** | `lib/scene-types/renderers/ctaSceneRenderer.ts` → `composeCtaRaster.ts` (`buildCtaSvg`) | **Jediný layout** — vertikální stack logo → headline → subline → button. Žádný výběr layoutu podle funnel/creative_mode. |
| **CTA prompt (LLM)** | LLM generuje `visual_scenes[]` položku `{ type: "CTA", payload: { headline, subline, button_label, show_logo } }` | Copy se liší; **layout ne**. |
| **CTA payload** | `ctaScenePayloadSchema` — headline, subline, optional button_label, show_logo | Validovaný payload; určuje texty, ne kompozici. |
| **CTA source of truth (alignment)** | `resolveAuthoritativeCtaReference` — package `cta.text` vs project default | Používá se pro **eligibility / alignment** v analyzeru, ne pro raster layout. Finální karta bere LLM payload. |
| **Visual profile** | `ChecklistBrandTokens` z profilu (MINIMAL / NATURAL) | Mění **barvy, marginy, accent**, ne pořadí prvků. |
| **Renderer limitation** | Ano — `cta@1` = jeden SVG template | **Designové rozhodnutí**, ne bug. |
| **Zamýšlené chování** | Ano — konzistentní branded end card napříč produkty | |

### Analyzer

Oba joby: `rule: allowed`, `reason: eligible cta scene; cta renderer active`, `requested_type` / `final_type`: **CTA**, `accepted_cta_count: 1`, `cta_renderer_version: cta@1`. Žádný downgrade.

### Je to správně? Rozšířit CTA renderer?

- **Správně** vůči současné specifikaci: stejný raster, jiný text = očekávané.
- **Produktově**: pokud chcete vizuální variabilitu konců (split layout, fullscreen product still, bez tlačítka, video loop pod textem), **ano — potřeba více layoutů** v `composeCtaRaster` / verze `cta@2`, ne změna promptu samotného.

---

## Otázka 2 — Run `d893d9f7` — proč jen 2 AI obrázky, 1 asset, 1 CTA?

**Package:** `3548d3c5-997e-48b2-b563-f736a2bfb697` — *The Overlooked Reason Your Product Idea Never Ships*  
**Video job:** `16fa67fc-81d5-4f83-99c3-68c2107b97ec` (completed)

### Shrnutí

| Metrika | Hodnota |
| --- | ---: |
| Scén v plánu | **4** |
| `final_worker_scene_types` | IMAGE, IMAGE, IMAGE, **CTA** |
| OpenAI image generations | **2** (scene-1, scene-2) |
| Project asset (bez generování) | **1** (scene-3) |
| CTA raster (SVG→PNG) | **1** (scene-4) |

**Není bug.** Počet „AI obrázků“ = počet scén s `media.source: "ai"` a renderer `image@1`. Asset scéna jde přes **IMAGE renderer** s `source: asset` (kompozice / insert). CTA scéna **nepoužívá** image provider — `image_prompt: presentation:cta:scene-4`.

### Pipeline krok za krokem

1. **Strategie** — topic/angle v `content_strategy_items.brief`; funnel `awareness`; creative_mode **contrarian** (v job input).
2. **Package generation** — `visual_scenes`: 2× `{source:ai, image_prompt}`, 1× asset, 1× `{type:CTA, payload}`; `requested_cta_count: 1`.
3. **Presentation analyzer** — 4 decisions, všechny `allowed`; scene-3 zůstává **IMAGE** (asset beat), scene-4 **CTA**.
4. **Worker scene plan** — 4 scény; semantic motion: 5 beatů (beat-5 mapuje znovu na scene-4, CLOSE/static).
5. **Render**
   - scene-1, scene-2: `image@1` → generované PNG ve `video-renders/.../scene-scene-{1,2}.png`
   - scene-3: `image@1` + `project-assets/.../Sn_mek_obrazovky_...png` (asset_id `d358f9d9-...`, `video_usage: screen_insert`)
   - scene-4: `cta@1` → `composeCtaRasterPng` → `scene-scene-4.png`

### Proč nepoužity CHECKLIST / PHONE / QUOTE / STATISTIC

| Typ | V prompt ceiling? | LLM requested | Finální |
| --- | ---: | ---: | --- |
| CHECKLIST | ano | 0 | — |
| PHONE | ne (8080 project) | 0 | — |
| QUOTE | ne | 0 | — |
| STATISTIC | ne | 0 | — |
| CTA | ano | 1 | 1× CTA |

CHECKLIST: LLM zvolil IMAGE + spoken CTA; není quota. PHONE/QUOTE/STATISTIC: mimo ceiling (žádný mobile product signal / proof index pro 8080).

---

# Run `d893d9f7-2153-47c2-954e-1934f872c162` — Package detail

## Identita

- **package_id:** `3548d3c5-997e-48b2-b563-f736a2bfb697`
- **strategy_item_id:** `f60c92f7-d442-4898-9c1e-c3966b29215d`
- **topic:** The moment a non-technical founder realizes she can't explain her own app to a developer
- **angle:** Coffee-meeting silence → real blocker is missing blueprint before dev conversation
- **funnel_stage:** awareness
- **creative_mode:** contrarian
- **hook:** You think the problem is finding the right developer. It's not.
- **package CTA:** Start building your product blueprint (`sign_up`)

## Voice

| Pole | Hodnota |
| --- | --- |
| **Použitý hlas** | `alloy` |
| **Větev resolveru** | `legacy_default_alloy` — `knowledge.presentation` prázdné; UI ukazuje „auto“, ale **není uložené** `preferred_voice: "auto"` → deterministic větev **neběží** |
| **Automatic vs explicit** | Ani explicit, ani automatic — legacy default |
| **TTS instructions** | Ano — tone z project brain (confident, technical-accessible, action-oriented, concise, empowering) |

## Visual profile

| Pole | Hodnota |
| --- | --- |
| **Použitý profil** | **MINIMAL** (`visual-profile@2`, `package_snapshot`) |
| **Proč** | `resolveVisualProfileAuto` se skórováním: MINIMAL vyhrál (saas/software/tech signály v seedu projektu 8080.ai) |
| **Scores (auto)** | NATURAL:1, MINIMAL:6, BOLD:0, EDITORIAL:0, PREMIUM:0 |
| **Reasons** | m.in. `MINIMAL:saas`, `MINIMAL:software`, `MINIMAL:tech` |
| **Source** | `auto` → zmrazeno v `presentation_generation` |

## Scény (kompletní)

### Scene 1 — IMAGE / image@1 / AI

- **image_prompt:** Portrait 9:16 — founder walks into coffee shop, laptop, purposeful; no text in scene.
- **asset:** —
- **analyzer:** allowed, image scene
- **semantic motion:** beat-1 → EXPLAIN, static, LOW

### Scene 2 — IMAGE / image@1 / AI

- **image_prompt:** Same woman at café table with developer, frozen mid-sentence; tension.
- **analyzer:** allowed, image scene
- **semantic motion:** beat-2 → EXPLAIN, pan_left, LOW

### Scene 3 — IMAGE / image@1 / **asset**

- **asset_id:** `d358f9d9-5616-450e-adc7-10e144ef3fbe`
- **used_as:** Phone mockup insert — product UI reveal, not fullscreen
- **storage:** `project-assets/.../Sn_mek_obrazovky_2026-07-13_v_23.48.19.png`
- **analyzer:** allowed, image scene (typed IMAGE, not PHONE renderer)
- **semantic motion:** beat-3 → HOLD, static

### Scene 4 — **CTA** / cta@1

- **payload:** headline *Start building your product blueprint*, subline *Turn your idea into a clear spec…*, button *Get started at 8080.ai*, show_logo true
- **analyzer:** eligible cta scene; cta renderer active
- **semantic motion:** beat-4/5 → CLOSE, static

## Voiceover, subtitles, storyboard

**Voiceover (celý):**

Everyone thinks shipping slow means you need a better dev. Wrong. You had the meeting. You sat across from the developer. And mid-sentence, you froze — because the app only exists clearly in your head. No spec. No flow. No language a developer understands. The real blocker isn't talent. It's the gap between a raw idea and a structured blueprint. 8080.ai turns that idea into a real product blueprint before the conversation even starts.

**Subtitles:**

You think shipping slow = wrong developer. | Wrong. | You froze mid-sentence. | No spec. No flow. No blueprint. | The blocker isn't talent. | It's the gap between idea and structure. | 8080.ai closes that gap before the meeting.

**Storyboard / beats** (`creative_mode_beats`: common_belief → why_wrong → proof → cta):

1. scene-1 — common_belief — 4s — EXPLAIN/static  
2. scene-2 — why_wrong — 4s — EXPLAIN/pan_left  
3. scene-3 — proof — 4s — HOLD/static  
4. scene-4 — cta — 4s — CLOSE/static  
5. (beat-5) — scene-4 — CLOSE/static (reuse poslední scény)

**presentation_generation / analyzer / guardrails:** viz JSON v sekci Appendix A.

## Platform outputs (kompletní, nezkráceno)

Viz **Appendix A** — `platform_outputs` pro package `3548d3c5-...`.

---

# Run `684a95ef-0bb6-4c84-88dd-9766df4a0285` — Package detail

## Identita

- **package_id:** `55095835-df59-42c0-b982-aa76a3428366`
- **strategy_item_id:** `75b1dae1-8522-4327-a4be-b9efa17ae389`
- **topic:** Most people pull out the wrong credit card at checkout without even realizing it
- **angle:** Register moment → silent money leak across hundreds of purchases
- **funnel_stage:** awareness
- **creative_mode:** story
- **hook:** Using more cards means earning more rewards. It does not.
- **package CTA:** Download the app and stop leaving rewards on the table. (`lead`)

## Voice

| Pole | Hodnota |
| --- | --- |
| **Použitý hlas** | `nova` |
| **Větev** | `deterministic_project_voice` — `knowledge.presentation.preferred_voice: "auto"` |
| **Automatic vs explicit** | **Automatic** (deterministic hash projectId+language) |
| **TTS instructions** | Ano — honest/direct, privacy-first, practical dollar focus |

## Visual profile

| Pole | Hodnota |
| --- | --- |
| **Použitý profil** | **NATURAL** |
| **Proč** | Explicit UI/knowledge override `NATURAL` (ne auto hash pro tento projekt) |
| **Source** | `override` / `package_snapshot` |

## Scény (5)

| # | id | types | renderer | media |
| ---: | --- | --- | --- | --- |
| 1 | scene-1 | IMAGE | image@1 | AI — wallet hover checkout |
| 2 | scene-2 | IMAGE | image@1 | AI — card tap terminal |
| 3 | scene-3 | IMAGE | image@1 | AI — missed card in wallet |
| 4 | scene-4 | IMAGE | image@1 | **asset** `030e7435-ea38-4b9a-b8e7-b3107ace43e6` phone insert UI |
| 5 | scene-5 | **CTA** | cta@1 | raster — Stop guessing at checkout |

**AI images:** 3 (ne 2 jako u d893 — delší IMAGE story před assetem).  
**Semantic motion (render_spec):** drift_down, drift_up, zoom_out, static (scene-4), CLOSE static (scene-5).

**Voiceover / subtitles:** plné texty v DB — stejné jako v creative exportu (425 znaků VO, 75 slov).

## Platform outputs

Kompletní texty pro TikTok, Instagram, YouTube, LinkedIn, Facebook, X (včetně variant pro X) — viz **Appendix B** (soubor obsahuje full `platform_outputs` + per-platform `content_items` shrnutí z DB).

---

# Porovnání s běhy `7628340e` a `5e8465bc`

| Dimense | 7628340e / 5e8465bc (fenrik) | d893 / 684a (nové) |
| --- | --- | --- |
| **Projekty** | 1 projekt, 3 videa / run | 2 různé produkty, 1 video / run |
| **Variabilita témat** | 3 distinct hooks v runu | 1 hook / run; mezi runy úplně jiné niche |
| **Voice** | alloy (762) / shimmer jobs (5e) | alloy (8080 legacy) vs nova (RightCard auto) |
| **Visual profile** | EDITORIAL v1 hash, stejné pro všechny 3 | MINIMAL auto scored v2 vs NATURAL override |
| **Semantic motion** | v1 beats, opakující pan/drift/static | v2 beats; RightCard: drift_down/up, zoom_out |
| **Scene types** | 100 % IMAGE | IMAGE + **CTA renderer**; asset inserts |
| **CTA end card** | Mluvené CTA + poslední IMAGE still | **Typed CTA scéna** (cta@1) — stejný layout, jiný copy |
| **Image prompty** | Editorial suffix, office/SaaS metafory | 8080: founder narrative; RightCard: checkout macro fotky |
| **Storytelling** | 4 IMAGE / 5 beats, reuse scene-1 | 8080: contrarian 4 beats; RightCard: myth→conflict→reveal 5 beats |
| **Hooky** | Reputation tax / platform panic / tab close | Developer freeze vs wrong card myth |
| **Podobnost scén** | Vysoká struktura (4×IMAGE) | Střední — shared **pattern** 3 narrative IMAGE + asset + CTA |
| **CHECKLIST/PHONE/QUOTE/STAT** | Povolené v promptu, 0× render | RightCard: PHONE v ceiling; stále 0× typed kromě CTA |
| **Assets** | Nepoužity | Oba runy: 1× product screenshot insert |

### Co se změnilo oproti minulým auditům

- **Poprvé v produkci:** `requested_cta_count: 1` → skutečný **CTA renderer** (`cta@1`).
- **Visual profile v2** se skóre/reasons (8080 MINIMAL).
- **Asset compositing** v narrative beat (ne jen AI).
- **Různé projekty** místo jednoho fenrik batch — větší copy/visual divergence.

### Co zůstalo stejné

- Žádný CHECKLIST / QUOTE / STATISTIC render.
- PHONE renderer nepoužit (asset jde jako IMAGE + insert).
- CTA **layout** jednotný (`composeCtaRaster`).
- Voice resolver stále **nečte** funnel/creative_mode/topic.

---

# Appendix A — d893 `platform_outputs` (full JSON)

```json
{
  "x": {
    "cta": "What's the first thing you'd put in a product blueprint?",
    "format": "Single post — X Feed",
    "caption": "Everyone thinks slow shipping = wrong developer. The real problem: you walked into that meeting with an idea in your head and nothing on paper. No spec. No flow. No blueprint. The dev can't build what you can't describe.",
    "hashtags": ["#startupfounder", "#buildinpublic"],
    "title_variants": [
      "The real reason your product idea never ships",
      "That frozen moment mid-meeting? It's a systems problem.",
      "Your developer isn't the bottleneck. Your blueprint is."
    ],
    "caption_variants": [
      "Everyone thinks slow shipping = wrong developer. The real problem: you walked into that meeting with an idea in your head and nothing on paper. No spec. No flow. No blueprint. The dev can't build what you can't describe.",
      "You know that pause mid-sentence when you realize you can't explain your own app? That's not nerves. That's a missing blueprint. The idea is clear in your head. It's untranslatable everywhere else. That's the actual blocker.",
      "Hot take: most founders don't have a developer problem. They have a 'raw idea with no structure' problem. You can't hire your way out of that. You need a blueprint before the meeting — not after the delays. #startupfounder #buildinpublic"
    ]
  },
  "tiktok": {
    "cta": "drop a 🧠 if this hit too close",
    "format": "Vertical Short (9:16) — TikTok native",
    "caption": "you don't need a better developer. you need a blueprint that exists outside your head first. founders freeze in that meeting because the idea was never structured — not because the dev was wrong. 8080.ai fixes the part nobody talks about.",
    "hashtags": ["#founderlife", "#buildinstartup", "#techfounder", "#nocode", "#startuplife"]
  },
  "youtube": {
    "cta": "Subscribe for more founder insights. Start your blueprint at https://8080.ai",
    "format": "Vertical Short (9:16) — YouTube Shorts",
    "caption": "The Real Reason Your Product Idea Never Ships (It's Not the Developer)\n\nEvery non-technical founder has had that moment — sitting across from a developer, mid-sentence, suddenly realizing the app only exists clearly inside their own head. No spec. No user flow. No structured blueprint. The conversation stalls. The project delays. And everyone blames the wrong thing.\n\nThe actual bottleneck is the gap between a raw idea and a product blueprint a developer can act on. 8080.ai closes that gap automatically — generating requirements, user flows, and architecture from a single sentence, before development ever starts.\n\nWatch to see how the overlooked step at the start of every product journey is also the one that determines whether it ships at all.\n\nStart building your product blueprint: https://8080.ai",
    "hashtags": ["#founderadvice", "#productblueprint", "#8080ai", "#startupgrowth", "#nontechnicalfounder"]
  },
  "facebook": {
    "cta": "Start building your product blueprint at https://8080.ai",
    "format": "Vertical Short (9:16) — Facebook Reels / Feed Video",
    "caption": "Most founders think slow product launches come down to finding the right developer. That's not usually the problem.\n\nThe real blocker? Walking into that first dev conversation with nothing but a raw idea in your head — no spec, no user flow, no structure a developer can actually work from.\n\n8080.ai turns your idea into a complete product blueprint automatically: requirements, user flows, architecture — before a single line of code is written. So you show up to every conversation ready. 💡\n\nStart building your product blueprint at https://8080.ai",
    "hashtags": ["#startupfounder", "#productblueprint", "#8080ai"]
  },
  "linkedin": {
    "cta": "Has your team ever started building without a shared blueprint? Worth discussing in the comments.",
    "format": "Text post with video attachment — LinkedIn Feed",
    "caption": "Most founders blame slow shipping on developer talent or agency timelines. The actual bottleneck is earlier and quieter than that.\n\nIt's the moment a founder sits across from a developer and realizes — mid-conversation — that the product only exists as a clear vision inside her own head. No requirements document. No user flow. No architecture. Nothing a developer can work from.\n\nThe meeting doesn't fail because of the developer. It fails because the idea was never structured before the conversation started.\n\nThis is the step most product teams skip entirely: turning a raw idea into a clear, shared blueprint before development begins. No spec means no alignment. No alignment means weeks lost before a single line of code is written.\n\n8080.ai generates that blueprint automatically — requirements, user flows, architecture — from one sentence. The conversation changes when you arrive with structure.",
    "hashtags": ["#productmanagement", "#startupfounder", "#softwaredevelopment"]
  },
  "instagram": {
    "cta": "Save this if you've lived that silence. Link in bio to start your blueprint.",
    "format": "Vertical Short (9:16) — Instagram Reels",
    "caption": "The meeting went fine. Until it didn't. 🫥\n\nYou walked in ready to pitch your app. Then mid-sentence — silence. You couldn't explain the flow, the feature, or what happens after a user signs up. The idea was crystal clear in your head. Just completely untranslatable out loud.\n\nHere's the take nobody says: the problem was never the developer. It was going into that conversation with no structured blueprint — just a raw idea and good intentions.\n\n8080.ai turns a single sentence into a full product blueprint: requirements, user flows, architecture — before development starts. So the next meeting? You're the one with answers.",
    "hashtags": ["#founderlife", "#productdesign", "#startupfounder", "#buildinpublic", "#nontechnicalfounder", "#productmanagement", "#saas", "#techstartup", "#8080ai", "#productblueprint"]
  }
}
```

---

# Appendix B — 684a `platform_outputs` (full JSON)

```json
{
  "x": {
    "cta": "What card do you actually default to at checkout?",
    "format": "X post — terse, opinionated, sparks a reply",
    "caption": "More cards in your wallet doesn't mean more rewards. It means more chances to grab the wrong one. That habit — across hundreds of purchases — is a quiet money leak most people never notice. #creditcards #rewardstips",
    "hashtags": ["#creditcards", "#rewardstips"],
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
  },
  "tiktok": {
    "cta": "Check the link in bio and stop guessing.",
    "format": "Vertical Short (TikTok) — 25s, fast cuts, VO-driven, native casual tone",
    "caption": "More cards in your wallet doesn't mean more rewards. It just means more chances to grab the wrong one. That habit is costing you — every single checkout. RightCard tells you which card to actually use before you tap. Free, no bank login, nothing sketchy.",
    "hashtags": ["#creditcardrewards", "#moneytips", "#rewardshacks", "#personalfinance"]
  },
  "youtube": {
    "cta": "Download RightCard free at https://www.rightcard.ai — and subscribe for more rewards optimization tips.",
    "format": "YouTube Short — 25s vertical, VO-driven, search-optimized title + structured description",
    "caption": "You carry multiple rewards cards. You still grab the wrong one at checkout — almost every time. Here's why that quiet habit is costing you more than you think, and how RightCard surfaces the right card to use before you even tap. No bank login required. Completely free. Runs on your device.\n\nDownload RightCard: https://www.rightcard.ai\n\nrightcard.ai covers 1,800+ brands and 130+ U.S. rewards cards, updated weekly. Your data never leaves your device.",
    "hashtags": ["#creditcardrewards", "#rewardsoptimization", "#personalfinance"]
  },
  "facebook": {
    "cta": "Download the app free at https://www.rightcard.ai",
    "format": "Facebook feed post — conversational, relatable hook, single canonical link",
    "caption": "Here's something nobody tells you: carrying multiple rewards cards doesn't automatically mean you're earning more. It just means you have more chances to grab the wrong one at checkout — and most people do, every time, without realizing it.\n\nThat one habit, repeated across hundreds of purchases a year, quietly costs you real rewards. The card you didn't use might have earned triple at that store.\n\nRightCard fixes that. It tells you exactly which card to use before you tap — no bank login, no account linking, completely free. Runs on your device. Takes a minute to set up.\n\nDownload it and stop leaving rewards on the table: https://www.rightcard.ai",
    "hashtags": ["#creditcardrewards", "#moneytips"]
  },
  "linkedin": {
    "cta": "Have you ever caught yourself grabbing the wrong card at checkout? Drop a comment — curious how common this actually is.",
    "format": "LinkedIn feed post — professional insight tone, no hype, invites engagement",
    "caption": "Most people who carry multiple rewards cards believe they're maximizing their earnings. They're not. The real problem isn't the number of cards — it's the moment of decision at checkout, where habit beats strategy every time.\n\nThat split-second choice, repeated across hundreds of purchases, can mean a meaningful difference in rewards earned over a year. The card left in the wallet might have earned triple at that specific merchant.\n\nRightCard is a free, on-device tool that identifies which card to use at 1,800+ brands — no bank login, no account linking, no data leaving your device. It's the overlooked detail that quietly changes the math.\n\nWorth a look if you hold more than one rewards card.",
    "hashtags": ["#personalfinance", "#creditcards", "#rewardsoptimization"]
  },
  "instagram": {
    "cta": "Download it — link in bio.",
    "format": "Vertical Reel (Instagram) — 25s, polished VO + captions, story-arc structure",
    "caption": "Three cards in your wallet. You grab one. Feels fine. 💳\n\nIt's not. That split-second habit — repeated across hundreds of purchases — quietly drains your rewards. The card you left behind might have earned triple at that store.\n\nRightCard tells you which card to use before you tap. On-device, offline-capable, completely free. No bank login. Ever.",
    "hashtags": ["#creditcardrewards", "#rewardsoptimization", "#personalfinance", "#moneytips", "#travelrewards", "#creditcards", "#smartspending", "#cashback", "#rewardshacks", "#rightcard"]
  }
}
```

---

# Appendix C — `presentation_generation` + job scenes (d893)

`video_jobs.input.scenes` a `presentation_analyzer` pro job `16fa67fc-...` — plný export je v Supabase; klíčová pole:

- `allowed_scene_types`: IMAGE, CHECKLIST, CTA  
- `prompt_presentation_types`: IMAGE, CHECKLIST, CTA  
- `requested_cta_count`: 1, `accepted_cta_count`: 1  
- `history_decisions`: `[]`, `frequency_decisions`: `[]`, `downgrade_rules`: `[]`

---

# Executive summary

**Co se zlepšilo proti `7628340e` / `5e8465bc`**

- Typed **CTA scény** reálně renderované (`cta@1`), ne jen mluvený CTA přes IMAGE still.
- **Product assets** v timeline (UI screenshot insert).
- **Visual profile v2** s explicitním skórováním (8080 → MINIMAL).
- **Semantic motion v2** a bohatší primitiva na RightCard běhu.
- Obsah napříč **různými produkty** (8080 vs RightCard) — silnější diverzita než 3× fenrik batch.

**Co se nezměnilo**

- Dominance **IMAGE** scén; CHECKLIST/QUOTE/STATISTIC stále 0× v renderu.
- **PHONE renderer** nepoužit (UI přes IMAGE+asset).
- **Jedna CTA layout šablona** — konce videí vypadají stejně kromě textu.
- Voice resolver bez per-video / per-funnel logiky; 8080 stále padá na legacy alloy při prázdném presentation JSON.

**Pravděpodobně bug**

- **Ne** u počtu AI obrázků na d893 (2 AI + 1 asset + 1 CTA je konzistentní s plánem).
- **Možná UX/documentation bug:** UI „Automatic voice“ u 8080 bez uloženého `preferred_voice: "auto"` → alloy místo deterministic; decision audit executive šablona občas ukazuje zastaralé „IMAGE-only“ i když CTA v datech je (šablona skriptu, ne DB).

**Designové rozhodnutí**

- Jednotný CTA raster (headline + subline + button + logo).
- Asset beat jako IMAGE compositing, ne PHONE typed scene.
- 3–4 narrative AI stills + 1 product asset + 1 CTA jako standardní arc.

**Doporučení před další produkcí**

1. U 8080 (a fenrik) **uložit** `preferred_voice: "auto"` pokud má být deterministic voice — ne spoléhat na prázdné presentation.
2. Rozhodnout, zda **CTA layout variety** (`cta@2`) je produktová priorita; copy alone nestačí pro odlišný „feel“ konce.
3. Zvážit **1× CHECKLIST nebo PHONE renderer** na run, kde ceiling a proof/signály existují (RightCard má PHONE v promptu) — ověřit typed pipeline mimo CTA.
4. Mapovat **creative_mode beat role** → semantic intent (`roleDefaultIntent`) — stále částečné mismatch (EXPLAIN vs HOLD/CLOSE).
5. Nechat **asset + CTA** pattern — funguje; pro fenrik batch zvážit stejný model místo 4× pure AI.

---

_Data sources: `getReviewRunExport` pattern via existing audit scripts (read-only), Supabase SQL on `video_jobs` / `content_packages`, code: `composeCtaRaster.ts`, `analyzePresentation.ts`, `resolveTtsOptions.ts`, `resolveVisualProfile.ts`._
