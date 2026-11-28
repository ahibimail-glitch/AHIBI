"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { getApiUrl } from "@/config";

interface Pass { passRef: string; guestName: string; homeBox: number; active: boolean; }

const QR_SIZE = 1024; // high-res export size (px)

export default function VipBoxPassesPrintPage() {
  const [token, setToken] = useState<string | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [matchLabel, setMatchLabel] = useState("NUSC vs Dempo");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setToken(localStorage.getItem("admin_token")); }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(getApiUrl("vip-box/admin/passes"), { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json?.success) { setPasses(json.data.passes.filter((p: Pass) => p.active)); setMatchLabel(json.data.matchLabel || "NUSC vs Dempo"); }
        else setErr(json?.message || "Could not load passes.");
      } catch { setErr("Could not load passes."); }
    })();
  }, [token]);

  const fileName = (p: Pass) => `VIP-Box-${p.homeBox}-${p.guestName.replace(/[^a-zA-Z0-9]+/g, "-")}.png`;

  function downloadOne(p: Pass) {
    const canvas = document.querySelector(`[data-export="${p.passRef}"] canvas`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = fileName(p);
    document.body.appendChild(a); a.click(); a.remove();
  }

  async function downloadAll() {
    for (const p of passes) { downloadOne(p); await new Promise((r) => setTimeout(r, 400)); }
  }

  if (!token) return <div className="p-8 text-gray-800">Sign in to the admin dashboard first.</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">VIP Box QR Codes — {matchLabel}</h1>
            <p className="text-gray-500 text-sm">{passes.length} codes. Download and send straight to the printer — each file is a clean, high-res QR (1024px). No cropping needed.</p>
          </div>
          <button onClick={downloadAll} className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold">Download all QRs (PNG)</button>
        </div>
        {err && <p className="text-red-600">{err}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {passes.map((p) => (
            <div key={p.passRef} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center text-center">
              <div className="text-xs text-gray-400">Box {p.homeBox}</div>
              <div className="font-semibold text-gray-900 leading-tight mt-0.5 mb-2">{p.guestName}</div>
              {/* visible preview */}
              <QRCodeCanvas value={p.passRef} size={160} level="M" marginSize={2} />
              {/* hidden high-res for export */}
              <div data-export={p.passRef} style={{ position: "absolute", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
                <QRCodeCanvas value={p.passRef} size={QR_SIZE} level="M" marginSize={4} />
              </div>
              <button onClick={() => downloadOne(p)} className="mt-3 w-full px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">Download QR</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
