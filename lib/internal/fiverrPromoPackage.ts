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

/** Target narration (~55–70 words). Model should stay close; guardrails cap at 80 words. */
export const FIVERR_PROMO_TARGET_VOICEOVER = [
  "Turn your website into ready-to-publish social media content.",
  "You get short videos, captions, and posts for TikTok, Instagram, YouTube Shorts, LinkedIn, Facebook, and X.",
  "Choose one week, two weeks, or a full month of content.",
  "No content team. No editing. Not a DIY tool. Not social media management.",
  "Send your website URL and request a free sample.",
].join(" ");

export const FIVERR_PROMO_CREATIVE_BRIEF = [
  "Create a short Fiverr GIG GALLERY promo video for Fenrik Studio — concrete product marketing, not a personal story.",
  "LANGUAGE: English only for hook, voiceover, subtitles, captions, and CTAs.",
  `MAIN MESSAGE (first line of hook + voiceover): ${MAIN_MESSAGE}`,
  "",
  "CREATIVE DIRECTION (mandatory):",
  "- NOT confession-first, NOT founder story, NOT 'we built X and still…' hooks.",
  "- First 3 seconds MUST state the clear offer (what the buyer gets).",
  "- Tone: calm, expert, direct — suitable for Fiverr gig video gallery.",
  "- TARGET LENGTH: 15–25 second video; voiceover 40–70 words (hard cap 80). Five beats below.",
  "",
  "TARGET VOICEOVER (follow closely; you may tighten wording slightly but keep all facts):",
  FIVERR_PROMO_TARGET_VOICEOVER,
  "",
  "STORY BEATS + VISUALS (map voiceover_text, video.script, subtitles, and image_prompts to these):",
  "",
  "BEAT 1 — CLEAR OFFER (0–4s)",
  "Visual: Clean hero frame — website URL field or simple URL text on the LEFT; stacked social content cards on the RIGHT (vertical video thumbs + caption blocks + post cards). Before/after feel: website → outputs.",
  `VO: ${MAIN_MESSAGE}`,
  "",
  "BEAT 2 — WHAT YOU GET (4–10s)",
  "Visual: Three labeled cards in frame: 'Short Videos', 'Captions', 'Posts'. Show platform names as simple readable labels: TikTok, Instagram, YouTube, LinkedIn, Facebook, X (plain text on cards, not tiny UI chrome).",
  "VO: You get short videos, captions, and posts for TikTok, Instagram, YouTube Shorts, LinkedIn, Facebook, and X.",
  "",
  "BEAT 3 — PACKAGE OPTIONS (10–15s)",
  "Visual: Three simple cards in a row: 'One Week', 'Two Weeks', 'Full Month' — clean content-package layout, bright marketing graphic style.",
  "VO: Choose one week, two weeks, or a full month of content.",
  "",
  "BEAT 4 — WHAT IT IS NOT (15–20s)",
  "Visual: Checklist graphic with readable lines: No content team · No editing · Not a DIY tool · Not social media management.",
  "VO: No content team. No editing. Not a DIY tool. Not social media management.",
  "",
  "BEAT 5 — CTA (20–24s)",
  "Visual: Simple website URL input + 'Free sample' card or button-style graphic (readable words, no garbled UI).",
  "VO: Send your website URL and request a free sample.",
  "",
  "HOOK RULE: Hook MUST be the offer line (or a 3-second variant of BEAT 1), never a confession or unrelated curiosity hook.",
  "",
  "IMAGE_PROMPTS RULES (every image_prompt MUST obey):",
  "FORBID / MINIMIZE as the main subject:",
  "- empty phone screen, black screen, blank laptop display",
  "- blurred UI, unreadable dashboard, generic 'soft UI blobs' as the hero",
  "- generic person holding a phone with nothing meaningful on screen",
  "- moody empty desks with no marketing outputs visible",
  "PREFER:",
  "- stacked content cards, vertical video thumbnail tiles, caption blocks (abstract but visibly structured lines)",
  "- platform labels as simple readable words: TikTok, Instagram, YouTube, LinkedIn, Facebook, X",
  "- clean content package layout, grid of ready-to-publish posts",
  "- before/after: website URL → videos + captions + posts",
  "- bright, clean, daylight marketing graphics (still no fake metrics or viral claims)",
  "Note: image models struggle with long text — use SHORT readable labels on cards only; never request paragraphs inside images.",
  "",
  "video.script: Write beat-by-beat with timestamps matching the five beats above.",
  "subtitles: Pipe-separated phrases aligned to the target voiceover sentences.",
  "",
  "MUST STATE in voiceover or subtitles: ready to publish; NOT social media management; NOT a DIY tool.",
  "CTA type/text: invite to send website URL and request a free sample (no payment required).",
  "",
  "FORBIDDEN copy: viral claims; guaranteed growth, followers, engagement, or ROI; social media management or scheduling/publishing services; AI magic messaging; agency reporting.",
  "",
  "METADATA: title Fiverr Gig Promo Video; funnel conversion; platform tiktok; format reel.",
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
        topic: `${projectName} Fiverr promo — ${MAIN_MESSAGE} (clear offer in first 3 seconds; concrete content-package visuals)`,
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
