import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { phoneOperator } from "../src/people";

const TOKEN = "t";
let mf: Miniflare;
const stmts = (f: string) => readFileSync(`migrations/${f}`, "utf8").replace(/--.*$/gm, "").split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
const files = readdirSync("migrations").sort();

async function req(path: string, o: { method?: string; body?: unknown; ck?: string; admin?: boolean } = {}) {
  const headers: Record<string, string> = {};
  if (o.admin) headers.authorization = `Bearer ${TOKEN}`;
  if (o.ck) headers.cookie = o.ck;
  if (o.body !== undefined) headers["content-type"] = "application/json";
  const r = await mf.dispatchFetch(`http://x${path}`, { method: o.method ?? "GET", headers, body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
  const text = await r.text(); let json: any = null; try { json = JSON.parse(text); } catch { /* */ }
  const sc = r.headers.get("set-cookie");
  return { status: r.status, json, text, cookie: sc?.startsWith("ce_session=") ? sc.split(";")[0] : undefined };
}
const admin = (path: string, method = "GET", body?: unknown) => req(path, { method, body, admin: true });

beforeAll(async () => {
  const out = await build({ entryPoints: ["src/index.ts"], bundle: true, format: "esm", write: false, platform: "neutral", target: "es2022" });
  mf = new Miniflare({ modules: true, script: out.outputFiles[0].text, compatibilityDate: "2025-09-01", d1Databases: ["DB"], r2Buckets: ["PHOTOS"], bindings: { ADMIN_TOKEN: TOKEN, SESSION_SECRET: "s" } });
  const db = await mf.getD1Database("DB");
  // apply migrations up to 0003, seed legacy data, then 0004 — proves the re-normalisation + household backfill
  for (const f of files.filter((f) => f < "0004")) for (const s of stmts(f)) await db.prepare(s).run();
  await db.prepare("INSERT INTO churches(id,name) VALUES(1,'CE Entebbe')").run();
  await db.prepare("INSERT INTO members(id,church_id,name,phone,email,access_code,marital_status,anniversary) VALUES(1,1,'Christo Innocent','0783335335','X@Y.com','c1','married','2010-05-05')").run();
  for (const f of files.filter((f) => f >= "0004")) for (const s of stmts(f)) await db.prepare(s).run();
});
afterAll(() => mf?.dispose());

const signup = (o: Record<string, unknown>) => req("/api/auth/signup", { method: "POST", body: {
  title: "", last_name: "Okello", birth_month: 1, birth_day: 1, church_id: 1, password: "password1", ...o } });

describe("operators", () => {
  it("detects MTN / Airtel / Other", () => {
    expect(phoneOperator("256772123456")).toBe("MTN");
    expect(phoneOperator("256761123456")).toBe("MTN");
    expect(phoneOperator("256790123456")).toBe("MTN");
    expect(phoneOperator("256701123456")).toBe("Airtel");
    expect(phoneOperator("256745123456")).toBe("Airtel");
    expect(phoneOperator("256752123456")).toBe("Airtel");
    expect(phoneOperator("256720123456")).toBe("Other"); // Lyca
    expect(phoneOperator("447700900123")).toBe("Other"); // foreign
    expect(phoneOperator(null)).toBeNull();
  });
});

describe("migration 0004", () => {
  it("re-normalises legacy phones, sets operator, moves anniversary to a household", async () => {
    const m = (await admin("/api/admin/members/1")).json;
    expect(m).toMatchObject({ phone: "256783335335", phone_operator: "MTN", household_id: 1, anniversary: "2010-05-05" });
  });
});

describe("contacts are unique across members and spouse records", () => {
  let john = "", johnId = 0;
  it("stores alt phone with operator; rejects reuse anywhere", async () => {
    const r = await signup({ first_name: "John", phone: "0772000001", phone_alt: "0701000001", email: "john@x.com" });
    expect(r.status).toBe(201); john = r.cookie!;
    const me = (await req("/api/me", { ck: john })).json;
    expect(me.profile).toMatchObject({ phone: "256772000001", phone_alt: "256701000001" });
    johnId = (await admin("/api/admin/members?operator=Airtel")).json.find((m: any) => m.first_name === "John").id;
    // someone else using John's alt number / email / Christo's legacy phone
    expect((await signup({ first_name: "A", phone: "+256 701 000001" })).status).toBe(409);
    expect((await signup({ first_name: "A", phone: "0772999999", email: "JOHN@x.com" })).status).toBe(409);
    expect((await signup({ first_name: "A", phone: "0783335335" })).status).toBe(409);
    expect((await admin("/api/admin/members", "POST", { church_id: 1, first_name: "B", phone_alt: "0772000001" })).status).toBe(409);
    // login with alt number works
    expect((await req("/api/auth/login", { method: "POST", body: { login: "0701000001", password: "password1" } })).status).toBe(200);
  });
  it("spouse record numbers are reserved too", async () => {
    await req("/api/me", { method: "PATCH", body: { marital_status: "married", anniversary: "2015-06-01" }, ck: john });
    const sp = await req("/api/me/relatives", { method: "POST", ck: john, body: { relation: "spouse", title: "Sister", first_name: "Mary", phone: "0752000002", phone_alt: "0782000002" } });
    expect(sp.status).toBe(201); expect(sp.json).toMatchObject({ phone_operator: "Airtel", phone_alt_operator: "MTN" });
    expect((await admin("/api/admin/members", "POST", { church_id: 1, first_name: "C", phone: "0782000002" })).status).toBe(409);
    const pr = await req("/api/me", { method: "PATCH", ck: john, body: { phone_alt: "0752000002" } });
    expect(pr.status).toBe(409);
  });
  it("operator filter, sort and CSV export", async () => {
    const mtn = (await admin("/api/admin/members?operator=MTN&sort=operator")).json.map((m: any) => m.first_name ?? m.name);
    expect(mtn).toEqual(expect.arrayContaining(["John"]));
    const csv = (await admin("/api/admin/phones.csv")).text.split("\r\n");
    expect(csv[0]).toBe("operator,phone,type,name,church");
    expect(csv.some((l) => l.startsWith("Airtel,256752000002,spouse,Mary"))).toBe(true);
    const ops = csv.slice(1).map((l) => l.split(",")[0]);
    expect(ops).toEqual([...ops].sort((a, b) => ["MTN", "Airtel", "Other"].indexOf(a) - ["MTN", "Airtel", "Other"].indexOf(b)));
    expect((await admin("/api/admin/phones.csv?operator=Airtel")).text.split("\r\n").slice(1).every((l) => l.startsWith("Airtel"))).toBe(true);
  });

  let mary = "";
  it("spouse signing up with the number on a spouse record needs the other's confirmation, then households merge", async () => {
    // John adds kids; Mary will add an overlapping child before linking
    expect((await req("/api/me/relatives", { method: "POST", ck: john, body: { relation: "child", first_name: "Tim", birth_month: 3, birth_day: 4 } })).status).toBe(201);
    expect((await req("/api/me/relatives", { method: "POST", ck: john, body: { relation: "child", first_name: "tim", birth_month: 3, birth_day: 4 } })).status).toBe(409);
    const r = await signup({ title: "Sister", first_name: "Mary", phone: "0752000002", marital_status: "married" });
    expect(r.status).toBe(201); expect(r.json.spouse_link_pending).toBe(true); mary = r.cookie!;
    await req("/api/me/relatives", { method: "POST", ck: mary, body: { relation: "child", first_name: "Tim", last_name: "Okello", birth_month: 3, birth_day: 4, birth_year: 2019 } });
    await req("/api/me/relatives", { method: "POST", ck: mary, body: { relation: "child", first_name: "Ann", birth_month: 7, birth_day: 8 } });
    const mm = (await req("/api/me", { ck: mary })).json;
    expect(mm.link_requests.outgoing).toHaveLength(1);
    expect(mm.linked_spouse).toBeNull();
    // Mary can't accept her own request; John accepts
    expect((await req(`/api/me/links/${mm.link_requests.outgoing[0].id}/accept`, { method: "POST", ck: mary })).status).toBe(404);
    const jm = (await req("/api/me", { ck: john })).json;
    expect(jm.link_requests.incoming[0].display_name).toBe("Sister Mary");
    expect((await req(`/api/me/links/${jm.link_requests.incoming[0].id}/accept`, { method: "POST", ck: john })).status).toBe(200);
    const j2 = (await req("/api/me", { ck: john })).json, m2 = (await req("/api/me", { ck: mary })).json;
    expect(j2.linked_spouse.display_name).toBe("Sister Mary");
    expect(m2.linked_spouse.display_name).toBe("John");
    const kidsJ = j2.relatives.filter((r: any) => r.relation === "child");
    expect(kidsJ.map((k: any) => k.first_name).sort()).toEqual(["Ann", "Tim"]); // Tim merged
    expect(kidsJ.find((k: any) => k.first_name === "Tim").birth_year).toBe(2019);
    expect(j2.relatives.some((r: any) => r.relation === "spouse")).toBe(false); // spouse record replaced by Mary's account
    expect(m2.relatives.map((r: any) => r.id).sort()).toEqual(kidsJ.map((r: any) => r.id).sort());
    expect(m2.profile.anniversary).toBe("2015-06-01"); // shared
    // Mary edits a child John added
    const tim = kidsJ.find((k: any) => k.first_name === "Tim");
    expect((await req(`/api/me/relatives/${tim.id}`, { method: "PATCH", ck: mary, body: { last_name: "Okello-Mary" } })).status).toBe(200);
    expect((await req("/api/me", { ck: john })).json.relatives.find((r: any) => r.id === tim.id).last_name).toBe("Okello-Mary");
    // can't go single while linked
    expect((await req("/api/me", { method: "PATCH", ck: john, body: { marital_status: "single" } })).status).toBe(400);
  });

  it("celebrate lists each child and the anniversary once", async () => {
    const items = (await admin("/api/admin/celebrations?range=month&today=2026-03-01")).json.items;
    expect(items.filter((i: any) => i.display_name === "Tim")).toHaveLength(1);
    expect(items.find((i: any) => i.display_name === "Tim").context).toBe("Child of John & Sister Mary");
    const ann = (await admin("/api/admin/celebrations?range=month&today=2026-06-01")).json.items.filter((i: any) => i.type === "anniversary" && i.display_name.includes("Mary"));
    expect(ann).toHaveLength(1); expect(ann[0].display_name).toBe("John & Sister Mary");
  });

  it("adding a spouse by an existing member's number sends a request they must confirm", async () => {
    const a = await signup({ first_name: "Peter", phone: "0772000010", marital_status: "married" });
    const b = await signup({ first_name: "Ruth", phone: "0772000011" });
    const r = await req("/api/me/relatives", { method: "POST", ck: a.cookie, body: { relation: "spouse", first_name: "Ruth", phone: "0772000011" } });
    expect(r.json).toEqual({ link_requested: true });
    const inc = (await req("/api/me", { ck: b.cookie })).json.link_requests.incoming;
    expect(inc[0].display_name).toBe("Peter");
    expect((await req(`/api/me/links/${inc[0].id}/decline`, { method: "POST", ck: b.cookie })).status).toBe(200);
    expect((await req("/api/me", { ck: a.cookie })).json.linked_spouse).toBeNull();
    // already-linked accounts can't be claimed
    const r2 = await req("/api/me/relatives", { method: "POST", ck: a.cookie, body: { relation: "spouse", first_name: "X", phone: "0752000002" } });
    expect(r2.json.link_requested).toBe(true);
    const mm = (await req("/api/me", { ck: mary })).json;
    expect((await req(`/api/me/links/${mm.link_requests.incoming[0].id}/accept`, { method: "POST", ck: mary })).status).toBe(409);
  });

  it("deleting a linked member keeps the shared children with the spouse", async () => {
    await admin(`/api/admin/members/${johnId}`, "DELETE");
    const m = (await req("/api/me", { ck: mary })).json;
    expect(m.linked_spouse).toBeNull();
    expect(m.relatives.filter((r: any) => r.relation === "child")).toHaveLength(2);
  });
});
