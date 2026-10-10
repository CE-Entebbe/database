import { head, MARK, UI_JS } from "./styles";
const EYE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
export const adminLoginPage = () => `${head("CE Admin · Sign in", "/manifest.webmanifest")}<body>
<main class="wrap">
 <div class="hero">${MARK}<div class="pill" style="background:rgba(255,255,255,.18);color:#fff;margin-bottom:10px">Admin</div>
  <h1>Church admin</h1><p>Sign in to manage members, cells and celebrations for CE Entebbe.</p></div>
 <form class="auth-card card stack" id="f" method="post" action="/admin/login" onsubmit="adminSignIn(event)">
  <div class="fl" style="position:relative"><input id="code" name="code" type="password" required autocomplete="current-password" placeholder=" " style="padding-right:56px" autofocus>
   <label for="code">Admin access code</label>
   <button type="button" class="btn ghost" id="eye" aria-label="Show access code" aria-pressed="false" onclick="peek()" style="position:absolute;right:4px;top:7px;min-height:44px;width:48px;padding:0">${EYE}</button></div>
  <button class="btn primary block" id="signInBtn">Sign in</button>
  <p class="hint" style="text-align:center">Don't have the access code? Ask the church office.</p>
 </form>
</main>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
${UI_JS}
const $=id=>document.getElementById(id);
let tt;function toast(m,err){const t=$("toast");t.textContent=m;t.className="toast show"+(err?" err":"");clearTimeout(tt);tt=setTimeout(()=>t.className="toast",3000)}
function peek(){const i=$("code"),s=i.type==="password";i.type=s?"text":"password";$("eye").setAttribute("aria-pressed",s);$("eye").setAttribute("aria-label",s?"Hide access code":"Show access code");$("eye").style.color=s?"var(--accent-text)":""}
async function adminSignIn(e){e.preventDefault();const b=$("signInBtn");b.disabled=true;b.textContent="Signing in…";
 try{const r=await fetch("/admin/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:$("code").value}),credentials:"same-origin"});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Sign-in failed");location.replace("/admin"+location.hash)}
 catch(x){toast(x.message,true);$("code").select()}finally{b.disabled=false;b.textContent="Sign in"}}
</script></body></html>`;
