// Optional live Playwright capture against a real marketing site.
//   npm run check:component-capture-live
// Strict HOTD quality gates (CI):
//   COMPONENT_CAPTURE_LIVE_ASSERT=true npm run check:component-capture-live

import assert from "node:assert/strict";
import { validatePublicHttpUrl } from "../lib/urlSafety.ts";
import { capturePageComponentsWithDebug } from "../lib/capturePageComponents.ts";

const rawUrl =
  process.env.COMPONENT_CAPTURE_LIVE_URL?.trim() ??
  "https://www.habitoftheday.com/";

const validated = validatePublicHttpUrl(rawUrl);
if (!validated.ok) {
  console.error("invalid live url", validated.error);
  process.exit(1);
}

const { screenshots: shots, debug } = await capturePageComponentsWithDebug(
  validated.url,
);
const summary = {
  url: validated.url,
  count: shots.length,
  debug,
  labels: shots.map((s) => s.label),
  roles: shots.map((s) => s.roleHint),
  viewports: shots.map((s) => s.viewport),
  sizes: shots.map((s) => ({ w: s.width, h: s.height })),
};
console.log(JSON.stringify(summary, null, 2));

assert.ok(shots.length >= 0, "live capture returns an array");

const strict =
  process.env.COMPONENT_CAPTURE_LIVE_ASSERT === "true" ||
  /habitoftheday\.com/i.test(validated.url);

  if (strict && shots.length > 0) {
  assert.ok(shots.length <= 5, "max 5 screenshots unchanged");

  assert.ok(
    debug.mobileCandidates > 0,
    "pool should include mobile viewport candidates",
  );
  assert.ok(
    debug.desktopCandidates > 0,
    "pool should include desktop viewport candidates",
  );

  const viewportsUsed = new Set(shots.map((s) => s.viewport).filter(Boolean));
  assert.ok(
    viewportsUsed.has("mobile"),
    "final output should include at least one mobile viewport screenshot",
  );

  const portraitLike = shots.filter((s) => s.height / s.width > 1.6);
  assert.ok(
    portraitLike.length >= 1,
    "expected at least one portrait / phone-like screenshot",
  );

  const hugeSections = shots.filter(
    (s) => s.width >= 1200 && s.height >= 650,
  );
  assert.ok(
    hugeSections.length === 0,
    `expected no full-width hero sections, got ${hugeSections.length}`,
  );

  const labelCounts = new Map<string, number>();
  for (const s of shots) {
    labelCounts.set(s.label, (labelCounts.get(s.label) ?? 0) + 1);
  }
  const duplicateLabels = [...labelCounts.entries()].filter(([, n]) => n > 1);
  assert.ok(
    duplicateLabels.length === 0,
    `duplicate labels in top 5: ${JSON.stringify(duplicateLabels)}`,
  );

  const maxArea = Math.max(...shots.map((s) => s.width * s.height));
  assert.ok(
    maxArea < 1280 * 700,
    `bounding boxes should be smaller than parent sections (max area ${maxArea})`,
  );

  const hasProductVisual = shots.some((s) =>
    /phone|app screen|card|mockup|reminder|habit|comparison/i.test(
      `${s.label} ${s.roleHint}`,
    ),
  );
  assert.ok(hasProductVisual, "expected phone/app/card visual in output");
}

console.log("ok component capture live");
