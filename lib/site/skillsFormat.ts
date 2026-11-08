/** Display helpers for skills programmes (safe in the browser). */

const DAY = 86_400_000;

function parseDay(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "6 weeks" from the start and end dates (counting both session days). */
export function durationLabel(startsOn: string | null, endsOn: string | null) {
  const a = parseDay(startsOn);
  const b = parseDay(endsOn);
  if (!a || !b || b < a) return null;
  const days = Math.round((b.getTime() - a.getTime()) / DAY);
  if (days < 7) return `${days + 1} ${days === 0 ? "day" : "days"}`;
  const weeks = Math.floor(days / 7) + 1;
  return `${weeks} weeks`;
}

/** "Sat 25 Oct" */
export function shortDate(iso: string | null | undefined) {
  const d = parseDay(iso);
  return d ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "";
}

/** "Saturday 15 November" */
export function longDate(iso: string | null | undefined) {
  const d = parseDay(iso);
  return d ? d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "";
}

export function dateParts(iso: string | null | undefined) {
  const d = parseDay(iso);
  if (!d) return null;
  return {
    weekday: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    day: d.getUTCDate(),
    month: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase(),
  };
}

/** The next-week card shows until the end of its day (Ghana is UTC). */
export function nextIsUpcoming(date: string | null | undefined, now = Date.now()) {
  const d = parseDay(date);
  return Boolean(d && d.getTime() + 12 * 3_600_000 > now);
}

export const STATUS_LABEL: Record<string, string> = { coming_soon: "COMING SOON", ongoing: "ONGOING", ended: "ENDED" };
