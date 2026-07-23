# Decision Ownership (Phase 2A + Phase 2B update)

**Scope:** establish exactly one authoritative owner per creative decision.  
Phase 2B operationalizes owners via `lib/architecture/typedDecisionPacks/` and **resolves C1 Story Structure**.

Source of truth in code: `lib/architecture/decisionOwnership.ts`  
Machine-readable table: `docs/architecture/decision-ownership.csv`  
Typed packs: `docs/architecture/typed-decision-packs.md`

## Authority rule

1. Structured field + deterministic enforce/validate beats prompt prose.
2. Contenders may still exist as readers/guidance but are **not** owners.
3. Domain facts come from Product Brain / Strategy / Winner Candidate / Creative DNA / Asset Intelligence — never hardcoded industry defaults.

## Ownership map

| Decision | Owner | Readers | Illegal writers | Conflict | Migration target |
| --- | --- | --- | --- | --- | --- |
| Product Grounding | Product Brain + project constraints | Presentation PROJECT BRAIN / HARD CONSTRAINTS, TypedPack.ProductGrounding | Presentation inventing facts; industry defaults | **None** | `TypedPack.ProductGrounding` |
| Hook | Winner Candidate `hookLine` + `enforceCandidateHook` | Presentation, Repair/fidelity, Narrative Beats, anti-rep | Attention inventing hook; Opening Resolver replacing; Repair soft-rewrite | **Safe** — archetype fallback only | `TypedPack.Hook` |
| Opening | Winner Candidate `openingSituation` (+ DNA `world`) | Presentation, fidelity/story integrity, Narrative Beats, Identity neutralize | Attention originality as prompt authority; Identity relocating | **Safe** | `TypedPack.Opening` |
| Story Structure | **MODE BEATS** | Presentation, storyboard, video job, Narrative Beats labels, TypedPack.StoryStructure | Preferred Arc as second owner; Narrative Beats as second owner; Repair new beat grammar | **None (C1 resolved Phase 2B)** | `TypedPack.StoryStructure` |
| Emotional Arc | Winner Candidate `emotionalReaction` | Candidate block, Narrative Beats, fingerprints | Attention replacing; Repair flattening | **Shared** | `TypedPack.EmotionalArc` |
| Voice Emotion | Attention `delivery_arc` | ATTENTION DELIVERY, TTS, video-worker | Voice Persona owning delivery phases | **Shared** | `TypedPack.VoiceEmotion` |
| Voice Persona | Creative Directive VoicePersona (copy) | Presentation CREATIVE DIRECTIVE | Conflating with TTS voice id | **Shared** | `TypedPack.VoicePersona` |
| Visual Identity | DNA world + immutable rules; Identity = treatment | DNA/Identity prompts, story integrity, video stamp | Identity relocating world | **Shared** | `TypedPack.VisualIdentity` |
| Character Consistency | DNA `mainCharacter` | DNA prompt, PRIMARY_ACTOR, integrity | Identity cast swap | **None** | `TypedPack.CharacterConsistency` |
| Asset Policy | PACKAGE ASSET COVERAGE; Funnel fallback | Presentation, guardrails, PPD | Funnel echo when Coverage present | **Safe** | `TypedPack.AssetPolicy` |
| Camera Style | Creative Identity `camera` | Identity prompt / image suffix | DNA owning camera | **Shared** | `TypedPack.CameraStyle` |
| Scene Order | `visual_scenes` guided by MODE BEATS | prepareVisualScenes, storyboard, render | Repair reordering away from winner | **Shared** — pack deferred to Presentation V2 | `TypedPack.SceneOrder` |
| Scene Diversity | Progression validators | Post-LLM checks, VISUAL PROGRESSION prose | Identity forcing diversity via treatment | **Shared** — pack deferred | `TypedPack.SceneDiversity` |
| CTA | Package `cta` + `CTA_TYPES_BY_GOAL` + guardrails | Prompt, platforms, typed CTA scenes | Opening sales CTA; Repair disallowed type | **Shared** | `TypedPack.CTA` |
| Safety | Guardrails + Product Brain constraints | CREATIVE SAFETY, HARD CONSTRAINTS, repair | Attention inventing facts | **Shared (C2)** | `TypedPack.Safety` |
| Platform Adaptation | `platform_outputs` + PLATFORM styles + guardrails | PLATFORM STYLES, persist/localize | VO pasted into captions | **None** | `TypedPack.PlatformAdaptation` |
| JSON Schema | `buildContentPackageSchema` | validateJson, repair, workers | Prompt inventing required fields | **Safe** | `TypedPack.JsonSchema` |

## Conflicts

### Dangerous

**None remaining.** C1 Story Structure was resolved in Phase 2B:

- Authoritative path: `StoryStructurePack` ← MODE BEATS only
- Preferred Arc: suppressed from Presentation; optional non-authoritative pacing note only
- Narrative Beats: Candidate-derived comprehension labels mapped onto MODE BEATS — no competing “Required arc” owner claim

### Shared (keep)

- Emotional / TTS / persona orthogonality  
- DNA world vs Identity treatment  
- Scene order/diversity validators vs prompt guidance  
- CTA layers  
- Attention First vs safety on facts (C2)

### Safe

- Hook archetype fallback  
- Funnel when Coverage present  
- Prompt JSON documenting schema  
- Opening Priority Resolver as meta-reader

## Ready for Presentation V2?

**Yes — Typed Decision Packs + C1 resolution are in place.** Presentation V2 should consume packs as the sole decision input boundary. Do not start Presentation V2 in the Phase 2B task itself.
