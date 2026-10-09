import { Hono, type Context, type Next } from "hono";
import { adminPage } from "./admin-page";
import { memberPage, messagePage, shell } from "./member-page";

export type Env = { DB: D1Database; ADMIN_TOKEN?: string };
type C = Context<{ Bindings: Env }>;

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

// ---------- public ----------
app.get("/", (c) => c.html(shell("CE Membership", `<h1>Welcome</h1>
<p class="sub">Members: open the personal link your church admin shared with you.</p>
<a class="btn primary block" href="/admin">Admin sign in</a>`)));
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
const MEMBER_SELECT = `SELECT m.*, c.name AS cell_name, p.id AS pcf_id, p.name AS pcf_name, ch.name AS church_name
  FROM members m JOIN churches ch ON ch.id=m.church_id
  LEFT JOIN cells c ON c.id=m.cell_id LEFT JOIN pcfs p ON p.id=c.pcf_id`;
app.get(`${A}/members`, async (c) => {
  const churchId = intOrNull(c.req.query("church_id"), "church_id");
  return c.json(churchId
    ? await all(c.env.DB, `${MEMBER_SELECT} WHERE m.church_id=? ORDER BY m.name`, churchId)
    : await all(c.env.DB, `${MEMBER_SELECT} ORDER BY m.name`));
});
app.get(`${A}/members/:id`, async (c) => {
  const id = idParam(c);
  const m = await first(c.env.DB, `${MEMBER_SELECT} WHERE m.id=?`, id);
  if (!m) throw notFound();
  return c.json({ ...m, roles: await all(c.env.DB, "SELECT * FROM member_roles WHERE member_id=?", id),
    coordinator_churches: await all(c.env.DB, "SELECT church_id FROM coordinator_churches WHERE member_id=?", id) });
});
app.post(`${A}/members`, async (c) => {
  const b = await body(c);
  const churchId = intOrNull(b.church_id, "church_id"); if (!churchId) throw bad("church_id is required");
  if (!(await first(c.env.DB, "SELECT id FROM churches WHERE id=?", churchId))) throw bad("Church not found");
  const cellId = intOrNull(b.cell_id, "cell_id");
  if (cellId) await assertCellInChurch(c.env.DB, cellId, churchId);
  return c.json(await first(c.env.DB,
    "INSERT INTO members(church_id,name,phone,email,cell_id,access_code) VALUES(?,?,?,?,?,?) RETURNING *",
    churchId, str(b.name, "name"), str(b.phone, "phone", false), str(b.email, "email", false), cellId, newAccessCode()), 201);
});
app.patch(`${A}/members/:id`, async (c) => {
  const id = idParam(c); const b = await body(c);
  const cur = await first<{ church_id: number; name: string; phone: string | null; email: string | null; cell_id: number | null; active: number }>(
    c.env.DB, "SELECT * FROM members WHERE id=?", id);
  if (!cur) throw notFound();
  const churchId = b.church_id !== undefined ? intOrNull(b.church_id, "church_id") : cur.church_id;
  if (!churchId) throw bad("church_id is required");
  if (churchId !== cur.church_id && !(await first(c.env.DB, "SELECT id FROM churches WHERE id=?", churchId))) throw bad("Church not found");
  let cellId = b.cell_id !== undefined ? intOrNull(b.cell_id, "cell_id") : cur.cell_id;
  if (b.cell_id !== undefined && cellId) await assertCellInChurch(c.env.DB, cellId, churchId);
  else if (cellId && churchId !== cur.church_id) cellId = null; // moving church clears the old church's cell
  return c.json(await first(c.env.DB,
    "UPDATE members SET church_id=?, name=?, phone=?, email=?, cell_id=?, active=? WHERE id=? RETURNING *",
    churchId,
    b.name !== undefined ? str(b.name, "name") : cur.name,
    b.phone !== undefined ? str(b.phone, "phone", false) : cur.phone,
    b.email !== undefined ? str(b.email, "email", false) : cur.email,
    cellId, bool(b.active) ?? cur.active, id));
});
app.post(`${A}/members/:id/reset-code`, async (c) => {
  const id = idParam(c);
  const r = await first(c.env.DB, "UPDATE members SET access_code=? WHERE id=? RETURNING id, access_code", newAccessCode(), id);
  if (!r) throw notFound();
  return c.json(r);
});
app.delete(`${A}/members/:id`, async (c) => {
  const id = idParam(c);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM member_roles WHERE member_id=?").bind(id),
    c.env.DB.prepare("DELETE FROM coordinator_churches WHERE member_id=?").bind(id),
    c.env.DB.prepare("DELETE FROM members WHERE id=?").bind(id),
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
