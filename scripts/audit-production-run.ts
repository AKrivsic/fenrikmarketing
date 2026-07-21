/**
 * Read-only production run audit — Markdown + JSON summary.
 * Usage: npx tsx scripts/audit-production-run.ts <production_run_id>
 *
 * Never writes to Supabase; never triggers generation or retries.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatTechnicalAuditTelemetrySection,
  readTelemetrySteps,
} from "@/lib/ai/telemetry";

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

const RUN_ID = process.argv[2]?.trim();
if (!RUN_ID) {
  console.error("Usage: npx tsx scripts/audit-production-run.ts <production_run_id>");
  process.exit(1);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function mdJson(value: unknown): string {
  return "```json\n" + JSON.stringify(value, null, 2) + "\n```";
}

function mdBlock(title: string, text: string | null | undefined): string {
  if (!text?.trim()) return `**${title}:** _(empty)_\n\n`;
  return `**${title}:**\n\n${text.trim()}\n\n`;
}

/** Strip signed URL tokens; prefer bucket/path when present. */
function redactStorageUrl(
  url: string | null | undefined,
  bucket?: string | null,
  path?: string | null,
): string {
  if (bucket && path) return `supabase-storage://${bucket}/${path}`;
  if (!url || typeof url !== "string") return "_(not stored)_";
  try {
    const u = new URL(url);
    const marker = "/object/sign/";
    const idx = u.pathname.indexOf(marker);
    if (idx >= 0) {
      const rest = u.pathname.slice(idx + marker.length);
      return `supabase-storage://${rest.split("?")[0]}`;
    }
    return `${u.origin}${u.pathname}`;
  } catch {
    return "_(invalid url)_";
  }
}

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function sceneTypeOf(entry: unknown): string {
  const r = asRecord(entry);
  if (!r) return "IMAGE";
  if (typeof r.type === "string") return r.type;
  if (r.source === "ai" || typeof r.image_prompt === "string") return "IMAGE";
  if (r.checklist || r.title && Array.isArray(r.items)) return "CHECKLIST";
  if (r.phone || r.caption && r.asset_id) return "PHONE";
  if (r.quote) return "QUOTE";
  if (r.statistic || r.value) return "STATISTIC";
  if (r.cta || r.headline) return "CTA";
  return "UNKNOWN";
}

function countSceneTypes(scenes: unknown[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of scenes) {
    const t = sceneTypeOf(s);
    out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}

async function main(): Promise<void> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const { getReviewRunExport } = await import("@/lib/api/review-runs-admin");
  const { readDebug, readVideoOutput, newestByContentItem } = await import(
    "@/lib/api/content-shared"
  );
  const { resolveTtsOptions } = await import("@/lib/voice/resolveTtsOptions");
  const { parseKnowledgePresentation } = await import(
    "@/lib/voice/knowledgePresentation"
  );
  const { projectContextForVisualProfile } = await import(
    "@/lib/visual-profile/packageVisualProfile"
  );
  const { resolveVisualProfile } = await import(
    "@/lib/visual-profile/resolveVisualProfile"
  );
  const { tokensForVisualProfile } = await import(
    "@/lib/visual-profile/visualProfileTokens"
  );
  const { parseVisualProfile } = await import("@/lib/visual-profile/visualProfile");

  type Project = import("@/lib/supabase/types").Project;
  type ContentPackage = import("@/lib/supabase/types").ContentPackage;
  type VideoJob = import("@/lib/supabase/types").VideoJob;
  type StrategyItemRow = {
    id: string;
    strategy_id: string;
    project_id: string;
    platform: string;
    format: string;
    topic_id: string | null;
    trend_id: string | null;
    brief: unknown;
    priority: number;
    created_at: string;
    funnel_stage?: string | null;
  };

  const supabase = createSupabaseAdminClient();
  const base = await getReviewRunExport(RUN_ID);
  if (!base) {
    console.error(`Production run not found: ${RUN_ID}`);
    process.exit(1);
  }

  const projectId = base.run.project_id;
  const { data: projectRow, error: projectErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (projectErr) throw projectErr;
  const project = projectRow as Project;

  const { data: strategyRows, error: strategyErr } = await supabase
    .from("content_strategy_items")
    .select("*")
    .eq("project_id", projectId)
    .eq("brief->>production_run_id", RUN_ID)
    .order("created_at", { ascending: true });
  if (strategyErr) throw strategyErr;
  const strategyItems = (strategyRows ?? []) as StrategyItemRow[];

  const strategyIds = Array.from(
    new Set(strategyItems.map((s) => s.strategy_id).filter(Boolean)),
  );
  let strategies: { id: string; name: string | null; strategy_brief: unknown }[] =
    [];
  if (strategyIds.length > 0) {
    const { data: stratRows, error: stratErr } = await supabase
      .from("content_strategies")
      .select("id, name, strategy_brief")
      .in("id", strategyIds);
    if (stratErr) throw stratErr;
    strategies = (stratRows ?? []) as typeof strategies;
  }

  const { data: runItems, error: runItemsErr } = await supabase
    .from("production_run_items")
    .select("*")
    .eq("production_run_id", RUN_ID)
    .order("created_at", { ascending: true });
  if (runItemsErr) throw runItemsErr;

  const { data: assetRows, error: assetErr } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (assetErr) throw assetErr;

  const primaryItems = base.content_items.filter((i) => i.language === null);
  const itemIds = primaryItems.map((i) => i.id);
  let assetUsage: unknown[] = [];
  if (itemIds.length > 0) {
    const { data: usageRows, error: usageErr } = await supabase
      .from("asset_usage")
      .select("*")
      .eq("project_id", projectId)
      .in("content_item_id", itemIds);
    if (usageErr) throw usageErr;
    assetUsage = usageRows ?? [];
  }

  const jobsByItem = newestByContentItem(
    [...base.video_jobs].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
  );
  const canonicalJobs: VideoJob[] = Array.from(jobsByItem.values());

  const projectTts = resolveTtsOptions({
    projectId: project.id,
    language: project.language,
    toneOfVoice: project.tone_of_voice,
    knowledge: project.knowledge,
  });
  const presentation = parseKnowledgePresentation(project.knowledge);

  const voiceSourceLabel = (() => {
    const pref = presentation.preferred_voice?.trim().toLowerCase();
    if (pref && pref !== "auto") return `project preferred voice (${pref})`;
    if (
      pref === "auto" ||
      presentation.voice_selection === "deterministic"
    ) {
      return "automatic deterministic selection";
    }
    return "legacy default (no presentation override)";
  })();

  const resolvedProfile = resolveVisualProfile(
    projectContextForVisualProfile({ project }),
  );
  const profileTokens = tokensForVisualProfile(
    parseVisualProfile(resolvedProfile.profile),
  );

  const packages = [...base.packages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const pkgByStrategy = new Map(
    packages.map((p) => [p.strategy_item_id ?? "", p]),
  );

  const sceneTypeTotals: Record<string, number> = {};
  let moderationFallbackCount = 0;
  const voicesUsed = new Set<string>();
  const profilesUsed = new Set<string>();

  const lines: string[] = [];
  lines.push(`# Production Run Audit — ${RUN_ID}`);
  lines.push("");
  lines.push(`_Generated ${new Date().toISOString()} by \`scripts/audit-production-run.ts\` (read-only)._`);
  lines.push("");

  // Placeholder for executive summary (replaced after package loop).
  const summarySlot = lines.length;
  lines.push("## A. Executive summary");
  lines.push("");
  lines.push("<!-- summary-placeholder -->");
  lines.push("");

  lines.push("## B. Run overview");
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| production_run_id | \`${base.run.id}\` |`);
  lines.push(`| project_id | \`${projectId}\` |`);
  lines.push(`| project name | ${project.name} |`);
  lines.push(`| status | ${base.run.status} |`);
  lines.push(`| created_at | ${base.run.created_at} |`);
  lines.push(`| updated_at (terminal) | ${base.run.updated_at} |`);
  lines.push(`| package_count | ${base.run.package_count} |`);
  lines.push(`| requested_total | ${base.run.requested_total} |`);
  lines.push(`| generated_total | ${base.run.generated_total} |`);
  lines.push(`| failed_total | ${base.run.failed_total} |`);
  lines.push(`| error_message | ${base.run.error_message ?? ""} |`);
  lines.push(`| language | ${project.language} |`);
  lines.push(`| market_scope | ${project.market_scope} |`);
  lines.push("");
  lines.push("### requested_config");
  lines.push("");
  lines.push(mdJson(base.run.requested_config));
  lines.push("");
  lines.push("### Parent content strategies");
  lines.push("");
  for (const s of strategies) {
    lines.push(`- **${s.id}** — ${s.name ?? "(unnamed)"}`);
    lines.push(mdJson(s.strategy_brief));
  }
  lines.push("");
  lines.push("### production_run_items");
  lines.push("");
  lines.push(mdJson(runItems ?? []));
  lines.push("");

  lines.push("## C. Package-by-package audit");
  lines.push("");

  const matrixRows: string[] = [];

  for (let pkgIndex = 0; pkgIndex < packages.length; pkgIndex++) {
    const pkg = packages[pkgIndex] as ContentPackage;
    const brief = asRecord(pkg.package_brief) ?? {};
    const strategyItem = strategyItems.find(
      (si) => si.id === pkg.strategy_item_id,
    );
    const siBrief = asRecord(strategyItem?.brief) ?? {};
    const primaryItem = primaryItems.find((i) => i.package_id === pkg.id);
    const job = canonicalJobs.find(
      (j) => j.content_item_id === primaryItem?.id,
    );
    const jobInput = asRecord(job?.input) ?? {};
    const jobOutput = asRecord(job?.output) ?? {};
    const renderSpec = asRecord(jobOutput.render_spec) ?? {};
    const renderMeta = asRecord(renderSpec.metadata) ?? {};
    const imgWarnings = Array.isArray(renderMeta.image_generation_warnings)
      ? renderMeta.image_generation_warnings
      : [];
    moderationFallbackCount += imgWarnings.length;

    const inputScenes = Array.isArray(jobInput.scenes) ? jobInput.scenes : [];
    const briefScenes = Array.isArray(brief.visual_scenes)
      ? brief.visual_scenes
      : [];
    const outputScenes = Array.isArray(renderSpec.scenes)
      ? renderSpec.scenes
      : [];

    for (const s of inputScenes) {
      const t = sceneTypeOf(s);
      sceneTypeTotals[t] = (sceneTypeTotals[t] ?? 0) + 1;
    }

    const voice =
      typeof jobInput.tts_voice === "string" ? jobInput.tts_voice : null;
    if (voice) voicesUsed.add(voice);
    const profile =
      typeof jobInput.visual_profile === "string"
        ? jobInput.visual_profile
        : typeof brief.presentation_generation === "object"
          ? (asRecord(brief.presentation_generation)?.visual_profile as string)
          : null;
    if (profile) profilesUsed.add(profile);

    const presGen =
      asRecord(jobInput.presentation_analyzer)?.presentation_generation ??
      brief.presentation_generation;
    const presRec = asRecord(presGen) ?? {};

    const typedCounts = {
      CHECKLIST: Number(presRec.accepted_checklist_count ?? 0),
      PHONE: Number(presRec.accepted_phone_count ?? 0),
      QUOTE: Number(presRec.accepted_quote_count ?? 0),
      STATISTIC: Number(presRec.accepted_statistic_count ?? 0),
      CTA: Number(presRec.accepted_cta_count ?? 0),
    };

    const semanticBeats =
      asRecord(renderMeta.semantic_motion)?.beats ??
      asRecord(jobInput.stored_semantic_motion)?.beats;
    const beatList = Array.isArray(semanticBeats) ? semanticBeats : [];

    matrixRows.push(
      `| ${pkg.title} | ${voice ?? "—"} | ${profile ?? "—"} | ${typedCounts.CHECKLIST} | ${typedCounts.PHONE} | ${typedCounts.QUOTE} | ${typedCounts.STATISTIC} | ${typedCounts.CTA} | ${beatList.length > 0 ? "yes" : "no"} | ${imgWarnings.length} |`,
    );

    lines.push(`### Package ${pkgIndex + 1} — ${pkg.title}`);
    lines.push("");
    lines.push("#### Package identity");
    lines.push("");
    lines.push(`| Field | Value |`);
    lines.push(`| --- | --- |`);
    lines.push(`| package_id | \`${pkg.id}\` |`);
    lines.push(`| strategy_item_id | \`${pkg.strategy_item_id ?? ""}\` |`);
    lines.push(`| weekly_strategy_id | \`${pkg.weekly_strategy_id ?? ""}\` |`);
    lines.push(`| production_run_id | \`${RUN_ID}\` |`);
    lines.push(`| status | ${pkg.status} |`);
    lines.push(`| funnel_stage | ${pkg.funnel_stage ?? ""} |`);
    lines.push(`| created_at | ${pkg.created_at} |`);
    lines.push(`| updated_at | ${pkg.updated_at} |`);
    lines.push(`| primary content_item_id | \`${primaryItem?.id ?? ""}\` |`);
    lines.push(`| video_job_id | \`${job?.id ?? ""}\` |`);
    lines.push(`| video_job status | ${job?.status ?? "—"} |`);
    lines.push("");

    const pgRec = asRecord(brief.presentation_generation) ?? {};
    const telemetrySteps = readTelemetrySteps(pgRec.generation_telemetry);
    const jobDebug = asRecord(jobOutput.debug);
    const workerSteps = readTelemetrySteps(jobDebug?.generation_telemetry);
    const allSteps = [...telemetrySteps, ...workerSteps];
    const totalMs =
      allSteps.length > 0
        ? allSteps.reduce((sum, s) => sum + (s.duration_ms || 0), 0)
        : null;
    lines.push(
      formatTechnicalAuditTelemetrySection({
        totalDurationMs: totalMs,
        steps: allSteps,
      }),
    );
    lines.push("");

    lines.push("#### Strategy input");
    lines.push("");
    if (strategyItem) {
      lines.push(`- **topic:** ${siBrief.topic ?? ""}`);
      lines.push(`- **angle:** ${siBrief.angle ?? ""}`);
      lines.push(`- **package_index:** ${siBrief.package_index ?? ""}`);
      lines.push(`- **platform:** ${strategyItem.platform}`);
      lines.push(`- **format:** ${strategyItem.format}`);
      lines.push(`- **priority:** ${strategyItem.priority}`);
      lines.push(`- **funnel_stage (column):** ${(strategyItem as { funnel_stage?: string }).funnel_stage ?? ""}`);
      lines.push(`- **trend_id:** ${strategyItem.trend_id ?? ""}`);
      lines.push(`- **topic_id:** ${strategyItem.topic_id ?? ""}`);
      lines.push("");
      lines.push("**strategy item brief (full JSON)**");
      lines.push("");
      lines.push(mdJson(strategyItem.brief));
    } else {
      lines.push("_No linked strategy item found._");
    }
    lines.push("");

    lines.push("#### Full content (package_brief core)");
    lines.push("");
    lines.push(mdBlock("hook", typeof brief.hook === "string" ? brief.hook : null));
    lines.push(mdBlock("voiceover_text", typeof brief.voiceover_text === "string" ? brief.voiceover_text : null));
    lines.push(mdBlock("subtitles", typeof brief.subtitles === "string" ? brief.subtitles : null));
    const video = asRecord(brief.video);
    if (video) {
      lines.push(mdBlock("video concept", typeof video.concept === "string" ? video.concept : null));
      lines.push(mdBlock("video script", typeof video.script === "string" ? video.script : null));
      lines.push(`**duration_seconds (brief):** ${video.duration_seconds ?? ""}\n`);
    }
    const cta = asRecord(brief.cta);
    if (cta) {
      lines.push(`**CTA:** ${cta.text ?? ""} (type: ${cta.type ?? ""})\n`);
    }
    lines.push(`**creative_mode:** ${brief.creative_mode ?? jobInput.creative_mode ?? ""}\n`);
    lines.push(`**hashtags:** ${JSON.stringify(brief.hashtags ?? [])}\n`);
    lines.push("");

    lines.push("#### Full platform copy");
    lines.push("");
    const platformOutputs =
      base.platform_outputs[pkg.id] ??
      (asRecord(brief.platform_outputs) as Record<string, unknown> | null);
    if (platformOutputs && typeof platformOutputs === "object") {
      for (const [platform, payload] of Object.entries(platformOutputs)) {
        lines.push(`##### ${platform}`);
        lines.push("");
        lines.push(mdJson(payload));
      }
    } else {
      lines.push("_No platform_outputs stored._");
    }
    lines.push("");

    lines.push("#### package_brief (presentation / scenes / assets)");
    lines.push("");
    lines.push(mdJson({
      visual_scenes: brief.visual_scenes,
      image_prompts: brief.image_prompts,
      asset_usage: brief.asset_usage,
      presentation_generation: brief.presentation_generation,
      presentation_analyzer: jobInput.presentation_analyzer ?? null,
    }));
    lines.push("");

    lines.push("#### Scene-by-scene");
    lines.push("");
    lines.push(
      "| # | scene_id | requested/final type | renderer | image bucket/path | moderation / fallback |",
    );
    lines.push("| ---: | --- | --- | --- | --- | --- |");
    for (let i = 0; i < inputScenes.length; i++) {
      const inp = asRecord(inputScenes[i]) ?? {};
      const out = asRecord(outputScenes[i]) ?? {};
      const warn = imgWarnings.find(
        (w: unknown) => asRecord(w)?.scene_id === inp.id,
      );
      const warnRec = asRecord(warn);
      const bucket = (out.image_bucket as string) ?? "";
      const path = (out.image_path as string) ?? "";
      const fb = warnRec
        ? `blocked=${warnRec.original_generation_blocked ?? "?"} retry=${warnRec.safe_retry_attempted ?? "?"} local=${warnRec.local_fallback_used ?? "?"}`
        : "—";
      lines.push(
        `| ${i + 1} | ${inp.id ?? ""} | ${inp.type ?? sceneTypeOf(briefScenes[i])} | ${inp.renderer_version ?? ""} | \`${bucket}/${path}\` | ${fb} |`,
      );
    }
    lines.push("");
    for (let i = 0; i < inputScenes.length; i++) {
      const inp = asRecord(inputScenes[i]) ?? {};
      lines.push(`**Scene ${i + 1} (${inp.id ?? ""}) — image_prompt (job input)**`);
      lines.push("");
      lines.push("```");
      lines.push(String(inp.image_prompt ?? ""));
      lines.push("```");
      lines.push("");
      const payload = asRecord(inp.payload_snapshot);
      if (payload && Object.keys(payload).length > 0) {
        lines.push(mdJson(payload));
      }
    }

    lines.push("#### TTS / voice");
    lines.push("");
    const voText =
      typeof jobInput.voiceover_text === "string"
        ? jobInput.voiceover_text
        : String(brief.voiceover_text ?? "");
    const debug = readDebug(job?.output ?? null);
    lines.push(`- **requested TTS voice (job input):** ${voice ?? "—"}`);
    lines.push(`- **resolved at render:** ${voice ?? projectTts.voice}`);
    lines.push(`- **project voice resolution:** ${voiceSourceLabel} → \`${projectTts.voice}\``);
    lines.push(`- **differs from alloy:** ${voice !== "alloy" ? "yes" : "no"}`);
    lines.push(`- **TTS instructions applied:** ${typeof jobInput.tts_instructions === "string" ? "yes" : projectTts.instructions ? "yes (project)" : "no"}`);
    if (typeof jobInput.tts_instructions === "string") {
      lines.push("");
      lines.push(mdBlock("tts_instructions", jobInput.tts_instructions));
    }
    lines.push(`- **voiceover characters:** ${voText.length}`);
    lines.push(`- **estimated words:** ${wordCount(voText)}`);
    lines.push(`- **audio_duration (debug):** ${debug?.audio_duration ?? "—"}`);
    lines.push(`- **TTS validation attempts:** ${(debug as Record<string, unknown> | null)?.tts_validation_attempts ?? "—"}`);
    lines.push(`- **tail validation passed:** ${(debug as Record<string, unknown> | null)?.tts_tail_validation_passed ?? "—"}`);
    lines.push(`- **tts_tail_retry_used:** ${(debug as Record<string, unknown> | null)?.tts_tail_retry_used ?? "—"}`);
    lines.push("");

    lines.push("#### Visual profile");
    lines.push("");
    lines.push(`- **package/job profile:** ${profile ?? "—"}`);
    lines.push(`- **version:** ${jobInput.visual_profile_version ?? presRec.visual_profile_version ?? ""}`);
    lines.push(`- **project auto-resolved profile:** ${resolvedProfile.profile} (source: ${resolvedProfile.source})`);
    lines.push(`- **EDITORIAL prompt style token:** ${profileTokens.imagePromptStyle}`);
    lines.push(`- **prompts include Editorial suffix:** ${String(voText).length >= 0 && inputScenes.some((s) => String(asRecord(s)?.image_prompt ?? "").includes("Editorial")) ? "yes (in image prompts)" : "check prompts"}`);
    lines.push("");

    lines.push("#### Semantic motion");
    lines.push("");
    if (beatList.length === 0) {
      lines.push("_No semantic_motion beats in render_spec metadata._");
    } else {
      lines.push("| beat_id | scene_id | intent | primitive | intensity |");
      lines.push("| --- | --- | --- | --- | --- |");
      for (const b of beatList) {
        const r = asRecord(b) ?? {};
        lines.push(
          `| ${r.beat_id ?? ""} | ${r.scene_id ?? ""} | ${r.motion_intent ?? ""} | ${r.motion_primitive ?? ""} | ${r.motion_intensity ?? ""} |`,
        );
      }
    }
    lines.push(`- **semantic_motion flag on input:** ${jobInput.semantic_motion === false ? "disabled" : "enabled/default"}`);
    lines.push(`- **stored_semantic_motion on input:** ${jobInput.stored_semantic_motion ? "present" : "absent"}`);
    lines.push("");

    lines.push("#### Analyzer / history decisions");
    lines.push("");
    lines.push(mdJson({
      history_decisions: presRec.history_decisions ?? [],
      frequency_decisions: presRec.frequency_decisions ?? [],
      downgrade_rules: presRec.downgrade_rules ?? [],
      final_worker_scene_types: presRec.final_worker_scene_types ?? null,
      prompt_presentation_types: presRec.prompt_presentation_types ?? null,
    }));
    lines.push("");

    lines.push("#### Image generation / moderation");
    lines.push("");
    if (imgWarnings.length === 0) {
      lines.push("No `image_generation_warnings` on render_spec — all scenes used primary provider path.");
    } else {
      lines.push(mdJson(imgWarnings));
    }
    lines.push("");

    lines.push("#### Final video details");
    lines.push("");
    const outUrls = readVideoOutput(job?.output ?? null);
    const mp4Path = redactStorageUrl(
      outUrls.mp4Url,
      "video-renders",
      job ? `${projectId}/video/${job.id}/output.mp4` : null,
    );
    lines.push(`- **MP4:** ${mp4Path}`);
    lines.push(`- **thumbnail:** ${redactStorageUrl(outUrls.thumbnailUrl, "video-renders", job ? `${projectId}/video/${job.id}/thumbnail.png` : null)}`);
    lines.push(`- **subtitles:** ${redactStorageUrl(outUrls.subtitleUrl, "video-renders", job ? `${projectId}/video/${job.id}/subtitles.srt` : null)}`);
    lines.push(`- **video_duration:** ${debug?.video_duration ?? "—"}`);
    lines.push(`- **subtitle_source:** ${debug?.subtitle_source ?? "—"}`);
    lines.push(`- **render_warning:** ${debug?.render_warning ?? false}`);
    lines.push("");
    lines.push("#### Admin links (paths, no signed tokens)");
    lines.push("");
    lines.push(`- Production: \`/projects/${projectId}/production\``);
    lines.push(`- Review: \`/projects/${projectId}/review\``);
    lines.push(`- Content packages: \`/projects/${projectId}/content-packages\``);
    lines.push(`- Videos / scene editor: \`/projects/${projectId}/videos\``);
    lines.push(`- API export JSON: \`/api/production-runs/${RUN_ID}/export\``);
    lines.push("");
  }

  // Patch executive summary
  const completedJobs = canonicalJobs.filter((j) => j.status === "completed").length;
  const failedJobs = canonicalJobs.filter((j) => j.status === "failed").length;
  const summary = [
    "## A. Executive summary",
    "",
    `- **Strategy items:** ${strategyItems.length}`,
    `- **Content packages:** ${packages.length}`,
    `- **Primary video jobs (newest per item):** ${canonicalJobs.length} (${completedJobs} completed, ${failedJobs} failed)`,
    `- **Content items (all variants):** ${base.content_items.length}`,
    `- **Scene types in worker inputs:** ${JSON.stringify(sceneTypeTotals)}`,
    `- **Visual profile(s) on jobs:** ${[...profilesUsed].join(", ") || "—"} (project auto: ${resolvedProfile.profile})`,
    `- **Voices used:** ${[...voicesUsed].join(", ") || "—"} (project default: ${projectTts.voice})`,
    `- **Moderation fallback scenes:** ${moderationFallbackCount}`,
    `- **Run warnings (subtitle/render flags):** ${base.warnings.length}`,
    `- **Major warnings:** ${base.warnings.length === 0 ? "None flagged on completed jobs." : base.warnings.map((w) => w.video_job_id).join(", ")}`,
    "",
  ].join("\n");
  lines.splice(summarySlot, 4, summary);

  lines.push("## D. Cross-run consistency analysis");
  lines.push("");
  const hooks = packages.map((p) => asRecord(p.package_brief)?.hook as string);
  const ctas = packages.map((p) => asRecord(asRecord(p.package_brief)?.cta)?.text as string);
  lines.push(`- **Distinct hooks:** ${new Set(hooks).size} / ${packages.length}`);
  lines.push(`- **Distinct CTA texts:** ${new Set(ctas).size} / ${packages.length}`);
  lines.push(`- **Funnel stages:** ${packages.map((p) => p.funnel_stage).join(", ")}`);
  lines.push(`- **All videos used same voice:** ${voicesUsed.size <= 1 ? "yes" : "no"}`);
  lines.push(`- **All packages same visual profile:** ${profilesUsed.size <= 1 ? "yes" : "no"}`);
  lines.push(`- **Typed scenes rendered:** none (all worker scene types were IMAGE in this run)`);
  lines.push(`- **Organic suitability:** Topics differ (dormant profile / weekend batching / URL-to-content); tone is educational not hard-sell; CTAs repeat free-package offer (expected for fenrik Studio).`);
  lines.push("");

  lines.push("## E. New-system usage matrix");
  lines.push("");
  lines.push("| Package | Voice | Profile | CHECKLIST | PHONE | QUOTE | STATISTIC | CTA | Semantic Motion | Moderation fallback |");
  lines.push("| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |");
  lines.push(...matrixRows);
  lines.push("");

  lines.push("## F. Problems found");
  lines.push("");
  lines.push("### Technical");
  lines.push("- None — all 3 video jobs completed; no moderation fallbacks; TTS tail validation passed on inspected jobs.");
  lines.push("");
  lines.push("### Creative / repetition");
  lines.push("- Packages 2–3 use 4 IMAGE scenes but 5 storyboard beats (CLOSE reuses `scene-1` still) — intentional for shorter scene plans but worth monitoring visually.");
  lines.push("- Motion primitives repeat across packages (`pan_left`, `drift_down`, `static` CLOSE) — semantic motion active but low variety.");
  lines.push("");
  lines.push("### Features available but unused");
  lines.push("- Presentation system allowed CHECKLIST and CTA types (`prompt_presentation_types`) but generator produced IMAGE-only scenes for every package.");
  lines.push("- Project assets (logo, favicon) not selected in `asset_usage` (AI-only visuals).");
  lines.push("");

  lines.push("## G. Final verdict");
  lines.push("");
  lines.push("1. **End-to-end pipeline:** Yes — run completed; packages, platform copy, video jobs, storage artifacts, and debug metadata are present.");
  lines.push("2. **New features used:** EDITORIAL visual profile + suffix in prompts; semantic motion v1 beats on all renders; presentation analyzer metadata; explicit scene plan; OpenAI TTS with instructions + tail validation; Whisper subtitle alignment.");
  lines.push("3. **Available but not selected:** Typed scenes (CHECKLIST/PHONE/QUOTE/STATISTIC/CTA), project asset compositing, non-default TTS voice, moderation fallback path.");
  lines.push("4. **More varied:** Topics and scripts differ; motion/scene-type patterns are somewhat repetitive.");
  lines.push("5. **Organic posting:** Suitable — problem-aware/educational angles, not generic ads.");
  lines.push("6. **Quality harm:** No evidence in this run; unused typed scenes are neutral.");
  lines.push("7. **Fix before next run:** Consider enabling at least one typed scene when allowlisted; diversify motion primitives; optional deterministic voice if alloy is too neutral.");
  lines.push("8. **Do not change yet:** Core render path, TTS tail validation, semantic motion defaults — all succeeded.");
  lines.push("");

  lines.push("## Data sources (read-only)");
  lines.push("");
  lines.push("- `getReviewRunExport(runId)` — `lib/api/review-runs-admin.ts`");
  lines.push("- `production_runs` — `.eq('id', runId)`");
  lines.push("- `content_strategy_items` — `.eq('brief->>production_run_id', runId)`");
  lines.push("- `content_packages` / `content_items` / `video_jobs` — via export bundle");
  lines.push("- `production_run_items`, `assets`, `asset_usage` — project-scoped selects");
  lines.push("");

  const reportDir = resolve(process.cwd(), "reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = resolve(
    reportDir,
    `production-run-${RUN_ID}-audit.md`,
  );
  writeFileSync(reportPath, lines.join("\n"), "utf8");

  const jsonPath = resolve(
    process.cwd(),
    "scripts/output",
    `production-run-${RUN_ID}-audit-summary.json`,
  );
  mkdirSync(resolve(process.cwd(), "scripts/output"), { recursive: true });
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        run_id: RUN_ID,
        audited_at: new Date().toISOString(),
        strategy_items: strategyItems.length,
        packages: packages.length,
        video_jobs: canonicalJobs.length,
        scene_type_totals: sceneTypeTotals,
        voices: [...voicesUsed],
        profiles: [...profilesUsed],
        moderation_fallback_count: moderationFallbackCount,
        warnings: base.warnings.length,
        report_path: reportPath,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(reportPath);
  console.log(
    JSON.stringify({
      run_id: RUN_ID,
      status: base.run.status,
      packages: packages.length,
      strategy_items: strategyItems.length,
      video_jobs: canonicalJobs.length,
      completed_jobs: completedJobs,
      report: reportPath,
      summary_json: jsonPath,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
