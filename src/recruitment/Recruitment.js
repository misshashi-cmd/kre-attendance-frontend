import React, { useState, useCallback } from "react";
import { C, Ico, Btn, Card } from "../ui";
import { useRecruitment, today } from "./store";
import { stageOf, Empty, downloadCsv } from "./common";
import { JobModal, CandidateModal, InterviewModal, OfferModal } from "./modals";
import { PostModal, ImportApplicantsModal } from "./sources";
import { Overview, Jobs, Pipeline, Interviews, Offers } from "./views";

const TABS = [
  { k: "overview", l: "Overview", i: "chart" },
  { k: "jobs", l: "Job openings", i: "brief" },
  { k: "pipeline", l: "Candidates", i: "users" },
  { k: "interviews", l: "Interviews", i: "cal" },
  { k: "offers", l: "Offers", i: "doc" },
];

export default function Recruitment({ notify }) {
  const { data, mode, error, loading, load, save, saveMany, remove, seed } = useRecruitment();
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null); // { type: "job" | "cand" | "iv" | "offer", item }
  const [jobFilter, setJobFilter] = useState("");

  const close = useCallback(() => setModal(null), []);
  const open = (type, item = {}) => setModal({ type, item });
  const jobOf = id => data.jobs.find(j => j.id === id);
  const m = { save, remove, notify, onClose: close };
  const v = { data, open, jobOf, save, notify, setTab, jobFilter, setJobFilter };

  const exportCsv = () => {
    if (!data.candidates.length) return notify("No candidates to export", "error");
    downloadCsv(`kre-candidates-${today()}.csv`, [
      ["Name", "Email", "Phone", "Job", "Stage", "Source", "Experience (yrs)", "Current CTC", "Expected CTC", "Notice period", "Location", "Rating", "Applied on", "Hired on", "Resume"],
      ...data.candidates.map(c => [c.name, c.email, c.phone, jobOf(c.job_id)?.title, stageOf(c.stage).l, c.source, c.experience, c.current_ctc, c.expected_ctc, c.notice_period, c.location, c.rating, c.applied_on, c.hired_on, c.resume_url]),
    ]);
  };
  const addCandidate = () => data.jobs.length ? open("cand", jobFilter ? { job_id: jobFilter } : {}) : notify("Create a job opening first", "error");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Hiring & Recruitment</div>
          <div style={{ fontSize: 12, color: C.tm, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: mode === "api" ? C.ok : mode === "error" ? C.no : C.wn }} />
            {mode === "api" ? "Synced with server" : mode === "local" ? "Saved on this device only — backend recruitment API not found" : mode === "error" ? "Not connected to the server" : "Connecting…"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn icon="ref" onClick={load}>Refresh</Btn>
          <Btn icon="upload" onClick={() => data.jobs.length ? open("import") : notify("Create a job opening first", "error")}>Import applicants</Btn>
          <Btn icon="dl" onClick={exportCsv}>Export CSV</Btn>
          <Btn icon="brief" onClick={() => open("job")}>New job</Btn>
          <Btn icon="cal" onClick={() => data.candidates.length ? open("iv") : notify("Add a candidate first", "error")}>Schedule interview</Btn>
          <Btn kind="primary" icon="plus" onClick={addCandidate}>Add candidate</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", borderBottom: `1px solid ${C.bdr}` }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: "10px 14px", border: "none", borderBottom: `2px solid ${tab === t.k ? C.ok : "transparent"}`, background: "transparent", color: tab === t.k ? C.ok : C.tm, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontFamily: "inherit" }}>
            <Ico t={t.i} s={15} c={tab === t.k ? C.ok : C.tm} /> {t.l}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 60, color: C.tm }}>Loading...</div>
      : mode === "error" ? (
        <Card><Empty icon="alert" title="Can't reach the server" sub={`${error} Check your internet connection, then press Refresh.`}>
          <Btn kind="primary" icon="ref" onClick={load}>Refresh</Btn>
        </Empty></Card>
      )
      : !data.jobs.length && !data.candidates.length ? (
        <Card><Empty icon="brief" title="Start hiring" sub="Create a job opening, add candidates, schedule interviews and send offer letters — all in one place.">
          <Btn kind="primary" icon="plus" onClick={() => open("job")}>Create first job opening</Btn>
          {mode === "local" && <Btn icon="ref" onClick={() => { seed(); notify("Sample data loaded — delete it any time"); }}>Load sample data</Btn>}
        </Empty></Card>
      ) : <>
        {tab === "overview" && <Overview {...v} />}
        {tab === "jobs" && <Jobs {...v} />}
        {tab === "pipeline" && <Pipeline {...v} />}
        {tab === "interviews" && <Interviews {...v} />}
        {tab === "offers" && <Offers {...v} />}
      </>}

      {modal?.type === "job" && <JobModal {...m} job={modal.item} candidates={data.candidates} />}
      {modal?.type === "cand" && <CandidateModal {...m} cand={modal.item} jobs={data.jobs} interviews={data.interviews}
        onSchedule={iv => open("iv", iv)} onOffer={c => open("offer", c)} />}
      {modal?.type === "iv" && <InterviewModal {...m} iv={modal.item} candidates={data.candidates} jobs={data.jobs} />}
      {modal?.type === "offer" && <OfferModal {...m} cand={modal.item} job={jobOf(modal.item.job_id)} />}
      {modal?.type === "post" && <PostModal {...m} job={data.jobs.find(j => j.id === modal.item.id) || modal.item} />}
      {modal?.type === "import" && <ImportApplicantsModal {...m} saveMany={saveMany} jobs={data.jobs} candidates={data.candidates} defaultJob={modal.item.job_id} />}
    </div>
  );
}
