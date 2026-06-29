// Preferred video usage + fullscreen guardrail + render spec wiring.
//   npm run check:video-safe-assets

import assert from "node:assert/strict";
import {
  assetUsageFullscreenViolation,
  computePreferredVideoUsage,
  resolvePreferredVideoUsageFromRef,
  resolveVideoUsageForRender,
  usedAsRequestsFullscreenScene,
} from "@/lib/assets/preferredVideoUsage";
import { resolvePackageAssetCoverage } from "@/lib/assets/assetCoveragePolicy";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import { formatAvailableAssetPromptLine } from "@/lib/assets/formatAvailableAssetLine";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import { buildRenderSpec } from "@/video-worker/jobRunner";
import type { Project } from "@/lib/supabase/types";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";

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

function section(title: string): void {
  console.log(`\n${title}`);
}

const mobileUi: AssetRef = {
  id: "mobile-ui",
  title: "Phone UI",
  asset_class: "static",
  media_type: "image",
  product_role: "product_ui",
  capture_viewport: "mobile",
  safe_vertical_usage: true,
  orientation: "portrait",
  video_suitability: "primary_scene",
};

const desktopShot: AssetRef = {
  id: "desktop-ui",
  title: "Dashboard",
  asset_class: "static",
  media_type: "image",
  product_role: "dashboard",
  capture_viewport: "desktop",
  safe_vertical_usage: false,
  orientation: "landscape",
  video_suitability: "screen_insert",
};

const directives: CreativeDirectives = {
  mode: CREATIVE_MODES[0],
  hook: HOOK_ARCHETYPES[0],
  persona: VOICE_PERSONAS[0],
};

section("preferred_video_usage classification");

check("mobile capture_viewport -> fullscreen", () => {
  assert.equal(resolvePreferredVideoUsageFromRef(mobileUi), "fullscreen");
});

check("desktop dashboard -> framed_screen", () => {
  assert.equal(resolvePreferredVideoUsageFromRef(desktopShot), "framed_screen");
});

check("hero_image -> background", () => {
  assert.equal(
    computePreferredVideoUsage({
      productRole: "hero_image",
      captureViewport: "desktop",
      safeVerticalUsage: false,
      videoSuitability: "avoid_fullscreen",
      orientation: "landscape",
      width: 1200,
      height: 630,
    }),
    "background",
  );
});

section("AVAILABLE ASSETS prompt");

check("desktop asset stays in video prompt with framed_screen hint", () => {
  const line = formatAvailableAssetPromptLine(desktopShot);
  assert.ok(line.includes("desktop-ui"));
  assert.ok(line.includes("framed_screen"));
  assert.ok(line.includes("NOT fullscreen"));
});

check("video prompt lists desktop and mobile assets", () => {
  const project = {
    id: "p",
    name: "Co",
    type: "service",
    language: "en",
    market_scope: "global",
    goal_type: "awareness",
    target_audience: {},
    product_is: [],
    product_is_not: [],
    product_strengths: [],
    pain_points: [],
    forbidden_claims: [],
    tone_of_voice: {},
    platforms: [],
    publishing_rules: {},
    default_cta: null,
  } as unknown as Project;
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "solution_aware",
    topic: "t",
    availableAssets: [mobileUi, desktopShot],
    targetPlatforms: ["tiktok"],
    requireVideo: true,
    videoPlatforms: ["tiktok"],
    directives,
  });
  assert.ok(prompt.includes("mobile-ui"));
  assert.ok(prompt.includes("desktop-ui"));
  assert.ok(prompt.includes("Preferred usage: fullscreen"));
  assert.ok(prompt.includes("framed_screen"));
});

section("fullscreen guardrail");

check("desktop + fullscreen used_as is a violation", () => {
  assert.ok(
    assetUsageFullscreenViolation(
      "framed_screen",
      "Use as fullscreen hero background in vertical video",
    ),
  );
});

check("desktop + framed laptop used_as is OK", () => {
  assert.equal(
    assetUsageFullscreenViolation(
      "framed_screen",
      "Show as framed laptop screen insert during CTA; do not crop fullscreen",
    ),
    false,
  );
});

check("guardrail logic rejects fullscreen desktop usage", () => {
  const preferred = "framed_screen";
  const usedAs = "Fullscreen product hero as the main vertical scene";
  assert.ok(assetUsageFullscreenViolation(preferred, usedAs));
});

section("coverage with desktop library");

check("production plans slots with desktop tier-1 assets", () => {
  const decision = resolvePackageAssetCoverage({
    generationMode: "production",
    funnelStage: "conversion",
    packageIndex: 4,
    packageCount: 9,
    availableAssets: [desktopShot],
  });
  assert.ok(decision.qualityAssetCount > 0);
  assert.ok(decision.seriesSlotIndices.length > 0);
});

section("render spec video_usage");

check("asset_images carry video_usage into render spec scenes", () => {
  const spec = buildRenderSpec({
    voiceover_text: "Here is how we help, quickly and simply, every time.",
    image_prompts: ["scene a", "scene b", "scene c"],
    asset_images: [
      {
        bucket: "project-assets",
        path: "p/desktop.png",
        title: "Dashboard",
        video_usage: "framed_laptop",
      },
    ],
  });
  const assetScene = spec.scenes.find((s) => s.id === "asset-1");
  assert.ok(assetScene);
  assert.equal(assetScene?.video_usage, "framed_laptop");
});

check("resolveVideoUsageForRender maps framed used_as", () => {
  assert.equal(
    resolveVideoUsageForRender(
      "framed_screen",
      "Laptop mockup screen insert in beat 3",
    ),
    "framed_laptop",
  );
});

check("usedAsRequestsFullscreenScene respects do-not-crop phrasing", () => {
  assert.equal(
    usedAsRequestsFullscreenScene(
      "Framed laptop insert; do not crop fullscreen",
    ),
    false,
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
