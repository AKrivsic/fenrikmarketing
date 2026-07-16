import { attentionSpec } from "@/lib/attention/catalog";
import type {
  AttentionMechanism,
  DeliveryArc,
  OpeningDeliveryStyle,
} from "@/lib/attention/types";

const OPENING_LINE: Record<OpeningDeliveryStyle, string> = {
  curious: "Opening: curious lean-in, slightly quicker first phrase.",
  urgent: "Opening: alert, clipped first phrase — not shouted.",
  whispered: "Opening: quieter, intimate confession energy.",
  deadpan: "Opening: dry deadpan; let the line land before lifting.",
  playful: "Opening: lightly playful, never cartoonish.",
  frustrated: "Opening: empathetic frustration at the problem, not the viewer.",
  confident: "Opening: bold, steady confidence on the first claim.",
  warm: "Opening: warm, close, human.",
};

export function buildDeliveryArc(args: {
  mechanism: AttentionMechanism;
  openingDelivery: OpeningDeliveryStyle;
}): DeliveryArc {
  const spec = attentionSpec(args.mechanism);
  const opening = OPENING_LINE[args.openingDelivery];
  const phases: DeliveryArc["phases"] = [
    { phase: "opening", delivery: opening },
    {
      phase: "body",
      delivery: "Body: conversational, varied rhythm — do not stay at opening energy.",
    },
    {
      phase: "emphasis",
      delivery: "Emphasis: slight lift on the key turn or insight line.",
    },
    {
      phase: "pause_before_reveal",
      delivery: "Brief pause before the reveal, punchline, or payoff.",
    },
    {
      phase: "payoff",
      delivery: `Payoff: ${spec.delivery_guidance}`,
    },
    {
      phase: "close",
      delivery: "Close: satisfying landing; CTA only if present, never aggressive.",
    },
  ];

  const tts_instruction_fragment = [
    opening,
    "Then settle into conversational body delivery.",
    "Vary emphasis; pause before the reveal or punchline.",
    "Do not read every line at the same energy.",
    spec.delivery_guidance,
  ].join(" ");

  return {
    version: "delivery-arc@1",
    phases,
    tts_instruction_fragment,
    reasons: [
      `opening_style:${args.openingDelivery}`,
      `mechanism:${args.mechanism}`,
      "full_arc_not_opening_only",
    ],
  };
}
