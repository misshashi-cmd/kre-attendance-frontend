import React from "react";
import { C, Ico } from "../ui";

export { Pill, Empty, SectionTitle, inr, dfmt, copyText, downloadCsv } from "../ui";

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

export const Stars = ({ v = 0, onChange, s = 14 }) => (
  <span style={{ display: "inline-flex", gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} onClick={onChange ? e => { e.stopPropagation(); onChange(i === v ? 0 : i); } : undefined} style={{ cursor: onChange ? "pointer" : "default", display: "inline-flex" }}>
        <Ico t={i <= v ? "starF" : "star"} s={s} c={i <= v ? C.wn : C.td} />
      </span>
    ))}
  </span>
);


// Google Calendar "add event" link — no API access needed, opens pre-filled in the browser.
export const gcalLink = ({ title, date, time, duration = 30, details = "", location = "" }) => {
  const start = new Date(`${date}T${time || "10:00"}:00`);
  const end = new Date(start.getTime() + duration * 60000);
  const f = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${f(start)}/${f(end)}`, details, location });
  return `https://calendar.google.com/calendar/render?${q}`;
};
