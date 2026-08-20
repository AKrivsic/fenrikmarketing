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
  parseGenerationMode,
  defersVideoUntilCreativeReview,
  type GenerationMode,
} from "@/lib/ai/generationMode";
import type { CreativeReviewPackageEdits } from "@/lib/creative-review/applyEdits";
import {
  invalidateVideoDerivativesOnVoiceoverChange,
  invalidateVisualPlanOnSceneEdit,
  invalidateAudioTimingOnVoiceDirectionChange,
} from "@/lib/content-package/videoCreativeIntegrity";
import {
  applyHumanVisualEditToScene,
  readTextToVideoCreativePlan,
  reevaluateTextToVideoPlanRepetition,
  REPETITION_BLOCK_REASON_LABELS,
  serializeTextToVideoCreativePlan,
} from "@/lib/content-package/textToVideoCreativePlan";
import { loadRecentTextToVideoPlanFingerprints } from "@/lib/content-package/attachTextToVideoCreativePlan";
import {
  buildAntiRepetitionMemory,
} from "@/lib/ai/workflows/antiRepetitionMemory";
import {
  canAccessCreativeReviewRun,
  readCreativeReviewReason,
  CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION,
} from "@/lib/content-package/creativeReviewDeferral";
import {
  bumpVoiceDirectionRevision,
  defaultVoiceDirectionContract,
  readVoiceDirectionFromBrief,
  type VoiceDirectionContract,
  VOICE_DIRECTION_STYLE_LABELS,
} from "@/lib/content-package/voiceDirectionContract";
import {
  parseTextToVideoSoundPlan,
  textToVideoSceneSoundSchema,
  textToVideoMusicPlanSchema,
  bumpSoundPlanRevision,
  VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY,
} from "@/lib/content-package/textToVideoSoundPlan";
import { invalidateAssemblyOnSoundPlanChange } from "@/lib/content-package/invalidateTextToVideoAssembly";
import { validateSceneSoundForApproval } from "@/lib/text-to-video/textToVideoSfxAnchoring";
import {
  readT2vVoiceCategoryLabelForManualReview,
  readT2vVoiceLanguageLabelForManualReview,
} from "@/lib/text-to-video/textToVideoAuthoritativeVoice";
import { parsePackageVideoProductionMode } from "@/lib/content-package/packageVideoProductionMode";
import { readCreativeReviewFromBrief } from "@/lib/creative-review/read";
import type {
  CreativeReview,
  CreativeReviewActor,
} from "@/lib/creative-review/types";
import {
  commitCreativeReviewApprove,
  commitCreativeReviewSave,
  commitCreativeReviewTranslate,
  commitCreativeReviewUnapprove,
  type CreativeReviewMutationResult,
} from "@/lib/creative-review/mutations";
import {
  computeCreativeReviewRunProgress,
  type CreativeReviewRunProgress,
} from "@/lib/creative-review/progress";
import {
  creativeReviewNeedsEnglishPreviewUpdate,
} from "@/lib/creative-review/lifecycle";
import { productionSpokenVoiceoverFromReview } from "@/lib/creative-review/productionSpokenVoiceover";
import { applyProductionVoiceoverToTextToVideoBrief } from "@/lib/content-package/textToVideoManualReview";
import { estimateTextToVideoOperatorBudget } from "@/lib/text-to-video/textToVideoOperatorBudget";
import { translateCreativeReviewEnglishPreviews } from "@/lib/creative-review/translateVoiceover";
import type { TextProvider } from "@/lib/ai/types";
import {
  DEFAULT_EDITOR_LANGUAGE,
  parseEditorLanguage,
  type EditorLanguageCode,
} from "@/lib/admin/editorLanguage";

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
  packageVideoMode: "still" | "text_to_video";
  /** Derived hook + T2V plan summary for Manual Review (text_to_video). */
  videoCreativeSummary: CreativeReviewVideoCreativeSummary | null;
}

export interface CreativeReviewVideoCreativeSummary {
  hook: string | null;
  voiceDirection: VoiceDirectionContract | null;
  /** Informative Eleven bucket (ženský / mužský / default) from stamped OpenAI voice. */
  voiceCategoryLabel: string | null;
  /** Informative voice language (čeština / english) from stamped package/job language. */
  voiceLanguageLabel: string | null;
  planStatus: string | null;
  repetitionStatus: string | null;
  repetitionReasons: string[];
  creativeReviewReason: string | null;
  t2vRepetitionBlockedBanner: string | null;
  scenes: Array<{
    sceneId: string;
    order: number;
    humanMeaning: string;
    humanVisualEdit: string;
    voiceoverExcerpt: string;
    approximateStartSeconds: number;
    approximateDurationSeconds: number;
    providerPrompt: string;
    soundMode: string;
    soundEffectDescription: string | null;
    soundAnchor: string | null;
    voicePhrase: string | null;
  }>;
  musicMode: string | null;
  musicMood: string | null;
  budgetEstimateLabel: string | null;
  timingStatus: string | null;
  maxBudgetUsd: number | null;
}

export interface CreativeReviewRunView {
  id: string;
  status: ProductionRunStatus;
  generationMode: GenerationMode;
  /** Admin Editor Language stamped on the Manual Review run. */
  editorLanguage: EditorLanguageCode;
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
  | "translation_failed"
  | "immutable_status";

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

function editorLanguageFromRequestedConfig(raw: unknown): EditorLanguageCode {
  const stored = asRecord(raw);
  const config = asRecord(stored?.config);
  return parseEditorLanguage(
    config?.editor_language ?? config?.editorLanguage,
    DEFAULT_EDITOR_LANGUAGE,
  );
}

function patchBriefAfterCreativeReviewEdits(args: {
  brief: Record<string, unknown>;
  priorReview: CreativeReview;
  edits: CreativeReviewPackageEdits;
}): Record<string, unknown> {
  const voiceoverChanged =
    args.priorReview.voiceover.localized_edit !==
    args.edits.voiceoverLocalizedEdit;
  const isT2v =
    parsePackageVideoProductionMode(args.brief.package_video_mode) ===
    "text_to_video";
  let next = args.brief;
  if (voiceoverChanged) {
    if (isT2v) {
      const currentVo =
        typeof next.voiceover_text === "string" ? next.voiceover_text : "";
      next = invalidateVideoDerivativesOnVoiceoverChange(next, currentVo);
    } else {
      next = invalidateVideoDerivativesOnVoiceoverChange(
        next,
        args.edits.voiceoverLocalizedEdit,
      );
    }
  } else {
    const scenesChanged = args.priorReview.scenes.some((scene) => {
      const edit = args.edits.scenes.find((s) => s.id === scene.id);
      if (!edit) return false;
      return (
        edit.intentLocalizedEdit !== scene.intent.localized_edit ||
        edit.directorNotes !== scene.director_notes
      );
    });
    if (scenesChanged && !isT2v) {
      next = invalidateVisualPlanOnSceneEdit(next);
    }
  }
  return next;
}

/** Mutations are only allowed while waiting for creative review. */
function isCreativeReviewMutableStatus(status: ProductionRunStatus): boolean {
  return status === "waiting_for_creative_review";
}

function immutableStatusResult(
  status: ProductionRunStatus,
): Extract<SaveCreativeReviewResult, { ok: false }> {
  return {
    ok: false,
    error: `Creative Review is read-only when the run status is "${status}".`,
    code: "immutable_status",
  };
}

function voiceoverStatusFromReview(
  review: CreativeReview | null,
): CreativeReviewVoiceoverStatus {
  if (!review) return "unchanged";
  return review.voiceover.localized_edit === review.voiceover.original_ai
    ? "unchanged"
    : "edited";
}

function buildVideoCreativeSummary(
  brief: Record<string, unknown>,
  review: CreativeReview | null = null,
): CreativeReviewVideoCreativeSummary | null {
  const mode = parsePackageVideoProductionMode(brief.package_video_mode);
  if (mode !== "text_to_video") return null;
  const plan = readTextToVideoCreativePlan(brief);
  const hook =
    typeof brief.hook === "string" && brief.hook.trim()
      ? brief.hook.trim()
      : plan?.approved_hook ?? null;
  const sound = parseTextToVideoSoundPlan(brief.video_text_to_video_sound_plan);
  const productionVo =
    (review ? productionSpokenVoiceoverFromReview(review) : null) ??
    (typeof brief.voiceover_text === "string" ? brief.voiceover_text.trim() : "");
  const paid = asRecord(brief.video_paid_preflight);
  const maxBudgetUsd =
    typeof paid?.max_budget_usd === "number" && Number.isFinite(paid.max_budget_usd)
      ? paid.max_budget_usd
      : null;
  let budgetEstimateLabel: string | null = null;
  if (plan && productionVo) {
    try {
      budgetEstimateLabel = estimateTextToVideoOperatorBudget({
        productionVoiceover: productionVo,
        plan,
        sound,
        maxBudgetUsd,
      }).label;
    } catch {
      budgetEstimateLabel = "Odhad ceny nelze spočítat z aktuálních délek scén.";
    }
  }
  return {
    hook,
    voiceDirection: readVoiceDirectionFromBrief(brief),
    voiceCategoryLabel: readT2vVoiceCategoryLabelForManualReview(brief),
    voiceLanguageLabel: readT2vVoiceLanguageLabelForManualReview(brief),
    planStatus: plan?.status ?? null,
    repetitionStatus: plan?.repetition.status ?? null,
    repetitionReasons: (plan?.repetition.blocked_reasons ?? []).map(
      (code) => REPETITION_BLOCK_REASON_LABELS[code] ?? code,
    ),
    creativeReviewReason: readCreativeReviewReason(brief),
    t2vRepetitionBlockedBanner:
      readCreativeReviewReason(brief) ===
      CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION
        ? "Video čeká na úpravu: návrh se příliš podobá dřívějšímu obsahu."
        : null,
    musicMode: sound?.music.mode ?? "none",
    musicMood: sound?.music.mood ?? null,
    budgetEstimateLabel,
    timingStatus: plan?.timing_status ?? null,
    maxBudgetUsd,
    scenes: (plan?.scenes ?? []).map((s) => {
      const ss = sound?.scene_sound[s.scene_id];
      const modeResolved =
        ss?.mode === "custom" ? "custom" : ss?.mode === "none" ? "none" : "none";
      return {
        sceneId: s.scene_id,
        order: s.order,
        humanMeaning: s.human_meaning,
        humanVisualEdit: s.human_visual_edit ?? s.visual_intent,
        voiceoverExcerpt: s.voiceover_excerpt,
        approximateStartSeconds: s.approximate_start_seconds,
        approximateDurationSeconds: s.approximate_duration_seconds,
        providerPrompt: s.provider_prompt,
        soundMode: modeResolved,
        soundEffectDescription: ss?.custom_effect_description ?? null,
        soundAnchor: ss?.anchor ?? null,
        voicePhrase: ss?.voice_phrase ?? null,
      };
    }),
  };
}

function packageViewFromRow(args: {
  packageId: string;
  packageIndex: number;
  title: string;
  updatedAt: string;
  brief: unknown;
}): CreativeReviewPackageView {
  const briefRecord = asRecord(args.brief) ?? {};
  const packageVideoMode = parsePackageVideoProductionMode(
    briefRecord.package_video_mode,
  );
  const read = readCreativeReviewFromBrief(args.brief);
  const reviewForSummary =
    read.ok && read.value ? (read.value as CreativeReview) : null;
  const videoCreativeSummary = buildVideoCreativeSummary(
    briefRecord,
    reviewForSummary,
  );
  const base = {
    packageId: args.packageId,
    packageIndex: args.packageIndex,
    title: args.title,
    updatedAt: args.updatedAt,
    packageVideoMode,
    videoCreativeSummary,
  };
  if (read.ok && read.value === null) {
    return {
      ...base,
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
      ...base,
      loadState: "invalid",
      validationIssues: read.issues,
      creativeReview: null,
      voiceoverStatus: "unchanged",
      sceneCount: 0,
    };
  }
  const review = read.value as CreativeReview;
  return {
    ...base,
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
        error: "Missing project, run, or package id.",
        code: "invalid_input",
      },
    };
  }

  const supabase = createSupabaseAdminClient();

  const { data: run, error: runErr } = await supabase
    .from("production_runs")
    .select("id, project_id, status, requested_config")
    .eq("id", runId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!run) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Production run not found.",
        code: "not_found",
      },
    };
  }

  const generationMode = generationModeFromRequestedConfig(run.requested_config);
  const runStatus = run.status as ProductionRunStatus;
  if (
    !defersVideoUntilCreativeReview(generationMode) &&
    !canAccessCreativeReviewRun({
      generationMode,
      runStatus,
    })
  ) {
    return {
      ok: false,
      result: {
        ok: false,
        error:
          "Creative Review is available only while the run waits for creative review.",
        code: "forbidden_mode",
      },
    };
  }

  if (!isCreativeReviewMutableStatus(runStatus)) {
    return {
      ok: false,
      result: immutableStatusResult(runStatus),
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
        error: "Package does not belong to this Manual Review run.",
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
        error: "Package not found.",
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
        error: "Package has no creative_review draft.",
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
        error: "Stored creative_review is invalid.",
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
      error: "Missing project or run id.",
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
      error: "Production run not found.",
      code: "not_found",
    };
  }

  const generationMode = generationModeFromRequestedConfig(run.requested_config);
  const runStatus = run.status as ProductionRunStatus;
  if (
    !defersVideoUntilCreativeReview(generationMode) &&
    !canAccessCreativeReviewRun({
      generationMode,
      runStatus,
    })
  ) {
    return {
      ok: false,
      error:
        "Creative Review is available only while the run waits for creative review.",
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
        editorLanguage: editorLanguageFromRequestedConfig(run.requested_config),
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
  textProvider?: TextProvider;
}): Promise<SaveCreativeReviewResult> {
  const loaded = await loadMutablePackageContext(args);
  if (!loaded.ok) return loaded.result;

  const now = args.now ?? (() => new Date());
  const mutation = commitCreativeReviewSave({
    current: loaded.review,
    expectedVersion: args.expectedVersion,
    edits: args.edits,
    actor: args.actor,
    timestamp: now().toISOString(),
  });
  if (!mutation.ok) {
    return mutationToWriteResult(mutation)!;
  }

  let review = mutation.review;

  // Automatic translation after Localized changes — no manual translate step.
  if (creativeReviewNeedsEnglishPreviewUpdate(review)) {
    try {
      const translated = await translateCreativeReviewEnglishPreviews(review, {
        textProvider: args.textProvider,
        forceAll: true,
      });
      if (!translated.ok) {
        return {
          ok: false,
          error: "Automatic English preview update failed after save.",
          code: "translation_failed",
          issues: translated.validationErrors,
        };
      }
      const translatedMutation = commitCreativeReviewTranslate({
        current: review,
        expectedVersion: review.version,
        voiceover: translated.data.voiceover,
        scenes: translated.data.scenes,
        actor: args.actor,
        timestamp: now().toISOString(),
      });
      if (!translatedMutation.ok) {
        return mutationToWriteResult(translatedMutation)!;
      }
      review = translatedMutation.review;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Automatic English preview update failed after save.";
      return {
        ok: false,
        error: message,
        code: "translation_failed",
      };
    }
  }

  let brief = patchBriefAfterCreativeReviewEdits({
    brief: loaded.brief,
    priorReview: loaded.review,
    edits: args.edits,
  });
  const isT2v =
    parsePackageVideoProductionMode(loaded.brief.package_video_mode) ===
    "text_to_video";
  const voiceoverChanged =
    loaded.review.voiceover.localized_edit !== args.edits.voiceoverLocalizedEdit;
  if (isT2v && voiceoverChanged) {
    const productionVo = productionSpokenVoiceoverFromReview(review);
    if (!productionVo) {
      return {
        ok: false,
        error:
          "Production-language voiceover is missing or outdated — save again to refresh translation.",
        code: "translation_failed",
      };
    }
    const supabase = createSupabaseAdminClient();
    const memory = await buildAntiRepetitionMemory(supabase, args.projectId, {
      excludePackageId: args.packageId,
    });
    const priorFps = await loadRecentTextToVideoPlanFingerprints(
      supabase,
      args.projectId,
      args.packageId,
    );
    brief = applyProductionVoiceoverToTextToVideoBrief({
      brief,
      packageId: args.packageId,
      productionVoiceover: productionVo,
      memory,
      priorPlanFingerprints: priorFps,
      approvePlan: false,
      timestamp: now().toISOString(),
    });
  }

  const view = await persistCreativeReview({
    projectId: args.projectId,
    packageId: args.packageId,
    packageIndex: loaded.packageIndex,
    brief,
    review,
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

  const isT2v =
    parsePackageVideoProductionMode(loaded.brief.package_video_mode) ===
    "text_to_video";
  const timestamp = (args.now ?? (() => new Date()))().toISOString();
  const mutation = commitCreativeReviewApprove({
    current: loaded.review,
    expectedVersion: args.expectedVersion,
    actor: args.actor,
    timestamp,
    requireSceneIntent: !isT2v,
  });
  if (!mutation.ok) {
    return mutationToWriteResult(mutation)!;
  }

  let brief = loaded.brief;
  if (isT2v) {
    const productionVo = productionSpokenVoiceoverFromReview(mutation.review);
    if (!productionVo) {
      return {
        ok: false,
        error:
          "Production-language voiceover must be current before Approve Package.",
        code: "translation_failed",
      };
    }
    const supabase = createSupabaseAdminClient();
    const memory = await buildAntiRepetitionMemory(supabase, args.projectId, {
      excludePackageId: args.packageId,
    });
    const priorFps = await loadRecentTextToVideoPlanFingerprints(
      supabase,
      args.projectId,
      args.packageId,
    );
    brief = applyProductionVoiceoverToTextToVideoBrief({
      brief,
      packageId: args.packageId,
      productionVoiceover: productionVo,
      memory,
      priorPlanFingerprints: priorFps,
      approvePlan: true,
      timestamp,
    });
    const plan = readTextToVideoCreativePlan(brief);
    if (!plan || plan.status !== "approved" || plan.repetition.status !== "passed") {
      return {
        ok: false,
        error:
          "Text-to-video plan could not be approved — repetition check did not pass.",
        code: "validation_failed",
      };
    }
  }

  const view = await persistCreativeReview({
    projectId: args.projectId,
    packageId: args.packageId,
    packageIndex: loaded.packageIndex,
    brief,
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

function unapproveReviewIfNeeded(args: {
  review: CreativeReview;
  actor: CreativeReviewActor;
  timestamp: string;
}): CreativeReview {
  if (!args.review.approved) return args.review;
  const mutation = commitCreativeReviewUnapprove({
    current: args.review,
    expectedVersion: args.review.version,
    actor: args.actor,
    timestamp: args.timestamp,
  });
  if (!mutation.ok) return args.review;
  return mutation.review;
}

export async function saveCreativeReviewVoiceDirection(args: {
  projectId: string;
  runId: string;
  packageId: string;
  voiceDirection: Omit<VoiceDirectionContract, "revision">;
  actor: CreativeReviewActor;
}): Promise<SaveCreativeReviewResult> {
  const loaded = await loadMutablePackageContext(args);
  if (!loaded.ok) return loaded.result;

  const current =
    readVoiceDirectionFromBrief(loaded.brief) ?? defaultVoiceDirectionContract();
  const next = bumpVoiceDirectionRevision(current, args.voiceDirection);
  const brief = invalidateAudioTimingOnVoiceDirectionChange(loaded.brief, next);
  const review = unapproveReviewIfNeeded({
    review: loaded.review,
    actor: args.actor,
    timestamp: new Date().toISOString(),
  });

  const view = await persistCreativeReview({
    projectId: args.projectId,
    packageId: args.packageId,
    packageIndex: loaded.packageIndex,
    brief,
    review,
  });
  return { ok: true, package: view };
}

export async function saveCreativeReviewTextToVideoScene(args: {
  projectId: string;
  runId: string;
  packageId: string;
  sceneId: string;
  humanVisualEdit: string;
  actor: CreativeReviewActor;
}): Promise<SaveCreativeReviewResult> {
  const loaded = await loadMutablePackageContext(args);
  if (!loaded.ok) return loaded.result;

  const plan = readTextToVideoCreativePlan(loaded.brief);
  if (!plan) {
    return {
      ok: false,
      error: "Text-to-video creative plan is missing.",
      code: "validation_failed",
    };
  }
  let nextPlan = applyHumanVisualEditToScene(
    plan,
    args.sceneId,
    args.humanVisualEdit,
  );
  const supabase = createSupabaseAdminClient();
  const memory = await buildAntiRepetitionMemory(supabase, args.projectId, {
    excludePackageId: args.packageId,
  });
  const priorFps = await loadRecentTextToVideoPlanFingerprints(
    supabase,
    args.projectId,
    args.packageId,
  );
  nextPlan = reevaluateTextToVideoPlanRepetition({
    plan: nextPlan,
    memory,
    priorPlanFingerprints: priorFps,
  });
  let brief = invalidateVisualPlanOnSceneEdit(loaded.brief);
  brief = {
    ...brief,
    video_text_to_video_creative_plan: serializeTextToVideoCreativePlan(nextPlan),
    video_paid_preflight: {
      ...(asRecord(brief.video_paid_preflight) ?? {}),
      similarity_check_status:
        nextPlan.repetition.status === "passed"
          ? "passed"
          : nextPlan.repetition.status === "blocked"
            ? "failed"
            : "not_run",
    },
  };
  const review = unapproveReviewIfNeeded({
    review: loaded.review,
    actor: args.actor,
    timestamp: new Date().toISOString(),
  });

  const view = await persistCreativeReview({
    projectId: args.projectId,
    packageId: args.packageId,
    packageIndex: loaded.packageIndex,
    brief,
    review,
  });
  return { ok: true, package: view };
}

export async function saveCreativeReviewTextToVideoSoundPlan(args: {
  projectId: string;
  runId: string;
  packageId: string;
  sceneId: string;
  sound: {
    mode: "auto" | "none" | "custom";
    custom_effect_description?: string;
    anchor?: string;
    voice_phrase?: string;
  };
  music?: {
    mode: "auto" | "none" | "existing_asset" | "eleven_generated";
    mood?: string;
  };
  actor: CreativeReviewActor;
}): Promise<SaveCreativeReviewResult> {
  const loaded = await loadMutablePackageContext(args);
  if (!loaded.ok) return loaded.result;
  const plan = readTextToVideoCreativePlan(loaded.brief);
  if (!plan) {
    return {
      ok: false,
      error: "Text-to-video creative plan is missing.",
      code: "validation_failed",
    };
  }
  const vo =
    productionSpokenVoiceoverFromReview(loaded.review) ??
    (typeof loaded.brief.voiceover_text === "string"
      ? loaded.brief.voiceover_text.trim()
      : "");
  const soundInput = {
    ...args.sound,
    mode: args.sound.mode === "auto" ? ("none" as const) : args.sound.mode,
  };
  const parsedScene = textToVideoSceneSoundSchema.safeParse(soundInput);
  if (!parsedScene.success) {
    return {
      ok: false,
      error: "Invalid scene sound settings.",
      code: "validation_failed",
    };
  }
  try {
    validateSceneSoundForApproval(parsedScene.data, vo);
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "sound_validation_failed",
      code: "validation_failed",
    };
  }
  let nextSound =
    parseTextToVideoSoundPlan(loaded.brief[VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY]) ??
    parseTextToVideoSoundPlan({})!;
  nextSound = {
    ...nextSound,
    scene_sound: {
      ...nextSound.scene_sound,
      [args.sceneId]: parsedScene.data,
    },
  };
  if (args.music) {
    const parsedMusic = textToVideoMusicPlanSchema.safeParse(args.music);
    if (!parsedMusic.success) {
      return {
        ok: false,
        error: "Invalid music settings.",
        code: "validation_failed",
      };
    }
    nextSound = { ...nextSound, music: parsedMusic.data };
  }
  let brief = invalidateAssemblyOnSoundPlanChange(loaded.brief);
  const currentPlan = readTextToVideoCreativePlan(brief);
  if (currentPlan && currentPlan.status === "approved") {
    brief = {
      ...brief,
      video_text_to_video_creative_plan: serializeTextToVideoCreativePlan({
        ...currentPlan,
        status: "draft",
      }),
    };
  }
  brief = {
    ...brief,
    [VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY]: bumpSoundPlanRevision(nextSound),
  };
  const review = unapproveReviewIfNeeded({
    review: loaded.review,
    actor: args.actor,
    timestamp: new Date().toISOString(),
  });
  const view = await persistCreativeReview({
    projectId: args.projectId,
    packageId: args.packageId,
    packageIndex: loaded.packageIndex,
    brief,
    review,
  });
  return { ok: true, package: view };
}

export { VOICE_DIRECTION_STYLE_LABELS };
