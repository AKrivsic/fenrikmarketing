/**
 * Creative Review Rebuild Engine (Phase 6 + Phase 8 source-of-truth).
 *
 * Bridges Manual Review (Scene Creative Intent + Director Notes + final_approved
 * voiceover) into video-only package fields that the EXISTING buildVideoJobInput
 * / worker path already understands.
 *
 * Isolated from UI and Continue orchestration logic. Deterministic — no LLM,
 * no second pipeline, no worker changes.
 *
 * After Continue Generation, creative_review is the only narrative source.
 * Image prompts use verified english_preview (Creative Intent).
 * TTS uses voiceover.final_approved (localized).
 * Spoken package fields (voiceover_text, subtitles, hook, video.script) are
 * synchronized from final_approved at rebuild.
 * Opening Impact / Video Concept / original AI artifacts are historical.
 * They must never overwrite editor decisions (spoken text, hook, story).
 * Visual Identity may constrain appearance only.
 *
 * Compatibility kept: resolveAnchors still requires persisted Opening Impact
 * and Video Concept objects (old packages). confirm_translation history events
 * remain valid. image_prompts is a derived projection of visual_scenes.
 */

import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { ValidationIssue, ValidationResult } from "@/lib/ai/validateAiOutput";
import { normalizeImagePrompts } from "@/lib/ai/workflows/packageShared";
import { extractPriorPipelineArtifacts } from "@/lib/content-pipeline/regeneration";
import type {
  OpeningImpact,
  VideoConcept,
  VisualIdentity,
} from "@/lib/content-pipeline/types";
import {
  isCtaVisualSceneEntry,
  isChecklistVisualSceneEntry,
  isPhoneVisualSceneEntry,
  isQuoteVisualSceneEntry,
  isStatisticVisualSceneEntry,
  isTypedNonImageVisualSceneEntry,
  type PackageVisualSceneEntry,
  type VisualScenePhoneStored,
} from "@/lib/content-package/generatedVisualScene";
import {
  syncLegacyFieldsFromVisualScenes,
  type VisualSceneAi,
  type VisualSceneAsset,
} from "@/lib/content-package/visualScenePlan";
import {
  appendCreativeReviewHistory,
  cloneScenes,
  cloneVoiceover,
  isEnglishPreviewCurrent,
} from "@/lib/creative-review/lifecycle";
import type {
  CreativeReview,
  CreativeReviewActor,
  CreativeReviewScene,
} from "@/lib/creative-review/types";
import { assertCreativeReview } from "@/lib/creative-review/validate";
import { runtimeLog } from "@/lib/production-runtime/runtimeLog";

const PHONE_PROMPT_MAX = 500;

export interface CreativeRebuildAnchors {
  visualIdentity: VisualIdentity;
  openingImpact: OpeningImpact;
  videoConcept: VideoConcept;
}

export interface CreativeRebuildResult {
  package: ContentPackageOutput;
  creativeReview: CreativeReview;
  scenesRebuilt: number;
  promptsRebuilt: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function clonePackage(pkg: ContentPackageOutput): ContentPackageOutput {
  return structuredClone(pkg);
}

function resolveReviewScene(
  review: CreativeReview,
  index: number,
): CreativeReviewScene | null {
  const byIndex = review.scenes.find((scene) => scene.index === index);
  if (byIndex) return byIndex;
  return review.scenes[index] ?? null;
}

/**
 * Visual Identity for rebuild: appearance constraints only.
 * Never include opening_emotion / opening_first_image (those echo original
 * Opening Impact narrative / first_image and would restore the original story).
 */
function visualIdentityAppearanceBlock(identity: VisualIdentity): string {
  return [
    "VISUAL IDENTITY (appearance constraints only — do not restore original story):",
    `- character_style: ${identity.character_style}`,
    `- camera_style: ${identity.camera_style}`,
    `- lighting: ${identity.lighting}`,
    `- environment: ${identity.environment}`,
    `- palette: ${identity.palette}`,
    `- art_direction: ${identity.art_direction}`,
  ].join("\n");
}

function continuityGuardBlock(): string {
  return [
    "VISUAL CONSISTENCY (mandatory):",
    "- Preserve the same character, appearance, clothing, and visual style across scenes.",
    "- Preserve camera, framing, lens, lighting, environment, and realism continuity.",
    "- Do not restore the original story, hook, or spoken text.",
    "- Photoreal marketing still; no readable on-image text unless the scene type requires UI chrome.",
  ].join("\n");
}

function hookFromFinalApproved(finalApproved: string): string {
  const line = finalApproved.split(/\r?\n/)[0]?.trim() ?? "";
  return line;
}

/**
 * Image-prompt inputs from Creative Review.
 *
 * Creative Intent: verified english_preview (same approved content as
 * localized_edit). Never re-translate. Never use localized_edit.
 *
 * Director Notes: no English field exists on CreativeReviewScene. Empty notes
 * are omitted. Non-empty notes fail closed — do not inject Czech, do not
 * invent a translation.
 */
function resolveImagePromptReviewText(
  scene: CreativeReviewScene,
  path: string,
): ValidationResult<{ intentDescription: string; directorNotes: string }> {
  const issues: ValidationIssue[] = [];
  if (!scene.intent.localized_edit.trim()) {
    issues.push({
      path: `${path}.intent.localized_edit`,
      message: "Creative Intent is required for rebuild",
    });
  }
  if (
    !isEnglishPreviewCurrent({
      english_preview: scene.intent.english_preview,
      english_preview_outdated: scene.intent.english_preview_outdated,
    })
  ) {
    issues.push({
      path: `${path}.intent.english_preview`,
      message:
        "verified english_preview is required for image rebuild — do not use localized_edit",
    });
  }
  if (scene.director_notes.trim()) {
    issues.push({
      path: `${path}.director_notes`,
      message:
        "director_notes has no verified English equivalent; cannot inject localized Director Notes into image generation",
    });
  }
  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: {
      intentDescription: scene.intent.english_preview!.trim(),
      directorNotes: "",
    },
  };
}

/**
 * Compose a new internal AI image prompt from Creative Review.
 *
 * Narrative source of truth for images: verified English Creative Intent
 * (intent.english_preview). Director Notes are omitted unless empty.
 * Visual Identity constrains appearance only.
 * Opening Impact / Video Concept are historical — never injected as spoken
 * text, hook, core_idea, narrative_arc, audience insight, or messaging.
 * Deterministic. Never exposed to the editor UI.
 */
export function composeRebuiltImagePrompt(args: {
  sceneIndex: number;
  intentDescription: string;
  directorNotes: string;
  presentationType: string | null;
  anchors: CreativeRebuildAnchors;
  maxLength?: number;
}): string {
  const intent = args.intentDescription.trim();
  const notes = args.directorNotes.trim();
  const typeLabel = args.presentationType?.trim() || "IMAGE";
  const lines: string[] = [];

  // Creative Intent is the primary scene description.
  lines.push(
    `SCENE ${args.sceneIndex + 1} (${typeLabel}) — CREATIVE INTENT:`,
    intent,
  );
  if (notes) {
    lines.push(
      "DIRECTOR NOTES (presentation / composition / framing only):",
      notes,
    );
  }
  lines.push(visualIdentityAppearanceBlock(args.anchors.visualIdentity));
  lines.push(continuityGuardBlock());

  let prompt = lines.filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const max = args.maxLength;
  if (typeof max === "number" && max > 0 && prompt.length > max) {
    // Prefer keeping Creative Intent (+ Director Notes) when truncating.
    prompt = `${prompt.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
  }
  return prompt;
}

function resolveAnchors(
  pkg: ContentPackageOutput,
): ValidationResult<CreativeRebuildAnchors> {
  const prior = extractPriorPipelineArtifacts(pkg);
  const issues: ValidationIssue[] = [];
  if (!prior.visual_identity) {
    issues.push({
      path: "$.presentation_generation.visual_identity",
      message: "Visual Identity is required for creative rebuild",
    });
  }
  if (!prior.opening_impact) {
    issues.push({
      path: "$.presentation_generation.opening_impact",
      message: "Opening Impact is required for creative rebuild",
    });
  }
  if (!prior.video_concept) {
    issues.push({
      path: "$.presentation_generation.video_concept",
      message: "Video Concept is required for creative rebuild",
    });
  }
  if (issues.length > 0 || !prior.visual_identity || !prior.opening_impact || !prior.video_concept) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    value: {
      visualIdentity: prior.visual_identity,
      openingImpact: prior.opening_impact,
      videoConcept: prior.video_concept,
    },
  };
}

function validateSceneCount(
  pkg: ContentPackageOutput,
  review: CreativeReview,
): ValidationIssue[] {
  const scenes = pkg.visual_scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    // Legacy image_prompts-only packages: rebuild from review-generated intents.
    const legacy = pkg.image_prompts ?? [];
    if (legacy.length === 0 && review.scenes.length === 0) {
      return [];
    }
    if (review.scenes.length === 0) {
      return [
        {
          path: "$.creative_review.scenes",
          message: "creative review has no scenes to rebuild against",
        },
      ];
    }
    return [];
  }
  if (review.scenes.length !== scenes.length) {
    return [
      {
        path: "$.creative_review.scenes",
        message: `scene count mismatch: package has ${scenes.length}, creative_review has ${review.scenes.length}`,
      },
    ];
  }
  return [];
}

function validateRebuiltAiPrompt(
  prompt: string,
  path: string,
  anchors: CreativeRebuildAnchors,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!prompt.trim()) {
    issues.push({ path, message: "rebuilt image_prompt is empty" });
    return issues;
  }
  // Visual Identity appearance must remain present (never weakened away).
  if (!prompt.includes(anchors.visualIdentity.art_direction.trim())) {
    issues.push({
      path,
      message: "rebuilt image_prompt missing Visual Identity art_direction",
    });
  }
  return issues;
}

function rebuildAssetScene(
  entry: VisualSceneAsset,
  reviewScene: CreativeReviewScene,
): VisualSceneAsset {
  const notes = reviewScene.director_notes.trim();
  const next: VisualSceneAsset = {
    source: "asset",
    asset_id: entry.asset_id,
    used_as: entry.used_as,
  };
  if (entry.video_usage) next.video_usage = entry.video_usage;
  // Director notes may only influence presentation / composition / framing.
  if (notes) {
    next.modify = notes;
  } else if (entry.modify) {
    next.modify = entry.modify;
  }
  return next;
}

function rebuildPhoneScene(
  entry: VisualScenePhoneStored,
  reviewScene: CreativeReviewScene,
  sceneIndex: number,
  anchors: CreativeRebuildAnchors,
): { scene: VisualScenePhoneStored; promptRebuilt: boolean; issues: ValidationIssue[] } {
  const payload = { ...entry.payload };
  // Asset-bound phone screens stay assets — never convert to AI.
  if (payload.asset_id?.trim()) {
    return {
      scene: { ...entry, payload },
      promptRebuilt: false,
      issues: [],
    };
  }
  if (!payload.image_prompt?.trim()) {
    return {
      scene: { ...entry, payload },
      promptRebuilt: false,
      issues: [
        {
          path: `$.visual_scenes[${sceneIndex}].payload`,
          message: "PHONE scene missing asset_id and image_prompt",
        },
      ],
    };
  }

  const resolved = resolveImagePromptReviewText(
    reviewScene,
    `$.creative_review.scenes[${sceneIndex}]`,
  );
  if (!resolved.ok) {
    return {
      scene: { ...entry, payload },
      promptRebuilt: false,
      issues: resolved.issues,
    };
  }

  const prompt = composeRebuiltImagePrompt({
    sceneIndex,
    intentDescription: resolved.value.intentDescription,
    directorNotes: resolved.value.directorNotes,
    presentationType: "PHONE",
    anchors,
    maxLength: PHONE_PROMPT_MAX,
  });
  const issues = validateRebuiltAiPrompt(
    prompt,
    `$.visual_scenes[${sceneIndex}].payload.image_prompt`,
    anchors,
  );
  return {
    scene: {
      ...entry,
      payload: {
        ...payload,
        image_prompt: prompt,
      },
    },
    promptRebuilt: true,
    issues,
  };
}

/**
 * Typed overlay rebuild policy (CHECKLIST / QUOTE / STATISTIC / CTA):
 *
 * These scenes are rendered from structured payloads (titles, quote text,
 * statistic values, CTA copy). They have no AI image_prompt for Intent to
 * rewrite. Changing payload fields from free-form Creative Intent would risk
 * destroying validated overlay semantics.
 *
 * Therefore:
 * - Payload is preserved (cloned) on Continue.
 * - PHONE with image_prompt still rebuilds from Intent (see rebuildPhoneScene).
 * - Editorial Intent + Director Notes are stamped onto presentation_generation
 *   so edits are not silently discarded — they remain auditable, but do not
 *   mutate typed payload pixels.
 */
export interface TypedSceneEditorialStamp {
  scene_index: number;
  scene_id: string;
  presentation_type: string | null;
  localized_intent: string;
  director_notes: string;
  reason:
    | "typed_overlay_payload_preserved"
    | "phone_asset_payload_preserved"
    | "asset_binding_preserved";
}

function rebuildTypedScene(
  entry: PackageVisualSceneEntry,
  reviewScene: CreativeReviewScene,
  sceneIndex: number,
  anchors: CreativeRebuildAnchors,
): {
  scene: PackageVisualSceneEntry;
  promptRebuilt: boolean;
  issues: ValidationIssue[];
  editorialStamp?: TypedSceneEditorialStamp;
} {
  if (isPhoneVisualSceneEntry(entry)) {
    const rebuilt = rebuildPhoneScene(
      entry,
      reviewScene,
      sceneIndex,
      anchors,
    );
    if (!rebuilt.promptRebuilt && entry.payload.asset_id?.trim()) {
      return {
        ...rebuilt,
        editorialStamp: {
          scene_index: sceneIndex,
          scene_id: reviewScene.id,
          presentation_type: "PHONE",
          localized_intent: reviewScene.intent.localized_edit.trim(),
          director_notes: reviewScene.director_notes.trim(),
          reason: "phone_asset_payload_preserved",
        },
      };
    }
    return rebuilt;
  }
  if (
    isChecklistVisualSceneEntry(entry) ||
    isQuoteVisualSceneEntry(entry) ||
    isStatisticVisualSceneEntry(entry) ||
    isCtaVisualSceneEntry(entry)
  ) {
    const type =
      isChecklistVisualSceneEntry(entry)
        ? "CHECKLIST"
        : isQuoteVisualSceneEntry(entry)
          ? "QUOTE"
          : isStatisticVisualSceneEntry(entry)
            ? "STATISTIC"
            : "CTA";
    runtimeLog("info", {
      event: "creative_rebuild_scene",
      detail: `scene=${sceneIndex} typed_overlay_preserved type=${type}`,
    });
    return {
      scene: structuredClone(entry),
      promptRebuilt: false,
      issues: [],
      editorialStamp: {
        scene_index: sceneIndex,
        scene_id: reviewScene.id,
        presentation_type: type,
        localized_intent: reviewScene.intent.localized_edit.trim(),
        director_notes: reviewScene.director_notes.trim(),
        reason: "typed_overlay_payload_preserved",
      },
    };
  }
  return {
    scene: structuredClone(entry),
    promptRebuilt: false,
    issues: [
      {
        path: `$.visual_scenes[${sceneIndex}]`,
        message: "unknown typed scene during creative rebuild",
      },
    ],
  };
}

/**
 * Rebuild video-specific package fields from an approved Creative Review.
 * Does not touch platform copy / strategy / product brain.
 */
export function rebuildCreativePackageForVideo(args: {
  package: ContentPackageOutput;
  creativeReview: CreativeReview;
  actor: CreativeReviewActor;
  timestamp: string;
  packageId?: string;
  projectId?: string;
  productionRunId?: string;
}): ValidationResult<CreativeRebuildResult> {
  const { creativeReview: review, actor, timestamp } = args;

  runtimeLog("info", {
    event: "creative_rebuild_started",
    package_id: args.packageId ?? null,
    project_id: args.projectId ?? null,
    production_run_id: args.productionRunId ?? null,
  });

  if (!review.approved || review.status !== "approved") {
    const issues = [
      {
        path: "$.creative_review.approved",
        message: "package must be approved before creative rebuild",
      },
    ];
    runtimeLog("error", {
      event: "creative_rebuild_failed",
      package_id: args.packageId ?? null,
      outcome: "not_approved",
    });
    return { ok: false, issues };
  }

  const finalApproved = review.voiceover.final_approved.trim();
  if (!finalApproved) {
    return {
      ok: false,
      issues: [
        {
          path: "$.creative_review.voiceover.final_approved",
          message: "final_approved voiceover is required for creative rebuild",
        },
      ],
    };
  }
  if (!review.voiceover.english_confirmed) {
    return {
      ok: false,
      issues: [
        {
          path: "$.creative_review.voiceover.english_confirmed",
          message: "english translation must be confirmed before creative rebuild",
        },
      ],
    };
  }

  const anchorsResult = resolveAnchors(args.package);
  if (!anchorsResult.ok) {
    runtimeLog("error", {
      event: "creative_rebuild_failed",
      package_id: args.packageId ?? null,
      outcome: "missing_anchors",
    });
    return anchorsResult;
  }
  const anchors = anchorsResult.value;

  const countIssues = validateSceneCount(args.package, review);
  if (countIssues.length > 0) {
    return { ok: false, issues: countIssues };
  }

  const pkg = clonePackage(args.package);
  const issues: ValidationIssue[] = [];
  let scenesRebuilt = 0;
  let promptsRebuilt = 0;
  const typedEditorialStamps: TypedSceneEditorialStamp[] = [];

  const visualScenes = Array.isArray(pkg.visual_scenes)
    ? ([...pkg.visual_scenes] as PackageVisualSceneEntry[])
    : null;

  if (visualScenes && visualScenes.length > 0) {
    const nextScenes: PackageVisualSceneEntry[] = [];
    for (let i = 0; i < visualScenes.length; i += 1) {
      const entry = visualScenes[i]!;
      const reviewScene = resolveReviewScene(review, i);
      if (!reviewScene) {
        issues.push({
          path: `$.creative_review.scenes[${i}]`,
          message: "missing creative review scene for package visual scene",
        });
        continue;
      }
      if (!reviewScene.intent.localized_edit.trim()) {
        issues.push({
          path: `$.creative_review.scenes[${i}].intent.localized_edit`,
          message: "Creative Intent is required for rebuild",
        });
        continue;
      }

      runtimeLog("info", {
        event: "creative_rebuild_scene",
        package_id: args.packageId ?? null,
        detail: `scene=${i} source=${reviewScene.intent.visual_source}`,
      });

      if (isTypedNonImageVisualSceneEntry(entry)) {
        const rebuilt = rebuildTypedScene(
          entry,
          reviewScene,
          i,
          anchors,
        );
        issues.push(...rebuilt.issues);
        nextScenes.push(rebuilt.scene);
        scenesRebuilt += 1;
        if (rebuilt.editorialStamp) {
          typedEditorialStamps.push(rebuilt.editorialStamp);
        }
        if (rebuilt.promptRebuilt) {
          promptsRebuilt += 1;
          runtimeLog("info", {
            event: "creative_rebuild_prompt",
            package_id: args.packageId ?? null,
            detail: `scene=${i} typed_phone`,
          });
        }
        continue;
      }

      if (entry.source === "asset") {
        // Never convert assets into AI scenes. Director notes → modify.
        // Creative Intent remains editorial (assets have no image_prompt to rebuild).
        nextScenes.push(rebuildAssetScene(entry, reviewScene));
        scenesRebuilt += 1;
        typedEditorialStamps.push({
          scene_index: i,
          scene_id: reviewScene.id,
          presentation_type: reviewScene.intent.presentation_type,
          localized_intent: reviewScene.intent.localized_edit.trim(),
          director_notes: reviewScene.director_notes.trim(),
          reason: "asset_binding_preserved",
        });
        continue;
      }

      if (entry.source === "ai") {
        const resolved = resolveImagePromptReviewText(
          reviewScene,
          `$.creative_review.scenes[${i}]`,
        );
        if (!resolved.ok) {
          issues.push(...resolved.issues);
          continue;
        }
        const prompt = composeRebuiltImagePrompt({
          sceneIndex: i,
          intentDescription: resolved.value.intentDescription,
          directorNotes: resolved.value.directorNotes,
          presentationType: reviewScene.intent.presentation_type,
          anchors,
        });
        issues.push(
          ...validateRebuiltAiPrompt(
            prompt,
            `$.visual_scenes[${i}].image_prompt`,
            anchors,
          ),
        );
        const aiScene: VisualSceneAi = { source: "ai", image_prompt: prompt };
        nextScenes.push(aiScene);
        scenesRebuilt += 1;
        promptsRebuilt += 1;
        runtimeLog("info", {
          event: "creative_rebuild_prompt",
          package_id: args.packageId ?? null,
          detail: `scene=${i} ai`,
        });
        continue;
      }

      issues.push({
        path: `$.visual_scenes[${i}]`,
        message: "unsupported visual scene shape during creative rebuild",
      });
    }

    if (issues.length > 0) {
      runtimeLog("error", {
        event: "creative_rebuild_failed",
        package_id: args.packageId ?? null,
        outcome: "validation_failed",
        detail: `${issues.length} issues`,
      });
      return { ok: false, issues };
    }

    pkg.visual_scenes = nextScenes as ContentPackageOutput["visual_scenes"];
    syncLegacyFieldsFromVisualScenes(pkg);
    normalizeImagePrompts(pkg, {
      package_id: args.packageId ?? null,
      creative_rebuild: true,
    });
  } else {
    // Legacy: rebuild image_prompts from generated review scenes only.
    const generated = review.scenes.filter(
      (scene) => scene.intent.visual_source === "generated",
    );
    const prompts: string[] = [];
    for (let i = 0; i < generated.length; i += 1) {
      const scene = generated[i]!;
      const resolved = resolveImagePromptReviewText(
        scene,
        `$.creative_review.scenes[${scene.index}]`,
      );
      if (!resolved.ok) {
        issues.push(...resolved.issues);
        continue;
      }
      const prompt = composeRebuiltImagePrompt({
        sceneIndex: scene.index,
        intentDescription: resolved.value.intentDescription,
        directorNotes: resolved.value.directorNotes,
        presentationType: scene.intent.presentation_type,
        anchors,
      });
      issues.push(
        ...validateRebuiltAiPrompt(
          prompt,
          `$.image_prompts[${i}]`,
          anchors,
        ),
      );
      prompts.push(prompt);
      promptsRebuilt += 1;
      scenesRebuilt += 1;
    }
    if (issues.length > 0) {
      runtimeLog("error", {
        event: "creative_rebuild_failed",
        package_id: args.packageId ?? null,
        outcome: "validation_failed",
      });
      return { ok: false, issues };
    }
    pkg.image_prompts = prompts;
    normalizeImagePrompts(pkg, {
      package_id: args.packageId ?? null,
      creative_rebuild: true,
    });
  }

  // Spoken source of truth after rebuild: creative_review.voiceover.final_approved.
  // Synchronize every package spoken field so Generate-era English does not remain.
  pkg.voiceover_text = finalApproved;
  pkg.subtitles = finalApproved;
  const reviewHook = hookFromFinalApproved(finalApproved);
  if (reviewHook) {
    pkg.hook = reviewHook;
  }
  if (pkg.video && typeof pkg.video === "object") {
    pkg.video = {
      ...pkg.video,
      script: finalApproved,
    };
  }

  // History — creative_rebuild_completed with voiceover + scene snapshots.
  let nextReview = review;
  const last = review.history[review.history.length - 1];
  if (last?.event !== "creative_rebuild_completed") {
    // Snapshot post-rebuild review state (intent/notes unchanged; voiceover lanes intact).
    nextReview = appendCreativeReviewHistory({
      review: {
        ...review,
        voiceover: cloneVoiceover(review.voiceover),
        scenes: cloneScenes(review.scenes),
      },
      event: "creative_rebuild_completed",
      actor,
      timestamp,
    });
    try {
      assertCreativeReview(nextReview);
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid creative_review history";
      runtimeLog("error", {
        event: "creative_rebuild_failed",
        package_id: args.packageId ?? null,
        outcome: "history_invalid",
        detail: message,
      });
      return {
        ok: false,
        issues: [{ path: "$.creative_review.history", message }],
      };
    }
  }

  // Stamp rebuild metadata on presentation_generation without dropping anchors.
  const pg = asRecord(pkg.presentation_generation) ?? {};
  pkg.presentation_generation = {
    ...pg,
    creative_rebuild: {
      completed_at: timestamp,
      actor_id: actor.id,
      scenes_rebuilt: scenesRebuilt,
      prompts_rebuilt: promptsRebuilt,
      typed_overlay_editorial: typedEditorialStamps,
      typed_overlay_policy:
        "CHECKLIST/QUOTE/STATISTIC/CTA payloads are preserved; Creative Intent is stamped for audit because those overlays have no image_prompt to rebuild without destroying validated semantics.",
    },
  };

  runtimeLog("info", {
    event: "creative_rebuild_completed",
    package_id: args.packageId ?? null,
    project_id: args.projectId ?? null,
    production_run_id: args.productionRunId ?? null,
    detail: `scenes=${scenesRebuilt} prompts=${promptsRebuilt}`,
  });

  return {
    ok: true,
    value: {
      package: pkg,
      creativeReview: nextReview,
      scenesRebuilt,
      promptsRebuilt,
    },
  };
}
