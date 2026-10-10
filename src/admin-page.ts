import { head } from "./styles";
import { BDAY_JS } from "./bday";
const TITLE_OPTS = `<option value="">None</option><option>Brother</option><option>Sister</option><option>Pastor</option><option>Deacon</option><option>Deaconess</option>`;
// Single-page admin UI. Served behind basic auth; the browser re-sends the
// credentials automatically on same-origin fetches to /api/admin/*.
const icon = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const NAV: [string, string, string][] = [
  ["celebrate", "Celebrate", icon('<path d="M4 20l4.5-12L16 15.5z"/><path d="M14 4.5c1.5.5 2 2 1.5 3M18 8c1 0 2 .8 2 2M19 3.5v.01M21 6v.01M11 3v.01"/>')],
  ["review", "Review", icon('<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M8 12.5l2.5 2.5L16 9.5"/>')],
  ["members", "Members", icon('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/>')],
  ["groups", "Cells", icon('<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5v4M12 11.5l-5.5 4.5M12 11.5l5.5 4.5"/>')],
  ["more", "More", icon('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>')],
];

export const adminPage = () => `${head("CE Admin")}<body>
<header class="top"><div class="in"><div class="brand">CE <span>Admin</span></div>
<select id="church" aria-label="Working church" style="width:auto;min-width:150px;max-width:55vw" onchange="loadChurch()"></select></div></header>
<nav class="bottom" aria-label="Sections">${NAV.map(([id, label, ic]) => `<button data-v="${id}" onclick="show('${id}')">${ic}<span>${label}</span></button>`).join("")}</nav>
<main class="wrap">
<section class="view" id="v-celebrate"><h1>Celebrations</h1><p class="sub" id="celSub">Birthdays and wedding anniversaries coming up.</p>
 <div class="chips" role="group" aria-label="Range"><button data-r="today" onclick="setRange('today')">Today</button><button data-r="week" onclick="setRange('week')">Next 7 days</button><button data-r="month" onclick="setRange('month')">This month</button></div>
 <div class="row" style="margin:10px 0 4px"><select id="celChurch" aria-label="Filter by church" onchange="loadCel()"></select></div>
 <div class="list" id="cel" style="margin-top:10px"></div></section>
<section class="view" id="v-review"><h1>Photo review</h1><p class="sub">Approve photos before they can be used on e-cards.</p>
 <div class="chips" role="group" aria-label="Status"><button data-s="pending" onclick="setPS('pending')">Waiting</button><button data-s="approved" onclick="setPS('approved')">Approved</button><button data-s="rejected" onclick="setPS('rejected')">Rejected</button></div>
 <div class="grid" id="queue" style="margin-top:14px"></div></section>
<section class="view" id="v-more"><h1>More</h1><div class="list">
 <button class="item btn" style="justify-content:space-between" onclick="show('roles')">Leaders &amp; roles <span>›</span></button>
 <button class="item btn" style="justify-content:space-between" onclick="show('churches')">Churches <span>›</span></button>
 <button class="item btn" style="justify-content:space-between" onclick="show('settings')">Settings <span>›</span></button></div></section>
<section class="view" id="v-members"><h1>Members</h1><p class="sub">Each member gets a private link to choose their cell.</p>
 <form class="card stack" onsubmit="addMember(event)"><div class="row"><select id="mTitle" aria-label="Title" style="flex:0 1 130px">${TITLE_OPTS}</select><input id="mFirst" placeholder="First name" required aria-label="First name"><input id="mLast" placeholder="Last name" aria-label="Last name"></div>
 <div id="mBday"></div>
 <div class="row"><input id="mPhone" placeholder="Phone (optional)" inputmode="tel" aria-label="Phone"><input id="mEmail" type="email" placeholder="Email (optional)" aria-label="Email"></div>
 <button class="btn primary block">Add member</button></form>
 <h2>All members <span class="m" id="mCount"></span></h2><input id="mSearch" placeholder="Search…" aria-label="Search members" oninput="renderMembers()" style="margin-bottom:10px"><div class="list" id="members"></div></section>

<section class="view" id="v-groups"><h1>PCFs & cells</h1><p class="sub">Members only ever see cell names. PCFs stay private to admins.</p>
 <form class="card row" onsubmit="addPcf(event)"><input id="pcfName" placeholder="New PCF name" required aria-label="PCF name"><button class="btn primary" style="flex:0 0 auto">Add PCF</button></form>
 <div id="pcfs"></div></section>

<section class="view" id="v-roles"><h1>Leaders</h1><p class="sub">Leadership roles are admin-only and never shown to members.</p>
 <form class="card stack" onsubmit="addRole(event)"><div><label class="f" for="rMember">Member</label><select id="rMember"></select></div>
 <div class="row"><div><label class="f" for="rRole">Role</label><select id="rRole" onchange="roleScope()"></select></div>
 <div><label class="f" for="rScope">Leads</label><select id="rScope"></select></div></div>
 <button class="btn primary block">Assign role</button></form>
 <h2>Assigned roles</h2><div class="list" id="roles"></div>
 <h2>Coordinator coverage</h2><div class="card stack"><select id="coord" onchange="loadCoord()" aria-label="Coordinator"></select><div id="coordBoxes" class="stack"></div>
 <button class="btn block" onclick="saveCoord()">Save coverage</button></div></section>

<section class="view" id="v-churches"><h1>Churches</h1><p class="sub">One main church, with smaller churches under it.</p>
 <form class="card row" onsubmit="addChurch(event)"><input id="chName" placeholder="Church name" required aria-label="Church name"><button class="btn primary" style="flex:0 0 auto" id="chBtn">Add</button></form>
 <h2>All churches</h2><div class="list" id="churches"></div></section>

<section class="view" id="v-settings"><h1>Settings</h1><p class="sub">Applies to all churches.</p>
 <div class="card"><label class="switch"><span><span class="t" style="font-weight:600">Cells</span><br><span class="m" style="color:var(--muted);font-size:.875rem">Let members pick their cell from a list</span></span>
 <input type="checkbox" id="cellsEnabled" role="switch"><span class="k"></span></label></div></section>
</main>
<dialog id="dlg"><div class="dh"><b id="dlgTitle"></b><button class="btn" onclick="$('dlg').close()" aria-label="Close">Close</button></div><div class="db" id="dlgBody"></div></dialog>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
${BDAY_JS}
const ROLES={COORDINATOR:"Coordinator",PCF_LEADER:"PCF leader",ASST_PCF_LEADER:"Assistant PCF leader",CELL_LEADER:"Cell leader",ASST_CELL_LEADER:"Assistant cell leader",BIBLE_STUDY_TEACHER:"Bible study teacher"};
let S={churches:[],pcfs:[],cells:[],members:[],roles:[]};
const $=id=>document.getElementById(id);
const h=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
let tt;function toast(m,err){const t=$("toast");t.textContent=m;t.className="toast show"+(err?" err":"");clearTimeout(tt);tt=setTimeout(()=>t.className="toast",2600)}
async function api(path,method="GET",body){const r=await fetch("/api/admin"+path,{method,headers:body?{"content-type":"application/json"}:{},body:body?JSON.stringify(body):undefined,credentials:"same-origin"});
 if(r.status===204)return null;const j=await r.json();if(!r.ok){toast(j.error||r.statusText,true);throw new Error(j.error)}return j}
const opt=(v,t,sel)=>'<option value="'+v+'"'+(sel?" selected":"")+">"+h(t)+"</option>";
const item=(o,title,meta,acts)=>'<div class="item'+(o&&o.active===0?" off":"")+'"><div><div class="t">'+title+'</div>'+(meta?'<div class="m">'+meta+"</div>":"")+'</div><div class="acts">'+acts+"</div></div>";
const tog=(kind,o)=>'<button class="btn" onclick="toggle(\\''+kind+'\\','+o.id+','+(o.active?0:1)+')">'+(o.active?"Deactivate":"Activate")+"</button>";
const ren=(kind,o)=>'<button class="btn" data-n="'+h(o.name)+'" onclick="rename(\\''+kind+'\\','+o.id+',this.dataset.n)">Rename</button>';
const empty=t=>'<div class="empty">'+t+"</div>";
function show(v){if(v==='celebrate')loadCel();if(v==='review')loadQueue();document.querySelectorAll(".view").forEach(e=>e.classList.toggle("on",e.id==="v-"+v));const nv=["roles","churches","settings"].includes(v)?"more":v;document.querySelectorAll("nav.bottom button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===nv?"page":"false"));location.hash=v;scrollTo(0,0)}
async function toggle(kind,id,active){await api("/"+kind+"/"+id,"PATCH",{active:!!active});toast(active?"Activated":"Deactivated");kind==="churches"?init():loadChurch()}
async function rename(kind,id,old){const n=prompt("New name",old);if(n&&n!==old){await api("/"+kind+"/"+id,"PATCH",{name:n});toast("Renamed");kind==="churches"?init():loadChurch()}}
async function init(){
 $("cellsEnabled").checked=(await api("/settings")).cells_enabled;
 S.churches=await api("/churches");const main=S.churches.find(c=>c.parent_id==null);
 $("chName").placeholder=main?"New church under "+main.name:"Main church name";$("chBtn").textContent=main?"Add":"Create main church";
 $("churches").innerHTML=S.churches.length?S.churches.map(c=>item(c,h(c.name),c.parent_id?"Under "+h(main?main.name:""):'<span class="pill">Main church</span>',ren("churches",c)+tog("churches",c))).join(""):empty("Start by creating your main church.");
 const cur=$("church").value;$("church").innerHTML=S.churches.map(c=>opt(c.id,c.name,String(c.id)===cur)).join("");
 $("rRole").innerHTML=Object.entries(ROLES).map(([k,v])=>opt(k,v)).join("");
 $("celChurch").innerHTML='<option value="">All churches</option>'+S.churches.map(c=>opt(c.id,c.name)).join("");
 if(S.churches.length)loadChurch();else show("churches");
}
$("cellsEnabled").onchange=async e=>{await api("/settings","PUT",{cells_enabled:e.target.checked});toast("Cells "+(e.target.checked?"on":"off"))};
async function addChurch(e){e.preventDefault();const main=S.churches.find(c=>c.parent_id==null);await api("/churches","POST",{name:$("chName").value,parent_id:main?main.id:null});$("chName").value="";toast("Church added");init()}
const cid=()=>Number($("church").value);
function renderMembers(){const q=$("mSearch").value.toLowerCase();const list=S.members.filter(m=>!q||(m.name+" "+(m.phone||"")+" "+(m.email||"")).toLowerCase().includes(q));
 $("mCount").textContent="("+S.members.length+")";
 const cellOpts=sel=>opt("","No cell")+S.cells.filter(x=>x.active||x.id===sel).map(x=>opt(x.id,x.name,x.id===sel)).join("");
 $("members").innerHTML=list.length?list.map(m=>'<div class="item'+(m.active?"":" off")+'" style="flex-direction:column;align-items:stretch"><div style="display:flex;justify-content:space-between;gap:10px"><div><div class="t">'+h(m.name)+'</div><div class="m">'+(h([m.phone,m.email].filter(Boolean).join(" · "))||"No contact")+(m.pcf_name?" · "+h(m.pcf_name):"")+'</div></div></div>'
  +'<select aria-label="Cell for '+h(m.name)+'" onchange="setCell('+m.id+',this.value)">'+cellOpts(m.cell_id)+'</select>'
  +'<div class="acts" style="justify-content:flex-start"><button class="btn primary" onclick="editMember('+m.id+')">Open</button><button class="btn" onclick="copyLink(\\''+m.access_code+'\\')">Copy link</button><button class="btn" onclick="resetCode('+m.id+')">New link</button>'+tog("members",m)+'<button class="btn danger" onclick="delMember('+m.id+')">Delete</button></div></div>').join(""):empty(S.members.length?"No matches.":"No members yet.");}
async function loadChurch(){
 const c=cid();[S.pcfs,S.cells,S.members,S.roles]=await Promise.all([api("/pcfs?church_id="+c),api("/cells?church_id="+c),api("/members?church_id="+c),api("/roles")]);
 $("pcfs").innerHTML=S.pcfs.length?S.pcfs.map(p=>{const cs=S.cells.filter(x=>x.pcf_id===p.id);return '<h2>'+h(p.name)+' <span class="pill">'+cs.length+' cells</span>'+(p.active?"":' <span class="pill">inactive</span>')+'</h2><div class="acts" style="display:flex;gap:6px;margin-bottom:10px">'+ren("pcfs",p)+tog("pcfs",p)+'</div><div class="list">'
  +cs.map(x=>item(x,h(x.name),x.active?"":"Inactive",ren("cells",x)+tog("cells",x))).join("")
  +(p.active?'<form class="row" onsubmit="addCell(event,'+p.id+')"><input name="n" placeholder="New cell in '+h(p.name)+'" required aria-label="Cell name"><button class="btn" style="flex:0 0 auto">Add cell</button></form>':"")+"</div>"}).join(""):empty("No PCFs yet. Add one, then create its cells.");
 renderMembers();
 const ids=new Set(S.members.map(m=>m.id));const mine=S.roles.filter(r=>ids.has(r.member_id));
 const scopeName=r=>r.pcf_id?(S.pcfs.find(p=>p.id===r.pcf_id)||{}).name:r.cell_id?(S.cells.find(x=>x.id===r.cell_id)||{}).name:"";
 $("roles").innerHTML=mine.length?mine.map(r=>item(null,h(r.member_name),ROLES[r.role]+(scopeName(r)?" · "+h(scopeName(r)):""),'<button class="btn danger" onclick="delRole('+r.id+')">Remove</button>')).join(""):empty("No leaders assigned yet.");
 $("rMember").innerHTML=S.members.filter(m=>m.active).map(m=>opt(m.id,m.name)).join("");
 const coords=[...new Map(mine.filter(r=>r.role==="COORDINATOR").map(r=>[r.member_id,r.member_name])).entries()];
 $("coord").innerHTML=opt("",coords.length?"Choose a coordinator":"No coordinators yet")+coords.map(([id,n])=>opt(id,n)).join("");$("coordBoxes").innerHTML="";
 roleScope();
}
function roleScope(){const r=$("rRole").value;
 $("rScope").innerHTML=r.includes("PCF")?S.pcfs.filter(p=>p.active).map(p=>opt("p"+p.id,p.name)).join(""):r.includes("CELL")?S.cells.filter(x=>x.active).map(x=>opt("c"+x.id,x.name)).join(""):opt("","Not applicable");$("rScope").disabled=!r.includes("PCF")&&!r.includes("CELL")}
async function addPcf(e){e.preventDefault();await api("/pcfs","POST",{church_id:cid(),name:$("pcfName").value});$("pcfName").value="";toast("PCF added");loadChurch()}
async function addCell(e,pcf){e.preventDefault();await api("/cells","POST",{pcf_id:pcf,name:e.target.n.value});toast("Cell added");loadChurch()}
async function addMember(e){e.preventDefault();await api("/members","POST",{church_id:cid(),title:$("mTitle").value,first_name:$("mFirst").value,last_name:$("mLast").value,birth_month:$("mBday").querySelector("[name=birth_month]").value,birth_day:$("mBday").querySelector("[name=birth_day]").value,birth_year:$("mBday").querySelector("[name=birth_year]").value,phone:$("mPhone").value,email:$("mEmail").value});["mFirst","mLast","mPhone","mEmail"].forEach(i=>$(i).value="");mountBday($("mBday"),{},false);toast("Member added");loadChurch()}
async function setCell(id,v){try{await api("/members/"+id,"PATCH",{cell_id:v?Number(v):null});toast("Cell updated")}catch{}loadChurch()}
async function copyLink(code){const u=location.origin+"/m/"+code;try{await navigator.clipboard.writeText(u);toast("Link copied")}catch{prompt("Member link",u)}}
async function resetCode(id){if(confirm("The old link will stop working. Continue?")){await api("/members/"+id+"/reset-code","POST");toast("New link created");loadChurch()}}
async function delMember(id){if(confirm("Permanently delete this member?")){await api("/members/"+id,"DELETE");toast("Deleted");loadChurch()}}
async function addRole(e){e.preventDefault();const s=$("rScope").value;const b={role:$("rRole").value};if(s[0]==="p")b.pcf_id=Number(s.slice(1));if(s[0]==="c")b.cell_id=Number(s.slice(1));
 await api("/members/"+$("rMember").value+"/roles","POST",b);toast("Role assigned");loadChurch()}
async function delRole(id){await api("/roles/"+id,"DELETE");toast("Role removed");loadChurch()}
async function loadCoord(){const id=$("coord").value;if(!id){$("coordBoxes").innerHTML="";return}
 const m=await api("/members/"+id);const have=new Set(m.coordinator_churches.map(x=>x.church_id));const smalls=S.churches.filter(c=>c.parent_id!=null);
 $("coordBoxes").innerHTML=smalls.length?smalls.map(c=>'<label class="switch"><span>'+h(c.name)+'</span><input type="checkbox" value="'+c.id+'"'+(have.has(c.id)?" checked":"")+'><span class="k"></span></label>').join(""):empty("Add small churches first.")}
async function saveCoord(){const id=$("coord").value;if(!id)return;await api("/members/"+id+"/coordinator-churches","PUT",{church_ids:[...$("coordBoxes").querySelectorAll("input:checked")].map(i=>Number(i.value))});toast("Coverage saved")}
const fmt=d=>d?new Date(d+"T00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}):"";
const fmtDM=d=>new Date(d+"T00:00").toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});
const titleSel=(name,sel)=>'<select name="'+name+'">'+["","Brother","Sister","Pastor","Deacon","Deaconess"].map(t=>'<option value="'+t+'"'+(t===(sel||"")?" selected":"")+">"+(t||"None")+"</option>").join("")+"</select>";
const fObj=f=>Object.fromEntries(new FormData(f).entries());
function openDlg(title,html){$("dlgTitle").textContent=title;$("dlgBody").innerHTML=html;if(!$("dlg").open)$("dlg").showModal()}

// ---- celebrations ----
let RANGE="week",CEL=[];
function setRange(r){RANGE=r;loadCel()}
async function loadCel(){document.querySelectorAll("[data-r]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.r===RANGE));
 const ch=$("celChurch").value;const d=await api("/celebrations?range="+RANGE+(ch?"&church_id="+ch:""));CEL=d.items;
 const label={today:"today",week:"in the next 7 days",month:"this month"}[RANGE];
 $("celSub").textContent=CEL.length+" celebration"+(CEL.length===1?"":"s")+" "+label;
 $("cel").innerHTML=CEL.length?CEL.map((c,i)=>{const when=c.days===0?"Today":c.days===1?"Tomorrow":c.days<0?fmtDM(c.date)+" · passed":fmtDM(c.date);
  const kind=c.type==="birthday"?"Birthday":"Wedding anniversary";const yrs=c.type==="anniversary"&&c.years>0?" · "+c.years+(c.years===1?" year":" years"):c.type==="birthday"&&c.years!=null&&c.years>0?" · turns "+c.years:"";
  const av=c.photo_ids.length?'<img alt="" src="/api/admin/photos/'+c.photo_ids[0]+'/image">':h((c.display_name.split(" ").pop()||"?")[0]);
  return '<div class="item"><div class="cel"><div class="av">'+av+'</div><div><div class="when">'+when+'</div><div class="t">'+h(c.display_name)+'</div><div class="m">'+kind+yrs+(c.context?" · "+h(c.context):"")+" · "+h(c.church_name)+(c.photo_ids.length?"":" · no approved photo")+'</div></div></div><div class="acts"><button class="btn primary" onclick="ecard('+i+')">Make e-card</button></div></div>'}).join(""):empty("Nothing to celebrate "+label+".");}

// ---- photo review ----
let PS="pending";
function setPS(s){PS=s;loadQueue()}
async function loadQueue(){document.querySelectorAll("[data-s]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.s===PS));
 const q=await api("/photos?status="+PS);
 $("queue").innerHTML=q.length?q.map(p=>'<figure class="ph" style="aspect-ratio:auto;background:#fff;border:1px solid var(--line)"><img loading="lazy" style="aspect-ratio:1" src="/api/admin/photos/'+p.id+'/image" alt=""><figcaption style="padding:8px"><div class="t" style="font-size:.85rem;font-weight:600">'+h(p.relative_first_name?p.relative_first_name+" ("+p.relation+" of "+p.member_name+")":p.member_name)+'</div><div class="row" style="margin-top:6px;gap:6px">'
  +(p.status!=="approved"?'<button class="btn primary" style="flex:1" onclick="review('+p.id+',\\'approved\\')">Approve</button>':"")+(p.status!=="rejected"?'<button class="btn danger" style="flex:1" onclick="review('+p.id+',\\'rejected\\')">Reject</button>':"")+"</div></figcaption></figure>").join(""):empty(PS==="pending"?"All caught up. No photos waiting.":"Nothing here.");}
async function review(id,status,thenMember){await api("/photos/"+id,"PATCH",{status});toast(status==="approved"?"Approved":"Rejected");thenMember?editMember(thenMember):loadQueue()}

// ---- member editor ----
async function editMember(id){const m=await api("/members/"+id);
 const rels=m.relatives.map(r=>'<div class="item"><div><div class="t">'+h((r.title?r.title+" ":"")+r.first_name+" "+(r.last_name||""))+'</div><div class="m">'+(r.relation==="spouse"?"Spouse":"Child")+(r.birth_month?" · birthday "+fmtBirth(r):"")+'</div></div><button class="btn danger" onclick="delRelA('+r.id+','+id+')">Remove</button></div>').join("");
 const who=r=>r?(m.relatives.find(x=>x.id===r)||{}).first_name||"Family":"Member";
 const photos=m.photos.map(p=>'<figure class="ph"><img loading="lazy" src="/api/admin/photos/'+p.id+'/image" alt=""><span class="badge '+p.status+'">'+h(who(p.relative_id))+" · "+p.status+'</span>'+(p.status!=="approved"?'<button class="sel" aria-label="Approve" onclick="review('+p.id+',\\'approved\\','+id+')">✓</button>':"")+"</figure>").join("");
 openDlg(m.name,'<form class="stack" onsubmit="saveMember(event,'+id+')">'
  +'<div class="row"><div style="flex:0 1 130px"><label class="f">Title</label>'+titleSel("title",m.title)+'</div><div><label class="f">First name</label><input name="first_name" required value="'+h(m.first_name||m.name)+'"></div></div>'
  +'<div><label class="f">Last name</label><input name="last_name" value="'+h(m.last_name)+'"></div>'
  +'<div class="row"><div><label class="f">Phone</label><input name="phone" inputmode="tel" value="'+h(m.phone?"+"+m.phone:"")+'"></div><div><label class="f">Email</label><input name="email" type="email" value="'+h(m.email)+'"></div></div>'
  +'<div id="eBday"></div>'
  +'<div class="row"><div><label class="f">Marital status</label><select name="marital_status" onchange="this.form.anniversary.disabled=this.value!==\\'married\\'"><option value="single"'+(m.marital_status!=="married"?" selected":"")+'>Single</option><option value="married"'+(m.marital_status==="married"?" selected":"")+'>Married</option></select></div>'
  +'<div><label class="f">Wedding anniversary</label><input name="anniversary" type="date" value="'+h(m.anniversary)+'"'+(m.marital_status==="married"?"":" disabled")+'></div></div>'
  +'<label class="switch"><span>Has kids</span><input type="checkbox" name="has_kids"'+(m.has_kids?" checked":"")+'><span class="k"></span></label>'
  +'<button class="btn primary block">Save details</button></form>'
  +'<h2>Family</h2><div class="list">'+(rels||empty("No family added."))+'</div>'
  +'<form class="card stack" style="margin-top:10px" onsubmit="addRelA(event,'+id+')"><div class="row"><select name="relation" aria-label="Relation" onchange="this.form.title.disabled=this.value===\\'child\\'"><option value="child">Child</option><option value="spouse">Spouse</option></select>'+titleSel("title","").replace("<select",'<select disabled aria-label="Title"')+'</div>'
  +'<div class="row"><input name="first_name" placeholder="First name" required aria-label="First name"><input name="last_name" placeholder="Last name" aria-label="Last name"></div><div id="rBday"></div><button class="btn block">Add family member</button></form>'
  +'<h2>Photos</h2>'+(photos?'<div class="grid">'+photos+"</div>":empty("No photos uploaded.")));
 mountBday($("eBday"),m,false);mountBday($("rBday"),{},false);}
async function saveMember(e,id){e.preventDefault();const b=fObj(e.target);b.has_kids=e.target.has_kids.checked;if(b.marital_status!=="married")b.anniversary="";
 try{await api("/members/"+id,"PATCH",b);toast("Saved");loadChurch();editMember(id)}catch{}}
async function addRelA(e,id){e.preventDefault();try{await api("/members/"+id+"/relatives","POST",fObj(e.target));toast("Added");editMember(id)}catch{}}
async function delRelA(rid,id){if(confirm("Remove this family member and their photos?")){await api("/relatives/"+rid,"DELETE");editMember(id)}}

// ---- e-card (1080x1080 PNG, square for WhatsApp) ----
const BLESS={birthday:["May the Lord bless you and keep you; may His face shine upon you.","Wishing you a year overflowing with God's grace and favour.","May your new year be filled with joy, peace and answered prayers.","Celebrating you today and thanking God for your life."],
 anniversary:["What God has joined together, may He continue to bless.","May your love grow deeper and your home be filled with His peace.","Celebrating your union and God's faithfulness in your marriage.","Two hearts, one faith, a lifetime of grace."]};
let EC=null;
function ecard(i){const c=CEL[i];EC={c,photo:c.photo_ids[0]||null,img:null,name:c.display_name,bless:BLESS[c.type][Math.floor(Math.random()*4)]};
 openDlg("E-card",'<canvas id="cv" width="1080" height="1080" style="width:100%;border-radius:14px;display:block;background:#eee"></canvas>'
  +(c.photo_ids.length?'<label class="f" style="margin-top:14px">Photo</label><div class="thumbs">'+c.photo_ids.map(p=>'<img role="button" tabindex="0" data-p="'+p+'" style="cursor:pointer;width:56px;height:56px'+(p===EC.photo?";outline:3px solid var(--accent)":"")+'" src="/api/admin/photos/'+p+'/image" onclick="pickPhoto('+p+')" alt="Use this photo">').join("")+'<img role="button" data-p="0" style="cursor:pointer;width:56px;height:56px;background:#eee" onclick="pickPhoto(0)" alt="No photo"></div>':'<p class="hint" style="margin-top:12px">No approved photo yet, so the card shows initials. Approve one in Review to add a photo.</p>')
  +'<div class="stack" style="margin-top:12px"><div><label class="f">Name on card</label><input id="ecName" value="'+h(EC.name)+'" oninput="EC.name=this.value;drawCard()"></div>'
  +'<div><label class="f">Blessing</label><input id="ecBless" value="'+h(EC.bless)+'" oninput="EC.bless=this.value;drawCard()"></div>'
  +'<div class="row"><button class="btn primary" onclick="downloadCard()">Download PNG</button><button class="btn" id="shareBtn" onclick="shareCard()">Share</button></div></div>');
 if(!navigator.canShare)$("shareBtn").hidden=true;
 pickPhoto(EC.photo||0);}
async function pickPhoto(p){EC.photo=p||null;EC.img=null;document.querySelectorAll("[data-p]").forEach(t=>t.style.outline=Number(t.dataset.p)===(p||0)?"3px solid var(--accent)":"none");
 if(p){const b=await (await fetch("/api/admin/photos/"+p+"/image",{credentials:"same-origin"})).blob();EC.img=await createImageBitmap(b)}
 await document.fonts.ready;drawCard()}
function wrap(x,text,cx,y,maxW,lh){const words=text.split(" ");let line="",lines=[];for(const w of words){const t=line?line+" "+w:w;if(x.measureText(t).width>maxW&&line){lines.push(line);line=w}else line=t}lines.push(line);lines.slice(0,3).forEach((l,i)=>x.fillText(l,cx,y+i*lh));}
function drawCard(){const cv=$("cv");if(!cv)return;const x=cv.getContext("2d"),W=1080,c=EC.c,bd=c.type==="birthday";
 const g=x.createLinearGradient(0,0,W,W);if(bd){g.addColorStop(0,"#1e1b4b");g.addColorStop(1,"#4338ca")}else{g.addColorStop(0,"#1f1a17");g.addColorStop(1,"#6b4f2a")}
 x.fillStyle=g;x.fillRect(0,0,W,W);
 x.globalAlpha=.08;x.fillStyle="#fff";[[120,140,180],[960,220,120],[900,940,220],[160,980,90]].forEach(([a,b,r])=>{x.beginPath();x.arc(a,b,r,0,7);x.fill()});x.globalAlpha=1;
 const gold=bd?"#c7d2fe":"#e9c98b";
 x.strokeStyle=gold;x.globalAlpha=.5;x.lineWidth=2;x.strokeRect(40,40,W-80,W-80);x.globalAlpha=1;
 const cx=W/2,cy=360,R=210;
 x.save();x.beginPath();x.arc(cx,cy,R,0,7);x.closePath();x.clip();
 if(EC.img){const im=EC.img,s=Math.max(2*R/im.width,2*R/im.height);x.drawImage(im,cx-im.width*s/2,cy-im.height*s/2,im.width*s,im.height*s)}
 else{x.fillStyle="rgba(255,255,255,.12)";x.fillRect(cx-R,cy-R,2*R,2*R);x.fillStyle="#fff";x.font="600 150px Inter, system-ui, sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText(EC.name.split(/[ &]+/).filter(Boolean).slice(-1)[0]?.[0]||"",cx,cy+6)}
 x.restore();x.beginPath();x.arc(cx,cy,R+8,0,7);x.strokeStyle=gold;x.lineWidth=6;x.stroke();
 x.textAlign="center";x.textBaseline="alphabetic";x.fillStyle=gold;x.font="italic 400 86px Georgia, 'Times New Roman', serif";
 x.fillText(bd?"Happy Birthday":"Happy Wedding",cx,700);if(!bd){x.fillText("Anniversary",cx,786)}
 const ny=bd?790:868;x.fillStyle="#fff";let fs=64;x.font="600 "+fs+"px Inter, system-ui, sans-serif";while(x.measureText(EC.name).width>900&&fs>36){fs-=2;x.font="600 "+fs+"px Inter, system-ui, sans-serif"}x.fillText(EC.name,cx,ny);
 x.fillStyle="rgba(255,255,255,.82)";x.font="400 32px Inter, system-ui, sans-serif";wrap(x,EC.bless,cx,ny+62,820,42);
 x.fillStyle=gold;x.font="600 24px Inter, system-ui, sans-serif";x.letterSpacing="6px";x.fillText((c.church_name||"CE Entebbe").toUpperCase(),cx,1010);x.letterSpacing="0px";}
function cardFile(){return new Promise(r=>$("cv").toBlob(b=>r(new File([b],(EC.c.type==="birthday"?"birthday-":"anniversary-")+EC.name.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".png",{type:"image/png"})),"image/png"))}
async function downloadCard(){const f=await cardFile();const a=document.createElement("a");a.href=URL.createObjectURL(f);a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast("Downloaded")}
async function shareCard(){const f=await cardFile();if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:EC.name})}catch{}}else downloadCard()}

mountBday($("mBday"),{},false);show((location.hash.slice(1))||"celebrate");init();
</script></body></html>`;
