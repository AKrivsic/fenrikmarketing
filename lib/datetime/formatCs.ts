const CS_DATETIME: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Prague",
};

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
