# Production T2V Creative Plan Audit

**Projekt:** fenrik Studio  
**Datum auditu:** 2026-08-21  
**Režim:** pouze čtení (kód + uložená data). Žádná migrace, žádný nový run, žádné provider volání.

Tento dokument popisuje konkrétní production package a aktuální kód, který ho vytvořil. Obecné rady bez opory v kódu nebo datech sem nepatří.

---

## A — Identifikace konkrétního běhu

### Vybraný běh

| Pole | Hodnota | Zdroj |
|---|---|---|
| Project name | `fenrik Studio` | `projects.name` |
| Project ID | `163c1822-ad30-4cee-8826-dfacd9c188b9` | `projects.id` |
| Run ID | `ee98f7e1-2c84-4da5-bf5c-420fa0590a98` | `production_runs.id` |
| Run status | `waiting_for_creative_review` | `production_runs.status` |
| Content package ID | `3b30b458-8d74-4267-8a53-a1a980b11e7c` | `production_run_items.content_package_id` |
| Strategy item ID | `260669ea-d3ff-4024-adcf-deaef23de4fe` | `content_packages.strategy_item_id` |
| Package title | `The Tab They Opened Before Your Call` | `content_packages.title` |
| Generation mode | `manual_review` | `production_runs.requested_config.config.generationMode` |
| Package video mode | `text_to_video` | `package_brief.package_video_mode` + run config `packageVideoMode` |
| Creative Review status | `ready` | `package_brief.creative_review.status` |
| Creative Review approved | `false` | `package_brief.creative_review.approved` |
| CR version | `1` | `package_brief.creative_review.version` |
| T2V plan status | `draft` | `package_brief.video_text_to_video_creative_plan.status` |
| T2V repetition | `passed` | `package_brief.video_text_to_video_creative_plan.repetition.status` |
| T2V scene count | `7` | uložený plán |
| T2V timing | `estimated` (hlas ještě neběžel) | `timing_status` |
| Paid preflight | `confirm_paid_run=true`, `max_budget_usd=6` | `package_brief.video_paid_preflight` |
| Run created | `2026-08-20 14:39:32 UTC` | `production_runs.created_at` |
| Package created | `2026-08-20 14:42:02 UTC` | `content_packages.created_at` |
| Video job | **neexistuje** | `video_jobs` pro tento run po 14:00 UTC je prázdné |
| Runway attempts | **0** | `scene_video_generation_attempts` má 0 řádků v celém projektu |

Název package přesně odpovídá požadovanému `The Tab They Opened Before Your Call`.

### Ostatní kandidáti — nevybráni

| Run ID | Status | Package | Scény | Proč to není tento běh |
|---|---|---|---|---|
| `9a3cc0cb-f726-4b92-aaf5-eb67a89599d7` | `cancelled` | `The Reply That Never Came` (`a38b2fa0-9634-4d4f-b750-05308b019bee`) | 5 | Starší T2V běh téhož dne (10:14 UTC), zrušený, jiný title, 5 scén |
| `88e3097d-9d4c-4c54-ae53-6eb11afcdb59` a starší | `completed` | still / bez `packageVideoMode: text_to_video` | n/a | Nejsou T2V production runy |

Vybraný běh je nejnovější T2V production run projektu a jediný ve stavu `waiting_for_creative_review`.

---

## B — Původ celého obsahu

Pořadí v `generateContentPackage.ts`:

1. Claude vygeneruje Video Concept.
2. OpenAI vygeneruje Opening Impact.
3. Deterministický kód složí Visual Identity.
4. Claude vygeneruje Content Package (hook, VO, 5 still scén, script).
5. `buildManualReviewCreativeReview` — Claude Scene Intent + lokalizace.
6. Insert package.
7. `attachTextToVideoCreativePlanToBrief` — **deterministický** T2V plán z `voiceover_text`.

Telemetrie tohoto package (`presentation_generation.generation_telemetry`, 2026-08-20):

| Krok | Provider / model | Čas |
|---|---|---|
| Video Concept | Claude `claude-sonnet-4-6` | 14:39:45 |
| Opening Impact | OpenAI `gpt-4o-mini-2024-07-18` | 14:40:18 |
| Visual Identity | deterministický kód | 14:40:23 |
| Content Package | Claude `claude-sonnet-4-6` | 14:40:23 |
| Platform Outputs | deterministický kód | 14:41:23 |
| Creative Review Scene Intent | Claude `claude-sonnet-4-6` | 14:41:23 |
| CR Voiceover Localization + Translation | Claude `claude-sonnet-4-6` | 14:41:29–14:41:37 |
| CR Scene Intent Localization ×5 | Claude `claude-sonnet-4-6` | 14:41:37–14:42:01 |
| Persist Package | deterministický kód | 14:41:23–14:42:03 |
| Social Image | `gpt-image-1` | 14:42:03 |

T2V planner v telemetrii **není** LLM krok. Vzniká v `attachTextToVideoCreativePlanToBrief` po insertu.

### Pole po poli

| Pole | Kdo | Krok | Funkce / soubor | Původ | Úložiště | Co čte worker |
|---|---|---|---|---|---|---|
| Hlavní myšlenka (`video_concept.core_idea`) | Claude | Video Concept | content pipeline → `presentation_generation.video_concept` | originální LLM | `package_brief.presentation_generation.video_concept.core_idea` | T2V planner **nečte**. Worker **nečte**. |
| Hook | Claude Content Package; Opening Impact ho navrhl | Content Package | `contentPackageSchema.hook` | originální LLM | `package_brief.hook` | T2V plán zkopíruje do `approved_hook`. Worker hlas čte `voiceover_text`, ne hook samostatně. |
| Originální voiceover | Claude | Content Package | `pkg.voiceover_text` | originální EN LLM | `package_brief.voiceover_text` + `creative_review.voiceover.original_ai` | Po Approve se přepíše produkčním EN preview. Worker čte `brief.voiceover_text`. |
| Česká pracovní verze | Claude | CR Voiceover Localization | `translateCreativeReviewForEditor` → `localized_edit` / `final_approved` | přeložené | `creative_review.voiceover.localized_edit` | T2V **nesmí** mluvit tímto textem (`productionSpokenVoiceoverFromReview` vrací jen EN preview). |
| Anglická produkční verze | Claude | CR Voiceover Translation | `english_preview` | přeložené zpět z češtiny | `creative_review.voiceover.english_preview` | Po Approve se stane `voiceover_text`. Worker syntetizuje toto. |
| Počet scén T2V | deterministický kód | persist T2V plánu | `targetSceneCount` + `splitVoiceoverSentences` v `textToVideoCreativePlan.ts` | odvozené z počtu vět VO | `video_text_to_video_creative_plan.scenes` | Worker bere `plan.scenes.length` = 7 requestů. |
| Rozdělení VO mezi scény | deterministický kód | totéž | `groupSentencesIntoScenes` | odvozené (páry vět) | `voiceover_excerpt` | Alignment mapuje excerpt na čas. |
| Délka scén | deterministický kód | totéž | `TEXT_TO_VIDEO_TARGET_MID_SECONDS / grouped.length` = 24/7 | fallback odhad | `approximate_duration_seconds` = 3.4 | Po hlase přepíše alignment. Runway dostane `ceil(duration)`. |
| `visual_idea` / `human_visual_edit` | deterministický fallback | totéž | `buildTextToVideoCreativePlan` | **ne LLM**. Body = excerpt VO. Opening = `Výrazný vizuál podporující: ${hook}`. Closing = `Závěr a CTA: ${excerpt}` | `human_visual_edit` + `visual_intent` | Nepoužívá se přímo. Jde do `composeTextToVideoProviderPrompt`. |
| `provider_prompt` | deterministický kód | totéž + scéna save | `composeTextToVideoProviderPrompt` | odvozené z visual intent + energy + role | `scenes[].provider_prompt` | Worker posílá toto jako `promptText`. |
| Zvukový plán | deterministický kód | totéž | `proposeAutoSoundPlanFromCreativePlan` | fallback | `video_text_to_video_sound_plan` | SFX/music fáze. Aktuálně prázdné `scene_sound`, music `none`. |
| Hudba | deterministický kód | totéž | `proposeAutoSoundPlanFromCreativePlan` nastaví `music.mode` na `none`, protože scény nemají `sound_intent` | fallback | `sound_plan.music.mode = none` | Žádný ElevenLabs music POST z auto plánu. |
| Hlasová režie | default kód | persist | `voiceDirectionFromBriefOrDefault` → `{ style: "auto", revision: 0 }` | fallback | `video_voice_direction` | ElevenLabs voice fáze, **ne** Runway. |
| CR still Scene Intent (5 scén) | Claude | Scene Intent Generation | `generateSceneCreativeIntents` | originální LLM, pak přeložené | `creative_review.scenes` | T2V UI je **schová** (`!isT2v`). T2V planner je **nepoužívá**. |
| Video concept / script / visual_scenes | Claude | Video Concept + Content Package | `video.concept`, `video.script`, `visual_scenes` | originální LLM | `package_brief.video`, `visual_scenes` | T2V planner **ignoruje**. Po Approve `syncSpokenFieldsFromProductionVoiceover` **přepíše `video.script` produkčním VO**. |

`attachTextToVideoCreativePlanToBrief` **nepředává** `coreIdea` do `buildTextToVideoCreativePlan`, i když funkce argument má. Body scény proto nemají core idea — jen excerpt.

---

## C — Proč vzniklo právě 7 scén

### 1–3. Kdo rozhodl

LLM počet T2V scén **nenavrhl**.

Uložený VO má 14 vět. Funkce:

```111:115:lib/content-package/textToVideoCreativePlan.ts
function targetSceneCount(sentenceCount: number): number {
  if (sentenceCount <= 3) return Math.max(3, sentenceCount);
  if (sentenceCount <= 5) return sentenceCount;
  if (sentenceCount <= 7) return sentenceCount;
  return 7;
}
```

`targetSceneCount(14) = 7`.  
`groupSentencesIntoScenes` bere `size = ceil(14/7) = 2` → 7 skupin po 2 větách.

To přesně sedí na uložené `voiceover_excerpt` hodnoty.

LLM Content Package mezitím navrhl **5** vizuálních still scén (`visual_scenes.length = 5`, `MAX_VIDEO_SCENE_STILLS = 5` v `lib/video-engine/storyboard.ts`). T2V plán tento počet nepoužívá.

### 4. Min / max

Zod schema: `scenes.min(3).max(7)`.  
Hard cap v `targetSceneCount`: 7.

### 5. Co systém zohledňuje / nezohledňuje

| Kritérium | Zohledněno v T2V planneru? |
|---|---|
| Skutečný děj | Ne |
| Vizuální změna | Ne |
| Cena | Ne při dělení scén |
| Kontinuita | Ne |
| Délka výsledného videa | Pouze konstanta 24 s |
| Schopnosti Runway Gen-4.5 | Pouze později: duration clamp 2–10 s, ratio 720:1280 |

### 6–7. Proč ~3,4 s

```184:185:lib/content-package/textToVideoCreativePlan.ts
  const totalDuration = TEXT_TO_VIDEO_TARGET_MID_SECONDS;
  const perScene = totalDuration / grouped.length;
```

`TEXT_TO_VIDEO_TARGET_MID_SECONDS = 24`.  
`24 / 7 = 3.428…` → `Math.round(perScene * 10) / 10 = 3.4`.

Délka **není** odvozená z délky věty ani z děje. Je to rovnoměrný podíl cílových 24 s.

### 8–9. Po ElevenLabs alignmentu

`applyAlignmentMeasuredTimingToPlan` (`lib/text-to-video/measuredSceneTiming.ts`):

- mapuje existující `voiceover_excerpt` na character alignment;
- přepíše `approximate_start_seconds` a `approximate_duration_seconds`;
- **nemění počet scén**;
- **nemění** `visual_intent` / `provider_prompt`;
- zachová `plan_fingerprint`.

Pokud excerpt v alignmentu chybí, timing se stejně napíše (fallback rozsah z alignment helperu). Pokud scéna po měření překročí 10 s, až Runway mapping hodí `scene_duration_exceeds_runway_max`.

Aktuální package: `timing_status = estimated`, `measured_audio_revision_id = null`. Alignment ještě neproběhl.

### 10. Kolik Runway requestů

Současný plán = **7 nezávislých POST** `/v1/text_to_video` (jeden na scénu), pokud se nepůjde reuse existující attempt. Attempty zatím nejsou.

---

## D — Proč jsou vizuální představy slabé

### Tabulka sedmi scén (uložená data)

| Scéna | VO excerpt | Uložená vizuální představa (`human_visual_edit`) | Uložený provider prompt | Původ vizuálu | Původ provider promptu |
|---|---|---|---|---|---|
| 1 | `What does a potential client see when they look you up right before a call? They open a tab.` | `Výrazný vizuál podporující: What does a potential client see when they look you up right before a call?` | `Photoreal marketing video clip, vertical 9:16. Visual intent: Výrazný vizuál podporující: What does a potential client see when they look you up right before a call? Energy and motion: Immediate attention, bold motion Opening beat: immediate visual hook, no on-image readable text. No character dialogue, no lip-sync, no generated subtitles or logos in frame. No readable text in the video unless explicitly part of approved UI chrome.` | deterministický opening fallback | `composeTextToVideoProviderPrompt` |
| 2 | `They search your name. The profile loads.` | `They search your name. The profile loads.` | stejný wrapper + `Visual intent: They search your name. The profile loads.` + `Clear, steady marketing energy` + Story beat | kopie VO excerptu | totéž |
| 3 | `One post — three months old. A reshared article before that.` | `One post — three months old. A reshared article before that.` | totéž s tímto intentem | kopie VO excerptu | totéž |
| 4 | `Nothing recent. They don't form a bad opinion.` | `Nothing recent. They don't form a bad opinion.` | totéž | kopie VO excerptu | totéž |
| 5 | `They form no opinion at all. That's worse.` | `They form no opinion at all. That's worse.` | totéž | kopie VO excerptu | totéž |
| 6 | `The call happens. It's polite.` | `The call happens. It's polite.` | totéž | kopie VO excerptu | totéž |
| 7 | `No follow-up arrives. You never knew the tab opened first.` | `Závěr a CTA: No follow-up arrives. You never knew the tab opened first.` | wrapper + closing beat + `Confident forward motion toward action` | deterministický closing fallback | totéž |

Kód, který to skládá:

```201:211:lib/content-package/textToVideoCreativePlan.ts
    const humanVisual =
      priorEdit ||
      (role === "opening"
        ? `Výrazný vizuál podporující: ${hook}`
        : humanMeaning);
    const energy = defaultEnergyForRole(role);
    const providerPrompt = composeTextToVideoProviderPrompt({
      humanVisualIntent: humanVisual,
      energyMotion: energy,
      sceneRole: role,
    });
```

Body `humanMeaning` bez `coreIdea` = excerpt.

### Odpovědi D1–D10

1. **Vizuální představu T2V plánu nevytvořil LLM.** Vytvořil ji deterministický fallback.
2. LLM prompt pro T2V visual **neexistuje**. Claude vytvořil *jiné* vizuály: Video Concept, `video.script` (5 scén), `visual_scenes[].image_prompt` + `motion_prompt`, a CR Scene Intent (5 still popisů).
3. Fallback je `buildTextToVideoCreativePlan` výše.
4. **Ano, kvalitnější storyboard existuje** v tomtéž package:
   - `video.concept` (FAQ, client POV, no owner in frame, teal/slate, screen-native)
   - `video.script` s 5 konkrétními scénami (split-screen kalendář, phone search, scroll, face-down phone, empty inbox)
   - 5 `image_prompt` + `motion_prompt` s prostředím, rukou, desk, lighting
   - CR Scene Intent (5 lidských popisů)
5. **T2V planner to vše ignoruje.** `attachTextToVideoCreativePlanToBrief` čte jen `voiceover_text`, `hook`, voice direction.
6. **Ano.** Body vizuály = text voiceoveru. Opening/closing jen prefixují hook/excerpt česky.
7. **`provider_prompt` není výrazně bohatší.** Je to šablona kolem téhož textu + energy boilerplate + zákazy textu/lip-sync. Žádné prostředí, osoba, kamera, barvy, kontinuita.
8. Obsah provider promptu:

   | Prvek | Je v uloženém promptu? |
   |---|---|
   | Konkrétní prostředí | Ne |
   | Osoba | Ne |
   | Akce (vizuální) | Pouze pokud ji VO náhodou pojmenuje |
   | Emoce | Pouze generic energy string |
   | Kamera | Ne (jen „vertical 9:16“) |
   | Světlo | Ne |
   | Vizuální styl | Pouze „Photoreal marketing video clip“ |
   | Firemní barvy | Ne |
   | Kontinuita | Ne |
   | Zákazy | Ano: no dialogue, no lip-sync, no subtitles/logos, no readable text |
   | Portrait formát | Ano: `vertical 9:16` + worker pošle `ratio: 720:1280` |

9. **Runway musí domyslet skoro celý obraz** včetně lidí, místnosti, produktu, continuity a konkrétní akce.
10. Operátor v UI vidí `humanVisualEdit`. `provider_prompt` je ve `<details>Technický provider prompt</details>` (`CreativeReviewPackagePanel.tsx`). Není schovaný proto, že by byl bohatší — je to tentýž slabý text v obalu.

Existující kvalitní Claude vizuály operátor na T2V stránce **nevidí**: still Creative Intent je renderováno jen když `!isT2v`.

---

## E — Co přesně dostane Runway

Rekonstrukce bez POST. Builder: `buildTextToVideoRunwayExecutionPlan` → `createTextToVideoSceneVideoAttempt` → `provider.createTextToVideo` → `buildRunwayTextToVideoBody`.

Endpoint: `POST https://api.dev.runwayml.com/v1/text_to_video`  
Header verze: `X-Runway-Version: 2024-11-06` (`lib/ai/runway.ts`).

Gen-4.5 T2V body (`buildRunwayTextToVideoBody`):

```json
{
  "model": "gen4.5",
  "promptText": "<scenes[i].provider_prompt>",
  "ratio": "720:1280",
  "duration": 4,
  "seed": <integer 0..4294967295>
}
```

- `generateAudio` se **neposílá**. Katalog: `audioField: false` u `gen4.5`.
- `source_image_bucket` / `source_image_path` = `null`. Žádný reference image, žádný previous frame.
- `promptTextMaxUtf16` katalogu = 1000. Uložené prompty jsou pod limitem.
- Duration **teď**: `runwayProviderDurationFromRequiredTrim(3.4)` → `providerDurationSeconds = 4` (ceil, min 2, max 10).
- Seed se počítá až při execution z `plan_fingerprint + synthesis_fingerprint + scene_id + order`. Hlas ještě neexistuje → **finální seed teď nelze spočítat**. Různé scény dostanou různý seed. Seed **nespojuje** scény vizuálně.

Per scéna (odhad před hlasem):

| Scéna | duration (provider) | requiredTrim | ratio | model | audio | reference |
|---|---|---|---|---|---|---|
| 1–7 | 4 s | 3.4 s | 720:1280 | gen4.5 | žádné | žádné |

`promptText` = přesně uložený `provider_prompt` z tabulky v sekci D.

Po alignmentu se `duration` může změnit na `ceil(measured_trim)` v rozsahu 2–10. Počet requestů zůstane 7.

### E1–E7

1. Runway musí domyslet: kdo je v záběru, jaký telefon/desk, jaký feed, světlo, šaty, zda jde o stejnou osobu, konkrétní motion, branding, CTA vizuál, a jak scéna souvisí s předchozí.
2. Řízené: portrait 9:16, photoreal marketing boilerplate, energy string, role beat (opening/body/closing), zákazy textu/lip-sync/log, integer duration, seed (deterministický ale per-scene).
3. Prakticky náhodné: konkrétní vizuální obsah, identita, prostředí, kontinuita, emoce scény nad boilerplate.
4. **Mechanismus kontinuity lidí/oblečení/prostředí neexistuje.**
5. Reference image / previous frame / sdílený seed napříč scénami: **ne**. Seed je per scene.
6. Sedm nezávislých klipů: vysoká pravděpodobnost jiných rukou, jiných telefonů, jiné palety, jiného „klienta“.
7. Pravděpodobná podoba tohoto konkrétního plánu: 7 krátkých photoreal klipů, které se pokusí doslova ilustrovat VO věty („the call happens“, „that's worse“), bez split-screen kalendáře / empty inbox storyboardu, který Claude už napsal. Opening a closing prompt obsahují **české** prefixy (`Výrazný vizuál podporující`, `Závěr a CTA`) — Runway je může vzít jako vizuální instrukci nebo ignorovat.

---

## F — Co se stane po ruční úpravě

Všechna tvrzení z `lib/api/creative-review-admin.ts`, `textToVideoManualReview.ts`, `textToVideoCreativePlan.ts`, `continueCreativeReviewGeneration.ts`.

| Situace | Změněná pole | Zneplatní se | LLM překlad | Přestaví se plán | Ostatní scény | Provider prompt | Fingerprint | Nové Approve | Placený provider |
|---|---|---|---|---|---|---|---|---|---|
| 1. Jen `Vizuální představa` + **Uložit scénu** | `human_visual_edit`, `visual_intent`, `provider_prompt` té scény; plan `status=draft`; repetition re-eval; integrity visual/plan stale; CR `approved=false` pokud bylo true | visual_plan + plan_sync | Ne. Text jde do promptu as-is (i česky) | Ne celý plán. Jen ta scéna přes `applyHumanVisualEditToScene` | Zachovány | Ano, u editované scény, deterministicky | Ano, `plan_fingerprint` se přepočítá | Ano, pokud už bylo approved | Ne při uložení |
| 2. Změna voiceoveru + **Save package** | CR `localized_edit`; auto EN preview + `final_approved`; `voiceover_text`/`subtitles`/`hook` na produkční EN; **celý T2V plán se přestaví** `applyProductionVoiceoverToTextToVideoBrief`; `video.script` se přepíše VO textem | audio timing, visual plan, spoken fields | Ano: `translateCreativeReviewEnglishPreviews` | Ano. Scene count může zůstat 7 nebo se změnit podle nových vět. Visual edity se drží **podle indexu**, ne podle `scene_id` | Zachovány jen pokud nový počet ≥ index | Přepočítá se pro scény bez prior edit; s prior editem se prompt znovu složí z uloženého `human_visual_edit` | Ano | Ano (`approvePlan: false`) | Ne (jen Claude překlad) |
| 3. Hlasová režie | `video_voice_direction` + `revision++`; plan `status=stale`; `voice_direction_revision`; CR unapprove | audio_timing, plan_sync | Ne | Ne scény. Až další Approve plán přestaví s novou revision | Zachovány | Ne teď | Integrity fingerprint null; plan_fingerprint se na tomto save **nepřepočítá** | Ano | Ne teď. Po Continue ovlivní ElevenLabs, ne Runway prompt |
| 4. Vlastní SFX | `video_text_to_video_sound_plan.scene_sound[sceneId]`; `revision++`; plan `status=draft` pokud byl approved; CR unapprove | assembly checkpoint pokud existuje | Ne | Ne vizuální plán | Zachovány | Ne | Plan fingerprint ne z visual; sound revision ano | Ano | Ne teď. Po Continue ElevenLabs SFX pokud `custom` |
| 5. Jedna scéna vizuál, ostatní nechat | Jako ř. 1 | jen visual/plan | Ne | Ne | Ostatní beze změny | jen ta scéna | Ano | Ano | Ne |
| 6. Uložit scénu (T2V tlačítko) | Jako ř. 1. **Package Save toto pole neposílá** | viz ř. 1 | Ne | Ne | Zachovány | Ano | Ano | Ano | Ne |
| 7. Save celého package | CR voiceover + CR still intents (i když T2V UI still intents schovává). T2V visual textarea **není v payloadu** | pokud VO změněn: viz ř. 2; pokud jen still intent: u T2V `patchBriefAfterCreativeReviewEdits` visual plán **neinvaliduje** | Ano jen když se změnil localized text | Jen když se změnil VO | T2V scény netknuté, pokud VO stejný | Ne, pokud VO stejný | Ne, pokud VO stejný | Ano, pokud contentChanged | Claude překlad pokud localized changed. Runway/ElevenLabs ne |
| 8. Approve Package | CR `approved=true`; **přestaví T2V plán z EN preview** a `approvePlan: true`; `voiceover_text` = EN preview; `video.script` = EN preview | integrity se nastaví current jen pokud plan approved + repetition passed | Ne (vyžaduje už current EN preview) | **Ano, vždy** přes `rebuildTextToVideoPlanPreservingSceneEdits` | Visual edity podle indexu | Přepočítá se | Ano | Toto *je* Approve | Ne. Runway až Continue + worker |
| 9. Continue Generation | T2V plán se **nesmí změnit** (`assertTextToVideoPlanLockedForContinue` + snapshot equal). Jen vyčistí `creative_review_reason`, zapíše history, vytvoří video job | — | Ne | Zakázáno. Pokud by se změnil, Continue hodí `t2v_plan_not_locked_for_continue` | Zachovány 1:1 | Zachován 1:1 | Musí sedět | Musí už být approved + repetition passed | **Ano**: ElevenLabs TTS, pak 7× Runway, volitelně SFX/music |

Doplňující fakta:

- Textarea `Vizuální představa` je `defaultValue` (neřízená). Bez kliknutí **Uložit** u scény se hodnota do DB nedostane. Package Save ani Approve nenačítají DOM hodnotu této textarey.
- `rebuildTextToVideoPlanPreservingSceneEdits` mapuje `existingScenes[index]`, ne `scene_id`. Pokud se po změně VO změní počet skupin, vizuální edit „scény 3“ může přistát na jiném excerptu.
- Aktuální `english_preview` **není identický** s `voiceover_text`. Continue **teď selže**, dokud neproběhne Approve (ten VO sjednotí). `assertTextToVideoPlanLockedForContinue` vyžaduje `brief.voiceover_text === productionSpokenVoiceover`.
- Approve tohoto package přepíše `video.script` (teď 5scénový storyboard) prostým VO textem. To je datová ztráta storyboardu.

---

## G — Je úprava operátorem srozumitelná?

Pole `Vizuální představa` je editor-facing string, ze kterého kód **deterministicky** složí `provider_prompt`. Žádný druhý LLM z něj nedělá technický prompt.

1. Operátor nemá produktovou instrukci, že má psát jen děj. Label je holé `Vizuální představa`, bez placeholderu a bez nápovědy (`CreativeReviewPackagePanel.tsx` ~ř. 621–629).
2. Osoby a prostředí **by měl** dopsat, jinak je Runway nedostane. Systém to nevyžaduje.
3. Kameru **může** dopsat; do promptu se dostane jen pokud ji napíše. Default kamera není.
4. Firemní barvy a styl **nejsou** předvyplněné, i když existují v `video_concept.visual_direction` (off-white, slate, teal).
5. Kontinuita s další scénou **není** v kontraktu. Každá scéna se ukládá zvlášť.
6. Jazyk: UI je česky, produkční VO anglicky, dnešní default vizuály jsou mix češtiny a angličtiny. Překlad tohoto pole **neexistuje**.
7. Pole se **automaticky nepřekládá**.
8. Technický provider prompt skládá `composeTextToVideoProviderPrompt` — deterministický kód, ne LLM a ne operátor.
9. Výsledek obalu je deterministický. Výsledek Runway klipu není.
10. Operátor vidí přesně to, co Runway dostane, **jen po rozbalení** „Technický provider prompt“. Hlavní pole je kratší. Rozdíl je jen boilerplate, ne chybějící bohatý storyboard.
11. **Před Approve nelze rozumně předvídat výsledek.** UI neukazuje 5 existujících image promptů, motion, concept ani kontinuitu. Ukazuje VO věty.
12. **UI/workflow je nevyhovující**, ne jen dokumentační problém: T2V stránka schová jediné lidské vizuály (`!isT2v`) a místo nich nabídne VO fallback, který se tváří jako kreativní plán.

---

## H — Existující zdroje, které se ignorují

| Zdroj | Existuje v tomto package? | Kdo vytvořil | T2V planner | Prompt builder | Proč se nepoužívá | Dlouhodobá hodnota |
|---|---|---|---|---|---|---|
| Video concept | Ano, bohatý | Claude Video Concept | Ne | Ne | Planner čte jen VO | Ano — jádro automatického T2V |
| Video script | Ano, 5 konkrétních scén | Claude Content Package | Ne | Ne | Ignorován; Approve ho přepíše VO | Ano jako storyboard, pokud se nepřepíše |
| Storyboard / visual_scenes | Ano, 5× image+motion | Claude Content Package | Ne | Ne | Still artefakt cap 5; T2V si staví vlastní scény z vět | Image prompty jsou použitelné jako visual events; motion_prompt je still/I2V dědictví |
| Still scene intents (CR) | Ano, 5 | Claude Scene Intent + překlad | Ne | Ne | T2V UI je schová; jiný scene id prostor (`scene-1` vs hash) | Lidský popis děje — hodnota vysoká, dnes odpojený |
| Image prompts | Ano, 5 | Claude | Ne | Ne | Stejně jako visual_scenes | Ano jako konkrétní záběry |
| Brand visual profile (katalogový typ) | **Ne v package**. `presentation_generation` nemá `visual_profile` | — | Ne | Ne | T2V kód BrandVisualProfile neimportuje (používá ho jen benchmark) | Ano dlouhodobě |
| Firemní barvy | V concept: off-white / slate / teal. Project Product Brain barvy v `product_is` nemá | Claude visual_direction | Ne | Ne | Prompt builder barvy nepřidává | Ano |
| Atmosféra | `emotional_tone` + visual_identity v PG | Claude + deterministická Visual Identity | Ne | Ne | Repetition check porovnává opening visual s `memory.atmospheres` (palette_atmosphere), ne s tímto polem | Ano |
| Anti-repetition memory | Sestavuje se při attach z jiných package | `buildAntiRepetitionMemory` | Jen hook / plan fingerprint / opening motif vs atmospheres | Ne | Viz sekce I | Částečně — textová, ne vizuální |
| Hook intent / opening impact | Ano | OpenAI Opening Impact | Jen text hooku | Ne | Visual opening (split-screen kalendář) se do T2V scény 1 nedostal | Ano |
| Emotion arc | `narrative_arc` + `emotional_tone` | Claude | Ne | Ne | — | Ano |
| CTA visual | V scriptu end card fenrik Studio; still intent scéna 5 = empty inbox | Claude | Closing fallback jen prefixuje VO | Ne | — | Ano |
| Asset usage | `[]` | — | Ne | Ne | Žádné použitelný asset v package | — |
| Screenshot/web reference | Logo/source asset `e895c555-…` title `Fenrik Studio`, `website_ingestion` | ingest | Ne | Ne | T2V attempt `source_image_* = null` | Možná reference, dnes nepoužito |
| Logo | Jeden source image výše; T2V prompt logo **zakazuje** | ingest | Ne (a zákaz v promptu) | Zákaz „no … logos in frame“ | Vědomý zákaz v prompt contract v1 | Logo jako end-card by musel řešit assembly, ne Gen-4.5 prompt |

Product Brain projektu existuje (`product_is`, pain points, tone). T2V planner ho nečte.

---

## I — Opakování a historie

`checkTextToVideoRepetition` (`textToVideoCreativePlan.ts`) blokuje jen:

1. **hook** — normalizovaná textová shoda s `memory.hooks`, min 12 znaků;
2. **plan_fingerprint** — přesná shoda s fingerprintem T2V plánu z posledních 30 jiných package;
3. **opening visual motif** — normalizovaný text `human_visual_edit` scény 0 vs `memory.atmospheres`, min 16 znaků.

`memory.atmospheres` pochází z `atmosphereFromPackageBrief` = `palette_atmosphere` concept fingerprintu nebo `creative_engine.atmosphere`. **Není** to historie T2V vizuálních představ.

Nekontroluje se: sémantika hooku, vizuální děj, osoby, prostředí, podobnost s historickými videi, storyboard.

Uložený výsledek tohoto package: `repetition.status = "passed"`, `blocked_reasons = []`, `checked_at = 2026-08-20T14:42:02.847Z`.

**`passed` znamená: neprošel jednoduchou textovou blokací.** Neznamená kreatívně nový vizuální koncept.

Komentář v schématu to říká přímo: `Normalized-text duplicate diagnostics — not semantic originality guarantees.`

---

## J — Cena a praktický dopad

Ceník v kódu:

- Runway Gen-4.5: `12` kreditů / s (`TEXT_TO_VIDEO_RUNWAY_CREDITS_PER_SECOND`)
- `RUNWAY_USD_PER_CREDIT = 0.01` (`lib/ai-media-benchmark/docs.ts`; `readRunwayUsdPerCredit` default stejný)
- Mapování délky: `ceil(scene_seconds)` v 2–10
- ElevenLabs TTS odhad: `$0.10 / 1k znaků` default (`estimateElevenLabsTtsCostUsd`)
- Hudba/SFX v tomto plánu: 0 (music `none`, žádný custom SFX)

### Tento plán (7 scén, odhad 3.4 s → provider 4 s)

| Položka | Výpočet | USD |
|---|---|---|
| Runway requesty | 7 | — |
| Provider délka / scéna | 4 s | — |
| Provider délka celkem | 28 s | — |
| Kredity | 7 × 12 × 4 = 336 | — |
| Runway | 336 × 0.01 | **3.36** |
| TTS z current `voiceover_text` (375 znaků) | 0.0375 | 0.04 |
| TTS z EN preview po Approve (388 znaků) | 0.0388 | 0.04 |
| SFX / hudba | 0 | 0.00 |
| **Předběžný T2V video náklad (Runway)** | | **3.36** |
| Rozpočet runu | | 6.00 |

Po alignmentu se 3.4 s může změnit; počet requestů ne.

### Stejný 24s VO, jiné dělení (stejný estimator, rovnoměrný split)

| Scény | Odhad s / scéna | Provider s | Requesty | Kredity | Runway USD |
|---|---|---|---|---|---|
| 4 | 6.0 | 6 | 4 | 288 | **2.88** |
| 5 | 4.8 | 5 | 5 | 300 | **3.00** |
| 7 (aktuální) | 3.4 | 4 | 7 | 336 | **3.36** |

Rozdíl 4 vs 7 scén: **+$0.48** a **+3 body selhání**.  
Kontinuita: 7 nezávislých klipů je horší než 4–5 delších událostí.  
Tempo: 3.4 s nůžky na každou dvojici vět; Claude script chtěl 5 vizuálních událostí na ~38s concept duration (concept `duration_seconds: "38"`), T2V to stejně natáhne na target 24 s.

Selhání: executor je fail-closed per scene (`executeTextToVideoRunwayPlan` vrací `stopped` při fail). 7 requestů = 7 šancí zastavit package.

---

## K — Kritický verdikt

1. **Současný T2V creative planner je převážně deterministický rozdělovač voiceoveru**, ne kreativní plánovač. LLM kreativu udělal dřív a planner ji zahodil.
2. **Systém nevytváří konkrétní vizuální příběh.** Kopíruje věty VO do `visual_intent`.
3. **Operátor před placením výsledek rozumně nepředvídá.**
4. **Pole `Vizuální představa` není použitelné bez znalosti interního systému** (žádná nápověda, mix jazyků, skrytý skutečný storyboard, Save package pole neukládá).
5. **Technicky není bezpečné schválit k Continue v aktuálním stavu:**
   - plan `draft`, ne `approved`;
   - `voiceover_text` ≠ `english_preview`;
   - integrity `plan_sync_status = stale`, `visual_plan_status = stale`;
   - Continue lock by neprošel.
   Po kliknutí Approve by lock mohl projít **technicky**, ale Approve zároveň zničí `video.script` a zamkne 7 slabých promptů.
6. **Z hlediska kvality schválit není rozumné.** Zaplatí se 7 nesouvisejících klipů z VO vět, zatímco 5 použitelných záběrů už v package je.
7. Klasifikace problémů:
   - **Vědomý fallback / nedokončená implementace:** `buildTextToVideoCreativePlan` jako sentence splitter s max 7; `composeTextToVideoProviderPrompt` v1 bez Product Brain; repetition jako textová shoda; CR still intents odpojené od T2V.
   - **Chyba / škodlivý side-effect:** Approve přepíše `video.script` VO textem; T2V UI schová jediné lidské vizuály; české prefixy v EN Runway promptu; visual textarea mimo Package Save.
   - **UI problém:** žádná instrukce k poli; provider prompt v `<details>`; 5 vs 7 scén bez vysvětlení.
   - **Problém generování obsahu:** Claude VO je 14 krátkých vět, což **nutně** spouští cap 7. To je vstup, který splitter zesiluje, ne kořen vizuální chudosti.
8. **Před prvním placeným T2V během opravit:**
   - přestat posílat VO excerpt jako visual intent;
   - napojit 4–5 existujících visual events (concept/script/image_prompts) nebo vynutit operátorský vizuál před Approve;
   - ukázat operátorovi totéž, co půjde do Runway, včetně scény jako události, ne jako věty;
   - nepřepisovat `video.script` při Approve, nebo script oddělit od spoken fields;
   - sjednotit jazyk promptu (žádné české prefixy do Gen-4.5);
   - neoznačovat repetition `passed` jako kreativně nový koncept v UI, pokud se to tak čte.
9. **Lze odložit po prvním běhu:** sdílený seed / previous-frame kontinuita, automatická hudba, sémantická repetition, Brand Visual Profile v promptu, logo end-card v assembly, optimalizace ceny 4 vs 7.
10. **Nepřepisovat:** voice lock + Continue snapshot guard; paid preflight / budget fail-closed; Runway executor reuse/fingerprint; alignment měří délky, nemaže scény; SFX anchoring; CR lokalizace VO (cs pracovní / en produkce); `composeTextToVideoProviderPrompt` jako čistá funkce — nahradit *vstup*, ne nutně celý worker.

---

## L — Návrhy bez implementace

### Varianta 1 — minimální oprava (jeden smysluplný placený test)

Cíl: jeden package, 5 klipů z už existujícího Claude storyboardu, operátor vidí co schvaluje.

**Zachovat:** Continue lock, Runway executor, budget, EN preview jako mluvený text, alignment, sound plan UI.

**Nahradit / obejít:** `buildTextToVideoCreativePlan` sentence split pro tento test. Ručně nebo jednorázově naplnit 5 T2V scén z `visual_scenes` / `video.script` (image_prompt + motion + lidský popis). `human_visual_edit` = lidská scéna. `provider_prompt` = `composeTextToVideoProviderPrompt` nad tímto textem **plus** 1 odstavec z `visual_identity` (palette, lighting, no faces, screen-native). Zakázat české prefixy.

**Operátor:** doplní/potvrdí 5 vizuálů, Save scény, Approve, Continue.

**Náročnost:** malá (hodiny až 1 den), bez nového LLM planneru.

**Rizika:** 5 vs VO 14 vět — excerpt grouping musí být ručně sladěný, jinak alignment rozhází timing. Approve pořád může přepsat `video.script`. Žádná kontinuita mezi 5 klipy. Stále 5 náhodných Gen-4.5 interpretací.

**Cena:** ~$3.00 Runway místo $3.36; 5 fail points místo 7.

### Varianta 2 — správné dlouhodobé řešení

Automatický kreativní plán:

- 4–5 vizuálních **událostí** z Video Concept + Product Brain + Brand Visual Profile, ne z vět;
- lidský návrh v UI (děj, osoba, prostředí, kontinuita k další scéně);
- po Save deterministický (nebo oddělený LLM) provider prompt, který operátor vidí před Approve;
- VO se řeže podle událostí, ne naopak;
- kontinuita: sdílený character/environment block + volitelně last-frame / reference;
- EN-only prompt contract; české pole se překládá do promptu, ne naopak;
- Approve nesmí ničit storyboard;
- repetition na opening motif / visual world, ne jen hook string.

**Zachovat:** paid gates, executor, fingerprints, CR VO dual-language, worker pipeline.

**Odstranit:** sentence `targetSceneCount` jako jediný autor scén; VO excerpt jako default visual; skrytí still intents bez náhrady; `syncSpokenFieldsFromProductionVoiceover` přepis `video.script`.

**Náročnost:** střední až vysoká (plánovač + UI + continue lock + migrace schématu plánu).

**Rizika:** nový LLM krok = nová cena/latence/fail; alignment proti novým excerptům; lock fingerprintů se musí změnit vědomě.

**Cena jednoho package:** spíš **nižší nebo stejná** na Runway (4–5 × ~5–6 s), plus malý Claude cost na plán. Kontinuita snižuje waste z nepoužitelných klipů.

---

## Stručné odpovědi

1. **Kdo vytvořil 7 scén?** Deterministický kód `targetSceneCount(14 vět) = 7` v `buildTextToVideoCreativePlan`. Ne LLM.
2. **Kdo vytvořil slabé vizuální popisy?** Tentýž fallback: body = VO excerpt; opening/closing = český prefix + hook/excerpt. Ne LLM.
3. **Vidíme v UI skutečný obsah posílaný Runway?** Ano, v `<details>Technický provider prompt</details>`. Hlavní pole je totéž bez boilerplate. Bohatší Claude storyboard v T2V UI **není**.
4. **Co přesně Runway dostane?** `POST /v1/text_to_video`, model `gen4.5`, `promptText` = uložený provider_prompt, `ratio` `720:1280`, `duration` 4 (před hlasem), per-scene `seed`, bez audia, bez reference image.
5. **Co se stane po editaci vizuální představy?** Jen po **Uložit** u scény: přepíše visual + provider_prompt té scény, draft, nový fingerprint, unapprove. Bez toho tlačítka se nic neuloží.
6. **Zachová se editace po Save, Approve a Continue?** Package Save visual textarea **neukládá**. Uložená scéna přežije Save (VO beze změny). Approve plán **přestaví**, ale `human_visual_edit` drží podle **indexu**. Continue zamkne plán 1:1 — pokud byl approved a fingerprint sedí.
7. **Co se stane po změně voiceoveru?** Claude přeloží do EN preview, celý T2V plán se přestaví z nového EN textu, počet scén se může změnit, `video.script` se přepíše VO, Approve se ruší.
8. **Používáme už existující video concept/storyboard?** **Ne.** Jsou uložené a T2V planner je nečte. T2V UI still intents schovává.
9. **Existuje skutečná vizuální kontinuita?** **Ne.**
10. **Je současný návrh vhodný k prvnímu placenému běhu?** **Ne.**
11. **Minimální nutná oprava?** Naplnit 4–5 scén z existujícího Claude storyboardu, ukázat je operátorovi, EN prompt bez VO fallbacku, nespouštět Continue na 7 větných klipů.
12. **Dlouhodobě správná oprava?** Planner vizuálních událostí (4–5) z Product Brain + concept + brand, lidský návrh, bezpečný provider prompt po editaci, kontinuita, neštěpit VO na věty.
13. **Proběhl během auditu provider request?** **Ne.**
14. **Změnil audit systém?** **Ne** (kód, DB, config, UI beze změny). Jediný výstup je tento soubor.
15. **Blocker před implementací?** Žádný datový blocker: package, 7scénový plán, 5scénový storyboard i CR draft jsou čitelné. Produktový blocker před placeným během: neschvalovat tento plán v dnešní podobě.
