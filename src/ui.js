import React, { useEffect } from "react";

export const fmt = t => {
  if (!t) return "—";
  const [h, m] = t.slice(0, 5).split(":");
  const hr = +h;
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

export const ini = n => n ? n.split(" ").map(x => x[0]).join("").slice(0, 2) : "?";

export const C = {
  bg: "#0B0F1A", card: "#131825", bdr: "#1E2740",
  ok: "#4ADE80", okD: "rgba(74,222,128,0.12)", okG: "rgba(74,222,128,0.25)",
  no: "#F87171", noD: "rgba(248,113,113,0.12)",
  wn: "#FBBF24", wnD: "rgba(251,191,36,0.12)",
  in: "#60A5FA", inD: "rgba(96,165,250,0.12)",
  pu: "#A78BFA", puD: "rgba(167,139,250,0.12)",
  tx: "#F1F5F9", tm: "#94A3B8", td: "#64748B", sf: "#0F1422",
};

export const Ico = ({ t, s = 20, c = "currentColor" }) => {
  const k = { fill: "none", stroke: c, strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" };
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
    brief: <><rect x="2" y="7" width="20" height="14" rx="2" {...k}/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M2 13h20" {...k}/></>,
    plus: <path d="M12 5v14M5 12h14" {...k} strokeWidth="2"/>,
    x: <path d="M18 6L6 18M6 6l12 12" {...k} strokeWidth="2"/>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" {...k}/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" {...k}/></>,
    trash: <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" {...k}/>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2" {...k}/><path d="M22 6l-10 7L2 6" {...k}/></>,
    phone: <path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" {...k}/>,
    doc: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" {...k}/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" {...k}/></>,
    star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" {...k}/>,
    starF: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={c} stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>,
    dl: <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" {...k}/>,
    clock: <><circle cx="12" cy="12" r="10" {...k}/><path d="M12 6v6l4 2" {...k}/></>,
    search: <><circle cx="11" cy="11" r="8" {...k}/><path d="M21 21l-4.35-4.35" {...k}/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" {...k}/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" {...k}/></>,
    print: <><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" {...k}/><rect x="6" y="14" width="12" height="8" {...k}/></>,
    link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" {...k}/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" {...k}/></>,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none">{p[t]}</svg>;
};

export const Av = ({ n, s = 40, c = C.ok }) => (
  <div style={{ width: s, height: s, borderRadius: "50%", background: `linear-gradient(135deg, ${c}22, ${c}44)`, border: `1.5px solid ${c}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: s * .35, fontWeight: 600, color: c, flexShrink: 0 }}>{ini(n)}</div>
);

export const Stat = ({ icon, label, value, color, bg, sub }) => (
  <div style={{ background: C.card, borderRadius: 16, padding: "20px 18px", border: `1px solid ${C.bdr}`, flex: "1 1 140px", minWidth: 130 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Ico t={icon} s={18} c={color} /></div>
      <span style={{ fontSize: 12, color: C.tm, fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: C.td, marginTop: 4 }}>{sub}</div>}
  </div>
);

export const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const c = type === "error" ? C.no : C.ok;
  return <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: C.card, border: `1px solid ${c}44`, borderRadius: 14, padding: "12px 20px", color: c, fontSize: 13, fontWeight: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", maxWidth: "90vw" }}>{msg}</div>;
};

// ---------- form & layout primitives ----------
export const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.bdr}`, background: C.sf, color: C.tx, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", colorScheme: "dark" };

export const Field = ({ label, span, children }) => (
  <label style={{ display: "block", gridColumn: span ? "1 / -1" : undefined }}>
    <span style={{ fontSize: 11, fontWeight: 500, color: C.tm, marginBottom: 5, display: "block" }}>{label}</span>
    {children}
  </label>
);

export const Grid = ({ min = 200, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 12 }}>{children}</div>
);

export const Btn = ({ kind = "ghost", icon, children, style, ...p }) => {
  const k = {
    primary: { background: `linear-gradient(135deg, ${C.ok}, #22D3EE)`, color: C.bg, border: "none" },
    ghost: { background: C.sf, color: C.tm, border: `1px solid ${C.bdr}` },
    danger: { background: C.noD, color: C.no, border: `1px solid ${C.no}33` },
  }[kind];
  return (
    <button {...p} style={{ ...k, borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: p.disabled ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: p.disabled ? .6 : 1, fontFamily: "inherit", whiteSpace: "nowrap", ...style }}>
      {icon && <Ico t={icon} s={14} c={k.color} />}{children}
    </button>
  );
};

export const Card = ({ children, style, ...p }) => (
  <div {...p} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.bdr}`, ...style }}>{children}</div>
);

export const Modal = ({ title, onClose, footer, w = 600, children }) => {
  useEffect(() => {
    const k = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div onMouseDown={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(3,6,14,0.72)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: w, background: C.card, borderRadius: 18, border: `1px solid ${C.bdr}`, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}><Ico t="x" s={18} c={C.tm} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.bdr}`, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  );
};
