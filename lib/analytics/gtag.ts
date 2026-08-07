type GtagFunction = (
  command: "event" | "config" | "js" | "consent",
  targetOrEvent: string,
  params?: Record<string, string | number | boolean>,
) => void;

declare global {
  interface Window {
    gtag?: GtagFunction;
  }
}

export function trackGenerateLead(): boolean {
  if (typeof window === "undefined") return false;
  const gtag = window.gtag;
  if (typeof gtag !== "function") return false;
  gtag("event", "generate_lead", { lead_source: "free_sample_form" });
  return true;
}
