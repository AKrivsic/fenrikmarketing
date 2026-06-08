// Hand-written types mirroring the SQL schema in supabase/migrations.
// Keep in sync with the migrations; do not change migrations to match these.

export type ProjectType = "local_service" | "saas" | "community_service";
export type LanguageCode = "cs" | "en" | "sk" | "de" | "fr" | "es" | "it";
export type MarketScope = "local" | "national" | "global";
export type GoalType =
  | "lead_generation"
  | "awareness"
  | "activation"
  | "retention";

export type MediaType = "image" | "video" | "audio" | "document" | "text";
export type AssetMode = "source" | "generated" | "edited" | "template";

export type PlatformType =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "blog"
  | "email"
  | "google_business";

// Funnel stages (DB enum funnel_stage, migration 008/009). Kept in sync with
// lib/ai/types.ts FUNNEL_STAGES.
export type FunnelStageDb =
  | "awareness"
  | "problem_aware"
  | "solution_aware"
  | "conversion";
export type ContentFormat =
  | "post"
  | "story"
  | "reel"
  | "short"
  | "carousel"
  | "article"
  | "email";
export type ApprovalStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published";
export type PackageStatus =
  | "draft"
  | "ready"
  | "approved"
  | "published"
  | "archived";

export type TrendSource =
  | "manual"
  | "google_trends"
  | "social"
  | "news"
  | "internal";
export type VisualProvider =
  | "openai"
  | "replicate"
  | "stability"
  | "midjourney"
  | "other";
export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  type: ProjectType;
  language: LanguageCode;
  // Additional (non-primary) variant languages. The primary language is
  // `language`; this list never includes it. Defaults to an empty array.
  enabled_languages: LanguageCode[];
  market_scope: MarketScope;
  target_audience: Json;
  goal_type: GoalType;
  product_is: string[];
  product_is_not: string[];
  product_strengths: string[];
  pain_points: string[];
  forbidden_claims: string[];
  tone_of_voice: Json;
  platforms: PlatformType[];
  publishing_rules: Json;
  default_cta: string | null;
  // Knowledge Model V2 block (migration 012). Free-form jsonb at the DB level;
  // the typed shape lives in lib/knowledge/types.ts (ProjectKnowledge). Defaults
  // to {} for existing rows, which is derived from the brain columns on access.
  knowledge: Json;
  created_at: string;
  updated_at: string;
}

// owner_id is derived from the authenticated user, never passed by callers.
// knowledge is optional on insert: the DB default {} applies and the proposal
// is written later by the extraction step.
export type ProjectInsert = Omit<
  Project,
  "id" | "owner_id" | "created_at" | "updated_at" | "knowledge"
> &
  Partial<Pick<Project, "language" | "enabled_languages" | "knowledge">>;

export type ProjectUpdate = Partial<
  Omit<Project, "id" | "owner_id" | "created_at" | "updated_at">
>;

export interface Asset {
  id: string;
  project_id: string;
  title: string;
  media_type: MediaType;
  asset_mode: AssetMode;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  metadata: Json;
  tags: string[];
  usage_count: number;
  reuse_score: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentPackage {
  id: string;
  project_id: string;
  strategy_item_id: string | null;
  weekly_strategy_id: string | null;
  funnel_stage: FunnelStageDb | null;
  title: string;
  status: PackageStatus;
  package_brief: Json;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  project_id: string;
  package_id: string | null;
  platform: PlatformType;
  format: ContentFormat;
  status: ApprovalStatus;
  // NULL means the project's primary language (projects.language). Resolve via
  // effectiveLanguage(item.language, project.language).
  language: LanguageCode | null;
  title: string | null;
  body: string | null;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  generation_metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface PublishingSchedule {
  id: string;
  project_id: string;
  content_item_id: string;
  platform: PlatformType;
  scheduled_at: string;
  status: ApprovalStatus;
  publishing_metadata: Json;
  created_at: string;
}

export interface AiVisual {
  id: string;
  project_id: string;
  content_item_id: string | null;
  asset_id: string | null;
  prompt: string;
  negative_prompt: string | null;
  image_provider: VisualProvider;
  image_model: string;
  provider_job_id: string | null;
  provider_metadata: Json;
  result_bucket: string | null;
  result_path: string | null;
  status: JobStatus;
  created_at: string;
  completed_at: string | null;
}

export interface VideoJob {
  id: string;
  project_id: string;
  content_item_id: string | null;
  provider: string;
  model: string | null;
  provider_job_id: string | null;
  status: JobStatus;
  input: Json;
  output: Json;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
