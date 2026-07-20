# Stop-scroll implementation plan

**Cíl:** maximalizovat pravděpodobnost, že uživatel nepřeskočí video v prvních sekundách.  
**Rozsah:** úpravy existující kreativní architektury. Žádné nové workflow, komponenty, UI, DB, výkon, cena.  
**Evidence:** retention-audit-9e697a2f, creative/decision audity, originality-loss ff367a55, prompt-builder priority, family-reliability, ablation-ff367a55, production-audit-9d9fa60b, ai-reasoning-audit.

---

## Verdikt

Pipeline už deklaruje ATTENTION FIRST a HOOK V2 (scroll-stop #1). Selection v3, Creative Identity, Narrative SETUP weighting a klidné Scene Meaning execution systematicky vybírají a renderují opak — komerčně bezpečné, low-event openy.

Oprava je v rozhodovacích gatech a prioritě promptů. Ne v nové architektuře.

---

## Opakující se selhání (z auditů)

| Pattern | Evidence | Frekvence |
| --- | --- | --- |
| Commercial overturn stop winnerů | ai-reasoning-audit, production-audit-9d9fa60b, `finalSelectionScore` | Systémové |
| Klidný / empty / desk / board first frame | retention-audit-9e697a2f (76 % emptiness; ~0–2/21 stop) | Systémové |
| Spoken open = explanation / soft observation | retention-audit (48 % explanation+observation; 0 % question/surprise) | Systémové |
| Stored hook silnější než slyšená řádka | retention-audit 57 % mismatch; `alignHook` promote path | Časté |
| Creative Identity relokuje winner world | originality-loss ff367a55; ablation Identity CRITICAL | Časté |
| Fidelity false pass / metaphor collapse | family-reliability; concept-fidelity-root-cause | Časté |
| All soft-rejected → commercial lottery | ai-reasoning-audit selection fallback | Občasné, ale rozhodující |
| Product/ad smell v openu | retention-audit packages 15, 20 | Občasné |

---

## Pořadí změn (dopad / náročnost)

| # | ID | Změna | Priorita | Složitost |
| ---: | --- | --- | --- | --- |
| 1 | HOOK-1 | Při kandidátovi jen enforce hookLine; nepromovat slabší VO | Critical | XS |
| 2 | SEL-1 | Top-N podle stopPower, teprve pak commercial | Critical | S |
| 3 | PG-1 | Hard resolver: openingSituation/event > Identity treatment | Critical | S |
| 4 | SEL-2 | Přeladit family commercial priors (stop ≠ penalizace) | Critical | S |
| 5 | ID-1 | Identity nesmí relokovat opening world | High | S |
| 6 | ATT-1 | Opening motion → ATTENTION/REVEAL; zabít calm koncepty | High | S |
| 7 | GEN-1 | Zakázat commercial crown na all-soft-rejected pool | High | S |
| 8 | NB-1 | První 3 s = jen HOOK; SETUP nemluví brzy | High | M |
| 9 | FID-1 | Validovat opening EVENT + anti-essay | High | M |
| 10 | PR-1 | Ban product/offer v prvních 2 s | Medium | S |
| 11 | FAM-1 | Preferovat renderable stop-strong families | Medium | S |
| 12 | CQ-1 | Po hooku eskalace, ne lecture | Medium | S |
| 13 | DNA-1 | DNA world z opening EVENT props | Medium | M |
| 14 | VN-1 | Beat 1 = interruptive meaning carrier | Medium | S |

---

## Změny podle komponent

### 1. Comparative Judge / Selection v3

#### SEL-1 — Stop-scroll gate before commercial crown

| | |
| --- | --- |
| **Priorita** | Critical |
| **Složitost** | S |
| **Důvod** | `finalSelectionScore = creative + commercial` (commercial max ~180) rutinně overturnuje `mostLikelyToStopScrolling` (c5/c1 → c3 `direct_product_world`). |
| **Očekávaný přínos** | Winners, které skutečně přeruší feed, přežijí selection místo commercially safe low-stop openů. |
| **Technický dopad** | Jen winner policy. Badge zůstávají diagnostic. Žádný nový judge stage. |
| **Soubory** | `lib/creative-candidates/comparativeJudge.ts`, `commercialScore.ts`, types (diagnostics), `promptBlocks.ts` (winnerReason copy) |
| **Prompty / logika** | Mezi eligible shortlist top-N podle `stopPower` (tiebreak memorability); commercial volí jen uvnitř shortlistu. Floor: reject winner pokud `stopPower ≤ maxStop−2`, pokud pool není prázdný. Změkčit copy, která slaví „COMMERCIAL SUCCESS of the finished ad“ jako primární cíl. |
| **Rizika** | Více metaphor/absurd winnerů → více fidelity repair / NO_TEXT opacity. Mitigace: firstFrame floor uvnitř shortlistu (SEL-2). |
| **Doporučení** | Two-phase shortlist (C), ne globální commercial down-weight. |

**Porovnání options:**

| Option | Pros | Cons | Verdikt |
| --- | --- | --- | --- |
| A. Global commercial ×0.35 | One-line change | Stále rankuje celý pool; může vybrat unreadable high-stop | Backup |
| B. Hard stopPower ≥ 7 floor | Simple | Empty pool / false rejects | Too blunt |
| C. Top-N by stop, then commercial | Zachová shipability uvnitř interruptive set | Tunovat N (2–3) | **Recommended** |

---

### 2. Commercial Score / Family Metadata

#### SEL-2 — Stop-preserving commercial priors

| | |
| --- | --- |
| **Priorita** | Critical |
| **Složitost** | S |
| **Důvod** | Family metadata drtí `absurd_understandable` (reliability 2) a `consequence_first`, zatímco boostuje `direct_product_world` (reliability 9, nejslabší stop). Commercial heuristiky penalizují high-event openy (boards, clocks), které audity označují jako stop-strong. |
| **Očekávaný přínos** | High-stop families zůstanou selectable, když existuje renderable varianta; stop není commercial liability. |
| **Technický dopad** | Retune `COMMERCIAL_SCORE_WEIGHTS` + `CREATIVE_FAMILY_COMMERCIAL_METADATA` + text penalties; stejné dimenze. |
| **Soubory** | `lib/creative-candidates/familyMetadata.ts`, `commercialScore.ts`, `scoreCandidates.ts` (optional stop floor) |
| **Prompty / logika** | Snížit gap `commercialSurvivability` / `narrativeSurvivability` mezi families. Přidat positive commercial credit za event verbs (walking away, unanswered, rival finished, melting, fight), aby `firstFrameClarity` odměňovala interruptive situations, ne jen calm product-world. |
| **Rizika** | Mírně vyšší render failure na metaphor opens — akceptovat, pokud zůstane firstFrameClarity gate. |

---

### 3. Creative Candidates / Genericity

#### GEN-1 — Stop fallback-to-rejected-pool commercial lottery

| | |
| --- | --- |
| **Priorita** | High |
| **Složitost** | S |
| **Důvod** | Když jsou všichni soft-rejected (`topic_collapsed_to_generic_business`), judge použije full rejected pool → commercial crown nejbezpečnějšího kandidáta. |
| **Očekávaný přínos** | Nevybírat least-bad commercial essay, když divergence už flagnula genericity. |
| **Technický dopad** | Scoring + judge pool policy; optionally one divergence re-run. |
| **Soubory** | `lib/creative-candidates/scoreCandidates.ts`, `comparativeJudge.ts`, `planForPackage.ts` / divergence runner |
| **Prompty / logika** | Pokud eligible empty: prefer highest `stopPower` mezi rejected s `firstFrameClarity≥5`, ne max commercial. Nebo jedna divergence regenerate před fallbackem. Nikdy commercial crown jako primary, když je pool all soft-rejected. |
| **Rizika** | Více empty-eligible runů → regenerate latency. |

---

### 4. Creative Candidates Families

#### FAM-1 — Prefer stop-strong families when renderable

| | |
| --- | --- |
| **Priorita** | Medium |
| **Složitost** | S |
| **Důvod** | Family reliability: `direct_product_world` preferovaný pro pipeline survival, ale nejslabší stop; `consequence_first` / `visual_exaggeration` nejsilnější stop, pod commercial téměř nevyhrávají. |
| **Očekávaný přínos** | Selection inventory obsahuje interruptive concepts, které stále clearnou firstFrameClarity. |
| **Technický dopad** | `familyBoost` + commercial metadata + divergence scoring; žádné nové families. |
| **Soubory** | `lib/creative-candidates/scoreCandidates.ts`, `familyMetadata.ts`, `divergence/scoreRawSituation.ts` |
| **Prompty / logika** | Boost `visual_exaggeration` + `consequence_first`, když `openingSituation` má concrete props a `!requires_readable_text`. Divergence `scoreRawSituation`: weight scroll-stop event > product adjacency pro early ranking. |
| **Rizika** | Více product-bridge work mid-film — řeší existující `productConnection` / PDI. |

---

### 5. Hook Enforcement / Alignment

#### HOOK-1 — Never promote diluted VO over candidate hookLine

| | |
| --- | --- |
| **Priorita** | Critical |
| **Složitost** | XS |
| **Důvod** | Retention audit: 57 % spoken≠stored hook. Workflow běží `alignHookWithFirstSpoken` před `enforceCandidateHook`; `alignHook` může promovat kratší non-generic, ale slabší opening do hook fieldu. |
| **Očekávaný přínos** | První 1.0–1.8 s vždy nese selected stop line, ne essay setup. |
| **Technický dopad** | Reorder + tighten alignment rules; expand cliche detectors. |
| **Soubory** | `lib/ai/workflows/generateContentPackage.ts`, `lib/attention/alignHookVoiceover.ts`, `lib/attention/cliches.ts`, `enforceCandidateHook.ts` |
| **Prompty / logika** | Když existuje Creative Candidate: skip promote-from-VO; jen enforce `hookLine→VO`. Expand `matchesGenericSetupOpener` (Here’s what nobody / Everyone says / Most businesses / I’ll be honest…). Po enforce reject essay cadence na first unit (existující genericity helpers). |
| **Rizika** | Abrupt hook + body join, pokud zbytek VO stále essay — párovat s NB-1. |

**Porovnání options:**

| Option | Pros | Cons | Verdikt |
| --- | --- | --- | --- |
| Jen expand cliches | Tiny | `alignHook` stále promotuje weak non-cliche opens | Insufficient alone |
| Candidate present ⇒ enforce-only | Používá existující `enforceCandidateHook` | Non-candidate packages potřebují cliches | **Recommended + cliche expand** |

---

### 6. Attention Mechanism / Opening Contract

#### ATT-1 — Bias first-motion to ATTENTION; kill calm default concepts

| | |
| --- | --- |
| **Priorita** | High |
| **Složitost** | S |
| **Důvod** | `OpeningContract` mapuje mnoho structures na HOLD; originality bank stále scaffolduje calm desk / empty whiteboard. Retention: 0 % surprise/tension emotion v prvních 3 s. |
| **Očekávaný přínos** | First frame + delivery interrupt scroll místo hold quiet beat. |
| **Technický dopad** | Catalog + openingContract + originalityPass tweaks only. |
| **Soubory** | `lib/attention/openingContract.ts`, `originalityPass.ts`, `catalog.ts`, `cliches.ts` |
| **Prompty / logika** | Default `first_motion_intent` na ATTENTION/REVEAL pro HOOK; HOLD rezervovat pro mid-arc. Prefer `emotional_effect ∈ {surprise, tension, curiosity, dilemma, frustration}` nad recognition/relief pro open. Reject visual concepts matching retention cliche clusters i jako „less obvious“. |
| **Rizika** | Louder opens mohou působit méně „brand safe“ — záměrné dle ATTENTION FIRST. |

---

### 7. Creative Identity

#### ID-1 — Identity cannot relocate opening world

| | |
| --- | --- |
| **Priorita** | High |
| **Složitost** | S |
| **Důvod** | Persisted identities force „bright co-working / documentary / calm mood“ přes winner worlds. DNA world treatment existuje, ale audity ukazují relokaci. |
| **Očekávaný přínos** | Scroll-stop staging přežije do `image_prompts`. |
| **Technický dopad** | resolve + prompt wording; filter environment catalog. |
| **Soubory** | `lib/creative-identity/resolveCreativeIdentity.ts`, `dimensionCatalog.ts`, `filterDimensions.ts`, `promptBlocks.ts`, `planForPackage.ts` |
| **Prompty / logika** | Vždy `dnaWorldTreatment`, když je candidate DNA nebo `openingSituation`. Ban environment strings, které jmenují alternate locations (co-working, café, studio), pokud `openingSituation` už není to místo. Mood: avoid „calm/quiet“ pro HOOK — prefer tension/urgency z catalogu. |
| **Rizika** | Series visual variety klesne — kompenzovat props/composition axes only. |

**Porovnání options:**

| Option | Pros | Cons | Verdikt |
| --- | --- | --- | --- |
| Delete Identity block | Ablation ukazuje huge visual influence | Ztráta series coherence / treatment | Reject |
| DNA treatment-only + forbid relocate | Zachová look axes | Vyžaduje catalog filter | **Recommended** |
| Post-hoc rewrite image_prompts | Deterministic | Nové pipeline behavior / fights LLM | Jen pokud prompt resolver selže |

---

### 8. Narrative Beats

#### NB-1 — First 3s = HOOK only; SETUP cannot speak early

| | |
| --- | --- |
| **Priorita** | High |
| **Složitost** | M |
| **Důvod** | Required arc HOOK→SETUP→ESCALATION dává explanation hned vedle; duration weights SETUP 1.05 vs HOOK 0.7. Retention: incomplete setup sentences při ~2.25s drop-off. |
| **Očekávaný přínos** | Viewer slyší complete stop thought + vidí event před jakoukoli lecture. |
| **Technický dopad** | `deriveBeats` + `durationWeights` + promptBlocks guidance. |
| **Soubory** | `lib/narrative-beats/deriveBeats.ts`, `durationWeights.ts`, `promptBlocks.ts`, `viewerComprehension.ts` |
| **Prompty / logika** | HOOK duration weight ≥ SETUP. Hard rule: first spoken unit + `visual_scenes[0]` musí dokončit curiosity spike; SETUP informace začíná až potom. Prefer `whyContinue` jako open loop, ne „because we explain the problem“. |
| **Rizika** | Information-progression validators mohou warn — soften pro beat 1→2, když je hook event-complete. |

---

### 9. Presentation Generation / Prompt Builder

#### PG-1 — Hard opening-event priority resolver

| | |
| --- | --- |
| **Priorita** | Critical |
| **Složitost** | S |
| **Důvod** | ATTENTION FIRST říká scroll-stop #1, ale Identity / DNA / Scene Meaning / amplify-not-replace prohrávají s calm co-working stills. Ablation: Creative Identity CRITICAL na visuals. Originality-loss: parking-lot mascot → bright co-working. |
| **Očekávaný přínos** | Scene 1 = attention event matching `openingSituation`, ne tasteful illustration. |
| **Technický dopad** | Prompt text + ordering uvnitř existujícího builderu; žádné nové blocks. |
| **Soubory** | `lib/ai/prompts/generateContentPackage.ts` (`visualBeatsLines` + ATTENTION FIRST), `lib/creative-candidates/promptBlocks.ts`, `lib/creative-identity/promptBlocks.ts`, `lib/attention/promptBlocks.ts` |
| **Prompty / logika** | Explicit resolver: (1) `winner.openingSituation` + Opening Contract first visual (2) Creative DNA world (3) Identity treatment only (4) Visual Narrative meaning. Forbid scene-1 defaults: empty boards, calm desks, café+laptop, faceless screen-staring, soft empty environments. Scene Meaning: „one-second understanding of the EVENT“, ne essay theme. |
| **Rizika** | Extrémnější stills; Identity series-variety může fightovat — lean on DNA treatment mode. |

---

### 10. CONTENT QUALITY / Creative Directives

#### CQ-1 — Align quality arc with stop-scroll, not explainer clarity

| | |
| --- | --- |
| **Priorita** | Medium |
| **Složitost** | S |
| **Důvod** | CONTENT QUALITY + MODE BEATS stále dovolují Hook→explanation body. Ablation: Content Quality CRITICAL na VO. Soft essay middles po enforced hook stále zabíjejí watch-time. |
| **Očekávaný přínos** | Body po hooku eskaluje stakes místo lecture. |
| **Technický dopad** | Static prompt lines + creativeDirectives mode beat copy. |
| **Soubory** | `lib/ai/prompts/generateContentPackage.ts`, `lib/ai/prompts/creativeDirectives.ts` |
| **Prompty / logika** | Po hooku: next sentence must raise cost/contradiction/surprise — forbid restating topic as setup. Cap words before first twist. Keep CREATIVE SAFETY; nepřidávat brand-safety soft language. |
| **Rizika** | Některé modes (story) potřebují setup clause — dovolit jen ≤6 words. |

---

### 11. Concept Fidelity

#### FID-1 — Validate opening EVENT + anti-essay, not token overlap alone

| | |
| --- | --- |
| **Priorita** | High |
| **Složitost** | M |
| **Důvod** | Family reliability: fidelity false positives (concept text matches, stills co-working) a false negatives (NO_TEXT boards). Retention failures pass, protože tokens share bez visual eventu. |
| **Očekávaný přínos** | Repair loops fire, když scene 1 je calm metaphor / VO essay i při loose word match. |
| **Technický dopad** | Extend `fidelityCheck` diagnostics + repair appendix text. |
| **Soubory** | `lib/creative-candidates/fidelityCheck.ts`, `candidateValidation.ts`, repair prompts v `generateContentPackage.ts` |
| **Prompty / logika** | Fail pokud scene1 postrádá action/stakes tokens z `openingSituation` po `stripNoText`; fail `matchesEssayCadence` / generic openers na first spoken i když hook field matches; opaque metaphors pass jen pokud metaphorClarity decode je v first spoken third (existující helper). |
| **Rizika** | Více repair loops / full regenerations — cap už existuje; thresholds tunovat opatrně. |

---

### 12. Creative DNA / Story Integrity

#### DNA-1 — Author DNA world from opening EVENT props

| | |
| --- | --- |
| **Priorita** | Medium |
| **Složitost** | M |
| **Důvod** | Story Integrity lockuje world — dobře — ale pokud je DNA world generic „business website moment“, lock zachová calm emptiness (departure board → unlabeled wall). |
| **Očekávaný přínos** | World lock zachová interruptive props, ne empty abstractions. |
| **Technický dopad** | creativeDNA authoring + storyIntegrity guidance. |
| **Soubory** | `lib/creative-candidates/creativeDNA.ts`, `storyIntegrity.ts`, `generateCandidates` / `divergence/buildCandidatesFromSituations.ts` |
| **Prompty / logika** | `DNA.world` musí jmenovat concrete event props z `openingSituation` (who/what is mid-action). Immutable rule: nenahrazovat opening event empty environment stejného theme. SI repair: fail calm empty stills, které dropnou event verb. |
| **Rizika** | Stricter SI → více repairs na Identity conflict (párovat s ID-1). |

---

### 13. Product Reveal / Product Demonstration

#### PR-1 — Hard ban product/offer in first 2s

| | |
| --- | --- |
| **Priorita** | Medium |
| **Složitost** | S |
| **Důvod** | Retention: product/offer opens (ad smell). PDI správně vyžaduje structured demo, ale nic hard-neblokuje demo/offer language jako spoken open. |
| **Očekávaný přínos** | Odstraní immediate ad recognition exits. |
| **Technický dopad** | Product reveal plan + PDI / fidelity first-spoken checks. |
| **Soubory** | `lib/product-reveal/promptBlocks.ts`, `resolveProductReveal.ts`, `productDemonstrationIntegrity.ts`, `fidelityCheck.ts` |
| **Prompty / logika** | Reveal timing ≥ beat 3 / after curiosity payoff start. Forbidden: product name, pricing, CTA verbs v first spoken unit. `PRODUCT_DEMO` nikdy `visual_scenes[0]`. |
| **Rizika** | Lead-gen packages mohou působit product-late — akceptovatelné pod ATTENTION FIRST. |

---

### 14. Visual Narrative / Visual Profile

#### VN-1 — Opening beat: interruptive meaning carrier

| | |
| --- | --- |
| **Priorita** | Medium |
| **Složitost** | S |
| **Důvod** | VN „believable / immediately understandable“ + NATURAL profile „restrained“ tlačí tasteful stills. Retention: polished AI aesthetic je scroll-invisible. |
| **Očekávaný přínos** | Meaning carrier pro beat 1 je event, ne mood board. |
| **Technický dopad** | Prompt blocks + resolve preferences pro beat 1 only. |
| **Soubory** | `lib/visual-narrative/promptBlocks.ts`, `visualStoryDirector.ts`, `lib/visual-profile/*` prompt pieces |
| **Prompty / logika** | Pro HOOK beat: prefer high-contrast action subject; explicitně dovolit „ugly / messy / mid-action“ nad candid calm. Profile NATURAL od beat 2+ nebo jako treatment bez calm staging. |
| **Rizika** | Mírná ztráta brand polish na openu — záměrné. |

---

## Nedělat

- Nové AI workflow / nový judge model / nové komponenty
- UI, DB schema, performance, cost, enterprise scope
- Optimalizace commercial safety nebo marketing correctness nad attention
- Mazat Story Integrity / PDI — retargetovat je, aby chránily events, ne calm continuity

---

## Doporučená implementační vlna

**Vlna 1 (Critical, XS–S):** HOOK-1 → SEL-1 → PG-1 → SEL-2  
**Vlna 2 (High, S):** ID-1 → ATT-1 → GEN-1  
**Vlna 3 (High, M):** NB-1 → FID-1  
**Vlna 4 (Medium):** PR-1 → FAM-1 → CQ-1 → DNA-1 → VN-1
