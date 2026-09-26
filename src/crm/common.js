import { C } from "../ui";

export const STAGES = [
  { k: "new", l: "New", c: C.tm },
  { k: "contacted", l: "Contacted", c: C.in },
  { k: "qualified", l: "Qualified", c: C.pu },
  { k: "quotation", l: "Quotation sent", c: "#22D3EE" },
  { k: "negotiation", l: "Negotiation", c: C.wn },
  { k: "won", l: "Won", c: C.ok },
  { k: "lost", l: "Lost", c: C.no },
];
export const stageOf = k => STAGES.find(s => s.k === k) || STAGES[0];
export const OPEN = ["new", "contacted", "qualified", "quotation", "negotiation"];
export const isOpen = l => OPEN.includes(l.stage);

export const PRIORITY = { hot: [C.no, "Hot"], warm: [C.wn, "Warm"], cold: [C.in, "Cold"] };
export const SOURCES = ["IndiaMART", "TradeIndia", "JustDial", "Website", "Referral", "Cold call", "WhatsApp", "Walk-in", "Exhibition / trade fair", "Existing customer", "Other"];
export const UNITS = ["MT", "Kg", "Nos", "Litre", "Bags", "Trucks"];
export const LOST_REASONS = ["Price too high", "Went with competitor", "No requirement now", "Quality / spec mismatch", "Payment terms", "No response", "Other"];
export const ACT_TYPES = [
  { k: "Call", i: "phone" },
  { k: "WhatsApp", i: "chat" },
  { k: "Email", i: "mail" },
  { k: "Meeting", i: "users" },
  { k: "Site visit", i: "mapPin" },
  { k: "Quotation sent", i: "doc" },
  { k: "Note", i: "edit" },
];
export const actIcon = k => (ACT_TYPES.find(a => a.k === k) || ACT_TYPES[6]).i;

// Short Indian money format for tight spaces: ₹45,000 · ₹3.2 L · ₹1.4 Cr
export const inrShort = n => {
  n = Number(n) || 0;
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

// wa.me link; 10-digit Indian numbers get the 91 country code.
export const waLink = (phone, text = "") => {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) d = `91${d}`;
  if (d.length === 11 && d.startsWith("0")) d = `91${d.slice(1)}`;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

export const TEMPLATES = [
  { k: "intro", l: "Introduction", t: (l, me) => `Hello ${l.contact_name || ""}, this is ${me} from KRE Group. Thank you for your enquiry${l.product ? ` about ${l.product}` : ""}. Could we have a quick call to understand your requirement?` },
  { k: "followup", l: "Follow-up", t: (l, me) => `Hello ${l.contact_name || ""}, ${me} from KRE Group here. Just following up on our last conversation${l.product ? ` regarding ${l.product}` : ""}. Please let me know a convenient time to talk.` },
  { k: "quotation", l: "Quotation follow-up", t: (l, me) => `Hello ${l.contact_name || ""}, hope you received our quotation${l.product ? ` for ${l.product}` : ""}${l.quantity ? ` (${l.quantity} ${l.unit || ""})` : ""}. Happy to clarify anything or discuss the terms. — ${me}, KRE Group` },
  { k: "thanks", l: "Thank you for the order", t: (l, me) => `Hello ${l.contact_name || ""}, thank you for your order with KRE Group! We will share dispatch details shortly. — ${me}` },
];

// Minimal CSV parser (handles quoted fields, commas and newlines inside quotes).
export const parseCsv = text => {
  const rows = []; let row = [], f = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { f += '"'; i++; }
      else if (ch === '"') q = false;
      else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(f); f = "";
      if (row.some(x => x.trim())) rows.push(row);
      row = [];
    } else f += ch;
  }
  row.push(f);
  if (row.some(x => x.trim())) rows.push(row);
  return rows;
};

// Spreadsheet column names we recognise for each lead field.
export const IMPORT_FIELDS = {
  company: ["company", "company name", "firm", "organisation", "organization", "business", "party", "party name"],
  contact_name: ["contact", "contact name", "name", "contact person", "person", "customer name"],
  phone: ["phone", "mobile", "mobile no", "phone number", "contact no", "contact number", "whatsapp", "mob"],
  email: ["email", "email id", "e-mail", "mail"],
  city: ["city", "location", "place", "district"],
  product: ["product", "requirement", "material", "item", "interested in"],
  quantity: ["quantity", "qty"],
  value: ["value", "deal value", "amount", "estimated value", "budget"],
  source: ["source", "lead source"],
  owner: ["owner", "assigned to", "salesperson", "sales person", "executive"],
  notes: ["notes", "remarks", "comment", "comments", "description"],
};
