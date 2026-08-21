# Production T2V Scene Integrity — Fix Report

Oprava hybridních scén, příliš dlouhých Runway promptů a placeného ElevenLabs před neplatným Runway plánem.

**Žádný nový production run. Žádný skutečný Claude / OpenAI / ElevenLabs / Runway request. Secrets a feature flagy beze změny. Still / I2V workflow beze změny. Žádná migrace. Produkční data se neměnila.**

---

## 1. Potvrzená původní příčina

Podezření z zadání **sedí s kódem**.

Po zásadní změně pole „Co se ve scéně děje (čeština)“ Save:

1. Přeložil jen `creative_review.scenes[].intent.english_preview`.
2. Mechanický adapter složil `provider_prompt` z **nového** EN děje **a** **starého** `visual_scenes[].image_prompt` + `motion_prompt`.
3. `provider_prompt` se ukládal až do 4000 znaků (`.slice(0, 4000)`), zatímco Gen‑4.5 adapter odmítá prompt nad **1000 UTF‑16**.
4. Worker volal ElevenLabs **před** validací Runway requestů. Neplatný prompt se mohl odhalit až po zaplaceném hlase.
5. Prompt současně mohl žádat čitelný text na telefonu/monitoru a vzápětí čitelný text zakazovat.

Žádný druhý storyboard ani sentence splitter na tom nebyl vinen. Chyba byla v **projekci jednoho schváleného storyboardu** a v **pořadí preflightů**.

---

## 2. Datový tok (ověřený v kódu)

```
Claude visual_scenes[]
  → Creative Review česká scéna (stejné ID)
  → Save: překlad CS → EN (jen english_preview)
  → kanonický T2V render plán (origin: canonical_storyboard)
  → composeTextToVideoProviderPrompt → provider_prompt
  → Approve (lock snapshot, bez rebuild storyboardu)
  → Continue (1:1 lock)
  → Worker: kompletní package preflight (včetně předhlasového technical split)
  → Budget kontrola 1 (konzervativní maximum)
  → teprve potom ElevenLabs POST (nebo reuse)
  → measured alignment → technical clip split (1 kreativní scéna → N Runway klipů)
  → durable execution checkpoint
  → Budget kontrola 2 (skutečný počet klipů + expozice hlasu)
  → teprve potom Runway POST (nebo reuse dokončených částí)
  → assembly v pořadí technických klipů
```

### Původ polí scény

| Pole | Zdroj před opravou | Obnoví se po zásadní české změně (před) | Po opravě |
| --- | --- | --- | --- |
| Český děj | `creative_review.scenes[].intent.localized_edit` | ano (Save) | ano (Save) |
| Anglický děj | `intent.english_preview` (překlad) | ano (Save překlad) | ano (Save překlad) |
| `image_prompt` / still | `visual_scenes[]` (Claude storyboard) | **ne** | ne při drobném Save; **ano** až po „Přestavět scénu“ (Claude) |
| `motion_prompt` / pohyb | `visual_scenes[].motion_prompt` | **ne** | totéž |
| Continuity | `presentation_generation.visual_identity` | ne (sdílená identita) | při zásadní změně se do promptu **nedává**, dokud scéna není přestavěná |
| Voiceover excerpt / binding | `visual_scenes[].voiceover_excerpt` + `scene_voiceover_binding` | ne (vizuál ≠ VO) | beze změny; VO binding se mění jen při významné změně voiceoveru |
| `provider_prompt` | EN děj **+** starý still **+** starý motion, až 4000 | hybrid | nový děj bez starého still/motion; ≤ 1000 UTF‑16 |
| Fingerprint | `plan_fingerprint` z promptu (normalizovaný) | částečně (nový prompt + starý still) | nový přesný prompt; execution fingerprint = odesílaný text |
| Délka scény | `approximate_duration_seconds` (odhad, po hlase měřená) | ne | ne; délka se nemění česým dějem |

---

## 3. Malá vs zásadní změna české scény

**Drobná úprava** (tlačítko „Uložit drobnou úpravu“):

- Překlad CS → EN.
- Mechanický prompt z nového EN + **stávajícího** still/motion (stejný příběh).
- Plán `draft` / neschválený, pokud se obsah změnil.
- Claude se **nevolá**. ElevenLabs / Runway se **nevolají**.

**Zásadní změna děje** (detekce `significantVoiceoverChange` na českém intentu):

- Překlad CS → EN.
- Scéna dostane `visual_rebuild_status: "rebuild_required"`.
- Prompt se složí **jen z nového děje** + krátkých omezení. Starý still a motion se **do promptu nedávají** (žádný hybrid).
- `visual_scenes` still/motion zůstanou uložené jako Claude originál, dokud operátor nespustí přestavbu.
- Approve je blokovaný (`t2v_scene_visual_stale`).
- Claude se **nevolá automaticky**.

**Přestavět scénu podle nového záměru**:

- Volá existující Claude copywriting infrastrukturu (`generateValidatedJson` + `getCopywritingProvider`).
- Vrátí `image_prompt` + `motion_prompt` pro **jednu** scénu.
- Atomicky: buď se uloží celá konzistentní scéna, nebo nic.
- Počet, ID a pořadí ostatních scén se nemění.
- Média se neplatí. ElevenLabs / Runway se nespouští.

---

## 4. Kdy se volá Claude

| Akce | Claude | ElevenLabs | Runway |
| --- | --- | --- | --- |
| Uložit drobnou úpravu | ne (jen existující překlad EN preview, pokud je CS outdated) | ne | ne |
| Překlad po Save, pokud je EN outdated | ano, existující `translateCreativeReviewEnglishPreviews` | ne | ne |
| Přestavět scénu podle nového záměru | ano, nová akce scene visual rebuild | ne | ne |
| Approve / Continue | ne | ne | ne |
| Worker paid run | ne | ano (nebo reuse) | ano (nebo reuse) |

Překlad po Save už dříve selhal **před** `persistCreativeReview`. Přestavba scény volá Claude **před** jakýmkoli zápisem; při selhání se `visual_scenes` ani plán neuloží.

---

## 5. Jak se zabrání partial persistu

1. Překlad: `saveCreativeReviewPackage` vrací `translation_failed` **před** `persistCreativeReview`.
2. Přestavba: `rebuildCanonicalSceneVisualsFromCzechIntent` běží v paměti. `persistCreativeReview` je až po úspěchu Claude **a** úspěšné mechanické projekci.
3. Žádný mezikrok nezapisuje jen EN děj se starým still do `provider_prompt` bez flagu `rebuild_required`.

---

## 6. Limit 1000 UTF‑16

`composeTextToVideoProviderPrompt`:

1. Rezervuje sdílená omezení (`No dialogue, lip-sync, subtitles, captions, logos, or readable on-screen text.`).
2. Přidává části podle priority: header → hlavní děj → pohyb → kamera → kontinuita → setting.
3. Co se nevejde, se **nepřidá**. Celý prompt se neslice jako primární řešení.
4. Děj delší než zbývající budget se zkrátí na hranici slova, **až po** rezervaci omezení.
5. Požadavky na čitelný text na telefonu/monitoru se z děje/stillu odstraňují, pokud to není schválený UI chrome.
6. Adapter už nedělá `.slice(0, 4000)`.
7. Schema stále čte až 4000 (staré drafty), ale Approve / paid preflight odmítnou > 1000.
8. UI ukazuje přesný `provider_prompt` a `providerPromptUtf16Length / 1000 UTF-16`.
9. `sceneRequestFingerprint` hashuje **přesný** `provider_prompt`, který executor posílá jako `promptText`.

Kontrakt promptu: `TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION = 2`.

---

## 7. Pořadí preflightů a providerů

Povinné pořadí v `runTextToVideoJobPhase` / worker pipeline:

1. Autoritativní package budget z job input.
2. `assertTextToVideoPackageReadyForPaidProviders`:
   - kanonický snapshot (původ, počet, ID, pořadí, schválení, žádné stale, VO binding, EN/CS),
   - voice plán (jazyk, kategorie, snapshot; na workeru i Voice ID),
   - dry-run **všech** Runway requestů (`resolveRunwayTextToVideoRequest`: prompt, model `gen4.5`, ratio `720:1280`, duration 2–10) **bez HTTP**,
   - celkový odhad (hlas + klipy + SFX/hudba) vs `confirm_paid_run` + rozpočet.
3. Teprve potom ElevenLabs (reuse existujícího checkpointu zůstává).
4. Teprve potom Runway (reuse existujících clip attemptů zůstává).

Jedna neplatná scéna shodí **celý package** s 0 ElevenLabs POST a 0 Runway POST.

Continue na Vercel kontroluje snapshot + dry-run Runway requestů **bez** čtení `ELEVENLABS_VOICE_ID_*`.

---

## 8. Důkaz, že neplatný Runway plán nezaplatí ElevenLabs

- `video-worker/textToVideoJobPhase.ts`: `assertTextToVideoPackageReadyForPaidProviders` je **před** `await runTextToVideoElevenLabsVoicePhase`.
- Test 12–14: schválený plán s `rebuild_required` hodí chybu; čítače POST zůstanou 0.
- Step 5C fake E2E s platným plánem dál dojde k fake providerům; retry má 0 nových POST.

---

## 9. Změněné soubory

Nové:

- `lib/content-package/rebuildCanonicalSceneFromCzechIntent.ts`
- `lib/text-to-video/assertTextToVideoPackageReadyForPaidProviders.ts`
- `scripts/check-production-t2v-scene-integrity.ts`
- `PRODUCTION_T2V_SCENE_INTEGRITY_FIX_REPORT.md`

Upravené:

- `lib/content-package/textToVideoProviderPrompt.ts`
- `lib/content-package/textToVideoRenderAdapter.ts`
- `lib/content-package/textToVideoPlanApprovalGate.ts`
- `lib/content-package/textToVideoManualReview.ts`
- `lib/content-package/textToVideoCreativePlan.ts`
- `lib/content-package/videoCreativeRevision.ts`
- `lib/text-to-video/runwayProductionConfig.ts`
- `lib/text-to-video/textToVideoWorkerPipeline.ts`
- `lib/ai/workflows/continueCreativeReviewGeneration.ts`
- `lib/api/creative-review-admin.ts`
- `app/projects/[id]/creative-review/actions.ts`
- `components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx`
- `video-worker/textToVideoJobPhase.ts`
- `package.json` (`check:production-t2v-scene-integrity`)

---

## 10. Výsledky testů

Všechny běhy **offline**, bez sítě a bez placených providerů.

| Sada | Výsledek |
| --- | --- |
| `check:production-t2v-technical-clip-split` | passed (18/18) |
| `check:production-t2v-scene-integrity` | passed (18 povinných + rebuild/job-phase/minor-save kontroly) |
| Canonical video plan | 22/22 |
| Creative Review T2V fix | 16/16 |
| T2V voice control-plane | 10/10 |
| Step 1 | passed |
| Step 2 | passed |
| Step 2B | passed |
| Step 2C | passed |
| Step 3 | passed |
| Step 3B | passed |
| Step 4 | 20/20 |
| Step 5 | 17/17 |
| Step 5B | 10/10 |
| Step 5C (fake E2E + retry 0 POST) | 7/7 |
| Step 5D | 8/8 |
| Creative Review Phase 5 | passed |
| `tsc --noEmit` | passed |
| ESLint změněných souborů | žádné nové chyby (3 pre-existující unused-var warningy v assembly/voice) |

---

## Measured timing and technical clip split

### 1. Původní příčina

Runway Gen‑4.5 přijímá klip jen **2–10 s**. Execution plán mapoval **jednu kreativní scénu na jeden Runway request**. Preflight před ElevenLabs kontroloval jen odhad `approximate_duration_seconds`. Po zaplaceném hlase `applyAlignmentMeasuredTimingToPlan` mohlo dát scéně 11–14 s. `runwayProviderDurationFromRequiredTrim` pak hodilo `scene_duration_exceeds_runway_max` **až v Runway fázi**. Voiceover se neořezával ani nezrychloval — tok se jen zasekl po zaplaceném POST.

### 2. Zvolená bezpečná hranice a proč

**Předhlasová hranice = 8 s** (`TEXT_TO_VIDEO_PRE_VOICE_SPLIT_THRESHOLD_SECONDS`).

Gen‑4.5 hard max je 10 s. Odhad z textu může po TTS naběhnout zhruba o 25 %. `8 × 1.25 = 10`. Scéna s odhadem ≤ 8 s se plánuje jako jeden klip. Nad 8 s se **před ElevenLabs** připraví deterministický technical split (podle slov excerptu) a konzervativní cena. UI před Continue používá slack **1.25** a účtované stropy 2–10 s na každý plánovaný klip.

Po alignmentu platí **tvrdé maximum 10 s** na technický klip. Odhad 7 s, který naměří 11 s, se rozdělí až po hlase — bez ořezu VO.

### 3. Kreativní scéna vs technický klip

| | Kreativní scéna | Technický klip |
| --- | --- | --- |
| Co vidí operátor | `scene-1` … `scene-N` v Creative Review | neupravuje se ručně |
| Zdroj | Claude storyboard + CR | execution plán po measured timing |
| ID | kanonické `scene-1` | `scene-1__part-1`, `scene-1__part-2`, … |
| Voiceover | celý excerpt scény | souvislý úsek, bez mezer a překryvů |
| Prompt | schválený `provider_prompt` | part 0 = tentýž prompt; další parts = tentýž děj + mechanická continuation věta |
| Storyboard | nemění se | nevytváří se |

### 4. Příklad 14sekundové scény

Naměřená scéna `scene-1`, start 0 s, konec 14 s, excerpt s více slovy:

1. Greedy split na slovo/větu z alignmentu, okno max 10 s.
2. Typicky **part-1 ≈ 0–9.7 s** (poslední slovní hranice před 10 s) a **part-2 ≈ 9.7–14 s**.
3. Runway účtuje `ceil` každého úseku (např. 10 s + 5 s).
4. Part-2 prompt: stejný děj + `Same continuous shot; next phase of the same action; same subject, wardrobe, and environment; no new story.` ≤ 1000 UTF‑16.
5. Operátor dál vidí jednu scénu `scene-1`. Assembly slepí klipy v pořadí, mezi částmi stejné scény bez fade.

Jednoslovný 14s excerpt nelze rozdělit bez změny obsahu → **fail-closed před ElevenLabs** (`t2v_scene_cannot_split`).

### 5. Přesné pořadí providerů a obou budget kontrol

1. Approve / Continue: prompt contract v2, kanonický plán, dry-run všech **plánovaných** technických klipů.
2. **Budget 1 (před hlasem):** konzervativní maximum (inflace 1.25, split od 8 s). Nad rozpočet → 0 ElevenLabs POST, 0 Runway POST.
3. ElevenLabs TTS + alignment (nebo reuse checkpointu).
4. Přepočet measured úseků → technical split → durable `video_text_to_video_execution_checkpoint`.
5. **Budget 2 (před Runway):** skutečný počet klipů × účtovaná délka + už vzniklá ElevenLabs expozice. Nikdy se rozpočet automaticky nenavyšuje.
6. Runway POST jen pro chybějící technické části (reuse hotových).
7. Assembly v pořadí execution items.

### 6. Chování při překročení rozpočtu

Po alignmentu, pokud Budget 2 selže:

- Runway POST = **0**
- stav `insufficient_budget` — navýšit rozpočet nebo upravit scénu
- hlasový checkpoint zůstane (retry **neopakuje** ElevenLabs POST)
- execution checkpoint je uložený, takže UI ukáže přesnější cenu a počet klipů

### 7. Checkpoint a retry

Fingerprint execution plánu obsahuje: creative plan, measured audio revision, synthesis fingerprint, prompt contract v2, technical split contract v1, každé `scene_id` / part / přesný prompt / délku / cenu / request fingerprint.

- Stejný alignment + stejný split → reuse hlasu i dokončených Runway částí.
- Jiný alignment / jiný technical split → starý clips checkpoint se **nesmí** tiše reuse (nesedí `execution_fingerprint`).
- Neplatný split po hlase: voice se nejdřív persistuje, pak fail-closed před Runway (`t2v_scene_split_invalid`). Retry znovu nevolá ElevenLabs.

### 8. Změněné soubory

- `lib/text-to-video/technicalClipSplit.ts` (nový)
- `lib/text-to-video/measuredExecutionCheckpoint.ts` (nový)
- `lib/text-to-video/runwayExecutionPlan.ts`
- `lib/text-to-video/runwayProductionConfig.ts`
- `lib/text-to-video/textToVideoOperatorBudget.ts`
- `lib/text-to-video/assertTextToVideoPackageReadyForPaidProviders.ts`
- `lib/text-to-video/runTextToVideoRunwayClipsPhase.ts`
- `lib/text-to-video/runTextToVideoAssemblyPhase.ts`
- `lib/text-to-video/voiceSynthesisService.ts`
- `lib/text-to-video/textToVideoSfxAnchoring.ts`
- `lib/text-to-video/textToVideoReelBridge.ts`
- `lib/content-package/textToVideoProviderPrompt.ts`
- `lib/content-package/textToVideoCreativePlan.ts`
- `lib/content-package/textToVideoRenderAdapter.ts`
- `lib/content-package/textToVideoPlanApprovalGate.ts`
- `lib/content-package/restoreCanonicalTextToVideoPlan.ts`
- `lib/content-package/videoCreativeRevision.ts`
- `lib/api/creative-review-admin.ts`
- `app/projects/[id]/creative-review/actions.ts`
- `components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx`
- `scripts/check-production-t2v-technical-clip-split.ts` (nový)
- `scripts/check-production-text-to-video-step-4.ts` (scene ID lookup)
- `package.json`

### 9. Výsledky testů

Všechny relevantní sady výše v tabulce prošly. Nová sada `check:production-t2v-technical-clip-split` pokrývá povinné body 1–18 (odhad nad 8 s, jeden klip pod 10 s, split nad limitem, pokrytí VO, kanonická ID, storyboard beze změny, prompt ≤ 1000, budget podle klipů, 0 Runway POST při over-budget, retry bez druhého hlasu, reuse klipů, invalidace checkpointu, fail-closed split, starý prompt contract, still/I2V, fake E2E, žádná síť).

### 10. Nulové skutečné provider requesty

Žádný test nevolá Anthropic, OpenAI, ElevenLabs ani Runway HTTP. Fake provider + fake alignment. Secrets a feature flagy beze změny. Produkční data se neměnila.

### 11. Je po opravě bezpečné udělat první placený package?

**Ano, pro nově schválený kanonický plán s prompt contract v2 a rozpočtem, který pokryje konzervativní maximum v UI.**

Před Continue operátor vidí konzervativní max. Po hlase se uloží přesný počet technických klipů. Package vytvořený před touto opravou **nelze** schválit ani spustit na starém promptu — buď „Aktualizovat videoplán“ (mechanicky, bez Claude), nebo přestavba konkrétní scény.

### 12. Jediný zbývající blocker

Není to integrity scény. Worker pořád musí mít v `.env.worker` zapnutý Runway + ElevenLabs TTS, API key a `ELEVENLABS_VOICE_ID_{EN|CS}_*`. Control-plane na Vercel Voice ID nečte. Bez toho se paid běh zastaví **před** prvním POSTem.

---

## 14. Zbývající provozní předpoklady (ne scene-integrity blocker)

1. Worker flagy a Voice ID — viz bod 12 výše.
2. `confirm_paid_run` a kladný package budget na job input. Rozpočet se nikdy automaticky nenavyšuje.
3. Package ze starého prompt contractu musí operátor nejdřív aktualizovat nebo přestavět scénu. Approve/Continue jsou fail-closed.

Architektura dovoluje později přidat atomickou regeneraci celého kreativního návrhu (stejný persist-or-nothing vzor jako přestavba jedné scény) bez druhého storyboardu.
