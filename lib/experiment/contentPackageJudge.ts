/**
 * Blind judge for prompt experiment outputs (local only).
 */
import { getCopywritingProvider, getJsonRepairProvider } from "@/lib/ai/index";
import type { TextProvider } from "@/lib/ai/types";
import { safeJsonParse } from "@/lib/ai/validateAiOutput";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { PromptVariantId } from "@/lib/experiment/contentPackagePromptVariants";

export interface JudgeScoreDimensions {
  hook_strength: number;
  curiosity: number;
  specificity: number;
  emotional_pull: number;
  scroll_stop: number;
  conversion_fit: number;
  clarity: number;
  overall: number;
}

export interface BlindJudgeResult {
  strategy_item_id: string;
  ranking: number[];
  scores: Record<string, JudgeScoreDimensions>;
  winner_variant: PromptVariantId;
  reasoning_short: string;
  /** Maps blind label "Output N" -> variant id (for report only). */
  label_to_variant: Record<string, PromptVariantId>;
}

const JUDGE_SYSTEM =
  "You are a senior short-form content critic. You compare social video copy " +
  "packages for scroll-stop power and conversion fit. You receive blind outputs " +
  "labeled Output 1..4 only — you do not know how they were produced. " +
  "Respond with a single valid JSON document only.";

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function formatOutputForJudge(index: number, pkg: ContentPackageOutput): string {
  return [
    `Output ${index}:`,
    `hook: ${pkg.hook}`,
    `voiceover_text: ${pkg.voiceover_text}`,
    `cta: ${JSON.stringify(pkg.cta)}`,
    `title: ${pkg.title}`,
    `video.concept: ${pkg.video?.concept ?? "(none)"}`,
  ].join("\n");
}

function pickJudgeProvider(generator: TextProvider): TextProvider {
  if (generator.name === "claude") {
    try {
      return getJsonRepairProvider();
    } catch {
      return generator;
    }
  }
  try {
    return getCopywritingProvider();
  } catch {
    return getJsonRepairProvider();
  }
}

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function resolveExperimentProviders(): {
  generator: TextProvider;
  judge: TextProvider;
} {
  const generator = getCopywritingProvider();
  let judge = pickJudgeProvider(generator);
  if (judge.name === generator.name) {
    if (generator.name === "claude" && hasOpenAiKey()) {
      judge = getJsonRepairProvider();
    } else if (generator.name !== "claude" && hasAnthropicKey()) {
      judge = getCopywritingProvider();
    }
  }
  return { generator, judge };
}

export async function runBlindJudge(args: {
  strategyItemId: string;
  outputs: { variant: PromptVariantId; pkg: ContentPackageOutput }[];
  judge: TextProvider;
}): Promise<BlindJudgeResult> {
  const shuffled = shuffle(args.outputs);
  const labelToVariant: Record<string, PromptVariantId> = {};
  const blocks: string[] = [];
  shuffled.forEach((entry, i) => {
    const label = `Output ${i + 1}`;
    labelToVariant[label] = entry.variant;
    blocks.push(formatOutputForJudge(i + 1, entry.pkg));
  });

  const prompt = [
    "Compare these four short-form content packages for the SAME strategy topic.",
    "Score each output 1–10 on: hook_strength, curiosity, specificity, emotional_pull,",
    "scroll_stop, conversion_fit, clarity, overall.",
    "",
    blocks.join("\n\n"),
    "",
    "Return JSON exactly:",
    `{
  "ranking": [1, 2, 3, 4],
  "scores": {
    "Output 1": { "hook_strength": 0, "curiosity": 0, "specificity": 0, "emotional_pull": 0, "scroll_stop": 0, "conversion_fit": 0, "clarity": 0, "overall": 0 },
    "Output 2": { ... },
    "Output 3": { ... },
    "Output 4": { ... }
  },
  "winner_label": "Output N",
  "reasoning_short": "string"
}`,
    "ranking: best first (1-based output numbers). winner_label must match ranking[0].",
  ].join("\n");

  const completion = await args.judge.complete({
    system: JUDGE_SYSTEM,
    prompt,
    json: true,
    temperature: 0.3,
    maxTokens: 2048,
  });

  const parsed = safeJsonParse(completion.text);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") {
    throw new Error("Judge returned invalid JSON");
  }
  const raw = parsed.value as Record<string, unknown>;
  const ranking = Array.isArray(raw.ranking)
    ? raw.ranking.map((n) => Number(n)).filter((n) => Number.isFinite(n))
    : [1, 2, 3, 4];
  const scoresRaw = (raw.scores ?? {}) as Record<string, unknown>;
  const scores: Record<string, JudgeScoreDimensions> = {};
  for (const [label, value] of Object.entries(scoresRaw)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    scores[label] = {
      hook_strength: Number(v.hook_strength) || 0,
      curiosity: Number(v.curiosity) || 0,
      specificity: Number(v.specificity) || 0,
      emotional_pull: Number(v.emotional_pull) || 0,
      scroll_stop: Number(v.scroll_stop) || 0,
      conversion_fit: Number(v.conversion_fit) || 0,
      clarity: Number(v.clarity) || 0,
      overall: Number(v.overall) || 0,
    };
  }

  const winnerLabel =
    typeof raw.winner_label === "string"
      ? raw.winner_label.trim()
      : `Output ${ranking[0] ?? 1}`;
  const winner_variant =
    labelToVariant[winnerLabel] ??
    labelToVariant[`Output ${ranking[0]}`] ??
    shuffled[0].variant;

  return {
    strategy_item_id: args.strategyItemId,
    ranking,
    scores,
    winner_variant,
    reasoning_short:
      typeof raw.reasoning_short === "string"
        ? raw.reasoning_short.trim()
        : "",
    label_to_variant: labelToVariant,
  };
}
