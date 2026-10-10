// Branded, email-client-safe templates (table layout, inline CSS, 600px max, VML button for Outlook).
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
export type Recipient = { title?: string | null; first_name?: string | null; church?: string | null };
export const greetingName = (r: Recipient) => [r.title, r.first_name].filter((x) => x && String(x).trim()).join(" ").trim();
const hi = (r: Recipient) => (greetingName(r) ? `Hi ${greetingName(r)},` : "Hi there,");
type Mail = { subject: string; html: string; text: string };

function layout(o: { preheader: string; heading: string; greeting: string; paras: string[]; cta?: { label: string; url: string }; note?: string; church: string }) {
  const btn = o.cta ? `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px"><tr><td align="center" bgcolor="#8b3a62" style="border-radius:12px;background:#8b3a62;background-image:linear-gradient(135deg,#7a2f54,#b4476a 55%,#e0795a)">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${esc(o.cta.url)}" style="height:52px;v-text-anchor:middle;width:280px" arcsize="22%" stroke="f" fillcolor="#8b3a62"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${esc(o.cta.label)}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${esc(o.cta.url)}" target="_blank" style="display:inline-block;padding:16px 32px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px">${esc(o.cta.label)}</a><!--<![endif]-->
</td></tr></table>
<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#7a7068">Button not working? Copy this link into your browser:<br><a href="${esc(o.cta.url)}" style="color:#8b3a62;word-break:break-all">${esc(o.cta.url)}</a></p>` : "";
  return `<!doctype html><html lang="en" xmlns:v="urn:schemas-microsoft-com:vml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(o.heading)}</title>
<style>@media (max-width:620px){.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:24px!important}}
@media (prefers-color-scheme:dark){.bg{background:#121011!important}.card{background:#1e1a1c!important;border-color:#2e292b!important}.tx{color:#f4efea!important}.mu{color:#b3a9a0!important}.ft{color:#8f867e!important}}</style></head>
<body style="margin:0;padding:0;background:#faf8f5" class="bg">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#faf8f5" class="bg" style="background:#faf8f5"><tr><td align="center" style="padding:32px 12px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="max-width:600px;background:#ffffff;border:1px solid #ebe5dd;border-radius:20px;overflow:hidden">
<tr><td bgcolor="#8b3a62" style="background:#8b3a62;background-image:linear-gradient(135deg,#7a2f54 0%,#b4476a 55%,#e0795a 100%);padding:28px 36px" class="px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;border-radius:12px;background:#a54a72;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);font-family:Inter,Segoe UI,Arial,sans-serif;font-weight:700;font-size:16px;color:#ffffff">CE</td>
<td style="padding-left:14px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#ffffff"><div style="font-size:18px;font-weight:700;line-height:1.2">CE Entebbe</div><div style="font-size:13px;opacity:.85">Celebrating every member</div></td>
</tr></table></td></tr>
<tr><td style="padding:36px 36px 32px;font-family:Inter,Segoe UI,Arial,sans-serif" class="px">
<h1 class="h1 tx" style="margin:0 0 18px;font-family:Georgia,'Iowan Old Style',serif;font-weight:600;font-size:28px;line-height:1.2;color:#1c1917">${esc(o.heading)}</h1>
<p class="tx" style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#1c1917">${esc(o.greeting)}</p>
${o.paras.map((p) => `<p class="mu" style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#4b443e">${esc(p)}</p>`).join("")}
${btn}
${o.note ? `<p class="mu" style="margin:20px 0 0;padding:12px 14px;background:#f6e9ef;border-radius:10px;font-size:13px;line-height:1.5;color:#7a2f54">${esc(o.note)}</p>` : ""}
<p class="tx" style="margin:26px 0 0;font-size:16px;line-height:1.6;color:#1c1917">With love,<br>The ${esc(o.church)} family</p>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px"><tr><td align="center" class="ft" style="padding:20px 24px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a8178">
<strong>${esc(o.church)}</strong><br>You received this because you signed up at CE Entebbe.<br>If this wasn't you, you can safely ignore this email.</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}
function text(o: { greeting: string; paras: string[]; cta?: { label: string; url: string }; note?: string; church: string }) {
  return [o.greeting, "", ...o.paras.flatMap((p) => [p, ""]), ...(o.cta ? [`${o.cta.label}: ${o.cta.url}`, ""] : []), ...(o.note ? [o.note, ""] : []),
    "With love,", `The ${o.church} family`, "", "--", o.church, "You received this because you signed up at CE Entebbe."].join("\n");
}
const churchOf = (r: Recipient) => r.church || "CE Entebbe";

export function verifyEmail(r: Recipient, url: string): Mail {
  const o = { greeting: hi(r), church: churchOf(r), cta: { label: "Confirm my email", url },
    paras: ["Welcome to the CE Entebbe family! We love celebrating birthdays and wedding anniversaries together, and confirming your email helps us keep your account safe and reach you on your special days."],
    note: "This link expires in 24 hours. If it has expired, open the app and tap “Resend”." };
  return { subject: `Confirm your email${r.first_name ? ", " + r.first_name : ""}`, html: layout({ ...o, preheader: "One tap to confirm your email for CE Entebbe.", heading: "Confirm your email" }), text: text(o) };
}
export function resetEmail(r: Recipient, url: string): Mail {
  const o = { greeting: hi(r), church: churchOf(r), cta: { label: "Choose a new password", url },
    paras: ["We received a request to reset the password for your CE Entebbe account. Tap the button below to choose a new one."],
    note: "This link works once and expires in 1 hour. If you didn't ask for a reset, ignore this email and your password stays the same." };
  return { subject: "Reset your CE Entebbe password", html: layout({ ...o, preheader: "Reset your CE Entebbe password. The link expires in 1 hour.", heading: "Reset your password" }), text: text(o) };
}
export function welcomeEmail(r: Recipient, url: string): Mail {
  const o = { greeting: hi(r), church: churchOf(r), cta: { label: "Open CE Entebbe", url },
    paras: ["Your email is confirmed. Thank you!",
      "Make sure your birthday, family and a few clear photos are in your profile, so we can celebrate you, your spouse and your children with a special card on your days."] };
  return { subject: `Welcome to CE Entebbe${r.first_name ? ", " + r.first_name : ""}!`, html: layout({ ...o, preheader: "Your email is confirmed. Welcome to the family!", heading: "You're all set" }), text: text(o) };
}
