import { head, MARK, UI_JS } from "./styles";
import { BDAY_JS } from "./bday";

const TITLE_OPTS = `<option value="">None</option><option>Brother</option><option>Sister</option><option>Pastor</option><option>Deacon</option><option>Deaconess</option>`;

export const accountPage = () => `${head("CE Membership")}<body>
<header class="top" id="topbar" hidden><div class="in"><div class="brand">${MARK}<div>CE <span>Entebbe</span></div></div><button class="btn ghost" id="logout" onclick="logout()" aria-label="Log out"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H4"/></svg></button></div></header>
<main class="wrap">
<div id="booting" style="padding-top:24px"><div class="sk" style="height:28px;width:60%;margin-bottom:12px"></div><div class="sk" style="height:16px;width:85%;margin-bottom:24px"></div><div class="list">${"<div class=\"sk sk-item\"></div>".repeat(4)}</div></div>

<section id="auth" hidden>
 <div class="hero">${MARK.replace('class="mark"', 'class="mark" style="font-size:18px"')}
  <h1>Celebrating every member</h1><p>Join the CE Entebbe family so we can celebrate your birthday and anniversary with you.</p></div>
 <div class="auth-card card">
 <div id="gWrap" hidden><a class="btn block gbtn" href="/auth/google/start"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Continue with Google</a><div class="or"><span>or</span></div></div>
 <div class="seg" role="tablist"><button role="tab" id="tSignup" aria-selected="true" onclick="authTab('signup')">Create account</button><button role="tab" id="tLogin" aria-selected="false" onclick="authTab('login')">Log in</button></div>
 <form id="signup" onsubmit="doSignup(event)" novalidate>
  <div class="progress" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <div class="step stack" data-step="1"><div class="steplabel">Step 1 of 4 · About you</div>
   <div class="fl"><select id="sTitle" name="title">${TITLE_OPTS}</select><label for="sTitle">Title</label></div>
   <div class="fl"><input id="sFirst" name="first_name" required autocomplete="given-name" placeholder=" "><label for="sFirst">First name</label></div>
   <div class="fl"><input id="sLast" name="last_name" required autocomplete="family-name" placeholder=" "><label for="sLast">Last name</label></div>
   <p class="hint" id="preview"></p></div>
  <div class="step stack" data-step="2"><div class="steplabel">Step 2 of 4 · Contact</div>
   <div class="fl"><input id="sPhone" name="phone" required inputmode="tel" autocomplete="tel" placeholder=" " oninput="opHint(this)"><label for="sPhone">Phone number</label><p class="hint op"></p></div>
   <div class="reveal" data-alt-for="phone"><div><div class="fl"><input id="sPhone2" name="phone_alt" inputmode="tel" placeholder=" " oninput="opHint(this)"><label for="sPhone2">Alternative phone (optional)</label><p class="hint op"></p></div></div></div>
   <div class="fl"><input id="sEmail" name="email" type="email" autocomplete="email" placeholder=" "><label for="sEmail">Email (optional)</label></div></div>
  <div class="step stack" data-step="3"><div class="steplabel">Step 3 of 4 · Birthday &amp; church</div>
   <div id="sBday"></div>
   <div class="fl"><select id="sChurch" name="church_id" required onchange="loadCells(this.value,'sCell','sCellWrap')"></select><label for="sChurch">Church</label></div>
   <div id="sCellWrap" class="fl" hidden><select id="sCell" name="cell_id"></select><label for="sCell">Cell (optional)</label></div></div>
  <div class="step stack" data-step="4"><div class="steplabel">Step 4 of 4 · Secure your account</div>
   <div class="fl"><input id="sPass" name="password" type="password" minlength="8" required autocomplete="new-password" placeholder=" "><label for="sPass">Password (8+ characters)</label></div>
   <p class="hint">You'll log in with your phone number or email and this password.</p></div>
  <div class="wiz-nav" style="margin-top:16px"><button type="button" class="btn ghost" id="wBack" onclick="wiz(-1)">Back</button><button type="button" class="btn primary block" id="wNext" onclick="wiz(1)">Continue</button></div>
 </form>
 <form id="login" class="stack" onsubmit="doLogin(event)" hidden>
  <div class="fl"><input id="lLogin" name="login" required autocomplete="username" placeholder=" "><label for="lLogin">Phone or email</label></div>
  <div class="fl"><input id="lPass" name="password" type="password" required autocomplete="current-password" placeholder=" "><label for="lPass">Password</label></div>
  <button class="btn primary block">Log in</button>
  <button type="button" class="btn ghost" onclick="openForgot()">Forgot your password?</button>
 </form>
 <div id="forgot" class="stack" hidden>
  <div class="steplabel">Reset password</div><h2 style="margin:0">Forgot your password?</h2>
  <div id="fgOn" class="stack"><p class="hint">Enter your phone number or email. If your account has an email address, we'll send you a link to choose a new password.</p>
   <div class="fl"><input id="fgLogin" placeholder=" " autocomplete="username"><label for="fgLogin">Phone or email</label></div>
   <button class="btn primary block" id="fgBtn" onclick="sendForgot()">Send reset link</button></div>
  <p class="hint" id="fgOff" hidden>Password reset by email isn't available yet. Please ask your church admin to help you get back into your account.</p>
  <div id="fgDone" class="empty" style="border:0" hidden><div><b>Check your inbox</b><br>If an account with that phone or email has an email address, a reset link is on its way. It expires in 1 hour.</div></div>
  <button type="button" class="btn ghost" onclick="panel('login')">Back to log in</button>
 </div>
 <div id="exists" class="stack" hidden>
  <div class="steplabel">Is this you?</div><h2 style="margin:0" id="exTitle"></h2>
  <p class="hint" id="exText"></p>
  <button class="btn primary block" onclick="exLogin()">Yes, log me in</button>
  <button class="btn block" id="exForgot" onclick="exForgot()">Yes, but I forgot my password</button>
  <p class="hint" id="exNoReset" hidden>Forgot your password? Please ask your church admin to help you get back in.</p>
  <button class="btn block" onclick="$('exNo').hidden=false">No, this isn't me</button>
  <div id="exNo" class="card stack" hidden style="box-shadow:none;background:var(--bg2)">
   <p class="hint" style="color:var(--text)">Each phone number and email can only belong to one person in our church records, so we can't use it for a second account.</p>
   <p class="hint">If you think someone registered with your details by mistake, please speak to your church admin. Otherwise you can use a different number or email.</p>
   <button class="btn block" id="exDiff" onclick="exDifferent()">Use a different number</button></div>
  <button type="button" class="btn ghost" onclick="exCancel()">Back</button>
 </div>
 <form id="reset" class="stack" hidden onsubmit="doReset(event)">
  <div class="steplabel">Reset password</div><h2 style="margin:0">Choose a new password</h2>
  <div class="fl"><input id="rsPass" name="password" type="password" minlength="8" required autocomplete="new-password" placeholder=" "><label for="rsPass">New password (8+ characters)</label></div>
  <button class="btn primary block">Save and log in</button>
 </form>
 <div id="gflow" hidden>
  <div class="progress" aria-hidden="true"><i class="done"></i><i id="gp2"></i></div>
  <form id="gName" class="stack" onsubmit="gNameNext(event)">
   <div class="steplabel">Welcome · Step 1 of 2</div><h2 style="margin:0">Is this your name?</h2>
   <p class="hint">We got this from Google (<b id="gEmail"></b>). Change it if it's not how the church knows you.</p>
   <div class="fl"><input id="gFirst" name="first_name" required placeholder=" " autocomplete="given-name"><label for="gFirst">First name</label></div>
   <div class="fl"><input id="gLast" name="last_name" required placeholder=" " autocomplete="family-name"><label for="gLast">Last name</label></div>
   <button class="btn primary block">Yes, continue</button>
   <button type="button" class="btn ghost" onclick="gCancel()">Cancel</button>
  </form>
  <form id="gOnboard" class="stack" hidden onsubmit="gComplete(event)" novalidate>
   <div class="steplabel">Welcome · Step 2 of 2</div><h2 style="margin:0">A few details to finish</h2>
   <div class="fl"><select id="goTitle" name="title">${TITLE_OPTS}</select><label for="goTitle">Title</label></div>
   <div id="goBday"></div>
   <div class="fl"><input id="goPhone" name="phone" required inputmode="tel" autocomplete="tel" placeholder=" " oninput="opHint(this)"><label for="goPhone">Phone number</label><p class="hint op"></p></div>
   <div class="reveal" data-alt-for="phone"><div><div class="fl"><input id="goPhone2" name="phone_alt" inputmode="tel" placeholder=" " oninput="opHint(this)"><label for="goPhone2">Alternative phone (optional)</label><p class="hint op"></p></div></div></div>
   <div class="fl"><select id="goChurch" name="church_id" required onchange="loadCells(this.value,'goCell','goCellWrap')"></select><label for="goChurch">Church</label></div>
   <div id="goCellWrap" class="fl" hidden><select id="goCell" name="cell_id"></select><label for="goCell">Cell (optional)</label></div>
   <label class="switch"><span><b>Married</b></span><input type="checkbox" id="goMarried" role="switch" onchange="$('goAnnWrap').classList.toggle('open',this.checked)"><span class="k"></span></label>
   <div class="reveal" id="goAnnWrap"><div><label class="f" for="goAnn">Wedding anniversary <span class="opt">optional</span></label><input id="goAnn" name="anniversary" type="date"></div></div>
   <label class="switch"><span><b>Do you have kids?</b><br><span class="hint">You can add them after this step</span></span><input type="checkbox" id="goKids" role="switch"><span class="k"></span></label>
   <button class="btn primary block" id="goBtn">Finish and enter</button>
   <button type="button" class="btn ghost" onclick="gBack()">Back</button>
  </form>
 </div>
 </div>
</section>

<section id="app" hidden>
 <div class="view" id="v-profile">
  <div id="verifyBanner" class="banner" hidden><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 7l9 6 9-6"/></svg><div style="flex:1"><b>Verify your email</b><br><span class="hint" id="vbText"></span></div><button class="btn" id="vbBtn" onclick="resendVerify()">Resend</button></div>
  <p class="pill" id="churchPill"></p><h1 id="hello"></h1><p class="sub">Keep your details up to date so we never miss your day.</p>
  <form class="card stack" onsubmit="saveProfile(event)">
   <div class="row"><div style="flex:0 1 140px"><label class="f" for="pTitle">Title</label><select id="pTitle" name="title">${TITLE_OPTS}</select></div>
   <div><label class="f" for="pFirst">First name</label><input id="pFirst" name="first_name" required></div></div>
   <div><label class="f" for="pLast">Last name</label><input id="pLast" name="last_name"></div>
   <div><label class="f" for="pPhone">Phone</label><input id="pPhone" name="phone" inputmode="tel" required oninput="opHint(this)"><p class="hint op"></p></div>
   <div class="reveal" data-alt-for="phone"><div><label class="f" for="pPhone2">Alternative phone <span class="opt">optional</span></label><input id="pPhone2" name="phone_alt" inputmode="tel" oninput="opHint(this)"><p class="hint op"></p></div></div>
   <div><label class="f" for="pEmail">Email <span class="opt">optional</span></label><input id="pEmail" name="email" type="email"></div>
   <div id="pBday"></div>
   <div id="pCellWrap" hidden><label class="f" for="pCell">My cell <span class="opt">optional</span></label><select id="pCell" name="cell_id"></select></div>
   <button class="btn primary block">Save profile</button>
  </form>
  <h2>Password</h2>
  <form class="card stack" onsubmit="changePw(event)"><p class="hint" id="pwGoogle" hidden>You sign in with Google. You can also set a password to log in with your phone or email.</p><input type="password" name="current" id="pwCur" placeholder="Current password" required autocomplete="current-password" aria-label="Current password">
   <input type="password" name="password" placeholder="New password (8+ characters)" minlength="8" required autocomplete="new-password" aria-label="New password"><button class="btn block">Change password</button></form>
 </div>

 <div class="view" id="v-family">
  <h1>Family</h1><p class="sub">We celebrate birthdays and wedding anniversaries.</p>
  <div class="card stack">
   <label class="switch"><span><b>Married</b><br><span class="hint">Add your spouse and wedding anniversary</span></span><input type="checkbox" id="married" role="switch" onchange="setMarried(this.checked)"><span class="k"></span></label>
   <div id="annWrap" hidden><label class="f" for="ann">Wedding anniversary</label><input type="date" id="ann" onchange="patchMe({anniversary:this.value},'Anniversary saved')"></div>
  </div>
  <div id="links"></div>
  <div id="spouseWrap" hidden><h2>Spouse</h2><div id="spouse"></div></div>
  <h2>Children</h2>
  <div class="card"><label class="switch"><span><b>Do you have kids?</b></span><input type="checkbox" id="kids" role="switch" onchange="patchMe({has_kids:this.checked},this.checked?'Add your children below':'Saved')"><span class="k"></span></label></div>
  <div id="kidsWrap" hidden><div class="list" id="kidsList" style="margin-top:10px"></div>
   <form class="card stack" style="margin-top:10px" onsubmit="addRel(event,'child')"><b>Add a child</b>
    <div class="row"><input name="first_name" placeholder="First name" required aria-label="Child first name"><input name="last_name" placeholder="Last name" aria-label="Child last name"></div>
    <div class="kidBday"></div><button class="btn primary block">Add child</button></form></div>
 </div>

 <div class="view" id="v-photos">
  <h1>Photos</h1><p class="sub">Upload clear photos for your celebration cards. Each photo is reviewed by the church before use.</p>
  <form class="card stack" onsubmit="upload(event)">
   <div><label class="f" for="who">Who is in the photo?</label><select id="who"></select></div>
   <label class="drop" for="files"><input type="file" id="files" accept="image/*" multiple onchange="picked(this)"><span id="dropText">Tap to choose photos</span></label>
   <div class="thumbs" id="pending"></div>
   <button class="btn primary block" id="upBtn" disabled>Upload</button>
  </form>
  <div id="gallery"></div>
 </div>
</section>
</main>
<nav class="bottom" id="nav" hidden aria-label="Sections">
 <button data-v="profile" onclick="show('profile')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg><span>Profile</span></button>
 <button data-v="family" onclick="show('family')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg><span>Family</span></button>
 <button data-v="photos" onclick="show('photos')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-9 8"/></svg><span>Photos</span></button>
</nav>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
${UI_JS}
${BDAY_JS}
const $=id=>document.getElementById(id);
const h=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
let tt;function toast(m,err){const t=$("toast");t.textContent=m;t.className="toast show"+(err?" err":"");clearTimeout(tt);tt=setTimeout(()=>t.className="toast",2800)}
async function api(path,method="GET",body,raw){const r=await fetch(path,{method,headers:body&&!raw?{"content-type":"application/json"}:{},body:raw?body:body?JSON.stringify(body):undefined,credentials:"same-origin"});
 if(r.status===204)return null;const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error||"Something went wrong");e.status=r.status;e.data=j;throw e}return j}
const formObj=f=>Object.fromEntries(new FormData(f).entries());
const TITLES={"":"None",Brother:1,Sister:1,Pastor:1,Deacon:1,Deaconess:1};
const titleOpts=sel=>Object.keys(TITLES).map(t=>'<option value="'+t+'"'+(t===(sel||"")?" selected":"")+">"+(t||"None")+"</option>").join("");
const fmt=d=>d?new Date(d+"T00:00").toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"}):"";
const today=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
document.querySelectorAll('input[type=date]').forEach(i=>i.max=today);
let ME=null;

let CFG={email:false,google:false};
const PANELS=["signup","login","forgot","exists","reset","gflow"];
function panel(t){PANELS.forEach(p=>$(p).hidden=p!==t);const tabs=t==="signup"||t==="login";document.querySelector("#auth .seg").hidden=!tabs;$("gWrap").hidden=!(tabs&&CFG.google);
 $("tSignup").setAttribute("aria-selected",t==="signup");$("tLogin").setAttribute("aria-selected",t==="login")}
function authTab(t){panel(t)}
let EX=null;
function showExists(d,value,from){EX={...d,value,from};const em=d.field==="email";
 $("exTitle").textContent=em?"An account with this email already exists":"An account with this number already exists";
 $("exText").textContent=(d.from_google?"Your Google email is already registered. ":"")+"Is this your account?"+(d.from_google?" Log in once with your password and we'll connect Google to it.":"");
 $("exForgot").hidden=!d.can_reset;$("exNoReset").hidden=!!d.can_reset;$("exNo").hidden=true;$("exDiff").textContent=em?"Use a different email":"Use a different number";$("exDiff").hidden=!!d.from_google;panel("exists")}
function exLogin(){panel("login");$("lLogin").value=EX.value||"";$("lPass").focus()}
async function exForgot(){panel("forgot");$("fgLogin").value=EX.value||"";await sendForgot()}
function exDifferent(){panel("signup");setStep(2,true);const i=EX.field==="email"?$("sEmail"):$("sPhone");i.value="";i.focus();syncAlt()}
async function exCancel(){if(EX&&EX.from_google){await api("/api/auth/google/cancel","POST",{});panel("login")}else{panel("signup")}}
function openForgot(){panel("forgot");$("fgOn").hidden=!CFG.email;$("fgOff").hidden=CFG.email;$("fgDone").hidden=true;$("fgLogin").value=$("lLogin").value}
async function sendForgot(){$("fgOn").hidden=!CFG.email;$("fgOff").hidden=CFG.email;if(!CFG.email)return;const v=$("fgLogin").value.trim();if(!v){toast("Enter your phone or email",true);return}
 $("fgBtn").disabled=true;try{await api("/api/auth/forgot","POST",{login:v});$("fgOn").hidden=true;$("fgDone").hidden=false}catch(x){toast(x.message,true)}finally{$("fgBtn").disabled=false}}
let RESET=null;
async function doReset(e){e.preventDefault();if(!e.target.reportValidity())return;try{await api("/api/auth/reset","POST",{token:RESET,password:$("rsPass").value});toast("Password updated. Welcome back!");boot()}catch(x){toast(x.message,true)}}
let GP=null;
function gNameNext(e){e.preventDefault();if(!e.target.reportValidity())return;$("gName").hidden=true;$("gOnboard").hidden=false;$("gp2").classList.add("done");scrollTo({top:0,behavior:"smooth"})}
function gBack(){$("gOnboard").hidden=true;$("gName").hidden=false;$("gp2").classList.remove("done")}
async function gCancel(){await api("/api/auth/google/cancel","POST",{});panel("signup")}
async function gComplete(e){e.preventDefault();const f=e.target;for(const el of f.querySelectorAll("input,select")){if(!el.checkValidity()){el.reportValidity();return}}
 if(!phoneLooksValid($("goPhone").value)){toast("Please enter a complete phone number",true);return}
 const b={...formObj(f),first_name:$("gFirst").value,last_name:$("gLast").value,marital_status:$("goMarried").checked?"married":"single",has_kids:$("goKids").checked};
 if(!$("goMarried").checked)delete b.anniversary;$("goBtn").disabled=true;
 try{await api("/api/auth/google/complete","POST",b);toast("Welcome to the family!");location.hash=b.has_kids||b.marital_status==="married"?"family":"profile";boot()}
 catch(x){if(x.data&&x.data.code==="account_exists"){toast(x.message,true);const i=x.data.field==="email"?null:$("goPhone");if(i){i.focus();i.select()}}else toast(x.message,true)}finally{$("goBtn").disabled=false}}
async function resendVerify(){$("vbBtn").disabled=true;try{await api("/api/me/verify/resend","POST",{});toast("Verification email sent");setTimeout(()=>$("vbBtn").disabled=false,60000)}catch(x){toast(x.message,true);$("vbBtn").disabled=false}}
function namePreview(){const t=$("sTitle").value,f=$("sFirst").value.trim();$("preview").textContent=f?"Your cards will read: "+(t?t+" ":"")+f:""}
$("sTitle").onchange=namePreview;$("sFirst").oninput=namePreview;
async function loadCells(church,sel,wrap,current){const cells=await api("/api/public/cells?church_id="+church);$(wrap).hidden=!cells.length;
 $(sel).innerHTML='<option value="">I\\'m not in a cell</option>'+cells.map(c=>'<option value="'+c.id+'"'+(c.id===current?" selected":"")+">"+h(c.name)+"</option>").join("")}
mountBday($("sBday"),{},true);mountBday($("goBday"),{},true);
const QS=new URLSearchParams(location.search);
if(location.search)history.replaceState(null,"","/"+location.hash);
async function boot(){
 try{ME=await api("/api/me")}catch(e){ME=null}
 try{CFG=await api("/api/auth/config")}catch(e){}
 const bt=$("booting");if(bt)bt.remove();$("auth").hidden=!!ME;$("app").hidden=!ME;$("nav").hidden=!ME;$("topbar").hidden=!ME;
 const v=QS.get("verified");if(v){toast(v==="1"?"Email confirmed. Thank you!":"That confirmation link is invalid or expired.",v!=="1");QS.delete("verified")}
 if(!ME){const o=await api("/api/public/churches");const opts=o.churches.length?o.churches.map(c=>'<option value="'+c.id+'">'+h(c.name)+"</option>").join(""):'<option value="">No churches yet</option>';
  $("sChurch").innerHTML=opts;$("goChurch").innerHTML=opts;
  if(o.churches.length){loadCells(o.churches[0].id,"sCell","sCellWrap");loadCells(o.churches[0].id,"goCell","goCellWrap")}
  panel(PANELS.find(p=>!$(p).hidden)||"signup");
  const g=QS.get("google");QS.delete("google");
  if(QS.get("reset")){RESET=QS.get("reset");QS.delete("reset");panel("reset");return}
  if(g==="new"||g==="link"){const r=await api("/api/auth/google/pending");GP=r.pending;
   if(GP&&GP.mode==="new"){$("gEmail").textContent=GP.email;$("gFirst").value=GP.given_name||"";$("gLast").value=GP.family_name||"";gBack();panel("gflow")}
   else if(GP){showExists({field:"email",can_reset:r.can_reset,from_google:true},GP.email)}
   else toast("Your Google sign-in expired. Please try again.",true)}
  else if(g)toast({unavailable:"Google sign-in isn't available yet.",unverified:"Your Google email isn't verified.",inactive:"This account is inactive. Please contact your church admin."}[g]||"Google sign-in didn't complete. Please try again.",true);
  return}
 render();show(location.hash.slice(1)||"profile");
}
async function refresh(){ME=await api("/api/me");render()}
function render(){const p=ME.profile;
 const needV=!!(p.email&&!p.email_verified&&ME.features&&ME.features.email);$("verifyBanner").hidden=!needV;if(needV)$("vbText").textContent="We sent a confirmation link to "+p.email+".";
 $("pwGoogle").hidden=p.local_login;$("pwCur").hidden=!p.local_login;$("pwCur").required=p.local_login;
 $("hello").textContent="Hello, "+p.display_name;$("churchPill").textContent=p.church_name+(p.cell_name?" · "+p.cell_name:"");
 $("pTitle").value=p.title||"";$("pFirst").value=p.first_name||"";$("pLast").value=p.last_name||"";$("pPhone").value=p.phone?"+"+p.phone:"";$("pPhone2").value=p.phone_alt?"+"+p.phone_alt:"";document.querySelectorAll("#v-profile input[inputmode=tel]").forEach(opHint);$("pEmail").value=p.email||"";mountBday($("pBday"),p,true);
 $("pCellWrap").hidden=!ME.cells_enabled;$("pCell").innerHTML='<option value="">I\\'m not in a cell</option>'+ME.cells.map(c=>'<option value="'+c.id+'"'+(c.id===p.cell_id?" selected":"")+">"+h(c.name)+"</option>").join("");
 const married=p.marital_status==="married";$("married").checked=married;$("annWrap").hidden=!married;$("ann").value=p.anniversary||"";$("spouseWrap").hidden=!married;
 const sp=ME.relatives.find(r=>r.relation==="spouse");const L=ME.link_requests,LS=ME.linked_spouse;
 $("links").innerHTML=L.incoming.map(l=>'<div class="card stack" style="margin-top:12px;border-color:var(--accent)"><div><b>'+h(l.display_name)+'</b> says you are their spouse.</div><p class="hint">Accepting links your accounts: children and your anniversary will be shared.</p><div class="row"><button class="btn primary" data-id="'+l.id+'" onclick="linkAct(this.dataset.id,1)">Accept</button><button class="btn" data-id="'+l.id+'" onclick="linkAct(this.dataset.id,0)">Decline</button></div></div>').join("")
  +L.outgoing.map(l=>'<div class="item" style="margin-top:12px"><div><div class="t">Waiting for '+h(l.display_name)+'</div><div class="m">They need to confirm the spouse link</div></div><button class="btn" data-id="'+l.id+'" onclick="linkAct(this.dataset.id,0)">Cancel</button></div>').join("");
 $("married").disabled=!!LS;
 $("spouse").innerHTML=LS?'<div class="item"><div><div class="t">'+h(LS.display_name)+'</div><div class="m">Linked account'+(LS.birth_month?" · birthday "+fmtBirth(LS):"")+'</div></div><span class="pill">Linked</span></div><p class="hint" style="margin-top:8px">You share children and your anniversary. Each of you manages your own profile.</p>':relForm("spouse",sp);
 $("kids").checked=p.has_kids;$("kidsWrap").hidden=!p.has_kids;
 const kids=ME.relatives.filter(r=>r.relation==="child");
 $("kidsList").innerHTML=kids.map(k=>'<details class="item" style="display:block"><summary style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;min-height:44px"><span><span class="t">'+h(k.first_name+" "+(k.last_name||""))+'</span><br><span class="m">'+fmtBirth(k)+'</span></span><span class="m">Edit</span></summary>'+relForm("child",k)+"</details>").join("");
 document.querySelectorAll(".relBday").forEach(el=>mountBday(el,{birth_month:Number(el.dataset.m)||null,birth_day:Number(el.dataset.d)||null,birth_year:Number(el.dataset.y)||null},!!el.dataset.req));
 document.querySelectorAll(".kidBday").forEach(el=>{if(!el.firstChild)mountBday(el,{},true)});
 const who=[["","Me"]].concat(ME.relatives.map(r=>[r.id,(r.relation==="spouse"?"Spouse: ":"")+r.first_name]));
 const cur=$("who").value;$("who").innerHTML=who.map(([v,t])=>'<option value="'+v+'"'+(String(v)===cur?" selected":"")+">"+h(t)+"</option>").join("");
 const groups=who.map(([v,t])=>[t,ME.photos.filter(ph=>String(ph.relative_id??"")===String(v))]).filter(g=>g[1].length);
 syncAlt();$("gallery").innerHTML=groups.length?groups.map(([t,ps])=>"<h2>"+h(t)+'</h2><div class="grid">'+ps.map(ph=>'<figure class="ph"><img loading="lazy" src="/api/me/photos/'+ph.id+'" alt=""><span class="badge '+ph.status+'">'+({pending:"In review",approved:"Approved",rejected:"Not used"})[ph.status]+'</span><button class="x" aria-label="Delete photo" onclick="delPhoto('+ph.id+')">×</button></figure>').join("")+"</div>").join(""):'<div style="margin-top:16px">'+emptyState("No photos yet. Add a few clear photos for your celebration cards.","photos")+'</div>';
}
function relForm(kind,r){r=r||{};const id=r.id?r.id:"";
 return '<form class="card stack" style="margin-top:8px" onsubmit="saveRel(event,\\''+kind+'\\','+(id||"null")+')">'
  +(kind==="spouse"?'<div class="row"><div style="flex:0 1 140px"><label class="f">Title</label><select name="title">'+titleOpts(r.title)+'</select></div><div><label class="f">First name</label><input name="first_name" required value="'+h(r.first_name)+'"></div></div>':'<div><label class="f">First name</label><input name="first_name" required value="'+h(r.first_name)+'"></div>')
  +'<div><label class="f">Last name</label><input name="last_name" value="'+h(r.last_name)+'"></div>'
  +(kind==="spouse"?'<div><label class="f">Phone <span class="opt">optional</span></label><input name="phone" inputmode="tel" oninput="opHint(this)" value="'+h(r.phone?"+"+r.phone:"")+'"><p class="hint op"></p></div><div class="reveal" data-alt-for="phone"><div><label class="f">Alternative phone <span class="opt">optional</span></label><input name="phone_alt" inputmode="tel" oninput="opHint(this)" value="'+h(r.phone_alt?"+"+r.phone_alt:"")+'"><p class="hint op"></p></div></div><div><label class="f">Email <span class="opt">optional</span></label><input name="email" type="email" value="'+h(r.email)+'"></div>'+(id?"":'<p class="hint">If your spouse already has an account with this phone or email, we will ask them to confirm and link your family.</p>'):"")
  +'<div class="relBday" data-req="'+(kind==="child"?1:"")+'" data-m="'+(r.birth_month||"")+'" data-d="'+(r.birth_day||"")+'" data-y="'+(r.birth_year||"")+'"></div>'
  +'<div class="row"><button class="btn primary">'+(id?"Save":"Add spouse")+'</button>'+(id?'<button type="button" class="btn danger" onclick="delRel('+id+')">Remove</button>':"")+"</div></form>"}
async function linkAct(id,accept){try{await api("/api/me/links/"+id+(accept?"/accept":"/decline"),"POST");toast(accept?"Accounts linked":"Done");refresh()}catch(x){toast(x.message,true)}}
function opOf(v){let d=String(v||"").replace(/[^0-9+]/g,"");if(d[0]==="+")d=d.slice(1);else if(d.slice(0,2)==="00")d=d.slice(2);else if(d[0]==="0")d="256"+d.slice(1);else if(d.length===9)d="256"+d;
 if(d.length<6)return"";if(d.slice(0,3)!=="256")return"Other";const n=d.slice(3);if(/^7[6-9]/.test(n)||/^3/.test(n))return"MTN";if(/^7[045]/.test(n)||/^73[01]/.test(n)||/^20/.test(n))return"Airtel";return"Other"}
function opHint(i){const p=i.parentNode.querySelector(".op");if(p)p.textContent=opOf(i.value)?"Network: "+opOf(i.value):""}
function show(v){document.querySelectorAll(".view").forEach(e=>e.classList.toggle("on",e.id==="v-"+v));document.querySelectorAll("#nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===v?"page":"false"));history.replaceState(null,"","#"+v);scrollTo(0,0)}
let STEP=1;const STEPS=4;
function setStep(n,back){STEP=n;document.querySelectorAll("#signup .step").forEach(el=>{const on=Number(el.dataset.step)===n;el.classList.toggle("on",on);el.classList.toggle("back",on&&!!back)});
 document.querySelectorAll("#signup .progress i").forEach((el,i)=>el.classList.toggle("done",i<n));
 $("wBack").style.visibility=n>1?"visible":"hidden";$("wNext").textContent=n===STEPS?"Create account":"Continue";
 const first=document.querySelector('#signup .step.on input:not([type=hidden]),#signup .step.on select');if(first&&n>1&&matchMedia("(min-width:600px)").matches)first.focus({preventScroll:true})}
function stepValid(){for(const el of document.querySelectorAll("#signup .step.on input,#signup .step.on select")){if(!el.checkValidity()){el.reportValidity();return false}}
 if(STEP===2&&!phoneLooksValid($("sPhone").value)){toast("Please enter a complete phone number",true);return false}return true}
async function wiz(d){if(d>0&&!stepValid())return;
 if(d>0&&STEP===2){try{await api("/api/auth/check","POST",{phone:$("sPhone").value,phone_alt:$("sPhone2").value,email:$("sEmail").value})}
  catch(x){if(x.data&&x.data.code==="account_exists"){showExists(x.data,x.data.field==="email"?$("sEmail").value.trim():$("sPhone").value.trim());return}}}if(d>0&&STEP===STEPS){$("signup").requestSubmit();return}setStep(Math.min(STEPS,Math.max(1,STEP+d)),d<0);scrollTo({top:0,behavior:"smooth"})}
async function doSignup(e){e.preventDefault();if(!stepValid())return;const btn=$("wNext");btn.disabled=true;btn.textContent="Creating…";
 try{await api("/api/auth/signup","POST",formObj(e.target));toast("Welcome to the family!");boot()}
 catch(x){if(x.data&&x.data.code==="account_exists"){showExists(x.data,x.data.field==="email"?$("sEmail").value.trim():$("sPhone").value.trim());return}
 toast(x.message,true);const m=x.message.toLowerCase();setStep(/phone|email|number/.test(m)?2:/birth|day|month|year/.test(m)?3:/name|title/.test(m)?1:STEP,true)}
 finally{btn.disabled=false;if(STEP===STEPS)btn.textContent="Create account"}}
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.closest&&e.target.closest("#signup")&&e.target.tagName==="INPUT"){e.preventDefault();wiz(1)}});
setStep(1);
async function doLogin(e){e.preventDefault();try{const r=await api("/api/auth/login","POST",formObj(e.target));if(r.google_linked)toast("Google is now connected to your account");boot()}catch(x){toast(x.message,true)}}
async function logout(){await api("/api/auth/logout","POST");location.hash="";boot()}
async function patchMe(b,msg){try{const r=await api("/api/me","PATCH",b);if(r&&r.verification_sent)toast("Saved. Check your inbox to confirm your new email.");else if(msg)toast(msg);await refresh()}catch(x){toast(x.message,true);refresh()}}
async function saveProfile(e){e.preventDefault();const b=formObj(e.target);if(!ME.cells_enabled)delete b.cell_id;patchMe(b,"Profile saved")}
async function changePw(e){e.preventDefault();try{await api("/api/me/password","POST",formObj(e.target));e.target.reset();toast("Password changed")}catch(x){toast(x.message,true)}}
async function setMarried(on){if(!on&&ME.relatives.some(r=>r.relation==="spouse")&&!confirm("This removes your spouse's details and photos. Continue?")){$("married").checked=true;return}
 patchMe({marital_status:on?"married":"single"},on?"Now add your spouse and anniversary":"Saved")}
async function saveRel(e,kind,id){e.preventDefault();const b=formObj(e.target);try{if(id)await api("/api/me/relatives/"+id,"PATCH",b);else{const r=await api("/api/me/relatives","POST",{...b,relation:kind});if(r&&r.link_requested){toast("Request sent. Your spouse needs to confirm.");refresh();return}}toast("Saved");refresh()}catch(x){toast(x.message,true)}}
async function addRel(e,kind){e.preventDefault();try{await api("/api/me/relatives","POST",{...formObj(e.target),relation:kind});e.target.reset();e.target.querySelector(".kidBday").innerHTML="";toast("Child added");refresh()}catch(x){toast(x.message,true)}}
async function delRel(id){if(!confirm("Remove this person and their photos?"))return;await api("/api/me/relatives/"+id,"DELETE");toast("Removed");refresh()}
async function delPhoto(id){if(!confirm("Delete this photo?"))return;await api("/api/me/photos/"+id,"DELETE");refresh()}
// Resize on-device so uploads are fast and small (max 1600px JPEG).
function shrink(file){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const s=Math.min(1,1600/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
 c.getContext("2d").drawImage(img,0,0,c.width,c.height);c.toBlob(b=>b?res(b):rej(new Error("Could not read image")),"image/jpeg",.86);URL.revokeObjectURL(img.src)};img.onerror=()=>rej(new Error("Could not read "+file.name));img.src=URL.createObjectURL(file)})}
let PICKED=[];
function picked(inp){PICKED=[...inp.files].slice(0,10);$("pending").innerHTML=PICKED.map(f=>'<img alt="" src="'+URL.createObjectURL(f)+'">').join("");$("upBtn").disabled=!PICKED.length;$("upBtn").textContent=PICKED.length?"Upload "+PICKED.length+" photo"+(PICKED.length>1?"s":""):"Upload";$("dropText").textContent=PICKED.length?"Change selection":"Tap to choose photos"}
async function upload(e){e.preventDefault();const btn=$("upBtn");btn.disabled=true;let ok=0;
 for(const [i,f] of PICKED.entries()){btn.textContent="Uploading "+(i+1)+" of "+PICKED.length+"…";try{const fd=new FormData();fd.append("photo",await shrink(f),"photo.jpg");if($("who").value)fd.append("relative_id",$("who").value);await api("/api/me/photos","POST",fd,true);ok++}catch(x){toast(x.message,true)}}
 PICKED=[];$("files").value="";$("pending").innerHTML="";btn.textContent="Upload";$("dropText").textContent="Tap to choose photos";if(ok)toast(ok+" photo"+(ok>1?"s":"")+" sent for review");refresh()}
window.addEventListener("hashchange",()=>ME&&show(location.hash.slice(1)||"profile"));boot();
</script></body></html>`;
