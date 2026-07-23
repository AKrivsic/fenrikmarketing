/**
 * Phase 2A — Decision Ownership registry (source of truth).
 *
 * This module documents WHO owns each creative decision. It does NOT change
 * runtime behavior, prompts, schemas, validators, or repair.
 *
 * Authority rule: structured field + deterministic enforce/validate >
 * prompt prose. Contenders listed under `activeContenders` are still present
 * in production (Phase 2A does not remove them) but are NOT the owner.
 *
 * Universality: owners must not hardcode industry defaults. Domain facts come
 * from Product Brain / Strategy / Candidate / DNA / Asset Intelligence.
 */

export type ConflictClass = "none" | "safe" | "shared" | "dangerous";

export type DecisionId =
  | "product_grounding"
  | "hook"
  | "opening"
  | "story_structure"
  | "emotional_arc"
  | "voice_emotion"
  | "voice_persona"
  | "visual_identity"
  | "character_consistency"
  | "asset_policy"
  | "camera_style"
  | "scene_order"
  | "scene_diversity"
  | "cta"
  | "safety"
  | "platform_adaptation"
  | "json_schema";

export interface DecisionOwnershipRecord {
  decision: DecisionId;
  label: string;
  /** Exactly one authoritative owner for this decision. */
  owner: string;
  /** Primary module / symbol that creates or enforces the owned value. */
  ownerModule: string;
  readers: readonly string[];
  /** Modules that must not invent or override this decision. */
  illegalWriters: readonly string[];
  conflict: ConflictClass;
  conflictNotes: string;
  /**
   * Still present in production, may instruct the model, but are NOT owners.
   * Required when conflict === "dangerous" (or documented dual signals).
   */
  activeContenders: readonly string[];
  /** Future Typed Decision Pack name (Phase 2B+). */
  migrationTarget: string;
}

/**
 * Canonical ownership map. Tests assert: one owner per decision, registry
 * completeness, and that dangerous conflicts stay explicitly documented.
 */
export const DECISION_OWNERSHIP: readonly DecisionOwnershipRecord[] = [
  {
    decision: "product_grounding",
    label: "Product Grounding",
    owner: "Product Brain + project constraints",
    ownerModule: "lib/ai/prompts/context.ts",
    readers: ["Presentation PROJECT BRAIN / HARD CONSTRAINTS", "TypedPack.ProductGrounding"],
    illegalWriters: [
      "Presentation inventing product facts",
      "Repair inventing product_is / strengths",
      "Industry default templates",
    ],
    conflict: "none",
    conflictNotes: "Domain facts are runtime-only; never hardcoded vertical defaults.",
    activeContenders: [],
    migrationTarget: "TypedPack.ProductGrounding",
  },
  {
    decision: "hook",
    label: "Hook",
    owner: "Winner Candidate hookLine + enforceCandidateHook",
    ownerModule: "lib/creative-candidates/enforceCandidateHook.ts",
    readers: [
      "Presentation prompt (Candidate block + OPENING HOOK bridge)",
      "Repair / fidelity (hook preserved)",
      "Narrative Beats (HOOK beat)",
      "Anti-repetition memory",
    ],
    illegalWriters: [
      "Attention Delivery (must not invent a replacement hook)",
      "Opening Priority Resolver (must amplify, not replace)",
      "Repair appendices (must not soft-rewrite away from hookLine)",
      "Creative Directive HOOK ARCHETYPE when a winner exists",
    ],
    conflict: "safe",
    conflictNotes:
      "HOOK ARCHETYPE remains as fallback when no Candidate; loses to hookLine when present. Legacy Hook V2 removed in Phase 1.",
    activeContenders: ["Creative Directive HOOK ARCHETYPE (fallback only)"],
    migrationTarget: "TypedPack.Hook",
  },
  {
    decision: "opening",
    label: "Opening",
    owner: "Winner Candidate openingSituation (+ Creative DNA world)",
    ownerModule: "lib/creative-candidates/promptBlocks.ts",
    readers: [
      "Presentation VISUAL BEATS / Opening Priority Resolver (as reader)",
      "Concept fidelity / story integrity",
      "Narrative Beats HOOK comprehension",
      "Creative Identity (neutralize environment to DNA world)",
    ],
    illegalWriters: [
      "Attention originality / Opening Contract (persisted, not prompt-authoritative)",
      "Creative Identity environment (must not relocate)",
      "Repair (must not replace openingSituation with safer montage)",
      "Visual Narrative (clarify meaning; do not swap event)",
    ],
    conflict: "safe",
    conflictNotes:
      "Attention still computes originality/opening for persistence/TTS motion; Phase 1 removed those from Presentation prompt. Identity environment neutralized when DNA present.",
    activeContenders: [
      "Attention originality.selected_visual_concept (persisted only)",
      "Opening Priority Resolver (meta-order reader, not owner)",
    ],
    migrationTarget: "TypedPack.Opening",
  },
  {
    decision: "story_structure",
    label: "Story Structure",
    owner: "MODE BEATS (CreativeDirectives.mode.narrativeBeats)",
    ownerModule: "lib/ai/prompts/creativeDirectives.ts",
    readers: [
      "Presentation prompt (ATTENTION FIRST, VISUAL BEATS)",
      "Storyboard role arc (buildStoryboard modeBeats)",
      "Video job creative_mode_beats",
      "Narrative Beats (Candidate-derived labels mapped onto MODE BEATS)",
      "TypedPack.StoryStructure",
    ],
    illegalWriters: [
      "Preferred Story Arc (must not become a second owner)",
      "Narrative Beats Required arc prose (must not become a second owner)",
      "Repair (must not invent a new beat grammar)",
    ],
    conflict: "none",
    conflictNotes:
      "C1 resolved in Phase 2B: StoryStructurePack is sourced only from MODE BEATS. Preferred Arc is suppressed from Presentation. Narrative Beats remain Candidate-derived comprehension labels aligned to MODE BEATS — not a competing required arc.",
    activeContenders: [],
    migrationTarget: "TypedPack.StoryStructure",
  },
  {
    decision: "emotional_arc",
    label: "Emotional Arc",
    owner: "Winner Candidate emotionalReaction (from concept emotional fields)",
    ownerModule: "lib/creative-engine-v3/mapToCandidate.ts",
    readers: [
      "Candidate prompt block",
      "Narrative Beats SETUP comprehension",
      "Series fingerprints / anti-repetition (emotional_arc fingerprint)",
    ],
    illegalWriters: [
      "Attention opening_emotional_effect (must not replace candidate emotion)",
      "Repair (must not flatten emotionalReaction)",
    ],
    conflict: "shared",
    conflictNotes:
      "Fingerprint emotional_arc and Attention opening_emotional_effect are parallel channels; story emotion authority is Candidate emotionalReaction.",
    activeContenders: [
      "Attention opening_emotional_effect",
      "Concept fingerprint emotional_arc",
    ],
    migrationTarget: "TypedPack.EmotionalArc",
  },
  {
    decision: "voice_emotion",
    label: "Voice Emotion",
    owner: "Attention delivery_arc",
    ownerModule: "lib/attention/deliveryArc.ts",
    readers: [
      "ATTENTION DELIVERY prompt block",
      "TTS buildVideoTtsDeliveryHints / buildTtsInstructions",
      "video-worker resolveTtsOptionsFromJobInput",
    ],
    illegalWriters: [
      "Creative Directive Voice Persona (copy tone only — not delivery_arc)",
      "Repair (must not rewrite delivery_arc)",
      "Presentation LLM (may write VO wording; must not own TTS delivery phases)",
    ],
    conflict: "shared",
    conflictNotes:
      "TTS merge also reads funnel/mode/visualProfile/narrativeRoles/project tone; delivery_arc fragment is preferred but not exclusive until Typed Packs.",
    activeContenders: [
      "Funnel / mode / visualProfile TTS hint layers",
      "Project tone_of_voice",
    ],
    migrationTarget: "TypedPack.VoiceEmotion",
  },
  {
    decision: "voice_persona",
    label: "Voice Persona",
    owner: "Creative Directive VoicePersona (copy wording/rhythm/energy)",
    ownerModule: "lib/ai/prompts/creativeDirectives.ts",
    readers: ["Presentation CREATIVE DIRECTIVE block"],
    illegalWriters: [
      "Attention delivery_arc (owns spoken delivery phases, not persona catalog)",
      "TTS voice resolver (owns provider voice id — orthogonal decision)",
    ],
    conflict: "shared",
    conflictNotes:
      "Voice Persona (copy) is orthogonal to TTS voice id (resolveVoiceSelection). Do not merge without an explicit Typed Pack.",
    activeContenders: ["resolveTtsOptions / resolveVoiceSelection (TTS voice id)"],
    migrationTarget: "TypedPack.VoicePersona",
  },
  {
    decision: "visual_identity",
    label: "Visual Identity",
    owner:
      "Creative DNA world + immutable rules (concept world); Creative Identity (treatment only)",
    ownerModule: "lib/creative-candidates/creativeDNA.ts",
    readers: [
      "CANONICAL CREATIVE DNA prompt",
      "CREATIVE IDENTITY prompt",
      "Story integrity / DNA package validation",
      "video-worker creative_identity stamp",
    ],
    illegalWriters: [
      "Creative Identity environment when DNA world exists (must neutralize)",
      "Visual Narrative (meaning carrier — must not relocate world)",
      "Repair (must not swap DNA world)",
    ],
    conflict: "shared",
    conflictNotes:
      "Split ownership is intentional: DNA = WHAT/WHERE/WHO world; Identity = lighting/camera/color/composition treatment. C8 environment dual-signal mitigated by neutralize.",
    activeContenders: ["Creative Identity environment (neutralized when DNA present)"],
    migrationTarget: "TypedPack.VisualIdentity",
  },
  {
    decision: "character_consistency",
    label: "Character Consistency",
    owner: "Creative DNA mainCharacter (+ derivePrimaryActor / story integrity)",
    ownerModule: "lib/creative-candidates/creativeDNA.ts",
    readers: [
      "DNA prompt",
      "PRIMARY_ACTOR IDENTITY CONTINUITY (Presentation)",
      "Product demonstration integrity",
      "Story integrity validators / repair appendix",
    ],
    illegalWriters: [
      "Creative Identity human_presence (treatment, not cast swap)",
      "Repair inventing a new face/profession without narrative reason",
      "Attention (must not invent a different primary actor)",
    ],
    conflict: "none",
    conflictNotes: "Validators enforce; Identity must not replace mainCharacter.",
    activeContenders: [],
    migrationTarget: "TypedPack.CharacterConsistency",
  },
  {
    decision: "asset_policy",
    label: "Asset Policy",
    owner:
      "PACKAGE ASSET COVERAGE (resolvePackageAssetCoverage); Funnel Asset Policy fallback",
    ownerModule: "lib/assets/assetCoveragePolicy.ts",
    readers: [
      "Presentation prompt",
      "Package guardrails / asset modification checks",
      "Product Presentation Decision",
    ],
    illegalWriters: [
      "Funnel Asset Policy when Coverage is present (Phase 1 echo ban)",
      "Repair inventing asset_usage ids",
      "Presentation LLM inventing assets not in AVAILABLE ASSETS",
    ],
    conflict: "safe",
    conflictNotes:
      "C3 optional-vs-required is expressed as a single Coverage stance when present. Funnel is fallback-only.",
    activeContenders: ["FUNNEL ASSET POLICY (fallback when no Coverage)"],
    migrationTarget: "TypedPack.AssetPolicy",
  },
  {
    decision: "camera_style",
    label: "Camera Style",
    owner: "Creative Identity camera dimension",
    ownerModule: "lib/creative-identity/resolveCreativeIdentity.ts",
    readers: [
      "CREATIVE IDENTITY prompt / image suffix",
      "video-worker identity",
    ],
    illegalWriters: [
      "Creative DNA (owns world, not camera treatment)",
      "Concept viewpoint text (inspiration folded into visualPromise — not Identity camera)",
      "VISUAL STYLE guardrail module (not injected; not owner)",
    ],
    conflict: "shared",
    conflictNotes:
      "Candidate visualPromise/viewpoint may describe framing in prose; Identity camera is the treatment owner.",
    activeContenders: ["Candidate visualPromise / concept viewpoint"],
    migrationTarget: "TypedPack.CameraStyle",
  },
  {
    decision: "scene_order",
    label: "Scene Order",
    owner: "Package visual_scenes ordered list (LLM) guided by MODE BEATS",
    ownerModule: "lib/ai/prompts/generateContentPackage.ts",
    readers: [
      "prepareVisualScenesForVideo",
      "Storyboard / duration planners",
      "Narrative Beats mapping",
      "Video render",
    ],
    illegalWriters: [
      "Repair inventing a reordered story that abandons winner progression",
      "Typed scene frequency policies that silently reorder narrative meaning",
    ],
    conflict: "shared",
    conflictNotes:
      "MODE BEATS + Narrative Beats guide; final ordered dramaturgy is visual_scenes. Downstream may drop typed scenes but must not invent a new story.",
    activeContenders: [
      "Narrative Beats spine",
      "applyPresentationFrequencyToPackage / typed CTA series policy",
    ],
    migrationTarget: "TypedPack.SceneOrder",
  },
  {
    decision: "scene_diversity",
    label: "Scene Diversity",
    owner:
      "Deterministic progression validators (story/visual/information progression)",
    ownerModule: "lib/narrative-beats/storyProgression.ts",
    readers: [
      "generateContentPackage post-LLM checks",
      "Repair / telemetry diagnostics",
      "VISUAL PROGRESSION prompt (reader guidance)",
    ],
    illegalWriters: [
      "Creative Identity (must not force diversity via treatment changes)",
      "Scene Type Memory prose (removed from prompt; guardrail soft only)",
    ],
    conflict: "shared",
    conflictNotes:
      "Prompt VISUAL PROGRESSION guides; validators own pass/fail. Diversity must stay inside DNA world.",
    activeContenders: ["VISUAL PROGRESSION prompt prose"],
    migrationTarget: "TypedPack.SceneDiversity",
  },
  {
    decision: "cta",
    label: "CTA",
    owner: "Package cta.{type,text} constrained by CTA_TYPES_BY_GOAL + guardrails",
    ownerModule: "lib/ai/guardrails.ts",
    readers: [
      "Presentation prompt (allowed CTA types)",
      "Platform outputs CTAs",
      "alignOnScreenCtaContract / typed CTA scenes",
      "Anti-repetition CTAs",
    ],
    illegalWriters: [
      "Opening meaning block (sales CTA forbidden in opening)",
      "Repair inventing disallowed cta.type",
      "DNA endingIntent (narrative close — not cta.type enum)",
    ],
    conflict: "shared",
    conflictNotes:
      "Narrative endingIntent / MODE BEATS terminal 'cta' / typed CTA scene / platform CTAs are related but distinct layers. Enum + guardrail own package cta.type.",
    activeContenders: [
      "Creative DNA endingIntent",
      "Typed CTA scene composition",
      "project.default_cta (hint only)",
    ],
    migrationTarget: "TypedPack.CTA",
  },
  {
    decision: "safety",
    label: "Safety",
    owner:
      "Deterministic guardrails + Product Brain constraints (forbidden_claims / product_is_not)",
    ownerModule: "lib/ai/guardrails.ts",
    readers: [
      "CREATIVE SAFETY prompt",
      "HARD CONSTRAINTS / projectBrainBlock",
      "runWithRepair",
      "Image moderation fallback",
    ],
    illegalWriters: [
      "Attention First (must stay bound by CREATIVE SAFETY)",
      "Repair that invents metrics or forbidden claims",
      "Any prompt layer that overrides product_is_not",
    ],
    conflict: "shared",
    conflictNotes:
      "C2: Attention First optimizes scroll-stop; Critic / CREATIVE SAFETY bound claims. Intentional tension — safety wins on facts.",
    activeContenders: ["ATTENTION FIRST priorities (intent, not fact authority)"],
    migrationTarget: "TypedPack.Safety",
  },
  {
    decision: "platform_adaptation",
    label: "Platform Adaptation",
    owner: "platform_outputs schema + PLATFORM_STYLE_SPECS + platform-native guardrails",
    ownerModule: "lib/ai/prompts/generateContentPackage.ts",
    readers: [
      "Presentation PLATFORM STYLES block",
      "checkContentPackageGuardrails platform-native checks",
      "Persist / fan-out / localize",
    ],
    illegalWriters: [
      "Shared voiceover pasted into captions",
      "Repair that collapses all platforms to one caption",
    ],
    conflict: "none",
    conflictNotes: "One video, many native captions — MIXED PLATFORMS note is shared context.",
    activeContenders: [],
    migrationTarget: "TypedPack.PlatformAdaptation",
  },
  {
    decision: "json_schema",
    label: "JSON Schema",
    owner: "buildContentPackageSchema / contentPackageSchema",
    ownerModule: "lib/ai/schemas/contentPackage.ts",
    readers: [
      "generateValidatedJson / runWithRepair",
      "Presentation JSON shape (documentary prompt)",
      "Workers (consume validated packages)",
    ],
    illegalWriters: [
      "Prompt JSON example inventing new required fields",
      "Repair inventing schema-incompatible keys",
      "Ad-hoc workflow stamps that replace schema validation",
    ],
    conflict: "safe",
    conflictNotes:
      "Prompt shape must document schema; schema is authoritative. Safe duplication of field names is expected.",
    activeContenders: ["Presentation prompt JSON shape (documentary)"],
    migrationTarget: "TypedPack.JsonSchema",
  },
] as const;

export const REQUIRED_DECISION_IDS: readonly DecisionId[] = [
  "product_grounding",
  "hook",
  "opening",
  "story_structure",
  "emotional_arc",
  "voice_emotion",
  "voice_persona",
  "visual_identity",
  "character_consistency",
  "asset_policy",
  "camera_style",
  "scene_order",
  "scene_diversity",
  "cta",
  "safety",
  "platform_adaptation",
  "json_schema",
] as const;

export function getDecisionOwnership(
  decision: DecisionId,
): DecisionOwnershipRecord {
  const row = DECISION_OWNERSHIP.find((r) => r.decision === decision);
  if (!row) {
    throw new Error(`Unknown decision ownership id: ${decision}`);
  }
  return row;
}

export function dangerousConflicts(): DecisionOwnershipRecord[] {
  return DECISION_OWNERSHIP.filter((r) => r.conflict === "dangerous");
}

export function safeFutureRemovals(): DecisionOwnershipRecord[] {
  return DECISION_OWNERSHIP.filter((r) => r.conflict === "safe");
}

export function decisionOwnershipCsv(): string {
  const header =
    "Decision,Owner,Readers,Illegal Writers,Conflict,Migration Target";
  const rows = DECISION_OWNERSHIP.map((r) => {
    const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      cell(r.label),
      cell(r.owner),
      cell(r.readers.join("; ")),
      cell(r.illegalWriters.join("; ")),
      cell(
        r.conflict === "none"
          ? "none"
          : `${r.conflict}: ${r.conflictNotes}${
              r.activeContenders.length
                ? ` | contenders: ${r.activeContenders.join("; ")}`
                : ""
            }`,
      ),
      cell(r.migrationTarget),
    ].join(",");
  });
  return [header, ...rows].join("\n") + "\n";
}

/**
 * Patterns that would reintroduce duplicate active writers for owned decisions.
 * Scanned against cleaned prompt modules only (not Product Brain runtime data).
 */
export const ILLEGAL_DUPLICATE_WRITER_PATTERNS: readonly {
  id: string;
  decision: DecisionId;
  re: RegExp;
  files: readonly string[];
}[] = [
  {
    id: "hook_v2_header",
    decision: "hook",
    re: /^HOOK V2\b/m,
    files: ["lib/ai/prompts/generateContentPackage.ts"],
  },
  {
    id: "attention_mechanism_full_essay",
    decision: "opening",
    re: /ORIGINALITY PASS \(do not accept the first obvious idea\)/,
    files: ["lib/attention/promptBlocks.ts"],
  },
  {
    id: "funnel_and_coverage_dual_inject",
    decision: "asset_policy",
    // Builder must not always concatenate both; Coverage path skips Funnel.
    re: /const funnelAssetPolicy = buildFunnelAssetPolicyBlock\(funnelStage\);\s*\n\s*const assetCoverageBlock/,
    files: ["lib/ai/prompts/generateContentPackage.ts"],
  },
  {
    id: "visual_style_reinjected",
    decision: "camera_style",
    re: /visualStyleGuardrailBlock\(\)/,
    files: ["lib/ai/prompts/generateContentPackage.ts"],
  },
];
