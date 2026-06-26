import { getProjectForAdmin } from "@/lib/api/projects-admin";
import { canonicalWebsiteUrl } from "@/lib/knowledge/websiteUrl";
import { ingestWebsiteVisualsBestEffort } from "@/lib/knowledge/ingestWebsiteVisuals";

export interface RefetchProjectWebsiteAssetsResult {
  ok: boolean;
  error?: string;
  added: number;
  skipped: number;
  failed: number;
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

  const ingest = await ingestWebsiteVisualsBestEffort(projectId, websiteUrl);
  const report = ingest.debugReport;
  const added = ingest.created;
  const skipped = report?.duplicates ?? 0;
  const failed = report?.rejected ?? 0;

  if (ingest.skipped && added === 0) {
    return {
      ok: true,
      added: 0,
      skipped: skipped + 1,
      failed,
    };
  }

  return { ok: true, added, skipped, failed };
}
