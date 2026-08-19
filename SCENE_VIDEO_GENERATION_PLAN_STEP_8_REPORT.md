# SCENE_VIDEO_GENERATION_PLAN_STEP_8_REPORT

Datum: 2026-08-15

## 1. Co bylo skutečně nalezeno

### Storyboard / scény
- Content Package LLM kontrakt: `lib/content-pipeline/prompts/contentPackageVisualScenes.ts` → pole `visual_scenes`.
- Validace / normalizace: `lib/content-package/visualScenePlan.ts`, `lib/content-package/generatedVisualScene.ts`.
- Legacy IMAGE tvar: `{ source: "ai", image_prompt }` nebo `{ source: "asset", asset_id, used_as, … }`.
- Worker Zod scéna: `lib/video-engine/schemas/sceneSchema.ts` — `image_prompt`, `duration_seconds`, volitelné `image_bucket` / `image_path`, `video_clip`; **před Step 8 bez `motion_prompt`**.
- Persistovaný výstup: `persistedSceneSchema` v `renderSchema.ts` (povinné bucket/path).
- Ken Burns „motion“ ve `storyboard.ts` je enum zoom/pan — **není** textový Runway prompt.
- Scene-video attempts už používají DB/API pole `motion_prompt` (max 1000 UTF-16, `RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16`).

### Reel přechody
- `orchestrateVideoClipReel` volil přechod **jen podle indexu** (`none` / `fade` / `slide` / `push`).
- Render/persisted schema **nemělo** `transition_in` (na typed `VisualScene` existovalo `transition_in`, ale neprotékalo do worker scenes / clip reel).
- Still-image produkční cesta (`jobRunner` + `storyboard.transitionFor`) je oddělená a **nebyla** měněna.

### Cena / délka
- Jediný lokální cost model: `estimateRunwayTestCostUsd` v `lib/runway-test/constants.ts` (`gen4_turbo`, 5 credits/s, $0.01/credit).
- Runway Gen-4 duration: integer **2–10** (`RUNWAY_GEN4_DURATION_MIN/MAX` v `lib/ai/runway.ts`).

### Architektonický rozpor (nezakrytý)
- Zadání chce „přechod ze storyboardu/render spec“, ale produkční still storyboard přechody neukládá do `render_spec.scenes`.
- **Řešení:** volitelné `transition_in` na scene/persisted schema + package `visual_scenes`; clip reel ho preferuje; při absenci indexový fallback označený v plánu. Still path beze změny.

## 2. Co bylo změněno

- Volitelné `motion_prompt` + `transition_in` na `sceneSchema` / `persistedSceneSchema`.
- Package `VisualSceneAi` / `VisualSceneAsset`, validátory, normalizace, prompt kontrakt, `expectedShape`.
- Propagace přes `normalizeVisualScene` / `visualSceneToPlanItem` / `resolveVisualPlanToRenderScenes`.
- Nová služba `lib/scene-video-plan/*` — dry-run plán všech scén.
- Deterministický fallback motion prompt.
- Clip reel: `resolveClipSceneTransition` (shared `lib/video-engine/clipTransition.ts`).
- Testy: `scripts/check-scene-video-plan.ts`, npm `check:scene-video-plan`.

**Nezapojeno:** `jobRunner`, n8n, UI, Runway create, DB migrace.

## 3. Zdroj dat pro motion prompt

Priorita:

1. Platný `scene.motion_prompt` (≤ 1000 UTF-16) → `motionPromptSource: "original"`.
2. Chybějící nebo prázdný → `buildFallbackMotionPrompt(...)` → `"fallback"`.
3. Příliš dlouhý / špatný typ originálu → zůstane `"original"`, scéna **není** preparable (bez tichého fallbacku).

Budoucí storyboardy: LLM prompt vyžaduje kvalitní `motion_prompt` na IMAGE scénách (bez lip-sync / text overlays).

## 4. Pravidla fallbacku

`buildFallbackMotionPrompt` se soustředí na **aktuální** still:

- `image_prompt`, `sceneIndex`, `duration_seconds`,
- volitelně `role` / `narration_hint`,
- přítomnost sousedů jen pro výběr continuity kamery (jejich text se **neposílá** provideru).

**Neobsahuje:** scene id, doslovné sousední image prompty, interní názvy typů scén.

Skládá: subject action + ambient + camera + stabilita identity/produktu/provozovny + zákaz textu/lip-sync. Oříznuto na 1000 UTF-16. Deterministické.

## 5. Pravidla délky a ceny

- `targetDurationSeconds` = `scene.duration_seconds`.
- Platná délka: finite číslo `> 0` → `providerDurationSeconds` = `ceil(target)` clamp **[2, 10]**.
- Neplatná délka (0 / záporná / NaN / ±Infinity / non-number): diagnostika `invalid_target_duration`, display placeholder 2 s, scéna **není** `preparable`.
- Cena: `estimateRunwayTestCostUsd` jen pro podporovaný `runway` + `gen4_turbo`.
- Runnable totals (`totalEstimated*`) = **jen preparable** scény.
- Theoretical totals (`theoreticalTotalEstimated*`) = všechny scény (po opravě).
- Neznámý provider/model/ratio → throw (`scene_video_plan_provider_unsupported` / `_model_unsupported` / `_ratio_unsupported`).

## 6. Přechody

- Shared: `resolveClipSceneTransition(scene, index)`.
- Pokud `transition_in ∈ {fade,slide,push,none}` → `transitionSource: "original"`.
- Jinak indexový fallback (původní clip-reel vzorec) → `"fallback"` + diagnostika `transition_fallback`.
- `orchestrateVideoClipReel` používá resolve (still Ken Burns path nedotčena).

## 7. Změněné soubory

- `lib/video-engine/schemas/sceneSchema.ts`
- `lib/video-engine/schemas/renderSchema.ts`
- `lib/video-engine/clipTransition.ts` *(new)*
- `lib/scene-video-plan/*` *(new)*
- `lib/content-package/visualScenePlan.ts`
- `lib/content-package/generatedVisualScene.ts`
- `lib/content-pipeline/prompts/contentPackageVisualScenes.ts`
- `lib/scene-types/visualScene.ts`
- `lib/scene-types/normalizeVisualScene.ts`
- `video-worker/services/reel/orchestrateVideoClipReel.ts`
- `scripts/check-scene-video-plan.ts` *(new)*
- `package.json`
- `SCENE_VIDEO_GENERATION_PLAN_STEP_8_REPORT.md` *(this file)*

## 8. Výsledky testů

| Check | Výsledek |
| --- | --- |
| `check:scene-video-plan` | **19 passed** (po Step 8B) |
| `check:scene-video-attempts` | **29 passed** |
| `check:runway-image-to-video` | **19 passed** |
| `check:video-reel-orchestrator` | passed |
| `check:visual-scene-plan` | **20 passed** |
| `tsc --noEmit` | OK |
| eslint změněných souborů | OK |

## 9. Provider / placené AI

**Nulová** skutečná síťová a placená volání. Dry-run plán odmítá `dryRun: false` (`scene_video_plan_paid_path_disabled`). Nevyžaduje `RUNWAYML_API_SECRET`. Nezapisuje generation attempts.

## 10. Blockery / neurčitosti

- Still-image `storyboard.ts` přechody nejsou v `render_spec` — plán/clip reel proto používají nové volitelné `transition_in`, ne Ken Burns beat transition.
- Cost model je označen jako „test pricing“ pro `gen4_turbo`; je to jediný existující lokální Runway cost helper — použit záměrně (bez nových konstant). Plán **odmítá** jiné providery/modely.
- Typed non-IMAGE scény (CHECKLIST/PHONE/…) zůstávají v plánu jako scény s placeholder `image_prompt` až po compile; plánování očekává worker/render scenes se still referencí — chybějící bucket/path → `unpreparable` + diagnostika.

## Kontrola a opravy Step 8B

Datum: 2026-08-16

### 1. Co bylo opraveno

- Neplatná `duration_seconds` už neudělá scénu `preparable` (placeholder 2 s jen pro zobrazení + `invalid_target_duration`).
- Provider/model omezeny na `runway` + `gen4_turbo`; neznámé hodnoty → validační throw (bez Runway ceny pro cizí model).
- Runnable totals (`totalEstimated*`, `totalProviderDurationSeconds`) počítají **jen** `preparable` scény; theoretical totals jsou oddělené.
- Přidáno `preparableSceneCount` / `unpreparableSceneCount`.
- Příliš dlouhý / špatný typ originálního `motion_prompt` → **ne** tichý fallback; scéna unpreparable, source zůstává `original`.
- Fallback prompt bez scene ID, bez citace sousedních image promptů, bez interních typů scén.

### 2. Přesná pravidla připravenosti (`preparable`)

Scéna je připravená jen když současně platí:

- neprázdné `sceneId`,
- neprázdné `image_prompt`,
- durable `image_bucket` + `image_path`,
- platná délka (`finite` číslo `> 0`),
- motion prompt OK:
  - originál v limitu, **nebo**
  - chybějící/prázdný originál nahrazený fallbackem,
- výsledný motion prompt neprázdný a ≤ 1000 UTF-16.

### 3. Co se započítává do ceny

| Pole | Význam |
| --- | --- |
| `totalEstimatedCredits` / `totalEstimatedCostUsd` / `totalProviderDurationSeconds` | **Runnable** — jen preparable |
| `theoreticalTotalEstimatedCredits` / `…CostUsd` / `…DurationSeconds` | Teoretický součet všech scén po opravě |
| `preparableSceneCount` / `unpreparableSceneCount` / `unpreparableSceneIds` | Počty a seznam |

Per-item `estimatedCredits`/`estimatedCostUsd` zůstávají teoretické pro danou položku (včetně unpreparable).

### 4. Neplatný originální motion prompt

| Případ | Chování |
| --- | --- |
| chybí (`null`/`undefined`) | fallback + `motion_prompt_fallback` |
| prázdný po trim | fallback + `motion_prompt_empty` + `motion_prompt_fallback` |
| > 1000 UTF-16 | **reject** — source `original`, `preparable=false`, `motion_prompt_too_long`, **bez** fallbacku |
| ne-string typ | **reject** — `motion_prompt_invalid_type`, `preparable=false`, bez fallbacku |

### 5. Výsledky testů

- `check:scene-video-plan` — **19 passed**
- `check:scene-video-attempts` — **29 passed**
- `check:runway-image-to-video` — **19 passed**
- `check:video-reel-orchestrator` — passed
- `check:visual-scene-plan` — **20 passed**
- `tsc --noEmit` — OK
- eslint `lib/scene-video-plan` + check skript — OK

### 6. Síť / placené AI

**Nulová** skutečná síťová a placená volání. Žádný DB zápis. Žádné zapojení do job runneru.
