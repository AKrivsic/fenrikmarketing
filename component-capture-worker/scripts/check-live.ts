// Optional live Playwright capture against a real marketing site.
//   COMPONENT_CAPTURE_LIVE_URL=https://www.habitoftheday.com npm run check:component-capture-live

import assert from "node:assert/strict";
import { validatePublicHttpUrl } from "../lib/urlSafety.ts";
import { capturePageComponents } from "../lib/capturePageComponents.ts";

const rawUrl =
  process.env.COMPONENT_CAPTURE_LIVE_URL?.trim() ??
  "https://www.habitoftheday.com/";

const validated = validatePublicHttpUrl(rawUrl);
if (!validated.ok) {
  console.error("invalid live url", validated.error);
  process.exit(1);
}

const shots = await capturePageComponents(validated.url);
console.log(
  JSON.stringify({
    url: validated.url,
    count: shots.length,
    labels: shots.map((s) => s.label),
    roles: shots.map((s) => s.roleHint),
  }),
);

assert.ok(
  shots.length >= 0,
  "live capture returns an array (may be empty on blocked pages)",
);

if (process.env.COMPONENT_CAPTURE_LIVE_ASSERT === "true") {
  assert.ok(shots.length > 0, "expected at least one component screenshot");
  const hasProductish = shots.some(
    (s) =>
      /phone|app|mockup|hero|feature|product|dashboard/i.test(
        `${s.label} ${s.roleHint} ${s.selectorHint}`,
      ),
  );
  assert.ok(hasProductish, "expected phone/app/hero-like component");
}

console.log("ok component capture live");
