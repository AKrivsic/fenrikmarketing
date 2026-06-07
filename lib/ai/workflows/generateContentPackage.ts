import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import { normalizeFunnelStage } from "@/lib/ai/types";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  buildGenerateContentPackagePrompt,
  GENERATE_PACKAGE_SYSTEM,
} from "@/lib/ai/prompts/generateContentPackage";
import {
  contentPackageSchema,
  type ContentPackageOutput,
} from "@/lib/ai/schemas/contentPackage";
import {
  loadProjectOrThrow,
  type WorkflowResult,
} from "@/lib/ai/workflows/shared";
import {
  buildPackageBrief,
  buildPersistableItems,
  loadAvailableAssets,
  loadStrategyItemContext,
  makePackageGuardrails,
  type StrategyItemContext,
} from "@/lib/ai/workflows/packageShared";

export interface GenerateContentPackageInput {
  projectId: string;
  strategyItemId: string;
}

export interface ContentPackageData {
  packageId: string;
  status: "draft";
  weeklyStrategyId: string;
  strategyItemId: string;
  funnelStage: string;
  contentItemIds: string[];
  videoJobId: string;
  package: ContentPackageOutput;
}

export async function runGenerateContentPackage(
  input: GenerateContentPackageInput,
  // Optional injected client. Frontend/RLS callers omit it and get the cookie-
  // bound server client; automation (n8n) callers pass the service-role admin
  // client so the same business logic runs without a user session.
  client?: SupabaseClient,
): Promise<WorkflowResult<ContentPackageData>> {
  const supabase: SupabaseClient = client ?? (await createSupabaseServerClient());
  const project = await loadProjectOrThrow(supabase, input.projectId);
  const context = await loadStrategyItemContext(
    supabase,
    input.projectId,
    input.strategyItemId,
  );
  const assets = await loadAvailableAssets(supabase, input.projectId);

  const generated = await generateValidatedJson({
    textProvider: getCopywritingProvider(),
    system: GENERATE_PACKAGE_SYSTEM,
    prompt: buildGenerateContentPackagePrompt({
      project,
      funnelStage: context.funnelStage,
      topic: context.topic,
      angle: context.angle,
      platform: context.platform,
      format: context.format,
      availableAssets: assets.refs,
    }),
    validator: contentPackageSchema,
    guardrails: makePackageGuardrails({
      project,
      context,
      classById: assets.classById,
    }),
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  const data = await persistNewPackage(
    supabase,
    input.projectId,
    context,
    generated.value,
  );

  return { ok: true, data };
}

async function persistNewPackage(
  supabase: SupabaseClient,
  projectId: string,
  context: StrategyItemContext,
  pkg: ContentPackageOutput,
): Promise<ContentPackageData> {
  // Normalize the AI label/value to the canonical DB funnel stage. Guardrails
  // already guarantee it normalizes and matches the strategy item.
  const funnelStage = normalizeFunnelStage(pkg.funnel_stage) ?? context.funnelStage;

  // Content package is created as draft. weekly_strategy_id and funnel_stage
  // are persisted as first-class columns (migration 008).
  const { data: packageRow, error: pkgErr } = await supabase
    .from("content_packages")
    .insert({
      project_id: projectId,
      strategy_item_id: context.strategyItemId,
      weekly_strategy_id: context.weeklyStrategyId,
      funnel_stage: funnelStage,
      title: pkg.title,
      status: "draft",
      package_brief: buildPackageBrief(pkg),
    })
    .select("id")
    .single();
  if (pkgErr) throw pkgErr;
  const packageId = packageRow.id as string;

  // Persistable platform outputs -> content_items.
  const itemRows = buildPersistableItems(pkg, context).map((item) => ({
    project_id: projectId,
    package_id: packageId,
    platform: item.platform,
    format: item.format,
    status: "draft" as const,
    title: pkg.title,
    body: pkg.voiceover_text,
    caption: item.caption,
    hashtags: item.hashtags,
    cta: item.cta,
    generation_metadata: {
      funnel_stage: funnelStage,
      source: "creative_engine",
    } as unknown as Json,
  }));

  const { data: insertedItems, error: itemErr } = await supabase
    .from("content_items")
    .insert(itemRows)
    .select("id");
  if (itemErr) throw itemErr;
  const contentItemIds = (insertedItems ?? []).map((r) => r.id as string);
  const primaryItemId = contentItemIds[0] ?? null;

  // Video is mandatory -> queue a video job for the primary content item.
  const { data: videoRow, error: videoErr } = await supabase
    .from("video_jobs")
    .insert({
      project_id: projectId,
      content_item_id: primaryItemId,
      provider: "video_engine",
      status: "queued",
      input: {
        concept: pkg.video.concept,
        script: pkg.video.script,
        voiceover_text: pkg.voiceover_text,
        subtitles: pkg.subtitles,
      } as unknown as Json,
    })
    .select("id")
    .single();
  if (videoErr) throw videoErr;

  // Record asset_usage for referenced assets.
  await recordAssetUsage(supabase, projectId, primaryItemId, pkg);

  return {
    packageId,
    status: "draft",
    weeklyStrategyId: context.weeklyStrategyId,
    strategyItemId: context.strategyItemId,
    funnelStage,
    contentItemIds,
    videoJobId: videoRow.id as string,
    package: pkg,
  };
}

export async function recordAssetUsage(
  supabase: SupabaseClient,
  projectId: string,
  contentItemId: string | null,
  pkg: ContentPackageOutput,
): Promise<void> {
  const usage = pkg.asset_usage ?? [];
  if (usage.length === 0) return;
  const rows = usage.map((u) => ({
    project_id: projectId,
    asset_id: u.asset_id,
    content_item_id: contentItemId,
    used_as: u.used_as,
    metadata: { modify: u.modify ?? "false" } as unknown as Json,
  }));
  const { error } = await supabase.from("asset_usage").insert(rows);
  if (error) throw error;
}
