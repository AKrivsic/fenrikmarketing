import type { Json } from "@/lib/supabase/types";
import type { ScenePresentationStyling } from "@/lib/scene-types/visualScene";

export interface ChecklistBrandTokens {
  backgroundColor: string;
  foregroundColor: string;
  accentColor: string;
  marginX: number;
  marginTop: number;
  contentBottomY: number;
  subtitleSafeBottomPx: number;
  logoMaxWidth: number;
  logoMaxHeight: number;
  logoAssetId: string | null;
  /** Visual profile render hints (defaults applied in composers when omitted). */
  textScaleMultiplier?: number;
  accentOpacity?: number;
  cornerRadius?: number;
  markerScale?: number;
}

const DEFAULT_TOKENS: ChecklistBrandTokens = {
  backgroundColor: "#0f172a",
  foregroundColor: "#f8fafc",
  accentColor: "#38bdf8",
  marginX: 72,
  marginTop: 120,
  contentBottomY: 1500,
  subtitleSafeBottomPx: 420,
  logoMaxWidth: 200,
  logoMaxHeight: 64,
  logoAssetId: null,
};

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function safeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return HEX_COLOR.test(trimmed) ? trimmed : fallback;
}

function themeDefaults(theme: "dark" | "light" | "brand" | undefined): Pick<
  ChecklistBrandTokens,
  "backgroundColor" | "foregroundColor" | "accentColor"
> {
  if (theme === "light") {
    return {
      backgroundColor: "#f8fafc",
      foregroundColor: "#0f172a",
      accentColor: "#0284c7",
    };
  }
  if (theme === "brand") {
    return {
      backgroundColor: "#111827",
      foregroundColor: "#f9fafb",
      accentColor: "#6366f1",
    };
  }
  return {
    backgroundColor: DEFAULT_TOKENS.backgroundColor,
    foregroundColor: DEFAULT_TOKENS.foregroundColor,
    accentColor: DEFAULT_TOKENS.accentColor,
  };
}

export function resolveChecklistBrandTokens(args: {
  knowledge: Json | null | undefined;
  styling?: ScenePresentationStyling;
  payloadBackgroundStyle?: "dark" | "light" | "brand";
}): ChecklistBrandTokens {
  const root = asRecord(args.knowledge);
  const presentation = asRecord(root?.presentation);
  const brand = asRecord(presentation?.brand);
  const visual = asRecord(presentation?.visual);

  const theme = args.payloadBackgroundStyle ?? args.styling?.theme ?? "dark";
  const themed = themeDefaults(theme === "brand" ? "brand" : theme);

  const backgroundColor = safeHexColor(
    brand?.background_color ?? visual?.background_color,
    themed.backgroundColor,
  );
  const foregroundColor = safeHexColor(
    brand?.text_color ?? visual?.text_color,
    themed.foregroundColor,
  );
  const accentColor = safeHexColor(
    args.styling?.accent ?? brand?.accent_color ?? visual?.accent_color,
    themed.accentColor,
  );

  const logoAssetId =
    typeof brand?.logo_asset_id === "string" && brand.logo_asset_id.trim()
      ? brand.logo_asset_id.trim()
      : typeof visual?.logo_asset_id === "string" && visual.logo_asset_id.trim()
        ? visual.logo_asset_id.trim()
        : null;

  return {
    ...DEFAULT_TOKENS,
    backgroundColor,
    foregroundColor,
    accentColor,
    logoAssetId,
  };
}
