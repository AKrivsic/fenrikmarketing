# Product Demo Similarity Audit

**Date:** 2026-07-21  
**Scope:** Trace where visual similarity of PRODUCT_DEMO scenes originates  
**Method:** Implementation analysis + last completed video jobs with PRODUCT_DEMO  
**Mode:** Diagnosis only — no fixes, redesign, or implementation proposals  

**Primary package referenced:** `c8c17f53-3257-4785-8676-0931dac13633` (run `b98a3ba8…`)  
**Compared jobs (PRODUCT_DEMO present):**

| video_job | created_at (UTC) | demo_variant | outcome_type |
|---|---|---|---|
| `e872b684…` (b98a3ba8) | 2026-07-20 20:57 | `after_hours_response` | `lead_captured` |
| `edcc904a…` | 2026-07-20 18:08 | `after_hours_response` | `lead_captured` |
| `35b8e7ba…` | 2026-07-19 23:02 | `lead_capture` | `lead_captured` |
| `f29496cb…` (2f896bec) | 2026-07-19 21:01 | `after_hours_response` | `question_resolved` |
| `ef5ca0dd…` | 2026-07-19 00:49 | `after_hours_response` | `lead_captured` |

---

## Executive answer

**Kde skutečně vzniká podobnost Product Demo scén?**

V **deterministickém typed-scene raster composeru**  
`lib/scene-types/product-demo/composeProductDemoRaster.ts`,  
volaném z `video-worker/services/prepareProductDemoSceneRaster.ts`.

To **není** image model.  
To **není** finální AI image prompt.  
To **není** Creative Identity ani Creative DNA.

Finální „obrázek“ Product Demo je **SVG šablona → PNG** (sharp).  
Texty Q/A/outcome se mění; **layout, framing, chat pattern a UI chrome jsou hardcoded**.

Pokud mapujeme na nabídnuté kategorie A–G:

| Podíl (odhad) | Část | Role |
|---:|---|---|
| **~80%** | *(mimo A–G)* Typed PRODUCT_DEMO raster composer | Vznik vizuální podobnosti |
| **~12%** | **A** Presentation Generation (+ PDI schema) | Vynucuje structured chat beat; LLM plní texty; často stejný `demo_variant` |
| **~5%** | **B** Product Reveal + Integrity prompts | Tlačí „complete demo = PRODUCT_DEMO, ne AI fake UI“ |
| **~3%** | **E/F/G** Scene Prompt / Image Prompt / Image Model | Pro PRODUCT_DEMO **nepoužito** na strukturu (jen stub prompt) |
| **~0%** | **C** Creative Identity | Nepodílí se na PRODUCT_DEMO rasteru |
| **~0%** | **D** Creative DNA | Nepodílí se na PRODUCT_DEMO rasteru |

**H — kombinace**, ale dominantní je jeden fixní renderer (~80%).

---

## 1. Rozhodovací řetězec (krok za krokem)

### 1.1 Product Reveal

**Přijaté:** project assets, visual medium, sample-payoff flags.  

**Přidané:** `solution_beat_strategy` (např. `ABSTRACT_PRODUCT_SYSTEM`) + prompt block „PRODUCT REVEAL“.  

**Přepsané:** nic na PRODUCT_DEMO layoutu.  

**Fixní pravidla:**
- „No fake UI“ pro **AI IMAGE** scény  
- Structured PRODUCT_DEMO až **po** opening meaning block  
- Strategie FRAMED_ASSET / ABSTRACT / OUTCOME — **ne** chat bubble layout  

**Výstup dál:** soft strategy string do Presentation promptu.  

**Vliv na podobnost dema:** nízký. Product Reveal **nezakládá** before/after chat UI. Spíš odděluje „AI nesmí malovat fake UI“ → demo musí jít do typed PRODUCT_DEMO.

Zdroj: `lib/product-reveal/promptBlocks.ts`, `resolveProductReveal.ts`.

---

### 1.2 Presentation Generation (+ Product Demonstration Integrity)

**Přijaté:** Candidate, DNA product role, PDI prompt block, Product Reveal block, allowed scene types včetně PRODUCT_DEMO.  

**Přidané (LLM):** structured beat:
```
type, actor_id, conversation_id,
question_visible/ai_answer_visible/outcome_visible = true,
outcome_type, visitor_question, ai_answer, outcome_label, brand_name,
(+ často demo_variant)
```
a `visual_scenes[]` entry `{ type: "PRODUCT_DEMO", payload: {...} }`.

**Přepsané:** `ensureStructuredProductDemo` normalizuje/doplní variantu, vsadí scénu `scene-product-demo`.  

**Fixní pravidla (prompt/schema — ne pixely):**
- Povinný semantic contract: input → value → outcome  
- Field names jsou **chat execution** (`visitor_question` / `ai_answer`)  
- Explicit: *„Current production renderer executes conversational products as a controlled chat UI.“*  
- Zakázané: empty bubbles / floating icon / landing-page-only jako demo  

**Výstup dál:** payload + typed scene (ne image composition).  

**Vliv na podobnost:** střední na **obsah textů** a na **výběr varianty**; nízký na geometrii layoutu (tu LLM nerenderuje).

Zdroj: `buildProductDemonstrationPromptBlock` v `productDemonstrationIntegrity.ts`; `ensureStructuredProductDemo.ts`.

---

### 1.3 Scene Planning

**Přijaté:** `visual_scenes` včetně PRODUCT_DEMO.  

**Přidané:** pořadí beatů, duration slots, motion intents (REVEAL/zoom_out na demo scéně).  

**Přepsané:** umístění scény v timeline (ne UI layout).  

**Fixní:** PRODUCT_DEMO nesmí zmizet (render fidelity fail-closed).  

**Výstup:** scene list do workeru.  

**Vliv na vizuální podobnost dema:** téměř žádný (jen „kdy“ se ukáže stejný template).

---

### 1.4 Scene Meaning / Visual Narrative / Creative DNA / Creative Identity

Pro **PRODUCT_DEMO raster path**:

| Blok | Vstup do `prepareProductDemoSceneRaster`? |
|---|---|
| Scene Meaning | NE |
| Visual Narrative | NE |
| Creative DNA | NE (jen dříve do PDI promptu jako product role text) |
| Creative Identity | NE |

`prepareProductDemoSceneRaster` čte **pouze** `scene.payload_snapshot` (ProductDemoBeat) a skládá SVG. Žádný identity lighting/camera, žádný DNA world, žádný VN meaning carrier.

**Vliv na podobnost dema: ~0%.**

---

### 1.5 Scene Prompt Builder / Final Image Prompt

Pro PRODUCT_DEMO:

```ts
productDemoPlaceholderImagePrompt(sceneId)
// → "presentation:product_demo:scene-product-demo"
```

To je **stub**, ne popis scény.  
V render_spec všech zkoumaných jobů je stejný pattern:

`image_prompt: "presentation:product_demo:scene-product-demo"`  
`renderer_version: "product_demo@1"`

**Image model (`gpt-image-1`) se pro tuto scénu nevolá.**  
Telemetry „Image generation · 5 scenes“ u b98a3ba8 zahrnuje i demo slot v countu pipeline, ale raster dema vzniká v `composeProductDemoRaster` (komentář v kódu: *„no image model“*).

**Vliv Image Prompt / Image Model na podobnost: ~0% (struktura).**

---

### 1.6 Rendered Product Demo Scene — skutečný vznik

```
payload (Q/A/outcome/variant)
    → composeProductDemoRaster(beat)
        → buildProductDemoChatSvg(beat)   // hardcoded SVG layouts
        → sharp(svg).png()
    → upload scene-scene-product-demo.png
```

Komentář v implementaci:

> *Deterministic Fenrik product-demo chat stills… Controlled UI — not AI lifestyle art.*

---

## 2. Kde vznikají konkrétní layout rozhodnutí

| Vizuální prvek | Kdo rozhodl | Kde v kódu |
|---|---|---|
| Before/after split (horní „No reply“ / dolní answered) | **Raster composer** variant `after_hours_response` | `layoutAfterHoursResponse` — `midY = height*0.48`, dashed `<line>` separator |
| Chat message bubbles L/R | **Raster composer** (všechny varianty) | `bubbleBlock()` + left/right edges |
| Lead captured box / green check | **Raster composer** | `layoutLeadCapture` / outcome bubble in after-hours; hardcoded strings `"New lead captured"`, `"Contact details saved automatically"` |
| Separator line | **Raster composer** | after-hours dashed line `#334155` |
| Phone frame chrome | **Raster composer** | `layoutConversationAnswer` — fixed phoneW=780, phoneH=1480, centered |
| Website chat panel chrome | **Raster composer** | `layoutLeadCapture` — fixed panel |
| Booking widget chrome | **Raster composer** | `layoutBookingConfirmation` |
| Centered / screenshot-like framing | **Raster composer** | fixed coords on 1080×1920 (`SHORT_PROFILE`) |
| „Tablet vs phone vs monitor“ | **Ne AI.** Varianta volí template: phone mockup **nebo** panel **nebo** widget **nebo** after-hours split — vždy stejná sada 4 šablon | `demoVariant.ts` + `composeProductDemoRaster.ts` |
| Camera / Identity treatment | **Nepoužito** na demu | — |
| Readable chat text | **Záměr rendereru** (na rozdíl od AI IMAGE NO_TEXT) | composer + PDI |

**Závěr k Layout / Camera / Product device:**  
Preferovaný Product Demo pattern **existuje a je hardcoded**. Není to výsledek image modelu ani Scene Prompt Builderu.

---

## 3. Co je dynamické vs prakticky fixní

### Dynamické (mění se mezi běhy)

- `visitor_question`, `ai_answer`, `outcome_label` (LLM / package authoring)  
- `outcome_type` (`lead_captured` | `booking_confirmed` | `question_resolved` | `contact_captured`)  
- `demo_variant` (explicit LLM, nebo `selectDemoVariant` / after-hours narrative heuristic)  
- `brand_name`, `conversation_id`  
- Motion okolo scény (`REVEAL` / `zoom_out`) — ne obsah UI  

### Prakticky fixní (opakuje se)

- Celá SVG geometrie 4 layout funkcí  
- Semantic contract Q→A→Outcome always visible  
- Stub image_prompt `presentation:product_demo:…`  
- Renderer `product_demo@1`  
- Canvas 1080×1920  
- Font stack `Inter, system-ui`  
- Color system (slate night / blue bubbles / green outcome)  
- Hardcoded chrome copy v šablonách (`11:42 PM · After hours`, `No reply`, `New lead captured`, `Conversation resolved`, …)  
- PDI schema forcing chat-shaped fields  

---

## 4. Porovnání posledních běhů — opakující se struktury (ne pixely)

### 4.1 Stejný image_prompt / renderer (všechny)

```
image_prompt: presentation:product_demo:scene-product-demo
renderer_version: product_demo@1
```

Žádný „clean UI split comparison“ AI prompt — stub.

### 4.2 Opakující se payload struktura

Všechny recent PRODUCT_DEMO joby mají stejný tvar:

```
type: product_demo
question_visible / ai_answer_visible / outcome_visible: true
visitor_question + ai_answer + outcome_label
brand_name: Fenrik.chat (vesměs)
demo_variant ∈ {after_hours_response, lead_capture, …}
```

### 4.3 Opakující se variant bias

Z 5 jobů s demem: **4× `after_hours_response`**, 1× `lead_capture`.

`after_hours_response` šablona vždy nese:
- night gradient background  
- top „No reply“ / unanswered bubble  
- dashed horizontal separator  
- bottom answered thread (Q + blue A)  
- green outcome chip  
- fixed „11:42 PM · After hours“ chrome (i když outcome_label zmínuje jiný čas — chrome je template)

Proto běhy s různými produkty (consultations / financing / pricing / after-hours chats) vypadají jako **stejný produktový UI pattern**.

### 4.4 Text se mění, skeleton ne — příklady

| Job | Q (zkráceno) | Variant | Layout skeleton |
|---|---|---|---|
| e872b684 | availability this week | after_hours_response | night split + chat |
| edcc904a | financing / used cars | after_hours_response | **stejný** |
| f29496cb | same-day consultations | after_hours_response | **stejný** |
| ef5ca0dd | multiple team members | after_hours_response | **stejný** |
| 35b8e7ba | tax filing deadline | lead_capture | jiná šablona, stále chat+lead card |

Lokální PNG `audit-b98a3ba8` a `audit-2f896bec` product-demo: obě **1080×1920**, podobná velikost souboru (~100–110 KB) — konzistentní s SVG→PNG stejné rodiny, ne s AI lifestyle stills (~1.5–2 MB u IMAGE scén).

---

## 5. Proč různé „produkty / témata“ končí podobným demem

1. **Pipeline vyžaduje** structured PRODUCT_DEMO s chat field names (PDI).  
2. **LLM smí měnit jen stringy** (a volitelně variant enum), ne layout.  
3. **Worker ignoruje** Identity / DNA / VN / image prompts pro tuto scénu.  
4. **Jediný vizuální executor** je `composeProductDemoRaster` se 4 fixními layouty.  
5. Narrative o after-hours / offline často mapuje na `after_hours_response` (`demoVariant.ts` regex + prefer), takže většina recent Fenrik běhů sdílí **jednu** šablonu.  
6. Product Reveal zakazuje AI „fake UI“, čímž **neotevírá** alternativní AI-generované demo look — naopak uzavírá cestu do typed composeru.

---

## 6. Odpovědi na fokusové otázky

### Layout (before/after, bubbles, lead box, separator, UI)

**Vzniká v `composeProductDemoRaster.ts`**, ne v Product Reveal, Presentation pixels, Scene Meaning, ani image modelu.  
Presentation/PDI pouze **předepisují**, že má existovat chat-shaped beat.

### Camera / framing

**Hardcoded** v layout funkcích (centered phone / panel / split). Identity camera settings se neaplikují.

### Product device (tablet / monitor / phone / dashboard)

**Ne AI.** Template variant:
- `conversation_answer` → phone mockup  
- `lead_capture` → website chat panel  
- `booking_confirmation` → booking widget  
- `after_hours_response` → night split (no device chrome, chat bubbles on canvas)  

Preferovaný pattern = **controlled Fenrik chat UI**, zdokumentovaný v kódu.

### Prompt struktury napříč běhy

Finální PRODUCT_DEMO „image prompt“ se **neopakuje jako kreativní text** — opakuje se jako **identický stub**.  
Opakující se „struktury“ jsou ve skutečnosti **SVG template structures**, ne prompt clauses typu „clean UI / split comparison“ v image promptu.

---

## 7. Jasný závěr

### Kde skutečně vzniká podobnost Product Demo scén?

**V deterministickém Product Demo raster composeru**  
(`composeProductDemoRaster` / `buildProductDemoChatSvg`),  
který je jediný, kdo kreslí before/after, bubbles, lead boxes, separators a device chrome.

Presentation Generation + PDI **způsobují**, že téměř každý balíček **vstoupí** do tohoto composeru se stejným chat kontraktem.  
To je nutná podmínka podobnosti, ale **vizuální podobnost samotná se materializuje až ve fixních SVG šablonách**.

Creative Identity, Creative DNA, Scene Meaning, Visual Narrative, Scene Prompt Builder a Image Model **nejsou místem vzniku** této podobnosti pro PRODUCT_DEMO.

---

## Appendix — klíčové soubory

| Soubor | Role |
|---|---|
| `lib/scene-types/product-demo/composeProductDemoRaster.ts` | **Vznik layoutu** (4 SVG templates) |
| `video-worker/services/prepareProductDemoSceneRaster.ts` | Worker path; explicit „no image model“ |
| `lib/scene-types/product-demo/demoVariant.ts` | Výběr šablony (deterministický) |
| `lib/scene-types/product-demo/productDemoBeat.ts` | Schema + stub prompt |
| `lib/scene-types/product-demo/ensureStructuredProductDemo.ts` | Vsazení typed scény |
| `lib/creative-candidates/productDemonstrationIntegrity.ts` | Prompt/schema forcing chat beat |
| `lib/product-reveal/promptBlocks.ts` | Anti fake-UI + demo not in opening |
| `lib/scene-types/renderers/productDemoSceneRenderer.ts` | Registry hook `product_demo@1` |
