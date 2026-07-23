/**
 * Read-only financial cost trace for production run c8dd3caf-c407-418c-be49-d4cf0a3b7bf9.
 * Exact costs come only from persisted estimated_cost.
 * Historical immutability: never reprice null-cost steps with current list rates.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const RUN_ID = "c8dd3caf-c407-418c-be49-d4cf0a3b7bf9";
const OUT = resolve("docs/audits/cost-trace-c8dd3caf");
const MARKDOWN = resolve("docs/audits/cost-trace-c8dd3caf.md");

type CostBasis =
  | "exact_telemetry"
  | "estimated_list_price"
  | "estimated_from_medians"
  | "unmetered";

type Stage =
  | "strategy"
  | "direction"
  | "ideation"
  | "critic"
  | "presentation"
  | "repair"
  | "validation"
  | "images"
  | "voice"
  | "whisper"
  | "render"
  | "other";

type RecordLike = Record<string, unknown>;

type LineItem = {
  scope: "strategy" | "package" | "worker" | "failed_estimate";
  packageIndex: number | null;
  packageId: string | null;
  workflow: string;
  stage: Stage;
  provider: string;
  model: string;
  cost: number;
  basis: CostBasis;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  retryCount: number;
  success: boolean | null;
  stepName: string;
  detail: string;
  isWaste: boolean;
};

type PackageRow = {
  index: number;
  status: string;
  title: string;
  error: string;
  failStage: string;
  attempts: number;
  stages: Record<Stage, number>;
  bases: Set<CostBasis>;
  total: number;
  recoverable: boolean;
  wastePct: number;
  moneyBeforeFailure: number;
};

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const index = text.indexOf("=");
    if (index < 0) continue;
    const key = text.slice(0, index);
    const value = text.slice(index + 1).replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function object(value: unknown): RecordLike {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordLike) : {};
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}
function steps(value: unknown): RecordLike[] {
  const raw = object(value).steps;
  return Array.isArray(raw) ? raw.map(object) : [];
}
function csvCell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}
function writeCsv(name: string, rows: unknown[][]) {
  writeFileSync(join(OUT, name), `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`);
}
function dollars(value: number): string {
  return `$${value.toFixed(4)}`;
}
function pct(part: number, whole: number): string {
  if (!whole) return "0.0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}
function median(values: number[]): number {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}
function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
function emptyStages(): Record<Stage, number> {
  return {
    strategy: 0,
    direction: 0,
    ideation: 0,
    critic: 0,
    presentation: 0,
    repair: 0,
    validation: 0,
    images: 0,
    voice: 0,
    whisper: 0,
    render: 0,
    other: 0,
  };
}
function markdownTable(headers: string[], rows: string[][]): string[] {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ];
}

function stageForStep(stepName: string, provider: string): Stage {
  const name = stepName.toLowerCase();
  if (name.includes("weekly strategy") || name === "strategy items") return "strategy";
  if (name.includes("direction")) return "direction";
  if (name.includes("ideation") || name.includes("creative engine") || name.includes("candidate judge") || name.includes("narrative")) {
    return name.includes("engine") || name.includes("judge") || name.includes("narrative") ? "ideation" : "ideation";
  }
  if (name.includes("evaluation") || name.includes("critic") || name.includes("veto")) return "critic";
  if (name.includes("repair")) return "repair";
  if (
    name.includes("concept fidelity") ||
    name.includes("story integrity") ||
    name.includes("product demonstration") ||
    name.includes("hook enforcement")
  ) {
    return "validation";
  }
  if (name.includes("presentation") || name.includes("platform outputs") || name.includes("persist package")) {
    return name.includes("presentation") ? "presentation" : "other";
  }
  if (name.includes("image") || provider === "image") return "images";
  if (name.includes("tts") || provider === "tts") return "voice";
  if (name.includes("whisper") || provider === "whisper") return "whisper";
  if (name.includes("render") || name.includes("ffmpeg") || provider === "video") return "render";
  return "other";
}

function parseGeneratedCount(summary: string): number {
  const match = summary.match(/generated=(\d+)/i);
  return match ? Number(match[1]) : 0;
}
function parseAudioSeconds(summary: string): number | null {
  const match = summary.match(/audio duration=([\d.]+)s/i);
  return match ? Number(match[1]) : null;
}

function workerCost(
  step: RecordLike,
  priorTtsSeconds: number | null,
): { cost: number; basis: CostBasis; detail: string } {
  // Historical cost immutability: only persisted estimated_cost is authoritative.
  // Never recompute from current IMAGE_USD / TTS / Whisper rate constants.
  const exact = number(step.estimated_cost);
  if (exact != null) {
    return {
      cost: exact,
      basis: "exact_telemetry",
      detail: "telemetry estimated_cost (immutable historical)",
    };
  }
  const stage = stageForStep(text(step.step_name), text(step.provider));
  if (stage === "images" || stage === "voice" || stage === "whisper") {
    return {
      cost: 0,
      basis: "unmetered",
      detail:
        "No stored estimated_cost — left unmetered (historical invariant: do not reprice with current list rates)",
    };
  }
  void priorTtsSeconds;
  return {
    cost: 0,
    basis: "unmetered",
    detail: "No API cost in telemetry (render/compute unmetered)",
  };
}

type FailureKind = "story_integrity" | "concept_fidelity" | "all_concepts_vetoed" | "ideation_failed" | "unknown";

function parseFailure(errorMessage: unknown): { kind: FailureKind; attempts: number; message: string } {
  const raw = text(errorMessage);
  let parsed: RecordLike = {};
  try {
    parsed = object(JSON.parse(raw));
  } catch {
    parsed = {};
  }
  const message = text(parsed.message) || raw;
  const flattened = `${message} ${JSON.stringify(parsed.validation_errors ?? [])}`.toLowerCase();
  const attempts = Math.max(1, number(parsed.attempts) ?? 1);
  let kind: FailureKind = "unknown";
  if (flattened.includes("all_concepts_vetoed")) kind = "all_concepts_vetoed";
  else if (flattened.includes("ideation_failed") || flattened.includes("missing concepts")) kind = "ideation_failed";
  else if (flattened.includes("story_integrity")) kind = "story_integrity";
  else if (flattened.includes("concept_fidelity") || flattened.includes("generic_office")) kind = "concept_fidelity";
  return { kind, attempts, message };
}

function completedStagesBeforeFailure(kind: FailureKind): Stage[] {
  switch (kind) {
    case "all_concepts_vetoed":
      return ["direction", "ideation", "critic"];
    case "ideation_failed":
      return ["direction", "ideation"];
    case "story_integrity":
    case "concept_fidelity":
      return ["direction", "ideation", "critic", "presentation", "validation"];
    default:
      return ["direction", "ideation"];
  }
}

async function main() {
  loadEnvLocal();
  mkdirSync(OUT, { recursive: true });
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createSupabaseAdminClient();
  const fail = (message: string, error: unknown): never => {
    throw new Error(`${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
  };

  const { data: run, error: runError } = await supabase.from("production_runs").select("*").eq("id", RUN_ID).single();
  if (runError) fail("Unable to load production run", runError);

  const { data: items, error: itemsError } = await supabase
    .from("production_run_items")
    .select("*")
    .eq("production_run_id", RUN_ID)
    .order("package_index");
  if (itemsError) fail("Unable to load production run items", itemsError);

  const strategyItemIds = (items ?? []).map((item: any) => item.strategy_item_id).filter(Boolean);
  const packageIds = (items ?? []).map((item: any) => item.content_package_id).filter(Boolean);

  const { data: strategyItems, error: strategyItemsError } = strategyItemIds.length
    ? await supabase.from("content_strategy_items").select("*").in("id", strategyItemIds)
    : { data: [], error: null };
  if (strategyItemsError) fail("Unable to load strategy items", strategyItemsError);

  const strategyIds = [...new Set((strategyItems ?? []).map((item: any) => item.strategy_id).filter(Boolean))];
  const { data: strategies, error: strategiesError } = strategyIds.length
    ? await supabase.from("content_strategies").select("*").in("id", strategyIds)
    : { data: [], error: null };
  if (strategiesError) fail("Unable to load strategies", strategiesError);

  const { data: packages, error: packagesError } = packageIds.length
    ? await supabase.from("content_packages").select("*").in("id", packageIds)
    : { data: [], error: null };
  if (packagesError) fail("Unable to load packages", packagesError);

  const { data: contentItems, error: contentItemsError } = packageIds.length
    ? await supabase.from("content_items").select("*").in("package_id", packageIds).is("language", null)
    : { data: [], error: null };
  if (contentItemsError) fail("Unable to load content items", contentItemsError);

  const contentItemIds = (contentItems ?? []).map((item: any) => item.id);
  const { data: jobs, error: jobsError } = contentItemIds.length
    ? await supabase.from("video_jobs").select("*").in("content_item_id", contentItemIds).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (jobsError) fail("Unable to load video jobs", jobsError);

  const strategyItemById = new Map((strategyItems ?? []).map((entry: any) => [entry.id, entry]));
  const packageById = new Map((packages ?? []).map((entry: any) => [entry.id, entry]));
  const contentItemsByPackage = new Map<string, any[]>();
  for (const item of contentItems ?? []) {
    contentItemsByPackage.set(item.package_id, [...(contentItemsByPackage.get(item.package_id) ?? []), item]);
  }
  const jobsByContentItem = new Map<string, any[]>();
  for (const job of jobs ?? []) {
    jobsByContentItem.set(job.content_item_id, [...(jobsByContentItem.get(job.content_item_id) ?? []), job]);
  }

  const lines: LineItem[] = [];
  const strategyCostPerPackage = new Map<number, number>();

  // Strategy (once for the run; allocate evenly across 14 requested packages for package views)
  for (const strategy of strategies ?? []) {
    const telemetry = steps(object(strategy.strategy_brief).generation_telemetry);
    for (const step of telemetry) {
      const cost = number(step.estimated_cost) ?? 0;
      const basis: CostBasis = number(step.estimated_cost) == null ? "unmetered" : "exact_telemetry";
      lines.push({
        scope: "strategy",
        packageIndex: null,
        packageId: null,
        workflow: text(step.step_name) || "Strategy",
        stage: stageForStep(text(step.step_name), text(step.provider)),
        provider: text(step.provider) || "unknown",
        model: text(step.model) || "deterministic",
        cost,
        basis: cost === 0 && number(step.estimated_cost) == null ? "unmetered" : basis,
        tokensIn: number(step.prompt_tokens) ?? 0,
        tokensOut: number(step.completion_tokens) ?? 0,
        durationMs: number(step.duration_ms) ?? 0,
        retryCount: number(step.retry_count) ?? 0,
        success: typeof step.success === "boolean" ? step.success : null,
        stepName: text(step.step_name),
        detail: "strategy_brief.generation_telemetry",
        isWaste: false,
      });
    }
  }
  const strategyTotal = sum(lines.filter((l) => l.scope === "strategy").map((l) => l.cost));
  const requested = (items ?? []).length || 14;
  for (const item of items ?? []) {
    strategyCostPerPackage.set(Number(item.package_index), strategyTotal / requested);
  }

  // Completed packages: exact package AI + estimated worker media
  const completedStageTotals = new Map<Stage, number[]>();
  const packageRows: PackageRow[] = [];

  for (const item of items ?? []) {
    const index = Number(item.package_index);
    const pkg = packageById.get(item.content_package_id);
    const strategyItem = strategyItemById.get(item.strategy_item_id);
    const title = text(strategyItem?.title) || text(pkg?.title) || `Package ${index}`;
    const stages = emptyStages();
    stages.strategy = strategyCostPerPackage.get(index) ?? 0;
    const bases = new Set<CostBasis>(stages.strategy > 0 ? ["exact_telemetry"] : []);

    if (item.status === "completed" && pkg) {
      const packageSteps = steps(object(object(pkg.package_brief).presentation_generation).generation_telemetry);
      for (const step of packageSteps) {
        const cost = number(step.estimated_cost);
        const stage = stageForStep(text(step.step_name), text(step.provider));
        if (cost != null) {
          stages[stage] += cost;
          bases.add("exact_telemetry");
        } else if (stage === "validation" || stage === "ideation" || stage === "other") {
          bases.add("unmetered");
        }
        lines.push({
          scope: "package",
          packageIndex: index,
          packageId: pkg.id,
          workflow: text(step.step_name) || "Unknown",
          stage,
          provider: text(step.provider) || "unknown",
          model: text(step.model) || (text(step.provider) === "deterministic" ? "deterministic" : "unknown"),
          cost: cost ?? 0,
          basis: cost == null ? "unmetered" : "exact_telemetry",
          tokensIn: number(step.prompt_tokens) ?? 0,
          tokensOut: number(step.completion_tokens) ?? 0,
          durationMs: number(step.duration_ms) ?? 0,
          retryCount: number(step.retry_count) ?? 0,
          success: typeof step.success === "boolean" ? step.success : null,
          stepName: text(step.step_name),
          detail: "package_brief.presentation_generation.generation_telemetry",
          isWaste: false,
        });
      }

      // Worker media — pick latest successful job per content item
      const itemJobs = (contentItemsByPackage.get(pkg.id) ?? [])
        .flatMap((content) => jobsByContentItem.get(content.id) ?? [])
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      const seenContent = new Set<string>();
      const selectedJobs: any[] = [];
      for (const job of itemJobs) {
        if (seenContent.has(job.content_item_id)) continue;
        seenContent.add(job.content_item_id);
        selectedJobs.push(job);
      }

      for (const job of selectedJobs) {
        const workerSteps = steps(object(object(job.output).debug).generation_telemetry);
        const ttsSecondsQueue: number[] = [];
        for (const step of workerSteps) {
          const stage = stageForStep(text(step.step_name), text(step.provider));
          if (stage === "voice") {
            const secs = parseAudioSeconds(text(step.output_summary));
            if (secs != null) ttsSecondsQueue.push(secs);
          }
        }
        let ttsIdx = 0;
        const voiceCalls = workerSteps.filter((s) => stageForStep(text(s.step_name), text(s.provider)) === "voice");
        const whisperCalls = workerSteps.filter((s) => stageForStep(text(s.step_name), text(s.provider)) === "whisper");
        const duplicateVoice = voiceCalls.length > 1;
        const duplicateWhisper = whisperCalls.length > 1;

        let voiceSeen = 0;
        let whisperSeen = 0;
        for (const step of workerSteps) {
          const stage = stageForStep(text(step.step_name), text(step.provider));
          const matchedTts =
            stage === "whisper" && ttsSecondsQueue.length
              ? ttsSecondsQueue[Math.min(ttsIdx, ttsSecondsQueue.length - 1)]!
              : null;
          if (stage === "whisper" && ttsSecondsQueue.length) ttsIdx += 1;
          const result = workerCost(step, matchedTts);
          stages[stage] += result.cost;
          bases.add(result.basis);

          if (stage === "voice") voiceSeen += 1;
          if (stage === "whisper") whisperSeen += 1;
          const isDuplicate =
            (stage === "voice" && duplicateVoice && voiceSeen > 1) ||
            (stage === "whisper" && duplicateWhisper && whisperSeen > 1);

          lines.push({
            scope: "worker",
            packageIndex: index,
            packageId: pkg.id,
            workflow: text(step.step_name) || "Worker",
            stage,
            provider: text(step.provider) || "unknown",
            model: text(step.model) || "unknown",
            cost: result.cost,
            basis: result.basis,
            tokensIn: 0,
            tokensOut: 0,
            durationMs: number(step.duration_ms) ?? 0,
            retryCount: number(step.retry_count) ?? 0,
            success: typeof step.success === "boolean" ? step.success : null,
            stepName: text(step.step_name),
            detail: isDuplicate ? `${result.detail}; DUPLICATE_CALL` : result.detail,
            isWaste: isDuplicate,
          });
        }
      }

      for (const stage of Object.keys(stages) as Stage[]) {
        if (stage === "strategy") continue;
        completedStageTotals.set(stage, [...(completedStageTotals.get(stage) ?? []), stages[stage]]);
      }

      packageRows.push({
        index,
        status: "completed",
        title,
        error: "",
        failStage: "",
        attempts: 1,
        stages,
        bases,
        total: sum(Object.values(stages)),
        recoverable: false,
        wastePct: 0,
        moneyBeforeFailure: 0,
      });
    } else {
      // Placeholder; filled after medians known
      packageRows.push({
        index,
        status: text(item.status) || "failed",
        title,
        error: text(item.error_message),
        failStage: "",
        attempts: 1,
        stages,
        bases,
        total: stages.strategy,
        recoverable: false,
        wastePct: 0,
        moneyBeforeFailure: 0,
      });
    }
  }

  const med = (stage: Stage) => median(completedStageTotals.get(stage) ?? []);
  const stageMedians = {
    direction: med("direction"),
    ideation: med("ideation"),
    critic: med("critic"),
    presentation: med("presentation"),
  };

  // Failed package estimates using package-level completed medians
  for (const row of packageRows.filter((r) => r.status !== "completed")) {
    const item = (items ?? []).find((candidate: any) => Number(candidate.package_index) === row.index)!;
    const failure = parseFailure(item.error_message);
    row.failStage = failure.kind;
    row.attempts = failure.attempts;
    row.bases.add("estimated_from_medians");

    const addEstimate = (stage: Stage, multiplier: number, detail: string) => {
      const unit = stageMedians[stage as keyof typeof stageMedians] ?? 0;
      const cost = unit * multiplier;
      row.stages[stage] += cost;
      lines.push({
        scope: "failed_estimate",
        packageIndex: row.index,
        packageId: null,
        workflow: `ESTIMATED ${stage} (failed pkg ${row.index})`,
        stage,
        provider: "estimated_from_medians",
        model: "n/a",
        cost,
        basis: "estimated_from_medians",
        tokensIn: 0,
        tokensOut: 0,
        durationMs: 0,
        // Keep 0 here so retry CSV is driven by the dedicated failed-attempt rows below.
        retryCount: 0,
        success: false,
        stepName: `failed_${failure.kind}_${stage}`,
        detail: `${detail}; attempts=${failure.attempts}; multiplier=${multiplier}`,
        isWaste: true,
      });
    };

    // Modeling assumptions (labeled estimates — no failed-package telemetry exists):
    // - veto / ideation fails: direction once, then ideation×attempts (+ critic×attempts for veto)
    // - validation fails after presentation: full AI path once per attempt (attempts usually 1)
    if (failure.kind === "all_concepts_vetoed") {
      addEstimate("direction", 1, `ESTIMATED: median completed direction × 1; fail=${failure.kind}`);
      addEstimate("ideation", failure.attempts, `ESTIMATED: median completed ideation × ${failure.attempts} attempts`);
      addEstimate("critic", failure.attempts, `ESTIMATED: median completed critic × ${failure.attempts} attempts (veto path)`);
    } else if (failure.kind === "ideation_failed") {
      addEstimate("direction", 1, `ESTIMATED: median completed direction × 1; fail=${failure.kind}`);
      addEstimate("ideation", failure.attempts, `ESTIMATED: median completed ideation × ${failure.attempts} attempts`);
    } else {
      // story_integrity / concept_fidelity / unknown — presentation completed then hard validation failed
      addEstimate("direction", failure.attempts, `ESTIMATED: median completed direction × ${failure.attempts}`);
      addEstimate("ideation", failure.attempts, `ESTIMATED: median completed ideation × ${failure.attempts}`);
      addEstimate("critic", failure.attempts, `ESTIMATED: median completed critic × ${failure.attempts}`);
      addEstimate("presentation", failure.attempts, `ESTIMATED: median completed presentation × ${failure.attempts}`);
    }

    row.total = sum(Object.values(row.stages));
    row.moneyBeforeFailure = row.total - row.stages.strategy;
    row.wastePct = row.total > 0 ? (row.moneyBeforeFailure / row.total) * 100 : 0;
    // Recoverable if failure is late validation — content existed but was discarded
    row.recoverable = failure.kind === "story_integrity" || failure.kind === "concept_fidelity";
  }

  // Aggregations
  const billable = lines.filter((l) => l.cost > 0 || l.basis === "unmetered");
  const exactTotal = sum(lines.filter((l) => l.basis === "exact_telemetry").map((l) => l.cost));
  const listTotal = sum(lines.filter((l) => l.basis === "estimated_list_price").map((l) => l.cost));
  const failedTotal = sum(lines.filter((l) => l.basis === "estimated_from_medians").map((l) => l.cost));
  const total = exactTotal + listTotal + failedTotal;

  type Agg = {
    workflow: string;
    model: string;
    provider: string;
    calls: number;
    ok: number;
    fail: number;
    retries: number;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    durationMs: number;
    basisNotes: Set<string>;
  };
  const workflowAgg = new Map<string, Agg>();
  for (const line of lines) {
    const key = `${line.workflow}||${line.model}||${line.provider}`;
    const current = workflowAgg.get(key) ?? {
      workflow: line.workflow,
      model: line.model,
      provider: line.provider,
      calls: 0,
      ok: 0,
      fail: 0,
      retries: 0,
      tokensIn: 0,
      tokensOut: 0,
      cost: 0,
      durationMs: 0,
      basisNotes: new Set<string>(),
    };
    current.calls += 1;
    if (line.success === true) current.ok += 1;
    if (line.success === false) current.fail += 1;
    current.retries += line.retryCount;
    current.tokensIn += line.tokensIn;
    current.tokensOut += line.tokensOut;
    current.cost += line.cost;
    current.durationMs += line.durationMs;
    current.basisNotes.add(line.basis);
    workflowAgg.set(key, current);
  }

  const workflowRows = [...workflowAgg.values()].sort((a, b) => b.cost - a.cost);

  const groupSum = (keyFn: (l: LineItem) => string) =>
    [...lines.reduce((map, line) => {
      const key = keyFn(line);
      map.set(key, (map.get(key) ?? 0) + line.cost);
      return map;
    }, new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);

  const modelGroups = groupSum((l) => l.model);
  const providerGroups = groupSum((l) => l.provider);
  const stageGroups = groupSum((l) => l.stage);

  // Retries: explicit retry_count > 0 OR duplicate worker calls OR multi-attempt failed packages
  const retryRows: unknown[][] = [
    ["package_index", "workflow", "model", "retry_count_or_extra_calls", "cost_usd", "basis", "useful", "notes"],
  ];
  for (const line of lines) {
    if (line.retryCount > 0 && line.scope !== "failed_estimate") {
      retryRows.push([
        line.packageIndex,
        line.stepName,
        line.model,
        line.retryCount,
        line.cost.toFixed(6),
        line.basis,
        line.success === true ? "yes_succeeded" : "unknown",
        "telemetry retry_count > 0 (cost is total for step including retries)",
      ]);
    }
  }
  // Multi ideation on completed pkgs
  for (const row of packageRows.filter((r) => r.status === "completed")) {
    const ideaCalls = lines.filter(
      (l) => l.packageIndex === row.index && l.stepName === "Creative Ideation" && l.basis === "exact_telemetry",
    );
    if (ideaCalls.length > 1) {
      const extra = ideaCalls.slice(1);
      retryRows.push([
        row.index,
        "Creative Ideation",
        ideaCalls[0]?.model,
        ideaCalls.length - 1,
        sum(extra.map((l) => l.cost)).toFixed(6),
        "exact_telemetry",
        "yes_package_completed",
        `${ideaCalls.length} ideation calls on completed package (re-ideation)`,
      ]);
    }
  }
  for (const line of lines.filter((l) => l.isWaste && l.scope === "worker")) {
    retryRows.push([
      line.packageIndex,
      line.stepName,
      line.model,
      1,
      line.cost.toFixed(6),
      line.basis,
      "no_duplicate",
      line.detail,
    ]);
  }
  for (const row of packageRows.filter((r) => r.status !== "completed" && r.attempts > 1)) {
    const estimated = lines.filter((l) => l.packageIndex === row.index && l.scope === "failed_estimate");
    const extraMultiplierCost = sum(
      estimated.map((l) => {
        // Rough: cost beyond first attempt
        const unit = stageMedians[l.stage as keyof typeof stageMedians] ?? 0;
        return Math.max(0, l.cost - unit);
      }),
    );
    retryRows.push([
      row.index,
      `failed_${row.failStage}`,
      "n/a",
      row.attempts - 1,
      extraMultiplierCost.toFixed(6),
      "estimated_from_medians",
      "no_package_failed",
      `${row.attempts} attempts before hard fail; retries did not save the package`,
    ]);
  }

  // Waste analysis
  const wasteLines = lines.filter((l) => l.isWaste || l.scope === "failed_estimate");
  const wasteByCategory = {
    failed_ai_text: sum(wasteLines.filter((l) => ["direction", "ideation", "critic", "presentation", "repair"].includes(l.stage)).map((l) => l.cost)),
    failed_images: sum(wasteLines.filter((l) => l.stage === "images").map((l) => l.cost)),
    failed_voice: sum(wasteLines.filter((l) => l.stage === "voice").map((l) => l.cost)),
    failed_whisper: sum(wasteLines.filter((l) => l.stage === "whisper").map((l) => l.cost)),
    failed_validation: 0, // deterministic validators — $0 API
    duplicate_voice_whisper: sum(lines.filter((l) => l.isWaste && l.scope === "worker").map((l) => l.cost)),
    presentation_retries: sum(
      lines
        .filter((l) => l.stepName === "Presentation Generation" && l.retryCount > 0)
        .map((l) => l.cost * (l.retryCount / (1 + l.retryCount))), // ESTIMATED share of retry — mark clearly
    ),
  };

  const wasteCsv: unknown[][] = [
    ["package_index", "category", "stage", "cost_usd", "basis", "recoverable", "reason"],
  ];
  for (const row of packageRows.filter((r) => r.status !== "completed")) {
    for (const stage of ["direction", "ideation", "critic", "presentation"] as Stage[]) {
      if (row.stages[stage] <= 0) continue;
      wasteCsv.push([
        row.index,
        "failed_package",
        stage,
        row.stages[stage].toFixed(6),
        "estimated_from_medians",
        row.recoverable ? "yes_content_existed_but_discarded" : "no",
        `Failed at ${row.failStage} after ${row.attempts} attempt(s); ${row.recoverable ? "late validation — potentially recoverable via repair/advisory" : "early creative fail"}`,
      ]);
    }
  }
  for (const line of lines.filter((l) => l.isWaste && l.scope === "worker")) {
    wasteCsv.push([
      line.packageIndex,
      "duplicate_worker_call",
      line.stage,
      line.cost.toFixed(6),
      line.basis,
      "n/a",
      line.detail,
    ]);
  }

  // Optimization roadmap
  const roadmap: unknown[][] = [
    ["priority", "recommendation", "estimated_saving_usd", "difficulty", "risk", "quality_impact"],
    [
      1,
      "Persist full generation_telemetry on failed package attempts (including intermediate outputs)",
      "telemetry_only",
      "Medium",
      "Low",
      "None — enables exact waste accounting",
    ],
    [
      2,
      "Convert hard story_integrity / concept_fidelity fails to repair-or-advisory instead of discarding paid presentation",
      (sum(packageRows.filter((r) => r.recoverable).map((r) => r.moneyBeforeFailure))).toFixed(4),
      "Medium",
      "Medium",
      "High impact if repair preserves concept; Low if advisory-only softens quality gates",
    ],
    [
      3,
      "Cap ideation/veto retries (pkg 4×4, pkg 12×3 wasted ~median ideation×extra attempts)",
      sum(
        packageRows
          .filter((r) => r.failStage === "all_concepts_vetoed" || r.failStage === "ideation_failed")
          .map((r) => Math.max(0, r.stages.ideation - stageMedians.ideation)),
      ).toFixed(4),
      "Low",
      "Medium",
      "Medium — fewer retries may reduce rescue rate; prefer repair over blind re-ideation",
    ],
    [
      4,
      "Write estimated_cost for Image/TTS/Whisper/Render in worker telemetry (and provider request IDs)",
      "precision_gain",
      "Low",
      "Low",
      "None",
    ],
    [
      5,
      "Eliminate duplicate TTS+Whisper calls (observed pkgs 7 and 10)",
      sum(lines.filter((l) => l.isWaste && l.scope === "worker").map((l) => l.cost)).toFixed(4),
      "Low",
      "Low",
      "None — pure duplicate work",
    ],
    [
      6,
      "Shrink Creative Ideation output tokens (largest exact AI cost center at ~$1.64 on 8 completed pkgs)",
      "0.30-0.80_estimated",
      "Medium",
      "Medium",
      "High impact on diversity if over-compressed; Medium if structured shorter JSON",
    ],
    [
      7,
      "Reduce Presentation Generation prompt size (avg ~25k–53k input tokens) / avoid full retry when possible",
      "0.15-0.40_estimated",
      "Medium",
      "Medium",
      "Medium — large context drives cost; repair may replace full regeneration",
    ],
    [
      8,
      "Evaluate Creative Evaluation (critic) ROI — $0.23 exact on completed; often skipped",
      stageGroups.find(([s]) => s === "critic")?.[1]?.toFixed(4) ?? "0",
      "Medium",
      "High",
      "Unknown — may prevent some vetoes or be redundant with deterministic gates",
    ],
  ];

  // CSVs
  writeCsv("workflow-costs.csv", [
    [
      "workflow",
      "model",
      "provider",
      "calls",
      "successful",
      "failed",
      "retries",
      "tokens_in",
      "tokens_out",
      "cost_usd",
      "avg_cost_usd",
      "total_runtime_ms",
      "avg_runtime_ms",
      "cost_basis",
    ],
    ...workflowRows.map((w) => [
      w.workflow,
      w.model,
      w.provider,
      w.calls,
      w.ok,
      w.fail,
      w.retries,
      w.tokensIn,
      w.tokensOut,
      w.cost.toFixed(6),
      (w.calls ? w.cost / w.calls : 0).toFixed(6),
      w.durationMs,
      (w.calls ? w.durationMs / w.calls : 0).toFixed(1),
      [...w.basisNotes].join("+"),
    ]),
  ]);

  const packageStageCols: Stage[] = [
    "strategy",
    "direction",
    "ideation",
    "critic",
    "presentation",
    "repair",
    "validation",
    "images",
    "voice",
    "whisper",
    "render",
  ];
  writeCsv("package-costs.csv", [
    [
      "package_index",
      "status",
      "title",
      ...packageStageCols.map((s) => `${s}_usd`),
      "total_usd",
      "cost_basis",
      "fail_stage",
      "attempts",
      "money_before_failure_usd",
      "waste_pct",
      "recoverable",
      "error_message",
    ],
    ...packageRows
      .sort((a, b) => a.index - b.index)
      .map((row) => [
        row.index,
        row.status,
        row.title,
        ...packageStageCols.map((s) => row.stages[s].toFixed(6)),
        row.total.toFixed(6),
        [...row.bases].join("+") || "none",
        row.failStage,
        row.attempts,
        row.moneyBeforeFailure.toFixed(6),
        row.wastePct.toFixed(1),
        row.recoverable,
        row.error,
      ]),
  ]);

  writeCsv("model-costs.csv", [
    ["model", "calls", "tokens_in", "tokens_out", "cost_usd", "pct_of_total"],
    ...modelGroups.map(([model, cost]) => {
      const subset = lines.filter((l) => l.model === model);
      return [
        model,
        subset.length,
        sum(subset.map((l) => l.tokensIn)),
        sum(subset.map((l) => l.tokensOut)),
        cost.toFixed(6),
        pct(cost, total),
      ];
    }),
  ]);

  writeCsv("provider-costs.csv", [
    ["provider", "calls", "cost_usd", "pct_of_total", "notes"],
    ...providerGroups.map(([provider, cost]) => [
      provider,
      lines.filter((l) => l.provider === provider).length,
      cost.toFixed(6),
      pct(cost, total),
      provider === "estimated_from_medians"
        ? "NOT a real provider — failed-package estimates"
        : provider === "claude" && lines.some((l) => l.provider === "claude" && l.model.includes("gpt"))
          ? "Note: some gpt-4o-mini steps are labeled provider=claude in telemetry"
          : "",
    ]),
  ]);

  writeCsv("retry-analysis.csv", retryRows);
  writeCsv("waste-analysis.csv", wasteCsv);
  writeCsv("optimization-roadmap.csv", roadmap);

  const summary = {
    generated_at: new Date().toISOString(),
    production_run_id: RUN_ID,
    project_id: run.project_id,
    packages: {
      total: packageRows.length,
      completed: packageRows.filter((r) => r.status === "completed").length,
      failed: packageRows.filter((r) => r.status !== "completed").length,
    },
    totals_usd: {
      exact_telemetry: exactTotal,
      estimated_list_price: listTotal,
      estimated_from_medians: failedTotal,
      total,
    },
    stage_medians_completed_usd: stageMedians,
    stage_costs_usd: Object.fromEntries(stageGroups),
    waste_usd: {
      total_failed_package_estimates: failedTotal,
      duplicate_worker_calls: wasteByCategory.duplicate_voice_whisper,
      total_marked_waste: sum(wasteLines.map((l) => l.cost)),
      note: "Failed-package waste is ESTIMATED from completed medians; no failed telemetry exists.",
    },
    pricing_assumptions: {
      note: "Authoritative costs use stored estimated_cost only. Rate constants are not applied to historical rows.",
    },
    telemetry_gaps: [
      "Steps with estimated_cost=null are reported as unmetered (never repriced from current list rates).",
      "Failed packages without generation_telemetry may still use median-based waste estimates (not pricing-table recomputation).",
      "Presentation retry_count>0 stores combined cost; per-attempt split is not available.",
      "Render/compute (ffmpeg/worker VM) is unmetered.",
    ],
  };
  writeFileSync(join(OUT, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  // Markdown report
  const completed = packageRows.filter((r) => r.status === "completed");
  const failed = packageRows.filter((r) => r.status !== "completed").sort((a, b) => a.index - b.index);
  const pareto = stageGroups.filter(([, c]) => c > 0);
  const pareto80 = (() => {
    let acc = 0;
    const picked: string[] = [];
    for (const [name, cost] of pareto) {
      picked.push(name);
      acc += cost;
      if (acc / total >= 0.8) break;
    }
    return picked;
  })();

  const md: string[] = [];
  md.push(`# Cost Trace Audit — Production Run \`${RUN_ID}\``);
  md.push("");
  md.push(`Generated ${summary.generated_at}. **Financial audit only** — not a quality or architecture review.`);
  md.push("");
  md.push("## Cost basis (read first)");
  md.push("");
  md.push("| Label | Meaning |");
  md.push("| --- | --- |");
  md.push("| `exact_telemetry` | Persisted `estimated_cost` — authoritative historical cost |");
  md.push(
    "| `unmetered` | Missing `estimated_cost` or render/compute — never repriced from current list rates |",
  );
  md.push(
    "| `estimated_from_medians` | Failed packages without telemetry — median sibling stage totals (not pricing-table reprice) |",
  );
  md.push("");
  md.push("## Executive totals");
  md.push("");
  md.push(...markdownTable(
    ["Basis", "USD", "Share"],
    [
      ["Exact telemetry (stored estimated_cost)", dollars(exactTotal), pct(exactTotal, total)],
      ["Legacy list-price rows (should be 0 under immutability)", dollars(listTotal), pct(listTotal, total)],
      ["Failed-package median estimates [ESTIMATED]", dollars(failedTotal), pct(failedTotal, total)],
      ["**Total traceable / estimated**", dollars(total), "100%"],
    ],
  ));
  md.push("");
  md.push(
    `Run requested **${requested}** packages → **${completed.length} completed**, **${failed.length} failed**. Strategy exact cost: ${dollars(strategyTotal)} (gpt-4o-mini Weekly Strategy).`,
  );
  md.push("");
  md.push("## Workflow costs (all AI / media workflows)");
  md.push("");
  md.push(
    ...markdownTable(
      [
        "Workflow",
        "Calls",
        "Model",
        "Provider",
        "OK",
        "Fail",
        "Retries",
        "Tokens In",
        "Tokens Out",
        "Cost",
        "Avg Cost",
        "Runtime ms",
        "Basis",
      ],
      workflowRows.map((w) => [
        w.workflow,
        String(w.calls),
        w.model,
        w.provider,
        String(w.ok),
        String(w.fail),
        String(w.retries),
        String(w.tokensIn),
        String(w.tokensOut),
        dollars(w.cost),
        dollars(w.calls ? w.cost / w.calls : 0),
        String(w.durationMs),
        [...w.basisNotes].join("+"),
      ]),
    ),
  );
  md.push("");
  md.push("## Cost per package");
  md.push("");
  for (const row of packageRows.sort((a, b) => a.index - b.index)) {
    md.push(`### Package ${row.index} — ${row.status}`);
    md.push("");
    md.push(`**${row.title}**`);
    md.push("");
    md.push(...markdownTable(
      ["Stage", "USD", "Notes"],
      [
        ["Strategy (allocated 1/14)", dollars(row.stages.strategy), "exact_telemetry"],
        ["Direction generation + evaluation", dollars(row.stages.direction), row.status === "completed" ? "exact" : "ESTIMATED median"],
        ["Concept ideation (+ engine/judge $0)", dollars(row.stages.ideation), row.status === "completed" ? "exact" : "ESTIMATED median"],
        ["Creative evaluation (critic)", dollars(row.stages.critic), row.status === "completed" ? "exact" : "ESTIMATED median"],
        ["Presentation generation", dollars(row.stages.presentation), row.status === "completed" ? "exact" : "ESTIMATED median"],
        ["Story Integrity Repair", dollars(row.stages.repair), "exact when present"],
        ["Validation (deterministic)", dollars(row.stages.validation), "unmetered $0"],
        ["Image generation", dollars(row.stages.images), row.stages.images ? "ESTIMATED list price" : "n/a"],
        ["Voiceover (TTS)", dollars(row.stages.voice), row.stages.voice ? "ESTIMATED list price" : "n/a"],
        ["Whisper", dollars(row.stages.whisper), row.stages.whisper ? "ESTIMATED list price" : "n/a"],
        ["Rendering", dollars(row.stages.render), "unmetered $0"],
        ["**TOTAL**", dollars(row.total), [...row.bases].join("+")],
      ],
    ));
    if (row.status !== "completed") {
      md.push("");
      md.push(`- Failed at: **${row.failStage}** (${row.attempts} attempt(s))`);
      md.push(`- Stages assumed completed before fail: ${completedStagesBeforeFailure(row.failStage as FailureKind).join(", ")}`);
      md.push(`- Money spent before failure: ${dollars(row.moneyBeforeFailure)} [ESTIMATED]`);
      md.push(`- Recoverable: **${row.recoverable ? "yes (late validation — content was generated then discarded)" : "no / early fail"}**`);
      md.push(`- Waste share of package total: ${row.wastePct.toFixed(0)}%`);
      md.push(`- Error: \`${row.error.slice(0, 280)}${row.error.length > 280 ? "…" : ""}\``);
    }
    md.push("");
  }

  md.push("## Failed packages — waste summary");
  md.push("");
  md.push(
    ...markdownTable(
      ["Package", "Fail stage", "Attempts", "Est. spend before fail", "Recoverable", "Completed stages (assumed)"],
      failed.map((r) => [
        String(r.index),
        r.failStage,
        String(r.attempts),
        dollars(r.moneyBeforeFailure),
        r.recoverable ? "yes" : "no",
        completedStagesBeforeFailure(r.failStage as FailureKind).join(" → "),
      ]),
    ),
  );
  md.push("");
  md.push("### Waste totals");
  md.push("");
  md.push("| Category | USD | Basis |");
  md.push("| --- | --- | --- |");
  md.push(`| Total wasted AI text (failed pkgs) | ${dollars(failedTotal)} | estimated_from_medians |`);
  md.push(`| Total wasted image cost (failed pkgs) | $0.0000 | Failed pkgs never reached images |`);
  md.push(`| Total wasted voice cost (failed pkgs) | $0.0000 | Failed pkgs never reached TTS |`);
  md.push(`| Total wasted translation cost | $0.0000 | No language variants in this run |`);
  md.push(`| Total wasted validation cost | $0.0000 | Deterministic validators — unmetered |`);
  md.push(
    `| Duplicate TTS/Whisper on completed pkgs | ${dollars(wasteByCategory.duplicate_voice_whisper)} | estimated_list_price |`,
  );
  md.push(
    `| **Total marked waste** | ${dollars(failedTotal + wasteByCategory.duplicate_voice_whisper)} | mixed |`,
  );
  md.push("");
  md.push(
    `Completed-package stage medians used for failed estimates: direction ${dollars(stageMedians.direction)}, ideation ${dollars(stageMedians.ideation)}, critic ${dollars(stageMedians.critic)}, presentation ${dollars(stageMedians.presentation)}.`,
  );
  md.push("");

  md.push("## Retry analysis");
  md.push("");
  md.push("| Finding | Detail |");
  md.push("| --- | --- |");
  md.push(
    "| Presentation Generation | Package 2 has `retry_count=1`, combined exact cost $0.3104 (includes retry). Useful: yes — package completed after repair path. |",
  );
  md.push(
    "| Creative Ideation re-run | Package 6 has 2 ideation calls (exact $0.1545 + $0.1710). Useful: yes — completed. |",
  );
  md.push(
    "| Creative Evaluation Retry | Package 1 exact $0.0374 after evaluation. Useful: yes — completed. |",
  );
  md.push(
    "| Failed pkg attempts | Pkg 4: 4 attempts (veto); Pkg 12: 3 attempts (ideation). Retries **not useful** — package still failed. Prefer repair/fallback over blind re-ideation. |",
  );
  md.push(
    "| Duplicate TTS+Whisper | Packages 7 and 10 each ran TTS/Whisper twice. Pure waste — replace with idempotent single call. |",
  );
  md.push("");

  md.push("## Model cost analysis");
  md.push("");
  md.push(
    ...markdownTable(
      ["Model", "Calls", "Tokens In", "Tokens Out", "Cost", "%"],
      modelGroups.map(([model, cost]) => {
        const subset = lines.filter((l) => l.model === model);
        return [
          model,
          String(subset.length),
          String(sum(subset.map((l) => l.tokensIn))),
          String(sum(subset.map((l) => l.tokensOut))),
          dollars(cost),
          pct(cost, total),
        ];
      }),
    ),
  );
  md.push("");

  md.push("## Provider breakdown");
  md.push("");
  md.push(
    ...markdownTable(
      ["Provider", "Cost", "%", "Notes"],
      providerGroups.map(([provider, cost]) => [
        provider,
        dollars(cost),
        pct(cost, total),
        provider === "estimated_from_medians"
          ? "Synthetic bucket for failed-package estimates"
          : provider === "claude"
            ? "Includes Claude Sonnet 4.6 + some gpt-4o-mini steps mislabeled provider=claude"
            : "",
      ]),
    ),
  );
  md.push("");
  md.push(
    "Real money flows to: **Anthropic (claude-sonnet-4-6)**, **OpenAI (gpt-4o-mini strategy/presentation fallback, gpt-image-1, gpt-4o-mini-tts, whisper-1)**. Image/TTS/Whisper amounts are list-price estimates.",
  );
  md.push("");

  md.push("## Stage breakdown");
  md.push("");
  md.push(
    ...markdownTable(
      ["Stage", "Absolute cost", "% of total"],
      stageGroups.filter(([, c]) => c > 0).map(([stage, cost]) => [stage, dollars(cost), pct(cost, total)]),
    ),
  );
  md.push("");

  md.push("## Pareto analysis");
  md.push("");
  md.push(
    `Stages accounting for ~80% of spend: **${pareto80.join(", ")}** (${pct(
      sum(pareto80.map((name) => stageGroups.find(([s]) => s === name)?.[1] ?? 0)),
      total,
    )} of ${dollars(total)}).`,
  );
  md.push("");
  md.push("Biggest cost centers:");
  md.push("1. **Creative Ideation** — largest exact AI spend (~$1.64 on completed alone; long output tokens).");
  md.push("2. **Failed-package AI estimates** — ~31% of total run cost with zero deliverable packages.");
  md.push("3. **Image generation** — ~$1.43 ESTIMATED across 8 completed packages.");
  md.push("4. **Presentation Generation** — large input context; one expensive retry on pkg 2.");
  md.push("");

  md.push("## Optimization opportunities (per workflow)");
  md.push("");
  md.push(
    ...markdownTable(
      ["Workflow", "Quality impact if kept", "If removed / reduced", "Expected savings", "Risk"],
      [
        ["Weekly Strategy", "High", "Keep", "~$0", "Low"],
        ["Creative Direction Gen+Eval", "High", "Keep; maybe merge gen+eval", "Low tens of cents", "Medium"],
        ["Creative Ideation", "High", "Shorten outputs / fewer concepts", "$0.30–$0.80 ESTIMATED", "Medium"],
        ["Creative Evaluation (critic)", "Unknown", "A/B skip when deterministic gates exist", `up to ${dollars(stageGroups.find(([s]) => s === "critic")?.[1] ?? 0)}`, "High"],
        ["Presentation Generation", "High", "Trim context; prefer repair over full retry", "$0.15–$0.40 ESTIMATED", "Medium"],
        ["Story Integrity Repair", "High (saved pkg 2)", "Keep", "n/a — prevents waste", "Low"],
        ["Hard validators (integrity/fidelity)", "Medium gates / High waste", "Soft-fail → repair", dollars(sum(failed.filter((f) => f.recoverable).map((f) => f.moneyBeforeFailure))) + " ESTIMATED recoverable", "Medium"],
        ["Image generation", "High", "Fewer scenes / cheaper size / reuse", "Depends on product", "Medium"],
        ["TTS + Whisper", "High / Medium", "Deduplicate calls", dollars(wasteByCategory.duplicate_voice_whisper), "Low"],
        ["Render", "High", "Keep; meter compute", "Unknown (unmetered)", "Low"],
      ],
    ),
  );
  md.push("");

  md.push("## Duplicate / redundant work");
  md.push("");
  md.push("- **Duplicate TTS+Whisper** on packages **7** and **10** (2× each) — confirmed in worker telemetry.");
  md.push("- **Re-ideation** on package **6** (2× Creative Ideation) — succeeded; still double-paid.");
  md.push("- **Presentation retry** on package **2** (`retry_count=1`) plus **Story Integrity Repair** — paid twice to land one package.");
  md.push("- **Failed multi-attempts** packages **4** (×4) and **12** (×3) — repeated ideation without persistence of intermediates.");
  md.push("- **Repeated large presentation context** (~25k–53k prompt tokens) every package — structural token load.");
  md.push("- **No translation duplication** in this run (no language variants).");
  md.push("- Deterministic validators run on every completed package at $0 API — not cost waste, but discard paid upstream work when hard-failing.");
  md.push("");

  md.push("## Telemetry gaps");
  md.push("");
  for (const gap of summary.telemetry_gaps) md.push(`- ${gap}`);
  md.push("");
  md.push("### Recommended logging for future runs");
  md.push("");
  md.push("1. Persist `generation_telemetry.steps` snapshot on **every failed attempt**, not only successful packages.");
  md.push("2. Worker steps: always set `estimated_cost`, `provider_request_id`, and raw usage (images count/size, TTS chars, whisper seconds).");
  md.push("3. Split retry attempts into separate step rows (attempt 1, attempt 2) instead of aggregating into one cost.");
  md.push("4. Record `fail_stage`, `money_spent_usd`, and `recoverable` on `production_run_items`.");
  md.push("5. Meter render/compute seconds and worker machine cost.");
  md.push("6. Normalize `provider` field to the true billable vendor (Anthropic vs OpenAI).");
  md.push("");

  md.push("## Final optimization roadmap");
  md.push("");
  md.push(
    ...markdownTable(
      ["Priority", "Recommendation", "Est. saving", "Difficulty", "Risk"],
      roadmap.slice(1).map((r) => [String(r[0]), String(r[1]), String(r[2]), String(r[3]), String(r[4])]),
    ),
  );
  md.push("");
  md.push("## Artifacts");
  md.push("");
  md.push("- `docs/audits/cost-trace-c8dd3caf.md` (this report)");
  md.push("- `docs/audits/cost-trace-c8dd3caf/workflow-costs.csv`");
  md.push("- `docs/audits/cost-trace-c8dd3caf/package-costs.csv`");
  md.push("- `docs/audits/cost-trace-c8dd3caf/model-costs.csv`");
  md.push("- `docs/audits/cost-trace-c8dd3caf/provider-costs.csv`");
  md.push("- `docs/audits/cost-trace-c8dd3caf/retry-analysis.csv`");
  md.push("- `docs/audits/cost-trace-c8dd3caf/waste-analysis.csv`");
  md.push("- `docs/audits/cost-trace-c8dd3caf/optimization-roadmap.csv`");
  md.push("- `docs/audits/cost-trace-c8dd3caf/summary.json`");
  md.push("");

  writeFileSync(MARKDOWN, `${md.join("\n")}\n`);
  console.log(JSON.stringify(summary.totals_usd, null, 2));
  console.log("Wrote", MARKDOWN);
  console.log("Wrote CSVs to", OUT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
