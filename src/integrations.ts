// Outbound integrations: Resend (email) and Google OAuth 2.0 / OpenID Connect. Both are optional:
// every feature checks *Enabled() and hides itself when the secrets are missing.
export type IntegrationEnv = {
  RESEND_API_KEY?: string; EMAIL_FROM?: string; PUBLIC_URL?: string;
  GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string;
};
export const emailEnabled = (e: IntegrationEnv) => !!e.RESEND_API_KEY;
export const googleEnabled = (e: IntegrationEnv) => !!(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
export const DEFAULT_FROM = "CE Entebbe <onboarding@resend.dev>";
export const baseUrl = (e: IntegrationEnv, reqUrl: string) => (e.PUBLIC_URL || new URL(reqUrl).origin).replace(/\/+$/, "");

const escH = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
export function emailHtml(heading: string, text: string, cta: string, link: string) {
  return `<!doctype html><html><body style="margin:0;background:#faf8f5;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1c1917">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:480px;background:#fff;border:1px solid #ebe5dd;border-radius:16px" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#7a2f54,#b4476a 55%,#e0795a);background-color:#8b3a62;border-radius:16px 16px 0 0;padding:24px;color:#fff;font-weight:700;font-size:18px">CE Entebbe</td></tr>
<tr><td style="padding:24px"><h1 style="font-size:20px;margin:0 0 12px">${escH(heading)}</h1><p style="margin:0 0 20px;line-height:1.5;color:#4b443e">${escH(text)}</p>
<a href="${escH(link)}" style="display:inline-block;background:#8b3a62;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px">${escH(cta)}</a>
<p style="margin:20px 0 0;font-size:12px;color:#8a8178;word-break:break-all">Or open this link: ${escH(link)}</p>
<p style="margin:16px 0 0;font-size:12px;color:#8a8178">If you didn't ask for this, you can ignore this email.</p></td></tr></table></td></tr></table></body></html>`;
}
export async function sendEmail(e: IntegrationEnv, to: string, subject: string, html: string, text: string) {
  if (!e.RESEND_API_KEY) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${e.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: e.EMAIL_FROM || DEFAULT_FROM, to: [to], subject, html, text }),
  });
  if (!r.ok) console.error("resend failed", r.status, await r.text().catch(() => ""));
  return r.ok;
}

export const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
export type GoogleProfile = { sub: string; email: string; email_verified: boolean; given_name?: string; family_name?: string; name?: string };
export function googleAuthUrl(e: IntegrationEnv, redirectUri: string, state: string, challenge: string) {
  const q = new URLSearchParams({ client_id: e.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile",
    state, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account" });
  return `${GOOGLE_AUTH}?${q}`;
}
/** Exchanges the code (with the PKCE verifier) and reads the ID token. The token comes straight from Google over TLS,
 * so per OpenID Connect Core 3.1.3.7 the signature check may be skipped; we still validate iss/aud/exp. */
export async function googleExchange(e: IntegrationEnv, code: string, verifier: string, redirectUri: string): Promise<GoogleProfile> {
  const r = await fetch(GOOGLE_TOKEN, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, code_verifier: verifier, client_id: e.GOOGLE_CLIENT_ID!, client_secret: e.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  const j = (await r.json().catch(() => ({}))) as { id_token?: string };
  if (!r.ok || !j.id_token) throw new Error("Google sign-in failed");
  const part = j.id_token.split(".")[1] ?? "";
  const c = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((part.length + 3) % 4)), (ch) => ch.charCodeAt(0))));
  if (!["https://accounts.google.com", "accounts.google.com"].includes(c.iss) || c.aud !== e.GOOGLE_CLIENT_ID || c.exp * 1000 < Date.now()) throw new Error("Invalid Google token");
  if (!c.sub || !c.email) throw new Error("Google did not share an email address");
  return { sub: String(c.sub), email: String(c.email).toLowerCase(), email_verified: c.email_verified === true || c.email_verified === "true",
    given_name: c.given_name, family_name: c.family_name, name: c.name };
}
