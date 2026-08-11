/**
 * Creative Review Rebuild Engine (Phase 6).
 *
 * Bridges Manual Review (Scene Creative Intent + Director Notes + final_approved
 * voiceover) into video-only package fields that the EXISTING buildVideoJobInput
 * / worker path already understands.
 *
 * Isolated from UI and Continue orchestration logic. Deterministic — no LLM,
 * no second pipeline, no worker changes. Visual Identity / Opening Impact /
 * Video Concept are frozen anchors, never replaced.
 */

import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { ValidationIssue, ValidationResult } from "@/lib/ai/validateAiOutput";
import { normalizeImagePrompts } from "@/lib/ai/workflows/packageShared";
import { alignOpeningVoiceover } from "@/lib/content-pipeline/alignOpeningVoiceover";
import { extractPriorPipelineArtifacts } from "@/lib/content-pipeline/regeneration";
import type {
  OpeningImpact,
  VideoConcept,
  VisualIdentity,
} from "@/lib/content-pipeline/types";
import { visualIdentityPromptBlock } from "@/lib/content-pipeline/visualIdentity";
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
  voiceoverAligned: boolean;
  openingPrepended: boolean;
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

function videoConceptAnchorBlock(concept: VideoConcept): string {
  return [
    "VIDEO CONCEPT (frozen anchor — do not invent a new concept):",
    `- title: ${concept.title}`,
    `- core_idea: ${concept.core_idea}`,
    `- emotional_tone: ${concept.emotional_tone}`,
    `- narrative_arc: ${concept.narrative_arc}`,
  ]
    .filter((line) => !line.endsWith(": "))
    .join("\n");
}

function continuityGuardBlock(): string {
  return [
    "VISUAL CONSISTENCY (mandatory):",
    "- Preserve the same environment, people, business, lighting, colors, camera style, and atmosphere.",
    "- Preserve narrative continuity with neighboring scenes.",
    "- Never replace or weaken Visual Identity.",
    "- Photoreal marketing still; no readable on-image text unless the scene type requires UI chrome.",
  ].join("\n");
}

/**
 * Compose a new internal AI image prompt from Creative Review + frozen anchors.
 * Deterministic. Never exposed to the editor UI.
 */
export function composeRebuiltImagePrompt(args: {
  sceneIndex: number;
  intentDescription: string;
  directorNotes: string;
  presentationType: string | null;
  anchors: CreativeRebuildAnchors;
  /** True for the package's first AI/generated IMAGE still (Opening Impact). */
  isOpeningStill: boolean;
  maxLength?: number;
}): string {
  const intent = args.intentDescription.trim();
  const notes = args.directorNotes.trim();
  const typeLabel = args.presentationType?.trim() || "IMAGE";
  const lines: string[] = [];

  if (args.isOpeningStill) {
    lines.push(
      "OPENING IMPACT (authoritative cold open — lead with this first_image):",
      args.anchors.openingImpact.first_image.trim(),
      `opening_emotion: ${args.anchors.openingImpact.emotion.trim()}`,
      `pacing: ${args.anchors.openingImpact.pacing.trim()}`,
    );
  }

  lines.push(visualIdentityPromptBlock(args.anchors.visualIdentity));
  lines.push(videoConceptAnchorBlock(args.anchors.videoConcept));
  lines.push(continuityGuardBlock());
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

  let prompt = lines.filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const max = args.maxLength;
  if (typeof max === "number" && max > 0 && prompt.length > max) {
    // Prefer keeping Opening Impact + Identity heads when truncating.
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
  isOpeningStill: boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!prompt.trim()) {
    issues.push({ path, message: "rebuilt image_prompt is empty" });
    return issues;
  }
  // Visual Identity must remain present (never weakened away).
  if (!prompt.includes(anchors.visualIdentity.art_direction.trim())) {
    issues.push({
      path,
      message: "rebuilt image_prompt missing Visual Identity art_direction",
    });
  }
  if (
    isOpeningStill &&
    !prompt.includes(anchors.openingImpact.first_image.trim())
  ) {
    issues.push({
      path,
      message: "opening scene rebuilt image_prompt missing Opening Impact first_image",
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
  isOpeningStill: boolean,
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

  const prompt = composeRebuiltImagePrompt({
    sceneIndex,
    intentDescription: reviewScene.intent.description,
    directorNotes: reviewScene.director_notes,
    presentationType: "PHONE",
    anchors,
    isOpeningStill,
    maxLength: PHONE_PROMPT_MAX,
  });
  const issues = validateRebuiltAiPrompt(
    prompt,
    `$.visual_scenes[${sceneIndex}].payload.image_prompt`,
    anchors,
    isOpeningStill,
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

function rebuildTypedScene(
  entry: PackageVisualSceneEntry,
  reviewScene: CreativeReviewScene,
  sceneIndex: number,
  anchors: CreativeRebuildAnchors,
  isOpeningStill: boolean,
): { scene: PackageVisualSceneEntry; promptRebuilt: boolean; issues: ValidationIssue[] } {
  if (isPhoneVisualSceneEntry(entry)) {
    return rebuildPhoneScene(
      entry,
      reviewScene,
      sceneIndex,
      anchors,
      isOpeningStill,
    );
  }
  // CHECKLIST / QUOTE / STATISTIC / CTA — preserve payload semantics entirely.
  void reviewScene;
  if (
    isChecklistVisualSceneEntry(entry) ||
    isQuoteVisualSceneEntry(entry) ||
    isStatisticVisualSceneEntry(entry) ||
    isCtaVisualSceneEntry(entry)
  ) {
    return { scene: structuredClone(entry), promptRebuilt: false, issues: [] };
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
  let openingStillAssigned = false;

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
      if (!reviewScene.intent.description.trim()) {
        issues.push({
          path: `$.creative_review.scenes[${i}].intent.description`,
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
        const isOpeningStill =
          !openingStillAssigned &&
          isPhoneVisualSceneEntry(entry) &&
          Boolean(entry.payload.image_prompt?.trim());
        const rebuilt = rebuildTypedScene(
          entry,
          reviewScene,
          i,
          anchors,
          isOpeningStill,
        );
        issues.push(...rebuilt.issues);
        nextScenes.push(rebuilt.scene);
        scenesRebuilt += 1;
        if (rebuilt.promptRebuilt) {
          promptsRebuilt += 1;
          if (isOpeningStill) openingStillAssigned = true;
          runtimeLog("info", {
            event: "creative_rebuild_prompt",
            package_id: args.packageId ?? null,
            detail: `scene=${i} typed_phone`,
          });
        }
        continue;
      }

      if (entry.source === "asset") {
        // Never convert assets into AI scenes.
        nextScenes.push(rebuildAssetScene(entry, reviewScene));
        scenesRebuilt += 1;
        continue;
      }

      if (entry.source === "ai") {
        const isOpeningStill = !openingStillAssigned;
        const prompt = composeRebuiltImagePrompt({
          sceneIndex: i,
          intentDescription: reviewScene.intent.description,
          directorNotes: reviewScene.director_notes,
          presentationType: reviewScene.intent.presentation_type,
          anchors,
          isOpeningStill,
        });
        issues.push(
          ...validateRebuiltAiPrompt(
            prompt,
            `$.visual_scenes[${i}].image_prompt`,
            anchors,
            isOpeningStill,
          ),
        );
        const aiScene: VisualSceneAi = { source: "ai", image_prompt: prompt };
        nextScenes.push(aiScene);
        scenesRebuilt += 1;
        promptsRebuilt += 1;
        if (isOpeningStill) openingStillAssigned = true;
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
      const isOpeningStill = i === 0;
      const prompt = composeRebuiltImagePrompt({
        sceneIndex: scene.index,
        intentDescription: scene.intent.description,
        directorNotes: scene.director_notes,
        presentationType: scene.intent.presentation_type,
        anchors,
        isOpeningStill,
      });
      issues.push(
        ...validateRebuiltAiPrompt(
          prompt,
          `$.image_prompts[${i}]`,
          anchors,
          isOpeningStill,
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

  // Voiceover: final_approved → align with Opening Impact first spoken sentence.
  const aligned = alignOpeningVoiceover({
    opening: anchors.openingImpact.first_spoken_sentence,
    voiceover: finalApproved,
  });
  pkg.voiceover_text = aligned.voiceover_text;
  if (aligned.hook) {
    pkg.hook = aligned.hook;
  }
  pkg.subtitles = aligned.voiceover_text;

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
      voiceover_aligned: true,
      opening_prepended: aligned.prepended,
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
      voiceoverAligned: true,
      openingPrepended: aligned.prepended,
    },
  };
}
