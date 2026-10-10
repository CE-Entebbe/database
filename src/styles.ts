// Shared design system: neutral palette, one indigo accent, mobile-first.
export const CSS = `
:root{--bg:#f7f7f8;--card:#fff;--text:#18181b;--muted:#63636b;--line:#e6e6ea;--accent:#4338ca;--accent-soft:#eef0ff;--danger:#b42318;--radius:14px;
--font:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
[hidden]{display:none!important}*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 var(--font);-webkit-font-smoothing:antialiased}
.wrap{max-width:720px;margin:0 auto;padding:20px 16px 112px}
header.top{position:sticky;top:0;z-index:5;background:rgba(247,247,248,.88);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
header.top .in{max-width:720px;margin:0 auto;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{font-weight:650;letter-spacing:-.01em}.brand span{color:var(--accent)}
h1{font-size:1.6rem;letter-spacing:-.02em;margin:8px 0 4px;font-weight:650}
h2{font-size:1.05rem;margin:28px 0 10px;font-weight:600}
.sub{color:var(--muted);margin:0 0 20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px;box-shadow:0 1px 2px rgba(16,16,24,.04)}
.list{display:flex;flex-direction:column;gap:10px}
.item{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;min-height:60px;transition:border-color .15s,opacity .15s}
.item:hover{border-color:#d4d4dc}.item.off{opacity:.55}
.item .t{font-weight:550}.item .m{color:var(--muted);font-size:.875rem}
.item .acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.stack{display:flex;flex-direction:column;gap:10px}
label.f{display:block;font-size:.875rem;color:var(--muted);margin-bottom:6px;font-weight:500}
input,select{width:100%;min-height:48px;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:#fff;font:inherit;color:inherit;transition:border-color .15s,box-shadow .15s;appearance:none}
select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2363636b' stroke-width='1.6' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:38px}
input:focus,select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border-radius:12px;border:1px solid var(--line);background:#fff;color:var(--text);font:inherit;font-weight:550;font-size:.9rem;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .15s,transform .05s}
.btn:hover{background:#f2f2f4}.btn:active{transform:scale(.98)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}.btn.primary:hover{background:#3730a3}
.btn.danger{color:var(--danger)}.btn.block{width:100%;min-height:52px;font-size:1rem}
.btn:focus-visible,a:focus-visible{outline:3px solid var(--accent-soft);outline-offset:2px}
.row{display:flex;gap:10px;flex-wrap:wrap}.row>*{flex:1 1 180px}
.pill{display:inline-block;font-size:.75rem;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--accent-soft);color:var(--accent)}
.toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%) translateY(20px);opacity:0;background:var(--text);color:#fff;padding:10px 16px;border-radius:12px;font-size:.9rem;transition:all .2s;pointer-events:none;z-index:20;max-width:90vw}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}.toast.err{background:var(--danger)}
.switch{display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;min-height:44px}
.switch input{position:absolute;opacity:0;width:1px;height:1px}
.switch .k{flex:none;width:52px;height:32px;border-radius:999px;background:#d4d4dc;position:relative;transition:background .2s}
.switch .k:after{content:"";position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s}
.switch input:checked+.k{background:var(--accent)}.switch input:checked+.k:after{transform:translateX(20px)}
.switch input:focus-visible+.k{box-shadow:0 0 0 3px var(--accent-soft)}
nav.bottom{position:fixed;bottom:0;left:0;right:0;z-index:10;background:rgba(255,255,255,.94);backdrop-filter:blur(12px);border-top:1px solid var(--line);display:flex;justify-content:space-around;padding:6px 4px calc(6px + env(safe-area-inset-bottom))}
nav.bottom button{flex:1;min-height:52px;border:0;background:none;font:inherit;font-size:.72rem;font-weight:550;color:var(--muted);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:10px;cursor:pointer}
nav.bottom button svg{width:22px;height:22px}nav.bottom button[aria-current=page]{color:var(--accent)}
.empty{color:var(--muted);text-align:center;padding:24px;border:1px dashed var(--line);border-radius:var(--radius);font-size:.9rem}
.view{display:none;animation:fade .2s}.view.on{display:block}
@keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media(min-width:900px){nav.bottom{top:0;bottom:auto;left:50%;right:auto;transform:translateX(-50%);width:auto;background:none;border:0;backdrop-filter:none;gap:4px;padding:8px}
nav.bottom button{flex-direction:row;font-size:.875rem;padding:0 12px;min-height:40px}nav.bottom button svg{width:18px;height:18px}
nav.bottom button[aria-current=page]{background:var(--accent-soft)}.wrap{padding-bottom:40px}.toast{bottom:24px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;
export const head = (title: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f7f7f8">
<title>${title}</title><link rel="preconnect" href="https://rsms.me"><link rel="stylesheet" href="https://rsms.me/inter/inter.css"><style>${CSS}${CSS_EXTRA}</style></head>`;
export const CSS_EXTRA = `
.seg{display:flex;background:#ececf0;border-radius:12px;padding:4px;margin-bottom:14px}
.seg button{flex:1;min-height:44px;border:0;background:none;border-radius:9px;font:inherit;font-weight:550;color:var(--muted);cursor:pointer;transition:all .15s}
.seg button[aria-selected=true]{background:#fff;color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.hint{color:var(--muted);font-size:.85rem;margin:0}.opt{font-weight:400;color:#9a9aa2}
.drop{display:flex;align-items:center;justify-content:center;min-height:120px;border:1.5px dashed #c9c9d2;border-radius:var(--radius);color:var(--accent);font-weight:550;cursor:pointer;position:relative;transition:background .15s}
.drop:hover{background:var(--accent-soft)}.drop input{position:absolute;inset:0;opacity:0;cursor:pointer}
.thumbs{display:flex;gap:8px;flex-wrap:wrap}.thumbs img{width:64px;height:64px;object-fit:cover;border-radius:10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.ph{position:relative;margin:0;aspect-ratio:1;border-radius:var(--radius);overflow:hidden;background:#ececf0}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.ph .badge{position:absolute;left:8px;bottom:8px;font-size:.72rem;font-weight:600;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.92);color:var(--muted)}
.ph .badge.approved{color:#067647}.ph .badge.rejected{color:var(--danger)}
.ph .x,.ph .sel{position:absolute;top:6px;right:6px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:1.2rem;cursor:pointer}
.ph.picked{outline:3px solid var(--accent);outline-offset:-3px}
details>summary{list-style:none}details>summary::-webkit-details-marker{display:none}
dialog{border:0;border-radius:20px;padding:0;width:min(560px,94vw);max-height:92vh;box-shadow:0 20px 60px rgba(0,0,0,.25)}
dialog::backdrop{background:rgba(16,16,24,.45);backdrop-filter:blur(2px)}
dialog .dh{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line);position:sticky;top:0;background:#fff;z-index:1}
dialog .db{padding:16px;overflow:auto}
.chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}.chips button{flex:none;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:#fff;font:inherit;font-size:.875rem;font-weight:550;cursor:pointer}
.chips button[aria-pressed=true]{background:var(--text);color:#fff;border-color:var(--text)}
.cel{display:flex;gap:12px;align-items:center}.cel .av{flex:none;width:52px;height:52px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:650;overflow:hidden}
.cel .av img{width:100%;height:100%;object-fit:cover}.when{font-size:.75rem;font-weight:650;color:var(--accent);text-transform:uppercase;letter-spacing:.04em}
`;
