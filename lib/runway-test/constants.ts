/**
 * Fixed pricing for the internal gen4_turbo single-scene test only.
 * Source: https://docs.dev.runwayml.com/guides/pricing/ (checked 2026-08-15)
 * - gen4_turbo: 5 credits per second of output
 * - 1 credit = $0.01
 * Not a general pricing engine.
 */
export const RUNWAY_TEST_PRICING = {
  model: "gen4_turbo",
  creditsPerSecond: 5,
  usdPerCredit: 0.01,
  sourceUrl: "https://docs.dev.runwayml.com/guides/pricing/",
  asOfDate: "2026-08-15",
} as const;

export function estimateRunwayTestCostUsd(durationSeconds: number): {
  credits: number;
  usd: number;
} {
  const credits = RUNWAY_TEST_PRICING.creditsPerSecond * durationSeconds;
  const usd = credits * RUNWAY_TEST_PRICING.usdPerCredit;
  return { credits, usd };
}
