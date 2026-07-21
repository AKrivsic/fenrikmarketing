# Universal Product Presentation Architecture

**Date:** 2026-07-21  
**Type:** Architectural design only  
**Constraints:** No code. No migrations. No prompts. No renderers. No SVG. No image-generation design. No UI redesign.

**Inputs to this design:**  
`reports/product-demo-architecture-audit.md`,  
`reports/hardcoded-visual-templates-full-audit.md`,  
existing Product Reveal philosophy (`REAL_ASSET` … `NO_PRODUCT_VISUAL`).

---

## 1. Executive Summary

Navrhovaná vrstva se jmenuje **Product Presentation Decision (PPD)**.

**PPD nerozhoduje, jak kreslit pixely.**  
**PPD rozhoduje pouze:**

1. **Zda** se má produkt ve videu vizuálně objevit.  
2. **Jakou třídou prezentace** (fidelity class) je to dovoleno.  
3. **Čím** (které assety / které ne-produktové formy důkazu hodnoty).  
4. **Jaký claim** smí scéna vůči divákovi nést (např. „toto je skutečný UI“ vs „toto je výsledek použití“).

**Hlavní princip (neměnný):**

> Nikdy netvrdit divákovi, že vidí skutečný produkt, pokud ho ve skutečnosti nevidí.  
> Produktová věrnost má vždy přednost před efektním vizuálem.  
> Pokud systém neumí produkt věrně zobrazit, nesmí vytvářet falešný UI.

PPD **sjednocuje** dnes rozštěpené cíle:

| Dnešní cíl | Kde dnes žije | Problém |
|---|---|---|
| „Ukaž, že produkt něco vyřešil“ | PRODUCT_DEMO / PDI | Splněno fake chat UI |
| „Neukazuj fake UI“ | Product Reveal | Ignorováno PRODUCT_DEMO |
| „Použij skutečné assety, když existují“ | Asset Library / coverage | PRODUCT_DEMO je nepoužívá |

**Nový model:** oddělit **důkaz hodnoty** (story/semantics) od **věrnosti produktu** (visual claim). Obě věci musí být splněny, ale **ne stejnou scénou a ne fake UI**.

Za dva roky: nový typ produktu = nové vstupy (Brain, assety, knowledge). **Architektura PPD se nemění.**

---

## 2. Návrh nové architektury (od nuly)

### 2.1 Pozice v pipeline

```text
Product Brain
      ↓
Story / Creative Candidates / DNA
      ↓
Visual Narrative
      ↓
Product Reveal          ← stávající filozofie (zachovat)
      ↓
Asset Library           ← schopnosti + katalog (zachovat)
      ↓
┌─────────────────────────────────────┐
│  Product Presentation Decision      │  ← NOVÁ VRSTVA (pouze rozhodnutí)
│  (PPD)                              │
└─────────────────────────────────────┘
      ↓
Scene Planning / Presentation Analyzer
      ↓
Renderers (IMAGE, PHONE, asset layout, typed cards, …)
      ↓
Video
```

PPD sedí **mezi** „máme příběh + assety + reveal strategii“ a „plánujeme konkrétní scény“.

Product Reveal zůstává **strategickým stropem** (co je dovoleno / preferováno).  
PPD je **konkrétní rozhodnutí per package / per solution beat** v rámci toho stropu.

### 2.2 Co PPD není

- Není renderer.  
- Není scene type.  
- Není SVG / chat template.  
- Není image prompt.  
- Není Product Brain.  
- Není Story Integrity (validátor).  
- Není „povinná scéna PRODUCT_DEMO“.

### 2.3 Oddělení dvou kontraktů

Architektura rozlišuje **dva nezávislé kontrakty**:

#### A. Value Proof Contract (univerzální)

Příběh musí někde ve videu učinit srozumitelným:

```text
počáteční stav → produkt/služba vytváří hodnotu → viditelný důsledek
```

Toto je **sémantický** požadavek na **story + visual meaning**.  
**Není** požadavek na konkrétní UI ani na typed scene.

Splnění může být:

- skutečný produktový asset (nejvyšší fidelity),  
- výsledek v reálném světě (outcome),  
- abstraktní mechanismus (bez čitelného fake UI),  
- služba / fyzický důsledek (úklid, jídlo, stavba),  
- v krajním případě **žádný produktový vizuál**, pokud story unese důkaz jinak (např. silný outcome beat) — v souladu s Product Reveal `NO_PRODUCT_VISUAL`.

#### B. Product Appearance Contract (fidelity)

Pokud scéna **tvrdí**, že divák vidí produkt (UI, zařízení, balení, provozovnu jako „náš produkt“), musí platit:

```text
appearance_claim = AUTHENTIC  ⇒  podklad je ověřený asset nebo ekvivalentní věrný zdroj
appearance_claim = NON_PRODUCT  ⇒  scéna nesmí vypadat jako screenshot / app UI produktu
```

**Zakázáno:** `appearance_claim = AUTHENTIC` při generickém / synthetic UI.

Tím se hlavní princip stává **architektonickým invariantem**, ne promptovou preferencí.

---

## 3. Odpovědnosti nové vrstvy

### 3.1 Co PPD rozhoduje

| # | Rozhodnutí | Popis |
|---|---|---|
| 1 | `should_show_product_appearance` | Ano / ne — má se v solution/payoff části objevit produkt jako *appearance* |
| 2 | `presentation_class` | Třída prezentace (viz výstupy) |
| 3 | `fidelity_tier` | Jaká věrnost je dosažitelná teď |
| 4 | `asset_binding` | Které asset ID(s) smí nést AUTHENTIC claim (nebo none) |
| 5 | `appearance_claim` | `AUTHENTIC` \| `NON_PRODUCT` \| `NONE` |
| 6 | `value_proof_mode` | Jak se splní Value Proof (appearance / outcome / abstract / narrative-backed / deferred) |
| 7 | `forbidden_forms` | Explicitní zákazy pro Scene Planning (např. synthetic_ui, fake_dashboard, invented_chat) |
| 8 | `rationale` | Strohé důvody rozhodnutí (pro audit / diagnostics) |

### 3.2 Co PPD rozhodovat nesmí

- Konkrétní scene type (`IMAGE` vs `PHONE` vs …) — to je Scene Planning.  
- Layout / composition / device chrome — to je renderer / asset layout.  
- Texty ve scéně, barvy, Identity treatment — Identity / DNA / Visual Profile.  
- Zda je story komerčně dobrý — Selection / commercial scoring.  
- Zda VO sedí na CTA — jiné vrstvy.  
- Inventovat produktový vzhled, když chybí asset.  
- Special-case větve podle odvětví (`if chatbot`).

---

## 4. Vstupy

PPD čte **schopnosti a omezení**, ne implementaci rendererů.

| Vstup | Co z něj PPD bere | Co z něj nebere |
|---|---|---|
| **Product Brain / project** | Co produkt *je* a *není* (popisně); cíle; zakázané claimy | UI šablony |
| **Asset Library** | Katalog: role, kvalita, suitability, preferred presentation, static/editable, dostupnost | Pixelová data |
| **Product Reveal plan** | Strop strategie (`REAL_ASSET` … `NO_PRODUCT_VISUAL`) + sample payoff flag | — |
| **Story / winner / DNA** | Kde je solution beat; zda příběh preferuje human/place/outcome | Creative prose do SVG |
| **Visual Narrative** | Primary meaning carrier; zda UI je vůbec nosičem významu | Konkrétní shot list |
| **Creative Identity** | Pouze omezení typu „nesmí lámat identity“ — ne layout | Staging axes do PPD |
| **Project Knowledge** | Override stropy (pokud existují) | — |
| **Renderer capability map** (abstraktní) | *Co pipeline umí doručit věrně* (framed asset, AI scene, text card…) jako **capability flags**, ne API rendererů | Interní Sharp/SVG detaily |
| **Story Integrity / fidelity policies** | Pravidla „landing page ≠ demo hodnoty“; zákaz fake success | Regexy vázané na chat |

**Princip vstupu:** PPD závisí na **deklarovaných schopnostech** („umíme věrně vložit Tier-1 screenshot do framed insert“), ne na kódu konkrétního compositoru.

---

## 5. Výstupy (pouze rozhodnutí)

Výstup PPD je **Product Presentation Plan** — strukturované rozhodnutí, ne media.

### 5.1 Presentation classes (univerzální, ne product-type)

Tyto třídy **nejsou** vázané na chatbot/CRM/restauraci. Popisují *vztah vizuálu k produktu*:

| Class | Meaning | Typical appearance_claim |
|---|---|---|
| `AUTHENTIC_PRODUCT_SURFACE` | Divák vidí skutečný produktový povrch (UI, balení, provoz, foto produktu) z assetu | `AUTHENTIC` |
| `AUTHENTIC_PRODUCT_IN_CONTEXT` | Skutečný asset v neutrálním / povoleném rámu (device frame bez předstírání, že rám = produkt) | `AUTHENTIC` |
| `PRODUCT_OUTCOME_WORLD` | Viditelný důsledek použití bez UI (tým, čistý prostor, hotové jídlo, hotová stavba) | `NON_PRODUCT` |
| `ABSTRACT_MECHANISM` | Mechanismus hodnoty bez čitelného UI (tok, spojení, priorita) | `NON_PRODUCT` |
| `BRAND_SIGNAL_ONLY` | Logo / barva / brand mark — **nesmí** tvrdit, že jde o produktové UI | `NON_PRODUCT` |
| `NO_PRODUCT_APPEARANCE` | Produkt se vizuálně neukáže; value proof jde jinudy nebo je oslaben | `NONE` |

Žádná třída není „CHAT_UI“ nebo „DASHBOARD_UI“.  
Pokud chatbot má screenshot chatu v Asset Library, spadne do `AUTHENTIC_PRODUCT_SURFACE`.  
Pokud nemá, **nesmí** vzniknout synthetic chat class.

### 5.2 Value proof modes

| Mode | Význam |
|---|---|
| `via_authentic_appearance` | Value proof nese autentický produktový povrch |
| `via_world_outcome` | Value proof nese důsledek ve světě |
| `via_abstract_mechanism` | Value proof nese abstraktní mechanismus |
| `via_story_without_product_pixels` | Value proof unese narrative + non-product visuals (v souladu s Reveal) |
| `unsatisfied` | Rozhodnutí: v tomto package **nelze** poctivě dokázat hodnotu vizuálem — eskalace na Story/Selection (ne fake UI) |

`unsatisfied` ≠ „nakresli fake UI“.  
`unsatisfied` = „nevyhovuj hlavnímu principu podvodem; řeš to na úrovni story/package quality“, nikoli synthetic product.

### 5.3 Forbidden forms (invariant list)

PPD vždy emituje zákazy minimálně:

- `synthetic_product_ui`  
- `invented_screenshot`  
- `generic_chat_as_product`  
- `generic_dashboard_as_product`  
- `brand_logo_as_product_demo`  
- `landing_page_alone_as_value_proof` (pokud to není autentický, relevantní surface pro daný beat — rozhoduje se podle asset role + story fit, ne podle odvětví)

Scene Planning a validátory tyto zákazy **musí** respektovat.

---

## 6. Rozhodovací principy (kompletní seznam)

1. **Fidelity over spectacle** — věrnost > efekt.  
2. **No false product claim** — žádný AUTHENTIC claim bez ověřeného podkladu.  
3. **No synthetic product UI** — nikdy jako náhrada chybějícího assetu.  
4. **Respect Product Reveal ceiling** — PPD nesmí zvolit silnější appearance, než Reveal dovolí.  
5. **Assets are the only path to AUTHENTIC appearance** (v dnešním smyslu pipeline: Asset Library / ověřené surfaces).  
6. **Value proof ≠ product appearance** — oboje je potřeba řešit; nesmí se slučovat do jedné fake scény.  
7. **Absence of assets is a valid state** — vede k outcome / abstract / no appearance, ne k inventovanému UI.  
8. **Universality by capability, not by vertical** — rozhoduj podle *jaké povrchy a důkazy máme*, ne podle „je to CRM“.  
9. **Prefer strong non-product truth over weak product lie** — lepší outcome/abstract/none než fake UI.  
10. **Landing / marketing page is not automatically value proof** — jen pokud je autentický surface a story fit.  
11. **Logo is brand, not product demonstration.**  
12. **Renderer-agnostic decisions** — PPD nezná SVG; zná jen capability tiers.  
13. **Auditable rationale** — každé rozhodnutí má důvody.  
14. **Forward compatible** — nové product forms = nové vstupy, stejné třídy.  
15. **Do not force product into the hook** — placement vůči Attention First / Reveal opening rules zůstává mimo PPD, ale PPD nesmí vyžadovat early fake product.

---

## 7. Integrace s Asset Library

### 7.1 Vztah

PPD **Asset Library znát musí** — jako **katalog schopností a kandidátů**, ne jako storage API.

PPD se ptá:

- Existují Tier-1 surfaces?  
- Jsou vhodné (suitability) pro video?  
- Umí je pipeline doručit jako framed/real insert bez porušení safety?  
- Kolik jich je; která sedí na solution beat?

PPD se **neptá**:

- jak Sharp skládá rámeček,  
- jaký SVG font použít.

### 7.2 Asset quality → presentation class (logika, ne kód)

| Asset situace | Preferovaná class | appearance_claim |
|---|---|---|
| Více kvalitních Tier-1 UI/product surfaces | `AUTHENTIC_PRODUCT_SURFACE` nebo `IN_CONTEXT` | `AUTHENTIC` |
| Jeden dobrý screenshot | totéž, jeden binding | `AUTHENTIC` |
| Pouze logo | `BRAND_SIGNAL_ONLY` nebo `NO_PRODUCT_APPEARANCE` | `NON_PRODUCT` / `NONE` |
| Pouze branding / barvy | `BRAND_SIGNAL_ONLY` / non-product | ne AUTHENTIC |
| Žádné assety | `PRODUCT_OUTCOME_WORLD` / `ABSTRACT_MECHANISM` / `NO_PRODUCT_APPEARANCE` | ne AUTHENTIC |

**Nikdy:** „žádný asset ⇒ synthetic UI“.

---

## 8. Integrace se Story / DNA / Visual Narrative

| Story prvek | Vliv na PPD |
|---|---|
| Solution / payoff beat existence | Kde *smí* platit appearance / value proof |
| Meaning carrier = human / place | Preferuj `PRODUCT_OUTCOME_WORLD` před slabým UI (soulad s Reveal) |
| Meaning carrier = product / process | Preferuj authentic surface nebo abstract mechanism |
| DNA ending / product role | Soft preference, ne vertical switch |
| Zakázané claimy projektu | Do `forbidden_forms` / odmítnutí AUTHENTIC claimu |

**Value Proof Contract** se vyhodnocuje vůči story:  
„Je v tomto package poctivě vidět, že něco vzniklo / se vyřešilo?“  
Pokud ne a zároveň nelze AUTHENTIC appearance, PPD volí non-product modes nebo `unsatisfied` — **ne fake demo**.

---

## 9. Integrace se Scene Planning

PPD předává **plán rozhodnutí**, Scene Planning z něj dělá scény.

### Co se předává dál

- `presentation_class`  
- `appearance_claim`  
- `asset_binding[]` (nebo empty)  
- `value_proof_mode`  
- `forbidden_forms`  
- `reveal_ceiling` (zkopírovaný / respektovaný)  
- `rationale`

### Co Scene Planning smí

- Vybrat scene types kompatibilní s class (např. IMAGE+asset, PHONE+asset, CTA s logem, AI outcome still).  
- Umístit proof mimo opening, pokud to vyžadují Attention / Reveal pravidla.  
- Rozdělit value proof a appearance do **více scén**, pokud to pomůže věrnosti.

### Co Scene Planning nesmí

- Porušit `forbidden_forms`.  
- Přidělit `AUTHENTIC` claim scéně bez `asset_binding`.  
- „Doplnit“ chybějící produkt synthetic UI, aby prošel starý PDI-like gate.

---

## 10. Integrace s renderery

**PPD je na rendererech nezávislá.**

Zná pouze **capability catalog**, například:

| Capability | Význam pro PPD |
|---|---|
| `can_composite_ authentic_asset` | Smí zvolit AUTHENTIC classes |
| `can_ai_scene_non_ui` | Smí outcome/abstract bez UI claimu |
| `can_text_card` | Brand/checklist/quote — ne product UI |
| `cannot_synthesize_product_ui` | Hard flag — synthetic UI není capability |

Pokud by někdy existoval renderer „controlled chat“, směl by se použít **jen** když:

- Asset Library dodá autentický chat surface, **nebo**  
- appearance_claim není AUTHENTIC a scéna **nevypadá** jako produktový screenshot (tj. není to „fake Fenrik UI“).

V navrhované filozofii: **synthetic product UI capability se do katalogu vůbec nezařazuje** jako povolená cesta k value proof.

---

## 11. Chování při různé kvalitě assetů

| Situace | PPD rozhodnutí (shrnutí) | Co se nesmí stát |
|---|---|---|
| Mnoho kvalitních assetů | AUTHENTIC surface/context; value proof přes appearance nebo appearance+outcome | Ignorovat assety ve prospěch synthetic UI |
| Jeden screenshot | AUTHENTIC s jedním bindingem, pokud Reveal dovolí | Násobit fake variantami |
| Pouze logo | Brand signal / no appearance; value proof přes outcome/abstract | Logo jako „product demo“ |
| Pouze branding | NON_PRODUCT | Fake dashboard v brand barvách |
| Žádné assety | Outcome / abstract / no appearance; případně `unsatisfied` | Fake chat / fake CRM / fake ERP UI |

Tím je hlavní princip dodržen ve **všech** situacích.

---

## 12. Univerzálnost napříč typy produktů

Architektura **neobsahuje** větve `if chatbot / if CRM`.

Místo toho mapuje **povrchy a důkazy**:

| Produkt (příklad) | Typické vstupy do PPD | Typické rozhodnutí |
|---|---|---|
| Chatbot | screenshot chatu / widget | AUTHENTIC surface *pokud asset existuje* |
| CRM / ERP / dashboard | UI screenshots | AUTHENTIC surface |
| Mobilní / desktop app | mobile/desktop screenshots | AUTHENTIC / IN_CONTEXT |
| AI agent | UI nebo outcome „úkol hotov“ | appearance nebo outcome |
| Restaurace | foto prostoru / jídla / menu board asset | AUTHENTIC world surface nebo outcome |
| Úklid | before/after foto | OUTCOME_WORLD |
| Architekt | vizualizace / foto realizace | AUTHENTIC nebo outcome |
| Fyzický produkt | packshot / in-use foto | AUTHENTIC surface |
| E-commerce | PDP / catalog screenshot | AUTHENTIC surface |
| Bez assetů, jakýkoli typ | — | non-product modes / none — **stejná pravidla** |

Nový typ za dva roky: přinese jiné Brain texty a jiné asset role — **stejné presentation classes**.

---

## 13. Má zůstat PRODUCT_DEMO jako koncept?

### Argumentace (bez implementace)

**Současný PRODUCT_DEMO slučuje tři věci, které nepatří k sobě:**

1. Semantický požadavek „ukaž hodnotu“  
2. Typed scene + hard gate;  
3. Chatbot-specific synthetic renderer.

**Doporučení architektury:**

| Prvek | Verdikt |
|---|---|
| Název / typ `PRODUCT_DEMO` jako **povinná univerzální scéna** | **Nezachovávat** jako centrální koncept |
| Semantický Value Proof Contract | **Zachovat** — přesunout mimo fake UI |
| Chat SVG / fake UI jako default proof | **Odstranit z architektury** jako legitimní cestu |
| „Demo“ jako *jedna z možných forem*, pokud = AUTHENTIC asset showing real product interaction | **Ano** — ale jako instance `AUTHENTIC_PRODUCT_SURFACE`, ne jako globální scene religion |

**Závěr:**  
PRODUCT_DEMO by **neměl** zůstat samostatnou univerzální architektonickou vrstvou.  
Může historicky existovat jako *jedna legacy forma*, ale v cílové architektuře je to nanejvýš **speciální případ autentického assetu** (skutečný chat screenshot), ne generický důkaz.

---

## 14. Porovnání: současná vs navržená architektura

| Oblast | Současný stav | Navržený stav | Akce |
|---|---|---|---|
| Rozhodovací vrstva | Implicitní (PDI + ensure + variant heuristics) | Explicitní PPD | **Přidat / oddělit** |
| Value proof | = structured chat beat | Oddělený kontrakt | **Oddělit** |
| Product appearance | Fake UI přijatelné | Jen AUTHENTIC nebo NON_PRODUCT | **Přesunout pravidlo do invariantu** |
| Product Reveal | Konfliktuje s PRODUCT_DEMO | Reveal = strop pro PPD | **Sloučit filozoficky; PPD pod Reveal** |
| Asset Library | Mimoběžná | Primární cesta k AUTHENTIC | **Propojit** |
| Scene type PRODUCT_DEMO | Povinný | Není centrální | **Odstranit jako povinnost; případně přejmenovat/legacy** |
| Chat renderer variants | Globální „demo“ | Není presentation class | **Odstranit z univerzální architektury** |
| Story Integrity „demo missing“ | Vázané na chat/beat | Vázané na Value Proof modes | **Přesunout význam** |
| Render fidelity PRODUCT_DEMO | Fail-closed typed scene | Fidelity = appearance_claim respekt | **Přesunout** |
| PHONE / IMAGE / asset layout | Parallel | Execution pod Scene Planning | **Zachovat** |
| Creative Identity / DNA / VN | Ignorovány demem | Omezují / informují PPD, nerenderují | **Zachovat oddělení** |
| Default brand Fenrik.chat | V schema | Nemá místo v PPD | **Odstranit z univerzální vrstvy** |
| „Universal“ wording 5.3 | Bez univerzálního rendereru | Univerzální *rozhodnutí*, ne fake UI | **Přejmenovat smysl: PPD, ne PRODUCT_DEMO** |

### Shrnutí akcí (architektonické, ne implementační)

- **Zachovat:** Product Reveal filozofie; Asset Library; Scene Planning; renderery pro authentic assets a non-UI cards; Identity/DNA/VN jako vstupy.  
- **Oddělit:** Value proof vs product appearance.  
- **Odstranit (z cílové architektury):** povinný synthetic PRODUCT_DEMO; fake UI jako satisfiability shim.  
- **Přesunout:** rozhodování o „jak ukázat produkt“ do PPD; validace na appearance_claim + value_proof_mode.  
- **Přejmenovat:** „Product Demonstration Integrity“ → validace Value Proof + Appearance Claim (ne chat schema).  
- **Sloučit:** Reveal ceiling + PPD do jedné rozhodovací linie (Reveal nadřazený).

---

## 15. Rizika

| Riziko | Popis |
|---|---|
| Regression „žádný důkaz“ | Bez fake UI mohou některé balíčky ztratit snadný visual proof — správně podle principu, ale commercially bolí |
| Over-use of NO_PRODUCT_APPEARANCE | Líná cesta; nutná kvalitní Story/Selection disciplinа |
| Ambiguous assets | Špatně otagovaný „screenshot“ může nést AUTHENTIC claim neprávem — závislost na Asset metadata kvalitě |
| Dual systems during transition | Legacy PRODUCT_DEMO vedle PPD = opět konflikt, pokud neexistuje jasný superseding rule |
| Conflating outcome with product | World outcome scény se nesmí vizuálně vydávat za app UI |
| Capability catalog drift | Pokud capability flags lžou o tom, co render umí, PPD rozhodne špatně |

---

## 16. Otevřené otázky

1. Je `unsatisfied` value proof **hard fail** package, nebo **soft** s nižším commercial score? (Architektura dovoluje obojí; produktová politika musí zvolit.)  
2. Smí „live component capture“ z vlastního webu klienta počítat jako AUTHENTIC, pokud není v Asset Library jako soubor?  
3. Jak striktně oddělit **marketing landing** od **product surface** při stejné URL?  
4. Má sample mode vyžadovat silnější value proof než běžný run?  
5. Jak řešit multi-product projekty (jedna značka, více surfaces)?  
6. Zůstane legacy PRODUCT_DEMO dočasně jako opt-in pouze pro projekty s explicitním autentickým chat assetem, nebo se vypne zcela?

*(Tyto otázky jsou politiky nad architekturou — architektura je na ně připravená.)*

---

## 17. Kritérium úspěchu

Architektura PPD je úspěšná, když platí **všechny** body:

1. **Nový typ produktu** nevyžaduje změnu PPD tříd ani principů — jen nové vstupy.  
2. **Žádná cesta** v rozhodnutí nevede k synthetic product UI jako „důkazu“.  
3. Pokud existuje kvalitní asset, systém ho **preferuje** před non-product i před AI vynálezem UI.  
4. Pokud asset neexistuje, systém zvolí outcome / abstract / none — **nikoli fake UI**.  
5. Product Reveal a PPD **nikdy nevydají konfliktní příkaz** (PPD ≤ Reveal ceiling).  
6. Scene Planning dokáže vykonat plán **bez znalosti odvětví**.  
7. Divákovi se **AUTHENTIC** claim zobrazí jen tehdy, když podklad je skutečný.  
8. Za dva roky audit „proč je ve videu X“ umí přečíst `rationale` PPD bez čtení rendererů.

---

## 18. Jednoduchý rozhodovací strom (konceptuální)

```text
Reveal dovoluje AUTHENTIC asset path?
  NE → presentation_class ∈ {OUTCOME, ABSTRACT, BRAND_ONLY, NONE}
  ANO → existuje vhodný Tier-1/2 surface asset + pipeline capability?
            ANO → AUTHENTIC_PRODUCT_SURFACE / IN_CONTEXT + asset_binding
            NE  → stejné jako NE výše

Value proof splněn zvolenou class?
  ANO → emit plan
  NE  → zkus jinou NON_PRODUCT class
  stále NE → value_proof_mode = unsatisfied
              (nikdy: synthetic UI)
```

Žádná větev „chatbot“ / „CRM“.

---

## 19. Závěrečná teze

> **Univerzální produktová prezentace není univerzální renderer.**  
> Je to univerzální **rozhodnutí o věrnosti a claimu**, napojené na Asset Library a podřízené Product Reveal, s odděleným sémantickým důkazem hodnoty.  
> Současný PRODUCT_DEMO je historický saturovatelný chat shim; v cílové architektuře **není** středem systému.

---

*End of architecture design. No implementation implied.*
