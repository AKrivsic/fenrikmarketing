/**
 * T2V voice selection parity + language-aware ElevenLabs mapping — offline.
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
  normalizeT2vVoiceLanguage,
  readAuthoritativeOpenAiVoiceForT2VOptional,
  resolveAuthoritativeOpenAiVoiceForT2V,
  resolveAuthoritativeT2vVoiceLanguage,
  readTtsVoiceFromBriefSnapshot,
  t2vVoiceCategoryLabelFromOpenAiVoice,
  T2V_TTS_LANGUAGE_SNAPSHOT_MISSING,
  T2V_TTS_LANGUAGE_UNSUPPORTED,
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
    language: "cs",
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

function clearLangVoiceEnv(): void {
  for (const key of [
    "ELEVENLABS_VOICE_ID_EN_FEMALE",
    "ELEVENLABS_VOICE_ID_EN_MALE",
    "ELEVENLABS_VOICE_ID_EN_DEFAULT",
    "ELEVENLABS_VOICE_ID_CS_FEMALE",
    "ELEVENLABS_VOICE_ID_CS_MALE",
    "ELEVENLABS_VOICE_ID_CS_DEFAULT",
    "ELEVENLABS_VOICE_ID_FEMALE",
    "ELEVENLABS_VOICE_ID_MALE",
    "ELEVENLABS_VOICE_ID_DEFAULT",
  ]) {
    delete process.env[key];
  }
}

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  await Promise.resolve(fn());
  console.log(`  ✓ ${name}`);
}

async function main(): Promise<void> {
  console.log("T2V voice selection parity + language mapping\n");
  const brief = approvedBrief();
  const envBackup = { ...process.env };

  try {
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

    await check("3 — normalize en / en-US / en-GB and cs / cs-CZ / cz", () => {
      assert.equal(normalizeT2vVoiceLanguage("en"), "en");
      assert.equal(normalizeT2vVoiceLanguage("en-US"), "en");
      assert.equal(normalizeT2vVoiceLanguage("en-GB"), "en");
      assert.equal(normalizeT2vVoiceLanguage("cs"), "cs");
      assert.equal(normalizeT2vVoiceLanguage("cs-CZ"), "cs");
      assert.equal(normalizeT2vVoiceLanguage("cz"), "cs");
      assert.equal(normalizeT2vVoiceLanguage("de"), null);
    });

    await check("4 — female/male/default language maps", () => {
      clearLangVoiceEnv();
      process.env.ELEVENLABS_VOICE_ID_EN_FEMALE = "en-f";
      process.env.ELEVENLABS_VOICE_ID_EN_MALE = "en-m";
      process.env.ELEVENLABS_VOICE_ID_EN_DEFAULT = "en-d";
      process.env.ELEVENLABS_VOICE_ID_CS_FEMALE = "cs-f";
      process.env.ELEVENLABS_VOICE_ID_CS_MALE = "cs-m";
      process.env.ELEVENLABS_VOICE_ID_CS_DEFAULT = "cs-d";
      assert.equal(
        resolveElevenLabsVoiceId({
          openAiSelectedVoice: "nova",
          language: "en",
        })?.voiceId,
        "en-f",
      );
      assert.equal(
        resolveElevenLabsVoiceId({
          openAiSelectedVoice: "onyx",
          language: "en",
        })?.voiceId,
        "en-m",
      );
      assert.equal(
        resolveElevenLabsVoiceId({
          openAiSelectedVoice: "alloy",
          language: "en",
        })?.voiceId,
        "en-d",
      );
      assert.equal(
        resolveElevenLabsVoiceId({
          openAiSelectedVoice: "nova",
          language: "cs",
        })?.voiceId,
        "cs-f",
      );
      assert.equal(
        resolveElevenLabsVoiceId({
          openAiSelectedVoice: "onyx",
          language: "cs",
        })?.voiceId,
        "cs-m",
      );
    });

    await check("5 — default may share ID with female/male", () => {
      clearLangVoiceEnv();
      process.env.ELEVENLABS_VOICE_ID_EN_FEMALE = "shared";
      process.env.ELEVENLABS_VOICE_ID_EN_MALE = "shared";
      process.env.ELEVENLABS_VOICE_ID_EN_DEFAULT = "shared";
      assert.equal(
        resolveElevenLabsVoiceId({
          openAiSelectedVoice: "nova",
          language: "en",
        })?.voiceId,
        "shared",
      );
    });

    await check("6 — EN job never uses CS Voice ID", () => {
      clearLangVoiceEnv();
      process.env.ELEVENLABS_VOICE_ID_EN_FEMALE = "en-only";
      process.env.ELEVENLABS_VOICE_ID_CS_FEMALE = "cs-only";
      const r = resolveElevenLabsVoiceId({
        openAiSelectedVoice: "nova",
        language: "en",
      });
      assert.equal(r?.voiceId, "en-only");
      assert.notEqual(r?.voiceId, "cs-only");
    });

    await check("7 — CS job never uses EN Voice ID", () => {
      clearLangVoiceEnv();
      process.env.ELEVENLABS_VOICE_ID_EN_FEMALE = "en-only";
      process.env.ELEVENLABS_VOICE_ID_CS_FEMALE = "cs-only";
      const r = resolveElevenLabsVoiceId({
        openAiSelectedVoice: "nova",
        language: "cs",
      });
      assert.equal(r?.voiceId, "cs-only");
      assert.notEqual(r?.voiceId, "en-only");
    });

    await check("8 — missing language blocks before POST", async () => {
      process.env.ELEVENLABS_TTS_ENABLED = "true";
      process.env.ELEVENLABS_API_KEY = "k";
      process.env.ELEVENLABS_VOICE_ID_CS_FEMALE = "cs-f";
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      } as never;
      await assert.rejects(
        () =>
          runTextToVideoElevenLabsVoicePhase(
            voicePhaseInput(approvedBrief({ language: undefined }), {
              tts_voice: "nova",
            }),
            { supabase },
          ),
        (e: unknown) =>
          e instanceof TextToVideoVoiceSynthesisError &&
          e.code === T2V_TTS_LANGUAGE_SNAPSHOT_MISSING,
      );
    });

    await check("9 — missing language Voice ID blocks before POST", async () => {
      clearLangVoiceEnv();
      process.env.ELEVENLABS_TTS_ENABLED = "true";
      process.env.ELEVENLABS_API_KEY = "k";
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      } as never;
      await assert.rejects(
        () =>
          runTextToVideoElevenLabsVoicePhase(
            voicePhaseInput(brief, { tts_voice: "nova", language: "cs" }),
            { supabase },
          ),
        (e: unknown) =>
          e instanceof TextToVideoVoiceSynthesisError &&
          e.code === "elevenlabs_voice_unconfigured",
      );
    });

    await check("10 — legacy global fallback only when configured", () => {
      clearLangVoiceEnv();
      process.env.ELEVENLABS_VOICE_ID_FEMALE = "legacy-f";
      const r = resolveElevenLabsVoiceId({
        openAiSelectedVoice: "nova",
        language: "cs",
      });
      assert.equal(r?.voiceId, "legacy-f");
      assert.equal(r?.source, "legacy_global");
      assert.match(r?.diagnostic ?? "", /legacy_global/);

      clearLangVoiceEnv();
      assert.equal(
        resolveElevenLabsVoiceId({
          openAiSelectedVoice: "nova",
          language: "cs",
        }),
        null,
      );
    });

    await check("11 — fingerprint changes with language or voice_id", () => {
      const base = {
        voiceover_revision_id: "r",
        voice_direction_revision: 0,
        synthesis_text: "x",
        voice_id: "v1",
        model_id: ELEVENLABS_MODEL_ELEVEN_V3,
        output_format: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
        direction_contract_version: 1,
        language: "cs",
        openai_voice: "nova",
      };
      const a = synthesisInputFingerprint(base);
      const b = synthesisInputFingerprint({ ...base, language: "en" });
      const c = synthesisInputFingerprint({ ...base, voice_id: "v2" });
      assert.notEqual(a, b);
      assert.notEqual(a, c);
    });

    await check("12 — job language is authoritative over brief", () => {
      assert.equal(
        resolveAuthoritativeT2vVoiceLanguage({
          jobInput: { language: "en-US" },
          brief: { language: "cs" },
        }),
        "en",
      );
    });

    await check("13 — unsupported language fails closed", () => {
      assert.throws(
        () =>
          resolveAuthoritativeT2vVoiceLanguage({
            jobInput: { language: "de" },
          }),
        (e: unknown) =>
          e instanceof Error && e.message === T2V_TTS_LANGUAGE_UNSUPPORTED,
      );
    });

    await check("14 — brief presentation_generation voice fallback", () => {
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

    await check("15 — still path still uses resolveTtsOptionsFromJobInput", () => {
      const opts = resolveTtsOptionsFromJobInput({ tts_voice: "fable" });
      assert.equal(opts.voice, "fable");
    });

    await check("16 — manual review category labels", () => {
      assert.equal(t2vVoiceCategoryLabelFromOpenAiVoice("nova"), "ženský");
      assert.equal(t2vVoiceCategoryLabelFromOpenAiVoice("onyx"), "mužský");
      assert.equal(t2vVoiceCategoryLabelFromOpenAiVoice("alloy"), "default");
    });

    console.log("\nAll parity + language mapping checks passed.");
  } finally {
    process.env = envBackup;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
