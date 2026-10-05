import React, { useState, useCallback } from "react";
import { C, Ico, Btn, Card, Empty, downloadCsv } from "../ui";
import { useWeighbridge, today } from "./store";
import { STATUS, statusOf, DIRECTIONS } from "./common";
import { WeighmentModal, VehicleModal, SettingsModal } from "./modals";
import { Overview, Slips, Vehicles } from "./views";
import { printReports } from "./print";

const TABS = [
  { k: "overview", l: "Overview", i: "chart" },
  { k: "slips", l: "Slip register", i: "doc" },
  { k: "vehicles", l: "Vehicles", i: "truck" },
];

export default function Weighbridge({ notify, user }) {
  const { data, settings, ctx, mode, error, loading, load, save, saveSettings, remove, seed } = useWeighbridge();
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null); // { type: "slip" | "vehicle" | "settings", item }
  const [filter, setFilter] = useState({ status: "", from: "", to: "" });
  const isAdmin = user?.role === "admin";

  const close = useCallback(() => setModal(null), []);
  const open = (type, item = {}) => setModal({ type, item });
  const pending = data.weighments.filter(w => !w.decision && w.verification?.status === "mismatch").length;
  const tabs = TABS.map(t => t.k === "slips" ? { ...t, n: pending } : t);

  const print = list => printReports(list) || notify("Allow pop-ups to print the report", "error");
  const exportCsv = list => downloadCsv(`kre-weighbridge-${today()}.csv`, [
    ["Slip no", "Date", "Direction", "Vehicle", "Driver", "Party", "Material", "Challan no", "Challan wt (kg)", "Slip gross", "Slip tare", "Slip net", "Indicator gross", "Indicator tare", "Indicator net", "Diff gross", "Diff tare", "Diff net", "Gross time", "Tare time", "Status", "Problems", "Decision by", "Decision note", "Operator", "Remarks"],
    ...list.map(w => { const v = w.verification || {}; return [w.slip_no, w.date, (DIRECTIONS.find(d => d[0] === w.direction) || [, ""])[1], w.vehicle_no, w.driver_name, w.party, w.material, w.challan_no, w.challan_weight, w.slip_gross, w.slip_tare, w.slip_net, w.ind_gross, w.ind_tare, v.indicator_net, v.diffs?.gross, v.diffs?.tare, v.diffs?.net, w.gross_time, w.tare_time, STATUS[statusOf(w)].l, (v.checks || []).filter(c => c.status === "fail" || c.status === "warn").map(c => `${c.label}: ${c.detail}`).join(" | "), w.decision_by, w.decision_note, w.operator || w.entered_by, w.remarks]; }),
  ]);

  const m = { data, ctx, isAdmin, save, remove, notify, onClose: close };
  const v = { data, open, setTab, filter, setFilter, onPrint: print, onExport: exportCsv };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Weighbridge Verification</div>
          <div style={{ fontSize: 12, color: C.tm, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: mode === "api" ? C.ok : mode === "error" ? C.no : C.wn }} />
            {mode === "api" ? "Synced with server · every slip is re-checked on save" : mode === "local" ? "Saved on this device only — backend weighbridge API not found" : mode === "error" ? "Not connected to the server" : "Connecting…"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn icon="ref" onClick={load}>Refresh</Btn>
          {isAdmin && <Btn icon="shield" onClick={() => open("settings")}>Settings</Btn>}
          <Btn icon="truck" onClick={() => open("vehicle")}>Add vehicle</Btn>
          <Btn kind="primary" icon="plus" onClick={() => open("slip")}>New weighment</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", borderBottom: `1px solid ${C.bdr}` }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: "10px 14px", border: "none", borderBottom: `2px solid ${tab === t.k ? C.ok : "transparent"}`, background: "transparent", color: tab === t.k ? C.ok : C.tm, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontFamily: "inherit" }}>
            <Ico t={t.i} s={15} c={tab === t.k ? C.ok : C.tm} /> {t.l}
            {t.n > 0 && <span style={{ background: C.no, color: "#fff", fontSize: 10, borderRadius: 10, padding: "1px 6px", fontWeight: 700 }}>{t.n}</span>}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 60, color: C.tm }}>Loading...</div>
      : mode === "error" ? (
        <Card><Empty icon="alert" title="Can't reach the server" sub={`${error} Check your internet connection, then press Refresh.`}>
          <Btn kind="primary" icon="ref" onClick={load}>Refresh</Btn>
        </Empty></Card>
      )
      : !data.weighments.length && tab !== "vehicles" ? (
        <Card><Empty icon="scale" title="Verify your first weighbridge slip" sub="Enter the weights printed on the software slip and the weights shown on the weighbridge indicator. Every slip is checked for mismatch, wrong net, tare tampering and repeat weighing.">
          <Btn kind="primary" icon="plus" onClick={() => open("slip")}>New weighment</Btn>
          <Btn icon="truck" onClick={() => setTab("vehicles")}>Set up vehicle register</Btn>
          {mode === "local" && <Btn icon="ref" onClick={() => { seed(); notify("Sample slips loaded — delete them any time"); }}>Load sample data</Btn>}
        </Empty></Card>
      ) : <>
        {tab === "overview" && <Overview {...v} />}
        {tab === "slips" && <Slips {...v} />}
        {tab === "vehicles" && <Vehicles {...v} />}
      </>}

      {modal?.type === "slip" && <WeighmentModal {...m} item={modal.item} me={user?.name || ""} />}
      {modal?.type === "vehicle" && <VehicleModal {...m} item={modal.item} />}
      {modal?.type === "settings" && <SettingsModal settings={settings} saveSettings={saveSettings} notify={notify} onClose={close} />}
    </div>
  );
}
