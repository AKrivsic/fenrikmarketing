"use client";

import { useAnalyticsConsent } from "@/components/analytics/AnalyticsConsentProvider";
import styles from "./CookieSettingsButton.module.css";

export function CookieSettingsButton() {
  const { openSettings } = useAnalyticsConsent();

  return (
    <button type="button" className={styles.button} onClick={openSettings}>
      Cookie settings
    </button>
  );
}
