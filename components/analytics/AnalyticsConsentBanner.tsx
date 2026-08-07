"use client";

import { useAnalyticsConsent } from "@/components/analytics/AnalyticsConsentProvider";
import styles from "./AnalyticsConsentBanner.module.css";

export function AnalyticsConsentBanner() {
  const { bannerVisible, accept, reject } = useAnalyticsConsent();

  if (!bannerVisible) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label="Cookie settings">
      <div className={styles.inner}>
        <p className={styles.text}>
          We use analytics cookies (Google Analytics and Meta Pixel) to measure
          traffic and ad performance. Choose whether to allow analytics.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.accept} onClick={accept}>
            Accept analytics
          </button>
          <button type="button" className={styles.reject} onClick={reject}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
