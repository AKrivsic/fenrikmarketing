/**
 * Production text-to-video step 2B — integrity fixes (offline).
 * Run: npx tsx scripts/check-production-text-to-video-step-2b.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildTextToVideoCreativePlan,
  checkTextToVideoRepetition,
  applyHumanVisualEditToScene,
  applyRepetitionResultToPlan,
  approveTextToVideoCreativePlan,
  reevaluateTextToVideoPlanRepetition,
  readTextToVideoCreativePlan,
  TEXT_TO_VIDEO_TIMING_ESTIMATED,
  TEXT_TO_VIDEO_TIMING_MEASURED,
  serializeTextToVideoCreativePlan,
} from "../lib/content-package/textToVideoCreativePlan";
import {
  voiceoverRevisionId,
  fingerprintText,
  creativePlanContentFingerprint,
} from "../lib/content-package/videoCreativeRevision";
import { evaluateVideoPaidPreflight } from "../lib/content-package/videoPaidPreflight";
import {
  assertTextToVideoElevenLabsPreflight,
  assertTextToVideoRunwayPreflight,
} from "../lib/content-package/textToVideoPaidEntry";
import { buildPackageBrief } from "../lib/ai/workflows/packageShared";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import { EMPTY_MEMORY } from "../lib/ai/workflows/antiRepetitionMemory";
import { syncVideoCreativeIntegrityFromSources, serializeVideoCreativeIntegrity } from "../lib/content-package/videoCreativeIntegrity";
import { VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY } from "../lib/text-to-video/voiceSynthesisCheckpoint";
import { ELEVENLABS_MODEL_ELEVEN_V3 } from "../lib/elevenlabs/config";

const root = join(import.meta.dirname, "..");

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`  ✓ ${name}`))
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      throw err;
    });
}

function vo(len = 380): string {
  return (
    "Firma potřebuje rychlejší cashflow každý měsíc. " +
    "Nezapomeňte na faktury a termíny splatnosti. " +
    "Automatické upomínky šetří nervy i peníze. " +
    "S Fenrikem ušetříte hodiny administrativy týdně. " +
    "Tým se může soustředit na růst, ne na papírování. " +
    "Začněte ještě dnes — objednejte demo a vyzkoušejte to."
  ).slice(0, len);
}

function pkg(): ContentPackageOutput {
  return {
    title: "T",
    funnel_stage: "awareness",
    hook: "Cashflow teď",
    voiceover_text: vo(),
    subtitles: vo(),
    cta: { text: "Demo", url: null },
    video: { concept: "c", script: vo() },
    platform_outputs: { tiktok: { caption: "c", hashtags: [], cta: "Demo" } },
    hashtags: [],
    image_prompts: [],
    visual_scenes: [],
    asset_usage: [],
  } as ContentPackageOutput;
}

function approvedBrief(extra?: Record<string, unknown>): Record<string, unknown> {
  const text = vo();
  let plan = buildTextToVideoCreativePlan({
    packageId: "pkg-paid",
    voiceoverText: text,
  });
  plan = approveTextToVideoCreativePlan(plan, "2026-01-01T00:00:00.000Z");
  plan = {
    ...plan,
    repetition: { status: "passed", blocked_reasons: [], checked_at: "2026-01-01T00:00:00.000Z" },
  };
  const brief = buildPackageBrief(
    { ...pkg(), voiceover_text: text, hook: plan.approved_hook },
    { packageVideoMode: "text_to_video" },
  ) as Record<string, unknown>;
  const integrity = syncVideoCreativeIntegrityFromSources({
    voiceoverText: text,
    hookText: plan.approved_hook,
    voiceDirection: { style: "auto", revision: 0 },
    plan,
    packageVideoMode: "text_to_video",
  });
  return {
    ...brief,
    ...extra,
    video_text_to_video_creative_plan: serializeTextToVideoCreativePlan(plan),
    video_creative_integrity: serializeVideoCreativeIntegrity(integrity),
    video_paid_preflight: {
      similarity_check_status: "passed",
      confirm_paid_run: true,
      max_budget_usd: 25,
    },
  };
}

async function main(): Promise<void> {
  console.log("Production text-to-video step 2B\n");

  const text = vo();

  await check("1 — same voiceover → same voiceover_revision_id", () => {
    const a = voiceoverRevisionId(text);
    const b = voiceoverRevisionId(text);
    assert.equal(a, b);
    assert.equal(a, fingerprintText(text));
  });

  await check("2 — retry metadata does not change voiceover identity", () => {
    const id1 = voiceoverRevisionId(text);
    const id2 = voiceoverRevisionId(`${text} `);
    assert.equal(id1, id2);
    assert.doesNotMatch(
      readFileSync(
        join(root, "lib/content-package/textToVideoCreativePlan.ts"),
        "utf8",
      ),
      /variationSalt/,
    );
  });

  await check("3 — same creative content → same plan fingerprint", () => {
    const p1 = buildTextToVideoCreativePlan({ packageId: "a", voiceoverText: text });
    const p2 = buildTextToVideoCreativePlan({ packageId: "a", voiceoverText: text });
    assert.equal(p1.plan_fingerprint, p2.plan_fingerprint);
  });

  await check("4 — timestamp and repetition status do not change plan fingerprint", () => {
    const plan = buildTextToVideoCreativePlan({ packageId: "b", voiceoverText: text });
    const fp0 = plan.plan_fingerprint;
    const blocked = applyRepetitionResultToPlan(
      plan,
      { status: "blocked", blocked_reasons: ["plan_fingerprint_duplicate"] },
      "2099-01-01T00:00:00.000Z",
    );
    assert.equal(blocked.plan_fingerprint, fp0);
    const passed = applyRepetitionResultToPlan(
      plan,
      { status: "passed", blocked_reasons: [], checked_at: "2099-02-02T00:00:00.000Z" },
      "2099-02-02T00:00:00.000Z",
    );
    assert.equal(passed.plan_fingerprint, fp0);
  });

  await check("5 — hook change changes fingerprint", () => {
    const base = buildTextToVideoCreativePlan({ packageId: "c", voiceoverText: text });
    const other = buildTextToVideoCreativePlan({
      packageId: "c",
      voiceoverText: text,
      hookOverride: "Úplně jiný hook pro test fingerprintu",
    });
    assert.notEqual(base.plan_fingerprint, other.plan_fingerprint);
  });

  await check("6 — visual edit changes fingerprint", () => {
    const plan = buildTextToVideoCreativePlan({ packageId: "d", voiceoverText: text });
    const sceneId = plan.scenes[0]!.scene_id;
    const edited = applyHumanVisualEditToScene(
      plan,
      sceneId,
      "Nová vizuální představa: modré nebe nad skladem faktur",
    );
    assert.notEqual(edited.plan_fingerprint, plan.plan_fingerprint);
  });

  await check("7 — scene meaning reorder changes fingerprint", () => {
    const plan = buildTextToVideoCreativePlan({ packageId: "e", voiceoverText: text });
    const scenes = [...plan.scenes];
    const first = scenes[0]!;
    scenes[0] = {
      ...scenes[1]!,
      order: 0,
      scene_id: first.scene_id,
    };
    scenes[1] = { ...first, order: 1, scene_id: scenes[1]!.scene_id };
    const tampered = {
      ...plan,
      scenes,
      plan_fingerprint: plan.plan_fingerprint,
    };
    const refp = creativePlanContentFingerprint({
      schema_version: tampered.schema_version,
      voiceover_revision_id: tampered.voiceover_revision_id,
      hook_fingerprint: tampered.hook_fingerprint,
      voice_direction_revision: tampered.voice_direction_revision,
      target_duration_seconds: tampered.target_duration_seconds,
      scenes: tampered.scenes.map((s) => ({
        scene_id: s.scene_id,
        order: s.order,
        human_meaning: s.human_meaning,
        provider_prompt: s.provider_prompt,
      })),
    });
    assert.notEqual(refp, plan.plan_fingerprint);
  });

  await check("8 — variationSalt cannot bypass duplicate (removed from codebase)", () => {
    const plan = buildTextToVideoCreativePlan({ packageId: "f", voiceoverText: text });
    const repetition = checkTextToVideoRepetition({
      plan,
      memory: { ...EMPTY_MEMORY, hooks: [plan.approved_hook] },
    });
    assert.equal(repetition.status, "blocked");
    const reeval = reevaluateTextToVideoPlanRepetition({
      plan,
      memory: { ...EMPTY_MEMORY, hooks: [plan.approved_hook] },
    });
    assert.equal(reeval.status, "repetition_blocked");
    assert.equal(reeval.plan_fingerprint, plan.plan_fingerprint);
  });

  await check("9 — blocked automatic plan cannot become passed without content change", () => {
    const plan = buildTextToVideoCreativePlan({ packageId: "g", voiceoverText: text });
    let blocked = applyRepetitionResultToPlan(
      plan,
      {
        status: "blocked",
        blocked_reasons: ["hook_duplicate_normalized_text"],
      },
      new Date().toISOString(),
    );
    blocked = reevaluateTextToVideoPlanRepetition({
      plan: blocked,
      memory: { ...EMPTY_MEMORY, hooks: [plan.approved_hook] },
    });
    assert.equal(blocked.repetition.status, "blocked");
    assert.equal(blocked.status, "repetition_blocked");
  });

  await check("10 — blocked plan fails paid preflight", () => {
    const brief = approvedBrief();
    const planRaw = brief.video_text_to_video_creative_plan as Record<string, unknown>;
    planRaw.status = "repetition_blocked";
    planRaw.repetition = { status: "blocked", blocked_reasons: ["hook_duplicate_normalized_text"] };
    const pre = evaluateVideoPaidPreflight({
      packageVideoMode: "text_to_video",
      runPackageVideoMode: "text_to_video",
      generationMode: "production",
      creativeReview: null,
      brief,
      enforceFuturePaidGates: true,
      confirmPaidRun: true,
      paidPreflightPhase: "elevenlabs",
    });
    assert.equal(pre.ok, false);
    assert.ok(pre.blockers.includes("repetition_blocked"));
  });

  await check("11 — manual visual edit + reevaluate creates new fingerprint and can pass", () => {
    const plan = buildTextToVideoCreativePlan({ packageId: "h", voiceoverText: text });
    const motif = plan.scenes[0]!.human_visual_edit ?? plan.scenes[0]!.visual_intent;
    const blocked = reevaluateTextToVideoPlanRepetition({
      plan,
      memory: { ...EMPTY_MEMORY, atmospheres: [motif] },
    });
    assert.equal(blocked.repetition.status, "blocked");
    const edited = applyHumanVisualEditToScene(
      blocked,
      blocked.scenes[0]!.scene_id,
      "Jiná úvodní scéna: ranní světlo v open space kanceláři",
    );
    const passed = reevaluateTextToVideoPlanRepetition({
      plan: edited,
      memory: { ...EMPTY_MEMORY, atmospheres: [motif] },
    });
    assert.notEqual(passed.plan_fingerprint, plan.plan_fingerprint);
    assert.equal(passed.repetition.status, "passed");
  });

  await check("12 — saving same visual text does not fake new revision", () => {
    const plan = buildTextToVideoCreativePlan({ packageId: "i", voiceoverText: text });
    const scene = plan.scenes[0]!;
    const visual = scene.human_visual_edit ?? scene.visual_intent;
    const again = applyHumanVisualEditToScene(plan, scene.scene_id, visual);
    assert.equal(again.plan_fingerprint, plan.plan_fingerprint);
    assert.equal(again.voiceover_revision_id, plan.voiceover_revision_id);
  });

  await check("13 — ElevenLabs preflight allows timing_status estimated", () => {
    const brief = approvedBrief();
    const plan = brief.video_text_to_video_creative_plan as Record<string, unknown>;
    assert.equal(plan.timing_status, TEXT_TO_VIDEO_TIMING_ESTIMATED);
    assert.doesNotThrow(() =>
      assertTextToVideoElevenLabsPreflight({
        packageVideoMode: "text_to_video",
        runPackageVideoMode: "text_to_video",
        generationMode: "production",
        creativeReview: null,
        brief,
        enforceFuturePaidGates: true,
        confirmPaidRun: true,
        paidPreflightPhase: "elevenlabs",
      }),
    );
  });

  await check("14 — Runway preflight rejects estimated timing", () => {
    const brief = approvedBrief();
    const pre = evaluateVideoPaidPreflight({
      packageVideoMode: "text_to_video",
      runPackageVideoMode: "text_to_video",
      generationMode: "production",
      creativeReview: null,
      brief,
      enforceFuturePaidGates: true,
      confirmPaidRun: true,
      paidPreflightPhase: "runway",
    });
    assert.equal(pre.ok, false);
    assert.ok(pre.blockers.includes("timing_not_measured"));
  });

  await check("15 — Runway preflight passes with measured timing + audio revision", () => {
    const brief = approvedBrief();
    const planRaw = brief.video_text_to_video_creative_plan as Record<string, unknown>;
    planRaw.timing_status = TEXT_TO_VIDEO_TIMING_MEASURED;
    planRaw.measured_audio_revision_id = planRaw.voiceover_revision_id;
    planRaw.timing_measurement_source = "alignment";
    planRaw.measured_audio_duration_seconds = 22;
    const plan = readTextToVideoCreativePlan(brief);
    assert.ok(plan);
    const integrity = syncVideoCreativeIntegrityFromSources({
      voiceoverText: text,
      hookText: plan.approved_hook,
      voiceDirection: { style: "auto", revision: 0 },
      plan,
      packageVideoMode: "text_to_video",
    });
    brief.video_creative_integrity = serializeVideoCreativeIntegrity(integrity);
    brief.hook = plan.approved_hook;
    brief[VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY] = {
      synthesis_attempt_id: "test",
      synthesis_fingerprint: "fp",
      voiceover_revision_id: plan.voiceover_revision_id,
      voice_id: "v",
      model_id: ELEVENLABS_MODEL_ELEVEN_V3,
      audio_bucket: "video-renders",
      audio_path: "projects/p/pkg/voiceover.mp3",
      audio_duration_seconds: 22,
      phase: "voice_complete",
    };
    assert.doesNotThrow(() =>
      assertTextToVideoRunwayPreflight({
        packageVideoMode: "text_to_video",
        runPackageVideoMode: "text_to_video",
        generationMode: "production",
        creativeReview: null,
        brief,
        enforceFuturePaidGates: true,
        confirmPaidRun: true,
        paidPreflightPhase: "runway",
      }),
    );
  });

  await check("16 — still workflow source unchanged (no T2V in still path)", () => {
    const src = readFileSync(
      join(root, "lib/content-package/attachTextToVideoCreativePlan.ts"),
      "utf8",
    );
    assert.match(src, /syncStillPackageIntegrity/);
    const worker = readFileSync(join(root, "video-worker/jobRunner.ts"), "utf8");
    assert.match(worker, /text_to_video_not_implemented|still/);
  });

  await check("17 — no network provider calls in step 2B scripts", () => {
    const paid = readFileSync(
      join(root, "lib/content-package/textToVideoPaidEntry.ts"),
      "utf8",
    );
    assert.doesNotMatch(paid, /fetch\s*\(/);
    assert.doesNotMatch(paid, /api\.elevenlabs|api\.runway|runwayml\.com/i);
  });

  console.log("\nAll step-2B checks passed.");
}

main().catch(() => process.exit(1));
