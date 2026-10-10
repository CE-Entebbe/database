// Shared design system: warm neutral palette, plum→coral gradient accent, mobile-first, dark-mode aware.
export const CSS = `
:root{color-scheme:light dark;
--bg:#faf8f5;--bg2:#f3efe9;--card:#ffffff;--text:#1c1917;--muted:#6b635b;--line:#ebe5dd;--line2:#ddd5ca;
--accent:#8b3a62;--accent2:#e0795a;--accent-ink:#ffffff;--accent-soft:#f6e9ef;--accent-text:#7a2f54;
--grad:linear-gradient(135deg,#7a2f54 0%,#b4476a 55%,#e0795a 100%);
--ok:#067647;--danger:#b42318;--radius:16px;--shadow:0 1px 2px rgba(28,25,23,.04),0 4px 16px rgba(28,25,23,.05);
--font:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--serif:"Iowan Old Style","Palatino Linotype",Georgia,serif;
--top:env(safe-area-inset-top,0px);--bottom:env(safe-area-inset-bottom,0px)}
@media(prefers-color-scheme:dark){:root{--bg:#121011;--bg2:#1b1819;--card:#1e1a1c;--text:#f4efea;--muted:#a89f97;--line:#2e292b;--line2:#3a3437;
--accent:#d77a9d;--accent2:#f09a7c;--accent-ink:#1a0f14;--accent-soft:#3a2430;--accent-text:#f0b3c9;--shadow:0 1px 2px rgba(0,0,0,.3);--ok:#4ade80;--danger:#f87171}}
[hidden]{display:none!important}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 var(--font);-webkit-font-smoothing:antialiased;min-height:100dvh;overscroll-behavior-y:none}
.wrap{max-width:720px;margin:0 auto;padding:20px 16px calc(112px + var(--bottom))}
header.top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:saturate(1.6) blur(16px);-webkit-backdrop-filter:saturate(1.6) blur(16px);border-bottom:1px solid var(--line);padding-top:var(--top)}
header.top .in{max-width:720px;margin:0 auto;padding:10px 16px;min-height:56px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;font-weight:650;letter-spacing:-.01em}.brand div span{color:var(--accent-text)}
.mark{width:32px;height:32px;border-radius:10px;background:var(--grad);display:grid;place-items:center;color:#fff;font:700 13px/1 var(--font);letter-spacing:.02em;box-shadow:0 2px 8px rgba(139,58,98,.35)}
h1{font-size:1.7rem;letter-spacing:-.025em;margin:6px 0 4px;font-weight:700;line-height:1.2}
h2{font-size:1.02rem;margin:28px 0 10px;font-weight:650;letter-spacing:-.01em}
.sub{color:var(--muted);margin:0 0 20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow)}
.list{display:flex;flex-direction:column;gap:10px}
.item{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;min-height:64px;box-shadow:var(--shadow);transition:transform .12s,border-color .15s,opacity .15s}
.item.off{opacity:.55}.item .t{font-weight:600}.item .m{color:var(--muted);font-size:.86rem}
.item .acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.stack{display:flex;flex-direction:column;gap:12px}
label.f,legend.f{display:block;font-size:.84rem;color:var(--muted);margin-bottom:6px;font-weight:550}
input,select{width:100%;min-height:52px;padding:12px 16px;border:1.5px solid var(--line2);border-radius:14px;background:var(--card);font:inherit;color:inherit;transition:border-color .15s,box-shadow .15s,background .15s;appearance:none;-webkit-appearance:none}
input::placeholder{color:color-mix(in srgb,var(--muted) 70%,transparent)}
input[type=date]{min-height:52px}
select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23948a80' stroke-width='1.6' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;padding-right:40px}
input:focus,select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)}
input:disabled,select:disabled{opacity:.55}
/* floating labels */
.fl{position:relative}.fl input,.fl select{padding:22px 16px 6px;min-height:58px}
.fl label{position:absolute;left:17px;top:18px;color:var(--muted);font-size:1rem;pointer-events:none;transform-origin:left top;transition:transform .16s ease,color .16s;white-space:nowrap}
.fl input:focus+label,.fl input:not(:placeholder-shown)+label,.fl select+label{transform:translateY(-10px) scale(.76);color:var(--accent-text)}
.fl input:not(:focus):not(:placeholder-shown)+label,.fl select:not(:focus)+label{color:var(--muted)}
.fl input::placeholder{color:transparent}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 16px;border-radius:12px;border:1.5px solid var(--line2);background:var(--card);color:var(--text);font:inherit;font-weight:600;font-size:.92rem;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .15s,transform .08s,box-shadow .15s,opacity .15s;user-select:none}
.btn:hover{background:var(--bg2)}.btn:active{transform:scale(.96)}
.btn.primary{background:var(--grad);border-color:transparent;color:#fff;box-shadow:0 4px 14px rgba(139,58,98,.28)}.btn.primary:hover{filter:brightness(1.05)}
.btn.primary:disabled{opacity:.5;box-shadow:none}
.btn.ghost{border-color:transparent;background:none}
.btn.danger{color:var(--danger)}.btn.block{width:100%;min-height:54px;font-size:1rem;border-radius:14px}
.btn:focus-visible,a:focus-visible,button:focus-visible{outline:3px solid var(--accent-soft);outline-offset:2px}
.row{display:flex;gap:10px;flex-wrap:wrap}.row>*{flex:1 1 180px}
.pill{display:inline-block;font-size:.72rem;font-weight:650;padding:2px 9px;border-radius:999px;background:var(--accent-soft);color:var(--accent-text);vertical-align:middle}
.toast{position:fixed;left:50%;bottom:calc(96px + var(--bottom));transform:translateX(-50%) translateY(16px) scale(.98);opacity:0;background:var(--text);color:var(--bg);padding:12px 18px;border-radius:14px;font-size:.92rem;font-weight:550;transition:all .25s cubic-bezier(.2,.8,.2,1);pointer-events:none;z-index:30;max-width:90vw;box-shadow:0 10px 30px rgba(0,0,0,.18)}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}.toast.err{background:var(--danger);color:#fff}
.switch{display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;min-height:48px}
.switch input{position:absolute;opacity:0;width:1px;height:1px}
.switch .k{flex:none;width:52px;height:32px;border-radius:999px;background:var(--line2);position:relative;transition:background .2s}
.switch .k:after{content:"";position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .22s cubic-bezier(.2,.8,.2,1)}
.switch input:checked+.k{background:var(--accent)}.switch input:checked+.k:after{transform:translateX(20px)}
.switch input:focus-visible+.k{box-shadow:0 0 0 4px var(--accent-soft)}
nav.bottom{position:fixed;bottom:0;left:0;right:0;z-index:10;background:color-mix(in srgb,var(--card) 88%,transparent);backdrop-filter:saturate(1.6) blur(18px);-webkit-backdrop-filter:saturate(1.6) blur(18px);border-top:1px solid var(--line);display:flex;justify-content:space-around;padding:6px 6px calc(6px + var(--bottom))}
nav.bottom button{flex:1;min-height:54px;border:0;background:none;font:inherit;font-size:.7rem;font-weight:600;color:var(--muted);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:14px;cursor:pointer;position:relative;transition:color .15s,transform .08s}
nav.bottom button:active{transform:scale(.92)}
nav.bottom button svg{width:24px;height:24px;transition:transform .2s}
nav.bottom button[aria-current=page]{color:var(--accent-text)}
nav.bottom button[aria-current=page] svg{transform:translateY(-1px)}
nav.bottom button[aria-current=page]:before{content:"";position:absolute;top:4px;width:44px;height:30px;border-radius:999px;background:var(--accent-soft);z-index:-1}
.empty{color:var(--muted);text-align:center;padding:28px 20px;border:1.5px dashed var(--line2);border-radius:var(--radius);font-size:.92rem;display:flex;flex-direction:column;align-items:center;gap:10px}
.empty svg{width:88px;height:88px;opacity:.95}
.view{display:none}.view.on{display:block;animation:enter .32s cubic-bezier(.2,.8,.2,1)}
@keyframes enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.seg{display:flex;background:var(--bg2);border-radius:14px;padding:4px;margin-bottom:16px}
.seg button{flex:1;min-height:44px;border:0;background:none;border-radius:11px;font:inherit;font-weight:600;color:var(--muted);cursor:pointer;transition:all .2s}
.seg button[aria-selected=true]{background:var(--card);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,.08)}
.hint{color:var(--muted);font-size:.84rem;margin:0}.opt{font-weight:400;opacity:.75}.op{margin-top:6px;min-height:0}
.drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:130px;border:1.5px dashed var(--line2);border-radius:var(--radius);color:var(--accent-text);font-weight:600;cursor:pointer;position:relative;transition:background .15s}
.drop:hover{background:var(--accent-soft)}.drop input{position:absolute;inset:0;opacity:0;cursor:pointer}
.thumbs{display:flex;gap:8px;flex-wrap:wrap}.thumbs img{width:64px;height:64px;object-fit:cover;border-radius:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.ph{position:relative;margin:0;aspect-ratio:1;border-radius:var(--radius);overflow:hidden;background:var(--bg2)}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.ph .badge{position:absolute;left:8px;bottom:8px;font-size:.72rem;font-weight:650;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.92);color:#5b534c}
.ph .badge.approved{color:#067647}.ph .badge.rejected{color:#b42318}
.ph .x,.ph .sel{position:absolute;top:6px;right:6px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:1.2rem;cursor:pointer}
details>summary{list-style:none}details>summary::-webkit-details-marker{display:none}
dialog{border:0;border-radius:24px;padding:0;width:min(560px,94vw);max-height:92dvh;background:var(--card);color:var(--text);box-shadow:0 24px 70px rgba(0,0,0,.3)}
dialog[open]{animation:pop .28s cubic-bezier(.2,.8,.2,1)}@keyframes pop{from{opacity:0;transform:translateY(16px) scale(.98)}}
dialog::backdrop{background:rgba(20,14,17,.5);backdrop-filter:blur(3px)}
dialog .dh{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--card);z-index:1}
dialog .db{padding:16px;overflow:auto}
@media(max-width:600px){dialog{width:100vw;max-width:100vw;margin:auto 0 0;border-radius:24px 24px 0 0;max-height:94dvh;padding-bottom:var(--bottom)}dialog[open]{animation:sheet .32s cubic-bezier(.2,.8,.2,1)}@keyframes sheet{from{transform:translateY(40%);opacity:.4}}}
.chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.chips::-webkit-scrollbar{display:none}
.chips button{flex:none;min-height:40px;padding:0 16px;border-radius:999px;border:1.5px solid var(--line2);background:var(--card);color:var(--text);font:inherit;font-size:.88rem;font-weight:600;cursor:pointer;transition:all .15s}
.chips button:active{transform:scale(.95)}.chips button[aria-pressed=true]{background:var(--text);color:var(--bg);border-color:var(--text)}
.cel{display:flex;gap:12px;align-items:center;min-width:0}.cel .av{flex:none;width:54px;height:54px;border-radius:50%;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;overflow:hidden;box-shadow:0 0 0 3px var(--card),0 0 0 4.5px var(--accent-soft)}
.cel .av img{width:100%;height:100%;object-fit:cover}.when{font-size:.72rem;font-weight:700;color:var(--accent-text);text-transform:uppercase;letter-spacing:.06em}
fieldset.bday{border:0;padding:0;margin:0;min-width:0}fieldset.bday legend{padding:0}
/* reveal (alternative phone) */
.reveal{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .35s cubic-bezier(.2,.8,.2,1),opacity .3s,margin .3s;margin-top:-12px}
.reveal>div{overflow:hidden;min-height:0}.reveal.open{grid-template-rows:1fr;opacity:1;margin-top:0}
.row .reveal{margin-top:0}
/* skeletons */
.sk{background:linear-gradient(90deg,var(--bg2) 25%,color-mix(in srgb,var(--bg2) 60%,var(--card)) 50%,var(--bg2) 75%);background-size:200% 100%;animation:sk 1.2s infinite linear;border-radius:12px}
@keyframes sk{to{background-position:-200% 0}}
.sk-item{height:72px;border-radius:var(--radius)}
/* hero + wizard */
.hero{position:relative;margin:-20px -16px 18px;padding:calc(36px + var(--top)) 24px 54px;background:var(--grad);color:#fff;overflow:hidden;border-radius:0 0 32px 32px}
.hero:before,.hero:after{content:"";position:absolute;border-radius:50%;background:rgba(255,255,255,.1)}
.hero:before{width:260px;height:260px;right:-80px;top:-90px}.hero:after{width:160px;height:160px;left:-50px;bottom:-70px}
.hero .mark{width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,.18);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3);font-size:18px;margin-bottom:18px}
.hero h1{color:#fff;font:600 2rem/1.15 var(--serif);letter-spacing:-.01em;margin:0 0 8px}
.hero p{margin:0;opacity:.9;max-width:30ch}
.auth-card{position:relative;margin-top:-40px;z-index:1}
.progress{display:flex;gap:6px;margin:4px 0 14px}.progress i{flex:1;height:5px;border-radius:999px;background:var(--line);overflow:hidden;position:relative}
.progress i:after{content:"";position:absolute;inset:0;background:var(--grad);transform:scaleX(0);transform-origin:left;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.progress i.done:after{transform:scaleX(1)}
.step{display:none}.step.on{display:flex;animation:slide .35s cubic-bezier(.2,.8,.2,1)}
.step.on.back{animation-name:slideBack}
@keyframes slide{from{opacity:0;transform:translateX(24px)}}@keyframes slideBack{from{opacity:0;transform:translateX(-24px)}}
.steplabel{font-size:.78rem;font-weight:700;color:var(--accent-text);text-transform:uppercase;letter-spacing:.07em}
.wiz-nav{display:flex;gap:10px}.wiz-nav .btn{flex:1}.wiz-nav .btn.ghost{flex:0 0 auto}
@media(min-width:900px){nav.bottom{top:var(--top);bottom:auto;left:50%;right:auto;transform:translateX(-50%);width:auto;background:none;border:0;backdrop-filter:none;-webkit-backdrop-filter:none;gap:4px;padding:10px}
nav.bottom button{flex-direction:row;font-size:.88rem;padding:0 14px;min-height:40px}nav.bottom button svg{width:18px;height:18px}
nav.bottom button[aria-current=page]{background:var(--accent-soft)}nav.bottom button[aria-current=page]:before{display:none}.wrap{padding-bottom:48px}.toast{bottom:28px}
.hero{border-radius:28px;margin:8px 0 18px}}
.gbtn{background:var(--card);border-color:var(--line2);color:var(--text);gap:10px}
.or{display:flex;align-items:center;gap:12px;color:var(--muted);font-size:.8rem;margin:14px 0}.or:before,.or:after{content:"";flex:1;height:1px;background:var(--line)}
.banner{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--radius);background:var(--accent-soft);color:var(--accent-text);margin-bottom:14px}
.banner .hint{color:var(--accent-text);opacity:.85}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

const ILLU: Record<string, string> = {
  cake: '<svg viewBox="0 0 96 96" fill="none"><circle cx="48" cy="48" r="44" fill="var(--accent-soft)"/><rect x="24" y="48" width="48" height="24" rx="6" fill="var(--card)" stroke="var(--accent)" stroke-width="2.5"/><path d="M24 58c6 4 10 4 16 0s10-4 16 0 10 4 16 0" stroke="var(--accent2)" stroke-width="2.5"/><rect x="45" y="34" width="6" height="14" rx="2" fill="var(--accent)"/><path d="M48 24c3 3 3 6 0 8-3-2-3-5 0-8z" fill="var(--accent2)"/></svg>',
  photos: '<svg viewBox="0 0 96 96" fill="none"><circle cx="48" cy="48" r="44" fill="var(--accent-soft)"/><rect x="22" y="28" width="46" height="38" rx="8" fill="var(--card)" stroke="var(--accent)" stroke-width="2.5" transform="rotate(-6 45 47)"/><rect x="30" y="32" width="46" height="38" rx="8" fill="var(--card)" stroke="var(--accent)" stroke-width="2.5"/><circle cx="44" cy="45" r="5" fill="var(--accent2)"/><path d="M32 66l14-12 10 8 8-6 12 10" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  people: '<svg viewBox="0 0 96 96" fill="none"><circle cx="48" cy="48" r="44" fill="var(--accent-soft)"/><circle cx="38" cy="40" r="9" fill="var(--card)" stroke="var(--accent)" stroke-width="2.5"/><circle cx="60" cy="42" r="7" fill="var(--card)" stroke="var(--accent2)" stroke-width="2.5"/><path d="M22 70c2-10 9-15 16-15s14 5 16 15M52 70c1-7 5-11 9-11s8 4 9 11" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 96 96" fill="none"><circle cx="48" cy="48" r="44" fill="var(--accent-soft)"/><circle cx="48" cy="48" r="22" fill="var(--card)" stroke="var(--accent)" stroke-width="2.5"/><path d="M38 48l7 7 13-14" stroke="var(--accent2)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
/** Client-side helpers shared by both apps (no backticks/backslashes inside). */
export const UI_JS = `
const ILLU=${JSON.stringify(ILLU)};
const emptyState=(t,k)=>'<div class="empty">'+(ILLU[k||"cake"]||"")+'<div>'+t+'</div></div>';
const skeleton=n=>Array.from({length:n||3},()=>'<div class="sk sk-item"></div>').join("");
function buzz(){try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}}
document.addEventListener("click",e=>{if(e.target.closest(".btn.primary,nav.bottom button"))buzz()},{passive:true});
function phoneDigits(v){let d=String(v||"").replace(/[^0-9+]/g,"");if(d[0]==="+")d=d.slice(1);else if(d.slice(0,2)==="00")d=d.slice(2);else if(d[0]==="0")d="256"+d.slice(1);else if(d.length===9)d="256"+d;return d}
const phoneLooksValid=v=>{const d=phoneDigits(v);return d.slice(0,3)==="256"?d.length===12:d.length>=10&&d.length<=15};
function syncAlt(scope){(scope||document).querySelectorAll("[data-alt-for]").forEach(w=>{const f=w.closest("form")||document;const p=f.querySelector("[name=phone]");const a=w.querySelector("input");w.classList.toggle("open",!!(a&&a.value)||!!(p&&phoneLooksValid(p.value)))})}
document.addEventListener("input",e=>{if(e.target.name==="phone")syncAlt(e.target.closest("form")||document)});
if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
`;
/** Markup for an alternative-phone field that slides in once the primary number looks complete. */
export const altPhoneField = (id: string, extra = "") =>
  `<div class="reveal" data-alt-for="phone"><div><label class="f" for="${id}">Alternative phone <span class="opt">optional</span></label><input id="${id}" name="phone_alt" inputmode="tel" placeholder="07XX XXX XXX" oninput="opHint&&opHint(this)" ${extra}><p class="hint op"></p></div></div>`;

export const head = (title: string, manifest = "/manifest.webmanifest") => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#faf8f5" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#121011" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="CE Entebbe">
<link rel="manifest" href="${manifest}"${manifest.startsWith("/admin") ? ' crossorigin="use-credentials"' : ""}><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon-180.png">
<title>${title}</title><link rel="preconnect" href="https://rsms.me"><link rel="stylesheet" href="https://rsms.me/inter/inter.css"><style>${CSS}</style></head>`;
export const MARK = `<span class="mark" aria-hidden="true">CE</span>`;
