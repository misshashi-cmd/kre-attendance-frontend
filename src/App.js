import React, { useState, useEffect, useCallback } from "react";

const API = "http://localhost:5000/api";
const OFFICE_LAT = 22.8046, OFFICE_LNG = 86.2029, GEO_RADIUS = 500, SHIFT = "09:00";

let token = null;
const call = async (path, opts = {}) => {
  const h = { "Content-Type": "application/json", ...opts.headers };
  if (token) h["Authorization"] = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`, { ...opts, headers: h });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Error");
  return d;
};

const dist = (a, b, c, d) => {
  const R = 6371e3, p = Math.PI / 180;
  const x = 0.5 - Math.cos((c - a) * p) / 2 + Math.cos(a * p) * Math.cos(c * p) * (1 - Math.cos((d - b) * p)) / 2;
  return R * 2 * Math.asin(Math.sqrt(x));
};

const fmt = t => {
  if (!t) return "\u2014";
  const [h, m] = t.slice(0, 5).split(":");
  const hr = +h;
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

const ini = n => n ? n.split(" ").map(x => x[0]).join("").slice(0, 2) : "?";

const C = {
  bg: "#0B0F1A", card: "#131825", bdr: "#1E2740",
  ok: "#4ADE80", okD: "rgba(74,222,128,0.12)", okG: "rgba(74,222,128,0.25)",
  no: "#F87171", noD: "rgba(248,113,113,0.12)",
  wn: "#FBBF24", wnD: "rgba(251,191,36,0.12)",
  in: "#60A5FA", inD: "rgba(96,165,250,0.12)",
  tx: "#F1F5F9", tm: "#94A3B8", td: "#64748B", sf: "#0F1422",
};

const Ico = ({ t, s = 20, c = "currentColor" }) => {
  const p = {
    mapPin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" fill="none" stroke={c} strokeWidth="1.5"/><circle cx="12" cy="10" r="3" fill="none" stroke={c} strokeWidth="1.5"/></>,
    check: <path d="M20 6L9 17l-5-5" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
    out: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><path d="M16 17l5-5-5-5M21 12H9" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" fill="none" stroke={c} strokeWidth="1.5"/><circle cx="9" cy="7" r="4" fill="none" stroke={c} strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" fill="none" stroke={c} strokeWidth="1.5"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="none" stroke={c} strokeWidth="1.5"/><line x1="12" y1="9" x2="12" y2="13" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></>,
    chart: <><rect x="18" y="3" width="4" height="18" rx="1" fill="none" stroke={c} strokeWidth="1.5"/><rect x="10" y="8" width="4" height="13" rx="1" fill="none" stroke={c} strokeWidth="1.5"/><rect x="2" y="13" width="4" height="8" rx="1" fill="none" stroke={c} strokeWidth="1.5"/></>,
    cal: <><rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke={c} strokeWidth="1.5"/><line x1="16" y1="2" x2="16" y2="6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke={c} strokeWidth="1.5"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke={c} strokeWidth="1.5"/>,
    in: <><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><path d="M10 17l5-5-5-5M15 12H3" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    ref: <><path d="M23 4v6h-6" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 20v-6h6" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none">{p[t]}</svg>;
};

const Av = ({ n, s = 40, c = C.ok }) => (
  <div style={{ width: s, height: s, borderRadius: "50%", background: `linear-gradient(135deg, ${c}22, ${c}44)`, border: `1.5px solid ${c}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: s * .35, fontWeight: 600, color: c, flexShrink: 0 }}>{ini(n)}</div>
);

const Badge = ({ status }) => {
  const m = { present: [C.ok, C.okD, "Present"], late: [C.wn, C.wnD, "Late"], absent: [C.no, C.noD, "Absent"], "on-leave": [C.in, C.inD, "On Leave"] };
  const [c, b, l] = m[status] || m.absent;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: c, background: b }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />{l}</span>;
};

const Stat = ({ icon, label, value, color, bg }) => (
  <div style={{ background: C.card, borderRadius: 16, padding: "20px 18px", border: `1px solid ${C.bdr}`, flex: "1 1 140px", minWidth: 130 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico t={icon} s={18} c={color} /></div>
      <span style={{ fontSize: 12, color: C.tm, fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
  </div>
);

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const c = type === "error" ? C.no : C.ok;
  return <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: C.card, border: `1px solid ${c}44`, borderRadius: 14, padding: "12px 20px", color: c, fontSize: 13, fontWeight: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", maxWidth: "90vw" }}>{msg}</div>;
};

// ========== LOGIN ==========
const Login = ({ onLogin }) => {
  const [id, setId] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true); setErr("");
    try {
      const d = await call("/auth/login", { method: "POST", body: JSON.stringify({ emp_id: id, password: pin }) });
      token = d.token;
      onLogin(d.employee);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at 30% 20%, ${C.okD} 0%, ${C.bg} 60%)`, padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, background: C.card, borderRadius: 24, padding: "48px 32px", border: `1px solid ${C.bdr}`, boxShadow: `0 24px 80px rgba(0,0,0,0.5)` }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, margin: "0 auto 20px", background: `linear-gradient(135deg, ${C.ok}, #22D3EE)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 32px ${C.okG}` }}><Ico t="shield" s={30} c="#0B0F1A" /></div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.tx, margin: 0 }}>KRE Group</h1>
          <p style={{ fontSize: 13, color: C.tm, marginTop: 6 }}>Attendance Management System</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.tm, marginBottom: 6, display: "block" }}>Employee ID</label>
            <input value={id} onChange={e => setId(e.target.value)} placeholder="e.g. 1" style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.bdr}`, background: C.sf, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: C.tm, marginBottom: 6, display: "block" }}>PIN</label>
            <input value={pin} onChange={e => setPin(e.target.value)} type="password" placeholder="4-digit PIN" onKeyDown={e => e.key === "Enter" && go()} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.bdr}`, background: C.sf, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          {err && <div style={{ color: C.no, fontSize: 13, textAlign: "center", padding: "8px 12px", background: C.noD, borderRadius: 10 }}>{err}</div>}
          <button onClick={go} disabled={busy} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.ok}, #22D3EE)`, color: "#0B0F1A", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8, opacity: busy ? 0.7 : 1 }}>{busy ? "Signing in..." : "Sign In"}</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, padding: "10px 14px", background: C.sf, borderRadius: 10, border: `1px solid ${C.bdr}` }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.ok, boxShadow: `0 0 8px ${C.ok}` }} /><span style={{ fontSize: 11, color: C.tm }}>Connected to API at localhost:5000</span>
        </div>
        <p style={{ fontSize: 11, color: C.td, textAlign: "center", marginTop: 12 }}>Admin: ID 1 / PIN 1234 | Employee: ID 2 / PIN 2345</p>
      </div>
    </div>
  );
};

// ========== EMPLOYEE ==========
const Employee = ({ user, onLogout }) => {
  const [loc, setLoc] = useState(null);
  const [locL, setLocL] = useState(false);
  const [now, setNow] = useState(new Date());
  const [rec, setRec] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const load = useCallback(async () => { try { const d = await call("/attendance/today"); setRec(d.record); } catch (e) {} }, []);
  useEffect(() => { load(); }, [load]);

  const getLoc = useCallback(() => {
    setLocL(true);
    if (!navigator.geolocation) { setLoc({ lat: OFFICE_LAT + .001, lng: OFFICE_LNG + .001 }); setLocL(false); return; }
    navigator.geolocation.getCurrentPosition(p => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocL(false); }, () => { setLoc({ lat: OFFICE_LAT + .001, lng: OFFICE_LNG + .001 }); setLocL(false); }, { enableHighAccuracy: true, timeout: 10000 });
  }, []);
  useEffect(() => { getLoc(); }, [getLoc]);

  const d = loc ? dist(loc.lat, loc.lng, OFFICE_LAT, OFFICE_LNG) : null;
  const ok = d !== null && d <= GEO_RADIUS;
  const isIn = rec?.check_in && !rec?.check_out;
  const isOut = !!rec?.check_out;

  const act = async (a) => {
    if (!loc) return; setBusy(true);
    try { const r = await call(`/attendance/${a}`, { method: "POST", body: JSON.stringify({ latitude: loc.lat, longitude: loc.lng }) }); setRec(r.record); setToast({ msg: r.message, type: "success" }); }
    catch (e) { setToast({ msg: e.message, type: "error" }); }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.tx, padding: "0 0 40px" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Av n={user.name} s={38} /><div><div style={{ fontSize: 15, fontWeight: 600 }}>{user.name}</div><div style={{ fontSize: 11, color: C.tm }}>{user.department} · ID {user.emp_id}</div></div></div>
        <button onClick={onLogout} style={{ background: "transparent", border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "8px 14px", color: C.tm, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><Ico t="out" s={16} c={C.tm} /> Logout</button>
      </div>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-.03em", background: `linear-gradient(135deg, ${C.tx}, ${C.tm})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).toUpperCase()}</div>
          <div style={{ fontSize: 13, color: C.tm, marginTop: 4 }}>{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <div style={{ background: C.card, borderRadius: 16, padding: "16px 18px", border: `1px solid ${C.bdr}`, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: ok ? C.okD : C.noD, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico t="mapPin" s={20} c={ok ? C.ok : C.no} /></div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: ok ? C.ok : C.no }}>{locL ? "Detecting..." : ok ? "Within office range" : "Outside office range"}</div><div style={{ fontSize: 11, color: C.td }}>{d !== null ? `${Math.round(d)}m from office` : "Fetching GPS..."}</div></div>
          <button onClick={getLoc} style={{ background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}><Ico t="ref" s={14} c={C.tm} /></button>
        </div>
        <div style={{ textAlign: "center", margin: "28px 0" }}>
          {isOut ? (
            <div style={{ padding: 24, background: C.card, borderRadius: 20, border: `1px solid ${C.bdr}` }}><Ico t="check" s={40} c={C.ok} /><div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>Day completed</div><div style={{ fontSize: 13, color: C.tm, marginTop: 4 }}>{fmt(rec?.check_in)} — {fmt(rec?.check_out)}</div></div>
          ) : (
            <button onClick={() => act(isIn ? "checkout" : "checkin")} disabled={busy} style={{ width: 180, height: 180, borderRadius: "50%", border: "none", background: isIn ? `radial-gradient(circle, ${C.no}22 0%, ${C.card} 70%)` : `radial-gradient(circle, ${C.okD} 0%, ${C.card} 70%)`, cursor: busy ? "wait" : "pointer", boxShadow: isIn ? `0 0 0 3px ${C.no}33` : `0 0 0 3px ${C.okG}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: busy ? .6 : 1 }}>
              <Ico t={isIn ? "out" : "in"} s={36} c={isIn ? C.no : C.ok} />
              <span style={{ fontSize: 15, fontWeight: 700, marginTop: 10, color: isIn ? C.no : C.ok }}>{busy ? "Please wait..." : isIn ? "CHECK OUT" : "CHECK IN"}</span>
              {isIn && rec?.check_in && <span style={{ fontSize: 11, color: C.tm, marginTop: 4 }}>In since {fmt(rec.check_in)}</span>}
            </button>
          )}
        </div>
        {rec && <div style={{ background: C.card, borderRadius: 16, padding: 18, border: `1px solid ${C.bdr}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.tm, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>Today's record</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 11, color: C.td }}>Check-in</div><div style={{ fontSize: 16, fontWeight: 600 }}>{fmt(rec.check_in)}</div></div>
            <div style={{ width: 40, borderTop: `1px dashed ${C.bdr}` }} />
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: C.td }}>Check-out</div><div style={{ fontSize: 16, fontWeight: 600 }}>{fmt(rec.check_out)}</div></div>
            <Badge status={rec.status || "absent"} />
          </div>
        </div>}
      </div>
    </div>
  );
};

// ========== ADMIN ==========
const Admin = ({ user, onLogout }) => {
  const [tab, setTab] = useState("dashboard");
  const [dash, setDash] = useState({});
  const [att, setAtt] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, a, al] = await Promise.all([call("/admin/dashboard"), call("/admin/attendance/today"), call("/admin/alerts")]);
      setDash(d); setAtt(a.records || []); setAlerts(al.alerts || []);
    } catch (e) { setToast({ msg: e.message, type: "error" }); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const tabs = [{ k: "dashboard", l: "Dashboard", i: "chart" }, { k: "attendance", l: "Attendance", i: "cal" }, { k: "alerts", l: "Alerts", i: "alert" }];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.tx }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.bdr}`, background: C.card }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.ok}, #22D3EE)`, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico t="shield" s={18} c="#0B0F1A" /></div>
          <div><div style={{ fontSize: 16, fontWeight: 700 }}>KRE Attendance</div><div style={{ fontSize: 11, color: C.tm }}>Admin panel — live data</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={load} style={{ background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "7px 12px", color: C.tm, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}><Ico t="ref" s={14} c={C.tm} /> Refresh</button>
          <Av n={user.name} s={34} />
          <button onClick={onLogout} style={{ background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: "7px 12px", color: C.tm, cursor: "pointer", fontSize: 12 }}><Ico t="out" s={14} c={C.tm} /></button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "12px 24px", borderBottom: `1px solid ${C.bdr}`, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: tab === t.k ? C.okD : "transparent", color: tab === t.k ? C.ok : C.tm, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Ico t={t.i} s={15} c={tab === t.k ? C.ok : C.tm} /> {t.l}
            {t.k === "alerts" && alerts.length > 0 && <span style={{ background: C.no, color: "#fff", fontSize: 10, borderRadius: 10, padding: "1px 6px", fontWeight: 700 }}>{alerts.length}</span>}
          </button>
        ))}
      </div>
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        {loading ? <div style={{ textAlign: "center", padding: 60, color: C.tm }}>Loading...</div> : <>
          {tab === "dashboard" && <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 28 }}>
              <Stat icon="users" label="Total employees" value={dash.totalEmployees || 0} color={C.in} bg={C.inD} />
              <Stat icon="check" label="Present" value={dash.present || 0} color={C.ok} bg={C.okD} />
              <Stat icon="alert" label="Late arrivals" value={dash.late || 0} color={C.wn} bg={C.wnD} />
              <Stat icon="out" label="Absent" value={dash.absent || 0} color={C.no} bg={C.noD} />
            </div>
            <div style={{ background: C.card, borderRadius: 16, padding: 20, border: `1px solid ${C.bdr}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><span style={{ fontSize: 14, fontWeight: 600 }}>Attendance breakdown</span><span style={{ fontSize: 24, fontWeight: 700, color: C.ok }}>{dash.attendanceRate || 0}%</span></div>
              <div style={{ display: "flex", height: 14, borderRadius: 8, overflow: "hidden", background: C.sf }}>
                {(dash.present - dash.late) > 0 && <div style={{ width: `${((dash.present - dash.late) / (dash.totalEmployees || 1)) * 100}%`, background: C.ok }} />}
                {dash.late > 0 && <div style={{ width: `${(dash.late / (dash.totalEmployees || 1)) * 100}%`, background: C.wn }} />}
                {dash.absent > 0 && <div style={{ width: `${(dash.absent / (dash.totalEmployees || 1)) * 100}%`, background: C.no }} />}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                {[["On time", C.ok], ["Late", C.wn], ["Absent", C.no]].map(([l, c]) => <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.tm }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />{l}</div>)}
              </div>
            </div>
          </>}
          {tab === "attendance" && <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.bdr}`, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.bdr}`, fontSize: 14, fontWeight: 600 }}>Attendance — {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: `1px solid ${C.bdr}` }}>{["Employee", "Dept", "Check-in", "Check-out", "Status"].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.tm, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>)}</tr></thead>
              <tbody>{att.map(e => <tr key={e.emp_id} style={{ borderBottom: `1px solid ${C.bdr}08` }}>
                <td style={{ padding: "12px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Av n={e.name} s={30} c={e.status === "absent" ? C.no : e.status === "late" ? C.wn : C.ok} /><div><div style={{ fontWeight: 500 }}>{e.name}</div><div style={{ fontSize: 11, color: C.td }}>ID {e.emp_id}</div></div></div></td>
                <td style={{ padding: "12px 16px", color: C.tm }}>{e.department}</td>
                <td style={{ padding: "12px 16px" }}>{fmt(e.check_in)}</td>
                <td style={{ padding: "12px 16px" }}>{fmt(e.check_out)}</td>
                <td style={{ padding: "12px 16px" }}><Badge status={e.status || "absent"} /></td>
              </tr>)}</tbody>
            </table></div>
          </div>}
          {tab === "alerts" && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {alerts.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.tm }}><Ico t="check" s={40} c={C.ok} /><div style={{ marginTop: 12, fontSize: 14 }}>No alerts today!</div></div>
            : alerts.map(a => <div key={a.id} style={{ background: C.card, borderRadius: 14, padding: "16px 18px", border: `1px solid ${C.bdr}`, borderLeft: `3px solid ${a.alert_type === "late-arrival" ? C.wn : C.no}`, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: a.alert_type === "late-arrival" ? C.wnD : C.noD, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico t="alert" s={18} c={a.alert_type === "late-arrival" ? C.wn : C.no} /></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{a.alert_type === "late-arrival" ? "Late arrival" : a.alert_type} — {a.emp_name}</div><div style={{ fontSize: 12, color: C.tm }}>{a.message}</div></div>
            </div>)}
          </div>}
        </>}
      </div>
    </div>
  );
};

// ========== APP ==========
export default function App() {
  const [user, setUser] = useState(null);
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      {!user ? <Login onLogin={setUser} />
        : user.role === "admin" ? <Admin user={user} onLogout={() => { setUser(null); token = null; }} />
        : <Employee user={user} onLogout={() => { setUser(null); token = null; }} />}
    </>
  );
}
