// Product UI presentation templates, double-framing guard, layout metrics.
//   npm run check:product-ui-presentation

import assert from "node:assert/strict";
import sharp from "sharp";
import {
  inferDeviceFrameFromSignals,
  inferStructuralPhoneFrame,
  readDeviceFrameMetadata,
} from "@/lib/assets/deviceFrameMetadata";
import {
  applyProductUiPresentationGuard,
  isReliableProductUiAsset,
  productUiRequiresStaticMotion,
} from "@/lib/assets/productUiGuards";
import {
  resolveBeatMotionPlan,
} from "@/lib/video-engine/semanticMotion/resolveSceneMotion";
import { buildFinalLayoutPreviewInfo } from "@/lib/video-scene-editor/previewFinalLayout";
import { resolveScenePresentation } from "@/lib/video-scene-editor/scenePresentationOverride";
import {
  MIN_EFFECTIVE_UI_HEIGHT_RATIO,
  PRESENTATION_TEMPLATE_LABELS,
  preventDoubleFraming,
  resolvePresentationFromMetadata,
  resolvePresentationTemplate,
  sceneIntentRequestsDeviceMockup,
  presentationTemplateToVideoUsage,
} from "@/lib/assets/presentationTemplate";
import { isFramedProductVideoUsage } from "@/lib/assets/preferredVideoUsage";
import { refreshDraftScenesVideoUsage } from "@/lib/video-scene-editor/resolveDraftSceneVideoUsage";
import type { SceneEditorDraftScene } from "@/lib/video-scene-editor/metadata";
import {
  composeAssetSceneStill,
  estimateComposedUiHeightRatio,
  shouldComposeAssetLayout,
} from "@/video-worker/services/assetSceneLayout";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

async function checkAsync(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

section("Frame detection");

check("AI description phone mockup -> contains_phone_frame", () => {
  const f = inferDeviceFrameFromSignals({
    aiDescription:
      "Mobile app screen shown inside a phone mockup with black smartphone frame",
  });
  assert.equal(f.contains_phone_frame, true);
  assert.equal(f.contains_device_frame, true);
});

check("browser chrome in description", () => {
  const f = inferDeviceFrameFromSignals({
    aiDescription: "Dashboard in a browser window with browser chrome and tabs",
  });
  assert.equal(f.contains_browser_frame, true);
});

section("Presentation mapping");

check("1 raw mobile product_ui portrait -> UI_HERO default", () => {
  const { template, videoUsage } = resolvePresentationFromMetadata({
    product_role: "product_ui",
    capture_viewport: "mobile",
    orientation: "portrait",
    width: 390,
    height: 844,
    ai_description: "Mobile banking app transfer screen screenshot",
    detected_content_type: "screenshot",
  });
  assert.equal(template, "UI_HERO");
  assert.equal(videoUsage, "ui_hero");
});

check("2 raw mobile + explicit phone intent -> DEVICE_MOCKUP", () => {
  const { template } = resolvePresentationFromMetadata(
    {
      product_role: "product_ui",
      width: 1080,
      height: 1920,
      orientation: "portrait",
      ai_description: "App UI screenshot",
    },
    { scene: { usedAs: "Show inside phone mockup during product reveal" } },
  );
  assert.equal(template, "DEVICE_MOCKUP");
});

check("3 asset already has phone frame -> UI_HERO never mockup", () => {
  const meta = {
    product_role: "product_ui",
    width: 298,
    height: 626,
    contains_phone_frame: true,
    contains_device_frame: true,
    ai_description: "RightCard app in black phone frame",
  };
  const auto = resolvePresentationFromMetadata(meta);
  assert.equal(auto.template, "UI_HERO");
  const withIntent = resolvePresentationFromMetadata(meta, {
    scene: { usedAs: "Phone mockup insert" },
  });
  assert.equal(withIntent.template, "UI_HERO");
  const guarded = preventDoubleFraming(readDeviceFrameMetadata(meta), "DEVICE_MOCKUP");
  assert.equal(guarded.template, "UI_HERO");
});

check("4 browser screenshot -> no second browser frame", () => {
  const meta = {
    product_role: "dashboard",
    contains_browser_frame: true,
    contains_device_frame: true,
    ai_description: "Analytics in browser chrome",
    width: 1365,
    height: 768,
  };
  const { template } = resolvePresentationFromMetadata(meta);
  assert.equal(template, "UI_HERO");
  const g = preventDoubleFraming(readDeviceFrameMetadata(meta), "DESKTOP_FRAME");
  assert.equal(g.template, "UI_HERO");
});

check("5 laptop mockup asset -> no laptop frame added", () => {
  const meta = {
    contains_laptop_frame: true,
    contains_device_frame: true,
    product_role: "dashboard",
    ai_description: "SaaS dashboard on laptop mockup",
  };
  const g = preventDoubleFraming(readDeviceFrameMetadata(meta), "DESKTOP_FRAME");
  assert.equal(g.template, "UI_HERO");
});

check("6 contains_device_frame + requested framed_phone -> guard downgrade", () => {
  const meta = { contains_device_frame: true, contains_phone_frame: true };
  const g = preventDoubleFraming(readDeviceFrameMetadata(meta), "DEVICE_MOCKUP");
  assert.equal(g.template, "UI_HERO");
  assert.ok(g.guardNote?.includes("UI Hero"));
});

check("7 tiny asset device mockup intent -> readability downgrade UI_HERO", () => {
  const { template } = resolvePresentationFromMetadata(
    {
      product_role: "product_ui",
      width: 40,
      height: 40,
      orientation: "portrait",
      ai_description: "Tiny icon",
    },
    { scene: { usedAs: "Show inside phone mockup" } },
  );
  assert.equal(template, "UI_HERO");
});

check("8 dashboard without frame -> DESKTOP_FRAME", () => {
  const { template } = resolvePresentationFromMetadata({
    product_role: "dashboard",
    width: 1440,
    height: 900,
    orientation: "landscape",
    ai_description: "Raw analytics dashboard screenshot",
    detected_content_type: "screenshot",
  });
  assert.equal(template, "DESKTOP_FRAME");
});

check("9 dashboard with browser frame -> UI_HERO", () => {
  const { template } = resolvePresentationFromMetadata({
    product_role: "dashboard",
    contains_browser_frame: true,
    contains_device_frame: true,
    ai_description: "Dashboard inside browser window",
  });
  assert.equal(template, "UI_HERO");
});

check("10 lifestyle photo -> FULLSCREEN_PHOTO", () => {
  const { template, videoUsage } = resolvePresentationFromMetadata({
    product_role: "hero_image",
    orientation: "portrait",
    safe_vertical_usage: true,
    ai_description: "Lifestyle portrait marketing photo",
  });
  assert.equal(template, "FULLSCREEN_PHOTO");
  assert.equal(videoUsage, "fullscreen");
});

section("Product UI guardrails");

check("product_ui + mobile never FULLSCREEN_PHOTO (safe_vertical)", () => {
  const meta = {
    product_role: "product_ui",
    capture_viewport: "mobile",
    orientation: "portrait",
    width: 298,
    height: 626,
    safe_vertical_usage: true,
    ai_description: "RightCard mobile app recommendation screen",
    detected_content_type: "screenshot",
  };
  assert.equal(isReliableProductUiAsset(meta), true);
  const { template, videoUsage } = resolvePresentationFromMetadata(meta);
  assert.equal(template, "UI_HERO");
  assert.equal(videoUsage, "ui_hero");
});

check("old fullscreen draft coerces to ui_hero on refresh", () => {
  const assetMeta = {
    product_role: "product_ui",
    capture_viewport: "mobile",
    width: 298,
    height: 626,
    orientation: "portrait",
    ai_description: "Mobile app UI",
  };
  const scenes: SceneEditorDraftScene[] = [
    {
      id: "s1",
      image_prompt: "Beat",
      image_bucket: "b",
      image_path: "p.png",
      duration_seconds: 4,
      video_usage: "fullscreen",
      asset_id: "a1",
      presentation_override: "FULLSCREEN_PHOTO",
    },
  ];
  const refreshed = refreshDraftScenesVideoUsage(
    scenes,
    new Map([["a1", { id: "a1", title: "RC", metadata: assetMeta }]]),
  );
  assert.equal(refreshed[0]?.video_usage, "ui_hero");
});

check("product_ui fullscreen override still static motion", () => {
  const meta = {
    product_role: "product_ui",
    width: 298,
    height: 626,
    capture_viewport: "mobile",
  };
  assert.equal(productUiRequiresStaticMotion(meta), true);
  const plan = resolveBeatMotionPlan({
    beatIndex: 0,
    beatCount: 3,
    sceneId: "scene-1",
    sceneType: "IMAGE",
    sceneIndex: 0,
    sceneCount: 1,
    narrativeRole: "hook",
    videoUsage: "fullscreen",
    assetMetadata: meta,
  });
  assert.equal(plan.motion_primitive, "static");
});

check("RightCard-like portrait infers phone frame without mockup phrase", () => {
  const meta = {
    product_role: "product_ui",
    capture_viewport: "mobile",
    preferred_presentation: "phone_screen",
    width: 298,
    height: 626,
    orientation: "portrait",
    ai_description: "RightCard app showing Shell card recommendation",
    detected_content_type: "app interface screenshot",
  };
  assert.equal(inferStructuralPhoneFrame(meta), true);
  const frame = readDeviceFrameMetadata(meta);
  assert.equal(frame.contains_phone_frame, true);
  assert.equal(frame.contains_device_frame, true);
});

check("manual device frame yes -> UI_HERO and phone frame", () => {
  const meta = {
    product_role: "product_ui",
    capture_viewport: "mobile",
    width: 298,
    height: 626,
    device_frame_in_asset: "yes",
    manual_overrides: { device_frame_in_asset: true },
  };
  const frame = readDeviceFrameMetadata(meta);
  assert.equal(frame.contains_phone_frame, true);
  const { template } = resolvePresentationFromMetadata(meta);
  assert.equal(template, "UI_HERO");
});

check("preview info matches static UI Hero for RightCard", () => {
  const meta = {
    product_role: "product_ui",
    capture_viewport: "mobile",
    width: 298,
    height: 626,
    orientation: "portrait",
    ai_description: "RightCard mobile app in black phone frame",
    detected_content_type: "screenshot",
  };
  const presentation = resolveScenePresentation({
    assetMetadata: meta,
    assetTitle: "RightCard",
    scene: { image_prompt: "Product beat", presentation_override: "automatic" },
  });
  const info = buildFinalLayoutPreviewInfo({
    assetMetadata: meta,
    assetWidth: 298,
    assetHeight: 626,
    presentation,
  });
  assert.equal(info.template, "UI_HERO");
  assert.equal(info.videoUsage, "ui_hero");
  assert.equal(info.motionLabel, "Static");
  assert.equal(info.deviceFrameDetected, true);
  assert.equal(presentation.doubleFramingPrevented, true);
  assert.ok(info.effectiveUiAreaPercent !== null && info.effectiveUiAreaPercent >= 60);
});

check("applyProductUiPresentationGuard coerces fullscreen", () => {
  const meta = { product_role: "product_ui", capture_viewport: "mobile" };
  const out = applyProductUiPresentationGuard(meta, {
    template: "FULLSCREEN_PHOTO",
    videoUsage: "fullscreen",
  });
  assert.equal(out.template, "UI_HERO");
  assert.equal(out.videoUsage, "ui_hero");
  assert.equal(out.coercedFromFullscreen, true);
});

section("Layout & motion");

checkAsync("11 UI_HERO meets minimum effective UI height for 298x626", async () => {
  const ratio = estimateComposedUiHeightRatio({
    assetWidth: 298,
    assetHeight: 626,
    videoUsage: "ui_hero",
  });
  assert.ok(ratio >= MIN_EFFECTIVE_UI_HEIGHT_RATIO);
  const buf = await sharp({
    create: {
      width: 298,
      height: 626,
      channels: 3,
      background: { r: 30, g: 30, b: 30 },
    },
  })
    .png()
    .toBuffer();
  const out = await composeAssetSceneStill({
    assetBytes: buf,
    videoUsage: "ui_hero",
    assetMetadata: {
      contains_phone_frame: true,
      contains_device_frame: true,
    },
  });
  const meta = await sharp(out).metadata();
  assert.equal(meta.width, SHORT_PROFILE.width);
  assert.equal(meta.height, SHORT_PROFILE.height);
});

check("12 draft framed_phone + framed asset -> re-render ui_hero", () => {
  const assetMeta = {
    product_role: "product_ui",
    width: 298,
    height: 626,
    contains_phone_frame: true,
    contains_device_frame: true,
    ai_description: "Phone mockup marketing image",
  };
  const scenes: SceneEditorDraftScene[] = [
    {
      id: "s1",
      image_prompt: "Product beat",
      image_bucket: "b",
      image_path: "p.png",
      duration_seconds: 4,
      video_usage: "framed_phone",
      asset_id: "a1",
    },
  ];
  const refreshed = refreshDraftScenesVideoUsage(
    scenes,
    new Map([["a1", { id: "a1", title: "RC", metadata: assetMeta }]]),
  );
  assert.equal(refreshed[0]?.video_usage, "ui_hero");
});

check("13 Product UI ui_hero uses composed still + static motion class", () => {
  assert.equal(shouldComposeAssetLayout("ui_hero"), true);
  assert.equal(isFramedProductVideoUsage("ui_hero"), true);
  assert.equal(shouldComposeAssetLayout("fullscreen"), false);
});

check("14 hero fullscreen unchanged for marketing photo", () => {
  const { videoUsage } = resolvePresentationFromMetadata({
    product_role: "hero_image",
    ai_description: "Team hero banner",
  });
  assert.equal(videoUsage, "fullscreen");
});

section("RightCard validation");

check("RightCard metadata resolves UI_HERO", () => {
  const rightCardMeta = {
    product_role: "product_ui",
    capture_viewport: "mobile",
    width: 298,
    height: 626,
    orientation: "portrait",
    contains_phone_frame: true,
    contains_device_frame: true,
    ai_description:
      "RightCard mobile recommendation app displayed inside a black smartphone frame with visible bezels",
    detected_content_type: "screenshot",
  };
  const { template, videoUsage } = resolvePresentationFromMetadata(rightCardMeta);
  assert.equal(template, "UI_HERO");
  assert.equal(videoUsage, "ui_hero");
  assert.equal(
    presentationTemplateToVideoUsage(template),
    "ui_hero",
  );
  assert.equal(
    PRESENTATION_TEMPLATE_LABELS[template],
    "UI Hero (large, no extra frame)",
  );
});

checkAsync("RightCard compose: large UI, no double phone chrome", async () => {
  const buf = await sharp({
    create: {
      width: 298,
      height: 626,
      channels: 3,
      background: { r: 20, g: 20, b: 24 },
    },
  })
    .png()
    .toBuffer();
  const meta = {
    contains_phone_frame: true,
    contains_device_frame: true,
    product_role: "product_ui",
  };
  const out = await composeAssetSceneStill({
    assetBytes: buf,
    videoUsage: "ui_hero",
    assetMetadata: meta,
  });
  const ratio = estimateComposedUiHeightRatio({
    assetWidth: 298,
    assetHeight: 626,
    videoUsage: "ui_hero",
  });
  assert.ok(ratio >= MIN_EFFECTIVE_UI_HEIGHT_RATIO);
  assert.ok(out.length > buf.length);
});

check("sceneIntentRequestsDeviceMockup detects explicit phrasing", () => {
  assert.equal(
    sceneIntentRequestsDeviceMockup("Show inside phone during beat 3", null),
    true,
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
