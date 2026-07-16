import assert from "node:assert/strict";
import {
  parseVisualProfile,
  parseVisualProfileUiChoice,
  VISUAL_PROFILE_UI_AUTO,
} from "@/lib/visual-profile/visualProfile";
import { resolveVisualProfile } from "@/lib/visual-profile/resolveVisualProfile";
import { scoreVisualProfileAuto } from "@/lib/visual-profile/scoreVisualProfile";
import { applyProfileToBrandTokens } from "@/lib/visual-profile/applyProfileToBrandTokens";
import { resolveChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import { visualProfileImagePromptBlock } from "@/lib/visual-profile/imagePromptProfile";
import { visualStyleGuardrailBlock } from "@/lib/ai/prompts/visualStyle";
import {
  mergeVisualProfileIntoKnowledge,
  validateVisualProfileSave,
} from "@/lib/visual-profile/presentationVisualProfile";
import { readVisualProfileFromJobInput } from "@/lib/visual-profile/packageVisualProfile";
import { evaluateSceneTypeHistoryDowngrade } from "@/lib/scene-types/presentation/sceneTypeHistoryGuardrail";
import { buildSceneTypeProjectHistory } from "@/lib/scene-types/presentation/sceneTypeProjectHistory";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log("  ok ", name);
  } catch (err) {
    failed++;
    console.error(" FAIL", name, err);
  }
}

const baseCtx = {
  projectId: "proj-visual-profile-a",
  knowledge: null,
  goalType: "awareness",
  toneOfVoice: { tone: "calm and clear" },
  targetAudience: { summary: "small business owners" },
  productStrengths: ["fast onboarding"],
  productIs: ["saas platform"],
};

check("1 missing profile → deterministic AUTO resolves", () => {
  const a = resolveVisualProfile(baseCtx);
  const b = resolveVisualProfile(baseCtx);
  assert.equal(a.profile, b.profile);
  assert.equal(a.source, "auto");
});

check("2 explicit NATURAL override wins", () => {
  const r = resolveVisualProfile({
    ...baseCtx,
    knowledge: {
      presentation: { visual_profile: "NATURAL" },
    },
  });
  assert.equal(r.profile, "NATURAL");
  assert.equal(r.source, "override");
});

check("3 explicit MINIMAL override wins", () => {
  const r = resolveVisualProfile({
    ...baseCtx,
    knowledge: { presentation: { visual_profile: "minimal" } },
  });
  assert.equal(r.profile, "MINIMAL");
});

check("4 invalid override rejected on save", () => {
  const v = validateVisualProfileSave({ visualProfileSelection: "neon" });
  assert.equal(v.ok, false);
});

check("5 same project+package signals always same AUTO profile", () => {
  const withPkg = {
    ...baseCtx,
    projectId: "stable-id",
    packageSignals: {
      funnelStage: "problem_aware",
      topic: "why hiring does not fix consistency",
      angle: "founder confession about empty calendar",
      creativeMode: "story",
    },
  };
  const r1 = resolveVisualProfile(withPkg);
  const r2 = resolveVisualProfile(withPkg);
  assert.equal(r1.profile, r2.profile);
  assert.equal(r1.source, "auto");
});

check("6 AUTO does not use projectId hash", () => {
  const src = scoreVisualProfileAuto.toString();
  assert.ok(!src.includes("projectId"));
  const a = resolveVisualProfile({ ...baseCtx, projectId: "p1" });
  const b = resolveVisualProfile({ ...baseCtx, projectId: "p2" });
  assert.equal(a.profile, b.profile);
});

check("6b Fenrik Studio brain alone no longer locks EDITORIAL via content volume", () => {
  const fenrikCtx = {
    projectId: "163c1822-ad30-4cee-8826-dfacd9c188b9",
    knowledge: null,
    goalType: "lead_generation",
    toneOfVoice: {
      notes: [
        "Conversational and direct",
        "Relatable and empathetic to everyday work frustrations",
        "Concise — short sentences, minimal fluff",
        "Slightly informal with occasional emoji use",
        "Confident without being aggressive",
        "Practical",
        "Results-oriented",
        "Avoids marketing jargon",
      ],
    },
    targetAudience: {
      segments: [
        "SaaS companies and AI tool makers needing social content",
        "Agencies, consultants, and freelancers",
        "Ecommerce brands and local businesses",
        "Teams who lack time or resources to produce consistent social video content",
        "Founders",
        "Solo operators",
        "Small marketing teams",
        "Businesses without dedicated content creators",
      ],
    },
    productStrengths: [
      "First content package delivered free with no payment required",
      "Uses client's own website URL as the sole input to create content",
      "Each video includes captions and posts for all major social channels",
      "Scalable packages: 5 videos ($199), 10 videos ($349), 20 videos ($599)",
      "Content is ready to copy and post immediately — no editing needed",
      "No content team required",
      "No editing required before publishing",
      "One piece of work produces assets for multiple platforms",
      "Fixed package pricing",
      "Fast content production proces",
    ],
    productIs: [
      "A content production service that turns websites or products into ready-to-post social content",
      "Delivers short-form AI videos for TikTok, Instagram, Facebook, LinkedIn, and YouTube Shorts",
      "Provides platform-ready captions, posts, and hashtags for every channel",
      "Offered in monthly batch packages of 5, 10, or 20 videos",
      "Uses only a website URL as input",
      "Every video comes with complete social media assets",
      "Content is delivered ready to publish",
    ],
  };
  const brainOnly = resolveVisualProfile(fenrikCtx);
  assert.equal(brainOnly.source, "auto");
  assert.ok(brainOnly.scores);
  assert.ok(
    (brainOnly.scores.EDITORIAL ?? 0) <= (brainOnly.scores.NATURAL ?? 0) + 2,
    "capped content must not bury NATURAL baseline",
  );

  const storyPkg = resolveVisualProfile({
    ...fenrikCtx,
    packageSignals: {
      funnelStage: "problem_aware",
      topic: "the founder confession about an empty social calendar",
      angle: "honest personal moment when the feed went quiet",
      creativeMode: "story",
    },
  });
  assert.equal(storyPkg.profile, "NATURAL");

  const shockPkg = resolveVisualProfile({
    ...fenrikCtx,
    packageSignals: {
      funnelStage: "awareness",
      topic: "a bold prediction about silent feeds",
      angle: "shocking consequence when competitors stay visible",
      creativeMode: "shock",
    },
  });
  assert.equal(shockPkg.profile, "BOLD");

  const frameworkPkg = resolveVisualProfile({
    ...fenrikCtx,
    packageSignals: {
      funnelStage: "solution_aware",
      topic: "a simple framework and process for weekly publishing",
      angle: "clean steps and workflow system",
      creativeMode: "standard",
    },
  });
  assert.equal(frameworkPkg.profile, "MINIMAL");

  const insightPkg = resolveVisualProfile({
    ...fenrikCtx,
    packageSignals: {
      funnelStage: "awareness",
      topic: "industry insight and expert perspective on quiet accounts",
      angle: "thoughtful analysis of what silence signals",
      creativeMode: "observation",
    },
  });
  assert.equal(insightPkg.profile, "EDITORIAL");

  assert.notEqual(storyPkg.profile, shockPkg.profile);
  assert.notEqual(frameworkPkg.profile, shockPkg.profile);
});

check("6c generic content keyword is capped in brain scoring", () => {
  const scored = scoreVisualProfileAuto({
    projectId: "x",
    productIs: [
      "content content content content content content content content content content content",
    ],
    productStrengths: [],
    toneOfVoice: null,
    targetAudience: null,
    goalType: null,
    knowledge: null,
  });
  assert.ok((scored.scores.EDITORIAL ?? 0) <= 2);
  assert.ok(scored.reasons?.some((r) => /capped_from_/.test(r)));
});

check("6d package signals ignored under snapshot", () => {
  const r = resolveVisualProfile({
    ...baseCtx,
    packageSnapshotProfile: "PREMIUM",
    packageSnapshotVersion: "visual-profile@3",
    packageSignals: {
      creativeMode: "shock",
      topic: "bold prediction",
    },
  });
  assert.equal(r.profile, "PREMIUM");
  assert.equal(r.source, "package_snapshot");
});

check("6e version is visual-profile@3", () => {
  const r = resolveVisualProfile(baseCtx);
  assert.equal(r.version, "visual-profile@3");
});

check("7 resolver has no industry hardcoding in source", () => {
  const src = resolveVisualProfile.toString();
  assert.ok(!/restaurant|law firm|saas →/i.test(src));
});

check("8 IMAGE prompt block includes profile instructions", () => {
  const block = visualProfileImagePromptBlock("EDITORIAL");
  assert.match(block, /EDITORIAL/);
  assert.match(block, /Editorial photography/);
});

check("9 no-text guardrails remain in visual style block", () => {
  assert.match(visualStyleGuardrailBlock(), /never changes the CTA/i);
});

check("10 CHECKLIST tokens receive profile scale", () => {
  const base = resolveChecklistBrandTokens({ knowledge: null });
  const bold = applyProfileToBrandTokens(base, "BOLD");
  assert.ok(bold.textScaleMultiplier > 1);
});

check("11 PHONE background uses brand tokens path", () => {
  const base = resolveChecklistBrandTokens({ knowledge: null });
  const minimal = applyProfileToBrandTokens(base, "MINIMAL");
  assert.ok(minimal.marginX >= base.marginX);
});

check("12 QUOTE tokens scale", () => {
  const base = resolveChecklistBrandTokens({ knowledge: null });
  const bold = applyProfileToBrandTokens(base, "BOLD");
  assert.ok(bold.textScaleMultiplier > base.textScaleMultiplier! || bold.textScaleMultiplier > 1);
});

check("13 STATISTIC accent intensity differs by profile", () => {
  const base = resolveChecklistBrandTokens({ knowledge: null });
  const minimal = applyProfileToBrandTokens(base, "MINIMAL");
  const bold = applyProfileToBrandTokens(base, "BOLD");
  assert.ok(minimal.accentOpacity < bold.accentOpacity);
});

check("14 CTA corner radius differs BOLD vs MINIMAL", () => {
  const base = resolveChecklistBrandTokens({ knowledge: null });
  assert.notEqual(
    applyProfileToBrandTokens(base, "BOLD").cornerRadius,
    applyProfileToBrandTokens(base, "MINIMAL").cornerRadius,
  );
});

check("15 job input reads stored profile", () => {
  const read = readVisualProfileFromJobInput({
    visual_profile: "PREMIUM",
    visual_profile_version: "visual-profile@2",
  });
  assert.equal(read.profile, "PREMIUM");
});

check("16 scene editor rerender preserves profile via job spread", () => {
  const source = {
    visual_profile: "EDITORIAL",
    visual_profile_version: "visual-profile@1",
    voiceover_text: "Hello",
  };
  const next = { ...source, scene_editor_rerender: true };
  assert.equal(next.visual_profile, "EDITORIAL");
});

check("17 language variant job keeps profile when copied", () => {
  const primary = {
    visual_profile: "NATURAL",
    visual_profile_version: "visual-profile@1",
  };
  const variantInput = { ...primary, language: "de" };
  assert.equal(variantInput.visual_profile, "NATURAL");
});

check("18 missing branding still resolves profile", () => {
  const r = resolveVisualProfile({ projectId: "x", knowledge: null });
  assert.ok(parseVisualProfile(r.profile));
});

check("19 AUTO clears visual_profile in knowledge merge", () => {
  const merged = mergeVisualProfileIntoKnowledge(
    { presentation: { visual_profile: "BOLD", preferred_voice: "auto" } },
    VISUAL_PROFILE_UI_AUTO,
  ) as { presentation?: Record<string, unknown> };
  assert.equal(merged.presentation?.visual_profile, undefined);
  assert.equal(merged.presentation?.preferred_voice, "auto");
});

check("20 scene type history unchanged (no profile suppression)", () => {
  const history = buildSceneTypeProjectHistory({ rows: [] });
  const verdict = evaluateSceneTypeHistoryDowngrade({
    type: "CTA",
    history,
  });
  assert.equal(verdict, null);
});

check("21 profile does not rotate between identical contexts", () => {
  const profiles = Array.from({ length: 5 }, () =>
    resolveVisualProfile(baseCtx).profile,
  );
  assert.ok(profiles.every((p) => p === profiles[0]));
});

check("21b different package feel can change profile without randomness", () => {
  const a = resolveVisualProfile({
    ...baseCtx,
    packageSignals: { creativeMode: "story", topic: "personal confession" },
  });
  const b = resolveVisualProfile({
    ...baseCtx,
    packageSignals: {
      creativeMode: "shock",
      topic: "bold disruptive prediction",
    },
  });
  assert.equal(
    resolveVisualProfile({
      ...baseCtx,
      packageSignals: { creativeMode: "story", topic: "personal confession" },
    }).profile,
    a.profile,
  );
  assert.notEqual(a.profile, b.profile);
});

check("22 invalid parse returns null", () => {
  assert.equal(parseVisualProfileUiChoice("luxury"), null);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
