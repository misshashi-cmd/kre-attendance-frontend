import React, { useState } from "react";
import { C, Ico, Btn, Modal, Field, Grid, inp, useForm, useSubmit, num, Opts, Pill, SectionTitle, dfmt, inr, copyText } from "../ui";
import { today, addDays, moveStage } from "./store";
import { STAGES, PRIORITY, SOURCES, UNITS, LOST_REASONS, ACT_TYPES, actIcon, OPEN, waLink, TEMPLATES, parseCsv, IMPORT_FIELDS } from "./common";

const digits = p => String(p || "").replace(/\D/g, "").slice(-10);

// ========== LEAD ==========
export const LeadModal = ({ lead, leads, activities, me, save, remove, notify, onClose, onLog }) => {
  const isNew = !lead?.id;
  const [f, setF, on] = useForm({ company: "", contact_name: "", designation: "", phone: "", email: "", city: "", product: "", quantity: "", unit: "MT", value: "", source: "", stage: "new", priority: "warm", owner: me, next_follow_up: isNew ? today() : "", next_action: "", expected_close: "", lost_reason: "", notes: "", ...lead });
  const [busy, run] = useSubmit(notify, onClose);
  const [wa, setWa] = useState(null); // WhatsApp composer text, or null when closed
  const acts = isNew ? [] : activities.filter(a => a.lead_id === lead.id).sort((a, b) => `${b.date}${b.created_on}`.localeCompare(`${a.date}${a.created_on}`));
  const dup = f.phone && digits(f.phone).length === 10 && leads.find(l => l.id !== lead?.id && digits(l.phone) === digits(f.phone));
  const owners = [...new Set(leads.map(l => l.owner).filter(Boolean))];

  const submit = () => {
    if (!f.company.trim() && !f.contact_name.trim()) return notify("Enter a company or contact name", "error");
    if (f.stage === "lost" && !f.lost_reason) return notify("Select why this lead was lost", "error");
    let rec = { ...f, company: f.company.trim(), contact_name: f.contact_name.trim(), quantity: num(f.quantity), value: num(f.value) };
    rec = isNew ? { ...rec, stage_on: today(), stage_history: [{ stage: rec.stage, at: today() }], ...(rec.stage === "won" ? { won_on: today() } : {}) }
      : moveStage({ ...rec, stage: (leads.find(x => x.id === lead.id) || lead).stage }, rec.stage);
    if (!OPEN.includes(rec.stage)) rec = { ...rec, next_follow_up: "" };
    run(() => save("leads", rec), isNew ? "Lead added" : "Lead updated");
  };
  const del = () => {
    if (!window.confirm(`Delete ${lead.company || lead.contact_name} and its activity history?`)) return;
    run(async () => {
      for (const a of acts) await remove("activities", a.id);
      await remove("leads", lead.id);
    }, "Lead deleted");
  };
  const title = isNew ? "Add lead" : lead.company || lead.contact_name;

  return (
    <Modal w={760} title={title} onClose={onClose} footer={<>
      {!isNew && <Btn kind="danger" icon="trash" onClick={del} disabled={busy} style={{ marginRight: "auto" }}>Delete</Btn>}
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" icon="check" onClick={submit} disabled={busy}>Save</Btn>
    </>}>
      {!isNew && <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: wa === null ? 16 : 10 }}>
          {lead.phone && <a href={`tel:${lead.phone}`} style={{ textDecoration: "none" }}><Btn icon="phone">Call</Btn></a>}
          {lead.phone && <Btn icon="chat" onClick={() => setWa(wa === null ? TEMPLATES[lead.stage === "new" ? 0 : lead.stage === "quotation" ? 2 : 1].t(lead, lead.owner || me) : null)}>WhatsApp</Btn>}
          {lead.email && <a href={`mailto:${lead.email}`} style={{ textDecoration: "none" }}><Btn icon="mail">Email</Btn></a>}
          <Btn kind="primary" icon="plus" onClick={() => onLog({ lead_id: lead.id })}>Log activity</Btn>
        </div>
        {wa !== null && <div style={{ background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {TEMPLATES.map(t => <button key={t.k} onClick={() => setWa(t.t(lead, lead.owner || me))} style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${C.bdr}`, background: "transparent", color: C.tm, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{t.l}</button>)}
          </div>
          <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={wa} onChange={e => setWa(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <a href={waLink(lead.phone, wa)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}><Btn kind="primary" icon="chat">Open in WhatsApp</Btn></a>
            <Btn icon="copy" onClick={async () => (await copyText(wa)) ? notify("Message copied") : notify("Could not copy the message", "error")}>Copy</Btn>
            <span style={{ fontSize: 11, color: C.td, alignSelf: "center" }}>After sending, use “Log activity” to record it.</span>
          </div>
        </div>}
      </>}

      <Grid>
        <Field label="Company"><input style={inp} value={f.company} onChange={on("company")} autoFocus={isNew} /></Field>
        <Field label="Contact person"><input style={inp} value={f.contact_name} onChange={on("contact_name")} /></Field>
        <Field label="Designation"><input style={inp} value={f.designation} onChange={on("designation")} placeholder="e.g. Purchase Manager" /></Field>
        <Field label="Phone / WhatsApp"><input style={{ ...inp, borderColor: dup ? C.wn : C.bdr }} value={f.phone} onChange={on("phone")} /></Field>
        <Field label="Email"><input style={inp} type="email" value={f.email} onChange={on("email")} /></Field>
        <Field label="City"><input style={inp} value={f.city} onChange={on("city")} /></Field>
        {dup && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: C.wn, background: C.wnD, padding: "8px 12px", borderRadius: 10 }}>This phone number already belongs to <strong>{dup.company || dup.contact_name}</strong> ({STAGES.find(s => s.k === dup.stage)?.l}, owner {dup.owner || "—"}).</div>}
        <Field label="Product / requirement"><input style={inp} value={f.product} onChange={on("product")} placeholder="e.g. Coal (steam grade)" /></Field>
        <Field label="Quantity">
          <div style={{ display: "flex", gap: 6 }}>
            <input style={inp} type="number" min="0" value={f.quantity} onChange={on("quantity")} />
            <select style={{ ...inp, width: 90 }} value={f.unit} onChange={on("unit")}><Opts list={UNITS} /></select>
          </div>
        </Field>
        <Field label="Deal value (₹)"><input style={inp} type="number" min="0" value={f.value} onChange={on("value")} /></Field>
        <Field label="Stage"><select style={inp} value={f.stage} onChange={on("stage")}><Opts list={STAGES.map(s => [s.k, s.l])} /></select></Field>
        <Field label="Priority"><select style={inp} value={f.priority} onChange={on("priority")}><Opts list={Object.entries(PRIORITY).map(([k, [, l]]) => [k, l])} /></select></Field>
        <Field label="Source"><select style={inp} value={f.source} onChange={on("source")}><option value="">Select…</option><Opts list={SOURCES} /></select></Field>
        <Field label="Salesperson">
          <input style={inp} list="crm-owners" value={f.owner} onChange={on("owner")} />
          <datalist id="crm-owners">{owners.map(o => <option key={o} value={o} />)}</datalist>
        </Field>
        {f.stage === "lost"
          ? <Field label="Reason lost *"><select style={inp} value={f.lost_reason} onChange={on("lost_reason")}><option value="">Select…</option><Opts list={LOST_REASONS} /></select></Field>
          : <Field label="Expected closing"><input style={inp} type="date" value={f.expected_close} onChange={on("expected_close")} /></Field>}
        {OPEN.includes(f.stage) && <>
          <Field label="Next follow-up"><input style={inp} type="date" value={f.next_follow_up} onChange={on("next_follow_up")} /></Field>
          <Field label="Next action" span><input style={inp} value={f.next_action} onChange={on("next_action")} placeholder="e.g. Send price list, call after 4 pm" /></Field>
        </>}
        <Field label="Notes" span><textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} value={f.notes} onChange={on("notes")} placeholder="Specs, payment terms, competitor, decision makers..." /></Field>
      </Grid>

      {!isNew && <div style={{ marginTop: 22 }}>
        <SectionTitle>Activity history</SectionTitle>
        {!acts.length ? <div style={{ fontSize: 12, color: C.td }}>No calls, meetings or messages logged yet.</div>
        : <div style={{ borderLeft: `2px solid ${C.bdr}`, marginLeft: 12, paddingLeft: 16 }}>
          {acts.map(a => <div key={a.id} style={{ position: "relative", marginBottom: 14 }}>
            <div style={{ position: "absolute", left: -29, top: 0, width: 24, height: 24, borderRadius: "50%", background: C.card, border: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico t={actIcon(a.type)} s={12} c={C.tm} /></div>
            <div style={{ fontSize: 12, color: C.tm }}><strong style={{ color: C.tx }}>{a.type}</strong> · {dfmt(a.date)}{a.by ? ` · ${a.by}` : ""}</div>
            <div style={{ fontSize: 13, marginTop: 2, whiteSpace: "pre-wrap" }}>{a.summary}</div>
          </div>)}
        </div>}
      </div>}
    </Modal>
  );
};

// ========== LOG ACTIVITY ==========
export const ActivityModal = ({ act, leads, me, save, notify, onClose }) => {
  const lead0 = leads.find(l => l.id === act?.lead_id);
  const [f, setF, on] = useForm({ lead_id: "", type: "Call", date: today(), summary: "", by: lead0?.owner || me, stage: lead0?.stage || "", next_follow_up: lead0 ? addDays(today(), 3) : "", next_action: "", ...act });
  const [busy, run] = useSubmit(notify, onClose);
  const lead = leads.find(l => l.id === f.lead_id);
  const pick = leads.filter(l => OPEN.includes(l.stage) || l.id === f.lead_id).sort((a, b) => (a.company || a.contact_name).localeCompare(b.company || b.contact_name));

  const submit = () => {
    if (!lead) return notify("Select a lead", "error");
    if (!f.summary.trim()) return notify("Write what happened", "error");
    let stage = f.stage || lead.stage;
    // Logging contact moves a brand-new lead forward; sending a quotation moves it to that stage.
    if (stage === "new" && f.type !== "Note") stage = "contacted";
    if (f.type === "Quotation sent" && ["new", "contacted", "qualified"].includes(stage)) stage = "quotation";
    const open = OPEN.includes(stage);
    run(async () => {
      await save("activities", { lead_id: lead.id, type: f.type, date: f.date, summary: f.summary.trim(), by: f.by });
      await save("leads", { ...moveStage(lead, stage), last_contact: f.date, next_follow_up: open ? f.next_follow_up : "", next_action: open ? f.next_action : "" });
    }, "Activity logged");
  };

  return (
    <Modal title="Log activity" onClose={onClose} footer={<>
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" icon="check" onClick={submit} disabled={busy}>Save</Btn>
    </>}>
      <Grid>
        <Field label="Lead *" span><select style={inp} value={f.lead_id} onChange={e => { const l = leads.find(x => x.id === e.target.value); setF(p => ({ ...p, lead_id: e.target.value, stage: "", by: p.by || l?.owner || me, next_follow_up: p.next_follow_up || addDays(today(), 3) })); }}>
          <option value="">Select lead…</option>
          {pick.map(l => <option key={l.id} value={l.id}>{l.company || l.contact_name}{l.company && l.contact_name ? ` — ${l.contact_name}` : ""}</option>)}
        </select></Field>
        <Field label="Type" span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ACT_TYPES.map(t => <button key={t.k} type="button" onClick={() => setF(p => ({ ...p, type: t.k }))} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, border: `1px solid ${f.type === t.k ? C.ok + "66" : C.bdr}`, background: f.type === t.k ? C.okD : C.sf, color: f.type === t.k ? C.ok : C.tm, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <Ico t={t.i} s={13} c={f.type === t.k ? C.ok : C.tm} />{t.k}
            </button>)}
          </div>
        </Field>
        <Field label="Date"><input style={inp} type="date" value={f.date} onChange={on("date")} /></Field>
        <Field label="Done by"><input style={inp} value={f.by} onChange={on("by")} /></Field>
        <Field label="What happened? *" span><textarea style={{ ...inp, minHeight: 90, resize: "vertical" }} value={f.summary} onChange={on("summary")} placeholder="e.g. Spoke to purchase head. Needs 300 MT monthly, wants price by Friday." autoFocus /></Field>
        {lead && <>
          <Field label="Move lead to stage"><select style={inp} value={f.stage || lead.stage} onChange={on("stage")}><Opts list={STAGES.map(s => [s.k, s.l])} /></select></Field>
          {OPEN.includes(f.stage || lead.stage) && <>
            <Field label="Next follow-up"><input style={inp} type="date" value={f.next_follow_up} onChange={on("next_follow_up")} /></Field>
            <Field label="Next action" span><input style={inp} value={f.next_action} onChange={on("next_action")} placeholder="What should happen next?" /></Field>
          </>}
        </>}
      </Grid>
    </Modal>
  );
};

// ========== IMPORT FROM EXCEL / CSV ==========
export const ImportModal = ({ leads, me, save, notify, onClose }) => {
  const [text, setText] = useState("");
  const [busy, run] = useSubmit(notify, onClose);
  const rows = text.trim() ? parseCsv(text) : [];
  const head = (rows[0] || []).map(h => h.trim().toLowerCase());
  const map = Object.fromEntries(Object.entries(IMPORT_FIELDS).map(([k, names]) => [k, head.findIndex(h => names.includes(h))]).filter(([, i]) => i >= 0));
  const known = new Set(leads.map(l => digits(l.phone)).filter(p => p.length === 10));
  const parsed = rows.slice(1).map(r => Object.fromEntries(Object.entries(map).map(([k, i]) => [k, (r[i] || "").trim()]))).filter(r => r.company || r.contact_name);
  const fresh = parsed.filter(r => { const p = digits(r.phone); if (p.length === 10 && known.has(p)) return false; known.add(p); return true; });

  const file = e => {
    const fl = e.target.files?.[0];
    if (!fl) return;
    const r = new FileReader();
    r.onload = () => setText(String(r.result));
    r.readAsText(fl);
  };
  const submit = () => run(async () => {
    for (const r of fresh) await save("leads", { stage: "new", priority: "warm", unit: "MT", owner: me, next_follow_up: today(), stage_on: today(), stage_history: [{ stage: "new", at: today() }], ...r, source: r.source || "Other", quantity: num(r.quantity), value: num(String(r.value || "").replace(/[₹,\s]/g, "")) });
  }, `${fresh.length} lead${fresh.length === 1 ? "" : "s"} imported`);

  return (
    <Modal w={760} title="Import leads from Excel" onClose={onClose} footer={<>
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" icon="upload" onClick={submit} disabled={busy || !fresh.length}>Import {fresh.length || ""} lead{fresh.length === 1 ? "" : "s"}</Btn>
    </>}>
      <ol style={{ fontSize: 13, color: C.tm, margin: "0 0 14px", paddingLeft: 18, lineHeight: 1.7 }}>
        <li>In Excel, use <strong style={{ color: C.tx }}>File → Save As → CSV</strong>, or copy the cells.</li>
        <li>Choose the file below, or paste the copied cells into the box.</li>
        <li>The first row must be column headings like <em>Company, Contact, Mobile, City, Product, Value, Source</em>.</li>
      </ol>
      <input type="file" accept=".csv,text/csv,text/plain" onChange={file} style={{ ...inp, padding: 8, marginBottom: 10 }} />
      <textarea style={{ ...inp, minHeight: 120, resize: "vertical", fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12 }} value={text}
        onChange={e => setText(e.target.value.includes("\t") ? e.target.value.split("\n").map(l => l.split("\t").map(c => /[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(",")).join("\n") : e.target.value)}
        placeholder={"Company,Contact,Mobile,City,Product,Value,Source\nShree Balaji Ispat,Manoj Agarwal,9800000002,Ranchi,Iron ore fines,5400000,Referral"} />
      {rows.length > 0 && <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {Object.keys(IMPORT_FIELDS).map(k => <Pill key={k} c={map[k] !== undefined ? C.ok : C.td}>{k.replace("_", " ")}</Pill>)}
        </div>
        {map.company === undefined && map.contact_name === undefined ? <div style={{ fontSize: 12, color: C.no }}>Couldn’t find a Company or Contact column. Check the first row has headings.</div>
        : <div style={{ fontSize: 12, color: C.tm }}>
          Found <strong style={{ color: C.tx }}>{parsed.length}</strong> lead{parsed.length === 1 ? "" : "s"}
          {parsed.length !== fresh.length && <> — <span style={{ color: C.wn }}>{parsed.length - fresh.length} skipped because the phone number already exists</span></>}.
          {fresh.slice(0, 5).map((r, i) => <div key={i} style={{ padding: "6px 10px", background: C.sf, borderRadius: 8, marginTop: 6, border: `1px solid ${C.bdr}` }}>
            <strong style={{ color: C.tx }}>{r.company || r.contact_name}</strong>{r.contact_name && r.company ? ` · ${r.contact_name}` : ""}{r.phone ? ` · ${r.phone}` : ""}{r.city ? ` · ${r.city}` : ""}{r.value ? ` · ${inr(String(r.value).replace(/[₹,\s]/g, ""))}` : ""}
          </div>)}
          {fresh.length > 5 && <div style={{ marginTop: 6 }}>…and {fresh.length - 5} more</div>}
        </div>}
      </div>}
    </Modal>
  );
};
