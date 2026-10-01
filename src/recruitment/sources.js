import React, { useState } from "react";
import { C, Ico, Btn, Modal, Field, Grid, inp, useSubmit, Opts, Pill, copyText, parseCsv } from "../ui";
import { today } from "./store";
import { PORTALS, SOURCES, dfmt } from "./common";

// ========== POST ON JOB SITES ==========
// Naukri / WorkIndia / Indeed / LinkedIn have no public posting API for regular accounts,
// so this lays out each site's form fields ready to copy, opens the site, and records where
// the job is advertised.
export const PostModal = ({ job, save, notify, onClose }) => {
  const [tab, setTab] = useState(PORTALS[0].k);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [postings, setPostings] = useState(job.postings || {});
  const portal = PORTALS.find(p => p.k === tab);
  const fields = portal.fields(job).filter(([, v]) => v !== "" && v !== null && v !== undefined);
  const missing = portal.fields(job).filter(([, v]) => v === "" || v === null || v === undefined).map(([l]) => l);
  const posted = postings[tab];

  const copy = async (text, what) => (await copyText(String(text))) ? notify(`${what} copied`) : notify("Could not copy", "error");
  const persist = async next => {
    setBusy(true);
    try { await save("jobs", { ...job, postings: next }); setPostings(next); }
    catch (e) { notify(e.message, "error"); }
    setBusy(false);
  };
  const markPosted = () => persist({ ...postings, [tab]: { on: today(), url: link.trim() } }).then(() => { setLink(""); notify(`Marked as posted on ${portal.l}`); });
  const unmark = () => persist(Object.fromEntries(Object.entries(postings).filter(([k]) => k !== tab)));

  return (
    <Modal w={760} title={`Post "${job.title}" on job sites`} onClose={onClose} footer={<Btn onClick={onClose}>Close</Btn>}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {PORTALS.map(p => (
          <button key={p.k} onClick={() => setTab(p.k)} style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${tab === p.k ? C.ok + "66" : C.bdr}`, background: tab === p.k ? C.okD : "transparent", color: tab === p.k ? C.ok : C.tm, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {p.l}{postings[p.k] && <Ico t="check" s={13} c={C.ok} />}
          </button>
        ))}
      </div>

      <ol style={{ fontSize: 13, color: C.tm, margin: "0 0 14px", paddingLeft: 18, lineHeight: 1.7 }}>
        <li><a href={portal.url} target="_blank" rel="noopener noreferrer" style={{ color: C.in }}>Open {portal.l}</a> in a new tab, log in with your company account, and start a new job post.</li>
        <li>Copy each field below into the matching box on {portal.l}.</li>
        <li>After publishing, click <strong style={{ color: C.tx }}>Mark as posted</strong> so the team knows where this job is advertised.</li>
      </ol>

      {missing.length > 0 && <div style={{ fontSize: 12, color: C.wn, background: C.wnD, padding: "8px 12px", borderRadius: 10, marginBottom: 12 }}>
        {portal.l} also asks for: {missing.join(", ")}. Add them with <strong>Edit</strong> on the job, or fill them in on {portal.l}.
      </div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {fields.map(([label, value]) => (
          <div key={label} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: C.td, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 160, overflowY: "auto" }}>{String(value)}</div>
            </div>
            <Btn icon="copy" style={{ padding: "6px 10px" }} onClick={() => copy(value, label)}>Copy</Btn>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <Btn icon="copy" onClick={() => copy(fields.map(([l, v]) => `${l}: ${v}`).join("\n\n"), "All fields")}>Copy all fields</Btn>
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.bdr}` }}>
        {posted ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Pill c={C.ok}>Posted on {portal.l} · {dfmt(posted.on)}</Pill>
            {posted.url && <a href={posted.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.in }}>View listing</a>}
            <Btn onClick={unmark} disabled={busy} style={{ marginLeft: "auto" }}>Remove</Btn>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...inp, flex: "1 1 260px" }} value={link} onChange={e => setLink(e.target.value)} placeholder={`Link to the live ${portal.l} listing (optional)`} />
            <Btn kind="primary" icon="check" onClick={markPosted} disabled={busy}>Mark as posted</Btn>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ========== IMPORT APPLICANTS (Naukri / WorkIndia / any Excel) ==========
const norm = h => String(h || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const FIELDS = {
  name: ["name", "candidate name", "full name", "applicant name", "candidate", "jobseeker name"],
  phone: ["phone", "mobile", "mobile no", "mobile number", "phone no", "phone number", "contact", "contact no", "contact number", "mob", "whatsapp", "mobile phone"],
  email: ["email", "email id", "e mail", "email address", "mail id"],
  location: ["current location", "location", "city", "area", "locality", "current city"],
  experience: ["total experience", "experience", "work experience", "exp", "total exp", "years of experience", "experience in years"],
  current_ctc: ["current ctc", "ctc", "annual salary", "current salary", "present salary", "salary", "current annual salary", "current salary per month"],
  expected_ctc: ["expected ctc", "expected salary", "expected salary per month"],
  notice_period: ["notice period", "notice"],
  resume_url: ["resume", "resume link", "cv", "cv link", "resume url"],
  company: ["current company", "current company name", "company", "employer", "current employer", "last company"],
  designation: ["current designation", "designation", "job title", "role", "current role"],
  skills: ["key skills", "skills"],
  education: ["education", "qualification", "highest qualification", "highest education"],
};
// Last resort for headers like "Candidate's Mobile Number".
const KEYWORDS = { phone: ["mobile", "phone", "contact"], email: ["email", "mail"], name: ["name"] };

const mapHeader = row => {
  const hs = row.map(norm), map = {};
  Object.entries(FIELDS).forEach(([k, syn]) => { const i = hs.findIndex(h => syn.includes(h)); if (i >= 0) map[k] = i; });
  Object.entries(KEYWORDS).forEach(([k, kws]) => {
    if (map[k] !== undefined) return;
    const i = hs.findIndex((h, idx) => !Object.values(map).includes(idx) && kws.some(w => h.includes(w)) && !/company|college|institute|father|employer|file/.test(h));
    if (i >= 0) map[k] = i;
  });
  return map;
};

// "3 Year(s) 6 Month(s)", "3.5 yrs", "Fresher" -> 3.5 / 0
const parseExp = v => {
  const s = String(v || "").toLowerCase();
  if (!s.trim()) return "";
  if (/fresh/.test(s)) return 0;
  const y = s.match(/(\d+(?:\.\d+)?)\s*(?:y|yr|year)/), m = s.match(/(\d+)\s*(?:m|mon|month)/);
  if (y || m) return +((y ? +y[1] : 0) + (m ? +m[1] / 12 : 0)).toFixed(1);
  const n = s.match(/\d+(?:\.\d+)?/);
  return n ? +n[0] : "";
};
// "Rs. 4.5 Lacs", "4,50,000", "1.2 Cr", "18k", "15000" (monthly column) -> yearly ₹
const parseMoney = (v, header) => {
  const s = String(v || "").toLowerCase().replace(/,/g, "");
  const m = s.match(/\d+(?:\.\d+)?/);
  if (!m) return "";
  let n = +m[0];
  if (/cr/.test(s)) n *= 1e7;
  else if (/lac|lakh|lpa|\bl\b/.test(s)) n *= 1e5;
  else if (/\bk\b|thousand/.test(s)) n *= 1e3;
  else if (n < 100) n *= 1e5; // "4.5" in a CTC column means lakhs
  if (/month/.test(norm(header)) || /month|\/m|pm\b/.test(s)) n *= 12;
  return Math.round(n);
};
const digits = p => String(p || "").replace(/\D/g, "").slice(-10);

// SheetJS reads .xlsx/.xls in the browser; loaded only when someone picks an Excel file.
const XLSX_URLS = [
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
];
const loadScript = src => new Promise((res, rej) => {
  const s = document.createElement("script");
  s.src = src; s.onload = res; s.onerror = () => { s.remove(); rej(); };
  document.head.appendChild(s);
});
const loadXlsx = async () => {
  for (const u of XLSX_URLS) {
    if (window.XLSX) break;
    try { await loadScript(u); } catch {}
  }
  if (!window.XLSX) throw new Error("Couldn't load the Excel reader. Check your internet connection, or save the file as CSV and try again.");
  return window.XLSX;
};

export const ImportApplicantsModal = ({ jobs, candidates, defaultJob, saveMany, notify, onClose }) => {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [paste, setPaste] = useState("");
  const [jobId, setJobId] = useState(defaultJob || jobs.find(j => j.status === "open")?.id || "");
  const [source, setSource] = useState("Naukri");
  const [busy, run] = useSubmit(notify, onClose);

  // The header row is the one (within the first 15) that names the most columns we know.
  let hi = -1, map = {}, best = 0;
  rows.slice(0, 15).forEach((r, i) => { const m = mapHeader(r); const n = Object.keys(m).length; if (m.name !== undefined && n > best) { best = n; hi = i; map = m; } });
  const header = hi >= 0 ? rows[hi] : [];
  const parsed = hi < 0 ? [] : rows.slice(hi + 1).map(r => {
    const g = k => map[k] !== undefined ? String(r[map[k]] ?? "").trim() : "";
    const notes = [
      (g("designation") || g("company")) && `Current: ${[g("designation"), g("company")].filter(Boolean).join(" at ")}`,
      g("skills") && `Skills: ${g("skills")}`,
      g("education") && `Education: ${g("education")}`,
    ].filter(Boolean).join("\n");
    return {
      name: g("name"), phone: digits(g("phone")) || g("phone"), email: g("email").toLowerCase(), location: g("location"),
      experience: parseExp(g("experience")), current_ctc: parseMoney(g("current_ctc"), header[map.current_ctc]),
      expected_ctc: parseMoney(g("expected_ctc"), header[map.expected_ctc]), notice_period: g("notice_period"),
      resume_url: /^https?:\/\//.test(g("resume_url")) ? g("resume_url") : "", notes,
    };
  }).filter(r => r.name);

  const knownPhones = new Set(candidates.map(c => digits(c.phone)).filter(p => p.length === 10));
  const knownEmails = new Set(candidates.map(c => (c.email || "").toLowerCase()).filter(Boolean));
  const fresh = parsed.filter(r => {
    const p = digits(r.phone);
    if ((p.length === 10 && knownPhones.has(p)) || (r.email && knownEmails.has(r.email))) return false;
    if (p.length === 10) knownPhones.add(p);
    if (r.email) knownEmails.add(r.email);
    return true;
  });

  const file = async e => {
    const fl = e.target.files?.[0];
    if (!fl) return;
    setFileName(fl.name); setPaste("");
    try {
      if (/\.xlsx?$/i.test(fl.name)) {
        const XLSX = await loadXlsx();
        const wb = XLSX.read(await fl.arrayBuffer(), { type: "array" });
        setRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" }));
      } else setRows(parseCsv(await fl.text()));
    } catch (err) { notify(err.message, "error"); setRows([]); }
  };
  const onPaste = v => {
    setPaste(v); setFileName("");
    setRows(v.includes("\t") ? v.split(/\r?\n/).filter(l => l.trim()).map(l => l.split("\t")) : parseCsv(v));
  };

  const submit = () => {
    if (!jobId) return notify("Choose which job these applicants applied for", "error");
    run(async () => {
      const t = today();
      const { skipped } = await saveMany("candidates", fresh.map(r => ({ ...r, job_id: jobId, source, stage: "applied", applied_on: t, stage_on: t, stage_history: [{ stage: "applied", at: t }], rating: 0, onboarding: {} })));
      if (skipped) notify(`${fresh.length - skipped} imported, ${skipped} already existed`);
    }, `${fresh.length} applicant${fresh.length === 1 ? "" : "s"} imported into Applied`);
  };

  return (
    <Modal w={780} title="Import applicants" onClose={onClose} footer={<>
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" icon="upload" onClick={submit} disabled={busy || !fresh.length}>Import {fresh.length || ""} applicant{fresh.length === 1 ? "" : "s"}</Btn>
    </>}>
      <ol style={{ fontSize: 13, color: C.tm, margin: "0 0 14px", paddingLeft: 18, lineHeight: 1.7 }}>
        <li>On Naukri or WorkIndia, open the job's applicants and use <strong style={{ color: C.tx }}>Download / Export to Excel</strong>.</li>
        <li>Choose that file below. Excel (.xlsx, .xls) and CSV both work. You can also copy the cells in Excel and paste them in the box.</li>
        <li>Pick the job and where the applicants came from, check the preview, and import.</li>
      </ol>
      <Grid>
        <Field label="Applied for *"><select style={inp} value={jobId} onChange={e => setJobId(e.target.value)}>
          <option value="">Select job…</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select></Field>
        <Field label="Source"><select style={inp} value={source} onChange={e => setSource(e.target.value)}><Opts list={SOURCES} /></select></Field>
      </Grid>
      <div style={{ marginTop: 12 }}>
        <input type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={file} style={{ ...inp, padding: 8 }} />
        {fileName && <div style={{ fontSize: 11, color: C.td, marginTop: 4 }}>Loaded {fileName}</div>}
      </div>
      <textarea style={{ ...inp, minHeight: 90, resize: "vertical", marginTop: 10, fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12 }} value={paste} onChange={e => onPaste(e.target.value)}
        placeholder={"…or paste cells copied from Excel here\nName\tMobile\tEmail\tTotal Experience\tCurrent CTC\tCurrent Location"} />

      {rows.length > 0 && <div style={{ marginTop: 14 }}>
        {hi < 0 ? <div style={{ fontSize: 12, color: C.no }}>Couldn't find a column for the candidate's name. Make sure the sheet has a heading row such as Name, Mobile, Email.</div>
        : <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {[["name", "Name"], ["phone", "Phone"], ["email", "Email"], ["experience", "Experience"], ["current_ctc", "Current CTC"], ["expected_ctc", "Expected CTC"], ["location", "Location"], ["notice_period", "Notice"], ["company", "Company"], ["skills", "Skills"]].map(([k, l]) =>
              <Pill key={k} c={map[k] !== undefined ? C.ok : C.td}>{l}</Pill>)}
          </div>
          <div style={{ fontSize: 12, color: C.tm }}>
            Found <strong style={{ color: C.tx }}>{parsed.length}</strong> applicant{parsed.length === 1 ? "" : "s"}
            {parsed.length !== fresh.length && <> — <span style={{ color: C.wn }}>{parsed.length - fresh.length} skipped because their phone or email is already in Hiring</span></>}.
          </div>
          <div style={{ marginTop: 8, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr>{["Name", "Phone", "Experience", "Current CTC", "Expected CTC", "Location"].map(h => <th key={h} style={{ textAlign: "left", color: C.td, fontWeight: 600, padding: "6px 8px", borderBottom: `1px solid ${C.bdr}` }}>{h}</th>)}</tr></thead>
              <tbody>{fresh.slice(0, 6).map((r, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.bdr}` }}>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: "6px 8px", color: C.tm }}>{r.phone || "—"}</td>
                <td style={{ padding: "6px 8px", color: C.tm }}>{r.experience !== "" ? `${r.experience} yrs` : "—"}</td>
                <td style={{ padding: "6px 8px", color: C.tm }}>{r.current_ctc ? `₹${r.current_ctc.toLocaleString("en-IN")}` : "—"}</td>
                <td style={{ padding: "6px 8px", color: C.tm }}>{r.expected_ctc ? `₹${r.expected_ctc.toLocaleString("en-IN")}` : "—"}</td>
                <td style={{ padding: "6px 8px", color: C.tm }}>{r.location || "—"}</td>
              </tr>)}</tbody>
            </table>
            {fresh.length > 6 && <div style={{ fontSize: 12, color: C.td, marginTop: 6 }}>…and {fresh.length - 6} more</div>}
          </div>
        </>}
      </div>}
    </Modal>
  );
};

export const PostedChips = ({ job }) => {
  const ps = Object.entries(job.postings || {});
  if (!ps.length) return null;
  return <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {ps.map(([k, v]) => <Pill key={k} c={C.in}>{PORTALS.find(p => p.k === k)?.l || k} · {dfmt(v.on)}</Pill>)}
  </div>;
};
