import type { AttentionMechanism } from "@/lib/attention/types";

export interface AttentionMechanismSpec {
  id: AttentionMechanism;
  name: string;
  description: string;
  script_guidance: string;
  visual_guidance: string;
  delivery_guidance: string;
  avoid: string;
  /** Soft affinities only — never a hard funnel map. */
  soft_funnel_boost: Partial<
    Record<
      "awareness" | "problem_aware" | "solution_aware" | "conversion",
      number
    >
  >;
  soft_mode_boost: Partial<Record<string, number>>;
}

export const ATTENTION_CATALOG: readonly AttentionMechanismSpec[] = [
  {
    id: "DILEMMA",
    name: "Dilemma",
    description: "Force a real life-versus-work or choose-A-or-B tension.",
    script_guidance:
      "Open mid-choice. Name both options in concrete terms. Make the cost of either side feel real.",
    visual_guidance:
      "Show a frozen decision moment with consequences visible — not a notebook vs paper gag.",
    delivery_guidance: "Slightly tense, intimate, as if the viewer is inside the choice.",
    avoid: "Do not default to stationery, sticky notes, or generic office props as the dilemma.",
    soft_funnel_boost: { awareness: 1, problem_aware: 2, solution_aware: 1 },
    soft_mode_boost: { story: 2, observation: 1, mistake: 1, humor: 1 },
  },
  {
    id: "HUMOR",
    name: "Humor",
    description: "Earn a laugh that still lands the point.",
    script_guidance:
      "Open on a funny specific situation, then twist into the insight. Punchline must serve the idea.",
    visual_guidance:
      "Prefer a comic specific action or absurd-but-clear prop tied to the audience — not generic office jokes.",
    delivery_guidance: "Lightly playful deadpan or warm amusement — never forced laugh track energy.",
    avoid: "No mocking the customer; no generic 'busy entrepreneur' jokes.",
    soft_funnel_boost: { awareness: 2, problem_aware: 1 },
    soft_mode_boost: { humor: 3, observation: 1, shock: 1 },
  },
  {
    id: "IRONY",
    name: "Irony",
    description: "Say or show the opposite of what the audience expects.",
    script_guidance:
      "Lead with the ironic mismatch between what people claim and what they do.",
    visual_guidance: "Visual contradiction: appearance vs reality in one readable frame.",
    delivery_guidance: "Dry, knowing, slightly amused.",
    avoid: "Irony must stay truthful — no fake outrage.",
    soft_funnel_boost: { awareness: 2, problem_aware: 2 },
    soft_mode_boost: { contrarian: 2, observation: 2, humor: 1 },
  },
  {
    id: "ABSURD_ASSOCIATION",
    name: "Absurd Association",
    description: "Unexpected metaphor that still connects once the story continues.",
    script_guidance:
      "Open on the strange image or comparison, then earn the connection — never random shock.",
    visual_guidance:
      "Let the strange but understandable image register in half a second before explanation.",
    delivery_guidance: "Calm certainty under the absurdity, or soft surprise.",
    avoid: "Do not use shock unrelated to the topic; the association must pay off.",
    soft_funnel_boost: { awareness: 3 },
    soft_mode_boost: { shock: 2, humor: 2, observation: 1 },
  },
  {
    id: "VISUAL_METAPHOR",
    name: "Visual Metaphor",
    description: "One strong image stands for the abstract idea.",
    script_guidance: "Let the metaphor carry meaning; narration names the stakes, not the metaphor dictionary.",
    visual_guidance: "One clear metaphoric subject — bold, readable, not decorative abstract shapes.",
    delivery_guidance: "Measured, slightly intimate.",
    avoid: "Empty boards, blank calendars, and generic red warning symbols as the only metaphor.",
    soft_funnel_boost: { awareness: 2, solution_aware: 1 },
    soft_mode_boost: { observation: 2, story: 1, shock: 1 },
  },
  {
    id: "ROLE_REVERSAL",
    name: "Role Reversal",
    description: "Who usually works / who usually rests flips.",
    script_guidance: "Show the unexpected actor doing the work (or walking away from it).",
    visual_guidance: "Human vs automation, customer vs expert, chaos vs calm — roles swapped visibly.",
    delivery_guidance: "Amused confidence or quiet relief.",
    avoid: "Do not flatten into a generic laptop selfie.",
    soft_funnel_boost: { solution_aware: 2, conversion: 1, awareness: 1 },
    soft_mode_boost: { humor: 2, comparison: 2, micro_case: 1 },
  },
  {
    id: "PROVOCATIVE_OPINION",
    name: "Provocative Opinion",
    description: "A bold, supportable take that challenges a habit.",
    script_guidance: "State the opinion in the first short phrase. Attack the idea, never a person.",
    visual_guidance: "Image that dramatizes the contested habit or its consequence.",
    delivery_guidance: "Confident, not aggressive.",
    avoid: "No defamation, no hate, no dishonest claims.",
    soft_funnel_boost: { awareness: 2, problem_aware: 2 },
    soft_mode_boost: { contrarian: 3, myth_buster: 2, shock: 1 },
  },
  {
    id: "CURIOSITY_GAP",
    name: "Curiosity Gap",
    description: "Open a loop the viewer needs closed.",
    script_guidance: "First line withholds the answer on purpose; body earns the reveal.",
    visual_guidance: "A frame that raises a question — incomplete action, covered result, interrupted moment.",
    delivery_guidance: "Curious, conspiratorial lean-in.",
    avoid: "No clickbait the video cannot pay off.",
    soft_funnel_boost: { awareness: 2, problem_aware: 1, solution_aware: 1 },
    soft_mode_boost: { shock: 2, story: 1, observation: 1 },
  },
  {
    id: "FRUSTRATION",
    name: "Frustration",
    description: "Name the aggravating loop the audience already feels.",
    script_guidance: "Open on the felt annoyance — specific, not abstract.",
    visual_guidance: "Emotional action of frustration with a clear cause — not calm desk staring.",
    delivery_guidance: "Empathetic frustration with the problem, never at the viewer.",
    avoid: "Do not shame; do not linger in generic busy-work montage.",
    soft_funnel_boost: { problem_aware: 3, awareness: 1 },
    soft_mode_boost: { mistake: 2, humor: 1, story: 1 },
  },
  {
    id: "RELIEF",
    name: "Relief",
    description: "The exhale after the pressure breaks.",
    script_guidance: "Start at the moment pressure releases, then rewind just enough to explain why.",
    visual_guidance: "Body language of release, empty calendar becoming free time, walk-away from the desk with purpose.",
    delivery_guidance: "Warm, slightly slower, relieved.",
    avoid: "Relief without a prior tension cue feels soft and forgettable.",
    soft_funnel_boost: { solution_aware: 2, conversion: 2 },
    soft_mode_boost: { micro_case: 2, story: 1, standard: 1 },
  },
  {
    id: "WISH_FULFILMENT",
    name: "Wish Fulfilment",
    description: "Show the life the audience wants while the work still gets done.",
    script_guidance: "Lead with the desired state; reveal how the work continues without them grinding.",
    visual_guidance: "Aspiration made concrete — leaving, celebrating, living — with work continuing elsewhere.",
    delivery_guidance: "Warm, aspirational, lightly conspiratorial.",
    avoid: "Do not invent impossible lifestyle claims.",
    soft_funnel_boost: { solution_aware: 2, conversion: 2, awareness: 1 },
    soft_mode_boost: { story: 1, humor: 1, micro_case: 2 },
  },
  {
    id: "UNEXPECTED_COMPARISON",
    name: "Unexpected Comparison",
    description: "Compare the topic to something from another domain that clicks.",
    script_guidance: "Name both sides of the comparison quickly; the bridge must feel earned by the end.",
    visual_guidance: "Side-by-side or snap change between the two domains.",
    delivery_guidance: "Clear, slightly delighted at the fit.",
    avoid: "Comparisons that only shock and never connect back.",
    soft_funnel_boost: { awareness: 2, problem_aware: 1 },
    soft_mode_boost: { comparison: 3, observation: 1, shock: 1 },
  },
  {
    id: "HUMAN_CONFLICT",
    name: "Human Conflict",
    description: "Interpersonal tension around the work (team, client, partner).",
    script_guidance: "Open on the disagreement or mismatched expectations mid-scene.",
    visual_guidance: "Two human stakes in one frame — not a lone person staring at a laptop.",
    delivery_guidance: "Conversational tension, then clarity.",
    avoid: "No cruelty, no stereotyping protected groups.",
    soft_funnel_boost: { problem_aware: 2, awareness: 1 },
    soft_mode_boost: { story: 2, mistake: 1, observation: 1 },
  },
  {
    id: "SURPRISE",
    name: "Surprise",
    description: "A true unexpected beat that reframes the topic.",
    script_guidance: "Lead with the surprising true fact or twist; implication follows.",
    visual_guidance: "Rapid reveal or sudden push into the unexpected subject.",
    delivery_guidance: "Alert energy on the surprise, then settle.",
    avoid: "No irrelevant shock; surprise must be relevant and true.",
    soft_funnel_boost: { awareness: 3, problem_aware: 1 },
    soft_mode_boost: { shock: 3, humor: 1 },
  },
  {
    id: "SATISFACTION",
    name: "Satisfaction",
    description: "The clean click of something finally working.",
    script_guidance: "Open on the satisfying completion beat, then show why it was hard before.",
    visual_guidance: "Completion, alignment, tidy result — kinetic and clear.",
    delivery_guidance: "Quiet satisfaction, slight smile in the voice.",
    avoid: "Do not open with a long setup before the satisfying moment.",
    soft_funnel_boost: { solution_aware: 2, conversion: 1 },
    soft_mode_boost: { micro_case: 2, standard: 1, comparison: 1 },
  },
  {
    id: "CONTRAST",
    name: "Contrast",
    description: "Sharp before/after or this-vs-that in the opening.",
    script_guidance: "Two poles in the first breath — no long bridge sentence.",
    visual_guidance: "Split attention, snap change, or decisive movement toward one side.",
    delivery_guidance: "Crisp, binary emphasis.",
    avoid: "Vague 'many ways' contrasts.",
    soft_funnel_boost: {
      awareness: 1,
      problem_aware: 1,
      solution_aware: 2,
      conversion: 1,
    },
    soft_mode_boost: { comparison: 3, micro_case: 2, contrarian: 1 },
  },
];

export function attentionSpec(
  id: AttentionMechanism,
): AttentionMechanismSpec {
  const found = ATTENTION_CATALOG.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown attention mechanism: ${id}`);
  return found;
}
