import { INDUSTRY_EXAMPLE_CATALOG } from "@/lib/industry-examples/catalog";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AllowlistedIndustryExampleVideo {
  projectId: string;
  videoJobId: string;
  industrySlug: string;
  packageId: string;
}

/**
 * Builds the public video allowlist from static industry-example package data.
 * Arbitrary production job IDs are never served.
 */
export function listAllowlistedIndustryExampleVideos(): AllowlistedIndustryExampleVideo[] {
  const out: AllowlistedIndustryExampleVideo[] = [];
  for (const example of INDUSTRY_EXAMPLE_CATALOG) {
    for (const pkg of example.packages) {
      const projectId = pkg.projectId?.trim();
      const videoJobId = pkg.videoJobId?.trim();
      if (!projectId || !videoJobId) continue;
      if (!UUID_RE.test(projectId) || !UUID_RE.test(videoJobId)) continue;
      out.push({
        projectId,
        videoJobId,
        industrySlug: example.slug,
        packageId: pkg.id,
      });
    }
  }
  return out;
}

export function resolveAllowlistedIndustryExampleVideo(
  videoJobId: string | null | undefined,
): AllowlistedIndustryExampleVideo | null {
  if (!videoJobId || !UUID_RE.test(videoJobId)) return null;
  return (
    listAllowlistedIndustryExampleVideos().find(
      (entry) => entry.videoJobId === videoJobId,
    ) ?? null
  );
}
