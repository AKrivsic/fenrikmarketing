/**
 * Phase 2B — render Typed Decision Packs into Presentation prompt fragments.
 * Preserves current semantics; does not invent new prose or vertical examples.
 */

import type {
  AssetPolicyPack,
  HookPack,
  StoryStructurePack,
  TypedDecisionPacks,
  VoicePack,
} from "@/lib/architecture/typedDecisionPacks/types";

/** Authoritative story-structure line(s) for Content Quality / ATTENTION FIRST. */
export function renderStoryStructureFollowLine(
  pack: StoryStructurePack,
): string {
  return (
    `- Follow the MODE BEATS above as the ONLY story structure: ${pack.beatArc}. ` +
    "Do NOT fall back to a generic hook -> problem -> scenario -> proof -> CTA template. " +
    "Do NOT substitute a Preferred Arc or a second required beat grammar."
  );
}

/**
 * Opening hook bridge derived from HookPack (not raw candidate re-resolution).
 */
export function renderHookOpeningBridge(
  hook: HookPack,
  story: StoryStructurePack,
): string[] {
  if (hook.source === "winner_candidate_hookLine" && hook.hookLine) {
    return [
      "- OPENING HOOK: the Winner Candidate hookLine is the first spoken line of",
      `  voiceover_text: "${hook.hookLine}". Then follow MODE BEATS (${story.beatArc}).`,
      "  Do not invent a softer opening than that hookLine.",
    ];
  }
  return [
    "- OPENING HOOK: open on the HOOK ARCHETYPE above (legacy path — no Winner",
    `  Candidate hookLine). Then follow MODE BEATS (${story.beatArc}).`,
  ];
}

/** Asset policy prompt block — Coverage or Funnel fallback, never both. */
export function renderAssetPolicyPack(pack: AssetPolicyPack): string {
  return pack.promptBlock;
}

/** Attention delivery block when present on VoicePack. */
export function renderVoiceDeliveryBlock(pack: VoicePack): string | null {
  return pack.deliveryPromptBlock;
}

/**
 * Soft pacing note — NOT a story-structure owner.
 * Preferred Arc is demoted: optional pacing flavor mapped onto MODE BEATS only.
 */
export function renderNonAuthoritativePacingNote(
  story: StoryStructurePack,
): string {
  return (
    `- PACING (non-authoritative — does NOT override MODE BEATS): favor an early ` +
    `turn and a late payoff on top of ${story.beatArc}; never invent a second structure.`
  );
}

/** Compact pack provenance comment for debugging / audits (not injected by default). */
export function renderPackProvenanceSummary(packs: TypedDecisionPacks): string {
  return [
    `TYPED DECISION PACKS (${packs.version}) — provenance only:`,
    `- storyStructure: ${packs.storyStructure.source} / ${packs.storyStructure.beatArc}`,
    `- hook: ${packs.hook.source}${packs.hook.meta.usedFallback ? " (fallback)" : ""}`,
    `- assetPolicy: ${packs.assetPolicy.source}`,
  ].join("\n");
}
