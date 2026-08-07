"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  hasAnalyticsConsent,
  parseAnalyticsConsent,
  type AnalyticsConsentStatus,
} from "@/lib/analytics/consent";

const CONSENT_CHANGE_EVENT = "fenrik-analytics-consent-change";

function subscribeConsent(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(CONSENT_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
  };
}

function getConsentSnapshot(): AnalyticsConsentStatus | null {
  if (typeof window === "undefined") return null;
  return parseAnalyticsConsent(
    window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY),
  );
}

function getConsentServerSnapshot(): AnalyticsConsentStatus | null {
  return null;
}

function writeConsent(next: AnalyticsConsentStatus): void {
  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, next);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

interface AnalyticsConsentContextValue {
  status: AnalyticsConsentStatus | null;
  bannerVisible: boolean;
  analyticsAllowed: boolean;
  accept: () => void;
  reject: () => void;
  openSettings: () => void;
}

const AnalyticsConsentContext =
  createContext<AnalyticsConsentContextValue | null>(null);

export function AnalyticsConsentProvider({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const accept = useCallback(() => {
    writeConsent("accepted");
    setSettingsOpen(false);
  }, []);

  const reject = useCallback(() => {
    writeConsent("rejected");
    setSettingsOpen(false);
  }, []);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  const value = useMemo<AnalyticsConsentContextValue>(
    () => ({
      status,
      bannerVisible: status === null || settingsOpen,
      analyticsAllowed: hasAnalyticsConsent(status),
      accept,
      reject,
      openSettings,
    }),
    [status, settingsOpen, accept, reject, openSettings],
  );

  return (
    <AnalyticsConsentContext.Provider value={value}>
      {children}
    </AnalyticsConsentContext.Provider>
  );
}

export function useAnalyticsConsent(): AnalyticsConsentContextValue {
  const ctx = useContext(AnalyticsConsentContext);
  if (!ctx) {
    throw new Error(
      "useAnalyticsConsent must be used within AnalyticsConsentProvider",
    );
  }
  return ctx;
}
