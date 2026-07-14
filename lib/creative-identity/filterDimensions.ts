import type { Project } from "@/lib/supabase/types";
import type { VisualProfile } from "@/lib/visual-profile/visualProfile";
import {
  DIMENSION_CATALOG,
  type DimensionOption,
} from "@/lib/creative-identity/dimensionCatalog";
import type { CreativeIdentityDimension } from "@/lib/creative-identity/types";

function productIsNotBlob(project: Project): string {
  return (project.product_is_not ?? []).join(" ").toLowerCase();
}

function productIsBlob(project: Project): string {
  return (project.product_is ?? []).join(" ").toLowerCase();
}

/** Product Brain + profile filters — never override forbidden claims (handled elsewhere). */
export function filterDimensionOptions(args: {
  dimension: CreativeIdentityDimension;
  project: Project;
  visualProfile: VisualProfile;
}): DimensionOption[] {
  const { dimension, project, visualProfile } = args;
  const projectType = (project.type ?? "").trim().toLowerCase();
  const notBlob = productIsNotBlob(project);
  const isBlob = productIsBlob(project);

  return DIMENSION_CATALOG[dimension].filter((opt) => {
    if (opt.profiles && !opt.profiles.includes(visualProfile)) return false;
    if (
      opt.excludeProjectTypes?.some(
        (t) => t.toLowerCase() === projectType,
      )
    ) {
      return false;
    }
    if (/\bluxury\b|\bpremium\b|\bhigh-end\b/.test(notBlob)) {
      if (opt.id === "warm_late_afternoon" && dimension === "lighting") return false;
    }
    if (/\benterprise\b|\bcorporate\b/.test(notBlob)) {
      if (opt.id === "co_working_daylight" && dimension === "environment") {
        return false;
      }
    }
    if (/\bconsumer\b|\bindividual\b/.test(isBlob) || projectType === "product") {
      if (opt.id === "small_retail_floor" && dimension === "environment") {
        return false;
      }
    }
    return true;
  });
}

export function filteredCatalogForProject(args: {
  project: Project;
  visualProfile: VisualProfile;
}): Record<CreativeIdentityDimension, DimensionOption[]> {
  const out = {} as Record<CreativeIdentityDimension, DimensionOption[]>;
  for (const dim of Object.keys(DIMENSION_CATALOG) as CreativeIdentityDimension[]) {
    const filtered = filterDimensionOptions({
      dimension: dim,
      project: args.project,
      visualProfile: args.visualProfile,
    });
    out[dim] =
      filtered.length > 0 ? filtered : [...DIMENSION_CATALOG[dim]];
  }
  return out;
}
