const CS_DATE: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Prague",
};

const CS_DATETIME: Intl.DateTimeFormatOptions = {
  ...CS_DATE,
  hour: "2-digit",
  minute: "2-digit",
};

// Stable cs-CZ dates for SSR + hydration (Vercel runs UTC; browsers vary).
export function formatCsDate(
  value: string | null | undefined,
  fallback = "—",
): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("cs-CZ", CS_DATE);
}

// Stable cs-CZ timestamps for SSR + hydration (Vercel runs UTC; browsers vary).
export function formatCsDateTime(
  value: string | null | undefined,
  fallback = "—",
): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString("cs-CZ", CS_DATETIME);
}
