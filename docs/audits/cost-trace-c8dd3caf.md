# Cost Trace Audit — Production Run `c8dd3caf-c407-418c-be49-d4cf0a3b7bf9`

Generated 2026-07-22T21:34:47.083Z. **Financial audit only** — not a quality or architecture review.

## Cost basis (read first)

| Label | Meaning |
| --- | --- |
| `exact_telemetry` | Persisted `estimated_cost` on strategy/package steps |
| `estimated_list_price` | Worker media with null `estimated_cost`: image = generated × $0.042; TTS = chars/1000 × $0.015; Whisper = TTS seconds/60 × $0.006 |
| `estimated_from_medians` | Failed packages have **no telemetry**. Cost = median completed package stage total × attempt multipliers |
| `unmetered` | Deterministic validators / render compute — $0 API in telemetry |

## Executive totals

| Basis | USD | Share |
| --- | --- | --- |
| Exact telemetry (strategy + package AI) | $3.7006 | 43.3% |
| Media list-price estimates (images/TTS/Whisper) | $1.5106 | 17.7% |
| Failed-package median estimates [ESTIMATED] | $3.3408 | 39.1% |
| **Total traceable / estimated** | $8.5520 | 100% |

Run requested **14** packages → **8 completed**, **6 failed**. Strategy exact cost: $0.0033 (gpt-4o-mini Weekly Strategy).

## Workflow costs (all AI / media workflows)

| Workflow | Calls | Model | Provider | OK | Fail | Retries | Tokens In | Tokens Out | Cost | Avg Cost | Runtime ms | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Creative Ideation | 9 | claude-sonnet-4-6 | claude | 9 | 0 | 0 | 38741 | 101508 | $1.6388 | $0.1821 | 2010299 | exact_telemetry |
| Image generation | 8 | gpt-image-1 | image | 8 | 0 | 0 | 0 | 0 | $1.4280 | $0.1785 | 901698 | estimated_list_price |
| Presentation Generation | 7 | claude-sonnet-4-6 | claude | 7 | 0 | 1 | 205693 | 31834 | $1.0946 | $0.1564 | 552181 | exact_telemetry |
| ESTIMATED ideation (failed pkg 4) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.7770 | $0.7770 | 0 | estimated_from_medians |
| ESTIMATED ideation (failed pkg 12) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.5827 | $0.5827 | 0 | estimated_from_medians |
| Creative Direction Evaluation | 8 | claude-sonnet-4-6 | claude | 8 | 0 | 0 | 21743 | 15752 | $0.3015 | $0.0377 | 294067 | exact_telemetry |
| Creative Direction Generation | 8 | claude-sonnet-4-6 | claude | 8 | 0 | 0 | 17701 | 15914 | $0.2918 | $0.0365 | 348559 | exact_telemetry |
| ESTIMATED ideation (failed pkg 3) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.1942 | $0.1942 | 0 | estimated_from_medians |
| ESTIMATED ideation (failed pkg 5) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.1942 | $0.1942 | 0 | estimated_from_medians |
| ESTIMATED ideation (failed pkg 9) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.1942 | $0.1942 | 0 | estimated_from_medians |
| ESTIMATED ideation (failed pkg 13) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.1942 | $0.1942 | 0 | estimated_from_medians |
| Creative Evaluation | 6 | claude-sonnet-4-6 | claude | 6 | 0 | 0 | 22687 | 8215 | $0.1913 | $0.0319 | 173291 | exact_telemetry |
| Story Integrity Repair | 1 | claude-sonnet-4-6 | claude | 1 | 0 | 0 | 25854 | 3689 | $0.1329 | $0.1329 | 66273 | exact_telemetry |
| ESTIMATED presentation (failed pkg 3) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.1302 | $0.1302 | 0 | estimated_from_medians |
| ESTIMATED presentation (failed pkg 5) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.1302 | $0.1302 | 0 | estimated_from_medians |
| ESTIMATED presentation (failed pkg 9) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.1302 | $0.1302 | 0 | estimated_from_medians |
| ESTIMATED presentation (failed pkg 13) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.1302 | $0.1302 | 0 | estimated_from_medians |
| ESTIMATED critic (failed pkg 4) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.1199 | $0.1199 | 0 | estimated_from_medians |
| ESTIMATED direction (failed pkg 3) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.0739 | $0.0739 | 0 | estimated_from_medians |
| ESTIMATED direction (failed pkg 4) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.0739 | $0.0739 | 0 | estimated_from_medians |
| ESTIMATED direction (failed pkg 5) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.0739 | $0.0739 | 0 | estimated_from_medians |
| ESTIMATED direction (failed pkg 9) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.0739 | $0.0739 | 0 | estimated_from_medians |
| ESTIMATED direction (failed pkg 12) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.0739 | $0.0739 | 0 | estimated_from_medians |
| ESTIMATED direction (failed pkg 13) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.0739 | $0.0739 | 0 | estimated_from_medians |
| TTS | 10 | gpt-4o-mini-tts | tts | 10 | 0 | 0 | 0 | 0 | $0.0576 | $0.0058 | 44864 | estimated_list_price |
| Creative Evaluation Retry | 1 | claude-sonnet-4-6 | claude | 1 | 0 | 0 | 4732 | 1546 | $0.0374 | $0.0374 | 31198 | exact_telemetry |
| ESTIMATED critic (failed pkg 3) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.0300 | $0.0300 | 0 | estimated_from_medians |
| ESTIMATED critic (failed pkg 5) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.0300 | $0.0300 | 0 | estimated_from_medians |
| ESTIMATED critic (failed pkg 9) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.0300 | $0.0300 | 0 | estimated_from_medians |
| ESTIMATED critic (failed pkg 13) | 1 | n/a | estimated_from_medians | 0 | 1 | 0 | 0 | 0 | $0.0300 | $0.0300 | 0 | estimated_from_medians |
| Whisper | 10 | whisper-1 | whisper | 10 | 0 | 0 | 0 | 0 | $0.0249 | $0.0025 | 26975 | estimated_list_price |
| Presentation Generation | 1 | gpt-4o-mini-2024-07-18 | claude | 1 | 0 | 0 | 29196 | 7726 | $0.0090 | $0.0090 | 109206 | exact_telemetry |
| Weekly Strategy | 1 | gpt-4o-mini-2024-07-18 | claude | 1 | 0 | 0 | 5889 | 4005 | $0.0033 | $0.0033 | 70357 | exact_telemetry |
| Strategy Items | 1 | deterministic | deterministic | 1 | 0 | 0 | 0 | 0 | $0.0000 | $0.0000 | 492 | unmetered |
| Creative Engine | 8 | unknown | claude | 8 | 0 | 0 | 0 | 0 | $0.0000 | $0.0000 | 0 | unmetered |
| Candidate Judge | 8 | deterministic | deterministic | 8 | 0 | 0 | 0 | 0 | $0.0000 | $0.0000 | 0 | unmetered |
| Narrative Beats | 8 | deterministic | deterministic | 8 | 0 | 0 | 0 | 0 | $0.0000 | $0.0000 | 35 | unmetered |
| Hook Enforcement | 8 | deterministic | deterministic | 8 | 0 | 0 | 0 | 0 | $0.0000 | $0.0000 | 2 | unmetered |
| Concept Fidelity | 8 | deterministic | deterministic | 8 | 0 | 0 | 0 | 0 | $0.0000 | $0.0000 | 56 | unmetered |
| Story Integrity | 8 | deterministic | deterministic | 8 | 0 | 0 | 0 | 0 | $0.0000 | $0.0000 | 31 | unmetered |
| Product Demonstration Integrity | 8 | deterministic | deterministic | 8 | 0 | 0 | 0 | 0 | $0.0000 | $0.0000 | 17 | unmetered |
| Platform Outputs | 8 | deterministic | deterministic | 8 | 0 | 0 | 0 | 0 | $0.0000 | $0.0000 | 0 | unmetered |
| Persist Package | 8 | deterministic | deterministic | 8 | 0 | 0 | 0 | 0 | $0.0000 | $0.0000 | 28981 | unmetered |
| Video rendering | 8 | unknown | video | 8 | 0 | 0 | 0 | 0 | $0.0000 | $0.0000 | 1488288 | unmetered |

## Cost per package

### Package 0 — completed

**The Window Is Open. No One's Behind It.**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0699 | exact |
| Concept ideation (+ engine/judge $0) | $0.2032 | exact |
| Creative evaluation (critic) | $0.0000 | exact |
| Presentation generation | $0.1263 | exact |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.1680 | ESTIMATED list price |
| Voiceover (TTS) | $0.0052 | ESTIMATED list price |
| Whisper | $0.0026 | ESTIMATED list price |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.5755 | exact_telemetry+unmetered+estimated_list_price |

### Package 1 — completed

**The consultant who planned every channel — and forgot the landing zone**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0740 | exact |
| Concept ideation (+ engine/judge $0) | $0.1610 | exact |
| Creative evaluation (critic) | $0.0763 | exact |
| Presentation generation | $0.1333 | exact |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.1680 | ESTIMATED list price |
| Voiceover (TTS) | $0.0069 | ESTIMATED list price |
| Whisper | $0.0029 | ESTIMATED list price |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.6226 | exact_telemetry+unmetered+estimated_list_price |

### Package 2 — completed

**She left a five-star review. Just not for you.**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0726 | exact |
| Concept ideation (+ engine/judge $0) | $0.1498 | exact |
| Creative evaluation (critic) | $0.0282 | exact |
| Presentation generation | $0.3104 | exact |
| Story Integrity Repair | $0.1329 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.1680 | ESTIMATED list price |
| Voiceover (TTS) | $0.0050 | ESTIMATED list price |
| Whisper | $0.0023 | ESTIMATED list price |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.8695 | exact_telemetry+unmetered+estimated_list_price |

### Package 3 — failed

**Package 3**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0739 | ESTIMATED median |
| Concept ideation (+ engine/judge $0) | $0.1942 | ESTIMATED median |
| Creative evaluation (critic) | $0.0300 | ESTIMATED median |
| Presentation generation | $0.1302 | ESTIMATED median |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.0000 | n/a |
| Voiceover (TTS) | $0.0000 | n/a |
| Whisper | $0.0000 | n/a |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.4286 | exact_telemetry+estimated_from_medians |

- Failed at: **story_integrity** (1 attempt(s))
- Stages assumed completed before fail: direction, ideation, critic, presentation, validation
- Money spent before failure: $0.4284 [ESTIMATED]
- Recoverable: **yes (late validation — content was generated then discarded)**
- Waste share of package total: 100%
- Error: `{"error":"generation_failed","message":"Primary actor from selected concept missing from opening scene (expected one of: outcome, strips, identical, objects)","validation_errors":[{"path":"story_integrity.primary_actor_changed.scene_0","message":"Primary actor from selected conce…`

### Package 4 — failed

**Package 4**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0739 | ESTIMATED median |
| Concept ideation (+ engine/judge $0) | $0.7770 | ESTIMATED median |
| Creative evaluation (critic) | $0.1199 | ESTIMATED median |
| Presentation generation | $0.0000 | ESTIMATED median |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.0000 | n/a |
| Voiceover (TTS) | $0.0000 | n/a |
| Whisper | $0.0000 | n/a |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.9710 | exact_telemetry+estimated_from_medians |

- Failed at: **all_concepts_vetoed** (4 attempt(s))
- Stages assumed completed before fail: direction, ideation, critic
- Money spent before failure: $0.9708 [ESTIMATED]
- Recoverable: **no / early fail**
- Waste share of package total: 100%
- Error: `{"error":"generation_failed","message":"all_concepts_vetoed_after_re_ideation","validation_errors":[{"path":"creative_engine_v3","message":"all_concepts_vetoed_after_re_ideation"}],"attempts":4}`

### Package 5 — failed

**Package 5**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0739 | ESTIMATED median |
| Concept ideation (+ engine/judge $0) | $0.1942 | ESTIMATED median |
| Creative evaluation (critic) | $0.0300 | ESTIMATED median |
| Presentation generation | $0.1302 | ESTIMATED median |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.0000 | n/a |
| Voiceover (TTS) | $0.0000 | n/a |
| Whisper | $0.0000 | n/a |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.4286 | exact_telemetry+estimated_from_medians |

- Failed at: **concept_fidelity** (1 attempt(s))
- Stages assumed completed before fail: direction, ideation, critic, presentation, validation
- Money spent before failure: $0.4284 [ESTIMATED]
- Recoverable: **yes (late validation — content was generated then discarded)**
- Waste share of package total: 100%
- Error: `{"error":"generation_failed","message":"storyboard_collapsed_to_generic_office","validation_errors":[{"path":"concept_fidelity","message":"storyboard_collapsed_to_generic_office"}],"attempts":1}`

### Package 6 — completed

**Everything Rehearsed. Except the Questions.**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0740 | exact |
| Concept ideation (+ engine/judge $0) | $0.3255 | exact |
| Creative evaluation (critic) | $0.0328 | exact |
| Presentation generation | $0.0090 | exact |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.2100 | ESTIMATED list price |
| Voiceover (TTS) | $0.0063 | ESTIMATED list price |
| Whisper | $0.0029 | ESTIMATED list price |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.6607 | exact_telemetry+unmetered+estimated_list_price |

### Package 7 — completed

**One tab closed. No record. No email. Just gone.**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0701 | exact |
| Concept ideation (+ engine/judge $0) | $0.1852 | exact |
| Creative evaluation (critic) | $0.0000 | exact |
| Presentation generation | $0.1300 | exact |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.2100 | ESTIMATED list price |
| Voiceover (TTS) | $0.0125 | ESTIMATED list price |
| Whisper | $0.0051 | ESTIMATED list price |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.6132 | exact_telemetry+unmetered+estimated_list_price |

### Package 8 — completed

**You Built the Whole Pipeline. You Just Forgot to Put Anything at the End of It.**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0739 | exact |
| Concept ideation (+ engine/judge $0) | $0.1825 | exact |
| Creative evaluation (critic) | $0.0316 | exact |
| Presentation generation | $0.1355 | exact |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.1680 | ESTIMATED list price |
| Voiceover (TTS) | $0.0067 | ESTIMATED list price |
| Whisper | $0.0028 | ESTIMATED list price |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.6013 | exact_telemetry+unmetered+estimated_list_price |

### Package 9 — failed

**Package 9**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0739 | ESTIMATED median |
| Concept ideation (+ engine/judge $0) | $0.1942 | ESTIMATED median |
| Creative evaluation (critic) | $0.0300 | ESTIMATED median |
| Presentation generation | $0.1302 | ESTIMATED median |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.0000 | n/a |
| Voiceover (TTS) | $0.0000 | n/a |
| Whisper | $0.0000 | n/a |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.4286 | exact_telemetry+estimated_from_medians |

- Failed at: **story_integrity** (1 attempt(s))
- Stages assumed completed before fail: direction, ideation, critic, presentation, validation
- Money spent before failure: $0.4284 [ESTIMATED]
- Recoverable: **yes (late validation — content was generated then discarded)**
- Waste share of package total: 100%
- Error: `{"error":"generation_failed","message":"Middle beats abandon the primary actor / product world for unrelated subjects (actor tokens: empty, measurement, system, attorney)","validation_errors":[{"path":"story_integrity.primary_actor_changed","message":"Middle beats abandon the pri…`

### Package 10 — completed

**Every other chatbot integration looks like this.**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0764 | exact |
| Concept ideation (+ engine/judge $0) | $0.2183 | exact |
| Creative evaluation (critic) | $0.0308 | exact |
| Presentation generation | $0.1286 | exact |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.1680 | ESTIMATED list price |
| Voiceover (TTS) | $0.0094 | ESTIMATED list price |
| Whisper | $0.0038 | ESTIMATED list price |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.6356 | exact_telemetry+unmetered+estimated_list_price |

### Package 11 — completed

**The Blank Field**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0825 | exact |
| Concept ideation (+ engine/judge $0) | $0.2132 | exact |
| Creative evaluation (critic) | $0.0291 | exact |
| Presentation generation | $0.1304 | exact |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.1680 | ESTIMATED list price |
| Voiceover (TTS) | $0.0057 | ESTIMATED list price |
| Whisper | $0.0024 | ESTIMATED list price |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.6315 | exact_telemetry+unmetered+estimated_list_price |

### Package 12 — failed

**Package 12**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0739 | ESTIMATED median |
| Concept ideation (+ engine/judge $0) | $0.5827 | ESTIMATED median |
| Creative evaluation (critic) | $0.0000 | ESTIMATED median |
| Presentation generation | $0.0000 | ESTIMATED median |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.0000 | n/a |
| Voiceover (TTS) | $0.0000 | n/a |
| Whisper | $0.0000 | n/a |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.6569 | exact_telemetry+estimated_from_medians |

- Failed at: **ideation_failed** (3 attempt(s))
- Stages assumed completed before fail: direction, ideation
- Money spent before failure: $0.6567 [ESTIMATED]
- Recoverable: **no / early fail**
- Waste share of package total: 100%
- Error: `{"error":"generation_failed","message":"ideation_failed: missing concepts for selected direction_id d7","validation_errors":[{"path":"creative_engine_v3","message":"ideation_failed: missing concepts for selected direction_id d7"}],"attempts":3}`

### Package 13 — failed

**Package 13**

| Stage | USD | Notes |
| --- | --- | --- |
| Strategy (allocated 1/14) | $0.0002 | exact_telemetry |
| Direction generation + evaluation | $0.0739 | ESTIMATED median |
| Concept ideation (+ engine/judge $0) | $0.1942 | ESTIMATED median |
| Creative evaluation (critic) | $0.0300 | ESTIMATED median |
| Presentation generation | $0.1302 | ESTIMATED median |
| Story Integrity Repair | $0.0000 | exact when present |
| Validation (deterministic) | $0.0000 | unmetered $0 |
| Image generation | $0.0000 | n/a |
| Voiceover (TTS) | $0.0000 | n/a |
| Whisper | $0.0000 | n/a |
| Rendering | $0.0000 | unmetered $0 |
| **TOTAL** | $0.4286 | exact_telemetry+estimated_from_medians |

- Failed at: **concept_fidelity** (1 attempt(s))
- Stages assumed completed before fail: direction, ideation, critic, presentation, validation
- Money spent before failure: $0.4284 [ESTIMATED]
- Recoverable: **yes (late validation — content was generated then discarded)**
- Waste share of package total: 100%
- Error: `{"error":"generation_failed","message":"opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame","validation_errors":[{"path":"concept_fidelity","message":"opening_situation_missing_from_scene1:main_subject_missing_from_scene1_opening_frame"},{"path":…`

## Failed packages — waste summary

| Package | Fail stage | Attempts | Est. spend before fail | Recoverable | Completed stages (assumed) |
| --- | --- | --- | --- | --- | --- |
| 3 | story_integrity | 1 | $0.4284 | yes | direction → ideation → critic → presentation → validation |
| 4 | all_concepts_vetoed | 4 | $0.9708 | no | direction → ideation → critic |
| 5 | concept_fidelity | 1 | $0.4284 | yes | direction → ideation → critic → presentation → validation |
| 9 | story_integrity | 1 | $0.4284 | yes | direction → ideation → critic → presentation → validation |
| 12 | ideation_failed | 3 | $0.6567 | no | direction → ideation |
| 13 | concept_fidelity | 1 | $0.4284 | yes | direction → ideation → critic → presentation → validation |

### Waste totals

| Category | USD | Basis |
| --- | --- | --- |
| Total wasted AI text (failed pkgs) | $3.3408 | estimated_from_medians |
| Total wasted image cost (failed pkgs) | $0.0000 | Failed pkgs never reached images |
| Total wasted voice cost (failed pkgs) | $0.0000 | Failed pkgs never reached TTS |
| Total wasted translation cost | $0.0000 | No language variants in this run |
| Total wasted validation cost | $0.0000 | Deterministic validators — unmetered |
| Duplicate TTS/Whisper on completed pkgs | $0.0156 | estimated_list_price |
| **Total marked waste** | $3.3564 | mixed |

Completed-package stage medians used for failed estimates: direction $0.0739, ideation $0.1942, critic $0.0300, presentation $0.1302.

## Retry analysis

| Finding | Detail |
| --- | --- |
| Presentation Generation | Package 2 has `retry_count=1`, combined exact cost $0.3104 (includes retry). Useful: yes — package completed after repair path. |
| Creative Ideation re-run | Package 6 has 2 ideation calls (exact $0.1545 + $0.1710). Useful: yes — completed. |
| Creative Evaluation Retry | Package 1 exact $0.0374 after evaluation. Useful: yes — completed. |
| Failed pkg attempts | Pkg 4: 4 attempts (veto); Pkg 12: 3 attempts (ideation). Retries **not useful** — package still failed. Prefer repair/fallback over blind re-ideation. |
| Duplicate TTS+Whisper | Packages 7 and 10 each ran TTS/Whisper twice. Pure waste — replace with idempotent single call. |

## Model cost analysis

| Model | Calls | Tokens In | Tokens Out | Cost | % |
| --- | --- | --- | --- | --- | --- |
| claude-sonnet-4-6 | 40 | 337151 | 178458 | $3.6883 | 43.1% |
| n/a | 21 | 0 | 0 | $3.3408 | 39.1% |
| gpt-image-1 | 8 | 0 | 0 | $1.4280 | 16.7% |
| gpt-4o-mini-tts | 10 | 0 | 0 | $0.0576 | 0.7% |
| whisper-1 | 10 | 0 | 0 | $0.0249 | 0.3% |
| gpt-4o-mini-2024-07-18 | 2 | 35085 | 11731 | $0.0123 | 0.1% |
| deterministic | 65 | 0 | 0 | $0.0000 | 0.0% |
| unknown | 16 | 0 | 0 | $0.0000 | 0.0% |

## Provider breakdown

| Provider | Cost | % | Notes |
| --- | --- | --- | --- |
| claude | $3.7006 | 43.3% | Includes Claude Sonnet 4.6 + some gpt-4o-mini steps mislabeled provider=claude |
| estimated_from_medians | $3.3408 | 39.1% | Synthetic bucket for failed-package estimates |
| image | $1.4280 | 16.7% |  |
| tts | $0.0576 | 0.7% |  |
| whisper | $0.0249 | 0.3% |  |
| deterministic | $0.0000 | 0.0% |  |
| video | $0.0000 | 0.0% |  |

Real money flows to: **Anthropic (claude-sonnet-4-6)**, **OpenAI (gpt-4o-mini strategy/presentation fallback, gpt-image-1, gpt-4o-mini-tts, whisper-1)**. Image/TTS/Whisper amounts are list-price estimates.

## Stage breakdown

| Stage | Absolute cost | % of total |
| --- | --- | --- |
| ideation | $3.7755 | 44.1% |
| presentation | $1.6245 | 19.0% |
| images | $1.4280 | 16.7% |
| direction | $1.0368 | 12.1% |
| critic | $0.4684 | 5.5% |
| repair | $0.1329 | 1.6% |
| voice | $0.0576 | 0.7% |
| whisper | $0.0249 | 0.3% |
| strategy | $0.0033 | 0.0% |

## Pareto analysis

Stages accounting for ~80% of spend: **ideation, presentation, images, direction** (92.0% of $8.5520).

Biggest cost centers:
1. **Creative Ideation** — largest exact AI spend (~$1.64 on completed alone; long output tokens).
2. **Failed-package AI estimates** — ~31% of total run cost with zero deliverable packages.
3. **Image generation** — ~$1.43 ESTIMATED across 8 completed packages.
4. **Presentation Generation** — large input context; one expensive retry on pkg 2.

## Optimization opportunities (per workflow)

| Workflow | Quality impact if kept | If removed / reduced | Expected savings | Risk |
| --- | --- | --- | --- | --- |
| Weekly Strategy | High | Keep | ~$0 | Low |
| Creative Direction Gen+Eval | High | Keep; maybe merge gen+eval | Low tens of cents | Medium |
| Creative Ideation | High | Shorten outputs / fewer concepts | $0.30–$0.80 ESTIMATED | Medium |
| Creative Evaluation (critic) | Unknown | A/B skip when deterministic gates exist | up to $0.4684 | High |
| Presentation Generation | High | Trim context; prefer repair over full retry | $0.15–$0.40 ESTIMATED | Medium |
| Story Integrity Repair | High (saved pkg 2) | Keep | n/a — prevents waste | Low |
| Hard validators (integrity/fidelity) | Medium gates / High waste | Soft-fail → repair | $1.7134 ESTIMATED recoverable | Medium |
| Image generation | High | Fewer scenes / cheaper size / reuse | Depends on product | Medium |
| TTS + Whisper | High / Medium | Deduplicate calls | $0.0156 | Low |
| Render | High | Keep; meter compute | Unknown (unmetered) | Low |

## Duplicate / redundant work

- **Duplicate TTS+Whisper** on packages **7** and **10** (2× each) — confirmed in worker telemetry.
- **Re-ideation** on package **6** (2× Creative Ideation) — succeeded; still double-paid.
- **Presentation retry** on package **2** (`retry_count=1`) plus **Story Integrity Repair** — paid twice to land one package.
- **Failed multi-attempts** packages **4** (×4) and **12** (×3) — repeated ideation without persistence of intermediates.
- **Repeated large presentation context** (~25k–53k prompt tokens) every package — structural token load.
- **No translation duplication** in this run (no language variants).
- Deterministic validators run on every completed package at $0 API — not cost waste, but discard paid upstream work when hard-failing.

## Telemetry gaps

- Worker Image/TTS/Whisper/Render steps have estimated_cost=null — list-price estimates only.
- Failed packages persist no generation_telemetry — stage costs estimated from completed package medians × attempts.
- Presentation retry_count>0 stores combined cost; per-attempt split is not available.
- Provider field sometimes says 'claude' for gpt-4o-mini steps.
- Render/compute (ffmpeg/worker VM) is unmetered.
- No language-variant translation costs in this run (language IS NULL content items only).

### Recommended logging for future runs

1. Persist `generation_telemetry.steps` snapshot on **every failed attempt**, not only successful packages.
2. Worker steps: always set `estimated_cost`, `provider_request_id`, and raw usage (images count/size, TTS chars, whisper seconds).
3. Split retry attempts into separate step rows (attempt 1, attempt 2) instead of aggregating into one cost.
4. Record `fail_stage`, `money_spent_usd`, and `recoverable` on `production_run_items`.
5. Meter render/compute seconds and worker machine cost.
6. Normalize `provider` field to the true billable vendor (Anthropic vs OpenAI).

## Final optimization roadmap

| Priority | Recommendation | Est. saving | Difficulty | Risk |
| --- | --- | --- | --- | --- |
| 1 | Persist full generation_telemetry on failed package attempts (including intermediate outputs) | telemetry_only | Medium | Low |
| 2 | Convert hard story_integrity / concept_fidelity fails to repair-or-advisory instead of discarding paid presentation | 1.7134 | Medium | Medium |
| 3 | Cap ideation/veto retries (pkg 4×4, pkg 12×3 wasted ~median ideation×extra attempts) | 0.9712 | Low | Medium |
| 4 | Write estimated_cost for Image/TTS/Whisper/Render in worker telemetry (and provider request IDs) | precision_gain | Low | Low |
| 5 | Eliminate duplicate TTS+Whisper calls (observed pkgs 7 and 10) | 0.0156 | Low | Low |
| 6 | Shrink Creative Ideation output tokens (largest exact AI cost center at ~$1.64 on 8 completed pkgs) | 0.30-0.80_estimated | Medium | Medium |
| 7 | Reduce Presentation Generation prompt size (avg ~25k–53k input tokens) / avoid full retry when possible | 0.15-0.40_estimated | Medium | Medium |
| 8 | Evaluate Creative Evaluation (critic) ROI — $0.23 exact on completed; often skipped | 0.4684 | Medium | High |

## Artifacts

- `docs/audits/cost-trace-c8dd3caf.md` (this report)
- `docs/audits/cost-trace-c8dd3caf/workflow-costs.csv`
- `docs/audits/cost-trace-c8dd3caf/package-costs.csv`
- `docs/audits/cost-trace-c8dd3caf/model-costs.csv`
- `docs/audits/cost-trace-c8dd3caf/provider-costs.csv`
- `docs/audits/cost-trace-c8dd3caf/retry-analysis.csv`
- `docs/audits/cost-trace-c8dd3caf/waste-analysis.csv`
- `docs/audits/cost-trace-c8dd3caf/optimization-roadmap.csv`
- `docs/audits/cost-trace-c8dd3caf/summary.json`

