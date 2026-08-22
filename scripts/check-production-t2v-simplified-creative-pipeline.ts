/**
 * Offline T2V simplified creative pipeline checks (no network).
 * Run: npm run check:production-t2v-simplified-creative-pipeline
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyScenarioFamily,
  classifyVisualMotif,
} from "../lib/content-memory/creativeTaxonomy";
import {
  assembleProjectCreativeMemory,
  extractCreativeRecord,
  unusedPainPoints,
} from "../lib/content-memory/projectCreativeMemory";
import {
  evaluatePackageBriefOriginality,
  evaluateStrategyItemOriginality,
  evaluateStrategyPlanOriginality,
  STRATEGY_ORIGINALITY_EXHAUSTED,
} from "../lib/content-memory/strategyOriginality";
import {
  czechWorkingCopyChanged,
  detectMeaningDrift,
  resolveMeaningSafeEnglish,
  isEnglishPreviewSemanticallyCurrent,
} from "../lib/creative-review/meaningSafeEnglish";
import { composeTextToVideoProviderPrompt } from "../lib/content-package/textToVideoProviderPrompt";
import {
  providerPromptHasContradictoryTextRules,
  utf16CodeUnits,
  T2V_GEN45_PROMPT_MAX_UTF16,
} from "../lib/content-package/textToVideoProviderPrompt";
import { parseT2vScreenPolicy } from "../lib/content-package/t2vScreenPolicy";
import { screenPolicyConflictsWithPrompt } from "../lib/content-package/t2vScreenPolicy";
import { fingerprintText } from "../lib/content-package/videoCreativeRevision";
import { markBriefRejectedForCreativeMemory } from "../lib/content-package/t2vConceptRegenerate";
import { alignOpeningVoiceover } from "../lib/content-pipeline/alignOpeningVoiceover";
import { T2V_CANONICAL_CREATIVE_CONTRACT_VERSION } from "../lib/content-package/t2vCanonicalCreative";
import { TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION } from "../lib/text-to-video/runwayProductionConfig";

const root = join(import.meta.dirname, "..");
let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

const CANDIDATE =
  "The job candidate who researched your company the night before their interview and found a feed that looked like the business had quietly closed";
const PRE_START =
  "The moment a new hire searches your company on social before their first day — and finds nothing posted in three months";
const TAB =
  "The Monday morning moment when a potential client Googles your business name before a scheduled call — and your last post is from three months ago";
const REPLY =
  "The moment a potential client checks your profile before replying to your cold outreach — and finds nothing posted in eight weeks";

const PAINS = [
  "Social accounts are inactive or inconsistent",
  "No time or in-house team to create content consistently",
  "Website exists but content is not converting visitors",
  "Brand looks smaller or less credible than the product really is",
];

function memoryFromTopics(
  topics: string[],
  extras: { rejected?: boolean; status?: "published" | "cancelled" | "draft" }[] = [],
) {
  return assembleProjectCreativeMemory(
    topics.map((topic, i) =>
      extractCreativeRecord({
        packageId: `p${i}`,
        topic,
        angle: topic,
        hook: topic,
        painPoint: PAINS[0],
        visualText: "phone laptop feed profile scroll",
        explicitRejected: extras[i]?.rejected,
        runStatus: extras[i]?.status === "cancelled" ? "cancelled" : null,
        packageStatus: extras[i]?.status === "published" ? "published" : "draft",
      }),
    ),
  );
}

check("1 — Candidate/Pre-Start/Tab/Reply share outsider_checks_silent_company_profile", () => {
  for (const topic of [CANDIDATE, PRE_START, TAB, REPLY]) {
    assert.equal(
      classifyScenarioFamily(topic),
      "outsider_checks_silent_company_profile",
      topic,
    );
  }
});

check("2 — different character in the same situation is not new", () => {
  const memory = memoryFromTopics([CANDIDATE]);
  const issues = evaluateStrategyItemOriginality({
    item: { topic: PRE_START, angle: "new hire POV", pain_point: PAINS[0] },
    index: 0,
    memory,
    projectPains: PAINS,
    packageCount: 1,
  });
  assert.ok(issues.some((i) => i.reason === "same_situation_different_character" || i.reason === "same_scenario_family"));
});

check("3 — paraphrased hook is not a new concept", () => {
  const memory = memoryFromTopics([CANDIDATE]);
  const issues = evaluateStrategyItemOriginality({
    item: {
      topic:
        "The job candidate who researched your company the night before their interview and found a feed that looked like the business had quietly closed",
      angle: "same",
      pain_point: PAINS[0],
    },
    index: 0,
    memory,
    projectPains: PAINS,
    packageCount: 1,
  });
  assert.ok(issues.some((i) => i.reason === "paraphrased_topic_or_hook" || i.reason === "same_scenario_family"));
});

check("4 — packageCount=1 rotates pain across runs", () => {
  const memory = memoryFromTopics([CANDIDATE]);
  const unused = unusedPainPoints(PAINS, memory);
  assert.ok(unused.length > 0);
  const issues = evaluateStrategyItemOriginality({
    item: { topic: "A baker slams a tray of unsold bread", angle: "physical", pain_point: PAINS[0] },
    index: 0,
    memory,
    projectPains: PAINS,
    packageCount: 1,
  });
  assert.ok(issues.some((i) => i.reason === "pain_not_rotated"));
  const rotated = evaluateStrategyItemOriginality({
    item: { topic: "A baker slams a tray of unsold bread", angle: "physical", pain_point: PAINS[1] },
    index: 0,
    memory,
    projectPains: PAINS,
    packageCount: 1,
  });
  assert.ok(!rotated.some((i) => i.reason === "pain_not_rotated"));
});

check("5 — cancelled/rejected enters rejection memory", () => {
  const memory = memoryFromTopics([CANDIDATE], [{ rejected: true, status: "cancelled" }]);
  assert.equal(memory.records[0]?.rejected, true);
  assert.equal(memory.records[0]?.source_status, "rejected");
});

check("6 — published enters recent memory", () => {
  const memory = memoryFromTopics([CANDIDATE], [{ status: "published" }]);
  assert.equal(memory.records[0]?.source_status, "published");
  assert.ok(memory.forbidden_scenario_families.includes("outsider_checks_silent_company_profile"));
});

check("7 — new pain + situation + motif passes", () => {
  const memory = memoryFromTopics([CANDIDATE]);
  const result = evaluateStrategyPlanOriginality({
    items: [
      {
        topic: "The founder who fires himself from Friday content duty by handing a URL to a system",
        angle: "url is all you need",
        pain_point: PAINS[1],
      },
    ],
    memory,
    project: { pain_points: PAINS } as never,
    packageCount: 1,
  });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
});

check("8 — first repeated candidate is repairable (issues recorded, not exhausted)", () => {
  const memory = memoryFromTopics([CANDIDATE]);
  const first = evaluateStrategyPlanOriginality({
    items: [{ topic: TAB, angle: "client POV", pain_point: PAINS[0] }],
    memory,
    project: { pain_points: PAINS } as never,
    packageCount: 1,
  });
  assert.equal(first.ok, false);
  assert.notEqual(first.issues[0]?.reason, STRATEGY_ORIGINALITY_EXHAUSTED);
});

check("9 — second repeated candidate is exhausted before package", () => {
  const src = readFileSync(join(root, "lib/ai/workflows/planContentStrategy.ts"), "utf8");
  assert.match(src, /STRATEGY_ORIGINALITY_EXHAUSTED/);
  assert.match(src, /repair_used: true/);
  assert.match(src, /formatOriginalityRetryAppend/);
});

check("10 — hook, VO, scenes have one T2V authority (Claude package)", () => {
  const pipeline = readFileSync(join(root, "lib/content-pipeline/runCreativePipeline.ts"), "utf8");
  assert.match(pipeline, /packageVideoMode === PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO/);
  assert.match(pipeline, /readT2vCanonicalCreativeFromPackage/);
  const pkg = readFileSync(join(root, "lib/content-pipeline/runContentPackage.ts"), "utf8");
  assert.match(pkg, /packageVideoMode !== "text_to_video"/);
});

check("11 — GPT Opening must not overwrite T2V hook", () => {
  const pkg = readFileSync(join(root, "lib/content-pipeline/runContentPackage.ts"), "utf8");
  assert.match(pkg, /T2V: Claude package owns hook/);
  const aligned = alignOpeningVoiceover({
    opening: "Still hiring?",
    voiceover: "They opened a tab.",
  });
  assert.equal(aligned.hook, "Still hiring?");
  // T2V path skips this align — still path keeps it.
  const still = readFileSync(join(root, "lib/content-pipeline/runCreativePipeline.ts"), "utf8");
  assert.match(still, /runOpeningImpact/);
});

check("12 — Scene Intent does not replace canonical T2V Action", () => {
  const adapter = readFileSync(join(root, "lib/content-package/textToVideoRenderAdapter.ts"), "utf8");
  assert.match(adapter, /visualEvent/);
  assert.doesNotMatch(adapter, /continuityBlockFromVisualIdentity/);
  const seed = readFileSync(join(root, "lib/creative-review/seed.ts"), "utf8");
  assert.match(seed, /seedT2vCanonicalSceneIntents/);
});

check("13 — downstream captions must not change creative core", () => {
  const brief = readFileSync(join(root, "lib/ai/workflows/packageShared.ts"), "utf8");
  assert.match(brief, /t2v_canonical_creative/);
});

check("14 — regenerate stores previous version", () => {
  const src = readFileSync(join(root, "lib/content-package/t2vConceptRegenerate.ts"), "utf8");
  assert.match(src, /t2v_previous_concept/);
  assert.match(src, /T2V_CONCEPT_REGENERATE_USED/);
});

check("15 — regenerate error keeps original (no persist on failure)", () => {
  const src = readFileSync(join(root, "lib/content-package/t2vConceptRegenerate.ts"), "utf8");
  assert.match(src, /Původní návrh zůstal/);
  const failIdx = src.indexOf("if (!generated.ok)");
  const persistIdx = src.lastIndexOf(".update({");
  assert.ok(failIdx >= 0 && persistIdx > failIdx);
});

check("16 — regenerate does not call media", () => {
  const src = readFileSync(join(root, "lib/content-package/t2vConceptRegenerate.ts"), "utf8");
  assert.doesNotMatch(src, /video_jobs/);
  assert.doesNotMatch(src, /generateAndPersistPackageSocialImage/);
  assert.doesNotMatch(src, /ELEVENLABS/);
  assert.doesNotMatch(src, /runTextToVideoRunway/);
});

check("17 — unedited EN uses exact original_ai", () => {
  const resolved = resolveMeaningSafeEnglish({
    originalEn: "Are they still hiring?",
    originalCs: "Ještě přijímáte?",
    currentCs: "Ještě přijímáte?",
  });
  assert.equal(resolved.production_en, "Are they still hiring?");
  assert.equal(resolved.czech_changed, false);
});

check("18 — no CS→EN round-trip without edit", () => {
  assert.equal(
    czechWorkingCopyChanged({
      originalCs: "Ještě přijímáte?",
      currentCs: "Ještě přijímáte?",
    }),
    false,
  );
  const translate = readFileSync(join(root, "lib/creative-review/translateVoiceover.ts"), "utf8");
  assert.match(translate, /meaningSafeFromOriginal/);
  assert.match(translate, /translateOperatorCsChangeToEnglish/);
});

check("19 — still hiring stays still hiring", () => {
  const warnings = detectMeaningDrift({
    originalEn: "Are they still hiring?",
    nextEn: "Are they still open?",
  });
  assert.ok(warnings.some((w) => /still hiring/.test(w)));
  const kept = detectMeaningDrift({
    originalEn: "Are they still hiring?",
    nextEn: "Are they still hiring people?",
  });
  assert.equal(kept.length, 0);
});

check("20 — intentional CS change transfers to EN", () => {
  const resolved = resolveMeaningSafeEnglish({
    originalEn: "Are they still hiring?",
    originalCs: "Ještě přijímáte?",
    currentCs: "Ještě nabíráte účetní?",
    translatedEn: "Are they still hiring accountants?",
  });
  assert.equal(resolved.czech_changed, true);
  assert.equal(resolved.production_en, "Are they still hiring accountants?");
});

check("21 — meaning drift blocks Approve", () => {
  const resolved = resolveMeaningSafeEnglish({
    originalEn: "Are they still hiring?",
    originalCs: "Ještě přijímáte?",
    currentCs: "Jsou ještě otevření?",
    translatedEn: "Are they still open?",
  });
  assert.equal(resolved.meaning_review_required, true);
  const gate = readFileSync(join(root, "lib/content-package/textToVideoPlanApprovalGate.ts"), "utf8");
  assert.match(gate, /T2V_MEANING_REVIEW_REQUIRED/);
});

check("22 — Current requires fingerprints and no meaning warning", () => {
  const resolved = resolveMeaningSafeEnglish({
    originalEn: "Are they still hiring?",
    originalCs: "Ještě přijímáte?",
    currentCs: "Ještě přijímáte?",
  });
  assert.equal(
    isEnglishPreviewSemanticallyCurrent({
      englishPreview: resolved.production_en,
      outdated: false,
      meaningReviewRequired: false,
      fingerprints: resolved.fingerprints,
    }),
    true,
  );
  assert.equal(
    isEnglishPreviewSemanticallyCurrent({
      englishPreview: resolved.production_en,
      outdated: false,
      meaningReviewRequired: true,
      fingerprints: resolved.fingerprints,
    }),
    false,
  );
});

const CANDIDATE_MOTION =
  "Hiring manager's thumb pauses mid-scroll; phone screen remains legible; quiet concern; no dialogue.";
const CANDIDATE_CAMERA =
  "Slow push-in on the face as doubt registers; cut to the phone as the last post date comes into focus. One insert shot of the phone screen, clean, legible, not dramatised.";

check("23 — Action comes from canonical visual event", () => {
  const prompt = composeTextToVideoProviderPrompt({
    visualEvent: "A baker slams a metal tray onto a stainless counter; flour bursts",
    englishVisualIntent: "ABSTRACT ESSAY about hiring anxiety",
    motionPrompt: "Tray hits; flour expands",
    setting: "bakery workshop",
    sceneCamera: "handheld medium following the tray",
    screenPolicy: "no_screen",
  });
  assert.match(prompt, /Action: A baker slams a metal tray/);
  assert.doesNotMatch(prompt, /ABSTRACT ESSAY/);
});

check("24 — Setting is preserved", () => {
  const prompt = composeTextToVideoProviderPrompt({
    visualEvent: "Baker slams tray",
    setting: "small bakery workshop at dawn",
    sceneCamera: "handheld medium",
    screenPolicy: "no_screen",
    motionPrompt: "Tray hits",
  });
  assert.match(prompt, /Setting: small bakery workshop at dawn/);
});

check("25 — camera is scene-specific", () => {
  const a = composeTextToVideoProviderPrompt({
    visualEvent: "Tray slam",
    sceneCamera: "handheld following the tray",
    screenPolicy: "no_screen",
  });
  const b = composeTextToVideoProviderPrompt({
    visualEvent: "Customer leans in",
    sceneCamera: "low angle on the customer's face",
    screenPolicy: "no_screen",
  });
  assert.match(a, /handheld following the tray/);
  assert.match(b, /low angle on the customer's face/);
  assert.doesNotMatch(b, /handheld following the tray/);
});

check("26 — global camera is not copied everywhere", () => {
  const prompt = composeTextToVideoProviderPrompt({
    visualEvent: "Face close-up",
    sceneCamera: "tight face close-up, no insert",
    screenPolicy: "no_screen",
    continuity: {
      camera_style: CANDIDATE_CAMERA,
    },
  });
  assert.doesNotMatch(prompt, /One insert shot of the phone screen/);
  assert.match(prompt, /tight face close-up/);
});

check("27 — legible screen + no readable text fails", () => {
  const raw = [
    "Action: Hiring manager stares at a phone.",
    `Motion: ${CANDIDATE_MOTION}`,
    `Camera: ${CANDIDATE_CAMERA}`,
    "No dialogue, lip-sync, subtitles, captions, logos, or readable on-screen text.",
  ].join(" ");
  assert.equal(providerPromptHasContradictoryTextRules(raw), true);
});

check("28 — generic UI creates a consistent prompt", () => {
  const prompt = composeTextToVideoProviderPrompt({
    visualEvent: "Unreadable phone chrome in a kitchen, no letters visible",
    motionPrompt: "Hand tilts the phone; UI stays blurry",
    sceneCamera: "over-shoulder",
    screenPolicy: "generic_unreadable_ui",
  });
  assert.match(prompt, /Generic unreadable UI chrome only/);
  assert.doesNotMatch(prompt, /remains legible/);
  assert.doesNotMatch(prompt, /clean, legible/);
  assert.equal(
    screenPolicyConflictsWithPrompt({
      policy: "generic_unreadable_ui",
      prompt,
    }),
    false,
  );
});

check("29 — prompt max 1000 UTF-16", () => {
  const prompt = composeTextToVideoProviderPrompt({
    visualEvent: "Event ".repeat(80),
    setting: "Setting ".repeat(40),
    motionPrompt: "Motion ".repeat(40),
    sceneCamera: "Camera ".repeat(40),
    screenPolicy: "no_screen",
  });
  assert.ok(utf16CodeUnits(prompt) <= T2V_GEN45_PROMPT_MAX_UTF16);
});

check("30 — fingerprint matches exact prompt", () => {
  const prompt = composeTextToVideoProviderPrompt({
    visualEvent: "Baker slams tray",
    sceneCamera: "handheld",
    screenPolicy: "no_screen",
  });
  assert.equal(fingerprintText(prompt), fingerprintText(prompt));
  assert.notEqual(fingerprintText(prompt + "x"), fingerprintText(prompt));
});

check("31 — Candidate real prompt phrases are regression fixtures", () => {
  assert.equal(parseT2vScreenPolicy("generic_unreadable_ui"), "generic_unreadable_ui");
  assert.ok(/phone screen remains legible/.test(CANDIDATE_MOTION));
  assert.ok(/clean, legible/.test(CANDIDATE_CAMERA));
  const stripped = composeTextToVideoProviderPrompt({
    visualEvent: "Hiring manager at a phone",
    motionPrompt: CANDIDATE_MOTION,
    sceneCamera: "tight face close-up",
    screenPolicy: "generic_unreadable_ui",
  });
  assert.equal(providerPromptHasContradictoryTextRules(stripped), false);
});

check("32 — technical details collapsed by default", () => {
  const ui = readFileSync(
    join(root, "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx"),
    "utf8",
  );
  assert.match(ui, /Technické detaily/);
  assert.match(ui, /<details className=\{styles\.diagnostics\}>/);
});

check("33 — prompt does not overflow", () => {
  const css = readFileSync(
    join(root, "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.module.css"),
    "utf8",
  );
  assert.match(css, /\.promptPre/);
  assert.match(css, /overflow-wrap: anywhere/);
});

check("34 — motion wraps instead of truncating", () => {
  const ui = readFileSync(
    join(root, "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx"),
    "utf8",
  );
  assert.match(ui, /Pohyb \/ změna/);
  assert.match(ui, /styles\.wrapText/);
  assert.doesNotMatch(ui, /slice\(0,\s*80\)/);
});

check("35 — healthy scene has no dominant rebuild", () => {
  const ui = readFileSync(
    join(root, "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx"),
    "utf8",
  );
  assert.match(ui, /overlay\?\.visualRebuildRequired \? \(/);
});

check("36 — operator sees content decisions", () => {
  const ui = readFileSync(
    join(root, "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx"),
    "utf8",
  );
  assert.match(ui, /Vytvořit úplně jiný návrh/);
  assert.match(ui, /Approve/);
  assert.match(ui, /Reject/);
  assert.match(ui, /Myšlenka:/);
});

check("37 — Approve rejects repetition, meaning drift, technical conflict", () => {
  const gate = readFileSync(join(root, "lib/content-package/textToVideoPlanApprovalGate.ts"), "utf8");
  assert.match(gate, /T2V_CANONICAL_CREATIVE_MISSING/);
  assert.match(gate, /T2V_MEANING_REVIEW_REQUIRED/);
  assert.match(gate, /T2V_SCREEN_POLICY_CONFLICT/);
  assert.match(gate, /T2V_PROVIDER_PROMPT_TEXT_CONFLICT/);
  assert.match(gate, /T2V_CREATIVE_MEMORY_REPEAT/);
  const memory = memoryFromTopics([TAB], [{ rejected: true, status: "cancelled" }]);
  const issues = evaluatePackageBriefOriginality({
    brief: {
      hook: CANDIDATE,
      visual_scenes: [
        { image_prompt: "Thumb pauses on a silent company profile on a phone; empty feed" },
      ],
      t2v_canonical_creative: {
        contract_version: 1,
        core_idea: CANDIDATE,
        primary_emotion: "quiet concern",
        conflict: "The profile does not match the promise",
        surprise: "The last post is months old",
        beginning_to_end_change: "Doubt",
        payoff: "Post proof",
      },
      presentation_generation: {
        selected_pain_point: PAINS[0],
      },
    },
    memory,
  });
  assert.ok(issues.some((issue) => issue.reason === "same_scenario_family"));
});

check("38–43 source: still path unchanged; T2V skips Opening Impact LLM", () => {
  const pipeline = readFileSync(join(root, "lib/content-pipeline/runCreativePipeline.ts"), "utf8");
  assert.match(pipeline, /const conceptResult = await runVideoConcept/);
  assert.match(pipeline, /if \(t2v\) \{/);
  assert.equal(TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION, 3);
  assert.equal(T2V_CANONICAL_CREATIVE_CONTRACT_VERSION, 1);
});

check("phone/laptop/profile/feed is one visual family", () => {
  assert.equal(classifyVisualMotif("phone laptop feed profile"), "phone_laptop_profile_feed");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
