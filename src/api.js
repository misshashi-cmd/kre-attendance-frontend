export const API = "http://localhost:5000/api";

let token = null;
export const setToken = t => { token = t; };

export const call = async (path, opts = {}) => {
  const h = { "Content-Type": "application/json", ...opts.headers };
  if (token) h["Authorization"] = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`, { ...opts, headers: h });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Error");
  return d;
};
