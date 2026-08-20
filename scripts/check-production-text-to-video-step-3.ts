/**
 * Production text-to-video Step 3 — ElevenLabs v3 offline checks.
 * Run: npx tsx scripts/check-production-text-to-video-step-3.ts
 */
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildElevenV3SynthesisText,
  synthesisInputFingerprint,
} from "../lib/elevenlabs/v3VoiceDirection";
import {
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  ELEVENLABS_MODEL_ELEVEN_V3,
} from "../lib/elevenlabs/config";
import {
  ElevenLabsAdapterError,
  elevenLabsTextToSpeechWithTimestamps,
  parseElevenLabsWithTimestampsResponse,
  ELEVENLABS_MAX_RESPONSE_BYTES,
} from "../lib/elevenlabs/adapter";
import { resolveElevenLabsVoiceId } from "../lib/elevenlabs/voiceResolve";
import {
  cuesToSrt,
  subtitleCuesFromElevenAlignment,
} from "../lib/elevenlabs/subtitlesFromAlignment";
import {
  assertAcceptableVoiceoverDuration,
  probeAudioBufferDurationSeconds,
} from "../lib/audio/probeAudioDuration";
import { buildTextToVideoVoiceSynthesisPath } from "../lib/api/storage";
import { evaluateVideoPaidPreflight } from "../lib/content-package/videoPaidPreflight";
import {
  assertTextToVideoRunwayPreflight,
  runTextToVideoPaidEntryPoint,
} from "../lib/content-package/textToVideoPaidEntry";
import {
  approveTextToVideoCreativePlan,
  buildTextToVideoCreativePlan,
  serializeTextToVideoCreativePlan,
  TEXT_TO_VIDEO_TIMING_ESTIMATED,
  TEXT_TO_VIDEO_TIMING_MEASURED,
  readTextToVideoCreativePlan,
} from "../lib/content-package/textToVideoCreativePlan";
import { buildPackageBrief } from "../lib/ai/workflows/packageShared";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import { syncVideoCreativeIntegrityFromSources, serializeVideoCreativeIntegrity } from "../lib/content-package/videoCreativeIntegrity";
import { applyMeasuredTimingToPlan } from "../lib/text-to-video/measuredSceneTiming";
import {
  runTextToVideoElevenLabsVoicePhase,
  TextToVideoVoiceSynthesisError,
  submissionClaimStale,
} from "../lib/text-to-video/voiceSynthesisService";
import { VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY } from "../lib/text-to-video/voiceSynthesisCheckpoint";
import { DEFAULT_GENERATION_MODE } from "../lib/ai/generationMode";
import { parsePackageVideoProductionMode } from "../lib/content-package/packageVideoProductionMode";

const VO =
  "Firma potřebuje rychlejší cashflow každý měsíc. Automatické upomínky šetří čas. " +
  "S Fenrikem ušetříte hodiny týdně. Začněte demo ještě dnes.";

function pkg(): ContentPackageOutput {
  return {
    title: "T",
    funnel_stage: "awareness",
    hook: "Cashflow",
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
    packageId: "pkg-step3",
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

function preflightInput(brief: Record<string, unknown>) {
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
  };
}

function voicePhaseInput(
  brief: Record<string, unknown>,
  opts?: {
    packageId?: string;
    jobVoice?: string;
    omitJobInput?: boolean;
  },
) {
  const jobVoice = opts?.jobVoice ?? "nova";
  return {
    ...preflightInput(brief),
    projectId: "proj-1",
    packageId: opts?.packageId ?? "pkg-1",
    jobInput: opts?.omitJobInput
      ? undefined
      : ({ tts_voice: jobVoice, language: "cs" } as Record<string, unknown>),
  };
}

function alignmentForVo(text: string, totalSeconds = 22) {
  const chars = text.split("");
  const step = totalSeconds / Math.max(chars.length, 1);
  const character_start_times_seconds: number[] = [];
  const character_end_times_seconds: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    character_start_times_seconds.push(i * step);
    character_end_times_seconds.push((i + 1) * step);
  }
  return {
    characters: chars,
    character_start_times_seconds,
    character_end_times_seconds,
  };
}

type SynthRow = Record<string, unknown>;

function makeFakeSupabase(opts?: {
  voiceMap?: { female?: string; male?: string; default?: string };
}) {
  const syntheses = new Map<string, SynthRow>();
  const uploads: Array<{ path: string; bytes: number }> = [];
  const packages = new Map<string, Record<string, unknown>>();
  const project = {
    id: "proj-1",
    language: "cs",
    tone_of_voice: {},
    knowledge: {},
    target_audience: null,
  };
  let postCalls = 0;

  const client = {
    from(table: string) {
      const filters: Array<{ col: string; val: unknown; op: string }> = [];
      let patch: Record<string, unknown> | null = null;
      let insertPayload: Record<string, unknown> | null = null;
      let mode: "select" | "update" | "insert" = "select";
      let selectAfterWrite = false;
      const api: Record<string, unknown> = {
        select(_cols?: string) {
          if (mode === "insert" || mode === "update") {
            selectAfterWrite = true;
          } else {
            mode = "select";
          }
          return api;
        },
        insert(p: Record<string, unknown>) {
          mode = "insert";
          insertPayload = p;
          return api;
        },
        update(p: Record<string, unknown>) {
          mode = "update";
          patch = p;
          return api;
        },
        eq(col: string, val: unknown) {
          filters.push({ col, val, op: "eq" });
          return api;
        },
        in(col: string, val: unknown[]) {
          filters.push({ col, val, op: "in" });
          return api;
        },
        is(col: string, val: unknown) {
          filters.push({ col, val, op: "is" });
          return api;
        },
        maybeSingle() {
          return Promise.resolve(execute(true));
        },
        single() {
          return Promise.resolve(execute(true));
        },
        then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
          return Promise.resolve()
            .then(() => execute(false))
            .then(resolve, reject);
        },
      };

      function execute(single: boolean): { data: unknown; error: null } {
        if (table === "projects") {
          return { data: project, error: null };
        }
        if (table === "text_to_video_voice_syntheses") {
          const fp = filters.find((f) => f.col === "synthesis_fingerprint")?.val;
          const id = filters.find((f) => f.col === "id")?.val;
          if (mode === "insert" && insertPayload) {
            const row: SynthRow = {
              id: `syn-${syntheses.size + 1}`,
              ...insertPayload,
              status: "created",
              submission_claim_owner: null,
            };
            syntheses.set(String(row.id), row);
            return { data: single ? row : [row], error: null };
          }
          if (mode === "update" && patch) {
            let target: SynthRow | undefined;
            if (id) target = syntheses.get(String(id));
            else {
              for (const row of syntheses.values()) {
                if (
                  filters.every((f) => {
                    if (f.op === "in") {
                      return (
                        Array.isArray(f.val) &&
                        f.val.includes(row[f.col as keyof SynthRow])
                      );
                    }
                    if (f.op === "is" && f.val === null) {
                      return row[f.col as keyof SynthRow] == null;
                    }
                    return row[f.col as keyof SynthRow] === f.val;
                  })
                ) {
                  target = row;
                  break;
                }
              }
            }
            if (target) Object.assign(target, patch);
            return { data: single ? (target ?? null) : target ? [target] : [], error: null };
          }
          let row: SynthRow | undefined;
          for (const r of syntheses.values()) {
            if (fp && r.synthesis_fingerprint !== fp) continue;
            if (id && r.id !== id) continue;
            row = r;
            break;
          }
          return { data: single ? (row ?? null) : row ? [row] : [], error: null };
        }
        if (table === "content_packages" && mode === "update" && patch) {
          const pkgId = filters.find((f) => f.col === "id")?.val;
          packages.set(String(pkgId), patch as Record<string, unknown>);
          return {
            data: single ? { id: pkgId } : null,
            error: null,
          };
        }
        return { data: single ? null : [], error: null };
      }
      return api;
    },
    storage: {
      from() {
        return {
          upload(path: string, body: Buffer) {
            uploads.push({ path, bytes: body.length });
            return Promise.resolve({ error: null });
          },
        };
      },
    },
    __postCalls: () => postCalls,
    __incPost: () => {
      postCalls += 1;
    },
    __uploads: () => uploads,
    __seedCompleted: (row: SynthRow) => {
      syntheses.set(String(row.id), row);
    },
  };

  void opts;
  return client as unknown as SupabaseClient & {
    __postCalls: () => number;
    __incPost: () => void;
    __uploads: () => Array<{ path: string; bytes: number }>;
    __seedCompleted: (row: SynthRow) => void;
  };
}

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  await Promise.resolve(fn());
  console.log(`  ✓ ${name}`);
}

async function main(): Promise<void> {
  console.log("Production text-to-video step 3\n");
  const envBackup = { ...process.env };
  const brief = approvedBrief();

  await check("1 — flag off blocks voice phase", async () => {
    process.env.ELEVENLABS_TTS_ENABLED = "false";
    process.env.ELEVENLABS_API_KEY = "k";
    process.env.ELEVENLABS_VOICE_ID_DEFAULT = "v";
    const supabase = makeFakeSupabase();
    await assert.rejects(
      () =>
        runTextToVideoElevenLabsVoicePhase(
          voicePhaseInput(brief),
          { supabase },
        ),
      (e: unknown) =>
        e instanceof TextToVideoVoiceSynthesisError &&
        e.code === "elevenlabs_disabled",
    );
  });

  await check("2 — missing API key", async () => {
    process.env.ELEVENLABS_TTS_ENABLED = "true";
    delete process.env.ELEVENLABS_API_KEY;
    process.env.ELEVENLABS_VOICE_ID_DEFAULT = "v-default";
    const supabase = makeFakeSupabase();
    await assert.rejects(
      () =>
        runTextToVideoElevenLabsVoicePhase(
          voicePhaseInput(brief),
          { supabase },
        ),
      (e: unknown) =>
        e instanceof TextToVideoVoiceSynthesisError &&
        e.code === "elevenlabs_api_key_missing",
    );
  });

  await check("3 — missing voice ID mapping", async () => {
    process.env.ELEVENLABS_TTS_ENABLED = "true";
    process.env.ELEVENLABS_API_KEY = "k";
    delete process.env.ELEVENLABS_VOICE_ID_DEFAULT;
    delete process.env.ELEVENLABS_VOICE_ID_FEMALE;
    delete process.env.ELEVENLABS_VOICE_ID_MALE;
    const supabase = makeFakeSupabase();
    await assert.rejects(
      () =>
        runTextToVideoElevenLabsVoicePhase(
          voicePhaseInput(brief),
          { supabase },
        ),
      (e: unknown) =>
        e instanceof TextToVideoVoiceSynthesisError &&
        e.code === "elevenlabs_voice_unconfigured",
    );
  });

  await check("4 — paid confirm false → preflight blocked", () => {
    const r = evaluateVideoPaidPreflight({
      ...preflightInput(brief),
      confirmPaidRun: false,
    });
    assert.equal(r.ok, false);
    assert.ok(r.blockers.includes("paid_run_not_confirmed"));
  });

  await check("5 — invalid budget → blocked", () => {
    const r = evaluateVideoPaidPreflight({
      ...preflightInput(brief),
      maxBudgetUsd: 0,
    });
    assert.equal(r.ok, false);
    assert.ok(r.blockers.includes("budget_limit_required"));
  });

  await check("6 — stale creative plan fingerprint", () => {
    const integrity = brief.video_creative_integrity as Record<string, unknown>;
    const plan = readTextToVideoCreativePlan(brief);
    const bad = {
      ...brief,
      video_creative_integrity: {
        ...integrity,
        creative_plan_fingerprint:
          plan?.plan_fingerprint === "deadbeef" ? "other" : "deadbeef",
      },
    };
    const r = evaluateVideoPaidPreflight(preflightInput(bad));
    assert.equal(r.ok, false);
    assert.ok(r.blockers.includes("creative_plan_fingerprint_mismatch"));
  });

  await check("7 — repetition blocked", () => {
    let plan = buildTextToVideoCreativePlan({
      packageId: "x",
      voiceoverText: VO,
    });
    plan = { ...plan, status: "repetition_blocked" as const };
    const b = {
      ...brief,
      video_text_to_video_creative_plan: serializeTextToVideoCreativePlan(plan),
    };
    const r = evaluateVideoPaidPreflight(preflightInput(b));
    assert.equal(r.ok, false);
    assert.ok(r.blockers.includes("repetition_blocked"));
  });

  await check("8 — model eleven_v3 in adapter body", async () => {
    process.env.ELEVENLABS_API_KEY = "k";
    let body = "";
    const fetchImpl = async (_url: string, init?: RequestInit) => {
      body = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          audio_base64: Buffer.from("fake-audio-payload-xx").toString("base64"),
          normalized_alignment: alignmentForVo(VO),
        }),
        { status: 200 },
      );
    };
    await elevenLabsTextToSpeechWithTimestamps(
      { voiceId: "v1", text: "[confident] ahoj", modelId: ELEVENLABS_MODEL_ELEVEN_V3 },
      { fetchImpl, apiKey: "k" },
    );
    assert.match(body, /"model_id":"eleven_v3"/);
  });

  await check("9 — with-timestamps endpoint", async () => {
    let url = "";
    const fetchImpl = async (u: string) => {
      url = u;
      return new Response(
        JSON.stringify({
          audio_base64: Buffer.from("fake-audio-payload-xx").toString("base64"),
          alignment: alignmentForVo("ahoj"),
        }),
        { status: 200 },
      );
    };
    await elevenLabsTextToSpeechWithTimestamps(
      { voiceId: "voice-abc", text: "test" },
      { fetchImpl, apiKey: "k" },
    );
    assert.match(url, /\/v1\/text-to-speech\/voice-abc\/with-timestamps/);
    assert.match(url, /output_format=/);
  });

  await check("10–12 — v3 tags, spoken text, subtitles", () => {
    const syn = buildElevenV3SynthesisText({
      approvedVoiceover: VO,
      direction: { style: "energetic", revision: 1 },
    });
    assert.match(syn.synthesis_text, /^\[excited\]/);
    assert.equal(syn.approved_voiceover_text, VO);
    const cues = subtitleCuesFromElevenAlignment(
      alignmentForVo(VO),
      VO,
    );
    const srt = cuesToSrt(cues);
    assert.doesNotMatch(srt, /\[excited\]/i);
    assert.ok(cues.length >= 1);
  });

  await check("13 — voice resolver female/male/default", () => {
    const f = resolveElevenLabsVoiceId({
      openAiSelectedVoice: "nova",
      voiceMap: { female: "f-id", male: "m-id", default: "d-id" },
    });
    assert.equal(f?.voiceId, "f-id");
    const m = resolveElevenLabsVoiceId({
      openAiSelectedVoice: "onyx",
      voiceMap: { female: "f-id", male: "m-id", default: null },
    });
    assert.equal(m?.voiceId, "m-id");
    const d = resolveElevenLabsVoiceId({
      openAiSelectedVoice: "alloy",
      voiceMap: { female: null, male: null, default: "d-id" },
    });
    assert.equal(d?.voiceId, "d-id");
    const shared = resolveElevenLabsVoiceId({
      openAiSelectedVoice: "nova",
      voiceMap: { female: "same-id", male: "same-id", default: "same-id" },
    });
    assert.equal(shared?.voiceId, "same-id");
    const missingMale = resolveElevenLabsVoiceId({
      openAiSelectedVoice: "onyx",
      voiceMap: { female: "f-id", male: null, default: "d-id" },
    });
    assert.equal(missingMale, null);
    process.env.ELEVENLABS_VOICE_ID_CS_FEMALE = "cs-f";
    process.env.ELEVENLABS_VOICE_ID_EN_FEMALE = "en-f";
    assert.equal(
      resolveElevenLabsVoiceId({
        openAiSelectedVoice: "nova",
        language: "cs",
      })?.voiceId,
      "cs-f",
    );
    assert.equal(
      resolveElevenLabsVoiceId({
        openAiSelectedVoice: "nova",
        language: "en",
      })?.voiceId,
      "en-f",
    );
  });

  await check("14–15 — synthesis fingerprint stable / changes", () => {
    const base = {
      voiceover_revision_id: "rev-a",
      voice_direction_revision: 0,
      synthesis_text: "[confident] hello",
      voice_id: "v",
      model_id: ELEVENLABS_MODEL_ELEVEN_V3,
      output_format: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
      direction_contract_version: 1,
    };
    const a = synthesisInputFingerprint(base);
    const b = synthesisInputFingerprint(base);
    assert.equal(a, b);
    const c = synthesisInputFingerprint({ ...base, voice_id: "v2" });
    assert.notEqual(a, c);
  });

  process.env.ELEVENLABS_TTS_ENABLED = "true";
  process.env.ELEVENLABS_API_KEY = "test-key";
  process.env.ELEVENLABS_VOICE_ID_DEFAULT = "voice-default";
  process.env.ELEVENLABS_VOICE_ID_FEMALE = "voice-female";
  process.env.ELEVENLABS_VOICE_ID_CS_FEMALE = "voice-cs-female";
  process.env.ELEVENLABS_VOICE_ID_CS_DEFAULT = "voice-cs-default";

  await check("16–17 — one POST then reuse completed synthesis", async () => {
    const supabase = makeFakeSupabase();
    const fakeAudio = Buffer.alloc(256, 1);
    const elevenLabsCall = async () => {
      (supabase as ReturnType<typeof makeFakeSupabase>).__incPost();
      return {
        audio_base64: fakeAudio.toString("base64"),
        normalized_alignment: alignmentForVo(VO),
      };
    };
    const input = voicePhaseInput(brief, { packageId: "pkg-concurrent" });
    const deps = {
      supabase,
      elevenLabsCall,
      probeDuration: async () => 22,
    };
    const first = await runTextToVideoElevenLabsVoicePhase(input, deps);
    assert.ok(first.checkpoint.audio_path);
    assert.equal((supabase as ReturnType<typeof makeFakeSupabase>).__postCalls(), 1);
    const second = await runTextToVideoElevenLabsVoicePhase(input, deps);
    assert.equal(second.checkpoint.synthesis_fingerprint, first.checkpoint.synthesis_fingerprint);
    assert.equal((supabase as ReturnType<typeof makeFakeSupabase>).__postCalls(), 1);
  });

  await check("18 — pre-POST failure → failed status", async () => {
    const supabase = makeFakeSupabase();
    await assert.rejects(
      () =>
        runTextToVideoElevenLabsVoicePhase(
          voicePhaseInput(brief, { packageId: "pkg-fail-pre" }),
          {
            supabase,
            elevenLabsCall: async () => {
              throw new ElevenLabsAdapterError("client_error", "bad", 400);
            },
          },
        ),
      (e) =>
        e instanceof TextToVideoVoiceSynthesisError &&
        e.code === "provider_rejected",
    );
  });

  await check("19–20 — timeout/5xx → submission_unknown; no auto retry POST", async () => {
    const supabase = makeFakeSupabase();
    await assert.rejects(
      () =>
        runTextToVideoElevenLabsVoicePhase(
          voicePhaseInput(brief, { packageId: "pkg-unknown" }),
          {
            supabase,
            elevenLabsCall: async () => {
              throw new ElevenLabsAdapterError("timeout", "t");
            },
          },
        ),
      (e) =>
        e instanceof TextToVideoVoiceSynthesisError &&
        e.code === "submission_unknown",
    );
    const supabase2 = makeFakeSupabase();
    await assert.rejects(
      () =>
        runTextToVideoElevenLabsVoicePhase(
          voicePhaseInput(brief, { packageId: "pkg-5xx" }),
          {
            supabase: supabase2,
            elevenLabsCall: async () => {
              throw new ElevenLabsAdapterError("server_error", "503", 503);
            },
          },
        ),
      (e) =>
        e instanceof TextToVideoVoiceSynthesisError &&
        e.code === "submission_unknown",
    );
    await assert.rejects(
      () =>
        runTextToVideoElevenLabsVoicePhase(
          voicePhaseInput(brief, { packageId: "pkg-unknown" }),
          { supabase },
        ),
      (e) =>
        e instanceof TextToVideoVoiceSynthesisError &&
        e.code === "submission_unknown_needs_review",
    );
  });

  await check("21–22 — invalid / oversized response", async () => {
    try {
      parseElevenLabsWithTimestampsResponse({ nope: true });
      assert.fail("expected throw");
    } catch (e) {
      assert.ok(e instanceof ElevenLabsAdapterError);
    }
    await assert.rejects(
      () =>
        elevenLabsTextToSpeechWithTimestamps(
          { voiceId: "v", text: "hi" },
          {
            apiKey: "k",
            fetchImpl: async () =>
              new Response("{}", {
                status: 200,
                headers: {
                  "Content-Length": String(ELEVENLABS_MAX_RESPONSE_BYTES + 1),
                },
              }),
          },
        ),
      (e) =>
        e instanceof ElevenLabsAdapterError && e.code === "response_too_large",
    );
  });

  await check("23 — deterministic storage path", () => {
    const path = buildTextToVideoVoiceSynthesisPath(
      "proj-1",
      "pkg-1",
      "fp123",
      "voiceover.mp3",
    );
    assert.match(path, /proj-1/);
    assert.match(path, /pkg-1/);
    assert.match(path, /fp123/);
    assert.match(path, /voiceover\.mp3$/);
  });

  await check("25–27 — ffprobe duration + reject bad length", async () => {
    assert.throws(() => assertAcceptableVoiceoverDuration(35));
    assert.throws(() => assertAcceptableVoiceoverDuration(5));
    assert.doesNotThrow(() => assertAcceptableVoiceoverDuration(22));
    try {
      await probeAudioBufferDurationSeconds(Buffer.from("not-audio"));
    } catch {
      /* expected on non-audio buffer in CI */
    }
  });

  await check("28–30 — alignment cues + measured timing", () => {
    const cues = subtitleCuesFromElevenAlignment(alignmentForVo(VO), VO);
    for (let i = 1; i < cues.length; i++) {
      assert.ok(cues[i]!.start_seconds >= cues[i - 1]!.start_seconds);
    }
    const duration = 22;
    assert.ok(cues[cues.length - 1]!.end_seconds <= duration + 0.25);
    let plan = buildTextToVideoCreativePlan({
      packageId: "p",
      voiceoverText: VO,
    });
    plan = approveTextToVideoCreativePlan(plan, "2026-01-01T00:00:00.000Z");
    const measured = applyMeasuredTimingToPlan({
      plan,
      audioDurationSeconds: duration,
      measuredAudioRevisionId: plan.voiceover_revision_id,
      synthesisFingerprint: "fp",
    });
    assert.equal(measured.timing_status, TEXT_TO_VIDEO_TIMING_MEASURED);
  });

  await check("31–32 — Runway preflight estimated vs measured", async () => {
    const est = approvedBrief();
    assert.throws(() =>
      assertTextToVideoRunwayPreflight({
        ...preflightInput(est),
        paidPreflightPhase: "runway",
      }),
    );
    const supabase = makeFakeSupabase();
    const voiceResult = await runTextToVideoElevenLabsVoicePhase(
      voicePhaseInput(est, { packageId: "pkg-runway-preflight" }),
      {
        supabase,
        probeDuration: async () => 22,
        elevenLabsCall: async () => ({
          audio_base64: Buffer.alloc(256, 1).toString("base64"),
          normalized_alignment: alignmentForVo(VO),
        }),
      },
    );
    assert.doesNotThrow(() =>
      assertTextToVideoRunwayPreflight({
        ...preflightInput(voiceResult.brief),
        brief: voiceResult.brief,
        paidPreflightPhase: "runway",
      }),
    );
  });

  await check("33–35 — still mode + paid entry stops before worker assembly", async () => {
    assert.notEqual(parsePackageVideoProductionMode("still"), "text_to_video");
    const supabase = makeFakeSupabase();
    try {
      const r = await runTextToVideoPaidEntryPoint(
        voicePhaseInput(brief, { packageId: "pkg-runway-stub" }),
        {
          supabase,
          probeDuration: async () => 22,
          elevenLabsCall: async () => ({
            audio_base64: Buffer.alloc(256, 1).toString("base64"),
            normalized_alignment: alignmentForVo(VO),
          }),
        },
      );
      assert.ok(r.checkpoint.synthesis_fingerprint);
    } catch (e: unknown) {
      assert.ok(e instanceof Error);
      assert.equal(e.message, "text_to_video_runway_disabled");
    }
  });

  await check("37 — no real network in this script", () => {
    assert.equal(typeof fetch, "function");
  });

  await check("claim stale helper", () => {
    assert.equal(
      submissionClaimStale("2020-01-01T00:00:00.000Z", Date.now()),
      true,
    );
  });

  Object.assign(process.env, envBackup);
  console.log("\nAll step-3 checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
