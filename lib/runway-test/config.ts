import { RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16 } from "@/lib/ai/runway";
import { estimateRunwayTestCostUsd } from "@/lib/runway-test/constants";

export {
  estimateRunwayTestCostUsd,
  RUNWAY_TEST_PRICING,
} from "@/lib/runway-test/constants";

/** Fixed parameters for the first internal Runway scene test (read-only in UI). */
export const RUNWAY_SCENE_TEST_CONFIG = {
  provider: "runway" as const,
  model: "gen4_turbo" as const,
  durationSeconds: 5,
  ratio: "720:1280" as const,
  motionPromptMaxUtf16: RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16,
  /** Signed URL TTL for Runway to fetch the private still (seconds). */
  sourceSignedUrlTtlSeconds: 15 * 60,
  /** Signed URL TTL for admin preview / playback (seconds). */
  playbackSignedUrlTtlSeconds: 60 * 60,
  /** Max MP4 download size from Runway output. */
  maxOutputBytes: 80 * 1024 * 1024,
  buttonLabel: "Vygenerovat 5s klip — odhad $0.25",
} as const;

export const RUNWAY_SCENE_TEST_COST = estimateRunwayTestCostUsd(
  RUNWAY_SCENE_TEST_CONFIG.durationSeconds,
);

export function formatRunwayTestCostLabel(): string {
  return `$${RUNWAY_SCENE_TEST_COST.usd.toFixed(2)}`;
}
