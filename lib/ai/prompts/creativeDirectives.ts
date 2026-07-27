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
// These directives shape THINKING + STRUCTURE (mode) and wording energy
// (persona). They never change facts. Creative Safety always overrides
// (see buildCreativeDirectiveBlock). No new JSON output field is introduced —
// this is prompt-only guidance.

export interface CreativeMode {
  id: string;
  name: string;
  // One-line description of the mode.
  description: string;
  // Mental model: how the model should THINK while inventing the piece
  // (argumentation, viewer path, insight type) — not a writing-style tip.
  thinking: string;
  // How the argument / viewer path should unfold (flexible, not a template).
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
    thinking:
      "Think as a clear explainer: one concrete moment, one insight, then show it working. The insight is the spine — not a story detour, not a debate, not a list.",
    structure:
      "Hook on a concrete moment -> the one insight that matters -> show it in action -> proof -> CTA.",
    avoid: "Do not be bland, list-like or templated; still open on a concrete moment.",
    narrativeBeats: ["hook", "insight", "in_action", "proof", "cta"],
  },
  {
    id: "story",
    name: "Story",
    description: "A tiny narrative built around one real customer or operator moment.",
    thinking:
      "Think as a storyteller inside ONE situation. The insight arrives through what happens to someone (setup, stakes, turn, resolution) — not through advice, tips, or a product pitch dressed as a tale.",
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
    thinking:
      "Think from a startling true consequence first. The viewer path is: jolt → why this matters → evidence. The surprise is the argument's entry point, not decoration on a normal tip video.",
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
    thinking:
      "Think by attacking a widely held belief and rebuilding a better take. The video argues against the default assumption — belief → dismantle → better take — not 'problem then product'.",
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
    thinking:
      "Think as a myth-corrector: name the false belief, explain why it feels true, then replace it with reality. The spine is myth → correction, not a generic value pitch with myth-flavored wording.",
    structure: "Myth -> why people believe it -> the reality -> CTA.",
    avoid: "Do not invent the myth; correct it with real, supportable facts only.",
    narrativeBeats: ["myth", "why_believed", "reality", "cta"],
  },
  {
    id: "humor",
    name: "Humor",
    description: "Light, self-aware tone that entertains while informing.",
    thinking:
      "Think through a comic beat: relatable setup → unexpected turn → punchline that carries the point. The laugh is structural (a turn), not just witty adjectives on a serious script.",
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
    thinking:
      "Think from a specific error the viewer is likely making. The path is mistake → why it backfires → correct approach. The 'wrong move' is the protagonist of the argument.",
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
    thinking:
      "Think in two columns for the whole piece. Keep A vs B alive across beats (trade-offs, not a strawman). The recommendation emerges from contrast — do not collapse into a single-path tip video.",
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
    thinking:
      "Think as a mini case study: starting state → what changed → outcome. The proof is a concrete example with a result, not abstract advice. Stay honest to real proof — never invent metrics.",
    structure: "Before (starting situation) -> what changed -> after (outcome) -> CTA.",
    avoid:
      "Use only outcomes supported by real proof; never fabricate metrics or results.",
    narrativeBeats: ["before", "change", "after", "cta"],
  },
  {
    id: "observation",
    name: "Observation",
    description: "Starts from a sharp, relatable observation and finds the meaning.",
    thinking:
      "Think like someone who noticed something odd in ordinary life and must reframe it. Path: specific observation → what it really means → reveal. The reveal must change the meaning, not restate the obvious.",
    structure:
      "Specific observation -> what it really means -> the reveal -> CTA.",
    avoid:
      "Do not state the obvious; the reveal must reframe the observation, not restate it.",
    narrativeBeats: ["observation", "meaning", "reveal", "cta"],
    preferred: true,
  },
  {
    id: "faq",
    name: "FAQ",
    description: "Answers one concrete question the audience is already asking.",
    thinking:
      "Think as a direct answer to ONE real audience question. The question owns the structure; the answer is the payload. Do not expand into a multi-tip lecture or a story that never states the question.",
    structure:
      "The question (as the audience would ask it) -> honest answer -> why it matters -> CTA.",
    avoid: "Do not invent a fake FAQ; use a real audience question grounded in Product Brain.",
    narrativeBeats: ["question", "answer", "why_it_matters", "cta"],
  },
  {
    id: "experiment",
    name: "Experiment",
    description: "Frames the piece as a test, trial, or what-if experiment.",
    thinking:
      "Think scientifically for a short video: hypothesis → what was tried → what happened → takeaway. Curiosity comes from testing, not from a generic claim. Keep results honest to proof.",
    structure:
      "Hypothesis / setup -> what was tried -> what happened -> takeaway -> CTA.",
    avoid: "Do not fabricate experimental results; keep outcomes honest to proof.",
    narrativeBeats: ["hypothesis", "trial", "result", "takeaway", "cta"],
  },
  {
    id: "checklist",
    name: "Checklist",
    description: "Delivers practical steps as a short checklist the viewer can use.",
    thinking:
      "Think in verifiable steps the viewer can run. Why the list matters → concrete checks → payoff of doing them. Each beat advances a doable item — not a narrative arc wearing checklist language.",
    structure:
      "Why the checklist matters -> 3–5 concrete steps -> the payoff of doing them -> CTA.",
    avoid: "No vague tips; every step must be specific and doable.",
    narrativeBeats: ["why_checklist", "steps", "payoff", "cta"],
  },
  {
    id: "opinion",
    name: "Opinion",
    description: "States a clear point of view and defends it.",
    thinking:
      "Think as someone taking a stance and defending it: bold take → reasoning → evidence. The opinion is the thesis; the video is an argument for it — not a soft tip list with attitude.",
    structure:
      "Bold take -> reasoning -> evidence or lived example -> CTA.",
    avoid: "No empty hot takes; the opinion must be supportable from Product Brain / proof.",
    narrativeBeats: ["take", "reasoning", "evidence", "cta"],
  },
];

// Modes that follow a Hook -> Twist -> Payoff -> CTA-ish shape. Kept for
// diagnostics / callers; the picker uses the FULL catalogue so mode diversity
// is not collapsed onto one preferred arc.
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
  // Draw from the FULL mode catalogue so Story / FAQ / Comparison / Myth /
  // Mistake / Checklist / Opinion / etc. can each own a package. Still fully
  // deterministic (same seed -> same mode).
  return {
    mode: pickFrom(CREATIVE_MODES, `${base}::mode`),
    hook: pickFrom(HOOK_ARCHETYPES, `${base}::hook`),
    persona: pickFrom(VOICE_PERSONAS, `${base}::persona`),
  };
}

export function buildSoftCreativeDirectiveBlock(
  directives: CreativeDirectives,
): string {
  const { mode, hook, persona } = directives;
  return [
    "CREATIVE DIRECTIVE (THINKING MODEL for this piece — NEVER facts):",
    `- MODE (primary thinking frame — not a writing style): ${mode.name} — ${mode.description}`,
    `  HOW TO THINK: ${mode.thinking}`,
    `  ARGUMENT PATH: ${mode.structure}`,
    `  MODE BEATS (natural order of thought — flexible, not a rigid template): ${mode.narrativeBeats.join(" -> ")}`,
    `  NEVER THINK THIS WAY: ${mode.avoid}`,
    `- MODE OWNERSHIP: A viewer who never sees metadata should still recognize this as a ${mode.name} piece from HOW the idea unfolds — argumentation structure, insight type, and how the viewer is led — not from vocabulary alone.`,
    `- If swapping adjectives would make this look like a different mode, rethink the concept. Invent freely INSIDE ${mode.name}; do not invent another mode's logic and then "sound like" ${mode.name}.`,
    `- Persona owns wording/rhythm. MODE owns the logic of the piece (structure of thought, type of insight, construction of the video).`,
    `- HOOK ARCHETYPE (opening form inside this mode): ${hook.id} — ${hook.instruction} FORM (do not copy verbatim): ${hook.exampleForm} ${hook.forbidGeneric}`,
    `- VOICE PERSONA (copy voice ONLY — never facts, never mode logic): ${persona.name} — vocabulary: ${persona.vocabulary}; rhythm: ${persona.rhythm}; energy: ${persona.energy}; exaggeration: ${persona.exaggeration}.`,
    "- Depart from MODE / HOOK / VOICE only when they would force a lie or conflict with Product Brain, the selected pain point, or Creative Safety below.",
    "CREATIVE SAFETY (these ALWAYS override the directive on any conflict):",
    "- Never lie; never invent numbers, names, results, quotes or testimonials.",
    "- Never produce a forbidden_claim and never describe the product as anything in product_is_not.",
    "- No shock without genuine relevance to the topic; no clickbait the content does not pay off.",
    "- Humor must never mock the customer or devalue the product; the actual fix stays serious.",
    "- Contrarian/controversial takes attack ideas or habits only — never a person or a protected group.",
    "- The voice persona changes wording, rhythm and energy ONLY; it must not alter any fact, proof, or the MODE's thinking model.",
  ].join("\n");
}

/** Opening Impact guidance: mode opening beat + hook archetype. */
export function buildSoftOpeningDirectiveBlock(
  directives: CreativeDirectives,
): string {
  const { mode, hook } = directives;
  const openingBeat = mode.narrativeBeats[0] ?? "hook";
  return [
    "OPENING DIRECTIVE (THINKING MODEL for the cold open — never invent product facts):",
    `- MODE: ${mode.name} — the opening must already think like a ${mode.name} piece (first beat: "${openingBeat}").`,
    `  HOW TO THINK: ${mode.thinking}`,
    `- A ${mode.name} open is recognizable by its logic (e.g. Story drops into a scene; Myth names a belief; Comparison starts a contrast; FAQ states a question; Mistake names the wrong move) — not by synonyms.`,
    `- Hook archetype ${hook.id}: ${hook.instruction}`,
    `- FORM (do not copy): ${hook.exampleForm}`,
    `- Avoid: ${hook.forbidGeneric}`,
    "- Vary the opening form vs recent hooks in memory WHILE staying inside this mode's thinking (different structure within the mode, not a different mode).",
    "- Ignore this preference only if it conflicts with product truth or the selected pain point.",
  ].join("\n");
}

// Renders the CREATIVE DIRECTIVE prompt block (creative guidance + safety
// rules). The safety rules are part of the block so they always travel with the
// directive and override it on any conflict.
export function buildCreativeDirectiveBlock(
  directives: CreativeDirectives,
): string {
  return buildSoftCreativeDirectiveBlock(directives);
}
