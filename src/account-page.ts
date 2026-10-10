import { head } from "./styles";
import { BDAY_JS } from "./bday";

const TITLE_OPTS = `<option value="">None</option><option>Brother</option><option>Sister</option><option>Pastor</option><option>Deacon</option><option>Deaconess</option>`;

export const accountPage = () => `${head("CE Membership")}<body>
<header class="top"><div class="in"><div class="brand">CE <span>Membership</span></div><button class="btn" id="logout" hidden onclick="logout()">Log out</button></div></header>
<main class="wrap">

<section id="auth" hidden>
 <h1>Welcome</h1><p class="sub">Join the CE Entebbe family so we can celebrate your special days with you.</p>
 <div class="seg" role="tablist"><button role="tab" id="tSignup" aria-selected="true" onclick="authTab('signup')">Create account</button><button role="tab" id="tLogin" aria-selected="false" onclick="authTab('login')">Log in</button></div>
 <form id="signup" class="card stack" onsubmit="doSignup(event)" novalidate>
  <div class="row"><div style="flex:0 1 140px"><label class="f" for="sTitle">Title</label><select id="sTitle" name="title">${TITLE_OPTS}</select></div>
  <div><label class="f" for="sFirst">First name</label><input id="sFirst" name="first_name" required autocomplete="given-name"></div></div>
  <div><label class="f" for="sLast">Last name</label><input id="sLast" name="last_name" required autocomplete="family-name"></div>
  <p class="hint" id="preview"></p>
  <div><label class="f" for="sPhone">Phone</label><input id="sPhone" name="phone" required inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXX" oninput="opHint(this)"><p class="hint op"></p></div>
  <div><label class="f" for="sPhone2">Alternative phone <span class="opt">optional</span></label><input id="sPhone2" name="phone_alt" inputmode="tel" placeholder="07XX XXX XXX" oninput="opHint(this)"><p class="hint op"></p></div>
  <div><label class="f" for="sEmail">Email <span class="opt">optional</span></label><input id="sEmail" name="email" type="email" autocomplete="email"></div>
  <div id="sBday"></div>
  <div><label class="f" for="sChurch">Church</label><select id="sChurch" name="church_id" required onchange="loadCells(this.value,'sCell','sCellWrap')"></select></div>
  <div id="sCellWrap" hidden><label class="f" for="sCell">Cell <span class="opt">optional</span></label><select id="sCell" name="cell_id"></select></div>
  <div><label class="f" for="sPass">Password</label><input id="sPass" name="password" type="password" minlength="8" required autocomplete="new-password" placeholder="At least 8 characters"></div>
  <button class="btn primary block">Create account</button>
 </form>
 <form id="login" class="card stack" onsubmit="doLogin(event)" hidden>
  <div><label class="f" for="lLogin">Phone or email</label><input id="lLogin" name="login" required autocomplete="username"></div>
  <div><label class="f" for="lPass">Password</label><input id="lPass" name="password" type="password" required autocomplete="current-password"></div>
  <button class="btn primary block">Log in</button>
  <p class="hint">Forgot your password? Ask your church admin.</p>
 </form>
</section>

<section id="app" hidden>
 <div class="view" id="v-profile">
  <p class="pill" id="churchPill"></p><h1 id="hello"></h1><p class="sub">Keep your details up to date so we never miss your day.</p>
  <form class="card stack" onsubmit="saveProfile(event)">
   <div class="row"><div style="flex:0 1 140px"><label class="f" for="pTitle">Title</label><select id="pTitle" name="title">${TITLE_OPTS}</select></div>
   <div><label class="f" for="pFirst">First name</label><input id="pFirst" name="first_name" required></div></div>
   <div><label class="f" for="pLast">Last name</label><input id="pLast" name="last_name"></div>
   <div><label class="f" for="pPhone">Phone</label><input id="pPhone" name="phone" inputmode="tel" required oninput="opHint(this)"><p class="hint op"></p></div>
   <div><label class="f" for="pPhone2">Alternative phone <span class="opt">optional</span></label><input id="pPhone2" name="phone_alt" inputmode="tel" oninput="opHint(this)"><p class="hint op"></p></div>
   <div><label class="f" for="pEmail">Email <span class="opt">optional</span></label><input id="pEmail" name="email" type="email"></div>
   <div id="pBday"></div>
   <div id="pCellWrap" hidden><label class="f" for="pCell">My cell <span class="opt">optional</span></label><select id="pCell" name="cell_id"></select></div>
   <button class="btn primary block">Save profile</button>
  </form>
  <h2>Password</h2>
  <form class="card stack" onsubmit="changePw(event)"><input type="password" name="current" placeholder="Current password" required autocomplete="current-password" aria-label="Current password">
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
${BDAY_JS}
const $=id=>document.getElementById(id);
const h=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
let tt;function toast(m,err){const t=$("toast");t.textContent=m;t.className="toast show"+(err?" err":"");clearTimeout(tt);tt=setTimeout(()=>t.className="toast",2800)}
async function api(path,method="GET",body,raw){const r=await fetch(path,{method,headers:body&&!raw?{"content-type":"application/json"}:{},body:raw?body:body?JSON.stringify(body):undefined,credentials:"same-origin"});
 if(r.status===204)return null;const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error||"Something went wrong");e.status=r.status;throw e}return j}
const formObj=f=>Object.fromEntries(new FormData(f).entries());
const TITLES={"":"None",Brother:1,Sister:1,Pastor:1,Deacon:1,Deaconess:1};
const titleOpts=sel=>Object.keys(TITLES).map(t=>'<option value="'+t+'"'+(t===(sel||"")?" selected":"")+">"+(t||"None")+"</option>").join("");
const fmt=d=>d?new Date(d+"T00:00").toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"}):"";
const today=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
document.querySelectorAll('input[type=date]').forEach(i=>i.max=today);
let ME=null;

function authTab(t){$("signup").hidden=t!=="signup";$("login").hidden=t!=="login";$("tSignup").setAttribute("aria-selected",t==="signup");$("tLogin").setAttribute("aria-selected",t==="login")}
function namePreview(){const t=$("sTitle").value,f=$("sFirst").value.trim();$("preview").textContent=f?"Your cards will read: "+(t?t+" ":"")+f:""}
$("sTitle").onchange=namePreview;$("sFirst").oninput=namePreview;
async function loadCells(church,sel,wrap,current){const cells=await api("/api/public/cells?church_id="+church);$(wrap).hidden=!cells.length;
 $(sel).innerHTML='<option value="">I\\'m not in a cell</option>'+cells.map(c=>'<option value="'+c.id+'"'+(c.id===current?" selected":"")+">"+h(c.name)+"</option>").join("")}
mountBday($("sBday"),{},true);
async function boot(){
 try{ME=await api("/api/me")}catch(e){ME=null}
 $("auth").hidden=!!ME;$("app").hidden=!ME;$("nav").hidden=!ME;$("logout").hidden=!ME;
 if(!ME){const o=await api("/api/public/churches");$("sChurch").innerHTML=o.churches.length?o.churches.map(c=>'<option value="'+c.id+'">'+h(c.name)+"</option>").join(""):'<option value="">No churches yet</option>';
  if(o.churches.length)loadCells(o.churches[0].id,"sCell","sCellWrap");return}
 render();show(location.hash.slice(1)||"profile");
}
async function refresh(){ME=await api("/api/me");render()}
function render(){const p=ME.profile;
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
 $("gallery").innerHTML=groups.length?groups.map(([t,ps])=>"<h2>"+h(t)+'</h2><div class="grid">'+ps.map(ph=>'<figure class="ph"><img loading="lazy" src="/api/me/photos/'+ph.id+'" alt=""><span class="badge '+ph.status+'">'+({pending:"In review",approved:"Approved",rejected:"Not used"})[ph.status]+'</span><button class="x" aria-label="Delete photo" onclick="delPhoto('+ph.id+')">×</button></figure>').join("")+"</div>").join(""):'<div class="empty" style="margin-top:16px">No photos yet.</div>';
}
function relForm(kind,r){r=r||{};const id=r.id?r.id:"";
 return '<form class="card stack" style="margin-top:8px" onsubmit="saveRel(event,\\''+kind+'\\','+(id||"null")+')">'
  +(kind==="spouse"?'<div class="row"><div style="flex:0 1 140px"><label class="f">Title</label><select name="title">'+titleOpts(r.title)+'</select></div><div><label class="f">First name</label><input name="first_name" required value="'+h(r.first_name)+'"></div></div>':'<div><label class="f">First name</label><input name="first_name" required value="'+h(r.first_name)+'"></div>')
  +'<div><label class="f">Last name</label><input name="last_name" value="'+h(r.last_name)+'"></div>'
  +(kind==="spouse"?'<div><label class="f">Phone <span class="opt">optional</span></label><input name="phone" inputmode="tel" oninput="opHint(this)" value="'+h(r.phone?"+"+r.phone:"")+'"><p class="hint op"></p></div><div><label class="f">Alternative phone <span class="opt">optional</span></label><input name="phone_alt" inputmode="tel" oninput="opHint(this)" value="'+h(r.phone_alt?"+"+r.phone_alt:"")+'"><p class="hint op"></p></div><div><label class="f">Email <span class="opt">optional</span></label><input name="email" type="email" value="'+h(r.email)+'"></div>'+(id?"":'<p class="hint">If your spouse already has an account with this phone or email, we will ask them to confirm and link your family.</p>'):"")
  +'<div class="relBday" data-req="'+(kind==="child"?1:"")+'" data-m="'+(r.birth_month||"")+'" data-d="'+(r.birth_day||"")+'" data-y="'+(r.birth_year||"")+'"></div>'
  +'<div class="row"><button class="btn primary">'+(id?"Save":"Add spouse")+'</button>'+(id?'<button type="button" class="btn danger" onclick="delRel('+id+')">Remove</button>':"")+"</div></form>"}
async function linkAct(id,accept){try{await api("/api/me/links/"+id+(accept?"/accept":"/decline"),"POST");toast(accept?"Accounts linked":"Done");refresh()}catch(x){toast(x.message,true)}}
function opOf(v){let d=String(v||"").replace(/[^0-9+]/g,"");if(d[0]==="+")d=d.slice(1);else if(d.slice(0,2)==="00")d=d.slice(2);else if(d[0]==="0")d="256"+d.slice(1);else if(d.length===9)d="256"+d;
 if(d.length<6)return"";if(d.slice(0,3)!=="256")return"Other";const n=d.slice(3);if(/^7[6-9]/.test(n)||/^3/.test(n))return"MTN";if(/^7[045]/.test(n)||/^73[01]/.test(n)||/^20/.test(n))return"Airtel";return"Other"}
function opHint(i){const p=i.parentNode.querySelector(".op");if(p)p.textContent=opOf(i.value)?"Network: "+opOf(i.value):""}
function show(v){document.querySelectorAll(".view").forEach(e=>e.classList.toggle("on",e.id==="v-"+v));document.querySelectorAll("#nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===v?"page":"false"));history.replaceState(null,"","#"+v);scrollTo(0,0)}
async function doSignup(e){e.preventDefault();const f=e.target;if(!f.reportValidity())return;try{await api("/api/auth/signup","POST",formObj(f));toast("Welcome!");boot()}catch(x){toast(x.message,true)}}
async function doLogin(e){e.preventDefault();try{await api("/api/auth/login","POST",formObj(e.target));boot()}catch(x){toast(x.message,true)}}
async function logout(){await api("/api/auth/logout","POST");location.hash="";boot()}
async function patchMe(b,msg){try{await api("/api/me","PATCH",b);if(msg)toast(msg);await refresh()}catch(x){toast(x.message,true);refresh()}}
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
