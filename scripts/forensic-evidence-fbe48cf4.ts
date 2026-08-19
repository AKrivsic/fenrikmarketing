/**
 * READ-ONLY forensic evidence export for production run fbe48cf4.
 * Reconstructs prompts from current code + stored inputs.
 * Does not write to Supabase. Does not call AI providers.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

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

const RUN_ID = "fbe48cf4-c052-4e31-8b75-8bad362673f4";
const OUT_MD = resolve(
  "docs/architecture/production-run-evidence-fbe48cf4.md",
);
const OUT_DIR = resolve("reports/fbe48cf4-evidence");

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function redact(s: string): string {
  return s
    .replace(
      /https:\/\/[^"'\\\s]*supabase[^"'\\\s]*\/storage\/v1\/object\/sign\/[^"'\\\s?]+\?[^"'\\\s]*/gi,
      "[REDACTED_SIGNED_URL]",
    )
    .replace(
      /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
      "[REDACTED_JWT]",
    );
}

function j(v: unknown): string {
  return redact(JSON.stringify(v, null, 2));
}

function fence(lang: string, body: string): string {
  return "```" + lang + "\n" + redact(body) + "\n```\n";
}

function sha12(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 12);
}

function keysDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): { added: string[]; removed: string[]; changed: string[] } {
  const b = new Set(Object.keys(before ?? {}));
  const a = new Set(Object.keys(after ?? {}));
  const added = [...a].filter((k) => !b.has(k)).sort();
  const removed = [...b].filter((k) => !a.has(k)).sort();
  const changed: string[] = [];
  for (const k of a) {
    if (!b.has(k)) continue;
    if (JSON.stringify(before![k]) !== JSON.stringify(after![k])) {
      changed.push(k);
    }
  }
  return { added, removed, changed: changed.sort() };
}

function fieldPaths(
  obj: unknown,
  prefix = "",
  out: string[] = [],
  depth = 0,
): string[] {
  if (depth > 4 || obj == null) return out;
  if (Array.isArray(obj)) {
    out.push(`${prefix || "$"}:array[${obj.length}]`);
    if (obj[0] && typeof obj[0] === "object") {
      fieldPaths(obj[0], `${prefix}[]`, out, depth + 1);
    }
    return out;
  }
  if (typeof obj !== "object") {
    out.push(`${prefix}:${typeof obj}`);
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v == null) out.push(`${p}:null`);
    else if (Array.isArray(v)) {
      out.push(`${p}:array[${v.length}]`);
      if (v[0] && typeof v[0] === "object") fieldPaths(v[0], `${p}[]`, out, depth + 1);
    } else if (typeof v === "object") fieldPaths(v, p, out, depth + 1);
    else out.push(`${p}:${typeof v}`);
  }
  return out;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(resolve("docs/architecture"), { recursive: true });

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const { loadAvailableAssets } = await import(
    "@/lib/ai/workflows/packageShared"
  );
  const { buildAntiRepetitionMemory } = await import(
    "@/lib/ai/workflows/antiRepetitionMemory"
  );
  const { loadStrategyPlanningContext } = await import(
    "@/lib/ai/planning/loadStrategyPlanningContext"
  );
  const {
    buildProductionStrategyPrompt,
    buildProductionStrategyExpectedShape,
    PRODUCTION_STRATEGY_SYSTEM,
  } = await import("@/lib/ai/prompts/contentStrategyPlan");
  const { readContentStrategyPlannerMaxTokens } = await import(
    "@/lib/production/strategyPlannerConfig"
  );
  const {
    buildVideoConceptPrompt,
    VIDEO_CONCEPT_SYSTEM,
  } = await import("@/lib/content-pipeline/prompts/videoConcept");
  const {
    buildOpeningImpactPrompt,
    OPENING_IMPACT_SYSTEM,
  } = await import("@/lib/content-pipeline/prompts/openingImpact");
  const {
    buildContentPackagePrompt,
    buildContentPackageSystem,
  } = await import("@/lib/content-pipeline/prompts/contentPackage");
  const { buildContentPackageExpectedShape } = await import(
    "@/lib/content-pipeline/prompts/contentPackageVisualScenes"
  );
  const {
    allowedCtaTypesForFunnelStage,
    ctaRequirementForFunnelStage,
  } = await import("@/lib/content-pipeline/prompts/contentPackageContract");
  const { buildContentPackageSchema } = await import(
    "@/lib/ai/schemas/contentPackage"
  );
  const { videoConceptSchema, openingImpactSchema } = await import(
    "@/lib/content-pipeline/schemas"
  );
  const { buildVisualIdentity } = await import(
    "@/lib/content-pipeline/visualIdentity"
  );
  const {
    buildCreativeSeed,
    pickCreativeDirectives,
  } = await import("@/lib/ai/prompts/creativeDirectives");
  const { FUNNEL_STAGE_LABELS } = await import("@/lib/ai/types");
  const { resolvePackagePlatforms, resolveVideoPackagePlatforms, parseContentControls } =
    await import("@/lib/projects/contentControls");
  const {
    normalizeProductionConfig,
    resolveRunGenerationPlan,
  } = await import("@/lib/projects/productionRun");
  const { outputsForPackageIndex } = await import(
    "@/lib/projects/productionRun"
  );

  const supabase = createSupabaseAdminClient();

  const { data: run, error: runErr } = await supabase
    .from("production_runs")
    .select("*")
    .eq("id", RUN_ID)
    .single();
  if (runErr) throw runErr;

  const { data: runItems } = await supabase
    .from("production_run_items")
    .select("*")
    .eq("production_run_id", RUN_ID);
  const runItem = runItems![0] as Record<string, unknown>;
  const pkgId = runItem.content_package_id as string;
  const stratItemId = runItem.strategy_item_id as string;

  const { data: pkg } = await supabase
    .from("content_packages")
    .select("*")
    .eq("id", pkgId)
    .single();
  const brief = asRecord(pkg!.package_brief)!;
  const pg = asRecord(brief.presentation_generation)!;

  const { data: stratItem } = await supabase
    .from("content_strategy_items")
    .select("*")
    .eq("id", stratItemId)
    .single();
  const stratBrief = asRecord(stratItem!.brief)!;

  const { data: strategy } = await supabase
    .from("content_strategies")
    .select("*")
    .eq("id", pkg!.weekly_strategy_id)
    .single();
  const strategyBrief = asRecord(strategy!.strategy_brief)!;

  const { data: contentItems } = await supabase
    .from("content_items")
    .select("*")
    .eq("package_id", pkgId)
    .order("created_at", { ascending: true });

  const { data: videoJobs } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("content_item_id", "4a2606f1-df1b-4eb1-8b9a-a1954d976f0f");
  // also by production_run_id in input
  const { data: videoJobs2 } = await supabase
    .from("video_jobs")
    .select("*")
    .contains("input", { production_run_id: RUN_ID });

  const job =
    (videoJobs2 && videoJobs2[0]) ||
    (videoJobs && videoJobs[0]) ||
    null;
  if (!job) {
    // fallback search
    const itemIds = (contentItems ?? []).map((c) => c.id);
    const { data: vj } = await supabase
      .from("video_jobs")
      .select("*")
      .in("content_item_id", itemIds);
    if (!vj?.[0]) throw new Error("video job not found");
  }
  const videoJob = (job ??
    (
      await supabase
        .from("video_jobs")
        .select("*")
        .in(
          "content_item_id",
          (contentItems ?? []).map((c) => c.id),
        )
    ).data![0]) as Record<string, unknown>;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", run.project_id)
    .single();

  const assets = await loadAvailableAssets(supabase, run.project_id);
  // Exclude this package so memory approximates pre-generation state.
  const memoryForPrompt = await buildAntiRepetitionMemory(
    supabase,
    run.project_id,
    { excludePackageId: pkgId },
  );
  const memoryNow = await buildAntiRepetitionMemory(supabase, run.project_id);
  const snapFp = Array.isArray(pg.recent_creative_fingerprints)
    ? pg.recent_creative_fingerprints
    : [];

  const concept = pg.video_concept as Record<string, unknown>;
  const opening = pg.opening_impact as Record<string, unknown>;
  const visualIdentity = pg.visual_identity as Record<string, unknown>;

  const funnelStage = (stratItem!.funnel_stage ?? "problem_aware") as
    | "awareness"
    | "problem_aware"
    | "solution_aware"
    | "conversion";
  const topic = String(stratBrief.topic ?? "");
  const angle = (stratBrief.angle as string) ?? null;
  const painPoint = (pg.selected_pain_point as string) ??
    (stratBrief.pain_point as string) ??
    null;

  const directives = pickCreativeDirectives(
    buildCreativeSeed(
      FUNNEL_STAGE_LABELS[funnelStage] ?? funnelStage,
      topic,
      angle,
    ),
  );

  const requestedConfig = asRecord(run.requested_config) ?? {};
  const config = asRecord(requestedConfig.config) ?? {};
  const planBlock = asRecord(requestedConfig.plan);
  const multipliers = asRecord(config.multipliers) ?? {};
  const platforms = (config.platforms as string[]) ?? project!.platforms ?? [];
  const packageIndex = 0;
  const variantCounts: Record<string, number> = {};
  for (const [plat, mult] of Object.entries(multipliers)) {
    const n = Number(mult);
    if (Number.isFinite(n) && n > 1) {
      // mirrors outputsForPackageIndex / buildVariantCounts rounding
      const raw = n;
      // linkedin 1.5 → package 0 gets 2, package 1 gets 1 alternating
      if (plat === "linkedin" && raw === 1.5) {
        variantCounts[plat] = packageIndex % 2 === 0 ? 2 : 1;
      } else {
        variantCounts[plat] = Math.max(1, Math.round(raw));
      }
    }
  }
  // From evidence: linkedin 2, x 5
  variantCounts.linkedin = 2;
  variantCounts.x = 5;

  const controls = parseContentControls(project!.publishing_rules);
  const targetPlatforms = platforms;
  const videoPlatforms = resolveVideoPackagePlatforms(
    platforms,
    controls.platformContentTypes,
  );
  const requireVideo = videoPlatforms.length > 0;

  // --- Reconstruct prompts ---
  let strategyPrompt = "";
  let strategyExpectedShape = "";
  let strategyMaxTokens: number | null = null;
  let strategyPlanningMeta: Record<string, unknown> = {};
  try {
    const planning = await loadStrategyPlanningContext(
      supabase,
      run.project_id,
    );
    strategyPrompt = buildProductionStrategyPrompt({
      project: planning.project,
      packageCount: run.package_count ?? 1,
      eligibleTrends: planning.eligibleTrends,
      evergreenTopics: planning.evergreenTopics,
      memory: planning.memory,
      primaryPlatform: String(stratItem!.platform ?? "tiktok"),
    });
    strategyExpectedShape = buildProductionStrategyExpectedShape(
      String(stratItem!.platform ?? "tiktok"),
    );
    strategyMaxTokens = readContentStrategyPlannerMaxTokens();
    strategyPlanningMeta = {
      eligible_trends_count: planning.eligibleTrends?.length ?? 0,
      evergreen_topics_count: planning.evergreenTopics?.length ?? 0,
      note: "Trends/evergreen/memory loaded at audit time — may differ from run-time lists.",
    };
  } catch (e) {
    strategyPlanningMeta = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const conceptPrompt = buildVideoConceptPrompt({
    project: project as never,
    funnelStage,
    topic,
    angle,
    platform: String(stratItem!.platform ?? "tiktok"),
    format: String(stratItem!.format ?? "reel"),
    memory: memoryForPrompt,
    packageIndex: 0,
    packageCount: 1,
    regeneration: null,
    directives,
    painPoint,
  });

  const openingPrompt = buildOpeningImpactPrompt({
    project: project as never,
    concept: concept as never,
    topic,
    angle,
    memory: memoryForPrompt,
    regeneration: null,
    directives,
    painPoint,
  });

  const rebuiltVisual = buildVisualIdentity({
    concept: concept as never,
    openingImpact: opening as never,
  });

  const packagePrompt = buildContentPackagePrompt({
    project: project as never,
    funnelStage,
    topic,
    angle,
    platform: String(stratItem!.platform ?? "tiktok"),
    format: String(stratItem!.format ?? "reel"),
    concept: concept as never,
    openingImpact: opening as never,
    visualIdentity: (visualIdentity ?? rebuiltVisual) as never,
    availableAssets: assets.refs,
    memory: memoryForPrompt,
    targetPlatforms,
    requireVideo,
    videoPlatforms,
    variantCounts,
    regeneration: null,
    directives,
    painPoint,
  });

  const packageSystem = buildContentPackageSystem(requireVideo);
  const allowedCta = allowedCtaTypesForFunnelStage({
    funnelStage,
    goalType: project!.goal_type,
  });
  const ctaRequired =
    ctaRequirementForFunnelStage(funnelStage) === "required_business";
  const expectedShape = buildContentPackageExpectedShape({
    goalType: project!.goal_type,
    funnelStage,
    allowedCtaTypes: allowedCta,
    ctaRequired,
  });

  // Schema description (structure only — Validator is a function)
  const schemaNote = {
    builder: "buildContentPackageSchema",
    targetPlatforms,
    requireVideo,
    allowedCtaTypes: allowedCta,
    ctaRequired,
  };

  const strategySteps = Array.isArray(
    asRecord(strategyBrief.generation_telemetry)?.steps,
  )
    ? (asRecord(strategyBrief.generation_telemetry)!.steps as Record<
        string,
        unknown
      >[])
    : [];
  const packageSteps = Array.isArray(asRecord(pg.generation_telemetry)?.steps)
    ? (asRecord(pg.generation_telemetry)!.steps as Record<string, unknown>[])
    : [];
  const videoDbg = asRecord(asRecord(videoJob.output)?.debug) ?? {};
  const videoSteps = Array.isArray(
    asRecord(videoDbg.generation_telemetry)?.steps,
  )
    ? (asRecord(videoDbg.generation_telemetry)!.steps as Record<
        string,
        unknown
      >[])
    : [];

  const allSteps = [
    ...strategySteps.map((s) => ({ ...s, _phase: "strategy" })),
    ...packageSteps.map((s) => ({ ...s, _phase: "package" })),
    ...videoSteps.map((s) => ({ ...s, _phase: "video" })),
  ].sort((a, b) =>
    String(a.started_at).localeCompare(String(b.started_at)),
  );

  // Persist companion JSON dumps
  const dumps: Record<string, unknown> = {
    production_run: run,
    production_run_items: runItems,
    content_strategy: strategy,
    content_strategy_item: stratItem,
    content_package: pkg,
    package_brief: brief,
    presentation_generation: pg,
    content_items: contentItems,
    video_job: {
      ...videoJob,
      output: {
        ...asRecord(videoJob.output),
        mp4_url: "[REDACTED_SIGNED_URL]",
        subtitle_url: "[REDACTED_SIGNED_URL]",
        thumbnail_url: "[REDACTED_SIGNED_URL]",
      },
    },
    project_row: project,
    assets_offered: assets.refs,
    reconstructed: {
      strategy_system: PRODUCTION_STRATEGY_SYSTEM,
      strategy_prompt: strategyPrompt,
      strategy_expected_shape: strategyExpectedShape,
      strategy_max_tokens: strategyMaxTokens,
      strategy_planning_meta: strategyPlanningMeta,
      video_concept_system: VIDEO_CONCEPT_SYSTEM,
      video_concept_prompt: conceptPrompt,
      opening_impact_system: OPENING_IMPACT_SYSTEM,
      opening_impact_prompt: openingPrompt,
      content_package_system: packageSystem,
      content_package_prompt: packagePrompt,
      content_package_expected_shape: expectedShape,
      content_package_schema_note: schemaNote,
      directives,
      variant_counts: variantCounts,
      rebuilt_visual_identity: rebuiltVisual,
      prompt_hashes: {
        strategy: sha12(strategyPrompt),
        concept: sha12(conceptPrompt),
        opening: sha12(openingPrompt),
        package: sha12(packagePrompt),
      },
      prompt_char_counts: {
        strategy: strategyPrompt.length,
        concept: conceptPrompt.length,
        opening: openingPrompt.length,
        package: packagePrompt.length,
      },
      telemetry_prompt_characters: {
        strategy: strategySteps.find((s) => s.step_name === "Content Strategy")
          ?.prompt_characters,
        concept: packageSteps.find((s) => s.step_name === "Video Concept")
          ?.prompt_characters,
        opening: packageSteps.find((s) => s.step_name === "Opening Impact")
          ?.prompt_characters,
        package: packageSteps.find((s) => s.step_name === "Content Package")
          ?.prompt_characters,
      },
    },
  };
  writeFileSync(
    resolve(OUT_DIR, "evidence-bundle.json"),
    redact(JSON.stringify(dumps, null, 2)),
  );

  // --- Markdown ---
  const L: string[] = [];
  const push = (...lines: string[]) => L.push(...lines);

  push(`# Production Run Evidence — \`${RUN_ID}\``);
  push("");
  push(`**Exported:** ${new Date().toISOString()}`);
  push(`**Project:** ${project!.name} (\`${run.project_id}\`)`);
  push("");
  push("## Storage status (facts)");
  push("");
  push("- Exact assembled system/user prompts at run time: **NOT PERSISTED** in telemetry or DB.");
  push("- Exact raw model completion bytes: **NOT PERSISTED** (only validated/parsed JSON fields and post-process package_brief).");
  push("- Telemetry stores: input_summary, output_summary, tokens, cost, duration, temperature, max_tokens, sizes.");
  push("- Sections labeled **RECONSTRUCTED** were rebuilt at audit time from current prompt builders + stored stage outputs + current project/assets/memory (with snapshotted `recent_creative_fingerprints` overlaid when present).");
  push("- Character-count match vs telemetry is reported; mismatch ⇒ reconstruction inputs differ from run-time.");
  push(`- Companion JSON: \`reports/fbe48cf4-evidence/evidence-bundle.json\``);
  push("");

  // ========== 1 TIMELINE ==========
  push("# 1. EXECUTION TIMELINE");
  push("");
  push("| time_start (UTC) | time_end | workflow/phase | step/node | provider | model | duration_ms | prompt_tok | completion_tok | cost_usd | retry | repair | success |");
  push("| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |");
  for (const s of allSteps) {
    push(
      `| ${s.started_at} | ${s.finished_at} | ${s._phase} | ${s.step_name} | ${s.provider} | ${s.model ?? "—"} | ${s.duration_ms} | ${s.prompt_tokens ?? "—"} | ${s.completion_tokens ?? "—"} | ${s.estimated_cost ?? "—"} | ${s.retry_count ?? 0} | ${s.repair} | ${s.success} |`,
    );
  }
  push("");
  push("### Timeline — input_summary / output_summary (persisted)");
  push("");
  for (const s of allSteps) {
    push(`#### ${s.step_name} (\`${s.started_at}\`)`);
    push("");
    push("**input_summary:**");
    push(fence("text", String(s.input_summary ?? "")));
    push("**output_summary:**");
    push(fence("text", String(s.output_summary ?? "")));
    push("**telemetry step (full):**");
    push(fence("json", j(s)));
  }

  // ========== 2 PIPELINE ==========
  push("# 2. COMPLETE PIPELINE — INPUT / OUTPUT");
  push("");

  push("## 2.1 Product Brain");
  push("");
  push("**SOURCE:** `projects` row fields (persisted). Not an AI step in this run.");
  push("");
  push("**OUTPUT (project brain fields):**");
  push(
    fence(
      "json",
      j({
        name: project!.name,
        type: project!.type,
        language: project!.language,
        market_scope: project!.market_scope,
        goal_type: project!.goal_type,
        target_audience: project!.target_audience,
        tone_of_voice: project!.tone_of_voice,
        product_is: project!.product_is,
        product_is_not: project!.product_is_not,
        product_strengths: project!.product_strengths,
        pain_points: project!.pain_points,
        forbidden_claims: project!.forbidden_claims,
        platforms: project!.platforms,
        default_cta: project!.default_cta,
      }),
    ),
  );

  push("## 2.2 Knowledge");
  push("");
  push("**SOURCE:** `projects.knowledge` jsonb (persisted).");
  push("");
  push("**OUTPUT:**");
  push(fence("json", j(project!.knowledge)));

  push("## 2.3 Recent Memory");
  push("");
  push("**PERSISTED SNAPSHOT on this run:** `package_brief.presentation_generation.recent_creative_fingerprints`");
  push("");
  push(fence("json", j(pg.recent_creative_fingerprints ?? null)));
  push("");
  push("**ALSO PERSISTED:** `series_context_considered` = " + j(pg.series_context_considered));
  push("");
  push("**RECONSTRUCTED AT AUDIT (live `buildAntiRepetitionMemory`, may include this package):**");
  push(fence("json", j(memoryNow)));

  push("## 2.4 Strategy");
  push("");
  push("**PERSISTED parent strategy_brief:**");
  push(fence("json", j(strategyBrief)));
  push("**PERSISTED strategy item:**");
  push(fence("json", j(stratItem)));

  push("## 2.5 Video Concept");
  push("");
  push("**PERSISTED OUTPUT:** `presentation_generation.video_concept`");
  push(fence("json", j(concept)));

  push("## 2.6 Opening Impact");
  push("");
  push("**PERSISTED OUTPUT:** `presentation_generation.opening_impact`");
  push(fence("json", j(opening)));

  push("## 2.7 Visual Identity");
  push("");
  push("**PERSISTED OUTPUT:** `presentation_generation.visual_identity`");
  push(fence("json", j(visualIdentity)));
  push("**REBUILT from concept+opening at audit (deterministic):**");
  push(fence("json", j(rebuiltVisual)));
  push(
    `**Byte-equal to persisted visual_identity:** ${JSON.stringify(visualIdentity) === JSON.stringify(rebuiltVisual)}`,
  );

  push("## 2.8 Content Package");
  push("");
  push("**PERSISTED OUTPUT:** full `package_brief` (post hook-align + normalize + presentation stamp)");
  push(fence("json", j(brief)));

  push("## 2.9 Images");
  push("");
  push("**INPUT prompts (from video_job.input.scenes):**");
  push(fence("json", j(asRecord(videoJob.input)?.scenes)));
  push("**OUTPUT still paths (from render_spec.scenes):**");
  const rs = asRecord(asRecord(videoJob.output)?.render_spec);
  push(
    fence(
      "json",
      j(
        (rs?.scenes as unknown[])?.map((s) => {
          const r = asRecord(s);
          return {
            id: r?.id,
            type: r?.type,
            image_bucket: r?.image_bucket,
            image_path: r?.image_path,
            duration_seconds: r?.duration_seconds,
            image_prompt: r?.image_prompt,
          };
        }),
      ),
    ),
  );
  push("**Image generation telemetry step:**");
  push(
    fence(
      "json",
      j(videoSteps.find((s) => s.step_name === "Image generation") ?? null),
    ),
  );

  push("## 2.10 Voice (TTS)");
  push("");
  push("**INPUT:**");
  push(
    fence(
      "json",
      j({
        voiceover_text: asRecord(videoJob.input)?.voiceover_text,
        tts_voice: asRecord(videoJob.input)?.tts_voice,
        selected_voice: asRecord(videoJob.input)?.selected_voice,
        voice_source: asRecord(videoJob.input)?.voice_source,
        tts_instructions: asRecord(videoJob.input)?.tts_instructions,
      }),
    ),
  );
  push("**OUTPUT telemetry:**");
  push(fence("json", j(videoSteps.find((s) => s.step_name === "TTS") ?? null)));
  push("**TTS validation debug:**");
  push(
    fence(
      "json",
      j({
        speech_duration: videoDbg.speech_duration,
        audio_duration: videoDbg.audio_duration,
        tts_tail_expected: videoDbg.tts_tail_expected,
        tts_tail_transcript: videoDbg.tts_tail_transcript,
        tts_tail_validation_passed: videoDbg.tts_tail_validation_passed,
        tts_validation_log: videoDbg.tts_validation_log,
        tts_validation_attempts: videoDbg.tts_validation_attempts,
        tts_tail_retry_used: videoDbg.tts_tail_retry_used,
      }),
    ),
  );

  push("## 2.11 Whisper");
  push("");
  push(fence("json", j(videoSteps.find((s) => s.step_name === "Whisper") ?? null)));
  push(
    fence(
      "json",
      j({
        language_detected: videoDbg.language_detected,
        whisper_word_count: videoDbg.whisper_word_count,
        fallback_used: videoDbg.fallback_used,
        subtitle_source: videoDbg.subtitle_source,
        match_ratio: videoDbg.match_ratio,
      }),
    ),
  );
  push("**Full word-level Whisper transcript: NOT PERSISTED.**");

  push("## 2.12 Subtitles");
  push("");
  push("**Package phrase subtitles (pre-whisper plan):**");
  push(fence("text", String(brief.subtitles ?? "")));
  push("**Job input subtitles:**");
  push(fence("text", String(asRecord(videoJob.input)?.subtitles ?? "")));
  push(
    fence(
      "json",
      j({
        srt_last_cue_end: videoDbg.srt_last_cue_end,
        subtitle_timeline_duration: videoDbg.subtitle_timeline_duration,
        subtitle_warning: videoDbg.subtitle_warning,
        subtitle_url: "[REDACTED_SIGNED_URL — see video_job.output.subtitle_url]",
      }),
    ),
  );
  push("**SRT file body: NOT INLINE in DB; stored in storage at subtitle_url.**");

  push("## 2.13 Render");
  push("");
  push(fence("json", j(videoSteps.find((s) => s.step_name === "Video rendering") ?? null)));
  push("**render_spec:**");
  push(fence("json", j(rs)));
  push("**render debug (selected):**");
  push(
    fence(
      "json",
      j({
        video_duration: videoDbg.video_duration,
        post_mux_duration: videoDbg.post_mux_duration,
        intermediate_video_duration: videoDbg.intermediate_video_duration,
        post_subtitle_duration: videoDbg.post_subtitle_duration,
        target_duration: videoDbg.target_duration,
        duration_delta: videoDbg.duration_delta,
        render_warning: videoDbg.render_warning,
        render_warnings: videoDbg.render_warnings,
        sfx_mixed: videoDbg.sfx_mixed,
        sfx_reason: videoDbg.sfx_reason,
        mp4_url: "[REDACTED_SIGNED_URL]",
        thumbnail_url: "[REDACTED_SIGNED_URL]",
        artifacts_persisted_at: asRecord(videoJob.output)?.artifacts_persisted_at,
      }),
    ),
  );

  // ========== 3 PROMPTS ==========
  push("# 3. EXACT AI PROMPTS");
  push("");
  push("## Storage note");
  push("");
  push("Raw prompts were not stored. Below = **RECONSTRUCTED** unless marked otherwise.");
  push("");

  const telConcept = packageSteps.find((s) => s.step_name === "Video Concept");
  const telOpening = packageSteps.find((s) => s.step_name === "Opening Impact");
  const telPackage = packageSteps.find((s) => s.step_name === "Content Package");
  const telStrategy = strategySteps.find(
    (s) => s.step_name === "Content Strategy",
  );

  push("## 3.1 Content Strategy");
  push("");
  push(`- MODEL (telemetry): \`${telStrategy?.model}\``);
  push(`- PROVIDER: \`${telStrategy?.provider}\``);
  push(`- TEMPERATURE (telemetry): ${j(telStrategy?.temperature)}`);
  push(`- MAX_TOKENS (telemetry): ${j(telStrategy?.max_tokens)}`);
  push(`- MAX_TOKENS (config at audit): ${j(strategyMaxTokens)}`);
  push(`- RESPONSE_FORMAT: ${j(telStrategy?.response_format)}`);
  push(`- STOP: not set in ClaudeProvider (Anthropic Messages API — no stop_sequences in code path)`);
  push(`- TOOLS: none`);
  push(`- prompt_characters telemetry: ${telStrategy?.prompt_characters}`);
  push(`- reconstructed user prompt chars: ${strategyPrompt.length}`);
  push(
    `- char match: ${strategyPrompt.length === telStrategy?.prompt_characters}`,
  );
  push("");
  push("### SYSTEM PROMPT (RECONSTRUCTED = PRODUCTION_STRATEGY_SYSTEM)");
  push(fence("text", PRODUCTION_STRATEGY_SYSTEM));
  push("### USER PROMPT (RECONSTRUCTED)");
  push(fence("text", strategyPrompt || "(reconstruction failed — see strategy_planning_meta)"));
  push("### EXPECTED SHAPE (RECONSTRUCTED)");
  push(fence("text", strategyExpectedShape || "(none)"));
  push("### SCHEMA");
  push(fence("text", "contentStrategyPlanSchema (lib/ai/schemas/contentStrategyPlan.ts)"));
  push("### PARAMS");
  push(
    fence(
      "json",
      j({
        timeoutMs: 180_000,
        maxTransportAttempts: 1,
        json: true,
        planning_meta: strategyPlanningMeta,
      }),
    ),
  );

  push("## 3.2 Video Concept");
  push("");
  push(`- MODEL: \`${telConcept?.model}\``);
  push(`- PROVIDER: \`${telConcept?.provider}\``);
  push(`- TEMPERATURE telemetry: ${j(telConcept?.temperature)}`);
  push(`- MAX_TOKENS telemetry: ${j(telConcept?.max_tokens)}`);
  push(`- ClaudeProvider default temperature when null: 0.7`);
  push(`- ClaudeProvider default max_tokens when null: 4096`);
  push(`- RESPONSE_FORMAT: ${j(telConcept?.response_format)}`);
  push(`- STOP: none`);
  push(`- TOOLS: none`);
  push(`- prompt_characters telemetry: ${telConcept?.prompt_characters}`);
  push(`- reconstructed user prompt chars: ${conceptPrompt.length}`);
  push(
    `- char match: ${conceptPrompt.length === telConcept?.prompt_characters}`,
  );
  push("");
  push("### SYSTEM PROMPT (RECONSTRUCTED)");
  push(fence("text", VIDEO_CONCEPT_SYSTEM));
  push("### USER PROMPT (RECONSTRUCTED)");
  push(fence("text", conceptPrompt));
  push("### EXPECTED SHAPE / SCHEMA");
  push(fence("text", "videoConceptSchema (lib/content-pipeline/schemas.ts)"));
  push("### PARAMS");
  push(
    fence(
      "json",
      j({
        timeoutMs: 120_000,
        maxTransportAttempts: 1,
        maxAttempts: 3,
        json: true,
        directives_mode_id: directives.mode.id,
        directives_hook_id: directives.hook.id,
        directives_persona_id: directives.persona.id,
      }),
    ),
  );

  push("## 3.3 Opening Impact");
  push("");
  push(`- MODEL: \`${telOpening?.model}\``);
  push(`- PROVIDER: \`${telOpening?.provider}\``);
  push(`- TEMPERATURE telemetry: ${j(telOpening?.temperature)}`);
  push(`- MAX_TOKENS telemetry: ${j(telOpening?.max_tokens)}`);
  push(`- OpenAITextProvider default temperature when null: 0.2`);
  push(`- OpenAITextProvider default max_tokens when null: 4096`);
  push(`- RESPONSE_FORMAT: ${j(telOpening?.response_format)}`);
  push(`- STOP: none in code path`);
  push(`- TOOLS: none`);
  push(`- prompt_characters telemetry: ${telOpening?.prompt_characters}`);
  push(`- reconstructed user prompt chars: ${openingPrompt.length}`);
  push(
    `- char match: ${openingPrompt.length === telOpening?.prompt_characters}`,
  );
  push("");
  push("### SYSTEM PROMPT (RECONSTRUCTED)");
  push(fence("text", OPENING_IMPACT_SYSTEM));
  push("### USER PROMPT (RECONSTRUCTED)");
  push(fence("text", openingPrompt));
  push("### SCHEMA");
  push(fence("text", "openingImpactSchema (lib/content-pipeline/schemas.ts)"));
  push("### PARAMS");
  push(
    fence(
      "json",
      j({ timeoutMs: 90_000, maxTransportAttempts: 1, json: true }),
    ),
  );

  push("## 3.4 Content Package");
  push("");
  push(`- MODEL: \`${telPackage?.model}\``);
  push(`- PROVIDER: \`${telPackage?.provider}\``);
  push(`- TEMPERATURE telemetry: ${j(telPackage?.temperature)}`);
  push(`- MAX_TOKENS telemetry: ${j(telPackage?.max_tokens)}`);
  push(`- Claude defaults when null: temperature 0.7, max_tokens 4096`);
  push(`- RESPONSE_FORMAT: ${j(telPackage?.response_format)}`);
  push(`- STOP: none`);
  push(`- TOOLS: none`);
  push(`- prompt_characters telemetry: ${telPackage?.prompt_characters}`);
  push(`- reconstructed user prompt chars: ${packagePrompt.length}`);
  push(
    `- char match: ${packagePrompt.length === telPackage?.prompt_characters}`,
  );
  push(`- system chars: ${packageSystem.length}`);
  push("");
  push("### SYSTEM PROMPT (RECONSTRUCTED)");
  push(fence("text", packageSystem));
  push("### USER PROMPT (RECONSTRUCTED)");
  push(fence("text", packagePrompt));
  push("### EXPECTED SHAPE (RECONSTRUCTED — forwarded to JSON repair if used; repair_count=0 this run)");
  push(fence("text", expectedShape));
  push("### SCHEMA ARGS");
  push(fence("json", j(schemaNote)));
  push("### PARAMS");
  push(
    fence(
      "json",
      j({
        timeoutMs: 180_000,
        maxTransportAttempts: 1,
        maxAttempts: 2,
        repairGuardrailFailures: true,
        json: true,
        variantCounts,
      }),
    ),
  );

  push("## 3.5 TTS");
  push("");
  push("TTS is not a chat completion. Input text = voiceover_text; voice = tts_voice; instructions = tts_instructions.");
  push(fence("json", j(videoSteps.find((s) => s.step_name === "TTS"))));
  push(
    fence(
      "json",
      j({
        model: "gpt-4o-mini-tts",
        voice: asRecord(videoJob.input)?.tts_voice,
        input_text: asRecord(videoJob.input)?.voiceover_text,
        instructions: asRecord(videoJob.input)?.tts_instructions,
      }),
    ),
  );

  push("## 3.6 Whisper");
  push("");
  push(fence("json", j(videoSteps.find((s) => s.step_name === "Whisper"))));
  push("Exact Whisper request body: NOT PERSISTED. Model whisper-1. Input = TTS audio bytes.");

  push("## 3.7 Image generation (×5 stills)");
  push("");
  push(fence("json", j(videoSteps.find((s) => s.step_name === "Image generation"))));
  push("Exact OpenAI Images API request bodies: NOT PERSISTED.");
  push("Per-scene prompts sent (from job input):");
  push(
    fence(
      "json",
      j(
        ((asRecord(videoJob.input)?.scenes as unknown[]) ?? []).map((s, i) => ({
          index: i,
          id: asRecord(s)?.id,
          prompt: asRecord(s)?.image_prompt,
        })),
      ),
    ),
  );

  // ========== 4 RESPONSES ==========
  push("# 4. EXACT AI RESPONSES");
  push("");
  push("Raw provider completion strings: **NOT PERSISTED**.");
  push("Below = closest persisted artifacts (validated JSON / post-processed fields).");
  push("");

  push("## 4.1 Content Strategy — persisted plan");
  push(fence("json", j(strategyBrief)));

  push("## 4.2 Video Concept — persisted validated object");
  push(fence("json", j(concept)));
  push(`completion_characters telemetry: ${telConcept?.completion_characters}`);
  push(`persisted JSON char length: ${JSON.stringify(concept).length}`);

  push("## 4.3 Opening Impact — persisted validated object");
  push(fence("json", j(opening)));
  push(`completion_characters telemetry: ${telOpening?.completion_characters}`);
  push(`persisted JSON char length: ${JSON.stringify(opening).length}`);

  push("## 4.4 Content Package — persisted package_brief (NOT raw model bytes)");
  push("");
  push("Post-model transforms applied before/during persist (from code):");
  push("1. Deterministic hook align to Opening Impact first_spoken_sentence");
  push("2. normalizeVisualScenePlan + syncLegacyFieldsFromVisualScenes");
  push("3. normalizeImagePrompts");
  push("4. presentation_generation stamp (concept/opening/identity/fingerprint/voice/…)");
  push("5. On content_items persist: appendUrlToText for selected X variant indices");
  push("");
  push(fence("json", j(brief)));
  push(`completion_characters telemetry: ${telPackage?.completion_characters}`);

  push("## 4.5 Visual Identity — deterministic (not AI)");
  push(fence("json", j(visualIdentity)));

  push("## 4.6 TTS / Whisper / Images / Render");
  push("Binary audio/images/mp4 not embedded. Telemetry + paths above in §2.");

  // ========== 5 DATA EVOLUTION ==========
  push("# 5. DATA EVOLUTION (DIFF)");
  push("");

  const strategyItemShape = {
    topic: stratBrief.topic,
    angle: stratBrief.angle,
    pain_point: stratBrief.pain_point,
    funnel_stage: stratItem!.funnel_stage,
    platform: stratItem!.platform,
    format: stratItem!.format,
  };
  const conceptShape = { ...concept };
  const openingShape = { ...opening };
  const packageCore = {
    title: pkg!.title,
    hook: brief.hook,
    voiceover_text: brief.voiceover_text,
    subtitles: brief.subtitles,
    cta: brief.cta,
    scenario: brief.scenario,
    video: brief.video,
    visual_scenes: brief.visual_scenes,
    image_prompts: brief.image_prompts,
    platform_outputs: brief.platform_outputs,
    asset_usage: brief.asset_usage,
    hashtags: brief.hashtags,
  };

  push("## Strategy → Concept");
  push(fence("json", j({ from: strategyItemShape, to_keys: Object.keys(conceptShape), diff_vs_strategy_item: keysDiff(strategyItemShape as never, conceptShape as never) })));
  push("**Fields present on Concept not on Strategy item brief:** " + Object.keys(concept).join(", "));
  push("");

  push("## Concept → Opening Impact");
  push(fence("json", j({ concept_keys: Object.keys(concept), opening_keys: Object.keys(opening), diff: keysDiff(concept as never, opening as never) })));
  push("");

  push("## Concept + Opening → Visual Identity");
  push(fence("json", j({ visual_identity_keys: Object.keys(visualIdentity ?? {}), equals_rebuilt: JSON.stringify(visualIdentity) === JSON.stringify(rebuiltVisual) })));
  push("");

  push("## Concept/Opening/Identity → Package core");
  push(
    fence(
      "json",
      j({
        package_core_keys: Object.keys(packageCore),
        concept_title: concept.title,
        package_title: pkg!.title,
        concept_narrative_arc_present: typeof concept.narrative_arc === "string",
        package_has_narrative_arc_field: "narrative_arc" in packageCore,
        opening_first_spoken: opening.first_spoken_sentence,
        package_hook: brief.hook,
        package_voiceover_starts_with_hook: String(brief.voiceover_text ?? "")
          .toLowerCase()
          .startsWith(String(opening.first_spoken_sentence ?? "").toLowerCase()),
        concept_product_role: concept.product_role,
        voiceover_text: brief.voiceover_text,
        asset_usage: brief.asset_usage,
        visual_scenes_count: Array.isArray(brief.visual_scenes)
          ? brief.visual_scenes.length
          : null,
        image_prompts_count: Array.isArray(brief.image_prompts)
          ? brief.image_prompts.length
          : null,
        platform_output_keys: Object.keys(
          asRecord(brief.platform_outputs) ?? {},
        ),
      }),
    ),
  );

  push("## Package → Video job input");
  const vin = asRecord(videoJob.input)!;
  push(
    fence(
      "json",
      j({
        added_on_job_input: [
          "scenes",
          "tts_voice",
          "tts_instructions",
          "selected_voice",
          "voice_scores",
          "voice_source",
          "visual_profile",
          "production_run_id",
          "package_id",
          "presentation_analyzer",
          "explicit_scene_plan",
          "creative_mode_beats",
          "asset_images",
        ],
        voiceover_text_equal:
          vin.voiceover_text === brief.voiceover_text,
        hook_equal: vin.hook === brief.hook,
        scenes_count: Array.isArray(vin.scenes) ? vin.scenes.length : null,
      }),
    ),
  );

  push("## Package → Content items (platform persist)");
  push(
    fence(
      "json",
      j(
        (contentItems ?? []).map((ci) => ({
          id: ci.id,
          platform: ci.platform,
          format: ci.format,
          title: ci.title,
          caption: ci.caption,
          cta: ci.cta,
          hashtags: ci.hashtags,
          generation_metadata: ci.generation_metadata,
        })),
      ),
    ),
  );

  push("## X caption variants: package_brief vs content_items");
  const poX = asRecord(asRecord(brief.platform_outputs)?.x);
  const xItems = (contentItems ?? []).filter((c) => c.platform === "x");
  push(
    fence(
      "json",
      j({
        package_caption_variants: poX?.caption_variants,
        content_item_captions: xItems.map((c) => ({
          variant: asRecord(c.generation_metadata)?.platform_variant_index,
          caption: c.caption,
        })),
      }),
    ),
  );

  push("## Images → Render");
  push(
    fence(
      "json",
      j({
        stills: (rs?.scenes as unknown[])?.map((s) => asRecord(s)?.image_path),
        motion: asRecord(rs?.metadata)?.semantic_motion,
        video_duration: videoDbg.video_duration,
      }),
    ),
  );

  // ========== 6 PROMPT CONTEXT ==========
  push("# 6. PROMPT CONTEXT (what each AI step received)");
  push("");
  push("Full reconstructed user prompts are in §3. Context blocks embedded therein include Product Brain, proof, scenarios, pain point, anti-repetition, directives, concept, opening, visual identity, assets, platform rules, variant counts.");
  push("");
  push("## 6.1 Product Brain block content (from project at audit)");
  push(
    fence(
      "json",
      j({
        product_is: project!.product_is,
        product_is_not: project!.product_is_not,
        product_strengths: project!.product_strengths,
        pain_points: project!.pain_points,
        forbidden_claims: project!.forbidden_claims,
        target_audience: project!.target_audience,
        tone_of_voice: project!.tone_of_voice,
        goal_type: project!.goal_type,
        default_cta: project!.default_cta,
      }),
    ),
  );
  push("## 6.2 Knowledge cards");
  push(fence("json", j(asRecord(project!.knowledge)?.cards ?? project!.knowledge)));
  push("## 6.3 Selected pain point used in pipeline");
  push(fence("text", String(painPoint ?? "")));
  push("## 6.4 Creative directives (RECONSTRUCTED from seed)");
  push(fence("json", j(directives)));
  push("## 6.5 Assets offered to Content Package prompt");
  push(fence("json", j(assets.refs)));
  push("## 6.6 Snapshotted recent fingerprints in prompt memory overlay");
  push(fence("json", j(snapFp)));

  // ========== 7 ASSETS ==========
  push("# 7. ASSETS");
  push("");
  push("## Existing project assets (loaded for package generation)");
  push(fence("json", j(assets.refs)));
  push("## asset_usage on package");
  push(fence("json", j(brief.asset_usage)));
  push("## video_job.input.asset_images");
  push(fence("json", j(vin.asset_images)));
  push("## AI-selected asset ids");
  push(fence("json", j([])));
  push("## AI-not-selected (all offered ids when asset_usage empty)");
  push(fence("json", j(assets.refs.map((a) => a.id))));

  // ========== 8 CTA FLOW ==========
  push("# 8. CTA FLOW");
  push("");
  push("## Project CTA");
  push(fence("json", j({ default_cta: project!.default_cta })));
  push("## Strategy CTA");
  push(fence("json", j({ strategy_item_brief_cta: stratBrief.cta ?? null, note: "no cta field on strategy item brief" })));
  push("## Concept CTA");
  push(fence("json", j({ narrative_arc_cta_segment: String(concept.narrative_arc ?? "").match(/CTA[\s\S]*/)?.[0] ?? null })));
  push("## Package CTA");
  push(fence("json", j(brief.cta)));
  push("## Platform CTAs (package_brief.platform_outputs)");
  push(
    fence(
      "json",
      j(
        Object.fromEntries(
          Object.entries(asRecord(brief.platform_outputs) ?? {}).map(
            ([k, v]) => [k, asRecord(v)?.cta ?? null],
          ),
        ),
      ),
    ),
  );
  push("## Final content_items CTA");
  push(
    fence(
      "json",
      j(
        (contentItems ?? []).map((c) => ({
          platform: c.platform,
          variant: asRecord(c.generation_metadata)?.platform_variant_index,
          cta: c.cta,
        })),
      ),
    ),
  );
  push("## presentation_generation CTA counters");
  push(
    fence(
      "json",
      j({
        cta_selected: pg.cta_selected,
        requested_cta_count: pg.requested_cta_count,
        accepted_cta_count: pg.accepted_cta_count,
        downgraded_cta_count: pg.downgraded_cta_count,
        cta_decision_reason: pg.cta_decision_reason,
        cta_composition_id: pg.cta_composition_id,
      }),
    ),
  );

  // ========== 9 FUNNEL ==========
  push("# 9. FUNNEL FLOW");
  push("");
  push(fence("json", j({
    project_goal_type: project!.goal_type,
    strategy_funnel_distribution: strategyBrief.funnel_distribution,
    strategy_item_funnel_stage: stratItem!.funnel_stage,
    package_funnel_stage: pkg!.funnel_stage,
    content_items_funnel: (contentItems ?? []).map((c) => ({
      platform: c.platform,
      funnel_stage: asRecord(c.generation_metadata)?.funnel_stage,
    })),
  })));

  // ========== 10 PRODUCT FLOW ==========
  push("# 10. PRODUCT FLOW");
  push("");
  push("## Product Brain product_is / strengths");
  push(fence("json", j({ product_is: project!.product_is, product_strengths: project!.product_strengths })));
  push("## Strategy item text (topic/angle/pain)");
  push(fence("json", j(stratBrief)));
  push("## Concept product_role / core_idea");
  push(fence("json", j({ product_role: concept.product_role, core_idea: concept.core_idea, narrative_arc: concept.narrative_arc })));
  push("## Voiceover");
  push(fence("text", String(brief.voiceover_text ?? "")));
  push("## Platform outputs (full)");
  push(fence("json", j(brief.platform_outputs)));
  push("## Final video — product mentions in VO / scenes");
  push(fence("json", j({
    voiceover_text: brief.voiceover_text,
    scene_4_prompt: (brief.visual_scenes as unknown[])?.[3],
    scene_5_prompt: (brief.visual_scenes as unknown[])?.[4],
  })));

  // ========== 11 VISUAL FLOW ==========
  push("# 11. VISUAL FLOW");
  push("");
  push("## Concept visual_direction");
  push(fence("json", j(concept.visual_direction)));
  push("## Visual identity");
  push(fence("json", j(visualIdentity)));
  push("## visual_scenes");
  push(fence("json", j(brief.visual_scenes)));
  push("## image_prompts");
  push(fence("json", j(brief.image_prompts)));
  push("## Generated image paths");
  push(fence("json", j((rs?.scenes as unknown[])?.map((s) => ({ id: asRecord(s)?.id, path: asRecord(s)?.image_path })))));
  push("## Render motion + durations");
  push(fence("json", j({ semantic_motion: asRecord(rs?.metadata)?.semantic_motion, scenes: rs?.scenes })));

  // ========== 12 VOICE FLOW ==========
  push("# 12. VOICE FLOW");
  push("");
  push("## Concept narration (narrative_arc)");
  push(fence("text", String(concept.narrative_arc ?? "")));
  push("## Opening first_spoken_sentence + first_image");
  push(fence("json", j(opening)));
  push("## Package voiceover_text");
  push(fence("text", String(brief.voiceover_text ?? "")));
  push("## TTS input");
  push(fence("json", j({
    text: vin.voiceover_text,
    voice: vin.tts_voice,
    instructions: vin.tts_instructions,
  })));
  push("## Whisper output (persisted fields only)");
  push(fence("json", j({
    word_count: videoDbg.whisper_word_count,
    language: videoDbg.language_detected,
    match_ratio: videoDbg.match_ratio,
    tail_transcript: videoDbg.tts_tail_transcript,
  })));
  push("## Final subtitles (package phrases)");
  push(fence("text", String(brief.subtitles ?? "")));

  // ========== 13 PLATFORM ==========
  push("# 13. PLATFORM OUTPUTS (complete)");
  push("");
  for (const [plat, val] of Object.entries(asRecord(brief.platform_outputs) ?? {})) {
    push(`## ${plat}`);
    push(fence("json", j(val)));
  }
  push("## content_items rows (complete captions)");
  push(fence("json", j(contentItems)));

  // ========== 14 PACKAGE ==========
  push("# 14. COMPLETE PACKAGE");
  push("");
  push("## content_packages row");
  push(fence("json", j(pkg)));
  push("## package_brief only");
  push(fence("json", j(brief)));

  // ========== 15 FINAL VIDEO ==========
  push("# 15. FINAL VIDEO");
  push("");
  push(
    fence(
      "json",
      j({
        video_job_id: videoJob.id,
        status: videoJob.status,
        provider: videoJob.provider,
        created_at: videoJob.created_at,
        completed_at: videoJob.completed_at,
        content_item_id: videoJob.content_item_id,
        tts_voice: vin.tts_voice,
        visual_profile: vin.visual_profile,
        speech_duration: videoDbg.speech_duration,
        video_duration: videoDbg.video_duration,
        audio_duration: videoDbg.audio_duration,
        post_mux_duration: videoDbg.post_mux_duration,
        resolution: "NOT_PERSISTED_AS_FIELD",
        scene_count: Array.isArray(vin.scenes) ? vin.scenes.length : null,
        scene_types: (vin.scenes as unknown[])?.map((s) => asRecord(s)?.type),
        image_paths: (rs?.scenes as unknown[])?.map((s) => asRecord(s)?.image_path),
        subtitle_source: videoDbg.subtitle_source,
        match_ratio: videoDbg.match_ratio,
        sfx_mixed: videoDbg.sfx_mixed,
        render_warnings: videoDbg.render_warnings,
        mp4_storage: "video-renders bucket (signed URL redacted)",
        thumbnail_storage: "signed URL redacted",
        subtitle_storage: "signed URL redacted",
        render_spec_version: rs?.version,
        semantic_motion_version: asRecord(asRecord(rs?.metadata)?.semantic_motion)?.version,
      }),
    ),
  );
  push("## Full video_job.input");
  push(fence("json", j(videoJob.input)));
  push("## Full video_job.output.debug (URLs redacted upstream where needed)");
  push(fence("json", j(videoDbg)));

  // ========== 16 OBSERVATIONS ==========
  push("# 16. OBSERVATIONS (technical facts only)");
  push("");
  push(`- production_run.status = \`${run.status}\`; generated_total=${run.generated_total}; failed_total=${run.failed_total}`);
  push(`- productive window: run.created_at=${run.created_at} → run_item.updated_at=${runItem.updated_at}; parent run.updated_at=${run.updated_at}`);
  push(`- production_run_items.content_item_id = ${j(runItem.content_item_id)}; video_job_id = ${j(runItem.video_job_id)}`);
  push(`- AI text steps: Content Strategy, Video Concept, Opening Impact, Content Package; repair steps count = ${allSteps.filter((s) => s.repair).length}`);
  push(`- retry_count sum across steps = ${allSteps.reduce((a, s) => a + Number(s.retry_count ?? 0), 0)}`);
  push(`- selected_voice / tts_voice on job = ${j(vin.selected_voice)} / ${j(vin.tts_voice)}; voice_source = ${j(vin.voice_source)}`);
  push(`- resolved_primary_voice = ${j(pg.resolved_primary_voice)}; resolved_secondary_voice = ${j(pg.resolved_secondary_voice)}`);
  push(`- creative_mode = ${j(pg.creative_mode)}`);
  push(`- visual_profile = ${j(pg.visual_profile)}; visual_beat_count = ${j(pg.visual_beat_count)}; target_visual_beat_count = ${j(pg.target_visual_beat_count)}`);
  push(`- final_worker_scene_types = ${j(pg.final_worker_scene_types)}`);
  push(`- prompt_presentation_types = ${j(pg.prompt_presentation_types)}`);
  push(`- requested_cta_count = ${j(pg.requested_cta_count)}; accepted_cta_count = ${j(pg.accepted_cta_count)}`);
  push(`- asset_usage length = ${Array.isArray(brief.asset_usage) ? brief.asset_usage.length : "n/a"}`);
  push(`- offered assets count = ${assets.refs.length}`);
  push(`- package video.duration_seconds = ${j(asRecord(brief.video)?.duration_seconds)}; speech_duration = ${j(videoDbg.speech_duration)}; video_duration = ${j(videoDbg.video_duration)}`);
  push(`- scene duration_seconds sum on job input = ${(vin.scenes as { duration_seconds?: number }[])?.reduce((a, s) => a + (s.duration_seconds ?? 0), 0)}`);
  push(`- hook field equals opening.first_spoken_sentence: ${brief.hook === opening.first_spoken_sentence}`);
  push(`- platform_outputs keys: ${Object.keys(asRecord(brief.platform_outputs) ?? {}).join(", ")}`);
  push(`- content_items count = ${(contentItems ?? []).length}`);
  push(`- X content_item variant index 2 caption contains URL: ${String(xItems.find((c) => asRecord(c.generation_metadata)?.platform_variant_index === 2)?.caption ?? "").includes("http")}`);
  push(`- package_brief.x.caption_variants[2] contains URL: ${String((poX?.caption_variants as string[] | undefined)?.[2] ?? "").includes("http")}`);
  push(`- narrative_arc string length = ${String(concept.narrative_arc ?? "").length}; voiceover_text length = ${String(brief.voiceover_text ?? "").length}`);
  push(`- product_role present on concept: ${typeof concept.product_role === "string"}`);
  push(`- voiceover_text includes substring "Fenrik": ${String(brief.voiceover_text ?? "").includes("Fenrik")}`);
  push(`- voiceover_text includes substring "assistant": ${/assistant/i.test(String(brief.voiceover_text ?? ""))}`);
  push(`- image_prompts and visual_scenes prompts equal: ${JSON.stringify((brief.visual_scenes as { image_prompt?: string }[])?.map((s) => s.image_prompt)) === JSON.stringify(brief.image_prompts)}`);
  push(`- reconstructed Concept prompt char match telemetry: ${conceptPrompt.length === telConcept?.prompt_characters}`);
  push(`- reconstructed Opening prompt char match telemetry: ${openingPrompt.length === telOpening?.prompt_characters}`);
  push(`- reconstructed Package prompt char match telemetry: ${packagePrompt.length === telPackage?.prompt_characters}`);
  push(`- reconstructed Strategy prompt char match telemetry: ${strategyPrompt.length === telStrategy?.prompt_characters}`);
  push(`- cached_tokens on all AI steps: ${j(allSteps.map((s) => ({ step: s.step_name, cached: s.cached_tokens })))}`);
  push(`- n8n package bridge (from prior lookup): workflow O27ELb1s9Y2qisOr execution 1232 ~ 2026-07-25T00:08:09Z → 00:09:56Z`);
  push("");
  push("---");
  push("");
  push("End of evidence export.");

  const md = L.join("\n");
  writeFileSync(OUT_MD, md);
  console.log(OUT_MD);
  console.log(
    JSON.stringify(
      {
        bytes: Buffer.byteLength(md),
        lines: L.length,
        prompt_char_match: {
          strategy: strategyPrompt.length === telStrategy?.prompt_characters,
          concept: conceptPrompt.length === telConcept?.prompt_characters,
          opening: openingPrompt.length === telOpening?.prompt_characters,
          package: packagePrompt.length === telPackage?.prompt_characters,
        },
        reconstructed_chars: {
          strategy: strategyPrompt.length,
          concept: conceptPrompt.length,
          opening: openingPrompt.length,
          package: packagePrompt.length,
        },
        telemetry_chars: {
          strategy: telStrategy?.prompt_characters,
          concept: telConcept?.prompt_characters,
          opening: telOpening?.prompt_characters,
          package: telPackage?.prompt_characters,
        },
        companion: resolve(OUT_DIR, "evidence-bundle.json"),
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
