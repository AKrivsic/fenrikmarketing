# Content package prompt experiment

- **DRY_RUN_ONLY:** true
- **project_id:** b094cd3f-ca98-4900-ad0b-2579be7e2624
- **strategy items tested:** 3
- **variants per item:** 4 (A=current, B=reordered, C=copy-first, D=aligned safety)
- **generator provider:** claude
- **judge provider:** openai

## Average judge scores by variant (overall dimension)

- **A:** overall avg 6.7
- **B:** overall avg 6.7
- **C:** overall avg 7.3
- **D:** overall avg 7

## Blind judge wins by variant

- **A:** 1 wins
- **B:** 1 wins
- **C:** 0 wins
- **D:** 1 wins

## Top 5 hooks (by character length proxy — review manually)

- [B] Tomáš B. říká, že jeho Airbnb je vždy připravené bez nutnosti cokoli řešit – a přesně tohle většina hostitelů zažije jen jednou, než přijde ten den.
- [D] Tomáš B. říká, že jeho Airbnb je vždy připravené bez nutnosti cokoli řešit – a přesně tohle většina hostitelů zažívá přesně naopak.
- [A] Přiznám se: i já jsem si myslel, že ranní úklid před hostem je otázka hodiny. Pak jsem otevřel dveře bytu po předchozích hostech.
- [C] Tomáš B. z Prahy říká, že jeho Airbnb je vždy připravené bez nutnosti cokoliv řešit. Ale co se stane, když na to jste sami?
- [A] Tomáš z Prahy říká, že jeho Airbnb je vždy připravené bez nutnosti cokoliv řešit. Ale co se stane, když to tak není?

## Likely weaknesses of current prompt (A)

- Prompt length and compliance blocks may dilute hook instructions (mid-prompt placement).
- Optional proof/assets/platform rules compete with scroll-stop copy goals.
- Mode vs persona conflicts (e.g. Humor + Expert) may produce safe, flat voiceover.

## Recommendation

Variants B/C/D collectively beat A on blind judge wins — consider adopting the best reordering/copy-first changes.

## Per-item judge notes

### 59fc4828-b4a0-4106-b46b-962bc0b9a78e
- **winner:** A
- **reasoning:** Output 1 has the strongest hook and emotional pull, effectively engaging viewers and prompting action.

### f9e86771-a03a-4a14-8311-e736790de307
- **winner:** D
- **reasoning:** Output 4 has the strongest hook and emotional pull, effectively creating urgency and clarity, making it the most engaging and conversion-friendly.

### 1e1d992f-1fd0-490b-9d0d-45d2084b9db4
- **winner:** B
- **reasoning:** Output 2 has the strongest hook and emotional appeal, effectively driving curiosity and conversion fit.
