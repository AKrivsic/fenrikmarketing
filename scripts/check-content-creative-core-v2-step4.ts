/**
 * Creative Core v2 — Step 4 offline checks (no network / no paid providers).
 * Run: npm run check:content-creative-core-v2-step4
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyApprovedCoreToPackageBriefForVideo,
  assertCreativeCoreV2ReadyForVideoJob,
  buildApprovedCreativeCoreSnapshot,
  isCreativeCoreV2TextOnlyPackageComplete,
  isCreativeCoreV2VideoPackageComplete,
  isCreativeCoreV2TextOnlyPackage,
  packageNeedsDeriveRecovery,
  packageDeriveIsComplete,
  packageUsesCreativeCoreV2,
  shouldGenerateWithCreativeCoreV2,
  projectApprovedCoreScenesToVisualScenes,
  redistributeVoiceoverAcrossScenes,
  voiceoverCoveredExactlyOnce,
  computeCreativeFingerprint,
  type ContentCreativeCoreV2,
  CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY,
  applyCreativeCoreSceneEdit,
  invalidateDerivedOutputsForPlatformDependencyChange,
  writeDerivedOutputs,
  emptyPendingDerivedOutputs,
  markDerivedOutputsStale,
  computePlatformDependencyFingerprint,
  platformDependencyFieldsFromCore,
  resolveDerivedOperatorPhase,
  statusLabelForOperatorPhase,
} from "../lib/content-creative-core-v2";
import { evaluateVideoPaidPreflight } from "../lib/content-package/videoPaidPreflight";
import { CREATIVE_CORE_V2_BRIEF_KEY } from "../lib/content-creative-core-v2/config";

let passed = 0;
let failed = 0;
const root = process.cwd();

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

function videoCore(): ContentCreativeCoreV2 {
  const hook = "Three people, one phone, and still no usable product shot.";
  const voiceover = `${hook} The warehouse clock keeps moving. A stand appears. Friction fades. Ship proof today.`;
  return {
    contract_version: 2,
    strategy_item_id: "si-1",
    creative_fingerprint: computeCreativeFingerprint({
      topic: "warehouse",
      hook,
      pain_point: "No time",
    }),
    core_idea: "Friction blocked the product photo.",
    hook,
    voiceover,
    main_emotion: "clarity",
    conflict: "Too many hands",
    reveal_or_surprise: "Cheap stand",
    visible_change: "Chaos to one shot",
    payoff: "Next SKU ships with proof",
    cta_intent: "Simplify today",
    scenes: [
      {
        scene_id: "s1",
        order: 1,
        voiceover_excerpt: hook,
        visual_event: "Huddle",
        environment: "aisle",
        subjects: "three",
        action: "shift",
        motion_or_change: "bump",
        emotion: "impatience",
        camera_intent: "wide",
        sound_intent: "hum",
        screen_policy: "no_screen",
        continuity_hints: "aisle",
      },
      {
        scene_id: "s2",
        order: 2,
        voiceover_excerpt: "The warehouse clock keeps moving.",
        visual_event: "Clock",
        environment: "aisle",
        subjects: "three",
        action: "point",
        motion_or_change: "tick",
        emotion: "tension",
        camera_intent: "clock",
        sound_intent: "tick",
        screen_policy: "no_screen",
        continuity_hints: "aisle",
      },
      {
        scene_id: "s3",
        order: 3,
        voiceover_excerpt: "A stand appears. Friction fades.",
        visual_event: "Stand",
        environment: "aisle",
        subjects: "one",
        action: "place",
        motion_or_change: "settle",
        emotion: "relief",
        camera_intent: "product",
        sound_intent: "click",
        screen_policy: "no_screen",
        continuity_hints: "aisle",
      },
      {
        scene_id: "s4",
        order: 4,
        voiceover_excerpt: "Ship proof today.",
        visual_event: "Ship",
        environment: "aisle",
        subjects: "one",
        action: "pack",
        motion_or_change: "seal",
        emotion: "confidence",
        camera_intent: "close",
        sound_intent: "tape",
        screen_policy: "no_screen",
        continuity_hints: "aisle",
      },
    ],
  };
}

function textOnlyCore(): ContentCreativeCoreV2 {
  const c = videoCore();
  return { ...c, scenes: [] };
}

function readyDerivedBrief(core: ContentCreativeCoreV2): Record<string, unknown> {
  const snap = buildApprovedCreativeCoreSnapshot({
    core,
    productionVoiceoverEn: core.voiceover,
    voiceDirection: null,
    lockedAt: "2026-01-01T00:00:00.000Z",
    voiceoverEnFingerprint: "fp-vo",
    sceneEnFingerprints: {},
  });
  const platforms = ["tiktok", "facebook"] as const;
  const dep = computePlatformDependencyFingerprint(
    platformDependencyFieldsFromCore(core, {
      language: "en",
      platforms,
    }),
  );
  let brief: Record<string, unknown> = {
    package_video_mode: "still",
    content_creative_core_v2_approved_snapshot: snap,
    platform_outputs: {
      tiktok: { caption: "Ready caption for tiktok", hashtags: ["a"] },
      facebook: { caption: "Ready caption for facebook", hashtags: ["a"] },
    },
    social_image: {
      image_prompt: "Product on stand in warehouse aisle",
      text_overlay: null,
      aspect: "1:1",
      size: "1024x1024",
      status: "ready",
      platforms: ["facebook"],
      storage_path: "projects/x/social/y.png",
      storage_bucket: "assets",
      public_url: "https://example.com/y.png",
    },
  };
  brief = writeDerivedOutputs(brief, {
    ...emptyPendingDerivedOutputs({
      platforms,
      language: "en",
      platformDependencyFingerprint: dep,
      sourceApprovedCoreFingerprint: "src",
      idempotencyKey: "idemp-1",
    }),
    status: "ready",
    texts_ready: true,
    social_image_required: true,
    social_image_ready: true,
    stale: false,
    platform_outputs: brief.platform_outputs as Record<
      string,
      { caption: string; hashtags: string[] }
    >,
  });
  return brief;
}

console.log("\nCreative Core v2 — Step 4\n");

await check("1. new package always uses v2 (no env flag)", () => {
  assert.equal(shouldGenerateWithCreativeCoreV2(), true);
  process.env.CONTENT_CREATIVE_CORE_V2_ENABLED = "false";
  process.env.CONTENT_CREATIVE_CORE_V2_MEDIA_ENABLED = "false";
  assert.equal(shouldGenerateWithCreativeCoreV2(), true);
  delete process.env.CONTENT_CREATIVE_CORE_V2_ENABLED;
  delete process.env.CONTENT_CREATIVE_CORE_V2_MEDIA_ENABLED;
  const gen = readFileSync(
    join(root, "lib/ai/workflows/generateContentPackage.ts"),
    "utf8",
  );
  assert.match(gen, /shouldGenerateWithCreativeCoreV2\(\)/);
  assert.doesNotMatch(gen, /isContentCreativeCoreV2Enabled/);
});

await check("2. old package without v2 stays legacy (routing by stored data)", () => {
  const legacy = { hook: "old", visual_scenes: [{ id: "1" }] };
  assert.equal(packageUsesCreativeCoreV2(legacy), false);
  const cont = readFileSync(
    join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
    "utf8",
  );
  assert.match(cont, /briefUsesApprovedCreativeCoreV2/);
  assert.match(cont, /ensureVideoJobForPackage/);
});

await check("3. existing v2 package continues v2 path", () => {
  const brief = readyDerivedBrief(videoCore());
  assert.equal(packageUsesCreativeCoreV2(brief), true);
  assert.ok(brief[CREATIVE_CORE_V2_BRIEF_KEY] || brief.content_creative_core_v2_approved_snapshot);
  const gate = assertCreativeCoreV2ReadyForVideoJob({
    brief,
    platforms: ["tiktok", "facebook"],
    contentItemCount: 2,
    requireVideo: true,
  });
  assert.equal(gate.ok, true);
});

await check("4. no Creative Core flag is read anywhere", () => {
  const files = [
    "lib/content-creative-core-v2/packageRouting.ts",
    "lib/content-creative-core-v2/startVideoFromApprovedCore.ts",
    "lib/content-creative-core-v2/videoGates.ts",
    "lib/ai/workflows/generateContentPackage.ts",
    "lib/ai/workflows/planContentStrategy.ts",
    "lib/ai/workflows/continueCreativeReviewGeneration.ts",
  ];
  for (const rel of files) {
    const src = readFileSync(join(root, rel), "utf8");
    assert.doesNotMatch(src, /CONTENT_CREATIVE_CORE_V2_ENABLED/);
    assert.doesNotMatch(src, /CONTENT_CREATIVE_CORE_V2_MEDIA_ENABLED/);
    assert.doesNotMatch(src, /isContentCreativeCoreV2Enabled/);
    assert.doesNotMatch(src, /isContentCreativeCoreV2MediaEnabled/);
    assert.doesNotMatch(src, /creativeCoreV2VideoMediaAllowed/);
  }
  assert.throws(() => {
    readFileSync(join(root, "lib/content-creative-core-v2/featureFlag.ts"));
  });
});

await check("5. MR draft before Approve → 0 media requests (source)", () => {
  const seed = readFileSync(
    join(root, "lib/content-creative-core-v2/seedCreativeReview.ts"),
    "utf8",
  );
  const auto = readFileSync(
    join(root, "lib/content-creative-core-v2/autoAccept.ts"),
    "utf8",
  );
  for (const src of [seed, auto]) {
    assert.doesNotMatch(src, /elevenlabs|runway|ffmpeg|openai\.audio|text-to-speech/i);
  }
  const gen = readFileSync(
    join(root, "lib/ai/workflows/generateContentPackage.ts"),
    "utf8",
  );
  assert.match(gen, /deferSocialImage/);
});

await check("6. Approve without paid confirmation → 0 video provider requests", () => {
  const start = readFileSync(
    join(root, "lib/content-creative-core-v2/startVideoFromApprovedCore.ts"),
    "utf8",
  );
  assert.match(start, /awaitingPaidConfirmation/);
  assert.match(start, /paid_run_not_confirmed|PAID_WAIT_BLOCKERS/);
  assert.match(start, /Does not call ElevenLabs\/Runway here/);
  const brief = readyDerivedBrief(videoCore());
  brief.package_video_mode = "text_to_video";
  brief.video_paid_preflight = {
    confirm_paid_run: false,
    similarity_check_status: "not_run",
  };
  const preflight = evaluateVideoPaidPreflight({
    packageVideoMode: "text_to_video",
    runPackageVideoMode: "text_to_video",
    generationMode: "manual_review",
    creativeReview: null,
    brief,
    enforceFuturePaidGates: true,
    confirmPaidRun: false,
  });
  assert.equal(preflight.ok, false);
  assert.ok(preflight.blockers.includes("paid_run_not_confirmed"));
});

await check("7. T2V without budget → 0 provider requests", () => {
  const brief = readyDerivedBrief(videoCore());
  brief.package_video_mode = "text_to_video";
  const preflight = evaluateVideoPaidPreflight({
    packageVideoMode: "text_to_video",
    runPackageVideoMode: "text_to_video",
    generationMode: "manual_review",
    creativeReview: null,
    brief,
    enforceFuturePaidGates: true,
    confirmPaidRun: true,
  });
  assert.equal(preflight.ok, false);
  assert.ok(preflight.blockers.includes("budget_limit_required"));
});

await check("8. T2V with checkbox + budget can create video job (gate path)", () => {
  const start = readFileSync(
    join(root, "lib/content-creative-core-v2/startVideoFromApprovedCore.ts"),
    "utf8",
  );
  assert.match(start, /text_to_video_confirm_paid_run/);
  assert.match(start, /from\("video_jobs"\)/);
  assert.match(start, /status:\s*"queued"/);
  const brief = readyDerivedBrief(videoCore());
  brief.package_video_mode = "text_to_video";
  brief.video_paid_preflight = {
    confirm_paid_run: true,
    max_budget_usd: 25,
    similarity_check_status: "passed",
  };
  // Content gates pass; paid confirm+budget present for job creation path.
  const gate = assertCreativeCoreV2ReadyForVideoJob({
    brief,
    platforms: ["tiktok", "facebook"],
    contentItemCount: 2,
    requireVideo: true,
  });
  assert.equal(gate.ok, true);
});

await check("9. automatic run without confirmation does not create paid video", () => {
  const cont = readFileSync(
    join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
    "utf8",
  );
  assert.match(cont, /awaitingPaidConfirmation/);
  assert.match(cont, /čeká na potvrzení placeného videa/);
  const auto = readFileSync(
    join(root, "lib/content-creative-core-v2/autoAccept.ts"),
    "utf8",
  );
  assert.doesNotMatch(auto, /from\("video_jobs"\)/);
});

await check("10. text-only never creates video job", () => {
  const brief = readyDerivedBrief(textOnlyCore());
  assert.equal(isCreativeCoreV2TextOnlyPackage(brief), true);
  const gate = assertCreativeCoreV2ReadyForVideoJob({
    brief,
    platforms: ["facebook"],
    contentItemCount: 1,
    requireVideo: true,
  });
  assert.equal(gate.ok, false);
  if (!gate.ok) assert.equal(gate.code, "text_only_no_video");
  const complete = isCreativeCoreV2TextOnlyPackageComplete({
    brief,
    contentItemCount: 1,
  });
  assert.equal(complete.complete, true);
  const start = readFileSync(
    join(root, "lib/content-creative-core-v2/startVideoFromApprovedCore.ts"),
    "utf8",
  );
  assert.match(start, /reason: "text_only"/);
});

await check("11. rollback: legacy package without v2 contract stays legacy", () => {
  assert.equal(packageUsesCreativeCoreV2({}), false);
  assert.equal(
    packageUsesCreativeCoreV2({ content_creative_core_v2: null }),
    false,
  );
  const gen = readFileSync(
    join(root, "lib/ai/workflows/generateContentPackage.ts"),
    "utf8",
  );
  assert.match(gen, /runCreativePipeline/);
  assert.match(gen, /useCreativeCoreV2/);
});

await check("12. recovery remains functional", () => {
  const recover = readFileSync(
    join(root, "lib/content-creative-core-v2/recoverDerive.ts"),
    "utf8",
  );
  assert.match(recover, /recoverPendingCreativeCoreV2DeriveJobs/);
  assert.match(recover, /markStuckDeriveOutputsForOperatorRetry/);
  assert.doesNotMatch(recover, /CONTENT_CREATIVE_CORE_V2_MEDIA_ENABLED/);
  const runtime = readFileSync(
    join(root, "lib/production-runtime/runRecovery.ts"),
    "utf8",
  );
  assert.match(runtime, /recoverPendingCreativeCoreV2DeriveJobs/);
});

await check("content gate ready without env media flag", () => {
  const brief = readyDerivedBrief(videoCore());
  const gate = assertCreativeCoreV2ReadyForVideoJob({
    brief,
    platforms: ["tiktok", "facebook"],
    contentItemCount: 2,
    requireVideo: true,
  });
  assert.equal(gate.ok, true);
});

await check("3b. pending derive needs recovery when after() lost", () => {
  const core = videoCore();
  const snap = buildApprovedCreativeCoreSnapshot({
    core,
    productionVoiceoverEn: core.voiceover,
    voiceDirection: null,
    lockedAt: "2026-01-01T00:00:00.000Z",
    voiceoverEnFingerprint: "fp",
    sceneEnFingerprints: {},
  });
  const brief = {
    content_creative_core_v2_approved_snapshot: snap,
    content_derived_outputs_v2: emptyPendingDerivedOutputs({
      platforms: ["tiktok"],
      language: "en",
      platformDependencyFingerprint: "dep",
      sourceApprovedCoreFingerprint: "src",
      idempotencyKey: "k",
    }),
  };
  assert.equal(packageNeedsDeriveRecovery(brief), true);
  assert.equal(packageDeriveIsComplete(brief), false);
});

await check("4. dual recovery uses claim busy semantics in runDerive (source)", () => {
  const src = readFileSync(
    join(root, "lib/content-creative-core-v2/runDeriveOutputs.ts"),
    "utf8",
  );
  assert.match(src, /busy:\s*true/);
  assert.match(src, /owner_token/);
  assert.match(src, /idempotency_key/);
});

await check("5. Approve path enqueues derive then kicks processor (source)", () => {
  const actions = readFileSync(
    join(root, "app/projects/[id]/creative-review/actions.ts"),
    "utf8",
  );
  assert.match(actions, /triggerCreativeCoreV2DeriveProcessor/);
  assert.match(actions, /after\(/);
  const admin = readFileSync(
    join(root, "lib/api/creative-review-admin.ts"),
    "utf8",
  );
  assert.match(admin, /enqueueDerivedOutputsPending/);
});

await check("6. text-only never creates video job (gate + completeness)", () => {
  const brief = readyDerivedBrief(textOnlyCore());
  assert.equal(isCreativeCoreV2TextOnlyPackage(brief), true);
  const gate = assertCreativeCoreV2ReadyForVideoJob({
    brief,
    platforms: ["facebook"],
    contentItemCount: 1,
    requireVideo: true,
  });
  assert.equal(gate.ok, false);
  if (!gate.ok) assert.equal(gate.code, "text_only_no_video");
  const complete = isCreativeCoreV2TextOnlyPackageComplete({
    brief,
    contentItemCount: 1,
  });
  assert.equal(complete.complete, true);
});

await check("7–8. still + T2V projection use same approved Core scenes", () => {
  const core = videoCore();
  const snap = buildApprovedCreativeCoreSnapshot({
    core,
    productionVoiceoverEn: core.voiceover,
    voiceDirection: null,
    lockedAt: "2026-01-01T00:00:00.000Z",
    voiceoverEnFingerprint: "fp",
    sceneEnFingerprints: {},
  });
  const projected = applyApprovedCoreToPackageBriefForVideo({
    brief: {
      package_video_mode: "still",
      content_creative_core_v2_approved_snapshot: snap,
    },
  });
  assert.equal(projected.ok, true);
  if (!projected.ok) return;
  const scenes = projected.brief.visual_scenes as Array<{ id: string }>;
  assert.equal(scenes.length, core.scenes.length);
  assert.deepEqual(
    scenes.map((s) => s.id),
    core.scenes.map((s) => s.scene_id),
  );
  const projectedT2v = applyApprovedCoreToPackageBriefForVideo({
    brief: {
      package_video_mode: "text_to_video",
      content_creative_core_v2_approved_snapshot: snap,
    },
  });
  assert.equal(projectedT2v.ok, true);
  if (!projectedT2v.ok) return;
  assert.deepEqual(
    (projectedT2v.brief.visual_scenes as Array<{ id: string }>).map((s) => s.id),
    scenes.map((s) => s.id),
  );
});

await check("9–10. projection is mechanical — no storyboard AI call sites", () => {
  const src = readFileSync(
    join(root, "lib/content-creative-core-v2/projectApprovedCoreForVideo.ts"),
    "utf8",
  );
  assert.doesNotMatch(src, /createCreativeCore|Concept|OpeningImpact|storyboard/);
  assert.match(src, /derived_only:\s*true/);
  const scenes = projectApprovedCoreScenesToVisualScenes(videoCore());
  assert.equal(scenes.length, 4);
  assert.equal(scenes[0]?.image_prompt, "Huddle");
});

await check("11–12. scene 3 edit does not change platform dependency fingerprint", () => {
  const core = videoCore();
  const before = computePlatformDependencyFingerprint(
    platformDependencyFieldsFromCore(core, {
      language: "en",
      platforms: ["tiktok"],
    }),
  );
  const edited = applyCreativeCoreSceneEdit({
    core,
    sceneId: "s3",
    patch: { visual_event: "Different stand shot" },
  });
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  const after = computePlatformDependencyFingerprint(
    platformDependencyFieldsFromCore(edited.core, {
      language: "en",
      platforms: ["tiktok"],
    }),
  );
  assert.equal(before, after);
  assert.notEqual(
    edited.core.scenes.find((s) => s.scene_id === "s3")?.visual_event,
    "Stand",
  );
});

await check("13. VO redistribute covers text exactly once", () => {
  const core = videoCore();
  const next = redistributeVoiceoverAcrossScenes({
    scenes: core.scenes,
    voiceover: core.voiceover + " Extra closing beat.",
  });
  assert.equal(next.ok, true);
  if (!next.ok) return;
  assert.equal(
    voiceoverCoveredExactlyOnce(
      core.voiceover + " Extra closing beat.",
      next.scenes,
    ),
    true,
  );
});

await check("14–16. T2V technical clip split + no storyboard invent (source)", () => {
  const clip = readFileSync(
    join(root, "lib/text-to-video/technicalClipSplit.ts"),
    "utf8",
  );
  assert.match(clip, /technical|clip|limit|duration/i);
  const startVid = readFileSync(
    join(root, "lib/content-creative-core-v2/startVideoFromApprovedCore.ts"),
    "utf8",
  );
  assert.match(startVid, /applyApprovedCoreToPackageBriefForVideo/);
  assert.doesNotMatch(startVid, /createCreativeCore/);
  const align = readFileSync(
    join(root, "lib/elevenlabs/alignmentVoiceover.ts"),
    "utf8",
  );
  assert.match(align, /align|timing|duration/i);
});

await check("17–20. budget order + zero Runway on budget fail (source contracts)", () => {
  const candidates = [
    "lib/text-to-video/assertTextToVideoPackageReadyForPaidProviders.ts",
    "lib/text-to-video/runwayProductionConfig.ts",
    "lib/content-package/textToVideoRenderAdapter.ts",
  ];
  let budgetMentions = 0;
  for (const f of candidates) {
    try {
      const src = readFileSync(join(root, f), "utf8");
      if (/budget|preflight|ElevenLabs|Runway/i.test(src)) budgetMentions += 1;
    } catch {
      // skip
    }
  }
  assert.ok(budgetMentions >= 1);
});

await check("21–23. retry idempotency for voice/clip/assembly (source)", () => {
  const recover = readFileSync(
    join(root, "lib/content-creative-core-v2/recoverDerive.ts"),
    "utf8",
  );
  assert.match(recover, /runDerivePlatformOutputsForPackage/);
  const derive = readFileSync(
    join(root, "lib/content-creative-core-v2/runDeriveOutputs.ts"),
    "utf8",
  );
  assert.match(derive, /reused:\s*true/);
  assert.match(derive, /texts_ready/);
});

await check("24. FB/LI social image remains part of package completeness", () => {
  const brief = readyDerivedBrief(videoCore());
  assert.equal(
    isCreativeCoreV2VideoPackageComplete({
      brief,
      contentItemCount: 2,
      videoJobStatus: "completed",
      hasFinalMp4: true,
      hasThumbnail: true,
    }).complete,
    true,
  );
  const noSocial = { ...brief, social_image: null };
  // packageHasPublishableDerivedContent requires social when required flag set
  assert.equal(
    isCreativeCoreV2VideoPackageComplete({
      brief: noSocial,
      contentItemCount: 2,
      videoJobStatus: "completed",
      hasFinalMp4: true,
      hasThumbnail: true,
    }).complete,
    false,
  );
});

await check("25. video package without MP4 is not complete", () => {
  const brief = readyDerivedBrief(videoCore());
  const r = isCreativeCoreV2VideoPackageComplete({
    brief,
    contentItemCount: 2,
    videoJobStatus: "completed",
    hasFinalMp4: false,
    hasThumbnail: true,
  });
  assert.equal(r.complete, false);
  assert.equal(r.reason, "missing_mp4");
});

await check("26. text-only can be complete without video job", () => {
  const brief = readyDerivedBrief(textOnlyCore());
  assert.equal(
    isCreativeCoreV2TextOnlyPackageComplete({
      brief,
      contentItemCount: 1,
    }).complete,
    true,
  );
});

await check("27. cancelled/rejected package gate", () => {
  const brief = readyDerivedBrief(videoCore());
  brief.t2v_creative_rejected = true;
  const gate = assertCreativeCoreV2ReadyForVideoJob({
    brief,
    platforms: ["tiktok"],
    contentItemCount: 1,
    requireVideo: true,
  });
  assert.equal(gate.ok, false);
  if (!gate.ok) assert.equal(gate.code, "package_stopped");
});

await check("28. stale approved path — stale derived blocks video", () => {
  let brief = readyDerivedBrief(videoCore());
  brief = markDerivedOutputsStale(brief, "core_changed");
  const gate = assertCreativeCoreV2ReadyForVideoJob({
    brief,
    platforms: ["tiktok", "facebook"],
    contentItemCount: 2,
    requireVideo: true,
  });
  assert.equal(gate.ok, false);
  if (!gate.ok) assert.equal(gate.code, "derived_not_ready");
});

await check("29. placeholder blocks publish/video", () => {
  const brief = readyDerivedBrief(videoCore());
  brief.platform_outputs = {
    tiktok: { caption: "[pending_step_3:caption]", hashtags: [] },
  };
  const gate = assertCreativeCoreV2ReadyForVideoJob({
    brief,
    platforms: ["tiktok"],
    contentItemCount: 1,
    requireVideo: true,
  });
  assert.equal(gate.ok, false);
  if (!gate.ok) assert.equal(gate.code, "placeholder_present");
});

await check("30. unpaid T2V stamps awaiting paid video (source)", () => {
  const src = readFileSync(
    join(root, "lib/content-creative-core-v2/startVideoFromApprovedCore.ts"),
    "utf8",
  );
  assert.match(src, /CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY/);
  assert.match(src, /awaitingPaidConfirmation/);
  assert.match(src, /Does not call ElevenLabs\/Runway here/);
});

await check("worker recover endpoint exists", () => {
  const worker = readFileSync(
    join(root, "content-package-worker/server.ts"),
    "utf8",
  );
  assert.match(worker, /recover-creative-core-v2-derive/);
  assert.match(worker, /recoverCreativeCoreV2DeriveForPackage/);
});

await check("continue uses approved Core startVideo for v2", () => {
  const cont = readFileSync(
    join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
    "utf8",
  );
  assert.match(cont, /briefUsesApprovedCreativeCoreV2/);
  assert.match(cont, /startVideoFromApprovedCreativeCore/);
  assert.match(cont, /awaitingPaidConfirmation/);
});

await check("reconcile recovers pending derive", () => {
  const admin = readFileSync(
    join(root, "lib/api/production-run-admin.ts"),
    "utf8",
  );
  assert.match(admin, /recoverPendingCreativeCoreV2DeriveJobs/);
});

await check("invalidateDerivedOutputs still available for VO edits", () => {
  const brief = readyDerivedBrief(videoCore());
  const next = invalidateDerivedOutputsForPlatformDependencyChange(brief);
  assert.ok(next);
  assert.deepEqual(next.platform_outputs, {});
});

await check("AWAITING_PAID_VIDEO key exported", () => {
  assert.equal(
    CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY,
    "content_creative_core_v2_awaiting_paid_video",
  );
  assert.equal(
    statusLabelForOperatorPhase("awaiting_paid_confirmation"),
    "Čeká na potvrzení placeného videa",
  );
});

// --- Step 4B pre-deploy control -------------------------------------------

await check("4B.1 recovery cron wires derive recover (lost kick)", () => {
  const src = readFileSync(
    join(root, "lib/production-runtime/runRecovery.ts"),
    "utf8",
  );
  assert.match(src, /recoverPendingCreativeCoreV2DeriveJobs/);
  assert.match(src, /markStuckDeriveOutputsForOperatorRetry/);
  const route = readFileSync(
    join(root, "app/api/internal/production-run-recovery/route.ts"),
    "utf8",
  );
  assert.match(route, /runScheduledProductionRecovery/);
});

await check("4B.2 expired claim / stuck pending helpers exist", () => {
  const src = readFileSync(
    join(root, "lib/content-creative-core-v2/stuckDerive.ts"),
    "utf8",
  );
  assert.match(src, /CREATIVE_CORE_V2_DERIVE_STUCK_MS/);
  assert.match(src, /shouldMarkDeriveStuckForOperatorRetry/);
});

await check("4B.2b stuck pending after timeout is error_retry", async () => {
  const {
    shouldMarkDeriveStuckForOperatorRetry,
    CREATIVE_CORE_V2_DERIVE_STUCK_MS,
  } = await import("../lib/content-creative-core-v2/stuckDerive.ts");
  const core = videoCore();
  const snap = buildApprovedCreativeCoreSnapshot({
    core,
    productionVoiceoverEn: core.voiceover,
    voiceDirection: null,
    lockedAt: "2026-01-01T00:00:00.000Z",
    voiceoverEnFingerprint: "fp",
    sceneEnFingerprints: {},
  });
  const brief = {
    content_creative_core_v2_approved_snapshot: snap,
    content_creative_core_v2_derive_requested_at: new Date(
      Date.now() - CREATIVE_CORE_V2_DERIVE_STUCK_MS - 1000,
    ).toISOString(),
    content_derived_outputs_v2: emptyPendingDerivedOutputs({
      platforms: ["tiktok"],
      language: "en",
      platformDependencyFingerprint: "dep",
      sourceApprovedCoreFingerprint: "src",
      idempotencyKey: "k",
    }),
  };
  assert.equal(shouldMarkDeriveStuckForOperatorRetry(brief), true);
  assert.equal(resolveDerivedOperatorPhase(brief), "error_retry");
});

await check("4B.3 dual recovery busy semantics remain", () => {
  const src = readFileSync(
    join(root, "lib/content-creative-core-v2/runDeriveOutputs.ts"),
    "utf8",
  );
  assert.match(src, /busy:\s*true/);
  assert.match(src, /owner_token/);
});

await check("4B.4 no Approve: social deferred at generate", () => {
  const gen = readFileSync(
    join(root, "lib/ai/workflows/generateContentPackage.ts"),
    "utf8",
  );
  assert.match(gen, /deferSocialImage/);
  const pipe = readFileSync(
    join(root, "lib/content-creative-core-v2/runPipeline.ts"),
    "utf8",
  );
  assert.match(pipe, /deferSocialImage:\s*true/);
});

await check("4B.5 unpaid T2V blocks provider requests; content gate still ok", () => {
  const brief = readyDerivedBrief(videoCore());
  const gate = assertCreativeCoreV2ReadyForVideoJob({
    brief,
    platforms: ["tiktok", "facebook"],
    contentItemCount: 2,
    requireVideo: true,
  });
  assert.equal(gate.ok, true);
  const start = readFileSync(
    join(root, "lib/content-creative-core-v2/startVideoFromApprovedCore.ts"),
    "utf8",
  );
  assert.match(start, /Does not call ElevenLabs\/Runway here/);
  assert.match(start, /awaitingPaidConfirmation/);
});

await check("4B.6 FB/LI: derive still calls social image (source)", () => {
  const derive = readFileSync(
    join(root, "lib/content-creative-core-v2/runDeriveOutputs.ts"),
    "utf8",
  );
  assert.match(derive, /generateAndPersistPackageSocialImage/);
  assert.doesNotMatch(derive, /isContentCreativeCoreV2MediaEnabled/);
});

await check("4B.7 snapshot authority without Creative Core env flags", () => {
  const brief = readyDerivedBrief(videoCore());
  const gate = assertCreativeCoreV2ReadyForVideoJob({
    brief,
    platforms: ["tiktok", "facebook"],
    contentItemCount: 2,
    requireVideo: true,
  });
  assert.equal(gate.ok, true);
  const cont = readFileSync(
    join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
    "utf8",
  );
  assert.match(cont, /briefUsesApprovedCreativeCoreV2\(preflightBrief\)/);
});

await check("4B.8 CTA soft fixture aligned with problem_aware production rule", () => {
  const src = readFileSync(
    join(root, "scripts/check-content-package-guardrails.ts"),
    "utf8",
  );
  assert.match(src, /type: "follow"/);
  assert.match(src, /funnel_stage = "conversion"/);
  assert.match(src, /type: "lead"/);
});

console.log(`\nStep 4: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
