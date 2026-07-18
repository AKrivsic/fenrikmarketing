import type { Project } from "@/lib/supabase/types";
import {
  CTA_TYPES_BY_GOAL,
  normalizeFunnelStage,
  REQUIRED_PACKAGE_PLATFORMS,
  type FunnelStage,
} from "@/lib/ai/types";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import type { ContentStrategyPlanOutput } from "@/lib/ai/schemas/contentStrategyPlan";
import type { WeeklyStrategyOutput } from "@/lib/ai/schemas/weeklyStrategy";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import { MIN_TREND_RELEVANCE } from "@/lib/ai/schemas/trendRelevanceScore";
import { MAX_VIDEO_SCENE_STILLS } from "@/lib/video-engine/storyboard";

// Business guardrails enforced AFTER structural validation. These encode the
// product rules from the spec; a non-empty issue list triggers reject /
// regenerate in the workflow runner.

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

// Scan free text for any forbidden / "product_is_not" phrase (case-insensitive
// substring match). Returns the offending phrases.
function findForbiddenPhrases(text: string, phrases: string[]): string[] {
  const haystack = text.toLowerCase();
  return phrases.filter(
    (phrase) => phrase.trim() && haystack.includes(phrase.toLowerCase()),
  );
}

// --- Content Quality Sprint 2 --------------------------------------------

// Voiceover length budget (words). The TARGET keeps the spoken track inside the
// hard 15–25s video window (≈2.6 words/s); the HARD CAP is the only value the
// guardrail rejects on, so a short-but-valid narration is never blocked. The
// min/max are prompt guidance only (see lib/ai/prompts/generateContentPackage).
export const VOICEOVER_TARGET_MIN_WORDS = 40;
export const VOICEOVER_TARGET_MAX_WORDS = 70;
export const VOICEOVER_HARD_CAP_WORDS = 80;

// Corporate / "background story" copy is forbidden in short-form content
// (Zakázat). These are unambiguous corporate clichés and company-history
// openers — short, native scripts never need them, so flagging them triggers a
// regenerate. Matched case-insensitively as substrings, EN + CS.
export const CORPORATE_COPY_PHRASES: readonly string[] = [
  "industry-leading",
  "industry leading",
  "best-in-class",
  "best in class",
  "world-class",
  "world class",
  "market-leading",
  "market leading",
  "cutting-edge",
  "cutting edge",
  "state-of-the-art",
  "state of the art",
  "value proposition",
  "core competenc",
  "synerg",
  "we are committed to",
  "committed to delivering",
  "our mission is",
  "we pride ourselves",
  "founded in",
  "established in",
  "since our founding",
  "our company was",
  // Czech
  "jsme lídrem na trhu",
  "špičkové řešení",
  "komplexní řešení",
  "naše společnost byla",
  "naším posláním",
  "byla založena v roce",
  "jsme hrdí na",
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// --- Weekly Strategy -----------------------------------------------------

export function checkWeeklyStrategyGuardrails(
  strategy: WeeklyStrategyOutput,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!strategy.week_start) issues.push(issue("$.week_start", "required"));
  if (!strategy.week_end) issues.push(issue("$.week_end", "required"));
  if (strategy.content_plan.length === 0) {
    issues.push(issue("$.content_plan", "must contain at least one item"));
  }

  // Every plan item must carry a funnel_stage that normalizes to a canonical
  // value. This also forbids the legacy "consideration" / "retention" stages,
  // which are not part of the architecture.
  strategy.content_plan.forEach((item, i) => {
    if (!normalizeFunnelStage(item.funnel_stage)) {
      issues.push(
        issue(
          `$.content_plan[${i}].funnel_stage`,
          "required canonical funnel stage (consideration/retention are not allowed)",
        ),
      );
    }
  });

  // funnel_distribution must not be Conversion-only.
  if (isConversionOnly(strategy)) {
    issues.push(
      issue(
        "$.funnel_distribution",
        "must not be Conversion-only (include awareness / problem_aware / solution_aware)",
      ),
    );
  }

  return issues;
}

// --- Production strategy plan (no calendar week fields) --------------------

export function checkContentStrategyPlanGuardrails(
  plan: ContentStrategyPlanOutput,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (plan.content_plan.length === 0) {
    issues.push(issue("$.content_plan", "must contain at least one item"));
  }

  plan.content_plan.forEach((item, i) => {
    if (!normalizeFunnelStage(item.funnel_stage)) {
      issues.push(
        issue(
          `$.content_plan[${i}].funnel_stage`,
          "required canonical funnel stage (consideration/retention are not allowed)",
        ),
      );
    }
  });

  if (isConversionOnlyPlan(plan)) {
    issues.push(
      issue(
        "$.funnel_distribution",
        "must not be Conversion-only (include awareness / problem_aware / solution_aware)",
      ),
    );
  }

  return issues;
}

export function checkContentPlanLength(
  plan: Pick<ContentStrategyPlanOutput, "content_plan">,
  expectedCount: number,
): ValidationIssue[] {
  if (plan.content_plan.length !== expectedCount) {
    return [
      issue(
        "$.content_plan",
        `must contain exactly ${expectedCount} item(s), got ${plan.content_plan.length}`,
      ),
    ];
  }
  return [];
}

// Production planner — minimum distinct funnel stages by run size.
export function requiredDistinctFunnelStages(packageCount: number): number {
  if (packageCount <= 1) return 1;
  if (packageCount <= 5) return 2;
  return 3;
}

export function checkContentPlanFunnelDiversity(
  plan: Pick<ContentStrategyPlanOutput, "content_plan">,
  packageCount: number,
): ValidationIssue[] {
  const required = requiredDistinctFunnelStages(packageCount);
  const stages = new Set<FunnelStage>();
  for (const item of plan.content_plan) {
    const stage = normalizeFunnelStage(item.funnel_stage);
    if (stage) stages.add(stage);
  }
  if (stages.size >= required) return [];
  return [
    issue(
      "$.content_plan",
      `content_plan must include at least ${required} distinct funnel stages for packageCount=${packageCount}`,
    ),
  ];
}

export function checkContentPlanSources(
  plan: Pick<ContentStrategyPlanOutput, "content_plan">,
  ctx: WeeklyStrategySourceContext,
): ValidationIssue[] {
  return checkWeeklyStrategySources(
    { content_plan: plan.content_plan } as WeeklyStrategyOutput,
    ctx,
  );
}

function isConversionOnlyPlan(
  plan: Pick<ContentStrategyPlanOutput, "content_plan" | "funnel_distribution">,
): boolean {
  return isConversionOnly(
    plan as WeeklyStrategyOutput,
  );
}

function isConversionOnly(strategy: WeeklyStrategyOutput): boolean {
  // Sum distribution by normalized stage key (tolerates human labels / DB
  // values; ignores anything non-canonical).
  let conversionDist = 0;
  let nonConversionDist = 0;
  for (const [key, value] of Object.entries(strategy.funnel_distribution)) {
    const stage = normalizeFunnelStage(key);
    if (!stage) continue;
    if (stage === "conversion") conversionDist += value;
    else nonConversionDist += value;
  }
  const distIsConversionOnly = conversionDist > 0 && nonConversionDist === 0;

  const planStages = new Set<FunnelStage>();
  for (const item of strategy.content_plan) {
    const stage = normalizeFunnelStage(item.funnel_stage);
    if (stage) planStages.add(stage);
  }
  const planIsConversionOnly =
    planStages.size > 0 && planStages.size === 1 && planStages.has("conversion");
  const planHasNonConversion = [...planStages].some((s) => s !== "conversion");

  // Violation when the plan collapses to conversion, or the distribution is
  // conversion-only and the plan provides no non-conversion stage.
  return planIsConversionOnly || (distIsConversionOnly && !planHasNonConversion);
}

// Per content_plan item source rules. Kept as a separate pure function because
// they need an external trend-score lookup (Trend Engine) that the workflow
// already enforces by filtering; this makes the rules independently testable.
export interface WeeklyStrategySourceContext {
  // trend_id -> relevance score (null/undefined when unscored).
  trendScores: Record<string, number | null | undefined>;
  // When true, content_plan items may omit trend_id and evergreen_topic_id and
  // anchor topics in Product Brain (no eligible trends or evergreen rows).
  allowProductBrainTopics?: boolean;
}

export function checkWeeklyStrategySources(
  strategy: WeeklyStrategyOutput,
  ctx: WeeklyStrategySourceContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  strategy.content_plan.forEach((item, i) => {
    // Each item must target a platform.
    if (!item.platform) {
      issues.push(issue(`$.content_plan[${i}].platform`, "platform is required"));
    }

    // Each item must have a topic source (trend or evergreen), unless both
    // lists were empty and Product Brain drives topics instead.
    const hasTopicSource = Boolean(item.trend_id || item.evergreen_topic_id);
    if (!hasTopicSource && !ctx.allowProductBrainTopics) {
      issues.push(
        issue(
          `$.content_plan[${i}].topic_source`,
          "trend_id or evergreen_topic_id is required",
        ),
      );
    }

    // A trend-sourced item must reference a trend scored >= the minimum.
    if (item.trend_id) {
      const score = ctx.trendScores[item.trend_id];
      if (typeof score !== "number" || score < MIN_TREND_RELEVANCE) {
        issues.push(
          issue(
            `$.content_plan[${i}].trend_id`,
            `trend relevance score must be >= ${MIN_TREND_RELEVANCE}`,
          ),
        );
      }
    }
  });

  return issues;
}

// --- Content Package -----------------------------------------------------

export interface PackageGuardrailContext {
  project: Pick<Project, "goal_type" | "forbidden_claims" | "product_is_not">;
  weeklyStrategyId: string | null;
  strategyItemId: string | null;
  strategyItemFunnelStage: FunnelStage | null;
  // The platform surfaces this package must produce. Defaults to the full
  // REQUIRED_PACKAGE_PLATFORMS set (existing behavior); callers that respect a
  // project's selected platforms pass the resolved subset so guardrails validate
  // the generated outputs against projects.platforms.
  requiredPlatforms?: readonly string[];
  // Whether a video block is mandatory. Defaults to true (existing behavior).
  // Set to false for text-only packages (no selected platform requires video),
  // so a package without a video block is still valid.
  requireVideo?: boolean;
}

export function checkContentPackageGuardrails(
  pkg: ContentPackageOutput,
  ctx: PackageGuardrailContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Strategic context is mandatory: no isolated content packages.
  if (!ctx.weeklyStrategyId) {
    issues.push(issue("$.weekly_strategy_id", "required (no isolated package)"));
  }
  if (!ctx.strategyItemId) {
    issues.push(issue("$.strategy_item_id", "required"));
  }

  // Mandatory media + narration fields. Video is required only when the package
  // has at least one video platform (requireVideo defaults to true). voiceover_text
  // / subtitles stay required: voiceover_text also backs content_items.body for
  // text-only platforms.
  const requireVideo = ctx.requireVideo ?? true;
  if (requireVideo && (!pkg.video || !pkg.video.concept || !pkg.video.script)) {
    issues.push(issue("$.video", "video is mandatory for every package"));
  }
  if (!pkg.voiceover_text) issues.push(issue("$.voiceover_text", "required"));
  if (!pkg.subtitles) issues.push(issue("$.subtitles", "required"));

  // Required platform outputs. Validated against the project's selected
  // platforms when provided, otherwise the full required set.
  const requiredPlatforms = ctx.requiredPlatforms ?? REQUIRED_PACKAGE_PLATFORMS;
  const platformOutputs = (pkg.platform_outputs ?? {}) as Record<
    string,
    { caption?: string } | undefined
  >;
  for (const platform of requiredPlatforms) {
    const output = platformOutputs[platform];
    if (!output || !output.caption) {
      issues.push(
        issue(`$.platform_outputs.${platform}`, "platform output required"),
      );
    }
  }

  // funnel_stage must normalize to a canonical value (forbids
  // consideration/retention) and, after normalization, match the strategy item.
  const pkgStage = normalizeFunnelStage(pkg.funnel_stage);
  if (!pkgStage) {
    issues.push(
      issue(
        "$.funnel_stage",
        "invalid funnel stage (consideration/retention are not allowed)",
      ),
    );
  } else if (ctx.strategyItemFunnelStage && pkgStage !== ctx.strategyItemFunnelStage) {
    issues.push(
      issue(
        "$.funnel_stage",
        `must match strategy item funnel_stage (${ctx.strategyItemFunnelStage})`,
      ),
    );
  }

  // CTA type must match project.goal_type.
  const allowedCtas = CTA_TYPES_BY_GOAL[ctx.project.goal_type] ?? [];
  if (pkg.cta?.type && !allowedCtas.includes(pkg.cta.type)) {
    issues.push(
      issue(
        "$.cta.type",
        `cta type "${pkg.cta.type}" not allowed for goal ${ctx.project.goal_type} (allowed: ${allowedCtas.join(", ")})`,
      ),
    );
  }

  // forbidden_claims + product_is_not must not appear anywhere in copy.
  const copy = collectPackageText(pkg);
  const forbidden = findForbiddenPhrases(copy, ctx.project.forbidden_claims);
  for (const phrase of forbidden) {
    issues.push(issue("$", `forbidden_claim present: "${phrase}"`));
  }
  const productIsNot = findForbiddenPhrases(copy, ctx.project.product_is_not);
  for (const phrase of productIsNot) {
    issues.push(issue("$", `product_is_not claim present: "${phrase}"`));
  }

  // Content Quality Sprint 2 — voiceover hard length cap. The narration backs
  // the video and the text-only body, so a bloated voiceover means a too-long
  // video and a long-winded post. Reject anything over the hard cap; the 40–70
  // word target stays prompt-side guidance only (no min reject).
  if (pkg.voiceover_text) {
    const words = countWords(pkg.voiceover_text);
    if (words > VOICEOVER_HARD_CAP_WORDS) {
      issues.push(
        issue(
          "$.voiceover_text",
          `voiceover_text is ${words} words; hard cap is ${VOICEOVER_HARD_CAP_WORDS} (target ${VOICEOVER_TARGET_MIN_WORDS}–${VOICEOVER_TARGET_MAX_WORDS})`,
        ),
      );
    }
  }

  // Content Quality Sprint 2 — forbid corporate / company-history copy in
  // short-form content (Zakázat). Any clichéd corporate phrase triggers a
  // regenerate so scripts stay native, not brochure copy.
  const corporate = findForbiddenPhrases(copy, [...CORPORATE_COPY_PHRASES]);
  for (const phrase of corporate) {
    issues.push(issue("$", `corporate/background-story copy present: "${phrase}"`));
  }

  // MVP scene/image cost cap — a video package drives one GENERATED still per
  // image_prompt (1 video = ≤MAX_VIDEO_SCENE_STILLS stills = ≤that many image
  // generations). Require at least one prompt and reject inflated sets so a
  // single short can never queue 6–8 image generations. Text-only packages have
  // no video and no image_prompts, so this only applies when video is required.
  if (requireVideo) {
    const prompts = (pkg.image_prompts ?? []).filter(
      (p) => typeof p === "string" && p.trim().length > 0,
    );
    if (prompts.length < 1 || prompts.length > MAX_VIDEO_SCENE_STILLS) {
      issues.push(
        issue(
          "$.image_prompts",
          `image_prompts must contain 1–${MAX_VIDEO_SCENE_STILLS} prompts`,
        ),
      );
    }

    const blankScreenPattern =
      /\b(blank|empty)\s+(white\s+)?(screen|display|monitor)\b/i;
    for (let i = 0; i < prompts.length; i++) {
      if (blankScreenPattern.test(prompts[i])) {
        issues.push(
          issue(
            `$.image_prompts[${i}]`,
            "image_prompt must not describe a blank or empty device screen (use blurred UI instead)",
          ),
        );
      }
    }
  }

  // Sprint 4B — platform-native writing quality (final writing layer only).
  const platformNativeIssues = checkPlatformNativeWriting(pkg);
  issues.push(...platformNativeIssues);

  return issues;
}

/** YouTube Shorts SEO-article openers that must not appear in captions. */
export const YOUTUBE_SHORTS_SEO_OPENERS: readonly string[] = [
  "this video breaks down",
  "in this video",
  "watch to learn",
  "if you've ever wondered",
  "this short explains",
  "this video explains",
  "in today's video",
];

export const YOUTUBE_SHORTS_CAPTION_HARD_CAP_WORDS = 55;
export const X_CAPTION_HARD_CAP_CHARS = 280;

/**
 * Sprint 4B guardrails: native platform writing (not strategy/Product Brain).
 */
export function checkPlatformNativeWriting(
  pkg: ContentPackageOutput,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const outputs = (pkg.platform_outputs ?? {}) as Record<
    string,
    | {
        caption?: string;
        caption_variants?: string[];
      }
    | undefined
  >;
  const vo = (pkg.voiceover_text ?? "").trim();

  const youtube = outputs.youtube;
  if (youtube?.caption) {
    const caption = youtube.caption.trim();
    const lower = caption.toLowerCase();
    for (const opener of YOUTUBE_SHORTS_SEO_OPENERS) {
      if (lower.startsWith(opener) || lower.includes(`${opener} `)) {
        issues.push(
          issue(
            "$.platform_outputs.youtube.caption",
            `YouTube Shorts caption uses SEO/article opener "${opener}" — write a short curiosity caption instead`,
          ),
        );
        break;
      }
    }
    const words = countWords(caption);
    if (words > YOUTUBE_SHORTS_CAPTION_HARD_CAP_WORDS) {
      issues.push(
        issue(
          "$.platform_outputs.youtube.caption",
          `YouTube Shorts caption is ${words} words; hard cap is ${YOUTUBE_SHORTS_CAPTION_HARD_CAP_WORDS} (native Shorts, not SEO description)`,
        ),
      );
    }
  }

  const x = outputs.x;
  if (x?.caption && x.caption.length > X_CAPTION_HARD_CAP_CHARS) {
    issues.push(
      issue(
        "$.platform_outputs.x.caption",
        `X caption is ${x.caption.length} chars; hard cap is ${X_CAPTION_HARD_CAP_CHARS}`,
      ),
    );
  }

  // Reject captions that are near-copies of the voiceover (same first 12 words).
  if (vo) {
    const voHead = normalizeWords(vo).slice(0, 12).join(" ");
    if (voHead.length >= 24) {
      for (const [platform, output] of Object.entries(outputs)) {
        const caption = output?.caption?.trim();
        if (!caption) continue;
        const capHead = normalizeWords(caption).slice(0, 12).join(" ");
        if (capHead === voHead) {
          issues.push(
            issue(
              `$.platform_outputs.${platform}.caption`,
              "caption duplicates the voiceover opening — rewrite as platform-native copy",
            ),
          );
        }
      }
    }
  }

  // X variant hook diversity: first 5 words must differ across variants.
  const variants = x?.caption_variants?.filter(
    (c): c is string => typeof c === "string" && c.trim().length > 0,
  );
  if (variants && variants.length >= 2) {
    const heads = variants.map((c) =>
      normalizeWords(c).slice(0, 5).join(" "),
    );
    const unique = new Set(heads.filter(Boolean));
    if (unique.size < Math.min(variants.length, heads.filter(Boolean).length)) {
      issues.push(
        issue(
          "$.platform_outputs.x.caption_variants",
          "X caption_variants must open with different hooks (first 5 words must differ)",
        ),
      );
    }
  }

  return issues;
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function collectPackageText(pkg: ContentPackageOutput): string {
  const parts: string[] = [
    pkg.title,
    pkg.hook,
    pkg.voiceover_text,
    pkg.subtitles,
    pkg.cta?.text ?? "",
    pkg.video?.concept ?? "",
    pkg.video?.script ?? "",
  ];
  for (const output of Object.values(pkg.platform_outputs ?? {})) {
    if (output) {
      parts.push(output.caption ?? "");
      parts.push(output.cta ?? "");
    }
  }
  return parts.join("\n");
}

// --- Asset rules ---------------------------------------------------------
// STATIC  -> used as-is, must not be modified (no variant).
// EDITABLE -> may be modified / produce a variant.
// REFERENCE -> inspiration only, never attached as a final asset.
// asset_mode mapping (existing enum has no dedicated column for this):
//   source | template  => treated as STATIC unless metadata.editable === true
//   generated | edited  => treated as EDITABLE
// Modification of a STATIC asset is rejected here.

export type AssetClass = "static" | "editable" | "reference";

export function classifyAsset(
  assetMode: string,
  metadata: Record<string, unknown> | null,
): AssetClass {
  const explicit = metadata?.["asset_class"];
  if (explicit === "static" || explicit === "editable" || explicit === "reference") {
    return explicit;
  }
  if (assetMode === "generated" || assetMode === "edited") return "editable";
  if (metadata?.["editable"] === true) return "editable";
  return "static";
}

export function checkAssetModification(
  assetClass: AssetClass,
  wantsModification: boolean,
): ValidationIssue | null {
  if (assetClass === "static" && wantsModification) {
    return issue("$.asset_usage", "STATIC asset must not be modified");
  }
  return null;
}
