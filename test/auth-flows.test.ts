import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";

// Outbound calls (Resend + Google) are intercepted so nothing leaves the test.
const sent: { to: string[]; subject: string; html: string; text: string; from: string }[] = [];
let googleClaims: Record<string, unknown> = {};
let lastTokenBody: URLSearchParams | null = null;
const b64u = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
async function outbound(req: Request) {
  const u = new URL(req.url);
  if (u.host === "api.resend.com") { sent.push(await req.json() as any); return Response.json({ id: "e1" }); }
  if (u.host === "oauth2.googleapis.com") {
    lastTokenBody = new URLSearchParams(await req.text());
    if (lastTokenBody.get("code") !== "good") return Response.json({ error: "invalid_grant" }, { status: 400 });
    return Response.json({ id_token: `${b64u({ alg: "RS256" })}.${b64u({ iss: "https://accounts.google.com", aud: "cid", exp: Math.floor(Date.now() / 1000) + 600, ...googleClaims })}.sig` });
  }
  return new Response("blocked", { status: 599 });
}

let mf: Miniflare, bare: Miniflare;
const stmts = (f: string) => readFileSync(`migrations/${f}`, "utf8").replace(/--.*$/gm, "").split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
async function boot(bindings: Record<string, string>) {
  const out = await build({ entryPoints: ["src/index.ts"], bundle: true, format: "esm", write: false, platform: "neutral", target: "es2022" });
  const m = new Miniflare({ modules: true, script: out.outputFiles[0].text, compatibilityDate: "2025-09-01", d1Databases: ["DB"], r2Buckets: ["PHOTOS"],
    bindings: { ADMIN_TOKEN: "t", SESSION_SECRET: "s", ...bindings }, outboundService: outbound });
  const db = await m.getD1Database("DB");
  for (const f of readdirSync("migrations").sort()) for (const s of stmts(f)) await db.prepare(s).run();
  await db.prepare("INSERT INTO churches(id,name) VALUES(1,'CE Entebbe')").run();
  return m;
}
beforeAll(async () => {
  mf = await boot({ RESEND_API_KEY: "re_test", EMAIL_FROM: "CE <hello@ce.test>", GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "csecret", PUBLIC_URL: "https://ce.example" });
  bare = await boot({});
});
afterAll(async () => { await mf?.dispose(); await bare?.dispose(); });

type Jar = Record<string, string>;
const ckHeader = (j: Jar) => Object.entries(j).map(([k, v]) => `${k}=${v}`).join("; ");
async function call(path: string, o: { method?: string; body?: unknown; jar?: Jar; on?: Miniflare } = {}) {
  const headers: Record<string, string> = {};
  if (o.jar) headers.cookie = ckHeader(o.jar);
  if (o.body !== undefined) headers["content-type"] = "application/json";
  const r = await (o.on ?? mf).dispatchFetch(`http://ce.local${path}`, { method: o.method ?? "GET", headers, redirect: "manual",
    body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
  for (const c of r.headers.getSetCookie()) {
    const [kv, ...attrs] = c.split(";"); const [k, v] = kv.split("=");
    if (o.jar) { if (attrs.some((a) => /max-age=0/i.test(a)) || v === "") delete o.jar[k]; else o.jar[k] = v; }
  }
  const text = await r.text(); let json: any = null; try { json = JSON.parse(text); } catch { /* */ }
  return { status: r.status, json, text, location: r.headers.get("location") };
}
const base = { title: "", last_name: "Okello", birth_month: 4, birth_day: 9, church_id: 1, password: "password1" };
const linkIn = (html: string) => html.match(/href="([^"]+)"/)![1].replace(/&amp;/g, "&");

describe("feature flags", () => {
  it("reports and hides features when secrets are missing", async () => {
    expect((await call("/api/auth/config")).json).toEqual({ email: true, google: true });
    expect((await call("/api/auth/config", { on: bare })).json).toEqual({ email: false, google: false });
    expect((await call("/auth/google/start", { on: bare })).location).toBe("/?google=unavailable");
    expect((await call("/api/auth/forgot", { on: bare, method: "POST", body: { login: "x@y.z" } })).json).toMatchObject({ email_enabled: false });
    const j: Jar = {};
    const r = await call("/api/auth/signup", { on: bare, jar: j, method: "POST", body: { ...base, first_name: "Nomail", phone: "0701000001", email: "n@x.com" } });
    expect(r.json).toMatchObject({ ok: true, verification_sent: false });
    expect((await call("/api/me", { on: bare, jar: j })).json.features).toEqual({ email: false, google: false });
  });
});

describe("'Is this you?' on duplicate sign-up", () => {
  it("returns a structured preview (full name, masked contacts) for existing phone or email", async () => {
    await call("/api/auth/signup", { jar: {}, method: "POST", body: { ...base, first_name: "Grace", phone: "0772000001", email: "grace@x.com" } });
    const p = await call("/api/auth/check", { method: "POST", body: { phone: "+256 772 000 001" } });
    expect(p.status).toBe(409);
    expect(p.json).toMatchObject({ error: "An account with this phone number already exists", code: "account_exists", field: "phone", can_reset: true });
    expect(p.json.preview).toEqual({ matched: "phone", initials: "GO", title: null, name: "Grace Okello", photo: null, masked_phone: "0772 ••• 001",
      masked_email: "g•••@x•••.com", church: "CE Entebbe", member_since: expect.stringMatching(/^[A-Z][a-z]{2} \d{4}$/) });
    expect(p.text).not.toContain("772000001"); expect(p.text).not.toContain("grace@");
    const e = await call("/api/auth/signup", { jar: {}, method: "POST", body: { ...base, first_name: "Other", phone: "0772999999", email: "GRACE@x.com" } });
    expect(e.json).toMatchObject({ code: "account_exists", field: "email" });
    expect(e.json.preview.name).toBe("Grace Okello"); expect(e.text).not.toContain("grace@x.com");
    expect((await call("/api/auth/check", { method: "POST", body: { phone: "0772123123", email: "new@x.com" } })).json).toEqual({ ok: true });
  });
});

describe("rate limit on account lookups", () => {
  it("allows 20 checks per IP per 10 minutes, then 429; other IPs unaffected", async () => {
    const hit = (ip: string) => mf.dispatchFetch("http://ce.local/api/auth/check", { method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify({ phone: "0772000001" }) });
    for (let i = 0; i < 20; i++) expect((await hit("9.9.9.9")).status).toBe(409);
    const r = await hit("9.9.9.9");
    expect(r.status).toBe(429);
    expect((await r.json() as any).code).toBe("rate_limited");
    expect((await hit("8.8.8.8")).status).toBe(409);
    // IPv6 is limited per /64, so rotating the interface id doesn't help
    for (let i = 0; i < 20; i++) expect((await hit(`2001:db8:1:2::${i.toString(16)}`)).status).toBe(409);
    expect((await hit("2001:db8:1:2:abcd::99")).status).toBe(429);
    expect((await hit("2001:db8:1:3::1")).status).toBe(409);
  });
});

describe("email verification (Resend)", () => {
  it("sends a 24h signed link on sign-up, banner state, rate-limited resend, verifies", async () => {
    sent.length = 0;
    const j: Jar = {};
    const r = await call("/api/auth/signup", { jar: j, method: "POST", body: { ...base, first_name: "Ruth", phone: "0772000002", email: "ruth@x.com" } });
    expect(r.json).toMatchObject({ verification_sent: true });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: ["ruth@x.com"], from: "CE <hello@ce.test>", subject: "Confirm your email, Ruth" });
    expect(sent[0].html).toContain("Hi Ruth,"); expect(sent[0].html).toContain("You received this because you signed up at CE Entebbe");
    expect(sent[0].text).toContain("https://ce.example/auth/verify?t=");
    const link = linkIn(sent[0].html);
    expect(link.startsWith("https://ce.example/auth/verify?t=")).toBe(true);
    expect((await call("/api/me", { jar: j })).json.profile.email_verified).toBe(false);
    expect((await call("/api/me/verify/resend", { jar: j, method: "POST" })).status).toBe(429);
    expect((await call("/auth/verify?t=garbage")).location).toBe("/?verified=invalid");
    const v = await call(link.replace("https://ce.example", ""));
    expect(v.location).toBe("/?verified=1");
    await new Promise((r) => setTimeout(r, 50));
    expect(sent.map((m) => m.subject)).toContain("Welcome to CE Entebbe, Ruth!");
    const n = sent.length; await call(link.replace("https://ce.example", "")); await new Promise((r) => setTimeout(r, 50));
    expect(sent.length).toBe(n); // welcome only once
    expect((await call("/api/me", { jar: j })).json.profile.email_verified).toBe(true);
    // changing email un-verifies and sends a new link
    sent.length = 0;
    const me = (await call("/api/me", { jar: j })).json.profile;
    const ch = await call("/api/me", { jar: j, method: "PATCH", body: { title: me.title, first_name: me.first_name, last_name: me.last_name, phone: me.phone, birth_month: me.birth_month, birth_day: me.birth_day, email: "ruth2@x.com" } });
    expect(ch.json).toMatchObject({ verification_sent: true });
    expect(sent[0].to).toEqual(["ruth2@x.com"]);
    expect((await call("/api/me", { jar: j })).json.profile.email_verified).toBe(false);
    // the old link (for the old email) no longer verifies
    expect((await call(link.replace("https://ce.example", ""))).location).toBe("/?verified=invalid");
  });
});

describe("password reset by email", () => {
  it("sends a single-use reset link without revealing whether the account exists", async () => {
    sent.length = 0;
    const unknown = await call("/api/auth/forgot", { method: "POST", body: { login: "0700999888" } });
    const known = await call("/api/auth/forgot", { method: "POST", body: { login: "0772000001" } });
    expect(unknown.json).toEqual(known.json);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: ["grace@x.com"], subject: "Reset your CE Entebbe password" });
    expect(sent[0].html).toContain("Hi Grace,");
    const token = decodeURIComponent(linkIn(sent[0].html).split("reset=")[1]);
    await call("/api/auth/forgot", { method: "POST", body: { login: "grace@x.com" } });
    expect(sent).toHaveLength(1); // rate-limited
    expect((await call("/api/auth/reset", { method: "POST", body: { token, password: "short" } })).status).toBe(400);
    const j: Jar = {};
    expect((await call("/api/auth/reset", { jar: j, method: "POST", body: { token, password: "brandnew1" } })).json).toEqual({ ok: true });
    expect((await call("/api/me", { jar: j })).status).toBe(200);
    expect((await call("/api/auth/reset", { method: "POST", body: { token, password: "another11" } })).status).toBe(400); // single use
    expect((await call("/api/auth/login", { method: "POST", body: { login: "0772000001", password: "brandnew1" } })).status).toBe(200);
  });
});

describe("Google sign-in", () => {
  async function start(j: Jar) {
    const s = await call("/auth/google/start", { jar: j });
    const u = new URL(s.location!);
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(u.searchParams.get("redirect_uri")).toBe("https://ce.example/auth/google/callback");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("client_id")).toBe("cid");
    return u.searchParams.get("state")!;
  }
  it("rejects a bad state and passes the PKCE verifier", async () => {
    const j: Jar = {};
    await start(j);
    expect((await call("/auth/google/callback?code=good&state=nope", { jar: j })).location).toBe("/?google=error");
    const st = await start(j);
    googleClaims = { sub: "g-x", email: "x@gmail.com", email_verified: true };
    await call(`/auth/google/callback?code=good&state=${st}`, { jar: j });
    expect(lastTokenBody!.get("code_verifier")!.length).toBeGreaterThan(40);
    expect(lastTokenBody!.get("redirect_uri")).toBe("https://ce.example/auth/google/callback");
  });
  it("new user: confirm name, mandatory onboarding, email auto-verified, then signs in by Google next time", async () => {
    const j: Jar = {};
    const st = await start(j);
    googleClaims = { sub: "g-100", email: "Esther@Gmail.com", email_verified: true, given_name: "Esther", family_name: "Nakato" };
    expect((await call(`/auth/google/callback?code=good&state=${st}`, { jar: j })).location).toBe("/?google=new");
    expect(j.ce_session).toBeUndefined();
    expect((await call("/api/me", { jar: j })).status).toBe(401); // no app access before onboarding
    expect((await call("/api/auth/google/pending", { jar: j })).json.pending).toEqual({ email: "esther@gmail.com", given_name: "Esther", family_name: "Nakato", mode: "new" });
    expect((await call("/api/auth/google/complete", { jar: j, method: "POST", body: { first_name: "Esther", last_name: "Nakato", church_id: 1 } })).status).toBe(400);
    const done = await call("/api/auth/google/complete", { jar: j, method: "POST", body: {
      first_name: "Esta", last_name: "Nakato", title: "Sister", birth_month: 10, birth_day: 14, phone: "0772000100", phone_alt: "0701000100",
      church_id: 1, marital_status: "married", anniversary: "2015-06-06", has_kids: true, email: "evil@x.com" } });
    expect(done.status).toBe(201);
    const me = (await call("/api/me", { jar: j })).json.profile;
    expect(me).toMatchObject({ first_name: "Esta", email: "esther@gmail.com", email_verified: true, local_login: false, google_linked: true,
      marital_status: "married", anniversary: "2015-06-06", has_kids: true, phone: "256772000100" });
    expect(j.ce_g).toBeUndefined();
    // password login is refused politely; Google login works
    expect((await call("/api/auth/login", { method: "POST", body: { login: "0772000100", password: "whatever1" } })).json.error).toContain("Google");
    const j2: Jar = {};
    const st2 = await start(j2);
    expect((await call(`/auth/google/callback?code=good&state=${st2}`, { jar: j2 })).location).toBe("/");
    expect((await call("/api/me", { jar: j2 })).status).toBe(200);
    // Google-only member can add a password without a current one
    expect((await call("/api/me/password", { jar: j2, method: "POST", body: { password: "newpass11" } })).status).toBe(200);
  });
  it("existing email: 'Is this you?' then links Google after password login", async () => {
    const j: Jar = {};
    const st = await start(j);
    googleClaims = { sub: "g-200", email: "grace@x.com", email_verified: true, given_name: "Grace" };
    expect((await call(`/auth/google/callback?code=good&state=${st}`, { jar: j })).location).toBe("/?google=link");
    expect((await call("/api/auth/google/pending", { jar: j })).json).toMatchObject({ pending: { mode: "link", email: "grace@x.com" }, can_reset: true, preview: { matched: "email", masked_email: "g•••@x•••.com" } });
    expect((await call("/api/auth/google/complete", { jar: j, method: "POST", body: { first_name: "Fake", last_name: "Grace", birth_month: 1, birth_day: 1, phone: "0772555555", church_id: 1 } })).json.code).toBe("account_exists");
    const l = await call("/api/auth/login", { jar: j, method: "POST", body: { login: "grace@x.com", password: "brandnew1" } });
    expect(l.json).toEqual({ ok: true, google_linked: true });
    expect((await call("/api/me", { jar: j })).json.profile).toMatchObject({ google_linked: true, email_verified: true });
    const j2: Jar = {};
    const st2 = await start(j2);
    expect((await call(`/auth/google/callback?code=good&state=${st2}`, { jar: j2 })).location).toBe("/");
  });
  it("refuses unverified Google emails", async () => {
    const j: Jar = {};
    const st = await start(j);
    googleClaims = { sub: "g-300", email: "u@x.com", email_verified: false };
    expect((await call(`/auth/google/callback?code=good&state=${st}`, { jar: j })).location).toBe("/?google=unverified");
  });
});

import { maskName, maskPhone, maskEmail, initials } from "../src/people";
describe("masking helpers", () => {
  it("masks names, phones and emails", () => {
    expect(maskName("Christo", "Innocent")).toBe("C****** I*******");
    expect(initials("christo", "innocent")).toBe("CI");
    expect(maskPhone("256783335335")).toBe("0783 ••• 335");
    expect(maskPhone("447700900123")).toBe("+4477 ••• 123");
    expect(maskEmail("christo@gmail.com")).toBe("c•••@g•••.com");
    expect(maskName("Al", null)).toBe("A*");
  });
});
