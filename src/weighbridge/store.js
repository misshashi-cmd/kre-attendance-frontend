import { useCallback, useMemo } from "react";
import { useCollections, uid, today } from "../collections";
import { verifyWeighment, normVehicle } from "./engine";

// Weighbridge data: /api/weighbridge/{weighments,vehicles,settings}, or localStorage
// when the backend doesn't have those routes (see collections.js).
// The server re-verifies every weighment on save; locally we verify here so the
// stored result is the same either way.
export { uid, today, addDays } from "../collections";

const COLS = ["weighments", "vehicles", "settings"];

export const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export const useWeighbridge = () => {
  const { data, setData, mode, error, loading, load, save: rawSave, saveMany, remove } = useCollections("weighbridge", COLS, "kre_weighbridge_v1");
  const settings = useMemo(() => data.settings.find(s => s.id === "config") || {}, [data.settings]);
  const ctx = useMemo(() => ({ settings, vehicles: data.vehicles, others: data.weighments }), [settings, data.vehicles, data.weighments]);

  const save = useCallback((col, item) => {
    if (col === "vehicles") item = { ...item, vehicle_no: normVehicle(item.vehicle_no) };
    if (col === "weighments") {
      item = { ...item, vehicle_no: normVehicle(item.vehicle_no) };
      if (mode === "local") item = { ...item, verification: verifyWeighment(item, ctx), verified_at: new Date().toISOString() };
    }
    return rawSave(col, item);
  }, [rawSave, mode, ctx]);

  const saveSettings = useCallback(s => {
    // Settings live in one record with the fixed id "config"; save() would PUT an id the
    // server doesn't have yet, so the first save goes through the bulk create.
    const exists = data.settings.some(x => x.id === "config");
    return exists ? rawSave("settings", { ...s, id: "config" }) : saveMany("settings", [{ ...s, id: "config" }]);
  }, [data.settings, rawSave, saveMany]);

  // Demo data so the weighbridge team can try the tools before entering real slips (local mode only).
  const seed = useCallback(() => {
    const t = today();
    const at = (h, m) => `${t}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const vehicles = [
      { id: uid(), vehicle_no: "JH05AB1234", vehicle_type: "10-wheeler tipper", owner_name: "Sharma Roadlines", driver_name: "Ramesh", phone: "9800000011", std_tare: 14000, gvw: 35000 },
      { id: uid(), vehicle_no: "JH05CD5678", vehicle_type: "12-wheeler tipper", owner_name: "Maa Durga Transport", driver_name: "Sunil", phone: "9800000012", std_tare: 16500, gvw: 42000 },
      { id: uid(), vehicle_no: "OR09K4455", vehicle_type: "14-wheeler trailer", owner_name: "Kalinga Carriers", driver_name: "Bikash", phone: "9800000013", std_tare: 19800, gvw: 49000 },
      { id: uid(), vehicle_no: "WB37E2211", vehicle_type: "10-wheeler tipper", owner_name: "Bengal Movers", std_tare: 13900, gvw: 35000, blacklisted: true, blacklist_reason: "Tare manipulation found on 12 Sep" },
    ];
    const w = (slip_no, vehicle_no, direction, party, material, g, tg, ig, it, gt, tt, extra = {}) => ({
      id: uid(), slip_no, date: t, direction, vehicle_no, party, material, slip_gross: g, slip_tare: tg, slip_net: g - tg,
      ind_gross: ig, ind_tare: it, gross_time: gt, tare_time: tt, operator: "Demo operator", created_on: t, ...extra,
    });
    const list = [
      w("1001", "JH05AB1234", "inward", "Shree Balaji Ispat", "Coal (steam grade)", 42380, 14120, 42380, 14120, at(9, 10), at(9, 48), { challan_no: "CH-5521", challan_weight: 28300 }),
      w("1002", "JH05CD5678", "outward", "Durga Cement Works", "Pet coke", 41560, 16480, 41560, 16480, at(10, 25), at(9, 55), { challan_no: "INV-778" }),
      w("1003", "OR09K4455", "inward", "Kalinga Alloys", "Iron ore fines", 48900, 19820, 48760, 19820, at(11, 5), at(11, 41), { challan_no: "CH-0912", challan_weight: 29100, remarks: "Driver says ore was wet" }),
      w("1004", "JH05AB1234", "inward", "Shree Balaji Ispat", "Coal (steam grade)", 41900, 14980, 41900, 14980, at(12, 30), at(12, 33), { challan_no: "CH-5530", challan_weight: 27100 }),
      w("1005", "WB37E2211", "inward", "Jharkhand Power Ltd", "Washed coal", 34520, 13460, 34520, 13460, at(13, 20), at(14, 2)),
    ];
    list[1].slip_net = 25100; // typed net on the slip doesn't add up
    const weighments = [];
    for (const x of list) weighments.push({ ...x, verification: verifyWeighment(x, { settings: {}, vehicles, others: weighments }), verified_at: new Date().toISOString() });
    setData({ weighments, vehicles, settings: [] });
  }, [setData]);

  return { data, settings, ctx, mode, error, loading, load, save, saveMany, saveSettings, remove, seed };
};
