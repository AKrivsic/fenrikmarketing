import type { PipelineTelemetryStep } from "@/lib/ai/telemetry/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readTelemetrySteps(
  generationTelemetry: unknown,
): PipelineTelemetryStep[] {
  const root = asRecord(generationTelemetry);
  if (!root || !Array.isArray(root.steps)) return [];
  return root.steps.filter(
    (s): s is PipelineTelemetryStep =>
      !!s && typeof s === "object" && typeof (s as PipelineTelemetryStep).step_name === "string",
  );
}

function fmtSeconds(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 1)} s`.replace(/\.0 s$/, " s");
}

/**
 * Nested package-generation breakdown for Production Run Technical Audit.
 */
export function formatPackageGenerationBreakdown(args: {
  totalDurationMs: number | null;
  steps: readonly PipelineTelemetryStep[];
}): string {
  const lines: string[] = [];
  const total =
    args.totalDurationMs ??
    args.steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0);

  lines.push(`Package generation`);
  lines.push("");
  lines.push(fmtSeconds(total));
  if (args.steps.length === 0) {
    lines.push("");
    lines.push("_No per-step telemetry persisted for this package._");
    return lines.join("\n");
  }

  for (const step of args.steps) {
    lines.push("");
    lines.push("↓");
    lines.push("");
    lines.push(step.step_name);
    lines.push(fmtSeconds(step.duration_ms));
  }
  return lines.join("\n");
}

export function formatExecutionTimeTable(
  steps: readonly PipelineTelemetryStep[],
): string {
  const total = steps.reduce((s, x) => s + x.duration_ms, 0) || 1;
  const rows = [
    "| Step | Duration | % |",
    "| --- | ---: | ---: |",
    ...steps.map((s) => {
      const pct = ((s.duration_ms / total) * 100).toFixed(1);
      return `| ${s.step_name} | ${fmtSeconds(s.duration_ms)} | ${pct}% |`;
    }),
    `| **Total** | **${fmtSeconds(total)}** | **100%** |`,
  ];
  return rows.join("\n");
}

export function formatAiCostTable(
  steps: readonly PipelineTelemetryStep[],
): string {
  const withTokens = steps.filter(
    (s) =>
      s.prompt_tokens != null ||
      s.completion_tokens != null ||
      s.estimated_cost != null,
  );
  if (withTokens.length === 0) {
    return "_No token/cost telemetry available for these steps._";
  }
  const rows = [
    "| Step | Prompt tok | Completion tok | Estimated $ |",
    "| --- | ---: | ---: | ---: |",
    ...withTokens.map((s) => {
      const cost =
        s.estimated_cost != null ? `$${s.estimated_cost.toFixed(4)}` : "—";
      return `| ${s.step_name} | ${s.prompt_tokens ?? "—"} | ${s.completion_tokens ?? "—"} | ${cost} |`;
    }),
  ];
  const totalCost = withTokens.reduce(
    (sum, s) => sum + (s.estimated_cost ?? 0),
    0,
  );
  if (withTokens.some((s) => s.estimated_cost != null)) {
    rows.push(`| **Total (est.)** |  |  | **$${totalCost.toFixed(4)}** |`);
  }
  return rows.join("\n");
}

export function formatPromptSizeTable(
  steps: readonly PipelineTelemetryStep[],
): string {
  const withSize = steps.filter(
    (s) => s.input_size_bytes != null || s.output_size_bytes != null,
  );
  if (withSize.length === 0) {
    return "_No prompt/output size telemetry for these steps._";
  }
  const kb = (n: number | null) =>
    n == null ? "—" : `${(n / 1024).toFixed(1)} KB`;
  return [
    "| Step | Prompt KB | Output KB |",
    "| --- | ---: | ---: |",
    ...withSize.map(
      (s) =>
        `| ${s.step_name} | ${kb(s.input_size_bytes)} | ${kb(s.output_size_bytes)} |`,
    ),
  ].join("\n");
}

export function formatProviderRollup(
  steps: readonly PipelineTelemetryStep[],
): string {
  const buckets: Record<string, { count: number; ms: number }> = {
    Claude: { count: 0, ms: 0 },
    OpenAI: { count: 0, ms: 0 },
    Whisper: { count: 0, ms: 0 },
    TTS: { count: 0, ms: 0 },
    Image: { count: 0, ms: 0 },
    Video: { count: 0, ms: 0 },
    Deterministic: { count: 0, ms: 0 },
  };

  for (const s of steps) {
    const p = (s.provider ?? "").toLowerCase();
    const name = s.step_name.toLowerCase();
    let key: keyof typeof buckets = "Deterministic";
    if (p.includes("claude") || p.includes("anthropic")) key = "Claude";
    else if (name.includes("whisper") || p.includes("whisper")) key = "Whisper";
    else if (name.includes("tts") || p === "tts") key = "TTS";
    else if (name.includes("image") || p === "image") key = "Image";
    else if (name.includes("video") || name.includes("render") || p === "video")
      key = "Video";
    else if (p.includes("openai")) key = "OpenAI";
    else if (p === "deterministic") key = "Deterministic";
    buckets[key].count += 1;
    buckets[key].ms += s.duration_ms;
  }

  return [
    "| Provider | Steps | Duration |",
    "| --- | ---: | ---: |",
    ...Object.entries(buckets)
      .filter(([, v]) => v.count > 0)
      .map(
        ([k, v]) => `| ${k} | ${v.count} | ${fmtSeconds(v.ms)} |`,
      ),
  ].join("\n");
}

/** Full markdown section for technical audits. */
export function formatTechnicalAuditTelemetrySection(args: {
  packageLabel?: string;
  totalDurationMs: number | null;
  steps: readonly PipelineTelemetryStep[];
}): string {
  const parts: string[] = [];
  parts.push("#### Phase timings (pipeline telemetry)");
  parts.push("");
  parts.push("```");
  parts.push(
    formatPackageGenerationBreakdown({
      totalDurationMs: args.totalDurationMs,
      steps: args.steps,
    }),
  );
  parts.push("```");
  parts.push("");
  parts.push("##### Execution Time");
  parts.push("");
  parts.push(formatExecutionTimeTable(args.steps));
  parts.push("");
  parts.push("##### AI Cost");
  parts.push("");
  parts.push(formatAiCostTable(args.steps));
  parts.push("");
  parts.push("##### Prompt Sizes");
  parts.push("");
  parts.push(formatPromptSizeTable(args.steps));
  parts.push("");
  parts.push("##### Providers");
  parts.push("");
  parts.push(formatProviderRollup(args.steps));
  return parts.join("\n");
}
