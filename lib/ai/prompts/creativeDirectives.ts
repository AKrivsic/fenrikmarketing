// Content Quality V3 — Creative Directives.
//
// Phase 2A ownership:
//   Story Structure owner: MODE BEATS (mode.narrativeBeats) — C1 contenders
//     (Preferred Arc, Narrative Beats) remain present but are NOT owners.
//   Voice Persona owner: VOICE PERSONAS (copy tone only; TTS voice id is separate).
//   Safety prompt companion: CREATIVE SAFETY (facts still owned by guardrails).
//   Hook archetype: fallback reader path only when no Winner Candidate exists.
//
// A deterministic, dependency-free catalogue of creative MODES, HOOK
// ARCHETYPES and VOICE PERSONAS plus a pure picker. The picker derives a stable
// selection from a SEED built out of existing data (funnel stage, topic, angle
// and — for regeneration — a salt from the previous title / feedback). There is
// NO randomness: the same seed always yields the same directives, and different
// topics/angles yield different directives.
//
// These directives only shape TONE and STRUCTURE. They never change facts, and
// the embedded CREATIVE SAFETY rules always override the creative instruction
// (see buildCreativeDirectiveBlock). No new JSON output field is introduced —
// this is prompt-only guidance.

export interface CreativeMode {
  id: string;
  name: string;
  // One-line description of the mode.
  description: string;
  // How it should change the structure of the video / narration.
  structure: string;
  // What this mode must NOT do (creative guardrail).
  avoid: string;
  // Attention First V1 — the ORDERED narrative beats this mode runs on. This is
  // the single source of truth for the video structure: it drives the prompt
  // (voiceover + image_prompts follow these beats) AND the storyboard role arc.
  // It deliberately replaces the old hardcoded marketing arc (hook -> problem ->
  // scenario -> proof -> cta) so each mode tells its OWN kind of story. Every
  // arc opens on a hook-style beat and ends on "cta".
  narrativeBeats: string[];
  // Content Quality Sprint 2 — modes whose shape matches the preferred
  // Hook -> Twist -> Payoff -> CTA arc (an early turn + a late payoff before the
  // CTA). The picker biases selection toward these so most content lands on the
  // preferred structure; non-preferred modes stay available for variety.
  preferred?: boolean;
}

export interface HookArchetype {
  id: string;
  // How to write the opening line in this archetype.
  instruction: string;
  // An example of the FORM (shape) — not a phrase to copy verbatim.
  exampleForm: string;
  // The generic opening this archetype explicitly forbids.
  forbidGeneric: string;
}

export interface VoicePersona {
  id: string;
  name: string;
  vocabulary: string;
  rhythm: string;
  energy: string;
  // How much overstatement / playfulness is allowed (facts stay intact).
  exaggeration: string;
}

export interface CreativeDirectives {
  mode: CreativeMode;
  hook: HookArchetype;
  persona: VoicePersona;
}

// --- Catalogue: Creative Modes ------------------------------------------

// Content Quality Sprint 2 — the preferred narrative arc for short-form content.
// "Twist" = an early turn / reversal that breaks the expected line; "Payoff" =
// the reveal / punchline / result the twist sets up, landed LATE (just before
// the CTA). The picker favours modes that follow this shape (see `preferred`).
export const PREFERRED_STORY_ARC = ["hook", "twist", "payoff", "cta"] as const;

export const CREATIVE_MODES: readonly CreativeMode[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Clean, direct value delivery with a strong hook.",
    structure:
      "Hook on a concrete moment -> the one insight that matters -> show it in action -> proof -> CTA.",
    avoid: "Do not be bland, list-like or templated; still open on a concrete moment.",
    narrativeBeats: ["hook", "insight", "in_action", "proof", "cta"],
  },
  {
    id: "story",
    name: "Story",
    description: "A tiny narrative built around one real customer moment.",
    structure:
      "Setup (drop mid-scene) -> conflict/stakes -> twist (turning point) -> resolution -> CTA.",
    avoid: "No abstract advice; keep it one situation, not a montage of tips.",
    narrativeBeats: ["setup", "conflict", "twist", "resolution", "cta"],
    preferred: true,
  },
  {
    id: "shock",
    name: "Shock",
    description: "Opens on a surprising, relevant fact or consequence.",
    structure:
      "Unexpected true fact -> implication (why it matters) -> proof -> CTA.",
    avoid:
      "No shock that is irrelevant to the topic and no payoff the content cannot deliver.",
    narrativeBeats: ["unexpected_fact", "implication", "proof", "cta"],
    preferred: true,
  },
  {
    id: "contrarian",
    name: "Contrarian",
    description: "Challenges a common belief the audience holds.",
    structure:
      "Common belief -> why it is wrong (dismantle with reasoning) -> proof of the better take -> CTA.",
    avoid: "Attack the idea or habit, never a person or group.",
    narrativeBeats: ["common_belief", "why_wrong", "proof", "cta"],
    preferred: true,
  },
  {
    id: "myth_buster",
    name: "Myth Buster",
    description: "Names a widespread myth and corrects it.",
    structure: "Myth -> why people believe it -> the reality -> CTA.",
    avoid: "Do not invent the myth; correct it with real, supportable facts only.",
    narrativeBeats: ["myth", "why_believed", "reality", "cta"],
  },
  {
    id: "humor",
    name: "Humor",
    description: "Light, self-aware tone that entertains while informing.",
    structure:
      "Relatable situation -> unexpected turn -> punchline that lands the point -> CTA.",
    avoid:
      "Humor must not mock the customer or devalue the product; the fix stays serious.",
    narrativeBeats: ["situation", "unexpected_turn", "punchline", "cta"],
    preferred: true,
  },
  {
    id: "mistake",
    name: "Mistake",
    description: "Centres on a common error the audience is making.",
    structure:
      "Name the mistake -> why it backfires -> the correct approach -> CTA.",
    avoid: "Do not shame the viewer; frame the mistake as easy to fix.",
    narrativeBeats: ["mistake", "why_backfires", "correct_approach", "cta"],
    preferred: true,
  },
  {
    id: "comparison",
    name: "Comparison",
    description: "Contrasts two approaches / options side by side.",
    structure:
      "Option A vs option B -> trade-offs -> clear recommendation -> CTA.",
    avoid:
      "No unfair strawman and no untrue claims about either side.",
    narrativeBeats: ["option_a", "option_b", "tradeoffs", "recommendation", "cta"],
  },
  {
    id: "micro_case",
    name: "Micro Case",
    description: "A compact before/after style mini case study.",
    structure: "Before (starting situation) -> what changed -> after (outcome) -> CTA.",
    avoid:
      "Use only outcomes supported by real proof; never fabricate metrics or results.",
    narrativeBeats: ["before", "change", "after", "cta"],
  },
  {
    id: "observation",
    name: "Observation",
    description: "Starts from a sharp, relatable observation and finds the meaning.",
    structure:
      "Specific observation -> what it really means -> the reveal -> CTA.",
    avoid:
      "Do not state the obvious; the reveal must reframe the observation, not restate it.",
    narrativeBeats: ["observation", "meaning", "reveal", "cta"],
    preferred: true,
  },
];

// Content Quality Sprint 2 — the subset of modes that follow the preferred
// Hook -> Twist -> Payoff -> CTA arc. The picker draws from this pool first.
export const PREFERRED_CREATIVE_MODES: readonly CreativeMode[] =
  CREATIVE_MODES.filter((m) => m.preferred);

// --- Catalogue: Hook Archetypes -----------------------------------------

export const HOOK_ARCHETYPES: readonly HookArchetype[] = [
  {
    id: "unexpected_truth",
    instruction:
      "Open with a true but counter-intuitive statement that reframes the topic.",
    exampleForm: '"The cleanest flats are usually the dirtiest where it counts."',
    forbidGeneric: 'Do not open with "Did you know..." or a topic label.',
  },
  {
    id: "mistake",
    instruction: "Open by naming a specific mistake the viewer is probably making.",
    exampleForm: '"You are wiping the counter — and spreading the mess."',
    forbidGeneric: 'Do not open with "Here are some tips to avoid mistakes."',
  },
  {
    id: "myth",
    instruction: "Open by stating a popular myth you are about to break.",
    exampleForm: '"More cleaning product means cleaner. It does not."',
    forbidGeneric: 'Do not open with "Let\'s talk about a common myth."',
  },
  {
    id: "fear",
    instruction:
      "Open on a concrete, relevant risk or consequence the viewer wants to avoid.",
    exampleForm: '"Guests in two hours and the bathroom still smells."',
    forbidGeneric: 'Do not open with a vague warning like "Be careful with...".',
  },
  {
    id: "contrast",
    instruction: "Open on a sharp before/after or this-vs-that contrast.",
    exampleForm: '"Two hours of scrubbing vs fifteen minutes done right."',
    forbidGeneric: 'Do not open with "There are many ways to do this."',
  },
  {
    id: "confession",
    instruction:
      "Open with a candid, first-person admission that earns attention.",
    exampleForm: '"We used to clean it wrong too — until a client showed us."',
    forbidGeneric: 'Do not open with a neutral brand statement about yourself.',
  },
  {
    id: "question",
    instruction:
      "Open with one pointed question whose answer the viewer needs.",
    exampleForm: '"Why does your kitchen still smell after you clean it?"',
    forbidGeneric:
      'Do not open with a lazy rhetorical question like "Want a clean home?".',
  },
  {
    id: "proof_shock",
    instruction:
      "Open on a striking proof point FROM THE PROOF POOL (never invented).",
    exampleForm: '"<a real metric/result from the proof pool>, and here is why."',
    forbidGeneric:
      "Do not invent numbers; if no real proof exists, use a different archetype.",
  },
];

// --- Catalogue: Voice Personas ------------------------------------------

export const VOICE_PERSONAS: readonly VoicePersona[] = [
  {
    id: "expert",
    name: "Expert",
    vocabulary: "precise, domain-aware, no fluff",
    rhythm: "measured, confident sentences",
    energy: "calm authority",
    exaggeration: "none — let the substance carry it",
  },
  {
    id: "insider",
    name: "Insider",
    vocabulary: "behind-the-scenes, trade specifics",
    rhythm: "conspiratorial, lets-you-in pacing",
    energy: "engaged, slightly exclusive",
    exaggeration: "light, for intrigue only",
  },
  {
    id: "witty_friend",
    name: "Witty Friend",
    vocabulary: "casual, playful, relatable",
    rhythm: "snappy, short beats with a punchline",
    energy: "warm and fun",
    exaggeration: "moderate, comedic — never about the facts",
  },
  {
    id: "reporter",
    name: "Reporter",
    vocabulary: "factual, observational, neutral",
    rhythm: "crisp, headline-then-detail",
    energy: "matter-of-fact",
    exaggeration: "none",
  },
  {
    id: "calm_advisor",
    name: "Calm Advisor",
    vocabulary: "reassuring, simple, supportive",
    rhythm: "unhurried, guiding",
    energy: "steady and trustworthy",
    exaggeration: "none",
  },
  {
    id: "annoyed_operator",
    name: "Annoyed Operator",
    vocabulary: "blunt, no-nonsense, a little fed up",
    rhythm: "clipped, direct hits",
    energy: "high, impatient (with the problem, not the viewer)",
    exaggeration: "moderate, for emphasis — never insulting the customer",
  },
];

// --- Deterministic picker -----------------------------------------------

// FNV-1a 32-bit hash. Pure and stable across runs; used only to index the
// catalogues from a seed string (no cryptographic intent).
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pickFrom<T>(items: readonly T[], seed: string): T {
  return items[hashString(seed) % items.length];
}

// Builds the deterministic creative SEED from the strategy item. Exported so the
// generation workflows can derive the SAME directive the prompt uses and pass
// the chosen mode's narrative beats down to the storyboard (Attention First V1).
// `salt` is empty for fresh generation and a regeneration salt otherwise.
export function buildCreativeSeed(
  funnelLabel: string,
  topic: string,
  angle: string | null | undefined,
  salt?: string | null,
): string {
  return [funnelLabel, topic, angle ?? "", salt ?? ""].join("|");
}

// The regeneration salt mixed into the seed so a regenerated package lands on a
// DIFFERENT directive than the original (which uses an empty salt). Kept here so
// the prompt and the workflow compute byte-identical seeds.
export function buildRegenerateCreativeSeedSalt(
  previousTitle: string,
  feedback: string | null | undefined,
): string {
  return `regen|${previousTitle}|${feedback ?? ""}`;
}

// Deterministically selects one mode, hook archetype and voice persona from a
// seed. The three dimensions are decorrelated with distinct suffixes so they
// vary independently. Identical seeds always return identical directives;
// different topic/angle/salt seeds return different directives.
export function pickCreativeDirectives(seed: string): CreativeDirectives {
  const base = seed && seed.trim().length > 0 ? seed : "default";
  // Content Quality Sprint 2 — bias the mode toward the preferred
  // Hook -> Twist -> Payoff -> CTA pool. Still fully deterministic (same seed ->
  // same mode) and still varies across seeds; the full catalogue is the
  // fallback if no mode is marked preferred.
  const modePool =
    PREFERRED_CREATIVE_MODES.length > 0 ? PREFERRED_CREATIVE_MODES : CREATIVE_MODES;
  return {
    mode: pickFrom(modePool, `${base}::mode`),
    hook: pickFrom(HOOK_ARCHETYPES, `${base}::hook`),
    persona: pickFrom(VOICE_PERSONAS, `${base}::persona`),
  };
}

// Renders the CREATIVE DIRECTIVE prompt block (creative guidance + safety
// rules). The safety rules are part of the block so they always travel with the
// directive and override it on any conflict.
export function buildCreativeDirectiveBlock(
  directives: CreativeDirectives,
): string {
  const { mode, hook, persona } = directives;
  return [
    "CREATIVE DIRECTIVE (this piece only — shapes tone & structure, NEVER facts):",
    `- MODE: ${mode.name} — ${mode.description} STRUCTURE: ${mode.structure} NEVER: ${mode.avoid}`,
    `- MODE BEATS (the ONLY structure to follow — NOT a hook/problem/scenario/proof/cta template): ${mode.narrativeBeats.join(" -> ")}`,
    `- HOOK ARCHETYPE: ${hook.id} — ${hook.instruction} FORM (do not copy verbatim): ${hook.exampleForm} ${hook.forbidGeneric}`,
    `- VOICE PERSONA: ${persona.name} — vocabulary: ${persona.vocabulary}; rhythm: ${persona.rhythm}; energy: ${persona.energy}; exaggeration: ${persona.exaggeration}.`,
    "CREATIVE SAFETY (these ALWAYS override the directive on any conflict):",
    "- Never lie; never invent numbers, names, results, quotes or testimonials.",
    "- Never produce a forbidden_claim and never describe the product as anything in product_is_not.",
    "- No shock without genuine relevance to the topic; no clickbait the content does not pay off.",
    "- Humor must never mock the customer or devalue the product; the actual fix stays serious.",
    "- Contrarian/controversial takes attack ideas or habits only — never a person or a protected group.",
    "- The voice persona changes wording, rhythm and energy ONLY; it must not alter any fact or proof.",
  ].join("\n");
}
