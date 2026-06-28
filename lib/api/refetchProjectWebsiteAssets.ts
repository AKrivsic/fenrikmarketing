import { getProjectForAdmin } from "@/lib/api/projects-admin";
import { summarizeRefetchFromIngest } from "@/lib/api/refetchIngestSummary";
import { canonicalWebsiteUrl } from "@/lib/knowledge/websiteUrl";
import { ingestWebsiteVisualsBestEffort } from "@/lib/knowledge/ingestWebsiteVisuals";

export type { IngestWebsiteVisualsResult } from "@/lib/knowledge/websiteVisualIngestTypes";
export { summarizeRefetchFromIngest } from "@/lib/api/refetchIngestSummary";

export interface RefetchProjectWebsiteAssetsResult {
  ok: boolean;
  error?: string;
  added: number;
  skipped: number;
  failed: number;
  reason?: string;
}

// Re-runs website visual ingestion only (HTML → assets). Does not fetch page
// text, run knowledge extraction, or mutate projects.knowledge.
export async function refetchProjectWebsiteAssets(
  projectId: string,
): Promise<RefetchProjectWebsiteAssetsResult> {
  if (!projectId) {
    return { ok: false, error: "missing_project_id", added: 0, skipped: 0, failed: 0 };
  }

  const project = await getProjectForAdmin(projectId);
  if (!project) {
    return { ok: false, error: "project_not_found", added: 0, skipped: 0, failed: 0 };
  }

  const websiteUrl = canonicalWebsiteUrl(project);
  if (!websiteUrl) {
    return {
      ok: false,
      error: "missing_website_url",
      added: 0,
      skipped: 0,
      failed: 0,
    };
  }

  console.info(
    "[refetch_started]",
    JSON.stringify({ projectId, websiteUrl }),
  );

  const ingest = await ingestWebsiteVisualsBestEffort(projectId, websiteUrl);
  const summary = summarizeRefetchFromIngest(ingest);

  return { ok: true, ...summary };
}
