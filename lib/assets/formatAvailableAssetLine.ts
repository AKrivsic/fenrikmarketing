import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";

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
      ref.trust_signal === true,
  );
}

// Formats one asset for the AVAILABLE ASSETS prompt block. When no optional
// fields are set, the line is byte-identical to the historical format.
export function formatAvailableAssetPromptLine(ref: AssetRef): string {
  const legacy = `- id=${ref.id} class=${ref.asset_class} type=${ref.media_type} "${ref.title}"`;
  if (!assetRefHasPromptContext(ref)) return legacy;

  const parts: string[] = [legacy];
  if (ref.product_role) parts.push(`  role=${ref.product_role}`);
  if (ref.trust_signal === true) parts.push(`  trust=true`);
  const kind = trimOrNull(ref.detected_content_type, 80);
  if (kind) parts.push(`  kind=${JSON.stringify(kind)}`);
  const desc = trimOrNull(ref.ai_description, 200);
  if (desc) parts.push(`  desc=${JSON.stringify(desc)}`);
  const usage = trimOrNull(ref.suggested_usage, 160);
  if (usage) parts.push(`  usage=${JSON.stringify(usage)}`);
  return parts.join("\n");
}
