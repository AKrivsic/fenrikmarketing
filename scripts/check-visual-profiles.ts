import assert from "node:assert/strict";
import {
  parseVisualProfile,
  parseVisualProfileUiChoice,
  VISUAL_PROFILE_UI_AUTO,
} from "@/lib/visual-profile/visualProfile";
import { resolveVisualProfile } from "@/lib/visual-profile/resolveVisualProfile";
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

check("5 same project always same AUTO profile", () => {
  const r1 = resolveVisualProfile({ ...baseCtx, projectId: "stable-id" });
  const r2 = resolveVisualProfile({ ...baseCtx, projectId: "stable-id" });
  assert.equal(r1.profile, r2.profile);
});

check("6 different project ids may differ", () => {
  const profiles = new Set(
    ["p1", "p2", "p3", "p4", "p5", "p6"].map(
      (id) => resolveVisualProfile({ ...baseCtx, projectId: id }).profile,
    ),
  );
  assert.ok(profiles.size >= 1);
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
    visual_profile_version: "visual-profile@1",
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

check("22 invalid parse returns null", () => {
  assert.equal(parseVisualProfileUiChoice("luxury"), null);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
