# Experimental validation: prompt-block ablation

Package: `ff367a55-9338-4073-95bd-e3b30a8dd7a3`
Model: `claude-sonnet-4-6` · temperature: `0.7` · max_tokens: `8192`

## Method
- Same reconstructed system + user prompt
- Same Product Brain, Strategy Item, Creative Candidate in every arm
- Remove exactly one named block per arm
- Baseline = regenerated full prompt in this run (not historical DB package)
- First run had a marker bug (Identity prose match); results below are from corrected cuts
- Influence judged from visual world / structure / length evidence; VO wording noise at T=0.7 discounted when world unchanged

## Baseline (this run)
- Hook: Mascot suffers, fake typing online.
- VO words: 60; hook as VO start: false
- Opening: parking-lot mascot heat/traffic (Candidate-aligned)
- Also contains co-working / documentary Identity cues in later beats
- Image1: Photorealistic vertical 9:16 portrait photograph. A person in a bulky mascot costume — cartoonish, colorful, clearly overheated — stands in a sun-baked parking lot, one arm raised in a slow wave toward passing cars that 

## Results table

| Block | Influence | What changed |
|---|---|---|
| Creative Identity | CRITICAL | Lost co-working/documentary Identity staging; opening stayed parking-lot mascot but later beats no longer Identity-locked; ending shifted to product chat UI on monitor |
| Project Visual Profile | LOW | World still parking-lot + Identity documentary axes (Identity covers NATURAL look); no clear creative pivot vs baseline |
| Scene Meaning | LOW | Opening still parking-lot mascot + later co-working; VO wording varied (T=0.7) but visual world/story spine same family |
| Visual Narrative | MEDIUM | Core world unchanged (parking + co-working); ending motif shifted (mascot retired on hook) — partial meaning-carrier effect, not a world rewrite |
| Attention Mechanism | MEDIUM | Hook identical; VO shifted to confession/setup opener; visual world still parking-lot mascot + Identity lighting |
| Creative Directives | LOW | Beat labels still Shock-like (other blocks restate mode beats); visual world unchanged; wording variance only |
| Hook V2 | LOW | Hook stayed Candidate-locked; first-spoken alignment already weak in baseline; no world change |
| Product Reveal | MEDIUM | Opening drifted toward co-working-framed mascot (Identity-forward); ending stayed quiet recognition vs baseline walk-out — solution-beat strategy soft effect |
| Content Quality | HIGH | VO ballooned to ~99 words; script beats extended to ~32s — length/pacing constraint clear; visual world still parking-lot mascot family |

## Which blocks change creative decisions?
- Creative Identity
- Visual Narrative
- Attention Mechanism
- Product Reveal

## Which blocks mainly affect formatting or wording?
- Project Visual Profile
- Scene Meaning
- Creative Directives
- Hook V2
- Content Quality

## Which blocks appear nearly redundant (remove → nearly same creative output)?
- Project Visual Profile
- Scene Meaning
- Creative Directives
- Hook V2

## Per-arm notes
### Creative Identity → CRITICAL
Lost co-working/documentary Identity staging; opening stayed parking-lot mascot but later beats no longer Identity-locked; ending shifted to product chat UI on monitor
- Hook: identical
- VO words: 60 → 68
- Opening parking: true → true; co-working open: true → false
- Image1: Photorealistic vertical 9:16 portrait. Exterior of a small business office on a bright, sun-drenched day. A person wearing a full foam mascot costume — oversized cartoon head, colorful suit — stands in the parking lot wa

### Project Visual Profile → LOW
World still parking-lot + Identity documentary axes (Identity covers NATURAL look); no clear creative pivot vs baseline
- Hook: identical
- VO words: 60 → 68
- Opening parking: true → true; co-working open: true → false
- Image1: Photorealistic vertical 9:16 portrait photograph. Wide environmental framing in a sun-drenched suburban parking lot, low-contrast flat documentary lighting, warm neutral color feel. A person in a large mascot costume sta

### Scene Meaning → LOW
Opening still parking-lot mascot + later co-working; VO wording varied (T=0.7) but visual world/story spine same family
- Hook: identical
- VO words: 60 → 67
- Opening parking: true → true; co-working open: true → false
- Image1: Photorealistic vertical 9:16 portrait photograph. A person in a full oversized mascot costume — bulky foam head, colorful suit — stands alone in a sun-drenched parking lot on a hot day. The costume is visibly wilting, th

### Visual Narrative → MEDIUM
Core world unchanged (parking + co-working); ending motif shifted (mascot retired on hook) — partial meaning-carrier effect, not a world rewrite
- Hook: identical
- VO words: 60 → 69
- Opening parking: true → true; co-working open: true → false
- Image1: Photorealistic vertical portrait 9:16. A person in a full, slightly deflated mascot costume — a large cartoonish animal head and padded suit — stands in a sun-baked parking lot in bright midday light. The costume fabric 

### Attention Mechanism → MEDIUM
Hook identical; VO shifted to confession/setup opener; visual world still parking-lot mascot + Identity lighting
- Hook: identical
- VO words: 60 → 66
- Opening parking: true → true; co-working open: true → false
- Image1: Vertical 9:16 photorealistic photograph in warm neutral tones with flat documentary lighting. Wide environmental framing of a sun-baked parking lot in full daylight. In the foreground, a person wearing a large foam masco

### Creative Directives → LOW
Beat labels still Shock-like (other blocks restate mode beats); visual world unchanged; wording variance only
- Hook: identical
- VO words: 60 → 64
- Opening parking: true → true; co-working open: true → false
- Image1: Photorealistic portrait 9:16 vertical frame. Bright midday parking lot, flat documentary lighting, warm neutral color feel. A person in a full foam mascot costume — oversized cartoon head, colorful suit — stands in the c

### Hook V2 → LOW
Hook stayed Candidate-locked; first-spoken alignment already weak in baseline; no world change
- Hook: identical
- VO words: 60 → 61
- Opening parking: true → true; co-working open: true → true
- Image1: Vertical 9:16 portrait frame. A bright co-working space exterior — a sunlit parking lot adjacent to a glass-fronted office. A single person in a large, slightly deflated mascot costume (animal character, no readable text

### Product Reveal → MEDIUM
Opening drifted toward co-working-framed mascot (Identity-forward); ending stayed quiet recognition vs baseline walk-out — solution-beat strategy soft effect
- Hook: identical
- VO words: 60 → 68
- Opening parking: true → true; co-working open: true → true
- Image1: Photorealistic portrait 9:16 vertical. A bright co-working space in daylight with warm neutral tones and low-contrast flat documentary lighting. Foreground: a person in a full mascot costume — oversized cartoon character

### Content Quality → HIGH
VO ballooned to ~99 words; script beats extended to ~32s — length/pacing constraint clear; visual world still parking-lot mascot family
- Hook: identical
- VO words: 60 → 99
- Opening parking: true → true; co-working open: true → false
- Image1: Photorealistic vertical 9:16 portrait. A person in a large colorful mascot costume stands in a sun-baked parking lot in bright midday light, one arm raised in an exaggerated wave toward passing cars that do not slow down
