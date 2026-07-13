import {
  VIDEO_USAGE_RENDER_VALUES,
  type VideoUsageRenderMode,
} from "@/lib/assets/preferredVideoUsage";

export const CAPTURE_VIEWPORT_EDIT_VALUES = [
  "desktop",
  "tablet",
  "mobile",
  "not_applicable",
] as const;

export type CaptureViewportEditValue =
  (typeof CAPTURE_VIEWPORT_EDIT_VALUES)[number];

export function isCaptureViewportEditValue(
  value: string,
): value is CaptureViewportEditValue {
  return (CAPTURE_VIEWPORT_EDIT_VALUES as readonly string[]).includes(value);
}

export function isVideoUsageRenderValue(
  value: string,
): value is VideoUsageRenderMode {
  return (VIDEO_USAGE_RENDER_VALUES as readonly string[]).includes(value);
}

export const VIDEO_USAGE_ADMIN_LABELS: Record<VideoUsageRenderMode, string> = {
  fullscreen: "Fullscreen",
  fullscreen_contain: "Fullscreen contain",
  ui_hero: "UI Hero (large, no frame)",
  framed_screen: "Framed screen",
  framed_phone: "Framed phone",
  framed_laptop: "Framed laptop",
  framed_monitor: "Framed monitor",
  floating_card: "Floating card",
  background: "Background",
  proof: "Proof",
  reference: "Reference",
  comparison: "Comparison",
};

export const VIDEO_USAGE_ADMIN_HINTS: Record<VideoUsageRenderMode, string> = {
  fullscreen:
    "Asset může vyplnit celou vertikální scénu.",
  fullscreen_contain:
    "Celý asset na scéně bez ořezu (contain), bez Ken-Burns — typicky product UI.",
  ui_hero:
    "Velké product UI bez dalšího telefonu nebo browser rámečku.",
  framed_screen:
    "Asset bude vložen do obrazovky nebo rámečku (notebook, monitor, tablet).",
  framed_phone: "Asset bude zobrazen jako mobilní rozhraní v mockupu telefonu.",
  framed_laptop: "Asset bude zobrazen uvnitř mockupu notebooku.",
  framed_monitor: "Asset bude zobrazen uvnitř mockupu monitoru.",
  floating_card:
    "Asset se použije jako karta nebo vložený prvek, ne jako celoplošná scéna.",
  background: "Asset slouží jako jemné pozadí, ne jako hlavní produktový záběr.",
  proof: "Asset se používá jako důkaz, certifikát nebo prvek důvěry.",
  reference:
    "Asset je referenční nebo inspirační — typicky ne jako hlavní fullscreen záběr.",
  comparison:
    "Asset podporuje srovnání (např. před/po nebo vedle sebe v rámečku).",
};

export const CAPTURE_VIEWPORT_LABELS: Record<CaptureViewportEditValue, string> =
  {
    desktop: "Desktop",
    tablet: "Tablet",
    mobile: "Mobile",
    not_applicable: "Nepoužitelné (běžná fotografie)",
  };
