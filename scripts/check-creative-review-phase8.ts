/**
 * Phase 8 — Creative Review is the only narrative source after Continue.
 *
 * Verifies rebuild for package 910da853-4f62-4cad-ab00-071c3a73af45
 * (forensic fixture from the Manual Review data-flow audit).
 *
 * Run: npx tsx scripts/check-creative-review-phase8.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import {
  composeRebuiltImagePrompt,
  rebuildCreativePackageForVideo,
} from "../lib/creative-review/rebuildCreativePackage";
import { seedCreativeReviewFromPackage } from "../lib/creative-review/seed";
import {
  commitCreativeReviewApprove,
  commitCreativeReviewSave,
  commitCreativeReviewTranslate,
} from "../lib/creative-review/mutations";
import type { CreativeReview } from "../lib/creative-review/types";
import type {
  OpeningImpact,
  VideoConcept,
  VisualIdentity,
} from "../lib/content-pipeline/types";

const root = join(import.meta.dirname, "..");
const ACTOR = { type: "user" as const, id: "editor" };
const TS = "2026-08-13T00:00:00.000Z";
const PACKAGE_ID = "910da853-4f62-4cad-ab00-071c3a73af45";

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`  ✓ ${name}`))
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      throw err;
    });
}

const FINAL_APPROVED = `Čas. To je něco, co už nikdy nevrátíme zpátky.
Co si vyberete?
Pivo s kamarádem, nebo řešit s kolegou do půlnoci, co dát na Instagram, a stejně nic nevymyslet?
Příjemný večer s partnerkou pod dekou, nebo další brainstorming v kanceláři, kde už všechny mozky dávno vyhořely?
Hrát si s dítětem, nebo poslouchat další návrhy obsahu od kolegů, kteří už stejně nic nového nevymyslí?
Čas je mnohem cennější než peníze.
Nemarněte ho na něco, co může udělat někdo jiný.`;

const ORIGINAL_HOOK =
  "The belief that handling content in-house saves time is a myth.";

const OPENING_IMPACT: OpeningImpact = {
  first_image:
    "A clean spreadsheet on a monitor, displaying two columns: 'ACTIVITY' and 'TIME SPENT'. The first row populates with 'Planning call for content strategy' and the time '40 minutes' appears next to it, followed by a slow scroll revealing more entries.",
  first_spoken_sentence: ORIGINAL_HOOK,
  emotion:
    "Quietly revealing, as if sharing a hidden truth that challenges a common assumption.",
  pacing:
    "Deliberate and steady, allowing each line item to appear with a slight pause, emphasizing the growing tally of hours.",
  attention_pattern:
    "The viewer is drawn in by the contrast between the confident statement and the unfolding reality of time spent, creating a need to understand the full picture.",
};

const VISUAL_IDENTITY: VisualIdentity = {
  art_direction:
    "Screen-native audit aesthetic. The primary visual surface is a shared document or spreadsheet — clean rows, two columns: ACTIVITY and TIME SPENT. Each line item populates in sequence as the narration moves through the quarter. No decorative graphics. The document looks like something a real team would actually open on a Monday morning. A secondary surface — a content calendar or task board — appears briefly to show the content row that never moved. The final beat shows two numbers side by side in large, plain type: total hours spent, total posts published. No annotation needed.",
  lighting:
    "Flat, neutral screen glow — the kind of ambient light that comes from a monitor in a moderately lit room during working hours. No dramatic shadows, no cinematic contrast. The light source is the document itself.",
  palette:
    "Off-white document background, dark charcoal text, a single accent colour (muted amber or slate blue) used only for the running hour tally as it grows. The final two-number reveal uses no colour — black on white, maximum legibility.",
  environment:
    "The environment is the document surface. No physical room is the hero. If a hand or desk edge appears at the edge of frame, it is incidental — the focus stays on the screen. The world is the audit, not the office.",
  camera_style:
    "Screen-capture style with slow, deliberate scrolling as each line item populates. No cuts between physical locations. Occasional tight push-in on the running tally as the number grows. The final two-number reveal holds for two full seconds before the CTA.",
  character_style: "none",
  opening_emotion: OPENING_IMPACT.emotion,
  opening_first_image: OPENING_IMPACT.first_image,
};

const VIDEO_CONCEPT: VideoConcept = {
  title: "The In-House Quarter",
  core_idea:
    "The myth being corrected: deciding to handle content in-house is a time-saving move. The reality, exposed through a first-person team retrospective, is that 'we'll do it ourselves this quarter' is one of the most expensive decisions a small marketing team can make — not because the intention is wrong, but because the hours are never counted until it is too late. The reveal is arithmetic: a two-person quarter.",
  narrative_arc:
    "MYTH (hook): Open on the confident statement that feels responsible and strategic — 'We'll handle content in-house this quarter.' State it plainly, as a belief the viewer has held or heard. It sounds like ownership. It sounds like savings.",
  emotional_tone:
    "Quietly revelatory — the energy of someone who has done the audit and is letting you see the ledger.",
  audience_insight:
    "Small marketing teams and solo operators almost never track the hours they spend on content production — they track output (posts live) but not input (hours consumed).",
  product_role: "hero workflow",
  why_it_works:
    "The Myth Buster logic is load-bearing here: the myth ('in-house is the efficient choice') is genuinely held, genuinely feels true at the moment of the decision, and genuinely collapses under arithmetic that most teams have never run.",
  visual_direction: {
    art_direction: VISUAL_IDENTITY.art_direction,
    lighting: VISUAL_IDENTITY.lighting,
    palette: VISUAL_IDENTITY.palette,
    environment: VISUAL_IDENTITY.environment,
    camera_style: VISUAL_IDENTITY.camera_style,
    character_style: VISUAL_IDENTITY.character_style,
  },
};

const SCENE_ENGLISH = [
  "Death in a black cloak stands against a dark background, holding a large scythe, but instead of looking at a person, it gazes at a large wristwatch on its bony hand as if checking the time. The mood is dramatic yet gently ironic, with the focus on the watch and the theme of time.",
  "The same founder appears in two contrasting halves of the image: relaxed and laughing with a friend over beers at a cozy pub, and late at night in the office, exhausted and stuck trying to come up with social media content with a colleague.",
  "The image is split diagonally into two contrasting worlds: above, the same founder sits exhausted in a boardroom surrounded by tired colleagues, empty coffee cups, and a whiteboard full of crossed-out ideas going nowhere; below, a couple rests peacefully in a cozy bedroom, their feet visible beneath the covers in the warm, gentle glow of a bedside lamp.",
  "A founder experiences two contrasting moments: fully present and joyful while playing with his child at a playground, versus visibly disengaged and bored during an office meeting where a colleague eagerly pitches a new content idea.",
  "The same founder leaves the office with a smile, his desk bare except for a closed laptop and a coffee mug, slinging his bag over his shoulder as he heads home. The mood conveys a sense of relief and quiet closure — the work is done, and it's time to live his life.",
];

const SCENE_INTENTS = [
  "Smrtka v černém plášti stojí na tmavém pozadí a drží velkou kosu. Místo toho, aby se dívala na člověka, dívá se na velké náramkové hodinky na své kostnaté ruce, jako by kontrolovala čas. Atmosféra je dramatická, ale lehce ironická. Důraz je na hodinky a motiv času.",
  "Obraz je diagonálně rozdělen na dvě poloviny.\nV horní části sedí stejný zakladatel jako v dalších scénách v útulné hospodě s kamarádem. Oba se smějí, připíjejí si pivem a očividně si užívají společný večer.\nVe spodní části sedí tentýž zakladatel pozdě večer v kanceláři u pracovního stolu s kolegou. Na stole leží notebook, hrnky od kávy a poznámky. Oba vypadají unaveně a bezradně, snaží se vymyslet obsah na sociální sítě, ale nikam se neposouvají.\nStejný člověk musí být zobrazen v obou částech obrazu.",
  "Obraz je opět diagonálně rozdělen.\nV horní části sedí stejný zakladatel v zasedací místnosti. Kolem stolu sedí několik unavených kolegů. Na stole jsou prázdné hrnky od kávy, papíry a tabule plná přeškrtnutých nápadů. Všichni vypadají vyčerpaně a brainstorming očividně nikam nevede.\nVe spodní části je útulná ložnice. Pod dekou leží muž a žena, jsou vidět pouze jejich chodidla. V místnosti svítí teplé světlo lampičky a atmosféra působí klidně a příjemně.",
  "Obraz je rozdělen přesně na dvě poloviny.\nV horní části si stejný zakladatel hraje se svým dítětem na dětském hřišti. Oba se smějí, mají radost a věnují si plnou pozornost.\nVe spodní části sedí tentýž zakladatel znuděně u kancelářského stolu. Kolega vedle něj nadšeně gestikuluje a vysvětluje další nápad na obsah. Zakladatel se dívá jinam a působí otráveně, jako by věděl, že tato porada nikam nepovede.\nStejný člověk musí být použit v obou částech obrazu.",
  "Stejný zakladatel odchází s úsměvem z kanceláře. Na stole zůstal pouze zavřený notebook a hrnek s kávou. Stůl je čistý, nikde nejsou žádné papíry ani nepořádek. Zakladatel si přehazuje tašku přes rameno a odchází domů. Atmosféra vyjadřuje úlevu, klid a pocit, že práce skončila a je čas žít svůj život.",
];

function approveWithEdits(review: CreativeReview): CreativeReview {
  const saved = commitCreativeReviewSave({
    current: review,
    expectedVersion: review.version,
    edits: {
      voiceoverLocalizedEdit: FINAL_APPROVED,
      scenes: review.scenes.map((scene, index) => ({
        id: scene.id,
        intentLocalizedEdit: SCENE_INTENTS[index] ?? scene.intent.localized_edit,
        directorNotes: scene.director_notes,
      })),
    },
    actor: ACTOR,
    timestamp: "2026-08-12T12:37:17.294Z",
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) throw new Error("save");
  const voiceover = {
    ...saved.review.voiceover,
    english_preview:
      "Time. It's something we can never get back. What will you choose?",
    english_preview_outdated: false,
  };
  const scenes = saved.review.scenes.map((scene, index) => ({
    ...scene,
    intent: {
      ...scene.intent,
      english_preview: SCENE_ENGLISH[index] ?? scene.intent.localized_edit,
      english_preview_outdated: false,
    },
  }));
  const translated = commitCreativeReviewTranslate({
    current: saved.review,
    expectedVersion: saved.review.version,
    voiceover,
    scenes,
    actor: ACTOR,
    timestamp: "2026-08-12T12:37:36.389Z",
  });
  assert.equal(translated.ok, true);
  if (!translated.ok) throw new Error("translate");
  const approved = commitCreativeReviewApprove({
    current: translated.review,
    expectedVersion: translated.review.version,
    actor: ACTOR,
    timestamp: "2026-08-12T12:39:53.503Z",
  });
  assert.equal(approved.ok, true);
  if (!approved.ok) throw new Error("approve");
  return approved.review;
}

function fixturePackage(): ContentPackageOutput {
  const prompts = SCENE_INTENTS.map((_, i) => `Original AI still ${i + 1}`);
  return {
    title: "The In-House Quarter",
    funnel_stage: "Awareness",
    hook: ORIGINAL_HOOK,
    voiceover_text:
      "The belief that handling content in-house saves time is a myth. Here is what the ledger actually shows.",
    subtitles:
      "The belief that handling content in-house saves time is a myth. Here is what the ledger actually shows.",
    cta: { type: "learn_more", text: "Learn more" },
    video: { concept: VIDEO_CONCEPT.core_idea, script: "Script" },
    platform_outputs: {
      tiktok: { caption: "tt" },
      instagram: { caption: "ig" },
      facebook: { caption: "fb" },
      youtube: { caption: "yt" },
      linkedin: { caption: "li" },
      x: { caption: "x" },
      google_business: { caption: "gb" },
    },
    image_prompts: prompts,
    visual_scenes: prompts.map((image_prompt) => ({
      source: "ai" as const,
      image_prompt,
    })),
    presentation_generation: {
      pipeline: "content_pipeline",
      video_concept: VIDEO_CONCEPT,
      opening_impact: OPENING_IMPACT,
      visual_identity: VISUAL_IDENTITY,
    },
  } as ContentPackageOutput;
}

function assertNoOriginalNarrative(prompt: string, label: string): void {
  assert.doesNotMatch(
    prompt,
    /OPENING IMPACT/,
    `${label}: must not inject Opening Impact block`,
  );
  assert.doesNotMatch(
    prompt,
    /VIDEO CONCEPT/,
    `${label}: must not inject Video Concept block`,
  );
  assert.doesNotMatch(
    prompt,
    /first_spoken_sentence/,
    `${label}: must not inject first_spoken_sentence`,
  );
  assert.equal(
    prompt.includes(ORIGINAL_HOOK),
    false,
    `${label}: must not contain original hook`,
  );
  assert.equal(
    prompt.includes("Planning call for content strategy"),
    false,
    `${label}: must not contain original planning-meetings first_image`,
  );
  assert.equal(
    prompt.includes(OPENING_IMPACT.first_image),
    false,
    `${label}: must not contain original spreadsheet first_image`,
  );
  assert.equal(
    prompt.includes("we'll do it ourselves this quarter"),
    false,
    `${label}: must not contain Video Concept core_idea`,
  );
  assert.equal(
    prompt.includes("MYTH (hook):"),
    false,
    `${label}: must not contain Video Concept narrative_arc`,
  );
  assert.equal(
    prompt.includes("Myth Buster logic"),
    false,
    `${label}: must not contain Video Concept why_it_works`,
  );
  assert.equal(
    prompt.includes("they track output (posts live)"),
    false,
    `${label}: must not contain Video Concept audience_insight`,
  );
  assert.doesNotMatch(
    prompt,
    /opening_emotion:/,
    `${label}: must not echo Opening Impact emotion via Visual Identity`,
  );
  assert.doesNotMatch(
    prompt,
    /opening_first_image:/,
    `${label}: must not echo Opening Impact first_image via Visual Identity`,
  );
}

async function main() {
  console.log(`Phase 8 — package ${PACKAGE_ID}\n`);

  await check("rebuild module does not call alignOpeningVoiceover", () => {
    const src = readFileSync(
      join(root, "lib/creative-review/rebuildCreativePackage.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /alignOpeningVoiceover/);
    assert.doesNotMatch(src, /openingImpact\.first_spoken_sentence/);
    assert.doesNotMatch(src, /openingImpact\.first_image/);
    assert.doesNotMatch(src, /isOpeningStill|opening_prepended|voiceover_aligned/);
    assert.match(src, /english_preview/);
    assert.match(src, /final_approved/);
    assert.doesNotMatch(src, /translateTextToLanguage|getCopywritingProvider/);
  });

  await check("composeRebuiltImagePrompt is driven by English Creative Intent", () => {
    const prompt = composeRebuiltImagePrompt({
      sceneIndex: 0,
      intentDescription: SCENE_ENGLISH[0]!,
      directorNotes: "",
      presentationType: "IMAGE",
      anchors: {
        visualIdentity: VISUAL_IDENTITY,
        openingImpact: OPENING_IMPACT,
        videoConcept: VIDEO_CONCEPT,
      },
    });
    assert.match(prompt, /CREATIVE INTENT/);
    assert.match(prompt, /Death in a black cloak/);
    assert.doesNotMatch(prompt, /Smrtka v černém plášti/);
    assert.match(prompt, /VISUAL IDENTITY \(appearance constraints only/);
    assert.match(prompt, /VISUAL CONSISTENCY/);
    assert.doesNotMatch(prompt, /DIRECTOR NOTES/);
    assertNoOriginalNarrative(prompt, "opening still");
  });

  const seeded = seedCreativeReviewFromPackage(
    {
      voiceover_text:
        "The belief that handling content in-house saves time is a myth. Here is what the ledger actually shows.",
      visual_scenes: fixturePackage().visual_scenes,
      image_prompts: fixturePackage().image_prompts,
    },
    { now: () => new Date("2026-08-12T00:13:23.450Z") },
  );
  const approved = approveWithEdits(seeded);
  const result = rebuildCreativePackageForVideo({
    package: fixturePackage(),
    creativeReview: approved,
    actor: ACTOR,
    timestamp: TS,
    packageId: PACKAGE_ID,
  });
  assert.equal(result.ok, true, result.ok ? "" : JSON.stringify(result.issues));
  if (!result.ok) throw new Error("rebuild failed");

  await check("voiceover_text === creative_review.voiceover.final_approved", () => {
    assert.equal(result.value.package.voiceover_text, FINAL_APPROVED);
    assert.equal(result.value.package.voiceover_text, approved.voiceover.final_approved);
    assert.equal(result.value.package.subtitles, FINAL_APPROVED);
    assert.equal(result.value.package.video.script, FINAL_APPROVED);
    assert.equal(
      result.value.package.voiceover_text.startsWith(ORIGINAL_HOOK),
      false,
    );
    assert.equal(result.value.package.voiceover_text.includes(ORIGINAL_HOOK), false);
    assert.equal(
      result.value.package.hook,
      "Čas. To je něco, co už nikdy nevrátíme zpátky.",
    );
  });

  await check("image prompts use english_preview, not localized_edit", () => {
    const scenes = result.value.package.visual_scenes as Array<{
      source: string;
      image_prompt?: string;
    }>;
    assert.equal(scenes.length, 5);
    for (let i = 0; i < scenes.length; i += 1) {
      const prompt = scenes[i]!.image_prompt ?? "";
      assert.match(prompt, /CREATIVE INTENT/);
      assert.ok(
        prompt.includes(SCENE_ENGLISH[i]!),
        `scene ${i + 1} missing English Creative Intent`,
      );
      assert.equal(
        prompt.includes(SCENE_INTENTS[i]!),
        false,
        `scene ${i + 1} must not contain Czech localized_edit`,
      );
      assertNoOriginalNarrative(prompt, `scene ${i + 1}`);
      assert.match(prompt, /character_style/);
      assert.match(prompt, /camera_style/);
      assert.match(prompt, /lighting/);
      assert.match(prompt, /environment/);
      assert.doesNotMatch(prompt, /DIRECTOR NOTES/);
      assert.doesNotMatch(prompt, /Preserve narrative continuity/);
    }
    assert.equal(result.value.promptsRebuilt, 5);
  });

  await check("Production / Sample / worker / UI paths are untouched", () => {
    const rebuild = readFileSync(
      join(root, "lib/creative-review/rebuildCreativePackage.ts"),
      "utf8",
    );
    const continueSrc = readFileSync(
      join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
      "utf8",
    );
    const alignSrc = readFileSync(
      join(root, "lib/content-pipeline/alignOpeningVoiceover.ts"),
      "utf8",
    );
    const runPkg = readFileSync(
      join(root, "lib/content-pipeline/runContentPackage.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(
        root,
        "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx",
      ),
      "utf8",
    );
    assert.match(runPkg, /alignOpeningVoiceover/);
    assert.match(alignSrc, /export function alignOpeningVoiceover/);
    assert.match(continueSrc, /rebuildCreativePackageForVideo/);
    assert.match(continueSrc, /buildVideoJobInput/);
    assert.doesNotMatch(rebuild, /startVideoWorkerJob|storyboard|elevenlabs/i);
    assert.doesNotMatch(panel, /image_prompt/);
  });

  const remainingVisual = [
    "visual_identity.art_direction (spreadsheet / audit aesthetic)",
    "visual_identity.environment (document surface)",
    "visual_identity.camera_style (screen-capture scroll)",
    "visual_identity.character_style (none)",
    "visual_identity.lighting / palette (monitor / document)",
  ];
  console.log("\nRemaining visual dependencies (appearance only, not narrative):");
  for (const item of remainingVisual) {
    console.log(`  - ${item}`);
  }

  console.log("\nAll Phase 8 Creative Review source-of-truth checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
