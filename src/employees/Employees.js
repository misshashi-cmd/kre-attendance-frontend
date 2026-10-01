import React, { useState, useEffect, useCallback } from "react";
import { call } from "../api";
import { C, Ico, Av, Btn, Card, Modal, Field, Grid, inp, useForm, Opts, Pill, Empty, copyText } from "../ui";

const ROLES = { employee: [C.tm, "Employee"], hr: [C.wn, "HR (Hiring only)"], sales: [C.ok, "Sales (Leads only)"], manager: [C.in, "Manager"], admin: [C.pu, "Admin"] };
const randomPin = () => String(Math.floor(1000 + Math.random() * 9000));

// ========== ADD / EDIT ==========
const EmployeeModal = ({ emp, employees, me, notify, onSaved, onClose }) => {
  const isNew = !emp;
  const nextId = String(Math.max(0, ...employees.map(e => parseInt(e.emp_id, 10)).filter(n => !isNaN(n))) + 1);
  const [f, setF, on] = useForm({ emp_id: nextId, name: "", department: "", phone: "", email: "", role: "employee", pin: isNew ? randomPin() : "", is_active: true, ...emp });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // login details to hand over after saving
  const self = emp?.emp_id === me;
  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const submit = async () => {
    if (isNew && !String(f.emp_id).trim()) return notify("Employee ID is required", "error");
    if (!f.name.trim() || !f.department.trim()) return notify("Name and department are required", "error");
    if ((isNew || f.pin) && String(f.pin).length < 4) return notify("PIN must be at least 4 digits", "error");
    setBusy(true);
    try {
      const body = { name: f.name.trim(), department: f.department.trim(), phone: f.phone || null, role: f.role, email: f.email.trim() || `${String(f.emp_id).trim()}@kregroup.local` };
      if (isNew) await call("/admin/employees", { method: "POST", body: JSON.stringify({ ...body, emp_id: String(f.emp_id).trim(), password: f.pin }) });
      else await call(`/admin/employees/${emp.emp_id}`, { method: "PUT", body: JSON.stringify({ ...body, is_active: f.is_active, ...(f.pin ? { password: f.pin } : {}) }) });
      onSaved();
      if (f.pin) setDone({ id: String(f.emp_id).trim(), pin: f.pin, name: f.name.trim() });
      else { notify("Employee updated"); onClose(); }
    } catch (e) { notify(e.message, "error"); }
    setBusy(false);
  };

  if (done) {
    const text = `KRE Attendance login\nEmployee ID: ${done.id}\nPIN: ${done.pin}\n${window.location.origin}`;
    return (
      <Modal title="Login details" onClose={onClose} footer={<Btn kind="primary" icon="check" onClick={onClose}>Done</Btn>}>
        <div style={{ fontSize: 13, color: C.tm, marginBottom: 14 }}>Give these to <strong style={{ color: C.tx }}>{done.name}</strong> in person or by private message. The PIN isn't shown again.</div>
        <div style={{ background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: 15 }}>
          <span style={{ color: C.tm }}>Employee ID</span><strong>{done.id}</strong>
          <span style={{ color: C.tm }}>PIN</span><strong style={{ letterSpacing: ".15em", fontVariantNumeric: "tabular-nums" }}>{done.pin}</strong>
          <span style={{ color: C.tm }}>Website</span><span style={{ wordBreak: "break-all" }}>{window.location.origin}</span>
        </div>
        <div style={{ marginTop: 12 }}><Btn icon="copy" onClick={async () => (await copyText(text)) ? notify("Login details copied") : notify("Could not copy", "error")}>Copy details</Btn></div>
      </Modal>
    );
  }

  return (
    <Modal title={isNew ? "Add employee" : `Edit ${emp.name}`} onClose={onClose} footer={<>
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" icon="check" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save"}</Btn>
    </>}>
      <Grid>
        <Field label="Employee ID *">{isNew ? <input style={inp} value={f.emp_id} onChange={on("emp_id")} /> : <div style={{ ...inp, color: C.tm }}>{emp.emp_id}</div>}</Field>
        <Field label="Full name *"><input style={inp} value={f.name} onChange={on("name")} autoFocus={isNew} /></Field>
        <Field label="Department *">
          <input style={inp} list="emp-depts" value={f.department} onChange={on("department")} placeholder="e.g. Accounts" />
          <datalist id="emp-depts">{depts.map(d => <option key={d} value={d} />)}</datalist>
        </Field>
        <Field label="Phone"><input style={inp} value={f.phone || ""} onChange={on("phone")} /></Field>
        <Field label="Email (optional)"><input style={inp} type="email" value={f.email && !f.email.endsWith("@kregroup.local") ? f.email : ""} onChange={on("email")} /></Field>
        <Field label="Role">
          <select style={inp} value={f.role} onChange={on("role")} disabled={self}><Opts list={Object.entries(ROLES).map(([k, [, l]]) => [k, l])} /></select>
        </Field>
        <Field label={isNew ? "PIN *" : "New PIN (leave blank to keep)"} span>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inp, letterSpacing: ".15em" }} inputMode="numeric" value={f.pin} onChange={on("pin")} placeholder={isNew ? "" : "••••"} />
            <Btn icon="ref" onClick={() => setF(p => ({ ...p, pin: randomPin() }))}>Generate</Btn>
          </div>
        </Field>
        {!isNew && <Field label="Status" span>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: self ? "default" : "pointer", color: self ? C.td : C.tx }}>
            <input type="checkbox" checked={!!f.is_active} disabled={self} onChange={e => setF(p => ({ ...p, is_active: e.target.checked }))} style={{ accentColor: C.ok }} />
            Active — can log in and check in{self ? " (you can't deactivate yourself)" : ""}
          </label>
        </Field>}
      </Grid>
      {f.role === "admin" && <div style={{ marginTop: 12, fontSize: 12, color: C.wn, background: C.wnD, padding: "8px 12px", borderRadius: 10 }}>Admins can see all attendance, hiring and sales data, and manage employees.</div>}
      {f.role === "hr" && <div style={{ marginTop: 12, fontSize: 12, color: C.tm, background: C.sf, border: `1px solid ${C.bdr}`, padding: "8px 12px", borderRadius: 10 }}>HR sees only the Hiring tab: jobs, candidates, interviews and offers. No attendance, leads or employee list, and no check-in button.</div>}
      {f.role === "sales" && <div style={{ marginTop: 12, fontSize: 12, color: C.tm, background: C.sf, border: `1px solid ${C.bdr}`, padding: "8px 12px", borderRadius: 10 }}>Sales sees only the Leads tab: all leads, pipeline, follow-ups and activity. No attendance, hiring or employee list, and no check-in button.</div>}
    </Modal>
  );
};

// ========== LIST ==========
export default function Employees({ notify, user }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState(null); // { emp } — emp null for a new employee

  const load = useCallback(async () => {
    setLoading(true);
    try { setList((await call("/admin/employees")).employees || []); setErr(""); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const close = useCallback(() => setModal(null), []);

  const ql = q.trim().toLowerCase();
  const shown = list.filter(e => (showInactive || e.is_active) && (!ql || [e.name, e.emp_id, e.department, e.phone].join(" ").toLowerCase().includes(ql)));
  const active = list.filter(e => e.is_active).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Employees</div>
          <div style={{ fontSize: 12, color: C.tm, marginTop: 2 }}>{active} active{list.length > active ? ` · ${list.length - active} inactive` : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn icon="ref" onClick={load}>Refresh</Btn>
          <Btn kind="primary" icon="plus" onClick={() => setModal({ emp: null })}>Add employee</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 10, top: 10 }}><Ico t="search" s={15} c={C.td} /></span>
          <input style={{ ...inp, paddingLeft: 32 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, ID, department…" />
        </div>
        <label style={{ fontSize: 12, color: C.tm, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ accentColor: C.ok }} /> Show inactive
        </label>
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 60, color: C.tm }}>Loading...</div>
      : err ? <Card><Empty icon="alert" title="Couldn't load employees" sub={err}><Btn kind="primary" icon="ref" onClick={load}>Try again</Btn></Empty></Card>
      : !shown.length ? <Card><Empty icon="users" title={list.length ? "No employees match" : "No employees yet"} sub={list.length ? "Clear the search or show inactive employees." : "Add your team so they can log in and check in."}>{!list.length && <Btn kind="primary" icon="plus" onClick={() => setModal({ emp: null })}>Add employee</Btn>}</Empty></Card>
      : <Card style={{ overflow: "hidden" }}><div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ borderBottom: `1px solid ${C.bdr}` }}>{["Employee", "Department", "Role", "Phone", "Status", ""].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.tm, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>)}</tr></thead>
          <tbody>{shown.map(e => <tr key={e.emp_id} style={{ borderBottom: `1px solid ${C.bdr}`, opacity: e.is_active ? 1 : .55 }}>
            <td style={{ padding: "10px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Av n={e.name} s={30} c={ROLES[e.role]?.[0] || C.tm} /><div><div style={{ fontWeight: 500 }}>{e.name}{e.emp_id === user?.emp_id ? <span style={{ color: C.td, fontWeight: 400 }}> (you)</span> : null}</div><div style={{ fontSize: 11, color: C.td }}>ID {e.emp_id}</div></div></div></td>
            <td style={{ padding: "10px 16px", color: C.tm }}>{e.department}</td>
            <td style={{ padding: "10px 16px" }}><Pill c={ROLES[e.role]?.[0] || C.tm}>{ROLES[e.role]?.[1] || e.role}</Pill></td>
            <td style={{ padding: "10px 16px", color: C.tm }}>{e.phone || "—"}</td>
            <td style={{ padding: "10px 16px" }}><Pill c={e.is_active ? C.ok : C.td}>{e.is_active ? "Active" : "Inactive"}</Pill></td>
            <td style={{ padding: "10px 16px", textAlign: "right" }}><Btn icon="edit" onClick={() => setModal({ emp: e })}>Edit</Btn></td>
          </tr>)}</tbody>
        </table>
      </div></Card>}

      {modal && <EmployeeModal emp={modal.emp} employees={list} me={user?.emp_id} notify={notify} onSaved={load} onClose={close} />}
    </div>
  );
}
