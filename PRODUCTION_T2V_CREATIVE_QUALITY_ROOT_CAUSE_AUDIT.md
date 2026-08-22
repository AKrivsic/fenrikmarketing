# Production T2V Creative Quality — Root Cause Audit

**Projekt:** fenrik Studio (`163c1822-ad30-4cee-8826-dfacd9c188b9`)  
**Datum:** 2026-08-21  
**Režim:** pouze čtení (kód + uložená data). Žádná implementace, žádný nový production run, žádné volání Claude / OpenAI / ElevenLabs / Runway, žádná změna flagů ani databáze.

Tento dokument odpovídá na otázku, proč produkční Text-to-Video opakovaně vytváří nudné, podobné a občas významově chybné návrhy. Obecné rady bez opory v kódu nebo datech sem nepatří.

---

## Jak číst evidenční značky

| Značka | Význam |
|---|---|
| **OVĚŘENO** | Fakt ze současného kódu nebo z uložených řádků v DB. |
| **REKONSTRUOVÁNO Z KÓDU** | Přesný request není uložený. Platí aktuální prompt builder; shoda s historickým promptem není 100% zaručena, pokud se kód mezitím změnil. |
| **NEOVĚŘENO** | Raw request/response, snapshot paměti nebo Product Brain v okamžiku generace **není uložený**. Nerekonstruuji to jako fakt. |

Telemetry výslovně ukládá jen kompaktní souhrn: `input_summary` / `output_summary`. Komentář v `lib/ai/telemetry/types.ts`: *„Compact description — never the full prompt.“*

---

## Identifikace tří produkčních T2V package

Poslední tři T2V Content Packages projektu, v pořadí od nejnovějšího:

| # | Title | Package ID | Production run ID | Run status | Strategy item | Funnel | Created (UTC) |
|---|---|---|---|---|---|---|---|
| 1 | **The Candidate Who Already Knew** | `ed233823-3e56-46a2-b591-ffe895e52b92` | `536fc385-192a-42d9-8b24-f7d845ff8bb1` | `cancelled` | `c5baeeaa-fb1b-439a-bc32-4c52b39c6b18` | awareness | 2026-08-21 20:35:47 |
| 2 | **The Pre-Start Search** | `a3839298-4b7c-4ce9-bf70-ecabfb097cbd` | `77c20c1e-72b4-49c8-b05d-7d1a33a8a7d4` | `cancelled` | `d599329b-e662-43a7-9bde-96330a8c27e2` | awareness | 2026-08-21 18:47:11 |
| 3 | **The Tab They Opened Before Your Call** | `3b30b458-8d74-4267-8a53-a1a980b11e7c` | `ee98f7e1-2c84-4da5-bf5c-420fa0590a98` | `cancelled` | `260669ea-d3ff-4024-adcf-deaef23de4fe` | awareness | 2026-08-20 14:42:02 |

Všechny tři běhy: `generationMode=manual_review`, `packageVideoMode=text_to_video`, **`packageCount=1`**.

Čtvrtý T2V package v DB (mimo požadovanou trojici, relevantní pro anti-repetition): **The Reply That Never Came** (`a38b2fa0-9634-4d4f-b750-05308b019bee`, run `9a3cc0cb-f726-4b92-aaf5-eb67a89599d7`, 2026-08-20 10:17). Stejný pain point, stejná rodina situace.

Starší still package **The Call That Never Came** (`07261aaf-8f91-452f-91df-6b588aaa1f62`, 2026-08-12) má topic *„The client who almost hired you found your profile, saw nothing posted in two months“* a stejný pain point. Motív proto předchází T2V režimu.

Žádný z auditovaných T2V běhů nemá video job / Runway POST. Placená T2V produkce těchto package **neproběhla**.

---

## Executive verdict (nejprve)

Nudné a podobné návrhy nevznikají primárně v T2V adapteru. Vznikají **už ve strategii**: čtyři po sobě jdoucí T2V (a jeden starší still) dostaly stejný pain point *„Social accounts are inactive or inconsistent“* a skoro stejnou situaci (někdo před závazkem otevře profil a najde měsíce ticha). Claude pak ten úkol poslušně vizualizuje jako telefon / notebook / feed.

Adapter a překlad problém **zhoršují**, ale původní nuda je už v Claude Video Concept a Opening Impact.

Aktuální Candidate package **nelze bezpečně spustit** jako placený T2V: produkční angličtina změnila „still hiring“ na „still open“, Runway prompt současně žádá čitelný displej a zakazuje čitelný text, a `video_creative_integrity` hlásí `plan_sync_status=stale` / `visual_plan_status=stale`.

---

## Ověřené vs. neověřené u každého běhu

### Společné — co není uložené

| Položka | Stav |
|---|---|
| Přesný system prompt v okamžiku generace | **NEOVĚŘENO** (telemetrie ho neukládá) |
| Přesný user prompt v okamžiku generace | **NEOVĚŘENO** |
| Raw AI response před validací / repair | **NEOVĚŘENO** (Candidate měl JSON Repair u lokalizace; opravený JSON není uložený) |
| Snapshot anti-repetition memory | **NEOVĚŘENO** (sestavuje se za běhu z posledních package) |
| Snapshot Product Brain v okamžiku generace | **NEOVĚŘENO** (v `package_brief` není kopie `projects.*`; níže je **aktuální** stav projektu) |
| Provider request ID / full usage payload | částečně v telemetrii (model, cost, summary), ne prompt |

### Společné — co je uložené a použité níže

- Strategy item `brief.topic` / `angle` / `pain_point`
- `presentation_generation.video_concept`, `opening_impact`, `visual_identity`, `selected_pain_point`, `creative_mode`, `content_pipeline_fingerprint`, `generation_telemetry.steps`
- Persistovaný Content Package: hook, voiceover, `visual_scenes`
- Creative Review: `original_ai`, `localized_edit`, `english_preview`, scene intents, history
- T2V plán a `provider_prompt`

### Modely z telemetrie (OVĚŘENO, Candidate)

| Krok | Provider | Model |
|---|---|---|
| Video Concept | Claude | `claude-sonnet-4-6` |
| Opening Impact | OpenAI | `gpt-4o-mini-2024-07-18` |
| Visual Identity | deterministický kód | — |
| Content Package | Claude | `claude-sonnet-4-6` |
| JSON Repair (lokalizace VO) | OpenAI | `gpt-4o-mini-2024-07-18` |
| CR Scene Intent | Claude | `claude-sonnet-4-6` |
| CR VO Localization CS | Claude | `claude-sonnet-4-6` |
| CR VO Translation EN | Claude | `claude-sonnet-4-6` |
| CR Scene Intent Localization / Translation ×4 | Claude | `claude-sonnet-4-6` |
| Social Image | image | `gpt-image-1` |
| T2V planner | deterministický kód | není LLM krok |

Kód routing: `getCopywritingProvider()` / `getStrategyProvider()` → Claude, default `process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"`.

Odhadované náklady z uložené telemetrie (jen package generation, bez ElevenLabs/Runway): Candidate **$0.20**, Pre-Start **$0.21**, Tab **$0.20**.

---

## AUDIT 1 — Kdo skutečně tvoří kreativu

Pořadí v `generateContentPackage` / `runCreativePipeline` (**OVĚŘENO** z kódu):

```
Content Strategy (1 item, protože packageCount=1)
  → Video Concept (Claude)
    → Opening Impact (GPT-4o-mini)
      → Visual Identity (kopie visual_direction + first_image)
        → Content Package (Claude, 1 JSON: hook, VO, 3–5 scén, captions, …)
          → Creative Review seed (Claude intent + CS + EN round-trip)
            → attachTextToVideoCreativePlan (deterministický adapter)
```

| Co | Kdo | Vstup | Výstup | Další transformace | Ztráta významu / emoce / originality |
|---|---|---|---|---|---|
| Téma | Claude Content Strategy | Product Brain, pain points, scenario pool, anti-rep **hooks/topics/CTAs/scenarios** (ne vizuální fingerprinty), `packageCount=1` | `brief.topic` + `angle` + `pain_point` | Žádná. Package prompt dostane toto jako autoritu. | **Zde se zamyká rodina „někdo otevře tichý profil“.** Variace POV (kandidát / nový hire / klient) není nová myšlenka. |
| Hlavní myšlenka | Claude Video Concept | Strategie + Product Brain + (soft) pipeline fingerprinty | `core_idea`, `narrative_arc`, `visual_direction` | Opening i Package musí koncept ctít | Koncept Candidate je argumentačně silný, vizuálně už předepisuje meeting + laptop + phone feed. |
| Hook | GPT-4o-mini Opening Impact, pak **tvrdě zkopírovaný** Package promptem | Concept + first_image world | `first_spoken_sentence` | Package: `hook MUST equal first_spoken_sentence` a VO musí začínat stejnou větou | Package **nesmí** vymyslet lepší hook. Scroll-stop se hraje v 1–2s GPT kroku, ne v Claude package. |
| Voiceover | Claude Content Package | Hook uzamčený Opening Impactem, 40–80 slov | `voiceover_text` | CR: EN→CS→EN. T2V TTS čte `english_preview`, ne `original_ai`. | Význam se může (a u Candidate se) ztratí v round-tripu. |
| Počet scén | Claude Content Package | Prompt: prefer 4–5, required 3–5 | `visual_scenes.length` | T2V adapter scény mapuje 1:1; sentence-splitter je legacy a u ≥3 kanonických scén se neschvaluje | Candidate 4, Pre-Start 5, Tab 5. Počet není problém. |
| Děj scén | Claude Content Package `visual_scenes` | Concept + Opening `first_image` jako scéna 1 | `image_prompt` + `motion_prompt` + `voiceover_excerpt` | CR Scene Intent **přepíše děj na abstraktní 1–2 věty bez kamery**. Adapter použije tento intent jako Runway **Action**. | **Vizuální konkretnost storyboardu se v Action ztrácí.** Image prompt často ani nevejde do 1000 UTF-16. |
| Obrazový popis | Claude `image_prompt` | Visual Identity (autoritativní look) | konkrétní still | Adapter: `Setting:` jen pokud zbude budget | U Candidate **Setting chybí ve všech 4 uložených provider_prompt**. |
| Pohyb | Claude `motion_prompt` | T2V instrukce „short video event“ + příklad „slow push-in“ | jemný pohyb | Adapter zkopíruje do `Motion:` | Originální pohyb Claude už psal bezpečně (push-in, nod, gaze). Adapter ho nemění na nudu — jen ho přenáší. |
| Kamera | Claude `visual_direction.camera_style` (jeden odstavec na celý film) | Concept | Visual Identity.camera_style | Adapter vloží **stejný odstavec** jako `Camera:` do **každé** scény | Close-up obličeje zároveň žádá „One insert shot of the phone screen“. |
| Continuity | Visual Identity (environment, palette, lighting, character) | Concept | block | `shortContinuityWithoutCamera`; u Candidate se do promptu nevešel | Identita bez reference: „identities … stable“ v motion. |
| Překlad | Claude copywriting | Seed: `original_ai` → CS; pak **pouze CS** → EN. Originál EN v druhém requestu **není**. | `english_preview` | `english_confirmed=true` nastaví **system**, ne operátor | **still hiring → still open.** |
| Zkrácení / normalizace | Guardrail 80 slov; `stripNonessentialReadableTextRequests`; 1000 UTF-16 compose | — | ořez | Stripper nechytí „phone screen remains **legible**“ | Rozpor čitelný displej vs. zákaz textu zůstane. |
| Sestavení Runway promptu | `composeTextToVideoProviderPrompt` | CR english intent + motion + package camera + constraint | 1 řetězec | Žádný LLM | Action je abstraktní, Camera je globální, Constraint odporuje Motion. |

**Závěr Audit 1:** Kreativní autorita je rozbitá na 4 LLM + 1 deterministickou identitu + 1 adapter. Žádný jeden Claude výstup není finální video. Největší ztráta originality je **před** adapterem (strategie + uzamčený opening). Největší ztráta vizuální konkrétnosti pro Runway je **v** adapteru (Action = scene intent, drop Setting). Největší ztráta významu je **v** překladu.

---

## AUDIT 2 — Claude zadání (Content Package a okolí)

Raw prompt **NEOVĚŘENO**. Citace jsou z **aktuálních** builderů.

### Content Package — system (`buildContentPackageSystem`)

> „Generate ONE complete content package as valid JSON in a single pass. […] Honor Opening Impact exactly for the hook and opening spoken line. Honor Visual Identity for all image prompts.“

### Content Package — user (klíčová tvrzení)

- Hook **MUSÍ** rovnat `first_spoken_sentence`.
- VO **MUSÍ** začínat stejnou větou.
- Visual Identity je autoritativní look pro **všechny** image prompts.
- `SELECTED PAIN POINT is the STORY.`
- T2V: scéna má být video event, `image_prompt` / `motion_prompt` nesmí kopírovat VO excerpt.
- Příklad v tom samém bloku:

> „Owner at desk answering emails […] camera slow push-in“  
> „Agent nods once while holding the phone“  
> „hand gently adjusts angle; subtle parallax“

### Video Concept — system

> „senior creative director. Invent […] ONE video concept for a short-form marketing video.“

Není tam „scroll-stopping first second“. Je tam diversity POV a „Do not reuse the same recurring scene family when recent fingerprints already used it (e.g. dark office + laptop + night analytics)“.

### Opening Impact — system (GPT, ne Claude)

> „opening 1–2 seconds […] Optimize for immediate attention with specificity, curiosity, conflict, and product truth.“

### Vyhodnocení 13 otázek

1. **Scroll-stopping hook v Claude package promptu?** Ne. Package hook je kopie Opening Impact. Scroll-stop je v GPT Opening Impact (1–2 s), ne v Claude package.
2. **Emoce / konflikt / překvapení / napětí?** Opening Impact ano (curiosity + conflict). Video Concept žádá `emotional_tone`. Package je svázaný módem a pain pointem. Candidate concept: *„Calm authority with a quiet sting. No alarm. No urgency theater.“*
3. **Originální vizuální metafory?** Video Concept má prostor. Package musí zůstat ve Visual Identity, která už metafory zúžila na meeting / desk / phone.
4. **Bezpečné doslovné vysvětlení?** Ano, posiluje to: pain point is the STORY; hook = spoken line; first_image → scene 1; T2V „Do not invent a second plot.“
5. **Protichůdná pravidla?** Ano. T2V: scéna není still caption VO. Zároveň scéna 1 **musí** být Opening `first_image`, který je doslovná ilustrace první věty. Motion příklady zakazují on-screen text; identity Candidate žádá „phone screen […] clean, **legible**“.
6. **Příliš zákazů?** Středně. Forbidden claims, product_is_not, no URL in imagery, no lip-sync, no logos, JSON shape, 80 slov, platform captions. Hlavní brzda není počet zákazů, ale **uzamčení hooku + identity**.
7. **Professional / subtle / restrained / realistic?** Tato slova nejsou hardcoded v package system promptu. **Vznikají v Claude visual_direction** a pak se stanou zákonem: *composed, unhurried, not dramatised, no exaggerated expressions, quiet discomfort, handheld but composed.* Opening: *„Deliberate and unhurried.“* Příklad motion v promptu: *slow push-in, nods once, subtle parallax.*
8. **Krátké sociální video, zastavit scroll v 1. sekundě?** Opening Impact ano. Claude package / Video Concept **ne**.
9. **Historie vizuálních motivů?** Video Concept: `pipelineFingerprintMemoryBlock` (soft). Strategy prompt: **jen** hooks/topics/CTAs/scenarios — **ne** fingerprinty. Package prompt: anti-rep hooks/topics, **ne** vizuální fingerprinty.
10. **Ví Claude, že telefon / notebook / dashboard už byly?** Soft, a jen ve Video Concept, pokud memory builder fingerprinty načetl. **NEOVĚŘENO**, že Candidate request skutečně obsahoval fingerprinty Tab/Pre-Start. Kód by je načíst měl, protože oba package existovaly dříve. I tak strategie **přikázala** další „check the silent feed“ topic, takže vizuál telefonu je téměř povinný.
11. **Prostor pro neočekávanou metaforu?** Ve Video Concept ano, pokud strategie dovolí. Po uzamčení identity ne.
12. **Nucen vizuálně opakovat VO?** Scéna 1 ano (`first_image` = opening line). T2V text říká opak.
13. **Jeden request, příliš mnoho výstupů?** Ano. Jeden Claude JSON: title, hook, 40–80w VO, script, 4–5 visual_scenes s image+motion+excerpt, platform captions ×5, hashtags, social_image, asset_usage. Storyboard soutěží s captions. Scene Intent je **další** Claude request, který storyboard znovu zjednoduší.

---

## AUDIT 3 — Kde vzniká nuda

### Run 1 — The Candidate Who Already Knew

| Pole | Hodnota (uložená) |
|---|---|
| Hook type | Citovaná dialogová věta (proof-shock). Creative mode `opinion`. |
| Opening visual | Hiring manager vs. new hire, glass conference room, laptop, phone face-up with feed gap |
| Hlavní emoce | Calm authority + quiet discomfort |
| Konflikt | Kandidát už viděl tichý feed; manažer to nevěděl |
| Překvapení | Offhand comment on day one |
| Změna začátek→konec | Meeting pokračuje; manažer se podívá na telefon; fade to black. **Žádný vnější děj.** |
| Motivy | Phone, laptop, feed, onboarding papers, mug, lanyard |
| Prostředí | Glass-walled conference room / open-plan desk |
| Rekvizity | Phone, laptop, welcome folder |
| Pohyb postav | Lean forward, gaze down, composed smile, open laptop lid slowly |
| Kamera | Slow composed push-in; then hold; then pull-back; then wide hold |
| Tempo | Deliberate / unhurried |
| CTA / payoff | „Silence is a signal.“ Product až v concept narrative, ve VO skoro není. |

### Run 2 — The Pre-Start Search

| Pole | Hodnota |
|---|---|
| Hook type | Contrast aphorism. Mode `checklist`. |
| Opening visual | Young professional, bedroom desk at night, phone, lanyard tote |
| Emoce | Quietly unsettling; not angry, just uncertain |
| Konflikt | Čekala ujištění, dostala ticho |
| Překvapení | Žádné — checklist potvrzuje očekávanou prázdnotu |
| Změna | Phone down, still face. **Stejný vnitřní stav, žádný plot twist.** |
| Motivy | Phone screens: TikTok, IG, LinkedIn, search, unanswered comment |
| Prostředí | Bedroom desk, amber lamp |
| Rekvizity | Phone, tote, lanyard, water glass |
| Pohyb | Unlock, scroll, tap, hover, set phone face-down, quiet exhale |
| Kamera | Slow push-in; tight on screen; hold |
| Tempo | Deliberate, anxious exploration |
| Payoff | „She is not angry. She is just uncertain.“ |

### Run 3 — The Tab They Opened Before Your Call

| Pole | Hodnota |
|---|---|
| Hook type | Direct question. Mode `faq`. |
| Opening visual | Split-screen: calendar „Discovery call in 10 minutes“ vs. 3-month-old post |
| Emoce | Blunt, slightly unsettling |
| Konflikt | Klient vidí ticho; owner se to nikdy nedozví |
| Překvapení | Absence follow-upu (řečená, nehraná) |
| Změna | Search → sparse feed → phone face-down → empty inbox. **Pasivní observace.** |
| Motivy | Phone, laptop, profile, feed, inbox |
| Prostředí | Screen-native, no faces |
| Rekvizity | Phone, trackpad, laptop |
| Pohyb | Tap, page load, slow scroll, set phone down, cursor blink |
| Kamera | Static / near-static (identity: „No handheld, no zooms“) |
| Tempo | Concept říká quick; scény jsou still + one scroll |
| Payoff | „You never knew the tab opened first.“ |

### Srovnání opakování

| Opakování | Candidate | Pre-Start | Tab | Původ |
|---|---|---|---|---|
| Telefon | ano | ano | ano | Claude storyboard; strategie to vyžaduje |
| Notebook | ano | ne (desk, ne laptop hero) | ano | Concept visual_direction |
| Obrazovka / feed / profil | ano | ano | ano | Topic |
| Kancelář / stůl | conference room | bedroom desk | desk edge only | Concept |
| Člověk u stolu | ano | ano | ruce u stolu | Concept |
| Pomalý push-in | ano sc.1 | ano sc.1 | ne (static) | Claude motion + příklad v promptu |
| Jemné kývnutí / gaze | gaze + smile | exhale / pause | none | Claude |
| Pohled na displej | ano | ano | ano | Topic |
| Quiet concern / subtle / composed | ano | ano | „ordinary, not dramatic“ | Claude emotional_tone → identity |
| Absence výrazného děje | ano | ano | ano | Concept + 80w VO + „no exaggeration“ |

**Claude raw už nudu vytvořil.** Adapter ji pro Runway ještě zploštil (Audit 6), ale tři storyboardy jsou podobné **před** adapterem.

Pre-Start je vizuálně nejživější (noční ložnice, checklist na reálných aplikacích). Pořád je to stejná myšlenka a stejná rekvizita.

---

## AUDIT 4 — Anti-repetition

### Co se skutečně porovnává (**OVĚŘENO** kód)

**A. Prompt memory** (`antiRepetitionBlock`): seznam recent **hooks, topics, CTAs, scenarios**. Pravidlo: „Do NOT reuse any hook above; write a clearly different opening.“ / „Do NOT repeat the topics/angles above.“ Žádná sémantická podobnost.

**B. Video Concept fingerprinty** (`pipelineFingerprintMemoryBlock`): compact `core_idea`, `visual_world`, `narrative_mechanism`. Pravidla označená **soft**: „avoid repeating — rejection memory only.“

**C. T2V gate** (`checkTextToVideoRepetition`):

1. `normalizeMemoryText(plan.approved_hook) === normalizeMemoryText(prior hook)` a délka ≥ 12  
2. `plan_fingerprint` přesná shoda se starším plánem  
3. opening `visual_intent` vs `memory.atmospheres` — opět **normalizovaný text**

`REPETITION_BLOCK_REASON_LABELS` to přiznává: *„textová shoda, ne sémantická originality.“*

`normalizeMemoryText` = lowercase, collapse whitespace, ořez koncové interpunkce. Nic víc.

`atmosphereFromPackageBrief` čte `fingerprint.palette_atmosphere` nebo `creative_engine.atmosphere` — **ne** image_prompt scény 1. Opening motif check proto **neporovnává** „phone on table“.

### Co to nechytí

| Jev | Chytí? |
|---|---|
| Stejný hook jinými slovy | Ne |
| Stejná hlavní myšlenka (tichý feed = signál) | Ne (T2V gate). Soft fingerprint v Concept — Candidate i tak prošel |
| Stejný děj (někdo scrolluje prázdný profil) | Ne |
| Stejný opening shot (device + feed) | Ne |
| Stejná lokace / rekvizita / metafora | Ne |
| Stejná kamera (slow push-in) | Ne |
| Stejná emocionální křivka (quiet unease → no explosion) | Ne |
| Telefon/notebook/obrazovka opakovaně | Ne |
| Významová podobnost | Ne |

### Proč tři podobné běhy prošly

Uložené T2V repetition: Candidate `status=passed`, `blocked_reasons=[]`. Tab/Pre-Start stejně (Tab má starší plan origin, ne `canonical_storyboard`).

Hooky jsou textově různé:

- „I wasn't sure you were still hiring…“
- „An active feed before your first day…“
- „What does a potential client see when they look you up…“

Topics jsou také textově různé, i když sémanticky stejné. `packageCount=1` vypíná intra-run pravidlo „N independent situations“. Cross-run ochrana je seznam stringů, ne podobnost.

Strategy prompt říká: *„Reusing the same pain_point is fine when the situation and angle are still different.“* Claude to interpretoval jako jiný POV (hiring manager / new hire / client) u **stejné situace**.

---

## AUDIT 5 — Překlad `still hiring` → `still open`

### Přesný tok (Candidate, OVĚŘENO z CR history seed)

1. **Originál (Claude package, EN, `original_ai`):**  
   `'I wasn't sure you were still hiring — your last post was from months ago.'`
2. **Česká pracovní verze (`localized_edit`, Claude Localization):**  
   `„Nebyla jsem si jistá, jestli ještě přijímáte — váš poslední příspěvek byl před měsíci.`  
   (`přijímáte` = přijímáte lidi / zakázky; hiring význam drží lépe než „open“.)
3. **Produkční EN (`english_preview`, Claude Translation z CS, bez originálu):**  
   `"I wasn't sure if you were still open — your last post was months ago."`

`translation_confirmed_by`: **`system`**.  
`english_confirmed`: **true**.  
`english_preview_outdated`: **false**.

Operátor VO needitoval. History event `manual_review_cancelled` zvedl version na 2 se **stejným** textem.

### Který model

Claude `claude-sonnet-4-6`, krok `Creative Review Voiceover Translation`. Telemetrie: *„Translate localized_edit → english_preview“*.

### Prompt (**REKONSTRUOVÁNO Z KÓDU**, `translateVoiceover.ts`)

System: *„You translate advertising voiceover copy into clear, natural English. Preserve meaning, tone, and persuasive intent.“*

User: *„Translate the following text into English. SOURCE: [pouze čeština].“*

- Znal původní angličtinu? **Ne.**
- Překládal pouze češtinu zpět? **Ano.**
- Kontrola zachování významu originál vs. CS vs. EN? **Ne.**
- Porovnání tří verzí? **Ne.**

`projectBrainBlock` v tomto překladovém promptu **není**. Scenario pool s gym commentem „are they still open“ proto **není ověřený vstup** tohoto requestu (v Product Brain ale existuje — viz Audit 7).

### Co znamená UI „EN: Current“

`CreativeReviewPackagePanel`: `EN: {englishOutdated ? "Outdated" : englishConfirmed ? "Current" : "Pending"}`.

`isEnglishPreviewCurrent` = náhled existuje a `english_preview_outdated === false`.  
`english_confirmed` seed nastaví na true automaticky.

**Current = technicky čerstvý překlad, ne významově správný překlad.**

T2V TTS by četl `english_preview` (`productionSpokenVoiceoverFromReview`). ElevenLabs by tedy řekl **still open**, ne still hiring.

`video_creative_integrity.approved_voiceover_text` stále drží originál se **still hiring** a `plan_sync_status=stale` — další rozpor mezi integritou a CR.

### Další významové posuny ve třech bězích (OVĚŘENO textovým srovnáním)

| Package | Originál | EN preview | Závažnost |
|---|---|---|---|
| Candidate | still **hiring** | still **open** | **Vysoká** — hiring vs. otevírací doba / still in business |
| Candidate | the feed is not a marketing channel | your company **profile** isn't a marketing channel | Střední |
| Pre-Start | An active **feed** … **reassurance** | An active **profile** … **confidence** | Střední (feed→profile, reassurance→confidence) |
| Pre-Start | before the **offer letter** | before the **contract** was signed | Nízká–střední |
| Pre-Start | She is just **uncertain** | She's just **not sure** | Nízká |
| Tab | They don't form a bad **opinion**. They form **no opinion** at all. | bad **impression**. They don't form **any impression**. | Nízká |
| Tab | No **follow-up** arrives | No **message** follows | Střední (follow-up vs. zpráva) |
| Tab | You never knew the tab opened first | that tab was the first thing they opened | Nízká |

Round-trip systematicky zjemňuje a generalizuje. U Candidate to změní pointu scény.

JSON Repair (`gpt-4o-mini`) běžel na Candidate lokalizaci VO — **NEOVĚŘENO**, zda rozbil uvozovky (`měsíci.\"`). Uložený CS text má smíšené uvozovky.

---

## AUDIT 6 — Rozporné Runway prompty (aktuální běh Candidate)

Uložený `prompt_contract_version`: **2**. Origin: `canonical_storyboard`.

Adapter skládá: `Photoreal vertical 9:16 clip.` + `Action:` (CR english_preview) + `Motion:` (Claude motion_prompt) + `Camera:` (**celé** `visual_identity.camera_style`) + constraint.

Package-level camera, vložená do **každé** scény:

> „Handheld but composed. Close on the hiring manager's face during the reaction beat. One insert shot of the phone screen showing the inactive feed — clean, **legible**, not dramatised. Cuts are deliberate and unhurried. No zoom effects or rapid-fire editing.“

Constraint na konci každého promptu:

> „No dialogue, lip-sync, subtitles, captions, logos, or readable on-screen text.“

### Scéna 1

| Vrstva | Text |
|---|---|
| Action | Abstrakt: new employee notices company gone quiet online; job seekers watch employers… |
| Motion | New hire leans; manager glances at phone; **phone screen remains legible and static**; slow composed push-in |
| Camera | Face close-up **a** insert phone screen, unhurried cuts |
| Continuity | Ve uloženém promptu **chybí** (budget) |
| Constraints | No readable on-screen text |

Rozpory: legible screen vs. no readable text; Action není vizuál (abstraktní idea); Camera žádá insert + close-up + cuts v jednom krátkém klipu; Setting (konkrétní conference room + laptop) **dropnutý**.

### Scéna 2 (má být close-up obličeje)

| Vrstva | Text |
|---|---|
| Action | Manager notices **the note**, loses composure, quiet unease that someone noticed **his absence** |
| Motion | Half-beat stillness → composed smile; head tilt; hold |
| Camera | Stejný globální odstavec včetně **insert phone screen** |
| Constraints | No readable text |

Rozpory: Action zkazila děj (*comment* → *note*; *company feed* → *his absence* — to je překlad Scene Intent, ne originální Claude still). Kamera žádá insert obrazovky ve face close-upu. „Loses composure“ vs. motion „polite composed smile“.

### Scéna 3 (má být insert telefonu)

| Vrstva | Text |
|---|---|
| Action | Phone screen shows profile with long gap |
| Motion | Static sharp screen; slow pull-back; no reflections obscuring **the feed** |
| Camera | Close on **hiring manager's face** + insert phone (protilehlé) |
| Constraints | No readable text |

Rozpory: scéna obrazovky vs. camera face close-up; feed musí být vidět vs. no readable text.

### Scéna 4

| Vrstva | Text |
|---|---|
| Action | Onboarding continues; attention drifts to phone; how the company is perceived… |
| Motion | Open laptop lid slowly; gaze to phone; **fade to black at end of clip** |
| Camera | Opět face close-up + insert + no rapid editing |
| Constraints | No readable text |

Rozpory: fade to black vs. titulky / střih na další clip; wide shot v motion vs. close-up v camera; identita bez reference.

### Původ každého rozporu

| Rozpor | Původ |
|---|---|
| „phone screen remains legible“ vs. „no readable on-screen text“ | Claude motion_prompt + Visual Identity camera_style **legible**; constraint hardcoded `T2V_PROVIDER_PROMPT_CONSTRAINTS` |
| Insert obrazovky ve face close-upu | `continuity.camera_style` = jeden odstavec na film, kopírovaný do každé scény (`composeTextToVideoProviderPrompt`) |
| Více střihů v jednom klipu | Tentýž camera odstavec („Cuts are deliberate“) |
| Stejná camera všude | Tentýž kód |
| Fade to black | Claude motion sc.4, přeneseno adapterem |
| Stabilní identita bez reference | Claude motion „identities … stable“ |
| Děj/emoce z textu nespolehlivé | Action = Scene Intent (1–2 věty purpose), ne image_prompt |
| Setting dropnutý | 1000 UTF-16: Action + Motion + dlouhá Camera se vejdou; `stillLine` je poslední a `joinIfFits` ho zahodí |

### Proč contradiction cleanup reálné prompty nezastavil

`providerPromptHasContradictoryTextRules` vrací true **jen** když prompt:

- obsahuje `no readable on-screen text` **a zároveň**
- matchuje úzké regexy: `(show\|display\|include\|with) … (readable\|legible) (text\|type\|letters\|numbers)` **nebo** `readable (text\|ui|…) on the (phone|screen|…)`

Reálný text je **„phone screen remains legible“** a **„clean, legible, not dramatised“**.

To **není** `legible text`. To **není** `readable text on the phone`. Gate vrátí **false**. Approve by tento konflikt **neblokoval**.

Test `scripts/check-production-t2v-scene-integrity.ts` check 10 používá vstup *„readable text on the screen“* / *„legible text on the monitor“* — tvary, které `stripNonessentialReadableTextRequests` umí. Test **nepoužívá** produkční frázi `screen remains legible`. Proto testy prošly a produkční prompt ne.

Stripper hledá `legible` jen ve spojení s `text|type|letters|numbers|copy`. Samotné `legible` u screen/feed nechá.

---

## AUDIT 7 — Product Brain a strategie

### Aktuální Product Brain (OVĚŘENO `projects` row; snapshot při generaci NEOVĚŘENO)

Pain points (8): consistent content; multi-platform; no time; **inactive or inconsistent social accounts**; hours every week; running out of ideas; hiring creators expensive; production distracts from business.

Scenario pool (10). Nejméně 6 z 10 je prázdný queue / last post was weeks ago / competitor posted 17 videos / „are they still open because no posts“. Konkrétně:

> „A local gym owner gets a comment on their Facebook page asking if they are still open because there have been no posts in over a month.“

To je sémantický sourozenec Candidate hooku. Brain **není** prázdný o jiných životech zákazníka, ale **vizuálně nejkonkrétnější** situace v poolu je scrollování mrtvého profilu.

`product_is` je služba „URL in → ready-to-post videos“. To svádí každé video k důkazu „váš feed je prázdný, my ho naplníme“.

### Strategie tří běhů (OVĚŘENO)

| Package | pain_point | topic (zkráceno) |
|---|---|---|
| Candidate | Social accounts are inactive or inconsistent | Job candidate researched company night before interview, feed looked closed |
| Pre-Start | stejný | New hire searches company before first day, nothing in three months |
| Tab | stejný | Client Googles before call, last post three months ago |
| Reply (4.) | stejný | Client checks profile before replying to outreach, nothing in eight weeks |

Vše awareness, tiktok reel, `packageCount=1`.

Strategy system: invent **INDEPENDENT** opportunities. Intra-run anti-convergence je mrtvé, když je item jeden. Cross-run vidí memory topics jako jiné věty, ne stejný plot.

Pain Point First: *„The central topic MUST […] dramatize one of the pain points.“* Nejvykreslitelnější pain je inactive accounts → Claude ho bere opakovaně.

**Je Product Brain příliš úzký?** Částečně: má 8 painů, ale scenario pool a nejsnáze filmovatelný pain tlačí do jednoho vizuálního klišé. Chybí vynucená rotace painu.

**Chrání historie jen titulek?** Ano. Topics jsou dlouhé jedinečné věty. Myšlenka je stejná.

**Kde je problém?** Obě vrstvy: Brain (scénáře + dominantní vizuální pain) **a** strategy (packageCount=1 + „same pain is fine if angle differs“ + žádné vizuální fingerprinty ve strategy promptu). Package prompt potom věrně plní špatné zadání.

---

## AUDIT 8 — Raw output vs. finální výstup

Raw Claude JSON **NEOVĚŘENO**. Persistovaný `package_brief` po validaci je nejbližší dostupný „Claude výstup“. CR a T2V plán jsou další transformace.

### Candidate

| Fáze | Hook | Voiceover | Scény | Vizuální originalita | Co se změnilo |
|---|---|---|---|---|---|
| Video Concept | (ještě není hook; arc už obsahuje citát still hiring) | — | visual_direction: glass room, laptop, phone gap, composed | Nízká–střední: silný argument, klišé místo | Claude už zvolil meeting+phone |
| Opening Impact (GPT) | still hiring citát | first sentence = hook | first_image = manager + laptop + phone feed | Kopíruje concept | GPT nevymyslel jiný obraz |
| Content Package (Claude) | stejný (musí) | 80w, still hiring | 4 scény: meeting, face, phone insert, wide | Stejný svět, decentní storyboard | first_image ≈ scene 1 verbatim |
| CR seed | originál beze změny | CS OK-ish „přijímáte“; EN **still open** | Intent zploštěný na purpose | Ztráta konkrétna | Round-trip + Scene Intent |
| T2V adapter | integrity stále still hiring | TTS by četl still open | Action=intent, Camera=globální, Setting drop | Nejhorší | Compose + constraint |

### Pre-Start

| Fáze | Hook | VO | Scény | Originalita | Změna |
|---|---|---|---|---|---|
| Concept | contrast reassurance/doubt | checklist 5 kroků | ložnice + phone grids | O něco vyšší místo, stejná idea | Claude |
| Package | stejný | doslovný checklist | 5 screen-led scén | Literal VO vizualizace | Claude |
| CR EN | feed→profile, reassurance→confidence | zjemnění | intents | Mírná ztráta | Překlad |
| Adapter | — | — | (neauditováno do stejné hloubky; stejný compose) | — | — |

### Tab

| Fáze | Hook | VO | Scény | Originalita | Změna |
|---|---|---|---|---|---|
| Concept | otázka před hovorem | tab-opening sequence | screen-native, no faces | Jiný vizuální styl (UI, bez tváře), stejná idea | Claude |
| Package | stejný | 80w | split calendar, search, scroll, phone down, empty inbox | Doslovné | Claude |
| CR EN | drobné posuny (follow-up→message) | | | | Překlad |
| T2V plán (starý) | | | scene 0 provider_prompt: **český** „Výrazný vizuál podporující: {hook}“ + „Immediate attention, bold motion“ | Storyboard **není** v provider promptu | Legacy sentence/generic planner (`origin` null). Toto je historický adapter, ne canonical_storyboard. |

**Jednoznačně:** Claude (Concept + Package) **už vytvořil nudu stejné myšlenky**. Systém ji **nezachránil** a u Candidate **poškodil význam** + **Runway konkrétnost**. U Tab legacy T2V plán storyboard téměř zahodil. Canonical adapter Candidate storyboard nezahodil celý (motion zůstává), ale Action/Camera ho znehodnotily.

Není pravda, že Claude vymyslel divokou metaforu a pipeline ji seřízla na telefon. Telefon byl v `first_image` a `visual_direction` od začátku, protože strategie chtěla „look up the silent feed“.

---

## AUDIT 9 — Použitelnost Creative Review (jen hodnocení)

Co operátor vidí u T2V (`CreativeReviewPackagePanel`):

- Český VO + badge **EN: Current**
- Scéna: „Co se ve scéně děje (čeština)“, read-only EN, VO excerpt, motion text, **celý Runway prompt v `<pre>`**, SFX, přestavět scénu, utf-16 1000

**Rozumí, co může změnit?** Částečně. Copy VO a český intent ano. Neví, že Current EN může lhát. Neví, že Runway Action není jeho still, ale zploštělý intent.

**Vidí kreativní scénu, nebo techniku?** Hlavně techniku: provider prompt, utf-16, rebuild, prompt contract, binding. Chybí „je tento námět vůbec zajímavý?“

**Pozná, že změna vyžaduje přestavbu?** Banner `visual_rebuild_status` ano, pokud změní děj. Změna celého námětu scénu po scéně **není** podporovaná jako jeden akt.

**Musí kontrolovat technické prompty, které měl hlídat systém?** Ano. Legible vs. no readable text, globální camera, fade to black — to má chytit gate. Operátor to čte v `<pre>`.

**Lze opravit nudný námět scénu po scéně?** Nerealisticky. Všechny 4 scény jsou jedna myšlenka. Přestavba scény volá Claude na still/motion, **ne** na nový concept. Operátor by musel ručně vymyslet jiný film.

**Nejúčinnější jediný lidský zásah, když je celý návrh nudný:** **Reject / Regenerovat celý package** (lépe: nový strategy item s jiným painem a situací). Ne editovat scény.

**Má existovat „Vytvořit zajímavější alternativu celého návrhu“?** Funkčně ano — jako **Regenerate whole concept** (1 Claude, EN autorita), ne jako ruční editor promptů. Scene-level UI je užitečné až když je námět dobrý.

---

## Mapa kreativního toku (shrnutí)

```
Product Brain (pain + scenarios heavy on dead feeds)
    ↓
Strategy Claude  [packageCount=1]  → stejný pain, parafrázovaná situace
    ↓
Video Concept Claude  [soft fingerprint avoid]  → pořád phone/feed, protože topic to vyžaduje
    ↓
Opening Impact GPT  → hook + first_image (doslovný)
    ↓
Visual Identity  [deterministická kopie]  → composed / unhurried / legible insert se stane zákonem
    ↓
Content Package Claude  [hook/identity locked, 1 JSON na vše]  → 4–5 bezpečných scén
    ↓
Scene Intent Claude  → abstraktní purpose
    ↓
EN→CS→EN Claude  → význam může uhnout; Current = čerstvé, ne správné
    ↓
composeTextToVideoProviderPrompt  → Action=intent, Camera=film-level, drop Setting, constraint
    ↓
T2V repetition  [text hook only]  → passed
```

---

## Root-cause strom

```
[ROOT] Strategy + Brain konvergují na „někdo zkontroluje tichý profil“
 ├── packageCount=1 ⇒ intra-run diversity je no-op
 ├── Pain Point First + nejsnáze filmovatelný pain
 ├── Scenario pool (last post / still open / empty queue)
 ├── Strategy nevidí vizuální fingerprinty
 └── Anti-rep porovnává string hook/topic, ne myšlenku
        ↓
[STEM] Claude Concept/Package věrně vizualizuje zadání
 ├── GPT Opening zamkne hook i first_image
 ├── Identity zamkne composed/unhurried/legible phone insert
 ├── Package nesmí vyměnit hook; příklady motion = slow push-in / nod
 └── Jeden JSON (captions+storyboard) → bezpečný doslovný obraz VO
        ↓
[BRANCH A] Round-trip CS→EN bez originálu     → still hiring → still open
[BRANCH B] Scene Intent zploští still          → Runway Action je esej
[BRANCH C] Adapter Camera = celý film          → insert+close-up v každé scéně
[BRANCH D] Constraint regex příliš úzký        → legible screen projde
```

**Základní problémy (4):**  
1. Strategie/Brain smyčka stejné situace.  
2. Produkční EN vzniká z češtiny, ne z originálu.  
3. T2V repetition není sémantická.  
4. Runway compose používá špatnou Action/Camera a nechytí reálný textový konflikt.

**Následky:** podobné hooky jinými slovy; telefon/notebook/feed; pomalý push-in; quiet concern; operátor čte technické prompty; fade to black; dropnutý image_prompt.

---

## Nákladové dopady

| Položka | Evidence |
|---|---|
| Package generation (3 runy) | ~$0.20 každý (telemetrie) |
| CR překlady | 1 VO loc + 1 VO EN + 2×N scene loc/EN; Candidate N=4 → 10 malých Claude callů |
| JSON Repair | 1× gpt-4o-mini na Candidate loc |
| Social image | $0.042 / package (`gpt-image-1`) |
| ElevenLabs / Runway | **$0** — žádný paid T2V render |
| Regenerace stejné rodiny | každá další ~$0.20 + čas operátora, stejný výsledek |
| Špatný launch Candidate | TTS by namluvil **still open**; Runway by dostal rozporné prompty; 4 klipy by stejně vypadaly jako předchozí dva návrhy |

Nejvyšší skrytý náklad je **lidský čas v Creative Review** nad návrhem, který se měl zahodit na úrovni strategie.

---

## Povinný verdikt

1. **Product Brain?** Částečně. Není jediná příčina, ale scenario pool a pain „inactive accounts“ tlačí vizuál do mrtvého profilu. Jiné painy existují a systém je u T2V ignoruje.
2. **Strategie?** **Ano — hlavní příčina nudy a opakování.** Čtyři T2V items, jeden pain, jedna situace, `packageCount=1`.
3. **Claude system/user prompt?** **Ano — hlavní příčina, že nuda přežije do storyboardu.** Hook/identity lock, doslovná scéna 1, příklady slow push-in, jeden obří JSON.
4. **Model Claude?** Ne jako primární. Dělá to, oč je žádán, na úrovni „competent corporate quiet“. Není důkaz, že by bez těchto locků nemohl vymyslet lepší metaforu — u těchto zadání to neudělal.
5. **Deterministický postprocessing?** Ano pro Runway zploštění a nechycené rozpory. Ne pro vznik námětu.
6. **Překlad?** **Ano pro významovou chybu.** Ne pro nudu.
7. **T2V adapter?** **Ano pro rozporné / stejné camera prompty a ztrátu stillu.** Ne pro opakování telefonu.
8. **Absence sémantické anti-repetition?** **Ano — proto tři podobné běhy prošly.**
9. **Kolik je základ, kolik následky?** 4 základní (strategie/brain smyčka; EN z CS; text-only anti-rep; špatný compose/gate). Zbytek jsou následky.
10. **Nejmenší změna s největším dopadem?** Na strategii: při `packageCount=1` **zakázat** další item se stejným painem *a* stejnou situací „outsider otevře tichý profil / feed / tab“, dokud se neprotočí jiný pain. Bez toho regenerace package znovu natočí tentýž film.
11. **Co je zbytečné opravovat dřív?** Scene-level UI, ruční psaní Runway promptů, další Benchmark Lab, kosmetika continuity. Také dolaďování motion slovíček, dokud strategie vrací stejný námět.
12. **Umí systém s minimální ruční prací tvořit zajímavá videa?** **Teď ne.** U T2V fenrik Studio opakuje jednu myšlenku. Zajímavost by vyžadovala buď jiný strategy item, nebo ruční vynález celého filmu.
13. **Lze bezpečně spustit aktuální placený Candidate package?** **Ne.** Důvody: produkční VO „still open“; rozporné Runway prompty, které gate neblokuje; `plan_sync_status=stale`; run `cancelled`; vizuálně stejná rodina jako předchozí dva neschválené běhy.
14. **Proběhl při auditu placený nebo síťový AI request?** **Ne.** Pouze read-only SQL na produkční DB a čtení kódu.
15. **Změnil audit systém nebo produkční data?** **Ne.** Jediný výstup je tento Markdown soubor.

---

## Tři prioritizované opravy (návrh, ne implementace)

### 1. Nezbytná základní oprava — zastavit smyčku na strategii + držet EN autoritu

Jeden zásah se dvěma nutnými částmi, jinak se nuda nebo význam vrátí:

**A. Strategy (1 Claude, žádný nový produkt):** Když se plánuje production run, recent topics **a** vizuální fingerprinty jsou tvrdé „do not ship another silent-profile lookup“. Vynutit jiný `pain_point` než poslední T2V, nebo jinou situaci než „někdo otevře Instagram/LinkedIn/TikTok a vidí stáří posledního postu“. `packageCount=1` musí rotovat **napříč běhy**, ne jen uvnitř dávky.

**B. Produkční angličtina = `original_ai` (project language `en`).** Čeština je pracovní overlay. Back-translation **nesmí** přepsat TTS. Pokud operátor změní význam v CS, překlad do EN musí dostat **originál + češtinu** a gate musí hlásit významový posun, ne „Current“.

Bez A se bude regenerovat stejné video. Bez B se znovu zlomí hiring/open.

Žádné extra hodnoticí laby. Výsledek pro operátora: **Approve / Regenerate / Reject** na úrovni celého návrhu.

### 2. Druhá oprava — jen pokud má jasný přínos: jeden autoritativní vizuální výstup

Až bude námět jiný: Runway `Action` = schválený **image_prompt / still**, ne Scene Intent esej. `Camera` jen z `motion_prompt` dané scény, ne film-level odstavec. Gate musí chytit `legible` u screen/feed, nejen `legible text`. Setting nesmí vypadnout ve prospěch globální kamery.

To opraví špatné klipy **dobrého** námětu. U současného Candidate by to pořád byl film o telefonu na stole.

### 3. Volitelná později

Sémantická anti-repetition na myšlenku / opening prop / location (1 malý klasifikátor nebo overlap na fingerprint tokens — fingerprints už existují a teď jsou jen soft). Až potom dává smysl tlačítko „zajímavější alternativa celého návrhu“ = 1× Video Concept+Package regenerate se stejným strategy slotem zakázaným k parafrázi.

Neopravovat: ruční editor technických promptů, další scény v UI, Benchmark Lab.

---

## Doporučení ke spuštění

**Nespouštět** package `ed233823-3e56-46a2-b591-ffe895e52b92` jako placený T2V.

Nejprve jiný strategy item (jiný pain, jiná situace). Současný návrh by i po opravě promptů zůstal čtvrtým filmem o tichém profilu.

---

## Audit hygiene

- Žádný kód, prompt, flag, DB write.
- Žádný Claude / OpenAI / ElevenLabs / Runway HTTP.
- Žádný nový production run.
- Žádný Canvas.
- Výstup: `PRODUCTION_T2V_CREATIVE_QUALITY_ROOT_CAUSE_AUDIT.md`.
