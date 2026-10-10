export const TITLES = ["Brother", "Sister", "Pastor", "Deacon", "Deaconess"] as const;
export const MARITAL = ["single", "married", "widowed", "divorced"] as const;

/** Normalise a Ugandan/international phone to digits with country code. Returns null if invalid. */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "256" + d.slice(1);
  else if (d.length === 9) d = "256" + d;
  if (!/^\d{10,15}$/.test(d)) return null;
  return d;
}

/** Validates YYYY-MM-DD, real calendar date, not in the future (relative to `today`). */
export function validDate(s: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  return y >= 1900 && s <= today;
}

/** Today's date in Africa/Kampala (UTC+3, no DST). */
export function kampalaToday(now = new Date()): string {
  return new Date(now.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** Next occurrence (>= today) of a yearly date. Feb 29 falls on Feb 28 in non-leap years. */
export function nextOccurrence(date: string, today: string): { date: string; days: number; years: number } {
  const [ty, tm, td] = today.split("-").map(Number);
  const [oy, om, od] = date.split("-").map(Number);
  const at = (y: number) => {
    const d = om === 2 && od === 29 && !isLeap(y) ? 28 : od;
    return Date.UTC(y, om - 1, d);
  };
  const t0 = Date.UTC(ty, tm - 1, td);
  let y = ty;
  if (at(y) < t0) y++;
  const ts = at(y);
  return { date: new Date(ts).toISOString().slice(0, 10), days: Math.round((ts - t0) / 86400_000), years: y - oy };
}

export const displayName = (title: string | null, first: string | null, fallback: string) =>
  [title, first].filter(Boolean).join(" ") || fallback;
