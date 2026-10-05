import React, { useState } from "react";
import { C, Ico, Stat, Btn, Card, Row, Bar, Pill, Empty, SectionTitle, inp, dfmt } from "../ui";
import { today, addDays } from "./store";
import { STATUS, statusOf, needsAction, kg, mt, signedKg, dtfmt, isValidVehicle } from "./common";

const sumNet = list => list.reduce((a, w) => a + (Number(w.slip_net) || 0), 0);
const St = ({ w }) => { const S = STATUS[statusOf(w)]; return <Pill c={S.c}>{S.l}</Pill>; };
const matches = (w, q) => !q || [w.slip_no, w.vehicle_no, w.party, w.material, w.challan_no, w.driver_name].join(" ").toLowerCase().includes(q.trim().toLowerCase());
const failed = w => (w.verification?.checks || []).filter(c => c.status === "fail" || c.status === "warn");

const Chip = ({ active, onClick, c = C.ok, children }) => (
  <button onClick={onClick} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${active ? c + "55" : C.bdr}`, background: active ? `${c}1F` : "transparent", color: active ? c : C.tm, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{children}</button>
);

// ========== OVERVIEW ==========
export const Overview = ({ data, open, setTab, setFilter }) => {
  const t = today();
  const todays = data.weighments.filter(w => w.date === t);
  const count = k => todays.filter(w => statusOf(w) === k).length;
  const pending = data.weighments.filter(needsAction).sort((a, b) => (a.verification.status === "mismatch" ? 0 : 1) - (b.verification.status === "mismatch" ? 0 : 1) || `${b.date}`.localeCompare(`${a.date}`));
  const last30 = data.weighments.filter(w => w.date >= addDays(t, -30));
  const issues = Object.entries(last30.reduce((m, w) => { failed(w).forEach(c => { m[c.label] = (m[c.label] || 0) + 1; }); return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const vehIssues = Object.entries(last30.filter(w => w.verification?.status === "mismatch").reduce((m, w) => { m[w.vehicle_no] = (m[w.vehicle_no] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const matchRate = last30.length ? Math.round((last30.filter(w => !w.verification?.checks?.some(c => c.group === "indicator" && c.status === "fail")).length / last30.length) * 100) : null;
  const drill = st => { setFilter({ status: st, from: t, to: t }); setTab("slips"); };

  return <>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
      <Stat icon="truck" label="Weighments today" value={todays.length} sub={`${mt(sumNet(todays))} net`} color={C.in} bg={C.inD} />
      <Stat icon="check" label="Verified today" value={count("verified") + count("approved")} sub={count("approved") ? `${count("approved")} approved by admin` : "Slip = indicator"} color={C.ok} bg={C.okD} />
      <Stat icon="alert" label="Needs review" value={count("review")} sub="Warnings or missing reading" color={C.wn} bg={C.wnD} />
      <Stat icon="x" label="Mismatch / rejected" value={count("mismatch") + count("rejected")} sub={matchRate === null ? "—" : `${matchRate}% slips matched indicator (30 days)`} color={C.no} bg={C.noD} />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 14, marginBottom: 14 }}>
      <Card style={{ padding: 20 }}>
        <SectionTitle right={<Btn onClick={() => drill("")}>Today's slips</Btn>}>Waiting for action</SectionTitle>
        {!pending.length ? <div style={{ fontSize: 12, color: C.td }}>Every slip is verified or decided. Nothing pending.</div>
        : pending.slice(0, 8).map(w => <Row key={w.id} onClick={() => open("slip", w)} style={{ borderLeft: `3px solid ${STATUS[w.verification.status].c}` }}>
          <Ico t={STATUS[w.verification.status].i} s={16} c={STATUS[w.verification.status].c} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Slip {w.slip_no} · {w.vehicle_no}</div>
            <div style={{ fontSize: 11, color: C.tm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{failed(w).map(c => c.label).join(" · ") || "Indicator readings missing"}</div>
          </div>
          <span style={{ fontSize: 11, color: C.td }}>{dfmt(w.date)}</span>
        </Row>)}
        {pending.length > 8 && <div style={{ fontSize: 11, color: C.td, marginTop: 4 }}>+{pending.length - 8} more in Slip register</div>}
      </Card>
      <Card style={{ padding: 20 }}>
        <SectionTitle>Most common problems (30 days)</SectionTitle>
        {!issues.length ? <div style={{ fontSize: 12, color: C.td }}>No problems found in the last 30 days.</div>
        : issues.map(([l, n]) => <Bar key={l} label={l} value={n} max={issues[0][1]} c={C.wn} />)}
        {!!vehIssues.length && <>
          <div style={{ marginTop: 16 }}><SectionTitle>Vehicles with mismatches (30 days)</SectionTitle></div>
          {vehIssues.map(([v, n]) => <Bar key={v} label={v} value={n} max={vehIssues[0][1]} c={C.no} />)}
        </>}
      </Card>
    </div>

    <Card style={{ padding: 20 }}>
      <SectionTitle>How verification works</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, fontSize: 12, color: C.tm }}>
        {[["doc", "Slip data", "Net = gross − tare, weights in indicator steps, no reused slip number."],
          ["scale", "Indicator match", "Gross, tare and net on the software slip must equal what the weighbridge indicator showed."],
          ["truck", "Vehicle", "Registered and not blocked; tare close to its standard tare; not over GVW."],
          ["clock", "Timing & party", "Right weighing order, realistic gap, no repeat weighing; net vs challan shortage."]].map(([i, h, d]) => (
          <div key={h} style={{ display: "flex", gap: 10 }}><Ico t={i} s={18} c={C.ok} /><div><div style={{ color: C.tx, fontWeight: 600, marginBottom: 2 }}>{h}</div>{d}</div></div>
        ))}
      </div>
    </Card>
  </>;
};

// ========== SLIP REGISTER ==========
export const Slips = ({ data, open, filter, setFilter, onPrint, onExport }) => {
  const [q, setQ] = useState("");
  const { status = "", from = "", to = "" } = filter;
  const set = p => setFilter({ ...filter, ...p });
  const list = data.weighments.filter(w => (!status || statusOf(w) === status) && (!from || w.date >= from) && (!to || w.date <= to) && matches(w, q))
    .sort((a, b) => `${b.date}${b.gross_time || b.tare_time || ""}${b.slip_no}`.localeCompare(`${a.date}${a.gross_time || a.tare_time || ""}${a.slip_no}`));
  const th = { padding: "10px 12px", textAlign: "left", color: C.tm, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" };
  const td = { padding: "10px 12px", whiteSpace: "nowrap" };
  const numTd = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const DiffCell = ({ d }) => d === null || d === undefined ? <span style={{ color: C.td }}>—</span> : <span style={{ color: d === 0 ? C.ok : C.no, fontWeight: 600 }}>{d === 0 ? "✓" : signedKg(d)}</span>;

  return <>
    <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
        <span style={{ position: "absolute", left: 10, top: 10 }}><Ico t="search" s={15} c={C.td} /></span>
        <input style={{ ...inp, paddingLeft: 32 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Slip, vehicle, party, material, challan…" />
      </div>
      <input style={{ ...inp, width: "auto" }} type="date" value={from} onChange={e => set({ from: e.target.value })} aria-label="From date" />
      <span style={{ color: C.td, fontSize: 12 }}>to</span>
      <input style={{ ...inp, width: "auto" }} type="date" value={to} onChange={e => set({ to: e.target.value })} aria-label="To date" />
      <Btn onClick={() => set({ from: today(), to: today() })}>Today</Btn>
      {(from || to) && <Btn onClick={() => set({ from: "", to: "" })}>All dates</Btn>}
    </div>
    <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
      <Chip active={!status} onClick={() => set({ status: "" })}>All</Chip>
      {Object.entries(STATUS).map(([k, S]) => <Chip key={k} c={S.c} active={status === k} onClick={() => set({ status: k })}>{S.l}</Chip>)}
    </div>

    <Card style={{ overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: C.tm }}><strong style={{ color: C.tx }}>{list.length}</strong> slip{list.length === 1 ? "" : "s"} · net {mt(sumNet(list))}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn icon="print" onClick={() => onPrint(list)} disabled={!list.length}>Print reports</Btn>
          <Btn icon="dl" onClick={() => onExport(list)} disabled={!list.length}>Export CSV</Btn>
        </div>
      </div>
      {!list.length ? <Empty icon="search" title="No slips match" sub="Change the dates, status or search." />
      : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ borderBottom: `1px solid ${C.bdr}` }}>
          {["Slip", "Date", "Vehicle", "Party / material", "Gross", "Tare", "Net", "Δ Gross", "Δ Tare", "Δ Net", "Status"].map((h, i) => <th key={h} style={{ ...th, textAlign: i >= 4 && i <= 9 ? "right" : "left" }}>{h}</th>)}
        </tr></thead>
        <tbody>{list.map(w => { const d = w.verification?.diffs || {}; return (
          <tr key={w.id} onClick={() => open("slip", w)} style={{ borderBottom: `1px solid ${C.bdr}`, cursor: "pointer" }}>
            <td style={{ ...td, fontWeight: 600 }}>{w.slip_no}</td>
            <td style={{ ...td, color: C.tm }}>{dfmt(w.date)}</td>
            <td style={td}>{w.vehicle_no}</td>
            <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}><div>{w.party || "—"}</div><div style={{ fontSize: 11, color: C.td }}>{w.material}</div></td>
            <td style={numTd}>{kg(w.slip_gross)}</td>
            <td style={numTd}>{kg(w.slip_tare)}</td>
            <td style={{ ...numTd, fontWeight: 600 }}>{kg(w.slip_net)}</td>
            <td style={numTd}><DiffCell d={d.gross} /></td>
            <td style={numTd}><DiffCell d={d.tare} /></td>
            <td style={numTd}><DiffCell d={d.net} /></td>
            <td style={td}><St w={w} /></td>
          </tr>); })}</tbody>
      </table></div>}
    </Card>
    <div style={{ fontSize: 11, color: C.td, marginTop: 8 }}>Δ = software slip minus indicator reading. ✓ means they match exactly.</div>
  </>;
};

// ========== VEHICLE REGISTER ==========
export const Vehicles = ({ data, open }) => {
  const [q, setQ] = useState("");
  const stats = vno => {
    const ws = data.weighments.filter(w => w.vehicle_no === vno);
    const tares = ws.map(w => Number(w.slip_tare)).filter(x => x > 0);
    const last = [...ws].sort((a, b) => `${b.date}${b.tare_time || ""}`.localeCompare(`${a.date}${a.tare_time || ""}`))[0];
    return { trips: ws.length, bad: ws.filter(w => w.verification?.status === "mismatch").length, last, min: tares.length ? Math.min(...tares) : null, max: tares.length ? Math.max(...tares) : null };
  };
  const unregistered = [...new Set(data.weighments.map(w => w.vehicle_no).filter(v => v && !data.vehicles.some(x => x.vehicle_no === v)))];
  const list = data.vehicles.filter(v => !q || [v.vehicle_no, v.owner_name, v.transporter, v.driver_name].join(" ").toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.blacklisted ? 1 : 0) - (a.blacklisted ? 1 : 0) || a.vehicle_no.localeCompare(b.vehicle_no));
  const th = { padding: "10px 12px", textAlign: "left", color: C.tm, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" };
  const td = { padding: "10px 12px", whiteSpace: "nowrap" };

  return <>
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
        <span style={{ position: "absolute", left: 10, top: 10 }}><Ico t="search" s={15} c={C.td} /></span>
        <input style={{ ...inp, paddingLeft: 32 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Vehicle, owner, transporter, driver…" />
      </div>
      <Btn kind="primary" icon="plus" onClick={() => open("vehicle")}>Add vehicle</Btn>
    </div>
    {!!unregistered.length && <Card style={{ padding: 14, marginBottom: 14, borderLeft: `3px solid ${C.wn}` }}>
      <div style={{ fontSize: 12, color: C.tm, marginBottom: 8 }}>These vehicles were weighed but aren't in the register, so their tare can't be checked:</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{unregistered.map(v => <Btn key={v} icon="plus" onClick={() => open("vehicle", { vehicle_no: v })}>{v}</Btn>)}</div>
    </Card>}
    <Card style={{ overflow: "hidden" }}>
      {!list.length ? <Empty icon="truck" title="No vehicles yet" sub="Add each vehicle with its standard (empty) tare from the RC or a verified empty weighment." />
      : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ borderBottom: `1px solid ${C.bdr}` }}>{["Vehicle", "Owner / transporter", "Standard tare", "Tare seen (min – max)", "GVW", "Trips", "Mismatches", "Last weighed", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{list.map(v => { const s = stats(v.vehicle_no); const spread = s.min !== null && Number(v.std_tare) ? Math.max(Math.abs(s.max - v.std_tare), Math.abs(s.min - v.std_tare)) : null; return (
          <tr key={v.id} onClick={() => open("vehicle", v)} style={{ borderBottom: `1px solid ${C.bdr}`, cursor: "pointer" }}>
            <td style={{ ...td, fontWeight: 600 }}>{v.vehicle_no}{!isValidVehicle(v.vehicle_no) && <span title="Unusual number format" style={{ color: C.wn }}> ⚠</span>}<div style={{ fontSize: 11, color: C.td, fontWeight: 400 }}>{v.vehicle_type}</div></td>
            <td style={td}>{v.owner_name || "—"}<div style={{ fontSize: 11, color: C.td }}>{v.transporter}</div></td>
            <td style={td}>{kg(v.std_tare)}</td>
            <td style={{ ...td, color: spread !== null && spread > Number(v.std_tare) * 0.02 ? C.wn : C.tm }}>{s.min === null ? "—" : `${kg(s.min)} – ${kg(s.max)}`}</td>
            <td style={td}>{kg(v.gvw)}</td>
            <td style={td}>{s.trips}</td>
            <td style={{ ...td, color: s.bad ? C.no : C.td, fontWeight: s.bad ? 600 : 400 }}>{s.bad}</td>
            <td style={{ ...td, color: C.tm }}>{!s.last ? "—" : s.last.tare_time || s.last.gross_time ? dtfmt(s.last.tare_time || s.last.gross_time) : dfmt(s.last.date)}</td>
            <td style={td}>{v.blacklisted ? <Pill c={C.no}>Blocked</Pill> : v.rc_expiry && v.rc_expiry < today() ? <Pill c={C.wn}>RC expired</Pill> : null}</td>
          </tr>); })}</tbody>
      </table></div>}
    </Card>
  </>;
};
