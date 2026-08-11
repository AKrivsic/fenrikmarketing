/**
 * Phase 3 — Creative Review UI / edit-apply / gate checks.
 *
 * Run: npx tsx scripts/check-creative-review-phase3.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyCreativeReviewEdits } from "../lib/creative-review/applyEdits";
import { seedCreativeReviewFromPackage } from "../lib/creative-review/seed";
import { parseCreativeReview } from "../lib/creative-review/validate";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";

const root = join(import.meta.dirname, "..");

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

const FIXED_NOW = () => new Date("2026-08-11T12:00:00.000Z");

function minimalPackage(): Pick<
  ContentPackageOutput,
  "voiceover_text" | "visual_scenes" | "image_prompts"
> {
  return {
    voiceover_text: "Original AI voiceover text.",
    visual_scenes: [
      { source: "ai", image_prompt: "A calm office morning" },
      {
        source: "asset",
        asset_id: "11111111-1111-4111-8111-111111111111",
        used_as: "product_ui",
      },
    ],
    image_prompts: [],
  };
}

function seededReview() {
  return seedCreativeReviewFromPackage(minimalPackage(), { now: FIXED_NOW });
}

console.log("A — Apply edits (server-side only)");

check("applies localized_edit + scene intent + director notes", () => {
  const current = seededReview();
  const result = applyCreativeReviewEdits(current, {
    voiceoverLocalizedEdit: "Edited voiceover.",
    scenes: current.scenes.map((scene, index) => ({
      id: scene.id,
      intentDescription: `Intent ${index + 1}`,
      directorNotes: index === 0 ? "Note A" : "",
    })),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.voiceover.localized_edit, "Edited voiceover.");
  assert.equal(result.value.voiceover.original_ai, current.voiceover.original_ai);
  assert.equal(
    result.value.voiceover.final_approved,
    current.voiceover.final_approved,
  );
  assert.equal(result.value.scenes[0]!.intent.description, "Intent 1");
  assert.equal(result.value.scenes[0]!.director_notes, "Note A");
  assert.equal(
    result.value.scenes[0]!.intent.presentation_type,
    current.scenes[0]!.intent.presentation_type,
  );
  assert.equal(result.value.version, current.version);
  assert.equal(result.value.approved, false);
  assert.deepEqual(result.value.history, current.history);
});

check("rejects empty localized_edit via shared validation", () => {
  const current = seededReview();
  const result = applyCreativeReviewEdits(current, {
    voiceoverLocalizedEdit: "   ",
    scenes: current.scenes.map((scene) => ({
      id: scene.id,
      intentDescription: scene.intent.description,
      directorNotes: scene.director_notes,
    })),
  });
  assert.equal(result.ok, false);
});

check("rejects empty creative intent description", () => {
  const current = seededReview();
  const result = applyCreativeReviewEdits(current, {
    voiceoverLocalizedEdit: current.voiceover.localized_edit,
    scenes: current.scenes.map((scene, index) => ({
      id: scene.id,
      intentDescription: index === 0 ? "" : scene.intent.description,
      directorNotes: scene.director_notes,
    })),
  });
  assert.equal(result.ok, false);
});

check("rejects unknown / missing scene ids", () => {
  const current = seededReview();
  const missing = applyCreativeReviewEdits(current, {
    voiceoverLocalizedEdit: current.voiceover.localized_edit,
    scenes: [
      {
        id: current.scenes[0]!.id,
        intentDescription: current.scenes[0]!.intent.description,
        directorNotes: "",
      },
    ],
  });
  assert.equal(missing.ok, false);

  const unknown = applyCreativeReviewEdits(current, {
    voiceoverLocalizedEdit: current.voiceover.localized_edit,
    scenes: [
      ...current.scenes.map((scene) => ({
        id: scene.id,
        intentDescription: scene.intent.description,
        directorNotes: scene.director_notes,
      })),
      {
        id: "scene-ghost",
        intentDescription: "Nope",
        directorNotes: "",
      },
    ],
  });
  assert.equal(unknown.ok, false);
});

check("does not allow image_prompt injection on intent", () => {
  const current = seededReview();
  // applyEdits only copies description — even if caller tried to smuggle fields,
  // the resulting object must still validate without image_prompt.
  const result = applyCreativeReviewEdits(current, {
    voiceoverLocalizedEdit: current.voiceover.localized_edit,
    scenes: current.scenes.map((scene) => ({
      id: scene.id,
      intentDescription: scene.intent.description,
      directorNotes: scene.director_notes,
    })),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  for (const scene of result.value.scenes) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(scene.intent, "image_prompt"),
      false,
    );
  }
  assert.equal(parseCreativeReview(result.value).ok, true);
});

console.log("\nB — Routing / UI wiring");

check("dedicated Creative Review route exists", () => {
  const src = readFileSync(
    join(root, "app/projects/[id]/creative-review/[runId]/page.tsx"),
    "utf8",
  );
  assert.match(src, /CreativeReviewWorkspace/);
  assert.match(src, /forbidden_mode/);
  assert.match(src, /loadCreativeReviewPage/);
});

check("Production panel links when waiting_for_creative_review", () => {
  const src = readFileSync(
    join(
      root,
      "components/projects/ContentProductionPanel/ContentProductionPanel.tsx",
    ),
    "utf8",
  );
  assert.match(src, /waiting_for_creative_review/);
  assert.match(src, /Open Creative Review/);
  assert.match(src, /creative-review\/\$\{run\.id\}/);
});

check("UI wiring still has no image_prompt on Creative Review panels", () => {
  const workspace = readFileSync(
    join(
      root,
      "components/creative-review/CreativeReviewWorkspace/CreativeReviewWorkspace.tsx",
    ),
    "utf8",
  );
  const panel = readFileSync(
    join(
      root,
      "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx",
    ),
    "utf8",
  );
  const combined = `${workspace}\n${panel}`;
  assert.doesNotMatch(combined, /image_prompt/);
});

check("workspace warns on unsaved leave via beforeunload + confirm", () => {
  const src = readFileSync(
    join(
      root,
      "components/creative-review/CreativeReviewWorkspace/CreativeReviewWorkspace.tsx",
    ),
    "utf8",
  );
  assert.match(src, /beforeunload/);
  assert.match(src, /window\.confirm/);
});

check("package panel saves only allowed edit fields", () => {
  const src = readFileSync(
    join(
      root,
      "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx",
    ),
    "utf8",
  );
  assert.match(src, /voiceoverLocalizedEdit/);
  assert.match(src, /intentDescription/);
  assert.match(src, /directorNotes/);
  assert.match(src, /saveCreativeReviewPackageAction/);
  assert.match(src, /History/);
  assert.match(src, /readOnly/);
});

console.log("\nC — Server admin gates");

check("admin load rejects non-manual-review modes", () => {
  const src = readFileSync(
    join(root, "lib/api/creative-review-admin.ts"),
    "utf8",
  );
  assert.match(src, /defersVideoUntilCreativeReview/);
  assert.match(src, /forbidden_mode/);
  assert.match(src, /creative_review/);
  assert.match(src, /package_brief/);
});

check("save updates only creative_review key on brief", () => {
  const src = readFileSync(
    join(root, "lib/api/creative-review-admin.ts"),
    "utf8",
  );
  assert.match(src, /creative_review:\s*args\.review/);
  assert.match(src, /commitCreativeReviewSave|applyCreativeReviewEdits/);
  assert.match(src, /content_package_id/);
});

check("server actions require project ownership lookup", () => {
  const src = readFileSync(
    join(root, "app/projects/[id]/creative-review/actions.ts"),
    "utf8",
  );
  assert.match(src, /getProjectForAdmin/);
  assert.match(src, /loadCreativeReviewPage/);
  assert.match(src, /saveCreativeReviewPackage/);
});

check("ProjectTabs / Review routes untouched by Creative Review tab", () => {
  const tabs = readFileSync(
    join(root, "components/projects/ProjectTabs/ProjectTabs.tsx"),
    "utf8",
  );
  assert.doesNotMatch(tabs, /creative-review/i);
  assert.match(tabs, /Review/);
});

console.log("\nAll Phase 3 Creative Review checks passed.");
