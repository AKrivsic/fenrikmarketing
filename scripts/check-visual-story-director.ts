// Visual Story Director v1 — situation-first decision checks.
//   npm run check:visual-story-director

import assert from "node:assert/strict";
import type { Project } from "@/lib/supabase/types";
import { runOriginalityPass } from "@/lib/attention/originalityPass";
import { productVisualWorldHints } from "@/lib/visual-narrative/productVisualWorld";
import { resolveVisualNarrative } from "@/lib/visual-narrative/resolveVisualNarrative";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import {
  VISUAL_STORY_DIRECTOR_VERSION,
  evaluateVisualStoryConcept,
  runVisualDirectorPass,
  situationFirstFraming,
} from "@/lib/visual-narrative/visualStoryDirector";
import {
  VISUAL_STORY_DIRECTOR_PROMPT_HEADER,
  buildVisualNarrativePromptBlock,
} from "@/lib/visual-narrative/promptBlocks";
import { planVisualNarrativeForPackage } from "@/lib/visual-narrative/planForPackage";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

const emptySeries: SeriesCreativeContext = {
  fingerprints: [],
  typedCtaInCurrentRun: 0,
  typedCtaInWeeklyStrategy: 0,
  recentCtaCompositionIds: [],
  recentHooks: [],
  recentCreativeModes: [],
  recentCreativeIdentityKeys: [],
  recentVisualNarrativeKeys: [],
};

const chatbotProject = {
  id: "proj-vsd-chatbot",
  name: "Fenrik.chat",
  type: "saas",
  language: "en",
  market_scope: "global",
  goal_type: "lead_generation",
  target_audience: { segments: ["Website owners", "SMB founders"] },
  product_is: [
    "AI website chatbot that answers visitors 24/7",
    "embed script for website",
  ],
  product_is_not: [],
  product_strengths: ["Answers visitors after hours"],
  pain_points: [
    "Website visitors leave unanswered",
    "Same questions every day",
  ],
  forbidden_claims: [],
  tone_of_voice: { notes: ["Direct"] },
  platforms: [],
  publishing_rules: {},
  default_cta: null,
} as unknown as Project;

console.log("\nclassifyMetaphor / evaluateVisualStoryConcept");

check("paper boat style abstractions are rejected", () => {
  const ev = evaluateVisualStoryConcept({
    visual: "A tiny paper boat floating away representing a visitor leaving",
    spokenIdea: "visitors leave unanswered",
  });
  assert.equal(ev.accepted, false);
  assert.equal(ev.metaphor_class, "requires_prompt_explanation");
  assert.ok(ev.reject_reasons.length > 0);
});

check("closed notebook as website knowledge is rejected", () => {
  const ev = evaluateVisualStoryConcept({
    visual: "A closed notebook representing website knowledge unused",
    spokenIdea: "the website knows the answers",
  });
  assert.equal(ev.accepted, false);
  assert.ok(
    ev.metaphor_class === "requires_prompt_explanation" ||
      ev.reject_reasons.some((r) => r.includes("abstract") || r.includes("prompt")),
  );
});

check("abstract card / embed code riddle is rejected", () => {
  const ev = evaluateVisualStoryConcept({
    visual: "An abstract card glowing on a maker workbench representing embed code",
    spokenIdea: "add a chatbot",
  });
  assert.equal(ev.accepted, false);
});

check("understandable metaphors remain allowed", () => {
  const ev = evaluateVisualStoryConcept({
    visual: "An empty restaurant after guests walked out unanswered",
    spokenIdea: "visitors leave",
  });
  assert.equal(ev.accepted, true);
  assert.ok(
    ev.metaphor_class === "situation" ||
      ev.metaphor_class === "immediately_understandable" ||
      ev.metaphor_class === "one_mental_step",
  );
});

check("graveyard-style metaphors remain allowed", () => {
  const ev = evaluateVisualStoryConcept({
    visual: "A quiet cemetery of unmarked posts — forgotten brands for this industry",
    spokenIdea: "forgotten content",
  });
  assert.equal(ev.accepted, true);
  assert.ok(
    ev.metaphor_class === "immediately_understandable" ||
      ev.metaphor_class === "situation" ||
      ev.metaphor_class === "one_mental_step",
  );
});

check("robot automation remains allowed", () => {
  const ev = evaluateVisualStoryConcept({
    visual:
      "A small robot calmly finishing tasks while the human owner walks out with a drink",
    spokenIdea: "automation saves time",
  });
  assert.equal(ev.accepted, true);
});

check("family vs work dilemma remains allowed", () => {
  const ev = evaluateVisualStoryConcept({
    visual:
      "Split frame: one side a family dinner going cold, the other side unread work drafts",
    spokenIdea: "choose family or work",
  });
  assert.equal(ev.accepted, true);
});

check("banana / absurd but understandable remains allowed", () => {
  const ev = evaluateVisualStoryConcept({
    visual:
      "Someone photographing a banana on a kitchen counter for an Instagram post",
    spokenIdea: "no better content idea",
  });
  assert.equal(ev.accepted, true);
});

check("customer walking away remains allowed", () => {
  const ev = evaluateVisualStoryConcept({
    visual: "A customer walking away from a silent doorway after waiting too long",
    spokenIdea: "visitor leaves",
  });
  assert.equal(ev.accepted, true);
});

check("chatbot does NOT automatically become dashboard", () => {
  const forced = evaluateVisualStoryConcept({
    visual: "A chatbot dashboard admin panel showing charts",
    spokenIdea: "website chatbot",
  });
  assert.equal(forced.accepted, false);
  assert.ok(forced.reject_reasons.some((r) => r.startsWith("forced_scenery")));

  const hints = productVisualWorldHints(chatbotProject).join(" ");
  assert.doesNotMatch(hints, /\bdashboard\b/i);
  assert.match(hints, /NOT automatic storefronts|NOT dashboards/i);
});

check("chatbot does NOT automatically become storefront", () => {
  const forced = evaluateVisualStoryConcept({
    visual: "A physical storefront representing a website chatbot",
    spokenIdea: "website chatbot",
  });
  assert.equal(forced.accepted, false);

  const hints = productVisualWorldHints(chatbotProject).join(" ");
  assert.doesNotMatch(hints, /force.*storefront|physical store as default/i);
  assert.match(hints, /NOT automatic storefronts/i);

  let placePrimary = 0;
  for (let i = 0; i < 20; i++) {
    const plan = resolveVisualNarrative({
      project: chatbotProject,
      identity: null,
      seed: `chatbot-place-${i}`,
      series: emptySeries,
      funnelStage: "awareness",
      topic: "unanswered website visitors",
      angle: "they leave without a reply",
    });
    if (plan.primary_meaning_carrier === "place") placePrimary++;
  }
  assert.ok(
    placePrimary <= 8,
    `chatbot should not drift to place/storefront carriers; got place ${placePrimary}/20`,
  );
});

check("originality does not become randomness", () => {
  const ev = evaluateVisualStoryConcept({
    visual: "A floating glowing cube orb symbol with no human context",
    spokenIdea: "automation",
  });
  assert.equal(ev.accepted, false);
  assert.ok(
    ev.reject_reasons.some(
      (r) =>
        r.includes("abstract") ||
        r.includes("prompt") ||
        r.includes("originality") ||
        r.includes("symbolism"),
    ),
  );
});

check("originality does not collapse back into office clichés", () => {
  const desk = evaluateVisualStoryConcept({
    visual: "A modern office desk with laptop and coffee illustrating the angle",
    spokenIdea: "content pain",
  });
  assert.equal(desk.accepted, false);
  assert.equal(desk.metaphor_class, "office_cliche");

  const pass = runOriginalityPass({
    mechanism: "DILEMMA",
    topic: "content vs life",
    angle: "family or posting",
    painPoints: ["always posting"],
    productIs: ["AI chatbot"],
    seed: "vsd-dilemma-1",
  });
  assert.notEqual(pass.selected_candidate_id, "obvious");
  assert.doesNotMatch(pass.selected_visual_concept, /laptop and coffee|modern office desk/i);
  assert.match(
    pass.selected_visual_concept,
    /family|dinner|suitcase|school|parent|robot|banana|cemetery|walk/i,
  );
});

console.log("\nVisual Director pass + narrative wiring");

check("runVisualDirectorPass rejects riddles and keeps situations", () => {
  const result = runVisualDirectorPass(
    [
      {
        id: "boat",
        visual_concept: "paper boat representing a visitor leaving",
      },
      {
        id: "walk",
        visual_concept: "a visitor walking away after waiting for an answer",
      },
      {
        id: "robot",
        visual_concept: "robot working while the owner leaves with a drink",
      },
    ],
    { spokenIdea: "visitors leave unanswered", topic: "chatbot" },
  );
  assert.ok(result.rejectedIds.includes("boat"));
  assert.ok(result.acceptedIds.includes("walk"));
  assert.ok(result.acceptedIds.includes("robot"));
});

check("situationFirstFraming prefers human events for leave/unanswered", () => {
  const framing = situationFirstFraming({
    topic: "website visitors leave unanswered",
    angle: "silent site",
    painPoints: ["no one answered"],
    productIs: ["AI website chatbot"],
  });
  assert.match(framing, /walking away|waiting for a reply/i);
  assert.match(framing, /NOT a paper boat/i);
});

check("plan includes director fields and prompt block", () => {
  const planned = planVisualNarrativeForPackage({
    project: chatbotProject,
    identity: null,
    projectId: chatbotProject.id,
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "visitors leave unanswered",
    angle: "after hours silence",
    series: emptySeries,
    funnelStage: "awareness",
    requireVideo: true,
  });
  assert.ok(planned.plan);
  assert.equal(planned.plan!.storytelling_mode, "situation_first");
  assert.equal(planned.plan!.director_version, VISUAL_STORY_DIRECTOR_VERSION);
  assert.equal(planned.plan!.reject_abstract_riddles, true);
  assert.equal(planned.plan!.metaphor_policy, "understandable_preferred");
  assert.ok(planned.plan!.preferred_situation_framing.length > 20);

  const block = buildVisualNarrativePromptBlock(planned.plan!);
  assert.ok(block.includes(VISUAL_STORY_DIRECTOR_PROMPT_HEADER));
  assert.ok(block.includes("FILM DIRECTOR"));
  assert.ok(block.includes("paper boat"));
  assert.ok(block.includes("situation_first"));
});

check("chatbot human carrier bias over object symbols", () => {
  let human = 0;
  let object = 0;
  for (let i = 0; i < 24; i++) {
    const plan = resolveVisualNarrative({
      project: chatbotProject,
      identity: null,
      seed: `bias-${i}`,
      series: emptySeries,
      funnelStage: "awareness",
      topic: "unanswered visitors",
      angle: "they leave",
    });
    if (plan.primary_meaning_carrier === "human") human++;
    if (plan.primary_meaning_carrier === "object") object++;
  }
  assert.ok(human >= 8, `expected human bias, got human=${human}/24`);
  assert.ok(object <= 6, `expected object demotion, got object=${object}/24`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
