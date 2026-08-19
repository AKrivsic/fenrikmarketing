/**
 * Production text-to-video step 2 — offline checks.
 * Run: npx tsx scripts/check-production-text-to-video-step-2.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeProductionConfig } from "../lib/projects/productionRun";
import {
  buildTextToVideoCreativePlan,
  checkTextToVideoRepetition,
  applyHumanVisualEditToScene,
  applyRepetitionResultToPlan,
  planMatchesApprovedSources,
} from "../lib/content-package/textToVideoCreativePlan";
import {
  syncVideoCreativeIntegrityFromSources as syncIntegrity,
  invalidateVideoDerivativesOnVoiceoverChange,
  readVideoCreativeIntegrity,
} from "../lib/content-package/videoCreativeIntegrity";
import { evaluateVideoPaidPreflight } from "../lib/content-package/videoPaidPreflight";
import { assertTextToVideoPaidEntryReady } from "../lib/content-package/textToVideoPaidEntry";
import { normalizeMemoryText } from "../lib/ai/workflows/antiRepetitionMemory";
import { EMPTY_MEMORY } from "../lib/ai/workflows/antiRepetitionMemory";
import { buildPackageBrief } from "../lib/ai/workflows/packageShared";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import { defersVideoUntilCreativeReview } from "../lib/ai/generationMode";

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

function vo(len = 400): string {
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

async function main(): Promise<void> {
  console.log("Production text-to-video step 2\n");

  await check("1–2 — Production config stores still and text_to_video", () => {
    const still = normalizeProductionConfig({
      packageCount: 1,
      platforms: ["tiktok"],
      packageVideoMode: "still",
    });
    const t2v = normalizeProductionConfig({
      packageCount: 1,
      platforms: ["tiktok"],
      package_video_mode: "text_to_video",
    });
    assert.equal(still.packageVideoMode ?? "still", "still");
    assert.equal(t2v.packageVideoMode, "text_to_video");
  });

  await check("3 — missing mode defaults still", () => {
    const cfg = normalizeProductionConfig({
      packageCount: 1,
      platforms: ["tiktok"],
    });
    assert.equal(cfg.packageVideoMode ?? "still", "still");
  });

  await check("4 — run config immutability in brief stamp", () => {
    const src = readFileSync(
      join(root, "lib/content-package/videoCreativeIntegrity.ts"),
      "utf8",
    );
    assert.match(src, /package_video_mode_immutable_for_run/);
  });

  await check("5–6 — plan from voiceover with 5–7 scenes", () => {
    const plan = buildTextToVideoCreativePlan({
      packageId: "pkg-1",
      voiceoverText: vo(400),
    });
    assert.ok(plan.scenes.length >= 5 && plan.scenes.length <= 7);
    assert.equal(plan.voiceover_revision_id.length > 0, true);
  });

  await check("7 — short voiceover uses at least 3 scenes without filler spam", () => {
    const plan = buildTextToVideoCreativePlan({
      packageId: "pkg-2",
      voiceoverText: "Krátké intro. Střed myšlenky. A jasný závěr.",
    });
    assert.ok(plan.scenes.length >= 3 && plan.scenes.length <= 7);
  });

  await check("8 — voiceover change invalidates plan", () => {
    const brief = buildPackageBrief(pkg(), {
      packageVideoMode: "text_to_video",
    }) as Record<string, unknown>;
    const next = invalidateVideoDerivativesOnVoiceoverChange(brief, "Nový text.");
    const integrity = readVideoCreativeIntegrity(next);
    assert.equal(integrity.hook_status, "stale");
    assert.equal(integrity.plan_sync_status, "stale");
  });

  await check("9 — scene edit resets repetition", () => {
    const plan = buildTextToVideoCreativePlan({
      packageId: "p",
      voiceoverText: vo(),
    });
    const edited = applyHumanVisualEditToScene(
      plan,
      plan.scenes[0]!.scene_id,
      "Obrovská hora peněz v plamenech.",
    );
    assert.equal(edited.status, "draft");
    assert.equal(edited.repetition.status, "not_run");
    assert.notEqual(
      edited.scenes[0]!.provider_prompt,
      plan.scenes[0]!.provider_prompt,
    );
  });

  await check("10 — voice direction stale blocks paid sync", () => {
    const brief = buildPackageBrief(pkg()) as Record<string, unknown>;
    brief.video_voice_direction = { style: "urgent", revision: 2 };
    const integrity = syncIntegrity({
      voiceoverText: vo(),
      hookText: "Hook",
      voiceDirection: { style: "urgent", revision: 2 },
      plan: null,
      packageVideoMode: "text_to_video",
    });
    assert.equal(integrity.audio_timing_status, "stale");
  });

  await check("11 — current integrity requires matching fingerprints", () => {
    const plan = buildTextToVideoCreativePlan({
      packageId: "p3",
      voiceoverText: vo(),
    });
    const ok = planMatchesApprovedSources({
      plan,
      voiceoverText: vo(),
      hookText: plan.approved_hook,
      voiceDirectionRevision: 0,
    });
    assert.equal(ok, true);
    const integrity = syncIntegrity({
      voiceoverText: vo(),
      hookText: plan.approved_hook,
      voiceDirection: { style: "auto", revision: 0 },
      plan: { ...plan, status: "approved", repetition: { ...plan.repetition, status: "passed" } },
      packageVideoMode: "text_to_video",
    });
    assert.equal(integrity.plan_sync_status, "current");
    const bad = syncIntegrity({
      voiceoverText: "totally different voiceover",
      hookText: plan.approved_hook,
      voiceDirection: { style: "auto", revision: 0 },
      plan: { ...plan, status: "approved", repetition: { ...plan.repetition, status: "passed" } },
      packageVideoMode: "text_to_video",
    });
    assert.equal(bad.plan_sync_status, "stale");
  });

  await check("12–13 — hook and plan fingerprint blocked", () => {
    const plan = buildTextToVideoCreativePlan({
      packageId: "p4",
      voiceoverText: vo(),
    });
    const hook = plan.approved_hook;
    const repetition = checkTextToVideoRepetition({
      plan,
      memory: { ...EMPTY_MEMORY, hooks: [hook] },
    });
    assert.equal(repetition.status, "blocked");
    assert.ok(repetition.blocked_reasons.includes("hook_duplicate_normalized_text"));
    const repetition2 = checkTextToVideoRepetition({
      plan,
      memory: EMPTY_MEMORY,
      priorPlanFingerprints: [plan.plan_fingerprint],
    });
    assert.ok(repetition2.blocked_reasons.includes("plan_fingerprint_duplicate"));
  });

  await check("15 — same topic different hook passes", () => {
    const plan = buildTextToVideoCreativePlan({
      packageId: "p5",
      voiceoverText: vo(),
    });
    const repetition = checkTextToVideoRepetition({
      plan,
      memory: {
        ...EMPTY_MEMORY,
        topics: ["cashflow pro firmy"],
        hooks: [normalizeMemoryText("Úplně jiný hook než dnes")],
      },
    });
    assert.equal(repetition.status, "passed");
  });

  await check("16 — no fake auto-revision on repetition block (Step 2B)", () => {
    const plan = buildTextToVideoCreativePlan({
      packageId: "p6",
      voiceoverText: vo(),
    });
    const blocked = applyRepetitionResultToPlan(
      plan,
      {
        status: "blocked",
        blocked_reasons: ["hook_duplicate_normalized_text"],
      },
      new Date().toISOString(),
    );
    assert.equal(blocked.status, "repetition_blocked");
    assert.equal(blocked.plan_fingerprint, plan.plan_fingerprint);
    assert.equal(blocked.voiceover_revision_id, plan.voiceover_revision_id);
    const src = readFileSync(
      join(root, "lib/content-package/textToVideoCreativePlan.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /variationSalt|autoReviseTextToVideoPlanOnce/);
  });

  await check("17 — manual review defers video at persist", () => {
    assert.equal(defersVideoUntilCreativeReview("manual_review"), true);
  });

  await check("18–19 — paid preflight blocks stale and missing confirm/budget", () => {
    const brief = buildPackageBrief(pkg(), {
      packageVideoMode: "text_to_video",
    }) as Record<string, unknown>;
    const stale = evaluateVideoPaidPreflight({
      packageVideoMode: "text_to_video",
      runPackageVideoMode: "text_to_video",
      generationMode: "production",
      creativeReview: null,
      brief: invalidateVideoDerivativesOnVoiceoverChange(brief, "x"),
      enforceFuturePaidGates: true,
      confirmPaidRun: false,
    });
    assert.equal(stale.ok, false);
    assert.throws(() =>
      assertTextToVideoPaidEntryReady({
        packageVideoMode: "text_to_video",
        runPackageVideoMode: "text_to_video",
        generationMode: "production",
        creativeReview: null,
        brief,
        enforceFuturePaidGates: true,
        confirmPaidRun: false,
      }),
    );
  });

  await check("20 — still integrity stays current", () => {
    const integrity = syncIntegrity({
      voiceoverText: vo(),
      hookText: "Hook",
      voiceDirection: { style: "auto", revision: 0 },
      plan: null,
      packageVideoMode: "still",
    });
    assert.equal(integrity.hook_status, "current");
    assert.equal(integrity.plan_sync_status, "current");
  });

  await check("21 — platform outputs untouched on VO invalidation", () => {
    const brief = buildPackageBrief({
      ...pkg(),
      platform_outputs: { tiktok: { caption: "keep", hashtags: ["#a"], cta: "x" } },
    } as ContentPackageOutput) as Record<string, unknown>;
    (brief as Record<string, unknown>).social_image = { path: "s.png" };
    const before = JSON.stringify(brief.platform_outputs);
    const next = invalidateVideoDerivativesOnVoiceoverChange(brief, "new");
    assert.equal(JSON.stringify(next.platform_outputs), before);
  });

  await check("22 — paid entry delegates providers, no direct fetch", () => {
    const src = readFileSync(
      join(root, "lib/content-package/textToVideoPaidEntry.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /fetch\s*\(/);
    assert.doesNotMatch(src, /api\.elevenlabs|api\.runway|runwayml\.com/i);
    assert.match(src, /runTextToVideoElevenLabsVoicePhase|runTextToVideoJobPhase/);
  });

  console.log("\nAll step-2 checks passed.");
}

main().catch(() => process.exit(1));
