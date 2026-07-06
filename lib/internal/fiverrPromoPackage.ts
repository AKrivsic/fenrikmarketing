import type { SupabaseClient } from "@supabase/supabase-js";
import { runGenerateContentPackage } from "@/lib/ai/workflows/generateContentPackage";
import { claimAndDispatchVariantVideoJob } from "@/lib/ai/workflows/dispatchVariantVideoJob";
import { readVideoOutput } from "@/lib/api/content-shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { FunnelStage } from "@/lib/ai/types";
import type { ContentFormat, GoalType } from "@/lib/supabase/types";

export const FIVERR_PROMO_PACKAGE_TITLE = "Fiverr Gig Promo Video";
export const FIVERR_PROMO_SOURCE = "internal_fiverr_promo";
export const FIVERR_PROMO_PLATFORM = "tiktok" as const;
export const FIVERR_PROMO_FORMAT: ContentFormat = "reel";
export const FIVERR_PROMO_FUNNEL_STAGE: FunnelStage = "conversion";

const MAIN_MESSAGE =
  "Turn your website into ready-to-publish social media content.";

export const FIVERR_PROMO_CREATIVE_BRIEF = [
  "Create a short Fiverr gig promo video for Fenrik Studio.",
  "LANGUAGE: English only for hook, voiceover, subtitles, captions, and CTAs.",
  `MAIN MESSAGE: ${MAIN_MESSAGE}`,
  "TARGET LENGTH: Respect pipeline guardrails — 15–25 second video; voiceover 40–70 words (hard cap 80). Five compact beats within that window.",
  "",
  "BEAT 1 — CLEAR OFFER (open): What Fenrik Studio does; short videos, captions, posts for major social platforms; main message immediately.",
  "BEAT 2 — WHAT YOU GET: TikTok, Instagram, YouTube Shorts, LinkedIn, Facebook, and X — ready to publish.",
  "BEAT 3 — WHY IT MATTERS: Owners lack time for weekly content; weekly, biweekly, monthly packages; 5, 10, and 20 content packages.",
  "BEAT 4 — HOW IT WORKS: Website URL in → content package out; no content team; no editing required.",
  "BEAT 5 — CTA: Send your website URL and request a free sample.",
  "",
  "MUST STATE: ready to publish; NOT social media management; NOT a DIY tool.",
  "FORBIDDEN: viral claims; guaranteed growth, followers, engagement, or ROI; social media management claims; publishing or scheduling claims; AI magic messaging; agency reporting.",
].join("\n");

export interface FiverrPromoPaths {
  contentPackagesTab: string;
  projectReview: string;
}

export interface FiverrPromoGenerationResult {
  packageId: string;
  strategyItemId: string;
  videoJobId: string | null;
  packageStatus: string;
  videoJobStatus: string | null;
  funnelStage: string | null;
  paths: FiverrPromoPaths;
  mp4Url: string | null;
  videoDispatchWarning: string | null;
}

export function fiverrPromoPathsForProject(projectId: string): FiverrPromoPaths {
  const base = `/projects/${projectId}`;
  return {
    contentPackagesTab: `${base}/content-packages`,
    projectReview: `${base}/review`,
  };
}

export async function seedFiverrPromoStrategyItem(
  supabase: SupabaseClient,
  projectId: string,
  projectName: string,
  goalType: GoalType,
): Promise<string> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const variantTag = now.toISOString();

  const { data: strategyRow, error: strategyErr } = await supabase
    .from("content_strategies")
    .insert({
      project_id: projectId,
      name: `Fiverr promo ${today}`,
      objective: goalType,
      period_start: today,
      period_end: today,
      strategy_brief: {
        source: FIVERR_PROMO_SOURCE,
        purpose: "fiverr_gig_promo_video",
        variant_created_at: variantTag,
      },
    })
    .select("id")
    .single();
  if (strategyErr) throw strategyErr;

  const { data: itemRow, error: itemErr } = await supabase
    .from("content_strategy_items")
    .insert({
      strategy_id: strategyRow.id as string,
      project_id: projectId,
      platform: FIVERR_PROMO_PLATFORM,
      format: FIVERR_PROMO_FORMAT,
      funnel_stage: FIVERR_PROMO_FUNNEL_STAGE,
      priority: 1,
      brief: {
        source: FIVERR_PROMO_SOURCE,
        variant_created_at: variantTag,
        topic: `${projectName} — ${MAIN_MESSAGE}`,
        angle: FIVERR_PROMO_CREATIVE_BRIEF,
        language: "en",
        package_title: FIVERR_PROMO_PACKAGE_TITLE,
      },
    })
    .select("id")
    .single();
  if (itemErr) throw itemErr;

  return itemRow.id as string;
}

async function patchFiverrPromoPackageMetadata(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
): Promise<void> {
  const { data: row, error: loadErr } = await supabase
    .from("content_packages")
    .select("package_brief")
    .eq("id", packageId)
    .eq("project_id", projectId)
    .single();
  if (loadErr) throw loadErr;

  const prev =
    row.package_brief &&
    typeof row.package_brief === "object" &&
    !Array.isArray(row.package_brief)
      ? (row.package_brief as Record<string, unknown>)
      : {};

  const { error: updateErr } = await supabase
    .from("content_packages")
    .update({
      title: FIVERR_PROMO_PACKAGE_TITLE,
      funnel_stage: FIVERR_PROMO_FUNNEL_STAGE,
      package_brief: {
        ...prev,
        source: FIVERR_PROMO_SOURCE,
        internal_promo: {
          kind: FIVERR_PROMO_SOURCE,
          main_message: MAIN_MESSAGE,
          language: "en",
        },
      },
    })
    .eq("id", packageId)
    .eq("project_id", projectId);
  if (updateErr) throw updateErr;
}

async function loadVideoJobStatus(
  supabase: SupabaseClient,
  projectId: string,
  videoJobId: string,
): Promise<{ status: string; mp4Url: string | null }> {
  const { data: job, error: jobErr } = await supabase
    .from("video_jobs")
    .select("status, output")
    .eq("id", videoJobId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (jobErr) throw jobErr;
  if (!job) {
    return { status: "unknown", mp4Url: null };
  }
  const out = readVideoOutput(job.output);
  return {
    status: job.status as string,
    mp4Url: out.mp4Url,
  };
}

export function formatFiverrPromoError(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim()) {
      return msg;
    }
  }
  return "Generování Fiverr promo selhalo.";
}

function formatGenerationFailure(
  result: {
    error?: string;
    validationErrors?: { path: string; message: string }[];
  },
): string {
  const detail = result.validationErrors?.[0]?.message;
  if (detail) {
    return `Generování Fiverr promo selhalo: ${detail}`;
  }
  if (result.error && result.error !== "generation_failed") {
    return `Generování Fiverr promo selhalo: ${result.error}`;
  }
  return "Generování Fiverr promo se nepodařilo (AI validace nebo provider).";
}

export async function runFiverrPromoPackageGeneration(args: {
  projectId: string;
  projectName: string;
  goalType: GoalType;
  videoCallbackUrl?: string;
  dispatchVideo?: boolean;
  supabase?: SupabaseClient;
}): Promise<FiverrPromoGenerationResult> {
  const supabase = args.supabase ?? createSupabaseAdminClient();

  const strategyItemId = await seedFiverrPromoStrategyItem(
    supabase,
    args.projectId,
    args.projectName,
    args.goalType,
  );

  const result = await runGenerateContentPackage(
    {
      projectId: args.projectId,
      strategyItemId,
      generationMode: "production",
    },
    supabase,
  );

  if (!result.ok) {
    throw new Error(formatGenerationFailure(result));
  }

  const { packageId, strategyItemId: resolvedStrategyItemId, videoJobId } =
    result.data;

  await patchFiverrPromoPackageMetadata(supabase, args.projectId, packageId);

  let videoDispatchWarning: string | null = null;
  const shouldDispatch = args.dispatchVideo !== false;
  if (shouldDispatch && videoJobId) {
    const { data: job, error: jobErr } = await supabase
      .from("video_jobs")
      .select("content_item_id, input")
      .eq("id", videoJobId)
      .eq("project_id", args.projectId)
      .single();
    if (jobErr) throw jobErr;

    if (args.videoCallbackUrl) {
      const dispatch = await claimAndDispatchVariantVideoJob(supabase, {
        videoJobId,
        projectId: args.projectId,
        contentPackageId: packageId,
        contentItemId: (job.content_item_id as string | null) ?? null,
        callbackUrl: args.videoCallbackUrl,
        input: (job.input as Record<string, unknown> | null) ?? {},
      });
      if (!dispatch.dispatched) {
        videoDispatchWarning =
          dispatch.warning ??
          "Video job zůstal ve frontě (render nebyl spuštěn).";
      }
    } else {
      videoDispatchWarning =
        "Video job ve frontě — chybí callback URL pro spuštění workeru.";
    }
  }

  const { data: pkg, error: pkgErr } = await supabase
    .from("content_packages")
    .select("status, funnel_stage")
    .eq("id", packageId)
    .eq("project_id", args.projectId)
    .single();
  if (pkgErr) throw pkgErr;

  let videoJobStatus: string | null = null;
  let mp4Url: string | null = null;
  if (videoJobId) {
    const snap = await loadVideoJobStatus(supabase, args.projectId, videoJobId);
    videoJobStatus = snap.status;
    mp4Url = snap.mp4Url;
  }

  return {
    packageId,
    strategyItemId: resolvedStrategyItemId,
    videoJobId: videoJobId || null,
    packageStatus: (pkg.status as string) ?? "draft",
    videoJobStatus,
    funnelStage: (pkg.funnel_stage as string | null) ?? null,
    paths: fiverrPromoPathsForProject(args.projectId),
    mp4Url,
    videoDispatchWarning,
  };
}

export async function getFiverrPromoVideoJobStatus(
  projectId: string,
  videoJobId: string,
): Promise<{ status: string; mp4Url: string | null } | null> {
  if (!projectId || !videoJobId) return null;
  const supabase = createSupabaseAdminClient();
  const snap = await loadVideoJobStatus(supabase, projectId, videoJobId);
  return snap;
}
