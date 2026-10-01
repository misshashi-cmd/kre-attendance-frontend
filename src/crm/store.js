import { useCallback } from "react";
import { useCollections, uid, today, addDays } from "../collections";

// CRM data: /api/crm/{leads,activities}, or localStorage when the backend
// doesn't have those routes (see collections.js).
export { uid, today, addDays, daysBetween } from "../collections";

const COLS = ["leads", "activities"];

// Returns the lead moved to `stage`, recording when it happened.
export const moveStage = (l, stage) => l.stage === stage ? l : {
  ...l, stage, stage_on: today(),
  stage_history: [...(l.stage_history || []), { stage, at: today() }],
  ...(stage === "won" ? { won_on: today() } : {}),
  ...(stage === "lost" ? { lost_on: today() } : {}),
};

export const useCrm = () => {
  const { data, setData, mode, error, loading, load, save, remove } = useCollections("crm", COLS, "kre_crm_v1");

  // Demo data so the sales team can try the tools before entering real leads (local mode only).
  const seed = useCallback(() => {
    const t = today();
    const l = (company, contact_name, stage, extra) => ({
      id: uid(), company, contact_name, stage, created_on: addDays(t, -18), stage_on: addDays(t, -4),
      stage_history: [{ stage: "new", at: addDays(t, -18) }, ...(stage !== "new" ? [{ stage, at: addDays(t, -4) }] : [])],
      ...(stage === "won" ? { won_on: addDays(t, -2) } : {}), ...(stage === "lost" ? { lost_on: addDays(t, -6) } : {}),
      ...extra,
    });
    const leads = [
      l("Tata Steel Vendor Hub", "Rakesh Gupta", "new", { designation: "Purchase Manager", phone: "9800000001", email: "rakesh@example.com", city: "Jamshedpur", product: "Coal (steam grade)", quantity: 500, unit: "MT", value: 3250000, source: "IndiaMART", priority: "hot", owner: "Amit", next_follow_up: t, next_action: "First call — understand monthly requirement" }),
      l("Shree Balaji Ispat", "Manoj Agarwal", "contacted", { designation: "Director", phone: "9800000002", city: "Ranchi", product: "Iron ore fines", quantity: 1200, unit: "MT", value: 5400000, source: "Referral", priority: "warm", owner: "Priya", next_follow_up: addDays(t, -2), next_action: "Share spec sheet and sample report" }),
      l("Durga Cement Works", "Sunita Mahato", "qualified", { designation: "Plant Head", phone: "9800000003", city: "Bokaro", product: "Pet coke", quantity: 300, unit: "MT", value: 2700000, source: "Exhibition / trade fair", priority: "hot", owner: "Amit", next_follow_up: addDays(t, 1), next_action: "Site visit with sample" }),
      l("Kalinga Alloys", "Deepak Nayak", "quotation", { designation: "Procurement", phone: "9800000004", city: "Rourkela", product: "Coal (steam grade)", quantity: 800, unit: "MT", value: 5200000, source: "Website", priority: "warm", owner: "Priya", next_follow_up: t, next_action: "Follow up on quotation #Q-112" }),
      l("Jharkhand Power Ltd", "Vivek Sinha", "negotiation", { designation: "GM Fuel", phone: "9800000005", city: "Dhanbad", product: "Washed coal", quantity: 2000, unit: "MT", value: 14000000, source: "Existing customer", priority: "hot", owner: "Amit", next_follow_up: addDays(t, 2), next_action: "Final price discussion", expected_close: addDays(t, 10) }),
      l("Bengal Refractories", "Arpita Das", "won", { designation: "Owner", phone: "9800000006", city: "Durgapur", product: "Pet coke", quantity: 150, unit: "MT", value: 1350000, source: "TradeIndia", priority: "warm", owner: "Priya" }),
      l("Sai Traders", "Ramesh Yadav", "lost", { designation: "Proprietor", phone: "9800000007", city: "Patna", product: "Coal (steam grade)", quantity: 100, unit: "MT", value: 650000, source: "Cold call", priority: "cold", owner: "Amit", lost_reason: "Price too high" }),
    ];
    const a = (i, type, days, summary, by) => ({ id: uid(), lead_id: leads[i].id, type, date: addDays(t, days), summary, by, created_on: addDays(t, days) });
    setData({
      leads,
      activities: [
        a(1, "Call", -5, "Spoke to Manoj ji. Needs ~1200 MT/month, currently buying from Odisha supplier.", "Priya"),
        a(2, "Meeting", -4, "Met at the Kolkata trade fair. Interested if GCV is above 5500.", "Amit"),
        a(3, "Quotation sent", -3, "Sent quotation #Q-112 at ₹6,500/MT, ex-yard, 30 days credit.", "Priya"),
        a(4, "Call", -2, "Asked for ₹6,800/MT delivered. Will revert after internal approval.", "Amit"),
        a(5, "WhatsApp", -2, "PO received for 150 MT. Dispatch next week.", "Priya"),
      ],
    });
  }, [setData]);

  return { data, mode, error, loading, load, save, remove, seed };
};
