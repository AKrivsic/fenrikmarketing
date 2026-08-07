"use client";

import { useEffect } from "react";
import { ensureFirstTouchCapturedInSession } from "@/lib/analytics/attribution";

/**
 * Captures first-touch UTM/fbclid/landing/referrer into sessionStorage once
 * per browser session. Mount early on public pages.
 */
export function FirstTouchAttributionCapture() {
  useEffect(() => {
    ensureFirstTouchCapturedInSession();
  }, []);

  return null;
}
