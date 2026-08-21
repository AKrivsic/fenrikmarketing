# Production Canonical Video Plan — Fix Report

Oprava architektonické chyby, kdy produkční T2V vytvářel **druhý kreativní plán rozřezáním voiceoveru**.

**Žádný nový production run. Žádný Claude / OpenAI / ElevenLabs / Runway request. Žádné placené volání. Secrets a feature flagy beze změny. Still workflow beze změny. Žádná migrace. Obnova existujícího package se nespustila na remote.**

Ověřovací package z auditu (`The Tab They Opened Before Your Call`, `3b30b458-8d74-4267-8a53-a1a980b11e7c`) **nebyl během implementace měněn**. Obnova je opt-in tlačítko v Creative Review.

---

## 1. Která existující struktura je nově kanonická

Kanonický kreativní videoplán je **uložený Claude storyboard**:

1. `package_brief.visual_scenes[]` — scény z Content Package (image prompt, motion prompt, volitelně `id` a `voiceover_excerpt`).
2. `package_brief.creative_review.scenes[]` — stejné scény, stejná ID, česká pracovní verze + anglická produkční verze (existující Scene Intent lifecycle).
3. `package_brief.video.script` — autoritativní video script; T2V ho **nepřepisuje**.

Stabilní ID: `scene-1` … `scene-N` (z `visual_scenes[].id`, jinak `scene-{index+1}`).

Technický T2V render plán (`video_text_to_video_creative_plan`) je **projekce** tohoto storyboardu. Nese:

- `origin: "canonical_storyboard"`
- `canonical_plan_fingerprint`
- `canonical_scene_id` na každé render scéně
- `scene_voiceover_binding: confirmed | needs_review`

Still i T2V čtou tutéž sadu `visual_scenes` / Creative Review scén. Rozdíl je jen render: still = obrázek + pohyb, T2V = Runway klip.

Nové schéma ani migrace nevznikly. Přibyla jen volitelná pole `visual_scenes[].id` a `visual_scenes[].voiceover_excerpt`.

---

## 2. Proč nevznikla nová paralelní sada scén

T2V adapter **nevolá LLM**, **nedělí voiceover na věty** a **nemění počet ani ID scén**.

`buildTextToVideoCreativePlan` (sentence splitter) zůstává jen jako legacy/diagnostika s `origin: "sentence_fallback"`. Produkční attach, Save, Approve a Continue ho nepoužívají.

Existující Scene Intent v Creative Review se reuseuje. Žádný druhý planner, žádný druhý překladový systém.

---

## 3. Jak Claude vytváří scény pro still a T2V

`package_video_mode` je známý od startu runu a teče:

`production run config` → `runCreativePipeline` → `buildContentPackagePrompt` → `buildContentPackageVisualScenesBlock`.

Jeden Content Package request:

- stále tvoří nápad, hook, voiceover, video script a scény;
- **stejný příběh a voiceover** pro oba režimy;
- still: scény jako dosud (obraz + volitelný motion);
- T2V: tytéž scény jako krátké video události (co vidíme, kdo/co je v záběru, co se pohne, emoce, návaznost) + `voiceover_excerpt`;
- preferovaných 4–5 scén;
- žádný nový samostatný Claude request jen kvůli T2V.

Scene Intent generation v Manual Review (`buildManualReviewCreativeReview`) zůstává existující lokalizační krok týchž `visual_scenes`, ne druhý příběh.

---

## 4. Co přesně dělá T2V adapter

`buildTextToVideoRenderPlanFromCanonical` ze schválené kanonické scény mechanicky sestaví:

- stabilní render scene ID (`scene-N`);
- schválený voiceover excerpt;
- anglický Runway prompt (EN popis + motion + visual identity kontinuita + portrait 9:16 + zákazy textu/titulků/loga/lip-sync);
- předběžnou délku (rovnoměrný odhad z cílového trvání / počet kanonických scén);
- fingerprint a origin;
- vazbu `scene_voiceover_binding`.

Po hlasu změřená délka, provider duration, seed, cena a attempt vazba zůstávají ve stávajícím workeru / Runway executoru. Adapter je nemění.

Adapter **nesmí**: měnit děj, počet scén, přepisovat scénu voiceoverem, přidávat nápad, volat LLM, přemapovat scény podle indexu.

České prefixy `Výrazný vizuál podporující` a `Závěr a CTA` se do Runway promptu nesmí dostat. VO excerpt jako vizuál je zakázaný (`t2v_visual_is_voiceover_copy`).

Kontinuita v promptu: stejné prostředí, paleta, světlo, vizuální styl, zařízení/typ postavy z Claude conceptu. **Negarantuje identickou tvář** — není to reference-image ani previous-frame.

---

## 5. Jak se obnoví existující package

Obecná detekce (žádný hardcode package ID):

`canRestoreCanonicalTextToVideoPlan` = kanonický storyboard má ≥ 3 scény **a** uložený T2V plán je sentence fallback (origin, hash ID, VO-copy vizuály, české prefixy, nebo jiný počet scén než storyboard).

Akce `restoreCanonicalVideoPlan` / tlačítko **Obnovit videoplán z původního storyboardu**:

1. Nespouští se sama na remote.
2. Nevolá žádného providera.
3. Z `visual_scenes` sestaví nový technický T2V draft (5 scén, pokud jich Claude uložil pět).
4. Zachová platformní texty, voiceover, překlady a `video.script`.
5. Starý sedmiscénový plán zahodí.
6. Pokud CR scény chybí nebo mají jen placeholder, zkopíruje uložené Claude image/motion prompty do Scene Intent (stále bez LLM). Existující české Scene Intent se stejnými ID zůstane.
7. Nastaví `scene_voiceover_binding: needs_review`.
8. Doplní hlasový snapshot z project TTS (DB, ne TTS API).
9. Vyžaduje nové **Save** a **Approve**.

Konkrétní package z auditu zůstává s 7scénovým fallbackem, dokud operátor obnovu nespustí.

---

## 6. Nové Save / Approve / Continue

**Save (jedno tlačítko):**

- jeden request: voiceover, hlasová režie, všechny scény, SFX;
- přeloží změněnou češtinu existujícím Scene Intent / VO translation lifecycle;
- aktualizuje anglické produkční verze;
- mechanicky znovu složí Runway prompty z kanonických scén;
- zneplatní schválení;
- nespouští ElevenLabs ani Runway;
- **nepřepisuje** `video.script`;
- sentence-fallback draft odmítne (`t2v_plan_sentence_fallback`) — nejdřív Restore;
- výrazná změna VO nastaví `needs_review` a scény **nerozdělí**.

Samostatná tlačítka `Uložit scénu` / `Uložit zvuk scény` v UI nejsou. Textarea jsou řízené.

**Approve:**

- jen validuje a uzamkne aktuální kanonický plán;
- nevolá Claude, nedělí VO, nemění počet / ID / pořadí / obsah scén, nepřepisuje `video.script`;
- vyžaduje aktuální CS+EN scény, provider prompt v angličtině, potvrzenou vazbu VO↔scény, hlasový snapshot + kategorii, repetition passed;
- uzamkne VO, hlas, scény, EN prompty, zvuk a cenu.

**Continue:**

- technický render job ze schváleného snapshotu;
- žádná kreativní změna, žádné LLM;
- ověří fingerprinty 1:1, hlas a canonical origin;
- teprve potom ElevenLabs a Runway;
- budget, claims, attempts, retry, checkpointy a idempotence beze změny.

---

## 7. Jak je vyřešen hlas

Před Approve musí existovat (control-plane / Vercel):

1. autoritativní OpenAI voice snapshot (`tts_voice` na briefu);
2. language bucket `en` / `cs`;
3. ElevenLabs kategorie female / male / default (z OpenAI hlasu, např. `marin` → ženský);
4. viditelná kategorie v Creative Review (`Kategorie hlasu: ženský|mužský|default`).

Odpovídající ElevenLabs Voice ID se **neověřuje na Vercelu**. Worker ho zkontroluje až před ElevenLabs POSTem (`elevenlabs_voice_unconfigured`).

Voice ID se operátorovi **nevystavuje**. Stamp probíhá při attach nového T2V package, při Save a při Restore (project TTS z DB, ne syntéza).

Chybí-li snapshot → `tts_voice_snapshot_missing`. Nerozhodnutá kategorie → `t2v_voice_category_undecided`. Approve s `—` neprojde. Approve **nečte** `ELEVENLABS_VOICE_ID_*` ani `ELEVENLABS_API_KEY`.

---

## 8. Co přesně uvidí operátor

T2V stránka ukazuje **Claude scény** (`creative_review.scenes`), ne sentence-split plán.

U každé scény:

- část voiceoveru;
- co se děje (česká textarea);
- anglická produkční verze (read-only, po Save);
- pohyb / změna z motion promptu;
- SFX;
- předběžná nebo změřená délka.

Technický Runway prompt je jen v diagnostickém `<details>`, operátor ho nepíše.

Hlas: jazyk, kategorie, emoce/režie.

Při legacy VO plánu banner + **Obnovit videoplán z původního storyboardu**. Save a Approve jsou do obnovy zakázané. Po změně VO je Approve zakázané, dokud operátor scény znovu neuloží (`needs_review`).

Still stránka dál ukazuje Creative Intent; T2V extra sekce jsou za `isT2v`.

---

## 9. Co přesně dostane Runway

Pouze anglická produkční verze složená adapterem:

- photoreal marketing clip, vertical 9:16;
- Scene action = EN Scene Intent;
- Still description = Claude `image_prompt`;
- Motion and change = Claude `motion_prompt`;
- Continuity guidance z visual identity (prostředí, paleta, světlo, styl, kamera, typ zařízení/postavy) s explicitním „does not guarantee identical faces“;
- zákazy: dialogue, lip-sync, subtitles, captions, logos, readable on-screen text.

Žádná čeština, žádný VO-copy vizuál, žádné české prefixy.

---

## 10. Co kontinuita garantuje a negarantuje

**Garantuje:** stejné textové řízení z Claude conceptu ve všech Runway promptech (prostředí, paleta, světlo, styl, typ postavy/zařízení, pokud storyboard tyto údaje má).

**Negarantuje:** identickou tvář, identické oblečení pixel-perfect, ani konzistenci mezi klipy. První placený test **nemá** reference-image ani previous-frame.

---

## 11. Změněné soubory

**Nové**

- `lib/content-package/canonicalVideoPlan.ts`
- `lib/content-package/textToVideoRenderAdapter.ts`
- `lib/content-package/textToVideoPlanApprovalGate.ts`
- `lib/content-package/restoreCanonicalTextToVideoPlan.ts`
- `scripts/check-production-canonical-video-plan.ts`
- `PRODUCTION_CANONICAL_VIDEO_PLAN_FIX_REPORT.md`

**Upravené**

- `lib/content-package/attachTextToVideoCreativePlan.ts` — kanonická projekce + voice stamp
- `lib/content-package/textToVideoCreativePlan.ts` — origin tagging, legacy detekce
- `lib/content-package/textToVideoManualReview.ts` — Save projekce, Approve lock, Continue gate
- `lib/content-package/textToVideoProviderPrompt.ts` — EN prompt + kontinuita, bez českých prefixů
- `lib/content-package/videoPaidPreflight.ts` — fail-closed pro fallback, když existuje storyboard
- `lib/content-package/videoCreativeRevision.ts` — fingerprint zahrnuje origin / canonical fp
- `lib/content-package/visualScenePlan.ts` — `id`, `voiceover_excerpt`
- `lib/content-pipeline/prompts/contentPackage.ts` + `contentPackageVisualScenes.ts` — T2V video events
- `lib/content-pipeline/runCreativePipeline.ts` — `packageVideoMode` do promptu
- `lib/ai/workflows/generateContentPackage.ts` — mode do pipeline
- `lib/ai/workflows/continueCreativeReviewGeneration.ts` — voice gate, bez rebuild plánu
- `lib/api/creative-review-admin.ts` — jedno Save, Approve lock, Restore akce, hlas
- `app/projects/[id]/creative-review/actions.ts` — `restoreCanonicalVideoPlanAction`
- `components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx`
- `lib/text-to-video/textToVideoAuthoritativeVoice.ts` — kategorie, stamp, Approve gate
- `lib/creative-review/applyEdits.ts` — T2V Save pole (SFX, režie, confirm binding)
- `scripts/check-production-text-to-video-creative-review-fix.ts`
- `package.json` — `check:production-canonical-video-plan`

Worker, Runway executor, ElevenLabs, alignment, budget, attempts, checkpointy, assembly a still rebuild **nebyly přestavěny**.

---

## 12. Migrace a remote stav

Migrace **žádná**. Obnova **neběžela na remote**. Konkrétní package z auditu má pořád 7scénový VO fallback, dokud operátor neklikne Restore.

---

## 13. Stabilní chyby

| Kód | Kdy |
| --- | --- |
| `t2v_plan_sentence_fallback` | Plán z VO sentence splitteru; Save/Approve/Continue |
| `t2v_plan_not_canonical` | Chybí origin `canonical_storyboard` |
| `t2v_canonical_storyboard_missing` | Méně než 3 `visual_scenes` |
| `t2v_scene_count_mismatch` | Render scény ≠ kanonický storyboard |
| `t2v_scene_id_mismatch` | ID render scény ≠ kanonické ID |
| `t2v_visual_is_voiceover_copy` | Vizuál je kopie VO excerptu / český prefix |
| `t2v_scene_cs_missing` | Chybí česká pracovní verze scény |
| `t2v_scene_en_missing` | Chybí aktuální anglická produkční verze |
| `t2v_provider_prompt_missing` | Prázdný Runway prompt |
| `t2v_provider_prompt_not_english` | Čeština v promptu |
| `t2v_scene_voiceover_binding_missing` | Prázdný excerpt |
| `t2v_scene_voiceover_binding_needs_review` | VO se výrazně změnil, operátor nepotvrdil Save |
| `t2v_canonical_fingerprint_mismatch` | Fingerprint storyboardu nesedí |
| `t2v_approve_must_not_rebuild_plan` | Approve se pokusil rebuildnout plán z VO |
| `tts_voice_snapshot_missing` | Chybí OpenAI voice snapshot |
| `tts_language_snapshot_missing` | Chybí language stamp |
| `tts_language_unsupported` | Jazyk mimo `en`/`cs` |
| `t2v_voice_category_undecided` | Nelze odvodit female/male/default |
| `elevenlabs_voice_unconfigured` | Worker: chybí Voice ID v `.env.worker` (před POSTem) |
| `sentence_fallback_plan` / `canonical_plan_required` / `voice_snapshot_missing` | Paid preflight, pokud existuje kanonický storyboard (≥ 3 scény) |
| `t2v_plan_not_locked_for_continue` / `t2v_production_translation_missing` | Continue lock (beze změny významu) |

Repetition blocked a nedostatečný budget zůstávají existující paid/Runway gating.

---

## 14. Testy a výsledky

| Sada | Výsledek |
| --- | --- |
| `npm run check:production-canonical-video-plan` (22) | pass |
| `npm run check:production-text-to-video-creative-review-fix` (16) | pass |
| `npm run check:production-t2v-voice-control-plane` (10) | pass |
| Step 1, 2, 2B, 2C, 2C-behavior | pass |
| Step 3, 3B-behavior | pass |
| Step 4, 5, 5B, 5C, 5D | pass |
| `npx tsx scripts/check-creative-review-phase5.ts` | pass |
| ESLint změněných souborů | pass |
| `npx tsc --noEmit` | pass |

Canonical suite pokrývá požadovaných 22 bodů (5 Claude scén → 5 T2V, 14 vět ≠ 7 scén, stejná kanonická sada, render mode nemění VO, fallback neschválitelný, VO excerpt ≠ vizuál, restore bez providera, zachovaný `video.script`, jedno Save, CS→EN, Runway bez češtiny, Approve nemění scény/script, Continue 1:1, VO change → needs_review, kategorie hlasu, chybějící snapshot, cena z 5 scén, alignment jen timing, budget před POST, still UI, žádný provider HTTP).

---

## 15. Potvrzení nulových provider requestů

Žádný test ani implementační krok nevolal Anthropic, OpenAI, ElevenLabs ani Runway. Restore, Save lock a adapter jsou čistě lokální. Stamp hlasu čte project řádek v DB, nespouští TTS.

---

## 16. Co zbývá před prvním placeným během

1. Operátor na existujícím T2V package klikne **Obnovit videoplán z původního storyboardu**, zkontroluje 5 Claude scén, **Save**, **Approve**.
2. Approve/Continue na Vercelu **nepotřebují** ElevenLabs Voice ID. Worker na DigitalOcean musí mít v `.env.worker` language map (`ELEVENLABS_VOICE_ID_EN_*` / `CS_*` nebo legacy). Jinak worker skončí **před POSTem** `elevenlabs_voice_unconfigured`.
3. Feature flagy a secrets se v této úloze **neměnily**. První placený test pořád vyžaduje existující paid confirm, budget a zapnuté worker flagy z Step 4/5.
4. Kontinuita je jen textové řízení. Neočekávat identickou postavu.
5. Nové T2V package: Claude musí vrátit ≥ 3 (ideálně 4–5) `visual_scenes`. Attach bez storyboardu fail-closed (`t2v_canonical_storyboard_missing`).

---

## Control-plane vs worker voice preflight correction

### Příčina

`assertT2vVoiceReadyForApprove` volal `resolveElevenLabsVoiceId`, který čte `ELEVENLABS_VOICE_ID_*` z `process.env`. Approve Package a Continue orchestrace běží na **Vercelu**. ElevenLabs Voice ID a API key jsou záměrně jen v `.env.worker` na DigitalOcean. Vercel je nemá a nemá je dostat — Approve by proto fail-closed padalo i se správným OpenAI snapshotem.

### Proč Voice ID nepatří na Vercel

Voice ID a `ELEVENLABS_API_KEY` jsou execution secrets pro TTS POST. Control-plane schvaluje kreativní výběr (který OpenAI hlas, jaký jazyk, jaká kategorie). Worker teprve mapuje schválenou kategorii na konkrétní ElevenLabs Voice ID. Kopírovat tajemství na Vercel by rozbilo oddělení secrets a zbytečně rozšířilo blast radius.

### Co kontroluje Approve (Vercel)

`assertT2vVoiceSelectionReadyForApprove` — jen uložená data package:

- OpenAI `tts_voice` snapshot existuje;
- language snapshot existuje a je `en` / `cs`;
- lze odvodit kategorii female / male / default;
- kategorie není `—`.

Nekontroluje Voice ID, API key ani worker feature flag. Nevolá providera.

### Co kontroluje worker (DigitalOcean)

Existující `runTextToVideoElevenLabsVoicePhase` / `resolveElevenLabsVoiceId` bez nového lifecycle:

- `ELEVENLABS_TTS_ENABLED=true`;
- `ELEVENLABS_API_KEY`;
- jazyková Voice ID mapa;
- Voice ID pro schválenou kategorii;
- shoda uloženého voice/language snapshotu.

Chybí-li Voice ID, worker hodí `elevenlabs_voice_unconfigured` **před** POSTem.

Continue na Vercelu ověří tentýž selection snapshot + canonical plan fingerprint a vytvoří job. Voice ID se řeší až ve workeru.

### Změněné soubory

- `lib/text-to-video/textToVideoAuthoritativeVoice.ts` — control-plane `assertT2vVoiceSelectionReadyForApprove`; bez `resolveElevenLabsVoiceId`
- `lib/api/creative-review-admin.ts` — Approve používá selection gate
- `lib/ai/workflows/continueCreativeReviewGeneration.ts` — Continue control-plane používá selection gate
- `scripts/check-production-t2v-voice-control-plane.ts` — nová offline sada
- `scripts/check-production-canonical-video-plan.ts` — voice testy bez ElevenLabs map
- `package.json` — `check:production-t2v-voice-control-plane`
- `PRODUCTION_CANONICAL_VIDEO_PLAN_FIX_REPORT.md`

### Testy

| Check | Výsledek |
| --- | --- |
| Approve s validním snapshotem a prázdnými ElevenLabs env | pass |
| Continue control-plane bez ElevenLabs env | pass |
| Approve odmítne chybějící voice / language / nepodporovaný jazyk / nerozhodnutou kategorii | pass |
| Worker bez Voice ID → `null` / `elevenlabs_voice_unconfigured` před POSTem | pass |
| Worker EN/CS × female/male/default bucket | pass |
| Canonical 22/22 | pass |
| Creative Review T2V fix 16/16 | pass |
| `tsc --noEmit` + ESLint změněných souborů | pass |

Žádný test nevolal Anthropic, OpenAI, ElevenLabs ani Runway.

### Env / migrace

Nová env **není potřeba**. Migrace **není potřeba**. `.env.worker` a Vercel secrets se **neměnily**. Feature flagy se **neměnily**.

### Blocker před deploymentem

Žádný nový blocker z tohoto split. Před prvním placeným během dál platí: Restore + Save + Approve na existujícím T2V package; worker `.env.worker` musí obsahovat language-aware Voice ID; worker TTS flag musí být zapnutý. Vercel **nesmí** dostat ElevenLabs Voice ID ani API key.
