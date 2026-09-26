import { useCallback } from "react";
import { useCollections, uid, today, addDays } from "../collections";

// Recruitment data: /api/recruitment/{jobs,candidates,interviews}, or localStorage
// when the backend doesn't have those routes (see collections.js).
export { uid, today, addDays, daysBetween } from "../collections";

const COLS = ["jobs", "candidates", "interviews"];

// Returns the candidate moved to `stage`, recording when it happened.
export const moveStage = (c, stage) => c.stage === stage ? c : {
  ...c, stage, stage_on: today(),
  stage_history: [...(c.stage_history || []), { stage, at: today() }],
  ...(stage === "hired" ? { hired_on: today() } : {}),
};

export const useRecruitment = () => {
  const { data, setData, mode, loading, load, save, remove } = useCollections("recruitment", COLS, "kre_recruitment_v1");

  // Demo data so HR can try the tools before real candidates arrive (local mode only).
  const seed = useCallback(() => {
    const t = today(), j1 = uid(), j2 = uid(), j3 = uid();
    const c = (name, job_id, stage, extra) => ({ id: uid(), name, job_id, stage, created_on: addDays(t, -12), applied_on: addDays(t, -12), stage_on: addDays(t, -3), stage_history: [{ stage: "applied", at: addDays(t, -12) }, ...(stage !== "applied" ? [{ stage, at: addDays(t, -3) }] : [])], ...extra });
    const cands = [
      c("Ananya Sharma", j1, "applied", { email: "ananya@example.com", phone: "98xxxxxx01", source: "Naukri", experience: 3, current_ctc: 420000, expected_ctc: 550000, notice_period: "30 days", location: "Jamshedpur", rating: 3 }),
      c("Rohit Kumar", j1, "screening", { email: "rohit@example.com", phone: "98xxxxxx02", source: "Referral", experience: 5, current_ctc: 600000, expected_ctc: 750000, notice_period: "60 days", location: "Ranchi", rating: 4 }),
      c("Priya Singh", j2, "interview", { email: "priya@example.com", phone: "98xxxxxx03", source: "LinkedIn", experience: 2, current_ctc: 300000, expected_ctc: 380000, notice_period: "Immediate", location: "Jamshedpur", rating: 4 }),
      c("Vikash Mahato", j3, "offer", { email: "vikash@example.com", phone: "98xxxxxx04", source: "Walk-in", experience: 4, current_ctc: 280000, expected_ctc: 340000, notice_period: "15 days", location: "Jamshedpur", rating: 5 }),
      c("Sneha Das", j2, "hired", { email: "sneha@example.com", phone: "98xxxxxx05", source: "Company website", experience: 1, current_ctc: 240000, expected_ctc: 300000, notice_period: "Immediate", location: "Kolkata", rating: 4, hired_on: t }),
      c("Amit Verma", j1, "rejected", { email: "amit@example.com", phone: "98xxxxxx06", source: "Naukri", experience: 6, current_ctc: 900000, expected_ctc: 1300000, notice_period: "90 days", location: "Patna", rating: 2 }),
    ];
    setData({
      jobs: [
        { id: j1, title: "Accounts Executive", department: "Finance", location: "Jamshedpur", employment_type: "Full-time", openings: 2, experience: "2-5 years", salary: "₹4–7 LPA", status: "open", hiring_manager: "Finance Head", skills: "Tally, GST, Excel", description: "Handle day-to-day accounting, GST filings and vendor reconciliation.", created_on: addDays(t, -20) },
        { id: j2, title: "Sales Coordinator", department: "Sales", location: "Jamshedpur", employment_type: "Full-time", openings: 1, experience: "1-3 years", salary: "₹3–4 LPA", status: "open", hiring_manager: "Sales Manager", skills: "Communication, CRM, Excel", description: "Coordinate orders, dispatch schedules and customer follow-ups.", created_on: addDays(t, -15) },
        { id: j3, title: "Logistics Supervisor", department: "Operations", location: "Jamshedpur", employment_type: "Full-time", openings: 1, experience: "3+ years", salary: "₹3–4.5 LPA", status: "on-hold", hiring_manager: "Operations Head", skills: "Fleet management, Weighbridge", description: "Supervise vehicle dispatch, loading and weighment.", created_on: addDays(t, -30) },
      ],
      candidates: cands,
      interviews: [
        { id: uid(), candidate_id: cands[2].id, round: "HR", date: addDays(t, 1), time: "11:00", duration: 30, interviewer: "HR Manager", mode: "In-person", venue: "Head office", result: "pending", created_on: t },
        { id: uid(), candidate_id: cands[3].id, round: "Technical", date: addDays(t, -2), time: "15:00", duration: 45, interviewer: "Operations Head", mode: "Video", venue: "", result: "selected", rating: 5, feedback: "Strong hands-on experience with dispatch.", created_on: addDays(t, -4) },
      ],
    });
  }, [setData]);

  return { data, mode, loading, load, save, remove, seed };
};
