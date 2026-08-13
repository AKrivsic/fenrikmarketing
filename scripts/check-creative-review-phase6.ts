/**
 * Phase 6 — Creative Rebuild Engine checks.
 *
 * Run: npx tsx scripts/check-creative-review-phase6.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import {
  composeRebuiltImagePrompt,
  rebuildCreativePackageForVideo,
} from "../lib/creative-review/rebuildCreativePackage";
import { seedCreativeReviewFromPackage } from "../lib/creative-review/seed";
import {
  commitCreativeReviewApprove,
  commitCreativeReviewSave,
  commitCreativeReviewTranslate,
} from "../lib/creative-review/mutations";
import type { CreativeReview } from "../lib/creative-review/types";
import type {
  OpeningImpact,
  VideoConcept,
  VisualIdentity,
} from "../lib/content-pipeline/types";

const root = join(import.meta.dirname, "..");
const ACTOR = { type: "user" as const, id: "editor-1" };
const TS = "2026-08-12T10:00:00.000Z";

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`  ✓ ${name}`))
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      throw err;
    });
}

const VIDEO_CONCEPT: VideoConcept = {
  title: "Morning Momentum",
  core_idea: "Teams reclaim their first hour",
  narrative_arc: "problem → insight → product → proof",
  emotional_tone: "confident urgency",
  audience_insight: "mornings are fragmented",
  product_role: "hero workflow",
  why_it_works: "specific and visual",
  visual_direction: {
    art_direction: "clean modern documentary",
    lighting: "soft natural window light",
    palette: "cool neutrals with teal accent",
    environment: "bright contemporary office",
    camera_style: "steady mid shots",
    character_style: "professional founders",
  },
};

const OPENING_IMPACT: OpeningImpact = {
  first_image: "Founder at a laptop in morning light, focused",
  first_spoken_sentence: "Most teams waste their mornings.",
  emotion: "urgent clarity",
  pacing: "fast",
  attention_pattern: "pattern_interrupt",
};

const VISUAL_IDENTITY: VisualIdentity = {
  art_direction: "clean modern documentary",
  lighting: "soft natural window light",
  palette: "cool neutrals with teal accent",
  environment: "bright contemporary office",
  camera_style: "steady mid shots",
  character_style: "professional founders",
  opening_emotion: "urgent clarity",
  opening_first_image: OPENING_IMPACT.first_image,
};

function approveWithEdits(args: {
  review: CreativeReview;
  localized: string;
  sceneIntents?: string[];
  sceneEnglish?: string[];
  directorNotes?: string[];
}): CreativeReview {
  const { review } = args;
  const saved = commitCreativeReviewSave({
    current: review,
    expectedVersion: review.version,
    edits: {
      voiceoverLocalizedEdit: args.localized,
      scenes: review.scenes.map((scene, index) => ({
        id: scene.id,
        intentLocalizedEdit:
          args.sceneIntents?.[index] ?? scene.intent.localized_edit,
        directorNotes: args.directorNotes?.[index] ?? scene.director_notes,
      })),
    },
    actor: ACTOR,
    timestamp: "2026-08-12T09:01:00.000Z",
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) throw new Error("save");
  const voiceover = {
    ...saved.review.voiceover,
    english_preview: "Approved English voiceover.",
    english_preview_outdated: false,
  };
  const scenes = saved.review.scenes.map((scene, index) => ({
    ...scene,
    intent: {
      ...scene.intent,
      english_preview:
        args.sceneEnglish?.[index] ?? scene.intent.localized_edit,
      english_preview_outdated: false,
    },
  }));
  const translated = commitCreativeReviewTranslate({
    current: saved.review,
    expectedVersion: saved.review.version,
    voiceover,
    scenes,
    actor: ACTOR,
    timestamp: "2026-08-12T09:02:00.000Z",
  });
  assert.equal(translated.ok, true);
  if (!translated.ok) throw new Error("translate");
  const approved = commitCreativeReviewApprove({
    current: translated.review,
    expectedVersion: translated.review.version,
    actor: ACTOR,
    timestamp: "2026-08-12T09:04:00.000Z",
  });
  assert.equal(approved.ok, true);
  if (!approved.ok) throw new Error("approve");
  return approved.review;
}

function basePackage(
  overrides: Partial<ContentPackageOutput> = {},
): ContentPackageOutput {
  return {
    title: "Pkg",
    funnel_stage: "Awareness",
    hook: "Old hook",
    voiceover_text: "Old voiceover text that should be replaced.",
    subtitles: "Old voiceover text that should be replaced.",
    cta: { type: "learn_more", text: "Learn more" },
    video: { concept: VIDEO_CONCEPT.core_idea, script: "Script" },
    platform_outputs: {
      tiktok: { caption: "tt keep me" },
      instagram: { caption: "ig keep me" },
      facebook: { caption: "fb keep me" },
      youtube: { caption: "yt keep me" },
      linkedin: { caption: "li keep me" },
      x: { caption: "x keep me" },
      google_business: { caption: "gb keep me" },
    },
    image_prompts: ["Old AI still prompt"],
    visual_scenes: [
      { source: "ai", image_prompt: "Old AI still prompt" },
    ],
    presentation_generation: {
      pipeline: "content_pipeline",
      video_concept: VIDEO_CONCEPT,
      opening_impact: OPENING_IMPACT,
      visual_identity: VISUAL_IDENTITY,
    },
    ...overrides,
  } as ContentPackageOutput;
}

async function main() {
  console.log("A — Prompt composition + visual consistency");

  await check("composeRebuiltImagePrompt embeds identity + intent + notes", () => {
    const prompt = composeRebuiltImagePrompt({
      sceneIndex: 0,
      intentDescription: "Show the founder deciding to fix the morning chaos.",
      directorNotes: "Wider frame, keep teal accent in background.",
      presentationType: "IMAGE",
      anchors: {
        visualIdentity: VISUAL_IDENTITY,
        openingImpact: OPENING_IMPACT,
        videoConcept: VIDEO_CONCEPT,
      },
    });
    assert.match(prompt, /Show the founder deciding/);
    assert.match(prompt, /Wider frame/);
    assert.match(prompt, /CREATIVE INTENT/);
    assert.match(prompt, /DIRECTOR NOTES/);
    assert.match(prompt, /clean modern documentary/);
    assert.match(prompt, /soft natural window light/);
    assert.match(prompt, /VISUAL CONSISTENCY/);
    assert.doesNotMatch(prompt, /VIDEO CONCEPT/);
    assert.doesNotMatch(prompt, /OPENING IMPACT/);
    assert.doesNotMatch(prompt, /Most teams waste their mornings/);
    assert.doesNotMatch(prompt, /Teams reclaim their first hour/);
    assert.doesNotMatch(prompt, /problem → insight → product → proof/);
    assert.doesNotMatch(prompt, /mornings are fragmented/);
    assert.doesNotMatch(prompt, /opening_emotion/);
    assert.doesNotMatch(prompt, /opening_first_image/);
  });

  await check("non-opening scenes still preserve Visual Identity", () => {
    const prompt = composeRebuiltImagePrompt({
      sceneIndex: 2,
      intentDescription: "Product UI close-up proving the workflow.",
      directorNotes: "",
      presentationType: "IMAGE",
      anchors: {
        visualIdentity: VISUAL_IDENTITY,
        openingImpact: OPENING_IMPACT,
        videoConcept: VIDEO_CONCEPT,
      },
    });
    assert.doesNotMatch(prompt, /OPENING IMPACT/);
    assert.doesNotMatch(prompt, /VIDEO CONCEPT/);
    assert.match(prompt, /clean modern documentary/);
    assert.match(prompt, /Product UI close-up/);
  });

  console.log("\nB — Full package rebuild");

  await check("Scene Intent english_preview rebuilds AI image_prompt", () => {
    const seeded = seedCreativeReviewFromPackage(
      {
        voiceover_text: "Original VO.",
        visual_scenes: [
          { source: "ai", image_prompt: "Old scene one" },
          { source: "ai", image_prompt: "Old scene two" },
        ],
        image_prompts: ["Old scene one", "Old scene two"],
      },
      { now: () => new Date("2026-08-12T08:00:00.000Z") },
    );
    const approved = approveWithEdits({
      review: seeded,
      localized: "Schválený voiceover o ranní produktivitě.",
      sceneIntents: [
        "Zakladatel čelí chaotické ranní schránce.",
        "Dashboard produktu vrací klidný fokus.",
      ],
      sceneEnglish: [
        "Founder faces a chaotic morning inbox.",
        "Product dashboard restores calm focus.",
      ],
    });

    const pkg = basePackage({
      visual_scenes: [
        { source: "ai", image_prompt: "Old scene one" },
        { source: "ai", image_prompt: "Old scene two" },
      ],
      image_prompts: ["Old scene one", "Old scene two"],
    });

    const result = rebuildCreativePackageForVideo({
      package: pkg,
      creativeReview: approved,
      actor: ACTOR,
      timestamp: TS,
      packageId: "pkg-1",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const scenes = result.value.package.visual_scenes as Array<{
      source: string;
      image_prompt?: string;
    }>;
    assert.equal(scenes.length, 2);
    assert.equal(scenes[0]!.source, "ai");
    assert.match(scenes[0]!.image_prompt!, /Founder faces a chaotic morning inbox/);
    assert.doesNotMatch(scenes[0]!.image_prompt!, /Zakladatel čelí chaotické/);
    assert.match(scenes[0]!.image_prompt!, /clean modern documentary/);
    assert.doesNotMatch(scenes[0]!.image_prompt!, /DIRECTOR NOTES/);
    assert.doesNotMatch(scenes[0]!.image_prompt!, /Founder at a laptop in morning light/);
    assert.doesNotMatch(scenes[0]!.image_prompt!, /VIDEO CONCEPT/);
    assert.doesNotMatch(scenes[0]!.image_prompt!, /Most teams waste their mornings/);
    assert.match(scenes[1]!.image_prompt!, /Product dashboard restores calm focus/);
    assert.doesNotMatch(scenes[1]!.image_prompt!, /Dashboard produktu/);
    assert.equal(result.value.promptsRebuilt, 2);

    // Legacy sync
    assert.equal(result.value.package.image_prompts?.length, 2);
    assert.match(
      result.value.package.image_prompts![0]!,
      /Founder faces a chaotic morning inbox/,
    );
  });

  await check("Non-empty Director Notes fail closed on AI image rebuild", () => {
    const seeded = seedCreativeReviewFromPackage(
      {
        voiceover_text: "Original VO.",
        visual_scenes: [{ source: "ai", image_prompt: "Still" }],
        image_prompts: ["Still"],
      },
      { now: () => new Date("2026-08-12T08:00:00.000Z") },
    );
    const approved = approveWithEdits({
      review: seeded,
      localized: "Localized VO.",
      directorNotes: ["Wider frame, keep teal accent."],
    });
    const result = rebuildCreativePackageForVideo({
      package: basePackage(),
      creativeReview: approved,
      actor: ACTOR,
      timestamp: TS,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(
      result.issues.some((issue) =>
        issue.message.includes("no verified English equivalent"),
      ),
    );
  });

  await check("Voiceover uses final_approved exactly — no Opening Impact prepend", () => {
    const seeded = seedCreativeReviewFromPackage(
      {
        voiceover_text: "Original VO.",
        visual_scenes: [{ source: "ai", image_prompt: "Still" }],
        image_prompts: ["Still"],
      },
      { now: () => new Date("2026-08-12T08:00:00.000Z") },
    );
    const approved = approveWithEdits({
      review: seeded,
      localized: "Týmy ztrácejí rána. My to měníme.",
    });
    const result = rebuildCreativePackageForVideo({
      package: basePackage(),
      creativeReview: approved,
      actor: ACTOR,
      timestamp: TS,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(
      result.value.package.voiceover_text,
      approved.voiceover.final_approved,
    );
    assert.equal(
      result.value.package.subtitles,
      approved.voiceover.final_approved,
    );
    assert.equal(
      result.value.package.video.script,
      approved.voiceover.final_approved,
    );
    assert.equal(
      result.value.package.voiceover_text.includes(
        OPENING_IMPACT.first_spoken_sentence,
      ),
      false,
    );
    assert.equal(
      result.value.package.hook,
      approved.voiceover.final_approved.split("\n")[0]!.trim(),
    );
    assert.notEqual(
      result.value.package.hook,
      OPENING_IMPACT.first_spoken_sentence,
    );
    assert.match(result.value.package.voiceover_text, /Týmy ztrácejí rána/);
    const pg = result.value.package.presentation_generation as {
      creative_rebuild?: {
        opening_prepended?: boolean;
        voiceover_aligned?: boolean;
        completed_at?: string;
      };
    };
    assert.equal(pg.creative_rebuild?.opening_prepended, undefined);
    assert.equal(pg.creative_rebuild?.voiceover_aligned, undefined);
    assert.equal(pg.creative_rebuild?.completed_at, TS);
  });

  await check("Asset scenes remain assets; director notes → modify only", () => {
    const assetId = "11111111-1111-4111-8111-111111111111";
    const seeded = seedCreativeReviewFromPackage(
      {
        voiceover_text: "Original VO.",
        visual_scenes: [
          { source: "ai", image_prompt: "AI still" },
          {
            source: "asset",
            asset_id: assetId,
            used_as: "product_ui",
          },
        ],
        image_prompts: ["AI still"],
      },
      { now: () => new Date("2026-08-12T08:00:00.000Z") },
    );
    const approved = approveWithEdits({
      review: seeded,
      localized: "Localized VO for assets.",
      directorNotes: ["", "Frame the asset fullscreen, soft vignette."],
    });
    const result = rebuildCreativePackageForVideo({
      package: basePackage({
        visual_scenes: [
          { source: "ai", image_prompt: "AI still" },
          {
            source: "asset",
            asset_id: assetId,
            used_as: "product_ui",
          },
        ],
        image_prompts: ["AI still"],
      }),
      creativeReview: approved,
      actor: ACTOR,
      timestamp: TS,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const scenes = result.value.package.visual_scenes as Array<Record<string, unknown>>;
    assert.equal(scenes[1]!.source, "asset");
    assert.equal(scenes[1]!.asset_id, assetId);
    assert.equal(scenes[1]!.used_as, "product_ui");
    assert.equal(scenes[1]!.modify, "Frame the asset fullscreen, soft vignette.");
    assert.equal(Object.prototype.hasOwnProperty.call(scenes[1]!, "image_prompt"), false);
  });

  await check("Typed scenes preserve payload semantics", () => {
    const seeded = seedCreativeReviewFromPackage(
      {
        voiceover_text: "Original VO.",
        visual_scenes: [
          { source: "ai", image_prompt: "AI still" },
          {
            type: "QUOTE",
            payload: {
              quote: "We shipped faster",
              attribution: "Alex, Founder",
              proof_id: "proof-1",
            },
          },
          {
            type: "CHECKLIST",
            payload: {
              title: "Morning checklist",
              items: ["Open inbox", "Prioritize", "Ship"],
            },
          },
        ],
        image_prompts: ["AI still"],
      },
      { now: () => new Date("2026-08-12T08:00:00.000Z") },
    );
    const approved = approveWithEdits({
      review: seeded,
      localized: "Localized VO typed.",
      sceneIntents: [
        "AI opener intent",
        "Improved quote presentation intent",
        "Improved checklist presentation intent",
      ],
    });
    const quotePayload = {
      quote: "We shipped faster",
      attribution: "Alex, Founder",
      proof_id: "proof-1",
    };
    const checklistPayload = {
      title: "Morning checklist",
      items: ["Open inbox", "Prioritize", "Ship"],
    };
    const result = rebuildCreativePackageForVideo({
      package: basePackage({
        visual_scenes: [
          { source: "ai", image_prompt: "AI still" },
          { type: "QUOTE", payload: quotePayload },
          { type: "CHECKLIST", payload: checklistPayload },
        ] as ContentPackageOutput["visual_scenes"],
        image_prompts: ["AI still"],
      }),
      creativeReview: approved,
      actor: ACTOR,
      timestamp: TS,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const scenes = result.value.package.visual_scenes as Array<Record<string, unknown>>;
    assert.equal(scenes[1]!.type, "QUOTE");
    assert.deepEqual(scenes[1]!.payload, quotePayload);
    assert.equal(scenes[2]!.type, "CHECKLIST");
    assert.deepEqual(scenes[2]!.payload, checklistPayload);
  });

  await check("Platform copy / strategy fields remain untouched", () => {
    const seeded = seedCreativeReviewFromPackage(
      {
        voiceover_text: "Original VO.",
        visual_scenes: [{ source: "ai", image_prompt: "Still" }],
        image_prompts: ["Still"],
      },
      { now: () => new Date("2026-08-12T08:00:00.000Z") },
    );
    const approved = approveWithEdits({
      review: seeded,
      localized: "Only voiceover changes.",
    });
    const pkg = basePackage();
    const result = rebuildCreativePackageForVideo({
      package: pkg,
      creativeReview: approved,
      actor: ACTOR,
      timestamp: TS,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(
      result.value.package.platform_outputs,
      pkg.platform_outputs,
    );
    assert.equal(result.value.package.cta?.text, "Learn more");
    assert.equal(result.value.package.video.concept, VIDEO_CONCEPT.core_idea);
  });

  await check("History appends creative_rebuild_completed", () => {
    const seeded = seedCreativeReviewFromPackage(
      {
        voiceover_text: "Original VO.",
        visual_scenes: [{ source: "ai", image_prompt: "Still" }],
        image_prompts: ["Still"],
      },
      { now: () => new Date("2026-08-12T08:00:00.000Z") },
    );
    const approved = approveWithEdits({
      review: seeded,
      localized: "History VO.",
    });
    const result = rebuildCreativePackageForVideo({
      package: basePackage(),
      creativeReview: approved,
      actor: ACTOR,
      timestamp: TS,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const last = result.value.creativeReview.history.at(-1)!;
    assert.equal(last.event, "creative_rebuild_completed");
    assert.equal(last.actor.id, ACTOR.id);
    assert.equal(last.timestamp, TS);
    assert.equal(last.voiceover.final_approved, approved.voiceover.final_approved);
    assert.equal(last.scenes.length, approved.scenes.length);
  });

  await check("Fails early without Visual Identity anchors", () => {
    const seeded = seedCreativeReviewFromPackage(
      {
        voiceover_text: "Original VO.",
        visual_scenes: [{ source: "ai", image_prompt: "Still" }],
        image_prompts: ["Still"],
      },
      { now: () => new Date("2026-08-12T08:00:00.000Z") },
    );
    const approved = approveWithEdits({
      review: seeded,
      localized: "VO.",
    });
    const pkg = basePackage({
      presentation_generation: { pipeline: "content_pipeline" },
    });
    const result = rebuildCreativePackageForVideo({
      package: pkg,
      creativeReview: approved,
      actor: ACTOR,
      timestamp: TS,
    });
    assert.equal(result.ok, false);
  });

  await check("Fails early when package is not approved", () => {
    const seeded = seedCreativeReviewFromPackage(
      {
        voiceover_text: "Original VO.",
        visual_scenes: [{ source: "ai", image_prompt: "Still" }],
        image_prompts: ["Still"],
      },
      { now: () => new Date("2026-08-12T08:00:00.000Z") },
    );
    const result = rebuildCreativePackageForVideo({
      package: basePackage(),
      creativeReview: seeded,
      actor: ACTOR,
      timestamp: TS,
    });
    assert.equal(result.ok, false);
  });

  console.log("\nC — Wiring / worker compatibility");

  await check("Continue Generation calls rebuild before buildVideoJobInput", () => {
    const src = readFileSync(
      join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
      "utf8",
    );
    assert.match(src, /rebuildCreativePackageForVideo|rebuildAndPersistPackage/);
    assert.match(src, /buildVideoJobInput/);
    const rebuildIdx = src.indexOf("rebuildAndPersistPackage");
    const jobIdx = src.indexOf("ensureVideoJobForPackage");
    assert.ok(rebuildIdx > 0 && jobIdx > rebuildIdx);
    assert.doesNotMatch(src, /video-worker\/jobRunner/);
  });

  await check("Rebuild module does not touch worker / TTS / storyboard", () => {
    const src = readFileSync(
      join(root, "lib/creative-review/rebuildCreativePackage.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /alignOpeningVoiceover/);
    assert.match(src, /visualIdentityAppearanceBlock/);
    assert.match(src, /syncLegacyFieldsFromVisualScenes/);
    assert.doesNotMatch(src, /opening_prepended|voiceover_aligned|isOpeningStill/);
    assert.doesNotMatch(src, /startVideoWorkerJob|storyboard|elevenlabs|openai\.images/i);
  });

  await check("UI does not expose image prompts", () => {
    const panel = readFileSync(
      join(
        root,
        "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx",
      ),
      "utf8",
    );
    assert.doesNotMatch(panel, /image_prompt/);
    assert.match(panel, /creative_rebuild_completed/);
  });

  console.log("\nAll Phase 6 Creative Rebuild checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
