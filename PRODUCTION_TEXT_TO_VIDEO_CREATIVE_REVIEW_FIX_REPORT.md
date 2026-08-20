# Production Text-to-Video — Creative Review Fix Report

Oprava existující T2V Creative Review cesty podle auditu a Step 1–5 reportů. **Žádný nový produkt. Žádný production run. Žádný OpenAI / Claude / ElevenLabs / Runway request.** Still/I2V workflow beze změny. Feature flagy a secrets beze změny. Žádná migrace.

Zastavený package `a38b2fa0-9634-4d4f-b750-05308b019bee` (run `9a3cc0cb-f726-4b92-aaf5-eb67a89599d7`) **nebyl obnoven**, nevznikl pro něj video job.

## 1. Skutečné příčiny (ověřeno v kódu)

| Problém | Příčina v implementaci |
| --- | --- |
| Čeština by šla do EN videa | `final_approved = localized_edit`. Continue `rebuildCreativePackageForVideo` kopíroval `final_approved` do `voiceover_text` / `subtitles` / `hook` / `video.script`. ElevenLabs čte `brief.voiceover_text`. Voice ID se bere z `package_brief.language=en`. |
| Dvě sady scén | Horní `video_text_to_video_creative_plan` řídí Runway. Spodní `creative_review.scenes` je still Creative Intent a T2V plán ji nečte. |
| Approve neschválil T2V plán | `Approve Package` nastavilo jen `creative_review.approved`. V `manual_review` zůstal plán `draft`. Continue vyžadoval `plan.status === "approved"`. |
| Continue přepsal scény | `rebuildAndPersistPackage` volal `attachTextToVideoCreativePlanToBrief` → `buildTextToVideoCreativePlan` bez `existingScenes`. Ruční vizuály zmizely. |
| Hook = celý odstavec | `deriveHookFromVoiceover` bral první řádek. Jednořádkový VO = celý text. |
| Cena po 3 s | UI volalo `estimateRunwayGen45SceneCostUsd(3)` × počet scén. Souběžně plán dělí `TEXT_TO_VIDEO_TARGET_MID_SECONDS` (24) rovnoměrně — při 8 scénách je každá scéna opravdu 3 s, ale až do změření hlasu. Runway POST používá `runwayProviderDurationFromRequiredTrim(scene.approximate_duration_seconds)`, ne hardcoded 3. |
| UI `Auto` u SFX | Chybějící `scene_sound` se zobrazovalo jako `auto`. Worker `resolveSfxPlacements` `auto` i `none` přeskočí — zvuk nevznikne. |
| Still musel zůstat | Still TTS dál používá `final_approved` (lokalizovaný text). T2V Continue už still rebuild nevolá. |

## 2. Změněné soubory

**Nové**

- `lib/creative-review/productionSpokenVoiceover.ts`
- `lib/content-package/textToVideoManualReview.ts`
- `lib/text-to-video/textToVideoOperatorBudget.ts`
- `scripts/check-production-text-to-video-creative-review-fix.ts`
- `PRODUCTION_TEXT_TO_VIDEO_CREATIVE_REVIEW_FIX_REPORT.md`

**Upravené**

- `lib/api/creative-review-admin.ts` — T2V Save/Approve, cena, SFX none, unapprove při změně scény/zvuku/režie
- `lib/ai/workflows/continueCreativeReviewGeneration.ts` — T2V Continue lock, bez rebuild plánu a bez still rebuild
- `lib/content-package/textToVideoCreativePlan.ts` — hook z první věty, `rebuildTextToVideoPlanPreservingSceneEdits`, lock helper
- `lib/creative-review/lifecycle.ts` + `mutations.ts` — `requireSceneIntent` pro T2V
- `lib/creative-review/index.ts` — export produkčního VO
- `lib/text-to-video/textToVideoSfxAnchoring.ts` — chybějící SFX = `none`
- `components/creative-review/CreativeReviewPackagePanel/*` — 4 sekce, jedna sada T2V scén, Bez zvukového efektu / Bez hudby
- `package.json` — npm script na nový check
- `scripts/check-production-text-to-video-step-2c.ts` — Continue lock string
- `scripts/check-creative-review-phase5.ts` — source scan přijímá `productionRunDefersVideoUntilCreativeReview`

Still rebuild (`rebuildCreativePackage.ts`), still UI Creative Intent, worker TTS/Runway/assembly a feature flagy **nezměněny**, kromě SFX fallbacku `auto` → `none` (chybějící záznam; explicitní `auto` se dál přeskočí).

## 3. Datový tok: česká editace → anglický ElevenLabs request

1. Operátor edituje **pracovní češtinu** (`voiceover.localized_edit`).
2. **Save** spustí stávající `translateCreativeReviewEnglishPreviews` (žádný druhý překladový lifecycle).
3. Aktuální `english_preview` je **produkční mluvený text**. `final_approved` zůstává lokalizovanou kopií (still kompatibilita), T2V ho **nepoužije**.
4. T2V Save při změně VO zapíše do briefu `voiceover_text` / `subtitles` / `hook` / `video.script` z `english_preview` a přestaví plán se zachováním vizuálů podle indexu.
5. Změna české verze zneplatní překlad (`english_preview_outdated`) i schválení.
6. **Approve Package** atomicky: aktuální EN VO, hook z první věty EN VO, hlasová režie, T2V plán (`status=approved` pokud repetition passed), sound plan (auto→none), integrity fingerprinty.
7. **Continue** nevolá LLM ani `attachTextToVideoCreativePlanToBrief`. Načte schválený plán, ověří fingerprinty. Neshoda → `t2v_production_translation_missing` / `t2v_plan_not_locked_for_continue` **před** ElevenLabs i Runway.
8. ElevenLabs čte `brief.voiceover_text` = schválená EN verze. Voice ID podle produkčního jazyka projektu (`en`).

## 4. T2V versus still UI

| | T2V | Still |
| --- | --- | --- |
| Voiceover | Pracovní CS + finální EN + stav překladu. `final_approved` skryté. | Localized + English Preview + Final approved beze změny. |
| Scény | Jen Runway plán: VO excerpt, délka, vizuální představa, SFX. Provider prompt v diagnostice. | Creative Intent (original / localized / EN / director notes). |
| Schválení | Jedno Approve schválí CR + T2V plán. Still scény nejsou povinné. | Approve dál vyžaduje kompletní scene intent. |
| Continue | Lock schváleného plánu, žádný still rebuild. | `rebuildCreativePackageForVideo` z `final_approved`. |
| Continue Generation | Tlačítko zůstává v záhlaví běhu. | Stejně. |

## 5. Schvalovací pravidla (T2V)

Povoleno jen když:

- produkční překlad je aktuální (`english_confirmed` + current `english_preview`),
- T2V plán po rebuildu z EN VO má `repetition.status === "passed"`,
- povinné T2V scény jsou validní (plán se sestaví; still Creative Intent se nepožaduje).

Po schválení změna VO, hlasové režie, scény nebo zvuku **unapprove** CR a označí plán `draft`/`stale`. UI stavy: rozpracováno / čeká na překlad / připraveno ke schválení / schváleno / zastaralé po změně.

Jedno tlačítko: **Approve Package**.

## 6. Continue nepřepisuje schválený plán

T2V větev `rebuildAndPersistPackage`:

- volá `assertTextToVideoPlanLockedForContinue`,
- snapshot scene ID, provider prompt, pořadí, `plan_fingerprint`,
- persistuje brief **bez** `buildTextToVideoCreativePlan` / `attachTextToVideoCreativePlanToBrief`,
- při neshodě snapshotu hodí `t2v_plan_not_locked_for_continue`.

Retry po checkpointu: existující `video_jobs` se znovu nevytváří (stávající idempotence). T2V lock je čistá funkce, bez LLM.

## 7. Délky a cena

**Před hlasem:** plán rovnoměrně rozdělí 24 s. UI label: *předběžný odhad před hlasem*. Cena = `runwayProviderDurationFromRequiredTrim(approximate_duration_seconds)` + TTS odhad z délky produkčního VO. **Ne** `estimateRunwayGen45SceneCostUsd(3)`.

**Po alignmentu:** `applyAlignmentMeasuredTimingToPlan` přepíše `approximate_duration_seconds`. UI: *po změřeném hlasu*. Stejné duration mapping jako `buildTextToVideoRunwayExecutionPlan`.

**Hardcoded 3 s nevytvoří všechny klipy po 3 s**, pokud změřené délky nejsou 3 s. Pokud je před hlasem 8 scén × 3 s z dělení 24 s, odhad i provider duration budou 3 s, dokud alignment nepřepíše scény. Runway fáze stejně vyžaduje `timing_status=measured`.

**Překročení budgetu:** `executeTextToVideoRunwayPlan` volá `evaluateTextToVideoRunwayBudget` **před** prvním provider POSTem (`runwayPostCount` zůstane 0). Žádný částečný video běh.

## 8. SFX a hudba

- Chybějící efekt = **none**, UI **Bez zvukového efektu**. Označení Auto v T2V panelu není.
- Custom efekt: popis + placement/fráze, uložené v sound plan, součástí lock validace fráze proti produkčnímu VO.
- Hudba `auto`/`none` v UI **Bez hudby**. Při T2V Apply/Approve se `music.auto` a `scene_sound.auto` uloží jako `none`, aby worker neočekával licencovanou auto-hudbu.
- Nový AI návrh zvuků **není** implementován. Worker `resolveTextToVideoMusicForProduction` pro zbylé `auto` dál fail-closed (`music_auto_unavailable`) — Step 5 beze změny.

## 9. Testy a výsledky

Nový offline suite: `npx tsx scripts/check-production-text-to-video-creative-review-fix.ts` — **16/16 PASS** (žádný live provider).

Regrese:

- Step 1, 2, 2B, 2C, 2C-behavior, 3, 3B-behavior, 4, 5, 5B, 5C, 5D — **PASS**
- Creative Review phase 2, 3, 4, 5, 6, 7A, 7B, 8 — **PASS**
- `npx tsc --noEmit` — **PASS**
- ESLint na změněných server/lib/test souborech — **PASS**
- ESLint panelu: 2 pre-existující `react-hooks/set-state-in-effect` na sync `useEffect` (nejsou z této opravy; logika nezměněna)

## 10. Migrace

**Žádné.** Schéma se neměnilo. Žádná placená migrace rozpracovaných package.

Zastavený package po nasazení: otevřít → případně Save (refresh překladu stávající službou) → upravit vizuály → Approve Package → Continue. Ostatní textové výstupy se neregnerují.

## 11. Nulové provider requesty

Tento úkol nespustil OpenAI, Claude, ElevenLabs ani Runway. Testy používají fake supabase / fake provider, které při budget bloku nePOSTují. Continue T2V neimportuje `attachTextToVideoCreativePlanToBrief`.

## 12. Co zbývá před prvním placeným během

1. Operátor na zastaveném package: zkontrolovat EN produkční text, Approve, teprve potom Continue Generation v záhlaví.
2. Feature flagy (`ELEVENLABS_TTS_ENABLED`, `TEXT_TO_VIDEO_RUNWAY_ENABLED`, SFX/music licence) **nezměněny** — musí být zapnuté provozním postupem, ne touto opravou.
3. Save po změně češtiny stále volá existující překladový provider — to je schválený lifecycle, ne nové LLM na Continue.
4. Pokud by po změřeném hlasu cena překročila `max_budget_usd`, Runway se zastaví a je potřeba nové potvrzení budgetu (existující gate).

## 13. Zastavený package

Lze ho **bezpečně opravit a dokončit bez regenerace ostatního obsahu**:

- Nespustí se sám.
- Starý `voiceover_text` v češtině Continue odmítne (`t2v_plan_not_locked_for_continue` / chybějící produkční překlad).
- Approve zapíše EN `english_preview` do mluvených polí a schválí T2V plán.
- Still Creative Intent data v DB zůstanou, na T2V stránce se nezobrazují a nejsou povinná.

---

## Checklist

- pracovní čeština se může dostat do anglického videa? **Ne** — T2V mluví jen aktuální `english_preview`.
- vidí operátor finální anglický text? **Ano** — pole Finální produkční verze (angličtina).
- je T2V plán schválen jedním Approve? **Ano** — atomicky s CR, pokud repetition passed.
- přežijí ruční úpravy Continue? **Ano** — Continue plán nepřestavuje.
- používá cena skutečné plánované délky? **Ano** — `runwayProviderDurationFromRequiredTrim`, ne slepých 3 s.
- může falešné Auto vytvořit očekávání zvuku? **Ne** — UI `Bez zvukového efektu` / `Bez hudby`.
- změnil se still workflow? **Ne**.
- proběhl skutečný provider request? **Ne**.
- je současný zastavený package bezpečně opravitelný? **Ano** — Save/Approve/Continue, bez auto-resume.
- blocker před prvním placeným během? **Operátorské schválení + existující feature flagy.** Kódová T2V CR cesta už nenechá češtinu k ElevenLabs a nespustí Continue s draft plánem.
