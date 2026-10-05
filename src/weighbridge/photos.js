import React, { useState, useEffect, useRef } from "react";
import { C, Ico, Btn } from "../ui";
import { call, imageUrl } from "../api";

// Shrinks a camera photo to at most 1600 px on the long side as JPEG, so uploads stay small
// on mobile data while the digits remain sharp enough to read.
const compress = file => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    resolve(c.toDataURL("image/jpeg", 0.85));
  };
  img.onerror = () => reject(new Error("That file is not a photo."));
  img.src = URL.createObjectURL(file);
});

// Uploads a photo; the server reads it and returns { id, kind, reading }.
export const uploadPhoto = async (kind, file) => {
  const image = await compress(file);
  const r = await call("/weighbridge/photos", { method: "POST", body: JSON.stringify({ kind, image }) });
  return { ...r.photo, preview: image };
};

// One photo slot: take / retake a photo, show it, and show what was read from it.
export const PhotoTile = ({ kind, title, hint, photoId, preview, summary, error: readError, disabled, onPhoto, notify }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState(preview || null);
  const [big, setBig] = useState(false);

  useEffect(() => {
    if (preview) { setSrc(preview); return; }
    if (!photoId) { setSrc(null); return; }
    let url, live = true;
    imageUrl(`/weighbridge/photos/${photoId}`).then(u => { url = u; if (live) setSrc(u); }).catch(() => {});
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [photoId, preview]);

  const pick = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try { onPhoto(await uploadPhoto(kind, file)); }
    catch (err) { notify(err.message, "error"); }
    setBusy(false);
  };
  const c = readError ? C.no : photoId ? C.ok : C.bdr;

  return (
    <div style={{ background: C.sf, border: `1px ${photoId ? "solid" : "dashed"} ${c}`, borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{title}</span>
        {photoId && !readError && <Ico t="check" s={14} c={C.ok} />}
      </div>
      <div onClick={() => src && setBig(true)} style={{ height: 120, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: src ? "zoom-in" : "default" }}>
        {busy ? <span style={{ fontSize: 12, color: C.tm }}>Reading photo…</span>
        : src ? <img src={src} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ textAlign: "center", color: C.td, fontSize: 11, padding: 8 }}><Ico t="camera" s={26} c={C.td} /><div style={{ marginTop: 4 }}>{hint}</div></div>}
      </div>
      {summary && <div style={{ fontSize: 11, color: readError ? C.no : C.tm, lineHeight: 1.4 }}>{summary}</div>}
      {!disabled && <>
        <input ref={input} type="file" accept="image/*" capture="environment" onChange={pick} style={{ display: "none" }} />
        <Btn kind={photoId ? "ghost" : "primary"} icon="camera" onClick={() => input.current.click()} disabled={busy} style={{ justifyContent: "center" }}>{photoId ? "Retake" : "Take photo"}</Btn>
      </>}
      {big && <div onClick={() => setBig(false)} style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12, cursor: "zoom-out" }}>
        <img src={src} alt={title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      </div>}
    </div>
  );
};
