import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, PackageStatus } from "@/lib/supabase/types";
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
  buildVideoJobInput,
  loadAvailableAssets,
  loadStrategyItemContext,
  makePackageGuardrails,
  type StrategyItemContext,
} from "@/lib/ai/workflows/packageShared";
import { buildAntiRepetitionMemory } from "@/lib/ai/workflows/antiRepetitionMemory";
import { ensureUniqueHook } from "@/lib/ai/workflows/regenerateHook";

export interface GenerateContentPackageInput {
  projectId: string;
  strategyItemId: string;
}

export interface ContentPackageData {
  packageId: string;
  status: PackageStatus;
  weeklyStrategyId: string;
  strategyItemId: string;
  funnelStage: string;
  contentItemIds: string[];
  videoJobId: string;
  // Set when the result is an EXISTING package returned by the idempotence
  // guard instead of a freshly generated one (no AI was run). The full AI
  // output is only present on a fresh generation.
  reused?: boolean;
  package?: ContentPackageOutput;
}

export async function runGenerateContentPackage(
  input: GenerateContentPackageInput,
  // Optional injected client. Frontend/RLS callers omit it and get the cookie-
  // bound server client; automation (n8n) callers pass the service-role admin
  // client so the same business logic runs without a user session.
  client?: SupabaseClient,
): Promise<WorkflowResult<ContentPackageData>> {
  const supabase: SupabaseClient = client ?? (await createSupabaseServerClient());

  // Idempotence guard (C1). A strategy item maps to AT MOST ONE content package.
  // If a package already exists for this (project, strategy item), return it
  // instead of running the (~160s) AI generation + insert again. This makes a
  // duplicate webhook delivery / n8n retry / re-trigger a safe no-op: no second
  // package, no second video job, no extra AI cost.
  const existingPackage = await loadExistingPackageData(
    supabase,
    input.projectId,
    input.strategyItemId,
  );
  if (existingPackage) {
    return { ok: true, data: existingPackage };
  }

  const project = await loadProjectOrThrow(supabase, input.projectId);
  const context = await loadStrategyItemContext(
    supabase,
    input.projectId,
    input.strategyItemId,
  );
  const assets = await loadAvailableAssets(supabase, input.projectId);
  // Phase 2E — recent hooks/topics/CTAs/scenarios fed into the prompt so the
  // model avoids repeating itself.
  const memory = await buildAntiRepetitionMemory(supabase, input.projectId);

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
      memory,
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

  // Phase 2E — lightweight dedup: if the hook is identical to a recent one,
  // regenerate ONLY the hook (never the whole package).
  generated.value.hook = await ensureUniqueHook({
    hook: generated.value.hook,
    project,
    topic: context.topic,
    angle: context.angle,
    memory,
  });

  const data = await persistNewPackage(
    supabase,
    input.projectId,
    context,
    generated.value,
  );

  return { ok: true, data };
}

// Idempotence lookup: the existing package for (project, strategy item), if any.
// Returns the same shape the n8n bridge needs (packageId + videoJobId for the
// follow-up start-video-job call) so a duplicate request resolves to the
// existing work. When duplicate rows already exist (legacy data), the OLDEST is
// treated as canonical so the result is deterministic.
async function loadExistingPackageData(
  supabase: SupabaseClient,
  projectId: string,
  strategyItemId: string,
): Promise<ContentPackageData | null> {
  const { data: pkg, error } = await supabase
    .from("content_packages")
    .select("id, status, weekly_strategy_id, strategy_item_id, funnel_stage")
    .eq("project_id", projectId)
    .eq("strategy_item_id", strategyItemId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!pkg) return null;

  const packageId = pkg.id as string;

  const { data: items, error: itemErr } = await supabase
    .from("content_items")
    .select("id")
    .eq("project_id", projectId)
    .eq("package_id", packageId)
    .is("language", null);
  if (itemErr) throw itemErr;
  const contentItemIds = (items ?? []).map((r) => r.id as string);

  return {
    packageId,
    status: (pkg.status as PackageStatus | null) ?? "draft",
    weeklyStrategyId: (pkg.weekly_strategy_id as string | null) ?? "",
    strategyItemId: (pkg.strategy_item_id as string | null) ?? strategyItemId,
    funnelStage: (pkg.funnel_stage as string | null) ?? "",
    contentItemIds,
    videoJobId: await loadLatestVideoJobId(supabase, projectId, contentItemIds),
    reused: true,
  };
}

// The most recent video_jobs id for a package's content items (any status), or
// "" when none exists. video_jobs has no content_package_id column, so it is
// resolved via the package's content items.
async function loadLatestVideoJobId(
  supabase: SupabaseClient,
  projectId: string,
  contentItemIds: string[],
): Promise<string> {
  if (contentItemIds.length === 0) return "";
  const { data, error } = await supabase
    .from("video_jobs")
    .select("id")
    .eq("project_id", projectId)
    .in("content_item_id", contentItemIds)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.id as string | undefined) ?? "";
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
  if (pkgErr) {
    // Durable idempotence (Task 2). The partial unique index
    // uniq_content_packages_strategy_item (migration 013) guarantees one
    // package per strategy_item_id. A concurrent generation that lost the race
    // (both passed the pre-check, both ran the AI, both tried to insert) lands
    // here on a 23505 unique violation. Return the package the winner created
    // instead of failing — so a concurrent retry resolves to ONE package, no
    // duplicate content_items / video_jobs. No items/video job were inserted
    // for the loser yet, so there is nothing to clean up.
    if (isUniqueViolation(pkgErr)) {
      const existing = await loadExistingPackageData(
        supabase,
        projectId,
        context.strategyItemId,
      );
      if (existing) return existing;
    }
    throw pkgErr;
  }
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
  const videoInput = await buildVideoJobInput(supabase, projectId, pkg);
  const { data: videoRow, error: videoErr } = await supabase
    .from("video_jobs")
    .insert({
      project_id: projectId,
      content_item_id: primaryItemId,
      provider: "video_engine",
      status: "queued",
      input: videoInput,
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

// PostgreSQL unique_violation (SQLSTATE 23505), surfaced by PostgREST as
// error.code. Used to turn a concurrent insert race on the strategy_item_id
// unique index into an idempotent "return the existing package" outcome.
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
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
