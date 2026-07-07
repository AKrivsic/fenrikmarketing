/**
 * Full technical dump for one production run (audit export). No analysis.
 * Usage: RUN_ID=<uuid> node ... scripts/export-production-run-audit.ts
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

const RUN_ID =
  process.env.RUN_ID ?? "d2fbbb9d-4355-43a1-9135-a66e3c45354d";

async function main(): Promise<void> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const { getReviewRunExport } = await import("@/lib/api/review-runs-admin");
  const { loadRunCoverageReport } = await import(
    "@/lib/production-runs/loadRunCoverage"
  );
  const { parseProjectKnowledge } = await import("@/lib/knowledge/types");
  const { canonicalWebsiteUrl } = await import("@/lib/knowledge/websiteUrl");
  type Asset = import("@/lib/supabase/types").Asset;
  type ContentItem = import("@/lib/supabase/types").ContentItem;
  type ContentPackage = import("@/lib/supabase/types").ContentPackage;
  type ProductionRunItem = import("@/lib/supabase/types").ProductionRunItem;
  type Project = import("@/lib/supabase/types").Project;
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

  const { data: runItems, error: runItemsErr } = await supabase
    .from("production_run_items")
    .select("*")
    .eq("production_run_id", RUN_ID)
    .order("created_at", { ascending: true });
  if (runItemsErr) throw runItemsErr;

  const { data: strategyRows, error: strategyErr } = await supabase
    .from("content_strategy_items")
    .select("*")
    .eq("project_id", projectId)
    .eq("brief->>production_run_id", RUN_ID)
    .order("created_at", { ascending: true });
  if (strategyErr) throw strategyErr;

  const contentItemIds = base.content_items.map((i) => i.id);

  const { data: assetRows, error: assetErr } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (assetErr) throw assetErr;
  const assets = (assetRows ?? []) as Asset[];

  let assetUsage: unknown[] = [];
  if (contentItemIds.length > 0) {
    const { data: usageRows, error: usageErr } = await supabase
      .from("asset_usage")
      .select("*")
      .eq("project_id", projectId)
      .in("content_item_id", contentItemIds);
    if (usageErr) throw usageErr;
    assetUsage = usageRows ?? [];
  }

  let assetVariants: unknown[] = [];
  const assetIds = assets.map((a) => a.id);
  if (assetIds.length > 0) {
    const { data: variantRows, error: variantErr } = await supabase
      .from("asset_variants")
      .select("*")
      .in("asset_id", assetIds);
    if (variantErr) throw variantErr;
    assetVariants = variantRows ?? [];
  }

  let aiVisuals: unknown[] = [];
  if (contentItemIds.length > 0) {
    const { data: visualRows, error: visualErr } = await supabase
      .from("ai_visuals")
      .select("*")
      .eq("project_id", projectId)
      .in("content_item_id", contentItemIds)
      .order("created_at", { ascending: true });
    if (visualErr) throw visualErr;
    aiVisuals = visualRows ?? [];
  }

  let contentVersions: unknown[] = [];
  if (contentItemIds.length > 0) {
    const { data: versionRows, error: versionErr } = await supabase
      .from("content_versions")
      .select("*")
      .in("content_item_id", contentItemIds)
      .order("created_at", { ascending: true });
    if (versionErr) throw versionErr;
    contentVersions = versionRows ?? [];
  }

  let publishingSchedule: unknown[] = [];
  if (contentItemIds.length > 0) {
    const { data: schedRows, error: schedErr } = await supabase
      .from("publishing_schedule")
      .select("*")
      .eq("project_id", projectId)
      .in("content_item_id", contentItemIds);
    if (schedErr) throw schedErr;
    publishingSchedule = schedRows ?? [];
  }

  let contentPerformance: unknown[] = [];
  if (contentItemIds.length > 0) {
    const { data: perfRows, error: perfErr } = await supabase
      .from("content_performance")
      .select("*")
      .in("content_item_id", contentItemIds);
    if (perfErr) throw perfErr;
    contentPerformance = perfRows ?? [];
  }

  const analytics = await loadRunCoverageReport(RUN_ID, project, supabase);

  const knowledgeParsed = parseProjectKnowledge(project.knowledge);

  const reviewItems = base.content_items.map((item: ContentItem) => ({
    content_item: item,
    generation_metadata: item.generation_metadata,
  }));

  const rejectedItems = base.content_items.filter(
    (i) => i.status === "rejected",
  );
  const regeneratedFromMetadata = base.content_items
    .map((i) => ({
      content_item_id: i.id,
      generation_metadata: i.generation_metadata,
    }))
    .filter((row) => {
      const m = row.generation_metadata;
      if (!m || typeof m !== "object" || Array.isArray(m)) return false;
      const r = m as Record<string, unknown>;
      return (
        r.regenerated === true ||
        typeof r.regenerated_from === "string" ||
        typeof r.retry === "number"
      );
    });

  const finalOutputs = base.video_jobs.map((job) => ({
    video_job_id: job.id,
    content_item_id: job.content_item_id,
    status: job.status,
    output: job.output,
    completed_at: job.completed_at,
  }));

  const dump = {
    export_meta: {
      production_run_id: RUN_ID,
      exported_at: new Date().toISOString(),
      exporter: "scripts/export-production-run-audit.ts",
    },
    "1_project": {
      project_row: project,
      project_id: project.id,
      project_brain: {
        product_is: project.product_is,
        product_is_not: project.product_is_not,
        product_strengths: project.product_strengths,
        pain_points: project.pain_points,
        forbidden_claims: project.forbidden_claims,
        target_audience: project.target_audience,
        tone_of_voice: project.tone_of_voice,
      },
      website: {
        canonical_website_url: canonicalWebsiteUrl(project),
        knowledge_source_url: knowledgeParsed?.source_url ?? null,
      },
      cta: { default_cta: project.default_cta },
      funnel: { goal_type: project.goal_type },
      strategy: {
        market_scope: project.market_scope,
        type: project.type,
      },
      language: {
        primary: project.language,
        enabled_languages: project.enabled_languages,
      },
      platform_configuration: {
        platforms: project.platforms,
        publishing_rules: project.publishing_rules,
      },
    },
    "2_knowledge": {
      knowledge_jsonb: project.knowledge,
      parsed_knowledge: knowledgeParsed,
    },
    "3_content_package": {
      content_strategy_items: strategyRows ?? [],
      packages: base.packages.map((pkg: ContentPackage) => ({
        package_row: pkg,
        package_brief: pkg.package_brief,
        platform_outputs: base.platform_outputs[pkg.id] ?? null,
      })),
      content_items: base.content_items,
    },
    "4_video": {
      video_jobs: base.video_jobs,
      voiceovers: base.voiceovers,
      warnings: base.warnings,
    },
    "5_assets": {
      assets,
      asset_variants: assetVariants,
      asset_usage: assetUsage,
      ai_visuals: aiVisuals,
    },
    "6_generation_metadata": {
      production_run: {
        requested_config: base.run.requested_config,
        run_row: base.run,
      },
      content_items: base.content_items.map((i) => ({
        id: i.id,
        package_id: i.package_id,
        platform: i.platform,
        generation_metadata: i.generation_metadata,
      })),
      content_strategy_items: (strategyRows ?? []).map((s) => ({
        id: (s as { id: string }).id,
        brief: (s as { brief: unknown }).brief,
      })),
      packages: base.packages.map((p) => ({
        id: p.id,
        package_brief: p.package_brief,
      })),
    },
    "7_review": {
      review_content_items: reviewItems,
      rejected_items: rejectedItems,
      regenerated_items: regeneratedFromMetadata,
      content_versions: contentVersions,
      url_diagnostics: base.url_diagnostics,
    },
    "8_final_outputs": {
      video_job_outputs: finalOutputs,
      platform_outputs_by_package_id: base.platform_outputs,
      publishing_schedule: publishingSchedule,
      content_performance: contentPerformance,
    },
    "9_analytics": analytics,
    "10_internal_workflow": {
      production_run_items: (runItems ?? []) as ProductionRunItem[],
      review_run_export_base: base,
      project_url: base.project_url,
      website_url_present: base.website_url_present,
      website_url: base.website_url,
    },
  };

  const outDir = resolve(process.cwd(), "scripts/output");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(
    outDir,
    `production-run-${RUN_ID}-audit-export.json`,
  );
  writeFileSync(outPath, JSON.stringify(dump, null, 2), "utf8");
  console.log(outPath);
  console.log(
    JSON.stringify({
      run_id: RUN_ID,
      status: base.run.status,
      packages: base.packages.length,
      content_items: base.content_items.length,
      video_jobs: base.video_jobs.length,
      assets: assets.length,
      bytes: Buffer.byteLength(JSON.stringify(dump), "utf8"),
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
