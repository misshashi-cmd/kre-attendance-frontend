import React from "react";
import { C, Ico } from "../ui";

export const STAGES = [
  { k: "applied", l: "Applied", sh: "Applied", c: C.tm },
  { k: "screening", l: "Screening", sh: "Screen", c: C.in },
  { k: "interview", l: "Interview", sh: "Intvw", c: C.pu },
  { k: "offer", l: "Offer", sh: "Offer", c: C.wn },
  { k: "hired", l: "Hired", sh: "Hired", c: C.ok },
  { k: "rejected", l: "Rejected", sh: "Rejected", c: C.no },
];
export const stageOf = k => STAGES.find(s => s.k === k) || STAGES[0];
export const ACTIVE = ["applied", "screening", "interview", "offer"];

export const JOB_STATUS = { open: [C.ok, "Open"], "on-hold": [C.wn, "On hold"], closed: [C.td, "Closed"] };
export const RESULTS = { pending: [C.tm, "Pending"], selected: [C.ok, "Selected"], rejected: [C.no, "Rejected"], "on-hold": [C.wn, "On hold"] };
export const OFFER_STATUS = { draft: [C.tm, "Draft"], sent: [C.in, "Sent"], accepted: [C.ok, "Accepted"], declined: [C.no, "Declined"] };

export const SOURCES = ["Naukri", "LinkedIn", "Indeed", "Referral", "Walk-in", "Company website", "Campus", "Consultant", "Other"];
export const ROUNDS = ["HR", "Technical", "Managerial", "Final"];
export const MODES = ["In-person", "Video", "Phone"];
export const EMP_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
export const ONBOARDING = [
  "Signed offer letter received",
  "ID proof (Aadhaar / PAN) collected",
  "Educational certificates verified",
  "Relieving letter from previous employer",
  "Bank account details",
  "Passport-size photographs",
  "Employee ID & attendance login created",
  "Induction / orientation done",
];

export const inr = n => n === "" || n === null || n === undefined || isNaN(n) ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;
export const dfmt = iso => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const Pill = ({ c, children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: c, background: `${c}1F`, whiteSpace: "nowrap" }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />{children}
  </span>
);

export const Stars = ({ v = 0, onChange, s = 14 }) => (
  <span style={{ display: "inline-flex", gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} onClick={onChange ? e => { e.stopPropagation(); onChange(i === v ? 0 : i); } : undefined} style={{ cursor: onChange ? "pointer" : "default", display: "inline-flex" }}>
        <Ico t={i <= v ? "starF" : "star"} s={s} c={i <= v ? C.wn : C.td} />
      </span>
    ))}
  </span>
);

export const Empty = ({ icon, title, sub, children }) => (
  <div style={{ textAlign: "center", padding: "48px 20px", color: C.tm }}>
    <Ico t={icon} s={36} c={C.td} />
    <div style={{ fontSize: 14, fontWeight: 600, color: C.tx, marginTop: 12 }}>{title}</div>
    {sub && <div style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
    {children && <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>{children}</div>}
  </div>
);

export const SectionTitle = ({ children, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: C.tm, textTransform: "uppercase", letterSpacing: ".05em" }}>{children}</span>
    {right}
  </div>
);

export const copyText = async text => {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const t = document.createElement("textarea");
    t.value = text; document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy");
    t.remove(); return ok;
  }
};

export const downloadCsv = (name, rows) => {
  const esc = v => { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = rows.map(r => r.map(esc).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

// Google Calendar "add event" link — no API access needed, opens pre-filled in the browser.
export const gcalLink = ({ title, date, time, duration = 30, details = "", location = "" }) => {
  const start = new Date(`${date}T${time || "10:00"}:00`);
  const end = new Date(start.getTime() + duration * 60000);
  const f = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${f(start)}/${f(end)}`, details, location });
  return `https://calendar.google.com/calendar/render?${q}`;
};
