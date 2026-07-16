import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import type { Project } from "@/lib/supabase/types";
import { normalizePresentationText } from "@/lib/scene-types/presentation/textMatch";

export interface ProjectAssetSignal {
  id: string;
  title: string;
  mobileUi: boolean;
  phonePresentation: boolean;
}

export interface ProjectPresentationSignals {
  mobileProductCapable: boolean;
  mobileAssetIds: Set<string>;
  assets: ProjectAssetSignal[];
}

const MOBILE_PRODUCT_PATTERN =
  /\b(mobile app|native app|ios app|android app|chatbot|chat widget|chat interface|in-app|mobile product|saas app|web app|application)\b/i;

export function deriveProjectPresentationSignals(args: {
  project: Pick<Project, "product_is" | "product_strengths">;
  assets: ProjectAssetSignal[];
}): ProjectPresentationSignals {
  const haystack = [
    ...args.project.product_is,
    ...args.project.product_strengths,
  ]
    .join(" ")
    .toLowerCase();

  const mobileProductCapable = MOBILE_PRODUCT_PATTERN.test(haystack);

  const mobileAssetIds = new Set<string>();
  for (const asset of args.assets) {
    if (asset.mobileUi || asset.phonePresentation) {
      mobileAssetIds.add(asset.id);
    }
  }

  return {
    mobileProductCapable:
      mobileProductCapable || mobileAssetIds.size > 0,
    mobileAssetIds,
    assets: args.assets,
  };
}

export function assetSignalsFromRef(ref: AssetRef): ProjectAssetSignal {
  const preferred = String(ref.preferred_presentation ?? "").toLowerCase();
  const videoUsage = String(ref.preferred_video_usage ?? "").toLowerCase();
  const title = (ref.title ?? "").toLowerCase();
  const detected = String(ref.detected_content_type ?? "").toLowerCase();
  const suggested = String(ref.suggested_usage ?? "").toLowerCase();

  const phonePresentation =
    preferred === "phone_screen" ||
    videoUsage === "framed_phone" ||
    videoUsage.includes("phone");

  const mobileUi =
    phonePresentation ||
    /\b(mobile|app ui|phone screen|chat|mobile_ui|app screenshot|chat screenshot)\b/.test(
      `${title} ${detected} ${suggested}`,
    );

  return {
    id: ref.id,
    title: ref.title ?? "",
    mobileUi,
    phonePresentation,
  };
}

export function assetSignalsFromRow(row: {
  id: string;
  title: string | null;
  metadata: unknown;
}): ProjectAssetSignal {
  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const smart = meta.smart_usage;
  const smartRec =
    smart && typeof smart === "object" && !Array.isArray(smart)
      ? (smart as Record<string, unknown>)
      : {};
  const preferred = String(smartRec.preferred_presentation ?? "").toLowerCase();
  const videoUsage = String(meta.preferred_video_usage ?? "").toLowerCase();
  const title = (row.title ?? "").toLowerCase();

  const phonePresentation =
    preferred === "phone_screen" ||
    videoUsage === "framed_phone" ||
    videoUsage.includes("phone");

  const mobileUi =
    phonePresentation ||
    /\b(mobile|app ui|phone screen|chat)\b/.test(title);

  return {
    id: row.id,
    title: row.title ?? "",
    mobileUi,
    phonePresentation,
  };
}

/** Mobile / social / creator workflow cues — keeps restaurant/atmosphere beats out. */
const PHONE_NARRATION_PATTERN =
  /\b(app|mobile|phone|tap|swipe|scroll|scrolling|notification|notifications|chat|screen|dashboard|login|sign in|in-app|feed|feeds|post|posts|publish|publishing|inbox|dm|dms|story|stories|tiktok|instagram|linkedin|reels?|shorts?|social)\b/i;

export function narrationSupportsPhoneBeat(narration: string): boolean {
  return PHONE_NARRATION_PATTERN.test(normalizePresentationText(narration));
}
