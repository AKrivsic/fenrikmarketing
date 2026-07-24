/**
 * Legacy Presentation prompt entrypoint removed with Creative Engine.
 * Content Package generation lives in lib/content-pipeline/.
 *
 * This module keeps shared package-prompt helpers and types still imported
 * by package-diversity / platform-style utilities and older check scripts.
 */

export type { AssetRef } from "@/lib/assets/assetRef";
export type {
  PlatformStyleSpec,
} from "@/lib/ai/prompts/platformStyles";
export {
  PLATFORM_STYLE_SPECS,
  PLATFORM_NATIVE_WRITING_HEADER,
  buildPlatformNativeWritingRulesBlock,
  buildPlatformStyleBlock,
} from "@/lib/ai/prompts/platformStyles";
export {
  buildSamplePackageRulesBlock,
  buildSampleModePromptAppendix,
} from "@/lib/ai/prompts/sampleModePrompt";

/** One sibling package already produced for the same production run. */
export interface PreviousPackageAngle {
  title: string;
  hook?: string | null;
  topic?: string | null;
}

export interface PackageDiversitySpec {
  packageIndex: number;
  packageCount?: number;
  angleLens?: string;
  previousAngles?: PreviousPackageAngle[];
  painPoint?: string;
  painPointMode?: "primary" | "supporting";
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

export function buildGeneratePackageSystem(requireVideo: boolean): string {
  return (
    PACKAGE_SYSTEM_INTRO +
    (requireVideo ? PACKAGE_SYSTEM_VIDEO : PACKAGE_SYSTEM_TEXT_ONLY)
  );
}

export const GENERATE_PACKAGE_SYSTEM = buildGeneratePackageSystem(true);
