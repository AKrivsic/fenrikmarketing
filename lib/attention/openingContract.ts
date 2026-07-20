import { attentionSpec } from "@/lib/attention/catalog";
import type {
  AttentionMechanism,
  OpeningContract,
  OpeningDeliveryStyle,
  OpeningEmotionalEffect,
  OpeningStructure,
  OriginalityPass,
} from "@/lib/attention/types";
import { hashString } from "@/lib/creative-identity/hash";

const STRUCTURE_BY_MECHANISM: Record<
  AttentionMechanism,
  readonly OpeningStructure[]
> = {
  DILEMMA: ["split_choice", "frozen_consequence", "immediate_reaction"],
  HUMOR: ["held_then_punch", "immediate_reaction", "visual_first_question"],
  IRONY: ["bold_claim", "held_then_punch", "immediate_reaction"],
  ABSURD_ASSOCIATION: ["visual_first_question", "held_then_punch", "sudden_reveal"],
  VISUAL_METAPHOR: ["visual_first_question", "held_then_punch", "immediate_reaction"],
  ROLE_REVERSAL: ["sudden_reveal", "immediate_reaction", "held_then_punch"],
  PROVOCATIVE_OPINION: ["bold_claim", "immediate_reaction", "confession"],
  CURIOSITY_GAP: ["visual_first_question", "immediate_reaction", "sudden_reveal"],
  FRUSTRATION: ["immediate_reaction", "confession", "frozen_consequence"],
  RELIEF: ["immediate_reaction", "whispered_intimate", "sudden_reveal"],
  WISH_FULFILMENT: ["immediate_reaction", "sudden_reveal", "held_then_punch"],
  UNEXPECTED_COMPARISON: ["sudden_reveal", "split_choice", "immediate_reaction"],
  HUMAN_CONFLICT: ["frozen_consequence", "immediate_reaction", "confession"],
  SURPRISE: ["sudden_reveal", "immediate_reaction", "visual_first_question"],
  SATISFACTION: ["immediate_reaction", "held_then_punch", "sudden_reveal"],
  CONTRAST: ["split_choice", "sudden_reveal", "immediate_reaction"],
};

const DELIVERY_BY_MECHANISM: Record<
  AttentionMechanism,
  readonly OpeningDeliveryStyle[]
> = {
  DILEMMA: ["whispered", "urgent", "frustrated"],
  HUMOR: ["deadpan", "playful", "warm"],
  IRONY: ["deadpan", "confident", "playful"],
  ABSURD_ASSOCIATION: ["deadpan", "curious", "warm"],
  VISUAL_METAPHOR: ["whispered", "curious", "warm"],
  ROLE_REVERSAL: ["playful", "warm", "confident"],
  PROVOCATIVE_OPINION: ["confident", "urgent", "deadpan"],
  CURIOSITY_GAP: ["curious", "whispered", "urgent"],
  FRUSTRATION: ["frustrated", "urgent", "deadpan"],
  RELIEF: ["warm", "whispered", "curious"],
  WISH_FULFILMENT: ["warm", "playful", "confident"],
  UNEXPECTED_COMPARISON: ["curious", "playful", "confident"],
  HUMAN_CONFLICT: ["urgent", "frustrated", "whispered"],
  SURPRISE: ["urgent", "curious", "playful"],
  SATISFACTION: ["warm", "confident", "deadpan"],
  CONTRAST: ["confident", "urgent", "deadpan"],
};

const MOTION_BY_STRUCTURE: Record<
  OpeningStructure,
  OpeningContract["first_motion_intent"]
> = {
  immediate_reaction: "ATTENTION",
  split_choice: "ATTENTION",
  frozen_consequence: "ATTENTION",
  confession: "HOLD",
  bold_claim: "EMPHASIS",
  visual_first_question: "ATTENTION",
  held_then_punch: "ATTENTION",
  whispered_intimate: "HOLD",
  sudden_reveal: "REVEAL",
};

function pick<T>(items: readonly T[], seed: string): T {
  return items[hashString(seed) % items.length]!;
}

export function buildOpeningContract(args: {
  mechanism: AttentionMechanism;
  originality: OriginalityPass;
  seed: string;
}): OpeningContract {
  const spec = attentionSpec(args.mechanism);
  const structure = pick(
    STRUCTURE_BY_MECHANISM[args.mechanism],
    `${args.seed}::structure`,
  );
  const opening_delivery = pick(
    DELIVERY_BY_MECHANISM[args.mechanism],
    `${args.seed}::delivery`,
  );
  const effect: OpeningEmotionalEffect =
    args.originality.selected_emotional_effect;

  const first_spoken_guidance = [
    `Open with an immediate reaction using ${spec.name} — not context or setup.`,
    "The opening spoken thought must be one complete meaning unit (one short phrase, or two ultra-short phrases) — not an unfinished setup.",
    "The stored hook MUST be the same thought as the first spoken line — do not dilute a strong hook into a weaker voiceover setup.",
    spec.script_guidance,
    `Narrative seed: ${args.originality.selected_narrative_seed}`,
  ].join(" ");

  const first_visual_guidance = [
    "The first visual is an attention event with clear meaning — not a decorative sentence illustration.",
    spec.visual_guidance,
    `Preferred opening visual concept: ${args.originality.selected_visual_concept}`,
    "Reject low-information openings: frames that add no stakes, curiosity, contrast, or situation meaning.",
    "Calm or empty frames are fine when absence/stakes ARE the meaning; interchangeable stock staging with no situation is not.",
    "Render coherently via Visual Narrative / Medium / Profile / Identity — attention chooses the idea; Identity is treatment only (never relocate the event).",
  ].join(" ");

  return {
    first_spoken_guidance,
    first_subtitle_guidance:
      "First subtitle mirrors the first spoken thought — same words, no softer paraphrase.",
    first_visual_guidance,
    first_motion_intent: MOTION_BY_STRUCTURE[structure],
    opening_delivery,
    opening_structure: structure,
    emotional_effect: effect,
    land_within_seconds: [1.0, 1.8],
    align_hook_with_first_spoken: true,
  };
}
