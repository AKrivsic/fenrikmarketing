/**
 * T2V voice selection parity — offline checks (no provider calls).
 * Run: npx tsx scripts/check-production-text-to-video-voice-parity.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveElevenLabsVoiceId } from "../lib/elevenlabs/voiceResolve";
import { synthesisInputFingerprint } from "../lib/elevenlabs/v3VoiceDirection";
import {
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  ELEVENLABS_MODEL_ELEVEN_V3,
} from "../lib/elevenlabs/config";
import {
  readAuthoritativeOpenAiVoiceForT2VOptional,
  resolveAuthoritativeOpenAiVoiceForT2V,
  readTtsVoiceFromBriefSnapshot,
  t2vVoiceCategoryLabelFromOpenAiVoice,
} from "../lib/text-to-video/textToVideoAuthoritativeVoice";
import {
  runTextToVideoElevenLabsVoicePhase,
  TextToVideoVoiceSynthesisError,
} from "../lib/text-to-video/voiceSynthesisService";
import { resolveTtsOptionsFromJobInput } from "../lib/voice/resolveTtsOptions";
import {
  approveTextToVideoCreativePlan,
  buildTextToVideoCreativePlan,
  serializeTextToVideoCreativePlan,
  TEXT_TO_VIDEO_TIMING_ESTIMATED,
} from "../lib/content-package/textToVideoCreativePlan";
import { buildPackageBrief } from "../lib/ai/workflows/packageShared";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import {
  syncVideoCreativeIntegrityFromSources,
  serializeVideoCreativeIntegrity,
} from "../lib/content-package/videoCreativeIntegrity";
import { DEFAULT_GENERATION_MODE } from "../lib/ai/generationMode";

const VO =
  "Firma potřebuje rychlejší cashflow každý měsíc. Automatické upomínky šetří čas. " +
  "S Fenrikem ušetříte hodiny týdně. Začněte demo ještě dnes.";

function pkg(): ContentPackageOutput {
  return {
    title: "T",
    funnel_stage: "awareness",
    hook: "Hook",
    voiceover_text: VO,
    subtitles: VO,
    cta: { text: "Demo", url: null },
    video: { concept: "c", script: VO },
    platform_outputs: { tiktok: { caption: "c", hashtags: [], cta: "Demo" } },
    hashtags: [],
    image_prompts: [],
    visual_scenes: [],
    asset_usage: [],
  } as ContentPackageOutput;
}

function approvedBrief(extra?: Record<string, unknown>): Record<string, unknown> {
  let plan = buildTextToVideoCreativePlan({
    packageId: "pkg-parity",
    voiceoverText: VO,
  });
  plan = approveTextToVideoCreativePlan(plan, "2026-01-01T00:00:00.000Z");
  plan = {
    ...plan,
    repetition: {
      status: "passed",
      blocked_reasons: [],
      checked_at: "2026-01-01T00:00:00.000Z",
    },
    timing_status: TEXT_TO_VIDEO_TIMING_ESTIMATED,
  };
  const brief = buildPackageBrief(pkg(), {
    packageVideoMode: "text_to_video",
  }) as Record<string, unknown>;
  const integrity = syncVideoCreativeIntegrityFromSources({
    voiceoverText: VO,
    hookText: plan.approved_hook,
    voiceDirection: { style: "natural", revision: 0 },
    plan,
    packageVideoMode: "text_to_video",
  });
  return {
    ...brief,
    voiceover_text: VO,
    video_text_to_video_creative_plan: serializeTextToVideoCreativePlan(plan),
    video_creative_integrity: serializeVideoCreativeIntegrity(integrity),
    video_voice_direction: { style: "natural", revision: 0 },
    video_paid_preflight: {
      similarity_check_status: "passed",
      confirm_paid_run: true,
      max_budget_usd: 50,
    },
    ...extra,
  };
}

function voicePhaseInput(
  brief: Record<string, unknown>,
  jobInput?: Record<string, unknown> | null,
) {
  return {
    packageVideoMode: "text_to_video" as const,
    runPackageVideoMode: "text_to_video" as const,
    generationMode: DEFAULT_GENERATION_MODE,
    creativeReview: null,
    brief,
    enforceFuturePaidGates: true,
    confirmPaidRun: true,
    maxBudgetUsd: 50,
    similarityCheckPassed: true,
    paidPreflightPhase: "elevenlabs" as const,
    projectId: "proj-parity",
    packageId: "pkg-parity",
    jobInput,
  };
}

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  await Promise.resolve(fn());
  console.log(`  ✓ ${name}`);
}

async function main(): Promise<void> {
  console.log("T2V voice selection parity\n");
  const brief = approvedBrief();

  await check("1 — job tts_voice is authoritative", () => {
    assert.equal(
      resolveAuthoritativeOpenAiVoiceForT2V({
        jobInput: { tts_voice: "onyx" },
        brief: { tts_voice: "nova" },
      }),
      "onyx",
    );
  });

  await check("2 — Eleven phase does not call project resolveTtsOptions", () => {
    const src = readFileSync(
      "lib/text-to-video/voiceSynthesisService.ts",
      "utf8",
    );
    assert.doesNotMatch(src, /resolveTtsOptions\s*\(/);
  });

  await check("3 — female/male/default mapping buckets", () => {
    assert.equal(
      resolveElevenLabsVoiceId({
        openAiSelectedVoice: "nova",
        voiceMap: { female: "f", male: "m", default: "d" },
      })?.voiceId,
      "f",
    );
    assert.equal(
      resolveElevenLabsVoiceId({
        openAiSelectedVoice: "onyx",
        voiceMap: { female: "f", male: "m", default: "d" },
      })?.voiceId,
      "m",
    );
    assert.equal(
      resolveElevenLabsVoiceId({
        openAiSelectedVoice: "alloy",
        voiceMap: { female: "f", male: "m", default: "d" },
      })?.voiceId,
      "d",
    );
  });

  await check("4 — default Voice ID may equal female or male", () => {
    const same = "shared-eleven-id";
    assert.equal(
      resolveElevenLabsVoiceId({
        openAiSelectedVoice: "nova",
        voiceMap: { female: same, male: same, default: same },
      })?.voiceId,
      same,
    );
  });

  await check("5 — missing voice snapshot blocks before POST", async () => {
    process.env.ELEVENLABS_TTS_ENABLED = "true";
    process.env.ELEVENLABS_API_KEY = "k";
    process.env.ELEVENLABS_VOICE_ID_FEMALE = "vf";
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) } as never;
    await assert.rejects(
      () =>
        runTextToVideoElevenLabsVoicePhase(
          voicePhaseInput(brief, undefined),
          { supabase },
        ),
      (e: unknown) =>
        e instanceof TextToVideoVoiceSynthesisError &&
        e.code === "tts_voice_snapshot_missing",
    );
  });

  await check("6 — missing Eleven bucket env blocks before POST", async () => {
    process.env.ELEVENLABS_TTS_ENABLED = "true";
    process.env.ELEVENLABS_API_KEY = "k";
    delete process.env.ELEVENLABS_VOICE_ID_FEMALE;
    delete process.env.ELEVENLABS_VOICE_ID_MALE;
    delete process.env.ELEVENLABS_VOICE_ID_DEFAULT;
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) } as never;
    await assert.rejects(
      () =>
        runTextToVideoElevenLabsVoicePhase(
          voicePhaseInput(brief, { tts_voice: "nova" }),
          { supabase },
        ),
      (e: unknown) =>
        e instanceof TextToVideoVoiceSynthesisError &&
        e.code === "elevenlabs_voice_unconfigured",
    );
  });

  await check("7 — brief presentation_generation fallback", () => {
    const fromBrief = readTtsVoiceFromBriefSnapshot({
      presentation_generation: { selected_voice: "echo", tts_voice: "echo" },
    });
    assert.equal(fromBrief, "echo");
    assert.equal(
      readAuthoritativeOpenAiVoiceForT2VOptional({
        brief: { presentation_generation: { tts_voice: "shimmer" } },
      }),
      "shimmer",
    );
  });

  await check("8 — fingerprint includes Eleven voice_id", () => {
    const a = synthesisInputFingerprint({
      voiceover_revision_id: "r",
      voice_direction_revision: 0,
      synthesis_text: "x",
      voice_id: "v1",
      model_id: ELEVENLABS_MODEL_ELEVEN_V3,
      output_format: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
      direction_contract_version: 1,
    });
    const b = synthesisInputFingerprint({
      voiceover_revision_id: "r",
      voice_direction_revision: 0,
      synthesis_text: "x",
      voice_id: "v2",
      model_id: ELEVENLABS_MODEL_ELEVEN_V3,
      output_format: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
      direction_contract_version: 1,
    });
    assert.notEqual(a, b);
    const c = synthesisInputFingerprint({
      voiceover_revision_id: "r",
      voice_direction_revision: 1,
      synthesis_text: "x",
      voice_id: "v1",
      model_id: ELEVENLABS_MODEL_ELEVEN_V3,
      output_format: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
      direction_contract_version: 1,
    });
    assert.notEqual(a, c);
  });

  await check("9 — still path still uses resolveTtsOptionsFromJobInput", () => {
    const opts = resolveTtsOptionsFromJobInput({ tts_voice: "fable" });
    assert.equal(opts.voice, "fable");
  });

  await check("10 — manual review category labels", () => {
    assert.equal(t2vVoiceCategoryLabelFromOpenAiVoice("nova"), "ženský");
    assert.equal(t2vVoiceCategoryLabelFromOpenAiVoice("onyx"), "mužský");
    assert.equal(t2vVoiceCategoryLabelFromOpenAiVoice("alloy"), "default");
  });

  console.log("\nAll parity checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
