# Post-Run Review — `fbe48cf4`

**Run ID:** `fbe48cf4-c052-4e31-8b75-8bad362673f4`  
**Project:** Fenrik.chat (`aabab9ff-9db4-4012-a53c-135e3bfea6cd`)  
**Analyzed:** 2026-07-25  
**Scope:** Read-only analysis. No code, prompt, or production changes.

**Evidence sources:** Supabase (`production_runs`, `production_run_items`, `content_packages`, `content_items`, `content_strategy_items`, `video_jobs`), package/video telemetry, n8n executions, audit exports (`scripts/audit-production-run.ts`, `creative-audit-production-run.ts`, `decision-audit-production-run.ts`, `export-production-run-audit.ts`).

Legend: **EVIDENCE** · **INFERENCE** · **UNKNOWN**

---

# ČÁST 1 — EXECUTIVE SUMMARY

## Výsledek

Run **dokončen úspěšně**: `status=completed`, `generated_total=1`, `failed_total=0`.  
1 content package (`Good Traffic Is a Lie`), 11 platform content items, 1 video job (`completed`).  
Žádný schema repair, žádný AI retry, žádný moderation fallback, žádný render warning.

## Délka

| Metrika | Hodnota |
| --- | ---: |
| Produktivní wall clock (run create → item completed) | **~6.8 min** (00:08:01 → 00:14:47 UTC) |
| Package AI pipeline | **102 s** |
| Video worker | **~291 s** (create → complete) |
| Parent `production_runs.updated_at` | **05:58:00 UTC** (~5.7 h po dokončení itemu) |

Produktivní běh je zdravý. Pozdní touch parent runu je observabilita / settle problém, ne délka generování.

## Cena (list-price estimate)

| Bucket | USD |
| --- | ---: |
| Content Strategy | $0.0156 |
| Package AI (Concept + Opening + Package) | $0.1086 |
| Media (TTS + Whisper + 5× image) | $0.2177 |
| **Celkem** | **~$0.342** |

Render = $0 (local video engine).

## AI volání

| Typ | Počet | Poznámka |
| --- | ---: | --- |
| Claude text | 3 | Strategy, Video Concept, Content Package |
| OpenAI text | 1 | Opening Impact (`gpt-4o-mini`) |
| TTS | 1 | `gpt-4o-mini-tts` / voice `shimmer` |
| Whisper | 1 | `whisper-1` |
| Image | 1 step / 5 stills | `gpt-image-1` |
| **Repair / retry** | **0** | — |
| **Úspěšnost** | **100 %** | 1/1 package, 1/1 video |

## Hlavní problémy

1. **Concept → Package fidelity gap:** Video Concept plánuje PROOF (produkt) + CTA ve voiceoveru; finální VO **nikdy nejmenuje Fenrik** ani řešení — končí punchline „The website was live. The business was not.“
2. **Lead-gen cíl vs soft CTA:** projekt `goal_type=lead_generation`, default CTA „Create your AI assistant“; package CTA = **save** engagement.
3. **Brand assets nevyužity:** 5 product captures existují, `asset_usage=[]`, product reveal jen AI-generovaný „teal chat UI“.
4. **Typed presentation dead path:** prompt ceiling dovoluje CHECKLIST/PHONE/QUOTE/CTA, requested counts = 0, výstup 5× IMAGE.
5. **Parent run FK / settle:** `production_run_items.content_item_id` i `video_job_id` zůstaly `null`; parent `updated_at` ~5.7 h po dokončení.

## Hlavní silné stránky

1. End-to-end **green path** bez repair loop (oproti b343 caption incident).
2. Silný **contrarian hook** a konkrétní scénář (Tuesday / 34 sessions / 0 leads).
3. Telemetrie kroků kompletní; TTS/subtitle validace prošla napoprvé (`match_ratio≈0.97`).
4. Platform copy (zejm. LinkedIn + X varianty) je specifická a použitelná.
5. Nový n8n bridge `O27ELb1s9Y2qisOr` (retry off) doběhl jednou, bez duplicate paid retry.

## Známky

| Oblast | Skóre | Komentář |
| --- | ---: | --- |
| Technická kvalita | **8 / 10** | Stabilní green path; FK/settle a duration drift |
| Obsahová kvalita | **5.5 / 10** | Silný problém, slabý produkt a konverze |
| Pipeline stabilita | **8.5 / 10** | 0 repair/retry; settle lag |
| Production readiness | **6 / 10** | Technicky doručí; marketingově ještě ne „client-ready“ |

---

# ČÁST 2 — TECHNICKÁ ANALÝZA

## Timeline (UTC 2026-07-25)

| Krok | Start | End | ms | Model | Tokens (p/c) | $ | Retry | Repair | Warn | Err | Výstup | Hodnocení |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| Product Brain | — | — | 0 | *(reuse)* | — | 0 | — | — | — | — | Existující brain | OK vstup |
| Knowledge Base | — | — | 0 | *(reuse)* | — | 0 | — | — | — | — | Cards + 10 scenarios | OK vstup |
| Recent Memory | — | — | 0 | *(load)* | — | 0 | — | — | — | — | 6 fingerprints | OK |
| Content Strategy | 00:08:03 | 00:08:08 | 5197 | claude-sonnet-4-6 | 4103 / 221 | 0.0156 | 0 | 0 | 0 | — | 1× problem_aware item | Dobré |
| Strategy Items | 00:08:08 | 00:08:09 | 450 | deterministic | — | 0 | 0 | 0 | 0 | — | persist | OK |
| n8n bridge exec **1232** | 00:08:09 | 00:09:56 | ~107s | O27ELb1s9Y2qisOr | — | — | — | — | — | — | success | OK |
| Video Concept | 00:08:13 | 00:08:47 | 34313 | claude-sonnet-4-6 | 3876 / 1282 | 0.0309 | 0 | 0 | 0 | — | „Good Traffic Is a Lie“ | Silné |
| Opening Impact | 00:08:47 | 00:08:51 | 3530 | gpt-4o-mini | 4212 / 159 | 0.0007 | 0 | 0 | 0 | — | hook sentence | Levné, redundantní kontext |
| Visual Identity | 00:08:51 | 00:08:51 | 1 | deterministic | — | 0 | 0 | 0 | 0 | — | copy of visual_direction | OK |
| Content Package | 00:08:51 | 00:09:52 | 61226 | claude-sonnet-4-6 | 9770 / 3178 | 0.0770 | 0 | 0 | 0 | — | full package JSON | Nejdražší text; fidelity gap |
| Platform Outputs | 00:09:52 | 00:09:52 | 1 | deterministic | — | 0 | 0 | 0 | 0 | — | 6 platforem | OK |
| Persist Package | 00:09:52 | ~00:09:55 | 2950 | deterministic | — | 0 | 0 | 0 | 0 | — | package + 11 items | OK |
| TTS | 00:09:56 | 00:10:03 | 6384 | gpt-4o-mini-tts | 343 chars | 0.0051 | 0 | 0 | 0 | — | 25.25 s audio | OK |
| Whisper / Subtitles | 00:10:03 | 00:10:05 | 2638 | whisper-1 | 57 words | 0.0025 | 0 | 0 | 0 | — | english, no fallback | OK |
| Images | 00:10:06 | 00:11:58 | 112454 | gpt-image-1 | 5 stills | 0.2100 | 0 | 0 | 0 | — | generated=5, reused=0 | Nejpomalejší $ |
| Render | 00:11:58 | 00:14:38 | 159815 | video_engine | — | 0 | 0 | 0 | 0 | — | 26.73 s mp4 | Nejpomalejší wall |

## Nálezy napříč pipeline

### Zbytečná AI volání

- **Opening Impact** (~4.2k prompt tokens) znovu táhne Product Brain + Recent Memory, ačkoli Video Concept už má first sentence / opening direction. Výstup je krátký JSON; cena nízká ($0.0007), ale **token waste** a sekvenční latence ~3.5 s.
- **INFERENCE:** Opening Impact by mohl být deterministic extract z Concept, nebo výrazně menší prompt.

### Duplicity

- `visual_scenes[].image_prompt` ≡ `image_prompts[]` (byte-level duplicate v package_brief).
- `visual_identity` ≈ `video_concept.visual_direction` + opening fields (deterministic copy).
- `delivery_reason` obsahuje 3× „Delivery:“ stacked; stejný text se lepí do `tts_instructions`.
- Product Brain cards z knowledge ≈ project_brain (dvojí transport stejného obsahu do promptů).

### Nevyužité výstupy

- Concept `narrative_arc` PROOF + CTA **nepropsány** do `voiceover_text`.
- `prompt_presentation_types` obsahuje CHECKLIST/PHONE/QUOTE/CTA → requested counts 0 → worker 5× IMAGE.
- `target_visual_beat_count=8`, `visual_beat_count=5`.
- 5 brand assets v projektu → `asset_usage=[]`.
- Analyzer / history typed decisions = prázdné (pass-through only).
- Default project CTA „Create your AI assistant“ → nepoužito.

### Zbytečné transformace

- Visual Identity jako samostatný „step“ je jen merge/copy (1 ms) — OK jako stamp, ale nafukuje telemetry narrative.
- Scene plan 5×4 s = 20 s vs TTS 25.2 s → worker stretch; brief `duration_seconds="42"` je **fantom** (nesedí ani na TTS ani na render).

### JSON repair

- **0** — pozitivní oproti b343.

### Nejpomalejší

1. Video render ~160 s  
2. Image gen ~112 s  
3. Content Package ~61 s  
4. Video Concept ~34 s  

### Nejdražší

1. Images $0.21 (61 % total)  
2. Content Package $0.077  
3. Video Concept $0.031  
4. Strategy $0.016  

### Nejrizikovější

1. Concept→Package fidelity (tichá ztráta produktu ve VO)  
2. Parent run settle / null FKs na run_item  
3. IMAGE-only collapse typed presentation  
4. Soft CTA při lead_gen goal  

---

# ČÁST 3 — OBSAHOVÁ ANALÝZA

Produkt: **Fenrik.chat** — AI website assistant, 24/7 answers, lead capture, ~1 min setup.  
Cíl projektu: **lead_generation**. Default CTA: **Create your AI assistant**.

## Product Brain

**Silné:** Jasné product_is / is_not, pain points, audience segments, tone.  
**Slabé:** Strengths se v tomto runu téměř neprojevily (0/14 used v analytics exportu). Forbidden claims prázdné — OK.  
**Zlepšení:** Vynutit aspoň 1 strength + 1 proof claim do package u lead_gen funnelu.

## Strategie

Theme: *The leads your website is losing while you sleep*  
Item: Tuesday analytics / weekend visitors / zero leads. Pain: *Visitors leave before contacting you*. Funnel: **problem_aware**.

**Silné:** Konkrétní moment, emocionální úhel („quiet horror“), anti-repetition částečně funguje (jiný hook než prior fingerprints).  
**Slabé:** Tematicky blízko recent memory (traffic/leads/silence — opakovaný cluster). Pouze 1/1 problem_aware — žádná diverzita funnelu (očekávané při packageCount=1).  
**Zlepšení:** Diversify motif mimo „analytics dashboard / zero leads“ cluster; po 2–3 podobných packages hard-block.

## Video Concept

Title: **Good Traffic Is a Lie**. Mode: **contrarian**.

**Silné:** Přesný reframe (traffic ≠ traction), silný product_role v conceptu, vizuální směr konzistentní.  
**Slabé:** Concept slibuje PROOF s produktem ve VO — to se později ztratí.  
**Zlepšení:** Guardrail: package VO musí obsahovat product beat pokud concept.product_role není empty.

## Opening Impact

Hook: **You thought traffic meant success.**

**Silné:** Deklarativní reframe, dobrý scroll-stop pro B2B/SMB. First image brief je konkrétní.  
**Slabé:** Pacing „slow and deliberate“ může být pomalý pro TikTok cold traffic.  
**Zlepšení:** A/B variant s agresivnějším číslem v první větě („34 visitors. Zero leads.“).

## Voiceover

```
You thought traffic meant success. She opened her analytics on Tuesday morning —
34 sessions over the weekend. She smiled. Then she looked at the leads column. Zero.
No names. No emails. No record of anyone. They came. They had questions. They found
silence. And they went to whoever answered first. The website was live. The business
was not.
```

**Silné:** Přirozené tempo, srozumitelnost, krátké (~25 s speech), silný closing punchline.  
**Slabé:** **Žádný produkt, žádný benefit, žádný lead CTA.** Scene 4 vizuálně ukazuje chat UI, ale VO mluví stále o problému. CTA typu save není ve VO.  
**Zlepšení:** 1–2 věty řešení + soft brand CTA (soulad s lead_gen).

## Visual Identity

**Silné:** Warm neutrals + cold screen contrast, lived-in desk, konzistentní character. Brand accent až v product moment — dobrý storytelling.  
**Slabé:** MINIMAL profile + pure AI stills → riziko generického „AI office“ look. Brand assets nepoužity.  
**Zlepšení:** Povinný 1× product asset insert na proof beat.

## Images

5× `gpt-image-1`, žádný reuse.

**Silné:** Prompty jsou specifické (34/0, hand stillness, competitor tab).  
**Slabé:** AI look pravděpodobný (dashboard text, chat UI); žádná real Fenrik UI. Character consistency napříč stills **UNKNOWN** bez vizuální prohlídky souborů (report neembeduje binárky).  
**Zlepšení:** Reference image / asset conditioning na scene 4–5.

## Video

Duration ~26.7 s, whisper match ~0.97, no render warnings, SFX off.

**Silné:** Clean mux, subtitle alignment OK, TTS tail validation passed first try.  
**Slabé:** 5 stejných IMAGE typů po 4 s → stretch na 26 s; chybí typed CTA endcard; motion semantic role default EXPLAIN.  
**Zlepšení:** Explicit duration sync VO↔scenes; last beat typed CTA s project default.

## Platform outputs

| Platform | Silné | Slabé | Návrh |
| --- | --- | --- | --- |
| **TikTok** | Punchy caption, emoji | CTA null; žádný produkt | Přidat soft CTA / reply prompt |
| **Instagram** | Dobrý storytelling caption + save CTA | Stále bez brand name | Jeden řádek „how we fix it“ |
| **YouTube** | Short-ready; save CTA | Slabý search title | Title s keyword „website leads“ |
| **Facebook** | Relatable question opener | format=`reel` při text_only config; emoji | Sjednotit format contract |
| **LinkedIn** | Nejsilnější B2B copy; 2 varianty | CTA null; bez URL (problem_aware OK by policy) | Solution-aware follow-up post |
| **X** | 5 title + 5 caption variant; URL na variant index 2 (`https://fenrik.chat`) by design | Ostatní varianty bez linku / CTA | OK pattern; zvážit conversion stage |

---

# ČÁST 4 — PIPELINE KVALITA

## Málo kontextu

- Content Package **nevidí** explicitní „must realize concept.narrative_arc PROOF/CTA in voiceover“ contract.
- Typed scene types jsou v ceiling, ale **requested_*_count=0** → model nemá důvod je emitovat.
- Asset catalog (5 captures) se do package promptu prakticky nepropsal do `asset_usage`.

## Zbytečný kontext

- Opening Impact znovu dostává Product Brain + Recent Memory (~20.5 KB prompt) pro ~159 completion tokens.
- Content Package prompt ~40 KB — obsahuje Concept + Opening + Identity + Brain + Strategy (Identity už je subset Concept).
- Recent fingerprints (6) jsou bohaté; část motif historie se opakuje v clusteru traffic/leads.

## Prompt moc dlouhý

- Content Package: **9770 prompt tokens / 39.4 KB** — největší textový step.
- Opening Impact input větší než Video Concept output potřebuje.

## Prompt moc obecný

- IMAGE-first encouragement + requested typed counts 0 = systémově preferuje generické stills.
- Soft CTA „save“ není korigován proti project `lead_generation`.

## Prompt duplicitní

- Brain v Strategy + Concept + Opening + Package.
- Visual direction v Concept a znovu jako Visual Identity a znovu v image prompts.

## Prompt odporuje jinému promptu

- Concept narrative_arc vyžaduje product proof ve VO; package VO ho vynechává — **chybí cross-stage consistency rule**.
- `prompt_presentation_types` vs `requested_*_count=0` vs IMAGE-only output.
- Project default CTA vs package CTA type `save`.
- Decision-audit vs runtime voice: package scoring vybral **shimmer** (`package_secondary`); project resolver path je oddělený (cedar/alloy legacy) — dvě truth sources.

## Repair / guardrail

- Repair v tomto runu **nebyl potřeba** (dobré).
- URL append na X variant index 2 funguje jako intended safety net (`lib/ai/websiteLinks.ts`) — ne repair.
- Chybí guardrail na: product mention ve VO, CTA alignment s goal, asset_usage non-empty při existujících product assets, duration_seconds ≈ speech duration.

---

# ČÁST 5 — COST REVIEW

## Cena po krocích

| Krok | $ | % total |
| --- | ---: | ---: |
| Image generation (5) | 0.2100 | 61.4% |
| Content Package | 0.0770 | 22.5% |
| Video Concept | 0.0309 | 9.0% |
| Content Strategy | 0.0156 | 4.6% |
| TTS | 0.0051 | 1.5% |
| Whisper | 0.0025 | 0.7% |
| Opening Impact | 0.0007 | 0.2% |
| Deterministic steps | 0 | 0% |
| Render | 0 | 0% |
| **Total** | **0.3419** | 100% |

## Největší token consumers

| Step | Prompt | Completion |
| --- | ---: | ---: |
| Content Package | 9770 | 3178 |
| Opening Impact | 4212 | 159 |
| Content Strategy | 4103 | 221 |
| Video Concept | 3876 | 1282 |

Cached tokens: **0** všude — žádný prompt caching benefit.

## Kde ušetřit

1. **Image reuse / asset inserts** — největší $ páka (i 1 reused still = −$0.042).  
2. Zúžit Content Package prompt (odebrat Identity duplicate, zkrátit brain).  
3. Opening Impact → deterministic nebo mini-prompt bez full brain.  
4. Prompt caching na opakovaný Product Brain block.  
5. Méně X variants pokud klient nepotřebuje 5 (šetří completion v Package, ne media).

## Kde se šetřit nemá

1. Video Concept kvalita (relativně levný, vysoký leverage na nápad).  
2. Whisper alignment (levný, kritický pro titulky).  
3. TTS quality / instructions.  
4. Schema validation bez blind skip (b343 lesson).

---

# ČÁST 6 — PERFORMANCE REVIEW

## Nejpomalejší části

1. **Render ~160 s** — lokální IO/CPU.  
2. **Image gen ~112 s** — 5 sériových/batched OpenAI image calls.  
3. **Content Package ~61 s** — Claude wall.  
4. **Video Concept ~34 s** — Claude wall.

## Čekání podle typu

| Typ | Odhad | Poznámka |
| --- | --- | --- |
| OpenAI (Opening + TTS + Whisper + Images) | ~125 s | Dominuje image |
| Claude (Strategy + Concept + Package) | ~101 s | Sekvenční |
| Local render | ~160 s | Po images |
| DB persist | ~3 s | Persist Package |
| n8n bridge overhead | malý | exec 1232 ≈ package wall |

## Sekvenční části → kandidáti na paralelismus

| Dnes sekvenčně | Paralelní kandidát | Riziko |
| --- | --- | --- |
| TTS → Whisper → Images → Render | **TTS(+Whisper) ∥ Images**, pak Render | Nízké — Whisper potřebuje audio; images ne |
| Concept → Opening → Package | Opening ∥ partial Identity | Střední — Package závisí na obou |
| Strategy → n8n package | už oddělené | — |

**INFERENCE:** Paralelizace TTS∥Images by ušetřila ~25–30 s wall na tomto runu (TTS+Whisper ~9 s překryté image startem).

## Parent settle lag

Item completed **00:14:47**. Parent `updated_at` **05:58:00**. Recovery cron (`0wgLd6QxLiT37iLR`) běžel; přesný důvod late touch **UNKNOWN** (chybí status history). Produktivní doručení bylo hotové v ~7 min — UI/ops metrika „run completed“ může lhát.

---

# ČÁST 7 — TECHNICKÝ DLUH

## Critical

1. **`production_run_items` bez `content_item_id` / `video_job_id`** po successful complete — rozbitá korelace run→video.  
2. **Concept→Package product fidelity** není enforced (tichá ztráta marketing value).

## High

3. Parent run `updated_at` / settle semántika vs skutečné dokončení (~5.7 h gap).  
4. `video.duration_seconds="42"` vs speech 25 s / render 27 s — lživá metadata.  
5. Dva voice truth sources (package score `shimmer` vs project resolver cedar/alloy) — decision audit hlásí jiný příběh než runtime job.  
6. Typed presentation path dead: ceiling ≠ requested counts ≠ output.

## Medium

7. Duplicate `image_prompts` / `visual_scenes`.  
8. Facebook/LinkedIn `format: "reel"` při `platformContentTypes` text_only.  
9. `target_visual_beat_count` 8 vs delivered 5 bez warning.  
10. 0 cached_tokens — chybí caching strategy na stable brain blocks.  
11. Presentation analyzer image pass-through only — drahá infrastruktura bez produkčního důkazu typed path.

## Low

12. Stacked „Delivery:“ v `tts_instructions`.  
13. Creative audit header „voice: cedar“ vs job `shimmer` — tooling inconsistency.  
14. SFX `not_selected` — OK default, ale žádný experiment.

---

# ČÁST 8 — CONTENT DLUH

## Critical

1. **Voiceover bez produktu** při lead_gen cíli — video educates, neprodává.  
2. **CTA type `save`** místo conversion CTA (Create your AI assistant).

## High

3. Product reveal jen AI fake UI — **branding gap**.  
4. Asset library unused — plýtvání existujícími product captures.  
5. Narrative arc PROOF/CTA z Concept se nepropsaly — storytelling truncated.  
6. Tematický cluster s recent memory (traffic/leads/silence) — originalita eroduje napříč runy.

## Medium

7. Hook silný, ale pomalý pacing opening impact pro cold short-form.  
8. Platform CTAs nekonzistentní (null na TikTok/LinkedIn/X vs save jinde).  
9. Strengths / pricing / „1 minute setup“ nevyužity.  
10. Emocionalita končí v problému — chybí relief beat ve VO.

## Low

11. Hashtag sady generické (`#smallbusiness`).  
12. Character industry záměrně non-specific — OK pro reach, slabší pro niche resonance.  
13. Žádný SFX / music bed — může snížit scroll retention.

---

# ČÁST 9 — PRIORITY (TOP 20 podle ROI)

| # | Zlepšení | Náročnost | Dopad | Priorita |
| ---: | --- | --- | --- | --- |
| 1 | Enforce Concept PROOF/CTA → voiceover (consistency guard) | M | Velmi vysoký | P0 |
| 2 | Align package CTA s `goal_type` / default CTA | S | Vysoký | P0 |
| 3 | Require ≥1 product asset na proof beat | M | Vysoký | P0 |
| 4 | Fill `production_run_items` video_job_id + content_item_id | S | Vysoký (ops) | P0 |
| 5 | Parallel TTS∥Images before render | M | Střední–vysoký (time) | P1 |
| 6 | Image reuse / reference conditioning | M | Vysoký ($ + brand) | P1 |
| 7 | Fix duration_seconds = speech-based | S | Střední | P1 |
| 8 | Shrink Opening Impact prompt or make deterministic | S | Střední ($/time) | P1 |
| 9 | Trim Content Package prompt duplicates | M | Střední ($) | P1 |
| 10 | Force ≥1 typed beat (CTA/CHECKLIST) when ceiling allows | M | Vysoký (vizuál) | P1 |
| 11 | Immediate parent settle on item complete (not only cron) | M | Vysoký (UX) | P1 |
| 12 | Anti-repetition hard-block na traffic/leads cluster | S | Střední | P2 |
| 13 | Single voice source of truth (document + unify) | M | Střední | P2 |
| 14 | Prompt-cache Product Brain block | S | Střední ($) | P2 |
| 15 | Platform format contract vs content_type | S | Nízký–střední | P2 |
| 16 | Put product name / URL policy into IG/TikTok soft CTA | S | Střední | P2 |
| 17 | Warn when visual_beat_count << target | S | Nízký | P2 |
| 18 | Deduplicate image_prompts storage | S | Nízký | P3 |
| 19 | Clean stacked Delivery strings | S | Nízký | P3 |
| 20 | Experiment light SFX on problem→relief turn | S | Nízký–střední | P3 |

S = small, M = medium.

---

# ČÁST 10 — VERDIKT

## C) GOOD FOUNDATION BUT NEEDS ITERATION

**Proč ne B:** Technický green path je blízko „minor improvements“, ale obsahově run **nesplňuje lead_gen job** — VO bez produktu, soft save CTA, brand assets unused. To není kosmetika; to je core marketing outcome.

**Proč ne D:** Pipeline je stabilní, levná (~$0.34), rychlá (~7 min productive), schema/repair zdravé, copy a hook jsou nad průměrem. Základ je použitelný.

**Proč ne A:** Klient by dostal pěkný problem video, které **neprodává Fenrik**.

---

## Appendix — IDs

| Entity | ID |
| --- | --- |
| production_run | `fbe48cf4-c052-4e31-8b75-8bad362673f4` |
| strategy (weekly) | `dfb8f999-6a88-402e-87a7-bddedf65fbc5` |
| strategy_item | `51d2f466-2f1b-48e4-8fb7-1734cf469fdc` |
| content_package | `fb9839ea-92fd-461b-a1a5-002058ea4251` |
| production_run_item | `1c34a3ba-0913-40e5-8598-8ef5a44c122c` |
| video_job | `df31e14e-4a31-4e8f-b4ef-8a454d899e26` |
| primary video content_item (tiktok) | `4a2606f1-df1b-4eb1-8b9a-a1954d976f0f` |
| n8n package bridge exec | `1232` (`O27ELb1s9Y2qisOr`) |

## Appendix — Related dumps (local, not committed requirement)

- `reports/production-run-fbe48cf4-…-audit.md`
- `reports/production-run-fbe48cf4-…-creative-audit.md`
- `reports/production-run-fbe48cf4-…-decision-audit.md`
- `scripts/output/production-run-fbe48cf4-…-audit-export.json`
