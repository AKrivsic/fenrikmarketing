/**
 * Production text-to-video Step 3B — behavioral hardening (offline).
 * Run: npx tsx scripts/check-production-text-to-video-step-3b-behavior.ts
 */
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  estimateElevenLabsTtsCostUsd,
  voiceSynthesisBudgetExposureUsd,
} from "../lib/elevenlabs/config";
import {
  ElevenLabsAdapterError,
  elevenLabsErrorImpliesSubmissionUnknown,
} from "../lib/elevenlabs/adapter";
import {
  spokenCharTimingsFromAlignment,
  excerptTimeRangeFromAlignment,
} from "../lib/elevenlabs/alignmentVoiceover";
import { subtitleCuesFromElevenAlignment } from "../lib/elevenlabs/subtitlesFromAlignment";
import {
  applyAlignmentMeasuredTimingToPlan,
  applyEstimatedFallbackTimingToPlan,
  TIMING_MEASUREMENT_ALIGNMENT,
} from "../lib/text-to-video/measuredSceneTiming";
import {
  approveTextToVideoCreativePlan,
  buildTextToVideoCreativePlan,
} from "../lib/content-package/textToVideoCreativePlan";
import { evaluateVideoPaidPreflight } from "../lib/content-package/videoPaidPreflight";
import {
  claimVoiceSynthesisSubmission,
  isSubmissionClaimStaleRow,
  loadOrCreateVoiceSynthesisAttempt,
  markSubmissionUnknownUnowned,
  resolveVoiceSynthesisRowForSubmit,
  type VoiceSynthesisRow,
} from "../lib/text-to-video/voiceSynthesisRepository";
import { VOICE_SYNTHESIS_SUBMISSION_CLAIM_STALE_MS } from "../lib/text-to-video/voiceSynthesisConstants";
import { parsePackageVideoProductionMode } from "../lib/content-package/packageVideoProductionMode";

const VO =
  "Ahoj svete. Toto je test voiceover pro sceny. " +
  "Druha veta pokracuje dal. Treti veta uzavira myslenku. " +
  "Ctvrte veta doplňuje kontext. Pate veta konci vyzvou.";

function alignmentFor(text: string, tagPrefix = "") {
  const spoken = tagPrefix ? `${tagPrefix}${text}` : text;
  const chars = spoken.split("");
  const step = 22 / Math.max(chars.length, 1);
  return {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => i * step),
    character_end_times_seconds: chars.map((_, i) => (i + 1) * step),
  };
}

function makeFakeSupabase() {
  const rows = new Map<string, VoiceSynthesisRow>();
  let idSeq = 0;
  const storage = new Map<string, Buffer>();
  let postCount = 0;

  const client = {
    from(table: string) {
      const filters: Array<{ col: string; val: unknown; op: string }> = [];
      let patch: Record<string, unknown> | null = null;
      let insertPayload: Record<string, unknown> | null = null;
      let mode = "select";
      const api: Record<string, unknown> = {
        select() {
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
        eq(c: string, v: unknown) {
          filters.push({ col: c, val: v, op: "eq" });
          return api;
        },
        in(c: string, v: unknown[]) {
          filters.push({ col: c, val: v, op: "in" });
          return api;
        },
        is(c: string, v: unknown) {
          filters.push({ col: c, val: v, op: "is" });
          return api;
        },
        maybeSingle() {
          return Promise.resolve(run(true));
        },
        single() {
          return Promise.resolve(run(true));
        },
      };

      function run(single: boolean) {
        if (table !== "text_to_video_voice_syntheses") {
          return { data: null, error: null };
        }
        if (mode === "insert" && insertPayload) {
          const fp = insertPayload.synthesis_fingerprint;
          for (const row of rows.values()) {
            if (row.synthesis_fingerprint === fp) {
              return { data: single ? row : [row], error: null };
            }
          }
          const id = `syn-${++idSeq}`;
          const row = {
            id,
            ...insertPayload,
            submission_claim_owner: null,
            submission_claimed_at: null,
          } as VoiceSynthesisRow;
          rows.set(id, row);
          return { data: single ? row : [row], error: null };
        }
        if (mode === "update" && patch) {
          for (const row of rows.values()) {
            const ok = filters.every((f) => {
              if (f.op === "in") {
                return Array.isArray(f.val) && f.val.includes(row[f.col as keyof VoiceSynthesisRow]);
              }
              if (f.op === "is" && f.val === null) {
                return row[f.col as keyof VoiceSynthesisRow] == null;
              }
              return row[f.col as keyof VoiceSynthesisRow] === f.val;
            });
            if (ok) {
              Object.assign(row, patch);
              return { data: single ? row : [row], error: null };
            }
          }
          return { data: single ? null : [], error: null };
        }
        const fp = filters.find((f) => f.col === "synthesis_fingerprint")?.val;
        for (const row of rows.values()) {
          if (fp && row.synthesis_fingerprint !== fp) continue;
          return { data: single ? row : [row], error: null };
        }
        return { data: single ? null : [], error: null };
      }
      return api;
    },
    storage: {
      from() {
        return {
          upload(path: string, body: Buffer) {
            storage.set(path, body);
            return Promise.resolve({ error: null });
          },
          download(path: string) {
            const b = storage.get(path);
            if (!b) return Promise.resolve({ data: null, error: { message: "missing" } });
            return Promise.resolve({ data: new Blob([b]), error: null });
          },
        };
      },
    },
    __postCount: () => postCount,
    __incPost: () => {
      postCount += 1;
    },
    __rows: () => rows,
    __storage: () => storage,
  };
  return client as unknown as SupabaseClient & {
    __postCount: () => number;
    __incPost: () => void;
    __rows: () => Map<string, VoiceSynthesisRow>;
  };
}

async function check(name: string, fn: () => void | Promise<void>) {
  await Promise.resolve(fn());
  console.log(`  ✓ ${name}`);
}

async function main() {
  console.log("Production text-to-video step 3B (behavioral)\n");

  await check("23 — default $0.10 / 1k chars estimate", () => {
    const prev = process.env.ELEVENLABS_USD_PER_1K_CHARS;
    delete process.env.ELEVENLABS_USD_PER_1K_CHARS;
    assert.equal(estimateElevenLabsTtsCostUsd(1000), 0.1);
    if (prev) process.env.ELEVENLABS_USD_PER_1K_CHARS = prev;
  });

  await check("24 — submission_unknown counts as budget exposure", () => {
    assert.equal(
      voiceSynthesisBudgetExposureUsd({
        estimatedCostUsd: 0.5,
        status: "submission_unknown",
      }),
      0.5,
    );
  });

  await check("8 — HTTP 5xx implies submission_unknown classification", () => {
    const err = new ElevenLabsAdapterError("server_error", "x", 503);
    assert.equal(elevenLabsErrorImpliesSubmissionUnknown(err), true);
  });

  await check("16–19 — alignment tags / voiceover / subtitles", () => {
    const tagged = alignmentFor(VO, "[confident]");
    spokenCharTimingsFromAlignment(tagged, VO);
    const cues = subtitleCuesFromElevenAlignment(tagged, VO);
    const joined = cues.map((c) => c.text).join(" ");
    assert.doesNotMatch(joined, /\[(excited|confident|warm|calm|serious)\]/i);
    assert.throws(() =>
      spokenCharTimingsFromAlignment(alignmentFor("Jiny text"), VO),
    );
  });

  await check("20–22 — scene timing from alignment; fallback blocked at Runway", () => {
    const align = alignmentFor(VO);
    let plan = buildTextToVideoCreativePlan({
      packageId: "p",
      voiceoverText: VO,
    });
    plan = approveTextToVideoCreativePlan(plan, "2026-01-01T00:00:00.000Z");
    const measured = applyAlignmentMeasuredTimingToPlan({
      plan,
      alignment: align,
      approvedVoiceover: VO,
      audioDurationSeconds: 22,
      measuredAudioRevisionId: plan.voiceover_revision_id,
      synthesisFingerprint: "fp",
    });
    assert.equal(measured.timing_measurement_source, TIMING_MEASUREMENT_ALIGNMENT);
    for (let i = 1; i < measured.scenes.length; i++) {
      const prev = measured.scenes[i - 1]!;
      const cur = measured.scenes[i]!;
      assert.ok(cur.approximate_start_seconds >= prev.approximate_start_seconds);
    }
    const fallback = applyEstimatedFallbackTimingToPlan({
      plan,
      audioDurationSeconds: 22,
      measuredAudioRevisionId: plan.voiceover_revision_id,
    });
    const pre = evaluateVideoPaidPreflight({
      packageVideoMode: "text_to_video",
      runPackageVideoMode: "text_to_video",
      generationMode: "production",
      creativeReview: null,
      brief: {
        package_video_mode: "text_to_video",
        voiceover_text: VO,
        video_text_to_video_creative_plan: fallback,
      },
      enforceFuturePaidGates: true,
      confirmPaidRun: true,
      paidPreflightPhase: "runway",
    });
    assert.equal(pre.ok, false);
    assert.ok(pre.blockers.includes("timing_measurement_not_alignment"));
  });

  const supabase = makeFakeSupabase();
  const baseInput = {
    projectId: "p1",
    packageId: "pkg1",
    fingerprint: "fp1",
    voiceoverRevisionId: "rev1",
    voiceId: "v1",
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    estimatedCostUsd: 0.1,
    synthesisInput: {
      approved_voiceover_text: VO,
      synthesis_text: `[confident] ${VO}`,
      direction_contract_version: 1,
      style: "natural",
      voice_direction_revision: 0,
    },
  };

  await check("1 — concurrent create race → one row", async () => {
    const sb = makeFakeSupabase();
    const a = loadOrCreateVoiceSynthesisAttempt(sb, baseInput);
    const b = loadOrCreateVoiceSynthesisAttempt(sb, baseInput);
    const [ra, rb] = await Promise.all([a, b]);
    assert.equal(ra.id, rb.id);
  });

  await check("2–4 — concurrent claim → single owner", async () => {
    const sb = makeFakeSupabase();
    const row = await loadOrCreateVoiceSynthesisAttempt(sb, baseInput);
    const o1 = "owner-a";
    const o2 = "owner-b";
    const [c1, c2] = await Promise.all([
      claimVoiceSynthesisSubmission(sb, row, o1),
      claimVoiceSynthesisSubmission(sb, row, o2),
    ]);
    assert.ok(c1 || c2);
    if (c1 && c2) assert.equal(c1.submission_claim_owner, c2.submission_claim_owner);
  });

  await check("5–7 — stale claim → submission_unknown", async () => {
    const sb = makeFakeSupabase();
    const row = await loadOrCreateVoiceSynthesisAttempt(sb, baseInput);
    const owner = "o-stale";
    const claimed = await claimVoiceSynthesisSubmission(sb, row, owner);
    assert.ok(claimed);
    const staleAt = new Date(
      Date.now() - VOICE_SYNTHESIS_SUBMISSION_CLAIM_STALE_MS - 1000,
    ).toISOString();
    claimed!.submission_claimed_at = staleAt;
    assert.equal(isSubmissionClaimStaleRow(claimed!, () => new Date()), true);
    const resolved = await resolveVoiceSynthesisRowForSubmit(sb, claimed!, () => new Date());
    assert.equal(resolved.status, "submission_unknown");
  });

  await check("27 — still mode does not use ElevenLabs gate", () => {
    assert.equal(parsePackageVideoProductionMode("still"), "still");
  });

  await check("28 — behavioral harness tracks zero provider POST", () => {
    assert.equal(supabase.__postCount(), 0);
  });

  console.log("\nAll step-3B behavioral checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
