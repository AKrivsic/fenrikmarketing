import type {
  GoalType,
  LanguageCode,
  MarketScope,
  PlatformType,
  ProjectType,
} from "@/lib/supabase/types";

// Runtime option lists for the Project Brain form. Values mirror the DB enums
// in supabase/migrations (001_enums.sql + 008 adds platform_type
// 'google_business'). Keep in sync with the enums.

export const PROJECT_TYPE_OPTIONS: ProjectType[] = [
  "local_service",
  "saas",
  "community_service",
];

export const LANGUAGE_OPTIONS: LanguageCode[] = [
  "cs",
  "en",
  "sk",
  "de",
  "fr",
  "es",
  "it",
];

export const MARKET_SCOPE_OPTIONS: MarketScope[] = [
  "local",
  "national",
  "global",
];

export const GOAL_TYPE_OPTIONS: GoalType[] = [
  "lead_generation",
  "awareness",
  "activation",
  "retention",
];

// google_business is valid: added by migration 008_ai_workflow_columns.sql.
export const PLATFORM_OPTIONS: PlatformType[] = [
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
  "blog",
  "email",
  "google_business",
];
