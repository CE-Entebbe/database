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
  mf = new Miniflare({ modules: true, script: out.outputFiles[0].text, compatibilityDate: "2025-09-01", d1Databases: ["DB"], bindings: { ADMIN_TOKEN: TOKEN } });
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
    const form = await mf.dispatchFetch(`http://x/m/${code}`, { method: "POST", body: new URLSearchParams({ cell_id: String(ids.cell1) }) });
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

  it("serves the admin UI and home page", async () => {
    expect((await call("/admin")).text).toContain("CE Admin");
    expect((await call("/", { auth: null })).status).toBe(200);
  });
});
