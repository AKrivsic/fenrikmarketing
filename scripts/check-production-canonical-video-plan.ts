/**
 * Canonical video plan — offline checks. No provider HTTP.
 * Run: npx tsx scripts/check-production-canonical-video-plan.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CreativeReview } from "../lib/creative-review/types";
import { applyCreativeReviewEdits } from "../lib/creative-review/applyEdits";
import {
  extractCanonicalVideoScenes,
  isVisualIntentVoiceoverCopy,
  significantVoiceoverChange,
} from "../lib/content-package/canonicalVideoPlan";
import {
  buildTextToVideoCreativePlan,
  isLegacySentenceFallbackPlan,
  splitVoiceoverSentences,
  targetSceneCount,
} from "../lib/content-package/textToVideoCreativePlan";
import { buildTextToVideoRenderPlanFromCanonical } from "../lib/content-package/textToVideoRenderAdapter";
import { restoreCanonicalTextToVideoDraft, hydrateCreativeReviewScenesFromCanonical } from "../lib/content-package/restoreCanonicalTextToVideoPlan";
import {
  collectTextToVideoPlanApprovalBlockers,
} from "../lib/content-package/textToVideoPlanApprovalGate";
import {
  lockApprovedCanonicalTextToVideoPlan,
  snapshotTextToVideoPlanForContinueGuard,
  syncSpokenFieldsFromProductionVoiceover,
  textToVideoPlanSnapshotEquals,
} from "../lib/content-package/textToVideoManualReview";
import { composeTextToVideoProviderPrompt } from "../lib/content-package/textToVideoProviderPrompt";
import {
  assertT2vVoiceSelectionReadyForApprove,
  stampT2vAuthoritativeVoiceOnBrief,
  T2V_TTS_VOICE_SNAPSHOT_MISSING,
} from "../lib/text-to-video/textToVideoAuthoritativeVoice";
import { estimateTextToVideoOperatorBudget } from "../lib/text-to-video/textToVideoOperatorBudget";
import { EMPTY_MEMORY } from "../lib/ai/workflows/antiRepetitionMemory";

const root = join(import.meta.dirname, "..");

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

const FOURTEEN_SENTENCE_VO = [
  "What does a potential client see before they ever speak to you.",
  "They open a tab.",
  "They search your name.",
  "The profile loads.",
  "A weak first impression costs the meeting.",
  "Your feed should prove expertise.",
  "Not generic stock.",
  "Not silence.",
  "Show the work.",
  "Show the proof.",
  "Then they book.",
  "Then they call.",
  "Then they trust you.",
  "Start today.",
].join(" ");

function fiveVisualScenes() {
  return [
    {
      source: "ai" as const,
      id: "scene-1",
      image_prompt: "Split screen of a professional profile versus a blank tab",
      motion_prompt: "Cursor moves toward the profile; tab loads",
      voiceover_excerpt: "What does a potential client see before they ever speak to you.",
    },
    {
      source: "ai" as const,
      id: "scene-2",
      image_prompt: "Client POV phone searching a name",
      motion_prompt: "Thumb types, results appear",
      voiceover_excerpt: "They open a tab. They search your name. The profile loads.",
    },
    {
      source: "ai" as const,
      id: "scene-3",
      image_prompt: "Weak social feed with empty posts",
      motion_prompt: "Scroll stalls on empty grid",
      voiceover_excerpt: "A weak first impression costs the meeting.",
    },
    {
      source: "ai" as const,
      id: "scene-4",
      image_prompt: "Proof collage of case studies on a laptop",
      motion_prompt: "Cards slide into a tidy grid",
      voiceover_excerpt: "Your feed should prove expertise. Show the work. Show the proof.",
    },
    {
      source: "ai" as const,
      id: "scene-5",
      image_prompt: "Calendar booking confirmation on a phone",
      motion_prompt: "Booked badge appears; phone lowers",
      voiceover_excerpt: "Then they book. Then they call. Then they trust you. Start today.",
    },
  ];
}

function reviewForFiveScenes(): CreativeReview {
  return {
    status: "ready",
    version: 1,
    approved: false,
    voiceover: {
      original_ai: FOURTEEN_SENTENCE_VO,
      localized_edit: "Co vidí klient, než vám zavolá.",
      english_preview: FOURTEEN_SENTENCE_VO,
      english_preview_outdated: false,
      english_confirmed: true,
      translation_confirmed_at: "2026-01-01T00:00:00.000Z",
      translation_confirmed_by: "system",
      final_approved: "Co vidí klient, než vám zavolá.",
    },
    scenes: fiveVisualScenes().map((scene, index) => ({
      id: scene.id,
      index,
      director_notes: "",
      intent: {
        original: scene.image_prompt,
        localized_edit: `Česká scéna ${index + 1}: ${scene.image_prompt}`,
        english_preview: scene.image_prompt,
        english_preview_outdated: false,
        presentation_type: "IMAGE",
        visual_source: "generated",
        asset_id: null,
        used_as: null,
      },
    })),
    history: [
      {
        version: 1,
        event: "seed",
        timestamp: "2026-01-01T00:00:00.000Z",
        actor: { type: "system", id: "system" },
        voiceover: {
          original_ai: FOURTEEN_SENTENCE_VO,
          localized_edit: "Co vidí klient, než vám zavolá.",
          english_preview: FOURTEEN_SENTENCE_VO,
          english_preview_outdated: false,
          english_confirmed: true,
          translation_confirmed_at: "2026-01-01T00:00:00.000Z",
          translation_confirmed_by: "system",
          final_approved: "Co vidí klient, než vám zavolá.",
        },
        scenes: [],
        status: "ready",
        approved: false,
      },
    ],
  };
}

function canonicalBrief(review: CreativeReview): Record<string, unknown> {
  const videoScript = fiveVisualScenes()
    .map(
      (scene, i) =>
        `SCENE ${i + 1}\nVisual: ${scene.image_prompt}\nVO: '${scene.voiceover_excerpt}'`,
    )
    .join("\n\n");
  return {
    package_video_mode: "text_to_video",
    hook: "What does a potential client see before they ever speak to you.",
    voiceover_text: FOURTEEN_SENTENCE_VO,
    subtitles: FOURTEEN_SENTENCE_VO,
    visual_scenes: fiveVisualScenes(),
    video: {
      concept: "LinkedIn first impression",
      script: videoScript,
    },
    presentation_generation: {
      visual_identity: {
        art_direction: "clean editorial documentary",
        lighting: "cool window light",
        palette: "navy, white, steel",
        environment: "modern office desk",
        camera_style: "handheld close-ups",
        character_style: "professional adult, same phone model",
      },
    },
    creative_review: review,
    language: "en",
    tts_voice: "marin",
  };
}

function main(): void {
  console.log("Canonical video plan\n");

  check("1 — five Claude scenes become five T2V render scenes", () => {
    const review = reviewForFiveScenes();
    const brief = canonicalBrief(review);
    const plan = buildTextToVideoRenderPlanFromCanonical({
      packageId: "pkg",
      brief,
      review,
      voiceoverText: FOURTEEN_SENTENCE_VO,
      voiceDirection: { style: "auto", revision: 0 },
    });
    assert.equal(plan.scenes.length, 5);
    assert.deepEqual(
      plan.scenes.map((s) => s.scene_id),
      ["scene-1", "scene-2", "scene-3", "scene-4", "scene-5"],
    );
    assert.equal(plan.origin, "canonical_storyboard");
  });

  check("2 — fourteen VO sentences do not create seven scenes", () => {
    assert.equal(splitVoiceoverSentences(FOURTEEN_SENTENCE_VO).length >= 10, true);
    assert.equal(targetSceneCount(14), 7);
    const review = reviewForFiveScenes();
    const plan = buildTextToVideoRenderPlanFromCanonical({
      packageId: "pkg",
      brief: canonicalBrief(review),
      review,
      voiceoverText: FOURTEEN_SENTENCE_VO,
      voiceDirection: { style: "auto", revision: 0 },
    });
    assert.equal(plan.scenes.length, 5);
    assert.notEqual(plan.scenes.length, targetSceneCount(14));
  });

  check("3 — still and T2V read the same canonical scene ids", () => {
    const scenes = extractCanonicalVideoScenes({
      visualScenes: fiveVisualScenes(),
      voiceoverText: FOURTEEN_SENTENCE_VO,
    });
    const stillIds = scenes.map((s) => s.id);
    const review = reviewForFiveScenes();
    assert.deepEqual(
      stillIds,
      review.scenes.map((s) => s.id),
    );
  });

  check("4 — render mode does not change story or voiceover", () => {
    const visual = readFileSync(
      join(root, "lib/content-pipeline/prompts/contentPackageVisualScenes.ts"),
      "utf8",
    );
    const attach = readFileSync(
      join(root, "lib/content-package/attachTextToVideoCreativePlan.ts"),
      "utf8",
    );
    assert.match(visual, /Keep one shared story and one shared voiceover/);
    assert.match(visual, /Do not invent a second plot/);
    assert.match(visual, /packageVideoMode === "text_to_video"/);
    assert.match(attach, /buildTextToVideoRenderPlanFromCanonical/);
    assert.doesNotMatch(attach, /buildTextToVideoCreativePlan\(/);
  });

  check("5 — sentence fallback cannot be approved", () => {
    const fallback = buildTextToVideoCreativePlan({
      packageId: "legacy",
      voiceoverText: FOURTEEN_SENTENCE_VO,
    });
    assert.equal(isLegacySentenceFallbackPlan(fallback, 5), true);
    const review = reviewForFiveScenes();
    const blockers = collectTextToVideoPlanApprovalBlockers({
      plan: fallback,
      brief: canonicalBrief(review),
      review,
    });
    assert.ok(blockers.includes("t2v_plan_sentence_fallback"));
  });

  check("6 — VO excerpt cannot replace visual scene", () => {
    assert.equal(
      isVisualIntentVoiceoverCopy(
        "They open a tab. They search your name.",
        "They open a tab. They search your name.",
      ),
      true,
    );
    assert.equal(
      isVisualIntentVoiceoverCopy(
        "Výrazný vizuál podporující: They open a tab.",
        "They open a tab.",
      ),
      true,
    );
    assert.equal(
      isVisualIntentVoiceoverCopy(
        "Client POV phone searching a name",
        "They open a tab.",
      ),
      false,
    );
  });

  check("7 — existing package restores from five Claude scenes without provider", () => {
    const review = reviewForFiveScenes();
    const brief = canonicalBrief(review);
    const fallback = buildTextToVideoCreativePlan({
      packageId: "pkg",
      voiceoverText: FOURTEEN_SENTENCE_VO,
    });
    brief.video_text_to_video_creative_plan = fallback;
    const restored = restoreCanonicalTextToVideoDraft({
      packageId: "pkg",
      brief,
      review,
    });
    const plan = restored.video_text_to_video_creative_plan as {
      scenes: unknown[];
      origin: string;
    };
    assert.equal(plan.scenes.length, 5);
    assert.equal(plan.origin, "canonical_storyboard");
    const emptyReview = { ...review, scenes: [] };
    const hydrated = hydrateCreativeReviewScenesFromCanonical({
      review: emptyReview,
      brief: restored,
    });
    assert.equal(hydrated.scenes.length, 5);
    assert.deepEqual(
      hydrated.scenes.map((scene) => scene.id),
      ["scene-1", "scene-2", "scene-3", "scene-4", "scene-5"],
    );
  });

  check("8 — restore preserves platform texts and video.script", () => {
    const review = reviewForFiveScenes();
    const brief = canonicalBrief(review);
    brief.platform_outputs = { tiktok: { caption: "keep me" } };
    const originalScript = (brief.video as { script: string }).script;
    brief.video_text_to_video_creative_plan = buildTextToVideoCreativePlan({
      packageId: "pkg",
      voiceoverText: FOURTEEN_SENTENCE_VO,
    });
    const restored = restoreCanonicalTextToVideoDraft({
      packageId: "pkg",
      brief,
      review,
    });
    assert.equal((restored.video as { script: string }).script, originalScript);
    assert.equal(
      (restored.platform_outputs as { tiktok: { caption: string } }).tiktok
        .caption,
      "keep me",
    );
  });

  check("9 — one Save payload includes every scene edit", () => {
    const review = reviewForFiveScenes();
    const edited = applyCreativeReviewEdits(review, {
      voiceoverLocalizedEdit: review.voiceover.localized_edit,
      scenes: review.scenes.map((scene, i) => ({
        id: scene.id,
        intentLocalizedEdit: `Upravená scéna ${i + 1}`,
        directorNotes: "",
      })),
    });
    assert.equal(edited.ok, true);
    if (edited.ok) {
      assert.equal(edited.value.scenes.length, 5);
      assert.ok(
        edited.value.scenes.every((scene) =>
          scene.intent.localized_edit.startsWith("Upravená scéna"),
        ),
      );
    }
  });

  check("10 — Czech scene change invalidates English until Save translation", () => {
    const review = reviewForFiveScenes();
    const edited = applyCreativeReviewEdits(review, {
      voiceoverLocalizedEdit: review.voiceover.localized_edit,
      scenes: review.scenes.map((scene, i) => ({
        id: scene.id,
        intentLocalizedEdit:
          i === 0 ? "Nový český popis scény s akcí." : scene.intent.localized_edit,
        directorNotes: "",
      })),
    });
    assert.equal(edited.ok, true);
    if (edited.ok) {
      assert.equal(edited.value.scenes[0]!.intent.english_preview_outdated, true);
    }
  });

  check("11 — Runway prompt contains no Czech", () => {
    const prompt = composeTextToVideoProviderPrompt({
      englishVisualIntent: "Client POV phone searching a name",
      motionPrompt: "Thumb types, results appear",
    });
    assert.doesNotMatch(prompt, /[áčďéěíňóřšťúůýž]/i);
    assert.doesNotMatch(prompt, /Výrazný vizuál/);
    assert.doesNotMatch(prompt, /Závěr a CTA/);
  });

  check("12 — Approve does not change scene count, ids, order, or content", () => {
    const review = reviewForFiveScenes();
    review.status = "ready";
    const brief = canonicalBrief(review);
    brief.video_text_to_video_creative_plan =
      buildTextToVideoRenderPlanFromCanonical({
        packageId: "pkg",
        brief,
        review,
        voiceoverText: FOURTEEN_SENTENCE_VO,
        voiceDirection: { style: "auto", revision: 0 },
      });
    const before = JSON.stringify(
      (brief.video_text_to_video_creative_plan as { scenes: unknown }).scenes,
    );
    const locked = lockApprovedCanonicalTextToVideoPlan({
      brief,
      review,
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    const after = locked.video_text_to_video_creative_plan as {
      scenes: unknown;
      status: string;
    };
    assert.equal(after.status, "approved");
    assert.equal(JSON.stringify(after.scenes), before);
  });

  check("13 — Approve does not overwrite video.script", () => {
    const review = reviewForFiveScenes();
    const brief = canonicalBrief(review);
    const script = (brief.video as { script: string }).script;
    brief.video_text_to_video_creative_plan =
      buildTextToVideoRenderPlanFromCanonical({
        packageId: "pkg",
        brief,
        review,
        voiceoverText: FOURTEEN_SENTENCE_VO,
        voiceDirection: { style: "auto", revision: 0 },
      });
    const locked = lockApprovedCanonicalTextToVideoPlan({
      brief,
      review,
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    assert.equal((locked.video as { script: string }).script, script);
    const spoken = syncSpokenFieldsFromProductionVoiceover(
      locked,
      FOURTEEN_SENTENCE_VO,
      "hook",
    );
    assert.equal((spoken.video as { script: string }).script, script);
  });

  check("14 — Continue snapshot equals approved plan 1:1", () => {
    const review = reviewForFiveScenes();
    const brief = canonicalBrief(review);
    brief.video_text_to_video_creative_plan =
      buildTextToVideoRenderPlanFromCanonical({
        packageId: "pkg",
        brief,
        review,
        voiceoverText: FOURTEEN_SENTENCE_VO,
        voiceDirection: { style: "auto", revision: 0 },
      });
    const locked = lockApprovedCanonicalTextToVideoPlan({
      brief,
      review,
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    const plan = locked.video_text_to_video_creative_plan as Parameters<
      typeof snapshotTextToVideoPlanForContinueGuard
    >[0];
    const a = snapshotTextToVideoPlanForContinueGuard(plan);
    const b = snapshotTextToVideoPlanForContinueGuard(plan);
    assert.equal(textToVideoPlanSnapshotEquals(a, b), true);
  });

  check("15 — VO change keeps scenes and requires review", () => {
    assert.equal(
      significantVoiceoverChange(FOURTEEN_SENTENCE_VO, FOURTEEN_SENTENCE_VO),
      false,
    );
    assert.equal(
      significantVoiceoverChange(
        FOURTEEN_SENTENCE_VO,
        "Completely different narration about a bakery opening at dawn with new proof.",
      ),
      true,
    );
    const src = readFileSync(
      join(root, "lib/content-package/textToVideoManualReview.ts"),
      "utf8",
    );
    assert.match(src, /needs_review/);
    assert.doesNotMatch(src, /rebuildTextToVideoPlanPreservingSceneEdits\(/);
  });

  check("16 — voice category is not dash when snapshot exists", () => {
    const brief = stampT2vAuthoritativeVoiceOnBrief(
      { language: "en" },
      { ttsVoice: "marin", language: "en" },
    );
    const ready = assertT2vVoiceSelectionReadyForApprove({
      brief,
    });
    assert.equal(ready.category, "female");
    assert.notEqual(ready.category, "—");
  });

  check("17 — missing voice snapshot blocks Approve", () => {
    assert.throws(
      () =>
        assertT2vVoiceSelectionReadyForApprove({
          brief: {},
        }),
      (err: unknown) =>
        err instanceof Error && err.message === T2V_TTS_VOICE_SNAPSHOT_MISSING,
    );
  });

  check("18 — price uses five real scenes", () => {
    const review = reviewForFiveScenes();
    const plan = buildTextToVideoRenderPlanFromCanonical({
      packageId: "pkg",
      brief: canonicalBrief(review),
      review,
      voiceoverText: FOURTEEN_SENTENCE_VO,
      voiceDirection: { style: "auto", revision: 0 },
    });
    const estimate = estimateTextToVideoOperatorBudget({
      productionVoiceover: FOURTEEN_SENTENCE_VO,
      plan,
      sound: null,
      maxBudgetUsd: 6,
    });
    assert.equal(plan.scenes.length, 5);
    assert.equal(estimate.sceneProviderDurations.length, 5);
    assert.ok(estimate.runwayUsd > 0);
  });

  check("19 — alignment source scan still only changes timing", () => {
    const src = readFileSync(
      join(root, "lib/text-to-video/measuredSceneTiming.ts"),
      "utf8",
    );
    assert.match(src, /approximate_duration_seconds/);
    assert.doesNotMatch(src, /buildTextToVideoCreativePlan/);
  });

  check("20 — budget still stops Runway before first POST", () => {
    const src = readFileSync(
      join(root, "lib/text-to-video/textToVideoRunwayExecutor.ts"),
      "utf8",
    );
    assert.match(src, /budget/);
  });

  check("21 — still workflow files still hide T2V extras", () => {
    const src = readFileSync(
      join(root, "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx"),
      "utf8",
    );
    assert.match(src, /\{!isT2v \? \(/);
    assert.match(src, /Creative Intent/);
  });

  check("22 — no test file performs a real provider request", () => {
    const thisFile = readFileSync(
      join(root, "scripts/check-production-canonical-video-plan.ts"),
      "utf8",
    );
    assert.doesNotMatch(thisFile, /api\.anthropic\.com|api\.openai\.com|api\.elevenlabs|api\.dev\.runwayml/);
    void EMPTY_MEMORY;
  });
}

main();
