/**
 * Presentation renderers — pure text assembly from Typed Decision Packs +
 * pre-rendered fragments. No ownership resolution.
 */

import type { Project } from "@/lib/supabase/types";
import type { Json } from "@/lib/supabase/types";
import {
  antiRepetitionBlock,
  constraintsBlock,
  painPointFirstBlock,
  projectBrainBlock,
  proofBlock,
  scenarioBlock,
  websiteLinkRulesBlock,
} from "@/lib/ai/prompts/context";
import {
  renderAssetPolicyPack,
  renderHookOpeningBridge,
  renderNonAuthoritativePacingNote,
  renderStoryStructureFollowLine,
  renderVoiceDeliveryBlock,
  type TypedDecisionPacks,
} from "@/lib/architecture/typedDecisionPacks";
import {
  VOICEOVER_HARD_CAP_WORDS,
  VOICEOVER_TARGET_MAX_WORDS,
  VOICEOVER_TARGET_MIN_WORDS,
} from "@/lib/ai/guardrails";
import {
  deviceScreenInteractionBlock,
  videoSceneCompositionBlock,
} from "@/lib/ai/prompts/visualStyle";
import { MAX_VIDEO_SCENE_STILLS, SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import { formatAvailableAssetPromptLine } from "@/lib/assets/formatAvailableAssetLine";
import { buildSmartAssetUsageRulesBlock } from "@/lib/assets/smartUsageMetadata";
import {
  buildPresentationGenerationBlock,
  buildPresentationJsonShapeLines,
} from "@/lib/ai/prompts/presentationGeneration";
import type { PromptPresentationType } from "@/lib/scene-types/presentation/promptPresentationTypes";
import {
  promptAllowsPhone,
  promptAllowsQuote,
  promptAllowsStatistic,
} from "@/lib/scene-types/presentation/promptPresentationTypes";
import { buildPhoneEligibleAssetsPromptBlock } from "@/lib/scene-types/presentation/phonePromptAssets";
import { buildApprovedQuotesPromptBlock } from "@/lib/scene-types/presentation/quotePromptCandidates";
import { buildApprovedStatisticsPromptBlock } from "@/lib/scene-types/presentation/statisticPromptCandidates";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import { FUNNEL_STAGE_LABELS, type FunnelStage } from "@/lib/ai/types";
import type { GenerationMode } from "@/lib/ai/generationMode";
import type {
  PresentationFragments,
  PresentationRenderInput,
} from "@/lib/architecture/presentation/types";
import type { AssetRef, PackageDiversitySpec } from "@/lib/ai/prompts/generateContentPackage";
import { buildSampleModePromptAppendix } from "@/lib/ai/prompts/sampleModePrompt";
import { buildPlatformStyleBlock } from "@/lib/ai/prompts/platformStyles";
import { angleLensForIndex } from "@/lib/projects/productionRun";

/** Product Brain extensions + safety constraints + knowledge cards. */
export function renderGroundingSection(input: PresentationRenderInput): string[] {
  const { project, decisionPacks } = input;
  const painPointFirst = painPointFirstBlock(project);
  const proof = proofBlock(project);
  const scenarios = scenarioBlock(project);
  const websiteLinks = websiteLinkRulesBlock(project);
  const memory = input.memory ? antiRepetitionBlock(input.memory) : "";
  const recentAssetUsage = input.recentAssetUsageBlock?.trim() ?? "";
  const assetPolicyBlock = renderAssetPolicyPack(decisionPacks.assetPolicy);
  const funnelLabel = FUNNEL_STAGE_LABELS[input.funnelStage];
  const allowedCtas = decisionPacks.cta.allowedTypes;

  return [
    // Temporary: projectBrainBlock still reads Project for platforms/tone not
    // fully mirrored on ProductGroundingPack. Pack exists for typed grounding.
    projectBrainBlock(project),
    "",
    constraintsBlock(project),
    ...(painPointFirst ? ["", painPointFirst] : []),
    ...(proof ? ["", proof] : []),
    ...(scenarios ? ["", scenarios] : []),
    ...(websiteLinks ? ["", websiteLinks] : []),
    ...(memory ? ["", memory] : []),
    ...(recentAssetUsage ? ["", recentAssetUsage] : []),
    "",
    ...(assetPolicyBlock ? [assetPolicyBlock, ""] : []),
    `STRATEGY ITEM: funnel_stage="${funnelLabel}" topic="${input.topic}" angle="${input.angle ?? ""}"`,
    `CTA type MUST be one of (goal=${decisionPacks.cta.goalType}): ${allowedCtas.join(", ")}`,
    "",
  ];
}

export function renderCreativeDirectiveSection(
  fragments: PresentationFragments,
): string[] {
  return [fragments.creativeDirectiveBlock, ""];
}

export function renderPackageDiversitySection(
  spec: PackageDiversitySpec | undefined,
): string[] {
  if (!spec) return [];
  return [...buildPackageDiversityLines(spec), ""];
}

export function buildPackageDiversityLines(spec: PackageDiversitySpec): string[] {
  const human = Math.trunc(spec.packageIndex) + 1;
  const ofM =
    typeof spec.packageCount === "number" && spec.packageCount > 0
      ? ` of ${Math.trunc(spec.packageCount)}`
      : "";
  const lens = spec.angleLens ?? angleLensForIndex(spec.packageIndex);

  const lines = [
    `PACKAGE DIVERSITY (this is package ${human}${ofM} in ONE production run — ` +
      "every package in the run MUST be clearly DISTINCT, never a near-duplicate " +
      "of a sibling):",
    "- Keep the SAME project, topic and funnel stage, but commit to a DIFFERENT " +
      "ANGLE than the other packages. The hook angle, pain point, scenario, " +
      "visual motif and CTA framing must ALL differ from the other packages in " +
      "this run.",
    `- For THIS package, lead through this ANGLE LENS: "${lens}". Sharpen the ` +
      "strategy topic/angle specifically through that lens — do not drift to a " +
      "generic take that could fit any package in the run.",
    "- Pick a different concrete moment from the SCENARIO POOL than a " +
      "neighbouring package would pick.",
  ];

  const painPoint = spec.painPoint?.trim();
  if (painPoint) {
    if (spec.painPointMode === "supporting") {
      lines.push(
        `- PAIN POINT FOCUS (this package is a SUPPORTING one): connect to the ` +
          `pain point "${painPoint}". You may lead with a supporting detail, ` +
          "mistake or observation, but it MUST clearly tie back to that pain " +
          "point — never let the detail become a standalone topic.",
      );
    } else {
      lines.push(
        `- PAIN POINT FOCUS (this package is PRIMARY): the central topic MUST ` +
          `solve, expose, amplify or dramatize this pain point: "${painPoint}". ` +
          "Do NOT make a minor detail the main topic.",
      );
    }
  }

  const prev = (spec.previousAngles ?? []).filter(
    (p) => typeof p.title === "string" && p.title.trim().length > 0,
  );
  if (prev.length > 0) {
    lines.push(
      "- DO NOT REPEAT these angles already used by other packages in this run " +
        "(use a genuinely different angle, hook and scenario):",
      ...prev.map((p) => {
        const hook = p.hook?.trim() ? ` — hook: "${p.hook.trim()}"` : "";
        const topic = p.topic?.trim() ? ` (topic: ${p.topic.trim()})` : "";
        return `  - "${p.title.trim()}"${hook}${topic}`;
      }),
    );
  }

  return lines;
}

export function renderAttentionFirstSection(packs: TypedDecisionPacks): string[] {
  return [
    "ATTENTION FIRST (internal growth engine — optimize for attention & " +
      "retention, NOT corporate brand-safety):",
    "- Priority order: 1) scroll-stop, 2) watch time, 3) curiosity, " +
      "4) emotion / conflict / surprise. proof, benefit and CTA come AFTER " +
      "attention is earned — they serve the story, they are not the structure.",
    renderStoryStructureFollowLine(packs.storyStructure),
    "- Fully COMMIT to the mode: if humor, be genuinely funny; if shock, lead " +
      "with the actually surprising; if contrarian, take a real stance; if story, " +
      "stay in one scene. Never sand it down into safe, generic marketing.",
    "- Open ONE curiosity loop (tension / contrast / an unanswered question) in " +
      "the opening meaning block and pay it off LATE (the reveal / twist / punchline " +
      "near the end), never by explaining the topic first.",
    "- Attention ≠ chaos: optimize information value and curiosity, not aggression.",
    "- Bound by CREATIVE SAFETY above: no lies, no invented numbers / results, no " +
      "forbidden_claims, no product_is_not. Attention is NOT ragebait or fake claims.",
    "",
  ];
}

export function renderVoiceSection(packs: TypedDecisionPacks): string[] {
  const block = renderVoiceDeliveryBlock(packs.voice);
  return block ? [block, ""] : [];
}

/** Candidate / narrative / DNA / fidelity — packs for DNA; fragments for upstream. */
export function renderHookAndIdentitySection(
  packs: TypedDecisionPacks,
  fragments: PresentationFragments,
): string[] {
  const lines: string[] = [];
  if (fragments.candidatePromptBlock) {
    lines.push(fragments.candidatePromptBlock, "");
  }
  if (fragments.narrativeBeatPromptBlock) {
    lines.push(fragments.narrativeBeatPromptBlock, "");
  }
  if (packs.visualIdentity.dnaPromptBlock) {
    lines.push(packs.visualIdentity.dnaPromptBlock, "");
  }
  if (fragments.fidelityRepairBlock) {
    lines.push(fragments.fidelityRepairBlock, "");
  }
  return lines;
}

export function renderQualitySection(
  packs: TypedDecisionPacks,
  requireVideo: boolean,
): string[] {
  return [
    "CONTENT QUALITY (hard rules — short, punchy, native short-form):",
    ...(requireVideo
      ? [
          `- HARD video length target: ${SHORT_PROFILE.minDurationSeconds}–${SHORT_PROFILE.maxDurationSeconds}s. ` +
            "Write for that length: a fast vertical short, not an explainer.",
        ]
      : []),
    `- VOICEOVER LENGTH: write voiceover_text as ${VOICEOVER_TARGET_MIN_WORDS}–${VOICEOVER_TARGET_MAX_WORDS} words. ` +
      `NEVER exceed ${VOICEOVER_HARD_CAP_WORDS} words — over the cap is rejected. ` +
      "Every word must earn its place; cut filler.",
    "- VOICEOVER RHYTHM (spoken delivery — do NOT write a flat paragraph):",
    "  Prefer short sentences. Use contrast (belief → reversal). Land one idea per breath.",
    "  Put a natural pause before the reveal. Emphasize the turn — not every clause equally.",
    "  Avoid long equally-paced sentences that read like an essay.",
    "- AFTER THE OPENING MEANING BLOCK: the next spoken thought must raise cost,",
    "  contradiction, surprise, or consequence — do NOT restate the topic as setup/lecture.",
    "  A short bridge clause (≤6 words) is allowed only when the mode truly needs it.",
    ...renderHookOpeningBridge(packs.hook, packs.storyStructure),
    renderNonAuthoritativePacingNote(packs.storyStructure),
    "- FORBIDDEN (Zakázat): NO long explanations or lectures; NO background / " +
      "company-history story (who you are, when you were founded, your mission); " +
      "NO corporate copy or jargon (industry-leading, world-class, cutting-edge, " +
      'value proposition, "we are committed to ...", synergy, etc.). ' +
      "Speak like a person, not a brochure.",
  ];
}

export function renderVisualBeatsSection(
  packs: TypedDecisionPacks,
  fragments: PresentationFragments,
  requireVideo: boolean,
): string[] {
  if (!requireVideo) return [];
  const modeBeatArc = packs.storyStructure.beatArc;
  return [
    "",
    `VISUAL BEATS: provide 3–${MAX_VIDEO_SCENE_STILLS} image_prompts. Each one is a`,
    "GENERATED still image, and a small set is enough to carry a 20–30s short",
    "(the stills are reused across the moving beats). Do NOT provide more than",
    `${MAX_VIDEO_SCENE_STILLS}. They should follow the MODE BEATS above`,
    `(${modeBeatArc}), but do NOT force one image per narration beat — fewer or`,
    "more narration labels is fine. Make the stills visually distinct from each",
    "other and escalate the tension / curiosity toward the reveal. Do NOT default",
    "to a generic, interchangeable beat set.",
    "VISUAL PROGRESSION (consecutive IMAGE scenes): adjacent IMAGE stills must",
    "normally differ across at least two meaningful axes — for example primary",
    "subject, action, consequence, narrative function, information revealed,",
    "location within the same Creative DNA world, object focus, or human versus",
    "environment versus consequence view. Prefer: problem world → failure →",
    "consequence → solution. NOT sufficient alone: a small hand gesture, a slightly",
    "moved phone, a new abstract UI bubble, a minor emotional change in the same",
    "shot, or the same subject/device/environment with only micro-action changes.",
    "Do NOT require changing Creative Identity treatment (lighting, camera language,",
    "composition treatment, color treatment, or established visual style) — diversity",
    "happens inside the same coherent treatment and DNA world.",
    "Each image_prompt MUST describe a PURELY VISUAL scene. NEVER request",
    "readable words, letters, numbers, captions, signs, labels, or typography",
    "inside the image — image models render these as garbled noise.",
    "All spoken messaging is delivered through voiceover and burned-in subtitles.",
    "PRODUCT DEMONSTRATION IN IMAGE SCENES:",
    "- An IMAGE scene may show a problem-state phone or abstract chat interface when",
    "  narratively useful.",
    "- Do not use a floating icon, smiling person, or generic landing page as product",
    "  proof.",
    "- Do not recreate the complete ask→answer→result sequence in IMAGE scenes.",
    "- Value proof follows Product Presentation Decision (authentic asset, outcome,",
    "  abstract mechanism, or story without product pixels) — never synthetic UI",
    "  and never legacy PRODUCT_DEMO scene types.",
    "When the creative metaphor needs labels to be understood, convey meaning via",
    "visual state (empty rows, red panels, person walking away) + spoken voiceover,",
    "never via readable text in the frame.",
    "",
    "PRIMARY_ACTOR IDENTITY CONTINUITY:",
    "- Keep the established PRIMARY_ACTOR identity consistent in scenes where that",
    "  actor appears (from Creative DNA / openingSituation).",
    "- Do not introduce a different human face, age, gender presentation, profession,",
    "  or identity mid-package without an explicit narrative reason.",
    "- UI-only scenes, device close-ups, environment shots, consequence shots, and",
    "  product-surface inserts do not need to show the actor's face.",
    "- Do not require the same phone, hands, location, or framing across ordinary",
    "  IMAGE scenes.",
    "- Lifestyle, environment, and consequence scenes are allowed when they remain",
    "  inside the selected Creative DNA world.",
    "",
    "OPENING PRIORITY RESOLVER (mandatory — Attention First):",
    "When instructions conflict for the FIRST visual / opening meaning block, apply this order:",
    "1) Creative Candidate openingSituation + hookLine (the stop-scroll idea) — never replace or sand down.",
    "2) Attention Delivery (mechanism + delivery arc) — amplify the winner; do not replace it.",
    "3) Creative DNA world (if present) — stay inside that world.",
    "4) Creative Identity — treatment only: lighting, camera, color, composition, visual language.",
    "   Identity MUST NOT change location, environment, main event, or openingSituation.",
    "5) Visual Narrative / Scene Meaning — clarify the event's meaning; do not swap the event.",
    "Penalize only LOW-INFORMATION openings: frames that add no new meaning and no curiosity",
    "in the opening meaning block. Calm, empty, or quiet frames are allowed when they carry",
    "a clear stakes/absence/consequence meaning. Decorative empties with no readable situation are not.",
    "Product may appear in the opening when it is part of the hook situation.",
    "Forbidden in the opening meaning block: sales pitch, offer language, CTA, pricing,",
    "or 'buy / book / sign up / learn more' as the first spoken or visual message.",
    "Do not simplify the winner into a safer, more generic montage.",
    "",
    "SCENE MEANING (priority over look):",
    "For each image prompt, first determine what a viewer should understand from that beat's meaning.",
    "For the opening beat: communicate the winner's openingSituation event/meaning — not a generic theme illustration.",
    "Prioritize meaning over visual style.",
    "Describe concrete subjects, actions, environments and objects that naturally communicate that message.",
    "Do not default to interchangeable stock staging or decorative empties with no situation meaning.",
    "",
    ...(fragments.visualNarrativePromptBlock
      ? [fragments.visualNarrativePromptBlock, ""]
      : []),
    ...(fragments.productRevealPromptBlock
      ? [fragments.productRevealPromptBlock, ""]
      : []),
    ...(fragments.visualMediumPromptBlock
      ? [fragments.visualMediumPromptBlock, ""]
      : []),
    ...(fragments.visualProfileImagePromptBlock
      ? [fragments.visualProfileImagePromptBlock, ""]
      : []),
    ...(packs.visualIdentity.identityPromptBlock
      ? [packs.visualIdentity.identityPromptBlock, ""]
      : []),
    videoSceneCompositionBlock(),
    "",
    deviceScreenInteractionBlock(),
    "",
    "DEVICE SCREENS IN GENERATED STILLS:",
    "- If a scene shows a laptop, phone, monitor, or tablet, the screen must NEVER be blank white or empty.",
    "- The content displayed on a screen should visually reinforce the purpose of the current scene using recognizable interface layouts, imagery or structure without relying on readable text.",
    "- Do not generate empty laptop/phone/monitor screens.",
  ];
}

export function renderAssetsSection(
  project: Project,
  availableAssets: readonly AssetRef[],
  promptPresentationTypes: readonly PromptPresentationType[],
  fragments: PresentationFragments,
  generationMode: GenerationMode,
): string[] {
  return [
    "",
    "AVAILABLE ASSETS (optional product library — using assets is NEVER mandatory; " +
      "empty asset_usage is valid. asset_usage rules: STATIC must not be modified; " +
      "EDITABLE may have a variant; REFERENCE is inspiration only):",
    availableAssets.length
      ? availableAssets.map((a) => formatAvailableAssetPromptLine(a)).join("\n")
      : "(none)",
    ...(promptAllowsPhone(promptPresentationTypes)
      ? (() => {
          const phoneBlock = buildPhoneEligibleAssetsPromptBlock(availableAssets);
          return phoneBlock ? ["", phoneBlock] : [];
        })()
      : []),
    ...(promptAllowsQuote(promptPresentationTypes)
      ? (() => {
          const block = buildApprovedQuotesPromptBlock(
            buildProofIndex((project.knowledge as Json | null | undefined) ?? null),
          );
          return block ? ["", block] : [];
        })()
      : []),
    ...(promptAllowsStatistic(promptPresentationTypes)
      ? (() => {
          const block = buildApprovedStatisticsPromptBlock(
            buildProofIndex((project.knowledge as Json | null | undefined) ?? null),
          );
          return block ? ["", block] : [];
        })()
      : []),
    "",
    buildSmartAssetUsageRulesBlock(),
    "",
    ...(fragments.seriesCreativeContextBlock
      ? [fragments.seriesCreativeContextBlock, ""]
      : []),
    buildPresentationGenerationBlock({
      allowedTypes: [...promptPresentationTypes],
    }),
    "",
    "VISUAL SCENE PLAN (ordered dramaturgy — canonical for video when present):",
    "- Plan the video as visual_scenes: an ORDERED list where each entry is ONE on-screen beat.",
    "- Choose scene count for a 20–40s short (typically 3–5 scenes). Do not pad to a maximum.",
    "- Each scene is either source=\"ai\" (with image_prompt) OR source=\"asset\" (with asset_id + used_as). Never both.",
    "- Assets are OPTIONAL. AI-only packages are valid (all ai scenes).",
    "- Place an asset ONLY where it strengthens the story at that moment in the voiceover.",
    "- Do NOT list assets separately from scene order. Do NOT use an asset just because it exists.",
    "- Avoid back-to-back asset scenes unless the story truly needs it.",
    "- Respect each asset's product role, ai_description, suggested_usage, and Preferred usage line.",
    "- Only use asset_id values from AVAILABLE ASSETS above.",
    "- When you include visual_scenes, also keep image_prompts (ai prompts only, same order) and asset_usage (asset scenes only) for compatibility.",
    "",
    "ASSET LIBRARY RULES:",
    "- Do not invent asset_usage entries; only reference ids listed above.",
    "- Skip assets entirely when AI scenes alone tell the story better.",
    "- Use source=\"asset\" ONLY when used_as describes a placement the renderer supports: framed laptop/monitor/phone, floating card, ui_hero, or similar insert — set video_usage to a known value (framed_laptop, framed_screen, framed_phone, floating_card, ui_hero) when possible.",
    "- Do NOT use source=\"asset\" for beats that need people, rooms, or action around the product unless modify=true on a non-static asset.",
    "- If unsure, use source=\"ai\" with image_prompt instead of a weak asset insert.",
    ...(generationMode === "sample"
      ? ["", buildSampleModePromptAppendix(project)]
      : []),
  ];
}

export function renderPlatformSection(
  targetPlatforms: readonly string[],
): string[] {
  return ["", buildPlatformStyleBlock(targetPlatforms), ""];
}

export function renderSchemaSection(input: {
  funnelStage: FunnelStage;
  targetPlatforms: readonly string[];
  requireVideo: boolean;
  videoPlatforms: readonly string[];
  promptPresentationTypes: readonly PromptPresentationType[];
  variantCounts?: Record<string, number>;
}): string[] {
  const funnelLabel = FUNNEL_STAGE_LABELS[input.funnelStage];
  const textOnlyPlatforms = input.targetPlatforms.filter(
    (p) => !input.videoPlatforms.includes(p),
  );
  const isMixed =
    input.requireVideo &&
    input.videoPlatforms.length > 0 &&
    textOnlyPlatforms.length > 0;

  const variantCount = (p: string): number => {
    const n = input.variantCounts?.[p];
    return typeof n === "number" && Number.isFinite(n) && n > 1
      ? Math.trunc(n)
      : 1;
  };
  const platformsWithVariants = input.targetPlatforms.filter(
    (p) => variantCount(p) > 1,
  );

  const platformOutputsBlock = input.targetPlatforms
    .map((p) => {
      const count = variantCount(p);
      if (count > 1) {
        const variantsArray = Array.from({ length: count }, () => `"string"`).join(
          ", ",
        );
        return `    "${p}": { "caption": "string", "cta": "string", "hashtags": ["string"], "format": "string", "title_variants": [${variantsArray}], "caption_variants": [${variantsArray}] }`;
      }
      return `    "${p}": { "caption": "string", "cta": "string", "hashtags": ["string"], "format": "string" }`;
    })
    .join(",\n");

  const variantsLines =
    platformsWithVariants.length > 0
      ? [
          "",
          "MULTIPLE OUTPUTS PER PLATFORM (distinct variants — same facts, same " +
            "funnel stage, same CTA type):",
          ...platformsWithVariants.map(
            (p) =>
              `- "${p}": provide EXACTLY ${variantCount(p)} captions in "caption_variants" ` +
              `AND EXACTLY ${variantCount(p)} matching titles in "title_variants" (same order). ` +
              `Set "caption" to the first caption too.`,
          ),
          "- Each variant MUST be a genuinely different take: a different ANGLE, " +
            "opening line and structure (e.g. question vs bold claim vs mini-story). " +
            "Never reword the same sentence. Never produce near-duplicates.",
          "- Each title in \"title_variants\" MUST match the ANGLE of the caption at " +
            "the same index, and the titles must differ from one another.",
          "- Keep every variant on-topic, truthful and within the platform's style.",
        ]
      : [];

  const jsonShape = [
    "{",
    `  "title": "string",`,
    `  "funnel_stage": "${funnelLabel}",`,
    `  "hook": "string",`,
    `  "voiceover_text": "string",`,
    `  "subtitles": "string",`,
    `  "cta": { "type": "one of allowed cta types", "text": "string" },`,
    ...(input.requireVideo
      ? [
          `  "video": { "concept": "string", "script": "string", "duration_seconds": "string" },`,
          `  "visual_scenes": [`,
          ...buildPresentationJsonShapeLines({
            allowedTypes: [...input.promptPresentationTypes],
          }).map((line) => `  ${line}`),
          `  ],`,
        ]
      : []),
    ...(input.requireVideo ? [`  "image_prompts": ["string"],`] : []),
    `  "platform_outputs": {`,
    platformOutputsBlock,
    `  },`,
    `  "hashtags": ["string"],`,
    `  "asset_usage": [ { "asset_id": "uuid", "used_as": "string", "modify": "true|false" } ],`,
    `  "scenario": "the SCENARIO POOL line you drew on (verbatim), or \"\" if none"`,
    "}",
  ].join("\n");

  const rulesLine = input.requireVideo
    ? `Rules: funnel_stage MUST equal "${funnelLabel}". video is mandatory. ` +
      `Provide outputs for ALL of these platforms: ${input.targetPlatforms.join(", ")}. ` +
      "Never modify a STATIC asset. " +
      'If you used a scenario, set "scenario" to that pool line verbatim; ' +
      "otherwise set it to an empty string."
    : `Rules: funnel_stage MUST equal "${funnelLabel}". This is a TEXT-ONLY package: ` +
      'do NOT generate a video — omit the "video" field entirely. ' +
      `Provide outputs for ALL of these platforms: ${input.targetPlatforms.join(", ")}. ` +
      "Still produce voiceover_text (use it as the body copy) and subtitles (a short " +
      "text version) — they are required. Never modify a STATIC asset. " +
      'If you used a scenario, set "scenario" to that pool line verbatim; ' +
      "otherwise set it to an empty string.";

  const mixedNote = isMixed
    ? [
        "",
        `MIXED PLATFORMS: video is required because ${input.videoPlatforms.join(", ")} ` +
          `${input.videoPlatforms.length === 1 ? "is a video platform" : "are video platforms"}. ` +
          "Produce ONE shared video for the package. The text-only platforms " +
          `(${textOnlyPlatforms.join(", ")}) still need their own platform-specific ` +
          "caption, CTA and hashtags — they simply do not get a separate video.",
      ]
    : [];

  return [
    "TASK: Produce ONE content package as JSON with this exact shape:",
    jsonShape,
    rulesLine,
    ...mixedNote,
    ...variantsLines,
  ];
}
