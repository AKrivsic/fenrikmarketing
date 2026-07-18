// Sprint 4C.1 — generation_failed settles production_run_item (no Start Video).
//   npm run check:generation-failed-settlement

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

check("n8n generate route marks item on !result.ok", () => {
  assert.match(n8nRouteSrc, /markProductionRunItemGenerationFailed/);
  assert.match(n8nRouteSrc, /if\s*\(\s*!result\.ok\s*\)/);
});

check("workflowResponse still returns 422 generation_failed", () => {
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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
