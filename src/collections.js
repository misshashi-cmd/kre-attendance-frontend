import { useState, useEffect, useCallback } from "react";
import { call } from "./api";

/*
 * Shared data layer for modules that store simple record collections (Hiring, CRM).
 *
 * Talks to the backend when it exposes these routes (all JSON, same auth as the rest of the API):
 *   GET    /api/<base>/:col        -> { [col]: [...] }
 *   POST   /api/<base>/:col        -> { item }   (body is the full record, id included)
 *   PUT    /api/<base>/:col/:id    -> { item }
 *   DELETE /api/<base>/:col/:id    -> {}
 *
 * If those routes are missing, it falls back to this browser's localStorage so the
 * module is usable straight away (data then lives only on this device).
 */

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const today = () => new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
export const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString("en-CA"); };
export const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 864e5);

export const useCollections = (base, cols, storageKey) => {
  const blank = useCallback(() => Object.fromEntries(cols.map(c => [c, []])), [cols]);
  const [data, setData] = useState(blank);
  const [mode, setMode] = useState(null); // "api" | "local"
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Promise.all(cols.map(c => call(`/${base}/${c}`)));
      setData(Object.fromEntries(cols.map((c, i) => [c, res[i][c] || []])));
      setMode("api");
    } catch {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch {}
      setData({ ...blank(), ...saved });
      setMode("local");
    }
    setLoading(false);
  }, [base, cols, storageKey, blank]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (mode === "local") try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
  }, [mode, data, storageKey]);

  const save = useCallback(async (col, item) => {
    const isNew = !item.id;
    let rec = isNew ? { ...item, id: uid(), created_on: today() } : item;
    if (mode === "api") {
      const r = await call(isNew ? `/${base}/${col}` : `/${base}/${col}/${rec.id}`, { method: isNew ? "POST" : "PUT", body: JSON.stringify(rec) });
      rec = r.item || rec;
    }
    setData(d => ({ ...d, [col]: isNew ? [...d[col], rec] : d[col].map(x => x.id === rec.id ? rec : x) }));
    return rec;
  }, [base, mode]);

  const remove = useCallback(async (col, id) => {
    if (mode === "api") await call(`/${base}/${col}/${id}`, { method: "DELETE" });
    setData(d => ({ ...d, [col]: d[col].filter(x => x.id !== id) }));
  }, [base, mode]);

  return { data, setData, mode, loading, load, save, remove };
};
