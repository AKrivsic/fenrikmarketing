/**
 * LOCAL PROMPT EXPERIMENT ONLY — safe offline comparison of content-package prompts.
 *
 * Does NOT: n8n, DB writes, content_packages/items/video_jobs, video worker,
 * TTS, images, FFmpeg, Vercel deploy, or production workflow actions.
 *
 * Usage:
 *   node --experimental-strip-types --import ./scripts/register-alias.mjs \
 *     scripts/prompt-experiment-content-package.ts <project_id> [--limit 15]
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertDryRunOnly,
  createReadOnlySupabaseClient,
  DRY_RUN_ONLY,
  estimateTokens,
  loadEnvLocal,
} from "@/lib/experiment/dryRun";
import {
  buildContentPackagePromptVariant,
  PROMPT_VARIANTS,
  type PromptVariantId,
} from "@/lib/experiment/contentPackagePromptVariants";
import {
  loadExperimentItemContext,
  loadRecentStrategyItemIds,
} from "@/lib/experiment/loadContentPackageExperimentContext";
import {
  resolveExperimentProviders,
  runBlindJudge,
  type BlindJudgeResult,
  type JudgeScoreDimensions,
} from "@/lib/experiment/contentPackageJudge";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import { buildContentPackageSchema } from "@/lib/ai/schemas/contentPackage";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";

assertDryRunOnly();
loadEnvLocal();

interface ExperimentResultRow {
  project_id: string;
  strategy_item_id: string;
  variant: PromptVariantId;
  provider: string;
  prompt_token_estimate: number;
  title: string;
  hook: string;
  voiceover_text: string;
  voiceover_word_count: number;
  cta: ContentPackageOutput["cta"];
  video_concept: string | null;
  image_prompts: string[];
  platform_outputs: ContentPackageOutput["platform_outputs"];
  raw_json: ContentPackageOutput;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function parseArgs(argv: string[]): { projectId: string; limit: number } {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const projectId = positional[0]?.trim();
  if (!projectId) {
    throw new Error(
      "Usage: scripts/prompt-experiment-content-package.ts <project_id> [--limit N]",
    );
  }
  let limit = 15;
  const limitIdx = argv.indexOf("--limit");
  if (limitIdx >= 0 && argv[limitIdx + 1]) {
    const n = Number.parseInt(argv[limitIdx + 1], 10);
    if (Number.isFinite(n) && n > 0) limit = Math.min(21, n);
  }
  return { projectId, limit };
}

function timestampSlug(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    pad(d.getHours()),
    pad(d.getMinutes()),
  ].join("-");
}

function avgScores(
  rows: { variant: PromptVariantId; scores: JudgeScoreDimensions }[],
): Record<PromptVariantId, Partial<JudgeScoreDimensions>> {
  const acc: Record<
    string,
    Record<string, { sum: number; n: number }>
  > = {};
  for (const row of rows) {
    for (const [dim, val] of Object.entries(row.scores)) {
      if (!acc[row.variant]) acc[row.variant] = {};
      if (!acc[row.variant][dim]) acc[row.variant][dim] = { sum: 0, n: 0 };
      acc[row.variant][dim].sum += val;
      acc[row.variant][dim].n += 1;
    }
  }
  const out = {} as Record<PromptVariantId, Partial<JudgeScoreDimensions>>;
  for (const variant of PROMPT_VARIANTS) {
    out[variant] = {};
    const dims = acc[variant] ?? {};
    for (const [dim, { sum, n }] of Object.entries(dims)) {
      (out[variant] as Record<string, number>)[dim] =
        n > 0 ? Math.round((sum / n) * 10) / 10 : 0;
    }
  }
  return out;
}

function buildMarkdownReport(args: {
  projectId: string;
  itemCount: number;
  generatorProvider: string;
  judgeProvider: string;
  results: ExperimentResultRow[];
  judgeResults: BlindJudgeResult[];
  variantWins: Record<PromptVariantId, number>;
  avgByVariant: Record<PromptVariantId, Partial<JudgeScoreDimensions>>;
}): string {
  const hooks = [...args.results]
    .sort((a, b) => b.hook.length - a.hook.length)
    .slice(0, 5)
    .map((r) => `- [${r.variant}] ${r.hook}`);

  const aWins = args.variantWins.A ?? 0;
  const bWins = args.variantWins.B ?? 0;
  const cWins = args.variantWins.C ?? 0;
  const dWins = args.variantWins.D ?? 0;
  const challengerWins = bWins + cWins + dWins;
  const recommendation =
    challengerWins > aWins
      ? "Variants B/C/D collectively beat A on blind judge wins — consider adopting the best reordering/copy-first changes."
      : challengerWins === aWins
        ? "Tie on wins — inspect per-dimension averages and sample hooks before changing production prompts."
        : "Current prompt (A) still wins most blind comparisons — changes may not help yet or need refinement.";

  const weaknessLines = [
    "Prompt length and compliance blocks may dilute hook instructions (mid-prompt placement).",
    "Optional proof/assets/platform rules compete with scroll-stop copy goals.",
    "Mode vs persona conflicts (e.g. Humor + Expert) may produce safe, flat voiceover.",
  ];

  const lines = [
    "# Content package prompt experiment",
    "",
    `- **DRY_RUN_ONLY:** ${DRY_RUN_ONLY}`,
    `- **project_id:** ${args.projectId}`,
    `- **strategy items tested:** ${args.itemCount}`,
    `- **variants per item:** ${PROMPT_VARIANTS.length} (A=current, B=reordered, C=copy-first, D=aligned safety)`,
    `- **generator provider:** ${args.generatorProvider}`,
    `- **judge provider:** ${args.judgeProvider}`,
    "",
    "## Average judge scores by variant (overall dimension)",
    "",
    ...PROMPT_VARIANTS.map((v) => {
      const overall = args.avgByVariant[v]?.overall ?? 0;
      return `- **${v}:** overall avg ${overall}`;
    }),
    "",
    "## Blind judge wins by variant",
    "",
    ...PROMPT_VARIANTS.map(
      (v) => `- **${v}:** ${args.variantWins[v] ?? 0} wins`,
    ),
    "",
    "## Top 5 hooks (by character length proxy — review manually)",
    "",
    ...(hooks.length ? hooks : ["- (none)"]),
    "",
    "## Likely weaknesses of current prompt (A)",
    "",
    ...weaknessLines.map((l) => `- ${l}`),
    "",
    "## Recommendation",
    "",
    recommendation,
    "",
    "## Per-item judge notes",
    "",
  ];

  for (const j of args.judgeResults) {
    lines.push(
      `### ${j.strategy_item_id}`,
      `- **winner:** ${j.winner_variant}`,
      `- **reasoning:** ${j.reasoning_short || "(none)"}`,
      "",
    );
  }

  return lines.join("\n");
}

async function main(): Promise<void> {
  const { projectId, limit } = parseArgs(process.argv.slice(2));
  const supabase = createReadOnlySupabaseClient();
  const itemIds = await loadRecentStrategyItemIds(supabase, projectId, limit);

  if (itemIds.length === 0) {
    throw new Error(`No content_strategy_items for project ${projectId}`);
  }
  if (itemIds.length < 10) {
    console.warn(
      `[prompt-experiment] Only ${itemIds.length} strategy items (requested up to ${limit}; ideal 10–21).`,
    );
  }

  const { generator, judge } = resolveExperimentProviders();
  console.log(
    `[prompt-experiment] generator=${generator.name} judge=${judge.name} items=${itemIds.length}`,
  );

  const allResults: ExperimentResultRow[] = [];
  const judgeResults: BlindJudgeResult[] = [];
  const flatScores: { variant: PromptVariantId; scores: JudgeScoreDimensions }[] =
    [];
  const variantWins: Record<PromptVariantId, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  };

  for (const strategyItemId of itemIds) {
    console.log(`[prompt-experiment] item ${strategyItemId}`);
    const experimentCtx = await loadExperimentItemContext(
      supabase,
      projectId,
      strategyItemId,
    );
    const outputsForJudge: { variant: PromptVariantId; pkg: ContentPackageOutput }[] =
      [];

    for (const variant of PROMPT_VARIANTS) {
      const built = buildContentPackagePromptVariant(
        variant,
        experimentCtx.promptInput,
      );
      const tokenEst =
        estimateTokens(built.system) + estimateTokens(built.user);

      const generated = await generateValidatedJson({
        textProvider: generator,
        system: built.system,
        prompt: built.user,
        validator: buildContentPackageSchema(experimentCtx.targetPlatforms, {
          requireVideo: experimentCtx.requireVideo,
        }),
        maxAttempts: 2,
      });

      if (!generated.ok) {
        console.warn(
          `[prompt-experiment] ${variant} failed validation for ${strategyItemId}`,
        );
        continue;
      }

      const pkg = generated.value;
      allResults.push({
        project_id: projectId,
        strategy_item_id: strategyItemId,
        variant,
        provider: generator.name,
        prompt_token_estimate: tokenEst,
        title: pkg.title,
        hook: pkg.hook,
        voiceover_text: pkg.voiceover_text,
        voiceover_word_count: countWords(pkg.voiceover_text),
        cta: pkg.cta,
        video_concept: pkg.video?.concept ?? null,
        image_prompts: pkg.image_prompts ?? [],
        platform_outputs: pkg.platform_outputs,
        raw_json: pkg,
      });
      outputsForJudge.push({ variant, pkg });
    }

    if (outputsForJudge.length === PROMPT_VARIANTS.length) {
      const judgeOut = await runBlindJudge({
        strategyItemId,
        outputs: outputsForJudge,
        judge,
      });
      judgeResults.push(judgeOut);
      variantWins[judgeOut.winner_variant] =
        (variantWins[judgeOut.winner_variant] ?? 0) + 1;

      for (const [label, variant] of Object.entries(judgeOut.label_to_variant)) {
        const dim = judgeOut.scores[label];
        if (dim) flatScores.push({ variant, scores: dim });
      }
    }
  }

  const avgByVariant = avgScores(flatScores);
  const slug = timestampSlug();
  const outDir = resolve(process.cwd(), "scripts/output");
  mkdirSync(outDir, { recursive: true });
  const jsonPath = resolve(outDir, `prompt-experiment-${slug}.json`);
  const mdPath = resolve(outDir, `prompt-experiment-${slug}.md`);

  const payload = {
    meta: {
      dry_run_only: DRY_RUN_ONLY,
      project_id: projectId,
      strategy_item_count: itemIds.length,
      variants: PROMPT_VARIANTS,
      generator_provider: generator.name,
      judge_provider: judge.name,
      generated_at: new Date().toISOString(),
    },
    results: allResults,
    judge: judgeResults,
    summary: {
      variant_wins: variantWins,
      avg_scores_by_variant: avgByVariant,
    },
  };

  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(
    mdPath,
    buildMarkdownReport({
      projectId,
      itemCount: itemIds.length,
      generatorProvider: generator.name,
      judgeProvider: judge.name,
      results: allResults,
      judgeResults,
      variantWins,
      avgByVariant,
    }),
    "utf8",
  );

  console.log(`[prompt-experiment] wrote ${jsonPath}`);
  console.log(`[prompt-experiment] wrote ${mdPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
