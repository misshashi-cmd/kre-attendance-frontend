import { C } from "../ui";

export { verifyWeighment, normVehicle, isValidVehicle, DEFAULT_SETTINGS } from "./engine";

// Final status: an admin's decision wins over the automatic verification.
export const STATUS = {
  verified: { l: "Verified", c: C.ok, i: "check" },
  review: { l: "Needs review", c: C.wn, i: "alert" },
  mismatch: { l: "Mismatch", c: C.no, i: "x" },
  approved: { l: "Approved", c: "#22D3EE", i: "check" },
  rejected: { l: "Rejected", c: C.no, i: "x" },
};
export const statusOf = w => w.decision || w.verification?.status || "review";
export const needsAction = w => !w.decision && (w.verification?.status === "mismatch" || w.verification?.status === "review");

export const CHECK = {
  pass: { c: C.ok, i: "check", l: "PASS" },
  warn: { c: C.wn, i: "alert", l: "CHECK" },
  fail: { c: C.no, i: "x", l: "FAIL" },
  skip: { c: C.td, i: "clock", l: "N/A" },
};
export const GROUPS = [
  ["slip", "Slip data"],
  ["indicator", "Slip vs weighbridge indicator"],
  ["vehicle", "Vehicle"],
  ["time", "Timing"],
  ["party", "Party challan"],
];

export const DIRECTIONS = [
  ["inward", "Inward (comes loaded)"],
  ["outward", "Outward (comes empty)"],
];
export const MATERIALS = ["Coal (steam grade)", "Washed coal", "Pet coke", "Iron ore fines", "Iron ore lumps", "Sponge iron", "Pig iron", "Scrap", "Fly ash", "Sand", "Stone chips", "Other"];
export const VEHICLE_TYPES = ["6-wheeler", "10-wheeler tipper", "12-wheeler tipper", "14-wheeler trailer", "16-wheeler trailer", "18-wheeler trailer", "Tractor-trolley", "Pick-up / LCV", "Other"];

const n = v => v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v);
export const kg = v => n(v) === null ? "—" : `${Number(v).toLocaleString("en-IN")} kg`;
export const mt = v => n(v) === null ? "—" : `${(Number(v) / 1000).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} MT`;
export const signedKg = v => n(v) === null ? "—" : `${v > 0 ? "+" : ""}${Number(v).toLocaleString("en-IN")} kg`;
export const dtfmt = s => s ? new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
