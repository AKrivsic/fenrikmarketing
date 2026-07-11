# Fenrik Studio — Video production activation

Global rollout settings for typed scenes, CHECKLIST eligibility, Visual Profiles, and Semantic Motion. Apply the same values on **Vercel** (Next.js app) and the **DigitalOcean video worker** unless noted.

## Recommended production values (global activation)

```bash
SCENE_TYPES_ENABLED=true
CHECKLIST_GENERATION_MODE=enabled
CHECKLIST_ENABLED_PROJECT_IDS=*
```

- **Semantic Motion** is enabled by default for new worker jobs. Opt out per job with `semantic_motion: false` on `video_jobs.input`.
- **Visual Profiles** stay **Automatic** unless a project override exists in knowledge (`presentation.visual_profile`).

## CHECKLIST allowlist

| `CHECKLIST_ENABLED_PROJECT_IDS` | Effect |
|---------------------------------|--------|
| *(unset or empty)* | No project is CHECKLIST-allowlisted. |
| `uuid-1,uuid-2` | Only listed UUIDs are allowlisted. |
| `*` | Every valid project may be CHECKLIST-allowlisted (subject to kill switches and analyzer rules). |

Wildcard does **not** force CHECKLIST in every video. It only removes the UUID gate. Prompt, analyzer, frequency guardrails, and project history restraint still apply.

Invalid tokens in a UUID list are ignored. If `*` appears anywhere in the list, wildcard mode applies (other tokens are ignored).

## Kill switches (fast rollback)

| Variable / input | Effect |
|------------------|--------|
| `SCENE_TYPES_ENABLED=false` | All typed scenes compile/render as IMAGE infrastructure off. |
| `CHECKLIST_GENERATION_MODE=off` | CHECKLIST generation disabled (shadow/enabled modes off). |
| `CHECKLIST_ENABLED_PROJECT_IDS=` *(empty)* | No CHECKLIST project access. |
| `semantic_motion: false` on job input | Legacy beat-index motion for that job only. |

**Shortest rollback:** set `SCENE_TYPES_ENABLED=false` on app + worker, redeploy/restart worker.

## Worker-only notes

- The worker reads `SCENE_TYPES_ENABLED`, `CHECKLIST_*`, and scene-type rollout flags from its environment when composing rasters.
- Job input may carry `stored_semantic_motion` (copied from a prior `render_spec.metadata.semantic_motion` on retry/re-render) so motion stays stable across retries.

## Vercel-only notes

- Content generation, Presentation Analyzer, and prompt eligibility use the same env vars as the worker for CHECKLIST rollout decisions.
