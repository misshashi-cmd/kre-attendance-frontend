import React, { useMemo, useState } from "react";
import { C, Ico, Btn, Modal, Field, Grid, inp, useForm, useSubmit, num, Opts, SectionTitle } from "../ui";
import { today, nowLocal } from "./store";
import { verifyWeighment, normVehicle, isValidVehicle, DEFAULT_SETTINGS, STATUS, CHECK, GROUPS, DIRECTIONS, MATERIALS, VEHICLE_TYPES, kg, mt, signedKg, dtfmt } from "./common";
import { printReports } from "./print";
import { PhotoTile } from "./photos";
import { call } from "../api";

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
// Slip field <- slip photo reading field (same map as the API)
const SLIP_FROM_PHOTO = { slip_no: "slip_no", vehicle_no: "vehicle_no", date: "date", slip_gross: "gross_kg", slip_tare: "tare_kg", slip_net: "net_kg", gross_time: "gross_time", tare_time: "tare_time" };

export const WeighmentModal = ({ item, data, ctx, isAdmin, me, save, remove, notify, onClose }) => {
  const isNew = !item?.id;
  const [f, setF, on] = useForm({ slip_no: "", date: today(), direction: "inward", vehicle_no: "", driver_name: "", party: "", material: "", challan_no: "", challan_weight: "",
    slip_gross: "", slip_tare: "", slip_net: "", ind_gross: "", ind_tare: "", gross_time: "", tare_time: "", operator: me, remarks: "", decision: "", decision_note: "",
    slip_photo_id: "", gross_photo_id: "", tare_photo_id: "", source: {}, photo_meta: {}, ...item });
  const [previews, setPreviews] = useState({});
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

  // Photo readings fill the form the same way the server does when it saves (weighbridgeHooks.js).
  const onSlipPhoto = ph => {
    const r = ph.reading;
    setPreviews(p => ({ ...p, slip: ph.preview }));
    setF(p => {
      const n = { ...p, slip_photo_id: ph.id, source: { ...p.source }, photo_meta: { ...p.photo_meta, slip: { is_slip: r.is_slip, readable: r.readable, notes: r.notes || "" } } };
      for (const [k, rk] of Object.entries(SLIP_FROM_PHOTO)) {
        if (r.is_slip && r[rk] !== null && r[rk] !== undefined && r[rk] !== "") { n[k] = k === "vehicle_no" ? normVehicle(r[rk]) : r[rk]; n.source[k] = "photo"; }
        else if (n.source[k] === "photo") delete n.source[k];
      }
      for (const k of ["party", "material"]) if (!n[k] && r.is_slip && r[k]) n[k] = r[k];
      return n;
    });
    if (!r.is_slip) notify("That photo is not a weighbridge slip — take it again", "error");
    else if (!r.readable) notify("Slip photo is not clear — take it again", "error");
  };
  const onIndicatorPhoto = which => ph => {
    const r = ph.reading, ok = r.is_indicator && r.readable && r.weight_kg !== null;
    setPreviews(p => ({ ...p, [which]: ph.preview }));
    setF(p => {
      const source = { ...p.source };
      if (ok) source[`ind_${which}`] = "photo"; else delete source[`ind_${which}`];
      return { ...p, [`${which}_photo_id`]: ph.id, [`ind_${which}`]: ok ? r.weight_kg : "", source,
        photo_meta: { ...p.photo_meta, [which]: { is_indicator: r.is_indicator, readable: r.readable, display_text: r.display_text, stable: r.stable, notes: r.notes || "" } } };
    });
    if (!r.is_indicator) notify("That photo doesn't show the weighbridge indicator — take it again", "error");
    else if (!ok) notify("Indicator display is not readable — take the photo again", "error");
    else if (r.stable === false) notify("Indicator was not stable (MOTION) — wait for STABLE and retake", "error");
  };
  const fromPhoto = k => f.source?.[k] === "photo";
  const slipSummary = () => {
    const m = f.photo_meta?.slip;
    if (!f.slip_photo_id || !m) return null;
    if (m.is_slip === false) return ["Not a weighbridge slip — retake", true];
    if (!m.readable) return ["Not clear — retake the photo", true];
    return [`Slip ${f.slip_no || "?"} · ${f.vehicle_no || "?"} · G ${kg(f.slip_gross)} · T ${kg(f.slip_tare)} · N ${kg(f.slip_net)}${m.notes ? ` · ⚠ ${m.notes}` : ""}`, !!m.notes];
  };
  const indSummary = which => {
    const m = f.photo_meta?.[which];
    if (!f[`${which}_photo_id`] || !m) return null;
    if (m.is_indicator === false) return ["Not the indicator display — retake", true];
    if (!m.readable || !fromPhoto(`ind_${which}`)) return ["Display not readable — retake", true];
    return [`Display "${m.display_text}" = ${kg(f[`ind_${which}`])}${m.stable === false ? " · MOTION — retake when STABLE" : m.stable ? " · stable" : ""}${m.notes ? ` · ${m.notes}` : ""}`, m.stable === false];
  };

  const submit = () => {
    if (!String(f.slip_no).trim()) return notify("Enter the slip number", "error");
    if (!rec.vehicle_no) return notify("Enter the vehicle number", "error");
    if (f.decision === "rejected" && !String(f.decision_note).trim()) return notify("Write why the slip is rejected", "error");
    const out = { ...rec, slip_no: String(f.slip_no).trim() };
    if (out.slip_net === "" && calcNet !== "" && !f.slip_photo_id) out.slip_net = calcNet;
    if (!isAdmin) { delete out.decision; delete out.decision_note; }
    run(() => save("weighments", out), isNew ? `Slip ${out.slip_no} saved — ${STATUS[out.decision || verifyWeighment(out, ctx).status].l}` : "Weighment updated");
  };
  const del = () => window.confirm(`Delete slip ${item.slip_no}? This cannot be undone.`) && run(() => remove("weighments", item.id), "Weighment deleted");

  // A plain function (not a component) so the inputs keep focus while typing.
  // Indicator readings only come from photos (admins may type one when a photo can't be read);
  // slip values read from the photo can't be changed by operators.
  const wIn = (k, label) => {
    const ro = locked || (!isAdmin && (k.startsWith("ind_") || fromPhoto(k)));
    return <input style={{ ...inp, textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 15, fontWeight: 600, ...(fromPhoto(k) ? { borderColor: `${C.ok}66`, background: C.okD } : {}) }}
      type="number" min="0" step="1" inputMode="numeric" value={f[k] ?? ""} onChange={on(k)} disabled={ro} aria-label={label}
      placeholder={k.startsWith("ind_") && !isAdmin ? "photo" : ""} title={fromPhoto(k) ? "Read from photo" : undefined} />;
  };
  const ro = k => !isAdmin && fromPhoto(k);
  const [ss, gs, ts] = [slipSummary(), indSummary("gross"), indSummary("tare")];
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
          <SectionTitle>Photos — weights are read from these, not typed</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
            <PhotoTile kind="slip" title="1 · Software slip" hint="Whole printed slip, flat, no glare" photoId={f.slip_photo_id} preview={previews.slip} summary={ss?.[0]} error={ss?.[1]} disabled={locked} onPhoto={onSlipPhoto} notify={notify} />
            <PhotoTile kind="indicator" title="2 · Indicator — gross" hint="Display while the loaded truck is on the bridge" photoId={f.gross_photo_id} preview={previews.gross} summary={gs?.[0]} error={gs?.[1]} disabled={locked} onPhoto={onIndicatorPhoto("gross")} notify={notify} />
            <PhotoTile kind="indicator" title="3 · Indicator — tare" hint="Display while the empty truck is on the bridge" photoId={f.tare_photo_id} preview={previews.tare} summary={ts?.[0]} error={ts?.[1]} disabled={locked} onPhoto={onIndicatorPhoto("tare")} notify={notify} />
          </div>

          <SectionTitle>Trip details</SectionTitle>
          <fieldset disabled={locked} style={{ border: "none", padding: 0, margin: 0 }}>
            <Grid min={140}>
              <Field label="Slip no. *"><input style={inp} value={f.slip_no} onChange={on("slip_no")} disabled={ro("slip_no")} /></Field>
              <Field label="Date"><input style={inp} type="date" value={f.date} onChange={on("date")} disabled={ro("date")} /></Field>
              <Field label="Direction"><select style={inp} value={f.direction} onChange={on("direction")}><Opts list={DIRECTIONS} /></select></Field>
              <Field label="Vehicle no. *">
                <input style={{ ...inp, textTransform: "uppercase", borderColor: rec.vehicle_no && !isValidVehicle(rec.vehicle_no) ? C.wn : C.bdr }} list="wb-vehicles" value={f.vehicle_no} onChange={onVehicle} placeholder="JH05AB1234" disabled={ro("vehicle_no")} />
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
            <div style={{ fontSize: 11, color: C.td, marginTop: 6 }}>Green values were read from the photos. Indicator readings come only from the indicator photos{isAdmin ? " (admins can type one when the photo can't be read)" : ""}. Tolerance: {tol} kg. {rec.slip_net !== "" && `Net = ${mt(rec.slip_net)}.`}</div>

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

          {item?.alert && <div style={{ marginTop: 18, fontSize: 11, color: item.alert.error || item.alert.failed?.length ? C.wn : C.tm, background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "8px 10px" }}>
            <Ico t="chat" s={12} c={C.tm} /> WhatsApp alert {dtfmt(item.alert.at)}: {item.alert.error ? item.alert.error
              : `sent to ${item.alert.sent.length} number${item.alert.sent.length === 1 ? "" : "s"}${item.alert.failed.length ? `, failed for ${item.alert.failed.map(x => x.phone).join(", ")}` : ""}`}
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
  const [f, , on] = useForm({ ...DEFAULT_SETTINGS, alert_numbers: "", alert_on: "mismatch", ...settings });
  const [busy, run] = useSubmit(notify, onClose);
  const [testing, setTesting] = useState(false);
  const phones = String(f.alert_numbers || "").split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
  const badPhones = phones.filter(p => { const d = p.replace(/\D/g, ""); return d.length < 10 || d.length > 15; });
  const submit = () => {
    const out = Object.fromEntries(SETTING_FIELDS.map(([k]) => [k, num(f[k])]));
    if (Object.values(out).some(x => x === "" || x < 0)) return notify("Every setting needs a number (0 or more)", "error");
    if (badPhones.length) return notify(`Check this WhatsApp number: ${badPhones[0]}`, "error");
    run(() => saveSettings({ ...out, alert_numbers: phones.join("\n"), alert_on: f.alert_on }), "Settings saved — new slips use them");
  };
  const test = async () => {
    if (!phones.length) return notify("Add at least one WhatsApp number", "error");
    setTesting(true);
    try {
      const r = await call("/weighbridge/alerts/test", { method: "POST", body: JSON.stringify({ numbers: phones.join(",") }) });
      notify(r.failed.length ? `Sent to ${r.sent.length}; failed for ${r.failed.map(x => `${x.phone} (${x.error})`).join(", ")}` : `Test alert sent to ${r.sent.length} number${r.sent.length === 1 ? "" : "s"}`, r.failed.length ? "error" : "success");
    } catch (e) { notify(e.message, "error"); }
    setTesting(false);
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

      <div style={{ marginTop: 22, borderTop: `1px solid ${C.bdr}`, paddingTop: 18 }}>
        <SectionTitle>WhatsApp alerts (WATI)</SectionTitle>
        <Grid min={260}>
          <Field label="Send alerts to (one number per line)" span>
            <textarea style={{ ...inp, minHeight: 80, resize: "vertical", borderColor: badPhones.length ? C.wn : C.bdr }} value={f.alert_numbers} onChange={on("alert_numbers")} placeholder={"98000 00001  (Boss)\n98000 00002  (Accounts)"} />
            <span style={{ fontSize: 10, color: badPhones.length ? C.wn : C.td, display: "block", marginTop: 4 }}>{badPhones.length ? `Not a phone number: ${badPhones.join(", ")}` : "10-digit Indian numbers are fine; 91 is added automatically. Leave empty to send no alerts."}</span>
          </Field>
          <Field label="Send an alert when">
            <select style={inp} value={f.alert_on} onChange={on("alert_on")}><Opts list={[["mismatch", "A slip is a Mismatch"], ["mismatch_review", "Mismatch or Needs review (more messages)"], ["off", "Never (alerts off)"]]} /></select>
          </Field>
          <div style={{ display: "flex", alignItems: "flex-end" }}><Btn icon="chat" onClick={test} disabled={testing}>{testing ? "Sending…" : "Send test alert"}</Btn></div>
        </Grid>
        <div style={{ fontSize: 11, color: C.td, marginTop: 10 }}>One message per slip when it becomes a mismatch — editing it again doesn't resend. The message uses the WhatsApp template approved in WATI.</div>
      </div>
    </Modal>
  );
};

