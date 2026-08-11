/**
 * Creative Review admin data layer (service-role).
 *
 * Read: Manual Review runs only.
 * Write: updates package_brief.creative_review only.
 * Business rules (translation, approval, versioning) live in lib/creative-review.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProductionRunStatus } from "@/lib/supabase/types";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import {
  defersVideoUntilCreativeReview,
  parseGenerationMode,
  type GenerationMode,
} from "@/lib/ai/generationMode";
import type { CreativeReviewPackageEdits } from "@/lib/creative-review/applyEdits";
import { readCreativeReviewFromBrief } from "@/lib/creative-review/read";
import type {
  CreativeReview,
  CreativeReviewActor,
} from "@/lib/creative-review/types";
import {
  commitCreativeReviewApprove,
  commitCreativeReviewConfirmTranslation,
  commitCreativeReviewSave,
  commitCreativeReviewTranslate,
  commitCreativeReviewUnapprove,
  type CreativeReviewMutationResult,
} from "@/lib/creative-review/mutations";
import {
  computeCreativeReviewRunProgress,
  type CreativeReviewRunProgress,
} from "@/lib/creative-review/progress";
import { translateVoiceoverToEnglish } from "@/lib/creative-review/translateVoiceover";
import type { TextProvider } from "@/lib/ai/types";

export type CreativeReviewVoiceoverStatus = "unchanged" | "edited";

export type CreativeReviewPackageLoadState =
  | "ok"
  | "missing"
  | "invalid";

export interface CreativeReviewPackageView {
  packageId: string;
  packageIndex: number;
  title: string;
  updatedAt: string;
  loadState: CreativeReviewPackageLoadState;
  validationIssues: ValidationIssue[];
  creativeReview: CreativeReview | null;
  voiceoverStatus: CreativeReviewVoiceoverStatus;
  sceneCount: number;
}

export interface CreativeReviewRunView {
  id: string;
  status: ProductionRunStatus;
  generationMode: GenerationMode;
  packageCount: number;
  generatedTotal: number;
  failedTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeReviewPageData {
  project: { id: string; name: string };
  run: CreativeReviewRunView;
  packages: CreativeReviewPackageView[];
  progress: CreativeReviewRunProgress;
}

export type LoadCreativeReviewResult =
  | { ok: true; data: CreativeReviewPageData }
  | {
      ok: false;
      error: string;
      code:
        | "not_found"
        | "forbidden_mode"
        | "invalid_input"
        | "invalid_review";
    };

export type CreativeReviewWriteCode =
  | "not_found"
  | "forbidden_mode"
  | "invalid_input"
  | "validation_failed"
  | "missing_review"
  | "version_conflict"
  | "translation_failed";

export type SaveCreativeReviewResult =
  | { ok: true; package: CreativeReviewPackageView }
  | {
      ok: false;
      error: string;
      code: CreativeReviewWriteCode;
      issues?: ValidationIssue[];
      currentVersion?: number;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function generationModeFromRequestedConfig(raw: unknown): GenerationMode {
  const stored = asRecord(raw);
  const config = asRecord(stored?.config);
  return parseGenerationMode(
    config?.generation_mode ?? config?.generationMode,
  );
}

function voiceoverStatusFromReview(
  review: CreativeReview | null,
): CreativeReviewVoiceoverStatus {
  if (!review) return "unchanged";
  return review.voiceover.localized_edit === review.voiceover.original_ai
    ? "unchanged"
    : "edited";
}

function packageViewFromRow(args: {
  packageId: string;
  packageIndex: number;
  title: string;
  updatedAt: string;
  brief: unknown;
}): CreativeReviewPackageView {
  const read = readCreativeReviewFromBrief(args.brief);
  if (read.ok && read.value === null) {
    return {
      packageId: args.packageId,
      packageIndex: args.packageIndex,
      title: args.title,
      updatedAt: args.updatedAt,
      loadState: "missing",
      validationIssues: [
        {
          path: "$.creative_review",
          message: "creative_review is missing from package_brief",
        },
      ],
      creativeReview: null,
      voiceoverStatus: "unchanged",
      sceneCount: 0,
    };
  }
  if (!read.ok) {
    return {
      packageId: args.packageId,
      packageIndex: args.packageIndex,
      title: args.title,
      updatedAt: args.updatedAt,
      loadState: "invalid",
      validationIssues: read.issues,
      creativeReview: null,
      voiceoverStatus: "unchanged",
      sceneCount: 0,
    };
  }
  const review = read.value as CreativeReview;
  return {
    packageId: args.packageId,
    packageIndex: args.packageIndex,
    title: args.title,
    updatedAt: args.updatedAt,
    loadState: "ok",
    validationIssues: [],
    creativeReview: review,
    voiceoverStatus: voiceoverStatusFromReview(review),
    sceneCount: review.scenes.length,
  };
}

function progressFromPackages(
  packages: CreativeReviewPackageView[],
): CreativeReviewRunProgress {
  return computeCreativeReviewRunProgress(
    packages.map((pkg) => pkg.creativeReview),
  );
}

function mutationToWriteResult(
  mutation: CreativeReviewMutationResult,
): Extract<SaveCreativeReviewResult, { ok: false }> | null {
  if (mutation.ok) return null;
  if (mutation.code === "version_conflict") {
    return {
      ok: false,
      error: mutation.error,
      code: "version_conflict",
      issues: mutation.issues,
      currentVersion: mutation.currentVersion,
    };
  }
  return {
    ok: false,
    error: mutation.error,
    code: "validation_failed",
    issues: mutation.issues,
  };
}

type LoadedPackageContext =
  | {
      ok: true;
      packageIndex: number;
      title: string;
      updatedAt: string;
      brief: Record<string, unknown>;
      review: CreativeReview;
    }
  | {
      ok: false;
      result: SaveCreativeReviewResult;
    };

async function loadMutablePackageContext(args: {
  projectId: string;
  runId: string;
  packageId: string;
}): Promise<LoadedPackageContext> {
  const { projectId, runId, packageId } = args;
  if (!projectId || !runId || !packageId) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Chybí identifikátor projektu, běhu nebo balíčku.",
        code: "invalid_input",
      },
    };
  }

  const supabase = createSupabaseAdminClient();

  const { data: run, error: runErr } = await supabase
    .from("production_runs")
    .select("id, project_id, requested_config")
    .eq("id", runId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!run) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Production run nenalezen.",
        code: "not_found",
      },
    };
  }

  const generationMode = generationModeFromRequestedConfig(run.requested_config);
  if (!defersVideoUntilCreativeReview(generationMode)) {
    return {
      ok: false,
      result: {
        ok: false,
        error:
          "Creative Review je dostupné pouze pro běhy ve režimu Manual Review.",
        code: "forbidden_mode",
      },
    };
  }

  const { data: runItem, error: itemErr } = await supabase
    .from("production_run_items")
    .select("package_index, content_package_id")
    .eq("production_run_id", runId)
    .eq("project_id", projectId)
    .eq("content_package_id", packageId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!runItem) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Balíček nepatří k tomuto Manual Review běhu.",
        code: "not_found",
      },
    };
  }

  const { data: pkg, error: pkgErr } = await supabase
    .from("content_packages")
    .select("id, title, package_brief, updated_at")
    .eq("id", packageId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (pkgErr) throw pkgErr;
  if (!pkg) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Balíček nenalezen.",
        code: "not_found",
      },
    };
  }

  const read = readCreativeReviewFromBrief(pkg.package_brief);
  if (read.ok && read.value === null) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Balíček nemá creative_review draft.",
        code: "missing_review",
        issues: [
          {
            path: "$.creative_review",
            message: "creative_review is missing from package_brief",
          },
        ],
      },
    };
  }
  if (!read.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Uložený creative_review je neplatný.",
        code: "validation_failed",
        issues: read.issues,
      },
    };
  }

  return {
    ok: true,
    packageIndex: runItem.package_index as number,
    title: pkg.title as string,
    updatedAt: pkg.updated_at as string,
    brief: asRecord(pkg.package_brief) ?? {},
    review: read.value as CreativeReview,
  };
}

async function persistCreativeReview(args: {
  projectId: string;
  packageId: string;
  packageIndex: number;
  brief: Record<string, unknown>;
  review: CreativeReview;
}): Promise<CreativeReviewPackageView> {
  const supabase = createSupabaseAdminClient();
  const nextBrief = {
    ...args.brief,
    creative_review: args.review,
  };

  const { data: updated, error: updateErr } = await supabase
    .from("content_packages")
    .update({ package_brief: nextBrief })
    .eq("id", args.packageId)
    .eq("project_id", args.projectId)
    .select("id, title, package_brief, updated_at")
    .single();
  if (updateErr) throw updateErr;

  return packageViewFromRow({
    packageId: updated.id as string,
    packageIndex: args.packageIndex,
    title: updated.title as string,
    updatedAt: updated.updated_at as string,
    brief: updated.package_brief,
  });
}

/**
 * Load Creative Review workspace for a Manual Review production run.
 * Production / sample runs return forbidden_mode.
 */
export async function loadCreativeReviewPage(args: {
  projectId: string;
  runId: string;
  projectName: string;
}): Promise<LoadCreativeReviewResult> {
  const { projectId, runId, projectName } = args;
  if (!projectId || !runId) {
    return {
      ok: false,
      error: "Chybí identifikátor projektu nebo běhu.",
      code: "invalid_input",
    };
  }

  const supabase = createSupabaseAdminClient();

  const { data: run, error: runErr } = await supabase
    .from("production_runs")
    .select(
      "id, project_id, status, requested_config, package_count, generated_total, failed_total, created_at, updated_at",
    )
    .eq("id", runId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!run) {
    return {
      ok: false,
      error: "Production run nenalezen.",
      code: "not_found",
    };
  }

  const generationMode = generationModeFromRequestedConfig(run.requested_config);
  if (!defersVideoUntilCreativeReview(generationMode)) {
    return {
      ok: false,
      error:
        "Creative Review je dostupné pouze pro běhy ve režimu Manual Review.",
      code: "forbidden_mode",
    };
  }

  const { data: items, error: itemErr } = await supabase
    .from("production_run_items")
    .select("package_index, content_package_id, status")
    .eq("production_run_id", runId)
    .eq("project_id", projectId)
    .order("package_index", { ascending: true });
  if (itemErr) throw itemErr;

  const packageIds = (items ?? [])
    .map((row) => row.content_package_id as string | null)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const packageById = new Map<
    string,
    { id: string; title: string; package_brief: unknown; updated_at: string }
  >();
  if (packageIds.length > 0) {
    const { data: packages, error: pkgErr } = await supabase
      .from("content_packages")
      .select("id, title, package_brief, updated_at")
      .eq("project_id", projectId)
      .in("id", packageIds);
    if (pkgErr) throw pkgErr;
    for (const row of packages ?? []) {
      packageById.set(row.id as string, {
        id: row.id as string,
        title: row.title as string,
        package_brief: row.package_brief,
        updated_at: row.updated_at as string,
      });
    }
  }

  const views: CreativeReviewPackageView[] = [];
  for (const item of items ?? []) {
    const packageId = item.content_package_id as string | null;
    if (!packageId) continue;
    const pkg = packageById.get(packageId);
    if (!pkg) continue;
    views.push(
      packageViewFromRow({
        packageId: pkg.id,
        packageIndex: item.package_index as number,
        title: pkg.title,
        updatedAt: pkg.updated_at,
        brief: pkg.package_brief,
      }),
    );
  }

  return {
    ok: true,
    data: {
      project: { id: projectId, name: projectName },
      run: {
        id: run.id as string,
        status: run.status as ProductionRunStatus,
        generationMode,
        packageCount: (run.package_count as number) ?? views.length,
        generatedTotal: (run.generated_total as number) ?? 0,
        failedTotal: (run.failed_total as number) ?? 0,
        createdAt: run.created_at as string,
        updatedAt: run.updated_at as string,
      },
      packages: views,
      progress: progressFromPackages(views),
    },
  };
}

export async function saveCreativeReviewPackage(args: {
  projectId: string;
  runId: string;
  packageId: string;
  expectedVersion: number;
  edits: CreativeReviewPackageEdits;
  actor: CreativeReviewActor;
  now?: () => Date;
}): Promise<SaveCreativeReviewResult> {
  const loaded = await loadMutablePackageContext(args);
  if (!loaded.ok) return loaded.result;

  const mutation = commitCreativeReviewSave({
    current: loaded.review,
    expectedVersion: args.expectedVersion,
    edits: args.edits,
    actor: args.actor,
    timestamp: (args.now ?? (() => new Date()))().toISOString(),
  });
  if (!mutation.ok) {
    return mutationToWriteResult(mutation)!;
  }

  const view = await persistCreativeReview({
    projectId: args.projectId,
    packageId: args.packageId,
    packageIndex: loaded.packageIndex,
    brief: loaded.brief,
    review: mutation.review,
  });
  return { ok: true, package: view };
}

export async function translateCreativeReviewPackage(args: {
  projectId: string;
  runId: string;
  packageId: string;
  expectedVersion: number;
  actor: CreativeReviewActor;
  now?: () => Date;
  textProvider?: TextProvider;
}): Promise<SaveCreativeReviewResult> {
  const loaded = await loadMutablePackageContext(args);
  if (!loaded.ok) return loaded.result;

  if (loaded.review.version !== args.expectedVersion) {
    return {
      ok: false,
      error:
        "Balíček byl mezitím upraven jiným editorem. Obnovte stránku a zkuste znovu.",
      code: "version_conflict",
      issues: [
        {
          path: "$.version",
          message: `expected version ${loaded.review.version}, got a stale client revision`,
        },
      ],
      currentVersion: loaded.review.version,
    };
  }

  let english: string;
  try {
    const translated = await translateVoiceoverToEnglish(
      { localizedEdit: loaded.review.voiceover.localized_edit },
      { textProvider: args.textProvider },
    );
    if (!translated.ok) {
      return {
        ok: false,
        error: "Překlad do angličtiny selhal.",
        code: "translation_failed",
        issues: translated.validationErrors,
      };
    }
    english = translated.data.english;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Překlad do angličtiny selhal.";
    return {
      ok: false,
      error: message,
      code: "translation_failed",
    };
  }

  const mutation = commitCreativeReviewTranslate({
    current: loaded.review,
    expectedVersion: args.expectedVersion,
    englishPreview: english,
    actor: args.actor,
    timestamp: (args.now ?? (() => new Date()))().toISOString(),
  });
  if (!mutation.ok) {
    return mutationToWriteResult(mutation)!;
  }

  const view = await persistCreativeReview({
    projectId: args.projectId,
    packageId: args.packageId,
    packageIndex: loaded.packageIndex,
    brief: loaded.brief,
    review: mutation.review,
  });
  return { ok: true, package: view };
}

export async function confirmCreativeReviewTranslation(args: {
  projectId: string;
  runId: string;
  packageId: string;
  expectedVersion: number;
  actor: CreativeReviewActor;
  now?: () => Date;
}): Promise<SaveCreativeReviewResult> {
  const loaded = await loadMutablePackageContext(args);
  if (!loaded.ok) return loaded.result;

  const mutation = commitCreativeReviewConfirmTranslation({
    current: loaded.review,
    expectedVersion: args.expectedVersion,
    actor: args.actor,
    timestamp: (args.now ?? (() => new Date()))().toISOString(),
  });
  if (!mutation.ok) {
    return mutationToWriteResult(mutation)!;
  }

  const view = await persistCreativeReview({
    projectId: args.projectId,
    packageId: args.packageId,
    packageIndex: loaded.packageIndex,
    brief: loaded.brief,
    review: mutation.review,
  });
  return { ok: true, package: view };
}

export async function approveCreativeReviewPackage(args: {
  projectId: string;
  runId: string;
  packageId: string;
  expectedVersion: number;
  actor: CreativeReviewActor;
  now?: () => Date;
}): Promise<SaveCreativeReviewResult> {
  const loaded = await loadMutablePackageContext(args);
  if (!loaded.ok) return loaded.result;

  const mutation = commitCreativeReviewApprove({
    current: loaded.review,
    expectedVersion: args.expectedVersion,
    actor: args.actor,
    timestamp: (args.now ?? (() => new Date()))().toISOString(),
  });
  if (!mutation.ok) {
    return mutationToWriteResult(mutation)!;
  }

  const view = await persistCreativeReview({
    projectId: args.projectId,
    packageId: args.packageId,
    packageIndex: loaded.packageIndex,
    brief: loaded.brief,
    review: mutation.review,
  });
  return { ok: true, package: view };
}

export async function unapproveCreativeReviewPackage(args: {
  projectId: string;
  runId: string;
  packageId: string;
  expectedVersion: number;
  actor: CreativeReviewActor;
  now?: () => Date;
}): Promise<SaveCreativeReviewResult> {
  const loaded = await loadMutablePackageContext(args);
  if (!loaded.ok) return loaded.result;

  const mutation = commitCreativeReviewUnapprove({
    current: loaded.review,
    expectedVersion: args.expectedVersion,
    actor: args.actor,
    timestamp: (args.now ?? (() => new Date()))().toISOString(),
  });
  if (!mutation.ok) {
    return mutationToWriteResult(mutation)!;
  }

  const view = await persistCreativeReview({
    projectId: args.projectId,
    packageId: args.packageId,
    packageIndex: loaded.packageIndex,
    brief: loaded.brief,
    review: mutation.review,
  });
  return { ok: true, package: view };
}
