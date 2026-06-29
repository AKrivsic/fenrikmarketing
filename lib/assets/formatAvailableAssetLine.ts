import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import {
  preferredUsagePromptHint,
  resolvePreferredVideoUsageFromRef,
} from "@/lib/assets/preferredVideoUsage";

function trimOrNull(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

// True when the ref carries optional prompt context beyond the legacy single line.
export function assetRefHasPromptContext(ref: AssetRef): boolean {
  return Boolean(
    ref.product_role ||
      ref.ai_description ||
      ref.detected_content_type ||
      ref.suggested_usage ||
      ref.trust_signal === true ||
      ref.orientation ||
      ref.preferred_presentation ||
      ref.video_suitability ||
      ref.safe_vertical_usage != null ||
      ref.aspect_ratio != null ||
      ref.visual_importance ||
      ref.asset_quality ||
      ref.preferred_video_usage ||
      ref.capture_viewport,
  );
}

function preferredHintLine(ref: AssetRef): string {
  const preferred =
    ref.preferred_video_usage ?? resolvePreferredVideoUsageFromRef(ref);
  return `  ${preferredUsagePromptHint(preferred)}`;
}

// Formats one asset for the AVAILABLE ASSETS prompt block. Every asset includes
// a Preferred usage line (runtime classification, not stored in DB).
export function formatAvailableAssetPromptLine(ref: AssetRef): string {
  const legacy = `- id=${ref.id} class=${ref.asset_class} type=${ref.media_type} "${ref.title}"`;
  if (!assetRefHasPromptContext(ref)) {
    return `${legacy}\n${preferredHintLine(ref)}`;
  }

  const parts: string[] = [legacy];
  if (ref.product_role) parts.push(`  role=${ref.product_role}`);
  if (ref.asset_quality) parts.push(`  quality=${ref.asset_quality}`);
  if (ref.trust_signal === true) parts.push(`  trust=true`);
  if (ref.orientation) parts.push(`  orientation=${ref.orientation}`);
  if (ref.preferred_presentation) {
    parts.push(`  preferred_presentation=${ref.preferred_presentation}`);
  }
  if (ref.video_suitability) parts.push(`  video_suitability=${ref.video_suitability}`);
  if (ref.safe_vertical_usage === true) parts.push(`  safe_vertical_usage=true`);
  if (ref.safe_vertical_usage === false) parts.push(`  safe_vertical_usage=false`);
  if (ref.capture_viewport) parts.push(`  capture_viewport=${ref.capture_viewport}`);
  if (ref.aspect_ratio !== undefined && ref.aspect_ratio !== null) {
    parts.push(`  aspect_ratio=${ref.aspect_ratio}`);
  }
  if (ref.visual_importance) parts.push(`  visual_importance=${ref.visual_importance}`);
  const kind = trimOrNull(ref.detected_content_type, 80);
  if (kind) parts.push(`  kind=${JSON.stringify(kind)}`);
  const desc = trimOrNull(ref.ai_description, 200);
  if (desc) parts.push(`  desc=${JSON.stringify(desc)}`);
  const usage = trimOrNull(ref.suggested_usage, 160);
  if (usage) parts.push(`  usage=${JSON.stringify(usage)}`);
  parts.push(preferredHintLine(ref));
  return parts.join("\n");
}
