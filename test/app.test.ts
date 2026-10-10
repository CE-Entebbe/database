import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";

const TOKEN = "test-admin-token";
let mf: Miniflare;
const call = async (path: string, init: { method?: string; body?: unknown; auth?: string | null } = {}) => {
  const headers: Record<string, string> = {};
  if (init.auth !== null) headers.authorization = init.auth ?? `Bearer ${TOKEN}`;
  if (init.body !== undefined) headers["content-type"] = "application/json";
  const r = await mf.dispatchFetch(`http://x${path}`, { method: init.method ?? "GET", headers, body: init.body !== undefined ? JSON.stringify(init.body) : undefined });
  const text = await r.text();
  let json: any = null; try { json = JSON.parse(text); } catch { /* html */ }
  return { status: r.status, json, text };
};
const post = (p: string, body: unknown) => call(p, { method: "POST", body });
const patch = (p: string, body: unknown) => call(p, { method: "PATCH", body });

beforeAll(async () => {
  const out = await build({ entryPoints: ["src/index.ts"], bundle: true, format: "esm", write: false, platform: "neutral", target: "es2022" });
  mf = new Miniflare({ modules: true, script: out.outputFiles[0].text, compatibilityDate: "2025-09-01", d1Databases: ["DB"], r2Buckets: ["PHOTOS"], bindings: { ADMIN_TOKEN: TOKEN, SESSION_SECRET: "test-session-secret" } });
  const db = await mf.getD1Database("DB");
  for (const f of readdirSync("migrations").sort()) {
    const sql = readFileSync(`migrations/${f}`, "utf8").replace(/--.*$/gm, "");
    for (const stmt of sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) await db.prepare(stmt).run();
  }
});
afterAll(() => mf?.dispose());

describe("church membership app", () => {
  const ids: Record<string, number> = {};
  let code = "", code2 = "";

  it("rejects admin requests without a valid token", async () => {
    expect((await call("/api/admin/churches", { auth: null })).status).toBe(401);
    expect((await call("/api/admin/churches", { auth: "Bearer wrong" })).status).toBe(401);
    expect((await call("/admin", { auth: null })).status).toBe(401);
    const basic = "Basic " + btoa("admin:" + TOKEN);
    expect((await call("/api/admin/churches", { auth: basic })).status).toBe(200);
  });

  it("creates a main church and small churches", async () => {
    const main = await post("/api/admin/churches", { name: "CE Entebbe" });
    expect(main.status).toBe(201); ids.main = main.json.id;
    expect((await post("/api/admin/churches", { name: "Another main" })).status).toBe(400);
    const small = await post("/api/admin/churches", { name: "CE Kitoro", parent_id: ids.main });
    ids.small = small.json.id;
    expect((await post("/api/admin/churches", { name: "Nested", parent_id: ids.small })).status).toBe(400);
  });

  it("creates PCFs and cells, unique per scope", async () => {
    ids.pcfA = (await post("/api/admin/pcfs", { church_id: ids.main, name: "PCF Grace" })).json.id;
    expect((await post("/api/admin/pcfs", { church_id: ids.main, name: "PCF Grace" })).status).toBe(409);
    expect((await post("/api/admin/pcfs", { church_id: ids.small, name: "PCF Grace" })).status).toBe(201);
    ids.pcfSmall = (await call(`/api/admin/pcfs?church_id=${ids.small}`)).json[0].id;
    ids.cell1 = (await post("/api/admin/cells", { pcf_id: ids.pcfA, name: "Cell Alpha" })).json.id;
    ids.cell2 = (await post("/api/admin/cells", { pcf_id: ids.pcfA, name: "Cell Beta" })).json.id;
    ids.cellSmall = (await post("/api/admin/cells", { pcf_id: ids.pcfSmall, name: "Kitoro Cell" })).json.id;
    expect((await post("/api/admin/cells", { pcf_id: ids.pcfA, name: "Cell Alpha" })).status).toBe(409);
    expect((await patch(`/api/admin/cells/${ids.cell1}`, { pcf_id: ids.pcfSmall })).status).toBe(400);
  });

  it("creates members (cell optional) and rejects cross-church cells", async () => {
    const m = await post("/api/admin/members", { church_id: ids.main, name: "Jane Doe", phone: "0700000000" });
    expect(m.status).toBe(201); expect(m.json.cell_id).toBeNull();
    ids.m1 = m.json.id; code = m.json.access_code;
    expect((await post("/api/admin/members", { church_id: ids.main, name: "X", cell_id: ids.cellSmall })).status).toBe(400);
    const m2 = await post("/api/admin/members", { church_id: ids.small, name: "Sam", cell_id: ids.cellSmall });
    ids.m2 = m2.json.id; code2 = m2.json.access_code;
    expect((await patch(`/api/admin/members/${ids.m1}`, { cell_id: ids.cellSmall })).status).toBe(400);
  });

  it("hides cells from members while the toggle is off", async () => {
    const v = await call(`/api/member/${code}`, { auth: null });
    expect(v.json.cells_enabled).toBe(false); expect(v.json.cells).toEqual([]);
    expect((await call(`/api/member/${code}/cell`, { method: "PUT", body: { cell_id: ids.cell1 }, auth: null })).status).toBe(403);
  });

  it("member sees only id+name of active cells in own church", async () => {
    await call("/api/admin/settings", { method: "PUT", body: { cells_enabled: true } });
    await patch(`/api/admin/cells/${ids.cell2}`, { active: false });
    const v = await call(`/api/member/${code}`, { auth: null });
    expect(v.json.cells).toEqual([{ id: ids.cell1, name: "Cell Alpha" }]);
    expect(v.text).not.toMatch(/PCF|pcf|role/i);
    const html = await call(`/m/${code}`, { auth: null });
    expect(html.text).toContain("Cell Alpha");
    expect(html.text).not.toContain("Kitoro Cell");
    expect(html.text).not.toContain("Cell Beta");
    expect(html.text).not.toContain("PCF Grace");
  });

  it("member can pick own-church active cell only", async () => {
    const put = (cell_id: unknown, c = code) => call(`/api/member/${c}/cell`, { method: "PUT", body: { cell_id }, auth: null });
    expect((await put(ids.cellSmall)).status).toBe(400);
    expect((await put(ids.cell2)).status).toBe(400); // inactive
    const ok = await put(ids.cell1);
    expect(ok.status).toBe(200); expect(ok.json.cell).toEqual({ id: ids.cell1, name: "Cell Alpha" });
    expect((await put(null)).json.cell).toBeNull();
    const form = await mf.dispatchFetch(`http://x/m/${code}`, { method: "POST", body: new URLSearchParams({ cell_id: String(ids.cell1) }) as any });
    expect(form.status).toBe(200);
    expect((await call(`/api/admin/members/${ids.m1}`)).json.cell_id).toBe(ids.cell1);
    expect((await call(`/api/member/nope`, { auth: null })).status).toBe(404);
  });

  it("deactivating a PCF hides its cells from members", async () => {
    await patch(`/api/admin/pcfs/${ids.pcfA}`, { active: false });
    expect((await call(`/api/member/${code}`, { auth: null })).json.cells).toEqual([]);
    await patch(`/api/admin/pcfs/${ids.pcfA}`, { active: true });
  });

  it("validates role scope", async () => {
    const r = (m: number, b: unknown) => post(`/api/admin/members/${m}/roles`, b);
    expect((await r(ids.m1, { role: "CELL_LEADER" })).status).toBe(400);
    expect((await r(ids.m1, { role: "CELL_LEADER", pcf_id: ids.pcfA })).status).toBe(400);
    expect((await r(ids.m1, { role: "CELL_LEADER", cell_id: ids.cellSmall })).status).toBe(400);
    expect((await r(ids.m1, { role: "CELL_LEADER", cell_id: ids.cell1 })).status).toBe(201);
    expect((await r(ids.m1, { role: "PCF_LEADER", cell_id: ids.cell1 })).status).toBe(400);
    expect((await r(ids.m1, { role: "ASST_PCF_LEADER", pcf_id: ids.pcfA })).status).toBe(201);
    expect((await r(ids.m1, { role: "BIBLE_STUDY_TEACHER", pcf_id: ids.pcfA })).status).toBe(400);
    expect((await r(ids.m1, { role: "BIBLE_STUDY_TEACHER" })).status).toBe(201);
    expect((await r(ids.m1, { role: "BIBLE_STUDY_TEACHER" })).status).toBe(409);
    expect((await r(ids.m1, { role: "PASTOR" })).status).toBe(400);
    const roles = await call(`/api/admin/members/${ids.m1}`);
    expect(roles.json.roles).toHaveLength(3);
    // still invisible to the member
    expect((await call(`/api/member/${code}`, { auth: null })).text).not.toMatch(/LEADER|TEACHER/);
  });

  it("links coordinators to small churches", async () => {
    expect((await call(`/api/admin/members/${ids.m1}/coordinator-churches`, { method: "PUT", body: { church_ids: [ids.small] } })).status).toBe(400);
    await post(`/api/admin/members/${ids.m1}/roles`, { role: "COORDINATOR" });
    expect((await call(`/api/admin/members/${ids.m1}/coordinator-churches`, { method: "PUT", body: { church_ids: [ids.main] } })).status).toBe(400);
    const ok = await call(`/api/admin/members/${ids.m1}/coordinator-churches`, { method: "PUT", body: { church_ids: [ids.small] } });
    expect(ok.json.church_ids).toEqual([ids.small]);
  });

  it("resets access codes, deactivates and deletes members", async () => {
    const r = await post(`/api/admin/members/${ids.m2}/reset-code`, {});
    expect((await call(`/api/member/${code2}`, { auth: null })).status).toBe(404);
    expect((await call(`/api/member/${r.json.access_code}`, { auth: null })).status).toBe(200);
    expect((await call(`/api/admin/members/${ids.m1}`, { method: "DELETE" })).status).toBe(204);
    expect((await call(`/api/admin/members/${ids.m1}`)).status).toBe(404);
  });

  it("serves the admin UI", async () => {
    expect((await call("/admin")).text).toContain("Celebrations");
  });
});

describe("accounts, family, photos, celebrations", () => {
  let cookie = "", church = 0, mainCell = 0;
  const me = async (path: string, init: { method?: string; body?: unknown; form?: FormData; ck?: string } = {}) => {
    const headers: Record<string, string> = { cookie: init.ck ?? cookie };
    if (init.body !== undefined) headers["content-type"] = "application/json";
    let payload: any = init.body !== undefined ? JSON.stringify(init.body) : undefined;
    if (init.form) { // serialise multipart with Node's own Request, then hand raw bytes to Miniflare
      const req = new Request("http://x", { method: "POST", body: init.form });
      headers["content-type"] = req.headers.get("content-type")!;
      payload = new Uint8Array(await req.arrayBuffer());
    }
    const r = await mf.dispatchFetch(`http://x${path}`, { method: init.method ?? "GET", headers, body: payload });
    const sc = r.headers.get("set-cookie"); if (sc && sc.startsWith("ce_session=")) cookie = sc.split(";")[0];
    const text = await r.text(); let json: any = null; try { json = JSON.parse(text); } catch { /* */ }
    return { status: r.status, json, text, headers: r.headers };
  };
  const png = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], "p.png", { type: "image/png" });
  const signup = { title: "Brother", first_name: "John", last_name: "Okello", phone: "0772 123456", email: "john@example.com", dob: "1990-10-12", password: "s3cret-pass" };

  it("lists public churches and cells (id+name only)", async () => {
    const r = await call("/api/public/churches", { auth: null });
    church = r.json.churches.find((c: any) => c.name === "CE Entebbe").id;
    expect(Object.keys(r.json.churches[0]).sort()).toEqual(["id", "name"]);
    const cells = await call(`/api/public/cells?church_id=${church}`, { auth: null });
    mainCell = cells.json[0].id;
    expect(Object.keys(cells.json[0]).sort()).toEqual(["id", "name"]);
  });

  it("signs up with validation, normalised phone and duplicate protection", async () => {
    expect((await me("/api/auth/signup", { method: "POST", body: { ...signup, church_id: church, password: "short" } })).status).toBe(400);
    expect((await me("/api/auth/signup", { method: "POST", body: { ...signup, church_id: church, dob: "" } })).status).toBe(400);
    expect((await me("/api/auth/signup", { method: "POST", body: { ...signup, church_id: church, dob: "2999-01-01" } })).status).toBe(400);
    const r = await me("/api/auth/signup", { method: "POST", body: { ...signup, church_id: church, cell_id: mainCell } });
    expect(r.status).toBe(201);
    expect(r.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    const dup = await me("/api/auth/signup", { method: "POST", body: { ...signup, email: "x@y.com", phone: "+256772123456", church_id: church }, ck: "" });
    expect(dup.status).toBe(409);
    const prof = await me("/api/me");
    expect(prof.json.profile).toMatchObject({ display_name: "Brother John", phone: "256772123456", marital_status: "single", cell_id: mainCell });
    expect(prof.text).not.toMatch(/password|pcf/i);
  });

  it("logs in by phone or email, rejects bad passwords and forged cookies", async () => {
    const saved = cookie;
    expect((await me("/api/auth/login", { method: "POST", body: { login: "0772123456", password: "nope" }, ck: "" })).status).toBe(401);
    expect((await me("/api/auth/login", { method: "POST", body: { login: "JOHN@example.com", password: signup.password }, ck: "" })).status).toBe(200);
    expect((await me("/api/auth/login", { method: "POST", body: { login: "0772123456", password: signup.password }, ck: "" })).status).toBe(200);
    expect((await me("/api/me", { ck: "ce_session=1.9999999999.abc.forged" })).status).toBe(401);
    expect((await me("/api/me", { ck: "" })).status).toBe(401);
    expect((await me("/api/me", { ck: saved })).status).toBe(200);
  });

  it("manages marriage, spouse, anniversary and kids", async () => {
    expect((await me("/api/me/relatives", { method: "POST", body: { relation: "spouse", first_name: "Mary" } })).status).toBe(400); // not married yet
    await me("/api/me", { method: "PATCH", body: { marital_status: "married", anniversary: "2015-10-14" } });
    const sp = await me("/api/me/relatives", { method: "POST", body: { relation: "spouse", title: "Sister", first_name: "Mary", dob: "1992-10-11" } });
    expect(sp.status).toBe(201);
    expect((await me("/api/me/relatives", { method: "POST", body: { relation: "spouse", first_name: "Other" } })).status).toBe(409);
    const kid = await me("/api/me/relatives", { method: "POST", body: { relation: "child", title: "Brother", first_name: "Tim", dob: "2018-10-13" } });
    expect(kid.json.title).toBeNull(); // children have no title
    const p = await me("/api/me");
    expect(p.json.profile).toMatchObject({ marital_status: "married", anniversary: "2015-10-14", has_kids: true });
    expect(p.json.relatives).toHaveLength(2);
  });

  it("uploads photos into the approval queue; only the owner can view them", async () => {
    const spouseId = (await me("/api/me")).json.relatives.find((r: any) => r.relation === "spouse").id;
    const fd = new FormData(); fd.append("photo", png());
    const up = await me("/api/me/photos", { method: "POST", form: fd });
    expect(up.status).toBe(201); expect(up.json.status).toBe("pending");
    const fd2 = new FormData(); fd2.append("photo", png()); fd2.append("relative_id", String(spouseId));
    expect((await me("/api/me/photos", { method: "POST", form: fd2 })).status).toBe(201);
    const bad = new FormData(); bad.append("photo", new File(["hi"], "a.txt", { type: "text/plain" }));
    expect((await me("/api/me/photos", { method: "POST", form: bad })).status).toBe(400);
    const img = await me(`/api/me/photos/${up.json.id}`);
    expect(img.status).toBe(200); expect(img.headers.get("content-type")).toBe("image/png");
    expect((await me(`/api/me/photos/${up.json.id}`, { ck: "" })).status).toBe(401);
    const q = await call("/api/admin/photos?status=pending");
    expect(q.json.length).toBe(2);
    expect((await call(`/api/admin/photos/${up.json.id}`, { method: "PATCH", body: { status: "approved" } })).json.status).toBe("approved");
    expect((await call(`/api/admin/photos/${up.json.id}/image`)).status).toBe(200);
    expect((await call("/api/admin/photos?status=pending")).json.length).toBe(1);
  });

  it("builds the celebrations dashboard incl. spouses, kids and anniversaries", async () => {
    const r = (range: string) => call(`/api/admin/celebrations?range=${range}&today=2026-10-10&church_id=${church}`);
    const week = (await r("week")).json.items;
    const john = week.find((i: any) => i.display_name === "Brother John");
    expect(john).toMatchObject({ type: "birthday", date: "2026-10-12", days: 2 });
    expect(john.photo_ids.length).toBe(1); // only approved photos
    expect(week.find((i: any) => i.display_name === "Sister Mary")).toMatchObject({ who: "spouse", date: "2026-10-11", context: "Spouse of Brother John" });
    expect(week.find((i: any) => i.display_name === "Tim")).toMatchObject({ who: "child", date: "2026-10-13" });
    expect(week.find((i: any) => i.type === "anniversary")).toMatchObject({ display_name: "Brother John & Sister Mary", years: 11, date: "2026-10-14" });
    expect((await r("today")).json.items).toHaveLength(0);
    expect((await call("/api/admin/celebrations?range=month&today=2026-10-20")).json.items.length).toBeGreaterThanOrEqual(4);
    expect((await call("/api/admin/celebrations?range=week&today=2026-11-01")).json.items).toHaveLength(0);
  });

  it("going single removes spouse and anniversary", async () => {
    await me("/api/me", { method: "PATCH", body: { marital_status: "single" } });
    const p = await me("/api/me");
    expect(p.json.profile.anniversary).toBeNull();
    expect(p.json.relatives.map((r: any) => r.relation)).toEqual(["child"]);
    expect(p.json.photos).toHaveLength(1);
  });

  it("password change invalidates old sessions; logout clears cookie", async () => {
    const old = cookie;
    expect((await me("/api/me/password", { method: "POST", body: { current: "wrong", password: "another-pass" } })).status).toBe(400);
    expect((await me("/api/me/password", { method: "POST", body: { current: signup.password, password: "another-pass" } })).status).toBe(200);
    expect((await me("/api/me", { ck: old })).status).toBe(401);
    expect((await me("/api/me")).status).toBe(200);
    const lo = await me("/api/auth/logout", { method: "POST" });
    expect(lo.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });

  it("admin sees family and photos but never password hashes", async () => {
    const list = await call(`/api/admin/members?church_id=${church}`);
    expect(list.text).not.toContain("pbkdf2");
    const john = list.json.find((m: any) => m.first_name === "John");
    expect(john.has_account).toBe(1);
    const d = await call(`/api/admin/members/${john.id}`);
    expect(d.json.relatives).toHaveLength(1); expect(d.json.photos.length).toBe(1);
    expect(d.text).not.toContain("pbkdf2");
  });

  it("serves the account page at /", async () => {
    const r = await call("/", { auth: null });
    expect(r.text).toContain("Create account");
  });
});
