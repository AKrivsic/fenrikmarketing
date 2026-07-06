/**
 * CLI wrapper for internal Fiverr promo package generation.
 *
 * Usage:
 *   node --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
 *     --experimental-strip-types --import ./scripts/register-alias.mjs \
 *     scripts/generate-fiverr-promo-package.ts [--project-id <uuid>] [--no-dispatch-video]
 */

import { loadEnvLocal } from "@/lib/experiment/dryRun";
import {
  runFiverrPromoPackageGeneration,
  FIVERR_PROMO_PACKAGE_TITLE,
} from "@/lib/internal/fiverrPromoPackage";

loadEnvLocal();

const DEFAULT_PROJECT_ID = "163c1822-ad30-4cee-8826-dfacd9c188b9";

function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "");
  }
  return `https://${raw.replace(/\/$/, "")}`;
}

function parseArgs(argv: string[]): {
  projectId: string;
  dispatchVideo: boolean;
} {
  let projectId = DEFAULT_PROJECT_ID;
  let dispatchVideo = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--no-dispatch-video") {
      dispatchVideo = false;
      continue;
    }
    if (arg === "--project-id" && argv[i + 1]) {
      projectId = argv[++i].trim();
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(`Usage: scripts/generate-fiverr-promo-package.ts [options]

Options:
  --project-id <uuid>     (default: ${DEFAULT_PROJECT_ID})
  --no-dispatch-video     Leave video_jobs queued (no worker call)
`);
      process.exit(0);
    }
  }

  return { projectId, dispatchVideo };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createSupabaseAdminClient();

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", args.projectId)
    .single();
  if (projectErr) throw projectErr;
  if (!project) {
    console.error(`Project not found: ${args.projectId}`);
    process.exit(1);
  }

  const base = appBaseUrl();
  const result = await runFiverrPromoPackageGeneration({
    projectId: args.projectId,
    projectName: (project.name as string) || "Fenrik Studio",
    dispatchVideo: args.dispatchVideo,
    videoCallbackUrl: args.dispatchVideo
      ? `${base}/api/n8n/video-callback`
      : undefined,
    supabase,
  });

  console.log(
    JSON.stringify(
      {
        project_id: args.projectId,
        project_name: project.name,
        package_title: FIVERR_PROMO_PACKAGE_TITLE,
        package_id: result.packageId,
        strategy_item_id: result.strategyItemId,
        video_job_id: result.videoJobId,
        package_status: result.packageStatus,
        video_job_status: result.videoJobStatus,
        funnel_stage: result.funnelStage,
        app_paths: {
          content_packages_tab: `${base}${result.paths.contentPackagesTab}`,
          project_review: `${base}${result.paths.projectReview}`,
        },
        mp4_url: result.mp4Url,
        video_dispatch_warning: result.videoDispatchWarning,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
