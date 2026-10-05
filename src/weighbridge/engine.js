/**
 * Weighbridge (kanta) slip verification engine.
 *
 * Shared by the API (utils/weighbridge.js) and the frontend (src/weighbridge/engine.js):
 * operators see the result live while typing, and the API re-runs it on every save so
 * the stored verdict can't be edited by hand. Keep the two copies identical apart from
 * the export line at the bottom.
 *
 * All weights are in kg. Times are "YYYY-MM-DDTHH:MM" strings (datetime-local).
 *
 * A weighment record looks like:
 *   { slip_no, direction: "inward" | "outward", vehicle_no, party, material,
 *     challan_no, challan_weight,
 *     slip_gross, slip_tare, slip_net,          // printed on the software slip
 *     ind_gross, ind_tare,                      // read off the weighbridge indicator display
 *     gross_time, tare_time, ... }
 */

const DEFAULT_SETTINGS = {
  division_kg: 20,        // weighbridge display step (e-value); slip weights should be multiples of it
  tolerance_kg: 20,       // allowed slip vs indicator difference; anything above is a mismatch
  tare_variation_pct: 2,  // allowed difference from the vehicle's standard tare
  shortage_pct: 0.5,      // allowed difference between challan (party) weight and our net weight
  min_gap_minutes: 5,     // gross and tare taken closer than this are suspicious
  repeat_minutes: 120,    // same vehicle weighed again within this window is flagged
};

const n = v => (v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
const kg = v => `${Number(v).toLocaleString("en-IN")} kg`;
const signed = v => `${v > 0 ? "+" : ""}${Number(v).toLocaleString("en-IN")} kg`;

// "jh 05 ab-1234" -> "JH05AB1234"
const normVehicle = v => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// State-series (JH05AB1234, DL1CAB1234, JH051234) and Bharat-series (22BH1234AA) numbers.
const VEHICLE_RE = /^([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}|\d{2}BH\d{4}[A-Z]{1,2})$/;
const isValidVehicle = v => VEHICLE_RE.test(normVehicle(v));

const minutesBetween = (a, b) => {
  const x = Date.parse(a), y = Date.parse(b);
  return isNaN(x) || isNaN(y) ? null : Math.round((y - x) / 60000);
};

/**
 * Runs every check on one weighment.
 *   ctx.settings  - overrides for DEFAULT_SETTINGS
 *   ctx.vehicles  - vehicle master records ({ vehicle_no, std_tare, gvw, blacklisted, ... })
 *   ctx.others    - other weighments (for duplicate slip / repeat vehicle checks)
 * Returns { status: "verified" | "review" | "mismatch", checks: [...], counts, indicator_net, diffs }.
 */
function verifyWeighment(w, ctx = {}) {
  const s = { ...DEFAULT_SETTINGS };
  for (const [k, v] of Object.entries(ctx.settings || {})) if (n(v) !== null && k in DEFAULT_SETTINGS) s[k] = n(v);
  const checks = [];
  const add = (group, k, label, status, detail) => checks.push({ group, k, label, status, detail });

  const g = n(w.slip_gross), t = n(w.slip_tare), net = n(w.slip_net);
  const ig = n(w.ind_gross), it = n(w.ind_tare);
  const vno = normVehicle(w.vehicle_no);
  const others = (ctx.others || []).filter(o => o && o.id !== w.id);

  // ---------- 1. Slip data ----------
  const missing = [["slip_no", "slip number"], ["vehicle_no", "vehicle number"]].filter(([k]) => !String(w[k] || "").trim()).map(x => x[1]);
  if (g === null) missing.push("gross weight");
  if (t === null) missing.push("tare weight");
  if (net === null) missing.push("net weight");
  add("slip", "complete", "Slip details complete", missing.length ? "fail" : "pass", missing.length ? `Missing: ${missing.join(", ")}` : "Slip no., vehicle, gross, tare and net are all filled");

  if (g !== null && t !== null) {
    add("slip", "gross_gt_tare", "Gross is more than tare", g > t ? "pass" : "fail", g > t ? `${kg(g)} > ${kg(t)}` : `Gross ${kg(g)} is not more than tare ${kg(t)}`);
  }
  if (g !== null && t !== null && net !== null) {
    const calc = g - t;
    add("slip", "net_calc", "Net = Gross − Tare on slip", calc === net ? "pass" : "fail",
      calc === net ? `${kg(g)} − ${kg(t)} = ${kg(net)}` : `Slip shows net ${kg(net)} but ${kg(g)} − ${kg(t)} = ${kg(calc)} (difference ${signed(net - calc)})`);
  }
  if (s.division_kg > 0) {
    const off = [["Gross", g], ["Tare", t], ["Net", net]].filter(([, v]) => v !== null && v % s.division_kg !== 0);
    if (g !== null || t !== null) {
      add("slip", "division", `Weights in ${s.division_kg} kg steps`, off.length ? "warn" : "pass",
        off.length ? `${off.map(([l, v]) => `${l} ${kg(v)}`).join(", ")} not a multiple of ${s.division_kg} kg — the indicator cannot show this; value may be typed by hand` : `All weights are multiples of ${s.division_kg} kg`);
    }
  }
  const slipNo = String(w.slip_no || "").trim().toUpperCase();
  if (slipNo) {
    const dup = others.find(o => String(o.slip_no || "").trim().toUpperCase() === slipNo);
    add("slip", "duplicate", "Slip number not used before", dup ? "fail" : "pass",
      dup ? `Slip ${w.slip_no} already entered for ${dup.vehicle_no || "another vehicle"}${dup.date ? ` on ${dup.date}` : ""}` : "No other weighment uses this slip number");
  }

  // ---------- 2. Slip vs weighbridge indicator ----------
  const cmp = (k, label, slip, ind) => {
    if (slip === null || ind === null) {
      add("indicator", k, label, "skip", ind === null ? "Indicator reading not entered" : "Slip value not entered");
      return null;
    }
    const d = slip - ind;
    const st = d === 0 ? "pass" : Math.abs(d) <= s.tolerance_kg ? "warn" : "fail";
    add("indicator", k, label, st,
      d === 0 ? `Slip ${kg(slip)} = indicator ${kg(ind)}`
      : `Slip ${kg(slip)} vs indicator ${kg(ind)} — difference ${signed(d)}${st === "warn" ? ` (within ${s.tolerance_kg} kg tolerance)` : ` (more than ${s.tolerance_kg} kg tolerance)`}`);
    return d;
  };
  const dG = cmp("gross_match", "Gross weight matches indicator", g, ig);
  const dT = cmp("tare_match", "Tare weight matches indicator", t, it);
  const indNet = ig !== null && it !== null ? ig - it : null;
  const dN = cmp("net_match", "Net weight matches indicator (gross − tare)", net, indNet);

  // ---------- 3. Vehicle ----------
  if (vno) {
    add("vehicle", "format", "Vehicle number format", isValidVehicle(vno) ? "pass" : "warn",
      isValidVehicle(vno) ? `${vno} is a valid registration format` : `${vno} does not look like an Indian registration number (e.g. JH05AB1234)`);
    const same = (ctx.vehicles || []).filter(x => normVehicle(x.vehicle_no) === vno);
    const v = same.find(x => x.blacklisted) || same[0];
    if (!v) add("vehicle", "registered", "Vehicle in vehicle register", "warn", "Not in the vehicle register — add it with its standard tare to enable tare checks");
    else {
      add("vehicle", "registered", "Vehicle in vehicle register", v.blacklisted ? "fail" : "pass",
        v.blacklisted ? `Vehicle is BLOCKED${v.blacklist_reason ? `: ${v.blacklist_reason}` : ""}` : `${v.owner_name || v.transporter || "Registered"}${v.vehicle_type ? ` · ${v.vehicle_type}` : ""}`);
      const std = n(v.std_tare);
      if (std && t !== null) {
        const diff = t - std, pct = (diff / std) * 100, lim = s.tare_variation_pct;
        const st = Math.abs(pct) <= lim ? "pass" : Math.abs(pct) <= lim * 2 ? "warn" : "fail";
        add("vehicle", "tare_std", "Tare close to vehicle's standard tare", st,
          `Tare ${kg(t)} vs standard ${kg(std)} — ${signed(diff)} (${pct > 0 ? "+" : ""}${pct.toFixed(2)}%, limit ±${lim}%)${st !== "pass" && diff > 0 ? ". Check for water, mud, spare tyres or material left in the body" : st !== "pass" ? ". Check for removed parts or fuel drained to lower tare" : ""}`);
      }
      const gvw = n(v.gvw);
      if (gvw && g !== null) {
        add("vehicle", "overload", "Within permitted gross vehicle weight", g <= gvw ? "pass" : "warn",
          g <= gvw ? `Gross ${kg(g)} ≤ GVW ${kg(gvw)}` : `Overloaded by ${kg(g - gvw)} (GVW ${kg(gvw)})`);
      }
    }
  }

  // ---------- 4. Timing ----------
  if (w.gross_time && w.tare_time) {
    const inward = w.direction !== "outward";
    const first = inward ? w.gross_time : w.tare_time, second = inward ? w.tare_time : w.gross_time;
    const gap = minutesBetween(first, second);
    if (gap !== null) {
      const st = gap < 0 ? "warn" : gap < s.min_gap_minutes ? "warn" : "pass";
      add("time", "sequence", inward ? "Gross before tare (inward / loaded in)" : "Tare before gross (outward / empty in)", st,
        gap < 0 ? `${inward ? "Tare" : "Gross"} was taken ${-gap} min before ${inward ? "gross" : "tare"} — wrong order for ${inward ? "inward" : "outward"} material`
        : gap < s.min_gap_minutes ? `Only ${gap} min between weighments — too quick to load / unload` : `${gap} min between first and second weighment`);
    }
  }
  if (vno) {
    const at = w.gross_time || w.tare_time;
    const near = at && others.filter(o => normVehicle(o.vehicle_no) === vno).map(o => ({ o, m: minutesBetween(o.gross_time || o.tare_time, at) }))
      .filter(x => x.m !== null && Math.abs(x.m) <= s.repeat_minutes && Math.abs(x.m) > 0).sort((a, b) => Math.abs(a.m) - Math.abs(b.m))[0];
    if (at) add("time", "repeat", "No repeat weighing of the same vehicle", near ? "warn" : "pass",
      near ? `Same vehicle on slip ${near.o.slip_no || "—"} ${Math.abs(near.m)} min ${near.m > 0 ? "earlier" : "later"}` : `No other weighment within ${s.repeat_minutes} min`);
  }

  // ---------- 5. Party challan ----------
  const cw = n(w.challan_weight);
  if (cw && net !== null) {
    const diff = net - cw, pct = (diff / cw) * 100;
    const st = Math.abs(pct) <= s.shortage_pct ? "pass" : "warn";
    add("party", "challan", "Net weight vs party challan", st,
      `Net ${kg(net)} vs challan ${kg(cw)} — ${diff < 0 ? "shortage" : diff > 0 ? "excess" : "no difference"} ${diff ? `${kg(Math.abs(diff))} (${Math.abs(pct).toFixed(2)}%, limit ${s.shortage_pct}%)` : ""}`.trim());
  }

  const counts = { pass: 0, warn: 0, fail: 0, skip: 0 };
  checks.forEach(c => counts[c.status]++);
  const status = counts.fail ? "mismatch" : counts.warn || counts.skip ? "review" : "verified";
  return { status, checks, counts, indicator_net: indNet, diffs: { gross: dG, tare: dT, net: dN } };
}

export { DEFAULT_SETTINGS, verifyWeighment, normVehicle, isValidVehicle };
