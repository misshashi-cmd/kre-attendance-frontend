import { dfmt } from "../ui";
import { STATUS, CHECK, GROUPS, DIRECTIONS, statusOf, kg, mt, signedKg, dtfmt } from "./common";

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PRINT_COLORS = { verified: "#15803d", review: "#b45309", mismatch: "#b91c1c", approved: "#0e7490", rejected: "#b91c1c" };
const CHECK_COLORS = { pass: "#15803d", warn: "#b45309", fail: "#b91c1c", skip: "#64748b" };

const CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 24px; font-size: 12px; }
  h1 { font-size: 18px; margin: 0; } h2 { font-size: 13px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .04em; color: #334155; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
  .stamp { border: 3px solid; border-radius: 8px; padding: 6px 14px; font-size: 16px; font-weight: 700; text-transform: uppercase; transform: rotate(-4deg); }
  table { width: 100%; border-collapse: collapse; } td, th { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-size: 11px; } .num { text-align: right; font-variant-numeric: tabular-nums; }
  .meta td { border: none; padding: 3px 8px 3px 0; } .meta td:nth-child(odd) { color: #64748b; width: 16%; }
  .sig { display: flex; gap: 24px; margin-top: 48px; } .sig div { flex: 1; border-top: 1px solid #0f172a; padding-top: 4px; text-align: center; color: #475569; }
  .foot { margin-top: 18px; color: #64748b; font-size: 10px; }
  .page { page-break-after: always; } .page:last-child { page-break-after: auto; }
  @media print { body { margin: 10mm; } }
`;

const one = w => {
  const v = w.verification || { checks: [] }, st = statusOf(w), S = STATUS[st];
  const ig = w.ind_gross, it = w.ind_tare, inet = v.indicator_net;
  const row = (l, slip, ind, d) => `<tr><td>${l}</td><td class="num">${kg(slip)}</td><td class="num">${kg(ind)}</td><td class="num" style="color:${d ? "#b91c1c" : "#15803d"};font-weight:600">${d === null || d === undefined ? "—" : d === 0 ? "0 kg ✓" : signedKg(d)}</td></tr>`;
  const groups = GROUPS.map(([g, label]) => {
    const cs = v.checks.filter(c => c.group === g);
    return cs.length ? `<tr><th colspan="3">${label}</th></tr>` + cs.map(c => `<tr><td style="width:70px;color:${CHECK_COLORS[c.status]};font-weight:700">${CHECK[c.status].l}</td><td style="width:34%">${esc(c.label)}</td><td>${esc(c.detail)}</td></tr>`).join("") : "";
  }).join("");
  return `<div class="page">
    <div class="head">
      <div><h1>KRE Group — Weighbridge Slip Verification</h1><div style="color:#475569;margin-top:4px">Slip No. <b>${esc(w.slip_no)}</b> · ${w.date ? dfmt(w.date) : ""}</div></div>
      <div class="stamp" style="color:${PRINT_COLORS[st]};border-color:${PRINT_COLORS[st]}">${S.l}</div>
    </div>
    <table class="meta" style="margin-top:10px"><tr>
      <td>Vehicle</td><td><b>${esc(w.vehicle_no)}</b></td><td>Direction</td><td>${esc((DIRECTIONS.find(d => d[0] === w.direction) || DIRECTIONS[0])[1])}</td></tr><tr>
      <td>Party</td><td>${esc(w.party)}</td><td>Material</td><td>${esc(w.material)}</td></tr><tr>
      <td>Challan no.</td><td>${esc(w.challan_no)}</td><td>Challan weight</td><td>${kg(w.challan_weight)}</td></tr><tr>
      <td>Gross time</td><td>${dtfmt(w.gross_time)}</td><td>Tare time</td><td>${dtfmt(w.tare_time)}</td></tr><tr>
      <td>Driver</td><td>${esc(w.driver_name)}</td><td>Operator</td><td>${esc(w.operator || w.entered_by)}</td></tr>
    </table>
    <h2>Software slip vs weighbridge indicator</h2>
    <table><tr><th>Weight</th><th class="num">Software slip</th><th class="num">Indicator display</th><th class="num">Difference</th></tr>
      ${row("Gross", w.slip_gross, ig, v.diffs?.gross)}${row("Tare", w.slip_tare, it, v.diffs?.tare)}${row("Net", w.slip_net, inet, v.diffs?.net)}
    </table>
    <div style="margin-top:6px">Net weight: <b>${kg(w.slip_net)}</b> (${mt(w.slip_net)})</div>
    <h2>Verification checks (${v.counts?.pass || 0} pass · ${v.counts?.warn || 0} to check · ${v.counts?.fail || 0} fail)</h2>
    <table>${groups}</table>
    ${w.decision ? `<h2>Decision</h2><div><b style="color:${PRINT_COLORS[w.decision]}">${STATUS[w.decision].l}</b> by ${esc(w.decision_by)} on ${dtfmt(w.decision_at)}${w.decision_note ? ` — ${esc(w.decision_note)}` : ""}</div>` : ""}
    ${w.remarks ? `<h2>Remarks</h2><div>${esc(w.remarks)}</div>` : ""}
    <div class="sig"><div>Weighbridge operator</div><div>Verified by</div><div>Authorised signatory</div></div>
    <div class="foot">Verified ${dtfmt(w.verified_at)} · Printed ${new Date().toLocaleString("en-IN")}</div>
  </div>`;
};

// Opens a print-ready verification report for one or more weighments.
export const printReports = list => {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Weighbridge verification ${esc(list.length === 1 ? list[0].slip_no : `(${list.length} slips)`)}</title><style>${CSS}</style></head><body>${list.map(one).join("")}<script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
  return true;
};
