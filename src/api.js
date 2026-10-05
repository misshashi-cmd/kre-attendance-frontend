// Set REACT_APP_API_URL (e.g. https://kre-attendance-api.vercel.app/api) when building for the web.
export const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
export const ONLINE = !!process.env.REACT_APP_API_URL;

let token = null;
export const setToken = t => { token = t; };

export const call = async (path, opts = {}) => {
  const h = { "Content-Type": "application/json", ...opts.headers };
  if (token) h["Authorization"] = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`, { ...opts, headers: h });
  let d = {};
  try { d = await r.json(); } catch { if (!r.ok) throw new Error(`Server error (${r.status}). Please try again.`); }
  if (!r.ok) throw new Error(d.error || d.errors?.[0]?.msg || "Error");
  return d;
};

// Fetches an authenticated image (e.g. a weighbridge photo) and returns an object URL for <img src>.
export const imageUrl = async path => {
  const r = await fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw new Error("Photo not available");
  return URL.createObjectURL(await r.blob());
};
