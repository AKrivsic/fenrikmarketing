import type { IngestWebsiteVisualsResult } from "@/lib/knowledge/websiteVisualIngestTypes";

export function summarizeRefetchFromIngest(
  ingest: IngestWebsiteVisualsResult,
): {
  added: number;
  skipped: number;
  failed: number;
  reason?: string;
} {
  return {
    added: ingest.created,
    skipped: ingest.htmlDuplicates,
    failed: ingest.htmlRejected,
    reason: ingest.reason,
  };
}
