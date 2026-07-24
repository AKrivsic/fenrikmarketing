# Content Pipeline (production)

**Status:** Official production architecture (single pipeline).  
**Date:** 2026-07-24

## Generate

```
Product Brain → Knowledge Base → Recent Content Memory
  → Content Strategy (package-size, Claude)
  → Video Concept (Claude)
  → Opening Impact (OpenAI)
  → Visual Identity (deterministic)
  → Content Package (Claude)
  → Platform Outputs → Persist
  → Video worker (TTS / images / subtitles / render)
```

## Regenerate

Same creative stages as Generate. Extra inputs:

- existing package summary
- prior Video Concept / Opening Impact / Visual Identity (when stored)
- user regeneration instruction (`feedback`)

```
Existing package + Strategy Item + Product Brain + Knowledge + Memory
  + regeneration instruction
  → Video Concept → Opening Impact → Visual Identity → Content Package
  → Platform Outputs → Persist (in-place) + version snapshot + video job
```

Implementation:

- Generate orchestration: `lib/ai/workflows/generateContentPackage.ts`
- Regenerate orchestration: `lib/ai/workflows/regenerateContentPackage.ts`
- Shared stages: `lib/content-pipeline/*`
- Strategy: `lib/ai/workflows/planContentStrategy.ts` (telemetry: **Content Strategy**)

There is no feature flag and no dual-pipeline mode.
