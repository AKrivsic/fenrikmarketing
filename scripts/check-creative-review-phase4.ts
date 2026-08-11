/**
 * Phase 4 — Translation & Approval workflow checks.
 *
 * Run: npx tsx scripts/check-creative-review-phase4.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TextProvider } from "../lib/ai/types";
import {
  commitCreativeReviewApprove,
  commitCreativeReviewConfirmTranslation,
  commitCreativeReviewSave,
  commitCreativeReviewTranslate,
  commitCreativeReviewUnapprove,
} from "../lib/creative-review/mutations";
import { normalizeLegacyCreativeReview } from "../lib/creative-review/legacy";
import { parseCreativeReview } from "../lib/creative-review/validate";
import { readCreativeReviewFromBrief } from "../lib/creative-review/read";
import { seedCreativeReviewFromPackage } from "../lib/creative-review/seed";
import { computeCreativeReviewRunProgress } from "../lib/creative-review/progress";
import { translateVoiceoverToEnglish } from "../lib/creative-review/translateVoiceover";
import { validateCreativeReviewApproval } from "../lib/creative-review/lifecycle";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import type { CreativeReview } from "../lib/creative-review/types";

const root = join(import.meta.dirname, "..");

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`  ✓ ${name}`);
    })
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      throw err;
    });
}

const FIXED_NOW = () => new Date("2026-08-11T12:00:00.000Z");
const ACTOR = { type: "user" as const, id: "editor-1" };
const LATER = "2026-08-11T13:00:00.000Z";

function minimalPackage(): Pick<
  ContentPackageOutput,
  "voiceover_text" | "visual_scenes" | "image_prompts"
> {
  return {
    voiceover_text: "Původní AI voiceover.",
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

function seeded(): CreativeReview {
  return seedCreativeReviewFromPackage(minimalPackage(), { now: FIXED_NOW });
}

function saveEdit(
  current: CreativeReview,
  localized: string,
  expectedVersion = current.version,
) {
  return commitCreativeReviewSave({
    current,
    expectedVersion,
    edits: {
      voiceoverLocalizedEdit: localized,
      scenes: current.scenes.map((scene) => ({
        id: scene.id,
        intentDescription: scene.intent.description,
        directorNotes: scene.director_notes,
      })),
    },
    actor: ACTOR,
    timestamp: LATER,
  });
}

function phase2LegacyBlob(): unknown {
  return {
    status: "draft",
    version: 1,
    approved: false,
    voiceover: {
      original_ai: "Legacy voiceover.",
      localized_edit: "Legacy voiceover.",
      final_approved: "Legacy voiceover.",
    },
    scenes: [
      {
        id: "scene-1",
        index: 0,
        director_notes: "",
        intent: {
          description: "Legacy intent",
          presentation_type: "IMAGE",
          visual_source: "generated",
          asset_id: null,
          used_as: null,
        },
      },
    ],
    history: [
      {
        version: 1,
        event: "seed",
        timestamp: "2026-08-11T12:00:00.000Z",
        actor: { type: "system", id: "system" },
        voiceover: {
          original_ai: "Legacy voiceover.",
          localized_edit: "Legacy voiceover.",
          final_approved: "Legacy voiceover.",
        },
        scenes: [
          {
            id: "scene-1",
            index: 0,
            director_notes: "",
            intent: {
              description: "Legacy intent",
              presentation_type: "IMAGE",
              visual_source: "generated",
              asset_id: null,
              used_as: null,
            },
          },
        ],
      },
    ],
  };
}

async function main() {
  console.log("A — Translation lifecycle");

  await check("save appends history + bumps version", () => {
    const current = seeded();
    const result = saveEdit(current, "Upravený voiceover.");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.review.version, 2);
    assert.equal(result.review.history.length, 2);
    assert.equal(result.review.history[1]!.event, "save");
    assert.equal(result.review.history[1]!.version, 2);
    assert.equal(result.review.voiceover.localized_edit, "Upravený voiceover.");
    assert.equal(result.review.voiceover.english_confirmed, false);
    assert.equal(result.review.approved, false);
    assert.equal(result.review.status, "draft");
  });

  await check("translate persists english_preview without confirming", () => {
    const current = seeded();
    const saved = saveEdit(current, "Lokální text.");
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    const translated = commitCreativeReviewTranslate({
      current: saved.review,
      expectedVersion: saved.review.version,
      englishPreview: "Local text.",
      actor: ACTOR,
      timestamp: "2026-08-11T14:00:00.000Z",
    });
    assert.equal(translated.ok, true);
    if (!translated.ok) return;
    assert.equal(translated.review.voiceover.english_preview, "Local text.");
    assert.equal(translated.review.voiceover.english_confirmed, false);
    assert.equal(translated.review.history.at(-1)!.event, "translate");
    assert.equal(translated.review.version, 3);
  });

  await check("confirm translation sets final_approved + english_confirmed", () => {
    const current = seeded();
    const saved = saveEdit(current, "Lokální text.");
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    const translated = commitCreativeReviewTranslate({
      current: saved.review,
      expectedVersion: saved.review.version,
      englishPreview: "Local text.",
      actor: ACTOR,
      timestamp: "2026-08-11T14:00:00.000Z",
    });
    assert.equal(translated.ok, true);
    if (!translated.ok) return;
    const confirmed = commitCreativeReviewConfirmTranslation({
      current: translated.review,
      expectedVersion: translated.review.version,
      actor: ACTOR,
      timestamp: "2026-08-11T15:00:00.000Z",
    });
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;
    assert.equal(confirmed.review.voiceover.english_confirmed, true);
    assert.equal(confirmed.review.voiceover.final_approved, "Lokální text.");
    assert.equal(
      confirmed.review.voiceover.translation_confirmed_by,
      ACTOR.id,
    );
    assert.equal(confirmed.review.status, "ready");
    assert.equal(confirmed.review.approved, false);
    assert.equal(confirmed.review.history.at(-1)!.event, "confirm_translation");
  });

  await check("confirm translation fails without english_preview", () => {
    const current = seeded();
    const result = commitCreativeReviewConfirmTranslation({
      current,
      expectedVersion: 1,
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "validation_failed");
  });

  await check("editing localized_edit invalidates translation confirmation", () => {
    const current = seeded();
    const saved = saveEdit(current, "Text A");
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    const translated = commitCreativeReviewTranslate({
      current: saved.review,
      expectedVersion: saved.review.version,
      englishPreview: "Text A EN",
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(translated.ok, true);
    if (!translated.ok) return;
    const confirmed = commitCreativeReviewConfirmTranslation({
      current: translated.review,
      expectedVersion: translated.review.version,
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;
    const reedited = saveEdit(confirmed.review, "Text B");
    assert.equal(reedited.ok, true);
    if (!reedited.ok) return;
    assert.equal(reedited.review.voiceover.english_confirmed, false);
    assert.equal(reedited.review.voiceover.translation_confirmed_at, null);
    assert.equal(reedited.review.voiceover.english_preview, "Text A EN");
    assert.equal(reedited.review.status, "draft");
  });

  console.log("\nB — Approval lifecycle");

  await check("approval requires english_confirmed + scene intent", () => {
    const current = seeded();
    const gate = validateCreativeReviewApproval(current);
    assert.equal(gate.ok, false);

    const saved = saveEdit(current, "Text");
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    const translated = commitCreativeReviewTranslate({
      current: saved.review,
      expectedVersion: saved.review.version,
      englishPreview: "Text EN",
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(translated.ok, true);
    if (!translated.ok) return;
    const confirmed = commitCreativeReviewConfirmTranslation({
      current: translated.review,
      expectedVersion: translated.review.version,
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;
    const approved = commitCreativeReviewApprove({
      current: confirmed.review,
      expectedVersion: confirmed.review.version,
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(approved.ok, true);
    if (!approved.ok) return;
    assert.equal(approved.review.status, "approved");
    assert.equal(approved.review.approved, true);
    assert.equal(approved.review.history.at(-1)!.event, "approve");
  });

  await check("unapprove returns package to ready", () => {
    const current = seeded();
    const saved = saveEdit(current, "Text");
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    const translated = commitCreativeReviewTranslate({
      current: saved.review,
      expectedVersion: saved.review.version,
      englishPreview: "Text EN",
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(translated.ok, true);
    if (!translated.ok) return;
    const confirmed = commitCreativeReviewConfirmTranslation({
      current: translated.review,
      expectedVersion: translated.review.version,
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;
    const approved = commitCreativeReviewApprove({
      current: confirmed.review,
      expectedVersion: confirmed.review.version,
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(approved.ok, true);
    if (!approved.ok) return;
    const unapproved = commitCreativeReviewUnapprove({
      current: approved.review,
      expectedVersion: approved.review.version,
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(unapproved.ok, true);
    if (!unapproved.ok) return;
    assert.equal(unapproved.review.approved, false);
    assert.equal(unapproved.review.status, "ready");
    assert.equal(unapproved.review.history.at(-1)!.event, "unapprove");
  });

  await check("approval fails without complete scene intent", () => {
    const current = seeded();
    const saved = saveEdit(current, "Text");
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    const translated = commitCreativeReviewTranslate({
      current: saved.review,
      expectedVersion: saved.review.version,
      englishPreview: "Text EN",
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(translated.ok, true);
    if (!translated.ok) return;
    const confirmed = commitCreativeReviewConfirmTranslation({
      current: translated.review,
      expectedVersion: translated.review.version,
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;
    // Simulate a corrupted/incomplete intent snapshot for the approval gate.
    const incomplete: CreativeReview = {
      ...confirmed.review,
      scenes: confirmed.review.scenes.map((scene, index) =>
        index === 0
          ? {
              ...scene,
              intent: { ...scene.intent, description: "" },
            }
          : scene,
      ),
    };
    const approved = commitCreativeReviewApprove({
      current: incomplete,
      expectedVersion: incomplete.version,
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(approved.ok, false);
    if (approved.ok) return;
    assert.equal(approved.code, "validation_failed");
    assert.ok(
      approved.issues.some((issue) => issue.path.includes("scenes")),
    );
  });

  console.log("\nC — Optimistic concurrency");

  await check("stale expectedVersion fails gracefully", () => {
    const current = seeded();
    const first = saveEdit(current, "A", 1);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const stale = saveEdit(first.review, "B", 1);
    assert.equal(stale.ok, false);
    if (stale.ok) return;
    assert.equal(stale.code, "version_conflict");
    assert.equal(stale.currentVersion, 2);
  });

  await check("history is append-only across mutations", () => {
    const current = seeded();
    const saved = saveEdit(current, "Text");
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    const seedEntry = saved.review.history[0]!;
    const translated = commitCreativeReviewTranslate({
      current: saved.review,
      expectedVersion: saved.review.version,
      englishPreview: "EN",
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(translated.ok, true);
    if (!translated.ok) return;
    assert.deepEqual(translated.review.history[0], seedEntry);
    assert.equal(translated.review.history.length, 3);
  });

  console.log("\nD — Legacy packages + progress");

  await check("legacy Phase 2 packages load after normalize", () => {
    const normalized = normalizeLegacyCreativeReview(phase2LegacyBlob());
    const parsed = parseCreativeReview(normalized);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.value.voiceover.english_preview, null);
    assert.equal(parsed.value.voiceover.english_confirmed, false);
    assert.equal(parsed.value.history[0]!.status, "draft");
    assert.equal(parsed.value.history[0]!.approved, false);

    const fromBrief = readCreativeReviewFromBrief({
      creative_review: phase2LegacyBlob(),
    });
    assert.equal(fromBrief.ok, true);
    if (!fromBrief.ok) return;
    assert.ok(fromBrief.value);
  });

  await check("run progress counts statuses", () => {
    const draft = seeded();
    const saved = saveEdit(draft, "Ready path");
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    const translated = commitCreativeReviewTranslate({
      current: saved.review,
      expectedVersion: saved.review.version,
      englishPreview: "EN",
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(translated.ok, true);
    if (!translated.ok) return;
    const confirmed = commitCreativeReviewConfirmTranslation({
      current: translated.review,
      expectedVersion: translated.review.version,
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;
    const approved = commitCreativeReviewApprove({
      current: confirmed.review,
      expectedVersion: confirmed.review.version,
      actor: ACTOR,
      timestamp: LATER,
    });
    assert.equal(approved.ok, true);
    if (!approved.ok) return;

    const progress = computeCreativeReviewRunProgress([
      draft,
      confirmed.review,
      approved.review,
      null,
    ]);
    assert.equal(progress.total, 3);
    assert.equal(progress.approved, 1);
    assert.equal(progress.ready, 1);
    assert.equal(progress.pending, 1);
    assert.equal(progress.waitingForTranslation, 1);
  });

  await check("translateVoiceoverToEnglish uses provider + persists shape", async () => {
    const provider: TextProvider = {
      name: "fake",
      async complete() {
        return {
          text: JSON.stringify({ english: "Translated English voiceover." }),
          model: "fake-model",
          provider: "fake",
          usage: {
            prompt_tokens: 1,
            completion_tokens: 1,
            cached_tokens: null,
          },
        };
      },
    };
    const result = await translateVoiceoverToEnglish(
      { localizedEdit: "Lokální text pro překlad." },
      { textProvider: provider },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.english, "Translated English voiceover.");
  });

  console.log("\nE — UI / wiring guards");

  await check("UI exposes translation + approval affordances", () => {
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
    const actions = readFileSync(
      join(root, "app/projects/[id]/creative-review/actions.ts"),
      "utf8",
    );
    const combined = `${workspace}\n${panel}\n${actions}`;
    assert.match(panel, /Confirm Translation/);
    assert.match(panel, /Confirm Translation Result/);
    assert.match(panel, /English Preview/);
    assert.match(panel, /Approve Package/);
    assert.match(panel, /Unapprove Package/);
    assert.match(panel, /Package Status/);
    assert.match(workspace, /Waiting for translation/);
    assert.match(workspace, /Approved/);
    assert.match(actions, /translateCreativeReviewPackage/);
    assert.match(actions, /approveCreativeReviewPackage/);
    assert.match(actions, /expectedVersion/);
    assert.match(actions, /getProjectForAdmin/);
    assert.doesNotMatch(combined, /start-video-job|rebuildImage/i);
  });

  await check("no worker / image rebuild wiring in creative-review admin", () => {
    const admin = readFileSync(
      join(root, "lib/api/creative-review-admin.ts"),
      "utf8",
    );
    assert.doesNotMatch(admin, /video_jobs/);
    assert.doesNotMatch(admin, /Continue Generation/i);
    assert.match(admin, /version_conflict/);
    assert.match(admin, /translateCreativeReviewPackage/);
  });

  await check("permission gates require project ownership on every mutation", () => {
    const actions = readFileSync(
      join(root, "app/projects/[id]/creative-review/actions.ts"),
      "utf8",
    );
    assert.match(actions, /requireProjectEditor/);
    assert.match(actions, /getProjectForAdmin/);
    assert.match(actions, /nemáte oprávnění/);
    for (const name of [
      "saveCreativeReviewPackageAction",
      "translateCreativeReviewPackageAction",
      "confirmCreativeReviewTranslationAction",
      "approveCreativeReviewPackageAction",
      "unapproveCreativeReviewPackageAction",
    ]) {
      assert.match(actions, new RegExp(name));
    }
  });

  console.log("\nAll Phase 4 Creative Review checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
