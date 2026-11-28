"use client";

import { useEffect, useState, useCallback } from "react";
import { getApiUrl } from "@/config";

interface Pass { passRef: string; guestName: string; homeBox: number; currentBox: number | null; active: boolean; fixed: boolean; }
interface Occupant { passRef: string; guestName: string; homeBox: number; }
interface Box { number: number; capacity: number; fixed: boolean; occupants: Occupant[]; }

export default function VipBoxManagement() {
  const [token, setToken] = useState<string | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [matchLabel, setMatchLabel] = useState("NUSC vs Dempo");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setToken(localStorage.getItem("admin_token")); }, []);
  const headers = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const [p, b] = await Promise.all([
        fetch(getApiUrl("vip-box/admin/passes"), { headers: headers() }).then((r) => r.json()),
        fetch(getApiUrl("vip-box/admin/board"), { headers: headers() }).then((r) => r.json()),
      ]);
      if (p?.success) { setPasses(p.data.passes.map((x: any) => ({ ...x })) ); setMatchLabel(p.data.matchLabel || "NUSC vs Dempo"); }
      else setErr(p?.message || "Could not load passes.");
      if (b?.success) setBoxes(b.data);
    } catch { setErr("Failed to load VIP box data."); }
  }, [token, headers]);

  useEffect(() => { load(); }, [load]);

  async function savePass(p: Pass) {
    setMsg(null); setErr(null);
    try {
      const res = await fetch(getApiUrl(`vip-box/admin/pass/${encodeURIComponent(p.passRef)}`), {
        method: "PUT", headers: headers(),
        body: JSON.stringify({ guestName: p.guestName, homeBox: p.homeBox, active: p.active }),
      });
      const json = await res.json();
      if (res.ok && json?.success) { setMsg("Saved."); load(); } else setErr(json?.message || "Save failed.");
    } catch { setErr("Save failed."); }
  }

  async function reset() {
    if (!confirm("Reset all allocations back to home boxes?")) return;
    try {
      const res = await fetch(getApiUrl("vip-box/admin/reset"), { method: "POST", headers: headers() });
      const json = await res.json();
      if (json?.success) { setMsg("Allocations reset."); setBoxes(json.data); load(); } else setErr(json?.message || "Reset failed.");
    } catch { setErr("Reset failed."); }
  }

  if (!token) return <div className="p-6 text-gray-700">Please sign in to the admin dashboard first.</div>;

  const setPassField = (ref: string, patch: Partial<Pass>) =>
    setPasses((prev) => prev.map((x) => (x.passRef === ref ? { ...x, ...patch } : x)));

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">VIP Boxes — {matchLabel}</h1>
        <div className="flex gap-2">
          <a href="/vip-box-passes" target="_blank" className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold">Printable passes (QR)</a>
          <a href="/vip-box-scanner" target="_blank" className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700">Rep scanner</a>
          <button onClick={reset} className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700">Reset allocations</button>
        </div>
      </div>
      {err && <p className="mt-3 text-red-600 text-sm">{err}</p>}
      {msg && <p className="mt-3 text-emerald-600 text-sm">{msg}</p>}

      {/* Live board */}
      <h2 className="text-lg font-semibold mt-6 mb-2 text-gray-900">Live allocation</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {boxes.map((b) => (
          <div key={b.number} className={`rounded-xl border p-3 ${b.fixed ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
            <div className="flex items-center justify-between">
              <div className="font-bold text-gray-900">Box {b.number}</div>
              <div className="text-xs text-gray-400">cap {b.capacity}{b.fixed ? " · fixed" : ""}</div>
            </div>
            <div className="mt-2 text-sm text-gray-700 min-h-[20px]">
              {b.occupants.length ? b.occupants.map((o) => o.guestName).join(", ") : <span className="text-gray-300">—</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Passes editor */}
      <h2 className="text-lg font-semibold mt-8 mb-2 text-gray-900">Passes</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500"><tr>
            <th className="text-left p-2">Guest</th><th className="text-left p-2">Home box</th><th className="text-left p-2">Now in</th>
            <th className="text-left p-2">Active</th><th className="text-left p-2">Pass ref</th><th className="p-2"></th>
          </tr></thead>
          <tbody>
            {passes.map((p) => (
              <tr key={p.passRef} className="border-t border-gray-100">
                <td className="p-2"><input value={p.guestName} onChange={(e) => setPassField(p.passRef, { guestName: e.target.value })} className="w-44 rounded border border-gray-300 px-2 py-1 text-gray-900" /></td>
                <td className="p-2"><input type="number" value={p.homeBox} onChange={(e) => setPassField(p.passRef, { homeBox: Number(e.target.value) })} className="w-16 rounded border border-gray-300 px-2 py-1 text-gray-900" /></td>
                <td className="p-2 text-gray-700">{p.currentBox ? `Box ${p.currentBox}` : "—"}</td>
                <td className="p-2"><input type="checkbox" checked={p.active} onChange={(e) => setPassField(p.passRef, { active: e.target.checked })} /></td>
                <td className="p-2 font-mono text-xs text-gray-400">{p.passRef}</td>
                <td className="p-2"><button onClick={() => savePass(p)} className="px-3 py-1 rounded-lg bg-gray-900 text-white text-xs">Save</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">Box 2 is fixed (no rotating pass). Reps scan a pass → pick the box to seat that guest's group.</p>
    </div>
  );
}
