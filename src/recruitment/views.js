import React, { useState } from "react";
import { C, Ico, Av, Stat, Btn, Card, inp, fmt } from "../ui";
import { today, addDays, daysBetween, moveStage } from "./store";
import { STAGES, ACTIVE, stageOf, JOB_STATUS, RESULTS, OFFER_STATUS, Pill, Stars, Empty, SectionTitle, inr, dfmt, copyText } from "./common";
import { jobPostText } from "./modals";

const Bar = ({ label, value, max, c }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 12 }}>
    <span style={{ width: 110, color: C.tm, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    <div style={{ flex: 1, height: 10, background: C.sf, borderRadius: 6, overflow: "hidden" }}><div style={{ width: `${max ? (value / max) * 100 : 0}%`, height: "100%", background: c, borderRadius: 6 }} /></div>
    <span style={{ width: 28, textAlign: "right", fontWeight: 600 }}>{value}</span>
  </div>
);

const Row = ({ children, onClick, style }) => (
  <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: C.sf, borderRadius: 12, border: `1px solid ${C.bdr}`, marginBottom: 8, cursor: onClick ? "pointer" : "default", ...style }}>{children}</div>
);

const DateChip = ({ iso }) => {
  const d = new Date(`${iso}T00:00:00`);
  return <div style={{ width: 44, textAlign: "center", flexShrink: 0 }}>
    <div style={{ fontSize: 10, color: C.tm, textTransform: "uppercase" }}>{d.toLocaleDateString("en-IN", { month: "short" })}</div>
    <div style={{ fontSize: 18, fontWeight: 700 }}>{d.getDate()}</div>
  </div>;
};

const byWhen = (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);

// ========== OVERVIEW ==========
export const Overview = ({ data, open, setTab }) => {
  const { jobs, candidates, interviews } = data;
  const t = today(), month = t.slice(0, 7);
  const openJobs = jobs.filter(j => j.status === "open");
  const active = candidates.filter(c => ACTIVE.includes(c.stage));
  const week = interviews.filter(i => i.date >= t && i.date <= addDays(t, 7));
  const upcoming = interviews.filter(i => i.date >= t).sort(byWhen).slice(0, 5);
  const feedbackDue = interviews.filter(i => i.date < t && (!i.result || i.result === "pending"));
  const hired = candidates.filter(c => c.stage === "hired");
  const hiredMonth = hired.filter(c => (c.hired_on || "").slice(0, 7) === month);
  const tth = hired.filter(c => c.hired_on && c.applied_on).map(c => daysBetween(c.applied_on, c.hired_on));
  const avgTth = tth.length ? Math.round(tth.reduce((a, b) => a + b, 0) / tth.length) : null;
  const offers = candidates.filter(c => c.offer && c.offer.status !== "draft");
  const accepted = offers.filter(c => c.offer.status === "accepted" || c.stage === "hired").length;
  const stageMax = Math.max(1, ...STAGES.map(s => candidates.filter(c => c.stage === s.k).length));
  const sources = Object.entries(candidates.reduce((m, c) => { const k = c.source || "Not specified"; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const stale = active.filter(c => daysBetween(c.stage_on || c.applied_on || t, t) > 7);
  const ignored = openJobs.filter(j => !active.some(c => c.job_id === j.id));

  return <>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
      <Stat icon="brief" label="Open positions" value={openJobs.reduce((a, j) => a + (+j.openings || 1), 0)} sub={`${openJobs.length} job opening${openJobs.length === 1 ? "" : "s"}`} color={C.in} bg={C.inD} />
      <Stat icon="users" label="Active candidates" value={active.length} sub={`${candidates.length} total`} color={C.pu} bg={C.puD} />
      <Stat icon="cal" label="Interviews (7 days)" value={week.length} sub={feedbackDue.length ? `${feedbackDue.length} feedback due` : "No feedback due"} color={C.wn} bg={C.wnD} />
      <Stat icon="check" label="Hired this month" value={hiredMonth.length} sub={avgTth !== null ? `Avg. ${avgTth} days to hire` : "No hires yet"} color={C.ok} bg={C.okD} />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 14 }}>
      <Card style={{ padding: 20 }}>
        <SectionTitle right={<Btn onClick={() => setTab("pipeline")}>Open pipeline</Btn>}>Candidates by stage</SectionTitle>
        {STAGES.map(s => <Bar key={s.k} label={s.l} value={candidates.filter(c => c.stage === s.k).length} max={stageMax} c={s.c} />)}
        {offers.length > 0 && <div style={{ fontSize: 12, color: C.tm, marginTop: 10 }}>Offer acceptance rate: <strong style={{ color: C.ok }}>{Math.round((accepted / offers.length) * 100)}%</strong> ({accepted}/{offers.length})</div>}
      </Card>
      <Card style={{ padding: 20 }}>
        <SectionTitle>Where candidates come from</SectionTitle>
        {sources.length ? sources.slice(0, 7).map(([k, v]) => <Bar key={k} label={k} value={v} max={sources[0][1]} c={C.in} />) : <div style={{ fontSize: 12, color: C.td }}>No candidates yet.</div>}
      </Card>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
      <Card style={{ padding: 20 }}>
        <SectionTitle right={<Btn onClick={() => setTab("interviews")}>All interviews</Btn>}>Upcoming interviews</SectionTitle>
        {upcoming.length ? upcoming.map(i => {
          const c = candidates.find(x => x.id === i.candidate_id);
          return <Row key={i.id} onClick={() => open("iv", i)}>
            <DateChip iso={i.date} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{c?.name || "Removed candidate"}</div><div style={{ fontSize: 11, color: C.tm }}>{i.round} · {fmt(i.time)} · {i.mode}{i.interviewer ? ` · ${i.interviewer}` : ""}</div></div>
          </Row>;
        }) : <div style={{ fontSize: 12, color: C.td }}>Nothing scheduled.</div>}
      </Card>
      <Card style={{ padding: 20 }}>
        <SectionTitle>Needs attention</SectionTitle>
        {!feedbackDue.length && !stale.length && !ignored.length && <div style={{ fontSize: 12, color: C.td }}>All caught up.</div>}
        {feedbackDue.map(i => { const c = candidates.find(x => x.id === i.candidate_id); return <Row key={i.id} onClick={() => open("iv", i)} style={{ borderLeft: `3px solid ${C.wn}` }}><Ico t="alert" s={16} c={C.wn} /><span style={{ fontSize: 12 }}>Add feedback for <strong>{c?.name || "candidate"}</strong> ({i.round}, {dfmt(i.date)})</span></Row>; })}
        {stale.slice(0, 5).map(c => <Row key={c.id} onClick={() => open("cand", c)} style={{ borderLeft: `3px solid ${C.in}` }}><Ico t="clock" s={16} c={C.in} /><span style={{ fontSize: 12 }}><strong>{c.name}</strong> has been in {stageOf(c.stage).l} for {daysBetween(c.stage_on || c.applied_on, t)} days</span></Row>)}
        {ignored.map(j => <Row key={j.id} onClick={() => open("job", j)} style={{ borderLeft: `3px solid ${C.no}` }}><Ico t="brief" s={16} c={C.no} /><span style={{ fontSize: 12 }}><strong>{j.title}</strong> is open with no active candidates</span></Row>)}
      </Card>
    </div>
  </>;
};

// ========== JOBS ==========
export const Jobs = ({ data, open, notify, setTab, setJobFilter }) => {
  const [st, setSt] = useState("open");
  const list = data.jobs.filter(j => st === "all" || j.status === st).sort((a, b) => (b.created_on || "").localeCompare(a.created_on || ""));
  const copy = async j => await copyText(jobPostText(j)) ? notify("Job post copied — paste it on WhatsApp, LinkedIn or Naukri") : notify("Could not copy to clipboard", "error");

  return <>
    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
      {[["open", "Open"], ["on-hold", "On hold"], ["closed", "Closed"], ["all", "All"]].map(([k, l]) => (
        <button key={k} onClick={() => setSt(k)} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${st === k ? C.ok + "55" : C.bdr}`, background: st === k ? C.okD : "transparent", color: st === k ? C.ok : C.tm, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          {l} <span style={{ opacity: .7 }}>{k === "all" ? data.jobs.length : data.jobs.filter(j => j.status === k).length}</span>
        </button>
      ))}
    </div>
    {!list.length ? <Card><Empty icon="brief" title="No job openings here" sub="Create a job opening to start collecting candidates."><Btn kind="primary" icon="plus" onClick={() => open("job", {})}>New job opening</Btn></Empty></Card>
    : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
      {list.map(j => {
        const cs = data.candidates.filter(c => c.job_id === j.id);
        const hired = cs.filter(c => c.stage === "hired").length;
        const [sc, sl] = JOB_STATUS[j.status] || JOB_STATUS.open;
        const overdue = j.status === "open" && j.target_date && j.target_date < today();
        return <Card key={j.id} style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{j.title}</div>
              <div style={{ fontSize: 12, color: C.tm, marginTop: 2 }}>{[j.department, j.location, j.employment_type].filter(Boolean).join(" · ")}</div>
            </div>
            <Pill c={sc}>{sl}</Pill>
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: C.tm, flexWrap: "wrap" }}>
            {j.experience && <span>{j.experience}</span>}
            {j.salary && <span>{j.salary}</span>}
            {j.target_date && <span style={{ color: overdue ? C.no : C.tm }}>Target {dfmt(j.target_date)}</span>}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {STAGES.slice(0, 5).map(s => { const n = cs.filter(c => c.stage === s.k).length; return (
              <div key={s.k} title={s.l} style={{ flex: 1, background: C.sf, borderRadius: 8, padding: "6px 0", textAlign: "center", border: `1px solid ${C.bdr}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: n ? s.c : C.td }}>{n}</div>
                <div style={{ fontSize: 9, color: C.td, textTransform: "uppercase", letterSpacing: ".04em" }}>{s.sh}</div>
              </div>); })}
          </div>
          <div style={{ fontSize: 12, color: hired >= (+j.openings || 1) ? C.ok : C.tm }}>Filled {hired} of {j.openings || 1} position{(+j.openings || 1) === 1 ? "" : "s"}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
            <Btn icon="users" onClick={() => { setJobFilter(j.id); setTab("pipeline"); }}>Pipeline</Btn>
            <Btn icon="copy" onClick={() => copy(j)}>Copy job post</Btn>
            <Btn icon="edit" onClick={() => open("job", j)}>Edit</Btn>
          </div>
        </Card>;
      })}
    </div>}
  </>;
};

// ========== PIPELINE (kanban) ==========
export const Pipeline = ({ data, open, jobOf, save, notify, jobFilter, setJobFilter }) => {
  const [q, setQ] = useState("");
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [showRejected, setShowRejected] = useState(false);
  const t = today();
  const ql = q.trim().toLowerCase();
  const list = data.candidates.filter(c => (!jobFilter || c.job_id === jobFilter) && (!ql || [c.name, c.email, c.phone, c.location, c.source].join(" ").toLowerCase().includes(ql)));
  const cols = showRejected ? STAGES : STAGES.filter(s => s.k !== "rejected");

  const move = async (c, stage) => {
    if (!c || c.stage === stage) return;
    try { await save("candidates", moveStage(c, stage)); notify(`${c.name} moved to ${stageOf(stage).l}`); }
    catch (e) { notify(e.message, "error"); }
  };
  const drop = stage => { const c = data.candidates.find(x => x.id === drag); setDrag(null); setOver(null); move(c, stage); };

  return <>
    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
        <span style={{ position: "absolute", left: 10, top: 10 }}><Ico t="search" s={15} c={C.td} /></span>
        <input style={{ ...inp, paddingLeft: 32 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, email…" />
      </div>
      <select style={{ ...inp, width: "auto", minWidth: 180 }} value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
        <option value="">All jobs</option>
        {data.jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
      </select>
      <label style={{ fontSize: 12, color: C.tm, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
        <input type="checkbox" checked={showRejected} onChange={e => setShowRejected(e.target.checked)} style={{ accentColor: C.ok }} /> Show rejected
      </label>
      <span style={{ fontSize: 11, color: C.td, marginLeft: "auto" }}>Drag cards between columns, or use the arrow to advance</span>
    </div>
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}>
      {cols.map(s => {
        const cs = list.filter(c => c.stage === s.k).sort((a, b) => (b.rating || 0) - (a.rating || 0));
        const nextStage = STAGES[STAGES.findIndex(x => x.k === s.k) + 1];
        return <div key={s.k} onDragOver={e => { e.preventDefault(); setOver(s.k); }} onDragLeave={() => setOver(o => o === s.k ? null : o)} onDrop={() => drop(s.k)}
          style={{ flex: "1 0 210px", background: over === s.k ? `${s.c}14` : C.card, border: `1px solid ${over === s.k ? s.c + "66" : C.bdr}`, borderRadius: 14, padding: 10, minHeight: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 10px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.c }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{s.l}</span>
            <span style={{ fontSize: 11, color: C.td, marginLeft: "auto" }}>{cs.length}</span>
          </div>
          {cs.map(c => {
            const nextIv = data.interviews.filter(i => i.candidate_id === c.id && i.date >= t).sort(byWhen)[0];
            const age = daysBetween(c.stage_on || c.applied_on || t, t);
            return <div key={c.id} draggable onDragStart={() => setDrag(c.id)} onDragEnd={() => { setDrag(null); setOver(null); }} onClick={() => open("cand", c)}
              style={{ background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 12, marginBottom: 8, cursor: "grab", opacity: drag === c.id ? .4 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Av n={c.name} s={28} c={s.c} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: C.tm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{jobOf(c.job_id)?.title || "Unknown role"}</div>
                </div>
                {nextStage && nextStage.k !== "rejected" && <button title={`Move to ${nextStage.l}`} onClick={e => { e.stopPropagation(); move(c, nextStage.k); }} style={{ background: "transparent", border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "3px 6px", cursor: "pointer", color: C.tm, fontSize: 12 }}>→</button>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 11, color: C.td }}>
                <span>{[c.experience !== "" && c.experience !== undefined && `${c.experience} yr${+c.experience === 1 ? "" : "s"}`, c.source].filter(Boolean).join(" · ") || " "}</span>
                <Stars v={c.rating || 0} s={11} />
              </div>
              {nextIv && <div style={{ marginTop: 8, fontSize: 11, color: C.pu, display: "flex", alignItems: "center", gap: 5 }}><Ico t="cal" s={12} c={C.pu} />{nextIv.round} · {dfmt(nextIv.date)} {fmt(nextIv.time)}</div>}
              {ACTIVE.includes(c.stage) && age > 7 && <div style={{ marginTop: 6, fontSize: 11, color: C.wn }}>{age} days in stage</div>}
            </div>;
          })}
          {!cs.length && <div style={{ fontSize: 11, color: C.td, textAlign: "center", padding: "20px 0" }}>—</div>}
        </div>;
      })}
    </div>
  </>;
};

// ========== INTERVIEWS ==========
export const Interviews = ({ data, open, jobOf }) => {
  const [f, setF] = useState("upcoming");
  const t = today();
  const list = data.interviews.filter(i => f === "all" || (f === "upcoming" ? i.date >= t : f === "feedback" ? i.date <= t && (!i.result || i.result === "pending") : i.date < t))
    .sort((a, b) => f === "upcoming" ? byWhen(a, b) : byWhen(b, a));

  return <>
    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
      {[["upcoming", "Upcoming"], ["feedback", "Feedback due"], ["past", "Past"], ["all", "All"]].map(([k, l]) => (
        <button key={k} onClick={() => setF(k)} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${f === k ? C.ok + "55" : C.bdr}`, background: f === k ? C.okD : "transparent", color: f === k ? C.ok : C.tm, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
      ))}
    </div>
    {!list.length ? <Card><Empty icon="cal" title="No interviews here" sub="Schedule one from a candidate's profile or with the button above." /></Card>
    : <Card style={{ padding: 12 }}>
      {list.map(i => {
        const c = data.candidates.find(x => x.id === i.candidate_id);
        const [rc, rl] = RESULTS[i.result || "pending"];
        return <Row key={i.id} onClick={() => open("iv", i)} style={{ flexWrap: "wrap" }}>
          <DateChip iso={i.date} />
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{c?.name || "Removed candidate"} <span style={{ fontWeight: 400, color: C.tm }}>· {jobOf(c?.job_id)?.title || "—"}</span></div>
            <div style={{ fontSize: 11, color: C.tm }}>{i.round} round · {fmt(i.time)} · {i.duration || 30} min · {i.mode}{i.interviewer ? ` · ${i.interviewer}` : ""}</div>
          </div>
          {i.rating > 0 && <Stars v={i.rating} s={12} />}
          <Pill c={rc}>{rl}</Pill>
        </Row>;
      })}
    </Card>}
  </>;
};

// ========== OFFERS ==========
export const Offers = ({ data, open, jobOf, save, notify }) => {
  const list = data.candidates.filter(c => c.offer || c.stage === "offer").sort((a, b) => (b.offer?.issued_on || "").localeCompare(a.offer?.issued_on || ""));
  const eligible = data.candidates.filter(c => !c.offer && ["screening", "interview", "offer"].includes(c.stage));
  const hire = async c => {
    try { await save("candidates", moveStage(c, "hired")); notify(`${c.name} marked as hired — complete the onboarding checklist`); }
    catch (e) { notify(e.message, "error"); }
  };

  return <>
    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
      <select style={{ ...inp, width: "auto", minWidth: 240 }} value="" onChange={e => { const c = data.candidates.find(x => x.id === e.target.value); if (c) open("offer", c); }}>
        <option value="">+ Create offer letter for…</option>
        {eligible.map(c => <option key={c.id} value={c.id}>{c.name} — {jobOf(c.job_id)?.title || "Unknown role"}</option>)}
      </select>
    </div>
    {!list.length ? <Card><Empty icon="doc" title="No offers yet" sub="Create an offer letter for a shortlisted candidate. You can print it or save it as PDF." /></Card>
    : <Card style={{ overflow: "hidden" }}><div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ borderBottom: `1px solid ${C.bdr}` }}>{["Candidate", "Designation", "CTC", "Joining", "Status", ""].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.tm, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>)}</tr></thead>
        <tbody>{list.map(c => {
          const o = c.offer || {};
          const [sc, sl] = c.stage === "hired" ? [C.ok, "Hired"] : OFFER_STATUS[o.status] || [C.td, "Not created"];
          return <tr key={c.id} style={{ borderBottom: `1px solid ${C.bdr}` }}>
            <td style={{ padding: "12px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Av n={c.name} s={30} c={sc} /><div><div style={{ fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 11, color: C.td }}>{jobOf(c.job_id)?.title || "—"}</div></div></div></td>
            <td style={{ padding: "12px 16px", color: C.tm }}>{o.designation || "—"}</td>
            <td style={{ padding: "12px 16px" }}>{inr(o.ctc)}</td>
            <td style={{ padding: "12px 16px" }}>{dfmt(o.joining_date)}</td>
            <td style={{ padding: "12px 16px" }}><Pill c={sc}>{sl}</Pill></td>
            <td style={{ padding: "12px 16px" }}><div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <Btn icon="doc" onClick={() => open("offer", c)}>{c.offer ? "Letter" : "Create"}</Btn>
              {o.status === "accepted" && c.stage !== "hired" && <Btn kind="primary" icon="check" onClick={() => hire(c)}>Mark hired</Btn>}
            </div></td>
          </tr>;
        })}</tbody>
      </table>
    </div></Card>}
  </>;
};
