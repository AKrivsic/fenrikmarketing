/**
 * Controlled A/B ablation: same reconstructed Content Package prompt,
 * remove ONE major block per arm, call Claude, compare to baseline.
 *
 * Diagnosis only — does not modify production prompts.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ClaudeProvider } from "@/lib/ai/claude";

const PACKAGE_ID = "ff367a55-9338-4073-95bd-e3b30a8dd7a3";
const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "reports", `ablation-${PACKAGE_ID}`);

/** Held constant across all arms (experimental control). */
const TEMPERATURE = 0.7;
const MAX_TOKENS = 8192;
const TIMEOUT_MS = 180_000;

type ExperimentId =
  | "A_baseline"
  | "B_no_creative_identity"
  | "C_no_visual_profile"
  | "D_no_scene_meaning"
  | "E_no_visual_narrative"
  | "F_no_attention_mechanism"
  | "G_no_creative_directives"
  | "H_no_hook_v2"
  | "I_no_product_reveal"
  | "J_no_content_quality";

interface Experiment {
  id: ExperimentId;
  label: string;
  /** Inclusive start marker (line prefix / includes). */
  removeFrom: string | null;
  /** Exclusive end markers — first match after start wins. */
  removeUntil: string[] | null;
}

const EXPERIMENTS: Experiment[] = [
  {
    id: "A_baseline",
    label: "Baseline (original prompt)",
    removeFrom: null,
    removeUntil: null,
  },
  {
    id: "B_no_creative_identity",
    label: "Remove Creative Identity",
    // Exact section header — avoid earlier prose mentions of "CREATIVE IDENTITY".
    removeFrom: "CREATIVE IDENTITY (creative-identity",
    removeUntil: ["VERTICAL SCENE COMPOSITION", "DEVICE & SCREEN REALISM"],
  },
  {
    id: "C_no_visual_profile",
    label: "Remove Project Visual Profile",
    removeFrom: "PROJECT VISUAL PROFILE (NATURAL",
    removeUntil: [
      "CREATIVE IDENTITY (creative-identity",
      "VERTICAL SCENE COMPOSITION",
    ],
  },
  {
    id: "D_no_scene_meaning",
    label: "Remove Scene Meaning",
    removeFrom: "SCENE MEANING (priority",
    removeUntil: ["VISUAL NARRATIVE (visual-narrative", "PRODUCT REVEAL (product-reveal"],
  },
  {
    id: "E_no_visual_narrative",
    label: "Remove Visual Narrative",
    removeFrom: "VISUAL NARRATIVE (visual-narrative",
    removeUntil: ["PRODUCT REVEAL (product-reveal", "VISUAL MEDIUM (PHOTOGRAPHIC"],
  },
  {
    id: "F_no_attention_mechanism",
    label: "Remove Attention Mechanism",
    removeFrom: "ATTENTION MECHANISM (attention@",
    removeUntil: ["CREATIVE CANDIDATE SELECTION", "CONTENT QUALITY (hard rules"],
  },
  {
    id: "G_no_creative_directives",
    label: "Remove Creative Directives",
    removeFrom: "CREATIVE DIRECTIVE (this piece",
    removeUntil: ["PACKAGE DIVERSITY", "ATTENTION FIRST", "ATTENTION MECHANISM (attention@"],
  },
  {
    id: "H_no_hook_v2",
    label: "Remove Hook V2",
    removeFrom: "HOOK V2 (the first",
    removeUntil: ["VISUAL BEATS:", "SCENE MEANING (priority"],
  },
  {
    id: "I_no_product_reveal",
    label: "Remove Product Reveal",
    removeFrom: "PRODUCT REVEAL (product-reveal",
    removeUntil: [
      "VISUAL MEDIUM (PHOTOGRAPHIC",
      "VISUAL STYLE",
      "PROJECT VISUAL PROFILE (NATURAL",
    ],
  },
  {
    id: "J_no_content_quality",
    label: "Remove Content Quality",
    removeFrom: "CONTENT QUALITY (hard rules",
    removeUntil: ["HOOK V2 (the first", "VISUAL BEATS:"],
  },
];

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function removeBlock(
  prompt: string,
  removeFrom: string,
  removeUntil: string[],
): { prompt: string; removedChars: number; found: boolean } {
  const start = prompt.indexOf(removeFrom);
  if (start < 0) {
    return { prompt, removedChars: 0, found: false };
  }
  let end = prompt.length;
  for (const marker of removeUntil) {
    const i = prompt.indexOf(marker, start + removeFrom.length);
    if (i >= 0 && i < end) end = i;
  }
  const removed = prompt.slice(start, end);
  const next = (prompt.slice(0, start) + prompt.slice(end)).replace(
    /\n{3,}/g,
    "\n\n",
  );
  return { prompt: next, removedChars: removed.length, found: true };
}

function extractJson(text: string): unknown | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* fall through */
    }
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function getStr(obj: Record<string, unknown> | null, ...keys: string[]): string {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function normalizePackage(raw: unknown) {
  const root = asRecord(raw) ?? {};
  const video = asRecord(root.video) ?? {};
  const imagePrompts = Array.isArray(root.image_prompts)
    ? root.image_prompts.filter((x): x is string => typeof x === "string")
    : [];
  const platformOutputs = asRecord(root.platform_outputs) ?? {};
  return {
    hook: getStr(root, "hook"),
    voiceover: getStr(root, "voiceover_text"),
    title: getStr(root, "title"),
    concept: getStr(video, "concept") || getStr(root, "concept"),
    script: getStr(video, "script") || getStr(root, "script"),
    image_prompts: imagePrompts,
    platform_outputs: platformOutputs,
    cta: root.cta ?? null,
    scenario: getStr(root, "scenario"),
  };
}

type NormPkg = ReturnType<typeof normalizePackage>;

function tokenSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function jaccard(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 1 : inter / union;
}

function hookDelta(base: string, other: string): "identical" | "partially_changed" | "changed" {
  const a = base.trim().toLowerCase();
  const b = other.trim().toLowerCase();
  if (a === b) return "identical";
  if (!a || !b) return "changed";
  if (a.includes(b) || b.includes(a) || jaccard(a, b) >= 0.5) return "partially_changed";
  return "changed";
}

function voDelta(
  base: string,
  other: string,
): "minimal_changes" | "medium_changes" | "major_changes" {
  const sim = jaccard(base, other);
  if (sim >= 0.72) return "minimal_changes";
  if (sim >= 0.4) return "medium_changes";
  return "major_changes";
}

const VISUAL_TAGS = [
  "co-working",
  "coworking",
  "parking lot",
  "parking",
  "mascot",
  "laptop",
  "office",
  "desk",
  "outdoors",
  "outdoor",
  "photoreal",
  "photorealistic",
  "documentary",
  "heat",
  "melting",
  "traffic",
  "glass door",
  "plant",
  "analytics",
  "chat",
  "typing",
] as const;

function visualTags(text: string): string[] {
  const lower = text.toLowerCase();
  return VISUAL_TAGS.filter((t) => lower.includes(t));
}

function estimateInfluence(args: {
  hook: string;
  vo: string;
  visualWorldChanged: boolean;
  visualWorldMajor: boolean;
  progressionChanged: boolean;
  imageSim: number;
  platformSim: number;
  creativityShift: "none" | "low" | "medium" | "high";
}): "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  let score = 0;
  if (args.hook === "changed") score += 3;
  else if (args.hook === "partially_changed") score += 1;
  if (args.vo === "major_changes") score += 3;
  else if (args.vo === "medium_changes") score += 2;
  else if (args.vo === "minimal_changes") score += 0;
  if (args.visualWorldMajor) score += 4;
  else if (args.visualWorldChanged) score += 2;
  if (args.progressionChanged) score += 2;
  if (args.imageSim < 0.35) score += 3;
  else if (args.imageSim < 0.55) score += 2;
  else if (args.imageSim < 0.75) score += 1;
  if (args.creativityShift === "high") score += 2;
  else if (args.creativityShift === "medium") score += 1;
  if (args.platformSim < 0.4) score += 1;

  if (score >= 9) return "CRITICAL";
  if (score >= 6) return "HIGH";
  if (score >= 3) return "MEDIUM";
  if (score >= 1) return "LOW";
  return "NONE";
}

function platformBlob(p: Record<string, unknown>): string {
  return JSON.stringify(p);
}

function analyzeVsBaseline(baseline: NormPkg, other: NormPkg, removedBlock: string) {
  const imagesBase = baseline.image_prompts.join("\n");
  const imagesOther = other.image_prompts.join("\n");
  const imageSim = jaccard(imagesBase, imagesOther);
  const platformSim = jaccard(
    platformBlob(baseline.platform_outputs),
    platformBlob(other.platform_outputs),
  );

  const baseVis = new Set([
    ...visualTags(baseline.concept),
    ...visualTags(baseline.script),
    ...visualTags(imagesBase),
  ]);
  const otherVis = new Set([
    ...visualTags(other.concept),
    ...visualTags(other.script),
    ...visualTags(imagesOther),
  ]);
  const onlyBase = [...baseVis].filter((t) => !otherVis.has(t));
  const onlyOther = [...otherVis].filter((t) => !baseVis.has(t));
  const visualWorldChanged = onlyBase.length + onlyOther.length > 0;
  const visualWorldMajor =
    onlyBase.includes("co-working") ||
    onlyOther.includes("co-working") ||
    onlyBase.includes("parking lot") ||
    onlyOther.includes("parking lot") ||
    onlyBase.includes("mascot") ||
    onlyOther.includes("mascot") ||
    (onlyBase.includes("desk") && onlyOther.includes("outdoors")) ||
    (onlyOther.includes("desk") && onlyBase.includes("outdoors"));

  const baseProg = `${baseline.concept}\n${baseline.script}`.toLowerCase();
  const otherProg = `${other.concept}\n${other.script}`.toLowerCase();
  const progSim = jaccard(baseProg, otherProg);
  const progressionChanged = progSim < 0.55;

  const hook = hookDelta(baseline.hook, other.hook);
  const vo = voDelta(baseline.voiceover, other.voiceover);

  let creativityShift: "none" | "low" | "medium" | "high" = "none";
  if (visualWorldMajor || (hook === "changed" && vo === "major_changes")) {
    creativityShift = "high";
  } else if (visualWorldChanged || vo === "major_changes" || progressionChanged) {
    creativityShift = "medium";
  } else if (vo === "medium_changes" || hook !== "identical" || imageSim < 0.7) {
    creativityShift = "low";
  }

  const influence = estimateInfluence({
    hook,
    vo,
    visualWorldChanged,
    visualWorldMajor,
    progressionChanged,
    imageSim,
    platformSim,
    creativityShift,
  });

  return {
    removedBlock,
    hook,
    hook_baseline: baseline.hook,
    hook_variant: other.hook,
    voiceover: vo,
    voiceover_similarity: +jaccard(baseline.voiceover, other.voiceover).toFixed(3),
    story_progression_changed: progressionChanged,
    story_progression_similarity: +progSim.toFixed(3),
    visual_world: {
      baseline_tags: [...baseVis],
      variant_tags: [...otherVis],
      lost_tags: onlyBase,
      gained_tags: onlyOther,
      changed: visualWorldChanged,
      major: visualWorldMajor,
    },
    image_prompts_similarity: +imageSim.toFixed(3),
    image_prompt_count: {
      baseline: baseline.image_prompts.length,
      variant: other.image_prompts.length,
    },
    platform_outputs_similarity: +platformSim.toFixed(3),
    overall_creativity_shift: creativityShift,
    estimated_influence: influence,
    snippets: {
      concept_variant: other.concept.slice(0, 280),
      script_variant_head: other.script.slice(0, 280),
      image1_variant: (other.image_prompts[0] ?? "").slice(0, 280),
      voiceover_variant: other.voiceover.slice(0, 280),
    },
  };
}

async function runOne(
  provider: ClaudeProvider,
  system: string,
  userPrompt: string,
  exp: Experiment,
) {
  let prompt = userPrompt;
  let removedChars = 0;
  let found = true;
  if (exp.removeFrom && exp.removeUntil) {
    const r = removeBlock(userPrompt, exp.removeFrom, exp.removeUntil);
    prompt = r.prompt;
    removedChars = r.removedChars;
    found = r.found;
  }

  const started = Date.now();
  const completion = await provider.complete({
    system,
    prompt,
    json: true,
    temperature: TEMPERATURE,
    maxTokens: MAX_TOKENS,
    timeoutMs: TIMEOUT_MS,
    maxTransportAttempts: 1,
  });
  const elapsedMs = Date.now() - started;
  const parsed = extractJson(completion.text);
  const normalized = parsed ? normalizePackage(parsed) : null;

  writeFileSync(join(OUT_DIR, `${exp.id}.raw.txt`), completion.text);
  if (normalized) {
    writeFileSync(
      join(OUT_DIR, `${exp.id}.json`),
      JSON.stringify(normalized, null, 2),
    );
  }
  writeFileSync(
    join(OUT_DIR, `${exp.id}.meta.json`),
    JSON.stringify(
      {
        id: exp.id,
        label: exp.label,
        found_block: found,
        removed_chars: removedChars,
        prompt_chars: prompt.length,
        elapsed_ms: elapsedMs,
        model: completion.model,
        parse_ok: Boolean(parsed),
      },
      null,
      2,
    ),
  );

  return {
    exp,
    found,
    removedChars,
    promptChars: prompt.length,
    elapsedMs,
    model: completion.model,
    parseOk: Boolean(parsed),
    normalized,
    raw: completion.text,
  };
}

async function main() {
  loadEnvLocal();
  mkdirSync(OUT_DIR, { recursive: true });

  const system = readFileSync(
    join(ROOT, `reports/package-${PACKAGE_ID}-claude-system-prompt.txt`),
    "utf8",
  );
  const userPrompt = readFileSync(
    join(ROOT, `reports/package-${PACKAGE_ID}-claude-user-prompt.txt`),
    "utf8",
  );

  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
  const provider = new ClaudeProvider(undefined, model);

  console.log(
    JSON.stringify(
      {
        package_id: PACKAGE_ID,
        model,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        baseline_prompt_chars: userPrompt.length,
        experiments: EXPERIMENTS.length,
        out_dir: OUT_DIR,
      },
      null,
      2,
    ),
  );

  const results: Awaited<ReturnType<typeof runOne>>[] = [];
  for (const exp of EXPERIMENTS) {
    console.log(`\n=== Running ${exp.id}: ${exp.label} ===`);
    try {
      const r = await runOne(provider, system, userPrompt, exp);
      results.push(r);
      console.log(
        JSON.stringify({
          id: exp.id,
          found: r.found,
          removedChars: r.removedChars,
          parseOk: r.parseOk,
          elapsedMs: r.elapsedMs,
          hook: r.normalized?.hook?.slice(0, 80),
        }),
      );
    } catch (err) {
      console.error(`FAILED ${exp.id}`, err);
      results.push({
        exp,
        found: false,
        removedChars: 0,
        promptChars: userPrompt.length,
        elapsedMs: 0,
        model,
        parseOk: false,
        normalized: null,
        raw: String(err),
      });
      writeFileSync(join(OUT_DIR, `${exp.id}.error.txt`), String(err));
    }
  }

  const baseline = results.find((r) => r.exp.id === "A_baseline");
  if (!baseline?.normalized) {
    writeFileSync(
      join(OUT_DIR, "summary.json"),
      JSON.stringify({ error: "baseline_failed", results: results.map((r) => r.exp.id) }, null, 2),
    );
    throw new Error("Baseline failed — cannot compare");
  }

  const comparisons = results
    .filter((r) => r.exp.id !== "A_baseline")
    .map((r) => {
      if (!r.normalized) {
        return {
          id: r.exp.id,
          label: r.exp.label,
          error: "parse_or_generation_failed",
          estimated_influence: "UNKNOWN",
        };
      }
      return {
        id: r.exp.id,
        label: r.exp.label,
        removed_chars: r.removedChars,
        found_block: r.found,
        ...analyzeVsBaseline(baseline.normalized!, r.normalized, r.exp.label),
      };
    });

  const summary = {
    package_id: PACKAGE_ID,
    model: baseline.model,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    note: "All arms use the same reconstructed prompt, model, and temperature. Only the named block is removed. Stochastic variance at T=0.7 may cause residual differences unrelated to the ablation.",
    baseline: {
      hook: baseline.normalized.hook,
      voiceover: baseline.normalized.voiceover,
      concept_head: baseline.normalized.concept.slice(0, 300),
      script_head: baseline.normalized.script.slice(0, 300),
      image1_head: (baseline.normalized.image_prompts[0] ?? "").slice(0, 300),
      visual_tags: visualTags(
        [
          baseline.normalized.concept,
          baseline.normalized.script,
          ...baseline.normalized.image_prompts,
        ].join("\n"),
      ),
    },
    comparisons,
    table: comparisons.map((c) => ({
      Block: "label" in c ? c.label.replace(/^Remove /, "") : c.id,
      Influence: "estimated_influence" in c ? c.estimated_influence : "UNKNOWN",
      What_changed:
        "error" in c && c.error
          ? c.error
          : [
              `hook=${(c as { hook?: string }).hook}`,
              `vo=${(c as { voiceover?: string }).voiceover}`,
              `visual_major=${(c as { visual_world?: { major?: boolean } }).visual_world?.major}`,
              `prog_changed=${(c as { story_progression_changed?: boolean }).story_progression_changed}`,
              `img_sim=${(c as { image_prompts_similarity?: number }).image_prompts_similarity}`,
            ].join("; "),
    })),
  };

  writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));

  const md = [
    `# Prompt-block ablation experiment`,
    ``,
    `Package: \`${PACKAGE_ID}\``,
    `Model: \`${summary.model}\` · temperature: ${TEMPERATURE} · max_tokens: ${MAX_TOKENS}`,
    ``,
    `## Method`,
    `- Same reconstructed system + user prompt`,
    `- Same Product Brain, Strategy Item, Creative Candidate (kept in all arms)`,
    `- Change ONLY the named block (removed entirely)`,
    `- Baseline regenerated in this run (not the historical DB package)`,
    ``,
    `## Baseline snapshot`,
    ``,
    `- Hook: ${summary.baseline.hook}`,
    `- VO: ${summary.baseline.voiceover}`,
    `- Visual tags: ${summary.baseline.visual_tags.join(", ") || "(none)"}`,
    ``,
    `## Results table`,
    ``,
    `| Block | Influence | What changed |`,
    `|---|---|---|`,
    ...summary.table.map(
      (r) => `| ${r.Block} | ${r.Influence} | ${r.What_changed} |`,
    ),
    ``,
    `## Per-arm detail`,
    ``,
  ];

  for (const c of comparisons) {
    md.push(`### ${c.label ?? c.id}`);
    if ("error" in c && c.error) {
      md.push(`Error: ${c.error}`);
      md.push("");
      continue;
    }
    const d = c as Record<string, unknown>;
    md.push(`- Estimated influence: **${d.estimated_influence}**`);
    md.push(`- Hook: ${d.hook}`);
    md.push(`- Voiceover: ${d.voiceover} (sim=${d.voiceover_similarity})`);
    md.push(
      `- Story progression changed: ${d.story_progression_changed} (sim=${d.story_progression_similarity})`,
    );
    const vw = d.visual_world as {
      lost_tags: string[];
      gained_tags: string[];
      major: boolean;
    };
    md.push(
      `- Visual world major=${vw.major}; lost=[${vw.lost_tags.join(", ")}]; gained=[${vw.gained_tags.join(", ")}]`,
    );
    md.push(`- Image prompts similarity: ${d.image_prompts_similarity}`);
    md.push(`- Platform outputs similarity: ${d.platform_outputs_similarity}`);
    md.push(`- Creativity shift: ${d.overall_creativity_shift}`);
    md.push("");
  }

  writeFileSync(join(OUT_DIR, "report.md"), md.join("\n"));
  console.log("\nWrote", join(OUT_DIR, "summary.json"));
  console.log("Wrote", join(OUT_DIR, "report.md"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
