import React, { useState, useCallback } from "react";
import { C, Ico, Btn, Card, Empty, downloadCsv } from "../ui";
import { useCrm, today } from "./store";
import { stageOf, isOpen, PRIORITY } from "./common";
import { LeadModal, ActivityModal, ImportModal } from "./modals";
import { Overview, Pipeline, Leads, FollowUps } from "./views";

export default function Crm({ notify, user }) {
  const { data, mode, loading, load, save, remove, seed } = useCrm();
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null); // { type: "lead" | "act" | "import", item }

  const close = useCallback(() => setModal(null), []);
  const open = (type, item = {}) => setModal({ type, item });
  const me = user?.name || "";
  const owners = [...new Set(data.leads.map(l => l.owner).filter(Boolean))].sort();
  const due = data.leads.filter(l => isOpen(l) && l.next_follow_up && l.next_follow_up <= today()).length;
  const m = { save, remove, notify, onClose: close, me };
  const v = { data, open, save, notify, setTab, owners, me };

  const tabs = [
    { k: "overview", l: "Overview", i: "chart" },
    { k: "pipeline", l: "Pipeline", i: "funnel" },
    { k: "leads", l: "All leads", i: "users" },
    { k: "followups", l: "Follow-ups", i: "clock", n: due },
  ];

  const exportCsv = () => {
    if (!data.leads.length) return notify("No leads to export", "error");
    downloadCsv(`kre-leads-${today()}.csv`, [
      ["Company", "Contact", "Designation", "Phone", "Email", "City", "Product", "Quantity", "Unit", "Value", "Stage", "Priority", "Source", "Salesperson", "Next follow-up", "Next action", "Expected closing", "Lost reason", "Created", "Notes"],
      ...data.leads.map(l => [l.company, l.contact_name, l.designation, l.phone, l.email, l.city, l.product, l.quantity, l.unit, l.value, stageOf(l.stage).l, PRIORITY[l.priority]?.[1], l.source, l.owner, l.next_follow_up, l.next_action, l.expected_close, l.lost_reason, l.created_on, l.notes]),
    ]);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Sales Leads</div>
          <div style={{ fontSize: 12, color: C.tm, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: mode === "api" ? C.ok : C.wn }} />
            {mode === "api" ? "Synced with server" : mode === "local" ? "Saved on this device only — backend CRM API not found" : "Connecting…"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn icon="ref" onClick={load}>Refresh</Btn>
          <Btn icon="upload" onClick={() => open("import")}>Import from Excel</Btn>
          <Btn icon="dl" onClick={exportCsv}>Export CSV</Btn>
          <Btn icon="edit" onClick={() => data.leads.some(isOpen) ? open("act") : notify("Add a lead first", "error")}>Log activity</Btn>
          <Btn kind="primary" icon="plus" onClick={() => open("lead")}>Add lead</Btn>
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
      : !data.leads.length ? (
        <Card><Empty icon="funnel" title="Start tracking leads" sub="Add enquiries from IndiaMART, calls, WhatsApp or walk-ins, and never miss a follow-up.">
          <Btn kind="primary" icon="plus" onClick={() => open("lead")}>Add first lead</Btn>
          <Btn icon="upload" onClick={() => open("import")}>Import from Excel</Btn>
          {mode === "local" && <Btn icon="ref" onClick={() => { seed(); notify("Sample leads loaded — delete them any time"); }}>Load sample data</Btn>}
        </Empty></Card>
      ) : <>
        {tab === "overview" && <Overview {...v} />}
        {tab === "pipeline" && <Pipeline {...v} />}
        {tab === "leads" && <Leads {...v} />}
        {tab === "followups" && <FollowUps {...v} />}
      </>}

      {modal?.type === "lead" && <LeadModal {...m} lead={modal.item} leads={data.leads} activities={data.activities} onLog={a => open("act", a)} />}
      {modal?.type === "act" && <ActivityModal {...m} act={modal.item} leads={data.leads} />}
      {modal?.type === "import" && <ImportModal {...m} leads={data.leads} />}
    </div>
  );
}
