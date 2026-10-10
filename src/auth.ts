// Password hashing (PBKDF2-SHA256) and HMAC-signed session cookies, WebCrypto only.
const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (u: Uint8Array) => b64(u).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const ITER = 100_000; // Workers' PBKDF2 maximum

async function pbkdf2(password: string, salt: Uint8Array, iter: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256));
}
function eq(a: Uint8Array, b: Uint8Array) {
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return d === 0;
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(await pbkdf2(password, salt, ITER))}`;
}
export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [alg, iter, salt, hash] = stored.split("$");
  if (alg !== "pbkdf2") return false;
  return eq(await pbkdf2(password, unb64(salt), Number(iter)), unb64(hash));
}

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}
export const SESSION_COOKIE = "ce_session";
export const SESSION_DAYS = 30;
/** Token = memberId.expiryEpochSec.passwordFingerprint.sig — changing the password invalidates old sessions. */
export async function signSession(secret: string, memberId: number, pwHash: string, now = Date.now()) {
  const exp = Math.floor(now / 1000) + SESSION_DAYS * 86400;
  const fp = (await hmac(secret, "fp:" + pwHash)).slice(0, 10);
  const body = `${memberId}.${exp}.${fp}`;
  return `${body}.${await hmac(secret, body)}`;
}
export async function readSession(secret: string, token: string | undefined, now = Date.now()) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [id, exp, fp, sig] = parts;
  const expect = await hmac(secret, `${id}.${exp}.${fp}`);
  if (!eq(enc.encode(sig), enc.encode(expect))) return null;
  if (Number(exp) * 1000 < now) return null;
  return { memberId: Number(id), fp };
}
export const fingerprint = async (secret: string, pwHash: string) => (await hmac(secret, "fp:" + pwHash)).slice(0, 10);

/** Generic signed, expiring token: base64url(JSON).sig — used for email links, OAuth state and pending Google sign-ups. */
export async function signToken(secret: string, purpose: string, payload: Record<string, unknown>, ttlSec: number, now = Date.now()) {
  const body = b64url(enc.encode(JSON.stringify({ ...payload, p: purpose, exp: Math.floor(now / 1000) + ttlSec })));
  return `${body}.${await hmac(secret, "tok:" + body)}`;
}
export async function readToken<T = Record<string, unknown>>(secret: string, purpose: string, token: string | undefined | null, now = Date.now()): Promise<T | null> {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !eq(enc.encode(sig), enc.encode(await hmac(secret, "tok:" + body)))) return null;
  try {
    const o = JSON.parse(new TextDecoder().decode(unb64(body.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((body.length + 3) % 4))));
    if (o.p !== purpose || typeof o.exp !== "number" || o.exp * 1000 < now) return null;
    return o as T;
  } catch { return null; }
}
export const randomUrlSafe = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));
export async function pkceChallenge(verifier: string) {
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(verifier))));
}
