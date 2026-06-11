import type { ProjectContentEntry } from "@/lib/api/project-content-admin";
import type {
  ApprovalStatus,
  LanguageCode,
  PlatformType,
} from "@/lib/supabase/types";

// Per-RUN review filter. Filters operate ONLY on the run they belong to (never
// globally) and only on the package's platform-output list — the package video
// panel is rendered outside the filter and always stays visible.
//
// Final Review UX Polish: each dimension is now MULTI-SELECT. State holds the
// explicitly selected values; an EMPTY array means "All" (no filtering). A
// non-empty array filters to ANY of the selected values, so a user can combine
// e.g. TikTok + Instagram + YouTube.

// This page only ever contains draft / in_review content, so the status filter
// is intentionally limited to those two values (no Approved / Scheduled).
export type ReviewStatus = Extract<ApprovalStatus, "draft" | "in_review">;

export interface RunFilterState {
  platforms: PlatformType[];
  languages: LanguageCode[];
  statuses: ReviewStatus[];
}

export const DEFAULT_RUN_FILTER: RunFilterState = {
  platforms: [],
  languages: [],
  statuses: [],
};

// Platform options shown in the run filter. Mirrors the spec's review surfaces
// (social platforms + Google Business); blog/email are omitted as they are not
// part of the platform-output review flow.
export const PLATFORM_FILTER_OPTIONS: { value: PlatformType; label: string }[] =
  [
    { value: "tiktok", label: "TikTok" },
    { value: "instagram", label: "Instagram" },
    { value: "youtube", label: "YouTube" },
    { value: "facebook", label: "Facebook" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "x", label: "X" },
    { value: "google_business", label: "Google Business" },
  ];

export const LANGUAGE_FILTER_OPTIONS: { value: LanguageCode; label: string }[] =
  [
    { value: "cs", label: "CS" },
    { value: "en", label: "EN" },
    { value: "de", label: "DE" },
    { value: "fr", label: "FR" },
    { value: "es", label: "ES" },
    { value: "it", label: "IT" },
  ];

export const STATUS_FILTER_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
];

// Toggles a value in/out of a multi-select list (immutably).
export function toggleFilterValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

export function matchesRunFilter(
  entry: ProjectContentEntry,
  filter: RunFilterState,
): boolean {
  if (
    filter.platforms.length > 0 &&
    !filter.platforms.includes(entry.platform)
  ) {
    return false;
  }
  if (
    filter.languages.length > 0 &&
    !filter.languages.includes(entry.language)
  ) {
    return false;
  }
  if (
    filter.statuses.length > 0 &&
    !(filter.statuses as ApprovalStatus[]).includes(entry.status)
  ) {
    return false;
  }
  return true;
}
