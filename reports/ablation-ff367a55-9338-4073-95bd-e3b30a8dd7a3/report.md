# Prompt-block ablation experiment

Package: `ff367a55-9338-4073-95bd-e3b30a8dd7a3`
Model: `claude-sonnet-4-6` · temperature: 0.7 · max_tokens: 8192

## Method
- Same reconstructed system + user prompt
- Same Product Brain, Strategy Item, Creative Candidate (kept in all arms)
- Change ONLY the named block (removed entirely)
- Baseline regenerated in this run (not the historical DB package)

## Baseline snapshot

- Hook: Mascot suffers, fake typing online.
- VO: Your website had visitors while you were gone. Real people. Real questions. And your contact form just... sat there. Nobody filled it out. They left. Every night, every weekend, every vacation — your site is losing leads in total silence. Not because you're bad at business. Because static text doesn't answer questions. And unanswered questions walk straight to your competitor.
- Visual tags: co-working, parking lot, parking, mascot, laptop, office, desk, outdoor, photoreal, photorealistic, documentary, heat, traffic, glass door, analytics, chat, typing

## Results table

| Block | Influence | What changed |
|---|---|---|
| Creative Identity | CRITICAL | hook=identical; vo=major_changes; visual_major=true; prog_changed=true; img_sim=0.238 |
| Project Visual Profile | UNKNOWN | parse_or_generation_failed |
| Scene Meaning | CRITICAL | hook=identical; vo=major_changes; visual_major=false; prog_changed=true; img_sim=0.361 |
| Visual Narrative | CRITICAL | hook=identical; vo=major_changes; visual_major=false; prog_changed=true; img_sim=0.346 |
| Attention Mechanism | CRITICAL | hook=identical; vo=major_changes; visual_major=false; prog_changed=true; img_sim=0.327 |
| Creative Directives | CRITICAL | hook=identical; vo=major_changes; visual_major=false; prog_changed=true; img_sim=0.279 |
| Hook V2 | CRITICAL | hook=identical; vo=major_changes; visual_major=false; prog_changed=true; img_sim=0.32 |
| Product Reveal | CRITICAL | hook=identical; vo=major_changes; visual_major=false; prog_changed=true; img_sim=0.308 |
| Content Quality | CRITICAL | hook=identical; vo=major_changes; visual_major=false; prog_changed=true; img_sim=0.335 |

## Per-arm detail

### Remove Creative Identity
- Estimated influence: **CRITICAL**
- Hook: identical
- Voiceover: major_changes (sim=0.177)
- Story progression changed: true (sim=0.295)
- Visual world major=true; lost=[co-working, glass door, documentary]; gained=[]
- Image prompts similarity: 0.238
- Platform outputs similarity: 0.423
- Creativity shift: high

### Remove Project Visual Profile
Error: parse_or_generation_failed

### Remove Scene Meaning
- Estimated influence: **CRITICAL**
- Hook: identical
- Voiceover: major_changes (sim=0.265)
- Story progression changed: true (sim=0.289)
- Visual world major=false; lost=[office, traffic, glass door, outdoor]; gained=[]
- Image prompts similarity: 0.361
- Platform outputs similarity: 0.435
- Creativity shift: medium

### Remove Visual Narrative
- Estimated influence: **CRITICAL**
- Hook: identical
- Voiceover: major_changes (sim=0.253)
- Story progression changed: true (sim=0.259)
- Visual world major=false; lost=[office, outdoor]; gained=[plant]
- Image prompts similarity: 0.346
- Platform outputs similarity: 0.415
- Creativity shift: medium

### Remove Attention Mechanism
- Estimated influence: **CRITICAL**
- Hook: identical
- Voiceover: major_changes (sim=0.247)
- Story progression changed: true (sim=0.286)
- Visual world major=false; lost=[glass door, laptop, outdoor]; gained=[]
- Image prompts similarity: 0.327
- Platform outputs similarity: 0.409
- Creativity shift: medium

### Remove Creative Directives
- Estimated influence: **CRITICAL**
- Hook: identical
- Voiceover: major_changes (sim=0.213)
- Story progression changed: true (sim=0.305)
- Visual world major=false; lost=[office, heat, glass door, outdoor]; gained=[]
- Image prompts similarity: 0.279
- Platform outputs similarity: 0.401
- Creativity shift: medium

### Remove Hook V2
- Estimated influence: **CRITICAL**
- Hook: identical
- Voiceover: major_changes (sim=0.381)
- Story progression changed: true (sim=0.323)
- Visual world major=false; lost=[heat, glass door, outdoor, photoreal, photorealistic]; gained=[]
- Image prompts similarity: 0.32
- Platform outputs similarity: 0.389
- Creativity shift: medium

### Remove Product Reveal
- Estimated influence: **CRITICAL**
- Hook: identical
- Voiceover: major_changes (sim=0.187)
- Story progression changed: true (sim=0.299)
- Visual world major=false; lost=[heat, traffic, glass door, outdoor]; gained=[]
- Image prompts similarity: 0.308
- Platform outputs similarity: 0.375
- Creativity shift: medium

### Remove Content Quality
- Estimated influence: **CRITICAL**
- Hook: identical
- Voiceover: major_changes (sim=0.277)
- Story progression changed: true (sim=0.314)
- Visual world major=false; lost=[office, glass door, laptop, outdoor]; gained=[]
- Image prompts similarity: 0.335
- Platform outputs similarity: 0.415
- Creativity shift: medium
