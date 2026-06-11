import type { ProjectContentEntry } from "@/lib/api/project-content-admin";
import type {
  ApprovalStatus,
  LanguageCode,
  PlatformType,
} from "@/lib/supabase/types";

// Per-RUN review filter. Filters operate ONLY on the run they belong to (never
// globally) and only on the package's platform-output list — the package video
// panel is rendered outside the filter and always stays visible.

export const ALL = "all" as const;

export type FilterValue<T> = typeof ALL | T;

export interface RunFilterState {
  platform: FilterValue<PlatformType>;
  language: FilterValue<LanguageCode>;
  status: FilterValue<ApprovalStatus>;
}

export const DEFAULT_RUN_FILTER: RunFilterState = {
  platform: ALL,
  language: ALL,
  status: ALL,
};

// Platform options shown in the run filter. Mirrors the spec's review surfaces
// (social platforms + Google Business); blog/email are omitted as they are not
// part of the platform-output review flow.
export const PLATFORM_FILTER_OPTIONS: { value: PlatformType; label: string }[] =
  [
    { value: "tiktok", label: "TikTok" },
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "youtube", label: "YouTube" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "x", label: "X" },
    { value: "google_business", label: "Google Business" },
  ];

export const LANGUAGE_FILTER_OPTIONS: { value: LanguageCode; label: string }[] =
  [
    { value: "cs", label: "CS" },
    { value: "en", label: "EN" },
    { value: "de", label: "DE" },
  ];

export const STATUS_FILTER_OPTIONS: { value: ApprovalStatus; label: string }[] =
  [
    { value: "draft", label: "Draft" },
    { value: "in_review", label: "In Review" },
    { value: "approved", label: "Approved" },
    { value: "scheduled", label: "Scheduled" },
  ];

export function matchesRunFilter(
  entry: ProjectContentEntry,
  filter: RunFilterState,
): boolean {
  if (filter.platform !== ALL && entry.platform !== filter.platform) {
    return false;
  }
  if (filter.language !== ALL && entry.language !== filter.language) {
    return false;
  }
  if (filter.status !== ALL && entry.status !== filter.status) {
    return false;
  }
  return true;
}
