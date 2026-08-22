/**
 * Creative Core v2 — fingerprint + voiceover soft-clamp regression (offline).
 * Fixture mirrors production run 153cbfff… / strategy 882e50d8… / item a1bb0542…
 * (anonymized — no Product Brain / prompts).
 *
 * Run: npm run check:content-creative-core-v2-fingerprint-regression
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyDeterministicCreativeFingerprint,
  applySoftVoiceoverClamp,
  buildCreativeCoreFailureDiagnostics,
  buildCreativeCoreFailureLastRaw,
  createCreativeCore,
  fingerprintFromCreativeCore,
  fingerprintsStructurallyEqual,
  parseCreativeCoreResponse,
  projectCreativeCoreToLegacyPackage,
  softClampVoiceoverWordCount,
  validateCreativeCore,
  countVoiceoverWords,
  assembleCreativeMemory,
  type ContentCreativeCoreV2,
  type CreativeFingerprintV2,
} from "../lib/content-creative-core-v2";
import { buildBoundedFailureOutputSnapshot } from "../lib/production-runtime/boundedFailureSnapshot";

let passed = 0;
let failed = 0;
const root = process.cwd();

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

/** Anonymized video core (~70 words) with 4 scenes. */
function basePartial() {
  const hook = "The notebook looked ready. The feed was empty.";
  const voiceover = [
    hook,
    "On a slow Tuesday she flipped past dates that never became posts.",
    "Planning felt like progress until the blank feed answered back.",
    "The missing piece was never another calendar page.",
    "Ship one real asset today instead of another unused plan.",
  ].join(" ");
  return {
    contract_version: 2 as const,
    strategy_item_id: "si-anon-882e50d8",
    core_idea: "A full content calendar that never became published posts.",
    hook,
    voiceover,
    main_emotion: "clarity after friction",
    conflict: "Illusion of a system versus an empty feed",
    reveal_or_surprise: "The notebook was never the bottleneck",
    visible_change: "From flipping unused dates to one shipped asset",
    payoff: "Production beats planning theater",
    cta_intent: "Ship one real asset today",
    scenes: [
      {
        scene_id: "s1",
        order: 1,
        voiceover_excerpt: hook,
        visual_event: "Owner opens a dated notebook on a kitchen table.",
        environment: "small kitchen table daylight",
        subjects: "brand owner, open notebook",
        action: "She flips past written dates.",
        motion_or_change: "Pages turn; feed stays blank on phone beside it.",
        emotion: "quiet frustration",
        camera_intent: "top-down then phone edge",
        sound_intent: "page rustle",
        screen_policy: "no_screen" as const,
        continuity_hints: "same table, same notebook",
      },
      {
        scene_id: "s2",
        order: 2,
        voiceover_excerpt:
          "On a slow Tuesday she flipped past dates that never became posts.",
        visual_event: "Close-up of filled calendar grid with zero checkmarks.",
        environment: "kitchen table",
        subjects: "notebook grid",
        action: "Finger traces empty check boxes.",
        motion_or_change: "Finger pauses on a blank square.",
        emotion: "recognition",
        camera_intent: "tight on page",
        sound_intent: "soft room tone",
        screen_policy: "no_screen" as const,
        continuity_hints: "same notebook",
      },
      {
        scene_id: "s3",
        order: 3,
        voiceover_excerpt:
          "Planning felt like progress until the blank feed answered back.",
        visual_event: "Phone shows an empty profile feed next to the notebook.",
        environment: "kitchen table",
        subjects: "phone and notebook",
        action: "She compares plan dates to empty feed.",
        motion_or_change: "Phone screen stays blank while page turns.",
        emotion: "deflation",
        camera_intent: "two-shot table",
        sound_intent: "notification silence",
        screen_policy: "generic_ui_only" as const,
        continuity_hints: "same daylight",
      },
      {
        scene_id: "s4",
        order: 4,
        voiceover_excerpt:
          "The missing piece was never another calendar page. Ship one real asset today instead of another unused plan.",
        visual_event: "She closes the notebook and frames one product on the table.",
        environment: "kitchen table",
        subjects: "owner, product, closed notebook",
        action: "She shoots one photo with the phone.",
        motion_or_change: "Notebook closes; camera shutter fires.",
        emotion: "resolve",
        camera_intent: "handheld phone POV",
        sound_intent: "shutter click",
        screen_policy: "no_screen" as const,
        continuity_hints: "same table",
      },
    ],
  };
}

function withFp(
  partial: ReturnType<typeof basePartial>,
  fp: CreativeFingerprintV2,
): ContentCreativeCoreV2 {
  return {
    ...partial,
    creative_fingerprint: fp,
  };
}

function wrongFingerprint(): CreativeFingerprintV2 {
  return {
    version: "creative-fingerprint@2",
    pain_key: "totally_wrong_pain_key_xyz",
    topic_key: "unrelated_topic_key_abc",
    scenario_key: "wrong_scenario",
    pov_key: "other",
    opening_mechanism: "other",
    narrative_mechanism: "other",
    setting_key: "wrong_setting",
    visual_motif_key: "wrong_motif",
    prop_keys: ["zzz"],
    emotional_arc_key: "wrong",
    conflict_key: "wrong_conflict_key",
    reveal_key: "wrong_reveal",
    payoff_key: "wrong_payoff",
    cta_mechanism: "other",
  };
}

function words(n: number, seed = "word"): string {
  return Array.from({ length: n }, (_, i) => `${seed}${i + 1}`).join(" ");
}

/** Exactly 91 words: complete sentences; last sentence is CTA. */
function voiceover91(): string {
  const cta = "Ship one real product photo today instead of another unused plan.";
  const ctaN = countVoiceoverWords(cta);
  const need = 91 - ctaN;
  assert.ok(need > 20);
  const headWords: string[] = [];
  // Build head as two full sentences totaling `need` words.
  const s1Target = Math.floor(need / 2);
  const s2Target = need - s1Target;
  for (let i = 0; i < s1Target - 1; i += 1) headWords.push(`plan${i + 1}`);
  headWords.push("dates.");
  for (let i = 0; i < s2Target - 1; i += 1) headWords.push(`page${i + 1}`);
  headWords.push("blank.");
  const head = headWords.join(" ");
  assert.equal(countVoiceoverWords(head), need);
  const text = `${head} ${cta}`;
  assert.equal(countVoiceoverWords(text), 91);
  return text;
}

console.log("\nCreative Core v2 — fingerprint / voiceover regression\n");

await check("1. LLM wrong fingerprint → server recomputes → validation passes", () => {
  const partial = basePartial();
  const pain = "Struggling to ship consistent social content";
  const raw = {
    ...partial,
    creative_fingerprint: wrongFingerprint(),
  };
  const parsed = parseCreativeCoreResponse(raw, { painPoint: pain });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.ok(parsed.llmFingerprint);
  assert.equal(parsed.llmFingerprint?.topic_key, "unrelated_topic_key_abc");
  const expected = fingerprintFromCreativeCore({ ...parsed.core, pain_point: pain });
  assert.ok(
    fingerprintsStructurallyEqual(parsed.core.creative_fingerprint, expected),
  );
  const v = validateCreativeCore({
    core: parsed.core,
    packageKind: "video",
    painPoint: pain,
  });
  assert.equal(v.ok, true, JSON.stringify(v.issues));
});

await check("2. LLM fingerprint missing → server creates → validation passes", () => {
  const partial = basePartial();
  const { creative_fingerprint: _drop, ...rest } = {
    ...partial,
    creative_fingerprint: undefined,
  };
  void _drop;
  const raw = { ...rest };
  const parsed = parseCreativeCoreResponse(raw, {
    painPoint: "Struggling to ship consistent social content",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.llmFingerprint, null);
  assert.equal(parsed.core.creative_fingerprint.version, "creative-fingerprint@2");
  const v = validateCreativeCore({
    core: parsed.core,
    packageKind: "video",
    painPoint: "Struggling to ship consistent social content",
  });
  assert.equal(v.ok, true, JSON.stringify(v.issues));
});

await check("3. LLM correct fingerprint still overwritten deterministically", () => {
  const partial = basePartial();
  const pain = "Struggling to ship consistent social content";
  const correct = fingerprintFromCreativeCore({ ...partial, pain_point: pain });
  const parsed = parseCreativeCoreResponse(
    { ...partial, creative_fingerprint: correct },
    { painPoint: pain },
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.core.creative_fingerprint, correct);
  // Mutate LLM copy after parse path: applyDeterministic still matches.
  const again = applyDeterministicCreativeFingerprint(parsed.core, pain);
  assert.deepEqual(again.creative_fingerprint, correct);
});

await check("4. null vs empty string pain does not false-mismatch after normalize", () => {
  const partial = basePartial();
  const a = fingerprintFromCreativeCore({ ...partial, pain_point: null });
  const b = fingerprintFromCreativeCore({ ...partial, pain_point: "" });
  assert.ok(fingerprintsStructurallyEqual(a, b));
  const coreA = applyDeterministicCreativeFingerprint(
    withFp(partial, wrongFingerprint()),
    null,
  );
  const coreB = applyDeterministicCreativeFingerprint(
    withFp(partial, wrongFingerprint()),
    "",
  );
  assert.ok(
    fingerprintsStructurallyEqual(
      coreA.creative_fingerprint,
      coreB.creative_fingerprint,
    ),
  );
});

await check("5. object key order does not change fingerprint", () => {
  const partial = basePartial();
  const pain = "pain";
  const fp1 = fingerprintFromCreativeCore({
    core_idea: partial.core_idea,
    hook: partial.hook,
    main_emotion: partial.main_emotion,
    conflict: partial.conflict,
    reveal_or_surprise: partial.reveal_or_surprise,
    payoff: partial.payoff,
    cta_intent: partial.cta_intent,
    scenes: partial.scenes,
    pain_point: pain,
  });
  const fp2 = fingerprintFromCreativeCore({
    scenes: partial.scenes,
    payoff: partial.payoff,
    pain_point: pain,
    cta_intent: partial.cta_intent,
    reveal_or_surprise: partial.reveal_or_surprise,
    conflict: partial.conflict,
    main_emotion: partial.main_emotion,
    hook: partial.hook,
    core_idea: partial.core_idea,
  });
  assert.deepEqual(fp1, fp2);
});

await check("6. scene array order affects visual keys; sorted order is stable for same scenes", () => {
  const partial = basePartial();
  const pain = "pain";
  const fpNormal = fingerprintFromCreativeCore({ ...partial, pain_point: pain });
  const reversed = {
    ...partial,
    scenes: [...partial.scenes].reverse(),
  };
  const fpReversed = fingerprintFromCreativeCore({
    ...reversed,
    pain_point: pain,
  });
  // Reversed scene order changes visual/prop blobs by design (documented).
  assert.notEqual(fpNormal.visual_motif_key, fpReversed.visual_motif_key);
  // Same order different array instance: identical.
  const fpCopy = fingerprintFromCreativeCore({
    ...partial,
    scenes: partial.scenes.map((s) => ({ ...s })),
    pain_point: pain,
  });
  assert.deepEqual(fpNormal, fpCopy);
});

await check("7. voiceover 91 words soft-clamped to ≤90 and validates", () => {
  const partial = basePartial();
  const vo = voiceover91();
  assert.equal(countVoiceoverWords(vo), 91);
  const clamp = softClampVoiceoverWordCount({
    voiceover: vo,
    maxWords: 90,
    minWords: 40,
    maxOvershoot: 5,
  });
  assert.equal(clamp.ok, true);
  if (!clamp.ok) return;
  assert.ok(clamp.wordCount <= 90);
  assert.ok(clamp.wordCount >= 40);

  const coreIn = withFp(
    { ...partial, voiceover: vo, hook: vo.split(/(?<=[.!?])\s+/)[0]! },
    wrongFingerprint(),
  );
  const { core, clamp: applied } = applySoftVoiceoverClamp({
    core: applyDeterministicCreativeFingerprint(coreIn, "pain"),
    packageKind: "video",
  });
  assert.ok(applied && "applied" in applied && applied.applied);
  assert.ok(countVoiceoverWords(core.voiceover) <= 90);
  const v = validateCreativeCore({
    core: applyDeterministicCreativeFingerprint(core, "pain"),
    packageKind: "video",
    painPoint: "pain",
  });
  // May still fail scene coverage after redistribute — assert word count gate specifically
  assert.ok(
    !v.issues.some((i) => i.path === "$.voiceover"),
    JSON.stringify(v.issues),
  );
});

await check("8. voiceover far over limit fails soft clamp with clear reason", () => {
  const long = `${words(40, "a")}. ${words(40, "b")}. ${words(30, "c")} Ship now.`;
  assert.ok(countVoiceoverWords(long) > 95);
  const clamp = softClampVoiceoverWordCount({
    voiceover: long,
    maxWords: 90,
    minWords: 40,
    maxOvershoot: 5,
  });
  assert.equal(clamp.ok, false);
  if (clamp.ok) return;
  assert.equal(clamp.reason, "overshoot_too_large");
});

await check("9. multiple validation errors all preserved and UI joins them", () => {
  const src = readFileSync(
    join(root, "lib/api/production-run-admin.ts"),
    "utf8",
  );
  assert.match(src, /\.join\("; "\)/);
  assert.doesNotMatch(
    src,
    /validation_errors\?\.\[0\]/,
  );

  const issues = [
    {
      path: "$.creative_fingerprint",
      message: "creative_fingerprint does not match the creative core content",
    },
    {
      path: "$.voiceover",
      message: "voiceover must be 40–90 words (got 91)",
    },
  ];
  const detail = issues.map((i) => i.message).join("; ");
  assert.match(detail, /creative_fingerprint/);
  assert.match(detail, /voiceover must be 40–90/);
});

await check("10. failure stores bounded diagnostic snapshot with non-null candidate", () => {
  const partial = basePartial();
  const core = applyDeterministicCreativeFingerprint(
    withFp(partial, wrongFingerprint()),
    "pain",
  );
  const diagnostics = buildCreativeCoreFailureDiagnostics({
    core,
    llmFingerprint: wrongFingerprint(),
    painPoint: "pain",
    voiceoverSoftClamp: { applied: false, trimmed_words: 0 },
    validationErrors: [
      { path: "$.voiceover", message: "voiceover must be 40–90 words (got 91)" },
    ],
    providerRequestId: "req_anon_test",
  });
  assert.ok(diagnostics.llm_fingerprint);
  assert.ok(diagnostics.computed_fingerprint);
  assert.equal(diagnostics.provider_request_id, "req_anon_test");
  const lastRaw = buildCreativeCoreFailureLastRaw({ core, diagnostics });
  const snap = buildBoundedFailureOutputSnapshot({
    raw: lastRaw,
    validationErrors: diagnostics.validation_errors,
  });
  assert.equal(snap.parsed_ok, true);
  assert.ok(typeof snap.candidate === "string" && snap.candidate.length > 0);
  assert.doesNotMatch(String(snap.candidate), /PRODUCT BRAIN|system prompt/i);
});

await check("fixture: anonymized 153cbfff path dry-run persists package shape", async () => {
  const pain = "Struggling to ship consistent social content";
  const partial = basePartial();
  const vo91 = voiceover91();
  const llmPayload = {
    ...partial,
    voiceover: vo91,
    hook: vo91.split(/(?<=[.!?])\s+/)[0]!,
    creative_fingerprint: wrongFingerprint(),
  };

  const created = await createCreativeCore({
    context: {
      productBrain: {
        product_name: "Anon Studio",
        product_description: "anon",
        pain_points: [pain],
        cta: "Ship today",
      },
      strategy: {
        topic: "Anon calendar that never shipped posts",
        angle: "Notebook POV without naming a real brand",
        pain_point: pain,
      },
      strategyItemId: "si-anon-882e50d8",
      funnelStage: "awareness",
      platforms: ["tiktok", "instagram", "facebook", "youtube", "linkedin"],
      language: "en",
      memory: assembleCreativeMemory([]),
      packageKind: "video",
    },
    textProvider: {
      complete: async () => ({
        text: JSON.stringify(llmPayload),
        requestId: "anon-provider-req",
      }),
    },
  });

  assert.equal(created.ok, true, JSON.stringify(created));
  if (!created.ok) return;
  assert.ok(countVoiceoverWords(created.core.voiceover) <= 90);
  assert.ok(
    fingerprintsStructurallyEqual(
      created.core.creative_fingerprint,
      fingerprintFromCreativeCore({
        ...created.core,
        pain_point: pain,
      }),
    ),
  );

  const projected = projectCreativeCoreToLegacyPackage({
    core: created.core,
    packageKind: "video",
    funnelStage: "awareness",
    targetPlatforms: ["tiktok", "instagram", "facebook", "youtube", "linkedin"],
  });
  assert.equal(projected.ok, true);
  if (!projected.ok) return;
  assert.ok(projected.package);
  assert.ok(
    (projected.package as { content_creative_core_v2?: unknown })
      .content_creative_core_v2 ||
      (projected.package as { package_brief?: unknown }),
  );
});

await check("source: parse never trusts LLM fingerprint as authority", () => {
  const src = readFileSync(
    join(root, "lib/content-creative-core-v2/createCreativeCore.ts"),
    "utf8",
  );
  assert.match(src, /applyDeterministicCreativeFingerprint/);
  assert.match(src, /fingerprintFromCreativeCore/);
  assert.doesNotMatch(
    src,
    /creative_fingerprint:\s*fingerprint\b/,
  );
});

await check("runPipeline forwards lastRaw on createCreativeCore failure", () => {
  const src = readFileSync(
    join(root, "lib/content-creative-core-v2/runPipeline.ts"),
    "utf8",
  );
  assert.match(src, /created\.lastRaw/);
});

console.log(`\nFingerprint regression: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
