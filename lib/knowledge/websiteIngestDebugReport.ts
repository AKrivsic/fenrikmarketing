import type { ProductRole } from "@/lib/assets/productRole";
import { PRODUCT_ROLE_LABELS } from "@/lib/assets/productRole";

export interface WebsiteIngestDebugReport {
  downloaded: number;
  rejected: number;
  duplicates: number;
  finalAssets: number;
  finalRoles: string[];
  rejectedBreakdown: Record<string, number>;
  duplicateBreakdown: Record<string, number>;
}

export function createEmptyIngestReport(): WebsiteIngestDebugReport {
  return {
    downloaded: 0,
    rejected: 0,
    duplicates: 0,
    finalAssets: 0,
    finalRoles: [],
    rejectedBreakdown: {},
    duplicateBreakdown: {},
  };
}

export function bumpReportCount(
  report: WebsiteIngestDebugReport,
  field: "rejectedBreakdown" | "duplicateBreakdown",
  key: string,
): void {
  const bucket = report[field];
  bucket[key] = (bucket[key] ?? 0) + 1;
}

export function roleLabel(role: ProductRole | null): string {
  if (!role) return "Other";
  return PRODUCT_ROLE_LABELS[role] ?? role;
}

// Internal-only debug log (not shown in UI).
export function logWebsiteIngestDebugReport(
  projectId: string,
  pageUrl: string,
  report: WebsiteIngestDebugReport,
): void {
  console.info(
    "[website-ingest]",
    JSON.stringify({
      projectId,
      pageUrl,
      summary: {
        Downloaded: report.downloaded,
        Rejected: report.rejected,
        Duplicates: report.duplicates,
        FinalAssets: report.finalAssets,
        Roles: report.finalRoles,
      },
      rejectedBreakdown: report.rejectedBreakdown,
      duplicateBreakdown: report.duplicateBreakdown,
    }),
  );
}
