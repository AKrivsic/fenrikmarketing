import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentItem, Json } from "@/lib/supabase/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  buildRegenerateContentPackagePrompt,
  REGENERATE_PACKAGE_SYSTEM,
} from "@/lib/ai/prompts/regenerateContentPackage";
import {
  buildContentPackageSchema,
  type ContentPackageOutput,
} from "@/lib/ai/schemas/contentPackage";
import { resolvePackagePlatforms } from "@/lib/projects/contentControls";
import {
  loadProjectOrThrow,
  WorkflowError,
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
import { recordAssetUsage } from "@/lib/ai/workflows/generateContentPackage";
import { buildAntiRepetitionMemory } from "@/lib/ai/workflows/antiRepetitionMemory";
import { ensureUniqueHook } from "@/lib/ai/workflows/regenerateHook";
import { normalizeFunnelStage } from "@/lib/ai/types";

export interface RegenerateContentPackageInput {
  projectId: string;
  packageId: string;
  feedback?: string | null;
}

export interface RegeneratedPackageData {
  packageId: string;
  status: "draft";
  weeklyStrategyId: string;
  strategyItemId: string;
  funnelStage: string;
  versionsCreated: number;
  contentItemIds: string[];
  videoJobId: string;
  package: ContentPackageOutput;
}

export async function runRegenerateContentPackage(
  input: RegenerateContentPackageInput,
  // Optional injected client. Frontend/RLS callers omit it (cookie-bound server
  // client); automation (n8n) callers pass the service-role admin client so the
  // same business logic runs without a user session.
  client?: SupabaseClient,
): Promise<WorkflowResult<RegeneratedPackageData>> {
  const { projectId, packageId } = input;
  if (!packageId) {
    throw new WorkflowError("invalid_input", "package_id is required");
  }

  const supabase: SupabaseClient = client ?? (await createSupabaseServerClient());
  const project = await loadProjectOrThrow(supabase, projectId);

  // Load the existing package (must belong to the project).
  const { data: existing, error: pkgErr } = await supabase
    .from("content_packages")
    .select("id, title, strategy_item_id, package_brief")
    .eq("id", packageId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (pkgErr) throw pkgErr;
  if (!existing) {
    throw new WorkflowError("not_found", `package ${packageId} not found`);
  }
  if (!existing.strategy_item_id) {
    throw new WorkflowError(
      "invalid_input",
      "package has no strategy_item_id; cannot preserve strategic context",
    );
  }

  // Preserved strategic context (project_id, weekly_strategy_id,
  // strategy_item_id, funnel_stage) is re-derived from the strategy item.
  const context = await loadStrategyItemContext(
    supabase,
    projectId,
    existing.strategy_item_id as string,
  );
  const assets = await loadAvailableAssets(supabase, projectId);
  // Phase 2E — recent hooks/topics/CTAs/scenarios fed into the prompt so the
  // regenerated package avoids repeating prior content.
  const memory = await buildAntiRepetitionMemory(supabase, projectId);

  // Respect projects.platforms (falls back to the full required set).
  const targetPlatforms = resolvePackagePlatforms(project.platforms);

  // Snapshot the current package (header + items) into content_versions as a
  // package-level snapshot (content_package_id) BEFORE regenerating.
  const existingItems = await loadPackageItems(supabase, packageId);
  const versionsCreated = await snapshotPackage(supabase, projectId, packageId, {
    package: existing,
    items: existingItems,
  });

  const generated = await generateValidatedJson({
    textProvider: getCopywritingProvider(),
    system: REGENERATE_PACKAGE_SYSTEM,
    prompt: buildRegenerateContentPackagePrompt({
      project,
      funnelStage: context.funnelStage,
      topic: context.topic,
      angle: context.angle,
      platform: context.platform,
      format: context.format,
      availableAssets: assets.refs,
      previousTitle: existing.title as string,
      feedback: input.feedback ?? null,
      memory,
      targetPlatforms,
    }),
    validator: buildContentPackageSchema(targetPlatforms),
    guardrails: makePackageGuardrails({
      project,
      context,
      classById: assets.classById,
      requiredPlatforms: targetPlatforms,
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

  const pkg = generated.value;
  // Preserve the strategy item's canonical funnel stage across regeneration.
  const funnelStage =
    normalizeFunnelStage(pkg.funnel_stage) ?? context.funnelStage;

  // Update the package row in place to a fresh draft, preserving identity and
  // strategic context (weekly_strategy_id, funnel_stage as first-class columns).
  const { error: updErr } = await supabase
    .from("content_packages")
    .update({
      title: pkg.title,
      status: "draft",
      weekly_strategy_id: context.weeklyStrategyId,
      funnel_stage: funnelStage,
      package_brief: buildPackageBrief(pkg),
    })
    .eq("id", packageId)
    .eq("project_id", projectId);
  if (updErr) throw updErr;

  // Update existing content_items in place (keep ids so content_versions
  // history survives), insert any newly required platforms.
  const contentItemIds = await upsertPackageItems(
    supabase,
    projectId,
    packageId,
    context,
    pkg,
    existingItems,
    targetPlatforms,
  );
  const primaryItemId = contentItemIds[0] ?? null;

  // Regeneration produces a new video job (video remains mandatory).
  const videoInput = await buildVideoJobInput(supabase, projectId, pkg, {
    regenerated: true,
  });
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

  await recordAssetUsage(supabase, projectId, primaryItemId, pkg);

  return {
    ok: true,
    data: {
      packageId,
      status: "draft",
      weeklyStrategyId: context.weeklyStrategyId,
      strategyItemId: context.strategyItemId,
      funnelStage,
      versionsCreated,
      contentItemIds,
      videoJobId: videoRow.id as string,
      package: pkg,
    },
  };
}

// Loads ONLY the primary-language content items (language IS NULL). Language
// variants (language = de/fr/...) are deliberately excluded so package
// regenerate can never read, snapshot, or overwrite them.
async function loadPackageItems(
  supabase: SupabaseClient,
  packageId: string,
): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("package_id", packageId)
    .is("language", null);
  if (error) throw error;
  return (data ?? []) as ContentItem[];
}

// Stores ONE package-level snapshot in content_versions using the new
// content_package_id column (migration 008). content_item_id is left null;
// the snapshot jsonb captures the package header plus all its content items.
async function snapshotPackage(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
  snapshot: { package: unknown; items: ContentItem[] },
): Promise<number> {
  const { data: versions, error } = await supabase
    .from("content_versions")
    .select("version_no")
    .eq("content_package_id", packageId);
  if (error) throw error;

  const nextVersion =
    (versions ?? []).reduce(
      (max, v) => Math.max(max, (v.version_no as number) ?? 0),
      0,
    ) + 1;

  const { error: insErr } = await supabase.from("content_versions").insert({
    project_id: projectId,
    content_package_id: packageId,
    content_item_id: null,
    version_no: nextVersion,
    snapshot: snapshot as unknown as Json,
    change_note: "regenerate: package snapshot before regeneration",
  });
  if (insErr) throw insErr;
  return 1;
}

async function upsertPackageItems(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
  context: StrategyItemContext,
  pkg: ContentPackageOutput,
  existingItems: ContentItem[],
  targetPlatforms?: readonly string[],
): Promise<string[]> {
  const existingByPlatform = new Map(existingItems.map((i) => [i.platform, i]));
  const resultIds: string[] = [];

  for (const item of buildPersistableItems(pkg, context, targetPlatforms)) {
    const existing = existingByPlatform.get(item.platform);
    const fields = {
      format: item.format,
      status: "draft" as const,
      title: pkg.title,
      body: pkg.voiceover_text,
      caption: item.caption,
      hashtags: item.hashtags,
      cta: item.cta,
      generation_metadata: {
        funnel_stage: context.funnelStage,
        source: "creative_engine",
        regenerated: true,
      } as unknown as Json,
    };

    if (existing) {
      // Extra guard: only update the primary row. existingItems are already
      // primary-only, and the language filter makes a variant overwrite
      // impossible even if a stale id slipped through.
      const { error } = await supabase
        .from("content_items")
        .update(fields)
        .eq("id", existing.id)
        .is("language", null);
      if (error) throw error;
      resultIds.push(existing.id);
    } else {
      // New primary items are persisted with language NULL (primary language).
      const { data, error } = await supabase
        .from("content_items")
        .insert({
          project_id: projectId,
          package_id: packageId,
          platform: item.platform,
          language: null,
          ...fields,
        })
        .select("id")
        .single();
      if (error) throw error;
      resultIds.push(data.id as string);
    }
  }

  return resultIds;
}
