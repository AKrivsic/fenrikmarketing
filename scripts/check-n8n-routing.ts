// Dependency-free check for n8n webhook URL routing (lib/n8n/client.ts).
// Runs via Node's built-in type stripping + the "@/" alias loader:
//   npm run check:n8n-routing
//
// No network: resolveWebhookUrl only computes the target URL from env vars.
// Verifies per-workflow override precedence, origin-only derivation from
// N8N_BASE_URL (never appending to /webhook/ai-content-manager), and the
// missing/invalid-config error paths.

import assert from "node:assert/strict";
import {
  AUTOMATION_WORKFLOWS,
  N8nConfigError,
  resolveWebhookUrl,
  WORKFLOW_ENV_VARS,
  WORKFLOW_WEBHOOK_PATHS,
  type AutomationWorkflow,
} from "@/lib/n8n/client";

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

const ALL_ENV_KEYS = [
  "N8N_BASE_URL",
  ...Object.values(WORKFLOW_ENV_VARS),
];

function resetEnv(): void {
  for (const key of ALL_ENV_KEYS) delete process.env[key];
}

const ALL_WORKFLOWS = Object.values(
  AUTOMATION_WORKFLOWS,
) as AutomationWorkflow[];

// --- 1. derivation from a router-style N8N_BASE_URL ------------------------

section("derive from N8N_BASE_URL origin (router path discarded)");

const EXPECTED_DERIVED: Record<AutomationWorkflow, string> = {
  trend_scan: "https://n8n.fenrik.chat/webhook/trend-scan",
  weekly_strategy: "https://n8n.fenrik.chat/webhook/weekly-strategy",
  generate_content_package:
    "https://n8n.fenrik.chat/webhook/generate-content-package",
  regenerate_content_package:
    "https://n8n.fenrik.chat/webhook/regenerate-content-package",
  publishing_planner: "https://n8n.fenrik.chat/webhook/publishing-planner",
};

for (const workflow of ALL_WORKFLOWS) {
  check(`${workflow} derives /webhook/${WORKFLOW_WEBHOOK_PATHS[workflow]}`, () => {
    resetEnv();
    process.env.N8N_BASE_URL =
      "https://n8n.fenrik.chat/webhook/ai-content-manager";
    const url = resolveWebhookUrl(workflow);
    assert.equal(url, EXPECTED_DERIVED[workflow]);
    assert.ok(
      !url.includes("ai-content-manager"),
      "must not append to the router path",
    );
  });
}

// --- 2. per-workflow override wins -----------------------------------------

section("per-workflow override env var takes precedence");

for (const workflow of ALL_WORKFLOWS) {
  check(`${WORKFLOW_ENV_VARS[workflow]} overrides N8N_BASE_URL`, () => {
    resetEnv();
    process.env.N8N_BASE_URL =
      "https://n8n.fenrik.chat/webhook/ai-content-manager";
    const override = `https://custom.example.com/hook/${workflow}`;
    process.env[WORKFLOW_ENV_VARS[workflow]] = override;
    assert.equal(resolveWebhookUrl(workflow), override);
  });
}

// --- 3. error paths --------------------------------------------------------

section("config errors when neither override nor N8N_BASE_URL is set");

check("missing all config -> N8nConfigError", () => {
  resetEnv();
  assert.throws(
    () => resolveWebhookUrl(AUTOMATION_WORKFLOWS.trendScan),
    N8nConfigError,
  );
});

check("invalid N8N_BASE_URL -> N8nConfigError", () => {
  resetEnv();
  process.env.N8N_BASE_URL = "not a url";
  assert.throws(
    () => resolveWebhookUrl(AUTOMATION_WORKFLOWS.weeklyStrategy),
    N8nConfigError,
  );
});

// --- summary ---------------------------------------------------------------

resetEnv();
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
