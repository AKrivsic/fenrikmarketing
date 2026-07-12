// Manual upload metadata: preferred usage, viewport inference, role, draft refresh.
//   npm run check:manual-asset-metadata

import assert from "node:assert/strict";
import sharp from "sharp";
import {
  computePreferredVideoUsage,
  resolvePreferredVideoUsageFromMetadata,
} from "@/lib/assets/preferredVideoUsage";
import { inferCaptureViewport } from "@/lib/assets/inferCaptureViewport";
import { applyInferredProductRoleIfAllowed } from "@/lib/ai/workflows/analyzeAsset";
import { withManualOverride } from "@/lib/assets/manualOverrides";
import { refreshDraftScenesVideoUsage } from "@/lib/video-scene-editor/resolveDraftSceneVideoUsage";
import type { SceneEditorDraftScene } from "@/lib/video-scene-editor/metadata";
import { composeAssetSceneStill } from "@/video-worker/services/assetSceneLayout";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import { computeSmartUsageMetadata } from "@/lib/assets/smartUsageMetadata";
import type { Json } from "@/lib/supabase/types";

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

section("A. preferredVideoUsage");

check("product_ui + phone_screen + portrait + safe_vertical -> framed_phone", () => {
  assert.equal(
    computePreferredVideoUsage({
      productRole: "product_ui",
      captureViewport: null,
      safeVerticalUsage: true,
      videoSuitability: "primary_scene",
      orientation: "portrait",
      width: 300,
      height: 626,
      preferredPresentation: "phone_screen",
    }),
    "framed_phone",
  );
});

check("mobile viewport + UI screenshot -> framed_phone", () => {
  assert.equal(
    computePreferredVideoUsage({
      productRole: null,
      captureViewport: "mobile",
      safeVerticalUsage: true,
      videoSuitability: "screen_insert",
      orientation: "portrait",
      width: 300,
      height: 626,
      detectedContentType: "screenshot",
      aiDescription: "Mobile app UI showing cards",
    }),
    "framed_phone",
  );
});

check("dashboard + portrait + safe_vertical -> framed_screen", () => {
  assert.equal(
    computePreferredVideoUsage({
      productRole: "dashboard",
      captureViewport: null,
      safeVerticalUsage: true,
      videoSuitability: "screen_insert",
      orientation: "portrait",
      width: 300,
      height: 626,
    }),
    "framed_screen",
  );
});

check("portrait lifestyle photo + safe_vertical -> fullscreen", () => {
  assert.equal(
    computePreferredVideoUsage({
      productRole: null,
      captureViewport: null,
      safeVerticalUsage: true,
      videoSuitability: "unknown",
      orientation: "portrait",
      width: 800,
      height: 1200,
      detectedContentType: "photo",
      aiDescription: "Portrait lifestyle marketing photo",
    }),
    "fullscreen",
  );
});

check("manual preferred_video_usage fullscreen stamp", () => {
  const meta = { preferred_video_usage: "fullscreen" } as Json;
  assert.equal(resolvePreferredVideoUsageFromMetadata(meta), "fullscreen");
});

check("manual preferred_video_usage framed_phone stamp", () => {
  const meta = { preferred_video_usage: "framed_phone" } as Json;
  assert.equal(resolvePreferredVideoUsageFromMetadata(meta), "framed_phone");
});

section("B. viewport inference");

check("300x626 mobile app description -> mobile", () => {
  const smart = computeSmartUsageMetadata({
    width: 300,
    height: 626,
    productRole: "product_ui",
    title: "RightCard",
    detectedContentType: "screenshot",
    aiDescription: "Mobile application interface for card recommendations",
    source: "upload",
  });
  const inferred = inferCaptureViewport({
    metadata: {
      width: 300,
      height: 626,
      detected_content_type: "screenshot",
      ai_description: "Mobile application interface for card recommendations",
      product_role: "product_ui",
    },
    smart,
    title: "RightCard",
  });
  assert.equal(inferred, "mobile");
});

check("1365x768 dashboard screenshot -> desktop", () => {
  const smart = computeSmartUsageMetadata({
    width: 1365,
    height: 768,
    productRole: "dashboard",
    detectedContentType: "screenshot",
    aiDescription: "Desktop analytics dashboard",
    source: "upload",
  });
  const inferred = inferCaptureViewport({
    metadata: {
      width: 1365,
      height: 768,
      detected_content_type: "screenshot",
      ai_description: "Desktop analytics dashboard",
      product_role: "dashboard",
    },
    smart,
  });
  assert.equal(inferred, "desktop");
});

check("300x626 lifestyle photo -> no viewport", () => {
  const smart = computeSmartUsageMetadata({
    width: 300,
    height: 626,
    title: "Portrait",
    aiDescription: "Lifestyle portrait photo",
    detectedContentType: "photo",
    source: "upload",
  });
  const inferred = inferCaptureViewport({
    metadata: {
      width: 300,
      height: 626,
      ai_description: "Lifestyle portrait photo",
      detected_content_type: "photo",
    },
    smart,
  });
  assert.equal(inferred, null);
});

check("manual capture_viewport override not inferred over", () => {
  let meta: Record<string, unknown> = {
    width: 300,
    height: 626,
    capture_viewport: "desktop",
  };
  meta = withManualOverride(meta, "capture_viewport", true);
  const smart = computeSmartUsageMetadata({
    width: 300,
    height: 626,
    productRole: "product_ui",
    aiDescription: "Mobile app UI",
    detectedContentType: "screenshot",
    source: "upload",
  });
  const inferred = inferCaptureViewport({ metadata: meta, smart });
  assert.equal(inferred, null);
  assert.equal(meta.capture_viewport, "desktop");
});

section("C. product role inference");

check("mobile application interface -> product_ui", () => {
  const next = applyInferredProductRoleIfAllowed(
    {
      detected_content_type: "screenshot",
      ai_description: "Mobile application interface with card list",
    },
    "RightCard",
  );
  assert.equal(next.product_role, "product_ui");
});

check("desktop analytics dashboard -> dashboard", () => {
  const next = applyInferredProductRoleIfAllowed(
    {
      detected_content_type: "screenshot",
      ai_description: "Desktop analytics dashboard with charts",
    },
    "Analytics",
  );
  assert.equal(next.product_role, "dashboard");
});

check("locked product_role not overwritten", () => {
  const next = applyInferredProductRoleIfAllowed(
    {
      product_role: "dashboard",
      product_role_locked: true,
      ai_description: "Mobile application interface",
    },
    "App",
  );
  assert.equal(next.product_role, "dashboard");
});

section("D. render layout");

async function main(): Promise<void> {
  const portrait = await sharp({
    create: {
      width: 300,
      height: 626,
      channels: 3,
      background: { r: 30, g: 90, b: 200 },
    },
  })
    .png()
    .toBuffer();

  await checkAsync("framed_phone portrait asset fully inside canvas", async () => {
    const out = await composeAssetSceneStill({
      assetBytes: portrait,
      videoUsage: "framed_phone",
    });
    const meta = await sharp(out).metadata();
    assert.equal(meta.width, SHORT_PROFILE.width);
    assert.equal(meta.height, SHORT_PROFILE.height);
  });

  await checkAsync("framed_screen composes without error", async () => {
    const landscape = await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 3,
        background: { r: 40, g: 120, b: 200 },
      },
    })
      .png()
      .toBuffer();
    const out = await composeAssetSceneStill({
      assetBytes: landscape,
      videoUsage: "framed_screen",
    });
    const meta = await sharp(out).metadata();
    assert.equal(meta.height, SHORT_PROFILE.height);
  });

  await checkAsync("fullscreen returns raw asset bytes", async () => {
    const out = await composeAssetSceneStill({
      assetBytes: portrait,
      videoUsage: "fullscreen",
    });
    assert.equal(out.length, portrait.length);
  });

  section("E. scene rerender video_usage refresh");

  check("draft scene refreshes video_usage from asset metadata", () => {
    const scenes: SceneEditorDraftScene[] = [
      {
        id: "scene-1",
        image_prompt: "UI",
        image_bucket: "project-assets",
        image_path: "p.png",
        duration_seconds: 4,
        asset_id: "asset-1",
        video_usage: "fullscreen",
      },
    ];
    const assets = new Map([
      [
        "asset-1",
        {
          id: "asset-1",
          title: "RightCard",
          metadata: {
            width: 300,
            height: 626,
            orientation: "portrait",
            product_role: "product_ui",
            preferred_presentation: "phone_screen",
            safe_vertical_usage: true,
            video_suitability: "primary_scene",
            detected_content_type: "screenshot",
            ai_description: "Mobile app UI",
          } as Json,
        },
      ],
    ]);
    const refreshed = refreshDraftScenesVideoUsage(scenes, assets);
    assert.equal(refreshed[0]?.video_usage, "framed_phone");
  });

  check("video_usage_locked preserves override on refresh", () => {
    const scenes: SceneEditorDraftScene[] = [
      {
        id: "scene-1",
        image_prompt: "UI",
        image_bucket: "b",
        image_path: "p",
        duration_seconds: 4,
        asset_id: "asset-1",
        video_usage: "fullscreen",
        video_usage_locked: true,
      },
    ];
    const assets = new Map([
      [
        "asset-1",
        {
          id: "asset-1",
          title: "X",
          metadata: {
            product_role: "product_ui",
            preferred_presentation: "phone_screen",
          } as Json,
        },
      ],
    ]);
    const refreshed = refreshDraftScenesVideoUsage(scenes, assets);
    assert.equal(refreshed[0]?.video_usage, "fullscreen");
  });

  section("RightCard classification smoke");

  check("RightCard-like metadata resolves framed_phone", () => {
    const meta = {
      width: 300,
      height: 626,
      orientation: "portrait",
      product_role: "product_ui",
      capture_viewport: "mobile",
      preferred_presentation: "phone_screen",
      safe_vertical_usage: true,
      video_suitability: "primary_scene",
      detected_content_type: "screenshot",
      ai_description: "Mobile app RightCard UI screenshot",
    };
    assert.equal(
      resolvePreferredVideoUsageFromMetadata(meta, { title: "RightCard" }),
      "framed_phone",
    );
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
