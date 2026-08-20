# Creative Review T2V page audit

Read-only audit první produkční Text-to-Video package na stránce Creative Review.

**Rozsah:** kód + uložená data. Žádné opravy, žádný zápis do DB, žádný OpenAI / ElevenLabs / Runway request.

**Identita package**

| Položka | Hodnota |
|---|---|
| Project | fenrik Studio (`163c1822-ad30-4cee-8826-dfacd9c188b9`) |
| Run | `9a3cc0cb-f726-4b92-aaf5-eb67a89599d7` |
| Run status | `waiting_for_creative_review` |
| Generation mode | `manual_review` |
| Editor language (run config) | `cs` (UI: Czech) |
| Package video mode | `text_to_video` |
| Package | The Reply That Never Came (`a38b2fa0-9634-4d4f-b750-05308b019bee`) |
| Creative Review | `status=ready`, `approved=false`, `version=1` |
| T2V plán | `status=draft`, `repetition.status=passed` |
| History | pouze `seed` (operátor nic neuložil) |

---

| Část stránky | Co znamená | Co ovlivní | Placené? |
|---|---|---|---|
| Editor language Czech | Jazyk operátora pro Localized / Creative Intent. Není project language a není Voice ID jazyk. | Překlad Original → Localized při seedu; cílový jazyk Save překladu. **Nepřepíná** ElevenLabs Voice map. | Ne (už zaplaceno při generaci) |
| Original (voiceover) | Neměnný AI voiceover z generace (EN). | Historie / porovnání délky. Nejde do ElevenLabs. | Ne |
| Localized (voiceover) | Editovatelný voiceover v editor language (CS). Stává se `final_approved` po aktuálním English preview. | Po Continue: `voiceover_text`, titulky, hook, ElevenLabs mluvený text. | Save může spustit LLM překlad do EN preview. ElevenLabs/Runway ne. |
| English Preview (voiceover) | Automatický EN překlad Localized. Ověření významu. | Still image rebuild **nepoužívá** VO preview. T2V ElevenLabs **nepoužívá** tento text. | LLM při seedu / Save |
| Final Approved | Kopie Localized, když je EN preview current. Schválený mluvený význam. | Continue zkopíruje do `package_brief.voiceover_text` / `subtitles` / `video.script`. | Ne do kliknutí Continue |
| EN: Current / VO: Edited / English preview current | Stavové badge. Current = preview existuje a není outdated. Edited = Localized ≠ Original. | Approve Package vyžaduje current EN. Edited neschvaluje nic samo. | Ne |
| Jazyk hlasu: english | Informativní label z `package_brief.language` = `en` (project language). | ElevenLabs Voice ID bucket (`en` vs `cs`). **Nesleduje** Localized/Final Approved. | Ne |
| Hook | První věta generovaného EN hooku / `plan.approved_hook`. Není editovatelný. | Repetition check + fingerprint plánu. Po Continue se přepíše z Final Approved. | Ne |
| Plan status `draft` | T2V plán není schválený. Manual Review auto-approve vypíná. | Continue server gate vyžaduje `approved`. Worker ElevenLabs taky. | Ne |
| Repetition `passed` | Normalizovaná textová shoda hooku/fingerprintu/úvodního vizuálu prošla. | Continue a paid preflight. Není sémantická originalita. | Ne |
| Music `none` | Žádná ElevenLabs Music. | Hudba se negeneruje. Odhad hudby $0. | Ne |
| Cost estimate $1,84 | UI odhad: EN `voiceover_text` + 5× Runway 3 s + SFX custom + music. | Informativní. Není billing. | Ne |
| Horní Scéna 1–5 | T2V creative plan. Rozdělení VO, timing odhad, lidská vizuální představa → `provider_prompt`. | Runway `promptText`. Timing po ElevenLabs přepíše alignment. | Uložení ne. Runway až worker. |
| Zvuk scény | Per-scene SFX plán. Prázdné `scene_sound` UI ukazuje Auto. | ElevenLabs SFX jen `mode=custom`. Auto/none = 0 efektů. | Uložení ne. SFX až audio fáze workeru. |
| Hlasová režie / vlastní instrukce | Delivery style + volitelný text. Mapuje se na Eleven v3 tag. | Prefix/tagy v `synthesis_text`. Nemění mluvená slova. | Uložení ne. Ovlivní ElevenLabs POST. |
| Spodní Creative Intent | Still/image scény (IMAGE / Generated). Lidský děj pro still rebuild. | Continue přepíše `visual_scenes[].image_prompt`. **Nevstupuje do T2V plánu ani Runway.** | Save může LLM. Image gen jen still pipeline. |
| Director Notes | Operátorské poznámky. Prázdné. | Non-empty **zablokuje** still rebuild. T2V je ignoruje. | Ne |
| Save / Discard | Uloží Localized + Creative Intent + notes; Discard jen UI. | Invalidace EN preview, fingerprintů, T2V plánu při změně VO. | Save: LLM překlad. Ne ElevenLabs/Runway. |
| Approve Package | `creative_review.approved=true`. **Neschvaluje T2V plán.** | Odemkne UI Continue. Server Continue ale dál vyžaduje `plan.status=approved`. | Ne |
| Continue Generation | První tlačítko, které smí vytvořit `video_jobs` a později worker POST. | Rebuild + (teoreticky) ElevenLabs + Runway. | **Ano** (po workeru). Teď disabled. |
| Cancel Manual Review | Trvale zruší run. Bez video jobs. | Continue navždy disabled. | Ne |

---

## 1. Mapování každého pole

Zkratky zdrojů:

- `CR` = `content_packages.package_brief.creative_review`
- `Plan` = `package_brief.video_text_to_video_creative_plan`
- `Sound` = `package_brief.video_text_to_video_sound_plan`
- `Integrity` = `package_brief.video_creative_integrity`
- `Job` = `video_jobs.input` (zatím neexistuje)

### 1.1 Horní meta a status

| Pole (UI) | Uživatelský význam | Datový zdroj / cesta | Informativní / editovatelné | Ukládá | Invaliduje | ElevenLabs | Runway | Titulky | Pouze still |
|---|---|---|---|---|---|---|---|---|---|
| Editor Language | Jazyk, ve kterém operátor čte/edituje Localized. | `production_runs.requested_config.config.editorLanguage` = `cs`. Ne `projects.language`. | Informativní | — | — | Ne | Ne | Ne | Ne (řídí překlad obou vrstev) |
| Status: Ready | CR je připravený ke schválení, ale neschválený. | `CR.status` z `computeCreativeReviewStatus` | Informativní | — | — | Nepřímo: Continue vyžaduje Approved | Nepřímo | Nepřímo | Ready platí i pro still |
| EN: Current | English preview VO i scén je current. | `CR.voiceover.english_confirmed` + `!english_preview_outdated` | Informativní | Seed / Save+translate | Localized edit | Ne | Ne | Ne | Gate Approve |
| VO: Edited | Localized ≠ Original. | `localized_edit !== original_ai` | Informativní | — | — | Ne | Ne | Ne | Ne |
| English preview current | Stejné jako EN Current v body. | viz výše | Informativní | — | — | Ne | Ne | Ne | Ne |
| Version 1 | Počet CR mutací. | `CR.version` | Informativní | Save/Approve bump | Optimistic lock | Ne | Ne | Ne | Ne |
| Validation OK | Schema `creative_review` validní. | parse při loadu | Informativní | — | — | Ne | Ne | Ne | Ne |

### 1.2 Voiceover

| Pole (UI) | Uživatelský význam | Datový zdroj / cesta | Informativní / editovatelné | Ukládá | Invaliduje | ElevenLabs | Runway | Titulky | Pouze still |
|---|---|---|---|---|---|---|---|---|---|
| Original | Původní AI VO (EN). | `CR.voiceover.original_ai` = seed z `package_brief.voiceover_text` | Read-only | — | — | Ne | Ne | Ne | Ne |
| Localized | Operátorův VO v češtině. | `CR.voiceover.localized_edit` | Editovatelné, dokud neschváleno | **Save** | EN preview, `final_approved`, approval, VO fingerprinty, T2V plán → `stale` | **Ano po Continue** (přes `final_approved` → `voiceover_text`) | Ne přímo (jen timing po TTS) | **Ano po Continue** (`subtitles` + alignment SRT) | Ne |
| English Preview | EN překlad Localized. | `CR.voiceover.english_preview` | Read-only | Automaticky seed / Save | Při změně Localized se maže | **Ne.** Worker čte `brief.voiceover_text`, ne preview. | Ne | Ne jako zdroj | Still nepoužívá VO preview |
| Final Approved | Schválený mluvený text = Localized, když je preview current. | `CR.voiceover.final_approved` | Read-only | Seed/translate nastaví `= localized_edit` | Vyprázdní se při Localized edit | **Ano — toto je určený TTS zdroj po rebuild** | Ne | Ano (rebuild kopíruje do `subtitles`) | Stejné pole i pro still TTS |
| Duration Original / Estimated | Varování délky (slova / WPS). | `original_ai` vs aktuální Localized v UI | Informativní | Neukládá se | — | Ne | Ne | Ne | Ne |

Aktuální uložené texty:

- **Original / `package_brief.voiceover_text` / `subtitles`:** anglický generovaný VO.
- **Localized / Final Approved:** český překlad (seed).
- **English Preview:** nový anglický překlad češtiny — **není identický** s Original.

### 1.3 Generated video plan (T2V)

| Pole (UI) | Uživatelský význam | Datový zdroj / cesta | Informativní / editovatelné | Ukládá | Invaliduje | ElevenLabs | Runway | Titulky | Pouze still |
|---|---|---|---|---|---|---|---|---|---|
| Hook | Hook videa. | `package_brief.hook` else `Plan.approved_hook` | Informativní | Generace / Continue rebuild | Změna VO označí hook stale | Ne | Ne | Ne | Ne |
| Plán: draft | Plán čeká na schválení. | `Plan.status` | Informativní | Auto-approve jen mimo manual_review; Continue by schválil až po gate | Scene save → `draft`; VO save → `stale` | Worker vyžaduje `approved` | Worker vyžaduje approved + measured timing | Ne | T2V only |
| Opakování: passed | Textová anti-repetition prošla. | `Plan.repetition.status` | Informativní | attach / Uložit scénu reevaluate | Scene save resetuje na `not_run` pak znovu zkontroluje | Gate | Gate | Ne | T2V only |
| Hudba: none | Bez generated music. | `Sound.music.mode` | UI music selector **není** (jen scény). Změna music argumentem API existuje, panel ji neposílá. | Generace `proposeAutoSoundPlanFromCreativePlan` | Sound save | Music POST jen `eleven_generated`/`auto` s licencí | Ne | Ne | T2V only |
| Odhad USD | Hrubý odhad. | `voiceover_text`.length + 5× Gen-4.5 @ 3 s + custom SFX + music | Informativní | — | — | Část hlas | Část video | Ne | T2V only |
| Jazyk hlasu | EN/CS Voice map. | `package_brief.language` else `presentation_generation.language` | Informativní | Generace / job stamp | Editor language ho nemění | **Ano — bucket EN vs CS** | Ne | Ne | T2V (still má vlastní TTS) |
| Kategorie hlasu | ženský/mužský/default z OpenAI voice. | `tts_voice` / `selected_voice` na briefu | Informativní; **teď null** (hlas se stampne až v `buildVideoJobInput`) | Continue job create | — | Gender bucket | Ne | Ne | Ne |
| Hlasová režie | Delivery style. | `package_brief.video_voice_direction.style` = `auto` | Editovatelné | **Uložit hlasovou režii** | `audio_timing_status`, plán `stale`, revision++ | Tag `[confident]` pro `auto` | Ne | Ne | T2V (+ still timing invalidace) |
| Vlastní instrukce | Volný text. | `video_voice_direction.custom_instruction` | Editovatelné | **Uložit hlasovou režii** | stejné | Jen pokud keyword namapuje whitelist tag; jinak diagnostic `custom_instruction_unmapped` | Ne | Ne | T2V |

### 1.4 Horní bloky Scéna 1–5

Zdroj: `Plan.scenes[]`. UI id `scene.sceneId` (hash, ne `scene-1`).

| Pole (UI) | Uživatelský význam | Cesta | Informativní / editovatelné | Ukládá | Invaliduje | ElevenLabs | Runway | Titulky | Pouze still |
|---|---|---|---|---|---|---|---|---|---|
| Text nad vizuální představou | Lidský význam scény / VO excerpt. | `Plan.scenes[].human_meaning` (zobrazeno); VO split je `voiceover_excerpt` | Informativní. **Nelze editovat.** | Staví se při `buildTextToVideoCreativePlan` z `voiceover_text` | Rebuild plánu (Continue attach **přepíše**) | Nepřímo: excerpt je z VO, který TTS čte celý | Ne text excerptu | Alignment později řeže timing | T2V |
| Vizuální představa | Lidský popis záběru. | `human_visual_edit` else `visual_intent` | Editovatelné (`defaultValue`, není v dirty Save) | **Uložit scénu** | `provider_prompt` se přepočte; plan `draft`; repetition re-check; integrity visual/plan stale | Ne | **Ano** — odvozený `provider_prompt` = Runway `promptText` | Ne | T2V |
| Zvuk scény (auto/none/custom) | Režim SFX. | `Sound.scene_sound[scene_id].mode`; chybí-li, UI ukáže **auto** | Editovatelné | **Uložit zvuk scény** | Assembly fingerprint | SFX POST jen `custom` | Ne | Ne | T2V |
| Popis efektu | Věta pro ElevenLabs SFX. | `custom_effect_description` | Editovatelné při custom | **Uložit zvuk scény** | Assembly | Ano pokud custom | Ne | Ne | T2V |
| Umístění efektu | Kam SFX sedí. | `anchor` (default UI `scene_beginning`) | Editovatelné | **Uložit zvuk scény** | Assembly | Timing SFX | Ne | Fráze jen pokud `voice_phrase` | T2V |
| Fráze ve voiceoveru | Kotva SFX na slova. | `voice_phrase` | Editovatelné | **Uložit zvuk scény**; validace proti **`package_brief.voiceover_text` (EN)**, ne proti Localized CS | Assembly | Alignment lookup | Ne | Musí být unique substring schváleného VO | T2V |
| `provider_prompt` | Technický Runway prompt. | `Plan.scenes[].provider_prompt` | **Není v UI.** Odvozuje se z vizuální představy + energy + role. | Uložit scénu / build plánu | — | Ne | **Ano — toto je prompt** | Ne | T2V |
| Timing `approximate_*` | Odhad 24 s / N scén (teď 4,8 s). | `Plan.scenes[].approximate_*`, `timing_status=estimated` | Informativní | Po TTS přepíše alignment | VO/direction change | Alignment měří | Trim délka klipu | Cue times | T2V |

### 1.5 Spodní Creative Intent Scene 1–5

Zdroj: `CR.scenes[]` id `scene-1` … `scene-5`. **Jiné id než T2V scény.**

| Pole (UI) | Uživatelský význam | Cesta | Informativní / editovatelné | Ukládá | Invaliduje | ElevenLabs | Runway | Titulky | Pouze still |
|---|---|---|---|---|---|---|---|---|---|
| IMAGE / Generated | Typ still scény. | `intent.presentation_type` = `IMAGE`, `visual_source` = `generated` | Informativní | Seed z `visual_scenes` | — | Ne | Ne | Ne | **Ano** |
| Original | AI Creative Intent (EN). | `intent.original` | Read-only | Seed (`generateSceneCreativeIntents`) | — | Ne | Ne | Ne | **Ano** (zdroj still popisu) |
| Localized | Operátorův děj v CS. | `intent.localized_edit` | Editovatelné | **Save** | EN preview scény; approval; `invalidateVisualPlanOnSceneEdit` (T2V plan draft, **bez změny T2V vizuálu**) | Ne | **Ne** | Ne | **Ano** — Continue still rebuild použije EN preview |
| English Preview | EN překlad Localized. | `intent.english_preview` | Read-only | Seed / Save | — | Ne | Ne | Ne | **Ano** — `composeRebuiltImagePrompt` | 
| Director Notes | Poznámky režie. | `director_notes` = `""` | Editovatelné | **Save** | Non-empty **fail-closed** still rebuild (`cannot inject localized Director Notes`) | Ne | Ne | Ne | **Ano** (T2V ignoruje) |

### 1.6 Další uložená pole, která UI neukazuje, ale produkce je čte

| Pole | Cesta | Role v produkci |
|---|---|---|
| `package_brief.voiceover_text` | Stále **EN Original** | Worker ElevenLabs čte **toto**, ne CR, dokud Continue nezkopíruje Final Approved. |
| `package_brief.language` | `en` | Voice ID language. |
| `package_brief.tts_voice` | `null` | Chybí; Continue `buildVideoJobInput` stampne z project resolveru (default OpenAI `alloy` → EN **default** bucket). |
| `video_creative_integrity` | viz §5 | Paid preflight. `plan_sync` / `visual_plan` / `audio_timing` = **stale**. `hook` / `subtitles` = current vůči EN VO, ne vůči CS. |
| `video_paid_preflight` | `confirm_paid_run=true`, `max_budget_usd=6`, similarity `passed` | Run config `textToVideoConfirmPaidRun` / budget. |
| `visual_scenes[0..4]` | 5× `source=ai` s `image_prompt` | Still pipeline. T2V worker je jako Runway prompt **nepoužije**. |
| `creative_review_reason` | `manual_mode` | Očekávané čekání, ne repetition banner. |

---

## 2. Jazykový workflow (runtime, ne názvy UI)

### 2.1 Seed (už proběhl)

1. Package se vygeneruje v **project language `en`**. `voiceover_text`, `hook`, `subtitles` = EN.
2. `buildManualReviewCreativeReview` vezme EN `voiceover_text` → `original_ai`.
3. `translateCreativeReviewForEditor` přeloží Original → Localized (**Czech**), pak Localized → English Preview.
4. `final_approved = localized_edit` (čeština). `english_confirmed=true`. Status `ready`.
5. T2V plán se staví z **`voiceover_text` (EN)**, ne z Localized. Proto horní scény citují anglický VO.

Doložení: `lib/creative-review/seed.ts`, `lib/creative-review/translateVoiceover.ts`, `lib/content-package/attachTextToVideoCreativePlan.ts` (`voiceoverText: vo` z `brief.voiceover_text`).

### 2.2 Je čeština jen pro operátora?

**Ne jako celek.** Editor language **je** operátorská vrstva pro editaci. Ale `final_approved` je Localized a Continue rebuild **úmyslně** nastaví:

```
pkg.voiceover_text = finalApproved
pkg.subtitles = finalApproved
pkg.hook = first line of finalApproved
pkg.video.script = finalApproved
```

(`rebuildCreativePackageForVideo` v `lib/creative-review/rebuildCreativePackage.ts`)

Komentář v tom souboru: *TTS uses voiceover.final_approved (localized).*

České Localized je tedy **určený produkční mluvený text**, ne jen UI pomůcka.

### 2.3 Převádí se české úpravy zpět do English Preview?

**Ano, ale jen jako ověřovací překlad.** Save po změně Localized volá `translateCreativeReviewEnglishPreviews` (Localized → EN). Výsledek se **nevrací** do `original_ai` a **nenahrazuje** `package_brief.voiceover_text` až do Continue.

Aktuální English Preview už **není** Original (round-trip).

### 2.4 Který text je významově schválený?

Operátor schvaluje **Localized** (CS). English Preview je kontrola, že CS znamená totéž. `final_approved` = Localized.

### 2.5 Co přesně dostane ElevenLabs?

Worker: `runTextToVideoElevenLabsVoicePhase` → `buildSynthesisContext`:

1. `vo = brief.voiceover_text.trim()`
2. musí sedět `plan.voiceover_revision_id`
3. `buildElevenV3SynthesisText({ approvedVoiceover: vo, direction })`
4. POST text = `synthesis_text` = whitelist tag + `vo` (mluvená slova = `vo`)

**Teď (před Continue):** kdyby worker běžel na současném briefu, četl by **anglický** `voiceover_text`. Worker ale nesmí běžet: plán je `draft`, CR není approved, video job neexistuje.

**Po Continue (navržený tok):** `vo` = **český Final Approved**. Tag např. `[confident] ` + český text.

English Preview **se do ElevenLabs neposílá**.

### 2.6 Odpovídá `Jazyk hlasu: english` provider textu?

**Teď v datech:** label `english` odpovídá uloženému `voiceover_text` (EN) a `projects.language=en`.

**Po Continue podle kódu:** mluvený text bude **CS**, language stamp zůstane **`en`**, pokud ho rebuild nemění (nemění). Voice resolver:

```
resolveAuthoritativeT2vVoiceLanguage(jobInput / brief.language) → "en"
resolveElevenLabsVoiceId({ language: "en", openAiSelectedVoice })
```

→ **EN Voice ID bucket**, ne CS.

`Jazyk hlasu: english` **neodpovídá** schválenému Localized a **nebude odpovídat** textu, který Continue předá ElevenLabs.

Editor language Czech **nepřepíná** Voice map.

### 2.7 EN vs CS Voice ID

| Vrstva | Hodnota |
|---|---|
| Project language | `en` |
| Package `language` | `en` |
| Editor language | `cs` |
| Stamp po Continue | `en` (z project language v `buildVideoJobInput`) |
| OpenAI voice stamp | brief `tts_voice` teď `null`; Continue resolver bez presentation preference → default `alloy` |
| Gender hint `alloy` | `neutral` |
| Bucket | **EN / default** (`ELEVENLABS_VOICE_ID_EN_DEFAULT`, fallback legacy global default) |

Skutečné Voice ID se v auditu nevypisuje.

### 2.8 `EN: Current`, `VO: Edited`, `English preview current`

Z `CreativeReviewPackagePanel.tsx`:

- **EN: Current** = VO preview i všechny scene intent preview existují a `english_preview_outdated=false`.
- **VO: Edited** = `localized_edit !== original_ai`. Tady true, protože seed přeložil EN → CS. **Neznamená**, že operátor ručně editoval (history má jen `seed`).
- **English preview current** = totéž co EN Current v status odstavci.

Approve Package je disabled jen když `englishOutdated` nebo unsaved dirty nebo pending. **Teď enabled.**

### 2.9 Je package jazykově konzistentní?

**Ne.**

| Kanál | Jazyk teď |
|---|---|
| Operátor Localized / Final Approved | CS |
| English Preview | EN (nový překlad) |
| `voiceover_text` / titulky / hook / T2V excerpts / provider_prompt mix | EN (+ české šablony „Úvod podporující hook…“) |
| Voice language label / Voice ID | EN |
| Creative Intent Localized | CS |
| Creative Intent EN preview | EN |
| T2V vizuální představy | EN excerpt / české default šablony |

To není „čeština jen pro operátora“. Dva runtime jazyky žijí vedle sebe a Continue je **nesjednotí** (sjednotí mluvený text na CS, Voice ID nechá EN).

---

## 3. Horní scény vs. Creative Intent

Nejsou dvě zobrazení téhož. Jsou **dvě pipeline**.

### 3.1 Horní Scéna 1–5 (T2V plán)

Staví `buildTextToVideoCreativePlan` z `voiceover_text`:

- split na věty → seskupení (tady 5 skupin po ~2 větách)
- `voiceover_excerpt` = skupina
- `human_meaning` / default `human_visual_edit` = šablona z excerpt/hook
- `provider_prompt` = `composeTextToVideoProviderPrompt` (Photoreal 9:16 + Visual intent + Energy + role + no text in frame)

Uložení vizuálu: `applyHumanVisualEditToScene` přepíše `human_visual_edit`, `visual_intent` a znovu složí `provider_prompt`. Operátor **nemusí** (a nemůže v UI) editovat technický prompt.

### 3.2 Spodní Creative Intent (still)

Staví `generateSceneCreativeIntents` z `visual_scenes` / image prompts → lidský děj. Localized/EN preview. Continue `rebuildCreativePackageForVideo` pro `source=ai` složí **image_prompt** z `intent.english_preview` + Visual Identity. T2V `buildTextToVideoCreativePlan` **`existingScenes` z CR nečte**.

### 3.3 Odpovědi

1. **Rozdělení voiceoveru a timing**  
   **Horní T2V plán.** Excerpty + `approximate_*`. Po ElevenLabs `applyAlignmentMeasuredTimingToPlan`. Spodní Intent timing **nemá**.

2. **Skutečný děj Runway scény**  
   **Horní `human_visual_edit` → `provider_prompt` → Runway `promptText`.**  
   `lib/text-to-video/runwayExecutionPlan.ts` `providerPrompt: scene.provider_prompt`  
   `textToVideoRunwayExecutor.ts` `promptText: item.providerPrompt`  
   `buildRunwayTextToVideoBody` posílá `promptText`.

3. **Co z každé sady jde do provider promptu**  
   - Horní: celý `provider_prompt` (odvozený z vizuální představy, ne z `human_meaning` samotného).  
   - Spodní: `english_preview` → still `image_prompt`. Do Runway **nic**.  
   - Director notes: do Runway nic; do still jen pokud by byly EN a nonempty — nonempty CS **fail**.

4. **Je spodní Creative Intent pozůstatek still pipeline?**  
   **Ano pro T2V produkci obrazu.** Zůstává povinný proto, že Approve/Continue stále vyžadují kompletní CR scény s current EN preview (still rebuild contract). Pro Runway je editorial/audit vrstva, ne prompt.

5. **Používá T2V plán spodní Creative Intent jako vstup?**  
   **Ne.** `attachTextToVideoCreativePlanToBrief` volá `buildTextToVideoCreativePlan` bez `existingScenes` z CR. Ani `human_meaning` Intentu se do plánu nekopíruje.

6. **Slučování**  
   Neslučují se. Jediné křížení: Save spodního Intentu volá `invalidateVisualPlanOnSceneEdit` → T2V plan `draft` + repetition `not_run`, **aniž by změnil** T2V vizuál. Dvě id sady (`e681679311c3` vs `scene-1`).

7. **Chce-li operátor zásadně jiný záběr**  
   Editovat **Vizuální představa** nahoře a **Uložit scénu**. Ne Creative Intent (to změní jen still image_prompt). Ne Director Notes.

8. **Technický prompt, nebo lidská představa?**  
   **Pouze lidskou vizuální představu.** Technický prompt UI neskrývá omylem — nikdy se needituje; `composeTextToVideoProviderPrompt` ho složí.

---

## 4. Mapování tlačítek

Všechna mutace jen při `run.status === waiting_for_creative_review`. Jinak `immutable_status`.

### 4.1 Uložit hlasovou režii

- **Účinek:** `saveCreativeReviewVoiceDirection` → `video_voice_direction` s `revision+1`; `invalidateAudioTimingOnVoiceDirectionChange`; plán `status=stale`.
- **DB:** `content_packages.package_brief` (direction + integrity + plan status). CR version **nebumpá**.
- **LLM:** ne. **ElevenLabs/Runway:** ne.
- **Cena:** 0.
- **Aktivace:** editable && !pending. Nehlídá dirty CR Save.
- **Retry / dvojklik:** další revision; idempotentní obsahově, ale revision a stale příznaky se znovu zapíšou. Bez provider POST.
- **Bezpečně opakovat:** ano.

### 4.2 Uložit scénu

- **Účinek:** `applyHumanVisualEditToScene` + repetition reevaluate; zapíše nový `provider_prompt`; integrity visual/plan stale.
- **DB:** `video_text_to_video_creative_plan` + integrity + `video_paid_preflight.similarity_check_status`.
- **LLM:** ne (deterministický prompt compose). **Provider video:** ne.
- **Cena:** 0.
- **Aktivace:** non-empty trim; jinak click no-op.
- **Retry:** přepíše tutéž scénu; fingerprint se změní. Dvojklik = dva zápisy, stejný výsledek pokud text stejný.
- **Dirty/unsaved guard Continue toto nehlídá** (`defaultValue`). Neuložený text v textarea se zahodí reloadem.

### 4.3 Uložit zvuk scény

- **Účinek:** `video_text_to_video_sound_plan.scene_sound[sceneId]`; `bumpSoundPlanRevision`; `invalidateAssemblyOnSoundPlanChange`.
- **Validace:** `custom` vyžaduje popis; `voice_phrase` musí být unique substring **`voiceover_text` (EN teď)**.
- **LLM / ElevenLabs / Runway:** ne.
- **Cena:** 0 teď; custom později SFX.
- **Music:** UI music neposílá; `music` zůstane `none`.
- **Retry:** revision++. Bezpečné.

### 4.4 Save

- **Účinek:** `commitCreativeReviewSave` (Localized + Intent + notes) → pokud EN outdated, **LLM** `translateCreativeReviewEnglishPreviews` → `commitCreativeReviewTranslate` (`final_approved = localized_edit`, `english_confirmed=true`). Version + history `save` a případně `translate`.
- **DB:** `package_brief.creative_review`. Při změně VO: integrity + plán `stale`. **`voiceover_text` se nepřepíše.**
- **ElevenLabs/Runway:** ne.
- **Cena:** copywriting LLM, ne Eleven/Runway.
- **Aktivace:** `dirty && !approved`. Dirty = Localized / Intent / notes. **Ne T2V pole.**
- **Retry:** `expectedVersion` — druhý klik se starou verzí → `version_conflict`. Po úspěchu `dirty=false`, tlačítko disabled.
- **Bezpečně opakovat:** ano, dokud není conflict.

### 4.5 Discard

- **Účinek:** jen client reset na poslední server CR. **Žádný DB zápis.** T2V `defaultValue` pole **neobnoví**.
- **Provider:** ne. **Cena:** 0.
- **Aktivace:** CR dirty.

### 4.6 Approve Package

- **Účinek:** `commitCreativeReviewApprove` → `CR.approved=true`, `status=approved`, history `approve`. **T2V `Plan.status` zůstane `draft`.**
- **DB:** jen `creative_review`.
- **LLM / ElevenLabs / Runway:** ne.
- **Cena:** 0.
- **Aktivace teď:** enabled (`canRunWorkflow && !englishOutdated`).
- **Disabled kdy:** unsaved CR, pending, outdated EN, readOnly, už approved (pak Unapprove).
- **Retry:** po success Unapprove; dvojklik se starou version → conflict.
- **Gate serveru:** `validateCreativeReviewApproval` (EN current, final_approved nonempty, scény complete). **Nekontroluje T2V plan approved.**

### 4.7 Continue Generation

- **Účinek (kód):** claim run → `validatePackagesReadyForContinue` → rebuild still+spoken fields → `attachTextToVideoCreativePlanToBrief` (**nový plán z `voiceover_text`**, bez zachování `human_visual_edit`) → `approveTextToVideoCreativePlan` → `buildVideoJobInput` → insert `video_jobs` queued → dispatch worker.
- **První místo, kde smí vzniknout video job a později placený POST.**
- **LLM:** ne v Continue samotném (rebuild je deterministický). Seed LLM už proběhl.
- **ElevenLabs/Runway:** ne v request handleru; **ano ve workeru** po dispatchi.
- **Cena:** po workeru TTS + 5× Runway (+ SFX/music podle plánu).
- **Aktivace UI:** všechny package Approved, žádné unsaved CR, status waiting. **Teď disabled** (0/1 approved).
- **Server gate navíc:** T2V `plan.status === "approved"` && `repetition === "passed"`. Approve Package to nesplní → **Continue po Approve selže** s `text-to-video plan must be approved with repetition passed`.
- **Retry / dvojklik:** unique video job; `already_continued` ověří/re-dispatch. Bezpečné proti duplicitnímu insertu; worker má claim na synthesis/attempts.

### 4.8 Cancel Manual Review

- **Účinek:** run `cancelled`, history `manual_review_cancelled`, Continue disabled natrvalo. Packages/CR zůstanou.
- **Video jobs:** nevytváří. **Provider:** ne.
- **Cena:** 0.
- **Aktivace:** `generationMode=manual_review` && waiting && !cancelling. Confirm dialog.
- **Retry:** `already_cancelled` pokud už zrušeno.

---

## 5. Aktuální stav tohoto package

### 5.1 Proč je plan `draft`

`attachTextToVideoCreativePlanToBrief` auto-schválí plán jen když **neplatí** `defersVideoUntilCreativeReview(generationMode)`. Manual Review **defers** → plán zůstane `draft` i při `repetition.passed`.

`approveCreativeReviewPackage` plán neschvaluje. UI nemá „Approve plan“.

### 5.2 Proč je package Ready, ale ne Approved

`computeCreativeReviewStatus`: Ready = EN confirmed + current previews + nonempty Localized/final_approved + complete scenes, **a** `approved=false`.

Seed už splnil Ready. Operátor neschválil. History: jediný event `seed`.

### 5.3 Proč je Approve Package případně disabled

**Teď disabled není.** Disabled by byl při unsaved Localized/Intent, pending requestu, outdated EN, nebo read-only runu.

Continue **je** disabled, dokud `approved < total`.

### 5.4 Co ještě uložit / schválit

Operátor **nemusí** Save (nic není dirty; seed je current). Musí:

1. Rozhodnout jazyk mluveného textu (CS Final Approved vs EN Original) — kód po Continue vezme CS.
2. Upravit horní vizuály, pokud default šablony nestačí, a Uložit scénu.
3. Approve Package — CR flag.
4. I potom Continue **kódově neprojde**, dokud někdo neschválí T2V plán (chybějící wiring).

### 5.5 Integrity fingerprinty

| Pole | Stav | Proč |
|---|---|---|
| `hook_status` | current | EN hook fingerprint = plan; VO revision = plan (EN `voiceover_text`) |
| `subtitles_status` | current | stejný EN VO revision |
| `visual_plan_status` | **stale** | `sync` vyžaduje `plan.status===approved` |
| `plan_sync_status` | **stale** | totéž + `creative_plan_fingerprint=null` |
| `audio_timing_status` | **stale** | timing `estimated`, žádný voice checkpoint |
| `approved_voiceover_text` | EN generovaný VO | **ne** CS Final Approved |

„Current“ hook/subtitles je vůči **EN generaci**, ne vůči schválené češtině.

### 5.6 Repetition

`passed`, `blocked_reasons=[]`, `checked_at=2026-08-20T10:17:28.677Z`. Banner repetition se nezobrazuje (`creative_review_reason=manual_mode`).

Je to normalizovaná textová shoda, ne sémantická originalita.

### 5.7 Hudba `none`

`Sound.music.mode=none`. `proposeAutoSoundPlanFromCreativePlan` nenašlo `sound_intent` na scénách (builder ho nestaví) → music none, `scene_sound={}`.

### 5.8 SFX $0 nebo se teprve navrhnou?

**Zůstanou $0**, pokud operátor nenastaví `custom`.

- UI ukazuje Auto, protože chybějící záznam fallbackuje na `auto`.
- `resolveSfxPlacements` **přeskakuje** `auto` i `none`. Efekty jen `custom`.
- Odhad sčítá jen `mode===custom`. Prázdný map → $0.00.

Žádný pozdější auto-návrh SFX v workeru z Intentu.

### 5.9 Odhad $1,84

UI:

```
voiceUsd = estimateElevenLabsTtsCostUsd(voiceover_text.length)  // 371 znaků EN
runwayUsd = 5 * estimateRunwayGen45SceneCostUsd(3)             // 12 credit/s × 3 × $0.01 × 5 = $1.80
sfxUsd = 0
musicUsd = 0
```

`371/1000 * $0.10 = $0.0371` → součet **$1.84**.

Nezahrnuje: LLM seed (už utraceno), tag znaky v `synthesis_text`, skutečnou Runway duration po trim (4,8 s estimated vs UI 3 s), CS délku po Continue, SFX/music kdyby se změnily. Není to strop `$6` budgetu.

### 5.10 Proběhl ElevenLabs nebo Runway POST?

Read-only počty:

| Tabulka | Řádky pro tento package |
|---|---|
| `video_jobs` | 0 |
| `text_to_video_voice_syntheses` | 0 |
| `text_to_video_audio_assets` | 0 |
| `scene_video_generation_attempts` | 0 |

**Žádný POST.** `production_run_items.video_job_id` je null.

### 5.11 Voice ID bucket

Až po Continue stamp: language **`en`**, OpenAI default **`alloy`** (project knowledge nemá presentation voice) → **EN default**.

### 5.12 Přesný voiceover text pro ElevenLabs

**Určený po Continue:** český `final_approved` / Localized (celý odstavec, viz CR). `synthesis_text` = `[confident] ` + tentýž odstavec (`style=auto`).

**Uložený brief teď:** anglický `voiceover_text` (Original). Worker by ho použil jen bez rebuild — ten tok se pro Manual Review nemá stát.

### 5.13 Pět uložených Runway `provider_prompt` (současný plán)

Tyto stringy jsou v DB teď. Runway je ještě nedostal. Continue `attachTextToVideoCreativePlanToBrief` **postaví nový plán z CS VO a tyto přepíše** (neposílá `existingScenes`).

1. `Photoreal marketing video clip, vertical 9:16. Visual intent: Výrazný vizuál podporující: Most people think a quiet feed only matters to the people already following them. Energy and motion: Immediate attention, bold motion Opening beat: immediate visual hook, no on-image readable text. No character dialogue, no lip-sync, no generated subtitles or logos in frame. No readable text in the video unless explicitly part of approved UI chrome.`
2. `… Visual intent: The highest-stakes audience for your feed is the stranger who just got your cold email. Before they reply, they check. … Story beat …`
3. `… Visual intent: Eight weeks of nothing? That's not neutral. … Story beat …`
4. `… Visual intent: That's an answer. A quiet feed doesn't say you're busy. … Story beat …`
5. `… Visual intent: Závěr a CTA: It says you're not showing up. And they move on without a word. … Closing beat …`

Po Continue by se `provider_prompt` znovu složil z default vizuálů nad **českými** excerpty a z hooku = první řádek Final Approved. Tento VO **nemá newline**, `hookFromFinalApproved` by tedy mohl nastavit **celý český odstavec jako hook**.

---

## 6. Hodnocení připravenosti

**Není bezpečné schválit a spustit Continue jako produkční T2V** — ne kvůli „operátor zapomněl Save“, ale kvůli jazykové roztržce a chybějícímu schválení T2V plánu.

- **Voiceover jazykově konzistentní?** Ne. Operátor schvaluje CS; TTS language stamp a současný plán jsou EN; Continue by četl CS text EN hlasem.
- **Horní vs spodní scény?** Dvě vrstvy. Horní = T2V/Runway. Spodní = still Creative Intent + Approve gate. Nejsou totéž.
- **Lidské úpravy s největším dopadem na kvalitu obrazu:** horní **Vizuální představa** + Uložit scénu.  
  **Na zvuk mluvený:** Localized + hlasová režie.  
  **Na SFX:** custom popis + Uložit zvuk scény.  
  Creative Intent / Director Notes T2V obraz **nezmění**.
- **Oprava kódu, nebo jen UI usage?**  
  Správné použití UI **nestačí** k dokončení první T2V produkce:
  1. Approve Package neschválí T2V plán, ale Continue to vyžaduje.
  2. Continue přestaví T2V plán a **smaže** uložené horní vizuály.
  3. Rebuild kopíruje CS Final Approved do TTS, Voice ID zůstane EN.
  4. Fráze SFX se validuje proti EN `voiceover_text` během review.
  5. Spodní Intent je povinný ke schválení, ačkoli Runway ho nečte.

Operátor může Localized/vizuály smysluplně upravit; **nesmí** čekat, že Approve+Continue v tomto stavu bezpečně spustí placené providery.

---

## Doložení (klíčové soubory)

- UI: `components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx`, `CreativeReviewWorkspace.tsx`
- CR domain: `lib/creative-review/{types,lifecycle,applyEdits,mutations,seed,translateVoiceover,rebuildCreativePackage}.ts`
- Admin write: `lib/api/creative-review-admin.ts`
- Continue: `lib/ai/workflows/continueCreativeReviewGeneration.ts`
- T2V plán / prompt: `lib/content-package/{textToVideoCreativePlan,textToVideoProviderPrompt,attachTextToVideoCreativePlan,videoCreativeIntegrity,textToVideoSoundPlan}.ts`
- ElevenLabs: `lib/text-to-video/voiceSynthesisService.ts`, `lib/elevenlabs/v3VoiceDirection.ts`, `lib/text-to-video/textToVideoAuthoritativeVoice.ts`, `lib/elevenlabs/voiceResolve.ts`
- Runway: `lib/text-to-video/{runwayExecutionPlan,textToVideoRunwayExecutor}.ts`, `lib/ai/runwayTextToVideoBody.ts`
- Worker: `lib/text-to-video/textToVideoWorkerPipeline.ts`

---

## Stručné odpovědi

1. **Co ElevenLabs skutečně přečte?**  
   Po Continue: český `final_approved` (Localized), s v3 tagem z hlasové režie (`auto` → `[confident]`). English Preview ne. Teď v briefu leží ještě EN `voiceover_text`; worker bez Continue nesmí běžet.

2. **Jaký jazykový Voice ID použije?**  
   **EN / default** (package+project language `en`, OpenAI default `alloy` → neutral). Ne CS map, přestože mluvený schválený text je CS.

3. **Co Runway skutečně dostane pro každou scénu?**  
   `promptText` = `Plan.scenes[].provider_prompt` (složený z horní vizuální představy). Ne Creative Intent. Uložené promptysou EN/hybrid šablony; Continue je pravděpodobně přepíše novým plánem.

4. **Horní scény vs spodní Creative Intent?**  
   Horní = T2V rozdělení VO, timing, Runway prompt. Spodní = still IMAGE intent + povinný Approve gate. Neslučují se.

5. **Jiný obraz?**  
   Horní **Vizuální představa** → Uložit scénu. Ne technický prompt. Ne spodní Intent.

6. **Jiný zvuk?**  
   Mluvený: Localized + Uložit hlasovou režii. SFX: custom + popis + Uložit zvuk scény. Hudba: teď `none`, UI ji nemění.

7. **Které tlačítko jako první způsobí placený provider request?**  
   **Continue Generation** (až worker: nejdřív ElevenLabs TTS, pak Runway). Save může stát LLM překlad, ne Eleven/Runway. Approve je zdarma.

8. **Je současný package připravený ke schválení?**  
   CR Ready ano, T2V produkce **ne**. Approve CR je UI-ready; Continue je zablokovaný plánem `draft` a jazykovou nekonzistencí.

9. **Proběhl při auditu jakýkoliv placený request?**  
   **Ne.**

10. **Změnil audit systém?**  
    **Ne.** Jen SELECT na DB a čtení kódu. Žádný zápis, žádný Save/Approve/Continue, žádný provider POST.
