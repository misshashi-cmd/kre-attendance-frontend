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

export const SOURCES = ["Naukri", "WorkIndia", "Apna", "Indeed", "LinkedIn", "Referral", "Walk-in", "Company website", "Campus", "Consultant", "Other"];
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

// ---------- job details as each job site wants them ----------
const n = v => v === "" || v === null || v === undefined || isNaN(v) ? null : Number(v);
const lakhs = monthly => +((monthly * 12) / 1e5).toFixed(1);

// "2–5 years", "2+ years", "Fresher" — falls back to the old free-text field.
export const expText = j => {
  const lo = n(j.exp_min), hi = n(j.exp_max);
  if (lo === null && hi === null) return j.experience || "";
  if (!lo && !hi) return "Fresher";
  if (hi === null) return `${lo}+ years`;
  return `${lo || 0}–${hi} years`;
};
// "₹15,000–25,000 / month" — falls back to the old free-text field.
export const salText = j => {
  const lo = n(j.sal_min), hi = n(j.sal_max);
  if (lo === null && hi === null) return j.salary || "";
  const f = x => x.toLocaleString("en-IN");
  return `₹${lo !== null && hi !== null ? `${f(lo)}–${f(hi)}` : f(lo ?? hi)} / month`;
};
// "₹1.8–3 Lacs P.A." (Naukri style)
export const salLakhs = j => {
  const lo = n(j.sal_min), hi = n(j.sal_max);
  if (lo === null && hi === null) return j.salary || "";
  return `₹${lo !== null && hi !== null ? `${lakhs(lo)}–${lakhs(hi)}` : lakhs(lo ?? hi)} Lacs P.A.`;
};

const desc = j => [j.description, j.skills && `Key skills: ${j.skills}`, j.education && `Education: ${j.education}`, j.shift && `Shift / timing: ${j.shift}`].filter(Boolean).join("\n\n");
const place = j => [j.area, j.location].filter(Boolean).join(", ");

// Each site's "post a job" page and the fields its form asks for, in its own wording.
export const PORTALS = [
  { k: "naukri", l: "Naukri", url: "https://recruit.naukri.com/", fields: j => [
    ["Job title", j.title], ["Employment type", j.employment_type], ["Work experience", expText(j)],
    ["Annual salary (CTC)", salLakhs(j)], ["Location", j.location], ["Key skills", j.skills],
    ["Education", j.education], ["Vacancies", j.openings], ["Job description", desc(j)],
  ] },
  { k: "workindia", l: "WorkIndia", url: "https://www.workindia.in/employers/", fields: j => [
    ["Job title", j.title], ["Monthly salary", salText(j)], ["City", j.location], ["Area / locality", j.area],
    ["Shift / timing", j.shift], ["Experience", expText(j)], ["Education", j.education], ["Openings", j.openings],
    ["Job description", desc(j)],
  ] },
  { k: "indeed", l: "Indeed", url: "https://employers.indeed.com/", fields: j => [
    ["Job title", j.title], ["Job location", place(j)], ["Job type", j.employment_type], ["Pay", salText(j)],
    ["Number of people to hire", j.openings], ["Experience", expText(j)], ["Job description", desc(j)],
  ] },
  { k: "linkedin", l: "LinkedIn", url: "https://www.linkedin.com/talent/post-a-job", fields: j => [
    ["Job title", j.title], ["Company", "KRE Group"], ["Job location", place(j)], ["Employment type", j.employment_type],
    ["Description", [desc(j), expText(j) && `Experience: ${expText(j)}`, salText(j) && `Salary: ${salText(j)}`, j.apply_contact && `To apply: ${j.apply_contact}`].filter(Boolean).join("\n\n")],
  ] },
];
