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
  "WHAT WE SELL (visuals must reflect this):",
  "- We do NOT sell software, dashboards, editors, or admin tools.",
  "- We sell FINISHED marketing deliverables: ready-to-publish short videos, captions, and social posts.",
  "- Every scene must look like real OUTPUT a buyer receives — not random motion graphics.",
  "",
  "VISUAL STYLE: Marketing. Results. Finished deliverables. Not SaaS. Not workflow UI.",
  "FRAME TEST: Each still must be understandable WITHOUT voiceover — a paused frame should instantly read as 'ready social content you get'.",
  "",
  "TARGET VOICEOVER (follow closely; you may tighten wording slightly but keep all facts):",
  FIVERR_PROMO_TARGET_VOICEOVER,
  "",
  "STORY BEATS + VISUALS (map voiceover_text, video.script, subtitles, and image_prompts to these):",
  "",
  "BEAT 1 — CLEAR OFFER (0–4s)",
  "Visual: Website URL or simple homepage strip on one side transforming into a stack of FINISHED deliverables on the other: vertical short-form video thumbnails, caption cards with visible line blocks, and social post previews (looks like real posts, not empty shapes).",
  `VO: ${MAIN_MESSAGE}`,
  "",
  "BEAT 2 — WHAT YOU GET (4–10s)",
  "Visual: A content package layout showing recognizable deliverable types: a short-form video preview frame, a caption card, and 2–3 platform-native POST PREVIEWS (e.g. TikTok-style vertical video tile, Instagram Reel frame, LinkedIn or Facebook post card, X post card). Each preview should look like finished content ready to publish — not colored rectangles or pill shapes.",
  "VO: You get short videos, captions, and posts for TikTok, Instagram, YouTube Shorts, LinkedIn, Facebook, and X.",
  "",
  "BEAT 3 — PACKAGE OPTIONS (10–15s)",
  "Visual: Three side-by-side 'content package' stacks or a simple calendar row labeled One Week · Two Weeks · Full Month — each showing a growing pile of finished posts/videos (e.g. 5 / 10 / 20 style density through more thumbnails, NOT pricing UI). Readable short labels on the week cards only.",
  "VO: Choose one week, two weeks, or a full month of content.",
  "",
  "BEAT 4 — WHAT IT IS NOT (15–20s)",
  "Visual: Still show FINISHED deliverables (stack of posts + video thumbs) while short readable lines appear as overlay or margin text: No content team · No editing · Not a DIY tool · Not social media management. Do NOT use an empty checklist with blank rows — the hero is still the content you receive.",
  "VO: No content team. No editing. Not a DIY tool. Not social media management.",
  "",
  "BEAT 5 — CTA (20–24s)",
  "Visual: Simple website URL input plus a 'Free sample' deliverable — e.g. a sealed content package card or folder icon with finished post thumbnails peeking out (readable 'Free sample' only). No fake app dashboard.",
  "VO: Send your website URL and request a free sample.",
  "",
  "HOOK RULE: Hook MUST be the offer line (or a 3-second variant of BEAT 1), never a confession or unrelated curiosity hook.",
  "",
  "IMAGE_PROMPTS RULES (every image_prompt MUST obey):",
  "Each scene depicts REAL marketing deliverables the buyer receives:",
  "- short-form video preview / video thumbnail (9:16)",
  "- TikTok post preview, Instagram Reel preview, YouTube Shorts-style frame",
  "- LinkedIn post card, Facebook post preview, X/Twitter post preview",
  "- caption card with structured text lines (short, legible)",
  "- social media content cards, content package, stack of finished posts",
  "- collection of ready-to-publish content, calendar of prepared posts",
  "- website or URL motif transforming into finished content (before → after)",
  "",
  "AVOID as the main subject (causes 'random motion graphic' look):",
  "- abstract rectangles, colored blocks, floating cards with no post/video inside",
  "- pill shapes, generic SaaS illustrations, random gradients",
  "- fake dashboards, fake admin/editor UI, workflow diagrams",
  "- empty phone or laptop screens, blurred UI blobs as the hero",
  "- checklist graphics with empty bars and no deliverables visible",
  "",
  "Composition: bright, clean, marketing photography or realistic mockup style. Show WHAT the client gets published — not HOW the tool works.",
  "Text in images: only SHORT labels (platform names, One Week / Two Weeks / Full Month, Free sample, checklist lines in beat 4). No paragraphs inside generated images.",
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
        topic: `${projectName} Fiverr promo — ${MAIN_MESSAGE} (finished social deliverables in every scene; no abstract SaaS graphics)`,
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
