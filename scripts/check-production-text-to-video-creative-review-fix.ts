/**
 * Creative Review T2V operator-path fix — offline checks.
 * Run: npx tsx scripts/check-production-text-to-video-creative-review-fix.ts
 *
 * No OpenAI / Claude / ElevenLabs / Runway network calls.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validatePackagesReadyForContinue } from "../lib/ai/workflows/continueCreativeReviewGeneration";
import {
  applyCreativeReviewEdits,
} from "../lib/creative-review/applyEdits";
import { seedCreativeReviewFromPackage } from "../lib/creative-review/seed";
import {
  commitCreativeReviewApprove,
  commitCreativeReviewTranslate,
} from "../lib/creative-review/mutations";
import { validateCreativeReviewApproval } from "../lib/creative-review/lifecycle";
import {
  editorWorkingCopyMustNotBeProductionVoiceover,
  productionSpokenVoiceoverFromReview,
} from "../lib/creative-review/productionSpokenVoiceover";
import type { CreativeReview } from "../lib/creative-review/types";
import {
  applyRepetitionResultToPlan,
  buildTextToVideoCreativePlan,
  checkTextToVideoRepetition,
  deriveHookFromVoiceover,
  readTextToVideoCreativePlan,
  serializeTextToVideoCreativePlan,
} from "../lib/content-package/textToVideoCreativePlan";
import { EMPTY_MEMORY } from "../lib/ai/workflows/antiRepetitionMemory";
import { buildTextToVideoRenderPlanFromCanonical } from "../lib/content-package/textToVideoRenderAdapter";
import {
  assertTextToVideoPlanLockedForContinue,
  lockApprovedCanonicalTextToVideoPlan,
  coerceOperatorSoundPlanToExplicitNone,
  snapshotTextToVideoPlanForContinueGuard,
  textToVideoOperatorApprovalState,
  textToVideoPlanSnapshotEquals,
  T2V_PLAN_NOT_LOCKED_FOR_CONTINUE,
  T2V_PRODUCTION_TRANSLATION_MISSING,
} from "../lib/content-package/textToVideoManualReview";
import { VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY } from "../lib/content-package/textToVideoSoundPlan";
import { estimateTextToVideoOperatorBudget } from "../lib/text-to-video/textToVideoOperatorBudget";
import { estimateRunwayGen45SceneCostUsd } from "../lib/text-to-video/runwayProductionConfig";
import { buildTextToVideoRunwayExecutionPlan } from "../lib/text-to-video/runwayExecutionPlan";
import { applyAlignmentMeasuredTimingToPlan } from "../lib/text-to-video/measuredSceneTiming";
import { executeTextToVideoRunwayPlan } from "../lib/text-to-video/textToVideoRunwayExecutor";
import { resolveSfxPlacements } from "../lib/text-to-video/textToVideoSfxAnchoring";

const root = join(import.meta.dirname, "..");
const ACTOR = { type: "user" as const, id: "editor-1" };
const CS_WORKING =
  "Odpověď, která nikdy nepřišla, mění celý vztah. Počkejte na ticho. Pak se rozhodněte.";
const EN_PRODUCTION =
  "The reply that never came changes the whole relationship. Wait for the silence. Then decide.";
const PACKAGE_ID = "a38b2fa0-9634-4d4f-b750-05308b019bee";

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`  ✓ ${name}`))
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      throw err;
    });
}

function alignmentFor(text: string, totalSeconds: number) {
  const chars = text.split("");
  const step = totalSeconds / Math.max(chars.length, 1);
  return {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => i * step),
    character_end_times_seconds: chars.map((_, i) => (i + 1) * step),
  };
}

function translatedReview(localized: string, english: string): CreativeReview {
  const seeded = seedCreativeReviewFromPackage(
    {
      voiceover_text: localized,
      visual_scenes: [],
      image_prompts: [],
    },
    { scenes: [], now: () => new Date("2026-08-20T10:00:00.000Z") },
  );
  const translated = commitCreativeReviewTranslate({
    current: seeded,
    expectedVersion: seeded.version,
    voiceover: {
      ...seeded.voiceover,
      localized_edit: localized,
      english_preview: english,
      english_preview_outdated: false,
      english_confirmed: true,
      final_approved: localized,
    },
    scenes: [],
    actor: ACTOR,
    timestamp: "2026-08-20T10:01:00.000Z",
  });
  assert.equal(translated.ok, true);
  if (!translated.ok) throw new Error("translate failed");
  return translated.review;
}

function approvedT2vReview(): CreativeReview {
  const current = translatedReview(CS_WORKING, EN_PRODUCTION);
  const approved = commitCreativeReviewApprove({
    current,
    expectedVersion: current.version,
    actor: ACTOR,
    timestamp: "2026-08-20T10:02:00.000Z",
    requireSceneIntent: false,
  });
  assert.equal(approved.ok, true);
  if (!approved.ok) throw new Error("approve failed");
  return approved.review;
}

function fiveScenesForReview() {
  return [1, 2, 3, 4, 5].map((n) => ({
    source: "ai" as const,
    id: `scene-${n}`,
    image_prompt: `Concrete scene ${n} action, not a voiceover copy`,
    motion_prompt: `Motion change ${n}`,
    voiceover_excerpt: EN_PRODUCTION.split(". ")[Math.min(n - 1, 2)] ?? EN_PRODUCTION,
  }));
}

function reviewWithCanonicalScenes(review: CreativeReview): CreativeReview {
  if (
    review.scenes.length === 5 &&
    review.scenes.every((scene, index) => scene.id === `scene-${index + 1}`)
  ) {
    return review;
  }
  const scenes = fiveScenesForReview().map((scene, index) => ({
    id: scene.id,
    index,
    director_notes: "",
    intent: {
      original: scene.image_prompt,
      localized_edit: `Česká scéna ${index + 1}`,
      english_preview: scene.image_prompt,
      english_preview_outdated: false,
      presentation_type: "IMAGE",
      visual_source: "generated" as const,
      asset_id: null,
      used_as: null,
    },
  }));
  return { ...review, scenes };
}

function lockedT2vBrief(review: CreativeReview): Record<string, unknown> {
  const production = productionSpokenVoiceoverFromReview(review);
  assert.ok(production);
  const withScenes = reviewWithCanonicalScenes(review);
  const brief: Record<string, unknown> = {
    language: "en",
    tts_voice: "marin",
    package_video_mode: "text_to_video",
    voiceover_text: production,
    hook: deriveHookFromVoiceover(production),
    visual_scenes: fiveScenesForReview(),
    video: { script: "authoritative storyboard script" },
    creative_review: withScenes,
    video_text_to_video_sound_plan: {
      schema_version: 1,
      revision: 0,
      music: { mode: "none" },
      scene_sound: {},
    },
  };
  let plan = buildTextToVideoRenderPlanFromCanonical({
    packageId: PACKAGE_ID,
    brief,
    review: withScenes,
    voiceoverText: production,
    hookText: deriveHookFromVoiceover(production),
    voiceDirection: { style: "auto", revision: 0 },
  });
  plan = applyRepetitionResultToPlan(
    plan,
    checkTextToVideoRepetition({ plan, memory: EMPTY_MEMORY }),
    "2026-08-20T10:02:00.000Z",
  );
  brief.video_text_to_video_creative_plan = plan;
  return lockApprovedCanonicalTextToVideoPlan({
    brief,
    review: withScenes,
    timestamp: "2026-08-20T10:02:00.000Z",
  });
}

async function main(): Promise<void> {
  console.log("Production text-to-video Creative Review fix\n");

  await check("1 — Czech working copy yields current English production VO", () => {
    const review = translatedReview(CS_WORKING, EN_PRODUCTION);
    const production = productionSpokenVoiceoverFromReview(review);
    assert.equal(production, EN_PRODUCTION);
    assert.notEqual(production, CS_WORKING);
    assert.equal(review.voiceover.localized_edit, CS_WORKING);
  });

  await check("2 — Czech working copy is never the EN ElevenLabs source", () => {
    const review = translatedReview(CS_WORKING, EN_PRODUCTION);
    const production = productionSpokenVoiceoverFromReview(review)!;
    assert.equal(
      editorWorkingCopyMustNotBeProductionVoiceover({
        localizedEdit: CS_WORKING,
        productionVoiceover: production,
        editorLanguage: "cs",
        projectLanguage: "en",
      }),
      false,
    );
    assert.equal(
      editorWorkingCopyMustNotBeProductionVoiceover({
        localizedEdit: CS_WORKING,
        productionVoiceover: CS_WORKING,
        editorLanguage: "cs",
        projectLanguage: "en",
      }),
      true,
    );
    const brief = lockedT2vBrief(review);
    assert.equal(brief.voiceover_text, EN_PRODUCTION);
    assert.notEqual(brief.voiceover_text, CS_WORKING);
    const voiceSrc = readFileSync(
      join(root, "lib/text-to-video/voiceSynthesisService.ts"),
      "utf8",
    );
    assert.match(voiceSrc, /brief\.voiceover_text/);
    assert.doesNotMatch(voiceSrc, /final_approved/);
    assert.doesNotMatch(voiceSrc, /localized_edit/);
  });

  await check("3 — Czech edit invalidates translation and approval", () => {
    const approved = approvedT2vReview();
    assert.equal(approved.approved, true);
    const edited = applyCreativeReviewEdits(approved, {
      voiceoverLocalizedEdit: `${CS_WORKING} Další věta.`,
      scenes: [],
    });
    assert.equal(edited.ok, true);
    if (!edited.ok) throw new Error("edit failed");
    assert.equal(edited.value.approved, false);
    assert.equal(edited.value.voiceover.english_confirmed, false);
    assert.equal(edited.value.voiceover.english_preview_outdated, true);
    assert.equal(productionSpokenVoiceoverFromReview(edited.value), null);
    assert.equal(
      textToVideoOperatorApprovalState({
        review: edited.value,
        planStatus: "approved",
        repetitionStatus: "passed",
      }),
      "waiting_for_translation",
    );
  });

  await check("4 — Continue without current production translation fails pre-provider", () => {
    const review = translatedReview(CS_WORKING, EN_PRODUCTION);
    const outdated = {
      ...review,
      voiceover: {
        ...review.voiceover,
        english_preview_outdated: true,
        english_confirmed: false,
      },
      approved: true,
      status: "approved" as const,
    };
    const result = validatePackagesReadyForContinue([
      {
        packageId: PACKAGE_ID,
        packageIndex: 0,
        brief: {
          package_video_mode: "text_to_video",
          language: "en",
          voiceover_text: CS_WORKING,
          creative_review: outdated,
          video_text_to_video_creative_plan: serializeTextToVideoCreativePlan(
            buildTextToVideoCreativePlan({
              packageId: PACKAGE_ID,
              voiceoverText: EN_PRODUCTION,
            }),
          ),
        },
      },
    ]);
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("expected failure");
    const messages = result.issues.map((issue) => issue.message).join(" | ");
    assert.match(
      messages,
      new RegExp(`${T2V_PRODUCTION_TRANSLATION_MISSING}|english`),
    );
    const continueSrc = readFileSync(
      join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
      "utf8",
    );
    assert.doesNotMatch(continueSrc, /attachTextToVideoCreativePlanToBrief/);
    assert.match(continueSrc, /assertTextToVideoPlanLockedForContinue/);
  });

  await check("5 — Approve atomically approves T2V plan from production English", () => {
    const review = translatedReview(CS_WORKING, EN_PRODUCTION);
    const brief = lockedT2vBrief(review);
    const plan = readTextToVideoCreativePlan(brief);
    assert.ok(plan);
    assert.equal(plan.status, "approved");
    assert.equal(plan.repetition.status, "passed");
    assert.equal(brief.voiceover_text, EN_PRODUCTION);
    assert.equal(brief.hook, deriveHookFromVoiceover(EN_PRODUCTION));
    assert.notEqual(brief.hook, EN_PRODUCTION);
    assert.ok((brief.hook as string).length < EN_PRODUCTION.length);
    const approved = commitCreativeReviewApprove({
      current: review,
      expectedVersion: review.version,
      actor: ACTOR,
      timestamp: "2026-08-20T10:03:00.000Z",
      requireSceneIntent: false,
    });
    assert.equal(approved.ok, true);
    if (!approved.ok) throw new Error("approve failed");
    assert.equal(approved.review.approved, true);
  });

  await check("6 — Continue lock keeps approved plan snapshot unchanged", () => {
    const review = reviewWithCanonicalScenes(approvedT2vReview());
    const brief = lockedT2vBrief(review);
    const locked = assertTextToVideoPlanLockedForContinue({ brief, review });
    const before = snapshotTextToVideoPlanForContinueGuard(locked.plan);
    const afterBrief = {
      ...brief,
      creative_review: review,
    };
    const after = assertTextToVideoPlanLockedForContinue({
      brief: afterBrief,
      review,
    });
    assert.equal(
      textToVideoPlanSnapshotEquals(
        before,
        snapshotTextToVideoPlanForContinueGuard(after.plan),
      ),
      true,
    );
    assert.equal(after.plan.scenes[0]?.scene_id, locked.plan.scenes[0]?.scene_id);
    assert.equal(
      after.plan.scenes[0]?.provider_prompt,
      locked.plan.scenes[0]?.provider_prompt,
    );
  });

  await check("7 — operator visual edit survives Approve without VO rebuild", () => {
    const visual =
      "Close-up of an unread phone on a dark table, dust in a single window shaft.";
    const review = reviewWithCanonicalScenes(approvedT2vReview());
    review.scenes = review.scenes.map((scene, index) =>
      index === 0
        ? {
            ...scene,
            intent: {
              ...scene.intent,
              localized_edit: "Detail nepřečteného telefonu na tmavém stole.",
              english_preview: visual,
              english_preview_outdated: false,
            },
          }
        : scene,
    );
    const brief = lockedT2vBrief(review);
    const next = readTextToVideoCreativePlan(brief)!;
    assert.equal(next.scenes[0]?.human_visual_edit, visual);
    assert.match(next.scenes[0]!.provider_prompt, /unread phone/i);
    const locked = assertTextToVideoPlanLockedForContinue({ brief, review });
    assert.equal(
      locked.plan.scenes[0]?.human_visual_edit,
      next.scenes[0]?.human_visual_edit,
    );
  });

  await check("8 — T2V requires canonical scene intent; still does not invent scenes", () => {
    const review = translatedReview(CS_WORKING, EN_PRODUCTION);
    assert.equal(review.scenes.length, 0);
    const gate = validateCreativeReviewApproval(review, {
      requireSceneIntent: false,
    });
    assert.equal(gate.ok, true);
    const stillGate = validateCreativeReviewApproval(review, {
      requireSceneIntent: true,
    });
    assert.equal(stillGate.ok, true);
    const brief = lockedT2vBrief(review);
    assert.equal(readTextToVideoCreativePlan(brief)?.scenes.length, 5);
    try {
      lockApprovedCanonicalTextToVideoPlan({
        brief,
        review,
        timestamp: "2026-08-20T10:04:00.000Z",
      });
      throw new Error("expected T2V scene intent gate");
    } catch (err) {
      assert.equal((err as Error).message, "t2v_scene_cs_missing");
    }
  });

  await check("9 — still Creative Review rebuild still uses final_approved", () => {
    const rebuild = readFileSync(
      join(root, "lib/creative-review/rebuildCreativePackage.ts"),
      "utf8",
    );
    assert.match(rebuild, /const finalApproved = review\.voiceover\.final_approved/);
    assert.match(rebuild, /pkg\.voiceover_text = finalApproved/);
    const continueSrc = readFileSync(
      join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
      "utf8",
    );
    assert.match(continueSrc, /rebuildCreativePackageForVideo/);
    const panel = readFileSync(
      join(
        root,
        "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx",
      ),
      "utf8",
    );
    assert.match(panel, /Creative Intent/);
    assert.match(panel, /!isT2v/);
    const stillApprove = commitCreativeReviewApprove({
      current: translatedReview(
        "Schválený still voiceover.",
        "Approved still voiceover.",
      ),
      expectedVersion: 2,
      actor: ACTOR,
      timestamp: "2026-08-20T10:05:00.000Z",
      requireSceneIntent: true,
    });
    assert.equal(stillApprove.ok, true);
  });

  await check("10 — missing SFX is none, not auto", () => {
    const none = resolveSfxPlacements({
      scenes: [
        {
          sceneId: "s1",
          sceneOrder: 0,
          providerPrompt: "p",
          measuredStartSeconds: 0,
          measuredEndSeconds: 3,
          requiredTrimSeconds: 3,
          providerDurationSeconds: 3,
          model: "gen4.5",
          ratio: "720:1280",
          seed: 1,
          estimatedCredits: 1,
          estimatedCostUsd: 0.1,
          requestFingerprint: "fp",
        },
      ],
      sceneSound: {},
      alignment: alignmentFor("x", 3),
      approvedVoiceover: "x",
      videoDurationSeconds: 3,
    });
    assert.equal(none.length, 0);
    const autoSkipped = resolveSfxPlacements({
      scenes: [
        {
          sceneId: "s1",
          sceneOrder: 0,
          providerPrompt: "p",
          measuredStartSeconds: 0,
          measuredEndSeconds: 3,
          requiredTrimSeconds: 3,
          providerDurationSeconds: 3,
          model: "gen4.5",
          ratio: "720:1280",
          seed: 1,
          estimatedCredits: 1,
          estimatedCostUsd: 0.1,
          requestFingerprint: "fp",
        },
      ],
      sceneSound: { s1: { mode: "auto" } },
      alignment: alignmentFor("x", 3),
      approvedVoiceover: "x",
      videoDurationSeconds: 3,
    });
    assert.equal(autoSkipped.length, 0);
    const coerced = coerceOperatorSoundPlanToExplicitNone({
      [VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY]: {
        schema_version: 1,
        revision: 0,
        music: { mode: "auto" },
        scene_sound: { s1: { mode: "auto" } },
      },
    });
    const sound = coerced[VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY] as {
      music: { mode: string };
      scene_sound: Record<string, { mode: string }>;
    };
    assert.equal(sound.music.mode, "none");
    assert.equal(sound.scene_sound.s1?.mode, "none");
    const panel = readFileSync(
      join(
        root,
        "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx",
      ),
      "utf8",
    );
    assert.match(panel, /Bez zvukového efektu/);
    assert.doesNotMatch(panel, /Automaticky/);
  });

  await check("11 — custom SFX is kept on the sound plan", () => {
    const review = reviewWithCanonicalScenes(
      translatedReview(CS_WORKING, EN_PRODUCTION),
    );
    const brief = lockedT2vBrief(review);
    const plan = readTextToVideoCreativePlan(brief)!;
    const sceneId = plan.scenes[0]!.scene_id;
    const withCustom = {
      ...brief,
      [VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY]: {
        schema_version: 1,
        revision: 2,
        music: { mode: "none" },
        scene_sound: {
          [sceneId]: {
            mode: "custom",
            custom_effect_description: "Phone vibration on wood.",
            anchor: "voice_phrase",
            voice_phrase: "Wait for the silence",
          },
        },
      },
    };
    const locked = assertTextToVideoPlanLockedForContinue({
      brief: withCustom,
      review,
    });
    const sound = withCustom[VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY] as {
      scene_sound: Record<string, { custom_effect_description?: string }>;
    };
    assert.equal(
      sound.scene_sound[locked.plan.scenes[0]!.scene_id]
        ?.custom_effect_description,
      "Phone vibration on wood.",
    );
  });

  await check("12 — operator cost does not blindly use 3s", () => {
    const plan = buildTextToVideoCreativePlan({
      packageId: PACKAGE_ID,
      voiceoverText: EN_PRODUCTION,
    });
    const stretched = {
      ...plan,
      scenes: plan.scenes.map((scene, index) => ({
        ...scene,
        approximate_duration_seconds: index === 0 ? 7 : 4,
      })),
    };
    const estimate = estimateTextToVideoOperatorBudget({
      productionVoiceover: EN_PRODUCTION,
      plan: stretched,
    });
    const blind3s = plan.scenes.length * estimateRunwayGen45SceneCostUsd(3).usd;
    assert.notEqual(estimate.runwayUsd, blind3s);
    assert.ok(estimate.sceneProviderDurations[0]! >= 7);
    assert.doesNotMatch(
      readFileSync(
        join(root, "lib/text-to-video/textToVideoOperatorBudget.ts"),
        "utf8",
      ),
      /estimateRunwayGen45SceneCostUsd\(3\)/,
    );
    const admin = readFileSync(
      join(root, "lib/api/creative-review-admin.ts"),
      "utf8",
    );
    assert.match(admin, /estimateTextToVideoOperatorBudget/);
  });

  await check("13 — measured timing drives provider durations", () => {
    const plan = buildTextToVideoCreativePlan({
      packageId: PACKAGE_ID,
      voiceoverText: EN_PRODUCTION,
    });
    const measuredBase = applyAlignmentMeasuredTimingToPlan({
      plan,
      alignment: alignmentFor(EN_PRODUCTION, 8),
      approvedVoiceover: EN_PRODUCTION,
      audioDurationSeconds: 8,
      measuredAudioRevisionId: plan.voiceover_revision_id,
      synthesisFingerprint: "synth",
    });
    const measured = {
      ...measuredBase,
      scenes: measuredBase.scenes.map((scene, index) => ({
        ...scene,
        approximate_start_seconds: index === 0 ? 0 : 5.2,
        approximate_duration_seconds: index === 0 ? 5.2 : 2.1,
      })),
    };
    assert.equal(measured.timing_status, "measured");
    const execution = buildTextToVideoRunwayExecutionPlan({
      plan: measured,
      voiceCheckpoint: {
        phase: "voice_complete",
        synthesis_attempt_id: "a",
        synthesis_fingerprint: "synth",
        voiceover_revision_id: plan.voiceover_revision_id,
        voice_id: "v",
        model_id: "m",
        audio_bucket: "b",
        audio_path: "p",
        audio_duration_seconds: 8,
      },
    });
    const ui = estimateTextToVideoOperatorBudget({
      productionVoiceover: EN_PRODUCTION,
      plan: measured,
    });
    assert.deepEqual(
      execution.items.map((item) => item.providerDurationSeconds),
      ui.sceneProviderDurations,
    );
    assert.ok(execution.items.some((item) => item.providerDurationSeconds !== 3));
  });

  await check("14 — budget overage blocks Runway before POST", async () => {
    const plan = buildTextToVideoCreativePlan({
      packageId: PACKAGE_ID,
      voiceoverText: EN_PRODUCTION,
    });
    const measured = applyAlignmentMeasuredTimingToPlan({
      plan,
      alignment: alignmentFor(EN_PRODUCTION, 8),
      approvedVoiceover: EN_PRODUCTION,
      audioDurationSeconds: 8,
      measuredAudioRevisionId: plan.voiceover_revision_id,
      synthesisFingerprint: "synth",
    });
    const execution = buildTextToVideoRunwayExecutionPlan({
      plan: measured,
      voiceCheckpoint: {
        phase: "voice_complete",
        synthesis_attempt_id: "a",
        synthesis_fingerprint: "synth",
        voiceover_revision_id: plan.voiceover_revision_id,
        voice_id: "v",
        model_id: "m",
        audio_bucket: "b",
        audio_path: "p",
        audio_duration_seconds: 8,
      },
    });
    const posts: unknown[] = [];
    const result = await executeTextToVideoRunwayPlan(
      {
        projectId: "00000000-0000-4000-8000-000000000001",
        videoJobId: "00000000-0000-4000-8000-000000000002",
        plan: execution,
        packageBudgetUsd: 0.001,
        voiceSynthesisTextLength: 1000,
        confirmPaidRun: true,
      },
      {
        videoProvider: {
          name: "runway",
          createTextToVideo: async () => {
            posts.push("post");
            throw new Error("must_not_post");
          },
          getTextToVideoTask: async () => {
            throw new Error("must_not_post");
          },
          createImageToVideo: async () => {
            throw new Error("must_not_post");
          },
          getImageToVideoTask: async () => {
            throw new Error("must_not_post");
          },
          waitForImageToVideo: async () => {
            throw new Error("must_not_post");
          },
          generateImageToVideo: async () => {
            throw new Error("must_not_post");
          },
        },
        requireProvider: true,
        supabase: {
          from: () => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({ data: [], error: null }),
                }),
              }),
            }),
          }),
        } as never,
      },
    );
    assert.equal(result.status, "blocked");
    assert.equal(result.runwayPostCount, 0);
    assert.equal(posts.length, 0);
  });

  await check("15 — stopped package is not auto-started", () => {
    const continueSrc = readFileSync(
      join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
      "utf8",
    );
    const page = readFileSync(
      join(root, "app/projects/[id]/creative-review/[runId]/page.tsx"),
      "utf8",
    );
    const admin = readFileSync(
      join(root, "lib/api/creative-review-admin.ts"),
      "utf8",
    );
    assert.doesNotMatch(page, /continueCreativeReviewGeneration\(/);
    assert.doesNotMatch(admin, /continueCreativeReviewGeneration\(/);
    assert.match(continueSrc, /continue_generation_requested/);
    const brief = {
      package_video_mode: "text_to_video",
      language: "en",
      voiceover_text: CS_WORKING,
      creative_review: translatedReview(CS_WORKING, EN_PRODUCTION),
    };
    assert.throws(
      () =>
        assertTextToVideoPlanLockedForContinue({
          brief,
          review: brief.creative_review as CreativeReview,
        }),
      (err: unknown) =>
        err instanceof Error &&
        (err.message === T2V_PRODUCTION_TRANSLATION_MISSING ||
          err.message === T2V_PLAN_NOT_LOCKED_FOR_CONTINUE),
    );
  });

  await check("16 — no live provider request in this suite or T2V continue path", () => {
    const continueSrc = readFileSync(
      join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
      "utf8",
    );
    assert.doesNotMatch(continueSrc, /api\.elevenlabs|api\.runway|openai\.com/);
    assert.doesNotMatch(continueSrc, /attachTextToVideoCreativePlanToBrief/);
    const self = readFileSync(
      join(root, "scripts/check-production-text-to-video-creative-review-fix.ts"),
      "utf8",
    );
    assert.doesNotMatch(self, /https:\/\/api\.(openai|elevenlabs|runwayml)/);
  });

  console.log("\nAll Creative Review T2V fix checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
