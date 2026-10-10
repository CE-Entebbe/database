// Client-side birthday picker: Month + Day (required together), Year optional. Feb 29 allowed unless a non-leap year is chosen.
export const BDAY_JS = `
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const MDAYS=[31,29,31,30,31,30,31,31,30,31,30,31];
const leapY=y=>(y%4===0&&y%100!==0)||y%400===0;
function bdayFields(r,req){r=r||{};const ty=new Date().getFullYear();
 let ys='<option value="">Year (optional)</option>';for(let y=ty;y>=1920;y--)ys+='<option value="'+y+'"'+(y===r.birth_year?" selected":"")+'>'+y+'</option>';
 return '<fieldset class="bday"><legend class="f">Birthday'+(req?"":' <span class="opt">optional</span>')+'</legend><div class="row" style="gap:8px">'
 +'<select name="birth_month" aria-label="Birth month" style="flex:1.4 1 120px"'+(req?" required":"")+' onchange="fixDays(this)"><option value="">Month</option>'+MONTHS.map((m,i)=>'<option value="'+(i+1)+'"'+(i+1===r.birth_month?" selected":"")+'>'+m+'</option>').join("")+'</select>'
 +'<select name="birth_day" aria-label="Birth day" style="flex:1 1 80px"'+(req?" required":"")+' data-v="'+(r.birth_day||"")+'" onchange="this.dataset.v=this.value"></select>'
 +'<select name="birth_year" aria-label="Birth year (optional)" style="flex:1.2 1 120px" onchange="fixDays(this)">'+ys+'</select></div></fieldset>'}
function fixDays(el){const g=el.closest(".bday");const m=Number(g.querySelector("[name=birth_month]").value),y=Number(g.querySelector("[name=birth_year]").value),d=g.querySelector("[name=birth_day]");
 const max=!m?31:m===2?(y&&!leapY(y)?28:29):MDAYS[m-1];const cur=Number(d.dataset.v||d.value)||0;
 let o='<option value="">Day</option>';for(let i=1;i<=max;i++)o+='<option value="'+i+'"'+(i===cur?" selected":"")+'>'+i+'</option>';d.innerHTML=o;if(cur>max)d.dataset.v=""}
function mountBday(el,r,req){el.innerHTML=bdayFields(r,req);fixDays(el.querySelector("select"))}
const fmtBirth=r=>r&&r.birth_month?r.birth_day+" "+MONTHS[r.birth_month-1]+(r.birth_year?" "+r.birth_year:""):"";
`;
