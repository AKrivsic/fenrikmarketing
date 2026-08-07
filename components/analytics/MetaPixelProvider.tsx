"use client";

import { useEffect, useRef } from "react";
import { useAnalyticsConsent } from "@/components/analytics/AnalyticsConsentProvider";
import type { FbqFunction } from "@/lib/analytics/metaPixel";

const BOOTSTRAP_FLAG = "__fenrikMetaPixelBootstrapped";

function bootstrapMetaPixel(pixelId: string): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { [BOOTSTRAP_FLAG]?: boolean };
  if (w[BOOTSTRAP_FLAG]) return;

  if (typeof w.fbq !== "function") {
    const n = function (...args: unknown[]) {
      const self = n as unknown as FbqFunction;
      if (typeof self.callMethod === "function") {
        self.callMethod(...args);
      } else {
        (self.queue ??= []).push(args);
      }
    };
    const fbq = n as unknown as FbqFunction;
    fbq.push = function (...args: unknown[]) {
      (fbq.queue ??= []).push(args);
    };
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    w.fbq = fbq;
    if (!w._fbq) w._fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  }

  w.fbq?.("init", pixelId);
  w.fbq?.("track", "PageView");
  w[BOOTSTRAP_FLAG] = true;
}

export function MetaPixelProvider() {
  const { analyticsAllowed } = useAnalyticsConsent();
  const bootedRef = useRef(false);
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();

  useEffect(() => {
    if (!analyticsAllowed || !pixelId) return;
    if (bootedRef.current) return;
    const w = window as Window & { [BOOTSTRAP_FLAG]?: boolean };
    if (w[BOOTSTRAP_FLAG]) {
      bootedRef.current = true;
      return;
    }
    bootstrapMetaPixel(pixelId);
    bootedRef.current = true;
  }, [analyticsAllowed, pixelId]);

  return null;
}
