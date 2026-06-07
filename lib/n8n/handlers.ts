import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CallbackValidationError } from "@/lib/n8n/callback";

// n8n callback handlers.
//
// These persist automation results into EXISTING Supabase tables via the
// service-role admin client (createSupabaseAdminClient), which bypasses RLS.
// Because RLS is bypassed, EVERY query is manually scoped by project_id (and
// ownership of referenced rows is verified) so a callback can never touch data
// outside its project.
//
// No new tables, columns, workflows, AI calls or video-worker calls are
// introduced here. Where the requested data has no home in the current schema
// (rejected trends, automation errors, a package "failed" status) it is
// intentionally NOT persisted — see the per-handler notes.

// ---------------------------------------------------------------------------
// Enum allow-lists (mirror supabase/migrations 001 + 008). Used for manual
// payload validation without adding a schema/validation dependency.
// ---------------------------------------------------------------------------
const PACKAGE_STATUSES = [
  "draft",
  "ready",
  "approved",
  "published",
  "archived",
] as const;
const JOB_STATUSES = ["queued", "processing", "completed", "failed"] as const;
const PLATFORM_TYPES = [
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
  "blog",
  "email",
  "google_business",
] as const;
const CONTENT_FORMATS = [
  "post",
  "story",
  "reel",
  "short",
  "carousel",
  "article",
  "email",
] as const;
const GOAL_TYPES = [
  "lead_generation",
  "awareness",
  "activation",
  "retention",
] as const;
const TREND_SOURCES = [
  "manual",
  "google_trends",
  "social",
  "news",
  "internal",
] as const;

// ---------------------------------------------------------------------------
// Manual payload helpers. Every failure is a CallbackValidationError so the
// route maps it to HTTP 400.
// ---------------------------------------------------------------------------
function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new CallbackValidationError("payload must be a JSON object");
}

function asRecordField(
  obj: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = obj[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new CallbackValidationError(`${key} must be an object`);
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new CallbackValidationError(`${key} is required`);
  }
  return value;
}

function optionalString(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new CallbackValidationError(`${key} must be a string`);
  }
  return value;
}

function requireArray(obj: Record<string, unknown>, key: string): unknown[] {
  const value = obj[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new CallbackValidationError(`${key} must be an array`);
  }
  return value;
}

function requireEnum<T extends string>(
  obj: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
): T {
  const value = requireString(obj, key);
  if (!(allowed as readonly string[]).includes(value)) {
    throw new CallbackValidationError(
      `${key} must be one of: ${allowed.join(", ")}`,
    );
  }
  return value as T;
}

function matchEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

// ---------------------------------------------------------------------------
// Ownership guard: confirm a content package belongs to the project before any
// write. Returns the row; throws a validation error when missing.
// ---------------------------------------------------------------------------
async function requirePackageInProject(
  supabase: SupabaseClient,
  contentPackageId: string,
  projectId: string,
): Promise<{ id: string; package_brief: unknown }> {
  const { data, error } = await supabase
    .from("content_packages")
    .select("id, package_brief")
    .eq("id", contentPackageId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new CallbackValidationError(
      `content package ${contentPackageId} not found for project ${projectId}`,
    );
  }
  return { id: data.id as string, package_brief: data.package_brief };
}

// ---------------------------------------------------------------------------
// 1. Content package callback -> update content_packages.
// ---------------------------------------------------------------------------
export async function handleContentPackageCallback(
  payload: unknown,
): Promise<void> {
  const body = asRecord(payload);
  const projectId = requireString(body, "project_id");
  const contentPackageId = requireString(body, "content_package_id");
  const status = requireEnum(body, "status", PACKAGE_STATUSES);
  const message = optionalString(body, "message");

  const supabase = createSupabaseAdminClient();
  const pkg = await requirePackageInProject(
    supabase,
    contentPackageId,
    projectId,
  );

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // platform_outputs is NOT a column and has no dedicated table; fold it into
  // the existing package_brief jsonb (same convention as the AI layer).
  const platformOutputs = body["platform_outputs"];
  const prevBrief =
    (pkg.package_brief as Record<string, unknown> | null) ?? {};
  if (
    platformOutputs &&
    typeof platformOutputs === "object" &&
    !Array.isArray(platformOutputs)
  ) {
    update.package_brief = {
      ...prevBrief,
      platform_outputs: platformOutputs,
      ...(message ? { last_callback_message: message } : {}),
    };
  } else if (message) {
    update.package_brief = { ...prevBrief, last_callback_message: message };
  }

  const { error } = await supabase
    .from("content_packages")
    .update(update)
    .eq("id", contentPackageId)
    .eq("project_id", projectId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// 2. Video callback -> update video_jobs (+ package status on completion).
// video_jobs has no content_package_id column; it links via content_item_id.
// ---------------------------------------------------------------------------
export async function handleVideoCallback(payload: unknown): Promise<void> {
  const body = asRecord(payload);
  const projectId = requireString(body, "project_id");
  const contentPackageId = requireString(body, "content_package_id");
  const videoJobId = optionalString(body, "video_job_id");
  const status = requireEnum(body, "status", JOB_STATUSES);

  // mp4_url / thumbnail_url / subtitle_url describe a successful render and are
  // only meaningful (and only required) when the job completed. A "failed"
  // callback instead carries error_message and must NOT demand the artifact URLs.
  const isFailed = status === "failed";
  const mp4Url = isFailed
    ? optionalString(body, "mp4_url")
    : requireString(body, "mp4_url");
  const thumbnailUrl = optionalString(body, "thumbnail_url");
  const subtitleUrl = optionalString(body, "subtitle_url");
  const errorMessage = isFailed
    ? requireString(body, "error_message")
    : optionalString(body, "error_message");

  const supabase = createSupabaseAdminClient();
  await requirePackageInProject(supabase, contentPackageId, projectId);

  const job = await resolveVideoJob(supabase, {
    projectId,
    contentPackageId,
    videoJobId,
  });
  if (!job) {
    throw new CallbackValidationError(
      "no video job found for the given content package",
    );
  }

  const prevOutput = (job.output as Record<string, unknown> | null) ?? {};
  const output: Record<string, unknown> = { ...prevOutput };
  if (mp4Url) output.mp4_url = mp4Url;
  if (thumbnailUrl) output.thumbnail_url = thumbnailUrl;
  if (subtitleUrl) output.subtitle_url = subtitleUrl;
  if (errorMessage) output.error_message = errorMessage;

  const videoUpdate: Record<string, unknown> = { status, output };
  if (status === "completed") {
    videoUpdate.completed_at = new Date().toISOString();
  }

  const { error: videoErr } = await supabase
    .from("video_jobs")
    .update(videoUpdate)
    .eq("id", job.id)
    .eq("project_id", projectId);
  if (videoErr) throw videoErr;

  // On completion the package becomes a draft (ready for review). package_status
  // has NO "failed" value, so a failed video does not change the package status.
  if (status === "completed") {
    const { error: pkgErr } = await supabase
      .from("content_packages")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("id", contentPackageId)
      .eq("project_id", projectId);
    if (pkgErr) throw pkgErr;
  }
}

async function resolveVideoJob(
  supabase: SupabaseClient,
  args: { projectId: string; contentPackageId: string; videoJobId?: string },
): Promise<{ id: string; output: unknown } | null> {
  const { projectId, contentPackageId, videoJobId } = args;

  if (videoJobId) {
    const { data, error } = await supabase
      .from("video_jobs")
      .select("id, output")
      .eq("id", videoJobId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    return data ? { id: data.id as string, output: data.output } : null;
  }

  // No job id: resolve the package's content items first, then the latest job.
  const { data: items, error: itemErr } = await supabase
    .from("content_items")
    .select("id")
    .eq("package_id", contentPackageId)
    .eq("project_id", projectId);
  if (itemErr) throw itemErr;
  const itemIds = (items ?? []).map((row) => row.id as string);
  if (itemIds.length === 0) return null;

  const { data: jobs, error: jobErr } = await supabase
    .from("video_jobs")
    .select("id, output, created_at")
    .eq("project_id", projectId)
    .in("content_item_id", itemIds)
    .order("created_at", { ascending: false })
    .limit(1);
  if (jobErr) throw jobErr;
  const latest = (jobs ?? [])[0];
  return latest ? { id: latest.id as string, output: latest.output } : null;
}

// ---------------------------------------------------------------------------
// 3. Trend scan callback -> insert accepted trends. rejected_trends are NOT
// persisted (no log table exists). Trends without a relevance_score are skipped.
// ---------------------------------------------------------------------------
export async function handleTrendScanCallback(payload: unknown): Promise<void> {
  const body = asRecord(payload);
  const projectId = requireString(body, "project_id");
  const accepted = requireArray(body, "accepted_trends");

  const rows: Record<string, unknown>[] = [];
  for (const entry of accepted) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const trend = entry as Record<string, unknown>;

    // Required by the task: no relevance_score -> do not store.
    const relevanceScore = trend["relevance_score"];
    if (typeof relevanceScore !== "number" || Number.isNaN(relevanceScore)) {
      continue;
    }
    // title is a NOT NULL column; skip entries that cannot be inserted.
    const title = trend["title"];
    if (typeof title !== "string" || title.length === 0) continue;

    // No relevance_score column exists -> store it in metadata (same convention
    // as the AI scoreTrend workflow).
    const metadata: Record<string, unknown> = { relevance_score: relevanceScore };
    if (typeof trend["rationale"] === "string") {
      metadata.relevance_rationale = trend["rationale"];
    }
    if (typeof trend["angle"] === "string") {
      metadata.recommended_angle = trend["angle"];
    }

    const row: Record<string, unknown> = {
      project_id: projectId,
      title,
      source: matchEnum(trend["source"], TREND_SOURCES) ?? "internal",
      metadata,
    };
    const sourceUrl = trend["source_url"];
    if (typeof sourceUrl === "string") row.source_url = sourceUrl;
    const signal = trend["signal_strength"];
    if (typeof signal === "number" && signal >= 1 && signal <= 10) {
      row.signal_strength = Math.round(signal);
    }
    rows.push(row);
  }

  if (rows.length === 0) return;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("trends").insert(rows);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// 4. Weekly strategy callback -> insert content_strategies (+ items).
// No weekly_strategies table is created; content_strategies is the home.
// ---------------------------------------------------------------------------
export async function handleWeeklyStrategyCallback(
  payload: unknown,
): Promise<void> {
  const body = asRecord(payload);
  const projectId = requireString(body, "project_id");
  const weekStart = requireString(body, "week_start");
  const strategy = asRecordField(body, "strategy");

  const supabase = createSupabaseAdminClient();

  // objective is NOT NULL with no default -> fall back to the project goal_type.
  // This select also verifies the project exists.
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, goal_type")
    .eq("id", projectId)
    .maybeSingle();
  if (projErr) throw projErr;
  if (!project) {
    throw new CallbackValidationError(`project ${projectId} not found`);
  }

  const objective =
    matchEnum(strategy["objective"], GOAL_TYPES) ??
    (project.goal_type as string);
  const theme = strategy["theme"];
  const name =
    typeof theme === "string" && theme.length > 0 ? theme : `Weekly ${weekStart}`;
  const weekEnd = optionalString(strategy, "week_end") ?? null;

  const { data: strategyRow, error: insErr } = await supabase
    .from("content_strategies")
    .insert({
      project_id: projectId,
      name,
      objective,
      period_start: weekStart,
      period_end: weekEnd,
      strategy_brief: strategy,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  const strategyId = strategyRow.id as string;

  // Optional plan items: only those with the NOT NULL platform + format columns.
  const rawItems = Array.isArray(strategy["items"])
    ? (strategy["items"] as unknown[])
    : Array.isArray(strategy["content_plan"])
      ? (strategy["content_plan"] as unknown[])
      : [];

  const itemRows: Record<string, unknown>[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const platform = matchEnum(item["platform"], PLATFORM_TYPES);
    const format = matchEnum(item["format"], CONTENT_FORMATS);
    if (!platform || !format) continue;

    const row: Record<string, unknown> = {
      strategy_id: strategyId,
      project_id: projectId,
      platform,
      format,
      brief: item,
    };
    const priority = item["priority"];
    if (typeof priority === "number" && priority >= 1 && priority <= 5) {
      row.priority = Math.round(priority);
    }
    itemRows.push(row);
  }

  if (itemRows.length > 0) {
    const { error: itemErr } = await supabase
      .from("content_strategy_items")
      .insert(itemRows);
    if (itemErr) throw itemErr;
  }
}

// ---------------------------------------------------------------------------
// 5. Publishing plan callback -> insert publishing_schedule rows.
// publishing_schedule requires content_item_id (NOT NULL); the payload carries
// content_package_id, so the matching content item is resolved per platform.
// ---------------------------------------------------------------------------
export async function handlePublishingPlanCallback(
  payload: unknown,
): Promise<void> {
  const body = asRecord(payload);
  const projectId = requireString(body, "project_id");
  const items = requireArray(body, "items");

  const supabase = createSupabaseAdminClient();
  const verifiedPackages = new Set<string>();
  const rows: Record<string, unknown>[] = [];

  for (const raw of items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;

    const contentPackageId = requireString(item, "content_package_id");
    const platform = matchEnum(item["platform"], PLATFORM_TYPES);
    if (!platform) {
      throw new CallbackValidationError(
        "item.platform must be a valid platform type",
      );
    }
    const publishAt =
      optionalString(item, "publish_at") ??
      optionalString(item, "scheduled_at") ??
      optionalString(item, "date");
    if (!publishAt) {
      throw new CallbackValidationError("item.publish_at is required");
    }

    if (!verifiedPackages.has(contentPackageId)) {
      await requirePackageInProject(supabase, contentPackageId, projectId);
      verifiedPackages.add(contentPackageId);
    }

    // Resolve the package's content item for this platform (NOT NULL FK).
    const { data: contentItem, error: ciErr } = await supabase
      .from("content_items")
      .select("id")
      .eq("package_id", contentPackageId)
      .eq("project_id", projectId)
      .eq("platform", platform)
      .limit(1)
      .maybeSingle();
    if (ciErr) throw ciErr;
    if (!contentItem) continue; // cannot satisfy the NOT NULL FK -> skip

    rows.push({
      project_id: projectId,
      content_item_id: contentItem.id as string,
      platform,
      scheduled_at: publishAt,
      publishing_metadata: { content_package_id: contentPackageId },
    });
  }

  if (rows.length === 0) return;

  const { error } = await supabase.from("publishing_schedule").insert(rows);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// 6. Automation error callback -> structured server log only.
// There is no automation_errors / generation_logs / callback_failures table,
// and package_status has no "failed" value, so nothing is persisted. The call
// still acknowledges with 200 once the payload is accepted.
// ---------------------------------------------------------------------------
export async function handleAutomationErrorCallback(
  payload: unknown,
): Promise<void> {
  const body = asRecord(payload);
  const workflow = requireString(body, "workflow");
  const errorType = requireString(body, "error_type");
  const errorMessage = requireString(body, "error_message");
  const projectId = optionalString(body, "project_id");
  const contentPackageId = optionalString(body, "content_package_id");
  const step = optionalString(body, "step");

  console.error(
    "[n8n automation error]",
    JSON.stringify({
      workflow,
      step: step ?? null,
      error_type: errorType,
      error_message: errorMessage,
      project_id: projectId ?? null,
      content_package_id: contentPackageId ?? null,
      received_at: new Date().toISOString(),
    }),
  );
}
