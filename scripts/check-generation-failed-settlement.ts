// Sprint 4C.1 + 5.3 — generation terminal settlement (no zombies / no Start Video).
//   npm run check:generation-failed-settlement

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyGenerationThrow,
  GENERATION_TERMINAL_ERRORS,
} from "@/lib/ai/workflows/generationTerminal";
import {
  RENDER_PRODUCT_DEMO_FAILED,
  RenderProductDemoFailedError,
} from "@/lib/scene-types/presentation/renderFidelity";

const root = process.cwd();

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

const adminSrc = readFileSync(
  join(root, "lib/api/production-run-admin.ts"),
  "utf8",
);
const n8nRouteSrc = readFileSync(
  join(root, "app/api/n8n/generate-content-package/route.ts"),
  "utf8",
);
const bridgeSrc = readFileSync(
  join(root, "n8n/generate-content-package-bridge.json"),
  "utf8",
);
const workflowSrc = readFileSync(
  join(root, "lib/ai/workflows/generateContentPackage.ts"),
  "utf8",
);
const terminalSrc = readFileSync(
  join(root, "lib/ai/workflows/generationTerminal.ts"),
  "utf8",
);
const ensureSrc = readFileSync(
  join(root, "lib/scene-types/product-demo/ensureStructuredProductDemo.ts"),
  "utf8",
);

console.log("\nA — Failure handling");

check("markProductionRunItemGenerationFailed exported", () => {
  assert.match(adminSrc, /export async function markProductionRunItemGenerationFailed/);
});

check("marks item failed without content_package_id", () => {
  assert.match(adminSrc, /status:\s*"failed"/);
  assert.match(adminSrc, /content_package_id:\s*null/);
  assert.match(adminSrc, /validation_errors/);
});

check("settles run counters after generation failure", () => {
  assert.match(adminSrc, /settleProductionRunAfterItemFailure/);
  assert.match(adminSrc, /failed_total/);
  assert.match(adminSrc, /generationFailedSlots/);
});

check("n8n generate route settles item on !result.ok", () => {
  assert.match(n8nRouteSrc, /settleOrRespondOperational|settleProductionRunItemOrThrow/);
  assert.match(n8nRouteSrc, /if\s*\(\s*!result\.ok\s*\)/);
  const settleSrc = readFileSync(
    join(root, "lib/api/settleProductionRunItem.ts"),
    "utf8",
  );
  assert.match(settleSrc, /markProductionRunItemGenerationFailed/);
});

check("workflowResponse still returns 422 with validation_errors", () => {
  const apiSrc = readFileSync(join(root, "lib/ai/apiResponse.ts"), "utf8");
  assert.match(apiSrc, /status:\s*422/);
  assert.match(apiSrc, /validation_errors/);
});

check("n8n bridge skips Start Video when package not ok", () => {
  assert.match(bridgeSrc, /N3b — Package ok\?/);
  assert.match(bridgeSrc, /\$json\.ok === true/);
  const bridge = JSON.parse(bridgeSrc) as {
    connections: Record<string, { main: unknown[][] }>;
  };
  const n3 = bridge.connections["N3 — Generate Content Package"];
  assert.ok(n3, "N3 connections");
  const n3Target = JSON.stringify(n3.main);
  assert.match(n3Target, /N3b — Package ok\?/);
  const n3b = bridge.connections["N3b — Package ok?"];
  assert.ok(n3b, "N3b connections");
  const trueBranch = JSON.stringify(n3b.main[0]);
  const falseBranch = JSON.stringify(n3b.main[1]);
  assert.match(trueBranch, /N4 — Start Video Job/);
  assert.match(falseBranch, /N2b — Loop over packages/);
  assert.doesNotMatch(falseBranch, /Start Video/);
});

check("422 generation_failed path does not require packageId for settle", () => {
  assert.match(workflowSrc, /error:\s*"generation_failed"/);
  assert.doesNotMatch(
    adminSrc.slice(
      adminSrc.indexOf("markProductionRunItemGenerationFailed"),
      adminSrc.indexOf("settleProductionRunAfterItemFailure") + 200,
    ),
    /require.*content_package_id/,
  );
});

console.log("\nB — Sprint 5.3 terminal settlement");

check("classifyGenerationThrow maps RenderProductDemoFailedError", () => {
  const err = new RenderProductDemoFailedError("render_product_demo_failed: test", {
    stage: "presentation_analyzer",
    code: RENDER_PRODUCT_DEMO_FAILED,
  });
  const failure = classifyGenerationThrow(err);
  assert.equal(failure.ok, false);
  assert.equal(failure.error, "render_product_demo_failed");
  assert.match(failure.validationErrors[0]!.message, /render_product_demo_failed/);
});

check("classifyGenerationThrow maps render_fidelity_failed diagnostics", () => {
  const err = new RenderProductDemoFailedError("type mismatch", {
    stage: "compile",
    code: "render_fidelity_failed",
  });
  const failure = classifyGenerationThrow(err);
  assert.equal(failure.error, "render_failed");
});

check("classifyGenerationThrow maps unexpected runtime to operational_failure", () => {
  const failure = classifyGenerationThrow(new Error("boom db timeout"));
  assert.equal(failure.error, "operational_failure");
  assert.match(failure.validationErrors[0]!.message, /boom db timeout/);
});

check("all terminal error codes are defined", () => {
  assert.deepEqual([...GENERATION_TERMINAL_ERRORS], [
    "generation_failed",
    "render_product_demo_failed",
    "render_failed",
    "operational_failure",
  ]);
});

check("runGenerateContentPackage converts throws to terminal failures", () => {
  assert.match(workflowSrc, /classifyGenerationThrow/);
  assert.match(workflowSrc, /runGenerateContentPackageUnchecked/);
});

check("n8n route settles throws after generationBegan", () => {
  assert.match(n8nRouteSrc, /generationBegan\s*=\s*true/);
  assert.match(n8nRouteSrc, /classifyGenerationThrow/);
  assert.match(n8nRouteSrc, /settleProductionRunItemOrThrow/);
  assert.match(n8nRouteSrc, /SettlementFailedError/);
});

check("persist rolls back package when video job creation fails", () => {
  assert.match(workflowSrc, /rollbackPersistedPackage/);
  assert.match(workflowSrc, /Sprint 5\.3 — no orphan package/);
});

check("recordAssetUsage failure rolls back package", () => {
  assert.match(workflowSrc, /recordAssetUsage/);
  const usageIdx = workflowSrc.indexOf(
    "Sprint 5.3.1 — failure must not leave package",
  );
  assert.ok(usageIdx > 0);
  assert.match(
    workflowSrc.slice(usageIdx, usageIdx + 400),
    /rollbackPersistedPackage/,
  );
});

check("rollback throws on delete failure (not swallowed)", () => {
  assert.match(workflowSrc, /operational_failure: rollback failed/);
  assert.doesNotMatch(
    workflowSrc.slice(workflowSrc.indexOf("async function rollbackPersistedPackage")),
    /console\.error\(\s*"\[generate-content-package\] rollback/,
  );
});

check("settlement failures are not swallowed", () => {
  const settleSrc = readFileSync(
    join(root, "lib/api/settleProductionRunItem.ts"),
    "utf8",
  );
  assert.match(settleSrc, /SettlementFailedError/);
  assert.match(settleSrc, /SETTLE_MAX_ATTEMPTS/);
  assert.match(n8nRouteSrc, /settleOrRespondOperational|settleProductionRunItemOrThrow/);
  assert.doesNotMatch(n8nRouteSrc, /settleSafely/);
  assert.match(n8nRouteSrc, /path:\s*"settlement"/);
});

check("ensureStructuredProductDemo never fabricates chatbot demos", () => {
  assert.match(ensureSrc, /PRODUCT_DEMO_NOT_FABRICATED/);
  assert.match(ensureSrc, /Never fabricates a chatbot demo/);
  assert.match(ensureSrc, /refusing to invent a chatbot product demonstration/);
  assert.match(terminalSrc, /operational_failure/);
});

check("architecture states universal input → value → outcome", () => {
  const si = readFileSync(
    join(root, "lib/creative-candidates/storyIntegrity.ts"),
    "utf8",
  );
  const pdi = readFileSync(
    join(root, "lib/creative-candidates/productDemonstrationIntegrity.ts"),
    "utf8",
  );
  assert.match(si, /input → product\/service creates value → visible outcome/);
  assert.match(pdi, /UNIVERSAL SEMANTIC CONTRACT/);
  assert.doesNotMatch(
    pdi,
    /The PRODUCT_DEMO scene is rendered as a controlled Fenrik chat UI/,
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
