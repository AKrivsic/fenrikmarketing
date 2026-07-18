# Sprint 4B — Platform-Native Publishing Quality

Improve only the final writing layer. No strategy / Product Brain redesign.

---

## 1. Problems found

| Platform | Problem | Evidence |
| --- | --- | --- |
| **YouTube Shorts** | Captions read like SEO articles | Run `4633f34f`: “This video breaks down exactly why…” + long explainer |
| **TikTok** | Too much storytelling / soft punch | Captions retold VO beats instead of one curiosity punch |
| **Instagram** | Dense paragraphs, weak scan | Long blocks without mobile-friendly breaks |
| **LinkedIn** | Style mostly OK | Risk of unnecessary expansion — kept style, added “don’t pad” rule |
| **Facebook** | **Not generated** | Run config `platforms` omitted `facebook` (`tiktok, instagram, youtube, linkedin, x`). Not a prompt bug — selection gap |
| **X** | Concise OK; hook diversity weak | Variants could share the same opening claim |
| **All** | VO duplication | Captions sometimes lightly reformatted voiceover |

---

## 2. Files changed

| File | Change |
| --- | --- |
| `lib/ai/prompts/generateContentPackage.ts` | Stronger `PLATFORM_STYLE_SPECS` + `PLATFORM-NATIVE WRITING` block + per-platform `rules` |
| `lib/ai/guardrails.ts` | `checkPlatformNativeWriting` — YouTube SEO/length, VO clone, X length/variant hooks |
| `lib/projects/contentControls.ts` | `ensureFacebookPackagePlatform` + always include Facebook in `resolvePackagePlatforms` |
| `lib/projects/productionRun.ts` | Always inject Facebook into run generation plan (text-only when auto-injected); default config includes Facebook |
| `scripts/check-platform-styles.ts` | Sprint 4B coverage |
| `scripts/check-production-run.ts` | Expect Facebook in `targetPlatforms` |
| `reports/sprint-4b-platform-native-writing.md` | This doc |

---

## 3. Platform-specific changes

### TikTok
- Shorter (≤~25 words preferred)
- Stronger first-line curiosity
- Less storytelling, more punch
- Forbid VO retell / “This video…”

### Instagram
- Emotional + scannable
- Short paragraphs / line breaks
- Cut corporate padding

### YouTube Shorts
- Native Shorts metadata (not SEO description)
- Caption ≤ ~40 words prompt / 55-word hard guardrail
- Forbidden openers: “This video breaks down…”, “In this video…”, etc.

### LinkedIn
- Keep current professional style
- Explicit: avoid unnecessary expansion

### Facebook
- Always generate writing output
- Auto-inject into package/run targets when omitted
- Auto-inject is **text_only** (does not force another video surface)
- Friendly community tone kept

### X
- Stay ≤280 chars (guardrail)
- Variant hooks must differ in first 5 words

### Shared
- “Do NOT duplicate voiceover_text into any platform caption”

---

## 4. Before / after examples

### YouTube Shorts

**Before (run `4633f34f`):**
> Five visitors browsed a beauty salon's booking page over the weekend — and every single one left without leaving a name or number. This video breaks down exactly why that happens, why a contact form is not the same as being available, and what changes when your website can actually answer a question in real time. If your website goes quiet after hours, this is worth watching.

**After (required shape):**
> Five weekend visitors. Zero names left behind. A contact form is not availability.

### TikTok

**Before:** multi-beat story retell of VO  
**After:** one curiosity punch + soft bio CTA  
> She asked Saturday. Your site ghosted her. 👇

### Instagram

**Before:** dense single block  
**After:** emotional hook + short scannable paragraphs + soft CTA

### Facebook

**Before:** missing entirely  
**After:** always present community post (friendly, 2–4 sentences)

### X variants

**Before:** same opening across variants  
**After:** each variant opens on a different hook angle (enforced when variants exist)

---

## 5. Tests

```bash
npm run check:platform-styles
npm run check:production-run
npm run check:content-package-guardrails
```

`check:platform-styles` now covers:
- Sprint 4B style rules per platform
- PLATFORM-NATIVE WRITING prompt header
- Facebook always in `resolvePackagePlatforms` / `resolveRunGenerationPlan`
- Guardrails: YouTube SEO opener, YouTube length, VO duplication, X hook diversity

---

## Facebook failure root cause

Production run `4633f34f` stored:

```json
"platforms": ["tiktok", "instagram", "youtube", "linkedin", "x"]
```

Facebook was never in `targetPlatforms`, so it was never prompted, validated, or persisted. Sprint 4B fixes this by always ensuring Facebook in package writing targets.
