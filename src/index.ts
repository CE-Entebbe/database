import { Hono, type Context, type Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { hashPassword, verifyPassword, signSession, readSession, fingerprint, SESSION_COOKIE, SESSION_DAYS } from "./auth";
import { adminPage } from "./admin-page";
import { memberPage, messagePage } from "./member-page";
import { accountPage } from "./account-page";
import { TITLES, MARITAL, normalizePhone, validDate, kampalaToday, nextOccurrence, displayName, parseBirth, birthIso, phoneOperator, type Birth } from "./people";

export type Env = { DB: D1Database; ADMIN_TOKEN?: string; SESSION_SECRET?: string; PHOTOS?: R2Bucket };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = Context<any>;

export const ROLES = [
  "COORDINATOR", "PCF_LEADER", "ASST_PCF_LEADER",
  "CELL_LEADER", "ASST_CELL_LEADER", "BIBLE_STUDY_TEACHER",
] as const;
type Role = (typeof ROLES)[number];
const PCF_ROLES: Role[] = ["PCF_LEADER", "ASST_PCF_LEADER"];
const CELL_ROLES: Role[] = ["CELL_LEADER", "ASST_CELL_LEADER"];

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const bad = (m: string) => new HttpError(400, m);
const notFound = (m = "Not found") => new HttpError(404, m);

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status as 400);
  const msg = String((err as Error)?.message ?? err);
  if (msg.includes("identifiers.value")) return c.json({ error: "That phone number or email already belongs to someone else" }, 409);
  if (msg.includes("relatives_child_uniq") || (msg.includes("UNIQUE constraint") && msg.includes("relatives.household_id"))) return c.json({ error: "This child is already in your family" }, 409);
  if (msg.includes("UNIQUE constraint")) return c.json({ error: "Already exists" }, 409);
  if (msg.includes("CHECK constraint") || msg.includes("FOREIGN KEY")) return c.json({ error: "Invalid data" }, 400);
  console.error(err);
  return c.json({ error: "Internal error" }, 500);
});

// ---------- helpers ----------
function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

async function requireAdmin(c: C, next: Next) {
  const token = c.env.ADMIN_TOKEN;
  if (!token) return c.json({ error: "ADMIN_TOKEN is not configured" }, 503);
  const h = c.req.header("Authorization") ?? "";
  let supplied = "";
  if (h.startsWith("Bearer ")) supplied = h.slice(7);
  else if (h.startsWith("Basic ")) {
    try { const d = atob(h.slice(6)); supplied = d.slice(d.indexOf(":") + 1); } catch { /* ignore */ }
  }
  if (!supplied || !timingSafeEqual(supplied, token)) {
    c.header("WWW-Authenticate", 'Basic realm="CE Admin", charset="UTF-8"');
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
}

async function body(c: C): Promise<Record<string, unknown>> {
  try { const b = await c.req.json(); if (b && typeof b === "object") return b as Record<string, unknown>; } catch { /* */ }
  throw bad("JSON body required");
}
function str(v: unknown, field: string, required = true): string | null {
  if (v === undefined || v === null || v === "") { if (required) throw bad(`${field} is required`); return null; }
  if (typeof v !== "string") throw bad(`${field} must be a string`);
  const s = v.trim();
  if (required && !s) throw bad(`${field} is required`);
  if (s.length > 200) throw bad(`${field} is too long`);
  return s || null;
}
function intOrNull(v: unknown, field: string): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n) || n <= 0) throw bad(`${field} must be a positive integer`);
  return n;
}
function bool(v: unknown): number | undefined {
  if (v === undefined) return undefined;
  return v === true || v === 1 || v === "true" ? 1 : 0;
}
const idParam = (c: C) => { const n = intOrNull(c.req.param("id"), "id"); if (!n) throw bad("id required"); return n; };
const first = <T>(db: D1Database, sql: string, ...p: unknown[]) => db.prepare(sql).bind(...p).first<T>();
const all = async <T>(db: D1Database, sql: string, ...p: unknown[]) => (await db.prepare(sql).bind(...p).all<T>()).results;
const run = (db: D1Database, sql: string, ...p: unknown[]) => db.prepare(sql).bind(...p).run();

function newAccessCode(): string {
  const b = new Uint8Array(12); crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

async function cellsEnabled(db: D1Database) {
  const r = await first<{ value: string }>(db, "SELECT value FROM settings WHERE key='cells_enabled'");
  return r?.value === "true";
}
async function cellChurch(db: D1Database, cellId: number) {
  return first<{ church_id: number; active: number; pcf_active: number }>(db,
    "SELECT p.church_id, c.active, p.active AS pcf_active FROM cells c JOIN pcfs p ON p.id=c.pcf_id WHERE c.id=?", cellId);
}
/** Throws unless the cell is active and in the given church. */
async function assertCellInChurch(db: D1Database, cellId: number, churchId: number) {
  const cc = await cellChurch(db, cellId);
  if (!cc) throw bad("Cell not found");
  if (cc.church_id !== churchId) throw bad("Cell belongs to a different church");
  if (!cc.active || !cc.pcf_active) throw bad("Cell is not active");
}

// Member-facing cell list: id + name only, active cells in active PCFs of this church.
async function memberCells(db: D1Database, churchId: number) {
  return all<{ id: number; name: string }>(db,
    `SELECT c.id, c.name FROM cells c JOIN pcfs p ON p.id=c.pcf_id
     WHERE p.church_id=? AND c.active=1 AND p.active=1 ORDER BY c.name`, churchId);
}

const PUBLIC_COLS = "id, church_id, household_id, name, title, first_name, last_name, phone, phone_operator, phone_alt, phone_alt_operator, email, birth_month, birth_day, birth_year, marital_status, has_kids, cell_id, access_code, active";
/** Member row joined with the household anniversary. */
const MEMBER_ROW = "SELECT m.*, h.anniversary FROM members m LEFT JOIN households h ON h.id=m.household_id";
type MemberRow = { id: number; church_id: number; name: string; title: string | null; first_name: string | null;
  last_name: string | null; phone: string | null; phone_alt: string | null; household_id: number; email: string | null; birth_month: number | null; birth_day: number | null; birth_year: number | null; marital_status: string | null;
  anniversary: string | null; has_kids: number; password_hash: string | null; cell_id: number | null; active: number; access_code: string };

/** Validate member detail fields. `cur` = existing row for partial updates; `strict` = public registration rules. */
function memberFields(b: Record<string, unknown>, cur: MemberRow | null, strict: boolean) {
  const today = kampalaToday();
  const has = (k: string) => b[k] !== undefined;
  let first_name = cur?.first_name ?? null, last_name = cur?.last_name ?? null;
  if (has("first_name") || has("last_name")) {
    first_name = has("first_name") ? str(b.first_name, "First name") : first_name;
    last_name = has("last_name") ? str(b.last_name, "Last name", !cur && strict) : last_name;
  } else if (has("name")) {
    const parts = str(b.name, "name")!.split(/\s+/);
    first_name = parts[0]; last_name = parts.slice(1).join(" ") || null;
  }
  if (!first_name) {
    if (cur && !cur.first_name && !has("first_name")) { first_name = cur.name; } else throw bad("First name is required");
  }
  if (strict && !last_name) throw bad("Last name is required");
  let title = has("title") ? (b.title === "" || b.title === "None" || b.title === null ? null : String(b.title)) : cur?.title ?? null;
  if (title !== null && !(TITLES as readonly string[]).includes(title)) throw bad("Invalid title");
  let phone = cur?.phone ?? null;
  if (has("phone")) {
    const p = str(b.phone, "Phone", strict);
    phone = p ? normalizePhone(p) : null;
    if (p && !phone) throw bad("Please enter a valid phone number");
  }
  let phone_alt = cur?.phone_alt ?? null;
  if (has("phone_alt")) {
    const p = str(b.phone_alt, "Alternative phone", false);
    phone_alt = p ? normalizePhone(p) : null;
    if (p && !phone_alt) throw bad("Please enter a valid alternative phone number");
  }
  if (phone && phone_alt === phone) phone_alt = null;
  const email = has("email") ? str(b.email, "email", false)?.toLowerCase() ?? null : cur?.email ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad("Please enter a valid email");
  let birth: Birth;
  try { birth = parseBirth(b, cur, strict, today); } catch (e) { throw bad((e as Error).message); }
  const dob = birth.birth_year ? birthIso(birth) : null;
  let marital_status = has("marital_status") ? (b.marital_status ? String(b.marital_status) : null) : cur?.marital_status ?? null;
  if (marital_status && !(MARITAL as readonly string[]).includes(marital_status)) throw bad("Invalid marital status");
  let anniversary = has("anniversary") ? str(b.anniversary, "Wedding anniversary", false) : cur?.anniversary ?? null;
  if (marital_status !== "married") anniversary = null;
  if (anniversary && !validDate(anniversary, today)) throw bad("Please enter a valid wedding date");
  if (anniversary && dob && anniversary <= dob) throw bad("Wedding date must be after date of birth");
  const has_kids = has("has_kids") ? (bool(b.has_kids) ?? 0) : cur?.has_kids ?? 0;
  const name = [first_name, last_name].filter(Boolean).join(" ");
  return { has_kids, name, title, first_name, last_name, phone, phone_alt, phone_operator: phoneOperator(phone), phone_alt_operator: phoneOperator(phone_alt), email, ...birth, marital_status, anniversary };
}
type Owner = { member?: number; relative?: number };
/** Who (if anyone else) already owns one of these phones/emails. */
async function contactOwner(db: D1Database, values: (string | null | undefined)[], self: Owner) {
  for (const v of values) {
    if (!v) continue;
    const r = await first<{ member_id: number | null; relative_id: number | null }>(db, "SELECT member_id, relative_id FROM identifiers WHERE value=?", v.toLowerCase());
    if (!r) continue;
    if ((self.member && r.member_id === self.member) || (self.relative && r.relative_id === self.relative)) continue;
    return { value: v, ...r };
  }
  return null;
}
async function assertContactsFree(db: D1Database, values: (string | null | undefined)[], self: Owner) {
  const o = await contactOwner(db, values, self);
  if (o) throw new HttpError(409, o.value.includes("@") ? "This email already belongs to someone else" : `The number +${o.value} already belongs to someone else`);
}
/** Creates a household and returns its id. */
async function newHousehold(db: D1Database, anniversary: string | null = null) {
  return (await first<{ id: number }>(db, "INSERT INTO households(anniversary) VALUES(?) RETURNING id", anniversary))!.id;
}
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO = 2 * 1024 * 1024;
async function savePhoto(env: Env, f: unknown): Promise<string | null> {
  if (!f || typeof f !== "object" || typeof (f as File).arrayBuffer !== "function") return null;
  const file = f as File;
  if (file.size === 0) return null;
  if (!env.PHOTOS) throw bad("Photo storage is not configured");
  const ext = PHOTO_TYPES[file.type];
  if (!ext) throw bad("Photo must be JPEG, PNG or WebP");
  if (file.size > MAX_PHOTO) throw bad("Photo is too large (max 2 MB)");
  const key = `photos/${crypto.randomUUID()}.${ext}`;
  await env.PHOTOS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return key;
}

// ---------- shared: households, family + photos ----------
type RelativeRow = Birth & { id: number; member_id: number; household_id: number; relation: "spouse" | "child"; title: string | null;
  first_name: string; last_name: string | null; phone: string | null; phone_alt: string | null; email: string | null };
function relativeFields(b: Record<string, unknown>, cur: RelativeRow | null) {
  const relation = (cur?.relation ?? b.relation) as string;
  if (relation !== "spouse" && relation !== "child") throw bad("relation must be spouse or child");
  const has = (k: string) => b[k] !== undefined;
  const first_name = has("first_name") ? str(b.first_name, "First name")! : cur?.first_name;
  if (!first_name) throw bad("First name is required");
  const last_name = has("last_name") ? str(b.last_name, "Last name", false) : cur?.last_name ?? null;
  let title = has("title") ? (b.title === "" || b.title === "None" || b.title == null ? null : String(b.title)) : cur?.title ?? null;
  if (relation === "child") title = null;
  if (title !== null && !(TITLES as readonly string[]).includes(title)) throw bad("Invalid title");
  let birth: Birth;
  try { birth = parseBirth(b, cur, relation === "child" && !cur, kampalaToday()); } catch (e) { throw bad((e as Error).message); }
  // Contacts only for spouse records (children have none).
  const ph = (k: "phone" | "phone_alt", label: string) => {
    if (relation === "child") return null;
    if (!has(k)) return cur?.[k] ?? null;
    const p = str(b[k], label, false); const n = p ? normalizePhone(p) : null;
    if (p && !n) throw bad(`Please enter a valid ${label.toLowerCase()}`);
    return n;
  };
  const phone = ph("phone", "Phone number"); let phone_alt = ph("phone_alt", "Alternative phone");
  if (phone && phone_alt === phone) phone_alt = null;
  const email = relation === "child" ? null : has("email") ? str(b.email, "email", false)?.toLowerCase() ?? null : cur?.email ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad("Please enter a valid email");
  return { relation, title, first_name, last_name, ...birth, phone, phone_alt, email,
    phone_operator: phoneOperator(phone), phone_alt_operator: phoneOperator(phone_alt) };
}
const householdOf = async (db: D1Database, memberId: number) =>
  (await first<{ household_id: number }>(db, "SELECT household_id FROM members WHERE id=?", memberId))!.household_id;
/** The other member account linked into the same household, if any. */
const linkedSpouse = (db: D1Database, m: { id: number; household_id: number }) =>
  first<MemberRow>(db, "SELECT * FROM members WHERE household_id=? AND id<>? LIMIT 1", m.household_id, m.id);

async function requestLink(db: D1Database, from: number, to: number) {
  const ex = await first(db, "SELECT id FROM spouse_links WHERE status='pending' AND ((from_member=? AND to_member=?) OR (from_member=? AND to_member=?))", from, to, to, from);
  if (!ex) await run(db, "INSERT INTO spouse_links(from_member,to_member) VALUES(?,?)", from, to);
}

async function addRelative(db: D1Database, memberId: number, b: Record<string, unknown>) {
  const f = relativeFields(b, null);
  const m = (await first<MemberRow>(db, `${MEMBER_ROW} WHERE m.id=?`, memberId))!;
  if (f.relation === "spouse") {
    if (m.marital_status !== "married") throw bad("Set marital status to Married before adding a spouse");
    if (await linkedSpouse(db, m)) throw new HttpError(409, "You are already linked to your spouse's account");
    if (await first(db, "SELECT id FROM relatives WHERE member_id=? AND relation='spouse'", memberId)) throw new HttpError(409, "A spouse is already added");
    const owner = await contactOwner(db, [f.phone, f.phone_alt, f.email], {});
    if (owner?.member_id) {
      if (owner.member_id === memberId) throw bad("That's your own phone number or email");
      await requestLink(db, memberId, owner.member_id); // they must confirm
      return { link_requested: true };
    }
    if (owner) throw new HttpError(409, "That phone number or email already belongs to someone else");
  } else {
    const n = await first<{ n: number }>(db, "SELECT COUNT(*) AS n FROM relatives WHERE household_id=? AND relation='child'", m.household_id);
    if ((n?.n ?? 0) >= 20) throw bad("Too many children");
    if (f.birth_month && await first(db, "SELECT id FROM relatives WHERE household_id=? AND relation='child' AND lower(first_name)=lower(?) AND birth_month=? AND birth_day=?",
      m.household_id, f.first_name, f.birth_month, f.birth_day)) throw new HttpError(409, "This child is already in your family");
    await run(db, "UPDATE members SET has_kids=1 WHERE household_id=?", m.household_id);
  }
  return first(db, `INSERT INTO relatives(member_id,household_id,relation,title,first_name,last_name,birth_month,birth_day,birth_year,phone,phone_alt,email,phone_operator,phone_alt_operator)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`,
    memberId, m.household_id, f.relation, f.title, f.first_name, f.last_name, f.birth_month, f.birth_day, f.birth_year, f.phone, f.phone_alt, f.email, f.phone_operator, f.phone_alt_operator);
}
async function updateRelative(db: D1Database, cur: RelativeRow, b: Record<string, unknown>) {
  const f = relativeFields(b, cur);
  await assertContactsFree(db, [f.phone, f.phone_alt, f.email], { relative: cur.id });
  if (f.relation === "child" && f.birth_month && await first(db, "SELECT id FROM relatives WHERE household_id=? AND relation='child' AND id<>? AND lower(first_name)=lower(?) AND birth_month=? AND birth_day=?",
    cur.household_id, cur.id, f.first_name, f.birth_month, f.birth_day)) throw new HttpError(409, "This child is already in your family");
  return first(db, `UPDATE relatives SET title=?, first_name=?, last_name=?, birth_month=?, birth_day=?, birth_year=?, phone=?, phone_alt=?, email=?, phone_operator=?, phone_alt_operator=?
    WHERE id=? RETURNING *`, f.title, f.first_name, f.last_name, f.birth_month, f.birth_day, f.birth_year, f.phone, f.phone_alt, f.email, f.phone_operator, f.phone_alt_operator, cur.id);
}
async function deleteRelative(env: Env, rel: RelativeRow) {
  const ph = await all<{ r2_key: string }>(env.DB, "SELECT r2_key FROM photos WHERE relative_id=?", rel.id);
  for (const p of ph) await env.PHOTOS?.delete(p.r2_key);
  await env.DB.batch([env.DB.prepare("DELETE FROM photos WHERE relative_id=?").bind(rel.id), env.DB.prepare("DELETE FROM relatives WHERE id=?").bind(rel.id)]);
}
async function deleteMemberPhotos(env: Env, memberId: number) {
  const ph = await all<{ r2_key: string }>(env.DB, "SELECT r2_key FROM photos WHERE member_id=? AND (relative_id IS NULL OR relative_id IN (SELECT id FROM relatives WHERE member_id=? AND relation='spouse'))", memberId, memberId);
  for (const p of ph) await env.PHOTOS?.delete(p.r2_key);
}
/** Married -> single removes the spouse record (and photos) and the household anniversary. */
async function applyMaritalSideEffects(env: Env, m: { id: number; household_id: number }, status: string | null) {
  if (status === "married") return;
  const sp = await first<RelativeRow>(env.DB, "SELECT * FROM relatives WHERE member_id=? AND relation='spouse'", m.id);
  if (sp) await deleteRelative(env, sp);
  await run(env.DB, "UPDATE households SET anniversary=NULL WHERE id=?", m.household_id);
}

/** Merge member b's household into member a's: shared children (deduplicated), one anniversary, spouse records replaced by the real accounts. */
async function linkSpouses(env: Env, aId: number, bId: number) {
  const db = env.DB;
  const a = (await first<MemberRow>(db, `${MEMBER_ROW} WHERE m.id=?`, aId))!, b = (await first<MemberRow>(db, `${MEMBER_ROW} WHERE m.id=?`, bId))!;
  if (a.household_id === b.household_id) return;
  if (await linkedSpouse(db, a) || await linkedSpouse(db, b)) throw new HttpError(409, "One of you is already linked to another account");
  const hA = a.household_id, hB = b.household_id;
  // spouse records describing each other become the real accounts; their photos move to that person
  for (const [owner, real] of [[a, b], [b, a]] as const) {
    const sp = await first<RelativeRow>(db, "SELECT * FROM relatives WHERE member_id=? AND relation='spouse'", owner.id);
    if (sp) {
      await run(db, "UPDATE photos SET member_id=?, relative_id=NULL WHERE relative_id=?", real.id, sp.id);
      await run(db, "DELETE FROM relatives WHERE id=?", sp.id);
    }
  }
  // children: move into hA, merging duplicates (same first name + birthday)
  const kidsB = await all<RelativeRow>(db, "SELECT * FROM relatives WHERE household_id=? AND relation='child'", hB);
  for (const k of kidsB) {
    const dup = k.birth_month ? await first<RelativeRow>(db,
      "SELECT * FROM relatives WHERE household_id=? AND relation='child' AND lower(first_name)=lower(?) AND birth_month=? AND birth_day=?", hA, k.first_name, k.birth_month, k.birth_day) : null;
    if (dup) {
      await run(db, "UPDATE relatives SET last_name=COALESCE(last_name,?), birth_year=COALESCE(birth_year,?) WHERE id=?", k.last_name, k.birth_year, dup.id);
      await run(db, "UPDATE photos SET relative_id=? WHERE relative_id=?", dup.id, k.id);
      await run(db, "DELETE FROM relatives WHERE id=?", k.id);
    } else await run(db, "UPDATE relatives SET household_id=? WHERE id=?", hA, k.id);
  }
  const anniversary = a.anniversary ?? b.anniversary ?? null;
  const kids = await first<{ n: number }>(db, "SELECT COUNT(*) AS n FROM relatives WHERE household_id=? AND relation='child'", hA);
  await db.batch([
    db.prepare("UPDATE households SET anniversary=? WHERE id=?").bind(anniversary, hA),
    db.prepare("UPDATE members SET household_id=?, marital_status='married', has_kids=CASE WHEN ? > 0 THEN 1 ELSE has_kids END WHERE id IN (?,?)").bind(hA, kids?.n ?? 0, aId, bId),
    db.prepare("UPDATE relatives SET household_id=? WHERE household_id=?").bind(hA, hB),
    db.prepare("DELETE FROM households WHERE id=?").bind(hB),
    db.prepare("UPDATE spouse_links SET status='accepted' WHERE status='pending' AND ((from_member=? AND to_member=?) OR (from_member=? AND to_member=?))").bind(aId, bId, bId, aId),
    db.prepare("UPDATE spouse_links SET status='declined' WHERE status='pending' AND (from_member IN (?,?) OR to_member IN (?,?))").bind(aId, bId, aId, bId),
  ]);
}
/** Photo visible to member m: own uploads, or of anyone in their household (children, spouse record, linked spouse). */
const PHOTO_VISIBLE = `(p.member_id IN (SELECT id FROM members WHERE household_id=?) OR p.relative_id IN (SELECT id FROM relatives WHERE household_id=?))`;
async function servePhoto(env: Env, key: string) {
  const obj = await env.PHOTOS?.get(key);
  if (!obj) throw notFound("Photo not found");
  return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType ?? "image/jpeg", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" } });
}
const MAX_PHOTOS_PER_MEMBER = 60;

// ---------- member accounts ----------
function sessionSecret(c: C) {
  const s = c.env.SESSION_SECRET;
  if (!s) throw new HttpError(503, "SESSION_SECRET is not configured");
  return s;
}
async function startSession(c: C, m: { id: number; password_hash: string }) {
  setCookie(c, SESSION_COOKIE, await signSession(sessionSecret(c), m.id, m.password_hash), {
    httpOnly: true, secure: new URL(c.req.url).protocol === "https:", sameSite: "Lax", path: "/", maxAge: SESSION_DAYS * 86400 });
}
type MC = Context<{ Bindings: Env; Variables: { member: MemberRow } }>;
async function requireMember(c: MC, next: Next) {
  const secret = sessionSecret(c as unknown as C);
  const s = await readSession(secret, getCookie(c, SESSION_COOKIE));
  const m = s && (await first<MemberRow>(c.env.DB, `${MEMBER_ROW} WHERE m.id=? AND m.active=1`, s.memberId));
  if (!s || !m || !m.password_hash || (await fingerprint(secret, m.password_hash)) !== s.fp) return c.json({ error: "Please log in" }, 401);
  c.set("member", m);
  await next();
}
function passwordField(v: unknown) {
  if (typeof v !== "string" || v.length < 8) throw bad("Password must be at least 8 characters");
  if (v.length > 200) throw bad("Password is too long");
  return v;
}

app.get("/api/public/churches", async (c) => c.json({
  cells_enabled: await cellsEnabled(c.env.DB),
  churches: await all<{ id: number; name: string }>(c.env.DB, "SELECT id, name FROM churches WHERE active=1 ORDER BY parent_id IS NOT NULL, name"),
}));
app.get("/api/public/cells", async (c) => {
  const churchId = intOrNull(c.req.query("church_id"), "church_id");
  if (!churchId || !(await cellsEnabled(c.env.DB))) return c.json([]);
  return c.json(await memberCells(c.env.DB, churchId));
});

app.post("/api/auth/signup", async (c) => {
  const b = await body(c);
  sessionSecret(c);
  const password = passwordField(b.password);
  b.title ??= "";
  const f = memberFields(b, null, true);
  const churchId = intOrNull(b.church_id, "church_id");
  if (!churchId || !(await first(c.env.DB, "SELECT id FROM churches WHERE id=? AND active=1", churchId))) throw bad("Please choose your church");
  let cellId = intOrNull(b.cell_id, "cell_id");
  if (cellId) { if (!(await cellsEnabled(c.env.DB))) cellId = null; else await assertCellInChurch(c.env.DB, cellId, churchId); }
  // A number/email may already sit on someone's spouse record: that spouse is now signing up.
  const owner = await contactOwner(c.env.DB, [f.phone, f.phone_alt, f.email], {});
  let spouseRec: RelativeRow | null = null;
  if (owner?.member_id) throw new HttpError(409, owner.value.includes("@") ? "This email is already registered" : "This phone number is already registered");
  if (owner?.relative_id) {
    spouseRec = await first<RelativeRow>(c.env.DB, "SELECT * FROM relatives WHERE id=?", owner.relative_id);
    if (spouseRec?.relation !== "spouse") throw new HttpError(409, "That phone number or email already belongs to someone else");
    // all of this person's contacts must be free apart from that spouse record
    await assertContactsFree(c.env.DB, [f.phone, f.phone_alt, f.email], { relative: spouseRec.id });
    await run(c.env.DB, "UPDATE relatives SET phone=NULL, phone_alt=NULL, email=NULL, phone_operator=NULL, phone_alt_operator=NULL WHERE id=?", spouseRec.id);
  }
  const password_hash = await hashPassword(password);
  const hh = await newHousehold(c.env.DB, f.marital_status === "married" ? f.anniversary : null);
  const m = await first<{ id: number; password_hash: string }>(c.env.DB,
    `INSERT INTO members(church_id,household_id,name,title,first_name,last_name,phone,phone_operator,phone_alt,phone_alt_operator,email,birth_month,birth_day,birth_year,marital_status,has_kids,cell_id,access_code,password_hash)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id, password_hash`,
    churchId, hh, f.name, f.title, f.first_name, f.last_name, f.phone, f.phone_operator, f.phone_alt, f.phone_alt_operator, f.email,
    f.birth_month, f.birth_day, f.birth_year, f.marital_status ?? "single", f.has_kids, cellId, newAccessCode(), password_hash);
  // The member who listed this person as spouse confirms the link (protects against someone claiming a number).
  if (spouseRec) await requestLink(c.env.DB, m!.id, spouseRec.member_id);
  await startSession(c, m!);
  return c.json({ ok: true, spouse_link_pending: !!spouseRec }, 201);
});
app.post("/api/auth/login", async (c) => {
  const b = await body(c);
  sessionSecret(c);
  const login = str(b.login, "Phone or email")!;
  const password = typeof b.password === "string" ? b.password : "";
  const key = login.includes("@") ? login.toLowerCase() : normalizePhone(login) ?? "-";
  const m = await first<{ id: number; password_hash: string | null }>(c.env.DB,
    "SELECT m.id, m.password_hash FROM identifiers i JOIN members m ON m.id=i.member_id WHERE i.value=? AND m.active=1", key);
  const ok = await verifyPassword(password, m?.password_hash ?? "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!m || !m.password_hash || !ok) throw new HttpError(401, "Wrong phone/email or password");
  await startSession(c, m as { id: number; password_hash: string });
  return c.json({ ok: true });
});
app.post("/api/auth/logout", (c) => { deleteCookie(c, SESSION_COOKIE, { path: "/" }); return c.json({ ok: true }); });

const me = new Hono<{ Bindings: Env; Variables: { member: MemberRow } }>();
me.use("*", requireMember);
const REL_COLS = "id, member_id, relation, title, first_name, last_name, birth_month, birth_day, birth_year, phone, phone_alt, email";
me.get("/", async (c) => {
  const m = c.get("member");
  const db = c.env.DB;
  const enabled = await cellsEnabled(db);
  const church = await first<{ name: string }>(db, "SELECT name FROM churches WHERE id=?", m.church_id);
  const cell = enabled && m.cell_id ? await first<{ id: number; name: string }>(db, "SELECT id, name FROM cells WHERE id=?", m.cell_id) : null;
  const sp = await linkedSpouse(db, m);
  return c.json({
    profile: { title: m.title, first_name: m.first_name, last_name: m.last_name, phone: m.phone, phone_alt: m.phone_alt, email: m.email,
      birth_month: m.birth_month, birth_day: m.birth_day, birth_year: m.birth_year,
      marital_status: m.marital_status ?? "single", anniversary: m.anniversary, has_kids: !!m.has_kids, church_id: m.church_id,
      church_name: church?.name, cell_id: enabled ? m.cell_id : null, cell_name: cell?.name ?? null,
      display_name: displayName(m.title, m.first_name, m.name) },
    linked_spouse: sp ? { member_id: sp.id, display_name: displayName(sp.title, sp.first_name, sp.name), name: sp.name,
      birth_month: sp.birth_month, birth_day: sp.birth_day, birth_year: sp.birth_year } : null,
    link_requests: {
      incoming: (await all<{ id: number; title: string | null; first_name: string | null; name: string }>(db,
        "SELECT l.id, m.title, m.first_name, m.name FROM spouse_links l JOIN members m ON m.id=l.from_member WHERE l.to_member=? AND l.status='pending'", m.id))
        .map((r) => ({ id: r.id, display_name: displayName(r.title, r.first_name, r.name) })),
      outgoing: (await all<{ id: number; title: string | null; first_name: string | null; name: string }>(db,
        "SELECT l.id, m.title, m.first_name, m.name FROM spouse_links l JOIN members m ON m.id=l.to_member WHERE l.from_member=? AND l.status='pending'", m.id))
        .map((r) => ({ id: r.id, display_name: displayName(r.title, r.first_name, r.name) })),
    },
    cells_enabled: enabled,
    cells: enabled ? await memberCells(db, m.church_id) : [],
    relatives: await all(db, `SELECT ${REL_COLS} FROM relatives WHERE household_id=? AND (relation='child' OR member_id=?) ORDER BY relation DESC, birth_year, birth_month, birth_day`, m.household_id, m.id),
    photos: await all(db, `SELECT p.id, p.member_id, p.relative_id, p.status, p.created_at FROM photos p WHERE ${PHOTO_VISIBLE} ORDER BY p.id DESC`, m.household_id, m.household_id),
  });
});
me.patch("/", async (c) => {
  const m = c.get("member"); const b = await body(c);
  for (const k of ["church_id", "access_code", "password_hash", "active", "household_id"]) delete b[k]; // members can't move church themselves
  const f = memberFields(b, m, false);
  if (!f.birth_month) throw bad("Birthday (month and day) is required");
  if (f.marital_status !== "married" && (await linkedSpouse(c.env.DB, m))) throw bad("Your account is linked to your spouse's. Please ask the church admin to change this.");
  await assertContactsFree(c.env.DB, [f.phone, f.phone_alt, f.email], { member: m.id });
  let cellId = m.cell_id;
  if (b.cell_id !== undefined) {
    if (!(await cellsEnabled(c.env.DB))) throw new HttpError(403, "Cells feature is turned off");
    cellId = intOrNull(b.cell_id, "cell_id");
    if (cellId) await assertCellInChurch(c.env.DB, cellId, m.church_id);
  }
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE members SET name=?, title=?, first_name=?, last_name=?, phone=?, phone_operator=?, phone_alt=?, phone_alt_operator=?, email=?,
      birth_month=?, birth_day=?, birth_year=?, marital_status=?, has_kids=?, cell_id=? WHERE id=?`).bind(
      f.name, f.title, f.first_name, f.last_name, f.phone, f.phone_operator, f.phone_alt, f.phone_alt_operator, f.email,
      f.birth_month, f.birth_day, f.birth_year, f.marital_status ?? "single", f.has_kids, cellId, m.id),
    c.env.DB.prepare("UPDATE households SET anniversary=? WHERE id=?").bind(f.anniversary, m.household_id),
  ]);
  await applyMaritalSideEffects(c.env, m, f.marital_status ?? "single");
  return c.json({ ok: true });
});
me.post("/password", async (c) => {
  const m = c.get("member"); const b = await body(c);
  if (!(await verifyPassword(String(b.current ?? ""), m.password_hash))) throw bad("Current password is wrong");
  const password_hash = await hashPassword(passwordField(b.password));
  await run(c.env.DB, "UPDATE members SET password_hash=? WHERE id=?", password_hash, m.id);
  await startSession(c as unknown as C, { id: m.id, password_hash });
  return c.json({ ok: true });
});
me.post("/links/:id/accept", async (c) => {
  const m = c.get("member");
  const l = await first<{ id: number; from_member: number }>(c.env.DB, "SELECT id, from_member FROM spouse_links WHERE id=? AND to_member=? AND status='pending'", intOrNull(c.req.param("id"), "id"), m.id);
  if (!l) throw notFound("Request not found");
  await linkSpouses(c.env, m.id, l.from_member);
  return c.json({ ok: true });
});
me.post("/links/:id/decline", async (c) => {
  const m = c.get("member");
  const r = await run(c.env.DB, "UPDATE spouse_links SET status='declined' WHERE id=? AND (to_member=? OR from_member=?) AND status='pending'", intOrNull(c.req.param("id"), "id"), m.id, m.id);
  if (!r.meta.changes) throw notFound("Request not found");
  return c.json({ ok: true });
});
me.post("/relatives", async (c) => c.json(await addRelative(c.env.DB, c.get("member").id, await body(c)), 201));
// children are shared by the household; a spouse record belongs to the member who created it
const ownRelative = async (c: MC) => {
  const m = c.get("member");
  const r = await first<RelativeRow>(c.env.DB, "SELECT * FROM relatives WHERE id=? AND household_id=? AND (relation='child' OR member_id=?)", intOrNull(c.req.param("id"), "id"), m.household_id, m.id);
  if (!r) throw notFound();
  return r;
};
me.patch("/relatives/:id", async (c) => c.json(await updateRelative(c.env.DB, await ownRelative(c), await body(c))));
me.delete("/relatives/:id", async (c) => { await deleteRelative(c.env, await ownRelative(c)); return c.body(null, 204); });
me.post("/photos", async (c) => {
  const m = c.get("member");
  const form = await c.req.parseBody();
  const relId = intOrNull(form.relative_id, "relative_id");
  if (relId && !(await first(c.env.DB, "SELECT id FROM relatives WHERE id=? AND household_id=? AND (relation='child' OR member_id=?)", relId, m.household_id, m.id))) throw bad("Unknown family member");
  const n = await first<{ n: number }>(c.env.DB, "SELECT COUNT(*) AS n FROM photos WHERE member_id=?", m.id);
  if ((n?.n ?? 0) >= MAX_PHOTOS_PER_MEMBER) throw bad(`You can keep up to ${MAX_PHOTOS_PER_MEMBER} photos`);
  const f = form.photo;
  const key = await savePhoto(c.env as Env, f);
  if (!key) throw bad("Please choose a photo");
  return c.json(await first(c.env.DB, "INSERT INTO photos(member_id,relative_id,r2_key,content_type) VALUES(?,?,?,?) RETURNING id, member_id, relative_id, status, created_at",
    m.id, relId, key, (f as File).type), 201);
});
const ownPhoto = async (c: MC) => {
  const m = c.get("member");
  const p = await first<{ id: number; r2_key: string }>(c.env.DB, `SELECT p.id, p.r2_key FROM photos p WHERE p.id=? AND ${PHOTO_VISIBLE}`, intOrNull(c.req.param("id"), "id"), m.household_id, m.household_id);
  if (!p) throw notFound();
  return p;
};
me.get("/photos/:id", async (c) => servePhoto(c.env, (await ownPhoto(c)).r2_key));
me.delete("/photos/:id", async (c) => {
  const p = await ownPhoto(c);
  await c.env.PHOTOS?.delete(p.r2_key);
  await run(c.env.DB, "DELETE FROM photos WHERE id=?", p.id);
  return c.body(null, 204);
});
app.route("/api/me", me);
// ---------- public ----------
app.get("/", (c) => c.html(accountPage()));
app.get("/health", (c) => c.json({ ok: true }));

// ---------- member-facing ----------
async function memberByCode(db: D1Database, code: string) {
  const m = await first<{ id: number; name: string; church_id: number; cell_id: number | null; church_name: string }>(db,
    `SELECT m.id, m.name, m.church_id, m.cell_id, ch.name AS church_name FROM members m
     JOIN churches ch ON ch.id=m.church_id WHERE m.access_code=? AND m.active=1`, code);
  if (!m) throw notFound("Member not found");
  return m;
}
async function memberView(db: D1Database, code: string) {
  const m = await memberByCode(db, code);
  const enabled = await cellsEnabled(db);
  const cells = enabled ? await memberCells(db, m.church_id) : [];
  let cell: { id: number; name: string } | null = null;
  if (enabled && m.cell_id) cell = (await first<{ id: number; name: string }>(db, "SELECT id, name FROM cells WHERE id=?", m.cell_id)) ?? null;
  return { member: { name: m.name, church: m.church_name }, cells_enabled: enabled, cell, cells };
}
async function memberSetCell(db: D1Database, code: string, raw: unknown) {
  const m = await memberByCode(db, code);
  if (!(await cellsEnabled(db))) throw new HttpError(403, "Cells feature is turned off");
  const cellId = intOrNull(raw, "cell_id");
  if (cellId !== null) await assertCellInChurch(db, cellId, m.church_id);
  await run(db, "UPDATE members SET cell_id=? WHERE id=?", cellId, m.id);
}

app.get("/api/member/:code", async (c) => c.json(await memberView(c.env.DB, c.req.param("code"))));
app.put("/api/member/:code/cell", async (c) => {
  const b = await body(c);
  await memberSetCell(c.env.DB, c.req.param("code"), b.cell_id);
  return c.json(await memberView(c.env.DB, c.req.param("code")));
});
app.get("/m/:code", async (c) => {
  try { return c.html(memberPage(c.req.param("code"), await memberView(c.env.DB, c.req.param("code")))); }
  catch (e) { if (e instanceof HttpError) return c.html(messagePage(e.message), e.status as 404); throw e; }
});
app.post("/m/:code", async (c) => {
  const code = c.req.param("code");
  const form = await c.req.parseBody();
  let msg = "Saved", isErr = false;
  try { await memberSetCell(c.env.DB, code, form.cell_id); }
  catch (e) { if (e instanceof HttpError) { msg = e.message; isErr = true; } else throw e; }
  try { return c.html(memberPage(code, await memberView(c.env.DB, code), msg, isErr), isErr ? 400 : 200); }
  catch (e) { if (e instanceof HttpError) return c.html(messagePage(e.message), e.status as 404); throw e; }
});

// ---------- admin ----------
app.use("/admin", requireAdmin);
app.use("/api/admin/*", requireAdmin);
app.get("/admin", (c) => c.html(adminPage()));

const A = "/api/admin";

// settings
app.get(`${A}/settings`, async (c) => c.json({ cells_enabled: await cellsEnabled(c.env.DB) }));
app.put(`${A}/settings`, async (c) => {
  const b = await body(c);
  if (typeof b.cells_enabled !== "boolean") throw bad("cells_enabled must be boolean");
  await run(c.env.DB, "INSERT INTO settings(key,value) VALUES('cells_enabled',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", String(b.cells_enabled));
  return c.json({ cells_enabled: b.cells_enabled });
});

// churches
app.get(`${A}/churches`, async (c) => c.json(await all(c.env.DB, "SELECT * FROM churches ORDER BY parent_id IS NOT NULL, name")));
app.post(`${A}/churches`, async (c) => {
  const b = await body(c);
  const name = str(b.name, "name")!;
  const parentId = intOrNull(b.parent_id, "parent_id");
  if (parentId === null) {
    if (await first(c.env.DB, "SELECT id FROM churches WHERE parent_id IS NULL")) throw bad("A main church already exists; set parent_id");
  } else {
    const p = await first<{ parent_id: number | null }>(c.env.DB, "SELECT parent_id FROM churches WHERE id=?", parentId);
    if (!p) throw bad("Parent church not found");
    if (p.parent_id !== null) throw bad("Parent must be the main church");
  }
  const r = await first(c.env.DB, "INSERT INTO churches(name,parent_id) VALUES(?,?) RETURNING *", name, parentId);
  return c.json(r, 201);
});
app.patch(`${A}/churches/:id`, async (c) => {
  const id = idParam(c); const b = await body(c);
  const cur = await first<{ name: string; active: number }>(c.env.DB, "SELECT * FROM churches WHERE id=?", id);
  if (!cur) throw notFound();
  const name = b.name !== undefined ? str(b.name, "name")! : cur.name;
  const active = bool(b.active) ?? cur.active;
  return c.json(await first(c.env.DB, "UPDATE churches SET name=?, active=? WHERE id=? RETURNING *", name, active, id));
});

// pcfs
app.get(`${A}/pcfs`, async (c) => {
  const churchId = intOrNull(c.req.query("church_id"), "church_id");
  return c.json(churchId
    ? await all(c.env.DB, "SELECT * FROM pcfs WHERE church_id=? ORDER BY name", churchId)
    : await all(c.env.DB, "SELECT * FROM pcfs ORDER BY church_id, name"));
});
app.post(`${A}/pcfs`, async (c) => {
  const b = await body(c);
  const churchId = intOrNull(b.church_id, "church_id"); if (!churchId) throw bad("church_id is required");
  if (!(await first(c.env.DB, "SELECT id FROM churches WHERE id=?", churchId))) throw bad("Church not found");
  return c.json(await first(c.env.DB, "INSERT INTO pcfs(church_id,name) VALUES(?,?) RETURNING *", churchId, str(b.name, "name")), 201);
});
app.patch(`${A}/pcfs/:id`, async (c) => {
  const id = idParam(c); const b = await body(c);
  const cur = await first<{ name: string; active: number }>(c.env.DB, "SELECT * FROM pcfs WHERE id=?", id);
  if (!cur) throw notFound();
  const name = b.name !== undefined ? str(b.name, "name")! : cur.name;
  return c.json(await first(c.env.DB, "UPDATE pcfs SET name=?, active=? WHERE id=? RETURNING *", name, bool(b.active) ?? cur.active, id));
});

// cells (admin view includes pcf + church)
app.get(`${A}/cells`, async (c) => {
  const churchId = intOrNull(c.req.query("church_id"), "church_id");
  const pcfId = intOrNull(c.req.query("pcf_id"), "pcf_id");
  const where: string[] = []; const p: unknown[] = [];
  if (churchId) { where.push("p.church_id=?"); p.push(churchId); }
  if (pcfId) { where.push("c.pcf_id=?"); p.push(pcfId); }
  return c.json(await all(c.env.DB,
    `SELECT c.*, p.name AS pcf_name, p.church_id FROM cells c JOIN pcfs p ON p.id=c.pcf_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY p.name, c.name`, ...p));
});
app.post(`${A}/cells`, async (c) => {
  const b = await body(c);
  const pcfId = intOrNull(b.pcf_id, "pcf_id"); if (!pcfId) throw bad("pcf_id is required");
  if (!(await first(c.env.DB, "SELECT id FROM pcfs WHERE id=?", pcfId))) throw bad("PCF not found");
  return c.json(await first(c.env.DB, "INSERT INTO cells(pcf_id,name) VALUES(?,?) RETURNING *", pcfId, str(b.name, "name")), 201);
});
app.patch(`${A}/cells/:id`, async (c) => {
  const id = idParam(c); const b = await body(c);
  const cur = await first<{ name: string; active: number; pcf_id: number }>(c.env.DB, "SELECT * FROM cells WHERE id=?", id);
  if (!cur) throw notFound();
  const name = b.name !== undefined ? str(b.name, "name")! : cur.name;
  let pcfId = cur.pcf_id;
  if (b.pcf_id !== undefined) {
    const np = intOrNull(b.pcf_id, "pcf_id"); if (!np) throw bad("pcf_id is required");
    const [o, n] = await Promise.all([
      first<{ church_id: number }>(c.env.DB, "SELECT church_id FROM pcfs WHERE id=?", cur.pcf_id),
      first<{ church_id: number }>(c.env.DB, "SELECT church_id FROM pcfs WHERE id=?", np)]);
    if (!n) throw bad("PCF not found");
    if (o!.church_id !== n.church_id) throw bad("Cannot move a cell to a PCF in another church");
    pcfId = np;
  }
  return c.json(await first(c.env.DB, "UPDATE cells SET name=?, pcf_id=?, active=? WHERE id=? RETURNING *", name, pcfId, bool(b.active) ?? cur.active, id));
});

// members
const MEMBER_SELECT = `SELECT m.id, m.church_id, m.household_id, m.name, m.title, m.first_name, m.last_name, m.phone, m.phone_operator, m.phone_alt, m.phone_alt_operator,
  m.email, m.birth_month, m.birth_day, m.birth_year, m.marital_status, h.anniversary, m.has_kids, m.cell_id, m.access_code, m.active, m.created_at,
  (m.password_hash IS NOT NULL) AS has_account, c.name AS cell_name, p.id AS pcf_id, p.name AS pcf_name, ch.name AS church_name,
  (SELECT s.id FROM members s WHERE s.household_id=m.household_id AND s.id<>m.id LIMIT 1) AS spouse_member_id,
  (SELECT s.name FROM members s WHERE s.household_id=m.household_id AND s.id<>m.id LIMIT 1) AS spouse_member_name
  FROM members m JOIN churches ch ON ch.id=m.church_id LEFT JOIN households h ON h.id=m.household_id
  LEFT JOIN cells c ON c.id=m.cell_id LEFT JOIN pcfs p ON p.id=c.pcf_id`;
app.get(`${A}/members`, async (c) => {
  const churchId = intOrNull(c.req.query("church_id"), "church_id");
  const op = c.req.query("operator"); // MTN | Airtel | Other  (matches primary or alternative number)
  const sort = c.req.query("sort") === "operator" ? "CASE m.phone_operator WHEN 'MTN' THEN 1 WHEN 'Airtel' THEN 2 WHEN 'Other' THEN 3 ELSE 4 END, m.name" : "m.name";
  const where: string[] = []; const args: unknown[] = [];
  if (churchId) { where.push("m.church_id=?"); args.push(churchId); }
  if (op) { where.push("(m.phone_operator=? OR m.phone_alt_operator=?)"); args.push(op, op); }
  return c.json(await all(c.env.DB, `${MEMBER_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${sort}`, ...args));
});
app.get(`${A}/members/:id`, async (c) => {
  const id = idParam(c);
  const m = await first<{ household_id: number }>(c.env.DB, `${MEMBER_SELECT} WHERE m.id=?`, id);
  if (!m) throw notFound();
  return c.json({ ...m, roles: await all(c.env.DB, "SELECT * FROM member_roles WHERE member_id=?", id),
    relatives: await all(c.env.DB, "SELECT * FROM relatives WHERE household_id=? AND (relation='child' OR member_id=?) ORDER BY relation DESC, birth_year, birth_month, birth_day", m.household_id, id),
    photos: await all(c.env.DB, "SELECT id, member_id, relative_id, status, source, created_at FROM photos WHERE member_id=? OR relative_id IN (SELECT id FROM relatives WHERE household_id=? AND (relation='child' OR member_id=?)) ORDER BY id DESC", id, m.household_id, id),
    coordinator_churches: await all(c.env.DB, "SELECT church_id FROM coordinator_churches WHERE member_id=?", id) });
});
app.post(`${A}/members`, async (c) => {
  const b = await body(c);
  const churchId = intOrNull(b.church_id, "church_id"); if (!churchId) throw bad("church_id is required");
  if (!(await first(c.env.DB, "SELECT id FROM churches WHERE id=?", churchId))) throw bad("Church not found");
  const cellId = intOrNull(b.cell_id, "cell_id");
  if (cellId) await assertCellInChurch(c.env.DB, cellId, churchId);
  const f = memberFields(b, null, false);
  await assertContactsFree(c.env.DB, [f.phone, f.phone_alt, f.email], {});
  const hh = await newHousehold(c.env.DB, f.marital_status === "married" ? f.anniversary : null);
  return c.json(await first(c.env.DB,
    `INSERT INTO members(church_id,household_id,name,title,first_name,last_name,phone,phone_operator,phone_alt,phone_alt_operator,email,birth_month,birth_day,birth_year,marital_status,has_kids,cell_id,access_code)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING ${PUBLIC_COLS}`,
    churchId, hh, f.name, f.title, f.first_name, f.last_name, f.phone, f.phone_operator, f.phone_alt, f.phone_alt_operator, f.email,
    f.birth_month, f.birth_day, f.birth_year, f.marital_status, f.has_kids, cellId, newAccessCode()), 201);
});
app.patch(`${A}/members/:id`, async (c) => {
  const id = idParam(c); const b = await body(c);
  const cur = await first<MemberRow>(c.env.DB, `${MEMBER_ROW} WHERE m.id=?`, id);
  if (!cur) throw notFound();
  const churchId = b.church_id !== undefined ? intOrNull(b.church_id, "church_id") : cur.church_id;
  if (!churchId) throw bad("church_id is required");
  if (churchId !== cur.church_id && !(await first(c.env.DB, "SELECT id FROM churches WHERE id=?", churchId))) throw bad("Church not found");
  let cellId = b.cell_id !== undefined ? intOrNull(b.cell_id, "cell_id") : cur.cell_id;
  if (b.cell_id !== undefined && cellId) await assertCellInChurch(c.env.DB, cellId, churchId);
  else if (cellId && churchId !== cur.church_id) cellId = null; // moving church clears the old church's cell
  const f = memberFields(b, cur, false);
  if (f.marital_status !== "married" && (await linkedSpouse(c.env.DB, cur))) throw bad("Unlink this member from their spouse first");
  await assertContactsFree(c.env.DB, [f.phone, f.phone_alt, f.email], { member: id });
  const r = await first(c.env.DB,
    `UPDATE members SET church_id=?, name=?, title=?, first_name=?, last_name=?, phone=?, phone_operator=?, phone_alt=?, phone_alt_operator=?, email=?,
     birth_month=?, birth_day=?, birth_year=?, marital_status=?, has_kids=?, cell_id=?, active=? WHERE id=? RETURNING ${PUBLIC_COLS}`,
    churchId, f.name, f.title, f.first_name, f.last_name, f.phone, f.phone_operator, f.phone_alt, f.phone_alt_operator, f.email,
    f.birth_month, f.birth_day, f.birth_year, f.marital_status, f.has_kids, cellId, bool(b.active) ?? cur.active, id);
  await run(c.env.DB, "UPDATE households SET anniversary=? WHERE id=?", f.anniversary, cur.household_id);
  await applyMaritalSideEffects(c.env, cur, f.marital_status);
  return c.json(r);
});
// Admin can link two existing accounts as spouses directly (no confirmation needed), or unlink them.
app.post(`${A}/members/:id/link-spouse`, async (c) => {
  const id = idParam(c); const b = await body(c);
  const other = intOrNull(b.member_id, "member_id"); if (!other || other === id) throw bad("Choose the spouse");
  if (!(await first(c.env.DB, "SELECT id FROM members WHERE id=?", other))) throw notFound();
  await linkSpouses(c.env, id, other);
  return c.json({ ok: true });
});
app.post(`${A}/members/:id/unlink-spouse`, async (c) => {
  const id = idParam(c);
  const cur = await first<MemberRow>(c.env.DB, `${MEMBER_ROW} WHERE m.id=?`, id);
  if (!cur) throw notFound();
  if (!(await linkedSpouse(c.env.DB, cur))) throw bad("Not linked");
  // the unlinked member gets a fresh household; children and anniversary stay with the remaining spouse
  const hh = await newHousehold(c.env.DB);
  await run(c.env.DB, "UPDATE members SET household_id=?, has_kids=0 WHERE id=?", hh, id);
  return c.json({ ok: true });
});
// family (admin)
app.post(`${A}/members/:id/relatives`, async (c) => {
  const id = idParam(c);
  if (!(await first(c.env.DB, "SELECT id FROM members WHERE id=?", id))) throw notFound();
  return c.json(await addRelative(c.env.DB, id, await body(c)), 201);
});
const relById = async (c: C) => { const r = await first<RelativeRow>(c.env.DB, "SELECT * FROM relatives WHERE id=?", idParam(c)); if (!r) throw notFound(); return r; };
app.patch(`${A}/relatives/:id`, async (c) => c.json(await updateRelative(c.env.DB, await relById(c), await body(c))));
app.delete(`${A}/relatives/:id`, async (c) => { await deleteRelative(c.env, await relById(c)); return c.body(null, 204); });

// CSV of every phone number (members + spouse records), grouped by operator — handy for bulk SMS.
app.get(`${A}/phones.csv`, async (c) => {
  const churchId = intOrNull(c.req.query("church_id"), "church_id");
  const op = c.req.query("operator");
  const w = churchId ? "AND m.church_id=?" : ""; const a = churchId ? [churchId] : [];
  const rows = await all<{ operator: string; phone: string; kind: string; name: string; church: string }>(c.env.DB, `
    SELECT * FROM (
      SELECT m.phone_operator AS operator, m.phone AS phone, 'member' AS kind, m.name, ch.name AS church FROM members m JOIN churches ch ON ch.id=m.church_id WHERE m.phone IS NOT NULL AND m.active=1 ${w}
      UNION ALL SELECT m.phone_alt_operator, m.phone_alt, 'member (alt)', m.name, ch.name FROM members m JOIN churches ch ON ch.id=m.church_id WHERE m.phone_alt IS NOT NULL AND m.active=1 ${w}
      UNION ALL SELECT r.phone_operator, r.phone, 'spouse', r.first_name || COALESCE(' ' || r.last_name, ''), ch.name FROM relatives r JOIN members m ON m.id=r.member_id JOIN churches ch ON ch.id=m.church_id WHERE r.phone IS NOT NULL AND m.active=1 ${w}
      UNION ALL SELECT r.phone_alt_operator, r.phone_alt, 'spouse (alt)', r.first_name || COALESCE(' ' || r.last_name, ''), ch.name FROM relatives r JOIN members m ON m.id=r.member_id JOIN churches ch ON ch.id=m.church_id WHERE r.phone_alt IS NOT NULL AND m.active=1 ${w}
    ) ${op ? "WHERE operator=?" : ""} ORDER BY CASE operator WHEN 'MTN' THEN 1 WHEN 'Airtel' THEN 2 ELSE 3 END, name`, ...a, ...a, ...a, ...a, ...(op ? [op] : []));
  const q = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s; };
  const csv = ["operator,phone,type,name,church", ...rows.map((r) => [r.operator, r.phone, r.kind, r.name, r.church].map(q).join(","))].join("\r\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="ce-phones${op ? "-" + op.toLowerCase() : ""}.csv"` } });
});

// photo approval queue
app.get(`${A}/photos`, async (c) => {
  const status = c.req.query("status") ?? "pending";
  if (!["pending", "approved", "rejected"].includes(status)) throw bad("Invalid status");
  return c.json(await all(c.env.DB,
    `SELECT p.id, p.member_id, p.relative_id, p.status, p.source, p.created_at, m.name AS member_name, m.church_id,
       r.first_name AS relative_first_name, r.relation
     FROM photos p JOIN members m ON m.id=p.member_id LEFT JOIN relatives r ON r.id=p.relative_id
     WHERE p.status=? ORDER BY p.id ${status === "pending" ? "ASC" : "DESC"} LIMIT 200`, status));
});
app.patch(`${A}/photos/:id`, async (c) => {
  const id = idParam(c); const b = await body(c);
  if (b.status !== "approved" && b.status !== "rejected" && b.status !== "pending") throw bad("status must be approved, rejected or pending");
  const r = await first(c.env.DB, "UPDATE photos SET status=?, reviewed_at=datetime('now') WHERE id=? RETURNING id, status", b.status, id);
  if (!r) throw notFound();
  return c.json(r);
});
app.get(`${A}/photos/:id/image`, async (c) => {
  const p = await first<{ r2_key: string }>(c.env.DB, "SELECT r2_key FROM photos WHERE id=?", idParam(c));
  if (!p) throw notFound();
  return servePhoto(c.env, p.r2_key);
});
app.delete(`${A}/photos/:id`, async (c) => {
  const p = await first<{ r2_key: string }>(c.env.DB, "SELECT r2_key FROM photos WHERE id=?", idParam(c));
  if (!p) throw notFound();
  await c.env.PHOTOS?.delete(p.r2_key);
  await run(c.env.DB, "DELETE FROM photos WHERE id=?", idParam(c));
  return c.body(null, 204);
});

// celebrations: birthdays (members, spouses, children) + wedding anniversaries
app.get(`${A}/celebrations`, async (c) => {
  const range = c.req.query("range") ?? "week";
  if (!["today", "week", "month"].includes(range)) throw bad("range must be today, week or month");
  const churchId = intOrNull(c.req.query("church_id"), "church_id");
  const tq = c.req.query("today");
  const today = tq && validDate(tq, "9999-12-31") ? tq : kampalaToday();
  const where = churchId ? "AND m.church_id=?" : "";
  const args = churchId ? [churchId] : [];
  const members = await all<MemberRow & { church_name: string }>(c.env.DB,
    `SELECT m.id, m.name, m.title, m.first_name, m.birth_month, m.birth_day, m.birth_year, m.marital_status, h.anniversary, m.household_id, m.phone, m.church_id, ch.name AS church_name
     FROM members m JOIN churches ch ON ch.id=m.church_id LEFT JOIN households h ON h.id=m.household_id WHERE m.active=1 ${where} ORDER BY m.id`, ...args);
  const rels = await all<RelativeRow>(c.env.DB,
    `SELECT r.* FROM relatives r WHERE r.household_id IN (SELECT m.household_id FROM members m WHERE m.active=1 ${where})`, ...args);
  const photos = await all<{ id: number; member_id: number; relative_id: number | null }>(c.env.DB,
    `SELECT p.id, p.member_id, p.relative_id FROM photos p WHERE p.status='approved' ORDER BY p.id DESC`);
  const photosOf = (memberId: number | null, relId: number | null) => photos.filter((p) => relId ? p.relative_id === relId : p.member_id === memberId && p.relative_id === null).map((p) => p.id);
  const parentsOf = (hh: number) => members.filter((m) => m.household_id === hh);
  const seenHH = new Set<number>();
  const byId = new Map(members.map((m) => [m.id, m]));
  const month = today.slice(0, 7);
  // "month" = the whole calendar month (days already passed come back negative); otherwise the next occurrence.
  const occ = (d: string) => {
    if (range !== "month") return nextOccurrence(d, today);
    return nextOccurrence(d, month + "-01"); // occurrence on/after the 1st of this month
  };
  const keep = (o: { date: string; days: number }) => range === "today" ? o.days === 0 : range === "week" ? o.days <= 6 : o.date.slice(0, 7) === month;
  const rel = (o: { date: string; days: number; years: number }) =>
    range === "month" ? { ...o, days: Math.round((Date.parse(o.date) - Date.parse(today)) / 86400_000) } : o;
  const items: Record<string, unknown>[] = [];
  for (const m of members) {
    const name = displayName(m.title, m.first_name, m.name);
    const base = { member_id: m.id, church_name: m.church_name, phone: m.phone };
    const mb = birthIso(m); if (mb) { const o = occ(mb); if (keep(o)) items.push({ ...base, type: "birthday", who: "member", relative_id: null, display_name: name, context: null, photo_ids: photosOf(m.id, null), ...rel(o), years: m.birth_year ? o.years : null }); }
    // one anniversary per household
    if (m.marital_status === "married" && m.anniversary && !seenHH.has(m.household_id)) {
      seenHH.add(m.household_id);
      const o = occ(m.anniversary);
      if (keep(o)) {
        const partner = parentsOf(m.household_id).find((x) => x.id !== m.id);
        const sp = partner ? null : rels.find((r) => r.member_id === m.id && r.relation === "spouse");
        const second = partner ? displayName(partner.title, partner.first_name, partner.name) : sp ? displayName(sp.title, sp.first_name, sp.first_name) : null;
        items.push({ ...base, type: "anniversary", who: "couple", relative_id: sp?.id ?? null, spouse_member_id: partner?.id ?? null,
          display_name: second ? `${name} & ${second}` : name, context: null,
          photo_ids: [...photosOf(m.id, null), ...(partner ? photosOf(partner.id, null) : []), ...(sp ? photosOf(null, sp.id) : [])], ...rel(o) });
      }
    }
  }
  for (const r of rels) {
    const parents = parentsOf(r.household_id);
    const m = byId.get(r.member_id) ?? parents[0]; const rb = birthIso(r); if (!m || !rb) continue;
    if (r.relation === "spouse" && !byId.has(r.member_id)) continue;
    const o = occ(rb); if (!keep(o)) continue;
    const parent = r.relation === "child" ? parents.map((x) => displayName(x.title, x.first_name, x.name)).join(" & ") : displayName(m.title, m.first_name, m.name);
    items.push({ member_id: m.id, church_name: m.church_name, phone: m.phone, type: "birthday", who: r.relation, relative_id: r.id,
      display_name: r.relation === "child" ? r.first_name : displayName(r.title, r.first_name, r.first_name),
      context: r.relation === "child" ? `Child of ${parent}` : `Spouse of ${parent}`, photo_ids: photosOf(null, r.id), ...rel(o), years: r.birth_year ? o.years : null });
  }
  items.sort((a, b) => (a.days as number) - (b.days as number) || String(a.display_name).localeCompare(String(b.display_name)));
  return c.json({ today, range, items });
});
app.post(`${A}/members/:id/reset-code`, async (c) => {
  const id = idParam(c);
  const r = await first(c.env.DB, "UPDATE members SET access_code=? WHERE id=? RETURNING id, access_code", newAccessCode(), id);
  if (!r) throw notFound();
  return c.json(r);
});
app.delete(`${A}/members/:id`, async (c) => {
  const id = idParam(c);
  const m = await first<MemberRow>(c.env.DB, "SELECT * FROM members WHERE id=?", id);
  if (!m) throw notFound();
  const sp = await linkedSpouse(c.env.DB, m);
  const db = c.env.DB;
  if (sp) {
    // shared household survives with the spouse: hand over the children and their photos
    await run(db, "UPDATE relatives SET member_id=? WHERE household_id=? AND relation='child'", sp.id, m.household_id);
    await run(db, "UPDATE photos SET member_id=? WHERE member_id=? AND relative_id IN (SELECT id FROM relatives WHERE household_id=? AND relation='child')", sp.id, id, m.household_id);
    await deleteMemberPhotos(c.env, id);
  } else {
    const ph = await all<{ r2_key: string }>(db, "SELECT r2_key FROM photos WHERE member_id=? OR relative_id IN (SELECT id FROM relatives WHERE household_id=?)", id, m.household_id);
    for (const p of ph) await c.env.PHOTOS?.delete(p.r2_key);
    await run(db, "DELETE FROM photos WHERE relative_id IN (SELECT id FROM relatives WHERE household_id=?)", m.household_id);
  }
  await db.batch([
    db.prepare("DELETE FROM member_roles WHERE member_id=?").bind(id),
    db.prepare("DELETE FROM coordinator_churches WHERE member_id=?").bind(id),
    db.prepare("DELETE FROM spouse_links WHERE from_member=? OR to_member=?").bind(id, id),
    db.prepare("DELETE FROM photos WHERE member_id=?").bind(id),
    db.prepare("DELETE FROM relatives WHERE member_id=?").bind(id),
    db.prepare("DELETE FROM members WHERE id=?").bind(id),
    ...(sp ? [] : [db.prepare("DELETE FROM relatives WHERE household_id=?").bind(m.household_id), db.prepare("DELETE FROM households WHERE id=?").bind(m.household_id)]),
  ]);
  return c.body(null, 204);
});

// roles
app.get(`${A}/roles`, async (c) => c.json(await all(c.env.DB,
  `SELECT r.*, m.name AS member_name FROM member_roles r JOIN members m ON m.id=r.member_id ORDER BY m.name, r.role`)));
app.post(`${A}/members/:id/roles`, async (c) => {
  const memberId = idParam(c); const b = await body(c);
  const m = await first<{ church_id: number }>(c.env.DB, "SELECT church_id FROM members WHERE id=?", memberId);
  if (!m) throw notFound("Member not found");
  const role = b.role as Role;
  if (!ROLES.includes(role)) throw bad(`role must be one of ${ROLES.join(", ")}`);
  let pcfId = intOrNull(b.pcf_id, "pcf_id"), cellId = intOrNull(b.cell_id, "cell_id");
  if (PCF_ROLES.includes(role)) {
    if (!pcfId || cellId) throw bad(`${role} requires pcf_id (and no cell_id)`);
    const p = await first<{ church_id: number }>(c.env.DB, "SELECT church_id FROM pcfs WHERE id=?", pcfId);
    if (!p) throw bad("PCF not found");
    if (p.church_id !== m.church_id) throw bad("PCF belongs to a different church");
  } else if (CELL_ROLES.includes(role)) {
    if (!cellId || pcfId) throw bad(`${role} requires cell_id (and no pcf_id)`);
    const cc = await cellChurch(c.env.DB, cellId);
    if (!cc) throw bad("Cell not found");
    if (cc.church_id !== m.church_id) throw bad("Cell belongs to a different church");
  } else {
    if (pcfId || cellId) throw bad(`${role} does not take a pcf_id or cell_id`);
    pcfId = cellId = null;
  }
  return c.json(await first(c.env.DB, "INSERT INTO member_roles(member_id,role,pcf_id,cell_id) VALUES(?,?,?,?) RETURNING *",
    memberId, role, pcfId, cellId), 201);
});
app.delete(`${A}/roles/:id`, async (c) => {
  const id = idParam(c);
  const r = await run(c.env.DB, "DELETE FROM member_roles WHERE id=?", id);
  if (!r.meta.changes) throw notFound();
  return c.body(null, 204);
});

// coordinator churches
app.put(`${A}/members/:id/coordinator-churches`, async (c) => {
  const memberId = idParam(c); const b = await body(c);
  if (!Array.isArray(b.church_ids)) throw bad("church_ids must be an array");
  const ids = [...new Set(b.church_ids.map((x) => intOrNull(x, "church_id")!))];
  if (!(await first(c.env.DB, "SELECT id FROM member_roles WHERE member_id=? AND role='COORDINATOR'", memberId)))
    throw bad("Member must have the COORDINATOR role first");
  for (const id of ids) {
    const ch = await first<{ parent_id: number | null }>(c.env.DB, "SELECT parent_id FROM churches WHERE id=?", id);
    if (!ch) throw bad(`Church ${id} not found`);
    if (ch.parent_id === null) throw bad("Coordinators cover small churches, not the main church");
  }
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM coordinator_churches WHERE member_id=?").bind(memberId),
    ...ids.map((id) => c.env.DB.prepare("INSERT INTO coordinator_churches(member_id,church_id) VALUES(?,?)").bind(memberId, id)),
  ]);
  return c.json({ member_id: memberId, church_ids: ids });
});

export default app;
