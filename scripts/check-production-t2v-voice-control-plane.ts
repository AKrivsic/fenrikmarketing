/**
 * Control-plane vs worker T2V voice preflight — offline checks.
 * Run: npx tsx scripts/check-production-t2v-voice-control-plane.ts
 *
 * No OpenAI / Claude / ElevenLabs / Runway network calls.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CreativeReview } from "../lib/creative-review/types";
import { validatePackagesReadyForContinue } from "../lib/ai/workflows/continueCreativeReviewGeneration";
import { fixtureT2vCanonicalCreative } from "../lib/content-package/t2vCanonicalCreative";
import { buildTextToVideoRenderPlanFromCanonical } from "../lib/content-package/textToVideoRenderAdapter";
import {
  applyRepetitionResultToPlan,
  checkTextToVideoRepetition,
} from "../lib/content-package/textToVideoCreativePlan";
import {
  assertTextToVideoPlanLockedForContinue,
  lockApprovedCanonicalTextToVideoPlan,
} from "../lib/content-package/textToVideoManualReview";
import {
  assertT2vVoiceCategoryDecided,
  assertT2vVoiceSelectionReadyForApprove,
  readT2vVoiceCategoryLabelForManualReview,
  stampT2vAuthoritativeVoiceOnBrief,
  T2V_TTS_LANGUAGE_SNAPSHOT_MISSING,
  T2V_TTS_LANGUAGE_UNSUPPORTED,
  T2V_TTS_VOICE_SNAPSHOT_MISSING,
  T2V_VOICE_CATEGORY_UNDECIDED,
} from "../lib/text-to-video/textToVideoAuthoritativeVoice";
import { resolveElevenLabsVoiceId } from "../lib/elevenlabs/voiceResolve";
import { EMPTY_MEMORY } from "../lib/ai/workflows/antiRepetitionMemory";

const root = join(import.meta.dirname, "..");
const PACKAGE_ID = "voice-control-plane-pkg";
const VO =
  "They open a tab. They search your name. Then they decide whether to call.";

const ELEVENLABS_ENV_KEYS = [
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_TTS_ENABLED",
  "ELEVENLABS_VOICE_ID_FEMALE",
  "ELEVENLABS_VOICE_ID_MALE",
  "ELEVENLABS_VOICE_ID_DEFAULT",
  "ELEVENLABS_VOICE_ID_EN_FEMALE",
  "ELEVENLABS_VOICE_ID_EN_MALE",
  "ELEVENLABS_VOICE_ID_EN_DEFAULT",
  "ELEVENLABS_VOICE_ID_CS_FEMALE",
  "ELEVENLABS_VOICE_ID_CS_MALE",
  "ELEVENLABS_VOICE_ID_CS_DEFAULT",
] as const;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

function withEmptyElevenLabsEnv(fn: () => void): void {
  const saved: Record<string, string | undefined> = {};
  for (const key of ELEVENLABS_ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  try {
    fn();
  } finally {
    for (const key of ELEVENLABS_ENV_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function threeVisualScenes() {
  return [
    {
      source: "ai" as const,
      id: "scene-1",
      image_prompt: "Client POV of a blank browser tab",
      motion_prompt: "Cursor moves toward the address bar",
      voiceover_excerpt: "They open a tab.",
    },
    {
      source: "ai" as const,
      id: "scene-2",
      image_prompt: "Search results for a professional name",
      motion_prompt: "Results load downward",
      voiceover_excerpt: "They search your name.",
    },
    {
      source: "ai" as const,
      id: "scene-3",
      image_prompt: "Phone lowering after a decision",
      motion_prompt: "Hand lowers the phone",
      voiceover_excerpt: "Then they decide whether to call.",
    },
    {
      source: "ai" as const,
      id: "scene-4",
      image_prompt: "Closed notebook on a kitchen table at dawn",
      motion_prompt: "Hand closes the notebook",
      voiceover_excerpt: "Then they decide whether to call.",
    },
  ];
}

function reviewForScenes(approved: boolean): CreativeReview {
  const scenes = threeVisualScenes().map((scene, index) => ({
    id: scene.id,
    index,
    director_notes: "",
    intent: {
      original: scene.image_prompt,
      localized_edit: `Česká scéna ${index + 1}`,
      english_preview: scene.image_prompt,
      english_preview_outdated: false,
      presentation_type: "IMAGE",
      visual_source: "generated" as const,
      asset_id: null,
      used_as: null,
    },
  }));
  return {
    status: approved ? "approved" : "ready",
    version: 1,
    approved,
    voiceover: {
      original_ai: VO,
      localized_edit: "Otevřou záložku a rozhodnou se.",
      english_preview: VO,
      english_preview_outdated: false,
      english_confirmed: true,
      translation_confirmed_at: "2026-01-01T00:00:00.000Z",
      translation_confirmed_by: "system",
      final_approved: "Otevřou záložku a rozhodnou se.",
    },
    scenes,
    history: [
      {
        version: 1,
        event: "seed",
        timestamp: "2026-01-01T00:00:00.000Z",
        actor: { type: "system", id: "system" },
        voiceover: {
          original_ai: VO,
          localized_edit: "Otevřou záložku a rozhodnou se.",
          english_preview: VO,
          english_preview_outdated: false,
          english_confirmed: true,
          translation_confirmed_at: "2026-01-01T00:00:00.000Z",
          translation_confirmed_by: "system",
          final_approved: "Otevřou záložku a rozhodnou se.",
        },
        scenes: [],
        status: approved ? "approved" : "ready",
        approved,
      },
    ],
  };
}

function stampedBrief(review: CreativeReview): Record<string, unknown> {
  const brief = stampT2vAuthoritativeVoiceOnBrief(
    {
      package_video_mode: "text_to_video",
      language: "en",
      voiceover_text: VO,
      hook: "They open a tab.",
      visual_scenes: threeVisualScenes(),
      t2v_canonical_creative: fixtureT2vCanonicalCreative(),
      video: { script: "authoritative storyboard" },
      creative_review: review,
    },
    { ttsVoice: "marin", language: "en" },
  );
  let plan = buildTextToVideoRenderPlanFromCanonical({
    packageId: PACKAGE_ID,
    brief,
    review,
    voiceoverText: VO,
    hookText: "They open a tab.",
    voiceDirection: { style: "auto", revision: 0 },
  });
  plan = applyRepetitionResultToPlan(
    plan,
    checkTextToVideoRepetition({ plan, memory: EMPTY_MEMORY }),
    "2026-01-01T00:00:00.000Z",
  );
  brief.video_text_to_video_creative_plan = plan;
  return brief;
}

function main(): void {
  console.log("T2V voice control-plane vs worker\n");

  check("1 — Approve selection passes with empty ElevenLabs env", () => {
    withEmptyElevenLabsEnv(() => {
      const review = reviewForScenes(false);
      const brief = stampedBrief(review);
      const ready = assertT2vVoiceSelectionReadyForApprove({ brief });
      assert.equal(ready.voice, "marin");
      assert.equal(ready.language, "en");
      assert.equal(ready.category, "female");
      assert.equal(readT2vVoiceCategoryLabelForManualReview(brief), "ženský");
      const locked = lockApprovedCanonicalTextToVideoPlan({
        brief,
        review,
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      assert.equal(
        (locked.video_text_to_video_creative_plan as { status: string }).status,
        "approved",
      );
    });
  });

  check("2 — Continue control-plane passes without ElevenLabs env", () => {
    withEmptyElevenLabsEnv(() => {
      const review = reviewForScenes(true);
      const brief = lockApprovedCanonicalTextToVideoPlan({
        brief: stampedBrief(review),
        review,
        timestamp: "2026-01-01T00:00:00.000Z",
      });
      brief.creative_review = review;
      const locked = assertTextToVideoPlanLockedForContinue({ brief, review });
      assert.equal(locked.plan.status, "approved");
      const continueGate = validatePackagesReadyForContinue([
        {
          packageId: PACKAGE_ID,
          packageIndex: 0,
          brief,
        },
      ]);
      assert.equal(continueGate.ok, true);
    });
  });

  check("3 — Approve rejects missing voice snapshot", () => {
    assert.throws(
      () =>
        assertT2vVoiceSelectionReadyForApprove({
          brief: { language: "en" },
        }),
      (err: unknown) =>
        err instanceof Error && err.message === T2V_TTS_VOICE_SNAPSHOT_MISSING,
    );
  });

  check("4 — Approve rejects missing language snapshot", () => {
    assert.throws(
      () =>
        assertT2vVoiceSelectionReadyForApprove({
          brief: { tts_voice: "marin" },
        }),
      (err: unknown) =>
        err instanceof Error &&
        err.message === T2V_TTS_LANGUAGE_SNAPSHOT_MISSING,
    );
  });

  check("5 — Approve rejects unsupported language", () => {
    assert.throws(
      () =>
        assertT2vVoiceSelectionReadyForApprove({
          brief: { tts_voice: "marin", language: "de" },
        }),
      (err: unknown) =>
        err instanceof Error && err.message === T2V_TTS_LANGUAGE_UNSUPPORTED,
    );
  });

  check("6 — Approve rejects undecided category", () => {
    assert.throws(
      () => assertT2vVoiceCategoryDecided(null),
      (err: unknown) =>
        err instanceof Error && err.message === T2V_VOICE_CATEGORY_UNDECIDED,
    );
    assert.throws(
      () => assertT2vVoiceCategoryDecided(undefined),
      (err: unknown) =>
        err instanceof Error && err.message === T2V_VOICE_CATEGORY_UNDECIDED,
    );
  });

  check("7 — worker rejects missing Voice ID before provider POST", () => {
    withEmptyElevenLabsEnv(() => {
      const resolved = resolveElevenLabsVoiceId({
        openAiSelectedVoice: "marin",
        language: "en",
        voiceMap: { female: null, male: null, default: null },
        legacyVoiceMap: { female: null, male: null, default: null },
      });
      assert.equal(resolved, null);
    });
    const worker = readFileSync(
      join(root, "lib/text-to-video/voiceSynthesisService.ts"),
      "utf8",
    );
    const unconfiguredAt = worker.indexOf('throw new TextToVideoVoiceSynthesisError("elevenlabs_voice_unconfigured")');
    const postAt = worker.search(/fetch\(|api\.elevenlabs|text-to-speech/);
    assert.ok(unconfiguredAt > 0);
    assert.ok(postAt < 0 || unconfiguredAt < postAt);
    const control = readFileSync(
      join(root, "lib/text-to-video/textToVideoAuthoritativeVoice.ts"),
      "utf8",
    );
    assert.doesNotMatch(control, /resolveElevenLabsVoiceId/);
    assert.doesNotMatch(control, /readElevenLabsVoiceMap/);
    assert.doesNotMatch(control, /process\.env/);
    assert.doesNotMatch(control, /readElevenLabsApiKey/);
    const admin = readFileSync(
      join(root, "lib/api/creative-review-admin.ts"),
      "utf8",
    );
    const continueSrc = readFileSync(
      join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
      "utf8",
    );
    assert.match(admin, /assertT2vVoiceSelectionReadyForApprove/);
    assert.match(continueSrc, /assertT2vVoiceSelectionReadyForApprove/);
    assert.doesNotMatch(admin, /resolveElevenLabsVoiceId/);
    assert.doesNotMatch(continueSrc, /resolveElevenLabsVoiceId/);
    assert.doesNotMatch(admin, /readElevenLabsVoiceMap/);
    assert.doesNotMatch(continueSrc, /readElevenLabsVoiceMap/);
  });

  check("8 — worker mapping uses EN/CS and female/male/default buckets", () => {
    const enFemale = resolveElevenLabsVoiceId({
      openAiSelectedVoice: "marin",
      language: "en",
      voiceMap: { female: "en-fem", male: "en-male", default: "en-def" },
      legacyVoiceMap: { female: null, male: null, default: null },
    });
    assert.equal(enFemale?.voiceId, "en-fem");
    assert.equal(enFemale?.language, "en");
    assert.equal(enFemale?.genderHint, "female");
    const csMale = resolveElevenLabsVoiceId({
      openAiSelectedVoice: "onyx",
      language: "cs",
      voiceMap: { female: "cs-fem", male: "cs-male", default: "cs-def" },
      legacyVoiceMap: { female: null, male: null, default: null },
    });
    assert.equal(csMale?.voiceId, "cs-male");
    assert.equal(csMale?.language, "cs");
    assert.equal(csMale?.genderHint, "male");
    const enDefault = resolveElevenLabsVoiceId({
      openAiSelectedVoice: "alloy",
      language: "en",
      voiceMap: { female: "en-fem", male: "en-male", default: "en-def" },
      legacyVoiceMap: { female: null, male: null, default: null },
    });
    assert.equal(enDefault?.voiceId, "en-def");
    assert.equal(enDefault?.genderHint, "neutral");
  });

  check("9 — this suite does not perform a provider request", () => {
    const self = readFileSync(
      join(root, "scripts/check-production-t2v-voice-control-plane.ts"),
      "utf8",
    );
    assert.doesNotMatch(
      self,
      /api\.anthropic\.com|api\.openai\.com|api\.elevenlabs|api\.dev\.runwayml/,
    );
  });

  check("10 — still workflow is unchanged by voice control-plane split", () => {
    const panel = readFileSync(
      join(
        root,
        "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx",
      ),
      "utf8",
    );
    assert.match(panel, /\{!isT2v \? \(/);
    assert.match(panel, /Creative Intent/);
    const admin = readFileSync(
      join(root, "lib/api/creative-review-admin.ts"),
      "utf8",
    );
    assert.match(admin, /if \(isT2v\) \{[\s\S]*assertT2vVoiceSelectionReadyForApprove/);
  });

  console.log("\nAll T2V voice control-plane checks passed.");
}

main();
