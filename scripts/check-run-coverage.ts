import assert from "node:assert/strict";
import {
  computeRunCoverage,
  normalizeAudienceSegments,
} from "../lib/production-runs/runCoverage";
import type { Project } from "../lib/supabase/types";

function minimalProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    owner_id: "o1",
    name: "Test",
    type: "saas",
    language: "en",
    enabled_languages: [],
    market_scope: "global",
    target_audience: { segments: ["Developers", "Managers"] },
    goal_type: "lead_generation",
    product_is: [],
    product_is_not: [],
    product_strengths: ["Fast setup", "No code required"],
    pain_points: ["Slow replies", "Lost context"],
    forbidden_claims: [],
    tone_of_voice: {},
    platforms: ["tiktok"],
    publishing_rules: {},
    default_cta: null,
    knowledge: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  } as Project;
}

const run = {
  id: "run-1",
  project_id: "p1",
  status: "completed",
  package_count: 2,
  generated_total: 2,
  failed_total: 0,
  requested_config: {},
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T01:00:00Z",
} as import("@/lib/supabase/types").ProductionRun;

check("normalizeAudienceSegments reads project segments", () => {
  const segments = normalizeAudienceSegments(minimalProject());
  assert.equal(segments.length, 2);
  assert.ok(segments.includes("Developers"));
});

check("funnel all-awareness warning", () => {
  const report = computeRunCoverage({
    project: minimalProject(),
    run,
    packages: [
      {
        id: "pkg1",
        project_id: "p1",
        strategy_item_id: "si1",
        weekly_strategy_id: null,
        funnel_stage: "awareness",
        title: "A",
        status: "draft",
        package_brief: {
          hook: "Slow replies hurt",
          voiceover_text: "Slow replies hurt your team every day.",
          scenario: "Same scenario text here for test.",
        },
        created_at: "",
        updated_at: "",
      },
      {
        id: "pkg2",
        project_id: "p1",
        strategy_item_id: "si2",
        weekly_strategy_id: null,
        funnel_stage: "awareness",
        title: "B",
        status: "draft",
        package_brief: {
          hook: "Another",
          voiceover_text: "No code required to fix slow replies.",
          scenario: "Same scenario text here for test.",
        },
        created_at: "",
        updated_at: "",
      },
    ] as import("@/lib/supabase/types").ContentPackage[],
    strategyItems: [
      { id: "si1", brief: { topic: "Topic A", angle: "Angle 1" } },
      { id: "si2", brief: { topic: "Topic B", angle: "Angle 2" } },
    ],
    contentItems: [],
    videoJobs: [
      {
        id: "j1",
        project_id: "p1",
        content_item_id: "c1",
        provider: "video_engine",
        model: null,
        provider_job_id: null,
        status: "completed",
        input: { creative_mode: "story" },
        output: null,
        error_message: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        completed_at: "2026-01-01T00:00:00Z",
      },
    ] as import("@/lib/supabase/types").VideoJob[],
  });
  assert.ok(
    report.warnings.some((w) => w.includes("All packages are Awareness")),
  );
  assert.ok(report.scenarios.repeated.length > 0);
  assert.ok(report.strengths.usedCount >= 1);
});

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (err) {
    console.error(`fail — ${name}`, err);
    process.exitCode = 1;
  }
}

console.log("check-run-coverage");
