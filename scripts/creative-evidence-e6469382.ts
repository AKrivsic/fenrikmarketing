/**
 * READ-ONLY creative evidence export for production run e6469382.
 * Exports AI creative outputs only. No scoring. No marketing judgment.
 * Does not write to Supabase. Does not call AI providers.
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

const RUN_ID = "e6469382-a897-42b7-88fe-2d650b778d42";
const OUT_MD = resolve("docs/architecture/creative-evidence-e6469382.md");
const OUT_DIR = resolve("reports/e6469382-creative-evidence");
const REPORT_REL = "reports/e6469382-creative-evidence";

const NOT_STORED = {
  status: "NOT_STORED",
  note: "Exact runtime prompts / raw model responses / repaired JSON are not persisted by the current pipeline (telemetry stores summaries only).",
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function redact(s: string): string {
  return s
    .replace(
      /https:\/\/[^"'\\\s]*supabase[^"'\\\s]*\/storage\/v1\/object\/sign\/[^"'\\\s?]+\?[^"'\\\s]*/gi,
      "[SIGNED_URL]",
    )
    .replace(
      /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
      "[REDACTED_JWT]",
    )
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "[REDACTED_KEY]");
}

function j(v: unknown): string {
  return redact(JSON.stringify(v, null, 2));
}

function fence(lang: string, body: string): string {
  return "```" + lang + "\n" + redact(body) + "\n```\n";
}

function present(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") {
    const r = v as Record<string, unknown>;
    if (r.status === "NOT_STORED") return false;
    return Object.keys(r).length > 0;
  }
  return true;
}

function mark(ok: boolean): string {
  return ok ? "✓" : "✗";
}

type StepFlags = {
  strategy: boolean;
  concept: boolean;
  opening: boolean;
  visualIdentity: boolean;
  package: boolean;
  voiceover: boolean;
  storyboard: boolean;
  imagePrompts: boolean;
  voicePrompts: boolean;
  cta: boolean;
  platformOutputs: boolean;
  visualProfile: boolean;
  voiceSelection: boolean;
  creativeMode: boolean;
  creativeDirectives: boolean;
  funnelStage: boolean;
  painPoint: boolean;
  productRole: boolean;
  narrativeArc: boolean;
  emotionalTone: boolean;
  audienceInsight: boolean;
  visualDirection: boolean;
  generatedImages: boolean;
  finalSubtitles: boolean;
  renderMetadata: boolean;
  runtimeArtifacts: boolean;
  rawModelOutput: boolean;
};

function lastCompletedStep(f: StepFlags): string {
  if (f.renderMetadata) return "Render";
  if (f.finalSubtitles) return "Final subtitles";
  if (f.generatedImages) return "Generated images";
  if (f.platformOutputs) return "Platform outputs";
  if (f.cta) return "CTA";
  if (f.imagePrompts) return "Image prompts";
  if (f.storyboard) return "Storyboard";
  if (f.voiceover) return "Voiceover";
  if (f.package) return "Package";
  if (f.visualIdentity) return "Visual Identity";
  if (f.opening) return "Opening";
  if (f.concept) return "Concept";
  if (f.strategy) return "Strategy";
  return "—";
}

function evaluableList(f: StepFlags): string {
  const items: string[] = [];
  if (f.strategy) items.push("Strategy");
  if (f.creativeDirectives) items.push("Creative directives");
  if (f.concept) items.push("Concept");
  if (f.opening) items.push("Opening");
  if (f.visualIdentity) items.push("Visual Identity");
  if (f.package) items.push("Package (hook/scenario/video)");
  if (f.voiceover) items.push("Voiceover");
  if (f.storyboard) items.push("Storyboard / visual scenes");
  if (f.imagePrompts) items.push("Image prompts");
  if (f.voicePrompts) items.push("Voice prompts");
  if (f.cta) items.push("CTA");
  if (f.platformOutputs) items.push("Platform outputs");
  if (f.visualProfile) items.push("Visual profile");
  if (f.voiceSelection) items.push("Voice selection");
  if (f.creativeMode) items.push("Creative mode");
  if (f.funnelStage) items.push("Funnel stage");
  if (f.painPoint) items.push("Pain point");
  if (f.productRole) items.push("Product role");
  if (f.narrativeArc) items.push("Narrative arc");
  if (f.emotionalTone) items.push("Emotional tone");
  if (f.audienceInsight) items.push("Audience insight");
  if (f.visualDirection) items.push("Visual direction");
  if (f.rawModelOutput) items.push("Raw model output (failure snapshot)");
  if (f.generatedImages) items.push("Generated images");
  if (f.finalSubtitles) items.push("Final subtitles");
  if (f.renderMetadata) items.push("Render metadata / video");
  return items.length ? items.join(", ") : "—";
}

function slimVideoJob(job: Record<string, unknown> | null) {
  if (!job) return null;
  const output = asRecord(job.output) ?? {};
  const input = asRecord(job.input) ?? {};
  const debug = asRecord(output.debug) ?? {};
  const images = output.images ?? debug.images ?? null;
  const imageUrls: string[] = [];
  const collectUrls = (node: unknown) => {
    if (!node) return;
    if (typeof node === "string" && /^https?:\/\//.test(node)) {
      imageUrls.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const x of node) collectUrls(x);
      return;
    }
    const r = asRecord(node);
    if (!r) return;
    for (const [k, v] of Object.entries(r)) {
      if (
        /url|path|storage/i.test(k) &&
        typeof v === "string" &&
        (v.startsWith("http") || v.includes("storage"))
      ) {
        imageUrls.push(v);
      } else if (v && typeof v === "object") {
        collectUrls(v);
      }
    }
  };
  collectUrls(images);
  collectUrls(output.scene_images);
  collectUrls(debug.scene_images);

  const telemetry = debug.generation_telemetry ?? output.generation_telemetry ?? null;

  return {
    id: job.id,
    status: job.status,
    error_message: job.error_message,
    created_at: job.created_at,
    completed_at: job.completed_at,
    render_kind: job.render_kind,
    render_language: job.render_language,
    selected_voice: input.selected_voice ?? input.tts_voice ?? null,
    visual_profile: input.visual_profile ?? null,
    scenes: input.scenes ?? null,
    hook: input.hook ?? null,
    cta: input.cta ?? null,
    voiceover_text: input.voiceover_text ?? null,
    scenes_count: Array.isArray(input.scenes)
      ? input.scenes.length
      : Array.isArray(output.scenes)
        ? (output.scenes as unknown[]).length
        : null,
    mp4_url: output.mp4_url ?? null,
    subtitle_url: output.subtitle_url ?? null,
    thumbnail_url: output.thumbnail_url ?? null,
    artifacts_persisted_at: output.artifacts_persisted_at ?? null,
    render_spec: output.render_spec ?? null,
    image_urls: imageUrls,
    storage_files: null as string[] | null,
    downloaded_images: null as string[] | null,
    output_empty: Object.keys(output).length === 0,
    debug: {
      match_ratio: debug.match_ratio ?? null,
      audio_duration: debug.audio_duration ?? null,
      video_duration: debug.video_duration ?? null,
      speech_duration: debug.speech_duration ?? null,
      subtitle_source: debug.subtitle_source ?? null,
      language_detected: debug.language_detected ?? null,
      render_warning: debug.render_warning ?? null,
      render_warnings: debug.render_warnings ?? null,
      tts_tail_validation_passed: debug.tts_tail_validation_passed ?? null,
      whisper_word_count: debug.whisper_word_count ?? null,
      generation_telemetry: telemetry,
    },
    debug_keys: Object.keys(debug),
    output_keys: Object.keys(output),
    input_keys: Object.keys(input),
  };
}

async function downloadJobArtifacts(
  supabase: ReturnType<
    Awaited<typeof import("../lib/supabase/admin")>["createSupabaseAdminClient"]
  >,
  projectId: string,
  jobId: string,
  packageIndex: number,
): Promise<{ storage_files: string[]; downloaded_images: string[] }> {
  const bucket = "video-renders";
  const prefix = `${projectId}/video/${jobId}`;
  const imgDir = resolve(
    OUT_DIR,
    "images",
    `package_${String(packageIndex).padStart(2, "0")}`,
  );
  mkdirSync(imgDir, { recursive: true });

  const { data: listed, error: listErr } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 100 });
  if (listErr) {
    return { storage_files: [], downloaded_images: [] };
  }
  const files = (listed ?? []).map((f) => f.name);
  const downloaded: string[] = [];
  for (const name of files) {
    if (!/\.(png|jpg|jpeg|webp|srt|mp4)$/i.test(name)) continue;
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(`${prefix}/${name}`);
    if (error || !data) continue;
    const buf = Buffer.from(await data.arrayBuffer());
    writeFileSync(resolve(imgDir, name), buf);
    downloaded.push(
      `${REPORT_REL}/images/package_${String(packageIndex).padStart(2, "0")}/${name}`,
    );
  }
  return { storage_files: files, downloaded_images: downloaded };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(resolve("docs/architecture"), { recursive: true });

  const { createSupabaseAdminClient } = await import("../lib/supabase/admin");
  const { buildAntiRepetitionMemory } = await import(
    "../lib/ai/workflows/antiRepetitionMemory"
  );
  const {
    buildCreativeSeed,
    pickCreativeDirectives,
  } = await import("../lib/ai/prompts/creativeDirectives");
  const { FUNNEL_STAGE_LABELS, normalizeFunnelStage } = await import(
    "../lib/ai/types"
  );

  const supabase = createSupabaseAdminClient();

  const { data: run, error: runErr } = await supabase
    .from("production_runs")
    .select("*")
    .eq("id", RUN_ID)
    .single();
  if (runErr) throw runErr;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", run.project_id)
    .single();

  const productBrain = project
    ? {
        id: project.id,
        name: project.name,
        type: project.type,
        language: project.language,
        market_scope: project.market_scope,
        target_audience: project.target_audience,
        goal_type: project.goal_type,
        product_is: project.product_is,
        product_is_not: project.product_is_not,
        product_strengths: project.product_strengths,
        pain_points: project.pain_points,
        forbidden_claims: project.forbidden_claims,
        tone_of_voice: project.tone_of_voice,
        platforms: project.platforms,
        publishing_rules: project.publishing_rules,
        default_cta: project.default_cta,
        enabled_languages: project.enabled_languages,
        knowledge: project.knowledge,
      }
    : null;

  const recentMemory = await buildAntiRepetitionMemory(
    supabase,
    run.project_id as string,
  );

  const { data: items, error: itemsErr } = await supabase
    .from("production_run_items")
    .select("*")
    .eq("production_run_id", RUN_ID)
    .order("package_index");
  if (itemsErr) throw itemsErr;

  const itemIds = (items ?? []).map((i) => i.id as string);
  const { data: failureTelemetryRows } = itemIds.length
    ? await supabase
        .from("production_run_item_failure_telemetry")
        .select("*")
        .in("production_run_item_id", itemIds)
    : { data: [] as Record<string, unknown>[] };
  const failTelByItem = new Map(
    (failureTelemetryRows ?? []).map((r) => [
      r.production_run_item_id as string,
      r,
    ]),
  );

  const packageIds = (items ?? [])
    .map((i) => i.content_package_id)
    .filter(Boolean) as string[];
  const strategyItemIds = (items ?? [])
    .map((i) => i.strategy_item_id)
    .filter(Boolean) as string[];

  const { data: packages } = packageIds.length
    ? await supabase.from("content_packages").select("*").in("id", packageIds)
    : { data: [] as Record<string, unknown>[] };

  const { data: strategyItems } = strategyItemIds.length
    ? await supabase
        .from("content_strategy_items")
        .select("*")
        .in("id", strategyItemIds)
    : { data: [] as Record<string, unknown>[] };

  const strategyIds = [
    ...new Set(
      (strategyItems ?? []).map((s) => s.strategy_id).filter(Boolean) as string[],
    ),
  ];

  const { data: strategies } = strategyIds.length
    ? await supabase.from("content_strategies").select("*").in("id", strategyIds)
    : { data: [] as Record<string, unknown>[] };

  const { data: contentItems } = packageIds.length
    ? await supabase
        .from("content_items")
        .select("*")
        .in("package_id", packageIds)
        .order("created_at")
    : { data: [] as Record<string, unknown>[] };

  const { data: videoJobs } = packageIds.length
    ? await supabase
        .from("video_jobs")
        .select("*")
        .in("package_id", packageIds)
        .order("created_at")
    : { data: [] as Record<string, unknown>[] };

  const pkgById = new Map((packages ?? []).map((p) => [p.id, p]));
  const stratById = new Map((strategyItems ?? []).map((s) => [s.id, s]));
  const strategyById = new Map((strategies ?? []).map((s) => [s.id, s]));
  const itemsByPkg = new Map<string, NonNullable<typeof contentItems>>();
  for (const ci of contentItems ?? []) {
    const list = itemsByPkg.get(ci.package_id) ?? [];
    list.push(ci);
    itemsByPkg.set(ci.package_id, list);
  }
  const jobsByPkg = new Map<string, NonNullable<typeof videoJobs>>();
  for (const vj of videoJobs ?? []) {
    if (!vj.package_id) continue;
    const list = jobsByPkg.get(vj.package_id) ?? [];
    list.push(vj);
    jobsByPkg.set(vj.package_id, list);
  }

  const weeklyStrategy = (strategies ?? [])[0] ?? null;
  const contentStrategyExport = {
    strategies: (strategies ?? []).map((s) => ({
      id: s.id,
      project_id: s.project_id,
      status: s.status,
      created_at: s.created_at,
      strategy_brief: s.strategy_brief,
    })),
    strategy_items: (strategyItems ?? []).map((s) => ({
      id: s.id,
      strategy_id: s.strategy_id,
      platform: s.platform,
      format: s.format,
      funnel_stage: s.funnel_stage,
      priority: s.priority,
      brief: s.brief,
      status: s.status,
    })),
  };

  writeFileSync(resolve(OUT_DIR, "project.json"), j(project));
  writeFileSync(resolve(OUT_DIR, "product_brain.json"), j(productBrain));
  writeFileSync(resolve(OUT_DIR, "recent_memory.json"), j({
    note: "Rebuilt at export time via buildAntiRepetitionMemory (current package history). Per-package stored fingerprints are also exported under each package.",
    memory: recentMemory,
  }));
  writeFileSync(resolve(OUT_DIR, "weekly_strategy.json"), j(weeklyStrategy));
  writeFileSync(resolve(OUT_DIR, "content_strategy.json"), j(contentStrategyExport));
  writeFileSync(resolve(OUT_DIR, "production_run.json"), j(run));
  writeFileSync(resolve(OUT_DIR, "production_run_items.json"), j(items));
  writeFileSync(
    resolve(OUT_DIR, "failure_telemetry_rows.json"),
    j(failureTelemetryRows ?? []),
  );
  writeFileSync(resolve(OUT_DIR, "runtime_prompts.json"), j(NOT_STORED));
  writeFileSync(resolve(OUT_DIR, "runtime_responses.json"), j(NOT_STORED));
  writeFileSync(resolve(OUT_DIR, "validated_json.json"), j(NOT_STORED));
  writeFileSync(resolve(OUT_DIR, "repaired_json.json"), j(NOT_STORED));

  type PackageExport = {
    package_index: number;
    run_item_id: string;
    run_item_status: string;
    run_item_error: string | null;
    package_id: string | null;
    package_title: string | null;
    package_status: string | null;
    strategy_item_id: string | null;
    flags: StepFlags;
    last_completed_step: string;
    evaluable: string;
    strategy_item: unknown;
    content_strategy: unknown;
    creative_directives: unknown;
    concept: unknown;
    opening: unknown;
    visual_identity: unknown;
    package: unknown;
    scenes: unknown;
    voiceover: unknown;
    voice_prompts: unknown;
    image_prompts: unknown;
    cta: unknown;
    platform_outputs: unknown;
    final_package: unknown;
    visual_profile: unknown;
    voice_selection: unknown;
    creative_mode: unknown;
    funnel_stage: unknown;
    pain_point: unknown;
    product_role: unknown;
    narrative_arc: unknown;
    emotional_tone: unknown;
    audience_insight: unknown;
    visual_direction: unknown;
    generated_images: unknown;
    final_subtitles: unknown;
    render_metadata: unknown;
    presentation_generation_meta: unknown;
    hashtags: unknown;
    hook: unknown;
    scenario: unknown;
    video: unknown;
    asset_usage: unknown;
    recent_creative_fingerprints: unknown;
    runtime_prompts: unknown;
    runtime_responses: unknown;
    validated_json: unknown;
    repaired_json: unknown;
    raw_model_output: unknown;
    failure_telemetry: unknown;
    generation_telemetry: unknown;
  };

  const exports: PackageExport[] = [];

  for (const item of items ?? []) {
    const pkgId = item.content_package_id as string | null;
    const pkg = pkgId ? pkgById.get(pkgId) : null;
    const brief = asRecord(pkg?.package_brief) ?? {};
    const pg = asRecord(brief.presentation_generation) ?? {};
    const concept = asRecord(pg.video_concept);
    const opening = asRecord(pg.opening_impact);
    const visualIdentity = asRecord(pg.visual_identity);
    const visualDirection =
      concept?.visual_direction ?? visualIdentity ?? null;

    const stratItem = item.strategy_item_id
      ? stratById.get(item.strategy_item_id)
      : null;
    const stratBrief = asRecord(stratItem?.brief) ?? {};
    const strategyRow = stratItem?.strategy_id
      ? strategyById.get(stratItem.strategy_id)
      : null;

    const topic =
      (typeof stratBrief.topic === "string" && stratBrief.topic) ||
      (typeof stratBrief.title === "string" && stratBrief.title) ||
      "";
    const angle =
      (typeof stratBrief.angle === "string" && stratBrief.angle) || "";
    const funnelRaw =
      (stratItem?.funnel_stage as string | undefined) ||
      (typeof stratBrief.funnel_stage === "string"
        ? stratBrief.funnel_stage
        : "") ||
      (pkg?.funnel_stage as string | undefined) ||
      "awareness";
    let creativeDirectives: unknown = null;
    try {
      const funnel = normalizeFunnelStage(funnelRaw);
      const seed = buildCreativeSeed(
        FUNNEL_STAGE_LABELS[funnel],
        topic,
        angle,
      );
      const directives = pickCreativeDirectives(seed);
      creativeDirectives = {
        source: "DETERMINISTIC_REPLAY",
        note: "Creative directives are prompt-only and not persisted. Replayed from stored strategy item funnel/topic/angle via pickCreativeDirectives(buildCreativeSeed(...)).",
        seed_inputs: {
          funnel_stage: FUNNEL_STAGE_LABELS[funnel],
          topic,
          angle,
          seed,
        },
        directives: {
          mode: {
            id: directives.mode.id,
            name: directives.mode.name,
            description: directives.mode.description,
            thinking: directives.mode.thinking,
            structure: directives.mode.structure,
            avoid: directives.mode.avoid,
            narrativeBeats: directives.mode.narrativeBeats,
            preferred: directives.mode.preferred ?? false,
          },
          hook: directives.hook,
          persona: {
            id: directives.persona.id,
            name: directives.persona.name,
            vocabulary: directives.persona.vocabulary,
            rhythm: directives.persona.rhythm,
            energy: directives.persona.energy,
            exaggeration: directives.persona.exaggeration,
          },
        },
      };
    } catch {
      creativeDirectives = {
        source: "UNAVAILABLE",
        note: "Could not replay creative directives from strategy item.",
        seed_inputs: { funnel_stage: funnelRaw, topic, angle },
      };
    }

    const jobs = pkgId ? (jobsByPkg.get(pkgId) ?? []) : [];
    const job = jobs[0] ? asRecord(jobs[0]) : null;
    const slimJob = slimVideoJob(job);
    if (slimJob?.id) {
      const artifacts = await downloadJobArtifacts(
        supabase,
        run.project_id as string,
        String(slimJob.id),
        item.package_index ?? -1,
      );
      slimJob.storage_files = artifacts.storage_files;
      slimJob.downloaded_images = artifacts.downloaded_images;
    }
    const cis = pkgId ? (itemsByPkg.get(pkgId) ?? []) : [];

    const failTelRow = failTelByItem.get(item.id as string) ?? null;
    const failTelInline = asRecord(item.failure_telemetry);
    const rawModelOutput = failTelRow
      ? {
          source: "production_run_item_failure_telemetry",
          phase: failTelRow.phase ?? null,
          provider: failTelRow.provider ?? null,
          model: failTelRow.model ?? null,
          attempt_count: failTelRow.attempt_count ?? null,
          error_truncated: failTelRow.error_truncated ?? null,
          terminal_classification: failTelRow.terminal_classification ?? null,
          output_hash: failTelRow.output_hash ?? null,
          output_snapshot: failTelRow.output_snapshot ?? null,
          generation_telemetry: failTelRow.generation_telemetry ?? null,
        }
      : failTelInline
        ? {
            source: "production_run_items.failure_telemetry",
            ...failTelInline,
          }
        : null;

    const voiceSelection = {
      selected_voice: pg.selected_voice ?? null,
      tts_voice: pg.tts_voice ?? null,
      voice_source: pg.voice_source ?? null,
      voice_scores: pg.voice_scores ?? null,
      voice_reasons: pg.voice_reasons ?? null,
      resolved_primary_voice: pg.resolved_primary_voice ?? null,
      resolved_secondary_voice: pg.resolved_secondary_voice ?? null,
      tts_instructions: pg.tts_instructions ?? null,
    };

    const voicePrompts = {
      voiceover_text: brief.voiceover_text ?? null,
      tts_instructions: pg.tts_instructions ?? null,
      selected_voice: pg.selected_voice ?? pg.tts_voice ?? null,
      resolved_primary_voice: pg.resolved_primary_voice ?? null,
      resolved_secondary_voice: pg.resolved_secondary_voice ?? null,
    };

    const visualProfile = {
      visual_profile: pg.visual_profile ?? null,
      visual_profile_version: pg.visual_profile_version ?? null,
      visual_profile_source: pg.visual_profile_source ?? null,
      visual_profile_scores: pg.visual_profile_scores ?? null,
      visual_profile_reasons: pg.visual_profile_reasons ?? null,
    };

    const packageCore = {
      title: pkg?.title ?? null,
      status: pkg?.status ?? null,
      funnel_stage: pkg?.funnel_stage ?? null,
      hook: brief.hook ?? null,
      scenario: brief.scenario ?? null,
      video: brief.video ?? null,
      hashtags: brief.hashtags ?? null,
      subtitles_planned: brief.subtitles ?? null,
    };

    const finalPackage = pkg
      ? {
          id: pkg.id,
          title: pkg.title,
          status: pkg.status,
          funnel_stage: pkg.funnel_stage,
          weekly_strategy_id: pkg.weekly_strategy_id,
          strategy_item_id: pkg.strategy_item_id,
          package_brief: brief,
          created_at: pkg.created_at,
          updated_at: pkg.updated_at,
        }
      : null;

    const downloadedImageFiles = (slimJob?.downloaded_images ?? []).filter(
      (p) => /\.(png|jpg|jpeg|webp)$/i.test(p),
    );
    const generatedImages =
      downloadedImageFiles.length > 0
        ? {
            local_files: downloadedImageFiles,
            storage_files: slimJob?.storage_files ?? [],
            signed_urls: slimJob?.image_urls ?? [],
            thumbnail_url: slimJob?.thumbnail_url ?? null,
          }
        : slimJob?.thumbnail_url || (slimJob?.image_urls?.length ?? 0) > 0
          ? {
              local_files: [],
              storage_files: slimJob?.storage_files ?? [],
              signed_urls: slimJob?.image_urls ?? [],
              thumbnail_url: slimJob?.thumbnail_url ?? null,
            }
          : null;

    const downloadedSrt = (slimJob?.downloaded_images ?? []).find((p) =>
      p.endsWith(".srt"),
    );
    const finalSubtitles =
      slimJob?.subtitle_url || downloadedSrt
        ? {
            subtitle_url: slimJob?.subtitle_url ?? null,
            local_file: downloadedSrt ?? null,
            planned: brief.subtitles ?? null,
          }
        : present(brief.subtitles)
          ? { subtitle_url: null, local_file: null, planned: brief.subtitles }
          : null;

    const hasGeneratedImages =
      downloadedImageFiles.length > 0 ||
      Boolean(slimJob?.thumbnail_url) ||
      (slimJob?.image_urls?.length ?? 0) > 0;

    const flags: StepFlags = {
      strategy: present(stratBrief) || present(strategyRow),
      concept: present(concept),
      opening: present(opening),
      visualIdentity: present(visualIdentity),
      package: present(packageCore.hook) || present(packageCore.video),
      voiceover: present(brief.voiceover_text),
      storyboard: present(brief.visual_scenes),
      imagePrompts: present(brief.image_prompts),
      voicePrompts:
        present(brief.voiceover_text) || present(pg.tts_instructions),
      cta: present(brief.cta) || present(pg.cta_selected),
      platformOutputs: present(brief.platform_outputs) || cis.length > 0,
      visualProfile: present(pg.visual_profile),
      voiceSelection:
        present(pg.selected_voice) ||
        present(pg.tts_voice) ||
        present(pg.resolved_primary_voice),
      creativeMode: present(pg.creative_mode),
      creativeDirectives: present(
        asRecord(creativeDirectives)?.directives,
      ),
      funnelStage: present(pkg?.funnel_stage) || present(stratItem?.funnel_stage),
      painPoint:
        present(pg.selected_pain_point) || present(stratBrief.pain_point),
      productRole: present(concept?.product_role),
      narrativeArc: present(concept?.narrative_arc),
      emotionalTone: present(concept?.emotional_tone),
      audienceInsight: present(concept?.audience_insight),
      visualDirection: present(visualDirection),
      generatedImages: hasGeneratedImages,
      finalSubtitles: Boolean(slimJob?.subtitle_url || downloadedSrt),
      renderMetadata: Boolean(
        slimJob &&
          (slimJob.mp4_url ||
            slimJob.render_spec ||
            slimJob.status === "completed"),
      ),
      runtimeArtifacts: false,
      rawModelOutput: present(rawModelOutput),
    };

    const exp: PackageExport = {
      package_index: item.package_index ?? -1,
      run_item_id: item.id,
      run_item_status: item.status,
      run_item_error: item.error_message,
      package_id: pkgId,
      package_title: pkg?.title ?? null,
      package_status: pkg?.status ?? null,
      strategy_item_id: item.strategy_item_id,
      flags,
      last_completed_step: lastCompletedStep(flags),
      evaluable: evaluableList(flags),
      strategy_item: stratItem
        ? {
            id: stratItem.id,
            strategy_id: stratItem.strategy_id,
            platform: stratItem.platform,
            format: stratItem.format,
            funnel_stage: stratItem.funnel_stage,
            priority: stratItem.priority,
            status: stratItem.status,
            brief: stratBrief,
          }
        : null,
      content_strategy: strategyRow
        ? {
            id: (strategyRow as { id: string }).id,
            strategy_brief: asRecord(
              (strategyRow as { strategy_brief?: unknown }).strategy_brief,
            ),
          }
        : null,
      creative_directives: creativeDirectives,
      concept,
      opening,
      visual_identity: visualIdentity,
      package: packageCore,
      scenes: brief.visual_scenes ?? null,
      voiceover: brief.voiceover_text ?? null,
      voice_prompts: voicePrompts,
      image_prompts: brief.image_prompts ?? null,
      cta: {
        package_cta: brief.cta ?? null,
        cta_selected: pg.cta_selected ?? null,
        cta_decision_reason: pg.cta_decision_reason ?? null,
        cta_composition_id: pg.cta_composition_id ?? null,
      },
      platform_outputs: {
        brief_platform_outputs: brief.platform_outputs ?? null,
        content_items: (cis ?? []).map((ci) => ({
          id: ci.id,
          platform: ci.platform,
          format: ci.format,
          status: ci.status,
          title: ci.title,
          body: ci.body,
          caption: ci.caption,
          hashtags: ci.hashtags,
          cta: ci.cta,
          language: ci.language,
        })),
      },
      final_package: finalPackage,
      visual_profile: visualProfile,
      voice_selection: voiceSelection,
      creative_mode: pg.creative_mode ?? null,
      funnel_stage: pkg?.funnel_stage ?? stratItem?.funnel_stage ?? null,
      pain_point: {
        selected_pain_point: pg.selected_pain_point ?? null,
        strategy_pain_point: stratBrief.pain_point ?? null,
      },
      product_role: concept?.product_role ?? null,
      narrative_arc: concept?.narrative_arc ?? null,
      emotional_tone: concept?.emotional_tone ?? null,
      audience_insight: concept?.audience_insight ?? null,
      visual_direction: visualDirection,
      generated_images: generatedImages,
      final_subtitles: finalSubtitles,
      render_metadata: slimJob,
      presentation_generation_meta: {
        mode: pg.mode ?? null,
        pipeline: pg.pipeline ?? null,
        delivery_reason: pg.delivery_reason ?? null,
        visual_beat_count: pg.visual_beat_count ?? null,
        target_visual_beat_count: pg.target_visual_beat_count ?? null,
        final_worker_scene_types: pg.final_worker_scene_types ?? null,
        content_pipeline_fingerprint: pg.content_pipeline_fingerprint ?? null,
        history_decisions: pg.history_decisions ?? null,
        frequency_decisions: pg.frequency_decisions ?? null,
        scene_type_diversity_notes: pg.scene_type_diversity_notes ?? null,
      },
      hashtags: brief.hashtags ?? null,
      hook: brief.hook ?? null,
      scenario: brief.scenario ?? null,
      video: brief.video ?? null,
      asset_usage: brief.asset_usage ?? null,
      recent_creative_fingerprints: pg.recent_creative_fingerprints ?? null,
      runtime_prompts: NOT_STORED,
      runtime_responses: NOT_STORED,
      validated_json: NOT_STORED,
      repaired_json: NOT_STORED,
      raw_model_output: rawModelOutput,
      failure_telemetry: failTelRow ?? failTelInline,
      generation_telemetry: pg.generation_telemetry ?? null,
    };

    exports.push(exp);

    writeFileSync(
      resolve(
        OUT_DIR,
        `package_${String(exp.package_index).padStart(2, "0")}.json`,
      ),
      j(exp),
    );
  }

  writeFileSync(
    resolve(OUT_DIR, "evidence-bundle.json"),
    j({
      exported_at: new Date().toISOString(),
      run,
      project: {
        id: project?.id,
        name: project?.name,
      },
      product_brain: productBrain,
      recent_memory: {
        note: "Rebuilt at export time via buildAntiRepetitionMemory.",
        memory: recentMemory,
      },
      weekly_strategy: weeklyStrategy,
      content_strategy: contentStrategyExport,
      runtime_prompts: NOT_STORED,
      runtime_responses: NOT_STORED,
      validated_json: NOT_STORED,
      repaired_json: NOT_STORED,
      package_count: exports.length,
      packages: exports,
    }),
  );

  const lines: string[] = [];
  const push = (s = "") => lines.push(s);

  push(`# Creative Evidence — \`${RUN_ID}\``);
  push();
  push(`**Exported:** ${new Date().toISOString()}`);
  push(`**Project:** ${project?.name ?? "?"} (\`${run.project_id}\`)`);
  push(
    `**Run status:** \`${run.status}\` · requested=${run.requested_total} · generated=${run.generated_total} · failed=${run.failed_total}`,
  );
  push();
  push(
    "Scope: exact production creative artifacts only. No scoring. No marketing judgment. No implementation.",
  );
  push();
  push(`Companion JSON: \`${REPORT_REL}/\``);
  push();

  push(`# Shared context`);
  push();
  push(`## Project`);
  push(fence("json", j({ id: project?.id, name: project?.name, type: project?.type, language: project?.language, market_scope: project?.market_scope, platforms: project?.platforms, goal_type: project?.goal_type })));
  push(`## Product Brain`);
  push(fence("json", j(productBrain)));
  push(`## Recent Memory`);
  push(
    fence(
      "json",
      j({
        note: "Rebuilt at export time via buildAntiRepetitionMemory (current package history). Per-package stored fingerprints appear under each package.",
        memory: recentMemory,
      }),
    ),
  );
  push(`## Weekly Strategy`);
  push(fence("json", j(weeklyStrategy)));
  push(`## Content Strategy`);
  push(fence("json", j(contentStrategyExport)));
  push(`## Runtime prompts`);
  push(fence("json", j(NOT_STORED)));
  push(`## Runtime responses`);
  push(fence("json", j(NOT_STORED)));
  push(`## Validated JSON`);
  push(fence("json", j(NOT_STORED)));
  push(`## Repaired JSON`);
  push(fence("json", j(NOT_STORED)));
  push(`## Raw model outputs (run-level)`);
  push(
    fence(
      "json",
      j({
        note: "Only failure-path snapshots are stored. See packages with raw_model_output and failure_telemetry_rows.json.",
        failure_telemetry_row_count: (failureTelemetryRows ?? []).length,
      }),
    ),
  );

  push(`# Overview`);
  push();
  push(
    `| Package | Title | Last completed step | Status | Evaluable artifacts |`,
  );
  push(`| ---: | --- | --- | --- | --- |`);
  for (const e of exports) {
    push(
      `| ${e.package_index} | ${e.package_title ?? "—"} | ${e.last_completed_step} | \`${e.run_item_status}\`${e.run_item_error ? ` — ${String(e.run_item_error).replace(/\|/g, "\\|").slice(0, 120)}` : ""} | ${e.evaluable} |`,
    );
  }
  push();

  push(`# Checklist by package`);
  push();
  for (const e of exports) {
    const f = e.flags;
    push(`## P${e.package_index} — ${e.package_title ?? "—"}`);
    push();
    push(`- Strategy ${mark(f.strategy)}`);
    push(`- Creative directives ${mark(f.creativeDirectives)}`);
    push(`- Concept ${mark(f.concept)}`);
    push(`- Opening ${mark(f.opening)}`);
    push(`- Visual Identity ${mark(f.visualIdentity)}`);
    push(`- Package ${mark(f.package)}`);
    push(`- Voiceover ${mark(f.voiceover)}`);
    push(`- Storyboard / scenes ${mark(f.storyboard)}`);
    push(`- Image prompts ${mark(f.imagePrompts)}`);
    push(`- Voice prompts ${mark(f.voicePrompts)}`);
    push(`- CTA ${mark(f.cta)}`);
    push(`- Platform outputs ${mark(f.platformOutputs)}`);
    push(`- Visual profile ${mark(f.visualProfile)}`);
    push(`- Voice selection ${mark(f.voiceSelection)}`);
    push(`- Creative mode ${mark(f.creativeMode)}`);
    push(`- Funnel stage ${mark(f.funnelStage)}`);
    push(`- Pain point ${mark(f.painPoint)}`);
    push(`- Product role ${mark(f.productRole)}`);
    push(`- Narrative arc ${mark(f.narrativeArc)}`);
    push(`- Emotional tone ${mark(f.emotionalTone)}`);
    push(`- Audience insight ${mark(f.audienceInsight)}`);
    push(`- Visual direction ${mark(f.visualDirection)}`);
    push(`- Raw model output ${mark(f.rawModelOutput)}`);
    push(`- Generated images ${mark(f.generatedImages)}`);
    push(`- Final subtitles ${mark(f.finalSubtitles)}`);
    push(`- Render metadata ${mark(f.renderMetadata)}`);
    push(`- Runtime prompts/responses ${mark(f.runtimeArtifacts)}`);
    push();
  }

  for (const e of exports) {
    push(`---`);
    push();
    push(`# Package ${e.package_index} — ${e.package_title ?? "—"}`);
    push();
    push(`- package_id: \`${e.package_id}\``);
    push(`- strategy_item_id: \`${e.strategy_item_id}\``);
    push(`- run_item_id: \`${e.run_item_id}\``);
    push(`- run_item_status: \`${e.run_item_status}\``);
    if (e.run_item_error) push(`- run_item_error: ${e.run_item_error}`);
    push(`- last_completed_step: **${e.last_completed_step}**`);
    push();

    push(`## Strategy Item`);
    push(fence("json", j(e.strategy_item)));

    push(`## Concept`);
    push(fence("json", j(e.concept)));

    push(`## Opening`);
    push(fence("json", j(e.opening)));

    push(`## Visual Identity`);
    push(fence("json", j(e.visual_identity)));

    push(`## Creative Directives`);
    push(fence("json", j(e.creative_directives)));

    push(`## Scenes`);
    push(fence("json", j(e.scenes)));

    push(`## Voiceover`);
    push(fence("json", j(e.voiceover)));

    push(`## Voice prompts`);
    push(fence("json", j(e.voice_prompts)));

    push(`## Image prompts`);
    push(fence("json", j(e.image_prompts)));

    push(`## CTA`);
    push(fence("json", j(e.cta)));

    push(`## Platform outputs`);
    push(fence("json", j(e.platform_outputs)));

    push(`## Final package`);
    push(fence("json", j(e.final_package)));

    push(`## Package (core fields)`);
    push(fence("json", j(e.package)));

    push(`## Visual profile`);
    push(fence("json", j(e.visual_profile)));

    push(`## Voice selection`);
    push(fence("json", j(e.voice_selection)));

    push(`## Creative mode`);
    push(fence("json", j(e.creative_mode)));

    push(`## Funnel stage`);
    push(fence("json", j(e.funnel_stage)));

    push(`## Pain point`);
    push(fence("json", j(e.pain_point)));

    push(`## Product role`);
    push(fence("json", j(e.product_role)));

    push(`## Narrative arc`);
    push(fence("json", j(e.narrative_arc)));

    push(`## Emotional tone`);
    push(fence("json", j(e.emotional_tone)));

    push(`## Audience insight`);
    push(fence("json", j(e.audience_insight)));

    push(`## Visual direction`);
    push(fence("json", j(e.visual_direction)));

    push(`## Recent creative fingerprints (stored)`);
    push(fence("json", j(e.recent_creative_fingerprints)));

    push(`## Generation telemetry (summaries)`);
    push(fence("json", j(e.generation_telemetry)));

    push(`## Runtime prompts`);
    push(fence("json", j(e.runtime_prompts)));

    push(`## Runtime responses`);
    push(fence("json", j(e.runtime_responses)));

    push(`## Validated JSON`);
    push(fence("json", j(e.validated_json)));

    push(`## Repaired JSON`);
    push(fence("json", j(e.repaired_json)));

    push(`## Raw model output`);
    push(fence("json", j(e.raw_model_output)));

    push(`## Failure telemetry`);
    push(fence("json", j(e.failure_telemetry)));

    push(`## Generated images`);
    push(fence("json", j(e.generated_images)));

    push(`## Final subtitles`);
    push(fence("json", j(e.final_subtitles)));

    push(`## Render metadata`);
    push(fence("json", j(e.render_metadata)));

    push(`## Presentation generation meta`);
    push(fence("json", j(e.presentation_generation_meta)));

    push(`## Asset usage`);
    push(fence("json", j(e.asset_usage)));
  }

  writeFileSync(OUT_MD, lines.join("\n"));
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Wrote ${OUT_DIR} (${exports.length} packages)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
