export type FbqFunction = {
  (
    command: "init" | "track" | "trackCustom" | "consent",
    eventOrId: string,
    params?: Record<string, string | number | boolean>,
  ): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

/** Fire a Meta Pixel event only when fbq is available. */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
): boolean {
  if (typeof window === "undefined") return false;
  const fbq = window.fbq;
  if (typeof fbq !== "function") return false;
  if (params) {
    fbq("track", eventName, params);
  } else {
    fbq("track", eventName);
  }
  return true;
}

export function trackMetaLead(): boolean {
  return trackMetaEvent("Lead", { content_name: "Free Content Package" });
}
