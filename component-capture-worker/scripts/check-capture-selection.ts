// Unit tests for capture selection scoring / dedup (no HTTP).
//   npm run check:capture-selection

import assert from "node:assert/strict";
import {
  dedupeCaptureCandidates,
  isPortraitLike,
  minWidthForElement,
  portraitRatio,
  scoreElementSignals,
  textDensity,
  type ElementSignals,
} from "../lib/captureSelection.ts";
import {
  dedupeCrossViewport,
  inferProductVisualProfile,
  sameVisualPair,
  selectFinalCaptureCandidates,
  socialRankScore,
  type PooledCaptureCandidate,
} from "../lib/captureRanking.ts";
import {
  captureSemanticSimilarity,
  labelSimilarity,
} from "../lib/captureSemanticSimilarity.ts";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}`, err);
  }
}

const VW = 1280;
const VH = 900;

function signals(partial: Partial<ElementSignals> & Pick<ElementSignals, "width" | "height">): ElementSignals {
  return {
    tagName: "DIV",
    className: "",
    id: "",
    x: 0,
    y: 0,
    textLen: 100,
    imgs: 1,
    buttons: 0,
    visible: true,
    ...partial,
  };
}

check("portrait 280×591 passes min width gate", () => {
  assert.equal(isPortraitLike(280, 591), true);
  assert.ok(portraitRatio(280, 591) > 1.6);
  const minW = minWidthForElement(280, 591, VW);
  assert.ok(minW <= 280, `minW ${minW} should allow 280px width`);
});

check("full-width section scores below phone child", () => {
  const section = signals({
    tagName: "SECTION",
    width: 1280,
    height: 751,
    textLen: 344,
    imgs: 5,
    className: "bg-background",
  });
  const phone = signals({
    width: 280,
    height: 591,
    textLen: 120,
    imgs: 2,
    className: "relative aspect-[9/19] overflow-hidden",
  });
  const sectionScore = scoreElementSignals(section, VW, VH, {
    hasBetterVisualChild: true,
    visualAreaRatio: 0.15,
  });
  const phoneScore = scoreElementSignals(phone, VW, VH);
  assert.ok(phoneScore > sectionScore, `phone ${phoneScore} vs section ${sectionScore}`);
});

check("feature card grid beats parent section score", () => {
  const section = signals({
    tagName: "SECTION",
    width: 1152,
    height: 726,
    textLen: 526,
    imgs: 4,
    className: "mx-auto max-w-6xl",
  });
  const grid = signals({
    width: 1112,
    height: 178,
    textLen: 197,
    imgs: 3,
    className: "mt-10 grid gap-4",
  });
  const sectionScore = scoreElementSignals(section, VW, VH, {
    hasBetterVisualChild: true,
    visualAreaRatio: 0.2,
  });
  const gridScore = scoreElementSignals(grid, VW, VH);
  assert.ok(gridScore > sectionScore, `grid ${gridScore} vs section ${sectionScore}`);
});

check("parent/child dedup keeps higher-score compact candidate", () => {
  const parent = {
    score: 900_000,
    x: 0,
    y: 65,
    width: 1280,
    height: 751,
    label: "Build habits that actually stick.",
  };
  const child = {
    score: 420_000,
    x: 801,
    y: 161,
    width: 280,
    height: 591,
    label: "Hero phone mockup",
  };
  const innerWrapper = {
    score: 850_000,
    x: 64,
    y: 65,
    width: 1152,
    height: 751,
    label: "Build habits that actually stick.",
  };

  const out = dedupeCaptureCandidates([parent, innerWrapper, child]);
  assert.equal(out.length, 1, "one region should collapse to one winner");
  assert.equal(out[0].label, "Hero phone mockup");
});

check("mostly text section is penalized", () => {
  const dense = signals({
    tagName: "SECTION",
    width: 1280,
    height: 420,
    textLen: 2400,
    imgs: 0,
    buttons: 0,
    className: "bg-background",
  });
  const card = signals({
    width: 360,
    height: 178,
    textLen: 69,
    imgs: 1,
    className: "rounded-3xl border card",
  });
  const denseScore = scoreElementSignals(dense, VW, VH);
  const cardScore = scoreElementSignals(card, VW, VH);
  assert.ok(textDensity(2400, 1280, 420) > 0.035);
  assert.ok(cardScore > denseScore);
});

function poolItem(
  partial: Partial<PooledCaptureCandidate> &
    Pick<PooledCaptureCandidate, "label" | "width" | "height">,
): PooledCaptureCandidate {
  return {
    captureId: "id",
    selectorHint: "",
    roleHint: "product_ui",
    score: 100_000,
    captureViewport: "desktop",
    x: 0,
    y: 0,
    ...partial,
  };
}

check("mobile portrait beats desktop wide section on social rank", () => {
  const desktop = poolItem({
    label: "Build habits",
    width: 1280,
    height: 751,
    score: 1_400_000,
    captureViewport: "desktop",
    roleHint: "product_ui",
  });
  const mobile = poolItem({
    label: "Hero phone mockup",
    width: 280,
    height: 591,
    score: 400_000,
    captureViewport: "mobile",
    roleHint: "mobile_app",
  });
  assert.ok(
    socialRankScore(mobile, "mobile_consumer") >
      socialRankScore(desktop, "mobile_consumer"),
  );
});

check("dedup desktop/mobile keeps mobile phone mockup", () => {
  const desktop = poolItem({
    label: "Hero phone mockup",
    width: 280,
    height: 591,
    score: 500_000,
    captureViewport: "desktop",
    roleHint: "mobile_app",
    captureId: "d-0",
  });
  const mobile = poolItem({
    label: "Hero phone mockup",
    width: 320,
    height: 620,
    score: 450_000,
    captureViewport: "mobile",
    roleHint: "mobile_app",
    captureId: "m-0",
  });
  const out = dedupeCrossViewport([desktop, mobile], "mobile_consumer");
  assert.equal(out.length, 1);
  assert.equal(out[0].captureViewport, "mobile");
});

check("same feature desktop + mobile prefers mobile (Consistency Score)", () => {
  const desktop = poolItem({
    label: "Analytics dashboard",
    width: 960,
    height: 540,
    score: 900_000,
    captureViewport: "desktop",
    roleHint: "dashboard",
    captureId: "d-score",
    selectorHint: "div.dashboard-panel",
    textSnippet: "Consistency Score 84 weekly trends habits completed",
  });
  const mobile = poolItem({
    label: "App screen",
    width: 320,
    height: 620,
    score: 400_000,
    captureViewport: "mobile",
    roleHint: "mobile_app",
    captureId: "m-score",
    selectorHint: "div.aspect-[9/19]",
    textSnippet: "Consistency Score 84 your weekly habit streak",
  });
  assert.ok(sameVisualPair(desktop, mobile));
  const out = dedupeCrossViewport([desktop, mobile], "unknown");
  assert.equal(out.length, 1);
  assert.equal(out[0].captureViewport, "mobile");
});

check("different features desktop pricing + mobile habit feed keeps both", () => {
  const desktop = poolItem({
    label: "Pricing",
    width: 900,
    height: 480,
    score: 800_000,
    captureViewport: "desktop",
    roleHint: "pricing_screenshot",
    captureId: "d-price",
    textSnippet: "Pro plan $9 monthly billing annual pricing",
  });
  const mobile = poolItem({
    label: "Habit feed cards",
    width: 350,
    height: 400,
    score: 700_000,
    captureViewport: "mobile",
    roleHint: "feature_card",
    captureId: "m-feed",
    textSnippet: "Habit feed morning check-in streak cards",
  });
  assert.ok(!sameVisualPair(desktop, mobile));
  assert.ok(captureSemanticSimilarity(desktop, mobile) < 0.72);
  const out = dedupeCrossViewport([desktop, mobile], "mobile_consumer");
  assert.equal(out.length, 2);
});

check("desktop-only pool unchanged", () => {
  const a = poolItem({
    label: "Pipeline metrics",
    width: 920,
    height: 480,
    score: 800_000,
    captureViewport: "desktop",
    roleHint: "dashboard",
    captureId: "d-1",
  });
  const b = poolItem({
    label: "Team workspace",
    width: 880,
    height: 460,
    score: 750_000,
    captureViewport: "desktop",
    roleHint: "dashboard",
    captureId: "d-2",
  });
  const out = dedupeCrossViewport([a, b], "saas_desktop");
  assert.equal(out.length, 2);
  assert.ok(out.every((c) => c.captureViewport === "desktop"));
});

check("mobile-only pool unchanged", () => {
  const a = poolItem({
    label: "Morning reminder",
    width: 360,
    height: 178,
    score: 600_000,
    captureViewport: "mobile",
    roleHint: "feature_card",
    captureId: "m-1",
  });
  const b = poolItem({
    label: "Habit feed cards",
    width: 350,
    height: 400,
    score: 550_000,
    captureViewport: "mobile",
    roleHint: "feature_card",
    captureId: "m-2",
  });
  const out = dedupeCrossViewport([a, b], "mobile_consumer");
  assert.equal(out.length, 2);
});

check("label similarity matches distinctive shared headings", () => {
  assert.ok(labelSimilarity("Consistency Score", "Consistency Score") >= 0.99);
  assert.ok(labelSimilarity("Pricing plans", "Habit feed") < 0.35);
});

check("final selection drops desktop when mobile equivalent exists", () => {
  const pool = [
    poolItem({
      label: "Product UI",
      width: 980,
      height: 520,
      score: 1_000_000,
      captureViewport: "desktop",
      roleHint: "dashboard",
      captureId: "d-ui",
      textSnippet: "Onboarding welcome complete your profile setup steps",
    }),
    poolItem({
      label: "App screen",
      width: 300,
      height: 640,
      score: 450_000,
      captureViewport: "mobile",
      roleHint: "mobile_app",
      captureId: "m-ui",
      textSnippet: "Onboarding welcome complete your profile setup",
    }),
    poolItem({
      label: "Billing panel",
      width: 920,
      height: 480,
      score: 800_000,
      roleHint: "dashboard",
      captureViewport: "desktop",
      captureId: "dash-1",
    }),
    poolItem({
      label: "Editor canvas",
      width: 880,
      height: 440,
      score: 700_000,
      roleHint: "product_ui",
      selectorHint: "div.canvas-editor",
      captureViewport: "desktop",
      captureId: "ui-1",
    }),
    poolItem({
      label: "Feature card",
      width: 360,
      height: 280,
      score: 500_000,
      roleHint: "feature_card",
      captureViewport: "mobile",
      captureId: "card-1",
    }),
  ];
  const final = selectFinalCaptureCandidates(pool, 5);
  assert.ok(!final.some((c) => c.captureId === "d-ui"), "desktop duplicate should lose");
  assert.ok(final.some((c) => c.captureId === "m-ui"), "mobile equivalent kept");
});

check("desktop dashboard beats mobile text-heavy section (saas profile)", () => {
  const mobile = poolItem({
    label: "Marketing copy block",
    width: 390,
    height: 820,
    score: 600_000,
    captureViewport: "mobile",
    roleHint: "section_screenshot",
    captureId: "m-1",
  });
  const desktop = poolItem({
    label: "Analytics dashboard",
    width: 900,
    height: 500,
    score: 500_000,
    captureViewport: "desktop",
    roleHint: "dashboard",
    captureId: "d-1",
  });
  assert.ok(
    socialRankScore(desktop, "saas_desktop") >
      socialRankScore(mobile, "saas_desktop"),
  );
});

check("infers saas_desktop when desktop UI signals dominate phone mockups", () => {
  const pool = [
    poolItem({
      label: "Hero phone mockup",
      width: 280,
      height: 591,
      roleHint: "mobile_app",
      captureViewport: "desktop",
    }),
    poolItem({
      label: "Analytics dashboard",
      width: 960,
      height: 540,
      roleHint: "dashboard",
      captureViewport: "desktop",
      selectorHint: "div.analytics-panel",
    }),
    poolItem({
      label: "Team workspace canvas",
      width: 880,
      height: 520,
      roleHint: "product_ui",
      captureViewport: "desktop",
      selectorHint: "div.editor-canvas",
    }),
    poolItem({
      label: "Mobile promo block",
      width: 390,
      height: 400,
      roleHint: "product_ui",
      captureViewport: "mobile",
    }),
  ];
  assert.equal(inferProductVisualProfile(pool), "saas_desktop");
});

check("rejects basecamp-like text columns from final five", () => {
  const pool = [
    poolItem({
      label: "All these questions have the same answer: Yes!",
      width: 955,
      height: 645,
      score: 2_000_000,
      roleHint: "product_ui",
      selectorHint: "div.content.content--columns",
      captureViewport: "desktop",
      captureId: "text-1",
    }),
    poolItem({
      label: "Product visual",
      width: 346,
      height: 363,
      score: 400_000,
      roleHint: "product_ui",
      selectorHint: "figure",
      captureViewport: "mobile",
      captureId: "fig-1",
    }),
    poolItem({
      label: "Billing panel",
      width: 920,
      height: 480,
      score: 800_000,
      roleHint: "dashboard",
      selectorHint: "div.billing-plan-graphic",
      captureViewport: "desktop",
      captureId: "dash-1",
    }),
    poolItem({
      label: "Workspace table",
      width: 900,
      height: 460,
      score: 750_000,
      roleHint: "dashboard",
      captureViewport: "desktop",
      captureId: "dash-2",
    }),
    poolItem({
      label: "Editor canvas",
      width: 880,
      height: 440,
      score: 700_000,
      roleHint: "product_ui",
      selectorHint: "div.canvas-editor",
      captureViewport: "desktop",
      captureId: "ui-1",
    }),
    poolItem({
      label: "Feature card",
      width: 360,
      height: 280,
      score: 500_000,
      roleHint: "feature_card",
      captureViewport: "mobile",
      captureId: "card-1",
    }),
  ];
  const final = selectFinalCaptureCandidates(pool, 5);
  assert.ok(
    !final.some((c) => c.selectorHint.includes("content--columns")),
    "text column should not appear in final output",
  );
});

check("oversized section_screenshot ranks below compact UI", () => {
  const huge = poolItem({
    label: "Whole marketing section",
    width: 1280,
    height: 1459,
    score: 3_000_000,
    roleHint: "section_screenshot",
    captureViewport: "desktop",
  });
  const ui = poolItem({
    label: "Design canvas",
    width: 997,
    height: 718,
    score: 600_000,
    roleHint: "product_ui",
    selectorHint: "div.canvas-panel",
    captureViewport: "desktop",
  });
  assert.ok(socialRankScore(ui, "saas_desktop") > socialRankScore(huge, "saas_desktop"));
  const final = selectFinalCaptureCandidates([huge, ui], 1);
  assert.equal(final[0]?.label, "Design canvas");
});

check("infers mobile_consumer for habit/phone pool", () => {
  const pool = [
    poolItem({
      label: "Hero phone mockup",
      width: 280,
      height: 591,
      roleHint: "mobile_app",
      captureViewport: "mobile",
    }),
    poolItem({
      label: "Morning reminder",
      width: 360,
      height: 178,
      roleHint: "feature_card",
      captureViewport: "mobile",
    }),
    poolItem({
      label: "Habit feed cards",
      width: 350,
      height: 400,
      roleHint: "feature_card",
      captureViewport: "mobile",
    }),
  ];
  assert.equal(inferProductVisualProfile(pool), "mobile_consumer");
});

check("saas pool allows 2+ desktop in final five", () => {
  const pool: PooledCaptureCandidate[] = [
    poolItem({
      label: "Revenue analytics dashboard",
      width: 960,
      height: 540,
      score: 800_000,
      roleHint: "dashboard",
      captureViewport: "desktop",
      selectorHint: "div.admin-chart",
    }),
    poolItem({
      label: "Pipeline metrics table",
      width: 920,
      height: 480,
      score: 750_000,
      roleHint: "dashboard",
      captureViewport: "desktop",
      selectorHint: "div.workspace-table",
    }),
    poolItem({
      label: "Team workspace",
      width: 880,
      height: 460,
      score: 700_000,
      roleHint: "dashboard",
      captureViewport: "desktop",
    }),
    poolItem({
      label: "Mobile nav menu",
      width: 390,
      height: 700,
      score: 650_000,
      roleHint: "section_screenshot",
      captureViewport: "mobile",
    }),
    poolItem({
      label: "Pricing chart",
      width: 860,
      height: 420,
      score: 600_000,
      roleHint: "dashboard",
      captureViewport: "desktop",
    }),
    poolItem({
      label: "Signup form",
      width: 840,
      height: 400,
      score: 550_000,
      roleHint: "feature_card",
      captureViewport: "desktop",
    }),
  ];
  assert.equal(inferProductVisualProfile(pool), "saas_desktop");
  const final = selectFinalCaptureCandidates(pool, 5);
  assert.equal(final.length, 5);
  const desktopCount = final.filter((c) => c.captureViewport === "desktop").length;
  assert.ok(desktopCount >= 2, `expected >=2 desktop, got ${desktopCount}`);
});

check("wide landing section loses to compact UI on unknown profile", () => {
  const section = poolItem({
    label: "Welcome to our product",
    width: 1280,
    height: 720,
    score: 2_000_000,
    roleHint: "section_screenshot",
    captureViewport: "desktop",
  });
  const card = poolItem({
    label: "Feature card",
    width: 400,
    height: 220,
    score: 200_000,
    roleHint: "feature_card",
    captureViewport: "desktop",
  });
  assert.ok(
    socialRankScore(card, "unknown") > socialRankScore(section, "unknown"),
  );
});

check("final selection returns at most 5 total", () => {
  const pool: PooledCaptureCandidate[] = Array.from({ length: 20 }, (_, i) =>
    poolItem({
      label: `Feature card ${i}`,
      width: 300,
      height: 200,
      score: 100_000 - i * 100,
      captureViewport: i % 2 === 0 ? "mobile" : "desktop",
      roleHint: "feature_card",
      captureId: String(i),
    }),
  );
  assert.equal(selectFinalCaptureCandidates(pool, 5).length, 5);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
