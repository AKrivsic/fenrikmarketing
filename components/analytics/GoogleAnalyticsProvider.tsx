"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { useAnalyticsConsent } from "@/components/analytics/AnalyticsConsentProvider";

const EXCLUDED_PATH_PREFIXES = [
  "/admin",
  "/projects",
  "/review",
  "/settings",
];

export function GoogleAnalyticsProvider() {
  const pathname = usePathname();
  const { analyticsAllowed } = useAnalyticsConsent();
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!gaId || !analyticsAllowed) return null;

  const isExcluded = EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isExcluded) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
