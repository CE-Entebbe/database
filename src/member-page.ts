import { head } from "./styles";
export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

type View = {
  member: { name: string; church: string };
  cells_enabled: boolean;
  cell: { id: number; name: string } | null;
  cells: { id: number; name: string }[];
};

export function shell(title: string, inner: string) {
  return `${head(title)}<body><header class="top"><div class="in"><div class="brand">CE <span>Membership</span></div></div></header>
<main class="wrap">${inner}</main></body></html>`;
}

export function memberPage(code: string, v: View, msg?: string, isError = false) {
  const body = v.cells_enabled
    ? `<form method="post" action="/m/${esc(code)}" class="card stack">
        <div><label class="f" for="cell">My cell</label>
        <select id="cell" name="cell_id">
          <option value="">I'm not in a cell</option>
          ${v.cells.map((c) => `<option value="${c.id}"${v.cell?.id === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}
        </select></div>
        <button class="btn primary block" type="submit">Save</button>
      </form>`
    : `<div class="empty">Cell selection isn't open right now.</div>`;
  return shell("My membership", `
<p class="pill">${esc(v.member.church)}</p>
<h1>Hello, ${esc(v.member.name)}</h1>
<p class="sub">${v.cell ? `You're in <strong>${esc(v.cell.name)}</strong>.` : "Choose the cell you belong to."}</p>
${msg ? `<div class="toast show${isError ? " err" : ""}" role="status">${esc(msg)}</div><script>setTimeout(()=>document.querySelector('.toast')?.classList.remove('show'),2600)</script>` : ""}
${body}`);
}

export const messagePage = (msg: string) => shell("CE Membership", `<h1>${esc(msg)}</h1><p class="sub">Ask your church admin for your personal link.</p>`);
