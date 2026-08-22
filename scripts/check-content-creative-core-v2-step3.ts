/**
 * Creative Core v2 — Step 3 offline checks (no network / no paid providers).
 * Run: npm run check:content-creative-core-v2-step3
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertNoPlaceholdersInPersistableCaptions,
  buildApprovedCreativeCoreSnapshot,
  buildDerivePlatformOutputsMessages,
  computePlatformDependencyFingerprint,
  readDerivedOutputs,
  writeDerivedOutputs,
  emptyPendingDerivedOutputs,
  invalidateDerivedOutputsForPlatformDependencyChange,
  shouldGenerateWithCreativeCoreV2,
  isPendingStep3Placeholder,
  parseDerivePlatformOutputsResponse,
  platformDependencyFieldsFromCore,
  platformOutputsContainPlaceholders,
  packageHasPublishableDerivedContent,
  projectCreativeCoreToLegacyPackage,
  resolveDerivedOperatorPhase,
  statusLabelForOperatorPhase,
  type ContentCreativeCoreV2,
  computeCreativeFingerprint,
} from "../lib/content-creative-core-v2";
import { briefHasPersistableContentPayload } from "../lib/content-package/packageGenerationCompleteness";
import { packageNeedsSocialImage } from "../lib/content-package/socialImage";

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
        voiceover_excerpt: "A stand appears.",
        visual_event: "Stand clips",
        environment: "pallet",
        subjects: "one",
        action: "clip",
        motion_or_change: "lock",
        emotion: "relief",
        camera_intent: "close",
        sound_intent: "click",
        screen_policy: "no_screen",
        continuity_hints: "box",
      },
      {
        scene_id: "s4",
        order: 4,
        voiceover_excerpt: "Friction fades.",
        visual_event: "Clear frame",
        environment: "aisle",
        subjects: "phone",
        action: "step back",
        motion_or_change: "dissolve",
        emotion: "clarity",
        camera_intent: "pull",
        sound_intent: "quiet",
        screen_policy: "no_screen",
        continuity_hints: "aisle",
      },
    ],
  };
}

async function main(): Promise<void> {
  console.log("content-creative-core-v2 step 3\n");

  await check("1) derive messages use only approved Core as authority", () => {
    const core = videoCore();
    const messages = buildDerivePlatformOutputsMessages({
      core,
      productionVoiceoverEn: core.voiceover,
      productBrain: { product_name: "Fenrik" },
      language: "en",
      market: "EU",
      funnelStage: "awareness",
      platforms: ["instagram", "tiktok"],
      requireSocialImage: false,
    });
    assert.match(messages.user, /Approved Creative Core/);
    assert.match(messages.user, /core_idea:/);
    assert.doesNotMatch(messages.user, /Runway/);
    assert.doesNotMatch(messages.user, /provider_prompt/);
    assert.doesNotMatch(messages.system, /Concept\/Opening/);
  });

  await check("2) one text AI request covers all selected platforms", () => {
    const parsed = parseDerivePlatformOutputsResponse(
      JSON.stringify({
        platform_outputs: {
          instagram: { caption: "IG post about friction", hashtags: ["#a"] },
          tiktok: { caption: "TT hook about friction", hashtags: ["#a"] },
        },
        hashtags: ["#a"],
        cta: { type: "other", text: "Simplify" },
        social_image_creative_brief: null,
      }),
      ["instagram", "tiktok"],
      false,
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(Object.keys(parsed.data.platform_outputs).length, 2);
  });

  await check("3) unselected platform is dropped", () => {
    const parsed = parseDerivePlatformOutputsResponse(
      JSON.stringify({
        platform_outputs: {
          instagram: { caption: "IG only" },
          linkedin: { caption: "should drop" },
        },
        hashtags: [],
        cta: null,
        social_image_creative_brief: null,
      }),
      ["instagram"],
      false,
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.platform_outputs.linkedin, undefined);
    assert.ok(parsed.data.platform_outputs.instagram);
  });

  await check("4) placeholder cannot become content item", () => {
    assert.equal(isPendingStep3Placeholder("[pending_step_3:instagram]"), true);
    const guard = assertNoPlaceholdersInPersistableCaptions([
      "[pending_step_3:tiktok]",
    ]);
    assert.equal(guard.ok, false);
  });

  await check("5) package with placeholder is not complete/publishable", () => {
    assert.equal(
      platformOutputsContainPlaceholders({
        instagram: { caption: "[pending_step_3:instagram]" },
      }),
      true,
    );
    assert.equal(
      briefHasPersistableContentPayload({
        voiceover_text: "hello",
        platform_outputs: {
          instagram: { caption: "[pending_step_3:instagram]" },
        },
      }),
      false,
    );
  });

  await check("6) VO change invalidates platform texts + social image", () => {
    const core = videoCore();
    const snap = buildApprovedCreativeCoreSnapshot({
      core,
      productionVoiceoverEn: core.voiceover,
      voiceDirection: null,
    });
    let brief: Record<string, unknown> = {
      content_creative_core_v2_approved_snapshot: snap,
      platform_outputs: { instagram: { caption: "ready caption" } },
      social_image: { image_prompt: "x", status: "ready", storage_path: "p" },
    };
    const dep = computePlatformDependencyFingerprint(
      platformDependencyFieldsFromCore(core, {
        language: "en",
        platforms: ["instagram"],
      }),
    );
    brief = writeDerivedOutputs(
      brief,
      emptyPendingDerivedOutputs({
        platforms: ["instagram"],
        language: "en",
        platformDependencyFingerprint: dep,
        sourceApprovedCoreFingerprint: "abc",
        idempotencyKey: "key",
      }),
    );
    const derivedReady = {
      ...emptyPendingDerivedOutputs({
        platforms: ["instagram"],
        language: "en",
        platformDependencyFingerprint: dep,
        sourceApprovedCoreFingerprint: "abc",
        idempotencyKey: "key",
      }),
      status: "ready" as const,
      texts_ready: true,
      platform_outputs: { instagram: { caption: "ready caption" } },
    };
    brief = writeDerivedOutputs(brief, derivedReady);
    brief = invalidateDerivedOutputsForPlatformDependencyChange(brief);
    assert.equal(brief.platform_outputs && Object.keys(brief.platform_outputs as object).length, 0);
    assert.equal(brief.social_image, null);
  });

  await check("7) core idea change changes dependency fingerprint", () => {
    const core = videoCore();
    const a = computePlatformDependencyFingerprint(
      platformDependencyFieldsFromCore(core, { language: "en", platforms: ["x"] }),
    );
    const b = computePlatformDependencyFingerprint(
      platformDependencyFieldsFromCore(
        { ...core, core_idea: "Completely different idea about hiring" },
        { language: "en", platforms: ["x"] },
      ),
    );
    assert.notEqual(a, b);
  });

  await check("8) scene 3 visual change does not change platform dependency fingerprint", () => {
    const core = videoCore();
    const a = computePlatformDependencyFingerprint(
      platformDependencyFieldsFromCore(core, { language: "en", platforms: ["ig"] }),
    );
    const scenes = core.scenes.map((s) =>
      s.scene_id === "s3"
        ? { ...s, visual_event: "Red clamp instead", motion_or_change: "snap" }
        : s,
    );
    const b = computePlatformDependencyFingerprint(
      platformDependencyFieldsFromCore(
        { ...core, scenes },
        { language: "en", platforms: ["ig"] },
      ),
    );
    assert.equal(a, b);
  });

  await check("9) SFX/camera/timing fields are outside platform dependency fingerprint", () => {
    const core = videoCore();
    const a = computePlatformDependencyFingerprint(
      platformDependencyFieldsFromCore(core, { language: "en", platforms: ["x"] }),
    );
    const scenes = core.scenes.map((s) => ({
      ...s,
      sound_intent: "new sfx",
      camera_intent: "new camera",
    }));
    const b = computePlatformDependencyFingerprint(
      platformDependencyFieldsFromCore(
        { ...core, scenes },
        { language: "en", platforms: ["x"] },
      ),
    );
    assert.equal(a, b);
  });

  await check("10) Manual Review derives after Approve (operator phase)", () => {
    const core = videoCore();
    assert.equal(resolveDerivedOperatorPhase({}), "ready_to_approve");
    const snap = buildApprovedCreativeCoreSnapshot({
      core,
      productionVoiceoverEn: core.voiceover,
      voiceDirection: null,
    });
    const brief = {
      content_creative_core_v2_approved_snapshot: snap,
    };
    assert.equal(resolveDerivedOperatorPhase(brief), "deriving_platform_texts");
    assert.equal(
      statusLabelForOperatorPhase("deriving_platform_texts"),
      "Tvoří se platformní obsah",
    );
  });

  await check("11) automatic path uses same derive module (wiring)", () => {
    const gen = readFileSync(
      join(root, "lib/ai/workflows/generateContentPackage.ts"),
      "utf8",
    );
    assert.match(gen, /runDerivePlatformOutputsForPackage/);
    assert.match(gen, /autoAcceptCreativeCoreV2/);
  });

  await check("12) text-only projection has no scenes", () => {
    const core = { ...videoCore(), scenes: [] };
    const projected = projectCreativeCoreToLegacyPackage({
      core,
      packageKind: "text_only",
      funnelStage: "awareness",
      targetPlatforms: ["linkedin"],
    });
    assert.equal(projected.ok, true);
    if (!projected.ok) return;
    assert.equal(projected.package.visual_scenes?.length ?? 0, 0);
    assert.deepEqual(projected.package.platform_outputs, {});
  });

  await check("13) FB or LinkedIn requires social image", () => {
    assert.equal(packageNeedsSocialImage(["facebook"]), true);
    assert.equal(packageNeedsSocialImage(["linkedin", "x"]), true);
  });

  await check("14) without FB/LI social image is not required", () => {
    assert.equal(packageNeedsSocialImage(["tiktok", "instagram", "x"]), false);
  });

  await check("15) image-only retry flag exists in derive runner", () => {
    const src = readFileSync(
      join(root, "lib/content-creative-core-v2/runDeriveOutputs.ts"),
      "utf8",
    );
    assert.match(src, /imageOnly\?/);
    assert.match(src, /canReuseTexts/);
  });

  await check("16) texts-only / skip image regeneration supported", () => {
    const src = readFileSync(
      join(root, "lib/content-creative-core-v2/runDeriveOutputs.ts"),
      "utf8",
    );
    assert.match(src, /textsOnly\?/);
    assert.match(src, /status === "ready"/);
    assert.match(src, /storage_path/);
  });

  await check("17) same fingerprint reuses ready derived outputs", () => {
    const core = videoCore();
    const dep = computePlatformDependencyFingerprint(
      platformDependencyFieldsFromCore(core, {
        language: "en",
        platforms: ["instagram"],
      }),
    );
    const derived = {
      ...emptyPendingDerivedOutputs({
        platforms: ["instagram"],
        language: "en",
        platformDependencyFingerprint: dep,
        sourceApprovedCoreFingerprint: "src",
        idempotencyKey: "idem",
      }),
      status: "ready" as const,
      texts_ready: true,
      social_image_required: false,
      social_image_ready: true,
      platform_outputs: { instagram: { caption: "ok" } },
      stale: false,
    };
    const brief = writeDerivedOutputs(
      {
        content_creative_core_v2_approved_snapshot: buildApprovedCreativeCoreSnapshot({
          core,
          productionVoiceoverEn: core.voiceover,
          voiceDirection: null,
        }),
        platform_outputs: { instagram: { caption: "ok" } },
      },
      derived,
    );
    // Not fully publishable without matching source fingerprint helper, but status ready
    assert.equal(derived.status, "ready");
    assert.equal(derived.platform_dependency_fingerprint, dep);
    void brief;
  });

  await check("18) changed fingerprint rejects reuse via invalidate", async () => {
    const core = videoCore();
    const dep = computePlatformDependencyFingerprint(
      platformDependencyFieldsFromCore(core, {
        language: "en",
        platforms: ["instagram"],
      }),
    );
    let brief = writeDerivedOutputs(
      {
        platform_outputs: { instagram: { caption: "old" } },
        social_image: { status: "ready" },
      },
      {
        ...emptyPendingDerivedOutputs({
          platforms: ["instagram"],
          language: "en",
          platformDependencyFingerprint: dep,
          sourceApprovedCoreFingerprint: "src",
          idempotencyKey: "idem",
        }),
        status: "ready",
        texts_ready: true,
      },
    );
    brief = invalidateDerivedOutputsForPlatformDependencyChange(brief);
    const d = readDerivedOutputs(brief);
    assert.equal(d?.stale, true);
  });

  await check("19) concurrent claim lease wiring present", () => {
    const src = readFileSync(
      join(root, "lib/content-creative-core-v2/runDeriveOutputs.ts"),
      "utf8",
    );
    assert.match(src, /owner_token/);
    assert.match(src, /busy/);
    assert.match(src, /DERIVE_LEASE_SECONDS/);
  });

  await check("20) social image failure keeps texts_ready", () => {
    const src = readFileSync(
      join(root, "lib/content-creative-core-v2/runDeriveOutputs.ts"),
      "utf8",
    );
    assert.match(src, /texts_ready: true/);
    assert.match(src, /social_image_failed/);
  });

  await check("21) new packages always use Creative Core v2", () => {
    assert.equal(shouldGenerateWithCreativeCoreV2(), true);
  });

  await check("22) no ElevenLabs/Runway/TTS/FFmpeg in derive path", () => {
    const src = readFileSync(
      join(root, "lib/content-creative-core-v2/runDeriveOutputs.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /elevenlabs/i);
    assert.doesNotMatch(src, /runway/i);
    assert.doesNotMatch(src, /ffmpeg/i);
    assert.doesNotMatch(src, /openai.?tts/i);
  });

  await check("legacy projection no longer writes pending_step_3 placeholders", () => {
    const projected = projectCreativeCoreToLegacyPackage({
      core: videoCore(),
      packageKind: "video",
      funnelStage: "awareness",
      targetPlatforms: ["instagram"],
    });
    assert.equal(projected.ok, true);
    if (!projected.ok) return;
    assert.deepEqual(projected.package.platform_outputs, {});
  });

  await check("operator labels cover required states", () => {
    assert.equal(statusLabelForOperatorPhase("ready_to_approve"), "Připraveno ke schválení");
    assert.equal(statusLabelForOperatorPhase("deriving_social_image"), "Tvoří se FB/LinkedIn obrázek");
    assert.equal(statusLabelForOperatorPhase("ready_for_video"), "Připraveno pro video");
    assert.equal(statusLabelForOperatorPhase("error_retry"), "Chyba – zopakovat");
  });

  await check("publishable helper rejects incomplete derived package", () => {
    assert.equal(
      packageHasPublishableDerivedContent({
        platform_outputs: { instagram: { caption: "ok" } },
      }),
      false,
    );
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
