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

export type Birth = { birth_month: number | null; birth_day: number | null; birth_year: number | null };
const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** Validate month/day (required as a pair) + optional year. Accepts legacy `dob` (YYYY-MM-DD). Throws Error(message). */
export function parseBirth(b: Record<string, unknown>, cur: Birth | null, required: boolean, today: string): Birth {
  const has = (k: string) => b[k] !== undefined;
  if (typeof b.dob === "string" && b.dob && !has("birth_month")) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b.dob);
    if (!m) throw new Error("Please enter a valid date of birth");
    b = { birth_year: m[1], birth_month: m[2], birth_day: m[3] };
  } else if (!has("birth_month") && !has("birth_day") && !has("birth_year")) {
    const keep = { birth_month: cur?.birth_month ?? null, birth_day: cur?.birth_day ?? null, birth_year: cur?.birth_year ?? null };
    if (required && !keep.birth_month) throw new Error("Birthday (month and day) is required");
    return keep;
  }
  const num = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number(v));
  const month = num(b.birth_month), day = num(b.birth_day), year = num(b.birth_year);
  if (month === null && day === null) {
    if (required) throw new Error("Birthday (month and day) is required");
    if (year !== null) throw new Error("Please choose the birthday month and day");
    return { birth_month: null, birth_day: null, birth_year: null };
  }
  if (!Number.isInteger(month) || !Number.isInteger(day) || month! < 1 || month! > 12) throw new Error("Please choose the birthday month and day");
  if (day! < 1 || day! > DAYS[month! - 1]) throw new Error("That day doesn't exist in the chosen month");
  if (year !== null) {
    const ty = Number(today.slice(0, 4));
    if (!Number.isInteger(year) || year < 1900 || year > ty) throw new Error("Please enter a valid birth year");
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    if (month === 2 && day === 29 && !leap) throw new Error(`${year} was not a leap year`);
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (iso > today) throw new Error("Birthday can't be in the future");
  }
  return { birth_month: month, birth_day: day, birth_year: year };
}
/** Sortable/occurrence key; unknown year uses leap year 2000 so Feb 29 is representable. */
export const birthIso = (r: Birth) => r.birth_month && r.birth_day
  ? `${r.birth_year ?? 2000}-${String(r.birth_month).padStart(2, "0")}-${String(r.birth_day).padStart(2, "0")}` : null;

/** Ugandan operator from a normalised number (UCC allocations, verified Oct 2026). */
export function phoneOperator(p: string | null): "MTN" | "Airtel" | "Other" | null {
  if (!p) return null;
  if (!p.startsWith("256") || p.length !== 12) return "Other";
  const n = p.slice(3);
  if (/^7[6-9]/.test(n) || /^3/.test(n)) return "MTN";              // 076-079 mobile, 03x MTN fixed
  if (/^7[045]/.test(n) || /^73[01]/.test(n) || /^20/.test(n)) return "Airtel"; // 070/074/075, 0730-0731, 020 fixed
  return "Other";
}

// ----- privacy-safe masking for the "Is this you?" preview -----
const stars = (s: string) => (s ? s[0].toUpperCase() + "*".repeat(Math.max(s.length - 1, 1)) : "");
export const maskName = (first: string | null, last: string | null) => [first, last].map((p) => stars((p ?? "").trim())).filter(Boolean).join(" ");
export const initials = (first: string | null, last: string | null) => ((first ?? "").trim()[0] ?? "").toUpperCase() + ((last ?? "").trim()[0] ?? "").toUpperCase();
export function maskPhone(p: string | null) {
  if (!p) return null;
  const local = p.startsWith("256") && p.length === 12 ? "0" + p.slice(3) : "+" + p;
  return `${local.slice(0, local.startsWith("+") ? 5 : 4)} ••• ${local.slice(-3)}`;
}
export function maskEmail(e: string | null) {
  if (!e || !e.includes("@")) return null;
  const [user, domain] = e.split("@");
  const dot = domain.lastIndexOf(".");
  const name = dot > 0 ? domain.slice(0, dot) : domain, tld = dot > 0 ? domain.slice(dot) : "";
  return `${user[0]}•••@${name[0]}•••${tld}`;
}
export function memberSince(createdAt: string | null) {
  if (!createdAt) return null;
  const d = new Date(createdAt.replace(" ", "T") + (createdAt.includes("Z") ? "" : "Z"));
  return isNaN(+d) ? null : d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "Africa/Kampala" });
}
