import React, { useMemo } from "react";
import { C, Ico, Btn, Modal, Field, Grid, inp, useForm, useSubmit, num, Opts, SectionTitle } from "../ui";
import { today, nowLocal } from "./store";
import { verifyWeighment, normVehicle, isValidVehicle, DEFAULT_SETTINGS, STATUS, CHECK, GROUPS, DIRECTIONS, MATERIALS, VEHICLE_TYPES, kg, mt, signedKg, dtfmt } from "./common";
import { printReports } from "./print";

// ========== VERIFICATION RESULT ==========
export const Banner = ({ st, v }) => {
  const S = STATUS[st];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: `${S.c}1A`, border: `1px solid ${S.c}55` }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${S.c}26`, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico t={S.i} s={18} c={S.c} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: S.c }}>{S.l}</div>
        {v && <div style={{ fontSize: 11, color: C.tm }}>{v.counts.pass} passed · {v.counts.warn} to check · {v.counts.fail} failed{v.counts.skip ? ` · ${v.counts.skip} not checked` : ""}</div>}
      </div>
    </div>
  );
};

export const Checks = ({ v }) => (
  <div>
    {GROUPS.map(([g, label]) => {
      const cs = v.checks.filter(c => c.group === g);
      if (!cs.length) return null;
      return <div key={g} style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.td, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>{label}</div>
        {cs.map(c => { const K = CHECK[c.status]; return (
          <div key={c.k} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.bdr}` }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${K.c}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}><Ico t={K.i} s={11} c={K.c} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.status === "pass" ? C.tx : K.c }}>{c.label}</div>
              <div style={{ fontSize: 11, color: C.tm }}>{c.detail}</div>
            </div>
          </div>); })}
      </div>;
    })}
  </div>
);

// One row of the slip-vs-indicator comparison.
const Diff = ({ d, tol }) => {
  if (d === null || d === undefined) return <span style={{ color: C.td }}>—</span>;
  const c = d === 0 ? C.ok : Math.abs(d) <= tol ? C.wn : C.no;
  return <span style={{ color: c, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{d === 0 ? "✓ 0" : signedKg(d)}</span>;
};

// ========== WEIGHMENT (slip entry + verification) ==========
export const WeighmentModal = ({ item, data, ctx, isAdmin, me, save, remove, notify, onClose }) => {
  const isNew = !item?.id;
  const [f, setF, on] = useForm({ slip_no: "", date: today(), direction: "inward", vehicle_no: "", driver_name: "", party: "", material: "", challan_no: "", challan_weight: "",
    slip_gross: "", slip_tare: "", slip_net: "", ind_gross: "", ind_tare: "", gross_time: "", tare_time: "", operator: me, remarks: "", decision: "", decision_note: "", ...item });
  const [busy, run] = useSubmit(notify, onClose);
  const locked = !isAdmin && !!item?.decision;
  const tol = Number(ctx.settings.tolerance_kg ?? DEFAULT_SETTINGS.tolerance_kg);

  const rec = useMemo(() => ({ ...f, vehicle_no: normVehicle(f.vehicle_no),
    ...Object.fromEntries(["slip_gross", "slip_tare", "slip_net", "ind_gross", "ind_tare", "challan_weight"].map(k => [k, num(f[k])])) }), [f]);
  const v = useMemo(() => verifyWeighment(rec, ctx), [rec, ctx]);
  const st = f.decision || v.status;
  const veh = data.vehicles.find(x => x.vehicle_no === rec.vehicle_no);
  const parties = [...new Set(data.weighments.map(w => w.party).filter(Boolean))].sort();
  const calcNet = rec.slip_gross !== "" && rec.slip_tare !== "" ? rec.slip_gross - rec.slip_tare : "";

  const onVehicle = e => {
    const vn = e.target.value, hit = data.vehicles.find(x => x.vehicle_no === normVehicle(vn));
    setF(p => ({ ...p, vehicle_no: vn, driver_name: p.driver_name || hit?.driver_name || "" }));
  };
  const stamp = k => () => setF(p => ({ ...p, [k]: nowLocal() }));

  const submit = () => {
    if (!String(f.slip_no).trim()) return notify("Enter the slip number", "error");
    if (!rec.vehicle_no) return notify("Enter the vehicle number", "error");
    if (rec.slip_gross === "" || rec.slip_tare === "") return notify("Enter gross and tare weight from the slip", "error");
    if (f.decision === "rejected" && !String(f.decision_note).trim()) return notify("Write why the slip is rejected", "error");
    const out = { ...rec, slip_no: String(f.slip_no).trim() };
    if (out.slip_net === "") out.slip_net = calcNet;
    if (!isAdmin) { delete out.decision; delete out.decision_note; }
    run(() => save("weighments", out), isNew ? `Slip ${out.slip_no} saved — ${STATUS[out.decision || verifyWeighment(out, ctx).status].l}` : "Weighment updated");
  };
  const del = () => window.confirm(`Delete slip ${item.slip_no}? This cannot be undone.`) && run(() => remove("weighments", item.id), "Weighment deleted");

  // A plain function (not a component) so the inputs keep focus while typing.
  const wIn = (k, label) => <input style={{ ...inp, textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 15, fontWeight: 600 }} type="number" min="0" step="1" inputMode="numeric" value={f[k]} onChange={on(k)} disabled={locked} aria-label={label} />;
  const cell = { padding: "6px 8px", fontSize: 12 };

  return (
    <Modal w={1080} title={isNew ? "New weighment — verify slip" : `Slip ${item.slip_no} · ${item.vehicle_no}`} onClose={onClose} footer={<>
      {!isNew && isAdmin && <Btn kind="danger" icon="trash" onClick={del} disabled={busy} style={{ marginRight: "auto" }}>Delete</Btn>}
      {!isNew && <Btn icon="print" onClick={() => printReports([item]) || notify("Allow pop-ups to print the report", "error")}>Print report</Btn>}
      <Btn onClick={onClose}>{locked ? "Close" : "Cancel"}</Btn>
      {!locked && <Btn kind="primary" icon="check" onClick={submit} disabled={busy}>{isNew ? "Save & verify" : "Save"}</Btn>}
    </>}>
      {locked && <div style={{ fontSize: 12, color: C.wn, background: C.wnD, padding: "8px 12px", borderRadius: 10, marginBottom: 14 }}>This slip was {item.decision} by {item.decision_by}. Only an admin can change it now.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))", gap: 20, alignItems: "start" }}>
        <div>
          <SectionTitle>Trip details</SectionTitle>
          <fieldset disabled={locked} style={{ border: "none", padding: 0, margin: 0 }}>
            <Grid min={140}>
              <Field label="Slip no. *"><input style={inp} value={f.slip_no} onChange={on("slip_no")} autoFocus={isNew} /></Field>
              <Field label="Date"><input style={inp} type="date" value={f.date} onChange={on("date")} /></Field>
              <Field label="Direction"><select style={inp} value={f.direction} onChange={on("direction")}><Opts list={DIRECTIONS} /></select></Field>
              <Field label="Vehicle no. *">
                <input style={{ ...inp, textTransform: "uppercase", borderColor: rec.vehicle_no && !isValidVehicle(rec.vehicle_no) ? C.wn : C.bdr }} list="wb-vehicles" value={f.vehicle_no} onChange={onVehicle} placeholder="JH05AB1234" />
                <datalist id="wb-vehicles">{data.vehicles.map(x => <option key={x.id} value={x.vehicle_no}>{x.owner_name || ""}</option>)}</datalist>
              </Field>
              <Field label="Driver"><input style={inp} value={f.driver_name} onChange={on("driver_name")} /></Field>
              <Field label="Party / supplier / customer">
                <input style={inp} list="wb-parties" value={f.party} onChange={on("party")} />
                <datalist id="wb-parties">{parties.map(p => <option key={p} value={p} />)}</datalist>
              </Field>
              <Field label="Material">
                <input style={inp} list="wb-materials" value={f.material} onChange={on("material")} />
                <datalist id="wb-materials">{MATERIALS.map(m => <option key={m} value={m} />)}</datalist>
              </Field>
              <Field label="Challan / invoice no."><input style={inp} value={f.challan_no} onChange={on("challan_no")} /></Field>
              <Field label="Challan weight (kg)"><input style={inp} type="number" min="0" value={f.challan_weight} onChange={on("challan_weight")} placeholder="Party's weight" /></Field>
            </Grid>
            {veh && <div style={{ marginTop: 10, fontSize: 12, color: veh.blacklisted ? C.no : C.tm, background: veh.blacklisted ? C.noD : C.sf, border: `1px solid ${veh.blacklisted ? C.no + "44" : C.bdr}`, padding: "8px 12px", borderRadius: 10 }}>
              {veh.blacklisted ? <><strong>BLOCKED VEHICLE.</strong> {veh.blacklist_reason}</> : <>{veh.owner_name || "Registered vehicle"}{veh.vehicle_type ? ` · ${veh.vehicle_type}` : ""} · standard tare <strong style={{ color: C.tx }}>{kg(veh.std_tare)}</strong>{veh.gvw ? ` · GVW ${kg(veh.gvw)}` : ""}</>}
            </div>}

            <div style={{ marginTop: 20 }}><SectionTitle>Weights — software slip vs indicator display</SectionTitle></div>
            <div style={{ background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: `1px solid ${C.bdr}` }}>
                  {["", "Printed on slip (kg)", "Indicator shows (kg)", "Difference"].map((h, i) => <th key={i} style={{ ...cell, color: C.tm, fontWeight: 600, fontSize: 11, textAlign: i ? "right" : "left" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  <tr><td style={{ ...cell, fontWeight: 600 }}>Gross</td><td style={cell}>{wIn("slip_gross", "Slip gross")}</td><td style={cell}>{wIn("ind_gross", "Indicator gross")}</td><td style={{ ...cell, textAlign: "right" }}><Diff d={v.diffs.gross} tol={tol} /></td></tr>
                  <tr><td style={{ ...cell, fontWeight: 600 }}>Tare</td><td style={cell}>{wIn("slip_tare", "Slip tare")}</td><td style={cell}>{wIn("ind_tare", "Indicator tare")}</td><td style={{ ...cell, textAlign: "right" }}><Diff d={v.diffs.tare} tol={tol} /></td></tr>
                  <tr style={{ borderTop: `1px solid ${C.bdr}` }}>
                    <td style={{ ...cell, fontWeight: 700 }}>Net</td>
                    <td style={cell}>{wIn("slip_net", "Slip net")}{calcNet !== "" && rec.slip_net !== "" && calcNet !== rec.slip_net && <div style={{ fontSize: 10, color: C.no, textAlign: "right", marginTop: 3 }}>Gross − tare = {kg(calcNet)}</div>}</td>
                    <td style={{ ...cell, textAlign: "right", fontSize: 15, fontWeight: 600, color: C.tm, fontVariantNumeric: "tabular-nums" }}>{v.indicator_net === null ? "—" : v.indicator_net.toLocaleString("en-IN")}</td>
                    <td style={{ ...cell, textAlign: "right" }}><Diff d={v.diffs.net} tol={tol} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11, color: C.td, marginTop: 6 }}>Type the indicator readings yourself from the weighbridge display (or its photo) — never copy them from the slip. Tolerance: {tol} kg. {rec.slip_net !== "" && `Net = ${mt(rec.slip_net)}.`}</div>

            <div style={{ marginTop: 16 }}><Grid min={200}>
              <Field label={f.direction === "outward" ? "Tare time (1st weighment)" : "Gross time (1st weighment)"}>
                <div style={{ display: "flex", gap: 6 }}><input style={inp} type="datetime-local" value={f.direction === "outward" ? f.tare_time : f.gross_time} onChange={on(f.direction === "outward" ? "tare_time" : "gross_time")} /><Btn onClick={stamp(f.direction === "outward" ? "tare_time" : "gross_time")}>Now</Btn></div>
              </Field>
              <Field label={f.direction === "outward" ? "Gross time (2nd weighment)" : "Tare time (2nd weighment)"}>
                <div style={{ display: "flex", gap: 6 }}><input style={inp} type="datetime-local" value={f.direction === "outward" ? f.gross_time : f.tare_time} onChange={on(f.direction === "outward" ? "gross_time" : "tare_time")} /><Btn onClick={stamp(f.direction === "outward" ? "gross_time" : "tare_time")}>Now</Btn></div>
              </Field>
              <Field label="Operator"><input style={inp} value={f.operator} onChange={on("operator")} /></Field>
              <Field label="Remarks" span><textarea style={{ ...inp, minHeight: 56, resize: "vertical" }} value={f.remarks} onChange={on("remarks")} placeholder="Seal no., moisture, driver statement, reason for re-weighing…" /></Field>
            </Grid></div>
          </fieldset>
        </div>

        <div style={{ position: "sticky", top: 0 }}>
          <SectionTitle>Verification</SectionTitle>
          <Banner st={st} v={v} />
          {f.decision && <div style={{ fontSize: 11, color: C.tm, marginTop: 6 }}>Automatic result: <strong style={{ color: STATUS[v.status].c }}>{STATUS[v.status].l}</strong></div>}
          <Checks v={v} />

          {isAdmin && <div style={{ marginTop: 18, background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Admin decision</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {[["", "No decision", C.tm], ["approved", "Approve", "#22D3EE"], ["rejected", "Reject", C.no]].map(([k, l, c]) => (
                <button key={k} onClick={() => setF(p => ({ ...p, decision: k }))} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${f.decision === k ? c : C.bdr}`, background: f.decision === k ? `${c}22` : "transparent", color: f.decision === k ? c : C.tm, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
              ))}
            </div>
            {f.decision && <input style={inp} value={f.decision_note} onChange={on("decision_note")} placeholder={f.decision === "rejected" ? "Reason (required) — e.g. gross edited on slip" : "Note — e.g. re-weighed, indicator confirmed"} />}
            {item?.decision_by && <div style={{ fontSize: 11, color: C.td, marginTop: 6 }}>Last decision by {item.decision_by} · {dtfmt(item.decision_at)}</div>}
          </div>}

          {!!item?.history?.length && <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.td, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Audit trail</div>
            {[...item.history].reverse().map((h, i) => <div key={i} style={{ fontSize: 11, color: C.tm, padding: "3px 0" }}>{dtfmt(h.at)} · <strong style={{ color: C.tx }}>{h.by}</strong> {h.action} · <span style={{ color: STATUS[h.status]?.c }}>{STATUS[h.status]?.l}</span></div>)}
          </div>}
        </div>
      </div>
    </Modal>
  );
};

// ========== VEHICLE ==========
export const VehicleModal = ({ item, data, isAdmin, save, remove, notify, onClose }) => {
  const isNew = !item?.id;
  const [f, setF, on] = useForm({ vehicle_no: "", vehicle_type: "", owner_name: "", transporter: "", driver_name: "", phone: "", std_tare: "", gvw: "", rc_expiry: "", blacklisted: false, blacklist_reason: "", notes: "", ...item });
  const [busy, run] = useSubmit(notify, onClose);
  const guarded = !isAdmin && !isNew; // tare, GVW and block status are admin-only once a vehicle exists
  const vno = normVehicle(f.vehicle_no);
  const dup = vno && data.vehicles.find(x => x.id !== item?.id && x.vehicle_no === vno);
  const trips = data.weighments.filter(w => w.vehicle_no === vno && Number(w.slip_tare) > 0);
  const tares = trips.map(w => Number(w.slip_tare));
  const avg = tares.length ? Math.round(tares.reduce((a, b) => a + b, 0) / tares.length) : null;

  const submit = () => {
    if (!vno) return notify("Enter the vehicle number", "error");
    if (dup) return notify(`${vno} is already in the register`, "error");
    if (f.blacklisted && !String(f.blacklist_reason).trim()) return notify("Write why the vehicle is blocked", "error");
    run(() => save("vehicles", { ...f, vehicle_no: vno, std_tare: num(f.std_tare), gvw: num(f.gvw) }), isNew ? "Vehicle added" : "Vehicle updated");
  };
  const del = () => window.confirm(`Remove ${item.vehicle_no} from the register?`) && run(() => remove("vehicles", item.id), "Vehicle removed");

  return (
    <Modal w={720} title={isNew ? "Add vehicle" : item.vehicle_no} onClose={onClose} footer={<>
      {!isNew && isAdmin && <Btn kind="danger" icon="trash" onClick={del} disabled={busy} style={{ marginRight: "auto" }}>Remove</Btn>}
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" icon="check" onClick={submit} disabled={busy}>Save</Btn>
    </>}>
      <Grid>
        <Field label="Vehicle no. *"><input style={{ ...inp, textTransform: "uppercase", borderColor: dup || (vno && !isValidVehicle(vno)) ? C.wn : C.bdr }} value={f.vehicle_no} onChange={on("vehicle_no")} placeholder="JH05AB1234" autoFocus={isNew} /></Field>
        <Field label="Vehicle type"><select style={inp} value={f.vehicle_type} onChange={on("vehicle_type")}><option value="">Select…</option><Opts list={VEHICLE_TYPES} /></select></Field>
        <Field label="Owner (as per RC)"><input style={inp} value={f.owner_name} onChange={on("owner_name")} /></Field>
        <Field label="Transporter"><input style={inp} value={f.transporter} onChange={on("transporter")} /></Field>
        <Field label="Regular driver"><input style={inp} value={f.driver_name} onChange={on("driver_name")} /></Field>
        <Field label="Driver phone"><input style={inp} value={f.phone} onChange={on("phone")} /></Field>
        <Field label="Standard tare (kg)"><input style={inp} type="number" min="0" value={f.std_tare} onChange={on("std_tare")} placeholder="Empty weight" disabled={guarded} /></Field>
        <Field label="GVW / permitted gross (kg)"><input style={inp} type="number" min="0" value={f.gvw} onChange={on("gvw")} placeholder="From RC" disabled={guarded} /></Field>
        <Field label="RC / fitness valid till"><input style={inp} type="date" value={f.rc_expiry} onChange={on("rc_expiry")} /></Field>
        <Field label="Notes" span><input style={inp} value={f.notes} onChange={on("notes")} /></Field>
      </Grid>
      {vno && !isValidVehicle(vno) && <div style={{ fontSize: 12, color: C.wn, marginTop: 10 }}>{vno} doesn't look like a registration number. Check it against the RC.</div>}
      {avg !== null && <div style={{ marginTop: 14, fontSize: 12, color: C.tm, background: C.sf, border: `1px solid ${C.bdr}`, padding: "10px 12px", borderRadius: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span>Tare from {tares.length} trip{tares.length === 1 ? "" : "s"}: average <strong style={{ color: C.tx }}>{kg(avg)}</strong>, range {kg(Math.min(...tares))} – {kg(Math.max(...tares))}</span>
        {Number(f.std_tare) !== avg && !guarded && <Btn onClick={() => setF(p => ({ ...p, std_tare: avg }))}>Use average as standard</Btn>}
      </div>}
      {isAdmin ? <>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={!!f.blacklisted} onChange={e => setF(p => ({ ...p, blacklisted: e.target.checked }))} /> Block this vehicle (every slip will fail verification)
        </label>
        {f.blacklisted && <div style={{ marginTop: 8 }}><input style={inp} value={f.blacklist_reason} onChange={on("blacklist_reason")} placeholder="Reason — e.g. tare manipulation found on 12 Sep" /></div>}
      </> : f.blacklisted ? <div style={{ marginTop: 16, fontSize: 12, color: C.no, background: C.noD, padding: "8px 12px", borderRadius: 10 }}>Blocked by admin: {f.blacklist_reason}</div>
      : guarded && <div style={{ marginTop: 12, fontSize: 11, color: C.td }}>Standard tare and GVW can only be changed by an admin.</div>}
    </Modal>
  );
};

// ========== SETTINGS ==========
const SETTING_FIELDS = [
  ["division_kg", "Indicator division (kg)", "Smallest step the display shows, e.g. 10 or 20 kg"],
  ["tolerance_kg", "Slip vs indicator tolerance (kg)", "Above this the slip is a mismatch. 0 = must match exactly"],
  ["tare_variation_pct", "Tare variation allowed (%)", "Difference from the vehicle's standard tare"],
  ["shortage_pct", "Challan shortage / excess allowed (%)", "Net weight vs party's challan weight"],
  ["min_gap_minutes", "Minimum gap between weighments (min)", "Faster than this is flagged"],
  ["repeat_minutes", "Repeat-weighing window (min)", "Same vehicle weighed again within this time is flagged"],
];
export const SettingsModal = ({ settings, saveSettings, notify, onClose }) => {
  const [f, , on] = useForm({ ...DEFAULT_SETTINGS, ...settings });
  const [busy, run] = useSubmit(notify, onClose);
  const submit = () => {
    const out = Object.fromEntries(SETTING_FIELDS.map(([k]) => [k, num(f[k])]));
    if (Object.values(out).some(x => x === "" || x < 0)) return notify("Every setting needs a number (0 or more)", "error");
    run(() => saveSettings(out), "Settings saved — new slips use them");
  };
  return (
    <Modal w={620} title="Verification settings" onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon="check" onClick={submit} disabled={busy}>Save</Btn></>}>
      <Grid min={260}>
        {SETTING_FIELDS.map(([k, l, hint]) => <Field key={k} label={l}>
          <input style={inp} type="number" min="0" step="any" value={f[k]} onChange={on(k)} />
          <span style={{ fontSize: 10, color: C.td, display: "block", marginTop: 4 }}>{hint}</span>
        </Field>)}
      </Grid>
      <div style={{ fontSize: 11, color: C.td, marginTop: 14 }}>Changes apply to slips saved from now on. Open and save an older slip to re-check it with the new settings.</div>
    </Modal>
  );
};

