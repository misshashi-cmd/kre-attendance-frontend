import React, { useState } from "react";
import { C, Ico, Av, Stat, Btn, Card, Row, Bar, Pill, Empty, SectionTitle, inp, dfmt } from "../ui";
import { today, addDays, daysBetween, moveStage } from "./store";
import { STAGES, OPEN, isOpen, stageOf, PRIORITY, actIcon, inrShort, waLink, TEMPLATES } from "./common";

const name = l => l.company || l.contact_name || "Unnamed lead";
const sum = (list, k = "value") => list.reduce((a, x) => a + (Number(x[k]) || 0), 0);

const Chip = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${active ? C.ok + "55" : C.bdr}`, background: active ? C.okD : "transparent", color: active ? C.ok : C.tm, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{children}</button>
);

// Follow-up date label, red when overdue and amber when due today.
const Due = ({ d }) => {
  if (!d) return <span style={{ color: C.td }}>Not set</span>;
  const n = daysBetween(today(), d);
  const [c, l] = n < 0 ? [C.no, `${-n}d overdue`] : n === 0 ? [C.wn, "Today"] : n === 1 ? [C.tm, "Tomorrow"] : [C.tm, dfmt(d)];
  return <span style={{ color: c, fontWeight: n <= 0 ? 600 : 400 }}>{l}</span>;
};

const Filters = ({ q, setQ, owner, setOwner, owners, children }) => (
  <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
    <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
      <span style={{ position: "absolute", left: 10, top: 10 }}><Ico t="search" s={15} c={C.td} /></span>
      <input style={{ ...inp, paddingLeft: 32 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search company, contact, phone, city…" />
    </div>
    <select style={{ ...inp, width: "auto", minWidth: 150 }} value={owner} onChange={e => setOwner(e.target.value)}>
      <option value="">All salespeople</option>
      {owners.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    {children}
  </div>
);
const matches = (l, q, owner) => (!owner || l.owner === owner) && (!q || [l.company, l.contact_name, l.phone, l.city, l.product, l.email].join(" ").toLowerCase().includes(q.trim().toLowerCase()));

// ========== OVERVIEW ==========
export const Overview = ({ data, open, setTab }) => {
  const { leads, activities } = data;
  const t = today(), month = t.slice(0, 7);
  const openL = leads.filter(isOpen);
  const due = openL.filter(l => l.next_follow_up && l.next_follow_up <= t);
  const overdue = due.filter(l => l.next_follow_up < t);
  const wonM = leads.filter(l => l.stage === "won" && (l.won_on || "").slice(0, 7) === month);
  const won = leads.filter(l => l.stage === "won").length, lost = leads.filter(l => l.stage === "lost").length;
  const owners = [...new Set(leads.map(l => l.owner || "Unassigned"))];
  const team = owners.map(o => {
    const mine = leads.filter(l => (l.owner || "Unassigned") === o);
    return { o, open: mine.filter(isOpen).length, pipe: sum(mine.filter(isOpen)), won: sum(mine.filter(l => l.stage === "won" && (l.won_on || "").slice(0, 7) === month)), due: mine.filter(l => isOpen(l) && l.next_follow_up && l.next_follow_up <= t).length };
  }).sort((a, b) => b.pipe - a.pipe);
  const stageMax = Math.max(1, ...OPEN.map(k => sum(leads.filter(l => l.stage === k))));
  const sources = Object.entries(leads.reduce((m, l) => { const k = l.source || "Not specified"; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const lostWhy = Object.entries(leads.filter(l => l.stage === "lost").reduce((m, l) => { const k = l.lost_reason || "Not given"; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const hotIdle = openL.filter(l => l.priority === "hot" && !l.next_follow_up);
  const recent = [...activities].sort((a, b) => `${b.date}${b.created_on}`.localeCompare(`${a.date}${a.created_on}`)).slice(0, 6);

  return <>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
      <Stat icon="funnel" label="Open pipeline" value={inrShort(sum(openL))} sub={`${openL.length} open lead${openL.length === 1 ? "" : "s"}`} color={C.in} bg={C.inD} />
      <Stat icon="clock" label="Follow-ups due" value={due.length} sub={overdue.length ? `${overdue.length} overdue` : "None overdue"} color={overdue.length ? C.no : C.wn} bg={overdue.length ? C.noD : C.wnD} />
      <Stat icon="check" label="Won this month" value={inrShort(sum(wonM))} sub={`${wonM.length} deal${wonM.length === 1 ? "" : "s"}`} color={C.ok} bg={C.okD} />
      <Stat icon="chart" label="Win rate" value={won + lost ? `${Math.round((won / (won + lost)) * 100)}%` : "—"} sub={`${won} won · ${lost} lost`} color={C.pu} bg={C.puD} />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 14 }}>
      <Card style={{ padding: 20 }}>
        <SectionTitle right={<Btn onClick={() => setTab("followups")}>All follow-ups</Btn>}>Follow up today</SectionTitle>
        {!due.length ? <div style={{ fontSize: 12, color: C.td }}>No follow-ups due. Nice work.</div>
        : due.sort((a, b) => a.next_follow_up.localeCompare(b.next_follow_up)).slice(0, 6).map(l => <Row key={l.id} onClick={() => open("lead", l)}>
          <Av n={name(l)} s={30} c={PRIORITY[l.priority]?.[0] || C.tm} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{name(l)}</div>
            <div style={{ fontSize: 11, color: C.tm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.next_action || stageOf(l.stage).l}</div>
          </div>
          <span style={{ fontSize: 11 }}><Due d={l.next_follow_up} /></span>
        </Row>)}
        {hotIdle.map(l => <Row key={l.id} onClick={() => open("lead", l)} style={{ borderLeft: `3px solid ${C.no}` }}><Ico t="alert" s={16} c={C.no} /><span style={{ fontSize: 12 }}>Hot lead <strong>{name(l)}</strong> has no follow-up date</span></Row>)}
      </Card>
      <Card style={{ padding: 20 }}>
        <SectionTitle right={<Btn onClick={() => setTab("pipeline")}>Open pipeline</Btn>}>Pipeline value by stage</SectionTitle>
        {OPEN.map(k => { const s = stageOf(k), ls = leads.filter(l => l.stage === k), v = sum(ls); return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9, fontSize: 12 }}>
            <span style={{ width: 104, color: C.tm, flexShrink: 0 }}>{s.l}</span>
            <div style={{ flex: 1, height: 10, background: C.sf, borderRadius: 6, overflow: "hidden" }}><div style={{ width: `${(v / stageMax) * 100}%`, height: "100%", background: s.c, borderRadius: 6 }} /></div>
            <span style={{ width: 64, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{inrShort(v)}</span>
            <span style={{ width: 22, textAlign: "right", color: C.td }}>{ls.length}</span>
          </div>); })}
      </Card>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginBottom: 14 }}>
      <Card style={{ padding: 20, overflow: "hidden" }}>
        <SectionTitle>Sales team</SectionTitle>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
          <thead><tr>{["Salesperson", "Open", "Pipeline", "Won (month)", "Due"].map((h, i) => <th key={h} style={{ textAlign: i ? "right" : "left", color: C.td, fontWeight: 600, padding: "0 6px 8px", fontSize: 11 }}>{h}</th>)}</tr></thead>
          <tbody>{team.map(r => <tr key={r.o} style={{ borderTop: `1px solid ${C.bdr}` }}>
            <td style={{ padding: "8px 6px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Av n={r.o} s={24} c={C.in} />{r.o}</div></td>
            <td style={{ padding: "8px 6px", textAlign: "right" }}>{r.open}</td>
            <td style={{ padding: "8px 6px", textAlign: "right" }}>{inrShort(r.pipe)}</td>
            <td style={{ padding: "8px 6px", textAlign: "right", color: r.won ? C.ok : C.td }}>{inrShort(r.won)}</td>
            <td style={{ padding: "8px 6px", textAlign: "right", color: r.due ? C.wn : C.td }}>{r.due}</td>
          </tr>)}</tbody>
        </table></div>
      </Card>
      <Card style={{ padding: 20 }}>
        <SectionTitle>Where leads come from</SectionTitle>
        {sources.length ? sources.slice(0, 6).map(([k, v]) => <Bar key={k} label={k} value={v} max={sources[0][1]} c={C.in} />) : <div style={{ fontSize: 12, color: C.td }}>No leads yet.</div>}
        {lostWhy.length > 0 && <>
          <div style={{ height: 12 }} />
          <SectionTitle>Why deals are lost</SectionTitle>
          {lostWhy.map(([k, v]) => <Bar key={k} label={k} value={v} max={lostWhy[0][1]} c={C.no} />)}
        </>}
      </Card>
    </div>

    <Card style={{ padding: 20 }}>
      <SectionTitle>Recent activity</SectionTitle>
      {!recent.length ? <div style={{ fontSize: 12, color: C.td }}>Log calls, meetings and WhatsApp messages from a lead to see them here.</div>
      : recent.map(a => { const l = leads.find(x => x.id === a.lead_id); return <Row key={a.id} onClick={l ? () => open("lead", l) : undefined}>
        <Ico t={actIcon(a.type)} s={16} c={C.tm} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.tm }}><strong style={{ color: C.tx }}>{l ? name(l) : "Deleted lead"}</strong> · {a.type} · {dfmt(a.date)}{a.by ? ` · ${a.by}` : ""}</div>
          <div style={{ fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.summary}</div>
        </div>
      </Row>; })}
    </Card>
  </>;
};

// ========== PIPELINE (kanban) ==========
export const Pipeline = ({ data, open, save, notify, owners }) => {
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [showClosed, setShowClosed] = useState(false);
  const list = data.leads.filter(l => matches(l, q, owner));
  const cols = showClosed ? STAGES : STAGES.filter(s => OPEN.includes(s.k));

  const move = async (l, stage) => {
    if (!l || l.stage === stage) return;
    if (stage === "lost") return open("lead", { ...l, stage: "lost" }); // ask for the reason
    try { await save("leads", { ...moveStage(l, stage), ...(OPEN.includes(stage) ? {} : { next_follow_up: "" }) }); notify(`${name(l)} moved to ${stageOf(stage).l}`); }
    catch (e) { notify(e.message, "error"); }
  };
  const drop = stage => { const l = data.leads.find(x => x.id === drag); setDrag(null); setOver(null); move(l, stage); };

  return <>
    <Filters q={q} setQ={setQ} owner={owner} setOwner={setOwner} owners={owners}>
      <label style={{ fontSize: 12, color: C.tm, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
        <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} style={{ accentColor: C.ok }} /> Show won & lost
      </label>
      <span style={{ fontSize: 11, color: C.td, marginLeft: "auto" }}>Drag cards between stages, or use the arrow to advance</span>
    </Filters>
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}>
      {cols.map(s => {
        const ls = list.filter(l => l.stage === s.k).sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
        const next = STAGES[STAGES.findIndex(x => x.k === s.k) + 1];
        return <div key={s.k} onDragOver={e => { e.preventDefault(); setOver(s.k); }} onDragLeave={() => setOver(o => o === s.k ? null : o)} onDrop={() => drop(s.k)}
          style={{ flex: "1 0 220px", background: over === s.k ? `${s.c}14` : C.card, border: `1px solid ${over === s.k ? s.c + "66" : C.bdr}`, borderRadius: 14, padding: 10, minHeight: 200 }}>
          <div style={{ padding: "4px 6px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.c }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{s.l}</span>
              <span style={{ fontSize: 11, color: C.td, marginLeft: "auto" }}>{ls.length}</span>
            </div>
            <div style={{ fontSize: 12, color: C.tm, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{inrShort(sum(ls))}</div>
          </div>
          {ls.map(l => <div key={l.id} draggable onDragStart={() => setDrag(l.id)} onDragEnd={() => { setDrag(null); setOver(null); }} onClick={() => open("lead", l)}
            style={{ background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 12, marginBottom: 8, cursor: "grab", opacity: drag === l.id ? .4 : 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name(l)}</div>
                <div style={{ fontSize: 11, color: C.tm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[l.contact_name !== name(l) && l.contact_name, l.city].filter(Boolean).join(" · ") || " "}</div>
              </div>
              {next && OPEN.includes(s.k) && next.k !== "lost" && <button title={`Move to ${next.l}`} onClick={e => { e.stopPropagation(); move(l, next.k); }} style={{ background: "transparent", border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "3px 6px", cursor: "pointer", color: C.tm, fontSize: 12 }}>→</button>}
            </div>
            {l.product && <div style={{ fontSize: 11, color: C.tm, marginTop: 6 }}>{l.product}{l.quantity ? ` · ${l.quantity} ${l.unit || ""}` : ""}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{l.value ? inrShort(l.value) : <span style={{ color: C.td, fontWeight: 400, fontSize: 11 }}>No value</span>}</span>
              {PRIORITY[l.priority] && <Pill c={PRIORITY[l.priority][0]}>{PRIORITY[l.priority][1]}</Pill>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: C.td }}>
              <span>{l.owner || "Unassigned"}</span>
              {isOpen(l) ? <span><Ico t="clock" s={10} c={C.td} /> <Due d={l.next_follow_up} /></span> : l.stage === "lost" && <span>{l.lost_reason}</span>}
            </div>
          </div>)}
          {!ls.length && <div style={{ fontSize: 11, color: C.td, textAlign: "center", padding: "20px 0" }}>—</div>}
        </div>;
      })}
    </div>
  </>;
};

// ========== ALL LEADS (table) ==========
export const Leads = ({ data, open, owners }) => {
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  const [stage, setStage] = useState("open");
  const [sort, setSort] = useState("follow");
  const list = data.leads.filter(l => matches(l, q, owner) && (stage === "all" || (stage === "open" ? isOpen(l) : l.stage === stage)))
    .sort({
      follow: (a, b) => (a.next_follow_up || "9999").localeCompare(b.next_follow_up || "9999"),
      value: (a, b) => (Number(b.value) || 0) - (Number(a.value) || 0),
      recent: (a, b) => (b.created_on || "").localeCompare(a.created_on || ""),
      name: (a, b) => name(a).localeCompare(name(b)),
    }[sort]);

  return <>
    <Filters q={q} setQ={setQ} owner={owner} setOwner={setOwner} owners={owners}>
      <select style={{ ...inp, width: "auto" }} value={stage} onChange={e => setStage(e.target.value)}>
        <option value="open">Open leads</option>
        <option value="all">All stages</option>
        {STAGES.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}
      </select>
      <select style={{ ...inp, width: "auto" }} value={sort} onChange={e => setSort(e.target.value)}>
        <option value="follow">Sort: next follow-up</option>
        <option value="value">Sort: highest value</option>
        <option value="recent">Sort: newest first</option>
        <option value="name">Sort: name A–Z</option>
      </select>
      <span style={{ fontSize: 12, color: C.tm, marginLeft: "auto" }}>{list.length} lead{list.length === 1 ? "" : "s"} · {inrShort(sum(list))}</span>
    </Filters>
    {!list.length ? <Card><Empty icon="funnel" title="No leads match" sub="Try a different stage or clear the search." /></Card>
    : <Card style={{ overflow: "hidden" }}><div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
        <thead><tr style={{ borderBottom: `1px solid ${C.bdr}` }}>{["Lead", "Requirement", "Value", "Stage", "Priority", "Salesperson", "Next follow-up"].map(h => <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: C.tm, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
        <tbody>{list.map(l => { const s = stageOf(l.stage); return <tr key={l.id} onClick={() => open("lead", l)} style={{ borderBottom: `1px solid ${C.bdr}`, cursor: "pointer" }}>
          <td style={{ padding: "10px 14px" }}><div style={{ fontWeight: 600 }}>{name(l)}</div><div style={{ fontSize: 11, color: C.td }}>{[l.contact_name !== name(l) && l.contact_name, l.phone, l.city].filter(Boolean).join(" · ")}</div></td>
          <td style={{ padding: "10px 14px", color: C.tm }}>{l.product || "—"}{l.quantity ? <div style={{ fontSize: 11, color: C.td }}>{l.quantity} {l.unit}</div> : null}</td>
          <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{l.value ? inrShort(l.value) : "—"}</td>
          <td style={{ padding: "10px 14px" }}><Pill c={s.c}>{s.l}</Pill></td>
          <td style={{ padding: "10px 14px" }}>{PRIORITY[l.priority] ? <Pill c={PRIORITY[l.priority][0]}>{PRIORITY[l.priority][1]}</Pill> : "—"}</td>
          <td style={{ padding: "10px 14px", color: C.tm }}>{l.owner || "—"}</td>
          <td style={{ padding: "10px 14px", fontSize: 12, whiteSpace: "nowrap" }}>{isOpen(l) ? <Due d={l.next_follow_up} /> : <span style={{ color: C.td }}>{s.k === "won" ? `Won ${dfmt(l.won_on)}` : l.lost_reason || "Closed"}</span>}</td>
        </tr>; })}</tbody>
      </table>
    </div></Card>}
  </>;
};

// ========== FOLLOW-UPS ==========
export const FollowUps = ({ data, open, save, notify, owners, me }) => {
  const [owner, setOwner] = useState("");
  const [q, setQ] = useState("");
  const t = today(), wk = addDays(t, 7);
  const list = data.leads.filter(l => isOpen(l) && matches(l, q, owner));
  const groups = [
    ["Overdue", C.no, list.filter(l => l.next_follow_up && l.next_follow_up < t)],
    ["Today", C.wn, list.filter(l => l.next_follow_up === t)],
    ["Next 7 days", C.in, list.filter(l => l.next_follow_up > t && l.next_follow_up <= wk)],
    ["Later", C.tm, list.filter(l => l.next_follow_up > wk)],
    ["No follow-up set", C.td, list.filter(l => !l.next_follow_up)],
  ].filter(g => g[2].length);
  const snooze = async (l, n) => {
    try { await save("leads", { ...l, next_follow_up: addDays(t, n) }); notify(`${name(l)} moved to ${dfmt(addDays(t, n))}`); }
    catch (e) { notify(e.message, "error"); }
  };

  return <>
    <Filters q={q} setQ={setQ} owner={owner} setOwner={setOwner} owners={owners} />
    {!groups.length ? <Card><Empty icon="check" title="No open leads" sub="Add a lead to start tracking follow-ups." /></Card>
    : groups.map(([label, c, ls]) => <div key={label} style={{ marginBottom: 20 }}>
      <SectionTitle><span style={{ color: c }}>{label}</span> <span style={{ color: C.td }}>· {ls.length}</span></SectionTitle>
      {ls.sort((a, b) => (a.next_follow_up || "").localeCompare(b.next_follow_up || "") || (Number(b.value) || 0) - (Number(a.value) || 0)).map(l => (
        <Card key={l.id} style={{ padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderLeft: `3px solid ${c}` }}>
          <div onClick={() => open("lead", l)} style={{ flex: "1 1 240px", minWidth: 0, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{name(l)}</span>
              {PRIORITY[l.priority] && <Pill c={PRIORITY[l.priority][0]}>{PRIORITY[l.priority][1]}</Pill>}
              <Pill c={stageOf(l.stage).c}>{stageOf(l.stage).l}</Pill>
            </div>
            <div style={{ fontSize: 12, color: C.tm, marginTop: 3 }}>{[l.contact_name !== name(l) && l.contact_name, l.phone, l.value && inrShort(l.value), l.owner].filter(Boolean).join(" · ")}</div>
            {l.next_action && <div style={{ fontSize: 12, marginTop: 4 }}>→ {l.next_action}</div>}
          </div>
          <div style={{ fontSize: 12, width: 90 }}><Due d={l.next_follow_up} /></div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {l.phone && <a href={`tel:${l.phone}`} style={{ textDecoration: "none" }}><Btn icon="phone" style={{ padding: "7px 10px" }}>Call</Btn></a>}
            {l.phone && <a href={waLink(l.phone, TEMPLATES[l.stage === "quotation" ? 2 : 1].t(l, l.owner || me))} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}><Btn icon="chat" style={{ padding: "7px 10px" }}>WhatsApp</Btn></a>}
            <Btn kind="primary" icon="plus" style={{ padding: "7px 10px" }} onClick={() => open("act", { lead_id: l.id })}>Log</Btn>
            <select aria-label="Snooze" value="" onChange={e => e.target.value && snooze(l, +e.target.value)} style={{ ...inp, width: "auto", padding: "6px 8px", fontSize: 12 }}>
              <option value="">Snooze…</option>
              <option value="1">Tomorrow</option>
              <option value="3">In 3 days</option>
              <option value="7">Next week</option>
            </select>
          </div>
        </Card>
      ))}
    </div>)}
  </>;
};
