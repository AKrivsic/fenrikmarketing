export const ANALYTICS_CONSENT_STORAGE_KEY = "fenrik_analytics_consent_v1";

export type AnalyticsConsentStatus = "accepted" | "rejected";

export function parseAnalyticsConsent(
  raw: string | null | undefined,
): AnalyticsConsentStatus | null {
  if (raw === "accepted" || raw === "rejected") return raw;
  return null;
}

export function hasAnalyticsConsent(
  status: AnalyticsConsentStatus | null,
): boolean {
  return status === "accepted";
}
