import React, { useRef } from "react";
import { C, Ico, Btn, Modal, Field, Grid, inp, useForm, useSubmit, num, Opts } from "../ui";
import { today, addDays, moveStage } from "./store";
import { STAGES, JOB_STATUS, RESULTS, OFFER_STATUS, SOURCES, ROUNDS, MODES, EMP_TYPES, ONBOARDING, Pill, Stars, SectionTitle, inr, dfmt, gcalLink } from "./common";

// ========== JOB ==========
export const JobModal = ({ job, candidates, save, remove, notify, onClose }) => {
  const [f, , on] = useForm({ title: "", department: "", location: "", employment_type: "Full-time", openings: 1, experience: "", salary: "", status: "open", hiring_manager: "", target_date: "", skills: "", description: "", apply_contact: "", ...job });
  const [busy, run] = useSubmit(notify, onClose);
  const inUse = job?.id && candidates.some(c => c.job_id === job.id);

  const submit = () => {
    if (!f.title.trim()) return notify("Job title is required", "error");
    run(() => save("jobs", { ...f, title: f.title.trim(), openings: num(f.openings) || 1 }), job?.id ? "Job updated" : "Job opening created");
  };
  const del = () => {
    if (inUse) return notify("This job has candidates — set its status to Closed instead", "error");
    if (window.confirm(`Delete "${f.title}"?`)) run(() => remove("jobs", job.id), "Job deleted");
  };

  return (
    <Modal title={job?.id ? "Edit job opening" : "New job opening"} onClose={onClose} footer={<>
      {job?.id && <Btn kind="danger" icon="trash" onClick={del} disabled={busy} style={{ marginRight: "auto" }}>Delete</Btn>}
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" icon="check" onClick={submit} disabled={busy}>Save</Btn>
    </>}>
      <Grid>
        <Field label="Job title *" span><input style={inp} value={f.title} onChange={on("title")} placeholder="e.g. Accounts Executive" autoFocus /></Field>
        <Field label="Department"><input style={inp} value={f.department} onChange={on("department")} placeholder="e.g. Finance" /></Field>
        <Field label="Location"><input style={inp} value={f.location} onChange={on("location")} placeholder="e.g. Jamshedpur" /></Field>
        <Field label="Employment type"><select style={inp} value={f.employment_type} onChange={on("employment_type")}><Opts list={EMP_TYPES} /></select></Field>
        <Field label="No. of openings"><input style={inp} type="number" min="1" value={f.openings} onChange={on("openings")} /></Field>
        <Field label="Experience"><input style={inp} value={f.experience} onChange={on("experience")} placeholder="e.g. 2-5 years" /></Field>
        <Field label="Salary range"><input style={inp} value={f.salary} onChange={on("salary")} placeholder="e.g. ₹4–6 LPA" /></Field>
        <Field label="Hiring manager"><input style={inp} value={f.hiring_manager} onChange={on("hiring_manager")} /></Field>
        <Field label="Target closing date"><input style={inp} type="date" value={f.target_date} onChange={on("target_date")} /></Field>
        <Field label="Status"><select style={inp} value={f.status} onChange={on("status")}><Opts list={Object.entries(JOB_STATUS).map(([k, [, l]]) => [k, l])} /></select></Field>
        <Field label="How to apply (email / WhatsApp)"><input style={inp} value={f.apply_contact} onChange={on("apply_contact")} placeholder="e.g. hr@kregroup.co.in" /></Field>
        <Field label="Key skills" span><input style={inp} value={f.skills} onChange={on("skills")} placeholder="Comma separated" /></Field>
        <Field label="Job description" span><textarea style={{ ...inp, minHeight: 100, resize: "vertical" }} value={f.description} onChange={on("description")} placeholder="Responsibilities, requirements, benefits..." /></Field>
      </Grid>
    </Modal>
  );
};

// Plain-text job post for WhatsApp / LinkedIn / job boards.
export const jobPostText = j => [
  `We're hiring: ${j.title} — KRE Group\n`,
  [j.location && `Location: ${j.location}`, j.employment_type && `Type: ${j.employment_type}`, j.experience && `Experience: ${j.experience}`].filter(Boolean).join(" | "),
  j.salary && `Salary: ${j.salary}`,
  j.openings > 1 && `Openings: ${j.openings}`,
  j.description && `\n${j.description}`,
  j.skills && `\nKey skills: ${j.skills}`,
  j.apply_contact && `\nTo apply, send your CV to ${j.apply_contact}`,
].filter(Boolean).join("\n");

// ========== CANDIDATE ==========
export const CandidateModal = ({ cand, jobs, interviews, save, remove, notify, onClose, onSchedule, onOffer }) => {
  const isNew = !cand?.id;
  const [f, setF, on] = useForm({ name: "", email: "", phone: "", job_id: jobs.find(j => j.status === "open")?.id || "", stage: "applied", source: "", experience: "", current_ctc: "", expected_ctc: "", notice_period: "", location: "", resume_url: "", rating: 0, notes: "", applied_on: today(), onboarding: {}, ...cand });
  const [busy, run] = useSubmit(notify, onClose);
  const ivs = isNew ? [] : interviews.filter(i => i.candidate_id === cand.id).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const submit = () => {
    if (!f.name.trim()) return notify("Candidate name is required", "error");
    if (!f.job_id) return notify("Select the job this candidate applied for", "error");
    let rec = { ...f, name: f.name.trim(), experience: num(f.experience), current_ctc: num(f.current_ctc), expected_ctc: num(f.expected_ctc) };
    rec = isNew ? { ...rec, stage_on: rec.applied_on, stage_history: [{ stage: rec.stage, at: rec.applied_on }], ...(rec.stage === "hired" ? { hired_on: today() } : {}) }
      : moveStage({ ...rec, stage: cand.stage }, rec.stage);
    run(() => save("candidates", rec), isNew ? "Candidate added" : "Candidate updated");
  };
  const del = () => {
    if (!window.confirm(`Delete ${cand.name} and their interview records?`)) return;
    run(async () => {
      for (const i of ivs) await remove("interviews", i.id);
      await remove("candidates", cand.id);
    }, "Candidate deleted");
  };
  const tick = i => setF(p => ({ ...p, onboarding: { ...p.onboarding, [i]: !p.onboarding?.[i] } }));
  const done = ONBOARDING.filter((_, i) => f.onboarding?.[i]).length;

  return (
    <Modal w={720} title={isNew ? "Add candidate" : f.name} onClose={onClose} footer={<>
      {!isNew && <Btn kind="danger" icon="trash" onClick={del} disabled={busy} style={{ marginRight: "auto" }}>Delete</Btn>}
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" icon="check" onClick={submit} disabled={busy}>Save</Btn>
    </>}>
      {!isNew && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {cand.email && <a href={`mailto:${cand.email}`} style={{ textDecoration: "none" }}><Btn icon="mail">Email</Btn></a>}
        {cand.phone && <a href={`tel:${cand.phone}`} style={{ textDecoration: "none" }}><Btn icon="phone">Call</Btn></a>}
        {cand.resume_url && <a href={cand.resume_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}><Btn icon="doc">Resume</Btn></a>}
        <Btn icon="cal" onClick={() => onSchedule({ candidate_id: cand.id })}>Schedule interview</Btn>
        <Btn icon="doc" onClick={() => onOffer(cand)}>{cand.offer ? "View offer" : "Create offer"}</Btn>
      </div>}

      <Grid>
        <Field label="Full name *"><input style={inp} value={f.name} onChange={on("name")} autoFocus={isNew} /></Field>
        <Field label="Applied for *"><select style={inp} value={f.job_id} onChange={on("job_id")}>
          <option value="">Select job…</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}{j.status !== "open" ? ` (${JOB_STATUS[j.status]?.[1] || j.status})` : ""}</option>)}
        </select></Field>
        <Field label="Email"><input style={inp} type="email" value={f.email} onChange={on("email")} /></Field>
        <Field label="Phone"><input style={inp} value={f.phone} onChange={on("phone")} /></Field>
        <Field label="Stage"><select style={inp} value={f.stage} onChange={on("stage")}><Opts list={STAGES.map(s => [s.k, s.l])} /></select></Field>
        <Field label="Source"><select style={inp} value={f.source} onChange={on("source")}><option value="">Select…</option><Opts list={SOURCES} /></select></Field>
        <Field label="Experience (years)"><input style={inp} type="number" min="0" step="0.5" value={f.experience} onChange={on("experience")} /></Field>
        <Field label="Current location"><input style={inp} value={f.location} onChange={on("location")} /></Field>
        <Field label="Current CTC (₹ / year)"><input style={inp} type="number" min="0" value={f.current_ctc} onChange={on("current_ctc")} /></Field>
        <Field label="Expected CTC (₹ / year)"><input style={inp} type="number" min="0" value={f.expected_ctc} onChange={on("expected_ctc")} /></Field>
        <Field label="Notice period"><input style={inp} value={f.notice_period} onChange={on("notice_period")} placeholder="e.g. 30 days" /></Field>
        <Field label="Applied on"><input style={inp} type="date" value={f.applied_on} onChange={on("applied_on")} /></Field>
        <Field label="Resume link" span><input style={inp} value={f.resume_url} onChange={on("resume_url")} placeholder="Google Drive / Dropbox link" /></Field>
        <Field label="Overall rating" span><Stars v={f.rating || 0} s={20} onChange={v => setF(p => ({ ...p, rating: v }))} /></Field>
        <Field label="Notes" span><textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={f.notes} onChange={on("notes")} placeholder="Screening notes, salary discussion, red flags..." /></Field>
      </Grid>

      {ivs.length > 0 && <div style={{ marginTop: 22 }}>
        <SectionTitle>Interviews</SectionTitle>
        {ivs.map(i => <div key={i.id} onClick={() => onSchedule(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.sf, borderRadius: 10, border: `1px solid ${C.bdr}`, marginBottom: 6, cursor: "pointer", fontSize: 12 }}>
          <Ico t="cal" s={14} c={C.tm} />
          <span style={{ fontWeight: 600 }}>{i.round}</span>
          <span style={{ color: C.tm }}>{dfmt(i.date)} {i.time} · {i.interviewer || "—"}</span>
          <span style={{ marginLeft: "auto" }}><Pill c={RESULTS[i.result || "pending"][0]}>{RESULTS[i.result || "pending"][1]}</Pill></span>
        </div>)}
      </div>}

      {(f.stage === "hired" || cand?.stage === "hired") && <div style={{ marginTop: 22 }}>
        <SectionTitle right={<span style={{ fontSize: 12, color: done === ONBOARDING.length ? C.ok : C.tm }}>{done}/{ONBOARDING.length} done</span>}>Onboarding checklist</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 6 }}>
          {ONBOARDING.map((t, i) => <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.sf, borderRadius: 10, border: `1px solid ${C.bdr}`, fontSize: 12, cursor: "pointer", color: f.onboarding?.[i] ? C.tm : C.tx, textDecoration: f.onboarding?.[i] ? "line-through" : "none" }}>
            <input type="checkbox" checked={!!f.onboarding?.[i]} onChange={() => tick(i)} style={{ accentColor: C.ok }} />{t}
          </label>)}
        </div>
      </div>}
    </Modal>
  );
};

// ========== INTERVIEW ==========
export const InterviewModal = ({ iv, candidates, jobs, save, remove, notify, onClose }) => {
  const isNew = !iv?.id;
  const [f, setF, on] = useForm({ candidate_id: "", round: "HR", date: addDays(today(), 1), time: "11:00", duration: 30, interviewer: "", mode: "In-person", venue: "", result: "pending", rating: 0, feedback: "", ...iv });
  const [busy, run] = useSubmit(notify, onClose);
  const cand = candidates.find(c => c.id === f.candidate_id);
  const job = jobs.find(j => j.id === cand?.job_id);
  const pick = candidates.filter(c => !["hired", "rejected"].includes(c.stage) || c.id === f.candidate_id);

  const submit = () => {
    if (!f.candidate_id) return notify("Select a candidate", "error");
    if (!f.date || !f.time) return notify("Date and time are required", "error");
    run(async () => {
      await save("interviews", { ...f, duration: num(f.duration) || 30 });
      // Scheduling the first interview moves an early-stage candidate into the Interview column.
      if (isNew && cand && ["applied", "screening"].includes(cand.stage)) await save("candidates", moveStage(cand, "interview"));
    }, isNew ? "Interview scheduled" : "Interview updated");
  };
  const del = () => window.confirm("Delete this interview?") && run(() => remove("interviews", iv.id), "Interview deleted");
  const cal = cand && f.date && gcalLink({ title: `Interview: ${cand.name} — ${job?.title || ""} (${f.round})`, date: f.date, time: f.time, duration: num(f.duration) || 30, location: f.venue, details: [`Candidate: ${cand.name}`, cand.phone && `Phone: ${cand.phone}`, cand.email && `Email: ${cand.email}`, cand.resume_url && `Resume: ${cand.resume_url}`, `Interviewer: ${f.interviewer}`, `Mode: ${f.mode}`].filter(Boolean).join("\n") });

  return (
    <Modal title={isNew ? "Schedule interview" : "Interview details & feedback"} onClose={onClose} footer={<>
      {!isNew && <Btn kind="danger" icon="trash" onClick={del} disabled={busy} style={{ marginRight: "auto" }}>Delete</Btn>}
      {cal && <a href={cal} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}><Btn icon="cal">Add to Google Calendar</Btn></a>}
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" icon="check" onClick={submit} disabled={busy}>Save</Btn>
    </>}>
      <Grid>
        <Field label="Candidate *" span><select style={inp} value={f.candidate_id} onChange={on("candidate_id")}>
          <option value="">Select candidate…</option>
          {pick.map(c => <option key={c.id} value={c.id}>{c.name} — {jobs.find(j => j.id === c.job_id)?.title || "Unknown role"}</option>)}
        </select></Field>
        <Field label="Round"><select style={inp} value={f.round} onChange={on("round")}><Opts list={ROUNDS} /></select></Field>
        <Field label="Interviewer"><input style={inp} value={f.interviewer} onChange={on("interviewer")} /></Field>
        <Field label="Date *"><input style={inp} type="date" value={f.date} onChange={on("date")} /></Field>
        <Field label="Time *"><input style={inp} type="time" value={f.time} onChange={on("time")} /></Field>
        <Field label="Duration (min)"><input style={inp} type="number" min="5" step="5" value={f.duration} onChange={on("duration")} /></Field>
        <Field label="Mode"><select style={inp} value={f.mode} onChange={on("mode")}><Opts list={MODES} /></select></Field>
        <Field label={f.mode === "Video" ? "Meeting link" : f.mode === "Phone" ? "Number to call" : "Venue"} span><input style={inp} value={f.venue} onChange={on("venue")} /></Field>
      </Grid>
      {!isNew && <div style={{ marginTop: 20 }}>
        <SectionTitle>Feedback</SectionTitle>
        <Grid>
          <Field label="Result"><select style={inp} value={f.result} onChange={on("result")}><Opts list={Object.entries(RESULTS).map(([k, [, l]]) => [k, l])} /></select></Field>
          <Field label="Rating"><div style={{ paddingTop: 8 }}><Stars v={f.rating || 0} s={20} onChange={v => setF(p => ({ ...p, rating: v }))} /></div></Field>
          <Field label="Comments" span><textarea style={{ ...inp, minHeight: 90, resize: "vertical" }} value={f.feedback} onChange={on("feedback")} placeholder="Strengths, concerns, recommendation..." /></Field>
        </Grid>
      </div>}
    </Modal>
  );
};

// ========== OFFER LETTER ==========
export const OfferModal = ({ cand, job, save, notify, onClose }) => {
  const [f, , on] = useForm({ designation: job?.title || "", department: job?.department || "", location: job?.location || "", ctc: cand.expected_ctc || "", joining_date: addDays(today(), 30), reporting_to: job?.hiring_manager || "", probation_months: 6, notice_period: "30 days", accept_by: addDays(today(), 7), signatory: "", signatory_title: "HR Manager", issued_on: today(), status: "draft", ...cand.offer });
  const [busy, run] = useSubmit(notify, onClose);
  const ref = useRef(null);
  const first = cand.name.split(" ")[0];

  const submit = () => {
    if (!f.designation || !f.ctc || !f.joining_date) return notify("Designation, CTC and joining date are required", "error");
    const moved = ["applied", "screening", "interview"].includes(cand.stage) ? moveStage(cand, "offer") : cand;
    run(() => save("candidates", { ...moved, offer: { ...f, ctc: num(f.ctc), probation_months: num(f.probation_months) } }), "Offer saved");
  };
  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return notify("Allow pop-ups to print the offer letter", "error");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Offer Letter</title><style>@page{margin:18mm}body{margin:0;background:#fff}</style></head><body>${ref.current.outerHTML}</body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  const P = ({ children, style }) => <p style={{ margin: "0 0 12px", ...style }}>{children}</p>;
  const row = (k, v) => <tr><td style={{ padding: "6px 10px", border: "1px solid #D5D9E0", fontWeight: 600, width: "40%" }}>{k}</td><td style={{ padding: "6px 10px", border: "1px solid #D5D9E0" }}>{v}</td></tr>;

  return (
    <Modal w={1080} title={`Offer letter — ${cand.name}`} onClose={onClose} footer={<>
      <Btn icon="print" onClick={print}>Print / Save as PDF</Btn>
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" icon="check" onClick={submit} disabled={busy}>Save offer</Btn>
    </>}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px", minWidth: 260 }}>
          <Grid min={140}>
            <Field label="Designation *" span><input style={inp} value={f.designation} onChange={on("designation")} /></Field>
            <Field label="Department"><input style={inp} value={f.department} onChange={on("department")} /></Field>
            <Field label="Work location"><input style={inp} value={f.location} onChange={on("location")} /></Field>
            <Field label="Annual CTC (₹) *"><input style={inp} type="number" min="0" value={f.ctc} onChange={on("ctc")} /></Field>
            <Field label="Joining date *"><input style={inp} type="date" value={f.joining_date} onChange={on("joining_date")} /></Field>
            <Field label="Reporting to"><input style={inp} value={f.reporting_to} onChange={on("reporting_to")} /></Field>
            <Field label="Probation (months)"><input style={inp} type="number" min="0" value={f.probation_months} onChange={on("probation_months")} /></Field>
            <Field label="Notice period"><input style={inp} value={f.notice_period} onChange={on("notice_period")} /></Field>
            <Field label="Accept by"><input style={inp} type="date" value={f.accept_by} onChange={on("accept_by")} /></Field>
            <Field label="Letter date"><input style={inp} type="date" value={f.issued_on} onChange={on("issued_on")} /></Field>
            <Field label="Signatory name"><input style={inp} value={f.signatory} onChange={on("signatory")} /></Field>
            <Field label="Signatory title"><input style={inp} value={f.signatory_title} onChange={on("signatory_title")} /></Field>
            <Field label="Offer status" span><select style={inp} value={f.status} onChange={on("status")}><Opts list={Object.entries(OFFER_STATUS).map(([k, [, l]]) => [k, l])} /></select></Field>
          </Grid>
        </div>
        <div style={{ flex: "1.4 1 420px", minWidth: 0, background: "#E5E7EB", borderRadius: 12, padding: 12, maxHeight: "70vh", overflowY: "auto" }}>
          <div ref={ref} style={{ background: "#fff", color: "#1F2937", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 13, lineHeight: 1.6, padding: "36px 40px", maxWidth: 720, margin: "0 auto", boxSizing: "border-box" }}>
            <div style={{ borderBottom: "2px solid #0B0F1A", paddingBottom: 10, marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: ".02em", color: "#0B0F1A" }}>KRE Group</div>
              <div style={{ fontSize: 12, color: "#4B5563" }}>{dfmt(f.issued_on)}</div>
            </div>
            <P>To,<br /><strong>{cand.name}</strong>{cand.location && <><br />{cand.location}</>}{cand.email && <><br />{cand.email}</>}</P>
            <P style={{ fontWeight: 700 }}>Subject: Offer of Employment — {f.designation || "…"}</P>
            <P>Dear {first},</P>
            <P>We are pleased to offer you the position of <strong>{f.designation || "…"}</strong>{f.department && <> in the {f.department} department</>} at KRE Group{f.location && <>, based at {f.location}</>}. We were impressed with your background and believe you will be a valuable addition to our team.</P>
            <table style={{ borderCollapse: "collapse", width: "100%", margin: "6px 0 16px", fontSize: 12.5 }}><tbody>
              {row("Designation", f.designation || "—")}
              {row("Annual CTC", <>{inr(f.ctc)}{f.ctc ? <span style={{ color: "#6B7280" }}> (approx. {inr(Math.round(f.ctc / 12))} per month)</span> : null}</>)}
              {row("Date of joining", dfmt(f.joining_date))}
              {f.reporting_to && row("Reporting to", f.reporting_to)}
              {+f.probation_months > 0 && row("Probation period", `${f.probation_months} months`)}
              {f.notice_period && row("Notice period", f.notice_period)}
            </tbody></table>
            <P>The detailed salary break-up and terms of employment will be shared with your appointment letter on joining. This offer is subject to satisfactory verification of your documents and references.</P>
            <P>Please report to the office on your date of joining with copies of your ID proof (Aadhaar / PAN), educational certificates, relieving letter from your previous employer, bank details and two passport-size photographs.</P>
            <P>Kindly sign and return a copy of this letter as a token of your acceptance{f.accept_by && <> by <strong>{dfmt(f.accept_by)}</strong></>}.</P>
            <P>We look forward to welcoming you to KRE Group.</P>
            <div style={{ marginTop: 28 }}>Sincerely,<div style={{ height: 36 }} /><strong>{f.signatory || "________________"}</strong><br />{f.signatory_title}<br />KRE Group</div>
            <div style={{ marginTop: 34, paddingTop: 14, borderTop: "1px dashed #9CA3AF", fontSize: 12 }}>
              <strong>Acceptance</strong><br />I accept the above offer and will join on {dfmt(f.joining_date)}.
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30 }}><span>Signature: ____________________</span><span>Date: ____________</span></div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
