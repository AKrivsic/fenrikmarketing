import { hashString } from "@/lib/creative-identity/hash";
import type {
  AttentionMechanism,
  OpeningStructure,
  SfxCategory,
  SfxPlan,
} from "@/lib/attention/types";

const CATEGORY_BY_MECHANISM: Partial<
  Record<AttentionMechanism, readonly SfxCategory[]>
> = {
  SURPRISE: ["whoosh", "impact", "comedic_pop"],
  HUMOR: ["comedic_pop", "click", "paper_rip"],
  FRUSTRATION: ["error_tone", "typing_stop", "notification"],
  DILEMMA: ["silence_drop", "click", "swipe"],
  ROLE_REVERSAL: ["whoosh", "cash_accent", "door_close"],
  ABSURD_ASSOCIATION: ["comedic_pop", "whoosh", "impact"],
  CONTRAST: ["swipe", "impact", "click"],
  SATISFACTION: ["cash_accent", "click", "comedic_pop"],
  RELIEF: ["glass_clink", "door_close", "silence_drop"],
  WISH_FULFILMENT: ["glass_clink", "door_close", "whoosh"],
  CURIOSITY_GAP: ["silence_drop", "whoosh", "notification"],
  PROVOCATIVE_OPINION: ["impact", "click", "silence_drop"],
};

/** Soft probability: not every package gets SFX. */
function shouldSelectSfx(seed: string, mechanism: AttentionMechanism): boolean {
  const bucket = hashString(`${seed}::sfx-select`) % 100;
  // Mechanisms that often benefit from a single accent.
  const generous = new Set<
    AttentionMechanism
  >([
    "SURPRISE",
    "HUMOR",
    "ABSURD_ASSOCIATION",
    "CONTRAST",
    "ROLE_REVERSAL",
  ]);
  const threshold = generous.has(mechanism) ? 45 : 22;
  return bucket < threshold;
}

export function planSfx(args: {
  mechanism: AttentionMechanism;
  openingStructure: OpeningStructure;
  seed: string;
  recentSfxCategories?: readonly string[];
}): SfxPlan {
  const recent = args.recentSfxCategories ?? [];
  if (!shouldSelectSfx(args.seed, args.mechanism)) {
    return {
      sfx_selected: false,
      sfx_category: null,
      sfx_timing_ms: null,
      sfx_reason: "omitted_optional_no_pressure",
      sfx_source: "omitted_no_fit",
      sfx_gain: 0,
      render_supported: true,
    };
  }

  const pool = [...(CATEGORY_BY_MECHANISM[args.mechanism] ?? ["click", "whoosh"])];
  // Soft negative for recent categories — prefer unused, never hard-ban.
  pool.sort((a, b) => {
    const pa = recent.includes(a) ? 1 : 0;
    const pb = recent.includes(b) ? 1 : 0;
    return pa - pb;
  });

  const eligible = pool.filter((c) => !recent.slice(0, 2).includes(c));
  const finalPool = eligible.length > 0 ? eligible : pool;
  if (finalPool.length === 0) {
    return {
      sfx_selected: false,
      sfx_category: null,
      sfx_timing_ms: null,
      sfx_reason: "omitted_no_suitable_effect",
      sfx_source: "omitted_no_fit",
      sfx_gain: 0,
      render_supported: true,
    };
  }

  const category =
    finalPool[hashString(`${args.seed}::sfx-cat`) % finalPool.length]!;

  // Timing: opening accent — align near first visual/spoken beat (~350–900ms).
  const timing =
    args.openingStructure === "held_then_punch" ||
    args.openingStructure === "sudden_reveal"
      ? 700 + (hashString(`${args.seed}::sfx-t`) % 400)
      : 280 + (hashString(`${args.seed}::sfx-t`) % 320);

  return {
    sfx_selected: true,
    sfx_category: category,
    sfx_timing_ms: timing,
    sfx_reason: `opening_accent:${args.mechanism}:${args.openingStructure}`,
    sfx_source: "programmatic_v1",
    // Keep well under voice — never masks narration.
    sfx_gain: 0.18,
    render_supported: true,
  };
}
