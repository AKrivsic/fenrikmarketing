/**
 * Phase 2 — Creative Review storage checks.
 *
 * Run: npx tsx scripts/check-creative-review-phase2.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import { buildPackageBrief } from "../lib/ai/workflows/packageShared";
import {
  assertCreativeReview,
  hasCreativeReviewKey,
  parseCreativeReview,
  readCreativeReviewFromBrief,
  requireCreativeReviewFromBrief,
  seedCreativeReviewFromPackage,
  seedSceneIntentsForCreativeReview,
} from "../lib/creative-review";

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

function minimalPackage(
  overrides: Partial<ContentPackageOutput> = {},
): Pick<
  ContentPackageOutput,
  "voiceover_text" | "visual_scenes" | "image_prompts" | "hook" | "subtitles" | "cta" | "video" | "platform_outputs" | "title" | "funnel_stage"
> {
  return {
    title: "Test package",
    funnel_stage: "Awareness",
    hook: "Hook line",
    voiceover_text: "This is the AI voiceover for the package.",
    subtitles: "This is the AI voiceover for the package.",
    cta: { type: "learn_more", text: "Learn more" },
    video: { concept: "Concept", script: "Script" },
    platform_outputs: {
      tiktok: { caption: "tt" },
      instagram: { caption: "ig" },
      facebook: { caption: "fb" },
      youtube: { caption: "yt" },
      linkedin: { caption: "li" },
      x: { caption: "x" },
      google_business: { caption: "gb" },
    },
    visual_scenes: [
      { source: "ai", image_prompt: "A founder at a laptop reviewing dashboards" },
      {
        source: "asset",
        asset_id: "11111111-1111-4111-8111-111111111111",
        used_as: "product_ui",
      },
      {
        type: "QUOTE",
        payload: {
          quote: "We shipped faster",
          attribution: "Alex, Founder",
          proof_id: "proof-1",
        },
      },
    ],
    image_prompts: ["legacy prompt unused when visual_scenes present"],
    ...overrides,
  };
}

console.log("A — Seed Creative Review (Manual Review)");

check("seeds fully initialized draft with voiceover lanes", () => {
  const review = seedCreativeReviewFromPackage(minimalPackage(), {
    now: FIXED_NOW,
  });
  assert.equal(review.status, "draft");
  assert.equal(review.version, 1);
  assert.equal(review.approved, false);
  assert.equal(
    review.voiceover.original_ai,
    "This is the AI voiceover for the package.",
  );
  assert.equal(review.voiceover.localized_edit, review.voiceover.original_ai);
  assert.equal(review.voiceover.final_approved, review.voiceover.original_ai);
  assert.equal(review.voiceover.english_preview, null);
  assert.equal(review.voiceover.english_confirmed, false);
  assert.equal(review.voiceover.translation_confirmed_at, null);
  assert.equal(review.voiceover.translation_confirmed_by, null);
});

check("seeds scenes with Scene Intent + empty director_notes", () => {
  const review = seedCreativeReviewFromPackage(minimalPackage(), {
    now: FIXED_NOW,
  });
  assert.equal(review.scenes.length, 3);
  assert.equal(review.scenes[0]!.id, "scene-1");
  assert.equal(review.scenes[0]!.index, 0);
  assert.equal(review.scenes[0]!.director_notes, "");
  assert.equal(review.scenes[0]!.intent.visual_source, "generated");
  assert.equal(review.scenes[0]!.intent.presentation_type, "IMAGE");
  assert.match(
    review.scenes[0]!.intent.description,
    /founder at a laptop/i,
  );
  assert.equal(review.scenes[1]!.intent.visual_source, "asset");
  assert.equal(
    review.scenes[1]!.intent.asset_id,
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(review.scenes[1]!.intent.used_as, "product_ui");
  assert.equal(review.scenes[2]!.intent.presentation_type, "QUOTE");
  assert.equal(review.scenes[2]!.intent.visual_source, "typed_overlay");
  assert.match(review.scenes[2]!.intent.description, /We shipped faster/);
});

check("Scene Intent never stores image_prompt", () => {
  const review = seedCreativeReviewFromPackage(minimalPackage(), {
    now: FIXED_NOW,
  });
  for (const scene of review.scenes) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(scene.intent, "image_prompt"),
      false,
    );
  }
});

check("history contains seed event with full snapshots", () => {
  const review = seedCreativeReviewFromPackage(minimalPackage(), {
    now: FIXED_NOW,
  });
  assert.equal(review.history.length, 1);
  const entry = review.history[0]!;
  assert.equal(entry.event, "seed");
  assert.equal(entry.version, 1);
  assert.equal(entry.timestamp, "2026-08-11T12:00:00.000Z");
  assert.deepEqual(entry.actor, { type: "system", id: "system" });
  assert.deepEqual(entry.voiceover, review.voiceover);
  assert.deepEqual(entry.scenes, review.scenes);
});

check("history snapshots are deep copies (mutation safe)", () => {
  const review = seedCreativeReviewFromPackage(minimalPackage(), {
    now: FIXED_NOW,
  });
  review.voiceover.localized_edit = "edited later";
  review.scenes[0]!.director_notes = "note";
  assert.equal(
    review.history[0]!.voiceover.localized_edit,
    "This is the AI voiceover for the package.",
  );
  assert.equal(review.history[0]!.scenes[0]!.director_notes, "");
});

check("falls back to image_prompts when visual_scenes absent", () => {
  const scenes = seedSceneIntentsForCreativeReview({
    visualScenes: null,
    imagePrompts: ["First still", "Second still"],
  });
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0]!.intent.description, "First still");
  assert.equal(scenes[1]!.intent.description, "Second still");
  assert.equal(scenes[0]!.director_notes, "");
});

check("empty scenes allowed for text-only packages", () => {
  const review = seedCreativeReviewFromPackage(
    minimalPackage({ visual_scenes: undefined, image_prompts: [] }),
    { now: FIXED_NOW },
  );
  assert.equal(review.scenes.length, 0);
  assert.equal(review.history[0]!.scenes.length, 0);
  assertCreativeReview(review);
});

console.log("\nB — Validation");

check("parseCreativeReview accepts seeded draft", () => {
  const review = seedCreativeReviewFromPackage(minimalPackage(), {
    now: FIXED_NOW,
  });
  const parsed = parseCreativeReview(review);
  assert.equal(parsed.ok, true);
});

check("parseCreativeReview rejects missing history", () => {
  const review = seedCreativeReviewFromPackage(minimalPackage(), {
    now: FIXED_NOW,
  });
  const broken = { ...review, history: [] };
  const parsed = parseCreativeReview(broken);
  assert.equal(parsed.ok, false);
});

check("parseCreativeReview rejects image_prompt on intent", () => {
  const review = seedCreativeReviewFromPackage(minimalPackage(), {
    now: FIXED_NOW,
  });
  const broken = {
    ...review,
    scenes: [
      {
        ...review.scenes[0]!,
        intent: {
          ...review.scenes[0]!.intent,
          image_prompt: "illegal",
        },
      },
    ],
  };
  const parsed = parseCreativeReview(broken);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.ok(
      parsed.issues.some((i) => i.path.includes("image_prompt")),
    );
  }
});

check("parseCreativeReview rejects empty voiceover", () => {
  const review = seedCreativeReviewFromPackage(minimalPackage(), {
    now: FIXED_NOW,
  });
  const broken = {
    ...review,
    voiceover: {
      original_ai: "   ",
      localized_edit: "x",
      final_approved: "x",
    },
  };
  const parsed = parseCreativeReview(broken);
  assert.equal(parsed.ok, false);
});

check("assertCreativeReview throws on malformed data", () => {
  assert.throws(() => assertCreativeReview({ status: "draft" }), /invalid creative_review/);
});

console.log("\nC — Package brief integration");

check("Manual Review brief includes creative_review", () => {
  const pkg = minimalPackage() as ContentPackageOutput;
  const review = seedCreativeReviewFromPackage(pkg, { now: FIXED_NOW });
  const brief = buildPackageBrief(pkg, { creativeReview: review }) as Record<
    string,
    unknown
  >;
  assert.ok(brief.creative_review);
  const read = readCreativeReviewFromBrief(brief);
  assert.equal(read.ok, true);
  if (read.ok) {
    assert.ok(read.value);
    assert.equal(read.value!.version, 1);
  }
});

check("Production brief omits creative_review", () => {
  const pkg = minimalPackage() as ContentPackageOutput;
  const brief = buildPackageBrief(pkg) as Record<string, unknown>;
  assert.equal(Object.prototype.hasOwnProperty.call(brief, "creative_review"), false);
  assert.equal(hasCreativeReviewKey(brief), false);
  const read = readCreativeReviewFromBrief(brief);
  assert.deepEqual(read, { ok: true, value: null });
});

check("Sample-style brief (no creativeReview option) omits object", () => {
  const pkg = minimalPackage() as ContentPackageOutput;
  const brief = buildPackageBrief(pkg);
  assert.equal(hasCreativeReviewKey(brief), false);
});

check("existing fields unchanged when creative_review attached", () => {
  const pkg = minimalPackage() as ContentPackageOutput;
  const without = buildPackageBrief(pkg) as Record<string, unknown>;
  const review = seedCreativeReviewFromPackage(pkg, { now: FIXED_NOW });
  const withReview = buildPackageBrief(pkg, {
    creativeReview: review,
  }) as Record<string, unknown>;
  for (const key of Object.keys(without)) {
    assert.deepEqual(withReview[key], without[key], `field ${key} changed`);
  }
  assert.ok(withReview.creative_review);
});

console.log("\nD — Serialization / persistence round-trip");

check("JSON serialize + deserialize preserves Creative Review", () => {
  const review = seedCreativeReviewFromPackage(minimalPackage(), {
    now: FIXED_NOW,
  });
  const pkg = minimalPackage() as ContentPackageOutput;
  const brief = buildPackageBrief(pkg, { creativeReview: review });
  const encoded = JSON.stringify(brief);
  const decoded = JSON.parse(encoded) as unknown;
  const read = requireCreativeReviewFromBrief(decoded);
  assert.deepEqual(read, review);
});

check("Supabase-style jsonb object round-trip", () => {
  const review = seedCreativeReviewFromPackage(minimalPackage(), {
    now: FIXED_NOW,
  });
  // Simulate PostgREST returning package_brief as a plain object.
  const stored = {
    hook: "Hook",
    voiceover_text: review.voiceover.original_ai,
    creative_review: JSON.parse(JSON.stringify(review)),
  };
  const read = requireCreativeReviewFromBrief(stored);
  assert.equal(read.status, "draft");
  assert.equal(read.history[0]!.event, "seed");
});

console.log("\nE — Backward compatibility");

check("legacy brief without creative_review loads safely", () => {
  const legacy = {
    hook: "Old hook",
    voiceover_text: "Old VO",
    visual_scenes: null,
  };
  const read = readCreativeReviewFromBrief(legacy);
  assert.deepEqual(read, { ok: true, value: null });
  assert.equal(hasCreativeReviewKey(legacy), false);
});

check("null / non-object brief does not throw", () => {
  assert.deepEqual(readCreativeReviewFromBrief(null), { ok: true, value: null });
  assert.deepEqual(readCreativeReviewFromBrief(undefined), {
    ok: true,
    value: null,
  });
  assert.deepEqual(readCreativeReviewFromBrief("x"), { ok: true, value: null });
});

check("malformed creative_review fails validation (no silent repair)", () => {
  const brief = {
    hook: "h",
    creative_review: { status: "draft", version: 1 },
  };
  const read = readCreativeReviewFromBrief(brief);
  assert.equal(read.ok, false);
  assert.throws(() => requireCreativeReviewFromBrief(brief), /invalid creative_review/);
});

console.log("\nF — Source wiring (Manual Review persist path)");

check("generateContentPackage seeds creative_review for manual_review only", () => {
  const src = readFileSync(
    join(root, "lib/ai/workflows/generateContentPackage.ts"),
    "utf8",
  );
  assert.match(src, /seedCreativeReviewFromPackage/);
  assert.match(src, /defersVideoUntilCreativeReview\(generationMode\)/);
  assert.match(src, /creativeReview\s*\?\s*\{\s*creativeReview\s*\}/);
});

check("buildPackageBrief accepts optional creativeReview without changing defaults", () => {
  const src = readFileSync(
    join(root, "lib/ai/workflows/packageShared.ts"),
    "utf8",
  );
  assert.match(src, /creativeReview\?:/);
  assert.match(src, /brief\.creative_review = options\.creativeReview/);
});

check("Scene Intent seeder is isolated replaceable module", () => {
  const src = readFileSync(
    join(
      root,
      "lib/creative-review/sceneIntent/seedFromPackageScenes.ts",
    ),
    "utf8",
  );
  assert.match(src, /REPLACEABLE ADAPTER/);
  assert.match(src, /seedSceneIntentsForCreativeReview/);
  // Seeder may *read* image_prompt from visual_scenes, but must not persist it
  // onto SceneCreativeIntent (no `image_prompt:` field in makeIntent output).
  assert.doesNotMatch(src, /image_prompt:\s*args/);
  assert.doesNotMatch(src, /image_prompt:\s*prompt/);
});

console.log("\nAll Phase 2 Creative Review checks passed.");
