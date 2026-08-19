/**
 * READ-ONLY forensic dump for production run c26ec3c5.
 * Never writes to Supabase; never triggers generation.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const RUN_ID = "c26ec3c5-da27-4a8e-a80c-f5e527510603";
const OUT = resolve("reports/c26ec3c5-artifacts");

function redact(obj: unknown): unknown {
  const s = JSON.stringify(obj);
  const redacted = s
    .replace(
      /https:\/\/[^"\\]*supabase[^"\\]*\/storage\/v1\/object\/sign\/[^"\\?]+\?[^"\\]*/gi,
      "REDACTED_SIGNED_URL",
    )
    .replace(
      /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
      "REDACTED_JWT",
    )
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "REDACTED_KEY")
    .replace(/Bearer [a-zA-Z0-9._-]+/gi, "REDACTED_BEARER");
  return JSON.parse(redacted);
}

function write(name: string, data: unknown) {
  writeFileSync(resolve(OUT, name), JSON.stringify(redact(data), null, 2));
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

type TelStep = Record<string, unknown>;

function collectSteps(root: unknown, source: string): TelStep[] {
  const out: TelStep[] = [];
  const walk = (node: unknown, path: string) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) walk(node[i], `${path}[${i}]`);
      return;
    }
    const r = asRecord(node);
    if (!r) return;
    if (typeof r.step_name === "string" && (r.provider || r.model || r.started_at)) {
      out.push({ ...r, _source: source, _path: path });
    }
    for (const [k, v] of Object.entries(r)) {
      if (k === "_source" || k === "_path") continue;
      if (v && typeof v === "object") walk(v, `${path}.${k}`);
    }
  };
  walk(root, source);
  return out;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { createSupabaseAdminClient } = await import("../lib/supabase/admin");
  const supabase = createSupabaseAdminClient();

  const { data: run, error: runErr } = await supabase
    .from("production_runs")
    .select("*")
    .eq("id", RUN_ID)
    .single();
  if (runErr) throw runErr;
  write("production_run.json", run);

  const { data: items, error: itemsErr } = await supabase
    .from("production_run_items")
    .select("*")
    .eq("production_run_id", RUN_ID);
  if (itemsErr) throw itemsErr;
  write("production_run_items.json", items);

  const item = items![0] as Record<string, unknown>;
  const pkgId = item.content_package_id as string;
  const stratId = item.strategy_item_id as string;

  const { data: pkg } = await supabase
    .from("content_packages")
    .select("*")
    .eq("id", pkgId)
    .single();
  write("content_package.json", pkg);

  const brief = asRecord(pkg?.package_brief) ?? {};
  write("package_brief.json", brief);
  write("presentation_generation.json", brief.presentation_generation ?? null);
  write("image_prompts.json", brief.image_prompts ?? null);
  write("visual_scenes.json", brief.visual_scenes ?? null);
  write("voiceover_text.json", { voiceover_text: brief.voiceover_text });
  write("platform_outputs.json", brief.platform_outputs ?? null);
  write("video_script.json", brief.video ?? null);

  const { data: stratItem } = await supabase
    .from("content_strategy_items")
    .select("*")
    .eq("id", stratId)
    .single();
  write("strategy_item.json", stratItem);

  const { data: strat } = await supabase
    .from("content_strategies")
    .select("*")
    .eq("id", (stratItem as { strategy_id: string }).strategy_id)
    .single();
  write("content_strategy.json", strat);

  const { data: contentItems } = await supabase
    .from("content_items")
    .select("*")
    .eq("package_id", pkgId)
    .order("created_at");
  write("content_items.json", contentItems);

  const { data: videoJobs } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("package_id", pkgId)
    .order("created_at");
  write("video_jobs.json", videoJobs);

  // Slim video job debug for forensics
  for (const job of videoJobs ?? []) {
    const j = job as Record<string, unknown>;
    const output = asRecord(j.output) ?? {};
    const input = asRecord(j.input) ?? {};
    write(`video_job_${j.id}_slim.json`, {
      id: j.id,
      status: j.status,
      created_at: j.created_at,
      updated_at: j.updated_at,
      error_message: j.error_message,
      input_keys: Object.keys(input),
      output_keys: Object.keys(output),
      debug: output.debug ?? null,
      render_spec: output.render_spec ?? j.render_spec ?? null,
      scenes: input.scenes ?? output.scenes ?? null,
      voice: input.voice ?? null,
      tts: output.tts ?? null,
      whisper: output.whisper ?? null,
      images: output.images ?? null,
      ffmpeg: output.ffmpeg ?? null,
      cost: output.cost ?? output.estimated_cost ?? null,
    });
  }

  const { data: assetUsage } = await supabase
    .from("asset_usage")
    .select("*")
    .eq("package_id", pkgId);
  write("asset_usage.json", assetUsage ?? []);

  const { data: project } = await supabase
    .from("projects")
    .select("id,name,default_voice,visual_profile")
    .eq("id", run.project_id)
    .single();
  write("project_snapshot.json", project);

  // Telemetry aggregation
  const failTel = asRecord(item.failure_telemetry) ?? {};
  write("failure_telemetry.json", failTel);

  const stratBrief = asRecord(
    (strat as { strategy_brief?: unknown })?.strategy_brief,
  );
  write("strategy_brief.json", stratBrief);

  const allSteps: TelStep[] = [];
  allSteps.push(...collectSteps(stratBrief?.generation_telemetry, "strategy"));
  allSteps.push(
    ...collectSteps(failTel.generation_telemetry, "failure_telemetry"),
  );
  allSteps.push(
    ...collectSteps(brief.presentation_generation, "package_success"),
  );
  // Also check strategy item brief
  const itemBrief = asRecord((stratItem as { brief?: unknown })?.brief);
  write("strategy_item_brief.json", itemBrief);
  allSteps.push(
    ...collectSteps(itemBrief?.generation_telemetry, "strategy_item"),
  );
  allSteps.push(
    ...collectSteps(itemBrief?.creative_engine, "strategy_item_creative"),
  );

  // Deduplicate by started_at+step_name+provider+prompt_tokens
  const seen = new Set<string>();
  const unique: TelStep[] = [];
  for (const s of allSteps) {
    const key = [
      s.step_name,
      s.started_at,
      s.finished_at,
      s.provider,
      s.model,
      s.prompt_tokens,
      s.completion_tokens,
      s.estimated_cost,
      s.repair,
      s._source,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(s);
  }
  unique.sort((a, b) =>
    String(a.started_at ?? "").localeCompare(String(b.started_at ?? "")),
  );
  write("all_telemetry_steps.json", unique);

  // Call ledger CSV
  const csvEscape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const headers = [
    "call_index",
    "attempt_index",
    "step_name",
    "provider",
    "model",
    "start_time",
    "end_time",
    "duration_ms",
    "prompt_tokens",
    "completion_tokens",
    "cached_tokens",
    "estimated_cost",
    "repair",
    "retry_count",
    "success",
    "accepted",
    "discarded",
    "failure_reason",
    "input_artifact_path",
    "output_artifact_path",
    "temperature",
    "max_tokens",
    "source",
    "input_summary",
    "output_summary",
    "warnings",
  ];
  const rows: string[] = [headers.join(",")];
  let callIndex = 0;
  for (const s of unique) {
    callIndex += 1;
    const isExternal =
      s.provider === "claude" ||
      s.provider === "openai" ||
      s.provider === "anthropic" ||
      s.provider === "elevenlabs" ||
      typeof s.model === "string";
    // Include deterministic too for waterfall; mark in accepted
    const source = String(s._source ?? "");
    const discarded =
      source === "failure_telemetry" && s.success !== false
        ? "path_discarded"
        : source === "failure_telemetry" && s.success === false
          ? "failed"
          : "";
    const accepted =
      source === "package_success" || source === "strategy"
        ? "true"
        : source === "failure_telemetry"
          ? "false"
          : "";
    const artifactIn = `reports/c26ec3c5-artifacts/call_${String(callIndex).padStart(3, "0")}_meta.json`;
    write(`call_${String(callIndex).padStart(3, "0")}_meta.json`, s);
    rows.push(
      [
        callIndex,
        s.attempt_index ?? s.retry_count ?? "",
        s.step_name,
        s.provider,
        s.model,
        s.started_at,
        s.finished_at,
        s.duration_ms,
        s.prompt_tokens,
        s.completion_tokens,
        s.cached_tokens,
        s.estimated_cost,
        s.repair,
        s.retry_count,
        s.success,
        accepted,
        discarded,
        s.error_message ??
          (Array.isArray(s.warnings) ? (s.warnings as string[]).join(";") : ""),
        artifactIn,
        artifactIn,
        s.temperature,
        s.max_tokens,
        source,
        s.input_summary,
        s.output_summary,
        Array.isArray(s.warnings) ? (s.warnings as string[]).join("|") : "",
      ]
        .map(csvEscape)
        .join(","),
    );
    void isExternal;
  }
  writeFileSync(resolve("reports/c26ec3c5-call-ledger.csv"), rows.join("\n"));

  // Cost/time waterfall
  const wfHeaders = [
    "start",
    "end",
    "step",
    "duration_ms",
    "waiting_or_compute",
    "accepted_or_discarded",
    "estimated_cost",
    "provider",
    "model",
    "source",
  ];
  const wfRows = [wfHeaders.join(",")];
  let prevEnd: string | null = null;
  for (const s of unique) {
    const start = String(s.started_at ?? "");
    if (prevEnd && start && start > prevEnd) {
      const gapMs = Date.parse(start) - Date.parse(prevEnd);
      if (Number.isFinite(gapMs) && gapMs > 50) {
        wfRows.push(
          [
            prevEnd,
            start,
            "GAP",
            gapMs,
            "waiting",
            "n/a",
            "",
            "",
            "",
            "derived",
          ]
            .map(csvEscape)
            .join(","),
        );
      }
    }
    wfRows.push(
      [
        s.started_at,
        s.finished_at,
        s.step_name,
        s.duration_ms,
        s.provider === "deterministic" ? "compute" : "provider",
        String(s._source) === "failure_telemetry" ? "discarded" : "accepted",
        s.estimated_cost,
        s.provider,
        s.model,
        s._source,
      ]
        .map(csvEscape)
        .join(","),
    );
    if (s.finished_at) prevEnd = String(s.finished_at);
  }
  writeFileSync(
    resolve("reports/c26ec3c5-cost-time-waterfall.csv"),
    wfRows.join("\n"),
  );

  // Summary stats
  const costSum = (pred: (s: TelStep) => boolean) =>
    unique
      .filter(pred)
      .reduce((a, s) => a + (Number(s.estimated_cost) || 0), 0);

  const summary = {
    run_id: RUN_ID,
    package_id: pkgId,
    strategy_item_id: stratId,
    video_job_ids: (videoJobs ?? []).map((j: { id: string }) => j.id),
    step_count: unique.length,
    cost_all_steps: costSum(() => true),
    cost_failure_path: costSum((s) => s._source === "failure_telemetry"),
    cost_success_package: costSum((s) => s._source === "package_success"),
    cost_strategy: costSum((s) => String(s._source).startsWith("strategy")),
    failure_telemetry_cost: failTel.estimated_cost_usd,
    failure_attempt_count: failTel.attempt_count,
    failure_error: failTel.error_truncated,
    run_created_at: run.created_at,
    run_updated_at: run.updated_at,
    package_created_at: (pkg as { created_at?: string })?.created_at,
    package_updated_at: (pkg as { updated_at?: string })?.updated_at,
    evidence_note:
      "Raw LLM prompts/responses are NOT stored in telemetry — only input_summary/output_summary, token counts, and measured outputs. Reconstruct from code + stored package fields.",
  };
  write("forensic_summary.json", summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
