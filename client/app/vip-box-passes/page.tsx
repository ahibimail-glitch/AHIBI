"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/config";

interface Pass { passRef: string; guestName: string; homeBox: number; qrCode: string; active: boolean; }

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

  if (!token) return <div className="p-8 text-gray-800">Sign in to the admin dashboard first.</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:p-0">
      <style>{`@media print { .no-print { display:none !important; } .pass-grid { gap:0 !important; } .pass-card { break-inside: avoid; box-shadow:none !important; } }`}</style>
      <div className="max-w-5xl mx-auto">
        <div className="no-print flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">VIP Box Passes — {matchLabel}</h1>
            <p className="text-gray-500 text-sm">{passes.length} passes. Print and attach to each box pass.</p>
          </div>
          <button onClick={() => window.print()} className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-semibold">Print</button>
        </div>
        {err && <p className="no-print text-red-600">{err}</p>}

        <div className="pass-grid grid grid-cols-1 sm:grid-cols-2 gap-5">
          {passes.map((p) => (
            <div key={p.passRef} className="pass-card bg-white rounded-2xl border-2 border-gray-900 overflow-hidden shadow-sm">
              <div className="bg-gray-900 text-white px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] tracking-[0.2em] text-amber-400 font-semibold">VIP BOX PASS</div>
                  <div className="text-sm font-bold">{matchLabel}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/60">BOX</div>
                  <div className="text-3xl font-black text-amber-400 leading-none">{p.homeBox}</div>
                </div>
              </div>
              <div className="p-5 flex items-center gap-4">
                <img src={p.qrCode} alt="QR" className="w-32 h-32" />
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide">Guest</div>
                  <div className="text-xl font-bold text-gray-900 leading-tight">{p.guestName}</div>
                  <div className="text-[11px] text-gray-400 mt-3 font-mono">{p.passRef}</div>
                  <div className="text-[11px] text-gray-500 mt-2">Scan at entry for box allocation.</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
