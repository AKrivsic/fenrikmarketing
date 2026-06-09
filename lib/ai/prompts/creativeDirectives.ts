// Content Quality V3 — Creative Directives.
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

export const CREATIVE_MODES: readonly CreativeMode[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Clean, direct value delivery with a strong hook.",
    structure: "Hook -> problem -> concrete solution beat -> proof -> CTA.",
    avoid: "Do not be bland or list-like; still open on a concrete moment.",
  },
  {
    id: "story",
    name: "Story",
    description: "A tiny narrative built around one real customer moment.",
    structure:
      "Hook drops mid-scene -> stakes/tension -> turning point -> resolution -> CTA.",
    avoid: "No abstract advice; keep it one situation, not a montage of tips.",
  },
  {
    id: "shock",
    name: "Shock",
    description: "Opens on a surprising, relevant fact or consequence.",
    structure:
      "Surprising true beat -> why it matters -> what to do instead -> CTA.",
    avoid:
      "No shock that is irrelevant to the topic and no payoff the content cannot deliver.",
  },
  {
    id: "contrarian",
    name: "Contrarian",
    description: "Challenges a common belief the audience holds.",
    structure:
      "State the common belief -> dismantle it with reasoning -> better take -> CTA.",
    avoid: "Attack the idea or habit, never a person or group.",
  },
  {
    id: "myth_buster",
    name: "Myth Buster",
    description: "Names a widespread myth and corrects it.",
    structure: "Myth -> why people believe it -> the reality -> CTA.",
    avoid: "Do not invent the myth; correct it with real, supportable facts only.",
  },
  {
    id: "humor",
    name: "Humor",
    description: "Light, self-aware tone that entertains while informing.",
    structure:
      "Playful hook -> relatable exaggeration of the problem -> real fix -> CTA.",
    avoid:
      "Humor must not mock the customer or devalue the product; the fix stays serious.",
  },
  {
    id: "mistake",
    name: "Mistake",
    description: "Centres on a common error the audience is making.",
    structure:
      "Name the mistake -> why it backfires -> the correct approach -> CTA.",
    avoid: "Do not shame the viewer; frame the mistake as easy to fix.",
  },
  {
    id: "comparison",
    name: "Comparison",
    description: "Contrasts two approaches / options side by side.",
    structure:
      "Option A vs option B -> trade-offs -> clear recommendation -> CTA.",
    avoid:
      "No unfair strawman and no untrue claims about either side.",
  },
  {
    id: "micro_case",
    name: "Micro Case",
    description: "A compact before/after style mini case study.",
    structure: "Starting situation -> what changed -> outcome -> CTA.",
    avoid:
      "Use only outcomes supported by real proof; never fabricate metrics or results.",
  },
];

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

// Deterministically selects one mode, hook archetype and voice persona from a
// seed. The three dimensions are decorrelated with distinct suffixes so they
// vary independently. Identical seeds always return identical directives;
// different topic/angle/salt seeds return different directives.
export function pickCreativeDirectives(seed: string): CreativeDirectives {
  const base = seed && seed.trim().length > 0 ? seed : "default";
  return {
    mode: pickFrom(CREATIVE_MODES, `${base}::mode`),
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
