import { head } from "./styles";
// Single-page admin UI. Served behind basic auth; the browser re-sends the
// credentials automatically on same-origin fetches to /api/admin/*.
const icon = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const NAV: [string, string, string][] = [
  ["members", "Members", icon('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/>')],
  ["groups", "Cells", icon('<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5v4M12 11.5l-5.5 4.5M12 11.5l5.5 4.5"/>')],
  ["roles", "Leaders", icon('<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>')],
  ["churches", "Churches", icon('<path d="M12 2v4M10 4h4M5 21V11l7-5 7 5v10M9 21v-5h6v5"/>')],
  ["settings", "Settings", icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>')],
];

export const adminPage = () => `${head("CE Admin")}<body>
<header class="top"><div class="in"><div class="brand">CE <span>Admin</span></div>
<select id="church" aria-label="Working church" style="width:auto;min-width:150px;max-width:55vw" onchange="loadChurch()"></select></div></header>
<nav class="bottom" aria-label="Sections">${NAV.map(([id, label, ic]) => `<button data-v="${id}" onclick="show('${id}')">${ic}<span>${label}</span></button>`).join("")}</nav>
<main class="wrap">
<section class="view" id="v-members"><h1>Members</h1><p class="sub">Each member gets a private link to choose their cell.</p>
 <form class="card stack" onsubmit="addMember(event)"><input id="mName" placeholder="Full name" required aria-label="Full name">
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
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
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
function show(v){document.querySelectorAll(".view").forEach(e=>e.classList.toggle("on",e.id==="v-"+v));document.querySelectorAll("nav.bottom button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===v?"page":"false"));location.hash=v;scrollTo(0,0)}
async function toggle(kind,id,active){await api("/"+kind+"/"+id,"PATCH",{active:!!active});toast(active?"Activated":"Deactivated");kind==="churches"?init():loadChurch()}
async function rename(kind,id,old){const n=prompt("New name",old);if(n&&n!==old){await api("/"+kind+"/"+id,"PATCH",{name:n});toast("Renamed");kind==="churches"?init():loadChurch()}}
async function init(){
 $("cellsEnabled").checked=(await api("/settings")).cells_enabled;
 S.churches=await api("/churches");const main=S.churches.find(c=>c.parent_id==null);
 $("chName").placeholder=main?"New church under "+main.name:"Main church name";$("chBtn").textContent=main?"Add":"Create main church";
 $("churches").innerHTML=S.churches.length?S.churches.map(c=>item(c,h(c.name),c.parent_id?"Under "+h(main?main.name:""):'<span class="pill">Main church</span>',ren("churches",c)+tog("churches",c))).join(""):empty("Start by creating your main church.");
 const cur=$("church").value;$("church").innerHTML=S.churches.map(c=>opt(c.id,c.name,String(c.id)===cur)).join("");
 $("rRole").innerHTML=Object.entries(ROLES).map(([k,v])=>opt(k,v)).join("");
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
  +'<div class="acts" style="justify-content:flex-start"><button class="btn" onclick="copyLink(\\''+m.access_code+'\\')">Copy link</button><button class="btn" onclick="resetCode('+m.id+')">New link</button>'+tog("members",m)+'<button class="btn danger" onclick="delMember('+m.id+')">Delete</button></div></div>').join(""):empty(S.members.length?"No matches.":"No members yet.");}
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
async function addMember(e){e.preventDefault();await api("/members","POST",{church_id:cid(),name:$("mName").value,phone:$("mPhone").value,email:$("mEmail").value});["mName","mPhone","mEmail"].forEach(i=>$(i).value="");toast("Member added");loadChurch()}
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
show((location.hash.slice(1))||"members");init();
</script></body></html>`;
