import type { Project } from "@/lib/supabase/types";
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
  buildCreativeDirectiveBlock,
  buildCreativeSeed,
  type CreativeDirectives,
  pickCreativeDirectives,
  PREFERRED_STORY_ARC,
} from "@/lib/ai/prompts/creativeDirectives";
import {
  VOICEOVER_HARD_CAP_WORDS,
  VOICEOVER_TARGET_MAX_WORDS,
  VOICEOVER_TARGET_MIN_WORDS,
} from "@/lib/ai/guardrails";
import {
  videoSceneCompositionBlock,
  visualStyleGuardrailBlock,
} from "@/lib/ai/prompts/visualStyle";
import { MAX_VIDEO_SCENE_STILLS, SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import { angleLensForIndex } from "@/lib/projects/productionRun";
import { formatAvailableAssetPromptLine } from "@/lib/assets/formatAvailableAssetLine";
import { buildSmartAssetUsageRulesBlock } from "@/lib/assets/smartUsageMetadata";
import { buildFunnelAssetPolicyBlock } from "@/lib/ai/prompts/funnelAssetPolicy";
import {
  buildAssetCoveragePromptBlock,
  type AssetCoverageDecision,
} from "@/lib/assets/assetCoveragePolicy";
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
import type { Json } from "@/lib/supabase/types";
import {
  DEFAULT_GENERATION_MODE,
  type GenerationMode,
} from "@/lib/ai/generationMode";
import {
  type AntiRepetitionMemory,
  CTA_TYPES_BY_GOAL,
  FUNNEL_STAGE_LABELS,
  REQUIRED_PACKAGE_PLATFORMS,
  type FunnelStage,
} from "@/lib/ai/types";

import type { ProductRole } from "@/lib/assets/productRole";
import type { PreferredVideoUsage, VideoUsageRenderMode } from "@/lib/assets/preferredVideoUsage";

export interface AssetRef {
  id: string;
  title: string;
  // static | editable | reference
  asset_class: string;
  media_type: string;
  ai_description?: string | null;
  detected_content_type?: string | null;
  suggested_usage?: string | null;
  trust_signal?: boolean | null;
  product_role?: ProductRole | null;
  /** From assets.metadata.asset_quality when present (ingest / analysis). */
  asset_quality?: "high" | "medium" | "low" | null;
  orientation?: string | null;
  preferred_presentation?: string | null;
  video_suitability?: string | null;
  safe_vertical_usage?: boolean | null;
  aspect_ratio?: string | number | null;
  visual_importance?: string | null;
  capture_viewport?: string | null;
  /** Stamped or computed preferred usage for vertical video. */
  preferred_video_usage?: VideoUsageRenderMode | PreferredVideoUsage | null;
}

// Content Quality Sprint (Platform Styles) — per-platform output style. Pure
// prompt guidance: no new DB column, no new workflow, no schema change. Each
// target platform gets its own tone / structure / CTA style / expected length
// so the captions are genuinely platform-native instead of one reused text.
export interface PlatformStyleSpec {
  tone: string;
  structure: string;
  cta: string;
  length: string;
}

export const PLATFORM_STYLE_SPECS: Record<string, PlatformStyleSpec> = {
  tiktok: {
    tone: "raw, fast, conversational, native — like talking to a friend",
    structure: "hook in the first line, then quick punchy beats, end on a payoff",
    cta: "implicit and casual (e.g. follow, watch till the end, try it)",
    length: "1–2 short sentences + 3–5 trend-style hashtags",
  },
  instagram: {
    tone: "polished, aspirational, visually-driven",
    structure: "scroll-stopping hook -> a tight micro-story -> the value",
    cta: 'save / share / "link in bio"',
    length: "2–4 sentences, tasteful emoji allowed, 5–10 hashtags",
  },
  youtube: {
    tone: "informative, search/watch-time oriented",
    structure: "a high-CTR title line, then a structured description of the value",
    cta: "subscribe + watch next",
    length: "title <= 70 chars, description 3–5 sentences",
  },
  x: {
    tone: "terse, opinionated, thread-able",
    structure: "one strong claim, no filler",
    cta: "spark a reply or repost",
    length: "<= 280 characters, 0–2 hashtags",
  },
  google_business: {
    tone: "factual, local, trustworthy",
    structure: "offer / update -> concrete benefit -> action",
    cta: 'local action (call / visit / book)',
    length: "2–3 sentences, NO hashtags",
  },
  linkedin: {
    tone: "professional, expert, B2B (no hype)",
    structure: "insight -> context -> takeaway",
    cta: 'invite a comment / connect',
    length: "3–6 sentences, 0–3 hashtags, no decorative emoji",
  },
  facebook: {
    tone: "friendly, community-oriented, approachable local business",
    structure: "relatable hook -> the value or offer -> a clear next step",
    cta: "message / book / one clean canonical link for lead or conversion content",
    length: "2–4 sentences, light emoji ok, 0–3 hashtags",
  },
};

// Renders the per-platform style guidance for the platforms a package targets.
// Only the selected platforms are listed, so the block scales with the run.
function buildPlatformStyleBlock(platforms: readonly string[]): string {
  const lines = platforms
    .map((p) => {
      const spec = PLATFORM_STYLE_SPECS[p];
      if (!spec) return null;
      return (
        `- ${p}: tone=${spec.tone}; structure=${spec.structure}; ` +
        `cta=${spec.cta}; length=${spec.length}`
      );
    })
    .filter((l): l is string => l !== null);
  if (lines.length === 0) return "";
  return [
    "PLATFORM STYLES (make each platform's output genuinely native — NOT one " +
      "text lightly reformatted; same facts, funnel stage and CTA type, but a " +
      "platform-specific voice, structure and length):",
    ...lines,
  ].join("\n");
}

export interface GenerateContentPackagePromptInput {
  project: Project;
  funnelStage: FunnelStage;
  topic: string;
  angle?: string | null;
  platform?: string | null;
  format?: string | null;
  availableAssets: AssetRef[];
  // Phase 2E — recent hooks/topics/CTAs/scenarios to avoid repeating.
  memory?: AntiRepetitionMemory;
  // Recent asset_usage log for optional rotation guidance (empty -> omitted).
  recentAssetUsageBlock?: string;
  // Platform surfaces the package must produce. Defaults to the full required
  // set; callers pass the project's resolved platforms to respect
  // projects.platforms.
  targetPlatforms?: readonly string[];
  // P3 runtime — whether this package must include a video (true when at least
  // one selected platform is video-typed). Defaults to true (video required),
  // which keeps the historical prompt unchanged for video packages.
  requireVideo?: boolean;
  // The subset of targetPlatforms that are video-typed. Used only to phrase a
  // mixed-package note; empty when unknown.
  videoPlatforms?: readonly string[];
  // Content Quality V3 — optional extra salt mixed into the creative-directive
  // seed. Generation leaves it empty (seed = funnel/topic/angle); regeneration
  // sets it from the previous title + feedback so a regenerated package gets a
  // different creative directive than the original.
  creativeSeedSalt?: string;
  // Attention First V1 — the pre-resolved creative directive. When provided it is
  // used verbatim (so the prompt, the storyboard role arc and the video job
  // input all share the SAME mode). When omitted the prompt resolves it the
  // legacy way from funnel/topic/angle/creativeSeedSalt — fully backward
  // compatible with existing callers and tests.
  directives?: CreativeDirectives;
  // Content Quality Sprint (Multiplier Variants MVP-1) — number of OUTPUTS this
  // package must produce per platform for the current production run + package
  // index. When a platform's count is > 1, the prompt asks for that many
  // DISTINCT captions (caption_variants) so fan-out persists real variants
  // instead of duplicating one caption. Platforms absent from the map (or with
  // a count <= 1) keep the single-caption shape unchanged.
  variantCounts?: Record<string, number>;
  // Run Package Diversity V1 — present only for production-run items (when
  // production_run_id + package_index are known). It injects the PACKAGE
  // DIVERSITY block so every package in one run commits to a DISTINCT angle.
  // Omitted for legacy / single-package generation, which keeps the prompt
  // byte-for-byte unchanged.
  packageDiversity?: PackageDiversitySpec;
  /** Phase 5 — presentation types the model may emit (IMAGE and optionally CHECKLIST). */
  promptPresentationTypes?: readonly PromptPresentationType[];
  /** Sample mode adds SAMPLE PACKAGE RULES; production leaves the prompt unchanged. */
  generationMode?: GenerationMode;
  /** Per-package asset coverage (production series + sample). Omitted when not computed. */
  assetCoverage?: AssetCoverageDecision;
  /** Recent typed-scene usage for cross-package restraint (prompt-only guidance). */
  sceneTypeHistoryBlock?: string;
  /** Profile-aware image prompt guidance (generation-time). */
  visualProfileImagePromptBlock?: string;
}

export function buildSamplePackageRulesBlock(): string {
  return [
    "SAMPLE PACKAGE RULES",
    "",
    "This content serves as a sample for the product owner.",
    "",
    "The goal is NOT to create the best organic content.",
    "",
    "The goal is for the product owner to recognize themselves within seconds.",
    "",
    "If quality product assets exist:",
    "- prefer product UI",
    "- prefer homepage visuals",
    "- prefer logo",
    "- prefer hero image",
    "",
    "Do not hesitate to use 1–3 assets.",
    "",
    "It is better to use a relevant asset than a generic AI image.",
    "",
    "Assets are still NOT mandatory when no quality product assets exist.",
    "When quality product assets ARE listed, SAMPLE PACKAGE COVERAGE requires at least one asset_usage.",
    "If assets are not quality or not relevant, do not use them.",
  ].join("\n");
}

// One sibling package already produced for the same production run, summarized
// for the "do not repeat these angles" list. Sourced from existing rows
// (content_packages.title + package_brief.hook + the item topic) — no new table
// and no AI call.
export interface PreviousPackageAngle {
  title: string;
  hook?: string | null;
  topic?: string | null;
}

export interface PackageDiversitySpec {
  // 0-based index of this package within the run.
  packageIndex: number;
  // Total packages requested in the run (M in "package N of M"), when known.
  packageCount?: number;
  // The angle lens THIS package should lead with. Defaults to the deterministic
  // lens for packageIndex when omitted.
  angleLens?: string;
  // Compact angles already used by sibling packages in the SAME run, so the
  // model is told not to repeat them. Empty/omitted when none exist yet.
  previousAngles?: PreviousPackageAngle[];
  // Pain Point First V1 — the specific pain point THIS package must anchor to,
  // plus whether the pain point is the PRIMARY topic (~80% of packages) or a
  // SUPPORTING detail that still connects back to it (~20%). Omitted for
  // projects with no pain points, so those runs keep the prior block unchanged.
  painPoint?: string;
  painPointMode?: "primary" | "supporting";
}

// Run Package Diversity V1 — builds the PACKAGE DIVERSITY block. It tells the
// model this is package N (of M), forces a distinct hook angle / pain point /
// scenario / visual motif / CTA framing, leads with a deterministic angle lens,
// and (when siblings exist) lists their angles as "do not repeat".
function buildPackageDiversityLines(spec: PackageDiversitySpec): string[] {
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

  // Pain Point First V1 — pin THIS package to its assigned pain point. Primary
  // packages make the pain point the central topic; supporting packages may use
  // a detail/insight, but it must still connect back to the SAME pain point.
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

const PACKAGE_SYSTEM_INTRO =
  "You are the Creative Engine for an AI Content Manager. You generate a " +
  "complete content PACKAGE derived from a weekly strategy item. ";

const PACKAGE_SYSTEM_VIDEO =
  "Video is MANDATORY for every package and is a fast-paced vertical SHORT (TikTok / " +
  "Instagram Reels / YouTube Shorts share ONE video). The first 3 seconds (the " +
  "hook) decide everything. Produce platform-specific outputs.";

const PACKAGE_SYSTEM_TEXT_ONLY =
  "This is a TEXT-ONLY package: do NOT produce a video. Do not generate a video " +
  "concept or script. Produce platform-specific written copy (captions, CTA, " +
  "hashtags) plus the required body/narration fields. The first line (the hook) " +
  "still decides everything — it opens the copy.";

// Builds the system message for content-package generation. requireVideo=true
// keeps the historical, video-mandatory system message; false switches to the
// text-only variant.
export function buildGeneratePackageSystem(requireVideo: boolean): string {
  return (
    PACKAGE_SYSTEM_INTRO +
    (requireVideo ? PACKAGE_SYSTEM_VIDEO : PACKAGE_SYSTEM_TEXT_ONLY)
  );
}

// Backwards-compatible constant: the video-mandatory system message.
export const GENERATE_PACKAGE_SYSTEM = buildGeneratePackageSystem(true);

export function buildGenerateContentPackagePrompt(
  input: GenerateContentPackagePromptInput,
): string {
  const { project, funnelStage, topic, angle, availableAssets } = input;
  const generationMode = input.generationMode ?? DEFAULT_GENERATION_MODE;
  const allowedCtas = CTA_TYPES_BY_GOAL[project.goal_type] ?? [];
  const funnelLabel = FUNNEL_STAGE_LABELS[funnelStage];
  const targetPlatforms =
    input.targetPlatforms && input.targetPlatforms.length > 0
      ? input.targetPlatforms
      : REQUIRED_PACKAGE_PLATFORMS;
  const requireVideo = input.requireVideo ?? true;
  const videoPlatforms = input.videoPlatforms ?? [];
  const textOnlyPlatforms = targetPlatforms.filter(
    (p) => !videoPlatforms.includes(p),
  );
  // Mixed only matters for video packages: ≥1 video platform AND ≥1 text-only.
  const isMixed =
    requireVideo && videoPlatforms.length > 0 && textOnlyPlatforms.length > 0;
  const promptPresentationTypes: PromptPresentationType[] =
    input.promptPresentationTypes && input.promptPresentationTypes.length > 0
      ? [...input.promptPresentationTypes]
      : ["IMAGE"];

  const painPointFirst = painPointFirstBlock(project);
  const proof = proofBlock(project);
  const scenarios = scenarioBlock(project);
  const websiteLinks = websiteLinkRulesBlock(project);
  const memory = input.memory ? antiRepetitionBlock(input.memory) : "";
  const recentAssetUsage = input.recentAssetUsageBlock?.trim() ?? "";
  const funnelAssetPolicy = buildFunnelAssetPolicyBlock(funnelStage);
  const assetCoverageBlock =
    input.assetCoverage &&
    (input.assetCoverage.qualityAssetCount > 0 || generationMode === "sample")
      ? buildAssetCoveragePromptBlock(input.assetCoverage, generationMode)
      : "";

  // Content Quality V3 / Attention First V1 — deterministic creative directives.
  // Prefer the directive the workflow resolved (so prompt + storyboard + video
  // input share one mode); otherwise resolve it here from the strategy item and
  // optional regeneration salt. Same inputs -> same directive. Prompt-only: no
  // new JSON output field, no DB, no workflow change.
  const directives =
    input.directives ??
    pickCreativeDirectives(
      buildCreativeSeed(funnelLabel, topic, angle, input.creativeSeedSalt),
    );
  const creativeDirective = buildCreativeDirectiveBlock(directives);
  const modeBeatArc = directives.mode.narrativeBeats.join(" -> ");

  // Run Package Diversity V1 — present only for production-run items, so legacy
  // single-package generation keeps the prompt unchanged.
  const packageDiversityLines = input.packageDiversity
    ? buildPackageDiversityLines(input.packageDiversity)
    : [];

  // Attention First V1 — the priorities block. The audit found every mode
  // collapsing into the same safe marketing arc; this restates the goal of an
  // INTERNAL growth engine (attention/retention) over corporate brand-safety,
  // while the CREATIVE SAFETY rules in the directive still hard-block lies and
  // forbidden claims.
  const attentionFirstLines = [
    "ATTENTION FIRST (internal growth engine — optimize for attention & " +
      "retention, NOT corporate brand-safety):",
    "- Priority order: 1) scroll-stop, 2) watch time, 3) curiosity, " +
      "4) emotion / conflict / surprise. proof, benefit and CTA come AFTER " +
      "attention is earned — they serve the story, they are not the structure.",
    `- Follow the MODE BEATS above as the structure: ${modeBeatArc}. Do NOT fall ` +
      "back to a generic hook -> problem -> scenario -> proof -> CTA template.",
    "- Fully COMMIT to the mode: if humor, be genuinely funny; if shock, lead " +
      "with the actually surprising; if contrarian, take a real stance; if story, " +
      "stay in one scene. Never sand it down into safe, generic marketing.",
    "- Open ONE curiosity loop (tension / contrast / an unanswered question) in " +
      "the hook and pay it off LATE (the reveal / twist / punchline near the end), " +
      "never in the first sentence.",
    "- Bound by CREATIVE SAFETY above: no lies, no invented numbers / results, no " +
      "forbidden_claims, no product_is_not. Attention is NOT ragebait or fake claims.",
  ];

  // Content Quality Sprint 2 — hard length / pacing / forbidden rules. These
  // keep the short tight (15–25s), the narration punchy (40–70 words, never
  // > 80) and the structure on the preferred Hook -> Twist -> Payoff -> CTA arc,
  // and they explicitly forbid the long-explanation / background-story /
  // corporate-copy failure modes.
  const preferredArc = PREFERRED_STORY_ARC.map((b) =>
    b === "cta" ? "CTA" : b.charAt(0).toUpperCase() + b.slice(1),
  ).join(" -> ");
  const qualityLines = [
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
    `- PREFERRED STORY ARC: ${preferredArc}. Favor a real TWIST (an early turn / ` +
      "reversal) and land the PAYOFF late, just before the CTA. Map it onto the " +
      "MODE BEATS above — do not flatten it into a linear explanation.",
    "- FORBIDDEN (Zakázat): NO long explanations or lectures; NO background / " +
      "company-history story (who you are, when you were founded, your mission); " +
      "NO corporate copy or jargon (industry-leading, world-class, cutting-edge, " +
      'value proposition, "we are committed to ...", synergy, etc.). ' +
      "Speak like a person, not a brochure.",
  ];

  // Hook block. The final narration line differs for text-only (no visual beats).
  const hookLines = [
    "HOOK V2 (the first 3 seconds — make it dramatically stronger):",
    `- Write the hook in the "${directives.hook.id}" HOOK ARCHETYPE above: ${directives.hook.instruction}`,
    "- Open on a concrete moment: pull from the SCENARIO POOL, a sharp PAIN",
    "  POINT, or a striking PROOF point above. Never use a generic intro.",
    "- The hook must create curiosity or tension in one short, punchy line, and",
    "  set up a loop the rest of the video keeps open until the payoff.",
    ...(requireVideo
      ? [
          `- voiceover_text MUST open on that hook, then run the MODE BEATS (${modeBeatArc})`,
          "  narrated in the VOICE PERSONA and MODE above, so the narration maps onto",
          "  fast visual beats. Do NOT collapse it into a generic marketing template.",
        ]
      : [
          `- voiceover_text MUST open on that hook, then run the MODE BEATS (${modeBeatArc})`,
          "  written in the VOICE PERSONA and MODE above. It is the core body copy for",
          "  this TEXT-ONLY package (no video). Do NOT collapse it into a generic template.",
        ]),
  ];

  // Visual beats / image prompts only apply to video packages. They follow the
  // MODE BEATS (not the old marketing arc) so the visuals tell the mode's story
  // and escalate toward the reveal.
  const visualBeatsLines = requireVideo
    ? [
        "",
        `VISUAL BEATS: provide 3–${MAX_VIDEO_SCENE_STILLS} image_prompts. Each one is a`,
        "GENERATED still image, and a small set is enough to carry a 20–30s short",
        "(the stills are reused across the moving beats). Do NOT provide more than",
        `${MAX_VIDEO_SCENE_STILLS}. They should follow the MODE BEATS above`,
        `(${modeBeatArc}), but do NOT force one image per narration beat — fewer or`,
        "more narration labels is fine. Make the stills visually distinct from each",
        "other and escalate the tension / curiosity toward the reveal. Do NOT default",
        "to a generic, interchangeable beat set.",
        "Each image_prompt MUST describe a PURELY VISUAL scene. NEVER request",
        "readable text, words, letters, numbers, captions, signs, labels, UI,",
        "phone notifications, checklists or typography inside the image — image",
        "models render these as garbled noise. All messaging is delivered through",
        "the voiceover and burned-in subtitles, NOT inside the generated image.",
        "",
        "SCENE MEANING (priority over look):",
        "For each image prompt, first determine what a viewer should understand within one second.",
        "The image should communicate the main idea of the current scene using the Project Brain, Strategy Item and voiceover beat.",
        "Prioritize meaning over visual style.",
        "Describe concrete subjects, actions, environments and objects that naturally communicate that message.",
        "Do not default to generic modern offices, decorative abstract shapes or empty environments unless they are essential to the scene.",
        "",
        // Visual Style Guardrail V1 (Part 3) — anti dark/cinematic default;
        // scene-appropriate lighting and composition. Imagery only — never copy.
        visualStyleGuardrailBlock(),
        "",
        ...(input.visualProfileImagePromptBlock
          ? [input.visualProfileImagePromptBlock, ""]
          : []),
        videoSceneCompositionBlock(),
        "",
        "DEVICE SCREENS IN GENERATED STILLS:",
        "- If a scene shows a laptop, phone, monitor, or tablet, the screen must NEVER be blank white or empty.",
        "- The content displayed on a screen should visually reinforce the purpose of the current scene using recognizable interface layouts, imagery or structure without relying on readable text.",
        "- Do not generate empty laptop/phone/monitor screens.",
      ]
    : [];

  // Multiplier Variants MVP-1 — a platform that must produce N>1 outputs this
  // package emits N DISTINCT captions in caption_variants (one per output);
  // platforms producing a single output keep the historical single-caption
  // shape. variantCount falls back to 1 when no count is supplied.
  const variantCount = (p: string): number => {
    const n = input.variantCounts?.[p];
    return typeof n === "number" && Number.isFinite(n) && n > 1 ? Math.trunc(n) : 1;
  };
  const platformsWithVariants = targetPlatforms.filter((p) => variantCount(p) > 1);

  // JSON shape, assembled so the video/image_prompts fields are present only
  // when a video is required (video packages keep the exact historical shape).
  const platformOutputsBlock = targetPlatforms
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

  // Instruction block describing how the caption_variants must differ. Only
  // emitted when at least one platform needs multiple outputs, so single-output
  // packages keep the historical prompt verbatim.
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
    ...(requireVideo
      ? [
          `  "video": { "concept": "string", "script": "string", "duration_seconds": "string" },`,
          `  "visual_scenes": [`,
          ...buildPresentationJsonShapeLines({
            allowedTypes: promptPresentationTypes,
          }).map((line) => `  ${line}`),
          `  ],`,
        ]
      : []),
    ...(requireVideo ? [`  "image_prompts": ["string"],`] : []),
    `  "platform_outputs": {`,
    platformOutputsBlock,
    `  },`,
    `  "hashtags": ["string"],`,
    `  "asset_usage": [ { "asset_id": "uuid", "used_as": "string", "modify": "true|false" } ],`,
    `  "scenario": "the SCENARIO POOL line you drew on (verbatim), or \"\" if none"`,
    "}",
  ].join("\n");

  // Rules line. Video packages keep the historical wording verbatim; text-only
  // packages explicitly forbid a video and keep the schema-required narration.
  const rulesLine = requireVideo
    ? `Rules: funnel_stage MUST equal "${funnelLabel}". video is mandatory. ` +
      `Provide outputs for ALL of these platforms: ${targetPlatforms.join(", ")}. ` +
      "Never modify a STATIC asset. " +
      'If you used a scenario, set "scenario" to that pool line verbatim; ' +
      "otherwise set it to an empty string."
    : `Rules: funnel_stage MUST equal "${funnelLabel}". This is a TEXT-ONLY package: ` +
      'do NOT generate a video — omit the "video" field entirely. ' +
      `Provide outputs for ALL of these platforms: ${targetPlatforms.join(", ")}. ` +
      "Still produce voiceover_text (use it as the body copy) and subtitles (a short " +
      "text version) — they are required. Never modify a STATIC asset. " +
      'If you used a scenario, set "scenario" to that pool line verbatim; ' +
      "otherwise set it to an empty string.";

  // Mixed-package clarification (video packages that also target text-only
  // platforms). Appended only when mixed, so pure-video packages are unchanged.
  const mixedNote = isMixed
    ? [
        "",
        `MIXED PLATFORMS: video is required because ${videoPlatforms.join(", ")} ` +
          `${videoPlatforms.length === 1 ? "is a video platform" : "are video platforms"}. ` +
          "Produce ONE shared video for the package. The text-only platforms " +
          `(${textOnlyPlatforms.join(", ")}) still need their own platform-specific ` +
          "caption, CTA and hashtags — they simply do not get a separate video.",
      ]
    : [];

  return [
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
    funnelAssetPolicy,
    ...(assetCoverageBlock ? ["", assetCoverageBlock] : []),
    "",
    `STRATEGY ITEM: funnel_stage="${funnelLabel}" topic="${topic}" angle="${angle ?? ""}"`,
    `CTA type MUST be one of (goal=${project.goal_type}): ${allowedCtas.join(", ")}`,
    "",
    creativeDirective,
    "",
    ...(packageDiversityLines.length > 0 ? [...packageDiversityLines, ""] : []),
    ...attentionFirstLines,
    "",
    ...qualityLines,
    "",
    ...hookLines,
    ...visualBeatsLines,
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
    ...(input.sceneTypeHistoryBlock
      ? [input.sceneTypeHistoryBlock, ""]
      : []),
    buildPresentationGenerationBlock({
      allowedTypes: promptPresentationTypes,
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
    ...(generationMode === "sample"
      ? ["", buildSamplePackageRulesBlock()]
      : []),
    "",
    buildPlatformStyleBlock(targetPlatforms),
    "",
    "TASK: Produce ONE content package as JSON with this exact shape:",
    jsonShape,
    rulesLine,
    ...mixedNote,
    ...variantsLines,
  ].join("\n");
}
