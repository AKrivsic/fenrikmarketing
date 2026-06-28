// Cross-site live audit (optional network). Soft expectations — fails on hard regressions only.
//   npm run check:cross-site
//   COMPONENT_CAPTURE_CROSS_SITE_STRICT=true npm run check:cross-site

import assert from "node:assert/strict";
import { validatePublicHttpUrl } from "../lib/urlSafety.ts";
import { capturePageComponentsWithDebug } from "../lib/capturePageComponents.ts";
import { isTextHeavyCopyBlock } from "../lib/captureCandidateFilters.ts";

const SITES = [
  { id: "hotd", url: "https://habitoftheday.com/", expectProfile: "mobile_consumer" as const },
  { id: "linear", url: "https://linear.app/" },
  { id: "notion", url: "https://www.notion.so/product" },
  { id: "stripe", url: "https://stripe.com/" },
  { id: "figma", url: "https://www.figma.com/" },
  { id: "basecamp", url: "https://basecamp.com/" },
  { id: "allbirds", url: "https://www.allbirds.com/" },
  { id: "openai", url: "https://openai.com/" },
];

const strict = process.env.COMPONENT_CAPTURE_CROSS_SITE_STRICT === "true";

type SiteResult = {
  id: string;
  url: string;
  count: number;
  productProfile: string;
  shots: Array<{
    label: string;
    viewport?: string;
    w: number;
    h: number;
    roleHint: string;
    selectorHint: string;
  }>;
  notes: string[];
};

const results: SiteResult[] = [];

for (const site of SITES) {
  const validated = validatePublicHttpUrl(site.url);
  if (!validated.ok) {
    console.error("skip invalid url", site.id, validated.error);
    continue;
  }

  const notes: string[] = [];
  try {
    const { screenshots, debug } = await capturePageComponentsWithDebug(validated.url);
    const shots = screenshots.map((s) => ({
      label: s.label,
      viewport: s.viewport,
      w: s.width,
      h: s.height,
      roleHint: s.roleHint,
      selectorHint: s.selectorHint ?? "",
    }));

    results.push({
      id: site.id,
      url: validated.url,
      count: shots.length,
      productProfile: debug.productProfile,
      shots,
      notes,
    });

    assert.ok(shots.length <= 5, `${site.id}: max 5 screenshots`);

    if (site.id === "hotd") {
      assert.equal(debug.productProfile, "mobile_consumer", "HOTD should stay mobile_consumer");
      const banned = ["section.border-y.border-border/60", "div.relative.mt-10.grid", "div.mt-10.grid.gap-4"];
      for (const s of shots) {
        for (const b of banned) {
          assert.ok(!s.selectorHint.includes(b), `HOTD banned selector ${b}`);
        }
      }
    }

    if (site.id === "basecamp") {
      const textCols = shots.filter(
        (s) =>
          isTextHeavyCopyBlock({
            label: s.label,
            roleHint: s.roleHint,
            selectorHint: s.selectorHint,
            captureViewport: (s.viewport as "desktop" | "mobile") ?? "desktop",
            width: s.w,
            height: s.h,
          }) || s.selectorHint.includes("content--columns"),
      );
      assert.ok(
        textCols.length === 0,
        `Basecamp should not include text columns: ${JSON.stringify(textCols)}`,
      );
    }

    for (const s of shots) {
      if (s.h > 900 && s.roleHint === "section_screenshot") {
        notes.push("warn: oversized section in output");
      }
    }

    if (["linear", "notion", "stripe", "figma"].includes(site.id)) {
      if (debug.productProfile === "mobile_consumer") {
        notes.push("warn: classified mobile_consumer (expected saas_desktop or unknown)");
      }
      if (strict && debug.productProfile === "mobile_consumer") {
        assert.fail(`${site.id} should not be mobile_consumer`);
      }
    }

    if (site.id === "openai") {
      assert.ok(shots.length >= 1 && shots.length <= 5, "OpenAI: 1–5 quality shots ok");
    }
  } catch (err) {
    console.error(`FAIL ${site.id}`, err);
    process.exit(1);
  }
}

console.log(JSON.stringify({ strict, results }, null, 2));
console.log("ok cross-site component capture audit");
