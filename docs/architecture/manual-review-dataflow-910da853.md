# Manual Review Data-Flow Audit — Package 910da853

**Package:** `910da853-4f62-4cad-ab00-071c3a73af45`  
**Title:** The In-House Quarter  
**Run:** `88e3097d-9d4c-4c54-ae53-6eb11afcdb59`  
**Project:** `163c1822-ad30-4cee-8826-dfacd9c188b9`  
**Scope:** Read-only forensic audit. No code or data modified.  
**Sources:** Supabase rows, `video_jobs.input` / `output`, Whisper SRT, running code.

| Metric | Value |
|---|---|
| Root-cause confidence | 99% |
| TTS chars = mixed VO | 525 |
| Whisper words = mixed VO | 89 |
| `opening_prepended` stamp | `true` |

## First incorrect state

**File:** `lib/creative-review/rebuildCreativePackage.ts`  
**Function:** `rebuildCreativePackageForVideo`  
**Timestamp:** `2026-08-12T13:19:43.791Z`  
**Actor:** editor

Scene loop runs first: `composeRebuiltImagePrompt` (lines 113–157, invoked 601–619) concatenates frozen original Opening Impact + Visual Identity + Video Concept onto the editor Czech CREATIVE INTENT.

Then `alignOpeningVoiceover` (lines 698–707) prepends original English `first_spoken_sentence` onto `creative_review.voiceover.final_approved`.

Stored stamp: `presentation_generation.creative_rebuild.opening_prepended = true`.

SQL proof: `package_brief.voiceover_text === opening + " " + final_approved` (525 chars). That mixed string is what TTS spoke and what Whisper wrote into the SRT.

---

## 1. Timeline

All times UTC, 2026-08-12.

| Time UTC | Step | Function | What was stored |
|---|---|---|---|
| `00:11:45`–`00:13:23` | Generate (Video Concept → Opening Impact → Visual Identity → Content Package) | content pipeline | English VO, English hook, spreadsheet `visual_scenes`, original `image_prompts` |
| `00:13:23.450` | Generate Manual Review seed | `seedCreativeReview` + persist | history event `seed` v1. `original_ai` = English VO. `localized_edit` = auto-CS translation of original. `final_approved` = that CS translation. Scene intents original + auto-CS. |
| `00:14:03.773` | Package row insert | Persist Package | `content_packages` created. `content_items.body` = original English VO. Never updated after this. |
| `12:37:17.294` | Creative Review Save | `commitCreativeReviewSave` → `persistCreativeReview` | history event `save` v2. Editor overwrote `voiceover.localized_edit` with Czech rewrite. Scene `localized_edit` overwritten with Grim Reaper / split-screen Czech descriptions. `final_approved` cleared to empty. `package.voiceover_text` NOT written (`creative_review` only). |
| `12:37:36.389` | Translate (auto after save) | `commitCreativeReviewTranslate` | history event `translate` v3. `final_approved` = `localized_edit` (Czech editor text). `english_preview` generated. `english_confirmed` = true. |
| `12:39:53.503` | Approve | `commitCreativeReviewApprove` | history event `approve` v4. `status=approved`. Voiceover and scene `localized_edit` unchanged from translate. |
| `13:19:43.791` | Continue Generation + Creative Rebuild | `continueCreativeReviewGeneration` → `rebuildCreativePackageForVideo` | **FIRST DIVERGENCE.** history events `creative_rebuild_completed` v5 + `continue_generation_started` v6. `package.voiceover_text` and `subtitles` become mixed. `visual_scenes` / `image_prompts` replaced with rebuilt prompts. `opening_prepended=true`. |
| `13:19:52.655` | Video job 1 created + dispatched | `ensureVideoJobForPackage` → `buildVideoJobInput` → `claimAndDispatchVariantVideoJob` | job `12048376-4025-42e5-bda2-cd0f22c7dc74`. `input.voiceover_text` = mixed. `input.scenes[].image_prompt` = rebuilt (MD5 match to package). |
| `13:24:18` → `13:28:28` | Worker 1 (failed) | `runVideoJob` | TTS+Whisper ran on mixed text; image generation timed out. No MP4. |
| `22:43:16.107` | Retry job created | `runRetryVideoJob` | job `48e2b85e-8351-4532-bdf2-8607b02dd3a7`. `retry_of=12048376…`. Copied failed input verbatim. voiceover MD5 `cadb7f5d7ca766a6c87a1de7fd7eb7a1` identical. No voiceover override. |
| `22:43:17` → `22:52:43` | Worker 2 (completed) | `runVideoJob` | TTS 525 chars / 39.36s. Whisper 89 words, language=czech, `subtitle_source=whisper`. 5 images generated. MP4 persisted. `package.updated_at=22:52:43.635` (artifact callback, not a VO rewrite). |

---

## 2. Voiceover lineage — exact stored values

SQL: `mixed_equals_opening_plus_fa = true` · `mixed_len = 525` · `final_approved_len = 461` · `original_ai_len = 438` · `mixed_words = 89` · TTS `prompt_characters = 525` · TTS `input_size_bytes = 575` · `whisper_word_count = 89`

### package.voiceover_text at original generation (`00:13:23` / `00:14:03`)

Source: `creative_review.voiceover.original_ai` (unchanged through all later events) and `content_items.body` (created `00:14:04`, `updated_at` still `00:14:04`). Seed copies `package.voiceover_text` → `original_ai`. Save/translate/approve write `creative_review` only.

```
The belief that handling content in-house saves time is a myth. Here is what the ledger actually shows. One quarter. Two people. Forty-minute planning calls that produced no brief. Caption drafts through three revision rounds. Friday filming blocks lost to client calls. Five sprints. The content row never moved. Total hours spent: substantial. Posts published: a number that makes the hourly cost per post very uncomfortable to look at.
```

### creative_review.original_ai (all history events, never overwritten)

```
The belief that handling content in-house saves time is a myth. Here is what the ledger actually shows. One quarter. Two people. Forty-minute planning calls that produced no brief. Caption drafts through three revision rounds. Friday filming blocks lost to client calls. Five sprints. The content row never moved. Total hours spent: substantial. Posts published: a number that makes the hourly cost per post very uncomfortable to look at.
```

### seed localized_edit + final_approved (`00:13:23.450`, actor=system)

Auto-CS translation of `original_ai`. Not the editor rewrite.

```
Přesvědčení, že správa obsahu vlastními silami šetří čas, je mýtus. Tady je to, co skutečně ukazují čísla. Jedno čtvrtletí. Dva lidé. Čtyřicetminutové plánovací hovory, které nevyprodukovaly jediný brief. Návrhy popisků procházející třemi koly revizí. Páteční bloky natáčení ztracené kvůli hovorům s klienty. Pět sprintů. Řádek s obsahem se nepohnul. Celkový počet strávených hodin: značný. Počet zveřejněných příspěvků: číslo, které způsobuje, že cena za příspěvek na hodinu je velmi nepříjemná na pohled.
```

### save localized_edit (`12:37:17.294`, actor=editor) — previous vs new

**Previous (seed CS)**

```
Přesvědčení, že správa obsahu vlastními silami šetří čas, je mýtus. Tady je to, co skutečně ukazují čísla. Jedno čtvrtletí. Dva lidé. Čtyřicetminutové plánovací hovory, které nevyprodukovaly jediný brief. Návrhy popisků procházející třemi koly revizí. Páteční bloky natáčení ztracené kvůli hovorům s klienty. Pět sprintů. Řádek s obsahem se nepohnul. Celkový počet strávených hodin: značný. Počet zveřejněných příspěvků: číslo, které způsobuje, že cena za příspěvek na hodinu je velmi nepříjemná na pohled.
```

**New (editor rewrite). `final_approved` cleared to `""`**

```
Čas. To je něco, co už nikdy nevrátíme zpátky.
Co si vyberete?
Pivo s kamarádem, nebo řešit s kolegou do půlnoci, co dát na Instagram, a stejně nic nevymyslet?
Příjemný večer s partnerkou pod dekou, nebo další brainstorming v kanceláři, kde už všechny mozky dávno vyhořely?
Hrát si s dítětem, nebo poslouchat další návrhy obsahu od kolegů, kteří už stejně nic nového nevymyslí?
Čas je mnohem cennější než peníze.
Nemarněte ho na něco, co může udělat někdo jiný.
```

Function: `commitCreativeReviewSave`. `english_preview` set null. `english_confirmed=false`. `package.voiceover_text` unchanged (still original English).

### english_preview after translate (`12:37:36.389`, actor=editor)

```
Time. It's something we can never get back.
What will you choose?
A beer with a friend, or staying up until midnight with a colleague trying to figure out what to post on Instagram — and coming up with nothing?
A cozy evening with your partner on the couch, or another brainstorming session in the office where everyone burned out long ago?
Playing with your child, or sitting through more content suggestions from colleagues who have no new ideas left anyway?
Time is far more valuable than money.
Don't waste it on something someone else can do for you.
```

### final_approved after translate (`12:37:36.389`) — this is the approved spoken text

Function: `commitCreativeReviewTranslate` sets `voiceover.final_approved = voiceover.localized_edit`. Approve at `12:39:53.503` copies the same value. Rebuild history events keep it unchanged.

```
Čas. To je něco, co už nikdy nevrátíme zpátky.
Co si vyberete?
Pivo s kamarádem, nebo řešit s kolegou do půlnoci, co dát na Instagram, a stejně nic nevymyslet?
Příjemný večer s partnerkou pod dekou, nebo další brainstorming v kanceláři, kde už všechny mozky dávno vyhořely?
Hrát si s dítětem, nebo poslouchat další návrhy obsahu od kolegů, kteří už stejně nic nového nevymyslí?
Čas je mnohem cennější než peníze.
Nemarněte ho na něco, co může udělat někdo jiný.
```

### alignOpeningVoiceover → package.voiceover_text (`13:19:43.791`) — THE MIX

**Previous (`package.voiceover_text` before rebuild)**

```
The belief that handling content in-house saves time is a myth. Here is what the ledger actually shows. One quarter. Two people. Forty-minute planning calls that produced no brief. Caption drafts through three revision rounds. Friday filming blocks lost to client calls. Five sprints. The content row never moved. Total hours spent: substantial. Posts published: a number that makes the hourly cost per post very uncomfortable to look at.
```

**Input opening (`anchors.openingImpact.first_spoken_sentence`)**

```
The belief that handling content in-house saves time is a myth.
```

**Input voiceover (`review.voiceover.final_approved`)**

```
Čas. To je něco, co už nikdy nevrátíme zpátky.
Co si vyberete?
Pivo s kamarádem, nebo řešit s kolegou do půlnoci, co dát na Instagram, a stejně nic nevymyslet?
Příjemný večer s partnerkou pod dekou, nebo další brainstorming v kanceláři, kde už všechny mozky dávno vyhořely?
Hrát si s dítětem, nebo poslouchat další návrhy obsahu od kolegů, kteří už stejně nic nového nevymyslí?
Čas je mnohem cennější než peníze.
Nemarněte ho na něco, co může udělat někdo jiný.
```

**New stored `package.voiceover_text` AND `package.subtitles` AND `video_jobs.input.voiceover_text` (both jobs)**

```
The belief that handling content in-house saves time is a myth. Čas. To je něco, co už nikdy nevrátíme zpátky.
Co si vyberete?
Pivo s kamarádem, nebo řešit s kolegou do půlnoci, co dát na Instagram, a stejně nic nevymyslet?
Příjemný večer s partnerkou pod dekou, nebo další brainstorming v kanceláři, kde už všechny mozky dávno vyhořely?
Hrát si s dítětem, nebo poslouchat další návrhy obsahu od kolegů, kteří už stejně nic nového nevymyslí?
Čas je mnohem cennější než peníze.
Nemarněte ho na něco, co může udělat někdo jiný.
```

Function: `alignOpeningVoiceover` in `lib/content-pipeline/alignOpeningVoiceover.ts` lines 49–60. Czech text does not start with the English opening, so `prepended=true`, result = opening + space + vo. Caller: `rebuildCreativePackage.ts` lines 698–707. Also sets `package.hook` = opening (same English sentence).

### buildVideoJobInput → video_job.input.voiceover_text

`lib/ai/workflows/packageShared.ts` line 451: `voiceover_text: pkg.voiceover_text`. Does not read `creative_review.final_approved`. Job `12048376…` and retry `48e2b85e…` both store the mixed string. MD5 `cadb7f5d7ca766a6c87a1de7fd7eb7a1`.

```
The belief that handling content in-house saves time is a myth. Čas. To je něco, co už nikdy nevrátíme zpátky.
Co si vyberete?
Pivo s kamarádem, nebo řešit s kolegou do půlnoci, co dát na Instagram, a stejně nic nevymyslet?
Příjemný večer s partnerkou pod dekou, nebo další brainstorming v kanceláři, kde už všechny mozky dávno vyhořely?
Hrát si s dítětem, nebo poslouchat další návrhy obsahu od kolegů, kteří už stejně nic nového nevymyslí?
Čas je mnohem cennější než peníze.
Nemarněte ho na něco, co může udělat někdo jiný.
```

### Worker TTS + Whisper SRT (actually rendered)

`video-worker/jobRunner.ts` `generateValidatedVoiceover` uses `spec.voiceover_text` from `payload.input`. Telemetry: `started_at` `2026-08-12T22:43:17.373Z`, model `gpt-4o-mini-tts`, `prompt_characters=525`, `language_detected=czech`, `match_ratio=0.9438202247191011`. `subtitle_source=whisper`.

```
1
00:00:00,000 --> 00:00:01,360
The belief that

2
00:00:01,360 --> 00:00:02,800
handling content in-house

3
00:00:02,800 --> 00:00:03,820
saves time is

4
00:00:03,820 --> 00:00:05,140
a myth.

5
00:00:05,140 --> 00:00:06,140
Čas.

6
00:00:06,140 --> 00:00:07,140
To je něco,

7
00:00:07,140 --> 00:00:08,140
co už nikdy

8
00:00:08,140 --> 00:00:09,640
nevrátíme zpátky.

9
00:00:09,640 --> 00:00:10,880
Co si vyberete?

10
00:00:10,880 --> 00:00:11,880
Pivo s kamarádem,

11
00:00:11,880 --> 00:00:12,880
nebo řešit s

12
00:00:12,880 --> 00:00:14,280
kolegou do půlnoci,

13
00:00:14,280 --> 00:00:15,280
co dát na

14
00:00:15,280 --> 00:00:16,280
Instagram, a stejně

15
00:00:16,280 --> 00:00:17,960
nic nevymyslet?

16
00:00:17,960 --> 00:00:18,960
Příjemný večer s

17
00:00:18,960 --> 00:00:20,080
partnerkou pod dekou,

18
00:00:20,080 --> 00:00:21,760
nebo další brainstorming

19
00:00:21,760 --> 00:00:22,920
v kanceláři,

20
00:00:22,920 --> 00:00:23,920
kde už všechny

21
00:00:23,920 --> 00:00:25,660
mozky dávno vyhořely?

22
00:00:25,660 --> 00:00:26,660
Hrát si s

23
00:00:26,660 --> 00:00:27,680
dítětem, nebo poslouchat

24
00:00:27,680 --> 00:00:28,980
další návrhy obsahu

25
00:00:28,980 --> 00:00:29,980
od kolegů,

26
00:00:29,980 --> 00:00:31,040
kteří už stejně

27
00:00:31,040 --> 00:00:33,420
nic nového nevymyslí?

28
00:00:33,420 --> 00:00:34,760
Čas je mnohem

29
00:00:34,760 --> 00:00:36,020
cennější než peníze.

30
00:00:36,020 --> 00:00:37,020
Nemarněte ho na

31
00:00:37,020 --> 00:00:38,020
něco, co může

32
00:00:38,020 --> 00:00:39,020
udělat někdo jiný.
```

---

## 3. Scene lineage

`director_notes` is empty string on every scene in every history event. After rebuild, `package.visual_scenes` is only `source` + `image_prompt`. Original production `image_prompt` strings were overwritten; no `content_versions` snapshot exists. Original scene descriptions survive in `creative_review.intent.original`.

Byte-identical across `package.visual_scenes`, `package.image_prompts`, job `12048376` `input.scenes`, job `48e2b85e` `input.scenes`, and `output.render_spec.scenes` `image_prompt_len`. CREATIVE INTENT tail === `localized_edit` (SQL `intent_equals_prompt_tail = true`).

Opening Impact `first_image` (frozen original, injected into scene 1):

```
A clean spreadsheet on a monitor, displaying two columns: 'ACTIVITY' and 'TIME SPENT'. The first row populates with 'Planning call for content strategy' and the time '40 minutes' appears next to it, followed by a slow scroll revealing more entries.
```

### Scene 1 — prompt 5668 chars · MD5 `592dea1c1c7f7dbf797f11ed9d4b17f7`

**original visual_scene / intent.original (seed `00:13:23`)**

```
A simple time-tracking log begins with a single content task and its duration. This sets up the idea that in-house content work is measurable — and the numbers are about to add up.
```

**creative_review.intent.localized_edit after save `12:37:17` (editor)**

```
Smrtka v černém plášti stojí na tmavém pozadí a drží velkou kosu. Místo toho, aby se dívala na člověka, dívá se na velké náramkové hodinky na své kostnaté ruce, jako by kontrolovala čas. Atmosféra je dramatická, ale lehce ironická. Důraz je na hodinky a motiv času.
```

**english_preview after translate `12:37:36`**

```
Death in a black cloak stands against a dark background, holding a large scythe, but instead of looking at a person, it gazes at a large wristwatch on its bony hand as if checking the time. The mood is dramatic yet gently ironic, with the focus on the watch and the theme of time.
```

**rebuild output / package.visual_scenes / package.image_prompts / video_job.input / worker**

Scene 1 prompt begins with OPENING IMPACT `first_image` (original spreadsheet).

```
OPENING IMPACT (authoritative cold open — lead with this first_image):
A clean spreadsheet on a monitor, displaying two columns: 'ACTIVITY' and 'TIME SPENT'. The first row populates with 'Planning call for content strategy' and the time '40 minutes' appears next to it, followed by a slow scroll revealing more entries.
opening_emotion: Quietly revealing, as if sharing a hidden truth that challenges a common assumption.
pacing: Deliberate and steady, allowing each line item to appear with a slight pause, emphasizing the growing tally of hours.
VISUAL IDENTITY:
- art_direction: Screen-native audit aesthetic. The primary visual surface is a shared document or spreadsheet — clean rows, two columns: ACTIVITY and TIME SPENT. …
- opening_first_image: A clean spreadsheet on a monitor, displaying two columns: 'ACTIVITY' and 'TIME SPENT'. The first row populates with 'Planning call for content strategy' and the time '40 minutes' appears next to it, followed by a slow scroll revealing more entries.
VIDEO CONCEPT (frozen anchor — do not invent a new concept):
- title: The In-House Quarter
…
VISUAL CONSISTENCY (mandatory):
…
SCENE 1 (IMAGE) — CREATIVE INTENT:
Smrtka v černém plášti stojí na tmavém pozadí a drží velkou kosu. Místo toho, aby se dívala na člověka, dívá se na velké náramkové hodinky na své kostnaté ruce, jako by kontrolovala čas. Atmosféra je dramatická, ale lehce ironická. Důraz je na hodinky a motiv času.
```

### Scene 2 — prompt 5360 chars · MD5 `8c50a5bfbf43efabcdc819215a7aa5cc`

**original visual_scene / intent.original (seed `00:13:23`)**

```
The log fills with tasks — repeated drafts, lost filming time, format debates — and a running total quietly climbs. The hidden cost of doing content in-house starts to become visible.
```

**creative_review.intent.localized_edit after save `12:37:17` (editor)**

```
Obraz je diagonálně rozdělen na dvě poloviny.
V horní části sedí stejný zakladatel jako v dalších scénách v útulné hospodě s kamarádem. Oba se smějí, připíjejí si pivem a očividně si užívají společný večer.
Ve spodní části sedí tentýž zakladatel pozdě večer v kanceláři u pracovního stolu s kolegou. Na stole leží notebook, hrnky od kávy a poznámky. Oba vypadají unaveně a bezradně, snaží se vymyslet obsah na sociální sítě, ale nikam se neposouvají.
Stejný člověk musí být zobrazen v obou částech obrazu.
```

**english_preview after translate `12:37:36`**

```
The same founder appears in two contrasting halves of the image: relaxed and laughing with a friend over beers at a cozy pub, and late at night in the office, exhausted and stuck trying to come up with social media content with a colleague.
```

**rebuild output**

Prompt begins with VISUAL IDENTITY (original spreadsheet `art_direction`).

```
VISUAL IDENTITY:
- art_direction: Screen-native audit aesthetic. The primary visual surface is a shared document or spreadsheet — clean rows, two columns: ACTIVITY and TIME SPENT. …
- opening_first_image: A clean spreadsheet on a monitor, displaying two columns: 'ACTIVITY' and 'TIME SPENT'. The first row populates with 'Planning call for content strategy' and the time '40 minutes' appears next to it, followed by a slow scroll revealing more entries.
VIDEO CONCEPT (frozen anchor — do not invent a new concept):
- title: The In-House Quarter
…
VISUAL CONSISTENCY (mandatory):
…
SCENE 2 (IMAGE) — CREATIVE INTENT:
Obraz je diagonálně rozdělen na dvě poloviny.
V horní části sedí stejný zakladatel jako v dalších scénách v útulné hospodě s kamarádem. Oba se smějí, připíjejí si pivem a očividně si užívají společný večer.
Ve spodní části sedí tentýž zakladatel pozdě večer v kanceláři u pracovního stolu s kolegou. Na stole leží notebook, hrnky od kávy a poznámky. Oba vypadají unaveně a bezradně, snaží se vymyslet obsah na sociální sítě, ale nikam se neposouvají.
Stejný člověk musí být zobrazen v obou částech obrazu.
```

### Scene 3 — prompt 5311 chars · MD5 `ae2dccb0627512f7e8a0c38b992f7a8c`

**original visual_scene / intent.original (seed `00:13:23`)**

```
A task board shows everything completed except one item: posting on social, carried forward again and again. The content work keeps getting pushed while everything else gets done.
```

**creative_review.intent.localized_edit after save `12:37:17` (editor)**

```
Obraz je opět diagonálně rozdělen.
V horní části sedí stejný zakladatel v zasedací místnosti. Kolem stolu sedí několik unavených kolegů. Na stole jsou prázdné hrnky od kávy, papíry a tabule plná přeškrtnutých nápadů. Všichni vypadají vyčerpaně a brainstorming očividně nikam nevede.
Ve spodní části je útulná ložnice. Pod dekou leží muž a žena, jsou vidět pouze jejich chodidla. V místnosti svítí teplé světlo lampičky a atmosféra působí klidně a příjemně.
```

**english_preview after translate `12:37:36`**

```
The image is split diagonally into two contrasting worlds: above, the same founder sits exhausted in a boardroom surrounded by tired colleagues, empty coffee cups, and a whiteboard full of crossed-out ideas going nowhere; below, a couple rests peacefully in a cozy bedroom, their feet visible beneath the covers in the warm, gentle glow of a bedside lamp.
```

**rebuild output**

```
VISUAL IDENTITY:
- art_direction: Screen-native audit aesthetic. The primary visual surface is a shared document or spreadsheet — clean rows, two columns: ACTIVITY and TIME SPENT. …
- opening_first_image: A clean spreadsheet on a monitor, displaying two columns: 'ACTIVITY' and 'TIME SPENT'. The first row populates with 'Planning call for content strategy' and the time '40 minutes' appears next to it, followed by a slow scroll revealing more entries.
VIDEO CONCEPT (frozen anchor — do not invent a new concept):
- title: The In-House Quarter
…
VISUAL CONSISTENCY (mandatory):
…
SCENE 3 (IMAGE) — CREATIVE INTENT:
Obraz je opět diagonálně rozdělen.
V horní části sedí stejný zakladatel v zasedací místnosti. Kolem stolu sedí několik unavených kolegů. Na stole jsou prázdné hrnky od kávy, papíry a tabule plná přeškrtnutých nápadů. Všichni vypadají vyčerpaně a brainstorming očividně nikam nevede.
Ve spodní části je útulná ložnice. Pod dekou leží muž a žena, jsou vidět pouze jejich chodidla. V místnosti svítí teplé světlo lampičky a atmosféra působí klidně a příjemně.
```

### Scene 4 — prompt 5312 chars · MD5 `a58720accb14fef88fad3b7eeca96249`

**original visual_scene / intent.original (seed `00:13:23`)**

```
Two stark numbers sit side by side — hours spent versus posts published. The contrast makes the inefficiency impossible to ignore.
```

**creative_review.intent.localized_edit after save `12:37:17` (editor)**

```
Obraz je rozdělen přesně na dvě poloviny.
V horní části si stejný zakladatel hraje se svým dítětem na dětském hřišti. Oba se smějí, mají radost a věnují si plnou pozornost.
Ve spodní části sedí tentýž zakladatel znuděně u kancelářského stolu. Kolega vedle něj nadšeně gestikuluje a vysvětluje další nápad na obsah. Zakladatel se dívá jinam a působí otráveně, jako by věděl, že tato porada nikam nepovede.
Stejný člověk musí být použit v obou částech obrazu.
```

**english_preview after translate `12:37:36`**

```
A founder experiences two contrasting moments: fully present and joyful while playing with his child at a playground, versus visibly disengaged and bored during an office meeting where a colleague eagerly pitches a new content idea.
```

**rebuild output**

```
VISUAL IDENTITY:
- art_direction: Screen-native audit aesthetic. The primary visual surface is a shared document or spreadsheet — clean rows, two columns: ACTIVITY and TIME SPENT. …
- opening_first_image: A clean spreadsheet on a monitor, displaying two columns: 'ACTIVITY' and 'TIME SPENT'. The first row populates with 'Planning call for content strategy' and the time '40 minutes' appears next to it, followed by a slow scroll revealing more entries.
VIDEO CONCEPT (frozen anchor — do not invent a new concept):
- title: The In-House Quarter
…
VISUAL CONSISTENCY (mandatory):
…
SCENE 4 (IMAGE) — CREATIVE INTENT:
Obraz je rozdělen přesně na dvě poloviny.
V horní části si stejný zakladatel hraje se svým dítětem na dětském hřišti. Oba se smějí, mají radost a věnují si plnou pozornost.
Ve spodní části sedí tentýž zakladatel znuděně u kancelářského stolu. Kolega vedle něj nadšeně gestikuluje a vysvětluje další nápad na obsah. Zakladatel se dívá jinam a působí otráveně, jako by věděl, že tato porada nikam nepovede.
Stejný člověk musí být použit v obou částech obrazu.
```

### Scene 5 — prompt 5157 chars · MD5 `3d751beec867cd3b6c05195932f63771`

**original visual_scene / intent.original (seed `00:13:23`)**

```
The task board is almost entirely complete, but the content row is simply gone — not done, just absent. The quiet gap is the point: in-house content often disappears before it ever gets made.
```

**creative_review.intent.localized_edit after save `12:37:17` (editor)**

```
Stejný zakladatel odchází s úsměvem z kanceláře. Na stole zůstal pouze zavřený notebook a hrnek s kávou. Stůl je čistý, nikde nejsou žádné papíry ani nepořádek. Zakladatel si přehazuje tašku přes rameno a odchází domů. Atmosféra vyjadřuje úlevu, klid a pocit, že práce skončila a je čas žít svůj život.
```

**english_preview after translate `12:37:36`**

```
The same founder leaves the office with a smile, his desk bare except for a closed laptop and a coffee mug, slinging his bag over his shoulder as he heads home. The mood conveys a sense of relief and quiet closure — the work is done, and it's time to live his life.
```

**rebuild output**

```
VISUAL IDENTITY:
- art_direction: Screen-native audit aesthetic. The primary visual surface is a shared document or spreadsheet — clean rows, two columns: ACTIVITY and TIME SPENT. …
- opening_first_image: A clean spreadsheet on a monitor, displaying two columns: 'ACTIVITY' and 'TIME SPENT'. The first row populates with 'Planning call for content strategy' and the time '40 minutes' appears next to it, followed by a slow scroll revealing more entries.
VIDEO CONCEPT (frozen anchor — do not invent a new concept):
- title: The In-House Quarter
…
VISUAL CONSISTENCY (mandatory):
…
SCENE 5 (IMAGE) — CREATIVE INTENT:
Stejný zakladatel odchází s úsměvem z kanceláře. Na stole zůstal pouze zavřený notebook a hrnek s kávou. Stůl je čistý, nikde nejsou žádné papíry ani nepořádek. Zakladatel si přehazuje tašku přes rameno a odchází domů. Atmosféra vyjadřuje úlevu, klid a pocit, že práce skončila a je čas žít svůj život.
```

---

## 4. Prompt lineage

| Layer | What is stored | Equals previous? |
|---|---|---|
| Original Production prompt | Overwritten at rebuild. No DB snapshot (`content_versions` empty). Original scene description survives only as `creative_review.intent.original` (spreadsheet / task-board language). | N/A — not retained |
| Creative Review rebuild prompt | `composeRebuiltImagePrompt`: frozen Opening Impact (scene 1) + Visual Identity + Video Concept + continuity guard + SCENE N CREATIVE INTENT = `localized_edit`. `director_notes` empty so that block omitted. | New string. Mix of original anchors + editor Czech intent. |
| Stored package prompt | `package_brief.visual_scenes[i].image_prompt` and `package_brief.image_prompts[i]`. Lengths 5668 / 5360 / 5311 / 5312 / 5157. | YES — is the rebuild output |
| VideoJob prompt (both jobs) | `input.scenes[i].image_prompt`. MD5 identical to package for all 5 scenes. Failed job and retry identical. | YES — `buildVideoJobInput` copies `pkg.visual_scenes` via `compileVisualScenesToWorkerScenes` |
| Worker prompt | `buildRenderSpec` uses `input.scenes` (`explicit_scene_plan=true`). `prepareImageSceneRaster` joins `scene.image_prompt` + `visualProfileImagePromptSuffix(NATURAL)` + `visualMediumImagePromptSuffix(PHOTOGRAPHIC)` + `sanitizeImagePrompt`. No `package_brief` reload. | Worker adds profile/medium suffixes at call time. Stored DB prompt does not include those suffixes. |
| Actual OpenAI request | `POST /v1/images/generations`. Wire body not in DB. Retry `generated=5` `reused=0` at `22:43:28.863Z`–`22:47:31.938Z`. First job timed out; no stills. | Reconstructed as stored prompt + NATURAL + PHOTOGRAPHIC suffixes (same composition as prior forensic for this package). |

Why they differ at the OpenAI layer: `prepareImageSceneRaster.ts` lines 119–141 append visual-profile and visual-medium suffixes. Why the stored prompt itself mixes old and new: `composeRebuiltImagePrompt` lines 128–143 always inject frozen original `first_image` / `art_direction` before the editor CREATIVE INTENT.

---

## 5. Persistence audit after Continue

Before values reconstructed from: `original_ai` + `content_items.body` (never updated) + save-only-writes-`creative_review` + history snapshots. After values from current `package_brief`. Rebuild persist: `continueCreativeReviewGeneration.ts` `rebuildAndPersistPackage` lines 386–397.

```diff
- "voiceover_text": "The belief that handling content in-house saves time is a myth. Here is what the ledger actually shows. One quarter. Two people. Forty-minute planning calls that produced no brief. Caption drafts through three revision rounds. Friday filming blocks lost to client calls. Five sprints. The content row never moved. Total hours spent: substantial. Posts published: a number that makes the hourly cost per post very uncomfortable to look at."
+ "voiceover_text": "The belief that handling content in-house saves time is a myth. Čas. To je něco, co už nikdy nevrátíme zpátky.\nCo si vyberete?\nPivo s kamarádem, nebo řešit s kolegou do půlnoci, co dát na Instagram, a stejně nic nevymyslet?\nPříjemný večer s partnerkou pod dekou, nebo další brainstorming v kanceláři, kde už všechny mozky dávno vyhořely?\nHrát si s dítětem, nebo poslouchat další návrhy obsahu od kolegů, kteří už stejně nic nového nevymyslí?\nČas je mnohem cennější než peníze.\nNemarněte ho na něco, co může udělat někdo jiný."
  "hook": "The belief that handling content in-house saves time is a myth."
- "subtitles": "<same as original English voiceover_text>"
+ "subtitles": "<same as mixed voiceover_text>"
- "visual_scenes": [original AI scenes with production image_prompts — overwritten, no snapshot]
+ "visual_scenes": [{"source":"ai","image_prompt":"<rebuilt 5668>"}, … ×5]
- "image_prompts": [original production prompts — overwritten, no snapshot]
+ "image_prompts": ["<same rebuilt strings as visual_scenes>", … ×5]
  "presentation_generation.opening_impact.first_spoken_sentence": "The belief that handling content in-house saves time is a myth."
  "presentation_generation.opening_impact.first_image": "<spreadsheet>"
  "presentation_generation.visual_identity.art_direction": "Screen-native audit aesthetic. … spreadsheet …"
+ "presentation_generation.creative_rebuild": {"completed_at":"2026-08-12T13:19:43.791Z","actor_id":"editor","scenes_rebuilt":5,"prompts_rebuilt":5,"opening_prepended":true,"voiceover_aligned":true}
  "creative_review.voiceover.original_ai": "<original English>"
  "creative_review.voiceover.localized_edit": "<editor Czech>"
  "creative_review.voiceover.final_approved": "<editor Czech>"
+ "creative_review.history": + creative_rebuild_completed v5, + continue_generation_started v6
  "video.script": original English SCENE 1–5 spreadsheet directions (not rebuilt)
  "cta": "Save this — next time someone proposes handling content in-house, run the quarterly hours first."
```

---

## 6. buildVideoJobInput audit

| Field | Loaded from | This package |
|---|---|---|
| `voiceover_text` | `pkg.voiceover_text` (`packageShared.ts:451` and again `:502`). Not `creative_review.final_approved`. | Mixed English opening + Czech `final_approved` |
| `hook` | `pkg.hook` | Original English `first_spoken_sentence` |
| `subtitles` | `pkg.subtitles` | Same mixed string as `voiceover_text` |
| `scenes` | `prepareAnalyzedVisualScenesForPackage(pkg.visual_scenes)` → `compileVisualScenesToWorkerScenes`. Rebuilt AI scenes, not original production scenes. | 5 IMAGE scenes, rebuilt prompts, no `asset_id` |
| `image_prompts` | `pkg.image_prompts` (synced from `visual_scenes` by `syncLegacyFieldsFromVisualScenes`) | Same 5 rebuilt strings |
| `script` / `concept` / `scenario` / `cta` | `pkg.video.script`, `pkg.video.concept`, `pkg.scenario`, `pkg.cta.text` | Original English production copy — never rebuilt |
| `tts_instructions` | `loadTtsFieldsForVideoJob` from project/package voice stamps | Contains `Language: en.` while spoken text is mixed EN+CS |
| `continued_after_creative_review` | extra flag from `ensureVideoJobForPackage` | `true` |

---

## 7. Worker payload (completed job `48e2b85e`)

HTTP body to the worker is `{video_job_id, project_id, content_package_id, content_item_id, callback_url, input}`. `input` is `video_jobs.input`. Scene `image_prompt` strings are the full rebuilt prompts (lengths below). Asset ids: none.

| Key | Value |
|---|---|
| `video_job_id` | `48e2b85e-8351-4532-bdf2-8607b02dd3a7` |
| `project_id` | `163c1822-ad30-4cee-8826-dfacd9c188b9` |
| `content_package_id` | `910da853-4f62-4cad-ab00-071c3a73af45` |
| `content_item_id` | `3bdb74ea-168d-44cb-b8c2-464cc9db8772` |
| `input.package_id` | `910da853-4f62-4cad-ab00-071c3a73af45` |
| `input.production_run_id` | `88e3097d-9d4c-4c54-ae53-6eb11afcdb59` |
| `input.retry_of_video_job_id` | `12048376-4025-42e5-bda2-cd0f22c7dc74` |
| `input.continued_after_creative_review` | `true` |
| `input.explicit_scene_plan` | `true` |
| `input.voiceover_text` | mixed English opening + Czech `final_approved` (exact string in section 2) |
| `input.subtitles` | same mixed string |
| `input.hook` | `The belief that handling content in-house saves time is a myth.` |
| `input.cta` | `Save this — next time someone proposes handling content in-house, run the quarterly hours first.` |
| `input.tts_voice` / `selected_voice` | `shimmer` |
| `input.resolved_primary_voice` | `shimmer` |
| `input.resolved_secondary_voice` | `onyx` |
| `input.voice_source` | `package_primary` |
| `input.tts_instructions` | `Speak naturally for a short vertical social video. Language: en. Tone: Conversational and direct; Relatable and empathetic to everyday work frustrations; Concise — short sentences, minimal fluff; Slightly informal with occasional emoji use; Confident without being aggressive; Practical; Results-oriented; Avoids marketing jargon. Read the script exactly; do not add or skip words. Language: en.` |
| `input.delivery_reason` | `Language: en.` |
| `input.visual_profile` | `NATURAL` |
| `input.visual_medium` | `PHOTOGRAPHIC` |
| `input.asset_images` | `[]` (length 0) |
| `input.scenes` order | `scene-1`, `scene-2`, `scene-3`, `scene-4`, `scene-5` |
| `input.scenes[].type` | `IMAGE` ×5 |
| `input.scenes[].duration_seconds` | `4` ×5 |
| `input.scenes[].asset_id` | `null` ×5 |
| `input.scenes[].image_bucket` / `image_path` | `null` (full image gen on retry) |
| `input.scenes[].image_prompt` lengths | 5668, 5360, 5311, 5312, 5157 |
| `input.scenes[].renderer_version` | `image@1` |

---

## 8. Worker audit — no package_brief reload

| Worker site | Reads DB? | Uses job input? |
|---|---|---|
| `jobRunner.buildRenderSpec(payload.input)` | No | `voiceover_text`, `subtitles`, `scenes` from input |
| `generateValidatedVoiceover({ text: spec.voiceover_text })` | No | Yes — mixed 525-char string |
| `prepareImageSceneRaster` | Only Storage download if `image_bucket`/`path` set. This retry had none, so generated from `scene.image_prompt`. | Yes |
| `assertVideoJobStillActive` / lease heartbeat | `video_jobs` status/lease only | Does not reload `package_brief` |
| `content_packages` / `package_brief` | No matches in `video-worker/jobRunner.ts` or `dispatchVariantVideoJob.ts` | N/A |

---

## 9. Mixed-content inventory

| Fragment | Source | Version / timestamp | Why it won |
|---|---|---|---|
| Spoken opening: `The belief that handling content in-house saves time is a myth.` | `presentation_generation.opening_impact.first_spoken_sentence` (original AI Opening Impact, `00:12:27`) | Frozen at generation. Re-injected `13:19:43.791` by `alignOpeningVoiceover` | Czech `final_approved` does not start with that English sentence, so `prepended=true`. Written to `package.voiceover_text`, then job input, then TTS. SRT cues 1–4. |
| Spoken body: Czech editor rewrite starting `Čas. To je něco…` | `creative_review.voiceover.localized_edit` / `final_approved` | Editor save `12:37:17.294`; confirmed `12:37:36.389` | Rebuild uses `final_approved` as the voiceover argument. SRT cues 5–32. |
| Hook field / on-screen hook source | Same Opening Impact `first_spoken_sentence` | `00:12:27`, reassigned `13:19:43` | `alignOpeningVoiceover` always returns `hook=opening` when opening is non-empty |
| Scene 1–5 CREATIVE INTENT (Czech Grim Reaper / split screens / playground / leaving office) | `creative_review.scenes[i].intent.localized_edit` | Editor save `12:37:17.294` | `composeRebuiltImagePrompt` appends `localized_edit` as CREATIVE INTENT. SQL: `intent_equals_prompt_tail=true` for all 5. |
| Scene 1 prompt head: spreadsheet OPENING IMPACT `first_image` | `presentation_generation.opening_impact.first_image` (original AI) | `00:12:27`, injected `13:19:43` because `isOpeningStill=true` for first AI scene | `composeRebuiltImagePrompt` lines 128–134. Comment in file: Visual Identity / Opening Impact / Video Concept are frozen anchors, never replaced. |
| Scenes 1–5 prompt VISUAL IDENTITY + VIDEO CONCEPT (spreadsheet audit aesthetic, `character_style` none) | `presentation_generation.visual_identity` + `video_concept` (original AI) | `00:12:27`, injected `13:19:43` into every rebuilt AI prompt | `composeRebuiltImagePrompt` lines 137–138. `validateRebuiltAiPrompt` requires `art_direction` to remain in the prompt. |
| `video.script` SCENE 1–5 (spreadsheet / task board / two numbers) — present on job input, not used for TTS or IMAGE raster | Original Content Package generation `00:13:23` | Unchanged through rebuild | Rebuild does not touch `video.script`. Worker TTS uses `voiceover_text`; IMAGE scenes use `image_prompt`. |

---

## 10. Final comparison

| Content | Expected after Continue | Actually rendered | Source that won |
|---|---|---|---|
| Voiceover | Czech `final_approved` | English opening + Czech body | `alignOpeningVoiceover` prepend of original Opening Impact onto `final_approved` |
| Hook | Editor opening (`Čas. To je něco, co už nikdy nevrátíme zpátky.`) or `final_approved` first line | `The belief that handling content in-house saves time is a myth.` | `opening_impact.first_spoken_sentence` |
| Subtitle | Czech `final_approved` | Whisper of mixed VO. SRT starts in English then switches to Czech at `00:00:05.140` | `subtitle_source=whisper` on mixed TTS audio; `package.subtitles` also mixed but worker used Whisper |
| Scene1 | Czech Grim Reaper / watch (`localized_edit` only) | Rebuilt prompt = original spreadsheet OPENING IMPACT + original VISUAL IDENTITY + Czech Grim Reaper CREATIVE INTENT. Still generated `22:43`–`22:47`. | `composeRebuiltImagePrompt` `isOpeningStill=true` |
| Scene2 | Czech pub vs office split (`localized_edit` only) | Original spreadsheet VISUAL IDENTITY + Czech split-screen CREATIVE INTENT | `composeRebuiltImagePrompt` frozen anchors |
| Scene3 | Czech boardroom vs bedroom split | Original VISUAL IDENTITY + Czech split-screen CREATIVE INTENT | `composeRebuiltImagePrompt` frozen anchors |
| Scene4 | Czech playground vs bored meeting | Original VISUAL IDENTITY + Czech split-screen CREATIVE INTENT | `composeRebuiltImagePrompt` frozen anchors |
| Scene5 | Czech founder leaving office | Original VISUAL IDENTITY + Czech leaving-office CREATIVE INTENT | `composeRebuiltImagePrompt` frozen anchors |

---

## 11. Root cause

First incorrect state — not the last symptom. Confidence **99%**.

| | |
|---|---|
| File | `lib/creative-review/rebuildCreativePackage.ts` |
| Function | `rebuildCreativePackageForVideo` |
| First write (scenes) | `composeRebuiltImagePrompt` lines 113–157, call 601–619 |
| First write (voiceover) | `alignOpeningVoiceover` call lines 698–707 |
| Timestamp | `2026-08-12T13:19:43.791Z` |
| Stamp | `creative_rebuild.opening_prepended = true` |

**Stored value (`voiceover_text`)**

```
The belief that handling content in-house saves time is a myth. Čas. To je něco, co už nikdy nevrátíme zpátky.
Co si vyberete?
Pivo s kamarádem, nebo řešit s kolegou do půlnoci, co dát na Instagram, a stejně nic nevymyslet?
Příjemný večer s partnerkou pod dekou, nebo další brainstorming v kanceláři, kde už všechny mozky dávno vyhořely?
Hrát si s dítětem, nebo poslouchat další návrhy obsahu od kolegů, kteří už stejně nic nového nevymyslí?
Čas je mnohem cennější než peníze.
Nemarněte ho na něco, co může udělat někdo jiný.
```

**Expected value after Continue (`final_approved`)**

```
Čas. To je něco, co už nikdy nevrátíme zpátky.
Co si vyberete?
Pivo s kamarádem, nebo řešit s kolegou do půlnoci, co dát na Instagram, a stejně nic nevymyslet?
Příjemný večer s partnerkou pod dekou, nebo další brainstorming v kanceláři, kde už všechny mozky dávno vyhořely?
Hrát si s dítětem, nebo poslouchat další návrhy obsahu od kolegů, kteří už stejně nic nového nevymyslí?
Čas je mnohem cennější než peníze.
Nemarněte ho na něco, co může udělat někdo jiný.
```

Retry at `22:43` copied this already-mixed job input. Worker did not reload `package_brief`. `content_items.body` still holds the original English VO and was never consulted. The mix is not a worker bug and not a Save bug.

**Evidence:** `content_packages.package_brief`, `creative_review.history[seed|save|translate|approve|creative_rebuild_completed|continue_generation_started]`, `video_jobs` `12048376` (failed) and `48e2b85e` (completed), Whisper SRT, TTS telemetry `prompt_characters=525`, SQL `mixed_equals_opening_plus_fa=true`, prompt MD5 match across package and both jobs, `intent_equals_prompt_tail=true` for scenes 1–5.
