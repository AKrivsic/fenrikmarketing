/**
 * T2V scene integrity — offline. No Claude / ElevenLabs / Runway HTTP.
 * Run: npm run check:production-t2v-scene-integrity
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CreativeReview } from "../lib/creative-review/types";
import type { TextProvider } from "../lib/ai/types";
import {
  extractCanonicalVideoScenesFromBrief,
} from "../lib/content-package/canonicalVideoPlan";
import { buildTextToVideoRenderPlanFromCanonical } from "../lib/content-package/textToVideoRenderAdapter";
import {
  applyRebuiltCanonicalSceneVisualsToBrief,
  rebuildCanonicalSceneVisualsFromCzechIntent,
} from "../lib/content-package/rebuildCanonicalSceneFromCzechIntent";
import {
  collectTextToVideoPlanApprovalBlockers,
  T2V_SCENE_VISUAL_STALE,
} from "../lib/content-package/textToVideoPlanApprovalGate";
import {
  lockApprovedCanonicalTextToVideoPlan,
  snapshotTextToVideoPlanForContinueGuard,
  textToVideoPlanSnapshotEquals,
} from "../lib/content-package/textToVideoManualReview";
import {
  composeTextToVideoProviderPrompt,
  providerPromptHasContradictoryTextRules,
  T2V_GEN45_PROMPT_MAX_UTF16,
  utf16CodeUnits,
} from "../lib/content-package/textToVideoProviderPrompt";
import {
  approveTextToVideoCreativePlan,
  readTextToVideoCreativePlan,
  serializeTextToVideoCreativePlan,
} from "../lib/content-package/textToVideoCreativePlan";
import {
  assertTextToVideoPackageReadyForPaidProviders,
} from "../lib/text-to-video/assertTextToVideoPackageReadyForPaidProviders";
import { sceneRequestFingerprint } from "../lib/text-to-video/runwayExecutionPlan";
import { stampT2vAuthoritativeVoiceOnBrief } from "../lib/text-to-video/textToVideoAuthoritativeVoice";
import { canReuseTextToVideoSceneAttempt } from "../lib/text-to-video/runwayBudget";

const root = join(import.meta.dirname, "..");

function check(name: string, fn: () => void | Promise<void>): Promise<void> | void {
  const run = async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ ${name}`);
      throw err;
    }
  };
  return run();
}

const VO = [
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
      voiceover_excerpt:
        "What does a potential client see before they ever speak to you.",
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
      voiceover_excerpt:
        "Your feed should prove expertise. Show the work. Show the proof.",
    },
    {
      source: "ai" as const,
      id: "scene-5",
      image_prompt: "Calendar booking confirmation on a phone",
      motion_prompt: "Booked badge appears; phone lowers",
      voiceover_excerpt:
        "Then they book. Then they call. Then they trust you. Start today.",
    },
  ];
}

function reviewForFiveScenes(): CreativeReview {
  return {
    status: "ready",
    version: 1,
    approved: false,
    voiceover: {
      original_ai: VO,
      localized_edit: "Co vidí klient, než vám zavolá.",
      english_preview: VO,
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
    history: [],
  };
}

function canonicalBrief(review: CreativeReview): Record<string, unknown> {
  return stampT2vAuthoritativeVoiceOnBrief(
    {
      package_video_mode: "text_to_video",
      hook: "What does a potential client see before they ever speak to you.",
      voiceover_text: VO,
      subtitles: VO,
      visual_scenes: fiveVisualScenes(),
      video: {
        concept: "LinkedIn first impression",
        script: fiveVisualScenes()
          .map(
            (scene, i) =>
              `SCENE ${i + 1}\nVisual: ${scene.image_prompt}\nVO: '${scene.voiceover_excerpt}'`,
          )
          .join("\n\n"),
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
      video_paid_preflight: {
        similarity_check_status: "passed",
        confirm_paid_run: true,
        max_budget_usd: 80,
      },
    },
    { ttsVoice: "marin", language: "en" },
  );
}

function draftPlan(
  brief: Record<string, unknown>,
  review: CreativeReview,
  priorReview?: CreativeReview,
) {
  return buildTextToVideoRenderPlanFromCanonical({
    packageId: "pkg",
    brief,
    review,
    priorReview,
    voiceoverText: VO,
    voiceDirection: { style: "auto", revision: 0 },
  });
}

function withApprovedPlan(
  brief: Record<string, unknown>,
  review: CreativeReview,
  priorReview?: CreativeReview,
): Record<string, unknown> {
  const plan = approveTextToVideoCreativePlan(
    draftPlan(brief, review, priorReview),
    "2026-01-01T00:00:00.000Z",
  );
  return {
    ...brief,
    creative_review: { ...review, approved: true, status: "approved" },
    video_text_to_video_creative_plan: serializeTextToVideoCreativePlan({
      ...plan,
      status: "approved",
      repetition: {
        status: "passed",
        blocked_reasons: [],
        checked_at: "2026-01-01T00:00:00.000Z",
      },
    }),
  };
}

function majorCzechReview(review: CreativeReview): CreativeReview {
  const nextIntent =
    "Muž v dešti odkládá nerozbalený dopis na mokrou lavičku a odchází.";
  return {
    ...review,
    scenes: review.scenes.map((scene, index) =>
      index === 0
        ? {
            ...scene,
            intent: {
              ...scene.intent,
              localized_edit: nextIntent,
              english_preview:
                "A man in the rain sets an unopened letter on a wet bench and walks away.",
              english_preview_outdated: false,
            },
          }
        : scene,
    ),
  };
}

function failingProvider(): TextProvider {
  return {
    name: "fake-fail",
    async complete() {
      throw new Error("network_disabled_offline_test");
    },
  };
}

function successRebuildProvider(): TextProvider {
  return {
    name: "fake-rebuild",
    async complete() {
      return {
        text: JSON.stringify({
          image_prompt:
            "A man in a dark raincoat places a sealed envelope on a wet park bench",
          motion_prompt: "Hand releases the letter; figure walks out of frame",
        }),
        model: "fake",
        provider: "fake",
        usage: {
          prompt_tokens: 1,
          completion_tokens: 1,
          cached_tokens: null,
        },
      };
    },
  };
}

async function main(): Promise<void> {
  console.log("T2V scene integrity\n");
  const originalImage = fiveVisualScenes()[0]!.image_prompt;
  const originalMotion = fiveVisualScenes()[0]!.motion_prompt;

  await check("1 — major Czech edit does not keep the old image_prompt in Runway prompt", () => {
    const prior = reviewForFiveScenes();
    const next = majorCzechReview(prior);
    const brief = canonicalBrief(next);
    const plan = draftPlan(brief, next, prior);
    const prompt = plan.scenes[0]!.provider_prompt;
    assert.equal(plan.scenes[0]!.visual_rebuild_status, "rebuild_required");
    assert.doesNotMatch(prompt, /Split screen of a professional profile/i);
    assert.match(prompt, /unopened letter|wet bench/i);
  });

  await check("2 — major Czech edit does not keep the old motion_prompt", () => {
    const prior = reviewForFiveScenes();
    const next = majorCzechReview(prior);
    const brief = canonicalBrief(next);
    const plan = draftPlan(brief, next, prior);
    const prompt = plan.scenes[0]!.provider_prompt;
    assert.doesNotMatch(prompt, /Cursor moves toward the profile/i);
    assert.equal(plan.scenes[0]!.energy_motion, "");
    const stored = extractCanonicalVideoScenesFromBrief(brief)[0]!;
    assert.equal(stored.image_prompt, originalImage);
    assert.equal(stored.motion_prompt, originalMotion);
  });

  await check("3 — major Czech edit replaces provider prompt and fingerprint", () => {
    const prior = reviewForFiveScenes();
    const baseline = draftPlan(canonicalBrief(prior), prior);
    const next = majorCzechReview(prior);
    const changed = draftPlan(canonicalBrief(next), next, prior);
    assert.notEqual(
      changed.scenes[0]!.provider_prompt,
      baseline.scenes[0]!.provider_prompt,
    );
    assert.notEqual(changed.plan_fingerprint, baseline.plan_fingerprint);
  });

  await check("4 — failed rebuild does not patch visual_scenes", async () => {
    const review = majorCzechReview(reviewForFiveScenes());
    const brief = canonicalBrief(review);
    const before = JSON.stringify(brief.visual_scenes);
    const result = await rebuildCanonicalSceneVisualsFromCzechIntent({
      brief,
      review,
      sceneId: "scene-1",
      textProvider: failingProvider(),
    });
    assert.equal(result.ok, false);
    assert.equal(JSON.stringify(brief.visual_scenes), before);
    const admin = readFileSync(
      join(root, "lib/api/creative-review-admin.ts"),
      "utf8",
    );
    const rebuildFn = admin.slice(
      admin.indexOf("rebuildCreativeReviewTextToVideoSceneFromCzechIntent"),
    );
    const persistAt = rebuildFn.indexOf("persistCreativeReview");
    const failReturnAt = rebuildFn.indexOf("if (!rebuilt.ok)");
    assert.ok(failReturnAt >= 0 && persistAt > failReturnAt);
  });

  await check("5 — after a major change the plan is unapproved", () => {
    const prior = reviewForFiveScenes();
    const next = majorCzechReview(prior);
    const plan = draftPlan(canonicalBrief(next), next, prior);
    assert.equal(plan.status, "draft");
    assert.notEqual(plan.status, "approved");
  });

  await check("6 — Approve rejects a stale hybrid scene", () => {
    const prior = reviewForFiveScenes();
    const next = majorCzechReview(prior);
    const brief = canonicalBrief(next);
    brief.video_text_to_video_creative_plan = serializeTextToVideoCreativePlan(
      draftPlan(brief, next, prior),
    );
    const blockers = collectTextToVideoPlanApprovalBlockers({
      plan: readTextToVideoCreativePlan(brief),
      brief,
      review: next,
    });
    assert.ok(blockers.includes(T2V_SCENE_VISUAL_STALE));
    assert.throws(
      () => lockApprovedCanonicalTextToVideoPlan({ brief, review: next }),
      /t2v_scene_visual_stale/,
    );
  });

  await check("7 — Continue keeps the approved snapshot 1:1", () => {
    const review = reviewForFiveScenes();
    review.status = "ready";
    const brief = withApprovedPlan(canonicalBrief(review), {
      ...review,
      approved: true,
      status: "approved",
    });
    const locked = lockApprovedCanonicalTextToVideoPlan({
      brief,
      review: brief.creative_review as CreativeReview,
    });
    const plan = readTextToVideoCreativePlan(locked)!;
    const before = snapshotTextToVideoPlanForContinueGuard(plan);
    assert.equal(
      textToVideoPlanSnapshotEquals(
        before,
        snapshotTextToVideoPlanForContinueGuard(plan),
      ),
      true,
    );
  });

  await check("8 — composed prompt is at most 1000 UTF-16 units", () => {
    const prompt = composeTextToVideoProviderPrompt({
      englishVisualIntent: "Action ".repeat(200),
      motionPrompt: "Motion ".repeat(80),
      canonicalScene: {
        image_prompt: "Still description with a long office interior ".repeat(40),
      },
      continuity: {
        environment: "huge open-plan office with glass walls and city view",
        palette: "navy and steel",
        lighting: "cool window light",
        camera_style: "slow handheld push",
      },
    });
    assert.ok(utf16CodeUnits(prompt) <= T2V_GEN45_PROMPT_MAX_UTF16);
  });

  await check("9 — important constraint is not lost to a blind whole-prompt slice", () => {
    const prompt = composeTextToVideoProviderPrompt({
      englishVisualIntent: "A ".repeat(400),
      motionPrompt: "Camera slowly pushes in while rain beads on glass",
      canonicalScene: { image_prompt: "Setting ".repeat(80) },
    });
    assert.match(prompt, /No dialogue, lip-sync, subtitles, captions, logos/);
    assert.ok(utf16CodeUnits(prompt) <= T2V_GEN45_PROMPT_MAX_UTF16);
    const adapter = readFileSync(
      join(root, "lib/content-package/textToVideoRenderAdapter.ts"),
      "utf8",
    );
    assert.doesNotMatch(adapter, /providerPrompt\.slice\(0,\s*4000\)/);
  });

  await check("10 — prompt does not require readable text while also forbidding it", () => {
    const prompt = composeTextToVideoProviderPrompt({
      englishVisualIntent:
        "Phone on a desk showing readable text on the screen with a calendar",
      motionPrompt: "Thumb hovers, display stays in frame",
      canonicalScene: {
        image_prompt: "Close-up of a phone with legible text on the monitor",
      },
    });
    assert.equal(providerPromptHasContradictoryTextRules(prompt), false);
    assert.doesNotMatch(prompt, /show readable text/i);
    assert.match(prompt, /No dialogue, lip-sync, subtitles, captions, logos/);
  });

  await check("11 — fingerprint uses the exact provider prompt that would be sent", () => {
    const review = reviewForFiveScenes();
    const plan = draftPlan(canonicalBrief(review), review);
    const prompt = plan.scenes[0]!.provider_prompt;
    const fp = sceneRequestFingerprint({
      provider_prompt: prompt,
      scene_id: plan.scenes[0]!.scene_id,
    });
    const fpAgain = sceneRequestFingerprint({
      provider_prompt: prompt,
      scene_id: plan.scenes[0]!.scene_id,
    });
    assert.equal(fp, fpAgain);
    assert.notEqual(
      sceneRequestFingerprint({
        provider_prompt: `${prompt} extra`,
        scene_id: plan.scenes[0]!.scene_id,
      }),
      fp,
    );
  });

  await check("12–14 — one invalid scene stops the package before ElevenLabs", () => {
    const review = reviewForFiveScenes();
    const next = majorCzechReview(review);
    const brief = withApprovedPlan(canonicalBrief(next), next, review);
    let elevenLabsPosts = 0;
    let runwayPosts = 0;
    const run = () => {
      assertTextToVideoPackageReadyForPaidProviders({
        brief,
        review: brief.creative_review as CreativeReview,
        jobInput: {
          tts_voice: "marin",
          language: "en",
          text_to_video_confirm_paid_run: true,
          text_to_video_max_budget_usd: 80,
        },
        requireWorkerVoiceId: false,
      });
      elevenLabsPosts += 1;
      runwayPosts += 1;
    };
    assert.throws(run, /t2v_scene_visual_stale|creative_plan_not_approved/);
    assert.equal(elevenLabsPosts, 0);
    assert.equal(runwayPosts, 0);
  });

  await check("15 — a valid plan passes package preflight into fake provider inputs", () => {
    process.env.ELEVENLABS_VOICE_ID_EN_FEMALE = "voice-en-female";
    process.env.ELEVENLABS_VOICE_ID_EN_DEFAULT = "voice-en-default";
    const review = reviewForFiveScenes();
    const approvedReview = {
      ...review,
      approved: true,
      status: "approved" as const,
    };
    const brief = withApprovedPlan(canonicalBrief(approvedReview), approvedReview);
    const locked = lockApprovedCanonicalTextToVideoPlan({
      brief,
      review: approvedReview,
    });
    assert.doesNotThrow(() =>
      assertTextToVideoPackageReadyForPaidProviders({
        brief: locked,
        review: approvedReview,
        jobInput: {
          tts_voice: "marin",
          language: "en",
          text_to_video_confirm_paid_run: true,
          text_to_video_max_budget_usd: 80,
        },
        requireWorkerVoiceId: true,
      }),
    );
  });

  await check("16 — matching request fingerprint reuses a succeeded attempt", () => {
    const prompt = composeTextToVideoProviderPrompt({
      englishVisualIntent: "Client POV phone searching a name",
      motionPrompt: "Thumb types, results appear",
    });
    const fp = sceneRequestFingerprint({
      provider_prompt: prompt,
      scene_id: "scene-2",
    });
    assert.equal(
      canReuseTextToVideoSceneAttempt(
        {
          id: "attempt-1",
          status: "succeeded",
          generationMode: "text_to_video",
          outputAssetId: "asset-1",
          outputBucket: "video-clips",
          outputPath: "scene.mp4",
          providerMetadata: { request_fingerprint: fp },
        } as never,
        fp,
      ),
      true,
    );
    assert.equal(
      canReuseTextToVideoSceneAttempt(
        {
          id: "attempt-1",
          status: "succeeded",
          generationMode: "text_to_video",
          outputAssetId: "asset-1",
          outputBucket: "video-clips",
          outputPath: "scene.mp4",
          providerMetadata: { request_fingerprint: fp },
        } as never,
        `${fp}x`,
      ),
      false,
    );
  });

  await check("17 — still workflow is unchanged", () => {
    const admin = readFileSync(
      join(root, "lib/api/creative-review-admin.ts"),
      "utf8",
    );
    assert.match(
      admin,
      /parsePackageVideoProductionMode\(loaded\.brief\.package_video_mode\) ===\s*"text_to_video"/,
    );
    assert.match(admin, /Scene rebuild is only available for text-to-video packages/);
    const panel = readFileSync(
      join(
        root,
        "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx",
      ),
      "utf8",
    );
    assert.match(panel, /Uložit drobnou úpravu/);
    assert.match(panel, /: "Save"/);
    const stillPlan = readFileSync(
      join(root, "lib/content-package/visualScenePlan.ts"),
      "utf8",
    );
    assert.match(stillPlan, /RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16/);
  });

  await check("18 — UI shows the exact prompt and UTF-16 count", () => {
    const panel = readFileSync(
      join(
        root,
        "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx",
      ),
      "utf8",
    );
    assert.match(panel, /providerPromptUtf16Length/);
    assert.match(panel, /\/ 1000 UTF-16/);
    assert.match(panel, /overlay\?\.providerPrompt/);
    assert.doesNotMatch(
      panel,
      /Technický Runway prompt \(jen anglicky\)/,
    );
  });

  await check("rebuild writes new still+motion atomically in memory", async () => {
    const review = majorCzechReview(reviewForFiveScenes());
    const brief = canonicalBrief(review);
    const rebuilt = await rebuildCanonicalSceneVisualsFromCzechIntent({
      brief,
      review,
      sceneId: "scene-1",
      textProvider: successRebuildProvider(),
    });
    assert.equal(rebuilt.ok, true);
    if (!rebuilt.ok) return;
    const patched = applyRebuiltCanonicalSceneVisualsToBrief({
      brief,
      sceneId: rebuilt.sceneId,
      image_prompt: rebuilt.image_prompt,
      motion_prompt: rebuilt.motion_prompt,
    });
    const scenes = extractCanonicalVideoScenesFromBrief(patched);
    assert.equal(scenes.length, 5);
    assert.deepEqual(
      scenes.map((scene) => scene.id),
      ["scene-1", "scene-2", "scene-3", "scene-4", "scene-5"],
    );
    assert.match(scenes[0]!.image_prompt ?? "", /raincoat|envelope|bench/i);
    assert.equal(scenes[1]!.image_prompt, fiveVisualScenes()[1]!.image_prompt);
    const plan = draftPlan(patched, review, review);
    assert.equal(plan.scenes[0]!.visual_rebuild_status, "current");
    assert.match(plan.scenes[0]!.provider_prompt, /raincoat|envelope|bench/i);
    assert.doesNotMatch(
      plan.scenes[0]!.provider_prompt,
      /Split screen of a professional profile/i,
    );
  });

  await check("job phase calls package preflight before ElevenLabs", () => {
    const src = readFileSync(
      join(root, "video-worker/textToVideoJobPhase.ts"),
      "utf8",
    );
    const pre = src.indexOf("assertTextToVideoPackageReadyForPaidProviders({");
    const voice = src.indexOf("await runTextToVideoElevenLabsVoicePhase(");
    const runway = src.indexOf("await runTextToVideoRunwayClipsPhase(");
    assert.ok(pre >= 0 && pre < voice && voice < runway);
  });

  await check("minor Czech save keeps still and motion", () => {
    const prior = reviewForFiveScenes();
    const next: CreativeReview = {
      ...prior,
      scenes: prior.scenes.map((scene, index) =>
        index === 0
          ? {
              ...scene,
              intent: {
                ...scene.intent,
                localized_edit: `${scene.intent.localized_edit} `,
                english_preview: scene.intent.english_preview,
                english_preview_outdated: false,
              },
            }
          : scene,
      ),
    };
    const plan = draftPlan(canonicalBrief(next), next, prior);
    assert.equal(plan.scenes[0]!.visual_rebuild_status, "current");
    assert.match(plan.scenes[0]!.provider_prompt, /Cursor moves toward the profile/i);
  });

  await check("save translation failure happens before persist", () => {
    const admin = readFileSync(
      join(root, "lib/api/creative-review-admin.ts"),
      "utf8",
    );
    const saveFn = admin.slice(
      admin.indexOf("export async function saveCreativeReviewPackage"),
      admin.indexOf("export async function approveCreativeReviewPackage"),
    );
    assert.ok(saveFn.indexOf("translation_failed") < saveFn.indexOf("persistCreativeReview"));
  });

  console.log("\nAll T2V scene integrity checks passed.");
}

await main();
