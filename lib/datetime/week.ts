// UTC Monday week model — matches Actions triggers and n8n week_start payloads.

export function currentWeekStartUtc(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const offsetToMonday = (day + 6) % 7;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - offsetToMonday);
  return monday.toISOString().slice(0, 10);
}

/** e.g. "Jun 15–21, 2026" for week_start 2026-06-15 (Monday UTC). */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return weekStart;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const year = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    timeZone: "UTC",
  });
  return `${monthDay.format(start)}–${monthDay.format(end)}, ${year.format(end)}`;
}

export function formatCurrentWeekLabel(weekStart: string): string {
  return `Current week · ${formatWeekRange(weekStart)}`;
}
