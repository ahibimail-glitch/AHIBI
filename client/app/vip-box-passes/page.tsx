"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { getApiUrl } from "@/config";

export default function VipMasterQrPage() {
  const [token, setToken] = useState<string | null>(null);
  const [masterToken, setMasterToken] = useState<string>("");
  const [matchLabel, setMatchLabel] = useState("NUSC VIP Boxes");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setToken(localStorage.getItem("admin_token")); }, []);
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(getApiUrl("vip-box/admin/config"), { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json?.success) { setMasterToken(json.data.masterToken || ""); setMatchLabel(json.data.matchLabel || "NUSC VIP Boxes"); }
        else setErr(json?.message || "Could not load the VIP code.");
      } catch { setErr("Could not load the VIP code."); }
    })();
  }, [token]);

  function download() {
    const canvas = document.querySelector(`[data-export] canvas`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "NUSC-VIP-Box-Master-QR.png";
    document.body.appendChild(a); a.click(); a.remove();
  }

  if (!token) return <div className="p-8 text-gray-800">Sign in to the admin dashboard first.</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 flex items-start justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="text-xs tracking-[0.2em] text-amber-600 font-semibold">VIP BOX — MASTER QR</div>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{matchLabel}</h1>
        <p className="text-gray-500 text-sm mt-1">One code for all boxes, reusable every match. The rep scans this to open the allocation console.</p>

        {err && <p className="text-red-600 mt-4">{err}</p>}

        {masterToken && (
          <>
            <div className="mt-6 flex justify-center">
              <QRCodeCanvas value={masterToken} size={240} level="M" marginSize={2} />
            </div>
            <div data-export style={{ position: "absolute", left: -99999, top: 0 }} aria-hidden>
              <QRCodeCanvas value={masterToken} size={1024} level="M" marginSize={4} />
            </div>
            <div className="text-xs text-gray-400 font-mono mt-3">{masterToken}</div>
            <button onClick={download} className="mt-5 px-6 py-2.5 rounded-xl bg-gray-900 text-white font-semibold">Download QR (PNG)</button>
            <p className="text-[11px] text-gray-400 mt-3">High-res 1024px — send straight to the printer.</p>
          </>
        )}
      </div>
    </div>
  );
}
