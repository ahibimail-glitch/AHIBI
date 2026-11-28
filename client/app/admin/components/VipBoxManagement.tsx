"use client";

import { useEffect, useState, useCallback } from "react";
import { getApiUrl } from "@/config";

interface Guest { passRef: string; guestName: string; homeBox: number; currentBox: number | null; present: boolean; isWalkIn: boolean; }
interface Box { number: number; capacity: number; fixed: boolean; occupants: Guest[]; }

export default function VipBoxManagement() {
  const [token, setToken] = useState<string | null>(null);
  const [matchLabel, setMatchLabel] = useState("NUSC vs Dempo");
  const [masterToken, setMasterToken] = useState("");
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [newName, setNewName] = useState("");
  const [newBox, setNewBox] = useState<number | "">("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setToken(localStorage.getItem("admin_token")); }, []);
  const headers = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const [cfg, g] = await Promise.all([
        fetch(getApiUrl("vip-box/admin/config"), { headers: headers() }).then((r) => r.json()),
        fetch(getApiUrl("vip-box/admin/guests"), { headers: headers() }).then((r) => r.json()),
      ]);
      if (cfg?.success) { setMasterToken(cfg.data.masterToken || ""); setMatchLabel(cfg.data.matchLabel || "NUSC vs Dempo"); }
      else setErr(cfg?.message || "Could not load config.");
      if (g?.success) { setBoxes(g.data.boxes); setGuests(g.data.guests); }
    } catch { setErr("Failed to load VIP box data."); }
  }, [token, headers]);

  useEffect(() => { load(); }, [load]);

  async function api(path: string, method: string, body?: any, ok?: string) {
    setMsg(null); setErr(null);
    try {
      const res = await fetch(getApiUrl(`vip-box/${path}`), { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
      const json = await res.json();
      if (res.ok && json?.success) { if (ok) setMsg(ok); load(); return true; }
      setErr(json?.message || "Action failed."); return false;
    } catch { setErr("Action failed."); return false; }
  }

  if (!token) return <div className="p-6 text-gray-700">Please sign in to the admin dashboard first.</div>;
  const setGuestField = (ref: string, patch: Partial<Guest>) => setGuests((prev) => prev.map((x) => (x.passRef === ref ? { ...x, ...patch } : x)));

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">VIP Boxes — {matchLabel}</h1>
        <div className="flex gap-2 flex-wrap">
          <a href="/vip-box-passes" target="_blank" className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold">Master QR (print)</a>
          <a href="/vip-box-scanner" target="_blank" className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700">Rep console</a>
          <button onClick={() => confirm("Reset seating + arrivals for a new match? (roster + QR kept)") && api("admin/reset", "POST", { clearWalkIns: true }, "Reset done")} className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700">Reset for new match</button>
        </div>
      </div>
      {err && <p className="mt-3 text-red-600 text-sm">{err}</p>}
      {msg && <p className="mt-3 text-emerald-600 text-sm">{msg}</p>}
      {masterToken && <p className="mt-2 text-xs text-gray-400">One master QR for all boxes, reusable every match. Code: <span className="font-mono">{masterToken}</span></p>}

      {/* Live board */}
      <h2 className="text-lg font-semibold mt-6 mb-2 text-gray-900">Live allocation</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {boxes.map((b) => (
          <div key={b.number} className={`rounded-xl border p-3 ${b.occupants.length >= b.capacity ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
            <div className="flex items-center justify-between">
              <div className="font-bold text-gray-900">Box {b.number}</div>
              <div className="text-xs text-gray-400">{b.occupants.length}/{b.capacity}{b.fixed ? " · fixed" : ""}</div>
            </div>
            <div className="mt-2 text-sm text-gray-700 min-h-[20px]">{b.occupants.length ? b.occupants.map((o) => o.guestName).join(", ") : <span className="text-gray-300">empty</span>}</div>
          </div>
        ))}
      </div>

      {/* Add guest */}
      <div className="mt-6 flex items-center gap-2 flex-wrap">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New guest name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <select value={newBox} onChange={(e) => setNewBox(e.target.value ? Number(e.target.value) : "")} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Home box…</option>
          {boxes.map((b) => <option key={b.number} value={b.number}>Box {b.number}</option>)}
        </select>
        <button onClick={() => { if (newName.trim() && newBox) { api("admin/guest", "POST", { guestName: newName.trim(), homeBox: newBox }, "Guest added"); setNewName(""); setNewBox(""); } }} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">Add guest to roster</button>
      </div>

      {/* Roster */}
      <h2 className="text-lg font-semibold mt-8 mb-2 text-gray-900">Guest roster ({guests.length})</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500"><tr>
            <th className="text-left p-2">Guest</th><th className="text-left p-2">Home box</th><th className="text-left p-2">Status</th><th className="p-2"></th>
          </tr></thead>
          <tbody>
            {guests.map((g) => (
              <tr key={g.passRef} className="border-t border-gray-100">
                <td className="p-2"><input value={g.guestName} onChange={(e) => setGuestField(g.passRef, { guestName: e.target.value })} className="w-48 rounded border border-gray-300 px-2 py-1 text-gray-900" />{g.isWalkIn ? <span className="text-[10px] text-amber-600 ml-1">walk-in</span> : ""}</td>
                <td className="p-2"><input type="number" value={g.homeBox} onChange={(e) => setGuestField(g.passRef, { homeBox: Number(e.target.value) })} className="w-16 rounded border border-gray-300 px-2 py-1 text-gray-900" /></td>
                <td className="p-2 text-gray-700">{g.present && g.currentBox ? `In Box ${g.currentBox}` : "Not arrived"}</td>
                <td className="p-2 flex gap-1">
                  <button onClick={() => api(`admin/guest/${encodeURIComponent(g.passRef)}`, "PUT", { guestName: g.guestName, homeBox: g.homeBox }, "Saved")} className="px-3 py-1 rounded-lg bg-gray-900 text-white text-xs">Save</button>
                  <button onClick={() => confirm(`Delete ${g.guestName}?`) && api(`admin/guest/${encodeURIComponent(g.passRef)}`, "DELETE", undefined, "Deleted")} className="px-3 py-1 rounded-lg border border-gray-300 text-gray-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">Reps open the console via the master QR, then check in / move guests across boxes (capacity-enforced). Pre-load the full roster here; walk-ins can be added live.</p>
    </div>
  );
}
