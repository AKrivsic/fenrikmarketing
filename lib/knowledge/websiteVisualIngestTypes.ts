import type { WebsiteIngestDebugReport } from "@/lib/knowledge/websiteIngestDebugReport";

export interface IngestWebsiteVisualsResult {
  /** HTML ingest + component capture saves combined. */
  created: number;
  htmlCreated: number;
  htmlDuplicates: number;
  htmlRejected: number;
  componentCaptureAttempted: boolean;
  componentCaptureSaved: number;
  componentCaptureSkippedReason?: string;
  skipped: boolean;
  reason?: string;
  debugReport?: WebsiteIngestDebugReport;
}

export type ComponentCaptureFallbackRunner = (
  projectId: string,
  pageUrl: string,
) => Promise<{ attempted: boolean; saved: number; skippedReason?: string }>;

export interface IngestWebsiteVisualsDeps {
  fetchWebsiteHtmlImpl?: (url: string) => Promise<string>;
  runComponentCaptureFallback?: ComponentCaptureFallbackRunner;
}
