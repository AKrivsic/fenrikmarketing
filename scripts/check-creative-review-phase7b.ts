/**
 * Phase 7B — Manual Creative Review final polish checks.
 *
 * Run: npx tsx scripts/check-creative-review-phase7b.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_EDITOR_LANGUAGE,
  EDITOR_LANGUAGE_CODES,
  EDITOR_LANGUAGE_OPTIONS,
  parseEditorLanguage,
} from "../lib/admin/editorLanguage";
import { applyCreativeReviewEdits } from "../lib/creative-review/applyEdits";
import {
  invalidateSceneIntentTranslationAfterEdit,
  invalidateVoiceoverTranslationAfterEdit,
  validateCreativeReviewApproval,
} from "../lib/creative-review/lifecycle";
import {
  commitCreativeReviewTranslate,
} from "../lib/creative-review/mutations";
import { seedCreativeReviewFromPackage } from "../lib/creative-review/seed";
import { computeCreativeReviewDurationEstimate } from "../lib/creative-review/duration";
import { WORDS_PER_SECOND } from "../lib/video-engine/storyboard";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import { normalizeProductionConfig } from "../lib/projects/productionRun";

const root = join(import.meta.dirname, "..");
const ACTOR = { type: "user" as const, id: "editor-1" };
const FIXED_NOW = () => new Date("2026-08-12T12:00:00.000Z");

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`  ✓ ${name}`))
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      throw err;
    });
}

function minimalPackage(): Pick<
  ContentPackageOutput,
  "voiceover_text" | "visual_scenes" | "image_prompts"
> {
  return {
    voiceover_text: "Original voiceover text for duration.",
    visual_scenes: [{ source: "ai", image_prompt: "A calm office morning" }],
    image_prompts: ["A calm office morning"],
  };
}

async function main() {
  console.log("Phase 7B — Editor Language + polish\n");

  await check("Editor Language registry is extensible (en/cs/uk)", () => {
    assert.deepEqual([...EDITOR_LANGUAGE_CODES], ["en", "cs", "uk"]);
    assert.equal(EDITOR_LANGUAGE_OPTIONS.length, 3);
    assert.equal(parseEditorLanguage("uk"), "uk");
    assert.equal(parseEditorLanguage("nope"), DEFAULT_EDITOR_LANGUAGE);
  });

  await check("Manual Review config stamps editorLanguage", () => {
    const config = normalizeProductionConfig({
      packageCount: 1,
      platforms: ["tiktok"],
      generationMode: "manual_review",
      editorLanguage: "cs",
    });
    assert.equal(config.generationMode, "manual_review");
    assert.equal(config.editorLanguage, "cs");
  });

  await check("Localized edit clears final_approved + english preview", () => {
    const seeded = seedCreativeReviewFromPackage(minimalPackage(), {
      now: FIXED_NOW,
    });
    const withTranslation = commitCreativeReviewTranslate({
      current: seeded,
      expectedVersion: 1,
      voiceover: {
        ...seeded.voiceover,
        localized_edit: "Localized VO",
        english_preview: "English VO",
        english_preview_outdated: false,
      },
      scenes: seeded.scenes.map((scene) => ({
        ...scene,
        intent: {
          ...scene.intent,
          localized_edit: "Localized intent",
          english_preview: "English intent",
          english_preview_outdated: false,
        },
      })),
      actor: ACTOR,
      timestamp: "2026-08-12T12:01:00.000Z",
    });
    assert.equal(withTranslation.ok, true);
    if (!withTranslation.ok) return;

    const invalidated = invalidateVoiceoverTranslationAfterEdit(
      withTranslation.review.voiceover,
    );
    assert.equal(invalidated.english_preview, null);
    assert.equal(invalidated.english_confirmed, false);
    assert.equal(invalidated.final_approved, "");
    assert.equal(invalidated.english_preview_outdated, true);

    const sceneInvalid = invalidateSceneIntentTranslationAfterEdit(
      withTranslation.review.scenes[0]!.intent,
    );
    assert.equal(sceneInvalid.english_preview, null);
    assert.equal(sceneInvalid.english_preview_outdated, true);
  });

  await check("apply edits never leaves stale final_approved", () => {
    const seeded = seedCreativeReviewFromPackage(minimalPackage(), {
      now: FIXED_NOW,
    });
    const translated = commitCreativeReviewTranslate({
      current: seeded,
      expectedVersion: 1,
      voiceover: {
        ...seeded.voiceover,
        localized_edit: "A",
        english_preview: "A EN",
        english_preview_outdated: false,
      },
      scenes: seeded.scenes.map((scene) => ({
        ...scene,
        intent: {
          ...scene.intent,
          localized_edit: scene.intent.localized_edit,
          english_preview: "Scene EN",
          english_preview_outdated: false,
        },
      })),
      actor: ACTOR,
      timestamp: "2026-08-12T12:02:00.000Z",
    });
    assert.equal(translated.ok, true);
    if (!translated.ok) return;

    const edited = applyCreativeReviewEdits(translated.review, {
      voiceoverLocalizedEdit: "B",
      scenes: translated.review.scenes.map((scene) => ({
        id: scene.id,
        intentLocalizedEdit: scene.intent.localized_edit,
        directorNotes: scene.director_notes,
      })),
    });
    assert.equal(edited.ok, true);
    if (!edited.ok) return;
    assert.equal(edited.value.voiceover.final_approved, "");
    assert.equal(edited.value.voiceover.english_preview, null);
    assert.equal(edited.value.approved, false);
    const gate = validateCreativeReviewApproval(edited.value);
    assert.equal(gate.ok, false);
  });

  await check("duration estimate reuses WORDS_PER_SECOND and never blocks", () => {
    assert.equal(WORDS_PER_SECOND, 2.6);
    const estimate = computeCreativeReviewDurationEstimate({
      originalAi: "one two three four five six seven eight",
      localizedEdit: "one two three",
    });
    assert.ok(estimate.originalSeconds > estimate.estimatedSeconds);
    assert.ok(Number.isFinite(estimate.differenceSeconds));
  });

  await check("dead manual translation UI/actions removed", () => {
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
    const admin = readFileSync(
      join(root, "lib/api/creative-review-admin.ts"),
      "utf8",
    );
    const mutations = readFileSync(
      join(root, "lib/creative-review/mutations.ts"),
      "utf8",
    );
    assert.doesNotMatch(panel, /Update English Preview/);
    assert.doesNotMatch(actions, /translateCreativeReviewPackageAction/);
    assert.doesNotMatch(admin, /confirmCreativeReviewTranslation/);
    assert.doesNotMatch(mutations, /commitCreativeReviewConfirmTranslation/);
    assert.match(admin, /immutable_status/);
    assert.match(admin, /waiting_for_creative_review/);
  });

  await check("Settings + seed wiring for Editor Language exist", () => {
    const settings = readFileSync(join(root, "app/settings/page.tsx"), "utf8");
    const productionActions = readFileSync(
      join(root, "app/projects/[id]/production/actions.ts"),
      "utf8",
    );
    const seed = readFileSync(join(root, "lib/creative-review/seed.ts"), "utf8");
    const translate = readFileSync(
      join(root, "lib/creative-review/translateVoiceover.ts"),
      "utf8",
    );
    assert.match(settings, /EditorLanguageSettings/);
    assert.doesNotMatch(settings, /Stav konfigurace/);
    assert.match(productionActions, /getEditorLanguagePreference/);
    assert.match(seed, /translateCreativeReviewForEditor/);
    assert.match(translate, /translateCreativeReviewForEditor/);
  });

  await check("save path auto-translates after Localized changes", () => {
    const admin = readFileSync(
      join(root, "lib/api/creative-review-admin.ts"),
      "utf8",
    );
    assert.match(admin, /creativeReviewNeedsEnglishPreviewUpdate/);
    assert.match(admin, /translateCreativeReviewEnglishPreviews/);
    assert.match(admin, /commitCreativeReviewTranslate/);
  });

  console.log("\nAll Phase 7B Creative Review checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
