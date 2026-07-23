# Guard Review

Validators, guardrails, and hard-fail conditions on the package/video path. **No guards were weakened in this audit.**

---

## Classification key

| Class | Meaning |
|-------|---------|
| Necessary and proportionate | Clear production invariant; scoped reasonably |
| Potentially too strict | Reachable false reject of usable content |
| Potentially too weak | Expensive work not gated, or warn-only after paid gen |
| Duplicated | Same concern checked twice |
| Applied at wrong stage | Comment/docs claim repair that is not wired; or check too late |
| Failure scope too broad | Scene/item issue fails entire package (after large paid spend) |

---

## A. Schema + `generateValidatedJson` package guardrails

Wiring: `makePackageGuardrails` → `checkContentPackageGuardrails` (`lib/ai/guardrails.ts:320+`, `packageShared.ts`).  
Behavior: fail → regenerate up to `maxAttempts=3` (package path does **not** set `repairGuardrailFailures: true`).

| Check | Threshold | Hard? | Scope | After fail | Class |
|-------|-----------|-------|-------|------------|-------|
| strategy ids present | required | Hard | Package | Regenerate / fail | Necessary |
| video mandatory when requireVideo | present | Hard | Package | same | Necessary |
| voiceover / subtitles | required when video | Hard | Package | same | Necessary |
| platform captions | required | Hard | Package | same | Necessary |
| funnel_stage match | equals strategy | Hard | Package | same | Necessary |
| CTA vs goal_type | mapping | Hard | Package | same | Necessary |
| forbidden_claims / product_is_not | substring | Hard | Package | same | Potentially too strict |
| voiceover word cap | >80 words | Hard | Package | same | Necessary (target 40–70 soft) |
| CORPORATE_COPY_PHRASES | substring EN/CS list | Hard | Package | same | Potentially too strict |
| image_prompts 1–5 | count | Hard | Package | same | Necessary |
| blank/empty screen prompts | forbidden | Hard | Package | same | Necessary |
| YT SEO openers / YT words / X chars | caps | Hard | Platform | same | Necessary–borderline strict |
| caption ≈ VO first 12 words | similarity | Hard | Package | same | Potentially too strict |
| X hook diversity | required | Hard | Package | same | Necessary |
| STATIC asset modify | forbid | Hard | Package | same | Necessary |
| asset missing / fullscreen preferred-video | rules | Hard | Package | same | Necessary / Duplicated w/ visual plan |
| asset coverage empty when required | sample/series | Hard | Package | same | Necessary |

**Reachable too-strict example (corporate):** Copy containing “cutting-edge” or Czech “komplexní řešení” as ordinary product language hard-fails and burns regenerate attempts (`CORPORATE_COPY_PHRASES` at `guardrails.ts:52–84`).

**Reachable too-strict example (forbidden substring):** A forbidden claim substring appearing inside a longer legitimate phrase triggers hard fail (`findForbiddenPhrases`).

---

## B. Post-Presentation creative gates (`generateContentPackage.ts`)

| Guard | Hard? | Repairable? | Scope | After fail | Class |
|-------|-------|-------------|-------|------------|-------|
| Hook enforce | Soft mutate | Deterministic | Hook/VO | Continue | Necessary |
| Concept fidelity | Hard after ≤1 material repair | Material → LLM; non-material residues can still hard-fail without repair | **Package** | Settle failed | Necessary; heuristics Potentially too strict; Failure scope too broad |
| Story integrity | Hard (except `cta_mismatch` soft) | ≤1 LLM | **Package** | Settle failed | Necessary; actor-token heuristics Potentially too strict; Failure scope too broad |
| Product demonstration integrity | Hard | **Repair delta not wired**; comment at :1212 claims force inject — stale | **Package** | Immediate fail | Applied at wrong stage / repair too weak; Failure scope too broad |
| Product presentation package validation | Hard when flag active | No | Package | Fail | Necessary when enabled |
| Story/visual/information progression | Soft warn | No | Diagnostics | Continue | Necessary as soft |
| Creative DNA vs package | Soft warn | No | Diagnostics | Continue | Potentially too weak after paid gen |
| Scene-type history / CTA position / frequency | Soft downgrade | Deterministic | Scene | Continue | Necessary |

Same pattern in `regenerateContentPackage.ts` (fidelity/story/PDI).

**Reachable too-strict example (fidelity):** Opening-frame / “generic office” heuristics can reject storyboards that are still on-brief (supported by failed packages in prior run comparison audits).

**Reachable too-strict example (story):** `primary_actor_changed` token matching can fire on non-actor tokens, failing the package after CE+Presentation.

**PDI example:** Candidate lacking structured product-demo beat fails entire package with no deterministic inject despite comment — wastes CE+Presentation.

---

## C. Video / render guards

| Guard | Hard? | Scope | After fail | Class |
|-------|-------|-------|------------|-------|
| TTS tail validation | Hard after ≤3 TTS | Job | Job failed | Necessary |
| Image moderation | 1 safe retry then local fallback | Scene | Continues with fallback | Necessary |
| Render fidelity (worker) | Hard | Job | Job failed → run item failed | Necessary; Failure scope: job not whole run |
| `assertVideoJobStillActive` | Cancel/status | Job | Abort / fail callback | Necessary |
| Voiceover hard reject 80 words (pre-video) | Hard in package guards | Package | Never reaches video | Necessary |

---

## D. Production / ops guards

| Guard | Behavior | Class |
|-------|----------|-------|
| One active production run | Blocks GENERATE | Necessary |
| Cancel skip on package handler | Skips new gen | Necessary |
| Cancel on start-video | Fail job + skip | Necessary |
| Video callback processing CAS | Blocks late terminal overwrite | Necessary |
| Trigger 023 | Blocks operator-fail → completed | Necessary |
| Stale run fail (12m, zero packages) | Only when **no** packages | Potentially too weak for stuck-with-packages |
| Package reconcile: any job failed → package failed | Item/slot fail | Necessary; one failed job fails slot even if another job completed |

---

## E. Soft vs hard summary

| Soft (continue) | Hard (fail package/job) |
|-----------------|-------------------------|
| Progression diagnostics | Schema / package guardrails after attempts |
| DNA mismatch warn | Fidelity / story / PDI |
| Scene history downgrade | TTS tail after 3 |
| Hook deterministic rewrite | Product presentation when active |

---

## Guards that may reject usable work or escalate local failures

1. Corporate phrase substring list — usable native copy rejected.  
2. Caption≈VO head — natural short hooks rejected.  
3. Concept fidelity / story integrity heuristics — false hard fails at **package** scope after paid CE.  
4. Product demonstration integrity without repair — hard fail after paid CE+Presentation.  
5. `resolvePackageReconcileStatus`: any `failed` job fails the package slot even if another job completed (`packageReconcileStatus.ts:18`).  
6. Plan missing → `planRequiresVideo` fail-closed true (`packageReconcileStatus.ts:37`) — text-only misconfig can demand video.

---

## Duplication notes

- Asset fullscreen / preferred-video checks appear in package guardrails and visual scene plan validation.  
- Fidelity + story + PDI overlap on “does the video show the product/candidate” themes — three hard layers after Presentation.
