/**
 * READ-ONLY comparative dump for two production runs.
 * Never writes to Supabase; never triggers generation.
 *
 * Usage:
 *   npx tsx scripts/compare-production-runs-audit.ts \
 *     <new_run_id> <ref_run_id> [out_dir]
 */
import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  createWriteStream,
} from "node:fs";
import { resolve, join, basename, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

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

const NEW_RUN = process.argv[2]?.trim();
const REF_RUN = process.argv[3]?.trim();
const OUT =
  process.argv[4]?.trim() ||
  resolve(process.cwd(), "docs/audits/run-comparison-c8dd3caf");

if (!NEW_RUN || !REF_RUN) {
  console.error(
    "Usage: npx tsx scripts/compare-production-runs-audit.ts <new> <ref> [out]",
  );
  process.exit(1);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v)))
    return Number(v);
  return null;
}

type TelemetryStep = Record<string, unknown>;

function readSteps(tele: unknown): TelemetryStep[] {
  const r = asRecord(tele);
  if (!r) return [];
  return Array.isArray(r.steps) ? (r.steps as TelemetryStep[]) : [];
}

function summarizeSteps(steps: TelemetryStep[]) {
  let cost = 0;
  let costPresent = false;
  let durationMs = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let retries = 0;
  let repairs = 0;
  let failed = 0;
  const byName: Record<
    string,
    { count: number; cost: number; durationMs: number; retries: number }
  > = {};

  for (const s of steps) {
    const name = String(s.step_name ?? "unknown");
    const c = num(s.estimated_cost);
    const d = num(s.duration_ms) ?? 0;
    const r = num(s.retry_count) ?? 0;
    durationMs += d;
    retries += r;
    if (s.repair === true) repairs += 1;
    if (s.success === false) failed += 1;
    if (c != null) {
      cost += c;
      costPresent = true;
    }
    promptTokens += num(s.prompt_tokens) ?? 0;
    completionTokens += num(s.completion_tokens) ?? 0;
    if (!byName[name])
      byName[name] = { count: 0, cost: 0, durationMs: 0, retries: 0 };
    byName[name].count += 1;
    byName[name].durationMs += d;
    byName[name].retries += r;
    if (c != null) byName[name].cost += c;
  }

  return {
    step_count: steps.length,
    estimated_cost_usd: costPresent ? cost : null,
    duration_ms: durationMs,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    retries,
    repairs,
    failed_steps: failed,
    by_step: byName,
    steps,
  };
}

/** gpt-image-1 medium quality 1024x1536 ≈ $0.07 list (approx). */
const EST_IMAGE_USD = 0.07;
/** gpt-4o-mini-tts ≈ $0.015 / 1k chars (approx from OpenAI). */
const EST_TTS_PER_1K_CHARS = 0.015;

async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) return false;
    await pipeline(Readable.fromWeb(res.body as any), createWriteStream(dest));
    return true;
  } catch {
    return false;
  }
}

async function dumpRun(
  supabase: ReturnType<
    typeof import("@/lib/supabase/admin").createSupabaseAdminClient
  >,
  runId: string,
  label: string,
  outDir: string,
) {
  const runDir = join(outDir, "data", label);
  const assetDir = join(outDir, "assets", label);
  // Keep heavy mp4s outside docs/audits when dumping into that tree.
  const auditSlug = basename(outDir);
  const videoDir = outDir.split(sep).includes("audits")
    ? join(process.cwd(), "exports", auditSlug, "videos", label)
    : join(outDir, "videos", label);
  mkdirSync(runDir, { recursive: true });
  mkdirSync(assetDir, { recursive: true });
  mkdirSync(videoDir, { recursive: true });

  const { data: run, error: runErr } = await supabase
    .from("production_runs")
    .select("*")
    .eq("id", runId)
    .single();
  if (runErr) throw runErr;

  const { data: items, error: itemsErr } = await supabase
    .from("production_run_items")
    .select("*")
    .eq("production_run_id", runId)
    .order("package_index", { ascending: true });
  if (itemsErr) throw itemsErr;

  const packageIds = (items ?? [])
    .map((i) => i.content_package_id)
    .filter(Boolean) as string[];
  const strategyIds = (items ?? [])
    .map((i) => i.strategy_item_id)
    .filter(Boolean) as string[];

  const { data: packages } =
    packageIds.length > 0
      ? await supabase.from("content_packages").select("*").in("id", packageIds)
      : { data: [] as any[] };

  const { data: strategyItems } =
    strategyIds.length > 0
      ? await supabase
          .from("content_strategy_items")
          .select("*")
          .in("id", strategyIds)
      : { data: [] as any[] };

  const { data: contentItems } =
    packageIds.length > 0
      ? await supabase
          .from("content_items")
          .select("*")
          .in("package_id", packageIds)
          .is("language", null)
      : { data: [] as any[] };

  const contentItemIds = (contentItems ?? []).map((c) => c.id);
  const { data: videoJobs } =
    contentItemIds.length > 0
      ? await supabase
          .from("video_jobs")
          .select("*")
          .in("content_item_id", contentItemIds)
          .order("created_at", { ascending: false })
      : { data: [] as any[] };

  const pkgById = new Map((packages ?? []).map((p) => [p.id, p]));
  const stratById = new Map((strategyItems ?? []).map((s) => [s.id, s]));
  const itemsByPkg = new Map<string, any[]>();
  for (const ci of contentItems ?? []) {
    const arr = itemsByPkg.get(ci.package_id) ?? [];
    arr.push(ci);
    itemsByPkg.set(ci.package_id, arr);
  }
  const jobsByItem = new Map<string, any[]>();
  for (const j of videoJobs ?? []) {
    const arr = jobsByItem.get(j.content_item_id) ?? [];
    arr.push(j);
    jobsByItem.set(j.content_item_id, arr);
  }

  const packageReports: any[] = [];
  let runAiCost = 0;
  let runAiCostPresent = false;
  let runEstMediaCost = 0;
  let totalAiCalls = 0;
  let totalRepairs = 0;
  let totalImageGens = 0;
  let totalTts = 0;
  let totalRenders = 0;
  const completedDurationsSec: number[] = [];

  for (const item of items ?? []) {
    const pkg = item.content_package_id
      ? pkgById.get(item.content_package_id)
      : null;
    const strat = item.strategy_item_id
      ? stratById.get(item.strategy_item_id)
      : null;
    const brief = asRecord(pkg?.package_brief) ?? {};
    const pg = asRecord(brief.presentation_generation) ?? {};
    const video = asRecord(brief.video) ?? {};
    const creativeEngine = asRecord(pg.creative_engine);
    const creativeCandidates = asRecord(pg.creative_candidates);
    const creativeIdentity = asRecord(pg.creative_identity);
    const platformOutputs = asRecord(brief.platform_outputs) ?? {};

    const cis = pkg ? (itemsByPkg.get(pkg.id) ?? []) : [];
    const tiktok = cis.find((c) => c.platform === "tiktok");
    const jobs = tiktok ? (jobsByItem.get(tiktok.id) ?? []) : [];
    const job = jobs[0] ?? null;
    const jobOut = asRecord(job?.output) ?? {};
    const jobIn = asRecord(job?.input) ?? {};
    const jobDebug = asRecord(jobOut.debug) ?? {};

    const pkgSteps = readSteps(pg.generation_telemetry);
    const workerSteps = readSteps(jobDebug.generation_telemetry);
    const pkgTele = summarizeSteps(pkgSteps);
    const workerTele = summarizeSteps(workerSteps);

    if (pkgTele.estimated_cost_usd != null) {
      runAiCost += pkgTele.estimated_cost_usd;
      runAiCostPresent = true;
    }
    totalAiCalls += pkgTele.step_count;
    totalRepairs += pkgTele.repairs;

    const imagePrompts = Array.isArray(brief.image_prompts)
      ? brief.image_prompts
      : Array.isArray(jobIn.image_prompts)
        ? jobIn.image_prompts
        : [];
    const visualScenes = Array.isArray(brief.visual_scenes)
      ? brief.visual_scenes
      : [];
    const assetImages = Array.isArray(jobIn.asset_images)
      ? jobIn.asset_images
      : [];

    // Prefer stored scene still URLs from render_spec / debug
    const renderSpec = asRecord(jobOut.render_spec) ?? {};
    const scenes =
      (Array.isArray(renderSpec.scenes) ? renderSpec.scenes : null) ??
      (Array.isArray(jobDebug.scenes) ? jobDebug.scenes : null) ??
      visualScenes;

    const imageUrls: string[] = [];
    for (const s of scenes) {
      const sr = asRecord(s);
      if (!sr) continue;
      for (const key of [
        "image_url",
        "url",
        "still_url",
        "storage_url",
        "signed_url",
      ]) {
        if (typeof sr[key] === "string" && (sr[key] as string).startsWith("http")) {
          imageUrls.push(sr[key] as string);
          break;
        }
      }
    }
    // Also check asset_images paths in input
    for (const a of assetImages) {
      if (typeof a === "string" && a.startsWith("http")) imageUrls.push(a);
      else {
        const ar = asRecord(a);
        if (ar && typeof ar.url === "string") imageUrls.push(ar.url);
      }
    }

    const imgCount = Math.max(
      imagePrompts.length,
      imageUrls.length,
      Array.isArray(jobIn.image_prompts) ? jobIn.image_prompts.length : 0,
    );
    const voText =
      (typeof brief.voiceover_text === "string" && brief.voiceover_text) ||
      (typeof jobIn.voiceover_text === "string" && jobIn.voiceover_text) ||
      "";

    const imageGenSteps = workerSteps.filter((s) =>
      String(s.step_name ?? "")
        .toLowerCase()
        .includes("image"),
    );
    const ttsSteps = workerSteps.filter((s) =>
      String(s.step_name ?? "")
        .toLowerCase()
        .includes("tts"),
    );
    const renderSteps = workerSteps.filter((s) =>
      String(s.step_name ?? "")
        .toLowerCase()
        .includes("render"),
    );
    totalImageGens += Math.max(imgCount, imageGenSteps.length);
    totalTts += Math.max(voText ? 1 : 0, ttsSteps.length);
    totalRenders += Math.max(job?.status === "completed" ? 1 : 0, renderSteps.length);

    const estImage = imgCount * EST_IMAGE_USD;
    const estTts = (voText.length / 1000) * EST_TTS_PER_1K_CHARS;
    const estMedia = estImage + estTts;
    runEstMediaCost += estMedia;

    const itemDurationSec =
      item.created_at && item.updated_at
        ? (new Date(item.updated_at).getTime() -
            new Date(item.created_at).getTime()) /
          1000
        : null;
    const videoDurationSec =
      job?.created_at && job?.completed_at
        ? (new Date(job.completed_at).getTime() -
            new Date(job.created_at).getTime()) /
          1000
        : null;

    if (item.status === "completed" && videoDurationSec != null) {
      // Prefer video wall time + AI step duration as package delivery proxy when
      // production_run_items.updated_at is settlement-batched (identical across rows).
      const aiSec = (pkgTele.duration_ms || 0) / 1000;
      completedDurationsSec.push(
        aiSec > 0 ? aiSec + videoDurationSec : videoDurationSec,
      );
    }

    // Download images for visual audit
    const localImages: string[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const dest = join(
        assetDir,
        `pkg${String(item.package_index).padStart(2, "0")}_scene${i + 1}.jpg`,
      );
      const ok = await downloadFile(imageUrls[i], dest);
      if (ok) localImages.push(dest);
    }

    // Download video + first/mid/last frames via ffmpeg if available
    const mp4Url =
      (typeof jobOut.mp4_url === "string" && jobOut.mp4_url) ||
      (typeof jobOut.video_url === "string" && jobOut.video_url) ||
      null;
    let localVideo: string | null = null;
    if (mp4Url) {
      const dest = join(
        videoDir,
        `pkg${String(item.package_index).padStart(2, "0")}_video.mp4`,
      );
      if (await downloadFile(mp4Url, dest)) localVideo = dest;
    }

    const platformTexts: Record<string, any> = {};
    for (const ci of cis) {
      platformTexts[ci.platform] = {
        id: ci.id,
        title: ci.title,
        body: ci.body,
        caption: ci.caption,
        hashtags: ci.hashtags,
        cta: ci.cta,
        format: ci.format,
        status: ci.status,
      };
    }
    // Merge package_brief.platform_outputs when present
    for (const [k, v] of Object.entries(platformOutputs)) {
      if (!platformTexts[k]) platformTexts[k] = v;
      else platformTexts[k] = { ...platformTexts[k], brief_output: v };
    }

    packageReports.push({
      package_index: item.package_index,
      status: item.status,
      production_run_item_id: item.id,
      strategy_item_id: item.strategy_item_id,
      content_package_id: item.content_package_id,
      error_message: item.error_message,
      item_created_at: item.created_at,
      item_updated_at: item.updated_at,
      item_duration_sec: itemDurationSec,
      strategy: strat
        ? {
            id: strat.id,
            funnel_stage: strat.funnel_stage,
            platform: strat.platform,
            format: strat.format,
            brief: strat.brief,
          }
        : null,
      package: pkg
        ? {
            id: pkg.id,
            title: pkg.title,
            funnel_stage: pkg.funnel_stage,
            status: pkg.status,
            created_at: pkg.created_at,
            updated_at: pkg.updated_at,
          }
        : null,
      creative: {
        hook: brief.hook ?? null,
        cta: brief.cta ?? null,
        hashtags: brief.hashtags ?? null,
        scenario: brief.scenario ?? null,
        voiceover_text: voText || null,
        video_concept: video.concept ?? null,
        video_script: video.script ?? null,
        video_duration_seconds: video.duration_seconds ?? null,
        creative_engine: creativeEngine,
        creative_candidates: creativeCandidates,
        creative_identity: creativeIdentity,
        attention: pg.attention ?? null,
        narrative_beats: pg.narrative_beats ?? null,
        tts_voice: pg.tts_voice ?? pg.selected_voice ?? null,
        tts_instructions: pg.tts_instructions ?? null,
        visual_profile: pg.visual_profile ?? null,
        visual_medium: pg.visual_medium ?? null,
        product_presentation: pg.product_presentation ?? null,
      },
      storyboard: {
        image_prompts: imagePrompts,
        visual_scenes: visualScenes,
        scenes_from_render: scenes,
        subtitles: brief.subtitles ?? jobIn.subtitles ?? null,
      },
      content_item_ids: cis.map((c) => c.id),
      platform_texts: platformTexts,
      video_job: job
        ? {
            id: job.id,
            status: job.status,
            provider: job.provider,
            model: job.model,
            created_at: job.created_at,
            completed_at: job.completed_at,
            duration_sec: videoDurationSec,
            mp4_url: mp4Url,
            subtitle_url: jobOut.subtitle_url ?? null,
            thumbnail_url: jobOut.thumbnail_url ?? null,
            error_message: job.error_message,
            attempt_count: jobs.length,
          }
        : null,
      telemetry: {
        package: {
          ...pkgTele,
          steps: undefined,
          step_names: pkgSteps.map((s) => s.step_name),
        },
        worker: {
          ...workerTele,
          steps: undefined,
          step_names: workerSteps.map((s) => s.step_name),
        },
        package_steps_full: pkgSteps,
        worker_steps_full: workerSteps,
      },
      cost_estimate: {
        ai_text_usd: pkgTele.estimated_cost_usd,
        media_estimate_usd: estMedia,
        image_estimate_usd: estImage,
        tts_estimate_usd: estTts,
        image_count: imgCount,
        note:
          "AI text from persisted telemetry estimated_cost. Image/TTS from public list-price approximations (gpt-image-1 ~$0.07/still, TTS ~$0.015/1k chars). Render cost not metered.",
      },
      local_assets: {
        images: localImages,
        video: localVideo,
      },
    });
  }

  // Fix duration when settlement-batched: use package created→video completed
  for (const pr of packageReports) {
    if (pr.status !== "completed" || !pr.package?.created_at) continue;
    const end =
      pr.video_job?.completed_at || pr.package?.updated_at || pr.item_updated_at;
    if (!end) continue;
    const sec =
      (new Date(end).getTime() - new Date(pr.package.created_at).getTime()) /
      1000;
    if (sec > 0 && sec < 86_400) {
      pr.delivery_duration_sec = sec;
    }
  }

  const completed = packageReports.filter((p) => p.status === "completed");
  const deliverySecs = completed
    .map((p) => p.delivery_duration_sec)
    .filter((n: unknown): n is number => typeof n === "number");
  deliverySecs.sort((a, b) => a - b);
  const median = (arr: number[]) =>
    arr.length === 0
      ? null
      : arr.length % 2 === 1
        ? arr[(arr.length - 1) / 2]
        : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;

  const summary = {
    label,
    run_id: runId,
    run,
    wall_duration_sec:
      run.created_at && run.updated_at
        ? (new Date(run.updated_at).getTime() -
            new Date(run.created_at).getTime()) /
          1000
        : null,
    requested: run.requested_total,
    completed: run.generated_total,
    failed: run.failed_total,
    success_rate:
      run.requested_total > 0
        ? run.generated_total / run.requested_total
        : null,
    ai_calls: totalAiCalls,
    repairs: totalRepairs,
    image_generations_est: totalImageGens,
    tts_calls_est: totalTts,
    renders_est: totalRenders,
    ai_text_cost_usd: runAiCostPresent ? runAiCost : null,
    media_estimate_usd: runEstMediaCost,
    total_cost_estimate_usd: runAiCostPresent
      ? runAiCost + runEstMediaCost
      : null,
    cost_per_completed_usd:
      runAiCostPresent && run.generated_total > 0
        ? (runAiCost + runEstMediaCost) / run.generated_total
        : null,
    cost_per_requested_usd:
      runAiCostPresent && run.requested_total > 0
        ? (runAiCost + runEstMediaCost) / run.requested_total
        : null,
    avg_delivery_sec:
      deliverySecs.length > 0
        ? deliverySecs.reduce((a, b) => a + b, 0) / deliverySecs.length
        : null,
    median_delivery_sec: median(deliverySecs),
    package_count_in_dump: packageReports.length,
  };

  writeFileSync(
    join(runDir, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  writeFileSync(
    join(runDir, "packages.json"),
    JSON.stringify(packageReports, null, 2),
  );

  // CSV flat
  const csvRows = [
    [
      "package_index",
      "status",
      "title",
      "funnel_stage",
      "ai_cost_usd",
      "media_est_usd",
      "delivery_sec",
      "image_count",
      "vo_chars",
      "error",
    ].join(","),
  ];
  for (const p of packageReports) {
    csvRows.push(
      [
        p.package_index,
        p.status,
        JSON.stringify(p.package?.title ?? ""),
        p.package?.funnel_stage ?? p.strategy?.funnel_stage ?? "",
        p.cost_estimate.ai_text_usd ?? "",
        p.cost_estimate.media_estimate_usd ?? "",
        p.delivery_duration_sec ?? "",
        p.cost_estimate.image_count ?? "",
        (p.creative.voiceover_text ?? "").length,
        JSON.stringify(p.error_message ?? ""),
      ].join(","),
    );
  }
  writeFileSync(join(runDir, "packages.csv"), csvRows.join("\n"));

  console.log(
    JSON.stringify({
      label,
      run_id: runId,
      packages: packageReports.length,
      completed: summary.completed,
      ai_cost: summary.ai_text_cost_usd,
      media_est: summary.media_estimate_usd,
      out: runDir,
    }),
  );

  return { summary, packageReports };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createSupabaseAdminClient();

  const neu = await dumpRun(supabase, NEW_RUN!, "new", OUT);
  const ref = await dumpRun(supabase, REF_RUN!, "ref", OUT);

  writeFileSync(
    join(OUT, "data", "comparison-summary.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        new_run_id: NEW_RUN,
        ref_run_id: REF_RUN,
        new: neu.summary,
        ref: ref.summary,
        notes: [
          "AI text costs from package_brief.presentation_generation.generation_telemetry.steps.estimated_cost",
          "Old/reference runs often lack package telemetry — ai_text_cost_usd may be null",
          "Failed packages have no content_package; intermediate creative outputs are not persisted",
          "Image/TTS costs are list-price estimates, not billing truth",
          "Render/compute cost cannot be determined from available data",
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
