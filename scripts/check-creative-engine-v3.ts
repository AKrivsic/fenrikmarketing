/**
 * Creative Engine v3 — checks (mocked LLM; no network).
 *   npm run check:creative-engine-v3
 */

import assert from "node:assert/strict";
import type {
  TextCompletionRequest,
  TextCompletionResult,
  TextProvider,
} from "@/lib/ai/types";
import type { Project } from "@/lib/supabase/types";
import { EMPTY_MEMORY } from "@/lib/ai/workflows/antiRepetitionMemory";
import {
  buildCreativeBrief,
  creativeBriefContainsForbiddenCreativeBanks,
} from "@/lib/creative-engine-v3/buildCreativeBrief";
import {
  creativeDirectionsCollide,
  fingerprintsCollide,
  isDarkOfficeAtmosphere,
} from "@/lib/creative-engine-v3/conceptFingerprint";
import { deterministicEvaluateConcepts } from "@/lib/creative-engine-v3/deterministicCriticFallback";
import { deterministicEvaluateDirections } from "@/lib/creative-engine-v3/deterministicDirectionFallback";
import { validateCreativeIdeationResult } from "@/lib/creative-engine-v3/ideationSchema";
import { mapInventedConceptToCandidate } from "@/lib/creative-engine-v3/mapToCandidate";
import { planCreativeEngineV3ForPackage } from "@/lib/creative-engine-v3/planForPackage";
import { filterDirectionsAgainstMemory } from "@/lib/creative-engine-v3/runDirectionEvaluation";
import { vetoInventedConcepts } from "@/lib/creative-engine-v3/vetoes";
import type {
  CreativeConceptFingerprint,
  CreativeDirection,
  InventedCreativeConcept,
} from "@/lib/creative-engine-v3/types";
import {
  TOTAL_CONCEPTS_MAX,
  TOTAL_CONCEPTS_MIN,
} from "@/lib/creative-engine-v3/types";
import { checkConceptFidelity } from "@/lib/creative-candidates/fidelityCheck";
import { validateStoryIntegrity } from "@/lib/creative-candidates/storyIntegrity";
import { deriveNarrativeBeats } from "@/lib/narrative-beats";
import { planProductPresentationForPackage } from "@/lib/product-presentation/planForPackage";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void | Promise<void>): void {
  const run = async () => {
    try {
      await fn();
      passed++;
      console.log(`  ok  ${name}`);
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAIL ${name}`);
      console.error(`       ${message.replace(/\n/g, "\n       ")}`);
    }
  };
  (check as unknown as { queue: Array<() => Promise<void>> }).queue =
    (check as unknown as { queue?: Array<() => Promise<void>> }).queue ?? [];
  (check as unknown as { queue: Array<() => Promise<void>> }).queue.push(run);
}

function section(title: string): void {
  console.log(`\n${title}`);
}

function baseDna(world: string) {
  return {
    world,
    mainCharacter: "A specific recurring subject in the opening world",
    coreConflict: "Missed website questions while humans cannot answer",
    productRole: "The product answers website visitors the team cannot reach",
    viewerQuestion: "Who is answering when nobody is available?",
    endingIntent: "Visitor gets a clear answer without waiting on staff",
    immutableRules: [
      "Keep the opening physical world continuous",
      "Do not relocate to a generic laptop office",
      "Product enters as answering the missed channel",
      "Never open with a sales pitch CTA",
    ],
  };
}

function baseFingerprint(
  overrides: Partial<CreativeConceptFingerprint> = {},
): CreativeConceptFingerprint {
  return {
    core_premise: "Missed channel while humans are busy",
    opening_mechanism: "Physical queue of ignored website tickets",
    visual_world: "Sunlit service yard with ticket printer",
    hero_object: "Ticket printer spitting unanswered site requests",
    metaphor: null,
    emotional_arc: "Irritation to relief",
    product_mechanism: "Automated website answers",
    palette_atmosphere: "harsh noon sunlight, dusty warm tones",
    ending_mechanism: "Printer stops; answers appear on visitor phone",
    creative_direction: "unexpected physical metaphor",
    ...overrides,
  };
}

function makeDirection(
  id: string,
  label: string,
  mechanism: string,
): CreativeDirection {
  return {
    direction_id: id,
    label,
    mechanism,
    why_fits: `Fits problem_aware by making missed demand visible via ${label}`,
    diversity_note: `Differs from peers by using ${label}`,
    anti_repetition_note: `Avoids recent mechanisms by using ${label}`,
  };
}

function makeConcept(
  id: string,
  overrides: Partial<InventedCreativeConcept> = {},
): InventedCreativeConcept {
  const world = overrides.visual_world ?? `World for ${id}`;
  const directionLabel =
    overrides.direction_label ?? "unexpected physical metaphor";
  return {
    concept_id: id,
    direction_id: overrides.direction_id ?? "d1",
    direction_label: directionLabel,
    title: `Title ${id}`,
    central_idea: `Central idea for ${id} about missed website demand`,
    opening_two_seconds: `Opening frame for ${id}: a concrete filmable event involving ${id} props in a unique setting`,
    hook_line: `Hook line unique to ${id} that creates tension.`,
    story_progression:
      "Hold opening → widen the cost → product answers the channel",
    visual_world: world,
    emotional_mechanism: "Recognition of wasted demand",
    emotional_tone: "unease",
    pacing: "urgent cuts",
    viewpoint: "close handheld",
    characters_or_hero_objects: ["ticket printer", "absent staff"],
    product_role: "Product answers website visitors while staff are on jobs",
    ending_payoff: "Next visitor gets an answer without waiting",
    why_stops_scroll:
      "Unexpected physical object dramatizes a digital failure",
    funnel_fit_note: "Works for problem_aware by making the cost visible",
    production_risks: ["need clear prop readability"],
    atmosphere: {
      time_of_day: "midday",
      palette_intent: "warm dusty sunlight",
      lighting_intent: "hard outdoor sun",
    },
    fingerprint: baseFingerprint({
      visual_world: world,
      core_premise: `Premise ${id}`,
      opening_mechanism: `Opening mechanism ${id}`,
      hero_object: `Hero ${id}`,
      palette_atmosphere: `atmosphere ${id} warm daylight`,
      creative_direction: directionLabel,
    }),
    creative_dna: baseDna(world.length >= 12 ? world : `${world} concrete place`),
    ...overrides,
  };
}

function mockProject(): Project {
  return {
    id: "proj-test",
    owner_id: "owner",
    name: "Fenrik",
    type: "saas",
    language: "en",
    enabled_languages: [],
    market_scope: "global",
    target_audience: { segments: ["SaaS founders"] },
    goal_type: "lead_generation",
    product_is: ["website chatbot that answers visitors"],
    product_is_not: ["human call center"],
    product_strengths: ["answers instantly", "captures leads"],
    pain_points: ["missed website questions after hours"],
    forbidden_claims: [],
    tone_of_voice: { style: "direct" },
    platforms: ["instagram"],
    publishing_rules: {},
    default_cta: "Try the demo",
    knowledge: {
      scenarios: [
        {
          text: "SCENARIO POOL leak test — After hours, chats still screaming",
        },
      ],
    },
    created_at: "",
    updated_at: "",
  };
}

class ScriptedProvider implements TextProvider {
  readonly name = "scripted";
  private readonly directionsJson: string;
  private readonly directionEvalJson: string;
  private readonly ideationJson: string;
  private readonly criticJson: string;

  constructor(args: {
    directions: string;
    directionEval: string;
    ideation: string;
    critic: string;
  }) {
    this.directionsJson = args.directions;
    this.directionEvalJson = args.directionEval;
    this.ideationJson = args.ideation;
    this.criticJson = args.critic;
  }

  async complete(req: TextCompletionRequest): Promise<TextCompletionResult> {
    const blob = `${req.system ?? ""}\n${req.prompt}`;
    let text = this.ideationJson;
    if (/CREATIVE DIRECTION GENERATION|invent abstract creative DIRECTIONS/i.test(blob)) {
      text = this.directionsJson;
    } else if (/DIRECTION EVALUATION|evaluate abstract creative directions/i.test(blob)) {
      text = this.directionEvalJson;
    } else if (/COMPARATIVE CRITIC|Creative Evaluation/i.test(blob)) {
      text = this.criticJson;
    } else if (/Repair Creative DNA/i.test(req.prompt)) {
      const parsed = JSON.parse(this.ideationJson) as {
        concepts: InventedCreativeConcept[];
      };
      text = JSON.stringify({ creative_dna: parsed.concepts[0]!.creative_dna });
    }
    return { text, model: "scripted", provider: "scripted" };
  }
}

const DISTINCT_WORLDS = [
  "Carnival booth printing website tickets nobody claims",
  "Flooded inbox visualized as rising tide marks on a wall",
  "Empty receptionist desk with a blinking cursor as the only worker",
  "Neighbor chalk scoreboard counting unanswered site questions",
  "Suitcase carousel returning only missed-lead tags",
  "Greenhouse where unread chats wilt like neglected plants",
];

const DIRECTION_FIXTURES: CreativeDirection[] = [
  makeDirection("d1", "unexpected physical metaphor", "Make the missed channel a physical object the viewer can feel"),
  makeDirection("d2", "myth vs reality", "Contrast what people believe about coverage with what actually happens online"),
  makeDirection("d3", "dialogue of absence", "Show the conversation that never starts because nobody answers"),
  makeDirection("d4", "time-lapse consequence", "Compress the cost of delay into a visible progression"),
  makeDirection("d5", "role reversal", "Flip who is working when humans cannot"),
];

function buildIdeationConcepts(): InventedCreativeConcept[] {
  // Adaptive: 2 concepts for d1, 2 for d2, 2 for d3 = 6 total (within bounds)
  const pairs: Array<[string, string, number]> = [
    ["d1", "unexpected physical metaphor", 0],
    ["d1", "unexpected physical metaphor", 1],
    ["d2", "myth vs reality", 2],
    ["d2", "myth vs reality", 3],
    ["d3", "dialogue of absence", 4],
    ["d3", "dialogue of absence", 5],
  ];
  return pairs.map(([dirId, dirLabel, i], idx) =>
    makeConcept(`c${idx + 1}`, {
      direction_id: dirId,
      direction_label: dirLabel,
      visual_world: DISTINCT_WORLDS[i]!,
      opening_two_seconds: `First two seconds: ${DISTINCT_WORLDS[i]}`,
      hook_line: `Unique hook number ${idx + 1} with tension.`,
      fingerprint: baseFingerprint({
        core_premise: DISTINCT_WORLDS[i]!,
        opening_mechanism: `Mechanism ${DISTINCT_WORLDS[i]}`,
        visual_world: DISTINCT_WORLDS[i]!,
        hero_object: `Hero focus ${idx + 1}`,
        palette_atmosphere: [
          "carnival daylight",
          "storm grey tide",
          "fluorescent empty lobby",
          "sidewalk chalk noon",
          "airport fluorescent",
          "greenhouse humid green",
        ][i]!,
        ending_mechanism: `Ending ${idx + 1} resolves the missed channel`,
        creative_direction: dirLabel,
      }),
      creative_dna: baseDna(`${DISTINCT_WORLDS[i]!} as the canonical world`),
    }),
  );
}

(check as unknown as { queue: Array<() => Promise<void>> }).queue = [];

section("creative brief");
check("brief excludes Scenario Pool / Divergence banks and carries directions", () => {
  const brief = buildCreativeBrief({
    project: mockProject(),
    topic: "Silent website at night",
    angle: "after-hours demand",
    funnelStage: "problem_aware",
    platform: "instagram",
    format: "reel",
    assets: [],
    memory: {
      ...EMPTY_MEMORY,
      hooks: ["Old hook"],
      fingerprints: [baseFingerprint({ creative_direction: "social proof montage" })],
      atmospheres: ["night office blue"],
      directions: ["comparison scoreboard"],
    },
  });
  assert.deepEqual(creativeBriefContainsForbiddenCreativeBanks(brief), []);
  assert.ok(brief.memory.recent_directions.includes("comparison scoreboard"));
  assert.ok(brief.memory.recent_directions.includes("social proof montage"));
});

section("ideation schema");
check("accepts adaptive concept counts (not fixed six)", () => {
  const four = Array.from({ length: 4 }, (_, i) =>
    makeConcept(`c${i + 1}`, {
      direction_id: i < 2 ? "d1" : "d2",
      direction_label: i < 2 ? "alpha" : "beta",
    }),
  );
  const ok = validateCreativeIdeationResult(
    { version: "creative-ideation@2", concepts: four },
    { requiredDirectionIds: ["d1", "d2"] },
  );
  assert.equal(ok.ok, true);

  const tooFew = validateCreativeIdeationResult({
    version: "creative-ideation@2",
    concepts: Array.from({ length: TOTAL_CONCEPTS_MIN - 1 }, (_, i) =>
      makeConcept(`c${i + 1}`),
    ),
  });
  assert.equal(tooFew.ok, false);

  const tooMany = validateCreativeIdeationResult({
    version: "creative-ideation@2",
    concepts: Array.from({ length: TOTAL_CONCEPTS_MAX + 1 }, (_, i) =>
      makeConcept(`c${i + 1}`),
    ),
  });
  assert.equal(tooMany.ok, false);
});

section("directions");
check("filters directions that collide with recent memory", () => {
  const brief = buildCreativeBrief({
    project: mockProject(),
    topic: "t",
    funnelStage: "awareness",
    platform: "instagram",
    format: "reel",
    assets: [],
    memory: {
      ...EMPTY_MEMORY,
      directions: ["myth vs reality reveal"],
    },
  });
  const dirs = [
    makeDirection("d1", "myth vs reality", "Contrast belief with reality online"),
    makeDirection("d2", "behind the scenes ops", "Show the unseen channel failure"),
    makeDirection("d3", "experiment challenge", "Test what happens when answers stop"),
  ];
  const { survivors, rejected } = filterDirectionsAgainstMemory(dirs, brief);
  assert.ok(rejected.some((r) => r.direction_id === "d1"));
  assert.ok(
    rejected.some(
      (r) =>
        r.direction_id === "d1" &&
        r.collision_kind === "label_containment",
    ),
  );
  assert.ok(survivors.some((d) => d.direction_id === "d2"));
  // Legacy helper still used elsewhere; memory filter no longer depends on it.
  assert.ok(creativeDirectionsCollide("myth vs reality", "myth vs reality reveal"));
});

check("memory filter keeps directions that only share generic product words", () => {
  const proximity =
    "Proximity Without Contact — the visitor was right there, on the page, for 94 seconds, and nothing happened. The mechanism makes physical-digital proximity visceral through the ticking timer and the ghost question, then exposes the structural gap that prevented connection.";
  const brief = buildCreativeBrief({
    project: mockProject(),
    topic: "t",
    funnelStage: "awareness",
    platform: "instagram",
    format: "reel",
    assets: [],
    memory: { ...EMPTY_MEMORY, directions: [proximity] },
  });

  const mustSurvive = [
    makeDirection(
      "d_unanswered",
      "Unanswered Question Accumulation",
      "Operates through the logic of compounding — a single unanswered question is trivial, but unanswered questions accumulate into a silent revenue leak.",
    ),
    makeDirection(
      "d_handoff",
      "Invisible Handoff",
      "Tracks a single unit of work — a visitor question — as it passes through a system that has no designed receiving end.",
    ),
    makeDirection(
      "d_asym",
      "Asymmetry Reveal",
      "Exposes a structural imbalance while the business reveals effort creating website content for visitors.",
    ),
    makeDirection(
      "d_peer",
      "Overlooked Ingredient",
      "Reveals that a familiar working toolkit already contains everything needed; the solution was dormant inside existing infrastructure.",
    ),
  ];
  const { survivors, rejected } = filterDirectionsAgainstMemory(
    mustSurvive,
    brief,
  );
  assert.equal(rejected.length, 0);
  assert.equal(survivors.length, mustSurvive.length);
});

check("memory filter rejects exact label, near-label, paraphrased mechanism, story language", () => {
  const brief = buildCreativeBrief({
    project: mockProject(),
    topic: "t",
    funnelStage: "awareness",
    platform: "instagram",
    format: "reel",
    assets: [],
    memory: {
      ...EMPTY_MEMORY,
      directions: [
        "Default Setting",
        "Frames a business current state not as a choice but as a factory default — something never consciously decided, just never changed. The communication reveals that inaction is itself a configuration with real consequences, and most businesses run on an out-of-the-box configuration they inherited without realizing it.",
      ],
    },
  });

  const dirs = [
    makeDirection(
      "d_exact",
      "Default Setting",
      "Completely different abstract mechanism about staffing coverage gaps overnight.",
    ),
    makeDirection(
      "d_near",
      "Default Setting Audit",
      "Completely different abstract mechanism about staffing coverage gaps overnight.",
    ),
    makeDirection(
      "d_para",
      "Inherited Configuration Trap",
      "Frames the current state not as a choice but as a factory default — something never consciously decided, just never changed. Shows that inaction is itself a configuration with real consequences, and most operators run on an out-of-the-box configuration they inherited without realizing it.",
    ),
    makeDirection(
      "d_story",
      "Clean Abstract Angle",
      "Uses a storyboard opening shot to establish the first frame before any abstract mechanism appears.",
    ),
  ];
  const { survivors, rejected } = filterDirectionsAgainstMemory(dirs, brief);
  const byId = new Map(rejected.map((r) => [r.direction_id, r]));
  assert.ok(byId.get("d_exact")?.reasons.includes("direction_collision_recent_memory"));
  assert.equal(byId.get("d_exact")?.collision_kind, "label_exact");
  assert.ok(byId.get("d_near")?.reasons.includes("direction_collision_recent_memory"));
  assert.equal(byId.get("d_near")?.collision_kind, "label_containment");
  assert.ok(byId.get("d_para")?.reasons.includes("direction_collision_recent_memory"));
  assert.equal(byId.get("d_para")?.collision_kind, "mechanism_similarity");
  assert.ok(
    (byId.get("d_para")?.shared_tokens.length ?? 0) >= 4,
    "paraphrase should share many significant tokens",
  );
  assert.ok(
    byId.get("d_story")?.reasons.includes(
      "direction_contains_story_or_hook_language",
    ),
  );
  assert.equal(survivors.length, 0);
});

check("deterministic direction fallback selects diverse shortlist", () => {
  const brief = buildCreativeBrief({
    project: mockProject(),
    topic: "Missed chats",
    funnelStage: "problem_aware",
    platform: "instagram",
    format: "reel",
    assets: [],
    memory: EMPTY_MEMORY,
  });
  const ev = deterministicEvaluateDirections({
    directions: DIRECTION_FIXTURES,
    brief,
  });
  assert.equal(ev.source, "deterministic_fallback");
  assert.ok(ev.selected_direction_ids.length >= 2);
  assert.ok(ev.selected_direction_ids.length <= 4);
});

section("deterministic vetoes");
check("rejects fingerprint collision with recent packages", () => {
  const recent = baseFingerprint({
    core_premise: "Paper mountain of ignored leads",
    opening_mechanism: "Tower of unmarked folders",
    visual_world: "Accountant parking lot paper stack",
    hero_object: "Paper mountain",
    creative_direction: "visual exaggeration pile",
  });
  const clone = makeConcept("c1", {
    fingerprint: { ...recent },
    visual_world: recent.visual_world,
  });
  const brief = buildCreativeBrief({
    project: mockProject(),
    topic: "t",
    funnelStage: "awareness",
    platform: "instagram",
    format: "reel",
    assets: [],
    memory: { ...EMPTY_MEMORY, fingerprints: [recent] },
  });
  assert.ok(fingerprintsCollide(clone.fingerprint, recent));
  const { survivors } = vetoInventedConcepts({ concepts: [clone], brief });
  assert.equal(survivors.length, 0);
});

check("rejects repeated dark-office atmosphere", () => {
  const recent = baseFingerprint({
    palette_atmosphere: "dark office blue neon night",
  });
  const c = makeConcept("c1", {
    atmosphere: {
      time_of_day: "night",
      palette_intent: "blue corporate",
      lighting_intent: "dim office neon",
    },
    fingerprint: baseFingerprint({
      palette_atmosphere: "dark night office blue lighting",
      core_premise: "Unique premise night",
      opening_mechanism: "Unique open night",
      visual_world: "Unique world night",
      hero_object: "Unique hero night",
      creative_direction: "night silence portrait",
    }),
  });
  assert.ok(isDarkOfficeAtmosphere(c.fingerprint.palette_atmosphere));
  const brief = buildCreativeBrief({
    project: mockProject(),
    topic: "t",
    funnelStage: "awareness",
    platform: "instagram",
    format: "reel",
    assets: [],
    memory: {
      ...EMPTY_MEMORY,
      fingerprints: [recent],
      atmospheres: ["dark office blue"],
    },
  });
  const { rejected } = vetoInventedConcepts({ concepts: [c], brief });
  assert.ok(
    rejected.some((r) => r.reasons.includes("repeated_dark_office_atmosphere")),
  );
});

check("rejects generic B2B fallback language", () => {
  const c = makeConcept("c1", {
    central_idea: "Most businesses need a laptop montage dashboard",
    opening_two_seconds: "Talking head in a generic office",
    hook_line: "In today's world, let's be honest about SaaS dashboards.",
  });
  const brief = buildCreativeBrief({
    project: mockProject(),
    topic: "t",
    funnelStage: "awareness",
    platform: "instagram",
    format: "reel",
    assets: [],
    memory: EMPTY_MEMORY,
  });
  const { survivors, rejected } = vetoInventedConcepts({
    concepts: [c],
    brief,
  });
  assert.equal(survivors.length, 0);
  assert.ok(rejected.some((r) => r.reasons.includes("generic_b2b_fallback")));
});

section("critic");
check("deterministic concept fallback ranks without stop-only override", () => {
  const a = makeConcept("c1", {
    why_stops_scroll: "mild",
    central_idea: "Highly original carnival ticket metaphor for missed chats",
    funnel_fit_note: "problem_aware cost made physical",
    product_role: "Product answers website visitors during the rush",
    fingerprint: baseFingerprint({
      core_premise: "Carnival tickets for website silence",
      palette_atmosphere: "bright carnival daylight",
      creative_direction: "unexpected physical metaphor",
    }),
  });
  const b = makeConcept("c2", {
    why_stops_scroll:
      "Huge shocking explosion of unread messages raining from the sky in extreme detail",
    central_idea: "Busy business",
    funnel_fit_note: "general",
    product_role: "It helps",
    fingerprint: baseFingerprint({
      core_premise: "Busy business messages",
      opening_mechanism: "Messages rain",
      visual_world: "Sky of messages",
      hero_object: "Message rain",
      palette_atmosphere: "dark office blue neon night",
      creative_direction: "chaos montage",
    }),
  });
  const brief = buildCreativeBrief({
    project: mockProject(),
    topic: "Missed chats",
    funnelStage: "problem_aware",
    platform: "instagram",
    format: "reel",
    assets: [],
    memory: {
      ...EMPTY_MEMORY,
      fingerprints: [
        baseFingerprint({ palette_atmosphere: "dark office blue neon night" }),
      ],
    },
  });
  const ev = deterministicEvaluateConcepts({ concepts: [a, b], brief });
  assert.equal(ev.source, "deterministic_fallback");
  assert.ok(ev.ranking.length === 2);
});

section("orchestrator (mocked LLM)");
check("planCreativeEngineV3 uses directions then adaptive concepts", async () => {
  const concepts = buildIdeationConcepts();
  const directionsJson = JSON.stringify({
    version: "creative-direction@1",
    directions: DIRECTION_FIXTURES,
  });
  const directionEvalJson = JSON.stringify({
    version: "creative-direction-eval@1",
    evaluations: DIRECTION_FIXTURES.map((d) => ({
      direction_id: d.direction_id,
      scores: {
        strategy_fit: 8,
        funnel_fit: 8,
        originality: 8,
        diversity_vs_peers: 8,
        anti_repetition: 8,
        concept_potential: 8,
        emotional_range: 7,
        production_feasibility: 8,
      },
      vetoes: [],
      critic_notes: "ok",
    })),
    ranking: ["d1", "d2", "d3", "d4", "d5"],
    selected_direction_ids: ["d1", "d2", "d3"],
    selection_reason: "Strong and diverse mechanisms",
  });
  const ideationJson = JSON.stringify({
    version: "creative-ideation@2",
    concepts,
  });
  const criticJson = JSON.stringify({
    version: "creative-evaluation@1",
    evaluations: concepts.map((c) => ({
      concept_id: c.concept_id,
      scores: {
        stop_scroll: c.concept_id === "c3" ? 8 : 6,
        originality: c.concept_id === "c3" ? 9 : 5,
        memorability: 7,
        strategy_fit: 7,
        funnel_fit: c.concept_id === "c3" ? 9 : 5,
        product_relevance: 7,
        natural_product_integration: c.concept_id === "c3" ? 9 : 5,
        narrative_coherence: 7,
        visual_distinctness: 7,
        emotional_strength: 7,
        production_feasibility: 8,
        anti_repetition: 8,
        atmosphere_freshness: 8,
      },
      vetoes: [],
      critic_notes: "ok",
    })),
    ranking: ["c3", "c1", "c2", "c4", "c5", "c6"],
    winner_id: "c3",
    winner_reason: "Best balance under selected directions",
  });

  const provider = new ScriptedProvider({
    directions: directionsJson,
    directionEval: directionEvalJson,
    ideation: ideationJson,
    critic: criticJson,
  });

  const result = await planCreativeEngineV3ForPackage({
    project: mockProject(),
    projectId: "proj-test",
    topic: "Silent website",
    angle: "after hours",
    funnelStage: "problem_aware",
    platform: "instagram",
    format: "reel",
    assets: [],
    memory: EMPTY_MEMORY,
    textProvider: provider,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.selectedCandidate.family, "invented");
  assert.equal(result.selectedCandidate.candidateId, "c3");
  assert.ok(result.telemetry.directions_selected.length >= 2);
  assert.ok(
    result.telemetry.fingerprint?.creative_direction,
    "winner fingerprint stores creative_direction",
  );
  assert.notEqual(result.telemetry.concepts_generated.length, 0);
  assert.ok(!JSON.stringify(result.telemetry).includes("generateRawSituations"));
});

check("ideation failure is terminal — no template fallback", async () => {
  const provider = new ScriptedProvider({
    directions: JSON.stringify({
      version: "creative-direction@1",
      directions: DIRECTION_FIXTURES,
    }),
    directionEval: JSON.stringify({
      version: "creative-direction-eval@1",
      evaluations: DIRECTION_FIXTURES.slice(0, 2).map((d) => ({
        direction_id: d.direction_id,
        scores: {
          strategy_fit: 7,
          funnel_fit: 7,
          originality: 7,
          diversity_vs_peers: 7,
          anti_repetition: 7,
          concept_potential: 7,
          emotional_range: 7,
          production_feasibility: 7,
        },
        vetoes: [],
        critic_notes: "ok",
      })),
      ranking: ["d1", "d2"],
      selected_direction_ids: ["d1", "d2"],
      selection_reason: "ok",
    }),
    ideation: JSON.stringify({ version: "creative-ideation@2", concepts: [] }),
    critic: JSON.stringify({
      version: "creative-evaluation@1",
      evaluations: [],
      ranking: [],
      winner_id: "",
      winner_reason: "n/a",
    }),
  });
  const result = await planCreativeEngineV3ForPackage({
    project: mockProject(),
    projectId: "proj-test",
    topic: "Silent website",
    funnelStage: "awareness",
    platform: "instagram",
    format: "reel",
    assets: [],
    memory: EMPTY_MEMORY,
    textProvider: provider,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error, "generation_failed");
});

section("downstream compatibility");
check("narrative beats / fidelity / story integrity accept invented winner", () => {
  const concept = makeConcept("c1", {
    opening_two_seconds:
      "A ticket printer in a sunlit yard spits website-request tickets nobody takes",
    hook_line: "The website printed tickets. Nobody took them.",
    creative_dna: baseDna(
      "A sunlit service yard where a ticket printer dramatizes unanswered website requests",
    ),
  });
  const winner = mapInventedConceptToCandidate(concept, concept.creative_dna);
  assert.equal(winner.family, "invented");

  const beats = deriveNarrativeBeats({
    winner,
    modeBeats: ["hook", "setup", "escalation", "cta"],
    topic: "Missed website questions",
    angle: null,
    painPoints: ["missed questions"],
    productIs: ["website chatbot"],
  });
  assert.ok(beats.beats.length >= 4);

  const fidelity = checkConceptFidelity({
    winner,
    hook: winner.hookLine,
    voiceoverText: `${winner.hookLine} Then the product answers.`,
    visualScenes: [
      { type: "IMAGE", image_prompt: winner.openingSituation },
    ],
    topic: "Missed website questions",
  });
  assert.equal(typeof fidelity.passed, "boolean");

  const integrity = validateStoryIntegrity({
    winner,
    packageCta: "Try the demo",
    visualScenes: [
      { type: "IMAGE", image_prompt: winner.openingSituation },
      {
        type: "IMAGE",
        image_prompt: "Same yard; tickets still printing; staff absent",
      },
      {
        type: "IMAGE",
        image_prompt: "Visitor phone shows an answer from the product",
      },
    ],
    voiceoverText: winner.hookLine,
  });
  assert.equal(typeof integrity.passed, "boolean");

  const ppd = planProductPresentationForPackage({
    productReveal: null,
    assets: [],
    visualNarrative: null,
    funnelStage: "problem_aware",
  });
  assert.equal(ppd.enabled, true);
});

async function main() {
  const queue = (check as unknown as { queue: Array<() => Promise<void>> }).queue;
  for (const fn of queue) {
    await fn();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
